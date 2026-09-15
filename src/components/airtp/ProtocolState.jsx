import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Cpu, Layers, Package, Radio } from "lucide-react";
import { RuntimeState, TransportEvent } from "@/lib/airtp";

const EVENT_LABEL = {
  [TransportEvent.DELTA]: "DELTA",
  [TransportEvent.PROVIDER_DONE]: "PROVIDER_DONE",
  [TransportEvent.ERROR]: "ERROR",
  [TransportEvent.OTHER]: "OTHER",
};

const EVENT_TONE = {
  [TransportEvent.DELTA]: "text-allow",
  [TransportEvent.PROVIDER_DONE]: "text-review",
  [TransportEvent.ERROR]: "text-blocked",
  [TransportEvent.OTHER]: "text-muted-foreground",
};

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ProtocolState({ state, continuations, chunks, envelope, eventLog, running }) {
  const active = state === RuntimeState.ACTIVE;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-primary" /> AIRTP Protocol State
        </CardTitle>
        <CardDescription>Runtime state machine, segmentation, envelope contract, and transport events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${active ? "bg-review animate-pulse" : "bg-allow"}`} />
          <span className="text-sm font-semibold">{state || "IDLE"}</span>
          {running && <span className="text-xs text-muted-foreground">· transporting</span>}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Cpu className="h-3 w-3" /> Runtime
          </div>
          <Row label="Continuations" value={continuations} />
          <Row label="State" value={state || "—"} />
        </div>

        {chunks?.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Layers className="h-3 w-3" /> Logical Segmentation
            </div>
            <Row label="message_id" value={<span className="truncate">{chunks[0].message_id}</span>} />
            <Row label="total_chunks" value={chunks[0].total_chunks} />
            <Row label="chunk_size" value={`${chunks[0].data.length} bytes`} />
          </div>
        )}

        {envelope && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Package className="h-3 w-3" /> Envelope Contract
            </div>
            <Row label="protocol" value={envelope.protocol} />
            <Row label="message_type" value={envelope.message_type} />
            <Row label="message_id" value={<span className="truncate">{envelope.message_id}</span>} />
            <Row label="chunk_visibility" value={envelope.transport_contract.chunk_visibility} />
            <Row label="assembly_state" value={envelope.transport_contract.assembly_state} />
            <Row label="semantic_role" value={envelope.transport_contract.semantic_role} />
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transport Events</div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
            {eventLog.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted-foreground">No transport events yet.</div>
            ) : (
              eventLog.map((ev, i) => {
                const [kind, payload] = ev;
                return (
                  <div key={i} className="flex items-start gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className={`font-semibold ${EVENT_TONE[kind] || "text-muted-foreground"}`}>
                      {EVENT_LABEL[kind] || kind}
                    </span>
                    {payload != null && (
                      <span className="truncate text-muted-foreground">
                        {String(payload).slice(0, 80)}
                        {String(payload).length > 80 ? "…" : ""}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}