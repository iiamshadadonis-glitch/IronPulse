/* V16.49 — unified Integrations hub + Brand Settings marquee switch.
   This file intentionally reuses and relocates the existing forms. It never
   recreates credentials, changes the theme, or disconnects an integration
   unless the admin explicitly presses Delete and confirms it. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
  const H=v=>(typeof window.H==='function'?window.H(v):typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const panel=()=>$('#socialMediaIntegrations');
  let activeCategory='social', refreshTimer=0, rehomeTimer=0, observer=null, wrappersInstalled=false;
  const deleted=new Set();
  try{JSON.parse(sessionStorage.getItem('uc49DeletedIntegrations')||'[]').forEach(x=>deleted.add(x));}catch(_){ }
  const saveDeleted=()=>{try{sessionStorage.setItem('uc49DeletedIntegrations',JSON.stringify([...deleted]));}catch(_){ }};

  const CATEGORIES={
    social:{label:'Social Media',title:'Social Media',description:'Connect and manage social publishing, comments, lead sources and supported messaging capabilities.',grid:'Connected Social Media'},
    seo:{label:'SEO',title:'SEO',description:'Manage search visibility, publishing sync and supported search-engine URL submission connections.',grid:'Connected SEO'},
    storage:{label:'Storage',title:'Storage',description:'Manage external storage used by publishing and media workflows.',grid:'Connected Storage'},
    email:{label:'Email & OTP',title:'Email & OTP',description:'Manage outbound email, webhook messaging and customer order OTP providers.',grid:'Connected Email & OTP'},
    payments:{label:'Payments',title:'Payments',description:'Manage checkout and subscription payment gateways without changing the existing payment logic.',grid:'Connected Payments'},
    ads:{label:'Ad Networks',title:'Ad Networks',description:'Manage website ad-network code and activation from one place.',grid:'Connected Ad Networks'},
    ai:{label:'AI Integrations',title:'AI Integrations',description:'Connect AI providers for DM automation responses. API keys stay server-side and only enabled providers appear in Flow Builder.',grid:'Connected AI'},
    api:{label:'API Settings',title:'API Settings',description:'Connect external automation software such as n8n and use the existing API, automation and webhook endpoints.',grid:'Connected API Access'}
  };
  const SOCIAL_ORDER=['facebook','instagram','threads','pinterest','youtube','x','snapchat','linkedin','telegram'];
  const SEO_ORDER=['seo','indexNow','googleIndexing','searchConsole','googleBusiness'];
  const STORAGE_ORDER=['googleDrive'];
  const EMAIL_ORDER=['gmail','whatsapp'];
  const EMAIL_PROVIDER_ORDER=['ses','lambda','mailchimp','mailersend','company','s3'];
  const LABELS={facebook:'Facebook',instagram:'Instagram',threads:'Threads',pinterest:'Pinterest',youtube:'YouTube',x:'X / Twitter',snapchat:'Snapchat',linkedin:'LinkedIn',telegram:'Telegram',seo:'SEO Connection',searchConsole:'Google Search Console',googleIndexing:'Google Indexing API',googleBusiness:'Google Business Profile',indexNow:'Bing / IndexNow',googleDrive:'Google Drive API',gmail:'Gmail / Email',whatsapp:'WhatsApp Webhook & Order OTP',ses:'Amazon SES',lambda:'AWS Lambda Email Relay',mailchimp:'Mailchimp Transactional',mailersend:'MailerSend / MailerLite',company:'Company Email / GoDaddy',s3:'Amazon S3 Email Assets',razorpay:'Razorpay',phonepe:'PhonePe',stripe:'Stripe',googleAdsense:'Google AdSense',adsterra:'Adsterra',mediaNet:'Media.net / Similar Network',custom:'Custom Ad Network',apiAccess:'External API & Automation'};
  const CAPS={
    facebook:['Text / media publishing','Reels','Comments','Lead webhooks'],instagram:['Image / Reel publishing','Comments','Private replies','Lead webhooks'],threads:['Text / image / video posts','Replies'],pinterest:['Image Pins','Boards'],youtube:['Video uploads','Shorts-compatible uploads','Comments'],x:['Text / media posts','Activity'],snapchat:['Public Profile Stories','OAuth','Allowlist dependent'],linkedin:['Text / image / video posts','Comments','Lead Gen'],telegram:['Bot inbox','Images / documents','Inline buttons','Channel publishing'],
    seo:['Blogger publishing','Audition synchronization'],searchConsole:['Search Console property','Sitemap submission'],googleIndexing:['Eligible URL notifications','JobPosting / BroadcastEvent'],googleBusiness:['Business Profile OAuth','Posts / reviews when API-ready'],indexNow:['IndexNow URL notifications','Bing discovery'],
    googleDrive:['Post media uploads','Plan / Story folders','Drive file links'],gmail:['Invoices / statements','Email OTP'],whatsapp:['Webhook messaging','Order OTP'],ses:['Transactional email','Automation','Email OTP'],lambda:['HTTPS email relay','Automation','Email OTP'],mailchimp:['Transactional email','Automation','Email OTP'],mailersend:['Transactional email','Automation','Email OTP'],company:['Company mailbox relay','Automation','Email OTP'],s3:['Email assets','Template archive'],
    razorpay:['Checkout','Subscriptions','Webhooks','Refunds'],phonepe:['Checkout','AutoPay','Webhooks'],stripe:['Checkout','Subscriptions','Webhooks'],
    googleAdsense:['AdSense verification','Auto Ads / site code'],adsterra:['Header / body ad code'],mediaNet:['Header / body ad code'],custom:['Custom network code'],
    apiAccess:['Bearer API token','Automation endpoints']
  };
  const SOCIAL_API_KEYS={facebook:'facebook',instagram:'instagram',threads:'threads',pinterest:'pinterest',youtube:'youtube',x:'x',snapchat:'snapchat',linkedin:'linkedin',telegram:'telegram',searchConsole:'search_console',googleIndexing:'google_indexing',googleBusiness:'google_business',indexNow:'indexnow',googleDrive:'google_drive',gmail:'gmail',whatsapp:'whatsapp'};

  function msg(text,type='notice'){
    const el=$('#uc49IntegrationsMsg'); if(!el)return;
    el.innerHTML=text?`<div class="${type}">${H(text)}</div>`:'';
  }
  function persistDeleteFromBackend(s){
    const m=s?.deletedAt||{};[...SOCIAL_ORDER,'searchConsole','googleIndexing','googleBusiness','indexNow','googleDrive','gmail','whatsapp'].forEach(k=>{if(m[k])deleted.add(k);else deleted.delete(k);});saveDeleted();
  }
  function ensureTop(){
    const p=panel();if(!p)return;
    p.dataset.ucV1649Integrations='1';
    let top=$(':scope > .top',p);if(!top){top=document.createElement('div');top.className='top';p.prepend(top);}
    top.classList.add('uc49-integrations-top');
    top.innerHTML=`<div><h1>Integrations</h1><p class="muted">Connect and manage social media, SEO, storage, email and OTP, payments, ad networks, AI, and external API automation from one place.</p></div><button class="btn secondary compact" type="button" onclick="ucV1649RefreshIntegrations()">Refresh</button>`;
  }
  function paneMarkup(key,c){return `<section class="uc49-pane${key===activeCategory?' active':''}" data-uc49-pane="${key}"><div class="uc49-info-line"><div class="uc49-pane-copy"><h2>${H(c.title)}</h2><p>${H(c.description)}</p></div><button class="uc49-info-btn" type="button" aria-label="${H(c.title)} information" title="Information" onclick="ucV1649ToggleHelp('${key}')">i</button></div><div class="uc49-info-help" data-uc49-help="${key}" hidden><strong>${H(c.title)} integration help</strong><ul><li>Open a card to configure or test it.</li><li>The grid below summarizes capability and current connection state.</li><li>Edit opens the matching card. The grid toggle enables/disables through the same existing save workflow.</li><li>Delete is destructive and only runs after confirmation; it clears saved credentials for that integration.</li></ul></div><div class="uc49-card-stack" data-uc49-stack="${key}"></div><div data-uc49-grid-mount="${key}"></div></section>`;}
  function ensureShell(){
    const p=panel();if(!p)return false;ensureTop();
    let shell=$('#uc49IntegrationShell',p);
    if(!shell){
      shell=document.createElement('div');shell.id='uc49IntegrationShell';shell.className='uc49-integration-shell';
      shell.innerHTML=`<div class="notice uc49-category-note"><strong>One integration workspace:</strong> Existing saved credentials and connections are preserved. These tabs only reorganize where each integration is managed.</div><div class="tabs uc49-tabs" role="tablist">${Object.entries(CATEGORIES).map(([k,c])=>`<button class="pill${k===activeCategory?' active':''}" type="button" data-uc49-tab="${k}" onclick="ucV1649IntegrationTab('${k}',this)">${H(c.label)}</button>`).join('')}</div><div id="uc49IntegrationsMsg" class="uc49-global-msg"></div>${Object.entries(CATEGORIES).map(([k,c])=>paneMarkup(k,c)).join('')}`;
      const top=$(':scope > .top',p);top.insertAdjacentElement('afterend',shell);
    }
    return true;
  }
  function stack(k){return $(`[data-uc49-stack="${k}"]`,panel());}
  function findSocialCard(key){return $(`[data-social-card="${key}"]`,panel());}
  function appendCard(key,cat){const card=key==='seo'?$('#ucV152Blogger'):findSocialCard(key);const st=stack(cat);if(key==='seo'&&card){card.classList.add('uc-social-card','uc48-seo-social-card');card.dataset.socialCard='seo';}if(card&&st&&card.parentElement!==st)st.appendChild(card);}
  function stripEmbedded(sec){if(!sec)return;sec.classList.remove('panel','active');sec.classList.add('uc49-embedded-panel');sec.hidden=false;}
  function hideOldAdGrid(){const g=$('#adNetworkGrid');const c=g?.closest('.card');if(c)c.classList.add('uc49-ad-old-grid');}
  function rehome(){
    clearTimeout(rehomeTimer);rehomeTimer=setTimeout(()=>{
      const p=panel();if(!p||!ensureShell())return;
      SOCIAL_ORDER.forEach(k=>appendCard(k,'social'));SEO_ORDER.forEach(k=>appendCard(k,'seo'));STORAGE_ORDER.forEach(k=>appendCard(k,'storage'));EMAIL_ORDER.forEach(k=>appendCard(k,'email'));
      const pay=$('#payments');if(pay){stripEmbedded(pay);const st=stack('payments');if(st&&pay.parentElement!==st)st.appendChild(pay);}
      const ads=$('#adIntegrations');if(ads){stripEmbedded(ads);const st=stack('ads');if(st&&ads.parentElement!==st)st.appendChild(ads);hideOldAdGrid();}
      const ap=$('#apiSettings');if(ap){stripEmbedded(ap);const st=stack('api');if(st&&ap.parentElement!==st)st.appendChild(ap);}
      $$('#uc48SocialGroup,#uc48ServiceGroup',p).forEach(x=>x.remove());
      const oldMsg=$('#socialMediaMsg',p);if(oldMsg&&!oldMsg.dataset.uc49Kept){oldMsg.dataset.uc49Kept='1';oldMsg.classList.add('uc49-legacy-msg');}
      protectSocialAutofill();renderAllGrids();syncAllSummaryBadges();normalizeNav();
    },35);
  }
  function protectSocialAutofill(){
    const p=panel();if(!p)return;
    $$('form',p).forEach(f=>f.setAttribute('autocomplete','off'));
    $$('input[type="password"],input[name*="Secret" i],input[name*="Token" i],input[name*="Key" i]',p).forEach(el=>{el.setAttribute('autocomplete','new-password');el.setAttribute('data-lpignore','true');el.setAttribute('data-1p-ignore','true');});
  }

  function adminState(){try{return typeof A!=='undefined'?A:null;}catch(_){return null;}}
  function socialState(){return window.UCSocialIntegrations?.settings||{};}
  function paymentState(){return window.UCPaymentFollowup?.settings||adminState()?.payments||{};}
  function apiState(){return adminState()?.api||{};}
  function adState(){return adminState()?.settings?.adIntegrations||{};}
  function statusForSocial(key){
    const s=socialState(),x=s[key]||{};const del=deleted.has(key)||!!s.deletedAt?.[key];if(del)return ['Deleted','deleted'];
    if(key==='snapchat'){if(x.connected&&x.publishingReady)return ['Connected','connected'];if(x.connected)return ['OAuth connected','oauth'];}
    if(key==='googleIndexing'){if(x.connected)return ['Eligible pages only','limited'];}
    if(key==='googleBusiness'){if(x.connected)return ['OAuth connected','oauth'];}
    if(key==='googleDrive'){if(x.uploadReady)return ['Upload ready','ready'];if(x.oauthConnected||x.connected)return ['OAuth connected','oauth'];}
    if(x.connected||x.connectionState==='connected'||x.oauthConnected)return ['Connected','connected'];
    if(key==='indexNow'&&x.keyMasked)return ['Configured','configured'];
    if(x.enabled)return ['Enabled · setup required','limited'];
    return ['Disconnected','disconnected'];
  }
  function seoState(){
    const a=apiState(),del=deleted.has('seo')||!!a.bloggerDeletedAt;
    if(a.bloggerConnected){deleted.delete('seo');return ['Connected','connected'];}if(a.bloggerAuthorized){deleted.delete('seo');return ['OAuth connected','oauth'];}if(del)return ['Deleted','deleted'];return ['Disconnected','disconnected'];
  }
  function paymentRowState(key){
    const s=paymentState();
    if(String(s.primaryGateway||'').toLowerCase()===key){deleted.delete(key);return ['Primary','primary'];}
    const configured=key==='razorpay'?!!(s.razorpayKeyId&&s.razorpayKeySecretMasked):key==='phonepe'?!!(s.phonepeClientId&&s.phonepeClientSecretMasked):!!(s.stripePublishableKey&&s.stripeSecretKeyMasked);
    if(configured){deleted.delete(key);return ['Configured','configured'];}
    if(deleted.has(key)||!!s.deletedAt?.[key])return ['Deleted','deleted'];return ['Disconnected','disconnected'];
  }
  function adRows(){
    const a=adState(),rows=[];
    const stateFor=(key,x,configured)=>{if(x?.enabled||configured)deleted.delete(key);if(deleted.has(key))return ['Deleted','deleted'];if(x?.enabled)return ['Active','active'];if(configured)return ['Configured','configured'];return ['Inactive','inactive'];};
    const g=a.googleAdsense||{},gConfigured=!!(g.publisherId||g.headCode||g.bodyCode);rows.push({key:'googleAdsense',label:LABELS.googleAdsense,caps:CAPS.googleAdsense,enabled:!!g.enabled,status:stateFor('googleAdsense',g,gConfigured)});
    const ad=a.adsterra||{},adConfigured=!!(ad.headCode||ad.bodyCode);rows.push({key:'adsterra',label:LABELS.adsterra,caps:CAPS.adsterra,enabled:!!ad.enabled,status:stateFor('adsterra',ad,adConfigured)});
    const m=a.mediaNet||{},mConfigured=!!(m.headCode||m.bodyCode);rows.push({key:'mediaNet',label:LABELS.mediaNet,caps:CAPS.mediaNet,enabled:!!m.enabled,status:stateFor('mediaNet',m,mConfigured)});
    const customs=Array.isArray(a.customNetworks)&&a.customNetworks.length?a.customNetworks:(a.custom&&((a.custom.networkName)||(a.custom.headCode)||(a.custom.bodyCode))?[a.custom]:[]);
    customs.forEach((x,i)=>{const key=`custom:${i}`,configured=!!(x.headCode||x.bodyCode);rows.push({key,label:x.networkName||`Custom Ad Network ${i+1}`,caps:CAPS.custom,enabled:!!x.enabled,status:stateFor(key,x,configured)});});
    if(!customs.length)rows.push({key:'custom:0',label:'Custom Ad Network',caps:CAPS.custom,enabled:false,status:deleted.has('custom:0')?['Deleted','deleted']:['Inactive','inactive']});
    saveDeleted();return rows;
  }
  function rowsFor(cat){
    if(cat==='social')return SOCIAL_ORDER.map(k=>({key:k,label:LABELS[k],caps:CAPS[k],enabled:!!socialState()[k]?.enabled,status:statusForSocial(k)}));
    if(cat==='seo')return [
      {key:'seo',label:LABELS.seo,caps:CAPS.seo,enabled:!!apiState().bloggerConnected,status:seoState()},
      ...['indexNow','googleIndexing','searchConsole','googleBusiness'].map(k=>({key:k,label:LABELS[k],caps:CAPS[k],enabled:!!socialState()[k]?.enabled,status:statusForSocial(k)}))
    ];
    if(cat==='storage')return STORAGE_ORDER.map(k=>({key:k,label:LABELS[k],caps:CAPS[k],enabled:!!socialState()[k]?.enabled,status:statusForSocial(k)}));
    if(cat==='email')return [...EMAIL_ORDER.map(k=>({key:k,label:LABELS[k],caps:CAPS[k],enabled:k==='whatsapp'?socialState()[k]?.enabled!==false:!!socialState()[k]?.enabled,status:statusForSocial(k)})),...EMAIL_PROVIDER_ORDER.map(k=>{const s=window.UCEmailProviderSettings?.[k]||{},configured=!!(s.connected||s.enabled||s.accessKeyId||s.endpoint||s.fromEmail||s.apiKey||s.relayUrl||s.bucket);return{key:k,label:LABELS[k],caps:CAPS[k],enabled:!!s.enabled,status:s.connected?['Connected','connected']:configured?['Configured','configured']:['Disconnected','disconnected']};})];
    if(cat==='payments'){const s=paymentState();return ['razorpay','phonepe','stripe'].map(k=>({key:k,label:LABELS[k],caps:CAPS[k],enabled:String(s.primaryGateway||'').toLowerCase()===k,status:paymentRowState(k)}));}
    if(cat==='ads')return adRows();
    if(cat==='api'){const a=apiState();if(a.apiToken)deleted.delete('apiAccess');const del=deleted.has('apiAccess');return [{key:'apiAccess',label:LABELS.apiAccess,caps:CAPS.apiAccess,enabled:a.enabled!==false,status:a.apiToken?['Token ready','token']:del?['Deleted','deleted']:a.enabled!==false?['Enabled','configured']:['Disabled','inactive']}];}
    return [];
  }
  function renderGrid(cat){
    if(cat==='ai'){const mount=$(`[data-uc49-grid-mount="ai"]`,panel());if(mount)mount.innerHTML='';return;}
    const mount=$(`[data-uc49-grid-mount="${cat}"]`,panel());if(!mount)return;const c=CATEGORIES[cat],rows=rowsFor(cat);
    mount.innerHTML=`<div class="card uc49-grid-card"><div class="uc49-grid-head-copy"><h3>${H(c.grid)}</h3><p>Use Edit to open the full configuration. The toggle uses the existing enable/save behavior. Delete clears only the selected integration after confirmation.</p></div><div class="uc49-grid-scroll"><div class="uc49-grid"><div class="uc49-grid-col">Integration</div><div class="uc49-grid-col">Capabilities</div><div class="uc49-grid-col">Status</div><div class="uc49-grid-col">Actions</div>${rows.length?rows.map(row=>rowHtml(cat,row)).join(''):`<div class="uc49-grid-empty">No integrations are available in this section yet.</div>`}</div></div></div>`;
  }
  function rowHtml(cat,row){
    const [st,cls]=row.status||['Disconnected','disconnected'];const canToggle=!(cat==='seo'&&row.key==='seo');
    return `<div class="uc49-grid-cell"><strong>${H(row.label)}</strong></div><div class="uc49-grid-cell uc49-cap-cell"><div class="uc49-capabilities">${(row.caps||[]).map(x=>`<span class="uc49-cap">${H(x)}</span>`).join('')}</div></div><div class="uc49-grid-cell"><span class="uc49-status ${H(cls)}">${H(st)}</span></div><div class="uc49-grid-cell"><div class="uc49-actions">${canToggle?`<label class="uc49-mini-switch" title="Enable or disable ${H(row.label)}"><input type="checkbox" ${row.enabled?'checked':''} onchange="ucV1649ToggleIntegration('${cat}','${H(row.key)}',this.checked,this)"><span class="uc49-mini-slider"></span></label>`:'<span class="uc49-cap">OAuth managed</span>'}<button class="btn secondary small uc49-grid-btn" type="button" title="Edit" aria-label="Edit ${H(row.label)}" onclick="ucV1649EditIntegration('${cat}','${H(row.key)}')">✎</button><button class="btn danger small uc49-grid-btn" type="button" title="Delete" aria-label="Delete ${H(row.label)}" onclick="ucV1649DeleteIntegration('${cat}','${H(row.key)}')">×</button></div></div>`;
  }
  function renderAllGrids(){Object.keys(CATEGORIES).forEach(renderGrid);}
  window.ucV1649RenderGrid=renderGrid;
  function statusClass(label){label=String(label||'').toLowerCase();if(label.includes('deleted'))return'deleted';if(label.includes('disconnect')||label.includes('inactive')||label.includes('disabled'))return'disconnected';if(label.includes('oauth'))return'oauth';if(label.includes('eligible')||label.includes('configured')||label.includes('token'))return'limited';return'connected';}
  function badgeForKey(key){if(key==='seo')return seoState();if(['razorpay','phonepe','stripe'].includes(key))return paymentRowState(key);return statusForSocial(key);}
  function putSummaryBadge(host,status){
    if(!host)return;const sum=host.matches?.('summary')?host:$('summary',host);if(!sum)return;let b=$('.uc49-summary-status',sum);if(!b){b=document.createElement('span');b.className='uc49-summary-status uc49-status';sum.appendChild(b);}b.textContent=status[0];b.className=`uc49-summary-status uc49-status ${statusClass(status[0])}`;
  }
  function syncAllSummaryBadges(){
    [...SOCIAL_ORDER,...SEO_ORDER,...STORAGE_ORDER,...EMAIL_ORDER].forEach(key=>putSummaryBadge(key==='seo'?$('#ucV152Blogger'):findSocialCard(key),badgeForKey(key)));
    ['razorpay','phonepe','stripe'].forEach(key=>putSummaryBadge($(`#payments [data-pay-detail="${key}"]`),paymentRowState(key)));
    const ads=adRows(),byKey=Object.fromEntries(ads.map(r=>[r.key,r.status]));putSummaryBadge($('#adsenseCard'),byKey.googleAdsense||['Inactive','inactive']);
    const other=[byKey.adsterra,byKey.mediaNet].filter(Boolean),otherStatus=other.some(x=>x[0]==='Active')?['Active','active']:other.some(x=>x[0]==='Configured')?['Configured','configured']:other.every(x=>x[0]==='Deleted')?['Deleted','deleted']:['Inactive','inactive'];putSummaryBadge($('#otherAdNetworksCard'),otherStatus);
    const custom=ads.filter(r=>r.key.startsWith('custom:')).map(r=>r.status),customStatus=custom.some(x=>x[0]==='Active')?['Active','active']:custom.some(x=>x[0]==='Configured')?['Configured','configured']:custom.length&&custom.every(x=>x[0]==='Deleted')?['Deleted','deleted']:['Inactive','inactive'];putSummaryBadge($('#customAdNetworksCard'),customStatus);
    const apiCard=$('#apiSettings details.card')||$('#apiSettings .card');if(apiCard?.matches('details'))putSummaryBadge(apiCard,rowsFor('api')[0]?.status||['Disabled','inactive']);
  }

  window.ucV1649IntegrationTab=function(cat,btn){if(!CATEGORIES[cat])cat='social';activeCategory=cat;$$('[data-uc49-tab]',panel()).forEach(b=>b.classList.toggle('active',b.dataset.uc49Tab===cat));$$('[data-uc49-pane]',panel()).forEach(x=>x.classList.toggle('active',x.dataset.uc49Pane===cat));if(btn)btn.blur();rehome();if(cat==='ai')setTimeout(()=>window.load_aiIntegrations?.(),70);};
  window.ucV1649ToggleHelp=function(cat){const h=$(`[data-uc49-help="${cat}"]`,panel());if(h)h.hidden=!h.hidden;};
  function openCard(card){if(!card)return;card.open=true;card.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>card.querySelector('input:not([type=hidden]):not([readonly]),select,textarea')?.focus({preventScroll:true}),450);}
  window.ucV1649EditIntegration=function(cat,key){
    window.ucV1649IntegrationTab(cat);if(cat==='email'&&EMAIL_PROVIDER_ORDER.includes(key)){window.ucV1707EditEmailProvider?.(key);return;}if(cat==='payments'){openCard($(`#payments [data-pay-detail="${key}"]`));return;}if(cat==='ads'){const type=key.split(':')[0],map={googleAdsense:'#adsenseCard',adsterra:'#otherAdNetworksCard',mediaNet:'#otherAdNetworksCard',custom:'#customAdNetworksCard'};const d=$(map[type]);if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}return;}if(cat==='api'){const card=$('#apiSettings .card');card?.scrollIntoView({behavior:'smooth',block:'start'});return;}openCard(key==='seo'?$('#ucV152Blogger'):findSocialCard(key));
  };
  function clickSaveForCard(card){
    const form=$('form',card);if(!form)return false;const buttons=$$('button',form);const b=buttons.find(x=>/save/i.test(x.textContent||'')&&!/save.*copy/i.test(x.textContent||''));if(b){b.click();return true;}try{form.requestSubmit();return true;}catch(_){return false;}
  }
  window.ucV1649ToggleIntegration=function(cat,key,on,input){
    deleted.delete(key);saveDeleted();
    if(cat==='email'&&EMAIL_PROVIDER_ORDER.includes(key)){window.ucV1707ToggleEmailProvider?.(key,on,input);return;}
    if(cat==='payments'){
      const cb=$(`#payments .uc-main-gateway-toggle[data-gateway="${key}"]`);if(!cb){msg('Open the payment gateway once so its controls can finish loading.','error');if(input)input.checked=!on;return;}cb.checked=!!on;window.ucPrimaryGatewayChanged?.(cb);cb.closest('form')?.requestSubmit();scheduleRefresh('Payment gateway setting is being saved…');return;
    }
    if(cat==='ads'){
      const type=key.split(':')[0],map={googleAdsense:'#googleAdsenseForm',adsterra:'#otherAdNetworksForm',mediaNet:'#otherAdNetworksForm',custom:'#customAdNetworksForm'},form=$(map[type]);if(!form){if(input)input.checked=!on;return;}let target=null;if(type==='googleAdsense')target=form.elements.enabled;else if(type==='adsterra')target=form.querySelector('[name="adsterraEnabled"],[name="enabled"]');else if(type==='mediaNet')target=form.querySelector('[name="mediaNetEnabled"],[name="enabled"]');else {const idx=Math.max(0,Number(String(key).split(':')[1]||0));target=form.querySelectorAll('[name="customEnabled"]')[idx]||form.querySelector('[name="customEnabled"]');}if(target)target.checked=!!on;form.requestSubmit();scheduleRefresh('Ad network setting is being saved…');return;
    }
    if(cat==='api'){
      api('/api/admin/api-settings',{method:'POST',body:JSON.stringify({enabled:!!on})}).then(()=>{if(adminState()?.api)A.api.enabled=!!on;scheduleRefresh('API access setting saved.');}).catch(e=>{msg(e.message,'error');if(input)input.checked=!on;});return;
    }
    if(key==='seo'){if(input)input.checked=!on;window.ucV1649EditIntegration('seo','seo');return;}
    const card=findSocialCard(key),form=$('form',card);if(!form){msg('The integration form is still loading. Click Refresh and try again.','error');if(input)input.checked=!on;return;}
    const check=key==='whatsapp'?(form.querySelector('[name="otpEnabled"]')||form.querySelector('[type="checkbox"]')):(form.querySelector('[name="enabled"]')||form.querySelector('[type="checkbox"]'));if(check)check.checked=!!on;if(!clickSaveForCard(card)){msg(`Open ${LABELS[key]||key} and use its Save button. The existing integration was not changed.`,'error');if(input)input.checked=!on;return;}scheduleRefresh(`${LABELS[key]||key} setting is being saved…`);
  };
  async function deleteSocial(key){const platform=SOCIAL_API_KEYS[key];if(!platform)throw new Error('This integration does not have a delete action.');const r=await api('/api/admin/social-integrations',{method:'POST',body:JSON.stringify({platform,action:'delete_integration'})});window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=r.settings||{};persistDeleteFromBackend(r.settings);return r;}
  async function deletePayment(key){const r=await api('/api/admin/integrations',{method:'POST',body:JSON.stringify({action:'delete_gateway',gateway:key})});if(window.UCPaymentFollowup)window.UCPaymentFollowup.settings=r.settings||{};return r;}
  async function deleteSeo(){const r=await api('/api/admin/api-settings',{method:'POST',body:JSON.stringify({action:'delete_seo_connection'})});deleted.add('seo');saveDeleted();return r;}
  async function deleteApi(){if(!confirm('Delete the external API access token? Existing automation using this token will stop. The endpoint definitions themselves will remain available.'))return null;const r=await api('/api/admin/api-settings',{method:'POST',body:JSON.stringify({action:'revoke',enabled:false})});deleted.add('apiAccess');saveDeleted();return r;}
  async function deleteAd(key){
    const type=key.split(':')[0],idx=Math.max(0,Number(key.split(':')[1]||0)),state=adminState();if(!state)throw new Error('Admin settings are still loading.');
    const ai=JSON.parse(JSON.stringify(adState()||{}));ai.googleAdsense=ai.googleAdsense||{};ai.adsterra=ai.adsterra||{};ai.mediaNet=ai.mediaNet||{};ai.customNetworks=Array.isArray(ai.customNetworks)?ai.customNetworks:[];
    if(type==='googleAdsense')ai.googleAdsense={enabled:false,publisherId:'',headCode:'',bodyCode:'',notes:''};
    else if(type==='adsterra')ai.adsterra={enabled:false,headCode:'',bodyCode:'',notes:''};
    else if(type==='mediaNet')ai.mediaNet={enabled:false,headCode:'',bodyCode:'',notes:''};
    else if(type==='custom'){if(ai.customNetworks.length)ai.customNetworks.splice(idx,1);ai.custom=ai.customNetworks[0]||{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''};}
    state.settings={...(state.settings||{}),adIntegrations:ai};await api('/api/admin/settings',{method:'POST',body:JSON.stringify(state.settings)});await window.load_adIntegrations?.();return {ok:true};
  }
  window.ucV1649DeleteIntegration=async function(cat,key){
    const label=LABELS[key]||LABELS[key.split(':')[0]]||key;
    if(cat!=='api'&&!confirm(`Delete ${label} integration? This clears its saved connection/credential fields. Other integrations are not changed.`))return;
    try{msg(`Deleting ${label}…`);let r;if(cat==='email'&&EMAIL_PROVIDER_ORDER.includes(key)){await window.ucV1707DeleteEmailProvider?.(key);renderGrid('email');msg(`${label} integration deleted. Other integrations remain unchanged.`,'notice');return;}if(cat==='payments')r=await deletePayment(key);else if(cat==='ads'){r=await deleteAd(key);deleted.add(key);saveDeleted();}else if(cat==='api')r=await deleteApi();else if(key==='seo')r=await deleteSeo();else r=await deleteSocial(key);if(r===null)return;deleted.add(key);saveDeleted();msg(`${label} integration deleted. Other integrations remain unchanged.`,'notice');await refreshAll(false);}catch(e){msg(e.message||`Could not delete ${label}.`,'error');}
  };
  function scheduleRefresh(text){msg(text);clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshAll(false),1100);setTimeout(()=>refreshAll(false),2400);}
  async function refreshAll(show=true){
    if(show)msg('Refreshing integration status…');
    try{
      if(typeof window.load_socialMediaIntegrations==='function')await window.load_socialMediaIntegrations();
      if(typeof window.load_payments==='function')await window.load_payments();
      if(typeof window.load_adIntegrations==='function')await window.load_adIntegrations();
      if(typeof window.load_aiIntegrations==='function')await window.load_aiIntegrations();
      if(typeof window.load_apiSettings==='function')await window.load_apiSettings();
      const ss=socialState();persistDeleteFromBackend(ss);rehome();setTimeout(rehome,140);setTimeout(rehome,520);if(show)msg('Integration status refreshed. Existing saved connections were not changed.','notice');
    }catch(e){rehome();if(show)msg(e.message||'Some integration status could not be refreshed.','error');}
  }
  window.ucV1649RefreshIntegrations=()=>refreshAll(true);

  function normalizeNav(){
    const nav=$('.side .nav');if(!nav)return;
    $$('button[data-tab="payments"],button[data-tab="adIntegrations"],button[data-tab="apiSettings"]',nav).forEach(b=>b.remove());
    const b=$('button[data-tab="socialMediaIntegrations"]',nav);if(b){const span=b.querySelector('span:not(.nav-arrow)');if(span)span.textContent='Integrations';else b.textContent='Integrations';}
  }
  function patchGuidance(){
    const swaps=[[/Settings\s*→\s*Integrations/gi,'Settings → Integrations'],[/Settings\s*→\s*Ad Integrations/gi,'Settings → Integrations → Ad Networks'],[/Settings\s*→\s*API Settings/gi,'Settings → Integrations → SEO']];
    $$('small,p,.hint,.notice,.error,details summary,label').forEach(el=>{if(el.closest('#loginOverlay'))return;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{let next=n.nodeValue;swaps.forEach(([r,t])=>next=next.replace(r,t));if(next!==n.nodeValue)n.nodeValue=next;});});
  }

  function ensureBrandMarquee(){
    const form=$('#settings form');if(!form)return;let row=$('.uc-v1649-marquee-master',form);if(!row){row=document.createElement('div');row.className='uc-v1649-marquee-master';row.innerHTML=`<div><strong>Marquee Tab Title Effect</strong><small>When enabled, the browser-tab title scrolls smoothly one character at a time. Disable it to keep the normal fixed title.</small></div><label class="switch" title="Enable or disable the browser-tab title marquee"><input id="ucMarqueeTabTitleEnabled" name="marqueeTabTitleEnabled" type="checkbox"><span class="slider"></span></label>`;const help=$('.uc-v7-help-master',form),actions=$('.form-actions',form);if(help)help.insertAdjacentElement('afterend',row);else if(actions)actions.insertAdjacentElement('beforebegin',row);else form.appendChild(row);}
    const box=$('#ucMarqueeTabTitleEnabled');if(box&&adminState()?.settings)box.checked=!!A.settings.marqueeTabTitleEnabled;
  }
  function syncMarqueeFromSettings(){ensureBrandMarquee();const box=$('#ucMarqueeTabTitleEnabled');if(box&&adminState()?.settings)box.checked=!!A.settings.marqueeTabTitleEnabled;window.ucConfigureTitleMarquee?.(adminState()?.settings||{});}

  function wrapFunctions(){
    if(wrappersInstalled)return;wrappersInstalled=true;
    const wrapLoad=name=>{const old=window[name];if(typeof old!=='function'||old.__uc49)return;const fn=async function(){const r=await old.apply(this,arguments);setTimeout(rehome,25);setTimeout(rehome,230);return r;};fn.__uc49=true;window[name]=fn;};
    ['load_socialMediaIntegrations','load_payments','load_adIntegrations','load_apiSettings'].forEach(wrapLoad);
    const oldSettings=window.load_settings;if(typeof oldSettings==='function'&&!oldSettings.__uc49){const fn=async function(){const r=await oldSettings.apply(this,arguments);syncMarqueeFromSettings();return r;};fn.__uc49=true;window.load_settings=fn;}
    const oldSave=window.saveSettings;if(typeof oldSave==='function'&&!oldSave.__uc49){const fn=async function(){const r=await oldSave.apply(this,arguments);syncMarqueeFromSettings();return r;};fn.__uc49=true;window.saveSettings=fn;}
    const oldTab=window.tab;if(!window.__ucV1654OwnTabRouter&&typeof oldTab==='function'&&!oldTab.__uc49){const fn=function(id){let cat='';if(id==='payments'){id='socialMediaIntegrations';cat='payments';}else if(id==='adIntegrations'){id='socialMediaIntegrations';cat='ads';}else if(id==='apiSettings'){id='socialMediaIntegrations';cat='api';}const r=oldTab.call(this,id);normalizeNav();if(id==='socialMediaIntegrations'){setTimeout(()=>{ensureShell();rehome();window.ucV1649IntegrationTab(cat||activeCategory);if(cat==='payments')window.load_payments?.();if(cat==='ads')window.load_adIntegrations?.();if(cat==='api')window.load_apiSettings?.();},90);}if(id==='settings')setTimeout(syncMarqueeFromSettings,80);return r;};fn.__uc49=true;window.tab=fn;}
  }
  function init(){
    wrapFunctions();ensureShell();normalizeNav();ensureBrandMarquee();patchGuidance();rehome();setTimeout(rehome,300);setTimeout(rehome,1100);setTimeout(syncMarqueeFromSettings,200);
    if(!observer){let pending=0;observer=new MutationObserver(m=>{if(!m.some(x=>x.addedNodes.length))return;clearTimeout(pending);pending=setTimeout(()=>{normalizeNav();patchGuidance();rehome();},120);});const p=panel();if(p)observer.observe(p,{childList:true,subtree:false});const nav=$('.side .nav');if(nav)observer.observe(nav,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2350));else setTimeout(init,2350);
})();
