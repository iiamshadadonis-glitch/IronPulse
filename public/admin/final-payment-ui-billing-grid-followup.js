/* Final follow-up add-on.
   Purpose: restore the earlier clean Payments UI, add PhonePe without disturbing the rest,
   add live billing-duration guidance, and keep PhonePe plan validation transparent. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PAY=window.UCPaymentFollowup=window.UCPaymentFollowup||{settings:null};

  function paymentMarkup(active=false){
    const section=document.createElement('section');
    section.id='payments'; section.className='panel'+(active?' active':''); section.dataset.ucCleanPayments='1';
    section.innerHTML=`
      <div class="top"><div><h1>Payments</h1><p class="muted">Configure payment gateways for checkout and subscriptions.</p></div><button class="btn secondary compact" type="button" onclick="load_payments()">Refresh</button></div>

      <details class="card pay-detail" data-pay-detail="razorpay">
        <summary>Razorpay</summary>
        <form class="form" data-gateway-form="razorpay" onsubmit="saveUCGatewaySection(event,'razorpay')">
          <div class="uc-pay-toggle-strip">
            <div class="uc-pay-toggle-item">
              <label class="uc-pay-toggle-capsule"><span class="switch"><input class="uc-main-gateway-toggle" data-gateway="razorpay" name="razorpayEnabled" type="checkbox" onchange="ucPrimaryGatewayChanged(this)"><span class="slider"></span></span><strong>Enable Razorpay</strong></label>
              <small class="uc-pay-toggle-helper">Primary</small>
            </div>
          </div>
          <div class="row"><div class="field"><label>Razorpay Key ID</label><input name="razorpayKeyId"></div><div class="field"><label>Razorpay Key Secret <small id="razorpaySecretHint" class="hint inline-hint"></small></label><input name="razorpayKeySecret" type="password" placeholder="Leave blank to keep saved secret"></div></div>
          <div class="field"><label>Razorpay Webhook Secret <small id="razorpayWebhookHint" class="hint inline-hint"></small></label><input name="razorpayWebhookSecret" type="password" placeholder="Leave blank to keep saved secret"></div>
          <div class="copyline"><input id="razorpayWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('razorpayWebhookUrl')">Copy</button></div>
          <div class="form-actions"><button class="btn compact">Save Razorpay</button></div>
        </form>
      </details>

      <details class="card pay-detail" data-pay-detail="phonepe">
        <summary>PhonePe</summary>
        <form class="form" data-gateway-form="phonepe" onsubmit="saveUCGatewaySection(event,'phonepe')">
          <div class="uc-pay-toggle-strip">
            <div class="uc-pay-toggle-item">
              <label class="uc-pay-toggle-capsule"><span class="switch"><input class="uc-main-gateway-toggle" data-gateway="phonepe" name="phonepeEnabled" type="checkbox" onchange="ucPrimaryGatewayChanged(this)"><span class="slider"></span></span><strong>Enable PhonePe</strong></label>
              <small class="uc-pay-toggle-helper">Primary</small>
            </div>
            <div class="uc-pay-toggle-item uc-fallback-toggle-row" data-fallback-for="phonepe">
              <label class="uc-pay-toggle-capsule"><span class="switch"><input id="ucPhonePeFallback" name="phonepeFallbackEnabled" type="checkbox" onchange="ucFallbackGatewayChanged(this)"><span class="slider"></span></span><strong>Enable PhonePe fallback if Razorpay fails</strong></label>
              <small class="uc-pay-toggle-helper">Secondary when Razorpay is Primary</small>
            </div>
          </div>
          <div id="ucPhonePePrimaryCompatibility"></div>
          <div class="row">
            <div class="field"><label>Environment</label><select name="phonepeEnvironment"><option value="production">Production</option><option value="sandbox">Sandbox / UAT</option></select><small class="hint">Production = live payments. Sandbox / UAT = testing.</small></div>
            <div class="field"><label>Client ID</label><input name="phonepeClientId"><small class="hint">Provided by PhonePe in Business Dashboard → Developer Settings.</small></div>
          </div>
          <div class="row">
            <div class="field"><label>Client Version</label><input name="phonepeClientVersion" value="1"><small class="hint">Provided with your PhonePe API credentials.</small></div>
            <div class="field"><label>Client Secret <small id="phonepeClientSecretHint" class="hint inline-hint"></small></label><input name="phonepeClientSecret" type="password" placeholder="Leave blank to keep saved secret"><small class="hint">Provided by PhonePe in Business Dashboard → Developer Settings.</small></div>
          </div>
          <div class="row">
            <div class="field"><label>Merchant ID</label><input name="phonepeMerchantId"><small class="hint">Provided by PhonePe. Leave blank unless PhonePe asks for it for your setup.</small></div>
            <div class="field"><label>Webhook Authentication</label><select name="phonepeWebhookAuthMode" onchange="ucPhonePeWebhookModeChanged(this.value)"><option value="hmac">HMAC</option><option value="sha">SHA Username + Password</option></select><small class="hint">Use the same authentication method selected in your PhonePe webhook.</small></div>
          </div>
          <div class="row uc-phonepe-auth-fields" data-phonepe-auth="sha">
            <div class="field"><label>Webhook Username</label><input name="phonepeWebhookUsername"><small class="hint">Create this when setting up the SHA webhook in PhonePe.</small></div>
            <div class="field"><label>Webhook Password <small id="phonepeWebhookPasswordHint" class="hint inline-hint"></small></label><input name="phonepeWebhookPassword" type="password" placeholder="Leave blank to keep saved password"><small class="hint">Create this with the SHA webhook username in PhonePe.</small></div>
          </div>
          <div class="row uc-phonepe-auth-fields" data-phonepe-auth="hmac">
            <div class="field"><label>HMAC Webhook Secret <small id="phonepeWebhookSecretHint" class="hint inline-hint"></small></label><input name="phonepeWebhookSecret" type="password" placeholder="Leave blank to keep saved secret"><small class="hint">Generated by PhonePe when the HMAC webhook is created.</small></div>
            <div class="field"><label>HMAC Webhook ID / Key ID</label><input name="phonepeWebhookKeyId"><small class="hint">Generated by PhonePe with the HMAC webhook.</small></div>
          </div>
          <div class="copyline"><input id="phonepeWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('phonepeWebhookUrl')">Copy</button></div>
          <small class="hint">This URL is generated by IronPulse Gym. Paste it into the PhonePe webhook setup.</small>
          <div class="uc-phonepe-note">Customized subscription plans are checked before a PhonePe link is created. Unsupported limits are shown before generation instead of changing the plan without informing the admin.</div>
          <div class="form-actions"><button class="btn compact">Save PhonePe</button></div>
        </form>
      </details>

      <details class="card pay-detail" data-pay-detail="stripe">
        <summary>Stripe</summary>
        <form class="form" data-gateway-form="stripe" onsubmit="saveUCGatewaySection(event,'stripe')">
          <div class="uc-pay-toggle-strip">
            <div class="uc-pay-toggle-item">
              <label class="uc-pay-toggle-capsule"><span class="switch"><input class="uc-main-gateway-toggle" data-gateway="stripe" name="stripeEnabled" type="checkbox" onchange="ucPrimaryGatewayChanged(this)"><span class="slider"></span></span><strong>Enable Stripe</strong></label>
              <small class="uc-pay-toggle-helper">Primary</small>
            </div>
            <div class="uc-pay-toggle-item uc-fallback-toggle-row" data-fallback-for="stripe">
              <label class="uc-pay-toggle-capsule"><span class="switch"><input id="ucStripeFallback" name="stripeFallbackEnabled" type="checkbox" onchange="ucFallbackGatewayChanged(this)"><span class="slider"></span></span><strong>Enable Stripe fallback if Razorpay fails</strong></label>
              <small id="ucStripeFallbackRole" class="uc-pay-toggle-helper">Secondary</small>
            </div>
          </div>
          <div class="row"><div class="field"><label>Stripe Publishable Key</label><input name="stripePublishableKey"></div><div class="field"><label>Stripe Secret Key <small id="stripeSecretHint" class="hint inline-hint"></small></label><input name="stripeSecretKey" type="password" placeholder="Leave blank to keep saved secret"></div></div>
          <div class="field"><label>Stripe Webhook Secret <small id="stripeWebhookHint" class="hint inline-hint"></small></label><input name="stripeWebhookSecret" type="password" placeholder="Leave blank to keep saved secret"></div>
          <div class="copyline"><input id="stripeWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('stripeWebhookUrl')">Copy</button></div>
          <div class="form-actions"><button class="btn compact">Save Stripe</button></div>
        </form>
      </details>
      <div id="paymentsMsg"></div>`;
    return section;
  }

  function installPaymentsMarkup(){
    const old=$('#payments'); if(!old)return null;
    if(old.dataset.ucCleanPayments==='1')return old;
    const section=paymentMarkup(old.classList.contains('active'));
    old.replaceWith(section); return section;
  }

  function hint(id,masked){const e=$(id);if(e)e.textContent=masked?`Saved: ${masked}`:'No secret saved yet.';}
  function primaryFromSettings(s={}){
    const p=String(s.primaryGateway||'').toLowerCase(); if(['razorpay','phonepe','stripe'].includes(p))return p;
    if(s.razorpayEnabled)return'razorpay'; if(s.phonepeEnabled)return'phonepe'; if(s.stripeEnabled)return'stripe'; return'';
  }
  function closePaymentCards(){ $$('#payments[data-uc-clean-payments="1"] details.pay-detail').forEach(d=>d.open=false); }
  function setValue(name,value){const e=$(`#payments [name="${name}"]`);if(e)e.value=value??'';}
  function setChecked(name,value){const e=$(`#payments [name="${name}"]`);if(e)e.checked=!!value;}

  function populatePayments(s,urls={},closeCards=false){
    PAY.settings={...s,primaryGateway:primaryFromSettings(s)};
    const p=PAY.settings.primaryGateway;
    $$('#payments .uc-main-gateway-toggle').forEach(x=>x.checked=x.dataset.gateway===p);
    setChecked('phonepeFallbackEnabled',p==='razorpay'&&!!s.phonepeFallbackEnabled);
    setChecked('stripeFallbackEnabled',p==='razorpay'&&!!s.stripeFallbackEnabled);

    setValue('razorpayKeyId',s.razorpayKeyId||'');
    setValue('phonepeEnvironment',s.phonepeEnvironment||'production');setValue('phonepeClientId',s.phonepeClientId||'');setValue('phonepeClientVersion',s.phonepeClientVersion||'1');setValue('phonepeMerchantId',s.phonepeMerchantId||'');setValue('phonepeWebhookUsername',s.phonepeWebhookUsername||'');setValue('phonepeWebhookKeyId',s.phonepeWebhookKeyId||'');setValue('phonepeWebhookAuthMode',s.phonepeWebhookAuthMode||'hmac');
    setValue('stripePublishableKey',s.stripePublishableKey||'');
    ['razorpayKeySecret','razorpayWebhookSecret','phonepeClientSecret','phonepeWebhookPassword','phonepeWebhookSecret','stripeSecretKey','stripeWebhookSecret'].forEach(n=>setValue(n,''));
    const u={...s,...urls};['razorpayWebhookUrl','phonepeWebhookUrl','stripeWebhookUrl'].forEach(k=>{const e=$('#'+k);if(e)e.value=u[k]||'';});
    hint('#razorpaySecretHint',s.razorpayKeySecretMasked);hint('#razorpayWebhookHint',s.razorpayWebhookSecretMasked);hint('#phonepeClientSecretHint',s.phonepeClientSecretMasked);hint('#phonepeWebhookPasswordHint',s.phonepeWebhookPasswordMasked);hint('#phonepeWebhookSecretHint',s.phonepeWebhookSecretMasked);hint('#stripeSecretHint',s.stripeSecretKeyMasked);hint('#stripeWebhookHint',s.stripeWebhookSecretMasked);
    window.ucPhonePeWebhookModeChanged(s.phonepeWebhookAuthMode||'hmac');
    syncToggleAvailability();
    if(closeCards)closePaymentCards();
    updateAllBillingHelpers();
  }

  function currentGatewayState(){
    const primary=$('#payments .uc-main-gateway-toggle:checked')?.dataset.gateway||'';
    return {primaryGateway:primary,razorpayEnabled:primary==='razorpay',phonepeEnabled:primary==='phonepe',stripeEnabled:primary==='stripe',phonepeFallbackEnabled:primary==='razorpay'&&!!$('#ucPhonePeFallback')?.checked,stripeFallbackEnabled:primary==='razorpay'&&!!$('#ucStripeFallback')?.checked};
  }
  function syncToggleAvailability(){
    const primary=$('#payments .uc-main-gateway-toggle:checked')?.dataset.gateway||'';
    $$('#payments .uc-main-gateway-toggle').forEach(x=>x.disabled=false);
    $$('#payments .uc-fallback-toggle-row').forEach(row=>{
      const input=$('input',row),enabled=primary==='razorpay';
      if(input)input.disabled=!enabled;
      row.dataset.disabled=enabled?'0':'1';
      if(!enabled&&input)input.checked=false;
    });
    const stripeRole=$('#ucStripeFallbackRole');
    if(stripeRole)stripeRole.textContent=$('#ucPhonePeFallback')?.checked?'Tertiary':'Secondary';
  }
  function paymentMessage(text,type='notice'){
    const box=$('#paymentsMsg');if(!box)return;box.innerHTML=`<div class="${type==='error'?'error':'notice'+(type==='success'?' success':'')}">${H(text)}</div>`;
  }

  window.ucPrimaryGatewayChanged=function(input){
    if(input.checked){$$('#payments .uc-main-gateway-toggle').forEach(x=>{if(x!==input)x.checked=false;});}
    syncToggleAvailability();
    if(input.dataset.gateway==='phonepe'&&input.checked)updatePhonePeDefaultCompatibility();
  };
  window.ucFallbackGatewayChanged=function(){syncToggleAvailability();};
  window.ucPhonePeWebhookModeChanged=function(mode){
    mode=String(mode||'hmac').toLowerCase();$$('#payments [data-phonepe-auth]').forEach(row=>row.hidden=row.dataset.phonepeAuth!==mode);
  };

  async function postPaymentSettings(payload){return api('/api/admin/integrations',{method:'POST',body:JSON.stringify(payload)});}
  window.saveUCGatewaySection=async function(e,section){
    e.preventDefault();const form=e.target,btn=form.querySelector('button[type="submit"],button:not([type])'),old=btn?.textContent;
    const payload={...currentGatewayState(),...Object.fromEntries(new FormData(form).entries())};
    // Switch fields must be booleans, never the browser's "on" string.
    Object.assign(payload,currentGatewayState());
    if(btn){btn.disabled=true;btn.textContent='Saving…';} paymentMessage(`Saving ${section==='phonepe'?'PhonePe':section==='stripe'?'Stripe':'Razorpay'} settings…`);
    try{
      const r=await postPaymentSettings(payload);populatePayments(r.settings||{},r.settings||{},false);
      const label=section==='phonepe'?'PhonePe':section==='stripe'?'Stripe':'Razorpay';
      paymentMessage(`${label} settings saved.${r.syncedPlans?` ${r.syncedPlans} Razorpay plan(s) were synchronized.`:''}`,'success');
    }catch(err){paymentMessage(err.message||'Settings could not be saved.','error');}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Save';}}
  };

  window.load_payments=async function(){
    installPaymentsMarkup();paymentMessage('Loading payment settings…');
    try{const r=await api('/api/admin/integrations');populatePayments(r.settings||{},r.settings||{},true);paymentMessage('Payment settings loaded. Open only the gateway you want to review.','success');}
    catch(e){paymentMessage(e.message||'Payment settings could not be loaded.','error');}
  };

  async function preloadGatewaySettings(){
    try{const r=await api('/api/admin/integrations');PAY.settings={...(r.settings||{}),primaryGateway:primaryFromSettings(r.settings||{})};if($('#payments[data-uc-clean-payments="1"]'))populatePayments(r.settings||{},r.settings||{},false);updateAllBillingHelpers();}catch(_){/* the page still works; submit-time backend validation remains authoritative */}
  }

  function plural(n,one,many){return Number(n)===1?one:many;}
  function durationText(months){
    months=Math.max(0,Math.round(Number(months||0)));if(!months)return'0 months';const y=Math.floor(months/12),m=months%12,a=[];if(y)a.push(`${y} ${plural(y,'year','years')}`);if(m)a.push(`${m} ${plural(m,'month','months')}`);return a.join(' ');
  }
  function billingFrequencyText(form,months){
    const sel=form.querySelector('[name="billing_months"]');let t=sel?.selectedOptions?.[0]?.textContent?.trim()||'';
    if(/^monthly$/i.test(t))return'every 1 month';if(/^yearly$/i.test(t))return'every 1 year';
    if(/^every\s+/i.test(t))return t.toLowerCase();
    months=Math.max(1,Number(months||1));if(months%12===0){const y=months/12;return`every ${y} ${plural(y,'year','years')}`;}return`every ${months} ${plural(months,'month','months')}`;
  }
  function ensureBillingHelper(form){
    if(!form)return;const cycles=form.querySelector('[name="total_count"]'),freq=form.querySelector('[name="billing_months"]');if(!cycles||!freq)return;
    const field=cycles.closest('.field')||cycles.parentElement;let helper=field?.querySelector('.uc-live-billing-helper');
    if(!helper){helper=field?.querySelector('.hint');if(helper)helper.classList.add('uc-live-billing-helper');else{helper=document.createElement('small');helper.className='hint uc-live-billing-helper';field?.appendChild(helper);}}
    const m=Math.max(1,Number(freq.value||1)),n=Math.max(0,Number(cycles.value||0));
    helper.textContent=n?`Billing frequency: ${billingFrequencyText(form,m)} × ${n} ${plural(n,'billing cycle','billing cycles')} = ${durationText(m*n)}.`:'Enter the total billing cycles to see the full subscription duration.';
    updatePhonePePlanWarning(form);
  }
  function updateAllBillingHelpers(){
    const forms=new Set();$$('form [name="total_count"]').forEach(x=>forms.add(x.form||x.closest('form')));forms.forEach(ensureBillingHelper);
  }

  function savedPrimary(){return String(PAY.settings?.primaryGateway||'').toLowerCase();}
  function phonePePlanIssues(form){
    const months=Math.max(1,Number(form.querySelector('[name="billing_months"]')?.value||1)),cycles=Math.max(1,Number(form.querySelector('[name="total_count"]')?.value||1));
    const amount=Number(form.querySelector('[name="subscription_amount"]')?.value||form.querySelector('[name="amount_rupees"]')?.value||0),setup=Number(form.querySelector('[name="setup_amount"]')?.value||0),totalMonths=months*cycles,hard=[];
    if(totalMonths>360)hard.push(`PhonePe supports a subscription expiry up to 30 years. This plan is ${durationText(totalMonths)}.`);
    if(amount>15000)hard.push('PhonePe AutoPay allows up to ₹15,000 per recurring billing cycle for this setup.');
    if(setup>0)hard.push('This PhonePe integration cannot add a separate setup / advance amount to the subscription link. Set it to ₹0 or use another primary gateway.');
    const native=[1,2,3,6,12].includes(months);return {hard,native,months,cycles,totalMonths};
  }
  function warningContainer(form){
    let box=form.querySelector('.uc-phonepe-plan-warning');if(box)return box;box=document.createElement('div');box.className='uc-phonepe-plan-warning';box.hidden=true;const actions=form.querySelector('.uc-form-actions,.form-actions');if(actions)actions.insertAdjacentElement('beforebegin',box);else form.appendChild(box);return box;
  }
  function updatePhonePePlanWarning(form){
    if(!form||!form.querySelector('[name="total_count"]'))return;const box=warningContainer(form);if(savedPrimary()!=='phonepe'){box.hidden=true;return;}
    const x=phonePePlanIssues(form);if(x.hard.length){box.className='uc-phonepe-plan-warning error';box.innerHTML=`<strong>PhonePe plan check:</strong> ${H(x.hard.join(' '))} Please change the highlighted billing values before generating the subscription.`;box.hidden=false;return;}
    if(!x.native){box.className='uc-phonepe-plan-warning warn';box.innerHTML=`<strong>PhonePe plan check:</strong> This ${H(billingFrequencyText(form,x.months))} schedule will be kept using PhonePe's flexible recurring option. Your price, billing interval and total duration will not be changed.`;box.hidden=false;return;}
    box.hidden=true;
  }
  function updatePhonePeDefaultCompatibility(){
    const box=$('#ucPhonePePrimaryCompatibility');if(!box)return;
    // Current IronPulse Gym default: monthly × 252 = 21 years, which is within PhonePe's 30-year expiry limit.
    box.innerHTML='';
  }
  function phonePeHardBlock(form){if(savedPrimary()!=='phonepe')return'';return phonePePlanIssues(form).hard.join(' ');}

  const priorGenerateCustom=window.generateCustomSubscription;
  if(typeof priorGenerateCustom==='function')window.generateCustomSubscription=function(e){const msg=phonePeHardBlock(e.target);if(msg){e.preventDefault();updatePhonePePlanWarning(e.target);const b=$('#customSubscriptionMsg');if(b)b.innerHTML=`<div class="error">${H(msg)} Change the billing values and try again.</div>`;return false;}return priorGenerateCustom.apply(this,arguments);};
  const priorGenerateClient=window.generateUCPayment;
  if(typeof priorGenerateClient==='function')window.generateUCPayment=function(e,action){if(action==='create_subscription'){const msg=phonePeHardBlock(e.target);if(msg){e.preventDefault();updatePhonePePlanWarning(e.target);const b=$('#ucPaymentGenMsg');if(b)b.innerHTML=`<div class="error">${H(msg)} Change the billing values and try again.</div>`;return false;}}return priorGenerateClient.apply(this,arguments);};

  const priorStandard=window.ucStandardBillingChanged;
  if(typeof priorStandard==='function')window.ucStandardBillingChanged=function(sel){const r=priorStandard.apply(this,arguments);setTimeout(()=>ensureBillingHelper(sel.closest('form')),0);return r;};
  const priorCustomType=window.ucCustomSubscriptionTypeChanged;
  if(typeof priorCustomType==='function')window.ucCustomSubscriptionTypeChanged=function(sel){const r=priorCustomType.apply(this,arguments);setTimeout(()=>ensureBillingHelper(sel.closest('form')),0);return r;};
  const priorHubTab=window.ucPayHubTab;
  if(typeof priorHubTab==='function')window.ucPayHubTab=function(){const r=priorHubTab.apply(this,arguments);setTimeout(updateAllBillingHelpers,0);return r;};

  document.addEventListener('input',e=>{if(e.target.matches('[name="billing_months"],[name="total_count"],[name="subscription_amount"],[name="amount_rupees"],[name="setup_amount"]'))ensureBillingHelper(e.target.closest('form'));});
  document.addEventListener('change',e=>{if(e.target.matches('[name="billing_months"],[name="total_count"],[name="subscription_amount"],[name="amount_rupees"],[name="setup_amount"]'))ensureBillingHelper(e.target.closest('form'));});

  function init(){installPaymentsMarkup();closePaymentCards();updateAllBillingHelpers();preloadGatewaySettings();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,360));else setTimeout(init,360);
})();
