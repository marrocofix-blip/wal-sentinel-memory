// Public, unauthenticated indicative market candles. No trading APIs or secrets.
export const TIMEFRAMES = Object.freeze({ '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000 });
const BINANCE_PATH = '/api/v3/klines?symbol=WALUSDT';
const providers = [
  {name:'Binance Spot', url:'https://data-api.binance.vision'},
  {name:'Binance Spot', url:'https://api.binance.com'},
  {name:'Binance Spot', url:'https://api1.binance.com'},
];
export function normalizeBinance(rows, timeframe, now = Date.now()) {
  if (!Array.isArray(rows)) throw Error('Unexpected Binance response');
  return rows.filter(x=>Array.isArray(x)&&x.length>=7).map(x=>({
    openTime:Number(x[0]),open:Number(x[1]),high:Number(x[2]),low:Number(x[3]),
    close:Number(x[4]),volume:Number(x[5]),closeTime:Number(x[6])
  })).filter(x=>[x.openTime,x.open,x.high,x.low,x.close,x.volume,x.closeTime].every(Number.isFinite) &&
    x.open>0&&x.close>0&&x.high>=Math.max(x.open,x.close)&&x.low<=Math.min(x.open,x.close)&&
    x.openTime<x.closeTime&&x.closeTime<now
  ) .sort((a,b)=>a.openTime-b.openTime);
}
export function normalizeGate(rows, timeframe, now = Date.now()) {
  if (!Array.isArray(rows)) throw Error('Unexpected Gate response');
  const duration=TIMEFRAMES[timeframe];
  return rows.filter(x=>Array.isArray(x)&&x.length>=6).map(x=>({
    openTime:Number(x[0])*1000,open:Number(x[5]),high:Number(x[3]),low:Number(x[4]),
    close:Number(x[2]),volume:Number(x[1]),closeTime:Number(x[0])*1000+duration-1
  })).filter(x=>[x.openTime,x.open,x.high,x.low,x.close,x.volume,x.closeTime].every(Number.isFinite)&&
    x.open>0&&x.close>0&&x.high>=Math.max(x.open,x.close)&&x.low<=Math.min(x.open,x.close)&&
    x.openTime<x.closeTime&&x.closeTime<now
  ).sort((a,b)=>a.openTime-b.openTime);
}
export async function loadPublicMarket(timeframe='15m',fetcher=fetch,now=Date.now()) {
  if (!Object.hasOwn(TIMEFRAMES,timeframe)) throw Error('Unsupported timeframe');
  const q='&interval='+timeframe+'&limit=240';
  for(const provider of providers) {
    try {
      const response=await fetcher(provider.url+BINANCE_PATH+q,{signal:AbortSignal.timeout(7500),cache:'no-store'});
      if(!response.ok)continue;
      const candles=normalizeBinance(await response.json(),timeframe,now);
      if(candles.length>=2)return {
        status:'PUBLIC_INDICATIVE',provider:provider.name,market:'WAL/USDT',
        timeframe,observedAt:new Date(now).toISOString(),candles,closedOnly:true
      };
    }catch{/* try next public source */}
  }
  try {
    const url='https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=WAL_USDT&interval='+timeframe+'&limit=240';
    const response=await fetcher(url,{signal:AbortSignal.timeout(7500),cache:'no-store'});
    if(response.ok) {
      const candles=normalizeGate(await response.json(),timeframe,now);
      if(candles.length>=2) return {status:'PUBLIC_INDICATIVE',provider:'Gate Spot',market:'WAL/USDT',timeframe,
        observedAt:new Date(now).toISOString(),candles,closedOnly:true};
    }
  }catch{}
  throw Error('Public WAL/USDT candles unavailable from supported sources');
}
