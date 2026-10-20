import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { gmailAccessToken } from '../../_lib/gmail-mailer.js';
import { diagnoseIntegrationError, successMessage } from '../../_lib/integration-diagnostics.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
const GMAIL_SEND_SCOPE='https://www.googleapis.com/auth/gmail.send';

function callbackUrl(request,env){
  const origin=preferredPublicOrigin(request,env);
  return `${origin}/api/admin/gmail-oauth/callback`;
}

function randomState(){
  const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const url=new URL(request.url), action=clean(url.searchParams.get('action'),40).toLowerCase();
  if(action!=='url')return json({error:'Use action=url to start Gmail connection.'},400);
  const social=await getSocialIntegrationSettings(env),gmail={...(social.gmail||{})};
  if(!gmail.clientId||!gmail.clientSecret)return json({error:'Save the Gmail OAuth Client ID and Client Secret before connecting Gmail.'},400);
  const state=randomState(),expires=new Date(Date.now()+10*60*1000).toISOString();
  gmail.oauthState=state;gmail.oauthStateExpiresAt=expires;gmail.connectionState='connecting';gmail.scopeStatus='pending';gmail.refreshToken='';gmail.connectedEmail='';gmail.grantedScopes='';gmail.otpEnabled=false;social.gmail=gmail;
  await setSetting(env,'social_integration_settings',social);
  const params=new URLSearchParams({
    client_id:gmail.clientId,
    redirect_uri:callbackUrl(request,env),
    response_type:'code',
    scope:`openid email ${GMAIL_SEND_SCOPE}`,
    access_type:'offline',
    prompt:'consent',
    include_granted_scopes:'true',
    state
  });
  return json({ok:true,url:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,redirectUrl:callbackUrl(request,env)});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const body=await readJson(request),action=clean(body.action,40).toLowerCase();
  const social=await getSocialIntegrationSettings(env),gmail={...(social.gmail||{})};
  if(action==='disconnect'){
    gmail.refreshToken='';gmail.connectedEmail='';gmail.oauthState='';gmail.oauthStateExpiresAt='';gmail.otpEnabled=false;gmail.connectionState='disconnected';gmail.scopeStatus='';gmail.grantedScopes='';gmail.lastError='';social.gmail=gmail;
    await setSetting(env,'social_integration_settings',social);
    return json({ok:true,message:successMessage('gmail','disconnect')+' Saved OAuth Client ID/Secret settings were kept.'});
  }
  if(action==='test'){
    try{
      if(!gmail.clientId||!gmail.clientSecret||!gmail.refreshToken)throw new Error('Gmail is not fully connected. Save the OAuth Client ID and Client Secret, click Connect Gmail, approve access, and then run Test Connection.');
      const access=await gmailAccessToken(gmail);
      const granted=new Set(String(gmail.grantedScopes||'').split(/\s+/).filter(Boolean));
      if(!granted.has(GMAIL_SEND_SCOPE)&&!granted.has('https://mail.google.com/'))throw Object.assign(new Error('The saved Google authorization does not include Gmail sending permission. Reconnect Gmail and approve the requested permission.'),{httpStatus:403});
      // users.getProfile does not accept the narrow gmail.send scope and returns
      // the misleading 403 “insufficient authentication scopes”.  OAuth userinfo
      // is the correct read-only identity probe for the openid/email scopes that
      // are requested alongside gmail.send.
      const res=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{authorization:`Bearer ${access}`}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){const e=new Error(data?.error?.message||'Google account identity request failed.');e.httpStatus=res.status;e.upstreamCode=data?.error?.code;e.upstreamMessage=data?.error?.message;throw e;}
      const email=clean(data.email,240).toLowerCase();if(!email)throw new Error('Google did not return the authenticated account email. Reconnect Gmail and choose the sender account again.');
      gmail.connectedEmail=email;gmail.connectionState='connected';gmail.scopeStatus='verified_send';gmail.grantedScopes=clean(gmail.grantedScopes||GMAIL_SEND_SCOPE,2000);gmail.lastTestedAt=new Date().toISOString();gmail.lastError='';social.gmail=gmail;
      await setSetting(env,'social_integration_settings',social);
      return json({ok:true,emailAddress:email,message:successMessage('gmail','test',{account:email||'connected Gmail account'})+' Google verified the account identity and the saved authorization includes Gmail sending permission.'});
    }catch(error){
      const d=diagnoseIntegrationError('gmail',error,{action:'test connection'}),requiresReconnect=Number(error?.httpStatus||0)===401||Number(error?.httpStatus||0)===403||/insufficient.*scope|invalid_grant|unauthorized|revoked|not verified|reconnect gmail/i.test(String(error?.message||''));gmail.lastError=d.message;gmail.lastTestedAt=new Date().toISOString();if(requiresReconnect){gmail.refreshToken='';gmail.connectedEmail='';gmail.connectionState='needs_reconnect';gmail.scopeStatus='missing_send';gmail.grantedScopes='';gmail.otpEnabled=false;gmail.enabled=false;}social.gmail=gmail;await setSetting(env,'social_integration_settings',social);
      return json({error:d.message,diagnostic:d},d.httpStatus&&d.httpStatus>=400&&d.httpStatus<600?d.httpStatus:400);
    }
  }
  return json({error:'Unknown Gmail action. Use test or disconnect.'},400);
}
