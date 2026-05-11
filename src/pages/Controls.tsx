import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Settings2, Plus, Search, Pencil, Trash2, ShieldCheck, AlertTriangle, ShieldOff, CalendarClock } from "lucide-react";
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
import { useControls, useUpsertControl, useDeleteControl, Control } from "@/hooks/useGRC";
import { useRiskTypes } from "@/hooks/useRiskData";
import { format } from "date-fns";

const effStyles: Record<string, string> = {
  effective: "bg-[hsl(var(--risk-green))] text-white",
  partial: "bg-[hsl(var(--risk-amber))] text-white",
  ineffective: "bg-destructive text-destructive-foreground",
};

interface FormState {
  id?: string; name: string; description: string; risk_type_id: string | null;
  control_type: string; frequency: string; owner: string; effectiveness: string;
  status: string; source: string; last_tested_at: string; next_test_due: string;
}
const emptyForm: FormState = {
  name: "", description: "", risk_type_id: null, control_type: "preventive",
  frequency: "monthly", owner: "", effectiveness: "effective", status: "active",
  source: "manual", last_tested_at: "", next_test_due: "",
};

const ControlsPage = () => {
  const { data: controls, isLoading } = useControls();
  const { data: riskTypes } = useRiskTypes();
  const upsert = useUpsertControl();
  const del = useDeleteControl();

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("all");
  const [fEff, setFEff] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    return (controls ?? []).filter(c => {
      if (fType !== "all" && c.control_type !== fType) return false;
      if (fEff !== "all" && c.effectiveness !== fEff) return false;
      if (search && !`${c.name} ${c.owner ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [controls, fType, fEff, search]);

  const summary = useMemo(() => {
    const list = controls ?? [];
    const overdue = list.filter(c => c.next_test_due && new Date(c.next_test_due) < new Date()).length;
    return {
      total: list.length,
      effective: list.filter(c => c.effectiveness === "effective").length,
      ineffective: list.filter(c => c.effectiveness === "ineffective").length,
      overdue,
    };
  }, [controls]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Control) => {
    setForm({
      id: c.id, name: c.name, description: c.description ?? "", risk_type_id: c.risk_type_id,
      control_type: c.control_type, frequency: c.frequency, owner: c.owner ?? "",
      effectiveness: c.effectiveness, status: c.status, source: c.source,
      last_tested_at: c.last_tested_at ? c.last_tested_at.slice(0, 10) : "",
      next_test_due: c.next_test_due ? c.next_test_due.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      last_tested_at: form.last_tested_at ? new Date(form.last_tested_at).toISOString() : null,
      next_test_due: form.next_test_due ? new Date(form.next_test_due).toISOString() : null,
    };
    await upsert.mutateAsync(payload as Partial<Control>);
    setOpen(false);
  };

  const stats = [
    { label: "Total controls", value: summary.total, icon: Settings2, cls: "bg-primary/10 text-primary" },
    { label: "Effective", value: summary.effective, icon: ShieldCheck, cls: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))]" },
    { label: "Ineffective", value: summary.ineffective, icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
    { label: "Test overdue", value: summary.overdue, icon: CalendarClock, cls: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))]" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Settings2 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Controls</h1>
            <p className="text-muted-foreground">Control library, testing schedules and effectiveness ratings</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Control</Button>
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
        <CardHeader><CardTitle className="text-base">Control library</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or owner" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="detective">Detective</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fEff} onValueChange={setFEff}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Effectiveness" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All effectiveness</SelectItem>
                <SelectItem value="effective">Effective</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="ineffective">Ineffective</SelectItem>
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
                    <TableHead>Control</TableHead>
                    <TableHead>Risk Type</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Effectiveness</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last tested</TableHead>
                    <TableHead>Next due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const overdue = c.next_test_due && new Date(c.next_test_due) < new Date();
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          {c.description && <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{c.risk_types?.name ?? "—"}</TableCell>
                        <TableCell className="capitalize text-sm">{c.control_type}</TableCell>
                        <TableCell className="capitalize text-sm">{c.frequency}</TableCell>
                        <TableCell><Badge className={effStyles[c.effectiveness] ?? ""}>{c.effectiveness.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm">{c.owner ?? "—"}</TableCell>
                        <TableCell className="text-sm">{c.last_tested_at ? format(new Date(c.last_tested_at), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell className={`text-sm ${overdue ? "text-destructive font-medium" : ""}`}>
                          {c.next_test_due ? format(new Date(c.next_test_due), "dd MMM yyyy") : "—"}
                          {overdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No controls match the filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Control" : "Add Control"}</DialogTitle></DialogHeader>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Type</Label>
              <Select value={form.control_type} onValueChange={v => setForm({ ...form, control_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["preventive","detective","corrective"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["continuous","daily","weekly","monthly","quarterly","annually"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effectiveness</Label>
              <Select value={form.effectiveness} onValueChange={v => setForm({ ...form, effectiveness: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["effective","partial","ineffective"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["manual","smartsheets","servicenow","powerbi","sharepoint","onedrive"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Last tested</Label>
              <Input type="date" value={form.last_tested_at} onChange={e => setForm({ ...form, last_tested_at: e.target.value })} />
            </div>
            <div>
              <Label>Next test due</Label>
              <Input type="date" value={form.next_test_due} onChange={e => setForm({ ...form, next_test_due: e.target.value })} />
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

export default ControlsPage;
