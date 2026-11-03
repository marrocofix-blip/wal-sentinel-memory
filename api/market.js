// Public Vercel serverless proxy for no-key spot OHLC data. No wallets,
// blockchain writes, API secrets, or financial order endpoints.
const TF={ '5m':300000,'15m':900000,'1h':3600000,'4h':14400000 };
const PROVIDERS=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
const valid=x=>x.every(Number.isFinite)&&x[1]>0&&x[4]>0&&x[2]>=Math.max(x[1],x[4])&&x[3]<=Math.min(x[1],x[4]);
module.exports=async function handler(req,res) {
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const tf=typeof req.query?.tf==='string'?req.query.tf:'15m';
  if(!Object.hasOwn(TF,tf))return res.status(400).json({error:'Invalid timeframe'});
  res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
  const now=Date.now();
  for(const endpoint of PROVIDERS) {
    try {
      const resp=await fetch(endpoint+'/api/v3/klines?symbol=WALUSDT&interval='+tf+'&limit=240',{signal:AbortSignal.timeout(6500)});
      if(!resp.ok)continue;
      const rows=await resp.json();
      if(!Array.isArray(rows))continue;
      const candles=rows.filter(row=>Array.isArray(row)&&row.length>=7).map(row=>({
        openTime:Number(row[0]),open:Number(row[1]),high:Number(row[2]),low:Number(row[3]),close:Number(row[4]),volume:Number(row[5]),closeTime:Number(row[6])
      })).filter(c=>valid([c.openTime,c.open,c.high,c.low,c.close,c.volume,c.closeTime])&&c.closeTime<now&&c.closeTime>c.openTime).sort((a,b)=>a.openTime-b.openTime);
      if(candles.length>=2)return res.status(200).json({status:'PUBLIC_INDICATIVE',market:'WAL/USDT',provider:'Binance Spot',timeframe:tf,observedAt:new Date(now).toISOString(),closedOnly:true,candles});
    }catch{}
  }
  try {
    const resp=await fetch('https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=WAL_USDT&interval='+tf+'&limit=240',{signal:AbortSignal.timeout(6500)});
    if(resp.ok){
      const rows=await resp.json();
      if(Array.isArray(rows)){
        const candles=rows.filter(row=>Array.isArray(row)&&row.length>=6).map(row=>({
          openTime:Number(row[0])*1000,open:Number(row[5]),high:Number(row[3]),low:Number(row[4]),close:Number(row[2]),volume:Number(row[1]),closeTime:Number(row[0])*1000+TF[tf]-1
        })).filter(c=>valid([c.openTime,c.open,c.high,c.low,c.close,c.volume,c.closeTime])&&c.closeTime<now&&c.closeTime>c.openTime).sort((a,b)=>a.openTime-b.openTime);
        if(candles.length>=2)return res.status(200).json({status:'PUBLIC_INDICATIVE',market:'WAL/USDT',provider:'Gate Spot',timeframe:tf,observedAt:new Date(now).toISOString(),closedOnly:true,candles});
      }
    }
  }catch{}
  return res.status(503).json({status:'UNAVAILABLE',error:'Public WAL/USDT candles unavailable'});
};
