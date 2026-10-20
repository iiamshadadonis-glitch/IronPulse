(function(){
  'use strict';
  const skip=new Set(['SCRIPT','STYLE','CODE','PRE','TEXTAREA']);
  const rules=[
    [/urgent-casting\.com/gi,()=>String(location.host||'dance-class-at2.pages.dev')],
    [/urgentcasting/gi,'dropbeatdance'],
    [/Urgent Casting/gi,'DropBeat Dance Studio'],
    [/verified audition updates/gi,'online and studio dance class updates'],
    [/audition-update services/gi,'dance class services'],
    [/Latest Auditions & Casting Updates/gi,'Latest Dance Tips'],
    [/audition updates/gi,'dance tips'],
    [/audition update/gi,'dance tip'],
    [/auditions/gi,'dance classes'],
    [/audition/gi,'dance class'],
    [/casting calls/gi,'dance class announcements'],
    [/casting teams/gi,'dance instructors'],
    [/casting team/gi,'dance studio team'],
    [/casting director/gi,'dance instructor'],
    [/casting/gi,'dance'],
    [/experienced performers/gi,'experienced dancers'],
    [/performers/gi,'dancers'],
    [/performer/gi,'dancer'],
    [/actors/gi,'dancers'],
    [/actor/gi,'dancer'],
    [/Submit Your Profile/gi,'Book a Trial Class'],
    [/Submit Profile/gi,'Book a Trial'],
    [/Profile Submission/gi,'Trial Class Enquiry'],
    [/Success Stories/gi,'Student Stories'],
    [/Client Success Stories/gi,'Student Stories'],
    [/role interests/gi,'dance interests'],
    [/roles/gi,'dance styles'],
    [/role/gi,'dance style']
  ];
  const tipRules=[[/Dance Class Updates/gi,'Dance Tips'],[/Dance Class Update/gi,'Dance Tip']];
  const isTipsPage=()=>['blog-list','blog-post'].includes(document.body?.dataset?.ucLoad||'');
  function replace(v){const brand=String(window.__ucLatestSettings?.siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio',marker='\uE000UC_CURRENT_BRAND\uE001';let x=String(v||'').split(brand).join(marker);for(const [r,to] of rules)x=x.replace(r,typeof to==='function'?to():to);x=x.replace(/DropBeat(?: Dance)? Studio/gi,brand).split(marker).join(brand);if(isTipsPage())for(const [r,to] of tipRules)x=x.replace(r,to);return x;}
  function walk(root){
    if(!root)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const nodes=[];while(n=w.nextNode())nodes.push(n);
    for(const node of nodes){if(!node.parentElement||skip.has(node.parentElement.tagName)||node.parentElement.closest('[data-db157-name],[data-db159-name],[data-db156-button],.db156-ui,.db157-ui'))continue;const v=replace(node.nodeValue);if(v!==node.nodeValue)node.nodeValue=v;}
    if(root.querySelectorAll) root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el=>['placeholder','title','aria-label','alt'].forEach(a=>{if(el.hasAttribute(a)&&!el.closest('[data-db157-name],[data-db159-name],[data-db156-button],.db156-ui,.db157-ui')){const old=el.getAttribute(a),v=replace(old);if(v!==old)el.setAttribute(a,v)}}));
  }
  function patchDanceTipLabels(){
    // Navigation labels belong exclusively to the shared dynamic layout store.
    if(!isTipsPage())return;
    const nextTitle=replace(document.title);if(nextTitle!==document.title)document.title=nextTitle;
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]').forEach(meta=>{const next=replace(meta.content);if(next!==meta.content)meta.content=next;});
  }
  function syncBrand(){
    const s=window.__ucLatestSettings||{};const p=s.primaryColor||'#4B55BE',a=s.accentColor||'#A469A8';
    document.documentElement.style.setProperty('--dropbeat-primary',p);document.documentElement.style.setProperty('--dropbeat-accent',a);
    document.documentElement.style.setProperty('--blue',p);document.documentElement.style.setProperty('--sky',a);document.documentElement.style.setProperty('--accent',a);
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=p;
  }
  let busy=false;const run=()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{walk(document.body);patchDanceTipLabels();syncBrand();busy=false;});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(syncBrand,1500);
})();
