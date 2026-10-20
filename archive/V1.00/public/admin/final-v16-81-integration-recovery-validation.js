/* V16.81 — clickable integration recovery diagnostics and flow validation clarity. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null,$$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TARGETS={
    facebook:['social','facebook','Facebook'],instagram:['social','instagram','Instagram'],meta:['social','facebook','Facebook'],threads:['social','threads','Threads'],twitter:['social','x','X / Twitter'],x:['social','x','X / Twitter'],linkedin:['social','linkedin','LinkedIn'],pinterest:['social','pinterest','Pinterest'],youtube:['social','youtube','YouTube'],snapchat:['social','snapchat','Snapchat'],tiktok:['social','tiktok','TikTok'],telegram:['social','telegram','Telegram'],
    search_console:['seo','searchConsole','Google Search Console'],google_indexing:['seo','googleIndexing','Google Indexing API'],google_business:['seo','googleBusiness','Google Business Profile'],indexnow:['seo','indexNow','Bing / IndexNow'],blogger:['seo','seo','Blogger / SEO'],seo:['seo','seo','Blogger / SEO'],
    google_drive:['storage','googleDrive','Google Drive'],gmail:['email','gmail','Gmail / Email'],email:['email','gmail','Gmail / Email'],whatsapp:['email','whatsapp','WhatsApp'],
    razorpay:['payments','razorpay','Razorpay'],phonepe:['payments','phonepe','PhonePe'],stripe:['payments','stripe','Stripe'],payments:['payments','razorpay','Payment Gateway'],
    google_adsense:['ads','googleAdsense','Google AdSense'],adsterra:['ads','adsterra','Adsterra'],ai:['ai','','AI Integrations'],api:['api','apiAccess','External API']
  };
  const aliases={googleDrive:'google_drive',searchConsole:'search_console',googleIndexing:'google_indexing',googleBusiness:'google_business',indexNow:'indexnow',apiAccess:'api',googleAdsense:'google_adsense'};
  const CONNECTION_FAILURE=/\b(?:disconnected|not connected|connection (?:test )?failed|connect(?:ion)? required|reconnect|authentication (?:failed|invalid|required)|authorization (?:failed|invalid|required|revoked)|oauth|invalid_grant|token (?:expired|revoked|invalid|missing)|expired token|revoked token|missing (?:credential|credentials|client id|client secret|api key|access token|refresh token)|credential(?:s)? (?:missing|invalid|expired)|not configured|setup required|configuration required|integration (?:disabled|unavailable|not ready)|account (?:not linked|disconnected)|permission denied|missing permission|missing scope|redirect_uri_mismatch|upload authorization|destination (?:root )?folder|api (?:is )?not enabled)\b/i;
  const FLOW_VALIDATION=/\b(?:flow not activated|complete the required information|write the (?:whatsapp|email|sms) message|enter (?:the )?flow name|choose at least one lead source|add at least one (?:content block|follow-up step)|step \d+\s*:\s*(?:write|enter|upload|choose|add))\b/i;
  function fromKey(value){const raw=String(value||'').trim(),key=aliases[raw]||raw.toLowerCase();const t=TARGETS[key];return t?{category:t[0],card:t[1],name:t[2],label:`Open ${t[2]} Integration`}:null;}
  function fromMessage(message,path=''){
    const text=`${message||''} ${path||''}`.toLowerCase();
    const tests=[
      ['google_drive',/google[ -]?drive|google-drive/],['search_console',/search console|search-console/],['google_indexing',/google indexing|google-indexing/],['google_business',/business profile|google-business/],['indexnow',/indexnow|bing/],['gmail',/gmail|email oauth|gmail-auth/],['whatsapp',/whatsapp|greenapi|green api/],
      ['facebook',/facebook|\bmeta page\b/],['instagram',/instagram/],['threads',/\bthreads\b/],['linkedin',/linkedin/],['pinterest',/pinterest/],['youtube',/youtube/],['snapchat',/snapchat/],['twitter',/x \/ twitter|twitter|x-auth/],
      ['razorpay',/razorpay/],['phonepe',/phonepe/],['stripe',/stripe/],['payments',/payment gateway|payments integration|checkout gateway/],['google_adsense',/adsense/],['adsterra',/adsterra/],['blogger',/blogger|seo connection|seo oauth/],['ai',/ai integration|ai provider/],['api',/external api|api access token/]
    ];
    for(const [key,re] of tests)if(re.test(text))return fromKey(key);
    return null;
  }
  function diagnosticOf(value){return value?.diagnostic||value?.responseData?.diagnostic||value||{};}
  function isIntegrationFailure(value,path=''){
    const diagnostic=diagnosticOf(value),message=String(diagnostic?.message||value?.message||value||''),text=`${message} ${path||''}`;
    if(diagnostic?.reconnectRequired===true||diagnostic?.authenticationInvalid===true)return true;
    if(FLOW_VALIDATION.test(message))return false;
    const supplied=value?.recovery||diagnostic?.recovery||value?.responseData?.recovery;
    return !!((supplied?.category||diagnostic?.integration||fromMessage(message,path))&&CONNECTION_FAILURE.test(text));
  }
  window.ucV1682IsIntegrationFailure=isIntegrationFailure;
  function recoveryOf(value,path=''){
    const diagnostic=diagnosticOf(value);
    const supplied=value?.recovery||diagnostic?.recovery||value?.responseData?.recovery;
    if(supplied?.category){const fallback=fromKey(supplied.card||diagnostic?.integration);return {category:supplied.category,card:supplied.card||fallback?.card||'',name:fallback?.name||String(supplied.label||'Integration').replace(/^Open | Integration$/g,''),label:supplied.label||fallback?.label||'Open Integration'};}
    return fromKey(diagnostic?.integration)||fromMessage(value?.message||diagnostic?.message||value,path);
  }
  function leaveAutomationWorkspace(){
    const leadClose=$('#uc76LeadWorkspace [data-uc76-close-lead]'),flowClose=$('#uc64Workspace [data-close-workspace]');
    try{leadClose?.click();}catch(_){ }
    try{flowClose?.click();}catch(_){ }
    $('#uc76LeadWorkspace')?.remove();$('#uc64Workspace')?.remove();document.body.classList.remove('uc64-workspace-open','uc64-dragging','uc64-panning');
  }
  function focusTarget(recovery){
    if(!recovery)return;
    leaveAutomationWorkspace();
    window.tab?.('socialMediaIntegrations');
    const open=()=>{
      window.ucV1649IntegrationTab?.(recovery.category);
      if(typeof window.ucV1649EditIntegration==='function')window.ucV1649EditIntegration(recovery.category,recovery.card);
      else{
        const selector=recovery.category==='payments'?`#payments [data-pay-detail="${recovery.card}"]`:recovery.card?`#socialMediaIntegrations [data-social-card="${recovery.card}"]`:'#socialMediaIntegrations';
        const card=$(selector);if(card?.matches('details'))card.open=true;card?.scrollIntoView({behavior:'smooth',block:'start'});card?.focus?.({preventScroll:true});
      }
      setTimeout(()=>{const selector=recovery.category==='payments'?`#payments [data-pay-detail="${recovery.card}"]`:recovery.card?`#socialMediaIntegrations [data-social-card="${recovery.card}"]`:`#socialMediaIntegrations [data-uc49-pane="${recovery.category}"]`;const card=$(selector);if(card){card.classList.remove('uc81-recovery-focus');void card.offsetWidth;card.classList.add('uc81-recovery-focus');setTimeout(()=>card.classList.remove('uc81-recovery-focus'),3200);}},180);
    };
    try{history.replaceState(history.state,'',`/admin/?integration_category=${encodeURIComponent(recovery.category)}${recovery.card?`&integration=${encodeURIComponent(recovery.card)}`:''}`);}catch(_){ }
    Promise.resolve(window.load_socialMediaIntegrations?.()).catch(()=>{}).finally(()=>setTimeout(open,130));
  }
  window.ucV1681OpenIntegration=value=>focusTarget(recoveryOf(value)||value);

  function dismiss(){const toast=$('#uc81IntegrationRecoveryToast');if(toast)toast.remove();}
  function report(value,path=''){
    if(!isIntegrationFailure(value,path))return false;
    const recovery=recoveryOf(value,path);if(!recovery)return false;
    const diagnostic=diagnosticOf(value);
    const message=String(diagnostic?.message||value?.message||`${recovery.name} is disconnected or needs attention.`).trim().slice(0,900);
    let toast=$('#uc81IntegrationRecoveryToast');if(!toast){toast=document.createElement('aside');toast.id='uc81IntegrationRecoveryToast';toast.className='uc81-recovery-toast';toast.setAttribute('role','alert');document.body.appendChild(toast);}
    toast.innerHTML=`<button class="uc81-recovery-close" type="button" aria-label="Close diagnostic">×</button><strong>${H(recovery.name)} needs attention</strong><span>${H(message)}</span><button class="uc81-recovery-open" type="button">${H(recovery.label)}</button>`;
    toast.onclick=e=>{if(e.target.closest('.uc81-recovery-close')){dismiss();return;}focusTarget(recovery);dismiss();};
    clearTimeout(window.__uc81RecoveryTimer);window.__uc81RecoveryTimer=setTimeout(dismiss,60000);return true;
  }
  window.ucV1681ReportIntegrationError=report;

  function decorate(node,recovery){
    if(!node||!recovery||node.dataset.uc81Recovery)return;node.dataset.uc81Recovery='1';node.classList.add('uc81-clickable-diagnostic');node.tabIndex=0;node.setAttribute('role','link');node.setAttribute('aria-label',`${(node.textContent||'Integration diagnostic').trim()} ${recovery.label}`);
    const action=document.createElement('button');action.type='button';action.className='uc81-inline-recovery';action.textContent=recovery.label;node.appendChild(action);
    const activate=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;if(e.type==='keydown')e.preventDefault();focusTarget(recovery);};node.addEventListener('click',activate);node.addEventListener('keydown',activate);
  }
  function scan(root=document){
    const nodes=[];if(root?.matches?.('.error,.admin-toast.error,.uc80-upload-status.error'))nodes.push(root);nodes.push(...$$('.error,.admin-toast.error,.uc80-upload-status.error',root));
    for(const node of nodes){if(node.dataset.uc81Recovery)continue;const value={message:node.textContent||''};if(!isIntegrationFailure(value))continue;const recovery=recoveryOf(value);if(recovery)decorate(node,recovery);}
  }
  function wrapApi(){const old=window.api;if(typeof old!=='function'||old.__uc81Recovery)return;const wrapped=async function(path,options={}){try{return await old.call(this,path,options);}catch(error){report(error,path);throw error;}};wrapped.__uc81Recovery=true;window.api=wrapped;}
  function wrapSocialResult(){const old=window.ucSocialIntegrationResult;if(typeof old!=='function'||old.__uc81Recovery)return;const wrapped=function(platform,text,type='notice'){const out=old.apply(this,arguments);if(type==='error'){const recovery=fromKey(platform)||fromMessage(text),value={message:text,recovery};setTimeout(()=>{const key=aliases[platform]||String(platform||'').replace(/^google_indexing$/,'googleIndexing').replace(/^indexnow$/,'indexNow').replace(/^google_business$/,'googleBusiness').replace(/^google_drive$/,'googleDrive');const card=$(`#socialMediaIntegrations [data-social-card="${key}"]`),box=card?.querySelector('[data-uc-integration-result] .error');if(box&&recovery&&isIntegrationFailure(value))decorate(box,recovery);report(value);},0);}return out;};wrapped.__uc81Recovery=true;window.ucSocialIntegrationResult=wrapped;}
  function openFromQuery(){const params=new URLSearchParams(location.search),category=params.get('integration_category'),card=params.get('integration');if(!category)return;setTimeout(()=>focusTarget({category,card:card||'',name:fromKey(card)?.name||'Integration',label:fromKey(card)?.label||'Open Integration'}),500);}
  function init(){wrapApi();wrapSocialResult();scan();openFromQuery();const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);wrapApi();wrapSocialResult();});observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
