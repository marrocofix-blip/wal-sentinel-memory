// Read-only orchestration. Inject only a recall function, never a write client.
export const NAMESPACE = 'wal-sentinel-memory-v1';
export const TEST_RECORD = 'WAL-SENTINEL-MAINNET-TEST-20261103-001';
export const EXPECTED_TEXT = `${TEST_RECORD} | WAL SENTINEL MEMORY persistent memory verification. This is a single authorized test record. No trading, no private credentials, no financial instructions.`;

// Official MCP displays rank metadata before the decrypted text. Never use
// substring matching: a matching ID with modified body must fail verification.
export function normalizeRecall(result) {
  if (result?.isError) throw new Error('Recall rejected');
  if (Array.isArray(result?.records)) return result;
  const records = (result?.content ?? []).filter(item => item.type === 'text')
    .flatMap(item => item.text.split('\n'))
    .map(line => line.replace(/^\d+\. \[score=[^\]]+\] \[written=[^\]]+\] /, ''))
    .map(text => ({ text }));
  return { records };
}

export async function createReport({
  apiKey = process.env.TATUM_API_KEY,
  tatumRead = async key => (await import('./tatum-grpc.mjs')).checkTatumGrpc(key),
  recall,
  health,
  now = () => new Date().toISOString(),
} = {}) {
  const report = {
    schemaVersion: 2, generatedAt: now(),
    mode: { readOnly: true, paper: true, realOrders: false },
    marketSignal: 'UNKNOWN',
    tatum: { status: 'BLOCKED', checkpointHeight: null, reason: 'TATUM_API_KEY missing' },
    walrus: { status: 'BLOCKED', namespace: NAMESPACE, reason: 'Recall adapter unavailable' },
  };
  if (health) {
    try {
      const result = await health();
      const ok = !result?.isError && (result?.status === 'ok' ||
        result?.content?.some(item => item.type === 'text' && /\bstatus=ok\b/.test(item.text)));
      report.walrusHealth = { status: ok ? 'PASS' : 'UNKNOWN', observedAt: now() };
    } catch {
      report.walrusHealth = { status: 'UNKNOWN', observedAt: now() };
    }
  }
  if (apiKey) {
    try {
      const data = await tatumRead(apiKey);
      if (data?.provider !== 'Tatum' || data?.network !== 'sui-mainnet' ||
          data?.protocol !== 'grpc' || !/^\d+$/.test(data?.checkpointHeight ?? '')) {
        throw new Error('Invalid provenance');
      }
      report.tatum = { status: 'PASS', provider: 'Tatum', network: 'sui-mainnet',
        protocol: 'grpc', checkpointHeight: String(data.checkpointHeight), observedAt: now() };
    } catch {
      // Never serialize upstream errors: providers may echo credentials.
      report.tatum = { status: 'UNKNOWN', checkpointHeight: null, reason: 'Tatum read failed or returned invalid provenance' };
    }
  }
  if (recall) {
    try {
      const result = normalizeRecall(await recall({ namespace: NAMESPACE, query: TEST_RECORD, limit: 5 }));
      const found = Array.isArray(result?.records) && result.records.some(record =>
        typeof record?.text === 'string' && record.text.split(/\s|\|/)[0] === TEST_RECORD);
      const exactTextVerified = result.records?.some(record => record?.text === EXPECTED_TEXT) ?? false;
      report.walrus = { status: exactTextVerified ? 'PASS' : 'UNKNOWN', namespace: NAMESPACE,
        recordId: TEST_RECORD, recalled: found, exactTextVerified,
        recalledMemory: exactTextVerified ? EXPECTED_TEXT : null,
        evidence: 'recall-only', observedAt: now() };
    } catch {
      report.walrus = { status: 'UNKNOWN', namespace: NAMESPACE, reason: 'Walrus recall failed' };
    }
  }
  report.status = report.tatum.status === 'PASS' && report.walrus.status === 'PASS' ? 'PASS' :
    [report.tatum.status, report.walrus.status].includes('BLOCKED') ? 'BLOCKED' : 'UNKNOWN';
  return report;
}
