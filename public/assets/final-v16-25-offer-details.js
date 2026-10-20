(()=>{
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0)/100);
  function priceHtml(p){
    const reg=Number(p.regular_price_paise||0),offerEnabled=Number(p.offer_price_enabled??1)!==0,offer=offerEnabled?Number(p.offer_price_paise||reg):reg,trial=Number(p.trial_enabled||0)===1&&String(p.payment_type||'subscription')==='subscription';
    if(trial)return `<div class="uc-offer-detail-price trial-price"><span class="old regular-old">${money(reg)}</span>${offerEnabled&&offer!==reg?`<span class="trial-offer-old">${money(offer)}</span>`:''}<span class="trial">Try for ${money(Number(p.trial_amount_paise||100))}</span></div>`;
    return offerEnabled?`<div class="uc-offer-detail-price"><span class="old">${money(reg)}</span><span class="new">${money(offer)}</span></div>`:`<div class="uc-offer-detail-price"><span class="regular">${money(reg)}</span></div>`;
  }
  function variantFor(p){return String(p?.billing_period||'monthly')==='yearly'?(p?.variants||[]).find(v=>Number(v.billing_months)===12)||p?.variants?.[0]:p?.variants?.[0];}
  function wideImageUrl(img){
    const raw=String(img?.source_url||img?.public_url||'/assets/product-generic.svg');
    if(/res\.cloudinary\.com/i.test(raw)&&raw.includes('/image/upload/'))return raw.replace('/image/upload/','/image/upload/c_pad,w_1280,h_720,g_center,b_rgb:FFFAF4,q_auto:good,f_auto/');
    return raw;
  }
  function availabilityFor(p){
    if(window.ucProductAvailability)return window.ucProductAvailability(p);
    const limit=Math.max(0,Number(p.spot_limit||0)),sold=Math.max(0,Number(p.sold_count||0)),left=limit>0?Math.max(0,limit-sold):null;
    if(limit>0&&left<=0)return{label:'Currently full',className:'full',full:true};
    if(limit>0&&left<=5)return{label:`Only ${left} spot${left===1?'':'s'} left`,className:'low',full:false};
    return{label:Number(p.trial_enabled||0)?'Trial offer available':'Available',className:Number(p.trial_enabled||0)?'trial':'available',full:false};
  }
  async function saveInterest(p,btn){
    if(btn?.disabled)return;btn.disabled=true;
    try{await api('/api/public/product-interest',{method:'POST',body:JSON.stringify({visitor_id:getVisitorId(),product_id:p.id,product_slug:p.slug,source_path:location.pathname+location.search})});btn.textContent='Interested ✓';btn.classList.add('is-active');localStorage.setItem(`uc_interest_${p.id}`,'1');}
    catch(e){btn.disabled=false;btn.textContent="I'm Interested";alert(e.message||'Could not save your interest.');}
  }
  async function load(){
    const box=document.querySelector('#offerDetail');if(!box)return;
    const slug=new URLSearchParams(location.search).get('plan')||'';
    box.innerHTML='<div class="notice">Loading plan details…</div>';
    try{
      const [productData,siteData]=await Promise.all([api('/api/public/products'),api('/api/public/site')]),products=productData.products||[],data={products,settings:siteData.settings||{}};prepareCommon(data.settings);
      const p=products.find(x=>String(x.slug)===String(slug));if(!p){box.innerHTML='<div class="notice">This plan / offer could not be found. <a href="/offers">View current offers</a>.</div>';return;}
      const imgs=p.images||[],cover=imgs.find(x=>Number(x.is_cover||0)===1)||imgs[0],image=wideImageUrl(cover),features=(p.features||[]).filter(Boolean),desc=String(p.description||p.short_description||'').trim(),availability=availabilityFor(p);
      document.title=`${p.name} | ${data.settings?.siteName||'DropBeat Dance Studio'}`;
      box.innerHTML=`<div class="uc-offer-detail-title-row"><div><span class="eyebrow">Membership plan</span><h1>${H(p.name)}</h1></div></div><div class="uc-offer-detail-shell"><div class="uc-offer-detail-main"><div class="uc-offer-detail-media"><img src="${H(image)}" alt="${H(cover?.alt_text||p.name)}"></div><div class="uc-interest-row"><button id="ucOfferInterest" class="btn secondary uc-interest-btn" type="button">I'm Interested</button></div><section class="uc-offer-about"><h2>About the Plan</h2><p>${H(desc||'Plan details will be updated soon.')}</p></section><section class="uc-offer-know"><h2>You Should Know</h2><div class="notice">Membership provides access to the class schedule and services shown in this plan. Session changes and cancellations follow the studio policies.</div></section></div><aside class="uc-offer-book-card"><h2>${H(p.name)}</h2>${features.length?`<ul class="uc-offer-detail-features">${features.map(x=>`<li>${H(x)}</li>`).join('')}</ul>`:''}${priceHtml(p)}<button id="ucOfferBook" class="btn" type="button" ${availability.full?'disabled':''}>${availability.full?'Currently Full':'Book Now'}</button><a class="btn secondary" href="/offers">View More Plans</a><div class="uc-offer-availability ${H(availability.className)}">${H(availability.label)}</div></aside></div>`;
      const ib=document.querySelector('#ucOfferInterest');if(localStorage.getItem(`uc_interest_${p.id}`)==='1'){ib.textContent='Interested ✓';ib.classList.add('is-active');ib.disabled=true;}ib?.addEventListener('click',()=>saveInterest(p,ib));
      document.querySelector('#ucOfferBook')?.addEventListener('click',()=>{if(!availability.full)addToCart(p,variantFor(p));});
    }catch(e){box.innerHTML=`<div class="notice">${H(e.message||'Could not load plan details.')}</div>`;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
