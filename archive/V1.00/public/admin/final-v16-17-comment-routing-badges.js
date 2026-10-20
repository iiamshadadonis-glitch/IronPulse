/* V16.18 unified comment badges + exact notification deep-link routing. */
(function(){'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null,$$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const apiJson=(path,options={})=>window.api?window.api(path,options):fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed with HTTP ${r.status}.`);return d;});
  let routing=false,lastSummary=null,lastRouteKey='';
  function ensureStatusTabs(){
    const tabs=$('#blogComments .uc-v154-comment-controls .tabs');if(!tabs)return;
    const make=(key,label,before)=>{let b=$(`[data-comment-status="${key}"]`,tabs);if(!b){b=document.createElement('button');b.type='button';b.className='pill';b.dataset.commentStatus=key;b.textContent=label;const ref=$(`[data-comment-status="${before}"]`,tabs);tabs.insertBefore(b,ref||null);}b.onclick=()=>window.ucV1611CommentFilter?.(key);};
    make('in_progress','In Progress','responded');make('hidden','Hidden','resolved');make('spam','Spam','resolved');
    const social=(window.__ucV1611CommentPlatform||'website')!=='website';for(const k of ['hidden','spam']){const b=$(`[data-comment-status="${k}"]`,tabs);if(b)b.hidden=!social;}
  }
  function navBadge(total){const b=$('button[data-tab="blogComments"]');if(!b)return;let badge=$('.uc-v1617-nav-badge',b);if(!badge){badge=document.createElement('span');badge.className='uc-v1617-nav-badge';b.appendChild(badge);}badge.textContent=total>0?String(total):'';badge.hidden=!(total>0);}
  function platformBadges(by={}){for(const b of $$('#blogComments .uc-v1611-platform-tab')){const key=b.dataset.platform||'',n=Number(by[key]||0);let x=$('.uc-v1617-platform-badge',b);if(n>0){if(!x){x=document.createElement('small');x.className='uc-v1617-platform-badge';b.appendChild(x);}x.textContent=String(n);x.hidden=false;}else if(x)x.hidden=true;}}
  window.ucV1617ApplyCommentSummary=function(r={}){lastSummary=r;const total=Number(r.pendingTotal||0),by=r.pendingByPlatform||{};window.__ucV1617PendingByPlatform=by;navBadge(total);platformBadges(by);const stat=$('#statBlogComments');if(stat)stat.textContent=String(total);const card=stat?.closest('.card,button');if(card){const small=card.querySelector('small');if(small)small.textContent='Pending comments across enabled platforms';}};
  window.ucV1617RefreshCommentSummary=async function(){try{const r=await apiJson('/api/admin/social-comments?summary_all=1');window.ucV1617ApplyCommentSummary(r);return r;}catch{return lastSummary;}};
  async function waitReady(timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(typeof window.tab==='function'&&typeof window.loadUCV1611Comments==='function'&&$('#blogComments'))return true;await new Promise(r=>setTimeout(r,120));}return false;}
  async function resolveRoute(platform,status,comment){
    if(platform)return{platform,status:status||'new',comment:comment||''};
    // Backward compatibility for an older generic notification: choose the newest
    // pending comment across enabled platforms instead of dumping the admin on Dashboard.
    try{
      const summary=await apiJson('/api/admin/social-comments?summary_all=1'),candidates=[];
      const keys=(summary.platforms||[]).filter(p=>p.available!==false&&Number(summary.pendingByPlatform?.[p.key]||0)>0).map(p=>p.key);
      for(const key of keys){try{const r=key==='website'?await apiJson('/api/admin/blog-comments?status=new'):await apiJson(`/api/admin/social-comments?platform=${encodeURIComponent(key)}&status=new&sync=0`);for(const x of (r.comments||[]).slice(0,3))candidates.push({platform:key,status:'new',comment:String(x.id||''),when:Date.parse(x.remote_created_at||x.created_at||'')||0});}catch{}}
      candidates.sort((a,b)=>b.when-a.when);if(candidates[0])return candidates[0];
    }catch{}
    return{platform:'website',status:'new',comment:''};
  }
  window.ucV1617OpenCommentRoute=async function(platform='website',status='new',comment=''){
    if(routing)return false;routing=true;
    try{
      if(!await waitReady())return false;
      const resolved=await resolveRoute(platform,status,comment),wanted=String(resolved.platform||'website');
      window.tab('blogComments');await new Promise(r=>setTimeout(r,180));
      let summary;try{summary=await apiJson('/api/admin/social-comments?summary_all=1');window.__ucV1611Platforms=summary.platforms||window.__ucV1611Platforms||[];window.ucV1617ApplyCommentSummary(summary);}catch{}
      const list=window.__ucV1611Platforms||[];window.__ucV1611CommentPlatform=list.some(p=>p.key===wanted&&p.available!==false)?wanted:'website';
      const allowed=['new','in_progress','responded','hidden','spam','resolved','all'];window.__ucV1611CommentStatus=allowed.includes(String(resolved.status))?String(resolved.status):'new';if(window.__ucV1611CommentPlatform==='website'&&['hidden','spam'].includes(window.__ucV1611CommentStatus))window.__ucV1611CommentStatus='new';
      ensureStatusTabs();await window.loadUCV1611Comments({sync:true});ensureStatusTabs();
      // If a status changed between notification delivery and click, search All so
      // the exact item still opens instead of appearing to be missing.
      const id=Number(resolved.comment||0);let row=id?document.querySelector(`[data-comment-id="${id}"]`):null;
      if(id&&!row){window.__ucV1611CommentStatus='all';await window.loadUCV1611Comments({sync:false});row=document.querySelector(`[data-comment-id="${id}"]`);}
      if(row){setTimeout(()=>{row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('uc-v1617-deep-linked');setTimeout(()=>row.classList.remove('uc-v1617-deep-linked'),3000);},100);}
      const canonical=`/admin/?open=comments&platform=${encodeURIComponent(window.__ucV1611CommentPlatform)}&status=${encodeURIComponent(window.__ucV1611CommentStatus)}${id?`&comment=${encodeURIComponent(id)}`:''}`;history.replaceState({},'',canonical);
      return true;
    }finally{routing=false;}
  };
  async function routeFromLocation(force=false){const q=new URLSearchParams(location.search);if(q.get('open')!=='comments')return false;const key=[q.get('platform')||'',q.get('status')||'',q.get('comment')||''].join(':');if(!force&&key&&key===lastRouteKey&&$('#blogComments')?.classList.contains('active'))return true;const ok=await window.ucV1617OpenCommentRoute(q.get('platform')||'',q.get('status')||'new',q.get('comment')||'');if(ok)lastRouteKey=key;return ok;}
  function wrapLoaders(){
    const oldDash=window.load_dashboard;if(typeof oldDash==='function'&&!oldDash.__v1617){const f=async function(){const r=await oldDash.apply(this,arguments);await window.ucV1617RefreshCommentSummary();return r;};f.__v1617=true;window.load_dashboard=f;}
    const oldComments=window.loadUCV1611Comments;if(typeof oldComments==='function'&&!oldComments.__v1617){const f=async function(){const r=await oldComments.apply(this,arguments);ensureStatusTabs();await window.ucV1617RefreshCommentSummary();return r;};f.__v1617=true;window.loadUCV1611Comments=f;}
  }
  if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.type==='uc-comment-route'&&d.url){try{const u=new URL(d.url,location.origin);history.replaceState({},'',u.pathname+u.search);lastRouteKey='';routeFromLocation(true);}catch{}}});
  window.addEventListener('pageshow',()=>setTimeout(()=>routeFromLocation(true),350));
  window.addEventListener('popstate',()=>setTimeout(()=>routeFromLocation(true),50));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){window.ucV1617RefreshCommentSummary();setTimeout(()=>routeFromLocation(false),100);}});
  let summaryRevision=null,summaryPollBusy=false;
  async function pollSummaryRevision(){if(summaryPollBusy||document.hidden||!navigator.onLine)return;summaryPollBusy=true;try{const a=await apiJson('/api/admin/activity?scope=comments'),rev=Number(a.revision||0);if(summaryRevision===null){summaryRevision=rev;return;}if(rev===summaryRevision)return;summaryRevision=rev;await window.ucV1617RefreshCommentSummary();}catch{}finally{summaryPollBusy=false;}}
  const init=()=>{wrapLoaders();ensureStatusTabs();window.ucV1617RefreshCommentSummary();setTimeout(wrapLoaders,900);for(const ms of [300,900,1800,3200])setTimeout(()=>routeFromLocation(false),ms);setInterval(()=>{if(!document.hidden)pollSummaryRevision();},60000);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));else setTimeout(init,200);
})();
