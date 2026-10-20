import { json, requireAdmin, getSocialIntegrationSettings, setSetting } from '../../_lib/utils.js';
import { testXConnection, testXPublishingCapability } from '../../_lib/social-publishing.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const b64url=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function challenge(v){return b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));}
export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;
  const u=new URL(request.url);if(u.searchParams.get('action')!=='url')return json({error:'Unsupported X OAuth action.'},400);
  const s=await getSocialIntegrationSettings(env),c=s.x||{};
  if(!c.clientId||!c.clientSecret)return json({error:'Save the X OAuth 2.0 Client ID and Client Secret first. Do not use the app-only Bearer Token or Consumer Key.'},400);
  const state=crypto.randomUUID()+crypto.randomUUID(),verifier=b64url(crypto.getRandomValues(new Uint8Array(48))),redirect=`${u.origin}/api/admin/x-oauth/callback`;
  s.x={...c,oauthState:state,oauthStateExpiresAt:new Date(Date.now()+10*60*1000).toISOString(),pkceVerifier:verifier};await setSetting(env,'social_integration_settings',s);
  const q=new URLSearchParams({response_type:'code',client_id:c.clientId,redirect_uri:redirect,scope:'tweet.read tweet.write media.write users.read like.read like.write dm.read dm.write offline.access',state,code_challenge:await challenge(verifier),code_challenge_method:'S256'});
  return json({ok:true,url:`https://x.com/i/oauth2/authorize?${q}`,redirectUrl:redirect});
}
export async function onRequestPost({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;let b={};try{b=await request.json();}catch{}
  const action=clean(b.action,40).toLowerCase(),s=await getSocialIntegrationSettings(env),c=s.x||{};
  if(action==='test'){
    try{return json(await testXConnection(env));}
    catch(e){return json({error:clean(e?.message||'X / Twitter Test Connection failed.',3200)},Number(e?.httpStatus||0)>=400&&Number(e?.httpStatus||0)<600?Number(e.httpStatus):400);}
  }
  if(action==='test_publish'){
    try{return json(await testXPublishingCapability(env));}
    catch(e){return json({error:clean(e?.message||'X / Twitter publishing test failed.',3200)},Number(e?.httpStatus||0)>=400&&Number(e?.httpStatus||0)<600?Number(e.httpStatus):400);}
  }
  if(action==='disconnect'){s.x={...c,accessToken:'',refreshToken:'',bearerToken:'',tokenExpiresAt:'',grantedScopes:'',username:'',userId:'',oauthState:'',oauthStateExpiresAt:'',pkceVerifier:'',connectionState:'disconnected',connectedAt:'',lastError:'',lastTestMessage:'',publishingReady:null,publishingProbeStatus:'',publishingProbeAt:'',publishingProbeMessage:''};await setSetting(env,'social_integration_settings',s);return json({ok:true,message:'X / Twitter disconnected. Your Client ID and Client Secret were kept so you can reconnect.'});}
  return json({error:'Unsupported X OAuth action.'},400);
}
