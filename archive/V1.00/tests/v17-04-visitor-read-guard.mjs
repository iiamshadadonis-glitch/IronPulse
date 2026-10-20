import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as visitors} from '../functions/api/admin/visitor-info.js';
import {getVisitorAnalytics} from '../functions/_lib/visitor-analytics.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,path TEXT,source TEXT,device_id TEXT,ip_address TEXT,country_code TEXT,city TEXT,region_code TEXT,duration_ms INTEGER,analytics_consent INTEGER,ads_consent INTEGER,created_at TEXT);
 CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT,location TEXT,updated_at TEXT);
 INSERT INTO visitor_events VALUES(1,'returning','/','Google','device-1','203.0.113.1','IN','Hyderabad','TS',5000,1,0,'2026-09-18 10:00:00');
 INSERT INTO visitor_events VALUES(2,'returning','/offers','Google','device-1','203.0.113.1','IN','Hyderabad','TS',2000,1,0,'2026-09-18 10:05:00');`);
let listScans=0,sourceScans=0;
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){if(sql.includes('GROUP_CONCAT(DISTINCT'))listScans++;if(sql.includes('COUNT(DISTINCT visitor_id)'))sourceScans++;return {bind(...args){this.args=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...(this.args||[]))};},async first(){return sqlite.prepare(sql).get(...(this.args||[]))||null;}};}}};
const origin='https://v1704.example.test';
const oldCaches=globalThis.caches;
const storage=new Map();
globalThis.caches={default:{async match(req){return storage.get(req.url)?.clone()||null;},async put(req,response){storage.set(req.url,response.clone());}}};
try{
  const list=async params=>visitors({env,request:new Request(`${origin}/api/admin/visitor-info?view=list&${params}`),waitUntil:p=>p});
  let r=await list('type=all');assert.equal((await r.json()).recent.length,1);
  for(let i=0;i<20;i++){
    r=await list('type=all');assert.equal((await r.json()).recent[0].visits,2);
  }
  assert.equal(listScans,1,'opening the same visitor list repeatedly must not rescan its event history');
  r=await list('type=repeat');assert.equal((await r.json()).recent.length,1);
  assert.equal(listScans,2,'Repeat Visitors has its own bounded snapshot');
  sqlite.exec("INSERT INTO visitor_events VALUES(3,'new','/contact','Search','device-2','203.0.113.2','IN','Mumbai','MH',0,1,0,'2026-09-18 10:06:00')");
  r=await list('type=all');assert.equal((await r.json()).recent.length,1,'the cached list remains bounded until expiry or manual refresh');
  r=await list('type=all&refresh=1');assert.equal((await r.json()).recent.length,2,'manual refresh updates immediately');
  assert.equal(listScans,3);
  r=await list('type=all');assert.equal((await r.json()).recent.length,2,'fresh snapshot is reused');
  assert.equal(listScans,3);
  r=await list('type=all&export=1');assert.equal((await r.json()).recent.length,2,'Excel still includes visitor records');
  assert.equal(listScans,4);
  for(let i=0;i<10;i++)await list('type=all&export=1');
  assert.equal(listScans,4,'repeated exports reuse their snapshot');
  const analyticsRequest=new Request(`${origin}/api/admin/visitor-info`);
  let analytics=await getVisitorAnalytics({request:analyticsRequest,env,force:true});assert.equal(analytics.summary.visitors,2);
  const count=sourceScans;
  sqlite.exec("INSERT INTO visitor_events VALUES(4,'third','/','Direct','device-3','','','','',0,1,0,'2026-09-18 10:07:00')");
  for(let i=0;i<30;i++)analytics=await getVisitorAnalytics({request:analyticsRequest,env});
  assert.equal(analytics.summary.visitors,2);
  assert.equal(sourceScans,count,'new events must not invalidate full-history source statistics repeatedly');
  analytics=await getVisitorAnalytics({request:analyticsRequest,env,force:true});assert.equal(analytics.summary.visitors,3);
  assert.equal(sourceScans,count+2,'manual refresh rebuilds source and page statistics once');
}finally{if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches;}
const badge=fs.readFileSync(new URL('../public/admin/final-v16-87-business-notifications-order-focus.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../public/admin/admin.js',import.meta.url),'utf8');
const visitorUi=fs.readFileSync(new URL('../public/admin/final-v16-99-visitors-email-studio.js',import.meta.url),'utf8');
assert.match(badge,/const kept=groupToggle\?\$\(':scope>\.uc86-count-badge\[data-uc87-count="business-parent"\]',groupToggle\):null/,'the dashboard badge updater must handle the absent menu toggle');
assert.match(html,/final-v16-87-business-notifications-order-focus\.js\?v=16\.96&cache=17\.04/);
assert.match(html,/admin\.js\?v=17\.04/);
assert.match(html,/final-v16-99-visitors-email-studio\.js\?v=16\.99&cache=17\.04/);
assert.match(admin,/window\.__ucVisitorModalRefresh=\{all:true,repeat:true\}/,'manual Dashboard Refresh must mark both visitor lists for one fresh read');
assert.match(visitorUi,/cache=17\.04\$\{force\?'&refresh=1':''\}/,'the next opened visitor list must consume the manual refresh marker');
console.log('V17.04 visitor cache, explicit refresh, export and badge guard checks passed.');
