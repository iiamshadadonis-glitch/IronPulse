/* DropBeat Dance Studio Admin V1.06
   Restores the Student Story form removed by a legacy collapse-card helper,
   owns the save event at the document boundary, and always reports the result. */
(function(){
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
  let repairTimer=0;

  function storyPanel(){return $('#successStories');}
  function persistentStatus(){
    const panel=storyPanel();if(!panel)return null;
    let box=$('#dropbeatStorySaveStatus',panel);
    if(!box){
      box=document.createElement('div');box.id='dropbeatStorySaveStatus';box.className='dropbeat-story-save-status';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.setAttribute('aria-atomic','true');
      const list=$('#storyTable',panel)?.closest('.card,.below')||$('#storyTable',panel);
      if(list)list.insertAdjacentElement('beforebegin',box);else panel.appendChild(box);
    }
    return box;
  }
  function showStatus(message,type='notice'){
    const html=message?`<div class="${type==='error'?'error':`notice ${type==='success'?'success':''}`.trim()}">${message}</div>`:'';
    const persistent=persistentStatus(),inline=$('#storyMsg',storyPanel());
    if(persistent)persistent.innerHTML=html;if(inline&&inline!==persistent)inline.innerHTML=html;
  }

  function repairStoryForm(){
    const panel=storyPanel();if(!panel)return null;
    let form=$('form[data-dropbeat-story-form],form',panel);
    if(!form){
      // V1.05 inherited an older card conversion which copied form.innerHTML
      // into <details> and accidentally discarded the form itself. Re-wrap the
      // displayed controls without recreating or changing any field.
      const body=$('details.admin-collapsed-card .collapsed-body',panel)||$('.collapsed-body',panel);
      if(!body||!$('[name="url"]',body))return null;
      form=document.createElement('form');form.className='form';
      while(body.firstChild)form.appendChild(body.firstChild);
      body.appendChild(form);
    }
    form.dataset.dropbeatStoryForm='1';form.id=form.id||'dropbeatStudentStoryForm';
    form.removeAttribute('onsubmit');form.onsubmit=null;
    const save=[...form.querySelectorAll('button')].find(button=>/save\s+(?:success|student)\s+story/i.test(button.textContent||''))||$('button:not([type]),button[type="submit"]',form);
    if(save){save.type='submit';save.dataset.dropbeatStorySave='1';}
    let inline=$('#storyMsg',form);
    if(!inline){inline=document.createElement('div');inline.id='storyMsg';inline.setAttribute('aria-live','polite');form.appendChild(inline);}
    persistentStatus();
    return form;
  }

  function requestId(){
    try{return crypto.randomUUID();}catch(_){return `story-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}
  }
  async function requestJson(path,options={},timeoutMs=25000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),id=options.requestId||requestId();
    try{
      const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options,signal:controller.signal,headers:{Accept:'application/json','X-DropBeat-Request-Id':id,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
      const text=await response.text();let data={};
      try{data=text?JSON.parse(text):{};}catch(_){data={error:text?`The server returned an unreadable response (${response.status}).`:`The server returned an empty response (${response.status}).`};}
      if(!response.ok||data.ok===false){const diagnostic=data.diagnostic_id||id;throw new Error(`${data.error||`Request failed (${response.status}).`} Reference: ${diagnostic}`);}
      return {...data,diagnostic_id:data.diagnostic_id||id};
    }catch(error){
      if(error?.name==='AbortError')throw new Error(`The save request timed out after ${Math.round(timeoutMs/1000)} seconds. Check the connection and try again. Reference: ${id}`);
      throw error;
    }finally{clearTimeout(timer);}
  }
  function normalizeStoryUrl(value=''){
    const raw=String(value||'').trim();if(!raw)return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:`https://${raw.replace(/^\/+/, '')}`;
  }
  function fallbackStoryTable(stories){
    const box=$('#storyTable');if(!box)return;
    box.innerHTML=stories.length?`<table class="table fixed-table clean-actions story-admin-table"><thead><tr><th>Story</th><th>Preview</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>${stories.map(story=>`<tr><td class="text-cell"><strong>${H(story.title||'Untitled story')}</strong><br><small>${H(story.url||'')}</small></td><td><img class="story-thumb" src="${H(story.thumbnail_url||'/assets/product-generic.svg')}" alt=""></td><td><span class="status ${story.status==='draft'?'draft':'active'}">${H(story.status||'active')}</span></td><td><div class="sort-actions nowrap"><button class="btn secondary small icon-action" type="button" title="Move up" onclick="moveStory(${Number(story.id)},-1)">↑</button><button class="btn secondary small icon-action" type="button" title="Move down" onclick="moveStory(${Number(story.id)},1)">↓</button></div></td><td><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit" onclick="editStory(${Number(story.id)})">✎</button><button class="btn danger small icon-action" type="button" title="Delete" onclick="deleteStory(${Number(story.id)})">×</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="notice">No Student Stories added yet.</div>';
  }
  function applyStoryRows(stories){
    let rendered=false;
    try{if(typeof A!=='undefined'&&A){A.stories=stories;if(typeof window.renderStories==='function'){window.renderStories();rendered=true;}}}catch(_){ }
    if(!rendered)fallbackStoryTable(stories);
  }
  async function readStories(saved){
    const wantedId=Number(saved?.story?.id||saved?.id||0),wantedUrl=String(saved?.story?.url||'');let lastError=null;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const data=await requestJson(`/api/admin/success-stories?dropbeat=1.08&fresh=${Date.now()}`,{},12000),rows=Array.isArray(data.stories)?data.stories:[];
        if(rows.some(story=>wantedId?Number(story.id)===wantedId:String(story.url||'')===wantedUrl))return rows;
        lastError=new Error('The saved story was not present in the verification list.');
      }catch(error){lastError=error;}
      if(attempt<2)await pause(180*(attempt+1));
    }
    throw lastError||new Error('The Student Story list could not be refreshed.');
  }

  async function saveStudentStory(form){
    form=repairStoryForm()||form;if(!form||form.dataset.dropbeatStorySaving==='1')return;
    const button=$('[data-dropbeat-story-save],button[type="submit"]',form),originalLabel=button?.textContent||'Save Success Story';
    const payload=Object.fromEntries(new FormData(form).entries());payload.url=normalizeStoryUrl(payload.url);
    if(!payload.url){showStatus('<strong>Student Story was not saved.</strong> Paste a YouTube or Instagram link.','error');form.elements?.url?.focus?.();return;}
    form.dataset.dropbeatStorySaving='1';form.setAttribute('aria-busy','true');if(button){button.disabled=true;button.textContent='Saving…';}
    showStatus('<strong>Saving Student Story…</strong> The entry is being stored and verified.');
    try{
      const saved=await requestJson('/api/admin/success-stories',{method:'POST',body:JSON.stringify(payload)});
      if(!saved?.id&&!saved?.story?.id)throw new Error(`The server did not confirm a saved record. Reference: ${saved?.diagnostic_id||'not supplied'}`);
      let rows;
      try{rows=await readStories(saved);}catch(refreshError){
        const current=[];try{if(typeof A!=='undefined'&&Array.isArray(A?.stories))current.push(...A.stories);}catch(_){ }
        const story=saved.story||{...payload,id:saved.id};rows=[story,...current.filter(item=>Number(item.id)!==Number(story.id))];applyStoryRows(rows);
        showStatus(`<strong>Student Story saved.</strong> The record is stored, but the list refresh needs another page refresh. ${H(refreshError.message)} Reference: ${H(saved.diagnostic_id||'not supplied')}`,'success');
        form.reset();const hidden=$('[name="id"]',form);if(hidden)hidden.value='';return;
      }
      applyStoryRows(rows);form.reset();const hidden=$('[name="id"]',form);if(hidden)hidden.value='';
      const publication=String(payload.status||'active')==='draft'?'saved as a draft':'published and available to the website';
      showStatus(`<strong>Student Story saved successfully.</strong> It is visible in Existing Student Stories and ${publication}. Reference: ${H(saved.diagnostic_id||'not supplied')}`,'success');
      if(String(payload.status||'active')!=='draft')requestJson(`/api/public/success-stories?dropbeat=1.08&fresh=${Date.now()}`,{},12000).catch(()=>{});
    }catch(error){
      showStatus(`<strong>Student Story was not saved.</strong> ${H(error?.message||'Please check the link and try again.')}`,'error');
    }finally{
      delete form.dataset.dropbeatStorySaving;form.removeAttribute('aria-busy');if(button){button.disabled=false;button.textContent=originalLabel;}
    }
  }

  // Capture at document level so dynamically rebuilt panels cannot detach the
  // handler. This also runs before every inherited inline submit handler.
  document.addEventListener('submit',event=>{
    const form=event.target?.closest?.('#successStories form');if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();saveStudentStory(form);
  },true);
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#successStories button');if(!button||!/save\s+(?:success|student)\s+story/i.test(button.textContent||''))return;
    const form=repairStoryForm();if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();saveStudentStory(form);
  },true);
  window.saveSuccessStory=function(event){event?.preventDefault?.();return saveStudentStory(repairStoryForm()||event?.currentTarget||event?.target);};

  function scheduleRepair(){clearTimeout(repairTimer);repairTimer=setTimeout(repairStoryForm,30);}
  function start(){repairStoryForm();new MutationObserver(scheduleRepair).observe(document.body,{childList:true,subtree:true});setTimeout(repairStoryForm,1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
