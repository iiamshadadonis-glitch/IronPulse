/* IronPulse Gym Admin V1.03
   Presentation/interaction compatibility layer only; existing data and API logic remain authoritative. */
(function(){
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>Array.from(root?.querySelectorAll?.(selector)||[]);
  // V1.04: templates already contain gym copy and the layout store owns menu names.
  // Rewriting their rendered text here competes with the article observer and
  // also changes customer-written titles. Keep only the existing Posts tab fix.

  function selectOnlyPostTab(button){
    if(!button?.matches?.('#socialPosts .uc48-tabs .pill'))return;
    $$('#socialPosts .uc48-tabs .pill').forEach(tab=>{
      const selected=tab===button;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));
    });
  }

  function syncPostTabs(){
    const tabs=$$('#socialPosts .uc48-tabs .pill');if(!tabs.length)return;
    const pollOpen=!!$('#ucV1648PostsWorkspace .uc76-poll-launcher');
    const activeKey=String(window.UCV1648Posts?.tab||'text');
    tabs.forEach(tab=>{
      const selected=pollOpen?tab.hasAttribute('data-uc76-polls-tab'):tab.dataset.uc48Tab===activeKey;
      tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));
    });
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#socialPosts .uc48-tabs .pill');
    if(button)requestAnimationFrame(()=>selectOnlyPostTab(button));
  },true);

  let queued=0;
  function patchAll(){syncPostTabs();}
  function schedulePatch(){clearTimeout(queued);queued=setTimeout(patchAll,0);}
  function init(){patchAll();new MutationObserver(schedulePatch).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
