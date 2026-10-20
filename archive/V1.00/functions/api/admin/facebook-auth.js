import { json, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/facebook-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();
  if(action!=='url')return json({error:'Use action=url to start the Facebook connection.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.facebook||{})};
  if(!c.appId||!c.appSecret||!c.loginConfigId){
    return json({error:'To create the correct Facebook Page Access Token automatically, save the Meta App ID, Meta App Secret, and Facebook Login for Business Configuration ID first. The Configuration must include the Page permissions needed by this website.'},400);
  }
  const oauthState=state();
  c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();
  social.facebook=c;await setSetting(env,'social_integration_settings',social);
  const version=/^v\d+\.\d+$/.test(String(c.graphVersion||''))?c.graphVersion:'v26.0';
  const params=new URLSearchParams({
    client_id:c.appId,
    redirect_uri:redirectUrl(request,env),
    state:oauthState,
    config_id:c.loginConfigId,
    response_type:'code',
    override_default_response_type:'true',
    auth_type:'rerequest'
  });
  return json({ok:true,url:`https://www.facebook.com/${version}/dialog/oauth?${params.toString()}`,redirectUrl:redirectUrl(request,env)});
}
