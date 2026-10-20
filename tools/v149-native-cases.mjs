import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,writes,errors,output}) {
 const phase=x=>console.log('V1.49 native: '+x);
 const settle=async()=>{await page.evaluate(()=>window.DropBeatMobileUI.refresh());await page.waitForTimeout(270);};
 const go=async name=>{await page.evaluate(name=>window.tab(name),name);await page.waitForTimeout(650);await settle();};
 const sheet=()=>page.locator('#db137ChoiceSheet');
 const closeSheet=async()=>{const done=page.locator('[data-db137-sheet-done]');if(await done.isVisible())await done.click();else await page.locator('.db137-sheet-close').click();await settle();};
 const closeForm=async f=>{await f.locator(':scope>.db138-page-header button[aria-label^="Close"]').click();await settle();};
 const openCard=async c=>{await c.locator(':scope>summary,:scope>.db144-integration-row').click();await settle();if(await sheet().isVisible()){await sheet().getByRole('button',{name:'Edit',exact:true}).click();await settle();}return c.locator('form').first();};
 const review=async f=>{const steps=await f.locator('.db137-wizard-step').count();for(let i=1;i<steps;i++){await f.locator('[data-db137-next]').click();await settle();}};
 await page.waitForFunction(()=>window.DropBeatMobileUI?.build==='dropbeat-1.49-20261018');
 phase('Integration categories and responsive More menu');
 await go('socialMediaIntegrations');await page.waitForTimeout(3000);
 await page.evaluate(()=>window.uc92OpenMarketingIntegration?.());await page.waitForTimeout(900);await settle();
 if(process.env.DROPBEAT_DIAGNOSE_V144){
  console.log('DIAG',JSON.stringify(await page.evaluate(()=>({tabs:[...document.querySelectorAll('[data-uc49-tab]')].map(n=>n.dataset.uc49Tab),forms:[...document.querySelectorAll('#socialMediaIntegrations form')].map(f=>({id:f.id,title:f.dataset.db144Title,marked:f.dataset.db144Integration,steps:[...f.querySelectorAll('.db137-wizard-step')].map(x=>x.textContent)}))}))));
  await writeFile(join(output,'diagnostic.html'),await page.content());await page.screenshot({path:join(output,'diagnostic.png'),fullPage:true});assert.equal(errors.length,0,errors.join('\n'));return;
 }
 const tabs=page.locator('#socialMediaIntegrations .uc49-tabs'),panel=page.locator('#socialMediaIntegrations');
 if(!process.env.DROPBEAT_V144_UI_ONLY){
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await settle();
  const more=tabs.locator('.db144-integration-more');assert.equal(await more.isVisible(),true);
  const b=await more.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width,JSON.stringify(b));
  const hidden=await tabs.locator('[data-uc49-tab].db144-tab-overflow').count();
  await more.click();assert.equal(await sheet().locator('.db137-choice-option').count(),hidden);await closeSheet();
 }
 await page.setViewportSize({width:390,height:844});await settle();
 const keys=await tabs.locator('[data-uc49-tab]').evaluateAll(ns=>ns.map(n=>n.dataset.uc49Tab));
 assert.ok(keys.includes('marketing')&&keys.includes('webinars'),JSON.stringify(keys));
 for(const key of keys){
  phase('Integration '+key);
  await tabs.locator('[data-uc49-tab="'+key+'"]').evaluate(n=>n.click());await page.waitForTimeout(500);await settle();
  const pane=panel.locator('[data-uc49-pane="'+key+'"]');
  assert.equal(await pane.isVisible(),true);assert.equal(await panel.locator(':scope>.top button:visible').count(),0);
  assert.deepEqual(await pane.locator('form:not([data-db144-integration])').evaluateAll(ns=>ns.map(n=>n.id||n.outerHTML.slice(0,100))),[],'unadapted form '+key);
  assert.deepEqual(await pane.locator('details:not(.db144-integration-card)').evaluateAll(ns=>ns.filter(n=>n.querySelector('input,select,textarea')&&!n.closest('form')).map(n=>n.id||n.querySelector('summary')?.textContent)),[],'unadapted integration controls '+key);
  const card=pane.locator('.db144-integration-card').first();assert.ok(await card.count(),'rows '+key);
  const form=await openCard(card);assert.equal(await form.isVisible(),true,'open '+key);
  const b=await form.boundingBox();assert.ok(b.x===0&&b.y===0&&b.width===390&&Math.abs(b.height-844)<2,JSON.stringify({key,b}));
  assert.ok(/Review/.test((await form.locator('.db137-wizard-step').allTextContents()).at(-1)));
  await form.locator('.db144-integration-help').click();assert.equal(await sheet().isVisible(),true);assert.ok((await sheet().innerText()).length>50);await closeSheet();
  if(key==='api'){await form.locator('#vendorUserId').fill('fixture-studio');await review(form);await form.locator('[data-db137-finish]').click();await page.waitForTimeout(450);assert.ok(writes.some(w=>w.path==='/api/admin/api-settings'&&w.body.includes('fixture-studio')),'original API save handler');}
  await closeForm(form);assert.equal(await form.isVisible(),false,'close '+key);
  if(key==='seo'){const blogger=pane.locator('#ucV152Blogger');if(await blogger.count()){const bf=await openCard(blogger);assert.equal(await bf.isVisible(),true);assert.ok((await bf.locator('.db137-wizard-step').last().innerText()).includes('Review'));await closeForm(bf);}}
  if(key==='email'){await page.evaluate(()=>window.ucV1707EditEmailProvider('ses'));await settle();const ef=pane.locator('[data-uc1706-provider="ses"] form');assert.equal(await ef.isVisible(),true,'connected provider Edit opens native form');await closeForm(ef);}
  if(key==='marketing'){await pane.locator('[data-db122-marketing-view="integrations"]').click();await settle();const providers=pane.locator('.db144-integration-card');assert.equal(await providers.count(),4);for(let i=0;i<4;i++){const pf=await openCard(providers.nth(i));assert.equal(await pf.isVisible(),true);assert.ok((await pf.locator('.db137-wizard-step').last().innerText()).includes('Review'));await closeForm(pf);}}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+key);
 }
 phase('Action menu and secret-safe review');
 await tabs.locator('[data-uc49-tab="social"]').evaluate(n=>n.click());await settle();
 const telegram=panel.locator('[data-social-card="telegram"]');await telegram.locator(':scope>summary').click();await settle();
 const actions=await sheet().locator('.db137-choice-option').allTextContents();console.log('Telegram actions',JSON.stringify(actions));assert.equal(actions[0],'Edit');assert.ok(actions.some(x=>/test/i.test(x)));assert.ok(actions.some(x=>/disconnect/i.test(x)));
 const connect=sheet().locator('.db137-choice-option').filter({hasText:/^Connect/});
 if(await connect.count()){const label=await connect.first().innerText();await connect.first().click();const f=telegram.locator('form');await review(f);assert.equal(await f.locator('[data-db137-finish]').innerText(),label);await closeForm(f);}else await closeSheet();
 await tabs.locator('[data-uc49-tab="payments"]').evaluate(n=>n.click());await settle();
 const rf=await openCard(panel.locator('[data-pay-detail="razorpay"]'));await rf.locator('[name="razorpayKeyId"]').fill('rzp_test_fixture');await rf.locator('input[type="password"]').first().fill('never-show-fixture-secret');await review(rf);const text=await rf.locator('.db138-review').innerText();assert.ok(!text.includes('never-show-fixture-secret'));assert.ok(/New value provided/.test(text),text);await rf.locator('[data-db137-finish]').click();await page.waitForTimeout(450);assert.ok(writes.some(w=>w.path==='/api/admin/integrations'&&w.body.includes('rzp_test_fixture')),'original payment settings save');await closeForm(rf);
 }
 phase('Teaching Days original checkboxes and gutters');
 await go('studioSchedule');const outer=await page.locator('#studioSchedule>[data-db119-content]').boundingBox();assert.ok(outer.x>=15&&outer.x+outer.width<=375,JSON.stringify(outer));
 await page.locator('[data-schedule-tab="running"]').click();await settle();await page.locator('.db143-mobile-action button').filter({hasText:'Manage Class'}).first().click();await settle();
 const manage=page.locator('#db122ClassChange'),mf=manage.locator('form');
 for(const mode of ['schedule','coach_and_schedule']){
  await mf.locator('select[name="changeType"]').selectOption(mode,{force:true});await settle();
 await mf.locator('[data-db137-next]').click();await settle();
  const row=mf.locator('.db144-days-trigger');await row.waitFor({state:'visible'});assert.equal(await mf.locator('.db122-day-grid').isVisible(),false);await page.screenshot({path:join(output,'v149-teaching-days.png')});
  await row.click();assert.equal(await sheet().locator('[role="checkbox"]').count(),7);await sheet().getByRole('checkbox',{name:'Wednesday',exact:true}).click();await closeSheet();
  assert.ok((await mf.evaluate(f=>new FormData(f).getAll('classDays'))).includes('wed'));assert.ok((await row.innerText()).includes('Wednesday'));
  await row.click();await sheet().getByRole('checkbox',{name:'Wednesday',exact:true}).click();await closeSheet();await mf.locator('.db137-wizard-step').first().click();await settle();
 }
 await manage.locator('[data-db139-action="close"]:visible').first().click();await settle();
 phase('Page actions, delete warning, direct FAQ');
 await go('pages');await page.locator('[data-page-workspace="existing"]').click();await settle();
 const editor=page.locator('#pages .page-editor').filter({has:page.locator('[data-page-field="page_key"][value="about"]')});
 await editor.locator(':scope>summary').click();assert.deepEqual(await sheet().locator('.db137-choice-option').allTextContents(),['Edit this Page','Delete this Page']);
 await sheet().getByRole('button',{name:'Delete this Page',exact:true}).click();await settle();
 const warning=page.locator('#ucV1634DeletePageModal');assert.equal(await warning.isVisible(),true);assert.ok(await warning.evaluate(n=>+getComputedStyle(n).zIndex>=65000));await warning.getByRole('button',{name:/Cancel/}).click();await settle();
 await editor.locator(':scope>summary').click();await sheet().getByRole('button',{name:'Edit this Page',exact:true}).click();await settle();await closeForm(editor.locator('form'));
 const faq=page.locator('#faqForm');await faq.locator('xpath=ancestor::details[1]').locator(':scope>summary').click();await settle();assert.equal(await sheet().isVisible(),false);assert.equal(await faq.isVisible(),true);assert.equal(await faq.locator('.db137-wizard-step').count(),2);assert.ok(await faq.locator('.db138-form-content').evaluate(n=>parseFloat(getComputedStyle(n).paddingLeft)>=16));await closeForm(faq);
 phase('Preview pills and compact editable menu ordering');
 await page.locator('[data-page-workspace="new"]').click();await settle();await page.waitForTimeout(800);await settle();
 assert.equal(await page.locator('.uc-v1634-preview-brand').isVisible(),false);assert.equal(await page.locator('.uc-v1634-header-preview').evaluate(n=>getComputedStyle(n).overflowX),'auto');
 const rows=page.locator('.uc-v1637-grid-row');assert.ok(await rows.count()>2);const sizes=await rows.evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));assert.ok(sizes.every(h=>h>=48&&h<=56),JSON.stringify(sizes));await page.screenshot({path:join(output,'v149-page-menu.png'),fullPage:true});
 const about=page.locator('[data-nav-key="about"] .uc-v1637-grid-row').first();await about.locator('.db144-menu-label').fill('About Studio');await about.locator('.db144-menu-label').dispatchEvent('change');await page.waitForTimeout(500);await settle();assert.ok(writes.some(w=>w.path==='/api/admin/navigation-order'&&w.body.includes('"action":"save_item"')&&w.body.includes('About Studio')));await about.locator('[data-top-move="1"]').click();await page.waitForTimeout(500);assert.ok(writes.some(w=>w.path==='/api/admin/navigation-order'&&w.body.includes('"action":"save_order"')));
 phase('Email grid, header actions and step insertion');
 await go('socialAutomations');await page.locator('[data-uc1705-channel]').click();await page.waitForTimeout(500);await settle();await page.locator('[data-uc1705-view="templates"]').click();await settle();
 const cards=page.locator('.uc1705-template-cards>article');const boxes=await cards.evaluateAll(ns=>ns.slice(0,2).map(n=>n.getBoundingClientRect().toJSON()));assert.equal(boxes[0].y,boxes[1].y);assert.ok(boxes.every(b=>b.width<190&&b.height<=196),JSON.stringify(boxes));
 await page.screenshot({path:join(output,'v149-email-templates.png'),fullPage:true});await cards.first().click();await settle();const email=page.locator('#uc1705Workspace');await email.locator('[data-uc1705-apply-inspector]').click();await settle();
 const actionboxes=await email.locator('.uc1705-workspace-actions>*').evaluateAll(ns=>ns.filter(n=>n.getClientRects().length).map(n=>({y:n.getBoundingClientRect().y,h:n.getBoundingClientRect().height})));assert.ok(Math.max(...actionboxes.map(x=>x.y))-Math.min(...actionboxes.map(x=>x.y))<15,JSON.stringify(actionboxes));
 const plus=email.locator('[data-uc1705-add-at]').first(),b=await plus.boundingBox();assert.ok(b.width>=44&&b.height>=44,JSON.stringify(b));assert.ok(await plus.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 await plus.click();assert.equal(await sheet().isVisible(),true);assert.equal(await page.locator('#uc1705Modal').count(),0);await sheet().getByRole('button',{name:/Time delay/i}).click();await settle();assert.equal(await email.locator('[data-uc1705-step]').count(),2);await email.locator('[data-uc1705-apply-inspector]').click();await settle();await email.locator('[data-uc1705-back]').click();await settle();
 phase('Desktop restoration and narrow mobile');
 await page.setViewportSize({width:1366,height:900});await go('pages');await page.locator('[data-page-workspace="new"]').click();await settle();assert.equal(await page.locator('.uc-v1634-preview-brand').isVisible(),true);assert.equal(await page.locator('.db144-menu-input-wrap').count(),0);assert.ok((await page.locator('.uc-v1637-row-actions').first().innerText()).includes('Edit'));
 await go('socialMediaIntegrations');assert.ok(await panel.locator(':scope>.top button:visible').count()>0);assert.equal(await tabs.locator('.db144-integration-more').count(),0);await tabs.locator('[data-uc49-tab="social"]').click();await settle();
 const tg=panel.locator('[data-social-card="telegram"]'),before=await tg.evaluate(n=>n.open);await tg.locator(':scope>summary').click();assert.notEqual(await tg.evaluate(n=>n.open),before);assert.equal(await sheet().isVisible(),false);
 for(const width of [320,430,390]){await page.setViewportSize({width,height:844});await go('studioSchedule');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 await writeFile(join(output,'native-browser-errors.json'),JSON.stringify(errors,null,2));assert.equal(errors.length,0,errors.join('\n'));await page.screenshot({path:join(output,'v149-schedule.png'),fullPage:true});console.log('V1.49 native mobile workflows passed.');
}

