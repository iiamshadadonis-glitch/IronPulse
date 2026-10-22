/* One Pages owner across compatibility module URLs. Route activation is
   bounded and never re-enters Pages from an already active page. */
const ownerKey=Symbol.for('ironpulse.pages.workspace');
function createOwner(){
 const entries=new Map(),hidden=new Map();let selected='',queued=false,observer,activating=false;
 const buttons=()=>[...document.querySelectorAll('#pages>.tabs>button')];
 function observe(){const pages=document.querySelector('#pages');if(pages)observer?.observe(pages,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});}
 function sync(){
  queued=false;observer?.disconnect();
  try{
   if(!selected)return;const entry=entries.get(selected),pages=document.querySelector('#pages');if(!entry||!pages)return;
   for(const child of pages.children){if(child===entry.panel||child.matches('.top,.tabs'))continue;if(!hidden.has(child))hidden.set(child,child.hidden);if(!child.hidden)child.hidden=true;}
   for(const item of entries.values())if(item.panel.hidden!==(item!==entry))item.panel.hidden=item!==entry;
   for(const button of buttons()){const active=button.dataset.db157Workspace===selected;if(button.classList.contains('active')!==active)button.classList.toggle('active',active);if(!button.classList.contains('db137-more-nav')&&button.getAttribute('aria-selected')!==String(active))button.setAttribute('aria-selected',String(active));}
  }finally{observe();}
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 function leaveWorkspace(){const old=entries.get(selected);selected='';observer?.disconnect();try{for(const[node,value]of hidden)if(node.isConnected&&node.hidden!==value)node.hidden=value;hidden.clear();for(const entry of entries.values())if(!entry.panel.hidden)entry.panel.hidden=true;for(const button of buttons())if(button.dataset.db157Workspace){button.classList.remove('active');if(button.getAttribute('aria-selected')!=='false')button.setAttribute('aria-selected','false');}old?.onLeave?.();}finally{observe();}}
 function activateWorkspace(key){
  const entry=entries.get(key);if(!entry||activating)return;
  const unchanged=selected===key&&!entry.panel.hidden;activating=true;
  try{if(selected&&selected!==key)entries.get(selected)?.onLeave?.();selected=key;if(!document.querySelector('#pages')?.classList.contains('active'))window.tab?.('pages');sync();if(!unchanged)entry.onOpen?.();}finally{activating=false;}
 }
 function registerWorkspace(key,entry){
  entries.set(key,entry);
  for(const bar of [document.querySelector('#pages>.uc-v1634-pages-tabs'),document.querySelector('#successStories>.tabs')].filter(Boolean)){
   let button=bar.querySelector('[data-db157-workspace="'+key+'"]');if(!button){button=document.createElement('button');button.type='button';button.className='pill';button.dataset.db157Workspace=key;button.textContent=entry.label;if(entry.attribute)button.setAttribute(entry.attribute,'1');bar.append(button);}
  }
  if(!observer){observer=new MutationObserver(queue);observe();}if(selected)queue();
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-db157-workspace]');if(button){event.preventDefault();event.stopImmediatePropagation();activateWorkspace(button.dataset.db157Workspace);return;}
  const legacy=event.target.closest?.('#pages>.tabs>button,#successStories>.tabs>button');if(legacy&&!legacy.matches('.db137-more-nav')&&selected)leaveWorkspace();
 },true);
 return Object.freeze({activateWorkspace,registerWorkspace,leaveWorkspace,currentWorkspace:()=>selected});
}
const owner=window[ownerKey]||(window[ownerKey]=createOwner());
export const {activateWorkspace,registerWorkspace,leaveWorkspace,currentWorkspace}=owner;
