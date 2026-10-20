import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {attendanceReport} from '../functions/_lib/portal-attendance.js';
import {applyDueClassChanges,saveClassChange} from '../functions/_lib/class-management.js';
import {coachRemunerationReport,saveCoachRemuneration,saveCoachSettings} from '../functions/_lib/coach-remuneration.js';
import {ensureOccurrenceMeeting,indiaClassIsoV122,sessionSource} from '../functions/_lib/session-meetings.js';
import {effectiveSourceStart,nextScheduledDate} from '../functions/_lib/studio-schedule.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
const sqlite=new DatabaseSync(':memory:');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
for(const table of ['portal_login_otp_challenges','studio_class_changes','studio_class_change_acceptances','class_session_meetings','coach_remuneration_terms'])assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table),`${table} was not migrated`);
assert.ok(sqlite.prepare("SELECT name FROM pragma_table_info('product_class_mappings') WHERE name='meeting_provider'").get());
assert.ok(sqlite.prepare("SELECT name FROM pragma_table_info('portal_coach_profiles') WHERE name='remuneration_expectation_type'").get());

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class.pages.dev',ADMIN_DEVELOPMENT_BYPASS:'true'};

const coachAccountId=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source,approved_at) VALUES('coach','coach.v122@example.test','Manisha Coach','Manisha Coach','919100001222','active','admin',CURRENT_TIMESTAMP)").run().lastInsertRowid);
const coach1=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order,portal_account_id,contact_email) VALUES('Manisha Coach','manisha-v122','Senior Dance Coach','Coach','Primary coach','["Hip Hop"]','["mon","tue","wed"]','["online_class"]','active',1,?,'coach.v122@example.test')`).run(coachAccountId).lastInsertRowid);
const coach2=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES('Satvik Coach','satvik-v122','Dance Coach','["Bollywood"]','["mon","tue","wed"]','["online_class"]','active',2)`).run().lastInsertRowid);
const coach3=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES('Replacement Coach','replacement-v122','Dance Coach','["Contemporary"]','["mon","tue","wed"]','["online_class"]','active',3)`).run().lastInsertRowid);
sqlite.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,badge,bio,experience,specialties_json,availability_days_json,availability_slots_json,class_types_json,application_status) VALUES(?,?,'Senior Dance Coach','Coach','Primary coach','Eight years','["Hip Hop"]','["mon","tue","wed"]','[]','["online_class"]','approved')`).run(coachAccountId,coach1);

function addProduct(sku,slug){return Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,features_json) VALUES(?, ?, ?, 'subscription','Test','Test',50000,40000,'INR','active','[]')`).run(sku,`${sku} Plan`,slug).lastInsertRowid);}
function addMapping(productId,{coachId=coach1,start='',days='["mon","tue","wed"]',time='10:00'}={}){sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,schedule_start_date,start_mode,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,location_or_link,reminders_enabled,reminder_plan_json,status,meeting_provider) VALUES(?,1,'online_class','online_class',?,?, '["Hip Hop"]',?,'purchase_date',?,60,3,?,'Asia/Kolkata','online','',0,'[]','active','google_meet')`).run(productId,`${productId} Dance Class`,coachId,start,time,days);}
function addMember(productId,{email,start,payment='paid',coachId=coach1}={}){return Number(sqlite.prepare(`INSERT INTO webinar_members(event_type,customer_name,customer_phone,customer_email,class_time,fees_paid_paise,status,last_payment_at,start_date,duration_minutes,days_per_week,class_days_json,plan_name,product_id,coach_id,order_reference,dance_styles_json,payment_status,payment_mode) VALUES('online_class','Test Student','919200001222',?,'10:00',40000,'current',?, ?,60,3,'["mon","tue","wed"]','Test Plan',?,?,?,'["Hip Hop"]',?,'subscription')`).run(email,start,start,productId,coachId,`ORDER-${productId}-${email}`,payment).lastInsertRowid);}

// With no public batch date, only the first valid paid enrolment establishes
// eligibility. The first actual occurrence is the next teaching day.
const purchaseStartProduct=addProduct('DB122-START','db122-start');addMapping(purchaseStartProduct);
addMember(purchaseStartProduct,{email:'unpaid.v122@example.test',start:'2026-09-01',payment:'unpaid'});
addMember(purchaseStartProduct,{email:'paid.v122@example.test',start:'2026-10-08',payment:'paid'});
assert.equal(effectiveSourceStart({member_start_date:'2026-10-08'}),'2026-10-08');
assert.equal(nextScheduledDate('2026-10-08',['mon','tue','wed']),'2026-10-12');
const source=await sessionSource(env,'product',purchaseStartProduct);
assert.equal(source.member_start_date,'2026-10-08');
const october=await attendanceReport(env,{from:'2026-09-01',to:'2026-10-14',participant:'students'});
const purchaseSessions=october.sessions.filter(row=>Number(row.sourceId||String(row.sessionKey).split(':')[1])===purchaseStartProduct);
assert.deepEqual(purchaseSessions.map(row=>row.date),['2026-10-12','2026-10-13','2026-10-14']);
assert.equal(purchaseSessions.every(row=>row.enrolled===1),true,'unpaid members must not inflate enrolled counts');

// An ended occurrence can never silently recreate or expose its meeting URL.
sqlite.prepare(`INSERT INTO class_session_meetings(source_type,source_id,session_date,coach_id,provider,starts_at,duration_minutes,provider_event_id,meeting_url,status,ended_at) VALUES('product',?,'2026-10-12',?,'google_meet',?,60,'ended-event','','ended',CURRENT_TIMESTAMP)`).run(purchaseStartProduct,coach1,indiaClassIsoV122('2026-10-12','10:00'));
await assert.rejects(()=>ensureOccurrenceMeeting(env,{sourceType:'product',sourceId:purchaseStartProduct,date:'2026-10-12'}),/already ended/i);
assert.equal(indiaClassIsoV122('2026-10-12','10:00'),'2026-10-12T04:30:00.000Z');

// Remuneration is calculated only inside approved effective dates, does not
// count future sessions as missed, and protects scheduled approved leave.
const payProduct=addProduct('DB122-PAY','db122-pay');addMapping(payProduct,{start:'2020-08-03',days:'["mon"]'});addMember(payProduct,{email:'pay.student.v122@example.test',start:'2020-08-03'});
sqlite.prepare(`INSERT INTO portal_session_attendance(session_key,session_date,source_type,source_id,participant_role,participant_key,account_id,coach_id,class_name,coach_name,class_type,starts_at,duration_minutes,status) VALUES(?, '2020-08-10','product',?,'coach',?, ?,?,'Pay Dance Class','Manisha Coach','online_class','2020-08-10T04:30:00.000Z',60,'present')`).run(`product:${payProduct}:2020-08-10`,payProduct,String(coach1),coachAccountId,coach1);
sqlite.prepare(`INSERT INTO coach_leave_requests(account_id,coach_id,leave_type,purpose,from_date,to_date,reason,status) VALUES(?,?,'planned','Family appointment','2020-08-17','2020-08-17','Approved planned leave','approved')`).run(coachAccountId,coach1);
await saveCoachSettings(env,{askRemunerationExpectation:true,leaveRulesEnabled:true,paidLeavesPerMonth:1,deductionMethod:'per_session',deductionPercent:0});
await saveCoachRemuneration(env,{coachId:coach1,remunerationType:'per_session',rateRupees:100,effectiveFrom:'2020-08-10'},'admin@example.test');
const payReport=await coachRemunerationReport(env,{from:'2020-08-01',to:'2020-08-31',coachId:coach1}),payRow=payReport.rows[0];
assert.equal(payRow.scheduledSessions,4);
assert.equal(payRow.attendedSessions,1);
assert.equal(payRow.approvedLeaveDays,1);
assert.equal(payRow.paidLeaveDays,1);
assert.equal(payRow.missedSessions,2);
assert.equal(payRow.grossPaise,40000);
assert.equal(payRow.deductionPaise,20000);
assert.equal(payRow.netPaise,20000);
const futurePay=await coachRemunerationReport(env,{from:'2099-01-01',to:'2099-01-31',coachId:coach1});
assert.equal(futurePay.rows[0].scheduledSessions,0);
assert.equal(futurePay.rows[0].missedSessions,0);

// Expiring temporary changes are restored before a new due change is applied.
const transitionProduct=addProduct('DB122-TRANSITION','db122-transition');addMapping(transitionProduct,{coachId:coach2,start:'2020-01-01',days:'["mon"]'});
sqlite.prepare(`INSERT INTO studio_class_changes(source_type,source_id,change_type,old_coach_id,new_coach_id,old_class_time,new_class_time,old_duration_minutes,new_duration_minutes,old_class_days_json,new_class_days_json,effective_start_date,effective_end_date,migrate_students,reason,status) VALUES('product',?,'coach',?,?, '10:00','10:00',60,60,'["mon"]','["mon"]','2030-01-01','2030-01-09',1,'Temporary coach','active')`).run(transitionProduct,coach1,coach2);
sqlite.prepare(`INSERT INTO studio_class_changes(source_type,source_id,change_type,old_coach_id,new_coach_id,old_class_time,new_class_time,old_duration_minutes,new_duration_minutes,old_class_days_json,new_class_days_json,effective_start_date,effective_end_date,migrate_students,reason,status) VALUES('product',?,'coach',?,?, '10:00','10:00',60,60,'["mon"]','["mon"]','2030-01-10','',1,'Next coach','scheduled')`).run(transitionProduct,coach1,coach3);
await applyDueClassChanges(env,'2030-01-10');
assert.equal(Number(sqlite.prepare('SELECT coach_id FROM product_class_mappings WHERE product_id=?').get(transitionProduct).coach_id),coach3);

// A historical permanent change no longer blocks a later effective-dated
// replacement, while both records remain available for date-aware history.
const sequentialProduct=addProduct('DB122-SEQUENTIAL','db122-sequential');addMapping(sequentialProduct,{coachId:coach2,start:'2020-01-01',days:'["mon"]'});
sqlite.prepare(`INSERT INTO studio_class_changes(source_type,source_id,change_type,old_coach_id,new_coach_id,old_class_time,new_class_time,old_duration_minutes,new_duration_minutes,old_class_days_json,new_class_days_json,effective_start_date,effective_end_date,migrate_students,reason,status) VALUES('product',?,'coach',?,?, '10:00','10:00',60,60,'["mon"]','["mon"]','2020-01-01','',1,'First permanent replacement','active')`).run(sequentialProduct,coach1,coach2);
const nextChange=await saveClassChange(env,{sourceType:'product',sourceId:sequentialProduct,changeType:'coach',newCoachId:coach3,effectiveStartDate:'2099-01-01',reason:'Second permanent replacement',migrateStudents:true},'admin@example.test');
assert.ok(nextChange.id>0);
assert.equal(sqlite.prepare("SELECT status FROM studio_class_changes WHERE source_type='product' AND source_id=? AND reason='First permanent replacement'").get(sequentialProduct).status,'completed');
assert.equal(sqlite.prepare('SELECT status FROM studio_class_changes WHERE id=?').get(nextChange.id).status,'scheduled');

// Static integration checks cover the final browser wiring and access rules.
const adminHtml=read('public/admin/index.html'),adminJs=read('public/admin/dropbeat-admin-v1-22.js'),adminCss=read('public/admin/dropbeat-admin-v1-22.css'),scheduleJs=read('public/admin/dropbeat-admin-v1-19.js'),attendanceJs=read('public/admin/dropbeat-admin-v1-16.js'),portalDashboard=read('functions/_lib/portal-dashboard.js');
assert.match(adminHtml,/dropbeat-admin-v1-22\.js\?v=1\.25/);
assert.match(adminHtml,/dropbeat-admin-v1-22\.css\?v=1\.23/);
assert.match(adminCss,/#dropbeatAuthShell\[hidden\].*display:none!important/);
assert.match(adminJs,/insertAdjacentElement\('afterend',button\)/);
assert.match(adminJs,/data-db122-list-pending-coach/);
assert.match(adminJs,/data-db122-edit-pay/);
assert.match(scheduleJs,/data-leave-tab/);
assert.match(scheduleJs,/data-holiday-tab/);
assert.match(scheduleJs,/data-holiday-add/);
assert.match(scheduleJs,/data-coach-detail/);
assert.doesNotMatch(scheduleJs,/<details class="db119-accordion"/);
assert.match(attendanceJs,/data-roster/);
assert.match(attendanceJs,/data-session-reviews/);
assert.match(attendanceJs,/data-coach-detail/);
assert.match(portalDashboard,/meeting\.status!==['"]started['"]/);
assert.match(read('public/login.html'),/portal-auth-v1-22\.js\?v=1\.22/);
assert.match(read('functions/api/portal/auth/otp.js'),/request_reset/);
assert.match(read('functions/api/portal/identity-verification.js'),/phone_change/);
assert.match(read('functions/_lib/session-meetings.js'),/status==='ended'/);
assert.match(read('functions/_lib/session-meetings.js'),/payment_status/);

console.log('DropBeat V1.22 verified: paid-enrolment session starts, persistent Schedule UI, direct leave/holiday tabs, clickable profile paths, secure occurrence meetings, effective class changes, OTP recovery and attendance-based remuneration.');
