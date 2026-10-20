/* V16.59 diagnostics + shared opt-in admin browser notification helper. */
(function(){'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed with HTTP ${r.status}.`);return d;});
  const supports=()=>('Notification'in window)&&('serviceWorker'in navigator)&&window.isSecureContext;
  const preferenceOn=()=>localStorage.getItem('uc_admin_notifications_enabled')==='1';
  const enabled=()=>supports()&&Notification.permission==='granted'&&preferenceOn();
  async function sw(){if(!supports())return null;try{await navigator.serviceWorker.register('/uc-notifications-sw.js?v=16.59',{scope:'/'});return navigator.serviceWorker.ready;}catch{return null;}}
  async function notify(title,body,url='/admin/',meta={}){
    if(window.DropBeatNotificationRules&&!await window.DropBeatNotificationRules.foregroundAllowedFresh('new_comment'))return;if(!enabled())return;const reg=await sw();if(!reg)return;
    const platform=String(meta.platform||''),comment=String(meta.comment||''),status=String(meta.status||'new');
    await reg.showNotification(title,{body,icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:`uc-admin-comment:${platform||'general'}:${comment||Date.now()}`,renotify:true,data:{url,platform,status,comment}});
  }
  function stateText(){
    if(!supports())return'Browser notifications are not supported in this browser/context.';
    if(Notification.permission==='denied')return'Notifications are blocked in this browser’s site settings.';
    if(enabled())return'Admin notifications are ON for this browser.';
    if(Notification.permission==='granted')return'Browser permission is allowed, but admin notifications are OFF here.';
    return'Admin notifications are OFF until you enable them.';
  }
  function syncControl(d){const input=$('#ucV1612EnableNotify',d),state=$('.uc-v1612-notify-state',d);if(input)input.checked=enabled();if(state)state.textContent=stateText();}
  function addControl(){
    const panel=$('#blogComments');if(!panel)return;const top=panel.querySelector(':scope>.top')||panel.querySelector('.top');if(!top)return;
    let d=$('#ucV1612NotifyControl',top);
    if(!d){d=document.createElement('div');d.id='ucV1612NotifyControl';d.className='uc-v1612-notify-control';d.innerHTML=`<label class="uc-v1618-notify-toggle"><strong>Enable admin notifications</strong><span class="switch"><input id="ucV1612EnableNotify" type="checkbox"><span class="slider"></span></span></label><span class="uc-v1612-notify-state">${H(stateText())}</span>`;top.appendChild(d);
      $('#ucV1612EnableNotify',d).addEventListener('change',async e=>{
        if(!supports()){e.currentTarget.checked=false;window.ucAdminToast?.('This browser does not support secure website notifications.','error');syncControl(d);return;}
        if(e.currentTarget.checked){
          let permission=Notification.permission;if(permission!=='granted')permission=await Notification.requestPermission();
          if(permission==='granted'){
            localStorage.setItem('uc_admin_notifications_enabled','1');await sw();syncControl(d);
            window.ucAdminToast?.('Admin notifications are enabled for this browser. Comment and supported Inbox alerts will open the matching item.','success');
          }else{localStorage.setItem('uc_admin_notifications_enabled','0');e.currentTarget.checked=false;syncControl(d);if(permission==='denied')window.ucAdminToast?.('Browser notifications are blocked. Allow Notifications for this DropBeat Dance Studio website in the browser site settings, then enable this switch again.','error');}
        }else{
          localStorage.setItem('uc_admin_notifications_enabled','0');syncControl(d);window.ucAdminToast?.('Admin notifications are disabled for this browser. Browser permission has not been changed.','success');
        }
      });
    }
    syncControl(d);
  }
  const seen=new Set();let initialized=false,pollTimer=0,commentRevision=null,pollBusy=false;
  async function scanNewComments(notifyChanges=false){
    let platforms=['website'];try{const p=await apiJson('/api/admin/social-comments');platforms=(p.platforms||[]).filter(x=>x.available!==false).map(x=>x.key);}catch{}
    const newItems=[];
    for(const platform of platforms){try{
      const r=platform==='website'?await apiJson('/api/admin/blog-comments?status=new'):await apiJson(`/api/admin/social-comments?platform=${encodeURIComponent(platform)}&status=new&sync=0`);
      for(const x of r.comments||[]){const k=`${platform}:${x.id}`;if(!seen.has(k)){if(notifyChanges&&initialized)newItems.push({platform,x});seen.add(k);}}
    }catch{}}
    initialized=true;
    for(const item of newItems){
      const platform=item.platform,x=item.x,who=x.commenter_name||x.lead_name||x.name||'Someone',text=x.comment_text||'New comment received',id=String(x.id||'');
      const url=`/admin/?open=comments&platform=${encodeURIComponent(platform)}&status=new&comment=${encodeURIComponent(id)}`;
      const label=platform==='website'?'Article':({facebook:'Facebook',instagram:'Instagram',threads:'Threads',x:'X / Twitter',linkedin:'LinkedIn',pinterest:'Pinterest',google_maps:'Google Maps'}[platform]||platform);
      await notify(`New ${label} comment`,`${who}: ${String(text).slice(0,140)}`,url,{platform,status:'new',comment:id});
    }
  }
  async function poll(){
    if(pollBusy||!enabled()||(document.visibilityState==='hidden'&&!navigator.onLine))return;pollBusy=true;
    try{
      const a=await apiJson('/api/admin/activity?scope=comments'),rev=Number(a.revision||0);
      if(commentRevision===null){commentRevision=rev;await scanNewComments(false);return;}
      if(rev===commentRevision)return;
      commentRevision=rev;await scanNewComments(true);
    }catch{}finally{pollBusy=false;}
  }
  function start(){addControl();sw();clearInterval(pollTimer);pollTimer=setInterval(()=>{if(!document.hidden)poll();},30000);setTimeout(poll,5000);}
  function showSavedDiagnostics(){/* V16.24: action-result banners are intentionally transient and are not replayed when reopening Integrations. */}
  const oldTab=window.tab;if(typeof oldTab==='function'&&!oldTab.__v1612){const wrapped=function(id){const r=oldTab.apply(this,arguments);if(id==='blogComments')setTimeout(()=>{addControl();poll();},150);if(id==='socialMediaIntegrations')setTimeout(showSavedDiagnostics,160);return r;};wrapped.__v1612=true;window.tab=wrapped;}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){addControl();poll();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1100));else setTimeout(start,1100);
})();
