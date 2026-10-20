import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {BUTTON_DEFINITIONS} from '../public/assets/button-dictionary-defaults-v1-56.js';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.56.0');
const protectedFiles=JSON.parse(await read('tests/v156-protected-files.json'));assert.equal(Object.keys(protectedFiles).length,1584);
for(const[file,hash]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,'Unexpected V1.55 change: '+file);
for(const file of ['public/assets/button-dictionary-defaults-v1-56.js','public/assets/dropbeat-button-dictionary-v1-56.js','public/assets/dropbeat-buttons-admin-v1-56.js','functions/_lib/button-dictionary.js','functions/api/admin/button-dictionary.js','functions/api/public/button-dictionary.js','functions/_middleware.js','tools/v156-buttons-cases.mjs','tools/verify-v1-56-buttons.mjs'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const file of (await readdir(new URL('public/',root))).filter(s=>s.endsWith('.html')&&!s.startsWith('_'))){const html=await read('public/'+file);assert.equal((html.match(/type="module" src="\/assets\/dropbeat-button-dictionary-v1-56.js/g)||[]).length,1,file);assert.match(html,/dropbeat-data-cache-v1-50.js/);}
const admin=await read('public/admin/index.html');assert.equal((admin.match(/src="\/assets\/dropbeat-buttons-admin-v1-56.js/g)||[]).length,1);assert.match(admin,/dropbeat-buttons-v1-56.css/);
assert.equal(new Set(BUTTON_DEFINITIONS.map(b=>b.key)).size,BUTTON_DEFINITIONS.length);assert.ok(BUTTON_DEFINITIONS.some(b=>b.category==='admin'));
const middleware=await read('functions/_middleware.js');assert.match(middleware,/X-DropBeat-Release', '1\.56\.0/);assert.match(middleware,/\/api\/public\/button-dictionary/);assert.match(middleware,/url.pathname !== '\/api\/admin\/button-dictionary'/);
const client=await read('public/assets/dropbeat-button-dictionary-v1-56.js');assert.doesNotMatch(client,/setInterval|addEventListener\(['"]focus/);assert.match(client,/DropBeatDataCache\.query/);assert.match(client,/staleTime:60000/);
const settings=await read('functions/_lib/button-dictionary.js');assert.match(settings,/button_dictionary/);assert.match(settings,/WHERE settings\.value = \? RETURNING value/);assert.match(settings,/confirmation!=='confirm'/);
const css=await read('public/assets/dropbeat-buttons-v1-56.css');assert.doesNotMatch(css,/#[a-f\d]{3,8}\b/i);assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/height:100dvh!important/);assert.match(css,/env\(safe-area-inset-bottom/);
console.log('V1.56 button release checks passed: 1584 unchanged original files, valid modules/assets, one shared default registry, mobile/desktop UI rules, exact confirmation and existing cache/theme safeguards.');
