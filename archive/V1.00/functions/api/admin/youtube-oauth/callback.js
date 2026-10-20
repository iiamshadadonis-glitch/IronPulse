import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { getYouTubeChannel } from '../../../_lib/youtube.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const go=(origin,status,message)=>Response.redirect(`${origin}/admin/?youtube=${encodeURIComponent(status)}&social_message=${encodeURIComponent(message)}`,302);
export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;
  const u=new URL(request.url),origin=preferredPublicOrigin(request,env),social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  if(u.searchParams.get('error'))return go(origin,'error',clean(u.searchParams.get('error_description')||u.searchParams.get('error'),1800));
  const code=clean(u.searchParams.get('code')),state=clean(u.searchParams.get('state'));
  if(!code||!state||state!==c.oauthState||Date.parse(c.oauthStateExpiresAt||'')<Date.now())return go(origin,'error','YouTube authorization state expired or did not match. Click Connect YouTube again.');
  try{
    const redirect=`${origin}/api/admin/youtube-oauth/callback`,body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect,client_id:c.clientId,client_secret:c.clientSecret});
    const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
    if(!res.ok||!data.access_token)throw Object.assign(new Error(data.error_description||data.error||text||`YouTube token exchange failed (HTTP ${res.status}).`),{httpStatus:res.status});
    social.youtube={...c,accessToken:clean(data.access_token),refreshToken:clean(data.refresh_token||c.refreshToken),tokenExpiresAt:new Date(Date.now()+Number(data.expires_in||3600)*1000).toISOString(),grantedScopes:clean(data.scope||'',5000),oauthState:'',oauthStateExpiresAt:'',connectionState:'connected',connectedAt:new Date().toISOString(),commentSyncStartedAt:c.commentSyncStartedAt||new Date().toISOString(),lastError:''};
    await setSetting(env,'social_integration_settings',social);
    const channel=await getYouTubeChannel(env);const latest=await getSocialIntegrationSettings(env);latest.youtube={...latest.youtube,channelId:channel.id,channelName:channel.name,connectionState:'connected',lastTestedAt:new Date().toISOString(),lastTestMessage:`YouTube connected as ${channel.name}. Run Test Connection for upload and comment capability details.`};await setSetting(env,'social_integration_settings',latest);
    return go(origin,'connected',`Connected YouTube as ${channel.name}. Run Test Connection to verify video-upload and comment permissions.`);
  }catch(e){social.youtube={...c,oauthState:'',oauthStateExpiresAt:'',connectionState:c.refreshToken?'connected':'error',lastError:clean(e.message,1800)};await setSetting(env,'social_integration_settings',social).catch(()=>{});return go(origin,'error',clean(e.message,1800));}
}
