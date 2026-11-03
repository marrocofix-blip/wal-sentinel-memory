import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { historicalEvidence } from '../dashboard/core.mjs';
const root=resolve(process.cwd());
const out=resolve(root,'_site');
await mkdir(out,{recursive:true});
const html=(await readFile(resolve(root,'dashboard/index.html'),'utf8'))
  .replace('href="/styles.css"','href="./styles.css"')
  .replace('src="/app.js"','src="./app.js"')
  .replace('href="/story.html"','href="./story.html"');
const app=await readFile(resolve(root,'dashboard/app.js'),'utf8');
if(!app.includes("from './market-data.mjs'")) throw Error('Market module import missing');
const evidence=await historicalEvidence();
if(evidence.integration.status!=='NOT_VERIFIED_LIVE'||evidence.tatum.fresh!==false)throw Error('Provenance guard failed');
await Promise.all([
  writeFile(resolve(out,'index.html'),html),
  writeFile(resolve(out,'app.js'),app),
  copyFile(resolve(root,'dashboard/market-data.mjs'),resolve(out,'market-data.mjs')),
  copyFile(resolve(root,'dashboard/styles.css'),resolve(out,'styles.css')),
  writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n'),
  writeFile(resolve(out,'.nojekyll'),''),
  copyFile(resolve(root,'docs/story.html'),resolve(out,'story.html')),
]);
console.log('Static demo ready: '+out+' (historical + recorded evidence only)');
