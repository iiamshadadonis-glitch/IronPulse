import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { DRIVE_SCOPE, googleDriveOAuthCredentials, ensurePlansOffersFolder } from '../../../_lib/google-drive-upload.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function done(origin,ok,message){const target=`${origin}/admin/?google_drive=${ok?'connected':'error'}&social_message=${encodeURIComponent(message||'')}`;return new Response(`<!doctype html><meta charset="utf-8"><title>Google Drive Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Google Drive connected':'Google Drive connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',oauthError=u.searchParams.get('error')||'';
  if(oauthError)return done(origin,false,`Google returned: ${oauthError}`);if(!code||!state)return done(origin,false,'Google did not return the required authorization code.');
  try{
    const social=await getSocialIntegrationSettings(env),c={...(social.googleDrive||{})},cred=googleDriveOAuthCredentials(social);
    if(!c.oauthState||state!==c.oauthState)throw new Error('Google Drive connection state did not match. Start Connect Google Drive again from Social Media API.');
    if(c.oauthStateExpiresAt&&Date.parse(c.oauthStateExpiresAt)<Date.now())throw new Error('Google Drive connection request expired. Start it again from the admin panel.');
    if(!cred.clientId||!cred.clientSecret)throw new Error('The OAuth Client ID/Secret used to start this connection are no longer available.');
    const redirectUri=`${origin}/api/admin/google-drive-oauth/callback`,body=new URLSearchParams({code,client_id:cred.clientId,client_secret:cred.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),tokens=await tr.json().catch(()=>({}));if(!tr.ok)throw new Error(tokens.error_description||tokens.error||'Google token exchange failed.');if(!tokens.access_token)throw new Error('Google did not return an access token.');
    const scopes=String(tokens.scope||'').split(/\s+/).filter(Boolean);if(scopes.length&&!scopes.includes(DRIVE_SCOPE))throw new Error('Google connected the account but did not grant the Drive permission required to create/upload files. Connect again and approve Google Drive access.');
    const pr=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{authorization:`Bearer ${tokens.access_token}`}}),profile=await pr.json().catch(()=>({}));
    c.refreshToken=tokens.refresh_token||c.refreshToken||'';if(!c.refreshToken)throw new Error('Google did not return a refresh token. Disconnect Google Drive, reconnect, and approve access again.');
    c.connectedEmail=String(profile.email||'').trim().toLowerCase();c.grantedScopes=String(tokens.scope||DRIVE_SCOPE);c.oauthState='';c.oauthStateExpiresAt='';c.connectionState='connected';c.connectedAt=c.connectedAt||new Date().toISOString();c.lastError='';social.googleDrive=c;await setSetting(env,'social_integration_settings',social);
    let folderMessage='Upload account connected. Add a Destination Root Folder URL and run Test Connection to enable uploads.';
    if(c.rootFolderUrl){try{const x=await ensurePlansOffersFolder(env,{persist:true});folderMessage=`Upload folder ready: ${x.root.name} → ${x.folder.name}.`;}catch(e){folderMessage=`Upload account connected, but the destination folder needs attention: ${e.message}`;}}
    return done(origin,true,`Connected ${c.connectedEmail||'the selected Google account'} for Google Drive uploads. ${folderMessage}`);
  }catch(e){return done(origin,false,e.message||'Could not connect Google Drive.');}
}
