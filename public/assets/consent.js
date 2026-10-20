/* IronPulse Gym cookie/consent preferences. Necessary storage is always enabled;
   optional analytics and advertising scripts wait for a user choice. */
(function(){
  const KEY='uc_consent_v1';
  const DEFAULT={necessary:true,analytics:false,ads:false,decided:false};
  function get(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch(_){return {...DEFAULT};}}
  function syncGoogleConsent(v){
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('consent','update',{
      analytics_storage:v.analytics?'granted':'denied',
      ad_storage:v.ads?'granted':'denied',
      ad_user_data:v.ads?'granted':'denied',
      ad_personalization:v.ads?'granted':'denied'
    });
  }
  function save(v){const next={necessary:true,analytics:!!v.analytics,ads:!!v.ads,decided:true};try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_){}syncGoogleConsent(next);window.dispatchEvent(new CustomEvent('uc-consent-change',{detail:next}));hide();return next;}
  function allows(kind){const v=get();if(kind==='necessary')return true;if(kind==='analytics')return !!(v.decided&&v.analytics);if(kind==='ads')return !!(v.decided&&v.ads);return false;}
  function hide(){document.getElementById('ucConsentBanner')?.remove();document.body?.classList.remove('uc-consent-visible');const wa=document.querySelector('#waFloat');if(wa&&wa.dataset.ucConsentOriginalBottom!==undefined){wa.style.bottom=wa.dataset.ucConsentOriginalBottom;delete wa.dataset.ucConsentOriginalBottom;}}
  function keepConsentAboveFooter(wrap){
    const footer=document.querySelector('.footer');
    if(!wrap||!footer)return;
    let raf=0;
    const place=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        if(!wrap.isConnected)return;
        const base=window.matchMedia?.('(max-width:760px)').matches?12:18;
        const footerRect=footer.getBoundingClientRect();
        const footerLift=Math.max(0,window.innerHeight-footerRect.top+18);
        wrap.style.bottom=`${Math.max(base,footerLift)}px`;
        // Keep the WhatsApp control clear of the consent panel whenever both occupy
        // the same part of the viewport. This is layout-only and does not change theme styling.
        const wa=document.querySelector('#waFloat');
        if(wa){
          if(wa.dataset.ucConsentOriginalBottom===undefined)wa.dataset.ucConsentOriginalBottom=wa.style.bottom||'';
          wa.style.bottom=wa.dataset.ucConsentOriginalBottom;
          const w=wrap.getBoundingClientRect(),q=wa.getBoundingClientRect();
          const horizontal=q.right>w.left&&q.left<w.right;
          const vertical=q.bottom>w.top&&q.top<w.bottom;
          if(horizontal&&vertical){
            const waFooterLift=Math.max(28,window.innerHeight-footerRect.top+20);
            wa.style.bottom=`${Math.max(waFooterLift,window.innerHeight-w.top+12)}px`;
          }
        }
      });
    };
    window.addEventListener('scroll',place,{passive:true});
    window.addEventListener('resize',place);
    place();
  }
  function render(){
    const current=get();syncGoogleConsent(current);
    if(current.decided||document.getElementById('ucConsentBanner'))return;
    const wrap=document.createElement('aside');wrap.id='ucConsentBanner';wrap.className='cookie-consent';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','Cookie preferences');
    wrap.setAttribute('aria-modal','true');
    wrap.innerHTML='<button type="button" class="cookie-consent-close" data-consent-close aria-label="Close cookie preferences">×</button><div class="cookie-consent-copy"><strong>Cookie preferences</strong><span>Necessary storage supports security, fraud prevention and essential website functions. Optional analytics and advertising cookies are used only when you allow them.</span><a href="/privacy-policy">Privacy Policy</a></div><div class="cookie-consent-actions"><button type="button" class="btn secondary small" data-consent-reject>Only Necessary</button><button type="button" class="btn small" data-consent-accept>Allow Optional</button></div>';
    document.body.appendChild(wrap);document.body.classList.add('uc-consent-visible');keepConsentAboveFooter(wrap);
    wrap.querySelector('[data-consent-reject]').onclick=()=>save({analytics:false,ads:false});
    wrap.querySelector('[data-consent-accept]').onclick=()=>save({analytics:true,ads:true});
    wrap.querySelector('[data-consent-close]').onclick=()=>save({analytics:false,ads:false});
  }
  window.UCConsent={get,save,allows,show:render,reset(){try{localStorage.removeItem(KEY);}catch(_){}render();}};
  // Default Consent Mode state must be set before optional Google tags are injected.
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
