import { requireAdmin, getApiSettings, setSetting, preferredPublicOrigin } from '../../../_lib/utils.js';
import { readGoogleApiError, BLOGGER_SCOPE } from '../../../_lib/blogger.js';

function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const html=(title,message,mode='ok')=>new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui;padding:40px;max-width:820px;margin:auto;line-height:1.55}h1{font-size:38px}a{font-weight:700}.box{padding:18px 20px;border:1px solid #ddd;border-radius:14px;background:#fafafa}.error{border-color:#e9b2b2;background:#fff3f3}.ok{border-color:#bfe1c4;background:#f1fff3}</style><h1>${esc(title)}</h1><div class="box ${mode==='ok'?'ok':'error'}">${message}</div><p><a href="/admin/?blogger=${mode==='ok'?'connected':mode==='api'?'api_error':'error'}">Return to Admin → Integrations → SEO</a></p>`,{headers:{'content-type':'text/html;charset=utf-8'}});
function likelyApiDisabled(message=''){return /has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED|API has not been used/i.test(String(message));}
async function listBlogsWithAccessToken(accessToken,key=''){
  const variants=['?view=ADMIN&fetchUserInfo=true','?view=ADMIN','?view=AUTHOR',''];
  let last=null;
  for(const query of variants){
    const sep=query?'&':'?';
    const url=`https://www.googleapis.com/blogger/v3/users/self/blogs${query}${key?`${sep}key=${encodeURIComponent(key)}`:''}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(res.ok)return {res,data:await res.json()};
    last={res,detail:await readGoogleApiError(res,'Google authorized the account, but the SEO publishing service could not read the available publishing sources.')};
    if(likelyApiDisabled(last.detail.message))break;
  }
  return {res:last?.res||null,detail:last?.detail||{message:'Google authorized the account, but the SEO publishing service could not read the available publishing sources.'}};
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return html('SEO connection blocked',`<p>${esc(e.message)}</p>`,'error')}
  const url=new URL(request.url),code=url.searchParams.get('code')||'',state=url.searchParams.get('state')||'',oauthError=url.searchParams.get('error')||'';
  if(oauthError)return html('SEO was not connected',`<p>Google returned: <strong>${esc(oauthError)}</strong></p>`,'error');
  const s=await getApiSettings(env),expires=Date.parse(s.bloggerOAuthStateExpiresAt||'');
  if(!code || !state || !s.bloggerOAuthState || state!==s.bloggerOAuthState || !expires || Date.now()>expires)return html('SEO connection expired','<p>Please return to Integrations → SEO and click <strong>Connect SEO</strong> again.</p>','error');
  const origin=preferredPublicOrigin(request,env),redirectUri=`${origin}/api/admin/blogger-oauth/callback`;
  const body=new URLSearchParams({code,client_id:s.bloggerClientId,client_secret:s.bloggerClientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
  const tokenRes=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const token=await tokenRes.json().catch(()=>({}));
  const refreshToken=String(token.refresh_token||s.bloggerRefreshToken||'');
  if(!tokenRes.ok || !token.access_token || !refreshToken)return html('SEO connection failed',`<p>${esc(token?.error_description||token?.error||'Google did not return the required OAuth access. Click Connect SEO again and approve access.')}</p>`,'error');
  const grantedScopes=String(token.scope||'').split(/\s+/).filter(Boolean);
  if(grantedScopes.length && !grantedScopes.includes(BLOGGER_SCOPE)){
    const scopeMessage='Google authorization completed, but the required SEO publishing permission was not granted. Reconnect and approve access.';
    await setSetting(env,'api_settings',{...s,bloggerRefreshToken:refreshToken,bloggerOAuthState:'',bloggerOAuthStateExpiresAt:'',bloggerConnectionState:'authorized_api_error',bloggerLastError:scopeMessage,bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    return html('SEO publishing permission was not granted',`<p>${esc(scopeMessage)}</p>`,'api');
  }

  const baseAuthorized={...s,bloggerRefreshToken:refreshToken,bloggerOAuthState:'',bloggerOAuthStateExpiresAt:'',bloggerConnectionState:'authorized',bloggerLastError:'',bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await setSetting(env,'api_settings',baseAuthorized);
  const auth={Authorization:`Bearer ${token.access_token}`};
  const key=String(s.bloggerApiKey||'').trim();
  const [blogAttempt,userRes]=await Promise.all([listBlogsWithAccessToken(token.access_token,key),fetch(`https://www.googleapis.com/blogger/v3/users/self${key?`?key=${encodeURIComponent(key)}`:''}`,{headers:auth})]);
  if(!blogAttempt.res?.ok){
    const detail=blogAttempt.detail||{message:'Google authorized the account, but the SEO publishing service could not read the available publishing sources.'};
    const message=detail.message||'The SEO publishing service could not read the publishing sources.';
    await setSetting(env,'api_settings',{...baseAuthorized,bloggerConnectionState:'authorized_api_error',bloggerLastError:message,bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const extra=likelyApiDisabled(message)?'<p><strong>Most likely fix:</strong> ask the developer to verify the SEO publishing API in the same Google Cloud project that contains this OAuth Client ID. After it is enabled, return to Integrations → SEO and click <strong>Retry SEO Check</strong>. You do not need to recreate the OAuth client.</p>':'<p>Return to Integrations → SEO and use <strong>Retry SEO Check</strong>. The exact Google API error is saved there so you can see what Google rejected.</p>';
    return html('SEO authorization completed, but the publishing connection needs attention',`<p>Google authorization succeeded.</p><p><strong>SEO publishing response:</strong> ${esc(message)}</p>${extra}`,'api');
  }
  const blogsData=blogAttempt.data||{},userData=userRes.ok?await userRes.json():{};
  const blogs=(blogsData.items||[]).map(x=>({id:String(x.id||''),name:String(x.name||''),url:String(x.url||'')})).filter(x=>x.id);
  let blogId=String(s.bloggerBlogId||'');
  if(!blogs.some(x=>x.id===blogId))blogId=blogs.length===1?blogs[0].id:'';
  const selected=blogs.find(x=>x.id===blogId)||{};
  const next={...baseAuthorized,bloggerConnectedUser:String(userData.displayName||userData.id||'SEO account'),bloggerAvailableBlogs:blogs,bloggerBlogId:blogId,bloggerBlogName:selected.name||'',bloggerBlogUrl:selected.url||'',bloggerConnectionState:blogs.length?'connected':'authorized_no_blogs',bloggerLastError:'',bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await setSetting(env,'api_settings',next);
  const msg=blogs.length===0?'SEO was authorized, but no publishing sources were found for this Google account. You can use the Manual SEO ID fallback in Integrations → SEO if this account manages the required publishing source.':blogs.length===1?`Connected to <strong>${esc(blogs[0].name)}</strong>.`:`SEO connected. <strong>${blogs.length}</strong> publishing sources were found; return to Integrations → SEO and choose the SEO you want to publish to.`;
  return html('SEO connected',`<p>${msg}</p>`,'ok');
}
