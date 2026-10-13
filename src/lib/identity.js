import { base44 } from "@/api/base44Client";

/**
 * Identity helpers. The authenticated user (base44.auth.me()) is the single
 * source of truth for current-user identity, form defaults, and audit actor
 * attribution. There is no hardcoded approver identity.
 */
export const UNATTRIBUTED = "Unattributed";

let cachedActor = null;

export function normalizeActor(u) {
  const name = u?.full_name || u?.name || "Unknown user";
  const email = u?.email || "";
  return {
    id: u?.id || null,
    name,
    email,
    display: email ? `${name} <${email}>` : name,
    role: u?.role || "user",
    isDemo: false,
  };
}

/** Returns the current authenticated actor, cached after first fetch. */
export async function getCurrentActor() {
  if (cachedActor) return cachedActor;
  try {
    const u = await base44.auth.me();
    cachedActor = normalizeActor(u);
  } catch {
    cachedActor = {
      id: null,
      name: UNATTRIBUTED,
      email: "",
      display: UNATTRIBUTED,
      role: "user",
      isDemo: true,
    };
  }
  return cachedActor;
}

/** Allows the AuthContext to pre-seed the cache with the already-loaded user. */
export function setCachedActor(user) {
  cachedActor = user ? normalizeActor(user) : null;
}

export function roleLabel(role) {
  return role === "admin" ? "Governance Admin" : "Governance User";
}