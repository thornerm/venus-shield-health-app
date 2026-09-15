import { base44 } from "@/api/base44Client";

// ============================================================
// AIRTP — AAIRTP Intelligent Reliable Transport Protocol
// JavaScript port. Provider backed by the app's built-in LLM
// (InvokeLLM) instead of a raw realtime WebSocket.
// ============================================================

export const AIRTP_VERSION = "AIRTP/0.1";
export const DEFAULT_CHUNK_SIZE = 4096;
export const SENTINEL = "<>END<>";
export const MAX_CONTINUATIONS = 8;

export const RuntimeState = { ACTIVE: "ACTIVE", COMPLETED: "COMPLETED" };

export const TransportEvent = {
  DELTA: "DELTA",
  PROVIDER_DONE: "PROVIDER_DONE",
  ERROR: "ERROR",
  OTHER: "OTHER",
};

export const AIRTP_CONTRACT = `AIRTP Contract v0.4
Entities: Requester, AIRTP Runtime, Semantic Layer

--------------------------------------------------------
AIRTP Runtime
--------------------------------------------------------

Initialization: Initialize Runtime, create State Machine (Runtime State = ACTIVE), acquire transport, bind Semantic Layer and Requester, begin artifact delivery.

Runtime State Machine: While ACTIVE: request continuation, receive provider output, deliver bytes to Requester. On provider output termination: test for completion. If sentinel emitted: transition to COMPLETED. Otherwise: remain ACTIVE, request next transport operation. Deliver logical segments in exact order, treat each as opaque, inspect only for sentinel. Never regenerate, summarize, or modify semantic output. Continue until all segments delivered and sentinel reached.

Transport Responsibilities: Segmentation, continuation requests, retries, reassembly, integrity verification, provider negotiation, rate limiting, context management. Conceal from Semantic Layer, preserve logical segment ordering.

Execution State: Provider limitations = transport events. Output exhaustion, termination, token limits do not mean completion. Always remain ACTIVE unless sentinel reached. Continuation is a transport operation only.

Continuation Invariant: Loss of provider output != loss of Semantic Layer state. Absence of sentinel => always request next segment.

Decision Invariant: After each provider response: if sentinel reached: COMPLETED. Otherwise: remain ACTIVE. No other decision permitted.

--------------------------------------------------------
Semantic Layer
--------------------------------------------------------

Activation: Upon instruction receipt, Semantic Layer enters GENERATING, begins generation immediately. No introductory or conversational output permitted.

Invocation Contract: Runtime controls execution. Semantic Layer emits next logical segment on Runtime request. Generation resumes after last byte. No restart, no re-interpretation. Continue until complete, then emit sentinel.

State Machine: GENERATING: produce logical segments, commit continuation point, suspend until next request. No regeneration, no summaries, no acknowledgment of continuation.

Completeness: Treat artifact as continuous object. No segment intros, acknowledgments, or summaries. Continue generation until all requirements met. Emit sentinel only after full completion.

Interface: Exports logical segments (immutable, continuous) and optional metadata. Runtime may ignore metadata.

Completion: Transition to COMPLETED only when: Semantic Layer emits sentinel AND all preceding segments delivered in order. Both Runtime and Semantic Layer must reach terminal states before request is complete. Neither provider limitations nor response boundaries terminate generation.`;

// ============================================================
// Capability Negotiation
// ============================================================

export class CapabilityNegotiator {
  constructor() {
    this.profile = { AIRTP_contract: AIRTP_CONTRACT, protocol: AIRTP_VERSION };
  }
  initializeContract() {
    return this.profile.AIRTP_contract;
  }
}

// ============================================================
// Logical Message Chunking
// ============================================================

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class ChunkManager {
  constructor(size = DEFAULT_CHUNK_SIZE) {
    this.size = size;
  }
  split(data) {
    const chunks = [];
    const total = Math.max(1, Math.ceil(data.length / this.size));
    const message_id = uuid();
    for (let index = 0; index < total; index++) {
      const start = index * this.size;
      const end = start + this.size;
      chunks.push({ message_id, chunk_id: index, total_chunks: total, data: data.slice(start, end) });
    }
    return chunks;
  }
  assemble(chunks) {
    const ordered = [...chunks].sort((a, b) => a.chunk_id - b.chunk_id);
    return ordered.map((item) => item.data).join("");
  }
}

// ============================================================
// Envelope Contract
// ============================================================

export class EnvelopeFactory {
  create(message_type, payload, message_id) {
    return {
      protocol: AIRTP_VERSION,
      message_type,
      message_id: message_id || uuid(),
      transport_contract: {
        chunk_visibility: "hidden",
        assembly_state: "complete",
        semantic_role: "user_message",
      },
      payload,
    };
  }
}

// ============================================================
// Sentinel Matching
// ============================================================

export class SentinelMatcher {
  constructor(sentinel) {
    this.sentinel = sentinel;
    this.MAX_SENTINEL_PREFIX = sentinel.length - 1;
    this.buffer = "";
  }
  _partialSuffixLength() {
    const maxLen = Math.min(this.buffer.length, this.MAX_SENTINEL_PREFIX);
    for (let n = maxLen; n > 0; n--) {
      if (this.buffer.endsWith(this.sentinel.slice(0, n))) return n;
    }
    return 0;
  }
  feed(chunk) {
    this.buffer += chunk;
    const keep = this._partialSuffixLength();
    if (this.buffer.endsWith(this.sentinel)) {
      return this.buffer;
    }
    const emit = keep === 0 ? this.buffer : this.buffer.slice(0, this.buffer.length - keep);
    this.buffer = keep === 0 ? "" : this.buffer.slice(this.buffer.length - keep);
    return emit;
  }
}

// ============================================================
// Writer (delivers logical segments to the Requester)
// ============================================================

export class CallbackWriter {
  constructor(onWrite) {
    this.bytesWritten = 0;
    this.onWrite = onWrite || (() => {});
  }
  write(data) {
    if (!data) return;
    const text = String(data);
    this.onWrite(text);
    this.bytesWritten += new Blob([text]).size;
  }
  writeln(data = "") {
    this.write(`${data}\n`);
  }
  close() {}
}

// ============================================================
// Provider Adapter — OpenAI Realtime semantics over InvokeLLM
// ============================================================

export class InvokeLLMAdapter {
  constructor() {
    this.capabilityNegotiator = new CapabilityNegotiator();
    this._queue = [];
    this.contractInitialized = false;
  }

  async initialize_contract() {
    // Capability negotiation: surface the AIRTP contract to the provider.
    this.contractInitialized = true;
    return this.capabilityNegotiator.initializeContract();
  }

  _enqueue(text) {
    this._queue.push([TransportEvent.DELTA, text]);
    this._queue.push([TransportEvent.PROVIDER_DONE, null]);
  }

  async send_message(envelope) {
    const text = envelope.payload.content;
    const contract = this.capabilityNegotiator.initializeContract();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${contract}\n\n--- USER REQUEST ---\n${text}\n\nBegin generating the artifact now. When the artifact is fully complete, emit exactly ${SENTINEL} with no surrounding text.`,
    });
    this._enqueue(String(res ?? ""));
  }

  async request_continuation() {
    const continuation = `Continue the unfinished response. Resume immediately after the final character already emitted. Do NOT restart, repeat, summarize, explain, or apologize. Continue only the unfinished artifact. If there is no remaining content, output exactly ${SENTINEL} with no additional text.`;
    const res = await base44.integrations.Core.InvokeLLM({ prompt: continuation });
    this._enqueue(String(res ?? ""));
  }

  async nextEvent() {
    if (this._queue.length === 0) return [TransportEvent.OTHER, null];
    return this._queue.shift();
  }
}

// ============================================================
// AIRTP Runtime
// ============================================================

export class AIRTPRuntime {
  constructor({ adapter, writer, onEvent, onState, onContinuations } = {}) {
    this.adapter = adapter;
    this.writer = writer || new CallbackWriter();
    this.chunker = new ChunkManager();
    this.envelopes = new EnvelopeFactory();
    this.state = RuntimeState.ACTIVE;
    this.sentinel = new SentinelMatcher(SENTINEL);
    this.logicalBuffer = "";
    this.eventLog = [];
    this.continuations = 0;
    this.lastChunks = [];
    this.lastEnvelope = null;
    this.onEvent = onEvent || (() => {});
    this.onState = onState || (() => {});
    this.onContinuations = onContinuations || (() => {});
  }

  _setState(s) {
    this.state = s;
    this.onState(s);
  }

  async execute(text) {
    const chunks = this.chunker.split(text);
    this.lastChunks = chunks;
    const assembled = this.chunker.assemble(chunks);
    const envelope = this.envelopes.create("MODEL_REQUEST", { content: assembled });
    this.lastEnvelope = envelope;
    this.state = RuntimeState.ACTIVE;
    this.onState(this.state);
    await this.executeRuntime(envelope);
  }

  async executeRuntime(envelope) {
    await this.adapter.send_message(envelope);
    while (this.state === RuntimeState.ACTIVE) {
      const event = await this.receiveTransportEvent();
      await this.processEvent(event);
    }
  }

  async receiveTransportEvent() {
    const event = await this.adapter.nextEvent();
    this.eventLog.push(event);
    this.onEvent(event);
    return event;
  }

  async processEvent(event) {
    const [kind, payload] = event;

    if (kind === TransportEvent.ERROR) {
      throw new Error(typeof payload === "string" ? payload : "Provider error");
    }

    if (kind === TransportEvent.DELTA) {
      this.logicalBuffer += payload;
      const emit = this.sentinel.feed(payload);
      if (!emit.includes(SENTINEL)) {
        this.writer.write(emit);
      } else {
        this.writer.write("\n");
      }
      return;
    }

    if (kind === TransportEvent.PROVIDER_DONE) {
      // AIRTP — not the provider — decides completion.
      if (this.logicalBuffer.includes(SENTINEL)) {
        this._setState(RuntimeState.COMPLETED);
        return;
      }
      if (this.continuations >= MAX_CONTINUATIONS) {
        this._setState(RuntimeState.COMPLETED);
        return;
      }
      this.continuations++;
      this.onContinuations(this.continuations);
      await this.adapter.request_continuation();
      return;
    }
  }
}