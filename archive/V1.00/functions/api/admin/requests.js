import { json, readJson, requireAdmin } from '../../_lib/utils.js';
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const STATUSES=new Set(['new','in_progress','resolved']);

async function counts(env){
  const rows=(await env.DB.prepare("SELECT status,COUNT(*) n FROM service_requests GROUP BY status").all().catch(()=>({results:[]}))).results||[];
  const m={new:0,in_progress:0,resolved:0};for(const r of rows)if(Object.prototype.hasOwnProperty.call(m,String(r.status||'')))m[String(r.status)]=Number(r.n||0);
  return {new_count:m.new,in_progress_count:m.in_progress,resolved_count:m.resolved,all_count:m.new+m.in_progress+m.resolved,open_count:m.new+m.in_progress};
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const u=new URL(request.url);if(u.searchParams.get('summary')==='1')return json(await counts(env),200,{'cache-control':'private, max-age=30'});
  const q=clean(u.searchParams.get('q'),200),status=clean(u.searchParams.get('status'),30),where=[],binds=[];
  if(q){const like=`%${q}%`;where.push('(r.customer_name LIKE ? OR r.customer_phone LIKE ? OR r.customer_email LIKE ? OR r.request_id LIKE ? OR r.request_label LIKE ? OR r.message LIKE ?)');binds.push(like,like,like,like,like,like);}
  if(status&&STATUSES.has(status)){where.push('r.status=?');binds.push(status);}
  const sql=`SELECT r.*, l.name AS lead_name, l.phone AS lead_phone, l.email AS lead_email, l.interest_level, l.next_action
    FROM service_requests r LEFT JOIN contact_leads l ON l.id=r.lead_id ${where.length?'WHERE '+where.join(' AND '):''}
    ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, r.created_at DESC, r.id DESC LIMIT 1000`;
  const rows=(await env.DB.prepare(sql).bind(...binds).all()).results||[];
  return json({rows,...await counts(env)});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request),id=Number(b.id||0),action=clean(b.action,40);if(!id)return json({error:'Request ID is required.'},400);
  if(action==='status'){const status=clean(b.status,30);if(!STATUSES.has(status))return json({error:'Invalid request status.'},400);await env.DB.prepare("UPDATE service_requests SET status=CASE WHEN status='resolved' AND ?='in_progress' THEN status ELSE ? END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,status,id).run();return json({ok:true});}
  return json({error:'Unknown request action.'},400);
}
export async function onRequestDelete({request,env}){try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}const id=Number(new URL(request.url).searchParams.get('id')||0);if(!id)return json({error:'Request ID is required.'},400);await env.DB.prepare('DELETE FROM service_requests WHERE id=?').bind(id).run();return json({ok:true});}
