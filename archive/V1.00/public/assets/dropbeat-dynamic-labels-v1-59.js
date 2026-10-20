/* First-paint loading/error states. The existing SWR/layout stores own all values. */
(()=>{'use strict';
 if(window.DropBeatDynamicUI)return;
 const root=document.documentElement,states={buttons:{status:'loading',error:''},layout:{status:'loading',error:''}};
 for(const key of Object.keys(states))root.dataset['db159'+key[0].toUpperCase()+key.slice(1)]='loading';
 function errorUI(){
  if(!document.body)return;const errors=Object.values(states).filter(s=>s.error);let notice=document.getElementById('db159NavigationError');
  if(!errors.length){notice?.remove();return;}
  if(!notice){notice=document.createElement('div');notice.id='db159NavigationError';notice.className='db159-navigation-error';notice.setAttribute('role','alert');const text=document.createElement('span');text.textContent='Navigation labels could not be refreshed.';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=async()=>{retry.disabled=true;await Promise.allSettled([states.buttons.error?window.DropBeatButtons?.refresh({force:true}):null,states.layout.error?window.DropBeatLayout?.refresh({force:true}):null]);retry.disabled=false;};notice.append(text,retry);(document.querySelector('#adminApp .main,.portal-main,main')||document.body).prepend(notice);const header=document.querySelector('.topbar');if(header){const bottom=Math.max(...[header,header.querySelector('.nav-actions')].filter(Boolean).map(node=>node.getBoundingClientRect().bottom)),overlap=bottom+12-notice.getBoundingClientRect().top;if(overlap>0)notice.style.marginTop=(parseFloat(getComputedStyle(notice).marginTop)+overlap)+'px';}}
 }
 function state(kind,status,error=''){if(!states[kind])return;const previous=states[kind];previous.error=error;previous.status=status==='error'&&previous.status==='ready'?'ready':status;root.dataset['db159'+kind[0].toUpperCase()+kind.slice(1)]=previous.status;errorUI();}
 async function json(url,options={},milliseconds=8000){
  const controller=new AbortController();let timer;
  try{return await Promise.race([(async()=>{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok)throw Error('Navigation configuration is unavailable.');const value=await response.json();if(!value||typeof value!=='object')throw Error('Invalid navigation configuration.');return value;})(),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Navigation configuration timed out.'));controller.abort();},milliseconds);})]);}
  finally{clearTimeout(timer);}
 }
 function label(node,name){
  if(!node)return;node.dataset.db159Name=name;let span=node.querySelector(':scope>[data-db159-label],:scope>.uc62-nav-label');
  if(!span){span=document.createElement('span');node.prepend(span);}span.setAttribute('data-db159-label','');
  for(const child of [...node.childNodes])if(child.nodeType===3)child.remove();
  const value=window.DropBeatLayout?.names()?.[name]||'';if(span.textContent!==value)span.textContent=value;
 }
 window.DropBeatDynamicUI=Object.freeze({state,json,label,status:kind=>states[kind]?.status});
 document.addEventListener('DOMContentLoaded',errorUI,{once:true});
})();
