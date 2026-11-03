# Stage 2: read-only Tatum + Walrus

Run in Windows PowerShell:

```powershell
npm.cmd test
node integrations/demo.mjs --mock
node integrations/demo.mjs
```

The demo prints JSON to stdout. Redirect it to a local report file if needed.
`--mock` uses deterministic synthetic inputs and makes no network calls. Its PASS
does not prove authenticated Mainnet access. Live mode uses the existing Tatum
gRPC reader; a missing TATUM_API_KEY produces BLOCKED and exit code 1.

`createReport` accepts a read-only `recall({namespace, query, limit})` adapter.
Normalize the official MCP response to `{records: [{text}]}` in the caller.
No authentication flow is changed. The standalone live demo has no connected MCP
adapter and honestly reports Walrus BLOCKED. Health alone is not recall proof.
Only allowlisted provenance fields are reported; upstream errors and raw memory
texts are excluded. Checkpoints are provenance, never price or trade signals.

During this Stage 2 session, the connected official memwal_recall tool returned
`WAL-SENTINEL-MAINNET-TEST-20261103-001` in namespace
`wal-sentinel-memory-v1` (written date reported: 2026-11-03). This is a historical
recall observation, not a fresh write or independently verified blob receipt.
No blob ID was returned. No memory writes or transactions were performed.
