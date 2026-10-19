import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrincipalRiskTypes, useRiskAppetite, useContagionLinks, Rag } from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";
import { buildPrtScores, scoreRag } from "@/lib/riskScore";

const ragCls: Record<Rag, string> = {
  red: "bg-risk-red/15 text-risk-red border-risk-red/30",
  amber: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  green: "bg-risk-green/15 text-risk-green border-risk-green/30",
  grey: "bg-muted text-muted-foreground border-border",
};
const ragBar: Record<Rag, string> = { red: "bg-risk-red", amber: "bg-risk-amber", green: "bg-risk-green", grey: "bg-muted-foreground" };

const prtPath = (code: string | null) => (code === "IRRBB" ? "/irrbb" : `/prt/${code ?? ""}`);

const RiskDashboard = () => {
  const { data: prts, isLoading: l1 } = usePrincipalRiskTypes();
  const { data: kris, isLoading: l2 } = useKRIs();
  const { data: appetite, isLoading: l3 } = useRiskAppetite();
  const { data: links, isLoading: l4 } = useContagionLinks();

  const scores = useMemo(
    () => buildPrtScores(prts ?? [], kris ?? [], appetite ?? [], links ?? []),
    [prts, kris, appetite, links],
  );

  if (l1 || l2 || l3 || l4) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const scored = scores.filter((s) => s.score !== null);
  const central = scored.length ? Math.round(scored.reduce((t, s) => t + (s.score ?? 0), 0) / scored.length) : null;
  const centralRag = scoreRag(central);
  const apAll = scores.flatMap((s) => s.appetite);
  const apCount = (r: Rag) => apAll.filter((x) => x.s.rag === r).length;
  const kriCount = (r: string) => (kris ?? []).filter((k) => k.status === r).length;
  const topConnected = [...scores].sort((a, b) => b.connectedness - a.connectedness).slice(0, 6);
  const groups = [
    { label: "Financial risks", list: scores.filter((s) => s.prt.prt_category === "financial") },
    { label: "Non-financial risks", list: scores.filter((s) => s.prt.prt_category !== "financial") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary"><Gauge className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-display font-bold">Risk Dashboard</h1>
          <p className="text-muted-foreground">All principal risk types in one view: central risk score, appetite and interconnectedness</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Central risk score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-display font-bold">{central ?? "—"}</span>
              <span className="text-muted-foreground mb-2">/ 100</span>
              <Badge variant="outline" className={`mb-2 capitalize ${ragCls[centralRag]}`}>{centralRag}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Average of {scored.length} PRT scores (70% indicator performance, 30% interconnectedness)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Appetite summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {([["red", "Outside appetite"], ["amber", "Approaching limit"], ["green", "Within appetite"]] as [Rag, string][]).map(([r, l]) => (
              <div key={r} className="flex justify-between items-center">
                <span className="text-sm">{l}</span>
                <Badge variant="outline" className={ragCls[r]}>{apCount(r)}</Badge>
              </div>
            ))}
            <Link to="/appetite-model" className="text-xs text-primary underline">Open appetite model</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Indicator status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(["red", "amber", "green"] as Rag[]).map((r) => (
              <div key={r} className="flex justify-between items-center">
                <span className="text-sm capitalize">{r}</span>
                <Badge variant="outline" className={ragCls[r]}>{kriCount(r)}</Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{(kris ?? []).length} indicators across {scores.length} risk types</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Principal risk types</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.list.map((s) => (
                    <Link key={s.prt.id} to={prtPath(s.prt.code)} className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-medium text-sm break-words min-w-0">{s.prt.name}</div>
                        <Badge variant="outline" className={`capitalize ${ragCls[s.rag]}`}>{s.score ?? "—"}</Badge>
                      </div>
                      <div className="h-1.5 rounded bg-muted mt-2 overflow-hidden">
                        <div className={`h-full ${ragBar[s.rag]}`} style={{ width: `${s.score ?? 0}%` }} />
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{s.kris.length} KRIs</span>
                        <span>Appetite: <span className="capitalize">{s.appetiteRag === "grey" ? "n/a" : s.appetiteRag}</span></span>
                        <span>Links {s.connectedness}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Interconnectedness overview</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Risk type</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {topConnected.map((s) => (
                  <TableRow key={s.prt.id}>
                    <TableCell className="text-sm">{s.prt.name}</TableCell>
                    <TableCell className="text-right font-mono">{s.connectedness}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">Most systemically connected risk types, by combined inbound and outbound transmission strength.</p>
            <Link to="/contagion" className="text-xs text-primary underline">Open contagion model</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskDashboard;
