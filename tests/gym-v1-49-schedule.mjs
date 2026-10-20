import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {ensureSchema} from '../functions/_lib/schema.js';
import {listStudioScheduleAdmin} from '../functions/_lib/studio-schedule.js';
import {listClassManagement} from '../functions/_lib/class-management.js';
import {onRequestGet} from '../functions/api/admin/studio-schedule.js';
const root=new URL('../',import.meta.url),sqlite=new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('migrations/',root))).filter(name=>name.endsWith('.sql')).sort()){
 const source=(await readFile(new URL('migrations/'+file,root),'utf8')).replace(/^\s*--.*$/gm,'');
 const parts=[];let start=0,quote='';for(let i=0;i<source.length;i++){const char=source[i];if(quote){if(char===quote){if(source[i+1]===quote)i++;else quote='';}}else if(char==="'"||char==='"')quote=char;else if(char===';'){parts.push(source.slice(start,i));start=i+1;}}parts.push(source.slice(start));
 for(const statement of parts.filter(s=>s.trim()))try{sqlite.exec(statement+';');}catch(error){if(!/duplicate column|already exists/.test(error.message))throw error;}
}
const queries=[];
class Statement{
 constructor(sql){this.sql=sql;this.args=[];}
 bind(...args){this.args=args;return this;}
 async all(){queries.push(this.sql);return {results:sqlite.prepare(this.sql).all(...this.args)};}
 async first(column){queries.push(this.sql);const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
 async run(){const out=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{last_row_id:Number(out.lastInsertRowid),changes:Number(out.changes)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(s=>s.run()));}}};
await ensureSchema(env);await listStudioScheduleAdmin(env);await listClassManagement(env);
sqlite.exec("DELETE FROM webinar_members; DELETE FROM product_class_mappings; DELETE FROM order_class_assignments; DELETE FROM dance_coaches; DELETE FROM coach_leave_requests; DELETE FROM studio_holidays; DELETE FROM studio_class_changes;");
for(let id=1;id<=23;id++){
 sqlite.prepare("INSERT INTO dance_coaches(id,name,slug,status,sort_order) VALUES(?,?,?,'active',?)").run(id,'Coach '+id,'v149-coach-'+id,id);
 const account=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,status) VALUES('coach',?,'active')").run('coach'+id+'@example.test').lastInsertRowid);
 sqlite.prepare("INSERT INTO coach_leave_requests(coach_id,account_id,leave_type,purpose,from_date,to_date,reason,status) VALUES(?,?,'planned','Test leave','2026-10-01','2026-10-02','Fixture','pending')").run(id,account);
 sqlite.prepare("INSERT INTO studio_holidays(event_name,start_date,end_date,notice_date,subject,message,status) VALUES(?,'2026-10-01','2026-10-02','2026-09-30','Fixture','Fixture','active')").run('Holiday '+id);
 const product=Number(sqlite.prepare("INSERT INTO products(name,slug,sku,status) VALUES(?,?,?,'active')").run('Class '+id,'v149-plan-'+id,'V149-'+id).lastInsertRowid);
 sqlite.prepare("INSERT INTO product_class_mappings(product_id,enabled,class_name,coach_id,class_type,class_time,class_days_json,status) VALUES(?,1,?,?,'offline_class','10:00','[\"mon\"]','active')").run(product,'Class '+id,id);
 sqlite.prepare("INSERT INTO webinar_members(product_id,coach_id,customer_name,status,payment_status) VALUES(?,?,?,'current','paid')").run(product,id,'Student '+id);
 sqlite.prepare("INSERT INTO studio_class_changes(source_type,source_id,change_type,effective_start_date,reason,status) VALUES('product',?,'cancel','2026-01-01','Fixture','completed')").run(product);
}
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('No remote requests are allowed in the Schedule database test');};
try{
 const pages=[];queries.length=0;
 for(let page=1;page<=3;page++){
  const response=await onRequestGet({request:new Request(`https://example.test/api/admin/studio-schedule?view=mobile&page=${page}&pageSize=10`),env});assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.ok,true);assert.equal(data.coaches.length,page===3?3:10);assert.equal(data.runningClasses.length,page===3?3:10);assert.equal(data.cancelledSessions.length,page===3?3:10);assert.equal(data.holidays.past.length,page===3?3:10);assert.equal(data.leaves.pending.length,page===3?3:10);
  assert.equal(data.mobilePagination.hasMore,page!==3);assert.ok(data.assignments.every(row=>data.coaches.some(coach=>coach.id===row.coachId)),'Only the current coach page is expanded');pages.push(data);
 }
 assert.equal(new Set(pages.flatMap(p=>p.coaches.map(row=>row.id))).size,23);assert.equal(new Set(pages.flatMap(p=>p.runningClasses.map(row=>row.sourceId))).size,23);
 assert.ok(queries.some(sql=>sql.includes('LIMIT 11 OFFSET 10')));assert.ok(queries.some(sql=>/coach_id IN \(/.test(sql)));
 const legacy=await onRequestGet({request:new Request('https://example.test/api/admin/studio-schedule'),env});assert.equal(legacy.status,200);const full=await legacy.json();assert.equal(full.coaches.length,23);assert.equal(full.runningClasses.length,23);assert.equal(full.mobilePagination,undefined,'Desktop API contract is unchanged');
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM studio_class_changes').get().n,23);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM webinar_members WHERE status='current' AND payment_status='paid'").get().n,23);
}finally{globalThis.fetch=oldFetch;sqlite.close();}
console.log('V1.49 Schedule database regressions passed: bounded mobile reads, stable three-page union, scoped coach assignments, unchanged default desktop response and retained class/student records.');
