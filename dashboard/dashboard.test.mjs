import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePredictions, accuracy, parseBinanceCandles, historicalEvidence } from './core.mjs';
import { publicCandles } from './server.mjs';

const bar = (time, close) => [time, '0.040', '0.050', '0.030', String(close), '1234', time+899999, '', '', '', '', ''];
test('parses and sorts Binance 15m klines', () => {
  const items = parseBinanceCandles([bar(900000,0.041),bar(0,0.04)]);
  assert.equal(items.length,2);
  assert.equal(items[0].close,0.04);
  assert.equal(items[1].closeTime,1799999);
});
test('invalid candles are excluded', () => {
  assert.equal(parseBinanceCandles([bar(0,'NaN'), ['x'],bar(900000,0.042)]).length,1);
});
test('market adapter excludes unfinished candles and labels indicative provenance', async () => {
  const data = await publicCandles(async url => {
    assert.match(url,/symbol=WALUSDT/);
    return {ok:true,json: async()=>[bar(0,0.04),bar(900000,0.041)]};
  },1200000);
  assert.equal(data.candles.length,1);
  assert.equal(data.provider,'Binance');
  assert.equal(data.exchange,'NOT_REVOLUT_X');
});
test('market request failures do not invent candles', async()=>{
  await assert.rejects(publicCandles(async()=>({ok:false}),Date.now()));
});
test('prediction accuracy uses exact future candle timestamp',()=>{
  const target = Date.parse('2026-11-03T00:14:59.999Z');
  const rows = evaluatePredictions([
    {id:'a',predictedAt:'2026-11-03T00:00:00.000Z',direction:'UP',entryPrice:0.04,targetCloseTime:target},
    {id:'b',predictedAt:'2026-11-03T00:00:00.000Z',direction:'DOWN',entryPrice:0.04,targetCloseTime:target},
    {id:'c',predictedAt:'2026-11-03T00:00:00.000Z',direction:'UP',entryPrice:0.04,targetCloseTime:9999999}
  ],[{closeTime:target,close:0.041}]);
  assert.deepEqual(rows.map(x=>x.result),['CORRECT','INCORRECT','PENDING']);
  assert.deepEqual(accuracy(rows),{evaluated:2,correct:1,percentage:50});
});
test('no market observation means no accuracy score',()=>{
  const rows=evaluatePredictions([{id:'a',predictedAt:'2026-11-03T00:00:00Z',direction:'UP',entryPrice:.04,targetCloseTime:target999999}],[]);
  assert.equal(rows[0].result,'PENDING');
  assert.equal(accuracy(rows).percentage,null);
});
test('recorded evidence remains historical and never proves simultaneous live',async()=>{
  const r=await historicalEvidence();
  assert.equal(r.tatum.status,'HISTORICAL');
  assert.equal(r.tatum.fresh,false);
  assert.equal(r.walrus.source,'RECORDED_MCP_OBSERVATION');
  assert.equal(r.integration.status,'NOT_VERIFIED_LIVE');
  assert.equal(r.walrus.blobProofVerified,false);
  assert.equal(r.mode.realOrders,false);
});
