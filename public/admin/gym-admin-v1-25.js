/* DropBeat V1.25 — isolated Schedule Meeting dialog.
   It deliberately avoids the legacy #uc97ScheduleModal identifier so older
   modal observers cannot rebuild the dialog or trap the admin interface. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(selector)]:[];
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let smsReady=false;

  async function api(path,options={},timeoutMs=30000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),isForm=options.body instanceof FormData;
    try{
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal,headers:{Accept:'application/json',...(!isForm&&options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`Request failed (${response.status}).`);
      return data;
    }catch(error){if(error?.name==='AbortError')throw new Error('The server took too long to respond. Nothing on this page is locked; close this message and try again.');throw error;}
    finally{clearTimeout(timer);}
  }
  function localStart(){const value=new Date(Date.now()+3600000);value.setMinutes(Math.ceil(value.getMinutes()/15)*15,0,0);return new Date(value-value.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function reminderRow(){return `<div class="db125-reminder-row"><div class="db125-reminder-head"><small data-reminder-preview>Choose the reminder timing.</small><button class="btn danger small" type="button" data-remove-reminder>× Remove</button></div><div class="db125-reminder-fields"><div class="field"><label>Amount</label><input type="number" min="1" value="1" data-reminder-value></div><div class="field"><label>Unit</label><select data-reminder-unit><option value="1">Minutes</option><option value="60" selected>Hours</option><option value="1440">Days</option><option value="10080">Weeks</option><option value="43200">Months</option></select></div><div class="field"><label>Timing</label><select data-reminder-direction><option value="before">Before event</option><option value="after">After event</option></select></div><div class="field"><label>Platforms</label><div class="db125-channel-picks">${['email','whatsapp','sms','call'].map(channel=>`<button type="button" data-channel="${channel}" aria-pressed="false" ${channel==='sms'&&!smsReady?'disabled title="Connect SMS first"':''}>${channel==='sms'?'SMS':channel[0].toUpperCase()+channel.slice(1)}</button>`).join('')}</div></div></div></div>`;}
  function bindReminder(row,form){
    const update=()=>{const amount=Number($('[data-reminder-value]',row)?.value||0),unit=$('[data-reminder-unit]',row),direction=$('[data-reminder-direction]',row)?.value||'before',start=new Date(form.elements.startsAt.value),preview=$('[data-reminder-preview]',row);if(!amount||Number.isNaN(start.getTime())){preview.textContent='Choose the event date, amount, unit and timing.';return;}const at=new Date(start.getTime()+(direction==='after'?1:-1)*amount*Number(unit.value)*60000),label=unit.selectedOptions[0]?.textContent?.toLowerCase()||'hours';preview.textContent=`Sends ${amount} ${amount===1?label.replace(/s$/,''):label} ${direction} the event — ${at.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}.`;};
    $('[data-remove-reminder]',row).onclick=()=>row.remove();
    $$('[data-channel]',row).forEach(button=>button.onclick=()=>{if(button.disabled)return;const selected=!button.classList.contains('selected');button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    $$('input,select',row).forEach(control=>control.addEventListener('input',update));
    form.elements.startsAt.addEventListener('input',update);update();
  }
  function option(value,label){return `<option value="${Number(value||0)}">${H(label)}</option>`;}
  async function loadSupportingData(modal,config){
    const status=$('[data-db125-support-status]',modal),product=formElement(modal,'productId'),coach=formElement(modal,'coachId'),month=formElement(modal,'startsAt').value.slice(0,7);
    const [webinars,workspace]=await Promise.allSettled([
      api('/api/admin/marketing-suite?mode=webinars',{},12000),
      api(`/api/admin/dance-studio?mode=workspace&eventType=${encodeURIComponent(config.eventType)}&month=${encodeURIComponent(month)}`,{},12000)
    ]);
    if(!modal.isConnected)return;
    if(webinars.status==='fulfilled')smsReady=!!webinars.value.capabilities?.smsReminders;
    if(smsReady)$$('[data-channel="sms"]',modal).forEach(button=>{button.disabled=false;button.removeAttribute('title');});
    if(workspace.status==='fulfilled'){
      const data=workspace.value,productValue=product.value,coachValue=coach.value;
      product.innerHTML=`<option value="0">General ${H(config.title)} event</option>`+(data.mappings||[]).map(item=>option(item.product_id,item.class_name||item.product_name||'Class / batch')).join('');
      coach.innerHTML='<option value="0">Unassigned</option>'+(data.coaches||[]).filter(item=>item.status!=='archived').map(item=>option(item.id,item.name||'Coach')).join('');
      product.value=productValue;coach.value=coachValue;
      status.textContent='Available plans and coaches are ready. You may also keep this as a general event.';
    }else status.textContent='General event scheduling is ready. Plan and coach choices can remain unassigned.';
  }
  function formElement(root,name){return $('form',root)?.elements?.[name];}
  function open(config={},sourcePanel=null){
    const safe={title:String(config.title||'Class / Event'),eventType:['online_class','offline_class','demo'].includes(config.eventType)?config.eventType:'demo',delivery:config.delivery==='offline'?'offline':'online'};
    safe.panelId=sourcePanel?.id||({online_class:'onlineClasses',offline_class:'offlineClasses',demo:'demoMeetings'}[safe.eventType]);
    $('#uc97ScheduleModal')?.remove();$('#db125ScheduleModal')?.remove();
    const modal=document.createElement('div');modal.id='db125ScheduleModal';modal.className='modal open db125-schedule-shell';modal.innerHTML=`<div class="modal-card wide db125-schedule-card" role="dialog" aria-modal="true" aria-labelledby="db125ScheduleTitle"><div class="top"><div><h2 id="db125ScheduleTitle">Schedule Meeting — ${H(safe.title)}</h2><p class="muted">The form opens immediately. Connection checks load separately and never lock the dashboard.</p></div><button class="btn secondary compact" type="button" data-close>Close</button></div><form class="form" data-form novalidate><div class="field"><label>Find Existing Customer</label><div class="copyline"><input data-query placeholder="Search name, phone or email"><button class="btn secondary compact" type="button" data-search>Search</button></div></div><div data-results></div><div class="notice">Selecting a saved customer prefills every available contact field. You can edit the values before scheduling.</div><div class="row"><div class="field"><label>Customer Name</label><input name="customerName" required></div><div class="field"><label>WhatsApp Number</label><input name="customerPhone" inputmode="tel"></div></div><div class="row"><div class="field"><label>Email ID</label><input name="customerEmail" type="email"></div><div class="field"><label>Event Title</label><select name="title"><option>Schedule Meeting</option><option>Meet Now</option></select></div></div><div class="row"><div class="field"><label>Date &amp; Time</label><input name="startsAt" type="datetime-local" required></div><div class="field"><label>Duration Minutes</label><input name="durationMinutes" type="number" min="15" max="480" value="45" required></div></div><div class="row"><div class="field"><label>Linked Plan / Batch</label><select name="productId"><option value="0">General ${H(safe.title)} event</option></select></div><div class="field"><label>Coach</label><select name="coachId"><option value="0">Unassigned</option></select></div></div><div class="row"><div class="field"><label>Provider</label><select name="provider" ${safe.delivery==='offline'?'disabled':''}><option value="google_meet">Google Calendar + Meet</option><option value="zoom">Zoom</option><option value="external">External Meeting Link</option></select></div><div class="field"><label>Timezone</label><input name="timezone" value="Asia/Kolkata"></div></div><div class="row"><div class="field"><label>Contact Phone</label><input name="contactPhone" inputmode="tel"></div><div class="field"><label>Contact Email</label><input name="contactEmail" type="email"></div></div><div class="field"><label>Notes / Location</label><textarea name="notes" rows="3"></textarea></div><label class="uc94-enable-row uc97-enable-reminders"><span><strong>Enable Reminders</strong><small>Add only the timings and channels you need.</small></span><span class="uc94-switch"><input type="checkbox" data-enable-reminders><span></span></span></label><div class="db125-reminders" data-reminders hidden><div data-reminder-rows></div><button class="btn secondary compact" type="button" data-add-reminder>+ Add Reminder</button></div><p class="db125-support-status muted" data-db125-support-status>Loading available plans, coaches and reminder capabilities in the background…</p><div class="form-actions"><button class="btn compact" type="submit" data-submit>Schedule &amp; Send Confirmation</button><button class="btn secondary compact" type="button" data-open-integrations>Open Webinar Integrations</button></div><div data-msg aria-live="polite"></div></form></div>`;
    document.body.appendChild(modal);
    const form=$('[data-form]',modal),message=$('[data-msg]',modal),rows=$('[data-reminder-rows]',modal),reminders=$('[data-reminders]',modal),close=()=>{document.removeEventListener('keydown',escape);modal.remove();},escape=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
    form.elements.startsAt.value=localStart();
    $('[data-close]',modal).onclick=close;modal.addEventListener('click',event=>{if(event.target===modal)close();});document.addEventListener('keydown',escape);
    $('[data-open-integrations]',modal).onclick=()=>{close();window.uc92OpenWebinarIntegration?.();};
    form.elements.customerPhone.addEventListener('input',()=>{if(!form.elements.contactPhone.value)form.elements.contactPhone.value=form.elements.customerPhone.value;});
    form.elements.customerEmail.addEventListener('input',()=>{if(!form.elements.contactEmail.value)form.elements.contactEmail.value=form.elements.customerEmail.value;});
    $('[data-search]',modal).onclick=async()=>{const query=$('[data-query]',modal).value.trim(),host=$('[data-results]',modal),button=$('[data-search]',modal);if(!query){host.innerHTML='<div class="error">Enter a name, phone or email.</div>';return;}button.disabled=true;host.innerHTML='<div class="notice">Searching…</div>';try{const data=await api(`/api/admin/marketing-suite?mode=customers&q=${encodeURIComponent(query)}`,{},15000);host.innerHTML=(data.customers||[]).map(customer=>`<button class="uc92-customer" type="button" data-name="${H(customer.name)}" data-phone="${H(customer.phone)}" data-email="${H(customer.email)}"><strong>${H(customer.name||'Not applicable')}</strong><small>${H(customer.phone||'')} ${H(customer.email||'')}</small></button>`).join('')||'<div class="notice">No customer matched. Enter a new customer below.</div>';$$('.uc92-customer',host).forEach(item=>item.onclick=()=>{form.elements.customerName.value=item.dataset.name||'';form.elements.customerPhone.value=item.dataset.phone||'';form.elements.customerEmail.value=item.dataset.email||'';form.elements.contactPhone.value=item.dataset.phone||'';form.elements.contactEmail.value=item.dataset.email||'';$$('.uc92-customer',host).forEach(entry=>entry.classList.toggle('selected',entry===item));});}catch(error){host.innerHTML=`<div class="error">${H(error.message)}</div>`;}finally{if(modal.isConnected)button.disabled=false;}};
    const addReminder=()=>{rows.insertAdjacentHTML('beforeend',reminderRow());bindReminder(rows.lastElementChild,form);};
    $('[data-enable-reminders]',modal).onchange=event=>{reminders.hidden=!event.target.checked;if(event.target.checked&&!rows.children.length)addReminder();};
    $('[data-add-reminder]',modal).onclick=addReminder;
    form.onsubmit=async event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const payload=Object.fromEntries(new FormData(form)),planned=[];
      const showError=text=>{message.innerHTML=`<div class="error">${H(text)}</div>`;};
      if(!String(payload.customerPhone||'').trim()&&!String(payload.customerEmail||'').trim())return showError('Enter at least one customer contact: WhatsApp number or email address.');
      if($('[data-enable-reminders]',modal).checked){const reminderRows=$$('.db125-reminder-row',modal);if(!reminderRows.length)return showError('Add at least one reminder or switch reminders off.');for(const row of reminderRows){const amount=Number($('[data-reminder-value]',row).value),unit=Number($('[data-reminder-unit]',row).value),direction=$('[data-reminder-direction]',row).value,channels=$$('[data-channel].selected',row).map(item=>item.dataset.channel);if(!amount||amount<1||!channels.length)return showError('Every reminder needs a valid amount, timing and at least one platform.');const minutes=Math.round(amount*unit)*(direction==='after'?-1:1);channels.forEach(channel=>planned.push({channel,minutesBefore:minutes}));}}
      const startsAt=new Date(payload.startsAt);if(Number.isNaN(startsAt.getTime()))return showError('Choose a valid meeting date and time.');if(startsAt.getTime()<Date.now()-60000)return showError('Choose a current or future meeting time.');
      Object.assign(payload,{action:'schedule_webinar',eventType:safe.eventType,deliveryMode:safe.delivery,provider:safe.delivery==='offline'?'offline':payload.provider,startsAt:startsAt.toISOString(),productId:Number(payload.productId||0),coachId:Number(payload.coachId||0),reminders:planned});
      const submit=$('[data-submit]',modal),old=submit.textContent;submit.disabled=true;submit.textContent='Scheduling…';message.innerHTML='<div class="notice">Creating the event and sending its confirmation…</div>';
      try{const result=await api('/api/admin/marketing-suite',{method:'POST',body:JSON.stringify(payload)},45000);if(!modal.isConnected){window.ucAdminToast?.(result.message||'Meeting scheduled.','success');return;}message.innerHTML=`<div class="notice success">${H(result.message||'Meeting scheduled. It is now available under Scheduled Events.')}</div>`;Promise.resolve(window.ucV1697ReloadWebinars?.()).catch(()=>{});setTimeout(()=>{close();window.tab?.(safe.panelId);},900);}catch(error){if(modal.isConnected)showError(error.message);}finally{if(modal.isConnected){submit.disabled=false;submit.textContent=old;}}
    };
    queueMicrotask(()=>form.elements.customerName.focus());
    loadSupportingData(modal,safe).catch(()=>{if(modal.isConnected)$('[data-db125-support-status]',modal).textContent='General event scheduling is ready. Optional connection details could not be refreshed.';});
    return modal;
  }

  window.db125OpenScheduleMeeting=open;
  document.dispatchEvent(new CustomEvent('dropbeat:v1-25-schedule-ready'));
})();
