/* Same shipped HTML/scripts as production; all API data below is synthetic. */
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url)),temporary=await mkdtemp(join(tmpdir(),'dropbeat-v154-'));
let runner=await readFile(new URL('./verify-mobile-v1-49-final.mjs',import.meta.url),'utf8');
runner=runner.replace("'./v149-final-cases.mjs'",JSON.stringify(new URL('./v154-header-contrast-cases.mjs',import.meta.url).href));
runner=runner.replace("if(url.pathname==='/api/portal/dashboard'){",`if(url.pathname==='/api/portal/payment-statement'){
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,period:{from:'2026-09-18',to:'2026-10-18'},generatedAt:'2026-10-18',customer:{name:'Example student',email:'student@example.test'},brand:{name:'DropBeat'},hasAnyPaymentHistory:true,summary:{paidPaise:60000,pendingPaise:19900,transactionCount:12},rows:Array.from({length:12},(_,i)=>({date:'2026-10-13',plan:'Online Dance Pass',orderId:'ORDER-'+(i+1),amountPaise:5000,pendingPaise:0,status:'Paid',type:'Subscription',gateway:'Razorpay'}))})});return;}
if(url.pathname==='/api/portal/google/start'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authUrl:origin+'/fixture-google-oauth'})});return;}
if(url.pathname==='/api/portal/dashboard'){
`);
runner=runner.replace("profile:{},schedule:[],assignments:[],subscriptions:[],notifications:[],scheduleRequests:[]",`profile:{},showMeetInstallNotice:true,classes:[{memberId:1,className:'Beginners Session',eventType:'online_class',classDays:['Monday','Tuesday'],classTime:'10:00',durationMinutes:60,coach:{name:'Example Coach'},paymentStatus:'Active',paymentMode:'Subscription',feesPaidPaise:19900}],activity:{orders:Array.from({length:12},(_,i)=>({order_id:'ORDER-'+(i+1),items:'Online Dance Pass',amount_paise:19900,payment_status:'paid',created_at:'2026-10-13'}))},availablePlans:products,schedule:Array.from({length:4},(_,i)=>({date:'2026-10-'+(19+i),startsAt:'2026-10-'+(19+i)+'T10:00:00+05:30',source:'product',sourceId:1,eventType:'online_class',className:'Beginners Session '+(i+1),coach:{id:1,name:'Example Coach'},durationMinutes:60,status:'scheduled',join:{code:i?'too_early':'available',label:i?'Join opens five minutes before this class':'Join Session'},joinUrl:origin+'/fixture-join-'+i})),assignments:[],subscriptions:[],notifications:[],scheduleRequests:[]`);
const script=join(temporary,'runner.mjs');await writeFile(script,runner);
const child=spawn(process.execPath,[script],{cwd:project,env:{...process.env,DROPBEAT_TEST_ROOT:project},stdio:'inherit'});
const code=await new Promise(resolve=>child.on('exit',resolve));await rm(temporary,{recursive:true,force:true});process.exitCode=code??1;
