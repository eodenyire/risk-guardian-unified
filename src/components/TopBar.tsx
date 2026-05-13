import { Bell, Search, User, LogOut, Settings as SettingsIcon, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization, useProfile } from "@/hooks/useOrganization";

const TopBar = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Risk Intelligence Platform</h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {org ? <><Building2 className="h-3 w-3" />{org.name}</> : "Risk & Compliance Department"}
        </p>
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

        <DropdownMenu>
          <DropdownMenuTrigger className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-primary-foreground text-xs font-semibold hover:opacity-90">
            {initials || <User className="h-4 w-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-semibold">{profile?.full_name || "Account"}</div>
              <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings"><SettingsIcon className="h-4 w-4 mr-2" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
