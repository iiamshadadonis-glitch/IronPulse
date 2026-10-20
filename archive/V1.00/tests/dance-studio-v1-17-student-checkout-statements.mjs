import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {createPortalSession,registerPortalAccount} from '../functions/_lib/portal-auth.js';
import {ensureSchema} from '../functions/_lib/schema.js';
import {onRequestGet as getPaymentStatement} from '../functions/api/portal/payment-statement.js';
import {onRequestPost as updatePortalProfile} from '../functions/api/portal/profile.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');assert.equal(lock.version,'1.33.0');assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

for(const relative of ['functions/api/portal/payment-statement.js','public/assets/portal-dashboard-v1-17.js','public/assets/portal-v1-17.css','public/assets/checkout-v1-17.js'])assert.ok(fs.existsSync(path.join(root,relative)),`${relative} must exist`);
const checkout=read('public/checkout.html'),app=read('public/assets/app.js'),student=read('public/student-dashboard.html'),portal=read('public/assets/portal-dashboard-v1-17.js'),profile=read('functions/api/portal/profile.js'),statement=read('functions/api/portal/payment-statement.js'),canonicalNav=read('public/admin/final-v16-62-inbox-nav-automations.js'),ticketAdmin=read('public/admin/dropbeat-admin-v1-15.js');
assert.match(checkout,/checkout-v1-17\.js/);assert.doesNotMatch(checkout,/Preferred Dance Style|preferred_role/);assert.doesNotMatch(app,/preferred_role:fd\.get/);
assert.match(student,/portal-dashboard-v1-17\.js/);assert.match(student,/portal-v1-17\.css/);
for(const phrase of ['Reset Colours','theme_reset','Payment Statement','Last 1 Month','Last 3 Months','Last 6 Months','Last 1 Year','Custom Date','Download PDF Statement','PAYMENT STATEMENT','Page ${pageNumber} of ${pageCount}'])assert.match(portal,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.doesNotMatch(portal,/text\/csv|\.csv/);assert.match(profile,/action==='theme_reset'/);assert.match(statement,/requirePortalAccount\(request,env,\['student'\]\)/);assert.match(statement,/lower\(COALESCE\(o\.customer_email,''\)\)=\?/);assert.match(statement,/payment_receipts/);assert.match(statement,/cache-control':'private, no-store/);
assert.match(canonicalNav,/\['portalTicketsAdmin','Tickets'\]/);assert.match(canonicalNav,/\['attendance','Attendance'\]/);assert.doesNotMatch(ticketAdmin,/observe\(document\.body,\{childList:true,subtree:true\}\)/);assert.match(ticketAdmin,/:scope > details/);

const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
class Statement{constructor(sql){this.sql=sql;this.args=[];}bind(...args){this.args=args;return this;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://studio.example.test',ADMIN_DEVELOPMENT_BYPASS:'true'};
await ensureSchema(env);
sqlite.prepare("UPDATE settings SET value=? WHERE key='site_settings'").run(JSON.stringify({siteName:'Rhythm Test Studio',tagline:'Dance with confidence',primaryColor:'#234567',accentColor:'#a14477',logoUrl:'/assets/dropbeat-logo.svg'}));

const studentAccount=await registerPortalAccount(env,{role:'student',email:'statement.student@example.test',password:'DancePass!117',displayName:'Statement Student',phone:'+919100000117'});
sqlite.prepare("UPDATE portal_accounts SET status='active',theme_primary='#112233',theme_accent='#445566' WHERE id=?").run(studentAccount.account.id);
const otherAccount=await registerPortalAccount(env,{role:'student',email:'other.student@example.test',password:'DancePass!117',displayName:'Other Student',phone:'+919100000118'});
sqlite.prepare("UPDATE portal_accounts SET status='active' WHERE id=?").run(otherAccount.account.id);

function addPayment({orderId,email,name,amount,transaction}){
  const order=sqlite.prepare("INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,gateway_order_id,gateway_payment_id,created_at,updated_at) VALUES(?,?,?,?,?,'INR','paid','paid','subscription','razorpay',?,?,?,?)").run(orderId,name,'919100000117',email,amount,`gateway-${orderId}`,transaction,'2026-09-15T06:00:00.000Z','2026-09-15T06:05:00.000Z');
  sqlite.prepare("INSERT INTO order_items(order_id,product_name,quantity,unit_amount_paise,status) VALUES(?,?,1,?,'active')").run(Number(order.lastInsertRowid),'Online Dance Pass',amount);
  sqlite.prepare("INSERT INTO payment_receipts(gateway,transaction_id,order_id,subscription_id,amount_paise,currency,status,payment_kind,payment_method,paid_at_epoch,paid_at,payload_json) VALUES('razorpay',?,?,?,?,'INR','paid','subscription','upi',strftime('%s',?),?,'{}')").run(transaction,orderId,`sub-${orderId}`,amount,'2026-09-15T06:05:00.000Z','2026-09-15T06:05:00.000Z');
}
addPayment({orderId:'DB117-STUDENT',email:'statement.student@example.test',name:'Statement Student',amount:249900,transaction:'pay-db117'});
addPayment({orderId:'DB117-OTHER',email:'other.student@example.test',name:'Other Student',amount:999900,transaction:'pay-other'});

const session=await createPortalSession(env,studentAccount.account.id),cookie=session.header.split(';')[0];
const response=await getPaymentStatement({request:new Request('https://studio.example.test/api/portal/payment-statement?from=2026-09-01&to=2026-09-30',{headers:{cookie}}),env});
assert.equal(response.status,200);assert.match(response.headers.get('cache-control')||'',/private/);const data=await response.json();
assert.equal(data.customer.email,'statement.student@example.test');assert.equal(data.brand.name,'Rhythm Test Studio');assert.equal(data.brand.primaryColor,'#234567');assert.equal(data.rows.length,1);assert.equal(data.rows[0].orderId,'DB117-STUDENT');assert.equal(data.rows[0].reference,'pay-db117');assert.equal(data.summary.paidPaise,249900);assert.equal(JSON.stringify(data).includes('DB117-OTHER'),false);
const anonymous=await getPaymentStatement({request:new Request('https://studio.example.test/api/portal/payment-statement?from=2026-09-01&to=2026-09-30'),env});assert.notEqual(anonymous.status,200);
const empty=await getPaymentStatement({request:new Request('https://studio.example.test/api/portal/payment-statement?from=2025-01-01&to=2025-01-31',{headers:{cookie}}),env});assert.equal(empty.status,200);const emptyData=await empty.json();assert.equal(emptyData.rows.length,0);assert.equal(emptyData.hasAnyPaymentHistory,true);

const resetForm=new FormData();resetForm.set('action','theme_reset');const reset=await updatePortalProfile({request:new Request('https://studio.example.test/api/portal/profile',{method:'POST',headers:{cookie},body:resetForm}),env});assert.equal(reset.status,200);const savedTheme=sqlite.prepare('SELECT theme_primary,theme_accent FROM portal_accounts WHERE id=?').get(studentAccount.account.id);assert.equal(savedTheme.theme_primary,'');assert.equal(savedTheme.theme_accent,'');

console.log(`DropBeat V1.17 verified: ${migrations.length} migrations, dashboard colour reset, student checkout prefill, first-class visibility, private statement filtering, branded PDF generation and stable admin navigation.`);
