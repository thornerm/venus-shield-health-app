// tests/apiKey.test.ts
//
// Regression tests for the shared agent-key authorization check that both
// runtime enforcement endpoints authenticate through.
//
//   npx vitest run tests/apiKey.test.ts
//
// The boundary cases below are the ones that previously slipped through: the
// status lookup accepted an expired key, and a malformed expiration timestamp
// was ignored rather than refused.

import { describe, it, expect } from "vitest";
import {
  evaluateKeyAuthorization,
  hashApiKey,
  KEY_DENIED,
  KEY_EXPIRED,
  KEY_BAD_EXPIRY,
} from "../base44/shared/engine";

// Fixed clock, so the expiration boundary is deterministic.
const NOW = Date.parse("2026-10-13T22:00:00.000Z");

const key = (over = {}) => ({
  agent_id: "agent-1",
  key_prefix: "vs_live_abcd",
  status: "active",
  expires_at: null,
  ...over,
});

describe("evaluateKeyAuthorization", () => {
  it("authorizes an active key with a future expiration", () => {
    expect(evaluateKeyAuthorization(key({ expires_at: "2026-10-14T22:00:00.000Z" }), NOW)).toEqual({
      authorized: true,
    });
  });

  it("refuses an active key whose expiration is in the past with 401", () => {
    expect(evaluateKeyAuthorization(key({ expires_at: "2026-10-12T22:00:00.000Z" }), NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_EXPIRED,
    });
  });

  it("refuses an active key whose expiration has been reached exactly with 401", () => {
    expect(evaluateKeyAuthorization(key({ expires_at: "2026-10-13T22:00:00.000Z" }), NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_EXPIRED,
    });
  });

  it("refuses a revoked key with 401", () => {
    expect(evaluateKeyAuthorization(key({ status: "revoked" }), NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_DENIED,
    });
  });

  it("refuses an unparseable expiration timestamp instead of ignoring it", () => {
    expect(evaluateKeyAuthorization(key({ expires_at: "not-a-date" }), NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_BAD_EXPIRY,
    });
    expect(evaluateKeyAuthorization(key({ expires_at: "13/45/2026" }), NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_BAD_EXPIRY,
    });
  });

  it("keeps a valid non-expiring key authorized", () => {
    expect(evaluateKeyAuthorization(key({ expires_at: null }), NOW)).toEqual({ authorized: true });
    expect(evaluateKeyAuthorization(key({ expires_at: undefined }), NOW)).toEqual({ authorized: true });
    expect(evaluateKeyAuthorization(key({ expires_at: "" }), NOW)).toEqual({ authorized: true });
  });

  it("refuses a missing key record", () => {
    expect(evaluateKeyAuthorization(undefined, NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_DENIED,
    });
    expect(evaluateKeyAuthorization(null, NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_DENIED,
    });
  });

  it("refuses a key with no status at all", () => {
    expect(evaluateKeyAuthorization({ expires_at: null }, NOW)).toEqual({
      authorized: false,
      status: 401,
      error: KEY_DENIED,
    });
  });
});

describe("hashApiKey", () => {
  it("hashes deterministically to a 64-character hex digest", async () => {
    const digest = await hashApiKey("vs_live_regression");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(await hashApiKey("vs_live_regression"));
    expect(digest).not.toBe(await hashApiKey("vs_live_regression2"));
  });
});