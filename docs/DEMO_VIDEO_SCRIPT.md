# WAL Sentinel Memory — 2:30 demo video script

**Status:** Recording script, **not** a completed video. The project is a research prototype. Do not state that ten Walrus Mainnet writes have been completed, that an independent blob receipt was verified, or that the end-to-end live integration has passed.

**Track:** Markets & Sports Prediction  
**Live public demo:** https://wal-sentinel-memory.vercel.app/  
**Source:** https://github.com/marrocofix-blip/wal-sentinel-memory  
**Story / published technical narrative:** https://wal-sentinel-memory.vercel.app/story.html

## Recording guide

| Time | On screen | Narration |
|---|---|---|
| 00:00–00:20 | Landing page; title, four status cards | “What if every market prediction had a memory? WAL Sentinel Memory is a research journal built for Total Recall. It connects market observations to later outcomes, while recording where the evidence came from.” |
| 00:20–00:40 | WAL/USDT 15m chart; point out provider and timestamp | “We start with public WAL spot data and completed 15-minute candles. The price feed is separate from Tatum’s Sui blockchain checkpoint. These are different types of evidence, and the interface doesn’t conflate them.” |
| 00:40–01:05 | Tatum checkpoint card; evidence ledger | “For the chain context, Tatum Sui Mainnet gRPC returned checkpoint 341126670 during a successful local verification on November 3. That observation is historical, clearly timestamped and not advertised as a constantly refreshing chain height.” |
| 01:05–01:30 | Walrus memory card and evidence ledger | “For memory, the official Walrus Memory MCP returned the test record in namespace wal-sentinel-memory-v1. We verified the entire record text, not just its identifier. The next step is to produce independently verifiable write receipts and at least ten stored Mainnet memories.” |
| 01:30–01:55 | Prediction journal form; add a new prediction only if live market feed works | “The journal lets you record a direction and choose a future evaluation time. Predictions start pending. They are not counted as correct or incorrect before the corresponding market candle is actually available.” |
| 01:55–02:15 | Journal table, pending state, accuracy card | “This protects against hindsight bias. The app never manufactures success from missing market data. Right now the journal is local to the browser; persistence through Walrus is the remaining integration milestone.” |
| 02:15–02:30 | Project story, GitHub README, final demo homepage | “The code, tests and known limitations are public. WAL Sentinel Memory is an honest foundation for an auditable, memory-backed prediction learning loop.” |

## Checklist before publishing the actual video

- Record the **real public URL** and GitHub repository, not a fabricated mocked clip
- Keep the video 2–3 minutes; add English captions or narration
- Demonstrate a journal submission only when a real market feed is available
- If Binance data is unavailable, demonstrate the evidence ledger and state openly that the market source is temporarily unavailable
- Never show Tatum API keys, local wallets, private credentials, or unrelated projects
- Do not present test fixtures, replayed MCP evidence, or the historical checkpoint as a fresh Mainnet transaction
- Publish the completed MP4/video to an accessible location and add its real URL to the submission form

**No video has been recorded or uploaded by this file.**
