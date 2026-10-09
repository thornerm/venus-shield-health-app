import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shield, Menu, LayoutDashboard, ShieldCheck, ScanSearch, ClipboardCheck, ScrollText, UserPlus, Scale, TrendingUp, Settings, FileDown, Radio, Package, History, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { roleLabel } from "@/lib/identity";

const NAV = [
  { to: "/register", label: "Register Agent", icon: UserPlus },
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/passports", label: "Agent Passports", icon: ShieldCheck },
  { to: "/evaluate", label: "Evaluate Action", icon: ScanSearch },
  { to: "/airtp", label: "AIRTP Session", icon: Radio },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
  { to: "/policy-manager", label: "Policy Manager", icon: Scale },
  { to: "/agent-performance", label: "Agent Performance", icon: TrendingUp },
  { to: "/report-export", label: "Report Export", icon: FileDown },
  { to: "/account-settings", label: "Account Settings", icon: Settings },
];

const ORCH_NAV = [
  { to: "/orchestration", label: "Prompt Catalog", icon: Package, end: true },
  { to: "/orchestration/history", label: "Executions", icon: History },
  { to: "/orchestration/setup", label: "Customer Setup", icon: Settings2 },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Shield className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-heading text-base font-bold tracking-tight">Venus Shield</div>
        <div className="text-[11px] text-muted-foreground">AI Agent Governance</div>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function NavList({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((item) => (
        <div key={item.to} onClick={onNavigate}>
          <NavItem {...item} />
        </div>
      ))}
      <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        VenusAI Orchestration
      </div>
      {ORCH_NAV.map((item) => (
        <div key={item.to} onClick={onNavigate}>
          <NavItem {...item} />
        </div>
      ))}
    </nav>
  );
}

function Footer() {
  const { user } = useAuth();
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-md bg-muted/50 px-3 py-2">
        <div className="text-xs font-medium text-foreground">{user?.full_name || "—"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{user?.email || "—"}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{roleLabel(user?.role)}</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
          <Brand />
          <NavList />
          <Footer />
        </aside>

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-heading text-sm font-bold">Venus Shield</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col">
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
                <Footer />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="lg:pl-60">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}