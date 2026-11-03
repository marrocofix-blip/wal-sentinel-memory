# Stage 2: read-only Tatum + Walrus

Run in Windows PowerShell:

```powershell
npm.cmd test
node integrations/demo.mjs --mock
node integrations/demo.mjs
node integrations/demo.mjs --evidence integrations/stage2-mcp-evidence.json
```

The demo prints JSON to stdout. Redirect it to a local report file if needed.
`--mock` uses deterministic synthetic inputs and makes no network calls. Its PASS
does not prove authenticated Mainnet access. Live mode uses the existing Tatum
gRPC reader; a missing TATUM_API_KEY produces BLOCKED and exit code 1.

`createReport` accepts a read-only `recall({namespace, query, limit})` adapter.
It accepts official MCP `content` text responses or `{records: [{text}]}`.
Verification requires equality with the full expected test record, not just its ID.
No authentication flow is changed. The standalone live demo has no connected MCP
adapter and honestly reports Walrus BLOCKED. Health alone is not recall proof.
Only allowlisted provenance fields and the exact verified public test text are
reported. Unexpected memory bodies and upstream errors are excluded.
Checkpoints are provenance, never price or trade signals.

`stage2-mcp-evidence.json` records the actual official MCP observation from this
session. Health is normalized to status/version, excluding account identifiers.
`--evidence` replays that observation and labels it RECORDED_MCP_REPLAY with its
original UTC observation time. It is not a new live recall and is not proof of a
blob receipt. The Tatum read remains live and separately reports its own status.
`stage2-report.json` is the generated combined report: Walrus exact text PASS,
Tatum BLOCKED with checkpointHeight=null because no key is available in the
process, Windows User or Windows Machine environment. No height is invented.

During this Stage 2 session, the connected official memwal_recall tool returned
`WAL-SENTINEL-MAINNET-TEST-20261103-001` in namespace
`wal-sentinel-memory-v1` (written date reported: 2026-11-03). This is a historical
recall observation, not a fresh write or independently verified blob receipt.
No blob ID was returned. No memory writes or transactions were performed.
