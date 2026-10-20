import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function done(origin,ok,message){const target=`${origin}/admin/?threads=${ok?'connected':'error'}&social_message=${encodeURIComponent(message||'')}`;return new Response(`<!doctype html><meta charset="utf-8"><title>Threads Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Threads connected':'Threads connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',oauthError=u.searchParams.get('error')||'';if(oauthError)return done(origin,false,`Threads returned: ${oauthError}`);if(!code||!state)return done(origin,false,'Threads did not return the required authorization code.');
  try{
    const social=await getSocialIntegrationSettings(env),c={...(social.threads||{})};if(!c.oauthState||state!==c.oauthState)throw new Error('Threads connection state did not match. Start the connection again from Settings → Social Media API → Threads.');if(c.oauthStateExpiresAt&&Date.parse(c.oauthStateExpiresAt)<Date.now())throw new Error('Threads connection request expired. Start it again from the admin panel.');
    const redirectUri=`${origin}/api/admin/threads-oauth/callback`,params=new URLSearchParams({client_id:c.appId,client_secret:c.appSecret,code,grant_type:'authorization_code',redirect_uri:redirectUri});
    const shortRes=await fetch(`https://graph.threads.net/oauth/access_token?${params.toString()}`,{method:'POST'}),short=await shortRes.json().catch(()=>({}));if(!shortRes.ok)throw new Error(short.error?.message||short.error_message||'Threads token exchange failed.');
    const shortToken=String(short.access_token||'');if(!shortToken)throw new Error('Threads did not return an access token.');
    const longUrl=new URL('https://graph.threads.net/access_token');longUrl.search=new URLSearchParams({grant_type:'th_exchange_token',client_secret:c.appSecret,access_token:shortToken}).toString();
    const longRes=await fetch(longUrl,{headers:{authorization:`Bearer ${shortToken}`}}),long=await longRes.json().catch(()=>({}));if(!longRes.ok)throw new Error(long.error?.message||'Could not create a long-lived Threads token.');
    const token=String(long.access_token||shortToken);const expires=Number(long.expires_in||5184000);
    const profileRes=await fetch(`https://graph.threads.net/me?fields=id,username&access_token=${encodeURIComponent(token)}`,{headers:{authorization:`Bearer ${token}`}}),profile=await profileRes.json().catch(()=>({}));
    if(!profileRes.ok)throw new Error(profile.error?.message||'Threads account details could not be read.');
    c.accessToken=token;c.userId=String(profile.id||short.user_id||'');c.username=String(profile.username||'');c.tokenExpiresAt=new Date(Date.now()+expires*1000).toISOString();c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';c.lastTestMessage='';c.identityReady=true;c.replyReadReady=null;c.replyManagementReady=null;c.requestedPermissions=['threads_basic','threads_content_publish','threads_read_replies','threads_manage_replies'];social.threads=c;await setSetting(env,'social_integration_settings',social);
    return done(origin,true,`Connected ${c.username?`@${c.username}`:'the selected Threads account'}.`);
  }catch(e){return done(origin,false,e.message||'Could not connect Threads.');}
}
