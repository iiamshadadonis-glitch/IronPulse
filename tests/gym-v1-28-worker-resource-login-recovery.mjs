import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {ensureSchema} from '../functions/_lib/schema.js';
import {onRequestPost as portalLogin} from '../functions/api/portal/auth/login.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const sqlite=new DatabaseSync(':memory:');

// Reproduce the exact production upgrade state: V1.26's tables and its stable
// full-schema marker are present, while migration 0055 has not been applied.
const oldMigrations=fs.readdirSync(path.join(root,'migrations'))
  .filter(file=>file.endsWith('.sql')&&file<'0055_dropbeat_billing_interval_first_payment_v1_26.sql')
  .sort();
for(const file of oldMigrations)sqlite.exec(read(`migrations/${file}`));
sqlite.prepare("INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES('schema_ready',?,CURRENT_TIMESTAMP)")
  .run(JSON.stringify({version:'v16-96-contacts-notification-personalization-dropbeat-v1.04'}));

const operations=[];
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){operations.push({kind:'all',sql:this.sql});return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){operations.push({kind:'first',sql:this.sql});const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){operations.push({kind:'run',sql:this.sql});const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={
  DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},
  DEFAULT_CURRENCY:'INR',
  SITE_URL:'https://dance-class-at2.pages.dev',
  PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'
};

await Promise.all([ensureSchema(env),ensureSchema(env),ensureSchema(env)]);
const schemaOperations=operations.length;
assert.ok(schemaOperations<=15,`an existing installation must use a bounded checkout patch, not the full legacy schema pass (observed ${schemaOperations} D1 operations)`);
for(const [table,column] of [['products','billing_interval'],['order_items','first_payment_amount_paise'],['order_items','recurring_unit_amount_paise'],['order_items','coupon_recurring_scope']]){
  assert.ok(sqlite.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name=?`).get(column),`${table}.${column} must be repaired`);
}
assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='schema_patch_v1_28_checkout_columns'").get()?.value,'v1.28','the lightweight checkout patch must have its own persistent marker');
assert.match(JSON.parse(sqlite.prepare("SELECT value FROM settings WHERE key='schema_ready'").get().value).version,/v1\.27/i,'the compatible global marker must still advance after the lightweight patch');

// Admin credentials entered on the unified Login page must be checked before
// portal/student/coach schema preparation. This protects admin access even if
// an optional portal table ever needs maintenance.
const adminEmail='admin@dance-class.local',adminPassword='V128-Admin-Password!',salt='v128-salt';
const passwordHash=createHash('sha256').update(`${salt}:${adminPassword}`).digest('hex');
sqlite.prepare("INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES('auth_schema_ready','v16.71',CURRENT_TIMESTAMP)").run();
sqlite.prepare("DELETE FROM settings WHERE key='portal_schema_ready'").run();
sqlite.prepare("INSERT INTO admin_users(email,name,password_hash,salt,role,status) VALUES(?,?,?,?,?,'active')")
  .run(adminEmail,'V1.28 Admin',passwordHash,salt,'admin');
operations.length=0;
const loginRequest=new Request('https://dance-class-at2.pages.dev/api/portal/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:adminEmail,password:adminPassword,remember:true})});
const loginResponse=await portalLogin({request:loginRequest,env});
const loginData=await loginResponse.json();
assert.equal(loginResponse.status,200,loginData.error||'admin login through the unified Login page must succeed');
assert.equal(loginData.role,'admin');
assert.equal(loginData.route,'/admin/');
const loginOperations=operations.length;
assert.ok(loginOperations<=8,`admin login must not initialize portal/application schema first (observed ${loginOperations} D1 operations)`);
assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='portal_schema_ready'").get(),undefined,'admin login must not depend on portal schema initialization');

const middlewareSource=read('functions/_middleware.js');
assert.match(middlewareSource,/isPortalAuth\s*=\s*url\.pathname\.startsWith\('\/api\/portal\/auth\/'\)/,'portal authentication APIs must bypass full application schema maintenance');
assert.match(middlewareSource,/!privateDocument[\s\S]*runTrafficMaintenance/,'Login and dashboard documents must not launch public marketing maintenance');
const portalLoginSource=read('functions/api/portal/auth/login.js');
assert.ok(portalLoginSource.indexOf('const adminResponse=await adminLogin')<portalLoginSource.indexOf('await ensurePortalSchema(env)'), 'the unified login must verify an administrator before portal schema work');

console.log(`DropBeat V1.28 verified: the existing-database upgrade uses ${schemaOperations} D1 operations, unified Admin login uses ${loginOperations}, authentication bypasses portal/full-schema maintenance, and private pages do not start public traffic maintenance.`);
