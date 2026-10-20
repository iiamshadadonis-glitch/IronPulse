/* Last-mile admin UX polish: clean tracking switches, 404 editor, async button feedback. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  const TRACKING={
    googleAnalyticsMeasurementId:'googleAnalyticsEnabled',
    googleTagManagerId:'googleTagManagerEnabled',
    metaPixelId:'metaPixelEnabled',
    snapchatPixelId:'snapchatPixelEnabled',
    xPixelId:'xPixelEnabled',
    linkedinPartnerId:'linkedinPixelEnabled',
    pinterestTagId:'pinterestPixelEnabled',
    redditPixelId:'redditPixelEnabled'
  };

  function cleanTrackingToggles(){
    const panel=$('#tracking'); if(!panel)return;
    Object.entries(TRACKING).forEach(([inputName,toggleName])=>{
      const dataInput=panel.querySelector(`[name="${inputName}"]`); const field=dataInput?.closest('.field'); if(!field)return;
      field.classList.add('uc-track-toggle-field','uc-track-toggle-v2-field');
      let existing=field.querySelector(`[name="${toggleName}"]`);
      const checked=existing ? existing.checked : ((window.A?.settings?.[toggleName])!==false);
      const oldWrap=existing?.closest('.uc-track-toggle,.uc-track-enable-v2');
      if(oldWrap?.classList.contains('uc-track-enable-v2')){existing.checked=checked;return;}
      if(oldWrap)oldWrap.remove(); else if(existing)existing.remove();
      const label=document.createElement('label');
      label.className='uc-track-enable-v2';
      label.title='Enable or disable this tracking integration';
      label.innerHTML=`<span class="switch"><input type="checkbox" name="${toggleName}" ${checked?'checked':''}><span class="slider"></span></span><span>Enable</span>`;
      field.appendChild(label);
    });
  }

  const MARKER='---UC-404-BOTTOM---';
  function split404(text=''){
    const raw=String(text||'').trim();
    if(raw.includes(MARKER)){const [top,...rest]=raw.split(MARKER);return {top:top.trim(),bottom:rest.join(MARKER).trim()};}
    const parts=raw.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
    return {top:parts.shift()||'The page you are looking for could not be found.',bottom:parts.join('\n\n')||'Please return to the home page or contact IronPulse Gym for help.'};
  }
  function sync404Editor(editor){
    const raw=editor?.querySelector('[data-page-field="body_text"]');
    const top=editor?.querySelector('[data-404-top]'); const bottom=editor?.querySelector('[data-404-bottom]');
    if(raw&&top&&bottom)raw.value=`${top.value.trim()}\n\n${MARKER}\n\n${bottom.value.trim()}`.trim();
  }
  function patch404Editor(){
    const editor=$$('.page-editor').find(d=>d.querySelector('[data-page-field="page_key"]')?.value==='404');
    if(!editor||editor.dataset.uc404Split==='1')return;
    const raw=editor.querySelector('[data-page-field="body_text"]'); if(!raw)return;
    const c=split404(raw.value);
    const bodyField=raw.closest('.field'); bodyField.classList.add('uc-404-raw-field'); bodyField.hidden=true;
    const topField=document.createElement('div'); topField.className='field'; topField.innerHTML='<label>Top Content</label><textarea data-404-top rows="5"></textarea><small class="hint">This text appears above the large 404 Page Not Found title.</small>';
    const bottomField=document.createElement('div'); bottomField.className='field'; bottomField.innerHTML='<label>Bottom Content</label><textarea data-404-bottom rows="7"></textarea><small class="hint">This text appears below the 404 title, above the Home and Contact buttons.</small>';
    topField.querySelector('textarea').value=c.top; bottomField.querySelector('textarea').value=c.bottom;
    bodyField.parentNode.insertBefore(topField,bodyField); bodyField.parentNode.insertBefore(bottomField,bodyField);
    editor.querySelector('summary').textContent='404 Error Page';
    const sync=()=>sync404Editor(editor); topField.addEventListener('input',sync); bottomField.addEventListener('input',sync); sync();
    editor.dataset.uc404Split='1';
  }
  const oldPagePayload=window.pagePayload;
  if(typeof oldPagePayload==='function')window.pagePayload=function(key){if(key==='404'){const editor=$$('.page-editor').find(d=>d.querySelector('[data-page-field="page_key"]')?.value==='404');sync404Editor(editor);}return oldPagePayload.apply(this,arguments);};

  // ---------- Global asynchronous admin-button feedback ----------
  const nativeFetch=window.fetch.bind(window);
  let activeAction=null;
  const actionWords=/\b(save|generate|import|download|refresh|search|upload|update|delete|remove|connect|send|confirm|revoke|refund|change|post|load|add selected|initiate|apply)\b/i;
  const skipWords=/\b(clear|close|copy|edit|images|previous|next|home|details|cancel)\b/i;
  function buttonText(btn){return String(btn?.dataset?.ucIdleText||btn?.textContent||'').replace(/\s+/g,' ').trim();}
  function isAsyncButton(btn){
    if(!btn||btn.disabled||btn.closest('.uc-pagination'))return false;
    /* Dashboard metric cards contain live statistic elements with IDs. They open a
       read-only modal and must keep their nested DOM intact while the request runs. */
    if(btn.matches('.card.clickable,[data-tab],.nav-group-toggle,.pill,.menu-toggle'))return false;
    const text=buttonText(btn);
    if(!text||skipWords.test(text)&&!/(delete|remove|confirm)/i.test(text))return false;
    return actionWords.test(text) || btn.type==='submit';
  }
  function pendingLabel(text){
    const t=text.toLowerCase();
    if(t.includes('download'))return 'Downloading…';
    if(t.includes('generate'))return 'Generating…';
    if(t.includes('import')||t.includes('upload'))return t.includes('upload')?'Uploading…':'Importing…';
    if(t.includes('refresh')||t.includes('search')||t.includes('load'))return 'Loading…';
    if(t.includes('delete')||t.includes('remove')||t.includes('revoke'))return 'Removing…';
    if(t.includes('refund'))return 'Processing…';
    if(t.includes('send'))return 'Sending…';
    if(t.includes('connect'))return 'Connecting…';
    if(t.includes('post'))return 'Posting…';
    if(t.includes('save')||t.includes('update')||t.includes('change')||t.includes('confirm'))return 'Saving…';
    return 'Working…';
  }
  function successText(text){
    const t=text.toLowerCase();
    if(t.includes('download'))return 'Download prepared successfully.';
    if(t.includes('generate'))return 'Generated successfully.';
    if(t.includes('import'))return 'Import completed successfully.';
    if(t.includes('upload'))return 'Upload completed successfully.';
    if(t.includes('refresh')||t.includes('search')||t.includes('load'))return 'Information refreshed successfully.';
    if(t.includes('delete')||t.includes('remove')||t.includes('revoke'))return 'Removed successfully.';
    if(t.includes('refund'))return 'Refund action completed successfully.';
    if(t.includes('send'))return 'Sent successfully.';
    if(t.includes('connect'))return 'Connected successfully.';
    if(t.includes('post'))return 'Posted successfully.';
    if(t.includes('save')||t.includes('update')||t.includes('change')||t.includes('confirm'))return 'Changes saved successfully.';
    return 'Action completed successfully.';
  }
  function toast(text,type='success'){
    let t=$('#adminAsyncToast');
    if(!t){t=document.createElement('div');t.id='adminAsyncToast';document.body.appendChild(t);}
    t.className=`admin-async-toast ${type}`;t.textContent=text;t.hidden=false;
    clearTimeout(window.__ucAsyncToastTimer);window.__ucAsyncToastTimer=setTimeout(()=>{t.hidden=true;},3600);
  }
  function startAction(btn){
    if(!isAsyncButton(btn))return null;
    if(activeAction?.btn===btn&&!activeAction.done)return activeAction;
    const idle=buttonText(btn); btn.dataset.ucIdleText=idle;
    const ctx={btn,idle,idleHTML:btn.innerHTML,requests:0,error:false,done:false,started:Date.now(),finishTimer:null,armTimer:null};
    activeAction=ctx;
    btn.classList.add('uc-button-pending');
    btn.setAttribute('aria-busy','true');
    // Delay disabling until the current click/submit event has been dispatched.
    queueMicrotask(()=>{if(!ctx.done&&btn.isConnected){btn.disabled=true;btn.textContent=pendingLabel(idle);}});
    // If the action is purely client-side (rare), do not leave the button locked forever.
    ctx.armTimer=setTimeout(()=>{if(!ctx.done&&ctx.requests===0)finishAction(ctx,true,false);},1800);
    return ctx;
  }
  function finishAction(ctx,ok,notify=true){
    if(!ctx||ctx.done)return;ctx.done=true;clearTimeout(ctx.armTimer);clearTimeout(ctx.finishTimer);
    const btn=ctx.btn;if(btn?.isConnected){btn.disabled=false;btn.classList.remove('uc-button-pending');btn.removeAttribute('aria-busy');btn.innerHTML=ctx.idleHTML;}
    if(activeAction===ctx)activeAction=null;
    if(notify)toast(ok?successText(ctx.idle):(ctx.errorMessage||'The action could not be completed. Please check the error message and try again.'),ok?'success':'error');
  }
  function scheduleFinish(ctx){
    clearTimeout(ctx.finishTimer);
    ctx.finishTimer=setTimeout(()=>{if(ctx.requests===0)finishAction(ctx,!ctx.error);},220);
  }
  window.fetch=function(){
    const ctx=activeAction&&!activeAction.done&&Date.now()-activeAction.started<60000?activeAction:null;
    if(ctx){ctx.requests++;clearTimeout(ctx.armTimer);clearTimeout(ctx.finishTimer);}
    return nativeFetch(...arguments).then(res=>{
      if(ctx){ctx.requests=Math.max(0,ctx.requests-1);if(!res.ok){ctx.error=true;try{res.clone().json().then(d=>{if(d?.error)ctx.errorMessage=String(d.error);}).catch(()=>{});}catch(_){}}scheduleFinish(ctx);}
      return res;
    }).catch(err=>{if(ctx){ctx.requests=Math.max(0,ctx.requests-1);ctx.error=true;ctx.errorMessage=err?.message||'Network request failed.';scheduleFinish(ctx);}throw err;});
  };
  document.addEventListener('click',e=>{
    const btn=e.target.closest('button,.btn');
    if(!btn||btn.closest('form')&&((btn.getAttribute('type')||'submit').toLowerCase()==='submit'))return;
    if(isAsyncButton(btn))startAction(btn);
  },true);
  document.addEventListener('submit',e=>{
    const btn=e.submitter || e.target.querySelector('button[type="submit"],button:not([type])');
    if(btn&&isAsyncButton(btn))startAction(btn);
  },true);

  function patchAll(){cleanTrackingToggles();patch404Editor();}
  const oldLoadPages=window.load_pages;
  if(typeof oldLoadPages==='function')window.load_pages=async function(){const r=await oldLoadPages.apply(this,arguments);setTimeout(patch404Editor,30);return r;};
  const oldLoadTracking=window.load_tracking;
  if(typeof oldLoadTracking==='function')window.load_tracking=async function(){const r=await oldLoadTracking.apply(this,arguments);setTimeout(cleanTrackingToggles,30);return r;};
  const oldTab=window.tab;
  if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(()=>{if(id==='tracking')cleanTrackingToggles();if(id==='pages')patch404Editor();},120);return r;};

  ready(()=>{
    patchAll();setTimeout(patchAll,800);setTimeout(patchAll,2200);
    const obs=new MutationObserver(()=>{clearTimeout(window.__ucLastMileTimer);window.__ucLastMileTimer=setTimeout(patchAll,120);});
    obs.observe(document.body,{childList:true,subtree:true});
  });
})();
