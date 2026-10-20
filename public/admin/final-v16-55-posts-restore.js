/* V16.55 — restore and retain the existing Posts workspace under Social Media.
   Existing V16.48 Posts API, scheduling, publishing, capability and Google Drive logic is preserved. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;

  function restorePostsNav(){
    const nav=$('.side .nav');
    if(!nav)return null;
    const article=$('[data-tab="blogs"]',nav);
    const dms=$('[data-tab="socialDMs"]',nav);
    const comments=$('[data-tab="blogComments"]',nav);
    if(!article)return null;

    let posts=$('[data-tab="socialPosts"]',nav);
    if(!posts){
      posts=document.createElement('button');
      posts.type='button';
      posts.dataset.tab='socialPosts';
      posts.textContent='Posts';
    }
    posts.classList.add('nav-subitem');
    posts.classList.remove('uc53-merged-nav-item');
    posts.removeAttribute('aria-hidden');
    posts.tabIndex=0;
    posts.onclick=()=>window.tab?.('socialPosts');

    const box=article.closest('.nav-group-items')||article.parentElement;
    if(box&&posts.parentElement!==box)box.appendChild(posts);
    if(article.nextElementSibling!==posts)article.insertAdjacentElement('afterend',posts);
    if(dms){if(posts.nextElementSibling!==dms)posts.insertAdjacentElement('afterend',dms);if(comments&&dms.nextElementSibling!==comments)dms.insertAdjacentElement('afterend',comments);}else if(comments&&posts.nextElementSibling!==comments)posts.insertAdjacentElement('afterend',comments);
    return posts;
  }

  function ensurePostsPanelBeforeRoute(){
    if($('#socialPosts'))return;
    // V16.48's loader synchronously creates the Posts panel before its first await.
    // Calling it here therefore guarantees the base router has a panel to activate on the very first click.
    try{window.load_socialPosts?.(false);}catch(_){/* the existing loader renders its own errors */}
  }

  function installGuard(){
    if(typeof window.tab!=='function'||window.tab.__uc55PostsGuard)return;
    const old=window.tab;
    const guarded=function(id){
      if(id==='socialPosts'){
        restorePostsNav();
        ensurePostsPanelBeforeRoute();
        return old.apply(this,arguments);
      }
      return old.apply(this,arguments);
    };
    guarded.__uc55PostsGuard=true;
    guarded.__uc55Old=old;
    window.tab=guarded;
  }

  function init(){restorePostsNav();installGuard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  // Older navigation compatibility layers finish after page startup. Reassert once after them,
  // without using a permanent observer or repeated rendering loop.
  setTimeout(init,1400);
  setTimeout(restorePostsNav,4300);
})();
