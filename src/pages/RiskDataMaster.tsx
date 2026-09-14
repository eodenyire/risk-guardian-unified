import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Database, Layers, Activity, SlidersHorizontal, LineChart, Gauge, ArrowRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrincipalRiskTypes, useRiskSubTypes, useObservations, useRiskAppetite } from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";
import { useDataSources, useRunIngestion, useSyncLog } from "@/hooks/useRiskData";

const ragClass = (rag: string) =>
  rag === "red"
    ? "bg-risk-red/15 text-risk-red border-risk-red/30"
    : rag === "amber"
    ? "bg-risk-amber/15 text-risk-amber border-risk-amber/30"
    : rag === "green"
    ? "bg-risk-green/15 text-risk-green border-risk-green/30"
    : "bg-muted text-muted-foreground border-border";

const RiskDataMaster = () => {
  const { data: prts } = usePrincipalRiskTypes();
  const { data: subTypes } = useRiskSubTypes();
  const { data: kris } = useKRIs();
  const { data: appetite } = useRiskAppetite();
  const { data: observations } = useObservations();
  const { data: sources } = useDataSources();
  const { data: syncLog } = useSyncLog();
  const ingest = useRunIngestion();

  const obsByKri = useMemo(() => {
    const m = new Map<string, number>();
    (observations ?? []).forEach((o) => m.set(o.kri_id, (m.get(o.kri_id) ?? 0) + 1));
    return m;
  }, [observations]);

  const lastObsByKri = useMemo(() => {
    const m = new Map<string, string>();
    (observations ?? []).forEach((o) => {
      const prev = m.get(o.kri_id);
      if (!prev || o.observed_at > prev) m.set(o.kri_id, o.observed_at);
    });
    return m;
  }, [observations]);

  const automatedObs = useMemo(
    () => (observations ?? []).filter((o) => o.source && o.source !== "manual").length,
    [observations]
  );

  const stages = [
    { key: "prt", label: "Principal Risk Types", icon: Layers, count: (prts ?? []).length },
    { key: "sub", label: "Sub Risk Types", icon: Layers, count: (subTypes ?? []).length },
    { key: "kri", label: "Key Risk Indicators", icon: Activity, count: (kris ?? []).length },
    { key: "thr", label: "Thresholds Set", icon: SlidersHorizontal, count: (kris ?? []).filter((k) => k.red_threshold !== null).length },
    { key: "obs", label: "Observations Captured", icon: LineChart, count: (observations ?? []).length },
    { key: "rag", label: "KRIs Scored (RAG)", icon: Gauge, count: (kris ?? []).filter((k) => k.last_measured_at).length },
  ];

  const coverage = useMemo(() => {
    return (prts ?? []).map((p) => {
      const subs = (subTypes ?? []).filter((s) => s.risk_type_id === p.id);
      const ks = (kris ?? []).filter((k) => k.risk_type_id === p.id);
      const obs = ks.reduce((a, k) => a + (obsByKri.get(k.id) ?? 0), 0);
      const app = (appetite ?? []).filter((a) => a.risk_type_id === p.id).length;
      const rollup = ks.some((k) => k.status === "red")
        ? "red"
        : ks.some((k) => k.status === "amber")
        ? "amber"
        : ks.length
        ? "green"
        : "grey";
      const completeness =
        ((subs.length ? 1 : 0) + (ks.length ? 1 : 0) + (app ? 1 : 0) + (obs ? 1 : 0)) * 25;
      return { p, subs: subs.length, kris: ks.length, obs, app, rollup, completeness };
    });
  }, [prts, subTypes, kris, appetite, obsByKri]);

  const avgCompleteness = coverage.length
    ? Math.round(coverage.reduce((a, c) => a + c.completeness, 0) / coverage.length)
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Database className="h-6 w-6" /> Risk Data Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Orchestration, aggregation and coverage of every stage of the risk data pipeline.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/data-sources"><RefreshCw className="h-4 w-4 mr-2" />Manage sources</Link></Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Data Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {stages.map((s, i) => (
              <div key={s.key} className="relative rounded-xl border border-border p-4 bg-card">
                <s.icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold tabular-nums">{s.count}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{s.label}</p>
                {i < stages.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Average data completeness across risk types</span>
              <span className="tabular-nums">{avgCompleteness}%</span>
            </div>
            <Progress value={avgCompleteness} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Coverage by Principal Risk Type</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Sub Types</TableHead>
                <TableHead className="text-right">KRIs</TableHead>
                <TableHead className="text-right">Appetite</TableHead>
                <TableHead className="text-right">Observations</TableHead>
                <TableHead>Aggregated RAG</TableHead>
                <TableHead className="w-40">Completeness</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverage.map((c) => (
                <TableRow key={c.p.id}>
                  <TableCell className="font-medium">{c.p.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.p.prt_category === "financial" ? "Financial" : "Non-Financial"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.subs}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.kris}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.app}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.obs}</TableCell>
                  <TableCell><Badge variant="outline" className={ragClass(c.rollup)}>{c.rollup.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={c.completeness} className="h-1.5" />
                      <span className="text-xs tabular-nums">{c.completeness}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.p.code && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={c.p.code === "IRRBB" ? "/irrbb" : `/prt/${c.p.code}`}>Open</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Connected Data Sources</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="text-right">Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sources ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.source_type}</TableCell>
                  <TableCell><Badge variant="outline">{s.integration_status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.records_synced}</TableCell>
                </TableRow>
              ))}
              {!(sources ?? []).length && (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No data sources registered yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RiskDataMaster;
