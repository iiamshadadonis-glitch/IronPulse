/* Real local UI, original controls/handlers, synthetic APIs only. */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,context,origin,output,writes,errors}){
 const phase=x=>console.log('V1.48 controls: '+x);
 const settle=async()=>{await page.evaluate(()=>window.DropBeatMobileUI.refresh());await page.waitForTimeout(220);};
 const go=async name=>{await page.evaluate(name=>window.tab(name),name);await page.waitForTimeout(550);await settle();};
 const brand=async name=>{await page.evaluate(name=>window.ucV1654BrandTab(name),name);await page.waitForTimeout(450);await settle();};
 const closeSheet=async()=>{await page.locator('#db137ChoiceSheet .db137-sheet-close').click();await settle();};
 const closeModal=async modal=>{const proxy=modal.locator('[data-db139-action=close]:visible');if(await proxy.count())await proxy.first().click();else await modal.getByRole('button',{name:'Close',exact:true}).first().click();await settle();};
 const styles=async locator=>locator.evaluate(n=>{const s=getComputedStyle(n),b=n.getBoundingClientRect();return {appearance:s.appearance,radius:s.borderRadius,width:b.width,height:b.height,bg:s.backgroundColor,image:s.backgroundImage,color:s.color};});
 const circle=async input=>{const s=await styles(input);assert.equal(s.appearance,'none');assert.equal(s.radius,'50%');assert.equal(s.width,22);assert.equal(s.height,22);};
 const noOverflow=async locator=>assert.equal(await locator.evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'No horizontal overflow');
 await page.waitForFunction(()=>window.DropBeatMobileUI?.build==='dropbeat-1.48-20261017');
 let available=98;const storageCalls=[];
 await context.route('**/api/admin/storage*',async route=>{
  const u=new URL(route.request().url());storageCalls.push(route.request().method());const categories=[{key:'expired_offers',label:'Expired / Inactive Offers',description:'Expired eligible offers.',warning:'Review before deleting.',count:2,approx_bytes:180},{key:'expired_sessions',label:'Expired Admin Sessions',description:'Expired administrator sessions.',warning:'Deletion is permanent.',count:2,approx_bytes:280}];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.searchParams.get('mode')==='detail'?{ok:true,title:'Expired record details',details:[['Record ID','fixture-1'],['Name','Eligible record'],['Status','expired']]}:{ok:true,allocated_label:'500 MB',used_label:'10 MB',remaining_label:'490 MB',remaining_percent:available,used_percent:100-available,categories,category:u.searchParams.get('category'),key_field:'id',rows:[{id:1,title:'First eligible record',detail:'Expired eligible record',date_value:'2026-09-01',approx_label:'100 B'},{id:2,title:'Second eligible record',detail:'Another eligible record',date_value:'2026-09-02',approx_label:'80 B'}]})});
 });
 phase('Storage status colors, theme surfaces and original selection/delete confirmation');
 await brand('storage');
 const battery=page.locator('#ucStorageBattery');
 const good=await styles(battery);assert.notEqual(good.bg,'rgb(255, 255, 255)');assert.equal(await battery.evaluate(n=>n.classList.contains('good')),true);
 await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await settle();
 const stats=page.locator('#storage .uc-storage-category-meta>span,#storage .uc-storage-summary>div');
 assert.ok(await stats.count()>=7);assert.ok(await stats.evaluateAll(ns=>ns.every(n=>getComputedStyle(n).backgroundColor!=='rgb(255, 255, 255)'&&getComputedStyle(n).color!=='rgb(0, 0, 0)')));
 await page.screenshot({path:join(output,'storage-dark.png')});
 const statusColors=[];
 for(const value of [98,35,10]){available=value;await page.evaluate(()=>window.loadUCStorage());await settle();statusColors.push((await styles(battery)).bg);}
 assert.equal(new Set(statusColors).size,3,'Existing good/warn/danger classes remain visible');available=98;await page.evaluate(()=>window.loadUCStorage());await settle();
 await page.evaluate(()=>document.documentElement.dataset.colorMode='light');await settle();
 for(const key of ['expired_offers','expired_sessions']){
  await page.locator('[data-storage-card="'+key+'"]').getByRole('button',{name:'Review',exact:true}).click();await page.waitForTimeout(250);await settle();
  const modal=page.locator('#ucStorageCleanupModal'),rows=modal.locator('.uc-storage-list-row'),first=rows.first().locator('[data-storage-id]'),all=modal.locator('.uc-storage-cleanup-toolbar input');
  assert.equal(await rows.count(),2);await circle(first);await circle(all);
  const g=await modal.evaluate(n=>{const c=n.querySelector('.modal-card'),h=n.querySelector('.uc-sub-modal-head'),w=n.querySelector('#ucStorageCleanupWarning'),a=h.querySelector('.db138-header-icons');return {padding:getComputedStyle(c).padding,direction:getComputedStyle(h).flexDirection,title:h.querySelector('h2').getBoundingClientRect().toJSON(),description:h.querySelector('p').getBoundingClientRect().toJSON(),h:h.getBoundingClientRect().toJSON(),a:a.getBoundingClientRect().toJSON(),w:w.getBoundingClientRect().toJSON()};});assert.equal(g.padding,'16px');assert.equal(g.direction,'row');assert.ok(g.description.y>=g.title.bottom+4,JSON.stringify(g));assert.ok(g.a.y<g.h.y+5&&g.a.right>350,JSON.stringify(g));assert.ok(g.w.y-g.h.bottom>=15,JSON.stringify(g));
  await rows.first().locator('div').last().click();assert.equal(await first.isChecked(),true,'Card text toggles original checkbox');assert.equal(await all.evaluate(n=>n.indeterminate),true);
  const filled=await styles(first);assert.notEqual(filled.image,'none');assert.notEqual(filled.bg,'rgb(255, 255, 255)');
  await all.check();assert.equal(await modal.locator('[data-storage-id]:checked').count(),2);await all.uncheck();assert.equal(await modal.locator('[data-storage-id]:checked').count(),0);
  await rows.first().focus();await page.keyboard.press('Space');assert.equal(await first.isChecked(),true,'Card keyboard activation toggles once');
  const fab=modal.locator('.db146-storage-delete-fab'),b=await fab.boundingBox();assert.equal(b.width,52);assert.ok(390-b.x-b.width>=24&&844-b.y-b.height>=24,JSON.stringify(b));
  const light=(await styles(fab)).bg;await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await settle();assert.notEqual((await styles(fab)).bg,light);await page.evaluate(()=>document.documentElement.dataset.colorMode='light');
  await fab.click();await settle();await page.locator('#db137ChoiceSheet').getByRole('button',{name:'Delete Selected',exact:true}).click();await settle();const guard=page.locator('#ucStorageConfirmModal');assert.equal(await guard.isVisible(),true);await guard.getByRole('button',{name:'Cancel',exact:true}).click();await settle();
  const selected=await first.isChecked();await rows.first().locator('.uc-storage-item-link').click();await settle();const detail=page.locator('#ucStorageItemDetailModal');assert.equal(await detail.isVisible(),true);assert.equal(await first.isChecked(),selected,'Detail button does not toggle selection');await closeModal(detail);
  await page.screenshot({path:join(output,key+'-selection.png')});await closeModal(modal);
 }
 assert.ok(storageCalls.every(method=>method==='GET'),'Cancelled confirmations never delete data');
 phase('Manage Current Class uses circular labeled checkbox and shared downward selectors');
 await go('studioSchedule');await page.locator('[data-schedule-tab=running]').click();await settle();await page.locator('.db143-mobile-action button').filter({hasText:'Manage Class'}).first().click();await settle();
 const manage=page.locator('#db122ClassChange'),form=manage.locator('form');await form.locator('[name=changeType]').selectOption('schedule',{force:true});await settle();await form.locator('[data-db137-next]').click();await settle();
 const move=form.locator('input[type=checkbox]').filter({visible:true}).first();await circle(move);const target=move.locator('xpath=ancestor::*[contains(@class,"db148-checkbox-target")][1]');assert.ok((await target.boundingBox()).height>=48);const old=await move.isChecked();await target.click();assert.equal(await move.isChecked(),!old);
 const trigger=form.locator('.db137-temporal-trigger').first();assert.equal(await trigger.evaluate(n=>getComputedStyle(n,':after').width),'20px');assert.ok(await trigger.evaluate(n=>getComputedStyle(n,':after').maskImage.includes('rotate')));assert.equal(await form.locator('select').first().evaluate(n=>getComputedStyle(n).appearance),'none');
 await page.screenshot({path:join(output,'manage-class-controls.png')});await closeModal(manage);
 phase('Bulk CSV uses the shared native upload and original FileList/import handler');
 await go('bulk');await page.evaluate(()=>window.__v148BulkInput=document.querySelector('#bulkFile'));
 const bf=page.locator('#bulkFile');const f=bf.locator('xpath=ancestor::form[1]');
 await f.evaluate(form=>[...document.querySelectorAll('.db138-open-form')].find(n=>n.__form===form)?.click());await settle();
 assert.equal(await f.isVisible(),true);assert.equal(await bf.evaluate(n=>n===window.__v148BulkInput),true);const upload=bf.locator('..');assert.ok((await upload.getAttribute('class')).includes('db-native-upload'));assert.equal(await upload.locator('strong').innerText(),'Upload CSV File');
 await bf.setInputFiles({name:'mobile-plans.csv',mimeType:'text/csv',buffer:Buffer.from('name,sku,regular_price\nMobile Plan,MOBILE-CSV,199\n')});assert.ok((await upload.innerText()).includes('mobile-plans.csv'));await f.locator('[data-db137-next]').click();await settle();assert.ok((await f.locator('.db138-review').innerText()).includes('mobile-plans.csv'));await f.locator('[data-db137-finish]:visible').click();await page.waitForTimeout(350);assert.ok(writes.some(w=>w.path==='/api/admin/import-products'&&w.body.includes('MOBILE-CSV')));await f.locator(':scope>.db138-page-header [aria-label^=Close]').click();await settle();
 phase('Payments clean key/value rows, uniform controls, original click binding');
 await page.evaluate(()=>window.openClientDetails('lead:1'));await page.waitForTimeout(350);await settle();await page.evaluate(()=>window.ucClientTab('payments',document.querySelector('[onclick^="ucClientTab(\'payments\'"]')));await settle();
 const payments=page.locator('#ucTabPayments');const kv=payments.locator('.uc-sub-grid>div');assert.ok(await kv.count()>=6);assert.ok(await kv.evaluateAll(ns=>ns.every(n=>{const s=getComputedStyle(n);return s.display==='grid'&&s.borderRadius==='0px'&&s.borderTopWidth==='0px'&&s.borderBottomWidth==='1px';})));
 const actions=payments.locator('.db148-payment-action:visible');assert.ok(await actions.count()>=4);assert.ok(await actions.evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect();return b.width===40&&b.height===40;})));await noOverflow(payments);
 const resume=payments.locator('.uc-subscription-card .uc-v11-sub-icon.play').first();const originalAction=await resume.getAttribute('onclick');await page.evaluate(()=>{window.__v148SourceAction=window.ucV11SubscriptionControl;window.ucV11SubscriptionControl=(...args)=>window.__v148ClickedAction=args.slice(1);});await resume.click();assert.equal((await page.evaluate(()=>window.__v148ClickedAction)).at(-1),'resume');assert.equal(await resume.getAttribute('onclick'),originalAction);await page.evaluate(()=>{window.ucV11SubscriptionControl=window.__v148SourceAction;delete window.__v148SourceAction;});
 await page.screenshot({path:join(output,'client-payments.png')});await closeModal(page.locator('#ucClientModal'));
 phase('Growth controls share aligned parent in all modes at 320/390/430px');
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await go('growthAnalytics');for(const mode of ['business','visitors','leads','coaches']){
  await page.locator('[data-uc88-mode="'+mode+'"]').click();await settle();const parent=page.locator('#growthAnalytics .db141-chart-controls');
  const box=await parent.evaluate(n=>{const p=n.getBoundingClientRect(),a=n.querySelector('.db141-time-segments').getBoundingClientRect(),b=n.querySelector('.db141-view-segments').getBoundingClientRect();return {p:p.toJSON(),a:a.toJSON(),b:b.toJSON()};});assert.ok(Math.abs(box.p.x-box.a.x)<1&&Math.abs(box.p.right-box.b.right)<1,JSON.stringify(box));assert.ok(box.a.right+4<=box.b.x,JSON.stringify(box));
  assert.ok(await parent.locator('.db141-view-segments button').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('svg').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1&&Math.abs(a.y+a.height/2-b.y-b.height/2)<1;})));await noOverflow(parent);
 }}await page.screenshot({path:join(output,'growth-controls.png')});
 phase('Calendar disclosure equals global component, refresh arc has a distinct open gap');
 await page.setViewportSize({width:390,height:844});await go('businessCalendar');await page.locator('[data-uc88-view=list]').click();await settle();const date=page.locator('.uc88-list-row').first(),chevron=date.locator('[data-db-disclosure]');assert.equal(await chevron.count(),1);assert.equal(await chevron.locator('path').getAttribute('d'),'m9 5 7 7-7 7');const c=await styles(chevron);assert.equal(c.width,20);assert.equal(c.height,20);assert.equal(await chevron.evaluate(n=>getComputedStyle(n).strokeWidth),'1.8px');await noOverflow(date);
 const refreshes=page.locator('svg[data-db-refresh="open-loop"]:visible');assert.ok(await refreshes.count()>0);assert.ok(await refreshes.evaluateAll(ns=>ns.every(n=>n.querySelector('path').getAttribute('d').startsWith('M21 12a9 9'))));await page.screenshot({path:join(output,'calendar-disclosure.png')});
 phase('All portals share controls, semantic text hit targets and desktop CSS separation');
 for(const role of ['student','coach']){
  await page.goto(origin+'/'+role+'-dashboard.html',{waitUntil:'load'});await page.waitForFunction(()=>window.DropBeatUI?.version==='1.48');
  await page.evaluate(()=>{const host=document.querySelector('.portal-view:not([hidden])')||document.querySelector('.portal-app');const area=document.createElement('div');area.id='v148ComponentFixture';area.innerHTML='<label><input type="checkbox" name="testCheck"> Mobile consent</label><div><input type="file" accept=".csv" name="csvFile"></div>';host.appendChild(area);window.__v148OriginalFile=area.querySelector('[type=file]');window.__v148Changes=0;area.querySelector('[type=checkbox]').onchange=()=>window.__v148Changes++;window.DropBeatUI.controls(area);});
  const fixture=page.locator('#v148ComponentFixture'),input=fixture.locator('[type=checkbox]');await circle(input);await fixture.locator('label').first().click();assert.equal(await input.isChecked(),true);assert.equal(await page.evaluate(()=>window.__v148Changes),1);assert.equal(await fixture.locator('.db-native-upload').count(),1);
  await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(300);assert.equal(await fixture.locator('.db-native-upload').count(),0);assert.equal(await fixture.locator('[type=file]').evaluate(n=>n===window.__v148OriginalFile),true);assert.notEqual((await styles(input)).appearance,'none');await page.setViewportSize({width:390,height:844});
 }
 assert.deepEqual(errors,[]);await writeFile(join(output,'controls-results.json'),JSON.stringify({result:'passed',widths:[320,390,430,1366],checks:['circular controls','card and text tap targets','keyboard selection','native Select all and indeterminate','storage themes and status colors','padded cleanup header','24px FAB offsets','original CSV input/import binding','clean payment key/value rows','uniform payment actions','all Growth modes','global calendar disclosure','open refresh arc','all portals','desktop restoration'],writes,errors},null,2));console.log('V1.48 shared controls and layout regressions passed.');
}
