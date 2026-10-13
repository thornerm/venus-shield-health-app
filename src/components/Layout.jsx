import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSidebar from "@/components/layout/AppSidebar";
import TopBar from "@/components/layout/TopBar";
import SkeletonRows from "@/components/SkeletonRows";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "venusShield.sidebarCollapsed";
// Below this width the navigation rail collapses on its own so content keeps its room.
const NARROW_QUERY = "(max-width: 1279px)";

export default function Layout() {
  const { isAuthenticated, authChecked, navigateToLogin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  const [narrow, setNarrow] = useState(() => {
    try { return window.matchMedia(NARROW_QUERY).matches; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Layout-level guard: every screen inside this shell requires a signed-in user.
  useEffect(() => {
    if (authChecked && !isAuthenticated) navigateToLogin();
  }, [authChecked, isAuthenticated, navigateToLogin]);

  const railCollapsed = collapsed || narrow;

  // Redirecting to login — don't flash an empty frame.
  if (authChecked && !isAuthenticated) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        {/* Desktop navigation */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border transition-[width] duration-200 ease-out lg:block",
            railCollapsed ? "w-[78px]" : "w-64"
          )}
        >
          <AppSidebar collapsed={railCollapsed} onToggle={narrow ? undefined : () => setCollapsed((c) => !c)} />
        </aside>

        <div className={cn("transition-[padding] duration-200 ease-out", railCollapsed ? "lg:pl-[78px]" : "lg:pl-64")}>
          <TopBar onOpenMenu={() => setDrawerOpen(true)} />
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* The shell — navigation included — stays mounted while a screen resolves. */}
            {!authChecked ? <SkeletonRows rows={6} className="vs-card p-5" /> : <Outlet />}
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