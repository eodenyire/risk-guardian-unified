import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { DataSource } from "@/hooks/useRiskData";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface IntegrationStatusProps {
  dataSources?: DataSource[];
  isLoading?: boolean;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "connected": return <CheckCircle2 className="h-4 w-4 text-secondary" />;
    case "pending": return <Clock className="h-4 w-4 text-risk-amber" />;
    case "error": return <AlertCircle className="h-4 w-4 text-risk-red" />;
    default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const IntegrationStatus = ({ dataSources, isLoading }: IntegrationStatusProps) => {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const sources = dataSources || [];

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">Integration Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Data source connections & sync status</p>
      </div>
      <div className="divide-y divide-border">
        {sources.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {statusIcon(item.integration_status)}
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.last_sync_at
                    ? `Last sync: ${formatDistanceToNow(new Date(item.last_sync_at), { addSuffix: true })}`
                    : "Not synced yet"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-semibold text-foreground">
                {item.records_synced > 0 ? item.records_synced.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-muted-foreground">records</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationStatus;
