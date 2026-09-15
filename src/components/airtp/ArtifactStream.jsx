import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal } from "lucide-react";

export default function ArtifactStream({ artifact, running, decision }) {
  const empty = !artifact;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4 text-primary" /> Artifact Delivery
        </CardTitle>
        <CardDescription>Logical segments delivered to the Requester in order.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full min-h-[260px] overflow-auto rounded-md border border-border bg-slate-950 p-4">
          {empty ? (
            <div className="flex h-full min-h-[220px] items-center justify-center text-center text-xs text-slate-500">
              {decision && decision !== "allow"
                ? `Runtime halted by governance verdict: ${decision}.`
                : "Governed artifact will stream here once the session is allowed and executed."}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-100">
              {artifact}
              {running && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-slate-100 align-middle" />}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}