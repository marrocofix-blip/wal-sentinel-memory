import { TIMEFRAMES, loadPublicMarket } from './market-data.mjs';

const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const STORE='wal-sentinel-memory-journal-v2';
const oldStore='wal-sentinel-memory-journal-v1';
let tf='15m',chartMode='candles',candles=[],journal=[],marketCache=new Map(),lastFetch=0,chartPointer=null,refreshBusy=false;
const fmt=(v,d=8)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const compact=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(Number(v)):'—';
const date=v=>Number.isFinite(Number(v))?new Date(Number(v)).toISOString().replace('T',' ').slice(0,16)+' UTC':'—';
const set=(id,text)=>{const e=$(id);if(e)e.textContent=String(text)};
const setClass=(id,klass)=>{const e=$(id);if(e)e.className=klass};
const point=(x,y,r=3)=>{const p=document.createElementNS(NS,'circle');p.setAttribute('cx',x);p.setAttribute('cy',y);p.setAttribute('r',r);return p};
const svg=(name,attrs,text)=>{const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!=null)e.textContent=text;return e};
function readJournal(){try{const raw=localStorage.getItem(STORE)||localStorage.getItem(oldStore)||'[]';const records=JSON.parse(raw);if(!Array.isArray(records))return [];return records.filter(p=>p&&typeof p==='object'&&['UP','DOWN'].includes(p.direction)&&Number.isFinite(Number(p.entryPrice))&&Number(p.entryPrice)>0&&Number.isFinite(Number(p.targetCloseTime))&&Number.isFinite(Date.parse(p.predictedAt))).slice(-500).map(p=>({...p,timeframe:'15m'}))}catch{return []}}
journal=readJournal();
function saveJournal(){try{localStorage.setItem(STORE,JSON.stringify(journal))}catch{set('journal-count','Browser storage unavailable; export journal to preserve it')}}
function ema(values,n){let prev=null;const k=2/(n+1);return values.map((v,i)=>{if(prev===null){if(i<n-1)return null;prev=values.slice(0,n).reduce((a,b)=>a+b,0)/n;return prev}prev=v*k+prev*(1-k);return prev})}
function rsi(values,n=14){const out=Array(values.length).fill(null);if(values.length<=n)return out;let gain=0,loss=0;for(let i=1;i<=n;i++){const d=values[i]-values[i-1];gain+=Math.max(0,d);loss+=Math.max(0,-d)}gain/=n;loss/=n;out[n]=loss?100-100/(1+gain/loss):gain?100:50;for(let i=n+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(n-1)+Math.max(0,d))/n;loss=(loss*(n-1)+Math.max(0,-d))/n;out[i]=loss?100-100/(1+gain/loss):gain?100:50}return out}
function macd(values){const e12=ema(values,12),e26=ema(values,26);const dif=values.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);const clean=dif.filter(v=>v!=null),signal=ema(clean,9);let idx=0;return dif.map(d=>d==null?null:{macd:d,signal:signal[idx++]??null}).map(v=>v?{...v,hist:v.signal==null?null:v.macd-v.signal}:null)}
function trendData(items){const prices=items.map(c=>c.close);const e9=ema(prices,9),e30=ema(prices,30),e200=ema(prices,200);return{prices,e9,e30,e200,rsi:rsi(prices),macd:macd(prices)}}
const last=a=>a.length?a[a.length-1]:null;
function traceLine(data,x,y,fill){let d='',drawing=false;data.forEach((v,i)=>{if(v==null||!Number.isFinite(v)){drawing=false;return}d+=(drawing?'L':'M')+x(i).toFixed(2)+' '+y(v).toFixed(2)+' ';drawing=true});if(!d.trim())return null;return svg('path',{d,fill:'none',stroke:fill,'stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'})}
function emptySvg(id,message){const node=$(id);node.replaceChildren();node.append(svg('text',{x:25,y:id==='chart'?175:45,fill:'#89a1b7','font-size':13},message))}
function graph(items,data){
  const node=$('chart');node.replaceChildren();
  if(items.length<2){emptySvg('chart','Market data unavailable · use Refresh to retry');return}
  const W=920,H=352,L=24,R=68,T=17,B=48,areaBottom=H-B,priceBottom=259,volTop=281,volBottom=308;
  const allHigh=items.map(c=>c.high),allLow=items.map(c=>c.low);
  const extras=[...data.e9,...data.e30,...data.e200].filter(v=>Number.isFinite(v));
  const lo=Math.min(...allLow,...extras),hi=Math.max(...allHigh,...extras);
  const pad=Math.max((hi-lo)*.1,hi*.002),min=lo-pad,max=hi+pad,range=max-min||1;
  const x=i=>L+(i+.5)*(W-L-R)/items.length,dx=(W-L-R)/items.length;
  const y=v=>T+(priceBottom-T)*(max-v)/range;
  const volumeMax=Math.max(1,...items.map(c=>c.volume));
  for(let i=0;i<=4;i++){const py=T+i*(priceBottom-T)/4;node.append(svg('line',{x1:L,y1:py,x2:W-R,y2:py,stroke:'#253647','stroke-dasharray':'3 7'}));node.append(svg('text',{x:W-R+8,y:py+4,fill:'#8498ac','font-size':10},fmt(max-i*range/4,5)))}
  for(let i=0;i<=4;i++){const n=Math.min(items.length-1,Math.floor(i*(items.length-1)/4));node.append(svg('text',{x:x(n),y:H-15,'text-anchor':'middle',fill:'#8295a9','font-size':10},new Date(items[n].openTime).toISOString().slice(11,16)))}
  node.append(svg('line',{x1:L,y1:volTop-7,x2:W-R,y2:volTop-7,stroke:'#253647'}));
  const volumeGroup=svg('g',{'data-layer':'volume'});
  items.forEach((c,i)=>{const color=c.close>=c.open?'#2acaa5':'#ed747b',barW=Math.max(1.2,dx*.65);volumeGroup.append(svg('rect',{x:x(i)-barW/2,y:volBottom-(c.volume/volumeMax)*25,width:barW,height:(c.volume/volumeMax)*25,fill:color,opacity:.56}))});node.append(volumeGroup);
  if(chartMode==='candles'){const candleGroup=svg('g',{'data-layer':'candles'});items.forEach((c,i)=>{const color=c.close>=c.open?'#38dbb4':'#f07e85';const bodyW=Math.max(1.5,dx*.68),top=Math.min(y(c.open),y(c.close)),height=Math.max(1,Math.abs(y(c.open)-y(c.close)));candleGroup.append(svg('line',{x1:x(i),x2:x(i),y1:y(c.high),y2:y(c.low),stroke:color,'stroke-width':Math.max(1,Math.min(1.6,dx*.2))}));candleGroup.append(svg('rect',{x:x(i)-bodyW/2,y:top,width:bodyW,height,fill:color,rx:Math.min(1,bodyW*.16)}))});node.append(candleGroup)}
  else {const line=traceLine(items.map(c=>c.close),x,y,'#5df0c4');if(line){line.setAttribute('stroke-width','2.6');node.append(line)}}
  for(const [arr,color] of [[data.e9,'#58a9ff'],[data.e30,'#edc365'],[data.e200,'#dde9f5']]){const line=traceLine(arr,x,y,color);if(line)node.append(line)}
  const lastClose=last(items).close;node.append(svg('line',{x1:L,y1:y(lastClose),x2:W-R,y2:y(lastClose),stroke:'#53dcb7','stroke-dasharray':'4 4',opacity:.65}));node.append(svg('rect',{x:W-R+2,y:y(lastClose)-10,width:R-6,height:21,fill:'#21675a',rx:4}));node.append(svg('text',{x:W-R+6,y:y(lastClose)+4,fill:'#baf9e3','font-size':10},fmt(lastClose,5)));
  const cross=svg('g',{visibility:'hidden'});cross.append(svg('line',{x1:0,y1:T,x2:0,y2:volBottom,stroke:'#c7d8e7','stroke-dasharray':'3 5',opacity:.68}));cross.append(point(0,0,4));cross.children[1].setAttribute('fill','#d9f8ea');node.append(cross);
  node.onpointermove=e=>{const rect=node.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*W;const index=Math.min(items.length-1,Math.max(0,Math.floor((px-L)/dx)));const c=items[index];if(!c)return;const xx=x(index);cross.setAttribute('visibility','visible');cross.children[0].setAttribute('x1',xx);cross.children[0].setAttribute('x2',xx);cross.children[1].setAttribute('cx',xx);cross.children[1].setAttribute('cy',y(c.close));set('ohlc','O '+fmt(c.open,6)+'  H '+fmt(c.high,6)+'  L '+fmt(c.low,6)+'  C '+fmt(c.close,6)+' · '+date(c.closeTime))};
  node.onpointerleave=()=>{cross.setAttribute('visibility','hidden');set('ohlc','Hover a candle to inspect OHLC')};
}
function studyChart(id,values,color,refLines=[]){const element=$(id);element.replaceChildren();const valid=values.filter(Number.isFinite);if(valid.length<3)return;const hi=Math.max(...valid,...refLines),lo=Math.min(...valid,...refLines),range=Math.max(hi-lo,1e-12);const x=i=>10+i*420/(values.length-1),y=v=>70-(v-lo)/range*60;for(const ref of refLines){element.append(svg('line',{x1:10,x2:430,y1:y(ref),y2:y(ref),stroke:'#45566b','stroke-dasharray':'4 6',opacity:.8}))}const path=traceLine(values,x,y,color);if(path)element.append(path)}
function histogram(values){const el=$('macd-chart');el.replaceChildren();const valid=values.filter(Number.isFinite);if(valid.length<2)return;const abs=Math.max(...valid.map(Math.abs),1e-12),x=i=>10+i*420/values.length,base=40,step=420/values.length;el.append(svg('line',{x1:10,x2:430,y1:base,y2:base,stroke:'#445c66'}));values.forEach((v,i)=>{if(!Number.isFinite(v))return;const h=Math.abs(v)/abs*33;el.append(svg('rect',{x:x(i),y:v>=0?base-h:base,width:Math.max(1,step*.68),height:Math.max(.7,h),fill:v>=0?'#47d0ad':'#f08591',opacity:.84}))})}
function stats(items){
  if(!items.length){for(const id of ['range','price-change','volume','trend','candle-count','ema9','ema30','ema200','rsi-value','macd-value'])set(id,'—');emptySvg('rsi-chart','No observations');emptySvg('macd-chart','No observations');return}
  const latest=last(items),before=items.at(-2),d=trendData(items),chg=before?(latest.close/before.close-1)*100:null;
  set('ema9',fmt(last(d.e9),6));set('ema30',fmt(last(d.e30),6));set('ema200',fmt(last(d.e200),6));
  set('rsi-value',last(d.rsi)==null?'—':fmt(last(d.rsi),1));set('macd-value',last(d.macd)?.hist==null?'—':fmt(last(d.macd).hist,7));
  set('price-change',chg==null?'—':(chg>=0?'+':'')+fmt(chg,2)+'%');setClass('price-change',chg==null?'':chg>=0?'positive':'negative');
  set('volume',compact(latest.volume));set('candle-count',String(items.length));
  const start=Math.max(0,items.length-Math.ceil(86400000/TIMEFRAMES[tf]));const sliced=items.slice(start);
  set('range',fmt(Math.min(...sliced.map(x=>x.low)),6)+' – '+fmt(Math.max(...sliced.map(x=>x.high)),6));
  const e9=last(d.e9),e30=last(d.e30);set('trend',e9==null||e30==null?'Insufficient candles':e9>e30?'Bullish structure':e9<e30?'Bearish structure':'Neutral structure');
  if(e9!=null&&e30!=null)setClass('trend',e9>e30?'positive':e9<e30?'negative':'');
  studyChart('rsi-chart',d.rsi,'#b18bff',[30,70]);histogram(d.macd.map(x=>x?.hist??null));graph(items,d);
}
async function evidence(){
  try{let response=await fetch('/api/evidence',{cache:'no-store'});if(!response.ok)response=await fetch('./evidence.json',{cache:'no-store'});if(!response.ok)throw Error('Evidence unavailable');const data=await response.json();if(!data.tatum||!data.walrus)throw Error('Invalid evidence');
    set('checkpoint',String(data.tatum.checkpointHeight||'—'));set('tatum-sub','Recorded '+date(Date.parse(data.tatum.observedAt)));set('memory-state',data.walrus.exactTextVerified?'VERIFIED':'UNKNOWN');set('walrus-sub','Recall · '+date(Date.parse(data.walrus.observedAt)));set('tatum-evidence',data.tatum.source==='USER_PROVIDED_POWERSHELL_OUTPUT'?'Historic gRPC observation · '+date(Date.parse(data.tatum.observedAt)):'Historic checkpoint · '+date(Date.parse(data.tatum.observedAt)));set('walrus-evidence',data.walrus.namespace+' · exact-text '+(data.walrus.exactTextVerified?'PASS':'unknown'));
  }catch{set('checkpoint','—');set('memory-state','UNKNOWN');set('tatum-sub','Evidence unavailable');set('walrus-sub','Evidence unavailable')}
}
async function fetchMarket(interval,{force=false}={}){
  if(!force&&marketCache.has(interval)&&Date.now()-(marketCache.get(interval).loadedAt)<30000)return marketCache.get(interval).result;
  try{
    const r=await loadPublicMarket(interval);
    marketCache.set(interval,{loadedAt:Date.now(),result:r});return r;
  }catch{
    const r=await fetch('/api/market?tf='+encodeURIComponent(interval),{cache:'no-store'});
    if(!r.ok)throw Error('Public market unavailable');
    const result=await r.json();if(!Array.isArray(result.candles)||result.candles.length<2)throw Error('No completed candles');
    marketCache.set(interval,{loadedAt:Date.now(),result});return result;
  }
}
function renderJournal(){const body=$('journal-rows');body.replaceChildren();const source=marketCache.get('15m')?.result?.candles||[];const byTime=new Map(source.map(c=>[c.closeTime,c.close]));let complete=0,correct=0;
  for(const p of [...journal].reverse()){const target=Number(p.targetCloseTime),actual=byTime.get(target);let outcome='PENDING';if(Number.isFinite(actual)){outcome=p.direction==='UP'?(actual>p.entryPrice?'CORRECT':'INCORRECT'):(actual<p.entryPrice?'CORRECT':'INCORRECT');complete++;if(outcome==='CORRECT')correct++}
    const row=document.createElement('tr');for(const [i,text] of [date(Date.parse(p.predictedAt)),p.direction==='UP'?'↑ UP':'↓ DOWN',fmt(p.entryPrice),date(target),actual===undefined?'—':fmt(actual),outcome].entries()){const td=document.createElement('td');td.textContent=text;if(i===5)td.className='result '+outcome;row.append(td)}body.append(row)}
  if(!journal.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='empty';td.textContent='No predictions yet. Add your first hypothesis above.';row.append(td);body.append(row)}
  set('accuracy',complete?Math.round(correct/complete*100)+'%':'—');set('accuracy-sub',complete?correct+' correct / '+complete+' completed':'No evaluated predictions');set('journal-count',journal.length+' predictions');set('journal-mini',journal.length+' recorded');
}
function prepareTargets(){const sel=$('target');sel.replaceChildren();const sample=marketCache.get('15m')?.result?.candles;if(!sample?.length){sel.add(new Option('Waiting for market data',''));return}
  const duration=TIMEFRAMES['15m'],now=Date.now();const close=Math.floor(now/duration)*duration+duration-1;
  for(let i=0;i<12;i++){const t=close+i*duration;sel.add(new Option(date(t),String(t)))}
  $('entry-price').value=last(sample).close.toFixed(8);
}
function showMarket(result){candles=result.candles;lastFetch=Date.now();set('market-price','$'+fmt(last(candles).close,8));set('market-source',result.provider+' · '+result.market+' · '+tf+' · completed candles only');set('market-sub','Close '+date(last(candles).closeTime));set('market-tag','SPOT MARKET');
  const first=candles.at(-2);const change=(last(candles).close/first.close-1)*100;set('market-change',(change>=0?'+':'')+fmt(change,2)+'% last candle');setClass('market-change',change>=0?'positive':'negative');
  set('market-count',candles.length+' completed candles · '+result.provider);set('chart-time','Updated '+date(Date.parse(result.observedAt)));set('feed-status','● LIVE MARKET');setClass('feed-status','status-chip connected');stats(candles);
}
async function market(force=false){if(refreshBusy)return;refreshBusy=true;set('feed-status','● CONNECTING');setClass('feed-status','status-chip');
  try{const result=await fetchMarket(tf,{force});showMarket(result);
    if(tf!=='15m'&&(!marketCache.has('15m')||force)){try{await fetchMarket('15m',{force})}catch{}}
    prepareTargets();renderJournal();
  }catch(e){candles=[];set('market-price','UNAVAILABLE');set('market-change','No current observation');set('market-source','Unable to reach supported WAL/USDT data providers');set('market-sub','Please refresh');set('market-count','No verified closed candles');set('chart-time','Market feed offline');set('feed-status','● MARKET OFFLINE');setClass('feed-status','status-chip offline');stats([]);emptySvg('chart','Public market data is unavailable right now');prepareTargets();renderJournal()}
  finally{refreshBusy=false}
}
for(const btn of document.querySelectorAll('[data-tf]'))btn.addEventListener('click',async()=>{if(refreshBusy)return;tf=btn.dataset.tf;for(const b of document.querySelectorAll('[data-tf]'))b.classList.toggle('active',b===btn);await market()});
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>{chartMode=btn.dataset.mode;for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b===btn);if(candles.length)graph(candles,trendData(candles))});
$('refresh').addEventListener('click',()=>market(true));
$('prediction-form').addEventListener('submit',e=>{e.preventDefault();const entry=Number($('entry-price').value),target=Number($('target').value);if(!marketCache.get('15m')||!Number.isFinite(entry)||entry<=0||!Number.isFinite(target)||target<=Date.now()){alert('A valid observed 15m price and future evaluation time are required.');return}
  journal.push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),direction:$('direction').value,entryPrice:entry,predictedAt:new Date().toISOString(),targetCloseTime:target,timeframe:'15m'});journal=journal.slice(-500);saveJournal();renderJournal()});
$('clear-journal').addEventListener('click',()=>{if(!journal.length)return;if(confirm('Delete locally saved research predictions from this browser?')){journal=[];saveJournal();renderJournal()}});
$('export-journal').addEventListener('click',()=>{const data=JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),source:'LOCAL_BROWSER_JOURNAL',predictions:journal},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wal-sentinel-journal-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
renderJournal();await Promise.all([evidence(),market()]);
setInterval(()=>{if(document.visibilityState==='visible')market(true)},60000);
