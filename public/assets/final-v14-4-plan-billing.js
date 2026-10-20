(function(){
'use strict';
const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
const fmt=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
function priceHtml(p){
  const reg=Number(p.regular_price_paise||0),offerEnabled=Number(p.offer_price_enabled??1)!==0,offer=offerEnabled?Number(p.offer_price_paise||reg):reg;
  if(Number(p.trial_enabled||0)&&String(p.payment_type||'subscription')==='subscription'){
    return `<div class="price uc-trial-pricing"><span class="old">${fmt.format(reg/100)}</span>${offerEnabled?`<span class="trial-old-offer">${fmt.format(offer/100)}</span>`:''}<span class="trial-now">Try for ${fmt.format(Number(p.trial_amount_paise||100)/100)}</span></div>`;
  }
  if(!offerEnabled)return `<div class="price"><span class="regular-only">${fmt.format(reg/100)}</span></div>`;
  return `<div class="price"><span class="old">${fmt.format(reg/100)}</span><span class="new">${fmt.format(offer/100)}</span></div>`;
}
function priceSig(p){return [p.regular_price_paise,p.offer_price_paise,p.offer_price_enabled,p.trial_enabled,p.trial_amount_paise,p.trial_value,p.trial_unit,p.payment_type].join('|');}
function patchCards(){
  document.querySelectorAll('[data-product-card]').forEach(card=>{
    const id=Number(card.dataset.productCard),p=(window.state?.products||window.__ucProducts||[]).find?.(x=>Number(x.id)===id);if(!p)return;
    const sig=priceSig(p);if(card.dataset.ucPriceSig===sig)return;
    const price=card.querySelector('.price');if(price){const wrap=document.createElement('div');wrap.innerHTML=priceHtml(p);price.replaceWith(...wrap.childNodes);card.dataset.ucPriceSig=sig;}
  });
}
function ensureYearlyNav(){
  document.querySelectorAll('nav,.nav-links,.main-nav').forEach(nav=>{
    if(nav.dataset.ucV1637==='1')return; // Keep saved labels, children and routes intact.
    // Remove the V14.5 standalone Yearly Plans top-level item. Yearly Plans now
    // belongs inside the existing Offers dropdown on every public page.
    nav.querySelectorAll(':scope > a[href="/yearly-plans"],:scope > a[href="/yearly-plans.html"]').forEach(a=>a.remove());
    const menu=nav.querySelector('.nav-dropdown-menu');
    if(menu){
      if(!menu.querySelector('a[href="/yearly-plans"],a[href="/yearly-plans.html"]'))menu.insertAdjacentHTML('beforeend','<a href="/yearly-plans">Yearly Plans</a>');
      return;
    }
    const offers=[...nav.querySelectorAll(':scope > a')].find(a=>/^(Offers|Membership Offers)$/i.test((a.textContent||'').trim()));
    if(offers){
      const wrap=document.createElement('span');wrap.className='nav-dropdown';offers.parentNode.insertBefore(wrap,offers);wrap.appendChild(offers);offers.textContent='Offers';
      const dd=document.createElement('span');dd.className='nav-dropdown-menu';dd.innerHTML='<a href="/offers">Memberships</a><a href="/festival-offers">Festival Offers</a><a href="/yearly-plans">Yearly Plans</a>';wrap.appendChild(dd);
    }
  });
}
async function loadYearly(){
  const box=document.querySelector('#yearlyGrid');if(!box)return;box.classList.add('uc-data-loading');
  const empty='<div class="notice yearly-empty"><strong>No yearly plans are running right now.</strong><br>We apologize, currently we do not have any yearly offers running. To get a membership or customized offer, please fill the <a href="/contact"><strong>Contact Us form</strong></a>; a team member from IronPulse Gym will contact you to discuss a suitable plan or upcoming offer.</div>';
  try{
    const d=typeof window.api==='function'?await window.api('/api/public/bootstrap?page=yearly'):await fetch('/api/public/bootstrap?page=yearly').then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Failed');return data;});
    const products=d.products||[];window.__ucProducts=products;if(window.UC?.loadCommon)window.UC.loadCommon();
    if(products.length&&window.renderProducts){window.renderProducts(products,'#yearlyGrid');setTimeout(patchCards,0);}
    else if(products.length){box.innerHTML=products.map(p=>`<article class="card product-card" data-product-card="${p.id}"><h3>${H(p.name)}</h3><p>${H(p.short_description||'')}</p>${priceHtml(p)}<div class="product-actions"><a class="btn" href="/offers#${H(p.slug)}">View Plan</a></div></article>`).join('');}
    else box.innerHTML=empty;
  }catch(_){box.innerHTML=empty;}finally{box.classList.remove('uc-data-loading');}
}
function patchAddToCart(){
  if(!window.state?.products)return;
  window.state.products.forEach(p=>{if(String(p.billing_period||'monthly')==='yearly'&&Array.isArray(p.variants)){const y=p.variants.find(v=>Number(v.billing_months)===12);if(y)p.default_variant_id=y.id;}});
}
if(window.UC)window.UC.loadYearly=loadYearly;
let queued=false;
const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchCards();ensureYearlyNav();});});
function init(){mo.observe(document.body,{subtree:true,childList:true});patchAddToCart();ensureYearlyNav();patchCards();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
