import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {runNavigationWorkflows} from './gym-navigation-cases.mjs';

export async function runWorkflows(args){
 const {page,context,origin,output,errors}=args,results=[];
 const ready=async()=>page.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready');
 await context.route('**/api/portal/auth/context*',async route=>{
  const url=new URL(route.request().url()),role=url.searchParams.get('role');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(role?{ok:true,authenticated:true,key:role+':1',role,status:'active',home:role==='admin'?'/admin/':role==='coach'?'/coach-dashboard':'/member-dashboard',expires:'2027-01-01T00:00:00Z'}:{ok:true,authenticated:false})});
 });
 console.log('[Gym browser] public branding, signup, portals, PWA and fitness specialties');
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/?website=1',{waitUntil:'load'});await ready();
  assert.match(await page.title(),/IronPulse/);
  assert.doesNotMatch(await page.locator('body').innerText(),/DropBeat|Dance Studio|\bStudents?\b/);
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').first().getAttribute('href'),'/assets/apple-touch-icon.png');
  await page.screenshot({path:join(output,'gym-home-'+width+'.png'),fullPage:true});
  await page.goto(origin+'/login',{waitUntil:'load'});await ready();
  assert.match(await page.locator('[data-auth-mode="student"]').innerText(),/Member/);
  await page.locator('[data-auth-mode="student"]').click();
  assert.match(await page.locator('#studentSignupForm').innerText(),/Member/);
  assert.doesNotMatch(await page.locator('#studentSignupForm').innerText(),/\bStudent\b/);
  await page.screenshot({path:join(output,'gym-member-signup-'+width+'.png'),fullPage:true});
  await page.goto(origin+'/member-dashboard',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.DropBeatPortalModel);
  assert.match(await page.title(),/Member Dashboard/);
  assert.equal(new URL(page.url()).pathname,'/member-dashboard');
  assert.equal(await page.evaluate(()=>DropBeatAppSession.safePath('/member-dashboard?view=settings','student')),'/member-dashboard?view=settings');
  assert.equal(await page.evaluate(()=>DropBeatAppSession.safePath('/coach-dashboard','student')),'');
  const portalText=await page.locator('body').innerText();assert.doesNotMatch(portalText,/Dance Studio|\bStudent\b/);
  await page.screenshot({path:join(output,'gym-member-dashboard-'+width+'.png'),fullPage:true});
  await page.goto(origin+'/coach-dashboard',{waitUntil:'load'});await page.waitForFunction(()=>!!window.DropBeatPortalModel);
  assert.equal(new URL(page.url()).pathname,'/coach-dashboard');
  assert.doesNotMatch(await page.locator('body').innerText(),/Dance Studio|\bStudent\b/);
  await page.screenshot({path:join(output,'gym-coach-dashboard-'+width+'.png'),fullPage:true});
  results.push('Public home, Member signup, Member dashboard role routing and Coach dashboard at '+width+'px');
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();
 await page.waitForFunction(()=>typeof window.newProduct==='function'&&!document.querySelector('#adminApp').hidden);
 await page.evaluate(()=>window.tab('products'));await page.evaluate(()=>window.newProduct());
 await page.locator('input[name="class_mapping_enabled"]').check();
 await page.waitForTimeout(500);
 const copy=await page.locator('body').innerText();assert.match(copy,/Fitness Specialt/);assert.match(copy,/Weightlifting/);assert.doesNotMatch(copy,/Hip Hop|Kuchipudi|\bStudent\b/);
 const placeholders=await page.locator('[placeholder]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('placeholder')));assert.doesNotMatch(placeholders.join('\n'),/\bstudents?\b|Hip Hop|Dance Studio/i);
 await page.screenshot({path:join(output,'gym-admin-plan-editor.png'),fullPage:true});
 results.push('Plan editor and placeholder audit: gym specialties with existing field names and action handlers');
 const manifest=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());
 assert.equal(manifest.name,'IronPulse Gym');assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
 results.push('Gym manifest and install icon inventory');
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();
 await page.waitForFunction(()=>typeof window.openClientDetails==='function');await page.evaluate(()=>window.openClientDetails('lead:1'));await page.locator('#ucClientModal').waitFor({state:'visible'});
 await page.evaluate(()=>{const button=[...document.querySelectorAll('[onclick]')].find(n=>(n.getAttribute('onclick')||'').startsWith("ucClientTab('payments'"));window.ucClientTab('payments',button);});
 await page.locator('#ucTabPayments [data-db149-payments="subscriptions"]').click();
 const subscriptions=page.locator('[data-db149-payment-view="subscriptions"]');await subscriptions.waitFor({state:'visible'});
 const bounds=await subscriptions.boundingBox();assert.deepEqual([bounds.x,bounds.y,bounds.width,bounds.height],[0,0,390,844]);
 await subscriptions.getByRole('button',{name:'Subscriptions & Payments Help',exact:true}).click();await page.locator('#db137ChoiceSheet').waitFor({state:'visible'});
 assert.doesNotMatch(await page.locator('#db137ChoiceSheet').innerText(),/\bStudent\b|Dance Studio/);
 await page.screenshot({path:join(output,'gym-mobile-fullscreen-help.png'),fullPage:true});
 await page.locator('#db137ChoiceSheet .db137-sheet-done').click();
 results.push('Existing full-screen payments modal and Info helper preserve viewport layout and gym terminology');
 await writeFile(join(output,'gym-branding-results.json'),JSON.stringify({results,synthetic:true,errors},null,2));
 await runNavigationWorkflows(args);
 assert.deepEqual(errors,[]);
 console.log('Gym branding and portal browser workflows passed.');
}
