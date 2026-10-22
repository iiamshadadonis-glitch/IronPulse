import {LAYOUT_THEMES,LAYOUT_NAMES} from './layout-registry-v1-57.js';
/* Presentation only: keep the original nodes, routes, forms and action handlers. */
const admin=location.pathname.startsWith('/admin'),portal=/(?:member-dashboard|coach-dashboard|login)(?:\.html)?\/?$/.test(location.pathname),phone=matchMedia('(max-width:760px)');
let model=null,observer,queued=false,refreshing=null;const styles=new Map(),texts=new Map();
const date=value=>Date.parse(value||'')||0;
function textNode(node){const label=node.querySelector(':scope>[data-db159-label]');if(label){if(!label.firstChild)label.append(document.createTextNode(''));return label.firstChild;}const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(n.nodeValue.trim()&&!n.parentElement.closest('svg,[aria-hidden="true"],.nav-badge,.uc86-count-badge,.uc-checkout-count-badge'))return n;}return null;}
function names(){const values={...(model?.names||{})};const dictionary=window.DropBeatButtons?.snapshot();if(dictionary&&date(dictionary.updatedAt)>=date(model?.buttonDictionary?.updatedAt))for(const [key,definition]of Object.entries(LAYOUT_NAMES)){if(!definition.button)continue;const row=dictionary.buttons.find(row=>row.key===definition.button);if(row)values[key]=row.label;}return values;}
function heading(desired,node,label,name){if(!node||!label||node.closest('.footer .designed,[data-instautomate-attribution]'))return;const target=textNode(node);if(target)desired.set(node,{target,label,name});}
function agencyAttribution(){for(const link of document.querySelectorAll('.footer .designed a')){let url;try{url=new URL(link.href,location.origin);}catch{continue;}if(url.hostname!=='instautomate.com'&&url.hostname!=='www.instautomate.com')continue;const label=link.querySelector('strong')||link;if(label.textContent!=='Instautomate')label.textContent='Instautomate';if(link.getAttribute('href')!=='https://instautomate.com')link.setAttribute('href','https://instautomate.com');if(link.target!=='_blank')link.target='_blank';if(link.rel!=='noopener noreferrer')link.rel='noopener noreferrer';link.removeAttribute('data-db159-name');link.removeAttribute('data-db157-name');if(link.parentElement&&!link.parentElement.hasAttribute('data-instautomate-attribution'))link.parentElement.setAttribute('data-instautomate-attribution','');}}
function applyText(desired){
 for(const[node,record]of texts)if(!desired.has(node)||!node.isConnected){if(record.target.isConnected&&record.target.nodeValue===record.last)record.target.nodeValue=record.original;node.removeAttribute('data-db157-name');texts.delete(node);}
 for(const[node,item]of desired){let record=texts.get(node);if(!record||record.target!==item.target){record={target:item.target,original:item.target.nodeValue,last:null};texts.set(node,record);}else if(record.last!==null&&item.target.nodeValue!==record.last)record.original=item.target.nodeValue;
  if(node.dataset.db157Name!==item.name)node.dataset.db157Name=item.name;if(item.target.nodeValue!==item.label)item.target.nodeValue=item.label;record.last=item.label;
 }
}
function style(desired,node,key,value){if(!node)return;let map=desired.get(node);if(!map){map=new Map();desired.set(node,map);}map.set(key,String(value));}
function applyStyles(desired){
 for(const[node,properties]of styles)for(const[key,record]of properties)if(!desired.get(node)?.has(key)||!node.isConnected){if(node.style.getPropertyValue(key)===record.last&&node.style.getPropertyPriority(key)==='important'){if(record.original)node.style.setProperty(key,record.original,record.priority);else node.style.removeProperty(key);}properties.delete(key);if(!properties.size)styles.delete(node);}
 for(const[node,properties]of desired){let records=styles.get(node);if(!records){records=new Map();styles.set(node,records);}for(const[key,value]of properties){let record=records.get(key);const current=node.style.getPropertyValue(key);if(!record){record={original:current,priority:node.style.getPropertyPriority(key),last:null};records.set(key,record);}else if(current!==record.last){record.original=current;record.priority=node.style.getPropertyPriority(key);}if(current!==value||node.style.getPropertyPriority(key)!=='important')node.style.setProperty(key,value,'important');record.last=node.style.getPropertyValue(key);}}
}
function blockNode(block){if(block.name&&block.region==='menu'){const links=[...document.querySelectorAll('.navlinks>a,.navlinks>.nav-dropdown>a,.navlinks>.nav-item>a')];return links.find(a=>(LAYOUT_NAMES[block.name].nav&&a.dataset.ucNavKey===LAYOUT_NAMES[block.name].nav)||[LAYOUT_NAMES[block.name].href,model.paths?.[block.name]].includes(new URL(a.href,location.origin).pathname));}const node=document.querySelector(block.selector||'nosuchlayoutblock');return block.closest?node?.closest(block.closest):node;}
function render(){
 queued=false;if(!model)return;observer?.disconnect();const desired=new Map(),labels=new Map(),currentNames=names(),device=phone.matches?'mobile':'desktop';
 try{
  if(!admin&&!portal){
   if(document.documentElement.dataset.siteTheme!==model.theme)document.documentElement.dataset.siteTheme=model.theme;
   if(document.body?.dataset.siteTheme!==model.theme)document.body.dataset.siteTheme=model.theme;
   const mainNodes=new Map();
   for(const block of model.blocks){
    if(block.region==='main'||block.region==='welcome'){if(document.body.dataset.ucLoad!=='home')continue;}
    const node=blockNode(block);if(!node)continue;const config=block.config||{},view=config.viewports?.[device]||{};
    if(config.removed||view.visibility==='hide')style(desired,node,'display','none');
    if(view.visibility==='show'&&!config.removed)style(desired,node,'display',block.region==='menu'?'inline-flex':'block');
    if(view.padding!==undefined)for(const side of ['top','bottom'])style(desired,node,'padding-'+side,view.padding+'px');
    const target=node.querySelector(':scope>.container')||node;
    if(view.width){style(desired,target,'width',view.width==='full'?'100%':'calc(100% - 32px)');style(desired,target,'max-width',view.width==='full'?'none':'1200px');style(desired,target,'margin-inline','auto');}
    if(view.align)style(desired,node,'text-align',view.align);
    const grid=block.grid?node.querySelector(block.grid):null;
    if(grid&&view.columns!==undefined){style(desired,grid,'display','grid');style(desired,grid,'grid-template-columns',`repeat(${view.columns},minmax(0,1fr))`);}
    if(grid&&view.gap!==undefined)style(desired,grid,'gap',view.gap+'px');
    if(block.heading&&config.title)heading(labels,node.querySelector(block.heading),config.title,block.id);
    if(block.name==='stories'&&currentNames.stories!==LAYOUT_NAMES.stories.label)heading(labels,node.querySelector(block.heading),currentNames.stories,'stories');
    if(block.region==='main')mainNodes.set(block.id,node);
   }
   const order=model.layout?.order?.[device];if(order&&document.body.dataset.ucLoad==='home'){const main=document.querySelector('main');style(desired,main,'display','flex');style(desired,main,'flex-direction','column');for(const[id,node]of mainNodes)style(desired,node,'order',order.indexOf(id));}
   for(const[name,definition]of Object.entries(LAYOUT_NAMES)){
    if(!currentNames[name])continue;
    for(const link of document.querySelectorAll('.navlinks>a,.navlinks>.nav-dropdown>.nav-top-link,.navlinks>.nav-item>a,.footer a')){const path=new URL(link.href,location.origin).pathname;if([definition.href,model.paths?.[name]].includes(path)||definition.nav&&[link.dataset.ucNavKey,link.dataset.ucFooterNavKey].includes(definition.nav))heading(labels,link,currentNames[name],name);}
   }
   if(currentNames.blog!==LAYOUT_NAMES.blog.label&&['blog-list','blog-post'].includes(document.body.dataset.ucLoad))for(const node of document.querySelectorAll('main h1'))heading(labels,node,currentNames.blog,'blog');
  }else if(admin){
   const aliases={blog:'.nav [data-tab="blogs"],[data-uc86-hub-target="blogs"],#blogs>.top h1',offers:'.nav [data-tab="products"],[data-uc86-hub-target="products"],#products>.top h1',stories:'.nav [data-tab="successStories"],[data-page-workspace="stories"],#successStories>.top h1'};
   for(const[key,selector]of Object.entries(aliases))if(currentNames[key])for(const node of document.querySelectorAll(selector))heading(labels,node,currentNames[key],key);
   for(const node of document.querySelectorAll('#adminApp .nav button,#settings button,.uc-v1634-preview-fixed>span,#checkoutSettings>.top h1')){
    if(node.closest('.db156-ui,.db157-ui')||node.querySelector('input,textarea'))continue;
    const original=texts.get(node)?.original||textNode(node)?.nodeValue||'';
    if(/\bCheckout\b/.test(original)&&currentNames.checkout!=='Checkout')heading(labels,node,original.replace(/\bCheckout\b/g,currentNames.checkout),'checkout');
   }
   if(currentNames.blog!==LAYOUT_NAMES.blog.label)for(const node of document.querySelectorAll('#blogs .collapsed-summary-title,#blogs button:not(.uc-info-btn),#blogs h2,#blogs h3')){
    if(node.closest('.db156-ui,.db157-ui'))continue;const original=texts.get(node)?.original||textNode(node)?.nodeValue||'';if(/Fitness Tips?/.test(original))heading(labels,node,original.replace(/Fitness Tips?/g,currentNames.blog),'blog');
   }
   for(const[key,definition]of Object.entries(LAYOUT_NAMES)){
    if(!definition.nav||!currentNames[key])continue;
    const nav=definition.nav,custom=currentNames[key]!==definition.label;
    if(custom)for(const node of document.querySelectorAll(`[data-nav-preview-key="${nav}"],[data-preview-key="${nav}"],[data-preview-toggle="${nav}"]>span:first-child,[data-nav-key="${nav}"]>div>strong`))heading(labels,node,currentNames[key],key);
    for(const input of document.querySelectorAll(`[data-nav-key="${nav}"] input`))if(input!==document.activeElement&&input.value!==currentNames[key])input.value=currentNames[key];
   }
   const fixed=document.querySelectorAll('.uc-v1634-preview-fixed>span');
   for(const[key,index]of [['checkout',0],['trial',1]])if(currentNames[key]!==LAYOUT_NAMES[key].label)heading(labels,fixed[index],currentNames[key],key);
  }
  for(const node of document.querySelectorAll('[data-db159-name]')) {
   const name=node.dataset.db159Name;
   if(currentNames[name])heading(labels,node,currentNames[name],name);
  }
  applyStyles(desired);applyText(labels);if(!admin&&!portal)agencyAttribution();
 }finally{if(model)window.DropBeatDynamicUI?.state('layout','ready');observe();}
}
function queue(){if(!queued){queued=true;queueMicrotask(render);}}
function observe(){observer?.observe(document.body,{childList:true,subtree:true,characterData:true});}
export function applyLayout(next){
 if(!next?.ok||!Array.isArray(next.blocks)||!Object.hasOwn(LAYOUT_THEMES,next.theme)||!next.layout||!next.names||Object.keys(LAYOUT_NAMES).some(key=>typeof next.names[key]!=='string'||!next.names[key].trim()))return false;
 if(model&&date(next.updatedAt)<date(model.updatedAt))return false;
 const changed=!model||model.contextRevision!==next.contextRevision;model=structuredClone(next);delete model.themes;delete model.themePresets;if(model.buttonDictionary)model.buttonDictionary.buttons=model.buttonDictionary.buttons.filter(row=>row.category==='front');
 if(!admin&&next.buttonDictionary)window.DropBeatButtons?.apply(next.buttonDictionary);
 queue();if(changed)window.dispatchEvent(new CustomEvent('dropbeat:layout-updated',{detail:structuredClone(model)}));return true;
}
export function refreshLayout({force=false}={}){
 if(refreshing)return refreshing;window.DropBeatDynamicUI?.state('layout',model?'ready':'loading');
 const load=()=>window.DropBeatDynamicUI.json('/api/public/layout',{cache:'no-cache',credentials:'same-origin',headers:{'X-DropBeat-Revalidate':'1'}});
 refreshing=(async()=>{try{const result=window.DropBeatDataCache?await window.DropBeatDataCache.query('public:/api/public/layout',load,{persist:true,staleTime:60000,maxAge:300000,force,onUpdate:applyLayout}):await load();if(!applyLayout(result))throw Error('Invalid layout configuration.');}catch(error){window.DropBeatDynamicUI?.state('layout','error',error.message||'Navigation could not be loaded.');}return model;})().finally(()=>refreshing=null);return refreshing;
}
window.DropBeatLayout=Object.freeze({apply:applyLayout,refresh:refreshLayout,snapshot:()=>model?structuredClone(model):null,render:queue,names});
function start(){observer=new MutationObserver(queue);observe();refreshLayout();phone.addEventListener('change',queue);window.addEventListener('dropbeat:buttons-updated',queue);window.addEventListener('dropbeat:site-theme',queue);addEventListener('pageshow',event=>{if(event.persisted)refreshLayout();});addEventListener('popstate',()=>refreshLayout());}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
