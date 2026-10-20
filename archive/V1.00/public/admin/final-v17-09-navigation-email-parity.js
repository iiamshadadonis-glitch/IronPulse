/* V17.09 — final guard for retired Marketing & SEO pages. Integration marketing remains untouched. */
(()=>{
  'use strict';
  const retired=new Set(['marketingHome','googleAdsMarketing','socialMarketing','emailMarketing','marketingFunnels']);
  let cleaning=false;

  function removeRetiredUi(){
    if(cleaning)return;
    cleaning=true;
    try{
      document.querySelectorAll('.side .nav .nav-group').forEach(group=>{
        if(group.dataset.groupTitle==='Marketing & SEO')group.remove();
      });
      retired.forEach(id=>document.getElementById(id)?.remove());
      const active=document.querySelector('.panel.active');
      if(active&&retired.has(active.id))window.tab?.('dashboard');
    }finally{cleaning=false;}
  }

  function guardRoutes(){
    const current=window.tab;
    if(typeof current!=='function'||current.__uc1709MarketingGuard)return;
    const guarded=function(id,...args){return current.call(this,retired.has(id)?'dashboard':id,...args);};
    guarded.__uc1709MarketingGuard=true;
    window.tab=guarded;
  }

  let timer=0;
  const observer=new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{removeRetiredUi();guardRoutes();},40);
  });
  function init(){removeRetiredUi();guardRoutes();observer.observe(document.body,{childList:true,subtree:true});setTimeout(removeRetiredUi,1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
