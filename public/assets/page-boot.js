/* Start public data loading as soon as the document has been parsed instead of waiting for window.onload. */
(function(){
  function loadDropBeatV113(){
    if(window.__dropBeatV113Ready)return window.__dropBeatV113Ready;
    if(!document.querySelector('link[data-dropbeat-v113]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/dropbeat-dance-v1-13.css?v=1.13';css.dataset.dropbeatV113='1';document.head.appendChild(css);
    }
    window.__dropBeatV113Ready=new Promise(resolve=>{
      const existing=document.querySelector('script[data-dropbeat-v113]');if(existing){if(existing.dataset.loaded==='1')resolve();else existing.addEventListener('load',resolve,{once:true});return;}
      const script=document.createElement('script');script.src='/assets/dropbeat-dance-v1-13.js?v=1.13';script.dataset.dropbeatV113='1';script.onload=()=>{script.dataset.loaded='1';resolve();};script.onerror=resolve;document.head.appendChild(script);
    });
    return window.__dropBeatV113Ready;
  }
  function loadMarketingTracker(){
    if(document.querySelector('script[data-uc-marketing-tracker]'))return;
    const script=document.createElement('script');
    script.src='/assets/final-v16-92-marketing-tracker.js?v=16.94';
    script.defer=true;
    script.dataset.ucMarketingTracker='1';
    document.head.appendChild(script);
  }
  function loadCustomCode(){
    if(document.querySelector('script[data-uc-custom-code]'))return;
    const script=document.createElement('script');script.src='/assets/final-v16-94-custom-code-loader.js?v=16.94';script.defer=true;script.dataset.ucCustomCode='1';document.head.appendChild(script);
  }
  function run(){
    if(window.__ucPageBooted)return;window.__ucPageBooted=true;
    loadCustomCode();loadMarketingTracker();
    const action=document.body?.dataset?.ucLoad||'';
    try{
      if(action==='home')return window.UC?.loadHome?.();
      if(action==='offers')return window.UC?.loadOffers?.();
      if(action==='festival')return window.UC?.loadFestivalOffers?.();
      if(action==='yearly')return window.UC?.loadYearly?.();
      if(action==='success')return window.UC?.loadSuccessStoriesPage?.();
      if(action==='checkout'&&new URLSearchParams(location.search).has('automation_token')){
        const script=document.createElement('script');script.src='/assets/final-v16-80-automation-checkout-prefill.js?v=16.80';script.defer=true;document.head.appendChild(script);return;
      }
      if(action==='checkout')return window.UC?.loadCheckout?.();
      if(action==='orders')return window.UC?.loadCommon?.();
      if(action==='blog-list')return window.UC?.loadBlogList?.();
      if(action==='blog-post')return window.UC?.loadBlogPost?.();
      if(action.startsWith('page:'))return window.UC?.loadPage?.(action.slice(5));
      return window.UC?.loadCommon?.();
    }catch(err){console.warn('Page initialization:',err?.message||err);}
  }
  // Core page data and optional presentation enhancements load in parallel.
  // A slow enhancement asset must never delay banners, plans, stories or pages.
  const start=()=>{loadDropBeatV113();run();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
