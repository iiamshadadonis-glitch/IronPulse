import { json, readJson } from '../../_lib/utils.js';
import { ensurePortalSchema, findPaidStudentMatch, portalClean, requirePortalAccount } from '../../_lib/portal-auth.js';

const clean=portalClean;
async function ticketAccess(env,account){
  if(account.status!=='active')throw new Error('Your account must be approved before creating a support ticket.');
  if(account.role==='coach')return true;
  if(await findPaidStudentMatch(env,account.email))return true;
  throw new Error('Tickets are available after a verified membership payment. You can still use Contact Us for general questions.');
}
async function list(env,account){const result=await env.DB.prepare('SELECT id,ticket_number,subject,category,message,status,priority,admin_reply,resolved_at,created_at,updated_at FROM portal_tickets WHERE account_id=? ORDER BY datetime(updated_at) DESC,id DESC LIMIT 100').bind(account.id).all();return result.results||[];}

export async function onRequestGet({request,env}){try{await ensurePortalSchema(env);const account=await requirePortalAccount(request,env,['student','coach']);await ticketAccess(env,account);return json({ok:true,tickets:await list(env,account)},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message||'Tickets could not be loaded.',contactUrl:'/contact'},403);}}

export async function onRequestPost({request,env}){try{
  await ensurePortalSchema(env);const account=await requirePortalAccount(request,env,['student','coach']);await ticketAccess(env,account);const body=await readJson(request),subject=clean(body.subject,180),message=clean(body.message,4000),category=['class','payment','account','schedule','technical','general'].includes(clean(body.category,30))?clean(body.category,30):'general',priority=['low','normal','high','urgent'].includes(clean(body.priority,20))?clean(body.priority,20):'normal';if(subject.length<4)throw new Error('Enter a clear ticket subject.');if(message.length<10)throw new Error('Describe the issue in at least 10 characters.');
  let ticketNumber='',result=null;for(let attempt=0;attempt<4&&!result;attempt++){ticketNumber=`DBT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;result=await env.DB.prepare('INSERT OR IGNORE INTO portal_tickets(ticket_number,account_id,account_role,subject,category,message,priority) VALUES(?,?,?,?,?,?,?) RETURNING id').bind(ticketNumber,account.id,account.role,subject,category,message,priority).first();}
  if(!result)throw new Error('A ticket number could not be created. Please try again.');try{const push=await import('../../_lib/notifications-v1-58.js');await push.enqueueNotification(env,{role:'admin',event:'ticket_created',eventKey:'ticket:'+result.id,title:'New Support Ticket',body:subject,url:'/admin/?app_tab=portalTicketsAdmin'});}catch{}return json({ok:true,ticketNumber,message:'Your ticket was submitted to the studio.',tickets:await list(env,account)},201);
}catch(error){return json({error:error.message||'Ticket could not be submitted.',contactUrl:'/contact'},400);}}
