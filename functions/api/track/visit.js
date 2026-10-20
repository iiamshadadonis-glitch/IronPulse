import { json, readJson } from '../../_lib/utils.js';
import { contactContext } from '../../_lib/contact-context.js';
// A partially upgraded D1 table must never silently discard a new visit.
// Repair only missing visitor columns on that rare path; normal requests keep
// the existing single INSERT/UPDATE and perform no schema reads.
const visitorColumns={duration_ms:'INTEGER NOT NULL DEFAULT 0',ip_address:"TEXT NOT NULL DEFAULT ''",device_id:"TEXT NOT NULL DEFAULT ''",analytics_consent:'INTEGER NOT NULL DEFAULT 0',ads_consent:'INTEGER NOT NULL DEFAULT 0',country_code:"TEXT NOT NULL DEFAULT ''",city:"TEXT NOT NULL DEFAULT ''",region_code:"TEXT NOT NULL DEFAULT ''"};
const missingColumn=error=>/no such column|has no column named/i.test(String(error?.message||''));
async function repairVisitorColumns(db){
  const info=await db.prepare('PRAGMA table_info(visitor_events)').all();
  const names=new Set((info.results||[]).map(row=>row.name));
  for(const [name,type] of Object.entries(visitorColumns))if(!names.has(name)){
    try{await db.prepare(`ALTER TABLE visitor_events ADD COLUMN ${name} ${type}`).run();names.add(name);}
    catch(error){/* Some databases cannot alter columns here; the safe legacy insert below keeps the visit. */}
  }
  return names;
}
async function withVisitorSchema(db,action,fallback){
  try{return await action();}
  catch(error){
    if(!missingColumn(error))throw error;
    const names=await repairVisitorColumns(db);
    try{return await action();}
    catch(retryError){if(!missingColumn(retryError))throw retryError;return fallback(names);}
  }
}
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const context = contactContext(request,b);
  const visitorId = String(b.visitor_id || '').slice(0,80);
  if (!visitorId) return json({ ok:false, error:'visitor_id required' }, 400);
  const path = String(b.path || '/').slice(0,300);
  const referrer = String(b.referrer || '').slice(0,500);
  const source = String(b.source || 'Direct / unknown').slice(0,120);
  const ua = String(request.headers.get('user-agent') || '').slice(0,300);
  const duration = Math.max(0, Math.min(24*60*60*1000, Number(b.duration_ms || 0)));

  if (String(b.event || '') === 'duration') {
    const update=()=>env.DB.prepare(`UPDATE visitor_events SET duration_ms=MAX(duration_ms,?),
      ip_address=CASE WHEN ?<>'' THEN ? ELSE ip_address END,
      device_id=CASE WHEN ?<>'' THEN ? ELSE device_id END,
      city=CASE WHEN ?<>'' THEN ? ELSE city END,
      region_code=CASE WHEN ?<>'' THEN ? ELSE region_code END,
      country_code=CASE WHEN ?<>'' THEN ? ELSE country_code END,
      analytics_consent=MAX(analytics_consent,?),ads_consent=MAX(ads_consent,?)
      WHERE id=(SELECT id FROM visitor_events WHERE visitor_id=? AND path=? ORDER BY id DESC LIMIT 1)`)
      .bind(duration,context.ip_address,context.ip_address,context.device_id,context.device_id,context.city,context.city,context.region_code,context.region_code,context.country_code,context.country_code,context.analytics_consent,context.ads_consent,visitorId,path).run();
    const upd=await withVisitorSchema(env.DB,update,names=>names.has('duration_ms')?env.DB.prepare('UPDATE visitor_events SET duration_ms=MAX(duration_ms,?) WHERE id=(SELECT id FROM visitor_events WHERE visitor_id=? AND path=? ORDER BY id DESC LIMIT 1)').bind(duration,visitorId,path).run():{meta:{changes:1}});
    if ((upd.meta?.changes || 0) > 0) return json({ ok:true, updated:true });
  }

  const insert=()=>env.DB.prepare('INSERT INTO visitor_events(visitor_id,path,referrer,source,user_agent,duration_ms,ip_address,device_id,analytics_consent,ads_consent,country_code,city,region_code) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(visitorId,path,referrer,source,ua,duration,context.ip_address,context.device_id,context.analytics_consent,context.ads_consent,context.country_code,context.city,context.region_code).run();
  const values={visitor_id:visitorId,path,referrer,source,user_agent:ua,duration_ms:duration,ip_address:context.ip_address,device_id:context.device_id,analytics_consent:context.analytics_consent,ads_consent:context.ads_consent,country_code:context.country_code,city:context.city,region_code:context.region_code};
  await withVisitorSchema(env.DB,insert,names=>{const fields=Object.keys(values).filter(name=>names.has(name));return env.DB.prepare(`INSERT INTO visitor_events(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`).bind(...fields.map(name=>values[name])).run();});
  return json({ ok:true });
}
