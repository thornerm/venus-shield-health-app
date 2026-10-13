import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import VenusShieldLogo from "@/components/brand/VenusShieldLogo";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import UserMenu from "@/components/layout/UserMenu";
import { useAuth } from "@/lib/AuthContext";

export default function TopBar({ onOpenMenu }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search reuses the AI Agents search — it hands the term to the existing screen.
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/passports?q=${encodeURIComponent(term)}` : "/passports");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden">
          <VenusShieldLogo size="sm" showWordmark={false} />
        </div>

        <form onSubmit={submit} className="relative hidden md:block md:w-72 lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          {user?.organization_name && (
            <span className="hidden max-w-[180px] truncate rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground xl:inline-block">
              {user.organization_name}
            </span>
          )}
          <NotificationsMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}