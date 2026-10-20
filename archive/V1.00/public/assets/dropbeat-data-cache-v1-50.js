/* Framework-free extension of the existing API caches. Private data stays in memory. */
(()=>{
  'use strict';
  if(window.DropBeatDataCache)return;
  const entries=new Map(),pending=new Map(),checks=new Map(),observers=new Map();let generation=0;
  const prefix='dropbeat-public-v151:',clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  function keyOf(key){
    const scope=String(key).startsWith('public:')?'public:':'admin:',raw=String(key).slice(scope.length),url=new URL(raw,location.origin);
    if(scope==='public:')for(const name of ['fresh','_','_ts','dropbeat','build'])url.searchParams.delete(name);
    url.searchParams.sort();return scope+url.pathname+(url.search?'?'+url.searchParams.toString():'');
  }
  function forgetStored(){try{for(const name of Object.keys(sessionStorage))if(name.startsWith(prefix))sessionStorage.removeItem(name);}catch(_){}}
  function invalidate(scope=''){
    generation++;
    for(const map of [entries,pending,checks])for(const key of map.keys())if(!scope||key.startsWith(scope))map.delete(key);
    if(!scope||scope==='public:')forgetStored();
  }
  function stored(key){
    if(!key.startsWith('public:'))return null;
    try{const value=JSON.parse(sessionStorage.getItem(prefix+key)||'null');if(value&&Number.isFinite(value.at)&&Date.now()-value.at<300000&&Date.now()>=value.at)return value;sessionStorage.removeItem(prefix+key);}catch(_){}return null;
  }
  function set(key,data,{persist=false}={}){
    key=keyOf(key);const entry={data:clone(data),at:Date.now()};entries.delete(key);entries.set(key,entry);checks.set(key,entry.at);
    while(entries.size>60)entries.delete(entries.keys().next().value);
    if(persist&&key.startsWith('public:'))try{const value=JSON.stringify(entry);if(value.length<300000){const names=Object.keys(sessionStorage).filter(name=>name.startsWith(prefix));if(names.length>=12&&!names.includes(prefix+key))sessionStorage.removeItem(names[0]);sessionStorage.setItem(prefix+key,value);}}catch(_){}
    return clone(data);
  }
  function request(key,load,options){
    if(pending.has(key))return pending.get(key);
    const epoch=generation;checks.set(key,Date.now());
    const promise=Promise.resolve().then(()=>load({background:Boolean(options.background)})).then(data=>{
      if(epoch===generation){const previous=entries.get(key),changed=!previous||JSON.stringify(previous.data)!==JSON.stringify(data);set(key,data,options);if(options.background&&changed)try{options.onUpdate?.(clone(data));}catch(_){} }
      return data;
    }).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
    pending.set(key,promise);return promise;
  }
  async function query(key,load,options={}){
    key=keyOf(key);const firstPublic=key.startsWith('public:')&&!observers.has(key);if(key.startsWith('public:'))observers.set(key,{load,options});const staleTime=Math.max(60000,Number(options.staleTime)||60000),maxAge=Math.max(staleTime,Math.min(300000,Number(options.maxAge)||300000));
    let hit=entries.get(key);if(!hit&&options.persist){hit=stored(key);if(hit)entries.set(key,hit);}
    const age=hit?Date.now()-hit.at:Infinity;
    if(!options.force&&hit&&age>=0&&age<maxAge){
      if(firstPublic||(age>=staleTime&&Date.now()-(checks.get(key)||hit.at)>=60000))request(key,load,{...options,background:true}).catch(()=>{});
      return clone(hit.data);
    }
    return clone(await request(key,load,{...options,background:false}));
  }
  // Public lifecycle checks reuse the same in-flight request and a 60-second budget.
  // Private dashboards are deliberately excluded from visibility/focus revalidation.
  async function revalidatePublic({force=false}={}){
    return Promise.allSettled([...observers].map(([key,{load,options}])=>{
      if(!force&&Date.now()-(checks.get(key)||0)<60000)return Promise.resolve();
      return request(key,load,{...options,background:true});
    }));
  }
  addEventListener('pageshow',event=>{if(event.persisted)revalidatePublic();});
  addEventListener('popstate',()=>revalidatePublic());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')revalidatePublic();});
  function announce(){
    invalidate('public:');revalidatePublic({force:true});try{localStorage.setItem('dropbeat-public-invalidated',Date.now()+':'+Math.random());}catch(_){}
  }
  addEventListener('storage',event=>{if(event.key==='dropbeat-public-invalidated'){invalidate('public:');revalidatePublic({force:true});}});
  // Observe successful writes only. The original fetch, request, response and handlers are untouched.
  const originalFetch=window.fetch;
  window.fetch=function(input,init){
    const result=originalFetch.apply(this,arguments);let url,method;
    try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.origin);method=String(init?.method||input?.method||'GET').toUpperCase();}catch(_){return result;}
    if(url.origin===location.origin&&method!=='GET'&&method!=='HEAD'&&((url.pathname.startsWith('/api/admin/')&&url.pathname!=='/api/admin/notification-routing')||url.pathname==='/api/portal/profile'))result.then(response=>{if(response.ok)announce();},()=>{});
    return result;
  };
  window.DropBeatDataCache=Object.freeze({query,set,invalidate,keyOf,revalidatePublic});
})();
