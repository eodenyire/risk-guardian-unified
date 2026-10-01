import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useKRIs } from "@/hooks/useKRI";
import { useVerifySource, type Credentials, type VerifyCheck } from "@/hooks/useSourceOps";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const SOURCE_TYPES = [
  { value: "smartsheets", label: "Smartsheet" },
  { value: "servicenow", label: "ServiceNow GRC" },
  { value: "powerbi", label: "Power BI" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "onedrive", label: "OneDrive" },
  { value: "linux_share", label: "Linux file share" },
  { value: "windows_share", label: "Windows file share" },
  { value: "api", label: "Generic API" },
];

interface Mapping { kri_id: string; external_ref?: string; path?: string; field?: string }
interface SyncCfg { table?: string; key_field?: string; value_field?: string; sheet_id?: string; key_column?: string; value_column?: string; status_column?: string; date_column?: string }

const STEPS = ["Details", "Credentials", "Indicators", "Verify"];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; sourceId?: string | null }

const SourceWizardDialog = ({ open, onOpenChange, sourceId }: Props) => {
  const { data: kris } = useKRIs();
  const qc = useQueryClient();
  const verify = useVerifySource();
  const [step, setStep] = useState(0);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("api");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [creds, setCreds] = useState<Credentials>({ auth_type: "none", secret: {} });
  const [credsTouched, setCredsTouched] = useState(false);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [sync, setSync] = useState<SyncCfg>({});
  const [cfgRest, setCfgRest] = useState<Record<string, unknown>>({});
  const [checks, setChecks] = useState<VerifyCheck[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0); setChecks(null); setCredsTouched(false);
    setCreds({ auth_type: "none", secret: {} });
    if (!sourceId) {
      setId(null); setName(""); setType("api"); setLocation(""); setDescription("");
      setMappings([]); setSync({}); setCfgRest({});
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("data_sources").select("*").eq("id", sourceId).single().then(({ data }: any) => {
      if (!data) return;
      const cfg = data.connection_config ?? {};
      const { kri_mappings, sync: s, ...rest } = cfg;
      setId(data.id); setName(data.name); setType(data.source_type);
      setLocation(data.location ?? ""); setDescription(data.description ?? "");
      setMappings(kri_mappings ?? []); setSync(s ?? {}); setCfgRest(rest);
    });
  }, [open, sourceId]);

  const isFileShare = type === "linux_share" || type === "windows_share";
  const isSN = type === "servicenow";
  const isSS = type === "smartsheets";

  const persist = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const row = {
        name: name.trim(), source_type: type, location: location.trim() || null, description: description || null,
        connection_config: { ...cfgRest, kri_mappings: mappings.filter((m) => m.kri_id), ...(isSN || isSS ? { sync } : {}) },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      let sid = id;
      if (sid) {
        const { error } = await db.from("data_sources").update(row).eq("id", sid);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("data_sources").insert({ ...row, integration_status: "pending" }).select("id").single();
        if (error) throw error;
        sid = data.id; setId(sid);
      }
      if (credsTouched && sid) {
        await verify.mutateAsync({ data_source_id: sid, credentials: creds, verify: false });
        setCredsTouched(false);
      }
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      return sid;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save source");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runVerify = async () => {
    const sid = await persist();
    if (!sid) return;
    setChecks(null);
    const r = await verify.mutateAsync({ data_source_id: sid });
    setChecks(r.checks ?? [{ step: "Connection", ok: false, detail: r.error ?? "Unknown error" }]);
  };

  const next = async () => {
    if (step === 0 && !name.trim()) { toast.error("Name is required"); return; }
    if (step === 2) { const sid = await persist(); if (!sid) return; }
    setStep((s) => Math.min(3, s + 1));
  };

  const setSecret = (k: keyof Credentials["secret"], v: string) => {
    setCredsTouched(true);
    setCreds((c) => ({ ...c, secret: { ...c.secret, [k]: v } }));
  };
  const setSyncField = (k: keyof SyncCfg, v: string) => setSync((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "Edit data source" : "Register data source"}</DialogTitle>
          <DialogDescription>Step {step + 1} of 4 — {STEPS[step]}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => (i <= step || id) && setStep(i)}
              className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} aria-label={s} />
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury liquidity feed" /></div>
            <div className="col-span-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder={isSN ? "https://yourbank.service-now.com" : isSS ? "https://app.smartsheet.com/sheets/…" : isFileShare ? "//fileserver/risk/kri.xlsx" : "https://api.example.com/risk"} />
              {isFileShare && <p className="text-xs text-muted-foreground mt-1">Internal file shares can't be reached from the cloud — use Import Excel/CSV to load their files.</p>}
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Credentials are stored in a locked store and are never shown again. {id && "Leave blank to keep the saved ones."}</p>
            <div>
              <Label>Authentication</Label>
              <Select value={creds.auth_type} onValueChange={(v) => { setCredsTouched(true); setCreds({ auth_type: v as Credentials["auth_type"], secret: {} }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="basic">Username & password</SelectItem>
                  <SelectItem value="bearer">Access token</SelectItem>
                  <SelectItem value="api_key">API key header</SelectItem>
                </SelectContent>
              </Select>
              {isSS && <p className="text-xs text-muted-foreground mt-1">Smartsheet uses an access token (Account → Apps & Integrations → API Access).</p>}
              {isSN && <p className="text-xs text-muted-foreground mt-1">ServiceNow usually uses a username & password of an integration user.</p>}
            </div>
            {creds.auth_type === "basic" && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Username</Label><Input autoComplete="off" value={creds.secret.username ?? ""} onChange={(e) => setSecret("username", e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" autoComplete="new-password" value={creds.secret.password ?? ""} onChange={(e) => setSecret("password", e.target.value)} /></div>
              </div>
            )}
            {(creds.auth_type === "bearer" || creds.auth_type === "api_key") && (
              <div className="grid grid-cols-2 gap-4">
                {creds.auth_type === "api_key" && <div><Label>Header name</Label><Input value={creds.secret.header_name ?? ""} placeholder="x-api-key" onChange={(e) => setSecret("header_name", e.target.value)} /></div>}
                <div className={creds.auth_type === "bearer" ? "col-span-2" : ""}><Label>{creds.auth_type === "bearer" ? "Token" : "Key"}</Label><Input type="password" autoComplete="new-password" value={creds.secret.token ?? ""} onChange={(e) => setSecret("token", e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {isSN && (
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Table</Label><Input value={sync.table ?? ""} placeholder="sn_grc_indicator" onChange={(e) => setSyncField("table", e.target.value)} /></div>
                <div><Label>Key field</Label><Input value={sync.key_field ?? ""} placeholder="number" onChange={(e) => setSyncField("key_field", e.target.value)} /></div>
                <div><Label>Value field</Label><Input value={sync.value_field ?? ""} placeholder="u_value" onChange={(e) => setSyncField("value_field", e.target.value)} /></div>
              </div>
            )}
            {isSS && (
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Sheet ID</Label><Input value={sync.sheet_id ?? ""} onChange={(e) => setSyncField("sheet_id", e.target.value)} /></div>
                <div><Label>Key column</Label><Input value={sync.key_column ?? ""} placeholder="KRI" onChange={(e) => setSyncField("key_column", e.target.value)} /></div>
                <div><Label>Value column</Label><Input value={sync.value_column ?? ""} placeholder="Value" onChange={(e) => setSyncField("value_column", e.target.value)} /></div>
                <div><Label>Status column</Label><Input value={sync.status_column ?? ""} placeholder="Status" onChange={(e) => setSyncField("status_column", e.target.value)} /></div>
                <div><Label>Date column</Label><Input value={sync.date_column ?? ""} placeholder="Measured" onChange={(e) => setSyncField("date_column", e.target.value)} /></div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Indicator mappings</Label>
              <Button size="sm" variant="outline" onClick={() => setMappings((m) => [...m, { kri_id: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSN || isSS ? "Reference = the record number or row key in the external system." : "Path is relative to the location; field is the JSON property holding the number (dot notation allowed)."}
            </p>
            {mappings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">No indicators mapped yet</p>}
            {mappings.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Select value={m.kri_id} onValueChange={(v) => setMappings((ms) => ms.map((x, j) => j === i ? { ...x, kri_id: v } : x))}>
                    <SelectTrigger><SelectValue placeholder="Choose indicator" /></SelectTrigger>
                    <SelectContent>{(kris ?? []).map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isSN || isSS ? (
                  <Input className="col-span-6" placeholder="Reference" value={m.external_ref ?? ""} onChange={(e) => setMappings((ms) => ms.map((x, j) => j === i ? { ...x, external_ref: e.target.value } : x))} />
                ) : (
                  <>
                    <Input className="col-span-3" placeholder="/path" value={m.path ?? ""} onChange={(e) => setMappings((ms) => ms.map((x, j) => j === i ? { ...x, path: e.target.value } : x))} />
                    <Input className="col-span-3" placeholder="field" value={m.field ?? ""} onChange={(e) => setMappings((ms) => ms.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} />
                  </>
                )}
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setMappings((ms) => ms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Run the connection check before ingestion. The source is marked connected only when every check passes.</p>
            <Button onClick={runVerify} disabled={verify.isPending || saving}>
              {verify.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Verify connection
            </Button>
            {checks && (
              <div className="rounded-lg border divide-y">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 text-sm">
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-risk-green mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
                    <div><p className="font-medium">{c.step}</p><p className="text-xs text-muted-foreground break-all">{c.detail}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < 3 ? (
            <Button onClick={next} disabled={saving}>{step === 2 ? "Save & continue" : "Next"}</Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SourceWizardDialog;
