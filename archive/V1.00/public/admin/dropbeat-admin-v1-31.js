/* DropBeat V1.31 — Brand Settings appearance ownership.
   Presentation only: keep the existing Website Colors/Theme controls in their
   dedicated Brand Settings tab without changing any save or theme logic. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  let queued=0;

  function activeBrandMode(){
    const panel=$('#settings');
    const active=$(':scope > .uc-v1652-brand-tabs .uc-v1652-brand-tab.active',panel);
    return active?.dataset.uc54BrandMode||active?.dataset.brandMode||'profile';
  }

  function appearanceOwner(){
    const form=$('#settings form');
    const appearance=$('#settings .uc129-appearance-shell')||$('#settings .uc-theme-builder');
    if(!form||!appearance)return null;
    const host=form.querySelector(':scope>.db138-form-content')||form;
    let owner=appearance;
    while(owner.parentElement&&owner.parentElement!==host)owner=owner.parentElement;
    return owner.parentElement===host?owner:null;
  }

  function syncAppearanceOwnership(){
    queued=0;
    const owner=appearanceOwner();
    if(!owner)return;
    const form=$('#settings form');
    form?.querySelectorAll('[data-db131-appearance-owner]').forEach(node=>{if(node!==owner){delete node.dataset.db131AppearanceOwner;node.classList.remove('uc-v1652-section-hidden');node.removeAttribute('aria-hidden');}});
    if(owner.dataset.db131AppearanceOwner!=='colors')owner.dataset.db131AppearanceOwner='colors';
    if(owner.dataset.ucV1652Section!=='colors')owner.dataset.ucV1652Section='colors';
    const visible=activeBrandMode()==='colors';
    owner.classList.toggle('uc-v1652-section-hidden',!visible);
    owner.setAttribute('aria-hidden',visible?'false':'true');
  }

  function queueSync(){
    if(queued)return;
    queued=requestAnimationFrame(syncAppearanceOwnership);
  }

  function init(){
    queueSync();
    const settings=$('#settings');
    if(!settings)return;
    new MutationObserver(queueSync).observe(settings,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected','data-uc-v1652-section']});
    settings.addEventListener('click',event=>{
      if(event.target.closest('.uc-v1652-brand-tab'))setTimeout(queueSync,0);
    });
    window.addEventListener('uc:brand-updated',queueSync);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
