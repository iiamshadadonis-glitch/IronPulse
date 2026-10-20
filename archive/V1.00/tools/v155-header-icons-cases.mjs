import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Real shipped pages and original event handlers; the runner supplies local API fixtures.
export async function runWorkflows({page,origin,output,errors}){
 const results=[],contrastSamples=[],statementRequests=[],iconSamples=[];
 const phase=s=>console.log('V1.55 header/contrast: '+s);
 const settle=async()=>{await page.evaluate(()=>{window.DropBeatMobileUI?.refresh();window.DropBeatPortalMobilePolish?.refresh();window.DropBeatGlobalHeader?.refresh();});await page.waitForTimeout(220);};
 const box=locator=>locator.evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Viewport must not overflow horizontally');
 const nav=async name=>{await page.locator('[data-mobile-nav]').click();await page.locator('[data-portal-nav="'+name+'"]').click();await settle();};
 const closeOverlay=()=>page.locator('#db151NavigationOverlay .db151-close').click();
 const mode=async value=>{await page.evaluate(value=>document.documentElement.dataset.colorMode=value,value);await settle();};
 async function contrast(locator,label){
  const sample=await locator.evaluate(node=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
   const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((n,i)=>i===3?n/255:n);};
   const over=(a,b)=>a.slice(0,3).map((n,i)=>n*a[3]+b[i]*(1-a[3]));
   const nodes=[];for(let n=node;n;n=n.parentElement)nodes.unshift(n);
   let background=[255,255,255];for(const n of nodes)background=over(rgba(getComputedStyle(n).backgroundColor),background);
   const color=getComputedStyle(node).color,foreground=over(rgba(color),background);
   const lum=c=>c.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
   const [lo,hi]=[lum(background),lum(foreground)].sort((a,b)=>a-b);
   return {text:node.textContent.trim().slice(0,70),color,background,ratio:(hi+.05)/(lo+.05)};
  });
  contrastSamples.push({label,...sample});assert.ok(sample.ratio>=4.5,label+' contrast '+sample.ratio.toFixed(2)+' '+JSON.stringify(sample));
 }
 async function visibleText(selector,label){const nodes=page.locator(selector);let count=0;for(let i=0;i<await nodes.count();i++){const node=nodes.nth(i);if(await node.isVisible()&&(await node.textContent()).trim()){await contrast(node,label+' '+count);count++;}}assert.ok(count>0,'Missing contrast targets: '+label);}
 page.on('request',r=>{if(r.url().includes('/api/portal/payment-statement'))statementRequests.push(r.url());});

 phase('One full-width header, identical controls at 320/390/760px in all three portals');
 for(const role of ['student','coach','admin']){
  await page.setViewportSize({width:390,height:844});await page.goto(origin+(role==='admin'?'/admin/':'/'+role+'-dashboard.html'),{waitUntil:'load'});
  await page.waitForSelector('.db154-header');if(role!=='admin')await page.waitForFunction(()=>window.DropBeatPortalModel);
  if(role==='student'){await page.waitForSelector('#db151NavigationOverlay:not([hidden])');await page.getByRole('button',{name:'Dismiss',exact:true}).click();}
  for(const width of [320,390,760]){
   await page.setViewportSize({width,height:width===320?568:844});await settle();
   for(const colorMode of ['light','dark']){
    await mode(colorMode);const header=page.locator('.db154-header'),h=await box(header),menu=header.locator('[data-mobile-nav],[data-db134-mobile-menu]'),toggle=header.locator('.db125-color-mode-toggle');
    assert.equal(Math.round(h.x),0);assert.equal(Math.round(h.width),width);assert.equal(Math.round(h.height),64);
    assert.deepEqual(await header.locator(':scope>div[class^="db154-header-"]').evaluateAll(nodes=>nodes.map(n=>n.className)),['db154-header-leading','db154-header-title','db154-header-actions']);
    const controls=[menu,toggle];if(await header.locator('.db134-mobile-home').count())controls.push(header.locator('.db134-mobile-home'));
    for(const control of controls){
     const b=await box(control),isMenu=await control.evaluate(n=>n.matches('[data-mobile-nav],[data-db134-mobile-menu]'));assert.equal(b.width,32);assert.equal(b.height,32);assert.ok(b.x>=16&&b.right<=width-16);assert.equal(await control.evaluate(n=>getComputedStyle(n).borderRadius),isMenu?'8px':'50%');
     const svg=await box(control.locator('svg'));assert.equal(svg.width,16);assert.equal(svg.height,16);assert.ok(Math.abs(svg.x+8-b.x-16)<.1&&Math.abs(svg.y+8-b.y-16)<.1,'16px glyph centered inside 32px control');
     const hit=await control.evaluate(n=>{const s=getComputedStyle(n,'::before'),b=n.getBoundingClientRect(),points=[[-7,16],[39,16],[16,-7],[16,39],[-7,-7],[39,39]],reachable=points.every(([x,y])=>{const hit=document.elementFromPoint(b.x+x,b.y+y);return hit===n||n.contains(hit);});return {width:s.width,height:s.height,background:s.backgroundColor,reachable,margin:getComputedStyle(n).margin};});
     assert.equal(hit.width,'48px');assert.equal(hit.height,'48px');assert.equal(hit.background,'rgba(0, 0, 0, 0)');assert.equal(hit.margin,'0px');assert.equal(hit.reachable,true,role+' '+width+' '+colorMode+' invisible touch area must reach all edges and corners');
     iconSamples.push({role,viewport:width,colorMode,kind:isMenu?'menu':await control.getAttribute('aria-label')||'action',visible:b,svg,hit});
    }
    assert.equal(await header.locator('.db154-header-actions').evaluate(n=>getComputedStyle(n).gap),'16px');
    const m=await box(menu);assert.equal(m.x,16);assert.equal(await menu.locator('svg').count(),1);
    const title=header.locator('[data-dashboard-title],.db134-mobile-title');await contrast(title,role+' '+width+' '+colorMode+' header title');await noOverflow();
   }
  }
  await page.setViewportSize({width:390,height:844});await mode('light');await page.screenshot({path:join(output,'v155-'+role+'-header-light.png')});await page.evaluate(()=>{window.__v155ThemeClicks=0;document.querySelector('.db154-header .db125-color-mode-toggle').addEventListener('click',()=>window.__v155ThemeClicks++);});const themeHit=await box(page.locator('.db154-header .db125-color-mode-toggle'));await page.touchscreen.tap(themeHit.x-4,themeHit.y+16);await page.waitForFunction(()=>document.documentElement.dataset.colorMode==='dark');await settle();assert.equal(await page.evaluate(()=>window.__v155ThemeClicks),1,'One padded tap must execute the original theme action once');
  await page.screenshot({path:join(output,'v155-'+role+'-header-dark.png')});
  // Original menu event and backdrop, original avatar/settings binding.
  const menuTarget=page.locator('.db154-header [data-mobile-nav],.db154-header [data-db134-mobile-menu]'),menuHit=await box(menuTarget);await page.touchscreen.tap(menuHit.x-4,menuHit.y+16);assert.equal(await page.evaluate(role=>role==='admin'?document.body.classList.contains('db134-nav-open'):document.querySelector('.portal-app').classList.contains('nav-open'),role),true,'Padded menu tap opens the original drawer');
  const backdrop=page.locator(role==='admin'?'[data-db134-mobile-backdrop]':'.db151-drawer-backdrop');await backdrop.click({position:{x:370,y:300}});
  assert.equal(await page.evaluate(role=>role==='admin'?document.body.classList.contains('db134-nav-open'):document.querySelector('.portal-app').classList.contains('nav-open'),role),false);
  if(role!=='admin'){await page.getByRole('button',{name:'Open profile settings',exact:true}).click();await settle();assert.equal(await page.locator('[data-portal-view="settings"]').isVisible(),true);}
  await page.evaluate(()=>window.__v155OriginalControls={theme:document.querySelector('.db154-header .db125-color-mode-toggle'),menu:document.querySelector('.db154-header [data-mobile-nav],.db154-header [data-db134-mobile-menu]'),home:document.querySelector('.db154-header .db134-mobile-home')});
  for(let cycle=0;cycle<2;cycle++){
   await page.setViewportSize({width:1440,height:1000});await settle();assert.equal(await page.locator('.db154-header,.db154-header-leading,.db154-header-actions,.db154-header-title').count(),0);
   if(role!=='admin'){assert.equal(await page.locator('.portal-main>.portal-topbar').count(),1);assert.equal(await page.locator('.portal-topbar>.portal-identity>img').count(),1);assert.equal(await page.locator('.portal-topbar>[data-mobile-nav]').count(),1);}else{assert.equal(await page.locator('body>.db125-color-mode-toggle.db125-admin-toggle').count(),1);assert.equal(await page.locator('[data-db155-home-icon]').count(),0,'Original desktop Home glyph restored');}
   await page.setViewportSize({width:390,height:844});await settle();assert.equal(await page.locator('.db154-header').count(),1);assert.equal(await page.locator('.db154-header .db125-color-mode-toggle').count(),1);assert.equal(await page.evaluate(()=>document.querySelector('.db154-header .db125-color-mode-toggle')===window.__v155OriginalControls.theme&&document.querySelector('.db154-header [data-mobile-nav],.db154-header [data-db134-mobile-menu]')===window.__v155OriginalControls.menu&&document.querySelector('.db154-header .db134-mobile-home')===window.__v155OriginalControls.home),true,'Original controls survive desktop/mobile cycles');
  }
 }
 results.push('Admin/Coach/Student identical full-width 64px headers, 32px controls/16px glyphs, 8px menu corners/circular actions and 48px invisible touch areas, original theme/menu/avatar actions, two desktop restoration cycles and no width overflow');

 const home=page.locator('.db154-header .db134-mobile-home'),homeHit=await box(home);assert.equal(await home.getAttribute('href'),'/');await Promise.all([page.waitForURL(origin+'/'),page.touchscreen.tap(homeHit.x-4,homeHit.y+16)]);
 phase('Student dark row/tab text, settings form/review and ticket overlays');
 await page.goto(origin+'/student-dashboard.html',{waitUntil:'load'});await page.waitForSelector('.db154-header');await page.waitForFunction(()=>window.DropBeatPortalModel);await mode('dark');
 await nav('memberships');await page.getByRole('button',{name:'Current Membership Status',exact:true}).waitFor();
 await visibleText('.db151-membership-menu .db151-navigation-row>span','Membership navigation label');
 await visibleText('[data-membership-tab]:not(.active)','Inactive membership tab');
 await page.getByRole('button',{name:'Current Membership Status',exact:true}).click();await visibleText('#db151NavigationOverlay .membership-status-item strong,#db151NavigationOverlay .membership-status-item small,#db151NavigationOverlay .membership-status-item span','Membership sheet');await closeOverlay();
 await page.getByRole('button',{name:'Payment History',exact:true}).click();await visibleText('#db151NavigationOverlay td','Payment history card');await visibleText('#db151NavigationOverlay .portal-pill','Payment history status');await closeOverlay();
 await nav('tickets');await page.waitForSelector('.db153-ticket-hub');await visibleText('.db153-ticket-hub>.db151-navigation-row>span','Ticket navigation label');
 await page.getByRole('button',{name:'Your Tickets',exact:true}).click();await visibleText('#db151NavigationOverlay .empty-state','Tickets empty state');await closeOverlay();
 await page.getByRole('button',{name:'Create a Ticket',exact:true}).click();await page.locator('[data-ticket-form] [name="subject"]').fill('Dark mode verification');await page.locator('[data-ticket-form] [name="message"]').fill('Confirm clear review text.');await visibleText('[data-ticket-form] label','Ticket labels');await page.locator('[data-ticket-form] [data-db137-next]').click();await visibleText('[data-ticket-form] .db138-review dt,[data-ticket-form] .db138-review dd','Ticket review');assert.equal(await page.locator('[data-ticket-form] .db138-review input').count(),0);await page.locator('[data-ticket-form] .db138-page-header button').click();
 await nav('settings');
 for(const tab of ['profile','colors','login']){
  await page.locator('[data-settings-tab="'+tab+'"]').click();await settle();await visibleText('[data-settings] .db151-navigation-row>span',tab+' navigation');await visibleText('[data-settings-tab]:not(.active)','Inactive settings tab');
 }
 await page.locator('[data-settings-tab="profile"]').click();await settle();await page.getByRole('button',{name:'Profile Settings',exact:true}).click();
 const form=page.locator('[data-v116-profile]');await form.locator('[name="name"]').fill('Contrast Student');await visibleText('[data-v116-profile] label','Profile form labels');await form.locator('[data-db137-next]').click();await visibleText('[data-v116-profile] .db138-review dt,[data-v116-profile] .db138-review dd','Profile review');await contrast(form.locator('[data-db137-finish]'),'Primary save button');await page.screenshot({path:join(output,'v155-profile-review-dark.png')});await form.locator('.db138-page-header button').click();
 await page.locator('[data-settings-tab="colors"]').click();await settle();await page.getByRole('button',{name:'Dashboard Colours',exact:true}).click();await visibleText('[data-v116-colors] label','Dashboard colours form labels');await page.locator('[data-v116-colors] .db138-page-header button').click();
 await page.locator('[data-settings-tab="login"]').click();await settle();await page.getByRole('button',{name:'Login Information',exact:true}).click();await visibleText('[data-v116-login] label','Login form labels');await page.locator('[data-v116-login] .db138-page-header button').click();
 await page.getByRole('button',{name:'Connect Google Account',exact:true}).click();await visibleText('#db151NavigationOverlay h3,#db151NavigationOverlay p','Google account overlay');await closeOverlay();
 results.push('Actual WCAG text contrast >=4.5:1 for dark Memberships/Tickets rows, inactive tabs, payment/history/Google sheets, settings labels, read-only review data and primary Save');

 phase('Filter Apply primary styling, safe footer, original filter grid and request binding');
 await nav('memberships');await page.locator('.db151-statement-fab').click();const modal=page.locator('#db117StatementModal');await modal.locator('.db117-statement-summary').waitFor();await settle();
 for(const colorMode of ['light','dark']){
  await mode(colorMode);await visibleText('#db117StatementModal .db117-statement-meta small,#db117StatementModal .db117-statement-meta strong,#db117StatementModal .db117-statement-summary small,#db117StatementModal .db117-statement-summary strong',colorMode+' Statement summary');await visibleText('#db117StatementModal .portal-pill',colorMode+' Statement status');const before=statementRequests.length;await modal.locator('.db153-statement-filter').click();const sheet=modal.locator('.db140-filter-overlay:not([hidden])');await sheet.waitFor();assert.equal(statementRequests.length,before);
  const apply=sheet.locator('[data-db140-apply]'),style=await apply.evaluate(n=>{const s=getComputedStyle(n);return {background:s.backgroundColor,color:s.color,radius:s.borderRadius};}),reference=await page.evaluate(()=>{const n=document.createElement('div');n.style.background='var(--db151-primary)';document.body.append(n);const c=getComputedStyle(n).backgroundColor;n.remove();return c;});
  assert.equal(style.background,reference);assert.equal(style.color,'rgb(255, 255, 255)');assert.equal(style.radius,'10px');await contrast(apply,colorMode+' Filter Apply');const a=await box(apply),footer=sheet.locator('footer'),f=await box(footer);assert.ok(a.height>=48&&f.bottom<=await page.evaluate(()=>innerHeight)+1);assert.equal(await footer.evaluate(n=>getComputedStyle(n).paddingBottom),'16px');
  const fields=sheet.locator('.portal-field'),period=await box(fields.nth(0)),from=await box(fields.nth(1)),to=await box(fields.nth(2));assert.ok(period.width>from.width*1.9&&Math.abs(from.y-to.y)<2);
  await sheet.locator('[data-statement-filters]').evaluate(form=>{form.elements.period.value='custom';form.elements.period.dispatchEvent(new Event('change',{bubbles:true}));form.elements.from.value='2026-09-01';form.elements.to.value='2026-10-18';});await page.screenshot({path:join(output,'v155-filter-'+colorMode+'.png')});await apply.click();await page.waitForFunction(()=>document.querySelector('#db117StatementModal .db140-filter-overlay').hidden);await modal.locator('.db117-statement-summary').waitFor();assert.ok(statementRequests.slice(before).some(url=>url.includes('from=2026-09-01')&&url.includes('to=2026-10-18')));
 }
 await modal.locator('.db117-statement-head [data-statement-close]').click();await noOverflow();results.push('Light/dark solid primary full-width Apply, white readable text, 48px target, safe footer, original odd/even fields and custom-date GET/dismiss behavior without requests on open');
 assert.deepEqual(errors,[]);await writeFile(join(output,'v155-header-contrast-results.json'),JSON.stringify({results,iconSamples,contrastSamples,minimumContrast:Math.min(...contrastSamples.map(s=>s.ratio)),statementRequests,errors,synthetic:true},null,2));console.log('V1.55 header/contrast browser regression passed: '+results.length+' workflow groups, '+contrastSamples.length+' measured text contrasts.');
}
