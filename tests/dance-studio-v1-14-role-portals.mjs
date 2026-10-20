import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  createPortalOAuthState,
  createPortalSession,
  registerPortalAccount,
  verifyPortalPassword
} from '../functions/_lib/portal-auth.js';
import {
  approveCoachApplication,
  listPortalApprovals,
  removePendingAccount,
  reviewCoachScheduleRequest
} from '../functions/_lib/portal-approvals.js';
import { submitCoachScheduleRequest } from '../functions/_lib/portal-dashboard.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.14'],'node tests/dance-studio-v1-14-role-portals.mjs && npm run test:dance-v1.13');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const requiredFiles=[
  'public/login.html',
  'public/student-dashboard.html',
  'public/coach-dashboard.html',
  'public/assets/portal-v1-14.css',
  'public/assets/portal-auth-v1-14.js',
  'public/assets/portal-dashboard-v1-14.js',
  'public/admin/dropbeat-admin-v1-14.js',
  'public/admin/dropbeat-admin-v1-14.css',
  'functions/_lib/portal-auth.js',
  'functions/_lib/portal-dashboard.js',
  'functions/_lib/portal-approvals.js',
  'functions/api/admin/approvals.js',
  'functions/api/portal/auth/login.js',
  'functions/api/portal/auth/register.js',
  'functions/api/portal/google/start.js',
  'functions/api/portal/google/callback.js',
  'functions/api/portal/dashboard.js',
  'functions/api/portal/profile.js',
  'functions/api/portal/session-access.js',
  'migrations/0048_dropbeat_role_portals_approvals.sql'
];
for(const relative of requiredFiles)assert.ok(fs.existsSync(path.join(root,relative)),`${relative} must exist`);

const login=read('public/login.html');
assert.match(login,/data-auth-mode="login">Login<\/button>/);
assert.match(login,/Student Sign Up/);
assert.match(login,/Coach Sign Up/);
assert.match(login,/Continue with Google/);
assert.match(login,/Sign Up with Google/);
assert.match(login,/class="auth-shell auth-shell-single"/);
assert.doesNotMatch(login,/>\s*Admin Login\s*</i);

const authClient=read('public/assets/portal-auth-v1-14.js');
const dashboardClient=read('public/assets/portal-dashboard-v1-14.js');
const adminClient=read('public/admin/dropbeat-admin-v1-14.js');
for(const [name,source] of [['portal auth',authClient],['portal dashboard',dashboardClient],['admin V1.14',adminClient]])assert.doesNotThrow(()=>new Function(source),`${name} browser script must parse`);
assert.match(authClient,/\/api\/portal\/auth\/login/);
assert.match(authClient,/\/api\/portal\/google\/start/);
assert.match(dashboardClient,/submit_schedule_request/);
assert.match(dashboardClient,/dismiss_meet_notice/);
assert.match(adminClient,/Coach Applications/);
assert.match(adminClient,/Student Approvals/);
assert.match(adminClient,/Schedule Requests/);
assert.match(adminClient,/Current Coaches/);
assert.match(adminClient,/Past Coaches/);
assert.match(adminClient,/review_schedule_request/);

const adminHtml=read('public/admin/index.html');
assert.match(adminHtml,/dropbeat-admin-v1-14\.js\?v=1\.16/);
assert.doesNotMatch(adminHtml,/<h3>Login Guidance<\/h3>/i);
assert.doesNotMatch(adminHtml,/coding access/i);
assert.match(read('public/admin/final-v16-62-inbox-nav-automations.js'),/\['approvals','Approval'\]/);
assert.match(read('functions/api/admin/auth/security.js'),/sendConfiguredEmail/);
assert.match(read('functions/api/admin/auth/security.js'),/purpose:'otp'/);
assert.doesNotMatch(read('functions/api/admin/auth/security.js'),/setupVerificationCode/);

for(const name of fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html'))){
  const html=read(`public/${name}`);
  if(html.includes('admin-login-link')){
    assert.match(html,/class="admin-login-link" href="\/login">Login<\/a>/,`${name} must use the unified Login link`);
    assert.doesNotMatch(html,/>\s*Admin Login\s*</i,`${name} must not show Admin Login`);
  }
}
for(const relative of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(relative);
  assert.match(source,/class="admin-login-link" href="\/login">Login<\/a>/);
  assert.doesNotMatch(source,/>\s*Admin Login\s*</i);
}
const navigation=read('functions/_lib/navigation.js');
assert.match(navigation,/key:'admin-login', label:'Login', href:'\/login'/);
assert.match(navigation,/if\(item\.key==='admin-login'\)return \{\.\.\.item,label:'Login',slug:'login',href:'\/login'/);

const middleware=read('functions/_middleware.js');
assert.match(middleware,/\/student-dashboard/);
assert.match(middleware,/\/coach-dashboard/);
assert.match(middleware,/url\.pathname === '\/api\/portal\/profile'/);

const migration=read('migrations/0048_dropbeat_role_portals_approvals.sql');
for(const table of ['portal_accounts','portal_sessions','portal_coach_profiles','portal_notifications','portal_oauth_states','portal_account_events','portal_coach_schedule_requests'])assert.match(migration,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));

const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));

class Statement {
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={
  DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}},
  SITE_URL:'https://studio.example.test'
};

const student=await registerPortalAccount(env,{role:'student',email:'new.student@example.test',password:'StrongPass!114',displayName:'New Student',realName:'New Student',phone:'+91 90000 00001'});
assert.equal(student.account.role,'student');
assert.equal(student.account.status,'pending');
const studentRow=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(student.account.id);
assert.equal(await verifyPortalPassword('StrongPass!114',studentRow),true);
assert.equal(await verifyPortalPassword('wrong-password',studentRow),false);

sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB114-PAID-1','Paid Student','919000000002','paid.student@example.test',49900,'INR','active','paid','razorpay');
const paid=await registerPortalAccount(env,{role:'student',email:'paid.student@example.test',password:'StrongPass!115',displayName:'Paid Student',phone:'+91 90000 00002'});
assert.equal(paid.paymentMatched,true);
assert.equal(paid.account.status,'active');

const coach=await registerPortalAccount(env,{
  role:'coach',email:'coach@example.test',password:'StrongPass!116',displayName:'Manisha Rao',realName:'Manisha Rao',phone:'+91 90000 00003',
  designation:'Dance Coach',badge:'Coach',bio:'Indian classical dance teacher with a student-first coaching approach.',experience:'Eight years teaching experience.',
  specialties:['Indian Classical','Bharatanatyam','Kuchipudi'],availableDays:['mon','tue','wed'],availabilitySlots:[{day:'mon',start:'10:00',end:'13:00'}],classTypes:['online_class'],
  instagramUrl:'https://instagram.com/manisha.test',facebookUrl:'https://facebook.com/manisha.test'
});
assert.equal(coach.account.status,'pending');
let approvals=await listPortalApprovals(env);
assert.equal(approvals.counts.pendingCoaches,1);
assert.equal(approvals.counts.pendingStudents,1);
assert.equal(approvals.pendingCoaches[0].profile.specialties.length,3);

const approved=await approveCoachApplication(env,coach.account.id,'admin@example.test');
assert.ok(approved.coachId>0);
const publicCoach=sqlite.prepare('SELECT * FROM dance_coaches WHERE id=?').get(approved.coachId);
assert.equal(publicCoach.name,'Manisha Rao');
assert.equal(publicCoach.status,'active');
assert.equal(publicCoach.portal_account_id,coach.account.id);
approvals=await listPortalApprovals(env);
assert.equal(approvals.counts.pendingCoaches,0);
assert.ok(approvals.currentCoaches.some(item=>item.account?.id===coach.account.id));

const product=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('DB114-ONLINE','Approved Coach Class','approved-coach-class','subscription','Coach-led class.','Coach-led class details.',49900,29900,'INR','active','Online','["Live class"]',114);
const productId=Number(product.lastInsertRowid);
sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(productId,1,'online_class','online_class','Approved Coach Class',approved.coachId,'["Bharatanatyam"]','10:00',60,3,'["mon","tue","wed"]','Asia/Kolkata','online','active');
const activeCoachRow=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(coach.account.id);
const requestDate=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
const scheduleRequest=await submitCoachScheduleRequest(env,activeCoachRow,{sourceType:'product',sourceId:productId,requestType:'add',sessionDate:requestDate,startTime:'11:00',endTime:'12:00',reason:'Add a festival-week practice session.'});
assert.ok(scheduleRequest.id>0);
approvals=await listPortalApprovals(env);
assert.equal(approvals.counts.scheduleRequests,1);
await reviewCoachScheduleRequest(env,{requestId:scheduleRequest.id,decision:'approve',reviewReason:'Approved for the class.',adminEmail:'admin@example.test'});
assert.equal(sqlite.prepare('SELECT status FROM portal_coach_schedule_requests WHERE id=?').get(scheduleRequest.id).status,'approved');
assert.equal(sqlite.prepare('SELECT status FROM class_session_overrides WHERE mapping_id=? AND session_date=?').get(productId,requestDate).status,'rescheduled');

await assert.rejects(()=>removePendingAccount(env,student.account.id,'wrong','admin@example.test'),/Type REMOVE/);
await removePendingAccount(env,student.account.id,'REMOVE','admin@example.test');
assert.equal(sqlite.prepare('SELECT id FROM portal_accounts WHERE id=?').get(student.account.id),undefined);
assert.equal(sqlite.prepare('SELECT account_id FROM portal_notifications WHERE account_id=?').get(student.account.id),undefined);

sqlite.prepare("INSERT INTO settings(key,value,updated_at) VALUES('webinar_integrations',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").run(JSON.stringify({google:{clientId:'oauth-client.apps.googleusercontent.com',clientSecret:'oauth-secret'}}));
const oauth=await createPortalOAuthState(env,new Request('https://studio.example.test/api/portal/google/start'),{intent:'login'});
assert.match(oauth.authUrl,/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
assert.match(oauth.authUrl,/api%2Fportal%2Fgoogle%2Fcallback/);
assert.equal(oauth.redirectUri,'https://studio.example.test/api/portal/google/callback');

const portalSession=await createPortalSession(env,paid.account.id);
assert.match(portalSession.header,/db_portal_session=/);
assert.match(portalSession.header,/HttpOnly/);
assert.match(portalSession.header,/SameSite=Lax/);

console.log(`DropBeat V1.14 role portals verified: ${migrations.length} migrations, unified login, student/coach registration, payment auto-approval, coach approval/publication, Google OAuth state, secure sessions, dashboard controls and admin lifecycle UI.`);
