import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureEmailAutomationSchema,emailAutomationTemplates,saveEmailAutomation,listEmailAutomations,enrollEmailAutomationForEvent,trackEmailAutomationOpen,unsubscribeEmailAutomation} from '../functions/_lib/email-automations.js';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const index=read('public/admin/index.html');
const ui=read('public/admin/final-v17-05-email-automations.js');
const css=read('public/admin/final-v17-05-email-automations.css');
const backend=read('functions/_lib/email-automations.js');
const runner=read('functions/api/automation/lead-nurture.js');

assert.match(index,/final-v17-05-email-automations\.css\?v=17\.08/);
assert.match(index,/final-v17-05-email-automations\.js\?v=17\.08/);
for(const phrase of ['Lead Email Follow-up','Current Workflows','Drafts','Templates','Activity Hub','Time delay','Internal notification','Send Test Email','Edit Plain Text','Change Template','Version History','Remove All Content Blocks','Preview and Test'])assert.match(ui,new RegExp(phrase));
for(const block of ['Navigation','Hero','Sections','Special','Products','Gallery','Blog & RSS','Social & sharing','Footer'])assert.ok(ui.includes(block),`${block} editor block is required`);
for(const feature of ['Specific day of year','+ Add Rule','Upload Image','Save Brand Style','saved template'])assert.ok(ui.includes(feature),`${feature} is required`);
assert.match(ui,/dataTransfer\.setData\('text\/uc-step'/);
assert.match(ui,/dataTransfer\.setData\('text\/uc-block'/);
assert.match(css,/grid-template-columns:240px minmax\(420px,1fr\) 360px/);
assert.match(backend,/idx_email_automation_due/);
assert.match(backend,/email_automation_suppressions/);
assert.match(backend,/utm_campaign/);
assert.match(backend,/open_count=open_count\+1/);
assert.match(runner,/processEmailAutomations/);
assert.match(runner,/enrollScheduledEmailAutomations/);

const templates=emailAutomationTemplates();
assert.ok(templates.length>=15);
for(const name of ['Advanced welcome email','Abandoned checkout','Online course','Webinar invitation','Birthday wishes','Membership renewal','NPS survey'])assert.ok(templates.some(x=>x.name===name),`${name} template is required`);

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,email TEXT,date_of_birth TEXT,age INTEGER,gender TEXT,location TEXT,source TEXT,status TEXT,created_at TEXT,updated_at TEXT);
INSERT INTO contact_leads VALUES(1,'Example Client','919000000000','client@example.test','1995-09-16',31,'female','Hyderabad, TS, IN','website','new',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
class Statement{constructor(sql){this.sql=sql;this.args=[];}bind(...a){this.args=a;return this;}async all(){return{results:sqlite.prepare(this.sql).all(...this.args)}}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return{meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid||0)}}}}
const env={DB:{prepare:sql=>new Statement(sql)}};
await ensureEmailAutomationSchema(env);
const source=templates.find(x=>x.id==='advanced-welcome');
let flow=await saveEmailAutomation(env,{name:'Welcome sequence',category:source.category,status:'draft',triggerType:source.triggerType,triggerConfig:{source:'all'},allowReentry:false,definition:{steps:source.steps,settings:{timezone:'Asia/Kolkata'}}});
assert.equal(flow.name,'Welcome sequence');
assert.equal(flow.definition.steps.length,3);
flow=await saveEmailAutomation(env,{...flow,name:'Welcome sequence edited',status:'draft'});
assert.ok(flow.versions.length>=1,'editing a saved flow must create version history');
const flows=await listEmailAutomations(env);assert.equal(flows.length,1);
const checkout=templates.find(x=>x.id==='abandoned-checkout');
const checkoutFlow=await saveEmailAutomation(env,{name:'Checkout recovery',category:checkout.category,status:'active',triggerType:checkout.triggerType,triggerConfig:{source:'all'},allowReentry:true,definition:{steps:checkout.steps,settings:{timezone:'Asia/Kolkata'}}});
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM email_automation_enrollments WHERE flow_id=?').get(checkoutFlow.id).n,0,'activating an event flow must not enroll unrelated existing leads');
await enrollEmailAutomationForEvent(env,{leadId:1,eventType:'abandoned_checkout',context:{eventId:'checkout-101',checkoutUrl:'https://example.test/pay/101',productName:'Premium Plan'}});
const eventEnrollment=sqlite.prepare('SELECT context_json FROM email_automation_enrollments WHERE flow_id=?').get(checkoutFlow.id);
assert.deepEqual(JSON.parse(eventEnrollment.context_json),{eventId:'checkout-101',checkoutUrl:'https://example.test/pay/101',productName:'Premium Plan'});
sqlite.exec(`INSERT INTO email_automation_enrollments(flow_id,lead_id,entry_key,status) VALUES(${flow.id},1,'test','completed');`);
const enrollment=sqlite.prepare('SELECT id FROM email_automation_enrollments LIMIT 1').get();
sqlite.prepare(`INSERT INTO email_automation_runs(enrollment_id,flow_id,lead_id,step_id,step_type,status,open_token) VALUES(?,?,?,?,?,?,?)`).run(enrollment.id,flow.id,1,'email-test','email','sent','open-test-token');
await trackEmailAutomationOpen(env,'open-test-token');
assert.equal(sqlite.prepare("SELECT open_count FROM email_automation_runs WHERE open_token='open-test-token'").get().open_count,1);
assert.equal(await unsubscribeEmailAutomation(env,'open-test-token'),true);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM email_automation_suppressions WHERE email='client@example.test'").get().n,1);

console.log('V17.05 email automation UI, templates, persistence, version, tracking and unsubscribe checks passed.');
