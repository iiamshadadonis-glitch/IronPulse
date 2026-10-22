import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import {digest} from '../tools/gym-contract-helpers.mjs';
import {onRequestPost as postSettings} from '../functions/api/admin/settings.js';
import {database,request} from './fixtures-v158.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),folder='verification/ironpulse-v1.09/';
const audit=JSON.parse(read(folder+'selective-rollback-fixes.json')),baseline=JSON.parse(read(folder+'v106-input-files.json')),contracts=JSON.parse(read(folder+'v106-selective-function-contracts.json'));
for(const path of audit.restoredFiles)assert.equal(digest(read(path)),baseline.files[path],path);
for(const row of audit.retainedBulkFiles)assert.equal(digest(read(row.path)),row.sha256,row.path);
let protectedFunctions=0;
for(const[path,contract]of Object.entries(contracts.files)){
 const source=read(path),functions={},ast=parse(source,{sourceType:'unambiguous'});
 function walk(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration')functions[node.id.name]=digest(source.slice(node.start,node.end));for(const[key,value]of Object.entries(node)){if(['loc','extra','comments'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
 walk(ast);for(const[name,expected]of Object.entries(contract.functions)){assert.ok(functions[name],path+': '+name);if(!contracts.allowedChanges[path].includes(name)){assert.equal(functions[name],expected,path+': '+name);protectedFunctions++;}}
}
const admin=read('public/admin/admin.js'),restoredAdmin=admin.replace("body:JSON.stringify({...A.settings,...(e.themeConfirmation?{confirmation:e.themeConfirmation,expectedTheme:e.expectedTheme}:{})})","body:JSON.stringify(A.settings)");
assert.equal(digest(restoredAdmin),baseline.files['public/admin/admin.js'],'Restore the exact V1.06 save order, including its immediate local settings assignment');
const appearance=read('public/admin/gym-admin-v1-29.js');assert.doesNotMatch(appearance,/dropbeat:theme-preview|DropBeatLayout\?\.themes/,'No new Layout/Banners coupling');
assert.equal(digest(read('public/assets/gym-layout-admin-v1-57.js')),baseline.files['public/assets/gym-layout-admin-v1-57.js'],'Keep the existing V1.06 typed Layout save confirmation without the V1.07 editor rewrite');
const fixture=database(),env={...fixture.env,ADMIN_DEVELOPMENT_BYPASS:'true'};
const put=(key,value)=>fixture.sql.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
put('site_settings',{siteName:'IronPulse Gym',frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8'});put('unrelated_business_record',{order_id:'fixture-order',student_id:42,amount_paise:19900});
const save=body=>postSettings({request:request('/api/admin/settings',{body}),env}),current=()=>JSON.parse(fixture.sql.prepare('SELECT value FROM settings WHERE key=?').get('site_settings').value);
try{
 for(const confirmation of [undefined,'Confirm','confirm ','yes']){const r=await save({frontendTheme:'minimal',confirmation,expectedTheme:'dropbeat'});assert.equal(r.status,400);assert.equal(current().frontendTheme,'dropbeat');}
 let response=await save({frontendTheme:'minimal',confirmation:'confirm',expectedTheme:'casting'});assert.equal(response.status,409);assert.equal(current().frontendTheme,'dropbeat');
 response=await save({frontendTheme:'minimal',confirmation:'confirm',expectedTheme:'dropbeat'});assert.equal(response.status,200);let settings=(await response.json()).settings;assert.equal(settings.frontendTheme,'minimal');assert.equal(settings.confirmation,undefined);assert.equal(settings.expectedTheme,undefined);assert.equal(settings.primaryColor,'#4B55BE');
 response=await save({primaryColor:'#693AB8',accentColor:'#E08A30'});assert.equal(response.status,200,'A colour-only save uses the V1.06 flow without theme confirmation');assert.equal(current().frontendTheme,'minimal');assert.equal(current().primaryColor,'#693AB8');
 response=await postSettings({request:request('/api/admin/settings',{body:{frontendTheme:'dropbeat',confirmation:'confirm'}}),env:fixture.env});assert.equal(response.status,401);
 assert.equal(fixture.sql.prepare('SELECT value FROM settings WHERE key=?').get('unrelated_business_record').value,'{"order_id":"fixture-order","student_id":42,"amount_paise":19900}');
 console.log('Selective rollback passed: exact V1.06 engine/editor/delivery restorations, exact V1.08 Bulk Import scripts, '+protectedFunctions+' protected original functions, original settings-save order, exact theme confirmation, stale-confirmation rejection, transient fields, colour-only saves and business data preservation.');
}finally{fixture.close();}
