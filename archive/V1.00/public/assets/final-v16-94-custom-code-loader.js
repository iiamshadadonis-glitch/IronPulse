/* V16.94 — administrator-managed public snippets with explicit placement, page scope and consent gates. */
(()=>{
  'use strict';
  if(window.__ucV1694CustomCode)return;window.__ucV1694CustomCode=true;
  const inserted=new Set();
  const allowed=category=>category==='essential'||!!window.UCConsent?.allows?.(category);
  function fragment(html){
    const template=document.createElement('template');template.innerHTML=html;
    for(const old of template.content.querySelectorAll('script')){const script=document.createElement('script');for(const attr of old.attributes)script.setAttribute(attr.name,attr.value);script.textContent=old.textContent;old.replaceWith(script);}
    return template.content;
  }
  function mount(row){if(inserted.has(row.id)||!allowed(row.consentCategory))return;const marker=document.createElement('span');marker.hidden=true;marker.dataset.ucCustomCode=String(row.id);if(row.placement==='head'){document.head.appendChild(marker);document.head.appendChild(fragment(row.code));}else if(row.placement==='body_start'){document.body.insertBefore(marker,document.body.firstChild);document.body.insertBefore(fragment(row.code),marker.nextSibling);}else{document.body.appendChild(marker);document.body.appendChild(fragment(row.code));}inserted.add(row.id);}
  async function load(){try{const r=await fetch(`/api/public/custom-code?path=${encodeURIComponent(location.pathname)}`,{credentials:'same-origin'}),d=await r.json();if(!r.ok)return;(d.snippets||[]).forEach(mount);}catch{}}
  load();addEventListener('uc-consent-change',load);
})();
