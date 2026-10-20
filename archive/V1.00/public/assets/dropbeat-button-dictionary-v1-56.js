import { BUTTON_DEFINITIONS, BUTTON_BY_KEY, normalizeButtonLabel, normalizeButtonTarget } from './button-dictionary-defaults-v1-56.js';
/* Bind the original controls. No cart, authentication or form handler is replaced. */
let payload=null,lookup=new Map(),refreshing=null;
const originals=new WeakMap();let observer,queued=false,started=false;
const adminPage=location.pathname.startsWith('/admin'),selector='[data-db156-button]';
function setLabel(node,label){
 const copy=node.querySelector(':scope>[data-db156-label],:scope>.uc-checkout-label');
 if(copy){if(copy.textContent!==label)copy.textContent=label;}
 else{
  const texts=[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE),text=texts.find(n=>n.nodeValue.trim())||texts[0];
  if(text){const suffix=node.querySelector(':scope>[aria-hidden]')?' ':'';const value=label+suffix;if(text.nodeValue!==value)text.nodeValue=value;}
  else{
   const candidate=node.querySelector(':scope>span:not([aria-hidden]):not(.google-mark):not([data-cart-count]):not(.uc-checkout-count-badge)');
   if(candidate&&!candidate.children.length){if(candidate.textContent!==label)candidate.textContent=label;}
   else node.append(document.createTextNode(label));
  }
 }
 if(node.matches('.cart-pill')){const count=node.querySelector('[data-cart-count]')?.textContent.trim()||'0';const name=label+' ('+count+')';if(node.getAttribute('aria-label')!==name)node.setAttribute('aria-label',name);}
}
function bind(node,definition){
 if(node.closest('[data-db156-editor]'))return;
 if(node.dataset.db156Button!==definition.key)node.dataset.db156Button=definition.key;
 if(!originals.has(node))originals.set(node,{href:node.getAttribute('href'),download:node.getAttribute('download'),label:node.textContent.trim()});
 const pending=node.dataset.db159Pending==='1';
 if(!payload){node.dataset.db159Pending='1';node.setAttribute('aria-busy','true');setLabel(node,'');return;}
 const entry=lookup.get(definition.key);if(!entry)return;
 if((node.disabled||node.getAttribute('aria-busy')==='true')&&!pending)return;
 if(pending){delete node.dataset.db159Pending;node.removeAttribute('aria-busy');}
 const original=originals.get(node),menuLogin=definition.key==='front.auth.login'&&node.closest('.navlinks');
 const keepsMenuLabel=menuLogin&&entry.label===definition.label&&entry.target===definition.target;
 if(keepsMenuLabel){
  // Header Order owns this label unless an explicit dictionary override is active.
  if(original.dictionaryLabel&&node.textContent.trim()===original.dictionaryLabel)setLabel(node,original.label);
  else original.label=node.textContent.trim();
  original.dictionaryLabel='';
 }else{
  if(menuLogin){if(!original.dictionaryLabel||node.textContent.trim()!==original.dictionaryLabel)original.label=node.textContent.trim();original.dictionaryLabel=entry.label;}
  setLabel(node,entry.label);
 }
 if(node.tagName==='A'){
  const current=node.getAttribute('href');let href=entry.target;
  if(entry.target.startsWith('action:')){
   if(original.dictionaryHref!==undefined&&current===original.dictionaryHref)href=original.href;
   else{original.href=current;href=current;}
   delete original.dictionaryHref;
  }else{
   if(original.dictionaryHref===undefined||current!==original.dictionaryHref)original.href=current;
   original.dictionaryHref=href;
  }
  if(href!==null&&node.getAttribute('href')!==href)node.setAttribute('href',href);
  // A configured page destination is navigation rather than a CSV download.
  if(original.download!==null){if(entry.target!==definition.target)node.removeAttribute('download');else node.setAttribute('download',original.download);}
 }
}
function render(){
 queued=false;observer?.disconnect();
 try{
  for(const definition of BUTTON_DEFINITIONS){
   if((definition.category==='admin')!==adminPage)continue;
   document.querySelectorAll(definition.selector).forEach(node=>bind(node,definition));
  }
  document.querySelectorAll(selector).forEach(node=>{const definition=BUTTON_BY_KEY.get(node.dataset.db156Button);if(definition&&((definition.category==='admin')===adminPage)&&!node.matches('[data-db109-coach-more]'))bind(node,definition);});
 }finally{if(payload)window.DropBeatDynamicUI?.state('buttons','ready');observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','disabled','href']});}
}
function queue(){if(!queued){queued=true;queueMicrotask(render);}}
export function applyButtonDictionary(next){
 if(!next||!Array.isArray(next.buttons)||typeof next.revision!=='string')return false;
 if(payload?.updatedAt&&String(next.updatedAt||'')<payload.updatedAt)return false;
 const checked=new Map();
 for(const item of next.buttons){const definition=BUTTON_BY_KEY.get(item.key);if(!definition)continue;try{checked.set(item.key,{...definition,label:normalizeButtonLabel(item.label),target:normalizeButtonTarget(item.target,definition)});}catch{return false;}}
 const required=BUTTON_DEFINITIONS.filter(row=>(row.category==='admin')===adminPage);
 if(required.some(row=>!checked.has(row.key)))return false;
 payload={revision:next.revision,updatedAt:String(next.updatedAt||''),buttons:[...checked.values()]};lookup=checked;if(adminPage)window.DropBeatDataCache?.set('admin:/api/admin/button-dictionary',payload);queue();
 window.dispatchEvent(new CustomEvent('dropbeat:buttons-updated',{detail:{revision:payload.revision}}));return true;
}
export function refreshButtonDictionary({force=false}={}){
 if(refreshing)return refreshing;window.DropBeatDynamicUI?.state('buttons',payload?'ready':'loading');
 const path=adminPage?'/api/admin/button-dictionary':'/api/public/button-dictionary';
 const load=()=>window.DropBeatDynamicUI.json(path,{cache:'no-cache',credentials:'same-origin',headers:{'X-DropBeat-Revalidate':'1'}});
 refreshing=(async()=>{try{const next=window.DropBeatDataCache?await window.DropBeatDataCache.query((adminPage?'admin:':'public:')+path,load,{persist:!adminPage,staleTime:60000,maxAge:300000,force,onUpdate:applyButtonDictionary}):await load();if(!applyButtonDictionary(next))throw Error('Invalid button configuration.');}catch(error){window.DropBeatDynamicUI?.state('buttons','error',error.message||'Buttons could not be loaded.');}return payload;})().finally(()=>refreshing=null);return refreshing;
}
function configuredNavigation(event,node){
 const definition=BUTTON_BY_KEY.get(node?.dataset.db156Button),entry=lookup.get(node?.dataset.db156Button);
 if(!definition||!entry||node.disabled||entry.target.startsWith('action:')||entry.target===definition.target)return;
 event.preventDefault();event.stopImmediatePropagation();location.assign(entry.target);
}
function install(){
 if(started||!document.body)return;started=true;observer=new MutationObserver(queue);render();
 document.addEventListener('click',event=>{const node=event.target.closest?.(selector);if(node)configuredNavigation(event,node);},true);
 document.addEventListener('submit',event=>{const node=event.submitter||event.target.querySelector('button[type="submit"]'+selector);if(node)configuredNavigation(event,node);},true);
 if(adminPage){const app=document.querySelector('#adminApp');if(app&&!app.hidden)refreshButtonDictionary();else if(app){const auth=new MutationObserver(()=>{if(!app.hidden){auth.disconnect();refreshButtonDictionary();}});auth.observe(app,{attributes:true,attributeFilter:['hidden']});}}else{refreshButtonDictionary();addEventListener('pageshow',event=>{if(event.persisted)refreshButtonDictionary();});addEventListener('popstate',()=>refreshButtonDictionary());}
}
window.DropBeatButtons=Object.freeze({label:key=>lookup.get(key)?.label||'',target:key=>lookup.get(key)?.target||'',refresh:refreshButtonDictionary,apply:applyButtonDictionary,snapshot:()=>structuredClone(payload),render:queue});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
