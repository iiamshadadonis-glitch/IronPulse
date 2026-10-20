/* V1.53: mobile navigation/presentation only. Original images, form launchers,
   ticket cards, filter controls and their business handlers stay live. */
(()=>{
  'use strict';
  if(window.DropBeatPortalMobilePolish)return;
  const phone=matchMedia('(max-width:760px)'),$=(s,r=document)=>r?.querySelector(s),$$=(s,r=document)=>[...(r?.querySelectorAll(s)||[])];
  const portal=$('.portal-app'),student=portal?.dataset.portalRole==='student';
  const menus=new Map(),groups=new Map(),moves=[];
  let avatar=null,tickets=null,statement=null,queued=false,observer;
  function move(node,parent){const marker=document.createComment('V1.53 desktop position');node.before(marker);parent.append(node);return {node,marker};}
  function restoreMove({node,marker}){if(!marker.isConnected)return;if(node.isConnected)marker.replaceWith(node);else marker.remove();}
  function menuIcon(){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'22',height:'22',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(name,value);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M4 6h16M4 12h16M4 18h16');svg.append(path);return svg;}
  function headers(){
    $$('[data-mobile-nav],[data-db134-mobile-menu]').forEach(button=>{if(menus.has(button))return;menus.set(button,{nodes:[...button.childNodes],label:button.getAttribute('aria-label')});button.replaceChildren(menuIcon());button.setAttribute('aria-label',button.getAttribute('aria-label')||'Open navigation menu');});
    const admin=$('#adminApp .db134-mobile-bar'),theme=$('body>.db125-color-mode-toggle.db125-admin-toggle');
    if(admin&&theme){moves.push(move(theme,admin));theme.classList.add('db153-header-theme');}
    const photo=$('.portal-topbar .portal-identity>img[data-account-photo]');
    if(photo&&!avatar){const button=document.createElement('button');button.type='button';button.className='db153-profile-shortcut';button.setAttribute('aria-label','Open profile settings');button.title='Profile settings';photo.before(button);const position=move(photo,button);avatar={button,position};
      button.onclick=()=>{$('[data-portal-nav="settings"]',portal)?.click();$('[data-settings-tab="profile"]',portal)?.click();if(!student)requestAnimationFrame(()=>$('[data-profile-form]',portal)?.closest('.portal-card')?.scrollIntoView({block:'start'}));};
    }
  }
  function settingsRows(){
    if(!student||!window.DropBeatNavigation)return;
    for(const [card,state]of groups)if(!card.isConnected){state.positions.forEach(({marker})=>marker.remove());groups.delete(card);}
    $$('[data-settings]>.db151-settings-launch,[data-settings]>section.portal-card',portal).forEach(card=>{
      if(groups.has(card))return;
      const rows=$$(':scope>.db151-navigation-row',card);if(!rows.length)return;
      // The original V1.51 enhancer owns launcher callbacks and Google routing.
      const list=document.createElement('div');list.className='db153-navigation-list';card.append(list);const positions=rows.map(row=>move(row,list));groups.set(card,{list,positions});
    });
  }
  function ticketHub(){
    if(!student||!window.DropBeatNavigation)return;
    const layout=$('[data-portal-tickets]>.settings-layout',portal);
    if(tickets&&tickets.layout!==layout){if($('#db151NavigationOverlay')?.contains(tickets.source))window.DropBeatNavigation.close();tickets=null;}
    if(!layout||tickets)return;
    const form=$('[data-ticket-form]',layout),launch=$('.db138-open-form.db151-navigation-row',layout),source=$$(':scope>section',layout)[1];if(!form||!launch||!source)return;
    const list=document.createElement('div');list.className='db153-navigation-list db153-ticket-hub';layout.prepend(list);const position=move(launch,list);
    source.classList.add('db151-source-content');source.dataset.db153TicketSource='1';
    const row=window.DropBeatNavigation.row('Your Tickets',()=>{
      const marker=document.createComment('Original ticket list');source.before(marker);
      window.DropBeatNavigation.sheet({title:'Your Tickets',mode:'page',trigger:row,render(body){body.append(source);},onClose(){if(marker.isConnected)marker.replaceWith(source);}});
    });row.classList.add('pill');list.append(row);tickets={layout,list,source,position};
  }
  function statementLayout(){
    const root=$('#db117StatementModal'),card=$('.db117-statement-card',root),trigger=$('.db140-filter-trigger',root),footer=$('.db117-statement-actions',root);
    if(!root||!card||!trigger||!footer)return;
    if(!statement||statement.root!==root){
      const position=move(trigger,card);trigger.classList.add('db153-statement-filter');trigger.setAttribute('aria-label','Filter payment statement');
      const size=()=>{const height=Math.ceil(footer.getBoundingClientRect().height);if(height>0&&card.style.getPropertyValue('--db153-statement-footer')!==height+'px')card.style.setProperty('--db153-statement-footer',height+'px');};
      const resize=typeof ResizeObserver==='function'?new ResizeObserver(size):null;resize?.observe(footer);statement={root,card,trigger,position,resize,size};size();
    }else statement.size();
  }
  function observe(){observer.observe(document.body,{childList:true});const main=$('.portal-main');if(main)observer.observe(main,{childList:true,subtree:true});const head=$('#adminApp .db134-mobile-bar');if(head)observer.observe(head,{childList:true});const modal=$('#db117StatementModal');if(modal)observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});}
  function pass(){queued=false;if(!phone.matches)return;observer?.disconnect();try{headers();settingsRows();ticketHub();statementLayout();}finally{observe();}}
  function queue(){if(!phone.matches||queued)return;queued=true;requestAnimationFrame(pass);}
  function restore(){
    observer?.disconnect();
    if(tickets){if($('#db151NavigationOverlay')?.contains(tickets.source))window.DropBeatNavigation?.close();restoreMove(tickets.position);tickets.source.classList.remove('db151-source-content');delete tickets.source.dataset.db153TicketSource;tickets.list.remove();tickets=null;}
    for(const {list,positions}of groups.values()){positions.forEach(restoreMove);list.remove();}groups.clear();
    if(avatar){restoreMove(avatar.position);avatar.button.remove();avatar=null;}
    for(const [button,original]of menus){button.replaceChildren(...original.nodes);if(original.label===null)button.removeAttribute('aria-label');else button.setAttribute('aria-label',original.label);}menus.clear();
    moves.splice(0).reverse().forEach(position=>{position.node.classList.remove('db153-header-theme');restoreMove(position);});
    if(statement){statement.resize?.disconnect();statement.trigger.classList.remove('db153-statement-filter');statement.trigger.setAttribute('aria-label','Filter records');restoreMove(statement.position);statement.card.style.removeProperty('--db153-statement-footer');statement=null;}
  }
  function install(){if(!portal&&!$('#adminApp'))return;observer=new MutationObserver(queue);if(phone.matches){observe();pass();}document.addEventListener('click',queue);window.addEventListener('dropbeat:portal-model',queue);document.addEventListener('dropbeat:dashboard-mobile-v138-ready',queue);phone.addEventListener('change',event=>event.matches?queue():restore());}
  window.DropBeatPortalMobilePolish=Object.freeze({refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
