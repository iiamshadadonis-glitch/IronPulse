/* IronPulse: copy is compiled in source; labels belong to the dictionary. */
(()=>{'use strict';
 function colors(){const s=window.__ucLatestSettings||{},p=s.primaryColor||'#4B55BE',a=s.accentColor||'#A469A8',d=document.documentElement;
  for(const key of ['--dropbeat-primary','--blue'])if(d.style.getPropertyValue(key)!==p)d.style.setProperty(key,p);
  for(const key of ['--dropbeat-accent','--sky','--accent'])if(d.style.getPropertyValue(key)!==a)d.style.setProperty(key,a);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta&&meta.content!==p)meta.content=p;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',colors,{once:true});else colors();
 window.addEventListener('dropbeat:site-theme',colors);
})();
