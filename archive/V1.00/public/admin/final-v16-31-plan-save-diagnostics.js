/* V16.31 — exact Plan / Offer save diagnostics. Keeps existing plan logic intact. */
(function(){'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ensureDiagnostic(){
    const f=$('#productForm');if(!f)return null;let box=$('#ucPlanSaveDiagnostic',f);if(box)return box;
    box=document.createElement('div');box.id='ucPlanSaveDiagnostic';box.className='uc-plan-save-diagnostic';box.hidden=true;
    const actions=f.querySelector('.form-actions'),submit=f.querySelector('button[type="submit"],button:not([type])');
    if(actions)actions.insertAdjacentElement('beforebegin',box);else if(submit)submit.insertAdjacentElement('beforebegin',box);else f.appendChild(box);return box;
  }
  function showDiagnostic(text,type='error'){
    const box=ensureDiagnostic();if(!box)return;box.className=`uc-plan-save-diagnostic ${type}`;box.innerHTML=`<strong>${type==='error'?'Plan could not be saved':'Plan saved'}</strong><span>${H(text)}</span>`;box.hidden=false;
    if(type==='error')window.ucAdminToast?.(text,'error');
  }
  function clearDiagnostic(){const box=ensureDiagnostic();if(box){box.hidden=true;box.textContent='';box.className='uc-plan-save-diagnostic';}}
  function buildPayload(f){
    const fd=new FormData(f),payload=Object.fromEntries(fd.entries());payload.id=$('#productId')?.value||undefined;payload.features=String(payload.features_json||'').split('\n').map(x=>x.trim()).filter(Boolean);delete payload.features_json;
    payload.regular_price_paise=Math.round(Number(payload.regular_price_rupees||0)*100);payload.offer_price_paise=Math.round(Number(payload.offer_price_rupees||0)*100);payload.offer_price_enabled=f.offer_price_enabled?.checked?1:0;payload.trial_enabled=(payload.payment_type==='subscription'&&f.trial_enabled?.checked)?1:0;payload.trial_amount_paise=Math.round(Number(payload.trial_amount_rupees||1)*100);payload.trial_value=Math.max(1,Number(payload.trial_value||1));payload.spot_limit=Math.max(0,Math.floor(Number(payload.spot_limit||0)));payload.filling_fast_limit=Math.max(0,Math.floor(Number(payload.filling_fast_limit||0)));payload.low_spot_limit=Math.max(0,Math.floor(Number(payload.low_spot_limit||0)));payload.sort_order=Number(payload.sort_order||0);delete payload.sku;delete payload.slug;return payload;
  }
  function validate(p){
    if(p.spot_limit>0&&p.filling_fast_limit>p.spot_limit)return'“Show Filling Fast At” cannot be higher than the Spot Limit.';
    if(p.spot_limit>0&&p.low_spot_limit>p.spot_limit)return'“Show Only X Spots Left At” cannot be higher than the Spot Limit.';
    if(p.filling_fast_limit>0&&p.low_spot_limit>p.filling_fast_limit)return'“Show Only X Spots Left At” must be equal to or lower than “Show Filling Fast At”.';
    return'';
  }
  window.saveProduct=async function(e){
    e.preventDefault();clearDiagnostic();const f=e.target,payload=buildPayload(f),validation=validate(payload);if(validation){showDiagnostic(validation,'error');return;}
    const btn=e.submitter||f.querySelector('button[type="submit"],button:not([type])'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Saving…';}
    try{
      const res=await api('/api/admin/products',{method:payload.id?'PUT':'POST',body:JSON.stringify(payload)});
      showDiagnostic(res?.message||'Plan / offer saved successfully.','success');
      $('#productModal')?.classList.remove('open');await window.load_products?.();
    }catch(err){
      const raw=String(err?.message||'Unknown error').trim();let msg=raw;
      if(/no such column.*(spot_limit|filling_fast_limit|low_spot_limit)/i.test(raw))msg='The plan availability fields were not initialized in D1. This V16.31 build repairs them automatically. Refresh the admin page once after deployment and try Save Plan / Offer again.';
      else if(/D1_ERROR|database/i.test(raw)&&!/threshold/i.test(raw))msg=`Database error while saving this plan: ${raw}`;
      else if(!/plan|offer|filling|spot|threshold/i.test(raw))msg=`Plan / offer save failed: ${raw}`;
      showDiagnostic(msg,'error');
    }finally{if(btn){btn.disabled=false;btn.textContent=old||'Save Plan / Offer';}}
  };
  function init(){ensureDiagnostic();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));else setTimeout(init,100);
})();
