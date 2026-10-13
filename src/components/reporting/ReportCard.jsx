import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportCard({ title, description, count, icon: Icon, onDownload, accent }) {
  return (
    <div className={cn("flex flex-col rounded-xl border p-4", accent ? "border-primary/35 bg-primary/5" : "border-border bg-surface/40")}>
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>

      <p className="mt-2.5 flex-1 text-xs leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-border pt-3.5">
        <span className="text-xs tabular-nums text-muted-foreground">
          {count} record{count === 1 ? "" : "s"}
        </span>
        <Button size="sm" variant={accent ? "default" : "outline"} onClick={onDownload} disabled={!count}>
          <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download CSV
        </Button>
      </div>
    </div>
  );
}