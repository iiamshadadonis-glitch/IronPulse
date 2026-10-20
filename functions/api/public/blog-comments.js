import { json, readJson, sha256Hex, normalizePhone } from '../../_lib/utils.js';
import { getSeoPostById } from '../../_lib/seo-posts.js';
import { findLeadByIdentity, mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

function clean(v='',max=600){return String(v||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);}
function rowOut(r){return {id:Number(r.id||0),seo_post_id:String(r.seo_post_id||''),post_slug:String(r.post_slug||''),parent_comment_id:r.parent_comment_id?Number(r.parent_comment_id):null,lead_id:r.lead_id?Number(r.lead_id):null,name:String(r.name||''),comment_text:String(r.comment_text||''),image_url:String(r.image_url||''),is_admin:Number(r.is_admin||0),workflow_status:String(r.workflow_status||'new'),created_at:r.created_at,updated_at:r.updated_at};}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),slug=clean(u.searchParams.get('slug'),180),postId=clean(u.searchParams.get('post_id'),100);
  if(!slug&&!postId)return json({comments:[]},200,{'cache-control':'no-store'});
  const where=postId?'seo_post_id=?':'post_slug=?',value=postId||slug;
  try{
    const {results}=await env.DB.prepare(`SELECT * FROM seo_comments WHERE ${where} AND visibility='published' ORDER BY created_at ASC,id ASC LIMIT 250`).bind(value).all();
    return json({comments:(results||[]).map(rowOut)},200,{'cache-control':'no-store'});
  }catch(e){return json({comments:[],error:'Comments could not be loaded.'},200,{'cache-control':'no-store'});}
}

export async function onRequestPost({request,env}){
  const b=await readJson(request),postId=clean(b.post_id,100),slug=clean(b.slug,180),name=clean(b.name,80),comment=clean(b.comment,800),visitorId=clean(b.visitor_id,100),parentId=Math.max(0,Number(b.parent_comment_id||0)||0);
  const whatsapp=normalizePhone(clean(b.whatsapp,30));
  if(!postId||!slug||!name||!comment)return json({error:'Name and comment are required.'},400);
  if(comment.length<2)return json({error:'Please write a slightly longer comment.'},400);
  let remote;
  try{remote=await getSeoPostById(env,postId);}catch{return json({error:'This dance class update is not available for comments.'},404);}
  if(String(remote.slug||'')!==slug||String(remote.status||'')!=='published')return json({error:'This dance class update is not available for comments.'},404);
  if(parentId){const parent=await env.DB.prepare("SELECT id FROM seo_comments WHERE id=? AND seo_post_id=? AND visibility='published'").bind(parentId,postId).first();if(!parent)return json({error:'The comment you are replying to is no longer available.'},404);}
  const rawIp=request.headers.get('CF-Connecting-IP')||'',ipHash=rawIp?await sha256Hex(rawIp):'';
  const recent=await env.DB.prepare("SELECT COUNT(*) AS total FROM seo_comments WHERE is_admin=0 AND (ip_hash=? OR (visitor_id<>'' AND visitor_id=?)) AND created_at>=datetime('now','-10 minutes')").bind(ipHash,visitorId).first().catch(()=>({total:0}));
  if(Number(recent?.total||0)>=5)return json({error:'Too many comments were submitted recently. Please wait a few minutes and try again.'},429);

  let leadId=null,submissionId=0;
  try{
    const found=await findLeadByIdentity(env,{visitor_id:visitorId,phone:whatsapp});
    leadId=found?.lead?.id||null;
    const merged=await mergeLeadSubmission(env,{
      name,phone:whatsapp,visitor_id:visitorId,
      message:`Comment on article ${remote.title}: ${comment}`,
      source:'article_comment',source_detail:'article_comment',
      article_title:String(remote.title||''),article_slug:slug,seo_post_id:postId
    },{submissionType:'comment',source:'article_comment',sourceDetail:'article_comment'});
    leadId=merged?.lead?.id||leadId;submissionId=Number(merged?.submission_id||0)||0;
  }catch{}
  const res=await env.DB.prepare(`INSERT INTO seo_comments(seo_post_id,post_slug,post_title,post_image,parent_comment_id,lead_id,name,whatsapp,comment_text,image_url,is_admin,workflow_status,visibility,visitor_id,ip_hash,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,'',0,'new','published',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(postId,slug,remote.title||'',remote.cover_image_url||'',parentId||null,leadId,name,whatsapp,comment,visitorId,ipHash).run();
  const commentId=Number(res.meta.last_row_id||0)||0;
  await bumpAdminActivity(env,'comments').catch(()=>{});
  if(submissionId){
    const payload={name,phone:whatsapp,visitor_id:visitorId,message:`Comment on article ${remote.title}: ${comment}`,source:'article_comment',source_detail:'article_comment',submission_type:'comment',article_title:String(remote.title||''),article_slug:slug,seo_post_id:postId,seo_comment_id:commentId};
    await env.DB.prepare("UPDATE lead_submissions SET source_detail='article_comment',message=?,payload_json=?,status='new',updated_at=CURRENT_TIMESTAMP WHERE id=? AND submission_type='comment'").bind(payload.message,JSON.stringify(payload),submissionId).run().catch(()=>{});
  }
  const row=await env.DB.prepare('SELECT * FROM seo_comments WHERE id=?').bind(commentId).first();
  return json({ok:true,comment:rowOut(row)});
}
