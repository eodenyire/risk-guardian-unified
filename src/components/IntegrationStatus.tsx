import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

const integrations = [
  { name: "SmartSheets", status: "connected", lastSync: "2 min ago", records: "1,247" },
  { name: "ServiceNow GRC", status: "connected", lastSync: "5 min ago", records: "3,892" },
  { name: "Power BI", status: "connected", lastSync: "12 min ago", records: "8,451" },
  { name: "SharePoint", status: "pending", lastSync: "—", records: "—" },
  { name: "OneDrive", status: "pending", lastSync: "—", records: "—" },
  { name: "Internal File Server", status: "disconnected", lastSync: "—", records: "—" },
];

const statusIcon = (status: string) => {
  switch (status) {
    case "connected": return <CheckCircle2 className="h-4 w-4 text-secondary" />;
    case "pending": return <Clock className="h-4 w-4 text-risk-amber" />;
    case "error": return <AlertCircle className="h-4 w-4 text-risk-red" />;
    default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const IntegrationStatus = () => {
  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">Integration Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Data source connections & sync status</p>
      </div>
      <div className="divide-y divide-border">
        {integrations.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {statusIcon(item.status)}
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">Last sync: {item.lastSync}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-semibold text-foreground">{item.records}</p>
              <p className="text-xs text-muted-foreground">records</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationStatus;
