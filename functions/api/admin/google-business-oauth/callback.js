import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function done(origin,ok,message){const target=`${origin}/admin/?google_business=${ok?'connected':'error'}&social_message=${encodeURIComponent(message||'')}`;return new Response(`<!doctype html><meta charset="utf-8"><title>Google Business Profile Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Google Business Profile connected':'Google Business Profile connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',oauthError=u.searchParams.get('error')||'';
  if(oauthError)return done(origin,false,`Google returned: ${oauthError}`);if(!code||!state)return done(origin,false,'Google did not return the required authorization code.');
  try{
    const social=await getSocialIntegrationSettings(env),c={...(social.googleBusiness||{})};
    if(!c.oauthState||state!==c.oauthState)throw new Error('Google Business Profile connection state did not match. Start the connection again from Settings → Social Media API.');
    if(c.oauthStateExpiresAt&&Date.parse(c.oauthStateExpiresAt)<Date.now())throw new Error('Google Business Profile connection request expired. Start it again from the admin panel.');
    const redirectUri=`${origin}/api/admin/google-business-oauth/callback`,body=new URLSearchParams({code,client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),tokens=await tr.json().catch(()=>({}));if(!tr.ok)throw new Error(tokens.error_description||tokens.error||'Google token exchange failed.');
    if(!tokens.access_token)throw new Error('Google did not return an access token.');c.refreshToken=tokens.refresh_token||c.refreshToken||'';if(!c.refreshToken)throw new Error('Google did not return a refresh token. Disconnect and connect again with consent.');
    const pr=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{authorization:`Bearer ${tokens.access_token}`}}),profile=await pr.json().catch(()=>({}));
    c.connectedEmail=String(profile.email||'').trim().toLowerCase();c.oauthState='';c.oauthStateExpiresAt='';c.apiAccessStatus='oauth_connected';c.accountManagementReady=null;c.businessInformationReady=null;c.postsReviewsReady=null;c.lastApiAccessMessage='Google OAuth authorization is connected. Business Profile API project access has not been verified yet.';c.lastError='';social.googleBusiness=c;await setSetting(env,'social_integration_settings',social);
    return done(origin,true,`Connected ${c.connectedEmail||'the selected Google account'} with Google OAuth. Next, click Load Accounts & Locations. If Google returns HTTP 429 and your Business Profile API quota is 0, request Basic API Access for this same Google Cloud project.`);
  }catch(e){return done(origin,false,e.message||'Could not connect Google Business Profile.');}
}
