/* V16.69 — simplified Inbox automation toggle. */
(()=>{
'use strict';
const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(path,o={})=>{if(typeof window.api==='function')return window.api(path,o);const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(o.headers||{})},...o}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status}).`);return d;};
window.ucV1669ToggleAutomation=async(id,checked,input)=>{
  const msg=document.getElementById('uc56DmMsg');
  if(input)input.disabled=true;
  try{
    const mode=checked?'automation':'human';
    const out=await api('/api/admin/social-dms',{method:'POST',body:JSON.stringify({action:'automation_mode',conversationId:Number(id),mode})});
    if(window.UCV1656?.dms?.conversation&&Number(window.UCV1656.dms.conversation.id)===Number(id))window.UCV1656.dms.conversation=out.conversation||window.UCV1656.dms.conversation;
    await window.ucV1656OpenDm?.(Number(id));
    if(msg)msg.innerHTML=`<div class="notice success">${checked?'Automation enabled. Manual sending is locked for this conversation.':'Automation disabled. You can now reply manually.'}</div>`;
  }catch(e){if(input){input.checked=!checked;input.disabled=false;}if(msg)msg.innerHTML=`<div class="error">${H(e.message||'Could not change Automation.')}</div>`;}
};
})();
