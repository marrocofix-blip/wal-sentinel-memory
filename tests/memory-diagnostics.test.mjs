import test from "node:test";
import assert from "node:assert/strict";
import { comparePublicReference, diagnose } from "../integrations/memory-diagnostics.mjs";

const env = {
  MEMWAL_PRIVATE_KEY: "synthetic-private-value",
  MEMWAL_ACCOUNT_ID: "0x" + "a".repeat(64),
  MEMWAL_EXPECTED_ACCOUNT_ID: "0x" + "a".repeat(64),
  MEMWAL_EXPECTED_DELEGATE_PUBLIC_KEY: "0x" + "b".repeat(64)
};
function client(overrides = {}) {
  return {
    getPublicKeyHex: async () => "b".repeat(64),
    health: async () => ({}),
    recall: async () => ({ results: [], total: 0 }),
    remember: async () => { throw new Error("Unexpected paid operation"); },
    ...overrides
  };
}
test("public references match normalized hex and reject wrong/missing values", () => {
  assert.equal(comparePublicReference("b".repeat(64), " 0X" + "B".repeat(64) + " "), "MATCH");
  assert.equal(comparePublicReference("a".repeat(64), "b".repeat(64)), "MISMATCH");
  assert.equal(comparePublicReference("a".repeat(64), ""), "UNVERIFIED");
  assert.equal(comparePublicReference("a".repeat(64), "bad"), "INVALID");
});
test("SDK public key plus Dashboard account and authenticated recall establish the pair", async () => {
  const result = await diagnose(env, client());
  assert.equal(result.dashboardDelegateComparison, "MATCH");
  assert.equal(result.dashboardAccountComparison, "MATCH");
  assert.equal(result.dashboardAccountPair, "PASS");
  assert.equal(result.authenticatedRecall, "PASS");
  assert.equal(result.writes, 0);
  const output = JSON.stringify(result);
  for (const value of [env.MEMWAL_PRIVATE_KEY, env.MEMWAL_ACCOUNT_ID, env.MEMWAL_EXPECTED_DELEGATE_PUBLIC_KEY]) {
    assert.ok(!output.includes(value));
  }
});
test("401 is reported without disclosing server errors", async () => {
  const result = await diagnose(env, client({
    recall: async () => { throw Object.assign(new Error(env.MEMWAL_PRIVATE_KEY), { status: 401 }); }
  }));
  assert.equal(result.authenticatedRecall, "FAIL_HTTP_401");
  assert.equal(result.accountDelegateAuthorization, "FAIL");
  assert.equal(result.dashboardAccountPair, "UNVERIFIED");
  assert.ok(!JSON.stringify(result).includes(env.MEMWAL_PRIVATE_KEY));
});
test("a wrong Dashboard account fails even when recall works", async () => {
  const result = await diagnose({ ...env, MEMWAL_EXPECTED_ACCOUNT_ID: "0x" + "c".repeat(64) }, client());
  assert.equal(result.dashboardAccountComparison, "MISMATCH");
  assert.equal(result.dashboardAccountPair, "FAIL");
});
test("no Dashboard references cannot produce a fabricated match", async () => {
  const result = await diagnose({ ...env, MEMWAL_EXPECTED_ACCOUNT_ID: "", MEMWAL_EXPECTED_DELEGATE_PUBLIC_KEY: "" }, client());
  assert.equal(result.publicKeyDerivation, "PASS");
  assert.equal(result.dashboardDelegateComparison, "UNVERIFIED");
  assert.equal(result.dashboardAccountComparison, "UNVERIFIED");
  assert.equal(result.dashboardAccountPair, "UNVERIFIED");
});
test("signed recall is attempted independently of public health", async () => {
  const result = await diagnose(env, client({ health: async () => { throw new Error("offline"); } }));
  assert.equal(result.relayerHealth, "FAIL");
  assert.equal(result.authenticatedRecall, "PASS");
});
