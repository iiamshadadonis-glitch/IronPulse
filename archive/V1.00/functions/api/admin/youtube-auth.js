import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { YOUTUBE_SCOPES, testYouTubeConnection } from '../../_lib/youtube.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);

export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;
  const u=new URL(request.url);if(u.searchParams.get('action')!=='url')return json({error:'Unsupported YouTube OAuth action.'},400);
  const social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  if(!c.clientId||!c.clientSecret)return json({error:'Save the YouTube OAuth Client ID and Client Secret first. Add the callback URL shown in Social Media API to the Google OAuth Web application.'},400);
  const state=crypto.randomUUID()+crypto.randomUUID(),origin=preferredPublicOrigin(request,env),redirect=`${origin}/api/admin/youtube-oauth/callback`;
  social.youtube={...c,oauthState:state,oauthStateExpiresAt:new Date(Date.now()+10*60*1000).toISOString()};await setSetting(env,'social_integration_settings',social);
  const q=new URLSearchParams({client_id:c.clientId,redirect_uri:redirect,response_type:'code',scope:YOUTUBE_SCOPES.join(' '),access_type:'offline',prompt:'consent',include_granted_scopes:'true',state});
  return json({ok:true,url:`https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`,redirectUrl:redirect,scopes:YOUTUBE_SCOPES});
}

export async function onRequestPost({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;let b={};try{b=await readJson(request)}catch{}
  const action=clean(b.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  if(action==='test'){try{return json(await testYouTubeConnection(env));}catch(e){return json({error:clean(e.message,2500)},Number(e.httpStatus)>=400&&Number(e.httpStatus)<600?Number(e.httpStatus):400);}}
  if(action==='disconnect'){social.youtube={...c,enabled:false,autoPublish:false,accessToken:'',refreshToken:'',tokenExpiresAt:'',grantedScopes:'',oauthState:'',oauthStateExpiresAt:'',connectionState:'disconnected',channelId:'',channelName:'',lastError:'',lastTestMessage:''};await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'YouTube disconnected. OAuth Client ID, Client Secret and privacy choice were kept.'});}
  return json({error:'Unsupported YouTube OAuth action.'},400);
}
