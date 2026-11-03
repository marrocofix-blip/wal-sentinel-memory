// Read-only orchestration. Inject only a recall function, never a write client.
export const NAMESPACE = 'wal-sentinel-memory-v1';
export const TEST_RECORD = 'WAL-SENTINEL-MAINNET-TEST-20261103-001';

export async function createReport({
  apiKey = process.env.TATUM_API_KEY,
  tatumRead = async key => (await import('./tatum-grpc.mjs')).checkTatumGrpc(key),
  recall,
  now = () => new Date().toISOString(),
} = {}) {
  const report = {
    schemaVersion: 1, generatedAt: now(),
    mode: { readOnly: true, paper: true, realOrders: false },
    marketSignal: 'UNKNOWN',
    tatum: { status: 'BLOCKED', reason: 'TATUM_API_KEY missing' },
    walrus: { status: 'BLOCKED', namespace: NAMESPACE, reason: 'Recall adapter unavailable' },
  };
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
      report.tatum = { status: 'UNKNOWN', reason: 'Tatum read failed or returned invalid provenance' };
    }
  }
  if (recall) {
    try {
      const result = await recall({ namespace: NAMESPACE, query: TEST_RECORD, limit: 5 });
      const found = Array.isArray(result?.records) && result.records.some(record =>
        typeof record?.text === 'string' && record.text.split(/\s|\|/)[0] === TEST_RECORD);
      report.walrus = { status: found ? 'PASS' : 'UNKNOWN', namespace: NAMESPACE,
        recordId: TEST_RECORD, recalled: found, evidence: 'recall-only', observedAt: now() };
    } catch {
      report.walrus = { status: 'UNKNOWN', namespace: NAMESPACE, reason: 'Walrus recall failed' };
    }
  }
  report.status = report.tatum.status === 'PASS' && report.walrus.status === 'PASS' ? 'PASS' :
    [report.tatum.status, report.walrus.status].includes('BLOCKED') ? 'BLOCKED' : 'UNKNOWN';
  return report;
}
