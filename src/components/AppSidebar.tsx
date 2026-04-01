import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ShieldAlert, BarChart3, Settings2,
  FileCheck, Thermometer, Link2, Database, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";
import wekezaLogo from "@/assets/wekeza_logo.png";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/risk-register", label: "Risk Register", icon: ShieldAlert },
  { path: "/kri", label: "KRI Monitor", icon: BarChart3 },
  { path: "/controls", label: "Controls", icon: Settings2 },
  { path: "/rcsa", label: "RCSA", icon: FileCheck },
  { path: "/heat-map", label: "Heat Map", icon: Thermometer },
  { path: "/integrations", label: "Integrations", icon: Link2 },
  { path: "/data-sources", label: "Data Sources", icon: Database },
];

const AppSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-navy-deep sticky top-0 flex flex-col border-r border-sidebar-border overflow-hidden"
    >
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={wekezaLogo} alt="Wekeza Bank" className="h-10 w-auto flex-shrink-0" />
      </div>

      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs font-medium text-shield-light tracking-widest uppercase">
            Risk Intelligence
          </p>
        </div>
      )}

      <nav className="flex-1 py-3 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? "bg-sidebar-accent text-shield-light"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-shield" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-shield"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors flex justify-center"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
};

export default AppSidebar;
