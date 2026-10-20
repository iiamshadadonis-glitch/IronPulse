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
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.match(pkg.scripts['test:dance-v1.30'],/dance-studio-v1-30-dark-mode-completion/);
assert.match(pkg.scripts['test:dance-v1.30'],/test:dance-v1\.29/,'the complete inherited V1.29 regression chain must still run');

const adminCss=read('public/admin/dropbeat-admin-v1-30-dark.css');
const publicCss=read('public/assets/dropbeat-dark-mode-v1-30.css');
const publicRuntime=read('public/assets/dropbeat-dark-mode-v1-30.js');
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'V1.30 admin dark CSS braces must balance');
assert.equal(count(publicCss,'{'),count(publicCss,'}'),'V1.30 public dark CSS braces must balance');
assert.match(adminCss,/html\[data-color-mode="dark"\] body>\.modal/,'body-level modals must receive dark surfaces outside #adminApp');
for(const selector of [
  '.db107-plan-class','.uc-plan-next-step','.placement-section-card','.uc-client-stat','.uc96-contact-field',
  '.uc88-chart-shell','.uc88-calendar','.db107-coach-card','.db116-calendar-day','.db119-profile-metrics',
  '.uc48-calendar-shell','.uc48-media-box','.uc-v1634-header-preview','.db114-summary-card','.uc-theme-builder'
])assert.ok(adminCss.includes(selector),`admin dark completion must cover ${selector}`);
assert.match(adminCss,/#growthAnalytics[\s\S]*\.uc89-chart-detail/);
assert.match(adminCss,/#businessCalendar[\s\S]*\.uc88-list-row/);
assert.match(adminCss,/#socialPosts[\s\S]*\.uc48-day/);
assert.match(adminCss,/#settings[\s\S]*\.uc-color-editor/);

// Public completion restores the About title and covers both static and
// dynamically rendered Dance Tips list/article surfaces.
assert.match(publicCss,/body\[data-uc-load="page:about"\][\s\S]*#pageContent h1/);
assert.match(publicCss,/-webkit-text-fill-color:#f7f8fc!important/);
assert.match(publicCss,/body\[data-uc-load\^="blog"\][\s\S]*\.uc-blog-card/);
assert.match(publicRuntime,/MutationObserver\(queueEnsure\)/,'dynamic navigation replacements must not permanently remove the toggle');
assert.match(publicRuntime,/button\.dataset\.mode!==mode\|\|!button\.querySelector\('svg'\)/,'the observer must not rewrite the same icon and trigger itself indefinitely');
assert.match(publicRuntime,/data-dropbeat-color-mode/);
assert.match(publicRuntime,/dropbeat:color-mode/);
assert.match(publicRuntime,/prefers-color-scheme: dark/);
assert.doesNotMatch(publicRuntime,/fetch\(|\/api\//,'the recovery runtime must be presentation-only');

// Canvas labels and grid lines are pixels, so they must repaint from a visual
// palette when the colour mode changes. Existing series colours/data remain.
const analytics=read('public/admin/final-v16-89-analytics-calendar.js');
assert.match(analytics,/function chartTheme\(\)[\s\S]*dataset\.colorMode==='dark'/);
assert.match(analytics,/text:'#eef0f7',muted:'#b9bfd0',grid:'#3d455f',labelBg:'#202638'/);
assert.match(analytics,/text:'#202239',muted:'#62647a',grid:'#dedfec',labelBg:'#ffffff'/,'the original light chart palette must remain exact');
assert.match(analytics,/addEventListener\('dropbeat:color-mode',[\s\S]*drawGrowth\(\)/);
for(const color of ['#16a466','#067a55','#3b82f6','#7c3aed','#e9b300','#d71932','#f97316'])assert.ok(analytics.includes(color),`existing analytics series colour ${color} must remain unchanged`);

// All complete public documents receive the additive assets once and after
// V1.29. No existing light-mode stylesheet is replaced.
const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  const priorCss='/assets/dropbeat-theme-v1-29.css?v=1.29';
  const darkCss='/assets/dropbeat-dark-mode-v1-30.css?v=1.30';
  const priorJs='/assets/dropbeat-theme-v1-29.js?v=1.29';
  const darkJs='/assets/dropbeat-dark-mode-v1-30.js?v=1.30';
  assert.equal(count(html,darkCss),1,`${file} must load the V1.30 dark CSS once`);
  assert.equal(count(html,darkJs),1,`${file} must load the resilient V1.30 mode runtime once`);
  assert.ok(html.indexOf(darkCss)>html.indexOf(priorCss),`${file} must load V1.30 CSS after V1.29`);
  assert.ok(html.indexOf(darkJs)>html.indexOf(priorJs),`${file} must load V1.30 JS after V1.29`);
}

const adminHtml=read('public/admin/index.html');
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-30-dark.css?v=1.30'),1);
assert.ok(adminHtml.indexOf('/admin/dropbeat-admin-v1-30-dark.css?v=1.30')>adminHtml.indexOf('/admin/dropbeat-admin-v1-29.css?v=1.29'),'admin dark completion must be the final admin stylesheet');
const middleware=read('functions/_middleware.js');
assert.match(middleware,/dropbeat-dark-mode-v1-30\.css\?v=1\.30/);
assert.match(middleware,/dropbeat-dark-mode-v1-30\.js\?v=1\.30/);
for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.equal(count(source,'/assets/dropbeat-dark-mode-v1-30.css?v=1.30'),1,`${file} must include the V1.30 dark CSS directly`);
  assert.equal(count(source,'/assets/dropbeat-dark-mode-v1-30.js?v=1.30'),1,`${file} must include the resilient mode runtime directly`);
  assert.equal(count(source,'/assets/dropbeat-theme-v1-29.css?v=1.29'),1,`${file} must preserve the prior theme before V1.30`);
}

// V1.30 is a presentation-only patch. Original light styles and all payment,
// login, schema and gateway logic stay byte-for-byte identical to V1.29.
const preserved={
  'public/assets/styles.css':'892e3d5ee4e01bad1accdc61a9222abe3549ffa18f6728356aa074410a9dad96',
  'public/assets/dropbeat-color-mode-v1-25.css':'f634fa7fd01d002ded4a1fd6c22394e750d00269b81f260c9eab6b8b1ddcdc02',
  'public/assets/dropbeat-theme-v1-29.css':'6f8029a3882ac1e7705f3235dac7f26eb6ac643f8009dfee7cb0a01087a86a97',
  'public/admin/admin.css':'599d22a6d22db8601a852c085388ec7cdca7a496e1418e6d376e8efaf112b4b7',
  'public/admin/dropbeat-admin-theme.css':'51df33eb8a145c554888d59815a00491b0476914090d7efafce6a86314750c55',
  'public/admin/dropbeat-admin-v1-29.css':'8dbae40a751a62945e64e4688f49118f113dd1a7dd4a683b809542a7f3d067dd',
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged from V1.29`);

for(const file of [
  'public/assets/dropbeat-dark-mode-v1-30.js','public/admin/final-v16-89-analytics-calendar.js',
  'functions/_middleware.js','functions/blog/[[slug]].js','functions/page/[slug].js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.30 verified: dark-only admin and public surfaces cover the reported grids, calendars, analytics, dialogs, About title and Dance Tips; the theme control survives dynamic navigation; canvas charts repaint; and all light-mode plus payment/login logic remains unchanged.');
