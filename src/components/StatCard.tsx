import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  color: "navy" | "green" | "amber" | "red" | "blue";
}

const colorMap = {
  navy: "bg-navy text-primary-foreground",
  green: "bg-secondary text-secondary-foreground",
  amber: "bg-risk-amber text-foreground",
  red: "bg-risk-red text-primary-foreground",
  blue: "bg-risk-blue text-primary-foreground",
};

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon, color }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow border border-border"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-2 font-medium ${
              changeType === "positive" ? "text-secondary" :
              changeType === "negative" ? "text-risk-red" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
