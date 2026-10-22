/* Browser regression tests use synthetic API data only. No gateway or live account is contacted. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,extname,join} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GYM_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.GYM_TEST_ROOT||fileURLToPath(new URL('../',import.meta.url)));
const {layoutPayload}=await import(pathToFileURL(join(root,'functions/_lib/layout.js')));
const {dictionaryButtons}=await import(pathToFileURL(join(root,'public/assets/button-dictionary-defaults-v1-56.js')));
const output=resolve(process.env.GYM_TEST_OUTPUT||join(root,'browser-verification'));
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const target=join(root,'public',path.startsWith('/blog/')?'blog-post.html':path.endsWith('/')?path+'index.html':(!extname(path)?path+'.html':path));
  try{const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Missing fixture asset');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=process.env.GYM_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.GYM_CHROMIUM_PATH?{executablePath:process.env.GYM_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process']});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage(),errors=[],writes=[];
const browserDiagnostics=[];
page.on('console',message=>{if(message.type()==='error')browserDiagnostics.push({type:'console',text:message.text()});});
page.on('requestfailed',request=>browserDiagnostics.push({type:'requestfailed',url:request.url(),error:request.failure()?.errorText}));
page.on('pageerror',error=>errors.push(error.stack||String(error)));
const coach={id:1,name:'Example Coach',status:'active',designation:'Fitness Coach',dance_styles:['Weightlifting'],availability:['mon','tue','wed'],class_types:['online_class'],availability_slots_json:JSON.stringify([{day:'mon',start:'10:00',end:'11:00',danceStyles:['Weightlifting'],classTypes:['online_class']}])};
const products=[{id:1,name:'Online Gym Membership',slug:'online-gym-membership',sku:'PASS',status:'active',short_description:'Beginner online classes',regular_price_paise:39900,offer_price_paise:19900,offer_price_enabled:1,payment_type:'subscription',billing_period:'monthly',billing_interval:1,trial_enabled:1,trial_amount_paise:100,trial_value:7,trial_unit:'days',features:['Live classes'],images:[],class_mapping:{enabled:1,class_name:'Beginners Session',coach_id:1,class_type:'online_class',class_days:['mon','tue','wed'],class_time:'10:00',duration_minutes:60,dance_styles:['Weightlifting'],days_per_week:3}},{id:2,name:'Gym Membership',slug:'studio-membership',status:'active',regular_price_paise:59900,offer_price_paise:34900,offer_price_enabled:1,trial_enabled:0,payment_type:'subscription',billing_period:'monthly',billing_interval:1,images:[],features:[]},{id:3,name:'Single Price',slug:'single-price',status:'active',regular_price_paise:50000,offer_price_enabled:0,trial_enabled:0,payment_type:'one_time',images:[],features:[]}];
const order={id:1,order_id:'TEST-ORDER-1',gateway_subscription_id:'TEST-SUB-1',customer_name:'Example Customer',customer_phone:'919876543210',customer_email:'example@example.test',order_type:'trial',status:'active',payment_status:'paid',gateway:'razorpay',received_paise:100,amount_paise:19900,recurring_charge_paise:19900,created_at:'2026-10-13 10:00:00'};
const base={ok:true,rows:[],items:[],records:[],inquiries:[],requests:[],tickets:[],sources:[],visitors:[],leads:[],flows:[],campaigns:[],funnels:[],events:[],members:[],occurrences:[],holidays:[],studioHolidays:[],students:[],coaches:[coach],products,settings:{siteName:'IronPulse Gym',primaryColor:'#4B55BE',accentColor:'#A469A8',adminHelpEnabled:true,frontendTheme:'dropbeat',timezone:'Asia/Kolkata'},new_orders:[order],pending_orders:[],existing_orders:[order],cancelled_orders:[],cancelled_subscriptions:[],subscriptions:[],stats:{totalLeads:12,activeSubscriptions:4,newOrders:1},summary:{},counts:{total:4,active:4,successful:1},start:'2026-10-01',end:'2026-10-13',last_changed_at:'2026-10-13 10:00:00',updated_at:'2026-10-13 10:00:00',user:{id:1,email:'admin@example.test',name:'Test Admin',role:'admin'},capabilities:{},integrations:{},gateways:{},marketing:{},webinars:{},payment_link:'/checkout?test=1',order_id:'TEST-LINK-1',message:'Synthetic test completed'};
const paymentRows=[{id:1,date:'2026-10-14 09:00:00',order_id:'TEST-ORDER-1',plan_offer:'Online Gym Membership',payment_status:'paid',payment_type:'subscription',payment_mode:'subscription',gateway:'razorpay',transaction_reference:'pay_fixture_one',amount_received_paise:100,total_order_amount_paise:19900},{id:2,date:'2026-10-13 09:00:00',order_id:'TEST-ORDER-2',plan_offer:'Gym Membership',payment_status:'paid',payment_type:'subscription',payment_mode:'subscription',gateway:'stripe',transaction_reference:'pi_fixture_two',amount_received_paise:34900,total_order_amount_paise:34900}];
const pageStats=['/checkout','/','/contact','/about','/faq'].map((path,index)=>({path,visits:9-index,time_spent_ms:10000}));
const clients=Array.from({length:3},(_,index)=>({id:index+1,lead_id:index+1,name:['Rohan','Pallavi','Example Customer'][index],phone:'919876543210',email:'customer.long@example.test',status:'new',interest_level:'Warm',visit_count:23,service_count:2,next_action:'Call about plan',follow_up_date:'2026-10-20',page_stats:pageStats,first_visit:'2026-09-29 10:00:00',last_visit:'2026-10-13 10:00:00',traffic_source:'google'}));
let savedImages=[{id:21,product_id:1,public_url:'/assets/product-generic.svg',source_url:'/assets/product-generic.svg',alt_text:'Existing scrolling image',is_cover:1,sort_order:1}];
let navigation={items:[{key:'home',label:'Home',slug:'',href:'/',kind:'builtin'},{key:'offers',label:'Pricing',slug:'pricing',href:'/pricing',kind:'builtin',hasChildren:true,children:[{key:'pricing_help',label:'Pricing Help',slug:'pricing-help',href:'/pricing/help',kind:'builtin-child'}]},{key:'about',label:'About',slug:'about',href:'/about',kind:'builtin'},{key:'blog',label:'Fitness Tips',slug:'blog',href:'/blog',kind:'builtin'},{key:'contact',label:'Contact',slug:'contact',href:'/contact',kind:'builtin'},{key:'login',label:'Login',slug:'login',href:'/login',kind:'builtin'}]};
const baseRoute=async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin){
    if(url.hostname==='example.test'&&url.pathname.endsWith('.png')){await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="900" height="1100" fill="#4B55BE"/><text x="50" y="200" fill="white" font-size="65">Fitness Image</text></svg>'});return;}
    await route.abort();return;
  }
  if(url.pathname.startsWith('/api/')){
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    if(url.pathname==='/api/admin/settings'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,settings:{...base.settings,siteName:'IronPulse Gym',tagline:'Build strength. Build consistency.',logoUrl:'/assets/ironpulse-logo.svg',faviconUrl:'/assets/ironpulse-logo.svg',whatsappNumber:'919381521966',legalEntityName:'Fixture Gym LLP',legalEntityAddress:'Hyderabad',frontendTheme:'dropbeat'}})});return;}
    if(url.pathname==='/api/admin/automatic-email-templates'){
      const template={label:'Schedule Confirmation',description:'Sent after a class is scheduled.',subject:'Confirmation for @ClientName',heading:'Your class is booked',eyebrow:'Class details',greeting:'Hi @ClientName',intro:'Thanks for joining.',summaryTitle:'Class Summary',summaryLabels:['Class','Coach'],footerBody:'See you soon.',note:'Keep this email',buttonLabel:'View Class',buttonUrl:'/my-orders'};
      const templates={schedule_confirmation:template,meeting_reminder:{...template,label:'Meeting Reminder',subject:'Your class starts soon'}};
      let body={};try{body=JSON.parse(request.postData()||'{}')}catch{}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,templates,defaults:templates,subject:body.template?.subject||template.subject,html:'<html><body><h1>Fixture email preview</h1></body></html>'})});return;
    }
    if(url.pathname==='/api/admin/storage'){
      if(url.searchParams.get('mode')==='detail'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,title:'Expired offer details',details:[['Record ID','1'],['Name','Expired Gym Membership'],['Status','expired']],warning:'Only eligible expired data can be removed.'})});return;}
      const categories=[{key:'expired_offers',label:'Expired / Inactive Offers',description:'Only expired offers.',count:2,approx_bytes:177,warning:'Deletion is permanent.'},{key:'old_visits',label:'Old anonymous visits',count:3,approx_bytes:250,description:'Eligible anonymous visits.'}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,allocated_label:'500 MB',used_label:'10 MB',remaining_label:'490 MB',remaining_percent:98,used_percent:2,categories,columns:[{key:'name',label:'Name'},{key:'status',label:'Status'}],key_field:'id',rows:[{id:1,title:'Expired Plan',name:'Expired Plan',detail:'Expired eligible offer',date_value:'2026-09-01',approx_label:'100 B',status:'expired'},{id:2,title:'Old Plan',name:'Old Plan',detail:'Inactive eligible offer',date_value:'2026-09-02',approx_label:'80 B',status:'inactive'}]})});return;
    }
    if(url.pathname==='/api/admin/studio-gallery'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,images:[{id:31,alt_text:'Strength training',image_url:'/assets/product-generic.svg',visible:1},{id:32,alt_text:'Group training',image_url:'/assets/product-generic.svg',visible:1}]})});return;}
    if(url.pathname==='/api/admin/banners'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,banners:[1,2,3].map(id=>({id,title:'Gym banner '+id,subtitle:'Build strength every day',desktop_image_url:'/assets/product-generic.svg',mobile_image_url:'/assets/product-generic.svg',link_type:'page',link_value:'/offers',visible:1,sort_order:id}))})});return;}
    if(url.pathname==='/api/admin/checkout-settings'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,settings:{paymentMode:'subscription',subscriptionYears:21,yearlyEnabled:true,couponsEnabled:true},coupons:[{id:1,code:'GYM10',name:'Gym discount',discount_type:'percent',discount_value:10,status:'active',enabled:1,max_uses:20,used_count:2}]})});return;}
    if(url.pathname==='/api/admin/api-settings'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,apiBaseUrl:origin,vendorUserId:'fixture-studio',endpoints:[{method:'GET',url:origin+'/api/automation/plans',purpose:'List plans'},{method:'POST',url:origin+'/api/automation/orders',purpose:'Create order'}],webhookEndpoints:{events:origin+'/api/webhooks/events'}})});return;}
    if(url.pathname==='/api/admin/navigation-order'){
      if(request.method()==='POST'){const body=JSON.parse(request.postData()||'{}');if(body.action==='save_item'){const item=navigation.items.flatMap(x=>[x,...(x.children||[])]).find(x=>x.key===body.key);if(item){item.label=body.label;item.slug=body.slug;}}if(body.action==='save_order')navigation.items=body.order.map(key=>navigation.items.find(x=>x.key===key));}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,...navigation})});return;
    }
    if(url.pathname==='/api/admin/email-providers'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,settings:{primaryProvider:'ses',ses:{enabled:true,otpEnabled:true,region:'ap-south-1',fromEmail:'test@example.test',hasCredentials:true},s3:{enabled:false}}})});return;
    }
    if(url.pathname==='/api/admin/ai-integrations'){
      const items=[{id:1,providerType:'openai',displayName:'OpenAI',enabled:true,ready:true,hasApiKey:true,apiKeyMasked:'test-key-***',models:['test-model'],baseUrl:'https://example.test/api'}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,integrations:items,items,brandName:'IronPulse Gym'})});return;
    }
    if(url.pathname==='/api/admin/social-integrations'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,settings:{...base.settings,googleDrive:{enabled:true,uploadReady:true,oauthConnected:true,folderName:'Test Media',imageFolderName:'Images',videoFolderName:'Videos'},telegram:{enabled:true,botUsername:'test_bot',botTokenMasked:'***'},facebook:{enabled:true,pageId:'page-test'},gmail:{enabled:true,senderName:'IronPulse Gym',senderEmail:'support@ironpulse.example',adminCopyEmail:'urgentcasting33@example.test',connected:true,connectedEmail:'actual@example.test',clientId:'fixture-client',clientSecretMasked:'***'}}})});return;
    }
    if(url.pathname==='/api/admin/pages'){
      const pages=['about','contact','privacy','404'].map((key,index)=>({id:index+1,page_key:key,title:key==='contact'?'Contact Us':'Example '+key,body_text:'Page content '+key,status:'published',enabled:1}));
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,pages,faqs:[{id:1,question:'How can I join?',answer_text:'Choose a dance plan.',status:'active'}]})});return;
    }
    if(url.pathname==='/api/admin/placements'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,placements:[{id:101,product_id:1,product_name:'Online Gym Membership',page_key:'home',section_key:'featured',visible:1,status:'active'},{id:102,product_id:2,product_name:'Gym Membership',page_key:'offers',section_key:'memberships',visible:1,status:'active'}]})});return;
    }
    if(url.pathname==='/api/admin/success-stories'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,stories:[1,2].map(id=>({id,title:'Member Story '+id,student_name:'Example Member '+id,video_url:'https://www.youtube.com/watch?v=example'+id,thumbnail_url:'/assets/product-generic.svg',status:'active',sort_order:id}))})});return;
    }
    if(url.pathname==='/api/admin/approvals'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,counts:{pendingCoaches:2,pendingStudents:3,scheduleRequests:1,currentCoaches:4,pastCoaches:0},pendingCoaches:[],pendingStudents:[],scheduleRequests:[],currentCoaches:[],pastCoaches:[]})});return;
    }
    if(url.pathname==='/api/public/layout'){
      const names=layoutPayload({document:{},buttons:{},navigation:{offers:{label:'Pricing',slug:'pricing'}},theme:'dropbeat',contextRevision:'browser-default-layout',updatedAt:'2026-10-20T00:00:00.000Z'});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(names)});return;
    }
    if(['/api/public/button-dictionary','/api/admin/button-dictionary'].includes(url.pathname)){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,revision:'defaults-v156',updatedAt:'',buttons:dictionaryButtons().filter(row=>url.pathname.startsWith('/api/admin/')||row.category==='front')})});return;
    }
    if(url.pathname==='/api/admin/studio-schedule'){
      const runningClasses=[{id:1,source_type:'product',sourceId:1,source_id:1,product_id:1,className:'Beginners Session',class_name:'Beginners Session',coachId:1,coach_id:1,coachName:'Example Coach',coach_name:'Example Coach',classType:'online_class',class_days:['mon','tue'],class_time:'10:00',duration_minutes:60,current_students:5,joinEnabled:true,joinUrl:origin+'/test-join'}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,runningClasses,coaches:[coach,{...coach,id:2,name:'Replacement Coach'}]})});return;
    }
    if(url.pathname==='/api/admin/lead-nurture-automations'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,flows:[],sources:[{key:'website',label:'Website',connected:true}],offers:products})});return;
    }
    if(url.pathname==='/api/admin/social-posts'){
      const platforms=[{key:'facebook',label:'Facebook',connected:true,enabled:true,features:{text:true,image:true,videoShort:true,videoFull:true,storyImage:true,storyVideo:true,storyCaption:true,firstComment:true,poll:true,carouselImage:true,carouselVideo:true,carouselMixed:true}},{key:'instagram',label:'Instagram',connected:true,enabled:true,features:{text:true,image:true,videoShort:true,videoFull:true,storyImage:true,storyVideo:true,storyCaption:true,firstComment:true,carouselImage:true,carouselVideo:true,carouselMixed:true}}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,capabilities:{platforms,byPlatform:Object.fromEntries(platforms.map(p=>[p.key,p])),rules:{maxTags:30}},posts:[{id:51,post_type:'text',body_text:'Scheduled fixture post',caption:'Scheduled fixture post',status:'scheduled',scheduled_at:new Date().toISOString(),targets:[]} ]})});return;
    }
    if(url.pathname==='/api/admin/google-drive-upload'){const video=request.postData()?.includes('video/mp4');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'drive-fixture',name:video?'fixture.mp4':'fixture.png',mimeType:video?'video/mp4':'image/png',url:'/assets/product-generic.svg',viewUrl:'/assets/product-generic.svg',size:1200})});return;}
    if(url.pathname==='/api/admin/email-automations'&&url.searchParams.get('mode')==='activity'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,activity:[{id:1,flow_id:71,flow_name:'Saved welcome flow',email:'customer@example.test',status:'sent',created_at:'2026-10-15 10:00:00',step_name:'Welcome'}],rows:[{id:1,flow_id:71,email:'customer@example.test',status:'sent',created_at:'2026-10-15 10:00:00'}]})});return;
    }
    if(url.pathname==='/api/admin/email-automations'&&request.method()==='POST'&&request.postData()?.includes('preview')){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,preview:{html:'<p>Synthetic email preview</p>'},html:'<p>Synthetic email preview</p>'})});return;
    }
    if(url.pathname==='/api/admin/email-automations'){
      const templates=[{id:'welcome',category:'nurture',name:'Simple welcome email',description:'Welcome a new lead.',triggerType:'lead_created',steps:[{id:'mail1',type:'email',name:'Welcome',config:{subject:'Hello',blocks:[],design:{}}}]},{id:'cart',category:'sales',name:'Abandoned cart',description:'Recover an incomplete checkout.',triggerType:'abandoned_cart',steps:[]}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,flows:[{id:71,name:'Saved welcome flow',category:'nurture',trigger_type:'lead_created',status:'draft'}],templates,groups:[],gmail:{ready:true,senderEmail:'sender@example.test'},brand:{}})});return;
    }
    if(url.pathname==='/api/admin/social-automations'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,capabilities:{commentDm:[{key:'instagram',label:'Instagram',enabled:true,connected:true}],dm:[{key:'instagram',label:'Instagram',enabled:true,connected:true}],comments:[{key:'instagram',label:'Instagram',enabled:true,connected:true}]},flows:[{id:61,name:'Chatbot welcome',channel:'dm',platform:'instagram',enabled:false,triggerMode:'keyword',triggerValue:'hello',definition:{nodes:[]}},{id:62,name:'Comment reply',channel:'comment',platform:'instagram',enabled:false,triggerMode:'keyword',triggerValue:'hello',definition:{nodes:[]}}],aiIntegrations:[]})});return;
    }
    if(url.pathname==='/api/admin/dashboard-list'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,rows:clients})});return;}
    if(url.pathname==='/api/admin/visitor-info'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,recent:clients.map((c,i)=>({lead_id:c.lead_id,lead_name:c.name,lead_phone:c.phone,lead_email:c.email,device_id:'a-very-long-test-device-id-0123456789-'+i,ip_address:'192.0.2.'+(10+i),location:'Hyderabad, Telangana, India',last_seen:c.last_visit,visits:23+i,sources:'Direct / unknown, Referral',pages:'/checkout, /, /contact'}))})});return;}
    if(url.pathname==='/api/admin/traffic-sources'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,rows:[{rank:1,source:'Direct / unknown',visits:150,unique_visitors:80,repeat_visitors:70},{rank:2,source:'Referral',visits:1085,unique_visitors:36,repeat_visitors:30}],from:'2026-10-01',to:'2026-10-14',totals:{unique_visitors:81,visits:1240}})});return;}
    if(url.pathname==='/api/admin/subscription-overview'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,configured:true,cache_has_data:true,rows:clients.slice(0,2).map((c,i)=>({...c,client_ref:'lead:'+c.lead_id,subscription_id:'sub_fixture_'+i,order_id:'TEST-ORDER-'+(i+1),gateway:'razorpay',plan_name:'Online Gym Membership',amount_paise:19900,total_count:12,paid_count:1,status:'active'}))})});return;}
    if(url.pathname==='/api/admin/refunds'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,refundPreview:{availablePaise:34900},refunds:[{created_at:'2026-10-13 10:00:00',refund_id:'rfnd_fixture',payment_id:'pay_fixture_one',subscription_id:'TEST-SUB-1',provider:'razorpay',amount_paise:100,status:'processed'}]})});return;}
    if(url.pathname==='/api/admin/client-crm'&&url.searchParams.get('mode')==='search'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,rows:clients})});return;}
    if(url.pathname==='/api/admin/client-crm'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,client:clients[0],payments:paymentRows,orders:[{...order,gateway_payment_id:'pay_fixture_one'}],subscriptions:[{subscription_id:'TEST-SUB-1',order_id:'TEST-ORDER-1',plan_name:'Online Gym Membership',status:'active',gateway:'razorpay',amount_paise:19900,total_count:12,paid_count:1}],analytics:{visit_count:23,time_spent_ms:6157000,first_visit:clients[0].first_visit,last_visit:clients[0].last_visit,pages:pageStats,sources:[{source:'google',visits:23}]},summary:{order_count:2,payment_count:1,service_count:2,total_paid_paise:34900}})});return;}
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
      const student={accountId:1,memberId:1,name:'Example Member',email:'student@example.test',phone:'919876543210',paymentStatus:'paid',paymentMode:'subscription',lastPaymentAt:'2026-10-13 10:00:00',attendanceStatus:'absent'};
      const sessions=[{sessionKey:'fixture-session',date:'2026-10-13',className:'Example Class',classType:'online_class',coachId:1,coachName:'Example Coach',enrolled:2,studentPresent:0,durationMinutes:60,startsAt:'2026-10-13T10:00:00+05:30',status:'scheduled',reviewCount:0}];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,from:'2026-10-01',to:'2026-10-31',date:'2026-10-13',sessions,students:[student],present:[],absent:[student]})});return;
    }
    if(url.pathname==='/api/admin/dance-studio'&&url.searchParams.get('mode')==='workspace'){
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),eventType=url.searchParams.get('eventType')||'online_class';
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,month:today.slice(0,7),occurrences:[{key:'example-session',sessionDate:today,startsAt:today+'T10:00:00+05:30',title:'Beginners Session',classType:eventType,coachId:1,coachName:'Example Coach',memberCount:2,durationMinutes:60,danceStyles:['Weightlifting']}],members:[{id:1,customer_name:'Sadiq',customer_phone:'919876543210',customer_email:'member@example.test',status:'current',plan_name:'Online Gym Membership',class_time:today+'T10:00:00+05:30',coach_id:1,class_days:['mon','tue']},{id:2,customer_name:'Past Member',customer_phone:'919876543210',status:'past',plan_name:'Gym Membership',class_time:today+'T10:00:00+05:30',coach_id:1,class_days:['mon']}],currentMembers:[{id:1,name:'Sadiq',email:'member@example.test',phone:'919876543210',status:'active',class_name:'Beginners Session',class_time:today+'T10:00:00+05:30',coach_name:'Example Coach'}],pastMembers:[{id:2,name:'Past Member',email:'past@example.test',phone:'919876543210',status:'cancelled',class_name:'Beginners Session',class_time:today+'T10:00:00+05:30',coach_name:'Example Coach'}]})});return;
    }
    if(url.pathname==='/api/admin/marketing-suite'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,cells:[{element_key:'Header Button',event_count:12,duration_ms:24000,x_bucket:5,y_bucket:20,visitors:2}],paths:[{path:'/',label:'Home'}],mapType:'heat',path:'/'})});return;
    }
    if(url.pathname==='/api/portal/dashboard'){
      const role=(request.headers().referer||'').includes('coach-dashboard')?'coach':'student';
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...base,account:{id:1,role,status:'active',displayName:role==='student'?'Aarav Mehta':'Maya Rao',email:'example@example.test'},profile:{},schedule:[],assignments:[],subscriptions:[],notifications:[],scheduleRequests:[]})});return;
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(base)});return;
  }
  await route.continue();
};
await context.route('**/*',baseRoute);
const visibleNames=id=>page.evaluate(id=>[...document.querySelector('#'+id).querySelectorAll('input,select,textarea')].filter(el=>el.type!=='hidden'&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.classList.contains('db137-native-control')).map(el=>el.name),id);
const layout=()=>page.evaluate(()=>[...document.querySelectorAll('#dashboard .dashboard-cards')].map(container=>({rows:container.dataset.db137Rows,dots:[...container.parentElement.querySelectorAll('.db136-carousel-dots,.db137-carousel-dots')].map(d=>({class:d.className,count:d.querySelectorAll('button').length})),width:container.clientWidth,scrollWidth:container.scrollWidth,classes:container.className,firstWidth:container.firstElementChild?.getBoundingClientRect().width,margin:getComputedStyle(container).marginLeft}))); 
import {runWorkflows} from './gym-browser-cases.mjs';
import {runFitnessTipsWorkflows} from './gym-fitness-tips-cases.mjs';
import {runPublicFitnessTipsWorkflows} from './gym-public-fitness-tips-cases.mjs';
import {runLayoutThemeWorkflows} from './gym-layout-theme-cases.mjs';
try{
 await page.goto(origin+'/admin/',{waitUntil:'load'});
 const args={page,context,origin,output,writes,errors,baseRoute};
 if(process.argv.includes('--layout-theme-only'))await runLayoutThemeWorkflows(args);
 else if(process.argv.includes('--public-fitness-only'))await runPublicFitnessTipsWorkflows(args);
 else{await runFitnessTipsWorkflows(args);if(!process.argv.includes('--fitness-tips-only')){await runPublicFitnessTipsWorkflows(args);await runWorkflows(args);await runLayoutThemeWorkflows(args);}}
}catch(error){await writeFile(join(output,'workflow-failure.html'),await page.content());await page.screenshot({path:join(output,'workflow-failure.png'),fullPage:true});await writeFile(join(output,'workflow-failure-errors.json'),JSON.stringify({errors,writes,browserDiagnostics,state:await page.evaluate(()=>({url:location.href,attributes:[...document.documentElement.attributes].map(a=>[a.name,a.value]),adminScript:typeof window.startAdmin,adminState:typeof window.A}))},null,2));throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
