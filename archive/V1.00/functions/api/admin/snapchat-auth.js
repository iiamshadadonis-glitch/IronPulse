import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { SNAPCHAT_PROFILE_SCOPE, testSnapchatConnection } from '../../_lib/snapchat.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;const u=new URL(request.url);if(u.searchParams.get('action')!=='url')return json({error:'Unsupported Snapchat OAuth action.'},400);
  const social=await getSocialIntegrationSettings(env),c=social.snapchat||{};if(!c.oauthClientId||!c.oauthClientSecret)return json({error:'Save the Snapchat Business OAuth Client ID and Client Secret first. Create this OAuth App in Snapchat Business Settings → Business Details, not in the Snap Kit Developer Portal.'},400);
  const origin=preferredPublicOrigin(request,env),redirect=`${origin}/api/admin/snapchat-oauth/callback`,state=crypto.randomUUID()+crypto.randomUUID();social.snapchat={...c,oauthState:state,oauthStateExpiresAt:new Date(Date.now()+10*60*1000).toISOString()};await setSetting(env,'social_integration_settings',social);
  const q=new URLSearchParams({response_type:'code',client_id:c.oauthClientId,redirect_uri:redirect,scope:SNAPCHAT_PROFILE_SCOPE,state});return json({ok:true,url:`https://accounts.snapchat.com/login/oauth2/authorize?${q.toString()}`,redirectUrl:redirect,scope:SNAPCHAT_PROFILE_SCOPE});
}
export async function onRequestPost({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;let b={};try{b=await readJson(request)}catch{}const action=clean(b.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c=social.snapchat||{};
  if(action==='test'){try{return json(await testSnapchatConnection(env));}catch(e){return json({error:clean(e.message,2600)},Number(e.httpStatus)>=400&&Number(e.httpStatus)<600?Number(e.httpStatus):400);}}
  if(action==='disconnect'){social.snapchat={...c,enabled:false,autoPublishStory:false,accessToken:'',refreshToken:'',tokenExpiresAt:'',grantedScopes:'',oauthState:'',oauthStateExpiresAt:'',connectionState:'disconnected',connectedAt:'',publishingReady:false,lastError:'',lastTestMessage:''};await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'Snapchat disconnected. Business OAuth credentials, Public Profile selection and optional Snap Kit Client ID were kept.'});}
  return json({error:'Unsupported Snapchat OAuth action.'},400);
}
