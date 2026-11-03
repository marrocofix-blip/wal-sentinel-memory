import { pathToFileURL } from "node:url";

// Official documented legacy JSON-RPC endpoint. Some requests may return HTTP 404.
// We report that honestly; never interpret a failed request as connected.
const ENDPOINT = "https://sui-mainnet.gateway.tatum.io";

export async function getLatestCheckpoint({ apiKey = process.env.TATUM_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("Missing TATUM_API_KEY (set only in your local session)");
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getLatestCheckpointSequenceNumber",
        params: []
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (err) {
    throw new Error("Tatum network request failed: " + err.message);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "HTTP 404 from Tatum Sui legacy JSON-RPC gateway. " +
        "The key is not proven invalid. Sui has migrated toward gRPC; " +
        "check gateway access or implement the official Tatum gRPC endpoint " +
        "(sui-mainnet-grpc.gateway.tatum.io:443). No blockchain connection was established."
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Tatum HTTP " + response.status + ": authorization or permissions rejected");
    }
    throw new Error("Tatum HTTP " + response.status + ": gateway request unsuccessful");
  }
  const data = await response.json();
  if (data.error) throw new Error("Tatum RPC error: " + data.error.code + ": " + data.error.message);
  if (!/^\d+$/.test(String(data.result))) {
    throw new Error("Unexpected Tatum checkpoint response");
  }
  return {
    provider: "Tatum",
    network: "sui-mainnet",
    protocol: "legacy-json-rpc",
    checkpoint: String(data.result)
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  getLatestCheckpoint()
    .then(result => console.log("PASS: TATUM MAINNET CONNECTED", JSON.stringify(result)))
    .catch(err => {
      console.error("CHECK FAILED:", err.message);
      process.exitCode = 1;
    });
}
