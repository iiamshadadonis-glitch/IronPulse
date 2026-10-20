/* Final CRM/refund/product-display touch-ups. Additive only. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyPaise=p=>INR.format(Number(p||0)/100);
  const statusBadge=s=>`<span class="status ${H(String(s||'').toLowerCase())}">${H(s||'-')}</span>`;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  function hintAfter(el,text,cls='uc-final-hint'){
    if(!el||el.parentElement?.querySelector(`.${cls}`))return;
    const x=document.createElement('small');x.className=`hint ${cls}`;x.textContent=text;el.insertAdjacentElement('afterend',x);
  }
  function formatDuration(ms){
    let sec=Math.max(0,Math.floor(Number(ms||0)/1000));
    const h=Math.floor(sec/3600);sec%=3600;const m=Math.floor(sec/60);const s=sec%60;
    const parts=[];if(h)parts.push(`${h} ${h===1?'hour':'hours'}`);if(m)parts.push(`${m} ${m===1?'minute':'minutes'}`);if(s||!parts.length)parts.push(`${s} ${s===1?'second':'seconds'}`);
    return parts.join(' ');
  }
  function dateTimeLocal(v){if(!v)return'';const d=new Date(String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return String(v).slice(0,16);const off=d.getTime()+330*60000;return new Date(off).toISOString().slice(0,16);}

  // ---------- Product Display spacing ----------
  function patchProductDisplaySpacing(){
    const panel=$('#placements');if(!panel)return;
    const section=$('#placementSection')?.closest('.field');
    if(section)section.classList.add('uc-placement-section-field');
    const actions=section?.nextElementSibling;
    if(actions?.classList.contains('form-actions'))actions.classList.add('uc-placement-actions');
  }

  // ---------- Refund helper text, autofill and transparent calculation ----------
  function ensureHidden(form,name){let i=form?.querySelector(`[name="${name}"]`);if(!i&&form){i=document.createElement('input');i.type='hidden';i.name=name;form.appendChild(i);}return i;}
  function ensureRefundSubscriptionField(form){
    if(!form)return null;
    let input=form.querySelector('[name="subscription_id"]');
    if(input)return input;
    const orderField=form.querySelector('[name="order_id"]')?.closest('.field');
    if(!orderField)return null;
    const field=document.createElement('div');field.className='field uc-refund-subscription-field';
    field.innerHTML='<label>Subscription ID Optional</label><input name="subscription_id" placeholder="sub_ / subscription reference"><small class="hint">Recurring subscription reference saved with the customer order. You can also find it from Customers → Subscribers or the lead/order details.</small>';
    orderField.insertAdjacentElement('afterend',field);
    const label=orderField.querySelector('label');if(label)label.textContent='Order ID Optional';
    return field.querySelector('input');
  }
  function ensureRefundBreakdown(form){
    if(!form)return null;
    let box=form.querySelector('.uc-refund-breakdown');
    if(!box){box=document.createElement('div');box.className='notice uc-refund-breakdown';box.hidden=true;const amt=form.querySelector('[name="amount_rupees"]')?.closest('.field');(amt||form).insertAdjacentElement('afterend',box);}
    return box;
  }
  function ensurePhonePeRefundCard(){
    const panel=$('#refunds');if(!panel||$('#phonepeRefundForm'))return;
    const manual=Array.from(panel.querySelectorAll('details.refund-detail')).find(x=>/Manual Refund/i.test(x.querySelector('summary')?.textContent||''));
    const d=document.createElement('details');d.className='card pay-detail refund-detail admin-clean-detail';d.innerHTML=`<summary>Refund through PhonePe</summary><div class="refund-search-block"><div class="field"><label>Search Order ID / Phone / Customer Name</label><input id="phonepeRefundSearch" placeholder="IronPulse Gym order ID, phone, customer name"></div><button class="btn compact refund-search-btn" type="button" onclick="searchRefundGateway('phonepe')">Search</button></div><div id="phonepeRefundResults"></div><form id="phonepeRefundForm" class="form below" onsubmit="submitGatewayRefund(event,'phonepe')"><div class="row"><div class="field"><label>Order ID</label><input name="order_id" placeholder="IronPulse Gym Order ID"></div><div class="field"><label>PhonePe Transaction / Refund Reference Optional</label><input name="payment_id" placeholder="Filled when available"></div></div><div class="field"><label>Refund Amount</label><input name="amount_rupees" type="number" min="1" step="0.01" placeholder="Enter amount in rupees"></div><div class="field"><label>Reason</label><textarea name="reason" rows="3" placeholder="Reason for refund"></textarea></div><div class="form-actions"><button class="btn compact">Initiate PhonePe Refund</button></div></form>`;
    (manual||panel.querySelector('#refundMsg')||null)?.insertAdjacentElement('beforebegin',d);
  }
  function patchRefundHelpers(){
    const panel=$('#refunds');if(!panel)return;ensurePhonePeRefundCard();
    ['razorpay','phonepe','stripe'].forEach(provider=>{
      const isStripe=provider==='stripe',isPhonePe=provider==='phonepe';
      const search=$(`#${provider}RefundSearch`);
      hintAfter(search,`Search using the saved Order ID, customer phone number, customer name, ${isStripe?'Stripe Payment Intent / Charge ID':isPhonePe?'PhonePe order reference':'Razorpay Payment ID'}, or subscription-related reference. Phone/name searches first find the saved website order, then use its stored gateway reference to fetch details.`);
      const form=$(`#${provider}RefundForm`);if(!form)return;
      ensureRefundSubscriptionField(form);
      const payment=form.querySelector('[name="payment_id"]');
      hintAfter(payment,isStripe?'This is the Stripe Payment Intent (pi_) or Charge ID (ch_). It is saved with the order after payment and can also be found from Orders / Subscribers.':isPhonePe?'PhonePe refunds are initiated against the original merchant Order ID; this reference is optional and is kept for audit/display when available.':'This is the Razorpay Payment ID (pay_...). It is saved with the order after payment and can also be found from Orders / Subscribers.');
      const order=form.querySelector('[name="order_id"]');
      hintAfter(order,'This is the IronPulse Gym website Order ID. Search normally fills it automatically. It can also be found in Orders, Subscribers or the customer lead details.');
      const amount=form.querySelector('[name="amount_rupees"]');
      hintAfter(amount,'After a successful search, this field is automatically filled with a suggested refund. You can change the final amount before initiating the refund.');
      const reason=form.querySelector('[name="reason"]');
      hintAfter(reason,'Write a clear reason or settlement note so the refund record can be understood later.');
      ensureHidden(form,'gross_amount_rupees');ensureHidden(form,'gateway_fee_rupees');ensureHidden(form,'platform_fee_rupees');ensureHidden(form,'platform_fee_percent');
      ensureRefundBreakdown(form);
      if(!form.dataset.ucRefundResetBound){form.dataset.ucRefundResetBound='1';form.addEventListener('reset',()=>{const b=form.querySelector('.uc-refund-breakdown');if(b){b.hidden=true;b.innerHTML='';}});}
    });
  }
  function renderRefundCalculation(provider,p,hasGateway){
    if(!p)return'';
    const gross=moneyPaise(p.grossAmountPaise), already=moneyPaise(p.alreadyRefundedPaise), avail=moneyPaise(p.availablePaise), gateway=moneyPaise(p.gatewayFeePaise), platform=moneyPaise(p.platformFeePaise), suggested=moneyPaise(p.suggestedRefundPaise);
    const gatewayLabel=provider==='razorpay'?'Razorpay payment fee shown':provider==='phonepe'?'PhonePe payment fee shown':'Stripe processing fee shown';
    return `<strong>Refund calculation</strong><div class="uc-refund-calc-grid"><span>Original / available payment</span><strong>${gross}</strong><span>Already refunded</span><strong>-${already}</strong><span>Available before deductions</span><strong>${avail}</strong><span>${gatewayLabel}</span><strong>-${gateway}${hasGateway?'':' *'}</strong><span>Platform refund handling (${Number(p.platformFeePercent||0)}%)</span><strong>-${platform}</strong><span>Suggested refund</span><strong>${suggested}</strong></div><small>* Gateway fee is shown only when the provider response contains it. The 5% platform handling deduction is your configured business-policy assumption, not a Payment Gateway fee; ensure your published Refund & Cancellation Policy and applicable law permit it. The admin may edit the final refund amount.</small>`;
  }
  window.searchRefundGateway=async function(provider){
    patchRefundHelpers();
    const input=$(`#${provider}RefundSearch`);const q=(input?.value||'').trim();
    const target=$(`#${provider}RefundResults`);if(!target)return;
    if(!q){target.innerHTML='<div class="error">Enter an Order ID, phone number, customer name, subscription reference or payment ID to search.</div>';return;}
    target.innerHTML='<div class="notice">Searching saved orders and payment gateway…</div>';
    try{
      const r=await api(`/api/admin/refunds?provider=${provider}&q=${encodeURIComponent(q)}`);const orders=r.orders||[];const o=orders[0]||null;const g=r.gatewayResult||null;const p=r.refundPreview||{};
      const form=$(`#${provider}RefundForm`);
      if(form){
        const payment=(g?.id||g?.orderId||g?.paymentDetails?.[0]?.transactionId||o?.gateway_payment_id||'');if(form.payment_id)form.payment_id.value=payment;
        if(form.order_id)form.order_id.value=o?.order_id||g?.order_id||g?.metadata?.order_id||'';
        if(form.subscription_id)form.subscription_id.value=o?.gateway_subscription_id||g?.subscription_id||g?.subscription||'';
        const amt=Number(p.suggestedRefundPaise||0)/100;if(form.amount_rupees)form.amount_rupees.value=amt>0?String(Number(amt.toFixed(2))):'';
        ensureHidden(form,'gross_amount_rupees').value=String(Number(p.grossAmountPaise||0)/100);
        ensureHidden(form,'gateway_fee_rupees').value=String(Number(p.gatewayFeePaise||0)/100);
        ensureHidden(form,'platform_fee_rupees').value=String(Number(p.platformFeePaise||0)/100);
        ensureHidden(form,'platform_fee_percent').value=String(Number(p.platformFeePercent||0));
        const calc=ensureRefundBreakdown(form);if(calc){calc.innerHTML=renderRefundCalculation(provider,p,!!g);calc.hidden=false;}
      }
      let html='';
      if(o)html+=`<div class="notice"><strong>Saved order found.</strong> Customer: ${H(o.customer_name||'-')} • Phone: ${H(o.website_phone||o.customer_phone||o.razorpay_phone||'-')} • Order: ${H(o.order_id||'-')} ${o.gateway_subscription_id?`• Subscription: ${H(o.gateway_subscription_id)}`:''}. Refund fields were filled automatically where data is available.</div>`;
      if(g)html+=`<div class="notice"><strong>Gateway payment verified:</strong> ${H(g.id||g.orderId||g.paymentDetails?.[0]?.transactionId||'Payment found')}. Review the refund calculation and reason before initiating the refund.</div>`;
      if(orders.length>1)html+=`<div class="table-wrap below"><table class="table fixed-table"><thead><tr><th>Order</th><th>Customer</th><th>Payment / Subscription</th><th>Amount</th><th>Status</th></tr></thead><tbody>${orders.slice(0,5).map(x=>`<tr><td>${H(x.order_id||'-')}</td><td>${H(x.customer_name||'-')}<br><small>${H(x.website_phone||x.customer_phone||'')}</small></td><td><small>${H(x.gateway_payment_id||'-')}</small><br><small>${H(x.gateway_subscription_id||'')}</small></td><td>${moneyPaise(x.amount_paise)}</td><td>${statusBadge(x.payment_status||x.status)}</td></tr>`).join('')}</tbody></table></div>`;
      if(!html)html=`<div class="notice">${H(r.message||'No matching payment found.')}</div>`;
      if(r.gatewayError)html+=`<div class="error">Gateway lookup: ${H(r.gatewayError)}</div>`;target.innerHTML=html;
    }catch(err){target.innerHTML=`<div class="error">${H(err.message||'Search failed.')}</div>`;}
  };

  window.submitGatewayRefund=async function(e,provider){
    e.preventDefault();const form=e.target,p=Object.fromEntries(new FormData(form).entries());p.provider=provider;
    const msg=$('#refundMsg');if(provider==='phonepe'&&!p.order_id){if(msg)msg.innerHTML='<div class="error">Search and select the saved Order ID before initiating a PhonePe refund.</div>';return;}
    if(provider==='razorpay'&&!p.payment_id){if(msg)msg.innerHTML='<div class="error">Razorpay Payment ID is required. Search the order first.</div>';return;}
    if(provider==='stripe'&&!/^(pi_|ch_)/.test(p.payment_id||'')){if(msg)msg.innerHTML='<div class="error">Stripe needs a Payment Intent (pi_) or Charge ID (ch_).</div>';return;}
    if(!p.amount_rupees){if(msg)msg.innerHTML='<div class="error">Enter the refund amount in rupees.</div>';return;}
    if(msg)msg.innerHTML='<div class="notice">Sending the refund request to the Payment Gateway…</div>';
    try{const r=await api('/api/admin/refunds',{method:'POST',body:JSON.stringify(p)});if(msg)msg.innerHTML=`<div class="notice success">${H(r.message||'Refund request saved.')}</div>`;form.reset();await load_refunds();}catch(err){if(msg)msg.innerHTML=`<div class="error">${H(err.message||'Refund failed.')}</div>`;}
  };

  // ---------- Lead CRM modal ----------
  function ensureLeadModal(){
    let m=$('#leadDetailModal');if(m)return m;
    m=document.createElement('div');m.id='leadDetailModal';m.className='modal';m.innerHTML=`<div class="modal-card wide uc-lead-modal-card"><div class="top"><div><h2>Lead Details</h2><p class="muted">Update contact information, follow-up, outcome and subscription references.</p></div><button class="btn secondary compact" type="button" onclick="document.getElementById('leadDetailModal').classList.remove('open')">Close</button></div><div id="leadVisitorSummary" class="uc-lead-summary"></div><form id="leadDetailForm" class="form"><input name="id" type="hidden"><div class="row"><div class="field"><label>Name</label><input name="name" maxlength="160"></div><div class="field"><label>WhatsApp Number</label><input name="phone" type="tel" inputmode="numeric" maxlength="15"><small class="hint">Saved number including country code. Use digits only; for India it is normally 91 followed by the 10-digit number.</small></div><div class="field"><label>Email</label><input name="email" type="email" placeholder="name@domain.com"></div></div><div class="row"><div class="field"><label>Lead Status</label><select name="status"><option value="new">New</option><option value="hot">Hot</option><option value="contacted">Contacted</option><option value="cold">Cold</option><option value="converted">Converted</option><option value="closed">Closed</option></select></div><div class="field"><label>Last Contact Method</label><select name="last_contact_method"><option value="">Not updated</option><option value="Call">Call</option><option value="WhatsApp">WhatsApp</option><option value="Email">Email</option><option value="Other">Other</option></select></div><div class="field"><label>Last Contacted</label><input name="last_contacted_at" type="datetime-local"></div></div><div class="row"><div class="field"><label>Follow-up Date</label><input name="follow_up_date" type="date"><small class="hint">This date drives Today's, Tomorrow's and Due Follow-ups on the dashboard.</small></div><div class="field"><label>Next Action</label><input name="next_action" maxlength="500" placeholder="Call about payment, WhatsApp plan details…"></div><div class="field"><label>Outcome</label><input name="outcome" maxlength="500" placeholder="Interested, requested callback, purchased…"></div></div><div class="row"><div class="field"><label>Purchase Type</label><select name="purchase_type"><option value="">Not decided</option><option value="Website Membership">Website Membership</option><option value="Customized Subscription">Customized Subscription</option><option value="No Purchase">No Purchase</option><option value="Other">Other</option></select></div><div class="field"><label>Sale Amount ₹</label><input name="sale_amount_rupees" type="number" min="0" step="0.01"></div><div class="field"><label>Custom Subscription Link</label><input name="custom_subscription_link" type="url" placeholder="https://..."></div></div><div class="row"><div class="field"><label>Order ID</label><input name="order_id"></div><div class="field"><label>Subscription ID</label><input name="gateway_subscription_id"></div><div class="field"><label>Payment ID</label><input name="gateway_payment_id"></div></div><div class="field"><label>Original Enquiry</label><textarea name="message" rows="3" readonly></textarea></div><div class="field"><label>Internal Follow-up Notes / Reason</label><textarea name="notes" rows="5" maxlength="5000" placeholder="Record what happened, customer preference, reason, next conversation details…"></textarea></div><div id="leadRelatedOrders" class="table-wrap"></div><div class="form-actions uc-lead-modal-actions"><button class="btn compact" type="submit">Save Lead Details</button><button class="btn danger compact" type="button" id="leadDeleteBtn">Delete Lead</button></div><div id="leadDetailMsg"></div></form></div>`;
    document.body.appendChild(m);
    const f=m.querySelector('#leadDetailForm');f.addEventListener('submit',saveLeadDetails);
    const phone=f.phone;phone.addEventListener('input',()=>{phone.value=phone.value.replace(/\D/g,'').slice(0,15);});
    m.querySelector('#leadDeleteBtn').addEventListener('click',()=>window.deleteLead(Number(f.id.value||0),true));
    return m;
  }
  function renderRelatedOrders(rows){
    if(!rows?.length)return '<div class="notice">No linked order was found for this lead yet. You can still save a custom Order ID / Subscription ID above.</div>';
    return `<h3>Related Orders / Payments</h3><table class="table fixed-table"><thead><tr><th>Order</th><th>Payment</th><th>Subscription</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows.map(o=>`<tr><td><button type="button" class="link-button" onclick="openOrderDetails('${H(o.order_id)}')">${H(o.order_id||'-')}</button></td><td><small>${H(o.gateway_payment_id||'-')}</small></td><td><small>${H(o.gateway_subscription_id||'-')}</small></td><td>${moneyPaise(o.amount_paise)}</td><td>${statusBadge(o.payment_status||o.status)}</td></tr>`).join('')}</tbody></table>`;
  }
  window.openLeadEditor=async function(id){
    const m=ensureLeadModal(), f=m.querySelector('#leadDetailForm');m.classList.add('open');m.querySelector('#leadDetailMsg').innerHTML='<div class="notice">Loading lead details…</div>';
    try{
      const r=await api('/api/admin/leads?id='+encodeURIComponent(id));const l=r.lead||{};
      f.id.value=l.id||id;f.name.value=l.name||'';f.phone.value=String(l.phone||'').replace(/\D/g,'');f.email.value=l.email||'';f.status.value=l.status||'new';f.last_contact_method.value=l.last_contact_method||'';f.last_contacted_at.value=dateTimeLocal(l.last_contacted_at);f.follow_up_date.value=l.follow_up_date||'';f.next_action.value=l.next_action||'';f.outcome.value=l.outcome||'';f.purchase_type.value=l.purchase_type||'';f.sale_amount_rupees.value=Number(l.sale_amount_paise||0)/100||'';f.custom_subscription_link.value=l.custom_subscription_link||'';f.order_id.value=l.order_id||'';f.gateway_subscription_id.value=l.gateway_subscription_id||'';f.gateway_payment_id.value=l.gateway_payment_id||'';f.message.value=l.message||'';f.notes.value=l.notes||'';
      const pages=String(l.visited_pages||'').split(',').filter(Boolean);
      m.querySelector('#leadVisitorSummary').innerHTML=`<span class="status">${Number(l.visit_count||0)} website visits</span><span class="status">Time spent: ${H(formatDuration(l.time_spent_ms||0))}</span>${l.first_visit?`<span class="status">First visit: ${H(l.first_visit)}</span>`:''}${l.last_visit?`<span class="status">Last visit: ${H(l.last_visit)}</span>`:''}${pages.map(p=>`<span class="status">${H(p)}</span>`).join('')}`;
      m.querySelector('#leadRelatedOrders').innerHTML=renderRelatedOrders(r.orders||[]);m.querySelector('#leadDetailMsg').innerHTML='';
    }catch(err){m.querySelector('#leadDetailMsg').innerHTML=`<div class="error">${H(err.message||'Could not load lead details.')}</div>`;}
  };
  async function saveLeadDetails(e){
    e.preventDefault();const f=e.currentTarget;const p=Object.fromEntries(new FormData(f).entries());
    if(p.last_contact_method&&!p.last_contacted_at){const now=new Date(Date.now()+330*60000).toISOString().slice(0,16);p.last_contacted_at=now;f.last_contacted_at.value=now;}
    try{const r=await api('/api/admin/leads',{method:'PUT',body:JSON.stringify(p)});$('#leadDetailMsg').innerHTML=`<div class="notice success">${H(r.message||'Lead details updated successfully.')}</div>`;await Promise.allSettled([load_dashboard(),window.load_leads?load_leads(window.__leadStatus||''):Promise.resolve()]);if(window.__ucDashboardListType)await openDashboardList(window.__ucDashboardListType);}
    catch(err){$('#leadDetailMsg').innerHTML=`<div class="error">${H(err.message||'Lead could not be updated.')}</div>`;}
  }
  window.deleteLead=async function(id,fromModal=false){
    if(!id)return;
    if(!confirm('Permanently delete this lead and its linked website-visitor tracking? This cannot be undone. Existing financial order/payment records are kept for accounting safety.'))return;
    try{await api('/api/admin/leads?id='+encodeURIComponent(id),{method:'DELETE'});if(fromModal)$('#leadDetailModal')?.classList.remove('open');await Promise.allSettled([load_dashboard(),window.load_leads?load_leads(window.__leadStatus||''):Promise.resolve()]);if(window.__ucDashboardListType)await openDashboardList(window.__ucDashboardListType);}
    catch(err){alert(err.message||'Lead could not be deleted.');}
  };

  // Dashboard cards/lists with visit time and editable lead cards.
  window.openDashboardList=async function(type){
    window.__ucDashboardListType=type;const res=await api('/api/admin/dashboard-list?type='+encodeURIComponent(type));
    const titles={totalLeads:'Total Leads',hotLeads:'Hot Leads',activeSubscriptions:'Active Subscribers',recentLeads:'Recent Leads',todayFollowups:"Today's Follow-ups",tomorrowFollowups:"Tomorrow's Follow-ups",totalFollowupsDue:'Follow-ups Due',pendingCollections:'Pending Collections'};
    $('#listModalTitle').textContent=titles[type]||'Dashboard List';const rows=res.rows||[];
    $('#dashboardListBox').innerHTML=rows.length?`<div class="list-grid">${rows.map(r=>{
      if(r.id){const pages=String(r.visited_pages||'').split(',').filter(Boolean).slice(0,8);return `<div class="lead-card lead-card-clickable" role="button" tabindex="0" onclick="openLeadEditor(${Number(r.id)})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openLeadEditor(${Number(r.id)})}"><h3>${H(r.name||'-')}</h3><p class="muted">${H(r.phone||'')} ${r.email?`• ${H(r.email)}`:''}</p>${r.message?`<p>${H(r.message)}</p>`:''}<p class="uc-card-badges"><span class="status">${Number(r.visit_count||0)} website visits</span><span class="status">Time spent: ${H(formatDuration(r.time_spent_ms||0))}</span></p>${pages.length?`<p>${pages.map(p=>`<span class="status">${H(p)}</span>`).join(' ')}</p>`:''}<small>${H(r.status||'new')}${r.follow_up_date?` • Follow-up ${H(r.follow_up_date)}`:''}</small><div class="uc-open-note">Click to view / edit lead details</div></div>`;}
      return `<div class="lead-card lead-card-clickable" role="button" tabindex="0" onclick="${r.order_id?`openOrderDetails('${H(r.order_id)}')`:''}"><h3>${H(r.customer_name||r.order_id||'-')}</h3><p class="muted">${H(r.customer_phone||'')} ${r.customer_email?`• ${H(r.customer_email)}`:''}</p>${r.amount_paise?`<p><strong>${moneyPaise(r.amount_paise)}</strong></p>`:''}<small>${H(r.status||'')} ${r.payment_status?`• ${H(r.payment_status)}`:''}</small>${r.gateway_subscription_id?`<p><small>Subscription: ${H(r.gateway_subscription_id)}</small></p>`:''}</div>`;
    }).join('')}</div>`:'<div class="notice">No records found yet.</div>';$('#listModal').classList.add('open');
  };
  function patchDashboardFollowups(){
    const today=$('#statTodayFollowups')?.closest('.card'),tomorrow=$('#statTomorrowFollowups')?.closest('.card'),due=$('#statDueFollowups')?.closest('.card');
    [[today,'todayFollowups'],[tomorrow,'tomorrowFollowups'],[due,'totalFollowupsDue']].forEach(([el,type])=>{if(!el)return;el.classList.add('clickable');el.setAttribute('role','button');el.tabIndex=0;el.onclick=()=>openDashboardList(type);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDashboardList(type);}};});
  }

  // Enquiries: clean edit/delete actions. All lifecycle changes happen in the editor.
  function leadTable(rows){
    return `<table class="table fixed-table lead-table"><thead><tr><th>Lead</th><th>Contact</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.length?rows.map(l=>`<tr><td class="text-cell"><button class="link-button" type="button" onclick="openLeadEditor(${Number(l.id)})"><strong>${H(l.name||'-')}</strong></button><br><small>${H(l.created_at||'')}</small></td><td>${H(l.phone||'')}<br><small>${H(l.email||'')}</small></td><td class="text-cell">${H(l.message||'')}<br><small>${H(l.source_detail||'')}</small></td><td>${statusBadge(l.status)}</td><td class="uc-lead-action-cell"><div class="uc-lead-actions"><button class="btn secondary small icon-action" type="button" title="Edit lead" aria-label="Edit lead" onclick="openLeadEditor(${Number(l.id)})">✎</button><button class="btn danger small icon-action" type="button" title="Delete lead" aria-label="Delete lead" onclick="deleteLead(${Number(l.id)})">×</button></div></td></tr>`).join(''):'<tr class="empty-row"><td colspan="5">No contact leads found yet.</td></tr>'}</tbody></table>`;
  }
  window.load_leads=async function(status=''){window.__leadStatus=status||'';const res=await api('/api/admin/leads'+(status?`?status=${encodeURIComponent(status)}`:''));A.leads=res.leads||[];const box=$('#leadsTable');if(box)box.innerHTML=leadTable(A.leads);try{const b=document.querySelector('[data-tab="leads"] .nav-badge');if(b){b.hidden=true;b.textContent='';}localStorage.setItem('uc_seen_leads',JSON.stringify((A.leads||[]).map(x=>String(x.id||x.phone||x.created_at))));}catch{};};

  // Subscriber name opens a compact record with saved gateway/order references.
  function ensureSubscriberModal(){let m=$('#subscriberDetailModal');if(m)return m;m=document.createElement('div');m.id='subscriberDetailModal';m.className='modal';m.innerHTML='<div class="modal-card wide"><div class="top"><h2>Subscriber Details</h2><button class="btn secondary compact" type="button" onclick="document.getElementById(\'subscriberDetailModal\').classList.remove(\'open\')">Close</button></div><div id="subscriberDetailBox"></div></div>';document.body.appendChild(m);return m;}
  window.openSubscriberDetails=async function(id){const s=(A.subscribers||[]).find(x=>Number(x.id)===Number(id));if(!s)return;const m=ensureSubscriberModal();m.classList.add('open');const box=$('#subscriberDetailBox');box.innerHTML='<div class="notice">Loading subscriber records…</div>';try{const q=s.phone||s.email||s.gateway_subscription_id||'';const r=await api('/api/admin/orders?q='+encodeURIComponent(q));const rows=r.orders||[];box.innerHTML=`<div class="uc-subscriber-summary"><p><strong>${H(s.name||'-')}</strong></p><p>${H(s.phone||'-')} ${s.email?`• ${H(s.email)}`:''}</p><p>Plan: ${H(s.plan_name||'-')} • Status: ${H(s.subscription_status||'-')}</p><p>Saved Subscription ID: <strong>${H(s.gateway_subscription_id||'-')}</strong></p></div>${renderRelatedOrders(rows)}`;}catch(err){box.innerHTML=`<div class="error">${H(err.message||'Could not load subscriber details.')}</div>`;}};
  function patchSubscriberNames(){
    const active=A.activeSubscribers||[];const table=$('#subscribersTable table');if(table){Array.from(table.tBodies?.[0]?.rows||[]).forEach((tr,i)=>{const s=active[i];if(s&&tr.cells[0])tr.cells[0].innerHTML=`<button type="button" class="link-button" onclick="openSubscriberDetails(${Number(s.id)})">${H(s.name||'-')}</button>`;});}
  }
  const oldLoadSubscribers=window.load_subscribers;if(typeof oldLoadSubscribers==='function')window.load_subscribers=async function(){const r=await oldLoadSubscribers.apply(this,arguments);setTimeout(patchSubscriberNames,40);return r;};

  function patchAll(){patchProductDisplaySpacing();patchRefundHelpers();patchDashboardFollowups();}
  const oldTab=window.tab;window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(patchAll,80);setTimeout(patchAll,350);return r;};
  ready(()=>{patchAll();ensureLeadModal();const obs=new MutationObserver(()=>{clearTimeout(window.__ucFinalTouchTimer);window.__ucFinalTouchTimer=setTimeout(patchAll,80);});obs.observe(document.body,{childList:true,subtree:true});});
})();
