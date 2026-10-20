/* Final multi-gateway subscription, checkout and storage UI layer.
   Additive override loaded after the existing admin scripts. Existing CRM/order/
   product logic stays in place; only the requested payment/subscription/storage
   surfaces are replaced or augmented. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ENC=v=>encodeURIComponent(v==null?'':String(v));
  const INR=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2});
  const money=p=>INR.format(Number(p||0)/100);
  const TYPES={total:'Total Subscriptions',active:'Active Subscriptions',successful:'Successful Charges',new:'New Subscriptions',renewed:'Renewals',upcoming:'Upcoming Renewals',failed:'Failed Subscriptions',cancelled:'Cancelled Subscriptions'};
  const S={dashPeriod:'monthly',dashRange:null,lastCardSig:'',modalType:'total',storage:null,storageCategory:'',storageRows:[],storageKey:'id',payments:null};

  function toast(text,bad=false){
    let t=$('#ucMultiToast');if(!t){t=document.createElement('div');t.id='ucMultiToast';t.className='uc-multi-toast';document.body.appendChild(t);}
    t.textContent=text;t.classList.toggle('bad',bad);t.classList.add('show');clearTimeout(t.__timer);t.__timer=setTimeout(()=>t.classList.remove('show'),3800);
  }
  function fmtDate(v){
    if(!v)return '—';const s=String(v);let d;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))d=new Date(`${s}T00:00:00+05:30`);
    else if(Number(v)>1e9)d=new Date(Number(v)*(Number(v)>1e12?1:1000));else d=new Date(s);
    if(Number.isNaN(d.getTime()))return s;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  }
  function dateString(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function presetRange(preset){
    const now=new Date(),to=dateString(now),fromDate=new Date(now);
    if(preset==='today')return {from:to,to,period:'daily'};
    if(preset==='month'){fromDate.setDate(1);return {from:dateString(fromDate),to,period:'monthly'};}
    if(preset==='year'){fromDate.setMonth(0,1);return {from:dateString(fromDate),to,period:'yearly'};}
    if(preset==='last_month'){const x=new Date(now.getFullYear(),now.getMonth()-1,1),y=new Date(now.getFullYear(),now.getMonth(),0);return {from:dateString(x),to:dateString(y),period:'custom'};}
    if(preset==='7'){fromDate.setDate(fromDate.getDate()-6);return {from:dateString(fromDate),to,period:'custom'};}
    if(preset==='30'){fromDate.setDate(fromDate.getDate()-29);return {from:dateString(fromDate),to,period:'custom'};}
    return {from:to,to,period:'custom'};
  }
  function setText(sel,v){const e=$(sel);if(e)e.textContent=v;}
  function sourceNames(r){return (r?.sources||[]).filter(x=>!x.error).map(x=>x.label).filter(Boolean);}
  function gatewayNote(r){
    if(r?.configured===false)return 'Live subscription information will appear here after a Payment Gateway is enabled in Payments.';
    const names=sourceNames(r),enabled=(r?.enabled_gateways||[]).length;
    let text=r?.source_message||`Live subscription information was fetched from ${names.join(' + ')||'the enabled Payment Gateway'}.`;
    if(enabled===1&&names.length===1)text+=` Only ${names[0]} is currently enabled for subscription fetching. Enable the required fallback gateway in Settings → Integrations → Payments if you also want its records included.`;
    return text;
  }
  function statusBox(text,type='ok',busy=false){return `<div class="uc-pg-status ${H(type)}">${busy?'<span class="uc-fetch-spinner" aria-hidden="true"></span>':''}<span>${H(text)}</span></div>`;}

  /* ---------------- Subscription dashboard ---------------- */
  function ensureDashboardControls(){
    const block=$('.uc-subscription-overview-block');if(!block)return;
    const head=block.querySelector('.block-head');if(head){
      let controls=head.querySelector('.uc-sub-overview-controls');
      if(!controls){
        const old=head.querySelector('button');old?.remove();
        controls=document.createElement('div');controls.className='uc-sub-overview-controls';controls.innerHTML=`<div class="field compact-field"><label for="ucDashboardSubscriptionPeriod">Period</label><select id="ucDashboardSubscriptionPeriod"><option value="daily">Daily</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select></div><button id="ucDashboardSubscriptionApply" class="btn compact" type="button" onclick="applyUCSubscriptionOverview(this)">Apply</button>`;head.appendChild(controls);
      }
    }
    const success=block.querySelector('[onclick*="successful"]');if(success){success.querySelector('.muted').textContent='Successful Charges';success.querySelector('small').textContent='All successful recurring charges';}
    const fresh=block.querySelector('[onclick*="\'new\'"]');if(fresh)fresh.querySelector('small').textContent='Started in the selected period';
    const renew=block.querySelector('[onclick*="renewed"]');if(renew)renew.querySelector('small').textContent='Repeat successful recurring charges';
  }
  function renderSubscriptionCards(r){
    const c=r?.cards||{};
    setText('#ucStatSubTotal',c.total||0);setText('#ucStatSubActive',c.active||0);setText('#ucStatSubSuccessful',c.successful||0);setText('#ucStatSubNew',c.new||0);setText('#ucStatSubRenewed',c.renewed||0);setText('#ucStatSubUpcoming',c.upcoming||0);setText('#ucStatSubFailed',c.failed||0);setText('#ucStatSubCancelled',c.cancelled||0);
  }
  window.applyUCSubscriptionOverview=async function(btn){
    ensureDashboardControls();const sel=$('#ucDashboardSubscriptionPeriod');const period=sel?.value||S.dashPeriod||'monthly';S.dashPeriod=period;
    const rnge=period==='daily'?presetRange('today'):period==='yearly'?presetRange('year'):presetRange('month');S.dashRange=rnge;
    const box=$('#ucSubscriptionOverviewMsg'),base=`/api/admin/subscription-overview?mode=cards&period=${ENC(period)}&from=${ENC(rnge.from)}&to=${ENC(rnge.to)}`;
    if(box)box.innerHTML=statusBox('Loading saved Subscription Overview data…','fetching',true);
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Fetching…';}
    let cachedShown=false;
    try{
      const cached=await api(`${base}&cache_only=1`);
      if(cached.cache_has_data){
        cachedShown=true;renderSubscriptionCards(cached);S.lastCardSig=JSON.stringify(cached.cards||{});
        if(box)box.innerHTML=statusBox(`${gatewayNote(cached)} Fetching the latest information from the enabled Payment Gateway in the background…`,'fetching',true);
      }else if(cached.configured===false){
        renderSubscriptionCards(cached);if(box)box.innerHTML=statusBox(gatewayNote(cached),'warn');
      }else if(box)box.innerHTML=statusBox('No saved Subscription Overview data is available yet. Fetching the enabled Payment Gateway now…','fetching',true);
    }catch(_){if(box)box.innerHTML=statusBox('Fetching subscription information from the enabled Payment Gateway. Please wait…','fetching',true);}
    try{
      const r=await api(base),sig=JSON.stringify(r.cards||{}),unchanged=!!S.lastCardSig&&S.lastCardSig===sig;S.lastCardSig=sig;renderSubscriptionCards(r);
      if(box){let text=gatewayNote(r);if(r.configured!==false)text+=` ${period==='daily'?"Today's":period==='yearly'?"This year's":"This month's"} results are shown in the boxes below.`;if(unchanged&&r.configured!==false)text+=' No subscription values changed since the saved/latest view.';box.innerHTML=statusBox(text,r.configured===false?'warn':'ok');}
      if(r.truncated?.length&&box)box.insertAdjacentHTML('beforeend',statusBox(`Some gateway results reached the dashboard fetch limit: ${r.truncated.join(', ')}.`,'warn'));
    }catch(e){
      if(box)box.innerHTML=statusBox(cachedShown?`Saved Subscription Overview data is still shown. Live refresh could not be completed: ${e.message||'Please try again.'}`:(e.message||'Could not fetch subscription information.'),cachedShown?'warn':'error');
      toast(e.message||'Subscription fetch failed.',true);
    }finally{if(btn){btn.disabled=false;btn.textContent=old||'Apply';}}
  };
  window.loadUCSubscriptionOverview=async function(){ensureDashboardControls();if($('#ucDashboardSubscriptionPeriod'))$('#ucDashboardSubscriptionPeriod').value=S.dashPeriod||'monthly';return window.applyUCSubscriptionOverview($('#ucDashboardSubscriptionApply'));};
  window.refreshUCSubscriptionOverview=window.applyUCSubscriptionOverview;

  /* ---------------- Unified modal for every subscription card ---------------- */
  function ensureSubModal(){
    let m=$('#ucMultiSubscriptionModal');if(m)return m;
    m=document.createElement('div');m.id='ucMultiSubscriptionModal';m.className='modal uc-multi-sub-modal';m.innerHTML=`<div class="modal-card wide uc-multi-sub-card"><div class="top uc-sub-modal-head"><div><h2 id="ucMultiSubTitle">Subscriptions</h2><p id="ucMultiSubDesc" class="muted">Review subscription records for a selected period.</p></div><button class="btn secondary compact" type="button" onclick="closeUCMultiSubscriptionModal()">Close</button></div><div class="uc-multi-sub-filters"><div class="field"><label>Period</label><select id="ucMultiSubPreset" onchange="ucMultiSubPresetChanged()"><option value="today">Today</option><option value="month" selected>This Month</option><option value="year">This Year</option><option value="last_month">Last Month</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Date Range</option></select></div><div class="field"><label>From Date</label><input id="ucMultiSubFrom" type="date"></div><div class="field"><label>To Date</label><input id="ucMultiSubTo" type="date"></div><div class="field"><label>View</label><select id="ucMultiSubView"><option value="daily">Daily Subscriptions</option><option value="total">Period Total</option></select></div><button id="ucMultiSubApply" class="btn compact" type="button" onclick="applyUCMultiSubscriptionList(this)">Apply</button></div><div id="ucMultiSubStatus"></div><div id="ucMultiSubBody"></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCMultiSubscriptionModal=()=>$('#ucMultiSubscriptionModal')?.classList.remove('open');
  window.ucMultiSubPresetChanged=function(){const p=$('#ucMultiSubPreset')?.value||'month';if(p==='custom')return;const r=presetRange(p);if($('#ucMultiSubFrom'))$('#ucMultiSubFrom').value=r.from;if($('#ucMultiSubTo'))$('#ucMultiSubTo').value=r.to;};
  function previousBillDate(r,type){if(Number(r.previous_bill_at||0))return r.previous_bill_at;if((type==='successful'||type==='renewed')&&r.date)return r.date;return'';}
  function previousBillLabel(r,type){const d=previousBillDate(r,type),amount=Number(r.previous_bill_amount_paise||0);if(!d&&!amount)return '—';const date=d?fmtDate(d):'Date unavailable';return amount?`${date} • ${money(amount)}`:date;}
  function modeLabel(v){return String(v||'subscription').toLowerCase()==='one_time'?'One-Time':'Subscription';}
  function paymentMethodLabel(r){
    const raw=String(r?.payment_method_label||r?.payment_method||'').trim();if(!raw)return '—';
    const key=raw.toLowerCase().replace(/[\s_-]+/g,'');
    const labels={upi:'UPI',card:'Card',netbanking:'Net Banking',bank:'Bank',wallet:'Wallet',emandate:'eMandate',nach:'NACH',autopay:'AutoPay',banktransfer:'Bank Transfer',paylater:'Pay Later'};
    return labels[key]||raw.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }
  function upiIdLabel(r){const method=String(r?.payment_method||r?.payment_method_label||'').toLowerCase();return method.includes('upi')?String(r?.upi_id||'—'):'—';}
  function rowStatus(r,type){if(type==='successful'||type==='renewed')return 'Successful';return r.status_label||r.status||'—';}
  function renderSubscriptionGrid(rows,type,view){
    const head=`<div class="uc-multi-sub-grid uc-multi-sub-head"><div>Customer</div><div>Email</div><div>Phone</div><div>Gateway</div><div>Plan / Offer</div><div>Payment Type</div><div>Payment Mode</div><div>UPI ID</div><div>Amount</div><div>Status</div><div>Previous Bill</div><div>Next Charge</div><div>Next Amount</div><div>Total Cycles</div><div>Paid Cycles</div><div>Remaining</div><div>Attempts / Note</div></div>`;
    const body=rows.length?rows.map(r=>{
      const plan=[r.plan_name||'Membership',r.offer_name?`Offer: ${r.offer_name}`:''].filter(Boolean).join(' • '),total=Number(r.total_count||0),paid=Number(r.paid_count||0),remaining=r.remaining_count===undefined||r.remaining_count===null?(total?Math.max(0,total-paid):0):Number(r.remaining_count||0),attempt=Number(r.auth_attempts||0),note=r.reason||((type==='upcoming')?'Scheduled within next 30 days':'');
      const nextAt=Number(r.next_charge_at||r.charge_at||0),nextAmount=Number(r.next_charge_amount_paise||r.amount_paise||0),terminal=['cancelled','canceled','completed','expired','revoked'].includes(String(r.status||'').toLowerCase());
      const localRef=String(r.client_ref||'').startsWith('lead:')?String(r.client_ref):'';
      const customer=localRef?`<button type="button" class="uc-sub-customer-link" title="Open Client Details" onclick="openClientDetails('${H(localRef)}')">${H(r.name||'Subscriber')}</button>`:`<strong>${H(r.name||'Subscriber')}</strong>`;
      return `<div class="uc-multi-sub-grid uc-multi-sub-row"><div>${customer}<small>${H(r.order_id||r.subscription_id||'')}</small></div><div class="uc-wrap-cell">${H(r.email||'—')}</div><div class="uc-nowrap-cell">${H(r.phone||'—')}</div><div><span class="uc-pg-chip ${H(r.gateway||'')}">${H(r.gateway_label||r.gateway||'Payment Gateway')}</span></div><div class="uc-wrap-cell">${H(plan)}</div><div class="uc-nowrap-cell">${H(modeLabel(r.payment_mode))}</div><div class="uc-nowrap-cell">${H(paymentMethodLabel(r))}</div><div class="uc-nowrap-cell">${H(upiIdLabel(r))}</div><div class="uc-nowrap-cell">${money(r.amount_paise||0)}</div><div><span class="uc-sub-status ${H(r.status||'neutral')}">${H(rowStatus(r,type))}</span></div><div class="uc-nowrap-cell">${H(previousBillLabel(r,type))}</div><div class="uc-nowrap-cell">${terminal||!nextAt?'—':H(fmtDate(nextAt))}</div><div class="uc-nowrap-cell">${terminal||!nextAmount?'—':money(nextAmount)}</div><div class="uc-nowrap-cell">${total||'—'}</div><div class="uc-nowrap-cell">${paid||0}</div><div class="uc-nowrap-cell">${total?remaining:'—'}</div><div class="uc-wrap-cell">${attempt?`${attempt} attempt(s)`:''}${attempt&&note?' • ':''}${H(note||'—')}</div></div>`;
    }).join(''):`<div class="uc-multi-sub-grid uc-multi-sub-row uc-grid-empty"><div class="uc-grid-empty-message">No matching records were returned for this period. The table structure remains visible for review.</div></div>`;
    const amount=rows.reduce((a,r)=>a+Number(r.amount_paise||0),0);
    const summary=view==='total'?`<div class="uc-period-summary"><div><strong>${rows.length}</strong><small>Records in period</small></div><div><strong>${money(amount)}</strong><small>Recorded amount</small></div><div><strong>${H(TYPES[type]||'Subscriptions')}</strong><small>Selected view</small></div></div>`:'';
    return `${summary}<div class="uc-multi-sub-grid-wrap">${head}${body}</div>`;
  }
  window.applyUCMultiSubscriptionList=async function(btn){
    const type=S.modalType||'total',from=$('#ucMultiSubFrom')?.value,to=$('#ucMultiSubTo')?.value,view=$('#ucMultiSubView')?.value||'daily',status=$('#ucMultiSubStatus'),body=$('#ucMultiSubBody');
    if(!from||!to){toast('Choose both From Date and To Date.',true);return;}
    const base=`/api/admin/subscription-overview?mode=list&filter=${ENC(type)}&period=custom&from=${ENC(from)}&to=${ENC(to)}`;
    if(status)status.innerHTML=statusBox('Loading saved Subscription Overview data…','fetching',true);if(body)body.innerHTML=renderSubscriptionGrid([],type,view);
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Fetching…';}
    let cachedShown=false;
    try{
      const cached=await api(`${base}&cache_only=1`),cachedRows=cached.rows||[];
      if(cached.cache_has_data||cachedRows.length){cachedShown=true;if(body)body.innerHTML=renderSubscriptionGrid(cachedRows,type,view);if(status)status.innerHTML=statusBox(`${gatewayNote(cached)} Fetching the latest enabled-gateway information now…`,'fetching',true);}
      else if(cached.configured===false){if(status)status.innerHTML=statusBox(gatewayNote(cached),'warn');}
      else if(status)status.innerHTML=statusBox('No saved records are available for this view yet. Fetching the enabled Payment Gateway now…','fetching',true);
    }catch(_){if(status)status.innerHTML=statusBox('Fetching information from the enabled Payment Gateway. Please wait…','fetching',true);}
    try{
      const r=await api(base);if(status)status.innerHTML=statusBox(gatewayNote(r),r.configured===false?'warn':'ok');if(body)body.innerHTML=renderSubscriptionGrid(r.rows||[],type,view);
    }catch(e){
      if(status)status.innerHTML=statusBox(cachedShown?`Saved records are still shown. Live refresh could not be completed: ${e.message||'Please try again.'}`:(e.message||'Could not fetch subscription details.'),cachedShown?'warn':'error');
      if(body&&!cachedShown)body.innerHTML=renderSubscriptionGrid([],type,view);
    }finally{if(btn){btn.disabled=false;btn.textContent=old||'Apply';}}
  };
  window.openUCSubscriptionList=function(type='total'){
    S.modalType=type;const m=ensureSubModal();setText('#ucMultiSubTitle',TYPES[type]||'Subscriptions');
    const desc={successful:'Successful Charges includes every successful recurring charge in the selected period. Renewals are the repeat charges after the first successful charge.',new:'Subscriptions created in the selected period.',renewed:'Successful recurring charges after the first charge.',failed:'Failed or payment-attention subscription events in the selected period.',upcoming:'Upcoming renewal charges are always checked for the next 30 days.'};
    setText('#ucMultiSubDesc',desc[type]||'Review subscription records for the selected period.');
    const dashSel=$('#ucDashboardSubscriptionPeriod')?.value||S.dashPeriod||'monthly',preset=dashSel==='daily'?'today':dashSel==='yearly'?'year':'month';$('#ucMultiSubPreset').value=preset;window.ucMultiSubPresetChanged();m.classList.add('open');window.applyUCMultiSubscriptionList($('#ucMultiSubApply'));
  };
  window.openUCSubscriptionAnalytics=()=>window.openUCSubscriptionList('total');
  window.refreshUCSubscriptionList=btn=>window.applyUCMultiSubscriptionList(btn);

  /* ---------------- Checkout mode live behaviour ---------------- */
  function syncCheckoutMode(){
    const form=$('#checkoutSettingsForm');if(!form)return;const mode=form.querySelector('[name="paymentMode"]')?.value||'subscription',years=form.querySelector('[name="subscriptionYears"]');if(!years)return;const field=years.closest('.field');if(field){field.hidden=mode==='one_time';field.classList.toggle('uc-field-hidden',mode==='one_time');}
  }
  document.addEventListener('change',e=>{if(e.target?.matches('#checkoutSettingsForm [name="paymentMode"]'))syncCheckoutMode();});
  const oldCheckoutLoad=window.load_checkoutSettings;
  if(typeof oldCheckoutLoad==='function')window.load_checkoutSettings=async function(){const r=await oldCheckoutLoad.apply(this,arguments);syncCheckoutMode();return r;};

  /* ---------------- Payment Gateways ---------------- */
  function paymentsMarkup(){return `<div class="top"><div><h1>Payments</h1><p class="muted">Choose one primary Payment Gateway. Optional fallbacks are used only if the primary link cannot be created.</p></div><button class="btn secondary compact" type="button" onclick="load_payments()">Refresh</button></div>
    <form id="ucPaymentGatewayForm" class="uc-payment-form" onsubmit="saveUCPaymentGateways(event)">
      <div class="uc-gateway-priority-note"><strong>Gateway order</strong><span>Recommended: Razorpay Primary → PhonePe Fallback → Stripe Fallback.</span><small>Only one gateway can be primary at a time. Fallback switches are available when Razorpay is primary.</small></div>
      <div class="uc-gateway-primary-picker">
        <label><input type="radio" name="primaryGateway" value="razorpay" onchange="syncUCGatewayPriority()"><span><strong>Razorpay</strong><small>Primary</small></span></label>
        <label><input type="radio" name="primaryGateway" value="phonepe" onchange="syncUCGatewayPriority()"><span><strong>PhonePe</strong><small>Primary</small></span></label>
        <label><input type="radio" name="primaryGateway" value="stripe" onchange="syncUCGatewayPriority()"><span><strong>Stripe</strong><small>Primary</small></span></label>
        <label><input type="radio" name="primaryGateway" value="" onchange="syncUCGatewayPriority()"><span><strong>Disabled</strong><small>No gateway</small></span></label>
      </div>
      <details class="card pay-detail" open><summary>Razorpay</summary><div class="form uc-gateway-fields"><div class="uc-gateway-state-line"><span class="uc-primary-badge" data-primary-badge="razorpay">Not Primary</span><small>Use Razorpay for regular subscription and one-time checkout when selected as Primary.</small></div><div class="row"><div class="field"><label>Razorpay Key ID</label><input name="razorpayKeyId"></div><div class="field"><label>Razorpay Key Secret <small id="ucRazorpaySecretHint" class="hint"></small></label><input name="razorpayKeySecret" type="password" placeholder="Leave blank to keep saved secret"></div></div><div class="field"><label>Razorpay Webhook Secret <small id="ucRazorpayWebhookHint" class="hint"></small></label><input name="razorpayWebhookSecret" type="password" placeholder="Leave blank to keep saved secret"></div><div class="copyline"><input id="ucRazorpayWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('ucRazorpayWebhookUrl')">Copy</button></div></div></details>
      <details class="card pay-detail" open><summary>PhonePe</summary><div class="form uc-gateway-fields"><div class="uc-gateway-state-line"><span class="uc-primary-badge" data-primary-badge="phonepe">Not Primary</span><label class="uc-fallback-check"><input id="ucPhonePeFallback" name="phonepeFallbackEnabled" type="checkbox"> Use PhonePe as fallback if Razorpay fails</label></div><div class="row"><div class="field"><label>Environment</label><select name="phonepeEnvironment"><option value="sandbox">Sandbox / UAT</option><option value="production">Production</option></select></div><div class="field"><label>Client ID</label><input name="phonepeClientId"></div><div class="field"><label>Client Version</label><input name="phonepeClientVersion" value="1"></div></div><div class="row"><div class="field"><label>Client Secret <small id="ucPhonePeSecretHint" class="hint"></small></label><input name="phonepeClientSecret" type="password" placeholder="Leave blank to keep saved secret"></div><div class="field"><label>Merchant ID <small class="hint">Required for partner integrations; optional for normal merchant setup.</small></label><input name="phonepeMerchantId"></div></div><div class="row"><div class="field"><label>Webhook Username <small class="hint">Use for SHA authentication.</small></label><input name="phonepeWebhookUsername" placeholder="Same username as PhonePe webhook settings"></div><div class="field"><label>Webhook Password <small id="ucPhonePeWebhookPasswordHint" class="hint"></small></label><input name="phonepeWebhookPassword" type="password" placeholder="Leave blank to keep saved password"></div></div><div class="row"><div class="field"><label>HMAC Webhook Secret <small id="ucPhonePeWebhookSecretHint" class="hint"></small></label><input name="phonepeWebhookSecret" type="password" placeholder="Optional: leave blank to keep saved secret"></div><div class="field"><label>HMAC Webhook ID / Key ID</label><input name="phonepeWebhookKeyId" placeholder="Optional: PhonePe webhook key ID"></div></div><div class="copyline"><input id="ucPhonePeWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('ucPhonePeWebhookUrl')">Copy</button></div><div class="uc-gateway-tech-note">PhonePe AutoPay supports documented mandate frequencies. If the requested recurring interval is not supported, the checkout keeps the original billing intent and moves to the next configured fallback instead of silently changing the plan.</div></div></details>
      <details class="card pay-detail"><summary>Stripe</summary><div class="form uc-gateway-fields"><div class="uc-gateway-state-line"><span class="uc-primary-badge" data-primary-badge="stripe">Not Primary</span><label class="uc-fallback-check"><input id="ucStripeFallback" name="stripeFallbackEnabled" type="checkbox"> Use Stripe as fallback after PhonePe</label></div><div class="row"><div class="field"><label>Stripe Publishable Key</label><input name="stripePublishableKey"></div><div class="field"><label>Stripe Secret Key <small id="ucStripeSecretHint" class="hint"></small></label><input name="stripeSecretKey" type="password" placeholder="Leave blank to keep saved secret"></div></div><div class="field"><label>Stripe Webhook Secret <small id="ucStripeWebhookHint" class="hint"></small></label><input name="stripeWebhookSecret" type="password" placeholder="Leave blank to keep saved secret"></div><div class="copyline"><input id="ucStripeWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('ucStripeWebhookUrl')">Copy</button></div></div></details>
      <details class="card pay-detail"><summary>WhatsApp Webhook & Order OTP</summary><div class="form uc-gateway-fields"><div class="field"><label>WhatsApp Webhook Verify Token <small id="ucWhatsappWebhookHint" class="hint"></small></label><input name="whatsappWebhookVerifyToken" type="password" placeholder="Leave blank to keep saved token"></div><div class="copyline"><input id="ucWhatsappWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('ucWhatsappWebhookUrl')">Copy</button></div><div class="row"><div class="field"><label>OTP Provider</label><select name="otpProvider"><option value="whatsapp_cloud">WhatsApp Cloud API</option><option value="green_api">GAPI</option></select></div><div class="field"><label>WhatsApp Phone Number ID</label><input name="whatsappPhoneNumberId"></div></div><div class="row"><div class="field"><label>WhatsApp Cloud Token <small id="ucWhatsappCloudHint" class="hint"></small></label><input name="whatsappCloudToken" type="password"></div><div class="field"><label>GAPI Instance ID</label><input name="greenApiInstanceId"></div><div class="field"><label>GAPI Token <small id="ucGreenHint" class="hint"></small></label><input name="greenApiToken" type="password"></div></div></div></details>
      <div class="uc-payment-savebar"><div id="paymentsMsg"></div><button class="btn compact" type="submit">Save Payment Gateways</button></div>
    </form>`;}
  function ensurePaymentsUI(){const p=$('#payments');if(!p)return null;if(!p.querySelector('#ucPaymentGatewayForm'))p.innerHTML=paymentsMarkup();return p;}
  function formSet(f,name,value){const e=f?.elements?.namedItem(name);if(e)e.value=value??'';}
  function hint(id,masked,label='secret'){const e=$(id);if(e)e.textContent=masked?`Saved: ${masked}`:`No ${label} saved yet.`;}
  window.syncUCGatewayPriority=function(){
    const f=$('#ucPaymentGatewayForm');if(!f)return;const primary=f.querySelector('[name="primaryGateway"]:checked')?.value||'',fallbackAllowed=primary==='razorpay';
    const pp=$('#ucPhonePeFallback'),st=$('#ucStripeFallback');[pp,st].forEach(x=>{if(x){x.disabled=!fallbackAllowed;if(!fallbackAllowed)x.checked=false;}});
    $$('[data-primary-badge]').forEach(b=>{const on=b.dataset.primaryBadge===primary;b.textContent=on?'Primary':'Not Primary';b.classList.toggle('active',on);});
    f.classList.toggle('fallbacks-enabled',fallbackAllowed);
  };
  window.load_payments=async function(){
    ensurePaymentsUI();const r=await api('/api/admin/integrations'),s=r.settings||{};S.payments=s;const f=$('#ucPaymentGatewayForm');if(!f)return;
    const primary=s.primaryGateway||(s.razorpayEnabled?'razorpay':s.phonepeEnabled?'phonepe':s.stripeEnabled?'stripe':'');const radio=f.querySelector(`[name="primaryGateway"][value="${primary}"]`)||f.querySelector('[name="primaryGateway"][value=""]');if(radio)radio.checked=true;
    formSet(f,'razorpayKeyId',s.razorpayKeyId);formSet(f,'phonepeEnvironment',s.phonepeEnvironment||'production');formSet(f,'phonepeClientId',s.phonepeClientId);formSet(f,'phonepeClientVersion',s.phonepeClientVersion||'1');formSet(f,'phonepeMerchantId',s.phonepeMerchantId);formSet(f,'phonepeWebhookUsername',s.phonepeWebhookUsername);formSet(f,'phonepeWebhookKeyId',s.phonepeWebhookKeyId);formSet(f,'stripePublishableKey',s.stripePublishableKey);formSet(f,'otpProvider',s.otpProvider||'whatsapp_cloud');formSet(f,'whatsappPhoneNumberId',s.whatsappPhoneNumberId);formSet(f,'greenApiInstanceId',s.greenApiInstanceId);
    $('#ucPhonePeFallback').checked=!!s.phonepeFallbackEnabled;$('#ucStripeFallback').checked=!!s.stripeFallbackEnabled;
    $('#ucRazorpayWebhookUrl').value=s.razorpayWebhookUrl||'';$('#ucPhonePeWebhookUrl').value=s.phonepeWebhookUrl||'';$('#ucStripeWebhookUrl').value=s.stripeWebhookUrl||'';$('#ucWhatsappWebhookUrl').value=s.whatsappWebhookUrl||'';
    hint('#ucRazorpaySecretHint',s.razorpayKeySecretMasked);hint('#ucRazorpayWebhookHint',s.razorpayWebhookSecretMasked,'webhook secret');hint('#ucPhonePeSecretHint',s.phonepeClientSecretMasked);hint('#ucPhonePeWebhookPasswordHint',s.phonepeWebhookPasswordMasked,'webhook password');hint('#ucPhonePeWebhookSecretHint',s.phonepeWebhookSecretMasked,'HMAC webhook secret');hint('#ucStripeSecretHint',s.stripeSecretKeyMasked);hint('#ucStripeWebhookHint',s.stripeWebhookSecretMasked,'webhook secret');hint('#ucWhatsappWebhookHint',s.whatsappWebhookVerifyTokenMasked,'verify token');hint('#ucWhatsappCloudHint',s.whatsappCloudTokenMasked,'token');hint('#ucGreenHint',s.greenApiTokenMasked,'token');window.syncUCGatewayPriority();
  };
  window.saveUCPaymentGateways=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f),primary=f.querySelector('[name="primaryGateway"]:checked')?.value||'',p=Object.fromEntries(fd.entries());
    p.primaryGateway=primary;p.razorpayEnabled=primary==='razorpay';p.phonepeEnabled=primary==='phonepe';p.stripeEnabled=primary==='stripe';p.phonepeFallbackEnabled=primary==='razorpay'&&$('#ucPhonePeFallback')?.checked;p.stripeFallbackEnabled=primary==='razorpay'&&$('#ucStripeFallback')?.checked;
    const btn=f.querySelector('button[type="submit"]'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Saving…';}
    try{const r=await api('/api/admin/integrations',{method:'POST',body:JSON.stringify(p)});const box=$('#paymentsMsg');if(box)box.innerHTML=statusBox(`Payment Gateway settings saved.${r.syncedPlans?` ${r.syncedPlans} Razorpay plan(s) synced.`:''}`,'ok');await window.load_payments();}
    catch(err){const box=$('#paymentsMsg');if(box)box.innerHTML=statusBox(err.message||'Could not save Payment Gateway settings.','error');}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Save Payment Gateways';}}
  };
  window.savePaymentBlock=window.saveUCPaymentGateways;

  /* Fix custom-link display when a gateway returns an absolute URL. */
  function usableLink(v){v=String(v||'');return /^https?:\/\//i.test(v)?v:(v?location.origin+v:'');}
  function paymentCreateHelp(err){
    const raw=String(err?.message||'').trim();
    if(/payment amount is required|subscription amount|phone number is required|name is required|email/i.test(raw))return raw;
    if(/not configured|no enabled payment gateway|enable.*gateway|credentials|key id|secret/i.test(raw))return `${raw} Check Settings → Integrations → Payments, confirm the required gateway is enabled and connected, then try again.`;
    return 'Payment request could not be created. Check Settings → Integrations → Payments and confirm an enabled payment gateway is connected. Then refresh this page and try again. If the gateway is already connected, review API Settings/Payment credentials before retrying.';
  }
  window.generateCustomSubscription=async function(e){e.preventDefault();const payload=Object.fromEntries(new FormData(e.target).entries()),box=$('#customSubscriptionMsg');if(box)box.innerHTML=statusBox('Creating subscription link through the selected Payment Gateway…','fetching',true);try{const r=await api('/api/admin/custom-subscription',{method:'POST',body:JSON.stringify(payload)}),link=usableLink(r.payment_link);box.innerHTML=`<div class="notice"><strong>Custom subscription created.</strong><br>Order ID: ${H(r.order_id)}<br>Payment Gateway: ${H((r.gateway||'').toUpperCase()||'—')}<br><div class="copyline"><input id="customPaymentLink" readonly value="${H(link)}"><button type="button" class="btn secondary small" onclick="copyValue('customPaymentLink')">Copy Link</button></div>${r.gateway_error?`<small>${H(r.gateway_error)}</small>`:''}</div>`;}catch(err){box.innerHTML=statusBox(paymentCreateHelp(err),'error');}};
  window.generateOneTimePayment=async function(e){e.preventDefault();const payload=Object.fromEntries(new FormData(e.target).entries()),box=$('#oneTimePaymentMsg');if(box)box.innerHTML=statusBox('Creating one-time payment link through the selected Payment Gateway…','fetching',true);try{const r=await api('/api/admin/custom-payment',{method:'POST',body:JSON.stringify(payload)}),link=usableLink(r.payment_link);box.innerHTML=`<div class="notice"><strong>One-time payment link created.</strong><br>Order ID: ${H(r.order_id)}<br>Payment Gateway: ${H((r.gateway||'').toUpperCase()||'—')}<br><div class="copyline"><input id="oneTimePaymentLink" readonly value="${H(link)}"><button type="button" class="btn secondary small" onclick="copyValue('oneTimePaymentLink')">Copy Link</button></div>${r.gateway_error?`<small>${H(r.gateway_error)}</small>`:''}</div>`;}catch(err){box.innerHTML=statusBox(paymentCreateHelp(err),'error');}};

  /* ---------------- Storage ---------------- */
  function formatBytes(n){n=Math.max(0,Number(n||0));if(n>=1073741824)return`${(n/1073741824).toFixed(2)} GB`;if(n>=1048576)return`${(n/1048576).toFixed(2)} MB`;if(n>=1024)return`${(n/1024).toFixed(1)} KB`;return`${Math.round(n)} B`;}
  function tone(p){p=Number(p||0);return p<20?'danger':p<40?'warn':p<60?'watch':'good';}
  function ensureStoragePanel(){let p=$('#storage');if(!p){p=document.createElement('section');p.id='storage';p.className='panel';$('main.main')?.appendChild(p);}return p;}
  function storageCard(c){const info=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="10.4" r="1.55" fill="currentColor"/><path d="M14.6 14.4h1.7v7.1c0 1 .45 1.5 1.45 1.5h.55" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;const back=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.3 10.8 9.6 15.5l4.7 4.7M10.3 15.5h7.1c3.3 0 5.1 1.7 5.1 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;return `<article class="uc-flip-card" data-storage-card="${H(c.key)}"><div class="uc-flip-inner"><div class="uc-flip-face uc-flip-front"><button class="uc-card-eye" type="button" title="About this cleanup category" aria-label="About this cleanup category" onclick="setUCStorageCardFlip('${H(c.key)}',true,event)">${info}</button><h3>${H(c.label)}</h3><div class="uc-storage-category-meta"><span data-zero-count="${H(c.key)}"><strong>${Number(c.count||0)}</strong><small>Eligible items</small></span><span><strong>${H(formatBytes(c.approx_bytes||0))}</strong><small>Approx. data</small></span></div><button class="btn secondary compact" type="button" onclick="openUCStorageCleanup('${H(c.key)}',this)">Review</button></div><div class="uc-flip-face uc-flip-back"><button class="uc-card-eye" type="button" title="Back to cleanup card" aria-label="Back to cleanup card" onclick="setUCStorageCardFlip('${H(c.key)}',false,event)">${back}</button><h3>${H(c.label)}</h3><p>${H(c.description||'')}</p><p class="uc-delete-warning">${H(c.warning||'Deleting eligible records is permanent and cannot be recovered.')}</p></div></div></article>`;}
  function renderStorage(r){
    S.storage=r;const p=ensureStoragePanel(),remain=Number(r.remaining_percent||0),used=Math.max(0,Math.min(100,Number(r.used_percent||0))),t=tone(remain);
    p.innerHTML=`<div class="top uc-storage-top"><div><h1>Storage</h1><p class="muted">Review available space and safely remove eligible old or expired records.</p></div><div id="ucStorageBattery" class="uc-storage-availability ${t}"><strong>${remain.toFixed(1)}%</strong><span>available</span></div></div><div class="uc-storage-hero"><div class="uc-storage-mobile-meter"><div class="uc-storage-mobile-track"><span class="uc-storage-used-segment" style="width:${used}%"></span></div><div class="uc-storage-meter-labels"><strong>${H(r.remaining_label)} available</strong><span>${remain.toFixed(1)}% remaining</span></div></div><div class="uc-storage-summary"><div><strong>${H(r.allocated_label)}</strong><small>Allocated</small></div><div><strong>${H(r.used_label)}</strong><small>Used</small></div><div><strong>${H(r.remaining_label)}</strong><small>Remaining</small></div></div><div class="uc-storage-upgrade"><p>Need more storage later? Contact Instautomate to upgrade the available capacity.</p><a class="btn secondary compact" href="https://instautomate.com" target="_blank" rel="noopener">Contact for Upgrade</a></div></div><div class="uc-storage-safe-note"><strong>Protected information stays protected.</strong><span> Current client, order, subscription, payment, refund and profile information is not offered for cleanup.</span></div><div class="uc-storage-cleanup-head"><div><h2>Safe Cleanup</h2><p class="muted">Only expired or old information that is eligible for safe cleanup is shown below.</p></div><button class="btn secondary compact" type="button" onclick="loadUCStorage(this)">Refresh</button></div><div class="uc-storage-category-grid">${(r.categories||[]).map(storageCard).join('')}</div>`;
  }
  window.setUCStorageCardFlip=function(key,flipped,event){event?.preventDefault?.();event?.stopPropagation?.();const card=$(`[data-storage-card="${CSS.escape(key)}"]`);if(!card)return;card.classList.toggle('flipped',!!flipped);const back=card.querySelector('.uc-flip-back');if(back)back.scrollTop=0;};
  window.flipUCStorageCard=function(key){const card=$(`[data-storage-card="${CSS.escape(key)}"]`);if(card)setUCStorageCardFlip(key,!card.classList.contains('flipped'));};
  window.loadUCStorage=async function(btn){ensureStoragePanel();const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Loading…';}try{renderStorage(await api('/api/admin/storage'));}catch(e){ensureStoragePanel().innerHTML=`<div class="error">${H(e.message||'Could not load storage information.')}</div>`;}finally{if(btn){btn.disabled=false;btn.textContent=old||'Refresh';}}};
  function ensureStorageModal(){let m=$('#ucStorageCleanupModal');if(!m){m=document.createElement('div');m.id='ucStorageCleanupModal';m.className='modal uc-storage-modal';document.body.appendChild(m);}m.innerHTML=`<div class="modal-card wide uc-storage-modal-card"><div class="top uc-sub-modal-head"><div><h2 id="ucStorageCleanupTitle">Safe Cleanup</h2><p id="ucStorageCleanupDesc" class="muted"></p></div><button class="btn secondary compact" type="button" onclick="closeUCStorageCleanup()">Close</button></div><div id="ucStorageCleanupWarning"></div><div id="ucStorageCleanupBody"></div></div>`;return m;}
  window.closeUCStorageCleanup=()=>$('#ucStorageCleanupModal')?.classList.remove('open');
  window.ucStorageSelectAll=checked=>$$('#ucStorageCleanupBody [data-storage-id]').forEach(x=>x.checked=checked);
  function renderCleanupRows(r){
    S.storageRows=r.rows||[];S.storageKey=r.key_field||'id';const body=$('#ucStorageCleanupBody');if(!body)return;
    const head=`<div class="uc-storage-list-grid uc-storage-list-head"><div>Select</div><div>Item</div><div>Details</div><div>Date</div><div>Approx. Size</div></div>`;
    const rows=S.storageRows.length?S.storageRows.map(x=>{const id=x[S.storageKey]??x.id??x.visitor_id??'';return `<div class="uc-storage-list-grid uc-storage-list-row"><div><input type="checkbox" data-storage-id="${H(id)}"></div><div class="uc-wrap-cell"><button class="uc-storage-item-link" type="button" onclick="openUCStorageItemDetail('${H(r.category)}','${H(String(id).replace(/'/g,"\\'"))}')">${H(x.title||'Item')}</button></div><div class="uc-wrap-cell">${H(x.detail||'—')}</div><div>${H(fmtDate(x.date_value))}</div><div>${H(x.approx_label||formatBytes(x.approx_bytes||0))}</div></div>`;}).join(''):`<div class="uc-storage-list-grid uc-storage-list-row uc-storage-empty-row"><div class="uc-grid-empty-message">No eligible items are available in this category.</div></div>`;
    body.innerHTML=`<div class="uc-storage-cleanup-toolbar"><label><input type="checkbox" onchange="ucStorageSelectAll(this.checked)"> Select all shown</label><span>Showing ${S.storageRows.length}</span></div><div class="uc-storage-list-wrap">${head}${rows}</div><div class="uc-storage-delete-actions"><button class="btn danger compact" type="button" onclick="confirmUCStorageDelete('selected')" ${S.storageRows.length?'':'disabled'}>Delete Selected</button><button class="btn danger compact" type="button" onclick="confirmUCStorageDelete('all')" ${S.storageRows.length?'':'disabled'}>Delete All Eligible</button></div>`;
  }
  window.openUCStorageCleanup=async function(category,btn){
    const def=S.storage?.categories?.find(x=>x.key===category);if(!def)await window.loadUCStorage().catch(()=>{});const latest=S.storage?.categories?.find(x=>x.key===category);
    if(!latest||Number(latest.count||0)===0){const tile=$(`[data-zero-count="${CSS.escape(category)}"]`);tile?.classList.remove('uc-zero-pulse');void tile?.offsetWidth;tile?.classList.add('uc-zero-pulse');toast('There are 0 eligible items to review in this category.');return;}
    S.storageCategory=category;const m=ensureStorageModal();setText('#ucStorageCleanupTitle',latest.label||'Safe Cleanup');setText('#ucStorageCleanupDesc',latest.description||'Review eligible records.');$('#ucStorageCleanupWarning').innerHTML=statusBox(latest.warning||'Deletion is permanent. Review each record before removing it.','warn');m.classList.add('open');$('#ucStorageCleanupBody').innerHTML=statusBox('Loading eligible records…','fetching',true);
    try{renderCleanupRows(await api(`/api/admin/storage?mode=list&category=${ENC(category)}`));}catch(e){$('#ucStorageCleanupBody').innerHTML=statusBox(e.message,'error');}
  };
  function ensureStorageDetailModal(){let m=$('#ucStorageItemDetailModal');if(m)return m;m=document.createElement('div');m.id='ucStorageItemDetailModal';m.className='modal uc-storage-detail-modal';m.innerHTML=`<div class="modal-card uc-storage-detail-card"><div class="top"><div><h2 id="ucStorageDetailTitle">Item Details</h2><p class="muted">Review the complete safe details before deciding whether to delete.</p></div><button class="btn secondary compact" type="button" onclick="closeUCStorageItemDetail()">Close</button></div><div id="ucStorageDetailBody"></div></div>`;document.body.appendChild(m);return m;}
  window.closeUCStorageItemDetail=()=>$('#ucStorageItemDetailModal')?.classList.remove('open');
  window.openUCStorageItemDetail=async function(category,id){const m=ensureStorageDetailModal();m.classList.add('open');$('#ucStorageDetailBody').innerHTML=statusBox('Loading record details…','fetching',true);try{const r=await api(`/api/admin/storage?mode=detail&category=${ENC(category)}&id=${ENC(id)}`);setText('#ucStorageDetailTitle',r.title||r.label||'Item Details');$('#ucStorageDetailBody').innerHTML=`<div class="uc-storage-detail-list">${(r.details||[]).map(([k,v])=>`<div><strong>${H(k)}</strong><span>${H(v??'—')}</span></div>`).join('')}</div><div class="uc-storage-detail-warning">${H(r.warning||'Deleting this eligible record is permanent and cannot be recovered.')}</div>`;}catch(e){$('#ucStorageDetailBody').innerHTML=statusBox(e.message,'error');}};
  function ensureConfirm(){let m=$('#ucStorageConfirmModal');if(!m){m=document.createElement('div');m.id='ucStorageConfirmModal';m.className='modal';document.body.appendChild(m);}m.innerHTML=`<div class="modal-card uc-storage-confirm-card"><h2>Confirm Permanent Delete</h2><div class="uc-storage-detail-warning"><strong>This action cannot be recovered.</strong><p id="ucStorageConfirmText"></p></div><div class="uc-storage-confirm-actions"><button class="btn secondary compact" type="button" onclick="closeUCStorageConfirm()">Cancel</button><button id="ucStorageConfirmDeleteBtn" class="btn danger compact" type="button">Delete Permanently</button></div></div>`;return m;}
  window.closeUCStorageConfirm=()=>$('#ucStorageConfirmModal')?.classList.remove('open');
  window.confirmUCStorageDelete=function(which){const ids=$$('#ucStorageCleanupBody [data-storage-id]:checked').map(x=>x.dataset.storageId).filter(Boolean);if(which==='selected'&&!ids.length){toast('Select at least one item first.',true);return;}const m=ensureConfirm();setText('#ucStorageConfirmText',which==='all'?'All currently eligible items in this category will be deleted permanently. Protected/current information is not included.':`${ids.length} selected eligible item(s) will be deleted permanently. Protected/current information is not included.`);const b=$('#ucStorageConfirmDeleteBtn');b.onclick=()=>deleteStorage(which,ids,b);m.classList.add('open');};
  async function deleteStorage(which,ids,btn){const old=btn.textContent;btn.disabled=true;btn.textContent='Deleting…';try{const r=await api('/api/admin/storage',{method:'POST',body:JSON.stringify({action:which==='all'?'delete_all':'delete_selected',category:S.storageCategory,ids})});window.closeUCStorageConfirm();renderStorage(r.storage);toast(`${Number(r.deleted||0)} item(s) deleted permanently${r.approx_cleared_label?` • about ${r.approx_cleared_label} cleared`:''}.`);const def=S.storage?.categories?.find(x=>x.key===S.storageCategory);if(def?.count)await window.openUCStorageCleanup(S.storageCategory);else window.closeUCStorageCleanup();}catch(e){toast(e.message||'Cleanup failed.',true);}finally{btn.disabled=false;btn.textContent=old;}}

  /* Dashboard payment copy should no longer imply only two fixed gateways. */
  function patchPaymentOverviewCopy(){const h2=$$('.dashboard-block h2').find(x=>x.textContent.trim()==='Payments Overview');const p=h2?.parentElement?.querySelector('.muted');if(p)p.textContent='Payment Gateway webhooks update these records after the enabled gateway integration is configured.';}

  /* API Settings lists the PhonePe webhook automatically from the backend. */
  const oldApiSettings=window.load_apiSettings;if(typeof oldApiSettings==='function')window.load_apiSettings=async function(){return oldApiSettings.apply(this,arguments);};

  function init(){ensureDashboardControls();ensureSubModal();ensurePaymentsUI();ensureStoragePanel();ensureStorageDetailModal();syncCheckoutMode();patchPaymentOverviewCopy();if($('#dashboard')?.classList.contains('active'))setTimeout(()=>window.loadUCSubscriptionOverview().catch(()=>{}),80);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,240));else setTimeout(init,240);
})();
