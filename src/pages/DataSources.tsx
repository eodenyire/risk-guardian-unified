import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Database, Plus, Pencil, Trash2, PlugZap, RefreshCw, Search, FolderKanban } from "lucide-react";
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
  useDataSourcesList, useUpsertDataSource, useDeleteDataSource,
  useTestConnection, useTriggerSync, DataSourceRow,
} from "@/hooks/useGRC";
import { formatDistanceToNow } from "date-fns";

const sourceTypes = [
  { value: "smartsheets", label: "SmartSheets" },
  { value: "servicenow", label: "ServiceNow GRC" },
  { value: "powerbi", label: "Power BI" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "onedrive", label: "OneDrive" },
  { value: "linux_share", label: "Linux file share" },
  { value: "windows_share", label: "Windows file share" },
  { value: "api", label: "Generic API" },
];

const statusStyles: Record<string, string> = {
  connected: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))] border border-[hsl(var(--risk-green))]/30",
  pending: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))] border border-[hsl(var(--risk-amber))]/30",
  error: "bg-destructive/15 text-destructive border border-destructive/30",
  disconnected: "bg-muted text-muted-foreground border",
};

interface FormState {
  id?: string; name: string; source_type: string; description: string;
  location: string; integration_status: string;
}
const emptyForm: FormState = {
  name: "", source_type: "sharepoint", description: "", location: "",
  integration_status: "disconnected",
};

const DataSourcesPage = () => {
  const { data: sources, isLoading } = useDataSourcesList();
  const upsert = useUpsertDataSource();
  const del = useDeleteDataSource();
  const test = useTestConnection();
  const sync = useTriggerSync();

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    return (sources ?? []).filter(s => {
      if (fType !== "all" && s.source_type !== fType) return false;
      if (search && !`${s.name} ${s.location ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sources, fType, search]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (s: DataSourceRow) => {
    setForm({
      id: s.id, name: s.name, source_type: s.source_type,
      description: s.description ?? "", location: s.location ?? "",
      integration_status: s.integration_status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync(form as Partial<DataSourceRow>);
    setOpen(false);
  };

  const stats = {
    total: (sources ?? []).length,
    connected: (sources ?? []).filter(s => s.integration_status === "connected").length,
    files: (sources ?? []).filter(s => ["sharepoint", "onedrive", "linux_share", "windows_share"].includes(s.source_type)).length,
    apis: (sources ?? []).filter(s => ["smartsheets", "servicenow", "powerbi", "api"].includes(s.source_type)).length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Database className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Data Sources</h1>
            <p className="text-muted-foreground">Register file shares, SharePoint, OneDrive and internal systems feeding the platform</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Source</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total sources", value: stats.total, icon: Database, cls: "bg-primary/10 text-primary" },
          { label: "Connected", value: stats.connected, icon: PlugZap, cls: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))]" },
          { label: "File-based", value: stats.files, icon: FolderKanban, cls: "bg-[hsl(var(--risk-blue))]/15 text-[hsl(var(--risk-blue))]" },
          { label: "API-based", value: stats.apis, icon: RefreshCw, cls: "bg-secondary/15 text-secondary" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-3xl font-display font-bold">{s.value}</p></div>
              <div className={`p-3 rounded-xl ${s.cls}`}><s.icon className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registered sources</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or location" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {sourceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        {s.description && <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{s.source_type.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[260px] truncate">{s.location ?? "—"}</TableCell>
                      <TableCell><Badge className={statusStyles[s.integration_status]}>{s.integration_status}</Badge></TableCell>
                      <TableCell className="text-sm">{s.last_sync_at ? formatDistanceToNow(new Date(s.last_sync_at), { addSuffix: true }) : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{s.records_synced.toLocaleString()}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" title="Test connection" onClick={() => test.mutate(s.id)}>
                          <PlugZap className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Sync now" onClick={() => sync.mutate(s)} disabled={s.integration_status !== "connected"}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data sources match</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Data Source" : "Add Data Source"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.source_type} onValueChange={v => setForm({ ...form, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sourceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Initial status</Label>
              <Select value={form.integration_status} onValueChange={v => setForm({ ...form, integration_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["disconnected","pending","connected","error"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Location / URL / path</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. https://wekeza.sharepoint.com/sites/risk or //fileserver/risk" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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

export default DataSourcesPage;
