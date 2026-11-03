# Stage 2: read-only Tatum + Walrus

Preserved blocked live session, 2026-11-03: **INTEGRATION BLOCKED**.
TATUM_API_KEY was absent from Process, Windows User and Machine environments.
The real gRPC entry point was attempted but rejected before sending a request.
Checkpoint height and checkpoint UTC timestamp are therefore UNKNOWN (JSON null).
The report's UTC observation time is a local clock time, not a chain timestamp.

Official live MCP health and namespaced recall both passed. The complete returned
test text matched EXPECTED_TEXT exactly. Health has no namespace argument;
recall used wal-sentinel-memory-v1. No independent blob receipt was verified.

The combined stage2-report.json now records this session's LIVE MCP observations
separately from the MOCK tests/demo and the earlier RECORDED_MCP_REPLAY demo.
It is assembled from actual tool observations, not presented as a standalone
CLI live MCP connection. npm.cmd test: 8 PASS, 0 FAIL. Read-only live demo:
BLOCKED; mock demo: PASS; recorded replay: Walrus PASS, integration BLOCKED.
Only documentation and JSON evidence changed; no authentication code changed.
The existing Actions path filter excludes these files, so this documentation
commit does not establish a new CI run or authenticated Mainnet proof.

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

## Historical Tatum checkpoint update

`stage2-tatum-historical-observation.json` is a separate **HISTORICAL** observation
with source **USER_PROVIDED_POWERSHELL_OUTPUT**. The user reported a previous
successful Tatum Sui Mainnet gRPC run: checkpointHeight `341126670`, verifiedAt
`2026-11-03T07:19:38.100Z`, exit code `0`. The complete raw PowerShell transcript
was not supplied in this update. These values have not been independently
verified by a new request. `verifiedAt` is the historical local verification time,
not the checkpoint's chain timestamp; that timestamp remains UNKNOWN (`null`).

The earlier `stage2-report.json` and `stage2-mcp-evidence.json` remain byte-for-byte
unchanged. The blocked report describes its own session and is not superseded by
the user-reported success. No fresh Tatum check was performed for this update,
and no full LIVE integration PASS or authenticated Mainnet proof is established.

Evidence categories remain separate:

| Category | Evidence and meaning |
| --- | --- |
| LIVE | Original session observations in `stage2-report.json`: Tatum BLOCKED, official Walrus MCP recall/health PASS at their recorded times. These are not fresh checks for this update. |
| HISTORICAL | Separate user-provided Tatum checkpoint observation; reported success, not independently verified in this update. |
| MOCK | Synthetic unit tests/demo; no authenticated Mainnet proof. |
| REPLAY | `RECORDED_MCP_REPLAY` uses the preserved MCP evidence and original observation time; no fresh recall. |

Validation for this update: all three Stage 2 JSON evidence files parse
successfully; `npm.cmd test` passes 8 tests with 0 failures before and after the
change. Tests use mocks and do not authenticate to Mainnet. The Actions path
filter excludes these documentation/evidence paths, so no new CI run is expected.
READ-ONLY, PAPER ON, REAL ORDERS OFF; no memory writes or transactions.
