import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestPost as record} from '../functions/api/track/visit.js';
import {onRequestGet as visitors} from '../functions/api/admin/visitor-info.js';
import {getVisitorAnalytics} from '../functions/_lib/visitor-analytics.js';
import {onRequestGet as dashboard} from '../functions/api/admin/dashboard.js';

function database({denyRepair=false}={}){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE visitor_events(id INTEGER PRIMARY KEY AUTOINCREMENT,visitor_id TEXT NOT NULL,path TEXT,referrer TEXT,source TEXT,user_agent TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT);`);
  const statements=[];
  const DB={prepare(sql){statements.push(sql);const stmt=()=>sqlite.prepare(sql);return {
    bind(...args){this.args=args;return this;},
    async all(){return {results:stmt().all(...(this.args||[]))};},
    async first(){return stmt().get(...(this.args||[]))||null;},
    async run(){if(denyRepair&&sql.startsWith('ALTER TABLE visitor_events'))throw new Error('DDL unavailable');const result=stmt().run(...(this.args||[]));return {meta:{changes:result.changes}};}
  };}};
  return {sqlite,DB,statements};
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',...database()};
async function visit(id,path='/',event='visit'){
  const request=new Request('https://example.test/api/track/visit',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'203.0.113.7'},body:JSON.stringify({visitor_id:id,path,source:'Search',event})});
  const response=await record({request,env});assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
}
await visit('new-one');
assert.equal(env.sqlite.prepare('SELECT COUNT(*) c FROM visitor_events').get().c,1,'a legacy visitor table must accept a new visit');
assert.equal(env.sqlite.prepare('SELECT ip_address FROM visitor_events').get().ip_address,'203.0.113.7','missing fields must self-repair when possible');
const analyticsRequest=new Request('https://example.test/api/admin/visitor-info');
let analytics=await getVisitorAnalytics({request:analyticsRequest,env});assert.equal(analytics.summary.visitors,1);
const queriesBefore=env.statements.filter(sql=>sql.includes('GROUP BY visitor_id')).length;
analytics=await getVisitorAnalytics({request:analyticsRequest,env});assert.equal(analytics.summary.visitors,1);
assert.equal(env.statements.filter(sql=>sql.includes('GROUP BY visitor_id')).length,queriesBefore,'unchanged traffic should reuse aggregates');
await visit('new-two');
analytics=await getVisitorAnalytics({request:analyticsRequest,env});assert.equal(analytics.summary.visitors,1,'ordinary visits reuse the bounded analytics snapshot instead of rescanning the history');
analytics=await getVisitorAnalytics({request:analyticsRequest,env,force:true});assert.equal(analytics.summary.visitors,2,'manual refresh updates the visitor snapshot');
let response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?view=list'),env});
assert.equal((await response.json()).recent.length,2,'the modal reads newly recorded visitors');
await visit('new-one','/offers');
response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?type=repeat&view=list&refresh=1'),env});
const repeat=await response.json();assert.equal(repeat.recent.length,1);assert.equal(repeat.recent[0].visits,2);
await visit('new-one','/offers','duration');
assert.equal(env.sqlite.prepare('SELECT COUNT(*) c FROM visitor_events').get().c,3,'duration updates should not inflate visit counts');
const legacy={ADMIN_DEVELOPMENT_BYPASS:'true',...database({denyRepair:true})};
response=await record({request:new Request('https://example.test/api/track/visit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitor_id:'limited',path:'/offers'})}),env:legacy});
assert.equal(response.status,200,'visitor journeys survive even when optional schema repair is unavailable');
assert.equal(legacy.sqlite.prepare('SELECT COUNT(*) c FROM visitor_events').get().c,1);
// Dashboard cards reuse a bounded snapshot across new visits. A manual Refresh
// updates visitors while preserving the unrelated card calculations.
let currentRevision=55,uniqueVisitors=5,commerceReads=0;
const dashboardEnv={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){return {bind(){return this;},async first(){
  if(sql.includes('MAX(id)')&&sql.includes('visitor_events'))return {revision:currentRevision};
  if(sql.includes('WITH rolled AS')&&sql.includes('visitor_events'))return {visitors:uniqueVisitors,repeat_visitors:2,total_events:uniqueVisitors+2,avg_duration_ms:0};
  if(sql.includes('WITH payment_rows AS')){commerceReads++;return {total_orders:27,new_paid:1,revenue_paise:10700};}
  if(sql.includes('WITH eligible AS'))return {total_leads:13,hot_leads:0};
  return {c:3};},async all(){return {results:sql.includes('source')?[{source:'Search',visits:7,visitors:uniqueVisitors}]:[{path:'/',visits:7}]};},async run(){return {meta:{changes:0}};}};}}};
let summary=await dashboard({request:new Request('https://example.test/api/admin/dashboard?refresh=1'),env:dashboardEnv});
assert.equal(summary.status,200);assert.equal((await summary.json()).stats.websiteVisitors,5);
const initialCommerceReads=commerceReads;
currentRevision++;uniqueVisitors++;
summary=await dashboard({request:new Request('https://example.test/api/admin/dashboard'),env:dashboardEnv});
const updated=(await summary.json()).stats;
assert.equal(updated.websiteVisitors,5,'background dashboard checks reuse the short visitor snapshot');
summary=await dashboard({request:new Request('https://example.test/api/admin/dashboard?refresh=1'),env:dashboardEnv});
assert.equal((await summary.json()).stats.websiteVisitors,6,'manual Refresh updates the dashboard visitor count');
assert.equal(updated.orders,27,'unrelated order cards preserve their calculated values');
assert.equal(commerceReads,initialCommerceReads+1,'only the explicit full Dashboard Refresh rescans commerce');
const admin=fs.readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const dashboardSource=fs.readFileSync(new URL('../functions/api/admin/dashboard.js',import.meta.url),'utf8');
const visitorUI=fs.readFileSync(new URL('../public/admin/final-v16-99-visitors-email-studio.js',import.meta.url),'utf8');
assert.match(admin,/onclick="ucForceDashboardRefresh\(\)"/);
assert.match(dashboardSource,/visitor_revision:visitorRevision/);
assert.match(dashboardSource,/const force=new URL\(request.url\).searchParams.get\('refresh'\)==='1'/);
assert.ok(!visitorUI.includes('aria-hidden="true">⌄</span></button>'),'visitor page toggles have no misaligned arrow');
assert.match(visitorUI,/Show \$\{pages.length-5\} more/);
assert.match(admin,/final-v16-99-visitors-email-studio.js\?v=16.99&cache=17.04/);
console.log('V17.03 visit recording, bounded refresh, repeat-list and UI checks passed.');
