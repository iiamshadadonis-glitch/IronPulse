/* V16.89 — pure analytics bucket/aggregation helpers (no network or polling). */
((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.UCV1689AnalyticsCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const DAY_MS=86400000;
  const DAY=/^\d{4}-\d{2}-\d{2}$/;
  const pad=n=>String(n).padStart(2,'0');
  const parseDay=value=>DAY.test(String(value||''))?new Date(`${value}T00:00:00Z`):null;
  const dayKey=date=>`${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
  const addDays=(date,count)=>new Date(date.getTime()+Number(count||0)*DAY_MS);
  const clampDay=(value,fallback)=>parseDay(value)?String(value):fallback;
  const normalizePeriod=value=>['daily','weekly','monthly','yearly','range'].includes(value)?value:'daily';
  const shortDate=value=>{
    const d=parseDay(value);if(!d)return String(value||'');
    return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  };
  function normalizedBounds(start,end){
    const today=dayKey(new Date()),a=clampDay(start,today),b=clampDay(end,today);
    return a<=b?{start:a,end:b}:{start:b,end:a};
  }
  function buildBuckets(start,end,period='daily'){
    ({start,end}=normalizedBounds(start,end));period=normalizePeriod(period);
    const first=parseDay(start),last=parseDay(end),out=[];
    if(period==='yearly'){
      for(let year=first.getUTCFullYear();year<=last.getUTCFullYear();year++)out.push({key:String(year),label:String(year),start:`${year}-01-01`,end:`${year}-12-31`});
      return out;
    }
    if(period==='monthly'){
      let d=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),1));
      const stop=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),1));
      while(d<=stop){const year=d.getUTCFullYear(),month=d.getUTCMonth(),key=`${year}-${pad(month+1)}`;out.push({key,label:d.toLocaleDateString('en-IN',{month:'short',year:'numeric',timeZone:'UTC'}),start:`${key}-01`,end:dayKey(new Date(Date.UTC(year,month+1,0)))});d=new Date(Date.UTC(year,month+1,1));}
      return out;
    }
    if(period==='weekly'){
      for(let d=first,index=0;d<=last;d=addDays(d,7),index++){
        const bucketEnd=new Date(Math.min(addDays(d,6).getTime(),last.getTime()));
        const from=dayKey(d),to=dayKey(bucketEnd);
        out.push({key:`week-${index}`,label:`${shortDate(from)} – ${shortDate(to)}`,start:from,end:to});
      }
      return out;
    }
    for(let d=first;d<=last;d=addDays(d,1)){const key=dayKey(d);out.push({key,label:shortDate(key),start:key,end:key});}
    return out;
  }
  function bucketIndex(day,buckets,period,start){
    const d=parseDay(day);if(!d)return -1;
    if(period==='yearly')return buckets.findIndex(x=>x.key===String(d.getUTCFullYear()));
    if(period==='monthly')return buckets.findIndex(x=>x.key===String(day).slice(0,7));
    if(period==='weekly')return Math.floor((d-parseDay(start))/(7*DAY_MS));
    return buckets.findIndex(x=>x.key===day);
  }
  function aggregate(rows,{start,end,period='daily',mode='business',labels={}}={}){
    ({start,end}=normalizedBounds(start,end));period=normalizePeriod(period);
    const buckets=buildBuckets(start,end,period),safeRows=(Array.isArray(rows)?rows:[]).filter(row=>parseDay(row.day)&&row.day>=start&&row.day<=end);
    const keyed=safeRows.map(row=>({day:row.day,key:String(mode==='business'?(row.key||row.category||'unknown'):(row.key||row.source||'Unknown')),label:String(row.label||labels[row.key||row.category]||row.source||row.key||'Unknown'),count:Number(row.count||0),amount:Number(row.amount||row.amount_paise||0)}));
    const keys=[...new Set(keyed.map(row=>row.key))];
    const series=keys.map(key=>{const values=Array(buckets.length).fill(0),amounts=Array(buckets.length).fill(0),matching=keyed.filter(row=>row.key===key);for(const row of matching){const i=bucketIndex(row.day,buckets,period,start);if(i>=0&&i<buckets.length){values[i]+=row.count;amounts[i]+=row.amount;}}return {key,label:matching[0]?.label||labels[key]||key,values,amounts,total:values.reduce((a,n)=>a+n,0),amount:amounts.reduce((a,n)=>a+n,0)};});
    return {rows:keyed,buckets,days:buckets.map(x=>x.key),series,start,end,period};
  }
  return {DAY_MS,parseDay,dayKey,addDays,shortDate,normalizePeriod,normalizedBounds,buildBuckets,aggregate};
});
