// V17.01 — shared, bounded visitor aggregates.
// Visitor totals/pages/sources are analytical snapshots, not transactional state.
// Reuse one calculation for five minutes across Dashboard and Tracking. New
// visits are reflected after that window; an explicit admin Refresh rebuilds it.
const TTL_MS=5*60*1000;
let memo={expires:0,payload:null};

async function all(env,sql){const r=await env.DB.prepare(sql).all();return r.results||[];}
async function one(env,sql){return await env.DB.prepare(sql).first();}
function key(request){const u=new URL(request.url);return new Request(`${u.origin}/__uc-internal/v17-04-visitor-analytics`,{method:'GET'});}

// MAX(id) uses visitor_events' integer primary key. This is one indexed row,
// even if the table contains millions of older events.
export async function visitorRevision(env){const row=await one(env,'SELECT COALESCE(MAX(id),0) revision FROM visitor_events');return Number(row?.revision||0);}

export async function getVisitorAnalytics({request,env,waitUntil,force=false}){
  // A revision check on every visit invalidated the cache on busy sites. Each
  // invalidation then scanned all visitor_events three times for totals, sources
  // and pages. Preserve bounded freshness without paying for every new visit.
  if(!force&&memo.payload&&Date.now()<memo.expires)return {...memo.payload,cache:'memory'};
  if(!force){try{const hit=await globalThis.caches?.default?.match(key(request));if(hit){const payload=await hit.json();memo={payload,expires:Date.now()+Math.max(1000,Math.min(TTL_MS,Date.parse(payload.generated_at)+TTL_MS-Date.now()))};return {...payload,cache:'edge'};}}catch{}}
  const [summary,sourceRows,pages]=await Promise.all([
    one(env,`WITH rolled AS (
      SELECT visitor_id,COUNT(*) visits,
        SUM(CASE WHEN COALESCE(duration_ms,0)>0 THEN duration_ms ELSE 0 END) duration_sum,
        SUM(CASE WHEN COALESCE(duration_ms,0)>0 THEN 1 ELSE 0 END) duration_count
      FROM visitor_events GROUP BY visitor_id
    ) SELECT COALESCE(SUM(visits),0) total_events,COUNT(*) visitors,
      COALESCE(SUM(CASE WHEN visits>1 THEN 1 ELSE 0 END),0) repeat_visitors,
      CASE WHEN COALESCE(SUM(duration_count),0)>0 THEN CAST(SUM(duration_sum) AS REAL)/SUM(duration_count) ELSE 0 END avg_duration_ms
      FROM rolled`),
    all(env,`SELECT COALESCE(NULLIF(TRIM(source),''),'Direct / unknown') source,COUNT(*) visits,
      COUNT(DISTINCT visitor_id) visitors,COALESCE(AVG(NULLIF(duration_ms,0)),0) avg_duration_ms
      FROM visitor_events GROUP BY COALESCE(NULLIF(TRIM(source),''),'Direct / unknown')`),
    all(env,`SELECT COALESCE(NULLIF(TRIM(path),''),'/') path,COUNT(*) visits,
      COUNT(DISTINCT visitor_id) visitors,COALESCE(AVG(NULLIF(duration_ms,0)),0) avg_duration_ms
      FROM visitor_events GROUP BY COALESCE(NULLIF(TRIM(path),''),'/') ORDER BY visits DESC LIMIT 20`)
  ]);
  const sources=[...(sourceRows||[])].sort((a,b)=>Number(b.visits||0)-Number(a.visits||0)).slice(0,12);
  const top_source=[...(sourceRows||[])].sort((a,b)=>Number(b.visitors||0)-Number(a.visitors||0)||Number(b.visits||0)-Number(a.visits||0))[0]||{source:'Direct / unknown'};
  const revision=await visitorRevision(env);
  const payload={summary:summary||{total_events:0,visitors:0,repeat_visitors:0,avg_duration_ms:0},sources,pages,top_source,revision,generated_at:new Date().toISOString()};
  memo={payload,expires:Date.now()+TTL_MS};
  try{const task=globalThis.caches?.default?.put(key(request),new Response(JSON.stringify(payload),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}}));if(typeof waitUntil==='function')waitUntil(task);else task?.catch?.(()=>{});}catch{}
  return {...payload,cache:'miss'};
}
