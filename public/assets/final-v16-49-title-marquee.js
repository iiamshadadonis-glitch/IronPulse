/* V16.51 — browser-tab title marquee controlled only by Brand Settings.
   Fix: older public polish started an unconditional title timer. This controller
   explicitly cancels that legacy timer and keeps the tab fixed unless the saved
   setting marqueeTabTitleEnabled is exactly true. */
(()=>{
  'use strict';
  /* Signal legacy public polish immediately, before DOMContentLoaded, so it never
     starts an unconditional title animation while the saved setting is disabled. */
  window.__ucTitleMarqueeSettingsManaged=true;
  const initialTemplate=String(document.title||'').trim();
  let raf=0,last=0,index=0,base=initialTemplate,sequence='',applyWrapped=false;
  const stepMs=165;
  function stopLegacy(){
    try{if(window.__ucTitleMarqueeTimer){clearTimeout(window.__ucTitleMarqueeTimer);window.__ucTitleMarqueeTimer=null;}window.__ucTitleMarqueeStarted=false;}catch(_){ }
  }
  function stop(restore=true){if(raf)cancelAnimationFrame(raf);raf=0;last=0;index=0;if(restore&&base)document.title=base;}
  function brandedBase(settings){
    const brand=String(settings?.siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio';
    let title=initialTemplate||brand;
    if(/DropBeat Dance Studio/i.test(title))title=title.replace(/DropBeat Dance Studio/gi,brand);
    return title.trim()||brand;
  }
  function frame(ts){
    if(!raf)return;
    if(!last)last=ts;
    if(ts-last>=stepMs){
      const steps=Math.max(1,Math.floor((ts-last)/stepMs));last+=steps*stepMs;index=(index+steps)%sequence.length;
      document.title=sequence.slice(index)+sequence.slice(0,index);
    }
    raf=requestAnimationFrame(frame);
  }
  window.ucConfigureTitleMarquee=function(settings={}){
    stopLegacy();stop(false);base=brandedBase(settings);
    if(settings.marqueeTabTitleEnabled!==true){document.title=base;return;}
    sequence=`${base}   •   `;if(!sequence.length){document.title=base;return;}
    document.title=sequence;raf=requestAnimationFrame(frame);
  };
  function wrapApplySettings(){
    if(applyWrapped||typeof window.applySettings!=='function')return;applyWrapped=true;
    const old=window.applySettings;
    window.applySettings=function(settings){
      const out=old.apply(this,arguments);
      setTimeout(()=>window.ucConfigureTitleMarquee(settings||window.__ucLatestSettings||{}),0);
      return out;
    };
  }
  /* Any legacy caller now respects the saved setting instead of restarting its own timer. */
  window.ucRestartTitleMarquee=()=>window.ucConfigureTitleMarquee(window.__ucLatestSettings||window.__ucLatestSiteSettings||{});
  async function init(){
    stopLegacy();wrapApplySettings();
    try{
      let settings=window.A?.settings||window.__ucLatestSettings||window.__ucLatestSiteSettings||null;
      if(!settings){const r=await fetch('/api/public/site',{headers:{accept:'application/json'},cache:'no-store'});if(r.ok){const d=await r.json();settings=d?.settings||null;}}
      window.ucConfigureTitleMarquee(settings||{});
    }catch(_){stopLegacy();stop(false);document.title=base||initialTemplate;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250),{once:true});else setTimeout(init,250);
  document.addEventListener('uc:site-settings-updated',e=>window.ucConfigureTitleMarquee(e.detail||{}));
})();
