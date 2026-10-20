import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,context,origin,output,writes,errors}){
 const phase=label=>console.log('V1.43 workflow: '+label);
 const settle=async()=>{await page.evaluate(()=>window.DropBeatMobileUI.refresh());await page.waitForTimeout(180);};
 await page.waitForFunction(()=>window.DropBeatMobileUI?.build==='dropbeat-1.43-20261015');
 phase('shared disclosure geometry and notification badge room');
 await page.evaluate(()=>{window.tab('blogs');});await page.waitForTimeout(600);await settle();
 const dance=page.locator('#blogs .db142-disclosure-summary [data-db-disclosure]').first();assert.equal(await dance.count(),1);
 const disclosure=await dance.evaluate(svg=>({path:svg.querySelector('path').getAttribute('d'),width:svg.getBoundingClientRect().width,height:svg.getBoundingClientRect().height,stroke:getComputedStyle(svg.querySelector('path')).strokeWidth}));
 assert.deepEqual(disclosure,{path:'m9 5 7 7-7 7',width:20,height:20,stroke:'1.8px'});
 const inset=await dance.evaluate(svg=>svg.closest('summary').getBoundingClientRect().right-svg.getBoundingClientRect().right);assert.ok(inset>=9&&inset<=12,'Dance Tips uses the reserved far-right disclosure slot');
 await page.evaluate(()=>window.tab('orders'));await page.waitForTimeout(500);await settle();
 const badge=page.locator('#operationsHub [data-uc87-count="orders-inner"]');
 await badge.evaluate(node=>{node.hidden=false;node.textContent='12';});
 const badgeBounds=await badge.evaluate(node=>{const b=node.getBoundingClientRect(),p=node.closest('.db142-tab-bar').getBoundingClientRect();return{top:b.top-p.top,bottom:p.bottom-b.bottom};});
 assert.ok(badgeBounds.top>=0,JSON.stringify(badgeBounds));assert.ok(badgeBounds.bottom>=0,JSON.stringify(badgeBounds));
 phase('direct gateway refund routes and grouped record actions');
 await page.evaluate(()=>window.tab('refunds'));await page.waitForTimeout(550);await settle();
 assert.equal(await page.locator('#db142RefundQuery').isVisible(),true);
 assert.equal(await page.locator('[data-db142-refund-provider]:visible').count(),4);
 assert.equal(await page.locator('#refunds details.pay-detail:visible').count(),0);assert.equal(await page.locator('#refunds .uc86-refund-tabs').isVisible(),false,'direct routes replace redundant provider tabs');
 const routeHeight=await page.locator('[data-db142-refund-provider]').first().evaluate(node=>node.getBoundingClientRect().height);assert.ok(routeHeight>=48,'navigation rows retain a native touch target');
 for(const provider of ['razorpay','stripe','phonepe','manual']){
   await page.locator('[data-db142-refund-provider="'+provider+'"]').click();
   const modal=page.locator('#db142Refund_'+provider);await modal.waitFor({state:'visible'});
   const bounds=await modal.locator('.modal-card').evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};});
   assert.equal(bounds.left,0);assert.equal(bounds.top,0);assert.equal(bounds.width,390);assert.equal(bounds.height,844);
   assert.equal(await modal.locator('form[data-db138-wizard]').count(),1);assert.equal(await modal.locator('[data-db137-finish]:visible').count(),0);
   await modal.locator('[data-db139-action="close"]:visible').click();assert.equal(await modal.isVisible(),false);
 }
 const actionBounds=await page.locator('#refunds .db142-refund-records .db138-list-header').evaluate(head=>{const icons=head.querySelector('.db138-header-icons'),a=icons?.getBoundingClientRect(),r=head.getBoundingClientRect();return{right:a?r.right-a.right:null,count:icons?.querySelectorAll('button').length};});
 assert.ok(actionBounds.count>=2,JSON.stringify(actionBounds));assert.ok(actionBounds.right<2,JSON.stringify(actionBounds));
 await page.screenshot({path:join(output,'refund-direct-navigation.png'),fullPage:true});
 phase('Help follows the active analytics mode; compact editable dot legends');
 await page.evaluate(()=>window.tab('growthAnalytics'));await page.waitForTimeout(650);await settle();
 for(const [mode,title]of [['business','Business Results'],['visitors','Visitor Sources'],['leads','Lead Generation'],['business','Business Results']]){
   await page.locator('[data-uc88-mode="'+mode+'"]').click();await page.waitForTimeout(120);await settle();
   await page.locator(mode==='visitors'?'#growthAnalytics>.top [data-db139-action="info"]':'[data-uc90-mode-help]').click();await page.locator('#db137ChoiceSheet').waitFor({state:'visible'});
   assert.ok((await page.locator('#db137ChoiceSheet .db138-help-copy').textContent()).includes(title+' — Help'),mode+' gets its own help');
   assert.equal(await page.locator('#growthAnalytics [data-uc88-front]').isVisible(),true,'opening Help does not flip/hide the mobile front');
   await page.locator('[data-db137-sheet-done]').click();
 }
 const color=page.locator('[data-uc88-color]').first();assert.equal(await color.count(),1);
 await color.evaluate(input=>{input.value='#123456';input.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(120);
 const legendStyle=await page.locator('.uc88-color').first().evaluate(label=>({dot:getComputedStyle(label,':before').width,radius:getComputedStyle(label,':before').borderRadius,font:getComputedStyle(label).fontSize,color:getComputedStyle(label).getPropertyValue('--db-legend-color').trim(),height:label.getBoundingClientRect().height}));
 assert.equal(legendStyle.dot,'9px');assert.equal(legendStyle.radius,'50%');assert.equal(legendStyle.font,'12px');assert.equal(legendStyle.color,'#123456');assert.ok(legendStyle.height<36);
 phase('Heat Maps header help and extended Filter FAB');
 await page.evaluate(()=>window.tab('heatMaps'));await page.waitForTimeout(600);await settle();
 assert.equal(await page.locator('#heatMaps>.top .db138-header-icons [data-db139-action="info"]').count(),1);
 const heatFab=page.locator('#heatMaps>.db141-filter-fab');assert.equal(await heatFab.isVisible(),true);assert.ok((await heatFab.textContent()).includes('Filter'));
 assert.equal(await heatFab.evaluate(node=>getComputedStyle(node).position),'fixed');await heatFab.click();await page.locator('.db140-filter-overlay:not([hidden])').waitFor();await page.locator('.db140-filter-overlay:not([hidden]) [data-db140-apply]').click();
 phase('all post types open directly; exact steps, media uploads, validation and review');
 await page.evaluate(()=>window.tab('socialPosts'));await page.waitForTimeout(600);await settle();
 assert.equal(await page.locator('#socialPosts [data-db142-post]').count(),8);assert.equal(await page.locator('#socialPosts .uc48-tabs').isVisible(),false,'creation uses native rows without duplicate legacy tabs');
 const specs=[['text','uc48TextForm',2],['image','uc48ImageForm',2],['video','uc48VideoForm',2],['story','uc48StoryForm',2],['carousel_image','uc56CarouselForm_image',3],['carousel_video','uc56CarouselForm_video',3],['carousel_mixed','uc56CarouselForm_mixed',3]];
 const upload={name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aizsAAAAASUVORK5CYII=','base64')};
 for(const [key,id,steps]of specs){
   const mediaFile=key==='video'||key==='carousel_video'?{name:'fixture.mp4',mimeType:'video/mp4',buffer:Buffer.from('000000206674797069736f6d0000020069736f6d69736f32617663316d703431','hex')}:upload;
   console.log('  '+key);await page.locator('[data-db142-post="'+key+'"]').click();await settle();
   let form=page.locator('#'+id);await form.waitFor({state:'visible'});
   assert.equal(await form.getAttribute('data-db137-steps'),String(steps));assert.equal(await form.locator('.db137-wizard-step').last().innerText(),steps+'\nReview & Publish');
   assert.equal(await form.locator('.db142-post-instructions:visible').count(),0);assert.equal(await form.locator('[data-db137-finish]:visible').count(),0);
   const rect=await form.evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};});assert.deepEqual(rect,{left:0,top:0,width:390,height:844});
   if(key==='text'){
     await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1','QA can reach Review without required fields');await form.locator('[data-db137-finish]').click();assert.equal(await form.getAttribute('data-db137-current'),'0','final submission enforces required body');
     await form.locator('[name="bodyText"]').fill('A fixture post to review');await form.locator('[name="tags"]').fill('dance, test');
   }else if(!key.startsWith('carousel')){
     await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1','QA can reach Review without media');await form.locator('[data-db137-finish]').click();assert.equal(await form.getAttribute('data-db137-current'),'0','final submission enforces media');
     assert.equal(await form.locator('.db142-upload-area:visible').count(),1);
     await form.locator('input[type="file"]').setInputFiles(mediaFile);await form.locator('button[onclick*="ucV1648Upload"]').click();
     await page.waitForFunction(kind=>!!window.UCV1648Posts?.uploads[kind],key);await settle();form=page.locator('#'+id);await form.waitFor({state:'visible'});
     const caption=form.locator('[name="caption"]');if(await caption.count())await caption.fill('Media fixture caption');
     if(key==='story'){assert.equal(await form.locator('[name="tags"]').count(),1);assert.equal(await form.locator('[data-uc75-poll-toggle]').count(),1);}
   }else{
     await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1');await form.locator('.db137-wizard-step').first().click();
     for(let i=0;i<2;i++){await form.locator('.uc56-carousel-slot[data-slot="'+i+'"] input[type="file"]').setInputFiles(mediaFile);await form.locator('.uc56-carousel-slot[data-slot="'+i+'"] button[onclick*="ucV1656UploadCarousel"]').click();await page.waitForFunction(({mode,index})=>!!window.UCV1656.carousel.uploads[mode][index],{mode:key.replace('carousel_',''),index:i});await settle();form=page.locator('#'+id);}
     await form.locator('.uc56-add-more').click();await settle();form=page.locator('#'+id);assert.equal(await form.isVisible(),true,'adding media preserves the open wizard');assert.equal(await form.locator('.uc56-carousel-slot').count(),4);
     await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1');assert.equal(await form.locator('.db142-upload-area:visible').count(),0,'media step is separate from content');
     await form.locator('[name="caption"]').fill('Carousel fixture caption');
   }
   const targets=form.locator('.uc48-platform,.uc56-platform-pill,.uc56-platform');if(await targets.count())await targets.first().click();
   if(key==='text'){
     await form.locator('[data-uc75-poll] .switch').click();await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),'1','QA can inspect Review with an empty poll');await form.locator('[data-db137-finish]').click();assert.equal(await form.getAttribute('data-db137-current'),'0','final submission requires a complete enabled poll');
     await form.locator('[data-uc75-poll-question]').fill('Your next class?');await form.locator('[data-uc75-poll-option]').nth(0).fill('Online');await form.locator('[data-uc75-poll-option]').nth(1).fill('Studio');
   }
   if(key==='image'){const height=await form.locator('[data-uc75-poll] .switch').evaluate(node=>node.getBoundingClientRect().height);assert.ok(height<=22,'poll switches retain their native pill height');}
   if(key==='text'||key==='image')await page.screenshot({path:join(output,'post-'+key+'-content.png')});
   await form.locator('[data-db137-next]').click();assert.equal(await form.getAttribute('data-db137-current'),String(steps-1));assert.equal(await form.locator('[data-db137-finish]:visible').count(),1);
   if(key==='image'||key==='carousel_image')await page.screenshot({path:join(output,'post-'+key+'-review.png')});
   assert.equal(await form.locator('.db138-review').isVisible(),true);if(key!=='text')assert.ok(await form.locator('.db142-media-review img,.db142-media-review video').count()>0);
   await form.locator('[data-db137-back]').click();assert.equal(await form.locator('[name="bodyText"],[name="caption"]').first().inputValue(),key==='text'?'A fixture post to review':key.startsWith('carousel')?'Carousel fixture caption':'Media fixture caption');
   await form.locator(':scope>.db138-page-header button[aria-label^="Close"]').click();assert.equal(await form.isVisible(),false);
 }
 await page.locator('[data-db142-post="schedule"]').click();await settle();
 assert.equal(await page.locator('#socialPosts .db142-post-menu').isVisible(),false,'Scheduling has a dedicated clean view');
 const month=page.locator('#socialPosts .db-mobile-calendar-header');assert.equal(await month.count(),1);assert.equal(await month.locator('button').count(),2);
 assert.equal(await page.locator('#socialPosts .uc48-calendar-view button').count(),4);
 const eventDay=page.locator('#socialPosts .uc48-day.db137-has-event').first();await eventDay.click();assert.equal(await page.locator('#socialPosts .db136-calendar-agenda').isVisible(),true);
 const circle=await eventDay.locator('.uc48-day-num').evaluate(node=>getComputedStyle(node).borderRadius);assert.equal(circle,'50%');
 await page.screenshot({path:join(output,'post-scheduling.png'),fullPage:true});
 phase('automation flow cards, templates, trigger Apply and Close unblock the canvas');
 await page.evaluate(()=>window.tab('socialAutomations'));await page.waitForTimeout(650);await settle();
 assert.equal(await page.locator('#socialAutomations .uc64-grid-head:visible').count(),0);assert.ok(await page.locator('#socialAutomations .db142-flow-card').count()>0);
 await page.locator('[data-uc1705-channel]').click();await page.waitForTimeout(300);await settle();
 assert.equal(await page.locator('.uc1705-grid-head:visible').count(),0);
 const buttons=await page.locator('.db142-automation-actions').last().evaluate(node=>[...node.querySelectorAll('button')].map(b=>b.getBoundingClientRect().top));assert.ok(buttons.length===2&&Math.abs(buttons[0]-buttons[1])<2);
 await page.locator('[data-uc1705-view="templates"]').click();await settle();
 const chips=await page.locator('.uc1705-templates>aside').evaluate(node=>({wrap:getComputedStyle(node).flexWrap,overflow:getComputedStyle(node).overflowX}));assert.deepEqual(chips,{wrap:'nowrap',overflow:'auto'});
 const card=page.locator('.db142-template-card').first();assert.equal(await card.locator('[data-db-disclosure]').count(),1);await card.click();await settle();
 const workspace=page.locator('#uc1705Workspace');assert.equal(await workspace.getAttribute('data-db142-inspector-open'),'true');
 assert.equal(await workspace.locator('.db142-inspector-bar button').isVisible(),true);
 const inspector=workspace.locator('.uc1705-inspector');const ib=await inspector.evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom};});assert.deepEqual(ib,{left:0,right:390,bottom:844});
 await page.screenshot({path:join(output,'automation-trigger-sheet.png')});
 await workspace.locator('[data-uc1705-apply-inspector]').click();await settle();assert.equal(await inspector.isVisible(),false);assert.equal(await workspace.locator('.db142-inspector-scrim').isVisible(),false);
 await workspace.locator('[data-uc1705-select="trigger"]').click();await settle();assert.equal(await inspector.isVisible(),true);await workspace.locator('.db142-inspector-bar button').click();await settle();assert.equal(await inspector.isVisible(),false);
 await workspace.locator('[data-uc1705-back]').click();await page.waitForTimeout(200);assert.equal(await workspace.count(),0);
 phase('desktop legend scope and all-portals shared component availability');
 await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>window.tab('growthAnalytics'));await page.waitForTimeout(400);
 const desktopLegend=await page.locator('.uc88-color').first().evaluate(node=>({height:node.getBoundingClientRect().height,font:getComputedStyle(node).fontSize,dot:getComputedStyle(node,':before').width}));assert.ok(desktopLegend.height<36);assert.equal(desktopLegend.dot,'9px');
 assert.equal(await page.locator('.db142-post-menu:visible').count(),0);
 for(const role of ['student','coach']){
   await page.goto(origin+'/'+role+'-dashboard.html',{waitUntil:'load'});await page.waitForFunction(()=>window.DropBeatUI?.version==='1.43');assert.ok(await page.evaluate(()=>window.DropBeatUI.disclosure().includes('m9 5 7 7-7 7')));
 }
 assert.equal(writes.some(write=>write.path==='/api/admin/social-posts'||write.path==='/api/admin/email-automations'||write.path==='/api/admin/refunds'),false,'no publish, activation or refund test touches a live/external handler');
 await writeFile(join(output,'workflow-console-errors.json'),JSON.stringify(errors,null,2));assert.equal(errors.length,0,errors.join('\n'));
 console.log('V1.43 new workflow checks passed.');
}
