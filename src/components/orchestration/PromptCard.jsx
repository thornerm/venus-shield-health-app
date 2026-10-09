import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Lock, Cpu, Play, Workflow } from "lucide-react";
import SourceBadge from "./SourceBadge";

export default function PromptCard({ prompt }) {
  const secrets = prompt.required_secrets || [];
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{prompt.name}</CardTitle>
          <SourceBadge source={prompt.source} />
        </div>
        <CardDescription className="line-clamp-2">
          {prompt.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {prompt.category && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{prompt.category}</span>
          </div>
        )}
        {prompt.agent_type && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            <span>{prompt.agent_type}</span>
          </div>
        )}
        {prompt.orchestrator_workflow && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Workflow className="h-3.5 w-3.5" />
            <span className="truncate font-mono">{prompt.orchestrator_workflow}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>{secrets.length} secret(s) required</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" className="w-full">
          <Link to={`/orchestration/run/${prompt.id}`}>
            <Play className="h-3.5 w-3.5" /> Run Job
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}