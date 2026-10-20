import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {attendanceRoster} from '../functions/_lib/portal-attendance.js';
import {applyCoachLeave,coachScheduleDetails,listStudioScheduleAdmin,requestCoachLeaveInformation} from '../functions/_lib/studio-schedule.js';
import {ensureSchema} from '../functions/_lib/schema.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const hash=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql','V1.20 must remain an additive UI/API compatibility release with no replacement migration');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://studio.example.test',PUBLIC_SITE_URL:'https://studio.example.test',ADMIN_DEVELOPMENT_BYPASS:'true'};
await ensureSchema(env);

const coachAccountId=Number(sqlite.prepare(`INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source,approved_at) VALUES('coach','coach.v120@example.test','Manisha Coach','Manisha Coach','919100000120','active','admin',CURRENT_TIMESTAMP)`).run().lastInsertRowid);
const coachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order,portal_account_id,contact_email,experience) VALUES('Manisha Coach','manisha-v120','Senior Dance Coach','Coach','Coach profile','["Hip Hop"]','["mon","tue","wed"]','["online_class"]','active',1,?,'coach.v120@example.test','Eight years')`).run(coachAccountId).lastInsertRowid);
sqlite.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,badge,bio,experience,specialties_json,availability_days_json,availability_slots_json,class_types_json,application_status) VALUES(?,?,'Senior Dance Coach','Coach','Coach profile','Eight years','["Hip Hop"]','["mon","tue","wed"]','[]','["online_class"]','approved')`).run(coachAccountId,coachId);
const productId=Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,features_json) VALUES('DB120-CLASS','Beginners Session','beginners-v120','subscription','Test','Test',50000,40000,'INR','active','[]')`).run().lastInsertRowid);
sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,schedule_start_date,start_mode,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,location_or_link,reminders_enabled,reminder_plan_json,status) VALUES(?,1,'online_class','online_class','Beginners Session',?,'["Hip Hop"]','2026-09-28','fixed_batch','10:00',60,3,'["mon","tue","wed"]','Asia/Kolkata','online','',0,'[]','active')`).run(productId,coachId);
const studentAccountId=Number(sqlite.prepare(`INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source,approved_at) VALUES('student','student.v120@example.test','Review Student','Review Student','919200000120','active','payment',CURRENT_TIMESTAMP)`).run().lastInsertRowid);
const memberId=Number(sqlite.prepare(`INSERT INTO webinar_members(event_type,customer_name,customer_phone,customer_email,class_time,fees_paid_paise,status,last_payment_at,start_date,duration_minutes,days_per_week,class_days_json,plan_name,product_id,coach_id,order_reference,dance_styles_json,payment_status,payment_mode) VALUES('online_class','Review Student','919200000120','student.v120@example.test','10:00',40000,'current','2026-09-28','2026-09-28',60,3,'["mon","tue","wed"]','Beginners Session',?,?,'DB120-ORDER','["Hip Hop"]','paid','subscription')`).run(productId,coachId).lastInsertRowid);
const sessionKey=`product:${productId}:2026-09-28`;
sqlite.prepare(`INSERT INTO portal_session_attendance(session_key,session_date,source_type,source_id,participant_role,participant_key,account_id,member_id,coach_id,class_name,coach_name,class_type,starts_at,duration_minutes,status) VALUES(?,'2026-09-28','product',?,'student',?,?,?,?,'Beginners Session','Manisha Coach','online_class','2026-09-28T04:30:00.000Z',60,'present')`).run(sessionKey,productId,String(studentAccountId),studentAccountId,memberId,coachId);
sqlite.prepare(`INSERT INTO portal_session_reviews(session_key,session_date,student_account_id,member_id,coach_id,rating,comment) VALUES(?,'2026-09-28',?,?,?,4,'Clear steps and helpful corrections.')`).run(sessionKey,studentAccountId,memberId,coachId);

const roster=await attendanceRoster(env,sessionKey);
assert.equal(roster.present.length,1);
assert.equal(roster.present[0].name,'Review Student');
assert.equal(roster.present[0].review.rating,4);
assert.equal(roster.present[0].review.comment,'Clear steps and helpful corrections.');
const emptyRoster=await attendanceRoster(env,'assignment:999999:2026-09-28');
assert.equal(emptyRoster.present.length,0);
assert.equal(emptyRoster.absent.length,0);

const details=await coachScheduleDetails(env,coachId);
assert.equal(details.reviews.length,1);
assert.equal(details.reviews[0].student_name,'Review Student');
assert.equal(details.reviews[0].class_name,'Beginners Session');
assert.equal(details.reviews[0].comment,'Clear steps and helpful corrections.');

const coachAccount=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(coachAccountId);
const leave=await applyCoachLeave(env,coachAccount,{leaveType:'planned',purpose:'Family appointment',fromDate:'2026-10-20',toDate:'2026-10-20',reason:'I need to attend a family appointment.'});
const info=await requestCoachLeaveInformation(env,{leaveId:leave.id,adminEmail:'admin@example.test',message:'Please confirm whether a substitute coach is available.'});
assert.match(info.message,/remains pending/i);
const storedLeave=sqlite.prepare('SELECT status,admin_reason,reviewed_by,reviewed_at FROM coach_leave_requests WHERE id=?').get(leave.id);
assert.equal(storedLeave.status,'pending');
assert.equal(storedLeave.admin_reason,'Please confirm whether a substitute coach is available.');
assert.equal(storedLeave.reviewed_by,'admin@example.test');
assert.ok(storedLeave.reviewed_at);
const overview=await listStudioScheduleAdmin(env);
assert.equal(overview.leaves.pending.some(row=>Number(row.id)===Number(leave.id)),true);

const attendanceJs=read('public/admin/dropbeat-admin-v1-16.js');
const scheduleJs=read('public/admin/dropbeat-admin-v1-19.js');
const navJs=read('public/admin/final-v16-62-inbox-nav-automations.js');
const adminCss=read('public/admin/dropbeat-admin-v1-20.css');
const adminHtml=read('public/admin/index.html');
assert.match(navJs,/\['studioSchedule','Schedule'\]/,'Schedule must be owned by the persistent Webinars navigation definition');
assert.match(attendanceJs,/classList\.add\('open'\)/);
assert.match(attendanceJs,/classList\.remove\('open'\)/);
assert.match(attendanceJs,/data-session-reviews/);
assert.match(attendanceJs,/No reviews have been submitted for this session yet/);
assert.match(scheduleJs,/data-leave-tab/);
assert.match(scheduleJs,/data-holiday-tab/);
assert.match(scheduleJs,/data-leave-info/);
assert.match(scheduleJs,/classList\.add\('open'\)/);
assert.match(scheduleJs,/classList\.remove\('open'\)/);
assert.doesNotMatch(scheduleJs,/<details class="db119-accordion"/,'Leaves and Holidays must be direct tabs, not dropdown accordions');
assert.match(adminCss,/\.db120-count-badge\[hidden\].*display:none!important/);
assert.match(adminCss,/\.db120-modal\.modal\.open\{display:flex/);
assert.match(adminHtml,/dropbeat-admin-v1-20\.css\?v=1\.20/);
assert.match(adminHtml,/dropbeat-admin-v1-16\.js\?v=1\.20/);
assert.match(adminHtml,/dropbeat-admin-v1-19\.js\?v=1\.24/);

const protectedThemeHashes={
  'public/admin/dropbeat-admin-theme.css':'51df33eb8a145c554888d59815a00491b0476914090d7efafce6a86314750c55',
  'public/admin/dropbeat-admin-v1-13.css':'7f144cd77042aef100ee9090882c266c23d445643d21478f4a68b8b57fcae8d4',
  'public/admin/dropbeat-admin-v1-14.css':'87dcb3927a1ca96b457066052ff404c8fd7740ce1aa9b3cbca26f04a9ddc46b1',
  'public/assets/portal-v1-14.css':'c5fec297b374bc450629fa587a48d614dca70ad0f2aa119766bc8e9a1006466f'
};
for(const [file,expected] of Object.entries(protectedThemeHashes))assert.equal(hash(file),expected,`${file} theme hash changed`);

const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');assert.equal(lock.version,'1.33.0');assert.equal(lock.packages[''].version,'1.33.0');
console.log('DropBeat V1.20 verified: persistent Schedule navigation, reliable modal lifecycle, direct leave/holiday tabs, zero-count rosters, session reviews, coach review details and unchanged theme files.');
