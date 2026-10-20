import { getApiSettings, setSetting } from './utils.js';

const BLOGGER_SCOPE='https://www.googleapis.com/auth/blogger';
const tokenCache=new Map();

export async function readGoogleApiError(res, fallback='Google SEO publishing request failed'){
  let data={};
  try{data=await res.clone().json();}catch{
    try{const text=await res.clone().text(); if(text)data={error:{message:text}};}catch{}
  }
  const nested=data?.error||{};
  const firstDetail=Array.isArray(nested?.details)?nested.details.find(Boolean):null;
  const firstError=Array.isArray(nested?.errors)?nested.errors.find(Boolean):null;
  const message=String(nested?.message||data?.error_description||firstError?.message||firstDetail?.reason||data?.error||fallback);
  const reason=String(firstError?.reason||firstDetail?.reason||nested?.status||'');
  return {status:res.status||0,message,reason,raw:data};
}

async function googleError(res, fallback='Google SEO publishing request failed'){
  const d=await readGoogleApiError(res,fallback);
  const err=new Error(d.message||fallback);
  err.status=d.status;err.reason=d.reason;err.google=d.raw;
  return err;
}

function withApiKey(path,settings={}){
  const key=String(settings.bloggerApiKey||'').trim();
  if(!key)return path;
  const join=path.includes('?')?'&':'?';
  return `${path}${join}key=${encodeURIComponent(key)}`;
}

function seoReconnectError(message='Saved Google SEO authorization has expired or was revoked.'){
  const err=new Error(message);
  err.code='SEO_RECONNECT_REQUIRED';
  err.action='reconnect_seo';
  err.hint='Open Settings → Integrations → SEO, expand SEO Connection, then click Connect SEO and complete Google authentication. Your saved SEO Name is preserved and will be selected again when the same account is authorized.';
  return err;
}
function reconnectRequired(detail={}){
  const text=`${detail?.message||''} ${detail?.reason||''} ${JSON.stringify(detail?.raw||{})}`;
  return /invalid_grant|expired|revoked|token has been expired|bad request.*refresh/i.test(text);
}

async function markReconnectRequired(env,s,message){
  if(String(s?.bloggerConnectionState||'')==='reconnect_required'&&String(s?.bloggerLastError||'')===String(message||''))return;
  const now=new Date().toISOString();
  await setSetting(env,'api_settings',{...s,bloggerConnectionState:'reconnect_required',bloggerLastError:String(message||'Saved Google SEO authorization has expired or was revoked.'),bloggerLastCheckedAt:now,updatedAt:now}).catch(()=>{});
}

export async function getBloggerAccessToken(env){
  const s=await getApiSettings(env);
  if(!s.bloggerClientId || !s.bloggerClientSecret || !s.bloggerRefreshToken) throw seoReconnectError('SEO is not authorized yet. Connect Google OAuth before loading or publishing Fitness Tips.');
  const cacheKey=`${s.bloggerClientId}:${String(s.bloggerRefreshToken).slice(-24)}`;
  const cached=tokenCache.get(cacheKey);
  if(cached?.accessToken && Number(cached.expiresAt||0)>Date.now()+60000)return {accessToken:cached.accessToken,settings:s};
  const body=new URLSearchParams({client_id:s.bloggerClientId,client_secret:s.bloggerClientSecret,refresh_token:s.bloggerRefreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  if(!res.ok){
    const detail=await readGoogleApiError(res,'Could not refresh SEO access.');
    if(reconnectRequired(detail)){
      const message='Saved Google SEO authorization has expired or was revoked. Reconnect Google OAuth to restore the connection.';
      await markReconnectRequired(env,s,message);
      throw seoReconnectError(message);
    }
    const err=new Error(detail.message||'Could not refresh SEO access.');
    err.status=detail.status;err.reason=detail.reason;err.google=detail.raw;throw err;
  }
  const data=await res.json();
  if(!data.access_token)throw seoReconnectError('Google did not return a usable SEO access token. Reconnect Google OAuth to restore the connection.');
  tokenCache.set(cacheKey,{accessToken:data.access_token,expiresAt:Date.now()+Math.max(300,Number(data.expires_in||3600))*1000});
  return {accessToken:data.access_token,settings:s};
}

export async function bloggerFetch(env,path,{method='GET',body}={}){
  const {accessToken,settings}=await getBloggerAccessToken(env);
  const requestPath=withApiKey(path,settings);
  const res=await fetch(`https://www.googleapis.com/blogger/v3${requestPath}`,{method,headers:{Authorization:`Bearer ${accessToken}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  if(!res.ok) throw await googleError(res);
  if(res.status===204)return {};
  const text=await res.text();
  return text?JSON.parse(text):{};
}

export async function listConnectedBloggerBlogs(env){
  // ADMIN is preferred because this website publishes and manages posts. Some legacy
  // Blogger accounts respond more reliably without fetchUserInfo/view, so retry the
  // same authorized list endpoint with progressively simpler parameters before failing.
  const paths=['/users/self/blogs?view=ADMIN&fetchUserInfo=true','/users/self/blogs?view=ADMIN','/users/self/blogs?view=AUTHOR','/users/self/blogs'];
  let lastError=null;
  for(const path of paths){
    try{const data=await bloggerFetch(env,path);return (data.items||[]).map(x=>({id:String(x.id||''),name:String(x.name||''),url:String(x.url||''),description:String(x.description||'')})).filter(x=>x.id);}
    catch(e){lastError=e;if(/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED|API has not been used/i.test(String(e.message||'')))break;}
  }
  throw lastError||new Error('SEO publishing sources could not be read for the authorized account.');
}

export async function getConnectedBloggerUser(env){
  const data=await bloggerFetch(env,'/users/self');
  return {id:String(data.id||''),displayName:String(data.displayName||data.id||'Blogger account')};
}

export async function getConnectedBloggerBlog(env,blogId){
  if(!blogId)throw new Error('SEO ID is required.');
  let last=null;
  for(const path of [`/blogs/${encodeURIComponent(blogId)}?view=ADMIN`,`/blogs/${encodeURIComponent(blogId)}`]){
    try{const data=await bloggerFetch(env,path);return {id:String(data.id||blogId),name:String(data.name||''),url:String(data.url||''),description:String(data.description||'')};}
    catch(e){last=e;}
  }
  throw last||new Error('The selected SEO could not be read.');
}

export async function listBloggerPosts(env,blogId,{maxResults=50,pageToken='',status='live',orderBy='',startDate='',endDate='',fetchBodies=true,fetchImages=true}={}){
  if(!blogId)throw new Error('Choose an SEO Name first.');
  const qs=new URLSearchParams({
    maxResults:String(Math.max(1,Math.min(50,Number(maxResults)||50))),
    fetchBodies:fetchBodies?'true':'false',
    fetchImages:fetchImages?'true':'false',
    view:'ADMIN'
  });
  if(pageToken)qs.set('pageToken',pageToken);
  if(status)qs.set('status',status);
  if(orderBy)qs.set('orderBy',String(orderBy));
  if(startDate)qs.set('startDate',String(startDate));
  if(endDate)qs.set('endDate',String(endDate));
  const data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts?${qs.toString()}`);
  return {items:Array.isArray(data.items)?data.items:[],nextPageToken:String(data.nextPageToken||'')};
}

function escAttr(s=''){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export async function upsertBloggerPost(env,{blogId,bloggerPostId='',title,content,labels=[],coverImageUrl='',publishDraft=false}){
  if(!blogId) throw new Error('Choose an SEO Name in Settings → Integrations → SEO first.');
  const fullContent=coverImageUrl?`<p><img src="${escAttr(coverImageUrl)}" alt="${escAttr(title)}"></p>${content}`:content;
  const payload={kind:'blogger#post',blog:{id:String(blogId)},title:String(title||''),content:String(fullContent||''),labels:(labels||[]).filter(Boolean).slice(0,20)};
  if(bloggerPostId){
    let data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(bloggerPostId)}`,{method:'PUT',body:{...payload,id:String(bloggerPostId)}});
    if(publishDraft){
      data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(bloggerPostId)}/publish`,{method:'POST'});
    }
    return {id:String(data.id||bloggerPostId),url:String(data.url||''),published:String(data.published||''),updated:String(data.updated||'')};
  }
  const data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts?isDraft=false`,{method:'POST',body:payload});
  return {id:String(data.id||''),url:String(data.url||''),published:String(data.published||''),updated:String(data.updated||'')};
}

export async function updateBloggerDraft(env,{blogId,bloggerPostId,title,content,labels=[],coverImageUrl=''}){
  if(!bloggerPostId)return null;
  const fullContent=coverImageUrl?`<p><img src="${escAttr(coverImageUrl)}" alt="${escAttr(title)}"></p>${content}`:content;
  const payload={kind:'blogger#post',id:String(bloggerPostId),blog:{id:String(blogId)},title:String(title||''),content:String(fullContent||''),labels:(labels||[]).filter(Boolean).slice(0,20)};
  const data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(bloggerPostId)}`,{method:'PUT',body:payload});
  return {id:String(data.id||bloggerPostId),url:String(data.url||''),published:String(data.published||''),updated:String(data.updated||'')};
}

export async function revertBloggerPost(env,{blogId,bloggerPostId}){
  if(!blogId||!bloggerPostId)return null;
  const data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(bloggerPostId)}/revert`,{method:'POST'});
  return {id:String(data.id||bloggerPostId),url:String(data.url||''),updated:String(data.updated||'')};
}

export async function deleteBloggerPost(env,{blogId,bloggerPostId}){
  if(!blogId||!bloggerPostId)return {ok:true,skipped:true};
  // Dance class article publishing uses permanent Blogger deletion deliberately. A recoverable copy is
  // retained separately in D1 by the admin endpoint; Blogger itself is not used as
  // the Deleted archive.
  const path=`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(bloggerPostId)}`;
  await bloggerFetch(env,path,{method:'DELETE'});
  return {ok:true};
}


export async function getBloggerPost(env,blogId,postId){
  if(!blogId||!postId)throw new Error('SEO post ID is required.');
  return bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}?view=ADMIN`);
}

export async function saveBloggerPostDirect(env,{blogId,postId='',title,content,labels=[],status='draft',scheduleAt=''}={}){
  if(!blogId)throw new Error('Choose an SEO Name in Settings → Integrations → SEO first.');
  const requested=String(status||'draft').toLowerCase();
  const wanted=['published','scheduled'].includes(requested)?requested:'draft';
  const publishDate=wanted==='scheduled'?String(scheduleAt||'').trim():'';
  if(wanted==='scheduled'&&!publishDate)throw new Error('Choose a future schedule date and time first.');
  const payload={kind:'blogger#post',blog:{id:String(blogId)},title:String(title||''),content:String(content||''),labels:(labels||[]).map(x=>String(x||'').trim()).filter(Boolean).slice(0,20)};
  if(!postId){
    if(wanted==='published')return bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts?isDraft=false`,{method:'POST',body:payload});
    let data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts?isDraft=true`,{method:'POST',body:payload});
    if(wanted==='scheduled')data=await publishBloggerPost(env,{blogId,postId:String(data?.id||''),publishDate});
    return data;
  }
  let current=null;
  try{current=await getBloggerPost(env,blogId,postId);}catch{}
  const currentStatus=String(current?.status||'').toLowerCase();
  // Keep the existing live-edit flow unchanged. Revert only when the requested
  // state requires a Draft first (draft/scheduled), or when cancelling an existing schedule.
  const needsDraftFirst=(wanted==='draft'||wanted==='scheduled')&&currentStatus&&currentStatus!=='draft';
  const cancelExistingSchedule=wanted==='published'&&currentStatus==='scheduled';
  if(needsDraftFirst||cancelExistingSchedule){
    try{await revertBloggerPost(env,{blogId,bloggerPostId:postId});}catch(e){if(!/draft|revert/i.test(String(e.message||'')))throw e;}
  }
  let data=await bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}`,{method:'PUT',body:{...payload,id:String(postId)}});
  if(wanted==='published'&&String(data?.status||currentStatus||'').toLowerCase()!=='live')data=await publishBloggerPost(env,{blogId,postId});
  if(wanted==='scheduled')data=await publishBloggerPost(env,{blogId,postId,publishDate});
  return data;
}

export async function publishBloggerPost(env,{blogId,postId,publishDate=''}={}){
  if(!blogId||!postId)throw new Error('SEO post ID is required.');
  const qs=String(publishDate||'').trim()?`?publishDate=${encodeURIComponent(String(publishDate).trim())}`:'';
  return bloggerFetch(env,`/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}/publish${qs}`,{method:'POST'});
}

export { BLOGGER_SCOPE };
