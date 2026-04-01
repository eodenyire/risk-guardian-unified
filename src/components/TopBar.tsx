import { Bell, Search, User } from "lucide-react";

const TopBar = () => {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Risk Intelligence Platform</h1>
        <p className="text-xs text-muted-foreground">Risk & Compliance Department</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search risks, controls, KRIs..."
            className="pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-none outline-none focus:ring-2 focus:ring-ring w-72 placeholder:text-muted-foreground"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-risk-red rounded-full" />
        </button>

        <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
