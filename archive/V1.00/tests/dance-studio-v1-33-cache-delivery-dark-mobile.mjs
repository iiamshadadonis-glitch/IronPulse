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

const BUILD='dropbeat-1.33-20261012';
const adminCssUrl=`/admin/dropbeat-admin-v1-33.css?build=${BUILD}`;
const adminJsUrl=`/admin/dropbeat-admin-v1-33.js?build=${BUILD}`;
const mobileCssUrl=`/assets/dropbeat-mobile-v1-33.css?build=${BUILD}`;

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1\.33/);
assert.match(pkg.scripts['test:dance-v1.33'],/dance-studio-v1-33-cache-delivery-dark-mobile/);
assert.match(pkg.scripts['test:dance-v1.33'],/test:dance-v1\.32/);

const adminCss=read('public/admin/dropbeat-admin-v1-33.css');
const adminRuntime=read('public/admin/dropbeat-admin-v1-33.js');
const mobileCss=read('public/assets/dropbeat-mobile-v1-33.css');
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'V1.33 Admin CSS braces must balance');
assert.equal(count(mobileCss,'{'),count(mobileCss,'}'),'V1.33 mobile CSS braces must balance');

for(const selector of [
  '#listModal.open','#ucClientModal.open','#ucMultiSubscriptionModal.open',
  '.uc-dashboard-client-card','.uc-client-tabs','.uc-v14-refund-shell',
  '.uc-v10-invoice-toolbar','.uc-profile-media-section','.uc-history-card',
  '.uc-crm-chip','.uc98-badge','.uc-sub-status',
  '.db121-style-field>label','.db121-style-picker>summary','.db121-style-menu'
])assert.ok(adminCss.includes(selector),`V1.33 dark layer must cover ${selector}`);
assert.match(adminCss,/html\[data-color-mode="dark"\][\s\S]*#listModal\.open/);
assert.match(adminCss,/\.db132-mobile-bar\[hidden\],\.db133-mobile-bar\[hidden\]\{display:none!important\}/);
assert.match(adminCss,/@media\(max-width:980px\)[\s\S]*body\.db133-admin-mobile #adminApp>\.side[\s\S]*translate3d\(-105%,0,0\)/);
assert.match(adminCss,/body\.db133-nav-open #adminApp>\.side\{transform:translate3d\(0,0,0\)!important\}/);

for(const token of [
  '#offersGrid','#festivalGrid','#yearlyGrid','#featuredProducts',
  'grid-template-columns:repeat(2,minmax(0,1fr))','.footer-grid',
  'body:has(.portal-app) .portal-app','.portal-card','.week-item','.portal-modal-card'
])assert.ok(mobileCss.includes(token),`V1.33 mobile layer must cover ${token}`);
assert.match(mobileCss,/@media\(max-width:760px\)/);

assert.match(adminRuntime,/dropbeat-1\.33-20261012/);
assert.match(adminRuntime,/dataset\.dropbeatRelease/);
assert.match(adminRuntime,/db133-admin-mobile/);
assert.match(adminRuntime,/db133-nav-open/);
assert.match(adminRuntime,/MutationObserver\(syncShell\)/);
assert.match(adminRuntime,/bar\.hidden=!visible/);
assert.doesNotMatch(adminRuntime,/fetch\(|\/api\//,'V1.33 Admin runtime must remain presentation-only');

const adminHtml=read('public/admin/index.html');
assert.equal(count(adminHtml,adminCssUrl),2,'Admin CSS must be preloaded and applied once');
assert.equal(count(adminHtml,adminJsUrl),2,'Admin JS must be preloaded and executed once');
assert.match(adminHtml,/<meta name="dropbeat-release" content="1\.33\.0">/);
assert.ok(adminHtml.indexOf(`rel="preload" href="${adminCssUrl}"`)<adminHtml.indexOf('</head>'),'Admin CSS preload must be in head');
assert.ok(adminHtml.indexOf(`rel="stylesheet" href="${adminCssUrl}"`)>adminHtml.indexOf('/admin/dropbeat-admin-v1-32.css?v=1.32'),'V1.33 CSS must be the final release layer');
assert.ok(adminHtml.indexOf(`<script src="${adminJsUrl}">`)>adminHtml.indexOf('/admin/dropbeat-admin-v1-32.js?v=1.32'),'V1.33 runtime must execute after V1.32');
assert.ok(adminHtml.indexOf(`rel="stylesheet" href="${adminCssUrl}"`)<adminHtml.indexOf('</body>'));

const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  assert.equal(count(html,mobileCssUrl),1,`${file} must load the cache-busted V1.33 mobile CSS once`);
  assert.ok(html.indexOf(mobileCssUrl)>html.indexOf('/assets/dropbeat-mobile-v1-32.css?v=1.32'),`${file} must load V1.33 after V1.32`);
  assert.ok(html.indexOf(mobileCssUrl)<html.indexOf('</head>'),`${file} must load V1.33 in head`);
}

const middleware=read('functions/_middleware.js');
assert.match(middleware,/X-DropBeat-Release', '1\.33\.0/);
assert.match(middleware,/Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate/);
assert.match(middleware,/CDN-Cache-Control', 'no-store/);
assert.match(middleware,/Cloudflare-CDN-Cache-Control', 'no-store/);
assert.ok(middleware.includes(mobileCssUrl));
for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.equal(count(source,mobileCssUrl),1,`${file} must directly include V1.33 mobile CSS`);
}

const headers=read('public/_headers');
assert.match(headers,/\/admin[\s\S]*Cache-Control: no-store, no-cache, max-age=0, must-revalidate/);
assert.match(headers,/\/assets\/dropbeat-mobile-v1-33\.css[\s\S]*max-age=31536000, immutable/);
assert.match(headers,/X-DropBeat-Release: 1\.33\.0/);
const wrangler=read('wrangler.jsonc');
assert.match(wrangler,/"name": "dance-class-at2"/);
assert.match(pkg.scripts.deploy,/--project-name dance-class-at2/,'deployment must target the Pages project serving dance-class-at2.pages.dev');
assert.doesNotMatch(pkg.scripts.deploy,/--project-name dance-class(?:\s|$)/);

/* Business-critical logic remains byte-identical to the supplied V1.32. */
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
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged from V1.32`);

for(const file of [
  'public/admin/dropbeat-admin-v1-33.js','functions/_middleware.js',
  'functions/blog/[[slug]].js','functions/page/[slug].js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.33 verified: new cache keys are delivered through static and dynamic pages, Admin dialogs and badges have final dark-mode coverage, Add Coach teaching styles are readable, mobile Admin uses an off-canvas shell, public plans use two columns, Student/Coach portals use app-like cards, and deploy targets dance-class-at2.');
