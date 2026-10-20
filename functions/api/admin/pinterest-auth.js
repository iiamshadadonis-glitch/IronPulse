import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { testPinterestConnection } from '../../_lib/social-publishing.js';
const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/pinterest-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();if(action!=='url')return json({error:'Use action=url to start the Pinterest connection.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.pinterest||{})};if(!c.appId||!c.appSecret)return json({error:'Save the Pinterest App ID and App Secret before connecting Pinterest.'},400);
  const oauthState=state();c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();social.pinterest=c;await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({client_id:c.appId,redirect_uri:redirectUrl(request,env),response_type:'code',scope:'boards:read,boards:write,pins:read,pins:write,user_accounts:read',state:oauthState});
  return json({ok:true,url:`https://www.pinterest.com/oauth/?${params.toString()}`,redirectUrl:redirectUrl(request,env)});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),action=clean(b.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c={...(social.pinterest||{})};
  if(action==='disconnect'){c.accessToken='';c.refreshToken='';c.tokenExpiresAt='';c.refreshTokenExpiresAt='';c.grantedScopes=[];c.username='';c.boardName='';c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';c.lastTestMessage='';c.accountReadReady=null;c.boardsReadReady=null;c.pinsReadReady=null;c.pinPublishingReady=null;c.commentModerationReady=false;c.boardWarning='';c.pinsWarning='';social.pinterest=c;await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'Pinterest disconnected. Saved App ID/Secret and Board ID were kept.'});}
  if(action==='test'){try{return json(await testPinterestConnection(env));}catch(e){return json({error:e.message||'Pinterest connection check failed.'},502);}}
  return json({error:'Choose Test Connection or Disconnect.'},400);
}
