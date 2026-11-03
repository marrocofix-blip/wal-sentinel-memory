import { createReport, TEST_RECORD } from './unified.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--mock')) {
  console.error('Usage: node integrations/demo.mjs [--mock]');
  process.exitCode = 1;
} else {
  const mocked = args.includes('--mock');
  const options = mocked ? {
    apiKey: 'mock-only', now: () => '2026-11-03T00:00:00.000Z',
    tatumRead: async () => ({ provider: 'Tatum', network: 'sui-mainnet', protocol: 'grpc', checkpointHeight: '123' }),
    recall: async () => ({ records: [{ text: `${TEST_RECORD} | synthetic fixture` }] }),
  } : {};
  const report = await createReport(options);
  console.log(JSON.stringify({ ...report, execution: mocked ? 'MOCK' : 'LIVE',
    authenticatedMainnetProof: false }, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
