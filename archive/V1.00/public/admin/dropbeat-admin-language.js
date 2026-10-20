/* IronPulse: branding only. No post-render text replacement or menu writers. */
(()=>{'use strict';
 function brand(){let s=window.__ucLatestSettings||{};try{if(typeof A!=='undefined'&&A.settings)s=A.settings;}catch{}
  const d=document.documentElement,p=s.primaryColor||'#4B55BE',a=s.accentColor||'#A469A8';
  for(const key of ['--dropbeat-primary','--blue'])if(d.style.getPropertyValue(key)!==p)d.style.setProperty(key,p);
  for(const key of ['--dropbeat-accent','--gold','--pink'])if(d.style.getPropertyValue(key)!==a)d.style.setProperty(key,a);
  for(const node of document.querySelectorAll('[data-site-name]'))if(node.textContent!==(s.siteName||'IronPulse Gym'))node.textContent=s.siteName||'IronPulse Gym';
  for(const img of document.querySelectorAll('.brand img,#dropbeatAuthShell img,#dropbeatLoginBrand img,[data-site-logo]')){const src=s.logoUrl||'/assets/ironpulse-logo.svg';if(img.getAttribute('src')!==src)img.src=src;img.alt=s.siteName||'IronPulse Gym';}
 }
 window.applyDropBeatAdminBrand=brand;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',brand,{once:true});else brand();
 window.addEventListener('dropbeat:site-theme',brand);
})();
