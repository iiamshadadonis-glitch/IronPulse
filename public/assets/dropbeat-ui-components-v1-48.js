/* Shared presentation primitives. No requests, saved colors or business state. */
(()=>{
  'use strict';
  if(window.DropBeatUI?.version==='1.48')return;
  // Exact path and 1.8 stroke from the original Refund Details disclosure.
  const disclosure=()=>'<svg class="db-disclosure-indicator" data-db-disclosure style="width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;min-height:20px!important;max-height:20px!important;stroke-width:1.8!important;fill:none!important;flex:0 0 20px!important;color:var(--dropbeat-primary,var(--primary,var(--db138-primary,#4B55BE)))!important" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" style="stroke-width:1.8!important;fill:none!important"/></svg>';
  // Lucide rotate-cw, ISC; see THIRD-PARTY-ICONS-V1.48.txt. One open clockwise arc.
  const refresh=()=>'<svg class="db145-refresh-icon" data-db-refresh="open-loop" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>';
  const disclosureDown=()=>disclosure().replace('class="db-disclosure-indicator"','class="db-disclosure-indicator db-down-indicator"').replace('data-db-disclosure','data-db-down-disclosure').replace('<path d="m9 5 7 7-7 7"','<path transform="rotate(90 12 12)" d="m9 5 7 7-7 7"');
  const mobile=()=>window.matchMedia('(max-width:760px)').matches;
  const uploadBindings=new WeakSet(),checkboxBindings=new WeakSet(),targetBindings=new WeakSet(),controlTargets=new Map(),compoundLabels=new Map();
  const cloud='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18H5a4 4 0 0 1-.5-7.97A7 7 0 0 1 18 8a5 5 0 0 1 1 9.9h-2M12 20V10m-4 4 4-4 4 4"/></svg>';
  const documentUpload='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H5v20h14V7zM14 2v6h5M8 13h8M8 17h8"/></svg>';
  function uploadOptions(input,options={}){
    if(typeof options==='string')options={label:options};
    const accept=(input.accept||'').toLowerCase(),csv=/csv|sheet|excel/.test(accept+' '+input.name),video=accept.includes('video'),image=accept.includes('image');
    const kind=options.kind||(csv?'document':video?'media':'image');
    return {areaClass:'db143-upload-area',captionTag:'span',...options,kind,label:options.label||(csv?'Upload CSV File':video?'Upload Media':image?'Upload Image':'Upload File'),placeholder:options.placeholder||(csv?'Tap to choose a CSV file':video?'Tap to choose a photo or video':image?'Tap to choose an image':'Tap to choose a file')};
  }
  function syncNativeUpload(input){
    const box=input.closest('.db-native-upload,.db143-upload-area,.db142-upload-area');if(!box)return;
    const caption=box.querySelector(':scope>span,:scope>small'),text=[...(input.files||[])].map(file=>file.name).join(', ')||box.dataset.db148Placeholder||'Tap to choose an image';
    if(caption&&caption.textContent!==text)caption.textContent=text;
  }
  function nativeUpload(input,options={}){
    if(!input||!mobile())return null;
    let box=input.closest('.db143-upload-area,.db142-upload-area');
    if(box){if(!box.classList.contains('db-native-upload'))box.classList.add('db-native-upload');syncNativeUpload(input);return box;}
    const spec=uploadOptions(input,options);
    box=document.createElement(input.closest('label')?'span':'label');box.className=spec.areaClass+' db-native-upload';box.dataset.db148Placeholder=spec.placeholder;
    box.innerHTML=(spec.kind==='document'?documentUpload:cloud)+'<strong></strong><'+spec.captionTag+'></'+spec.captionTag+'>';
    box.querySelector('strong').textContent=spec.label;input.before(box);box.appendChild(input);
    if(spec.areaClass==='db142-upload-area'){input.classList.add('db142-native-file');input.dataset.db142Upload='1';}
    if(!input.getAttribute('aria-label'))input.setAttribute('aria-label',spec.label);
    if(!uploadBindings.has(input)){uploadBindings.add(input);input.addEventListener('change',()=>syncNativeUpload(input));input.form?.addEventListener('reset',()=>requestAnimationFrame(()=>syncNativeUpload(input)));}
    syncNativeUpload(input);return box;
  }
  function switchInput(input){return Boolean(input.closest('.switch,.uc94-switch,.uc-switch,.toggle-switch,[role="switch"]')||input.matches('[role="switch"]')||input.nextElementSibling?.matches('.slider,.switch-slider'));}
  function bindCheckboxTarget(target,input){
    if(!target||target.matches('form,body,html')||target.querySelectorAll('input[type="checkbox"]').length!==1)return;
    if(!target.classList.contains('db148-checkbox-target'))target.classList.add('db148-checkbox-target');
    if(target.tagName==='LABEL')return;
    if(!controlTargets.has(target))controlTargets.set(target,{role:target.getAttribute('role'),tabindex:target.getAttribute('tabindex')});
    if(target.getAttribute('tabindex')!=='0')target.setAttribute('tabindex','0');
    if(!target.getAttribute('role'))target.setAttribute('role','group');
    if(targetBindings.has(target))return;targetBindings.add(target);
    target.addEventListener('click',event=>{if(!mobile()||input.disabled||event.target.closest('input,button,a,select,textarea,[role="button"]'))return;event.preventDefault();input.click();});
    target.addEventListener('keydown',event=>{if(mobile()&&event.target===target&&(event.key===' '||event.key==='Enter')){event.preventDefault();if(!input.disabled)input.click();}});
  }
  function syncCleanupSelection(input){
    const modal=input.closest('#ucStorageCleanupModal');if(!modal)return;
    const all=modal.querySelector('.uc-storage-cleanup-toolbar input[type="checkbox"]'),items=[...modal.querySelectorAll('[data-storage-id]')];
    if(all&&items.length){all.checked=items.every(item=>item.checked);all.indeterminate=!all.checked&&items.some(item=>item.checked);}
  }
  function softCheckbox(input,{destructive=false,target,label}={}){
    if(!input||switchInput(input)||!mobile())return;
    if(!input.classList.contains('db148-checkbox'))input.classList.add('db148-checkbox');
    if(destructive&&!input.classList.contains('db148-checkbox-destructive'))input.classList.add('db148-checkbox-destructive');
    if(label&&!input.getAttribute('aria-label'))input.setAttribute('aria-label',label);
    let owner=input.closest('label');
    // Legacy reminder labels may contain two separate controls. Give each its
    // own text hit target while retaining the original input and change handler.
    if(owner&&owner.querySelectorAll('input[type="checkbox"]').length>1){
      let wrap=input.parentElement.matches('.db148-compound-checkbox')?input.parentElement:null;
      if(!wrap){wrap=document.createElement('span');wrap.className='db148-compound-checkbox';input.before(wrap);const text=input.nextSibling;wrap.appendChild(input);if(text?.nodeType===Node.TEXT_NODE)wrap.appendChild(text);compoundLabels.set(wrap,true);}
      target=wrap;
    }else target=target||owner||input.labels?.[0]||input.closest('.checkbox-row,.checkline,.check-row')||input.parentElement;
    if(!input.getAttribute('aria-label')&&!input.labels?.length){const name=(target?.textContent||'Select item').replace(/\s+/g,' ').trim();if(name)input.setAttribute('aria-label',name);}
    bindCheckboxTarget(target,input);
    if(!checkboxBindings.has(input)){checkboxBindings.add(input);input.addEventListener('change',()=>syncCleanupSelection(input));}
  }
  function controls(root=document){
    if(!mobile())return;
    root.querySelectorAll?.('input[type="checkbox"]').forEach(input=>softCheckbox(input,{destructive:Boolean(input.closest('#ucStorageCleanupModal')),target:input.closest('.uc-storage-list-row'),label:input.closest('.uc-storage-list-row')?.querySelector('.uc-storage-item-link')?.textContent}));
    root.querySelectorAll?.('input[type="file"]').forEach(input=>nativeUpload(input));
    const color=getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-primary').trim()||getComputedStyle(document.body).getPropertyValue('--db138-primary').trim();
    if(color){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path transform="rotate(90 12 12)" d="m9 5 7 7-7 7"/></svg>',value='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';if(document.documentElement.style.getPropertyValue('--db148-dropdown-icon')!==value)document.documentElement.style.setProperty('--db148-dropdown-icon',value);}
  }
  function restoreControls(){
    for(const [target,original]of controlTargets){for(const [name,value]of Object.entries(original)){if(value===null)target.removeAttribute(name);else target.setAttribute(name,value);}target.classList.remove('db148-checkbox-target');}controlTargets.clear();
    for(const wrap of compoundLabels.keys()){if(wrap.isConnected){while(wrap.firstChild)wrap.before(wrap.firstChild);wrap.remove();}}compoundLabels.clear();
  }
  function legends(root=document){
    root.querySelectorAll?.('.uc88-color,.uc92-legend>span,.uc90-color-swatch').forEach(pill=>{
      pill.classList.add('db-dot-text-capsule');
      const input=pill.querySelector('input[type="color"]'),swatch=pill.querySelector('i');
      const sync=()=>{const color=input?.value||(swatch&&getComputedStyle(swatch).getPropertyValue('--c'))||pill.style.getPropertyValue('--c');if(color)pill.style.setProperty('--db-legend-color',color);};
      sync();
      if(input&&!input.dataset.db142Color){input.dataset.db142Color='1';input.setAttribute('aria-label','Change '+pill.textContent.trim()+' color');input.addEventListener('input',sync);input.addEventListener('change',sync);}
    });
  }
  // Both calendars use this same contract; existing date/scheduling handlers stay live.
  function calendar(root){
    root.classList.add('db-mobile-calendar');
    root.querySelectorAll('.db107-calendar-day:not(.empty),.db116-calendar-day,.uc48-day,.uc88-day').forEach(day=>{
      day.classList.add('db-mobile-calendar-date');
      const selected=day.matches('.selected,.is-selected,[aria-selected="true"]');
      day.setAttribute('aria-selected',String(selected));
    });
  }
  window.DropBeatUI=Object.freeze({version:'1.48',disclosure,disclosureDown,refresh,legends,calendar,nativeUpload,softCheckbox,controls,restoreControls});
  const start=()=>{
    legends();
    let queued=false;
    new MutationObserver(records=>{
      if(queued||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))return;
      queued=true;requestAnimationFrame(()=>{queued=false;legends();});
    }).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
