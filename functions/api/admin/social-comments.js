import { json, readJson, requireAdmin, getSocialIntegrationSettings } from '../../_lib/utils.js';
import { enabledCommentPlatforms, syncPlatformComments, promoteInProgress, capabilities, performSocialCommentAction, pruneOwnPlatformRows, pruneLegacyDmCommentRows } from '../../_lib/social-comments.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const jsonObj=v=>{try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{});}catch{return{};}};
const allowedStatus=v=>['new','in_progress','responded','resolved','hidden','spam','all'].includes(String(v||'').toLowerCase())?String(v).toLowerCase():'new';
const allowedPlatform=v=>['facebook','instagram','threads','youtube','linkedin','x','google_maps','pinterest'].includes(String(v||'').toLowerCase())?String(v).toLowerCase():'';


function sameExternalPostId(a='',b=''){
  const x=clean(a,600),y=clean(b,600);if(!x||!y)return false;if(x===y)return true;
  const xt=x.includes('_')?x.split('_').pop():x,yt=y.includes('_')?y.split('_').pop():y;
  return xt===y||yt===x||xt===yt||x.endsWith(`_${y}`)||y.endsWith(`_${x}`);
}
function attachPublishMetadata(row={},logs=[]){
  const hit=(logs||[]).find(x=>sameExternalPostId(row.external_post_id,x.external_id));
  return hit?{...row,publish_article_url:hit.article_url||'',publish_details_json:hit.details_json||'{}',publish_created_at:hit.created_at||hit.updated_at||''}:row;
}

function facebookPostPermalink(pageId,externalId){
  const id=clean(externalId,600),page=clean(pageId,300);if(!id)return'';
  const parts=id.split('_');if(parts.length>=2&&page)return `https://www.facebook.com/${encodeURIComponent(page)}/posts/${encodeURIComponent(parts.slice(1).join('_'))}`;
  return `https://www.facebook.com/${encodeURIComponent(id)}`;
}
async function pendingSummary(env,platforms=[]){
  const website=await env.DB.prepare(`SELECT COUNT(*) n FROM seo_comments
    WHERE is_admin=0 AND workflow_status IN ('new','in_progress')
      AND created_at>=datetime('now','-7 days')`).first().catch(()=>({n:0}));
  const byPlatform={website:Number(website?.n||0)};let total=byPlatform.website;
  for(const p of platforms){
    if(p.key==='website'||p.available===false)continue;
    const r=await env.DB.prepare(`SELECT COUNT(*) n FROM social_comments
      WHERE platform=? AND remote_deleted=0 AND remote_hidden=0 AND is_spam=0
        AND workflow_status IN ('new','in_progress')
        AND COALESCE(NULLIF(remote_created_at,''),created_at)>=datetime('now','-7 days')`)
      .bind(p.key).first().catch(()=>({n:0}));
    byPlatform[p.key]=Number(r?.n||0);total+=byPlatform[p.key];
  }
  return {total,byPlatform};
}
function hiddenCompatibilityWarning(v=''){
  const t=String(v||'').toLowerCase();
  return t.includes('deprecate_post_aggregated_fields_for_attach')||(t.includes('meta code 12')&&t.includes('post details'));
}

async function counts(env,platform){
  const r=await env.DB.prepare(`SELECT
    SUM(CASE WHEN workflow_status='new' AND remote_deleted=0 AND remote_hidden=0 AND is_spam=0 THEN 1 ELSE 0 END) new_count,
    SUM(CASE WHEN workflow_status='in_progress' AND remote_deleted=0 AND remote_hidden=0 AND is_spam=0 THEN 1 ELSE 0 END) in_progress_count,
    SUM(CASE WHEN workflow_status='responded' AND remote_deleted=0 AND remote_hidden=0 AND is_spam=0 THEN 1 ELSE 0 END) responded_count,
    SUM(CASE WHEN workflow_status='resolved' AND remote_deleted=0 AND remote_hidden=0 AND is_spam=0 THEN 1 ELSE 0 END) resolved_count,
    SUM(CASE WHEN remote_hidden=1 AND is_spam=0 AND remote_deleted=0 THEN 1 ELSE 0 END) hidden_count,
    SUM(CASE WHEN is_spam=1 AND remote_deleted=0 THEN 1 ELSE 0 END) spam_count,
    SUM(CASE WHEN remote_deleted=0 THEN 1 ELSE 0 END) all_count
    FROM social_comments WHERE platform=?`).bind(platform).first().catch(()=>null);
  return {new:Number(r?.new_count||0),in_progress:Number(r?.in_progress_count||0),responded:Number(r?.responded_count||0),resolved:Number(r?.resolved_count||0),hidden:Number(r?.hidden_count||0),spam:Number(r?.spam_count||0),all:Number(r?.all_count||0)};
}

function enrichPost(row={},settings={}){
  const details=jsonObj(row.publish_details_json),generic=!row.post_title||/^(social|facebook|instagram|threads|youtube|x|linkedin) post$/i.test(String(row.post_title||''));
  const publishedTitle=details.title||'',publishedImage=details.cover||'';
  const facebookUrl=row.platform==='facebook'?facebookPostPermalink(settings.facebook?.pageId,row.external_post_id):'';
  return {...row,
    post_title:generic?(publishedTitle||row.post_title||'Social post'):row.post_title,
    post_image:row.post_image||publishedImage||'',
    post_url:facebookUrl||row.post_url||row.publish_article_url||'',
    post_published_at:row.post_published_at||details.publishedAt||row.publish_created_at||''
  };
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),platform=allowedPlatform(u.searchParams.get('platform')),status=allowedStatus(u.searchParams.get('status')||'new'),q=clean(u.searchParams.get('q'),160).toLowerCase(),doSync=u.searchParams.get('sync')==='1',summary=u.searchParams.get('summary')==='1',summaryAll=u.searchParams.get('summary_all')==='1';
  try{
    const settings=await getSocialIntegrationSettings(env),platforms=enabledCommentPlatforms(settings);
    if(!platform){
      if(summaryAll){const pending=await pendingSummary(env,platforms);return json({platforms:platforms.map(x=>({...x,pending:Number(pending.byPlatform[x.key]||0)})),settingsLoaded:true,pendingTotal:pending.total,pendingByPlatform:pending.byPlatform,expiresAfterDays:7});}
      return json({platforms,settingsLoaded:true});
    }
    const pinfo=platforms.find(x=>x.key===platform);
    if(!pinfo)return json({error:'This platform is not enabled in Settings → Social Media API. Enable it first to show its comments here.',platforms},400);
    if(pinfo.available===false)return json({platform,platforms,available:false,reason:pinfo.reason||'Comment management is not available through this platform API.',comments:[],counts:{new:0,in_progress:0,responded:0,resolved:0,hidden:0,spam:0,all:0}});
    let syncError='',synced=0;
    // Maintenance writes belong to an explicit remote synchronization, not to
    // ordinary UI reads/polls. This keeps the comments screen effectively
    // read-only between actual changes.
    if(doSync){
      await pruneLegacyDmCommentRows(env).catch(()=>{});
      await pruneOwnPlatformRows(env,platform,settings).catch(()=>{});
      await env.DB.prepare(`UPDATE social_comments SET workflow_status='responded',updated_at=CURRENT_TIMESTAMP
        WHERE platform=? AND workflow_status IN ('new','in_progress')
          AND (COALESCE(NULLIF(private_message_sent_at,''),'')<>'' OR COALESCE(NULLIF(admin_reply_external_id,''),'')<>'' OR remote_liked=1)`)
        .bind(platform).run().catch(()=>{});
      await promoteInProgress(env);
      try{const r=await syncPlatformComments(env,platform);synced=Number(typeof r==='number'?r:r?.synced||0);syncError=clean(typeof r==='object'?r?.warning||'':'',1800);}catch(e){syncError=clean(e.message||'Remote comment synchronization failed.',1800);if(hiddenCompatibilityWarning(syncError))syncError='';}
      await pruneOwnPlatformRows(env,platform,settings).catch(()=>{});
    }
    const c=await counts(env,platform);
    if(summary)return json({platform,counts:c,platforms,synced,syncError});
    const binds=[platform];let where='sc.platform=? AND sc.remote_deleted=0';
    if(status==='hidden')where+=" AND sc.remote_hidden=1 AND sc.is_spam=0";
    else if(status==='spam')where+=" AND sc.is_spam=1";
    else if(status!=='all'){where+=" AND sc.remote_hidden=0 AND sc.is_spam=0 AND sc.workflow_status=?";binds.push(status);}
    if(q){where+=` AND (lower(COALESCE(sc.post_title,'')) LIKE ? OR lower(COALESCE(sc.commenter_name,'')) LIKE ? OR lower(COALESCE(sc.commenter_username,'')) LIKE ? OR lower(COALESCE(sc.comment_text,'')) LIKE ?)`;for(let i=0;i<4;i++)binds.push(`%${q}%`);}
    const {results}=await env.DB.prepare(`SELECT sc.* FROM social_comments sc
      WHERE ${where}
      ORDER BY COALESCE(NULLIF(sc.remote_created_at,''),sc.created_at) DESC,sc.id DESC LIMIT 250`).bind(...binds).all();
    // D1/SQLite does not reliably allow the outer social_comments alias inside the
    // scalar subquery of a JOIN condition. Fetch the small recent publish-log set
    // once and match IDs in JavaScript instead. This also handles PAGEID_POSTID vs
    // post-only ID shapes without duplicating comment rows.
    const {results:publishLogs}=await env.DB.prepare(`SELECT external_id,article_url,details_json,created_at,updated_at
      FROM social_publish_log WHERE platform=? AND status='published' AND external_id<>'' ORDER BY updated_at DESC LIMIT 300`).bind(platform).all().catch(()=>({results:[]}));
    const comments=(results||[]).map(row=>attachPublishMetadata(row,publishLogs||[])).map(row=>enrichPost(row,settings)).map(row=>({...row,capabilities:capabilities(row,settings)}));
    return json({platform,status,platforms,available:true,comments,counts:c,synced,syncError});
  }catch(e){return json({error:`Social comments could not be loaded: ${e.message||e}`},500);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),id=Math.max(0,Number(b.id||0)||0),action=clean(b.action,60).toLowerCase(),text=clean(b.text||b.reply||b.message,5000);
  if(!id)return json({error:'Comment or review ID is required.'},400);
  if(!['reply','reply_public','delete_admin_reply','edit_admin_reply','typing_on','typing_off','resolve','reopen','like','unlike','hide','unhide','spam','delete','private_message'].includes(action))return json({error:'Choose a supported comment action.'},400);
  try{return json(await performSocialCommentAction(env,{id,action,text}));}
  catch(e){return json({error:e.message||'The requested platform action failed.'},400);}
}
