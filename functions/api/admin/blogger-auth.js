import { json, readJson, requireAdmin, getApiSettings, setSetting, preferredPublicOrigin } from '../../_lib/utils.js';
import { BLOGGER_SCOPE, listConnectedBloggerBlogs, getConnectedBloggerUser, getConnectedBloggerBlog } from '../../_lib/blogger.js';

function chooseBlog(settings,blogs=[]){
  let blogId=String(settings.bloggerBlogId||'').trim();
  if(!blogs.some(x=>String(x.id)===blogId))blogId=blogs.length===1?String(blogs[0].id):'';
  const selected=blogs.find(x=>String(x.id)===blogId)||{};
  return {blogId,selected};
}

function needsReconnect(e){
  const text=`${e?.code||''} ${e?.message||''} ${e?.reason||''} ${JSON.stringify(e?.google||{})}`;
  return e?.code==='SEO_RECONNECT_REQUIRED'||/invalid_grant|expired|revoked|token has been expired/i.test(text);
}
function reconnectPayload(){
  return {
    error:'Saved Google SEO authorization has expired or was revoked.',
    code:'SEO_RECONNECT_REQUIRED',
    action:'reconnect_seo',
    canReconnect:true,
    hint:'Click Connect SEO in Settings → Integrations → SEO and complete Google authentication. The saved SEO Name is kept and will be selected again when the same Google account is authorized.'
  };
}
async function refreshConnection(env,s){
  const blogs=await listConnectedBloggerBlogs(env);
  const user=await getConnectedBloggerUser(env).catch(()=>({displayName:s.bloggerConnectedUser||''}));
  const {blogId,selected}=chooseBlog(s,blogs);
  const next={...s,bloggerConnectedUser:String(user.displayName||s.bloggerConnectedUser||'SEO account'),bloggerAvailableBlogs:blogs,bloggerBlogId:blogId,bloggerBlogName:selected.name||'',bloggerBlogUrl:selected.url||'',bloggerConnectionState:blogs.length?'connected':'authorized_no_blogs',bloggerLastError:'',bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await setSetting(env,'api_settings',next);
  return next;
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const s=await getApiSettings(env),origin=preferredPublicOrigin(request,env),redirectUri=`${origin}/api/admin/blogger-oauth/callback`;
  if(!s.bloggerClientId || !s.bloggerClientSecret)return json({error:'Save the Google OAuth Client ID and Client Secret first.'},400);
  const state=crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');
  const next={...s,bloggerOAuthState:state,bloggerOAuthStateExpiresAt:new Date(Date.now()+10*60*1000).toISOString(),bloggerConnectionState:'authorizing',bloggerLastError:'',updatedAt:new Date().toISOString()};
  await setSetting(env,'api_settings',next);
  const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search=new URLSearchParams({client_id:s.bloggerClientId,redirect_uri:redirectUri,response_type:'code',scope:BLOGGER_SCOPE,access_type:'offline',include_granted_scopes:'true',prompt:'consent',state}).toString();
  return json({authorizationUrl:u.toString(),redirectUri});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request),s=await getApiSettings(env);
  if(b.action==='disconnect'){
    await setSetting(env,'api_settings',{...s,bloggerRefreshToken:'',bloggerConnectedUser:'',bloggerAvailableBlogs:[],bloggerBlogId:'',bloggerBlogName:'',bloggerBlogUrl:'',bloggerOAuthState:'',bloggerOAuthStateExpiresAt:'',bloggerConnectionState:'disconnected',bloggerLastError:'',bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    return json({ok:true,message:'SEO disconnected. OAuth Client ID/Secret were kept so you can reconnect later.'});
  }
  if(b.action==='test'){
    if(!s.bloggerRefreshToken)return json({error:'Google authorization has not been saved yet. Click Connect SEO first.'},400);
    try{const next=await refreshConnection(env,s);return json({ok:true,bloggerConnected:!!next.bloggerBlogId,blogs:next.bloggerAvailableBlogs||[],bloggerBlogId:next.bloggerBlogId||'',bloggerBlogName:next.bloggerBlogName||'',message:next.bloggerAvailableBlogs?.length?`SEO connection is working. ${next.bloggerAvailableBlogs.length} publishing source(s) found.`:'Google authorization works, but no SEO publishing sources were found for this account.'});}
    catch(e){
      if(needsReconnect(e)){
        const diag=reconnectPayload(),now=new Date().toISOString();
        await setSetting(env,'api_settings',{...s,bloggerConnectionState:'reconnect_required',bloggerLastError:diag.error,bloggerLastCheckedAt:now,updatedAt:now});
        return json(diag,409);
      }
      const message=String(e.message||'SEO connection check failed.');
      await setSetting(env,'api_settings',{...s,bloggerConnectionState:'authorized_api_error',bloggerLastError:message,bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      return json({error:message,code:'SEO_API_CHECK_FAILED',hint:'Google OAuth is still saved, but the SEO publishing API check failed. Confirm Blogger API v3 is enabled in the same Google Cloud project, then click Retry SEO Check.'},502);
    }
  }
  if(b.action==='manual_blog'){
    if(!s.bloggerRefreshToken)return json({error:'Connect Google first before using a Manual SEO ID.'},400);
    const blogId=String(b.blogId||'').replace(/\D/g,'');
    if(!blogId)return json({error:'Enter the numeric SEO ID.'},400);
    try{const blog=await getConnectedBloggerBlog(env,blogId);const next={...s,bloggerBlogId:blog.id,bloggerBlogName:blog.name||blog.id,bloggerBlogUrl:blog.url||'',bloggerAvailableBlogs:[...(Array.isArray(s.bloggerAvailableBlogs)?s.bloggerAvailableBlogs:[]).filter(x=>String(x.id)!==blog.id),blog],bloggerConnectionState:'connected',bloggerLastError:'',bloggerLastCheckedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await setSetting(env,'api_settings',next);return json({ok:true,blog,message:`Connected to ${blog.name||blog.id}.`});}
    catch(e){
      if(needsReconnect(e)){
        const diag=reconnectPayload(),now=new Date().toISOString();
        await setSetting(env,'api_settings',{...s,bloggerConnectionState:'reconnect_required',bloggerLastError:diag.error,bloggerLastCheckedAt:now,updatedAt:now});
        return json(diag,409);
      }
      return json({error:String(e.message||'The SEO ID could not be verified.'),code:'SEO_ID_CHECK_FAILED',hint:'Confirm the SEO ID belongs to the authorized Google account. If it still fails, verify Blogger API v3 is enabled in the same Google Cloud project.'},502);
    }
  }
  return json({error:'Unsupported action.'},400);
}
