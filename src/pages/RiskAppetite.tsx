import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";
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
import {
  usePrincipalRiskTypes, useRiskSubTypes, useRiskAppetite,
  useUpsertAppetite, useDeleteAppetite, RiskAppetite, Rag, worstRag,
} from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";
import { format } from "date-fns";

const levelChip: Record<string, string> = {
  averse: "bg-risk-green/15 text-risk-green border-risk-green/30",
  low: "bg-risk-green/15 text-risk-green border-risk-green/30",
  moderate: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  open: "bg-risk-blue/15 text-risk-blue border-risk-blue/30",
  hungry: "bg-risk-red/15 text-risk-red border-risk-red/30",
};

const ragChip: Record<Rag, string> = {
  red: "bg-risk-red/15 text-risk-red border-risk-red/30",
  amber: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  green: "bg-risk-green/15 text-risk-green border-risk-green/30",
  grey: "bg-muted text-muted-foreground border-border",
};

interface FormState {
  id?: string;
  risk_type_id: string | null;
  risk_sub_type_id: string | null;
  statement: string;
  appetite_level: string;
  tolerance_limit: string;
  metric_unit: string;
  escalation_trigger: string;
  approved_by: string;
  review_frequency: string;
  next_review_date: string;
  status: string;
}
const emptyForm: FormState = {
  risk_type_id: null, risk_sub_type_id: null, statement: "", appetite_level: "moderate",
  tolerance_limit: "", metric_unit: "%", escalation_trigger: "", approved_by: "",
  review_frequency: "annual", next_review_date: "", status: "active",
};

const RiskAppetitePage = () => {
  const { data: prts } = usePrincipalRiskTypes();
  const { data: subTypes } = useRiskSubTypes();
  const { data: appetite, isLoading } = useRiskAppetite();
  const { data: kris } = useKRIs();
  const upsert = useUpsertAppetite();
  const del = useDeleteAppetite();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState("all");

  const ragByPrt = useMemo(() => {
    const m = new Map<string, Rag[]>();
    (kris ?? []).forEach((k) => {
      if (!k.risk_type_id) return;
      const arr = m.get(k.risk_type_id) ?? [];
      arr.push((k.status ?? "grey") as Rag);
      m.set(k.risk_type_id, arr);
    });
    return m;
  }, [kris]);

  const rows = useMemo(() => {
    return (appetite ?? []).filter((a) => {
      if (filter === "all") return true;
      if (filter === "breached") {
        return a.risk_type_id ? worstRag(ragByPrt.get(a.risk_type_id) ?? []) === "red" : false;
      }
      return a.appetite_level === filter;
    });
  }, [appetite, filter, ragByPrt]);

  const stats = useMemo(() => {
    const list = appetite ?? [];
    const breached = list.filter((a) => a.risk_type_id && worstRag(ragByPrt.get(a.risk_type_id) ?? []) === "red").length;
    const dueSoon = list.filter((a) => a.next_review_date && new Date(a.next_review_date) < new Date(Date.now() + 90 * 864e5)).length;
    return [
      { label: "Appetite Statements", value: list.length, icon: Target },
      { label: "Within Appetite", value: list.length - breached, icon: CheckCircle2 },
      { label: "Outside Appetite", value: breached, icon: AlertTriangle },
      { label: "Review Due ≤90d", value: dueSoon, icon: CalendarClock },
    ];
  }, [appetite, ragByPrt]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (a: RiskAppetite) => {
    setForm({
      id: a.id, risk_type_id: a.risk_type_id, risk_sub_type_id: a.risk_sub_type_id,
      statement: a.statement, appetite_level: a.appetite_level,
      tolerance_limit: a.tolerance_limit?.toString() ?? "", metric_unit: a.metric_unit ?? "%",
      escalation_trigger: a.escalation_trigger ?? "", approved_by: a.approved_by ?? "",
      review_frequency: a.review_frequency, next_review_date: a.next_review_date ?? "", status: a.status,
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.statement.trim()) return;
    await upsert.mutateAsync({
      ...form,
      tolerance_limit: form.tolerance_limit === "" ? null : Number(form.tolerance_limit),
      next_review_date: form.next_review_date || null,
    } as unknown as Partial<RiskAppetite>);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-shield" /> Risk Appetite & Tolerance
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Board-approved appetite statements and tolerance limits, measured against live indicator RAG status.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New statement</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
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

      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-lg">Appetite Register</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statements</SelectItem>
              <SelectItem value="breached">Outside appetite</SelectItem>
              <SelectItem value="averse">Averse</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="open">Open</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead className="min-w-[280px]">Appetite statement</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Tolerance</TableHead>
                    <TableHead>Live status</TableHead>
                    <TableHead>Next review</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const live = a.risk_type_id ? worstRag(ragByPrt.get(a.risk_type_id) ?? []) : "grey";
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.risk_sub_types?.name ?? a.risk_types?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.statement}
                          {a.escalation_trigger && (
                            <span className="block text-xs mt-1 text-risk-amber">Escalate: {a.escalation_trigger}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={levelChip[a.appetite_level] ?? levelChip.moderate}>
                            {a.appetite_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {a.tolerance_limit !== null ? `${a.tolerance_limit} ${a.metric_unit ?? ""}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ragChip[live]}>
                            {live === "grey" ? "no data" : live}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {a.next_review_date ? format(new Date(a.next_review_date), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No statements match this filter.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Appetite Statement</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Principal Risk Type</Label>
                <Select value={form.risk_type_id ?? ""} onValueChange={(v) => setForm({ ...form, risk_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(prts ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Sub Type (optional)</Label>
                <Select value={form.risk_sub_type_id ?? ""} onValueChange={(v) => setForm({ ...form, risk_sub_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {(subTypes ?? []).filter((s) => !form.risk_type_id || s.risk_type_id === form.risk_type_id)
                      .map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Statement</Label>
              <Textarea rows={3} value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Level</Label>
                <Select value={form.appetite_level} onValueChange={(v) => setForm({ ...form, appetite_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["averse", "low", "moderate", "open", "hungry"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tolerance</Label>
                <Input type="number" value={form.tolerance_limit} onChange={(e) => setForm({ ...form, tolerance_limit: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input value={form.metric_unit} onChange={(e) => setForm({ ...form, metric_unit: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Escalation trigger</Label>
              <Input value={form.escalation_trigger} onChange={(e) => setForm({ ...form, escalation_trigger: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Approved by</Label>
                <Input value={form.approved_by} onChange={(e) => setForm({ ...form, approved_by: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select value={form.review_frequency} onValueChange={(v) => setForm({ ...form, review_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["quarterly", "semi_annual", "annual"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Next review</Label>
                <Input type="date" value={form.next_review_date} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} />
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

export default RiskAppetitePage;
