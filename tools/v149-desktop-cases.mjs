import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,origin,output,writes,errors}){
 await page.waitForFunction(()=>window.DropBeatUI?.version==='1.49');
 await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(250);
 for(const role of ['admin','coach','student']){
  await page.goto(origin+(role==='admin'?'/admin/':'/'+role+'-dashboard.html'),{waitUntil:'load'});await page.waitForFunction(()=>window.DropBeatUI?.version==='1.49');
  await page.evaluate(()=>{
   const host=document.querySelector('#adminApp .panel.active,.portal-view:not([hidden]),.portal-app'),form=document.createElement('form');form.id='v149HiddenPicker';
   form.innerHTML='<button type="button" id="v149CustomUpload">Existing custom upload</button><input name="custom" type="file" accept="image/*" hidden><input name="visibleCsv" type="file" accept=".csv">';host.appendChild(form);
   window.__v149Hidden=form.elements.custom;window.__v149Visible=form.elements.visibleCsv;window.__v149HiddenChanges=0;form.elements.custom.onchange=()=>window.__v149HiddenChanges++;form.querySelector('button').onclick=()=>form.elements.custom.click();
  });await page.waitForTimeout(200);
  const fixture=page.locator('#v149HiddenPicker');assert.equal(await fixture.locator('.db149-desktop-upload').count(),1,'Only the visible legacy file field receives a drop zone');assert.equal(await fixture.locator('[name=custom]').evaluate(n=>n===window.__v149Hidden&&n.parentElement.id==='v149HiddenPicker'),true,'Hidden custom picker retains original identity and parent');assert.equal(await fixture.locator('[name=custom]').isVisible(),false);
  await fixture.evaluate(form=>{window.__v149PickerCalls=0;const input=form.elements.custom;input.__originalClick=input.click;input.click=()=>window.__v149PickerCalls++;form.querySelector('button').click();input.click=input.__originalClick;delete input.__originalClick;});assert.equal(await page.evaluate(()=>window.__v149PickerCalls),1,'Existing custom button still targets the original picker');
  await fixture.locator('[name=custom]').setInputFiles({name:'custom.png',mimeType:'image/png',buffer:Buffer.from('fixture')});assert.equal(await page.evaluate(()=>window.__v149HiddenChanges),1,'Original custom-button change handler stays live');
  await fixture.locator('[name=visibleCsv]').evaluate(input=>{const transfer=new DataTransfer();transfer.items.add(new File(['name,sku\nPlan,TEST\n'],'visible.csv',{type:'text/csv'}));input.closest('.db-native-upload').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});assert.equal(await fixture.locator('[name=visibleCsv]').evaluate(n=>n===window.__v149Visible&&n.files[0].name==='visible.csv'),true);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.evaluate(()=>window.DropBeatUI.controls(document.querySelector('#v149HiddenPicker')));await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(300);assert.equal(await fixture.locator('[name=custom]').isVisible(),false);assert.equal(await fixture.locator('.db149-desktop-upload').count(),1);assert.equal(await fixture.locator('[name=custom]').evaluate(n=>n===window.__v149Hidden),true);
  console.log('V1.49 desktop custom picker compatibility passed: '+role);
 }
 await page.goto(origin+'/admin/',{waitUntil:'load'});await page.waitForFunction(()=>window.DropBeatUI?.version==='1.49');await page.evaluate(()=>window.tab('bulk'));await page.waitForTimeout(350);
 const uploaded=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/admin/import-products'&&response.request().method()==='POST');await page.locator('#bulkFile').setInputFiles({name:'desktop-final.csv',mimeType:'text/csv',buffer:Buffer.from('name,sku,regular_price\nFinal Desktop Plan,DESKTOP-FINAL-149,199\n')});await page.locator('#bulk').getByRole('button',{name:'Import Plans',exact:true}).click();await uploaded;assert.ok(writes.some(w=>w.path==='/api/admin/import-products'&&w.body.includes('DESKTOP-FINAL-149')));
 assert.deepEqual(errors,[]);await writeFile(join(output,'desktop-results.json'),JSON.stringify({result:'passed',checks:['all three portals','existing custom hidden picker remains hidden','original input identity and parent','custom-button source target','original change handler and FileList','visible CSV drop zones','mobile/desktop restoration','original desktop Import Plans API binding'],writes,errors},null,2));
}
