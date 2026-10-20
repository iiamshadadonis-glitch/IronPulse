import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as listStories,onRequestPost as saveStory} from '../functions/api/admin/success-stories.js';
import {onRequestGet as publicStories} from '../functions/api/public/success-stories.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const walk=(dir,extension)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>{
  const relative=path.join(dir,entry.name);
  return entry.isDirectory()?walk(relative,extension):entry.name.endsWith(extension)?[relative]:[];
});

const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.08'],'V1.08 must expose the full verification command');

// Root-cause regression: collapsing the card must move the real <form> node,
// not copy only its innerHTML and leave a visually convincing non-form behind.
const legacyCollapse=read('public/admin/last-touchups.js');
assert.match(legacyCollapse,/firstCard\.replaceWith\(detail\);firstCard\.classList\.remove\('card'\);detail\.querySelector\('\.collapsed-body'\)\.appendChild\(firstCard\)/);
assert.doesNotMatch(legacyCollapse,/const inner=firstCard\.innerHTML;const detail=make\(`<details class="card admin-collapsed-card"><summary>Add New Success Story/);

const adminHtml=read('public/admin/index.html'),adminFix=read('public/admin/dropbeat-admin-v1-06.js');
assert.ok(adminHtml.includes('last-touchups.js?dropbeat=1.13'),'the form-preserving legacy fix must be cache-busted');
assert.ok(adminHtml.includes('dropbeat-admin-v1-06.js?v=1.13'),'the final save controller must be cache-busted');
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-v1-06.js')>adminHtml.lastIndexOf('dropbeat-admin-v1-05.js'),'V1.08 must own the final Student Story save event');
assert.match(adminFix,/while\(body\.firstChild\)form\.appendChild\(body\.firstChild\)/,'a deployed malformed panel must be repaired without losing entered fields');
assert.match(adminFix,/document\.addEventListener\('submit',[\s\S]*?,true\)/,'dynamic Student Story forms must be handled at document capture');
assert.match(adminFix,/document\.addEventListener\('click',[\s\S]*?,true\)/,'the save button must have a direct fallback');
assert.match(adminFix,/dropbeatStorySaveStatus/,'save results must remain visible outside the collapsible form');
assert.match(adminFix,/timed out after/,'a stalled request must report a visible timeout');
assert.match(adminFix,/Reference:/,'server failures must display a support reference');

// Plan badges retain the DropBeat palette while becoming opaque and readable
// over light or dark photography.
const theme=read('public/assets/dropbeat-theme.css');
const badgeRule=theme.match(/\.product-card>\.badge\s*\{([\s\S]*?)\n\}/)?.[1]||'';
for(const declaration of ['background:var(--dropbeat-primary)!important','color:#fff!important','opacity:1!important','border:2px solid #fff!important'])assert.ok(badgeRule.includes(declaration),`plan badge must include ${declaration}`);
assert.doesNotMatch(badgeRule,/background:rgba\(/,'the plan badge background must not be transparent');
assert.match(read('public/assets/app.js'),/class="badge"/,'product rendering must continue using the existing plan badge value');
const luminance=hex=>{
  const values=hex.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
};
const contrast=(a,b)=>{const [lighter,darker]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (lighter+.05)/(darker+.05);};
assert.ok(contrast('#4B55BE','#FFFFFF')>=4.5,'white text on the DropBeat primary badge must meet WCAG AA contrast');

for(const relative of walk('public','.html').filter(file=>!file.startsWith('public/admin/'))){
  const html=read(relative);
  assert.doesNotMatch(html,/dropbeat=1\.05|dropbeat-theme\.css\?v=1\.05/,`${relative} must not retain the V1.05 cache key`);
  if(html.includes('/assets/dropbeat-theme.css'))assert.match(html,/dropbeat-theme\.css\?v=1.13/,`${relative} must load the readable V1.08 plan-badge style`);
}
for(const relative of ['functions/page/[slug].js','functions/blog/[[slug]].js']){
  assert.match(read(relative),/dropbeat-theme\.css\?v=1.13/);
}
assert.match(read('functions/_middleware.js'),/acceptsHtml[\s\S]*?Cache-Control/,'document shells must revalidate and discover the V1.08 assets');

// Route verification uses the exact URL shown in the report, tests both
// Active and Draft, and then confirms only Active reaches the frontend.
const sqlite=new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE success_stories (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT NOT NULL)');
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};
const reportedUrl='https://www.youtube.com/watch?v=zDjbtrezZMc&list=RDzDjbtrezZMc&start_radio=1';
const post=async(body,id)=>saveStory({request:new Request('https://example.test/api/admin/success-stories',{method:'POST',headers:{'content-type':'application/json','x-dropbeat-request-id':id},body:JSON.stringify(body)}),env});

let response=await post({title:'Our Kids from Evening Sessions',url:reportedUrl,status:'active'},'story-active-106');
assert.equal(response.status,201);let payload=await response.json();
assert.equal(payload.ok,true);assert.equal(payload.diagnostic_id,'story-active-106');assert.equal(payload.story.status,'active');assert.equal(payload.story.url,reportedUrl);
assert.equal(payload.story.thumbnail_url,'https://img.youtube.com/vi/zDjbtrezZMc/hqdefault.jpg');

response=await post({title:'Draft Student Journey',url:'https://youtu.be/zDjbtrezZMc',status:'draft'},'story-draft-106');
assert.equal(response.status,201);payload=await response.json();assert.equal(payload.story.status,'draft');
response=await listStories({request:new Request('https://example.test/api/admin/success-stories'),env});
assert.equal(response.status,200);assert.equal((await response.json()).stories.length,2,'Active and Draft must both appear in Existing Student Stories');
response=await publicStories({env});
assert.equal(response.status,200);const publicPayload=await response.json();assert.equal(publicPayload.stories.length,1,'only Active stories may reach the frontend');assert.equal(publicPayload.stories[0].url,reportedUrl);

response=await post({title:'Unsupported',url:'https://vimeo.com/123456',status:'active'},'story-invalid-106');
assert.equal(response.status,400);payload=await response.json();assert.equal(payload.diagnostic_id,'story-invalid-106');assert.match(payload.error,/YouTube and Instagram/);

console.log('DropBeat V1.08 focused verification passed: Student Story form preservation, delegated save diagnostics, Active/Draft persistence, public visibility, opaque plan badges and cache revalidation.');
