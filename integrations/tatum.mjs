import { pathToFileURL } from "node:url";

const ENDPOINT = "https://sui-mainnet.gateway.tatum.io";
export async function getLatestCheckpoint({ apiKey = process.env.TATUM_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("TATUM_API_KEY is missing. Keep it in your local environment.");
  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({jsonrpc:"2.0", id:1, method:"sui_getLatestCheckpointSequenceNumber", params:[]}),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Tatum HTTP ${response.status}; check API key and credits`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Tatum RPC error: ${payload.error.code}: ${payload.error.message}`);
  if (!/^\d+$/.test(String(payload.result))) throw new Error("Tatum returned an invalid checkpoint");
  return {network:"sui-mainnet", provider:"Tatum", checkpoint:String(payload.result)};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  getLatestCheckpoint().then(data => console.log(JSON.stringify(data,null,2))).catch(e => {
    console.error("CHECK FAILED:",e.message);process.exitCode=1;
  });
}
