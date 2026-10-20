import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { linkedinUserInfo, linkedinCapabilitySnapshot } from '../../../_lib/linkedin.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const go=(origin,status,message)=>Response.redirect(`${origin}/admin/?linkedin=${encodeURIComponent(status)}&social_message=${encodeURIComponent(message)}`,302);

export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;
  const u=new URL(request.url),origin=preferredPublicOrigin(request,env),social=await getSocialIntegrationSettings(env),c=social.linkedin||{};
  const providerError=u.searchParams.get('error');if(providerError){
    const providerDescription=clean(u.searchParams.get('error_description')||providerError,1200),lower=providerDescription.toLowerCase();
    const message=/scope|permission|unauthoriz|access_denied/.test(lower)
      ?`${providerDescription}. LinkedIn did not grant one or more requested OAuth permissions. Open LinkedIn Developers → your app → Products. If Auth shows “No permissions added”, request Sign in with LinkedIn using OpenID Connect first. Request Share on LinkedIn for member posting, and obtain Community Management API approval for Organization/Page posting or comment management. Then return to IronPulse Gym and click Connect LinkedIn again.`
      :providerDescription;
    return go(origin,'error',message);
  }
  const code=clean(u.searchParams.get('code')),state=clean(u.searchParams.get('state'));
  if(!code||!state||state!==c.oauthState||Date.parse(c.oauthStateExpiresAt||'')<Date.now())return go(origin,'error','LinkedIn authorization state expired or did not match. Click Connect LinkedIn again.');
  try{
    const redirect=`${origin}/api/admin/linkedin-oauth/callback`,body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect,client_id:c.clientId,client_secret:c.clientSecret});
    const tr=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),tt=await tr.text();let td={};try{td=JSON.parse(tt)}catch{}
    if(!tr.ok||!td.access_token)throw Object.assign(new Error(td.error_description||td.error||tt||`LinkedIn token exchange failed (${tr.status}).`),{httpStatus:tr.status});
    const token=clean(td.access_token),profile=await linkedinUserInfo(token),expires=Number(td.expires_in||5184000),refreshExpires=Number(td.refresh_token_expires_in||0),scopes=clean(td.scope||td.scopes||c.requestedScopes||'',3000);
    const base={...c,accessToken:token,refreshToken:clean(td.refresh_token||'',10000),tokenExpiresAt:new Date(Date.now()+expires*1000).toISOString(),refreshTokenExpiresAt:refreshExpires?new Date(Date.now()+refreshExpires*1000).toISOString():'',grantedScopes:scopes,oauthState:'',oauthStateExpiresAt:'',memberId:profile.id,memberName:profile.name,memberEmail:profile.email,connectionState:'connected',connectedAt:new Date().toISOString(),lastError:'',lastTestedAt:new Date().toISOString(),apiVersion:'202608'};
    const cap=linkedinCapabilitySnapshot(base),publishingLabel=cap.publishing?'Publishing permission detected':'Publishing permission was not returned in the token; review LinkedIn Products/scopes';
    social.linkedin={...base,identityReady:true,publishingReady:cap.publishing,commentReadReady:cap.commentRead,commentWriteReady:cap.commentWrite,leadSyncReady:cap.lead,adsReady:cap.ads,lastTestMessage:`LinkedIn OAuth connected${profile.name?` as ${profile.name}`:''}. ${publishingLabel}. Run Test Connection for the full capability check.`};
    await setSetting(env,'social_integration_settings',social);return go(origin,'connected',`Connected LinkedIn${profile.name?` as ${profile.name}`:''}. Run Test Connection to verify the approved capabilities.`);
  }catch(e){social.linkedin={...c,oauthState:'',oauthStateExpiresAt:'',lastError:clean(e.message,1600),connectionState:c.accessToken?'connected':'error'};await setSetting(env,'social_integration_settings',social).catch(()=>{});return go(origin,'error',clean(e.message,1600));}
}
