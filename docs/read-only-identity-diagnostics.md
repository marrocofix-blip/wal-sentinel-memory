# Read-only Mainnet identity diagnostics

Run `node integrations/memory-diagnostics.mjs` in a trusted runtime.
The GitHub workflow runs this after `npm test`, using only step-scoped Secrets.
It calls the official MemWal SDK `getPublicKeyHex()`, public health and signed recall.
There are no write, delegate registration or transaction calls.

## Dashboard reference values

In the Mainnet Dashboard, locate the delegate labeled WAL-SENTINEL-MAINNET.
Copy its **Ed25519 public key**, not the derived wallet address, and the Memory
account object ID displayed for that same account into these repository Actions variables:
- MEMWAL_EXPECTED_DELEGATE_PUBLIC_KEY
- MEMWAL_EXPECTED_ACCOUNT_ID

These references must be obtained independently from the Dashboard; do not copy
them from the Secrets under test. Never put the private key in either variable.
No global Codex or other project configuration is changed.

The runner derives the public key from MEMWAL_PRIVATE_KEY through the SDK and
compares it to the public reference. It independently compares MEMWAL_ACCOUNT_ID
to the Dashboard account reference. The output prints MATCH, MISMATCH, INVALID
or UNVERIFIED, and only truncated SHA-256 fingerprints of actual identities.

A missing Dashboard reference is UNVERIFIED, never MATCH or MISMATCH.
A matching key and account reference plus successful authenticated recall produce
dashboardAccountPair=PASS. HTTP 401 gives accountDelegateAuthorization=FAIL.
Public health and local key derivation alone do not prove authorization.

The account comparison confirms equality with the account observed in Dashboard.
It does not independently audit on-chain wallet ownership. Confirm the logged-in
Dashboard wallet owns that account; do not use a wallet address as the Memory account ID.

The CLI exits nonzero unless all Dashboard pair checks and health pass.
No raw SDK/server errors, Secret values, full account IDs or full public keys
are printed. Only synthetic data is used in tests/memory-diagnostics.test.mjs.

## Current observation limitation

Browser access to Dashboard was unavailable in the authoring session.
No reference key or account ID was invented. Until verified Dashboard reference
values are supplied, their comparison remains UNVERIFIED.
