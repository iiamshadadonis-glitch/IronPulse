/* V1.46 mobile regressions against shipped DOM. All API data is intercepted by the runner. */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,context,origin,output,writes,errors}){
 const phase=label=>console.log('V1.46 additions: '+label);
 const settle=async()=>{await page.evaluate(()=>window.DropBeatMobileUI.refresh());await page.waitForTimeout(220);};
 const go=async name=>{await page.evaluate(name=>window.tab(name),name);await page.waitForTimeout(550);await settle();};
 const closeForm=async form=>{await form.locator(':scope>.db138-page-header button[aria-label^="Close"]').click();await settle();};
 const png={name:'mobile-fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aizsAAAAASUVORK5CYII=','base64')};
 const header=async locator=>locator.evaluate(node=>{const r=node.getBoundingClientRect(),b=[...node.querySelectorAll('button')].filter(b=>b.getClientRects().length).at(-1)?.getBoundingClientRect();return{y:r.y,height:r.height,right:b?innerWidth-b.right:null};});
 await page.waitForFunction(()=>window.DropBeatMobileUI?.build==='dropbeat-1.46-20261016');
 if(!process.env.DROPBEAT_ADD_BUILDERS_ONLY){
 phase('Sales remains usable after closing the subscription wizard');
 await go('customSubscription');await page.evaluate(()=>window.DropBeatMobileUI.openPaymentPage?.());await settle();
 let payment=page.locator('#customSubscription');
 const closePayment=payment.locator('.db138-page-header button[aria-label^="Close"],.db138-page-header [data-db139-action="close"]').first();
 if(await closePayment.isVisible())await closePayment.click();await settle();
 const launch=payment.locator('.db143-subscription-launch button');assert.equal(await launch.isVisible(),true);assert.equal(await launch.innerText(),'Create Subscription');assert.equal(await launch.locator('[data-db-disclosure]').count(),1);
 await launch.click();await settle();assert.equal(await payment.locator('.db138-page-header').isVisible(),true);
 await payment.locator('.db138-page-header button[aria-label^="Close"],.db138-page-header [data-db139-action="close"]').first().click();await settle();assert.equal(await launch.isVisible(),true);
 phase('Product image native upload retains the original file binding');
 await go('products');await page.evaluate(()=>window.openMedia(1));await settle();
 const media=page.locator('#ucV1624MediaForm');assert.equal(await media.locator('.db143-upload-area').count(),1);
 const file=media.locator('.db143-upload-area input[type="file"]');assert.equal(await file.getAttribute('name'),'drive_image_file');await file.setInputFiles(png);assert.ok((await media.locator('.db143-upload-area span').innerText()).includes(png.name));
 assert.equal(await media.locator('[name="image_url"]').evaluate(node=>getComputedStyle(node).fontSize),'14px');
 assert.equal(await media.locator('.db143-deep-instructions:visible').count(),0);assert.ok((await media.locator('.uc-v1624-cover-choice').boundingBox()).height<55);
 await page.screenshot({path:join(output,'v143-image-upload.png')});await page.evaluate(()=>document.querySelector('#mediaModal').classList.remove('open'));await settle();
 phase('Product placements choices and complete record cards');
 await go('placements');assert.equal(await page.locator('#placementProductList').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),1);
 assert.equal(await page.locator('#placements .placement-pages').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),1);
 assert.equal(await page.locator('#placements .db143-deep-instructions:visible').count(),0);
 const placementRows=page.locator('#placements .uc-grid-row');assert.equal(await placementRows.count(),2);assert.equal(await placementRows.filter({visible:true}).count(),2);
 assert.ok((await placementRows.first().innerText()).includes('active'));assert.equal(await placementRows.first().locator('button:visible').count()>0,true);
 const overflow=await placementRows.evaluateAll(rows=>rows.some(r=>r.scrollWidth>r.clientWidth+2));assert.equal(overflow,false);
 await page.screenshot({path:join(output,'v143-placements.png'),fullPage:true});
 phase('Members Current/Past use first-paint CSS cards on both class screens');
 for(const tab of ['onlineClasses','offlineClasses']){
   await go(tab);console.log('  class panel '+tab);
   let members=page.locator('#'+tab+' button').filter({hasText:/^Members$/}).first();await members.click();await settle();
   const all=await page.locator('#'+tab+' button').allTextContents();console.log('  member controls '+all.filter(x=>/Current|Past/.test(x)).join(', '));
   for(const label of ['Past Members','Current Members','Past Members','Current Members']){
     const toggle=page.locator('#'+tab+' button').filter({hasText:new RegExp('^'+label+'$')}).first();await toggle.click();
     const raw=await page.locator('#'+tab+' .db107-member-grid:visible,#'+tab+' .uc97-member-grid:visible').evaluateAll(tables=>tables.map(t=>({display:getComputedStyle(t).display,headers:[...t.querySelectorAll('.head,.uc97-data-grid-head')].filter(h=>h.getClientRects().length).length,overflow:t.scrollWidth>t.clientWidth+2})));
     assert.ok(raw.length>0);assert.ok(raw.every(t=>t.display==='grid'&&t.headers===0&&!t.overflow),JSON.stringify(raw));
   }
 }
 phase('Running classes native actions and coach choice sheet');
 await go('studioSchedule');await page.locator('[data-schedule-tab="running"]').click();await settle();
 const manage=page.locator('.db143-mobile-action button').filter({hasText:'Manage Class'}).first();assert.equal(await manage.isVisible(),true);await manage.click();await settle();
 const change=page.locator('#db122ClassChange');await change.waitFor({state:'visible'});assert.equal(await change.locator('.db137-wizard-step').count(),3);
 const choice=change.locator('[name="newCoachId"]+.db143-coach-choice');await choice.click();await page.locator('#db137ChoiceSheet').waitFor({state:'visible'});
 await page.locator('.db137-choice-option').filter({hasText:'Replacement Coach'}).click();assert.equal(await change.locator('[name="newCoachId"]').inputValue(),'2');
 assert.ok((await header(change.locator('.db138-dialog-header'))).right>=12);
 await change.locator('[data-db139-action="close"]:visible').click();
 phase('Dance Tips full-screen form, media binding, Review and desktop recovery');
 await go('blogs');const dance=page.locator('#blogs details').filter({has:page.locator('#blogForm')});await dance.locator(':scope>summary').click();await settle();
 const blog=page.locator('#blogForm');assert.equal(await blog.locator('.db143-upload-area').count()>0,true);assert.equal(await blog.locator('.db137-wizard-step').last().innerText().then(s=>/Review/.test(s)),true);
 const blogHead=await header(blog.locator(':scope>.db138-page-header'));assert.equal(blogHead.y,0);assert.ok(blogHead.right>=12&&blogHead.right<=22,JSON.stringify(blogHead));
 await closeForm(blog);
 phase('Social QA navigation is free; final Publish validates all steps');
 await go('socialPosts');
 for(const [kind,id,count]of [['text','uc48TextForm',2],['image','uc48ImageForm',2],['video','uc48VideoForm',2],['story','uc48StoryForm',2],['carousel_image','uc56CarouselForm_image',3],['carousel_video','uc56CarouselForm_video',3],['carousel_mixed','uc56CarouselForm_mixed',3]]){
   await page.locator('[data-db142-post="'+kind+'"]').click();await settle();const form=page.locator('#'+id);assert.equal(await form.locator('.db137-wizard-step').count(),count);
   assert.equal(await form.locator('.db137-wizard-step').last().isEnabled(),true);await form.locator('.db137-wizard-step').last().click();assert.equal(await form.getAttribute('data-db137-current'),String(count-1));
   const before=writes.filter(w=>w.path==='/api/admin/social-posts').length;await form.locator('[data-db137-finish]').first().click();await settle();assert.equal(writes.filter(w=>w.path==='/api/admin/social-posts').length,before);
   await form.locator('.db137-wizard-step').first().click();await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1');
   assert.equal(await form.locator('.uc56-slot-number').count(),0);await closeForm(form);
 }
 phase('Poll modals keep header and sticky footer in the viewport');
 await page.locator('[data-db142-poll="1"]').click();await settle();
 for(const kind of ['text','image','video','carousel']){
   const option=page.locator('#db137ChoiceSheet .db137-choice-option').filter({hasText:new RegExp('^'+({text:'Text',image:'Image',video:'Video',carousel:'Carousel'}[kind])+' Poll$')});await option.click();await settle();const form=page.locator('#socialPosts form.db138-inline-form-open:visible').first();
   const bounds=await form.evaluate(n=>{const h=n.querySelector('.db138-page-header').getBoundingClientRect(),f=n.querySelector('.db137-wizard-nav').getBoundingClientRect();return{head:h.top,foot:f.bottom,height:innerHeight};});assert.equal(bounds.head,0);assert.ok(Math.abs(bounds.foot-bounds.height)<2,JSON.stringify(bounds));await closeForm(form);
   if(kind!=='carousel'){await page.locator('[data-db142-poll="1"]').click();await settle();}
 }
 }
 phase('Vertical DM and comment builders insert source-owned workflow nodes');
 await go('socialAutomations');
 for(const channel of ['dm','comment','comment_dm']){
   await page.locator('[data-uc64-channel="'+channel+'"]').click();await settle();await page.locator('[data-uc64-new]').click();await settle();
   const ws=page.locator('#uc64Workspace');await ws.waitFor({state:'visible'});assert.equal(await ws.locator('.uc64-palette').isVisible(),false);await ws.locator('.db143-add-flow-node').first().click();
   await page.locator('.db137-choice-option').filter({hasText:channel==='comment_dm'?/^Private DM$/:/^Message$/}).first().click();await settle();assert.equal(await ws.locator('.uc64-node').count(),2);
   const data=await page.evaluate(()=>window.DropBeatFlowPresentation.snapshot());assert.equal(data.nodes.length,1);assert.equal(await page.evaluate(()=>window.DropBeatFlowPresentation.linkTarget('__start__','start')),data.nodes[0].id);
   const rects=await ws.locator('.uc64-node').evaluateAll(ns=>ns.map(n=>({x:n.getBoundingClientRect().x,width:n.getBoundingClientRect().width,position:getComputedStyle(n).position})));assert.ok(rects.every(r=>r.position==='relative'&&r.x>=12&&r.x+r.width<=390),JSON.stringify(rects));
   await ws.locator('[data-close-workspace]').click();await settle();
 }
 phase('Lead nurturing rules and follow-up insertion');
 await page.locator('[data-uc64-channel="lead_nurture"]').click();await settle();await page.locator('[data-uc76-new-lead]').click();await settle();
 const lead=page.locator('#uc76LeadWorkspace');await lead.locator('.db143-lead-settings').click();await page.locator('#db137ChoiceSheet').waitFor({state:'visible'});assert.equal(await page.locator('#db137ChoiceSheet .uc76-lead-settings').isVisible(),true);await page.locator('[data-db137-sheet-done]').click();
 await lead.locator('.db143-lead-plus').first().click();await page.locator('.db137-choice-option').filter({hasText:'WhatsApp'}).click();await settle();assert.equal(await lead.locator('[data-uc76-lead-step]').count(),2);
 await lead.locator('[data-uc76-close-lead]').click();await settle();
 phase('Email child dialogs are above the builder and dismiss correctly');
 await page.locator('[data-uc1705-channel]').click();await settle();await page.locator('[data-uc1705-new]').click();await settle();
 await page.locator('#uc1705Modal [data-uc1705-template="welcome"]').click();await settle();
 let email=page.locator('#uc1705Workspace');await email.locator('[data-uc1705-apply-inspector]').click();await settle();await email.locator('[data-uc1705-add-at]').first().click();await settle();
 let emodal=page.locator('#db137ChoiceSheet');assert.equal(await emodal.isVisible(),true);
 const layer=await emodal.evaluate(m=>{const x=m.querySelector('.db137-sheet-close'),r=x.getBoundingClientRect();return{z:+getComputedStyle(m).zIndex,top:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.db137-sheet-close')===x};});assert.equal(layer.top,true);assert.ok(layer.z>42000);
 await emodal.locator('.db137-sheet-close').click();assert.equal(await emodal.isVisible(),false);
 await email.locator('[data-uc1705-preview-flow]').click();await settle();assert.equal(await page.locator('#uc1705Modal').isVisible(),true);await page.locator('#uc1705Modal [data-uc1705-modal-x]').click();
 await email.locator('[data-uc1705-back]').click();await settle();
 await page.locator('[data-uc1705-view="drafts"]').click();await settle();await page.locator('[data-uc1705-activity="71"]').click();await settle();
 assert.equal(await page.locator('#uc1705Modal .db143-activity-card').count(),1);assert.equal(await page.locator('#uc1705Modal .uc1705-activity-grid>b:visible').count(),0);await page.locator('#uc1705Modal [data-uc1705-modal-x]').click();
 phase('Existing Pages save individual editor values, New Page and Custom Code');
 await go('pages');await page.locator('[data-page-workspace="existing"]').click();await settle();
 let editor=page.locator('#pages .page-editor').filter({has:page.locator('[data-page-field="page_key"][value="contact"]')});await editor.locator(':scope>summary').click();await page.locator('#db137ChoiceSheet').getByRole('button',{name:'Edit this Page',exact:true}).click();await settle();
 let form=editor.locator('form');assert.equal(await form.locator('.db137-wizard-step').count(),2);await form.locator('[data-page-field="title"]').fill('Contact Us V1.46');await form.locator('[data-db137-next]').click();assert.ok((await form.locator('.db138-review').innerText()).includes('Contact Us V1.46'));
 await form.locator('[data-db137-finish]').click();await settle();assert.ok(writes.some(w=>w.path==='/api/admin/pages'&&w.body.includes('Contact Us V1.46')));await closeForm(form);
 assert.equal(await page.locator('#pages button:visible').filter({hasText:'Save All Page Edits'}).count(),0);
 await page.locator('[data-page-workspace="new"]').click();await settle();assert.equal(await page.locator('[data-create-page] [data-db-disclosure]').count(),1);await page.locator('[data-create-page]').click();await settle();
 assert.equal(await page.locator('#ucV1635CreatePageModal').isVisible(),true);await page.locator('#ucV1635CreatePageModal [data-db139-action="close"]:visible').click();
 await page.locator('#pages button').filter({hasText:/^Custom Code$/}).click();await settle();await page.locator('[data-add-code]').click();await settle();const code=page.locator('#uc94CodeModal');assert.equal(await code.isVisible(),true);
 await code.locator('[data-scope="specific"]').click();assert.equal(await code.locator('[data-page-options]').evaluate(n=>getComputedStyle(n).maxHeight),'none');await code.locator('.uc94-modal-head .db138-icon-button:visible').last().click();
 phase('Student Stories grouped actions and approvals carousel');
 await go('successStories');assert.equal(await page.locator('.db143-story-actions').count(),2);const story=page.locator('#successStories details').filter({has:page.locator('form')}).first();await story.locator(':scope>summary').click();await settle();const storyform=story.locator('form');assert.equal(await storyform.locator('.db137-wizard-step').count(),2);await closeForm(storyform);
 await page.locator('#storyTable button[onclick*="editStory"]').first().click();await settle();assert.equal(await storyform.isVisible(),true);await closeForm(storyform);
 await go('approvals');const metrics=page.locator('[data-db114-summary]');assert.equal(await metrics.getAttribute('data-db137-rows'),'1');assert.equal(await metrics.locator(':scope>*').count(),5);assert.ok((await metrics.boundingBox()).height<125);assert.equal(await metrics.locator('..').locator('.db137-carousel-dots button').count(),3);
 phase('Tracking review uses platform labels rather than generic Enable');
 await go('tracking');await page.locator('#tracking>details').nth(1).locator(':scope>summary').click();await settle();
 const tracking=page.locator('#tracking>details').nth(1).locator('form');await tracking.locator('input').filter({visible:true}).first().waitFor();
 await tracking.evaluate(f=>{const fields=[...f.querySelectorAll('.field')];for(const field of fields){const input=field.querySelector('input:not([type="checkbox"]):not([type="hidden"])'),toggle=field.querySelector('input[type="checkbox"]');if(input&&/snapchat/i.test(field.textContent))input.value='snap-test';if(input&&/twitter/i.test(field.textContent))input.value='x-test';if(toggle&&/snapchat/i.test(field.textContent))toggle.checked=false;if(toggle&&/twitter/i.test(field.textContent))toggle.checked=true;}});
 await tracking.locator('[data-db137-next]').click();const review=await tracking.locator('.db138-review').innerText();assert.ok(/Snapchat.*Disabled/s.test(review),review);assert.ok(/X.*Tracking.*Enabled/s.test(review),review);assert.equal(await tracking.locator('.db138-review dt').filter({hasText:/^Enable$/}).count(),0);await closeForm(tracking);
 phase('Heat preview lazy activation and non-colliding navigation/FAB');
 await page.addStyleTag({content:'#heatMaps .uc92-preview{margin-top:1200px!important}'});await go('heatMaps');
 const frame=page.locator('[data-uc92-heat-frame]');assert.equal(await frame.getAttribute('loading'),'lazy');assert.equal(await frame.getAttribute('src'),null,'offscreen live preview does not load eagerly');
 const engagement=page.locator('.db143-engagement-action'),fab=page.locator('#heatMaps>.db141-filter-fab');const left=await engagement.boundingBox(),right=await fab.boundingBox();assert.ok(left.width<=195&&left.x+left.width+8<=right.x,JSON.stringify({left,right}));
 await frame.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-uc92-heat-frame]')?.getAttribute('src')?.includes('db_heat_preview=1'));
 await page.waitForFunction(()=>document.querySelector('#heatMaps .uc92-preview')?.dataset.db143Overlay==='ready');
 await engagement.click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);await page.locator('[data-db137-sheet-done]').click();await page.screenshot({path:join(output,'v143-heat-fab.png')});
 phase('Desktop layout restores original accordions, buttons and media slot numbers');
 await page.setViewportSize({width:1366,height:900});await go('blogs');assert.equal(await page.locator('#blogs [data-db-disclosure]:visible').count(),0);
 const desktopDance=page.locator('#blogs details').filter({has:page.locator('#blogForm')});const before=await desktopDance.evaluate(n=>n.open);await desktopDance.locator(':scope>summary').click();assert.notEqual(await desktopDance.evaluate(n=>n.open),before);assert.equal(await page.locator('#blogForm.db138-inline-form-open').count(),0);
 await go('successStories');assert.equal(await page.locator('.db143-story-actions').count(),0);await go('heatMaps');assert.equal(await page.locator('.db143-engagement-action').isVisible(),false);
 await page.setViewportSize({width:320,height:640});await go('customSubscription');await page.locator('[data-db138-payment-close]').click();await settle();assert.equal(await page.locator('.db143-subscription-launch button').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await writeFile(join(output,'addition-browser-errors.json'),JSON.stringify(errors,null,2));assert.equal(errors.length,0,errors.join('\n'));
 console.log('V1.46 mobile additions passed.');
}

