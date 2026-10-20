import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { testGoogleBusiness, discoverGoogleBusiness } from '../../_lib/google-business.js';
import { diagnoseIntegrationError, successMessage } from '../../_lib/integration-diagnostics.js';
const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/google-business-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();
  if(action!=='url')return json({error:'Use action=url to start the Google Business Profile connection.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.googleBusiness||{})};
  if(!c.clientId||!c.clientSecret)return json({error:'Save the Google Business Profile OAuth Client ID and Client Secret first.'},400);
  const oauthState=state();c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();social.googleBusiness=c;await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({client_id:c.clientId,redirect_uri:redirectUrl(request,env),response_type:'code',scope:'openid email https://www.googleapis.com/auth/business.manage',access_type:'offline',prompt:'consent',include_granted_scopes:'true',state:oauthState});
  return json({ok:true,url:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,redirectUrl:redirectUrl(request,env)});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),action=clean(b.action,60).toLowerCase(),social=await getSocialIntegrationSettings(env),c={...(social.googleBusiness||{})};
  try{
    if(action==='disconnect'){
      c.refreshToken='';c.connectedEmail='';c.oauthState='';c.oauthStateExpiresAt='';c.enabled=false;c.autoPublish=false;c.apiAccessStatus='';c.accountManagementReady=null;c.businessInformationReady=null;c.postsReviewsReady=null;c.lastApiAccessMessage='';c.lastError='';social.googleBusiness=c;await setSetting(env,'social_integration_settings',social);return json({ok:true,message:'Google Business Profile was disconnected successfully. OAuth app details and the selected account/location were kept so you can reconnect without re-entering them.'});
    }
    if(action==='test')return json(await testGoogleBusiness(env));
    if(action==='discover'){const r=await discoverGoogleBusiness(env,{accountId:clean(b.accountId,300)});return json({...r,message:r.message||`Google Business Profile account discovery succeeded. Loaded ${r.accounts?.length||0} account(s) and ${r.locations?.length||0} location(s). Choose the correct location and save settings.`});}
    return json({error:'Choose Test Connection, Load Accounts & Locations, or Disconnect.'},400);
  }catch(e){const d=e?.diagnostic||diagnoseIntegrationError('google_business',e,{action:action==='discover'?'account/location discovery':action==='test'?'connection test':action||'request'});return json({ok:false,error:d.message,diagnostic:d,upstreamStatus:d.httpStatus},400);}
}
