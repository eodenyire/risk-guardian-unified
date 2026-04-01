import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const ModulePage = ({ title, description, icon: Icon }: ModulePageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1600px] mx-auto"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-navy">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border p-12 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-2xl bg-muted mb-4">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="font-display font-semibold text-lg text-foreground mb-2">Module Under Development</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          This module will be populated with live data from integrated sources including SmartSheets, ServiceNow GRC, and internal file systems.
        </p>
      </div>
    </motion.div>
  );
};

export default ModulePage;
