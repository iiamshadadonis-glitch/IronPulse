import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.54.0');
const protectedFiles=JSON.parse(await read('tests/v154-protected-files.json'));
assert.equal(Object.keys(protectedFiles).length,1562);
for(const [file,hash]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,'Unexpected V1.53 change: '+file);
for(const file of ['public/assets/dropbeat-global-header-v1-54.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const page of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){
 const html=await read(page);
 assert.equal((html.match(/src="\/assets\/dropbeat-global-header-v1-54.js/g)||[]).length,1);
 assert.equal((html.match(/href="\/assets\/dropbeat-mobile-contrast-v1-54.css/g)||[]).length,1);
 assert.ok(html.indexOf('dropbeat-portal-mobile-v1-53.js')<html.indexOf('dropbeat-global-header-v1-54.js'));
}
const script=await read('public/assets/dropbeat-global-header-v1-54.js');
assert.doesNotMatch(script,/\bfetch\(|setInterval|new FormData|\.innerHTML\s*=|cloneNode/);
assert.match(script,/function mount\(header\)/);assert.match(script,/function restore\(\)/);
const css=await read('public/assets/dropbeat-mobile-contrast-v1-54.css');
assert.equal((css.match(/@media/g)||[]).length,1);assert.match(css,/@media\(max-width:760px\)/);
assert.doesNotMatch(css,/#[a-f\d]{3,8}\b/i);assert.match(css,/--text-primary:var\(--db135-title,var\(--portal-ink/);
assert.match(css,/--db138-text:var\(--text-primary\)/);assert.match(css,/--db151-text:var\(--text-primary\)/);
assert.match(css,/flex:0 0 40px!important/);assert.match(css,/max-height:22px!important/);
assert.match(css,/\[data-db140-apply\]/);assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
assert.match(await read('functions/_middleware.js'),/X-DropBeat-Release', '1\.54\.0/);
console.log('V1.54 header/contrast checks passed: 1562 unchanged V1.53 files, shared live controls, mobile-only semantic colors, valid assets/JavaScript and release marker.');
