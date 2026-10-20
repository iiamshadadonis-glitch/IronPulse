import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { testLinkedInConnection } from '../../_lib/social-publishing.js';
import { linkedinRequestedScopes } from '../../_lib/linkedin.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);

export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;
  const u=new URL(request.url);if(u.searchParams.get('action')!=='url')return json({error:'Unsupported LinkedIn OAuth action.'},400);
  const social=await getSocialIntegrationSettings(env),c=social.linkedin||{};
  if(!c.clientId||!c.clientSecret)return json({error:'Save the LinkedIn Client ID and Client Secret first. Then add the callback URL shown in Social Media API to LinkedIn Developers → Auth → Authorized redirect URLs.'},400);
  if((c.publishingIdentity||'member')==='organization'&&(c.autoPublish||c.communityEnabled)&&!String(c.organizationId||'').trim())return json({error:'Organization/Page publishing or Community Management is enabled, so enter the numeric LinkedIn Organization ID before connecting. If you only want to establish the basic OAuth connection first, switch off automatic publishing/Community Management and connect again.'},400);
  const state=crypto.randomUUID()+crypto.randomUUID(),origin=preferredPublicOrigin(request,env),redirect=`${origin}/api/admin/linkedin-oauth/callback`,scopes=linkedinRequestedScopes(c);
  social.linkedin={...c,oauthState:state,oauthStateExpiresAt:new Date(Date.now()+10*60*1000).toISOString(),requestedScopes:scopes.join(' '),apiVersion:'202608'};await setSetting(env,'social_integration_settings',social);
  const q=new URLSearchParams({response_type:'code',client_id:c.clientId,redirect_uri:redirect,state,scope:scopes.join(' ')});
  return json({ok:true,url:`https://www.linkedin.com/oauth/v2/authorization?${q.toString()}`,redirectUrl:redirect,scopes});
}

export async function onRequestPost({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;let b={};try{b=await readJson(request);}catch{}
  const action=clean(b.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c=social.linkedin||{};
  if(action==='test'){
    try{return json(await testLinkedInConnection(env));}catch(e){return json({error:clean(e?.message||'LinkedIn Test Connection failed.',3200)},Number(e?.httpStatus||0)>=400&&Number(e?.httpStatus||0)<600?Number(e.httpStatus):400);}
  }
  if(action==='disconnect'){
    social.linkedin={...c,autoPublish:false,accessToken:'',refreshToken:'',tokenExpiresAt:'',refreshTokenExpiresAt:'',grantedScopes:'',oauthState:'',oauthStateExpiresAt:'',memberId:'',memberName:'',memberEmail:'',organizationName:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastTestedAt:'',lastTestMessage:'',identityReady:null,publishingReady:null,commentReadReady:null,commentWriteReady:null,leadSyncReady:null,adsReady:null};
    await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'LinkedIn disconnected. Client ID, Client Secret and configuration choices were kept so you can reconnect.'});
  }
  return json({error:'Unsupported LinkedIn OAuth action.'},400);
}
