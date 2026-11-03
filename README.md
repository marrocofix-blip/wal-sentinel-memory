# WAL Sentinel Memory

Read-only market research and prediction journal prototype for the Walrus × Tatum Total Recall hackathon.

## Features
- Public WAL/USDT 15-minute candle monitoring (Binance indicative feed, **not** Revolut X)
- Simple prediction journal (demo only)
- Integration readiness checklist
- **No trades, wallets, or private keys**

## Run locally
```bash
pip install -r requirements.txt
streamlit run app.py
```


## Public demo and submission materials

**Live public demo:** https://wal-sentinel-memory.vercel.app/  
**Published project story:** https://wal-sentinel-memory.vercel.app/story.html  
**Demo video storyboard:** [docs/DEMO_VIDEO_SCRIPT.md](docs/DEMO_VIDEO_SCRIPT.md)  
**Submission readiness / missing requirements:** [docs/SUBMISSION_READINESS.md](docs/SUBMISSION_READINESS.md)

The public Vercel deployment is an independently published **static preview**. It has no server-side API keys or wallet access. It shows the previously verified historical Tatum observation and recorded Walrus MCP recall as such. It does **not** yet establish ten real Mainnet memories or a live memory-backed learning loop.

## Stage 3 — Evidence-first web dashboard

A redesigned, responsive read-only research terminal is included under `dashboard/`. It shows:
- a **historical** Tatum Sui Mainnet checkpoint (reported from a prior successful PowerShell session, **not a fresh live reading**);
- the **recorded** Walrus MCP exact-text recall evidence (not independent blob proof);
- actual, closed public WAL/USDT spot candles at **5m, 15m, 1h and 4h** (Binance Spot, Gate Spot fallback), with candle/line views, volume, EMA 9/30/200, RSI 14 and MACD 12/26/9. This is **indicative exchange market data**, not a Revolut X execution feed;
- an interactive browser-local 15-minute prediction journal with JSON export; a prediction stays **PENDING** until its exact target closed candle is available and can be evaluated;
- an optional **separate** live read-only Tatum gRPC check when `TATUM_API_KEY` is set in the local server process.

### Launch on your Windows PC

Open PowerShell in `D:\source\WAL_SENTINEL_MEMORY` **only after obtaining/updating the actual GitHub working tree** (a folder without `.git` is not synchronized with GitHub):

```powershell
npm.cmd install
npm.cmd run dashboard
```

Open **http://127.0.0.1:4173** in your browser.

To test:
```powershell
npm.cmd test
```

The dashboard server binds to **127.0.0.1** (local only). Its API uses GET-only routes; no server-side prediction writes, wallet operations, transactions, or real trading. Predictions are saved **only in the browser's local storage**, not in Walrus; clearing site data removes the journal. The public terminal prefers a same-origin no-key market endpoint (Vercel production or the local Node server) and falls back to official public spot sources; prices may be unavailable due to network/provider/region conditions and never use synthetic fallback. The journal is browser-local and can be exported as JSON but is not yet persisted in Walrus. Clicking the optional Tatum LIVE check requires a local `TATUM_API_KEY` in the **server process**; the key is never sent to the browser.

### Provenance and limitations

This dashboard is a **local prototype**, not yet an internet-hosted public demo. It does **not** claim a simultaneous live Tatum + Walrus check, an independently verified Walrus blob receipt, at least 10 Mainnet records, or a proven prediction-accuracy history. Tatum and Walrus prior evidence remains immutable and separately labeled. Market candles are public external data; they are not guaranteed available. Prediction evaluation is observational and not investment advice.

## Compliance — not completed
- [ ] Walrus Memory Mainnet read/write integration and evidence
- [ ] At least 10 real Mainnet memory records
- [ ] Tatum RPC usage for meaningful Sui on-chain data
- [ ] Memory-backed prediction evaluation across sessions
- [x] Public GitHub repository
- [x] Public live demo (static preview only; incomplete end-to-end integration)
- [ ] Published project story is available; actual 2–3-minute demo video not yet recorded
- [ ] Official hackathon submission

**This is an early prototype, not a completed hackathon entry.** Do not submit as compliant until live integrations and evidence are verified.
