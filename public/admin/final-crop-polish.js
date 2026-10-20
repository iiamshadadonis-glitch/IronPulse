/* Final hero/product image cropper, sorting, and admin UI polish. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  function make(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}
  function showBox(sel,text,type='notice'){const el=$(sel);if(el)el.innerHTML=text?`<div class="${type}">${H(text)}</div>`:'';}
  function clearErrors(scope=document){scope.querySelectorAll?.('.has-error').forEach(x=>x.classList.remove('has-error'));scope.querySelectorAll?.('.field-error-text').forEach(x=>x.remove());}
  function mark(input,msg){const field=input?.closest?.('.field');if(!field)return;field.classList.add('has-error');field.querySelector('.field-error-text')?.remove();const n=document.createElement('small');n.className='field-error-text';n.textContent='✕ '+msg;input.insertAdjacentElement('afterend',n);}
  function toast(text,type='error'){let t=$('#adminToast');if(!t){t=document.createElement('div');t.id='adminToast';document.body.appendChild(t);}t.className=`admin-toast ${type}`;t.textContent=text;t.hidden=false;clearTimeout(window.__adminToastTimer);window.__adminToastTimer=setTimeout(()=>{t.hidden=true;},6500);}
  const ALLOWED=['image/webp','image/jpeg','image/png','image/svg+xml'];
  function dims(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(u);resolve({w:img.naturalWidth,h:img.naturalHeight});};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Image could not be read. Please upload a valid image.'));};img.src=u;});}
  function needCrop(file,w,h){return file && file.type!=='image/svg+xml' && w && h;}
  function kb(n){return Math.round(n/1024)+' KB';}
  function baseName(name='image'){return String(name).replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'image';}
  function checkFile(input,maxBytes,label){const file=input?.files?.[0];if(!file)return null;if(!ALLOWED.includes(file.type)){mark(input,`${label} format is incorrect. Accepted formats are WebP, JPG, PNG and SVG. Recommended format is WebP.`);return false;}if(file.size>maxBytes){mark(input,`${label} is too large. Maximum upload size is ${kb(maxBytes)}. Current image size is ${kb(file.size)}.`);return false;}return file;}

  let cropResolve=null, cropState=null;
  function ensureCropper(){
    if($('#cropModal'))return;
    document.body.appendChild(make(`<div id="cropModal" class="modal crop-modal"><div class="modal-card crop-card"><div class="top"><div><h2 id="cropTitle">Crop Image</h2><p id="cropHelp" class="muted">Move or zoom the image until the important part fits inside the frame.</p></div><button class="btn secondary compact" type="button" id="cropCancelTop">Cancel</button></div><div class="crop-shell"><canvas id="cropCanvas" width="900" height="600"></canvas></div><div class="crop-controls"><button class="btn secondary compact" type="button" id="cropZoomOut">− Zoom Out</button><button class="btn secondary compact" type="button" id="cropZoomIn">+ Zoom In</button><button class="btn secondary compact" type="button" id="cropFit">Fit Full Image</button><button class="btn compact" type="button" id="cropSave">Save Cropped Image</button></div><div id="cropMsg"></div></div></div>`));
    $('#cropCancelTop').onclick=()=>finishCrop(null);
    $('#cropZoomOut').onclick=()=>{if(cropState){cropState.scale=Math.max(cropState.minScale*.45,cropState.scale*.9);drawCrop();}};
    $('#cropZoomIn').onclick=()=>{if(cropState){cropState.scale=Math.min(cropState.maxScale,cropState.scale*1.1);drawCrop();}};
    $('#cropFit').onclick=()=>{if(cropState){cropState.scale=cropState.minScale;cropState.x=(cropState.cw-cropState.img.width*cropState.scale)/2;cropState.y=(cropState.ch-cropState.img.height*cropState.scale)/2;drawCrop();}};
    $('#cropSave').onclick=saveCrop;
    const canvas=$('#cropCanvas');let drag=false,last=null;
    canvas.addEventListener('pointerdown',e=>{drag=true;canvas.setPointerCapture(e.pointerId);last={x:e.clientX,y:e.clientY};});
    canvas.addEventListener('pointermove',e=>{if(!drag||!cropState)return;cropState.x+=e.clientX-last.x;cropState.y+=e.clientY-last.y;last={x:e.clientX,y:e.clientY};drawCrop();});
    canvas.addEventListener('pointerup',()=>{drag=false;});
    canvas.addEventListener('wheel',e=>{if(!cropState)return;e.preventDefault();const old=cropState.scale;const factor=e.deltaY<0?1.08:.92;cropState.scale=Math.max(cropState.minScale*.45,Math.min(cropState.maxScale,cropState.scale*factor));const rect=canvas.getBoundingClientRect();const mx=(e.clientX-rect.left)*(canvas.width/rect.width), my=(e.clientY-rect.top)*(canvas.height/rect.height);cropState.x=mx-(mx-cropState.x)*(cropState.scale/old);cropState.y=my-(my-cropState.y)*(cropState.scale/old);drawCrop();},{passive:false});
  }
  function finishCrop(file){$('#cropModal')?.classList.remove('open');const r=cropResolve;cropResolve=null;cropState=null;if(r)r(file);}
  function drawCrop(){
    const s=cropState, c=$('#cropCanvas'), ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#f7f7fc';ctx.fillRect(0,0,c.width,c.height);
    ctx.drawImage(s.img,s.x,s.y,s.img.width*s.scale,s.img.height*s.scale);
    ctx.strokeStyle='rgba(75,85,190,.9)';ctx.lineWidth=4;ctx.strokeRect(2,2,c.width-4,c.height-4);
    ctx.fillStyle='rgba(42,6,16,.10)';ctx.fillRect(0,0,c.width,8);ctx.fillRect(0,c.height-8,c.width,8);
  }
  function canvasBlob(canvas,type='image/webp',quality=.84){return new Promise(r=>canvas.toBlob(r,type,quality));}
  async function saveCrop(){
    try{
      const s=cropState;if(!s)return;
      const out=document.createElement('canvas');out.width=s.tw;out.height=s.th;const ctx=out.getContext('2d');ctx.fillStyle='#f7f7fc';ctx.fillRect(0,0,out.width,out.height);
      const scaleX=s.tw/s.cw, scaleY=s.th/s.ch;ctx.drawImage(s.img,s.x*scaleX,s.y*scaleY,s.img.width*s.scale*scaleX,s.img.height*s.scale*scaleY);
      let q=.84, blob=await canvasBlob(out,'image/webp',q);
      while(blob && blob.size>s.maxBytes && q>.48){q-=.08;blob=await canvasBlob(out,'image/webp',q);}
      if(!blob) blob=await canvasBlob(out,'image/jpeg',.82);
      if(blob.size>s.maxBytes){showBox('#cropMsg',`Cropped image is still ${kb(blob.size)}. Please zoom/crop tighter or use a smaller source image so it stays under ${kb(s.maxBytes)}.`,'error');return;}
      finishCrop(new File([blob],`${baseName(s.file.name)}-${s.tw}x${s.th}.webp`,{type:'image/webp'}));
    }catch(e){showBox('#cropMsg',e.message||'Could not crop image.','error');}
  }
  function openCropper(file,w,h,label,maxBytes){
    ensureCropper();
    return new Promise((resolve,reject)=>{
      cropResolve=resolve;showBox('#cropMsg','');$('#cropTitle').textContent=`Crop ${label}`;$('#cropHelp').textContent=`Required frame: ${w} × ${h} px. Drag to position. Use zoom out if you want more of the image inside the frame.`;
      const img=new Image();img.onload=()=>{
        const maxW=860,maxH=560,aspect=w/h;let cw=maxW,ch=Math.round(cw/aspect);if(ch>maxH){ch=maxH;cw=Math.round(ch*aspect);}const c=$('#cropCanvas');c.width=cw;c.height=ch;
        const contain=Math.min(cw/img.width,ch/img.height), cover=Math.max(cw/img.width,ch/img.height);
        cropState={file,img,tw:w,th:h,cw,ch,scale:contain,minScale:contain,maxScale:Math.max(cover*3,contain*4),maxBytes,x:(cw-img.width*contain)/2,y:(ch-img.height*contain)/2};drawCrop();$('#cropModal').classList.add('open');URL.revokeObjectURL(img.src);
      };
      img.onerror=()=>{reject(new Error('Image could not be opened for cropping.'));};img.src=URL.createObjectURL(file);
    });
  }
  async function maybeCrop(input,w,h,label,maxBytes){
    const file=checkFile(input,maxBytes,label); if(file===false)return false; if(!file)return null; if(file.type==='image/svg+xml')return file;
    const d=await dims(file); if(d.w===w && d.h===h)return file;
    toast(`${label} size is ${d.w} × ${d.h} px. Please crop it to ${w} × ${h} px.`, 'notice');
    const cropped=await openCropper(file,w,h,label,maxBytes); if(!cropped){mark(input,`${label} was not cropped. Please crop the image to ${w} × ${h} px or upload an exact-size image.`);return false;} return cropped;
  }

  window.ucOpenCropper=openCropper;
  window.ucMaybeCrop=maybeCrop;

  const oldOpenMedia=window.openMedia;
  window.openMedia=async function(productId){
    if(oldOpenMedia) await oldOpenMedia(productId);
    const modal=$('#mediaModal .modal-card');
    const form=$('#mediaModal form');
    if(form && !form.dataset.finalPolished){
      form.dataset.finalPolished='1';
      form.querySelector('[name="sort_order"]')?.closest('.field')?.remove();
      const hint=form.querySelector('[name="file"]')?.closest('.field')?.querySelector('.hint');
      if(hint) hint.textContent='Recommended size: 900 × 1100 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 700 KB per image. Upload up to 3 scrolling images per product.';
      form.insertAdjacentHTML('beforeend','<div id="mediaFieldMsg"></div>');
    }
  };
  window.uploadMedia=async function(e){
    e.preventDefault();const form=e.target;clearErrors(form);showBox('#mediaMsg','');showBox('#mediaFieldMsg','');
    const input=form.querySelector('[name="file"]');const productId=form.querySelector('[name="product_id"]')?.value;
    let file;
    try{file=await maybeCrop(input,900,1100,'Product image',700*1024);if(file===false)return showBox('#mediaMsg','Please correct the highlighted product image error and try again.','error');}
    catch(err){mark(input,err.message||'Product image could not be processed.');return showBox('#mediaMsg',err.message||'Product image could not be processed.','error');}
    try{
      const fd=new FormData(form); if(file)fd.set('file',file); fd.delete('sort_order');
      const res=await fetch('/api/admin/media',{method:'POST',body:fd});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Image upload failed.');window.ucAdminInvalidateApiCache?.();
      showBox('#mediaMsg','Product image uploaded successfully.');form.reset();$('#mediaProductId').value=productId;await load_products();await loadProductMedia(productId);
    }catch(err){showBox('#mediaMsg',err.message||'Image upload failed.','error');if(/large|format|image/i.test(err.message||''))mark(input,err.message);}
  };
  window.loadProductMedia=async function(productId){
    const res=await api('/api/admin/media?product_id='+encodeURIComponent(productId));const imgs=res.images||[];const box=$('#currentProductMedia');if(!box)return;
    box.innerHTML=`<h3>Current scrolling images (${imgs.length}/3)</h3>${imgs.length?`<div class="media-grid sortable-media">${imgs.map((i,idx)=>`<div class="media-card"><img src="${H(i.public_url)}" alt="${H(i.alt_text||'')}"><small>${H(i.alt_text||'No alt text')}</small><label class="uc-existing-cover-choice"><input type="checkbox" ${Number(i.is_cover||0)===1?'checked':''} onchange="setExistingCoverImage(${i.id},${productId},this)"> <span>Cover image</span></label><div class="media-sort-actions"><button class="btn secondary small icon-action" type="button" title="Move left" ${idx===0?'disabled':''} onclick="moveProductImage(${i.id},${productId},-1)">←</button><button class="btn secondary small icon-action" type="button" title="Move right" ${idx===imgs.length-1?'disabled':''} onclick="moveProductImage(${i.id},${productId},1)">→</button></div><button class="btn danger small" onclick="removeProductImage(${i.id},${productId})">Remove</button></div>`).join('')}</div>`:'<div class="notice">No uploaded product images yet. Static default image may still appear on the website.</div>'}`;
  };
  window.setExistingCoverImage=async function(imageId,productId,box){
    if(!box?.checked){box.checked=true;return;}
    try{qsa('.uc-existing-cover-choice input','#currentProductMedia').forEach(x=>{if(x!==box)x.checked=false;});await api('/api/admin/media',{method:'PUT',body:JSON.stringify({action:'set_cover',image_id:imageId,product_id:productId})});await load_products();await loadProductMedia(productId);toast('Cover image updated.','success');}
    catch(e){box.checked=false;toast(e.message||'Could not set cover image.','error');await loadProductMedia(productId).catch(()=>{});}
  };
  window.moveProductImage=async function(imageId,productId,dir){try{await api('/api/admin/media',{method:'PUT',body:JSON.stringify({action:'move',image_id:imageId,product_id:productId,dir})});await load_products();await loadProductMedia(productId);}catch(e){toast(e.message||'Could not sort image.','error');}};

  window.load_banners=async function(){const res=await api('/api/admin/banners');A.banners=res.banners||[];const box=$('#bannerTable');if(!box)return;box.innerHTML=`<table class="table fixed-table banner-admin-table"><thead><tr><th>Home Page Banner</th><th>Image</th><th>Link</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>${A.banners.map(b=>`<tr><td class="text-cell"><strong>${H(b.title)}</strong><br><small>${H(b.subtitle||'')}</small></td><td><img class="preview-img" src="${H(b.desktop_image_url||'/assets/banner-1.svg')}"></td><td class="text-cell"><small>${H(b.link_type)}: ${H(b.link_value||'')}</small></td><td><span class="status ${b.visible?'active':'draft'}">${b.visible?'visible':'hidden'}</span></td><td class="sort-actions nowrap"><button class="btn secondary small icon-action" title="Move up" onclick="moveBanner(${b.id},-1)">↑</button><button class="btn secondary small icon-action" title="Move down" onclick="moveBanner(${b.id},1)">↓</button></td><td class="action-row nowrap"><button class="btn secondary small icon-action" title="Edit" onclick="editBanner(${b.id})">✎</button><button class="btn danger small icon-action" title="Delete" onclick="deleteBanner(${b.id})">×</button></td></tr>`).join('')}</tbody></table>`;};
  window.moveBanner=async function(id,dir){await api('/api/admin/banners',{method:'PUT',body:JSON.stringify({action:'move',id,dir})});await load_banners();};
  const oldEditBanner=window.editBanner;
  window.editBanner=function(id){if(oldEditBanner)oldEditBanner(id);const f=$('#bannerForm');if(f){f.querySelector('[name="sort_order"]')?.setAttribute('value','0');f.scrollIntoView({behavior:'smooth',block:'start'});}};
  const oldReset=window.resetBannerForm;
  window.resetBannerForm=function(){if(oldReset)oldReset();clearErrors($('#bannerForm'));showBox('#bannerMsg','');};
  window.saveBanner=async function(e){
    e.preventDefault();const form=e.target;clearErrors(form);showBox('#bannerMsg','');
    const desktop=form.querySelector('[name="desktop_image"]'), mobile=form.querySelector('[name="mobile_image"]');
    let dFile=null,mFile=null;
    try{dFile=await maybeCrop(desktop,2560,960,'Desktop home page background image',900*1024);if(dFile===false)return showBox('#bannerMsg','Please correct the highlighted desktop image error and try again.','error');mFile=await maybeCrop(mobile,1440,1800,'Mobile home page background image',900*1024);if(mFile===false)return showBox('#bannerMsg','Please correct the highlighted mobile image error and try again.','error');}
    catch(err){showBox('#bannerMsg',err.message||'Banner image could not be processed.','error');return;}
    try{const fd=new FormData(form);if(dFile)fd.set('desktop_image',dFile);if(mFile)fd.set('mobile_image',mFile);const method=fd.get('id')?'PUT':'POST';const res=await fetch('/api/admin/banners',{method,body:fd});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Banner could not be saved.');resetBannerForm();showBox('#bannerMsg',method==='PUT'?'Home page banner updated successfully.':'Home page banner saved successfully.');await load_banners();}
    catch(err){showBox('#bannerMsg',err.message||'Banner could not be saved.','error');if(/large|format|image/i.test(err.message||'')){if(desktop?.files?.length)mark(desktop,err.message);if(mobile?.files?.length)mark(mobile,err.message);}}
  };

  function polishBannerForm(){const form=$('#bannerForm');if(!form)return;const sort=form.querySelector('[name="sort_order"]');if(sort){sort.type='hidden';sort.value=sort.value||'0';sort.closest('.field')?.remove();}const dh=form.querySelector('[name="desktop_image"]')?.closest('.field')?.querySelector('.hint');if(dh)dh.textContent='Recommended size: 2560 × 960 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB. This becomes the full-width home page background image.';const mh=form.querySelector('[name="mobile_image"]')?.closest('.field')?.querySelector('.hint');if(mh)mh.textContent='Recommended size: 1440 × 1800 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB. Used for mobile home page background.';}
  function polishProductModal(){const sort=$('#productForm [name="sort_order"]')?.closest('.field'); if(sort)sort.style.display='none';}
  polishBannerForm();polishProductModal();
  const oldTab=window.tab;window.tab=function(id){oldTab(id);if(id==='banners')setTimeout(polishBannerForm,50);if(id==='products')setTimeout(polishProductModal,50);if(id==='tracking'){$$('#tracking details').forEach(d=>d.open=false);}if(id==='refunds'){$$('#refunds details').forEach(d=>d.open=false);}};
})();
