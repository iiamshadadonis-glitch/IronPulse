import { json, requireAdmin } from '../../_lib/utils.js';

const MB = 1024 * 1024;
const MAX_LIST = 200;
const MAX_SELECTED = 80;

function clean(v, n=500){ return String(v ?? '').trim().slice(0,n); }
function num(v){ const n=Number(v||0); return Number.isFinite(n)?n:0; }
function bytesLabel(n){
  n=Math.max(0,num(n));
  if(n>=1024*1024*1024)return `${(n/(1024*1024*1024)).toFixed(2)} GB`;
  if(n>=1024*1024)return `${(n/(1024*1024)).toFixed(2)} MB`;
  if(n>=1024)return `${(n/1024).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

const CATEGORIES = {
  coupons: {
    label:'Expired / Inactive Offers',
    description:'Old offer codes that are expired or no longer active. Active offers are protected.',
    warning:'Deleting an offer is permanent. Review its rules and history before you remove it.',
    key:'id',
    where:`(LOWER(COALESCE(status,''))!='active' OR (expires_at IS NOT NULL AND TRIM(expires_at)!='' AND datetime(expires_at) < CURRENT_TIMESTAMP))`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(
      length(COALESCE(code,''))+length(COALESCE(description,''))+length(COALESCE(discount_type,''))+length(COALESCE(applies_to,''))+length(COALESCE(product_slug,''))+length(COALESCE(billing_scope,''))+length(COALESCE(recurring_scope,''))+length(COALESCE(starts_at,''))+length(COALESCE(expires_at,''))+length(COALESCE(status,''))+96
    ),0) approx_bytes FROM coupon_codes WHERE __WHERE__`,
    listSql:`SELECT id, code title, COALESCE(NULLIF(description,''),'Expired / inactive offer') detail, COALESCE(expires_at,updated_at,created_at) date_value,
      (length(COALESCE(code,''))+length(COALESCE(description,''))+length(COALESCE(discount_type,''))+length(COALESCE(applies_to,''))+length(COALESCE(product_slug,''))+length(COALESCE(billing_scope,''))+length(COALESCE(recurring_scope,''))+length(COALESCE(starts_at,''))+length(COALESCE(expires_at,''))+length(COALESCE(status,''))+96) approx_bytes
      FROM coupon_codes WHERE __WHERE__ ORDER BY COALESCE(expires_at,updated_at,created_at) ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT id,code,description,discount_type,discount_value,applies_to,product_slug,min_cart_paise,max_uses,used_count,member_limit,billing_scope,recurring_scope,starts_at,expires_at,status,created_at,updated_at FROM coupon_codes WHERE id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'coupon_codes'
  },
  journeys: {
    label:'Old Anonymous Visitor Journeys',
    description:'Device-only visitor journeys whose first visit is over 30 days old, have activity on only one recorded visit day, and have no submitted contact/profile record.',
    warning:'Deleting an anonymous visitor journey is permanent. Only one-off device IDs older than 30 days with no linked client/contact/profile record are eligible; repeat visitors on another day stay protected.',
    key:'visitor_id',
    custom:'visitor_journey'
  },
  visits: {
    label:'Old Anonymous Visit Activity',
    description:'Anonymous website activity older than six months. Activity linked to a client is protected.',
    warning:'Deleting visit activity is permanent. Keep it if you may need the historical traffic record.',
    key:'id',
    where:`created_at < datetime('now','-6 months') AND visitor_id NOT IN (SELECT COALESCE(visitor_id,'') FROM contact_leads WHERE visitor_id IS NOT NULL AND TRIM(visitor_id)!='')`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(visitor_id,''))+length(COALESCE(path,''))+length(COALESCE(referrer,''))+length(COALESCE(source,''))+length(COALESCE(user_agent,''))+64),0) approx_bytes FROM visitor_events WHERE __WHERE__`,
    listSql:`SELECT id, COALESCE(NULLIF(path,''),'Website visit') title, COALESCE(NULLIF(source,''),'Direct / unknown') detail, created_at date_value,
      (length(COALESCE(visitor_id,''))+length(COALESCE(path,''))+length(COALESCE(referrer,''))+length(COALESCE(source,''))+length(COALESCE(user_agent,''))+64) approx_bytes
      FROM visitor_events WHERE __WHERE__ ORDER BY created_at ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT id,visitor_id,path,referrer,source,user_agent,duration_ms,created_at FROM visitor_events WHERE id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'visitor_events'
  },
  carts: {
    label:'Old Anonymous Cart Activity',
    description:'Abandoned anonymous cart activity older than six months. Cart activity linked to a client is protected.',
    warning:'Deleting cart activity is permanent. Review the items and value before you remove the record.',
    key:'visitor_id',
    where:`updated_at < datetime('now','-6 months') AND visitor_id NOT IN (SELECT COALESCE(visitor_id,'') FROM contact_leads WHERE visitor_id IS NOT NULL AND TRIM(visitor_id)!='')`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(visitor_id,''))+length(COALESCE(items_json,''))+64),0) approx_bytes FROM visitor_cart_state WHERE __WHERE__`,
    listSql:`SELECT visitor_id, 'Abandoned cart' title, (CAST(service_count AS TEXT)||' service(s) • ₹'||printf('%.2f',COALESCE(amount_paise,0)/100.0)) detail, updated_at date_value,
      (length(COALESCE(visitor_id,''))+length(COALESCE(items_json,''))+64) approx_bytes
      FROM visitor_cart_state WHERE __WHERE__ ORDER BY updated_at ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT visitor_id,service_count,amount_paise,items_json,updated_at FROM visitor_cart_state WHERE visitor_id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'visitor_cart_state'
  },
  otp: {
    label:'Expired Verification Attempts',
    description:'Expired sign-in verification attempts that can no longer be used.',
    warning:'Deleting these expired verification records is permanent. The secure OTP hash is never displayed.',
    key:'id',
    where:`expires_at < CURRENT_TIMESTAMP`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(phone,''))+length(COALESCE(otp_hash,''))+length(COALESCE(channel,''))+80),0) approx_bytes FROM otp_challenges WHERE __WHERE__`,
    listSql:`SELECT id, 'Expired verification' title, COALESCE(phone,'') detail, expires_at date_value,
      (length(COALESCE(phone,''))+length(COALESCE(otp_hash,''))+length(COALESCE(channel,''))+80) approx_bytes
      FROM otp_challenges WHERE __WHERE__ ORDER BY expires_at ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT id,phone,channel,attempts,consumed,expires_at,created_at FROM otp_challenges WHERE id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'otp_challenges'
  },
  customer_sessions: {
    label:'Expired Customer Sessions',
    description:'Expired customer sign-in sessions that are no longer valid.',
    warning:'Deleting an expired session is permanent. The secure session token is never displayed.',
    key:'id',
    where:`expires_at < CURRENT_TIMESTAMP`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(phone,''))+length(COALESCE(token_hash,''))+72),0) approx_bytes FROM customer_sessions WHERE __WHERE__`,
    listSql:`SELECT id, 'Expired customer session' title, COALESCE(phone,'') detail, expires_at date_value,
      (length(COALESCE(phone,''))+length(COALESCE(token_hash,''))+72) approx_bytes
      FROM customer_sessions WHERE __WHERE__ ORDER BY expires_at ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT id,phone,expires_at,created_at FROM customer_sessions WHERE id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'customer_sessions'
  },
  admin_sessions: {
    label:'Expired Admin Sessions',
    description:'Expired admin sign-in sessions. Current active sessions are protected.',
    warning:'Deleting an expired admin session is permanent. Current active sessions remain protected.',
    key:'id',
    where:`s.expires_at < CURRENT_TIMESTAMP`,
    countSql:`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(token_hash,''))+72),0) approx_bytes FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP`,
    listSql:`SELECT id, 'Expired admin session' title, ('User #'||CAST(user_id AS TEXT)) detail, expires_at date_value,
      (length(COALESCE(token_hash,''))+72) approx_bytes
      FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP ORDER BY expires_at ASC LIMIT ${MAX_LIST}`,
    detailSql:`SELECT s.id,s.user_id,COALESCE(u.name,'') admin_name,COALESCE(u.email,'') admin_email,COALESCE(u.role,'') admin_role,s.expires_at,s.created_at FROM admin_sessions s LEFT JOIN admin_users u ON u.id=s.user_id WHERE s.id=? AND __WHERE__ LIMIT 1`,
    deleteTable:'admin_sessions',
    deleteWhere:`expires_at < CURRENT_TIMESTAMP`
  },
  legacy_blogs: {
    label:'Delete Existing Blog Copies',
    description:'Review D1-only fitness fitness tip data: old legacy fitness tip copies plus the rebuildable admin Fitness Classes index. Blogger/SEO remains the live publishing source.',
    warning:'D1 ONLY: deleting here never calls Blogger/SEO and never deletes a live website fitness tip. Current SEO comments are protected. Legacy rows remove only their old D1 children; admin-index rows are rebuildable from Blogger the next time Fitness Tips are loaded.',
    key:'id',
    custom:'legacy_blogs'
  }
};

function categorySql(def, field){ return def[field].replaceAll('__WHERE__',def.where); }

const JOURNEY_BASE_WHERE = `TRIM(COALESCE(e.visitor_id,''))!=''
  AND NOT EXISTS (
    SELECT 1 FROM contact_leads l
    WHERE TRIM(COALESCE(l.visitor_id,''))!='' AND l.visitor_id=e.visitor_id
  )`;
const JOURNEY_HAVING = `datetime(MIN(e.created_at)) < datetime('now','-30 days') AND COUNT(DISTINCT date(e.created_at))=1`;

async function journeySummary(env){
  const r=await env.DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(approx_bytes),0) approx_bytes FROM (
    SELECT e.visitor_id,
      COALESCE(SUM(length(COALESCE(e.visitor_id,''))+length(COALESCE(e.path,''))+length(COALESCE(e.referrer,''))+length(COALESCE(e.source,''))+length(COALESCE(e.user_agent,''))+64),0) approx_bytes
    FROM visitor_events e
    WHERE ${JOURNEY_BASE_WHERE}
    GROUP BY e.visitor_id
    HAVING ${JOURNEY_HAVING}
  )`).first();
  return {count:num(r?.count),approx_bytes:num(r?.approx_bytes)};
}

async function journeyList(env){
  const r=await env.DB.prepare(`SELECT e.visitor_id,
      e.visitor_id title,
      (CAST(COUNT(*) AS TEXT)||' page view(s) • first '||MIN(e.created_at)||' • last '||MAX(e.created_at)) detail,
      MAX(e.created_at) date_value,
      COALESCE(SUM(length(COALESCE(e.visitor_id,''))+length(COALESCE(e.path,''))+length(COALESCE(e.referrer,''))+length(COALESCE(e.source,''))+length(COALESCE(e.user_agent,''))+64),0) approx_bytes
    FROM visitor_events e
    WHERE ${JOURNEY_BASE_WHERE}
    GROUP BY e.visitor_id
    HAVING ${JOURNEY_HAVING}
    ORDER BY MAX(e.created_at) ASC
    LIMIT ${MAX_LIST}`).all();
  return r.results||[];
}

async function journeyDetail(env,id){
  return env.DB.prepare(`SELECT e.visitor_id,
      COUNT(*) page_views,
      COUNT(DISTINCT COALESCE(e.path,'')) unique_pages,
      MIN(e.created_at) first_seen,
      MAX(e.created_at) last_seen,
      COALESCE(SUM(e.duration_ms),0) total_time_ms,
      GROUP_CONCAT(DISTINCT NULLIF(e.source,'')) sources,
      GROUP_CONCAT(DISTINCT NULLIF(e.path,'')) pages
    FROM visitor_events e
    WHERE e.visitor_id=? AND ${JOURNEY_BASE_WHERE}
    GROUP BY e.visitor_id
    HAVING ${JOURNEY_HAVING}
    LIMIT 1`).bind(id).first();
}

async function eligibleJourneyIds(env,ids=null){
  const values=Array.isArray(ids)?ids.map(v=>clean(v,120)).filter(Boolean).slice(0,MAX_SELECTED):null;
  const clause=values?.length?` AND e.visitor_id IN (${values.map(()=>'?').join(',')})`:'';
  const r=await env.DB.prepare(`SELECT e.visitor_id FROM visitor_events e WHERE ${JOURNEY_BASE_WHERE}${clause} GROUP BY e.visitor_id HAVING ${JOURNEY_HAVING}`).bind(...(values||[])).all();
  return (r.results||[]).map(x=>String(x.visitor_id||'')).filter(Boolean);
}


async function legacyBlogSummary(env){
  const legacy=await env.DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(
    length(COALESCE(title,''))+length(COALESCE(slug,''))+length(COALESCE(excerpt,''))+length(COALESCE(body_html,''))+
    length(COALESCE(cover_image_url,''))+length(COALESCE(status,''))+length(COALESCE(seo_title,''))+length(COALESCE(seo_description,''))+
    length(COALESCE(blogger_post_id,''))+length(COALESCE(blogger_post_url,''))+length(COALESCE(ads_json,''))+160
  ),0) approx_bytes FROM blog_posts`).first().catch(()=>({count:0,approx_bytes:0}));
  const cache=await env.DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(length(COALESCE(row_json,''))+length(COALESCE(title,''))+length(COALESCE(slug,''))+length(COALESCE(post_id,''))+length(COALESCE(blog_id,''))+128),0) approx_bytes FROM audition_post_cache`).first().catch(()=>({count:0,approx_bytes:0}));
  return {count:num(legacy?.count)+num(cache?.count),approx_bytes:num(legacy?.approx_bytes)+num(cache?.approx_bytes)};
}
async function legacyBlogList(env){
  const legacy=(await env.DB.prepare(`SELECT id,
      COALESCE(NULLIF(title,''),'Legacy fitness article/blog copy') title,
      ('Legacy D1 copy • '||COALESCE(NULLIF(status,''),'unknown')||CASE WHEN TRIM(COALESCE(slug,''))!='' THEN ' • /blog/'||slug ELSE '' END) detail,
      COALESCE(NULLIF(blogger_updated_at,''),NULLIF(updated_at,''),NULLIF(published_at,''),created_at) date_value,
      (length(COALESCE(title,''))+length(COALESCE(slug,''))+length(COALESCE(excerpt,''))+length(COALESCE(body_html,''))+
       length(COALESCE(cover_image_url,''))+length(COALESCE(status,''))+length(COALESCE(seo_title,''))+length(COALESCE(seo_description,''))+
       length(COALESCE(blogger_post_id,''))+length(COALESCE(blogger_post_url,''))+length(COALESCE(ads_json,''))+160) approx_bytes
    FROM blog_posts ORDER BY id DESC LIMIT ${MAX_LIST}`).all().catch(()=>({results:[]}))).results||[];
  const remaining=Math.max(0,MAX_LIST-legacy.length);if(!remaining)return legacy;
  const cache=(await env.DB.prepare(`SELECT ('cache:'||blog_id||':'||post_id) id,
      COALESCE(NULLIF(title,''),'Fitness class index item') title,
      ('Admin fitness class index • '||COALESCE(NULLIF(status,''),NULLIF(remote_status,''),'unknown')||CASE WHEN TRIM(COALESCE(slug,''))!='' THEN ' • /blog/'||slug ELSE '' END) detail,
      COALESCE(NULLIF(updated_at_remote,''),last_seen_at) date_value,
      (length(COALESCE(row_json,''))+length(COALESCE(title,''))+length(COALESCE(slug,''))+length(COALESCE(post_id,''))+length(COALESCE(blog_id,''))+128) approx_bytes
    FROM audition_post_cache ORDER BY updated_at_remote DESC,post_id DESC LIMIT ?`).bind(remaining).all().catch(()=>({results:[]}))).results||[];
  return [...legacy,...cache];
}
function cacheKeyParts(id){const s=String(id||'');if(!s.startsWith('cache:'))return null;const rest=s.slice(6),i=rest.indexOf(':');if(i<1)return null;return {blogId:rest.slice(0,i),postId:rest.slice(i+1)};}
async function legacyBlogDetail(env,id){
  const ck=cacheKeyParts(id);
  if(ck){
    const row=await env.DB.prepare(`SELECT blog_id,post_id,remote_status,status,title,slug,updated_at_remote,published_at_remote,last_seen_at,row_json FROM audition_post_cache WHERE blog_id=? AND post_id=? LIMIT 1`).bind(ck.blogId,ck.postId).first().catch(()=>null);
    if(!row)return null;
    let parsed={};try{parsed=JSON.parse(String(row.row_json||'{}'))||{};}catch{}
    return {_cache:1,id:String(id),...row,blogger_post_id:row.post_id,blogger_post_url:parsed.blogger_post_url||'',published_at:parsed.published_at||row.published_at_remote||'',blogger_updated_at:parsed.blogger_updated_at||row.updated_at_remote||'',created_at:parsed.created_at||'',updated_at:row.last_seen_at,legacy_tag_count:0,legacy_comment_count:0};
  }
  return env.DB.prepare(`SELECT b.id,b.title,b.slug,b.excerpt,b.status,b.cover_image_url,b.seo_title,b.seo_description,
      b.blogger_post_id,b.blogger_post_url,b.blogger_updated_at,b.published_at,b.created_at,b.updated_at,
      b.auto_ads_enabled,b.ads_json,b.is_featured,
      (SELECT COUNT(*) FROM blog_post_tags t WHERE t.post_id=b.id) legacy_tag_count,
      (SELECT COUNT(*) FROM blog_comments c WHERE c.post_id=b.id) legacy_comment_count
    FROM blog_posts b WHERE b.id=? LIMIT 1`).bind(id).first();
}
async function deleteLegacyBlogRows(env,action,ids){
  const before=await legacyBlogSummary(env);
  let selected=[];
  if(action==='delete_selected'){
    selected=(Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean).slice(0,MAX_SELECTED);
    if(!selected.length)throw new Error('Select at least one D1 fitness article/blog item to delete.');
  }
  let approxCleared=before.approx_bytes;
  if(selected.length){const preview=await legacyBlogList(env),set=new Set(selected);approxCleared=preview.filter(r=>set.has(String(r.id))).reduce((a,r)=>a+num(r.approx_bytes),0);}
  const legacyIds=selected.length?selected.filter(x=>!x.startsWith('cache:')).map(Number).filter(v=>Number.isInteger(v)&&v>0):[];
  const cacheKeys=selected.length?selected.map(cacheKeyParts).filter(Boolean):[];
  let deleted=0;
  if(action==='delete_all'){
    const legacyIdsAll=(await env.DB.prepare('SELECT id FROM blog_posts').all().catch(()=>({results:[]}))).results||[];
    const idsAll=legacyIdsAll.map(r=>Number(r.id)).filter(Boolean);
    for(let i=0;i<idsAll.length;i+=MAX_SELECTED){const chunk=idsAll.slice(i,i+MAX_SELECTED),ph=chunk.map(()=>'?').join(',');await env.DB.prepare(`DELETE FROM blog_comments WHERE post_id IN (${ph})`).bind(...chunk).run().catch(()=>{});await env.DB.prepare(`DELETE FROM blog_post_tags WHERE post_id IN (${ph})`).bind(...chunk).run().catch(()=>{});await env.DB.prepare(`DELETE FROM blog_posts WHERE id IN (${ph})`).bind(...chunk).run();deleted+=chunk.length;}
    const cacheCount=await env.DB.prepare('SELECT COUNT(*) count FROM audition_post_cache').first().catch(()=>({count:0}));
    await env.DB.prepare('DELETE FROM audition_post_cache').run().catch(()=>{});await env.DB.prepare('DELETE FROM audition_sync_state').run().catch(()=>{});deleted+=num(cacheCount?.count);
  }else{
    for(let i=0;i<legacyIds.length;i+=MAX_SELECTED){const chunk=legacyIds.slice(i,i+MAX_SELECTED),ph=chunk.map(()=>'?').join(',');await env.DB.prepare(`DELETE FROM blog_comments WHERE post_id IN (${ph})`).bind(...chunk).run().catch(()=>{});await env.DB.prepare(`DELETE FROM blog_post_tags WHERE post_id IN (${ph})`).bind(...chunk).run().catch(()=>{});const r=await env.DB.prepare(`DELETE FROM blog_posts WHERE id IN (${ph})`).bind(...chunk).run();deleted+=num(r?.meta?.changes);}
    const resetBlogs=new Set();
    for(const ck of cacheKeys){const r=await env.DB.prepare('DELETE FROM audition_post_cache WHERE blog_id=? AND post_id=?').bind(ck.blogId,ck.postId).run().catch(()=>null);deleted+=num(r?.meta?.changes);resetBlogs.add(ck.blogId);}
    // A deliberately cleared cache item must not leave the sync marker claiming a
    // complete index. The next admin load can safely rebuild it from Blogger.
    for(const blogId of resetBlogs)await env.DB.prepare('DELETE FROM audition_sync_state WHERE blog_id=?').bind(blogId).run().catch(()=>{});
  }
  const used=await storageSize(env);
  return {deleted,approx_cleared_bytes:approxCleared,approx_cleared_label:bytesLabel(approxCleared),used_bytes:used,used_label:bytesLabel(used)};
}

async function deleteJourneyRows(env,action,ids){
  const before=await journeySummary(env);
  const eligible=await eligibleJourneyIds(env,action==='delete_selected'?ids:null);
  if(action==='delete_selected'&&!eligible.length)throw new Error('Select at least one currently eligible anonymous visitor journey.');
  if(!eligible.length)return {deleted:0,approx_cleared_bytes:0,approx_cleared_label:bytesLabel(0),used_bytes:await storageSize(env),used_label:bytesLabel(await storageSize(env))};
  let approxCleared=before.approx_bytes;
  if(action==='delete_selected'){
    const rows=await journeyList(env),set=new Set(eligible);approxCleared=rows.filter(x=>set.has(String(x.visitor_id))).reduce((a,x)=>a+num(x.approx_bytes),0);
  }
  // Remove only anonymous tracking/cart state. Submitted lead/profile/customer records are protected by eligibility and are never touched here.
  for(let i=0;i<eligible.length;i+=MAX_SELECTED){
    const chunk=eligible.slice(i,i+MAX_SELECTED),ph=chunk.map(()=>'?').join(',');
    await env.DB.prepare(`DELETE FROM visitor_cart_state WHERE visitor_id IN (${ph})`).bind(...chunk).run().catch(()=>{});
    await env.DB.prepare(`DELETE FROM visitor_events WHERE visitor_id IN (${ph})`).bind(...chunk).run();
  }
  const afterSize=await storageSize(env);
  return {deleted:eligible.length,approx_cleared_bytes:approxCleared,approx_cleared_label:bytesLabel(approxCleared),used_bytes:afterSize,used_label:bytesLabel(afterSize)};
}

async function storageSize(env){
  try{
    const r=await env.DB.prepare('SELECT 1 storage_probe').run();
    return num(r?.meta?.size_after);
  }catch(_){ return 0; }
}
async function categorySummary(env,key,def){
  try{
    const r=def.custom==='visitor_journey'?await journeySummary(env):def.custom==='legacy_blogs'?await legacyBlogSummary(env):await env.DB.prepare(categorySql(def,'countSql')).first();
    return {key,label:def.label,description:def.description,warning:def.warning,count:num(r?.count),approx_bytes:num(r?.approx_bytes)};
  }catch(_){ return {key,label:def.label,description:def.description,warning:def.warning,count:0,approx_bytes:0}; }
}
async function summary(env){
  const allocatedMb=Math.max(1,num(env.APP_STORAGE_LIMIT_MB)||500);
  const allocatedBytes=allocatedMb*MB;
  const usedBytes=await storageSize(env);
  const remainingBytes=Math.max(0,allocatedBytes-usedBytes);
  const usedPercent=allocatedBytes?Math.min(100,(usedBytes/allocatedBytes)*100):0;
  const remainingPercent=Math.max(0,100-usedPercent);
  const categories=[];
  for(const [key,def] of Object.entries(CATEGORIES)) categories.push(await categorySummary(env,key,def));
  return {
    allocated_bytes:allocatedBytes,used_bytes:usedBytes,remaining_bytes:remainingBytes,
    allocated_label:bytesLabel(allocatedBytes),used_label:bytesLabel(usedBytes),remaining_label:bytesLabel(remainingBytes),
    used_percent:Number(usedPercent.toFixed(2)),remaining_percent:Number(remainingPercent.toFixed(2)),categories
  };
}

async function listCategory(env,key){
  const def=CATEGORIES[key];
  if(!def)throw new Error('This cleanup category is not available.');
  const raw=def.custom==='visitor_journey'?await journeyList(env):def.custom==='legacy_blogs'?await legacyBlogList(env):(await env.DB.prepare(categorySql(def,'listSql')).all()).results||[];
  return {category:key,label:def.label,description:def.description,warning:def.warning,key_field:def.key,rows:(raw||[]).map(x=>({...x,approx_bytes:num(x.approx_bytes),approx_label:bytesLabel(x.approx_bytes)})),limit:MAX_LIST};
}

function humanize(k){return String(k||'').replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());}
function safeValue(k,v){
  if(k==='amount_paise'||k==='min_cart_paise')return `₹${(num(v)/100).toFixed(2)}`;
  if(k==='discount_value')return String(v??'');
  if(k==='items_json'){
    try{const parsed=JSON.parse(v||'[]');return JSON.stringify(parsed,null,2);}catch(_){return String(v||'');}
  }
  if(v===null||v===undefined||v==='')return '—';
  return String(v);
}
async function detailCategory(env,key,id){
  const def=CATEGORIES[key];
  if(!def)throw new Error('This cleanup category is not available.');
  if(id===undefined||id===null||String(id)==='')throw new Error('Choose an item to review.');
  const row=def.custom==='visitor_journey'?await journeyDetail(env,id):def.custom==='legacy_blogs'?await legacyBlogDetail(env,id):await env.DB.prepare(categorySql(def,'detailSql')).bind(id).first();
  if(!row)throw new Error('This item is no longer available or is no longer eligible for cleanup.');
  let details=[];
  if(key==='journeys'){
    const ms=num(row.total_time_ms),seconds=Math.floor(ms/1000),mins=Math.floor(seconds/60),hours=Math.floor(mins/60);
    const duration=hours?`${hours} h ${mins%60} m`:mins?`${mins} m ${seconds%60} s`:`${seconds} s`;
    details=[
      ['Device / Visitor ID',row.visitor_id],['Page Views',num(row.page_views)],['Unique Pages',num(row.unique_pages)],['First Seen',row.first_seen],['Last Seen',row.last_seen],['Recorded Time',duration],['Sources',row.sources||'Direct / unknown'],['Pages',row.pages||'—'],['Eligibility','First visit is over 30 days old, activity exists on only one recorded visit day, and no linked submitted client/contact/profile record exists.']
    ];
  }else if(key==='legacy_blogs'){
    details=[
      ['D1 Record ID',row.id],['D1 Record Type',row._cache?'Admin Fitness Class Index':'Legacy Blog Copy'],['Title',row.title],['Slug',row.slug],['Status',row.status],['Blogger Post ID (reference only)',row.blogger_post_id],
      ['Blogger URL (reference only)',row.blogger_post_url],['Legacy D1 Tags',num(row.legacy_tag_count)],['Legacy Local Comments',num(row.legacy_comment_count)],
      ['Published At',row.published_at],['Blogger Updated At',row.blogger_updated_at],['D1 Created At',row.created_at],['D1 Updated At',row.updated_at],
      ['Safety',row._cache?'Deleting this removes only the rebuildable D1 admin index row. It never calls Blogger/SEO; a later Fitness Tips load can rebuild the index from Blogger.':'Deleting this removes only the legacy D1 copy and old D1 child records. The connected Blogger/SEO fitness tip and current seo_comments are not deleted.']
    ];
  }else if(key==='coupons'){
    const discount=row.discount_type==='percent'?`${row.discount_value}%`:row.discount_type==='free_member'?`${row.discount_value} free member(s)`:`₹${(num(row.discount_value)/100).toFixed(2)}`;
    details=[
      ['Coupon Code',row.code],['Description',row.description],['Discount',discount],['Applies To',row.applies_to],['Plan / Product',row.product_slug],
      ['Minimum Cart',`₹${(num(row.min_cart_paise)/100).toFixed(2)}`],['Usage',`${num(row.used_count)} / ${num(row.max_uses)||'Unlimited'}`],['Member Limit',num(row.member_limit)||'No special limit'],
      ['Billing Scope',row.billing_scope],['Recurring Scope',row.recurring_scope],['Starts At',row.starts_at],['Expires At',row.expires_at],['Status',row.status],['Created At',row.created_at],['Updated At',row.updated_at]
    ];
  }else details=Object.entries(row).map(([k,v])=>[humanize(k),safeValue(k,v)]);
  return {category:key,label:def.label,description:def.description,warning:def.warning,id,title:key==='coupons'?(row.code||def.label):key==='journeys'?`Visitor ${row.visitor_id||id}`:key==='legacy_blogs'?(row.title||def.label):def.label,details};
}

async function deleteRows(env,key,action,ids){
  const def=CATEGORIES[key];
  if(!def)throw new Error('This cleanup category is not available.');
  if(def.custom==='visitor_journey')return deleteJourneyRows(env,action,ids);
  if(def.custom==='legacy_blogs')return deleteLegacyBlogRows(env,action,ids);
  const before=await categorySummary(env,key,def);
  let result,approxCleared=0;
  const deleteWhere=def.deleteWhere||def.where;
  if(action==='delete_all'){
    approxCleared=before.approx_bytes;
    result=await env.DB.prepare(`DELETE FROM ${def.deleteTable} WHERE ${deleteWhere}`).run();
  }else{
    const values=Array.isArray(ids)?ids.slice(0,MAX_SELECTED):[];
    if(!values.length)throw new Error('Select at least one item to delete.');
    const selected=new Set(values.map(v=>String(v)));
    const preview=await listCategory(env,key);
    approxCleared=(preview.rows||[]).filter(r=>selected.has(String(r[def.key]))).reduce((a,r)=>a+num(r.approx_bytes),0);
    const ph=values.map(()=>'?').join(',');
    result=await env.DB.prepare(`DELETE FROM ${def.deleteTable} WHERE ${def.key} IN (${ph}) AND ${deleteWhere}`).bind(...values).run();
  }
  const afterSize=await storageSize(env);
  return {deleted:num(result?.meta?.changes),approx_cleared_bytes:approxCleared,approx_cleared_label:bytesLabel(approxCleared),used_bytes:afterSize,used_label:bytesLabel(afterSize)};
}

export async function onRequestGet({request,env}){
  try{ await requireAdmin(request,env); }catch(e){ return json({error:e.message},401); }
  try{
    const u=new URL(request.url),mode=clean(u.searchParams.get('mode')||'summary',30),category=clean(u.searchParams.get('category'),50);
    if(mode==='list')return json(await listCategory(env,category));
    if(mode==='detail')return json(await detailCategory(env,category,u.searchParams.get('id')));
    return json(await summary(env));
  }catch(e){ return json({error:e.message||'Could not load storage information.'},500); }
}

export async function onRequestPost({request,env}){
  try{ await requireAdmin(request,env); }catch(e){ return json({error:e.message},401); }
  try{
    const body=await request.json().catch(()=>({}));
    const action=clean(body.action,30),category=clean(body.category,50);
    if(!['delete_selected','delete_all'].includes(action))return json({error:'Choose a valid cleanup action.'},400);
    const result=await deleteRows(env,category,action,body.ids||[]);
    return json({ok:true,...result,storage:await summary(env)});
  }catch(e){ return json({error:e.message||'Cleanup could not be completed.'},500); }
}
