import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {onRequestPost as importPlans} from '../functions/api/admin/import-products.js';
import {PLAN_IMPORT_COLUMNS,normalizePlanImportRow} from '../functions/_lib/plan-import.js';
import {ensureSchema} from '../functions/_lib/schema.js';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
const context={window:{},console};vm.runInNewContext(await read('public/assets/dropbeat-plan-import-v1-40.js'),context);
const parse=text=>JSON.parse(JSON.stringify(context.window.DropBeatPlanCSV.parseCSV(text)));
const sample=await read('public/sample-plan-import.csv'),rows=parse(sample);
assert.deepEqual(Object.keys(rows[0]),PLAN_IMPORT_COLUMNS);
assert.equal(rows.length,2);
assert.deepEqual(parse('\uFEFFsku,name,description,features\r\nA,"A, B","Line 1\nLine 2 with ""quotes""",\r\n'),[{sku:'A',name:'A, B',description:'Line 1\nLine 2 with "quotes"',features:''}]);
assert.throws(()=>parse('sku,name\nA'),/expected 2/);
assert.throws(()=>parse('sku,name\nA,"unfinished'),/unclosed/);
assert.throws(()=>parse('sku,sku\nA,B'),/unique/);
for(const input of rows)normalizePlanImportRow(input);
assert.throws(()=>normalizePlanImportRow({...rows[0],billing_interval:'banana'}),/billing_interval/);
assert.throws(()=>normalizePlanImportRow({...rows[1],class_days:'sat|sat'}),/unique/);
assert.throws(()=>normalizePlanImportRow({...rows[1],class_access_end_date:'2027-02-30'}),/real date/);
assert.throws(()=>normalizePlanImportRow({...rows[0],image_1_url:'http://example.test/a.png'}),/HTTPS/);
assert.throws(()=>normalizePlanImportRow({...rows[0],image_1_url:'https://127.0.0.1/a.png'}),/private/);
const sqlite=new DatabaseSync(':memory:');
function statements(source){
 const parts=[];let start=0,quote='';
 for(let index=0;index<source.length;index++){
  const char=source[index];
  if(quote){if(char===quote){if(source[index+1]===quote)index++;else quote='';}}
  else if(char==="'"||char==='"')quote=char;
  else if(char===';'){parts.push(source.slice(start,index));start=index+1;}
 }parts.push(source.slice(start));return parts.map(value=>value.trim()).filter(Boolean);
}
for(const file of (await readdir(new URL('migrations/',root))).filter(name=>name.endsWith('.sql')).sort()){
 const source=(await read('migrations/'+file)).replace(/^\s*--.*$/gm,'');
 for(const statement of statements(source)){
  try{sqlite.exec(statement+';');}catch(error){if(!/duplicate column|already exists/.test(error.message))throw new Error(file+': '+error.message+' '+statement.slice(0,100));}
 }
}
sqlite.exec('DELETE FROM product_images; DELETE FROM product_variants; DELETE FROM page_placements; DELETE FROM product_class_mappings; DELETE FROM products;');
class Statement{
 constructor(sql){this.sql=sql;this.args=[];}
 bind(...args){this.args=args;return this;}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
 async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{last_row_id:Number(result.lastInsertRowid),changes:Number(result.changes)}};}
}
const db={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:db};
await ensureSchema(env);
sqlite.exec('DELETE FROM product_images; DELETE FROM product_variants; DELETE FROM page_placements; DELETE FROM product_class_mappings; DELETE FROM products;');
let remoteCalls=0;const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{remoteCalls++;throw new Error('Unexpected external request in bulk import');};
async function run(rows,customEnv=env){const response=await importPlans({request:new Request('https://example.test/api/admin/import-products',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rows})}),env:customEnv});return {status:response.status,data:await response.json()};}
try{
 const first=await run(rows);assert.equal(first.status,200);assert.deepEqual(first.data.errors,[]);assert.equal(first.data.created,2);
 const saved=sqlite.prepare('SELECT * FROM products ORDER BY id').all();
 assert.equal(saved[0].regular_price_paise,39900);assert.equal(saved[0].trial_enabled,1);assert.equal(saved[0].billing_interval,1);assert.equal(saved[0].spot_limit,20);assert.equal(saved[1].payment_type,'one_time');
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM product_variants').get().n,12);
 const mapping=sqlite.prepare('SELECT * FROM product_class_mappings WHERE product_id=?').get(saved[1].id);
 assert.equal(mapping.class_name,'Weekend Dance Workshop');assert.equal(mapping.access_end_date,'2027-01-30');assert.deepEqual(JSON.parse(mapping.class_days_json),['sat']);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM page_placements').get().n,3);
 const update=await run([{sku:rows[0].sku,name:'Updated membership',description:'Updated description',regular_price:'499',offer_price:'249',billing_interval:'2',features:'New feature|Another feature',image_1_url:'https://example.test/image-a.png',image_1_alt:'First imported image',image_1_cover:'1',image_2_url:'https://example.test/image-b.png',image_2_cover:'0'}]);
 assert.deepEqual(update.data.errors,[]);assert.equal(update.data.updated,1);
 const changed=sqlite.prepare('SELECT * FROM products WHERE sku=?').get(rows[0].sku);
 assert.equal(changed.regular_price_paise,49900);assert.equal(changed.offer_price_paise,24900);assert.equal(changed.billing_interval,2);assert.equal(changed.trial_enabled,1,'omitted fields retain the current plan value');
 assert.deepEqual(JSON.parse(changed.features_json),['New feature','Another feature']);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM product_images WHERE product_id=?').get(changed.id).n,2);
 const retry=await run([{...rows[0],image_1_url:'https://example.test/image-a.png'}]);assert.equal(retry.data.updated,1);assert.deepEqual(retry.data.errors,[]);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM product_images WHERE product_id=?').get(changed.id).n,2,'retry does not duplicate images');
 const invalid=await run([{...rows[1],sku:'INVALID-COACH',coach_id:'999'}, {...rows[0],sku:'INVALID-TRIAL',trial_amount:'0'}, {...rows[0],sku:'INVALID-FEATURES',features:'A'.repeat(81)}, {...rows[0],sku:'INVALID-IMAGE',image_1_url:'https://localhost/image.png'}]);
 assert.equal(invalid.data.created,0);assert.equal(invalid.data.errors.length,4);assert.deepEqual(invalid.data.errors.map(error=>error.row),[2,3,4,5]);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM products').get().n,2,'bad rows cannot leave placeholder plans');
 const duplicate=await run([{...rows[0],sku:'DUPLICATE'}, {...rows[0],sku:'DUPLICATE'}]);assert.equal(duplicate.data.created,1);assert.match(duplicate.data.errors[0].error,/more than once/);
 const legacy=await run([{sku:'LEGACY',name:'Legacy Plan',description:'Legacy file still supported',regular_price:'100',offer_price:'75',features:'Feature A|Feature B',page_keys:'home|offers'}]);assert.equal(legacy.data.created,1);assert.deepEqual(legacy.data.errors,[]);
 const drive={...rows[0],sku:'DRIVE-URL',placements:'offers',image_1_url:'https://drive.google.com/file/d/exampleDriveImage123/view',image_1_cover:'1'};
 const driveFirst=await run([drive]);assert.deepEqual(driveFirst.data.errors,[]);assert.equal(driveFirst.data.created,1);
 const driveRetry=await run([drive]);assert.deepEqual(driveRetry.data.errors,[]);assert.equal(driveRetry.data.updated,1);
 const drivePlan=sqlite.prepare('SELECT id FROM products WHERE sku=?').get('DRIVE-URL');assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM product_images WHERE product_id=?').get(drivePlan.id).n,1,'Drive share-link retries resolve to the same image');
 assert.deepEqual(sqlite.prepare('SELECT page_key FROM page_placements WHERE product_id=?').all(drivePlan.id).map(row=>row.page_key),['offers'],'explicit placements win over default first-image placements');
 assert.equal((await run([])).status,400);assert.equal((await run(Array(51).fill(rows[0]))).status,400);
 assert.equal((await run(rows,{DB:db})).status,401,'the existing admin authorization protects the importer');
 assert.equal(remoteCalls,0,'bulk import never provisions live gateway plans or publishes social posts');
 console.log('V1.40 real SQLite import checks passed: complete sample, quoted CSV, create/update, one-time class mapping, trial/billing/capacity, placements/images, retries, invalid rows, duplicate SKUs, legacy CSV, authorization and zero remote gateway calls.');
}finally{globalThis.fetch=oldFetch;sqlite.close();}
