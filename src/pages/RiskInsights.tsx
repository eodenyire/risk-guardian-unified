import { useState } from "react";
import { Sparkles, Plus, Trash2, Loader2, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRiskInsights, InsightResult } from "@/hooks/useSourceOps";

interface Obs { indicator: string; value: string; date: string; notes: string }
interface Ctl { name: string; effectiveness: string; issue: string }

const sevClass = (s: string) =>
  s === "critical" || s === "high"
    ? "bg-destructive/15 text-destructive border border-destructive/30"
    : s === "medium" || s === "moderate"
      ? "bg-[hsl(var(--risk-amber))]/15 text-[hsl(var(--risk-amber))] border border-[hsl(var(--risk-amber))]/30"
      : "bg-[hsl(var(--risk-green))]/15 text-[hsl(var(--risk-green))] border border-[hsl(var(--risk-green))]/30";

const RiskInsights = () => {
  const [context, setContext] = useState("");
  const [obs, setObs] = useState<Obs[]>([{ indicator: "", value: "", date: "", notes: "" }]);
  const [ctls, setCtls] = useState<Ctl[]>([{ name: "", effectiveness: "", issue: "" }]);
  const [includeRegister, setIncludeRegister] = useState(true);
  const [result, setResult] = useState<InsightResult | null>(null);
  const run = useRiskInsights();

  const submit = () => {
    setResult(null);
    run.mutate(
      {
        context,
        observations: obs.filter((o) => o.indicator.trim()),
        controls: ctls.filter((c) => c.name.trim()),
        include_register: includeRegister,
      },
      { onSuccess: (d) => setResult(d.result) },
    );
  };

  const updObs = (i: number, k: keyof Obs, v: string) => setObs((p) => p.map((o, j) => (j === i ? { ...o, [k]: v } : o)));
  const updCtl = (i: number, k: keyof Ctl, v: string) => setCtls((p) => p.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-display font-bold">AI Risk Insights</h1>
          <p className="text-muted-foreground">Submit observations and control details to surface emerging risk patterns and ranked follow-up actions</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Context</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="e.g. Q3 review of retail lending; rising mobile fraud reports in Nairobi branches" value={context} onChange={(e) => setContext(e.target.value)} />
          <div className="flex items-center gap-2">
            <Switch id="reg" checked={includeRegister} onCheckedChange={setIncludeRegister} />
            <Label htmlFor="reg" className="text-sm">Include current KRI register and control library</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Observations</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setObs((p) => [...p, { indicator: "", value: "", date: "", notes: "" }])}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {obs.map((o, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_3fr_auto] gap-2">
              <Input placeholder="Indicator / risk" value={o.indicator} onChange={(e) => updObs(i, "indicator", e.target.value)} />
              <Input placeholder="Value" value={o.value} onChange={(e) => updObs(i, "value", e.target.value)} />
              <Input type="date" value={o.date} onChange={(e) => updObs(i, "date", e.target.value)} />
              <Input placeholder="Notes" value={o.notes} onChange={(e) => updObs(i, "notes", e.target.value)} />
              <Button size="icon" variant="ghost" onClick={() => setObs((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Control details</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCtls((p) => [...p, { name: "", effectiveness: "", issue: "" }])}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {ctls.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_3fr_auto] gap-2">
              <Input placeholder="Control" value={c.name} onChange={(e) => updCtl(i, "name", e.target.value)} />
              <Input placeholder="Effectiveness" value={c.effectiveness} onChange={(e) => updCtl(i, "effectiveness", e.target.value)} />
              <Input placeholder="Issue / test finding" value={c.issue} onChange={(e) => updCtl(i, "issue", e.target.value)} />
              <Button size="icon" variant="ghost" onClick={() => setCtls((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={submit} disabled={run.isPending}>
        {run.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {run.isPending ? "Analysing…" : "Analyse risks"}
      </Button>
      {run.isError && <p className="text-sm text-destructive">{(run.error as Error).message}</p>}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Summary</CardTitle>
              <Badge className={sevClass(result.overall_rating)}>{result.overall_rating}</Badge>
            </CardHeader>
            <CardContent><p className="text-sm">{result.summary}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Emerging patterns</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {result.patterns.map((p, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex justify-between gap-2"><p className="font-semibold text-sm">{p.title}</p><Badge className={sevClass(p.severity)}>{p.severity}</Badge></div>
                  <p className="text-xs text-muted-foreground capitalize">{p.trend} · {p.risk_types.join(", ")}</p>
                  <p className="text-sm">{p.evidence}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />Ranked follow-up actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...result.actions].sort((a, b) => a.priority - b.priority).map((a, i) => (
                <div key={i} className="flex gap-3 border rounded-lg p-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">{a.priority}</div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{a.action}</p>
                    <p className="text-xs text-muted-foreground">Owner: {a.owner} · Due in {a.due_in_days} days · {a.linked_pattern}</p>
                    <p className="text-xs">{a.rationale}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RiskInsights;
