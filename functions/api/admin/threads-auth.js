import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { testThreadsConnection } from '../../_lib/social-publishing.js';
const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/threads-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();if(action!=='url')return json({error:'Use action=url to start the Threads connection.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.threads||{})};if(!c.appId||!c.appSecret)return json({error:'Save the Threads App ID and App Secret before connecting Threads.'},400);
  const oauthState=state();c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();social.threads=c;await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({client_id:c.appId,redirect_uri:redirectUrl(request,env),scope:'threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies',response_type:'code',state:oauthState});
  return json({ok:true,url:`https://threads.net/oauth/authorize?${params.toString()}`,redirectUrl:redirectUrl(request,env)});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),action=clean(b.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c={...(social.threads||{})};
  if(action==='disconnect'){c.accessToken='';c.userId='';c.username='';c.tokenExpiresAt='';c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';c.lastTestMessage='';c.identityReady=null;c.publishingReady=null;c.replyReadReady=null;c.replyManagementReady=null;c.latestPermalink='';social.threads=c;await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'Threads disconnected. Saved App ID/Secret were kept.'});}
  if(action==='test'){try{return json(await testThreadsConnection(env));}catch(e){return json({error:e.message||'Threads connection check failed.'},502);}}
  return json({error:'Choose Test Connection or Disconnect.'},400);
}
