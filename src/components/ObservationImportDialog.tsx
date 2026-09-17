import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useKRIs } from "@/hooks/useKRI";

interface ParsedRow {
  raw: Record<string, unknown>;
  kriId: string | null;
  kriName: string;
  value: number | null;
  observedAt: string;
  notes: string | null;
  error: string | null;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

const findKey = (row: Record<string, unknown>, candidates: string[]) => {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const hit = keys.find((k) => norm(k) === c || norm(k).replace(/[^a-z]/g, "") === c.replace(/[^a-z]/g, ""));
    if (hit) return hit;
  }
  return null;
};

const toIso = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    // Excel serial date
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Label written onto each imported observation */
  sourceName?: string;
  /** Data source row to stamp with sync results */
  dataSourceId?: string;
}

const ObservationImportDialog = ({ open, onOpenChange, sourceName = "File import", dataSourceId }: Props) => {
  const { data: kris } = useKRIs();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = useMemo(() => {
    const byName = new Map<string, string>();
    const byId = new Set<string>();
    (kris ?? []).forEach((k) => {
      byName.set(norm(k.name), k.id);
      byId.add(k.id);
    });
    return { byName, byId };
  }, [kris]);

  const parse = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const parsed: ParsedRow[] = json.map((raw) => {
      const kriKey = findKey(raw, ["kri", "kri_name", "kriname", "indicator", "kri_id", "kriid", "metric"]);
      const valueKey = findKey(raw, ["value", "observation", "actual", "reading", "amount"]);
      const dateKey = findKey(raw, ["observed_at", "observedat", "date", "as_of_date", "asofdate", "period"]);
      const notesKey = findKey(raw, ["notes", "note", "comment", "comments"]);

      const rawKri = kriKey ? String(raw[kriKey] ?? "").trim() : "";
      const kriId = lookup.byId.has(rawKri) ? rawKri : lookup.byName.get(norm(rawKri)) ?? null;
      const value = valueKey !== null ? Number(String(raw[valueKey]).replace(/[, %]/g, "")) : NaN;

      let error: string | null = null;
      if (!rawKri) error = "No indicator column found";
      else if (!kriId) error = `Unknown indicator "${rawKri}"`;
      else if (!Number.isFinite(value)) error = "Value is not a number";

      return {
        raw,
        kriId,
        kriName: rawKri,
        value: Number.isFinite(value) ? value : null,
        observedAt: toIso(dateKey ? raw[dateKey] : null),
        notes: notesKey ? String(raw[notesKey] ?? "") || null : null,
        error,
      };
    });

    setRows(parsed);
    if (!parsed.length) toast.error("No rows found in that file");
  };

  const valid = rows.filter((r) => !r.error);

  const doImport = async () => {
    if (!valid.length) return;
    setBusy(true);
    const started = new Date().toISOString();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error } = await db.from("kri_observations").insert(
        valid.map((r) => ({
          kri_id: r.kriId,
          value: r.value,
          observed_at: r.observedAt,
          source: sourceName,
          notes: r.notes ?? `Imported from ${fileName}`,
        }))
      );
      if (error) throw error;

      if (dataSourceId) {
        const { data: src } = await db.from("data_sources").select("records_synced").eq("id", dataSourceId).maybeSingle();
        await db.from("data_sources").update({
          last_sync_at: new Date().toISOString(),
          sync_status: rows.length === valid.length ? "success" : "partial",
          integration_status: "connected",
          records_synced: (src?.records_synced ?? 0) + valid.length,
          error_message: rows.length === valid.length ? null : `${rows.length - valid.length} row(s) skipped`,
        }).eq("id", dataSourceId);

        await db.from("sync_log").insert({
          data_source_id: dataSourceId,
          sync_type: "inbound",
          target_system: "kri_observations",
          records_processed: valid.length,
          records_failed: rows.length - valid.length,
          status: rows.length === valid.length ? "success" : "partial",
          error_details: rows.length === valid.length ? null : { errors: rows.filter((r) => r.error).map((r) => r.error) },
          started_at: started,
          completed_at: new Date().toISOString(),
        });
      }

      ["kri-observations", "kris", "data-sources", "data-sources-full", "sync-log"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
      toast.success(`Imported ${valid.length} observation(s) — RAG recalculated`);
      setRows([]);
      setFileName("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Import observations</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with one row per reading. Columns recognised: <strong>KRI</strong> (name or id),
            <strong> Value</strong>, optional <strong>Date</strong> and <strong>Notes</strong>. Each reading is scored against its
            thresholds automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-dashed p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parse(f);
              e.target.value = "";
            }}
          />
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{fileName || "No file chosen yet"}</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Choose file</Button>
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="bg-risk-green/15 text-risk-green border-risk-green/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {valid.length} ready
              </Badge>
              {rows.length - valid.length > 0 && (
                <Badge variant="outline" className="bg-risk-red/15 text-risk-red border-risk-red/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {rows.length - valid.length} skipped
                </Badge>
              )}
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.kriName || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.value ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.observedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">
                        {r.error ? <span className="text-risk-red">{r.error}</span> : <span className="text-risk-green">Ready</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={doImport} disabled={!valid.length || busy}>
            {busy ? "Importing…" : `Import ${valid.length || ""} observation(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ObservationImportDialog;
