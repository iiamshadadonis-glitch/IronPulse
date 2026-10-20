import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {listClassWorkspace} from '../functions/_lib/dance-studio.js';
import {syncStudentLeadForAccount} from '../functions/_lib/identity-sync.js';
import {adminOccurrenceJoinState,indiaClassIsoV122} from '../functions/_lib/session-meetings.js';
import {coachRemunerationReport,saveCoachLeaveRule,saveCoachRemuneration,saveCoachSettings} from '../functions/_lib/coach-remuneration.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');assert.equal(lock.version,'1.33.0');assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
const sqlite=new DatabaseSync(':memory:');for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coach_leave_rule_overrides'").get());

class Statement{constructor(sql){this.sql=sql;this.args=[];}bind(...args){this.args=args;return this;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'};

// A portal student is the authoritative CRM identity, even when an older lead
// stored a country-code variant of the same phone number.
const studentId=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source) VALUES('student','rohan.v123@example.test','Rohan Updated','Rohan Updated','+91 81254 85158','pending','admin_review')").run().lastInsertRowid);
sqlite.prepare("INSERT INTO contact_leads(name,phone,email,message,source,status) VALUES('Instautomate','918125485158','old-rohan@example.test','Old enquiry','website','new')").run();
const identity=await syncStudentLeadForAccount(env,studentId);assert.equal(identity.updated,1);const synced=sqlite.prepare("SELECT name,email,phone FROM contact_leads ORDER BY id DESC LIMIT 1").get();assert.equal(synced.name,'Rohan Updated');assert.equal(synced.email,'rohan.v123@example.test');assert.equal(synced.phone,'+91 81254 85158');

const coachAccount=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source) VALUES('coach','coach.v123@example.test','Manisha Coach','Manisha Coach','919100001223','active','admin')").run().lastInsertRowid);
const coachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,bio,dance_styles_json,availability_json,class_types_json,status,sort_order,portal_account_id) VALUES('Manisha Coach','manisha-v123','Senior Coach','Coach','["Hip Hop"]','["sun","mon","tue"]','["online_class","offline_class","demo"]','active',1,?)`).run(coachAccount).lastInsertRowid);
sqlite.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,badge,bio,specialties_json,availability_days_json,availability_slots_json,class_types_json,application_status) VALUES(?,?,'Senior Coach','Coach','Coach','["Hip Hop"]','["sun","mon","tue"]','[{"day":"sun","start":"10:00","end":"11:00"},{"day":"sun","start":"19:00","end":"20:00"},{"day":"sun","start":"06:00","end":"10:00"},{"day":"mon","start":"10:00","end":"11:00"},{"day":"tue","start":"10:00","end":"11:00"}]','["online_class","offline_class","demo"]','approved')`).run(coachAccount,coachId);

function addClass(type,slug){const productId=Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,features_json) VALUES(?,?,?,'subscription','Test','Test',50000,40000,'INR','active','[]')`).run(`V123-${type}`,`${type} plan`,slug).lastInsertRowid);sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,schedule_start_date,start_mode,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,location_or_link,reminders_enabled,reminder_plan_json,status,meeting_provider) VALUES(?,1,?,?,?,?,'["Hip Hop"]','2026-10-01','fixed_date','10:00',60,7,'["sun","mon","tue","wed","thu","fri","sat"]','Asia/Kolkata',?,'',0,'[]','active','google_meet')`).run(productId,type,type,`${type} class`,coachId,type==='offline_class'?'offline':'online');return productId;}
const onlineProduct=addClass('online_class','v123-online');addClass('offline_class','v123-offline');addClass('demo','v123-demo');
sqlite.prepare(`INSERT INTO webinar_members(event_type,customer_name,customer_phone,customer_email,class_time,status,start_date,duration_minutes,days_per_week,class_days_json,plan_name,product_id,coach_id,payment_status,payment_mode) VALUES('online_class','Paid Student','919200001223','paid.v123@example.test','10:00','current','2026-10-01',60,7,'["sun","mon","tue","wed","thu","fri","sat"]','V123',?,?,'paid','subscription')`).run(onlineProduct,coachId);
sqlite.prepare("INSERT INTO studio_holidays(event_name,start_date,end_date,subject,message,notice_date,status,created_by) VALUES('Gandhi Jayanti','2026-10-02','2026-10-02','Studio closed','Holiday','2026-10-01','active','admin@example.test')").run();
for(const type of ['online_class','offline_class','demo']){const workspace=await listClassWorkspace(env,{eventType:type,month:'2026-10'});assert.equal(workspace.studioHolidays.some(row=>row.date==='2026-10-02'&&row.eventName==='Gandhi Jayanti'),true,`${type} calendar must receive studio holidays`);}
const holidayStart=Date.parse(indiaClassIsoV122('2026-10-02','10:00')),join=await adminOccurrenceJoinState(env,{sourceType:'product',sourceId:onlineProduct,date:'2026-10-02',now:holidayStart});assert.equal(join.joinEnabled,false);assert.match(join.joinLabel,/Studio holiday/i);

// Teaching availability drives the report; studio defaults can be overridden
// or disabled for one coach without changing the remuneration agreement.
await saveCoachSettings(env,{askRemunerationExpectation:true,leaveRulesEnabled:true,paidLeavesPerMonth:2,deductionMethod:'per_session'});
await saveCoachRemuneration(env,{coachId,remunerationType:'per_session',rateRupees:500,effectiveFrom:'2026-10-01'},'admin@example.test');
let report=await coachRemunerationReport(env,{from:'2026-10-01',to:'2026-10-01',coachId}),row=report.rows[0];assert.deepEqual(row.availableDays,['Sunday','Monday','Tuesday']);assert.equal(row.sessionsPerWeek,5);assert.equal(row.sessionsPerMonth,20);assert.equal(row.leaveCalculationEnabled,true);
await saveCoachLeaveRule(env,{coachId,ruleMode:'disabled'},'admin@example.test');report=await coachRemunerationReport(env,{from:'2026-10-01',to:'2026-10-01',coachId});assert.equal(report.rows[0].leaveCalculationEnabled,false);assert.equal(report.rows[0].deductionPaise,0);
await saveCoachLeaveRule(env,{coachId,ruleMode:'custom',paidLeavesPerMonth:4,deductionMethod:'percentage',deductionPercent:10},'admin@example.test');report=await coachRemunerationReport(env,{from:'2026-10-01',to:'2026-10-01',coachId});assert.equal(report.rows[0].specialLeaveRule,true);assert.equal(report.rows[0].paidLeavesPerMonth,4);assert.equal(report.rows[0].deductionMethod,'percentage');

const adminHtml=read('public/admin/index.html'),scheduleJs=read('public/admin/dropbeat-admin-v1-19.js'),calendarJs=read('public/admin/dropbeat-admin-v1-13.js'),settingsJs=read('public/admin/dropbeat-admin-v1-22.js'),marketingJs=read('public/admin/final-v16-93-marketing-integrations.js'),marketingBackend=read('functions/_lib/marketing-suite.js');
assert.match(adminHtml,/dropbeat-admin-v1-23\.css\?v=1\.23/);assert.match(scheduleJs,/Join Session/);assert.match(scheduleJs,/colspan="9"/);assert.match(scheduleJs,/colspan="6"/);assert.match(calendarJs,/studioHolidays/);assert.match(calendarJs,/Studio Holiday/);assert.match(settingsJs,/Enable Leave Rules/);assert.match(settingsJs,/Special Leave Rules/);assert.doesNotMatch(settingsJs,/Monthly Base \(₹\)/);assert.match(marketingJs,/google_ads','gtm_api','ga4_api','mailchimp/);assert.match(marketingJs,/meta_ads','pinterest_ads','x_ads','snapchat_ads/);assert.match(marketingJs,/Authorized Redirect URI/);assert.match(marketingBackend,/googleTagManagerApi/);assert.match(marketingBackend,/googleAnalyticsApi/);
for(const file of ['functions/api/admin/marketing-google-auth.js','functions/api/admin/marketing-google-oauth/callback.js','functions/api/admin/marketing-mailchimp-auth.js','functions/api/admin/marketing-mailchimp-oauth/callback.js'])assert.ok(fs.existsSync(path.join(root,file)),`${file} must be included`);

console.log('DropBeat V1.23 verified: holidays propagate to every class calendar, schedule grids persist, admin join windows are guarded, identities synchronize, leave rules support global/custom/bypass modes, and marketing OAuth connectors are correctly grouped.');
