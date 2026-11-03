# Total Recall submission — factual readiness checklist

**Snapshot:** November 3, 2026.  
**Official rules:** https://thewalrussessions.wal.app/tatum-total-recall  
**Official submission form:** https://recall-tatum-walrus.vercel.app/  
**Deadline:** November 10, 2026 at 17:00 UTC (19:00 Bulgaria time).

## Project links

- Project name: **WAL Sentinel Memory**
- Track: **Markets & Sports Prediction**
- Public online demo: https://wal-sentinel-memory.vercel.app/
- Published technical story: https://wal-sentinel-memory.vercel.app/story.html
- GitHub: https://github.com/marrocofix-blip/wal-sentinel-memory
- Local dashboard: npm run dashboard

## Confirmed evidence

| Criterion | Evidence | Status |
|---|---|---|
| Public GitHub repository | Repository linked above | PASS |
| Public web app | Vercel production deployment accessible | PASS for static preview |
| Technical explanation published online | /story.html, as part of the demo | PASS for hosted project article |
| Automated regression tests | 30 passing in previously verified CI and local tests | PASS on earlier commit; re-check latest |
| Tatum Sui onchain data | Real local gRPC checkpoint 341126670 observed at 2026-11-03T07:19:38.100Z | HISTORICAL PASS, not combined live |
| Walrus Memory retrieval | Official MCP named namespace and exact full record recalled | PASS for retrieval only |
| Independently verified blob receipt | No blob ID / receipt provided | UNVERIFIED |
| Minimum 10 **real Mainnet** memories | Guarded ten-episode relayer pipeline prepared; GitHub credential initialization failed on prior diagnostic, no verified receipts | **NOT MET** |
| Memory-backed cross-session predictions | Currently browser localStorage | **NOT MET** |
| Continuous live integrated Tatum + Walrus workflow | No simultaneous live proof | **NOT MET** |
| Actual 2–3 min demo video | A 2:30 narrated illustrative MP4 was generated locally for review; not publicly hosted and not verified as an authentic live screen recording | **NOT MET** |
| Official submitted application | No confirmed submission | **NOT MET** |

## Identity and form fields — supply from account dashboards

Do not fabricate or paste sensitive credentials into GitHub. The official form requires contact details, Discord handle, LinkedIn, Tatum dashboard account ID, Sui address, Sui account ID and MEMWAL_AGENT_ID, plus project description, experience feedback, GitHub repo and a **real** video link. Verify these values independently and avoid confusing Walrus delegate public key with a private key.

## Recommended application description

WAL Sentinel Memory is a research-oriented prediction journal that makes the provenance of market assumptions and outcomes inspectable. It uses Tatum's Sui Mainnet gRPC service for read-only chain context and integrates Walrus Memory MCP retrieval as the foundation for persistent learning. The current prototype visualizes public WAL/USDT 15-minute candles and evaluates predictions only after their target candles close. The application labels historical, recorded and live observations separately, avoiding fabricated accuracy and chain-proof claims. At this snapshot the Mainnet write-count and cross-session memory loop requirements remain incomplete.

## Submission rule

**Do not submit as compliant yet.** A public dashboard alone does not satisfy the requirement for at least 10 Mainnet memories and a memory-backed learning loop. A prior authorization covered exactly one Mainnet memory write; do not repeat it or authorize additional paid writes implicitly. Make any new Mainnet write only upon separate, explicit approval and confirmation of account/network costs.

## Follow-up technical priorities

1. Resolve the existing GitHub Secrets credential format or mismatched account/delegate pairing without exposing secrets. Existing read-only identity diagnostic failed before SDK initialization (2026-11-03).
2. Review `integrations/learning-loop.mjs` and `docs/MAINNET_MEMORY_RUNBOOK.md`, which prepare ten distinct retrospective market-research episodes. Run read-only verification before any sponsored Mainnet memory writes; require actual distinct blob receipts.
3. Integrate actual memory recall at prediction-evaluation time, with evidence across sessions.
4. Review the generated narrated 2:30 illustrative MP4 and produce a real live-site screen recording to strengthen the application. Publish only the verified final video.
5. Validate account identifiers and complete the official submission before the deadline.


## Progress update — 2026-11-03

- Live Vercel dashboard and no-key OHLC API deployed at the public URL above.
- Historical closed-candle Walrus learning loop and mock-only test suite committed in GitHub, but no new on-chain writes or verified receipts completed.
- Existing repository GitHub Actions Walrus diagnostic has required Secrets configured, but step `Derive SDK public key, compare Dashboard references and authenticate` failed with `Read-only identity diagnostic could not initialize; check credential format`. The secret values are unavailable to the assistant and must not be copied to chat or committed. The official SDK accepts a registered delegate private key and matching MemWalAccount object ID; mismatched or malformed credentials cannot be repaired by inventing replacements.
- A narrated illustrative video MP4 has been generated in the ChatGPT conversation but is not an authenticated live-screen capture or externally hosted YouTube/video submission link.
- **No official submission is claimed.**
