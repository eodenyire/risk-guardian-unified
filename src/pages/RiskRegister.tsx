import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Plus, Search, Pencil, Trash2, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRiskRegister, useCreateRisk, useUpdateRisk, useDeleteRisk, RiskRegisterInsert } from "@/hooks/useRiskRegister";
import { useRiskTypes } from "@/hooks/useRiskData";

const levelColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-[hsl(var(--risk-red))] text-white",
  medium: "bg-[hsl(var(--risk-amber))] text-white",
  low: "bg-[hsl(var(--risk-green))] text-white",
};

const statusColors: Record<string, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  mitigating: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))] border-[hsl(var(--risk-amber))]/30",
  monitoring: "bg-primary/15 text-primary border-primary/30",
  closed: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))] border-[hsl(var(--risk-green))]/30",
};

const emptyForm: RiskRegisterInsert = {
  title: "",
  description: "",
  risk_type_id: null,
  risk_level: "medium",
  likelihood: 3,
  impact: 3,
  source: "manual",
  status: "open",
  owner: "",
  mitigation: "",
};

const RiskRegister = () => {
  const { data: entries, isLoading } = useRiskRegister();
  const { data: riskTypes } = useRiskTypes();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();

  const [search, setSearch] = useState("");
  const [filterPRT, setFilterPRT] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskRegisterInsert>(emptyForm);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPRT !== "all" && e.risk_type_id !== filterPRT) return false;
      if (filterLevel !== "all" && e.risk_level !== filterLevel) return false;
      if (filterSource !== "all" && e.source !== filterSource) return false;
      return true;
    });
  }, [entries, search, filterPRT, filterLevel, filterSource]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (e: typeof entries extends (infer T)[] | undefined ? T : never) => {
    if (!e) return;
    setForm({
      title: e.title,
      description: e.description,
      risk_type_id: e.risk_type_id,
      risk_level: e.risk_level,
      likelihood: e.likelihood,
      impact: e.impact,
      source: e.source,
      status: e.status,
      owner: e.owner,
      mitigation: e.mitigation,
    });
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editingId) {
        await updateRisk.mutateAsync({ id: editingId, ...form });
        toast.success("Risk entry updated");
      } else {
        await createRisk.mutateAsync(form);
        toast.success("Risk entry created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save risk entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRisk.mutateAsync(id);
      toast.success("Risk entry deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const sources = useMemo(() => [...new Set(entries?.map((e) => e.source) || [])], [entries]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Risk Register
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Centralized register across all 17 Principal Risk Types</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Risk Entry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterPRT} onValueChange={setFilterPRT}>
              <SelectTrigger className="w-[180px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="PRT" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PRTs</SelectItem>
                {riskTypes?.map((rt) => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterPRT !== "all" || filterLevel !== "all" || filterSource !== "all" || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterPRT("all"); setFilterLevel("all"); setFilterSource("all"); setSearch(""); }}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{filtered.length} Risk Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">PRT</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="hidden lg:table-cell">Score</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Owner</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{e.risk_types?.name || "—"}</TableCell>
                    <TableCell><Badge className={levelColors[e.risk_level] || ""}>{e.risk_level}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm">{e.risk_score}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs capitalize">{e.source}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusColors[e.status] || ""}`}>{e.status}</Badge></TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{e.owner || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No risk entries found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Risk Entry" : "Add Risk Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Risk title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the risk" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Principal Risk Type</Label>
                <Select value={form.risk_type_id || "none"} onValueChange={(v) => setForm({ ...form, risk_type_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{riskTypes?.map((rt) => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Likelihood (1-5)</Label>
                <Select value={String(form.likelihood)} onValueChange={(v) => setForm({ ...form, likelihood: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact (1-5)</Label>
                <Select value={String(form.impact)} onValueChange={(v) => setForm({ ...form, impact: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="smartsheets">SmartSheets</SelectItem>
                    <SelectItem value="servicenow">ServiceNow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Risk owner" />
            </div>
            <div>
              <Label>Mitigation</Label>
              <Textarea value={form.mitigation || ""} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} placeholder="Mitigation actions" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createRisk.isPending || updateRisk.isPending}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RiskRegister;
