import { pathToFileURL } from "node:url";

const NS = "wal-sentinel-memory-v1";
export const sampleMemories = [
  "WAL Sentinel is a read-only cryptocurrency research prototype, not an exchange.",
  "A prediction is assessed only after its declared horizon has ended.",
  "Do not use an unfinished candle to infer a confirmed price signal.",
  "Signals must contain an exact market symbol, exchange source and UTC timestamp.",
  "Exchange price differences must never be silently combined.",
  "An unavailable data feed is an unknown status, not a BUY or SELL signal.",
  "Every published prediction should preserve its original direction and target horizon.",
  "Market commentary is uncertain and must not promise guaranteed profit.",
  "No private keys, wallet secrets, or exchange credentials belong in public memory.",
  "Tatum Sui RPC checkpoints are on-chain provenance signals, not price forecasts."
];


export function configuration(env = process.env) {
  const key = (env.MEMWAL_PRIVATE_KEY ?? "").trim();
  const accountId = (env.MEMWAL_ACCOUNT_ID ?? "").trim();
  if (!key || !accountId) throw new Error("Missing MEMWAL_PRIVATE_KEY or MEMWAL_ACCOUNT_ID.");
  if (!/^0x[0-9a-fA-F]{64}$/.test(accountId))
    throw new Error("MEMWAL_ACCOUNT_ID must be a full Sui object ID; use the Memory account, not the wallet address.");
  return { key, accountId, namespace: NS, serverUrl: "https://relayer.memory.walrus.xyz" };
}

export function safeFailure(error) {
  const message = String(error?.message ?? "");
  if (error?.status === 401 || /\b401\b/.test(message)) {
    return "FAIL: HTTP 401 AUTH_REJECTED. In memory.walrus.xyz verify that the Mainnet Memory account object ID and registered, active Ed25519 delegate key belong together. Replace both repository Secrets from that same account. Never paste credentials into logs or issues.";
  }
  // Do not echo SDK/server errors: they can contain credentials or request data.
  return "FAIL: Walrus Memory operation failed. Check configuration, connectivity and job status without logging credentials.";
}

async function client() {
  const config = configuration();
  const { MemWal } = await import("@mysten-incubation/memwal");
  return MemWal.create(config);
}

export async function verifyRecord(memwal, text) {
  // Read first so a normal rerun does not append the same prepared policy.
  const existing = await memwal.recall({ query: text, limit: 100 });
  const match = existing.results.find(row => row.text === text && row.blob_id);
  if (match) return { blob_id: match.blob_id, reused: true, retrieved: true };
  const accepted = await memwal.remember(text);
  // Emit a job receipt before waiting; a timeout must be investigated, not blindly retried.
  console.log(JSON.stringify({ event: "accepted", job_id: accepted.job_id }));
  const done = await memwal.waitForRememberJob(accepted.job_id, { timeoutMs: 120_000 });
  if (!done.blob_id) throw new Error("Write completed without blob_id.");
  const recalled = await memwal.recall({ query: text, limit: 100 });
  if (!recalled.results.some(row => row.blob_id === done.blob_id && row.text === text))
    throw new Error("Exact blob/text retrieval failed.");
  return { job_id: accepted.job_id, blob_id: done.blob_id, reused: false, retrieved: true };
}

export async function run(action, options = {}) {
  if (!["health", "seed", "smoke", "recall", "prepare"].includes(action))
    throw new Error("Use health, seed, smoke, recall or prepare.");
  if (action === "prepare") {
    const records = sampleMemories.map((text, i) => ({
      index: i + 1, text: `WAL-SENTINEL POLICY ${i + 1}/10: ${text}`
    }));
    console.log(JSON.stringify({ namespace: NS, network: "mainnet", status: "prepared-only", records }, null, 2));
    return;
  }
  const env = options.env ?? process.env;
  if (["seed", "smoke"].includes(action) && env.MEMWAL_ALLOW_PAID_WRITES !== "yes")
    throw new Error("Mainnet writes require cost approval, then MEMWAL_ALLOW_PAID_WRITES=yes.");
  const memwal = options.memwal ?? await client();
  if (action === "health") {
    await memwal.health();
    console.log("PASS: Walrus Memory Mainnet relayer reachable");
    await memwal.recall({ query: "WAL SENTINEL MEMORY connection check", limit: 1 });
    console.log("PASS: authenticated recall (does not prove a write)");
  } else if (action === "seed" || action === "smoke") {
    await memwal.recall({ query: "WAL SENTINEL MEMORY connection check", limit: 1 });
    const texts = action === "seed"
      ? sampleMemories.map((text, i) => `WAL-SENTINEL POLICY ${i + 1}/10: ${text}`)
      : ["WAL-SENTINEL MAINNET SMOKE v1: exact text retrieval verifies persistent project memory."];
    const proofs = [];
    for (const [i, text] of texts.entries()) {
      const proof = await verifyRecord(memwal, text);
      proofs.push({ index: i + 1, text, ...proof });
      console.log(JSON.stringify({ event: "verified", index: i + 1, ...proof }));
    }
    if (new Set(proofs.map(row => row.blob_id)).size !== texts.length)
      throw new Error("Distinct records must have distinct blob IDs.");
    console.log(JSON.stringify({
      network: "mainnet", serverUrl: "https://relayer.memory.walrus.xyz",
      namespace: NS, verified_at: new Date().toISOString(), confirmed: proofs.length, proofs
    }, null, 2));
  } else {
    console.log(JSON.stringify(await memwal.recall({
      query: "WAL Sentinel policy for closed candles and safe signals", limit: 10
    }), null, 2));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv[2] || "health").catch(error => {
    console.error(safeFailure(error));
    process.exitCode = 1;
  });
}
