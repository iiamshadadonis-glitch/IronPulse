/* Additive Settings > Integrations integration panel.
   Website Content > Social Links remains untouched; this panel is only for
   webhook/API connections that can feed enquiries into the existing CRM. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const S=window.UCSocialIntegrations=window.UCSocialIntegrations||{settings:null};

  function panelMarkup(){
    const section=document.createElement('section');section.id='socialMediaIntegrations';section.className='panel';
    section.innerHTML=`
      <div class="top"><div><h1>Integrations</h1><p class="muted">Connect and manage social media, SEO, storage, email and OTP, payments, ad networks, and external API automation from one place.</p></div><button class="btn secondary compact" type="button" onclick="load_socialMediaIntegrations()">Refresh</button></div>

      <details class="card pay-detail uc-social-card" data-social-card="facebook">
        <summary>Facebook</summary>
        <form class="form" onsubmit="saveUCSocialPlatform(event,'facebook')">
          <div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="enabled" type="checkbox"><span class="slider"></span></span><strong>Enable Facebook</strong></label><small class="uc-social-toggle-helper">Lead Form integration</small></div>
          <div class="uc-social-info"><strong>Use:</strong> Facebook Lead Ads can send new form submissions to this dashboard. Name, phone, email and any matching custom fields are added to the existing Enquiries/Client Details system.</div>
          <div class="row"><div class="field"><label>Meta Page ID</label><input name="pageId" placeholder="Facebook Page ID"><small class="hint">Page that owns the Lead Ads form.</small></div><div class="field"><label>Lead Form IDs Optional</label><input name="formIds" placeholder="12345, 67890"><small class="hint">Comma-separated. Leave blank to accept matching Page lead forms.</small></div></div>
          <div class="row"><div class="field"><label>Page Access Token <small id="facebookAccessTokenHint" class="hint inline-hint"></small></label><input name="pageAccessToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Provided through your Meta app/Page access setup.</small></div><div class="field"><label>Webhook Verify Token <small id="facebookVerifyTokenHint" class="hint inline-hint"></small></label><input name="verifyToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Create your own private text and enter the same value in Meta webhook setup.</small></div></div>
          <div class="field"><label>Graph API Version</label><input name="graphVersion" value="v26.0"><small class="hint">Default uses the current Meta Graph API generation included with this build.</small></div>
          <span class="uc-social-webhook-label">Lead Webhook URL</span><div class="copyline"><input id="facebookWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('facebookWebhookUrl')">Copy</button></div>
          <small class="hint">Paste this callback URL into your Meta app webhook configuration for Lead Ads.</small>
          <div class="form-actions"><button class="btn compact">Save Facebook</button></div>
        </form>
      </details>

      <details class="card pay-detail uc-social-card" data-social-card="instagram">
        <summary>Instagram</summary>
        <form class="form" onsubmit="saveUCSocialPlatform(event,'instagram')">
          <div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="enabled" type="checkbox"><span class="slider"></span></span><strong>Enable Instagram</strong></label><small class="uc-social-toggle-helper">Lead Form integration</small></div>
          <div class="uc-social-info"><strong>Use:</strong> Instagram Lead Ads that use Meta lead forms can enter the same CRM. If the submitted form actually includes an Instagram username/ID field, it is saved in the client Profile; it is never guessed.</div>
          <div class="row"><div class="field"><label>Instagram Business Account ID</label><input name="instagramBusinessId" placeholder="Instagram professional account ID"><small class="hint">Account ID linked to the Meta Page used for the campaign.</small></div><div class="field"><label>Linked Meta Page ID</label><input name="pageId" placeholder="Facebook/Meta Page ID"><small class="hint">Lead delivery is associated with the linked Meta Page.</small></div></div>
          <div class="field"><label>Instagram Lead Form IDs Optional</label><input name="formIds" placeholder="12345, 67890"><small class="hint">Recommended when Facebook and Instagram use the same Page, so the dashboard can label the source correctly.</small></div>
          <div class="row"><div class="field"><label>Page Access Token <small id="instagramAccessTokenHint" class="hint inline-hint"></small></label><input name="pageAccessToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Facebook Login Page token used for publishing, comments and the primary Private Reply route.</small></div><div class="field"><label>Webhook Verify Token <small id="instagramVerifyTokenHint" class="hint inline-hint"></small></label><input name="verifyToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Create your own private text and use the same value in Meta webhook setup.</small></div></div>
          <div class="field"><label>Instagram Login Token — DM Fallback Optional <small id="instagramLoginTokenHint" class="hint inline-hint"></small></label><input name="instagramLoginToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Optional Instagram User access token (usually starts with IGAA). It is used only when Meta rejects the Facebook Login comment-to-DM route. Private Replies need instagram_business_basic + instagram_business_manage_comments. Do not paste an expired or shared token.</small></div>
          <div class="field"><label>Graph API Version</label><input name="graphVersion" value="v26.0"><small class="hint">Default uses the current Meta Graph API generation included with this build.</small></div>
          <span class="uc-social-webhook-label">Instagram Webhook Callback URL</span><div class="copyline"><input id="instagramWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('instagramWebhookUrl')">Copy</button></div>
          <small class="hint">This shared Meta callback receives Instagram comments/messages when those webhook fields are subscribed, and continues to receive Meta Lead Ads events.</small>
          <div class="form-actions"><button class="btn compact">Save Instagram</button></div>
        </form>
      </details>

      <details class="card pay-detail uc-social-card" data-social-card="whatsapp">
        <summary>WhatsApp Webhook & Order OTP</summary>
        <form class="form" onsubmit="saveUCSocialPlatform(event,'whatsapp')">
          <div class="uc-social-info"><strong>Use:</strong> Keep order OTP here and receive incoming WhatsApp messages. Incoming contacts can be matched to the existing client CRM by phone number.</div>
          <div class="field"><label>WhatsApp Webhook Verify Token <small id="socialWhatsappVerifyHint" class="hint inline-hint"></small></label><input name="webhookVerifyToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Your private verification token. Use the same value in the WhatsApp webhook configuration.</small></div>
          <span class="uc-social-webhook-label">WhatsApp Webhook URL</span><div class="copyline"><input id="socialWhatsappWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('socialWhatsappWebhookUrl')">Copy</button></div>
          <p class="muted">Customer order tracking OTP continues to use the same existing WhatsApp configuration.</p>
          <div class="row"><div class="field"><label>OTP Provider</label><select name="otpProvider"><option value="whatsapp_cloud">WhatsApp Cloud API</option><option value="green_api">GAPI</option></select><small class="hint">Choose the provider already used for order OTP.</small></div><div class="field"><label>WhatsApp Phone Number ID</label><input name="phoneNumberId"><small class="hint">Provided by Meta for WhatsApp Cloud API.</small></div></div>
          <div class="row"><div class="field"><label>WhatsApp Cloud Token <small id="socialWhatsappCloudHint" class="hint inline-hint"></small></label><input name="cloudToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Access token used by the existing Cloud API sender.</small></div><div class="field"><label>GAPI Instance ID</label><input name="greenApiInstanceId"><small class="hint">Required only when GAPI is selected.</small></div></div>
          <div class="field"><label>GAPI Token <small id="socialGreenApiHint" class="hint inline-hint"></small></label><input name="greenApiToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">Required only when GAPI is selected.</small></div>
          <div class="form-actions"><button class="btn compact">Save WhatsApp / OTP</button></div>
        </form>
      </details>

      <details class="card pay-detail uc-social-card" data-social-card="linkedin">
        <summary>LinkedIn</summary>
        <form class="form" onsubmit="saveUCSocialPlatform(event,'linkedin')">
          <div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="enabled" type="checkbox"><span class="slider"></span></span><strong>Enable LinkedIn</strong></label><small class="uc-social-toggle-helper">Lead Gen Form integration</small></div>
          <div class="uc-social-info"><strong>Use:</strong> LinkedIn Lead Gen Form notifications can be fetched into the CRM after your LinkedIn app has Lead Sync access and a lead-notification subscription is configured.</div>
          <div class="row"><div class="field"><label>Client ID</label><input name="clientId"><small class="hint">Provided by your LinkedIn Developer application.</small></div><div class="field"><label>Client Secret <small id="linkedinClientSecretHint" class="hint inline-hint"></small></label><input name="clientSecret" type="password" placeholder="Leave blank to keep saved secret"><small class="hint">Provided by your LinkedIn Developer application; also validates this webhook.</small></div></div>
          <div class="field"><label>Access Token <small id="linkedinAccessTokenHint" class="hint inline-hint"></small></label><input name="accessToken" type="password" placeholder="Leave blank to keep saved token"><small class="hint">OAuth token with LinkedIn Lead Sync permission for the selected owner.</small></div>
          <div class="row"><div class="field"><label>Lead Owner</label><select name="ownerType"><option value="sponsoredAccount">Sponsored Ad Account</option><option value="organization">Organization</option></select><small class="hint">Choose where the lead form belongs.</small></div><div class="field"><label>Owner ID</label><input name="ownerId" placeholder="Ad account or organization ID"><small class="hint">Numeric ID from Campaign Manager or your LinkedIn organization.</small></div></div>
          <div class="row"><div class="field"><label>Lead Type</label><select name="leadType"><option value="SPONSORED">Sponsored</option><option value="EVENT">Event</option><option value="COMPANY">Company</option><option value="ORGANIZATION_PRODUCT">Organization Product</option></select><small class="hint">Must match the LinkedIn Lead Notification subscription.</small></div><div class="field"><label>LinkedIn API Version</label><input name="apiVersion" value="202607"><small class="hint">Version header in YYYYMM format.</small></div></div>
          <span class="uc-social-webhook-label">LinkedIn Lead Webhook URL</span><div class="copyline"><input id="linkedinWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('linkedinWebhookUrl')">Copy</button></div>
          <div class="uc-social-warning">LinkedIn Lead Sync requires separate approval. After approval, create the Lead Notification subscription with LinkedIn using this webhook URL.</div>
          <div class="form-actions"><button class="btn compact">Save LinkedIn</button></div>
        </form>
      </details>

      <details class="card pay-detail uc-social-card" data-social-card="x">
        <summary>X / Twitter</summary>
        <form class="form" onsubmit="saveUCSocialPlatform(event,'x')">
          <div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="enabled" type="checkbox"><span class="slider"></span></span><strong>Enable X / Twitter</strong></label><small class="uc-social-toggle-helper">Activity / message webhook</small></div>
          <div class="uc-social-info"><strong>Use:</strong> This receives supported X account activity such as incoming messages, mentions or replies and creates/matches an Enquiry. X does not use the same native Lead Form flow as Meta or LinkedIn.</div>
          <div class="notice" style="padding:14px 16px;line-height:1.55;margin:4px 0 16px"><strong>Use OAuth 2.0 credentials for Connect X / Twitter.</strong><br><small>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from X Developer Console → Keys &amp; Tokens → OAuth 2.0 Keys. Do not paste the App-only Bearer Token, Consumer Key or Consumer Secret here. The app-only Bearer Token cannot publish posts on behalf of your X account.</small></div>
          <div class="row"><div class="field"><label>OAuth 2.0 Client ID</label><input name="clientId" autocomplete="off"><small class="hint">Shown in X Developer Console under OAuth 2.0 Keys → Client ID.</small></div><div class="field"><label>OAuth 2.0 Client Secret <small id="xClientSecretHint" class="hint inline-hint"></small></label><input name="clientSecret" type="password" placeholder="Leave blank to keep saved secret" autocomplete="new-password"><small class="hint">Use the OAuth 2.0 Client Secret — not Consumer Key and not Consumer Secret.</small></div></div>
          <span class="uc-social-webhook-label">X OAuth Callback / Redirect URL</span><div class="copyline"><input id="xRedirectUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('xRedirectUrl')">Copy</button></div><small class="hint" style="display:block;margin:6px 0 14px">Add this exact URL to X Developer Console → App authentication settings → Callback URI / Redirect URL.</small>
          <div class="field"><label>Connected X User ID</label><input name="userId" readonly placeholder="Shown after Connect X / Twitter"><small class="hint">Filled automatically after OAuth connects your X account.</small></div>
          <span class="uc-social-webhook-label">X Activity Webhook URL</span><div class="copyline"><input id="xWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('xWebhookUrl')">Copy</button></div><small class="hint" style="display:block;margin-top:6px">Use this only for X Webhooks / Event Subscriptions. Do not use it as the OAuth Callback URI.</small>
          <div class="form-actions"><button class="btn compact">Save X / Twitter</button></div>
        </form>
      </details>
      <div id="socialMediaMsg"></div>`;
    return section;
  }

  function ensurePanel(){
    let panel=$('#socialMediaIntegrations');if(panel)return panel;
    const main=$('.main');if(!main)return null;panel=panelMarkup();main.appendChild(panel);return panel;
  }
  function hint(id,masked){const e=$(id);if(e)e.textContent=masked?`Saved: ${masked}`:'No secret saved yet.';}
  function setVal(card,name,v){const e=$(`#socialMediaIntegrations [data-social-card="${card}"] [name="${name}"]`);if(e)e.value=v??'';}
  function setCheck(card,name,v){const e=$(`#socialMediaIntegrations [data-social-card="${card}"] [name="${name}"]`);if(e)e.checked=!!v;}
  function closeCards(){$$('#socialMediaIntegrations details.uc-social-card').forEach(d=>d.open=false);}
  function message(text,type='notice'){const b=$('#socialMediaMsg');if(!b)return;if(!String(text||'').trim()){b.innerHTML='';return;}b.innerHTML=`<div class="${type==='error'?'error':'notice'+(type==='success'?' success':'')}">${H(text)}</div>`;}
  window.ucSocialIntegrationResult=function(platform,text,type='notice'){
    const key=String(platform||'').replace(/^google_indexing$/,'googleIndexing').replace(/^indexnow$/,'indexNow').replace(/^google_business$/,'googleBusiness').replace(/^google_drive$/,'googleDrive');
    const d=$(`#socialMediaIntegrations [data-social-card="${key}"]`);if(!d){message(text,type);return;}
    let box=d.querySelector('[data-uc-integration-result]');if(!box){box=document.createElement('div');box.dataset.ucIntegrationResult='1';box.className='uc-integration-result';const actions=d.querySelector('.form-actions,.uc-v167-actions,.uc-v1611-business-actions');if(actions)actions.before(box);else d.querySelector('form')?.appendChild(box);}
    box.innerHTML=String(text||'').trim()?`<div class="${type==='error'?'error':'notice'+(type==='success'?' success':'')}"><strong>${type==='error'?'Action needs attention':'Action result'}:</strong> ${H(text)}</div>`:'';
    message(text,type);
    const seq=String(Date.now())+Math.random();box.dataset.ucTransientSeq=seq;if(box.__ucTransientTimer)clearTimeout(box.__ucTransientTimer);box.__ucTransientTimer=setTimeout(()=>{if(box?.dataset?.ucTransientSeq===seq)box.innerHTML='';if($('#socialMediaMsg')?.textContent?.includes(String(text||'').trim()))message('');},45000);
  };

  function populate(s={},close=true){
    S.settings=s;
    const f=s.facebook||{},i=s.instagram||{},w=s.whatsapp||{},l=s.linkedin||{},x=s.x||{};
    setCheck('facebook','enabled',f.enabled);setVal('facebook','pageId',f.pageId);setVal('facebook','formIds',f.formIds);setVal('facebook','graphVersion',f.graphVersion||'v26.0');setVal('facebook','pageAccessToken','');setVal('facebook','verifyToken','');
    setCheck('instagram','enabled',i.enabled);setVal('instagram','instagramBusinessId',i.instagramBusinessId);setVal('instagram','pageId',i.pageId);setVal('instagram','formIds',i.formIds);setVal('instagram','graphVersion',i.graphVersion||'v26.0');setVal('instagram','pageAccessToken','');setVal('instagram','instagramLoginToken','');setVal('instagram','verifyToken','');
    setVal('whatsapp','webhookVerifyToken','');setVal('whatsapp','otpProvider',w.otpProvider||'whatsapp_cloud');setVal('whatsapp','phoneNumberId',w.phoneNumberId);setVal('whatsapp','cloudToken','');setVal('whatsapp','greenApiInstanceId',w.greenApiInstanceId);setVal('whatsapp','greenApiToken','');
    setCheck('linkedin','enabled',l.enabled);setVal('linkedin','clientId',l.clientId);setVal('linkedin','clientSecret','');setVal('linkedin','accessToken','');setVal('linkedin','ownerType',l.ownerType||'sponsoredAccount');setVal('linkedin','ownerId',l.ownerId);setVal('linkedin','leadType',l.leadType||'SPONSORED');setVal('linkedin','apiVersion',l.apiVersion||'202608');
    setCheck('x','enabled',x.enabled);setVal('x','clientId',x.clientId||'');setVal('x','clientSecret','');setVal('x','userId',x.userId||'');
    hint('#facebookAccessTokenHint',f.pageAccessTokenMasked);hint('#facebookVerifyTokenHint',f.verifyTokenMasked);hint('#instagramAccessTokenHint',i.pageAccessTokenMasked);hint('#instagramLoginTokenHint',i.instagramLoginTokenMasked);hint('#instagramVerifyTokenHint',i.verifyTokenMasked);hint('#socialWhatsappVerifyHint',w.webhookVerifyTokenMasked);hint('#socialWhatsappCloudHint',w.cloudTokenMasked);hint('#socialGreenApiHint',w.greenApiTokenMasked);hint('#linkedinClientSecretHint',l.clientSecretMasked);hint('#linkedinAccessTokenHint',l.accessTokenMasked);hint('#xClientSecretHint',x.clientSecretMasked);
    const urls={facebookWebhookUrl:s.metaWebhookUrl,instagramWebhookUrl:s.metaWebhookUrl,socialWhatsappWebhookUrl:s.whatsappWebhookUrl,linkedinWebhookUrl:s.linkedinWebhookUrl,linkedinRedirectUrl:s.linkedinRedirectUrl,xWebhookUrl:s.xWebhookUrl,xRedirectUrl:s.xRedirectUrl};
    Object.entries(urls).forEach(([id,v])=>{const e=$('#'+id);if(e)e.value=v||'';});
    if(close)closeCards();
  }

  window.load_socialMediaIntegrations=async function(){
    ensurePanel();message('Loading social media integrations…');
    try{const r=await api('/api/admin/social-integrations');populate(r.settings||{},true);message('');}
    catch(e){message(e.message||'Social media integrations could not be loaded.','error');}
  };

  window.saveUCSocialPlatform=async function(e,platform){
    e.preventDefault();const form=e.target,btn=form.querySelector('button[type="submit"],button:not([type])'),old=btn?.textContent;
    const payload={platform,...Object.fromEntries(new FormData(form).entries())};
    if(form.elements.enabled)payload.enabled=!!form.elements.enabled.checked;if(form.elements.autoPublish)payload.autoPublish=!!form.elements.autoPublish.checked;
    if(btn){btn.disabled=true;btn.textContent='Saving…';}message(`Saving ${platform==='x'?'X / Twitter':platform.charAt(0).toUpperCase()+platform.slice(1)} settings…`);
    try{const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(payload)});populate(r.settings||{},false);window.ucSocialIntegrationResult?.(platform,r.message||`${platform==='x'?'X / Twitter':platform.charAt(0).toUpperCase()+platform.slice(1)} settings were saved. Run Test Connection to verify the live API.`, 'success');}
    catch(err){window.ucSocialIntegrationResult?.(platform,err.message||'These integration settings could not be saved. Check the fields on this card and try again.','error');}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Save';}}
  };

  function init(){ensurePanel();closeCards();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,420));else setTimeout(init,420);
})();
