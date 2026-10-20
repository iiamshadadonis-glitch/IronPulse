import { json, readJson, requireAdmin, normalizePhone, rupeesToPaise } from '../../_lib/utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const STATUSES = new Set(['new','hot','contacted','cold','converted','closed']);

function cleanText(value, max=2000){ return String(value ?? '').trim().slice(0,max); }

const INQUIRY_STATUSES = new Set(['new','in_progress','resolved']);
function inquiryStatusSql(alias='s'){
  return `lower(COALESCE(${alias}.status,'new'))`;
}
async function listInquiries(env, status='new', q=''){
  const requested=String(status||'new').toLowerCase();
  const search=cleanText(q,200);
  const binds=[];
  let statusSql='1=1';
  if(INQUIRY_STATUSES.has(requested)){ statusSql=`inquiry_status=?`; binds.push(requested); }

  // Real contact-form submissions are the primary source. LEFT JOIN prevents a
  // historical/orphaned submission from silently disappearing from the admin list.
  // The UNION also surfaces old contact_leads that pre-date lead_submissions so the
  // existing enquiry count and the visible list stay consistent after upgrades.
  let searchSql='';
  if(search){
    const like=`%${search}%`;
    searchSql=' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR message LIKE ? OR source_detail LIKE ?)';
    binds.push(like,like,like,like,like);
  }
  const sql=`WITH inquiry_rows AS (
    SELECT s.id inquiry_id,s.lead_id,s.submission_type,s.visitor_id,s.source_detail,s.message,
           lower(COALESCE(s.status,'new')) inquiry_status,s.resolved_at,s.updated_at,s.created_at,
           COALESCE(l.name,'Client') name,COALESCE(l.phone,'') phone,COALESCE(l.email,'') email,
           COALESCE(l.status,'new') lead_status,COALESCE(l.source,'website') lead_source,0 legacy
    FROM lead_submissions s
    LEFT JOIN contact_leads l ON l.id=s.lead_id
    WHERE s.submission_type IN ('contact','comment') AND lower(COALESCE(s.status,'new'))<>'deleted'
    UNION ALL
    SELECT 0 inquiry_id,l.id lead_id,'contact' submission_type,COALESCE(l.visitor_id,'') visitor_id,
           COALESCE(l.source,'website') source_detail,COALESCE(l.message,'') message,
           CASE WHEN lower(COALESCE(l.status,'new')) IN ('closed','converted') THEN 'resolved'
                WHEN lower(COALESCE(l.status,'new')) IN ('contacted','cold') THEN 'in_progress'
                ELSE 'new' END inquiry_status,
           CASE WHEN lower(COALESCE(l.status,'new')) IN ('closed','converted') THEN COALESCE(l.updated_at,l.created_at) ELSE NULL END resolved_at,
           COALESCE(l.updated_at,l.created_at) updated_at,l.created_at,
           COALESCE(l.name,'Client') name,COALESCE(l.phone,'') phone,COALESCE(l.email,'') email,
           COALESCE(l.status,'new') lead_status,COALESCE(l.source,'website') lead_source,1 legacy
    FROM contact_leads l
    WHERE NOT EXISTS (SELECT 1 FROM lead_submissions s2 WHERE s2.lead_id=l.id AND s2.submission_type IN ('contact','comment'))
  )
  SELECT * FROM inquiry_rows WHERE ${statusSql}${searchSql}
  ORDER BY COALESCE(updated_at,created_at) DESC,lead_id DESC LIMIT 500`;
  const {results}=await env.DB.prepare(sql).bind(...binds).all();
  return results||[];
}
async function inquiryCounts(env){
  const row=await env.DB.prepare(`WITH inquiry_rows AS (
    SELECT lower(COALESCE(s.status,'new')) inquiry_status
    FROM lead_submissions s
    WHERE s.submission_type IN ('contact','comment') AND lower(COALESCE(s.status,'new'))<>'deleted'
    UNION ALL
    SELECT CASE WHEN lower(COALESCE(l.status,'new')) IN ('closed','converted') THEN 'resolved'
                WHEN lower(COALESCE(l.status,'new')) IN ('contacted','cold') THEN 'in_progress'
                ELSE 'new' END inquiry_status
    FROM contact_leads l
    WHERE NOT EXISTS (SELECT 1 FROM lead_submissions s2 WHERE s2.lead_id=l.id AND s2.submission_type IN ('contact','comment'))
  )
  SELECT SUM(CASE WHEN inquiry_status='new' THEN 1 ELSE 0 END) new_count,
         SUM(CASE WHEN inquiry_status='in_progress' THEN 1 ELSE 0 END) in_progress_count,
         SUM(CASE WHEN inquiry_status='resolved' THEN 1 ELSE 0 END) resolved_count,
         COUNT(*) all_count
  FROM inquiry_rows`).first().catch(()=>({}));
  return {new_count:Number(row?.new_count||0),in_progress_count:Number(row?.in_progress_count||0),resolved_count:Number(row?.resolved_count||0),all_count:Number(row?.all_count||0)};
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const url=new URL(request.url);
  if(url.searchParams.get('mode')==='inquiries'){
    const status=url.searchParams.get('status')||'new';
    const q=url.searchParams.get('q')||'';
    const inquiries=await listInquiries(env,status,q);
    const counts=await inquiryCounts(env);
    return json({inquiries,...counts});
  }
  const id=url.searchParams.get('id');
  if(id){
    const lead = await env.DB.prepare(`
      SELECT l.*,
             COUNT(v.id) visit_count,
             COALESCE(SUM(v.duration_ms),0) time_spent_ms,
             GROUP_CONCAT(DISTINCT v.path) visited_pages,
             MIN(v.created_at) first_visit,
             MAX(v.created_at) last_visit
      FROM contact_leads l
      LEFT JOIN visitor_events v ON v.visitor_id=l.visitor_id
      WHERE l.id=?
      GROUP BY l.id
    `).bind(id).first();
    if(!lead)return json({error:'Lead not found'},404);
    const phone=String(lead.phone||'');
    const email=String(lead.email||'');
    const orderId=String(lead.order_id||'');
    const subId=String(lead.gateway_subscription_id||'');
    const payId=String(lead.gateway_payment_id||'');
    const localDigits=phone.replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'');
    let orders=[];
    try{
      const where=[]; const binds=[];
      if(localDigits){
        const like=`%${localDigits}%`;
        where.push('(customer_phone LIKE ? OR website_phone LIKE ? OR razorpay_phone LIKE ?)');
        binds.push(like,like,like);
      }
      if(email){where.push('lower(customer_email)=lower(?)');binds.push(email);}
      if(orderId){where.push('order_id=?');binds.push(orderId);}
      if(subId){where.push('gateway_subscription_id=?');binds.push(subId);}
      if(payId){where.push('gateway_payment_id=?');binds.push(payId);}
      if(where.length){
        const stmt=env.DB.prepare(`SELECT * FROM orders WHERE ${where.join(' OR ')} ORDER BY id DESC LIMIT 25`);
        const r=await stmt.bind(...binds).all();
        orders=r.results||[];
      }
    }catch(_){ }
    return json({lead,orders});
  }

  const status=url.searchParams.get('status')||'';
  const exportAll=url.searchParams.get('export')==='1';
  const suffix=exportAll?'':' LIMIT 500';
  const sql=status
    ? `SELECT * FROM contact_leads WHERE status=? ORDER BY id DESC${suffix}`
    : `SELECT * FROM contact_leads ORDER BY id DESC${suffix}`;
  const stmt=status?env.DB.prepare(sql).bind(status):env.DB.prepare(sql);
  const {results}=await stmt.all();
  return json({leads:results||[]});
}

export async function onRequestPut({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);
  const id=Number(b.id||0);
  if(!id)return json({error:'Lead ID is required'},400);
  const current=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(id).first();
  if(!current)return json({error:'Lead not found'},404);

  const name=cleanText(b.name ?? current.name,160);
  const rawPhone=cleanText(b.phone ?? current.phone,40);
  const phone=rawPhone?normalizePhone(rawPhone):'';
  const email=cleanText(b.email ?? current.email,220).toLowerCase();
  const status=cleanText(b.status ?? current.status,30).toLowerCase();
  if(email && !EMAIL_RE.test(email))return json({error:'Enter a valid email address in the format name@domain.com.'},400);
  if(status && !STATUSES.has(status))return json({error:'Invalid lead status.'},400);
  if(phone && !/^\d{8,15}$/.test(phone))return json({error:'Enter a valid WhatsApp number using digits only.'},400);

  const followUp=cleanText(b.follow_up_date ?? current.follow_up_date,20);
  const lastContactMethod=cleanText(b.last_contact_method ?? current.last_contact_method,40);
  const lastContactedAt=cleanText(b.last_contacted_at ?? current.last_contacted_at,40);
  const nextAction=cleanText(b.next_action ?? current.next_action,500);
  const outcome=cleanText(b.outcome ?? current.outcome,500);
  const notes=cleanText(b.notes ?? current.notes,5000);
  const purchaseType=cleanText(b.purchase_type ?? current.purchase_type,80);
  const customLink=cleanText(b.custom_subscription_link ?? current.custom_subscription_link,1000);
  const orderId=cleanText(b.order_id ?? current.order_id,160);
  const subId=cleanText(b.gateway_subscription_id ?? current.gateway_subscription_id,160);
  const payId=cleanText(b.gateway_payment_id ?? current.gateway_payment_id,160);
  const saleAmountPaise = b.sale_amount_rupees !== undefined ? rupeesToPaise(b.sale_amount_rupees) : Number(current.sale_amount_paise||0);

  await env.DB.prepare(`UPDATE contact_leads SET
    name=?, phone=?, email=?, status=?, follow_up_date=?, next_action=?, last_contact_method=?, outcome=?, notes=?, purchase_type=?, custom_subscription_link=?, order_id=?, gateway_subscription_id=?, gateway_payment_id=?, sale_amount_paise=?, last_contacted_at=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?`).bind(name,phone,email,status||'new',followUp,nextAction,lastContactMethod,outcome,notes,purchaseType,customLink,orderId,subId,payId,saleAmountPaise,lastContactedAt,id).run();

  return json({ok:true,message:'Lead details updated successfully.'});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);
  if(b.action==='mark_inquiries_seen'){
    const ids=[...new Set((Array.isArray(b.inquiry_ids)?b.inquiry_ids:[]).map(x=>Number(x||0)).filter(x=>x>0))].slice(0,500);
    const legacyIds=[...new Set((Array.isArray(b.legacy_lead_ids)?b.legacy_lead_ids:[]).map(x=>Number(x||0)).filter(x=>x>0))].slice(0,500);
    if(ids.length){
      const qs=ids.map(()=>'?').join(',');
      await env.DB.prepare(`UPDATE lead_submissions SET status='in_progress',resolved_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id IN (${qs}) AND submission_type IN ('contact','comment') AND lower(COALESCE(status,'new'))='new'`).bind(...ids).run();
    }
    for(const leadId of legacyIds){
      const lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(leadId).first().catch(()=>null);if(!lead)continue;
      const exists=await env.DB.prepare("SELECT id FROM lead_submissions WHERE lead_id=? AND submission_type IN ('contact','comment') LIMIT 1").bind(leadId).first().catch(()=>null);if(exists)continue;
      const isComment=/comment/i.test(String(lead.source||''))||/^Blog comment on |^Comment on article /i.test(String(lead.message||'')),type=isComment?'comment':'contact',detail=isComment?'article_comment':String(lead.source||'website'),message=String(lead.message||'').replace(/^Blog comment on /i,'Comment on fitness tip ');
      await env.DB.prepare(`INSERT INTO lead_submissions(lead_id,submission_type,visitor_id,source_detail,message,payload_json,status,resolved_at,updated_at,created_at)
        VALUES(?,?,?,?,?,'{}','in_progress',NULL,CURRENT_TIMESTAMP,COALESCE(?,CURRENT_TIMESTAMP))`).bind(leadId,type,String(lead.visitor_id||''),detail,message,lead.created_at||'').run().catch(()=>{});
    }
    return json({ok:true,seen_count:ids.length+legacyIds.length});
  }
  if(b.action==='inquiry_status'){
    const inquiryId=Number(b.inquiry_id||0),leadId=Number(b.lead_id||0),status=cleanText(b.status,30).toLowerCase();
    if(!INQUIRY_STATUSES.has(status) || (!inquiryId&&!leadId))return json({error:'Valid inquiry/lead ID and status are required.'},400);
    if(inquiryId){
      await env.DB.prepare("UPDATE lead_submissions SET status=?,resolved_at=CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND submission_type IN ('contact','comment')").bind(status,status,inquiryId).run();
    }else{
      const lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(leadId).first();
      if(!lead)return json({error:'Client record not found.'},404);
      const isComment=/comment/i.test(String(lead.source||''))||/^Blog comment on |^Comment on article /i.test(String(lead.message||'')),type=isComment?'comment':'contact',detail=isComment?'article_comment':String(lead.source||'website'),message=String(lead.message||'').replace(/^Blog comment on /i,'Comment on fitness tip ');
      await env.DB.prepare(`INSERT INTO lead_submissions(lead_id,submission_type,visitor_id,source_detail,message,payload_json,status,resolved_at,updated_at,created_at)
        VALUES(?, ?, ?, ?, ?, '{}', ?, CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, COALESCE(?,CURRENT_TIMESTAMP))`)
        .bind(leadId,type,String(lead.visitor_id||''),detail,message,status,status,lead.created_at||'').run();
    }
    return json({ok:true,status});
  }
  if(!b.id || !b.status)return json({error:'Lead ID and status are required'},400);
  const status=cleanText(b.status,30).toLowerCase();
  if(!STATUSES.has(status))return json({error:'Invalid lead status.'},400);
  await env.DB.prepare('UPDATE contact_leads SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,b.id).run();
  return json({ok:true});
}

export async function onRequestDelete({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const url=new URL(request.url);
  const inquiryId=Number(url.searchParams.get('inquiry_id')||0);
  const legacyLeadId=Number(url.searchParams.get('legacy_lead_id')||0);
  if(inquiryId){
    await env.DB.prepare("UPDATE lead_submissions SET status='deleted', updated_at=CURRENT_TIMESTAMP WHERE id=? AND submission_type IN ('contact','comment')").bind(inquiryId).run();
    return json({ok:true,message:'Inquiry removed from the enquiry workspace. The client record remains available.'});
  }
  if(legacyLeadId){
    // Historical leads did not have a separate inquiry row. Create a hidden
    // tombstone submission so it does not reappear through the legacy fallback.
    const lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(legacyLeadId).first();
    if(!lead)return json({error:'Client record not found.'},404);
    await env.DB.prepare(`INSERT INTO lead_submissions(lead_id,submission_type,visitor_id,source_detail,message,payload_json,status,updated_at,created_at)
      VALUES(?, 'contact', ?, ?, ?, '{}', 'deleted', CURRENT_TIMESTAMP, COALESCE(?,CURRENT_TIMESTAMP))`)
      .bind(legacyLeadId,String(lead.visitor_id||''),String(lead.source||'website'),String(lead.message||''),lead.created_at||'').run();
    return json({ok:true,message:'Legacy inquiry removed from the enquiry workspace. The client record remains available.'});
  }
  const id=Number(url.searchParams.get('id')||0);
  if(!id)return json({error:'Lead ID is required'},400);
  const lead=await env.DB.prepare('SELECT id, visitor_id FROM contact_leads WHERE id=?').bind(id).first();
  if(!lead)return json({error:'Lead not found'},404);
  const statements=[env.DB.prepare('DELETE FROM contact_leads WHERE id=?').bind(id)];
  if(lead.visitor_id)statements.push(env.DB.prepare('DELETE FROM visitor_events WHERE visitor_id=?').bind(lead.visitor_id));
  await env.DB.batch(statements);
  return json({ok:true,message:'Lead and linked visitor tracking were permanently deleted.'});
}
