/* DropBeat V1.30 — resilient public colour-mode control for dynamic headers. */
(()=>{
  'use strict';
  if(window.__dropbeatDarkModeV130)return;
  window.__dropbeatDarkModeV130=true;

  const KEY='dropbeat-color-mode';
  const root=document.documentElement;
  const system=window.matchMedia?.('(prefers-color-scheme: dark)');
  const hasLegacyRuntime=Boolean(document.querySelector('script[src*="gym-color-mode-v1-25.js"]'));
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg>';
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.2A8.5 8.5 0 0 1 8.8 3.3 8.5 8.5 0 1 0 20.7 15.2Z"></path></svg>';
  let observer=null,queued=false;

  function savedMode(){try{const value=localStorage.getItem(KEY);return value==='light'||value==='dark'?value:'';}catch{return'';}}
  function preferredMode(){return savedMode()||(system?.matches?'dark':'light');}
  function updateButton(button,mode){
    const isDark=mode==='dark';
    if(button.dataset.mode!==mode||!button.querySelector('svg'))button.innerHTML=isDark?moon:sun;
    button.setAttribute('aria-label',isDark?'Switch to light mode':'Switch to dark mode');
    button.setAttribute('title',isDark?'Switch to light mode':'Switch to dark mode');
    button.setAttribute('aria-pressed',String(isDark));
    button.dataset.mode=mode;
  }
  function sync(mode){
    const value=mode==='dark'?'dark':'light';
    root.dataset.colorMode=value;
    root.style.colorScheme=value;
    document.querySelectorAll('[data-dropbeat-color-mode]').forEach(button=>updateButton(button,value));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta){if(!meta.dataset.lightColor)meta.dataset.lightColor=meta.content||'#4B55BE';meta.content=value==='dark'?'#111521':meta.dataset.lightColor;}
  }
  function applyMode(mode){
    sync(mode);
    window.dispatchEvent(new CustomEvent('dropbeat:color-mode',{detail:{mode:root.dataset.colorMode}}));
  }
  function makeButton(){
    const button=document.createElement('button');
    button.type='button';
    button.className='db125-color-mode-toggle db130-color-mode-toggle';
    button.dataset.dropbeatColorMode='1';
    button.dataset.db130Owned='1';
    button.addEventListener('click',()=>{
      const next=root.dataset.colorMode==='dark'?'light':'dark';
      try{localStorage.setItem(KEY,next);}catch{}
      applyMode(next);
    });
    updateButton(button,root.dataset.colorMode||preferredMode());
    return button;
  }
  function mount(button){
    const publicActions=document.querySelector('.topbar .nav-actions');
    const portalTop=document.querySelector('.portal-topbar');
    const portalPublic=document.querySelector('.portal-public-header>div');
    if(publicActions){publicActions.prepend(button);button.classList.add('db125-in-toolbar');}
    else if(portalTop){const identity=portalTop.querySelector('.portal-identity');identity?.before(button)||portalTop.append(button);button.classList.add('db125-in-portal');}
    else if(portalPublic){const back=portalPublic.querySelector('.portal-back');back?.before(button)||portalPublic.append(button);button.classList.add('db125-in-portal');}
    else if(document.body){document.body.append(button);button.classList.add('db125-fixed');}
  }
  function ensureButton(){
    queued=false;
    const existing=document.querySelector('[data-dropbeat-color-mode]');
    if(existing){updateButton(existing,root.dataset.colorMode||preferredMode());return;}
    if(!document.body)return;
    mount(makeButton());
  }
  function queueEnsure(){if(queued)return;queued=true;queueMicrotask(ensureButton);}
  function install(){
    ensureButton();
    if(observer)return;
    observer=new MutationObserver(queueEnsure);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  sync(root.dataset.colorMode||preferredMode());
  window.addEventListener('dropbeat:color-mode',event=>sync(event.detail?.mode||root.dataset.colorMode||preferredMode()));
  if(!hasLegacyRuntime)system?.addEventListener?.('change',event=>{if(!savedMode())applyMode(event.matches?'dark':'light');});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
