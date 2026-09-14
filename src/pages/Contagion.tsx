import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Plus, Pencil, Trash2, Zap, ArrowRight, TrendingUp, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  usePrincipalRiskTypes, useContagionLinks, useUpsertContagionLink, useDeleteContagionLink,
  propagateShock, networkStats, ContagionLink, effectiveStrength,
  TRANSMISSION_CHANNELS, channelLabel,
} from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";

const heat = (v: number) => {
  if (v <= 0) return "transparent";
  const alpha = Math.min(1, 0.12 + v * 0.9);
  const hue = v >= 0.7 ? "var(--risk-red)" : v >= 0.45 ? "var(--risk-amber)" : "var(--risk-green)";
  return `hsl(${hue} / ${alpha})`;
};

interface FormState {
  id?: string;
  source_risk_type_id: string;
  target_risk_type_id: string;
  strength: number;
  lag_days: number;
  direction: string;
  method: string;
  rationale: string;
  transmission_channel: string;
  process: string;
  inherent_score: number;
  residual_score: number;
  weight: number;
}
const emptyForm: FormState = {
  source_risk_type_id: "", target_risk_type_id: "", strength: 0.5,
  lag_days: 30, direction: "positive", method: "manual", rationale: "",
  transmission_channel: "operational", process: "", inherent_score: 50,
  residual_score: 30, weight: 1,
};

const Contagion = () => {
  const { data: prts, isLoading } = usePrincipalRiskTypes();
  const { data: links } = useContagionLinks();
  const { data: kris } = useKRIs();
  const upsert = useUpsertContagionLink();
  const del = useDeleteContagionLink();

  const [origin, setOrigin] = useState<string>("");
  const [shock, setShock] = useState(40);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (prts ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [prts]);

  const baseScores = useMemo(() => {
    const s: Record<string, number> = {};
    (prts ?? []).forEach((p) => { s[p.id] = p.risk_score; });
    // nudge base severity by live KRI breaches
    (kris ?? []).forEach((k) => {
      if (!k.risk_type_id || s[k.risk_type_id] === undefined) return;
      if (k.status === "red") s[k.risk_type_id] = Math.min(100, s[k.risk_type_id] + 6);
      else if (k.status === "amber") s[k.risk_type_id] = Math.min(100, s[k.risk_type_id] + 3);
    });
    return s;
  }, [prts, kris]);

  const linkMap = useMemo(() => {
    const m = new Map<string, ContagionLink>();
    (links ?? []).forEach((l) => m.set(`${l.source_risk_type_id}|${l.target_risk_type_id}`, l));
    return m;
  }, [links]);

  const stats = useMemo(() => networkStats(links ?? []), [links]);

  const sim = useMemo(() => {
    if (!origin) return null;
    return propagateShock([origin], shock, links ?? [], baseScores, { waves: 3, damping: 0.75 });
  }, [origin, shock, links, baseScores]);

  const ranking = useMemo(() => {
    return (prts ?? [])
      .map((p) => {
        const s = stats.get(p.id) ?? { outDegree: 0, inDegree: 0, outStrength: 0, inStrength: 0 };
        return { ...p, ...s, systemic: s.outStrength * 0.6 + s.inStrength * 0.4 };
      })
      .sort((a, b) => b.systemic - a.systemic);
  }, [prts, stats]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (l: ContagionLink) => {
    setForm({
      id: l.id, source_risk_type_id: l.source_risk_type_id, target_risk_type_id: l.target_risk_type_id,
      strength: Number(l.strength), lag_days: l.lag_days, direction: l.direction,
      method: l.method, rationale: l.rationale ?? "",
      transmission_channel: l.transmission_channel ?? "operational",
      process: l.process ?? "",
      inherent_score: Number(l.inherent_score ?? 50),
      residual_score: Number(l.residual_score ?? 30),
      weight: Number(l.weight ?? 1),
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.source_risk_type_id || !form.target_risk_type_id) return;
    if (form.source_risk_type_id === form.target_risk_type_id) return;
    await upsert.mutateAsync(form as unknown as Partial<ContagionLink>);
    setOpen(false);
  };

  const headline = [
    { label: "Risk Nodes", value: (prts ?? []).length, icon: Radio },
    { label: "Transmission Links", value: (links ?? []).length, icon: Share2 },
    { label: "Network Density", value: `${(((links ?? []).length / Math.max(1, (prts ?? []).length * ((prts ?? []).length - 1))) * 100).toFixed(1)}%`, icon: TrendingUp },
    { label: "Avg Strength", value: ((links ?? []).reduce((a, l) => a + Number(l.strength), 0) / Math.max(1, (links ?? []).length)).toFixed(2), icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Share2 className="h-7 w-7 text-shield" /> Risk Interconnectedness & Contagion
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            How a shock in one Principal Risk Type transmits through the risk universe — strength,
            lag and cascade waves across the network.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New link</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="h-5 w-5 text-shield" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="simulator">
        <TabsList>
          <TabsTrigger value="simulator">Contagion Simulator</TabsTrigger>
          <TabsTrigger value="matrix">Interconnection Matrix</TabsTrigger>
          <TabsTrigger value="links">Transmission Links</TabsTrigger>
        </TabsList>

        {/* Simulator */}
        <TabsContent value="simulator" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">Shock Propagation</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Origin risk</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger><SelectValue placeholder="Select the risk that crystallises" /></SelectTrigger>
                    <SelectContent>
                      {(prts ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Shock severity: {shock}</Label>
                  <Slider value={[shock]} onValueChange={([v]) => setShock(v)} min={5} max={100} step={5} className="mt-3" />
                </div>
              </div>

              {!origin && <p className="text-sm text-muted-foreground">Pick an origin risk to run the cascade.</p>}

              {sim && (
                <div className="space-y-4">
                  {sim.waves.map((w) => (
                    <div key={w.wave}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        {w.wave === 0 ? "Origin shock" : `Wave ${w.wave}`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {w.nodes.slice(0, 10).map((n) => (
                          <div key={`${w.wave}-${n.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                            <span className="text-sm font-medium">{nameById.get(n.id) ?? "—"}</span>
                            <Badge variant="outline" className="text-[10px]">+{n.delta.toFixed(1)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Post-shock severity</p>
                    <div className="space-y-1.5">
                      {Object.entries(sim.byRisk)
                        .filter(([, v]) => v.propagated > 0)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([id, v]) => (
                          <div key={id} className="flex items-center gap-3">
                            <span className="text-sm w-56 truncate">{nameById.get(id) ?? "—"}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden flex">
                              <div className="h-full bg-navy-light" style={{ width: `${v.base}%` }} />
                              <div className="h-full bg-risk-red" style={{ width: `${Math.max(0, v.total - v.base)}%` }} />
                            </div>
                            <span className="text-xs font-semibold w-24 text-right">
                              {v.base.toFixed(0)} → {v.total.toFixed(0)}
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Navy = baseline severity · red = contagion uplift. Three waves, 25% attenuation per wave.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">Systemic Importance</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk type</TableHead>
                    <TableHead className="text-right">Transmits to</TableHead>
                    <TableHead className="text-right">Receives from</TableHead>
                    <TableHead className="text-right">Out-strength</TableHead>
                    <TableHead className="text-right">In-strength</TableHead>
                    <TableHead className="text-right">Systemic score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.outDegree}</TableCell>
                      <TableCell className="text-right">{r.inDegree}</TableCell>
                      <TableCell className="text-right">{r.outStrength.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.inStrength.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{r.systemic.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matrix */}
        <TabsContent value="matrix" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Transmission Matrix</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rows transmit to columns. Cell shade = effective transmission (strength x weight x residual/inherent control factor).
              </p>
            </CardHeader>
            <CardContent className="overflow-auto">
              {isLoading ? <Skeleton className="h-96 w-full" /> : (
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-card z-10 p-2 text-left font-medium">From \ To</th>
                      {(prts ?? []).map((c) => (
                        <th key={c.id} className="p-1 align-bottom">
                          <div className="h-24 w-7 flex items-end justify-center">
                            <span className="whitespace-nowrap origin-bottom-left -rotate-90 translate-y-[-4px] text-[10px] text-muted-foreground">
                              {c.code ?? c.name}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(prts ?? []).map((r) => (
                      <tr key={r.id}>
                        <td className="sticky left-0 bg-card z-10 p-2 whitespace-nowrap font-medium">{r.name}</td>
                        {(prts ?? []).map((c) => {
                          const l = linkMap.get(`${r.id}|${c.id}`);
                          const v = l ? effectiveStrength(l) : 0;
                          return (
                            <Tooltip key={c.id}>
                              <TooltipTrigger asChild>
                                <td
                                  className={`h-8 w-7 border border-border/50 text-center ${r.id === c.id ? "bg-muted" : ""}`}
                                  style={{ background: r.id === c.id ? undefined : heat(v) }}
                                >
                                  {v > 0 && <span className="text-[10px] font-semibold text-foreground/80">{v.toFixed(1).replace("0.", ".")}</span>}
                                </td>
                              </TooltipTrigger>
                              {l && (
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium">{r.name} <ArrowRight className="inline h-3 w-3" /> {c.name}</p>
                                  <p className="text-xs mt-1">
                                    Effective {v.toFixed(2)} · raw {Number(l.strength).toFixed(2)} · weight {Number(l.weight ?? 1).toFixed(2)} · lag {l.lag_days}d
                                  </p>
                                  <p className="text-xs">
                                    {channelLabel(l.transmission_channel ?? "operational")}
                                    {l.process ? ` · ${l.process}` : ""} · inherent {Number(l.inherent_score ?? 0).toFixed(0)} → residual {Number(l.residual_score ?? 0).toFixed(0)}
                                  </p>
                                  {l.rationale && <p className="text-xs mt-1 text-muted-foreground">{l.rationale}</p>}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links */}
        <TabsContent value="links" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">Transmission Links</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead className="text-right">Strength</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Inherent</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                    <TableHead className="text-right">Effective</TableHead>
                    <TableHead className="text-right">Lag</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(links ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{nameById.get(l.source_risk_type_id)}</TableCell>
                      <TableCell className="font-medium">{nameById.get(l.target_risk_type_id)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{channelLabel(l.transmission_channel ?? "operational")}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{l.process ?? "—"}</TableCell>
                      <TableCell className="text-right">{Number(l.strength).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(l.weight ?? 1).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(l.inherent_score ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="text-right">{Number(l.residual_score ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="text-right font-semibold">{effectiveStrength(l).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{l.lag_days}d</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{l.method}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(l.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Transmission Link</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Source risk</Label>
                <Select value={form.source_risk_type_id} onValueChange={(v) => setForm({ ...form, source_risk_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(prts ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Target risk</Label>
                <Select value={form.target_risk_type_id} onValueChange={(v) => setForm({ ...form, target_risk_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(prts ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Strength: {form.strength.toFixed(2)}</Label>
              <Slider value={[form.strength]} onValueChange={([v]) => setForm({ ...form, strength: v })} min={0.05} max={1} step={0.05} className="mt-2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Lag (days)</Label>
                <Input type="number" value={form.lag_days} onChange={(e) => setForm({ ...form, lag_days: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Expert</SelectItem>
                    <SelectItem value="inferred">Inferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Rationale</Label>
              <Textarea rows={2} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contagion;
