import { readFile } from 'node:fs/promises';
import { createReport, EXPECTED_TEXT } from './unified.mjs';

const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 1 && args[0] === '--mock') ||
    (args.length === 2 && args[0] === '--evidence'))) {
  console.error('Usage: node integrations/demo.mjs [--mock | --evidence path.json]');
  process.exitCode = 1;
} else {
  const mocked = args.includes('--mock');
  const options = mocked ? {
    apiKey: 'mock-only', now: () => '2026-11-03T00:00:00.000Z',
    tatumRead: async () => ({ provider: 'Tatum', network: 'sui-mainnet', protocol: 'grpc', checkpointHeight: '123' }),
    recall: async () => ({ records: [{ text: EXPECTED_TEXT }] }),
  } : {};
  let observedAt;
  if (args[0] === '--evidence') {
    const evidence = JSON.parse(await readFile(args[1], 'utf8'));
    if (evidence.source !== 'official-memwal-mcp' ||
        !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(evidence.observedAt) ||
        !Number.isFinite(Date.parse(evidence.observedAt))) throw Error('Invalid evidence');
    observedAt = evidence.observedAt;
    options.health = async () => evidence.health;
    options.recall = async () => evidence.recall;
  }
  const report = await createReport(options);
  if (observedAt) {
    report.walrus.observedAt = observedAt;
    report.walrus.evidence = 'recorded-official-mcp-observation';
    report.walrusHealth.observedAt = observedAt;
  }
  console.log(JSON.stringify({ ...report, execution: mocked ? 'MOCK' : 'LIVE',
    walrusExecution: observedAt ? 'RECORDED_MCP_REPLAY' : mocked ? 'MOCK' : 'UNAVAILABLE',
    authenticatedMainnetProof: false }, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
