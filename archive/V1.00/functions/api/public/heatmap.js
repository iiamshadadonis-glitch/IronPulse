import { json, readJson } from '../../_lib/utils.js';
import { ensureMarketingSchema } from '../../_lib/marketing-suite.js';
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
export async function onRequestPost({request,env}){
  try{
    await ensureMarketingSchema(env);const b=await readJson(request),events=Array.isArray(b.events)?b.events.slice(0,30):[];if(!events.length)return json({ok:true,recorded:0});const day=new Date().toISOString().slice(0,10),path=clean(b.path,300)||'/',device=['mobile','tablet','desktop'].includes(b.device)?b.device:'desktop',sql=`INSERT INTO heatmap_daily_cells(day,path,device,map_type,x_bucket,y_bucket,element_key,event_count,duration_ms,visitors) VALUES(?,?,?,?,?,?,?,?,?,1) ON CONFLICT(day,path,device,map_type,x_bucket,y_bucket,element_key) DO UPDATE SET event_count=event_count+excluded.event_count,duration_ms=duration_ms+excluded.duration_ms,visitors=visitors+1`,statements=[];
    for(const e of events){const type=['heat','scroll','attention'].includes(e.type)?e.type:'heat',x=Math.max(0,Math.min(19,Math.floor(Number(e.x)||0))),y=Math.max(0,Math.min(99,Math.floor(Number(e.y)||0))),element=clean(e.element,140),count=Math.max(1,Math.min(100,Number(e.count)||1)),duration=Math.max(0,Math.min(600000,Number(e.durationMs)||0));statements.push(env.DB.prepare(sql).bind(day,path,device,type,x,y,element,count,duration));}
    const sessionId=clean(b.sessionId,100).replace(/[^a-z0-9_-]/gi,''),stats=b.stats||{};
    if(sessionId)statements.push(env.DB.prepare(`INSERT INTO heatmap_daily_sessions(day,path,device,session_id,event_count,duration_ms,max_scroll) VALUES(?,?,?,?,?,?,?) ON CONFLICT(day,path,device,session_id) DO UPDATE SET event_count=event_count+excluded.event_count,duration_ms=duration_ms+excluded.duration_ms,max_scroll=MAX(max_scroll,excluded.max_scroll),updated_at=CURRENT_TIMESTAMP`).bind(day,path,device,sessionId,Math.max(0,Math.min(1000,Number(stats.eventCount)||events.reduce((n,x)=>n+(Number(x.count)||1),0))),Math.max(0,Math.min(3600000,Number(stats.durationMs)||0)),Math.max(0,Math.min(100,Number(stats.maxScroll)||0))));
    if(statements.length)await env.DB.batch(statements);return json({ok:true,recorded:events.length,sessionTracked:!!sessionId});
  }catch(e){return json({error:e.message||'Heat-map activity could not be recorded.'},400);}
}
