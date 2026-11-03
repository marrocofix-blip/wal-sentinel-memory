# Mainnet verification status

Only repository: marrocofix-blip/wal-sentinel-memory.
Project namespace: wal-sentinel-memory-v1.
Relayer: https://relayer.memory.walrus.xyz.

## Observed evidence

Actions run 41585131982, job 125748745617:
- PASS: repository Secrets MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY are nonempty.
- PASS: Node 22.23.4 and dependency installation.
- PASS: public relayer health.
- FAIL: authenticated recall, HTTP 401.
- NOT VERIFIED: successful Mainnet write and retrieval.
- NOT VERIFIED: ten stored Mainnet policies. The source contains ten prepared unique policies; these are not storage proofs.

GitHub API reports pull=true and push=true. No private key values were read or published.
No memwal_* MCP tools are exposed in the current agent session.
The local checkout is readable, but this session only permits local writes under C:\Users\Dell; changes are published through GitHub instead.
The local memory.mjs is older than main (its health action checks only public health).

## Authentication recovery

A 401 does not identify its own exact cause. Do not assume changing HTTP headers fixes it.
At https://memory.walrus.xyz verify that:
1. The account is on Mainnet.
2. Account ID is the Walrus Memory account object ID, not a wallet address.
3. The Ed25519 delegate key is registered, active and belongs to that account.

Replace the repository Secrets MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY from the same Mainnet account using GitHub Settings > Secrets and variables > Actions.
Do not paste values into an issue, CLI argument, artifact or chat.
GitHub does not provide secret plaintext for retrieval; the workflow consumes Secrets directly as step environment variables.
Run the workflow manually for an authenticated recall check. An empty recall is still a valid authentication check, not evidence of a stored record.
Registering a new delegate may require a transaction; obtain cost approval first.

The client trims surrounding whitespace and validates account ID shape. This can repair formatting only; it cannot register a key or repair an incorrect account/key pairing.
Unexpected SDK errors are not printed verbatim.

## Tests and cost gate

npm test runs mocked tests. CI runs normal tests/*.test.mjs files through npm test without passing Secrets to dependency installation or tests.
Pushes to main and manual workflow runs on main additionally perform health plus authenticated recall using step-scoped GitHub Secrets.
No CI path writes memory.

After explicit approval of account usage costs, use a trusted runtime with the two credentials provided as environment variables:
- Preview prepared records without credentials: node integrations/memory.mjs prepare
- Set MEMWAL_ALLOW_PAID_WRITES=yes only after approval.
- First run: node integrations/memory.mjs smoke
- After successful smoke: node integrations/memory.mjs seed

Each write emits a job receipt, waits for a blob ID, then requires recall of the same blob ID and exact text.
The ten-policy seed requires ten distinct blob IDs. Save its final JSON output as evidence.
Exact existing texts are reused, but semantic recall is not a transactional uniqueness guarantee: serialize runs. After a timeout, inspect the emitted job before retrying.
The receipt proves SDK write completion plus relayer retrieval; it is not an independent on-chain transaction audit.

## Official Codex MCP setup

Reference: https://github.com/MystenLabs/walrus-memory/blob/dev/docs/mcp/codex.md
Integration skill: https://github.com/MystenLabs/walrus-memory/blob/dev/SKILL.md

Official MCP-only server: npx -y @mysten-incubation/memwal-mcp.
Official plugin: codex plugin marketplace add MystenLabs/MemWal, then codex plugin add memwal@memwal-plugins.
Do not install both. Restart Codex to expose memwal_* tools.
No global Codex configuration was changed by this work.

For project credential isolation follow the official project approval procedure:
https://github.com/MystenLabs/walrus-memory/blob/dev/docs/mcp/reference.md#credential-locations
Never commit .memwal/credentials.json; ignore the entire .memwal/ directory.
Do not enable automatic memory writes until their usage costs are approved.
