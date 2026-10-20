import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { diagnoseIntegrationError, successMessage } from '../../../_lib/integration-diagnostics.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GMAIL_SEND_SCOPE='https://www.googleapis.com/auth/gmail.send';
function done(origin,ok,message){
  const target=`${origin}/admin/?gmail=${ok?'connected':'error'}&gmail_message=${encodeURIComponent(message||'')}`;
  return new Response(`<!doctype html><meta charset="utf-8"><title>Gmail Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Gmail connected':'Gmail connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);
  try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const url=new URL(request.url),code=url.searchParams.get('code')||'',state=url.searchParams.get('state')||'',oauthError=url.searchParams.get('error')||'';
  if(oauthError)return done(origin,false,`Gmail authorization was cancelled or rejected by Google (${oauthError}). Start Connect Gmail again and approve the requested Gmail sending permission.`);
  if(!code||!state)return done(origin,false,'Google did not return the required authorization code.');
  try{
    const social=await getSocialIntegrationSettings(env),gmail={...(social.gmail||{})};
    if(!gmail.oauthState||state!==gmail.oauthState)throw new Error('Gmail connection state did not match. Start the connection again from Social Media API → Gmail.');
    if(gmail.oauthStateExpiresAt&&Date.parse(gmail.oauthStateExpiresAt)<Date.now())throw new Error('Gmail connection request expired. Start it again from the admin panel.');
    if(!gmail.clientId||!gmail.clientSecret)throw new Error('Gmail OAuth Client ID or Client Secret is missing.');
    const redirectUri=`${origin}/api/admin/gmail-oauth/callback`;
    const body=new URLSearchParams({code,client_id:gmail.clientId,client_secret:gmail.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const tokenRes=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    const tokens=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok)throw new Error(tokens.error_description||tokens.error||'Google token exchange failed.');
    const access=tokens.access_token||'';if(!access)throw new Error('Google did not return an access token.');
    const profileRes=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{authorization:`Bearer ${access}`}});
    const profile=await profileRes.json().catch(()=>({}));
    if(!profileRes.ok)throw Object.assign(new Error(profile?.error?.message||'Google did not return the authenticated account identity.'),{httpStatus:profileRes.status});
    const granted=String(tokens.scope||'').trim(),scopeSet=new Set(granted.split(/\s+/).filter(Boolean));
    if(granted&&!scopeSet.has(GMAIL_SEND_SCOPE)&&!scopeSet.has('https://mail.google.com/'))throw Object.assign(new Error('Google authorization did not grant Gmail sending permission. Reconnect and approve the Gmail send permission.'),{httpStatus:403});
    const email=String(profile.email||'').trim().toLowerCase();if(!email)throw new Error('Google did not return the selected Google account address. No account was connected.');
    gmail.refreshToken=tokens.refresh_token||'';
    if(!gmail.refreshToken)throw new Error('Google did not return a new refresh token. Start Connect Gmail again and approve consent.');
    gmail.connectedEmail=email;const configuredSender=String(gmail.senderEmail||'').trim().toLowerCase();if(!configuredSender||/@gmail\.com$/i.test(configuredSender))gmail.senderEmail=email;gmail.grantedScopes=granted||GMAIL_SEND_SCOPE;gmail.scopeStatus='verified_send';gmail.connectionState='connected';gmail.oauthState='';gmail.oauthStateExpiresAt='';gmail.lastError='';gmail.connectedAt=new Date().toISOString();gmail.lastTestedAt=new Date().toISOString();social.gmail=gmail;
    await setSetting(env,'social_integration_settings',social);
    return done(origin,true,successMessage('gmail','connect',{account:email||'the selected Gmail account'})+' Gmail sending permission was granted. Click Test Connection to verify the saved account authorization.');
  }catch(e){const d=diagnoseIntegrationError('gmail',e,{action:'OAuth connection'});try{const social=await getSocialIntegrationSettings(env),gmail={...(social.gmail||{}),refreshToken:'',connectedEmail:'',grantedScopes:'',scopeStatus:'missing_send',connectionState:'needs_reconnect',otpEnabled:false,enabled:false,oauthState:'',oauthStateExpiresAt:'',lastError:d.message};social.gmail=gmail;await setSetting(env,'social_integration_settings',social);}catch(_){ }return done(origin,false,d.message);}
}
