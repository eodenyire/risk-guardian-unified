import { motion } from "framer-motion";
import { RiskType } from "@/hooks/useRiskData";
import { Skeleton } from "@/components/ui/skeleton";

interface RiskOverviewTableProps {
  riskTypes?: RiskType[];
  isLoading?: boolean;
}

const levelColor = (level: string) => {
  switch (level) {
    case "high":
    case "critical": return "text-risk-red bg-risk-red/10";
    case "medium": return "text-risk-amber bg-risk-amber/10";
    case "low": return "text-secondary bg-secondary/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const barColor = (score: number) => {
  if (score >= 70) return "bg-risk-red";
  if (score >= 40) return "bg-risk-amber";
  return "bg-secondary";
};

const trendSymbol = (trend: string) => {
  switch (trend) {
    case "increasing": return "↑";
    case "decreasing": return "↓";
    default: return "→";
  }
};

const RiskOverviewTable = ({ riskTypes, isLoading }: RiskOverviewTableProps) => {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const risks = riskTypes || [];

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">{risks.length} Principal Risk Types</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Live data from Lovable Cloud database</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Level</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Indicator</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trend</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk, i) => (
              <motion.tr
                key={risk.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-foreground">{risk.name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${levelColor(risk.risk_level)}`}>
                    {risk.risk_level}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-semibold text-foreground">{risk.risk_score}</td>
                <td className="px-5 py-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${risk.risk_score}%` }}
                      transition={{ duration: 0.8, delay: i * 0.03 }}
                      className={`h-2 rounded-full ${barColor(risk.risk_score)}`}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-center text-lg">{trendSymbol(risk.trend)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskOverviewTable;
