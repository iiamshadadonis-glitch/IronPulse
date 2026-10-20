/* Final master admin polish: collapsible checkout/FAQ forms, pagination, toggles, tracking notes, clickable logo, 404 editor support. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}

  function makeLogoClickable(){
    const sideBrand=$('.side .brand');
    if(sideBrand && sideBrand.tagName!=='A' && !sideBrand.dataset.homeLinked){
      const a=document.createElement('a');
      a.className=sideBrand.className+' admin-brand-home';
      a.href='/'; a.title='Go to website home page';
      a.innerHTML=sideBrand.innerHTML;
      sideBrand.replaceWith(a);
    }
    const loginLogo=$('.login-card > img');
    if(loginLogo && !loginLogo.closest('a')){
      const a=document.createElement('a'); a.href='/'; a.title='Go to website home page'; a.className='login-logo-home';
      loginLogo.parentNode.insertBefore(a,loginLogo); a.appendChild(loginLogo);
    }
  }

  function normalizeSetupNotes(){
    $$('#tracking .setup-note summary').forEach(s=>{s.textContent='Setup note';s.classList.add('setup-note-button');});
  }

  function patchRefundHeaders(){
    $$('#refundLogTable th').forEach(th=>{if(/Order\s*\/\s*Payment/i.test(th.textContent||'')) th.textContent='Order / Pay';});
  }

  function wrapCheckoutCards(){
    const panel=$('#checkoutSettings'); if(!panel||panel.dataset.finalCollapsed==='1')return;
    const form=$('#checkoutSettingsForm');
    if(form){
      const details=document.createElement('details'); details.className='card admin-collapsed-card final-checkout-behaviour';
      details.innerHTML='<summary>Checkout Behaviour</summary><div class="collapsed-body"></div>';
      form.parentNode.insertBefore(details,form);
      form.classList.remove('card');
      const h=form.querySelector('h2'); if(h)h.remove();
      details.querySelector('.collapsed-body').appendChild(form);
    }
    const couponForm=$('#couponForm');
    if(couponForm){
      const card=couponForm.closest('.card');
      if(card && !card.querySelector('.final-coupon-detail')){
        const title=[...card.children].find(x=>x.tagName==='H2'||x.tagName==='H3'); if(title)title.remove();
        const details=document.createElement('details'); details.className='admin-collapsed-card final-coupon-detail';
        details.innerHTML='<summary>Coupon Codes</summary><div class="collapsed-body"></div>';
        card.insertBefore(details,couponForm);
        details.querySelector('.collapsed-body').appendChild(couponForm);
        const msg=$('#couponMsg'); if(msg)details.querySelector('.collapsed-body').appendChild(msg);
      }
    }
    panel.dataset.finalCollapsed='1';
  }

  function wrapFaqForm(){
    const panel=$('#pages'); if(!panel||panel.dataset.finalFaqCollapsed==='1')return;
    const form=$('#faqForm'); if(!form)return;
    const card=form.closest('.card'); if(!card)return;
    const title=[...card.children].find(x=>x.tagName==='H2'||x.tagName==='H3'); if(title)title.remove();
    const details=document.createElement('details'); details.className='admin-collapsed-card final-faq-detail';
    details.innerHTML='<summary>Add / Edit FAQ</summary><div class="collapsed-body"></div>';
    card.insertBefore(details,form);
    details.querySelector('.collapsed-body').appendChild(form);
    const msg=$('#faqMsg'); if(msg)details.querySelector('.collapsed-body').appendChild(msg);
    panel.dataset.finalFaqCollapsed='1';
  }

  function patchFaviconInput(){
    const fav=$('#settings input[name="faviconFile"]');
    if(fav){fav.setAttribute('accept','image/webp,image/jpeg,image/png,image/gif,image/x-icon,image/vnd.microsoft.icon');}
    const hint=fav?.closest('.field')?.querySelector('.hint'); if(hint && !/GIF/i.test(hint.textContent||'')) hint.textContent='Optional browser tab icon. Recommended size: 512 × 512 px. Accepted formats: PNG, ICO, WebP, GIF. Maximum upload size: 300 KB.';
    const urlHint=$('#settings input[name="faviconUrl"]')?.closest('.field')?.querySelector('.hint'); if(urlHint && !/GIF/i.test(urlHint.textContent||'')) urlHint.textContent='Recommended size: 512 × 512 px or 32 × 32 px. Accepted formats: PNG, ICO, WebP, GIF. Maximum upload size: 300 KB.';
  }

  function applyPaymentToggleLabels(){
    $$('#payments label.check').forEach(l=>l.classList.add('final-payment-toggle'));
  }

  function maybePatch(){
    makeLogoClickable(); normalizeSetupNotes(); patchRefundHeaders(); patchFaviconInput(); applyPaymentToggleLabels();
    if($('#checkoutSettings')?.classList.contains('active')) wrapCheckoutCards();
    if($('#pages')?.classList.contains('active')) wrapFaqForm();
    paginateAll();
  }

  function paginateTable(table){
    if(!table || table.dataset.ucNoPaginate==='1')return;
    const body=table.tBodies&&table.tBodies[0]; if(!body)return;
    const rows=Array.from(body.rows); if(rows.length<=20){removePager(table);rows.forEach(r=>r.style.display='');return;}
    let state=table.__ucPager || {page:0,size:20}; table.__ucPager=state;
    let controls=table.nextElementSibling;
    if(!controls || !controls.classList.contains('uc-pagination')){
      controls=document.createElement('div'); controls.className='uc-pagination';
      controls.innerHTML='<label>Rows <select><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label><button type="button" class="btn secondary small" data-prev>Previous</button><span class="uc-page-info"></span><button type="button" class="btn secondary small" data-next>Next</button>';
      table.insertAdjacentElement('afterend',controls);
      controls.querySelector('select').addEventListener('change',e=>{state.size=Number(e.target.value)||20;state.page=0;apply();});
      controls.querySelector('[data-prev]').addEventListener('click',()=>{state.page=Math.max(0,state.page-1);apply();});
      controls.querySelector('[data-next]').addEventListener('click',()=>{state.page=Math.min(Math.ceil(rows.length/state.size)-1,state.page+1);apply();});
    }
    function apply(){
      state.size=Math.min(100,Math.max(20,Number(state.size)||20));
      const pages=Math.max(1,Math.ceil(rows.length/state.size)); state.page=Math.max(0,Math.min(state.page,pages-1));
      const start=state.page*state.size,end=start+state.size;
      rows.forEach((r,i)=>r.style.display=(i>=start&&i<end)?'':'none');
      const sel=controls.querySelector('select'); if(sel)sel.value=String(state.size);
      const info=controls.querySelector('.uc-page-info'); if(info)info.textContent=`Showing ${start+1}-${Math.min(end,rows.length)} of ${rows.length}`;
      const prev=controls.querySelector('[data-prev]'), next=controls.querySelector('[data-next]'); if(prev)prev.disabled=state.page<=0; if(next)next.disabled=state.page>=pages-1;
    }
    apply();
  }
  function removePager(el){const n=el?.nextElementSibling;if(n?.classList.contains('uc-pagination'))n.remove();}
  function paginateGrid(grid){
    if(!grid || grid.dataset.ucNoPaginate==='1')return;
    const rowDisplay=()=>grid.closest('#placements,#bannerTable,#couponTable')&&matchMedia('(max-width:760px)').matches?'grid':'contents';
    const rows=Array.from(grid.querySelectorAll(':scope > .uc-grid-row')).filter(r=>!r.classList.contains('empty-row'));
    if(rows.length<=20){removePager(grid);rows.forEach(r=>r.style.setProperty('display',rowDisplay(),'important'));return;}
    let state=grid.__ucPager || {page:0,size:20}; grid.__ucPager=state;
    let controls=grid.nextElementSibling;
    if(!controls || !controls.classList.contains('uc-pagination')){
      controls=document.createElement('div'); controls.className='uc-pagination';
      controls.innerHTML='<label>Rows <select><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label><button type="button" class="btn secondary small" data-prev>Previous</button><span class="uc-page-info"></span><button type="button" class="btn secondary small" data-next>Next</button>';
      grid.insertAdjacentElement('afterend',controls);
      controls.querySelector('select').addEventListener('change',e=>{state.size=Number(e.target.value)||20;state.page=0;apply();});
      controls.querySelector('[data-prev]').addEventListener('click',()=>{state.page=Math.max(0,state.page-1);apply();});
      controls.querySelector('[data-next]').addEventListener('click',()=>{state.page=Math.min(Math.ceil(rows.length/state.size)-1,state.page+1);apply();});
    }
    function apply(){
      state.size=Math.min(100,Math.max(20,Number(state.size)||20));
      const pages=Math.max(1,Math.ceil(rows.length/state.size)); state.page=Math.max(0,Math.min(state.page,pages-1));
      const start=state.page*state.size,end=start+state.size;
      rows.forEach((r,i)=>r.style.setProperty('display',(i>=start&&i<end)?rowDisplay():'none','important'));
      const sel=controls.querySelector('select'); if(sel)sel.value=String(state.size);
      const info=controls.querySelector('.uc-page-info'); if(info)info.textContent=`Showing ${start+1}-${Math.min(end,rows.length)} of ${rows.length}`;
      const prev=controls.querySelector('[data-prev]'), next=controls.querySelector('[data-next]'); if(prev)prev.disabled=state.page<=0; if(next)next.disabled=state.page>=pages-1;
    }
    apply();
  }
  function paginateAll(){
    $$('.table-wrap table.table, table.table').forEach(paginateTable);
    $$('.uc-grid').forEach(paginateGrid);
  }

  const oldTab=window.tab;
  window.tab=function(id){
    if(typeof oldTab==='function') oldTab(id);
    setTimeout(maybePatch,250); setTimeout(maybePatch,900); setTimeout(maybePatch,1800);
  };
  const oldLoadCheckout=window.load_checkoutSettings;
  if(typeof oldLoadCheckout==='function') window.load_checkoutSettings=async function(){const r=await oldLoadCheckout.apply(this,arguments);setTimeout(()=>{wrapCheckoutCards();paginateAll();},50);return r;};
  const oldLoadPages=window.load_pages;
  if(typeof oldLoadPages==='function') window.load_pages=async function(){const r=await oldLoadPages.apply(this,arguments);setTimeout(()=>{wrapFaqForm();paginateAll();},50);return r;};
  const oldLoadRefunds=window.load_refunds;
  if(typeof oldLoadRefunds==='function') window.load_refunds=async function(){const r=await oldLoadRefunds.apply(this,arguments);setTimeout(()=>{patchRefundHeaders();paginateAll();},50);return r;};
  const oldLoadPayments=window.load_payments;
  if(typeof oldLoadPayments==='function') window.load_payments=async function(){const r=await oldLoadPayments.apply(this,arguments);setTimeout(()=>{applyPaymentToggleLabels();paginateAll();},50);return r;};

  const oldEditCoupon=window.editCoupon;
  if(typeof oldEditCoupon==='function') window.editCoupon=function(){const r=oldEditCoupon.apply(this,arguments);setTimeout(()=>{const d=$('.final-coupon-detail');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}paginateAll();},40);return r;};
  const oldEditFaq=window.editFaq;
  if(typeof oldEditFaq==='function') window.editFaq=function(){const r=oldEditFaq.apply(this,arguments);setTimeout(()=>{const d=$('.final-faq-detail');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}paginateAll();},40);return r;};
  const oldSaveSettings=window.saveSettings;
  if(typeof oldSaveSettings==='function') window.saveSettings=async function(e){const r=await oldSaveSettings.apply(this,arguments);setTimeout(patchFaviconInput,50);return r;};

  ready(()=>{
    matchMedia('(max-width:760px)').addEventListener('change',paginateAll);
    maybePatch(); setTimeout(maybePatch,800); setTimeout(maybePatch,2200); setTimeout(maybePatch,5000);
    const obs=new MutationObserver(()=>{clearTimeout(window.__ucPaginateTimer);window.__ucPaginateTimer=setTimeout(maybePatch,120);});
    obs.observe(document.body,{childList:true,subtree:true});
  });
})();
