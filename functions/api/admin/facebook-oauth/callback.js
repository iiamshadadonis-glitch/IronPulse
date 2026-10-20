import { requireAdmin, getSocialIntegrationSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function done(origin,ok,message){
  const target=`${origin}/admin/?facebook=${ok?'connected':'error'}&social_message=${encodeURIComponent(message||'')}`;
  return new Response(`<!doctype html><meta charset="utf-8"><title>Facebook Connection</title><body style="font-family:Arial,sans-serif;padding:30px"><h2>${ok?'Facebook connected':'Facebook connection failed'}</h2><p>${esc(message)}</p><script>location.replace(${JSON.stringify(target)});</script></body>`,{status:ok?200:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
async function graphJson(url,options={},label='Meta request'){
  const r=await fetch(url,options),text=await r.text().catch(()=>''),d=(()=>{try{return text?JSON.parse(text):{};}catch{return {raw:text};}})();
  if(!r.ok||d?.error){const er=d?.error||{};const e=new Error(er.message||d?.error_description||text||`${label} failed.`);e.httpStatus=r.status;e.upstreamCode=String(er.code||'');e.upstreamSubcode=String(er.error_subcode||'');throw e;}
  return d;
}
async function debugToken(c,token,version){
  if(!c.appId||!c.appSecret)return null;
  const u=new URL(`https://graph.facebook.com/${version}/debug_token`);u.searchParams.set('input_token',token);u.searchParams.set('access_token',`${c.appId}|${c.appSecret}`);
  try{return (await graphJson(u,{},'Meta token inspection')).data||null;}catch{return null;}
}
function readiness(c,debug,pageTasks=[]){
  const scopes=Array.isArray(debug?.scopes)?debug.scopes.map(String):[];
  const has=x=>scopes.includes(x),known=scopes.length>0,tasks=Array.isArray(pageTasks)?pageTasks.map(x=>String(x).toUpperCase()):[];
  const canCreate=!tasks.length||tasks.some(t=>['CREATE_CONTENT','MANAGE','PROFILE_PLUS_CREATE_CONTENT','PROFILE_PLUS_MANAGE','PROFILE_PLUS_FULL_CONTROL','PROFILE_PLUS_FACEBOOK_ACCESS'].includes(t));
  const canModerate=!tasks.length||tasks.some(t=>['MODERATE','MANAGE','PROFILE_PLUS_MODERATE','PROFILE_PLUS_MANAGE','PROFILE_PLUS_FULL_CONTROL','PROFILE_PLUS_FACEBOOK_ACCESS'].includes(t));
  return {
    scopes,
    publishingReady:known?(has('pages_manage_posts')&&canCreate):null,
    webhookReady:known?(has('pages_manage_metadata')&&canModerate):null,
    messagingReady:known?(has('pages_manage_metadata')&&has('pages_messaging')&&canModerate):null,
    leadReady:known?has('leads_retrieval'):null,
    engagementReady:known?(has('pages_manage_engagement')&&has('pages_read_user_content')):null
  };
}

export async function onRequestGet({request,env}){
  const origin=preferredPublicOrigin(request,env);
  try{await requireAdmin(request,env);}catch(e){return done(origin,false,e.message||'Admin login required.');}
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',oauthError=u.searchParams.get('error')||'',oauthDescription=u.searchParams.get('error_description')||'';
  if(oauthError)return done(origin,false,`Meta returned ${oauthError}${oauthDescription?`: ${oauthDescription}`:''}. Open Facebook Login for Business → Configurations and verify the configuration permissions and redirect URI.`);
  if(!code||!state)return done(origin,false,'Meta did not return the required authorization code. Start Connect Facebook again from the Social Media API card.');
  try{
    const social=await getSocialIntegrationSettings(env),c={...(social.facebook||{})};
    if(!c.oauthState||state!==c.oauthState)throw new Error('Facebook connection state did not match. Start Connect Facebook again from Settings → Social Media API → Facebook.');
    if(c.oauthStateExpiresAt&&Date.parse(c.oauthStateExpiresAt)<Date.now())throw new Error('Facebook connection request expired. Start Connect Facebook again.');
    if(!c.appId||!c.appSecret||!c.loginConfigId)throw new Error('Meta App ID, App Secret, or Facebook Login for Business Configuration ID is missing from the saved Facebook settings.');
    const version=/^v\d+\.\d+$/.test(String(c.graphVersion||''))?c.graphVersion:'v26.0',redirectUri=`${origin}/api/admin/facebook-oauth/callback`;
    const tokenUrl=new URL(`https://graph.facebook.com/${version}/oauth/access_token`);tokenUrl.search=new URLSearchParams({client_id:c.appId,client_secret:c.appSecret,redirect_uri:redirectUri,code}).toString();
    const tokenData=await graphJson(tokenUrl,{},'Facebook authorization-code exchange');
    let userToken=clean(tokenData.access_token,12000);if(!userToken)throw new Error('Meta did not return an access token after Facebook Login for Business authorization.');
    // Try to exchange for a long-lived user token. If Meta returns a token type that cannot be exchanged,
    // keep the original token and continue to the official /me/accounts Page-token step.
    try{
      const longUrl=new URL(`https://graph.facebook.com/${version}/oauth/access_token`);longUrl.search=new URLSearchParams({grant_type:'fb_exchange_token',client_id:c.appId,client_secret:c.appSecret,fb_exchange_token:userToken}).toString();
      const longData=await graphJson(longUrl,{},'Facebook long-lived token exchange');if(longData.access_token)userToken=clean(longData.access_token,12000);
    }catch(_){/* safe fallback */}
    const pagesUrl=new URL(`https://graph.facebook.com/${version}/me/accounts`);pagesUrl.searchParams.set('fields','id,name,access_token,tasks,instagram_business_account');pagesUrl.searchParams.set('access_token',userToken);
    const pages=await graphJson(pagesUrl,{},'Facebook Page access-token lookup');
    const list=Array.isArray(pages?.data)?pages.data:[];
    if(!list.length)throw new Error('Meta authorization succeeded, but no manageable Facebook Pages were returned. Make sure the Facebook account has full/task access to the Page and that the Login for Business configuration includes pages_show_list.');
    let page=c.pageId?list.find(x=>String(x.id)===String(c.pageId)):null;
    if(!page&&list.length===1)page=list[0];
    if(!page){const choices=list.slice(0,8).map(x=>`${x.name||'Page'} (${x.id})`).join(', ');throw new Error(`Meta returned Facebook Pages, but none matched the saved Page ID ${c.pageId||'(blank)'}. Available Pages: ${choices}. Enter the correct Meta Page ID in the website and connect again.`);}
    if(!page.access_token)throw new Error('Meta returned the selected Page but did not return its Page Access Token. Verify the Login for Business configuration permissions and reconnect.');
    const pageToken=clean(page.access_token,12000),debug=await debugToken(c,pageToken,version),ready=readiness(c,debug,page.tasks||[]);
    c.pageId=String(page.id||c.pageId||'');c.pageName=String(page.name||'');c.pageAccessToken=pageToken;c.pageTasks=Array.isArray(page.tasks)?page.tasks:[];
    c.tokenType=String(debug?.type||'PAGE');c.tokenAppId=String(debug?.app_id||c.appId||'');c.grantedScopes=ready.scopes;
    c.publishingReady=ready.publishingReady;c.webhookReady=ready.webhookReady;c.messagingReady=ready.messagingReady;c.leadReady=ready.leadReady;c.engagementReady=ready.engagementReady;
    c.connectionState='connected';c.connectedAt=new Date().toISOString();c.lastTestedAt=new Date().toISOString();c.oauthState='';c.oauthStateExpiresAt='';c.lastError='';
    const missing=[];
    if(ready.publishingReady===false)missing.push('pages_manage_posts / CREATE_CONTENT');
    if(ready.webhookReady===false)missing.push('pages_manage_metadata / MODERATE');
    if(ready.messagingReady===false)missing.push('pages_messaging');
    if(ready.leadReady===false)missing.push('leads_retrieval');
    if(ready.engagementReady===false)missing.push('pages_manage_engagement / pages_read_user_content');
    c.lastTestMessage=missing.length?`Facebook authenticated for ${c.pageName||c.pageId}, but some requested capabilities are not ready: ${missing.join(', ')}.`:`Facebook authenticated for ${c.pageName||c.pageId}. The Page Access Token and requested capabilities are ready.`;
    social.facebook=c;await setSetting(env,'social_integration_settings',social);
    return done(origin,true,missing.length?`${c.lastTestMessage} Update the permissions inside Facebook Login for Business → Configurations, then reconnect so Meta issues a new Page Access Token with those permissions.`:`Facebook connected successfully to ${c.pageName||c.pageId}. The website saved the Page Access Token returned by Meta.`);
  }catch(e){return done(origin,false,e.message||'Could not connect Facebook.');}
}
