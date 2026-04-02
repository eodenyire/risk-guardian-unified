import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Thermometer, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskTypes } from "@/hooks/useRiskData";
import { useRiskRegister } from "@/hooks/useRiskRegister";

const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["", "Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];

const getCellColor = (score: number) => {
  if (score >= 20) return "bg-destructive/90 hover:bg-destructive";
  if (score >= 15) return "bg-[hsl(var(--risk-red))]/80 hover:bg-[hsl(var(--risk-red))]";
  if (score >= 10) return "bg-[hsl(var(--risk-amber))]/80 hover:bg-[hsl(var(--risk-amber))]";
  if (score >= 5) return "bg-[hsl(var(--risk-amber))]/40 hover:bg-[hsl(var(--risk-amber))]/60";
  return "bg-[hsl(var(--risk-green))]/40 hover:bg-[hsl(var(--risk-green))]/60";
};

const getCellTextColor = (score: number) => {
  if (score >= 10) return "text-white";
  return "text-foreground";
};

interface PlacedRisk {
  id: string;
  name: string;
  category: string | null;
  likelihood: number;
  impact: number;
  risk_level: string;
  risk_score: number;
  entryCount: number;
}

const HeatMap = () => {
  const { data: riskTypes, isLoading: riskLoading } = useRiskTypes();
  const { data: entries, isLoading: entriesLoading } = useRiskRegister();
  const [filterCategory, setFilterCategory] = useState("all");

  const isLoading = riskLoading || entriesLoading;

  // Compute average likelihood/impact per PRT from register entries, fallback to risk_score-derived values
  const placedRisks = useMemo(() => {
    if (!riskTypes) return [];
    return riskTypes.map((rt): PlacedRisk => {
      const riskEntries = entries?.filter((e) => e.risk_type_id === rt.id) || [];
      let likelihood: number;
      let impact: number;
      if (riskEntries.length > 0) {
        likelihood = Math.round(riskEntries.reduce((s, e) => s + e.likelihood, 0) / riskEntries.length);
        impact = Math.round(riskEntries.reduce((s, e) => s + e.impact, 0) / riskEntries.length);
      } else {
        // Derive from risk_score (0-100) → 5x5 grid
        const normalized = Math.min(rt.risk_score, 100) / 100;
        likelihood = Math.max(1, Math.min(5, Math.round(normalized * 5)));
        impact = Math.max(1, Math.min(5, Math.round(normalized * 5)));
      }
      return { id: rt.id, name: rt.name, category: rt.category, likelihood, impact, risk_level: rt.risk_level, risk_score: rt.risk_score, entryCount: riskEntries.length };
    });
  }, [riskTypes, entries]);

  const categories = useMemo(() => [...new Set(riskTypes?.map((r) => r.category).filter(Boolean) || [])], [riskTypes]);

  const filtered = useMemo(() => {
    if (filterCategory === "all") return placedRisks;
    return placedRisks.filter((r) => r.category === filterCategory);
  }, [placedRisks, filterCategory]);

  // Build grid: grid[likelihood][impact] = risks[]
  const grid = useMemo(() => {
    const g: Record<string, PlacedRisk[]> = {};
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        g[`${l}-${i}`] = [];
      }
    }
    filtered.forEach((r) => {
      const key = `${r.likelihood}-${r.impact}`;
      if (g[key]) g[key].push(r);
    });
    return g;
  }, [filtered]);

  const levelBadge = (level: string) => {
    const colors: Record<string, string> = {
      critical: "bg-destructive text-destructive-foreground",
      high: "bg-[hsl(var(--risk-red))] text-white",
      medium: "bg-[hsl(var(--risk-amber))] text-white",
      low: "bg-[hsl(var(--risk-green))] text-white",
    };
    return <Badge className={`text-[10px] px-1.5 py-0 ${colors[level] || ""}`}>{level}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-primary" /> Risk Heat Map
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Impact vs. Likelihood matrix across all 17 Principal Risk Types</p>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-muted-foreground">Risk Score:</span>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-[hsl(var(--risk-green))]/40" /> 1-4</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-[hsl(var(--risk-amber))]/40" /> 5-9</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-[hsl(var(--risk-amber))]/80" /> 10-14</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-[hsl(var(--risk-red))]/80" /> 15-19</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-destructive/90" /> 20-25</div>
            <span className="ml-auto text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Hover cells for details</span>
          </div>
        </CardContent>
      </Card>

      {/* Heat Map Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{filtered.length} PRTs Plotted</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="min-w-[500px]">
              {/* Column headers (Impact) */}
              <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
                <div className="text-xs text-muted-foreground text-center" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                    <div>{IMPACT_LABELS[i]}</div>
                    <div className="text-[10px] opacity-70">Impact {i}</div>
                  </div>
                ))}
              </div>

              {/* Rows (Likelihood 5→1, top to bottom) */}
              {[5, 4, 3, 2, 1].map((l) => (
                <div key={l} className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
                  <div className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground">
                    <div>{LIKELIHOOD_LABELS[l]}</div>
                    <div className="text-[10px] opacity-70">L{l}</div>
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const cellScore = l * i;
                    const cellRisks = grid[`${l}-${i}`] || [];
                    return (
                      <div
                        key={i}
                        className={`relative rounded-lg p-2 min-h-[80px] transition-colors cursor-default ${getCellColor(cellScore)} ${getCellTextColor(cellScore)}`}
                      >
                        <div className="absolute top-1 right-1.5 text-[10px] font-mono opacity-60">{cellScore}</div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {cellRisks.map((r) => (
                            <Tooltip key={r.id}>
                              <TooltipTrigger asChild>
                                <div className="bg-background/90 text-foreground rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight cursor-pointer hover:bg-background shadow-sm max-w-[100px] truncate">
                                  {r.name.replace(" Risk", "")}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <div className="space-y-1">
                                  <p className="font-semibold text-sm">{r.name}</p>
                                  <p className="text-xs text-muted-foreground">{r.category}</p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span>Level: {levelBadge(r.risk_level)}</span>
                                  </div>
                                  <p className="text-xs">Score: {r.risk_score}/100 · Entries: {r.entryCount}</p>
                                  <p className="text-xs">L={r.likelihood} × I={r.impact} = {r.likelihood * r.impact}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Axis labels */}
              <div className="grid grid-cols-[80px_1fr] mt-2">
                <div />
                <div className="text-center text-xs font-semibold text-muted-foreground tracking-wider">IMPACT →</div>
              </div>
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-muted-foreground tracking-wider hidden lg:block">
                LIKELIHOOD →
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">PRT Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">L{r.likelihood} × I{r.impact} = {r.likelihood * r.impact} · {r.entryCount} entries</p>
                </div>
                {levelBadge(r.risk_level)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HeatMap;
