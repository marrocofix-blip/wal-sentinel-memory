const $ = id => document.getElementById(id);
let candles = [];
const slot = 900000;
const STORE = 'wal-sentinel-memory-journal-v1';
let journal = [];
try { const value = JSON.parse(localStorage.getItem(STORE) || '[]'); journal = Array.isArray(value) ? value.slice(-200) : []; } catch {}
const stamp = input => input ? new Date(input).toISOString().replace('T',' ').slice(0,16) + ' UTC' : 'Unknown';
const price = n => Number.isFinite(Number(n)) ? Number(n).toFixed(8) : '—';
const set = (id, value) => { $(id).textContent = value; };
async function api(url) { const r = await fetch(url, {cache:'no-store'}); const data = await r.json(); if (!r.ok) throw Error(data?.error || data?.reason || 'Request failed'); return data; }
async function evidence() {
  try {
    const data = await api('/api/evidence');
    set('checkpoint', String(data.tatum.checkpointHeight));
    set('tatum-sub', 'Observed ' + stamp(data.tatum.observedAt) + ' · not live');
    set('memory-state', data.walrus.exactTextVerified ? 'EXACT MATCH' : 'UNKNOWN');
    set('walrus-sub', 'Official MCP · recorded ' + stamp(data.walrus.observedAt));
    set('tatum-evidence', String(data.tatum.source) + ' · ' + stamp(data.tatum.observedAt));
    set('walrus-evidence', data.walrus.namespace + ' · exact text ' + (data.walrus.exactTextVerified ? 'verified' : 'unverified'));
  } catch {
    set('checkpoint','UNKNOWN'); set('memory-state','UNKNOWN'); set('tatum-sub','Saved evidence unavailable'); set('walrus-sub','Saved evidence unavailable');
  }
}
function drawChart(items) {
  const svg = $('chart'), NS = 'http://www.w3.org/2000/svg';
  svg.replaceChildren();
  if (items.length < 2) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x','24'); t.setAttribute('y','145'); t.setAttribute('fill','#8494aa'); t.textContent='Not enough closed market candles'; svg.append(t); return; }
  const values = items.map(c=>c.close), lo=Math.min(...values), hi=Math.max(...values), spread=Math.max(hi-lo,hi*0.00001);
  const x=i=>32+(i/(values.length-1))*692, y=v=>252-((v-lo)/spread)*208;
  for (let i=0;i<5;i++){const yy=35+i*54;const l=document.createElementNS(NS,'line');for(const [k,v] of Object.entries({x1:30,y1:yy,x2:740,y2:yy,stroke:'#263647','stroke-dasharray':'4 8'}))l.setAttribute(k,v);svg.append(l);}
  const first = values[0], last = values.at(-1), color = last>=first?'#58dab7':'#e4a277';
  const path = document.createElementNS(NS,'path');
  const d=values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
  path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','2.7');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');svg.append(path);
  const dot=document.createElementNS(NS,'circle');dot.setAttribute('cx',x(values.length-1));dot.setAttribute('cy',y(last));dot.setAttribute('r','5');dot.setAttribute('fill',color);svg.append(dot);
  for(const [n,label] of [[0,hi],[1,lo]]){const t=document.createElementNS(NS,'text');t.setAttribute('x','740');t.setAttribute('y',n?275:22);t.setAttribute('text-anchor','end');t.setAttribute('fill','#8295ab');t.setAttribute('font-size','11');t.textContent=label.toFixed(6);svg.append(t);}
}
function result(p) {
  const at = Date.parse(p.predictedAt), base=Number(p.entryPrice), target=Number(p.targetCloseTime);
  if (!['UP','DOWN'].includes(p.direction) || !Number.isFinite(at) || !Number.isFinite(base) || base<=0 || !Number.isFinite(target) || target<=at) return ['INVALID',null];
  const c=candles.find(c=>c.closeTime===target);
  if (!c) return ['PENDING',null];
  return [p.direction==='UP'?(c.close>base?'CORRECT':'INCORRECT'):(c.close<base?'CORRECT':'INCORRECT'),c.close];
}
function renderJournal(){
  const body=$('journal-rows');body.replaceChildren();
  const evaluations=journal.map(p=>result(p));const completed=evaluations.filter(v=>['CORRECT','INCORRECT'].includes(v[0]));
  const correct=completed.filter(v=>v[0]==='CORRECT').length;
  set('accuracy',completed.length?Math.round(100*correct/completed.length)+'%':'—');
  set('accuracy-sub',completed.length?correct+' correct / '+completed.length+' evaluated':'No evaluated predictions');
  set('journal-count',journal.length+' locally stored predictions');
  if(!journal.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.className='empty';td.textContent='No predictions saved. This is not trading advice.';tr.append(td);body.append(tr);return;}
  [...journal].reverse().forEach(p=>{
    const [status,actual]=result(p);
    const tr=document.createElement('tr');
    const fields=[stamp(p.predictedAt),p.direction==='UP'?'↑ UP':'↓ DOWN',price(p.entryPrice),stamp(Number(p.targetCloseTime)),actual===null?'—':price(actual),status];
    fields.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===5)td.className='result '+status;tr.append(td);});body.append(tr);
  });
}
function futureTargets() {
  const select=$('target');select.replaceChildren();
  if (!candles.length) { select.add(new Option('Market data unavailable',''));return; }
  const last=candles.at(-1).closeTime, now=Date.now();
  const first=last+Math.ceil(Math.max(1,now-last)/slot)*slot;
  for(let i=0;i<8;i++){const time=first+i*slot;select.add(new Option(stamp(time),String(time)));}
  $('entry-price').value=candles.at(-1).close.toFixed(8);
}
async function market(){
  try {
    const data=await api('/api/market');candles=data.candles||[];
    set('market-price', '$'+price(candles.at(-1)?.close));
    set('market-sub', 'Binance indicative · observed '+stamp(data.observedAt));
    set('market-count',candles.length+' verified closed candles');
    set('chart-time','Observed '+stamp(data.observedAt));
    set('market-tag','PUBLIC FEED');
  } catch {
    candles=[];set('market-price','UNAVAILABLE');set('market-sub','No live market source; no synthetic fallback');
    set('market-tag','OFFLINE');set('market-count','0 verified closed candles');
  }
  drawChart(candles);futureTargets();renderJournal();
}
$('prediction-form').addEventListener('submit',e=>{
  e.preventDefault();
  const target=Number($('target').value), entry=Number($('entry-price').value);
  if (!candles.length || !Number.isFinite(entry) || entry<=0 || !Number.isFinite(target) || target<=Date.now()) {alert('Load verified closed candles and select a future target.');return;}
  journal.push({id:(globalThis.crypto?.randomUUID?.()||String(Date.now())),predictedAt:new Date().toISOString(),direction:$('direction').value,entryPrice:entry,targetCloseTime:target});
  journal=journal.slice(-200);
  try{localStorage.setItem(STORE,JSON.stringify(journal));}catch{alert('Browser storage unavailable: journal may not persist.');}
  renderJournal();
});
$('clear-journal').addEventListener('click',()=>{
  if(!journal.length)return;
  if(confirm('Delete all locally stored predictions in this browser?')){journal=[];try{localStorage.removeItem(STORE);}catch{}renderJournal();}
});
$('refresh').addEventListener('click',async()=>{await Promise.all([evidence(),market()]);});
$('check-tatum').addEventListener('click',async()=>{
  set('live-result','Checking Tatum via server (read-only)…');
  try { const d=await api('/api/tatum-live');set('live-result','LIVE PASS · '+d.checkpointHeight+' · '+stamp(d.observedAt)+' (separate check; not a combined Walrus proof)'); }
  catch(e){set('live-result','LIVE BLOCKED / UNKNOWN · '+e.message);}
});
await Promise.all([evidence(),market()]);
