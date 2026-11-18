// Resolves the governing agent passport for a job's agent type, so the
// Job Execution Governance workflow can hand a real agent_id to evaluate-ui.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { rows } from "../../shared/engine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { agent_type } = await req.json().catch(() => ({}));
    const wanted = String(agent_type || "").trim().toLowerCase();
    const agents = rows(await base44.asServiceRole.entities.ShieldAgent.filter({ is_active: true }));
    const match = agents.find((a) =>
      wanted && [a.agent_id, a.name].some((v) => String(v || "").trim().toLowerCase() === wanted)
    );
    // An unmatched type returns a placeholder id; evaluate-ui then reports "no governed agent", which counts as a failed evaluation.
    return Response.json({ agent_id: match ? match.agent_id : `unregistered:${wanted || "unset"}`, found: !!match });
  } catch (error) {
    return Response.json({ error: error.message || "Lookup failed." }, { status: 500 });
  }
}