import { readFile } from 'node:fs/promises';
const ROOT = new URL('../integrations/', import.meta.url);
const load = async name => JSON.parse(await readFile(new URL(name, ROOT), 'utf8'));
export const safeIso = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) ? s : null;
export function evaluatePredictions(predictions, candles) {
  if (!Array.isArray(predictions) || !Array.isArray(candles)) return [];
  const byTime = new Map(candles.map(c => [Number(c.closeTime), Number(c.close)]));
  return predictions.map(p => {
    const direction = p.direction === 'UP' || p.direction === 'DOWN' ? p.direction : null;
    const base = Number(p.entryPrice), target = Number(p.targetCloseTime), created = safeIso(p.predictedAt);
    const valid = direction && created && Number.isFinite(base) && base > 0 && Number.isFinite(target) && target > Date.parse(created);
    const actual = valid ? byTime.get(target) : undefined;
    const result = !valid ? 'INVALID' : !Number.isFinite(actual) ? 'PENDING' : (direction === 'UP' ? actual > base : actual < base) ? 'CORRECT' : 'INCORRECT';
    return { id: String(p.id || '').slice(0,80), predictedAt: created, direction, entryPrice: valid ? base : null, targetCloseTime: valid ? target : null, actualClose: Number.isFinite(actual) ? actual : null, result, provenance: 'LOCAL_USER_JOURNAL' };
  });
}
export function accuracy(rows) {
  const done = rows.filter(r => r.result === 'CORRECT' || r.result === 'INCORRECT');
  return { evaluated: done.length, correct: done.filter(r => r.result === 'CORRECT').length, percentage: done.length ? Math.round(100 * done.filter(r => r.result === 'CORRECT').length / done.length) : null };
}
export function parseBinanceCandles(payload) {
  if (!Array.isArray(payload)) throw Error('Unexpected market response');
  return payload.filter(r => Array.isArray(r) && r.length >= 7)
    .map(r => ({ openTime: Number(r[0]), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]), closeTime: Number(r[6]) }))
    .filter(c => [c.openTime,c.closeTime,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite) && c.openTime < c.closeTime && c.open > 0 && c.close > 0)
    .sort((a,b) => a.openTime - b.openTime);
}
export async function historicalEvidence() {
  const [tatum, walrus, stage2] = await Promise.all([load('stage2-tatum-historical-observation.json'),load('stage2-mcp-evidence.json'),load('stage2-report.json')]);
  return {
    tatum: { status: 'HISTORICAL', checkpointHeight: String(tatum.checkpointHeight), observedAt: tatum.verifiedAt, source: tatum.source, fresh: false, checkpointChainTimestamp: null },
    walrus: { status: stage2.walrus?.exactTextVerified ? 'PASS' : 'UNKNOWN', source: 'RECORDED_MCP_OBSERVATION', observedAt: walrus.observedAt, namespace: stage2.walrus?.namespace, recordId: stage2.walrus?.recordId, exactTextVerified: !!stage2.walrus?.exactTextVerified, blobProofVerified: false, fresh: false },
    integration: { status: 'NOT_VERIFIED_LIVE', reason: 'Historical Tatum and recorded Walrus evidence are not a simultaneous live integration.' },
    mode: { readOnly: true, realOrders: false, newWalrusWrites: 0 },
  };
}
