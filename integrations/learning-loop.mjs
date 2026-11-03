// WAL SENTINEL MEMORY — real Walrus Mainnet research-memory loop.
// Uses the WAL/SUI gas-sponsored official managed relayer. No wallets or orders.
// This file NEVER prints private keys and NEVER writes on import or by default.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { normalizeBinance, normalizeGate } from '../dashboard/market-data.mjs';

export const NAMESPACE='wal-sentinel-memory-v1';
export const RELAYER='https://relayer.memory.walrus.xyz';
export const ANCHOR=Date.parse('2026-11-03T07:00:00.000Z');
export const ALLOW_WRITES='I_AUTHORIZE_TEN_RELAYER_MEMORY_WRITES';
const OUT='reports/mainnet-learning-receipts.json';
const ISO=ms=>new Date(ms).toISOString();
const fmt=n=>Number(n).toFixed(8);
const digest=text=>createHash('sha256').update(text).digest('hex');
const safeResult=(status,reason='')=>({status,reason,namespace:NAMESPACE,network:'sui-mainnet',relayer:RELAYER});
function noSecrets(error){const code=Number(error?.status)||Number(error?.statusCode)||null;return code===401||/\b401\b/.test(String(error?.message||''))?'AUTHENTICATION_REJECTED':'RELAYED_OPERATION_FAILED';}

export function episodesFromCandles(candles,provider,anchor=ANCHOR) {
  if(!Array.isArray(candles))throw Error('Market evidence unavailable');
  if(!['Binance Spot','Gate Spot'].includes(provider))throw Error('Unapproved market source');
  const valid=candles.filter(c=>c.openTime<anchor && c.closeTime<anchor && Number.isFinite(c.close) && c.close>0)
    .sort((a,b)=>a.openTime-b.openTime);
  // Each episode uses three consecutive *already closed* 15-minute bars.
  const episodes=[];
  for(let i=1;i<valid.length-1;i++){
    const p=valid[i-1],c=valid[i],n=valid[i+1];
    if(c.openTime-p.openTime!==900000||n.openTime-c.openTime!==900000)continue;
    if(![p.close,c.close,n.close].every(x=>Number.isFinite(x)&&x>0))continue;
    const direction=c.close>p.close?'UP':c.close<p.close?'DOWN':'FLAT';
    if(direction==='FLAT')continue;
    const actual=n.close>c.close?'UP':n.close<c.close?'DOWN':'FLAT';
    const correct=actual===direction;
    const id='WSM-V1-'+new Date(c.closeTime).toISOString().replace(/[-:.]/g,'').replace('T','-').replace('Z','');
    const text=[
      id,
      'WAL Sentinel historical market research memory, NOT a live prediction or investment advice.',
      'Market WAL/USDT; timeframe 15m; source '+provider+';',
      'evidence previous close '+fmt(p.close)+' at '+ISO(p.closeTime)+';',
      'signal close '+fmt(c.close)+' at '+ISO(c.closeTime)+';',
      'one-candle momentum-continuation baseline '+direction+';',
      'next observed close '+fmt(n.close)+' at '+ISO(n.closeTime)+';',
      'observed next direction '+actual+';',
      'outcome '+(correct?'CORRECT':'INCORRECT')+';',
      'lesson '+(correct?'one instance of momentum continuation':'one instance where momentum continuation did not hold')+'.'
    ].join(' ');
    episodes.push({id,source:provider,openTime:c.openTime,closeTime:c.closeTime,
      direction,actual,correct,text,hash:digest(text)});
  }
  const final=episodes.slice(-10);
  if(final.length!==10||new Set(final.map(e=>e.id)).size!==10)throw Error('Insufficient ten distinct consecutive real market episodes');
  return final;
}
export async function fetchHistoricalEpisodes(fetcher=fetch){
  const timeout=()=>AbortSignal.timeout(14000);
  const binance=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
  for(const host of binance){
    try{
      const q='/api/v3/klines?symbol=WALUSDT&interval=15m&limit=100&endTime='+String(ANCHOR-1);
      const response=await fetcher(host+q,{signal:timeout()});
      if(!response.ok)continue;
      const candles=normalizeBinance(await response.json(),'15m',ANCHOR);
      return episodesFromCandles(candles,'Binance Spot',ANCHOR);
    }catch{/* another free source */}
  }
  try{
    const url='https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=WAL_USDT&interval=15m&from='+Math.floor((ANCHOR-48*3600000)/1000)+'&to='+Math.floor((ANCHOR-1)/1000);
    const response=await fetcher(url,{signal:timeout()});
    if(response.ok)return episodesFromCandles(normalizeGate(await response.json(),'15m',ANCHOR),'Gate Spot',ANCHOR);
  }catch{}
  throw Error('No verified historic WAL/USDT spot bars from free public providers');
}
export async function getClient(env=process.env,reader=readFile){
  let key=env.MEMWAL_PRIVATE_KEY?.trim(),accountId=env.MEMWAL_ACCOUNT_ID?.trim();
  if(!key||!accountId){
    try{
      const c=JSON.parse(await reader(join(homedir(),'.memwal','credentials.json'),'utf8'));
      key ||= c.delegatePrivateKey;
      accountId ||= c.accountId;
    }catch{}
  }
  if(!key||!accountId||!/^0x[0-9a-fA-F]{64}$/.test(accountId))throw Error('MEMWAL_AUTH_UNAVAILABLE');
  const {MemWal}=await import('@mysten-incubation/memwal');
  return MemWal.create({key,accountId,namespace:NAMESPACE,serverUrl:RELAYER});
}
export function summarize(records){
  const confirmed=records.filter(r=>r.status==='VERIFIED'&&r.blob_id);
  const unique=new Set(confirmed.map(r=>r.blob_id));
  const wins=confirmed.filter(r=>r.correct).length;
  return {confirmed:confirmed.length,uniqueBlobs:unique.size,
    observedMomentumCorrect:wins,observedMomentumIncorrect:confirmed.length-wins,
    historicalBaselineAccuracy:confirmed.length?Math.round(wins/confirmed.length*100):null,
    learningUse:'Historical momentum outcome baseline; NOT proof of forecasting skill.'};
}
async function persist(report,write=writeFile){
  await mkdir('reports',{recursive:true});
  await write(OUT,JSON.stringify(report,null,2)+'\n',{mode:0o600});
}
export async function run({action='prepare',env=process.env,fetcher=fetch,memwal=null,writeReport=writeFile,now=()=>new Date().toISOString()}={}){
  const episodes=await fetchHistoricalEpisodes(fetcher);
  const base={schemaVersion:1,generatedAt:now(),source:'AUTHENTIC_SPOT_CLOSED_CANDLES',
    anchoredAt:ISO(ANCHOR),execution:action==='seed'?'LIVE_MCP_SDK_WRITE_ATTEMPT':'READ_ONLY_PREVIEW',
    namespace:NAMESPACE,relayer:RELAYER,network:'sui-mainnet',mainnetWriteCountClaim:0,
    records:episodes.map(e=>({id:e.id,source:e.source,closeTime:ISO(e.closeTime),direction:e.direction,
      actual:e.actual,correct:e.correct,textHash:e.hash,status:'UNVERIFIED'}))};
  if(action==='prepare')return {report:base,episodes};
  if(!['verify','seed'].includes(action))throw Error('Unknown command');
  if(action==='seed' && env.MEMWAL_ALLOW_MAINNET_WRITES!==ALLOW_WRITES)throw Error('MAINNET_WRITE_GUARD_DISABLED');
  const client=memwal||await getClient(env);
  // Signed authentication check before any writes.
  await client.recall({query:'WAL Sentinel historical market research memory',limit:1,namespace:NAMESPACE});
  const receipts=[];
  for(const episode of episodes){
    const result={id:episode.id,source:episode.source,closeTime:ISO(episode.closeTime),
      direction:episode.direction,actual:episode.actual,correct:episode.correct,textHash:episode.hash,
      status:'UNVERIFIED'};
    try{
      let matches=(await client.recall({query:episode.text,limit:100,namespace:NAMESPACE})).results||[];
      let hit=matches.find(m=>m.text===episode.text&&typeof m.blob_id==='string'&&m.blob_id.length>5);
      if(hit){result.blob_id=hit.blob_id;result.status='VERIFIED';result.reused=true}
      else if(action==='seed'){
        // One accepted job is *never* submitted again on uncertainty or timeout.
        const job=await client.remember(episode.text);
        result.job_id=job.job_id;
        result.status='ACCEPTED';
        receipts.push(result);
        base.records=receipts;
        await persist(base,writeReport);
        const stored=await client.waitForRememberJob(job.job_id,{timeoutMs:120000});
        if(typeof stored.blob_id!=='string'||stored.blob_id.length<6)throw Error('BLOB_ID_NOT_RETURNED');
        matches=(await client.recall({query:episode.text,limit:100,namespace:NAMESPACE})).results||[];
        hit=matches.find(m=>m.text===episode.text&&m.blob_id===stored.blob_id);
        if(!hit)throw Error('EXACT_RECALL_FAILED');
        result.blob_id=stored.blob_id;result.status='VERIFIED';result.reused=false;
        receipts.pop();
      }else{result.status='NOT_FOUND'}
    }catch(error){
      result.status=result.status==='ACCEPTED'?'UNCERTAIN_ACCEPTED':'READ_FAILED';
      result.errorCode=noSecrets(error);receipts.push(result);
      base.records=receipts;base.summary=summarize(receipts);
      base.mainnetWriteCountClaim=base.summary.uniqueBlobs;
      await persist(base,writeReport);
      throw Error('STOPPED_AFTER_'+result.status+'_'+result.errorCode+'; investigate job id without retrying');
    }
    receipts.push(result);base.records=receipts;base.summary=summarize(receipts);
    base.mainnetWriteCountClaim=base.summary.uniqueBlobs;
    await persist(base,writeReport);
    if(result.status!=='VERIFIED'&&action==='seed')throw Error('UNVERIFIED_MEMORY_STOPPED');
  }
  base.completedAt=now();
  base.execution=action==='seed'?'LIVE_MANAGED_RELAYER_VERIFIED':'LIVE_MANAGED_RELAYER_READ_ONLY_VERIFIED';
  base.status=base.summary?.uniqueBlobs===10?'VERIFIED_10_BLOBS':'INCOMPLETE';
  await persist(base,writeReport);
  return {report:base,episodes};
}
async function main(){
  const action=process.argv[2]||'prepare';
  try{
    const {report,episodes}=await run({action});
    if(action==='prepare')console.log(JSON.stringify({status:'PREPARED_NOT_WRITTEN',count:episodes.length,
      source:episodes[0]?.source,anchor:ISO(ANCHOR),ids:episodes.map(e=>e.id)},null,2));
    else console.log(JSON.stringify({status:report.status,summary:report.summary,reportFile:OUT,
      noTrading:true,freeRelayer:true},null,2));
  }catch(e){
    const reason=String(e?.message||'').startsWith('STOPPED_AFTER_')?String(e.message):
      e.message==='MEMWAL_AUTH_UNAVAILABLE'?'NO_LOCAL_MEMWAL_CREDENTIALS':
      e.message==='MAINNET_WRITE_GUARD_DISABLED'?'WRITE_GUARD_DISABLED':
      'PREPARATION_OR_AUTHENTICATION_FAILED';
    console.error('WAL MEMORY LOOP:',reason);
    process.exitCode=1;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
