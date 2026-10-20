/* V16.61 — unread Inbox badge reinforcement.
   Additive only: the Inbox renderer/storage remain owned by V16.56/V16.60. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  let scheduled=false;
  function rows(){return Array.isArray(window.UCV1656?.dms?.conversations)?window.UCV1656.dms.conversations:[];}
  function counts(list=rows()){
    const by={all:0};for(const c of list){const n=Math.max(0,Number(c?.unread_count||0)),k=String(c?.platform||'');by.all+=n;if(k)by[k]=(by[k]||0)+n;}return by;
  }
  function sync(){
    scheduled=false;const by=counts(),nav=$('.side .nav [data-tab="socialDMs"]');
    if(nav){let b=$('.nav-badge',nav);if(!b){b=document.createElement('span');b.className='nav-badge uc53-notification-badge';nav.appendChild(b);}b.classList.add('uc53-notification-badge','uc61-inbox-nav-badge');const n=Number(by.all||0),text=n>99?'99+':String(n||'');if(b.textContent!==text)b.textContent=text;b.hidden=!n;}
    for(const tab of $$('#uc57InboxTabs [data-uc57-platform]')){const k=tab.dataset.uc57Platform||'all',n=Number(by[k]||0);let b=$('.uc61-inbox-platform-badge',tab);if(n>0){if(!b){b=document.createElement('small');b.className='uc61-inbox-platform-badge';tab.appendChild(b);}const text=n>99?'99+':String(n);if(b.textContent!==text)b.textContent=text;b.hidden=false;}else if(b)b.hidden=true;}
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync);}
  function install(){sync();const nav=$('.side .nav'),inbox=$('#socialDMs');if(nav&&!nav.__uc61InboxBadgeObserver){const o=new MutationObserver(schedule);o.observe(nav,{childList:true,subtree:true});nav.__uc61InboxBadgeObserver=o;}if(inbox&&!inbox.__uc61InboxBadgeObserver){const o=new MutationObserver(schedule);o.observe(inbox,{childList:true,subtree:true});inbox.__uc61InboxBadgeObserver=o;}setInterval(()=>{if(!document.hidden)sync();},15000);}
  window.ucV1661SyncInboxBadges=sync;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1500),{once:true});else setTimeout(install,1500);
})();
