/* V16.60 — realtime Inbox/Comments follow-up.
   Additive: keeps V16.56/V16.59 rendering, sending, colors and existing storage logic intact. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const NOTIFY_KEY='uc_admin_notifications_enabled', DM_SEEN_KEY='uc_admin_dm_seen_v1659', SUB_KEY='uc60_meta_realtime_subscription_checked_at';
  const apiJson=async(path,options={})=>{
    if(typeof window.api==='function')return window.api(path,options);
    const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed with HTTP ${r.status}.`);return d;
  };
  const supportsNotifications=()=>('Notification'in window)&&('serviceWorker'in navigator)&&window.isSecureContext;
  const notificationsOn=()=>supportsNotifications()&&Notification.permission==='granted'&&localStorage.getItem(NOTIFY_KEY)==='1';
  const platformLabel=k=>({facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',x:'X / Twitter'}[k]||String(k||'Social'));

  async function serviceWorker(){if(!supportsNotifications())return null;try{await navigator.serviceWorker.register('/uc-notifications-sw.js?v=16.61',{scope:'/'});return navigator.serviceWorker.ready;}catch{return null;}}
  async function setNotifications(enable){
    if(!supportsNotifications()){window.ucAdminToast?.('Secure browser notifications are not supported here.','error');syncNotificationToggles();return;}
    if(enable){let permission=Notification.permission;if(permission!=='granted')permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem(NOTIFY_KEY,'1');await serviceWorker();window.ucAdminToast?.('Admin notifications are enabled. New supported comments and Inbox messages will alert this browser.','success');}else{localStorage.setItem(NOTIFY_KEY,'0');window.ucAdminToast?.('Notifications are blocked. Allow Notifications for this IronPulse Gym website in the browser site settings, then enable the switch again.','error');}}
    else{localStorage.setItem(NOTIFY_KEY,'0');window.ucAdminToast?.('Admin notifications are disabled for this browser.','success');}
    syncNotificationToggles();
  }
  function notificationState(){if(!supportsNotifications())return'Not supported in this browser';if(Notification.permission==='denied')return'Blocked in browser site settings';return notificationsOn()?'Admin notifications are ON for this browser.':'Admin notifications are OFF for this browser.';}
  function ensureInboxNotificationToggle(){
    const top=$('#socialDMs')?.querySelector(':scope>.top');if(!top)return;
    let wrap=$('#uc60InboxNotifyControl',top);if(!wrap){
      wrap=document.createElement('div');wrap.id='uc60InboxNotifyControl';wrap.className='uc-v1612-notify-control uc60-inbox-notify-control';
      wrap.innerHTML=`<label class="uc-v1618-notify-toggle"><strong>Enable admin notifications</strong><span class="switch"><input id="uc60InboxNotify" type="checkbox"><span class="slider"></span></span></label><span class="uc-v1612-notify-state"></span>`;
      const refresh=Array.from(top.children).find(x=>x.tagName==='BUTTON'&&/refresh/i.test(x.textContent||''));if(refresh)top.insertBefore(wrap,refresh);else top.appendChild(wrap);
      $('#uc60InboxNotify',wrap)?.addEventListener('change',e=>setNotifications(!!e.currentTarget.checked));
    }
    const old=$('#uc59InboxNotifications',top);if(old)old.classList.add('uc60-hide-old-notification-button');
    syncNotificationToggles();
  }
  function syncNotificationToggles(){
    const on=notificationsOn(),input=$('#uc60InboxNotify'),comments=$('#ucV1612EnableNotify'),state=$('#uc60InboxNotifyControl .uc-v1612-notify-state');
    if(input&&input.checked!==on)input.checked=on;if(comments&&comments.checked!==on)comments.checked=on;if(state){const text=notificationState();if(state.textContent!==text)state.textContent=text;}
  }

  function patchArticlesLabel(){
    $$('#blogComments button,.tabs button,.pills button').forEach(b=>{if(/^Fitness Tip Fitness Tips$/i.test((b.textContent||'').trim()))b.textContent='Fitness Tips';});
  }

  function syncEmojiOpenClass(){const picker=$('#uc56EmojiRow'),shell=picker?.closest('.uc56-dm-shell');if(shell)shell.classList.toggle('uc60-emoji-open',!picker.hidden);}
  function wrapEmojiToggle(){
    const old=window.ucV1656ToggleEmoji;if(typeof old!=='function'||old.__uc60)return;
    const fn=function(){const r=old.apply(this,arguments);requestAnimationFrame(syncEmojiOpenClass);return r;};fn.__uc60=true;fn.__uc60Old=old;window.ucV1656ToggleEmoji=fn;
  }

  let localLoader=null,remoteBusy=false;
  function clearTransientInboxStatus(){const box=$('#uc56DmMsg');if(!box)return;const t=(box.textContent||'').trim();if(/^Loading Inbox/i.test(t)||/^Inbox is up to date/i.test(t)||/^Synchronizing supported social inboxes/i.test(t))box.innerHTML='';}
  function installLocalFirstInbox(){
    const old=window.load_socialDMs;if(typeof old!=='function'||old.__uc60||old.__uc61)return;
    const loader=async()=>{const d=window.UCV1656?.dms;if(d)d.loadedOnce=true;const r=await old(false);clearTransientInboxStatus();ensureInboxNotificationToggle();wrapEmojiToggle();syncEmojiOpenClass();return r;};
    localLoader=loader;
    const fn=async function(force=false){const d=window.UCV1656?.dms,first=!d?.loadedOnce;const r=await loader();if(first){setTimeout(()=>ensureRealtimeSubscriptions(),100);setTimeout(()=>refreshRemoteInBackground(false),700);}if(force)setTimeout(()=>refreshRemoteInBackground(true),20);return r;};
    fn.__uc60=true;fn.__uc59=true;fn.__uc60Old=old;window.load_socialDMs=fn;
  }
  async function refreshRemoteInBackground(manual=false){
    if(remoteBusy||!navigator.onLine||(!manual&&(document.hidden||(!$('#socialDMs')?.classList.contains('active')&&!notificationsOn()))))return;remoteBusy=true;const box=$('#uc56DmMsg');
    try{
      if(manual&&box)box.innerHTML='<div class="notice">Checking connected social inboxes for new messages…</div>';
      const r=await apiJson('/api/admin/social-dms',{method:'POST',body:JSON.stringify({action:'refresh'})});
      if(manual)await localLoader?.();
      if(manual&&box){const failed=(r.results||[]).filter(x=>!x.ok);box.innerHTML=failed.length?`<div class="notice">Inbox updated. ${failed.length} connected platform${failed.length===1?'':'s'} could not complete the fallback history check, but realtime webhooks and saved Inbox messages remain active.</div>`:'<div class="notice">Inbox updated.</div>';setTimeout(()=>{if((box.textContent||'').startsWith('Inbox updated'))box.innerHTML='';},2600);}
    }catch(e){if(manual&&box)box.innerHTML=`<div class="error">${String(e?.message||'Inbox refresh could not be completed.').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</div>`;}
    finally{remoteBusy=false;}
  }

  async function ensureRealtimeSubscriptions(){
    if(!navigator.onLine||document.hidden||!$('#socialDMs')?.classList.contains('active'))return;
    const last=Number(sessionStorage.getItem(SUB_KEY)||0);if(last&&Date.now()-last<30*60*1000)return;
    sessionStorage.setItem(SUB_KEY,String(Date.now()));
    try{
      const d=await apiJson('/api/admin/social-dms?mode=capabilities'),platforms=d.capabilities?.platforms||[];
      for(const key of ['instagram','facebook']){
        const p=platforms.find(x=>x.key===key);if(!p?.connected||p?.realtime?.messagesSubscribed===true)continue;
        try{await apiJson('/api/admin/social-platform-action',{method:'POST',body:JSON.stringify({platform:key,action:'subscribe_webhook'})});}catch{/* manual Integrations diagnostics remain available if Meta refuses a permission */}
      }
    }catch{}
  }

  function seenMap(){try{const v=JSON.parse(localStorage.getItem(DM_SEEN_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
  function saveSeen(v){try{localStorage.setItem(DM_SEEN_KEY,JSON.stringify(v));}catch{}}
  async function notifyDm(c){
    if(window.DropBeatNotificationRules&&!await window.DropBeatNotificationRules.foregroundAllowedFresh('new_message'))return;if(!notificationsOn())return;const reg=await serviceWorker();if(!reg)return;
    const platform=String(c.platform||''),conversation=String(c.id||''),mid=String(c.last_message_id||Date.now()),who=c.participant_name||c.participant_username||'Someone',preview=String(c.last_message_text||'New message').slice(0,140),url=`/admin/?open=inbox&platform=${encodeURIComponent(platform)}&conversation=${encodeURIComponent(conversation)}`;
    await reg.showNotification(`New ${platformLabel(platform)} message`,{body:`${who}: ${preview}`,icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:`uc-admin-dm:${platform}:${mid}`,renotify:true,data:{url,route:'inbox',platform,conversation,message:mid}});
  }
  function updateInboxBadgeCount(value){const b=$('[data-tab="socialDMs"] .nav-badge'),n=Math.max(0,Number(value||0));if(!b)return;b.textContent=n>99?'99+':String(n||'');b.hidden=!n;}
  function updateInboxBadge(rows){updateInboxBadgeCount((rows||[]).reduce((s,c)=>s+Number(c.unread_count||0),0));}
  let fastBusy=false,fastInitialized=false,lastSignature='',dmRevision=null;
  async function loadInboxSnapshot({notifyChanges=false}={}){
    const data=await apiJson('/api/admin/social-dms?capabilities=0'),rows=data.conversations||[],seen=seenMap(),hadStored=Object.keys(seen).length>0,fresh=[];
    if(window.UCV1656?.dms)window.UCV1656.dms.conversations=rows;
    for(const c of rows){const id=String(c.id||''),mid=String(c.last_message_id||'');if(!id||!mid)continue;const prior=seen[id]||'';if(notifyChanges&&(fastInitialized||hadStored)&&prior!==mid&&String(c.last_direction||'')==='inbound')fresh.push(c);seen[id]=mid;}
    saveSeen(seen);fastInitialized=true;updateInboxBadge(rows);
    for(const c of fresh)await notifyDm(c);
    const signature=rows.map(c=>`${c.id}:${c.last_message_id}:${c.unread_count}`).join('|'),changed=signature!==lastSignature;lastSignature=signature;
    if(changed&&$('#socialDMs')?.classList.contains('active')){const active=Number(window.UCV1656?.dms?.active||0),activeChanged=fresh.some(c=>Number(c.id)===active);await localLoader?.();if(active&&activeChanged)await window.ucV1656OpenDm?.(active);}
  }
  async function fastInboxPoll(){
    if(fastBusy||!navigator.onLine||document.hidden)return;fastBusy=true;
    try{
      const activity=await apiJson('/api/admin/activity?scope=dm'),revision=Number(activity.revision||0);updateInboxBadgeCount(activity.unreadCount);
      if(dmRevision===null){dmRevision=revision;await loadInboxSnapshot({notifyChanges:false});return;}
      if(revision===dmRevision)return;
      dmRevision=revision;await loadInboxSnapshot({notifyChanges:true});
    }catch{}finally{fastBusy=false;}
  }

  let fastTimer=0,remoteTimer=0,subscriptionTimer=0;
  function install(){
    installLocalFirstInbox();wrapEmojiToggle();ensureInboxNotificationToggle();patchArticlesLabel();serviceWorker();ensureRealtimeSubscriptions();
    clearInterval(fastTimer);fastTimer=setInterval(fastInboxPoll,60000);setTimeout(fastInboxPoll,700);
    clearInterval(remoteTimer);remoteTimer=setInterval(()=>refreshRemoteInBackground(false),15*60*1000);setTimeout(()=>refreshRemoteInBackground(false),15000);
    clearInterval(subscriptionTimer);subscriptionTimer=setInterval(ensureRealtimeSubscriptions,30*60*1000);
    const inbox=$('#socialDMs');if(inbox&&!inbox.__uc60Observer){const obs=new MutationObserver(()=>{ensureInboxNotificationToggle();wrapEmojiToggle();syncEmojiOpenClass();});obs.observe(inbox,{childList:true,subtree:true});inbox.__uc60Observer=obs;}
    const comments=$('#blogComments');if(comments&&!comments.__uc60Observer){const obs=new MutationObserver(patchArticlesLabel);obs.observe(comments,{childList:true,subtree:true});comments.__uc60Observer=obs;}
  }
  document.addEventListener('pointerdown',()=>setTimeout(syncEmojiOpenClass,0));
  document.addEventListener('change',e=>{if(e.target?.id==='ucV1612EnableNotify'){setTimeout(syncNotificationToggles,80);}});
  window.addEventListener('storage',e=>{if(e.key===NOTIFY_KEY)syncNotificationToggles();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){syncNotificationToggles();fastInboxPoll();ensureRealtimeSubscriptions();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1250),{once:true});else setTimeout(install,1250);
  setTimeout(()=>{installLocalFirstInbox();wrapEmojiToggle();ensureInboxNotificationToggle();patchArticlesLabel();},2800);
})();
