import { motion } from "framer-motion";
import { ShieldAlert, BarChart3, Settings2, FileCheck, Thermometer, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import RiskOverviewTable from "@/components/RiskOverviewTable";
import RiskCharts from "@/components/RiskCharts";
import IntegrationStatus from "@/components/IntegrationStatus";

const Dashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Risk Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated view across 17 Principal Risk Types · Q1 2026
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard title="Total PRTs" value={17} icon={ShieldAlert} color="navy" />
        <StatCard title="High Risk" value={5} change="↑ 2 from last quarter" changeType="negative" icon={AlertTriangle} color="red" />
        <StatCard title="Active KRIs" value={142} change="98% coverage" changeType="positive" icon={BarChart3} color="green" />
        <StatCard title="Controls" value={389} change="12 pending review" changeType="neutral" icon={Settings2} color="blue" />
        <StatCard title="RCSA Completion" value="73%" change="Target: 95% by Q2" changeType="neutral" icon={FileCheck} color="amber" />
        <StatCard title="Heat Map Score" value={62} change="Medium overall" changeType="neutral" icon={Thermometer} color="navy" />
      </div>

      {/* Charts */}
      <RiskCharts />

      {/* Table + Integration */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RiskOverviewTable />
        </div>
        <IntegrationStatus />
      </div>
    </motion.div>
  );
};

export default Dashboard;
