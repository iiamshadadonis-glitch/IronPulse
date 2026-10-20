/* Final master public polish: nav hover, dropdown stability, title marquee, favicon type and 404 fallback support. */
(function(){
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  function stabilizeOffersDropdown(){
    const nav=document.querySelector('.navlinks'); if(!nav||nav.dataset.ucV1637==='1')return; // Saved navigation is authoritative.
    const wrap=nav.querySelector('.nav-dropdown');
    if(wrap){
      const a=wrap.querySelector('a[href="/offers"],a[href="/offers"]'); if(a){a.textContent='Offers';a.classList.add('nav-top-link');}
      const m=wrap.querySelector('.nav-dropdown-menu'); if(m){m.innerHTML='<a href="/offers">Memberships</a><a href="/festival-offers">Festival Offers</a><a href="/yearly-plans">Yearly Plans</a>';}
    }else{
      const offer=[...nav.querySelectorAll('a')].find(a=>/Offers/i.test(a.textContent||'') && /offers/.test(a.getAttribute('href')||''));
      if(offer){const span=document.createElement('span');span.className='nav-dropdown';offer.parentNode.insertBefore(span,offer);span.appendChild(offer);offer.textContent='Offers';const menu=document.createElement('span');menu.className='nav-dropdown-menu';menu.innerHTML='<a href="/offers">Memberships</a><a href="/festival-offers">Festival Offers</a><a href="/yearly-plans">Yearly Plans</a>';span.appendChild(menu);}
    }
    nav.querySelectorAll(':scope > a, .nav-dropdown > a').forEach(a=>a.classList.add('nav-top-link'));
  }
  function syncFaviconType(){
    const fav=document.querySelector('link[rel="icon"]'); if(!fav)return;
    const href=String(fav.getAttribute('href')||'').toLowerCase();
    if(href.includes('.gif') || href.includes('image/gif')) fav.type='image/gif';
    else if(href.includes('.ico')) fav.type='image/x-icon';
    else if(href.includes('.webp')) fav.type='image/webp';
    else if(href.includes('.svg')) fav.type='image/svg+xml';
    else fav.type='image/png';
  }
  function startTitleMarquee(force=false){
    /* V16.51: the Brand Settings controller owns browser-tab animation.
       When it is present, this legacy compatibility function must not start an
       unconditional marquee behind the admin toggle. */
    if(window.__ucTitleMarqueeSettingsManaged===true)return;
    if(force&&window.__ucTitleMarqueeTimer){clearTimeout(window.__ucTitleMarqueeTimer);window.__ucTitleMarqueeTimer=null;window.__ucTitleMarqueeStarted=false;}
    const original=document.title||'IronPulse Gym';
    if(window.__ucTitleMarqueeStarted)return; window.__ucTitleMarqueeStarted=true;
    if(original.length<=30)return;
    const spacer='     •     ';
    const loop=original+spacer;
    const doubled=loop+loop;
    const windowSize=Math.min(52,Math.max(30,original.length));
    let i=0;
    // A browser-tab title cannot be animated with CSS/pixels. Updating one character
    // at a short, even cadence is the smoothest reliable browser-safe marquee.
    const tick=()=>{
      if(document.visibilityState==='visible'){
        document.title=doubled.slice(i,i+windowSize);
        i=(i+1)%loop.length;
      }
      window.__ucTitleMarqueeTimer=setTimeout(tick,160);
    };
    tick();
  }
  window.ucRestartTitleMarquee=()=>startTitleMarquee(true);
  const oldApply=window.applySettings;
  window.applySettings=function(settings){
    if(typeof oldApply==='function')oldApply(settings);
    syncFaviconType(); stabilizeOffersDropdown(); setTimeout(()=>{if(window.__ucTitleMarqueeSettingsManaged!==true)startTitleMarquee(true);},0);
  };
  ready(()=>{stabilizeOffersDropdown();syncFaviconType();startTitleMarquee();setTimeout(stabilizeOffersDropdown,400);setTimeout(syncFaviconType,900);});
})();
