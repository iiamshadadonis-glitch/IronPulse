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
const pageStats=['/checkout','/','/contact','/about','/faq'].map((path,index)=>({path,visits:9-index,time_spent_ms:10000}));
const clients=Array.from({length:3},(_,index)=>({id:index+1,lead_id:index+1,name:['Rohan','Pallavi','Example Customer'][index],phone:'919876543210',email:'customer.long@example.test',status:'new',interest_level:'Warm',visit_count:23,service_count:2,next_action:'Call about plan',follow_up_date:'2026-10-20',page_stats:pageStats,first_visit:'2026-09-29 10:00:00',last_visit:'2026-10-13 10:00:00',traffic_source:'google'}));
let savedImages=[{id:21,product_id:1,public_url:'/assets/product-generic.svg',source_url:'/assets/product-generic.svg',alt_text:'Existing scrolling image',is_cover:1,sort_order:1}];
await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin){
    if(url.hostname==='example.test'&&url.pathname.endsWith('.png')){await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="900" height="1100" fill="#4B55BE"/><text x="50" y="200" fill="white" font-size="65">Dance Image</text></svg>'});return;}
    await route.abort();return;
  }
  if(url.pathname.startsWith('/api/')){
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    if(url.pathname==='/api/admin/client-crm'&&url.searchParams.get('mode')==='search'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,rows:clients})});return;}
    if(url.pathname==='/api/admin/client-crm'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,client:clients[0],analytics:{visit_count:23,time_spent_ms:6157000,first_visit:clients[0].first_visit,last_visit:clients[0].last_visit,pages:pageStats,sources:[{source:'google',visits:23}]},summary:{order_count:2,payment_count:1,service_count:2,total_paid_paise:34900}})});return;}
    if(url.pathname==='/api/admin/media'){
      if(url.searchParams.has('source_url')){await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="900" height="1100" fill="#4B55BE"/></svg>'});return;}
      if(request.method()==='POST'){savedImages.push({id:22,product_id:1,public_url:'/assets/product-generic.svg',alt_text:'New image',is_cover:0,sort_order:2});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,image_id:22,source_url:'https://example.test/new-image.png',images:savedImages})});return;}
      if(request.method()==='PUT'){const data=JSON.parse(request.postData());if(data.action==='move')savedImages.reverse();}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,images:savedImages})});return;
    }
    if(url.pathname==='/api/admin/import-products'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,created:2,updated:0,errors:[]})});return;}
    if(url.pathname==='/api/admin/contacts'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,total:1,contacts:[{id:1,name:'Example Contact',phone:'919876543210',email:'long.example.email.address@example.test',location:'Example City',source:'website',updated_at:'2026-10-13 10:00:00'}]})});return;
    }
    if(url.pathname==='/api/admin/analytics'){
      const rows=['paid','cancelled','failed'].flatMap((category,index)=>Array.from({length:13},(_,day)=>({day:'2026-10-'+String(day+1).padStart(2,'0'),category,count:(day+index)%4,amount_paise:34900})));
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,rows,business:rows})});return;
    }
    if(url.pathname==='/api/admin/attendance'){
      const student={accountId:1,memberId:1,name:'Example Student',email:'student@example.test',phone:'919876543210',paymentStatus:'paid',paymentMode:'subscription',lastPaymentAt:'2026-10-13 10:00:00',attendanceStatus:'absent'};
      const sessions=[{sessionKey:'fixture-session',date:'2026-10-13',className:'Example Class',classType:'online_class',coachId:1,coachName:'Example Coach',enrolled:2,studentPresent:0,durationMinutes:60,startsAt:'2026-10-13T10:00:00+05:30',status:'scheduled',reviewCount:0}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,from:'2026-10-01',to:'2026-10-31',date:'2026-10-13',sessions,students:[student],present:[],absent:[student]})});return;
    }
    if(url.pathname==='/api/admin/dance-studio'&&url.searchParams.get('mode')==='workspace'){
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),eventType=url.searchParams.get('eventType')||'online_class';
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,month:today.slice(0,7),occurrences:[{key:'example-session',sessionDate:today,startsAt:today+'T10:00:00+05:30',title:'Beginners Session',classType:eventType,coachId:1,coachName:'Example Coach',memberCount:2,durationMinutes:60,danceStyles:['Kuchipudi']}],currentMembers:[],pastMembers:[]})});return;
    }
    if(url.pathname==='/api/admin/marketing-suite'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,cells:[{element_key:'Example section',event_count:12,duration_ms:24000,x_bucket:5,y_bucket:20,visitors:2}],paths:[{path:'/',label:'Home'}],mapType:'heat',path:'/'})});return;
    }
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
    await page.locator('[data-db138-payment-close]').click();assert.equal(await page.locator('#customSubscription .db143-subscription-launch').isVisible(),true,'Close returns to the Sales launcher');assert.equal(await page.locator('#subscriptionBox').isVisible(),false);assert.equal(await page.locator('#salesHub').isVisible(),true,'Close stays in Sales');
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
    await page.locator('#productModal [data-db139-source*="uc-plan-help-btn"]').click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.ok((await page.locator('.db138-help-copy').textContent()).includes('Billing'));assert.equal(await page.locator('#productForm [name="regular_price_rupees"]').isVisible(),true,'help sheet does not flip/hide the form');await page.locator('[data-db137-sheet-close]').last().click();
    await page.locator('#productModal [data-db139-action="close"]').click();
    await page.evaluate(()=>window.tab('orders'));await page.waitForTimeout(300);
    assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>[data-uc86-hub-target]').count(),4);assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>.db137-more-nav').count(),0);
    assert.equal(await page.locator('#orders .uc86-order-tabs>button:not(.db137-nav-overflow)').count(),3);
    assert.equal(await page.locator('#orders .db137-filter-nav').count(),0);
    assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>.db138-search-toggle').count(),1);assert.equal(await page.locator('#orderSearch').isVisible(),false);await page.locator('#operationsHub>.uc86-hub-tabs>.db138-search-toggle').click();assert.equal(await page.locator('#orderSearch').isVisible(),true);
    assert.equal(await page.locator('[data-order-bucket="new"]>summary .db138-header-icons>.db138-icon-button').count(),3,'New Orders has Search, Help and Download icons');
    assert.equal(await page.locator('#operationsHub>.uc86-hub-tabs>.db138-search-toggle').evaluate(el=>Math.round(el.getBoundingClientRect().width)),28);
    const duplicateBadges=await page.locator('[data-order-bucket="new"]>summary [class*="badge"]').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);assert.equal(duplicateBadges,0,'record header does not repeat navigation notifications');
    await page.locator('#orders .uc86-order-tabs>.db137-more-nav').click();assert.ok((await page.locator('#db137ChoiceSheet .selected').evaluate(el=>getComputedStyle(el,'::after').content)).includes('✓'),'selected sheet item uses a tick');await page.locator('[data-db137-sheet-close]').last().click();
    await page.evaluate(()=>window.tab('subscribers'));await page.waitForTimeout(250);assert.equal(await page.locator('#subscribers>.top .db138-search-toggle').count(),1);await page.locator('#subscribers>.top .db138-search-toggle').click();assert.equal(await page.locator('#subscriberSearch').isVisible(),true);
    await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await page.waitForTimeout(60);
    assert.equal(await page.locator('#customersHub>.uc86-hub-tabs').isVisible(),true);assert.equal(await page.locator('#subscribers>.top .db138-search-toggle').isVisible(),true);
    await page.screenshot({path:join(output,'mobile-customers-dark.png'),fullPage:true});
    await page.evaluate(()=>document.documentElement.dataset.colorMode='light');
    const aligned=async(selector,titleSelector)=>{
      const geometry=await page.locator(selector).evaluate((head,titleSelector)=>{
        const title=head.querySelector(titleSelector),icons=head.querySelector('.db138-header-icons');
        const t=title?.getBoundingClientRect(),i=icons?.getBoundingClientRect(),h=head.getBoundingClientRect();
        return {title:t?.y,icons:i?.y,right:i?.right,edge:h.right};
      },titleSelector);
      assert.ok(Math.abs(geometry.title-geometry.icons)<12,selector+' icons share the title row');
      assert.ok(Math.abs(geometry.right-geometry.edge)<18,selector+' icons align right');
    };
    // New mobile Search Customer and Client Details regression coverage.
    await page.evaluate(()=>window.tab('search'));await page.waitForTimeout(200);
    await page.evaluate(()=>window.performUCSearch());await page.waitForTimeout(200);
    const searchGrid=page.locator('#search .uc-search-grid');
    const searchFields=await searchGrid.locator(':scope>.field,:scope>button').evaluateAll(nodes=>nodes.map(node=>({y:Math.round(node.getBoundingClientRect().y),bottom:Math.round(node.getBoundingClientRect().bottom)})));
    assert.equal(searchFields[1].bottom,searchFields[2].bottom);assert.ok(Math.abs(searchFields[2].bottom-searchFields[3].bottom)<2,'From / To / Search share one row');
    const resultCards=page.locator('#ucSearchResults .uc-dashboard-client-card');assert.equal(await resultCards.count(),3);
    const resultBounds=await resultCards.evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,overflow:node.scrollWidth>node.clientWidth};}));
    assert.ok(resultBounds[0].width>340);assert.ok(resultBounds[1].y>resultBounds[0].y+resultBounds[0].height);assert.equal(resultBounds.some(item=>item.overflow),false);
    assert.ok(resultBounds[0].height<280,'customer results remain compact');
    assert.equal(await resultCards.first().locator('.uc-page-chip:visible').count(),3,'only three recently visited chips on Search Customer');
    await resultCards.first().click();await page.waitForTimeout(200);
    const stats=page.locator('#ucClientModal .uc-client-stat-grid');
    const sizes=await stats.evaluate(el=>({width:el.clientWidth,cards:[...el.children].map(card=>card.getBoundingClientRect().width),height:el.getBoundingClientRect().height}));
    assert.ok(sizes.cards.every(width=>Math.abs(width-(sizes.width-10)/2)<2),'Website Visits and other client metrics have equal two-card widths');assert.ok(sizes.height<105);
    assert.equal(await page.locator('#ucClientModal .db140-visit-menu button').count(),3);
    assert.equal(await page.locator('#ucClientModal .db140-visit-panel:visible').count(),0);
    await page.locator('#ucClientModal .db140-meta-pill').filter({hasText:'Visit Info'}).click();assert.ok((await page.locator('#ucClientModal .db140-visit-panel:visible').textContent()).includes('First:'));
    await page.locator('#ucClientModal .db140-meta-pill').filter({hasText:'Most Visited'}).click();assert.equal(await page.locator('#ucClientModal .db140-visit-panel:visible .uc-page-chip').count(),5);
    await page.locator('#ucClientModal .db140-meta-pill').filter({hasText:'Most Visited'}).click();
    const clientTabs=await page.locator('#ucClientModal .uc-client-tabs>button:visible').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().y));assert.equal(new Set(clientTabs).size,1);
    assert.ok(clientTabs.length>=4,'compact client tabs expose more options');
    const clientScroll=await page.locator('#ucClientModal .uc-client-modal-card').boundingBox();assert.equal(Math.round(clientScroll.width),390);assert.equal(Math.round(clientScroll.height),844);
    await page.screenshot({path:join(output,'client-mobile-light.png')});
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});await page.waitForTimeout(70);
      const geometry=await page.locator('#ucClientModal').evaluate(modal=>{
        const stats=modal.querySelector('.uc-client-stat-grid'),tabs=[...modal.querySelectorAll('.uc-client-tabs>button')].filter(button=>getComputedStyle(button).display!=='none');
        return {cards:[...stats.children].map(card=>card.getBoundingClientRect().width),width:stats.clientWidth,tabs:tabs.map(button=>({top:button.getBoundingClientRect().top,right:button.getBoundingClientRect().right})),footer:modal.querySelector('.uc-client-actionbar').getBoundingClientRect().height};
      });
      assert.ok(geometry.cards.every(card=>Math.abs(card-(geometry.width-10)/2)<2));assert.equal(new Set(geometry.tabs.map(tab=>Math.round(tab.top))).size,1);assert.ok(geometry.tabs.every(tab=>tab.right<=width),'client tabs fit at '+width);assert.ok(geometry.footer<60);
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await page.waitForTimeout(70);
    assert.equal(await page.locator('#ucClientModal .uc-client-stat-grid .db140-record-card').count(),0,'stats are not styled as nested records');
    await page.screenshot({path:join(output,'client-mobile-dark.png')});
    await page.evaluate(()=>document.documentElement.dataset.colorMode='light');
    await page.evaluate(()=>window.closeUCClientModal());
    await page.evaluate(()=>window.tab('subscribers'));await page.waitForTimeout(200);
    await aligned('#subscribers>.top','h1');
    await page.evaluate(()=>window.tab('dashboard'));await page.waitForTimeout(200);
    assert.equal(await page.locator('#dashboard .db139-dashboard-refresh').isVisible(),true,'Dashboard keeps the Refresh text button exception');
    await aligned('#dashboard .dashboard-block:has(h2:text("Subscriptions Overview")) .block-head','h2');
    await page.evaluate(()=>window.tab('contacts'));await page.waitForTimeout(300);
    await page.locator('.uc97-contact-grid-wrap').waitFor({state:'visible'});const contact=await page.locator('.uc97-contact-grid-wrap').boundingBox();assert.ok(contact.x+contact.width<=390,'Contacts stay inside viewport');
    assert.ok((await page.locator('.uc97-contact-grid-row').textContent()).includes('long.example.email.address@example.test'));
    assert.equal(await page.locator('.uc97-contact-grid-row').evaluate(el=>el.scrollWidth>el.clientWidth),false,'contact email fits its card');
    await page.evaluate(()=>window.tab('growthAnalytics'));await page.waitForTimeout(400);
    await aligned('#growthAnalytics>.top','h1');
    assert.equal(await page.locator('#growthAnalytics .uc88-toolbar').isVisible(),false,'inline filters are removed from the main view');
    await page.locator('#growthAnalytics .db140-filter-trigger').click();
    assert.equal(await page.locator('#growthAnalytics .uc88-toolbar').getAttribute('data-db140-field-count'),'4');
    const even=await page.locator('#growthAnalytics .uc88-toolbar>.field:visible').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().y)));assert.equal(even[0],even[1]);assert.equal(even[2],even[3]);
    await page.locator('#growthAnalytics [data-uc88-period]+.db137-select-trigger').click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.equal(await page.locator('#growthAnalytics .db140-filter-sheet').isVisible(),true,'nested selectors do not replace live filters');await page.locator('#db137ChoiceSheet .db137-choice-option').filter({hasText:/^Monthly$/}).click();
    await page.locator('#growthAnalytics [data-db140-apply]').click();await page.waitForTimeout(100);assert.equal(await page.locator('#growthAnalytics .db140-filter-overlay').isVisible(),false);
    await page.locator('#growthAnalytics [data-uc88-mode="visitors"]').click();await page.waitForTimeout(100);await page.locator('#growthAnalytics .db140-filter-trigger').click();
    assert.equal(await page.locator('#growthAnalytics .uc88-toolbar').getAttribute('data-db140-field-count'),'3');
    const odd=await page.locator('#growthAnalytics .uc88-toolbar>.field:visible').evaluateAll(nodes=>nodes.map(node=>({y:Math.round(node.getBoundingClientRect().y),width:node.getBoundingClientRect().width})));assert.ok(odd[0].width>odd[1].width*1.9);assert.equal(odd[1].y,odd[2].y);
    await page.locator('#growthAnalytics .db140-filter-sheet header button').click();await page.locator('#growthAnalytics [data-uc88-mode="business"]').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-uc88-growth-summary]').getAttribute('data-db137-rows'),'1','Growth metrics share the two-card carousel');
    const summary=await page.locator('[data-uc88-growth-summary]').evaluate(el=>({width:el.clientWidth,card:el.firstElementChild.getBoundingClientRect().width}));assert.ok(Math.abs(summary.card-(summary.width-10)/2)<2);
    const cdp=await context.newCDPSession(page);
    const swipe=async(fromX,toX,y)=>{
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fromX,y}]});
      for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fromX+(toX-fromX)*step/8,y}]});await page.waitForTimeout(15);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
    };
    for(const chart of ['line','bar','hbar']){
      await page.locator('[data-uc88-chart="'+chart+'"]').click();await page.waitForTimeout(100);
      const shell=page.locator('#growthAnalytics .uc88-chart-shell');await shell.scrollIntoViewIfNeeded();
      assert.equal(await shell.evaluate(el=>el.scrollLeft),0,chart+' begins at the start');
      const b=await shell.boundingBox(),y=Math.min(760,b.y+Math.min(120,b.height/2));
      await swipe(b.x+b.width-30,b.x+30,y);const moved=await shell.evaluate(el=>el.scrollLeft);assert.ok(moved>25,chart+' scrolls forward with a fingertip');
      await swipe(b.x+30,b.x+b.width-30,y);assert.ok((await shell.evaluate(el=>el.scrollLeft))<moved,chart+' scrolls back with a fingertip');
    }
    await page.locator('[data-uc88-chart="pie"]').click();await page.waitForTimeout(100);const donut=await page.locator('[data-uc88-canvas]').boundingBox();assert.equal(Math.round(donut.width),Math.round(donut.height));assert.ok(donut.width<=280);
    await page.evaluate(()=>window.tab('heatMaps'));await page.waitForTimeout(400);
    await page.locator('#heatMaps .db140-filter-trigger').click();
    assert.equal(await page.locator('#heatMaps .db139-heat-filters').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    await page.locator('#heatMaps .db140-filter-sheet header button').click();
    await page.locator('.db139-engagement-open').click();assert.equal(await page.locator('#db137ChoiceSheet .db139-engagement-copy').isVisible(),true);await page.locator('[data-db137-sheet-close]').last().click();
    await page.evaluate(()=>window.tab('onlineClasses'));await page.waitForTimeout(400);await page.locator('#onlineClasses [data-db107-view="coaches"]').click();await page.locator('#onlineClasses .db137-calendar-fab').click();await page.locator('#db137ChoiceSheet .db137-choice-option').filter({hasText:/Add Coach \/ Team Member/}).click();await page.waitForTimeout(150);
    const coachForm=page.locator('#db107CoachModal form');assert.equal(await coachForm.getAttribute('data-db137-steps'),'5');
    assert.equal(await coachForm.locator('.db121-availability').isVisible(),false);assert.equal(await coachForm.locator('.db122-coach-pay').isVisible(),false);
    for(const [name,value]of Object.entries({name:'Example New Coach',contact_email:'coach@example.test',contact_phone:'919876543210',bio:'Example coach biography',experience:'Five years'}))await coachForm.locator('[name="'+name+'"]').fill(value);
    await coachForm.locator('[data-db137-next]').click();assert.equal(await coachForm.locator('.db121-availability').isVisible(),true);assert.equal(await coachForm.locator('.db122-coach-pay').isVisible(),false);assert.equal(await coachForm.locator('[name="bio"]').isVisible(),false);
    await coachForm.locator('[data-add-coach-slot]').click();await page.waitForTimeout(100);assert.equal(await coachForm.locator('.db137-wizard-progress').count(),1,'adding availability does not duplicate steps');
    await coachForm.locator('[data-db137-next]').click();assert.equal(await coachForm.locator('.db121-availability').isVisible(),false);assert.equal(await coachForm.locator('.db122-coach-pay').isVisible(),true);
    await coachForm.locator('.db125-approved-remuneration-toggle').click();assert.equal(await coachForm.locator('[name="rateRupees"]').isVisible(),true);
    await page.locator('#db107CoachModal [data-db139-action="close"]').click();
    await page.locator('#onlineClasses [data-edit-coach="1"]').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('#db107CoachModal .db108-readonly-status').isVisible(),true);
    assert.equal(await page.locator('#db107CoachModal .db121-availability').isVisible(),false,'Edit Coach also owns availability in its separate step');
    await page.locator('#db107CoachModal [data-db139-action="close"]').click();
    await page.evaluate(()=>window.tab('refunds'));await page.waitForTimeout(200);await aligned('#refunds>.top','h1');
    assert.equal(await page.locator('#db142RefundQuery').isVisible(),true);
    assert.equal(await page.locator('#refunds [data-db142-refund-provider]:visible').count(),4);
    await page.locator('[data-db142-refund-provider="razorpay"]').click();
    assert.equal(await page.locator('#db142Refund_razorpay.open #razorpayRefundForm').isVisible(),true);
    await page.locator('#db142Refund_razorpay [data-db139-action="close"]').click();
    await page.evaluate(()=>window.tab('attendance'));await page.waitForTimeout(250);await aligned('#attendance>.top','h1');
    await page.locator('#attendance .db140-filter-trigger').click();
    const filters=await page.locator('[data-attendance-filters] .field').evaluateAll(nodes=>nodes.map(el=>Math.round(el.getBoundingClientRect().y)));assert.equal(filters[0],filters[1]);assert.equal(filters[2],filters[3]);
    await page.locator('#attendance .db140-filter-sheet header button').click();
    await page.locator('#attendance [data-attendance-view="list"]').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('.db119-attendance-table [data-roster-tab="absent"]').evaluate(el=>getComputedStyle(el).fontSize),'12px');
    await page.locator('.db119-attendance-table [data-roster-tab="absent"]').click();await page.waitForTimeout(100);
    const roster=page.locator('#db116RosterModal .db119-roster-table tbody tr').first();
    const spacing=await roster.locator('td').first().evaluate(el=>{const small=el.querySelector('small'),button=el.querySelector('button');return small.getBoundingClientRect().top-button.getBoundingClientRect().bottom;});assert.ok(spacing>=3,'roster name and email have spacing');
    const columns=await roster.locator('td .db138-cell-value').evaluateAll(nodes=>nodes.map(el=>Math.round(el.getBoundingClientRect().x)));assert.equal(new Set(columns).size,1,'roster values share the same column start');
    await page.locator('#db116RosterModal [data-db139-action="close"]').click();
    await page.evaluate(()=>window.tab('onlineClasses'));await page.waitForTimeout(120);await page.locator('#onlineClasses [data-view="events"]').click();await page.waitForTimeout(100);
    const sessionRow=page.locator('#onlineClasses .db140-keyvalue-table :is(.db136-stacked-row,tr.db136-card-row)').first();
    await sessionRow.locator('.db138-cell-value').first().waitFor({state:'visible'});const sessionColumns=await sessionRow.locator('.db138-cell-value').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().x)));assert.equal(new Set(sessionColumns).size,1,'class rows share a rigid value column');
    assert.ok(await sessionRow.evaluate(node=>getComputedStyle(node).borderColor==='rgb(75, 85, 190)'),'nested class border follows the primary color');
    await page.screenshot({path:join(output,'class-mobile.png')});
    // Add/Edit Plan: features are a real fourth step and Review is a fifth.
    await page.evaluate(()=>window.tab('products'));await page.waitForTimeout(150);
    await page.evaluate(()=>window.editProduct(window.dropbeatAdminState.products[0]));await page.waitForTimeout(150);
    const planForm=page.locator('#productForm');assert.equal(await planForm.getAttribute('data-db137-steps'),'5');
    await planForm.locator('[data-db137-next]').click();await planForm.locator('[data-db137-next]').click();
    assert.equal(await planForm.locator('[data-db107-plan-class]').isVisible(),true);
    await planForm.locator('[data-db137-next]').click();
    assert.equal(await planForm.locator('[name="description"]').isVisible(),true);assert.equal(await planForm.locator('.db138-review').isVisible(),false);
    await planForm.locator('[name="description"]').fill('Example plan description for review');
    await planForm.locator('[data-db137-next]').click();assert.equal(await planForm.locator('.db138-review').isVisible(),true);assert.ok((await planForm.locator('.db138-review').textContent()).includes('Example plan description for review'));assert.equal(await planForm.locator('[name="description"]').isVisible(),false);
    await planForm.locator('[data-db137-back]').click();assert.equal(await planForm.locator('[name="description"]').inputValue(),'Example plan description for review');await page.locator('#productModal [data-db139-action="close"]').click();
    // Product Images: previously blank; every dedicated step is functional.
    await page.evaluate(()=>window.openMedia(1));await page.waitForTimeout(200);
    const media=page.locator('#ucV1624MediaForm');assert.equal(await media.getAttribute('data-db137-steps'),'4');
    assert.equal(await media.locator('[name="image_url"]').isVisible(),true);assert.equal(await media.locator('.uc-v1624-social-status-choice').isVisible(),false);
    const mediaBounds=await media.boundingBox();assert.ok(mediaBounds.height>600,'image form has a constrained usable height');
    await media.locator('[name="image_url"]').fill('https://example.test/new-image.png');await media.locator('[name="alt_text"]').fill('New dance image');
    await media.locator('[data-db137-next]').click();assert.equal(await media.locator('.uc-v1624-social-status-choice').isVisible(),true);assert.equal(await media.locator('[name="social_image_url"]').isVisible(),false);
    await media.locator('.uc-v1624-social-status-choice').click();assert.equal(await media.locator('[name="social_image_url"]').isVisible(),true);await media.locator('.uc-v1624-social-status-choice').click();
    await media.locator('[data-db137-next]').click();assert.equal(await media.locator('#currentProductMedia').isVisible(),true);assert.equal(await media.locator('.db140-staged-image').isVisible(),true);await media.locator('[data-db140-stage-move="-1"]').click();
    await media.locator('[data-db137-next]').click();assert.equal(await media.locator('.db138-review .db140-image-review-row').count(),2);assert.equal(await media.locator('[name="image_url"]').isVisible(),false);
    await page.screenshot({path:join(output,'images-mobile-review.png')});
    await media.locator('[data-db137-finish]').first().click();
    await page.locator('[data-dual-cancel]').waitFor({state:'visible',timeout:5000});await page.locator('[data-dual-cancel]').click();
    for(let attempt=0;attempt<20&&!writes.some(write=>write.path==='/api/admin/media'&&JSON.parse(write.body||'{}').action==='move');attempt++)await page.waitForTimeout(100);
    assert.ok(writes.some(write=>write.path==='/api/admin/media'&&JSON.parse(write.body||'{}').image_url==='https://example.test/new-image.png'),'original media submit receives the URL');
    assert.ok(writes.some(write=>write.path==='/api/admin/media'&&JSON.parse(write.body||'{}').action==='move'),'new image staged order uses the existing media sorting handler');
    await page.locator('#mediaModal [data-db139-action="close"]').click();
    // Calendar list shows day breakdown in a sheet and retains the date list.
    await page.evaluate(()=>window.tab('businessCalendar'));await page.waitForTimeout(200);
    await page.waitForFunction(()=>document.querySelectorAll('#businessCalendar [data-uc88-day-summary] .uc88-summary>.uc88-metric').length===5);const daily=page.locator('#businessCalendar [data-uc88-day-summary] .uc88-summary');assert.equal(await daily.locator(':scope>.uc88-metric').count(),5);
    const totals=await daily.locator(':scope>.uc88-metric').evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,y:Math.round(node.getBoundingClientRect().y),width:node.getBoundingClientRect().width})));assert.equal(totals[0].y,totals[1].y);assert.equal(totals[2].y,totals[3].y);assert.ok(totals[4].width>totals[0].width*1.9);
    await page.locator('#businessCalendar [data-uc88-view="list"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('#businessCalendar [data-uc88-day-summary]').isVisible(),false);await page.locator('#businessCalendar .uc88-list-row').first().click();assert.equal(await page.locator('#db137ChoiceSheet .db140-day-breakdown dt').count(),5);await page.locator('[data-db137-sheet-close]').last().click();
    // Dance Tip and Advertisement rows navigate rather than expanding inline.
    await page.evaluate(()=>window.tab('blogs'));await page.waitForTimeout(200);
    const tipRow=page.locator('#blogs details.admin-collapsed-card').first();await tipRow.locator(':scope>summary').click();await page.waitForTimeout(100);
    const blog=page.locator('#blogForm');assert.equal(await blog.getAttribute('data-db138-inline'),'1');assert.equal(await blog.evaluate(el=>el.classList.contains('db138-inline-form-open')),true);
    await blog.locator('[name="title"]').fill('A mobile dance tip');await blog.locator('[name="body_text"]').fill('Practice slowly and follow the rhythm.');
    let count=0;while(await blog.locator('[data-db137-next]').isVisible()){await blog.locator('[data-db137-next]').click();if(++count>8)throw new Error('Dance tip wizard did not advance');}
    assert.equal(await blog.locator('.db138-review').isVisible(),true);assert.ok((await blog.locator('.db138-review').textContent()).includes('A mobile dance tip'));
    await blog.locator('.db138-page-header button[aria-label^="Close"]').click();assert.equal(await blog.isVisible(),false);
    await page.locator('#blogs details.admin-collapsed-card').nth(1).locator(':scope>summary').click();await page.waitForTimeout(100);
    const ad=page.locator('#db140AdvertisementForm');assert.equal(await ad.getAttribute('data-db138-wizard'),'1');assert.equal(await ad.isVisible(),true);await ad.locator('.db138-page-header button[aria-label^="Close"]').click();
    // Bulk Plan Upload keeps the full desktop flow and mobile review/import.
    await page.evaluate(()=>window.tab('bulk'));await page.waitForTimeout(120);
    assert.equal(await page.locator('#bulk h1').textContent(),'Bulk Plan Upload');assert.equal(await page.locator('#bulk .db140-supported-columns').isVisible(),false);assert.equal(await page.locator('#bulk .db138-header-icons [data-db139-action="download"]').count(),1);
    await page.locator('#bulk .db138-open-form').click();await page.locator('#bulkFile').setInputFiles(join(root,'public/sample-plan-import.csv'));await page.locator('#db140BulkPlanForm [data-db137-next]').click();assert.equal(await page.locator('#db140BulkPlanForm .db138-review').isVisible(),true);await page.locator('#db140BulkPlanForm [data-db137-finish]').first().click();await page.waitForFunction(()=>document.querySelector('#bulkResult')?.textContent.includes('Created: 2'));assert.ok((await page.locator('#bulkResult').textContent()).includes('Created: 2'));await page.locator('#db140BulkPlanForm .db138-page-header button[aria-label^="Close"]').click();
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
      assert.equal(await opened.locator('.db137-wizard-step').last().textContent().then(text=>text.endsWith('Review')),true,role+' wizard ends in Review');
      await opened.locator('.db138-page-header button[aria-label^="Close"]').click();assert.equal(await opened.count(),0,role+' full-screen form closes locally');
      if(role==='student'){
        await portal.evaluate(()=>document.querySelector('[data-download-statement]')?.click());await portal.waitForTimeout(150);
        const statement=portal.locator('[data-statement-filters]');
        assert.equal(await statement.isVisible(),false);await portal.locator('.db117-statement-card .db140-filter-trigger').click();assert.equal(await statement.isVisible(),true);
        assert.equal(await statement.getAttribute('data-db140-field-count'),'3');await portal.locator('.db140-filter-sheet header button').click();await portal.locator('[data-statement-close]').first().click();
      }
      await portal.close();
    }
    assert.equal(errors.some(error=>error.includes('dropbeat-dashboard-mobile-v1-45.js')),false,'new controller has no browser exceptions');
    console.log('V1.45 Chromium checks passed: stability, Search Customer, Client Details, global filter sheets with odd/even fields and nested selectors, separate Review steps, Product Images and staged order, daily calendar sheets, Dance Tip/Ad navigation, mobile headers, original submit payloads, desktop isolation and Student/Coach forms.');
  }
  await writeFile(join(output,'browser-errors.json'),JSON.stringify(errors,null,2));
}catch(error){await writeFile(join(output,'failure.html'),await page.content());await page.screenshot({path:join(output,'failure.png'),fullPage:true});await writeFile(join(output,'failure-errors.json'),JSON.stringify({errors,writes,url:page.url()},null,2));throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
