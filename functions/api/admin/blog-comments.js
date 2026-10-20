import { json, readJson, requireAdmin } from '../../_lib/utils.js';

function clean(v='',max=1000){return String(v||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);}
function normalizeStatus(v='new'){const s=String(v||'new').toLowerCase();return ['new','in_progress','responded','resolved','all'].includes(s)?s:'new';}
function articleMessage(parent){return `Comment on fitness tip ${String(parent?.post_title||'Fitness Tip')}: ${String(parent?.comment_text||'')}`.trim();}

async function findCommentInquiry(env,parent){
  if(!parent)return null;
  const id=Number(parent.id||0),leadId=Number(parent.lead_id||0);
  if(id){
    const byPayload=await env.DB.prepare("SELECT * FROM lead_submissions WHERE submission_type='comment' AND payload_json LIKE ? ORDER BY id DESC LIMIT 1").bind(`%\"seo_comment_id\":${id}%`).first().catch(()=>null);
    if(byPayload)return byPayload;
  }
  if(leadId){
    const title=String(parent.post_title||'').slice(0,100),comment=String(parent.comment_text||'').slice(0,80);
    const sql=comment
      ?"SELECT * FROM lead_submissions WHERE lead_id=? AND submission_type='comment' AND lower(COALESCE(status,'new'))<>'deleted' AND message LIKE ? AND message LIKE ? ORDER BY id DESC LIMIT 1"
      :"SELECT * FROM lead_submissions WHERE lead_id=? AND submission_type='comment' AND lower(COALESCE(status,'new'))<>'deleted' AND message LIKE ? ORDER BY id DESC LIMIT 1";
    const stmt=env.DB.prepare(sql),byLead=comment?await stmt.bind(leadId,`%${title}%`,`%${comment}%`).first().catch(()=>null):await stmt.bind(leadId,`%${title}%`).first().catch(()=>null);
    if(byLead)return byLead;
  }
  return null;
}
async function setInquiryStatus(env,parent,status){
  const inquiry=await findCommentInquiry(env,parent);if(!inquiry)return null;
  const resolved=status==='resolved'||status==='responded';
  await env.DB.prepare(`UPDATE lead_submissions SET status=?,resolved_at=${resolved?'CURRENT_TIMESTAMP':'NULL'},updated_at=CURRENT_TIMESTAMP,source_detail='article_comment',message=CASE WHEN message LIKE 'Blog comment on %' THEN replace(message,'Blog comment on ','Comment on fitness tip ') ELSE message END WHERE id=?`)
    .bind(resolved?'resolved':status,Number(inquiry.id)).run().catch(()=>{});
  return inquiry;
}
async function addReplyHistory(env,parent,reply,image=''){
  if(!parent?.lead_id)return;
  const payload={seo_comment_id:Number(parent.id||0),parent_comment_id:Number(parent.id||0),seo_post_id:String(parent.seo_post_id||''),article_slug:String(parent.post_slug||''),article_title:String(parent.post_title||''),reply:String(reply||''),image_url:String(image||''),source:'article_comment_reply'};
  await env.DB.prepare(`INSERT INTO lead_submissions(lead_id,submission_type,visitor_id,source_detail,message,payload_json,status,resolved_at,updated_at,created_at)
    VALUES(?,'comment_reply','','article_comment_reply',?,?,'responded',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
    .bind(Number(parent.lead_id),`Admin replied on fitness tip ${parent.post_title||'Fitness Tip'}: ${reply||'[image reply]'}`,JSON.stringify(payload)).run().catch(()=>{});
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),summary=u.searchParams.get('summary')==='1',status=normalizeStatus(u.searchParams.get('status')||'new'),q=clean(u.searchParams.get('q'),120).toLowerCase();
  try{
    await env.DB.prepare("UPDATE seo_comments SET workflow_status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE is_admin=0 AND workflow_status='new' AND created_at<=datetime('now','-48 hours')").run().catch(()=>{});
    const counts=await env.DB.prepare(`SELECT
      SUM(CASE WHEN is_admin=0 AND workflow_status='new' THEN 1 ELSE 0 END) new_count,
      SUM(CASE WHEN is_admin=0 AND workflow_status='in_progress' THEN 1 ELSE 0 END) in_progress_count,
      SUM(CASE WHEN is_admin=0 AND workflow_status='responded' THEN 1 ELSE 0 END) responded_count,
      SUM(CASE WHEN is_admin=0 AND workflow_status='resolved' THEN 1 ELSE 0 END) resolved_count,
      SUM(CASE WHEN is_admin=0 THEN 1 ELSE 0 END) all_count FROM seo_comments`).first();
    if(summary)return json({new_count:Number(counts?.new_count||0),in_progress_count:Number(counts?.in_progress_count||0),responded_count:Number(counts?.responded_count||0),resolved_count:Number(counts?.resolved_count||0),all_count:Number(counts?.all_count||0)});
    const binds=[];let where='c.is_admin=0';if(status!=='all'){where+=' AND c.workflow_status=?';binds.push(status);}if(q){where+=` AND (lower(c.post_title) LIKE ? OR lower(c.name) LIKE ? OR lower(c.comment_text) LIKE ? OR lower(c.whatsapp) LIKE ?)`;for(let i=0;i<4;i++)binds.push('%'+q+'%');}
    const stmt=env.DB.prepare(`SELECT c.*,l.name AS lead_name,l.phone AS lead_phone,l.email AS lead_email,
      (SELECT r.comment_text FROM seo_comments r WHERE r.parent_comment_id=c.id AND r.is_admin=1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS admin_reply_text,
      (SELECT r.image_url FROM seo_comments r WHERE r.parent_comment_id=c.id AND r.is_admin=1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS admin_reply_image,
      (SELECT r.created_at FROM seo_comments r WHERE r.parent_comment_id=c.id AND r.is_admin=1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS admin_reply_at,
      (SELECT r.name FROM seo_comments r WHERE r.parent_comment_id=c.id AND r.is_admin=1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS admin_reply_author
      FROM seo_comments c LEFT JOIN contact_leads l ON l.id=c.lead_id WHERE ${where} ORDER BY c.created_at DESC,c.id DESC LIMIT 250`).bind(...binds);
    const {results}=await stmt.all();
    return json({comments:results||[],status,counts:{new:Number(counts?.new_count||0),in_progress:Number(counts?.in_progress_count||0),responded:Number(counts?.responded_count||0),resolved:Number(counts?.resolved_count||0),all:Number(counts?.all_count||0)}});
  }catch(e){return json({error:`Comments could not be loaded: ${e.message}`},500);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),id=Math.max(0,Number(b.id||0)||0),action=String(b.action||'').toLowerCase();if(!id)return json({error:'Comment ID is required.'},400);
  const parent=await env.DB.prepare('SELECT * FROM seo_comments WHERE id=? AND is_admin=0').bind(id).first();if(!parent)return json({error:'Comment not found.'},404);
  if(action==='reply'){
    const existingReply=await env.DB.prepare('SELECT id FROM seo_comments WHERE parent_comment_id=? AND is_admin=1 ORDER BY id DESC LIMIT 1').bind(id).first().catch(()=>null);
    if(existingReply)return json({error:'This comment already has an admin response. If the visitor replies again, that new visitor comment will appear separately and can be answered as a new item.'},409);
    const reply=clean(b.reply,1200),image=String(b.image_url||'').trim().slice(0,2000);if(!reply&&!image)return json({error:'Write a reply, add an emoji, or add an image URL before sending.'},400);
    if(image){try{const u=new URL(image);if(!['http:','https:'].includes(u.protocol))throw new Error('bad protocol');}catch(_){return json({error:'Image URL must be a valid public http:// or https:// link.'},400);}}
    await env.DB.prepare(`INSERT INTO seo_comments(seo_post_id,post_slug,post_title,post_image,parent_comment_id,lead_id,name,whatsapp,comment_text,image_url,is_admin,workflow_status,visibility,visitor_id,ip_hash,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,'',?,?,1,'responded','published','','',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(parent.seo_post_id,parent.post_slug,parent.post_title,parent.post_image,id,parent.lead_id||null,'IronPulse Gym Admin',reply,image).run();
    await env.DB.prepare("UPDATE seo_comments SET workflow_status='responded',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    await setInquiryStatus(env,parent,'responded');
    await addReplyHistory(env,parent,reply,image);
    return json({ok:true,status:'responded',inquiry_status:'resolved'});
  }
  if(action==='resolve'){
    await env.DB.prepare("UPDATE seo_comments SET workflow_status='resolved',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    await setInquiryStatus(env,parent,'resolved');
    return json({ok:true,status:'resolved',inquiry_status:'resolved'});
  }
  if(action==='reopen'){
    await env.DB.prepare("UPDATE seo_comments SET workflow_status='new',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    await setInquiryStatus(env,parent,'new');
    return json({ok:true,status:'new',inquiry_status:'new'});
  }
  return json({error:'Unsupported comment action.'},400);
}

export async function onRequestDelete({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const u=new URL(request.url),id=Math.max(0,Number(u.searchParams.get('id')||0)||0);if(!id)return json({error:'Comment ID is required.'},400);
  const parent=await env.DB.prepare('SELECT * FROM seo_comments WHERE id=? AND is_admin=0').bind(id).first().catch(()=>null);
  if(parent){
    const inquiry=await findCommentInquiry(env,parent);
    if(inquiry)await env.DB.prepare("UPDATE lead_submissions SET status='deleted',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(inquiry.id)).run().catch(()=>{});
    if(parent.lead_id)await env.DB.prepare("UPDATE lead_submissions SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE lead_id=? AND submission_type='comment_reply' AND payload_json LIKE ?").bind(Number(parent.lead_id),`%\"parent_comment_id\":${id}%`).run().catch(()=>{});
  }
  await env.DB.prepare(`WITH RECURSIVE descendants(id) AS (SELECT id FROM seo_comments WHERE id=? UNION ALL SELECT c.id FROM seo_comments c JOIN descendants d ON c.parent_comment_id=d.id) DELETE FROM seo_comments WHERE id IN (SELECT id FROM descendants)`).bind(id).run();
  return json({ok:true,deleted:true,inquiry_removed:!!parent});
}
