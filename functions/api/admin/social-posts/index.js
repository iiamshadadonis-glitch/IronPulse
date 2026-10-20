import { json, readJson, requireAdmin } from '../../../_lib/utils.js';
import { getSocialPostCapabilities, validateTargets, processSocialPost, processDueSocialPosts, platformLabel } from '../../../_lib/social-posts.js';

const clean=(v,n=8000)=>String(v??'').trim().slice(0,n);
const bool=v=>v===true||v===1||v==='1'||v==='true'||v==='on';
const num=v=>Math.max(0,Number(v||0)||0);
function tags(v){const a=Array.isArray(v)?v:String(v||'').split(/[\n,]+/);return [...new Set(a.map(x=>clean(x,80).replace(/^#+/,'').replace(/\s+/g,'')).filter(Boolean))].slice(0,30);}
function validType(v){const x=clean(v,20).toLowerCase();return ['text','image','carousel','video','story'].includes(x)?x:'';}
function validMode(v){return clean(v,20).toLowerCase()==='short'?'short':'full';}
function validKind(v){const x=clean(v,20).toLowerCase();return x==='video'?'video':x==='mixed'?'mixed':'image';}
function mediaItems(v){const arr=Array.isArray(v)?v:[];return arr.map(x=>({url:clean(x?.url,3000),id:clean(x?.id,600),name:clean(x?.name,500),mimeType:clean(x?.mimeType||x?.mime,200),kind:validKind(x?.kind||x?.mediaKind||(String(x?.mimeType||x?.mime||'').startsWith('video/')?'video':'image')),altText:clean(x?.altText,1200)})).filter(x=>/^https:\/\//i.test(x.url)).slice(0,20);}
function poll(v){const raw=v&&typeof v==='object'?v:{},enabled=bool(raw.enabled),options=(Array.isArray(raw.options)?raw.options:[]).map(x=>clean(x,25)).filter(Boolean).slice(0,4),duration=['one_day','three_days','seven_days','fourteen_days'].includes(clean(raw.duration,30).toLowerCase())?clean(raw.duration,30).toLowerCase():'one_day',question=clean(raw.question,140);if(enabled&&(!question||options.length<2))throw new Error('An enabled poll needs a question and at least two options.');return {enabled,question,options,duration};}
function scheduleValue(v){const raw=clean(v,80);if(!raw)return '';const d=new Date(raw);if(!Number.isFinite(d.getTime()))throw new Error('Choose a valid schedule date and time.');return d.toISOString();}

async function fullPost(env,id){
  const post=await env.DB.prepare('SELECT * FROM social_posts WHERE id=?').bind(id).first();if(!post)return null;const t=await env.DB.prepare('SELECT * FROM social_post_targets WHERE post_id=? ORDER BY id').bind(id).all();return {...post,tags:JSON.parse(post.tags_json||'[]'),media_items:JSON.parse(post.media_items_json||'[]'),poll:JSON.parse(post.poll_json||'{}'),targets:t.results||[]};
}

export async function onRequestGet({request,env,context}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const u=new URL(request.url),mode=clean(u.searchParams.get('mode')||'schedule',30);
    // Keep overdue schedules moving even while the admin is open.
    try{context?.waitUntil?.(processDueSocialPosts(env,{limit:3}));}catch{}
    if(mode==='capabilities')return json({ok:true,capabilities:await getSocialPostCapabilities(env)});
    if(mode==='post'){
      const id=num(u.searchParams.get('id'));if(!id)return json({error:'Post ID is required.'},400);const post=await fullPost(env,id);return post?json({ok:true,post}):json({error:'Post was not found.'},404);
    }
    const from=clean(u.searchParams.get('from'),80),to=clean(u.searchParams.get('to'),80),limit=Math.min(200,Math.max(20,Number(u.searchParams.get('limit')||120)));
    let q=`SELECT p.*, GROUP_CONCAT(t.platform||':'||t.status,'|') target_summary
      FROM social_posts p LEFT JOIN social_post_targets t ON t.post_id=p.id`;
    const where=[],bind=[];
    if(from){where.push("datetime(COALESCE(NULLIF(p.scheduled_at,''),NULLIF(p.published_at,''),p.created_at))>=datetime(?)");bind.push(from);}
    if(to){where.push("datetime(COALESCE(NULLIF(p.scheduled_at,''),NULLIF(p.published_at,''),p.created_at))<datetime(?)");bind.push(to);}
    if(where.length)q+=` WHERE ${where.join(' AND ')}`;
    q+=` GROUP BY p.id ORDER BY datetime(COALESCE(NULLIF(p.scheduled_at,''),NULLIF(p.published_at,''),p.created_at)) ASC,p.id ASC LIMIT ?`;bind.push(limit);
    const rows=await env.DB.prepare(q).bind(...bind).all(),posts=[];
    for(const r of rows.results||[]){const tg=await env.DB.prepare('SELECT id,platform,status,external_id,external_url,error_text,published_at FROM social_post_targets WHERE post_id=? ORDER BY id').bind(r.id).all();posts.push({...r,tags:JSON.parse(r.tags_json||'[]'),media_items:JSON.parse(r.media_items_json||'[]'),poll:JSON.parse(r.poll_json||'{}'),targets:tg.results||[]});}
    return json({ok:true,posts});
  }catch(e){return json({error:e.message||'Posts schedule could not be loaded.'},400);}
}

export async function onRequestPost({request,env,context}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const b=await readJson(request),action=clean(b.action||'create',40).toLowerCase();
    if(action==='run_due')return json(await processDueSocialPosts(env,{limit:Math.min(10,Math.max(1,Number(b.limit||5)))}));
    if(action==='reschedule'){
      const id=num(b.postId),at=scheduleValue(b.scheduledAt);if(!id||!at)return json({error:'Post ID and schedule date/time are required.'},400);if(Date.parse(at)<=Date.now()+30000)return json({error:'Choose a schedule time at least 30 seconds in the future, or use Post Now.'},400);
      await env.DB.batch([
        env.DB.prepare("UPDATE social_posts SET scheduled_at=?,status='scheduled',published_at='',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'cancelled'").bind(at,id),
        env.DB.prepare("UPDATE social_post_targets SET status='scheduled',error_text='',updated_at=CURRENT_TIMESTAMP WHERE post_id=? AND status IN ('scheduled','pending','failed')").bind(id)
      ]);return json({ok:true,message:'Schedule updated successfully.',post:await fullPost(env,id)});
    }
    if(action==='cancel_target'){
      const id=num(b.targetId);if(!id)return json({error:'Target ID is required.'},400);const row=await env.DB.prepare('SELECT post_id,platform,status FROM social_post_targets WHERE id=?').bind(id).first();if(!row)return json({error:'Scheduled platform target was not found.'},404);if(row.status==='published')return json({error:`${platformLabel(row.platform)} is already published and cannot be removed by cancelling its schedule.`},409);
      await env.DB.prepare("UPDATE social_post_targets SET status='cancelled',error_text='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();const left=await env.DB.prepare("SELECT COUNT(*) c FROM social_post_targets WHERE post_id=? AND status<>'cancelled'").bind(row.post_id).first();if(!Number(left?.c||0))await env.DB.prepare("UPDATE social_posts SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.post_id).run();return json({ok:true,message:`${platformLabel(row.platform)} was removed from this schedule.`,post:await fullPost(env,row.post_id)});
    }
    if(action==='cancel_post'){
      const id=num(b.postId);if(!id)return json({error:'Post ID is required.'},400);await env.DB.batch([env.DB.prepare("UPDATE social_posts SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'published'").bind(id),env.DB.prepare("UPDATE social_post_targets SET status='cancelled',error_text='',updated_at=CURRENT_TIMESTAMP WHERE post_id=? AND status<>'published'").bind(id)]);return json({ok:true,message:'The remaining schedule was cancelled.',post:await fullPost(env,id)});
    }
    if(action==='retry_target'){
      const targetId=num(b.targetId),row=await env.DB.prepare('SELECT post_id,status FROM social_post_targets WHERE id=?').bind(targetId).first();if(!row)return json({error:'Target was not found.'},404);if(row.status==='published')return json({error:'This platform target is already published.'},409);await env.DB.prepare("UPDATE social_post_targets SET status='pending',error_text='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(targetId).run();const out=await processSocialPost(env,row.post_id,{onlyTargetId:targetId});return json({ok:true,...out,post:await fullPost(env,row.post_id)});
    }
    if(action==='publish_now'){
      const id=num(b.postId);if(!id)return json({error:'Post ID is required.'},400);await env.DB.prepare("UPDATE social_post_targets SET status='pending',error_text='',updated_at=CURRENT_TIMESTAMP WHERE post_id=? AND status IN ('scheduled','failed','pending')").bind(id).run();await env.DB.prepare("UPDATE social_posts SET scheduled_at='',status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'cancelled'").bind(id).run();const out=await processSocialPost(env,id);return json({ok:true,...out,post:await fullPost(env,id)});
    }
    if(action!=='create')return json({error:'Unsupported Posts action.'},400);

    const postType=validType(b.postType||b.post_type);if(!postType)return json({error:'Choose Text Post, Image, Carousel, Video, or Story / Status.'},400);
    const videoMode=postType==='video'?validMode(b.videoMode||b.video_mode):'',mediaKind=postType==='carousel'?validKind(b.carouselMode||b.carousel_mode||b.mediaKind||b.media_kind):(postType==='story'?validKind(b.mediaKind||b.media_kind):(postType==='image'?'image':postType==='video'?'video':''));
    const carouselItems=postType==='carousel'?mediaItems(b.mediaItems||b.media_items):[],mediaUrl=postType==='carousel'?(carouselItems[0]?.url||clean(b.mediaUrl||b.media_url,3000)):clean(b.mediaUrl||b.media_url,3000),title=clean(b.title,300),bodyText=clean(b.bodyText||b.body_text,8000),caption=clean(b.caption,8000),tagList=tags(b.tags),pollData=poll(b.poll),firstCommentEnabled=bool(b.firstCommentEnabled),firstCommentText=clean(b.firstCommentText,2500),targetList=[...new Set((Array.isArray(b.targets)?b.targets:[]).map(x=>clean(x,30).toLowerCase()).filter(Boolean))];
    if(postType==='text'&&!bodyText)return json({error:'Enter the text you want to publish.'},400);
    if(postType==='carousel'){if(carouselItems.length<2)return json({error:'Upload at least two carousel items to Google Drive before publishing.'},400);if(mediaKind==='image'&&carouselItems.some(x=>x.kind!=='image'))return json({error:'Image Carousel accepts images only.'},400);if(mediaKind==='video'&&carouselItems.some(x=>x.kind!=='video'))return json({error:'Video Carousel accepts videos only.'},400);if(mediaKind==='mixed'&&!carouselItems.some(x=>x.kind==='image'))return json({error:'Image + Video Carousel needs at least one image.'},400);if(mediaKind==='mixed'&&!carouselItems.some(x=>x.kind==='video'))return json({error:'Image + Video Carousel needs at least one video.'},400);}
    else if(postType!=='text'&&!/^https:\/\//i.test(mediaUrl))return json({error:'Upload the media to Google Drive first. A public HTTPS media URL is required before publishing or scheduling.'},400);
    if(!targetList.length)return json({error:'Select at least one eligible platform.'},400);
    const validation=await validateTargets(env,{post_type:postType,video_mode:videoMode,media_kind:mediaKind,carousel_mode:mediaKind},targetList);if(validation.invalid.length)return json({error:`One or more selected platforms are not eligible: ${validation.invalid.map(x=>`${x.label}: ${x.reason}`).join(' | ')}`,invalidTargets:validation.invalid},409);
    const scheduledAt=scheduleValue(b.scheduledAt),scheduled=!!scheduledAt;if(scheduled&&Date.parse(scheduledAt)<=Date.now()+30000)return json({error:'Choose a schedule time at least 30 seconds in the future, or turn Schedule Later off to publish immediately.'},400);
    const status=scheduled?'scheduled':'pending';
    const ins=await env.DB.prepare(`INSERT INTO social_posts(post_type,video_mode,media_kind,title,body_text,caption,alt_text,tags_json,first_comment_enabled,first_comment_text,media_url,media_drive_file_id,media_name,media_mime,media_items_json,poll_json,scheduled_at,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`).bind(postType,videoMode,mediaKind,title,bodyText,caption,clean(b.altText,1200),JSON.stringify(tagList),firstCommentEnabled?1:0,firstCommentText,mediaUrl,clean(b.mediaDriveFileId||carouselItems[0]?.id,600),clean(b.mediaName||carouselItems[0]?.name,500),clean(b.mediaMime||carouselItems[0]?.mimeType,200),JSON.stringify(carouselItems),JSON.stringify(pollData),scheduledAt,status).first();const id=Number(ins?.id||0);if(!id)throw new Error('The post could not be saved to the scheduler.');
    for(const p of validation.valid)await env.DB.prepare('INSERT INTO social_post_targets(post_id,platform,status,created_at,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(id,p,status).run();
    if(scheduled)return json({ok:true,postId:id,status:'scheduled',message:`Post scheduled for ${new Date(scheduledAt).toLocaleString('en-IN')}.`,post:await fullPost(env,id)});
    const out=await processSocialPost(env,id);return json({ok:true,postId:id,...out,post:await fullPost(env,id)});
  }catch(e){return json({error:e.message||'The social post action could not be completed.'},400);}
}
