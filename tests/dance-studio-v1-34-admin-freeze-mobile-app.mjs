import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const count=(source,needle)=>source.split(needle).length-1;
const sha256=relative=>createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const BUILD='dropbeat-1.34-20261012';
const mobileCssUrl=`/assets/dropbeat-mobile-v1-34.css?build=${BUILD}`;
const mobileJsUrl=`/assets/dropbeat-mobile-v1-34.js?build=${BUILD}`;
const adminCssUrl=`/admin/dropbeat-admin-v1-34.css?build=${BUILD}`;
const adminJsUrl=`/admin/dropbeat-admin-v1-34.js?build=${BUILD}`;

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.34.0');
assert.equal(lock.version,'1.34.0');
assert.equal(lock.packages[''].version,'1.34.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1\.34/);
assert.match(pkg.scripts['test:dance-v1.34'],/dance-studio-v1-34-admin-freeze-mobile-app/);
assert.match(pkg.scripts['test:dance-v1.34'],/test:v17\.09/);

const adminHtml=read('public/admin/index.html');
const adminRuntime=read('public/admin/dropbeat-admin-v1-34.js');
const adminCss=read('public/admin/dropbeat-admin-v1-34.css');
assert.equal(count(adminHtml,adminCssUrl),2,'Admin V1.34 CSS must be preloaded and applied once');
assert.equal(count(adminHtml,adminJsUrl),2,'Admin V1.34 JS must be preloaded and executed once');
assert.equal(count(adminHtml,'<script src="/admin/dropbeat-admin-v1-32.js?v=1.32"></script>'),0,'the first global observer runtime must not execute');
assert.equal(count(adminHtml,'<script src="/admin/dropbeat-admin-v1-33.js?build=dropbeat-1.33-20261012"></script>'),0,'the duplicate global observer runtime must not execute');
assert.match(adminHtml,/class="db134-mobile-title">Admin Dashboard</);
assert.match(adminHtml,/id="adminSidebar"/);
assert.doesNotMatch(adminRuntime,/MutationObserver|setInterval|setTimeout|requestAnimationFrame|fetch\(|\/api\//,'Admin shell must be finite and event-driven');
assert.match(adminRuntime,/addEventListener\('click'/);
assert.match(adminRuntime,/db134-nav-open/);
assert.match(adminCss,/@media\(max-width:980px\)/);
assert.match(adminCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'Admin CSS braces must balance');

/* Execute the finite shell against a small DOM contract. This verifies the
   menu opens/closes without requiring any page mutation watcher. */
const listeners=new Map();
const on=(target,type,fn)=>listeners.set(`${target}:${type}`,fn);
const classes=new Set();
const bodyClassList={
  contains:value=>classes.has(value),
  toggle:(value,force)=>{if(force)classes.add(value);else classes.delete(value);return Boolean(force);},
  remove:value=>classes.delete(value)
};
const menu={dataset:{},setAttribute:(name,value)=>{menu[name]=value;},addEventListener:(type,fn)=>on('menu',type,fn)};
const backdrop={addEventListener:(type,fn)=>on('backdrop',type,fn)};
const side={addEventListener:(type,fn)=>on('side',type,fn)};
const app={querySelector:selector=>selector.includes('mobile-menu')?menu:selector.includes('backdrop')?backdrop:selector==='.side'?side:null};
const documentMock={
  readyState:'complete',documentElement:{dataset:{}},body:{classList:bodyClassList},
  getElementById:id=>id==='adminApp'?app:id==='adminSidebar'?side:null,
  addEventListener:(type,fn)=>on('document',type,fn)
};
const media={addEventListener:(type,fn)=>on('media',type,fn)};
vm.runInNewContext(adminRuntime,{document:documentMock,window:{matchMedia:()=>media,__DROPBEAT_UI_BUILD__:null}});
listeners.get('menu:click')();
assert.ok(classes.has('db134-nav-open'),'menu click must open the Admin drawer');
listeners.get('backdrop:click')();
assert.ok(!classes.has('db134-nav-open'),'backdrop click must close the Admin drawer');

const mobileCss=read('public/assets/dropbeat-mobile-v1-34.css');
const mobileRuntime=read('public/assets/dropbeat-mobile-v1-34.js');
assert.equal(count(mobileCss,'{'),count(mobileCss,'}'),'mobile CSS braces must balance');
for(const token of [
  '.dropbeat-quick-strip-inner','.dropbeat-welcome-grid','.db134-session-details',
  '.how-section .grid.steps','.stories-strip .story-card','.footer .social-icon',
  '.db134-detail-sheet','.db134-sticky-purchase','.db109-coach-card',
  '.uc-blog-card','.contact-form','.basket-layout','.coach-schedule-row',
  '.portal-metrics'
])assert.ok(mobileCss.includes(token),`mobile V1.34 must cover ${token}`);
assert.match(mobileCss,/height:clamp\(410px,112vw,520px\)/,'mobile banner must use an intentional cover crop');
assert.match(mobileCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'compact four-column mobile metrics/actions must exist');
assert.match(mobileCss,/@media\(max-width:760px\)/);
assert.doesNotMatch(mobileCss,/(^|\})\s*html\[data-color-mode="light"\]/,'V1.34 must not alter light mode');
assert.doesNotMatch(mobileRuntime,/fetch\(|XMLHttpRequest|\/api\/|localStorage\.(setItem|removeItem)/,'mobile helper must stay presentation-only');
assert.match(mobileRuntime,/\.dropbeat-strip-action/);
assert.match(mobileRuntime,/Session Details/);
assert.match(mobileRuntime,/data-db134-detail-sheet/);
assert.match(mobileRuntime,/host,\{childList:true,subtree:true\}/,'dynamic observation must be scoped to exact render hosts');
assert.doesNotMatch(mobileRuntime,/observe\(document\.(body|documentElement)/,'no public whole-document observer is allowed');

const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  assert.equal(count(html,mobileCssUrl),1,`${file} must load V1.34 CSS exactly once`);
  assert.equal(count(html,mobileJsUrl),1,`${file} must load V1.34 JS exactly once`);
  assert.ok(html.indexOf(mobileCssUrl)>html.indexOf('/assets/dropbeat-mobile-v1-33.css'),'V1.34 CSS must be the final mobile layer');
  assert.ok(html.indexOf(mobileJsUrl)<html.indexOf('</body>'),'V1.34 JS must execute from the document');
}

for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.equal(count(source,mobileCssUrl),1,`${file} must deliver V1.34 CSS`);
  assert.equal(count(source,mobileJsUrl),1,`${file} must deliver V1.34 JS`);
}
const middleware=read('functions/_middleware.js');
assert.match(middleware,/X-DropBeat-Release', '1\.34\.0/);
assert.ok(middleware.includes(mobileCssUrl));
assert.ok(middleware.includes(mobileJsUrl));
assert.match(read('public/_headers'),/\/assets\/dropbeat-mobile-v1-34\.css[\s\S]*max-age=31536000, immutable/);
assert.match(read('public/_headers'),/\/admin\/dropbeat-admin-v1-34\.js[\s\S]*Cache-Control: no-store/);
assert.match(pkg.scripts.deploy,/--project-name dance-class-at2/);

/* Authentication, payments, subscriptions, core rendering and role portals
   remain byte-identical to the supplied V1.33 package. */
const preserved={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
  'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d',
  'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
  'public/admin/dropbeat-admin-v1-22.js':'4dea9ca6dfe734f88989faea417d84d47136b33fbcfef318c5c61408a4982d24'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged`);

for(const file of [
  'public/admin/dropbeat-admin-v1-34.js','public/assets/dropbeat-mobile-v1-34.js',
  'functions/_middleware.js','functions/blog/[[slug]].js','functions/page/[slug].js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.34 verified: Admin observer freeze removed, cache-busted delivery complete, mobile storefront and role dashboards use compact app layouts, and critical business logic remains unchanged.');
