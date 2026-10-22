import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {layoutPayload} from '../functions/_lib/layout.js';
import {bulkFixture} from './gym-bulk-fixture.mjs';

export async function runBulkImportWorkflows({page,context,origin,output,errors}){
 const db=await bulkFixture(),results=[],posts=[],observations=[],sample=await readFile(new URL('../public/sample-plan-import.csv',import.meta.url),'utf8');
 const config=layoutPayload({document:{},buttons:{},navigation:{},theme:'dropbeat',contextRevision:'bulk-test-context',updatedAt:'2026-10-22T08:00:00.000Z'},{admin:true});
 let mode='success',gate,release;
 const fixture=async route=>{
  const incoming=route.request(),path=new URL(incoming.url()).pathname;
  const reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(path==='/api/portal/auth/context')return reply({ok:true,authenticated:true,key:'admin:1',role:'admin',status:'active',home:'/admin/',expires:'2027-01-01T00:00:00Z'});
  if(path==='/api/public/layout'||path==='/api/admin/layout')return reply(config);
  if(path==='/api/public/button-dictionary'||path==='/api/admin/button-dictionary')return reply(config.buttonDictionary);
  if(path!=='/api/admin/import-products')return route.fallback();
  const payload=JSON.parse(incoming.postData());posts.push(payload);const currentMode=mode;if(currentMode==='pending')await gate;if(currentMode==='error')return reply({error:'Synthetic import outage. Try again.'},503);
  const response=await db.importPlans(new Request(incoming.url(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}));
  return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 };
 await context.route('**/api/**',fixture);
 const file=(name='plans.csv',text=sample,mimeType='text/csv')=>({name,mimeType,buffer:Buffer.from(text)});
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready'&&!document.querySelector('#adminApp').hidden);
 const pane=()=>page.locator('#bulk'),input=()=>page.locator('#bulkFile'),box=()=>page.locator('#bulk .db-native-upload');
 const capture=()=>page.evaluate(()=>{const form=document.querySelector('#db140BulkPlanForm'),input=document.querySelector('#bulkFile'),zone=input.closest('.db-native-upload');return {inputs:document.querySelectorAll('#bulkFile').length,zones:form.querySelectorAll('.db-native-upload').length,files:[...input.files].map(f=>f.name),caption:zone.querySelector(':scope>span,:scope>small')?.textContent,primary:getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-primary').trim(),highlight:zone.classList.contains('db149-drag-over')};});
 const drop=async(items,event='drop')=>page.evaluate(({items,event})=>{const transfer=new DataTransfer();for(const item of items)transfer.items.add(new File([item.text||''],item.name,{type:item.type||''}));const zone=document.querySelector('#bulk .db-native-upload');zone.dispatchEvent(new DragEvent(event,{bubbles:true,cancelable:true,dataTransfer:transfer}));const caption=zone.querySelector(':scope>span,:scope>small');return {caption:caption?.textContent,role:caption?.getAttribute('role')};},{items,event});
 const submit=()=>page.locator('#db140BulkPlanForm button[type="submit"]').click();
 const waitIdle=()=>page.waitForFunction(()=>!document.querySelector('#db140BulkPlanForm button[type="submit"]').disabled);
 const waitResult=text=>page.waitForFunction(text=>document.querySelector('#bulkResult')?.textContent.includes(text),text);
 try{
  await page.evaluate(()=>sessionStorage.clear());await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(6200);
  console.log('[Bulk Import] Sales routing, validation and sample CSV');
  await page.evaluate(()=>window.tab('salesHub'));await page.locator('#salesHub [data-uc84-sales="bulk"]').click();await input().waitFor({state:'attached'});
  const initial=await capture();assert.equal(initial.inputs,1);assert.equal(initial.zones,1);
  await submit();assert.equal(posts.length,0,'An empty required input never submits');assert.equal(await input().evaluate(n=>n.validity.valueMissing),true);
  for(let i=0;i<4;i++){await page.locator('#salesHub [data-uc84-sales="products"]').click();await page.locator('#salesHub [data-uc84-sales="bulk"]').click();}
  const routed=await page.evaluate(()=>{let calls=0;const old=window.load_bulk;window.load_bulk=()=>{calls++;window.tab('bulk');};try{window.tab('bulk');}finally{window.load_bulk=old;}return calls;});assert.equal(routed,1);
  const sampleLink=pane().getByRole('link',{name:'Download Sample CSV',exact:true});assert.notEqual(await sampleLink.getAttribute('download'),null);const sampleResponse=await page.evaluate(async href=>{const response=await fetch(href);return {status:response.status,text:await response.text()};},await sampleLink.getAttribute('href'));assert.deepEqual(sampleResponse,{status:200,text:sample});
  results.push('Sales/Bulk Import navigation, same-pane loader re-entry, empty-file validation and exact served sample CSV preserve one input/zone');

  console.log('[Bulk Import] native picker and idempotent upload rendering');
  const [picker]=await Promise.all([page.waitForEvent('filechooser'),box().click()]);await picker.setFiles(file());assert.deepEqual((await capture()).files,['plans.csv']);assert.equal(posts.length,0);
  const rendered=await page.evaluate(()=>{const input=document.querySelector('#bulkFile'),before=input.closest('.db-native-upload');let reads=0;const options={get label(){reads++;DropBeatUI.nativeUpload(input,options);return 'Upload CSV File';}};for(let i=0;i<100;i++)DropBeatUI.nativeUpload(input);DropBeatUI.nativeUpload(input,options);return {reads,same:before===input.closest('.db-native-upload'),zones:document.querySelectorAll('#bulk .db-native-upload').length};});assert.equal(rendered.same,true);assert.equal(rendered.zones,1);assert.ok(rendered.reads<10);assert.match((await capture()).caption,/plans.csv/);
  results.push('Native file picker retains the original FileList and filename; 100 repeated renders and recursive label callbacks stay bounded');

  console.log('[Bulk Import] drag boundary updates');
  const boundary=await page.evaluate(()=>{
   const zone=document.querySelector('#bulk .db-native-upload'),child=zone.querySelector('strong'),body=document.body,transfer=new DataTransfer();transfer.items.add(new File(['sku,name\nX,Example'],'drag.csv',{type:'text/csv'}));const observer=new MutationObserver(()=>{});observer.observe(zone,{attributes:true,attributeFilter:['class']});
   const fire=(node,type,relatedTarget=null)=>node.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:transfer,relatedTarget}));
   fire(zone,'dragenter');for(let i=0;i<200;i++)fire(zone,'dragover');fire(child,'dragenter',zone);fire(child,'dragleave',zone);const inside=zone.classList.contains('db149-drag-over');fire(zone,'dragleave',body);const outside=zone.classList.contains('db149-drag-over');const mutations=observer.takeRecords().length;observer.disconnect();fire(zone,'dragenter');fire(zone,'dragend');return {inside,outside,mutations,ended:zone.classList.contains('db149-drag-over')};
  });assert.deepEqual(boundary,{inside:true,outside:false,mutations:2,ended:false});assert.equal(posts.length,0);observations.push(boundary);
  results.push('200 dragover events cause only entry/exit class changes; child transitions and dragend clear highlighting without importing');

  console.log('[Bulk Import] drop validation and callback re-entry');
  // Capture the synchronous rejection before the inherited control refresh
  // restores the existing selected filename on its next animation frame.
  const beforeBad=(await capture()).files,rejected=await drop([{name:'wrong.exe',text:'not csv',type:'application/octet-stream'}]);assert.match(rejected.caption,/Choose a supported file/);assert.equal(rejected.role,'alert');assert.deepEqual((await capture()).files,beforeBad);
  await input().evaluate(n=>n.disabled=true);await drop([{name:'disabled.csv',text:sample,type:'text/csv'}]);assert.deepEqual((await capture()).files,beforeBad);await input().evaluate(n=>n.disabled=false);
  const reentry=await page.evaluate(sample=>{
   const zone=document.querySelector('#bulk .db-native-upload'),input=document.querySelector('#bulkFile'),transfer=new DataTransfer();transfer.items.add(new File([sample],'dropped.csv',{type:'text/csv'}));transfer.items.add(new File([sample],'extra.csv',{type:'text/csv'}));let changes=0,inputs=0;
   const replay=()=>{changes++;zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));},count=()=>inputs++;
   input.addEventListener('change',replay);input.addEventListener('input',count);try{zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));}finally{input.removeEventListener('change',replay);input.removeEventListener('input',count);}
   return {changes,inputs,files:[...input.files].map(f=>f.name),highlight:zone.classList.contains('db149-drag-over')};
  },sample);assert.deepEqual(reentry,{changes:1,inputs:1,files:['dropped.csv'],highlight:false});assert.equal(posts.length,0);observations.push(reentry);
  results.push('Unsupported/disabled drops preserve the selection; valid single-file drops dispatch one change/input even when a change callback re-enters drop');

  console.log('[Bulk Import] real importer creates and updates rows');
  await submit();await waitResult('Created: 2');assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM products').get().n,2);assert.equal(posts.length,1);assert.ok(posts[0].rows.every(row=>Object.values(row).every(value=>typeof value==='string')));
  await input().setInputFiles(file('update.csv'));await submit();await waitResult('Updated: 2');assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM products').get().n,2);assert.equal(posts.length,2);
  const beforeInvalid=posts.length;
  for(const text of ['sku,sku\nA,B','sku,name\nA,"unfinished','sku,name\n'+Array.from({length:51},(_,i)=>'LIMIT-'+i+',Plan').join('\n')]){await input().setInputFiles(file('invalid.csv',text));await submit();await page.locator('#bulkResult .error').waitFor();assert.equal(posts.length,beforeInvalid);}
  await input().setInputFiles(file('invalid-row.csv','sku,name,regular_price\nBAD-ROW,Invalid price,banana'));await submit();await waitResult('Errors: 1');assert.match(await page.locator('#bulkResult').innerText(),/Row 2/);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM products').get().n,2);
  results.push('Real API/SQLite import creates two plans, updates matching SKUs, preserves string-only JSON and row errors, and rejects malformed/over-limit CSV before requests');

  console.log('[Bulk Import] failed requests, retry and duplicate guard');
  await input().setInputFiles(file('retry.csv'));mode='error';await submit();await waitResult('Synthetic import outage');assert.equal(await page.locator('#db140BulkPlanForm button[type="submit"]').isDisabled(),false);mode='success';await submit();await waitResult('Updated: 2');
  await waitIdle();mode='pending';gate=new Promise(resolve=>release=resolve);const countBefore=posts.length;await page.evaluate(()=>{window.__bulkPendingResult=Promise.all([window.bulkImport(),window.bulkImport()]);});await page.waitForFunction(()=>document.querySelector('#bulkResult')?.textContent.includes('Importing'));assert.equal(posts.length,countBefore+1);release();await page.evaluate(()=>window.__bulkPendingResult);mode='success';await waitResult('Updated: 2');
  results.push('HTTP failure shows retryable feedback; successful retry and concurrent calls keep the existing one-request import guard');

  console.log('[Bulk Import] mobile wizard and viewport transitions');
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(6200);await page.evaluate(()=>window.tab('bulk'));await pane().locator('.db138-open-form').click();
  const next=page.locator('#db140BulkPlanForm [data-db137-next]');const beforeMobile=posts.length;await next.click();assert.equal(posts.length,beforeMobile);assert.equal(await input().evaluate(n=>n.validity.valueMissing),true);
  const [mobilePicker]=await Promise.all([page.waitForEvent('filechooser'),box().click()]);await mobilePicker.setFiles(file('mobile.csv'));await next.click();await page.locator('#db140BulkPlanForm [data-db137-finish]').click();await waitResult('Updated: 2');
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM products').get().n,2);
  for(const width of [1440,390,1440]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(300);}
  const final=await capture();assert.equal(final.inputs,1);assert.equal(final.zones,1);assert.equal(final.primary,initial.primary);assert.deepEqual(final.files,['mobile.csv']);assert.deepEqual(errors,[]);
  await page.screenshot({path:join(output,'bulk-import-desktop.png'),fullPage:true});
  results.push('Mobile native picker/review/import, required validation and repeated viewport changes preserve the FileList, single upload control and active colours');
  await writeFile(join(output,'bulk-import-results.json'),JSON.stringify({pass:true,realWorker:origin.startsWith('https:'),actualImportHandlerAndSqlite:true,results,observations,importRequests:posts.length,plans:db.sql.prepare('SELECT COUNT(*) n FROM products').get().n,errors},null,2)+'\n');console.log('Bulk Import browser workflows passed: '+results.length+' groups.');
 }finally{release?.();await context.unroute('**/api/**',fixture);db.close();}
}
