import {parseCookies,sha256Hex,cookieHeader,requireAdmin} from './utils.js';
import {ensureAuthSchema} from './auth-schema.js';
import {ensurePortalSchema} from './portal-auth.js';
export const APP_SESSION_SECONDS=300*86400;
export const SESSION_HEADERS={'cache-control':'private, no-store, max-age=0','vary':'Cookie'};
export const dashboardFor=role=>role==='admin'?'/admin/':role==='coach'?'/coach-dashboard':'/student-dashboard';
export async function appSession(request,env,{preferredRole='',renew=false}={}){
 let cookies;try{cookies=parseCookies(request);}catch{return null;}
 const roles=preferredRole&&preferredRole!=='admin'?['portal','admin']:['admin','portal'];
 for(const kind of roles){
  const name=kind==='admin'?'uc_admin_session':'db_portal_session',token=cookies[name];if(!token)continue;
  if(kind==='admin')await ensureAuthSchema(env);else await ensurePortalSchema(env);
  const hash=await sha256Hex(token),table=kind==='admin'?'admin_sessions':'portal_sessions';
  const row=await env.DB.prepare(kind==='admin'?"SELECT u.id,u.email,u.role,'active' status,s.expires_at FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.status='active'":"SELECT a.id,a.email,a.role,a.status,s.expires_at FROM portal_sessions s JOIN portal_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND a.status<>'rejected'").bind(hash).first();
  if(!row)continue;const role=kind==='admin'?'admin':row.role;if(!['admin','student','coach'].includes(role))continue;
  let expires=row.expires_at,header='';
  if(renew&&!token.startsWith('short.')&&Date.parse(expires)<Date.now()+270*86400000){expires=new Date(Date.now()+APP_SESSION_SECONDS*1000).toISOString();const result=await env.DB.prepare(`UPDATE ${table} SET expires_at=? WHERE token_hash=? AND julianday(expires_at)>julianday('now') RETURNING expires_at`).bind(expires,hash).first();if(!result)continue;header=cookieHeader(name,token,{maxAge:APP_SESSION_SECONDS,expires:new Date(expires)});}
  return {key:`${role}:${row.id}`,id:Number(row.id),role,email:row.email,status:row.status,home:dashboardFor(role),expires,sessionHash:hash,cookie:header};
 }
 if(request.headers.has('cf-access-authenticated-user-email')){const user=await requireAdmin(request,env);return {key:'admin-access:'+await sha256Hex(user.email),id:0,role:'admin',email:user.email,status:'active',home:'/admin/',expires:'',sessionHash:'',cookie:''};}
 return null;
}
export function publicAppSession(session){if(!session)return {ok:true,authenticated:false};const {key,role,status,home,expires}=session;return {ok:true,authenticated:true,key,role,status,home,expires};}
