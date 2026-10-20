/* Runtime tests for public cache lifecycle and Edge read budgets, not source-pattern assertions. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {onRequestGet as pageEndpoint} from '../functions/api/public/pages.js';
import {edgeCachedResponse,purgePublicEdgeCaches,dropbeatPublicCacheEntries} from '../functions/_lib/edge-response-cache.js';
let clock=10_000_000,revision=1,reads=0;const oldNow=Date.now,oldCache=globalThis.caches;Date.now=()=>clock;
const cache=new Map();globalThis.caches={default:{async match(req){return cache.get(req.url)?.clone();},async put(req,res){cache.set(req.url,res.clone());},async delete(req){return cache.delete(req.url);}}};
const env={DB:{prepare(sql){return {bind(...values){this.values=values;return this;},async first(){reads++;return {page_key:'about',title:'Revision '+revision,body_html:'<p>Saved text</p>'};},async all(){reads++;return {results:sql.startsWith('SELECT DISTINCT')?[{page_key:'about',slug:'studio'}]:[{question:'Question',answer_html:'Answer'}]};}};}}};
const request=new Request('https://studio.example/api/public/pages?key=about');
try{
 let schema=0;const get=req=>pageEndpoint({request:req||request,env,data:{db150PreparePublicRead:()=>schema++},waitUntil:()=>{}});
 const initial=await Promise.all(Array.from({length:30},()=>get()));assert.equal(reads,1);assert.equal(schema,1);assert.equal((await initial[0].json()).page.title,'Revision 1');
 for(let i=0;i<30;i++)await get();assert.equal(reads,1,'Warm page Edge cache adds no D1 reads');
 revision=2;clock+=61000;
 const revalidate=new Request(request,{headers:{'X-DropBeat-Revalidate':'1'}});
 const updated=await Promise.all(Array.from({length:30},()=>get(revalidate)));assert.equal(reads,2,'Thirty return checks share one D1 page lookup');for(const response of updated)assert.equal((await response.json()).page.title,'Revision 2');
 const entries=await dropbeatPublicCacheEntries(env);assert.ok(entries.some(e=>e.key==='pages-dropbeat-v151:key:about'));assert.ok(entries.some(e=>e.key==='pages-dropbeat-v151:slug:studio'));
 revision=3;await purgePublicEdgeCaches(request,entries);assert.equal((await (await get()).json()).page.title,'Revision 3','Post-save purge refreshes a page inside the TTL');
 let productReads=0;const product=new Request('https://studio.example/api/public/products');const load=()=>{productReads++;return Promise.resolve(new Response(JSON.stringify({revision}),{headers:{'cache-control':'public, max-age=120'}}));};
 const productGet=req=>edgeCachedResponse({request:req||product,key:'v151-return-budget',ttl:120,load});await productGet();clock+=59000;await productGet(new Request(product,{headers:{'X-DropBeat-Revalidate':'1'}}));assert.equal(productReads,1);clock+=2000;await Promise.all(Array.from({length:25},()=>productGet(new Request(product,{headers:{'X-DropBeat-Revalidate':'1'}}))));assert.equal(productReads,2,'A lifecycle check can refresh before the old two-minute TTL, once per minute');
}finally{Date.now=oldNow;globalThis.caches=oldCache;}
const storage=()=>new Proxy({}, {get(t,k){if(k==='getItem')return n=>t[n]??null;if(k==='setItem')return(n,v)=>{t[n]=String(v);};if(k==='removeItem')return n=>delete t[n];return t[k];}});
let now=2_000_000;const windows=new Map(),documents=new Map();
const context={console,URL,Response,Headers,Request,structuredClone,Map,Set,Promise,Date:{now:()=>now},location:{origin:'https://studio.example'},sessionStorage:storage(),localStorage:storage(),addEventListener:(k,fn)=>windows.set(k,fn),fetch:async()=>new Response('{}',{status:200}),document:{visibilityState:'visible',addEventListener:(k,fn)=>documents.set(k,fn)}};context.window=context;
vm.createContext(context);vm.runInContext(await readFile(new URL('../public/assets/dropbeat-data-cache-v1-50.js',import.meta.url),'utf8'),context);
const api=context.DropBeatDataCache;let publicLoads=0,privateLoads=0,updates=0,current=1;
const loader=async()=>{publicLoads++;return {settings:{name:current}};},options={persist:true,onUpdate:()=>updates++};
api.set('public:/api/public/site',{settings:{name:0}},{persist:true});
assert.equal((await api.query('public:/api/public/site',loader,options)).settings.name,0,'Mount returns the saved public snapshot immediately');await new Promise(r=>setImmediate(r));assert.equal(publicLoads,1);assert.equal(updates,1);assert.equal((await api.query('public:/api/public/site',loader,options)).settings.name,1);
await api.query('admin:/api/admin/products',async()=>{privateLoads++;return {products:[]};});
for(let i=0;i<20;i++){windows.get('pageshow')({persisted:true});windows.get('popstate')();documents.get('visibilitychange')();}
await new Promise(r=>setImmediate(r));assert.equal(publicLoads,1);assert.equal(privateLoads,1,'Return events never revalidate private tables');
now+=61000;current=2;await Promise.all(Array.from({length:30},()=>api.revalidatePublic()));assert.equal(publicLoads,2);assert.equal(updates,2);
now+=61000;await api.revalidatePublic();assert.equal(publicLoads,3);assert.equal(updates,2,'Unchanged JSON does not repaint the UI');
assert.equal(windows.has('focus'),false);assert.equal((await api.query('public:/api/public/site',loader,options)).settings.name,2);
console.log('V1.51 sync regressions passed: public mount/return refresh, unchanged-payload stability, private isolation, 30-way Edge/page deduplication, post-save purge and one-minute D1 budget.');
