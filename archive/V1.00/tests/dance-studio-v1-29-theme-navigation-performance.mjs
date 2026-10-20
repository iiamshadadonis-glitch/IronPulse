import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mergeSiteSettings} from '../functions/_lib/utils.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const count=(source,needle)=>source.split(needle).length-1;
const sha256=relative=>createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
assert.ok(['1.29.0','1.33.0'].includes(pkg.version));
assert.ok(['1.29.0','1.33.0'].includes(lock.version));
assert.ok(['1.29.0','1.33.0'].includes(lock.packages[''].version));
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1\.(?:29|30|31|32|33)/);
assert.match(pkg.scripts['test:dance-v1.29'],/dance-studio-v1-29-theme-navigation-performance/);
assert.match(pkg.scripts['test:dance-v1.29'],/test:dance-v1\.28/,'the complete inherited V1.28 regression chain must still run');

// Theme selection is additive site data: absent/invalid values preserve the
// original DropBeat layout, while all four published choices round-trip.
assert.equal(mergeSiteSettings({}).frontendTheme,'dropbeat');
for(const theme of ['dropbeat','casting','spotlight','minimal'])assert.equal(mergeSiteSettings({frontendTheme:theme}).frontendTheme,theme);
assert.equal(mergeSiteSettings({frontendTheme:'untrusted-layout'}).frontendTheme,'dropbeat');

// Saving colours/themes or renaming a navigation item must invalidate the
// exact public edge snapshots before the successful response is returned.
const settingsEndpoint=read('functions/api/admin/settings.js');
assert.match(settingsEndpoint,/await purgePublicEdgeCaches\(request,[\s\S]*DROPBEAT_PUBLIC_CACHE_ENTRIES/);
assert.match(settingsEndpoint,/entry\.path === '\/api\/public\/site'/);
assert.match(settingsEndpoint,/entry\.path === '\/api\/public\/bootstrap'/);
const navigationEndpoint=read('functions/api/admin/navigation-order.js');
assert.match(navigationEndpoint,/SITE_NAVIGATION_CACHE\s*=\s*\[\{path:'\/api\/public\/site',key:'site-dropbeat-v113'\}\]/);
assert.ok(count(navigationEndpoint,'await purgePublicEdgeCaches(request,SITE_NAVIGATION_CACHE)')>=3,'every navigation save path must synchronously clear the shared site-navigation snapshot');

// One in-flight/cached request is shared by first-open admin panels. Mutations
// advance a generation so an older read cannot restore stale data afterward.
const admin=read('public/admin/admin.js');
assert.match(admin,/const ucAdminGetCache=new Map\(\),ucAdminGetInflight=new Map\(\)/);
assert.match(admin,/ucAdminCacheGeneration\+\+/);
assert.match(admin,/requestGeneration===ucAdminCacheGeneration/);
for(const endpoint of ['/api/admin/products','/api/admin/pages','/api/admin/settings','/api/admin/social-automations','/api/admin/lead-nurture-automations'])assert.ok(admin.includes(`'${endpoint}'`),`${endpoint} must participate in the bounded first-open cache/prefetch`);
assert.match(admin,/expires:Date\.now\(\)\+45000/);
assert.match(admin,/uploadMedia\(e\)[\s\S]*ucAdminInvalidateApiCache\(\)/,'direct product-media uploads must invalidate a prefetched product snapshot before reloading');
assert.match(read('public/admin/final-crop-polish.js'),/fetch\('\/api\/admin\/media'[\s\S]*ucAdminInvalidateApiCache/,'the active cropped-media upload path must also invalidate prefetched products');
assert.match(admin,/navigator\.connection\?\.saveData/);
assert.match(admin,/const paths=\['\/api\/admin\/settings','\/api\/admin\/products','\/api\/admin\/pages','\/api\/admin\/social-automations','\/api\/admin\/lead-nurture-automations'\]/);
assert.match(admin,/function tab\(id\)[\s\S]*return window\['load_'\+id\]\(\)/);
assert.ok(count(admin,'Promise.resolve(initial).catch(()=>{}).finally(scheduleAdminPrefetch)')>=2,'prefetch must begin only after the initial authenticated panel settles');

// Plans are rendered in their final form in one DOM write. No later body-wide
// observer is allowed to wrap the first plan name and make it visibly blink.
const billing=read('public/admin/final-v14-4-plan-billing.js');
assert.match(billing,/class="uc-admin-plan-link"[\s\S]*<strong>\$\{H\(p\.name\)\}<\/strong><\/a>/);
assert.match(billing,/const classTag=p\.class_mapping\?\.enabled/);
const availability=read('public/admin/final-v16-30-plan-availability.js');
assert.doesNotMatch(availability,/new MutationObserver/);
assert.match(availability,/window\.renderProducts=function\(\)[\s\S]*patchPlanLinks\(\)/);
assert.doesNotMatch(read('public/admin/dropbeat-admin-v1-13.js'),/setTimeout\(decorateProductRows/);

// Public settings and navigation use one authoritative request instead of
// independently refreshing at different times and reverting Pricing to Offers.
const app=read('public/assets/app.js');
assert.match(app,/window\.UCGetPublicSiteData=function/);
assert.match(app,/let ucDynamicNavPromise=null/);
assert.match(app,/function loadDynamicCustomNavigation\(\)[\s\S]*UCGetPublicSiteData\(false\)/);
assert.doesNotMatch(app,/setTimeout\([^\n]*(?:700|1600)/);
const navigationClient=read('public/assets/final-v16-37-navigation.js');
assert.match(navigationClient,/typeof window\.UCGetPublicSiteData==='function'/);
assert.doesNotMatch(navigationClient,/setTimeout\([^\n]*(?:350|900|1800)/);

// Appearance controls are direct sub-tabs, offer three additional frontend
// layouts, preserve the original reset path and hide irrelevant gallery fields.
const adminTheme=read('public/admin/dropbeat-admin-v1-29.js');
for(const theme of ['dropbeat','casting','spotlight','minimal'])assert.match(adminTheme,new RegExp(`${theme}:\\{`));
assert.match(adminTheme,/data-db129-appearance="colors"[\s\S]*Website Colors/);
assert.match(adminTheme,/data-db129-appearance="theme"[\s\S]*Theme/);
assert.match(adminTheme,/data-db129-reset-theme/);
assert.match(adminTheme,/selectTheme\('dropbeat',\{reset:true\}\)/);
assert.match(adminTheme,/uc129-theme-hidden/);
assert.match(adminTheme,/dataset\.adminBrandCustom/);
const publicTheme=read('public/assets/dropbeat-theme-v1-29.js');
assert.match(publicTheme,/new Set\(\['dropbeat','casting','spotlight','minimal'\]\)/);
assert.match(publicTheme,/root\.dataset\.siteTheme=theme/);
assert.match(publicTheme,/root\.dataset\.brandCustom/);
assert.match(publicTheme,/window\.applySettings=function/);

const publicCss=read('public/assets/dropbeat-theme-v1-29.css');
const adminCss=read('public/admin/dropbeat-admin-v1-29.css');
for(const selector of ['data-site-theme="casting"','data-site-theme="spotlight"','data-site-theme="minimal"','data-color-mode="dark"','.db107-plan-facts','.db107-plan-fact'])assert.ok(publicCss.includes(selector),`public theme stylesheet must include ${selector}`);
for(const selector of ['data-admin-brand-custom="true"','data-color-mode="dark"','.uc129-appearance-tabs','.uc129-theme-grid','.uc129-theme-hidden'])assert.ok(adminCss.includes(selector),`admin theme stylesheet must include ${selector}`);
assert.equal(count(publicCss,'{'),count(publicCss,'}'),'public theme CSS braces must balance');
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'admin theme CSS braces must balance');

// Every full public document loads the last-mile theme layer exactly once;
// middleware provides the same versioned fallback for dynamic HTML shells.
const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  assert.equal(count(html,'/assets/dropbeat-theme-v1-29.css?v=1.29'),1,`${file} must load the V1.29 theme CSS once`);
  assert.equal(count(html,'/assets/dropbeat-theme-v1-29.js?v=1.29'),1,`${file} must load the V1.29 theme runtime once`);
  if(html.includes('/assets/app.js'))assert.match(html,/\/assets\/app\.js\?[^"']*dropbeat=1\.29/,`${file} must bypass the cached pre-V1.29 public loader`);
  if(html.includes('/assets/final-v16-37-navigation.js'))assert.match(html,/final-v16-37-navigation\.js\?[^"']*dropbeat=1\.29/,`${file} must bypass the cached competing-navigation runtime`);
}
const adminHtml=read('public/admin/index.html');
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-29.css?v=1.29'),1);
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-29.js?v=1.29'),1);
for(const asset of [
  '/admin/admin.js?v=17.04&dropbeat=1.29','/admin/final-crop-polish.js?v=1.29','/admin/final-v14-4-plan-billing.js?v=1.29',
  '/admin/final-v16-30-plan-availability.js?v=16.30&dropbeat=1.29','/admin/final-v16-68-automation-flow-workspace.js?v=16.83&dropbeat=1.29',
  '/admin/final-v16-76-d1-polls-automation-workspace.js?v=16.83&dropbeat=1.29','/admin/dropbeat-admin-v1-13.js?v=1.29'
])assert.ok(adminHtml.includes(asset),`${asset} must use the V1.29 cache-busting URL`);
const middleware=read('functions/_middleware.js');
assert.match(middleware,/dropbeat-theme-v1-29\.css\?v=1\.29/);
assert.match(middleware,/dropbeat-theme-v1-29\.js\?v=1\.29/);
for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.match(source,/app\.js\?[^"`]*dropbeat=1\.29/,`${file} must serve the shared V1.29 public loader`);
  assert.match(source,/final-v16-37-navigation\.js\?[^"`]*dropbeat=1\.29/,`${file} must serve the V1.29 navigation runtime`);
}

// V1.29 is presentation/cache-only. These payment, login, schedule and portal
// files are byte-for-byte identical to the supplied V1.28 replacement.
const preserved={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'functions/_lib/studio-schedule.js':'87b78fd48da8c00fd7bcd4b76a3d8b547ec5a5a8f2a01396c2757b8e459a1a67',
  'functions/_lib/coach-remuneration.js':'2a1f47e84b3ae0ef8187f5e8d0280af87a3d70155ff40539b53c46a62e9c8680',
  'public/assets/app-extra.js':'cc46bfd21000aa5f0e3e123b245ccb527625f01ca02784cf9f9d6a269179cb0e',
  'public/assets/final-v16-2-payment.js':'b9d0c8dd9c25eeb55962cae9650bff526c0a25bf5cf22a0cc9376896381ad160',
  'public/assets/portal-dashboard-v1-16.js':'c50efe0d99cde4310917604146fbf321b2d6f8b6e4524f3b435212e335c09223',
  'public/admin/dropbeat-admin-v1-25.js':'0612c8e8ef645895eeb97a35b22da93883e219a65f33f9014dc80a58941a2241'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged from V1.28`);

for(const file of [
  'functions/_lib/utils.js','functions/_middleware.js','functions/api/admin/settings.js','functions/api/admin/navigation-order.js','functions/blog/[[slug]].js','functions/page/[slug].js',
  'public/admin/admin.js','public/admin/final-crop-polish.js','public/admin/dropbeat-admin-v1-13.js','public/admin/final-v14-4-plan-billing.js','public/admin/final-v16-30-plan-availability.js',
  'public/admin/final-v16-68-automation-flow-workspace.js','public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/dropbeat-admin-v1-29.js',
  'public/assets/app.js','public/assets/final-v16-37-navigation.js','public/assets/dropbeat-theme-v1-29.js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.29 verified: plan rows render without delayed blinking, first-open admin reads are deduplicated/prefetched, navigation and appearance saves invalidate public caches, four frontend themes are available, and dark-mode coverage is present on all 26 public documents plus Admin.');
