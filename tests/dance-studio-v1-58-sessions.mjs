import assert from 'node:assert/strict';
import {database,request,accounts,origin} from './fixtures-v158.mjs';
import {appSession,APP_SESSION_SECONDS} from '../functions/_lib/app-session-v1-58.js';
import {onRequestGet as context} from '../functions/api/portal/auth/context.js';
import {onRequestPost as login} from '../functions/api/admin/auth/login.js';
import {onRequestPost as logoutAdmin} from '../functions/api/admin/auth/logout.js';
import {onRequestPost as logoutPortal} from '../functions/api/portal/auth/logout.js';
import {createPortalSession,createAdminSessionForUser,requirePortalAccount} from '../functions/_lib/portal-auth.js';
import {requireAdmin,sha256Hex} from '../functions/_lib/utils.js';
import {onRequest as middleware} from '../functions/_middleware.js';
const fixture=database(),{sql,env}=fixture;await accounts(fixture);
try{
 const before=fixture.counts();assert.equal(await appSession(request('/'),env),null);assert.deepEqual(fixture.counts(),before,'Anonymous landing requires zero D1 operations');
 let response=await login({request:request('/api/admin/auth/login',{body:{email:'admin@example.test',password:'ExamplePassword123'}}),env});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Lax; Secure/);assert.match(cookie,/Max-Age=25920000/);assert.match(cookie,/Expires=/);const token=cookie.split(';')[0];
 const admin=await appSession(request('/',{cookie:token}),env);assert.equal(admin.role,'admin');assert.ok(Date.parse(admin.expires)>Date.now()+299*86400000);
 const oauth=await createAdminSessionForUser(env,{id:1});assert.match(oauth.header,/Max-Age=25920000/);assert.match(oauth.header,/HttpOnly/);
 for(const[id,role]of [[2,'student'],[3,'coach']]){const session=await createPortalSession(env,id);assert.match(session.header,/Max-Age=25920000/);const response=await context({request:request('/api/portal/auth/context?role='+role,{cookie:session.header.split(';')[0]}),env}),data=await response.json();assert.equal(data.role,role);assert.equal(data.home,'/'+role+'-dashboard');assert.equal(data.key,role+':'+id);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(data.token,undefined);assert.equal(data.sessionHash,undefined);assert.equal(data.email,undefined);}
 const short=await createPortalSession(env,2,{maxAge:7*86400}),shortCookie=short.header.split(';')[0];assert.match(short.header,/Max-Age=604800/);const shortContext=await appSession(request('/',{cookie:shortCookie}),env,{renew:true});assert.equal(shortContext.cookie,'','An explicit short remembered session is not silently extended');
 sql.prepare('UPDATE admin_sessions SET expires_at=? WHERE token_hash=(SELECT token_hash FROM admin_sessions WHERE user_id=1 LIMIT 1)').run(new Date(Date.now()+86400000).toISOString());let checked=await appSession(request('/',{cookie:'uc_admin_session=admin-token'}),env,{renew:true});assert.match(checked.cookie,/Max-Age=25920000/);const renewed=fixture.counts().writes;await appSession(request('/',{cookie:'uc_admin_session=admin-token'}),env,{renew:true});assert.equal(fixture.counts().writes,renewed,'Renewal does not write on every visit');
 const both='uc_admin_session=admin-token; db_portal_session=student-token';assert.equal((await appSession(request('/',{cookie:both}),env,{preferredRole:'student'})).role,'student');assert.equal((await appSession(request('/',{cookie:'db_portal_session=student-token'}),env,{preferredRole:'admin'})).role,'student','A role hint never grants Admin access');
 for(const[role,cookie]of [['admin','uc_admin_session=admin-token'],['student','db_portal_session=student-token'],['coach','db_portal_session=coach-token']]){const response=await middleware({request:request('/?app=1',{cookie}),env,data:{},next:()=>{throw Error('Authenticated launch must not render Home');}});assert.equal(response.status,302);assert.equal(response.headers.get('location'),(role==='admin'?'/admin/':'/'+role+'-dashboard')+'?app_resume=1');assert.match(response.headers.get('cache-control'),/private, no-store/);}
 response=await context({request:request('/api/portal/auth/context',{cookie:'db_portal_session=invalid'}),env});assert.equal((await response.json()).authenticated,false);
 // ISO 'T' sorts after SQLite's space separator. Compare dates, never raw strings.
 const expiredToday=new Date().toISOString().slice(0,10)+'T00:00:00.000Z';
 for(const[table,name,value,guard]of [['admin_sessions','uc_admin_session','admin-token',requireAdmin],['portal_sessions','db_portal_session','student-token',requirePortalAccount]]){
  const hash=await sha256Hex(value),original=sql.prepare(`SELECT expires_at FROM ${table} WHERE token_hash=?`).get(hash).expires_at;
  for(const expiry of [expiredToday,'not-a-valid-timestamp']){
   sql.prepare(`UPDATE ${table} SET expires_at=? WHERE token_hash=?`).run(expiry,hash);const previous=fixture.counts().writes;
   assert.equal(await appSession(request('/',{cookie:name+'='+value}),env,{renew:true}),null,'Expired/malformed sessions cannot be revived by persistence');
   assert.equal(fixture.counts().writes,previous);await assert.rejects(()=>guard(request('/',{cookie:name+'='+value}),env));
   assert.equal((await (await context({request:request('/api/portal/auth/context',{cookie:name+'='+value}),env})).json()).authenticated,false);
  }
  sql.prepare(`UPDATE ${table} SET expires_at=? WHERE token_hash=?`).run(original,hash);
 }
 await logoutPortal({request:request('/api/portal/auth/logout',{body:{},cookie:'db_portal_session=coach-token'}),env});assert.equal(await appSession(request('/',{cookie:'db_portal_session=coach-token'}),env),null);
 await logoutAdmin({request:request('/api/admin/auth/logout',{body:{},cookie:token}),env});assert.equal(await appSession(request('/',{cookie:token}),env),null);
 sql.prepare("UPDATE portal_accounts SET status='rejected' WHERE id=2").run();assert.equal(await appSession(request('/',{cookie:'db_portal_session=student-token'}),env),null);
 response=await context({request:request('/api/portal/auth/context',{cookie:'uc_admin_session=admin-token'}),env:{DB:{prepare(){throw Error('Synthetic outage');}}}});assert.equal(response.status,503);
 assert.equal(APP_SESSION_SECONDS,300*86400);console.log('V1.58 session/API/SQLite tests passed: 300-day HttpOnly password/OAuth/portal sessions, exact role roots, zero-read anonymous checks, short-session opt-out, bounded renewal, rejected/expired/revoked sessions, logout and private outage handling.');
}finally{fixture.close();}
