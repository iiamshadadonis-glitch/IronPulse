/* DropBeat V1.34 — mobile presentation helpers only.
   No API calls, payment changes, storage writes or account logic. */
(()=>{
  'use strict';
  const mq=window.matchMedia('(max-width:760px)');
  const productHosts=['#featuredProducts','#offersGrid','#festivalGrid','#yearlyGrid'];
  const observers=[];

  function offersHref(){
    const link=document.querySelector('a[data-uc-nav-key="offers"], [data-uc-nav-key="offers"] > a, .navlinks a[href="/offers"]');
    return link?.getAttribute('href')||'/offers';
  }

  function syncSalesLinks(){
    const href=offersHref();
    document.querySelectorAll('.dropbeat-strip-action').forEach(link=>{
      link.href=href;
      link.setAttribute('aria-label','View pricing and book a class');
    });
  }

  function wrapPlanFacts(root=document){
    if(!mq.matches)return;
    root.querySelectorAll?.('.product-card [data-db107-plan-facts]').forEach(facts=>{
      if(facts.closest('.db134-session-details'))return;
      const details=document.createElement('details');
      details.className='db134-session-details';
      const summary=document.createElement('summary');
      summary.textContent='Session Details';
      facts.parentNode.insertBefore(details,facts);
      details.append(summary,facts);
    });
  }

  function unwrapPlanFacts(){
    document.querySelectorAll('.db134-session-details').forEach(details=>{
      const facts=details.querySelector('[data-db107-plan-facts]');
      if(facts)details.parentNode.insertBefore(facts,details);
      details.remove();
    });
  }

  function closeDetailSheet(){
    const sheet=document.querySelector('[data-db134-detail-sheet]');
    if(sheet)sheet.classList.remove('open');
    document.body.classList.remove('db134-sheet-open');
  }

  function detailContent(host){
    return [...host.querySelectorAll('.db107-offer-class,.uc-offer-about,.uc-offer-know')]
      .map(node=>node.outerHTML).join('');
  }

  function enhanceOfferDetail(){
    const host=document.getElementById('offerDetail');
    if(!host||!mq.matches)return;
    const shell=host.querySelector('.uc-offer-detail-shell');
    const main=host.querySelector('.uc-offer-detail-main');
    const book=host.querySelector('#ucOfferBook');
    if(!shell||!main||!book)return;

    let view=host.querySelector('[data-db134-view-details]');
    if(!view){
      view=document.createElement('button');
      view.type='button';
      view.className='btn secondary db134-view-details';
      view.dataset.db134ViewDetails='';
      view.textContent='View Details';
      (main.querySelector('.uc-interest-row')||main.querySelector('.uc-offer-detail-media'))?.insertAdjacentElement('afterend',view);
      view.addEventListener('click',()=>{
        const sheet=document.querySelector('[data-db134-detail-sheet]');
        if(!sheet)return;
        sheet.querySelector('[data-db134-sheet-body]').innerHTML=detailContent(host)||'<p>More plan information will be available soon.</p>';
        sheet.classList.add('open');
        document.body.classList.add('db134-sheet-open');
        sheet.querySelector('[data-db134-sheet-close]')?.focus();
      });
    }

    let sheet=document.querySelector('[data-db134-detail-sheet]');
    if(!sheet){
      sheet=document.createElement('section');
      sheet.className='db134-detail-sheet';
      sheet.dataset.db134DetailSheet='';
      sheet.setAttribute('aria-label','Plan details');
      sheet.innerHTML='<button class="db134-sheet-backdrop" type="button" data-db134-sheet-close aria-label="Close plan details"></button><div class="db134-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="db134SheetTitle"><div class="db134-sheet-handle" aria-hidden="true"></div><header><h2 id="db134SheetTitle">Plan Details</h2><button type="button" data-db134-sheet-close aria-label="Close plan details">×</button></header><div class="db134-sheet-body" data-db134-sheet-body></div></div>';
      document.body.appendChild(sheet);
      sheet.querySelectorAll('[data-db134-sheet-close]').forEach(button=>button.addEventListener('click',closeDetailSheet));
    }

    let sticky=document.querySelector('[data-db134-sticky-purchase]');
    if(!sticky){
      sticky=document.createElement('div');
      sticky.className='db134-sticky-purchase';
      sticky.dataset.db134StickyPurchase='';
      sticky.innerHTML='<div data-db134-sticky-price></div><button class="btn" type="button" data-db134-sticky-book>Book Now</button>';
      document.body.appendChild(sticky);
      sticky.querySelector('[data-db134-sticky-book]').addEventListener('click',()=>host.querySelector('#ucOfferBook')?.click());
    }
    const price=host.querySelector('.uc-offer-detail-price');
    const priceBox=sticky.querySelector('[data-db134-sticky-price]');
    if(price&&priceBox)priceBox.innerHTML=price.outerHTML;
    const stickyBook=sticky.querySelector('[data-db134-sticky-book]');
    stickyBook.disabled=book.disabled;
    stickyBook.textContent=book.textContent.trim()||'Book Now';
  }

  function removeOfferHelpers(){
    closeDetailSheet();
    document.querySelector('[data-db134-detail-sheet]')?.remove();
    document.querySelector('[data-db134-sticky-purchase]')?.remove();
    document.querySelector('[data-db134-view-details]')?.remove();
  }

  function apply(){
    syncSalesLinks();
    if(mq.matches){
      productHosts.forEach(selector=>{const host=document.querySelector(selector);if(host)wrapPlanFacts(host);});
      enhanceOfferDetail();
    }else{
      unwrapPlanFacts();
      removeOfferHelpers();
    }
  }

  function observeDynamicHosts(){
    [...productHosts,'#offerDetail'].forEach(selector=>{
      const host=document.querySelector(selector);if(!host)return;
      const observer=new MutationObserver(()=>queueMicrotask(apply));
      observer.observe(host,{childList:true,subtree:true});
      observers.push(observer);
    });
  }

  function install(){
    if(document.getElementById('offerDetail'))document.body.classList.add('db134-offer-page');
    document.querySelector('.contact-form textarea')?.closest('.field')?.classList.add('db134-full-field');
    const originalNav=window.UCApplyV1637Navigation;
    if(typeof originalNav==='function'&&!originalNav.__db134Wrapped){
      const wrapped=function(){const value=originalNav.apply(this,arguments);syncSalesLinks();return value;};
      wrapped.__db134Wrapped=true;
      window.UCApplyV1637Navigation=wrapped;
    }
    document.addEventListener('uc-products-rendered',event=>wrapPlanFacts(document.querySelector(event.detail?.selector||'body')||document));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDetailSheet();});
    mq.addEventListener?.('change',apply);
    observeDynamicHosts();
    apply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
