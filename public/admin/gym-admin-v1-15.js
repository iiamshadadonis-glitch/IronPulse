/* DropBeat V1.15 — collapsible coach status and authenticated portal tickets. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(selector)]:[];
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let tickets=[],filter='';

  async function api(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'This request could not be completed.');return data;
  }

  function enhanceCoachStatus(){
    const block=$('#db114CoachLifecycle');if(!block||$(':scope > details',block)||$('.db115-lifecycle-toggle',block))return;
    const open=block.dataset.db115Open==='1',body=document.createElement('div'),toggle=document.createElement('button');
    toggle.type='button';toggle.className='db115-lifecycle-toggle';toggle.setAttribute('aria-expanded',String(open));
    toggle.innerHTML='<span>Coach Account Status</span><span class="db115-lifecycle-arrow" aria-hidden="true">⌄</span>';
    body.className='db115-lifecycle-body';body.hidden=!open;
    while(block.firstChild)body.append(block.firstChild);
    const originalHeading=$('header h3',body);if(originalHeading)originalHeading.remove();
    block.prepend(toggle,body);block.classList.toggle('db115-open',open);
    toggle.addEventListener('click',()=>{
      const next=body.hidden;body.hidden=!next;block.dataset.db115Open=next?'1':'0';block.classList.toggle('db115-open',next);toggle.setAttribute('aria-expanded',String(next));
    });
  }

  function ensureTicketsPanel(){
    let panel=$('#portalTicketsAdmin');if(panel)return panel;
    const main=$('.main');if(!main)return null;
    panel=document.createElement('section');panel.id='portalTicketsAdmin';panel.className='panel';
    panel.innerHTML=`<div class="top"><div><h1>Tickets</h1><p class="muted">Private support tickets from paid members and approved coaches.</p></div><button class="btn secondary compact" type="button" data-db115-ticket-refresh>Refresh</button></div><div class="tabs db115-ticket-tabs"><button class="pill active" type="button" data-ticket-filter="">All</button><button class="pill" type="button" data-ticket-filter="open">Open</button><button class="pill" type="button" data-ticket-filter="in_progress">In Progress</button><button class="pill" type="button" data-ticket-filter="resolved">Resolved</button><button class="pill" type="button" data-ticket-filter="closed">Closed</button></div><div id="db115TicketMessage" aria-live="polite"></div><div class="card"><div data-db115-ticket-list><div class="notice">Open Tickets from Orders &amp; Leads to load them.</div></div></div>`;
    main.append(panel);
    $('[data-db115-ticket-refresh]',panel).onclick=()=>loadTickets();
    $$('[data-ticket-filter]',panel).forEach(button=>button.onclick=()=>{filter=button.dataset.ticketFilter||'';$$('[data-ticket-filter]',panel).forEach(x=>x.classList.toggle('active',x===button));renderTickets();});
    panel.addEventListener('click',event=>{const button=event.target.closest('[data-ticket-edit]');if(button)openTicket(Number(button.dataset.ticketEdit));});
    return panel;
  }
  function ensureTicketsNav(){
    const nav=$('.side .nav'),group=$$('.nav-group',nav).find(item=>item.dataset.groupTitle==='Orders & Leads'),items=$('.nav-group-items',group);if(!items||$('[data-tab="portalTicketsAdmin"]',items))return;
    const button=document.createElement('button');button.type='button';button.className='nav-subitem';button.dataset.tab='portalTicketsAdmin';button.innerHTML='Tickets <span class="nav-badge" id="db115TicketBadge" hidden></span>';button.onclick=()=>window.tab?.('portalTicketsAdmin');items.append(button);
  }
  function ticketMessage(text,type='notice'){const host=$('#db115TicketMessage');if(host)host.innerHTML=text?`<div class="${H(type)}">${H(text)}</div>`:'';}
  function statusPill(value){return `<span class="db115-ticket-status ${H(value)}">${H(String(value||'open').replaceAll('_',' '))}</span>`;}
  function renderTickets(){
    const host=$('[data-db115-ticket-list]'),rows=filter?tickets.filter(item=>item.status===filter):tickets;if(!host)return;
    host.innerHTML=rows.length?`<div class="table-wrap"><table class="table db115-ticket-table"><thead><tr><th>Ticket</th><th>Member</th><th>Issue</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${rows.map(item=>`<tr><td><strong>${H(item.ticket_number)}</strong><small>${H(item.account_role)} · ${H(item.category)}</small></td><td><strong>${H(item.display_name||'Member')}</strong><small>${H(item.email)}</small><small>${H(item.phone||'')}</small></td><td><strong>${H(item.subject)}</strong><p>${H(item.message)}</p></td><td>${statusPill(item.status)}<small>Priority: ${H(item.priority)}</small></td><td>${H(String(item.updated_at||item.created_at||'').replace('T',' ').slice(0,16))}</td><td><button class="btn secondary small" type="button" data-ticket-edit="${Number(item.id)}">Open</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">No tickets match this status.</div>';
    const badge=$('#db115TicketBadge'),count=tickets.filter(item=>['open','in_progress'].includes(item.status)).length;if(badge){badge.hidden=!count;badge.textContent=count>99?'99+':String(count);}
  }
  async function loadTickets(){
    ensureTicketsPanel();const host=$('[data-db115-ticket-list]');if(host)host.innerHTML='<div class="notice">Loading tickets…</div>';
    try{const data=await api('/api/admin/tickets');tickets=data.tickets||[];ticketMessage('');renderTickets();}
    catch(error){if(host)host.innerHTML=`<div class="error">${H(error.message)}</div>`;}
  }
  function ensureModal(){
    let modal=$('#db115TicketModal');if(modal)return modal;modal=document.createElement('div');modal.id='db115TicketModal';modal.className='db114-modal';modal.hidden=true;modal.innerHTML='<div class="db114-modal-card" role="dialog" aria-modal="true"><div class="db114-modal-head"><h2 data-db115-ticket-title>Ticket</h2><button class="db114-close" type="button" aria-label="Close">×</button></div><div class="db114-modal-body" data-db115-ticket-body></div></div>';document.body.append(modal);$('.db114-close',modal).onclick=()=>{modal.hidden=true;document.body.style.overflow='';};modal.addEventListener('click',event=>{if(event.target===modal){modal.hidden=true;document.body.style.overflow='';}});return modal;
  }
  function openTicket(id){
    const item=tickets.find(row=>Number(row.id)===id);if(!item)return;const modal=ensureModal();$('[data-db115-ticket-title]',modal).textContent=`${item.ticket_number} · ${item.subject}`;
    $('[data-db115-ticket-body]',modal).innerHTML=`<div class="db115-ticket-profile"><div><small>Member</small><strong>${H(item.display_name||'Member')}</strong><span>${H(item.account_role)} · ${H(item.email)} · ${H(item.phone||'No phone')}</span></div><div><small>Submitted Issue</small><p>${H(item.message)}</p></div></div><form class="form db115-ticket-form" data-db115-ticket-form><div class="row"><div class="field"><label>Status</label><select name="status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div><div class="field"><label>Priority</label><select name="priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div><div class="field"><label>Reply to Member</label><textarea name="adminReply" rows="6" maxlength="4000" placeholder="Write a clear update for the member or coach">${H(item.admin_reply||'')}</textarea></div><div data-db115-ticket-modal-message></div><div class="form-actions"><button class="btn" type="submit">Save &amp; Notify Member</button></div></form>`;
    const form=$('[data-db115-ticket-form]',modal);form.elements.status.value=item.status;form.elements.priority.value=item.priority;form.onsubmit=async event=>{event.preventDefault();const button=event.submitter,old=button.textContent;button.disabled=true;button.textContent='Saving…';try{const result=await api('/api/admin/tickets',{method:'PUT',body:JSON.stringify({id:item.id,...Object.fromEntries(new FormData(form).entries())})});tickets=result.tickets||[];modal.hidden=true;document.body.style.overflow='';ticketMessage(result.message||'Ticket updated.');renderTickets();}catch(error){$('[data-db115-ticket-modal-message]',modal).innerHTML=`<div class="error">${H(error.message)}</div>`;button.disabled=false;button.textContent=old;}};
    modal.hidden=false;document.body.style.overflow='hidden';
  }
  function patchTab(){
    if(typeof window.tab!=='function'||window.tab.__db115Tickets)return;const previous=window.tab;const wrapped=function(id){ensureTicketsPanel();ensureTicketsNav();const result=previous.apply(this,arguments);if(id==='portalTicketsAdmin')setTimeout(loadTickets,20);return result;};wrapped.__db115Tickets=true;window.tab=wrapped;
  }
  function reconcile(){enhanceCoachStatus();ensureTicketsPanel();ensureTicketsNav();patchTab();}
  function install(){
    reconcile();
    document.addEventListener('dropbeat:admin-ready',()=>{reconcile();loadTickets();});
    document.addEventListener('dropbeat:admin-navigation-ready',reconcile);
    for(const delay of [200,800,1800,4000])setTimeout(reconcile,delay);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
