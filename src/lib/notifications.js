import { base44 } from "@/api/base44Client";
import { APPROVER_EMAIL } from "@/lib/governance";

const APP_URL = "https://venus-orbit-guard.base44.app";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildHtml({ blocked, rows, reasons, ctaUrl, ctaLabel }) {
  const accent = blocked ? "#dc2626" : "#d97706";
  const tag = blocked ? "BLOCKED" : "APPROVAL REQUIRED";
  const intro = blocked
    ? "A governed agent action was blocked and its passport was ratcheted to restricted autonomy."
    : "An agent action requires your manual approval before it can proceed.";
  const rowsHtml = rows.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:6px 12px;font-size:13px;font-weight:500;border-bottom:1px solid #f1f5f9;">${escapeHtml(v)}</td></tr>`).join("");
  const reasonsHtml = reasons.slice(-6).map((r) => `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#64748b;padding:2px 0;border-bottom:1px solid #f8fafc;">${escapeHtml(r)}</div>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <div style="width:28px;height:28px;border-radius:6px;background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">V</div>
      <span style="font-weight:700;color:#0f172a;font-size:15px;">Venus Shield</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:${accent};color:#fff;padding:14px 18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9;">Security Alert</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px;">${tag}</div>
      </div>
      <div style="padding:16px 18px;">
        <p style="margin:0 0 12px;font-size:13px;color:#475569;">${intro}</p>
        <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
        ${reasonsHtml ? `<div style="margin-top:14px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:600;margin-bottom:6px;">Reasoning Trace</div>${reasonsHtml}</div>` : ""}
        <a href="${ctaUrl}" style="display:inline-block;margin-top:16px;background:${accent};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">${ctaLabel} →</a>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">This is an automated security notification from Venus Shield.</p>
  </div></body></html>`;
}

/**
 * Sends automated, branded security-alert emails whenever a governed action is
 * blocked or requires manual approval. The approver is always notified; the
 * agent owner is additionally notified on blocked events.
 */
export async function notifySecurityEvent({ event, record, agent, blast, reversibility, prevAuto, newAuto }) {
  const blocked = event === "blocked";
  const recipients = blocked
    ? [APPROVER_EMAIL, agent?.owner_email]
    : [APPROVER_EMAIL];
  const unique = [...new Set(recipients.filter(Boolean))];

  const subject = blocked
    ? `[Venus Shield] BLOCKED action & autonomy ratchet — ${record.agent_name}`
    : `[Venus Shield] Approval required — ${record.action_type} by ${record.agent_name}`;

  const rows = [
    ["Agent", `${record.agent_name} (${record.agent_id})`],
    ["Action", record.action_type],
    ["Target System", record.target_system],
    ["Amount", `$${Number(record.amount_usd || 0).toLocaleString()}`],
    ["Blast Radius", `${blast}/5`],
    ["Reversibility", (reversibility || "").replace(/_/g, " ")],
    ["Decision", blocked ? "BLOCKED" : "APPROVAL REQUIRED"],
    ["Status", blocked ? "Blocked" : "Pending Approval"],
  ];
  if (blocked) rows.push(["Autonomy Change", `${prevAuto} → ${newAuto}`]);

  const html = buildHtml({ blocked, rows, reasons: record.reasons || [], ctaUrl: `${APP_URL}/approvals`, ctaLabel: "Review in Approvals Queue" });

  const results = [];
  for (const to of unique) {
    try {
      await base44.integrations.Core.SendEmail({ to, subject, html });
      results.push({ to, ok: true });
    } catch (e) {
      results.push({ to, ok: false, error: e?.message });
    }
  }
  return { sent: results.some((r) => r.ok), recipients: results };
}