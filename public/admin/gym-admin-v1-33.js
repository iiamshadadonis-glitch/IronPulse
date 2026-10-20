/* DropBeat V1.33 — presentation-only mobile Admin shell and release marker. */
(()=>{
  'use strict';
  const BUILD='dropbeat-1.33-20261012';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;

  document.documentElement.dataset.dropbeatRelease=BUILD;
  window.__DROPBEAT_UI_BUILD__=BUILD;

  function currentTitle(){
    const panel=$('#adminApp .panel.active');
    return $('h1',panel)?.textContent?.trim()||'Admin Dashboard';
  }

  function menuButton(){return $('[data-db133-mobile-menu],[data-db132-mobile-menu]');}
  function titleNode(){return $('[data-db133-mobile-title],[data-db132-mobile-title]');}

  function closeNav(){
    document.body.classList.remove('db133-nav-open','db132-nav-open');
    menuButton()?.setAttribute('aria-expanded','false');
  }

  function toggleNav(){
    const open=!document.body.classList.contains('db133-nav-open');
    document.body.classList.toggle('db133-nav-open',open);
    document.body.classList.toggle('db132-nav-open',open);
    menuButton()?.setAttribute('aria-expanded',String(open));
  }

  function syncShell(){
    const app=$('#adminApp');
    const bar=$('.db133-mobile-bar,.db132-mobile-bar');
    if(!app||!bar)return;
    const visible=!app.hasAttribute('hidden');
    bar.hidden=!visible;
    if(!visible)closeNav();
    const title=titleNode();
    if(title)title.textContent=currentTitle();
  }

  function normalizeBar(bar){
    bar.classList.add('db132-mobile-bar','db133-mobile-bar');
    const button=$('[data-db133-mobile-menu],[data-db132-mobile-menu]',bar);
    const title=$('[data-db133-mobile-title],[data-db132-mobile-title]',bar);
    const home=$('.db133-mobile-home,.db132-mobile-home',bar);
    if(button){
      button.classList.add('db132-mobile-menu','db133-mobile-menu');
      button.dataset.db132MobileMenu='';
      button.dataset.db133MobileMenu='';
    }
    if(title){
      title.classList.add('db132-mobile-title','db133-mobile-title');
      title.dataset.db132MobileTitle='';
      title.dataset.db133MobileTitle='';
    }
    if(home)home.classList.add('db132-mobile-home','db133-mobile-home');
  }

  function install(){
    const app=$('#adminApp');
    if(!app)return;
    document.body.classList.add('db132-admin-mobile','db133-admin-mobile');

    let bar=$('.db133-mobile-bar,.db132-mobile-bar');
    const existingBar=Boolean(bar);
    if(!bar){
      bar=document.createElement('header');
      bar.className='db132-mobile-bar db133-mobile-bar';
      bar.setAttribute('aria-label','Admin mobile navigation');
      bar.innerHTML='<button class="db132-mobile-menu db133-mobile-menu" type="button" data-db132-mobile-menu data-db133-mobile-menu aria-label="Open admin menu" aria-controls="adminApp" aria-expanded="false">☰</button><span class="db132-mobile-title db133-mobile-title" data-db132-mobile-title data-db133-mobile-title>Admin Dashboard</span><a class="db132-mobile-home db133-mobile-home" href="/" aria-label="Visit website">⌂</a>';
      document.body.insertBefore(bar,app);
    }
    normalizeBar(bar);

    let backdrop=$('.db133-mobile-backdrop,.db132-mobile-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='db132-mobile-backdrop db133-mobile-backdrop';
      backdrop.setAttribute('aria-label','Close admin menu');
      document.body.appendChild(backdrop);
    }else backdrop.classList.add('db132-mobile-backdrop','db133-mobile-backdrop');

    /* If V1.32 already created the bar, its listeners remain authoritative.
       Otherwise V1.33 owns them. This prevents a double-toggle. */
    if(!existingBar){
      menuButton()?.addEventListener('click',toggleNav);
      backdrop.addEventListener('click',closeNav);
      app.querySelector('.side')?.addEventListener('click',event=>{
        if(event.target.closest('button[data-tab],.nav-subitem')){
          closeNav();
          requestAnimationFrame(syncShell);
        }
      });
      document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});
    }

    new MutationObserver(syncShell).observe(app,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
    syncShell();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
