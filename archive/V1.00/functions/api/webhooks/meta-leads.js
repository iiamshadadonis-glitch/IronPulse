import { json, getSocialIntegrationSettings, setSetting } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { splitCsv, socialEventExists, recordSocialEvent, flattenMetaFieldData, normalizedLeadInput } from '../../_lib/social-leads.js';
import { ingestMetaCommentWebhook } from '../../_lib/social-comments.js';
import { ingestMetaDmWebhook } from '../../_lib/social-dms.js';

const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);

function matchesForm(config,formId){
  const forms=splitCsv(config?.formIds||'');
  return !!(formId && forms.includes(String(formId)));
}
function chooseMetaConfig(settings,pageId,formId){
  const fb=settings.facebook||{},ig=settings.instagram||{};
  if(ig.enabled&&matchesForm(ig,formId))return {platform:'instagram',config:ig};
  if(fb.enabled&&matchesForm(fb,formId))return {platform:'facebook',config:fb};
  const fbPage=fb.enabled&&(!fb.pageId||String(fb.pageId)===String(pageId));
  const igPage=ig.enabled&&(!ig.pageId||String(ig.pageId)===String(pageId));
  if(fbPage&&!igPage)return {platform:'facebook',config:fb};
  if(igPage&&!fbPage)return {platform:'instagram',config:ig};
  if(fbPage)return {platform:'meta',config:fb};
  if(igPage)return {platform:'meta',config:ig};
  return null;
}

async function fetchLead(config,leadId){
  if(!config?.pageAccessToken)throw new Error('Meta Page access token is not configured.');
  const version=/^v\d+\.\d+$/.test(String(config.graphVersion||''))?config.graphVersion:'v26.0';
  const u=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(leadId)}`);
  u.searchParams.set('fields','id,created_time,ad_id,form_id,field_data');
  u.searchParams.set('access_token',config.pageAccessToken);
  const r=await fetch(u.toString());
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.error)throw new Error(d?.error?.message||`Meta lead lookup failed (${r.status}).`);
  return d;
}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),mode=u.searchParams.get('hub.mode'),token=u.searchParams.get('hub.verify_token'),challenge=u.searchParams.get('hub.challenge')||'';
  if(mode!=='subscribe'||!token)return new Response('Forbidden',{status:403});
  const s=await getSocialIntegrationSettings(env);
  const valid=[s.facebook,s.instagram].some(c=>c?.enabled&&c.verifyToken&&c.verifyToken===token);
  return valid?new Response(challenge,{status:200,headers:{'content-type':'text/plain; charset=utf-8'}}):new Response('Forbidden',{status:403});
}

export async function onRequestPost({request,env}){
  const payload=await request.json().catch(()=>null);
  if(!payload)return json({ok:false,error:'Invalid JSON'},400);
  const settings=await getSocialIntegrationSettings(env);
  let accepted=0,created=0,duplicates=0,failed=0,comments=0,messages=0,dms=0,echoesIgnored=0,instagramWebhookSeen=false;
  // `messages` is retained for the older response shape; messaging events are stored only in Inbox.
  const instagramWebhookFields=new Set();
  for(const entry of Array.isArray(payload.entry)?payload.entry:[]){
    for(const messaging of Array.isArray(entry?.messaging)?entry.messaging:[]){
      if(String(payload?.object||'').toLowerCase()==='instagram'||String(entry?.id||messaging?.recipient?.id||'')===String(settings.instagram?.instagramBusinessId||'')){instagramWebhookSeen=true;instagramWebhookFields.add('messages');}
      if(messaging?.message?.is_echo===true||String(messaging?.message?.is_echo||'').toLowerCase()==='true'){echoesIgnored++;continue;}
      try{if(await ingestMetaDmWebhook(env,entry,messaging,payload?.object||''))dms++;}catch(_){ }
    }
    // Instagram webhook examples can arrive either as entry.field/entry.value or
    // entry.changes[]. Support both shapes while keeping the existing Meta Lead flow.
    if(entry?.field&&entry?.value&&String(entry.field).toLowerCase()!=='leadgen'){
      const ef=String(entry.field).toLowerCase();if(ef==='comments'||ef==='live_comments'){instagramWebhookSeen=true;instagramWebhookFields.add(ef);}
      try{if(await ingestMetaCommentWebhook(env,entry,{field:entry.field,value:entry.value}))comments++;}catch(_){}
    }
    for(const change of Array.isArray(entry?.changes)?entry.changes:[]){
      if(String(change?.field||'').toLowerCase()!=='leadgen'){
        const cf=String(change?.field||'').toLowerCase();if(cf==='comments'||cf==='live_comments'){instagramWebhookSeen=true;instagramWebhookFields.add(cf);}
        try{if(await ingestMetaCommentWebhook(env,entry,change))comments++;}catch(_){}
        continue;
      }
      const v=change?.value||{},leadId=clean(v.leadgen_id||v.lead_id,240),formId=clean(v.form_id,240),pageId=clean(v.page_id||entry.id,240);
      if(!leadId)continue;
      accepted++;
      const eventId=clean(`leadgen:${leadId}`,240);
      if(await socialEventExists(env,'meta',eventId)){duplicates++;continue;}
      const chosen=chooseMetaConfig(settings,pageId,formId);
      if(!chosen){failed++;await recordSocialEvent(env,{platform:'meta',eventId,externalLeadId:leadId,eventType:'leadgen',payload:v,status:'ignored',errorMessage:'No enabled Meta lead integration matched this Page/Form.'});continue;}
      try{
        const lead=await fetchLead(chosen.config,leadId);
        const fields=flattenMetaFieldData(lead.field_data||[]);
        const sourceDetail=[chosen.platform==='instagram'?'Instagram Lead Form':chosen.platform==='facebook'?'Facebook Lead Form':'Meta Lead Form',formId?`Form ${formId}`:'',v.ad_id||lead.ad_id?`Ad ${v.ad_id||lead.ad_id}`:'',pageId?`Page ${pageId}`:''].filter(Boolean).join(' • ');
        const input=normalizedLeadInput(fields,{sourceDetail});
        input.source_detail=sourceDetail;
        input.message=input.message||`Lead submitted through ${chosen.platform==='meta'?'Meta':chosen.platform}.`;
        const merged=await mergeLeadSubmission(env,input,{submissionType:'social_lead',source:chosen.platform,sourceDetail});
        await recordSocialEvent(env,{platform:chosen.platform,eventId,externalLeadId:leadId,leadId:merged.lead?.id||null,eventType:'leadgen',payload:{webhook:v,lead},status:'processed'});
        created++;
      }catch(err){
        failed++;await recordSocialEvent(env,{platform:chosen.platform,eventId,externalLeadId:leadId,eventType:'leadgen',payload:v,status:'error',errorMessage:String(err?.message||err)});
      }
    }
  }
  if(instagramWebhookSeen&&settings.instagram?.enabled){
    try{
      const current=await getSocialIntegrationSettings(env),ig=current.instagram||{},merged=Array.from(new Set([...(Array.isArray(ig.lastWebhookFields)?ig.lastWebhookFields:[]),...instagramWebhookFields]));const receivedAt=new Date().toISOString();
      current.instagram={...ig,webhookReady:true,webhookSubscriptionMode:'live_delivery_proof',lastWebhookReceivedAt:receivedAt,lastWebhookFields:merged,lastWebhookMessage:`Live Instagram webhook delivery confirmed at ${receivedAt}. The callback received ${merged.join(', ')||'an Instagram event'}.`,lastError:/webhook/i.test(String(ig.lastError||''))?'':String(ig.lastError||'')};
      await setSetting(env,'social_integration_settings',current);
    }catch(_){}
  }
  return json({ok:true,accepted,processed:created,comments,messages,dms,echoesIgnored,duplicates,failed});
}
