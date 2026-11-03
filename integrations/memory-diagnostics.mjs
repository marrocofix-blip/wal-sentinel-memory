import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { configuration } from "./memory.mjs";

function canonicalHex(value, bytes = 32) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace(/^0x/i, "").toLowerCase();
  return new RegExp("^[0-9a-f]{" + bytes * 2 + "}$").test(hex) ? hex : null;
}

export function comparePublicReference(actual, expected) {
  if (!expected?.trim()) return "UNVERIFIED";
  const left = canonicalHex(actual);
  const right = canonicalHex(expected);
  if (!left || !right) return "INVALID";
  return left === right ? "MATCH" : "MISMATCH";
}

function fingerprint(hex) {
  return createHash("sha256").update(Buffer.from(hex, "hex")).digest("hex").slice(0, 16);
}

export async function diagnose(env = process.env, suppliedClient) {
  const config = configuration(env);
  const keyText = config.key.trim();
  // Format-only checks; never log lengths, prefixes, partial keys or credentials.
  const keyCompatible = /^(?:0x)?[a-fA-F0-9]{64}$/.test(keyText) || /^suiprivkey1[023456789acdefghjklmnpqrstuvwxyz]+$/.test(keyText);
  if(!keyCompatible) throw new Error("INVALID_DELEGATE_FORMAT");
  const memwal = suppliedClient ?? (await import("@mysten-incubation/memwal")).MemWal.create(config);
  // Official SDK derives the PUBLIC key. Never log the key, config, env, or raw errors.
  const publicKey = canonicalHex(await memwal.getPublicKeyHex());
  if (!publicKey) throw new Error("Invalid SDK public key.");
  const report = {
    network: "mainnet",
    delegateLabel: "WAL-SENTINEL-MAINNET",
    publicKeyDerivation: "PASS",
    publicKeySha256Prefix: fingerprint(publicKey),
    accountIdSha256Prefix: fingerprint(canonicalHex(config.accountId)),
    dashboardDelegateComparison: comparePublicReference(publicKey, env.MEMWAL_EXPECTED_DELEGATE_PUBLIC_KEY),
    dashboardAccountComparison: comparePublicReference(config.accountId, env.MEMWAL_EXPECTED_ACCOUNT_ID),
    relayerHealth: "FAIL",
    authenticatedRecall: "FAIL",
    accountDelegateAuthorization: "UNVERIFIED",
    dashboardAccountPair: "UNVERIFIED",
    writes: 0
  };
  try {
    await memwal.health();
    report.relayerHealth = "PASS";
  } catch {
    // A public health failure does not skip the independently signed recall.
  }
  try {
    await memwal.recall({ query: "WAL SENTINEL MEMORY read-only authentication diagnostic", limit: 1 });
    report.authenticatedRecall = "PASS";
    report.accountDelegateAuthorization = "PASS";
  } catch (error) {
    report.authenticatedRecall = error?.status === 401 || /\b401\b/.test(String(error?.message ?? ""))
      ? "FAIL_HTTP_401" : "FAIL";
    report.accountDelegateAuthorization = "FAIL";
  }
  const comparisons = [report.dashboardDelegateComparison, report.dashboardAccountComparison];
  if (comparisons.includes("MISMATCH") || comparisons.includes("INVALID")) {
    report.dashboardAccountPair = "FAIL";
  } else if (comparisons.every(value => value === "MATCH") && report.authenticatedRecall === "PASS") {
    report.dashboardAccountPair = "PASS";
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  diagnose().then(report => {
    console.log(JSON.stringify(report, null, 2));
    if (report.dashboardAccountPair !== "PASS" || report.relayerHealth !== "PASS") process.exitCode = 1;
  }).catch(error => {
    const message = String(error?.message || '');
    const category = message === 'INVALID_DELEGATE_FORMAT' ? 'DELEGATE_SECRET_FORMAT_INVALID' :
      /Missing MEMWAL_PRIVATE_KEY/.test(message) ? 'REQUIRED_SECRET_MISSING' :
      /MEMWAL_ACCOUNT_ID must/.test(message) ? 'MEMORY_ACCOUNT_ID_FORMAT_INVALID' :
      'SDK_INITIALIZATION_OR_NETWORK_FAILED';
    console.error("FAIL: Walrus Memory diagnostic:", category, "- check dashboard credentials. No credential content or lengths logged.");
    process.exitCode = 1;
  });
}
