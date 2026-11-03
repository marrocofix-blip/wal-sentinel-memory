# WAL Sentinel Memory — free managed-relayer Mainnet runbook

**Purpose:** Prepare, store, recall and prove ten independent historical WAL market research memories, using the official Walrus Memory managed relayer and the existing `wal-sentinel-memory-v1` namespace. This is a reproducible **execution path**, not a claim that writes have already occurred.

**Free option:** The managed relayer is documented as covering storage and Sui transaction gas costs subject to its service limits. There must be **no wallet transfer, crypto purchase or exchange deposit** as part of this workflow. If the service requests payment or changes its sponsored policy, **stop**.

## Contents and eligibility

The ten memory bodies are generated from consecutive **already closed** WAL/USDT 15-minute candles strictly prior to 2026-11-03 07:00:00 UTC. Each contains a unique timestamp ID, observed prices, a one-candle momentum hypothesis, the next **already observed** candle, the verified historical result, and an appropriately modest lesson. These are retrospective research episodes, not pre-existing trading forecasts. Real prices must come from Binance Spot or Gate Spot; failure to obtain ten distinct valid episodes aborts.

## Security

- NEVER include the private delegate key or Tatum API key in GitHub, video frames, chat messages, screenshots, logs, browser localStorage, receipts, or the public website.
- Do not put credentials in persistent user or machine environment variables.
- Only `MEMWAL_PRIVATE_KEY` and `MEMWAL_ACCOUNT_ID` in the current PowerShell process are supported for authorized local operations.
- The read-only public dashboard MUST NOT expose a signed memory write route.
- Never bypass the explicit authorization guard.
- The software keeps local receipt status and stops after an uncertain accepted write. Check the original job ID and remote recall before any retrial.
- Do not represent mock unit tests or a prepared episode count as actual Mainnet storage.

## 1. Prepare — safe, read-only, no credentials

On the Windows PC with project clone:

```powershell
cd "D:\source\WAL_SENTINEL_STAGE3"
git pull origin main
npm.cmd install
npm.cmd test
node .\integrations\learning-loop.mjs prepare
```

Expect `PREPARED_NOT_WRITTEN`, exactly ten unique IDs, and a market source. No remote storage or transaction is attempted.

## 2. Authenticate locally

Use the official Memory dashboard at https://memory.walrus.xyz/ to retrieve the **Mainnet Memory Account object ID** and an **authorized registered Ed25519 delegate key** for the same account. The account object ID is **not** the wallet address.

Prefer PowerShell's secure prompt; don't send the key to an AI tool:

```powershell
$secure = Read-Host "Walrus delegate key" -AsSecureString
$account = Read-Host "Mainnet Memory Account object ID (0x...)"
$env:MEMWAL_PRIVATE_KEY = [System.Net.NetworkCredential]::new("", $secure).Password
$env:MEMWAL_ACCOUNT_ID = $account.Trim()
```

## 3. Verify previously stored entries (NO writes)

```powershell
node .\integrations\learning-loop.mjs verify
```

An existing exact `text + blob_id` match is reusable. If some are missing, the report must not say 10 verified.

## 4. Execute the Mainnet sponsor flow — only with deliberate approval

**This step performs real Mainnet memory writes, even though the managed relayer is currently advertised as sponsored.** Do this only when the account is configured and the user has explicitly authorized these ten distinct memories.

```powershell
$env:MEMWAL_ALLOW_MAINNET_WRITES = "I_AUTHORIZE_TEN_RELAYER_MEMORY_WRITES"
node .\integrations\learning-loop.mjs seed
Remove-Item Env:\MEMWAL_ALLOW_MAINNET_WRITES -ErrorAction SilentlyContinue
```

For each record, the code checks recall before writing, waits for the relayer job, requires a real `blob_id`, then requires another **exact text and blob ID recall** before marking it verified. On uncertainty it stops; never blindly rerun seed. The local `reports/mainnet-learning-receipts.json` has a distinct job ID, blob ID, text hash, and status per record, and contains **no private key**. Keep this report as audit evidence. To be counted as completed, `status = VERIFIED_10_BLOBS` with ten distinct blob IDs and ten verified exact recalls.

Afterwards remove session credentials without printing them:

```powershell
Remove-Item Env:\MEMWAL_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\MEMWAL_ACCOUNT_ID -ErrorAction SilentlyContinue
```

## 5. Live Tatum verification (separate read-only source)

Run `node integrations/tatum-grpc.mjs` only after providing `TATUM_API_KEY` to the same local PowerShell process (secure prompt). Verify an authenticated Mainnet checkpoint and timestamp. Do not commit or print the key, and do not represent separate Tatum and Walrus runs as a combined end-to-end PASS.

## Artifacts and limitations

- `integrations/learning-loop.mjs`: deterministic historical episode builder and guarded Walrus Memory read/write/verify flow.
- `integrations/learning-loop.test.mjs`: mock-only safety tests, no real writes.
- `reports/mainnet-learning-receipts.json`: produced by real verify/seed, local by default. **Not evidence until commands are actually executed and successful.**
- The current web journal is browser-local, not automatically persisted into Walrus. Integrating a secure signed backend and proving cross-session continuity is further work.

A separate, verified storage receipt may be required by the event judges; exact SDK blob IDs are not automatically independent on-chain storage proof.
