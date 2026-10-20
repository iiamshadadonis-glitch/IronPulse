/* V16.5 — dynamic order OTP channel, actionable verification buttons, retry-to-current-checkout and customer prefills. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MONEY=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2});
  let OTP={channel:'none'};
  let ORDERS=[];
  const INVOICE_DOWNLOADS=new Map();
  async function api(path,opts={}){const res=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Request failed.');return data;}
  function busy(btn,on,text){if(!btn)return;if(on){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=text;btn.setAttribute('aria-busy','true');}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;btn.removeAttribute('aria-busy');}}
  function msg(text,type='notice'){const box=$('#trackMsg');if(!box)return;box.innerHTML=`<div class="notice ${type==='success'?'success':type==='error'?'error':''}">${H(text)}</div>`;}
  function orderMsg(text,type='success'){const box=$('#ordersActionMsg');if(!box)return;box.innerHTML=text?`<div class="notice ${type==='success'?'success':type==='error'?'error':''}">${H(text)}</div>`:'';}
  function resetActionButton(btn,label){if(!btn)return;btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent=label;delete btn.dataset.oldText;}
  function numericPhoneInputs(root=document){root.querySelectorAll('input[name],input[id]').forEach(input=>{const key=`${input.name||''} ${input.id||''}`.toLowerCase();if(!/(^|\s)(phone|mobile|whatsapp)|phone|mobile|whatsapp/.test(key))return;if(input.type==='email'||input.type==='number')return;input.type='tel';input.inputMode='numeric';input.autocomplete=input.autocomplete||'tel-national';if(!input.getAttribute('pattern'))input.setAttribute('pattern','[0-9]*');});}

  async function loadOtpSettings(){try{OTP=await api('/api/public/order-otp-settings');}catch(_){OTP={channel:'none'};}return OTP;}
  function renderTrackForm(){
    const legal=$('.legal');if(!legal)return;
    const form=$('.form',legal),lead=legal.querySelector('h1 + p');if(!form)return;
    const email=OTP.channel==='email',wa=OTP.channel==='whatsapp';
    if(lead)lead.textContent=email?'Enter the email address used during checkout. A verification code will be sent by email before showing private order details.':wa?'Enter the WhatsApp number used during checkout. A verification code will be sent to WhatsApp before showing private order details.':'Order verification is temporarily unavailable. Please use the Contact page and the admin will help you with your order.';
    form.innerHTML=`<div class="field"><label>${email?'Email ID':'WhatsApp Number'}</label><input id="trackIdentity" ${email?'type="email" inputmode="email" autocomplete="email" placeholder="name@gmail.com"':'type="tel" inputmode="numeric" autocomplete="tel-national" pattern="[0-9]*" placeholder="919381521966"'}></div><button id="trackSendOtp" class="btn compact" type="button">Send OTP</button><div id="otpArea" style="display:none" class="field uc-v165-otp-area"><label>OTP</label><input id="trackOtp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"><button id="trackVerifyOtp" class="btn compact" type="button">Verify & View Orders</button></div><div id="trackMsg"></div>`;
    $('#trackSendOtp').addEventListener('click',requestOtp);
    $('#trackVerifyOtp').addEventListener('click',verifyOtp);
    if(OTP.channel==='none')$('#trackSendOtp').disabled=true;
  }
  async function requestOtp(){
    const btn=$('#trackSendOtp'),identity=String($('#trackIdentity')?.value||'').trim();busy(btn,true,'Sending OTP…');
    try{
      const payload=OTP.channel==='email'?{email:identity,channel:'email'}:{phone:identity,channel:'whatsapp'};
      const r=await api('/api/auth/request-otp',{method:'POST',body:JSON.stringify(payload)});
      $('#otpArea').style.display='grid';msg(r.message||(OTP.channel==='email'?'OTP sent successfully. Please check your email.':'OTP sent successfully. Please check WhatsApp.'),'success');
      $('#trackOtp')?.focus();
    }catch(e){msg(e.message||'The OTP could not be sent. Please check the details and try again.','error');}
    finally{busy(btn,false);}
  }
  async function verifyOtp(){
    const btn=$('#trackVerifyOtp'),identity=String($('#trackIdentity')?.value||'').trim(),otp=String($('#trackOtp')?.value||'').trim();busy(btn,true,'Verifying…');
    try{
      const payload=OTP.channel==='email'?{email:identity,channel:'email',otp}:{phone:identity,channel:'whatsapp',otp};
      const r=await api('/api/auth/verify-otp',{method:'POST',body:JSON.stringify(payload)});localStorage.setItem('uc_order_token',r.token);msg('Verification successful. Your orders are shown below.','success');await loadOrders();
    }catch(e){msg(e.message||'The OTP could not be verified. Check the latest code and try again.','error');}
    finally{busy(btn,false);}
  }
  function statusClass(s=''){const v=String(s).toLowerCase();if(/paid|captured/.test(v))return'paid';if(/active|authenticated/.test(v))return'active';if(/cancel|fail/.test(v))return'cancelled';return v||'pending';}
  function orderActions(o){const parts=[];if(o.invoice_url)parts.push(`<button class="btn small" type="button" data-download-invoice="${H(o.order_id)}" data-invoice-url="${H(o.invoice_url)}">Download Invoice</button>`);if(o.retryable)parts.push(`<button class="btn small" type="button" data-retry-order="${H(o.order_id)}">Retry Payment</button>`);parts.push(`<button class="btn secondary small" type="button" data-contact-order="${H(o.order_id)}">Contact Admin</button>`);return `<div class="uc-v165-order-actions">${parts.join('')}</div>`;}
  function orderAmount(o){const received=Number(o.latest_received_paise||0),requested=Number(o.amount_paise||0),kind=String(o.latest_payment_kind||'').toLowerCase();if(received>0&&(kind==='authentication'||kind==='trial')&&requested>received)return `<strong>Trial ${MONEY.format(received/100)}</strong><br><small>Pending ${MONEY.format(requested/100)}</small>`;if(received>0)return `<strong>${MONEY.format(received/100)}</strong>`;return `<strong>${MONEY.format(requested/100)}</strong>`;}
  function classAccessNotice(o){const access=o.class_access;if(!access)return'';let days=[];try{days=JSON.parse(access.class_days_json||'[]');}catch{}const detail=[access.class_name,access.coach_name?`Coach: ${access.coach_name}`:'',days.length?days.map(x=>String(x).slice(0,3).toUpperCase()).join(', '):'',access.class_time].filter(Boolean).join(' · '),urgent=['last_day','expired'].includes(access.status);return `<div class="db108-access-notice ${H(access.status)}"><strong>${access.status==='last_day'?'Access ends today':access.status==='expired'?'Access ended':access.status==='upcoming'?'Access scheduled':'Class access active'}</strong><span>${H(access.message)}</span>${detail?`<small>${H(detail)}</small>`:''}${urgent?`<div><a class="btn small" href="${H(access.renew_url||'/offers')}">View Memberships</a><a class="btn secondary small" href="${H(access.contact_url||'/contact')}">Contact Gym</a></div>`:''}</div>`;}
  function renderOrders(rows){
    const box=$('#ordersBox');if(!box)return;ORDERS=rows||[];
    box.innerHTML=ORDERS.length?`<div class="table-wrap"><table class="table uc-v165-order-table"><thead><tr><th>Order</th><th>Order Status</th><th>Payment Status</th><th>Plan / Class Access</th><th>Amount</th><th>Next Step</th></tr></thead><tbody>${ORDERS.map(o=>`<tr><td><strong>${H(o.order_id)}</strong><br><small>${H(o.created_at||'')}</small></td><td><span class="status ${H(statusClass(o.order_status||o.status))}">${H(o.order_status_label||o.order_status||'In Progress')}</span></td><td><span class="status ${H(statusClass(o.payment_display_status||o.payment_status))}">${H(o.payment_display_label||o.payment_display_status||o.payment_status||'-')}</span></td><td>${H(o.items||'')}${classAccessNotice(o)}</td><td>${orderAmount(o)}</td><td>${orderActions(o)}</td></tr>`).join('')}</tbody></table></div><div id="ordersActionMsg" class="uc-v166-orders-action-msg" aria-live="polite"></div>`:'<div class="notice">No orders were found for this verified account.</div>';
    box.querySelectorAll('[data-download-invoice]').forEach(b=>b.addEventListener('click',()=>downloadOrderInvoice(b.dataset.downloadInvoice,b.dataset.invoiceUrl,b)));
    box.querySelectorAll('[data-retry-order]').forEach(b=>b.addEventListener('click',()=>retryOrder(b.dataset.retryOrder,b)));
    box.querySelectorAll('[data-contact-order]').forEach(b=>b.addEventListener('click',()=>contactOrder(b.dataset.contactOrder)));
  }
  function invoiceDownloadDone(orderId,ok=true,message=''){
    const pending=INVOICE_DOWNLOADS.get(String(orderId));if(!pending)return;
    clearTimeout(pending.timer);pending.iframe?.remove();resetActionButton(pending.btn,'Download Invoice');INVOICE_DOWNLOADS.delete(String(orderId));
    orderMsg(message||(ok?'Invoice downloaded successfully. Check your browser Downloads.':'The invoice could not be downloaded. Please try again.'),ok?'success':'error');
  }
  function downloadOrderInvoice(orderId,url,btn){
    if(!url){orderMsg('The invoice is not available yet. Refresh the order status after the payment is confirmed.','error');return;}
    if(INVOICE_DOWNLOADS.has(String(orderId)))return;
    busy(btn,true,'Downloading…');orderMsg('Preparing your invoice download…','notice');
    const iframe=document.createElement('iframe');iframe.hidden=true;iframe.setAttribute('aria-hidden','true');iframe.src=url+(url.includes('?')?'&':'?')+'silent=1';document.body.appendChild(iframe);
    const timer=setTimeout(()=>invoiceDownloadDone(orderId,false,'The invoice download is taking longer than expected. Please click Download Invoice again.'),18000);
    INVOICE_DOWNLOADS.set(String(orderId),{btn,iframe,timer});
  }
  window.addEventListener('message',ev=>{if(ev.origin!==location.origin)return;const d=ev.data||{};if(d.type==='uc-invoice-downloaded'&&d.order_id)invoiceDownloadDone(d.order_id,true);});
  async function loadOrders(){
    const token=localStorage.getItem('uc_order_token');if(!token)return;
    try{const r=await api('/api/my-orders',{headers:{Authorization:`Bearer ${token}`}});renderOrders(r.orders||[]);}
    catch(e){if(/expired|session|required/i.test(e.message||''))localStorage.removeItem('uc_order_token');const box=$('#ordersBox');if(box)box.innerHTML=`<div class="notice error">${H(e.message||'Orders could not be loaded. Please verify again.')}</div>`;}
  }
  async function retryOrder(orderId,btn){busy(btn,true,'Preparing Checkout…');try{const token=localStorage.getItem('uc_order_token'),r=await api('/api/my-orders-retry',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({order_id:orderId})});localStorage.setItem('uc_cart',JSON.stringify(r.cart||[]));sessionStorage.setItem('uc_checkout_prefill',JSON.stringify({...r.customer,source_order_id:orderId}));location.href=`/checkout?retry=${encodeURIComponent(orderId)}`;}catch(e){msg(e.message||'A new checkout could not be prepared. Please use Contact and the admin will help you.','error');busy(btn,false);}}
  function contactOrder(orderId){const o=ORDERS.find(x=>String(x.order_id)===String(orderId))||{};sessionStorage.setItem('uc_contact_prefill',JSON.stringify({name:o.customer_name||'',phone:o.customer_phone||'',email:o.customer_email||'',order_id:o.order_id||''}));location.href=`/contact?order=${encodeURIComponent(orderId)}`;}
  async function emailRetryFromLink(){
    if(location.pathname!=='/my-orders')return false;
    const q=new URLSearchParams(location.search),orderId=q.get('retry_order')||'',expires=q.get('retry_expires')||'',token=q.get('retry_token')||'';
    if(!orderId||!expires||!token)return false;
    const box=$('#ordersBox');if(box)box.innerHTML='<div class="notice">Preparing a fresh checkout with the current plan, offer and taxes…</div>';
    try{const r=await api('/api/public-retry',{method:'POST',body:JSON.stringify({order_id:orderId,expires,token})});localStorage.setItem('uc_cart',JSON.stringify(r.cart||[]));sessionStorage.setItem('uc_checkout_prefill',JSON.stringify({...r.customer,source_order_id:orderId}));location.replace(`/checkout?retry=${encodeURIComponent(orderId)}`);return true;}catch(e){msg(e.message||'This retry link could not prepare a fresh checkout. Please verify your account below and try again.','error');history.replaceState({},'',location.pathname);return false;}
  }
  function prefillCheckout(){
    if(location.pathname!=='/checkout')return;let d={};try{d=JSON.parse(sessionStorage.getItem('uc_checkout_prefill')||'{}');}catch{}if(!d||!Object.keys(d).length)return;
    const f=$('#checkoutForm');if(!f)return;for(const [n,v] of Object.entries({name:d.name,phone:d.phone,email:d.email,city:d.city,preferred_role:d.preferred_role})){const el=f.elements[n];if(el&&v!==undefined&&v!==null)el.value=String(v);}numericPhoneInputs(f);
    const result=$('#checkoutResult');if(result&&!result.innerHTML)result.innerHTML='<div class="notice success">Your previous order has been prepared with the current plan and offer. Review the order summary, then continue to payment to create a fresh secure payment request.</div>';
  }
  function prefillContact(){
    if(location.pathname!=='/contact')return;let d={};try{d=JSON.parse(sessionStorage.getItem('uc_contact_prefill')||'{}');}catch{}if(!d||!Object.keys(d).length)return;
    const f=$('#contactForm');if(!f)return;for(const [n,v] of Object.entries({name:d.name,phone:String(d.phone||'').replace(/^91(?=\d{10}$)/,''),email:d.email})){const el=f.elements[n];if(el&&v)el.value=v;}numericPhoneInputs(f);const m=f.elements.message;if(m&&!m.value&&d.order_id)m.placeholder=`Write your message about order ${d.order_id}`;
  }
  function autoDownloadInvoice(){if(location.pathname!=='/payment-success'||new URLSearchParams(location.search).get('download')!=='1')return;let done=false;const tryIt=()=>{const b=$('#downloadInvoice');if(done||!b||b.hidden||b.disabled)return false;done=true;setTimeout(()=>b.click(),250);return true;};if(!tryIt()){const mo=new MutationObserver(()=>{if(tryIt())mo.disconnect();});mo.observe(document.body,{subtree:true,childList:true,attributes:true});setTimeout(()=>mo.disconnect(),12000);}}

  if(window.UC){window.UC.requestOtp=requestOtp;window.UC.verifyOtp=verifyOtp;window.UC.loadMyOrders=loadOrders;}
  const oldCheckout=window.UC?.loadCheckout;if(typeof oldCheckout==='function')window.UC.loadCheckout=async function(){const r=await oldCheckout.apply(this,arguments);setTimeout(prefillCheckout,30);return r;};
  function restoreTrackOrderAfterNavigation(){
    if(location.pathname!=='/my-orders')return;
    document.querySelectorAll('[data-retry-order]').forEach(btn=>resetActionButton(btn,'Retry Payment'));
    document.querySelectorAll('[data-download-invoice]').forEach(btn=>resetActionButton(btn,'Download Invoice'));
    if(localStorage.getItem('uc_order_token'))loadOrders();
  }
  async function init(){numericPhoneInputs();prefillContact();autoDownloadInvoice();if(location.pathname==='/my-orders'){if(await emailRetryFromLink())return;await loadOtpSettings();renderTrackForm();await loadOrders();}}
  window.addEventListener('pageshow',e=>{if(e.persisted)setTimeout(restoreTrackOrderAfterNavigation,0);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&location.pathname==='/my-orders')setTimeout(restoreTrackOrderAfterNavigation,0);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
