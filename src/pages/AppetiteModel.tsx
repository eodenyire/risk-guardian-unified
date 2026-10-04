import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrincipalRiskTypes, useRiskAppetite, useContagionLinks, Rag } from "@/hooks/useRiskUniverse";
import { useKRIs } from "@/hooks/useKRI";
import { buildPrtScores, reviewState, ReviewState } from "@/lib/riskScore";
import { UTILISATION_BANDS } from "@/lib/appetite";

const ragCls: Record<Rag, string> = {
  red: "bg-risk-red/15 text-risk-red border-risk-red/30",
  amber: "bg-risk-amber/15 text-risk-amber border-risk-amber/30",
  green: "bg-risk-green/15 text-risk-green border-risk-green/30",
  grey: "bg-muted text-muted-foreground border-border",
};
const reviewCls: Record<ReviewState, string> = {
  overdue: ragCls.red, due_soon: ragCls.amber, current: ragCls.green, unscheduled: ragCls.grey,
};
const reviewLabel: Record<ReviewState, string> = {
  overdue: "Overdue", due_soon: "Due within 30 days", current: "Current", unscheduled: "Not scheduled",
};
const LEVELS = ["averse", "low", "moderate", "open", "hungry"];

const AppetiteModel = () => {
  const { data: prts, isLoading: l1 } = usePrincipalRiskTypes();
  const { data: kris, isLoading: l2 } = useKRIs();
  const { data: appetite, isLoading: l3 } = useRiskAppetite();
  const { data: links } = useContagionLinks();

  const scores = useMemo(
    () => buildPrtScores(prts ?? [], (kris ?? []) as never, appetite ?? [], links ?? []),
    [prts, kris, appetite, links],
  );

  if (l1 || l2 || l3) return <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  const all = scores.flatMap((s) => s.appetite.map((x) => ({ ...x, prt: s.prt })));
  const reviews = (r: ReviewState) => all.filter((x) => reviewState(x.a.next_review_date) === r).length;
  const cell = (level: string, band: number) =>
    all.filter((x) => x.a.appetite_level === level && x.s.band === band);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary"><Target className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-display font-bold">Appetite Model</h1>
          <p className="text-muted-foreground">Appetite level per risk type, the indicators driving it, risk vs appetite and the review cycle</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {(["overdue", "due_soon", "current", "unscheduled"] as ReviewState[]).map((r) => (
          <Card key={r}><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Reviews: {reviewLabel[r]}</p>
            <p className="text-3xl font-display font-bold">{reviews(r)}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Appetite by risk type</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Risk type</TableHead><TableHead>Appetite level</TableHead><TableHead>Appetite drivers</TableHead>
              <TableHead>Tolerance used</TableHead><TableHead>Status</TableHead><TableHead>Next review</TableHead><TableHead>Review status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {scores.map((s) => {
                const main = [...s.appetite].sort((x, y) => (y.s.utilisation ?? -1) - (x.s.utilisation ?? -1))[0];
                const drivers = [...s.kris].sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.status] - { red: 0, amber: 1, green: 2 }[b.status])).slice(0, 3);
                const rs = reviewState(main?.a.next_review_date ?? null);
                return (
                  <TableRow key={s.prt.id}>
                    <TableCell className="font-medium"><Link to={s.prt.code === "IRRBB" ? "/irrbb" : `/prt/${s.prt.code}`} className="hover:underline">{s.prt.name}</Link></TableCell>
                    <TableCell className="capitalize">{main?.a.appetite_level ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[320px]">
                        {drivers.length ? drivers.map((k) => (
                          <Badge key={k.id} variant="outline" className={`text-xs ${ragCls[k.status as Rag]}`}>{k.name}</Badge>
                        )) : <span className="text-xs text-muted-foreground">No indicators</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{main?.s.utilisation != null ? `${Math.round(main.s.utilisation)}%` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize ${ragCls[s.appetiteRag]}`}>{s.appetiteRag === "grey" ? "n/a" : s.appetiteRag}</Badge></TableCell>
                    <TableCell className="text-sm">{main?.a.next_review_date ? format(new Date(main.a.next_review_date), "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>{main ? <Badge variant="outline" className={reviewCls[rs]}>{reviewLabel[rs]}</Badge> : <span className="text-xs text-muted-foreground">No statement</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">Edit statements, levels and review dates on the <Link to="/appetite" className="text-primary underline">Risk Appetite</Link> page.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appetite vs risk heat map</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${UTILISATION_BANDS.length}, minmax(90px,1fr))` }}>
            <div />
            {UTILISATION_BANDS.map((b) => <div key={b.label} className="text-xs text-center text-muted-foreground">{b.label}</div>)}
            {LEVELS.map((lv) => (
              <>
                <div key={lv} className="text-sm capitalize flex items-center">{lv}</div>
                {UTILISATION_BANDS.map((_, bi) => {
                  const items = cell(lv, bi);
                  const tone = bi >= 4 || (bi >= 2 && ["averse", "low"].includes(lv)) ? "red" : bi >= 2 || (bi >= 1 && lv === "averse") ? "amber" : "green";
                  return (
                    <div key={lv + bi} title={items.map((x) => x.prt.name).join(", ")}
                      className={`rounded-md border min-h-[56px] p-1 text-xs ${ragCls[tone as Rag]}`}>
                      <div className="font-bold">{items.length || ""}</div>
                      <div className="line-clamp-2">{items.map((x) => x.prt.code).join(" · ")}</div>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Rows: approved appetite level. Columns: share of tolerance limit consumed by the worst live indicator.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppetiteModel;
