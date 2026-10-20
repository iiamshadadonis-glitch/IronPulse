/* V16.50 — solution-based Meta help, SEO card state/layout recovery, and Snapchat allowlist guidance.
   Additive only: existing integration credentials, connection records, publishing logic and theme are preserved. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let seoLoading=null, patchedLoad=false, patchedTab=false, observer=null, timer=0;

  const FACEBOOK_HELP=`<div class="uc51-meta-help"><h3>Facebook — Complete Meta App, Page Token &amp; Permission Setup</h3><p class="uc-help-lead">Follow this from top to bottom if the admin has never created a Meta API connection before. Facebook does not give one permanent “API key”. This integration uses a <strong>Meta App ID + App Secret</strong>, OAuth permissions, a <strong>Facebook Page ID</strong> and a valid <strong>Page Access Token</strong>.</p><div class="uc-warning"><strong>Before you start:</strong> sign in with a Facebook account that has full/control or the required Page task for the Facebook Page. Never enter the Facebook password in this admin panel.</div><h4>1. Create the Meta app</h4><ol><li>Open <a class="uc-help-link" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">Meta for Developers → My Apps</a> and click <strong>Create App</strong>.</li><li>Choose a Business-capable use case/app type that can request Facebook Page permissions. Use the same app for Facebook and Instagram when both belong to the same business.</li><li>Open the app dashboard and copy the <strong>App ID</strong>. Open <strong>App settings → Basic</strong> to view/copy the <strong>App Secret</strong>. Keep the secret private.</li><li>Add/configure <strong>Facebook Login for Business</strong>. Official reference: <a class="uc-help-link" href="https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/" target="_blank" rel="noopener">Facebook Login for Business</a>.</li></ol><h4>2. Add the exact callback URL</h4><ol><li>Return to the Facebook form in IronPulse Gym and copy <strong>Facebook OAuth Redirect URL</strong>.</li><li>Paste that exact HTTPS URL into the Meta Login/Business Login valid OAuth redirect configuration. Do not change http/https, hostname, path or trailing characters.</li><li>Save the Meta app configuration before continuing.</li></ol><h4>3. Request the permissions IronPulse Gym actually uses</h4><p>Request only the features you intend to use. Typical capabilities in this build use the permissions below, subject to Meta App Review/Advanced Access and the Page tasks granted to the connected person:</p><ul><li><strong>Page discovery/read:</strong> pages_show_list, pages_read_engagement.</li><li><strong>Publishing:</strong> pages_manage_posts.</li><li><strong>Webhooks:</strong> pages_manage_metadata.</li><li><strong>Comment moderation/replies:</strong> pages_manage_engagement and pages_read_user_content.</li><li><strong>Messenger:</strong> pages_messaging, only when Messenger features are required.</li><li><strong>Lead Ads:</strong> leads_retrieval, only when Lead Forms should enter the CRM.</li></ul><p>Official references: <a class="uc-help-link" href="https://developers.facebook.com/docs/pages-api/" target="_blank" rel="noopener">Pages API</a> and <a class="uc-help-link" href="https://developers.facebook.com/docs/app-review/" target="_blank" rel="noopener">App Review</a>.</p><h4>4. Generate/understand the Page Access Token</h4><ol><li><strong>Recommended:</strong> save App ID, App Secret and Facebook Login for Business Configuration ID here, then click <strong>Connect Facebook</strong>. IronPulse Gym will run OAuth and save the token for the exact Page selected/managed by the connected user.</li><li><strong>Manual diagnostic option:</strong> open <a class="uc-help-link" href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener">Graph API Explorer</a>, generate a User Access Token with the required approved permissions, then request <code>/me/accounts?fields=id,name,access_token</code>. Use the <strong>Page access_token</strong> belonging to the Page ID you are connecting — not an arbitrary User token.</li><li>Use <a class="uc-help-link" href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener">Access Token Debugger</a> to confirm token type, app, permissions and expiry before pasting a manual token.</li></ol><h4>5. Token expiry — do not depend on a 1-hour token</h4><ol><li>Short-lived User Access Tokens can expire quickly. Do not build automation around a temporary Graph API Explorer token.</li><li>For production, prefer this card's OAuth/Business Login flow. When Meta returns a renewable/longer-lived authorization, keep the App Secret server-side and reconnect/refresh through OAuth when the token approaches expiry.</li><li>If you deliberately use Meta's long-lived User Access Token exchange, perform the exchange server-side with the App ID/App Secret, then obtain the Page token from that authorized user. The exact lifetime Meta grants can vary by token type/app configuration, so verify it in Access Token Debugger rather than assuming “never expires”.</li><li>If Test Connection later reports an expired/revoked token, click <strong>Connect Facebook</strong> again instead of changing unrelated website settings.</li></ol><h4>6. Fill the IronPulse Gym Facebook form</h4><ol><li><strong>Meta App ID:</strong> paste the App ID.</li><li><strong>Facebook Login for Business Configuration ID:</strong> paste the Configuration ID from the Meta app.</li><li><strong>Meta App Secret:</strong> paste once; after it is saved, leave the field blank to keep the saved secret.</li><li><strong>Meta Page ID:</strong> paste the numeric Facebook Page ID.</li><li><strong>Page Access Token:</strong> normally let Connect Facebook save it. Paste one manually only if you intentionally use manual Page-token mode.</li><li><strong>Webhook Verify Token:</strong> create your own long random private text and save the exact same value here and in Meta Webhooks. Meta does not issue this value for you.</li><li><strong>Lead Form IDs:</strong> optional comma-separated form IDs if only selected lead forms should be accepted.</li></ol><h4>7. Finish and verify</h4><ol><li>Click <strong>Save Settings</strong> → <strong>Connect Facebook</strong> → approve the requested access.</li><li>Click <strong>Test Connection</strong>. The capability panel separately checks Page identity, publishing, comments, webhooks, Messenger and Lead Ads.</li><li>Click <strong>Configure Webhook Events</strong> only when inbound comments/leads are required.</li><li>Enable <strong>Automatically publish new Fitness Tips</strong> only after Automatic Page publishing says Ready.</li></ol><div class="uc-example"><strong>Example:</strong> if Page ID <em>123456789</em> is connected and Test Connection confirms <strong>pages_manage_posts</strong>, a new Fitness Tip can be published to that Page without altering the website fitness tip.</div><div class="uc-warning"><strong>Connected but a capability says Needs attention?</strong> Read the exact missing permission/task shown in the capability check. The most common causes are the wrong token type, a token issued for another app/Page, missing App Review/Advanced Access, or insufficient Page task/control.</div></div>`;

  const INSTAGRAM_HELP=`<div class="uc51-meta-help"><h3>Instagram — Complete Professional Account + Meta API Setup</h3><p class="uc-help-lead">Instagram publishing/comments in this build use a Meta app and an <strong>Instagram Professional account</strong> linked to a Facebook Page. A personal Instagram account cannot use this workflow.</p><div class="uc-warning"><strong>Required:</strong> convert the Instagram profile to Professional (Business/Creator where supported), link it to the correct Facebook Page, and connect with a Facebook/Meta user who has the required Page access.</div><h4>1. Prepare the Meta app</h4><ol><li>Open <a class="uc-help-link" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">Meta for Developers → My Apps</a>.</li><li>Open the same Meta app used for Facebook, or create a Business-capable app if you do not have one.</li><li>Copy the <strong>Meta App ID</strong> and keep the <strong>App Secret</strong> private. In this admin panel the Instagram App fields are optional when the same values are already saved under Facebook.</li><li>Read <a class="uc-help-link" href="https://developers.facebook.com/docs/instagram-platform/" target="_blank" rel="noopener">Instagram Platform</a> and <a class="uc-help-link" href="https://developers.facebook.com/docs/instagram-platform/content-publishing/" target="_blank" rel="noopener">Content Publishing</a>.</li></ol><h4>2. Link Instagram to the Facebook Page</h4><ol><li>In Meta Business/Page settings, confirm the Instagram Professional account is linked to the same Facebook Page you will enter in this form.</li><li>Use the numeric <strong>Page ID</strong>, not the Page username.</li><li>To verify the link in Graph API Explorer, query <code>/{PAGE_ID}?fields=instagram_business_account</code>. The returned <strong>instagram_business_account.id</strong> is the numeric Instagram Business Account ID used by this form.</li><li>You can verify the profile with <code>/{IG_USER_ID}?fields=id,username</code>.</li></ol><h4>3. Request the Instagram/Page permissions</h4><ul><li><strong>Profile/basic access:</strong> instagram_basic.</li><li><strong>Publishing:</strong> instagram_content_publish.</li><li><strong>Comments/private replies:</strong> instagram_manage_comments plus the Page permissions required by the Facebook Login route.</li><li><strong>Normal Instagram messaging:</strong> instagram_manage_messages when that workflow is enabled.</li><li><strong>Page read dependency:</strong> pages_read_engagement.</li><li><strong>Lead Ads:</strong> leads_retrieval only when Instagram/Meta Lead Ads should enter the CRM.</li></ul><p>Some permissions require Meta App Review/Advanced Access. A green profile identity check does not automatically mean every publishing/comment/messaging permission was approved.</p><h4>4. Token and expiry guidance</h4><ol><li>This Instagram-with-Facebook-Login workflow uses the valid Page/Meta authorization linked to the professional Instagram account. Do not paste an unrelated short-lived User token simply because it can read a profile.</li><li>Use <a class="uc-help-link" href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener">Access Token Debugger</a> to inspect app, scopes and expiry.</li><li>If you manually generate a temporary token in Graph API Explorer, treat it as a diagnostic token. For production, use the saved OAuth/Meta app connection and reconnect through Meta when authorization expires/revokes.</li><li>The exact expiry depends on the token type and Meta's current rules; verify the token instead of assuming a permanent lifetime.</li></ol><h4>5. Fill the IronPulse Gym Instagram form</h4><ol><li><strong>Instagram Business Account ID:</strong> paste the numeric ID returned for the linked Professional account — not @username.</li><li><strong>Linked Meta Page ID:</strong> paste the numeric Facebook Page ID linked to that Instagram account.</li><li><strong>Meta App ID/App Secret Optional:</strong> leave blank when you intentionally reuse the already-saved Facebook Meta app; otherwise paste the matching app values.</li><li><strong>Page Access Token:</strong> use the Page token for that linked Meta Page. It is inspected for publishing/comments capability.</li><li><strong>Webhook Verify Token:</strong> create your own random private verification text and use the same value in Meta Webhooks.</li></ol><h4>6. Save, connect and test</h4><ol><li>Click <strong>Save Settings</strong>, then <strong>Connect Instagram</strong>.</li><li>Run <strong>Test Connection</strong>. It checks Professional profile identity, linked Page, publishing, comment reads, private replies/DM support, webhook delivery and Lead Ads independently.</li><li>Click <strong>Configure Webhook Events</strong> when incoming comments/leads should arrive automatically.</li><li>Enable <strong>Automatically publish new Fitness Tips</strong> only after Automatic image publishing reports Ready.</li></ol><div class="uc-example"><strong>Example:</strong> if Page <em>987654321</em> returns Instagram Business Account ID <em>1784…</em>, enter those two numeric IDs. A published Fitness Tip with a public cover image can then be converted to the supported Instagram image and published with the title/summary/article URL in the caption.</div><div class="uc-warning"><strong>Profile connected but publishing/comments fail?</strong> Do not recreate the Client ID first. Check the exact scope shown by Test Connection, confirm the Instagram account is Professional and linked to the configured Page, and confirm the token belongs to the same Meta app/Page.</div></div>`;

  function patchHelp(key,html){
    const card=$(`#socialMediaIntegrations [data-social-card="${key}"]`);if(!card)return;
    const body=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');
    if(body){if(body.dataset.ucV1650Help!==key){body.innerHTML=html;body.dataset.ucV1650Help=key;}}
    else if(window.ucMakeInfoDetails){window.ucMakeInfoDetails(card,html);const b=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');if(b)b.dataset.ucV1650Help=key;}
  }
  function patchMetaHelp(){patchHelp('facebook',FACEBOOK_HELP);patchHelp('instagram',INSTAGRAM_HELP);}

  const fallbackRedirect=()=>`${location.origin}/api/admin/blogger-oauth/callback`;
  function seoStatus(a={}){
    if(!a||!Object.keys(a).length)return ['Checking…','limited'];
    if(a.bloggerConnected)return ['Connected','connected'];
    if(a.bloggerAuthorized)return ['OAuth connected','oauth'];
    if(a.bloggerDeletedAt)return ['Deleted','deleted'];
    return ['Disconnected','disconnected'];
  }
  function seoStatusClass(c){return ['connected','oauth','deleted','disconnected','limited'].includes(c)?c:'disconnected';}
  function syncSeoGridStatus(a={}){
    const grid=$('[data-uc49-grid-mount="seo"] .uc49-grid');if(!grid)return;
    const cells=[...grid.querySelectorAll(':scope > .uc49-grid-cell')];if(cells.length<4)return;
    const [label,cls]=seoStatus(a),statusCell=cells[2];let badge=statusCell.querySelector('.uc49-status');
    if(!badge){badge=document.createElement('span');statusCell.replaceChildren(badge);}
    const nextClass=`uc49-status ${seoStatusClass(cls)}`;if(badge.className!==nextClass)badge.className=nextClass;if(badge.textContent!==label)badge.textContent=label;
  }
  function cleanSeoSummary(a=window.A?.api||{}){
    const card=$('#ucV152Blogger');const summary=card?.querySelector(':scope > summary');if(!summary)return;
    const [label,cls]=seoStatus(a);
    let title=summary.querySelector('.uc50-seo-summary-title'),badge=summary.querySelector('#uc50SeoSummaryBadge');
    /* V16.48 still probes #uc48SeoBadge. Keep one hidden sentinel instead of deleting it;
       deleting it made the older compatibility layer rebuild the summary repeatedly, which
       looked like the SEO card was blinking. */
    let legacy=summary.querySelector('#uc48SeoBadge');
    if(!legacy){legacy=document.createElement('span');legacy.id='uc48SeoBadge';legacy.setAttribute('aria-hidden','true');legacy.hidden=true;summary.appendChild(legacy);}
    legacy.hidden=true;legacy.style.display='none';
    summary.querySelectorAll('.uc-v168-status-badge').forEach(x=>x.remove());
    summary.querySelectorAll('.uc49-summary-status').forEach(x=>{if(x.id!=='uc50SeoSummaryBadge')x.remove();});
    summary.querySelectorAll('.uc48-seo-summary-left').forEach(x=>x.remove());
    if(!title){summary.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim())n.remove();});title=document.createElement('span');title.className='uc50-seo-summary-title';title.textContent='SEO Connection';summary.prepend(title);}else if(title.textContent!=='SEO Connection')title.textContent='SEO Connection';
    if(!badge){badge=document.createElement('span');badge.id='uc50SeoSummaryBadge';summary.appendChild(badge);}
    const badgeClass=`uc49-summary-status uc49-status ${seoStatusClass(cls)}`;if(badge.className!==badgeClass)badge.className=badgeClass;if(badge.textContent!==label)badge.textContent=label;
  }
  function setField(id,value){const el=$('#'+id);if(el&&value!==undefined&&value!==null)el.value=String(value);}
  function syncSeoCard(a=window.A?.api||{}){
    const card=$('#ucV152Blogger');if(!card)return;
    cleanSeoSummary(a);syncSeoGridStatus(a);
    const redirect=$('#bloggerRedirectUri');if(redirect&&!redirect.value)redirect.value=a.bloggerRedirectUri||fallbackRedirect();
    else if(redirect&&a.bloggerRedirectUri)redirect.value=a.bloggerRedirectUri;
    if(a.bloggerClientId!==undefined)setField('bloggerClientId',a.bloggerClientId||'');
    if(a.bloggerApiKey!==undefined)setField('bloggerApiKey',a.bloggerApiKey||'');
    const secret=$('#bloggerClientSecret');if(secret){secret.value='';secret.placeholder=a.bloggerClientSecretMasked?`Saved: ${a.bloggerClientSecretMasked} — leave blank to keep it`:'Paste the Web application Client Secret';}
    const select=$('#bloggerBlogId');if(select&&Array.isArray(a.bloggerAvailableBlogs)){
      const existing=String(a.bloggerBlogId||'');
      const optionsHtml=`<option value="">${a.bloggerAuthorized?(a.bloggerAvailableBlogs.length?'Choose the SEO Name':'OAuth connected — Retry SEO Check to load SEO Name'):'Connect SEO first, then choose an SEO'}</option>${a.bloggerAvailableBlogs.map(x=>`<option value="${H(x.id)}">${H(x.name||x.url||x.id)}${x.url?` — ${H(x.url)}`:''}</option>`).join('')}`;
      if(select.innerHTML!==optionsHtml)select.innerHTML=optionsHtml;
      if(select.value!==existing)select.value=existing;
    }
    const manual=$('#bloggerManualBlogId');if(manual&&!manual.value&&a.bloggerBlogId)manual.value=String(a.bloggerBlogId);
    const status=$('#bloggerConnectionStatus');if(status){
      let statusHtml='';
      if(!a||!Object.keys(a).length)statusHtml='<strong>Checking saved SEO connection…</strong> The Authorized Redirect URI is shown below while the current saved OAuth status loads.';
      else if(a.bloggerConnected)statusHtml=`<strong>Connected${a.bloggerConnectedUser?` as ${H(a.bloggerConnectedUser)}`:''}.</strong> ${a.bloggerBlogId?`Selected SEO: ${H(a.bloggerBlogName||a.bloggerBlogId)}.`:'Choose an SEO Name below and save the SEO connection.'}`;
      else if(a.bloggerAuthorized)statusHtml=`<strong>Google OAuth is connected.</strong> ${a.bloggerLastError?`${H(a.bloggerLastError)} `:''}Run <strong>Retry SEO Check</strong>, choose the SEO Name, then Save SEO Connection.`;
      else statusHtml='<strong>SEO is not connected.</strong> The saved form is not disconnected by opening Integrations. If OAuth really needs reconnecting, confirm the Client ID/Secret and use the Authorized Redirect URI shown below, then click Connect SEO.';
      if(status.innerHTML!==statusHtml)status.innerHTML=statusHtml;
    }
    const redirectHint=redirect?.closest('.field')?.querySelector('.hint');if(redirectHint){const hintHtml='Add this exact URI to <strong>Google Auth Platform → Clients → Authorized redirect URIs</strong>. For IronPulse Gym it should use your public website hostname followed by <strong>/api/admin/blogger-oauth/callback</strong>.';if(redirectHint.innerHTML!==hintHtml)redirectHint.innerHTML=hintHtml;}
    card.dataset.ucV1650Seo='1';
  }
  async function directApiSettings(){
    const res=await fetch('/api/admin/api-settings',{credentials:'same-origin'});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`SEO status request failed (HTTP ${res.status}).`);return data;
  }
  async function refreshSeo(force=false){
    syncSeoCard(window.A?.api||{});
    if(seoLoading&&!force)return seoLoading;
    seoLoading=(async()=>{
      let data=null;
      try{
        if(typeof window.load_apiSettings==='function')data=await window.load_apiSettings();
        if(!data||typeof data!=='object'||data.bloggerRedirectUri===undefined)data=await directApiSettings();
        window.A=window.A||{};A.api={...(A.api||{}),...data};
        syncSeoCard(A.api);setTimeout(()=>syncSeoCard(A.api),90);return A.api;
      }catch(e){
        try{data=await directApiSettings();window.A=window.A||{};A.api={...(A.api||{}),...data};syncSeoCard(A.api);return A.api;}catch(_){syncSeoCard(window.A?.api||{});return window.A?.api||{};}
      }finally{seoLoading=null;}
    })();
    return seoLoading;
  }
  window.ucV1650RefreshSeoState=()=>refreshSeo(true);

  function patchSnapchat(){
    const card=$('#socialMediaIntegrations [data-social-card="snapchat"]');if(!card)return;
    const c=window.UCSocialIntegrations?.settings?.snapchat||{};
    let box=card.querySelector('[data-uc50-snap-access]');
    if(!box){box=document.createElement('div');box.dataset.uc50SnapAccess='1';box.className='uc50-snap-access';const form=card.querySelector('form'),use=form?.querySelector('.uc-social-info');if(use)use.insertAdjacentElement('afterend',box);else form?.prepend(box);}
    const client=H(c.oauthClientId||card.querySelector('[name="oauthClientId"]')?.value||'your Business OAuth Client ID');
    let cls='uc50-snap-access',html='';
    if(c.connected&&c.publishingReady){cls+=' is-ready';html='<strong>Snapchat Public Profile API ready.</strong> Business OAuth and the Public Profile capability check have both passed. Story publishing may now be enabled.';}
    else if(c.connected){cls+=' needs-approval';html=`<strong>Business OAuth is connected — Public Profile API approval is still required.</strong><span>The HTTP 403 shown by Test Connection means Snap has not allowlisted this Business OAuth Client ID for the Public Profile API. This is <strong>not</strong> fixed by creating a Snap Kit Client ID.</span><span><strong>Client ID to submit to Snap:</strong> ${client}</span><ol><li>Open the official <a href="https://developers.snap.com/marketing-api/Public-Profile-API/GetStarted" target="_blank" rel="noopener">Snap Public Profile API — Get Started</a> page.</li><li>Send <strong>only this Business OAuth Client ID</strong> and your use case (server-side publishing of organic Stories for the IronPulse Gym Public Profile) to your Snap point of contact. <strong>Do not send the Client Secret.</strong></li><li>If you do not have a Snap point of contact, sign in to Ads Manager and use the <strong>?</strong> help/support option to request Public Profile API allowlisting for this OAuth Client ID.</li><li>After Snap confirms approval, return here and click <strong>Test Connection</strong>. When Story read/publishing changes to Ready, enable automatic Fitness Tip Stories.</li></ol>`;}
    else{html='<strong>Snapchat setup status:</strong> save the Business OAuth Client ID/Secret, connect OAuth, then run Test Connection. Snap Kit remains optional and does not replace Public Profile API approval.';}
    if(box.className!==cls)box.className=cls;if(box.innerHTML!==html)box.innerHTML=html;
    const snapHelp=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');
    if(snapHelp&&!snapHelp.querySelector('[data-uc50-snap-official]')){
      const n=document.createElement('div');n.dataset.uc50SnapOfficial='1';n.className='uc-example';n.innerHTML='<strong>Official approval reference:</strong> <a href="https://developers.snap.com/marketing-api/Public-Profile-API/GetStarted" target="_blank" rel="noopener">Snap Public Profile API Get Started</a> states that the API is allowlist-only and the Business OAuth Client ID must be sent to a Snap contact for allowlisting. A Snap Kit app is a separate product.';snapHelp.appendChild(n);
    }
  }

  function patchAll(){patchMetaHelp();syncSeoCard(window.A?.api||{});patchSnapchat();}
  function wrapLoad(){
    if(patchedLoad)return;patchedLoad=true;
    const oldSocial=window.load_socialMediaIntegrations;if(typeof oldSocial==='function'&&!oldSocial.__uc50){const fn=async function(){const r=await oldSocial.apply(this,arguments);setTimeout(patchAll,80);setTimeout(patchAll,360);return r;};fn.__uc50=true;window.load_socialMediaIntegrations=fn;}
    const oldApi=window.load_apiSettings;if(typeof oldApi==='function'&&!oldApi.__uc50){const fn=async function(){const r=await oldApi.apply(this,arguments);if(r&&typeof r==='object'){window.A=window.A||{};A.api={...(A.api||{}),...r};}setTimeout(()=>syncSeoCard(window.A?.api||r||{}),0);setTimeout(()=>syncSeoCard(window.A?.api||r||{}),100);return r;};fn.__uc50=true;window.load_apiSettings=fn;}
  }
  function wrapIntegrationTab(){
    if(patchedTab)return;patchedTab=true;const old=window.ucV1649IntegrationTab;if(typeof old!=='function')return;
    window.ucV1649IntegrationTab=function(cat,btn){const r=old.apply(this,arguments);if(cat==='seo')setTimeout(()=>refreshSeo(false),30);else setTimeout(patchMetaHelp,60);setTimeout(patchSnapchat,100);return r;};
  }
  function bindSeoCard(){const card=$('#ucV152Blogger');if(!card||card.dataset.ucV1650Bound)return;card.dataset.ucV1650Bound='1';card.addEventListener('toggle',()=>{if(card.open)refreshSeo(false);else cleanSeoSummary(window.A?.api||{});});}
  function observe(){
    if(window.__ucV1654StableIntegrations)return;
    if(observer)return;const root=$('#socialMediaIntegrations');if(!root)return;
    observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{patchAll();bindSeoCard();},70);});observer.observe(root,{childList:true,subtree:true});
  }
  function init(){
    wrapLoad();wrapIntegrationTab();patchAll();bindSeoCard();observe();
    setTimeout(patchAll,450);setTimeout(()=>refreshSeo(false),900);setTimeout(patchAll,1800);
    /* Older OAuth callback handlers still understand ?blogger=. Make the final destination the new Integrations → SEO tab. */
    if(new URLSearchParams(location.search).has('blogger'))setTimeout(()=>{try{window.tab?.('socialMediaIntegrations');window.ucV1649IntegrationTab?.('seo');refreshSeo(true);}catch(_){ }},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2600));else setTimeout(init,2600);
})();
