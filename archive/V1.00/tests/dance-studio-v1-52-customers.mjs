import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.52.0');
const protectedFiles=JSON.parse(await read('tests/v152-protected-files.json'));
assert.ok(Object.keys(protectedFiles).length>1500);
for(const [path,hash]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,'V1.51 file unexpectedly changed: '+path);
for(const [file,start,end,hash]of JSON.parse(await read('tests/v151-protected-fragments.json'))){const source=await read(file),a=start===null?0:source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);assert.equal(createHash('sha256').update(source.slice(a,b)).digest('hex'),hash,'Existing financial/upload/submit function changed: '+file);}
for(const file of ['public/assets/dropbeat-customers-mobile-v1-52.js','public/assets/dropbeat-dashboard-mobile-v1-49.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
const html=await read('public/admin/index.html');
assert.equal((html.match(/src="\/assets\/dropbeat-customers-mobile-v1-52.js/g)||[]).length,1);
assert.ok(html.indexOf('dropbeat-mobile-navigation-v1-51.js')<html.indexOf('dropbeat-customers-mobile-v1-52.js'));
const css=await read('public/assets/dropbeat-customers-mobile-v1-52.css');assert.equal((css.match(/@media/g)||[]).length,1);assert.match(css,/@media\(max-width:760px\)/);assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i);
const script=await read('public/assets/dropbeat-customers-mobile-v1-52.js');assert.doesNotMatch(script,/\bfetch\(|new FormData|innerHTML|cloneNode/);assert.match(script,/DropBeatNavigation.row/);assert.match(script,/DropBeatUI.nativeUpload/);assert.match(script,/DropBeatMobileUI.prepareForm/);
assert.match(await read('functions/_middleware.js'),/X-DropBeat-Release', '1\.52\.0/);
console.log('V1.52 Customers release checks passed: '+Object.keys(protectedFiles).length+' V1.51 files unchanged, original submit/upload fragments preserved, scoped assets and JavaScript syntax verified.');
