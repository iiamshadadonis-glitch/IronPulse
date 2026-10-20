import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runWorkflows({page,context,origin,output,errors}){
 const settle=()=>page.waitForTimeout(300),results=[];
 await page.waitForFunction(()=>window.DropBeatDataCache&&window.DropBeatMobileUI);
 console.log('V1.50: nine payment records use the full-height body; last card reachable on short and tall phones.');
 await page.evaluate(()=>window.openClientDetails('lead:1'));await settle();await page.evaluate(()=>window.ucClientTab('payments',document.querySelector('[onclick^="ucClientTab(\'payments\'"]')));await settle();
 await page.locator('[data-db149-payments=records]').click();await settle();
 for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
  await page.setViewportSize(size);await settle();const view=page.locator('[data-db149-payment-view=records]'),body=view.locator('.db149-payment-body');
  await page.waitForFunction(()=>document.querySelectorAll('[data-db149-payment-view=records] .uc-payment-records tbody tr').length===9);
  const shape=await view.evaluate(n=>{const b=n.querySelector('.db149-payment-body'),head=n.querySelector('.db149-payment-header'),list=n.querySelector('.uc-payment-records');return {view:n.getBoundingClientRect().toJSON(),body:b.getBoundingClientRect().toJSON(),head:head.getBoundingClientRect().toJSON(),max:getComputedStyle(list).maxHeight,overflow:getComputedStyle(b).overflowY,rows:list.querySelectorAll('tbody tr').length};});
  assert.equal(Math.round(shape.view.height),size.height);assert.ok(shape.body.height>=size.height-shape.head.height-1,JSON.stringify(shape));assert.equal(shape.max,'none');assert.equal(shape.overflow,'auto');assert.equal(shape.rows,9);
  await body.evaluate(n=>n.scrollTop=n.scrollHeight);const last=await body.locator('tbody tr').last().boundingBox(),box=await body.boundingBox();assert.ok(last.y>=box.y&&last.y+last.height<=box.y+box.height+1,JSON.stringify({last,box}));results.push({paymentViewport:size,...shape});
 }
 await page.locator('[aria-label="Close Payment Records"]').click();await page.locator('#ucClientModal [aria-label="Close Client Details"]:visible').first().click().catch(()=>page.evaluate(()=>document.querySelector('#ucClientModal').classList.remove('open')));
 console.log('V1.50: nested menu inputs and three 44px actions stay on one row.');
 await page.evaluate(()=>window.tab('pages'));await settle();await page.locator('[data-page-workspace=new]').click();await settle();await page.locator('[data-nav-key=offers] .db144-menu-children').click();await settle();
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await settle();
  const child=page.locator('[data-child-key=pricing_help]').first();
  const s=await child.evaluate(n=>{const input=n.querySelector('input'),actions=[...n.querySelectorAll('.uc-v1637-row-actions button')];return {row:n.getBoundingClientRect().toJSON(),input:input.getBoundingClientRect().toJSON(),actions:actions.map(b=>({rect:b.getBoundingClientRect().toJSON(),border:getComputedStyle(b).borderWidth,svg:b.querySelector('svg').getBoundingClientRect().width})),scroll:n.scrollWidth,width:n.clientWidth};});
  assert.equal(s.actions.length,3);assert.ok(s.scroll<=s.width+1,JSON.stringify(s));assert.ok(s.input.width>15);assert.ok(s.input.x+s.input.width<=s.actions[0].rect.x+1);assert.ok(Math.max(...s.actions.map(x=>x.rect.y))-Math.min(...s.actions.map(x=>x.rect.y))<1);for(const a of s.actions){assert.equal(a.border,'0px');assert.equal(a.rect.width,44);assert.equal(a.rect.height,44);assert.equal(a.svg,18);}results.push({menuWidth:width,...s});
 }
 console.log('V1.50: public welcome overlay, two-column plans and aligned footer actions; desktop separation.');
 const products=Array.from({length:6},(_,i)=>({id:i+1,name:['Online Dance Pass','Studio Dance Membership','Hybrid Membership','Private Coaching'][i]||'Dance Plan '+(i+1),slug:'test-'+i,status:'active',short_description:i===1?'A much longer description for students who prefer instructor led studio sessions and flexible class schedules.':'Learn dance.',regular_price_paise:39900,offer_price_paise:19900,payment_type:'subscription',offer_price_enabled:1,trial_enabled:i===0?1:0,trial_amount_paise:100,trial_value:7,trial_unit:'days',features:i===2?['Live classes','All dance styles','Weekly practice']:[],images:[{public_url:'/assets/product-generic.svg'}],spot_limit:i===0?2:0,low_spot_limit:2,class_mapping:i===0?{enabled:1,class_name:'Beginners Session',class_type:'online_class',class_days:['mon','wed'],class_time:'10:00',duration_minutes:60}:null}));
 await context.route('**/api/public/**',async route=>{const url=new URL(route.request().url());let data={settings:{siteName:'DropBeat Dance Studio',primaryColor:'#4B55BE',accentColor:'#A469A8'},products,banners:[],stories:[],navigation:[],navigationModel:[]};if(url.pathname.endsWith('studio-gallery'))data={images:[{id:1,image_url:'/assets/product-generic.svg',alt_text:'Saved studio image'}]};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
 for(const path of ['/','/offers'])for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await page.goto(origin+(path==='/'?'/':'/offers.html'),{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('.db150-plan-footer').length===6);const consent=page.getByRole('button',{name:'Only Necessary',exact:true});if(await consent.isVisible())await consent.click();await settle();
  const grid=page.locator(path==='/'?'#featuredProducts':'#offersGrid'),cards=await grid.locator(':scope>.product-card').evaluateAll(nodes=>nodes.map(n=>({rect:n.getBoundingClientRect().toJSON(),price:n.querySelector('.price').getBoundingClientRect().toJSON(),actions:n.querySelector('.product-actions').getBoundingClientRect().toJSON(),scroll:n.scrollWidth,width:n.clientWidth})));
  assert.equal(Math.round(cards[0].rect.y),Math.round(cards[1].rect.y));assert.ok(cards[1].rect.x>cards[0].rect.x);for(const c of cards)assert.ok(c.scroll<=c.width+1,JSON.stringify(c));for(let i=0;i<cards.length;i+=2){assert.ok(Math.abs(cards[i].actions.y-cards[i+1].actions.y)<2,JSON.stringify(cards));assert.ok(Math.abs(cards[i].price.y-cards[i+1].price.y)<2,JSON.stringify(cards));}
  if(path==='/'){const overlay=await page.locator('.dropbeat-welcome-grid').evaluate(n=>{const r=n.getBoundingClientRect(),image=n.querySelector('.dropbeat-welcome-visual').getBoundingClientRect(),copy=n.querySelector('.dropbeat-welcome-copy').getBoundingClientRect();return {r:r.toJSON(),image:image.toJSON(),copy:copy.toJSON(),color:getComputedStyle(n.querySelector('h2')).color};});assert.ok(Math.abs(overlay.image.width-overlay.r.width)<3);assert.ok(overlay.copy.x>=overlay.image.x&&overlay.copy.x<overlay.image.x+3);assert.equal(overlay.color,'rgb(255, 255, 255)');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(width===390)await page.screenshot({path:join(output,path==='/'?'v150-home-mobile.png':'v150-offers-mobile.png'),fullPage:true});results.push({path,width,cards});
 }
 await page.setViewportSize({width:1366,height:900});await settle();assert.equal(await page.locator('.db150-plan-footer').count(),0,'Desktop original node order restored');
 assert.equal(await page.locator('.product-card').first().evaluate(n=>n.querySelector('.price').nextElementSibling.matches('.features')),true,'Desktop price/features order restored');
 assert.equal(await page.locator('.product-card').first().evaluate(n=>n.querySelector('[data-db107-plan-facts]').nextElementSibling.matches('.uc-plan-availability')),true,'Desktop session facts return to the original availability anchor');
 await page.setViewportSize({width:390,height:844});await settle();
 assert.equal(await page.locator('.product-card').first().locator('.product-actions>a').getAttribute('href'),'/offer-details?plan=test-0');
 await Promise.all([page.waitForURL('**/checkout'),page.locator('[data-add="1"]').click()]);
 const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('uc_cart')));assert.equal(cart[0].product_id,1);assert.equal(cart[0].offer_price_paise,19900);assert.equal(cart[0].trial_enabled,1);
 assert.equal(errors.length,0,JSON.stringify(errors));await writeFile(join(output,'v150-layout-results.json'),JSON.stringify(results,null,2));console.log('V1.50 mobile layout and desktop separation checks passed.');
}
