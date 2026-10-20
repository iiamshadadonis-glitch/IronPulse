/* V16.73 — SEO connection ownership + OAuth diagnostics + recovery UX.
   Additive only: keeps the existing SEO/Blogger backend, theme, publishing and sync logic. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let moveTimer=0, observer=null, wrappedTab=false, wrappedLoad=false, refreshPromise=null;

  async function request(path,opts={}){
    const res=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data.error||`Request failed (HTTP ${res.status}).`);e.payload=data;e.status=res.status;throw e;}
    return data;
  }
  function seoCard(){return $('#ucV152Blogger');}
  function seoStack(){return $('#socialMediaIntegrations [data-uc49-stack="seo"]');}
  function seoMessageBox(){
    const card=seoCard(),body=card?.querySelector('.collapsed-body');if(!body)return null;
    let box=$('#ucV1673SeoMsg',body);if(!box){box=document.createElement('div');box.id='ucV1673SeoMsg';box.className='uc-v1673-seo-msg';body.appendChild(box);}return box;
  }
  function setMessage(html='',type='notice'){
    const box=seoMessageBox();if(!box)return;
    box.innerHTML=html?`<div class="${type==='error'?'error':'notice'}">${html}</div>`:'';
  }
  function reconnectMessage(detail=''){
    const extra=detail?`<br><small>${H(detail)}</small>`:'';
    return `<strong>Google SEO authorization needs to be reconnected.</strong><br>Your Client ID, Client Secret and selected SEO Name are still saved. Click <strong>Connect SEO</strong> below, sign in with the same Google account and approve access. After Google returns you here, the saved SEO Name will be selected again.${extra}<br><button class="btn secondary compact" type="button" style="margin-top:10px" onclick="connectBloggerV152()">Connect SEO</button>`;
  }
  function normalizeSeoText(root=seoCard()){
    if(!root)return;
    $$('label,.hint,small,p,h3,h4,li',root).forEach(el=>{
      if(el.children.length&&el.tagName!=='LABEL')return;
      const t=el.textContent||'';
      if(/Blogger|Blog Name|Blog ID|API Settings/.test(t)){
        el.textContent=t
          .replace(/Blogger Connection/g,'SEO Connection')
          .replace(/Blogger API Key/g,'SEO API Key')
          .replace(/Blogger Blog ID/g,'SEO ID')
          .replace(/Manual Blog ID/g,'Manual SEO ID')
          .replace(/Blog Name/g,'SEO Name')
          .replace(/Blog ID/g,'SEO ID')
          .replace(/Blogger blog/gi,'SEO source')
          .replace(/Blogger account/gi,'Google SEO account')
          .replace(/Blogger API/gi,'Blogger API')
          .replace(/Connect Blogger/g,'Connect SEO')
          .replace(/Disconnect Blogger/g,'Disconnect SEO')
          .replace(/Retry Blogger Check/g,'Retry SEO Check')
          .replace(/Save Blogger Connection/g,'Save SEO Connection')
          .replace(/Settings\s*→\s*API Settings/g,'Settings → Integrations → SEO');
      }
    });
    $$('button',root).forEach(b=>{
      const t=(b.textContent||'').trim();
      if(/Retry Blogger Check/i.test(t))b.textContent='Retry SEO Check';
      else if(/Connect Blog ID|Use Blog ID/i.test(t))b.textContent='Connect SEO ID';
      else if(/Save Blogger Connection/i.test(t))b.textContent='Save SEO Connection';
      else if(/^Connect Blogger$/i.test(t))b.textContent='Connect SEO';
      else if(/^Disconnect Blogger$/i.test(t))b.textContent='Disconnect SEO';
    });
  }
  function patchHelp(){
    const body=seoCard()?.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');if(!body||body.dataset.ucV1673SeoHelp==='1')return;
    body.dataset.ucV1673SeoHelp='1';
    body.innerHTML=`<h3>SEO Connection — setup and recovery</h3>
      <p>This connection links the website to the Google account that owns the audition publishing source. For this brand, choose the <strong>DropBeat Dance Studio</strong> SEO Name.</p>
      <ol>
        <li>Keep the Google OAuth Client ID and Client Secret saved here.</li>
        <li>Confirm the Authorized Redirect URI exactly matches the URI shown in this card.</li>
        <li>Click <strong>Connect SEO</strong>, authenticate the Google account and approve access.</li>
        <li>Choose the required <strong>SEO Name</strong> and click <strong>Save SEO Connection</strong>.</li>
        <li>Use <strong>Retry SEO Check</strong> only to test an already-authorized connection. <strong>Connect SEO ID</strong> is only the numeric-ID fallback.</li>
      </ol>
      <div class="uc-example"><strong>If the status says the token expired or was revoked:</strong> do not keep pressing Retry SEO Check or Connect SEO ID. Click <strong>Connect SEO</strong> and authenticate again. The saved SEO selection is preserved.</div>
      <div class="uc-warning"><strong>If this repeats roughly every 7 days:</strong> check Google Auth Platform → Audience. OAuth apps left in <strong>Testing</strong> can receive refresh tokens with a limited lifetime. For a live production integration, complete the required Google publishing/verification steps and use the appropriate production publishing status.</div>
      <div class="uc-example"><strong>Website continuity:</strong> V16.73 keeps the last synchronized published audition updates available from the local synchronization cache when Google OAuth is temporarily unavailable, so a short OAuth interruption does not have to blank the public Audition Updates page.</div>`;
  }
  function placeSeoFirst(){
    const card=seoCard(),stack=seoStack();if(!card||!stack)return false;
    card.classList.add('uc-social-card','uc48-seo-social-card');card.dataset.socialCard='seo';
    if(card.parentElement!==stack||stack.firstElementChild!==card)stack.insertBefore(card,stack.firstElementChild||null);
    const title=card.querySelector(':scope > summary .uc50-seo-summary-title')||card.querySelector(':scope > summary .uc48-seo-summary-left span')||card.querySelector(':scope > summary');
    if(title&&title.textContent.trim()!=='SEO Connection')title.textContent='SEO Connection';
    normalizeSeoText(card);patchHelp();seoMessageBox();return true;
  }
  function schedulePlace(){clearTimeout(moveTimer);moveTimer=setTimeout(()=>placeSeoFirst(),35);}

  function setConnectionStatus(a={}){
    const status=$('#bloggerConnectionStatus');if(!status)return;
    const state=String(a.bloggerConnectionState||'');
    const last=String(a.bloggerLastError||'');
    if(state==='reconnect_required'||/expired|revoked|invalid_grant/i.test(last)){
      status.innerHTML='<strong>Google OAuth needs reconnection.</strong> The saved authorization is no longer usable. Click <strong>Connect SEO</strong> and authenticate the Google account again. Your saved SEO Name is preserved.';
      return;
    }
    if(a.bloggerConnected){status.innerHTML=`<strong>Connected${a.bloggerConnectedUser?` as ${H(a.bloggerConnectedUser)}`:''}.</strong> ${a.bloggerBlogId?`Selected SEO: ${H(a.bloggerBlogName||a.bloggerBlogId)}.`:'Choose an SEO Name below and save the SEO connection.'}`;return;}
    if(a.bloggerAuthorized){status.innerHTML=`<strong>Google OAuth is saved but the SEO connection needs attention.</strong> ${last?`${H(last)} `:''}If Retry SEO Check reports an expired or revoked token, use <strong>Connect SEO</strong> rather than Connect SEO ID.`;return;}
    status.innerHTML='<strong>SEO is not connected.</strong> Save the Google OAuth Client ID/Secret and click <strong>Connect SEO</strong> to authenticate the Google account.';
  }
  function syncFields(a={}){
    const select=$('#bloggerBlogId');if(select&&Array.isArray(a.bloggerAvailableBlogs)){
      const value=String(a.bloggerBlogId||'');
      const html=`<option value="">${a.bloggerAuthorized?(a.bloggerAvailableBlogs.length?'Choose the SEO Name':'OAuth saved — Retry SEO Check or reconnect SEO'):'Connect SEO first, then choose an SEO'}</option>${a.bloggerAvailableBlogs.map(x=>`<option value="${H(x.id)}">${H(x.name||x.url||x.id)}${x.url?` — ${H(x.url)}`:''}</option>`).join('')}`;
      if(select.innerHTML!==html)select.innerHTML=html;select.value=value;
    }
    const manual=$('#bloggerManualBlogId');if(manual&&!manual.value&&a.bloggerBlogId)manual.value=String(a.bloggerBlogId);
    if($('#bloggerClientId')&&a.bloggerClientId!==undefined)$('#bloggerClientId').value=a.bloggerClientId||'';
    if($('#bloggerApiKey')&&a.bloggerApiKey!==undefined)$('#bloggerApiKey').value=a.bloggerApiKey||'';
    const secret=$('#bloggerClientSecret');if(secret){secret.value='';secret.placeholder=a.bloggerClientSecretMasked?`Saved: ${a.bloggerClientSecretMasked} — leave blank to keep it`:'Paste the Web application Client Secret';}
    const redirect=$('#bloggerRedirectUri');if(redirect&&a.bloggerRedirectUri)redirect.value=a.bloggerRedirectUri;
    setConnectionStatus(a);placeSeoFirst();
  }
  async function refreshSeo(){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{try{const a=await request('/api/admin/api-settings');window.A=window.A||{};A.api={...(A.api||{}),...a};syncFields(A.api);return A.api;}finally{refreshPromise=null;}})();
    return refreshPromise;
  }
  function diagnostic(e,context='SEO request'){
    const p=e?.payload||{},isReconnect=p.code==='SEO_RECONNECT_REQUIRED'||p.action==='reconnect_seo'||/expired|revoked|invalid_grant/i.test(`${e?.message||''} ${p.hint||''}`);
    if(isReconnect){setMessage(reconnectMessage(p.hint||e.message),'error');setConnectionStatus({...window.A?.api,bloggerConnectionState:'reconnect_required',bloggerLastError:e.message});return;}
    const hint=p.hint?`<br><strong>Next step:</strong> ${H(p.hint)}`:'';
    setMessage(`<strong>${H(context)} could not be completed.</strong><br>${H(e?.message||'Unknown SEO error.')}${hint}`,'error');
  }
  function payloadFromForm(){return {bloggerBlogId:$('#bloggerBlogId')?.value||'',bloggerApiKey:$('#bloggerApiKey')?.value||'',bloggerClientId:$('#bloggerClientId')?.value||'',bloggerClientSecret:$('#bloggerClientSecret')?.value||''};}

  window.saveBloggerConnectionV152=async function(silent=false){
    try{
      await request('/api/admin/api-settings',{method:'POST',body:JSON.stringify(payloadFromForm())});
      const a=await refreshSeo();
      if(!silent){
        if(String(a?.bloggerConnectionState||'')==='reconnect_required')setMessage(`SEO settings were saved, but Google authorization needs reconnection.<br>${reconnectMessage(a.bloggerLastError||'')}`,'error');
        else setMessage(a?.bloggerBlogId?`<strong>SEO connection saved:</strong> ${H(a.bloggerBlogName||'selected SEO')}.`:'SEO settings saved. Choose an SEO Name before publishing.');
      }
      return a;
    }catch(e){if(!silent)diagnostic(e,'Save SEO Connection');throw e;}
  };
  window.connectBloggerV152=async function(){
    try{
      setMessage('<strong>Preparing Google authentication…</strong> Your existing SEO selection will be preserved.');
      await request('/api/admin/api-settings',{method:'POST',body:JSON.stringify(payloadFromForm())});
      const r=await request('/api/admin/blogger-auth');if(!r.authorizationUrl)throw new Error('Google authorization URL was not created.');
      location.href=r.authorizationUrl;
    }catch(e){diagnostic(e,'Connect SEO');}
  };
  window.retryBloggerCheckV152=async function(){
    try{
      setMessage('<strong>Checking the saved Google authorization and SEO publishing API…</strong>');
      const r=await request('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      await refreshSeo();setMessage(`<strong>${H(r.message||'SEO connection check completed.')}</strong>`);
    }catch(e){await refreshSeo().catch(()=>{});diagnostic(e,'Retry SEO Check');}
  };
  window.connectManualBlogIdV152=async function(){
    const blogId=String($('#bloggerManualBlogId')?.value||'').replace(/\D/g,'');if(!blogId){setMessage('Enter the numeric Manual SEO ID first.','error');return;}
    try{
      setMessage('<strong>Verifying this SEO ID…</strong>');
      const r=await request('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'manual_blog',blogId})});
      await refreshSeo();setMessage(`<strong>${H(r.message||'SEO ID connected.')}</strong>`);
    }catch(e){diagnostic(e,'Connect SEO ID');}
  };
  // Keep old compatibility names pointing to the final recovery-aware handlers.
  window.connectBlogger=window.connectBloggerV152;
  window.retryBloggerCheck=window.retryBloggerCheckV152;
  window.useManualBloggerBlogId=window.connectManualBlogIdV152;

  function wrapTabs(){
    if(wrappedTab)return;wrappedTab=true;
    const old=window.ucV1649IntegrationTab;if(typeof old==='function'&&!old.__uc73){
      const fn=function(cat,btn){const r=old.apply(this,arguments);if(cat==='seo')setTimeout(()=>{placeSeoFirst();refreshSeo().catch(()=>{});},30);else setTimeout(placeSeoFirst,30);return r;};fn.__uc73=true;window.ucV1649IntegrationTab=fn;
    }
  }
  function wrapLoader(){
    if(wrappedLoad)return;wrappedLoad=true;
    const oldSocial=window.load_socialMediaIntegrations;if(typeof oldSocial==='function'&&!oldSocial.__uc73){
      const fn=async function(){const r=await oldSocial.apply(this,arguments);setTimeout(placeSeoFirst,0);setTimeout(placeSeoFirst,120);return r;};fn.__uc73=true;window.load_socialMediaIntegrations=fn;
    }
    const oldApi=window.load_apiSettings;if(typeof oldApi==='function'&&!oldApi.__uc73){
      const fn=async function(){const r=await oldApi.apply(this,arguments);if(r&&typeof r==='object'){window.A=window.A||{};A.api={...(A.api||{}),...r};syncFields(A.api);}setTimeout(placeSeoFirst,0);return r;};fn.__uc73=true;window.load_apiSettings=fn;
    }
  }
  function observe(){
    if(observer)return;const root=$('#socialMediaIntegrations');if(!root)return;
    observer=new MutationObserver(m=>{if(!m.some(x=>x.type==='childList'))return;schedulePlace();});
    observer.observe(root,{childList:true,subtree:true});
  }
  function openSeoAfterOauth(){
    const q=new URLSearchParams(location.search).get('blogger');if(!q)return;
    setTimeout(()=>{try{window.tab?.('socialMediaIntegrations');setTimeout(()=>{window.ucV1649IntegrationTab?.('seo');placeSeoFirst();refreshSeo().then(a=>{
      if(q==='connected')setMessage(`<strong>Google SEO authentication completed.</strong> ${a?.bloggerBlogId?`Selected SEO: ${H(a.bloggerBlogName||a.bloggerBlogId)}.`:'Choose the SEO Name and click Save SEO Connection.'}`);
      else if(q==='api_error')setMessage('<strong>Google authentication completed, but the SEO publishing API still needs attention.</strong> Run Retry SEO Check for the exact diagnostic.','error');
    }).catch(()=>{});},80);}catch(_){ }},250);
  }
  function init(){
    wrapTabs();wrapLoader();placeSeoFirst();observe();refreshSeo().catch(()=>{});openSeoAfterOauth();
    setTimeout(placeSeoFirst,300);setTimeout(placeSeoFirst,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2550),{once:true});else setTimeout(init,2550);
})();
