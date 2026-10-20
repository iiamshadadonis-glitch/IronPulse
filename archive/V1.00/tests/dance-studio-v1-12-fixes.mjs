import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {listDanceCoaches,validateProductClassDetails} from '../functions/_lib/dance-studio.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.12'],'node tests/dance-studio-v1-12-fixes.mjs && npm run test:dance-v1.11');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const adminHtml=read('public/admin/index.html');
const adminJs=read('public/admin/dropbeat-admin-v1-13.js');
const adminCss=read('public/admin/dropbeat-admin-v1-13.css');
const publicJs=read('public/assets/dropbeat-dance-v1-13.js');
const publicCss=read('public/assets/dropbeat-dance-v1-13.css');
const publicApp=read('public/assets/app.js');
const adminLanguage=read('public/admin/dropbeat-admin-language.js');
const pageBoot=read('public/assets/page-boot.js');
const danceLib=read('functions/_lib/dance-studio.js');
const productsApi=read('functions/api/admin/products.js');
const salesShim=read('public/admin/final-v16-84-inbox-telegram-sales.js');

assert.match(adminHtml,/dropbeat-admin-v1-13\.css\?v=1\.13/);
assert.match(adminHtml,/dropbeat-admin-v1-13\.js\?v=1\.29/);
assert.doesNotMatch(adminHtml,/dropbeat-admin-v1-11\.(?:css|js)\?v=1\.13/);
assert.match(pageBoot,/loadDropBeatV113/);
assert.match(pageBoot,/dropbeat-dance-v1-13\.css\?v=1\.13/);
assert.match(pageBoot,/dropbeat-dance-v1-13\.js\?v=1\.13/);

for(const token of [
  'ensureSalesPanel','installSalesRecovery','SALES_PANELS','ensureSalesPanel();installSalesRecovery()',
  'mode=coaches&v=1.13','coachesLoaded','renderCoaches(\'pages\')',
  'coachStyles','allowedStyles','data-db112-style-help','saved dance specialties',
  'data-db112-feature-count','maxlength="80"','maximum 80 characters'
])assert.ok(adminJs.includes(token),`V1.13 admin controller must include ${token}`);
assert.doesNotMatch(adminJs,/Array\.isArray\(data\?\.coaches\).*state\.coaches=data\.coaches/,'generic API responses must never overwrite the canonical coach directory');
assert.doesNotMatch(salesShim,/setTimeout\(init,(?:5200|7600)\)/,'Sales must mount immediately rather than several seconds after navigation');
for(const token of ['.db112-feature-field','[data-db112-feature-count]'])assert.ok(adminCss.includes(token));

for(const token of ['brandName','brandLogo','brandize','latest official ${H(brandName())} notice','v=1.13-'])assert.ok(publicJs.includes(token),`V1.13 public controller must include ${token}`);
assert.match(publicCss,/font-size:clamp\(30px,3\.35vw,42px\)/,'offer detail title must use the reduced hierarchy');
assert.match(publicApp,/DropBeat\(\?: Dance\)\? Studio/,'public brand replacement must also repair shortened DropBeat Studio text');
assert.match(adminLanguage,/applyDropBeatAdminBrand/);
assert.match(adminLanguage,/brandAssets/);

assert.match(danceLib,/dance_styles_json FROM dance_coaches/);
assert.match(danceLib,/does not teach/);
assert.match(danceLib,/saved dance specialties/);
assert.match(productsApi,/slice\(0,80\)/);
assert.match(read('functions/_lib/edge-response-cache.js'),/bootstrap-dropbeat-v113:home/);
assert.match(read('functions/api/public/products.js'),/products-dropbeat-v113/);

for(const relative of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(relative);assert.doesNotMatch(source,/dropbeat=1\.11|v=1\.11/);assert.match(source,/dropbeat=1\.29|v=1\.13/);
}

const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql)}};
const coachInsert=sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`);
const manisha=Number(coachInsert.run('Manisha','manisha','Online Dance Coach','Coach','Indian classical dance coach.','["Indian Classical","Bharatanatyam","Kuchipudi"]','["mon","tue","wed"]','["online_class"]','active',1).lastInsertRowid);
const sathvik=Number(coachInsert.run('Sathvik','sathvik','Studio Dance Coach','Coach','Studio dance coach.','["Hip Hop","Freestyle"]','["thu","fri"]','["offline_class"]','active',2).lastInsertRowid);

const allCoaches=await listDanceCoaches(env,{includeInactive:true});
assert.deepEqual(allCoaches.map(coach=>coach.name),['Manisha','Sathvik'],'the Pages team directory must retain every coach');
const onlineCoaches=await listDanceCoaches(env,{includeInactive:true,eventType:'online_class'});
const offlineCoaches=await listDanceCoaches(env,{includeInactive:true,eventType:'offline_class'});
assert.deepEqual(onlineCoaches.map(coach=>coach.name),['Manisha']);
assert.deepEqual(offlineCoaches.map(coach=>coach.name),['Sathvik']);

const details={class_mapping_enabled:1,class_name:'Manisha Classical Batch',class_type:'online_class',coach_id:manisha,days_per_week:3,class_days_json:'["mon","tue","wed"]',class_time:'10:00',duration_hours:1,timezone:'Asia/Kolkata'};
await assert.rejects(validateProductClassDetails(env,{...details,dance_styles_json:'["Hip Hop"]'}),/Manisha does not teach Hip Hop/);
const valid=await validateProductClassDetails(env,{...details,dance_styles_json:'["Bharatanatyam","Kuchipudi"]'});
assert.deepEqual(valid.danceStyles,['Bharatanatyam','Kuchipudi']);
await assert.rejects(validateProductClassDetails(env,{...details,coach_id:sathvik,dance_styles_json:'["Hip Hop"]'}),/does not conduct Online Class/);

console.log('DropBeat V1.13 verification passed: immediate Sales routing, canonical all-coach directory, coach-owned dance styles, dynamic branding, reduced offer title and 80-character plan features.');
