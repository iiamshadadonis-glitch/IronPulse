import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {layoutPayload} from '../functions/_lib/layout.js';
import {normalizeThemeLayout} from '../public/assets/layout-registry-v1-57.js';
const palettes={dropbeat:['#4B55BE','#A469A8'],casting:['#9F1239','#FBBF24'],spotlight:['#111827','#F43F5E'],minimal:['#0F766E','#D97706']};

function fixtureState(){
 const settings={siteName:'IronPulse Gym',tagline:'Build strength. Build consistency.',frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8',logoUrl:'/assets/ironpulse-logo.svg',faviconUrl:'/assets/favicon.png',socials:[]},document={themes:{},names:{}},posts=[];
 let version=0,failSettings=false,failLayout=false,holdSettings=false,release,gate;
 const model=(admin=false)=>layoutPayload({document,buttons:{},navigation:{},theme:settings.frontendTheme,contextRevision:'rollback-context-'+version,updatedAt:new Date(Date.UTC(2026,9,22,9,0,version)).toISOString()},{admin});
 const route=async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,body=request.method()==='POST'?JSON.parse(request.postData()||'{}'):null;
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(path==='/api/admin/settings'){
   if(body){posts.push({path,body});if(holdSettings)await gate;if(failSettings){failSettings=false;return reply({error:'Synthetic save failure. Try again.'},503);}if(body.frontendTheme!==settings.frontendTheme&&body.confirmation!=='confirm')return reply({error:'Type confirm'},400);const {confirmation,expectedTheme,...next}=body;Object.assign(settings,next);version++;}
   return reply({ok:true,settings});
  }
  if(path==='/api/admin/layout'){
   if(body){posts.push({path,body});if(failLayout){failLayout=false;return reply({error:'Synthetic layout failure. Try again.'},503);}const current=model(true);if(body.confirmation!=='confirm')return reply({error:'Type confirm'},400);if(body.theme!==settings.frontendTheme||body.expectedContextRevision!==current.contextRevision)return reply({error:'Layout changed. Reload.'},409);document.themes[body.theme]=normalizeThemeLayout(body.theme,body.layout);Object.assign(document.names,body.names);document.revision='rollback-revision-'+(++version);}
   return reply(model(true));
  }
  if(path==='/api/public/layout')return reply(model());
  if(path==='/api/public/button-dictionary'||path==='/api/admin/button-dictionary')return reply(model(path.startsWith('/api/admin/')).buttonDictionary);
  if(path==='/api/public/site'||path==='/api/public/bootstrap')return reply({ok:true,settings,navigation:[],navigationOrder:[],products:[],stories:[],banners:[]});
  if(path==='/api/portal/auth/context')return reply({ok:true,authenticated:true,key:'admin:1',role:'admin',status:'active',home:'/admin/',expires:'2027-01-01T00:00:00Z'});
  return route.fallback();
 };
 return {settings,document,posts,model,route,theme(key){settings.frontendTheme=key;[settings.primaryColor,settings.accentColor]=palettes[key];version++;},failSettings(){failSettings=true;},failLayout(){failLayout=true;},hold(){holdSettings=true;gate=new Promise(resolve=>release=resolve);},release(){holdSettings=false;release?.();}};
}

async function appearanceSnapshots({context,origin,output,errors},state){
 const snapshots={};
 for(const theme of Object.keys(palettes))for(const width of [390,1440]){
  state.theme(theme);const view=await context.newPage();view.on('pageerror',error=>errors.push(error.stack||String(error)));
  try{
   await view.setViewportSize({width,height:1000});await view.goto(origin+'/?website=1',{waitUntil:'load'});
   await view.waitForFunction(theme=>document.documentElement.dataset.db159Layout==='ready'&&window.DropBeatLayout?.snapshot()?.theme===theme,theme);
   await view.evaluate(()=>document.fonts.ready);await view.waitForTimeout(300);
   snapshots[theme+'-'+width]=await view.evaluate(()=>{
    const properties=['display','color','backgroundColor','backgroundImage','fontFamily','fontSize','fontWeight','borderRadius','padding','margin','gap','gridTemplateColumns','flexDirection','textAlign'];
    const nodes={};for(const selector of ['.topbar','.hero-shell','.dropbeat-quick-strip','.dropbeat-welcome','#dropbeatStudioVisual','#featuredProducts','.how-section','.footer-grid']){
     const node=document.querySelector(selector);if(!node){nodes[selector]=null;continue;}const style=getComputedStyle(node),rect=node.getBoundingClientRect();nodes[selector]={...Object.fromEntries(properties.map(key=>[key,style[key]])),width:Math.round(rect.width),height:Math.round(rect.height)};
    }
    const root=getComputedStyle(document.documentElement);return {theme:document.documentElement.dataset.siteTheme,primary:root.getPropertyValue('--dropbeat-primary').trim(),accent:root.getPropertyValue('--dropbeat-accent').trim(),nodes};
   });
  }finally{await view.close();}
 }
 await writeFile(join(output,'appearance-snapshots.json'),JSON.stringify({snapshots,errors},null,2)+'\n');return snapshots;
}

export async function runAppearanceReference(args){
 const state=fixtureState();await args.context.route('**/api/**',state.route);
 try{await appearanceSnapshots(args,state);assert.deepEqual(args.errors,[]);console.log('V1.06 appearance reference captured: four themes at mobile and desktop widths.');}finally{await args.context.unroute('**/api/**',state.route);}
}

export async function runSelectiveRollbackWorkflows(args){
 const {page,context,origin,output,errors}=args,state=fixtureState(),{settings,posts}=state,results=[];
 await context.route('**/api/**',state.route);let publicPage;
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready'&&!document.querySelector('#adminApp').hidden);
 const openTheme=async()=>{await page.evaluate(()=>window.ucV1652BrandTab('colors'));if(page.viewportSize().width<=760){await page.locator('#settings button[data-db145-view="theme"]').click();await page.locator('#settings [data-db146-settings-view="theme"]').click();}else await page.locator('#settings [data-db129-appearance="theme"]').click();await page.locator('#settings [data-db129-theme="minimal"]').waitFor();};
 const saveSettings=async()=>{if(page.viewportSize().width<=760){const next=page.locator('#settings form [data-db137-next]');for(let i=0;i<3&&await next.isVisible();i++)await next.click();}await page.locator('#settings form').getByRole('button',{name:'Save Settings',exact:true}).click();};
 const openLayout=async()=>{await page.evaluate(()=>window.tab('pages'));const tab=page.locator('#pages>.tabs [data-db157-workspace="layout"]');if(await tab.isVisible())await tab.click();else{await page.locator('#pages>.tabs .db137-more-nav').click();await page.getByRole('button',{name:'Layout',exact:true}).filter({visible:true}).click();}await page.locator('#db157LayoutPanel:not([hidden]) .db157-block').first().waitFor();};
 const choose=theme=>page.locator('#settings [data-db129-theme="'+theme+'"]').click(),themePosts=()=>posts.filter(p=>p.path==='/api/admin/settings'),layoutPosts=()=>posts.filter(p=>p.path==='/api/admin/layout');
 try{
  console.log('[Rollback] compare V1.06 appearance at eight theme/viewport combinations');
  const actual=await appearanceSnapshots(args,state),reference=JSON.parse(await readFile(process.env.GYM_APPEARANCE_REFERENCE||new URL('../verification/ironpulse-v1.09/v106-appearance-reference.json',import.meta.url),'utf8'));
  assert.deepEqual(actual,reference.snapshots,'Public computed colours, dimensions, spacing and layout must match actual V1.06');results.push('All four public themes match V1.06 computed colours, typography, spacing and section dimensions at 390px and 1440px');
  state.theme('dropbeat');await page.evaluate(()=>{sessionStorage.clear();localStorage.clear();});await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(6200);

  console.log('[Rollback] desktop typed theme confirmation, cancel and retry');await openTheme();await choose('minimal');let before=themePosts().length;await saveSettings();await page.locator('.db157-theme-warning').waitFor();assert.equal(await page.locator('[data-theme-publish]').isDisabled(),true);
  await page.locator('#db157ThemeConfirm').fill('Confirm');assert.equal(await page.locator('[data-theme-publish]').isDisabled(),true);await page.locator('.db157-theme-warning [data-theme-cancel]').last().click();assert.equal(themePosts().length,before);assert.equal(settings.frontendTheme,'dropbeat');
  await saveSettings();await page.locator('#db157ThemeConfirm').fill('confirm');state.failSettings();await page.locator('[data-theme-publish]').click();await page.locator('[data-theme-error]').filter({hasText:'Synthetic save failure'}).waitFor();assert.equal(settings.frontendTheme,'dropbeat');await page.locator('[data-theme-publish]').click();await page.locator('.db157-theme-warning').waitFor({state:'detached'});assert.equal(settings.frontendTheme,'minimal');assert.equal(themePosts().at(-1).body.confirmation,'confirm');results.push('Desktop theme publication requires exact confirm; cancel sends nothing, failure stays retryable and confirmation fields remain transient');

  console.log('[Rollback] original colour/settings flow without theme confirmation');
  await openTheme();await choose('dropbeat');const preview=await page.evaluate(()=>({primary:getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-primary').trim(),accent:getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-accent').trim()}));assert.deepEqual(preview,{primary:'#4B55BE',accent:'#A469A8'});assert.equal(settings.frontendTheme,'minimal');
  await choose('minimal');await page.evaluate(()=>{const form=document.querySelector('#settings form');form.elements.primaryColor.value='#693AB8';form.elements.accentColor.value='#E08A30';});before=themePosts().length;state.hold();await saveSettings();await page.waitForFunction(()=>window.dropbeatAdminState?.settings?.primaryColor==='#693AB8');assert.equal(await page.locator('.db157-theme-warning').count(),0);assert.equal(themePosts().length,before+1);assert.equal(settings.primaryColor,'#0F766E','Held API request has not changed the live fixture');state.release();await page.waitForFunction(()=>document.querySelector('#settingsMsg')?.textContent.includes('saved'));assert.equal(settings.primaryColor,'#693AB8');assert.equal(themePosts().at(-1).body.confirmation,undefined);results.push('Recommended colour previews apply immediately; colour-only save retains V1.06 local assignment before API completion and requires no theme dialog');

  console.log('[Rollback] original editor and no unsaved theme-preview coupling');await openLayout();assert.equal(await page.locator('[data-db157-theme]').innerText(),'Modern Minimal');assert.equal(await page.locator('[data-db157-block="footer"]').count(),1,'Original V1.06 Footer editor is restored');
  await openTheme();await choose('spotlight');await openLayout();assert.equal(await page.locator('[data-db157-theme]').innerText(),'Modern Minimal','Unsaved theme selection does not replace the live Layout model');assert.equal(await page.locator('[data-db157-edit="gallery"]').count(),0);results.push('V1.06 Layout/Footer editor returns; an unsaved appearance selection does not inject a V1.07 theme preview into Layout');

  console.log('[Rollback] original Layout typed confirmation, cancel, failure and retry');
  await page.locator('[data-db157-edit="highlights"]').click();await page.locator('#db157-padding').fill('24');await page.locator('[data-db157-next]').click();await page.locator('[data-db157-next]').click();before=layoutPosts().length;
  await page.locator('[data-db157-save]').click();assert.equal(await page.locator('[data-db157-execute]').isDisabled(),true);await page.locator('#db157Confirm').fill('Confirm');assert.equal(await page.locator('[data-db157-execute]').isDisabled(),true);await page.locator('[data-db157-warning-close]').last().click();assert.equal(layoutPosts().length,before);
  await page.locator('[data-db157-save]').click();await page.locator('#db157Confirm').fill('confirm');state.failLayout();await page.locator('[data-db157-execute]').click();await page.locator('[data-db157-save-error]').filter({hasText:'Synthetic layout failure'}).waitFor();await page.locator('[data-db157-execute]').click();await page.locator('.db157-layout-warning').waitFor({state:'detached'});assert.equal(layoutPosts().at(-1).body.confirmation,'confirm');assert.equal(state.document.themes.minimal.blocks.highlights.viewports.desktop.padding,24);results.push('Original Layout edits retain exact typed confirmation, cancellation, failed-save feedback and successful retry');

  console.log('[Rollback] protected Instautomate attribution and original colour refresh');
  publicPage=await context.newPage();publicPage.on('pageerror',error=>errors.push(error.stack||String(error)));await publicPage.goto(origin+'/?website=1',{waitUntil:'load'});await publicPage.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready');
  for(const width of [390,1440]){await publicPage.setViewportSize({width,height:1000});await publicPage.waitForFunction(()=>document.querySelector('.footer .designed a')?.textContent==='Instautomate');const credit=await publicPage.locator('.footer .designed').innerText();assert.match(credit,/Website designed by Instautomate/);const link=publicPage.locator('.footer .designed a');assert.equal(await link.getAttribute('href'),'https://instautomate.com');assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');}
  assert.equal((await publicPage.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-primary').trim())).toUpperCase(),'#693AB8');results.push('Footer attribution stays Website designed by Instautomate with the safe outbound link on both viewports; the next public load receives saved custom colours');
  await publicPage.close();publicPage=null;

  console.log('[Rollback] mobile theme and Layout confirmation sheets');await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(6200);await openTheme();await choose('dropbeat');await saveSettings();await page.waitForTimeout(250);const mobile=await page.locator('.db157-theme-warning .db156-card').boundingBox();assert.ok(mobile.x<=2&&Math.abs(mobile.y+mobile.height-844)<3);await page.locator('#db157ThemeConfirm').fill('confirm');await page.locator('[data-theme-publish]').click();await page.locator('.db157-theme-warning').waitFor({state:'detached'});assert.equal(settings.frontendTheme,'dropbeat');
  await openLayout();await page.locator('[data-db157-edit="highlights"]').click();await page.locator('#db157-padding').fill('16');await page.locator('[data-db157-next]').click();await page.locator('[data-db157-next]').click();await page.locator('[data-db157-save]').click();await page.waitForTimeout(200);const layoutSheet=await page.locator('.db157-layout-warning .db156-card').boundingBox();assert.ok(layoutSheet.x<=2&&Math.abs(layoutSheet.y+layoutSheet.height-844)<3);await page.locator('[data-db157-warning-close]').last().click();results.push('Mobile theme publication and existing Layout confirmation use the unchanged bottom-sheet styling');

  await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();await page.waitForTimeout(6200);await openTheme();await choose('minimal');await saveSettings();await page.waitForTimeout(200);const desktop=await page.locator('.db157-theme-warning .db156-card').boundingBox();assert.ok(desktop.x>100&&Math.abs(desktop.x+desktop.width/2-720)<3);await page.locator('.db157-theme-warning [data-theme-cancel]').last().click();assert.deepEqual(errors,[]);results.push('Desktop confirmation remains centered; restored workflows produce no uncaught browser errors');
  await writeFile(join(output,'selective-rollback-results.json'),JSON.stringify({pass:true,realWorker:origin.startsWith('https:'),results,settingsPosts:themePosts().length,layoutPosts:layoutPosts().length,errors},null,2)+'\n');console.log('Selective rollback browser workflows passed: '+results.length+' groups.');
 }finally{state.release();if(publicPage)await publicPage.close();await context.unroute('**/api/**',state.route);}
}
