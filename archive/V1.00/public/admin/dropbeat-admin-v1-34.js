/* DropBeat V1.34 — event-driven Admin mobile shell.
   Deliberately contains no DOM observer, timer, network request or business logic. */
(()=>{
  'use strict';
  const BUILD='dropbeat-1.34-20261012';
  document.documentElement.dataset.dropbeatRelease=BUILD;
  window.__DROPBEAT_UI_BUILD__=BUILD;

  function install(){
    const app=document.getElementById('adminApp');
    const side=document.getElementById('adminSidebar')||app?.querySelector('.side');
    const menu=app?.querySelector('[data-db134-mobile-menu]');
    const backdrop=app?.querySelector('[data-db134-mobile-backdrop]');
    if(!app||!side||!menu||!backdrop||menu.dataset.db134Bound==='1')return;
    menu.dataset.db134Bound='1';

    const setOpen=open=>{
      document.body.classList.toggle('db134-nav-open',Boolean(open));
      menu.setAttribute('aria-expanded',String(Boolean(open)));
    };
    menu.addEventListener('click',()=>setOpen(!document.body.classList.contains('db134-nav-open')));
    backdrop.addEventListener('click',()=>setOpen(false));
    side.addEventListener('click',event=>{
      if(event.target.closest('button[data-tab],.nav-subitem'))setOpen(false);
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);});
    window.matchMedia('(min-width:981px)').addEventListener?.('change',event=>{if(event.matches)setOpen(false);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
