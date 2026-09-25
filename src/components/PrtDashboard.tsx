import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useObservations, networkStats, type ContagionLink, type RiskAppetite, type PrincipalRiskType } from "@/hooks/useRiskUniverse";
import type { KRI } from "@/hooks/useKRI";
import { appetiteStatus } from "@/lib/appetite";
import { usePrtGapEntries } from "@/hooks/usePrtGap";
import { specialistFor, hasSpecialist } from "@/lib/prtSpecialist";

const ragClass = (rag: string) =>
  rag === "red" ? "bg-risk-red/15 text-risk-red border-risk-red/30"
  : rag === "amber" ? "bg-risk-amber/15 text-risk-amber border-risk-amber/30"
  : rag === "green" ? "bg-risk-green/15 text-risk-green border-risk-green/30"
  : "bg-muted text-muted-foreground border-border";

interface Props { prt: PrincipalRiskType; kris: KRI[]; allKris: KRI[]; appetite: RiskAppetite[]; links: ContagionLink[] }

export const PrtOverview = ({ prt, kris, allKris, appetite, links }: Props) => {
  const { data: observations } = useObservations();

  const trend = useMemo(() => {
    const ids = new Set(kris.map((k) => k.id));
    const byMonth = new Map<string, { red: number; amber: number; green: number }>();
    (observations ?? []).filter((o) => ids.has(o.kri_id)).forEach((o) => {
      const m = o.observed_at.slice(0, 7);
      const e = byMonth.get(m) ?? { red: 0, amber: 0, green: 0 };
      if (o.rag === "red" || o.rag === "amber" || o.rag === "green") e[o.rag]++;
      byMonth.set(m, e);
    });
    return Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, v]) => ({ month, ...v }));
  }, [observations, kris]);

  const stats = useMemo(() => networkStats(links), [links]);
  const all = Array.from(stats.entries()).map(([id, s]) => ({ id, score: s.outStrength + s.inStrength }));
  const max = Math.max(0.0001, ...all.map((a) => a.score));
  const mine = stats.get(prt.id);
  const score = mine ? ((mine.outStrength + mine.inStrength) / max) * 100 : 0;
  const rank = all.sort((a, b) => b.score - a.score).findIndex((a) => a.id === prt.id) + 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Interconnectedness score</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums">{score.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></p>
            <Progress value={score} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Transmits: {mine?.outStrength.toFixed(2) ?? "0"} ({mine?.outDegree ?? 0} links)</span>
              <span>Receives: {mine?.inStrength.toFixed(2) ?? "0"} ({mine?.inDegree ?? 0} links)</span>
              <span>Systemic rank: {rank > 0 ? `#${rank} of ${all.length}` : "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">KRI RAG trend (last 12 months)</CardTitle></CardHeader>
          <CardContent className="h-56">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="red" stroke="hsl(var(--risk-red))" strokeWidth={2} />
                  <Line type="monotone" dataKey="amber" stroke="hsl(var(--risk-amber))" strokeWidth={2} />
                  <Line type="monotone" dataKey="green" stroke="hsl(var(--risk-green))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No observations yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Appetite status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {appetite.map((a) => {
            const s = appetiteStatus(a, allKris);
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0">
                <Badge variant="outline" className={ragClass(s.rag)}>{s.rag.toUpperCase()}</Badge>
                <p className="text-sm flex-1 min-w-[240px]">{a.statement}</p>
                <span className="text-xs text-muted-foreground">Tolerance {a.tolerance_limit ?? "—"} {a.metric_unit ?? ""}</span>
                <div className="w-40 flex items-center gap-2">
                  <Progress value={Math.min(100, s.utilisation ?? 0)} className="h-1.5" />
                  <span className="text-xs tabular-nums">{s.utilisation !== null ? `${s.utilisation.toFixed(0)}%` : "n/a"}</span>
                </div>
              </div>
            );
          })}
          {!appetite.length && <p className="text-sm text-muted-foreground">No appetite statements yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export const PrtSpecialistTable = ({ prt }: { prt: PrincipalRiskType }) => {
  const cfg = specialistFor(prt.code);
  const { data: rows } = usePrtGapEntries(prt.id);
  let cum = 0;
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">{cfg.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{cfg.blurb}{!hasSpecialist(prt.code) && " (generic ladder)"}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{cfg.bucketLabel}</TableHead>
            <TableHead className="text-right">{cfg.exposureLabel}</TableHead>
            <TableHead className="text-right">{cfg.offsetLabel}</TableHead>
            <TableHead className="text-right">{cfg.netLabel}</TableHead>
            {cfg.signedNet && <TableHead className="text-right">Cumulative</TableHead>}
            <TableHead className="text-right">{cfg.limitLabel}</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => {
              const net = Number(r.exposure) - Number(r.offset_amount);
              cum += net;
              const lim = r.limit_value === null ? null : Number(r.limit_value);
              const use = lim ? (Math.abs(net) / lim) * 100 : null;
              const rag = use === null ? "grey" : use > 100 ? "red" : use > 80 ? "amber" : "green";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.bucket}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.exposure).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.offset_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{net.toLocaleString()}</TableCell>
                  {cfg.signedNet && <TableCell className="text-right tabular-nums">{cum.toLocaleString()}</TableCell>}
                  <TableCell className="text-right tabular-nums">{lim?.toLocaleString() ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={ragClass(rag)}>{use !== null ? `${use.toFixed(0)}%` : "—"}</Badge></TableCell>
                </TableRow>
              );
            })}
            {!(rows ?? []).length && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No entries yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-2">Figures in {cfg.unit}.</p>
      </CardContent>
    </Card>
  );
};
