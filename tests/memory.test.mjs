import test from "node:test";
import assert from "node:assert/strict";
import { configuration, safeFailure, run, verifyRecord, sampleMemories } from "../integrations/memory.mjs";

test("configuration trims Secrets and fixes the Mainnet scope", () => {
  const config = configuration({ MEMWAL_PRIVATE_KEY: "  synthetic-key\n", MEMWAL_ACCOUNT_ID: " 0x" + "a".repeat(64) + "\n" });
  assert.equal(config.key, "synthetic-key");
  assert.equal(config.namespace, "wal-sentinel-memory-v1");
  assert.equal(config.serverUrl, "https://relayer.memory.walrus.xyz");
  assert.throws(() => configuration({}), /Missing/);
  assert.throws(() => configuration({ MEMWAL_PRIVATE_KEY: "synthetic", MEMWAL_ACCOUNT_ID: "wallet" }), /object ID/);
});
test("errors never echo arbitrary server data", () => {
  assert.match(safeFailure({ status: 401, message: "synthetic-secret" }), /401 AUTH_REJECTED/);
  assert.doesNotMatch(safeFailure(new Error("synthetic-secret")), /synthetic-secret/);
});
test("paid writes are blocked before any client operation", async () => {
  for (const action of ["seed", "smoke"]) {
    await assert.rejects(run(action, { env: {}, memwal: {} }), /cost approval/);
  }
});
test("ten prepared policies are distinct", () => {
  assert.equal(sampleMemories.length, 10);
  assert.equal(new Set(sampleMemories).size, 10);
});
test("existing exact memory is reused without a write", async () => {
  const result = await verifyRecord({
    recall: async () => ({ results: [{ text: "policy", blob_id: "blob-1" }] }),
    remember: async () => { throw new Error("Unexpected write"); }
  }, "policy");
  assert.equal(result.reused, true);
});
test("new writes require completed blob and exact retrieval", async () => {
  let count = 0;
  const client = {
    recall: async () => ({ results: ++count === 1 ? [] : [{ text: "policy", blob_id: "blob-2" }] }),
    remember: async () => ({ job_id: "job-2" }),
    waitForRememberJob: async () => ({ blob_id: "blob-2" })
  };
  assert.equal((await verifyRecord(client, "policy")).retrieved, true);
  count = 0;
  client.waitForRememberJob = async () => ({ blob_id: "different-blob" });
  await assert.rejects(verifyRecord(client, "policy"), /retrieval failed/);
});
test("acceptance alone is not proof of storage", async () => {
  await assert.rejects(verifyRecord({
    recall: async () => ({ results: [] }),
    remember: async () => ({ job_id: "pending" }),
    waitForRememberJob: async () => ({ status: "running" })
  }, "policy"), /without blob_id/);
});

test("health requires authenticated recall and propagates a 401 without writes", async () => {
  const calls = [];
  const rejection = Object.assign(new Error("synthetic unauthorized"), { status: 401 });
  const client = {
    health: async () => { calls.push("health"); },
    recall: async () => { calls.push("recall"); throw rejection; },
    remember: async () => { throw new Error("Unexpected paid write"); }
  };
  await assert.rejects(run("health", { memwal: client }), error => error === rejection);
  assert.deepEqual(calls, ["health", "recall"]);
});
test("health succeeds only after authenticated recall completes", async () => {
  const calls = [];
  await run("health", { memwal: {
    health: async () => { calls.push("health"); },
    recall: async options => {
      calls.push("recall");
      assert.equal(options.limit, 1);
      return { results: [], total: 0 };
    },
    remember: async () => { throw new Error("Unexpected paid write"); }
  } });
  assert.deepEqual(calls, ["health", "recall"]);
});
