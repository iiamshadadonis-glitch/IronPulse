import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { getD1ReadBudgetStatus, reserveD1ReadBudget } from '../functions/_lib/d1-read-budget.js';
import { listLeadNurtureFlows, processLeadNurture, saveLeadNurtureFlow } from '../functions/_lib/lead-nurturing.js';

class D1Statement {
  constructor(db,sql){this.db=db;this.sql=sql;this.values=[];}
  bind(...values){this.values=values;return this;}
  async run(){const r=this.db.prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes||0),last_row_id:Number(r.lastInsertRowid||0)}};}
  async first(){return this.db.prepare(this.sql).get(...this.values)||null;}
  async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
}
const d1=db=>({prepare:sql=>new D1Statement(db,sql),async batch(items){return Promise.all(items.map(x=>x.run()));}});

function baseDb(){
  const db=new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '{}',updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE contact_leads(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT DEFAULT '',phone TEXT DEFAULT '',email TEXT DEFAULT '',message TEXT DEFAULT '',source TEXT DEFAULT '',source_detail TEXT DEFAULT '',status TEXT DEFAULT 'new',sale_amount_paise INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE orders(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_email TEXT DEFAULT '',customer_phone TEXT DEFAULT '',payment_status TEXT DEFAULT '',status TEXT DEFAULT '');
    CREATE TABLE social_posts(id INTEGER PRIMARY KEY AUTOINCREMENT);
  `);
  return db;
}

{
  const db=baseDb();
  db.exec(fs.readFileSync(new URL('../migrations/0036_v16_76_d1_read_guard.sql',import.meta.url),'utf8'));
  const names=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','index')").all().map(x=>x.name));
  for(const name of ['d1_background_read_budget','idx_contact_leads_status_id','idx_orders_customer_email_nocase','idx_orders_customer_phone'])assert(names.has(name),`missing ${name}`);
}

{
  const db=baseDb(),env={DB:d1(db),D1_DAILY_READ_SOFT_LIMIT:'50000',D1_DAILY_READ_HARD_LIMIT:'100000'};
  assert.equal((await reserveD1ReadBudget(env,{estimatedRows:40000})).allowed,true);
  assert.equal((await reserveD1ReadBudget(env,{estimatedRows:20000})).allowed,false);
  assert.equal((await reserveD1ReadBudget(env,{estimatedRows:20000,priority:'critical'})).allowed,true);
  assert.equal((await reserveD1ReadBudget(env,{estimatedRows:50000,priority:'critical'})).allowed,false);
  assert.equal((await getD1ReadBudgetStatus(env)).hardPaused,true);
}

{
  const db=baseDb(),env={DB:d1(db)};
  db.prepare("INSERT INTO contact_leads(name,phone,email,source,status) VALUES('Test Lead','919999999999','test@example.com','website','new')").run();
  const flow=await saveLeadNurtureFlow(env,{name:'Smoke Follow-up',enabled:true,stopOnPurchase:true,repeatEnabled:false,sources:['website'],steps:[{name:'SMS check',channel:'sms',delayAmount:0,delayUnit:'minutes',message:'Hi {{FirstName}}'}]});
  assert(flow?.id,'flow was not saved');
  const out=await processLeadNurture(env,{limit:5,enroll:false,reserveBudget:false});
  assert.equal(out.ok,true);
  assert.equal(out.processed,1);
  const list=await listLeadNurtureFlows(env);
  assert.equal(list.length,1);
}

{
  const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
  const automation=read('public/admin/final-v16-68-automation-flow-workspace.js');
  const posts=read('public/admin/final-v16-48-posts-scheduler.js');
  const carousel=read('public/admin/final-v16-56-posts-carousel-dms.js');
  const addon=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
  const html=read('public/admin/index.html');
  const middleware=read('functions/_middleware.js');
  const nurturing=read('functions/_lib/lead-nurturing.js');
  let index=-1;
  for(const label of ['Chatbot DM','Chatbot Comments','Lead Nurturing','Comment Triggers DM']){const next=automation.indexOf(`>${label}<`,index+1);assert(next>index,`${label} is missing or out of order`);index=next;}
  for(const kind of ['text','image','video'])assert(posts.includes(`ucV1676PollMarkup?.('${kind}')`),`${kind} poll missing`);
  assert(carousel.includes("ucV1676PollMarkup?.('carousel')"),'carousel poll missing');
  for(const label of ['Text Poll','Image Poll','Carousel Poll','Video Poll'])assert(addon.includes(label),`${label} launcher missing`);
  assert(addon.includes("schedule.insertAdjacentElement('afterend',box)"),'article poll is not anchored after scheduling');
  assert(!html.includes('final-v16-75-inbox-nurture-comment-dm-polls.js'),'conflicting V16.75 UI script is still loaded');
  assert(html.includes('final-v16-76-d1-polls-automation-workspace.js'),'V16.76 UI script is not loaded');
  assert(!middleware.includes('processLeadNurture'),'public-page lead table scan remains');
  assert(!nurturing.includes('ORDER BY id DESC LIMIT 500'),'500-order purchase scan remains');
  JSON.parse(read('package.json'));
  const refs=[...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^" ]*)?"/g)].map(x=>x[1]).filter(x=>/\.(?:js|css)$/.test(x));
  const missing=[...new Set(refs)].filter(x=>!fs.existsSync(new URL(`../public${x}`,import.meta.url)));
  assert.deepEqual(missing,[],'Admin HTML references missing local assets');
}

console.log('V16.76 smoke tests: PASS');
