import { motion } from "framer-motion";

const riskTypes = [
  { name: "Fraud Risk", level: "High", score: 78, trend: "↑" },
  { name: "Technology Risk", level: "Medium", score: 55, trend: "→" },
  { name: "Country Risk", level: "Low", score: 32, trend: "↓" },
  { name: "Conduct Risk", level: "High", score: 82, trend: "↑" },
  { name: "ESG Risk", level: "Medium", score: 48, trend: "→" },
  { name: "Compliance Risk", level: "Medium", score: 61, trend: "↑" },
  { name: "Model Risk", level: "Low", score: 29, trend: "↓" },
  { name: "Credit Risk", level: "High", score: 74, trend: "→" },
  { name: "Market Risk", level: "Medium", score: 52, trend: "↓" },
  { name: "Operational Risk", level: "High", score: 71, trend: "↑" },
  { name: "Liquidity Risk", level: "Low", score: 25, trend: "↓" },
  { name: "Reputational Risk", level: "Medium", score: 58, trend: "→" },
  { name: "Strategic Risk", level: "Medium", score: 45, trend: "→" },
  { name: "Legal Risk", level: "Low", score: 34, trend: "↓" },
  { name: "Cyber Risk", level: "High", score: 85, trend: "↑" },
  { name: "Third Party Risk", level: "Medium", score: 62, trend: "↑" },
  { name: "Data Privacy Risk", level: "Medium", score: 57, trend: "→" },
];

const levelColor = (level: string) => {
  switch (level) {
    case "High": return "text-risk-red bg-risk-red/10";
    case "Medium": return "text-risk-amber bg-risk-amber/10";
    case "Low": return "text-secondary bg-secondary/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const barColor = (score: number) => {
  if (score >= 70) return "bg-risk-red";
  if (score >= 40) return "bg-risk-amber";
  return "bg-secondary";
};

const RiskOverviewTable = () => {
  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">17 Principal Risk Types</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Aggregated risk scores across all data sources</p>
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
            {riskTypes.map((risk, i) => (
              <motion.tr
                key={risk.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-foreground">{risk.name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${levelColor(risk.level)}`}>
                    {risk.level}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-semibold text-foreground">{risk.score}</td>
                <td className="px-5 py-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${risk.score}%` }}
                      transition={{ duration: 0.8, delay: i * 0.03 }}
                      className={`h-2 rounded-full ${barColor(risk.score)}`}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-center text-lg">{risk.trend}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskOverviewTable;
