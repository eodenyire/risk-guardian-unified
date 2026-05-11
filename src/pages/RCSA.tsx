import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileCheck, Plus, Pencil, Trash2, Send, CheckCircle2, ClipboardList, AlertCircle, Search } from "lucide-react";
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
import { useRCSA, useUpsertRCSA, useDeleteRCSA, RCSA } from "@/hooks/useGRC";
import { useRiskTypes } from "@/hooks/useRiskData";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/15 text-primary border border-primary/30",
  approved: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))] border border-[hsl(var(--risk-green))]/30",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

const residualBadge = (s: number) => {
  if (s >= 15) return "bg-destructive text-destructive-foreground";
  if (s >= 8) return "bg-[hsl(var(--risk-amber))] text-white";
  return "bg-[hsl(var(--risk-green))] text-white";
};

interface FormState {
  id?: string; title: string; business_unit: string; period: string;
  risk_type_id: string | null; inherent_score: number; control_score: number;
  status: string; assessor: string; approver: string; due_date: string; notes: string;
}
const emptyForm: FormState = {
  title: "", business_unit: "", period: "Q2-2026", risk_type_id: null,
  inherent_score: 15, control_score: 10, status: "draft",
  assessor: "", approver: "", due_date: "", notes: "",
};

const RCSAPage = () => {
  const { data: items, isLoading } = useRCSA();
  const { data: riskTypes } = useRiskTypes();
  const upsert = useUpsertRCSA();
  const del = useDeleteRCSA();

  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    return (items ?? []).filter(a => {
      if (fStatus !== "all" && a.status !== fStatus) return false;
      if (search && !`${a.title} ${a.business_unit} ${a.assessor ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, fStatus, search]);

  const summary = useMemo(() => {
    const list = items ?? [];
    return {
      total: list.length,
      draft: list.filter(a => a.status === "draft").length,
      submitted: list.filter(a => a.status === "submitted").length,
      approved: list.filter(a => a.status === "approved").length,
    };
  }, [items]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (a: RCSA) => {
    setForm({
      id: a.id, title: a.title, business_unit: a.business_unit, period: a.period,
      risk_type_id: a.risk_type_id, inherent_score: a.inherent_score,
      control_score: a.control_score, status: a.status,
      assessor: a.assessor ?? "", approver: a.approver ?? "",
      due_date: a.due_date ?? "", notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const residualPreview = Math.max(0, form.inherent_score - form.control_score);

  const save = async () => {
    if (!form.title.trim() || !form.business_unit.trim()) return;
    await upsert.mutateAsync({
      ...form,
      residual_score: residualPreview,
      due_date: form.due_date || null,
    } as Partial<RCSA>);
    setOpen(false);
  };

  const transition = async (a: RCSA, next: string) => {
    await upsert.mutateAsync({ id: a.id, status: next } as Partial<RCSA>);
  };

  const stats = [
    { label: "Total assessments", value: summary.total, icon: ClipboardList, cls: "bg-primary/10 text-primary" },
    { label: "Draft", value: summary.draft, icon: FileCheck, cls: "bg-muted text-muted-foreground" },
    { label: "Awaiting approval", value: summary.submitted, icon: AlertCircle, cls: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))]" },
    { label: "Approved", value: summary.approved, icon: CheckCircle2, cls: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))]" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><FileCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">RCSA</h1>
            <p className="text-muted-foreground">Risk & Control Self-Assessment workflows, scoring and approvals</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Assessment</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
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

      <Card>
        <CardHeader><CardTitle className="text-base">Assessments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by title, BU or assessor" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Risk Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Inherent</TableHead>
                    <TableHead>Controls</TableHead>
                    <TableHead>Residual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.assessor ?? "—"} → {a.approver ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.business_unit}</TableCell>
                      <TableCell className="text-sm">{a.risk_types?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.period}</TableCell>
                      <TableCell className="font-mono text-sm">{a.inherent_score}</TableCell>
                      <TableCell className="font-mono text-sm">−{a.control_score}</TableCell>
                      <TableCell><Badge className={residualBadge(a.residual_score)}>{a.residual_score}</Badge></TableCell>
                      <TableCell><Badge className={statusStyles[a.status]}>{a.status.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-sm">{a.due_date ? format(new Date(a.due_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {a.status === "draft" && (
                          <Button variant="ghost" size="sm" onClick={() => transition(a, "submitted")} title="Submit">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {a.status === "submitted" && (
                          <Button variant="ghost" size="sm" onClick={() => transition(a, "approved")} title="Approve">
                            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--risk-green))]" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No assessments match</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Assessment" : "New Assessment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Business Unit</Label>
              <Input value={form.business_unit} onChange={e => setForm({ ...form, business_unit: e.target.value })} />
            </div>
            <div>
              <Label>Period</Label>
              <Input value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. Q2-2026" />
            </div>
            <div>
              <Label>Risk Type</Label>
              <Select value={form.risk_type_id ?? "none"} onValueChange={v => setForm({ ...form, risk_type_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {riskTypes?.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","submitted","approved","rejected"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inherent score (0–25)</Label>
              <Input type="number" min={0} max={25} value={form.inherent_score} onChange={e => setForm({ ...form, inherent_score: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Control effectiveness deduction</Label>
              <Input type="number" min={0} max={25} value={form.control_score} onChange={e => setForm({ ...form, control_score: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Assessor</Label>
              <Input value={form.assessor} onChange={e => setForm({ ...form, assessor: e.target.value })} />
            </div>
            <div>
              <Label>Approver</Label>
              <Input value={form.approver} onChange={e => setForm({ ...form, approver: e.target.value })} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center justify-between p-3 rounded-md bg-muted/40 border">
              <span className="text-sm text-muted-foreground">Residual score (inherent − controls)</span>
              <Badge className={residualBadge(residualPreview)}>{residualPreview}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>{form.id ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RCSAPage;
