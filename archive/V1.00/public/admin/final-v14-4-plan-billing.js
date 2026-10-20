/* V14.6 — additive plan UX, safe payment labels, stable Orders rendering and plan management. */
(function(){
'use strict';
const $=(s,r=document)=>r?.querySelector?.(s)||null;
const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0)/100);

function paymentLabel(v){
  const s=String(v||'').toLowerCase();
  if(/cancel|revoke|expire/.test(s))return'Cancelled';
  if(/fail|halt|past_due|unpaid/.test(s))return'Failed';
  if(/paid|captur|success/.test(s))return'Paid';
  return'Pending';
}
function badgeClass(v){const x=paymentLabel(v);return x==='Paid'?'paid':x==='Pending'?'pending':'failed';}
window.ucAdminPaymentLabel=paymentLabel;

function combinedNotice(el){
  if(!el)return;
  const html='<strong>Next steps:</strong> use <strong>Images</strong> to upload/replace up to 3 scrolling images, then open <strong>Sales → Product Display</strong> to choose where the plan appears.';
  el.classList.add('uc-plan-next-step');
  if(el.dataset.ucCombinedNotice==='1')return;
  el.dataset.ucCombinedNotice='1';
  if(el.innerHTML!==html)el.innerHTML=html;
}
function setPlainLabel(el,text){
  const lab=el?.closest('.field')?.querySelector(':scope > label');
  if(lab && lab.textContent.trim()!==text)lab.textContent=text;
}

function ensureFields(){
  const f=$('#productForm');
  if(!f)return;
  ['sku','slug'].forEach(name=>{const el=$(`[name="${name}"]`,f);if(el)el.closest('.field')?.remove();});
  const name=$('[name="name"]',f);if(name){name.required=true;setPlainLabel(name,'Plan Name');}
  const short=$('[name="short_description"]',f);if(short)setPlainLabel(short,'Plan Short Description');
  const desc=$('[name="description"]',f);if(desc)setPlainLabel(desc,'Plan Description');
  const badge=$('[name="badge"]',f);if(badge)setPlainLabel(badge,'Plan Badge');
  const eligibility=$('[name="eligibility"]',f);if(eligibility)setPlainLabel(eligibility,'Plan Eligibility');
  const features=$('[name="features_json"]',f);if(features)setPlainLabel(features,'Plan Features');

  const offer=$('[name="offer_price_rupees"]',f);
  if(offer){
    const field=offer.closest('.field'),label=field?.querySelector('label');
    let checkbox=$('[name="offer_price_enabled"]',f);
    if(!checkbox){
      label?.insertAdjacentHTML('beforeend','<span class="uc-offer-inline-option"><input type="checkbox" name="offer_price_enabled" checked> Enable offer price</span>');
      checkbox=$('[name="offer_price_enabled"]',f);
    }else if(label && !label.querySelector('.uc-offer-inline-option')){
      const old=checkbox.closest('.check')||checkbox.parentElement;
      old?.remove();
      label.insertAdjacentHTML('beforeend','<span class="uc-offer-inline-option"><input type="checkbox" name="offer_price_enabled" checked> Enable offer price</span>');
    }
    field?.querySelectorAll('.hint').forEach(h=>{if(/regular price on the website/i.test(h.textContent||''))h.remove();});
  }

  if(!f.dataset.ucBilling){
    f.dataset.ucBilling='1';
    const statusRow=$('[name="status"]',f)?.closest('.row');
    statusRow?.insertAdjacentHTML('afterend',`
      <div class="row uc-billing-row">
        <div class="field">
          <label>Payment Type</label>
          <select name="payment_type"><option value="subscription">Subscription</option><option value="one_time">One-Time Payment</option></select>
          <small class="hint">Choose recurring Subscription or a single One-Time Payment.</small>
        </div>
        <div class="field" id="ucBillingPeriodField">
          <label>Billing Period</label>
          <select name="billing_period"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
          <small class="hint">This controls the recurring billing period for subscription plans.</small>
        </div>
        <div class="field uc-billing-length-field" id="ucBillingLengthField">
          <label>Billing Length</label>
          <input name="billing_interval" type="number" min="1" max="120" step="1" value="1" inputmode="numeric">
          <small id="ucBillingIntervalHint" class="hint uc-billing-interval-hint" aria-live="polite"></small>
        </div>
      </div>
      <div id="ucSubscriptionOptions">
        <label class="uc-trial-switch-row">
          <span class="switch"><input type="checkbox" name="trial_enabled"><span class="slider"></span></span>
          <strong>Enable Trial</strong>
        </label>
        <small class="hint">Turn this on when you want a small charge today and the normal subscription charge later.</small>
        <div id="ucTrialFields" class="row uc-trial-fields" hidden>
          <div class="field">
            <label>Charge Today ₹</label>
            <input name="trial_amount_rupees" type="number" min="1" step="1" value="1">
            <small class="hint">Amount collected immediately when the customer starts this trial.</small>
          </div>
          <div class="field">
            <label>Trial Unit</label>
            <select name="trial_unit"><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option></select>
            <small class="hint">Choose whether the trial is measured in days, weeks, months or years.</small>
          </div>
          <div class="field">
            <label>Trial Length</label>
            <input name="trial_value" type="number" min="1" step="1" value="7">
            <small id="ucTrialLiveHint" class="hint uc-trial-live-hint"></small>
          </div>
        </div>
      </div>
      <div id="ucOneTimeWarning" class="notice uc-one-time-warning" hidden><strong>One-Time Payment selected.</strong> The active selling price is charged once only. Billing Period and Trial are disabled because no recurring charge will be created.</div>
    `);
    f.addEventListener('change',syncFields);
    f.addEventListener('input',e=>{if(e.target?.matches('[name="trial_amount_rupees"],[name="trial_value"],[name="regular_price_rupees"],[name="offer_price_rupees"],[name="offer_price_enabled"],[name="billing_interval"]'))syncFields();});
  }

  // Keep the form in the natural admin workflow: define prices first, then configure a trial.
  // This only moves the already-existing trial controls; all trial logic stays unchanged.
  const pricingRow=offer?.closest('.row');
  const subscriptionOptions=$('#ucSubscriptionOptions');
  if(pricingRow&&subscriptionOptions&&pricingRow.nextElementSibling!==subscriptionOptions){
    pricingRow.insertAdjacentElement('afterend',subscriptionOptions);
  }

  const top=$('#productModal .top');
  if(top&&!top.querySelector('.uc-plan-help-btn')){
    const close=top.querySelector('button');
    close?.insertAdjacentHTML('beforebegin','<button type="button" class="uc-plan-help-btn" title="Plan, pricing and trial help" onclick="toggleUCPlanHelp()">ⓘ</button>');
  }
  if(!$('#ucPlanHelp',f))f.insertAdjacentHTML('afterbegin',`
    <div id="ucPlanHelp" class="uc-plan-help" hidden>
      <h3>Plan, Payment & Trial Guide</h3>
      <ul>
        <li><strong>Plan Name</strong> is the customer-facing plan title. SKU and URL slug are generated automatically in the background.</li>
        <li>Choose <strong>Subscription</strong> for recurring billing. Choose the Billing Period and Billing Length together: Monthly + 3 charges every three months; Yearly + 2 charges every two years. Choose <strong>One-Time Payment</strong> for one charge only; recurring controls and Trial are then hidden.</li>
        <li>For a trial, set <strong>Charge Today</strong>, choose the <strong>Trial Unit</strong>, then enter the <strong>Trial Length</strong>. The live helper shows when the normal price begins.</li>
        <li>Turn off <strong>Enable offer price</strong> when only the regular price should be shown.</li>
        <li>After saving, use <strong>Images</strong>, then open <strong>Sales → Product Display</strong> to choose the public page.</li>
      </ul>
      <div class="uc-trial-disadvantage"><strong>Trial caution:</strong> only money actually collected can be refunded. If ₹1 is the only amount collected before cancellation, the recorded refundable payment is ₹1.</div>
    </div>`);
  f.querySelectorAll('.notice').forEach(n=>{if(/After saving|Next step|Product Display/i.test(n.textContent||''))combinedNotice(n);});
  syncFields();
}

function unitLabel(unit,value){
  const v=Math.max(1,Number(value||1));
  const singular={days:'day',weeks:'week',months:'month',years:'year'}[unit]||'day';
  return `${v} ${v===1?singular:singular+'s'}`;
}
function syncTrialPreview(){
  const f=$('#productForm'),hint=$('#ucTrialLiveHint');if(!f||!hint)return;
  const v=Math.max(1,Number(f.trial_value?.value||1)),unit=f.trial_unit?.value||'days';
  const enabled=!!f.offer_price_enabled?.checked;
  const regular=Math.max(0,Number(f.regular_price_rupees?.value||0));
  const offer=Math.max(0,Number(f.offer_price_rupees?.value||0));
  const price=enabled&&offer>0?offer:regular,label=enabled&&offer>0?'Offer price':'Regular price';
  const msg=`${label}${price?` ₹${price}`:''} will be charged after ${unitLabel(unit,v)} from the date the customer purchases this plan.`;
  if(hint.textContent!==msg)hint.textContent=msg;
}
function syncBillingPreview(){
  const f=$('#productForm'),hint=$('#ucBillingIntervalHint');if(!f||!hint)return;
  const interval=Math.max(1,Math.min(120,Math.floor(Number(f.billing_interval?.value||1))||1));
  const period=f.billing_period?.value==='yearly'?'yearly':'monthly',unit=period==='yearly'?'year':'month';
  const enabled=!!f.offer_price_enabled?.checked,regular=Math.max(0,Number(f.regular_price_rupees?.value||0)),offer=Math.max(0,Number(f.offer_price_rupees?.value||0));
  const price=enabled&&offer>0?offer:regular,label=enabled&&offer>0?'offer price':'regular price';
  const frequency=`every ${interval===1?'':interval+' '}${unit}${interval===1?'':'s'}`;
  const amount=price?`The ${label} ${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(price)} will be charged ${frequency}.`:`The customer will be charged ${frequency}.`;
  const message=period==='yearly'?`This is a yearly plan. Please confirm: ${amount.charAt(0).toLowerCase()+amount.slice(1)}`:amount;
  // This form is watched by the script's childList observer. Rewriting the same
  // text on every observer pass creates a self-triggering microtask loop that
  // starves admin authentication and clicks. Only mutate when the value changes.
  if(hint.textContent!==message)hint.textContent=message;
  const yearlyWarning=period==='yearly';
  if(hint.classList.contains('uc-billing-year-warning')!==yearlyWarning)hint.classList.toggle('uc-billing-year-warning',yearlyWarning);
}
function syncFields(){
  const f=$('#productForm');if(!f)return;
  const pt=f.payment_type?.value||'subscription',trial=!!f.trial_enabled?.checked;
  const sub=$('#ucSubscriptionOptions'),tf=$('#ucTrialFields'),ow=$('#ucOneTimeWarning'),bp=$('#ucBillingPeriodField'),bl=$('#ucBillingLengthField');
  if(sub)sub.hidden=pt!=='subscription';
  if(tf)tf.hidden=pt!=='subscription'||!trial;
  if(ow)ow.hidden=pt!=='one_time';
  if(bp)bp.hidden=pt!=='subscription';
  if(bl)bl.hidden=pt!=='subscription';
  bp?.closest('.uc-billing-row')?.classList.toggle('uc-one-time-mode',pt==='one_time');
  if(f.billing_period)f.billing_period.disabled=pt!=='subscription';
  if(f.billing_interval)f.billing_interval.disabled=pt!=='subscription';
  if(f.trial_enabled)f.trial_enabled.disabled=pt!=='subscription';
  syncBillingPreview();
  syncTrialPreview();
}
window.toggleUCPlanHelp=function(){const b=$('#ucPlanHelp');if(b)b.hidden=!b.hidden;};

function typeBadge(p){
  if(String(p.payment_type||'subscription')==='one_time')return'<span class="uc-plan-type one">One-Time</span>';
  if(Number(p.trial_enabled||0))return'<span class="uc-plan-type trial">Trial</span>';
  return'<span class="uc-plan-type subscription">Subscription</span>';
}
function coverImage(p){
  const imgs=Array.isArray(p.images)?p.images:[];
  return imgs.find(i=>Number(i.is_cover||0)===1)||imgs[0]||null;
}
window.renderProducts=function(){
  const box=$('#productTable');if(!box)return;
  box.innerHTML=`<table class="table uc-v144-products"><thead><tr><th>Plan / Offer</th><th>Price</th><th>Status</th><th>Images</th><th>Actions</th></tr></thead><tbody>${(A.products||[]).map(p=>{
    const offer=Number(p.offer_price_enabled??1),trial=Number(p.trial_enabled||0),regular=money(p.regular_price_paise),sell=money(offer?p.offer_price_paise:p.regular_price_paise),trialAmt=money(p.trial_amount_paise||100);
    let price=offer?`<s>${regular}</s><br><strong>${sell}</strong>`:`<strong>${regular}</strong>`;
    if(trial)price=`<s>${regular}</s>${offer?`<br><s class="uc-trial-offer-strike">${sell}</s>`:''}<br><strong class="uc-trial-price">Try for ${trialAmt}</strong>`;
    const cover=coverImage(p),count=(p.images||[]).length;
    const publicHref=`/offer-details?plan=${encodeURIComponent(String(p.slug||''))}`;
    const classStyles=Array.isArray(p.class_mapping?.dance_styles)?p.class_mapping.dance_styles:[];
    const classTag=p.class_mapping?.enabled?`<span class="db107-plan-tag">${H(p.class_mapping.class_name||p.name)}${classStyles.length?` · ${H(classStyles.join(', '))}`:''}</span>`:'';
    return`<tr><td><div class="uc-plan-name-line"><a class="uc-admin-plan-link" href="${H(publicHref)}" target="_blank" rel="noopener" title="Open public plan details in a new tab"><strong>${H(p.name)}</strong></a>${typeBadge(p)}</div><small>${H(p.short_description||'')}</small>${classTag}</td><td>${price}</td><td><span class="status ${H(p.status)}">${H(p.status)}</span></td><td>${cover?`<img class="preview-img uc-cover-only" src="${H(cover.public_url)}" alt="${H(cover.alt_text||p.name||'Plan image')}">`:'<span class="muted">No image</span>'}<br><small>${count}/3 images</small></td><td><div class="uc-product-actions"><button class="btn small" onclick="editProductById(${p.id})">Edit</button><button class="btn secondary small" onclick="openMedia(${p.id})">Images</button><button class="btn danger small uc-delete-x" title="Delete plan" onclick="deleteUCProduct(${p.id})">×</button></div></td></tr>`;
  }).join('')}</tbody></table>`;
};

window.newProduct=function(){
  ensureFields();$('#productModalTitle').textContent='Add New Plan / Offer';$('#productId').value='';$('#productForm').reset();
  const f=$('#productForm'),desc=$('[name="description"]',f);if(desc){desc.required=true;desc.setAttribute('aria-required','true');const lab=desc.closest('.field')?.querySelector(':scope > label');if(lab)lab.textContent='Plan Description *';}
  f.offer_price_enabled.checked=true;f.payment_type.value='subscription';f.billing_period.value='monthly';f.billing_interval.value='1';f.trial_amount_rupees.value='1';f.trial_value.value='7';f.trial_unit.value='days';syncFields();$('#productModal').classList.add('open');
};
window.editProduct=function(p){
  ensureFields();const f=$('#productForm');if(!f)return;$('#productModalTitle').textContent='Edit Plan / Offer';$('#productId').value=p.id;const desc=$('[name="description"]',f);if(desc){desc.required=false;desc.removeAttribute('aria-required');const lab=desc.closest('.field')?.querySelector(':scope > label');if(lab)lab.textContent='Plan Description';}
  ['name','short_description','description','badge','eligibility','spot_limit','status','sort_order'].forEach(k=>{const el=$(`[name="${k}"]`,f);if(el)el.value=p[k]??''});
  f.regular_price_rupees.value=Math.round(Number(p.regular_price_paise||0)/100);f.offer_price_rupees.value=Math.round(Number(p.offer_price_paise||0)/100);f.features_json.value=(p.features||[]).join('\n');f.payment_type.value=p.payment_type||'subscription';f.billing_period.value=p.billing_period||'monthly';f.billing_interval.value=Math.max(1,Number(p.billing_interval||1));f.offer_price_enabled.checked=Number(p.offer_price_enabled??1)!==0;f.trial_enabled.checked=Number(p.trial_enabled||0)!==0;f.trial_amount_rupees.value=Math.max(1,Math.round(Number(p.trial_amount_paise||100)/100));f.trial_value.value=Math.max(1,Number(p.trial_value||7));f.trial_unit.value=p.trial_unit||'days';syncFields();$('#productModal').classList.add('open');
};
window.editProductById=async id=>{let p=(A.products||[]).find(x=>Number(x.id)===Number(id));if(!p&&window.load_products){await window.load_products();p=(A.products||[]).find(x=>Number(x.id)===Number(id));}if(p)return editProduct(p);window.ucAdminToast?.('Could not load this plan. Refresh Plans & Offers and try again.','error');};
window.saveProduct=async function(e){
  e.preventDefault();ensureFields();const f=e.target,fd=new FormData(f),payload=Object.fromEntries(fd.entries());
  payload.id=$('#productId').value||undefined;payload.features=String(payload.features_json||'').split('\n').map(x=>x.trim()).filter(Boolean);delete payload.features_json;
  payload.regular_price_paise=Math.round(Number(payload.regular_price_rupees||0)*100);payload.offer_price_paise=Math.round(Number(payload.offer_price_rupees||0)*100);
  payload.offer_price_enabled=f.offer_price_enabled.checked?1:0;payload.billing_interval=Math.max(1,Math.min(120,Math.floor(Number(payload.billing_interval||1))||1));payload.trial_enabled=(payload.payment_type==='subscription'&&f.trial_enabled.checked)?1:0;payload.trial_amount_paise=Math.round(Number(payload.trial_amount_rupees||1)*100);payload.trial_value=Math.max(1,Number(payload.trial_value||1));payload.spot_limit=Math.max(0,Math.floor(Number(payload.spot_limit||0)));payload.sort_order=Number(payload.sort_order||0);
  delete payload.sku;delete payload.slug;
  await api('/api/admin/products',{method:payload.id?'PUT':'POST',body:JSON.stringify(payload)});$('#productModal').classList.remove('open');await load_products();
};
window.deleteUCProduct=async function(id){
  const p=(A.products||[]).find(x=>x.id===id);const ok=confirm(`Delete ${p?.name||'this plan'}?\n\nThis permanently removes the plan/offer from the admin catalog and all public page placements. It will no longer appear on the website. Historical customer payment/order records are retained for accounting. To use the plan again, create it again.`);
  if(!ok)return;await api('/api/admin/products?id='+encodeURIComponent(id),{method:'DELETE'});await load_products();if(window.load_placements)await load_placements();
};

function patchPaymentText(root=document){
  root.querySelectorAll('.status').forEach(el=>{
    if(!el.closest('#orders,.uc-client-modal,#ucClientModal'))return;
    const raw=(el.textContent||'').trim();
    if(!/created|authenticated|charged|captured|active|awaiting_payment|pending|paid|successful|success|failed|halt|cancel|expired/i.test(raw))return;
    const label=paymentLabel(raw),cls='uc-pay-'+badgeClass(raw);
    if(raw!==label)el.textContent=label;
    ['uc-pay-paid','uc-pay-pending','uc-pay-failed'].forEach(c=>{if(c!==cls)el.classList.remove(c);});
    if(!el.classList.contains(cls))el.classList.add(cls);
  });
}
function patchPlacement(){
  const pages=$('#placements .placement-pages');if(!pages||pages.querySelector('[value="yearly"]'))return;
  const labels=[...pages.querySelectorAll('label.check')],target=labels.find(x=>/Festival Offer Page/i.test(x.textContent||''));
  const html='<label class="check"><span><input data-place-page type="checkbox" value="yearly"> <a href="/yearly-plans" target="_blank" rel="noopener">Yearly Plans Page</a></span></label>';
  if(target)target.insertAdjacentHTML('afterend',html);else pages.insertAdjacentHTML('beforeend',html);
}
function patchHelp(){
  const product=$('#products .notice');if(product&&!product.dataset.ucProductHelp){product.dataset.ucProductHelp='1';combinedNotice(product);}
}
let queued=false;
const mo=new MutationObserver(()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;ensureFields();patchPlacement();patchHelp();patchPaymentText();});
});
function init(){ensureFields();patchPlacement();patchHelp();patchPaymentText();mo.observe(document.body,{subtree:true,childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);
})();
