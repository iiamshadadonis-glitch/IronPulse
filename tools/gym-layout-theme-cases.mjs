/* Synthetic, stateful UI fixtures; real Worker HTML, scripts and CSS. */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {layoutPayload} from '../functions/_lib/layout.js';
import {LAYOUT_THEMES,normalizeThemeLayout} from '../public/assets/layout-registry-v1-57.js';

export async function runLayoutThemeWorkflows({page,context,origin,output,errors}){
 const results=[],posts=[],settings={siteName:'IronPulse Gym',tagline:'Build strength. Build consistency.',frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8',logoUrl:'/assets/ironpulse-logo.svg',faviconUrl:'/assets/favicon.png',socials:[{key:'instagram',label:'Instagram',enabled:true,url:'https://example.test/ironpulse'}]},document={themes:{},names:{}},navigation={};
 let version=0,failSettings=false,failLayout=false;
 const model=(admin=false)=>layoutPayload({document,buttons:{},navigation,theme:settings.frontendTheme,contextRevision:'fixture-context-'+version,updatedAt:new Date(Date.UTC(2026,9,22,4,0,version)).toISOString()},{admin});
 const fixture=async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,body=request.method()==='POST'?JSON.parse(request.postData()||'{}'):null;
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(path==='/api/admin/settings'){
   if(body){posts.push({path,body});if(failSettings){failSettings=false;return reply({error:'Synthetic save failure. Try again.'},503);}if(body.frontendTheme!==settings.frontendTheme&&body.confirmation!=='confirm')return reply({error:'Type confirm'},400);const {confirmation,expectedTheme,...next}=body;Object.assign(settings,next);version++;}
   return reply({ok:true,settings});
  }
  if(path==='/api/admin/layout'){
   if(body){posts.push({path,body});if(failLayout){failLayout=false;return reply({error:'Synthetic layout failure. Try again.'},503);}const current=model(true);if(body.confirmation!=='confirm')return reply({error:'Type confirm'},400);if(body.theme!==settings.frontendTheme||body.expectedContextRevision!==current.contextRevision)return reply({error:'Layout changed. Reload.'},409);document.themes[body.theme]=normalizeThemeLayout(body.theme,body.layout);Object.assign(document.names,body.names);document.revision='fixture-revision-'+(++version);}
   return reply(model(true));
  }
  if(path==='/api/public/layout')return reply(model());
  if(path==='/api/public/button-dictionary'||path==='/api/admin/button-dictionary')return reply(model(path.startsWith('/api/admin/')).buttonDictionary);
  if(path==='/api/public/site'||path==='/api/public/bootstrap')return reply({ok:true,settings,navigation:[],navigationOrder:[],products:[],stories:[],banners:[]});
  if(path==='/api/portal/auth/context')return reply({ok:true,authenticated:true,key:'admin:1',role:'admin',status:'active',home:'/admin/',expires:'2027-01-01T00:00:00Z'});
  return route.fallback();
 };
 await context.route('**/api/**',fixture);
 let publicPage;
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready'&&!document.querySelector('#adminApp').hidden);
 const openLayout=async()=>{await page.evaluate(()=>window.tab('pages'));await page.locator('#pages>.tabs [data-db157-workspace="layout"]').click();await page.locator('#db157LayoutPanel:not([hidden]) .db157-block').first().waitFor();};
 const openTheme=async()=>{await page.evaluate(()=>window.ucV1652BrandTab('colors'));if(page.viewportSize().width<=760){await page.locator('#settings button[data-db145-view="theme"]').click();await page.locator('#settings [data-db146-settings-view="theme"]').click();}else await page.locator('#settings [data-db129-appearance="theme"]').click();await page.locator('#settings [data-db129-theme="minimal"]').waitFor();};
 const choose=async theme=>page.locator('#settings [data-db129-theme="'+theme+'"]').click();
 const saveSettings=async()=>{if(page.viewportSize().width<=760){const next=page.locator('#settings form [data-db137-next]');for(let i=0;i<3&&await next.isVisible();i++)await next.click();}await page.locator('#settings form').getByRole('button',{name:'Save Settings',exact:true}).click();};
 const themePosts=()=>posts.filter(p=>p.path==='/api/admin/settings');
 const layoutPosts=()=>posts.filter(p=>p.path==='/api/admin/layout');
 try{
  await page.evaluate(()=>sessionStorage.clear());await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(5500);
  console.log('[Layout] stable workspace and guarded re-entry');await openLayout();
  for(let i=0;i<4;i++){await page.locator('#pages>.tabs [data-page-workspace="existing"]').click();await page.locator('#pages>.tabs [data-db157-workspace="layout"]').click();}
  assert.equal(await page.locator('#db157LayoutPanel [data-db157-block="footer"]').count(),0);
  const reentry=await page.evaluate(async()=>{
   const owner=window[Symbol.for('ironpulse.pages.workspace')],old=window.tab;owner.leaveWorkspace();document.querySelector('#pages').classList.remove('active');let calls=0;
   window.tab=()=>{calls++;owner.activateWorkspace('layout');};try{owner.activateWorkspace('layout');}finally{window.tab=old;old('pages');}
   const duplicate=await import('/assets/gym-pages-workspace-v1-57.js?build=duplicate-test');return {calls,sameOwner:duplicate.activateWorkspace===owner.activateWorkspace};
  });assert.deepEqual(reentry,{calls:1,sameOwner:true});results.push('Repeated Layout/Existing Pages transitions, bounded route re-entry and a single workspace owner across module URLs');

  console.log('[Layout] theme previews and banner capabilities');await openTheme();await choose('minimal');await openLayout();
  await page.waitForFunction(()=>document.querySelector('[data-db157-theme]')?.textContent==='Modern Minimal');
  assert.equal(await page.locator('#db157LayoutPanel [data-db157-block="gallery"]').count(),0);assert.equal(await page.locator('[data-db157-save]').isDisabled(),true);
  await page.evaluate(()=>window.tab('banners'));await page.locator('[data-studio-gallery-manager]').first().waitFor({state:'attached'});assert.equal(await page.locator('[data-studio-gallery-manager]').first().isVisible(),false);
  await openTheme();assert.equal(await page.locator('#settings [name="frontendTheme"]').inputValue(),'minimal','Theme draft survives settings reload/navigation');
  for(const theme of ['casting','spotlight','dropbeat']){await choose(theme);await openLayout();await page.waitForFunction(name=>document.querySelector('[data-db157-theme]')?.textContent===name,LAYOUT_THEMES[theme].name);assert.equal(await page.locator('#db157LayoutPanel [data-db157-edit="gallery"]').count()>0,LAYOUT_THEMES[theme].gallery);await page.evaluate(()=>window.tab('banners'));assert.equal(await page.locator('[data-studio-gallery-manager]').first().isVisible(),LAYOUT_THEMES[theme].gallery);await openTheme();}
  results.push('All four theme schemas instantly update Layout and Banners; unsaved previews stay read-only and retain their selection');

  console.log('[Layout] theme confirmation, cancellation and recovery');await choose('minimal');const before=themePosts().length;await saveSettings();
  await page.locator('.db157-theme-warning').waitFor();assert.equal(await page.locator('[data-theme-publish]').isDisabled(),true);
  await page.locator('#db157ThemeConfirm').fill('Confirm');assert.equal(await page.locator('[data-theme-publish]').isDisabled(),true);
  await page.locator('.db157-theme-warning [data-theme-cancel]').last().click();assert.equal(themePosts().length,before);assert.equal(settings.frontendTheme,'dropbeat');
  await saveSettings();await page.locator('#db157ThemeConfirm').fill('confirm');failSettings=true;await page.locator('[data-theme-publish]').click();await page.locator('[data-theme-error]').filter({hasText:'Synthetic save failure'}).waitFor();assert.equal(settings.frontendTheme,'dropbeat');assert.equal(await page.evaluate(()=>window.dropbeatAdminState.settings.frontendTheme),'dropbeat','Failed publication does not commit the preview into Admin state');
  await page.locator('[data-theme-publish]').click();await page.locator('.db157-theme-warning').waitFor({state:'detached'});assert.equal(settings.frontendTheme,'minimal');assert.equal(themePosts().at(-1).body.confirmation,'confirm');assert.equal(themePosts().at(-1).body.expectedTheme,'dropbeat');
  await openLayout();await page.waitForFunction(()=>document.querySelector('[data-db157-theme]')?.textContent==='Modern Minimal'&&!document.querySelector('[data-db157-dirty]')?.textContent.includes('preview'));results.push('Theme changes require exact typed confirmation; cancellation makes no request and a failed save preserves the live theme');

  console.log('[Layout] independent viewport hide and layout confirmation');
  await page.locator('[data-db157-segment="mobile"]').click();await page.locator('[data-db157-remove="highlights"]').click();assert.match(await page.locator('[data-db157-block="highlights"]').innerText(),/Hidden on mobile/);
  await page.locator('[data-db157-segment="desktop"]').click();assert.doesNotMatch(await page.locator('[data-db157-block="highlights"]').innerText(),/Hidden on/);
  const beforeLayout=layoutPosts().length;await page.locator('[data-db157-save]').click();assert.equal(await page.locator('[data-db157-execute]').isDisabled(),true);await page.locator('#db157Confirm').fill('Confirm');assert.equal(await page.locator('[data-db157-execute]').isDisabled(),true);await page.locator('[data-db157-warning-close]').last().click();assert.equal(layoutPosts().length,beforeLayout);
  await page.locator('[data-db157-save]').click();await page.locator('#db157Confirm').fill('confirm');failLayout=true;await page.locator('[data-db157-execute]').click();await page.locator('[data-db157-save-error]').filter({hasText:'Synthetic layout failure'}).waitFor();await page.locator('[data-db157-execute]').click();await page.locator('.db157-layout-warning').waitFor({state:'detached'});
  assert.equal(document.themes.minimal.blocks.highlights.viewports.mobile.visibility,'hide');assert.equal(document.themes.minimal.blocks.highlights.removed,undefined);assert.equal(document.themes.minimal.blocks.highlights.viewports.desktop,undefined);results.push('Mobile hide preserves Desktop; exact layout confirmation, cancel, failure and retry publish only the intended viewport');

  console.log('[Layout] public cross-tab sync and immutable footer');publicPage=await context.newPage();publicPage.on('pageerror',error=>errors.push(error.stack||String(error)));await publicPage.goto(origin+'/?website=1',{waitUntil:'load'});await publicPage.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready');
  const footerSnapshot=()=>publicPage.evaluate(()=>{const footer=document.querySelector('.footer');return {html:footer.outerHTML.replace(/data-db157-name="[^"]*"/g,''),outside:!footer.closest('main'),credit:footer.querySelector('.designed')?.innerText,link:footer.querySelector('.designed a')?.getAttribute('href'),target:footer.querySelector('.designed a')?.target,rel:footer.querySelector('.designed a')?.rel};});
  await publicPage.waitForFunction(()=>document.querySelector('.footer .designed a')?.textContent==='Instautomate');const originalFooter=await footerSnapshot();assert.match(originalFooter.credit,/Website designed by Instautomate/);assert.equal(originalFooter.link,'https://instautomate.com');assert.equal(originalFooter.target,'_blank');assert.equal(originalFooter.rel,'noopener noreferrer');assert.equal(originalFooter.outside,true);
  await publicPage.setViewportSize({width:390,height:844});await publicPage.waitForFunction(()=>getComputedStyle(document.querySelector('.dropbeat-quick-strip')).display==='none');const mobileFooter=await footerSnapshot();await publicPage.setViewportSize({width:1440,height:1000});await publicPage.waitForFunction(()=>getComputedStyle(document.querySelector('.dropbeat-quick-strip')).display!=='none');
  let navigations=0;publicPage.on('framenavigated',frame=>{if(frame===publicPage.mainFrame())navigations++;});
  for(const theme of ['spotlight','casting','dropbeat']){await openTheme();await choose(theme);await saveSettings();await page.locator('#db157ThemeConfirm').fill('confirm');await page.locator('[data-theme-publish]').click();await page.locator('.db157-theme-warning').waitFor({state:'detached'});await publicPage.waitForFunction(theme=>window.DropBeatLayout?.snapshot()?.theme===theme,theme);for(const width of [390,1440]){await publicPage.setViewportSize({width,height:1000});await publicPage.waitForTimeout(80);const after=await footerSnapshot();assert.deepEqual(after,width===390?mobileFooter:originalFooter,'Footer structure, labels, links and socials remain the same for '+theme+' at '+width+'px');}}
  assert.equal(navigations,0,'Open public page updates without navigation or refresh');results.push('Public theme and viewport visibility update without hard refresh; identical Desktop/Mobile footer DOM/links/socials across all four themes');

  console.log('[Layout] responsive confirmations');await publicPage.close();publicPage=null;await page.setViewportSize({width:390,height:844});await openTheme();await choose('minimal');await saveSettings();
  await page.waitForTimeout(250);const mobile=await page.locator('.db157-theme-warning .db156-card').boundingBox();assert.ok(mobile.x<=2&&Math.abs(mobile.y+mobile.height-844)<3,'Mobile confirmation is a bottom sheet');await page.locator('.db157-theme-warning [data-theme-cancel]').last().click();
  await page.setViewportSize({width:1440,height:1000});await saveSettings();await page.waitForTimeout(250);const desktop=await page.locator('.db157-theme-warning .db156-card').boundingBox();assert.ok(desktop.x>100&&desktop.y>40&&Math.abs(desktop.x+desktop.width/2-720)<3,'Desktop confirmation is centered');await page.locator('.db157-theme-warning [data-theme-cancel]').last().click();results.push('Theme confirmation is a mobile bottom sheet and centered desktop dialog');
  assert.deepEqual(errors,[]);assert.doesNotMatch(await page.locator('body').innerText(),/Uncaught RangeError|Maximum call stack size exceeded/);
  await writeFile(join(output,'layout-theme-results.json'),JSON.stringify({pass:true,realWorker:origin.startsWith('https:'),syntheticApiData:true,results,settingsPosts:themePosts().length,layoutPosts:layoutPosts().length,pageErrors:errors},null,2)+'\n');console.log('Layout/theme browser workflows passed: '+results.length+' groups.');
 }finally{if(publicPage)await publicPage.close();await context.unroute('**/api/**',fixture);}
}
