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
assert.equal(pkg.version,'1.33.0');assert.equal(lock.version,'1.33.0');assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.08'],'V1.08 must expose the complete verification command');

const adminHtml=read('public/admin/index.html'),adminFix=read('public/admin/dropbeat-admin-v1-05.js');
for(const asset of ['dropbeat-admin-theme.css?v=1.13','dropbeat-admin-language.js?v=1.13','dropbeat-admin-v1-03.js?v=1.13','dropbeat-admin-v1-04.js?v=1.13','dropbeat-admin-v1-05.js?v=1.22']){
  assert.ok(adminHtml.includes(asset),`Admin must load cache-busted ${asset}`);
}
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-v1-05.js')>adminHtml.lastIndexOf('dropbeat-admin-v1-04.js'),'V1.08 reliability logic must load last');
assert.doesNotMatch(adminHtml,/dropbeat=1\.04|dropbeat-admin-(?:theme|language|v1-03|v1-04)\.(?:css|js)\?v=1\.04/,'Admin must not reuse V1.04 DropBeat asset URLs');
assert.match(adminFix,/activateBrandPanel\(mode\)[\s\S]*?queueMicrotask\(\(\)=>loadBrandPanel/,'Brand Settings must switch before its loader starts');
assert.match(adminFix,/form\.removeAttribute\('onsubmit'\)/,'the live Student Story form must bypass stale inline handlers');
assert.match(adminFix,/form\.addEventListener\('submit',saveStudentStory,true\)/,'the current Student Story form must bind directly');
assert.match(adminFix,/verifiedStoryRows\(saved\)/,'a save must be verified with a fresh admin read');

const galleryFix=read('public/admin/dropbeat-admin-v1-04.js'),adminTheme=read('public/admin/dropbeat-admin-theme.css');
assert.match(galleryFix,/fixed-table clean-actions dropbeat-studio-gallery-table/);
assert.match(galleryFix,/<colgroup><col class="studio-copy-col">/);
assert.match(galleryFix,/<td><div class="sort-actions nowrap">/,'Sort controls must remain inside the Sort cell');
assert.match(galleryFix,/<td><div class="action-row nowrap">/,'Action controls must remain inside the Actions cell');
assert.match(adminTheme,/\.dropbeat-studio-gallery-table \.icon-action\{[\s\S]*?border-radius:50%!important/,'Studio image controls must be circular');
assert.match(adminTheme,/\.studio-copy-col\{width:43%\}/,'Studio image columns must use explicit balanced widths');

const navigation=read('public/assets/final-v16-37-navigation.js'),publicTheme=read('public/assets/dropbeat-theme.css');
assert.match(navigation,/showChevron=has&&item\.key!=='offers'/,'Offers must not render the circular dropdown chevron');
assert.match(publicTheme,/nav-dropdown\[data-uc-nav-key="offers"\][^\n]*uc-nav-dropdown-chevron\{display:none!important\}/,'Offers must also have a CSS fallback that hides a stale chevron');
assert.match(read('public/_headers'),/\/assets\/final-v16-37-navigation\.js\n  Cache-Control: no-cache, must-revalidate/,'the corrected navigation script must revalidate at the edge');
for(const relative of walk('public','.html').filter(file=>!file.startsWith('public/admin/'))){
  const html=read(relative);
  assert.doesNotMatch(html,/dropbeat=1\.04|dropbeat-theme\.css\?v=1\.04|dropbeat-dance-language\.js\?v=1\.04/,`${relative} must not retain V1.04 frontend cache keys`);
  if(html.includes('/assets/app.js'))assert.match(html,/app\.js\?[^"']*dropbeat=1\.29/,`${relative} must fetch the current public application asset`);
  if(html.includes('final-v16-37-navigation.js'))assert.match(html,/final-v16-37-navigation\.js\?v=16\.38(?:&|&amp;)dropbeat=1\.29/,`${relative} must fetch the arrow-free navigation script`);
}
for(const relative of ['functions/page/[slug].js','functions/blog/[[slug]].js']){
  const source=read(relative);
  assert.match(source,/app\.js\?v=(?:16\.37|17\.03)&dropbeat=1\.29/);
  assert.match(source,/final-v16-37-navigation\.js\?v=16\.(?:37|38)&dropbeat=1\.29/);
  assert.match(source,/dropbeat-theme\.css\?v=1.13/);
}

const sqlite=new DatabaseSync(':memory:');
// Simulate an older production table: the focused route repair must add only
// the missing Student Story columns before the first save.
sqlite.exec('CREATE TABLE success_stories (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT NOT NULL)');
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};
const youtubeUrl='https://www.youtube.com/watch?v=zDjbtrezZMc&list=RDzDjbtrezZMc&start_radio=1';
let response=await saveStory({request:new Request('https://example.test/api/admin/success-stories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Our Kids from Evening Sessions',url:youtubeUrl,status:'active'})}),env});
assert.equal(response.status,201,'the screenshot-style YouTube URL must save');
const saved=await response.json();assert.equal(saved.ok,true);assert.equal(saved.story.url,youtubeUrl);assert.equal(saved.story.thumbnail_url,'https://img.youtube.com/vi/zDjbtrezZMc/hqdefault.jpg');
const columns=sqlite.prepare('PRAGMA table_info(success_stories)').all().map(column=>column.name);
for(const name of ['platform','thumbnail_url','status','sort_order','created_at','updated_at'])assert.ok(columns.includes(name),`legacy Student Stories must gain ${name}`);
response=await listStories({request:new Request('https://example.test/api/admin/success-stories'),env});
assert.equal(response.status,200);assert.equal((await response.json()).stories.length,1,'the verified admin list must immediately contain the saved story');
response=await publicStories({env});assert.equal(response.status,200);assert.equal((await response.json()).stories.length,1,'the saved active story must immediately reach the frontend endpoint');

const middleware=read('functions/_middleware.js');
assert.match(middleware,/url\.pathname === '\/api\/admin\/success-stories'[\s\S]*?bootstrap-dropbeat-v113:home/,'Student Story saves must invalidate the exact home snapshot before responding');

console.log('DropBeat V1.08 focused verification passed: Student Story persistence, instant Brand Settings tabs, aligned studio grid, Offers arrow removal and cache busting.');
