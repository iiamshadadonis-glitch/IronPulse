export async function runWorkflows({page,writes}){
 await page.waitForFunction(()=>window.DropBeatUI?.version==='1.49');
 await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(350);await page.evaluate(()=>window.tab('bulk'));await page.waitForTimeout(350);
 await page.evaluate(()=>{window.__debug=[];const old=window.bulkImport;window.bulkImport=function(){window.__debug.push({action:'bulk called',disabled:document.querySelector('#db140BulkPlanForm button').disabled,files:document.querySelector('#bulkFile').files.length});return old.apply(this,arguments);};});
 await page.locator('#bulkFile').evaluate(input=>{const dt=new DataTransfer();dt.items.add(new File(['name,sku,regular_price\nDesktop Plan,DESKTOP-149,199\n'],'plans.csv',{type:'text/csv'}));input.closest('.db-native-upload').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));});
 await page.locator('#bulk').getByRole('button',{name:'Import Plans',exact:true}).click();await page.waitForTimeout(4000);
 console.log(JSON.stringify({debug:await page.evaluate(()=>window.__debug),result:await page.locator('#bulkResult').innerText(),writes}));
}