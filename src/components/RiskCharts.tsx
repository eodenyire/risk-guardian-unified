import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const barData = [
  { name: "Fraud", score: 78 },
  { name: "Tech", score: 55 },
  { name: "Conduct", score: 82 },
  { name: "ESG", score: 48 },
  { name: "Compliance", score: 61 },
  { name: "Model", score: 29 },
  { name: "Cyber", score: 85 },
  { name: "3rd Party", score: 62 },
];

const pieData = [
  { name: "High", value: 5, color: "hsl(0, 72%, 51%)" },
  { name: "Medium", value: 7, color: "hsl(38, 92%, 50%)" },
  { name: "Low", value: 5, color: "hsl(150, 52%, 35%)" },
];

const RiskCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Risk Scores by Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 89%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
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
                  fill={entry.score >= 70 ? "hsl(0, 72%, 51%)" : entry.score >= 40 ? "hsl(38, 92%, 50%)" : "hsl(150, 52%, 35%)"}
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
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
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
