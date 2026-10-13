import { Link } from "react-router-dom";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { roleLabel } from "@/lib/identity";

function initials(name) {
  if (!name) return "—";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
}

export default function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border pl-1 pr-2.5 transition-colors duration-200 hover:bg-accent"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-primary/15 text-[11px] font-bold text-primary">
            {initials(user?.full_name || user?.email)}
          </span>
          <span className="hidden max-w-[130px] truncate text-xs font-medium text-foreground sm:inline">
            {user?.full_name || user?.email || "Account"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-border bg-popover">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-semibold text-foreground">{user?.full_name || user?.email || "Account"}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email || "—"}</div>
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
            {roleLabel(user?.role)}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/account-settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-blocked focus:text-blocked">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}