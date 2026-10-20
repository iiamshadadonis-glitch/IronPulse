// V1.50: explicit SWR, because Cache API match/put do not implement SWR directives.
// Only public endpoints call this helper. Authenticated responses never share it.
const edgeFlights=new Map(),edgeChecks=new Map();let edgeGeneration=0;
const stamp='x-uc-cache-stored-at';
function cacheKey(request,key){const incoming=new URL(request.url),url=new URL(incoming.origin+incoming.pathname);url.searchParams.set('__uc_edge',String(key||'default'));return new Request(url.toString(),{method:'GET'});}
function returned(response,state){const copy=response.clone(),headers=new Headers(copy.headers);headers.set('x-uc-edge-cache',state);headers.set('cache-control','no-cache, max-age=0, must-revalidate');return new Response(copy.body,{status:copy.status,statusText:copy.statusText,headers});}
export async function edgeCachedResponse({request,waitUntil,key,ttl=120,stale=300,prepare,load}){
  const cache=globalThis.caches?.default,cacheRequest=cacheKey(request,key),id=cacheRequest.url;
  const freshSeconds=Math.max(60,Math.min(900,Number(ttl)||120)),staleSeconds=Math.max(0,Math.min(300,Number(stale)||0));
  const refresh=()=>{
    const existing=edgeFlights.get(id);if(existing?.generation===edgeGeneration)return existing.promise;
    const generation=edgeGeneration;edgeChecks.set(id,Date.now());while(edgeChecks.size>200)edgeChecks.delete(edgeChecks.keys().next().value);
    const task={generation,promise:null};
    task.promise=Promise.resolve().then(()=>prepare?.()).then(load).then(async response=>{
      if(cache&&response?.ok&&!response.headers.has('set-cookie')&&!/private|no-store/i.test(response.headers.get('cache-control')||'')&&generation===edgeGeneration){
        const copy=response.clone(),headers=new Headers(copy.headers);headers.set(stamp,String(Date.now()));headers.set('cache-control',`public, max-age=${freshSeconds+staleSeconds}`);
        // Keep the shared copy past its freshness deadline; the timestamp is the SWR clock.
        try{await cache.put(cacheRequest,new Response(copy.body,{status:copy.status,statusText:copy.statusText,headers}));}catch(_){}
      }
      return response;
    }).finally(()=>{if(edgeFlights.get(id)===task)edgeFlights.delete(id);});
    edgeFlights.set(id,task);return task.promise;
  };
  let hit=null;try{hit=cache?await cache.match(cacheRequest):null;}catch(_){}
  if(hit){
    const stored=Number(hit.headers.get(stamp)),age=stored?Math.max(0,Date.now()-stored):0;
    // A public return/reload checks origin at most once per minute per cached key.
    if(request.headers.get('x-dropbeat-revalidate')==='1'&&age>=60000){
      const running=edgeFlights.get(id);
      if(running?.generation===edgeGeneration||Date.now()-(edgeChecks.get(id)||0)>=60000){
        try{return returned(await refresh(),'REVALIDATED');}catch(_){return returned(new Response(JSON.stringify({error:'Public information could not be refreshed.'}),{status:503,headers:{'content-type':'application/json','retry-after':'60'}}),'STALE');}
      }
    }
    if(age<freshSeconds*1000)return returned(hit,'HIT');
    if(age<(freshSeconds+staleSeconds)*1000){
      // The browser already displayed its stale snapshot. Give its background
      // request the fresh result instead of stacking two stale-cache lifetimes.
      if(request.headers.get('x-dropbeat-revalidate')==='1'){
        const running=edgeFlights.get(id);
        if(running?.generation===edgeGeneration||Date.now()-(edgeChecks.get(id)||0)>=60000){
          try{return returned(await refresh(),'REVALIDATED');}catch(_){}
        }
        return returned(new Response(JSON.stringify({error:'Cached information could not be refreshed.'}),{status:503,headers:{'content-type':'application/json','retry-after':'60'}}),'STALE');
      }
      if(Date.now()-(edgeChecks.get(id)||0)>=60000){
        const task=refresh().catch(()=>{});
        if(typeof waitUntil==='function')try{waitUntil(task);}catch(_){}
      }
      return returned(hit,'STALE');
    }
  }
  return returned(await refresh(),'MISS');
}

export async function purgePublicEdgeCaches(request, entries = []) {
  if(!entries.length)return;edgeGeneration++;
  const cache=globalThis.caches?.default;
  await Promise.all(entries.map(async entry=>{
    let key;try{const url=new URL(entry.path,new URL(request.url).origin);url.searchParams.set('__uc_edge',String(entry.key));key=new Request(url.toString(),{method:'GET'});}catch(_){return;}
    edgeChecks.delete(key.url);
    if(cache&&typeof cache.delete==='function')try{await cache.delete(key);}catch(_){}
  }));
}

export const DROPBEAT_PUBLIC_CACHE_ENTRIES = [
  {path:'/api/public/layout',key:'layout-v157'},
  {path:'/api/public/studio-gallery',key:'studio-gallery-v150'},
  {path:'/api/public/site',key:'site-dropbeat-v113'},
  {path:'/api/public/bootstrap',key:'bootstrap-dropbeat-v113:home'},
  {path:'/api/public/bootstrap',key:'bootstrap-dropbeat-v113:offers'},
  {path:'/api/public/bootstrap',key:'bootstrap-dropbeat-v113:festival'},
  {path:'/api/public/bootstrap',key:'bootstrap-dropbeat-v113:yearly'},
  {path:'/api/public/products',key:'products-dropbeat-v113:'},
  {path:'/api/public/products',key:'products-dropbeat-v113:home'},
  {path:'/api/public/products',key:'products-dropbeat-v113:offers'},
  {path:'/api/public/products',key:'products-dropbeat-v113:festival'},
  {path:'/api/public/products',key:'products-dropbeat-v113:yearly'}
];

export async function dropbeatPublicCacheEntries(env) {
  const entries=[...DROPBEAT_PUBLIC_CACHE_ENTRIES,...['about','faq','privacy','privacy-policy','terms','terms-and-conditions','refund','refund-and-cancellation','contact','404'].map(key=>({path:'/api/public/pages',key:'pages-dropbeat-v151:key:'+key}))];
  // Product placements may use administrator-created page keys. Include those
  // keys in the same post-save purge so a custom page is just as fresh as Home,
  // Offers or Yearly Plans without disabling the existing short edge cache.
  try {
    const result=await env?.DB?.prepare('SELECT DISTINCT page_key,slug FROM content_pages WHERE page_key IS NOT NULL').all();
    for(const row of result?.results||[]){
      const key=String(row.page_key||'').trim();if(!key)continue;
      entries.push({path:'/api/public/pages',key:'pages-dropbeat-v151:key:'+key});if(row.slug)entries.push({path:'/api/public/pages',key:'pages-dropbeat-v151:slug:'+row.slug});
      entries.push({path:'/api/public/products',key:`products-dropbeat-v113:${key}`});
      entries.push({path:'/api/public/bootstrap',key:`bootstrap-dropbeat-v113:${key}`});
    }
  } catch (_) {}
  const seen=new Set();
  return entries.filter(entry=>{const id=`${entry.path}|${entry.key}`;if(seen.has(id))return false;seen.add(id);return true;});
}
