import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {
  PORTAL_PBKDF2_ITERATIONS,
  createPortalSession,
  ensurePaidStudentPortalAccount,
  hashPortalPassword,
  registerPortalAccount,
  verifyPortalPassword
} from '../functions/_lib/portal-auth.js';
import {onRequestGet as startGoogle} from '../functions/api/portal/google/start.js';
import {onRequestPost as createTicket} from '../functions/api/portal/tickets.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(PORTAL_PBKDF2_ITERATIONS,100000);
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const required=[
  'migrations/0049_dropbeat_portal_tickets_checkout_v1_15.sql',
  'functions/_lib/google-drive-upload.js',
  'functions/api/admin/tickets.js',
  'functions/api/portal/tickets.js',
  'public/assets/dropbeat-v1-15.css',
  'public/assets/portal-dashboard-v1-15.js',
  'public/admin/dropbeat-admin-v1-15.js'
];
for(const relative of required)assert.ok(fs.existsSync(path.join(root,relative)),`${relative} must exist`);

const login=read('public/login.html');
assert.equal((login.match(/data-auth-mode=/g)||[]).length,3);
assert.match(login,/data-auth-mode="login">Login<\/button>/);
assert.match(login,/data-auth-mode="student">Student Sign Up<\/button>/);
assert.match(login,/data-auth-mode="coach">Coach Sign Up<\/button>/);
assert.match(login,/auth-mode-tab active[^>]*data-auth-mode="login"/);
assert.doesNotMatch(login,/name="(?:username|realName|displayName)"/i);
assert.match(login,/name="name"/);
assert.match(login,/data-max-bytes="15728640"/);
assert.doesNotMatch(login,/>\s*(?:Founder|Co-Founder)\s*</i);
assert.match(read('public/assets/portal-v1-14.css'),/auth-mode-tabs/);
assert.match(read('public/assets/portal-v1-14.css'),/portal-availability-list/);

const authClient=read('public/assets/portal-auth-v1-16.js');
assert.match(authClient,/const DAYS=/);
assert.match(authClient,/classTypes,danceStyles/);
assert.match(authClient,/type="time"/);
assert.match(authClient,/singlePicker\('types'/);
assert.doesNotMatch(authClient,/data-time-period/);
assert.match(login,/\+ Sessions/);
assert.doesNotMatch(login,/Add More Sessions/);
assert.match(authClient,/no larger than 15 MB/);
assert.doesNotMatch(authClient,/OAuth client ID|client secret|coding access/i);

const adminV15=read('public/admin/dropbeat-admin-v1-15.js');
assert.match(adminV15,/db115-lifecycle-toggle/);
assert.match(adminV15,/body\.hidden=!open/);
assert.match(adminV15,/Open Tickets from Orders &amp; Leads/);
assert.match(adminV15,/portalTicketsAdmin/);
assert.match(read('public/admin/dropbeat-admin-v1-14.css'),/db115-lifecycle-body\[hidden\]/);

for(const relative of ['public/admin/dropbeat-admin-v1-03.js','public/admin/dropbeat-admin-v1-04.js','public/admin/dropbeat-admin-v1-14.js','public/admin/dropbeat-admin-v1-15.js']){
  const source=read(relative);
  assert.doesNotMatch(source,/=>\s*(?:root|r)\.querySelector\(/,`${relative} must tolerate a missing optional root`);
}

const navigation=read('functions/_lib/navigation.js');
assert.doesNotMatch(navigation,/key:'track-order'/);
for(const name of fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html'))){
  const html=read(`public/${name}`);
  assert.doesNotMatch(html,/>\s*Track (?:Your )?Order\s*</i,`${name} must not expose Track Order navigation`);
}
assert.match(read('public/my-orders.html'),/student-dashboard\?view=activity/);
for(const relative of ['functions/_lib/automatic-email-templates.js','functions/_lib/email-automations.js','functions/api/auth/request-otp.js','functions/api/public-retry.js'])assert.doesNotMatch(read(relative),/Track (?:Your )?Order/i,`${relative} must send members to the Student Dashboard`);

const drive=read('functions/_lib/google-drive-upload.js');
assert.match(drive,/uploadPortalProfileImageToGoogleDrive/);
assert.match(drive,/uploadWebsiteImageToGoogleDrive/);
assert.match(drive,/15\s*\*\s*1024\s*\*\s*1024/);
for(const relative of ['functions/api/admin/banners.js','functions/api/admin/studio-gallery.js','functions/api/admin/page-media.js','functions/api/portal/auth/register.js','functions/api/portal/profile.js'])assert.match(read(relative),/google-drive-upload/);

const dashboard14=read('public/assets/portal-dashboard-v1-14.js');
const dashboard15=read('public/assets/portal-dashboard-v1-15.js');
assert.match(dashboard14,/dropbeat:portal-model/);
assert.match(dashboard15,/addEventListener\('dropbeat:portal-model'/);
assert.match(dashboard15,/loadDashboardFallback/);
assert.doesNotMatch(dashboard15,/\n\s*loadDashboard\(\);/);
assert.doesNotMatch(read('public/student-dashboard.html'),/Orders &amp; Requests/);
assert.match(read('public/student-dashboard.html'),/Reviews &amp; Ratings/);
assert.match(read('public/student-dashboard.html'),/data-portal-nav="memberships"/);
assert.match(read('public/coach-dashboard.html'),/data-portal-nav="requests"/);
assert.match(read('public/coach-dashboard.html'),/data-portal-nav="tickets"/);

const checkout=read('public/checkout.html');
assert.match(checkout,/dropbeat-v1-15\.css\?v=1\.15/);
assert.match(read('public/assets/dropbeat-v1-15.css'),/summary-card/);
const resultApi=read('functions/api/payment-result.js');
assert.match(resultApi,/ensurePaidStudentPortalAccount/);
assert.match(resultApi,/student-dashboard\?payment=success/);
assert.match(read('public/assets/final-v16-4-payment-result.js'),/DATA\?\.portal\?\.route/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
assert.match(read('migrations/0048_dropbeat_role_portals_approvals.sql'),/requires_password_setup INTEGER NOT NULL DEFAULT 0/);
assert.doesNotMatch(read('migrations/0049_dropbeat_portal_tickets_checkout_v1_15.sql'),/ALTER TABLE portal_accounts ADD COLUMN requires_password_setup/);
const sqlite=new DatabaseSync(':memory:');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
assert.ok(sqlite.prepare("SELECT 1 FROM pragma_table_info('portal_accounts') WHERE name='requires_password_setup'").get());
assert.ok(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='portal_tickets'").get());

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}},SITE_URL:'https://studio.example.test'};

const password=await hashPortalPassword('DancePass!115');
assert.equal(password.iterations,100000);
const coach=await registerPortalAccount(env,{
  role:'coach',email:'slot.coach@example.test',password:'DancePass!115',displayName:'Slot Coach',phone:'+91 90000 00115',designation:'Dance Coach',badge:'Coach',bio:'Coach signup schedule verification.',experience:'Five years.',
  availabilitySlots:[{day:'sun',start:'08:00',end:'12:00',classTypes:['online_class','demo'],danceStyles:['Hip Hop']},{day:'mon',start:'14:00',end:'15:00',classTypes:['offline_class'],danceStyles:['Freestyle']}]
});
const coachRow=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(coach.account.id);
assert.equal(await verifyPortalPassword('DancePass!115',coachRow),true);
const coachProfile=sqlite.prepare('SELECT * FROM portal_coach_profiles WHERE account_id=?').get(coach.account.id);
const slots=JSON.parse(coachProfile.availability_slots_json);
assert.equal(slots.length,2);
assert.deepEqual(slots[0].classTypes,['online_class','demo']);
assert.deepEqual(slots[1].danceStyles,['Freestyle']);

sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB115-PAID-1','Paid Student','919000000115','paid.v115@example.test',79900,'INR','paid','paid','razorpay');
const linked=await ensurePaidStudentPortalAccount(env,{order_id:'DB115-PAID-1',customer_name:'Paid Student',customer_phone:'919000000115',customer_email:'paid.v115@example.test'});
assert.equal(linked.created,true);
assert.equal(linked.requiresPasswordSetup,true);
const paidRow=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(linked.account.id);
assert.equal(paidRow.status,'active');
assert.equal(paidRow.requires_password_setup,1);
const session=await createPortalSession(env,paidRow.id);
const cookie=session.header.split(';')[0];
const ticketResponse=await createTicket({request:new Request('https://studio.example.test/api/portal/tickets',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({subject:'Class access help',category:'class',message:'Please help me confirm the next class session.',priority:'normal'})}),env});
assert.equal(ticketResponse.status,201);
const ticket=await ticketResponse.json();
assert.match(ticket.ticketNumber,/^DBT-/);
assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM portal_tickets').get().count,1);

const publicGoogle=await startGoogle({request:new Request('https://studio.example.test/api/portal/google/start?intent=login'),env});
assert.equal(publicGoogle.status,400);
const googleBody=await publicGoogle.json();
assert.match(googleBody.error,/temporarily unavailable/i);
assert.equal(googleBody.contactUrl,'/contact');
assert.doesNotMatch(googleBody.error,/OAuth|client ID|client secret|coding access|admin security/i);

console.log(`DropBeat V1.15 verified: ${migrations.length} migrations, null-safe refresh helpers, collapsed coach status, three-mode access, 100k PBKDF2, precise coach slots, Drive media routing, paid-account handoff, dashboards and authenticated tickets.`);
