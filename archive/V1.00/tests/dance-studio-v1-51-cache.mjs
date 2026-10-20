import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {edgeCachedResponse,purgePublicEdgeCaches} from '../functions/_lib/edge-response-cache.js';
import {onRequest as middleware} from '../functions/_middleware.js';
let clock=2_000_000;const realNow=Date.now;Date.now=()=>clock;
const store=new Map(),waits=[];let reads=0;
const oldCaches=globalThis.caches;
globalThis.caches={default:{
 async match(req){const v=store.get(req.url);return v&&v.expiry>clock?v.response.clone():undefined;},
 async put(req,response){store.set(req.url,{response:response.clone(),expiry:clock+1000*Number(response.headers.get('cache-control').match(/max-age=(\d+)/)[1])});},
 async delete(req){return store.delete(req.url);}
}};
const req=new Request('https://studio.example/api/public/products?page=home&fresh=1');
const load=async()=>{reads++;await Promise.resolve();return new Response(JSON.stringify({revision:reads}),{headers:{'content-type':'application/json','cache-control':'public, max-age=120'}});};
const query=(request=req,key='test-v150',loader=load)=>edgeCachedResponse({request,key,ttl:120,stale:300,load:loader,waitUntil:p=>waits.push(p)});
try{
 const initial=await Promise.all(Array.from({length:40},()=>query()));assert.equal(reads,1);assert.ok(initial.every(r=>r.headers.get('x-uc-edge-cache')==='MISS'));assert.equal((await initial[39].json()).revision,1);
 for(let i=0;i<40;i++)assert.equal((await query()).headers.get('x-uc-edge-cache'),'HIT');assert.equal(reads,1,'Warm Edge hits perform no loader/D1 reads');
 clock+=121000;const stale=await Promise.all(Array.from({length:40},()=>query()));assert.ok(stale.every(r=>['STALE','HIT'].includes(r.headers.get('x-uc-edge-cache'))));await Promise.all(waits.splice(0));assert.equal(reads,2,'Stale burst revalidates once');
 assert.equal((await query(new Request('https://studio.example/api/public/products?fresh=999'))).headers.get('x-uc-edge-cache'),'HIT');assert.equal(reads,2,'Cache-busting query strings do not change an explicit public cache key');
 await query(new Request('https://other.example/api/public/products'));assert.equal(reads,3,'Origins never share a cache entry');
 clock+=121000;let failures=0;const fail=async()=>{failures++;throw Error('Synthetic failure');};await query(req,'test-v150',fail);await Promise.all(waits.splice(0));for(let i=0;i<20;i++)await query(req,'test-v150',fail);assert.equal(failures,1,'Failure backoff prevents a repeated stale-read storm');
 clock+=60001;await query(req,'test-v150',fail);await Promise.all(waits.splice(0));assert.equal(failures,2);
 await purgePublicEdgeCaches(req,[{path:'/api/public/products',key:'test-v150'}]);await query();assert.equal(reads,4,'Post-save purge makes the next read fresh');
 let finish;const delayed=new Promise(resolve=>finish=resolve);const late=query(req,'late-v150',async()=>{await delayed;return load();});await Promise.resolve();await Promise.resolve();await purgePublicEdgeCaches(req,[{path:'/api/public/products',key:'late-v150'}]);finish();await late;
 assert.equal([...store.keys()].some(k=>k.includes('late-v150')),false,'An older in-flight fill cannot resurrect a purged entry');
 let unsafe=0;const noStore=()=>{unsafe++;return Promise.resolve(new Response('{}',{headers:{'cache-control':'private, no-store'}}));};await query(req,'private-v150',noStore);await query(req,'private-v150',noStore);assert.equal(unsafe,2,'Private responses are not shared at the Edge');
 let schemaReads=0;const context={request:req,env:{DB:{prepare(){schemaReads++;throw Error('Warm cache must not access D1');}}},data:{},waitUntil:p=>waits.push(p)};
 context.next=()=>edgeCachedResponse({request:req,key:'test-v150',ttl:120,stale:300,prepare:context.data.db150PreparePublicRead,load});
 const budget=reads;await middleware(context);assert.equal(reads,budget);assert.equal(schemaReads,0,'A real middleware cache hit bypasses schema/D1 preparation');
 await query(req,'browser-revalidate-v150');clock+=121000;const beforeBackground=reads;
 const backgroundRequest=new Request(req,{headers:{'X-DropBeat-Revalidate':'1'}});
 const fresh=await Promise.all(Array.from({length:20},()=>query(backgroundRequest,'browser-revalidate-v150')));
 assert.equal(reads,beforeBackground+1,'Browser background checks share the Edge revalidation');
 for(const response of fresh){assert.equal(response.headers.get('x-uc-edge-cache'),'REVALIDATED');assert.equal((await response.json()).revision,reads);}
}finally{globalThis.caches=oldCaches;Date.now=realNow;}
console.log('V1.51 Edge SWR/read-budget checks passed: warm zero-read hits, 40-way deduplication, bounded stale refresh, error backoff, purge race and origin isolation.');

const storage=()=>new Proxy({}, {get(t,k){if(k==='getItem')return n=>t[n]??null;if(k==='setItem')return(n,v)=>{t[n]=String(v);};if(k==='removeItem')return n=>delete t[n];return t[k];}});
let now=5_000_000,calls=0;const listeners=new Map(),responses=[];
const context={console,URL,Response,Headers,Request,structuredClone,Map,Set,Promise,Date:{now:()=>now},location:{origin:'https://studio.example'},sessionStorage:storage(),localStorage:storage(),addEventListener:(k,fn)=>listeners.set(k,fn),fetch:async(input,init)=>{calls++;return new Response(JSON.stringify(responses.shift()||{}),{status:200,headers:{'content-type':'application/json'}});}};
context.document={visibilityState:'visible',addEventListener:(k,fn)=>listeners.set('document:'+k,fn)};context.window=context;vm.createContext(context);vm.runInContext(await readFile(new URL('../public/assets/dropbeat-data-cache-v1-50.js',import.meta.url),'utf8'),context);
const cache=context.DropBeatDataCache;let loads=0,version=1;
const loader=async()=>{loads++;return {version,nested:{ok:true}};};
let r=await Promise.all(Array.from({length:50},()=>cache.query('public:/api/public/bootstrap?page=home&fresh=9',loader,{persist:true})));assert.equal(loads,1);
r[0].nested.ok=false;assert.equal((await cache.query('public:/api/public/bootstrap?fresh=10&page=home',loader,{persist:true})).nested.ok,true,'Cached data is cloned');
now+=61000;version=2;let updated=0;const stale=await cache.query('public:/api/public/bootstrap?page=home',loader,{persist:true,onUpdate:()=>updated++});assert.equal(stale.version,1);await new Promise(resolve=>setImmediate(resolve));assert.equal(loads,2);assert.equal(updated,1);assert.equal((await cache.query('public:/api/public/bootstrap?page=home',loader)).version,2);
for(let i=0;i<50;i++)await cache.query('public:/api/public/bootstrap?page=home',loader);assert.equal(loads,2);
await cache.query('public:/api/public/bootstrap?page=offers',loader,{persist:true});assert.equal(loads,3,'Distinct page filters retain distinct keys');
await cache.query('admin:/api/admin/settings',loader,{persist:true});assert.ok(Object.keys(context.sessionStorage).every(k=>!k.includes('admin:')),'Private admin JSON never enters persistent browser storage');
assert.equal(listeners.has('focus'),false);assert.equal(listeners.has('visibilitychange'),false,'No window-focus revalidation');assert.equal(listeners.has('document:visibilitychange'),true,'Only public registered endpoints revalidate on return');
cache.invalidate('public:');cache.set('public:/api/public/site',{settings:{siteName:'Old'}},{persist:true});responses.push({ok:true});await context.fetch('/api/admin/settings',{method:'POST'});await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal((await cache.query('public:/api/public/site',loader)).settings,undefined,'Successful write replaces old public snapshots');
// Execute the real admin transport/cache prefix to verify normalized settings write-through.
context.document={querySelector:()=>null,querySelectorAll:()=>[],activeElement:null};context.navigator={};
const admin=await readFile(new URL('../public/admin/admin.js',import.meta.url),'utf8');vm.runInContext(admin.slice(0,admin.indexOf('function scheduleAdminPrefetch()')),context);
responses.push({ok:true,settings:{siteName:'Saved & normalized'}});const before=calls;
await context.api('/api/admin/settings',{method:'POST',body:'{"siteName":"Saved"}'});const saved=await context.api('/api/admin/settings');assert.equal(saved.settings.siteName,'Saved & normalized');assert.equal(calls,before+1,'A successful settings mutation followed by reload uses its returned data without another GET');
responses.push({products:[{id:1}]});const beforeProducts=calls;await Promise.all(Array.from({length:25},()=>context.api('/api/admin/products')));assert.equal(calls,beforeProducts+1);
assert.equal(/refetchOnWindowFocus|addEventListener\(['"]focus/.test(await readFile(new URL('../public/assets/dropbeat-data-cache-v1-50.js',import.meta.url),'utf8')),false);
console.log('V1.51 client SWR/read-budget checks passed: 50-way deduplication, one-minute minimum checks, clones, public-only persistence, distinct filters, no focus polling and normalized zero-GET settings saves.');
