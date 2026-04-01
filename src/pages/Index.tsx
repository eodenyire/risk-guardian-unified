import { motion } from "framer-motion";
import { ShieldAlert, BarChart3, Settings2, FileCheck, Thermometer, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import RiskOverviewTable from "@/components/RiskOverviewTable";
import RiskCharts from "@/components/RiskCharts";
import IntegrationStatus from "@/components/IntegrationStatus";
import { useRiskTypes, useDataSources } from "@/hooks/useRiskData";

const Dashboard = () => {
  const { data: riskTypes, isLoading: risksLoading } = useRiskTypes();
  const { data: dataSources, isLoading: sourcesLoading } = useDataSources();

  const highCount = riskTypes?.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length || 0;
  const totalKRIs = 142; // Will come from KRI table once populated
  const totalControls = 389; // Will come from controls table once populated

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Risk Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated view across {riskTypes?.length || 17} Principal Risk Types · Q1 2026
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard title="Total PRTs" value={riskTypes?.length || 17} icon={ShieldAlert} color="navy" />
        <StatCard title="High Risk" value={highCount} change="↑ 2 from last quarter" changeType="negative" icon={AlertTriangle} color="red" />
        <StatCard title="Active KRIs" value={totalKRIs} change="98% coverage" changeType="positive" icon={BarChart3} color="green" />
        <StatCard title="Controls" value={totalControls} change="12 pending review" changeType="neutral" icon={Settings2} color="blue" />
        <StatCard title="RCSA Completion" value="73%" change="Target: 95% by Q2" changeType="neutral" icon={FileCheck} color="amber" />
        <StatCard title="Avg Risk Score" value={riskTypes ? Math.round(riskTypes.reduce((s, r) => s + r.risk_score, 0) / riskTypes.length) : 62} icon={Thermometer} color="navy" />
      </div>

      <RiskCharts riskTypes={riskTypes} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RiskOverviewTable riskTypes={riskTypes} isLoading={risksLoading} />
        </div>
        <IntegrationStatus dataSources={dataSources} isLoading={sourcesLoading} />
      </div>
    </motion.div>
  );
};

export default Dashboard;
