/* DropBeat V1.15 — paid-student activity, memberships, tickets and mandatory password setup. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(selector)]:[];
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const app=$('.portal-app'),role=app?.dataset.portalRole||'';
  let dashboard=null,tickets=[];

  class PortalError extends Error{constructor(message,contactUrl=''){super(message);this.contactUrl=contactUrl;}}
  async function api(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new PortalError(data.error||'This request could not be completed. Please try again.',data.contactUrl||'');
    return data;
  }
  function message(text,type='',contactUrl=''){
    const box=$('#portalGlobalResult');if(!box)return;
    if(!text){box.className='portal-result';box.replaceChildren();return;}
    box.replaceChildren(document.createTextNode(String(text)));
    if(contactUrl){box.append(document.createTextNode(' '));const a=document.createElement('a');a.href=contactUrl;a.textContent='Contact Us';a.className='portal-result-link';box.append(a);}
    box.className=`portal-result show ${type}`;box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function showExtended(view,push=true){
    const allowed=role==='student'?['memberships','activity','tickets']:['tickets'];if(!allowed.includes(view))return;
    $$('[data-portal-view]').forEach(section=>{section.hidden=section.dataset.portalView!==view;});
    $$('[data-portal-nav]').forEach(button=>button.classList.toggle('active',button.dataset.portalNav===view));
    app?.classList.remove('nav-open');
    if(push)history.replaceState(null,'',`${location.pathname}?view=${encodeURIComponent(view)}`);
    if(view==='tickets')loadTickets();
  }
  function date(value){if(!value)return '—';try{return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:String(value).includes(':')?'short':undefined,timeZone:'Asia/Kolkata'}).format(new Date(String(value).replace(' ','T')+(String(value).includes('Z')?'':'Z')));}catch{return String(value);}}
  function money(paise){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(paise||0)/100);}
  function table(headers,rows,empty){
    if(!rows.length)return `<div class="empty-state">${H(empty)}</div>`;
    return `<div class="portal-table-wrap"><table class="portal-table"><thead><tr>${headers.map(item=>`<th>${H(item)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function memberships(){
    const host=$('[data-portal-memberships]');if(!host||role!=='student')return;
    const products=dashboard?.availablePlans||[];
    if(!products.length){host.innerHTML='<div class="empty-state"><strong>No memberships are available right now.</strong><p>Please check again later or contact the gym.</p></div>';return;}
    host.innerHTML=`<div class="portal-plan-grid">${products.map(product=>{const cover=(product.images||[]).find(image=>Number(image.is_cover||0)===1)||(product.images||[])[0]||{},price=Number(product.offer_price_enabled??1)!==0?product.offer_price_paise:product.regular_price_paise;return `<article class="portal-plan-card"><img src="${H(cover.card_crop_url||cover.public_url||'/assets/product-generic.svg')}" alt="${H(product.name)}"><div><span class="portal-tag">${H(product.badge||product.class_mapping?.class_type?.replaceAll('_',' ')||'Fitness Class')}</span><h3>${H(product.name)}</h3><p>${H(product.short_description||product.description||'View the class schedule and membership details.')}</p><strong class="portal-plan-price">${H(money(price))}</strong><div class="portal-plan-actions"><a class="portal-btn secondary small" href="/offer-details?plan=${encodeURIComponent(product.slug||'')}">Details</a><a class="portal-btn small" href="/offers#${encodeURIComponent(product.slug||'')}">Choose Plan</a></div></div></article>`;}).join('')}</div>`;
  }
  function activity(){
    const host=$('[data-portal-activity]');if(!host||role!=='student')return;
    const activity=dashboard?.activity||{},orders=activity.orders||[],requests=activity.requests||[],inquiries=activity.inquiries||[];
    host.innerHTML=`<div class="portal-stack"><section class="portal-card"><h3>Payments &amp; Membership Orders</h3>${table(['Order','Plan','Amount','Payment','Date'],orders.map(item=>`<tr><td><strong>${H(item.order_id||'—')}</strong></td><td>${H(item.items||'Membership')}</td><td>${H(money(item.amount_paise))}</td><td><span class="portal-pill ${H(item.payment_status||item.status||'')}">${H(item.payment_status||item.status||'Pending')}</span></td><td>${H(date(item.created_at))}</td></tr>`),'No payment or membership order is linked to this email yet.')}</section><section class="portal-card"><h3>Requests</h3>${table(['Request','Details','Status','Updated'],requests.map(item=>`<tr><td><strong>${H(item.request_label||item.request_id||'Request')}</strong></td><td>${H(item.message||'—')}</td><td><span class="portal-pill ${H(item.status)}">${H(item.status||'New')}</span></td><td>${H(date(item.updated_at||item.created_at))}</td></tr>`),'No requests have been submitted.')}</section><section class="portal-card"><h3>Inquiries</h3>${table(['Source','Message','Status','Updated'],inquiries.map(item=>`<tr><td>${H(item.source||'Website')}</td><td>${H(item.message||'—')}</td><td><span class="portal-pill ${H(item.status)}">${H(item.status||'New')}</span></td><td>${H(date(item.updated_at||item.created_at))}</td></tr>`),'No inquiries are linked to this account.')}</section></div>`;
  }
  function renderTickets(){
    const host=$('[data-portal-tickets]');if(!host)return;
    host.innerHTML=`<div class="settings-layout"><section class="portal-card"><h3>Create a Ticket</h3><p>Use tickets for account, class, schedule, payment or technical help. General visitors can continue using Contact Us.</p><form class="auth-form" data-ticket-form><div class="portal-field"><label>Subject</label><input name="subject" required minlength="4" maxlength="180"></div><div class="portal-row"><div class="portal-field"><label>Category</label><select name="category"><option value="class">Class</option><option value="schedule">Schedule</option><option value="payment">Payment</option><option value="account">Account</option><option value="technical">Technical</option><option value="general">General</option></select></div><div class="portal-field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div><div class="portal-field"><label>Describe the Issue</label><textarea name="message" required minlength="10" maxlength="4000"></textarea></div><button class="portal-btn" type="submit">Submit Ticket</button></form></section><section class="portal-card"><h3>Your Tickets</h3>${tickets.length?`<div class="notice-list">${tickets.map(item=>`<article class="notice-item"><strong>${H(item.ticket_number)} · ${H(item.subject)}</strong><span>${H(item.message)}</span><small><span class="portal-pill ${H(item.status)}">${H(item.status)}</span> · ${H(date(item.updated_at))}</small>${item.admin_reply?`<div class="ticket-reply"><strong>Gym reply</strong><p>${H(item.admin_reply)}</p></div>`:''}</article>`).join('')}</div>`:'<div class="empty-state">No support tickets yet.</div>'}</section></div>`;
    $('[data-ticket-form]',host)?.addEventListener('submit',submitTicket);
  }
  async function loadTickets(){
    const host=$('[data-portal-tickets]');if(!host)return;host.innerHTML='<div class="portal-card">Loading tickets…</div>';
    try{const data=await api('/api/portal/tickets');tickets=data.tickets||[];renderTickets();}
    catch(error){host.innerHTML=`<div class="empty-state"><strong>${H(error.message)}</strong>${error.contactUrl?`<p><a class="portal-btn secondary small" href="${H(error.contactUrl)}">Contact Us</a></p>`:''}</div>`;}
  }
  async function submitTicket(event){
    event.preventDefault();const form=event.currentTarget,button=event.submitter,old=button.textContent;button.disabled=true;button.textContent='Submitting…';
    try{const data=await api('/api/portal/tickets',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});tickets=data.tickets||[];message(`${data.message} Ticket number: ${data.ticketNumber}`,'success');renderTickets();}
    catch(error){message(error.message,'error',error.contactUrl);button.disabled=false;button.textContent=old;}
  }
  function scrubSettings(){
    const host=$('[data-settings]');if(!host)return;
    $$('.portal-field',host).forEach(field=>{
      const label=$('label',field),text=label?.textContent?.trim()||'';
      if(text==='Display Name'){label.textContent='Name';const input=$('input',field);if(input)input.name='name';}
      if(text==='Real Name'||text==='Username')field.remove();
      if(text==='New Profile Photo'){
        const input=$('input[type="file"]',field);if(input){input.accept='image/*';input.dataset.maxBytes='15728640';}
        if(!$('.db115-photo-hint',field)){const hint=document.createElement('small');hint.className='portal-hint db115-photo-hint';hint.textContent='Maximum 15 MB. The image is stored in the connected Google Drive.';field.append(hint);}
      }
    });
    $$('select[name="designation"] option',host).forEach(option=>{if(/founder/i.test(option.value||option.textContent))option.remove();});
    const credentials=$('[data-credentials-form]',host);if(credentials&&!$('.db115-login-note',credentials)){const note=document.createElement('p');note.className='portal-hint db115-login-note';note.textContent='Your email and password are used for secure login. Your name is managed in Profile.';credentials.prepend(note);}
  }
  function mandatoryPassword(account){
    if(!account?.requiresPasswordSetup||$('#db115PasswordSetup'))return;
    const modal=document.createElement('div');modal.id='db115PasswordSetup';modal.className='portal-modal db115-required-modal';modal.innerHTML=`<div class="portal-modal-card" role="dialog" aria-modal="true" aria-labelledby="db115PasswordTitle"><h2 id="db115PasswordTitle">Create your dashboard password</h2><p>Your verified payment is linked to this account. Create a password now to protect future access. This required step cannot be skipped.</p><form class="auth-form" data-initial-password><div class="portal-field"><label>New Password</label><input name="newPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="portal-field"><label>Confirm Password</label><input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></div><div data-password-message></div><button class="portal-btn" type="submit">Save Password &amp; Continue</button></form></div>`;document.body.append(modal);
    $('[data-initial-password]',modal)?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=event.submitter,old=button.textContent;if(form.newPassword.value!==form.confirmPassword.value){$('[data-password-message]',modal).innerHTML='<div class="portal-result show error">The password confirmation does not match.</div>';return;}button.disabled=true;button.textContent='Saving…';const body=new FormData();body.set('action','initial_password');body.set('newPassword',form.newPassword.value);body.set('confirmPassword',form.confirmPassword.value);try{await api('/api/portal/profile',{method:'POST',body});modal.remove();message('Your password is saved and your dashboard is ready.','success');}catch(error){$('[data-password-message]',modal).innerHTML=`<div class="portal-result show error">${H(error.message)}</div>`;button.disabled=false;button.textContent=old;}});
  }
  function consumeDashboard(model){
    if(!model||typeof model!=='object')return;
    dashboard=model;memberships();activity();mandatoryPassword(dashboard.account);scrubSettings();
  }
  async function loadDashboardFallback(){
    if(dashboard)return;
    try{consumeDashboard(await api('/api/portal/dashboard'));}
    catch(error){if(/login required/i.test(error.message))location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);else message(error.message,'error',error.contactUrl);}
  }
  function install(){
    $$('[data-portal-nav]').forEach(button=>{if(['memberships','activity','tickets'].includes(button.dataset.portalNav))button.addEventListener('click',()=>showExtended(button.dataset.portalNav));});
    const settings=$('[data-settings]');if(settings)new MutationObserver(scrubSettings).observe(settings,{childList:true,subtree:true});
    window.addEventListener('dropbeat:portal-model',event=>consumeDashboard(event.detail));
    if(window.DropBeatPortalModel)consumeDashboard(window.DropBeatPortalModel);
    else setTimeout(loadDashboardFallback,5000);
    const requested=new URLSearchParams(location.search).get('view');if(['memberships','activity','tickets'].includes(requested))setTimeout(()=>showExtended(requested,false),30);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
