import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { testSnapchatConnection } from '../../../_lib/snapchat.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);const go=(origin,status,message)=>Response.redirect(`${origin}/admin/?snapchat=${encodeURIComponent(status)}&social_message=${encodeURIComponent(message)}`,302);
export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;const u=new URL(request.url),origin=preferredPublicOrigin(request,env),social=await getSocialIntegrationSettings(env),c=social.snapchat||{};
  if(u.searchParams.get('error'))return go(origin,'error',clean(u.searchParams.get('error_description')||u.searchParams.get('error'),1800));const code=clean(u.searchParams.get('code')),state=clean(u.searchParams.get('state'));
  if(!code||!state||state!==c.oauthState||Date.parse(c.oauthStateExpiresAt||'')<Date.now())return go(origin,'error','Snapchat authorization state expired or did not match. Click Connect Snapchat again.');
  try{
    const redirect=`${origin}/api/admin/snapchat-oauth/callback`,body=new URLSearchParams({grant_type:'authorization_code',client_id:c.oauthClientId,client_secret:c.oauthClientSecret,code,redirect_uri:redirect});
    const res=await fetch('https://accounts.snapchat.com/login/oauth2/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
    if(!res.ok||!data.access_token)throw Object.assign(new Error(data.error_description||data.error||text||`Snapchat token exchange failed (HTTP ${res.status}).`),{httpStatus:res.status});
    social.snapchat={...c,accessToken:clean(data.access_token),refreshToken:clean(data.refresh_token||c.refreshToken),tokenExpiresAt:new Date(Date.now()+Number(data.expires_in||3600)*1000).toISOString(),grantedScopes:clean(data.scope||'snapchat-profile-api',1000),oauthState:'',oauthStateExpiresAt:'',connectionState:'connected',connectedAt:new Date().toISOString(),publishingReady:false,lastError:'',lastTestMessage:'Snapchat Business OAuth connected. Public Profile capability verification will run automatically when a Public Profile username or ID is already saved.'};await setSetting(env,'social_integration_settings',social);
    if(clean(c.publicProfileQuery,300)||clean(c.publicProfileId,300)){
      try{const checked=await testSnapchatConnection(env);return go(origin,'connected',checked.message||'Snapchat Business OAuth and Public Profile Story capability are ready.');}
      catch(checkError){return go(origin,'connected',`Snapchat Business OAuth connected. Public Profile capability check needs attention: ${clean(checkError.message,1400)}`);}
    }
    return go(origin,'connected','Snapchat Business OAuth connected. Enter your Public Profile username or ID; Test Connection will verify the separate Public Profile Story capability. Snap Kit is optional and is not required for this check.');
  }catch(e){social.snapchat={...c,oauthState:'',oauthStateExpiresAt:'',connectionState:c.refreshToken?'connected':'error',lastError:clean(e.message,1800)};await setSetting(env,'social_integration_settings',social).catch(()=>{});return go(origin,'error',clean(e.message,1800));}
}
