import { requireAdmin, getSocialIntegrationSettings, setSetting } from '../../../_lib/utils.js';
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const go=(origin,status,message)=>Response.redirect(`${origin}/admin/?x=${encodeURIComponent(status)}&social_message=${encodeURIComponent(message)}`,302);
export async function onRequestGet({request,env}){
  const a=await requireAdmin(request,env);if(a instanceof Response)return a;const u=new URL(request.url),origin=u.origin,s=await getSocialIntegrationSettings(env),c=s.x||{};
  const error=u.searchParams.get('error');if(error)return go(origin,'error',u.searchParams.get('error_description')||error);
  const code=clean(u.searchParams.get('code')),state=clean(u.searchParams.get('state'));
  if(!code||!state||state!==c.oauthState||Date.parse(c.oauthStateExpiresAt||'')<Date.now()||!c.pkceVerifier)return go(origin,'error','X authorization state expired or did not match. Click Connect X / Twitter again.');
  try{
    const redirect=`${origin}/api/admin/x-oauth/callback`,body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect,code_verifier:c.pkceVerifier});
    const basic=btoa(`${c.clientId}:${c.clientSecret}`),tr=await fetch('https://api.x.com/2/oauth2/token',{method:'POST',headers:{authorization:`Basic ${basic}`,'content-type':'application/x-www-form-urlencoded'},body}),tt=await tr.text();let td={};try{td=JSON.parse(tt)}catch{}
    if(!tr.ok||!td.access_token)throw new Error(td.error_description||td.error||tt||`Token exchange failed (${tr.status}).`);
    const token=clean(td.access_token),ur=await fetch('https://api.x.com/2/users/me',{headers:{authorization:`Bearer ${token}`}}),ut=await ur.text();let ud={};try{ud=JSON.parse(ut)}catch{};if(!ur.ok||!ud?.data?.id)throw new Error(ud.detail||ud.title||ut||`X user check failed (${ur.status}).`);
    const scopes=clean(td.scope||'tweet.read tweet.write media.write users.read like.read like.write dm.read dm.write offline.access',2000),expires=Number(td.expires_in||7200);
    s.x={...c,accessToken:token,bearerToken:token,refreshToken:clean(td.refresh_token||c.refreshToken),tokenExpiresAt:new Date(Date.now()+expires*1000).toISOString(),grantedScopes:scopes,userId:clean(ud.data.id,200),username:clean(ud.data.username,300),oauthState:'',oauthStateExpiresAt:'',pkceVerifier:'',connectionState:'connected',connectedAt:new Date().toISOString(),lastError:'',lastTestedAt:new Date().toISOString(),lastTestMessage:`X user authentication is working for @${clean(ud.data.username,300)}.`,publishingReady:null,publishingProbeStatus:'connected_not_tested',publishingProbeAt:'',publishingProbeMessage:'OAuth is connected. Test Connection verifies profile/scopes without making a paid write request; actual publishing requires available X Developer API credits.'};
    await setSetting(env,'social_integration_settings',s);return go(origin,'connected',`Connected X / Twitter as @${clean(ud.data.username,300)}. User-context OAuth 2.0 is ready.`);
  }catch(e){s.x={...c,oauthState:'',oauthStateExpiresAt:'',pkceVerifier:'',lastError:clean(e.message,1200)};await setSetting(env,'social_integration_settings',s).catch(()=>{});return go(origin,'error',clean(e.message,1200));}
}
