import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
assert.equal(JSON.parse(await read('package.json')).version,'1.55.0');
const protectedFiles=JSON.parse(await read('tests/v155-protected-files.json'));
assert.equal(Object.keys(protectedFiles).length,1583);
for(const [file,hash]of Object.entries(protectedFiles))assert.equal(sha(await readFile(new URL(file,root))),hash,'Unexpected V1.54 change: '+file);
const css=await read('public/assets/dropbeat-mobile-contrast-v1-54.css'),scope=JSON.parse(await read('tests/v155-css-scope.json'));
assert.equal(sha(css.split('  @layer dropbeat-mobile-header{')[0]),scope.beforeHeaderSha256);
assert.equal(sha(css.split('  @layer dropbeat-mobile-contrast{')[1]),scope.afterHeaderSha256);
assert.equal((css.match(/@media/g)||[]).length,1);assert.match(css,/@media\(max-width:760px\)/);assert.doesNotMatch(css,/#[a-f\d]{3,8}\b/i);
assert.match(css,/flex:0 0 32px!important/);assert.match(css,/max-height:16px!important/);assert.match(css,/border-radius:8px!important/);assert.match(css,/width:48px!important;height:48px!important/);
for(const file of ['public/assets/dropbeat-global-header-v1-54.js','functions/_middleware.js','tools/v155-header-icons-cases.mjs','tools/verify-v1-55-header-icons.mjs','tools/verify-v1-55-portals.mjs'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const page of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){
 const html=await read(page);assert.equal((html.match(/href="\/assets\/dropbeat-mobile-contrast-v1-54.css\?build=dropbeat-1.55-20261019/g)||[]).length,1);
 assert.equal((html.match(/src="\/assets\/dropbeat-global-header-v1-54.js/g)||[]).length,1);
}
assert.match(await read('functions/_middleware.js'),/X-DropBeat-Release', '1\.55\.0/);
console.log('V1.55 header icon checks passed: 1583 unchanged V1.54 files, original business JavaScript unchanged; only Home glyph rendering updated, mobile-only header CSS, unchanged contrast/filter rules and valid cache-busted assets.');
