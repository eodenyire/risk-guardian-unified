import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Plus, Search, Pencil, Trash2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Activity, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useKRIs, useUpsertKRI, useDeleteKRI, computeStatus, KRI } from "@/hooks/useKRI";
import { useRiskTypes } from "@/hooks/useRiskData";

const statusStyles: Record<string, string> = {
  green: "bg-[hsl(var(--risk-green))] text-white",
  amber: "bg-[hsl(var(--risk-amber))] text-white",
  red: "bg-destructive text-destructive-foreground",
};

const trendIcon = (t: string) =>
  t === "up" ? <TrendingUp className="h-4 w-4 text-destructive" /> :
  t === "down" ? <TrendingDown className="h-4 w-4 text-[hsl(var(--risk-green))]" /> :
  <Minus className="h-4 w-4 text-muted-foreground" />;

interface FormState {
  id?: string;
  name: string;
  description: string;
  risk_type_id: string | null;
  metric_unit: string;
  current_value: number;
  green_threshold: number;
  amber_threshold: number;
  red_threshold: number;
  direction: "higher_is_worse" | "lower_is_worse";
  frequency: string;
  owner: string;
  source: string;
}

const emptyForm: FormState = {
  name: "", description: "", risk_type_id: null, metric_unit: "%",
  current_value: 0, green_threshold: 0, amber_threshold: 0, red_threshold: 0,
  direction: "higher_is_worse", frequency: "monthly", owner: "", source: "manual",
};

const progressPct = (k: KRI) => {
  const max = Math.max(k.green_threshold, k.amber_threshold, k.red_threshold, k.current_value, 1);
  return Math.min(100, Math.round((k.current_value / max) * 100));
};

const KRIPage = () => {
  const { data: kris, isLoading } = useKRIs();
  const { data: riskTypes } = useRiskTypes();
  const upsert = useUpsertKRI();
  const del = useDeleteKRI();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPRT, setFilterPRT] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    return (kris ?? []).filter(k => {
      if (filterStatus !== "all" && k.status !== filterStatus) return false;
      if (filterPRT !== "all" && k.risk_type_id !== filterPRT) return false;
      if (search && !`${k.name} ${k.owner ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [kris, filterStatus, filterPRT, search]);

  const summary = useMemo(() => {
    const list = kris ?? [];
    return {
      total: list.length,
      red: list.filter(k => k.status === "red").length,
      amber: list.filter(k => k.status === "amber").length,
      green: list.filter(k => k.status === "green").length,
    };
  }, [kris]);

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (k: KRI) => {
    setForm({
      id: k.id, name: k.name, description: k.description ?? "",
      risk_type_id: k.risk_type_id, metric_unit: k.metric_unit,
      current_value: Number(k.current_value), green_threshold: Number(k.green_threshold),
      amber_threshold: Number(k.amber_threshold), red_threshold: Number(k.red_threshold),
      direction: k.direction, frequency: k.frequency, owner: k.owner ?? "", source: k.source,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync(form);
    setDialogOpen(false);
  };

  const previewStatus = computeStatus(form);
  const breaches = (kris ?? []).filter(k => k.status === "red");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">KRI Monitor</h1>
            <p className="text-muted-foreground">Track key risk indicators, thresholds and breach alerts</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add KRI</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total KRIs", value: summary.total, icon: Activity, cls: "bg-primary/10 text-primary" },
          { label: "Red — Breached", value: summary.red, icon: AlertCircle, cls: "bg-destructive/10 text-destructive" },
          { label: "Amber — Watch", value: summary.amber, icon: AlertTriangle, cls: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))]" },
          { label: "Green — Healthy", value: summary.green, icon: CheckCircle2, cls: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))]" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-display font-bold">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.cls}`}><s.icon className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breach alerts */}
      {breaches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{breaches.length} KRI{breaches.length > 1 ? "s" : ""} in breach</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {breaches.slice(0, 4).map(b => (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span> — {b.current_value}{b.metric_unit} (red at {b.red_threshold}{b.metric_unit}) · owner: {b.owner ?? "—"}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Indicators</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or owner" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="red">Red — breach</SelectItem>
                <SelectItem value="amber">Amber</SelectItem>
                <SelectItem value="green">Green</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPRT} onValueChange={setFilterPRT}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Risk Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk types</SelectItem>
                {riskTypes?.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead>Risk Type</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead className="min-w-[180px]">Thresholds (G / A / R)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(k => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <div className="font-medium">{k.name}</div>
                        <div className="text-xs text-muted-foreground">{k.frequency} · {k.direction === "higher_is_worse" ? "↑ worse" : "↓ worse"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{k.risk_types?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{k.current_value}{k.metric_unit}</div>
                        <Progress value={progressPct(k)} className="h-1.5 mt-1 w-24" />
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="text-[hsl(var(--risk-green))]">{k.green_threshold}</span> / {" "}
                        <span className="text-[hsl(var(--risk-amber))]">{k.amber_threshold}</span> / {" "}
                        <span className="text-destructive">{k.red_threshold}</span>
                      </TableCell>
                      <TableCell><Badge className={statusStyles[k.status]}>{k.status.toUpperCase()}</Badge></TableCell>
                      <TableCell>{trendIcon(k.trend)}</TableCell>
                      <TableCell className="text-sm">{k.owner ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{k.source}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No KRIs match the filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit KRI" : "Add KRI"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Risk Type</Label>
              <Select value={form.risk_type_id ?? "none"} onValueChange={v => setForm({ ...form, risk_type_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {riskTypes?.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
            </div>
            <div>
              <Label>Current Value</Label>
              <Input type="number" step="any" value={form.current_value} onChange={e => setForm({ ...form, current_value: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.metric_unit} onChange={e => setForm({ ...form, metric_unit: e.target.value })} />
            </div>
            <div>
              <Label>Green ≤</Label>
              <Input type="number" step="any" value={form.green_threshold} onChange={e => setForm({ ...form, green_threshold: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Amber ≤</Label>
              <Input type="number" step="any" value={form.amber_threshold} onChange={e => setForm({ ...form, amber_threshold: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Red ≥</Label>
              <Input type="number" step="any" value={form.red_threshold} onChange={e => setForm({ ...form, red_threshold: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={(v: FormState["direction"]) => setForm({ ...form, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_is_worse">Higher is worse</SelectItem>
                  <SelectItem value="lower_is_worse">Lower is worse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["daily","weekly","monthly","quarterly","annually"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["manual","smartsheets","servicenow","powerbi","sharepoint"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center justify-between p-3 rounded-md bg-muted/40 border">
              <span className="text-sm text-muted-foreground">Computed status preview</span>
              <Badge className={statusStyles[previewStatus]}>{previewStatus.toUpperCase()}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{form.id ? "Save changes" : "Create KRI"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default KRIPage;
