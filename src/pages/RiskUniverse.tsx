import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Network, Plus, Search, Pencil, Trash2, ChevronRight, Layers,
  Coins, ShieldAlert, Gauge, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePrincipalRiskTypes, useRiskSubTypes, useUpsertSubType, useDeleteSubType,
  useRiskAppetite, worstRag, ragToken, Rag, RiskSubType,
} from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";

const ragChip: Record<Rag, string> = {
  red: "bg-risk-red/15 text-risk-red border-risk-red/30",
  amber: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  green: "bg-risk-green/15 text-risk-green border-risk-green/30",
  grey: "bg-muted text-muted-foreground border-border",
};

const ratingChip: Record<string, string> = {
  critical: "bg-risk-red/15 text-risk-red border-risk-red/30",
  high: "bg-risk-red/15 text-risk-red border-risk-red/30",
  medium: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  low: "bg-risk-green/15 text-risk-green border-risk-green/30",
};

interface FormState {
  id?: string;
  risk_type_id: string;
  name: string;
  code: string;
  description: string;
  owner: string;
  inherent_rating: string;
  residual_rating: string;
  status: string;
  display_order: number;
}
const emptyForm: FormState = {
  risk_type_id: "", name: "", code: "", description: "", owner: "",
  inherent_rating: "medium", residual_rating: "low", status: "active", display_order: 100,
};

const RiskUniverse = () => {
  const { data: prts, isLoading } = usePrincipalRiskTypes();
  const { data: subTypes } = useRiskSubTypes();
  const { data: kris } = useKRIs();
  const { data: appetite } = useRiskAppetite();
  const upsert = useUpsertSubType();
  const del = useDeleteSubType();

  const [tab, setTab] = useState<"all" | "financial" | "non_financial">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const subsByPrt = useMemo(() => {
    const m = new Map<string, RiskSubType[]>();
    (subTypes ?? []).forEach((s) => {
      const arr = m.get(s.risk_type_id) ?? [];
      arr.push(s);
      m.set(s.risk_type_id, arr);
    });
    return m;
  }, [subTypes]);

  const krisBySub = useMemo(() => {
    const m = new Map<string, typeof kris>();
    (kris ?? []).forEach((k) => {
      const key = k.risk_sub_type_id;
      if (!key) return;
      const arr = m.get(key) ?? [];
      arr!.push(k);
      m.set(key, arr);
    });
    return m;
  }, [kris]);

  const krisByPrt = useMemo(() => {
    const m = new Map<string, Rag[]>();
    (kris ?? []).forEach((k) => {
      if (!k.risk_type_id) return;
      const arr = m.get(k.risk_type_id) ?? [];
      arr.push((k.status ?? "grey") as Rag);
      m.set(k.risk_type_id, arr);
    });
    return m;
  }, [kris]);

  const appetiteByPrt = useMemo(() => {
    const m = new Map<string, string>();
    (appetite ?? []).forEach((a) => {
      if (a.risk_type_id) m.set(a.risk_type_id, a.appetite_level);
    });
    return m;
  }, [appetite]);

  const visible = useMemo(() => {
    return (prts ?? []).filter((p) => {
      if (tab !== "all" && p.prt_category !== tab) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const subMatch = (subsByPrt.get(p.id) ?? []).some((s) => s.name.toLowerCase().includes(q));
      return p.name.toLowerCase().includes(q) || subMatch;
    });
  }, [prts, tab, search, subsByPrt]);

  const stats = useMemo(() => {
    const list = prts ?? [];
    const rags = (kris ?? []).map((k) => (k.status ?? "grey") as Rag);
    return [
      { label: "Principal Risk Types", value: list.length, sub: `${list.filter(p => p.prt_category === "financial").length} financial · ${list.filter(p => p.prt_category === "non_financial").length} non-financial`, icon: Layers },
      { label: "Risk Sub Types", value: (subTypes ?? []).length, sub: "Second level taxonomy", icon: Network },
      { label: "Active KRIs", value: (kris ?? []).length, sub: `${rags.filter(r => r === "red").length} in breach`, icon: Gauge },
      { label: "Appetite Statements", value: (appetite ?? []).length, sub: "Board approved", icon: ShieldAlert },
    ];
  }, [prts, subTypes, kris, appetite]);

  const openCreate = (prtId: string) => { setForm({ ...emptyForm, risk_type_id: prtId }); setOpen(true); };
  const openEdit = (s: RiskSubType) => {
    setForm({
      id: s.id, risk_type_id: s.risk_type_id, name: s.name, code: s.code ?? "",
      description: s.description ?? "", owner: s.owner ?? "", inherent_rating: s.inherent_rating,
      residual_rating: s.residual_rating ?? "low", status: s.status, display_order: s.display_order,
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !form.risk_type_id) return;
    await upsert.mutateAsync({ ...form, code: form.code || null } as Partial<RiskSubType>);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-7 w-7 text-shield" /> Risk Universe
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            The full taxonomy — Principal Risk Types, their sub types, and the indicators, thresholds
            and appetite that make each one measurable.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </div>
                  <s.icon className="h-5 w-5 text-shield" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-lg">Taxonomy Explorer</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="non_financial">Non-Financial</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search risks…" className="pl-9 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}

          {!isLoading && visible.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No risk types match your filters.</p>
          )}

          {visible.map((p) => {
            const subs = subsByPrt.get(p.id) ?? [];
            const rollup = worstRag(krisByPrt.get(p.id) ?? []);
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="h-9 w-9 rounded-lg grid place-items-center bg-muted flex-shrink-0">
                    {p.prt_category === "financial"
                      ? <Coins className="h-4 w-4 text-shield" />
                      : <Activity className="h-4 w-4 text-navy-light" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.name}</span>
                      {p.code && <Badge variant="outline" className="text-[10px] font-mono">{p.code}</Badge>}
                      <Badge variant="outline" className={`text-[10px] ${ragChip[rollup]}`}>
                        {rollup === "grey" ? "No KRI data" : `${rollup.toUpperCase()} rollup`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {subs.length} sub type{subs.length === 1 ? "" : "s"}
                      {appetiteByPrt.get(p.id) && ` · appetite: ${appetiteByPrt.get(p.id)}`}
                      {p.owner && ` · ${p.owner}`}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Inherent</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.risk_score}%`, background: ragToken(rollup === "grey" ? "green" : rollup) }} />
                    </div>
                    <span className="text-xs font-semibold w-8">{p.risk_score}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Risk Sub Types</p>
                      <Button size="sm" variant="outline" onClick={() => openCreate(p.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add sub type
                      </Button>
                    </div>
                    {subs.length === 0 && <p className="text-sm text-muted-foreground py-3">No sub types defined yet.</p>}
                    {subs.map((s) => {
                      const subKris = krisBySub.get(s.id) ?? [];
                      const subRag = worstRag(subKris.map((k) => (k.status ?? "grey") as Rag));
                      return (
                        <div key={s.id} className="bg-card rounded-lg border border-border p-3">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{s.name}</span>
                                {s.code && <Badge variant="outline" className="text-[10px] font-mono">{s.code}</Badge>}
                                <Badge variant="outline" className={`text-[10px] ${ratingChip[s.inherent_rating] ?? ratingChip.medium}`}>
                                  inherent {s.inherent_rating}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${ragChip[subRag]}`}>
                                  {subKris.length} KRI{subKris.length === 1 ? "" : "s"}
                                </Badge>
                              </div>
                              {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                              {s.owner && <p className="text-xs text-muted-foreground mt-1">Owner: {s.owner}</p>}
                              {subKris.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {subKris.map((k) => (
                                    <span key={k.id} className={`text-[10px] px-2 py-0.5 rounded-full border ${ragChip[(k.status ?? "grey") as Rag]}`}>
                                      {k.name}: {k.current_value}{k.metric_unit}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Risk Sub Type</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Principal Risk Type</Label>
              <Select value={form.risk_type_id} onValueChange={(v) => setForm({ ...form, risk_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(prts ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CR-05" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Owner</Label>
                <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Inherent</Label>
                <Select value={form.inherent_rating} onValueChange={(v) => setForm({ ...form, inherent_rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Residual</Label>
                <Select value={form.residual_rating} onValueChange={(v) => setForm({ ...form, residual_rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

export default RiskUniverse;
