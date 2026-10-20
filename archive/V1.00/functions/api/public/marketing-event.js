import { json, readJson } from '../../_lib/utils.js';
import { ensureMarketingSchema, getMarketingSettings } from '../../_lib/marketing-suite.js';
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
const bool=v=>v===true||['1','true','yes','on'].includes(String(v??'').toLowerCase());
async function sha256(value){const data=new TextEncoder().encode(String(value||'').trim().toLowerCase()),hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sendMetaConversion(env,request,b,{visitor,event,value}){
  if(!bool(b.adsConsent)||!['lead','purchase','add_to_cart'].includes(event))return;
  const settings=await getMarketingSettings(env),meta=settings.metaAds||{};if(!meta.enabled||!meta.conversionsApiEnabled||!meta.pixelId||!meta.accessToken)return;
  const names={lead:'Lead',purchase:'Purchase',add_to_cart:'AddToCart'},eventSource=clean(b.sourceUrl,1000),userData={client_user_agent:clean(request.headers.get('user-agent'),500),external_id:[await sha256(visitor)]},ip=clean(request.headers.get('cf-connecting-ip'),80);if(ip)userData.client_ip_address=ip;
  const payload={data:[{event_name:names[event],event_time:Math.floor(Date.now()/1000),event_id:clean(b.eventId,120)||`${event}-${visitor}-${Date.now()}`,action_source:'website',event_source_url:eventSource,user_data:userData,custom_data:{currency:'INR',value:value/100}}]};if(meta.testEventCode)payload.test_event_code=meta.testEventCode;
  const r=await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(meta.pixelId)}/events?access_token=${encodeURIComponent(meta.accessToken)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d?.error?.message||'Meta Conversions API event failed.');}
}
export async function onRequestPost(context){
  const {request,env}=context;
  try{
    await ensureMarketingSchema(env);const b=await readJson(request),visitor=clean(b.visitorId,80);if(!visitor)return json({error:'Visitor reference required.'},400);const event=['page_view','click','lead','purchase','add_to_cart'].includes(b.event)?b.event:'page_view',source=clean(b.source,120)||'Direct / unknown',channel=clean(b.channel,50)||source,day=new Date().toISOString().slice(0,10),purchase=event==='purchase'?1:0,metric=event==='page_view'?'impressions':event==='click'||event==='add_to_cart'?'clicks':event==='lead'?'leads':'conversions',value=Math.max(0,Number(b.valuePaise)||0);
    await env.DB.prepare(`INSERT INTO marketing_daily_metrics(day,channel,campaign_id,${metric},revenue_paise) VALUES(?,?,0,1,?) ON CONFLICT(day,channel,campaign_id) DO UPDATE SET ${metric}=${metric}+1,revenue_paise=revenue_paise+excluded.revenue_paise`).bind(day,channel,purchase?value:0).run();
    await env.DB.prepare(`INSERT INTO marketing_visitor_stage(visitor_id,stage_no,last_event,source,purchased,last_advanced_at,updated_at) VALUES(?,1,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(visitor_id) DO UPDATE SET stage_no=CASE WHEN excluded.purchased=1 THEN stage_no WHEN datetime(last_advanced_at)<=datetime('now','-12 hours') THEN MIN(stage_no+1,14) ELSE stage_no END,last_event=excluded.last_event,source=excluded.source,purchased=MAX(purchased,excluded.purchased),last_advanced_at=CASE WHEN datetime(last_advanced_at)<=datetime('now','-12 hours') THEN CURRENT_TIMESTAMP ELSE last_advanced_at END,updated_at=CURRENT_TIMESTAMP`).bind(visitor,event,source,purchase).run();
    const conversion=sendMetaConversion(env,request,b,{visitor,event,value}).catch(()=>{});if(typeof context.waitUntil==='function')context.waitUntil(conversion);else await conversion;
    return json({ok:true,purchaserExcluded:!!purchase});
  }catch(e){return json({error:e.message||'Marketing event could not be recorded.'},400);}
}
