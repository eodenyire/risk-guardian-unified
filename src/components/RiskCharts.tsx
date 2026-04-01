import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RiskType } from "@/hooks/useRiskData";

interface RiskChartsProps {
  riskTypes?: RiskType[];
}

const PIE_COLORS = {
  high: "hsl(0, 72%, 51%)",
  medium: "hsl(38, 92%, 50%)",
  low: "hsl(150, 52%, 35%)",
};

const RiskCharts = ({ riskTypes }: RiskChartsProps) => {
  const barData = (riskTypes || []).slice(0, 10).map(r => ({
    name: r.name.replace(" Risk", ""),
    score: r.risk_score,
  }));

  const highCount = riskTypes?.filter(r => r.risk_level === "high" || r.risk_level === "critical").length || 0;
  const medCount = riskTypes?.filter(r => r.risk_level === "medium").length || 0;
  const lowCount = riskTypes?.filter(r => r.risk_level === "low").length || 0;

  const pieData = [
    { name: "High", value: highCount, color: PIE_COLORS.high },
    { name: "Medium", value: medCount, color: PIE_COLORS.medium },
    { name: "Low", value: lowCount, color: PIE_COLORS.low },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Risk Scores by Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 89%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 14%, 89%)",
                borderRadius: "8px",
                fontSize: "13px"
              }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {barData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.score >= 70 ? PIE_COLORS.high : entry.score >= 40 ? PIE_COLORS.medium : PIE_COLORS.low}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name} ({item.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskCharts;
