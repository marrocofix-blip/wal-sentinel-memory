import test from 'node:test';
import assert from 'node:assert/strict';
import { createReport, NAMESPACE, TEST_RECORD, EXPECTED_TEXT } from './unified.mjs';

const now = () => '2026-11-03T00:00:00.000Z';
const provenance = { provider: 'Tatum', network: 'sui-mainnet', protocol: 'grpc', checkpointHeight: '123' };
test('missing configuration blocks reads with safe defaults', async () => {
  const report = await createReport({ apiKey: '', now, tatumRead: () => assert.fail('must not call') });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.marketSignal, 'UNKNOWN');
  assert.deepEqual(report.mode, { readOnly: true, paper: true, realOrders: false });
  assert.equal(report.generatedAt, now());
});
test('combines provenance and exact namespaced recall; excludes raw payloads', async () => {
  const report = await createReport({ apiKey: 'secret-fixture', now,
    tatumRead: async key => { assert.equal(key, 'secret-fixture'); return { ...provenance, secret: key }; },
    recall: async args => {
      assert.deepEqual(args, { namespace: NAMESPACE, query: TEST_RECORD, limit: 5 });
      return { records: [{ text: EXPECTED_TEXT, private: 'do not output' }] };
    } });
  assert.equal(report.status, 'PASS');
  assert.equal(report.walrus.evidence, 'recall-only');
  assert.equal(report.walrus.exactTextVerified, true);
  assert.equal(report.walrus.recalledMemory, EXPECTED_TEXT);
  assert.equal(report.tatum.checkpointHeight, '123');
  assert.doesNotMatch(JSON.stringify(report), /secret-fixture|do not output/);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
});
test('official MCP display is normalized and verified exactly', async () => {
  const report = await createReport({ apiKey: '', now,
    health: async () => ({ content: [{ type: 'text', text: 'Walrus Memory is reachable. status=ok version=0.1.0' }] }),
    recall: async () => ({ content: [{ type: 'text', text: `1. [score=0.828 distance=0.172] [written=2026-11-03] ${EXPECTED_TEXT}` }] }) });
  assert.equal(report.walrusHealth.status, 'PASS');
  assert.equal(report.walrus.status, 'PASS');
  assert.equal(report.status, 'BLOCKED');
});
test('same record ID with altered body is not exact verification or disclosed', async () => {
  const report = await createReport({ apiKey: '', now,
    recall: async () => ({ records: [{ text: `${TEST_RECORD} | private unexpected body` }] }) });
  assert.equal(report.walrus.recalled, true);
  assert.equal(report.walrus.exactTextVerified, false);
  assert.equal(report.walrus.recalledMemory, null);
  assert.equal(report.walrus.status, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(report), /private unexpected body/);
});
test('health alone and MCP errors cannot prove recall', async () => {
  const report = await createReport({ apiKey: '', now, health: async () => ({ status: 'ok' }),
    recall: async () => ({ isError: true, records: [{ text: EXPECTED_TEXT }] }) });
  assert.equal(report.walrusHealth.status, 'PASS');
  assert.equal(report.walrus.status, 'UNKNOWN');
});
test('provider errors never leak credentials and recall still runs', async () => {
  const report = await createReport({ apiKey: 'sensitive', now,
    tatumRead: async () => { throw Error('sensitive'); },
    recall: async () => { throw Error('sensitive'); } });
  assert.equal(report.status, 'UNKNOWN');
  assert.equal(report.walrus.status, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(report), /sensitive/);
});
test('rejects malformed checkpoints and empty or similar recall records', async () => {
  for (const value of [null, {}, { ...provenance, checkpointHeight: '-1' }, { ...provenance, network: 'other' }]) {
    const report = await createReport({ apiKey: 'mock', now, tatumRead: async () => value,
      recall: async () => ({ records: [{ text: TEST_RECORD + '-OTHER' }] }) });
    assert.equal(report.tatum.status, 'UNKNOWN');
    assert.equal(report.walrus.recalled, false);
  }
});
test('missing recall match does not establish stored memory', async () => {
  for (const result of [null, {}, { records: [] }]) {
    const report = await createReport({ apiKey: 'mock', now, tatumRead: async () => provenance, recall: async () => result });
    assert.equal(report.status, 'UNKNOWN');
    assert.equal(report.walrus.status, 'UNKNOWN');
  }
});
