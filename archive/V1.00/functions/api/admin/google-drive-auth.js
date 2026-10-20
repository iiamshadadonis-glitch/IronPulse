import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { DRIVE_SCOPE, googleDriveOAuthCredentials, ensurePlansOffersFolder } from '../../_lib/google-drive-upload.js';
const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
function redirectUrl(request,env){return `${preferredPublicOrigin(request,env)}/api/admin/google-drive-oauth/callback`;}
function state(){return crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),action=clean(u.searchParams.get('action'),40).toLowerCase();if(action!=='url')return json({error:'Use action=url to start Google Drive upload authorization.'},400);
  const social=await getSocialIntegrationSettings(env),c={...(social.googleDrive||{})},cred=googleDriveOAuthCredentials(social);
  if(!cred.clientId||!cred.clientSecret)return json({error:'Google Drive upload needs Google OAuth authorization. Enter an OAuth Client ID and Client Secret on the Google Drive card, or configure Google Search Console/Gmail OAuth credentials so this card can reuse them.'},400);
  const oauthState=state();c.oauthState=oauthState;c.oauthStateExpiresAt=new Date(Date.now()+10*60*1000).toISOString();social.googleDrive=c;await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({client_id:cred.clientId,redirect_uri:redirectUrl(request,env),response_type:'code',scope:`openid email ${DRIVE_SCOPE}`,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state:oauthState});
  return json({ok:true,url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`,redirectUrl:redirectUrl(request,env),credentialSource:cred.source});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request).catch(()=>({})),action=clean(b.action,40).toLowerCase();
  if(action!=='verify_folder')return json({error:'Unsupported Google Drive authorization action.'},400);
  try{const x=await ensurePlansOffersFolder(env,{persist:true});return json({ok:true,message:`Google Drive upload is ready. Website images will be uploaded to ${x.root.name} → ${x.folder.name}.`,rootFolder:{id:x.root.id,name:x.root.name},plansFolder:{id:x.folder.id,name:x.folder.name}});}catch(e){return json({error:e.message||'Google Drive folder verification failed.'},400);}
}
