import { motion } from "framer-motion";
import { Link2, RefreshCw, PlugZap, CheckCircle2, AlertCircle, Clock, XCircle, ArrowRightLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataSourcesList, useTestConnection, useTriggerSync, DataSourceRow } from "@/hooks/useGRC";
import { useSyncLog } from "@/hooks/useRiskData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

const statusIcon = (s: string) => {
  switch (s) {
    case "connected": return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--risk-green))]" />;
    case "pending": return <Clock className="h-4 w-4 text-[hsl(var(--risk-amber))]" />;
    case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    connected: "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))] border border-[hsl(var(--risk-green))]/30",
    pending: "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))] border border-[hsl(var(--risk-amber))]/30",
    error: "bg-destructive/15 text-destructive border border-destructive/30",
    disconnected: "bg-muted text-muted-foreground border",
  };
  return map[s] ?? map.disconnected;
};

const flowGroups = [
  {
    title: "Inbound — source systems",
    desc: "Risk data pulled from source files & systems into the platform",
    types: ["smartsheets", "servicenow", "sharepoint", "onedrive"],
  },
  {
    title: "Outbound — dashboards",
    desc: "Curated data pushed to dashboards & reporting",
    types: ["powerbi"],
  },
];

const IntegrationsPage = () => {
  const { data: sources, isLoading } = useDataSourcesList();
  const { data: syncLogs } = useSyncLog();
  const testConn = useTestConnection();
  const sync = useTriggerSync();

  const connected = (sources ?? []).filter(s => s.integration_status === "connected").length;
  const total = (sources ?? []).length;
  const lastSync = (sources ?? [])
    .map(s => s.last_sync_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const renderCard = (row: DataSourceRow) => (
    <Card key={row.id} className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
              <PlugZap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {statusIcon(row.integration_status)}
                <h3 className="font-semibold">{row.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{row.source_type}</p>
              {row.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.description}</p>}
            </div>
          </div>
          <Badge className={statusBadge(row.integration_status)}>{row.integration_status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Records synced</p>
            <p className="font-mono font-semibold text-base">{row.records_synced.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last sync</p>
            <p className="font-medium">
              {row.last_sync_at ? formatDistanceToNow(new Date(row.last_sync_at), { addSuffix: true }) : "Never"}
            </p>
          </div>
        </div>

        {row.error_message && (
          <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">{row.error_message}</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => testConn.mutate(row.id)} disabled={testConn.isPending}>
            <PlugZap className="h-3.5 w-3.5 mr-1.5" /> Test
          </Button>
          <Button size="sm" onClick={() => sync.mutate(row)} disabled={sync.isPending || row.integration_status !== "connected"}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} /> Sync now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary"><Link2 className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-display font-bold">Integrations</h1>
          <p className="text-muted-foreground">SmartSheets, ServiceNow GRC, Power BI and source-system pipelines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Connected</p><p className="text-3xl font-display font-bold">{connected}/{total}</p></div>
          <div className="p-3 rounded-xl bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))]"><CheckCircle2 className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Last sync activity</p><p className="text-base font-display font-semibold">{lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : "—"}</p></div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Activity className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Total records</p><p className="text-3xl font-display font-bold">{(sources ?? []).reduce((a, s) => a + (s.records_synced ?? 0), 0).toLocaleString()}</p></div>
          <div className="p-3 rounded-xl bg-secondary/15 text-secondary"><ArrowRightLeft className="h-5 w-5" /></div>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (
        <>
          {flowGroups.map(g => {
            const rows = (sources ?? []).filter(s => g.types.includes(s.source_type));
            if (rows.length === 0) return null;
            return (
              <div key={g.title} className="space-y-3">
                <div>
                  <h2 className="text-lg font-display font-semibold">{g.title}</h2>
                  <p className="text-sm text-muted-foreground">{g.desc}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rows.map(renderCard)}
                </div>
              </div>
            );
          })}
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent sync activity</CardTitle></CardHeader>
        <CardContent>
          {!syncLogs || syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No sync runs yet. Trigger a sync to populate this log.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.data_sources?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{l.target_system ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{l.sync_type}</TableCell>
                      <TableCell className="font-mono text-sm">{l.records_processed}</TableCell>
                      <TableCell className="font-mono text-sm">{l.records_failed}</TableCell>
                      <TableCell><Badge className={statusBadge(l.status === "completed" ? "connected" : l.status === "failed" ? "error" : "pending")}>{l.status}</Badge></TableCell>
                      <TableCell className="text-sm">{formatDistanceToNow(new Date(l.started_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default IntegrationsPage;
