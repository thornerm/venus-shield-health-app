// base44/functions/agent-keys/entry.ts
// Issues, lists and revokes runtime API keys for one agent. Admin only.
// Keys are credentials; passports are permissions. A key can only be issued for
// an agent whose passport is active (reviewed). The plaintext key is returned
// once, at creation — only its SHA-256 hash is stored.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { hashApiKey, rows, now } from "../../shared/engine.ts";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateKey() {
  const bytes = new Uint8Array(40);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `vs_live_${out}`;
}

/** Never returns key_hash. */
const publicKey = (k) => ({
  id: k.id,
  agent_id: k.agent_id,
  label: k.label || "",
  key_prefix: k.key_prefix,
  status: k.status,
  created_by: k.created_by || "",
  created_date: k.created_date,
  last_used_at: k.last_used_at || null,
  expires_at: k.expires_at || null,
  revoked_at: k.revoked_at || null,
  revoked_by: k.revoked_by || null,
});

export default async function (req) {
  try {
    if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only a governance admin can manage runtime keys." }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const db = base44.asServiceRole.entities; // admin verified above

    if (action === "list") {
      if (!body.agent_id) return Response.json({ error: "agent_id is required" }, { status: 400 });
      const keys = rows(await db.AgentApiKey.filter({ agent_id: body.agent_id }, { sort: "-created_date", limit: 100 }));
      return Response.json({ keys: keys.map(publicKey) });
    }

    if (action === "create") {
      const agentId = String(body.agent_id || "").trim();
      if (!agentId) return Response.json({ error: "agent_id is required" }, { status: 400 });
      const agent = rows(await db.ShieldAgent.filter({ agent_id: agentId }))[0];
      if (!agent) return Response.json({ error: `No agent found with id "${agentId}".` }, { status: 404 });

      const active = agent.is_active !== false && String(agent.review_status || "") === "reviewed";
      if (!active) {
        const state = String(agent.review_status || "not approved").replace("_", " ");
        return Response.json({ error: `Runtime keys can only be issued for an active passport. ${agent.name} is ${state}.` }, { status: 409 });
      }

      const full = generateKey();
      const days = Number(body.expires_in_days || 0);
      const record = await db.AgentApiKey.create({
        agent_id: agentId,
        label: String(body.label || "").slice(0, 80),
        key_prefix: full.slice(0, 12),
        key_hash: await hashApiKey(full),
        status: "active",
        created_by: user.email || "",
        last_used_at: null,
        expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      });
      // The plaintext key leaves the server exactly once.
      return Response.json({ key: full, record: publicKey(record) });
    }

    if (action === "revoke") {
      if (!body.key_id) return Response.json({ error: "key_id is required" }, { status: 400 });
      const existing = await db.AgentApiKey.get(body.key_id).catch(() => null);
      if (!existing) return Response.json({ error: "Key not found." }, { status: 404 });
      if (existing.status === "revoked") return Response.json({ error: "This key is already revoked." }, { status: 409 });
      const updated = await db.AgentApiKey.update(body.key_id, {
        status: "revoked",
        revoked_at: now(),
        revoked_by: user.email || "",
      });
      return Response.json({ record: publicKey(updated) });
    }

    return Response.json({ error: "Unknown action. Use list, create or revoke." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || "Key operation failed." }, { status: 500 });
  }
}