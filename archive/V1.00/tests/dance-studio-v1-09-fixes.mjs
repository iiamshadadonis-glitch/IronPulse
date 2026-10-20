import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {
  ensureDanceStudioSchema,
  listClassWorkspace,
  listDanceCoaches,
  saveDanceCoach,
  saveOrderClassAssignment,
  saveProductClassMapping,
  setDanceCoachStatus
} from '../functions/_lib/dance-studio.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.09'],'node tests/dance-studio-v1-09-fixes.mjs && npm run test:dance-v1.08');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const adminHtml=read('public/admin/index.html'),adminJs=read('public/admin/dropbeat-admin-v1-13.js'),adminCss=read('public/admin/dropbeat-admin-v1-13.css'),publicJs=read('public/assets/dropbeat-dance-v1-13.js'),publicCss=read('public/assets/dropbeat-dance-v1-13.css'),middleware=read('functions/_middleware.js');
assert.match(adminHtml,/dropbeat-admin-v1-13\.css\?v=1\.13/);
assert.match(adminHtml,/dropbeat-admin-v1-13\.js\?v=1\.29/);
assert.doesNotMatch(adminHtml,/dropbeat-admin-v1-08\.js/);
assert.match(read('public/assets/page-boot.js'),/dropbeat-dance-v1-13\.js\?v=1\.13/);
for(const phrase of ['Class Types They Conduct','After choosing a coach, only the class types they conduct are shown.','Choosing a coach hides every day they are unavailable.','applyCoachRules','coachSupportsWorkspace'])assert.ok(adminJs.includes(phrase),`V1.09 admin must include ${phrase}`);
for(const token of ['data-db109-coach-more','See more','See less','data-db109-coach-prev','data-db109-coach-next','?1:matchMedia','?2:3'])assert.ok(publicJs.includes(token),`V1.09 public coach browser must include ${token}`);
for(const selector of ['-webkit-line-clamp:2','.db109-coach-arrow','.db109-coach-card[hidden]'])assert.ok(publicCss.includes(selector),`V1.09 public CSS must include ${selector}`);
assert.match(adminCss,/\.db107-choice\[hidden\]\{display:none!important\}/);
assert.match(middleware,/context\.waitUntil\?\.\(purgeTask\)/);
assert.match(read('functions/_lib/edge-response-cache.js'),/bootstrap-dropbeat-v113:home/);
assert.match(read('functions/api/admin/products.js'),/getProductClassMappings/);

const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
assert.ok(sqlite.prepare('PRAGMA table_info(dance_coaches)').all().some(column=>column.name==='class_types_json'));

let prepareCount=0;
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare(sql){prepareCount++;return new Statement(sql);},async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};
await ensureDanceStudioSchema(env);const afterFirstEnsure=prepareCount;await ensureDanceStudioSchema(env);assert.equal(prepareCount,afterFirstEnsure,'dance schema readiness must be memoized after the first capability probe');

const onlineCoach=await saveDanceCoach(env,{name:'Canva Pro',designation:'Online Dance Coach',badge:'Coach',bio:'Teaches structured online dance classes with clear weekly practice goals.',dance_styles:['Hip Hop','Freestyle','Bollywood'],availability:['mon','tue','wed'],class_types:['online_class','demo'],status:'active'});
const studioCoach=await saveDanceCoach(env,{name:'Asha Menon',designation:'Studio Coach',badge:'Senior Coach',bio:'Leads in-studio classical dance sessions.',dance_styles:['Bharatanatyam','Kuchipudi'],availability:['sun'],class_types:['offline_class'],status:'active'});
const replacementCoach=await saveDanceCoach(env,{name:'Riya Kapoor',designation:'Dance Coach',badge:'Coach',bio:'Supports online classes and demo sessions.',dance_styles:['Hip Hop','Freestyle'],availability:['mon','tue','wed'],class_types:['online_class','demo'],status:'active'});
const coaches=await listDanceCoaches(env,{includeInactive:true}),canva=coaches.find(coach=>coach.id===onlineCoach);assert.deepEqual(canva.availability,['mon','tue','wed']);assert.deepEqual(canva.class_types,['online_class','demo']);

const product=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('DB109-ONLINE','Online Dance Batch','online-dance-batch','subscription','Online coaching.','A weekly online dance class.',59900,39900,'INR','active','Popular','[]','All levels',1),productId=Number(product.lastInsertRowid);
await assert.rejects(()=>saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'offline_class',class_name:'Incorrect Studio Batch',coach_id:onlineCoach,dance_styles:['Hip Hop'],days_per_week:1,class_days:['mon']}),/does not conduct Offline \/ Studio Class/);
await assert.rejects(()=>saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'online_class',class_name:'Incorrect Friday Batch',coach_id:onlineCoach,dance_styles:['Hip Hop'],days_per_week:1,class_days:['fri']}),/not available on Friday/);
await saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'online_class',class_name:'Online Monday and Wednesday Batch',coach_id:onlineCoach,dance_styles:['Hip Hop','Freestyle'],class_time:'09:00',days_per_week:2,class_days:['mon','wed']});

const order=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB109-SUB-1','Neha Rao','919900000099','neha@example.test',29900,'INR','active','paid','subscription','stripe');
await assert.rejects(()=>saveOrderClassAssignment(env,{orderPk:Number(order.lastInsertRowid),orderReference:'DB109-SUB-1',paymentMode:'subscription',input:{class_details_enabled:true,class_type:'webinar',class_name:'Unsupported Webinar',coach_id:onlineCoach,dance_styles:['Hip Hop'],days_per_week:1,class_days:['mon']}}),/does not conduct Webinar/);
await saveOrderClassAssignment(env,{orderPk:Number(order.lastInsertRowid),orderReference:'DB109-SUB-1',paymentMode:'subscription',input:{class_details_enabled:true,class_type:'online_class',class_name:'Private Tuesday Group',coach_id:onlineCoach,dance_styles:['Hip Hop'],days_per_week:1,class_days:['tue']}});

const onlineWorkspace=await listClassWorkspace(env,{eventType:'online_class',month:'2026-09'}),offlineWorkspace=await listClassWorkspace(env,{eventType:'offline_class',month:'2026-09'}),demoWorkspace=await listClassWorkspace(env,{eventType:'demo',month:'2026-09'});
assert.ok(onlineWorkspace.coaches.some(coach=>coach.id===onlineCoach));assert.ok(!onlineWorkspace.coaches.some(coach=>coach.id===studioCoach));
assert.ok(offlineWorkspace.coaches.some(coach=>coach.id===studioCoach));assert.ok(!offlineWorkspace.coaches.some(coach=>coach.id===onlineCoach));
assert.ok(demoWorkspace.coaches.some(coach=>coach.id===onlineCoach));assert.ok(!demoWorkspace.coaches.some(coach=>coach.id===studioCoach));

await assert.rejects(()=>saveDanceCoach(env,{...canva,id:onlineCoach,availability:['tue','wed'],class_types:['online_class','demo'],dance_styles:canva.dance_styles}),/outside this coach’s availability|runs on Monday/);
await assert.rejects(()=>setDanceCoachStatus(env,{id:onlineCoach,status:'draft',replacementCoachId:studioCoach}),/cannot be assigned|requires Online Class/);
await setDanceCoachStatus(env,{id:onlineCoach,status:'draft',replacementCoachId:replacementCoach});
assert.equal(sqlite.prepare('SELECT coach_id FROM product_class_mappings WHERE product_id=?').get(productId).coach_id,replacementCoach);
assert.equal(sqlite.prepare('SELECT coach_id FROM order_class_assignments WHERE order_reference=?').get('DB109-SUB-1').coach_id,replacementCoach);

console.log(`DropBeat V1.09 verification passed: ${migrations.length} migrations, compact coach cards, coach-specific days/types, server guardrails and non-blocking refresh paths.`);
