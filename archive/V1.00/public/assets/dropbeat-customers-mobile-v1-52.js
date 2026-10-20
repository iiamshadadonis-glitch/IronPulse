/* V1.52: Customers navigation only. Original controls, FileLists and save/import
   handlers remain authoritative; desktop nodes return to their exact locations. */
(()=>{
  'use strict';
  if(window.DropBeatCustomersMobile)return;
  const phone=matchMedia('(max-width:760px)'),states=new Map();
  const $=(s,r=document)=>r?.querySelector(s),$$=(s,r=document)=>[...(r?.querySelectorAll(s)||[])];
  const definitions=[['subscribers','subscriberForm','Add / Import Subscribers','subscriberMsg'],['unsubscribed','unsubForm','Add Manual Unsubscribe Record','unsubMsg'],['oneTimeUsers','oneTimeUserForm','Add Manual One-Time Record','oneTimeUserMsg']];
  let queued=false,observer;
  function move(state,node,parent){
    const marker=document.createComment('V1.52 original customer control position');node.before(marker);state.moves.push({node,marker});parent.append(node);
  }
  function detachLauncher(state,form){
    const launcher=$$('.db138-open-form',state.owner).find(button=>button.__form===form);if(!launcher)return null;
    const marker=document.createComment('V1.52 original form launcher');launcher.before(marker);launcher.remove();state.launchers.push({launcher,marker,form});return launcher;
  }
  function open(state,form){
    if(!phone.matches)return;
    // Leave the customer list selection and all original submission logic alone.
    state.forms.forEach(item=>{if(item!==form)item.classList.remove('db138-inline-form-open');});
    if(state.message&&form.querySelector('.db138-form-content'))$('.db138-form-content',form).append(state.message);
    state.launchers.find(item=>item.form===form)?.launcher.click();
    state.lastForm=form;
    requestAnimationFrame(()=>$('.db138-page-header button[aria-label^="Close"]',form)?.focus({preventScroll:true}));
  }
  function modes(state,form){
    const tabs=document.createElement('div');tabs.className='db152-customer-modes';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Subscriber action');
    [['Add Subscriber',state.form],['Import CSV',state.importForm]].forEach(([label,target])=>{
      const button=document.createElement('button');button.type='button';button.className='pill';button.textContent=label;button.setAttribute('aria-pressed',String(target===form));button.onclick=()=>open(state,target);tabs.append(button);
    });
    $('.db138-page-header',form).after(tabs);state.tabs.push(tabs);
  }
  function prepare(panel,id,label,messageId){
    const form=$('#'+id,panel),owner=form?.closest('details.admin-collapsed-card');if(!owner||!form.dataset.db138Inline)return;
    if(states.has(owner))return;
    const state={owner,form,forms:[form],moves:[],launchers:[],tabs:[],wasOpen:owner.open,message:$('#'+messageId,owner)};
    const launcher=detachLauncher(state,form);if(!launcher)return;
    states.set(owner,state);owner.classList.add('db152-customer-action');owner.open=true;
    const body=$(':scope>.collapsed-body',owner);
    form.classList.add('db152-customer-form');
    if(state.message)move(state,state.message,$('.db138-form-content',form));
    if(id==='subscriberForm'){
      const input=$('#subscriberFile',body),source=$('button[onclick*="importSubscribers"]',body);
      if(input&&source){
        const importer=document.createElement('form');importer.id='db152SubscriberImportForm';importer.className='form db152-customer-form';importer.dataset.db144Title='Import Subscribers';importer.onsubmit=event=>event.preventDefault();
        const actions=document.createElement('div');actions.className='form-actions';
        state.importButton={source,type:source.getAttribute('type'),submit:source.getAttribute('data-db143-source-submit')};
        source.type='button';source.dataset.db143SourceSubmit='1';move(state,source,actions);
        // Move the original helper, sample link and file wrapper, never clone inputs.
        [...body.children].filter(node=>node!==form&&!node.matches('.db138-open-form')&&!node.contains(form)).forEach(node=>move(state,node,importer));
        importer.append(actions);body.append(importer);state.importForm=importer;state.forms.push(importer);
        window.DropBeatUI.nativeUpload(input,{label:'Upload CSV File',kind:'document'});
        window.DropBeatMobileUI.prepareForm(importer);detachLauncher(state,importer);
        state.forms.forEach(item=>modes(state,item));
      }
    }
    state.row=window.DropBeatNavigation.row(label,()=>open(state,state.form));state.row.classList.add('pill');state.row.dataset.db152CustomerAction=id;owner.prepend(state.row);
    state.forms.forEach(item=>{
      const close=$('.db138-page-header button[aria-label^="Close"]',item);
      if(close){const handler=close.onclick;state.moves.push({close,handler});close.onclick=event=>{handler?.call(close,event);state.row.focus({preventScroll:true});};}
    });
  }
  function restore(state){
    state.forms.filter(form=>form.classList.contains('db138-inline-form-open')).forEach(form=>$('.db138-page-header button[aria-label^="Close"]',form)?.click());
    state.forms.forEach(form=>form.classList.remove('db138-inline-form-open','db152-customer-form'));
    state.tabs.forEach(tab=>tab.remove());state.row.remove();
    // Reverse order also restores controls originally inside moved wrappers.
    [...state.moves].reverse().forEach(({node,marker,close,handler})=>{if(close)close.onclick=handler;else if(marker.isConnected)marker.replaceWith(node);});
    if(state.importButton){const {source,type,submit}=state.importButton;type===null?source.removeAttribute('type'):source.setAttribute('type',type);submit===null?source.removeAttribute('data-db143-source-submit'):source.setAttribute('data-db143-source-submit',submit);}
    state.importForm?.remove();
    state.launchers.forEach(({launcher,marker,form})=>{if(form===state.form&&marker.isConnected)marker.replaceWith(launcher);else marker.remove();});
    state.owner.classList.remove('db152-customer-action');state.owner.open=state.wasOpen;
  }
  function refresh(){
    if(!phone.matches||!window.DropBeatMobileUI?.prepareForm||!window.DropBeatNavigation)return;
    observer?.disconnect();
    try{definitions.forEach(([panel,id,label,msg])=>{const node=$('#'+panel);if(node)prepare(node,id,label,msg);});}
    finally{observe();}
  }
  function queue(){if(queued||!phone.matches)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
  function observe(){definitions.forEach(([id])=>{const panel=$('#'+id);if(panel)observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open']});});}
  function start(){
    if(!$('#adminApp'))return;observer=new MutationObserver(queue);observe();refresh();
    document.addEventListener('click',queue);document.addEventListener('dropbeat:dashboard-mobile-v138-ready',queue);
    phone.addEventListener('change',event=>{if(event.matches)queue();else{observer.disconnect();states.forEach(restore);states.clear();}});
    [80,650,1900].forEach(delay=>setTimeout(queue,delay));
  }
  window.DropBeatCustomersMobile=Object.freeze({refresh});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
