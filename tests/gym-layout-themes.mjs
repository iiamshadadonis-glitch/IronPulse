import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
import {cloneLayoutData,normalizedLayoutThemes,normalizeThemeLayout,themeBlocks,LAYOUT_THEMES} from '../public/assets/layout-registry-v1-57.js';
import {layoutPayload} from '../functions/_lib/layout.js';
import {onRequestGet as getLayout} from '../functions/api/admin/layout.js';
import {onRequestPost as postSettings} from '../functions/api/admin/settings.js';
import {database,request} from './fixtures-v158.mjs';

// Reproduce the old router re-entry overflow using its exact supplied source,
// then run the same callback against the patched single-owner controller.
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const protectedFunctions=JSON.parse(source('verification/ironpulse-v1.07/v106-admin-functions.json')),adminSource=source(protectedFunctions.path),adminAst=parse(adminSource,{sourceType:'script'});
for(const[name,expected]of Object.entries(protectedFunctions.functions)){const node=adminAst.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,name);assert.equal(createHash('sha256').update(adminSource.slice(node.start,node.end)).digest('hex'),expected,'Unchanged Admin business function: '+name);}
const original=source('tests/fixtures/v106-pages-workspace.js');
const input=JSON.parse(source('verification/ironpulse-v1.07/v106-input-files.json'));
assert.equal(createHash('sha256').update(original).digest('hex'),input.files['public/assets/gym-pages-workspace-v1-57.js']);
function ownerFrom(code,window){return new Function('window','document','MutationObserver','requestAnimationFrame',code.replace(/\bexport /g,'')+';return {activateWorkspace,registerWorkspace,currentWorkspace};')(window,{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},class{observe(){}disconnect(){}},()=>{});}
const oldWindow={},oldOwner=ownerFrom(original,oldWindow);oldOwner.registerWorkspace('layout',{label:'Layout',panel:{hidden:false}});oldWindow.tab=()=>oldOwner.activateWorkspace('layout');assert.throws(()=>oldOwner.activateWorkspace('layout'),RangeError,'Supplied V1.06 overflows when route activation re-enters Layout');
const nextWindow={},nextOwner=ownerFrom(source('public/assets/gym-pages-workspace-v1-57.js'),nextWindow);let routeCalls=0;nextOwner.registerWorkspace('layout',{label:'Layout',panel:{hidden:false}});nextWindow.tab=()=>{routeCalls++;nextOwner.activateWorkspace('layout');};nextOwner.activateWorkspace('layout');assert.equal(routeCalls,1);assert.equal(nextOwner.currentWorkspace(),'layout');assert.equal(ownerFrom(source('public/assets/gym-pages-workspace-v1-57.js'),nextWindow).activateWorkspace,nextOwner.activateWorkspace);

const cycle={};cycle.child={parent:cycle};assert.throws(()=>cloneLayoutData(cycle),/circular/);
const shared={visibility:'hide'},copied=cloneLayoutData({a:shared,b:shared});assert.deepEqual(copied,{a:shared,b:shared});assert.notEqual(copied.a,copied.b,'Shared acyclic references become independent tree nodes');
let deep={};for(let i=0;i<1000;i++)deep={child:deep};assert.throws(()=>cloneLayoutData(deep),/nesting depth/);
assert.throws(()=>cloneLayoutData(Array.from({length:10001},()=>({}))),/supported size/);
for(const value of [{bad:Infinity},{bad:()=>{}},{bad:new Date()},JSON.parse('{"__proto__":{"polluted":true}}')])assert.throws(()=>cloneLayoutData(value));assert.equal({}.polluted,undefined);
for(const theme of Object.keys(LAYOUT_THEMES)){
 const layout=normalizeThemeLayout(theme,{blocks:{footer:{removed:true,viewports:{mobile:{visibility:'hide'}}},highlights:{viewports:{mobile:{visibility:'hide'}}}}});assert.equal(layout.blocks.footer,undefined);assert.equal(layout.blocks.highlights.viewports.desktop,undefined);
 assert.equal(themeBlocks(theme).some(b=>b.id==='footer'||b.region==='footer'),false);assert.equal(themeBlocks(theme).some(b=>b.id==='gallery'),LAYOUT_THEMES[theme].gallery);
 const payload=layoutPayload({theme,document:{themes:{[theme]:layout}},buttons:{},navigation:{},contextRevision:'fixture',updatedAt:'2026-10-22T00:00:00Z'},{admin:true});assert.equal(payload.blocks.some(b=>b.id==='footer'),false);assert.equal(Object.keys(payload.themes).length,4);
}
assert.deepEqual(normalizedLayoutThemes({minimal:cycle}).minimal,{blocks:{},order:{}});
const fixture=database(),env={...fixture.env,ADMIN_DEVELOPMENT_BYPASS:'true'};
const put=(key,value)=>fixture.sql.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
put('site_settings',{siteName:'IronPulse Gym',frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8'});put('unrelated_business_record',{order_id:'fixture-order',student_id:42,amount_paise:19900});
const save=body=>postSettings({request:request('/api/admin/settings',{body}),env});
const current=()=>JSON.parse(fixture.sql.prepare('SELECT value FROM settings WHERE key=?').get('site_settings').value);
try{
 for(const confirmation of [undefined,'Confirm','confirm ','yes']){const r=await save({frontendTheme:'minimal',confirmation,expectedTheme:'dropbeat'});assert.equal(r.status,400);assert.equal(current().frontendTheme,'dropbeat');}
 let response=await save({frontendTheme:'minimal',confirmation:'confirm',expectedTheme:'casting'});assert.equal(response.status,409);assert.equal(current().frontendTheme,'dropbeat');
 response=await save({frontendTheme:'minimal',confirmation:'confirm',expectedTheme:'dropbeat'});assert.equal(response.status,200);let settings=(await response.json()).settings;assert.equal(settings.frontendTheme,'minimal');assert.equal(settings.confirmation,undefined);assert.equal(settings.expectedTheme,undefined);assert.equal(settings.primaryColor,'#4B55BE');
 const model=await (await getLayout({request:request('/api/admin/layout'),env})).json();assert.equal(model.theme,'minimal');assert.equal(model.blocks.some(b=>b.id==='gallery'),false);
 response=await save({tagline:'Keep showing up.'});assert.equal(response.status,200,'Other settings retain the original save flow');assert.equal(current().frontendTheme,'minimal');
 response=await postSettings({request:request('/api/admin/settings',{body:{frontendTheme:'dropbeat',confirmation:'confirm'}}),env:fixture.env});assert.equal(response.status,401);
 assert.equal(fixture.sql.prepare('SELECT value FROM settings WHERE key=?').get('unrelated_business_record').value,'{"order_id":"fixture-order","student_id":42,"amount_paise":19900}');
 console.log('Layout/theme validation passed: reproduced V1.06 router re-entry RangeError, guarded V1.07 singleton, inherited Admin function byte checks, bounded cycle/depth/size checks, shared-reference tree copies, prototype protection, four footer-free theme schemas, viewport isolation, exact theme confirmation, stale-theme rejection, transient confirmation fields and preserved business data/colours.');
}finally{fixture.close();}
