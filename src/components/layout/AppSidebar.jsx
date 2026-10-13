import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Bot, ClipboardCheck, Scale, Plug, ScrollText, TrendingUp,
  FileDown, UserPlus, ScanSearch, Radio, Package, History, Settings2,
  Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import VenusShieldLogo from "@/components/brand/VenusShieldLogo";
import { cn } from "@/lib/utils";

// Every entry maps to an existing application route. Nothing is listed here
// without a working screen behind it.
const GROUPS = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/passports", label: "AI Agents", icon: Bot },
      { to: "/approvals", label: "Action Review", icon: ClipboardCheck },
      { to: "/policy-manager", label: "Policies", icon: Scale },
      { to: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/register", label: "Register Agent", icon: UserPlus },
      { to: "/evaluate", label: "Evaluate Action", icon: ScanSearch },
      { to: "/airtp", label: "AIRTP Session", icon: Radio },
    ],
  },
  {
    label: "Oversight",
    items: [
      { to: "/audit", label: "Audit Trail", icon: ScrollText },
      { to: "/agent-performance", label: "Analytics", icon: TrendingUp },
      { to: "/report-export", label: "Reporting", icon: FileDown },
    ],
  },
  {
    label: "VenusAI Orchestration",
    items: [
      { to: "/orchestration", label: "Prompt Catalog", icon: Package, end: true },
      { to: "/orchestration/history", label: "Executions", icon: History },
      { to: "/orchestration/setup", label: "Customer Setup", icon: Settings2 },
    ],
  },
  {
    items: [{ to: "/account-settings", label: "Settings", icon: SettingsIcon }],
  },
];

function NavItem({ to, label, icon: Icon, end, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-md py-2 text-[13px] font-medium transition-colors duration-200",
          collapsed ? "justify-center px-2" : "px-3",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity duration-200",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function AppSidebar({ collapsed = false, onToggle, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-4")}>
        <VenusShieldLogo size="md" showWordmark={!collapsed} />
      </div>

      <nav className="vs-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((group, gi) => (
          <div key={group.label || gi} className="space-y-1">
            {group.label && !collapsed && <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">{group.label}</div>}
            {group.label && collapsed && <div className="mx-2 mb-2 border-t border-sidebar-border" />}
            {group.items.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {onToggle ? (
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className={cn(
              "flex w-full items-center gap-3 rounded-md py-2 text-[12px] font-medium text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" /> : <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        ) : (
          <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">Control Before Action</div>
        )}
      </div>
    </div>
  );
}