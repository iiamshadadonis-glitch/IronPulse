/* Final subscriptions overview + safe storage management add-on.
   Additive only: existing dashboard, CRM, orders, payment and lead logic remain intact. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const INR=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const money=p=>INR.format(Number(p||0)/100);
  const enc=v=>encodeURIComponent(v==null?'':String(v));
  const state={cards:null,listType:'total',analytics:null,detail:{date:'',type:''},storage:null,storageRows:[],storageCategory:''};
  const TYPE_LABELS={total:'Total Subscriptions',active:'Active Subscriptions',new:'New Subscriptions',renewed:'Renewals',upcoming:'Upcoming Renewals',failed:'Failed Subscriptions',cancelled:'Cancelled Subscriptions',successful:'Successful Charges'};

  function toast(text,bad=false){
    let t=$('#ucSubscriptionStorageToast');
    if(!t){t=document.createElement('div');t.id='ucSubscriptionStorageToast';t.className='uc-sub-storage-toast';document.body.appendChild(t);}
    t.textContent=text;t.classList.toggle('bad',bad);t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3300);
  }
  function fmtDate(v){
    if(!v)return'-';
    const raw=String(v), d=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(`${raw}T00:00:00+05:30`):new Date(Number(v)>1e9?Number(v)*1000:raw);
    if(Number.isNaN(d.getTime()))return raw;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  }
  function fmtShortDate(v){
    if(!v)return'-';const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v))?`${v}T00:00:00+05:30`:Number(v)*1000);
    return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',timeZone:'Asia/Kolkata'});
  }
  function todayLocal(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function dateShift(days){const d=new Date();d.setDate(d.getDate()+days);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function clientLink(r){return r?.client_ref?`<button class="uc-sub-client-link" type="button" onclick="openUCSubscriptionClient('${H(r.client_ref)}')">${H(r.name||'Subscriber')}</button>`:H(r?.name||'Subscriber');}
  window.openUCSubscriptionClient=function(ref){
    $$('.uc-sub-modal.open,.uc-sub-detail-modal.open').forEach(m=>m.classList.remove('open'));
    if(typeof window.openClientDetails==='function')window.openClientDetails(ref);
  };

  /* ---------- Dashboard subscription cards ---------- */
  async function fetchCards(){return await api('/api/admin/subscription-overview?mode=cards');}
  function setText(id,val){const el=$(id);if(el)el.textContent=val;}
  function renderCardCounts(r){
    const c=r?.cards||{};state.cards=c;
    setText('#ucStatSubTotal',c.total||0);setText('#ucStatSubActive',c.active||0);setText('#ucStatSubSuccessful',c.successful||0);setText('#ucStatSubNew',c.new||0);setText('#ucStatSubRenewed',c.renewed||0);setText('#ucStatSubUpcoming',c.upcoming||0);setText('#ucStatSubFailed',c.failed||0);setText('#ucStatSubCancelled',c.cancelled||0);
    const msg=$('#ucSubscriptionOverviewMsg');if(msg){
      if(r?.configured===false)msg.innerHTML=`<div class="notice">Live subscription information will appear here after a Payment Gateway is enabled in Payments.</div>`;
      else if(r?.truncated)msg.innerHTML=`<div class="notice">Showing the most recent 1,000 subscription records in this refresh.</div>`;
      else msg.innerHTML='';
    }
  }
  window.loadUCSubscriptionOverview=async function(){
    try{renderCardCounts(await fetchCards());}catch(e){const m=$('#ucSubscriptionOverviewMsg');if(m)m.innerHTML=`<div class="error">${H(e.message||'Could not refresh subscriptions.')}</div>`;}
  };
  window.refreshUCSubscriptionOverview=async function(btn){
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
    try{await window.loadUCSubscriptionOverview();toast('Subscription information refreshed.');}
    catch(e){toast(e.message||'Refresh failed.',true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Apply';}}
  };

  /* ---------- Subscription list modal ---------- */
  function ensureListModal(){
    let m=$('#ucSubscriptionListModal');if(m)return m;
    m=document.createElement('div');m.id='ucSubscriptionListModal';m.className='modal uc-sub-modal';m.innerHTML=`<div class="modal-card wide uc-sub-modal-card"><div class="top uc-sub-modal-head"><div><h2 id="ucSubListTitle">Subscriptions</h2><p id="ucSubListDesc" class="muted">Live subscription information.</p></div><div class="uc-modal-head-actions"><button class="uc-refresh-icon" type="button" title="Refresh" aria-label="Refresh" onclick="refreshUCSubscriptionList(this)">↻</button><button class="btn secondary compact" type="button" onclick="closeUCSubscriptionList()">Close</button></div></div><div id="ucSubListBody"></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCSubscriptionList=()=>$('#ucSubscriptionListModal')?.classList.remove('open');
  function listReason(r,type){if(type==='failed')return r.reason||'Payment needs attention';if(type==='upcoming')return 'Scheduled renewal';if(type==='cancelled')return r.reason||'Subscription cancelled';if(type==='successful')return r.reason||'At least one successful subscription charge';if(type==='active')return r.reason||'Subscription is currently active';if(type==='new')return r.reason||'Subscription started within the last 30 days';if(type==='renewed')return r.reason||`${Number(r.paid_count||0)} successful subscription charges`;return r.reason||'-';}
  function renderSubList(rows,type){
    const body=$('#ucSubListBody');if(!body)return;
    if(!rows.length){body.innerHTML='<div class="notice">No matching subscriptions found.</div>';return;}
    body.innerHTML=`<div class="uc-sub-grid-wrap"><div class="uc-sub-list-grid uc-sub-list-head"><div>Name</div><div>Phone</div><div>Amount</div><div>Status</div><div>${type==='upcoming'?'Next Charge':'Start Date'}</div><div>Successful Cycles</div><div>Reason / Note</div></div>${rows.map(r=>`<div class="uc-sub-list-grid uc-sub-list-row"><div>${clientLink(r)}<small>${H(r.plan_name||'')}</small></div><div>${H(r.phone||'-')}</div><div>${money(r.amount_paise||0)}</div><div><span class="uc-sub-status ${H(r.status||'neutral')}">${H(r.status_label||r.status||'-')}</span></div><div>${H(fmtDate(type==='upcoming'?r.charge_at:(r.start_at||r.created_at)))}</div><div>${Number(r.paid_count||0)}</div><div class="uc-wrap-cell">${H(listReason(r,type))}</div></div>`).join('')}</div>`;
  }
  async function loadList(type){
    const body=$('#ucSubListBody');if(body)body.innerHTML='<div class="notice">Refreshing live subscription information…</div>';
    const r=await api(`/api/admin/subscription-overview?mode=list&filter=${enc(type)}`);renderCardCounts(r);renderSubList(r.rows||[],type);return r;
  }
  window.openUCSubscriptionList=async function(type='total'){
    state.listType=type;const m=ensureListModal();$('#ucSubListTitle').textContent=TYPE_LABELS[type]||'Subscriptions';$('#ucSubListDesc').textContent=type==='failed'?'Review unsuccessful subscription charges and the latest available reason.':type==='upcoming'?'Review recurring charges scheduled within the next 30 days.':'Live recurring-subscription information.';m.classList.add('open');
    try{await loadList(type);}catch(e){$('#ucSubListBody').innerHTML=`<div class="error">${H(e.message)}</div>`;}
  };
  window.refreshUCSubscriptionList=async function(btn){btn?.classList.add('spinning');try{await loadList(state.listType);toast('Subscription list refreshed.');}catch(e){toast(e.message,true);}finally{btn?.classList.remove('spinning');}};

  /* ---------- Total-subscription analytics ---------- */
  function ensureAnalyticsModal(){
    let m=$('#ucSubscriptionAnalyticsModal');if(m)return m;
    m=document.createElement('div');m.id='ucSubscriptionAnalyticsModal';m.className='modal uc-sub-modal';m.innerHTML=`<div class="modal-card wide uc-sub-analytics-card">
      <div class="top uc-sub-modal-head"><div><h2>Total Subscriptions</h2><p class="muted">Compare subscription activity for a selected period.</p></div><div class="uc-modal-head-actions"><button class="uc-refresh-icon" type="button" title="Refresh" aria-label="Refresh" onclick="loadUCSubscriptionAnalytics(this)">↻</button><button class="btn secondary compact" type="button" onclick="closeUCSubscriptionAnalytics()">Close</button></div></div>
      <div class="uc-sub-analytics-filters">
        <div class="field"><label>Period</label><select id="ucSubPreset" onchange="ucSubPresetChanged()"><option value="3">Last 3 Days</option><option value="7">Last 1 Week</option><option value="14">Last 2 Weeks</option><option value="21">Last 3 Weeks</option><option value="30" selected>Last 1 Month</option><option value="60">Last 2 Months</option><option value="90">Last 3 Months</option><option value="custom">Custom Date Range</option></select></div>
        <div class="field"><label>From Date</label><input id="ucSubFrom" type="date"></div><div class="field"><label>To Date</label><input id="ucSubTo" type="date"></div>
        <div class="field"><label>View</label><select id="ucSubView"><option value="daily">Daily Subscriptions</option><option value="total">Period Total</option></select></div>
        <button class="btn compact" type="button" onclick="loadUCSubscriptionAnalytics(this)">Apply</button>
      </div><div id="ucSubAnalyticsBody"><div class="notice">Select a period to view subscription activity.</div></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCSubscriptionAnalytics=()=>$('#ucSubscriptionAnalyticsModal')?.classList.remove('open');
  function setAnalyticsPreset(days='30'){
    if(days==='custom')return;const n=Math.max(1,Number(days)||30);$('#ucSubTo').value=todayLocal();$('#ucSubFrom').value=dateShift(-(n-1));
  }
  window.ucSubPresetChanged=()=>setAnalyticsPreset($('#ucSubPreset')?.value||'30');
  window.openUCSubscriptionAnalytics=function(){ensureAnalyticsModal().classList.add('open');setAnalyticsPreset($('#ucSubPreset')?.value||'30');window.loadUCSubscriptionAnalytics();};
  function countBtn(v,date,type){const n=Number(v||0);return n>0?`<button class="uc-sub-count-link" type="button" onclick="openUCSubscriptionEventDetails('${H(date)}','${H(type)}')">${n}</button>`:'0';}
  function periodCountBtn(v,type){const n=Number(v||0);return n>0?`<button class="uc-sub-count-link" type="button" onclick="openUCSubscriptionPeriodDetails('${H(type)}')">${n}</button>`:'0';}
  function analyticsGrid(r,view){
    if(view==='total'){
      const t=r.totals||{};
      return `<div class="uc-sub-daily-wrap"><div class="uc-sub-daily-grid uc-sub-daily-head"><div>Period</div><div>New</div><div>Successful</div><div>Renewals</div><div>Failed</div><div>Cancelled</div><div>Amount</div></div><div class="uc-sub-daily-grid uc-sub-daily-row"><div>${H(fmtShortDate(r.from))} – ${H(fmtShortDate(r.to))}</div><div>${periodCountBtn(t.new,'new')}</div><div>${periodCountBtn(t.successful,'successful')}</div><div>${periodCountBtn(t.renewed,'renewed')}</div><div>${periodCountBtn(t.failed,'failed')}</div><div>${periodCountBtn(t.cancelled,'cancelled')}</div><div>${money(t.amount_paise||0)}</div></div></div>`;
    }
    return `<div class="uc-sub-daily-wrap"><div class="uc-sub-daily-grid uc-sub-daily-head"><div>Date</div><div>New</div><div>Successful</div><div>Renewals</div><div>Failed</div><div>Cancelled</div><div>Amount</div></div>${(r.rows||[]).slice().reverse().map(x=>`<div class="uc-sub-daily-grid uc-sub-daily-row"><div>${H(fmtShortDate(x.date))}</div><div>${countBtn(x.new,x.date,'new')}</div><div>${countBtn(x.successful,x.date,'successful')}</div><div>${countBtn(x.renewed,x.date,'renewed')}</div><div>${countBtn(x.failed,x.date,'failed')}</div><div>${countBtn(x.cancelled,x.date,'cancelled')}</div><div>${money(x.amount_paise||0)}</div></div>`).join('')}</div>`;
  }
  function renderAnalytics(r){
    state.analytics=r;const body=$('#ucSubAnalyticsBody');if(!body)return;
    if(r.configured===false){body.innerHTML='<div class="notice">Enable a Payment Gateway in Payments to load live subscription information.</div>';return;}
    const t=r.totals||{},view=$('#ucSubView')?.value||'daily';
    body.innerHTML=`${r.partial_history?'<div class="notice">Live subscription status is complete. Detailed historical payment activity is limited to the most recent matched subscriptions during this refresh.</div>':''}<div class="uc-sub-summary-cards"><div><strong>${H(fmtShortDate(r.from))} – ${H(fmtShortDate(r.to))}</strong><small>Selected period</small></div><div><strong>${money(t.amount_paise||0)}</strong><small>Subscription amount received</small></div><div><strong>${money(r.average_amount_paise||0)}</strong><small>Average received per day</small></div><div><strong>${Number(t.successful||0)}</strong><small>Successful subscription charges</small></div></div>${analyticsGrid(r,view)}`;
  }
  window.loadUCSubscriptionAnalytics=async function(btn){
    const from=$('#ucSubFrom')?.value,to=$('#ucSubTo')?.value,body=$('#ucSubAnalyticsBody');if(!from||!to){body.innerHTML='<div class="notice">Select both dates, then click Apply.</div>';return;}
    btn?.classList.add('spinning');if(body)body.innerHTML='<div class="notice">Fetching live subscription activity…</div>';
    try{const r=await api(`/api/admin/subscription-overview?mode=analytics&from=${enc(from)}&to=${enc(to)}`);renderAnalytics(r);await window.loadUCSubscriptionOverview();}catch(e){body.innerHTML=`<div class="error">${H(e.message||'Could not load subscription activity.')}</div>`;}finally{btn?.classList.remove('spinning');}
  };

  function ensureDetailModal(){
    let m=$('#ucSubscriptionDetailModal');if(m)return m;m=document.createElement('div');m.id='ucSubscriptionDetailModal';m.className='modal uc-sub-detail-modal';m.innerHTML=`<div class="modal-card wide uc-sub-detail-card"><div class="top uc-sub-modal-head"><div><h2 id="ucSubDetailTitle">Subscription Details</h2><p id="ucSubDetailDesc" class="muted"></p></div><button class="btn secondary compact" type="button" onclick="closeUCSubscriptionDetail()">Back</button></div><div id="ucSubDetailBody"></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCSubscriptionDetail=()=>$('#ucSubscriptionDetailModal')?.classList.remove('open');
  window.openUCSubscriptionPeriodDetails=function(type){
    const all=[];Object.values(state.analytics?.details||{}).forEach(day=>{(day?.[type]||[]).forEach(x=>all.push(x));});
    openSubscriptionDetailRows(all,type,`${fmtShortDate(state.analytics?.from)} – ${fmtShortDate(state.analytics?.to)}`);
  };
  function openSubscriptionDetailRows(rows,type,periodLabel){
    const m=ensureDetailModal();$('#ucSubDetailTitle').textContent=`${TYPE_LABELS[type]||type} — ${periodLabel}`;$('#ucSubDetailDesc').textContent='Click a client name to open complete client details.';
    const body=$('#ucSubDetailBody');body.innerHTML=rows.length?`<div class="uc-sub-detail-wrap"><div class="uc-sub-detail-grid uc-sub-detail-head"><div>Name</div><div>Phone</div><div>Amount</div><div>Subscription Start</div><div>Successful Cycles</div><div>Status</div><div>Reason</div></div>${rows.map(x=>`<div class="uc-sub-detail-grid uc-sub-detail-row"><div>${clientLink(x)}</div><div>${H(x.phone||'-')}</div><div>${money(x.amount_paise||0)}</div><div>${H(fmtDate(x.start_at||x.created_at))}</div><div>${Number(x.paid_count||0)}</div><div>${H(x.status_label||x.status||type)}</div><div class="uc-wrap-cell">${H(x.reason||'-')}</div></div>`).join('')}</div>`:'<div class="notice">No client records are available for this item.</div>';m.classList.add('open');
  }
  window.openUCSubscriptionEventDetails=function(date,type){
    const r=state.analytics,rows=r?.details?.[date]?.[type]||[];state.detail={date,type};openSubscriptionDetailRows(rows,type,fmtDate(date));
  };

  /* ---------- Storage panel ---------- */
  function ensureStoragePanel(){
    let p=$('#storage');if(p)return p;const main=$('main.main');if(!main)return null;
    p=document.createElement('section');p.id='storage';p.className='panel';p.innerHTML=`<div class="top"><div><h1>Storage</h1><p class="muted">Review available space and safely remove eligible old or expired records.</p></div><div id="ucStorageBattery" class="uc-storage-battery good"><span class="uc-storage-battery-fill"></span><strong>Loading…</strong></div></div><div id="ucStorageBody"><div class="notice">Loading storage information…</div></div>`;main.appendChild(p);return p;
  }
  function storageTone(remaining){remaining=Number(remaining||0);return remaining<20?'danger':remaining<40?'warn':remaining<60?'watch':'good';}
  function storageSummaryHtml(r){
    const tone=storageTone(r.remaining_percent),used=Math.max(0,Math.min(100,Number(r.used_percent||0)));
    return `<div class="uc-storage-hero"><div class="uc-storage-meter ${tone}"><div class="uc-storage-meter-track"><span style="width:${used}%"></span></div><div class="uc-storage-meter-labels"><strong>${H(r.remaining_label)} available</strong><span>${Number(r.remaining_percent||0).toFixed(1)}% remaining</span></div></div><div class="uc-storage-summary"><div><strong>${H(r.allocated_label)}</strong><small>Allocated</small></div><div><strong>${H(r.used_label)}</strong><small>Used</small></div><div><strong>${H(r.remaining_label)}</strong><small>Remaining</small></div></div><div class="uc-storage-upgrade"><p>Need more storage later? Contact Instautomate to upgrade the available capacity.</p><a class="btn secondary compact" href="https://instautomate.com" target="_blank" rel="noopener">Contact for Upgrade</a></div></div><div class="uc-storage-safe-note"><strong>Protected information stays protected.</strong> Current client, order, subscription, payment, refund and profile information is not offered for cleanup here. Cleanup actions remove records only; reusable fields and structure stay unchanged.</div><div class="uc-storage-cleanup-head"><div><h2>Safe Cleanup</h2><p class="muted">Only expired or old information that can be safely cleared is shown below.</p></div><button class="btn secondary compact" type="button" onclick="loadUCStorage(this)">Refresh</button></div><div class="uc-storage-category-grid">${(r.categories||[]).map(c=>`<article class="uc-storage-category-card"><div><h3>${H(c.label)}</h3><p>${H(c.description)}</p></div><div class="uc-storage-category-meta"><span><strong>${Number(c.count||0)}</strong><small>Eligible items</small></span><span><strong>${H(formatBytes(c.approx_bytes||0))}</strong><small>Approx. data</small></span></div><button class="btn secondary compact" type="button" ${Number(c.count||0)?'': 'disabled'} onclick="openUCStorageCleanup('${H(c.key)}')">Review</button></article>`).join('')}</div>`;
  }
  function formatBytes(n){n=Math.max(0,Number(n||0));if(n>=1073741824)return`${(n/1073741824).toFixed(2)} GB`;if(n>=1048576)return`${(n/1048576).toFixed(2)} MB`;if(n>=1024)return`${(n/1024).toFixed(1)} KB`;return`${Math.round(n)} B`;}
  function renderStorage(r){state.storage=r;const body=$('#ucStorageBody');if(body)body.innerHTML=storageSummaryHtml(r);const b=$('#ucStorageBattery');if(b){const tone=storageTone(r.remaining_percent);b.className=`uc-storage-battery ${tone}`;b.querySelector('.uc-storage-battery-fill').style.width=`${Math.max(0,Math.min(100,Number(r.remaining_percent||0)))}%`;b.querySelector('strong').textContent=`${Number(r.remaining_percent||0).toFixed(0)}% available`;}}
  window.loadUCStorage=async function(btn){ensureStoragePanel();btn?.classList.add('loading');try{const r=await api('/api/admin/storage');renderStorage(r);}catch(e){const body=$('#ucStorageBody');if(body)body.innerHTML=`<div class="error">${H(e.message||'Could not load storage information.')}</div>`;}finally{btn?.classList.remove('loading');}};

  function ensureCleanupModal(){
    let m=$('#ucStorageCleanupModal');if(m)return m;m=document.createElement('div');m.id='ucStorageCleanupModal';m.className='modal uc-storage-modal';m.innerHTML=`<div class="modal-card wide uc-storage-modal-card"><div class="top uc-sub-modal-head"><div><h2 id="ucStorageCleanupTitle">Safe Cleanup</h2><p id="ucStorageCleanupDesc" class="muted"></p></div><button class="btn secondary compact" type="button" onclick="closeUCStorageCleanup()">Close</button></div><div id="ucStorageCleanupBody"></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCStorageCleanup=()=>$('#ucStorageCleanupModal')?.classList.remove('open');
  window.ucStorageSelectAll=function(checked){$$('#ucStorageCleanupBody input[data-storage-id]').forEach(x=>x.checked=checked);};
  function renderCleanupRows(r){
    state.storageRows=r.rows||[];const body=$('#ucStorageCleanupBody');if(!body)return;
    body.innerHTML=state.storageRows.length?`<div class="uc-storage-cleanup-toolbar"><label><input type="checkbox" onchange="ucStorageSelectAll(this.checked)"> Select all shown</label><span>Showing ${state.storageRows.length}${state.storageRows.length>=Number(r.limit||200)?' eligible items at a time':''}</span></div><div class="uc-storage-list-wrap"><div class="uc-storage-list-grid uc-storage-list-head"><div>Select</div><div>Item</div><div>Details</div><div>Date</div><div>Approx. Size</div></div>${state.storageRows.map(x=>`<div class="uc-storage-list-grid uc-storage-list-row"><div><input type="checkbox" data-storage-id="${H(x.id??x.visitor_id??'')}" aria-label="Select item"></div><div class="uc-wrap-cell">${H(x.title||'-')}</div><div class="uc-wrap-cell">${H(x.detail||'-')}</div><div>${H(fmtDate(x.date_value))}</div><div>${H(x.approx_label||formatBytes(x.approx_bytes||0))}</div></div>`).join('')}</div><div class="uc-storage-delete-actions"><button class="btn danger compact" type="button" onclick="confirmUCStorageDelete('selected')">Delete Selected</button><button class="btn danger compact" type="button" onclick="confirmUCStorageDelete('all')">Delete All Eligible</button></div>`:'<div class="notice">There is nothing eligible to clean in this category.</div>';
  }
  window.openUCStorageCleanup=async function(category){state.storageCategory=category;const m=ensureCleanupModal(),def=state.storage?.categories?.find(x=>x.key===category);$('#ucStorageCleanupTitle').textContent=def?.label||'Safe Cleanup';$('#ucStorageCleanupDesc').textContent=def?.description||'Review eligible records before deleting.';m.classList.add('open');$('#ucStorageCleanupBody').innerHTML='<div class="notice">Loading eligible records…</div>';try{renderCleanupRows(await api(`/api/admin/storage?mode=list&category=${enc(category)}`));}catch(e){$('#ucStorageCleanupBody').innerHTML=`<div class="error">${H(e.message)}</div>`;}};

  function ensureConfirmModal(){
    let m=$('#ucStorageConfirmModal');if(m)return m;m=document.createElement('div');m.id='ucStorageConfirmModal';m.className='modal uc-storage-confirm-modal';m.innerHTML=`<div class="modal-card uc-storage-confirm-card"><h2>Confirm Permanent Delete</h2><div class="uc-storage-warning"><strong>This action cannot be recovered.</strong><p id="ucStorageConfirmText">Only the selected eligible records will be permanently removed.</p></div><div class="uc-storage-confirm-actions"><button class="btn secondary compact" type="button" onclick="closeUCStorageConfirm()">Cancel</button><button id="ucStorageConfirmDeleteBtn" class="btn danger compact" type="button">Yes, Delete Permanently</button></div></div>`;document.body.appendChild(m);return m;
  }
  window.closeUCStorageConfirm=()=>$('#ucStorageConfirmModal')?.classList.remove('open');
  window.confirmUCStorageDelete=function(which){
    const ids=$$('#ucStorageCleanupBody input[data-storage-id]:checked').map(x=>x.dataset.storageId).filter(Boolean);
    if(which==='selected'&&!ids.length){toast('Select at least one item first.',true);return;}
    const m=ensureConfirmModal();$('#ucStorageConfirmText').textContent=which==='all'?'All currently eligible records in this cleanup category will be permanently removed. Protected information is not included.':`${ids.length} selected eligible item(s) will be permanently removed. Protected information is not included.`;
    const btn=$('#ucStorageConfirmDeleteBtn');btn.onclick=()=>deleteUCStorage(which,ids,btn);m.classList.add('open');
  };
  async function deleteUCStorage(which,ids,btn){
    const old=btn.textContent;btn.disabled=true;btn.textContent='Deleting…';
    try{const r=await api('/api/admin/storage',{method:'POST',body:JSON.stringify({action:which==='all'?'delete_all':'delete_selected',category:state.storageCategory,ids})});window.closeUCStorageConfirm();toast(`${Number(r.deleted||0)} item(s) removed${r.approx_cleared_bytes?` • about ${r.approx_cleared_label} cleared`:''}.`);renderStorage(r.storage);await window.openUCStorageCleanup(state.storageCategory);}catch(e){toast(e.message||'Cleanup could not be completed.',true);}finally{btn.disabled=false;btn.textContent=old;}
  }

  /* Keep subscription cards refreshed whenever the existing dashboard refreshes. */
  const priorLoad=window.load_dashboard;
  if(typeof priorLoad==='function')window.load_dashboard=async function(){const r=await priorLoad.apply(this,arguments);await window.loadUCSubscriptionOverview().catch(()=>{});return r;};

  function init(){ensureListModal();ensureAnalyticsModal();ensureDetailModal();ensureStoragePanel();ensureCleanupModal();ensureConfirmModal();setAnalyticsPreset('30');if($('#dashboard')?.classList.contains('active'))window.loadUCSubscriptionOverview().catch(()=>{});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,180));else setTimeout(init,180);
})();
