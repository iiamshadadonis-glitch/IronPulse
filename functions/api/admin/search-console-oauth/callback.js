import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function done(origin,ok,message){const target=`${origin}/admin/?search_console=${ok?'connected':'error'}&social_message=${encodeURIComponent(message||'')}`;return new Response(`<!doctype html><meta charset="utf-8"><title>Search Console Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Google Search Console connected':'Google Search Console connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',oauthError=u.searchParams.get('error')||'';
  if(oauthError)return done(origin,false,`Google returned: ${oauthError}`);if(!code||!state)return done(origin,false,'Google did not return the required authorization code.');
  try{
    const social=await getSocialIntegrationSettings(env),c={...(social.searchConsole||{})};
    if(!c.oauthState||state!==c.oauthState)throw new Error('Search Console connection state did not match. Start the connection again from Settings → Social Media API → Google Search Console.');
    if(c.oauthStateExpiresAt&&Date.parse(c.oauthStateExpiresAt)<Date.now())throw new Error('Search Console connection request expired. Start it again from the admin panel.');
    const redirectUri=`${origin}/api/admin/search-console-oauth/callback`;
    const body=new URLSearchParams({code,client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});const tokens=await tr.json().catch(()=>({}));
    if(!tr.ok)throw new Error(tokens.error_description||tokens.error||'Google token exchange failed.');
    if(!tokens.access_token)throw new Error('Google did not return an access token.');
    const grantedScopes=String(tokens.scope||'').trim();
    const requiredWriteScope='https://www.googleapis.com/auth/webmasters';
    const scopeList=grantedScopes.split(/\s+/).filter(Boolean);
    const pr=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{authorization:`Bearer ${tokens.access_token}`}});const profile=await pr.json().catch(()=>({}));
    c.refreshToken=tokens.refresh_token||c.refreshToken||'';if(!c.refreshToken)throw new Error('Google did not return a refresh token. Disconnect and connect again with consent.');
    c.connectedEmail=String(profile.email||'').trim().toLowerCase();c.grantedScopes=grantedScopes;c.scopeStatus=scopeList.includes(requiredWriteScope)?'read_write':(scopeList.length?'missing_write':'unknown');c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';
    if(scopeList.length&&!scopeList.includes(requiredWriteScope)){
      c.refreshToken='';c.lastError=`Google connected the account but did not grant the required Search Console read/write scope (${requiredWriteScope}). Add/approve that scope and connect again.`;social.searchConsole=c;await setSetting(env,'social_integration_settings',social);
      throw new Error(c.lastError);
    }
    social.searchConsole=c;
    await setSetting(env,'social_integration_settings',social);return done(origin,true,`Connected ${c.connectedEmail||'the selected Google account'} to Search Console with ${c.scopeStatus==='read_write'?'read/write permission':'Google authorization'}.`);
  }catch(e){return done(origin,false,e.message||'Could not connect Google Search Console.');}
}
