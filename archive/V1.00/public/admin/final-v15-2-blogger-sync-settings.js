/* V15.2 — one-click Blogger live+draft sync, clearer Audition actions,
   and independent collapsible API/Blogger settings. Existing theme/logics are preserved. */
(function(){
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function req(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.payload=d;throw e;}return d;}
  function say(target,text,type='notice'){if(typeof window.msg==='function'){window.msg(target,text,type);return;}const el=$(target);if(el)el.innerHTML=`<div class="${type==='error'?'error':'notice'}">${H(text)}</div>`;}

  const draftSvg=`<svg class="uc-v152-draft-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/><path d="M9 15.5l5.6-5.6 1.8 1.8-5.6 5.6-2.3.5z"/></svg>`;

  function apiHelp(){return `<h3>API Base URL & Automation</h3><p class="uc-help-lead">These settings are for external automation/API access. They are separate from the direct Blogger connection.</p>
    <h4>API Base URL</h4><p>This is the base address used by an external workflow when it calls IronPulse Gym API endpoints. It is generated from the live website domain and normally should not be edited.</p>
    <h4>Vendor User ID</h4><p>Internal identifier for this IronPulse Gym installation. Keep the saved value unless the developer intentionally changes the integration design.</p>
    <h4>Bearer Token & Authorization Header</h4><p>Generate a token only when another trusted system such as n8n needs to call the automation endpoints. The calling system sends the token in the Authorization header.</p>
    <div class="uc-example"><strong>Example:</strong> If n8n is connected later, generate the token here, copy the Authorization Header, and use it in the n8n HTTP request. Direct Blogger publishing does not require this Bearer Token.</div>
    <div class="uc-warning"><strong>Important:</strong> Generating a new token replaces the previous token. Revoke it only when you intentionally want existing automation access to stop.</div>`;}

  function bloggerHelp(){return `<h3>Blogger Connection — Exact Workflow</h3><p class="uc-help-lead">This card controls which Blogger account and which one specific blog are used for Fitness Tip Updates. Your other old blogs remain untouched.</p>
    <ol><li>Enter/save the Google OAuth Client ID and Client Secret, then click <strong>Connect Blogger</strong>.</li><li>After Google authorizes the account, return here. The <strong>Blog Name</strong> list will contain every blog managed by that Google account.</li><li>Select the blog you want IronPulse Gym to use — for this project select <strong>IronPulse Gym</strong>.</li><li>Click <strong>Save Blogger Connection</strong>. The status box should show the selected blog name.</li><li>Go to <strong>Social Media → Fitness Tips</strong> and click <strong>Load Fitness Tip Updates</strong>. That one button synchronizes both <strong>published posts and drafts</strong> from the selected blog into the admin panel.</li></ol>
    <h4>Connection Check</h4><p><strong>Retry Blogger Check</strong> refreshes the Google/Blogger connection and reloads the blogs available to the authorized account.</p>
    <h4>Manual Blog ID Optional</h4><p>This is only a fallback when the required blog does not appear correctly in the Blog Name list. Paste the numeric Blog ID and click <strong>Connect Blog ID</strong>. That button verifies and selects the blog immediately.</p>
    <h4>What happens after synchronization?</h4><p>Published Blogger posts appear as Published in Existing Fitness Tips and can appear on <strong>/blog</strong>. Blogger drafts appear as Draft in Existing Fitness Tips and stay hidden from the public website until published.</p>
    <div class="uc-example"><strong>Current-project example:</strong> After selecting “IronPulse Gym”, click Save Blogger Connection, then open Fitness Tips and click Load Fitness Tip Updates. You do not need to import each fitness tip manually.</div>
    <div class="uc-warning"><strong>Do not select an old unrelated blog.</strong> Synchronization always uses only the Blog Name currently saved in this Blogger Connection card.</div>`;}

  function settingsMarkup(){return `<div class="uc-v152-api-stack">
    <details id="ucV152ApiCore" class="card admin-collapsed-card uc-v152-settings-card"><summary class="uc-v152-help-summary">API Base URL &amp; Automation</summary><div class="collapsed-body">
      <div class="field"><label>API Base URL</label><div class="copyline"><input id="apiBaseUrl" readonly><button class="btn secondary small" type="button" onclick="copyValue('apiBaseUrl')">Copy</button></div></div>
      <div class="field"><label>Vendor User ID</label><input id="vendorUserId" placeholder="dropbeat-dance-studio"></div>
      <div class="field"><label>Bearer Token</label><div class="copyline"><input id="apiBearerToken" readonly placeholder="Generate token first"><button class="btn secondary small" type="button" onclick="copyValue('apiBearerToken')">Copy</button></div><small class="hint">Use this in automation software as Authorization: Bearer TOKEN.</small></div>
      <div class="field"><label>Authorization Header</label><div class="copyline"><input id="authHeaderExample" readonly><button class="btn secondary small" type="button" onclick="copyValue('authHeaderExample')">Copy</button></div></div>
      <div class="uc-v152-api-actions"><button class="btn compact" type="button" onclick="saveAutomationApiSettings()">Save API Settings</button><button class="btn compact" type="button" onclick="generateApiToken()">Generate Token</button><button class="btn secondary compact" type="button" onclick="revokeApiToken()">Revoke Token</button></div>
    </div></details>
    <details id="ucV152Blogger" class="card admin-collapsed-card uc-v152-settings-card"><summary class="uc-v152-help-summary">Blogger Connection</summary><div class="collapsed-body">
      <div id="bloggerConnectionStatus" class="notice">Blogger is not connected yet.</div>
      <div class="row"><div class="field"><label>Google OAuth Client ID</label><input id="bloggerClientId" placeholder="Paste the Web application Client ID"></div><div class="field"><label>Google OAuth Client Secret</label><input id="bloggerClientSecret" type="password" placeholder="Paste once, or leave blank to keep the saved secret"></div></div>
      <div class="field"><label>Authorized Redirect URI</label><div class="copyline"><input id="bloggerRedirectUri" readonly><button class="btn secondary small" type="button" onclick="copyValue('bloggerRedirectUri')">Copy</button></div><small class="hint">Add this exact URI to the Google OAuth Web application before connecting.</small></div>
      <div class="field uc-v152-full-field"><label>Blogger API Key Optional</label><input id="bloggerApiKey" placeholder="Optional for public/read-only Blogger API access"><small class="hint">OAuth is used for direct publishing. Leave this blank unless the developer specifically needs a separate public/read-only API key.</small></div>
      <div class="field uc-v152-full-field"><label>Blog Name</label><select id="bloggerBlogId"><option value="">Connect Blogger first, then choose a blog</option></select><small class="hint uc-v152-selection-note">Choose the one blog that should publish and synchronize IronPulse Gym audition fitness tips, then click Save Blogger Connection.</small></div>
      <div class="uc-v152-blogger-bottom-row"><div class="field"><label>Manual Blog ID Optional</label><input id="bloggerManualBlogId" inputmode="numeric" placeholder="Paste the numeric Blog ID only"><small class="hint">Fallback only. Use this when the required blog cannot be selected normally from Blog Name.</small></div><div class="field"><label>Connection Check</label><div class="uc-v152-connection-actions"><button class="btn secondary compact" type="button" onclick="retryBloggerCheckV152()">Retry Blogger Check</button><button class="btn secondary compact" type="button" onclick="connectManualBlogIdV152()">Connect Blog ID</button></div><small class="hint">Retry refreshes the authorized Blogger account. Connect Blog ID verifies and selects the numeric Blog ID entered on the left.</small></div></div>
      <div class="uc-v152-blogger-actions"><button class="btn compact" type="button" onclick="saveBloggerConnectionV152()">Save Blogger Connection</button><button class="btn secondary compact" type="button" onclick="connectBloggerV152()">Connect Blogger</button><button class="btn secondary compact" type="button" onclick="disconnectBlogger()">Disconnect Blogger</button></div>
    </div></details>
    <div id="apiMsg"></div>
  </div>`;}

  function buildSettingsLayout(){
    const section=$('#apiSettings');if(!section||section.dataset.ucV152Layout)return;
    const oldCard=section.querySelector(':scope>.card.form');if(!oldCard)return;
    section.dataset.ucV152Layout='1';
    const wrap=document.createElement('div');wrap.innerHTML=settingsMarkup();
    oldCard.replaceWith(wrap.firstElementChild);
    const apiCard=$('#ucV152ApiCore'),blogCard=$('#ucV152Blogger');
    if(typeof window.ucMakeInfoDetails==='function'){
      window.ucMakeInfoDetails(apiCard,apiHelp());
      window.ucMakeInfoDetails(blogCard,bloggerHelp());
    }
    const q=new URLSearchParams(location.search).get('blogger');if(q)blogCard.open=true;
    $('#bloggerBlogId')?.addEventListener('change',()=>say('#apiMsg','Blog Name changed. Click Save Blogger Connection to keep this selection.'));
  }

  window.saveAutomationApiSettings=async function(){
    try{await req('/api/admin/api-settings',{method:'POST',body:JSON.stringify({vendorUserId:$('#vendorUserId')?.value||'dropbeat-dance-studio'})});say('#apiMsg','API settings saved.');await window.load_apiSettings?.();}
    catch(e){say('#apiMsg',e.message||'API settings could not be saved.','error');}
  };
  window.saveBloggerConnectionV152=async function(silent=false){
    const payload={bloggerBlogId:$('#bloggerBlogId')?.value||'',bloggerApiKey:$('#bloggerApiKey')?.value||'',bloggerClientId:$('#bloggerClientId')?.value||'',bloggerClientSecret:$('#bloggerClientSecret')?.value||''};
    try{await req('/api/admin/api-settings',{method:'POST',body:JSON.stringify(payload)});const r=await window.load_apiSettings?.();if(!silent)say('#apiMsg',r?.bloggerBlogId?`Blogger connection saved: ${r.bloggerBlogName||'selected blog'}.`:'Blogger settings saved. Choose a Blog Name before publishing.');return r;}
    catch(e){if(!silent)say('#apiMsg',e.message||'Blogger settings could not be saved.','error');throw e;}
  };
  window.connectBloggerV152=async function(){
    try{await window.saveBloggerConnectionV152(true);const r=await req('/api/admin/blogger-auth');if(!r.authorizationUrl)throw new Error('Google authorization URL was not created.');location.href=r.authorizationUrl;}
    catch(e){say('#apiMsg',e.message||'Could not start Blogger authorization.','error');}
  };
  window.retryBloggerCheckV152=async function(){
    try{say('#apiMsg','Checking the saved Google authorization and Blogger API…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'test'})});await window.load_apiSettings?.();say('#apiMsg',r.message||'Blogger connection check completed.');}
    catch(e){await window.load_apiSettings?.().catch(()=>{});say('#apiMsg',`${e.message}${e.payload?.hint?` ${e.payload.hint}`:''}`,'error');}
  };
  window.connectManualBlogIdV152=async function(){
    const blogId=String($('#bloggerManualBlogId')?.value||'').replace(/\D/g,'');if(!blogId){say('#apiMsg','Enter the numeric Manual Blog ID first.','error');return;}
    try{say('#apiMsg','Verifying and connecting this Blog ID…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'manual_blog',blogId})});await window.load_apiSettings?.();say('#apiMsg',r.message||'Blog ID connected.');}
    catch(e){say('#apiMsg',`${e.message}${e.payload?.hint?` ${e.payload.hint}`:''}`,'error');}
  };

  function patchLoadButton(){
    const panel=$('#blogs');if(!panel)return;
    const topButton=$('.top .btn',panel);if(topButton&&/Load Fitness Tips/i.test(topButton.textContent||''))topButton.setAttribute('onclick','syncAndLoadAuditions()');
    $$('.uc-v151-audition-top-actions button',panel).filter(b=>/Sync Published Posts/i.test(b.textContent||'')).forEach(b=>b.remove());
  }
  function patchAuditionHelp(){
    const old=$('#ucV151AuditionHelp');if(old)old.remove();
    const table=$('#blogTable');if(!table||$('#ucV152AuditionHelp'))return;
    table.insertAdjacentHTML('beforebegin','<div id="ucV152AuditionHelp" class="notice uc-v152-sync-note"><strong>Fitness Tip publishing:</strong> Click <strong>Load Fitness Tip Updates</strong> to synchronize both published posts and drafts from the selected Blog Name. Published posts can appear on <strong>/blog</strong>; Drafts stay hidden from the public website. Use the pencil to edit, the draft icon to move a published post back to Draft, and × to delete.</div>');
  }
  function patchActionIcons(){
    $$('#blogTable button[title="Save as Draft"],#blogTable button[aria-label="Save as Draft"]').forEach(btn=>{btn.innerHTML=draftSvg;btn.title='Move to Draft';btn.setAttribute('aria-label','Move to Draft');});
  }
  const oldLoadBlogs=window.load_blogs;
  if(typeof oldLoadBlogs==='function')window.load_blogs=async function(){const result=await oldLoadBlogs.apply(this,arguments);patchAuditionHelp();patchActionIcons();patchLoadButton();return result;};
  window.syncAndLoadAuditions=async function(){
    patchAuditionHelp();say('#blogMsg','Synchronizing published posts and drafts from the selected blog…');
    try{const r=await req('/api/admin/blogger-sync',{method:'POST',body:'{}'});say('#blogMsg',r.message||'Fitness Tip updates synchronized.');}
    catch(e){say('#blogMsg',e.message||'Blogger synchronization could not be completed. Local audition records will still be loaded.','error');}
    await window.load_blogs?.();
  };
  // Preserve the old name for any existing internal reference, but make it perform the
  // same complete sync so there is only one synchronization behavior.
  window.syncBloggerAuditions=window.syncAndLoadAuditions;

  const oldTab=window.tab;
  if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments);if(id==='apiSettings')setTimeout(async()=>{buildSettingsLayout();await window.load_apiSettings?.().catch(()=>{});},40);if(id==='blogs')setTimeout(()=>{patchLoadButton();patchAuditionHelp();patchActionIcons();},80);return r;};

  function init(){
    buildSettingsLayout();patchLoadButton();patchAuditionHelp();patchActionIcons();
    const q=new URLSearchParams(location.search).get('blogger');if(q){setTimeout(()=>{$('#ucV152Blogger')?.setAttribute('open','');},300);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,380));else setTimeout(init,380);
})();
