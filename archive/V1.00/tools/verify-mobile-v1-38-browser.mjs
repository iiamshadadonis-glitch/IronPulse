/* Browser regression tests use synthetic API data only. No gateway or live account is contacted. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,join} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DROPBEAT_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.DROPBEAT_TEST_ROOT||fileURLToPath(new URL('../',import.meta.url)));
const output=resolve(process.env.DROPBEAT_TEST_OUTPUT||join(root,'browser-verification'));
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const target=join(root,'public',path.endsWith('/')?path+'index.html':path);
  try{const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Missing fixture asset');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.DROPBEAT_CHROMIUM_PATH?{executablePath:process.env.DROPBEAT_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage(),errors=[],writes=[];
page.on('pageerror',error=>errors.push(error.stack||String(error)));
const coach={id:1,name:'Example Coach',status:'active',designation:'Dance Coach',dance_styles:['Kuchipudi'],availability:['mon','tue','wed'],class_types:['online_class'],availability_slots_json:JSON.stringify([{day:'mon',start:'10:00',end:'11:00',danceStyles:['Kuchipudi'],classTypes:['online_class']}])};
const products=[{id:1,name:'Online Dance Pass',slug:'online-dance-pass',sku:'PASS',status:'active',short_description:'Beginner online classes',regular_price_paise:39900,offer_price_paise:19900,offer_price_enabled:1,payment_type:'subscription',billing_period:'monthly',billing_interval:1,trial_enabled:1,trial_amount_paise:100,trial_value:7,trial_unit:'days',features:['Live classes'],images:[],class_mapping:{enabled:1,class_name:'Beginners Session',coach_id:1,class_type:'online_class',class_days:['mon','tue','wed'],class_time:'10:00',duration_minutes:60,dance_styles:['Kuchipudi'],days_per_week:3}},{id:2,name:'Studio Membership',slug:'studio-membership',status:'active',regular_price_paise:59900,offer_price_paise:34900,offer_price_enabled:1,trial_enabled:0,payment_type:'subscription',billing_period:'monthly',billing_interval:1,images:[],features:[]},{id:3,name:'Single Price',slug:'single-price',status:'active',regular_price_paise:50000,offer_price_enabled:0,trial_enabled:0,payment_type:'one_time',images:[],features:[]}];
const order={id:1,order_id:'TEST-ORDER-1',gateway_subscription_id:'TEST-SUB-1',customer_name:'Example Customer',customer_phone:'919876543210',customer_email:'example@example.test',order_type:'trial',status:'active',payment_status:'paid',gateway:'razorpay',received_paise:100,amount_paise:19900,recurring_charge_paise:19900,created_at:'2026-10-13 10:00:00'};
const base={ok:true,rows:[],items:[],records:[],inquiries:[],requests:[],tickets:[],sources:[],visitors:[],leads:[],flows:[],campaigns:[],funnels:[],events:[],members:[],occurrences:[],holidays:[],studioHolidays:[],students:[],coaches:[coach],products,settings:{siteName:'DropBeat Dance Studio',primaryColor:'#4B55BE',accentColor:'#A469A8',adminHelpEnabled:true,frontendTheme:'dropbeat',timezone:'Asia/Kolkata'},new_orders:[order],pending_orders:[],existing_orders:[order],cancelled_orders:[],cancelled_subscriptions:[],subscriptions:[],stats:{totalLeads:12,activeSubscriptions:4,newOrders:1},summary:{},counts:{total:4,active:4,successful:1},start:'2026-10-01',end:'2026-10-13',last_changed_at:'2026-10-13 10:00:00',updated_at:'2026-10-13 10:00:00',user:{id:1,email:'admin@example.test',name:'Test Admin',role:'admin'},capabilities:{},integrations:{},gateways:{},marketing:{},webinars:{},payment_link:'/checkout?test=1',order_id:'TEST-LINK-1',message:'Synthetic test completed'};
await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin){await route.abort();return;}
  if(url.pathname.startsWith('/api/')){
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    if(url.pathname==='/api/portal/dashboard'){
      const role=(request.headers().referer||'').includes('coach-dashboard')?'coach':'student';
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,account:{id:1,role,status:'active',displayName:'Example '+role,email:'example@example.test'},profile:{},schedule:[],assignments:[],subscriptions:[],notifications:[],scheduleRequests:[]})});return;
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(base)});return;
  }
  await route.continue();
});
const visibleNames=id=>page.evaluate(id=>[...document.querySelector('#'+id).querySelectorAll('input,select,textarea')].filter(el=>el.type!=='hidden'&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.classList.contains('db137-native-control')).map(el=>el.name),id);
const layout=()=>page.evaluate(()=>[...document.querySelectorAll('#dashboard .dashboard-cards')].map(container=>({rows:container.dataset.db137Rows,dots:[...container.parentElement.querySelectorAll('.db136-carousel-dots,.db137-carousel-dots')].map(d=>({class:d.className,count:d.querySelectorAll('button').length})),width:container.clientWidth,scrollWidth:container.scrollWidth,classes:container.className,firstWidth:container.firstElementChild?.getBoundingClientRect().width,margin:getComputedStyle(container).marginLeft}))); 
try{
  await page.goto(origin+'/admin/',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  const initial=await layout();
  await page.waitForTimeout(process.env.DROPBEAT_FAST_TEST?1000:10000);
  const settled=await layout();
  await writeFile(join(output,'initial-vs-settled.json'),JSON.stringify({initial,settled,errors},null,2));
  if(process.env.DROPBEAT_DIAGNOSE){console.log(JSON.stringify({initial,settled,errors:errors.slice(0,8)},null,2));await page.screenshot({path:join(output,'diagnose.png'),fullPage:true});}
  else{
    assert.ok(settled.length>=3,'actual dashboard metric groups exist');
    for(const area of settled){assert.equal(area.dots.length,1,'one pagination owner per group');assert.equal(area.margin,'0px');assert.ok(Math.abs(area.firstWidth-(area.width-10)/2)<2,'two complete cards fit');assert.ok(['1','2'].includes(area.rows));}
    assert.deepEqual(initial.map(a=>[a.rows,a.dots]),settled.map(a=>[a.rows,a.dots]),'delayed installers must not change layout/dots');
    await page.evaluate(()=>document.querySelector('#dashboard .dashboard-cards').scrollTo({left:200}));await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'swiping stays inside the dashboard');
    await page.locator('#dashboard button[onclick*="customSubscription"]').click();await page.waitForTimeout(300);
    let bounds=await page.locator('#customSubscription').boundingBox();assert.equal(Math.round(bounds.x),0);assert.equal(Math.round(bounds.y),0);assert.equal(Math.round(bounds.width),390);assert.equal(Math.round(bounds.height),844);
    assert.deepEqual((await visibleNames('subscriptionBox')).filter(name=>name&&/class|billing|amount|coach|duration|start_date/.test(name)),[],'Customer step contains no Class or Payment input');
    await page.locator('#subscriptionBox [name="customer_name"]').fill('Example Customer');await page.locator('#subscriptionBox [name="customer_phone"]').fill('919876543210');await page.locator('#subscriptionBox [name="customer_email"]').fill('example@example.test');
    await page.locator('#subscriptionBox [data-db137-next]').click();
    assert.equal(await page.locator('#subscriptionBox [name="class_name"]').isVisible(),true);assert.equal(await page.locator('#subscriptionBox [name="subscription_amount"]').isVisible(),false);
    await page.locator('#subscriptionBox [name="class_name"]').fill('Example Class');
    await page.locator('#subscriptionBox [name="coach_id"]+.db137-select-trigger').click();await page.getByRole('button',{name:/Example Coach — Dance Coach/}).click();
    await page.locator('#subscriptionBox [data-db108-styles]+.db137-choice-trigger').click();await page.locator('#db137ChoiceSheet button').filter({hasText:/^Kuchipudi$/}).click();await page.locator('[data-db137-sheet-close]').last().click();
    await page.locator('#subscriptionBox [name="days_per_week"]+.db137-select-trigger').click();await page.locator('#db137ChoiceSheet button').filter({hasText:/^1 day$/}).click();
    await page.locator('#subscriptionBox [data-db137-next]').click();assert.equal(await page.locator('#subscriptionBox [name="subscription_amount"]').isVisible(),true);assert.equal(await page.locator('#subscriptionBox [name="class_name"]').isVisible(),false);
    await page.locator('#subscriptionBox [data-db137-next]').click();assert.equal(await page.locator('#subscriptionBox').getAttribute('data-db137-current'),'2','invalid amount prevents Continue');
    await page.locator('#subscriptionBox [name="subscription_amount"]').fill('349');await page.locator('#subscriptionBox [data-db137-next]').click();assert.equal(await page.locator('#subscriptionBox .db138-review').isVisible(),true);
    const footer=await page.locator('#subscriptionBox .db137-wizard-nav').boundingBox();await writeFile(join(output,'form-layout.json'),JSON.stringify({footer,panel:await page.locator('#customSubscription').boundingBox(),form:await page.locator('#subscriptionBox').boundingBox()},null,2));assert.ok(Math.abs(footer.y+footer.height-844)<2,'navigation footer stays inside viewport');
    await page.locator('#subscriptionBox [data-db137-finish]').first().click();await page.waitForTimeout(2500);
    const created=writes.find(write=>write.path==='/api/admin/custom-subscription');await writeFile(join(output,'submit-diagnostics.json'),JSON.stringify({writes,message:await page.locator('#customSubscriptionMsg').textContent(),errors},null,2));assert.ok(created,'existing subscription submit handler is invoked');const payload=JSON.parse(created.body);assert.equal(payload.customer_name,'Example Customer');assert.equal(Number(payload.subscription_amount),349);assert.equal(payload.class_name,'Example Class');
    await page.locator('[data-db138-payment-close]').click();assert.equal(await page.locator('#customSubscription').isVisible(),false);assert.equal(await page.locator('#salesHub').isVisible(),true,'Close stays in Sales');
    await page.locator('[data-uc84-sales="customSubscription"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('#customSubscription').isVisible(),true);
    await page.locator('#customSubscription .tabs button').nth(1).click();await page.waitForTimeout(100);assert.equal(await page.locator('#subscriptionBox').isVisible(),false);assert.equal(await page.locator('#oneTimeBox').isVisible(),true);
    assert.equal(await page.locator('#oneTimeBox [name="amount"]').isVisible(),false,'one-time payment hides Payment until its step');await page.locator('#oneTimeBox [data-db137-next]').click();assert.equal(await page.locator('#oneTimeBox [name="class_name"]').isVisible(),true);
    await page.locator('[data-db138-payment-close]').click();await page.locator('[data-uc84-sales="products"]').click();await page.waitForTimeout(300);
    assert.equal(await page.locator('#products .uc-plan-next-step').isVisible(),false);assert.equal(await page.locator('#products .db138-product-fab').isVisible(),true);
    const price=await page.locator('#productTable tbody tr').first().locator('.db138-plan-price-values').evaluate(el=>[...el.querySelectorAll('s,strong')].map(node=>Math.round(node.getBoundingClientRect().y)));assert.equal(new Set(price).size,1,'regular/offer/trial are on one row');
    await page.locator('#products .db138-product-fab').click();await page.waitForTimeout(250);
    bounds=await page.locator('#productModal .modal-card').boundingBox();assert.equal(Math.round(bounds.x),0);assert.equal(Math.round(bounds.width),390);assert.equal(Math.round(bounds.height),844);
    assert.equal(await page.locator('#productForm [name="regular_price_rupees"]').isVisible(),false);assert.equal(await page.locator('#productForm [name="name"]').isVisible(),true);
    await page.locator('#productForm [name="name"]').fill('New Mobile Plan');await page.locator('#productForm [data-db137-next]').click();assert.equal(await page.locator('#productForm [name="regular_price_rupees"]').isVisible(),true);assert.equal(await page.locator('#productForm [name="name"]').isVisible(),false);
    await page.locator('#productModal .uc-plan-help-btn').click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.ok((await page.locator('.db138-help-copy').textContent()).includes('Billing'));assert.equal(await page.locator('#productForm [name="regular_price_rupees"]').isVisible(),true,'help sheet does not flip/hide the form');await page.locator('[data-db137-sheet-close]').last().click();
    await page.locator('#productModal .db138-icon-button[data-db138-icon="close"]').click();
    await page.evaluate(()=>window.tab('orders'));await page.waitForTimeout(300);
    assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>[data-uc86-hub-target]').count(),4);assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>.db137-more-nav').count(),0);
    assert.equal(await page.locator('#orders .uc86-order-tabs>button:not(.db137-nav-overflow)').count(),3);
    assert.equal(await page.locator('#orders .db137-filter-nav').count(),0);
    assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>.db138-search-toggle').count(),1);assert.equal(await page.locator('#orderSearch').isVisible(),false);await page.locator('#operationsHub>.uc86-hub-tabs>.db138-search-toggle').click();assert.equal(await page.locator('#orderSearch').isVisible(),true);
    assert.equal(await page.locator('[data-order-bucket="new"]>summary .db138-header-icons>.db138-icon-button').count(),3,'New Orders has Search, Help and Download icons');
    await page.evaluate(()=>window.tab('subscribers'));await page.waitForTimeout(250);assert.equal(await page.locator('#subscribers>.top .db138-search-toggle').count(),1);await page.locator('#subscribers>.top .db138-search-toggle').click();assert.equal(await page.locator('#subscriberSearch').isVisible(),true);
    await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await page.waitForTimeout(60);
    assert.equal(await page.locator('#customersHub>.uc86-hub-tabs').isVisible(),true);assert.equal(await page.locator('#subscribers>.top .db138-search-toggle').isVisible(),true);
    await page.screenshot({path:join(output,'mobile-customers-dark.png'),fullPage:true});
    const desktop=await context.newPage();await desktop.setViewportSize({width:1366,height:900});await desktop.goto(origin+'/admin/',{waitUntil:'load'});await desktop.waitForTimeout(1200);
    assert.equal(await desktop.locator('body').evaluate(el=>el.classList.contains('db138-mobile')),false,'desktop controller remains inactive');
    assert.equal(await desktop.locator('#subscriptionBox .db137-wizard-progress').count(),0,'desktop form is not rewritten');
    assert.equal(await desktop.locator('.db138-product-fab').count(),0,'desktop Add Plan button remains original');
    await desktop.close();
    for(const role of ['student','coach']){
      const portal=await context.newPage();portal.on('pageerror',e=>errors.push(role+': '+e.stack));await portal.goto(origin+'/'+role+'-dashboard.html',{waitUntil:'load'});await portal.waitForTimeout(1200);
      assert.equal(await portal.locator('body').evaluate(el=>el.classList.contains('db138-mobile')),true,role+' mobile controller initialized');
      assert.equal(await portal.locator('[data-dashboard-title]').textContent(),role==='coach'?'Coach Dashboard':'Student Dashboard');
      await portal.locator('[data-mobile-nav]').click();await portal.locator('[data-portal-nav="settings"]').click();await portal.waitForTimeout(200);
      assert.ok(await portal.locator('.db138-open-form').count()>0,role+' forms have mobile launchers');
      await portal.locator('.db138-open-form').first().click();
      const opened=portal.locator('.db138-inline-form-open');const rect=await opened.boundingBox();assert.equal(Math.round(rect.width),390);assert.equal(Math.round(rect.height),844);
      await opened.locator('.db138-page-header button').click();assert.equal(await opened.count(),0,role+' full-screen form closes locally');
      await portal.close();
    }
    assert.equal(errors.some(error=>error.includes('dropbeat-dashboard-mobile-v1-38.js')),false,'new controller has no browser exceptions');
    assert.equal(errors.some(error=>error.includes('dropbeat-dashboard-mobile-v1-38.js')),false);
    console.log('V1.38 Chromium checks passed: delayed stability, containment, fullscreen, semantic steps, validation, original submit payload, mode isolation, close/reopen, price row, help sheet, Orders/customer headers, desktop isolation and Student/Coach forms.');
  }
  await writeFile(join(output,'browser-errors.json'),JSON.stringify(errors,null,2));
}catch(error){await page.screenshot({path:join(output,'failure.png'),fullPage:true});await writeFile(join(output,'failure-errors.json'),JSON.stringify(errors,null,2));throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
