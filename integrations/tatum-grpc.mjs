import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";

const HOST = "sui-mainnet-grpc.gateway.tatum.io:443";

export async function checkTatumGrpc(apiKey = process.env.TATUM_API_KEY) {
  if (!apiKey) throw new Error("TATUM_API_KEY missing. Set it locally, never commit.");
  const transport = new GrpcTransport({
    host: HOST,
    channelCredentials: ChannelCredentials.createSsl(),
  });
  const client = new SuiGrpcClient({ network: "mainnet", transport });
  // Only read-only method: no signatures, no transactions, no wallet.
  const { response } = await client.ledgerService.getServiceInfo(
    {},
    { meta: { "x-api-key": apiKey }, abort: AbortSignal.timeout(20000) },
  );
  if (response.checkpointHeight == null) {
    throw new Error("No checkpointHeight returned. Connection unverified.");
  }
  return {
    provider: "Tatum",
    network: "sui-mainnet",
    protocol: "grpc",
    checkpointHeight: String(response.checkpointHeight),
    verifiedAt: new Date().toISOString(),
  };
}

if (process.argv[1]?.endsWith("tatum-grpc.mjs")) {
  checkTatumGrpc()
    .then((result) => console.log("PASS: TATUM GRPC MAINNET", JSON.stringify(result, null, 2)))
    .catch((err) => {
      console.error("FAIL: TATUM GRPC:", err.code ?? "", err.message);
      process.exitCode = 1;
    });
}
