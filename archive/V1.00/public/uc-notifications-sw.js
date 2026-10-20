/* V16.61 notification click routing for Comments + Social Inbox. */
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const data=event.notification?.data||{},route=String(data.route||'');
  let relative=data.url||'';
  if(!relative&&route==='inbox')relative=`/admin/?open=inbox${data.platform?`&platform=${encodeURIComponent(data.platform)}`:''}${data.conversation?`&conversation=${encodeURIComponent(data.conversation)}`:''}`;
  if(!relative&&data.platform)relative=`/admin/?open=comments&platform=${encodeURIComponent(data.platform)}&status=${encodeURIComponent(data.status||'new')}${data.comment?`&comment=${encodeURIComponent(data.comment)}`:''}`;
  if(!relative)relative=route==='inbox'?'/admin/?open=inbox':'/admin/?open=comments';
  let full;try{const target=new URL(relative,self.location.origin);if(target.origin!==self.location.origin)return;full=target.href;}catch{return;}
  const message=data.ownerKey?{type:'dropbeat-notification-route',url:full}:route==='inbox'
    ?{type:'uc-admin-route',route:'inbox',url:full,platform:data.platform||'',conversation:data.conversation||'',message:data.message||''}
    :{type:'uc-comment-route',url:full,platform:data.platform||'',status:data.status||'new',comment:data.comment||''};
  event.waitUntil((async()=>{
    const all=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of all){
      try{
        if(new URL(client.url).origin!==self.location.origin)continue;
        let target=client;if('navigate'in client)target=await client.navigate(full)||client;await target.focus();try{target.postMessage(message);}catch{}return;
      }catch{}
    }
    const opened=await clients.openWindow(full);try{opened?.postMessage(message);}catch{}
  })());
});

// V1.58 real Web Push. Recheck account/rules before exposing any private alert.
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let payload;try{payload=event.data?.json();}catch{return;}if(!payload?.ownerKey||!['admin','student','coach'].includes(payload.role))return;
 try{const response=await fetch('/api/portal/notifications/preferences?role='+payload.role,{credentials:'include',cache:'no-store'});if(!response.ok)return;const current=await response.json();if(current.key!==payload.ownerKey||(!payload.manual&&current.rules?.[payload.event]===false))return;const target=new URL(payload.url||'/',self.location.origin);if(target.origin!==self.location.origin)return;await self.registration.showNotification(String(payload.title||'Dashboard update').slice(0,160),{body:String(payload.body||'').slice(0,500),icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:String(payload.tag||'dashboard-update'),renotify:false,data:{url:target.pathname+target.search+target.hash,ownerKey:payload.ownerKey}});}catch{}
})()));
