/* DropBeat Dance Studio V12 — additive requests dashboard count, always-visible subscription controls and admin display identity. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;});
  const state=()=>window.A||(window.A={});
  const displayName=v=>String(v||'Admin').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,20)||'Admin';
  const helpEnabled=()=>state().settings?.adminHelpEnabled!==false;

  const HELP_ADMIN_NAME=`<h3>Admin Display Name — What It Changes</h3>
    <p class="uc-help-lead">This is the short name shown beside the logo at the top-left of the admin panel. It is only an admin-panel identity label; it does not rename the public brand and it does not change your login email or password.</p>
    <h4>How to set it</h4><ol><li>Enter a short name such as <strong>Admin</strong>, <strong>Ishita</strong>, <strong>Raju</strong> or <strong>Casting Desk</strong>.</li><li>Keep it within <strong>20 characters</strong>. The limit is intentional so the sidebar identity stays on one line.</li><li>Click <strong>Save Admin Name</strong>. The name beside the logo updates immediately and is reused on future admin visits.</li></ol>
    <div class="uc-example"><strong>Example:</strong> If you save “Ishita”, the top-left admin identity becomes <strong>Ishita</strong> while the website brand can still remain DropBeat Dance Studio.</div>
    <div class="uc-warning"><strong>Need to rename the business?</strong> Use Brand Settings → Brand Name. Admin Display Name and Brand Name are deliberately separate.</div>`;

  function applyAdminIdentity(name){
    const value=displayName(name||state().settings?.adminDisplayName);
    $$('.side .brand span,.admin-brand-home span').forEach(el=>{if(el.textContent!==value)el.textContent=value;});
    return value;
  }

  async function refreshAdminIdentity(){
    try{
      const r=await apiJson('/api/admin/auth/security');
      if(!state().settings)state().settings={};
      state().settings.adminDisplayName=displayName(r.displayName||state().settings.adminDisplayName);
      applyAdminIdentity(state().settings.adminDisplayName);
      const input=$('#ucV12AdminDisplayName');if(input){input.value=state().settings.adminDisplayName;updateAdminNameCount(input);}
    }catch(_){applyAdminIdentity();}
  }

  function updateAdminNameCount(input){const e=$('#ucV12AdminNameCount');if(e)e.textContent=`${String(input?.value||'').length} / 20 characters`;}
  window.ucV12AdminNameCount=updateAdminNameCount;

  function ensureAdminNameCard(){
    const panel=$('#security');if(!panel||panel.querySelector('.uc-v12-admin-name-card'))return;
    const top=panel.querySelector(':scope > .top');
    const card=document.createElement('form');card.className='card form uc-v12-admin-name-card';card.onsubmit=window.saveUCAdminDisplayName;
    card.innerHTML=`<h3>Admin Display Name</h3><p class="muted">Choose the short name shown beside the logo in this admin panel.</p><div class="field"><label for="ucV12AdminDisplayName">Admin Name</label><input id="ucV12AdminDisplayName" name="displayName" maxlength="20" autocomplete="off" placeholder="Admin" oninput="ucV12AdminNameCount(this)" required><small class="hint"><span id="ucV12AdminNameCount">0 / 20 characters</span> • Keep it short so it stays on one line.</small></div><div class="form-actions"><button class="btn compact" type="submit">Save Admin Name</button></div><div id="ucV12AdminNameMsg"></div>`;
    if(top)top.insertAdjacentElement('afterend',card);else panel.prepend(card);
    if(helpEnabled()&&window.ucMakeInfoCard)window.ucMakeInfoCard(card,HELP_ADMIN_NAME);
    setTimeout(refreshAdminIdentity,0);
  }

  window.saveUCAdminDisplayName=async function(e){
    e?.preventDefault?.();const form=e?.currentTarget||$('.uc-v12-admin-name-card');if(!form)return;
    const input=$('#ucV12AdminDisplayName'),msg=$('#ucV12AdminNameMsg'),btn=form.querySelector('button[type="submit"]');
    const name=String(input?.value||'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
    if(!name){if(msg)msg.innerHTML='<div class="error">Enter an admin display name.</div>';return;}
    if(name.length>20){if(msg)msg.innerHTML='<div class="error">Use 20 characters or fewer so the name stays on one line.</div>';return;}
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Saving…';}
    try{
      const r=await apiJson('/api/admin/auth/security',{method:'POST',body:JSON.stringify({action:'update_admin_name',displayName:name})});
      if(!state().settings)state().settings={};state().settings.adminDisplayName=r.displayName||name;applyAdminIdentity(r.displayName||name);
      if(msg)msg.innerHTML=`<div class="notice success">${H(r.message||'Admin display name updated.')}</div>`;
    }catch(err){if(msg)msg.innerHTML=`<div class="error">${H(err.message||'Could not update the admin display name.')}</div>`;}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Save Admin Name';}}
  };

  /* Business Dashboard: Requests counts New + In Progress only. */
  async function loadDashboardRequestCount(){
    const el=$('#statRequests');if(!el||document.hidden)return;
    try{const r=await apiJson('/api/admin/requests?summary=1');el.textContent=String(Number(r.open_count||0));}catch(_){/* leave current count */}
  }
  window.ucV12LoadDashboardRequestCount=loadDashboardRequestCount;

  /* Payments: make Resume / Pause / Cancel visible even before a subscription exists. */
  function subscriptionStatusMessage(text,type='error'){
    let box=$('#ucV12SubscriptionActionMsg');const panel=$('#ucTabPayments');if(!panel)return;
    if(!box){box=document.createElement('div');box.id='ucV12SubscriptionActionMsg';box.className='uc-v12-sub-action-msg';const toolbar=panel.querySelector('.uc-payment-toolbar');toolbar?.insertAdjacentElement('afterend',box);}
    box.innerHTML=text?`<div class="${type==='success'?'notice success':type==='notice'?'notice':'error'}">${H(text)}</div>`:'';
  }
  function currentSubscriptions(){return Array.isArray(window.UCClientCRM?.current?.subscriptions)?window.UCClientCRM.current.subscriptions:[];}
  function ensureGlobalSubscriptionControls(){
    const panel=$('#ucTabPayments'),toolbar=panel?.querySelector('.uc-payment-toolbar');if(!toolbar)return;
    let actions=toolbar.querySelector('.uc-v9-payment-actions');if(!actions){actions=document.createElement('div');actions.className='uc-v9-payment-actions';toolbar.appendChild(actions);}
    if(!actions.querySelector('.uc-v12-sub-global-controls')){
      const controls=document.createElement('div');controls.className='uc-v12-sub-global-controls';controls.setAttribute('aria-label','Subscription controls');
      controls.innerHTML=`<button type="button" class="uc-v11-sub-icon play" title="Resume / activate recurring subscription" aria-label="Resume subscription" onclick="ucV12GlobalSubscriptionAction(this,'resume')">▶</button><button type="button" class="uc-v11-sub-icon pause" title="Pause recurring subscription" aria-label="Pause subscription" onclick="ucV12GlobalSubscriptionAction(this,'pause')">Ⅱ</button><button type="button" class="uc-v11-sub-icon cancel" title="Cancel recurring subscription" aria-label="Cancel subscription" onclick="ucV12GlobalSubscriptionAction(this,'cancel')">×</button>`;
      actions.prepend(controls);
    }
    if(!$('#ucV12SubscriptionActionMsg')){const box=document.createElement('div');box.id='ucV12SubscriptionActionMsg';box.className='uc-v12-sub-action-msg';toolbar.insertAdjacentElement('afterend',box);}
  }

  window.ucV12GlobalSubscriptionAction=async function(btn,action){
    const subs=currentSubscriptions();
    if(!subs.length){subscriptionStatusMessage('No recurring subscription is linked to this client. Resume, Pause and Cancel work only after a recurring subscription has been created or linked. No payment or subscription was changed.','error');return;}
    if(subs.length>1){subscriptionStatusMessage('This client has more than one recurring subscription. Use the controls inside the specific subscription card below so the correct subscription is changed.','error');return;}
    const s=subs[0]||{},subId=String(s.subscription_id||''),gateway=String(s.gateway||'razorpay');
    if(!subId){subscriptionStatusMessage('The saved record does not contain a payment-gateway subscription ID. Refresh the client payment information or create/link the subscription before using these controls.','error');return;}
    const old=btn.innerHTML;btn.disabled=true;btn.textContent='…';subscriptionStatusMessage(`${action==='resume'?'Resuming':action==='pause'?'Pausing':'Preparing cancellation'} for the linked ${gateway} subscription…`,'notice');
    try{const result=await window.ucSubscriptionAction(subId,gateway,action);if(result?.ok===false){subscriptionStatusMessage(result.error||'No subscription change was made.',result.cancelled?'notice':'error');}else subscriptionStatusMessage(`Subscription ${action} request completed. Refresh confirms the latest gateway status.`,'success');}
    catch(err){subscriptionStatusMessage(err.message||'The subscription action could not be completed.','error');}
    finally{btn.disabled=false;btn.innerHTML=old;setTimeout(ensureGlobalSubscriptionControls,80);}
  };

  function enhancePaymentsV12(){ensureGlobalSubscriptionControls();}

  /* Wrap only existing entry points; all original behavior still runs first. */
  const oldDashboard=window.load_dashboard;if(typeof oldDashboard==='function')window.load_dashboard=async function(){const r=await oldDashboard.apply(this,arguments);await loadDashboardRequestCount();return r;};
  const oldSecurity=window.load_security;if(typeof oldSecurity==='function')window.load_security=async function(){const r=await oldSecurity.apply(this,arguments);ensureAdminNameCard();await refreshAdminIdentity();return r;};
  const oldRender=window.renderUCClientDetails;if(typeof oldRender==='function')window.renderUCClientDetails=function(){const r=oldRender.apply(this,arguments);setTimeout(enhancePaymentsV12,80);return r;};
  const oldClientTab=window.ucClientTab;if(typeof oldClientTab==='function')window.ucClientTab=function(id,btn){const r=oldClientTab.apply(this,arguments);if(id==='payments')setTimeout(enhancePaymentsV12,80);return r;};
  const oldLoadRequests=window.load_requests;if(typeof oldLoadRequests==='function')window.load_requests=async function(){const r=await oldLoadRequests.apply(this,arguments);await loadDashboardRequestCount();return r;};
  const oldSetStatus=window.ucV11SetRequestStatus;if(typeof oldSetStatus==='function')window.ucV11SetRequestStatus=async function(){const r=await oldSetStatus.apply(this,arguments);await loadDashboardRequestCount();return r;};
  const oldDeleteRequest=window.ucV11DeleteRequest;if(typeof oldDeleteRequest==='function')window.ucV11DeleteRequest=async function(){const r=await oldDeleteRequest.apply(this,arguments);await loadDashboardRequestCount();return r;};

  function init(){ensureAdminNameCard();refreshAdminIdentity();loadDashboardRequestCount();enhancePaymentsV12();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,450));else setTimeout(init,450);
  setTimeout(init,1400);setInterval(()=>{if(!document.hidden)loadDashboardRequestCount();},300000);
})();
