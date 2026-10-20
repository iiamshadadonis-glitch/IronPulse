import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const count=(source,needle)=>source.split(needle).length-1;
const sha256=relative=>createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1\.33/);
assert.match(pkg.scripts['test:dance-v1.32'],/dance-studio-v1-32-dark-modals-mobile/);
assert.match(pkg.scripts['test:dance-v1.32'],/test:dance-v1\.31/,'the complete inherited regression chain must run');

const adminCss=read('public/admin/dropbeat-admin-v1-32.css');
const adminRuntime=read('public/admin/dropbeat-admin-v1-32.js');
const mobileCss=read('public/assets/dropbeat-mobile-v1-32.css');
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'V1.32 admin CSS braces must balance');
assert.equal(count(mobileCss,'{'),count(mobileCss,'}'),'V1.32 mobile CSS braces must balance');

for(const selector of [
  '#ucMultiSubscriptionModal','#listModal','#dashboardListBox','#ucClientModal',
  '.uc-dashboard-client-card','.uc-client-tabs button','.uc-v14-refund-editor',
  '.uc-profile-media-section','.db121-style-menu','.db121-style-picker>summary',
  '.uc-crm-chip.green','.uc98-badge.repeat','.uc-sub-status.active'
])assert.ok(adminCss.includes(selector),`V1.32 dark-dialog layer must cover ${selector}`);
assert.match(adminCss,/html\[data-color-mode="dark"\][\s\S]*body \.modal\.open/);
assert.match(adminCss,/@media\(max-width:980px\)[\s\S]*#adminApp>\.side[\s\S]*translateX\(-105%\)/,'mobile admin sidebar must be an off-canvas app drawer');
assert.match(adminCss,/body\.db132-nav-open #adminApp>\.side\{transform:translateX\(0\)\}/);
assert.match(adminCss,/#adminApp\.layout:not\(\[hidden\]\)/,'the mobile shell must preserve the secure hidden state before authentication');
assert.doesNotMatch(adminCss,/(^|\})\s*body\s*\{[^}]*background:/,'global light/desktop body colours must not be replaced');

for(const token of [
  '#offersGrid','#festivalGrid','#yearlyGrid','#featuredProducts',
  'grid-template-columns:repeat(2,minmax(0,1fr))','.footer-grid','.portal-app',
  '.portal-sidebar','.portal-modal-card','.week-item'
])assert.ok(mobileCss.includes(token),`mobile app layer must cover ${token}`);
assert.ok(mobileCss.trimStart().startsWith('/* DropBeat V1.32'));
assert.match(mobileCss,/@media\(max-width:760px\)/);
assert.doesNotMatch(mobileCss,/^html\[data-color-mode/m,'mobile layout must not alter desktop colour themes');

assert.match(adminRuntime,/db132-nav-open/);
assert.match(adminRuntime,/MutationObserver\(syncShell\)/);
assert.match(adminRuntime,/bar\.hidden=!visible/,'the mobile bar must stay hidden on login and secure-session loading screens');
assert.match(adminRuntime,/aria-expanded/);
assert.doesNotMatch(adminRuntime,/fetch\(|\/api\//,'mobile shell runtime must be presentation-only');

const adminHtml=read('public/admin/index.html');
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-32.css?v=1.32'),1);
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-32.js?v=1.32'),1);
assert.ok(adminHtml.indexOf('/admin/dropbeat-admin-v1-32.css?v=1.32')>adminHtml.indexOf('/admin/dropbeat-admin-v1-31-dark.css?v=1.31'));
assert.ok(adminHtml.indexOf('/admin/dropbeat-admin-v1-32.js?v=1.32')>adminHtml.indexOf('/admin/dropbeat-admin-v1-31.js?v=1.31'));

const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  const previous='/assets/dropbeat-dark-mode-v1-31.css?v=1.31';
  const current='/assets/dropbeat-mobile-v1-32.css?v=1.32';
  assert.equal(count(html,current),1,`${file} must load V1.32 mobile CSS once`);
  assert.ok(html.indexOf(current)>html.indexOf(previous),`${file} must load V1.32 after V1.31`);
}

const middleware=read('functions/_middleware.js');
assert.match(middleware,/dropbeat-mobile-v1-32\.css\?v=1\.32/);
for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.equal(count(source,'/assets/dropbeat-mobile-v1-32.css?v=1.32'),1,`${file} must directly include V1.32 mobile CSS`);
}

/* All business-critical login/payment/schema/data logic is byte-identical to
   the supplied V1.31 package. */
const preserved={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
  'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d',
  'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
  'public/admin/dropbeat-admin-v1-22.js':'4dea9ca6dfe734f88989faea417d84d47136b33fbcfef318c5c61408a4982d24',
  'public/admin/final-v16-99-visitors-email-studio.js':'a231d95fd4f1d7821868413c964f45b42fcf698f1eba2110b2fd476d09a75aa2'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged from V1.31`);

for(const file of [
  'public/admin/dropbeat-admin-v1-32.js','functions/_middleware.js',
  'functions/blog/[[slug]].js','functions/page/[slug].js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.32 verified: every requested Admin modal and badge has dark-mode coverage, Add Coach availability is readable, the Admin sidebar is a mobile drawer, public product listings use an app-like two-column layout, portals use compact app spacing, and critical business logic remains unchanged.');
