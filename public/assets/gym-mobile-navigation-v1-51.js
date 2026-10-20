/* V1.51: native mobile navigation. Existing inputs, handlers and API payloads stay authoritative. */
(()=>{
  'use strict';
  if(window.DropBeatNavigation)return;
  const PHONE=matchMedia('(max-width:760px)'),$=(s,r=document)=>r?.querySelector(s),$$=(s,r=document)=>[...(r?.querySelectorAll(s)||[])];
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const svg=path=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const icons={close:'<path d="m6 6 12 12M18 6 6 18"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="13" r="3"/>'};
  const disclosure=()=>window.DropBeatUI.disclosure();
  function row(label,action){const button=document.createElement('button');button.type='button';button.className='db151-navigation-row';const title=document.createElement('span');title.textContent=label;button.append(title);button.insertAdjacentHTML('beforeend',disclosure());button.onclick=action;return button;}
  let overlay=null,restore=null,returnFocus=null;
  function close(){
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;restore?.();restore=null;document.body.classList.remove('db151-overlay-open');
    returnFocus?.focus?.({preventScroll:true});returnFocus=null;
  }
  function sheet({title,mode='sheet',trigger,render,onClose}){
    close();
    if(!overlay){
      overlay=document.createElement('div');overlay.id='db151NavigationOverlay';overlay.hidden=true;
      overlay.innerHTML='<button type="button" class="db151-scrim" aria-label="Close"></button><section class="db151-overlay-card" role="dialog" aria-modal="true" aria-labelledby="db151OverlayTitle"><div class="db151-drag-handle" aria-hidden="true"></div><header class="db151-overlay-head"><h2 id="db151OverlayTitle"></h2><button type="button" class="db151-close" aria-label="Close"></button></header><div class="db151-overlay-body"></div><footer class="db151-overlay-footer" hidden></footer></section>';
      document.body.append(overlay);$('.db151-close',overlay).innerHTML=svg(icons.close);
      $('.db151-close',overlay).onclick=close;$('.db151-scrim',overlay).onclick=close;
      let touch=null;$('.db151-overlay-card',overlay).addEventListener('touchstart',e=>{touch=e.target.closest('.db151-overlay-head,.db151-drag-handle')?e.touches[0].clientY:null;},{passive:true});
      overlay.addEventListener('touchend',e=>{if(touch!==null&&e.changedTouches[0].clientY-touch>65)close();touch=null;},{passive:true});
      overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}else if(e.key==='Tab'){const nodes=$$('button,a[href],input,select,textarea,[tabindex="0"]',overlay).filter(n=>!n.disabled&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
    }
    overlay.className='db151-overlay db151-'+mode;if(portal){const style=getComputedStyle(portal);overlay.style.setProperty('--db151-primary',style.getPropertyValue('--dash-primary')||style.getPropertyValue('--portal-primary')||'var(--dropbeat-primary)');}$('#db151OverlayTitle',overlay).textContent=title;
    const body=$('.db151-overlay-body',overlay),footer=$('.db151-overlay-footer',overlay);body.replaceChildren();footer.replaceChildren();footer.hidden=true;
    restore=onClose;returnFocus=trigger||document.activeElement;render(body,footer);overlay.hidden=false;document.body.classList.add('db151-overlay-open');
    requestAnimationFrame(()=>$('.db151-close',overlay).focus({preventScroll:true}));return overlay;
  }
  function mount(source,title,mode,trigger){
    const marker=document.createComment('Original '+title+' location');source.before(marker);
    sheet({title,mode,trigger,render(body){body.append(source);},onClose(){if(marker.isConnected)marker.replaceWith(source);}});
  }
  function publicMenu(){
    if(!PHONE.matches)return;
    $$('.navlinks .nav-dropdown').forEach(parent=>{
      const link=$(':scope>.nav-top-link',parent);if(!link||$('.db151-menu-disclosure',link))return;
      const wrap=document.createElement('span');wrap.className='db151-menu-disclosure';wrap.innerHTML=disclosure();link.append(wrap);link.setAttribute('aria-haspopup','dialog');
    });
  }
  function openSubmenu(link){
    const children=$$('.nav-dropdown-menu>a',link.parentElement),title=text(link.textContent);if(!children.length)return;
    sheet({title,trigger:link,render(body){
      children.forEach(child=>{const a=document.createElement('a');a.className='db151-navigation-row';a.href=child.href;const label=document.createElement('span');label.textContent=text(child.textContent);a.append(label);a.insertAdjacentHTML('beforeend',disclosure());if(child.classList.contains('active'))a.setAttribute('aria-current','page');a.onclick=()=>{$('.navlinks')?.classList.remove('open');close();};body.append(a);});
    }});
  }
  // Capture before legacy top-level link handlers can route to a first child.
  window.addEventListener('click',event=>{
    if(!PHONE.matches)return;const link=event.target.closest?.('.navlinks .nav-dropdown>.nav-top-link');
    if(link&&$('.nav-dropdown-menu>a',link.parentElement)){event.preventDefault();event.stopImmediatePropagation();openSubmenu(link);}
  },true);
  const portal=$('.portal-app'),student=portal?.dataset.portalRole==='student';
  let quickMarker=null,seenPrep=false,queued=false;
  const modified=new Map();
  function remember(node){if(!modified.has(node))modified.set(node,{html:node.innerHTML,label:node.getAttribute('aria-label')});}
  function labelRow(button,label){
    if(button.dataset.db151Row===label)return;remember(button);button.dataset.db151Row=label;button.classList.add('db151-navigation-row');button.replaceChildren();const span=document.createElement('span');span.textContent=label;button.append(span);button.insertAdjacentHTML('beforeend',disclosure());button.setAttribute('aria-label',label);
  }
  function drawer(){
    if(!portal)return;let backdrop=$(':scope>.db151-drawer-backdrop',portal);
    if(!backdrop){backdrop=document.createElement('button');backdrop.type='button';backdrop.className='db151-drawer-backdrop';backdrop.setAttribute('aria-label','Close navigation menu');portal.prepend(backdrop);backdrop.onclick=()=>portal.classList.remove('nav-open');
      const sidebar=$('.portal-sidebar',portal);let start=null;sidebar?.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});sidebar?.addEventListener('touchend',e=>{if(start&&start[0]-e.changedTouches[0].clientX>65&&Math.abs(start[1]-e.changedTouches[0].clientY)<70)portal.classList.remove('nav-open');start=null;},{passive:true});
      new MutationObserver(()=>{const open=portal.classList.contains('nav-open');$('[data-mobile-nav]')?.setAttribute('aria-expanded',String(open));document.body.classList.toggle('db151-drawer-open',open&&PHONE.matches);}).observe(portal,{attributes:true,attributeFilter:['class']});
    }
  }
  function meetLink(ua=navigator.userAgent){
    if(/android/i.test(ua))return 'intent://meet.google.com/#Intent;scheme=https;package=com.google.android.apps.tachyon;S.browser_fallback_url='+encodeURIComponent('https://play.google.com/store/apps/details?id=com.google.android.apps.tachyon')+';end';
    if(/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return 'https://apps.apple.com/app/google-meet/id1096918571';
    return 'https://meet.google.com/';
  }
  function prep(trigger){
    sheet({title:'Prepare for online sessions',trigger,render(body,footer){
      const p=document.createElement('p');p.textContent='Use Google Meet to join your online classes. Install the app on this device, then use Join Session when your class is available.';body.append(p);
      const link=document.createElement('a');link.href=meetLink();link.className='db151-primary-action';link.textContent='Get Google Meet';
      const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='db151-secondary-action';dismiss.textContent='Dismiss';dismiss.onclick=()=>{
        close();seenPrep=true;const account=window.DropBeatPortalModel?.account;try{sessionStorage.setItem('dropbeat-meet-prep:'+account?.id,'seen');}catch(_){}
        const original=$('[data-dismiss-meet]');if(original?.onclick)Promise.resolve(original.onclick.call(original,new Event('click'))).catch(()=>{/* Dismiss still closes; saved account preference can retry next sign-in. */});
      };
      footer.hidden=false;footer.append(link,dismiss);
    }});
  }
  function quickActions(){
    const group=$('.dashboard-quick-actions'),header=$('.portal-topbar');if(!group||!header)return;
    if(!quickMarker){quickMarker=document.createComment('Desktop quick actions');group.before(quickMarker);}
    if(header.contains(group))header.after(group);group.classList.add('db151-student-actions');
    if(!$('.db151-meet-info',group)){const info=document.createElement('button');info.type='button';info.className='db151-meet-info';info.setAttribute('aria-label','Prepare for online sessions');info.innerHTML=svg(icons.info);info.onclick=()=>prep(info);group.append(info);}
    const model=window.DropBeatPortalModel;if(!seenPrep&&model?.showMeetInstallNotice){const key='dropbeat-meet-prep:'+model.account?.id;let seen=false;try{seen=sessionStorage.getItem(key)==='seen';if(!seen)sessionStorage.setItem(key,'seen');}catch(_){}seenPrep=true;if(!seen)setTimeout(()=>{if(PHONE.matches&&!document.body.classList.contains('db138-form-open'))prep();},120);}
  }
  function membership(){
    const host=$('[data-portal-memberships]');if(!host)return;
    const stack=$(':scope>.portal-stack',host);if(!stack||stack.dataset.db151Adapted)return;stack.dataset.db151Adapted='1';
    const sections=$$(':scope>section',stack);if(sections.length<2)return;
    const menu=document.createElement('div');menu.className='db151-membership-menu';stack.before(menu);
    sections.forEach((section,index)=>{section.classList.add('db151-source-content');const button=row(index?'Payment History':'Current Membership Status',()=>mount(section,index?'Payment History':'Current Membership Status',index?'page':'sheet',button));menu.append(button);});
    const table=$('table',sections[1]),headers=table?$$('thead th',table).map(th=>text(th.textContent)):[];
    if(table){table.classList.add('db151-table-cards');$$('tbody tr',table).forEach(tr=>$$('td',tr).forEach((td,index)=>td.dataset.db151Label=headers[index]||'Details'));}
    const statement=$('[data-download-statement]',stack);if(statement){const marker=document.createComment('Desktop statement action');statement.before(marker);statement.__db151Marker=marker;remember(statement);statement.classList.add('db151-statement-fab');statement.setAttribute('aria-label','Download payment statement');statement.innerHTML=svg(icons.download);menu.append(statement);}
  }
  function formRows(){
    $$('[data-portal-role="student"] .db138-open-form').forEach(launcher=>{
      const form=launcher.__form;if(!form)return;
      const label=form.matches('[data-ticket-form]')?'Create a Ticket':form.matches('[data-v116-profile]')?'Profile Settings':form.matches('[data-v116-colors]')?'Dashboard Colours':form.matches('[data-v116-login]')?'Login Information':null;
      if(!label)return;labelRow(launcher,label);form.classList.add('db151-student-form');
      const card=launcher.closest('.portal-card');if(card)card.classList.add(form.matches('[data-ticket-form]')?'db151-ticket-launch':'db151-settings-launch');
      if(form.matches('[data-v116-profile]'))avatar(card,form);
    });
    const google=$('[data-v116-google]');if(google&&!google.__db151Row){
      const launch=row(text(google.textContent),()=>{
        sheet({title:'Connect Google Account',mode:'page',trigger:launch,render(body,footer){
          const p=document.createElement('p');p.textContent='Continue to Google to connect your account securely.';const email=document.createElement('p');email.textContent=window.DropBeatPortalModel?.account?.email||'';body.append(p,email);
          const action=document.createElement('button');action.type='button';action.className='db151-primary-action';action.textContent='Continue with Google';action.onclick=()=>{close();google.click();};footer.hidden=false;footer.append(action);
        }});
      });launch.classList.add('db151-google-launch');google.before(launch);google.__db151Row=launch;google.classList.add('db151-original-google');
    }
  }
  function avatar(card,form){
    const preview=$('.profile-preview',card),photo=$('img',preview);if(!preview||!photo||$('.db151-avatar-button',preview))return;
    const button=document.createElement('button');button.type='button';button.className='db151-avatar-button';button.setAttribute('aria-label','Change profile photo');
    const image=photo.cloneNode(true);image.alt='Your profile photo';button.append(image);const badge=document.createElement('span');badge.className='db151-camera-badge';badge.innerHTML=svg(icons.camera);button.append(badge);preview.prepend(button);
    button.onclick=()=>{const launch=$('.db138-open-form',card);launch?.click();$('input[type="file"][name="profilePhoto"]',form)?.click();};
  }
  function pass(){queued=false;if(!PHONE.matches)return;publicMenu();drawer();if(student){quickActions();membership();formRows();}}
  function queue(){if(!queued){queued=true;requestAnimationFrame(pass);}}
  function restoreDesktop(){
    close();$$('[data-download-statement]').forEach(button=>{if(button.__db151Marker?.isConnected)button.__db151Marker.replaceWith(button);});portal?.classList.remove('nav-open');document.body.classList.remove('db151-drawer-open');
    const group=$('.dashboard-quick-actions');if(quickMarker&&group){quickMarker.replaceWith(group);quickMarker=null;}group?.classList.remove('db151-student-actions');$('.db151-meet-info')?.remove();
    for(const [node,original]of modified){if(!node.isConnected)continue;node.innerHTML=original.html;node.classList.remove('db151-navigation-row','db151-statement-fab');delete node.dataset.db151Row;if(original.label===null)node.removeAttribute('aria-label');else node.setAttribute('aria-label',original.label);}modified.clear();
    $$('.db151-google-launch,.db151-avatar-button,.db151-membership-menu,.db151-menu-disclosure').forEach(node=>node.remove());
    $$('[data-db151-adapted]').forEach(node=>delete node.dataset.db151Adapted);
  }
  function install(){
    const nav=$('.navlinks');if(nav)new MutationObserver(queue).observe(nav,{childList:true,subtree:true});
    const main=$('.portal-main');if(main)new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))queue();}).observe(main,{childList:true,subtree:true});
    window.addEventListener('dropbeat:portal-model',queue);document.addEventListener('dropbeat:dashboard-mobile-v138-ready',queue);document.addEventListener('click',queue);document.addEventListener('keydown',event=>{if(event.key==='Escape')portal?.classList.remove('nav-open');});
    PHONE.addEventListener('change',()=>{if(PHONE.matches){window.DropBeatMobileUI?.refresh();queue();}else restoreDesktop();});pass();
  }
  window.DropBeatNavigation=Object.freeze({row,sheet,close,meetLink});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
