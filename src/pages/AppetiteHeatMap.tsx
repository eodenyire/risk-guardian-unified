import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePrincipalRiskTypes, useRiskAppetite } from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";
import { appetiteStatus, UTILISATION_BANDS, bandRag } from "@/lib/appetite";

export const ragClass = (rag: string) =>
  rag === "red" ? "bg-risk-red/15 text-risk-red border-risk-red/30"
  : rag === "amber" ? "bg-risk-amber/15 text-risk-amber border-risk-amber/30"
  : rag === "green" ? "bg-risk-green/15 text-risk-green border-risk-green/30"
  : "bg-muted text-muted-foreground border-border";

const cellBg = (rag: string, n: number) =>
  !n ? "bg-muted/30" : rag === "red" ? "bg-risk-red/70" : rag === "amber" ? "bg-risk-amber/60" : "bg-risk-green/60";

const LEVELS = ["averse", "minimal", "cautious", "open", "hungry"];

const AppetiteHeatMap = () => {
  const { data: prts } = usePrincipalRiskTypes();
  const { data: appetite } = useRiskAppetite();
  const { data: kris } = useKRIs();

  const rows = useMemo(() => (appetite ?? []).map((a) => ({
    a, s: appetiteStatus(a, kris ?? []),
    prt: (prts ?? []).find((p) => p.id === a.risk_type_id),
  })), [appetite, kris, prts]);

  const levels = useMemo(() => {
    const found = Array.from(new Set(rows.map((r) => (r.a.appetite_level ?? "").toLowerCase())));
    return [...LEVELS.filter((l) => found.includes(l)), ...found.filter((l) => !LEVELS.includes(l))];
  }, [rows]);

  const counts = { red: rows.filter((r) => r.s.rag === "red").length, amber: rows.filter((r) => r.s.rag === "amber").length, green: rows.filter((r) => r.s.rag === "green").length };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Appetite vs Risk</h1>
        <p className="text-sm text-muted-foreground mt-1">Each appetite statement's tolerance limit scored against the live KRI readings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["red", "amber", "green"] as const).map((r) => (
          <Card key={r} className="shadow-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{r === "red" ? "Outside appetite" : r === "amber" ? "Approaching limit" : "Within appetite"}</p>
            <p className={`text-2xl font-semibold ${r === "red" ? "text-risk-red" : r === "amber" ? "text-risk-amber" : "text-risk-green"}`}>{counts[r]}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Heat map: appetite level × tolerance consumed</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid gap-1 min-w-[640px]" style={{ gridTemplateColumns: `140px repeat(${UTILISATION_BANDS.length}, 1fr)` }}>
            <div />
            {UTILISATION_BANDS.map((b) => <div key={b.label} className="text-xs text-center text-muted-foreground py-1">{b.label}</div>)}
            {levels.map((lvl) => (
              <Fragment key={lvl}>
                <div className="text-xs capitalize flex items-center font-medium">{lvl || "unset"}</div>
                {UTILISATION_BANDS.map((_, bi) => {
                  const hits = rows.filter((r) => (r.a.appetite_level ?? "").toLowerCase() === lvl && r.s.band === bi);
                  return (
                    <Tooltip key={lvl + bi}>
                      <TooltipTrigger asChild>
                        <div className={`h-14 rounded-md flex items-center justify-center text-sm font-semibold ${cellBg(bandRag(bi), hits.length)}`}>
                          {hits.length || ""}
                        </div>
                      </TooltipTrigger>
                      {hits.length > 0 && (
                        <TooltipContent className="max-w-xs">
                          {hits.map((h) => <p key={h.a.id} className="text-xs">{h.prt?.name}: {h.s.utilisation?.toFixed(0)}%</p>)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </Fragment>
            ))}
          </div>
          {rows.some((r) => r.s.band === -1) && (
            <p className="text-xs text-muted-foreground mt-3">{rows.filter((r) => r.s.band === -1).length} statement(s) have no numeric tolerance and are scored on KRI RAG only (see table).</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Tolerance vs live KRIs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Risk type</TableHead><TableHead>Statement</TableHead><TableHead>Level</TableHead>
              <TableHead className="text-right">Tolerance</TableHead><TableHead>Driving KRI</TableHead>
              <TableHead className="text-right">Live value</TableHead><TableHead className="w-40">Consumed</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.sort((x, y) => (y.s.utilisation ?? -1) - (x.s.utilisation ?? -1)).map(({ a, s, prt }) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {prt?.code ? <Link className="hover:underline" to={prt.code === "IRRBB" ? "/irrbb" : `/prt/${prt.code}`}>{prt.name}</Link> : prt?.name}
                  </TableCell>
                  <TableCell className="text-xs max-w-sm">{a.statement}</TableCell>
                  <TableCell className="text-xs capitalize">{a.appetite_level}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.tolerance_limit ?? "—"} {a.metric_unit ?? ""}</TableCell>
                  <TableCell className="text-xs">{s.driver?.name ?? `${s.kris.length} KRIs`}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.liveValue?.toFixed(2) ?? "—"}</TableCell>
                  <TableCell>
                    {s.utilisation !== null ? (
                      <div className="flex items-center gap-2"><Progress value={Math.min(100, s.utilisation)} className="h-1.5" /><span className="text-xs tabular-nums">{s.utilisation.toFixed(0)}%</span></div>
                    ) : <span className="text-xs text-muted-foreground">n/a</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={ragClass(s.rag)}>{s.rag.toUpperCase()}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AppetiteHeatMap;
