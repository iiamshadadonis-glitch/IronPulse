/* DropBeat Dance Studio Admin V1.04
   Additive welcome-gallery manager, verified Student Story saves and fresh-data requests. */
(function(){
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const gallery={rows:[],loading:false};

  async function request(path,options={}){
    const isForm=typeof FormData!=='undefined'&&options.body instanceof FormData;
    const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options,headers:isForm?{...(options.headers||{})}:{'Content-Type':'application/json',...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Request failed (${response.status}).`);
    return data;
  }
  function galleryMessage(text,type='notice'){
    const box=$('#dropbeatStudioGalleryMessage');if(box)box.innerHTML=text?`<div class="${type}">${H(text)}</div>`:'';
  }
  function galleryManagerHtml(){return `
    <div class="dropbeat-studio-gallery-manager below" data-studio-gallery-manager>
      <details class="card admin-collapsed-card" data-studio-gallery-form-card>
        <summary data-studio-gallery-summary>Add DropBeat Studio Images</summary>
        <div class="collapsed-body">
          <h3 data-studio-gallery-heading>Add DropBeat Studio Images</h3>
          <p class="muted">These images appear in the purple image panel beside the <strong>DropBeat Studio</strong> introduction on the home page. Select one image or several images together.</p>
          <form class="form" data-studio-gallery-form>
            <input type="hidden" name="id">
            <div class="field">
              <label>Studio image(s)</label>
              <input type="file" name="images" accept="image/webp,image/jpeg,image/png,image/svg+xml" multiple required>
              <small class="hint" data-studio-gallery-file-hint>Recommended size: 1200 × 1200 px. Select one or several WebP, JPG, PNG or SVG images. Maximum 900 KB per image; up to 12 saved images.</small>
            </div>
            <div class="dropbeat-studio-current-preview" data-studio-gallery-current hidden></div>
            <div class="row">
              <div class="field"><label>Image description</label><input name="alt_text" maxlength="160" placeholder="Dance students training at DropBeat Studio"><small class="hint">Used by screen readers and search engines. When several files are selected, a number is added automatically.</small></div>
              <div class="field"><label>Status</label><select name="visible"><option value="1">Visible</option><option value="0">Hidden</option></select></div>
            </div>
            <div class="form-actions"><button class="btn compact" type="submit" data-studio-gallery-save>Save Studio Images</button><button class="btn secondary compact" type="button" data-studio-gallery-clear>Clear</button></div>
            <div id="dropbeatStudioGalleryMessage"></div>
          </form>
        </div>
      </details>
      <div class="card below">
        <div class="block-head"><div><h3>Existing DropBeat Studio Images</h3><p class="muted">Visible images rotate in this order on the home page. Use the arrows to sort them, or Edit to hide or replace an image.</p></div><button class="btn secondary compact" type="button" data-studio-gallery-refresh>Refresh</button></div>
        <div class="table-wrap" data-studio-gallery-table><div class="notice">Loading DropBeat Studio images…</div></div>
      </div>
    </div>`;}

  function ensureGalleryManager(){
    const panel=$('#banners');if(!panel||$('[data-studio-gallery-manager]',panel))return;
    const anchor=$('#bannerTable',panel)?.closest('.card')||panel.lastElementChild;
    if(!anchor)return;
    anchor.insertAdjacentHTML('afterend',galleryManagerHtml());
    const manager=$('[data-studio-gallery-manager]',panel),form=$('[data-studio-gallery-form]',manager);
    form.addEventListener('submit',saveGalleryImages);
    $('[data-studio-gallery-clear]',manager).addEventListener('click',resetGalleryForm);
    $('[data-studio-gallery-refresh]',manager).addEventListener('click',()=>loadStudioGallery(true));
    $('[data-studio-gallery-table]',manager).addEventListener('click',galleryTableAction);
    if(!$('#adminApp')?.hidden)loadStudioGallery();
  }

  async function loadStudioGallery(force=false){
    ensureGalleryManager();
    const table=$('[data-studio-gallery-table]');if(!table||gallery.loading&&!force)return;
    gallery.loading=true;
    if(!gallery.rows.length)table.innerHTML='<div class="notice">Loading DropBeat Studio images…</div>';
    try{const data=await request(`/api/admin/studio-gallery?dropbeat=1.13&t=${Date.now()}`);gallery.rows=data.images||[];renderStudioGalleryTable();}
    catch(error){table.innerHTML=`<div class="error">${H(error.message||'DropBeat Studio images could not be loaded.')}</div>`;}
    finally{gallery.loading=false;}
  }
  function renderStudioGalleryTable(){
    const table=$('[data-studio-gallery-table]');if(!table)return;
    if(!gallery.rows.length){table.innerHTML='<div class="notice">No DropBeat Studio images have been added yet. Open “Add DropBeat Studio Images” above to add the first image.</div>';return;}
    table.innerHTML=`<table class="table fixed-table clean-actions dropbeat-studio-gallery-table"><colgroup><col class="studio-copy-col"><col class="studio-preview-col"><col class="studio-status-col"><col class="studio-sort-col"><col class="studio-actions-col"></colgroup><thead><tr><th>Studio Image</th><th>Preview</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>${gallery.rows.map((item,index)=>`<tr>
      <td class="text-cell"><strong>${H(item.alt_text||'DropBeat Studio image')}</strong><br><small>Position ${index+1}</small></td>
      <td class="dropbeat-studio-preview-cell"><img class="preview-img dropbeat-studio-admin-thumb" src="${H(item.image_url)}" alt=""></td>
      <td class="dropbeat-studio-status-cell"><span class="status ${Number(item.visible)?'active':'draft'}">${Number(item.visible)?'visible':'hidden'}</span></td>
      <td><div class="sort-actions nowrap"><button class="btn secondary small icon-action" type="button" title="Move up" aria-label="Move image up" data-gallery-action="up" data-id="${item.id}" ${index===0?'disabled':''}>↑</button><button class="btn secondary small icon-action" type="button" title="Move down" aria-label="Move image down" data-gallery-action="down" data-id="${item.id}" ${index===gallery.rows.length-1?'disabled':''}>↓</button></div></td>
      <td><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit" aria-label="Edit studio image" data-gallery-action="edit" data-id="${item.id}">✎</button><button class="btn danger small icon-action" type="button" title="Delete" aria-label="Delete studio image" data-gallery-action="delete" data-id="${item.id}">×</button></div></td>
    </tr>`).join('')}</tbody></table>`;
  }

  function editGalleryImage(id){
    const item=gallery.rows.find(row=>Number(row.id)===Number(id));if(!item)return;
    const card=$('[data-studio-gallery-form-card]'),form=$('[data-studio-gallery-form]'),file=form?.elements.images;
    if(!card||!form||!file)return;
    card.open=true;form.elements.id.value=String(item.id);form.elements.alt_text.value=item.alt_text||'';form.elements.visible.value=Number(item.visible)?'1':'0';
    file.required=false;file.multiple=false;file.value='';
    $('[data-studio-gallery-summary]').textContent='Edit DropBeat Studio Image';
    $('[data-studio-gallery-heading]').textContent='Edit DropBeat Studio Image';
    $('[data-studio-gallery-save]').textContent='Update Studio Image';
    $('[data-studio-gallery-file-hint]').textContent='Optional: choose one new image only if you want to replace the current image. Maximum 900 KB.';
    const preview=$('[data-studio-gallery-current]');preview.hidden=false;preview.innerHTML=`<img src="${H(item.image_url)}" alt=""><span>Current image</span>`;
    galleryMessage('');form.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function resetGalleryForm(){
    const form=$('[data-studio-gallery-form]'),card=$('[data-studio-gallery-form-card]'),file=form?.elements.images;if(!form||!file)return;
    form.reset();form.elements.id.value='';file.required=true;file.multiple=true;
    $('[data-studio-gallery-summary]').textContent='Add DropBeat Studio Images';
    $('[data-studio-gallery-heading]').textContent='Add DropBeat Studio Images';
    $('[data-studio-gallery-save]').textContent='Save Studio Images';
    $('[data-studio-gallery-file-hint]').textContent='Recommended size: 1200 × 1200 px. Select one or several WebP, JPG, PNG or SVG images. Maximum 900 KB per image; up to 12 saved images.';
    const preview=$('[data-studio-gallery-current]');if(preview){preview.hidden=true;preview.innerHTML='';}
    galleryMessage('');if(card)card.open=false;
  }
  async function saveGalleryImages(event){
    event.preventDefault();const form=event.currentTarget,formData=new FormData(form),id=String(formData.get('id')||'');
    if(!id&&!(form.elements.images.files?.length)){galleryMessage('Choose at least one studio image.','error');return;}
    galleryMessage(id?'Updating the studio image…':'Saving the studio image(s)…');
    try{
      const data=await request('/api/admin/studio-gallery',{method:id?'PUT':'POST',body:formData});
      gallery.rows=data.images||gallery.rows;renderStudioGalleryTable();resetGalleryForm();
      // resetGalleryForm clears the form message, so place the confirmation in
      // the table card where it remains visible after the dropdown closes.
      const table=$('[data-studio-gallery-table]');if(table)table.insertAdjacentHTML('beforebegin',`<div class="notice success dropbeat-studio-save-confirmation">${H(data.message||'DropBeat Studio image saved successfully.')}</div>`);
      setTimeout(()=>$('.dropbeat-studio-save-confirmation')?.remove(),4200);
    }catch(error){galleryMessage(error.message||'The studio image could not be saved.','error');}
  }
  async function galleryTableAction(event){
    const button=event.target.closest('[data-gallery-action]');if(!button)return;
    const id=Number(button.dataset.id||0),action=button.dataset.galleryAction;
    if(action==='edit'){editGalleryImage(id);return;}
    if(action==='delete'){
      const allowed=typeof window.confirmDelete==='function'?await window.confirmDelete('This DropBeat Studio image will be deleted permanently.'):window.confirm('Delete this DropBeat Studio image?');
      if(!allowed)return;
      try{const data=await request(`/api/admin/studio-gallery?id=${encodeURIComponent(id)}`,{method:'DELETE'});gallery.rows=data.images||[];renderStudioGalleryTable();}
      catch(error){window.alert(error.message||'The studio image could not be deleted.');}
      return;
    }
    if(action==='up'||action==='down'){
      try{const data=await request('/api/admin/studio-gallery',{method:'PUT',body:JSON.stringify({action:'move',id,dir:action==='up'?-1:1})});gallery.rows=data.images||gallery.rows;renderStudioGalleryTable();}
      catch(error){window.alert(error.message||'The studio image order could not be changed.');}
    }
  }

  function normalizeStoryUrl(value=''){
    const raw=String(value||'').trim();if(!raw)return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:`https://${raw.replace(/^\/+/, '')}`;
  }
  window.saveSuccessStory=async function saveSuccessStoryV104(event){
    event.preventDefault();const form=event.currentTarget||event.target,box=$('#storyMsg');
    const payload=Object.fromEntries(new FormData(form).entries());payload.url=normalizeStoryUrl(payload.url);
    if(!payload.url){if(box)box.innerHTML='<div class="error">Paste a YouTube or Instagram link.</div>';return;}
    if(box)box.innerHTML='<div class="notice">Saving and verifying the Student Story…</div>';
    try{
      const saved=await request('/api/admin/success-stories',{method:'POST',body:JSON.stringify(payload)});
      if(typeof window.resetStoryForm==='function')window.resetStoryForm();else form.reset();
      if(typeof window.load_successStories==='function')await window.load_successStories();
      if(box)box.innerHTML=`<div class="notice success">${H(saved.message||'Student Story saved successfully and is now available on the website.')}</div>`;
    }catch(error){if(box)box.innerHTML=`<div class="error"><strong>Student Story was not saved.</strong> ${H(error.message||'Please check the link and try again.')}</div>`;}
  };

  const previousTab=window.tab;
  if(typeof previousTab==='function'&&!previousTab.__dropbeatV104){
    const wrapped=function(id){const result=previousTab.apply(this,arguments);if(id==='banners')setTimeout(()=>{ensureGalleryManager();loadStudioGallery();},80);return result;};
    wrapped.__dropbeatV104=true;window.tab=wrapped;
  }
  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(ensureGalleryManager,40);}
  function start(){ensureGalleryManager();document.addEventListener('dropbeat:admin-ready',()=>loadStudioGallery(true));new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
