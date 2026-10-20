import { json, getSocialIntegrationSettings, hmacBase64 } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { constantTimeEqual, socialEventExists, recordSocialEvent } from '../../_lib/social-leads.js';
import { ingestXReplyWebhook } from '../../_lib/social-comments.js';
import { ingestXDmWebhook } from '../../_lib/social-dms.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
function findUser(data,id){
  const arr=data?.includes?.users;
  if(Array.isArray(arr)){const u=arr.find(x=>String(x?.id||'')===String(id||''));if(u)return u;}
  if(data?.users&&id&&data.users[id])return data.users[id];
  return null;
}
function extractV2(data){
  const type=clean(data?.event_type||data?.type,120).toLowerCase(),p=data?.payload||{};
  const inbound=type.includes('dm.received')||type.includes('chat.received')||type.includes('mention')||type.includes('reply');
  if(!inbound)return null;
  const authorId=clean(p.sender_id||p.author_id||p.user_id||p.sender?.id,180),user=findUser(data,authorId)||{};
  const username=clean(user.username||p.sender?.username||'',160),name=clean(user.name||p.sender?.name||username||'X / Twitter Enquiry',160);
  const message=clean(p.text||p.message?.text||p.message_data?.text||data?.text||'',5000);
  return {eventId:clean(data?.event_uuid||data?.id||crypto.randomUUID(),240),type,authorId,username,name,message};
}
function extractLegacy(data){
  const dm=(Array.isArray(data?.direct_message_events)?data.direct_message_events[0]:null);
  if(dm&&String(dm.type||'').toLowerCase().includes('create')){
    const authorId=clean(dm.message_create?.sender_id,180),user=findUser(data,authorId)||{},username=clean(user.screen_name||user.username||'',160);
    return {eventId:clean(dm.id||crypto.randomUUID(),240),type:'direct_message_received',authorId,username,name:clean(user.name||username||'X / Twitter Enquiry',160),message:clean(dm.message_create?.message_data?.text||'',5000)};
  }
  const tweet=(Array.isArray(data?.tweet_create_events)?data.tweet_create_events[0]:null);
  if(tweet){
    const authorId=clean(tweet.user?.id_str||tweet.user?.id,180),username=clean(tweet.user?.screen_name||'',160);
    return {eventId:clean(tweet.id_str||tweet.id||crypto.randomUUID(),240),type:'post_activity',authorId,username,name:clean(tweet.user?.name||username||'X / Twitter Enquiry',160),message:clean(tweet.text||'',5000)};
  }
  return null;
}

export async function onRequestGet({request,env}){
  const c=(await getSocialIntegrationSettings(env)).x||{},u=new URL(request.url),crc=clean(u.searchParams.get('crc_token'),1000);
  if(!c.enabled||!c.apiSecret||!crc)return json({error:'X / Twitter webhook is not configured.'},403);
  const token=await hmacBase64(c.apiSecret,crc);
  return json({response_token:`sha256=${token}`});
}

export async function onRequestPost({request,env}){
  const c=(await getSocialIntegrationSettings(env)).x||{};
  if(!c.enabled||!c.apiSecret)return json({error:'X / Twitter webhook is disabled.'},403);
  const raw=await request.text(),signature=clean(request.headers.get('x-twitter-webhooks-signature'),1000);
  const expected=`sha256=${await hmacBase64(c.apiSecret,raw)}`;
  if(!signature||!constantTimeEqual(signature,expected))return json({error:'Invalid X / Twitter webhook signature.'},401);
  let body;try{body=JSON.parse(raw);}catch(_){return json({error:'Invalid JSON'},400);}
  const events=Array.isArray(body)?body:[body];let processed=0,ignored=0,duplicates=0,failed=0;
  for(const data of events){
    const x=extractV2(data)||extractLegacy(data),eventId=clean(x?.eventId||data?.event_uuid||data?.id||crypto.randomUUID(),240);
    if(await socialEventExists(env,'x',eventId)){duplicates++;continue;}
    if(!x){ignored++;await recordSocialEvent(env,{platform:'x',eventId,eventType:clean(data?.event_type||data?.type||'activity',120),payload:data,status:'ignored'});continue;}
    try{
      try{await ingestXReplyWebhook(env,x,data);}catch(_){}
      try{await ingestXDmWebhook(env,x,data);}catch(_){}
      const sourceDetail=['X / Twitter',x.type,x.username?`@${x.username}`:''].filter(Boolean).join(' • ');
      const input={name:x.name||'X / Twitter Enquiry',visitor_id:x.authorId?`x:${x.authorId}`:'',twitter_id:x.username||'',message:x.message||`New ${x.type} activity received from X / Twitter.`,source_detail:sourceDetail,interest_level:'Warm',assigned_to:'Admin'};
      const merged=await mergeLeadSubmission(env,input,{submissionType:'social_lead',source:'x',sourceDetail});
      await recordSocialEvent(env,{platform:'x',eventId,externalLeadId:x.authorId||'',leadId:merged.lead?.id||null,eventType:x.type,payload:data,status:'processed'});
      processed++;
    }catch(err){failed++;await recordSocialEvent(env,{platform:'x',eventId,externalLeadId:x.authorId||'',eventType:x.type,payload:data,status:'error',errorMessage:String(err?.message||err)});}
  }
  return json({ok:true,processed,ignored,duplicates,failed});
}
