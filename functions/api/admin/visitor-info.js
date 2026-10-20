import { json, requireAdmin } from '../../_lib/utils.js';
import { getVisitorAnalytics } from '../../_lib/visitor-analytics.js';
async function all(env, sql, ...args){ const r=await env.DB.prepare(sql).bind(...args).all(); return r.results||[]; }
const emptyAnalytics={summary:{total_events:0,visitors:0,repeat_visitors:0,avg_duration_ms:0},sources:[],pages:[]};
const LIST_TTL_MS=5*60*1000;
const listMemos=new WeakMap(),listPending=new WeakMap();
function forDB(lookup,db){let entries=lookup.get(db);if(!entries){entries=new Map();lookup.set(db,entries);}return entries;}
function listKey(request,type,limit){const url=new URL(request.url);return new Request(`${url.origin}/__uc-internal/v17-04-visitor-list/${type}/${limit}`);}
async function cachedVisitorList({request,env,waitUntil,type,limit,force}){
  const listMemo=forDB(listMemos,env.DB),pending=forDB(listPending,env.DB);
  const id=`${new URL(request.url).origin}/${type}/${limit}`,now=Date.now();
  if(!force){const hit=listMemo.get(id);if(hit&&hit.expires>now)return hit.rows;
    try{const response=await globalThis.caches?.default?.match(listKey(request,type,limit));if(response){const snapshot=await response.json();listMemo.set(id,{rows:snapshot.rows,expires:Math.min(Date.now()+LIST_TTL_MS,Date.parse(snapshot.at)+LIST_TTL_MS)});return snapshot.rows;}}catch{}
    if(pending.has(id))return pending.get(id);
  }
  const task=(async()=>{
    const rows=await visitorList(env,type,limit);
    listMemo.set(id,{rows,expires:Date.now()+LIST_TTL_MS});
    try{const response=new Response(JSON.stringify({rows,at:new Date().toISOString()}),{headers:{'content-type':'application/json','cache-control':'public, max-age=300'}});
      const write=globalThis.caches?.default?.put(listKey(request,type,limit),response);
      if(write&&typeof waitUntil==='function')waitUntil(write);else write?.catch?.(()=>{});
    }catch{}
    return rows;
  })();
  if(!force)pending.set(id,task);
  try{return await task;}finally{if(pending.get(id)===task)pending.delete(id);}
}
async function visitorList(env,visitorType,resultLimit){
  const having=visitorType==='repeat'?' HAVING COUNT(*)>1':'';
  // Aggregate each visitor once. The last nonempty identity/location fields are
  // joined by primary key only for the selected visitors, rather than running
  // five correlated history scans for every group in the entire event table.
  const sql=`WITH rolled AS (
    SELECT v.visitor_id,MAX(v.created_at) last_seen,COUNT(*) visits,
      GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(v.source),''),'Direct / unknown')) sources,
      GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(v.path),''),'/')) pages,
      MAX(CASE WHEN TRIM(COALESCE(v.device_id,''))<>'' THEN v.id END) device_event_id,
      MAX(CASE WHEN TRIM(COALESCE(v.ip_address,''))<>'' THEN v.id END) ip_event_id,
      MAX(CASE WHEN TRIM(COALESCE(v.country_code,''))<>'' THEN v.id END) country_event_id,
      MAX(CASE WHEN TRIM(COALESCE(v.city,''))<>'' THEN v.id END) city_event_id,
      MAX(CASE WHEN TRIM(COALESCE(v.region_code,''))<>'' THEN v.id END) region_event_id,
      MAX(COALESCE(v.analytics_consent,0)) analytics_consent,
      MAX(COALESCE(v.ads_consent,0)) ads_consent
    FROM visitor_events v GROUP BY v.visitor_id${having}
    ORDER BY last_seen DESC LIMIT ?
  )
  SELECT r.visitor_id,r.last_seen,r.visits,r.sources,r.pages,
    COALESCE(d.device_id,r.visitor_id) device_id,COALESCE(ip.ip_address,'') ip_address,
    COALESCE(country.country_code,'') country_code,COALESCE(city.city,'') city,
    COALESCE(region.region_code,'') region_code,r.analytics_consent,r.ads_consent,
    l.id lead_id,l.name lead_name,l.phone lead_phone,l.email lead_email,l.status lead_status,
    COALESCE(NULLIF(TRIM(l.location),''),NULLIF(TRIM(COALESCE(city.city,'')||CASE WHEN COALESCE(city.city,'')<>'' AND COALESCE(region.region_code,'')<>'' THEN ', ' ELSE '' END||COALESCE(region.region_code,'')||CASE WHEN (COALESCE(city.city,'')<>'' OR COALESCE(region.region_code,'')<>'') AND COALESCE(country.country_code,'')<>'' THEN ', ' ELSE '' END||COALESCE(country.country_code,'')),''),'') location
  FROM rolled r
  LEFT JOIN visitor_events d ON d.id=r.device_event_id
  LEFT JOIN visitor_events ip ON ip.id=r.ip_event_id
  LEFT JOIN visitor_events country ON country.id=r.country_event_id
  LEFT JOIN visitor_events city ON city.id=r.city_event_id
  LEFT JOIN visitor_events region ON region.id=r.region_event_id
  LEFT JOIN contact_leads l ON l.id=(SELECT ll.id FROM contact_leads ll WHERE ll.visitor_id=r.visitor_id ORDER BY ll.updated_at DESC,ll.id DESC LIMIT 1)
  ORDER BY r.last_seen DESC`;
  try{return await all(env,sql,resultLimit);}
  catch(error){
    // A legacy database may still be adding the optional visitor columns. It
    // must show the saved visits rather than presenting a false empty report.
    if(!/no such (?:column|table)/i.test(String(error?.message||'')))throw error;
    return all(env,`WITH rolled AS (
      SELECT visitor_id,MAX(created_at) last_seen,COUNT(*) visits,
        GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(source),''),'Direct / unknown')) sources,
        GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(path),''),'/')) pages
      FROM visitor_events GROUP BY visitor_id${having}
      ORDER BY last_seen DESC LIMIT ?
    ) SELECT r.*,r.visitor_id device_id,'' ip_address,'' country_code,'' city,'' region_code,
      0 analytics_consent,0 ads_consent,
      l.id lead_id,l.name lead_name,l.phone lead_phone,l.email lead_email,l.status lead_status,
      '' location
      FROM rolled r LEFT JOIN contact_leads l ON l.id=(
        SELECT ll.id FROM contact_leads ll WHERE ll.visitor_id=r.visitor_id ORDER BY ll.id DESC LIMIT 1
      ) ORDER BY r.last_seen DESC`,resultLimit);
  }
}
export async function onRequestGet({request,env,waitUntil}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  try{
    const url=new URL(request.url); const visitorType=String(url.searchParams.get('type')||'all').toLowerCase();
    const listOnly=url.searchParams.get('view')==='list'||url.searchParams.get('export')==='1';
    const exporting=url.searchParams.get('export')==='1';
    const resultLimit=exporting?5000:250;
    // Dashboard, Visitors, Repeat Visitors and exports share short-lived
    // snapshots. A manual Tracking refresh may request refresh=1 to bypass it.
    const recentPromise=cachedVisitorList({request,env,waitUntil,type:visitorType==='repeat'?'repeat':'all',limit:resultLimit,force:url.searchParams.get('refresh')==='1'});
    const analyticsPromise=listOnly?Promise.resolve({...emptyAnalytics,cache:'list-only'}):getVisitorAnalytics({request,env,waitUntil,force:url.searchParams.get('refresh')==='1'});
    const [listResult,analyticsResult]=await Promise.allSettled([recentPromise,analyticsPromise]);
    if(listResult.status==='rejected')throw listResult.reason;
    const analytics=analyticsResult.status==='fulfilled'?analyticsResult.value:{...emptyAnalytics,cache:'unavailable'};
    const analytics_error=analyticsResult.status==='rejected'?String(analyticsResult.reason?.message||'Visitor totals could not be loaded.') : '';
    return json({summary:analytics.summary,sources:analytics.sources,pages:analytics.pages,recent:listResult.value,analytics_cache:analytics.cache,...(analytics_error?{analytics_error}:{})},200,{'cache-control':'private, no-store','x-uc-d1-mode':listOnly?'visitor-list':'visitor-analytics'});
  }catch(e){return json({error:`Visitor records could not be loaded: ${e.message||'Database unavailable.'}`},503,{'cache-control':'no-store'});}
}
