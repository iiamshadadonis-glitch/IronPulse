(function(){
  const cx = { settings:{paymentMode:'subscription', subscriptionYears:21, yearlyEnabled:false, productCouponsEnabled:true, overallCouponsEnabled:false, yearlyOfferMonths:10}, overallCoupon:'', overallDiscount:0 };
  const fmt = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:Number(v||0)%100?2:0,maximumFractionDigits:2}).format(Number(v||0)/100);
  const money = v => Number(v||0);
  function itemBillingMonths(item){const value=Math.floor(Number(item.billing_months||1));return Number.isFinite(value)&&value>0?value:1;}
  function hasConfiguredInterval(item){return Number(item.billing_interval_explicit||0)===1||(item.billing_interval!==null&&item.billing_interval!==undefined&&String(item.billing_interval).trim()!=='');}
  function itemBillingScope(item){return hasConfiguredInterval(item)?(String(item.billing_period||'monthly')==='yearly'?'yearly':'monthly'):(itemBillingMonths(item)===12?'yearly':'monthly');}
  function lineUnit(item){return hasConfiguredInterval(item)?money(item.offer_price_paise):(itemBillingMonths(item)===12?money(item.offer_price_paise)*Number(cx.settings.yearlyOfferMonths||10):money(item.offer_price_paise));}
  function lineOriginalUnit(item){
    if(hasConfiguredInterval(item)){const regular=money(item.regular_price_paise),active=lineUnit(item);return regular>0?regular:active;}
    if(itemBillingMonths(item)===12) return money(item.offer_price_paise) * 12; // preserve the established yearly calculation
    const regular=money(item.regular_price_paise),active=lineUnit(item);
    return regular>0?regular:active;
  }
  function itemQty(item){ return Math.max(1, Number(item.quantity || 1)); }
  function itemSubtotal(item){ return lineUnit(item) * itemQty(item); }
  function itemOriginalSubtotal(item){ return lineOriginalUnit(item) * itemQty(item); }
  function itemDiscount(item){ return Math.min(itemSubtotal(item), Math.max(0, Number(item.coupon_discount_paise||0))); }
  function actualTotal(){ return state.cart.reduce((s,i)=>s+itemOriginalSubtotal(i),0); }
  function discountedItemTotal(){ return state.cart.reduce((s,i)=>s+itemSubtotal(i),0); }
  function planOfferDiscount(){ return state.cart.reduce((s,i)=>s+Math.max(0,itemOriginalSubtotal(i)-itemSubtotal(i)),0); }
  function itemCouponDiscount(){ return state.cart.reduce((s,i)=>s+itemDiscount(i),0); }
  function payableSubtotal(){ return Math.max(0, discountedItemTotal()-itemCouponDiscount()); }
  function isTrialItem(item){return String(item.payment_type||'subscription')==='subscription'&&Number(item.trial_enabled||0)===1&&Number(item.trial_amount_paise||0)>0;}
  function trialToday(item){return isTrialItem(item)?Math.max(100,Number(item.trial_amount_paise||100)):0;}
  function taxableTodayTotal(){
    const normal=state.cart.reduce((sum,i)=>sum+(isTrialItem(i)?0:Math.max(0,itemSubtotal(i)-itemDiscount(i))),0);
    return Math.max(0,normal-Number(cx.overallDiscount||0));
  }
  function trialTodayTotal(){return state.cart.reduce((sum,i)=>sum+trialToday(i),0);}
  function chargeTodayTotal(){return taxBreakdown(taxableTodayTotal()).total+trialTodayTotal();}
  function taxConfig(){return cx.settings?.taxes||state.settings?.taxes||window.__ucLatestSettings?.taxes||{};}
  function taxBreakdown(base){const t=taxConfig(),n=Math.max(0,Math.round(Number(base||0)));if(t.enabled!==true||n<=0)return {base:n,gst:0,service:0,other:0,total:n};const gst=t.gstEnabled?Math.round(n*Math.max(0,Number(t.gstPercent||0))/100):0;let service=0;if(t.serviceChargeEnabled){const fixed=Math.max(0,Number(t.serviceChargeFixedPaise||0)),pct=Math.max(0,Number(t.serviceChargePercent||0));if(fixed>0)service=Math.round(fixed);else if(pct>0)service=Math.round((t.gstEnabled&&gst>0?gst:n)*pct/100);}const other=t.otherTaxEnabled?Math.round(n*Math.max(0,Number(t.otherTaxPercent||0))/100):0;return {base:n,gst,service,other,total:n+gst+service+other};}
  function taxRowsHtml(base){const t=taxConfig(),x=taxBreakdown(base);if(t.enabled!==true)return '';return `${x.gst?`<div class="summary-row uc-tax-row"><span>GST (${Number(t.gstPercent||0)}%)</span><strong>${fmt(x.gst)}</strong></div>`:''}${x.service?`<div class="summary-row uc-tax-row"><span>Service charge</span><strong>${fmt(x.service)}</strong></div>`:''}${x.other?`<div class="summary-row uc-tax-row"><span>${escapeHtml(t.otherTaxLabel||'Other Tax')} (${Number(t.otherTaxPercent||0)}%)</span><strong>${fmt(x.other)}</strong></div>`:''}`;}
  function overallBilling(){const y=state.cart.filter(i=>itemBillingScope(i)==='yearly').length;if(!state.cart.length||y===state.cart.length)return 'yearly';if(y===0)return 'monthly';return 'both';}
  function clearCartCoupon(){ cx.overallCoupon=''; cx.overallDiscount=0; }
  async function loadCheckoutSettings(){
    try { const res = await api('/api/public/checkout-settings'); cx.settings = {...cx.settings, ...(res.settings||{})}; }
    catch(e){ console.warn('Checkout settings unavailable:', e.message); }
  }
  async function refreshCartPlanData(){
    try{
      if(!state.cart.length)return;
      const res=await api('/api/public/products');const products=Array.isArray(res.products)?res.products:[];
      let changed=false;
      state.cart.forEach(item=>{
        const p=products.find(x=>String(x.id)===String(item.product_id));if(!p)return;
        const explicit=p.billing_interval!==null&&p.billing_interval!==undefined&&String(p.billing_interval).trim()!=='',period=String(p.billing_period||'monthly')==='yearly'?'yearly':'monthly',interval=Math.max(1,Math.floor(Number(p.billing_interval||1))||1),months=explicit?(period==='yearly'?interval*12:interval):itemBillingMonths(item);
        const v=explicit?null:((p.variants||[]).find(x=>String(x.id)===String(item.variant_id))||(p.variants||[]).find(x=>Number(x.billing_months)===months));
        const offerEnabled=Number(p.offer_price_enabled??1)!==0;
        const active=offerEnabled?Number(explicit?(p.offer_price_paise||p.regular_price_paise||0):(v?.offer_price_paise||p.offer_price_paise||p.regular_price_paise||0)):Number(explicit?(p.regular_price_paise||0):(v?.regular_price_paise||p.regular_price_paise||0));
        Object.assign(item,{name:p.name||item.name,variant_id:explicit?null:v?.id||item.variant_id,regular_price_paise:Number(explicit?p.regular_price_paise:(v?.regular_price_paise||p.regular_price_paise||0)),catalog_offer_price_paise:Number(explicit?p.offer_price_paise:(v?.offer_price_paise||p.offer_price_paise||0)),offer_price_enabled:offerEnabled?1:0,offer_price_paise:active,payment_type:p.payment_type||item.payment_type||'subscription',trial_enabled:Number(p.trial_enabled||0),trial_amount_paise:Number(p.trial_amount_paise||0),trial_value:Number(p.trial_value||0),trial_unit:p.trial_unit||'',billing_months:Number(explicit?months:(v?.billing_months||item.billing_months||1)),billing_period:period,billing_interval:explicit?interval:null,billing_interval_explicit:explicit?1:0});changed=true;
      });
      if(changed)localStorage.setItem('uc_cart',JSON.stringify(state.cart));
    }catch(e){console.warn('Could not refresh current plan pricing for checkout:',e.message);}
  }
  function billingText(item){
    const qty = itemQty(item);
    const months=itemBillingMonths(item),scope=itemBillingScope(item),interval=hasConfiguredInterval(item)?Math.max(1,Number(item.billing_interval||1)):(scope==='yearly'?Math.max(1,months/12):months);
    const label=scope==='yearly'?(interval===1?'Yearly':`Every ${interval} years`):(interval===1?'Monthly':`Every ${interval} months`);
    return `${label} plan × ${qty} ${qty===1?'member':'members'}`;
  }
  function billingControl(item,idx){
    if(hasConfiguredInterval(item)||!cx.settings.yearlyEnabled) return '';
    return `<label class="mini-label">Billing option</label><select class="mini-select" onchange="changeBilling(${idx},this.value)"><option value="1" ${itemBillingMonths(item)===1?'selected':''}>Monthly</option><option value="12" ${itemBillingMonths(item)===12?'selected':''}>Yearly - 2 months free</option></select>`;
  }
  function couponBlock(item,idx){
    if(!cx.settings.productCouponsEnabled) return '';
    return `<div class="coupon-inline"><input id="itemCoupon_${idx}" value="${escapeHtml(item.coupon_code||'')}" placeholder="Coupon code"><button type="button" class="btn tiny secondary" onclick="applyItemCoupon(${idx})">Apply</button></div>${item.coupon_message?`<small class="coupon-msg">${escapeHtml(item.coupon_message)}</small>`:''}`;
  }
  function ensureSummaryRows(){
    const total=document.querySelector('#checkoutGrandTotal');
    const subtotal=document.querySelector('#checkoutSubtotal');
    const label=subtotal?.closest('.summary-row')?.querySelector('span');
    if(label) label.textContent='Actual price';
    if(!document.querySelector('#checkoutDiscountRows')){
      const anchor = total?.closest('.summary-row');
      const wrap=document.createElement('div'); wrap.id='checkoutDiscountRows';
      if(anchor) anchor.parentNode.insertBefore(wrap, anchor);
    }
  }
  function basketPriceHtml(item){
    if(isTrialItem(item))return `<small><s>${fmt(itemOriginalSubtotal(item))}</s></small>${itemSubtotal(item)!==itemOriginalSubtotal(item)?`<small><s>${fmt(itemSubtotal(item))}</s></small>`:''}<strong class="uc-checkout-trial-price">Try for ${fmt(trialToday(item))}</strong>`;
    const original=itemOriginalSubtotal(item),offer=itemSubtotal(item),coupon=itemDiscount(item),payable=Math.max(0,offer-coupon);
    if(coupon>0)return `${original!==offer?`<small><s>${fmt(original)}</s></small>`:''}<small><s>${fmt(offer)}</s></small><strong>${fmt(payable)}</strong><small class="save-text">Coupon saved ${fmt(coupon)}</small>`;
    return `<strong>${fmt(offer)}</strong>${original!==offer?`<small><s>${fmt(original)}</s></small>`:''}`;
  }
  function renderCheckoutPage2(){
    const box=document.querySelector('#checkoutPageItems');
    if(!box) return;
    box.innerHTML = state.cart.length ? state.cart.map((i,idx)=>`
      <div class="basket-item coupon-basket-item">
        <div class="basket-img"><img src="/assets/ironpulse-logo.svg" alt=""></div>
        <div class="basket-main">
          <h3>${escapeHtml(i.name)}</h3>
          <p><strong>${escapeHtml(billingText(i))}</strong></p>
          ${billingControl(i,idx)}
          <div class="qty-controls"><button type="button" aria-label="Reduce member count" onclick="changeQty(${idx},-1)">−</button><span>${itemQty(i)}</span><button type="button" aria-label="Increase member count" onclick="changeQty(${idx},1)">+</button><button type="button" class="remove-link" onclick="removeCart(${idx});clearOverallCouponAndRender()">Remove</button></div>
          ${couponBlock(i,idx)}
        </div>
        <div class="basket-price">${basketPriceHtml(i)}</div>
      </div>`).join('') : '<div class="notice">Your cart is empty. Add a membership plan first.</div>';
    ensureSummaryRows();
    const subtotal=document.querySelector('#checkoutSubtotal');
    const total=document.querySelector('#checkoutGrandTotal');
    if(subtotal) subtotal.textContent=fmt(actualTotal());
    const rows=document.querySelector('#checkoutDiscountRows');
    if(rows){
      const built=planOfferDiscount(), productCoupon=itemCouponDiscount(), overall=Number(cx.overallDiscount||0),hasTrial=state.cart.some(isTrialItem);
      const subtotalAfterPlanDiscounts = payableSubtotal();
      const allTrial=state.cart.length>0&&state.cart.every(isTrialItem);
      rows.innerHTML = `${built?`<div class="summary-row"><span>Plan / offer discount</span><strong>-${fmt(built)}</strong></div>`:''}${productCoupon?`<div class="summary-row"><span>Product coupon discount</span><strong>-${fmt(productCoupon)}</strong></div>`:''}${(built||productCoupon||overall||hasTrial)?`<div class="summary-row ${allTrial?'uc-trial-summary-strike':''}"><span>${hasTrial?'Regular subscription total':'Subtotal'}</span><strong>${fmt(subtotalAfterPlanDiscounts)}</strong></div>`:''}${cx.settings.overallCouponsEnabled?`<div class="overall-coupon"><label>Apply overall coupon</label><div class="coupon-inline"><input id="overallCouponInput" value="${escapeHtml(cx.overallCoupon||'')}" placeholder="Coupon code"><button type="button" class="btn tiny secondary" onclick="applyOverallCoupon()">Apply</button></div><small id="overallCouponMsg"></small></div>`:''}${overall?`<div class="summary-row"><span>Overall coupon discount</span><strong>-${fmt(overall)}</strong></div>`:''}${taxRowsHtml(taxableTodayTotal())}`;
      const actualRow=subtotal?.closest('.summary-row');actualRow?.classList.toggle('uc-trial-summary-strike',allTrial);
      const totalRow=total?.closest('.summary-row');totalRow?.classList.toggle('uc-checkout-total-today',hasTrial);
      const totalLabel=totalRow?.querySelector('span');if(totalLabel)totalLabel.textContent=hasTrial?'Total charged today':'Total';
    }
    if(!state.cart.some(isTrialItem)){subtotal?.closest('.summary-row')?.classList.remove('uc-trial-summary-strike');total?.closest('.summary-row')?.classList.remove('uc-checkout-total-today');}
    if(total) total.textContent=fmt(chargeTodayTotal());
  }
  window.changeBilling = function(idx,value){const item=state.cart[idx];if(!item||hasConfiguredInterval(item))return;item.billing_months=Number(value)===12?12:1;item.coupon_code='';item.coupon_discount_paise=0;item.coupon_recurring_scope='';item.coupon_message='';clearCartCoupon();saveCart();renderCheckoutPage2();};
  window.changeQty = function(idx,delta){ const item=state.cart[idx]; if(!item)return; item.quantity=Math.max(1,itemQty(item)+delta); item.coupon_code=''; item.coupon_discount_paise=0; item.coupon_recurring_scope=''; item.coupon_message=''; clearCartCoupon(); saveCart(); renderCheckoutPage2(); };
  window.clearOverallCouponAndRender = function(){ clearCartCoupon(); saveCart(); renderCheckoutPage2(); };
  window.applyItemCoupon = async function(idx){
    const item=state.cart[idx]; if(!item)return;
    const code=(document.getElementById('itemCoupon_'+idx)?.value||'').trim().toUpperCase();
    item.coupon_code=''; item.coupon_discount_paise=0; item.coupon_recurring_scope=''; item.coupon_message='';
    if(!code){ saveCart(); renderCheckoutPage2(); return; }
    try{
      const res=await api('/api/public/coupon',{method:'POST',body:JSON.stringify({code,product_id:item.product_id,billing_months:itemBillingMonths(item),quantity:itemQty(item),item,applies_to:'item'})});
      item.coupon_code=res.coupon; item.coupon_discount_paise=res.discount_paise||0; item.coupon_recurring_scope=res.recurring_scope||'first'; item.coupon_message=res.message||'Coupon applied.'; clearCartCoupon();
    }catch(e){ item.coupon_message=e.message; }
    saveCart(); renderCheckoutPage2();
  };
  window.applyOverallCoupon = async function(){
    const msg=document.getElementById('overallCouponMsg');
    const code=(document.getElementById('overallCouponInput')?.value||'').trim().toUpperCase();
    cx.overallCoupon=''; cx.overallDiscount=0;
    if(!code){ renderCheckoutPage2(); return; }
    try{
      const res=await api('/api/public/coupon',{method:'POST',body:JSON.stringify({code,amount_paise:payableSubtotal(),quantity:state.cart.reduce((s,i)=>s+itemQty(i),0),billing_scope:overallBilling(),applies_to:'cart'})});
      cx.overallCoupon=res.coupon; cx.overallDiscount=res.discount_paise||0; if(msg) msg.textContent=res.message||'Coupon applied.';
    }catch(e){ if(msg) msg.textContent=e.message; }
    renderCheckoutPage2();
  };
  async function checkout2(){
    const form=document.querySelector('#checkoutForm'); if(!form)return;
    const fd=new FormData(form);
    const payload={
      customer:{name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),city:fd.get('city'),preferred_role:fd.get('preferred_role'),consent_whatsapp:true,consent_email:!!fd.get('email')},
      items:state.cart.map(i=>({...i,billing_months:itemBillingMonths(i),quantity:itemQty(i)})),
      coupon_code:cx.settings.overallCouponsEnabled ? (cx.overallCoupon||'') : '', visitor_id:getVisitorId()
    };
    const btn=form.querySelector('button[type="submit"]'); const old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Creating secure payment...';}
    try{
      const res=await api('/api/orders/create',{method:'POST',body:JSON.stringify(payload)});
      if(res.redirect_url){ state.cart=[]; saveCart(); location.href=res.redirect_url; return; }
      document.querySelector('#checkoutResult').innerHTML=`<div class="notice"><strong>Order created:</strong> ${escapeHtml(res.order_id||'')}<br><small>${escapeHtml(res.message||'Payment link will be generated after gateway setup.')}</small></div>`;
    }catch(e){
      const raw=String(e?.message||'').trim();
      const helpful=/name is required|whatsapp number is required|valid email|cart is empty|must be checked out separately|no valid membership plan/i.test(raw)
        ? raw
        : 'Payment could not be started right now. Please refresh this page and try once more. If it still does not work, use Contact or Requests to send your name and WhatsApp number to the admin so they can help you complete the payment.';
      document.querySelector('#checkoutResult').innerHTML=`<div class="notice error"><strong>Unable to continue to payment.</strong><br>${escapeHtml(helpful)}</div>`;
    }
    finally{ if(btn){btn.disabled=false;btn.textContent=old||'Continue to Payment';} }
  }
  async function loadCheckout2(){ await Promise.all([loadCommon(),loadCheckoutSettings(),refreshCartPlanData()]); renderCheckoutPage2(); }
  window.renderCheckoutPage=renderCheckoutPage2;
  if(window.UC){ window.UC.checkout=checkout2; window.UC.loadCheckout=loadCheckout2; }

  // Extra visitor duration tracking for the admin visitor report.
  const visitStartedAt = Date.now();
  window.addEventListener('pagehide', function(){
    try {
      const body = JSON.stringify({visitor_id:getVisitorId(),path:location.pathname,referrer:document.referrer,source:detectTrafficSource(),duration_ms:Date.now()-visitStartedAt,event:'duration',analytics_consent:window.UCConsent?.allows?.('analytics')===true,ads_consent:window.UCConsent?.allows?.('ads')===true});
      fetch('/api/track/visit',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
    } catch (_) {}
  });
})();

/* Final public hero, gallery and button polish. */
(function(){
  const fmt = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function taxNote(p={}){const t=window.__ucLatestSettings?.taxes||state?.settings?.taxes||{};if(t.enabled!==true)return '';const isTrial=Number(p.trial_enabled||0)===1&&String(p.payment_type||'subscription')==='subscription';const bits=[];if(t.gstEnabled)bits.push(`GST ${Number(t.gstPercent||0)}%${isTrial?' on recurring charges':' applicable'}`);if(t.serviceChargeEnabled)bits.push(`Service charge${isTrial?' on recurring charges':' applicable'}`);if(t.otherTaxEnabled)bits.push(`${h(t.otherTaxLabel||'Other Tax')}${isTrial?' on recurring charges':' applicable'}`);return bits.length?`<small class="uc-tax-applicable">${bits.join(' • ')}</small>`:'';}
  function availabilityForCard(p,products=[]){
    const limit=Math.max(0,Number(p.spot_limit||0)),sold=Math.max(0,Number(p.sold_count||0)),left=limit>0?Math.max(0,limit-sold):null,fillAt=Math.max(0,Number(p.filling_fast_limit||0)),lowAt=Math.max(0,Number(p.low_spot_limit||0)),soldTotal=Math.max(0,Number(p.sold_count||0));
    const maxSold=Math.max(0,...(products||[]).map(x=>Math.max(0,Number(x.sold_count||0)))),popular=maxSold>0&&soldTotal===maxSold;
    if(limit>0){if(left<=0)return{label:'Currently full',className:'full',full:true};if(lowAt>0&&left<=lowAt)return{label:`Only ${left} spot${left===1?'':'s'} left`,className:'low',full:false};if(fillAt>0&&left<=fillAt)return{label:'Filling fast',className:'hot',full:false};if(popular)return{label:'Popular now',className:'hot',full:false};return{label:'Available',className:'available',full:false};}
    if(popular)return{label:'Popular now',className:'hot',full:false};return{label:'Available',className:'available',full:false};
  }
  window.ucProductAvailability=(p)=>availabilityForCard(p,window.__ucCurrentProductSet||[p]);
  function productCardPolished(p,index=0,products=[]){
    const imgs=(p.images&&p.images.length?p.images:[{public_url:'/assets/product-generic.svg',alt_text:p.name}]);
    const urls=imgs.map(i=>i.public_url);
    const features=(p.features||[]).slice(0,4).map(f=>`<li>${h(f)}</li>`).join('');
    const dots=imgs.length>1?`<div class="gallery-dots">${imgs.map((_,i)=>`<button class="gallery-dot ${i===0?'active':''}" type="button" aria-label="Image ${i+1}" onclick="galleryGo(this,${i})"></button>`).join('')}</div>`:'';
    const reg=Number(p.regular_price_paise||0),offerEnabled=Number(p.offer_price_enabled??1)!==0,offer=offerEnabled?Number(p.offer_price_paise||reg):reg,availability=availabilityForCard(p,products);
    const pricing=Number(p.trial_enabled||0)&&String(p.payment_type||'subscription')==='subscription'
      ? `<div class="price uc-trial-pricing"><span class="old">${fmt.format(reg/100)}</span>${offerEnabled&&offer!==reg?`<span class="trial-old-offer">${fmt.format(offer/100)}</span>`:''}<span class="trial-now">Try for ${fmt.format(Number(p.trial_amount_paise||100)/100)}</span></div>`
      : offerEnabled?`<div class="price"><span class="old">${fmt.format(reg/100)}</span><span class="new">${fmt.format(offer/100)}</span></div>`:`<div class="price"><span class="regular-only">${fmt.format(reg/100)}</span></div>`;
    return `<article class="card product-card" id="${h(p.slug)}" data-product-card="${p.id}">${p.badge?`<span class="badge">${h(p.badge)}</span>`:''}<div class="gallery" data-gallery><img src="${h(urls[0])}" alt="${h(imgs[0].alt_text||p.name)}" width="900" height="1100" loading="${index<4?'eager':'lazy'}" decoding="async" ${index===0?'fetchpriority="high"':''} data-gallery-img data-images='${JSON.stringify(urls).replaceAll("'",'&#39;')}' data-idx="0">${imgs.length>1?`<button class="gallery-btn prev" type="button" onclick="galleryShift(this,-1)">‹</button><button class="gallery-btn next" type="button" onclick="galleryShift(this,1)">›</button>${dots}`:''}</div><div><h3>${h(p.name)}</h3><p>${h(p.short_description||'')}</p></div>${pricing}${taxNote(p)}<ul class="features">${features}</ul><div class="uc-plan-availability ${availability.className}">${h(availability.label)}</div><div class="product-actions"><button class="btn" data-add="${p.id}" ${availability.full?'disabled':''}>${availability.full?'Currently Full':'Book Now'}</button><a class="btn secondary" href="/offer-details?plan=${encodeURIComponent(String(p.slug||''))}">Details</a></div></article>`;
  }
  window.galleryGo=function(dot,idx){const g=dot.closest('[data-gallery]');const img=g?.querySelector('[data-gallery-img]');if(!img)return;const arr=JSON.parse(img.dataset.images||'[]');if(!arr.length)return;img.dataset.idx=idx;img.src=arr[idx];g.querySelectorAll('.gallery-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));};
  window.galleryShift=function(btn,dir){const g=btn.closest('[data-gallery]');const img=g?.querySelector('[data-gallery-img]');if(!img)return;const arr=JSON.parse(img.dataset.images||'[]');if(!arr.length)return;let idx=Number(img.dataset.idx||0);idx=(idx+dir+arr.length)%arr.length;img.dataset.idx=idx;img.src=arr[idx];g.querySelectorAll('.gallery-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));};
  function initGalleryAuto(box){box.querySelectorAll('[data-gallery]').forEach(g=>{const img=g.querySelector('[data-gallery-img]');let arr=[];try{arr=JSON.parse(img?.dataset.images||'[]')}catch{} if(arr.length<2)return;clearInterval(g.__autoTimer);g.__autoTimer=setInterval(()=>{if(g.matches(':hover'))return;const next=g.querySelector('.gallery-btn.next');if(next)window.galleryShift(next,1);},4200);});}
  const oldRenderProducts=window.renderProducts;
  window.renderProducts=function(products,selector){const box=document.querySelector(selector);if(!box)return;if(!products?.length){box.innerHTML='';return;}window.__ucCurrentProductSet=products;box.innerHTML=products.map((p,i)=>productCardPolished(p,i,products)).join('');if(window.preloadProductImages)window.preloadProductImages(products);if(window.ucUpdateProductSchema)window.ucUpdateProductSchema(products,selector);box.querySelectorAll('[data-add]').forEach(btn=>btn.addEventListener('click',()=>{const p=products.find(x=>String(x.id)===btn.dataset.add);const v=String(p?.billing_period||'monthly')==='yearly'?(p?.variants||[]).find(x=>Number(x.billing_months)===12):p?.variants?.[0];if(p)window.addToCart?window.addToCart(p,v):addToCart(p,v);}));initGalleryAuto(box);window.__ucProductRenders=window.__ucProductRenders||{};window.__ucProductRenders[selector]={products,selector};document.dispatchEvent(new CustomEvent('uc-products-rendered',{detail:{products,selector}}));if(selector==='#featuredProducts' && products.length>4){box.classList.add('featured-carousel');let controls=document.querySelector('#featuredProductControls');if(!controls){controls=document.createElement('div');controls.id='featuredProductControls';controls.className='product-scroll-controls';controls.innerHTML='<button class="btn secondary compact" type="button" aria-label="Previous plans">←</button><button class="btn secondary compact" type="button" aria-label="Next plans">→</button>';box.parentElement?.querySelector('.section-head')?.appendChild(controls);}controls.querySelector('button:first-child').onclick=()=>box.scrollBy({left:-320,behavior:'smooth'});controls.querySelector('button:last-child').onclick=()=>box.scrollBy({left:320,behavior:'smooth'});}}
  const oldHeroSlide=window.heroSlide;
  window.heroSlide=function(b,i){const bg=b.desktop_image_url||'';return `<section class="hero slide ${i===0?'active':''}" ${bg?`style="--hero-bg:url('${h(bg)}')"`:''}><div class="container hero-grid hero-full"><div class="hero-copy"><span class="eyebrow">🎵 ${h(b.badge||'Fitness Classes')}</span><h1>${h(b.title||'Build your strength. Train your way.')}</h1><p>${h(b.subtitle||'Join online, gym or hybrid fitness classes with flexible memberships and clear class schedules.')}</p><div class="hero-actions"><a class="btn" href="${h(b.href||'/offers')}">Explore Fitness Plans</a><a class="btn secondary" href="/member-dashboard">My Membership</a></div></div></div></section>`;};
})();


/* Last touch-up: Ad-supported audition update rendering. */
(function(){
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parseAds(value){try{return Array.isArray(value)?value:JSON.parse(value||'[]')}catch{return []}}
  function adBox(ad){
    const type=h(ad.type||'Display Ad'), place=h(ad.placement||'In fitness tip'), size=h(ad.size||'Auto');
    const code=String(ad.code||ad.url||'').trim();
    if(!code) return '';
    const content = /<\w|<script|<ins|<iframe/i.test(code)
      ? code
      : (/^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(code) ? `<img src="${h(code)}" alt="${type}" loading="lazy">` : `<a href="${h(code)}" target="_blank" rel="nofollow noopener">${h(code)}</a>`);
    return `<aside class="ad-slot ad-${h((ad.placement||'in-article').replace(/\s+/g,'-').toLowerCase())}"><small>${type} • ${place} • ${size}</small>${content}</aside>`;
  }
  function injectAds(bodyHtml,ads){
    if(!ads.length) return bodyHtml;
    const before=ads.filter(a=>/top|header|before/i.test(a.placement||'')).map(adBox).join('');
    const after=ads.filter(a=>/bottom|after|footer/i.test(a.placement||'')).map(adBox).join('');
    const middle=ads.filter(a=>!/top|header|before|bottom|after|footer/i.test(a.placement||'')).map(adBox).join('');
    return `${before}${bodyHtml}${middle}${after}`;
  }
  async function loadBlogPostWithAds(){
    const slug=new URLSearchParams(location.search).get('slug') || window.UC_BLOG_SLUG || location.pathname.split('/').filter(Boolean).pop();
    const [site,res]=await Promise.all([api('/api/public/site').catch(()=>({settings:{}})),api(`/api/public/blogs?slug=${encodeURIComponent(slug||'')}`)]);
    if(window.prepareCommon)window.prepareCommon(site.settings||{}); else await loadCommon();
    const p=res.post;const box=document.querySelector('#blogPost');if(!box)return;
    if(!p){box.innerHTML='<h1>Fitness Tip not found</h1>';return;}
    const ads=parseAds(p.ads_json);
    box.innerHTML=`<h1>${h(p.title)}</h1><p class="lead">${h(p.excerpt||'')}</p>${p.tags?.length?`<p>${p.tags.map(t=>`<span class="badge">${h(t)}</span>`).join(' ')}</p>`:''}${injectAds(p.body_html,ads)}`;
  }
  if(window.UC) window.UC.loadBlogPost=loadBlogPostWithAds;
})();

/* V16.12 notification loader */
(()=>{if(document.querySelector('script[data-uc-v1612-notifications]'))return;const s=document.createElement('script');s.src='/assets/final-v16-12-browser-notifications.js';s.defer=true;s.dataset.ucV1612Notifications='1';document.head.appendChild(s);})();
