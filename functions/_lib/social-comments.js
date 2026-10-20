import { getSocialIntegrationSettings, setSetting } from './utils.js';
import { listGoogleBusinessReviews, replyGoogleBusinessReview } from './google-business.js';
import { getXUserAccessToken, getPinterestAccessToken } from './social-publishing.js';
import { getYouTubeAccessToken } from './youtube.js';
import { getLinkedInAccessToken, linkedinPublishingIdentity, linkedinOrganizationId, linkedinMemberId, linkedinActor, linkedinHeaders } from './linkedin.js';
import { bumpAdminActivity } from './admin-activity.js';

const clean=(v,n=6000)=>String(v??'').trim().slice(0,n);
const jsonObj=v=>{try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{});}catch{return{};}};
const boolInt=v=>v===true||v===1||String(v).toLowerCase()==='true'?1:0;

// Meta feed webhooks use Unix seconds for created_time while most other APIs return
// ISO strings or milliseconds. Converting seconds to milliseconds prevents 1970 dates.
const iso=v=>{
  try{
    if(v===null||v===undefined||v==='')return'';
    if(typeof v==='number'||/^\d+(?:\.\d+)?$/.test(String(v).trim())){
      let n=Number(v);if(!Number.isFinite(n)||n<=0)return'';if(n<1e12)n*=1000;
      const d=new Date(n);return Number.isNaN(d.getTime())?'':d.toISOString();
    }
    const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString();
  }catch{return'';}
};

async function remoteJson(res,label){
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok||data?.error){
    const meta=data?.error||{};
    const detail=meta?.message||data?.message||data?.error_description||data?.error||text||`${label} failed.`;
    const code=clean(meta?.code||data?.code||'',80),sub=clean(meta?.error_subcode||data?.error_subcode||'',80),type=clean(meta?.type||'',120);
    const parts=[`${label} failed (HTTP ${res.status})`,code?`Meta code ${code}`:'',sub?`subcode ${sub}`:'',type].filter(Boolean);
    let friendly=clean(detail,1200);
    if(/Facebook comment (hide|unhide)/i.test(label)&&/unknown error/i.test(friendly)){
      friendly += ` Meta did not provide a more specific reason. Refresh Facebook comments so the dashboard can re-check whether Meta reports can_hide for this exact comment. If can_hide is unavailable, confirm the Page token has the moderation/Page engagement capability and that you are acting on a visitor comment rather than the Page's own reply.`;
    }
    if(/Instagram (private reply|initial DM|comment DM)/i.test(label)){
      const n=Number(code||0),instagramLogin=/Instagram Login/i.test(label);
      if(n===3||(/does not have the capability to make this API call/i.test(friendly))){
        friendly=instagramLogin
          ? `Meta reached the Instagram account/comment but rejected the Instagram Login Private Reply request. Confirm the Instagram User access token is fresh and was granted instagram_business_basic and instagram_business_manage_comments for this professional account. The initial Private Reply uses recipient.comment_id and can be sent once within seven days.`
          : `Meta accepted the Instagram account/comment connection but rejected the Facebook Login comment-to-DM call because the app does not currently have this Private Replies capability for the request. Confirm instagram_basic, instagram_manage_comments and pages_read_engagement are granted for this Facebook Login connection. If Meta still returns code 3, configure the optional Instagram Login token on the Instagram card so the dashboard can use Meta's graph.instagram.com Private Replies route instead.`;
      }else if(res.status===403||/permission|not authorized|OAuthException/i.test(friendly)){
        friendly += instagramLogin?` Confirm instagram_business_basic and instagram_business_manage_comments are granted to the Instagram Login token.`:` Confirm instagram_basic, instagram_manage_comments and pages_read_engagement are granted for this Facebook Login connection.`;
      }
    }
    if(/Facebook (private reply to commenter|one-time DM)/i.test(label)){
      const n=Number(code||0);
      if(n===10900)friendly += ` Facebook reports that the one-time DM for this comment was already used. Only one initial private DM can be created from the same comment.`;
      else if(n===10903)friendly=`This user can't reply to this activity. Meta rejected this comment/activity for a one-time DM. This can happen when the person's privacy settings block private replies, when the commenter is another Page, or when Meta no longer considers the activity eligible. This is a Meta recipient/activity restriction, not a website authentication failure.`;
      else if(n===10904)friendly += ` Facebook Page messaging is disabled for this Page. Enable messaging in the Page settings and try again.`;
      else {
        if(res.status===403||/permission|not authorized|OAuthException/i.test(friendly))friendly += ` Confirm the Page token has pages_messaging and the Page messaging task/Advanced Access required for real users.`;
        if(res.status===400&&/already|private repl|outside|window|eligible|allowed/i.test(friendly))friendly += ` Meta rejected this specific comment for the one-time DM. Confirm the comment belongs to this Page, the one-time DM has not already been used, and the comment is still inside Meta's eligibility window.`;
      }
    }
    const shortKnownFacebookDm=/Facebook (private reply to commenter|one-time DM)/i.test(label)&&Number(code||0)===10903;
    const e=new Error(shortKnownFacebookDm?friendly:`${parts.join(', ')}: ${friendly}`);
    e.httpStatus=Number(res.status||0)||0;e.upstreamCode=code;e.upstreamSubcode=sub;e.upstreamType=type;e.upstreamMessage=friendly;e.upstreamPayload=data;throw e;
  }
  return data;
}

function genericPostTitle(v=''){return !clean(v,500)||/^(social|facebook|instagram|threads|youtube|x|linkedin) post$/i.test(clean(v,500));}
function genericUserName(v=''){return !clean(v,500)||/^(facebook|instagram|threads|youtube|linkedin|x) user$/i.test(clean(v,500));}

async function publishedMeta(env,platform,externalPostId=''){
  const id=clean(externalPostId,600);if(!id)return null;
  const tail=id.includes('_')?id.split('_').pop():id;
  const r=await env.DB.prepare(`SELECT * FROM social_publish_log
    WHERE platform=? AND status='published' AND external_id<>''
      AND (external_id=? OR external_id=? OR external_id LIKE ? OR ? LIKE '%_' || external_id)
    ORDER BY CASE WHEN external_id=? THEN 0 WHEN external_id=? THEN 1 ELSE 2 END,updated_at DESC LIMIT 1`)
    .bind(platform,id,tail,`%_${tail}`,id,id,tail).first().catch(()=>null);
  if(!r)return null;const d=jsonObj(r.details_json);
  return {articleUrl:clean(r.article_url,2000),externalUrl:clean(d.externalUrl||d.permalink||'',2000),title:clean(d.title||'',500),image:clean(d.cover||'',2000),publishedAt:iso(d.publishedAt||r.created_at||r.updated_at),externalId:clean(r.external_id,600)};
}

export async function upsertSocialComment(env,row={}){
  const platform=clean(row.platform,40).toLowerCase(),externalId=clean(row.external_comment_id||row.externalCommentId,600);if(!platform||!externalId)return;
  const existing=await env.DB.prepare('SELECT * FROM social_comments WHERE platform=? AND external_comment_id=? LIMIT 1').bind(platform,externalId).first().catch(()=>null);
  const forceIdentity=!!row.forceIdentity;
  const remoteState=clean(row.remote_state||row.remoteState,160),incomingWorkflow=clean(row.workflow_status||row.workflowStatus,40)||(/^(replied|responded)$/i.test(remoteState)?'responded':'new');
  const incomingName=clean(row.commenter_name||row.commenterName,500),incomingId=clean(row.commenter_id||row.commenterId,600),incomingUsername=clean(row.commenter_username||row.commenterUsername,300),incomingProfile=clean(row.commenter_profile_url||row.commenterProfileUrl,2000);
  const commenterId=forceIdentity?(incomingId||clean(existing?.commenter_id,600)):(clean(existing?.commenter_id,600)||incomingId);
  const commenterName=forceIdentity?(incomingName||clean(existing?.commenter_name,500)):(genericUserName(existing?.commenter_name)?(incomingName||clean(existing?.commenter_name,500)):clean(existing?.commenter_name,500)||incomingName);
  const commenterUsername=forceIdentity?(incomingUsername||clean(existing?.commenter_username,300)):(clean(existing?.commenter_username,300)||incomingUsername);
  const commenterProfile=forceIdentity?(incomingProfile||clean(existing?.commenter_profile_url,2000)):(clean(existing?.commenter_profile_url,2000)||incomingProfile);
  const incomingPostTitle=clean(row.post_title||row.postTitle,500),postTitle=genericPostTitle(existing?.post_title)?(incomingPostTitle||clean(existing?.post_title,500)):clean(existing?.post_title,500)||incomingPostTitle;
  const postUrl=clean(row.post_url||row.postUrl,2000)||clean(existing?.post_url,2000),postImage=clean(row.post_image||row.postImage,2000)||clean(existing?.post_image,2000),postPublishedAt=iso(row.post_published_at||row.postPublishedAt)||clean(existing?.post_published_at,100);
  const remoteCreatedAt=iso(row.remote_created_at||row.remoteCreatedAt)||clean(existing?.remote_created_at,100);
  const parentId=clean(row.parent_comment_id||row.parentCommentId,600)||clean(existing?.parent_comment_id,600);
  const raw=row.raw_json||row.raw||jsonObj(existing?.raw_json);
  const workflow=['new','in_progress','responded','resolved'].includes(incomingWorkflow)?incomingWorkflow:'new';
  const liked=row.remote_liked===undefined&&row.remoteLiked===undefined?Number(existing?.remote_liked||0):boolInt(row.remote_liked??row.remoteLiked);
  const hidden=row.remote_hidden===undefined&&row.remoteHidden===undefined?Number(existing?.remote_hidden||0):boolInt(row.remote_hidden??row.remoteHidden);
  const deleted=row.remote_deleted===undefined&&row.remoteDeleted===undefined?Number(existing?.remote_deleted||0):boolInt(row.remote_deleted??row.remoteDeleted);
  const values=[platform,externalId,clean(row.external_post_id||row.externalPostId,600)||clean(existing?.external_post_id,600),postTitle,postUrl,postImage,postPublishedAt,parentId,commenterId,commenterName,commenterUsername,commenterProfile,clean(row.comment_text||row.commentText,6000)||clean(existing?.comment_text,6000),remoteCreatedAt,workflow,remoteState||clean(existing?.remote_state,160),liked,hidden,deleted,JSON.stringify(raw||{})];
  await env.DB.prepare(`INSERT INTO social_comments(platform,external_comment_id,external_post_id,post_title,post_url,post_image,post_published_at,parent_comment_id,commenter_id,commenter_name,commenter_username,commenter_profile_url,comment_text,remote_created_at,workflow_status,remote_state,remote_liked,remote_hidden,remote_deleted,raw_json,last_synced_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(platform,external_comment_id) DO UPDATE SET external_post_id=excluded.external_post_id,post_title=excluded.post_title,post_url=excluded.post_url,post_image=excluded.post_image,post_published_at=CASE WHEN excluded.post_published_at<>'' THEN excluded.post_published_at ELSE social_comments.post_published_at END,parent_comment_id=CASE WHEN excluded.parent_comment_id<>'' THEN excluded.parent_comment_id ELSE social_comments.parent_comment_id END,commenter_id=excluded.commenter_id,commenter_name=excluded.commenter_name,commenter_username=excluded.commenter_username,commenter_profile_url=excluded.commenter_profile_url,comment_text=excluded.comment_text,remote_created_at=CASE WHEN excluded.remote_created_at<>'' THEN excluded.remote_created_at ELSE social_comments.remote_created_at END,workflow_status=CASE WHEN excluded.workflow_status='responded' AND social_comments.workflow_status IN ('new','in_progress') THEN 'responded' ELSE social_comments.workflow_status END,remote_state=excluded.remote_state,remote_liked=excluded.remote_liked,remote_hidden=excluded.remote_hidden,remote_deleted=excluded.remote_deleted,raw_json=excluded.raw_json,last_synced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`)
    .bind(...values).run();
  if(!existing)await bumpAdminActivity(env,'comments').catch(()=>{});
  if(!existing&&Date.now()-Date.parse(remoteCreatedAt||'')<10*60000&&Date.parse(remoteCreatedAt||'')<=Date.now()+60000){try{const push=await import('./notifications-v1-58.js');await push.enqueueNotification(env,{role:'admin',event:'new_comment',eventKey:`comment:${platform}:${externalId}`,title:'New Social Comment',body:'A new comment is ready to review.',url:'/admin/?open=comments&platform='+encodeURIComponent(platform)});}catch{}}
  // V16.63: non-Meta platforms do not all have webhook delivery. When a newly
  // synchronized comment is genuinely recent, run its automation once. Older
  // history is deliberately not auto-replied to during an initial sync.
  if(!existing&&!['facebook','instagram'].includes(platform)){const t=Date.parse(remoteCreatedAt||'');const recent=Number.isFinite(t)&&Math.abs(Date.now()-t)<=10*60*1000,commentText=clean(row.comment_text||row.commentText,6000);if(recent&&commentText)await runCommentAutomation(env,{platform,externalCommentId:externalId,commenterId,text:commentText,commenterName,commenterUsername}).catch(()=>{});}
}

async function recentPublished(env,platform,limit=10){
  const {results}=await env.DB.prepare("SELECT * FROM social_publish_log WHERE platform=? AND status='published' AND external_id<>'' ORDER BY updated_at DESC LIMIT ?").bind(platform,Math.max(1,Math.min(30,Number(limit)||10))).all().catch(()=>({results:[]}));
  return (results||[]).map(r=>{const d=jsonObj(r.details_json);return {...r,postTitle:clean(d.title||'Dance Class Update',500),postUrl:clean(d.externalUrl||d.permalink||'',2000),postImage:clean(d.cover||'',2000),postPublishedAt:iso(d.publishedAt||r.created_at||r.updated_at)};});
}

function graphVersion(c){return /^v\d+\.\d+$/.test(String(c?.graphVersion||''))?c.graphVersion:'v26.0';}
function isOwnFacebookComment(c,x={}){return !!c.pageId&&String(x?.from?.id||x?.sender_id||'')===String(c.pageId);}
function isOwnInstagramComment(c,x={}){const id=String(x?.from?.id||x?.user?.id||''),user=String(x?.username||x?.from?.username||'').replace(/^@/,'').toLowerCase(),own=String(c?.username||'').replace(/^@/,'').toLowerCase();return (!!c.instagramBusinessId&&id===String(c.instagramBusinessId))||!!(own&&user&&own===user);}

export async function pruneLegacyDmCommentRows(env){
  await env.DB.prepare("DELETE FROM social_comments WHERE external_post_id='direct_message' OR external_comment_id LIKE 'dm:%'").run().catch(()=>{});
}

export async function pruneOwnPlatformRows(env,platform,settings=null){
  const s=settings||await getSocialIntegrationSettings(env);
  if(platform==='facebook'&&s.facebook?.pageId){
    const id=String(s.facebook.pageId);await env.DB.prepare("DELETE FROM social_comments WHERE platform='facebook' AND (commenter_id=? OR raw_json LIKE ? OR raw_json LIKE ?)").bind(id,`%\"sender_id\":\"${id}\"%`,`%\"from\":{\"id\":\"${id}\"%`).run().catch(()=>{});
  }
  if(platform==='instagram'&&s.instagram?.instagramBusinessId){
    const id=String(s.instagram.instagramBusinessId);await env.DB.prepare("DELETE FROM social_comments WHERE platform='instagram' AND commenter_id=?").bind(id).run().catch(()=>{});
  }
}

function facebookPostPermalink(pageId,externalId){
  const id=clean(externalId,600),page=clean(pageId,300);if(!id)return'';
  const parts=id.split('_');if(parts.length>=2&&page)return `https://www.facebook.com/${encodeURIComponent(page)}/posts/${encodeURIComponent(parts.slice(1).join('_'))}`;
  return `https://www.facebook.com/${encodeURIComponent(id)}`;
}
async function fetchFacebookPostById(c,postId){
  const id=clean(postId,600);if(!id||!c.pageAccessToken)return null;
  const get=async(fields)=>{const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(id)}`);u.searchParams.set('fields',fields);u.searchParams.set('access_token',c.pageAccessToken);return remoteJson(await fetch(u),'Facebook post details');};
  let d;
  try{d=await get('id,message,created_time,permalink_url,full_picture');}
  catch(e){
    // full_picture is not available for every Post shape. Retry using only stable,
    // non-deprecated fields. Do not request the deprecated attachments aggregate.
    if(Number(e.httpStatus||0)!==400)throw e;
    d=await get('id,message,created_time,permalink_url');
  }
  const message=clean(d?.message||'',4000),title=message.split(/\r?\n/).map(x=>x.trim()).find(Boolean)||'';
  return {title:clean(title,500),postUrl:clean(d?.permalink_url,2000),postImage:clean(d?.full_picture,2000),postPublishedAt:iso(d?.created_time)};
}
async function fetchFacebookPost(c,p){
  const local={title:p.postTitle||'Facebook post',postUrl:facebookPostPermalink(c.pageId,p.external_id)||p.article_url,postImage:p.postImage||'',postPublishedAt:p.postPublishedAt||''};
  try{
    const remote=await fetchFacebookPostById(c,p.external_id);
    return {title:remote?.title||local.title,postUrl:remote?.postUrl||local.postUrl,postImage:remote?.postImage||local.postImage,postPublishedAt:remote?.postPublishedAt||local.postPublishedAt};
  }catch{return local;}
}
async function backfillGenericFacebookPosts(env,c){
  const {results}=await env.DB.prepare(`SELECT id,external_post_id,post_title,post_url,post_image,post_published_at FROM social_comments
    WHERE platform='facebook' AND remote_deleted=0 AND external_post_id<>''
      AND (COALESCE(post_title,'')='' OR lower(post_title) IN ('facebook post','social post') OR COALESCE(post_image,'')='')
    ORDER BY updated_at DESC LIMIT 40`).all().catch(()=>({results:[]}));
  const cache=new Map();
  for(const row of results||[]){
    const postId=clean(row.external_post_id,600);if(!postId)continue;
    const local=await publishedMeta(env,'facebook',postId).catch(()=>null);
    if(!cache.has(postId))cache.set(postId,fetchFacebookPostById(c,postId).catch(()=>null));
    const remote=await cache.get(postId);
    const title=clean(local?.title||remote?.title||row.post_title||'Facebook post',500);
    const image=clean(local?.image||remote?.postImage||row.post_image||'',2000);
    const url=clean(remote?.postUrl||facebookPostPermalink(c.pageId,postId)||row.post_url||'',2000);
    const publishedAt=iso(local?.publishedAt||remote?.postPublishedAt||row.post_published_at)||clean(row.post_published_at,100);
    if(title!==row.post_title||image!==row.post_image||url!==row.post_url||publishedAt!==row.post_published_at){
      await env.DB.prepare('UPDATE social_comments SET post_title=?,post_url=?,post_image=?,post_published_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(title,url,image,publishedAt,Number(row.id)).run().catch(()=>{});
    }
  }
}
async function facebookCommentsForPost(c,postId){
  const make=fields=>{const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(postId)}/comments`);u.searchParams.set('fields',fields);u.searchParams.set('filter','stream');u.searchParams.set('limit','100');u.searchParams.set('access_token',c.pageAccessToken);return u;};
  const rich='id,message,created_time,from{id,name},permalink_url,is_hidden,user_likes,can_comment,can_like,can_hide,can_remove,can_reply_privately,parent{id},comment_count';
  try{return await remoteJson(await fetch(make(rich)),'Facebook comments');}
  catch(e){
    // Older/permission-limited Graph surfaces can reject one optional field. Fall
    // back to core fields rather than losing the entire comment inbox.
    if(Number(e.httpStatus||0)===400&&String(e.upstreamCode||'')==='100')return remoteJson(await fetch(make('id,message,created_time,from{id,name},permalink_url,is_hidden,parent{id}')),'Facebook comments');
    throw e;
  }
}

async function facebookRepliesForComment(c,commentId){
  const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(commentId)}/comments`);
  u.searchParams.set('fields','id,message,created_time,from{id,name},permalink_url,is_hidden,user_likes,can_comment,can_like,can_hide,can_remove,can_reply_privately,parent{id},comment_count');
  u.searchParams.set('limit','100');u.searchParams.set('access_token',c.pageAccessToken);
  try{return await remoteJson(await fetch(u),'Facebook comment replies');}
  catch(e){
    if(Number(e.httpStatus||0)===400&&String(e.upstreamCode||'')==='100'){
      const f=new URL(u);f.searchParams.set('fields','id,message,created_time,from{id,name},permalink_url,is_hidden,parent{id}');
      return remoteJson(await fetch(f),'Facebook comment replies');
    }
    throw e;
  }
}
async function syncFacebook(env,c){
  if(!c.pageAccessToken)throw new Error('Facebook comments need the saved Page Access Token.');
  await pruneOwnPlatformRows(env,'facebook',{facebook:c});
  let count=0,successPosts=0;const failures=[];
  const attachOwnReply=async(parentId,x)=>{
    if(!parentId)return;
    await env.DB.prepare("UPDATE social_comments SET admin_reply_text=?,admin_reply_at=?,admin_reply_author=?,admin_reply_external_id=?,admin_reply_mode='nested',workflow_status=CASE WHEN workflow_status IN ('new','in_progress') THEN 'responded' ELSE workflow_status END,updated_at=CURRENT_TIMESTAMP WHERE platform='facebook' AND external_comment_id=?")
      .bind(clean(x.message,6000),iso(x.created_time),clean(c.pageName||'DropBeat Dance Studio',300),clean(x.id,600),clean(parentId,600)).run().catch(()=>{});
    await env.DB.prepare("DELETE FROM social_comments WHERE platform='facebook' AND external_comment_id=?").bind(clean(x.id,600)).run().catch(()=>{});
  };
  const storeVisitor=async(x,p,meta,parentOverride='')=>{
    const from=x.from||{};
    await upsertSocialComment(env,{platform:'facebook',externalCommentId:x.id,externalPostId:p.external_id,postTitle:meta.title,postUrl:meta.postUrl,postImage:meta.postImage,postPublishedAt:meta.postPublishedAt,parentCommentId:parentOverride||x.parent?.id||'',commenterId:from.id||'',commenterName:from.name||'Facebook user',commenterProfileUrl:from.id?`https://www.facebook.com/${encodeURIComponent(from.id)}`:'',commentText:x.message||'',remoteCreatedAt:x.created_time,remoteState:x.is_hidden?'hidden':'',remoteLiked:x.user_likes===undefined?undefined:!!x.user_likes,remoteHidden:x.is_hidden===undefined?undefined:!!x.is_hidden,raw:x,forceIdentity:true});count++;
  };
  for(const p of await recentPublished(env,'facebook',20)){
    try{
      const meta=await fetchFacebookPost(c,p),data=await facebookCommentsForPost(c,p.external_id);successPosts++;
      for(const x of data.data||[]){
        const parent=clean(x.parent?.id||'',600);
        if(isOwnFacebookComment(c,x)){await attachOwnReply(parent,x);continue;}
        await storeVisitor(x,p,meta,parent);
        // Facebook's post-level stream does not consistently return every nested
        // reply. When replies exist, read the selected comment thread explicitly.
        if(Number(x.comment_count||0)>0&&!parent){
          try{
            const replies=await facebookRepliesForComment(c,x.id);
            for(const y of replies.data||[]){
              if(isOwnFacebookComment(c,y)){await attachOwnReply(clean(y.parent?.id||x.id,600),y);continue;}
              await storeVisitor(y,p,meta,clean(y.parent?.id||x.id,600));
            }
          }catch(replyErr){
            // A thread-detail failure must not erase the already-synchronized root
            // comment. Only authentication/permission failures are promoted later.
            failures.push(replyErr);
          }
        }
      }
    }catch(e){failures.push(e);}
  }
  // Old/deleted Page objects and deprecated decorative post fields are not an
  // admin-actionable synchronization error. Current comments remain usable.
  const staleObject=e=>{
    const code=String(e?.upstreamCode||''),m=String(e?.upstreamMessage||e?.message||'').toLowerCase();
    return (code==='100'&&(m.includes('object does not exist')||m.includes('cannot be loaded')||m.includes('unsupported get request')||m.includes('page public content access')||m.includes('page public metadata access')))
      ||code==='12'||m.includes('deprecate_post_aggregated_fields_for_attach');
  };
  const hardFailures=failures.filter(e=>!staleObject(e));
  if(hardFailures.length)throw hardFailures[0];
  if(!successPosts&&failures.length&&!failures.every(staleObject))throw failures[0];
  // Webhook rows can arrive before a publish-log match is available. Repair those
  // Post cards after synchronization from the local publish record and safe Graph fields.
  await backfillGenericFacebookPosts(env,c).catch(()=>{});
  return {synced:count,skippedPosts:failures.length,warning:''};
}
async function instagramRecentMedia(c,limit=25){
  const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(c.instagramBusinessId)}/media`);u.searchParams.set('fields','id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count');u.searchParams.set('limit',String(Math.max(1,Math.min(50,Number(limit)||25))));u.searchParams.set('access_token',c.pageAccessToken);
  const data=await remoteJson(await fetch(u),'Instagram recent media');return Array.isArray(data?.data)?data.data:[];
}
function instagramMediaTitle(media={},local=null){
  if(local?.title)return local.title;const caption=clean(media?.caption||'',4000);const first=caption.split(/\r?\n/).map(x=>x.trim()).find(Boolean);return clean(first||'Instagram post',500);
}
async function instagramCommentReplies(c,commentId){
  const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(commentId)}/replies`);u.searchParams.set('fields','id,text,timestamp,username,from{id,username},hidden,parent_id');u.searchParams.set('limit','100');u.searchParams.set('access_token',c.pageAccessToken);
  return remoteJson(await fetch(u),'Instagram comment replies');
}

async function syncInstagram(env,c){
  if(!c.pageAccessToken||!c.instagramBusinessId)throw new Error('Instagram comments need the saved Page Access Token and Instagram Business Account ID.');
  await pruneOwnPlatformRows(env,'instagram',{instagram:c});
  const localRows=await recentPublished(env,'instagram',30),localById=new Map();
  for(const p of localRows){const id=clean(p.external_id,600);if(id){localById.set(id,p);const tail=id.includes('_')?id.split('_').pop():id;localById.set(tail,p);}}
  const remoteMedia=await instagramRecentMedia(c,30),mediaMap=new Map();
  for(const media of remoteMedia||[])mediaMap.set(String(media.id),media);
  // Keep older website-published media in the sync set even if it fell just outside
  // Instagram's latest-media page returned in this request.
  for(const p of localRows)if(p.external_id&&!mediaMap.has(String(p.external_id)))mediaMap.set(String(p.external_id),{id:p.external_id,caption:p.postTitle,permalink:'',timestamp:p.postPublishedAt,media_url:p.postImage});
  let count=0,successMedia=0;const failures=[];
  for(const media of mediaMap.values()){
    try{
      const mediaId=clean(media.id,600);if(!mediaId)continue;const local=localById.get(mediaId)||localById.get(mediaId.includes('_')?mediaId.split('_').pop():mediaId)||await publishedMeta(env,'instagram',mediaId).catch(()=>null);
      const meta={title:instagramMediaTitle(media,local),postUrl:clean(media.permalink||'',2000)||clean(local?.articleUrl||'',2000),postImage:clean(media.media_url||media.thumbnail_url||'',2000)||clean(local?.image||'',2000),postPublishedAt:iso(media.timestamp)||clean(local?.publishedAt||'',100)};
      const u=new URL(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(mediaId)}/comments`);u.searchParams.set('fields','id,text,timestamp,username,from{id,username},hidden,parent_id');u.searchParams.set('limit','100');u.searchParams.set('access_token',c.pageAccessToken);
      const data=await remoteJson(await fetch(u),'Instagram comments');successMedia++;
      for(const x of data.data||[]){
        if(isOwnInstagramComment(c,x))continue;const user=x.username||x.from?.username||'',parent=clean(x.parent_id||'',600);
        await upsertSocialComment(env,{platform:'instagram',externalCommentId:x.id,externalPostId:mediaId,postTitle:meta.title,postUrl:meta.postUrl,postImage:meta.postImage,postPublishedAt:meta.postPublishedAt,parentCommentId:parent,commenterId:x.from?.id||'',commenterName:user||'Instagram user',commenterUsername:user,commenterProfileUrl:user?`https://www.instagram.com/${encodeURIComponent(user)}/`:'',commentText:x.text||'',remoteCreatedAt:x.timestamp,remoteHidden:x.hidden===undefined?undefined:!!x.hidden,raw:x,forceIdentity:true});count++;
        // Fetch thread replies so the Page/account's own response is attached to the
        // original visitor comment instead of echoing into New/In Progress.
        if(!parent){try{const replies=await instagramCommentReplies(c,x.id);for(const y of replies.data||[]){if(isOwnInstagramComment(c,y)){await env.DB.prepare("UPDATE social_comments SET admin_reply_text=?,admin_reply_at=?,admin_reply_author=?,admin_reply_external_id=?,workflow_status=CASE WHEN workflow_status IN ('new','in_progress') THEN 'responded' ELSE workflow_status END,updated_at=CURRENT_TIMESTAMP WHERE platform='instagram' AND external_comment_id=?").bind(clean(y.text,6000),iso(y.timestamp),clean(c.username?`@${c.username}`:'Instagram',300),clean(y.id,600),clean(x.id,600)).run().catch(()=>{});await env.DB.prepare("DELETE FROM social_comments WHERE platform='instagram' AND external_comment_id=?").bind(clean(y.id,600)).run().catch(()=>{});}else{const yu=y.username||y.from?.username||'';await upsertSocialComment(env,{platform:'instagram',externalCommentId:y.id,externalPostId:mediaId,postTitle:meta.title,postUrl:meta.postUrl,postImage:meta.postImage,postPublishedAt:meta.postPublishedAt,parentCommentId:x.id,commenterId:y.from?.id||'',commenterName:yu||'Instagram user',commenterUsername:yu,commenterProfileUrl:yu?`https://www.instagram.com/${encodeURIComponent(yu)}/`:'',commentText:y.text||'',remoteCreatedAt:y.timestamp,remoteHidden:y.hidden===undefined?undefined:!!y.hidden,raw:y,forceIdentity:true});count++;}}}catch(e){failures.push(e);}}
      }
    }catch(e){failures.push(e);}
  }
  if(!successMedia&&failures.length)throw failures[0];
  return {synced:count,mediaChecked:successMedia,warning:failures.length?`Some older Instagram media could not be synchronized, but current accessible comments were loaded.`:''};
}
async function threadsPostPermalink(c,p){
  if(p.postUrl)return p.postUrl;try{const u=new URL(`https://graph.threads.net/${encodeURIComponent(p.external_id)}`);u.searchParams.set('fields','id,permalink,timestamp');u.searchParams.set('access_token',c.accessToken);const media=await remoteJson(await fetch(u,{headers:{authorization:`Bearer ${c.accessToken}`}}),'Threads post details');return clean(media?.permalink,2000);}catch(_){return'';}
}
async function syncThreads(env,c){
  if(!c.accessToken)throw new Error('Threads comments need a connected Threads access token.');
  let count=0;for(const p of await recentPublished(env,'threads',10)){
    const postUrl=await threadsPostPermalink(c,p);
    const u=new URL(`https://graph.threads.net/${encodeURIComponent(p.external_id)}/replies`);u.searchParams.set('fields','id,text,timestamp,permalink,username,profile_picture_url,is_reply_owned_by_me,hide_status,root_post,replied_to');u.searchParams.set('reverse','false');u.searchParams.set('access_token',c.accessToken);
    const data=await remoteJson(await fetch(u),'Threads replies');
    for(const x of data.data||[]){if(x.is_reply_owned_by_me)continue;const user=clean(x.username,300);await upsertSocialComment(env,{platform:'threads',externalCommentId:x.id,externalPostId:p.external_id,postTitle:p.postTitle,postUrl,postImage:p.postImage,postPublishedAt:p.postPublishedAt,parentCommentId:x.replied_to?.id||'',commenterName:user||'Threads user',commenterUsername:user,commenterProfileUrl:user?`https://www.threads.net/@${encodeURIComponent(user)}`:'',commentText:x.text||'',remoteCreatedAt:x.timestamp,remoteState:clean(x.hide_status,120),remoteHidden:/hidden/i.test(String(x.hide_status||'')),raw:x});count++;}
  }return {synced:count,warning:''};
}
function liHeaders(c,token=c.accessToken){return linkedinHeaders(token,{...c,apiVersion:'202608'});}
async function syncLinkedIn(env,c){
  if(c.communityEnabled!==true)throw new Error('LinkedIn Community Management is not enabled on the LinkedIn card. Enable it only after LinkedIn approves the Community Management API for your app, then reconnect LinkedIn.');
  const token=await getLinkedInAccessToken(env),fresh=(await getSocialIntegrationSettings(env)).linkedin||c,identity=linkedinPublishingIdentity(fresh),selfActor=linkedinActor(fresh);
  if(!selfActor)throw new Error(identity==='organization'?'LinkedIn comment management needs the Organization ID and a connected OAuth token.':'LinkedIn comment management needs a connected member identity. Reconnect LinkedIn.');
  let count=0;for(const p of await recentPublished(env,'linkedin',10)){
    const data=await remoteJson(await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(p.external_id)}/comments`,{headers:liHeaders(fresh,token)}),'LinkedIn comments');
    for(const x of data.elements||[]){const actor=clean(x.actor,500);if(actor===selfActor)continue;await upsertSocialComment(env,{platform:'linkedin',externalCommentId:x.id||x.commentUrn,externalPostId:p.external_id,postTitle:p.postTitle,postUrl:p.postUrl||p.article_url,postImage:p.postImage,postPublishedAt:p.postPublishedAt,commenterId:actor,commenterName:actor.startsWith('urn:li:person:')?'LinkedIn member':'LinkedIn user',commentText:x.message?.text||'',remoteCreatedAt:x.created?.time?iso(Number(x.created.time)):'',raw:x});count++;}
  }return {synced:count,warning:''};
}
async function syncX(env,c){
  const token=await getXUserAccessToken(env);
  let count=0;for(const p of await recentPublished(env,'x',8)){
    const u=new URL('https://api.x.com/2/tweets/search/recent');u.searchParams.set('query',`conversation_id:${p.external_id}`);u.searchParams.set('max_results','100');u.searchParams.set('tweet.fields','author_id,created_at,conversation_id,referenced_tweets');u.searchParams.set('expansions','author_id');u.searchParams.set('user.fields','id,name,username,profile_image_url');
    const data=await remoteJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'X conversation replies');const users=new Map((data.includes?.users||[]).map(x=>[String(x.id),x]));
    for(const x of data.data||[]){if(String(x.id)===String(p.external_id)||String(x.author_id)===String(c.userId||''))continue;const user=users.get(String(x.author_id))||{},username=clean(user.username,300);await upsertSocialComment(env,{platform:'x',externalCommentId:x.id,externalPostId:p.external_id,postTitle:p.postTitle,postUrl:`https://x.com/i/web/status/${encodeURIComponent(p.external_id)}`,postImage:p.postImage,postPublishedAt:p.postPublishedAt,commenterId:x.author_id||'',commenterName:user.name||username||'X user',commenterUsername:username,commenterProfileUrl:username?`https://x.com/${encodeURIComponent(username)}`:'',commentText:x.text||'',remoteCreatedAt:x.created_at,raw:x});count++;}
  }return {synced:count,warning:''};
}
async function syncPinterest(env,c){
  const token=await getPinterestAccessToken(env);let count=0,checked=0;const failures=[];
  for(const p of await recentPublished(env,'pinterest',20)){
    try{
      const u=new URL(`https://api.pinterest.com/v5/pins/${encodeURIComponent(p.external_id)}`);u.searchParams.set('pin_metrics','true');const data=await remoteJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'Pinterest Pin engagement');checked++;
      const lm=data?.pin_metrics?.lifetime_metrics||{},comments=Number(lm.comment??0)||0,reactions=Number(lm.reaction??0)||0,pinUrl=`https://www.pinterest.com/pin/${encodeURIComponent(p.external_id)}/`,image=clean(data?.media?.images?.['600x']?.url||data?.media?.images?.originals?.url||p.postImage,2000);
      await upsertSocialComment(env,{platform:'pinterest',externalCommentId:`pin_metrics:${p.external_id}`,externalPostId:p.external_id,postTitle:clean(data?.title||p.postTitle||'Pinterest Pin',500),postUrl:pinUrl,postImage:image,postPublishedAt:iso(data?.created_at||p.postPublishedAt),commenterId:'',commenterName:'Pinterest engagement',commentText:`${comments} comment${comments===1?'':'s'} · ${reactions} reaction${reactions===1?'':'s'}`,remoteCreatedAt:iso(data?.created_at||p.postPublishedAt),raw:{kind:'pinterest_pin_metrics',pinId:p.external_id,commentCount:comments,reactionCount:reactions,pinMetrics:data?.pin_metrics||{},remote:data}});count++;
    }catch(e){failures.push(e);}
  }
  if(!checked&&failures.length)throw failures[0];return {synced:count,warning:failures.length?'Some older Pinterest Pins could not be refreshed, but accessible Pin engagement is shown.':''};
}
async function syncGoogleMaps(env){
  const data=await listGoogleBusinessReviews(env,{pageSize:100});let count=0;
  for(const x of data.reviews||[]){const name=clean(x.name||'',700),id=clean(x.reviewId||name.split('/').pop(),500),reviewer=x.reviewer||{},reply=x.reviewReply||{};await upsertSocialComment(env,{platform:'google_maps',externalCommentId:id||name,externalPostId:name,postTitle:'Google Maps Review',postUrl:'',postImage:clean(reviewer.profilePhotoUrl,2000),postPublishedAt:x.createTime||x.updateTime,commenterId:clean(reviewer.displayName,400),commenterName:reviewer.displayName||'Google reviewer',commentText:x.comment||'',remoteCreatedAt:x.createTime||x.updateTime,remoteState:reply.comment?'replied':'',adminReplyText:reply.comment||'',adminReplyAt:reply.updateTime||'',adminReplyAuthor:'Business owner',raw:x});if(reply.comment)await env.DB.prepare("UPDATE social_comments SET admin_reply_text=?,admin_reply_at=?,admin_reply_author='Business owner',workflow_status=CASE WHEN workflow_status IN ('new','in_progress') THEN 'responded' ELSE workflow_status END WHERE platform='google_maps' AND external_comment_id=?").bind(clean(reply.comment,6000),iso(reply.updateTime),id||name).run().catch(()=>{});count++;}return {synced:count,warning:''};
}

async function syncYouTube(env,c={}){
  const token=await getYouTubeAccessToken(env),channelId=clean(c.channelId,300);if(!channelId)throw new Error('Connect YouTube and run Test Connection before loading YouTube comments.');
  // V16.47: watch the whole connected channel, not only videos previously created by
  // DropBeat Dance Studio. The first baseline prevents historical comments from being imported.
  let baseline=Date.parse(c.commentSyncStartedAt||c.lastTestedAt||c.connectedAt||'')||0;
  if(!baseline){
    const social=await getSocialIntegrationSettings(env);social.youtube={...(social.youtube||{}),commentSyncStartedAt:new Date().toISOString()};await setSetting(env,'social_integration_settings',social);
    return {synced:0,warning:'YouTube comment monitoring is now active for the connected channel. Existing historical comments were not imported; new comments from this point onward will appear here.'};
  }
  const freshThreads=[];let pageToken='',pages=0,done=false;
  while(!done&&pages<6){
    const u=new URL('https://www.googleapis.com/youtube/v3/commentThreads');u.searchParams.set('part','snippet,replies');u.searchParams.set('allThreadsRelatedToChannelId',channelId);u.searchParams.set('maxResults','100');u.searchParams.set('textFormat','plainText');u.searchParams.set('order','time');if(pageToken)u.searchParams.set('pageToken',pageToken);
    const data=await remoteJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'YouTube channel comments');pages++;
    for(const thread of Array.isArray(data.items)?data.items:[]){
      const top=thread?.snippet?.topLevelComment||{},sn=top?.snippet||{},published=Date.parse(sn.publishedAt||sn.updatedAt||'')||0;
      if(published&&published<=baseline){done=true;continue;}if(top.id)freshThreads.push(thread);
    }
    pageToken=clean(data.nextPageToken,500);if(!pageToken)done=true;
  }
  const videoIds=[...new Set(freshThreads.map(t=>clean(t?.snippet?.videoId,300)).filter(Boolean))],videos=new Map();
  for(let i=0;i<videoIds.length;i+=50){
    const ids=videoIds.slice(i,i+50),u=new URL('https://www.googleapis.com/youtube/v3/videos');u.searchParams.set('part','snippet');u.searchParams.set('id',ids.join(','));u.searchParams.set('maxResults','50');
    const data=await remoteJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'YouTube video details');for(const v of Array.isArray(data.items)?data.items:[])videos.set(clean(v.id,300),v.snippet||{});
  }
  let count=0;
  for(const thread of freshThreads){
    const top=thread?.snippet?.topLevelComment||{},sn=top?.snippet||{},videoId=clean(thread?.snippet?.videoId,300),authorId=clean(sn?.authorChannelId?.value||'',300);if(!top.id||authorId===channelId)continue;
    const replies=Array.isArray(thread?.replies?.comments)?thread.replies.comments:[],ownReply=replies.find(r=>clean(r?.snippet?.authorChannelId?.value||'',300)===channelId)||null,v=videos.get(videoId)||{},thumb=clean(v?.thumbnails?.medium?.url||v?.thumbnails?.high?.url||v?.thumbnails?.default?.url||(videoId?`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`:''),2000),postUrl=videoId?`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&lc=${encodeURIComponent(top.id)}`:(sn.authorChannelUrl||'');
    await upsertSocialComment(env,{platform:'youtube',externalCommentId:top.id,externalPostId:videoId||channelId,postTitle:clean(v.title||'YouTube video',500),postUrl,postImage:thumb,postPublishedAt:iso(v.publishedAt),commenterId:authorId,commenterName:sn.authorDisplayName||'YouTube user',commenterProfileUrl:sn.authorChannelUrl||'',commentText:sn.textDisplay||sn.textOriginal||'',remoteCreatedAt:sn.publishedAt||sn.updatedAt,remoteState:sn.moderationStatus||'',raw:{kind:'youtube_comment',thread,remote:top}});
    if(ownReply?.id){const rs=ownReply.snippet||{};await env.DB.prepare("UPDATE social_comments SET admin_reply_text=?,admin_reply_at=?,admin_reply_author=?,admin_reply_external_id=?,admin_reply_mode='nested',workflow_status=CASE WHEN workflow_status IN ('new','in_progress') THEN 'responded' ELSE workflow_status END,updated_at=CURRENT_TIMESTAMP WHERE platform='youtube' AND external_comment_id=?").bind(clean(rs.textDisplay||rs.textOriginal,6000),iso(rs.publishedAt||rs.updatedAt),clean(rs.authorDisplayName||c.channelName||'YouTube channel',300),clean(ownReply.id,600),clean(top.id,600)).run().catch(()=>{});}count++;
  }
  return {synced:count,warning:pages>=6&&pageToken?'YouTube has more new comments than the current synchronization window. Refresh Comments again to continue loading recent activity.':''};
}
async function youtubeAction(env,c,row,action,text=''){
  const token=await getYouTubeAccessToken(env),id=clean(row.external_comment_id,600),replyId=clean(row.admin_reply_external_id,600);
  const h={authorization:`Bearer ${token}`,'content-type':'application/json'};
  if(action==='reply'||action==='reply_public'){
    const res=await remoteJson(await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet',{method:'POST',headers:h,body:JSON.stringify({snippet:{parentId:id,textOriginal:text}})}),'YouTube comment reply');return {id:clean(res.id,600),raw:res};
  }
  if(action==='delete_admin_reply'){if(!replyId)throw new Error('No saved YouTube admin reply is available to delete.');await remoteJson(await fetch(`https://www.googleapis.com/youtube/v3/comments?id=${encodeURIComponent(replyId)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'YouTube admin reply delete');return {deleted:true};}
  if(action==='edit_admin_reply'){if(!replyId)throw new Error('No saved YouTube admin reply is available to edit.');const res=await remoteJson(await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet',{method:'PUT',headers:h,body:JSON.stringify({id:replyId,snippet:{textOriginal:text}})}),'YouTube admin reply update');return {id:replyId,raw:res};}
  if(action==='hide'||action==='spam'||action==='unhide'){
    const moderationStatus=action==='unhide'?'published':'rejected';const u=new URL('https://www.googleapis.com/youtube/v3/comments/setModerationStatus');u.searchParams.set('id',id);u.searchParams.set('moderationStatus',moderationStatus);if(action==='spam')u.searchParams.set('banAuthor','false');await remoteJson(await fetch(u,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'YouTube comment moderation');return {moderationStatus};
  }
  if(action==='delete'){await remoteJson(await fetch(`https://www.googleapis.com/youtube/v3/comments?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'YouTube comment delete');return {deleted:true};}
  throw new Error('This YouTube comment action is not supported.');
}

export function enabledCommentPlatforms(s={}){
  const out=[{key:'website',label:'Articles',available:true}];
  if(s.facebook?.enabled)out.push({key:'facebook',label:'Facebook',available:true});
  if(s.instagram?.enabled)out.push({key:'instagram',label:'Instagram',available:true});
  if(s.threads?.enabled)out.push({key:'threads',label:'Threads',available:true});
  if(s.youtube?.enabled&&s.youtube?.connectionState==='connected')out.push({key:'youtube',label:'YouTube',available:true});
  if(s.x?.enabled)out.push({key:'x',label:'X / Twitter',available:true});
  if(s.linkedin?.enabled)out.push({key:'linkedin',label:'LinkedIn',available:true});
  if(s.pinterest?.enabled)out.push({key:'pinterest',label:'Pinterest',available:true,reason:'Pinterest shows aggregate Pin comment and reaction counts. Pinterest API v5 does not expose visitor comment text/moderation here.'});
  if(s.googleBusiness?.enabled)out.push({key:'google_maps',label:'Google Maps Reviews',available:true});
  return out;
}

export async function syncPlatformComments(env,platform){
  const s=await getSocialIntegrationSettings(env);if(platform==='facebook')return syncFacebook(env,s.facebook||{});if(platform==='instagram')return syncInstagram(env,s.instagram||{});if(platform==='threads')return syncThreads(env,s.threads||{});if(platform==='linkedin')return syncLinkedIn(env,s.linkedin||{});if(platform==='x')return syncX(env,s.x||{});if(platform==='google_maps')return syncGoogleMaps(env);if(platform==='pinterest')return syncPinterest(env,s.pinterest||{});if(platform==='youtube')return syncYouTube(env,s.youtube||{});return {synced:0,warning:''};
}

export async function promoteInProgress(env){
  await env.DB.prepare("UPDATE social_comments SET workflow_status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE remote_deleted=0 AND remote_hidden=0 AND is_spam=0 AND workflow_status='new' AND COALESCE(NULLIF(remote_created_at,''),created_at)<=datetime('now','-48 hours')").run().catch(()=>{});
}

function rowKind(row){return String(jsonObj(row.raw_json)?.kind||'').toLowerCase();}
function remotePayload(row){const r=jsonObj(row.raw_json);return r?.remote||r?.change?.value||r||{};}
function deadlineFrom(row,days){const t=Date.parse(row.remote_created_at||row.created_at||'');if(!Number.isFinite(t))return'';return new Date(t+days*24*60*60*1000).toISOString();}
export function capabilities(row,s={}){
  const p=row.platform,kind=rowKind(row),raw=remotePayload(row),deleted=!!Number(row.remote_deleted||0);
  if(kind==='dm'&&(p==='facebook'||p==='instagram'))return {reply:!deleted,replyPublic:false,like:false,hide:false,delete:false,spam:false,privateMessage:false,isDirectMessage:true,deleteAdminReply:false};
  if(p==='facebook'){
    const d=deadlineFrom(row,7),windowOpen=!!d&&Date.parse(d)>Date.now(),sent=!!clean(row.private_message_sent_at,100);
    // Do not disable the one-time DM merely because a comment-list response omits
    // can_reply_privately. The Send API remains the final authority for the activity.
    const privateAvailable=!deleted&&!sent&&windowOpen;
    const canHide=!deleted,canRemove=raw.can_remove===true,hasReply=!deleted&&!!clean(row.admin_reply_external_id,600);
    const reported=raw.can_reply_privately===true?'Meta currently reports this comment as eligible for the Facebook one-time DM.':raw.can_reply_privately===false?'Meta did not report this comment as eligible, but the dashboard can still attempt the documented Facebook one-time DM while the seven-day window is open.':'Meta did not return DM eligibility for this row; the dashboard can still attempt the documented Facebook one-time DM while the seven-day window is open.';
    return {reply:!deleted&&raw.can_comment!==false,replyPublic:!deleted&&!!row.external_post_id,like:!deleted&&(raw.can_like!==false||!!Number(row.remote_liked||0)),hide:!deleted&&canHide,delete:!deleted&&canRemove,spam:!deleted&&canHide,privateMessage:!!privateAvailable,privateMessageDeadline:d,privateMessageTextOnly:true,privateMessageMode:'one_time_dm',privateMessageReason:sent?'The Facebook one-time DM has already been sent from this dashboard.':windowOpen?reported:'The seven-day Facebook one-time DM window has expired.',typingIndicator:false,deleteAdminReply:hasReply,editAdminReply:hasReply};
  }
  if(p==='instagram'){
    const d=deadlineFrom(row,7),sent=!!clean(row.private_message_sent_at,100),open=!!d&&Date.parse(d)>Date.now()&&!sent,hasReply=!deleted&&!!clean(row.admin_reply_external_id,600);
    return {reply:!deleted,replyPublic:false,like:false,likeReason:"Meta's current Instagram Comment Moderation API does not expose a native comment-heart/like endpoint.",hide:!deleted,delete:!deleted,spam:!deleted,privateMessage:!!open,privateMessageDeadline:d,privateMessageTextOnly:true,privateMessageMode:'initial_dm',privateMessageReason:sent?'The Instagram initial DM has already been sent from this dashboard.':open?'Meta permits one initial comment-triggered DM within seven days, subject to the app access level and recipient eligibility.':'The seven-day Instagram initial DM window has expired.',deleteAdminReply:hasReply,editAdminReply:hasReply,editAdminReplyMode:'replace'};
  }
  if(p==='threads'){const hasReply=!deleted&&!!clean(row.admin_reply_external_id,600);return {reply:!deleted,replyPublic:false,like:false,likeReason:"Threads' current official Reply Moderation API does not expose a native Like/heart action for another user's reply. Use the Threads app for that action.",hide:!deleted,delete:false,deleteReason:"Threads' current official Reply Moderation API does not expose deletion of another user's reply. Hide/unhide is the supported moderation action.",spam:!deleted,privateMessage:false,deleteAdminReply:hasReply,editAdminReply:hasReply,editAdminReplyMode:'replace'};}
  if(p==='linkedin')return {reply:!deleted&&s.linkedin?.communityEnabled===true&&s.linkedin?.commentWriteReady!==false,replyPublic:false,like:!deleted&&s.linkedin?.communityEnabled===true&&s.linkedin?.commentWriteReady!==false,hide:false,delete:false,spam:false,privateMessage:false,deleteAdminReply:false};
  if(p==='x')return {reply:!deleted,replyPublic:false,like:!deleted&&!!s.x?.userId,hide:false,delete:false,spam:false,privateMessage:false,deleteAdminReply:false};
  if(p==='youtube'){const hasReply=!deleted&&!!clean(row.admin_reply_external_id,600);return {reply:!deleted,replyPublic:false,like:false,likeReason:'YouTube Data API does not expose an API action that likes a viewer comment on behalf of the channel.',hide:!deleted,delete:!deleted,spam:!deleted,privateMessage:false,deleteAdminReply:hasReply,editAdminReply:hasReply};}
  if(p==='pinterest')return {reply:false,replyPublic:false,like:false,hide:false,delete:false,spam:false,privateMessage:false,deleteAdminReply:false,pinEngagement:true};
  if(p==='google_maps')return {reply:!deleted,replyPublic:false,like:false,hide:false,delete:false,spam:false,privateMessage:false,deleteAdminReply:false};
  return {reply:false,replyPublic:false,like:false,hide:false,delete:false,spam:false,privateMessage:false,deleteAdminReply:false};
}

async function getRow(env,id){return env.DB.prepare('SELECT * FROM social_comments WHERE id=?').bind(Number(id)).first();}
async function mark(env,id,patch={}){
  const allowed=['workflow_status','remote_state','is_spam','private_message_sent_at','admin_reply_text','admin_reply_at','admin_reply_author','admin_reply_external_id','admin_reply_mode','remote_liked','remote_hidden','remote_deleted'];const sets=[],vals=[];for(const k of allowed)if(Object.prototype.hasOwnProperty.call(patch,k)){sets.push(`${k}=?`);vals.push(patch[k]);}if(!sets.length)return;vals.push(Number(id));await env.DB.prepare(`UPDATE social_comments SET ${sets.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...vals).run();
}

async function facebookAction(env,c,row,action,text){
  const base=`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(row.external_comment_id)}`,token=c.pageAccessToken;if(!token)throw new Error('Facebook Page Access Token is missing.');const kind=rowKind(row);
  const pageMessages=()=>`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(c.pageId)}/messages`;
  if(action==='reply'&&kind==='dm'){
    if(!c.pageId)throw new Error('Facebook Page ID is missing.');const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
    try{await remoteJson(await fetch(pageMessages(),{method:'POST',headers,body:JSON.stringify({recipient:{id:row.commenter_id},sender_action:'mark_seen'})}),'Facebook mark message seen');}catch(_){}
    return remoteJson(await fetch(pageMessages(),{method:'POST',headers,body:JSON.stringify({recipient:{id:row.commenter_id},message:{text},messaging_type:'RESPONSE'})}),'Facebook direct-message reply');
  }
  if(action==='typing_on'||action==='typing_off'){
    // Sender actions require a Messenger Page-scoped ID (PSID). A feed-comment
    // author ID is not necessarily a Messenger PSID, so an initial comment-triggered
    // DM cannot reliably show typing dots before a Messenger conversation exists.
    if(kind!=='dm')return {ignored:true,reason:'Typing indicators are available only after a Messenger conversation/PSID exists.'};
    if(!c.pageId||!row.commenter_id)throw new Error('A Facebook Page ID and Messenger recipient ID are required for the typing indicator.');
    return remoteJson(await fetch(pageMessages(),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:row.commenter_id},sender_action:action})}),`Facebook ${action==='typing_on'?'typing indicator start':'typing indicator stop'}`);
  }
  if(action==='reply'){const body=new URLSearchParams({message:text,access_token:token});return remoteJson(await fetch(`${base}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook nested comment reply');}
  if(action==='reply_public'){
    if(!row.external_post_id)throw new Error('The Facebook Post ID is missing for this comment. Refresh Facebook comments and try again.');
    const body=new URLSearchParams({message:text,access_token:token});return remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(row.external_post_id)}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook public post comment');
  }
  if(action==='like')return remoteJson(await fetch(`${base}/likes?access_token=${encodeURIComponent(token)}`,{method:'POST'}),'Facebook comment like');
  if(action==='unlike')return remoteJson(await fetch(`${base}/likes?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Facebook comment unlike');
  if(action==='hide'||action==='spam'||action==='unhide'){
    const wantHidden=action!=='unhide',body=new URLSearchParams({is_hidden:wantHidden?'true':'false',access_token:token});
    const result=await remoteJson(await fetch(base,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),wantHidden?'Facebook comment hide':'Facebook comment unhide');
    // Verify remote state before the dashboard moves the row. If Meta says the
    // opposite state, fail and let optimistic UI roll back.
    const check=new URL(base);check.searchParams.set('fields','id,is_hidden');check.searchParams.set('access_token',token);
    const verified=await remoteJson(await fetch(check),'Facebook comment visibility verification');
    if(typeof verified?.is_hidden!=='boolean')throw new Error(`Facebook did not return a verifiable is_hidden state after the ${wantHidden?'hide':'unhide'} request. The dashboard has not changed the local status. Refresh and try again.`);
    if(verified.is_hidden!==wantHidden)throw new Error(`Facebook did not apply the requested ${wantHidden?'hide':'unhide'} state. The dashboard has rolled the button back.`);
    return {...result,is_hidden:verified.is_hidden,visibilityConfirmed:true};
  }
  if(action==='delete')return remoteJson(await fetch(`${base}?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Facebook comment delete');
  if(action==='delete_admin_reply'){
    const replyId=clean(row.admin_reply_external_id,600);if(!replyId)throw new Error('The Facebook reply ID is missing. Refresh comments before deleting the admin response.');
    return remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(replyId)}?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Facebook admin reply delete');
  }
  if(action==='edit_admin_reply'){
    const replyId=clean(row.admin_reply_external_id,600);if(!replyId)throw new Error('The Facebook reply ID is missing. Refresh comments before editing the admin response.');
    const body=new URLSearchParams({message:text,access_token:token});
    return remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(replyId)}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook admin reply edit');
  }
  if(action==='private_message'){
    // V16.17 primary path: Facebook's comment-to-private-reply Send API. The
    // recipient is the COMMENT ID (not the commenter's feed/profile ID), so this is
    // distinct from the ordinary 24-hour Messenger RESPONSE window.
    try{
      if(!c.pageId)throw new Error('Facebook Page ID is missing.');
      const r=await remoteJson(await fetch(pageMessages(),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{comment_id:row.external_comment_id},message:{text}})}),'Facebook one-time DM');
      return {...r,delivery_mode:'comment_one_time_dm'};
    }catch(privateErr){
      // Hybrid fallback: ordinary /PAGE_ID/messages with recipient.id is valid only
      // when this same Page-scoped recipient actually messaged the Page in the last
      // 24 hours. Prove that from an inbound Messenger webhook row before trying it.
      const recentDm=await env.DB.prepare(`SELECT id,remote_created_at FROM social_comments
        WHERE platform='facebook' AND commenter_id=? AND remote_deleted=0
          AND raw_json LIKE '%"kind":"dm"%'
          AND COALESCE(NULLIF(remote_created_at,''),created_at)>=datetime('now','-24 hours')
        ORDER BY COALESCE(NULLIF(remote_created_at,''),created_at) DESC LIMIT 1`)
        .bind(clean(row.commenter_id,600)).first().catch(()=>null);
      if(recentDm&&c.pageId&&row.commenter_id){
        const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
        try{await remoteJson(await fetch(pageMessages(),{method:'POST',headers,body:JSON.stringify({recipient:{id:row.commenter_id},sender_action:'mark_seen'})}),'Facebook mark message seen');}catch(_){}
        const r=await remoteJson(await fetch(pageMessages(),{method:'POST',headers,body:JSON.stringify({recipient:{id:row.commenter_id},message:{text},messaging_type:'RESPONSE'})}),'Facebook Messenger 24-hour reply');
        return {...r,delivery_mode:'messenger_24h_fallback'};
      }
      // Known Meta recipient/activity restriction (10903) is already translated by
      // remoteJson into the concise admin-safe message. Do not append an internal
      // explanation about the 24-hour fallback; that only alarms the admin and does
      // not change the corrective action.
      if(String(privateErr.upstreamCode||'')==='10903')throw privateErr;
      const e=new Error(`${privateErr.message} Meta rejected the one-time DM, and no eligible recent Messenger conversation was found for a safe 24-hour fallback.`);
      Object.assign(e,{httpStatus:privateErr.httpStatus||0,upstreamCode:privateErr.upstreamCode||'',upstreamSubcode:privateErr.upstreamSubcode||'',upstreamPayload:privateErr.upstreamPayload});
      throw e;
    }
  }
}
async function instagramAction(c,row,action,text){
  const version=graphVersion(c),base=`https://graph.facebook.com/${version}/${encodeURIComponent(row.external_comment_id)}`,token=c.pageAccessToken,instagramToken=clean(c.instagramLoginToken,8000);if(!token&&!instagramToken)throw new Error('Instagram access token is missing.');const kind=rowKind(row);
  if(action==='reply'&&kind==='dm'){
    if(!c.instagramBusinessId)throw new Error('Instagram Business Account ID is missing.');
    if(instagramToken){try{return {...await remoteJson(await fetch(`https://graph.instagram.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${instagramToken}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:row.commenter_id},message:{text}})}),'Instagram direct-message reply (Instagram Login)'),delivery_mode:'instagram_login'};}catch(_){} }
    if(!token)throw new Error('Instagram Page Access Token is missing for the Facebook Login DM route.');
    return remoteJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:row.commenter_id},message:{text}})}),'Instagram direct-message reply');
  }
  if(action==='reply')return remoteJson(await fetch(`${base}/replies`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,access_token:token})}),'Instagram comment reply');
  if(action==='hide'||action==='spam'||action==='unhide')return remoteJson(await fetch(base,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hide:action==='unhide'?false:true,access_token:token})}),action==='unhide'?'Instagram comment unhide':'Instagram comment hide');
  if(action==='delete')return remoteJson(await fetch(`${base}?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Instagram comment delete');
  if(action==='delete_admin_reply'){const replyId=clean(row.admin_reply_external_id,600);if(!replyId)throw new Error('The Instagram reply ID is missing. Refresh comments before deleting the admin response.');return remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(replyId)}?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Instagram admin reply delete');}
  if(action==='edit_admin_reply'){
    const replyId=clean(row.admin_reply_external_id,600);if(!replyId)throw new Error('The Instagram reply ID is missing. Refresh comments before editing the admin response.');
    await remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(replyId)}?access_token=${encodeURIComponent(token)}`,{method:'DELETE'}),'Instagram old admin reply delete for edit');
    try{return await remoteJson(await fetch(`${base}/replies`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,access_token:token})}),'Instagram replacement admin reply');}
    catch(e){e.remoteReplyDeleted=true;e.message=`${e.message} The old Instagram admin response was already deleted before Meta rejected the replacement. Refresh Comments and post a new reply if needed.`;throw e;}
  }
  if(action==='private_message'){
    if(!c.instagramBusinessId)throw new Error('Instagram Business Account ID is missing.');
    const payload=JSON.stringify({recipient:{comment_id:row.external_comment_id},message:{text}}),errors=[];
    // Prefer an Instagram Login token when one is configured. This mirrors Meta's
    // graph.instagram.com Private Replies route and the user's previous working n8n
    // workflow. It is intentionally separate from the Page token used for publishing.
    if(instagramToken){
      try{return {...await remoteJson(await fetch(`https://graph.instagram.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${instagramToken}`,'content-type':'application/json'},body:payload}),'Instagram initial DM (Instagram Login)'),delivery_mode:'instagram_login_private_reply'};}
      catch(e){errors.push(`Instagram Login route: ${clean(e.message,1000)}`);}
    }
    if(token){
      try{return {...await remoteJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:payload}),'Instagram initial DM (Facebook Login)'),delivery_mode:'facebook_login_private_reply'};}
      catch(e){errors.push(`Facebook Login route: ${clean(e.message,1000)}`);}
    }
    const e=new Error(`Instagram initial DM could not be sent. ${errors.join(' ')}${!instagramToken?' Add a fresh Instagram Login token in Settings → Social Media API → Instagram to enable the graph.instagram.com fallback used by the earlier working workflow.':''}`);
    e.httpStatus=400;throw e;
  }
}
async function threadsAction(c,row,action,text){
  if(!c.accessToken)throw new Error('Threads access token is missing.');const token=c.accessToken;
  if(action==='hide'||action==='spam'||action==='unhide')return remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(row.external_comment_id)}/manage_reply?hide=${action==='unhide'?'false':'true'}&access_token=${encodeURIComponent(token)}`,{method:'POST',headers:{authorization:`Bearer ${token}`}}),action==='unhide'?'Threads reply unhide':'Threads reply hide');
  if(action==='reply'){const u=new URL('https://graph.threads.net/me/threads');u.search=new URLSearchParams({media_type:'TEXT',text,reply_to_id:row.external_comment_id,auto_publish_text:'true',access_token:token}).toString();return remoteJson(await fetch(u,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads reply');}
  if(action==='delete_admin_reply'){const id=clean(row.admin_reply_external_id,600);if(!id)throw new Error('The Threads admin reply ID is missing. Refresh comments and try again.');return remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(id)}?access_token=${encodeURIComponent(token)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'Threads own admin reply delete');}
  if(action==='edit_admin_reply'){
    const id=clean(row.admin_reply_external_id,600);if(!id)throw new Error('The Threads admin reply ID is missing. Refresh comments and try again.');
    await remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(id)}?access_token=${encodeURIComponent(token)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'Threads old admin reply delete');
    try{const u=new URL('https://graph.threads.net/me/threads');u.search=new URLSearchParams({media_type:'TEXT',text,reply_to_id:row.external_comment_id,auto_publish_text:'true',access_token:token}).toString();return await remoteJson(await fetch(u,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads replacement admin reply');}catch(e){e.remoteReplyDeleted=true;throw e;}
  }
}
async function linkedinAction(env,c,row,action,text){if(c.communityEnabled!==true)throw new Error('Enable LinkedIn Community Management only after LinkedIn approves that product, then reconnect LinkedIn.');const token=await getLinkedInAccessToken(env),fresh=(await getSocialIntegrationSettings(env)).linkedin||c,raw=jsonObj(row.raw_json),thread=clean(raw.object||row.external_post_id,800),commentUrn=clean(raw.commentUrn,800)||`urn:li:comment:(${thread},${row.external_comment_id})`,actor=linkedinActor(fresh);if(!actor)throw new Error('LinkedIn could not determine the member/organization actor. Reconnect LinkedIn and run Test Connection.');if(action==='reply')return remoteJson(await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(commentUrn)}/comments`,{method:'POST',headers:liHeaders(fresh,token),body:JSON.stringify({actor,message:{text},object:thread,parentComment:commentUrn})}),'LinkedIn comment reply');if(action==='like'){const u=new URL('https://api.linkedin.com/rest/reactions');u.searchParams.set('actor',actor);return remoteJson(await fetch(u,{method:'POST',headers:liHeaders(fresh,token),body:JSON.stringify({root:commentUrn,reactionType:'LIKE'})}),'LinkedIn comment reaction');}throw new Error('This LinkedIn comment action is not available through the configured API permissions.');}
async function xAction(env,c,row,action,text){const token=await getXUserAccessToken(env);if(action==='reply')return remoteJson(await fetch('https://api.x.com/2/tweets',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({text,reply:{in_reply_to_tweet_id:row.external_comment_id}})}),'X reply');if(action==='like'){if(!c.userId)throw new Error('X User ID is missing. Run Test Connection first.');return remoteJson(await fetch(`https://api.x.com/2/users/${encodeURIComponent(c.userId)}/likes`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({tweet_id:row.external_comment_id})}),'X like');}if(action==='unlike'){if(!c.userId)throw new Error('X User ID is missing. Run Test Connection first.');return remoteJson(await fetch(`https://api.x.com/2/users/${encodeURIComponent(c.userId)}/likes/${encodeURIComponent(row.external_comment_id)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'X unlike');}}

function replyAuthor(platform,s={}){if(platform==='facebook')return clean(s.facebook?.pageName||'DropBeat Dance Studio',300);if(platform==='instagram')return clean(s.instagram?.username?`@${s.instagram.username}`:'DropBeat Dance Studio',300);if(platform==='threads')return clean(s.threads?.username?`@${s.threads.username}`:'DropBeat Dance Studio',300);if(platform==='linkedin')return 'DropBeat Dance Studio';if(platform==='x')return clean(s.x?.username?`@${s.x.username}`:'DropBeat Dance Studio',300);if(platform==='google_maps')return clean(s.googleBusiness?.locationName||'Business owner',300);return 'Admin';}

function statusAfterReplyDelete(row){
  const t=Date.parse(row.remote_created_at||row.created_at||'');return Number.isFinite(t)&&t<=Date.now()-48*60*60*1000?'in_progress':'new';
}
export async function performSocialCommentAction(env,{id,action,text=''}){
  const row=await getRow(env,id);if(!row)throw new Error('Social comment was not found. Refresh Comments and try again.');const s=await getSocialIntegrationSettings(env),caps=capabilities(row,s),a=clean(action,60).toLowerCase(),msg=clean(text,5000);
  if(a==='resolve'){await mark(env,id,{workflow_status:'resolved'});return {ok:true,status:'resolved',localOnly:true};}
  if(a==='reopen'){await mark(env,id,{workflow_status:statusAfterReplyDelete(row)});return {ok:true,status:statusAfterReplyDelete(row),localOnly:true};}
  if(['typing_on','typing_off'].includes(a)){
    if(row.platform!=='facebook'||rowKind(row)!=='dm')return {ok:true,action:a,ignored:true};
    const result=await facebookAction(env,s.facebook||{},row,a,'');return {ok:true,action:a,result};
  }
  if(['reply','reply_public'].includes(a)&&clean(row.admin_reply_text,10))throw new Error('This comment already has an admin response. Delete that response first if you need to replace it. A later message from the commenter will appear as a separate comment.');
  if(a==='reply'&&!caps.reply)throw new Error(`Reply is not available through the ${row.platform} API for this item.`);
  if(a==='reply_public'&&!(row.platform==='facebook'&&caps.replyPublic))throw new Error('A normal public post comment is available only for Facebook comments that still have a valid Post ID.');
  if((a==='like'||a==='unlike')&&!caps.like)throw new Error(`Like/reaction is not available through the ${row.platform} API for this item.`);
  if(a==='delete'&&!caps.delete)throw new Error(`Deleting this item is not permitted through the ${row.platform} API for this comment.`);
  if(a==='delete_admin_reply'&&!caps.deleteAdminReply)throw new Error('The saved admin response cannot be deleted through this platform API. Refresh comments and try again.');
  if(a==='edit_admin_reply'&&!caps.editAdminReply)throw new Error('The saved admin response cannot be edited through this platform API. Refresh comments and try again.');
  if((a==='hide'||a==='unhide'||a==='spam')&&!caps.hide)throw new Error(`Hide/spam moderation is not available through the ${row.platform} API for this comment. Meta may explicitly report can_hide=false for items that cannot be hidden.`);
  if(a==='private_message'&&!caps.privateMessage)throw new Error(caps.privateMessageReason||'The one-time DM window is closed or this platform does not permit a DM from this comment.');
  if(['reply','reply_public','edit_admin_reply','private_message'].includes(a)&&!msg)throw new Error('Write a message before sending.');
  let result;
  try{
    if(row.platform==='facebook')result=await facebookAction(env,s.facebook||{},row,a,msg);else if(row.platform==='instagram')result=await instagramAction(s.instagram||{},row,a,msg);else if(row.platform==='threads')result=await threadsAction(s.threads||{},row,a,msg);else if(row.platform==='linkedin')result=await linkedinAction(env,s.linkedin||{},row,a,msg);else if(row.platform==='x')result=await xAction(env,s.x||{},row,a,msg);else if(row.platform==='youtube')result=await youtubeAction(env,s.youtube||{},row,a,msg);else if(row.platform==='google_maps'&&a==='reply')result=await replyGoogleBusinessReview(env,row.external_comment_id,msg);else throw new Error('This remote action is not supported for the selected platform.');
  }catch(e){
    if(['instagram','threads'].includes(row.platform)&&a==='edit_admin_reply'&&e?.remoteReplyDeleted)await mark(env,id,{workflow_status:statusAfterReplyDelete(row),admin_reply_text:'',admin_reply_at:'',admin_reply_author:'',admin_reply_external_id:'',admin_reply_mode:''}).catch(()=>{});
    throw e;
  }
  const t=new Date().toISOString();
  if(a==='reply'||a==='reply_public')await mark(env,id,{workflow_status:'responded',admin_reply_text:msg,admin_reply_at:t,admin_reply_author:replyAuthor(row.platform,s),admin_reply_external_id:clean(result?.id||result?.comment_id||result?.reply?.name||'',600),admin_reply_mode:a==='reply_public'?'public':'nested'});
  if(a==='delete'){
    // A successful remote delete is final: remove the local inbox row as well.
    await env.DB.prepare('DELETE FROM social_comments WHERE id=?').bind(Number(id)).run();
    return {ok:true,action:a,deleted:true,result};
  }
  if(a==='delete_admin_reply')await mark(env,id,{workflow_status:statusAfterReplyDelete(row),admin_reply_text:'',admin_reply_at:'',admin_reply_author:'',admin_reply_external_id:'',admin_reply_mode:''});
  if(a==='edit_admin_reply')await mark(env,id,{workflow_status:'responded',admin_reply_text:msg,admin_reply_at:t,admin_reply_external_id:['instagram','threads'].includes(row.platform)?clean(result?.id||result?.comment_id||'',600):row.platform==='youtube'?clean(result?.id||row.admin_reply_external_id,600):clean(row.admin_reply_external_id,600),admin_reply_mode:row.admin_reply_mode||'nested'});
  if(a==='hide')await mark(env,id,{remote_state:'hidden',remote_hidden:1});
  if(a==='unhide')await mark(env,id,{remote_state:'',remote_hidden:0,is_spam:0});
  if(a==='spam')await mark(env,id,{remote_state:'hidden_spam',remote_hidden:1,is_spam:1});
  if(a==='private_message')await mark(env,id,{private_message_sent_at:t,workflow_status:'responded'});
  if(a==='like')await mark(env,id,{remote_liked:1,workflow_status:'responded'});
  if(a==='unlike')await mark(env,id,{remote_liked:0});
  return {ok:true,action:a,result};
}


async function runCommentAutomation(env,{platform='',externalCommentId='',commenterId='',commenterName='',commenterUsername='',text=''}={}){
  try{
    const mod=await import('./social-automations.js'),plan=await mod.matchAutomation(env,{channel:'comment',platform,participantId:commenterId,participantName:commenterName,participantUsername:commenterUsername,text});if(!plan)return false;
    const step=(Array.isArray(plan.steps)?plan.steps:[]).find(x=>clean(x?.text,6000))||plan.step,reply=clean(step?.text,6000);if(!reply)return false;
    const row=await env.DB.prepare('SELECT id FROM social_comments WHERE platform=? AND external_comment_id=? LIMIT 1').bind(platform,externalCommentId).first();if(!row?.id)return false;
    try{await performSocialCommentAction(env,{id:row.id,action:'reply',text:reply});await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel:'comment',platform,participantId:commenterId,externalEventId:externalCommentId,matchedText:text,stepId:plan.lastNodeId||step?.id||'',status:plan.handoff?'handoff':'processed'});return true;}
    catch(e){await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel:'comment',platform,participantId:commenterId,externalEventId:externalCommentId,matchedText:text,stepId:plan.lastNodeId||step?.id||'',status:'error',errorMessage:e?.message||String(e)});return false;}
  }catch{return false;}
}

const commentDmDelay=seconds=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Math.min(30,Number(seconds||0)))*1000));
function commentDmPlainText(step={}){
  const links=[step.documentUrl,step.linkUrl,step.mediaUrl].map(x=>clean(x,3000)).filter(Boolean),buttons=(step.buttons||[]).filter(x=>x?.label).map((b,i)=>`${i+1}. ${clean(b.label,80)}${b.url?` — ${clean(b.url,3000)}`:''}`);
  return clean([step.text,...links,buttons.join('\n')].filter(Boolean).join('\n\n'),6000);
}
function commentDmMessage(step={}){
  const text=clean(step.text,2000)||'Thank you for your interest.',buttons=(step.buttons||[]).filter(x=>x?.label).slice(0,3),asButton=(b,i)=>b.action==='url'&&/^https:\/\//i.test(clean(b.url,3000))?{type:'web_url',url:clean(b.url,3000),title:clean(b.label,20)}:b.action==='phone'&&clean(b.url,80)?{type:'phone_number',payload:clean(b.url,80).replace(/^tel:/i,''),title:clean(b.label,20)}:{type:'postback',payload:`comment_dm:${clean(b.id||String(i+1),80)}`,title:clean(b.label,20)},directLink=/^https:\/\//i.test(clean(step.linkUrl,3000))?{type:'web_url',url:clean(step.linkUrl,3000),title:step.offer?.full?'View details':'Open link'}:null,messageButtons=[...(directLink?[directLink]:[]),...buttons.map(asButton)].slice(0,3),linkButtons=buttons.filter(b=>b.action==='url'&&/^https:\/\//i.test(clean(b.url,3000))).map(asButton);
  if(step.type==='document')return {attachment:{type:'template',payload:{template_type:'button',text:clean(text,640),buttons:[{type:'web_url',url:clean(step.documentUrl||step.linkUrl,3000),title:'Open document'},...linkButtons].slice(0,3)}}};
  if(step.type==='image'||step.type==='image_buttons')return {attachment:{type:'template',payload:{template_type:'generic',elements:[{title:clean(text,80),subtitle:clean(text,640),image_url:clean(step.mediaUrl,3000),buttons:(messageButtons.length?messageButtons:[...(step.linkUrl?[{type:'web_url',url:clean(step.linkUrl,3000),title:'Open link'}]:[])]).slice(0,3)}]}}};
  if(['interactive_buttons','offer'].includes(step.type)||linkButtons.length||directLink)return {attachment:{type:'template',payload:{template_type:'button',text:clean(text,640),buttons:messageButtons.slice(0,3)}}};
  if(step.type==='buttons')return {text:clean(text,2000),quick_replies:buttons.slice(0,13).map((b,i)=>({content_type:'text',title:clean(b.label,20),payload:`comment_dm:${clean(b.id||String(i+1),80)}`}))};
  return {text:clean(text,2000)};
}
async function sendCommentDmStep(env,row,step){
  const settings=await getSocialIntegrationSettings(env),message=commentDmMessage(step),plain=commentDmPlainText(step);let result=null;
  try{
    if(row.platform==='facebook'){
      const c=settings.facebook||{},token=c.pageAccessToken;if(!c.pageId||!token)throw new Error('Facebook Page messaging connection is incomplete.');
      result=await remoteJson(await fetch(`https://graph.facebook.com/${graphVersion(c)}/${encodeURIComponent(c.pageId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{comment_id:row.external_comment_id},message})}),'Facebook one-time DM');
    }else if(row.platform==='instagram'){
      const c=settings.instagram||{},version=graphVersion(c),errors=[];if(!c.instagramBusinessId)throw new Error('Instagram Business Account ID is missing.');
      if(c.instagramLoginToken)try{result=await remoteJson(await fetch(`https://graph.instagram.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${c.instagramLoginToken}`,'content-type':'application/json'},body:JSON.stringify({recipient:{comment_id:row.external_comment_id},message})}),'Instagram initial DM');}catch(e){errors.push(e);}
      if(!result&&c.pageAccessToken)try{result=await remoteJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${c.pageAccessToken}`,'content-type':'application/json'},body:JSON.stringify({recipient:{comment_id:row.external_comment_id},message})}),'Instagram initial DM');}catch(e){errors.push(e);}
      if(!result)throw errors.at(-1)||new Error('Instagram messaging connection is incomplete.');
    }
    if(!result)throw new Error('This platform does not support comment-triggered private replies.');
    await mark(env,row.id,{private_message_sent_at:new Date().toISOString(),workflow_status:'responded'});return result;
  }catch(richError){
    if(!plain)throw richError;
    return performSocialCommentAction(env,{id:row.id,action:'private_message',text:plain});
  }
}
async function runCommentToDmAutomation(env,{platform='',externalCommentId='',commenterId='',commenterName='',commenterUsername='',text=''}={}){
  if(!['facebook','instagram'].includes(platform))return false;
  const channel='comment_dm';let plan=null;
  try{
    const mod=await import('./social-automations.js');
    const claimed=await mod.claimAutomationEvent(env,{channel,platform,externalEventId:externalCommentId,participantId:commenterId,text});if(!claimed)return false;
    plan=await mod.matchAutomation(env,{channel,platform,participantId:commenterId,participantName:commenterName,participantUsername:commenterUsername,text});
    if(!plan){await mod.finishAutomationEvent(env,{channel,platform,externalEventId:externalCommentId,status:'no_match'});return false;}
    const steps=Array.isArray(plan.steps)?plan.steps:[],row=await env.DB.prepare('SELECT * FROM social_comments WHERE platform=? AND external_comment_id=? LIMIT 1').bind(platform,externalCommentId).first();if(!row?.id)return false;
    let delivered=false,lastStep='';
    for(const step of steps){lastStep=step.id||lastStep;if(step.type==='delay'){await commentDmDelay(step.delaySeconds);continue;}if(step.type==='comment_reply'){const reply=clean(step.text,1200);if(reply)await performSocialCommentAction(env,{id:row.id,action:'reply',text:reply});continue;}const dm=commentDmPlainText(step);if(dm){await sendCommentDmStep(env,row,step);delivered=true;}}
    if(!delivered){await mod.finishAutomationEvent(env,{channel,platform,externalEventId:externalCommentId,status:'empty',flowId:plan.flow.id});return false;}
    await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel,platform,participantId:commenterId,externalEventId:externalCommentId,matchedText:text,stepId:lastStep||plan.lastNodeId||'',status:'processed'});
    await mod.finishAutomationEvent(env,{channel,platform,externalEventId:externalCommentId,status:'processed',flowId:plan.flow.id});return true;
  }catch(e){try{const mod=await import('./social-automations.js');if(plan)await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel,platform,participantId:commenterId,externalEventId:externalCommentId,matchedText:text,stepId:plan.lastNodeId||'',status:'error',errorMessage:e?.message||String(e)});await mod.finishAutomationEvent(env,{channel,platform,externalEventId:externalCommentId,status:'error',flowId:plan?.flow?.id||0,errorMessage:e?.message||String(e)});}catch{}return false;}
}

export async function ingestMetaCommentWebhook(env,entry={},change={}){
  const field=String(change?.field||'').toLowerCase(),v=change?.value||{},settings=await getSocialIntegrationSettings(env);let platform='';
  if((field==='comments'||field==='live_comments')&&settings.instagram?.enabled)platform='instagram';else if(field==='feed'&&String(v.item||'').toLowerCase()==='comment'&&settings.facebook?.enabled)platform='facebook';else return false;
  const id=clean(v.comment_id||v.id,600);if(!id)return false;
  const postId=clean(v.media?.id||v.post_id||'',600),from=v.from||{id:v.sender_id||'',name:v.sender_name||'',username:v.username||''};
  if(platform==='facebook'&&String(from.id||v.sender_id||'')===String(settings.facebook?.pageId||'')){const parent=clean(v.parent_id||v.parent?.id||'',600),verb=String(v.verb||'').toLowerCase();if(parent&&verb==='remove')await env.DB.prepare("UPDATE social_comments SET admin_reply_text='',admin_reply_at='',admin_reply_author='',admin_reply_external_id='',admin_reply_mode='',workflow_status=CASE WHEN COALESCE(NULLIF(remote_created_at,''),created_at)<=datetime('now','-48 hours') THEN 'in_progress' ELSE 'new' END,updated_at=CURRENT_TIMESTAMP WHERE platform='facebook' AND external_comment_id=? AND admin_reply_external_id=?").bind(parent,id).run().catch(()=>{});else if(parent)await env.DB.prepare("UPDATE social_comments SET admin_reply_text=?,admin_reply_at=?,admin_reply_author=?,admin_reply_external_id=?,admin_reply_mode='nested',workflow_status=CASE WHEN workflow_status IN ('new','in_progress') THEN 'responded' ELSE workflow_status END,updated_at=CURRENT_TIMESTAMP WHERE platform='facebook' AND external_comment_id=?").bind(clean(v.message||v.text,6000),iso(v.created_time||v.timestamp),clean(settings.facebook?.pageName||'DropBeat Dance Studio',300),id,parent).run().catch(()=>{});await env.DB.prepare("DELETE FROM social_comments WHERE platform='facebook' AND external_comment_id=?").bind(id).run().catch(()=>{});return !!parent;}
  if(platform==='instagram'&&isOwnInstagramComment(settings.instagram||{},{from,username:from.username||v.username||''})){await env.DB.prepare("DELETE FROM social_comments WHERE platform='instagram' AND external_comment_id=?").bind(id).run().catch(()=>{});return false;}
  if(String(v.verb||'').toLowerCase()==='remove'){await env.DB.prepare("UPDATE social_comments SET remote_deleted=1,remote_state='deleted',workflow_status='resolved',updated_at=CURRENT_TIMESTAMP WHERE platform=? AND external_comment_id=?").bind(platform,id).run().catch(()=>{});return true;}
  let meta=await publishedMeta(env,platform,postId).catch(()=>null),remoteMedia=null;
  if(platform==='instagram'&&postId&&settings.instagram?.pageAccessToken){try{const u=new URL(`https://graph.facebook.com/${graphVersion(settings.instagram)}/${encodeURIComponent(postId)}`);u.searchParams.set('fields','id,caption,media_type,media_url,thumbnail_url,permalink,timestamp');u.searchParams.set('access_token',settings.instagram.pageAccessToken);remoteMedia=await remoteJson(await fetch(u),'Instagram media details');}catch(_){}}
  const user=from.username||v.username||'',name=from.name||v.sender_name||user||`${platform} user`;
  const platformPostUrl=platform==='facebook'?facebookPostPermalink(settings.facebook?.pageId,postId):(clean(remoteMedia?.permalink,2000)||meta?.articleUrl||'');
  const postTitle=platform==='instagram'?instagramMediaTitle(remoteMedia||{},meta):(meta?.title||'Facebook post');
  const existedBefore=await env.DB.prepare('SELECT id FROM social_comments WHERE platform=? AND external_comment_id=? LIMIT 1').bind(platform,id).first().catch(()=>null);
  const commentText=clean(v.text||v.message||'',6000),commenterId=clean(from.id||v.sender_id||'',600);
  await upsertSocialComment(env,{platform,externalCommentId:id,externalPostId:postId,postTitle,postUrl:platformPostUrl,postImage:platform==='instagram'?(clean(remoteMedia?.media_url||remoteMedia?.thumbnail_url,2000)||meta?.image||''):(meta?.image||''),postPublishedAt:platform==='instagram'?(iso(remoteMedia?.timestamp)||meta?.publishedAt||''):(meta?.publishedAt||''),parentCommentId:v.parent_id||v.parent?.id||'',commenterId,commenterName:name,commenterUsername:user,commenterProfileUrl:platform==='instagram'&&user?`https://www.instagram.com/${encodeURIComponent(user)}/`:platform==='facebook'&&commenterId?`https://www.facebook.com/${encodeURIComponent(commenterId)}`:'',commentText,remoteCreatedAt:v.created_time||v.timestamp||new Date().toISOString(),raw:{entry,change,remote:v}});
  if(!existedBefore){await runCommentAutomation(env,{platform,externalCommentId:id,commenterId,commenterName:name,commenterUsername:user,text:commentText}).catch(()=>{});await runCommentToDmAutomation(env,{platform,externalCommentId:id,commenterId,commenterName:name,commenterUsername:user,text:commentText}).catch(()=>{});}return true;
}

export async function ingestMetaMessagingWebhook(){
  // V16.61: Messenger/Instagram messaging events belong exclusively to Social Media → Inbox.
  // Retain this export as a no-op for backward compatibility with any older module import.
  return false;
}

export async function ingestXReplyWebhook(env,x={},raw={}){
  if(!String(x.type||'').toLowerCase().includes('reply'))return false;const id=clean(raw?.payload?.id||raw?.id||x.eventId,600);if(!id)return false;await upsertSocialComment(env,{platform:'x',externalCommentId:id,externalPostId:clean(raw?.payload?.conversation_id||raw?.payload?.in_reply_to_tweet_id,600),postTitle:'X post',commenterId:x.authorId||'',commenterName:x.name||x.username||'X user',commenterUsername:x.username||'',commenterProfileUrl:x.username?`https://x.com/${encodeURIComponent(x.username)}`:'',commentText:x.message||'',remoteCreatedAt:raw?.payload?.created_at||new Date().toISOString(),raw});return true;
}
