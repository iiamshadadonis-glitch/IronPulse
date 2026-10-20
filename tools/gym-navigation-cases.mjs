import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {database} from '../tests/fixtures-v158.mjs';
import {onRequestGet as publicLayout} from '../functions/api/public/layout.js';
import {onRequestGet as publicButtons} from '../functions/api/public/button-dictionary.js';
import {onRequestGet as adminButtons} from '../functions/api/admin/button-dictionary.js';
import {readLayoutContext,saveLayout,layoutPayload} from '../functions/_lib/layout.js';
export async function runNavigationWorkflows({page,context,origin,output,errors}){
 const fixture=database(),{sql}=fixture,env={...fixture.env,ADMIN_DEVELOPMENT_BYPASS:'true'},results=[],requests=[],frames=[],dimensions=[];
 env.DB.batch=async statements=>{sql.exec('BEGIN IMMEDIATE');try{const out=statements.map(statement=>({success:true,results:sql.prepare(statement.text).all(...statement.args)}));sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}};
 sql.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('site_settings',JSON.stringify({frontendTheme:'dropbeat'}));
 sql.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('navigation_overrides',JSON.stringify({offers:{label:'Pricing',slug:'pricing'}}));
 let configMode='pending',configGates=[],scheduleMode='success',scheduleGates=[],scheduleRequests=[];
 const phase=label=>console.log('Gym V1.01: '+label),ready=p=>p.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready'),sidebar=()=>page.locator('.side .nav [data-tab="blogs"]');
 async function releaseConfig(){configMode='success';const gates=configGates.splice(0);gates.forEach(resolve=>resolve());}
 await context.route('**/api/**',async route=>{
  const incoming=route.request(),path=new URL(incoming.url()).pathname;
  const handler=path==='/api/public/layout'?publicLayout:path==='/api/public/button-dictionary'?publicButtons:path==='/api/admin/button-dictionary'?adminButtons:null;
  if(!handler)return route.fallback();requests.push(path);const mode=configMode;
  if(mode==='pending')await new Promise(resolve=>configGates.push(resolve));
  if(mode==='error'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic configuration outage"}'});return;}
  if(mode==='invalid'){await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});return;}
  const response=await handler({request:new Request(incoming.url(),{headers:incoming.headers()}),env,waitUntil:()=>{}});
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()}).catch(()=>{});
 });
 const schedule=(name='Current Coach')=>({ok:true,coaches:[{id:1,name,status:'active',days:['mon'],danceStyles:['Weightlifting']}],runningClasses:[],leaves:{pending:[],today:[],upcoming:[],unplanned:[],past:[]},holidays:{upcoming:[],past:[]}});
 await context.route('**/api/admin/studio-schedule*',async route=>{
  const url=new URL(route.request().url()),mode=scheduleMode;scheduleRequests.push({query:url.search,mode});
  if(mode==='pending')await new Promise(resolve=>scheduleGates.push(resolve));
  if(mode==='error'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic schedule unavailable"}'});return;}
  if(mode==='invalid-json'){await route.fulfill({status:200,contentType:'application/json',body:'{not-json'});return;}
  if(mode==='invalid-data'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,coaches:[null],leaves:{pending:{}}})});return;}
  const value=schedule(mode==='pending'?'Stale late response':'Current Coach');if(mode==='paging'){const page=Number(url.searchParams.get('page')||1);value.coaches=Array.from({length:page===1?50:1},(_,i)=>({id:(page-1)*50+i+1,name:'Paged Coach '+((page-1)*50+i+1),status:'active',days:['mon']}));value.mobilePagination={page,pageSize:50,hasMore:page===1};}else if(url.searchParams.get('view')==='mobile')value.mobilePagination={page:1,pageSize:50,hasMore:false};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)}).catch(()=>{});
 });
 async function sample(p,selector,expected,milliseconds=1800){
  const values=await p.evaluate(({selector,milliseconds})=>new Promise(resolve=>{const values=[],start=performance.now();function tick(){const node=document.querySelector(selector);values.push(node?.textContent.trim()??null);if(performance.now()-start<milliseconds)requestAnimationFrame(tick);else resolve(values);}tick();}),{selector,milliseconds});
  assert.ok(values.length>=2,'The page continues painting');assert.deepEqual([...new Set(values)],[expected]);frames.push({selector,expected,count:values.length,unique:[...new Set(values)]});
 }
 let pub;
 try{
  phase('Cold dynamic state and stable default names on mobile/desktop');await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(origin+'/admin/',{waitUntil:'load'});await page.waitForFunction(()=>window.DropBeatLayout&&window.DropBeatButtons&&document.querySelector('#adminApp:not([hidden])'));
  assert.equal(await page.evaluate(()=>DropBeatLayout.snapshot()),null);assert.equal(await page.evaluate(()=>DropBeatButtons.snapshot()),null);
  assert.equal(await sidebar().innerText(),'');assert.equal(await page.evaluate(()=>document.documentElement.dataset.db159Layout),'loading');
  await page.locator('.nav-group[data-group-title="Social Media"]>.nav-group-toggle').click();
  assert.equal(await sidebar().evaluate(n=>getComputedStyle(n,'::after').content),'""');
  await page.screenshot({path:join(output,'gym-navigation-skeleton.png')});await releaseConfig();await ready(page);
  assert.equal(await sidebar().innerText(),'Fitness Tips');assert.equal(await sidebar().getAttribute('data-db157-name'),'blog','The default saved name is also dynamically owned');
  await page.evaluate(()=>{for(let i=0;i<40;i++){const n=document.createElement('span');document.body.append(n);n.remove();}});await sample(page,'.side .nav [data-tab="blogs"]','Fitness Tips');
  for(const width of [320,390,760,1440]){await page.setViewportSize({width,height:900});await page.reload({waitUntil:'load'});await ready(page);assert.equal(await sidebar().innerText(),'Fitness Tips');await sample(page,'.side .nav [data-tab="blogs"]','Fitness Tips',450);}
  results.push('Null initial models and pre-paint placeholders; no hardcoded Article fallback; default Fitness Tips remains owned and stable over repeated renders/reloads at 320/390/760/1440px');

  phase('Renamed labels, public header/footer, dictionary actions and request deduplication');
  const current=layoutPayload(await readLayoutContext(env),{admin:true});
  await saveLayout(env,{theme:current.theme,layout:current.layout,names:{blog:'Gym Journal',offers:'Pricing',checkout:'Cart',trial:'Book a Class'},expectedRevision:current.revision,expectedContextRevision:current.contextRevision,confirmation:'confirm'});
  await page.evaluate(()=>Promise.all([DropBeatLayout.refresh({force:true}),DropBeatButtons.refresh({force:true})]));await sample(page,'.side .nav [data-tab="blogs"]','Gym Journal');
  pub=await context.newPage();pub.on('pageerror',e=>errors.push(e.stack||String(e)));await pub.setViewportSize({width:1440,height:1000});await pub.goto(origin+'/?website=1',{waitUntil:'load'});await ready(pub);
  const checkout=pub.locator('.nav-actions .cart-pill [data-db156-label],.nav-actions .cart-pill .uc-checkout-label').first();await checkout.waitFor();assert.equal(await checkout.innerText(),'Cart');assert.equal(await pub.locator('.nav-actions .join-pill').innerText(),'Book a Class');
  await sample(pub,'.navlinks [data-db159-name="blog"]','Gym Journal');assert.equal(await pub.locator('.footer [data-db159-name="blog"]').innerText(),'Gym Journal');
  await pub.evaluate(()=>UCApplyV1637Navigation({navigationModel:[{key:'home',label:'Legacy Home',href:'/'},{key:'offers',label:'Offers',href:'/offers',children:[{key:'child',label:'Memberships',href:'/offers?type=membership'}]},{key:'blog',label:'Article',href:'/blog'}]}));
  await sample(pub,'.navlinks [data-uc-nav-key="blog"]','Gym Journal');assert.equal(await pub.locator('.navlinks a[data-uc-nav-key="offers"] [data-db159-label]').innerText(),'Pricing');
  await pub.setViewportSize({width:390,height:844});await pub.locator('.menu-toggle').click();await pub.locator('.navlinks a[data-uc-nav-key="offers"]').click();await pub.locator('#db151NavigationOverlay').waitFor({state:'visible'});assert.equal(await pub.locator('#db151OverlayTitle').innerText(),'Pricing');assert.equal(await pub.locator('#db151NavigationOverlay a').innerText(),'Memberships');await pub.locator('#db151NavigationOverlay .db151-close').click();
  const before=requests.length;await page.evaluate(()=>Promise.all(Array.from({length:30},()=>DropBeatLayout.refresh({force:true}))));assert.equal(requests.length,before+1);const after=requests.length;await page.evaluate(()=>{for(let i=0;i<100;i++){DropBeatLayout.render();DropBeatButtons.render();}});await page.waitForTimeout(300);assert.equal(requests.length,after);
  const changed=layoutPayload(await readLayoutContext(env),{admin:true});await saveLayout(env,{theme:changed.theme,layout:changed.layout,names:{blog:'Fitness Tips'},expectedRevision:changed.revision,expectedContextRevision:changed.contextRevision,confirmation:'confirm'});await page.evaluate(()=>DropBeatLayout.refresh({force:true}));await sample(page,'.side .nav [data-tab="blogs"]','Fitness Tips');
  results.push('Saved navigation and button names are stable in Admin, desktop/mobile public headers and footers; stale navigation builders cannot overwrite them; mobile submenu routes and 30-way refresh deduplication are retained');

  phase('Initial configuration errors, Retry, invalid payloads and bounded timeouts');
  await pub.evaluate(()=>sessionStorage.clear());configMode='error';await pub.reload({waitUntil:'load'});await pub.locator('#db159NavigationError').waitFor();assert.equal(await pub.evaluate(()=>DropBeatLayout.snapshot()),null);assert.equal(await pub.evaluate(()=>DropBeatButtons.snapshot()),null);assert.equal(await pub.evaluate(()=>document.documentElement.dataset.db159Layout),'error');
  configMode='invalid';await pub.locator('#db159NavigationError button').click();await pub.waitForFunction(()=>document.documentElement.dataset.db159Layout==='error');
  configMode='success';await pub.locator('#db159NavigationError button').click();await ready(pub);await pub.locator('#db159NavigationError').waitFor({state:'detached'});assert.equal(await pub.locator('.nav-actions .join-pill').innerText(),'Book a Class');
  await pub.evaluate(()=>sessionStorage.clear());configMode='pending';await pub.reload({waitUntil:'load'});await pub.waitForFunction(()=>document.documentElement.dataset.db159Layout==='error',{timeout:11000});assert.equal(await pub.locator('#db159NavigationError').isVisible(),true);await releaseConfig();await pub.locator('#db159NavigationError button').click();await ready(pub);
  results.push('Failed and malformed initial configuration responses show Retry rather than old labels; stalled requests exit loading within eight seconds and recover');

  for(const width of [390,1440]){
   phase('Schedule lifecycle at '+width+'px');await page.setViewportSize({width,height:900});await page.evaluate(()=>window.tab('studioSchedule'));await page.locator('.db119-schedule-table tbody tr').first().waitFor();
   const head=await page.locator('#studioSchedule .db120-section-head').evaluate(n=>{const r=n.getBoundingClientRect(),next=n.nextElementSibling.getBoundingClientRect();return {margin:parseFloat(getComputedStyle(n).marginBottom),gap:next.top-r.bottom};});dimensions.push({width,...head});if(width>760){assert.ok(head.margin>=24);assert.ok(head.gap>=24);}else assert.notEqual(head.margin,24,'Desktop-only spacing does not leak into mobile');
   scheduleMode='pending';await page.locator('#studioSchedule [data-db139-action="refresh"]:visible,#studioSchedule [data-db119-refresh]:visible').first().click();await page.locator('[data-db119-tab="leaves"]').click();assert.equal(await page.locator('[data-db119-tab="leaves"]').getAttribute('aria-selected'),'true');await page.locator('[data-db119-tab="holidays"]').click();assert.equal(await page.locator('[data-db119-tab="holidays"]').getAttribute('aria-selected'),'true');
   await page.locator('[data-db149-schedule-state="error"]').waitFor({timeout:19000});assert.ok((await page.locator('[data-db119-content]').innerText()).includes('timed out'));
   for(const mode of ['error','invalid-json','invalid-data']){scheduleMode=mode;await page.locator('[data-db149-schedule-retry]').click();await page.locator('[data-db149-schedule-state="error"]').waitFor();assert.ok((await page.locator('[data-db119-content]').innerText()).includes('Failed to load schedule data'));}
   scheduleMode='success';await page.locator('[data-db149-schedule-retry]').click();await page.locator('[data-db149-schedule-state="error"]').waitFor({state:'detached'});assert.equal(await page.locator('[data-db119-tab="holidays"]').getAttribute('aria-selected'),'true');await page.locator('[data-db119-tab="schedule"]').click();assert.ok((await page.locator('.db119-schedule-table').innerText()).includes('Current Coach'));
   scheduleGates.splice(0).forEach(resolve=>resolve());await page.waitForTimeout(200);assert.ok(!(await page.locator('.db119-schedule-table').innerText()).includes('Stale late response'));
   if(width<=760){scheduleMode='paging';await page.locator('#studioSchedule [data-db139-action="refresh"]:visible,#studioSchedule [data-db119-refresh]:visible').first().click();await page.locator('[data-db149-load-more]').waitFor();await page.locator('[data-db149-load-more]').click();await page.waitForFunction(()=>document.querySelectorAll('.db119-schedule-table tbody tr').length===51);assert.equal(await page.locator('[data-db149-load-more]').count(),0);scheduleMode='success';}
   await page.screenshot({path:join(output,'gym-schedule-'+width+'.png')});results.push((width>760?'Desktop':'Mobile')+' Schedule: responsive tabs during pending fetch; 15-second timeout; HTTP/JSON/nested-data errors; successful Retry; late response isolation'+(width>760?'; 24px header gap':' and original bounded query'));
  }
  assert.ok(scheduleRequests.some(r=>r.query.includes('view=mobile')&&r.query.includes('pageSize=50')));assert.ok(scheduleRequests.some(r=>r.query===''));
  assert.deepEqual(errors,[]);await writeFile(join(output,'gym-navigation-schedule-results.json'),JSON.stringify({results,frames,dimensions,requests,scheduleRequests,errors,synthetic:true,actualConfigurationHandlersAndSqlite:true},null,2));console.log('Gym V1.01 navigation/Schedule browser regression passed: '+results.length+' workflow groups.');
 }catch(error){if(pub&&!pub.isClosed()){await pub.screenshot({path:join(output,'gym-public-failure.png'),fullPage:true});await writeFile(join(output,'gym-public-failure.html'),await pub.content());}throw error;}finally{configGates.splice(0).forEach(resolve=>resolve());scheduleGates.splice(0).forEach(resolve=>resolve());await pub?.close();fixture.close();}
}
