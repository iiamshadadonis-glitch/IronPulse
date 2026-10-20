/* One mobile header structure for Admin, Coach and Student. Existing controls,
   title bindings, avatar shortcut, menu and theme handlers are reused live. */
(()=>{
  'use strict';
  if(window.DropBeatGlobalHeader)return;
  const phone=matchMedia('(max-width:760px)'),states=new Map(),$=(s,r=document)=>r?.querySelector(s);
  let observer,queued=false;
  function slot(name){const node=document.createElement('div');node.className='db154-header-'+name;return node;}
  function adopt(state,node,host){if(!node||host.contains(node))return;const marker=document.createComment('V1.54 original header position');node.before(marker);state.positions.push({node,marker});host.append(node);}
  function control(node){if(node)node.classList.add('db154-header-control');}
  function homeIcon(state,home){
    if(!home||$('svg',home))return;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
    for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'16',height:'16',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false','data-db155-home-icon':''}))svg.setAttribute(name,value);
    path.setAttribute('d','m3 10 9-7 9 7M5 8v13h14V8M9 21v-8h6v8');svg.append(path);
    state.homeOriginal={home,nodes:[...home.childNodes],icon:svg};home.replaceChildren(svg);
  }
  function mount(header){
    let state=states.get(header);
    if(!state){
      const menu=$('[data-mobile-nav],[data-db134-mobile-menu]',header),title=$('[data-dashboard-title],.db134-mobile-title',header);if(!menu||!title)return;
      const leading=slot('leading'),copy=slot('title'),actions=slot('actions');state={header,leading,copy,actions,positions:[],location:null};states.set(header,state);
      const titleNode=title.closest('.portal-topbar>div')||title;
      adopt(state,menu,leading);adopt(state,titleNode,copy);header.append(leading,copy,actions);header.classList.add('db154-header');control(menu);
      const portal=header.closest('.portal-app');if(portal&&header.parentElement!==portal){const marker=document.createComment('Original desktop header location');header.before(marker);state.location=marker;portal.insertBefore(header,$(':scope>.portal-main',portal));}
    }
    const identity=$('.portal-identity',header),theme=$('.db125-color-mode-toggle',header)||($('#adminApp')?$('[data-db125-admin],body>.db125-color-mode-toggle.db125-admin-toggle'):null),home=$('.db134-mobile-home',header);
    adopt(state,identity,state.actions);adopt(state,theme,state.actions);adopt(state,home,state.actions);
    control(theme);control(home);homeIcon(state,home);control($('.db153-profile-shortcut',identity));
    if(identity&&state.actions.firstElementChild!==identity)state.actions.prepend(identity);
  }
  function observe(){observer.observe(document.body,{childList:true});for(const header of document.querySelectorAll('.portal-topbar,#adminApp>.db134-mobile-bar'))observer.observe(header,{childList:true});}
  function pass(){queued=false;if(!phone.matches)return;observer.disconnect();try{document.querySelectorAll('.portal-topbar,#adminApp>.db134-mobile-bar').forEach(mount);}finally{observe();}}
  function queue(){if(phone.matches&&!queued){queued=true;requestAnimationFrame(pass);}}
  function restore(){
    observer.disconnect();for(const state of states.values()){
      if(state.homeOriginal?.home.contains(state.homeOriginal.icon))state.homeOriginal.home.replaceChildren(...state.homeOriginal.nodes);
      // Earlier adapters may already have restored their own controls (notably
      // the Admin theme toggle); do not pull those nodes back into the header.
      state.positions.slice().reverse().forEach(({node,marker})=>{if(marker.isConnected){if(state.header.contains(node))marker.replaceWith(node);else marker.remove();}node.classList.remove('db154-header-control');});
      state.leading.remove();state.copy.remove();state.actions.remove();state.header.classList.remove('db154-header');if(state.location?.isConnected)state.location.replaceWith(state.header);
    }states.clear();
  }
  function install(){if(!$('.portal-app,#adminApp'))return;observer=new MutationObserver(queue);queue();document.addEventListener('click',queue);window.addEventListener('dropbeat:portal-model',queue);phone.addEventListener('change',event=>event.matches?queue():restore());}
  window.DropBeatGlobalHeader=Object.freeze({refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
