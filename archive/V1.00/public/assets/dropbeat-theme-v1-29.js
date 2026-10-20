/* DropBeat V1.29 — saved public layout theme + complete brand-token propagation. */
(()=>{
  'use strict';
  const ALLOWED=new Set(['dropbeat','casting','spotlight','minimal']);
  const valid=value=>/^#[0-9a-f]{6}$/i.test(String(value||'').trim());
  const colour=(value,fallback)=>valid(value)?String(value).toUpperCase():fallback;
  function rgb(value){const clean=value.slice(1);return [0,2,4].map(i=>parseInt(clean.slice(i,i+2),16));}
  function shade(value,amount){const [r,g,b]=rgb(value),mix=amount<0?0:255,p=Math.abs(amount);return '#'+[r,g,b].map(v=>Math.round(v+(mix-v)*p).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function apply(settings={}){
    const primary=colour(settings.primaryColor,'#4B55BE'),accent=colour(settings.accentColor,'#A469A8'),theme=ALLOWED.has(String(settings.frontendTheme||''))?String(settings.frontendTheme):'dropbeat';
    const root=document.documentElement,style=root.style;
    root.dataset.siteTheme=theme;
    root.dataset.brandCustom=String(primary!=='#4B55BE'||accent!=='#A469A8');
    style.setProperty('--dropbeat-primary',primary);style.setProperty('--dropbeat-accent',accent);style.setProperty('--primary',primary);style.setProperty('--accent',accent);
    style.setProperty('--blue',primary);style.setProperty('--blue-mid',shade(primary,-.12));style.setProperty('--blue-dark',shade(primary,-.55));style.setProperty('--sky',accent);style.setProperty('--purple',primary);
    style.setProperty('--blue-rgb',rgb(primary).join(','));style.setProperty('--blue-dark-rgb',rgb(shade(primary,-.55)).join(','));style.setProperty('--sky-rgb',rgb(accent).join(','));style.setProperty('--accent-rgb',rgb(accent).join(','));
    style.setProperty('--db129-primary',primary);style.setProperty('--db129-accent',accent);style.setProperty('--db129-primary-rgb',rgb(primary).join(','));style.setProperty('--db129-accent-rgb',rgb(accent).join(','));
    document.body?.setAttribute('data-site-theme',theme);
    window.dispatchEvent(new CustomEvent('dropbeat:site-theme',{detail:{theme,primary,accent}}));
  }
  const prior=window.applySettings;
  window.applySettings=function(settings){const result=typeof prior==='function'?prior.apply(this,arguments):undefined;apply(settings||{});return result;};
  window.UCApplyV129SiteTheme=apply;
  apply(window.__ucLatestSettings||{});
})();
