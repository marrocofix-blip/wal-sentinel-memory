import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { historicalEvidence, parseBinanceCandles } from './core.mjs';

const PORT = Number(process.env.PORT || 4173);
const here = new URL('./', import.meta.url);
const respond = (res, status, data, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'" });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
};

export async function publicCandles(fetcher = fetch, now = Date.now()) {
  const url = 'https://api.binance.com/api/v3/klines?symbol=WALUSDT&interval=15m&limit=96';
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error('Public candle provider unavailable');
  const candles = parseBinanceCandles(await response.json()).filter(c => c.closeTime < now);
  if (!candles.length) throw Error('No verified closed public candles');
  return { status: 'PUBLIC_INDICATIVE', provider: 'Binance', market: 'WAL/USDT', timeframe: '15m', exchange: 'NOT_REVOLUT_X', observedAt: new Date(now).toISOString(), candles };
}

async function route(req, res) {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Read-only server: GET requests only' });
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/api/evidence') {
    try { return respond(res, 200, await historicalEvidence()); }
    catch { return respond(res, 503, { error: 'Evidence is unavailable', status: 'UNKNOWN' }); }
  }
  if (path === '/api/market') {
    try { return respond(res, 200, await publicCandles()); }
    catch { return respond(res, 503, { status: 'UNAVAILABLE', error: 'Public market source unavailable; do not substitute mock candles' }); }
  }
  if (path === '/api/tatum-live') {
    if (!process.env.TATUM_API_KEY) return respond(res, 503, { status: 'BLOCKED', reason: 'TATUM_API_KEY missing from dashboard server environment' });
    try {
      const { checkTatumGrpc } = await import('../integrations/tatum-grpc.mjs');
      const observation = await checkTatumGrpc();
      return respond(res, 200, { status: 'PASS', execution: 'LIVE', observedAt: observation.verifiedAt, provider: observation.provider, network: observation.network, checkpointHeight: observation.checkpointHeight, protocol: observation.protocol });
    } catch { return respond(res, 503, { status: 'UNKNOWN', reason: 'Tatum check failed (upstream diagnostics withheld to protect credentials)' }); }
  }
  if (path === '/' || path === '/index.html' || path === '/app.js' || path === '/styles.css') {
    const name = path === '/' ? 'index.html' : path.slice(1);
    try {
      const body = await readFile(new URL(name, here), 'utf8');
      const type = name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      return respond(res, 200, body, type);
    } catch { return respond(res, 404, { error: 'Not found' }); }
  }
  respond(res, 404, { error: 'Not found' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  http.createServer((req, res) => { route(req, res).catch(() => respond(res, 500, { error: 'Unexpected server error' })); }).listen(PORT, '127.0.0.1', () => {
    console.log('WAL SENTINEL MEMORY dashboard: http://127.0.0.1:' + PORT);
  });
}
