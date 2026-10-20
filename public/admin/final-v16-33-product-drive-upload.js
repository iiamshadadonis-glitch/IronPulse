/* V16.35 — Google Drive Product Images upload with independent Product Card + Offer Details crops. */
(function(){'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null,H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function apiJson(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed with HTTP ${r.status}.`);return d;}
  function notice(text,type='error'){const m=$('#mediaMsg');if(m)m.innerHTML=`<div class="${type==='error'?'error':'notice '+(type==='success'?'success':'')}">${H(text)}</div>`;}
  async function settings(){let s=window.UCSocialIntegrations?.settings||{};if(!s.googleDrive){try{const r=await apiJson('/api/admin/social-integrations');s=r.settings||{};window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=s;}catch(_){}}return s;}
  function removeUploadField(){const x=$('#ucV1633DriveProductUploadField');if(x)x.remove();const url=$('#ucV1624MediaForm [name="image_url"]'),field=url?.closest('.field');if(field){field.hidden=false;url.required=true;url.setAttribute('aria-required','true');}}
  async function applyMode(){
    const form=$('#ucV1624MediaForm'),url=form?.elements?.image_url;if(!form||!url)return;const s=await settings(),g=s.googleDrive||{},ready=!!(g.enabled&&g.uploadReady&&g.oauthConnected);
    if(!ready){removeUploadField();const hint=url.closest('.field')?.querySelector('.hint');if(hint&&g.enabled)hint.textContent='Google Drive is enabled, but upload mode is not ready yet. Finish Connect Google Drive + Destination Root Folder + Test Connection in Settings → Integrations, or keep using a public Product Image URL for now.';return;}
    const field=url.closest('.field');field.hidden=true;url.required=false;url.removeAttribute('aria-required');url.value='';
    let upload=$('#ucV1633DriveProductUploadField');if(!upload){upload=document.createElement('div');upload.id='ucV1633DriveProductUploadField';upload.className='field uc-v1633-drive-upload-field';field.insertAdjacentElement('beforebegin',upload);}
    upload.innerHTML=`<label>Upload Product Image</label><input type="file" name="drive_image_file" accept="image/*"><small class="hint">Uploads directly to Google Drive: <strong>${H(g.rootFolderName||'Selected folder')} → ${H(g.plansFolderName||'Plans and Offers')}</strong>. After Save Image, the dual website crop editor opens. Save the 900 × 1100 Product Card crop and the independent 1280 × 720 Offer Details crop together. The original Drive image remains unchanged.</small>`;
    const help=$('#ucV1624MediaHelp .uc-v1624-help-grid');if(help&&!help.querySelector('[data-v1633-drive-upload-help]')){const d=document.createElement('div');d.dataset.v1633DriveUploadHelp='1';d.innerHTML='<h3>Google Drive upload mode</h3><p>When Google Drive is enabled and its upload connection is ready, Product Image URL is replaced by Upload Product Image. The original file is uploaded to the configured Drive folder → Plans and Offers, made readable by link, and then the dual website crop workflow continues: one crop for Product Cards and a separate crop for Offer Details. Disable/disconnect Drive upload to return to Product Image URL mode.</p>';help.appendChild(d);}
  }
  const oldOpen=window.openMedia;if(typeof oldOpen==='function'&&!oldOpen.__ucV1633DriveUpload){const w=async function(){const r=await oldOpen.apply(this,arguments);await applyMode();const b=$('#ucV1624MediaForm button[type="submit"]');if(b){b.disabled=false;b.textContent='Save Image';b.removeAttribute('aria-busy');}return r;};w.__ucV1633DriveUpload=true;window.openMedia=w;}
  const oldUpload=window.uploadMedia;if(typeof oldUpload==='function'&&!oldUpload.__ucV1633DriveUpload){const w=async function(e){
    const form=e.currentTarget||e.target,s=await settings(),g=s.googleDrive||{},ready=!!(g.enabled&&g.uploadReady&&g.oauthConnected);if(!ready)return oldUpload.apply(this,arguments);
    e.preventDefault();const file=form.elements.drive_image_file?.files?.[0],productId=Number(form.elements.product_id?.value||0),button=form.querySelector('button[type="submit"]');
    if(!file){notice('Choose the Product Image that should be uploaded to Google Drive.');return;}
    if(!productId){notice('Product ID is missing. Close Images and open it again.');return;}
    try{
      const current=await apiJson(`/api/admin/media?product_id=${encodeURIComponent(productId)}`);if((current.images||[]).length>=3){notice('Maximum 3 scrolling images per product are allowed. Remove an old image before uploading another one.');return;}
      if(button){button.disabled=true;button.textContent='Uploading to Google Drive…';button.setAttribute('aria-busy','true');}notice('Uploading the original product image to Google Drive…','notice');
      const fd=new FormData();fd.append('file',file,file.name||`plan-image-${Date.now()}.jpg`);const out=await apiJson('/api/admin/google-drive-upload',{method:'POST',body:fd});
      const url=form.elements.image_url;if(!url)throw new Error('Product Image URL field is unavailable. Refresh the admin page and try again.');url.value=out.url||'';if(!url.value)throw new Error('Google Drive upload completed but did not return a public image URL.');
      notice(`Uploaded ${out.name||'product image'} to Google Drive. Saving it to the plan and opening the website crop editor next…`,'success');if(button){button.disabled=false;button.textContent='Save Image';button.removeAttribute('aria-busy');}
      return await oldUpload.call(this,e);
    }catch(err){notice(err.message||'The Google Drive product image upload could not be completed.');if(button){button.disabled=false;button.textContent='Save Image';button.removeAttribute('aria-busy');}}
  };w.__ucV1633DriveUpload=true;window.uploadMedia=w;}
  document.addEventListener('click',e=>{if(e.target.closest?.('[onclick^="openMedia("]'))setTimeout(applyMode,120);});
})();
