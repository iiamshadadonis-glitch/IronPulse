/* V16.14 Facebook Page-token + permission diagnostics.
   Additive only: does not change the existing theme or non-Facebook integrations. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Website request failed with HTTP ${r.status}.`);return d;});
  const card=()=>$('#socialMediaIntegrations [data-social-card="facebook"]');
  const form=()=>card()?.querySelector('form');
  const f=(name)=>form()?.elements?.[name];

  function result(text,type='notice'){
    window.ucSocialIntegrationResult?.('facebook',text,type);
  }
  function boolWord(v){return v===true?'Ready':v===false?'Needs attention':'Not inspected yet';}
  function capabilityLine(label,value,detail=''){
    return `<div><strong>${H(label)}:</strong> ${H(value)}${detail?` <span class="muted">— ${H(detail)}</span>`:''}</div>`;
  }
  function ensureFields(){
    const d=card(),fm=form();if(!d||!fm)return;
    if(!$('[data-v1614-facebook-oauth]',fm)){
      const marker=$('.row',fm);
      const block=document.createElement('div');block.dataset.v1614FacebookOauth='1';block.innerHTML=`
        <div class="uc-social-info"><strong>Recommended connection:</strong> Save the Meta App ID, App Secret and Facebook Login for Business Configuration ID below, then click <strong>Connect Facebook</strong>. The website will ask Meta for the Pages you manage and save the Page Access Token for the exact Page instead of treating any readable token as a publishing token.</div>
        <div class="row">
          <div class="field"><label>Meta App ID</label><input name="appId" placeholder="Meta App ID"><small class="hint">Use the App ID from the same Meta developer app that owns your Facebook Login for Business configuration.</small></div>
          <div class="field"><label>Facebook Login for Business Configuration ID</label><input name="loginConfigId" placeholder="Configuration ID"><small class="hint">Create/select a Facebook Login for Business configuration containing the Page permissions required by this website.</small></div>
        </div>
        <div class="field"><label>Meta App Secret <small id="facebookAppSecretHint" class="hint inline-hint"></small></label><input name="appSecret" type="password" placeholder="Leave blank to keep saved App Secret"><small class="hint">Used only server-side to exchange/inspect Meta tokens. Never place it in frontend code or a public repository.</small></div>
        <span class="uc-social-webhook-label">Facebook OAuth Redirect URL</span><div class="copyline"><input id="facebookOauthRedirectUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('facebookOauthRedirectUrl')">Copy</button></div>
        <small class="hint">Add this exact URL to the valid OAuth redirect/connection configuration used by the Meta app.</small>`;
      if(marker)marker.before(block);else fm.prepend(block);
    }
    if(!$('[data-v1614-facebook-capabilities]',fm)){
      const auto=$('[data-v168-autopublish]',fm),actions=$('.form-actions',fm);
      const box=document.createElement('div');box.dataset.v1614FacebookCapabilities='1';box.className='uc-social-info';
      if(auto)auto.after(box);else if(actions)actions.before(box);else fm.appendChild(box);
    }
  }
  function populateFields(){
    ensureFields();const s=window.UCSocialIntegrations?.settings||{},c=s.facebook||{};
    if(f('appId'))f('appId').value=c.appId||'';
    if(f('loginConfigId'))f('loginConfigId').value=c.loginConfigId||'';
    if(f('appSecret'))f('appSecret').value='';
    const hint=$('#facebookAppSecretHint');if(hint)hint.textContent=c.appSecretMasked?`Saved: ${c.appSecretMasked}`:'No App Secret saved yet.';
    const redirect=$('#facebookOauthRedirectUrl');if(redirect)redirect.value=s.facebookRedirectUrl||`${location.origin}/api/admin/facebook-oauth/callback`;
    renderCapabilities(c);
  }
  function renderCapabilities(c={}){
    const box=$('[data-v1614-facebook-capabilities]',form()||document);if(!box)return;
    const connected=c.connectionState==='connected'||c.connected;
    const scopes=Array.isArray(c.grantedScopes)?c.grantedScopes:[],tasks=Array.isArray(c.pageTasks)?c.pageTasks:[];
    const token=c.tokenType?`${c.tokenType} token`:(connected?'Connected token; run Test Connection to verify Page-token type':'Not verified');
    const pubDetail=c.publishingReady===false?'Requires pages_manage_posts and Page content-creation/full-control task.':'';
    const hookDetail=c.webhookReady===false?'Requires pages_manage_metadata and Page moderation/full-control task.':'';
    const msgDetail=c.messagingReady===false?'Requires pages_messaging plus pages_manage_metadata.':'';
    const leadDetail=c.leadReady===false?'Requires leads_retrieval.':'';
    const engageDetail=c.engagementReady===false?'Requires pages_manage_engagement and pages_read_user_content.':'';
    box.innerHTML=`<strong>Facebook capability check</strong><div class="muted">“Connected” confirms Page authentication only after the new Test Connection verifies that the token identifies the exact configured Page. Publishing and webhook permissions are checked separately.</div>
      ${capabilityLine('Authenticated Page',connected?(c.pageName?`${c.pageName} (${c.pageId||''})`:`Page ${c.pageId||''}`):'Not connected')}
      ${capabilityLine('Token',token,c.tokenAppId?`Meta App ${c.tokenAppId}`:'')}
      ${capabilityLine('Automatic Page publishing',boolWord(c.publishingReady),pubDetail)}
      ${capabilityLine('Webhook management',boolWord(c.webhookReady),hookDetail)}
      ${capabilityLine('Messenger',boolWord(c.messagingReady),msgDetail)}
      ${capabilityLine('Lead Ads',boolWord(c.leadReady),leadDetail)}
      ${capabilityLine('Comment management',boolWord(c.engagementReady),engageDetail)}
      ${scopes.length?`<div class="muted"><strong>Granted permissions:</strong> ${H(scopes.join(', '))}</div>`:''}
      ${tasks.length?`<div class="muted"><strong>Page tasks:</strong> ${H(tasks.join(', '))}</div>`:''}`;
  }
  function formPayload(){
    const fm=form();if(!fm)return null;
    const payload={platform:'facebook',...Object.fromEntries(new FormData(fm).entries())};
    if(fm.elements.enabled)payload.enabled=!!fm.elements.enabled.checked;
    if(fm.elements.autoPublish)payload.autoPublish=!!fm.elements.autoPublish.checked;
    return payload;
  }
  async function saveBeforeConnect(){
    const payload=formPayload();if(!payload)throw new Error('Facebook settings form is not available. Refresh Integrations and try again.');
    const r=await apiJson('/api/admin/social-integrations',{method:'POST',body:JSON.stringify(payload)});
    window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=r.settings||{};populateFields();return r;
  }
  async function refresh(){
    await window.load_socialMediaIntegrations?.();setTimeout(populateFields,80);
  }
  function setBusy(btn,text){const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent=text;}return ()=>{if(btn){btn.disabled=false;btn.textContent=old||'Action';}};}

  const oldConnect=window.connectUCClassicSocial;
  window.connectUCClassicSocial=async function(btn,p){
    if(String(p)!=='facebook')return oldConnect?.apply(this,arguments);
    const done=setBusy(btn,'Connecting…');
    try{
      const saved=await saveBeforeConnect(),c=saved.settings?.facebook||{};
      if(c.appId&&c.loginConfigId&&c.appSecretMasked){
        const auth=await apiJson('/api/admin/facebook-auth?action=url');
        result('Facebook settings were saved. Opening Meta authorization now. Choose the Facebook account that manages the configured Page and approve the permissions in your Facebook Login for Business configuration.','success');
        location.assign(auth.url);return;
      }
      result('Facebook is currently using manual Page-token mode because the Meta App ID, App Secret and/or Facebook Login for Business Configuration ID is not saved. The website will test the saved token, but automatic publishing will work only if that token is the Page Access Token for this exact Page and contains pages_manage_posts. Add the three Meta app fields above for the recommended guided connection.','notice');
      const r=await apiJson('/api/admin/social-platform-action',{method:'POST',body:JSON.stringify({platform:'facebook',action:'connect'})});
      result(r.message||'Facebook connection test completed.',r.level==='warning'?'notice':'success');await refresh();
    }catch(e){result(e.message||'Facebook connection could not be completed.','error');}
    finally{done();}
  };

  const oldTest=window.testUCClassicSocial;
  window.testUCClassicSocial=async function(btn,p){
    if(String(p)!=='facebook')return oldTest?.apply(this,arguments);
    const done=setBusy(btn,'Testing…');
    try{
      await saveBeforeConnect();
      const r=await apiJson('/api/admin/social-platform-action',{method:'POST',body:JSON.stringify({platform:'facebook',action:'test'})});
      result(r.message||'Facebook connection test completed.',r.level==='warning'?'notice':'success');await refresh();
    }catch(e){result(e.message||'Facebook connection test failed.','error');}
    finally{done();}
  };

  window.configureUCFacebookWebhook=async function(btn){
    const done=setBusy(btn,'Configuring…');
    try{
      await saveBeforeConnect();
      const r=await apiJson('/api/admin/social-platform-action',{method:'POST',body:JSON.stringify({platform:'facebook',action:'subscribe_webhook'})});
      result(r.message||'Facebook webhook configuration completed.',r.partial?'notice':'success');await refresh();
    }catch(e){result(e.message||'Facebook webhook configuration failed.','error');}
    finally{done();}
  };

  const oldLoad=window.load_socialMediaIntegrations;
  if(typeof oldLoad==='function'&&!oldLoad.__v1614){
    const wrapped=async function(){const r=await oldLoad.apply(this,arguments);setTimeout(populateFields,80);return r;};wrapped.__v1614=true;window.load_socialMediaIntegrations=wrapped;
  }
  function showCallbackResult(){
    const u=new URL(location.href),status=u.searchParams.get('facebook'),message=u.searchParams.get('social_message');if(!status&&!message)return;
    try{window.tab?.('socialMediaIntegrations');}catch(_){ }
    setTimeout(()=>{const d=card();if(d)d.open=true;if(message)result(message,status==='error'?'error':'success');},500);
    u.searchParams.delete('facebook');u.searchParams.delete('social_message');history.replaceState({},'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
  }
  function init(){ensureFields();populateFields();showCallbackResult();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,850));else setTimeout(init,850);
})();
