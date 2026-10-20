/* DropBeat V1.17 — authenticated student checkout prefill. */
(()=>{
  'use strict';
  const form=document.querySelector('#checkoutForm');if(!form)return;
  form.elements.preferred_role?.closest('.field')?.remove();
  const fill=account=>{if(!account||account.role!=='student')return;const values={name:account.displayName||account.realName||'',phone:String(account.phone||'').replace(/\D/g,''),email:account.email||''};for(const [key,value] of Object.entries(values)){const field=form.elements[key];if(field&&!String(field.value||'').trim()&&value)field.value=value;}try{sessionStorage.setItem('uc_checkout_prefill',JSON.stringify({...values,source:'authenticated_student'}));}catch(_){}}
  fetch('/api/portal/auth/me',{credentials:'same-origin',cache:'no-store'}).then(async response=>{if(!response.ok)return null;return response.json();}).then(data=>fill(data?.account)).catch(()=>{/* Guest checkout remains unchanged. */});
})();
