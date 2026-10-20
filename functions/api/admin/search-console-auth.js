import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { submitSearchConsoleSitemap, testSearchConsoleConnection } from '../../_lib/social-publishing.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/search-console-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();
  if(action!=='url')return json({error:'Use action=url to start the Google Search Console connection.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.searchConsole||{})};
  if(!c.clientId||!c.clientSecret)return json({error:'Save the Google Search Console OAuth Client ID and Client Secret first.'},400);
  const oauthState=state();c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();social.searchConsole=c;
  await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({client_id:c.clientId,redirect_uri:redirectUrl(request,env),response_type:'code',scope:'openid email https://www.googleapis.com/auth/webmasters',access_type:'offline',prompt:'consent',include_granted_scopes:'true',state:oauthState});
  return json({ok:true,url:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,redirectUrl:redirectUrl(request,env)});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),action=clean(b.action,40).toLowerCase();
  const social=await getSocialIntegrationSettings(env),c={...(social.searchConsole||{})};
  if(action==='disconnect'){
    c.refreshToken='';c.connectedEmail='';c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';social.searchConsole=c;
    await setSetting(env,'social_integration_settings',social);
    return json({ok:true,message:'Google Search Console disconnected. Saved OAuth app details were kept.'});
  }
  try{
    if(action==='test')return json(await testSearchConsoleConnection(env));
    if(action==='submit_sitemap')return json(await submitSearchConsoleSitemap(env));
  }catch(e){
    const source=e?.source||'search_console';
    return json({ok:false,error:e.message||'Google Search Console action failed.',source,upstreamStatus:Number(e?.httpStatus||0)||null,reason:e?.googleReason||e?.googleStatus||''},400);
  }
  return json({error:'Choose Test Connection, Submit Sitemap or Disconnect.'},400);
}
