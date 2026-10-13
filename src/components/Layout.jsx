import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSidebar from "@/components/layout/AppSidebar";
import TopBar from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "venusShield.sidebarCollapsed";

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        {/* Desktop navigation */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border transition-[width] duration-200 ease-out lg:block",
            collapsed ? "w-[78px]" : "w-64"
          )}
        >
          <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </aside>

        <div className={cn("transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-[78px]" : "lg:pl-64")}>
          <TopBar onOpenMenu={() => setDrawerOpen(true)} />
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>

        {/* Mobile / tablet drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}