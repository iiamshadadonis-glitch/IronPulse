/* Shared compact control: retains Growth Analytics' native button handlers. */
const controls=new WeakSet();
export function upgradeSegments(root){
 if(controls.has(root))return root;controls.add(root);root.classList.add('db157-segmented');
 const sync=()=>{const items=[...root.children].filter(n=>n.tagName==='BUTTON');root.style.setProperty('--db157-segment-count',String(items.length));root.style.setProperty('--db157-segment-index',String(Math.max(0,items.findIndex(n=>n.classList.contains('active')||n.getAttribute('aria-selected')==='true'))));};
 new MutationObserver(sync).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected']});sync();return root;
}
export function segmentedControl(options,{label,value,onChange}={}){
 const root=document.createElement('div');root.className='db141-time-segments';root.setAttribute('role','tablist');root.setAttribute('aria-label',label||'Choose a view');
 const select=next=>{for(const button of root.children){const active=button.dataset.db157Segment===next;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}};
 for(const option of options){const button=document.createElement('button');button.type='button';button.role='tab';button.textContent=option.label;button.dataset.db157Segment=option.value;button.onclick=()=>{select(option.value);onChange?.(option.value);};root.append(button);}
 root.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const items=[...root.children],index=items.indexOf(document.activeElement);let next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;event.preventDefault();items[next].focus();items[next].click();};select(value||options[0]?.value);return upgradeSegments(root);
}
function hydrate(root=document){root.querySelectorAll?.('.db141-time-segments:not(.db157-segmented)').forEach(upgradeSegments);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>hydrate(),{once:true});else hydrate();
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches('.db141-time-segments'))upgradeSegments(node);hydrate(node);}}).observe(document.documentElement,{subtree:true,childList:true});
