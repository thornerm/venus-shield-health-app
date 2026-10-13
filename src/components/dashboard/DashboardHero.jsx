import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { VENUS_SHIELD_LOGO } from "@/components/brand/VenusShieldLogo";

export default function DashboardHero({ onRefresh, loading }) {
  return (
    <section className="vs-hero relative overflow-hidden rounded-xl border border-border px-6 py-8 sm:px-8 sm:py-10">
      <Image
        src={VENUS_SHIELD_LOGO}
        alt=""
        fittingType="fit"
        className="pointer-events-none absolute -right-6 -top-10 h-48 w-48 opacity-[0.08] sm:h-60 sm:w-60"
      />
      <div className="relative max-w-2xl">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">AI Agent Governance</div>
        <h1 className="mt-2.5 font-display text-[30px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[36px]">
          Your AI. Governed.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Monitor AI agent activity, enforce policies, and maintain control before actions happen.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm"><Link to="/approvals">Action Review</Link></Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}