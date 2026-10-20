/* Final additive admin patch: tracking enable/disable controls and compact payment layout. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  const toggleMap={
    googleAnalyticsMeasurementId:['googleAnalyticsEnabled','Enable'],
    googleTagManagerId:['googleTagManagerEnabled','Enable'],
    metaPixelId:['metaPixelEnabled','Enable'],
    snapchatPixelId:['snapchatPixelEnabled','Enable'],
    xPixelId:['xPixelEnabled','Enable'],
    linkedinPartnerId:['linkedinPixelEnabled','Enable'],
    pinterestTagId:['pinterestPixelEnabled','Enable'],
    redditPixelId:['redditPixelEnabled','Enable']
  };
  function patchTrackingToggles(){
    const panel=$('#tracking');if(!panel)return;
    for(const [inputName,[toggleName,label]] of Object.entries(toggleMap)){
      const input=panel.querySelector(`[name="${inputName}"]`);const field=input?.closest('.field');if(!field||field.querySelector(`[name="${toggleName}"]`))continue;
      field.classList.add('uc-track-toggle-field');
      const t=document.createElement('label');t.className='uc-track-toggle';t.title='Enable or disable this tracking integration';t.innerHTML=`<input type="checkbox" name="${toggleName}"><span>${label}</span>`;field.appendChild(t);
    }
    $$('#tracking .setup-note summary').forEach(s=>{s.textContent='Setup note';s.setAttribute('aria-label','Show setup note');});
  }
  function patchPaymentLayout(){
    const panel=$('#payments');if(!panel)return;
    const stripe=[...panel.querySelectorAll('.pay-detail')].find(d=>/^Stripe$/i.test(d.querySelector(':scope > summary')?.textContent?.trim()||''));
    const form=stripe?.querySelector('form');if(form&&!form.querySelector('.uc-payment-toggle-row')){
      const labels=[...form.querySelectorAll(':scope > label.check, :scope > label.final-payment-toggle')].slice(0,2);
      if(labels.length){const row=document.createElement('div');row.className='uc-payment-toggle-row';form.insertBefore(row,labels[0]);labels.forEach(l=>row.appendChild(l));}
    }
    $$('#payments label.check').forEach(l=>l.classList.add('final-payment-toggle'));
  }
  function syncTrackingChecks(){
    patchTrackingToggles();const s=A?.settings||{};
    for(const [, [toggleName]] of Object.entries(toggleMap)){const el=$(`#tracking [name="${toggleName}"]`);if(el)el.checked=s[toggleName]!==false;}
  }
  const oldLoad=window.load_tracking;
  if(typeof oldLoad==='function')window.load_tracking=async function(){const r=await oldLoad.apply(this,arguments);syncTrackingChecks();return r;};
  window.saveTracking=async function(e){
    e.preventDefault();patchTrackingToggles();
    try{
      const form=e.target;const payload=Object.fromEntries(new FormData(form).entries());
      for(const [, [toggleName]] of Object.entries(toggleMap)){payload[toggleName]=!!form.querySelector(`[name="${toggleName}"]`)?.checked;}
      A.settings={...(A.settings||{}),...payload};
      const res=await api('/api/admin/settings',{method:'POST',body:JSON.stringify(A.settings)});A.settings=res.settings||A.settings;
      msg('#trackingMsg','Tracking settings saved successfully. Enabled tracking tags will run only after the visitor allows optional analytics cookies.');
      syncTrackingChecks();
    }catch(err){msg('#trackingMsg',err.message||'Tracking settings could not be saved.','error');}
  };
  const oldPayments=window.load_payments;
  if(typeof oldPayments==='function')window.load_payments=async function(){const r=await oldPayments.apply(this,arguments);setTimeout(patchPaymentLayout,0);return r;};
  const oldTab=window.tab;
  if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(()=>{if(id==='tracking'){patchTrackingToggles();syncTrackingChecks();}if(id==='payments')patchPaymentLayout();},40);return r;};
  ready(()=>{patchTrackingToggles();patchPaymentLayout();setTimeout(()=>{patchTrackingToggles();patchPaymentLayout();},800);const obs=new MutationObserver(()=>{clearTimeout(window.__ucSeoAdminTimer);window.__ucSeoAdminTimer=setTimeout(()=>{patchTrackingToggles();patchPaymentLayout();},80);});obs.observe(document.body,{childList:true,subtree:true});});
})();
