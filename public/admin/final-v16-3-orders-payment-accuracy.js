/* IronPulse Gym V16.3 — actual gateway amounts + clear order lifecycle buckets. Additive final override. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=p=>`₹${(Number(p||0)/100).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;});
  const infoIcon=()=>`<svg class="uc-info-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="10.4" r="1.55" fill="currentColor"/><path d="M14.6 14.4h1.7v7.1c0 1 .45 1.5 1.45 1.5h.55" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const backIcon=()=>`<svg class="uc-back-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.3 10.8 9.6 15.5l4.7 4.7M10.3 15.5h7.1c3.3 0 5.1 1.7 5.1 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const bucketKeys=['new','pending','existing','cancelled','cancelled_subscriptions'];
  const mapKey={new:'new_orders',pending:'pending_orders',existing:'existing_orders',cancelled:'cancelled_orders',cancelled_subscriptions:'cancelled_subscriptions'};
  const bucketMeta={
    new:{title:'New Orders',subtitle:'Paid orders that are ready for admin action.',empty:'No new paid orders are waiting for action.',help:`<h3>New Orders</h3><p>This is the paid work queue. An order appears here only after money has actually been received.</p><ul><li><strong>Trial:</strong> the trial amount has been paid. The future recurring amount is shown separately as Pending.</li><li><strong>Subscription:</strong> a recurring subscription payment has been received.</li><li><strong>One-Time:</strong> a one-time payment has been received.</li></ul><p>Use Actions to mark the paid order In Process, Delivered or Completed. Delivered/Completed orders move to Existing Orders.</p>`},
    pending:{title:'Pending Orders',subtitle:'Payment requests where no money has been received yet.',empty:'No unpaid payment requests are pending.',help:`<h3>Pending Orders</h3><p>These customers started a payment request but no confirmed payment has been received.</p><ul><li>They are kept separate from paid Trial, Subscription and One-Time orders.</li><li>If the payment remains unpaid for <strong>1 hour</strong>, the local order is automatically treated as cancelled on the next refresh and moves to Cancelled Orders.</li><li>Use the customer details to follow up when useful.</li></ul>`},
    existing:{title:'Existing Orders / Subscribers',subtitle:'Paid orders already processed and continuing customer records.',empty:'No processed paid orders are available yet.',help:`<h3>Existing Orders / Subscribers</h3><p>Paid work moves here after it is Delivered or Completed. Continuing paid subscriptions can also remain here while service is active.</p><p>Subscription controls such as Pause, Resume, Cancel and Refund remain available. If a previously paid subscription is cancelled, it moves to Cancelled Subscriptions instead of being mixed with unpaid cancelled orders.</p>`},
    cancelled:{title:'Cancelled Orders',subtitle:'Unpaid, failed or abandoned payment requests.',empty:'No cancelled or failed unpaid orders are available.',help:`<h3>Cancelled Orders</h3><p>This section is for orders where the customer never completed a successful payment, including abandoned, failed or cancelled payment requests.</p><p>These are useful for follow-up or remarketing, but they are not counted as paid New Orders and are not treated as cancelled subscribers.</p>`},
    cancelled_subscriptions:{title:'Cancelled Subscriptions',subtitle:'Customers who paid/authenticated first and later cancelled the subscription.',empty:'No previously paid subscriptions have been cancelled.',help:`<h3>Cancelled Subscriptions</h3><p>This section is different from Cancelled Orders. These customers had already paid something — for example a trial/authentication amount or an actual recurring charge — and their subscription was later cancelled or ended.</p><p>They are removed from the active/existing subscription workflow while their historical payment record remains available for reference.</p>`}
  };

  let lastData=null, route='all', routeLock=false, activeMenu=null;
  const workflowChoice=new Map();
  const ORDER_CACHE_KEY='uc_v164_orders_saved_view';
  function readOrderCache(){try{const x=JSON.parse(sessionStorage.getItem(ORDER_CACHE_KEY)||'null');return x&&typeof x==='object'?x:null;}catch{return null;}}
  function writeOrderCache(data){try{sessionStorage.setItem(ORDER_CACHE_KEY,JSON.stringify(data));}catch{}}
  function paintOrderData(r,{markSeen=false}={}){if(!r)return;lastData=r;lastLiveSignature=signature(r);window.A=window.A||{};A.orders=r.orders||[];A.newOrders=r.new_orders||[];A.pendingOrders=r.pending_orders||[];A.existingOrders=r.existing_orders||[];A.cancelledOrders=r.cancelled_orders||[];A.cancelledSubscriptions=r.cancelled_subscriptions||[];for(const k of bucketKeys)renderBucket(k,r[mapKey[k]]||[]);syncBadge(r,{markSeen});}


  function ensureNavBadge(){
    const nav=document.querySelector('[data-tab="orders"]'); if(!nav)return null;
    let b=nav.querySelector('.nav-badge');
    if(!b){b=document.createElement('span');b.className='nav-badge';nav.appendChild(b);}
    return b;
  }
  function readSeen(k){try{return JSON.parse(localStorage.getItem(k)||'[]')||[];}catch{return[];}}
  function writeSeen(k,v){try{localStorage.setItem(k,JSON.stringify([...new Set(v)]));}catch{}}
  function syncBadge(data,{markSeen=false}={}){
    if(!data)return;
    const newIds=(data.new_orders||[]).map(o=>String(o.id||o.order_id));
    const lostIds=[...(data.cancelled_orders||[]),...(data.cancelled_subscriptions||[])].map(o=>String(o.id||o.order_id));
    if(markSeen){writeSeen('uc_v163_seen_new_orders',newIds);writeSeen('uc_v163_seen_cancelled_orders',lostIds);}
    const oldNew=readSeen('uc_v163_seen_new_orders'),oldLost=readSeen('uc_v163_seen_cancelled_orders');
    const unseenNew=newIds.filter(x=>!oldNew.includes(x)).length;
    const unseenLost=lostIds.filter(x=>!oldLost.includes(x)).length;
    const b=ensureNavBadge(); if(!b)return;
    const text=[unseenNew?`+${unseenNew}`:'',unseenLost?`−${unseenLost}`:''].filter(Boolean).join(' · ');
    b.textContent=text?` ${text}`:''; b.hidden=!text;
  }

  function panelHtml(){
    const cards=bucketKeys.map(k=>{const m=bucketMeta[k];return `<details class="card below admin-collapsed-card uc-v163-order-card" data-order-bucket="${k}"><summary><span class="uc-v163-order-summary"><strong>${H(m.title)}</strong><small>${H(m.subtitle)}</small></span></summary><div class="collapsed-body uc-v163-order-body"><div class="uc-v163-order-toolbar"><button class="uc-info-btn uc-v164-order-help-toggle" type="button" title="Help and instructions" aria-label="Help and instructions" data-order-help="${k}" aria-pressed="false">${infoIcon()}</button><button class="btn secondary compact" type="button" data-order-export="${k}">Download Excel</button></div><div class="uc-v163-order-flip" data-order-flip="${k}"><div class="uc-v163-order-front"><div class="uc-v163-order-tablewrap" data-order-table="${k}"><div class="notice">Loading ${H(m.title.toLowerCase())}…</div></div></div><div class="uc-v163-order-help"><div class="uc-v163-order-help-inner">${m.help}</div></div></div></div></details>`}).join('');
    return `<div class="top uc-v163-orders-top"><h1>Orders</h1><div class="top-actions"><input id="orderSearch" class="search-input" placeholder="Search order, phone, customer, subscription ID"><button class="btn secondary compact" type="button" id="ucV163OrderSearch">Search / Refresh</button><button class="btn compact" type="button" onclick="openRefundBox()">Refunds</button></div></div><div id="orderNotice" class="notice mini" hidden></div>${cards}`;
  }

  function ensureOrdersPanel(){
    const panel=$('#orders'); if(!panel)return null;
    if(panel.dataset.ucV163Orders==='1')return panel;
    panel.dataset.ucV163Orders='1'; panel.innerHTML=panelHtml();
    $('#ucV163OrderSearch',panel)?.addEventListener('click',()=>window.load_orders());
    $('#orderSearch',panel)?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.load_orders();}});
    $$('[data-order-help]',panel).forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.orderHelp,f=$(`[data-order-flip="${CSS.escape(k)}"]`);flipHelp(k,!f?.classList.contains('flipped'));}));
    $$('[data-order-export]',panel).forEach(b=>b.addEventListener('click',()=>downloadBucket(b.dataset.orderExport)));
    return panel;
  }

  function flipHelp(k,on){const f=$(`[data-order-flip="${CSS.escape(k)}"]`),b=$(`[data-order-help="${CSS.escape(k)}"]`);if(f)f.classList.toggle('flipped',!!on);if(b){b.innerHTML=on?backIcon():infoIcon();b.title=on?'Back to orders':'Help and instructions';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',on?'true':'false');}}
  function setExpanded(k){
    ensureOrdersPanel();
    $$('[data-order-bucket]').forEach(d=>{d.open=k!=='all'&&d.dataset.orderBucket===k;flipHelp(d.dataset.orderBucket,false);});
    if(k!=='all')$(`[data-order-bucket="${CSS.escape(k)}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function gatewayLabel(o){const raw=String(o.gateway_label||o.latest_gateway||o.gateway||'').trim();return raw?raw.charAt(0).toUpperCase()+raw.slice(1).toLowerCase():'Payment Gateway';}
  function gatewayChip(o){const g=gatewayLabel(o);return `<span class="uc-v163-pg-chip">${H(g)}</span>`;}
  function phone(o){return o.website_phone||o.customer_phone||o.razorpay_phone||'-';}
  function typeLabel(o){return o.order_type==='trial'?'Trial':o.order_type==='one_time'?'One-Time':'Subscription';}
  function statusBadge(label,kind='neutral'){const semantic={paid:'active',subscription:'active',trial:'draft',one_time:'draft',bad:'failed',pending:'draft'}[kind]||'draft';const extra={subscription:'uc-v164-status-subscription',trial:'uc-v164-status-trial',one_time:'uc-v164-status-onetime',pending:'uc-v164-status-pending',bad:'uc-v164-status-bad',paid:'uc-v164-status-paid'}[kind]||'';return `<span class="status ${semantic} ${extra}">${H(label)}</span>`;}
  function lifecycle(o){const x=String(o.status||'').replace(/_/g,' ').trim();return x?x.replace(/\b\w/g,c=>c.toUpperCase()):'';}
  function amountCell(o,k){
    const received=Number(o.received_paise||0),recurring=Number(o.recurring_charge_paise||o.amount_paise||0),due=Number(o.current_due_paise||0),discount=Number(o.discount_paise||0);
    let main='',extra='';
    if(k==='new'&&o.order_type==='trial'){main=`<strong>Trial ${money(received)}</strong>`;extra=recurring?`<small>Pending ${money(recurring)}</small>`:'';}
    else if(k==='new'){main=`<strong>${H(typeLabel(o))} ${money(received)}</strong>`;}
    else if(k==='pending'){main=`<strong>Pending ${money(due||recurring)}</strong>`;if(o.order_type==='trial'&&recurring)extra=`<small>Recurring ${money(recurring)}</small>`;}
    else if(k==='existing'){main=`<strong>Received ${money(received)}</strong>`;if(o.order_type==='trial'&&recurring)extra=`<small>Recurring ${money(recurring)}</small>`;}
    else if(k==='cancelled_subscriptions'){main=`<strong>Received ${money(received)}</strong>`;if(recurring)extra=`<small>Recurring ${money(recurring)}</small>`;}
    else {main=`<strong>Unpaid ${money(due||recurring)}</strong>`;}
    return `<div class="uc-v163-amount">${main}${extra}${discount?`<small>Discount ${money(discount)}</small>`:''}</div>`;
  }
  function orderStatus(o,k){
    const kind=o.order_type==='trial'?'trial':o.order_type==='one_time'?'one_time':'subscription';
    if(k==='new')return statusBadge(typeLabel(o),kind);
    if(k==='pending')return statusBadge('Pending','pending');
    if(k==='cancelled_subscriptions')return statusBadge('Cancelled Subscription','bad');
    if(k==='cancelled')return statusBadge(/fail/i.test(String(o.status||o.payment_status))?'Failed':'Cancelled','bad');
    const lc=lifecycle(o);return `${statusBadge(typeLabel(o),kind)}${lc&&!/active|paid|captured|success/i.test(lc)?`<small class="uc-v163-lifecycle">${H(lc)}</small>`:''}`;
  }
  function paymentStatus(o,k){
    if(k==='new'||k==='existing')return Number(o.received_paise||0)>0?statusBadge('Paid','paid'):statusBadge('Pending','pending');
    if(k==='pending')return statusBadge('Pending','pending');
    if(k==='cancelled_subscriptions')return statusBadge(Number(o.received_paise||0)>0?'Paid Previously':'Cancelled',Number(o.received_paise||0)>0?'paid':'bad');
    return statusBadge(/fail/i.test(String(o.status||o.payment_status))?'Failed':'Cancelled','bad');
  }
  function orderIdentity(o){return `<div class="uc-v163-order-id"><strong>${H(o.order_id||'-')}</strong>${o.gateway_subscription_id?`<small>${H(o.gateway_subscription_id)}</small>`:''}<small>${H(o.created_at||'')}</small></div>`;}
  function customerCell(o){const ref=`order:${encodeURIComponent(o.order_id||'')}`;return `<div class="uc-v163-customer"><button class="link-button" type="button" onpointerenter="prefetchUCClientDetails?.('${H(ref)}')" onclick="openOrderDetails('${H(o.order_id||'')}')"><strong>${H(o.customer_name||'Customer')}</strong></button><small>${H(phone(o))} • WhatsApp</small>${gatewayChip(o)}</div>`;}

  function closeWorkflowMenu(){
    if(!activeMenu)return;
    window.removeEventListener('scroll',activeMenu.reposition,true);
    window.removeEventListener('resize',activeMenu.reposition);
    activeMenu.menu.remove(); activeMenu=null;
  }
  function positionWorkflowMenu(trigger,menu){
    const r=trigger.getBoundingClientRect(),gap=6,desired=Math.min(116,menu.scrollHeight||116),spaceBelow=innerHeight-r.bottom-12,spaceAbove=r.top-12;
    const openUp=spaceBelow<desired&&spaceAbove>spaceBelow;
    menu.style.left=`${Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))}px`;
    menu.style.top=openUp?`${Math.max(8,r.top-desired-gap)}px`:`${Math.min(innerHeight-desired-8,r.bottom+gap)}px`;
    menu.style.width=`${Math.max(142,r.width)}px`;
  }
  function openWorkflowMenu(trigger,orderId){
    if(activeMenu?.trigger===trigger){closeWorkflowMenu();return;}
    closeWorkflowMenu();
    const options=[['in_process','In Process'],['delivered','Delivered'],['completed','Completed'],['cancelled','Cancelled'],['failed','Failed']];
    const menu=document.createElement('div');menu.className='uc-v163-order-action-menu';menu.setAttribute('role','listbox');
    const selected=workflowChoice.get(orderId)||'in_process';
    menu.innerHTML=options.map(([v,l])=>`<button type="button" role="option" data-value="${v}" aria-selected="${v===selected}">${H(l)}</button>`).join('');
    document.body.appendChild(menu);
    const reposition=()=>positionWorkflowMenu(trigger,menu);reposition();
    activeMenu={menu,trigger,reposition};
    ['pointerdown','mousedown','touchstart','wheel'].forEach(ev=>menu.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
    menu.addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;const v=b.dataset.value;workflowChoice.set(orderId,v);const label=options.find(x=>x[0]===v)?.[1]||'In Process';const t=trigger.querySelector('[data-action-label]');if(t)t.textContent=label;closeWorkflowMenu();});
    window.addEventListener('scroll',reposition,true);window.addEventListener('resize',reposition);
  }
  document.addEventListener('pointerdown',e=>{if(activeMenu&&!activeMenu.menu.contains(e.target)&&!activeMenu.trigger.contains(e.target))closeWorkflowMenu();});

  function newActions(o){
    const id=H(o.order_id||'');const selected=workflowChoice.get(o.order_id)||'in_process';const label={in_process:'In Process',delivered:'Delivered',completed:'Completed',cancelled:'Cancelled',failed:'Failed'}[selected]||'In Process';
    return `<div class="uc-v163-new-actions"><button class="uc-v163-action-trigger" type="button" data-workflow-trigger="${id}"><span data-action-label>${H(label)}</span><span class="uc-v163-action-chevron" aria-hidden="true"></span></button><button class="btn small uc-v163-save-action" type="button" data-workflow-save="${id}">Save</button></div>`;
  }
  function pendingActions(o){return `<div class="uc-v163-row-actions">${o.fallback_url?`<a class="btn secondary small" href="${H(o.fallback_url)}" target="_blank" rel="noopener">Open Payment</a>`:''}<button class="btn secondary small" type="button" data-mark-order="cancelled" data-order-id="${H(o.order_id)}">Cancel</button><button class="btn secondary small" type="button" data-mark-order="failed" data-order-id="${H(o.order_id)}">Failed</button></div>`;}
  function existingActions(o){return `<div class="uc-v163-row-actions"><button class="btn secondary small icon-action" type="button" title="Pause" onclick="orderAction('${H(o.order_id)}','pause')">⏸</button><button class="btn secondary small icon-action" type="button" title="Resume" onclick="orderAction('${H(o.order_id)}','resume')">▶</button><button class="btn danger small icon-action" type="button" title="Cancel" onclick="orderAction('${H(o.order_id)}','cancel')">×</button><button class="btn secondary small" type="button" onclick="openRefundPrefill('${H(o.order_id)}')">Refund</button></div>`;}
  function cancelledSubActions(o){return `<div class="uc-v163-row-actions"><button class="btn secondary small" type="button" onclick="openOrderDetails('${H(o.order_id)}')">Details</button>${Number(o.received_paise||0)>0?`<button class="btn secondary small" type="button" onclick="openRefundPrefill('${H(o.order_id)}')">Refund</button>`:''}</div>`;}
  function cancelledActions(o){return `<div class="uc-v163-row-actions"><button class="btn secondary small" type="button" onclick="openOrderDetails('${H(o.order_id)}')">Details</button></div>`;}
  function actions(o,k){return k==='new'?newActions(o):k==='pending'?pendingActions(o):k==='existing'?existingActions(o):k==='cancelled_subscriptions'?cancelledSubActions(o):cancelledActions(o);}

  function renderBucket(k,rows){
    const box=$(`[data-order-table="${CSS.escape(k)}"]`),m=bucketMeta[k];if(!box)return;
    if(!rows?.length){box.innerHTML=`<div class="notice uc-v163-order-empty">${H(m.empty)}</div>`;return;}
    box.innerHTML=`<div class="uc-v163-order-grid uc-v163-order-grid-head"><div>Order</div><div>Customer</div><div>Amount</div><div>Status</div><div>Payment</div><div>Actions</div></div>${rows.map(o=>`<div class="uc-v163-order-grid uc-v163-order-grid-row">${[orderIdentity(o),customerCell(o),amountCell(o,k),`<div>${orderStatus(o,k)}</div>`,`<div>${paymentStatus(o,k)}</div>`,`<div>${actions(o,k)}</div>`].map(x=>`<div>${x}</div>`).join('')}</div>`).join('')}`;
    $$('[data-workflow-trigger]',box).forEach(b=>b.addEventListener('pointerdown',e=>e.stopPropagation()));
    $$('[data-workflow-trigger]',box).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openWorkflowMenu(b,b.dataset.workflowTrigger);}));
    $$('[data-workflow-save]',box).forEach(b=>b.addEventListener('click',()=>saveWorkflow(b.dataset.workflowSave,b)));
    $$('[data-mark-order]',box).forEach(b=>b.addEventListener('click',()=>markOrder(b.dataset.orderId,b.dataset.markOrder,b)));
  }

  async function saveWorkflow(orderId,button){
    const v=workflowChoice.get(orderId)||'in_process'; const old=button.textContent; button.disabled=true;button.textContent='Saving…';
    try{
      const body={order_id:orderId};
      if(v==='in_process')body.action='process';
      else if(v==='delivered'||v==='completed'){body.action='deliver';body.status=v;}
      else if(v==='cancelled')body.action='mark_cancelled';
      else if(v==='failed')body.action='mark_failed';
      await apiJson('/api/admin/orders',{method:'PUT',body:JSON.stringify(body)}); workflowChoice.delete(orderId); await window.load_orders();
    }catch(e){alert(e.message||'The order could not be updated. Please refresh and try again.');}
    finally{button.disabled=false;button.textContent=old;}
  }
  async function markOrder(orderId,state,button){
    if(state==='cancelled'&&!confirm('Move this unpaid order to Cancelled Orders?'))return;
    const old=button.textContent;button.disabled=true;button.textContent='Saving…';
    try{await apiJson('/api/admin/orders',{method:'PUT',body:JSON.stringify({order_id:orderId,action:state==='failed'?'mark_failed':'mark_cancelled'})});await window.load_orders();}
    catch(e){alert(e.message||'The order could not be updated. Please refresh and try again.');}
    finally{button.disabled=false;button.textContent=old;}
  }

  function excelEscape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function downloadBucket(k){
    const rows=lastData?.[mapKey[k]]||[]; if(!rows.length){alert(`No ${bucketMeta[k].title.toLowerCase()} to export.`);return;}
    const headers=['Order','Subscription','Date','Customer','WhatsApp','Gateway','Amount Received','Actual Recurring Charge','Current Due','Order Type','Status','Payment'];
    const data=rows.map(o=>[o.order_id,o.gateway_subscription_id||'',o.created_at||'',o.customer_name||'',phone(o),gatewayLabel(o),money(o.received_paise),money(o.recurring_charge_paise),money(o.current_due_paise),typeLabel(o),o.status||'',o.payment_status||'']);
    const html=`<table><tr>${headers.map(x=>`<th>${excelEscape(x)}</th>`).join('')}</tr>${data.map(r=>`<tr>${r.map(v=>`<td>${excelEscape(v)}</td>`).join('')}</tr>`).join('')}</table>`;
    const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${k.replace(/_/g,'-')}-orders-${new Date().toISOString().slice(0,10)}.xls`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function applyRoute(){setExpanded(route);}
  window.openOrdersBucket=function(k='all'){
    route=bucketKeys.includes(k)?k:'all'; routeLock=true;
    try{window.tab?.('orders');}finally{routeLock=false;}
  };

  const previousTab=window.tab;
  if(typeof previousTab==='function')window.tab=function(id){if(id==='orders'&&!routeLock)route='all';return previousTab.apply(this,arguments);};

  window.load_orders=async function(){
    ensureOrdersPanel(); closeWorkflowMenu();
    const q=$('#orderSearch')?.value||'';
    // Show the last complete saved view immediately. The latest D1/webhook state is
    // fetched quietly afterwards, so navigation never flashes an empty/loading grid.
    if(!lastData&&!q){const cached=readOrderCache();if(cached){paintOrderData(cached,{markSeen:false});applyRoute();}}
    try{
      const r=await apiJson('/api/admin/orders'+(q?`?q=${encodeURIComponent(q)}`:''));paintOrderData(r,{markSeen:true});if(!q)writeOrderCache(r);applyRoute();return r;
    }catch(e){if(lastData){const n=$('#orderNotice');if(n){n.hidden=false;n.textContent='Latest order refresh is temporarily unavailable. The most recent saved order information remains visible.';}return lastData;}for(const k of bucketKeys){const box=$(`[data-order-table="${CSS.escape(k)}"]`);if(box)box.innerHTML=`<div class="error">${H(e.message||'Orders could not be loaded. Refresh this page and try again.')}</div>`;}throw e;}
  };

  async function dashboardOrderSync(){
    try{
      const r=await apiJson('/api/admin/orders?summary=1'),c=r.counts||{};syncBadge(r,{markSeen:false});
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v??0);};
      // The lightweight summary returns the identical workflow counts/ID lists
      // without downloading payment, item and subscription detail rows.
      set('statPaid',c.new_orders||0);set('statPendingOrders',c.pending_orders||0);set('statExistingOrders',c.existing_orders||0);set('statCancelledOrders',c.cancelled_orders||0);set('statCancelledSubscriptions',c.cancelled_subscriptions||0);
    }catch(_){ }
  }
  const previousDashboard=window.load_dashboard;
  if(typeof previousDashboard==='function')window.load_dashboard=async function(){const r=await previousDashboard.apply(this,arguments);await dashboardOrderSync();return r;};

  // One revision-first Orders controller replaces both former five-minute full-data
  // refresh loops. The frequent request reads one activity row; complete Orders data
  // is loaded only after a real order/payment change, on open, or by manual Refresh.
  const ORDER_REVISION_KEY='uc_v1701_orders_revision';
  let liveSyncBusy=false,lastLiveSignature='',lastOrderRevision=null;
  function signature(r){return bucketKeys.map(k=>(r?.[mapKey[k]]||[]).map(o=>`${o.order_id}:${o.status}:${o.payment_status}:${o.received_paise}:${o.recurring_charge_paise}:${o.order_type}`).join('|')).join('||');}
  async function pollOrderRevision(){
    if(liveSyncBusy||document.hidden||!navigator.onLine)return;
    liveSyncBusy=true;
    try{
      const a=await apiJson('/api/admin/activity?scope=orders'),revision=Math.max(0,Number(a.revision||0));
      if(lastOrderRevision===null){
        let saved=null;try{saved=sessionStorage.getItem(ORDER_REVISION_KEY);}catch{}
        lastOrderRevision=saved===null?revision:Math.max(0,Number(saved||0));
        if(saved===null){try{sessionStorage.setItem(ORDER_REVISION_KEY,String(revision));}catch{}return;}
      }
      if(revision===lastOrderRevision)return;
      if($('#orders')?.classList.contains('active'))await window.load_orders();
      else{
        const r=await apiJson('/api/admin/orders?summary=1&refresh=1');syncBadge(r,{markSeen:false});
      }
      lastOrderRevision=revision;try{sessionStorage.setItem(ORDER_REVISION_KEY,String(revision));}catch{}
    }
    catch(_){/* keep the last saved view visible during a temporary background error */}
    finally{liveSyncBusy=false;}
  }
  setInterval(pollOrderRevision,60000);setTimeout(pollOrderRevision,1800);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollOrderRevision();});
  window.addEventListener('online',pollOrderRevision);

  // Build the final Orders layout now so the first navigation does not flash the previous layout.
  ensureOrdersPanel();
})();
