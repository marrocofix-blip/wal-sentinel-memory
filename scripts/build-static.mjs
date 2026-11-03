import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { historicalEvidence } from '../dashboard/core.mjs';
const root=resolve(process.cwd());
const out=resolve(root,'_site');
await mkdir(out,{recursive:true});
const html=(await readFile(resolve(root,'dashboard/index.html'),'utf8'))
  .replace('href="/styles.css"','href="./styles.css"')
  .replace('src="/app.js"','src="./app.js"');
const apiSource="async function api(url) { const r = await fetch(url, {cache:'no-store'}); const data = await r.json(); if (!r.ok) throw Error(data?.error || data?.reason || 'Request failed'); return data; }";
const staticApi="\nasync function api(url) {\n  if (url === '/api/tatum-live') throw Error('Live network checks are not enabled on the public site');\n  if (url === '/api/evidence') {\n    const r = await fetch('./evidence.json', {cache:'no-store'});\n    if (!r.ok) throw Error('Evidence unavailable');\n    return await r.json();\n  }\n  if (url === '/api/market') {\n    const now = Date.now();\n    const response=await fetch('https://api.binance.com/api/v3/klines?symbol=WALUSDT&interval=15m&limit=96', {cache:'no-store', signal:AbortSignal.timeout(12000)});\n    if(!response.ok) throw Error('Market feed unavailable');\n    const rows=await response.json();\n    if(!Array.isArray(rows)) throw Error('Unexpected market feed');\n    const candles=rows.filter(r=>Array.isArray(r)&&r.length>=7).map(r=>({\n      openTime:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5]),closeTime:Number(r[6])\n    })).filter(c=>[c.openTime,c.closeTime,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)&&c.openTime<c.closeTime&&c.open>0&&c.close>0&&c.closeTime<now)\n      .sort((a,b)=>a.openTime-b.openTime);\n    if(!candles.length) throw Error('No closed candles available');\n    return {status:'PUBLIC_INDICATIVE',provider:'Binance',market:'WAL/USDT',timeframe:'15m',observedAt:new Date(now).toISOString(),candles};\n  }\n  throw Error('Unsupported endpoint');\n}";
let app=await readFile(resolve(root,'dashboard/app.js'),'utf8');
if(!app.includes(apiSource)) throw Error('Dashboard API adapter changed: review static build before publishing');
app=app.replace(apiSource,staticApi);
const evidence=await historicalEvidence();
if(evidence.integration.status!=='NOT_VERIFIED_LIVE'||evidence.tatum.fresh!==false)throw Error('Provenance guard failed');
await Promise.all([
  writeFile(resolve(out,'index.html'),html),
  writeFile(resolve(out,'app.js'),app),
  copyFile(resolve(root,'dashboard/styles.css'),resolve(out,'styles.css')),
  writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n'),
  writeFile(resolve(out,'.nojekyll'),''),
  copyFile(resolve(root,'docs/story.html'),resolve(out,'story.html')),
]);
console.log('Static demo ready: '+out+' (historical + recorded evidence only)');
