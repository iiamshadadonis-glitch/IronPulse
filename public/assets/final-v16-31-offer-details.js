/* V16.35 — Offer Details: independent saved 16:9 detail crop, truthful availability text, recommended plans carousel. */
(()=>{
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0)/100);
  function isTrial(p){return Number(p?.trial_enabled||0)===1&&String(p?.payment_type||'subscription')==='subscription';}
  function priceParts(p){const reg=Number(p.regular_price_paise||0),offerEnabled=Number(p.offer_price_enabled??1)!==0,offer=offerEnabled?Number(p.offer_price_paise||reg):reg;return{reg,offerEnabled,offer,trial:isTrial(p),trialAmount:Number(p.trial_amount_paise||100)};}
  function priceHtml(p){
    const x=priceParts(p);
    if(x.trial){const offerStrike=x.offerEnabled&&x.offer!==x.reg?`<span class="trial-offer-old">${money(x.offer)}</span>`:'';return `<div class="uc-offer-detail-price trial-price"><span class="old regular-old">${money(x.reg)}</span>${offerStrike}<span class="trial">Try for ${money(x.trialAmount)}</span></div>`;}
    return x.offerEnabled&&x.offer!==x.reg?`<div class="uc-offer-detail-price"><span class="old">${money(x.reg)}</span><span class="new">${money(x.offer)}</span></div>`:`<div class="uc-offer-detail-price"><span class="regular">${money(x.reg)}</span></div>`;
  }
  function compactPriceHtml(p){
    const x=priceParts(p);
    if(x.trial){return `<div class="uc-reco-price"><div class="uc-reco-old-row"><s>${money(x.reg)}</s>${x.offerEnabled&&x.offer!==x.reg?`<s class="uc-reco-offer-old">${money(x.offer)}</s>`:''}</div><strong>Try for ${money(x.trialAmount)}</strong></div>`;}
    if(x.offerEnabled&&x.offer!==x.reg)return `<div class="uc-reco-price"><s>${money(x.reg)}</s><strong>${money(x.offer)}</strong></div>`;
    return `<div class="uc-reco-price"><strong>${money(x.reg)}</strong></div>`;
  }
  function variantFor(p){return String(p?.billing_period||'monthly')==='yearly'?(p?.variants||[]).find(v=>Number(v.billing_months)===12)||p?.variants?.[0]:p?.variants?.[0];}
  function detailImageState(img){
    const manual=String(img?.detail_crop_url||'').trim();
    if(manual)return {url:manual,manual:true};
    const raw=String(img?.source_url||img?.public_url||'/assets/product-generic.svg').trim()||'/assets/product-generic.svg';
    return {url:raw,manual:false};
  }
  function cardImageUrl(p){const imgs=p?.images||[],cover=imgs.find(x=>Number(x.is_cover||0)===1)||imgs[0];return String(cover?.website_crop_url||cover?.public_url||cover?.source_url||'/assets/product-generic.svg');}
  function popularityMap(products=[]){const max=Math.max(0,...products.map(x=>Math.max(0,Number(x.sold_count||0))));return {max};}
  function availabilityFor(p,products=[]){
    const limit=Math.max(0,Number(p.spot_limit||0)),sold=Math.max(0,Number(p.sold_count||0)),left=limit>0?Math.max(0,limit-sold):null,fillAt=Math.max(0,Number(p.filling_fast_limit||0)),lowAt=Math.max(0,Number(p.low_spot_limit||0)),soldTotal=Math.max(0,Number(p.sold_count||0)),maxSold=popularityMap(products).max,popular=maxSold>0&&soldTotal===maxSold;
    if(limit>0&&left<=0)return{label:'Currently full',className:'full',full:true,left,popular:false,rank:5};
    if(limit>0&&lowAt>0&&left<=lowAt)return{label:`Only ${left} spot${left===1?'':'s'} left`,className:'low',full:false,left,popular,rank:popular?0:1};
    if(limit>0&&fillAt>0&&left<=fillAt)return{label:'Filling fast',className:'hot',full:false,left,popular,rank:popular?0:2};
    if(popular)return{label:'Popular now',className:'popular',full:false,left,popular:true,rank:0};
    return{label:'Available',className:'available',full:false,left,popular:false,rank:3};
  }
  function recommendationSort(products,current){
    return products.filter(p=>String(p.id)!==String(current.id)&&String(p.status||'active')==='active').map(p=>({p,a:availabilityFor(p,products)})).sort((a,b)=>a.a.rank-b.a.rank||Number(b.p.sold_count||0)-Number(a.p.sold_count||0)||Number(a.p.sort_order||0)-Number(b.p.sort_order||0)||Number(a.p.id||0)-Number(b.p.id||0));
  }
  function recommendedCard(item,products){
    const p=item.p,a=item.a,href=`/offer-details?plan=${encodeURIComponent(String(p.slug||''))}`,img=cardImageUrl(p);
    return `<article class="uc-reco-card" data-reco-id="${Number(p.id||0)}"><a class="uc-reco-image" href="${href}" aria-label="View ${H(p.name)} details"><img src="${H(img)}" alt="${H((p.images||[])[0]?.alt_text||p.name)}" loading="lazy" decoding="async"></a><div class="uc-reco-body"><div class="uc-reco-availability ${H(a.className)}">${H(a.label)}</div><h3><a href="${href}">${H(p.name)}</a></h3>${compactPriceHtml(p)}<div class="uc-reco-actions"><button class="btn small uc-reco-book" type="button" data-reco-book="${Number(p.id||0)}" ${a.full?'disabled':''}>${a.full?'Currently Full':'Book Now'}</button><a class="btn secondary small" href="${href}">Details</a></div></div></article>`;
  }
  function recommendedHtml(products,current){const list=recommendationSort(products,current);if(!list.length)return'';return `<section class="uc-recommended"><div class="uc-recommended-head"><div><span class="uc-recommended-kicker">Explore more options</span><h2>Recommended Plans</h2></div><div class="uc-recommended-controls"><button type="button" class="btn secondary compact" data-reco-prev aria-label="Previous recommended plans">←</button><button type="button" class="btn secondary compact" data-reco-next aria-label="Next recommended plans">→</button></div></div><div class="uc-recommended-track">${list.map(x=>recommendedCard(x,products)).join('')}</div></section>`;}
  async function saveInterest(p,btn){
    if(btn?.disabled)return;btn.disabled=true;
    try{await api('/api/public/product-interest',{method:'POST',body:JSON.stringify({visitor_id:getVisitorId(),product_id:p.id,product_slug:p.slug,source_path:location.pathname+location.search})});btn.textContent='Interested ✓';btn.classList.add('is-active');localStorage.setItem(`uc_interest_${p.id}`,'1');}
    catch(e){btn.disabled=false;btn.textContent="I'm Interested";alert(e.message||'Could not save your interest.');}
  }
  function bindRecommendations(products){
    const track=document.querySelector('.uc-recommended-track');if(!track)return;
    document.querySelector('[data-reco-prev]')?.addEventListener('click',()=>track.scrollBy({left:-300,behavior:'smooth'}));
    document.querySelector('[data-reco-next]')?.addEventListener('click',()=>track.scrollBy({left:300,behavior:'smooth'}));
    track.querySelectorAll('[data-reco-book]').forEach(btn=>btn.addEventListener('click',()=>{const p=products.find(x=>String(x.id)===String(btn.dataset.recoBook));if(!p)return;const a=availabilityFor(p,products);if(!a.full)addToCart(p,variantFor(p));}));
  }
  async function load(){
    const box=document.querySelector('#offerDetail');if(!box)return;
    const slug=new URLSearchParams(location.search).get('plan')||'';box.innerHTML='<div class="notice">Loading plan details…</div>';
    try{
      const fresh=`v=${Date.now()}`;const [productData,siteData]=await Promise.all([api(`/api/public/products?${fresh}`),api(`/api/public/site?${fresh}`)]),products=productData.products||[],settings=siteData.settings||{};prepareCommon(settings);
      const p=products.find(x=>String(x.slug)===String(slug));if(!p){box.innerHTML='<div class="notice">This plan / offer could not be found. <a href="/offers">View current offers</a>.</div>';return;}
      const imgs=p.images||[],cover=imgs.find(x=>Number(x.is_cover||0)===1)||imgs[0],detailImage=detailImageState(cover),image=detailImage.url,features=(p.features||[]).filter(Boolean),desc=String(p.description||p.short_description||'').trim(),availability=availabilityFor(p,products);
      document.title=`${p.name} | ${settings?.siteName||'DropBeat Dance Studio'}`;
      box.innerHTML=`<div class="uc-offer-detail-title-row"><div><span class="eyebrow">Dance membership</span><h1>${H(p.name)}</h1></div></div><div class="uc-offer-detail-shell"><div class="uc-offer-detail-main"><div class="uc-offer-detail-media"><img src="${H(image)}" alt="${H(cover?.alt_text||p.name)}" width="1280" height="720" data-manual-detail-crop="${detailImage.manual?'1':'0'}"></div><div class="uc-interest-row"><button id="ucOfferInterest" class="btn secondary uc-interest-btn" type="button">I'm Interested</button></div><section class="uc-offer-about"><h2>About the Plan</h2><p>${H(desc||'Plan details will be updated soon.')}</p></section><section class="uc-offer-know"><h2>You Should Know</h2><div class="notice"><ul class="uc-offer-know-list"><li>Your membership gives access to the class, schedule and delivery mode shown for this plan.</li><li>Studio locations, online joining links and onboarding instructions are shared through the contact channels you provide.</li><li>Class times, coaches and holiday schedules may change; the latest official studio notice will apply.</li></ul></div></section></div><aside class="uc-offer-book-card"><h2>${H(p.name)}</h2>${features.length?`<ul class="uc-offer-detail-features">${features.map(x=>`<li>${H(x)}</li>`).join('')}</ul>`:''}${priceHtml(p)}<button id="ucOfferBook" class="btn" type="button" ${availability.full?'disabled':''}>${availability.full?'Currently Full':'Book Now'}</button><a class="btn secondary" href="/offers">View More Plans</a><div class="uc-offer-availability ${H(availability.className)}" aria-label="Plan availability">${H(availability.label)}</div></aside></div>${recommendedHtml(products,p)}`;
      // Offer Details has its own independent crop. Never substitute the Product Card crop here.
      // If a saved detail crop is unavailable, fall back only to the original source/public image.
      const heroImage=box.querySelector('.uc-offer-detail-media img'),heroFallback=String(cover?.source_url||cover?.public_url||'').trim();
      if(heroImage&&heroFallback&&heroFallback!==image)heroImage.addEventListener('error',()=>{if(heroImage.dataset.ucFallbackDone)return;heroImage.dataset.ucFallbackDone='1';heroImage.dataset.manualDetailCrop='0';heroImage.src=heroFallback;},{once:true});
      const ib=document.querySelector('#ucOfferInterest');if(localStorage.getItem(`uc_interest_${p.id}`)==='1'){ib.textContent='Interested ✓';ib.classList.add('is-active');ib.disabled=true;}ib?.addEventListener('click',()=>saveInterest(p,ib));
      document.querySelector('#ucOfferBook')?.addEventListener('click',()=>{if(!availability.full)addToCart(p,variantFor(p));});
      bindRecommendations(products);
    }catch(e){box.innerHTML=`<div class="notice">${H(e.message||'Could not load plan details.')}</div>`;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
