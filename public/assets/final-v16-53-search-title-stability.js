/* V16.53 — search-title stability.
   Search crawlers always see the normal page title. Human visitors can still use the
   admin-controlled marquee, but only when marqueeTabTitleEnabled is explicitly true. */
(()=>{
  'use strict';
  const crawler=/bot|crawler|spider|slurp|bingpreview|google-inspectiontool|googleother|googlebot|bingbot|duckduckbot|baiduspider|yandexbot/i.test(navigator.userAgent||'');
  const isHome=location.pathname==='/'||location.pathname==='/index.html';
  const seoTitle=String(document.querySelector('meta[property="og:title"]')?.content||document.title||'DropBeat Dance Studio').trim();
  let titleObserver=null;
  function stopLegacy(){try{if(window.__ucTitleMarqueeTimer){clearTimeout(window.__ucTitleMarqueeTimer);window.__ucTitleMarqueeTimer=null;}window.__ucTitleMarqueeStarted=false;}catch(_){}}
  function keepHomeFixed(){
    if(!isHome)return;stopLegacy();if(document.title!==seoTitle)document.title=seoTitle;
    if(titleObserver)return;const title=document.querySelector('title');if(!title)return;
    titleObserver=new MutationObserver(()=>{if(document.title!==seoTitle)document.title=seoTitle;});titleObserver.observe(title,{childList:true,characterData:true,subtree:true});
  }
  function releaseFixed(){titleObserver?.disconnect();titleObserver=null;}
  const old=window.ucConfigureTitleMarquee;
  window.ucConfigureTitleMarquee=function(settings={}){
    settings=settings||{};stopLegacy();
    if(crawler){releaseFixed();return;}
    if(settings.marqueeTabTitleEnabled!==true){if(isHome)keepHomeFixed();else if(typeof old==='function')old.call(this,settings);return;}
    releaseFixed();return typeof old==='function'?old.call(this,settings):undefined;
  };
  if(crawler){stopLegacy();window.__ucTitleMarqueeSettingsManaged=true;}
  if(isHome)keepHomeFixed();
  document.addEventListener('uc:site-settings-updated',e=>{const s=e.detail||{};if(s.marqueeTabTitleEnabled===true&&!crawler)releaseFixed();else if(isHome)keepHomeFixed();});
})();
