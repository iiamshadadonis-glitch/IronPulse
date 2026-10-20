import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.resolve(process.argv[2]||path.join(root,'qa-output','dropbeat-v1.17-payment-statement.pdf'));
const require=createRequire(import.meta.url),canvasModule=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas')),{createCanvas,Image}=canvasModule,logoBytes=fs.readFileSync(path.join(root,'public/assets/dropbeat-invoice-logo.jpg'));
fs.mkdirSync(path.dirname(output),{recursive:true});
class LocalBrandImage extends Image{set src(_value){super.src=logoBytes;}}
const app={dataset:{portalRole:'student'},style:{setProperty(){}}},listeners={};
const document={querySelector(selector){return selector==='.portal-app'?app:null;},querySelectorAll(){return[];},addEventListener(type,handler){listeners[type]=handler;},createElement(tag){if(tag==='canvas')return createCanvas(300,150);return {style:{},dataset:{},append(){},appendChild(){},remove(){},setAttribute(){}};},body:{append(){},appendChild(){}}};
const sandbox={document,console,Image:LocalBrandImage,TextEncoder,Uint8Array,Blob,URL,Intl,Date,Math,JSON,Promise,setTimeout,clearTimeout,atob,btoa,CustomEvent:class CustomEvent{},location:{pathname:'/student-dashboard'},sessionStorage:{setItem(){},getItem(){return null;}}};sandbox.window=sandbox;sandbox.addEventListener=(type,handler)=>{listeners[type]=handler;};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'public/assets/portal-dashboard-v1-17.js'),'utf8'),sandbox,{filename:'portal-dashboard-v1-17.js'});
const fixture={period:{from:'2026-07-01',to:'2026-09-27'},generatedAt:'2026-09-27T12:30:00.000Z',brand:{name:'DropBeat Dance Studio',tagline:'Online and studio dance classes for every level',primaryColor:'#4B55BE',accentColor:'#A469A8'},customer:{name:'Aarohi Sharma',email:'aarohi@example.com',phone:'+91 98765 43210'},summary:{paidPaise:678300,pendingPaise:19900,transactionCount:18},hasAnyPaymentHistory:true,rows:Array.from({length:18},(_,index)=>({date:`2026-${String(9-Math.floor(index/7)).padStart(2,'0')}-${String(27-index%7).padStart(2,'0')}T06:30:00.000Z`,orderId:`DB-2026-${String(index+1).padStart(4,'0')}`,plan:index%3===0?'Online Dance Pass':index%3===1?'Studio Dance Membership':'Private Coaching Circle',type:index%4===0?'Renewal':'Subscription',gateway:index%3===0?'Razorpay':index%3===1?'PhonePe':'Stripe',amountPaise:index===17?0:39900,pendingPaise:index===17?19900:0,status:index===17?'Awaiting Payment':'Paid',reference:`pay_statement_${index+1}`}))};
const canvases=await sandbox.DropBeatStatementPdf.statementCanvases(fixture),bytes=sandbox.DropBeatStatementPdf.pdfFromCanvases(canvases);fs.writeFileSync(output,Buffer.from(bytes));console.log(`${output}\n${canvases.length} pages generated with the production statement renderer.`);
