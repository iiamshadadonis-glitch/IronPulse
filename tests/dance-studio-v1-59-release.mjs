import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),text=path=>readFile(new URL(path,root),'utf8');
const protectedFiles=JSON.parse(await text('tests/v159-protected-files.json')),changed=JSON.parse(await text('tests/v159-changed-files.json'));
assert.equal(Object.keys(protectedFiles).length+changed.length,1725);
for(const[path,digest]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),digest,'Unrelated V1.58 file changed: '+path);
assert.equal(JSON.parse(await text('package.json')).version,'1.59.0');assert.match(await text('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.59/);
const modules=[...changed.filter(path=>path.endsWith('.js')||path.endsWith('.mjs')),'public/assets/dropbeat-dynamic-labels-v1-59.js','tools/verify-v1-59-navigation-schedule.mjs','tools/v159-navigation-schedule-cases.mjs'];
for(const path of new Set(modules))execFileSync(process.execPath,['--check',new URL(path,root).pathname]);
for(const path of [...(await readdir(new URL('public/',root))).filter(name=>name.endsWith('.html')&&!name.startsWith('_')).map(name=>'public/'+name),'public/admin/index.html']){
 const html=await text(path);assert.equal((html.match(/src="\/assets\/dropbeat-dynamic-labels-v1-59.js/g)||[]).length,1,path);assert.ok(html.indexOf('/assets/dropbeat-dynamic-labels-v1-59.js')<html.indexOf('<body'),path);
 const nav=/<nav class="navlinks"[^>]*>(.*?)<\/nav>/s.exec(html)?.[1];if(nav)assert.doesNotMatch(nav,/>\s*(?:Offers|Article|Articles|Checkout|Book a Trial)\s*</);
}
const dictionary=await text('public/assets/dropbeat-button-dictionary-v1-56.js');assert.match(dictionary,/let payload=null/);assert.doesNotMatch(dictionary,/lookup\.get\(definition.key\)\|\|definition|dictionaryButtons\(/);assert.match(dictionary,/queueMicrotask\(render\)/);assert.match(dictionary,/persist:!adminPage/);assert.match(dictionary,/Invalid button configuration/);
const layout=await text('public/assets/dropbeat-layout-v1-57.js');assert.match(layout,/let model=null/);assert.match(layout,/Object\.entries\(aliases\)\)if\(currentNames\[key\]\)/);assert.match(layout,/queueMicrotask\(render\)/);assert.match(layout,/Invalid layout configuration/);
for(const file of ['public/admin/final-v16-53-navigation-brand-notifications.js','public/admin/final-v16-54-brand-articles-stability.js','public/admin/dropbeat-admin-v1-03.js'])assert.doesNotMatch(await text(file),/set(?:Sidebar|Button)Label\([^\n]*['"](?:Article|Dance Tips)['"]/);
assert.doesNotMatch(await text('public/assets/dropbeat-dance-language.js'),/a\.textContent='Dance Tips'/);
const legacy=await text('public/admin/final-v16-62-inbox-nav-automations.js');assert.doesNotMatch(legacy,/\['blogs','Article'\]/);assert.match(legacy,/DropBeatDynamicUI\?\.label/);
const bootstrap=await text('public/assets/dropbeat-dynamic-labels-v1-59.js');assert.match(bootstrap,/milliseconds=8000/);assert.match(bootstrap,/Promise\.race/);assert.match(bootstrap,/Retry/);assert.doesNotMatch(bootstrap,/setInterval|localStorage\.setItem|sessionStorage\.setItem/);
const schedule=await text('public/admin/dropbeat-admin-v1-19.js');assert.match(schedule,/window\.load_studioSchedule=\(\)=>load\(\)/);assert.match(schedule,/Promise\.race/);assert.match(schedule,/15000/);assert.match(schedule,/scheduleData\(value\)/);assert.match(schedule,/function render\(\)\{try\{renderContent/);assert.doesNotMatch(schedule,/if\(!mobile\(\)\)\{host.innerHTML/);assert.match(schedule,/view=mobile&page=\$\{page\}&pageSize=50/);
const css=await text('public/assets/dropbeat-dynamic-labels-v1-59.css');assert.match(css,/@media\(min-width:761px\)/);assert.match(css,/margin-bottom:24px/);assert.doesNotMatch(css,/#(?:[0-9a-f]{3,8})\b/i);
assert.match(await text('functions/_middleware.js'),/dropbeat-dynamic-labels-v1-59/);
console.log('V1.59 release guards passed: '+Object.keys(protectedFiles).length+' unchanged V1.58 files; strict dynamic labels, no legacy sidebar writers, first-paint/error states, bounded Schedule loader, desktop-only spacing, valid modules and unchanged business/theme files.');
