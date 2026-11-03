import test from 'node:test';
import assert from 'node:assert/strict';
import { createReport, NAMESPACE, TEST_RECORD } from './unified.mjs';

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
      return { records: [{ text: `${TEST_RECORD} | fixture`, private: 'do not output' }] };
    } });
  assert.equal(report.status, 'PASS');
  assert.equal(report.walrus.evidence, 'recall-only');
  assert.equal(report.tatum.checkpointHeight, '123');
  assert.doesNotMatch(JSON.stringify(report), /secret-fixture|do not output/);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
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
