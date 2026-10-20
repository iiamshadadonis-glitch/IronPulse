import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {onRequest as middleware} from '../functions/_middleware.js';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
const pkg=JSON.parse(await read('package.json'));assert.equal(pkg.version,'1.46.0');
for(const file of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){
 const html=await read(file);
 assert.equal((html.match(/<script[^>]+dropbeat-dashboard-mobile-v1-46\.js/g)||[]).length,1,file+' loads one current controller');
 assert.doesNotMatch(html,/<script[^>]+dropbeat-dashboard-mobile-v1-(36|37|38|39|40|41|42|43|44|45)\.js/);
 assert.equal((html.match(/<script[^>]+dropbeat-ui-components-v1-46\.js/g)||[]).length,1,'shared UI primitives load once');
 const path=file.includes('/admin/')?'/admin/':file.includes('student')?'/student-dashboard':'/coach-dashboard';
 for(const source of [html,html.replace('dropbeat-dashboard-mobile-v1-46.js','dropbeat-dashboard-mobile-v1-40.js')]){
  const response=await middleware({request:new Request('https://example.test'+path),env:{},next:async()=>new Response(source,{headers:{'content-type':'text/html'}})});
  const delivered=await response.text();
  assert.equal(response.headers.get('X-DropBeat-Release'),'1.46.0');
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal((delivered.match(/<script[^>]+dropbeat-dashboard-mobile-v1-46\.js/g)||[]).length,1,'middleware does not inject a second owner');
  assert.doesNotMatch(delivered,/<script[^>]+dropbeat-dashboard-mobile-v1-(36|37|38|39|40|41|42|43|44|45)\.js/);
 }
}
const js=await read('public/assets/dropbeat-dashboard-mobile-v1-46.js'),css=await read('public/assets/dropbeat-dashboard-mobile-v1-46.css');
const presentationFunctions=[...js.matchAll(/^  (?:async )?function ([A-Za-z0-9_]+)\(/gm)].map(match=>match[1]);
assert.equal(new Set(presentationFunctions).size,presentationFunctions.length,'presentation initializers must have unique names');
assert.match(css,/@media\(max-width:760px\)/);assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
assert.doesNotMatch(js,/setInterval\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
const shared=await read('public/assets/dropbeat-ui-components-v1-46.js');assert.match(shared,/m9 5 7 7-7 7/);assert.match(shared,/Object.freeze/);assert.match(shared,/stroke-width:1.8!important/);assert.match(await read('public/assets/dropbeat-dashboard-mobile-v1-42.css'),/padding-top:12px!important/);assert.match(js,/Content & Settings/);assert.match(js,/Review & Publish/);assert.match(js,/Media Assembly/);assert.match(await read('public/admin/final-v17-05-email-automations.js'),/mobileInspectorOpen=false;renderWorkspace\(\);toast/);
assert.match(js,/socialFreeNavigation/);assert.match(js,/setAttribute\('id'/);assert.match(js,/db143-upload-area/);assert.match(js,/DropBeatFlowPresentation\?\.addAfter/);assert.match(js,/Tracking','Enabled'/);assert.match(css,/overflow:hidden!important/);assert.match(await read('public/assets/dropbeat-dashboard-mobile-v1-43.css'),/db111-member-grid/);assert.match(js,/Plan Features/);assert.match(js,/Review/);assert.match(js,/v146ScopeForm/);assert.match(js,/v146LeafUnits/);assert.match(js,/v146ControlLabel/);assert.match(js,/db146-review-row/);assert.match(css,/height:100dvh/);assert.match(css,/db146-storage-delete-fab/);assert.match(await read('public/admin/dropbeat-admin-v1-22.js'),/data-db146-coach-retry/);assert.match(await read('public/admin/dropbeat-admin-v1-22.js'),/15000/);assert.match(js,/Social Status/);
assert.match(js,/fields.length%2===1/);assert.match(js,/requestSubmit\(source\)/);
const hashes={
 'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
 'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
 'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
 'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
 'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
 'public/admin/admin.js':'1e07d2a94f787fb14dc3cfa4ae80ad07959236d48165f64dfd31c5ff73b474eb',
 'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
 'public/admin/dropbeat-admin-v1-22.js':'942466d621559b76e16ce15999b1ba89faafa07c10e32461b39dae9a59e8a41a',
 'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d',
 'public/admin/final-v10-documents-brand-polish.js':'e41cadf3e35a8bab621a19d8516a3c0fcd93b6a2d3ec6d5807e7ca72eb105454',
 'public/admin/final-v14-refunds-lead-lifecycle-polish.js':'dccdc3258994442fd8cdb2c3dfbec38d30bcb04b57c7d56d08d236249b422e9c',
 'public/admin/final-v11-requests-documents-subscriptions.js':'34a3fa23fcdb5f4eb1ef066e4c3c43f5ecac91b9d52b58988f568ae714c57d3a',
 'public/admin/final-crop-polish.js':'532b3368da7a4567c462065e515c1e3563b6e256850acd4d2a27ba56895273bc'
};
for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,file+' core behavior preserved');
for(const file of ['public/admin/dropbeat-admin-language.js','public/admin/dropbeat-admin-v1-29.js','public/admin/dropbeat-admin-v1-22.js','public/admin/dropbeat-admin-v1-05.js','public/admin/final-v16-54-brand-articles-stability.js','public/admin/dropbeat-admin-v1-31.js','public/admin/final-master-client-polish.js','public/admin/final-v16-52-brand-settings-hub.js','public/admin/final-v9-invoice-statements-gmail.js','public/assets/dropbeat-ui-components-v1-46.js','public/admin/final-v17-05-email-automations.js','public/admin/final-v16-68-automation-flow-workspace.js','public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-94-integrations-heatmaps-code-reminders.js','public/admin/final-master-client-polish.js','public/assets/dropbeat-dashboard-mobile-v1-46.js','public/assets/dropbeat-plan-import-v1-40.js','functions/_lib/plan-import.js','functions/api/admin/import-products.js','functions/api/admin/products.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
console.log('V1.46 release and delivery checks passed: one current controller, no stale middleware injection, no-store dashboard HTML, mobile scope, syntax and protected business files and bounded coach-report loading.');
