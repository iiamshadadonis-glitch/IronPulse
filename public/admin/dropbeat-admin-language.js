(function(){
  'use strict';
  const skip=new Set(['SCRIPT','STYLE','CODE','PRE','TEXTAREA']);
  function settings(){try{if(typeof A!=='undefined'&&A?.settings)return A.settings;}catch{}return window.A?.settings||window.__ucLatestSettings||{};}
  const rules=[
    [/urgent-casting\.com/gi,()=>String(location.host||'dance-class-at2.pages.dev')],
    [/urgentcasting/gi,'dropbeatdance'],
    [/Urgent Casting/gi,'DropBeat Dance Studio'],
    [/Audition Updates/gi,'Dance Class Updates'],[/audition updates/gi,'dance class updates'],
    [/Audition Update/gi,'Dance Class Update'],[/audition update/gi,'dance class update'],
    [/Auditions/gi,'Dance Classes'],[/auditions/gi,'dance classes'],[/audition/gi,'dance class'],
    [/Casting Calls/gi,'Dance Class Announcements'],[/casting calls/gi,'dance class announcements'],
    [/Casting Director/gi,'Dance Instructor'],[/casting director/gi,'dance instructor'],
    [/Casting Team/gi,'Dance Studio Team'],[/casting team/gi,'dance studio team'],
    [/Casting/gi,'Dance'],[/casting/gi,'dance'],
    [/Actors/gi,'Dancers'],[/actors/gi,'dancers'],[/Actor/gi,'Dancer'],[/actor/gi,'dancer'],
    [/Acting/gi,'Dance Training'],[/acting/gi,'dance training'],
    [/Performers/gi,'Dancers'],[/performers/gi,'dancers'],[/Performer/gi,'Dancer'],[/performer/gi,'dancer'],
    [/Submit Profile/gi,'Book a Trial'],[/Profile Submission/gi,'Trial Class Enquiry'],
    [/Success Stories/gi,'Student Stories'],[/Client Success Stories/gi,'Student Stories'],
    [/role requirements/gi,'class requirements'],[/Role Interest/gi,'Dance Style Interest']
  ];
  function replace(v){const brand=String(settings().siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio',marker='\uE000UC_CURRENT_BRAND\uE001';let x=String(v||'').split(brand).join(marker);for(const [r,to] of rules)x=x.replace(r,typeof to==='function'?to():to);return x.replace(/DropBeat(?: Dance)? Studio/gi,brand).split(marker).join(brand);}
  function walk(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const nodes=[];while(n=w.nextNode())nodes.push(n);for(const node of nodes){if(!node.parentElement||skip.has(node.parentElement.tagName)||node.parentElement.closest('[data-db157-name],[data-db159-name],[data-db156-button],.db156-ui,.db157-ui')||(matchMedia('(max-width:760px)').matches&&node.parentElement.closest('.db138-review')))continue;const v=replace(node.nodeValue);if(v!==node.nodeValue)node.nodeValue=v;}if(root.querySelectorAll)root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>{if(el.hasAttribute(a)&&!el.closest('[data-db157-name],[data-db159-name],[data-db156-button],.db156-ui,.db157-ui')){const o=el.getAttribute(a),v=replace(o);if(v!==o)el.setAttribute(a,v)}}));}
  function colors(){const s=settings();const p=s.primaryColor||'#4B55BE',a=s.accentColor||'#A469A8';const d=document.documentElement;d.style.setProperty('--dropbeat-primary',p);d.style.setProperty('--dropbeat-accent',a);d.style.setProperty('--blue',p);d.style.setProperty('--gold',a);d.style.setProperty('--pink',a);}
  function brandAssets(){const s=settings(),brand=String(s.siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio',tagline=String(s.tagline||'').trim(),logo=String(s.logoUrl||'/assets/dropbeat-logo.svg').trim()||'/assets/dropbeat-logo.svg';document.querySelectorAll('.brand img,#dropbeatAuthShell img,#dropbeatLoginBrand img,[data-site-logo],img[src="/assets/dropbeat-logo.svg"]').forEach(img=>{img.src=logo;img.alt=brand;});document.querySelectorAll('[data-site-name]').forEach(node=>node.textContent=brand);if(tagline)document.querySelectorAll('[data-site-tagline]').forEach(node=>node.textContent=tagline);const favicon=s.faviconUrl||logo;const icon=document.querySelector('link[rel="icon"]');if(icon&&favicon)icon.href=favicon;}
  const nativeAlert=window.alert,nativeConfirm=window.confirm,nativePrompt=window.prompt;
  window.alert=(m)=>nativeAlert.call(window,replace(m));window.confirm=(m)=>nativeConfirm.call(window,replace(m));window.prompt=(m,d)=>nativePrompt.call(window,replace(m),d);
  let busy=false;const run=()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{walk(document.body);colors();brandAssets();busy=false;});};window.applyDropBeatAdminBrand=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});setInterval(()=>{colors();brandAssets();},1500);
})();
