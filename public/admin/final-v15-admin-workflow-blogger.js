/* DropBeat Dance Studio V15 — additive admin workflow polish, inquiry lifecycle, visitor details and direct Blogger OAuth UI. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;});
  const titleCase=s=>String(s||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const localDate=v=>{if(!v)return'-';try{return new Date(String(v).replace(' ','T')+(String(v).includes('Z')?'':'Z')).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});}catch{return String(v)}};

  /* ---------- Orders: UI-only compact action stack + two additive lifecycle choices. ---------- */
  function enhanceOrderActionStacks(){
    $$('.uc-v13-order-action-stack').forEach(stack=>{
      if(stack.dataset.ucV15==='1')return;
      const select=stack.querySelector('select'),save=stack.querySelector('button'); if(!select||!save)return;
      if(![...select.options].some(o=>o.value==='cancelled'))select.add(new Option('Cancellation','cancelled'));
      if(![...select.options].some(o=>o.value==='failed'))select.add(new Option('Failed','failed'));
      select.classList.add('uc-v15-native-order-status');
      const wrap=document.createElement('div');wrap.className='uc-v15-order-status';
      const trigger=document.createElement('button');trigger.type='button';trigger.className='uc-v15-order-status-trigger';
      const menu=document.createElement('div');menu.className='uc-v15-order-status-menu';menu.hidden=true;
      const sync=()=>{trigger.innerHTML=`<span>${H(select.options[select.selectedIndex]?.text||'In Process')}</span><span aria-hidden="true">⌄</span>`;};
      [...select.options].forEach(opt=>{const b=document.createElement('button');b.type='button';b.className='uc-v15-order-status-option';b.textContent=opt.text;b.dataset.value=opt.value;b.onclick=e=>{e.stopPropagation();select.value=opt.value;sync();menu.hidden=true;wrap.classList.remove('open');};menu.appendChild(b);});
      trigger.onclick=e=>{e.stopPropagation();const open=menu.hidden;$$('.uc-v15-order-status-menu').forEach(x=>x.hidden=true);$$('.uc-v15-order-status').forEach(x=>x.classList.remove('open'));menu.hidden=!open;wrap.classList.toggle('open',open);};
      wrap.append(trigger,menu);select.insertAdjacentElement('afterend',wrap);save.classList.add('uc-v15-order-save');stack.classList.add('uc-v15-order-action-stack');stack.dataset.ucV15='1';sync();
    });
  }
  document.addEventListener('click',()=>{$$('.uc-v15-order-status-menu').forEach(x=>x.hidden=true);$$('.uc-v15-order-status').forEach(x=>x.classList.remove('open'));});
  const previousLoadOrders=window.load_orders;
  if(typeof previousLoadOrders==='function')window.load_orders=async function(){const r=await previousLoadOrders.apply(this,arguments);enhanceOrderActionStacks();return r;};
  window.saveNewOrderStatus=async function(orderId){
    const value=document.getElementById(`newStatus_${String(orderId)}`)?.value||'in_process';
    const actionMap={in_process:'process',delivered:'deliver',completed:'deliver',reviewed:'review',cancelled:'mark_cancelled',failed:'mark_failed'};
    const action=actionMap[value]||'process';
    try{await apiJson('/api/admin/orders',{method:'PUT',body:JSON.stringify({order_id:orderId,status:value,action})});await window.load_orders?.();}
    catch(e){alert(e.message||'Could not update the order status.');}
  };

  /* ---------- Enquiries: submission-level workflow, without changing the CRM lead status. ---------- */
  function ensureInquiryPanel(){
    const panel=$('#leads'); if(!panel)return;
    panel.querySelector('.top h1')&&(panel.querySelector('.top h1').textContent='Enquiries');
    const notice=panel.querySelector(':scope > .notice');if(notice)notice.textContent='Contact form inquiries appear here. Work on In Progress inquiries, resolve them when complete, and keep resolved history available from the Resolved filter and Client Details.';
    let tabs=panel.querySelector('.uc-v15-inquiry-tabs')||panel.querySelector('.tabs');
    if(tabs){tabs.className='tabs uc-v15-inquiry-tabs';tabs.innerHTML=`<button class="pill" data-inquiry-status="all" onclick="ucV15InquiryFilter('all',this)">All</button><button class="pill" data-inquiry-status="new" onclick="ucV15InquiryFilter('new',this)">New</button><button class="pill active" data-inquiry-status="in_progress" onclick="ucV15InquiryFilter('in_progress',this)">In Progress</button><button class="pill" data-inquiry-status="resolved" onclick="ucV15InquiryFilter('resolved',this)">Resolved</button>`;}
  }
  const inquiryStatusBadge=s=>{const v=String(s||'in_progress').toLowerCase();const cls=v==='resolved'?'active':v==='new'?'new':'pending';return `<span class="status ${cls}">${H(titleCase(v))}</span>`;};
  function inquiryTable(rows){return `<table class="table fixed-table uc-v15-inquiry-table"><thead><tr><th>Lead</th><th>Contact</th><th>Message / Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td class="text-cell"><button class="link-button" type="button" onclick="openClientDetails('lead:${Number(x.lead_id)}')"><strong>${H(x.name||'Client')}</strong></button><br><small>${H(localDate(x.created_at))}</small></td><td class="text-cell">${H(x.phone||'-')}<br><small>${H(x.email||'')}</small></td><td class="text-cell">${H(x.message||'-')}<br><small>${H(x.source_detail||'/contact')}</small></td><td>${inquiryStatusBadge(x.inquiry_status)}</td><td><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit client" aria-label="Edit client" onclick="openLeadEditor(${Number(x.lead_id)})">✎</button>${String(x.inquiry_status)!=='resolved'?`<button class="btn secondary small icon-action" type="button" title="Mark inquiry resolved" aria-label="Mark inquiry resolved" onclick="ucV15SetInquiryStatus(${Number(x.inquiry_id)},'resolved')">✓</button>`:''}<button class="btn danger small icon-action" type="button" title="Delete inquiry permanently" aria-label="Delete inquiry permanently" onclick="ucV15DeleteInquiry(${Number(x.inquiry_id)})">×</button></div></td></tr>`).join(''):'<tr class="empty-row"><td colspan="5">No inquiries found for this filter.</td></tr>'}</tbody></table>`;}
  window.__inquiryStatus='in_progress';
  window.load_leads=async function(status){
    ensureInquiryPanel(); const wanted=String(status||window.__inquiryStatus||'in_progress'); window.__inquiryStatus=wanted;
    $$('.uc-v15-inquiry-tabs .pill').forEach(b=>b.classList.toggle('active',b.dataset.inquiryStatus===wanted));
    const box=$('#leadsTable');if(box)box.innerHTML='<div class="notice">Loading inquiries…</div>';
    try{const q=$('#leadSearch')?.value||'';const params=new URLSearchParams({mode:'inquiries',status:wanted});if(q)params.set('q',q);const r=await apiJson('/api/admin/leads?'+params);window.A=window.A||{};A.inquiries=r.inquiries||[];if(box)box.innerHTML=inquiryTable(A.inquiries);}
    catch(e){if(box)box.innerHTML=`<div class="error">${H(e.message||'Could not load inquiries.')}</div>`;}
  };
  window.ucV15InquiryFilter=function(status,btn){window.__inquiryStatus=status;$$('.uc-v15-inquiry-tabs .pill').forEach(x=>x.classList.toggle('active',x===btn));window.load_leads(status);};
  window.ucV15SetInquiryStatus=async function(id,status){try{await apiJson('/api/admin/leads',{method:'POST',body:JSON.stringify({action:'inquiry_status',inquiry_id:id,status})});await window.load_leads(window.__inquiryStatus);await window.load_dashboard?.();}catch(e){alert(e.message||'Could not update inquiry.');}};
  window.ucV15DeleteInquiry=async function(id){if(!confirm('Delete this inquiry permanently? The client record will remain available, but this inquiry entry cannot be restored.'))return;try{await apiJson(`/api/admin/leads?inquiry_id=${encodeURIComponent(id)}`,{method:'DELETE'});await window.load_leads(window.__inquiryStatus);await window.load_dashboard?.();}catch(e){alert(e.message||'Could not delete inquiry.');}};
  window.openDashboardInquiries=function(){window.tab?.('leads');setTimeout(()=>{const b=$('.uc-v15-inquiry-tabs [data-inquiry-status="in_progress"]');window.ucV15InquiryFilter?.('in_progress',b);},40);};
  window.openDashboardRequests=function(){window.tab?.('requests');setTimeout(()=>{const b=$('.uc-v11-request-tabs [data-request-status="in_progress"]');if(window.ucV11RequestFilter)window.ucV11RequestFilter('in_progress',b);},40);};

  /* ---------- Visitors dashboard cards: modal mirrors Recent Visitor Journey. ---------- */
  function sourcePills(value){const vals=[...new Set(String(value||'Direct / unknown').split(',').map(x=>x.trim()).filter(Boolean))];return `<div class="uc-v15-source-list">${vals.map(x=>`<span class="status">${H(x)}</span>`).join('')}</div>`;}
  window.openUCVisitorModal=async function(kind='all'){
    const modal=$('#listModal'),box=$('#dashboardListBox'),title=$('#listModalTitle');if(!modal||!box)return;
    modal.querySelector('.modal-card')?.classList.add('uc-v15-visitor-modal-card');title.textContent=kind==='repeat'?'Repeat Visitors':'Visitors';box.innerHTML='<div class="notice">Loading visitor journey…</div>';modal.classList.add('open');
    try{const r=await apiJson(`/api/admin/visitor-info?type=${kind==='repeat'?'repeat':'all'}`),rows=r.recent||[];box.innerHTML=rows.length?`<div class="table-wrap uc-v15-visitor-wrap"><table class="table uc-v15-visitor-table"><thead><tr><th>Visitor / Lead</th><th>Latest Visit</th><th>Visits</th><th>Visitor Type</th><th>Sources</th><th>Pages</th></tr></thead><tbody>${rows.map(x=>{const linked=Number(x.lead_id||0)>0&&(x.lead_name||x.lead_phone||x.lead_email);const who=linked?`<button class="link-button" type="button" onclick="openClientDetails('lead:${Number(x.lead_id)}')"><strong>${H(x.lead_name||x.lead_phone||x.lead_email||'Client')}</strong></button><br><small>${H(x.lead_phone||x.lead_email||'')}</small>`:`<strong class="uc-v15-visitor-id">${H(x.visitor_id||'-')}</strong>`;return `<tr><td class="text-cell">${who}</td><td>${H(localDate(x.last_seen))}</td><td>${Number(x.visits||0)}</td><td><span class="status ${Number(x.visits||0)>1?'active':'draft'}">${Number(x.visits||0)>1?'Repeat':'Unique'}</span></td><td class="text-cell">${sourcePills(x.sources)}</td><td class="text-cell uc-v15-pages">${H(String(x.pages||'/').split(',').join(', '))}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="notice">No visitor records found yet.</div>';}
    catch(e){box.innerHTML=`<div class="error">${H(e.message||'Could not load visitor details.')}</div>`;}
  };

  /* ---------- Subscribers: single render prevents the two-step visual twitch. ---------- */
  function isLostSubscriber(s){return ['cancelled','expired','unsubscribed','inactive','failed','halted'].includes(String(s.subscription_status||'').toLowerCase());}
  function subscriberTable(rows,empty){return rows.length?`<table class="table fixed-table subscriber-table"><thead><tr><th>Name</th><th>Phone</th><th>Email / City</th><th>Plan</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows.map(s=>`<tr><td><button class="link-button" type="button" onclick="openClientDetails('subscriber:${Number(s.id)}')">${H(s.name||'-')}</button></td><td>${H(s.phone||'-')}</td><td class="text-cell"><small>${H(s.email||'')}</small><br><small>${H(s.city||'')}</small></td><td class="text-cell"><strong>${H(s.plan_name||'-')}</strong><br><small>${H(s.gateway_subscription_id||'')}</small></td><td><span class="status">${H(titleCase(s.subscription_status||'-'))}</span></td><td class="text-cell"><small>${H(s.notes||'')}</small></td></tr>`).join('')}</tbody></table>`:`<div class="notice">${H(empty)}</div>`;}
  window.load_subscribers=async function(){const q=$('#subscriberSearch')?.value||'';try{const r=await apiJson('/api/admin/subscribers'+(q?`?q=${encodeURIComponent(q)}`:'')),all=r.subscribers||[];window.A=window.A||{};A.subscribers=all;A.activeSubscribers=all.filter(s=>!isLostSubscriber(s));A.lostSubscribers=all.filter(isLostSubscriber);const active=$('#subscribersTable'),lost=$('#subscriberLostTable');if(active)active.innerHTML=subscriberTable(A.activeSubscribers,'No active subscribers found.');if(lost)lost.innerHTML=subscriberTable(A.lostSubscribers,'No unsubscribed or cancelled customers found.');}catch(e){const active=$('#subscribersTable');if(active)active.innerHTML=`<div class="error">${H(e.message)}</div>`;}};

  /* ---------- Direct Blogger connection UI. ---------- */
  async function loadApiSettingsV15(){
    const r=await apiJson('/api/admin/api-settings');window.A=window.A||{};A.api=r;
    const set=(id,v)=>{const el=$('#'+id);if(el)el.value=v??'';};
    set('apiBaseUrl',r.apiBaseUrl||'');set('vendorUserId',r.vendorUserId||'dropbeat-dance-studio');set('apiBearerToken',r.apiToken||'');set('authHeaderExample',r.apiToken?`Authorization: Bearer ${r.apiToken}`:'');set('bloggerClientId',r.bloggerClientId||'');set('bloggerClientSecret','');set('bloggerApiKey',r.bloggerApiKey||'');set('bloggerRedirectUri',r.bloggerRedirectUri||'');
    const secret=$('#bloggerClientSecret');if(secret)secret.placeholder=r.bloggerClientSecretMasked?`Saved: ${r.bloggerClientSecretMasked} — leave blank to keep it`:'Paste the Web application Client Secret';
    const select=$('#bloggerBlogId');if(select){const blogs=Array.isArray(r.bloggerAvailableBlogs)?r.bloggerAvailableBlogs:[];select.innerHTML=`<option value="">${r.bloggerConnected?(blogs.length?'Choose the Blogger blog':'No Blogger blogs found'):'Connect Blogger first, then choose a blog'}</option>${blogs.map(x=>`<option value="${H(x.id)}">${H(x.name||x.url||x.id)}${x.url?` — ${H(x.url)}`:''}</option>`).join('')}`;select.value=String(r.bloggerBlogId||'');}
    const status=$('#bloggerConnectionStatus');if(status)status.innerHTML=r.bloggerConnected?`<strong>Connected${r.bloggerConnectedUser?` as ${H(r.bloggerConnectedUser)}`:''}.</strong> ${r.bloggerBlogId?`Selected blog: ${H(r.bloggerBlogName||r.bloggerBlogId)}.`:'Choose a Blogger blog below and save the settings.'}`:'<strong>Not connected.</strong> Save the Google OAuth Client ID and Client Secret, then click Connect Blogger.';
    const endpoints=$('#apiEndpointList');if(endpoints)endpoints.innerHTML=(r.endpoints||[]).map(e=>`<div class="endpoint"><strong>${H(e.method)}</strong><input readonly value="${H(e.url)}"><button class="btn secondary small" onclick="copyText('${H(e.url)}')">Copy</button><small>${H(e.purpose)}</small></div>`).join('');
    const wh=$('#webhookList');if(wh)wh.innerHTML=Object.entries(r.webhookEndpoints||{}).map(([k,v])=>`<div class="endpoint"><strong>${H(k)}</strong><input readonly value="${H(v)}"><button class="btn secondary small" onclick="copyText('${H(v)}')">Copy</button></div>`).join('');
    const docs=$('#apiDocs');if(docs)docs.innerHTML=`<strong>Required automation header:</strong> Authorization: Bearer YOUR_API_TOKEN<br><strong>Content-Type:</strong> application/json<br><strong>Vendor User ID:</strong> ${H(r.vendorUserId||'dropbeat-dance-studio')}<br><br><strong>Blogger:</strong> Direct Blogger publishing uses the Google OAuth connection above. n8n is optional and the automation endpoints remain available when you want them later.`;
    return r;
  }
  window.load_apiSettings=loadApiSettingsV15;
  async function saveApiSettingsV15(silent=false){const payload={vendorUserId:$('#vendorUserId')?.value||'dropbeat-dance-studio',bloggerBlogId:$('#bloggerBlogId')?.value||'',bloggerApiKey:$('#bloggerApiKey')?.value||'',bloggerClientId:$('#bloggerClientId')?.value||'',bloggerClientSecret:$('#bloggerClientSecret')?.value||''};await apiJson('/api/admin/api-settings',{method:'POST',body:JSON.stringify(payload)});if(!silent&&window.msg)msg('#apiMsg','API and Blogger settings saved.');return await loadApiSettingsV15();}
  window.saveVendorId=()=>saveApiSettingsV15(false);
  window.connectBlogger=async function(){try{await saveApiSettingsV15(true);const r=await apiJson('/api/admin/blogger-auth');if(!r.authorizationUrl)throw new Error('Google authorization URL was not created.');window.location.href=r.authorizationUrl;}catch(e){window.msg?msg('#apiMsg',e.message,'error'):alert(e.message);}};
  window.disconnectBlogger=async function(){if(!confirm('Disconnect Blogger from this website? Existing Blogger posts will not be deleted.'))return;try{await apiJson('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'disconnect'})});await loadApiSettingsV15();window.msg&&msg('#apiMsg','Blogger disconnected.');}catch(e){window.msg?msg('#apiMsg',e.message,'error'):alert(e.message);}};
  function patchAuditionBloggerHelp(){const form=$('#blogForm');if(!form)return;form.querySelectorAll('.blogger-required-note').forEach(x=>x.remove());form.insertAdjacentHTML('afterbegin','<div class="blogger-required-note"><strong>Direct Blogger publishing:</strong> Connect Blogger in Settings → Integrations → SEO. Published audition updates are then posted directly to the selected Blogger blog; n8n is optional. Drafts can still be saved before Blogger is connected.</div>');$$('.blog-limit-hint',form).forEach(x=>{if(/Published only after SEO|SEO is configured/i.test(x.textContent||''))x.textContent='Draft keeps it hidden. Published posts directly to the connected Blogger blog and the DropBeat Dance Studio Audition Updates page.';});}
  const previousSaveBlog=window.saveBlogAudition;
  if(typeof previousSaveBlog==='function')window.saveBlogAudition=async function(ev,statusOverride){const f=$('#blogForm'),status=statusOverride||f?.elements?.status?.value||'draft';if(status==='published'){try{if(!A.api||!A.api.bloggerConnected)await loadApiSettingsV15();if(!A.api?.bloggerConnected||!String(A.api?.bloggerBlogId||'').trim()){ev?.preventDefault?.();window.msg&&msg('#blogMsg','Connect Blogger and choose a Blogger blog in Settings → Integrations → SEO before publishing. Save as Draft is still available.','error');return;}}catch(e){ev?.preventDefault?.();window.msg&&msg('#blogMsg',e.message,'error');return;}}return previousSaveBlog(ev,statusOverride);};

  /* ---------- Final tab hooks. ---------- */
  const previousTab=window.tab;
  if(typeof previousTab==='function')window.tab=function(id){const r=previousTab.apply(this,arguments);if(id==='leads')setTimeout(()=>{ensureInquiryPanel();window.load_leads(window.__inquiryStatus||'in_progress');},30);if(id==='orders')setTimeout(enhanceOrderActionStacks,40);if(id==='blogs')setTimeout(patchAuditionBloggerHelp,180);return r;};

  function init(){ensureInquiryPanel();enhanceOrderActionStacks();patchAuditionBloggerHelp();const p=new URLSearchParams(location.search);if(p.get('blogger')){setTimeout(()=>{window.tab?.('apiSettings');loadApiSettingsV15().then(()=>window.msg&&msg('#apiMsg',p.get('blogger')==='connected'?'Blogger connected. Choose the blog if more than one is available, then save API Settings.':'Blogger connection was not completed. Check the OAuth settings and try again.',p.get('blogger')==='connected'?'notice':'error')).catch(()=>{});},250);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);
})();
