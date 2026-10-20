/* V16.30 — additive plan availability controls + clickable admin plan names. */
(function(){
'use strict';
const qs=(s,r=document)=>r?.querySelector?.(s)||null;
function setThresholdFields(p={}){
  const f=qs('#productForm');if(!f)return;
  ['filling_fast_limit','low_spot_limit'].forEach(k=>{const el=f.elements?.[k];if(el)el.value=Number(p[k]||0);});
}
function patchHelp(){
  const help=qs('#ucPlanHelp');if(!help||help.querySelector('[data-v1630-availability-help]'))return;
  const ul=help.querySelector('ul');if(!ul)return;
  const li=document.createElement('li');li.dataset.v1630AvailabilityHelp='1';li.innerHTML='<strong>Availability controls:</strong> Spot Limit is the real total capacity. Show Filling Fast At is the remaining-spots threshold for the Filling Fast label. Show Only X Spots Left At is the lower threshold where the exact remaining count is shown. Example: Spot Limit 10, Filling Fast At 9, Only X Spots Left At 6 → after 1 paid booking the plan shows Filling Fast; when 6 remain it shows Only 6 spots left, then 5, 4 and so on. Leave a threshold at 0 to disable that stage.';
  ul.appendChild(li);
}
function patchPlanLinks(){
  const rows=[...document.querySelectorAll('#productTable tbody tr')];
  rows.forEach((row,i)=>{
    const p=(typeof A!=='undefined'&&Array.isArray(A.products))?A.products[i]:null;if(!p?.slug)return;
    const strong=row.querySelector('.uc-plan-name-line strong')||row.querySelector('td strong');if(!strong||strong.closest('a.uc-admin-plan-link'))return;
    const href=`/offer-details?plan=${encodeURIComponent(String(p.slug))}`;
    const a=document.createElement('a');a.className='uc-admin-plan-link';a.href=href;a.target='_blank';a.rel='noopener';a.title='Open public plan details in a new tab';
    strong.parentNode.insertBefore(a,strong);a.appendChild(strong);
    const cell=a.closest('td');if(cell&&!cell.dataset.ucPlanDetailLink){cell.dataset.ucPlanDetailLink=href;cell.classList.add('uc-admin-plan-cell-link');cell.title='Open public plan details in a new tab';cell.addEventListener('click',e=>{if(e.target.closest('a,button,input,select,textarea,label'))return;window.open(cell.dataset.ucPlanDetailLink,'_blank','noopener');});}
  });
}
const oldEdit=window.editProduct;
if(typeof oldEdit==='function')window.editProduct=function(p){const r=oldEdit(p);setThresholdFields(p);setTimeout(patchHelp,0);return r;};
const oldNew=window.newProduct;
if(typeof oldNew==='function')window.newProduct=function(){const r=oldNew();setThresholdFields({filling_fast_limit:0,low_spot_limit:0});setTimeout(patchHelp,0);return r;};
const oldRender=window.renderProducts;
if(typeof oldRender==='function')window.renderProducts=function(){const r=oldRender.apply(this,arguments);patchPlanLinks();return r;};
function init(){patchHelp();patchPlanLinks();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);
})();
