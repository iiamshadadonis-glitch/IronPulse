/* V16.80 — signed lead-nurturing checkout preparation. */
(()=>{'use strict';
  if(location.pathname!=='/checkout')return;
  const q=new URLSearchParams(location.search),leadId=q.get('automation_lead')||'',productId=q.get('automation_offer')||'',expires=q.get('automation_expires')||'',token=q.get('automation_token')||'';
  if(!leadId||!productId||!expires||!token)return;
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function prepare(){const box=document.querySelector('#checkoutResult');if(box)box.innerHTML='<div class="notice">Preparing your selected plan and contact details…</div>';try{const p=new URLSearchParams({lead_id:leadId,product_id:productId,expires,token}),r=await fetch(`/api/public/automation-checkout?${p}`,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'The personalized checkout could not be prepared.');localStorage.setItem('uc_cart',JSON.stringify(d.cart||[]));sessionStorage.setItem('uc_checkout_prefill',JSON.stringify({...d.customer,source:'lead_nurturing_offer'}));sessionStorage.setItem('uc_automation_checkout_ready','1');location.replace('/checkout');}catch(e){if(box)box.innerHTML=`<div class="notice error"><strong>Unable to prepare this offer.</strong><br>${H(e.message)}</div>`;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(prepare,0),{once:true});else setTimeout(prepare,0);
})();
