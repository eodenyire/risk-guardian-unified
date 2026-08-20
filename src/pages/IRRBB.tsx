import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Plus, Pencil, Trash2, AlertTriangle, TrendingUp, Gauge, Percent,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GapEntry, IrrbbLimit, ScenarioResult, IRRBB_RISK_TYPE_ID, buildLadder, ragClass, ragForValue,
  scenarioLabel, SCENARIO_LABELS, useDeleteGapEntry, useDeleteLimit, useDeleteScenario, useGapEntries,
  useIrrbbLimits, useScenarioResults, useUpsertGapEntry, useUpsertLimit, useUpsertScenario,
} from "@/hooks/useIRRBB";
import { useKRIs } from "@/hooks/useKRI";

const fmt = (n: number, d = 1) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const green = "hsl(var(--risk-green))";
const amber = "hsl(var(--risk-amber))";
const red = "hsl(var(--risk-red))";

const emptyGap = {
  bucket: "", bucket_order: 1, currency: "KES", as_of_date: new Date().toISOString().slice(0, 10),
  rate_sensitive_assets: 0, rate_sensitive_liabilities: 0, off_balance_sheet: 0, source: "manual",
};
const emptyLimit = {
  metric: "", scenario: "parallel_up_200", basis: "pct_tier1", currency: "ALL",
  limit_value: 15, green_threshold: 8, amber_threshold: 12, red_threshold: 15,
  unit: "%", owner: "", status: "active", escalation: "",
};
const emptyScenario = {
  as_of_date: new Date().toISOString().slice(0, 10), currency: "KES", scenario: "parallel_up_200",
  delta_eve: 0, delta_nii: 0, eve_pct_tier1: 0, nii_pct_income: 0, source: "manual",
};

const IRRBBPage = () => {
  const { data: gaps, isLoading } = useGapEntries();
  const { data: limits } = useIrrbbLimits();
  const { data: scenarios } = useScenarioResults();
  const { data: kris } = useKRIs();

  const upsertGap = useUpsertGapEntry();
  const delGap = useDeleteGapEntry();
  const upsertLimit = useUpsertLimit();
  const delLimit = useDeleteLimit();
  const upsertScenario = useUpsertScenario();
  const delScenario = useDeleteScenario();

  const [currency, setCurrency] = useState("KES");
  const [gapOpen, setGapOpen] = useState(false);
  const [gapForm, setGapForm] = useState<Record<string, unknown>>(emptyGap);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitForm, setLimitForm] = useState<Record<string, unknown>>(emptyLimit);
  const [scenOpen, setScenOpen] = useState(false);
  const [scenForm, setScenForm] = useState<Record<string, unknown>>(emptyScenario);

  const currencies = useMemo(
    () => Array.from(new Set((gaps ?? []).map((g) => g.currency))).sort(),
    [gaps],
  );

  const ladder = useMemo(
    () => buildLadder((gaps ?? []).filter((g) => g.currency === currency)),
    [gaps, currency],
  );

  const irrbbKris = useMemo(
    () => (kris ?? []).filter((k) => k.risk_type_id === IRRBB_RISK_TYPE_ID),
    [kris],
  );

  const latestScenarios = useMemo(() => {
    const list = scenarios ?? [];
    if (!list.length) return [];
    const latestDate = list[0].as_of_date;
    return list.filter((s) => s.as_of_date === latestDate);
  }, [scenarios]);

  const eveLimit = (limits ?? []).find((l) => l.metric.startsWith("Delta EVE"));
  const niiLimit = (limits ?? []).find((l) => l.metric.startsWith("Delta NII"));

  const worstEve = latestScenarios.reduce(
    (w, s) => (Math.abs(s.eve_pct_tier1) > Math.abs(w?.eve_pct_tier1 ?? 0) ? s : w),
    undefined as ScenarioResult | undefined,
  );
  const worstNii = latestScenarios.reduce(
    (w, s) => (Math.abs(s.nii_pct_income) > Math.abs(w?.nii_pct_income ?? 0) ? s : w),
    undefined as ScenarioResult | undefined,
  );

  const cumulative12m = useMemo(() => {
    const upTo12 = ladder.filter((r) => r.bucket_order <= 4);
    const cum = upTo12.length ? upTo12[upTo12.length - 1].cumulative : 0;
    const totalAssets = ladder.reduce((s, r) => s + Number(r.rate_sensitive_assets), 0) || 1;
    return { value: cum, pct: (cum / totalAssets) * 100 };
  }, [ladder]);

  const breaches = [
    ...latestScenarios.filter((s) => s.breached).map((s) => `${scenarioLabel(s.scenario)} — ΔEVE ${fmt(s.eve_pct_tier1)}% of Tier 1`),
    ...irrbbKris.filter((k) => k.status === "red").map((k) => `${k.name} at ${k.current_value}${k.metric_unit}`),
  ];

  const stats = [
    {
      label: "Worst ΔEVE / Tier 1",
      value: worstEve ? `${fmt(worstEve.eve_pct_tier1)}%` : "—",
      sub: worstEve ? scenarioLabel(worstEve.scenario) : "no results",
      icon: Gauge,
      rag: worstEve && eveLimit ? ragForValue(worstEve.eve_pct_tier1, eveLimit.amber_threshold, eveLimit.red_threshold) : "green",
    },
    {
      label: "Worst ΔNII (12M)",
      value: worstNii ? `${fmt(worstNii.nii_pct_income)}%` : "—",
      sub: worstNii ? scenarioLabel(worstNii.scenario) : "no results",
      icon: TrendingUp,
      rag: worstNii && niiLimit ? ragForValue(worstNii.nii_pct_income, niiLimit.amber_threshold, niiLimit.red_threshold) : "green",
    },
    {
      label: "Cumulative 12M gap",
      value: `${fmt(cumulative12m.pct)}%`,
      sub: `${fmt(cumulative12m.value, 0)} ${currency} m of RSA`,
      icon: Percent,
      rag: ragForValue(cumulative12m.pct, 15, 20) as "green" | "amber" | "red",
    },
    {
      label: "Limits & KRIs breached",
      value: String(breaches.length),
      sub: `${irrbbKris.length} IRRBB KRIs tracked`,
      icon: AlertTriangle,
      rag: (breaches.length ? "red" : "green") as "green" | "red",
    },
  ];

  const chartData = ladder.map((r) => ({
    bucket: r.bucket,
    gap: Number(r.gap.toFixed(1)),
    cumulative: Number(r.cumulative.toFixed(1)),
  }));

  const openGapEdit = (g: GapEntry) => {
    setGapForm({ ...g, as_of_date: g.as_of_date.slice(0, 10) });
    setGapOpen(true);
  };
  const openLimitEdit = (l: IrrbbLimit) => { setLimitForm({ ...l, owner: l.owner ?? "", escalation: l.escalation ?? "" }); setLimitOpen(true); };
  const openScenEdit = (s: ScenarioResult) => { setScenForm({ ...s, as_of_date: s.as_of_date.slice(0, 10) }); setScenOpen(true); };

  const num = (v: unknown) => Number(v ?? 0);

  const saveGap = async () => {
    const f = gapForm as Record<string, string | number>;
    if (!String(f.bucket ?? "").trim()) return;
    await upsertGap.mutateAsync({
      id: f.id as string | undefined,
      as_of_date: String(f.as_of_date),
      currency: String(f.currency),
      bucket: String(f.bucket),
      bucket_order: num(f.bucket_order),
      rate_sensitive_assets: num(f.rate_sensitive_assets),
      rate_sensitive_liabilities: num(f.rate_sensitive_liabilities),
      off_balance_sheet: num(f.off_balance_sheet),
      source: String(f.source ?? "manual"),
    });
    setGapOpen(false);
  };

  const saveLimit = async () => {
    const f = limitForm as Record<string, string | number>;
    if (!String(f.metric ?? "").trim()) return;
    await upsertLimit.mutateAsync({
      id: f.id as string | undefined,
      metric: String(f.metric),
      scenario: String(f.scenario),
      basis: String(f.basis),
      currency: String(f.currency),
      limit_value: num(f.limit_value),
      green_threshold: num(f.green_threshold),
      amber_threshold: num(f.amber_threshold),
      red_threshold: num(f.red_threshold),
      unit: String(f.unit),
      owner: String(f.owner ?? ""),
      status: String(f.status),
      escalation: String(f.escalation ?? ""),
    });
    setLimitOpen(false);
  };

  const saveScenario = async () => {
    const f = scenForm as Record<string, string | number>;
    const eve = num(f.eve_pct_tier1);
    await upsertScenario.mutateAsync({
      id: f.id as string | undefined,
      as_of_date: String(f.as_of_date),
      currency: String(f.currency),
      scenario: String(f.scenario),
      delta_eve: num(f.delta_eve),
      delta_nii: num(f.delta_nii),
      eve_pct_tier1: eve,
      nii_pct_income: num(f.nii_pct_income),
      breached: eveLimit ? Math.abs(eve) >= eveLimit.red_threshold : false,
      source: String(f.source ?? "manual"),
    });
    setScenOpen(false);
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Activity className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">IRRBB</h1>
            <p className="text-muted-foreground">
              Interest rate risk in the banking book — repricing gaps, EVE/NII sensitivity, board limits and KRIs
            </p>
          </div>
        </div>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(currencies.length ? currencies : ["KES"]).map((c) => <SelectItem key={c} value={c}>{c} book</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${ragClass(s.rag as "green" | "amber" | "red")}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {breaches.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Limit breaches requiring ALCO escalation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {breaches.map((b) => <p key={b}>• {b}</p>)}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="gap">
        <TabsList>
          <TabsTrigger value="gap">Repricing gap</TabsTrigger>
          <TabsTrigger value="scenarios">Rate shocks</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="kris">IRRBB KRIs</TabsTrigger>
        </TabsList>

        {/* -------- gap ladder -------- */}
        <TabsContent value="gap" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Net and cumulative repricing gap ({currency} m)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="gap" name="Net gap" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.gap < 0 ? red : green} />)}
                  </Bar>
                  <Line type="monotone" dataKey="cumulative" name="Cumulative gap" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Gap table</CardTitle>
              <Button size="sm" onClick={() => { setGapForm({ ...emptyGap, currency }); setGapOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add bucket
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time bucket</TableHead>
                    <TableHead className="text-right">RSA</TableHead>
                    <TableHead className="text-right">RSL</TableHead>
                    <TableHead className="text-right">Off B/S</TableHead>
                    <TableHead className="text-right">Net gap</TableHead>
                    <TableHead className="text-right">% of RSA</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ladder.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.bucket}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.rate_sensitive_assets), 0)}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.rate_sensitive_liabilities), 0)}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.off_balance_sheet), 0)}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.gap < 0 ? "text-destructive" : "text-[hsl(var(--risk-green))]"}`}>
                        {fmt(r.gap, 0)}
                      </TableCell>
                      <TableCell className="text-right">{fmt(r.gapPctAssets)}%</TableCell>
                      <TableCell className="text-right">{fmt(r.cumulative, 0)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openGapEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => delGap.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ladder.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No gap buckets for this book yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- scenarios -------- */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">ΔEVE as % of Tier 1 capital by shock</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestScenarios.map((s) => ({ name: scenarioLabel(s.scenario), eve: Number(s.eve_pct_tier1), nii: Number(s.nii_pct_income) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="eve" name="ΔEVE % Tier 1" radius={[4, 4, 0, 0]}>
                    {latestScenarios.map((s, i) => (
                      <Cell key={i} fill={eveLimit && Math.abs(s.eve_pct_tier1) >= eveLimit.red_threshold ? red : eveLimit && Math.abs(s.eve_pct_tier1) >= eveLimit.amber_threshold ? amber : green} />
                    ))}
                  </Bar>
                  <Bar dataKey="nii" name="ΔNII % income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Scenario results</CardTitle>
              <Button size="sm" onClick={() => { setScenForm({ ...emptyScenario, currency }); setScenOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add result
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>As of</TableHead>
                    <TableHead>Ccy</TableHead>
                    <TableHead className="text-right">ΔEVE</TableHead>
                    <TableHead className="text-right">% Tier 1</TableHead>
                    <TableHead className="text-right">ΔNII</TableHead>
                    <TableHead className="text-right">% income</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(scenarios ?? []).map((s) => {
                    const rag = eveLimit ? ragForValue(s.eve_pct_tier1, eveLimit.amber_threshold, eveLimit.red_threshold) : "green";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{scenarioLabel(s.scenario)}</TableCell>
                        <TableCell>{s.as_of_date}</TableCell>
                        <TableCell>{s.currency}</TableCell>
                        <TableCell className="text-right">{fmt(Number(s.delta_eve), 0)}</TableCell>
                        <TableCell className="text-right">{fmt(Number(s.eve_pct_tier1))}%</TableCell>
                        <TableCell className="text-right">{fmt(Number(s.delta_nii), 0)}</TableCell>
                        <TableCell className="text-right">{fmt(Number(s.nii_pct_income))}%</TableCell>
                        <TableCell><Badge className={ragClass(rag)}>{rag === "red" ? "Breach" : rag === "amber" ? "Watch" : "Within limit"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openScenEdit(s)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => delScenario.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!(scenarios ?? []).length && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No scenario results recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- limits -------- */}
        <TabsContent value="limits">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Board and ALCO limits</CardTitle>
              <Button size="sm" onClick={() => { setLimitForm(emptyLimit); setLimitOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add limit
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead className="text-right">Green</TableHead>
                    <TableHead className="text-right">Amber</TableHead>
                    <TableHead className="text-right">Red / limit</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Escalation</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(limits ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.metric}</TableCell>
                      <TableCell>{scenarioLabel(l.scenario)}</TableCell>
                      <TableCell className="text-muted-foreground">{l.basis.replace("pct_", "% of ")}</TableCell>
                      <TableCell className="text-right">≤ {fmt(Number(l.green_threshold))}{l.unit}</TableCell>
                      <TableCell className="text-right">{fmt(Number(l.amber_threshold))}{l.unit}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(l.red_threshold))}{l.unit}</TableCell>
                      <TableCell>{l.owner ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[220px]">{l.escalation ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openLimitEdit(l)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => delLimit.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(limits ?? []).length && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No limits defined.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- KRIs -------- */}
        <TabsContent value="kris">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">IRRBB key risk indicators</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Green</TableHead>
                    <TableHead className="text-right">Amber</TableHead>
                    <TableHead className="text-right">Red</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>RAG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irrbbKris.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium max-w-[320px]">{k.name}</TableCell>
                      <TableCell className="text-right">{fmt(Number(k.current_value))}{k.metric_unit}</TableCell>
                      <TableCell className="text-right">{fmt(Number(k.green_threshold))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(k.amber_threshold))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(k.red_threshold))}</TableCell>
                      <TableCell className="capitalize">{k.frequency}</TableCell>
                      <TableCell>{k.owner ?? "—"}</TableCell>
                      <TableCell><Badge className={ragClass(k.status)}>{k.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!irrbbKris.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No IRRBB KRIs yet — add them from the KRI Monitor.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* gap dialog */}
      <Dialog open={gapOpen} onOpenChange={setGapOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(gapForm as { id?: string }).id ? "Edit" : "Add"} gap bucket</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["bucket", "Time bucket", "text"], ["bucket_order", "Order", "number"],
              ["currency", "Currency", "text"], ["as_of_date", "As of", "date"],
              ["rate_sensitive_assets", "Rate-sensitive assets", "number"],
              ["rate_sensitive_liabilities", "Rate-sensitive liabilities", "number"],
              ["off_balance_sheet", "Off balance sheet", "number"],
            ].map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={type}
                  value={String((gapForm as Record<string, unknown>)[key] ?? "")}
                  onChange={(e) => setGapForm({ ...gapForm, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={saveGap}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* limit dialog */}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(limitForm as { id?: string }).id ? "Edit" : "Add"} limit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Metric</Label>
              <Input value={String((limitForm as Record<string, unknown>).metric ?? "")} onChange={(e) => setLimitForm({ ...limitForm, metric: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Scenario</Label>
              <Select value={String((limitForm as Record<string, unknown>).scenario)} onValueChange={(v) => setLimitForm({ ...limitForm, scenario: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SCENARIO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Basis</Label>
              <Select value={String((limitForm as Record<string, unknown>).basis)} onValueChange={(v) => setLimitForm({ ...limitForm, basis: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pct_tier1">% of Tier 1 capital</SelectItem>
                  <SelectItem value="pct_income">% of net interest income</SelectItem>
                  <SelectItem value="pct_assets">% of rate-sensitive assets</SelectItem>
                  <SelectItem value="absolute">Absolute amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[["green_threshold", "Green"], ["amber_threshold", "Amber"], ["red_threshold", "Red"], ["limit_value", "Hard limit"]].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type="number" value={String((limitForm as Record<string, unknown>)[key] ?? "")} onChange={(e) => setLimitForm({ ...limitForm, [key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5"><Label>Owner</Label>
              <Input value={String((limitForm as Record<string, unknown>).owner ?? "")} onChange={(e) => setLimitForm({ ...limitForm, owner: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Currency</Label>
              <Input value={String((limitForm as Record<string, unknown>).currency ?? "")} onChange={(e) => setLimitForm({ ...limitForm, currency: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Escalation</Label>
              <Input value={String((limitForm as Record<string, unknown>).escalation ?? "")} onChange={(e) => setLimitForm({ ...limitForm, escalation: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveLimit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* scenario dialog */}
      <Dialog open={scenOpen} onOpenChange={setScenOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(scenForm as { id?: string }).id ? "Edit" : "Add"} scenario result</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Scenario</Label>
              <Select value={String((scenForm as Record<string, unknown>).scenario)} onValueChange={(v) => setScenForm({ ...scenForm, scenario: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SCENARIO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[["as_of_date", "As of", "date"], ["currency", "Currency", "text"],
              ["delta_eve", "ΔEVE amount", "number"], ["eve_pct_tier1", "ΔEVE % of Tier 1", "number"],
              ["delta_nii", "ΔNII amount", "number"], ["nii_pct_income", "ΔNII % of income", "number"]].map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type={type} value={String((scenForm as Record<string, unknown>)[key] ?? "")} onChange={(e) => setScenForm({ ...scenForm, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={saveScenario}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default IRRBBPage;
