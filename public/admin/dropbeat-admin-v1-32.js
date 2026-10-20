/* DropBeat V1.32 — presentation-only mobile admin shell. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;

  function currentTitle(){
    const panel=$('#adminApp .panel.active');
    return $('h1',panel)?.textContent?.trim()||'Admin Dashboard';
  }

  function syncTitle(){
    const title=$('[data-db132-mobile-title]');
    if(title)title.textContent=currentTitle();
  }

  function syncShell(){
    const app=$('#adminApp'),bar=$('.db132-mobile-bar');
    if(!app||!bar)return;
    const visible=!app.hasAttribute('hidden');
    bar.hidden=!visible;
    if(!visible)closeNav();
    syncTitle();
  }

  function closeNav(){
    document.body.classList.remove('db132-nav-open');
    $('[data-db132-mobile-menu]')?.setAttribute('aria-expanded','false');
  }

  function toggleNav(){
    const open=document.body.classList.toggle('db132-nav-open');
    $('[data-db132-mobile-menu]')?.setAttribute('aria-expanded',String(open));
  }

  function install(){
    const app=$('#adminApp');
    if(!app||$('.db132-mobile-bar'))return;
    document.body.classList.add('db132-admin-mobile');

    const bar=document.createElement('header');
    bar.className='db132-mobile-bar';
    bar.setAttribute('aria-label','Admin mobile navigation');
    bar.innerHTML='<button class="db132-mobile-menu" type="button" data-db132-mobile-menu aria-label="Open admin menu" aria-controls="adminApp" aria-expanded="false">☰</button><span class="db132-mobile-title" data-db132-mobile-title>Admin Dashboard</span><a class="db132-mobile-home" href="/" aria-label="Visit website">⌂</a>';
    document.body.insertBefore(bar,app);

    const backdrop=document.createElement('button');
    backdrop.type='button';
    backdrop.className='db132-mobile-backdrop';
    backdrop.setAttribute('aria-label','Close admin menu');
    document.body.appendChild(backdrop);

    $('[data-db132-mobile-menu]',bar).addEventListener('click',toggleNav);
    backdrop.addEventListener('click',closeNav);
    app.querySelector('.side')?.addEventListener('click',event=>{
      if(event.target.closest('button[data-tab],.nav-subitem')){
        closeNav();
        requestAnimationFrame(syncTitle);
      }
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});
    new MutationObserver(syncShell).observe(app,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
    syncShell();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
