import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ShieldAlert, BarChart3, Settings2,
  FileCheck, Thermometer, Link2, Database, ChevronLeft, ChevronRight,
  Network, Target, Share2, ChevronDown, Percent, Boxes
} from "lucide-react";
import { useState } from "react";
import wekezaLogo from "@/assets/wekeza_logo.png";
import { usePrincipalRiskTypes } from "@/hooks/useRiskUniverse";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/risk-data-master", label: "Risk Data Master", icon: Boxes },
  { path: "/risk-universe", label: "Risk Universe", icon: Network },
  { path: "/risk-register", label: "Risk Register", icon: ShieldAlert },
  { path: "/kri", label: "KRI Monitor", icon: BarChart3 },
  { path: "/appetite", label: "Risk Appetite", icon: Target },
  { path: "/controls", label: "Controls", icon: Settings2 },
  { path: "/rcsa", label: "RCSA", icon: FileCheck },
  { path: "/heat-map", label: "Heat Map", icon: Thermometer },
  { path: "/contagion", label: "Contagion", icon: Share2 },
  { path: "/integrations", label: "Integrations", icon: Link2 },
  { path: "/data-sources", label: "Data Sources", icon: Database },
];

const prtPath = (code: string | null) =>
  code === "IRRBB" ? "/irrbb" : `/prt/${code ?? ""}`;

const AppSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showModules, setShowModules] = useState(true);
  const { data: prts } = usePrincipalRiskTypes();

  const financial = (prts ?? []).filter((p) => p.prt_category === "financial");
  const nonFinancial = (prts ?? []).filter((p) => p.prt_category !== "financial");

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-sidebar-accent text-shield-light"
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
    }`;

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

      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={linkClass(isActive)}>
              <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-shield" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <motion.div layoutId="sidebar-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-shield" />
              )}
            </Link>
          );
        })}

        <div className="pt-3">
          <button
            onClick={() => setShowModules((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <Percent className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span>Risk Modules</span>
                <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${showModules ? "" : "-rotate-90"}`} />
              </>
            )}
          </button>

          {showModules && !collapsed && (
            <div className="space-y-3 mt-1">
              {[
                { title: "Financial Risk", items: financial },
                { title: "Non-Financial Risk", items: nonFinancial },
              ].map((group) => (
                <div key={group.title}>
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/40">{group.title}</p>
                  {group.items.map((p) => {
                    const path = prtPath(p.code);
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={p.id}
                        to={path}
                        className={`flex items-center gap-2 pl-6 pr-3 py-2 rounded-lg text-[13px] transition-all ${
                          isActive
                            ? "bg-sidebar-accent text-shield-light"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-shield/60 flex-shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
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
