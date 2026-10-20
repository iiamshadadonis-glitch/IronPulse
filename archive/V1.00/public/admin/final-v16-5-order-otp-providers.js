/* V16.5 — Order OTP provider clarity, Gmail OTP and provider connect/disconnect controls. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const HELP_WA=`<h3>WhatsApp Webhook & Order OTP</h3>
    <p class="uc-help-lead">Choose exactly one WhatsApp delivery provider for Member access verification and incoming WhatsApp activity. Connecting a new provider makes it the active provider; IronPulse Gym will never silently fall back to another saved provider.</p>
    <h4>1. GreenAPI</h4><p>Enter the GreenAPI Instance ID and API Token, then click <strong>Connect GreenAPI</strong>. Use this when the selected GreenAPI instance is already authorized and online.</p>
    <h4>2. WhatsApp Cloud API — direct Meta connection</h4><ol><li>Open <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">Meta for Developers</a> and open the app that owns your WhatsApp Business Account.</li><li>Copy the <strong>Phone Number ID</strong> and a valid access token into this card.</li><li>Set the webhook callback to the <strong>WhatsApp Webhook URL</strong> shown on this card and use the same private Verify Token.</li><li>Click <strong>Connect WhatsApp Cloud API</strong>, then enable WhatsApp OTP.</li></ol>
    <h4>3. Instautomate — your vendor API</h4><ol><li>Open <a href="https://client.instautomate.com/vendor-console/settings/api-access" target="_blank" rel="noopener">Instautomate → API Access</a>.</li><li>Copy the <strong>API Base URL</strong>, <strong>Vendor UID</strong> and <strong>API Access Token</strong>.</li><li>In Instautomate, enable the Webhook Endpoint and point it to the WhatsApp Webhook URL shown on this card so inbound messages reach IronPulse Gym.</li><li>Click <strong>Connect Instautomate</strong>. IronPulse Gym tests the vendor API before marking it connected.</li></ol>
    <div class="uc-example"><strong>Instautomate request used by this build:</strong> POST <code>{API Base URL}/{Vendor UID}/contact/send-message</code> with <code>Authorization: Bearer {API Access Token}</code> and JSON containing <code>phone_number</code> and <code>message_body</code>. <a href="https://documenter.getpostman.com/view/29712127/2sBXiojUpr" target="_blank" rel="noopener">Open API documentation</a>.</div>
    <h4>OTP and the WhatsApp 24-hour customer-service window</h4><p><strong>Important:</strong> clicking Send OTP on the website does not by itself open WhatsApp's customer-initiated service window. The free-form service window begins after the customer actually sends a WhatsApp message to the business. If no active service window exists, your provider/Meta may require an approved authentication template and applicable WhatsApp charges can apply.</p>
    <p>If your workflow first asks the customer to message your WhatsApp number and the inbound message reaches this webhook, IronPulse Gym can then send the OTP as a service message while that window is open, subject to the provider and Meta rules.</p>
    <h4>Webhook</h4><p>The same IronPulse Gym webhook accepts supported Meta Cloud API, GreenAPI and Instautomate inbound payloads. The Verify Token is used by Meta's webhook verification flow; Instautomate forwards webhook payloads by POST and does not need to know your Meta token.</p>
    <div class="uc-warning"><strong>OTP not arriving?</strong> Confirm only the intended provider is active, run its Connect test, verify the recipient number, and check whether a service window is open or an approved authentication template is required. Never assume a website button click makes a WhatsApp message free.</div>`;
  const HELP_GMAIL=`<h3>Gmail / Email — Sending & Order OTP</h3>
    <p class="uc-help-lead">The same connected Gmail account can be used for documents and for order verification codes. The two switches are independent.</p>
    <ul>
      <li><strong>Enable Gmail Sending:</strong> controls invoices and payment statements.</li>
      <li><strong>Enable Gmail OTP:</strong> controls Member account verification emails.</li>
      <li>Enabling Gmail OTP automatically turns off WhatsApp OTP. Gmail document sending remains unchanged.</li>
    </ul>
    <h4>Recommended setup</h4><ol>
      <li>Save the Gmail OAuth Client ID and Client Secret.</li>
      <li>Click <strong>Connect Gmail</strong> and complete Google authorization.</li>
      <li>Confirm the connected Gmail address shown in this card.</li>
      <li>Turn on <strong>Enable Gmail OTP</strong>.</li>
      <li>Open Login and test with an email address that already exists on an order.</li>
    </ol>
    <div class="uc-example"><strong>Example:</strong> Gmail Sending can stay on for invoices while Gmail OTP is also on for order verification. If you later enable WhatsApp OTP, only Gmail OTP turns off.</div>
    <p><strong>Cost note:</strong> Gmail OTP uses the already connected Gmail sender instead of a WhatsApp OTP provider. Google account and API sending limits still apply, so this is intended for normal order-verification traffic rather than unlimited bulk messaging.</p>
    <div class="uc-warning"><strong>Email OTP not arriving?</strong> Check Inbox and Spam, confirm Gmail still shows Connected, and make sure the customer entered the same email address used during checkout.</div>`;

  async function api(path,opts={}){
    const res=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'The settings could not be updated.');return data;
  }
  function toast(text,type='success'){window.ucAdminToast?.(text,type);}
  function busy(btn,on,text){if(!btn)return;if(on){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=text;}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;}}
  function socialSettings(){return window.UCSocialIntegrations?.settings||{};}
  function setHelp(card,html){const body=card?.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');if(body)body.innerHTML=html;else if(card&&window.ucMakeInfoDetails)window.ucMakeInfoDetails(card,html);}

  function providerLabel(v){return v==='green_api'?'GreenAPI':v==='instautomate'?'Instautomate':'WhatsApp Cloud API';}
  function waResult(text,type='success'){window.ucSocialIntegrationResult?.('whatsapp',text,type);if(!window.ucSocialIntegrationResult)toast(text,type);}
  function enhanceWhatsapp(){
    const card=$('#socialMediaIntegrations [data-social-card="whatsapp"]');if(!card)return;
    const form=$('form',card);if(!form)return;
    if(!form.dataset.ucV165){
      form.dataset.ucV165='1';
      form.removeAttribute('onsubmit');
      form.innerHTML=`
        <div class="uc-social-toggle-item uc-v165-otp-toggle"><label class="uc-social-toggle-capsule"><span class="switch"><input name="otpEnabled" type="checkbox"><span class="slider"></span></span><strong>Enable WhatsApp OTP</strong></label><small class="uc-social-toggle-helper">Member account verification</small></div>
        <div class="uc-social-info"><strong>Use:</strong> Send Member account verification codes through the selected WhatsApp provider and receive incoming WhatsApp webhook activity.</div>
        <div class="field"><label>WhatsApp Webhook Verify Token <small id="socialWhatsappVerifyHint" class="hint inline-hint"></small></label><input name="webhookVerifyToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Your private verification token. Use the same value in the external WhatsApp webhook setup.</small></div>
        <span class="uc-social-webhook-label">WhatsApp Webhook URL</span><div class="copyline"><input id="socialWhatsappWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('socialWhatsappWebhookUrl')">Copy</button></div>
        <div class="uc-v165-provider-choice field"><label>OTP Provider</label><select name="otpProvider"><option value="green_api">GreenAPI</option><option value="whatsapp_cloud">WhatsApp Cloud API</option><option value="instautomate">Instautomate</option></select><small class="hint">Only the selected provider's connection fields are shown below.</small></div>
        <div class="uc-v165-provider-fields" data-provider-fields="green_api"><div class="row"><div class="field"><label>GreenAPI Instance ID</label><input name="greenApiInstanceId" placeholder="Instance ID"><small class="hint">Instance ID supplied by GreenAPI.</small></div><div class="field"><label>GreenAPI Token <small id="socialGreenApiHint" class="hint inline-hint"></small></label><input name="greenApiToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Token supplied for the selected GreenAPI instance.</small></div></div></div>
        <div class="uc-v165-provider-fields" data-provider-fields="whatsapp_cloud"><div class="row"><div class="field"><label>WhatsApp Phone Number ID</label><input name="phoneNumberId" placeholder="Phone Number ID"><small class="hint">Provided by Meta for WhatsApp Cloud API.</small></div><div class="field"><label>WhatsApp Cloud Token <small id="socialWhatsappCloudHint" class="hint inline-hint"></small></label><input name="cloudToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Access token for the connected WhatsApp Cloud API number.</small></div></div></div>
        <div class="uc-v165-provider-fields" data-provider-fields="instautomate"><div class="row"><div class="field"><label>Instautomate API Base URL</label><input name="instautomateApiBaseUrl" placeholder="https://client.instautomate.com/api"><small class="hint">Use the API Base URL shown in Instautomate → API Access.</small></div><div class="field"><label>Instautomate Vendor UID</label><input name="instautomateVendorUid" placeholder="Vendor UID"><small class="hint">Copy your Vendor UID from Instautomate API Access.</small></div></div><div class="row"><div class="field"><label>Instautomate API Access Token <small id="socialInstautomateTokenHint" class="hint inline-hint"></small></label><input name="instautomateToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Sent as the Bearer token to Instautomate.</small></div><div class="field"><label>From Phone Number ID Optional</label><input name="instautomateFromPhoneNumberId" placeholder="Optional"><small class="hint">Leave blank if your Instautomate vendor account should use its default connected number.</small></div></div></div>
        <div class="form-actions uc-v165-provider-actions"><button class="btn compact" id="ucV165WhatsConnect" type="button">Connect GreenAPI</button><button class="btn secondary compact" id="ucV165WhatsSave" type="button">Save WhatsApp OTP</button><button class="btn secondary compact" id="ucV165WhatsDisconnect" type="button">Disconnect GreenAPI</button><button class="btn secondary compact" id="ucV165WhatsClear" type="button">Clear Form</button></div>`;
      const provider=$('[name="otpProvider"]',form);
      provider.addEventListener('change',()=>syncWhatsappProvider(form));
      $('[name="otpEnabled"]',form).addEventListener('change',async e=>{
        const el=e.currentTarget,desired=el.checked;el.disabled=true;
        try{const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify({platform:'whatsapp',otpProvider:provider.value,otpEnabled:desired})});window.UCSocialIntegrations.settings=r.settings||socialSettings();syncAll();waResult(desired?'WhatsApp OTP enabled successfully. The selected WhatsApp provider already passed its live API connection test, and Gmail OTP was disabled automatically.':'WhatsApp OTP disabled successfully. Saved provider credentials were kept.','success');}
        catch(err){el.checked=!desired;waResult(err.message||'WhatsApp OTP could not be updated. Run Connect on the selected provider and resolve the connection message before enabling OTP.','error');}
        finally{el.disabled=false;}
      });
      $('#ucV165WhatsConnect',form).addEventListener('click',()=>connectWhatsapp(form));
      $('#ucV165WhatsSave',form).addEventListener('click',()=>saveWhatsapp(form));
      $('#ucV165WhatsDisconnect',form).addEventListener('click',()=>disconnectWhatsapp(form));
      $('#ucV165WhatsClear',form).addEventListener('click',()=>clearWhatsappForm(form));
    }
    setHelp(card,HELP_WA);syncWhatsapp(form);
  }
  function syncWhatsappProvider(form){
    const provider=$('[name="otpProvider"]',form)?.value||'green_api';
    form.querySelectorAll('[data-provider-fields]').forEach(x=>x.hidden=x.dataset.providerFields!==provider);
    const label=providerLabel(provider);$('#ucV165WhatsConnect',form).textContent=`Connect ${label}`;$('#ucV165WhatsDisconnect',form).textContent=`Disconnect ${label}`;
  }
  function syncWhatsapp(form){
    const w=socialSettings().whatsapp||{};
    const provider=w.otpProvider||'green_api';
    $('[name="otpProvider"]',form).value=provider;
    $('[name="otpEnabled"]',form).checked=!!w.enabled;
    $('[name="greenApiInstanceId"]',form).value=w.greenApiInstanceId||'';
    $('[name="phoneNumberId"]',form).value=w.phoneNumberId||'';
    $('[name="instautomateApiBaseUrl"]',form).value=w.instautomateApiBaseUrl||'https://client.instautomate.com/api';
    $('[name="instautomateVendorUid"]',form).value=w.instautomateVendorUid||'';
    $('[name="instautomateFromPhoneNumberId"]',form).value=w.instautomateFromPhoneNumberId||'';
    $('[name="greenApiToken"]',form).value='';$('[name="cloudToken"]',form).value='';$('[name="instautomateToken"]',form).value='';$('[name="webhookVerifyToken"]',form).value='';
    const gh=$('#socialGreenApiHint',form);if(gh)gh.textContent=w.greenApiTokenMasked?`Saved: ${w.greenApiTokenMasked}`:'No secret saved yet.';
    const ch=$('#socialWhatsappCloudHint',form);if(ch)ch.textContent=w.cloudTokenMasked?`Saved: ${w.cloudTokenMasked}`:'No secret saved yet.';
    const ih=$('#socialInstautomateTokenHint',form);if(ih)ih.textContent=w.instautomateTokenMasked?`Saved: ${w.instautomateTokenMasked}`:'No secret saved yet.';
    const vh=$('#socialWhatsappVerifyHint',form);if(vh)vh.textContent=w.webhookVerifyTokenMasked?`Saved: ${w.webhookVerifyTokenMasked}`:'No secret saved yet.';
    const url=$('#socialWhatsappWebhookUrl',form);if(url)url.value=socialSettings().whatsappWebhookUrl||`${location.origin}/api/webhooks/whatsapp`;
    syncWhatsappProvider(form);
  }
  function whatsappPayload(form,action='connect'){
    const provider=$('[name="otpProvider"]',form).value,p={platform:'whatsapp',action,otpProvider:provider,otpEnabled:!!$('[name="otpEnabled"]',form).checked,webhookVerifyToken:$('[name="webhookVerifyToken"]',form).value};
    if(provider==='green_api'){p.greenApiInstanceId=$('[name="greenApiInstanceId"]',form).value;p.greenApiToken=$('[name="greenApiToken"]',form).value;}
    else if(provider==='instautomate'){p.instautomateApiBaseUrl=$('[name="instautomateApiBaseUrl"]',form).value;p.instautomateVendorUid=$('[name="instautomateVendorUid"]',form).value;p.instautomateToken=$('[name="instautomateToken"]',form).value;p.instautomateFromPhoneNumberId=$('[name="instautomateFromPhoneNumberId"]',form).value;}
    else{p.phoneNumberId=$('[name="phoneNumberId"]',form).value;p.cloudToken=$('[name="cloudToken"]',form).value;}
    return p;
  }
  async function connectWhatsapp(form){const provider=$('[name="otpProvider"]',form).value,btn=$('#ucV165WhatsConnect',form);busy(btn,true,'Testing live API…');try{const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(whatsappPayload(form,'connect'))});window.UCSocialIntegrations.settings=r.settings||socialSettings();syncAll();const w=r.settings?.whatsapp||{};waResult(`${providerLabel(provider)} authentication and live API access are working${w.connectedLabel?` for ${w.connectedLabel}`:''}. The credentials were saved and this provider is ready for WhatsApp OTP.`, 'success');}catch(e){waResult(e.message||`${providerLabel(provider)} connection test failed. Check the provider credentials/account state and try again.`,'error');}finally{busy(btn,false);syncWhatsappProvider(form);}}
  async function saveWhatsapp(form){const btn=$('#ucV165WhatsSave',form);busy(btn,true,'Saving…');try{const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(whatsappPayload(form,'save'))});window.UCSocialIntegrations.settings=r.settings||socialSettings();syncAll();waResult(r.message||'WhatsApp settings were saved successfully. Click Connect for the selected provider to verify the live API before enabling OTP.','success');}catch(e){waResult(e.message||'WhatsApp settings could not be saved. Check the required provider fields and try again.','error');}finally{busy(btn,false);syncWhatsappProvider(form);}}
  async function disconnectWhatsapp(form){const provider=$('[name="otpProvider"]',form).value,label=providerLabel(provider);if(!confirm(`Disconnect ${label}? The saved credentials for this provider will be removed and WhatsApp OTP will be turned off.`))return;const btn=$('#ucV165WhatsDisconnect',form);busy(btn,true,'Disconnecting…');try{const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify({platform:'whatsapp',action:'disconnect',otpProvider:provider,otpEnabled:false})});window.UCSocialIntegrations.settings=r.settings||socialSettings();syncAll();waResult(`${label} disconnected successfully. Automatic WhatsApp OTP is disabled until this provider passes Connect again.`,'success');}catch(e){waResult(e.message||`${label} could not be disconnected. Refresh the page and try again; do not assume credentials were removed unless the server confirms it.`,'error');}finally{busy(btn,false);syncWhatsappProvider(form);}}
  function clearWhatsappForm(form){const p=$('[name="otpProvider"]',form).value;const verify=$('[name="webhookVerifyToken"]',form);if(verify)verify.value='';if(p==='green_api'){ $('[name="greenApiInstanceId"]',form).value='';$('[name="greenApiToken"]',form).value=''; }else if(p==='instautomate'){ $('[name="instautomateVendorUid"]',form).value='';$('[name="instautomateToken"]',form).value='';$('[name="instautomateFromPhoneNumberId"]',form).value=''; }else{ $('[name="phoneNumberId"]',form).value='';$('[name="cloudToken"]',form).value=''; }toast('Visible WhatsApp fields cleared on this form. Saved credentials are unchanged until you save, connect or disconnect.','success');}

  function enhanceGmail(){
    const card=$('#socialMediaIntegrations .uc-v9-gmail-card');if(!card)return;
    const form=$('form',card);if(!form)return;
    if(!form.dataset.ucV165){
      form.dataset.ucV165='1';
      const first=$('.uc-social-toggle-item',form);
      const otp=document.createElement('div');otp.className='uc-social-toggle-item uc-v165-otp-toggle';otp.innerHTML='<label class="uc-social-toggle-capsule"><span class="switch"><input name="otpEnabled" type="checkbox"><span class="slider"></span></span><strong>Enable Gmail OTP</strong></label><small class="uc-social-toggle-helper">Member account verification</small>';
      first?.insertAdjacentElement('afterend',otp);
      $('[name="otpEnabled"]',form)?.addEventListener('change',async e=>{
        const el=e.currentTarget,desired=el.checked;el.disabled=true;
        try{const fd=new FormData(form),payload={platform:'gmail',...Object.fromEntries(fd.entries()),enabled:!!form.elements.enabled.checked,otpEnabled:desired};const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(payload)});window.UCSocialIntegrations.settings=r.settings||socialSettings();syncAll();toast(desired?'Gmail OTP enabled. WhatsApp OTP was disabled automatically.':'Gmail OTP disabled.','success');}
        catch(err){el.checked=!desired;toast(err.message||'Gmail OTP could not be updated.','error');}
        finally{el.disabled=false;}
      });
    }
    const g=socialSettings().gmail||{};if(form.elements.otpEnabled)form.elements.otpEnabled.checked=!!g.otpEnabled;
    setHelp(card,HELP_GMAIL);
  }
  function syncAll(){enhanceWhatsapp();enhanceGmail();}
  const oldLoad=window.load_socialMediaIntegrations;
  if(typeof oldLoad==='function')window.load_socialMediaIntegrations=async function(){const r=await oldLoad.apply(this,arguments);setTimeout(syncAll,20);return r;};
  const oldDisconnect=window.disconnectUCGmail;
  if(typeof oldDisconnect==='function')window.disconnectUCGmail=async function(){const r=await oldDisconnect.apply(this,arguments);setTimeout(async()=>{try{const x=await api('/api/admin/social-integrations');window.UCSocialIntegrations.settings=x.settings||{};}catch(_){}syncAll();},50);return r;};
  function init(){syncAll();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));else setTimeout(init,900);
})();
