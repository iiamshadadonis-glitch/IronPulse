import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.50.0');
const retainedFunctions=[["public/assets/app.js", "function addToCart(", "function renderCartCount(", "2d4c14db95a15d34340268a4be9abbe9a5adf7bfe2c913d0f7d8a6f1007beee5"], ["public/assets/app.js", "function productPriceHtml(", "function productAvailability(", "16cbf49c1fd9447fd5a0d6c2bd0efc31a135408c84d8af1544461a3aae900f21"], ["public/assets/app.js", "function productAvailability(", "function productCard(", "bb4330f3b574a496cd138072f5b0399cb1858e75292357e0239c3f19300f4416"], ["public/assets/app.js", "function productCard(", "function galleryShift(", "717b3896b58ea10a4f92056b5d2ffcd3ceaf0dcff2449fcc82adcd33f3e94feb"], ["public/assets/app-extra.js", "  function productCardPolished(", "  window.galleryGo=", "e3a60e56ab97778a47e2bf0aef6db7cbda3d6925c2b386672d4030f5c69de4ce"]];
for(const [file,start,end,hash]of retainedFunctions){const t=await read(file),code=t.slice(t.indexOf(start),t.indexOf(end,t.indexOf(start)));assert.equal(createHash('sha256').update(code).digest('hex'),hash,'Existing prices/cart/availability renderer changed: '+file+' '+start);}
const hashes=JSON.parse(await read('tests/v150-protected-files.json'));
for(const [path,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,'Unrelated business/theme/database file changed: '+path);
for(const script of ['public/assets/dropbeat-data-cache-v1-50.js','public/assets/dropbeat-public-mobile-v1-50.js','public/assets/app.js','public/assets/app-extra.js','public/admin/admin.js','public/assets/final-public-seo-ssl-speed.js','functions/_lib/edge-response-cache.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(script,root).pathname]);
for(const page of ['public/index.html','public/offers.html','public/admin/index.html']){
 const html=await read(page);assert.equal((html.match(/src="\/assets\/dropbeat-data-cache-v1-50\.js/g)||[]).length,1);assert.ok(html.indexOf('dropbeat-data-cache-v1-50.js')<html.indexOf(page.includes('admin/')?'/admin/admin.js':'/assets/app.js'));assert.match(html,/dropbeat-mobile-v1-50\.css\?build=dropbeat-1\.50-20261018/);assert.match(html,/(?:app|admin)\.js[^"']*build=dropbeat-1\.50-20261018/);
}
const css=await read('public/assets/dropbeat-mobile-v1-50.css');assert.equal((css.match(/@media/g)||[]).length,1);assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/\.uc-payment-records\{[^}]*max-height:none!important;overflow:visible/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/\.db150-plan-footer\{[^}]*margin-top:auto/);
const middleware=await read('functions/_middleware.js');assert.match(middleware,/X-DropBeat-Release', '1\.50\.0/);assert.match(middleware,/!edgePublicRead/);
const cache=await read('public/assets/dropbeat-data-cache-v1-50.js');assert.doesNotMatch(cache,/setInterval|addEventListener\(['"]focus/);
console.log('V1.50 release checks passed: scoped mobile delivery, current cache build, valid JavaScript and '+Object.keys(hashes).length+' unchanged business/theme/configuration files.');
