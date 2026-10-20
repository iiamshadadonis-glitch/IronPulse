import { json, readJson, requireAdmin, slugify, getApiSettings, getSiteSettings } from '../../_lib/utils.js';
import {
  getSeoPostById, buildSeoPostContent, loadAdminAuditionPosts, cacheSeoPostById,
  getCachedAuditionPostById, saveDeletedAuditionSnapshot, purgeAuditionCachePost
} from '../../_lib/seo-posts.js';
import { saveBloggerPostDirect, publishBloggerPost, revertBloggerPost, deleteBloggerPost } from '../../_lib/blogger.js';
import { distributePublishedArticle } from '../../_lib/social-publishing.js';

function textToHtml(text=''){
  const clean=String(text||'').replace(/\r\n/g,'\n').trim();
  if(!clean)return '';
  if(/<[a-z][\s\S]*>/i.test(clean))return clean;
  return clean.split(/\n{2,}/).map(p=>`<p>${p.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>')}</p>`).join('\n');
}
function splitTags(value=''){return Array.isArray(value)?value.map(x=>String(x||'').trim()).filter(Boolean).slice(0,12):String(value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);}
function bool(v){return ['1','true','on','yes'].includes(String(v??'').toLowerCase());}
function parseAds(value){try{const v=Array.isArray(value)?value:JSON.parse(String(value||'[]'));return Array.isArray(v)?v:[];}catch{return [];}}
function poll(value){let p={};try{p=typeof value==='string'?JSON.parse(value||'{}'):(value||{});}catch{}const options=(Array.isArray(p.options)?p.options:[]).map(x=>String(x||'').trim().slice(0,25)).filter(Boolean).slice(0,4),enabled=bool(p.enabled),question=String(p.question||'').trim().slice(0,140),duration=['one_day','three_days','seven_days','fourteen_days'].includes(String(p.duration||'').toLowerCase())?String(p.duration).toLowerCase():'one_day';if(enabled&&(!question||options.length<2))throw new Error('An enabled article poll needs a question and at least two options.');return {enabled,question,options,duration};}
function enabledAdPlatform(settings={}){
  const ai=settings?.adIntegrations||{}; const ready=x=>!!x?.enabled&&!!String(x?.headCode||x?.bodyCode||x?.publisherId||'').trim();
  return ready(ai.googleAdsense)||ready(ai.adsterra)||ready(ai.mediaNet)||ready(ai.custom);
}
async function validateAds(env,{adsValue='[]',autoAds=false}={}){
  const ads=parseAds(adsValue),manual=ads.filter(x=>!x?.custom&&String(x?.type||'').toLowerCase()!=='custom advertisement');
  if(!autoAds&&!manual.length)return ads;
  const site=await getSiteSettings(env).catch(()=>({}));
  if(!enabledAdPlatform(site))throw new Error('Ad platform is not integrated yet. Turn off Automatic Ads and remove ad-network placements, or configure an ad platform in Settings → Integrations → Ad Networks. Custom brand advertisements can still be used.');
  return ads;
}
async function selected(env){const s=await getApiSettings(env);if(!s.bloggerRefreshToken||!s.bloggerBlogId)throw new Error('SEO is not connected. Open Settings → Integrations → SEO, connect SEO and choose the SEO Name first.');return s;}
function apiErr(e,prefix='SEO request failed'){
  const message=String(e?.message||prefix);
  if(/ad platform is not integrated|automatic ads/i.test(message))return {
    error:'Automatic Ads cannot be used because no ad platform is connected. Turn off Automatic Ads and post the article, or go to Settings → Integrations → Ad Networks, connect and enable an ad platform, then return here and try again.'
  };
  const hint=/quota|rate/i.test(message)?'The publishing service temporarily limited requests. Wait briefly and try Load Article Updates again.':/auth|token|permission|forbidden|unauthorized/i.test(message)?'Reconnect SEO in Settings → Integrations → SEO, then retry.':'Confirm the selected SEO Name is DropBeat Dance Studio and that the connected account can manage it.';
  return {error:`${prefix}: ${message}`,hint};
}
function scheduleValue(v=''){
  const raw=String(v||'').trim(); if(!raw)return '';
  const ms=Date.parse(raw); if(!Number.isFinite(ms))throw new Error('Choose a valid schedule date and time.');
  if(ms<=Date.now()+60*1000)throw new Error('Scheduled publication must be at least one minute in the future.');
  return new Date(ms).toISOString();
}
function localDeleted(p){return p&&String(p.status||'').toLowerCase()==='deleted';}
function scheduleDistribution(env,waitUntil,post){
  if(!post)return;
  const task=distributePublishedArticle(env,post).catch(()=>null);
  if(typeof waitUntil==='function')waitUntil(task);else task.catch(()=>{});
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),id=String(u.searchParams.get('id')||'').trim();
  try{
    const s=await selected(env);
    if(id){
      const cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
      if(localDeleted(cached))return json({post:cached,local_deleted:true},200,{'cache-control':'no-store'});
      try{return json({post:await cacheSeoPostById(env,id)},200,{'cache-control':'no-store'});}
      catch(e){if(cached&&/not found|404/i.test(String(e?.message||'')))return json({post:cached,cached_only:true},200,{'cache-control':'no-store'});throw e;}
    }
    const data=await loadAdminAuditionPosts(env);
    const posts=data.posts||[],sync=data.sync||{};
    let message='';
    if(data.warning)message=`Loaded ${posts.length} saved article(s) from the database. ${data.warning}`;
    else if(sync.mode==='backfill'&&!sync.initial_sync_complete)message=`Importing all articles from ${data.blogName||'the selected SEO'}… ${posts.length} unique article(s) are saved so far. This same Load action will continue automatically until the first full synchronization is complete.`;
    else if(sync.mode==='backfill')message=`Loaded ${posts.length} unique article(s) and completed the first full synchronization from ${data.blogName||'the selected SEO'}. Future loads check for recent changes and refresh only changed or new articles.`;
    else message=`Loaded ${posts.length} saved article(s) and checked ${data.blogName||'the selected SEO'} for recent changes. ${Number(sync.changed_count||0)} changed or new article(s) were refreshed.`;
    const published=posts.filter(x=>x.status==='published').length,drafts=posts.filter(x=>x.status==='draft').length,scheduled=posts.filter(x=>x.status==='scheduled').length,deleted=posts.filter(x=>x.status==='deleted').length;
    return json({ok:true,posts,total:posts.length,published,drafts,scheduled,deleted,truncated:!!sync.truncated,seo:{id:data.blogId,name:data.blogName},cache:true,sync,state:data.state||{},warning:data.warning||'',message},200,{'cache-control':'no-store'});
  }catch(e){return json(apiErr(e,'Could not load article updates'),502);}
}

export async function onRequestPost({request,env,waitUntil}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request); let s;
  try{s=await selected(env);}catch(e){return json({error:e.message},400);}
  const id=String(b.id||b.post_id||'').trim(),action=String(b.action||'').toLowerCase();
  try{
    if(action==='publish'){
      if(!id)return json({error:'Article ID is required.'},400);
      const cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
      if(localDeleted(cached))return json({error:'This article is stored only in Deleted. Use Repost to create it again in SEO.'},400);
      const existing=await getSeoPostById(env,id).catch(()=>cached);
      if(String(existing?.status||'').toLowerCase()==='scheduled')await revertBloggerPost(env,{blogId:s.bloggerBlogId,bloggerPostId:id});
      const remote=await publishBloggerPost(env,{blogId:s.bloggerBlogId,postId:id});
      const refreshed=await cacheSeoPostById(env,String(remote?.id||id)).catch(()=>null);
      scheduleDistribution(env,waitUntil,refreshed||existing||{id:String(remote?.id||id),title:remote?.title||''});
      return json({ok:true,status:'published',post_id:String(remote?.id||id),url:String(refreshed?.blogger_post_url||remote?.url||''),post:refreshed||undefined});
    }
    if(action==='set_draft'){
      if(!id)return json({error:'Article ID is required.'},400);
      const cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
      if(localDeleted(cached))return json({error:'This article is stored only in Deleted. Edit or Repost it to create a new SEO post.'},400);
      const remote=await revertBloggerPost(env,{blogId:s.bloggerBlogId,bloggerPostId:id});
      const refreshed=await cacheSeoPostById(env,String(remote?.id||id)).catch(()=>null);
      return json({ok:true,status:'draft',post_id:String(remote?.id||id),post:refreshed||undefined});
    }
    if(action==='delete'){
      if(!id)return json({error:'Article ID is required.'},400);
      const cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
      if(localDeleted(cached))return json({ok:true,deleted:true,already_deleted:true,post:cached});
      const existing=await getSeoPostById(env,id).catch(e=>{if(cached&&/not found|404/i.test(String(e?.message||'')))return cached;throw e;});
      if(!existing)throw new Error('The article could not be found.');
      try{await deleteBloggerPost(env,{blogId:s.bloggerBlogId,bloggerPostId:id});}
      catch(e){if(!/not found|404/i.test(String(e?.message||'')))throw e;}
      const deleted=await saveDeletedAuditionSnapshot(env,{...existing,id,blogger_post_id:id,blogger_post_url:'',status:'deleted',remote_status:'deleted',is_deleted:1},{blogId:s.bloggerBlogId});
      return json({ok:true,deleted:true,remote_deleted:true,post_id:id,status:'deleted',post:deleted});
    }
    if(action==='purge_deleted'){
      if(!id)return json({error:'Article ID is required.'},400);
      const cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
      if(!localDeleted(cached))return json({error:'Only an item already stored in Deleted can be permanently removed from the admin database.'},400);
      await purgeAuditionCachePost(env,id,{blogId:s.bloggerBlogId});
      return json({ok:true,purged:true,post_id:id});
    }
    if(action==='repost'){
      if(!id)return json({error:'Article ID is required.'},400);
      const existing=await getCachedAuditionPostById(env,id,s.bloggerBlogId);
      if(!localDeleted(existing))return json({error:'Only an item stored in Deleted can be reposted.'},400);
      const ads=parseAds(existing.ads_json||'[]');
      const meta={slug:existing.slug,excerpt:existing.excerpt,cover_image_url:existing.cover_image_url,is_featured:!!Number(existing.is_featured||0),is_deleted:false,auto_ads_enabled:!!Number(existing.auto_ads_enabled||0),social_first_comment_enabled:!!Number(existing.social_first_comment_enabled||0),social_first_comment_text:String(existing.social_first_comment_text||''),social_poll_json:JSON.stringify(poll(existing.social_poll_json)),ads_json:ads,seo_title:existing.seo_title||'',seo_description:existing.seo_description||''};
      const content=buildSeoPostContent({title:existing.title,body_html:existing.body_html,cover_image_url:existing.cover_image_url,meta});
      const remote=await saveBloggerPostDirect(env,{blogId:s.bloggerBlogId,title:existing.title,content,labels:existing.tags||[],status:'published'});
      const remoteId=String(remote?.id||''); if(!remoteId)throw new Error('SEO did not return the reposted article ID.');
      const refreshed=await cacheSeoPostById(env,remoteId).catch(()=>null);
      await purgeAuditionCachePost(env,id,{blogId:s.bloggerBlogId});
      scheduleDistribution(env,waitUntil,refreshed||{...existing,id:remoteId,blogger_post_id:remoteId,status:'published'});
      return json({ok:true,reposted:true,status:'published',post_id:remoteId,url:String(refreshed?.blogger_post_url||remote?.url||''),post:refreshed||remote});
    }

    let existing=id?await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null):null;
    if(id&&!localDeleted(existing))existing=await getSeoPostById(env,id).catch(()=>existing);
    const restoringDeleted=localDeleted(existing);
    const title=String(b.title||existing?.title||'').trim(); if(!title)return json({error:'Article title is required.'},400);
    const slug=slugify(b.slug||existing?.slug||title); if(!slug)return json({error:'A valid article link/slug is required.'},400);
    const body_html=textToHtml(b.body_text??b.body_html??existing?.body_html??''); if(!body_html)return json({error:'Article details are required.'},400);
    const requested=String(b.status||existing?.status||'draft').toLowerCase();
    const status=['published','scheduled'].includes(requested)?requested:'draft';
    const scheduleAt=status==='scheduled'?scheduleValue(b.schedule_at||b.scheduled_at||''):'';
    const tags=splitTags(b.tags??existing?.tags??[]);
    const ads=await validateAds(env,{adsValue:b.ads_json??existing?.ads_json??'[]',autoAds:bool(b.auto_ads_enabled??existing?.auto_ads_enabled)});
    const meta={
      slug,
      excerpt:String(b.excerpt??existing?.excerpt??'').trim().slice(0,500),
      cover_image_url:String(b.cover_image_url??existing?.cover_image_url??'').trim(),
      is_featured:bool(b.is_featured??existing?.is_featured),
      is_deleted:false,
      auto_ads_enabled:bool(b.auto_ads_enabled??existing?.auto_ads_enabled),
      social_first_comment_enabled:bool(b.social_first_comment_enabled??existing?.social_first_comment_enabled),
      social_first_comment_text:String(b.social_first_comment_text??existing?.social_first_comment_text??'').trim().slice(0,1800),
      social_poll_json:JSON.stringify(poll(b.social_poll_json??existing?.social_poll_json??'{}')),
      ads_json:ads,
      seo_title:String(b.seo_title??existing?.seo_title??'').trim(),
      seo_description:String(b.seo_description??existing?.seo_description??'').trim()
    };
    const content=buildSeoPostContent({title,body_html,cover_image_url:meta.cover_image_url,meta});
    // A Deleted row no longer has a Blogger resource. Saving it creates a new SEO post
    // and then removes the old local-only Deleted snapshot to avoid a duplicate admin row.
    const remote=await saveBloggerPostDirect(env,{blogId:s.bloggerBlogId,postId:restoringDeleted?'':id,title,content,labels:tags,status,scheduleAt});
    const remoteId=String(remote?.id||(!restoringDeleted?id:''));
    const refreshed=remoteId?await cacheSeoPostById(env,remoteId).catch(()=>null):null;
    if(restoringDeleted)await purgeAuditionCachePost(env,id,{blogId:s.bloggerBlogId});
    if(status==='published')scheduleDistribution(env,waitUntil,refreshed||{id:remoteId,blogger_post_id:remoteId,title,slug,tags,excerpt:meta.excerpt,body_html,cover_image_url:meta.cover_image_url,social_first_comment_enabled:meta.social_first_comment_enabled?1:0,social_first_comment_text:meta.social_first_comment_text||'',social_poll_json:meta.social_poll_json,status:'published'});
    return json({ok:true,post_id:remoteId,status,url:String(refreshed?.blogger_post_url||remote?.url||''),post:refreshed||remote,restored_from_deleted:restoringDeleted});
  }catch(e){
    const prefix=action==='delete'?'Could not delete article':action==='purge_deleted'?'Could not permanently remove the Deleted article':action==='repost'?'Could not repost the Deleted article':'Could not save article';
    return json(apiErr(e,prefix),502);
  }
}

export async function onRequestDelete({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),id=String(u.searchParams.get('id')||'').trim(); if(!id)return json({error:'Article ID is required.'},400);
  try{
    const s=await selected(env),cached=await getCachedAuditionPostById(env,id,s.bloggerBlogId).catch(()=>null);
    if(localDeleted(cached)){await purgeAuditionCachePost(env,id,{blogId:s.bloggerBlogId});return json({ok:true,purged:true,post_id:id});}
    const existing=await getSeoPostById(env,id).catch(e=>{if(cached&&/not found|404/i.test(String(e?.message||'')))return cached;throw e;});
    if(!existing)return json({error:'Article not found.'},404);
    try{await deleteBloggerPost(env,{blogId:s.bloggerBlogId,bloggerPostId:id});}catch(e){if(!/not found|404/i.test(String(e?.message||'')))throw e;}
    const deleted=await saveDeletedAuditionSnapshot(env,{...existing,id,status:'deleted',remote_status:'deleted',blogger_post_url:'',is_deleted:1},{blogId:s.bloggerBlogId});
    return json({ok:true,deleted:true,remote_deleted:true,post_id:id,status:'deleted',post:deleted});
  }catch(e){return json(apiErr(e,'Could not delete article'),502);}
}
