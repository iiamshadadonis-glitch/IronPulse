import { json, requireAdmin } from '../../_lib/utils.js';

const clean=(value,limit=500)=>String(value??'').trim().slice(0,limit);
const SOCIAL_FIELDS=['facebook_id','instagram_id','threads_id','snapchat_id','linkedin_id','twitter_id','pinterest_id','youtube_id','tiktok_id','telegram_id'];

function placeholders(values){return values.map(()=>'?').join(',');}
function visibleContactSql(alias='l'){
  // A public comment alone does not create an address-book entry. The same
  // person becomes visible after a direct message, form, profile, request or
  // checkout interaction supplies contact/identity data.
  return `(lower(COALESCE(${alias}.source,'')) NOT IN ('comment','article_comment','blog_comment')
    OR EXISTS(SELECT 1 FROM lead_submissions sx WHERE sx.lead_id=${alias}.id AND lower(COALESCE(sx.submission_type,'')) NOT IN ('comment','article_comment'))
    OR EXISTS(SELECT 1 FROM lead_identity_links ix WHERE ix.lead_id=${alias}.id))`;
}

async function candidatesFor(env,ids){
  if(!ids.length)return [];
  return (await env.DB.prepare(`SELECT lead_id,field_name,value,normalized_value,is_primary,is_pending,source,last_seen_at
    FROM lead_field_candidates WHERE lead_id IN (${placeholders(ids)})
    ORDER BY lead_id,field_name,is_primary DESC,is_pending DESC,last_seen_at DESC,id DESC`).bind(...ids).all().catch(()=>({results:[]}))).results||[];
}
async function linksFor(env,ids){
  if(!ids.length)return [];
  return (await env.DB.prepare(`SELECT lead_id,platform,external_id,updated_at
    FROM lead_identity_links WHERE lead_id IN (${placeholders(ids)}) ORDER BY updated_at DESC,rowid DESC`).bind(...ids).all().catch(()=>({results:[]}))).results||[];
}
async function eventsFor(env,visitorIds){
  if(!visitorIds.length)return [];
  return (await env.DB.prepare(`SELECT latest.visitor_id,
      COALESCE(NULLIF(latest.device_id,''),latest.visitor_id) device_id,
      COALESCE((SELECT ip.ip_address FROM visitor_events ip WHERE ip.visitor_id=latest.visitor_id AND TRIM(COALESCE(ip.ip_address,''))<>'' ORDER BY ip.id DESC LIMIT 1),'') ip_address,
      COALESCE((SELECT cc.country_code FROM visitor_events cc WHERE cc.visitor_id=latest.visitor_id AND TRIM(COALESCE(cc.country_code,''))<>'' ORDER BY cc.id DESC LIMIT 1),latest.country_code,'') country_code,
      MAX(latest.analytics_consent,(SELECT COALESCE(MAX(a.analytics_consent),0) FROM visitor_events a WHERE a.visitor_id=latest.visitor_id)) analytics_consent,
      MAX(latest.ads_consent,(SELECT COALESCE(MAX(a.ads_consent),0) FROM visitor_events a WHERE a.visitor_id=latest.visitor_id)) ads_consent,
      latest.created_at
    FROM visitor_events latest JOIN (
      SELECT visitor_id,MAX(id) id FROM visitor_events WHERE visitor_id IN (${placeholders(visitorIds)}) GROUP BY visitor_id
    ) newest ON newest.id=latest.id`).bind(...visitorIds).all().catch(()=>({results:[]}))).results||[];
}

function assemble(rows,candidates,links,events){
  const byLead=new Map(),linksByLead=new Map(),eventByVisitor=new Map(events.map(row=>[String(row.visitor_id||''),row]));
  for(const row of candidates){const id=Number(row.lead_id);if(!byLead.has(id))byLead.set(id,{});const map=byLead.get(id);(map[row.field_name]||(map[row.field_name]=[])).push(row);}
  for(const row of links){const id=Number(row.lead_id);if(!linksByLead.has(id))linksByLead.set(id,[]);linksByLead.get(id).push(row);}
  return rows.map(row=>{
    const map=byLead.get(Number(row.id))||{},identityLinks=linksByLead.get(Number(row.id))||[],event=eventByVisitor.get(String(row.visitor_id||''))||{};
    const primary={...row};
    for(const field of SOCIAL_FIELDS){
      if(field==='instagram_id'&&row.instagram_id)continue;
      const candidate=(map[field]||[]).find(item=>Number(item.is_primary||0)===1)||(map[field]||[])[0];
      if(candidate)primary[field]=candidate.value;
    }
    for(const link of identityLinks){
      const platform=String(link.platform||'').toLowerCase()==='x'?'twitter':String(link.platform||'').toLowerCase();
      const field=platform==='twitter'?'twitter_id':`${platform}_id`;
      if(SOCIAL_FIELDS.includes(field)&&!primary[field])primary[field]=link.external_id||'';
    }
    const aliases={};
    for(const [field,items] of Object.entries(map)){
      const current=clean(primary[field],500).toLowerCase();
      const values=[];const seen=new Set();
      for(const item of items){const value=clean(item.value,500),key=value.toLowerCase();if(!value||key===current||seen.has(key))continue;seen.add(key);values.push({value,source:item.source||'',pending:Number(item.is_pending||0)===1});}
      if(values.length)aliases[field]=values;
    }
    const context={
      device_id:clean((map.device_id||[])[0]?.value||event.device_id||row.visitor_id,120),
      ip_address:clean((map.ip_address||[])[0]?.value||event.ip_address,80),
      country_code:clean((map.country_code||[])[0]?.value||event.country_code,12),
      analytics_consent:Number(event.analytics_consent||0)===1,
      ads_consent:Number(event.ads_consent||0)===1
    };
    return {...primary,aliases,identity_links:identityLinks,context,marketing_eligible:context.ads_consent&&Boolean(primary.email||primary.phone)};
  });
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  const url=new URL(request.url),id=Math.max(0,Number(url.searchParams.get('id')||0)),q=clean(url.searchParams.get('q'),200),limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit')||200))),offset=Math.max(0,Number(url.searchParams.get('offset')||0));
  const where=[visibleContactSql('l')],binds=[];
  if(id){where.push('l.id=?');binds.push(id);}
  if(q){const like=`%${q}%`;where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.instagram_id LIKE ? OR l.location LIKE ? OR EXISTS(SELECT 1 FROM lead_field_candidates cq WHERE cq.lead_id=l.id AND cq.value LIKE ?))`);binds.push(like,like,like,like,like,like);}
  const rows=(await env.DB.prepare(`SELECT l.* FROM contact_leads l WHERE ${where.join(' AND ')} ORDER BY COALESCE(l.updated_at,l.created_at) DESC,l.id DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all()).results||[];
  const ids=rows.map(row=>Number(row.id)).filter(Boolean),visitorIds=[...new Set(rows.map(row=>clean(row.visitor_id,80)).filter(Boolean))];
  const [candidates,links,events]=await Promise.all([candidatesFor(env,ids),linksFor(env,ids),eventsFor(env,visitorIds)]);
  const contacts=assemble(rows,candidates,links,events);
  const countStatement=env.DB.prepare(`SELECT COUNT(*) total FROM contact_leads l WHERE ${where.join(' AND ')}`);
  const totalRow=await (binds.length?countStatement.bind(...binds):countStatement).first().catch(()=>({total:contacts.length}));
  return json({ok:true,contacts,total:Number(totalRow?.total||0),limit,offset});
}
