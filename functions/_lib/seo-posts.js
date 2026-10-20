import { getApiSettings, slugify } from './utils.js';
import { listBloggerPosts, getBloggerPost } from './blogger.js';

const META_PREFIX='UC_META:';

function stripScripts(html=''){
  return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');
}
export function stripHtml(html=''){
  return stripScripts(html).replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();
}
export function excerptFromHtml(html='',max=230){
  const s=stripHtml(html);return s.length>max?s.slice(0,max-1).trim()+'…':s;
}
export function firstImageFromBlogger(post={}){
  const direct=Array.isArray(post.images)&&post.images[0]?.url?String(post.images[0].url):'';
  if(direct)return direct;
  const m=String(post.content||'').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?m[1]:'';
}
function removeLeadingCover(content='',image=''){
  let html=String(content||'');
  if(!image)return html;
  const escaped=String(image).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const p=new RegExp(`^\\s*<p[^>]*>\\s*<img[^>]+src=["']${escaped}["'][^>]*>\\s*<\\/p>\\s*`,'i');
  const bare=new RegExp(`^\\s*<img[^>]+src=["']${escaped}["'][^>]*>\\s*`,'i');
  return html.replace(p,'').replace(bare,'');
}
export function parseSeoMeta(content=''){
  const html=String(content||'');
  const m=html.match(/<!--\s*UC_META:([\s\S]*?)-->/i);
  if(!m)return {meta:{},content:html};
  let meta={};
  try{meta=JSON.parse(decodeURIComponent(String(m[1]||'').trim()));}catch{}
  return {meta:meta&&typeof meta==='object'?meta:{},content:html.replace(m[0],'').trim()};
}
export function encodeSeoMeta(meta={}){
  const clean={
    slug:String(meta.slug||'').trim(),
    excerpt:String(meta.excerpt||'').trim().slice(0,500),
    cover_image_url:String(meta.cover_image_url||'').trim().slice(0,2000),
    is_featured:meta.is_featured?1:0,
    is_deleted:meta.is_deleted?1:0,
    auto_ads_enabled:meta.auto_ads_enabled?1:0,
    social_first_comment_enabled:meta.social_first_comment_enabled?1:0,
    social_first_comment_text:String(meta.social_first_comment_text||'').trim().slice(0,1800),
    social_poll_json:typeof meta.social_poll_json==='string'?meta.social_poll_json:JSON.stringify(meta.social_poll_json||{}),
    ads_json:Array.isArray(meta.ads_json)?meta.ads_json:meta.ads_json||[],
    seo_title:String(meta.seo_title||'').trim().slice(0,180),
    seo_description:String(meta.seo_description||'').trim().slice(0,320)
  };
  return `<!--${META_PREFIX}${encodeURIComponent(JSON.stringify(clean))}-->`;
}
function escAttr(s=''){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function buildSeoPostContent({title='',body_html='',cover_image_url='',meta={}}={}){
  const image=String(cover_image_url||meta.cover_image_url||'').trim();
  const imageHtml=image?`<p><img src="${escAttr(image)}" alt="${escAttr(title)}"></p>`:'';
  return `${encodeSeoMeta({...meta,cover_image_url:image})}${imageHtml}${String(body_html||'')}`;
}
function slugFromUrl(url='',title=''){
  try{const u=new URL(url);const last=u.pathname.split('/').filter(Boolean).pop()||'';const s=slugify(last.replace(/\.html?$/i,''));if(s)return s;}catch{}
  return slugify(title||'dance-class-update');
}
function safeAds(raw){
  if(Array.isArray(raw))return raw;
  try{const v=JSON.parse(String(raw||'[]'));return Array.isArray(v)?v:[];}catch{return [];}
}
export function decorateSeoPost(post={},statusHint=''){
  const parsed=parseSeoMeta(post.content||'');
  const meta=parsed.meta||{};
  const cover=String(meta.cover_image_url||firstImageFromBlogger(post)||'').trim();
  const body=removeLeadingCover(parsed.content||'',cover).trim();
  const rawStatus=String(statusHint||post.status||'live').toLowerCase();
  // V15.7: Deleted is now a D1-only admin state. A post that still exists in Blogger
  // must be represented by Blogger's real live/draft/scheduled status, even if an old
  // UC_META block from an earlier version still contains is_deleted=1.
  const status=rawStatus==='draft'?'draft':rawStatus==='scheduled'?'scheduled':'published';
  const labels=(Array.isArray(post.labels)?post.labels:[]).map(x=>String(x||'').trim()).filter(Boolean).slice(0,20);
  const slug=slugify(meta.slug||slugFromUrl(post.url||'',post.title||''))||slugFromUrl(post.url||'',post.title||'');
  const published=String(post.published||post.updated||'');
  return {
    id:String(post.id||''),
    blogger_post_id:String(post.id||''),
    blogger_post_url:String(post.url||''),
    blogger_updated_at:String(post.updated||''),
    title:String(post.title||'Untitled Fitness Tip'),
    slug,
    excerpt:String(meta.excerpt||excerptFromHtml(body,230)),
    body_html:body,
    body_text:stripHtml(body),
    cover_image_url:cover,
    status,
    tags:labels,
    is_featured:Number(meta.is_featured||0)?1:0,
    is_deleted:Number(meta.is_deleted||0)?1:0,
    auto_ads_enabled:Number(meta.auto_ads_enabled||0)?1:0,
    social_first_comment_enabled:Number(meta.social_first_comment_enabled||0)?1:0,
    social_first_comment_text:String(meta.social_first_comment_text||''),
    social_poll_json:typeof meta.social_poll_json==='string'?meta.social_poll_json:JSON.stringify(meta.social_poll_json||{}),
    ads_json:JSON.stringify(safeAds(meta.ads_json)),
    seo_title:String(meta.seo_title||''),
    seo_description:String(meta.seo_description||''),
    published_at:status==='published'?published:'',
    scheduled_at:status==='scheduled'?published:'',
    created_at:String(post.published||post.updated||''),
    updated_at:String(post.updated||post.published||''),
    remote_status:rawStatus,
    author:post.author||null
  };
}

async function listStatusDirect(env,blogId,status,{maxPages=10}={}){
  let pageToken='',pages=0,truncated=false;const items=[];
  do{
    const data=await listBloggerPosts(env,blogId,{maxResults:50,pageToken,status});
    for(const p of data.items||[])items.push(decorateSeoPost(p,status));
    pageToken=String(data.nextPageToken||'');pages++;
    if(pageToken&&pages>=Math.max(1,Number(maxPages)||10)){truncated=true;break;}
  }while(pageToken);
  return {items,nextPageToken:pageToken,truncated,pages};
}

async function cacheGet(key){
  try{const cache=globalThis.caches?.default;if(!cache)return null;const r=await cache.match(new Request(key));return r?await r.json():null;}catch{return null;}
}
async function cachePut(key,value,seconds=30){
  try{const cache=globalThis.caches?.default;if(!cache)return;const r=new Response(JSON.stringify(value),{headers:{'content-type':'application/json','cache-control':`public, max-age=${Math.max(1,seconds)}`}});await cache.put(new Request(key),r);}catch{}
}

export async function loadSeoPosts(env,{statuses=['live'],maxPages=10,cacheSeconds=0}={}){
  const settings=await getApiSettings(env);
  const blogId=String(settings.bloggerBlogId||'').trim();
  if(!settings.bloggerRefreshToken||!blogId)throw new Error('SEO is not connected. Open Settings → Integrations → SEO and connect SEO first.');
  const normalized=[...new Set((statuses||['live']).map(x=>String(x||'live').toLowerCase()).filter(x=>['live','draft','scheduled'].includes(x)))];
  const key=`https://uc-internal.invalid/seo-posts/${encodeURIComponent(blogId)}/${normalized.join(',')}/${maxPages}`;
  if(cacheSeconds>0){const cached=await cacheGet(key);if(cached)return {...cached,settings};}
  // Read statuses sequentially. This deliberately avoids bursting multiple Blogger
  // ADMIN requests (and duplicate OAuth refreshes) at the same time on Cloudflare.
  // It is slower only by a tiny amount for small blogs, but much more reliable for
  // older Blogger accounts that contain many drafts.
  const batches=[];
  for(const status of normalized){
    try{batches.push({status,...await listStatusDirect(env,blogId,status,{maxPages})});}
    catch(e){
      const err=new Error(`Could not read ${status==='live'?'published':status} SEO posts: ${e?.message||e}`);
      err.cause=e;err.seoStatus=status;throw err;
    }
  }
  const posts=batches.flatMap(x=>x.items);
  const result={posts,batches,truncated:batches.some(x=>x.truncated),blogId,blogName:String(settings.bloggerBlogName||'')};
  if(cacheSeconds>0)await cachePut(key,result,cacheSeconds);
  return {...result,settings};
}

export async function findSeoPostBySlug(env,slug,{includeDraft=false,maxPages=20,cacheSeconds=30}={}){
  const wanted=slugify(slug||'');if(!wanted)return null;
  const statuses=includeDraft?['live','draft']:['live'];
  const data=await loadSeoPosts(env,{statuses,maxPages,cacheSeconds});
  return data.posts.find(p=>String(p.slug||'')===wanted)||null;
}

export async function getSeoPostById(env,postId){
  const settings=await getApiSettings(env);const blogId=String(settings.bloggerBlogId||'').trim();
  if(!settings.bloggerRefreshToken||!blogId)throw new Error('SEO is not connected.');
  const post=await getBloggerPost(env,blogId,String(postId||''));
  return decorateSeoPost(post,post.status||'');
}

/* V15.7 — admin-only D1 Auditions index.
   Blogger remains the publishing source of truth for live/draft/scheduled posts.
   Deleted is intentionally local-only: the Blogger post is permanently removed and
   a D1 snapshot is kept so the admin can review, edit/repost, or permanently purge it. */
const AUDITION_SYNC_VERSION=157;
const AUDITION_BACKFILL_PAGES_PER_LOAD=12;
const AUDITION_INCREMENTAL_PAGES_PER_STATUS=12;
const AUDITION_INCREMENTAL_LOOKBACK_MS=31*24*60*60*1000;
const AUDITION_SYNC_OVERLAP_MS=24*60*60*1000;
const AUDITION_D1_BATCH=50;

const auditionEpoch=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:0;};
const maxIso=(a='',b='')=>auditionEpoch(b)>auditionEpoch(a)?String(b||''):String(a||'');

async function auditionD1Batch(env,statements=[]){
  for(let i=0;i<statements.length;i+=AUDITION_D1_BATCH)await env.DB.batch(statements.slice(i,i+AUDITION_D1_BATCH));
}

async function auditionSettings(env){
  const settings=await getApiSettings(env),blogId=String(settings.bloggerBlogId||'').trim();
  if(!settings.bloggerRefreshToken||!blogId)throw new Error('SEO is not connected. Open Settings → Integrations → SEO and connect SEO first.');
  return {settings,blogId,blogName:String(settings.bloggerBlogName||'')};
}

async function readAuditionSyncState(env,blogId){
  return env.DB.prepare(`SELECT blog_id,blog_name,initial_sync_complete,live_complete,draft_complete,scheduled_complete,live_page_token,draft_page_token,scheduled_page_token,last_remote_updated_at,last_synced_at,cached_count,sync_version,sync_generation
    FROM audition_sync_state WHERE blog_id=? LIMIT 1`).bind(blogId).first().catch(()=>null);
}

async function writeAuditionSyncState(env,blogId,values={}){
  const old=await readAuditionSyncState(env,blogId)||{};
  const next={
    blog_name:String(values.blog_name??old.blog_name??''),
    initial_sync_complete:Number(values.initial_sync_complete??old.initial_sync_complete??0)?1:0,
    live_complete:Number(values.live_complete??old.live_complete??0)?1:0,
    draft_complete:Number(values.draft_complete??old.draft_complete??0)?1:0,
    scheduled_complete:Number(values.scheduled_complete??old.scheduled_complete??0)?1:0,
    live_page_token:String(values.live_page_token??old.live_page_token??''),
    draft_page_token:String(values.draft_page_token??old.draft_page_token??''),
    scheduled_page_token:String(values.scheduled_page_token??old.scheduled_page_token??''),
    last_remote_updated_at:String(values.last_remote_updated_at??old.last_remote_updated_at??''),
    cached_count:Number(values.cached_count??old.cached_count??0)||0,
    sync_version:Number(values.sync_version??old.sync_version??0)||0,
    sync_generation:Number(values.sync_generation??old.sync_generation??0)||0
  };
  await env.DB.prepare(`INSERT INTO audition_sync_state(blog_id,blog_name,initial_sync_complete,live_complete,draft_complete,scheduled_complete,live_page_token,draft_page_token,scheduled_page_token,last_remote_updated_at,last_synced_at,cached_count,sync_version,sync_generation)
    VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?)
    ON CONFLICT(blog_id) DO UPDATE SET blog_name=excluded.blog_name,initial_sync_complete=excluded.initial_sync_complete,live_complete=excluded.live_complete,draft_complete=excluded.draft_complete,scheduled_complete=excluded.scheduled_complete,live_page_token=excluded.live_page_token,draft_page_token=excluded.draft_page_token,scheduled_page_token=excluded.scheduled_page_token,last_remote_updated_at=excluded.last_remote_updated_at,last_synced_at=CURRENT_TIMESTAMP,cached_count=excluded.cached_count,sync_version=excluded.sync_version,sync_generation=excluded.sync_generation`)
    .bind(blogId,next.blog_name,next.initial_sync_complete,next.live_complete,next.draft_complete,next.scheduled_complete,next.live_page_token,next.draft_page_token,next.scheduled_page_token,next.last_remote_updated_at,next.cached_count,next.sync_version,next.sync_generation).run();
  return next;
}

async function prepareV157FullSync(env,blogId,blogName,state){
  if(Number(state?.sync_version||0)>=AUDITION_SYNC_VERSION)return state||{};
  const generation=Math.max(1,Number(state?.sync_generation||0)+1);
  return writeAuditionSyncState(env,blogId,{
    blog_name:blogName,initial_sync_complete:0,
    live_complete:0,draft_complete:0,scheduled_complete:0,
    live_page_token:'',draft_page_token:'',scheduled_page_token:'',
    last_remote_updated_at:'',sync_version:AUDITION_SYNC_VERSION,sync_generation:generation
  });
}

export async function loadAuditionPostCache(env,blogId='',{includeBodies=false}={}){
  if(!blogId){const x=await auditionSettings(env);blogId=x.blogId;}
  const q=await env.DB.prepare(`SELECT row_json FROM audition_post_cache WHERE blog_id=? ORDER BY updated_at_remote DESC,post_id DESC`).bind(blogId).all().catch(()=>({results:[]}));
  const out=[];
  for(const r of q.results||[]){
    try{
      const p=JSON.parse(String(r.row_json||'{}'));
      if(!p?.id)continue;
      // The Auditions grid needs metadata, not thousands of article bodies. Keep the
      // complete body in D1 and retrieve it only when the admin opens Edit by post ID.
      if(!includeBodies){delete p.body_html;delete p.body_text;}
      out.push(p);
    }catch{}
  }
  return out;
}

export async function getCachedAuditionPostById(env,postId,blogId=''){
  if(!blogId){const x=await auditionSettings(env);blogId=x.blogId;}
  const r=await env.DB.prepare('SELECT row_json FROM audition_post_cache WHERE blog_id=? AND post_id=? LIMIT 1').bind(String(blogId),String(postId||'')).first().catch(()=>null);
  if(!r?.row_json)return null;
  try{return JSON.parse(String(r.row_json));}catch{return null;}
}

export async function upsertAuditionPostCache(env,blogId,posts=[],opts={}){
  const generation=Number(opts.generation||0)||0,stmts=[];
  for(const p of posts||[]){
    if(!p?.id)continue;
    const safe={...p};
    stmts.push(env.DB.prepare(`INSERT INTO audition_post_cache(blog_id,post_id,remote_status,status,title,slug,updated_at_remote,published_at_remote,row_json,last_seen_at,sync_generation)
      VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)
      ON CONFLICT(blog_id,post_id) DO UPDATE SET remote_status=excluded.remote_status,status=excluded.status,title=excluded.title,slug=excluded.slug,updated_at_remote=excluded.updated_at_remote,published_at_remote=excluded.published_at_remote,row_json=excluded.row_json,last_seen_at=CURRENT_TIMESTAMP,sync_generation=CASE WHEN excluded.sync_generation>0 THEN excluded.sync_generation ELSE audition_post_cache.sync_generation END`)
      .bind(String(blogId),String(p.id),String(p.remote_status||''),String(p.status||''),String(p.title||''),String(p.slug||''),String(p.blogger_updated_at||p.updated_at||''),String(p.published_at||p.scheduled_at||p.created_at||''),JSON.stringify(safe),generation));
  }
  if(stmts.length)await auditionD1Batch(env,stmts);
  return stmts.length;
}

export async function saveDeletedAuditionSnapshot(env,post,{blogId=''}={}){
  if(!blogId){const x=await auditionSettings(env);blogId=x.blogId;}
  const now=new Date().toISOString();
  const safe={...post,id:String(post?.id||post?.blogger_post_id||''),blogger_post_id:String(post?.id||post?.blogger_post_id||''),blogger_post_url:'',status:'deleted',remote_status:'deleted',is_deleted:1,deleted_at:now,updated_at:now};
  if(!safe.id)throw new Error('Fitness Tip ID is required.');
  await upsertAuditionPostCache(env,blogId,[safe]);
  return safe;
}

export async function purgeAuditionCachePost(env,postId,{blogId=''}={}){
  if(!blogId){const x=await auditionSettings(env);blogId=x.blogId;}
  await env.DB.prepare('DELETE FROM audition_post_cache WHERE blog_id=? AND post_id=?').bind(String(blogId),String(postId||'')).run();
  const count=await auditionCacheCount(env,blogId);
  await writeAuditionSyncState(env,blogId,{cached_count:count});
  return {ok:true,cached_count:count};
}

async function auditionCacheCount(env,blogId){
  const r=await env.DB.prepare('SELECT COUNT(*) count FROM audition_post_cache WHERE blog_id=?').bind(blogId).first().catch(()=>({count:0}));
  return Number(r?.count||0)||0;
}

async function prunePreviousRemoteGeneration(env,blogId,generation){
  // A V15.7 full scan is authoritative for Blogger rows. Local Deleted snapshots are
  // excluded because their corresponding Blogger resources were intentionally removed.
  await env.DB.prepare("DELETE FROM audition_post_cache WHERE blog_id=? AND status<>'deleted' AND sync_generation<>?").bind(blogId,Number(generation||0)).run();
}

async function backfillAuditionCache(env,{blogId,blogName,state}){
  const flags={live:Number(state?.live_complete||0)===1,draft:Number(state?.draft_complete||0)===1,scheduled:Number(state?.scheduled_complete||0)===1};
  const tokens={live:String(state?.live_page_token||''),draft:String(state?.draft_page_token||''),scheduled:String(state?.scheduled_page_token||'')};
  const generation=Math.max(1,Number(state?.sync_generation||1));
  let latest=String(state?.last_remote_updated_at||''),fetched=0,pages=0;
  for(const status of ['live','draft','scheduled']){
    if(flags[status])continue;
    let token=tokens[status],statusPages=0;
    do{
      const data=await listBloggerPosts(env,blogId,{maxResults:50,pageToken:token,status,orderBy:'updated',fetchBodies:true,fetchImages:true});
      const decorated=(data.items||[]).map(p=>decorateSeoPost(p,status));
      if(decorated.length){await upsertAuditionPostCache(env,blogId,decorated,{generation});fetched+=decorated.length;for(const p of decorated)latest=maxIso(latest,p.blogger_updated_at||p.updated_at);}
      token=String(data.nextPageToken||'');tokens[status]=token;flags[status]=!token;statusPages++;pages++;
      await writeAuditionSyncState(env,blogId,{
        blog_name:blogName,initial_sync_complete:0,
        live_complete:flags.live?1:0,draft_complete:flags.draft?1:0,scheduled_complete:flags.scheduled?1:0,
        live_page_token:tokens.live,draft_page_token:tokens.draft,scheduled_page_token:tokens.scheduled,
        last_remote_updated_at:latest,sync_version:AUDITION_SYNC_VERSION,sync_generation:generation
      });
      if(token&&statusPages>=AUDITION_BACKFILL_PAGES_PER_LOAD)break;
    }while(token);
  }
  const initialComplete=flags.live&&flags.draft&&flags.scheduled;
  if(initialComplete)await prunePreviousRemoteGeneration(env,blogId,generation);
  const count=await auditionCacheCount(env,blogId);
  await writeAuditionSyncState(env,blogId,{
    blog_name:blogName,initial_sync_complete:initialComplete?1:0,
    live_complete:flags.live?1:0,draft_complete:flags.draft?1:0,scheduled_complete:flags.scheduled?1:0,
    live_page_token:tokens.live,draft_page_token:tokens.draft,scheduled_page_token:tokens.scheduled,
    last_remote_updated_at:latest,cached_count:count,sync_version:AUDITION_SYNC_VERSION,sync_generation:generation
  });
  return {mode:'backfill',fetched_count:fetched,changed_count:fetched,pages,initial_sync_complete:initialComplete,cached_count:count,sync_version:AUDITION_SYNC_VERSION};
}

async function incrementalAuditionSync(env,{blogId,blogName,state,cached}){
  const byId=new Map((cached||[]).filter(p=>String(p.status||'')!=='deleted').map(p=>[String(p.id||''),p]));
  const now=Date.now(),last=auditionEpoch(state?.last_remote_updated_at||'');
  const cutoff=Math.max(now-AUDITION_INCREMENTAL_LOOKBACK_MS,last?last-AUDITION_SYNC_OVERLAP_MS:0);
  let latest=String(state?.last_remote_updated_at||''),metadataChecked=0,pages=0,truncated=false;
  const changed=new Map();
  for(const status of ['live','draft','scheduled']){
    let token='',statusPages=0,reachedOld=false;
    do{
      const data=await listBloggerPosts(env,blogId,{maxResults:50,pageToken:token,status,orderBy:'updated',fetchBodies:false,fetchImages:false});
      const batch=data.items||[];metadataChecked+=batch.length;pages++;statusPages++;
      for(const meta of batch){
        const updated=String(meta.updated||meta.published||''),stamp=auditionEpoch(updated);latest=maxIso(latest,updated);
        if(stamp&&stamp<cutoff){reachedOld=true;continue;}
        const old=byId.get(String(meta.id||''));
        if(!old||String(old.blogger_updated_at||old.updated_at||'')!==updated||String(old.remote_status||'')!==status)changed.set(String(meta.id||''),status);
      }
      token=String(data.nextPageToken||'');
      if(reachedOld||!token)break;
      if(statusPages>=AUDITION_INCREMENTAL_PAGES_PER_STATUS){truncated=!!token;break;}
    }while(token);
  }
  const refreshed=[];
  for(const [postId,status] of changed){
    try{const remote=await getBloggerPost(env,blogId,postId);refreshed.push(decorateSeoPost(remote,remote.status||status));}
    catch(e){if(!/not found|404/i.test(String(e?.message||'')))throw e;}
  }
  if(refreshed.length)await upsertAuditionPostCache(env,blogId,refreshed,{generation:Number(state?.sync_generation||0)});
  const count=await auditionCacheCount(env,blogId);
  await writeAuditionSyncState(env,blogId,{blog_name:blogName,initial_sync_complete:1,live_complete:1,draft_complete:1,scheduled_complete:1,live_page_token:'',draft_page_token:'',scheduled_page_token:'',last_remote_updated_at:latest,cached_count:count,sync_version:AUDITION_SYNC_VERSION,sync_generation:Number(state?.sync_generation||0)});
  return {mode:'incremental',fetched_count:refreshed.length,changed_count:refreshed.length,metadata_checked:metadataChecked,pages,truncated,cached_count:count,initial_sync_complete:true,sync_version:AUDITION_SYNC_VERSION};
}

export async function loadAdminAuditionPosts(env){
  const {blogId,blogName}=await auditionSettings(env);
  let cached=await loadAuditionPostCache(env,blogId),state=await readAuditionSyncState(env,blogId);
  state=await prepareV157FullSync(env,blogId,blogName,state||{});
  let sync=null,warning='';
  try{
    if(Number(state?.initial_sync_complete||0)!==1)sync=await backfillAuditionCache(env,{blogId,blogName,state:state||{}});
    else sync=await incrementalAuditionSync(env,{blogId,blogName,state:state||{},cached});
    cached=await loadAuditionPostCache(env,blogId);state=await readAuditionSyncState(env,blogId);
  }catch(e){
    if(!cached.length)throw e;
    warning=`Recent SEO changes could not be checked right now: ${String(e?.message||e)}`;
  }
  cached.sort((a,b)=>auditionEpoch(b.updated_at||b.created_at)-auditionEpoch(a.updated_at||a.created_at)||String(b.id||'').localeCompare(String(a.id||'')));
  return {posts:cached,blogId,blogName,sync,state,warning,cache:true};
}

export async function cacheSeoPostById(env,postId){
  const {blogId,blogName}=await auditionSettings(env);
  const remote=await getBloggerPost(env,blogId,String(postId||''));
  const post=decorateSeoPost(remote,remote.status||'');
  const state=await readAuditionSyncState(env,blogId)||{};
  await upsertAuditionPostCache(env,blogId,[post],{generation:Number(state?.sync_generation||0)});
  const count=await auditionCacheCount(env,blogId);
  await writeAuditionSyncState(env,blogId,{blog_name:blogName,last_remote_updated_at:maxIso(String(state.last_remote_updated_at||''),post.blogger_updated_at||post.updated_at),cached_count:count,sync_version:Math.max(AUDITION_SYNC_VERSION,Number(state.sync_version||0)),sync_generation:Number(state.sync_generation||0)});
  return post;
}
