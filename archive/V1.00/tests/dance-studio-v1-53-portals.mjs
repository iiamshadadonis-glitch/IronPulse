import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.53.0');
const protectedFiles=JSON.parse(await read('tests/v153-protected-files.json'));assert.ok(Object.keys(protectedFiles).length>1500);
for(const [file,hash]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,'Unexpected V1.52 change: '+file);
for(const file of ['public/assets/dropbeat-portal-mobile-v1-53.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const page of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){const html=await read(page);assert.equal((html.match(/src="\/assets\/dropbeat-portal-mobile-v1-53.js/g)||[]).length,1);assert.match(html,/dropbeat-portal-mobile-v1-53\.css\?build=dropbeat-1\.53/);assert.ok(html.indexOf('dropbeat-mobile-navigation-v1-51.js')<html.indexOf('dropbeat-portal-mobile-v1-53.js'));}
const script=await read('public/assets/dropbeat-portal-mobile-v1-53.js');assert.doesNotMatch(script,/\bfetch\(|setInterval|new FormData|\.innerHTML\s*=/);assert.match(script,/DropBeatNavigation.row/);assert.match(script,/DropBeatNavigation.sheet/);
const css=await read('public/assets/dropbeat-portal-mobile-v1-53.css');assert.equal((css.match(/@media/g)||[]).length,1);assert.match(css,/@media\(max-width:760px\)/);assert.doesNotMatch(css,/#[a-f\d]{3,8}\b/i);assert.match(css,/min-height:56px!important/);assert.match(css,/overflow-y:auto!important/);
assert.match(await read('functions/_middleware.js'),/X-DropBeat-Release', '1\.53\.0/);
console.log('V1.53 portal checks passed: '+Object.keys(protectedFiles).length+' unchanged V1.52 files, original session/ticket/statement handlers preserved, mobile-only CSS and valid assets/JavaScript.');
