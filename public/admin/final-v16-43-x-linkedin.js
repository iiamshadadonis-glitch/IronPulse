/* V16.44 — X transient diagnostics + LinkedIn OAuth permissions/UX hardening.
   Additive UI only. Existing theme classes and social publishing logic stay authoritative. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bool=v=>v===true||v==='true'||v==='on'||v===1||v==='1';
  const apiJson=(path,options={})=>window.apiJson?window.apiJson(path,options):(window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status}).`);return d;}));
  const card=()=>$('#socialMediaIntegrations [data-social-card="linkedin"]');
  const state=()=>window.UCSocialIntegrations?.settings||{};

  function setLinkedInVisibility(form){
    if(!form)return;const identity=form.elements.publishingIdentity?.value||'member';
    const org=form.querySelector('[data-v1643-org-field]');if(org)org.hidden=identity!=='organization';
    const lead=!!form.elements.leadSyncEnabled?.checked,leadBox=form.querySelector('[data-v1643-lead-fields]');if(leadBox)leadBox.hidden=!lead;
    const plan=form.querySelector('[data-v1644-scope-plan]');
    if(plan){
      const auto=!!form.elements.autoPublish?.checked,community=!!form.elements.communityEnabled?.checked,ads=!!form.elements.adsEnabled?.checked;
      const needs=[];
      needs.push('<strong>Minimum connection:</strong> LinkedIn Developers → Products → request <strong>Sign in with LinkedIn using OpenID Connect</strong>. This provisions the <strong>openid</strong> and <strong>profile</strong> permissions used to identify the connected member.');
      if(auto&&identity==='member')needs.push('<strong>Member posting:</strong> request <strong>Share on LinkedIn</strong> so LinkedIn grants <strong>w_member_social</strong>.');
      if((auto&&identity==='organization')||community)needs.push('<strong>Organization/Page publishing or comment management:</strong> request/obtain <strong>Community Management API</strong> access (or another approved LinkedIn product that grants the organization social permissions). Organization publishing needs <strong>w_organization_social</strong>; Community Management adds the read/write social-action permissions after LinkedIn approval.');
      if(lead)needs.push('<strong>Lead Sync:</strong> request <strong>Lead Sync API</strong> approval before enabling this switch.');
      if(ads)needs.push('<strong>Advertising:</strong> request <strong>Advertising API</strong> approval before enabling Advertising API preparation.');
      plan.innerHTML=`<strong>LinkedIn permissions required for the options selected below</strong><div style="display:grid;gap:8px;margin-top:8px">${needs.map(x=>`<div>${x}</div>`).join('')}</div><div style="margin-top:10px"><strong>If LinkedIn Auth shows “No permissions added”:</strong> open your app's <strong>Products</strong> tab and request the Product(s) above first. Saving a Client ID/Secret or callback URL does not create OAuth scopes by itself.</div>`;
    }
  }
  function linkedinMarkup(){return `
    <div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="enabled" type="checkbox"><span class="slider"></span></span><strong>Enable LinkedIn</strong></label><small class="uc-social-toggle-helper">OAuth publishing, Community Management and Lead Sync</small></div>
    <div class="uc-social-info"><strong>Use:</strong> Connect LinkedIn with OAuth 2.0. Basic publishing, Community Management, Lead Sync and Advertising are checked separately because LinkedIn approves those API products independently.</div>
    <div class="notice" style="padding:14px 16px;line-height:1.55;margin:4px 0 12px"><strong>Before you click Connect LinkedIn</strong><br><small>1) Add the exact callback URL below in LinkedIn Developers → Auth → Authorized redirect URLs. 2) Open the LinkedIn app's <strong>Products</strong> tab and request the Product(s) that provide the scopes you need. If the Auth page says <strong>No permissions added</strong>, LinkedIn has not provisioned any OAuth Product permissions yet and the authorization screen can fail even when the Client ID, Secret and callback URL are correct. <a class="uc-help-link" href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener">Open LinkedIn Developers ↗</a></small></div>
    <div class="uc-social-info" data-v1644-scope-plan style="padding:14px 16px;line-height:1.55;margin:0 0 16px"></div>
    <div class="row"><div class="field"><label>LinkedIn Client ID</label><input name="clientId" autocomplete="off"><small class="hint">LinkedIn Developers → your app → Auth → Application credentials.</small></div><div class="field"><label>LinkedIn Client Secret <small id="linkedinClientSecretHint" class="hint inline-hint"></small></label><input name="clientSecret" type="password" autocomplete="new-password" placeholder="Leave blank to keep saved secret"><small class="hint">Keep this private. DropBeat Dance Studio uses it only for the OAuth authorization-code exchange.</small></div></div>
    <span class="uc-social-webhook-label">LinkedIn OAuth Callback / Redirect URL</span><div class="copyline"><input id="linkedinRedirectUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('linkedinRedirectUrl')">Copy</button></div><small class="hint" style="display:block;margin:6px 0 14px">Paste this exact HTTPS URL into LinkedIn Developers → Auth → Authorized redirect URLs.</small>
    <div class="row"><div class="field"><label>Publishing Identity</label><select name="publishingIdentity"><option value="member">Member Profile</option><option value="organization">Organization / Company Page</option></select><small class="hint">Member Profile uses the connected member. Organization/Page publishing also needs the numeric Organization ID and an eligible Page role.</small></div><div class="field" data-v1643-org-field hidden><label>Organization ID</label><input name="organizationId" placeholder="Numeric LinkedIn Organization ID"><small class="hint">Required only for Organization / Company Page publishing.</small></div></div>
    <div class="row"><div class="field"><label>Connected LinkedIn Member</label><input name="connectedMember" readonly placeholder="Shown automatically after Connect LinkedIn"><small class="hint">OAuth fills this automatically; do not type an access token manually.</small></div><div class="field"><label>LinkedIn API Version</label><input name="apiVersion" value="202608" readonly><small class="hint">Managed by this build. 202608 = LinkedIn Marketing API August 2026.</small></div></div>
    <div class="row">
      <div class="field"><div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="communityEnabled" type="checkbox"><span class="slider"></span></span><strong>Community Management</strong></label><small class="uc-social-toggle-helper">Comments and reactions — approval required</small></div></div>
      <div class="field"><div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="leadSyncEnabled" type="checkbox"><span class="slider"></span></span><strong>Lead Sync</strong></label><small class="uc-social-toggle-helper">Lead Gen Forms — separate approval required</small></div></div>
    </div>
    <div class="field"><div class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="adsEnabled" type="checkbox"><span class="slider"></span></span><strong>Advertising API preparation</strong></label><small class="uc-social-toggle-helper">Requests ad scopes only after you have Advertising API approval</small></div></div>
    <div data-v1643-lead-fields hidden>
      <div class="uc-social-info"><strong>Lead Sync settings:</strong> these fields are used only for LinkedIn Lead Notification subscriptions after LinkedIn approves Lead Sync for this app.</div>
      <div class="row"><div class="field"><label>Lead Owner</label><select name="leadOwnerType"><option value="sponsoredAccount">Sponsored Ad Account</option><option value="organization">Organization</option></select><small class="hint">Choose where the Lead Gen Form belongs.</small></div><div class="field"><label>Lead Owner ID</label><input name="leadOwnerId" placeholder="Ad account or organization ID"><small class="hint">Numeric ID from Campaign Manager or LinkedIn organization settings.</small></div></div>
      <div class="field"><label>Lead Type</label><select name="leadType"><option value="SPONSORED">Sponsored</option><option value="EVENT">Event</option><option value="COMPANY">Company</option><option value="ORGANIZATION_PRODUCT">Organization Product</option></select><small class="hint">Must match the LinkedIn Lead Notification subscription.</small></div>
      <span class="uc-social-webhook-label">LinkedIn Lead Webhook URL</span><div class="copyline"><input id="linkedinWebhookUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('linkedinWebhookUrl')">Copy</button></div><small class="hint" style="display:block;margin:6px 0 14px">Use this only after LinkedIn Lead Sync approval when creating the Lead Notification subscription. It is not the OAuth callback URL.</small>
    </div>
    <div class="uc-social-warning" style="padding:12px 14px;line-height:1.5">LinkedIn normal Inbox / Direct Message automation is not exposed by the ordinary public OAuth products used here. This card will show only capabilities that LinkedIn actually grants to the connected app/token.</div>
    <div data-v168-autopublish="1" class="uc-social-toggle-item"><label class="uc-social-toggle-capsule"><span class="switch"><input name="autoPublish" type="checkbox"><span class="slider"></span></span><strong>Automatically publish new Auditions</strong></label><small class="uc-social-toggle-helper">Runs only while LinkedIn is enabled, connected and the publishing permission is granted</small></div>
    <div class="form-actions uc-v168-actions" data-v1644-native-actions="1"><span data-v168-actions="1" hidden></span><button class="btn compact" type="submit">Save Settings</button><button class="btn compact" type="button" onclick="connectUCClassicSocial(this,'linkedin')">Connect LinkedIn</button><button class="btn secondary compact" type="button" onclick="testUCClassicSocial(this,'linkedin')">Test Connection</button><button class="btn secondary compact" type="button" onclick="disconnectUCClassicSocial(this,'linkedin')">Disconnect</button></div>`;}

  function rebuildLinkedIn(){
    const d=card(),form=$('form',d||document);if(!form)return null;
    if(!form.dataset.v1643Linkedin){form.dataset.v1643Linkedin='1';form.innerHTML=linkedinMarkup();form.addEventListener('change',e=>{if(['publishingIdentity','leadSyncEnabled','communityEnabled','adsEnabled','autoPublish'].includes(e.target?.name))setLinkedInVisibility(form);});}
    form.querySelectorAll('.uc-v168-inline-actions').forEach(x=>x.remove());
    applyLinkedIn(state().linkedin||{},state());return form;
  }
  function applyLinkedIn(c={},all=state()){
    const form=$('form',card()||document);if(!form||!form.dataset.v1643Linkedin)return;
    if(form.elements.enabled)form.elements.enabled.checked=!!c.enabled;if(form.elements.autoPublish)form.elements.autoPublish.checked=!!c.autoPublish;
    if(form.elements.clientId)form.elements.clientId.value=c.clientId||'';if(form.elements.clientSecret)form.elements.clientSecret.value='';
    if(form.elements.publishingIdentity)form.elements.publishingIdentity.value=c.publishingIdentity||((c.ownerType==='organization')?'organization':'member');
    if(form.elements.organizationId)form.elements.organizationId.value=c.organizationId||(c.ownerType==='organization'?c.ownerId:'')||'';
    if(form.elements.connectedMember)form.elements.connectedMember.value=c.memberName?(c.memberEmail?`${c.memberName} — ${c.memberEmail}`:c.memberName):(c.memberId?`Member ID ${c.memberId}`:'');
    if(form.elements.apiVersion)form.elements.apiVersion.value='202608';
    if(form.elements.communityEnabled)form.elements.communityEnabled.checked=!!c.communityEnabled;if(form.elements.leadSyncEnabled)form.elements.leadSyncEnabled.checked=!!c.leadSyncEnabled;if(form.elements.adsEnabled)form.elements.adsEnabled.checked=!!c.adsEnabled;
    if(form.elements.leadOwnerType)form.elements.leadOwnerType.value=c.leadOwnerType||c.ownerType||'sponsoredAccount';if(form.elements.leadOwnerId)form.elements.leadOwnerId.value=c.leadOwnerId||c.ownerId||'';if(form.elements.leadType)form.elements.leadType.value=c.leadType||'SPONSORED';
    const redirect=$('#linkedinRedirectUrl',form),webhook=$('#linkedinWebhookUrl',form);if(redirect)redirect.value=all.linkedinRedirectUrl||`${location.origin}/api/admin/linkedin-oauth/callback`;if(webhook)webhook.value=all.linkedinWebhookUrl||`${location.origin}/api/webhooks/linkedin-leads`;
    const secretHint=$('#linkedinClientSecretHint',form);if(secretHint)secretHint.textContent=c.clientSecretMasked?`Saved: ${c.clientSecretMasked}`:'No secret saved yet.';
    setLinkedInVisibility(form);
  }
  function linkedInPayload(){
    const form=$('form',card()||document);if(!form)throw new Error('LinkedIn form is not available. Refresh Integrations and try again.');
    const payload={platform:'linkedin',...Object.fromEntries(new FormData(form).entries())};payload.enabled=!!form.elements.enabled?.checked;payload.autoPublish=!!form.elements.autoPublish?.checked;payload.communityEnabled=!!form.elements.communityEnabled?.checked;payload.leadSyncEnabled=!!form.elements.leadSyncEnabled?.checked;payload.adsEnabled=!!form.elements.adsEnabled?.checked;payload.apiVersion='202608';return payload;
  }
  async function saveLinkedInCurrent(){
    const r=await apiJson('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(linkedInPayload())});if(r?.settings){window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=r.settings;applyLinkedIn(r.settings.linkedin||{},r.settings);}return r;
  }
  async function refreshLinkedInState(){
    const r=await apiJson('/api/admin/social-integrations');if(r?.settings){window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=r.settings;applyLinkedIn(r.settings.linkedin||{},r.settings);}return r;
  }

  const oldConnect=window.connectUCClassicSocial,oldTest=window.testUCClassicSocial,oldDisconnect=window.disconnectUCClassicSocial;
  window.connectUCClassicSocial=async function(btn,p){
    if(String(p||'').toLowerCase()!=='linkedin')return oldConnect?.apply(this,arguments);
    const old=btn?.textContent;try{if(btn){btn.disabled=true;btn.textContent='Saving…';}await saveLinkedInCurrent();if(btn)btn.textContent='Connecting…';const r=await apiJson('/api/admin/linkedin-auth?action=url');if(!r?.url)throw new Error('LinkedIn did not return an authorization URL.');location.href=r.url;}catch(e){window.ucSocialIntegrationResult?.('linkedin',e.message||'LinkedIn could not start OAuth.','error');if(btn){btn.disabled=false;btn.textContent=old||'Connect LinkedIn';}}
  };
  window.testUCClassicSocial=async function(btn,p){
    if(String(p||'').toLowerCase()!=='linkedin')return oldTest?.apply(this,arguments);
    const old=btn?.textContent;try{if(btn){btn.disabled=true;btn.textContent='Testing…';}await saveLinkedInCurrent();const r=await apiJson('/api/admin/linkedin-auth',{method:'POST',body:JSON.stringify({action:'test'})});await refreshLinkedInState();window.ucSocialIntegrationResult?.('linkedin',r.message||'LinkedIn connection test completed.',r.level==='warning'?'notice':'success');return r;}catch(e){await refreshLinkedInState().catch(()=>{});window.ucSocialIntegrationResult?.('linkedin',e.message||'LinkedIn Test Connection failed.','error');throw e;}finally{if(btn){btn.disabled=false;btn.textContent=old||'Test Connection';}}
  };
  window.disconnectUCClassicSocial=async function(btn,p){
    if(String(p||'').toLowerCase()!=='linkedin')return oldDisconnect?.apply(this,arguments);
    const old=btn?.textContent;try{if(btn){btn.disabled=true;btn.textContent='Disconnecting…';}const r=await apiJson('/api/admin/linkedin-auth',{method:'POST',body:JSON.stringify({action:'disconnect'})});await refreshLinkedInState();window.ucSocialIntegrationResult?.('linkedin',r.message||'LinkedIn disconnected.','success');return r;}catch(e){window.ucSocialIntegrationResult?.('linkedin',e.message||'LinkedIn could not be disconnected.','error');}finally{if(btn){btn.disabled=false;btn.textContent=old||'Disconnect';}}
  };

  // Re-apply the V16.43 LinkedIn controls after the existing Refresh loader populates its legacy fields.
  const oldLoad=window.load_socialMediaIntegrations;if(typeof oldLoad==='function'&&!oldLoad.__v1643){const wrapped=async function(){const r=await oldLoad.apply(this,arguments);rebuildLinkedIn();return r;};wrapped.__v1643=true;window.load_socialMediaIntegrations=wrapped;}

  function xBillingMessage(error=''){
    const detail=String(error||'').trim();return `X / Twitter could not publish this Audition because the X Developer API account does not currently have usable pay-per-use credits${detail?`. ${detail}`:'.'}`;
  }
  function showXAuditionAdvisory(error=''){
    let host=$('#ucV159AuditionOutcome')||$('#blogMsg');if(!host)return;let box=$('#ucV1643XPublishAdvisory');if(!box){box=document.createElement('div');box.id='ucV1643XPublishAdvisory';host.insertAdjacentElement('afterend',box);}
    const billing=/\b402\b|credit|billing|pay[- ]?per[- ]?use|payment/i.test(String(error||''));
    const primary=billing?xBillingMessage(error):`Audition publishing completed, but X / Twitter could not publish the X post. ${String(error||'Check Settings → Integrations → X / Twitter for the latest diagnostic.')}`;
    const recommendation=billing?'Recommendation: add API credits in X Developer Console → Credits / Payments before using X automatic publishing. Until credits are available, disable X or switch off Automatically publish new Auditions so the rest of your social platforms can publish without repeated X failures.':'Recommendation: open Settings → Integrations → X / Twitter, run Test Connection, and correct the reported permission/account issue before enabling automatic X publishing again.';
    box.innerHTML=`<div class="error" style="margin-top:10px"><strong>X / Twitter:</strong> ${H(primary)}</div><div class="notice success" style="margin-top:8px"><strong>Recommendation:</strong> ${H(recommendation.replace(/^Recommendation:\s*/,''))}</div>`;
    window.ucAdminToast?.(billing?'X publishing needs Developer API credits. Other enabled platforms can continue publishing.':'X automatic publishing failed. Check the X integration diagnostic.','error');
  }
  async function watchXAfterAudition(startedAt){
    const delays=[1000,1800,2800,4200,6500];let elapsed=0;
    for(const delay of delays){await new Promise(r=>setTimeout(r,Math.max(0,delay-elapsed)));elapsed=delay;try{const r=await apiJson('/api/admin/social-integrations'),x=r?.settings?.x||{};if(!x.enabled||!x.autoPublish)return;const at=Date.parse(x.lastPublishAt||'');if(Number.isFinite(at)&&at>=startedAt-1000){if(String(x.lastPublishStatus||'').toLowerCase()==='failed'){showXAuditionAdvisory(x.lastPublishError||x.lastError||x.publishingProbeMessage||'');return;}if(String(x.lastPublishStatus||'').toLowerCase()==='published')return;}}catch(_){} }
  }
  const oldSaveBlog=window.saveBlogAudition;if(typeof oldSaveBlog==='function'&&!oldSaveBlog.__v1643){const wrapped=async function(ev,statusOverride){const f=$('#blogForm'),status=String(statusOverride||f?.elements?.status?.value||'draft').toLowerCase(),started=Date.now();const r=await oldSaveBlog.apply(this,arguments);if(r&&status==='published')watchXAfterAudition(started);return r;};wrapped.__v1643=true;window.saveBlogAudition=wrapped;window.saveBlog=function(ev){return window.saveBlogAudition(ev,$('#blogForm [name="status"]')?.value||'draft');};}
  for(const fn of ['ucV154PostDraft','ucV157RepostDeleted']){const old=window[fn];if(typeof old==='function'&&!old.__v1643){const wrapped=async function(){const started=Date.now(),r=await old.apply(this,arguments);watchXAfterAudition(started);return r;};wrapped.__v1643=true;window[fn]=wrapped;}}

  function init(){rebuildLinkedIn();const q=new URLSearchParams(location.search);if(q.has('linkedin'))setTimeout(()=>refreshLinkedInState().then(()=>rebuildLinkedIn()).catch(()=>{}),400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));else setTimeout(init,900);
})();
