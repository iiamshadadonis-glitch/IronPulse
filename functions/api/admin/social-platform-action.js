import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting } from '../../_lib/utils.js';
import {
  testFacebookConnection,inspectFacebookCapabilities,testInstagramConnection,inspectInstagramCapabilities,testLinkedInConnection,testXConnection,
  testGoogleIndexingConnection,testIndexNowConnection,submitGoogleIndexingUrl,submitIndexNowUrl
} from '../../_lib/social-publishing.js';
import { diagnoseIntegrationError, successMessage } from '../../_lib/integration-diagnostics.js';

const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);

async function disconnect(env,platform){
  const s=await getSocialIntegrationSettings(env);
  if(platform==='facebook')s.facebook={...s.facebook,autoPublish:false,pageAccessToken:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastTestedAt:'',lastTestMessage:'',lastPublishError:'',lastWebhookMessage:'',lastWebhookFields:[],pageName:'',pageTasks:[],tokenType:'',tokenAppId:'',grantedScopes:[],publishingReady:null,webhookReady:null,messagingReady:null,leadReady:null,engagementReady:null,oauthState:'',oauthStateExpiresAt:''};
  else if(platform==='instagram')s.instagram={...s.instagram,autoPublish:false,pageAccessToken:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastTestedAt:'',lastTestMessage:'',lastPublishError:'',lastWebhookMessage:'',lastWebhookFields:[],username:'',accountName:'',accountType:'',pageName:'',pageTasks:[],tokenType:'',tokenAppId:'',grantedScopes:[],identityReady:null,publishingReady:null,commentReady:null,messagingReady:null,leadReady:null,webhookReady:null,commentReadVerified:null};
  else if(platform==='linkedin')s.linkedin={...s.linkedin,autoPublish:false,accessToken:'',refreshToken:'',tokenExpiresAt:'',refreshTokenExpiresAt:'',grantedScopes:'',oauthState:'',oauthStateExpiresAt:'',memberId:'',memberName:'',memberEmail:'',organizationName:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastTestedAt:'',lastTestMessage:'',lastPublishError:'',identityReady:null,publishingReady:null,commentReadReady:null,commentWriteReady:null,leadSyncReady:null,adsReady:null};
  else if(platform==='x')s.x={...s.x,autoPublish:false,accessToken:'',refreshToken:'',bearerToken:'',tokenExpiresAt:'',grantedScopes:'',username:'',userId:'',oauthState:'',oauthStateExpiresAt:'',pkceVerifier:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastPublishError:''};
  else if(platform==='google_indexing')s.googleIndexing={...s.googleIndexing,autoPublish:false,serviceAccountEmail:'',privateKey:'',lastSubmittedAt:'',lastError:''};
  else if(platform==='indexnow')s.indexNow={...s.indexNow,autoPublish:false,key:'',lastSubmittedAt:'',lastSubmittedUrl:'',lastSubmitStatus:0,lastSubmitError:'',cooldownUntil:'',recentSubmissions:[],lastTestedAt:'',lastTestMessage:'',lastError:''};
  else throw new Error('This platform is not supported by this action.');
  await setSetting(env,'social_integration_settings',s);return {ok:true,message:successMessage(platform,'disconnect')};
}

async function metaResult(res,label){
  const text=await res.text().catch(()=>''),data=(()=>{try{return text?JSON.parse(text):{};}catch{return {raw:text};}})();
  if(!res.ok||data?.error){const er=data?.error||{};const e=new Error(er.message||data?.message||text||`${label} failed (${res.status}).`);e.httpStatus=res.status;e.upstreamCode=String(er.code||'');e.upstreamSubcode=String(er.error_subcode||'');e.upstreamMessage=er.message||e.message;throw e;}return data;
}
async function subscribeFacebookWebhook(env){
  const s=await getSocialIntegrationSettings(env),c=s.facebook||{};
  if(!c.pageId||!c.pageAccessToken)throw new Error('Save the Facebook Page ID and Page Access Token before configuring the webhook subscription.');
  const version=/^v\d+\.\d+$/.test(String(c.graphVersion||''))?c.graphVersion:'v26.0';
  const cap=await inspectFacebookCapabilities(env,c);
  if(cap.webhookReady===false){
    const e=new Error('The Facebook Page token is valid, but it does not have pages_manage_metadata and/or the required MODERATE/MANAGE Page task. Meta requires this capability to manage /subscribed_apps webhook subscriptions.');e.httpStatus=403;e.upstreamCode='200';e.upstreamMessage=e.message;throw e;
  }
  let existingFields=[],existingApp=null;
  try{
    const sub=await metaResult(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}/subscribed_apps?access_token=${encodeURIComponent(c.pageAccessToken)}`),'Facebook webhook subscription lookup');
    const apps=Array.isArray(sub?.data)?sub.data:[];existingApp=c.appId?apps.find(x=>String(x.id||'')===String(c.appId)):apps[0];
    existingFields=Array.isArray(existingApp?.subscribed_fields)?existingApp.subscribed_fields.map(String):[];
  }catch(e){
    // Code 210 normally means the stored token is not a Page token. Do not try to mutate subscriptions in that state.
    if(String(e.upstreamCode||'')==='210')throw e;
    // If the token scope is known and should support metadata, preserve the precise lookup failure.
    if(cap.webhookReady===true)throw e;
  }
  const groups=[
    {name:'Page activity/comments',fields:['feed'],allowed:cap.webhookReady!==false,needs:'pages_manage_metadata'},
    {name:'Lead Ads',fields:['leadgen'],allowed:cap.leadReady!==false,needs:'leads_retrieval'},
    {name:'Messenger',fields:['messages','messaging_postbacks','message_deliveries','message_reads'],allowed:cap.messagingReady!==false,needs:'pages_messaging + pages_manage_metadata'}
  ];
  const active=new Set(existingFields),added=[],skipped=[],failed=[];
  for(const group of groups){
    if(!group.allowed){skipped.push(`${group.name} (${group.needs} is missing)`);continue;}
    const missing=group.fields.filter(x=>!active.has(x));if(!missing.length)continue;
    const candidate=Array.from(new Set([...active,...group.fields]));
    const body=new URLSearchParams({subscribed_fields:candidate.join(','),access_token:c.pageAccessToken});
    try{
      await metaResult(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}/subscribed_apps`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),`Facebook ${group.name} webhook subscription`);
      group.fields.forEach(x=>active.add(x));added.push(group.name);
    }catch(e){
      const d=diagnoseIntegrationError('facebook',e,{action:`${group.name} webhook subscription`});failed.push(`${group.name}: ${d.message}`);
    }
  }
  // Verify the final state when possible.
  let verifiedFields=Array.from(active);
  try{
    const sub=await metaResult(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}/subscribed_apps?access_token=${encodeURIComponent(c.pageAccessToken)}`),'Facebook webhook verification');
    const apps=Array.isArray(sub?.data)?sub.data:[],own=c.appId?apps.find(x=>String(x.id||'')===String(c.appId)):apps[0];
    if(own&&Array.isArray(own.subscribed_fields))verifiedFields=own.subscribed_fields.map(String);
  }catch(_){/* keep last known fields */}
  const partial=failed.length>0||skipped.length>0;
  const message=partial
    ?`Facebook webhook configuration is partially ready. Active/verified fields: ${verifiedFields.length?verifiedFields.join(', '):'none confirmed'}. ${added.length?`Added: ${added.join(', ')}. `:''}${skipped.length?`Skipped because permissions are missing: ${skipped.join('; ')}. `:''}${failed.length?`Meta refused: ${failed.join(' | ')} `:''}Existing working subscriptions were not intentionally removed. Update the missing Facebook Login for Business permissions, reconnect Facebook, then run Configure Webhook Events again.`
    :`Facebook webhook subscription is ready for this Page. Active fields: ${verifiedFields.join(', ')}. Meta accepted the Page subscription and the website callback can receive the supported Page activity, Lead Ads and Messenger events.`;
  s.facebook={...c,lastWebhookConfiguredAt:new Date().toISOString(),lastWebhookFields:verifiedFields,lastWebhookMessage:message,lastError:partial?message:''};await setSetting(env,'social_integration_settings',s);
  return {ok:true,partial,fields:verifiedFields,added,skipped,failed,message};
}


async function subscribeInstagramWebhook(env){
  const s=await getSocialIntegrationSettings(env),c=s.instagram||{};
  if(!c.instagramBusinessId||(!c.pageAccessToken&&!c.instagramLoginToken))throw new Error('Save the Instagram Business Account ID and a valid Instagram messaging access token before configuring Instagram webhook events.');
  const version=/^v\d+\.\d+$/.test(String(c.graphVersion||''))?c.graphVersion:'v26.0',cap=await inspectInstagramCapabilities(env,c);
  const igScopes=new Set(Array.isArray(c.grantedScopes)?c.grantedScopes.map(String):String(c.grantedScopes||'').split(/[\s,]+/).filter(Boolean));
  const commentAllowed=cap.commentReady!==false;
  const messagingAllowed=cap.messagingReady===true||igScopes.has('instagram_business_manage_messages')||igScopes.has('instagram_manage_messages');
  if(!commentAllowed&&!messagingAllowed){const e=new Error('Instagram authentication is valid, but this token does not currently expose comments or messaging webhook permissions. Add the required Instagram permissions, reconnect if needed, then run Configure Webhook Events again.');e.httpStatus=403;e.upstreamCode='200';throw e;}

  const routes=[];
  if(c.instagramLoginToken)routes.push({endpoint:`https://graph.instagram.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/subscribed_apps`,token:c.instagramLoginToken,mode:'instagram_login_api',json:true});
  if(c.pageAccessToken)routes.push({endpoint:`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/subscribed_apps`,token:c.pageAccessToken,mode:'facebook_login_api',json:false});

  const verified=new Set(),errors=[],added=[],optionalFailed=[];let mode='api',endpointUsed='';
  const fieldsFromLookup=(lookup,appId='')=>{const apps=Array.isArray(lookup?.data)?lookup.data:[],own=appId?apps.find(x=>String(x.id||'')===String(appId)):apps[0];return Array.isArray(own?.subscribed_fields)?own.subscribed_fields.map(String):[];};
  for(const route of routes){
    let active=new Set();
    const lookup=async()=>{
      const d=await metaResult(await fetch(`${route.endpoint}?access_token=${encodeURIComponent(route.token)}`,{headers:{authorization:`Bearer ${route.token}`}}),'Instagram webhook subscription verification');
      const f=fieldsFromLookup(d,String(c.appId||s.facebook?.appId||''));for(const x of f){active.add(x);verified.add(x);}return f;
    };
    const post=async fields=>{
      const list=Array.from(new Set(fields.filter(Boolean)));
      let res;
      if(route.json)res=await fetch(route.endpoint,{method:'POST',headers:{authorization:`Bearer ${route.token}`,'content-type':'application/json'},body:JSON.stringify({subscribed_fields:list})});
      else{const body=new URLSearchParams({subscribed_fields:list.join(','),access_token:route.token});res=await fetch(route.endpoint,{method:'POST',headers:{authorization:`Bearer ${route.token}`,'content-type':'application/x-www-form-urlencoded'},body});}
      await metaResult(res,'Instagram webhook subscription');active=new Set(list);for(const x of list)verified.add(x);return list;
    };
    try{await lookup().catch(()=>[]);
      // V16.66: establish the critical realtime fields first. Sending every
      // optional Instagram field in one request can make an optional rejection
      // prevent the core messages subscription from being repaired.
      const core=[];if(messagingAllowed)core.push('messages');if(commentAllowed)core.push('comments');
      for(const field of core){if(active.has(field))continue;try{await post([...active,field]);added.push(field);await lookup().catch(()=>{});}catch(e){errors.push(`${field}: ${clean(e?.upstreamMessage||e?.message,500)}`);}}
      const optional=[];if(messagingAllowed)optional.push('messaging_postbacks','message_reactions','messaging_seen');if(commentAllowed)optional.push('live_comments');
      for(const field of optional){if(active.has(field))continue;try{await post([...active,field]);added.push(field);}catch(e){optionalFailed.push(`${field}: ${clean(e?.upstreamMessage||e?.message,400)}`);}}
      await lookup().catch(()=>{});endpointUsed=route.endpoint;mode=route.mode;
      const commentsReady=!commentAllowed||verified.has('comments'),messagesReady=!messagingAllowed||verified.has('messages');if(commentsReady&&messagesReady)break;
    }catch(e){errors.push(clean(e?.upstreamMessage||e?.message,700));}
  }
  const fields=Array.from(verified),commentsReady=!commentAllowed||verified.has('comments'),messagesReady=!messagingAllowed||verified.has('messages'),ready=commentsReady&&messagesReady;
  if(!ready)mode='awaiting_live_event';
  const detail=[...errors,...optionalFailed].filter(Boolean).join(' | ');
  const message=ready
    ?`Instagram realtime webhook subscription is ready. Core fields confirmed: ${[messagingAllowed?'messages':'',commentAllowed?'comments':''].filter(Boolean).join(', ')}. ${optionalFailed.length?'Some optional events were not accepted, but they do not block new DMs or comments. ':''}New Instagram DMs can now trigger automations through the webhook without waiting for Inbox synchronization.`
    :`Instagram access is working, but Meta did not confirm every core realtime field yet. Keep the callback URL and Verify Token configured in Meta App Dashboard → Instagram → Webhooks. The Inbox realtime safety check remains enabled while the core subscription is repaired.${detail?` Meta response: ${detail}`:''}`;
  const priorError=/webhook/i.test(String(c.lastError||''))?'':String(c.lastError||'');
  s.instagram={...c,lastWebhookConfiguredAt:new Date().toISOString(),lastWebhookFields:fields,webhookReady:ready?true:null,messagingWebhookReady:messagingAllowed?(verified.has('messages')?true:null):null,webhookSubscriptionMode:mode,lastWebhookEndpoint:endpointUsed,lastWebhookMessage:message,lastError:priorError};await setSetting(env,'social_integration_settings',s);
  return {ok:true,partial:!ready,awaitingLiveEvent:!ready,mode,fields,added,optionalFailed,desired:[...(messagingAllowed?['messages','messaging_postbacks','message_reactions','messaging_seen']:[]),...(commentAllowed?['comments','live_comments']:[])],message};
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),platform=clean(b.platform,60).toLowerCase(),action=clean(b.action,60).toLowerCase();
  try{
    if(action==='disconnect')return json(await disconnect(env,platform));
    if(platform==='facebook'){
      if(action==='subscribe_webhook')return json(await subscribeFacebookWebhook(env));
      return json(await testFacebookConnection(env));
    }
    if(platform==='instagram'){if(action==='subscribe_webhook')return json(await subscribeInstagramWebhook(env));return json(await testInstagramConnection(env));}
    if(platform==='linkedin')return json(await testLinkedInConnection(env));
    if(platform==='x'||platform==='twitter')return json(await testXConnection(env));
    if(platform==='google_indexing'){
      if(action==='submit')return json(await submitGoogleIndexingUrl(env,clean(b.url,1800)));
      return json(await testGoogleIndexingConnection(env));
    }
    if(platform==='indexnow'||platform==='bing'){
      if(action==='submit')return json(await submitIndexNowUrl(env,clean(b.url,1800)));
      return json(await testIndexNowConnection(env));
    }
    return json({error:'Unsupported platform action. Choose one of the integrations displayed in Social Media API.'},400);
  }catch(e){
    const d=diagnoseIntegrationError(platform,e,{action:action==='test'||action==='connect'?'connection test':action==='subscribe_webhook'?'webhook subscription':action||'request'});
    return json({ok:false,error:d.message,diagnostic:d,upstreamStatus:d.httpStatus},400);
  }
}
