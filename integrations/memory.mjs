import { pathToFileURL } from "node:url";

const NS = "wal-sentinel-memory-v1";
const sampleMemories = [
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

async function client() {
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) throw new Error("Set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID locally; never commit them.");
  const { MemWal } = await import("@mysten-incubation/memwal");
  return MemWal.create({
    key, accountId, namespace:NS,
    serverUrl:"https://relayer.memory.walrus.xyz"
  });
}

export async function run(action) {
  const memwal = await client();
  if (action === "health") {
    await memwal.health();
    console.log("PASS: Walrus Memory relayer reachable");
    await memwal.recall({ query: "WAL SENTINEL MEMORY connection check", limit: 1 });
    console.log("PASS: Walrus Memory authenticated recall succeeded");
  } else if (action === "seed") {
    // 10 real Mainnet writes, explicit invocation only; may incur account usage.
    const proofs=[];
    for (let i=0;i<sampleMemories.length;i++) {
      const accepted=await memwal.remember(`WAL-SENTINEL POLICY ${i+1}/10: ${sampleMemories[i]}`);
      const done=await memwal.waitForRememberJob(accepted.job_id);
      if (!done.blob_id) throw new Error(`Memory ${i+1} did not return a blob_id`);
      proofs.push({index:i+1,job_id:accepted.job_id,blob_id:done.blob_id});
      console.log(`Confirmed Mainnet memory ${i+1}/10: ${done.blob_id}`);
    }
    console.log(JSON.stringify({namespace:NS,confirmed:proofs.length,proofs},null,2));
  } else if (action === "recall") {
    const result=await memwal.recall({query:"WAL Sentinel policy for closed candles and safe signals",limit:10});
    console.log(JSON.stringify(result,null,2));
  } else {
    throw new Error("Use health, seed or recall.");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv[2]||"health").catch(e=>{console.error("MEMORY FAILED:",e.message);process.exitCode=1;});
}
