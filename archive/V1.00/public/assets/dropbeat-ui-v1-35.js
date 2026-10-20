/* DropBeat V1.35 — event-scoped public presentation helpers only.
   No API calls, payment logic, account logic, storage writes or global observer. */
(()=>{
  'use strict';
  const phone=window.matchMedia('(max-width:760px)');

  function textForFact(root,label){
    const wanted=label.toLowerCase();
    for(const fact of root?.querySelectorAll?.('.db107-plan-fact')||[]){
      const heading=fact.querySelector('strong')?.textContent?.trim().toLowerCase();
      if(heading!==wanted)continue;
      return fact.querySelector('small')?.textContent?.trim()||'';
    }
    return '';
  }

  function enhanceOfferDetail(){
    const host=document.getElementById('offerDetail');
    if(!host||!phone.matches)return false;
    const facts=host.querySelector('.uc-offer-book-card>.db107-offer-class');
    const interest=host.querySelector('.uc-interest-row');
    if(!facts||!interest)return false;
    let glance=host.querySelector('[data-db135-class-glance]');
    if(!glance){
      const values=[['Batch Time',textForFact(facts,'Batch time')],['Duration',textForFact(facts,'Duration')],['Coach',textForFact(facts,'Coach')]].filter(([,value])=>value);
      if(values.length){
        glance=document.createElement('section');
        glance.className='db134-class-glance';
        glance.dataset.db135ClassGlance='';
        glance.setAttribute('aria-label','Class summary');
        for(const [label,value] of values){
          const article=document.createElement('article');
          const caption=document.createElement('small');
          const detail=document.createElement('strong');
          caption.textContent=label;
          detail.textContent=value;
          article.append(caption,detail);
          glance.append(article);
        }
        interest.insertAdjacentElement('afterend',glance);
      }
    }
    const view=host.querySelector('[data-db134-view-details]');
    if(view&&glance&&view.previousElementSibling!==glance)glance.insertAdjacentElement('afterend',view);
    return Boolean(glance);
  }

  function watchOfferDetail(){
    const host=document.getElementById('offerDetail');
    if(!host||enhanceOfferDetail())return;
    const observer=new MutationObserver(()=>{if(enhanceOfferDetail())observer.disconnect();});
    observer.observe(host,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),10000);
  }

  function removeDesktopGlance(){
    if(phone.matches)return;
    document.querySelectorAll('[data-db135-class-glance]').forEach(node=>node.remove());
  }

  function install(){
    watchOfferDetail();
    phone.addEventListener?.('change',()=>{removeDesktopGlance();if(phone.matches)watchOfferDetail();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
