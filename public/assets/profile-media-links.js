/* Optional profile photo/video link fields. */
(function(){
  const MAX=5;
  const $=s=>document.querySelector(s);
  function escapeAttr(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function group(kind){return document.querySelector(`[data-profile-links="${kind}"]`);}
  function rows(kind){return Array.from(group(kind)?.querySelectorAll('.profile-link-row')||[]);}
  function update(kind){
    const g=group(kind);if(!g)return;
    const n=rows(kind).length,btn=g.parentElement.querySelector(`[data-add-profile-link="${kind}"]`),count=g.parentElement.querySelector(`[data-profile-link-count="${kind}"]`);
    if(btn){btn.disabled=n>=MAX;btn.textContent=n>=MAX?(kind==='photo'?'Maximum 5 Photo Links':'Maximum 5 Video Links'):(kind==='photo'?'+ Add More Photo Link':'+ Add More Video Link');}
    if(count)count.textContent=`${n} of ${MAX} links`;
  }
  function makeRow(kind,index){
    const row=document.createElement('div');row.className='profile-link-row';
    const input=document.createElement('input');input.type='url';input.name=`${kind}_link_${index}`;input.autocomplete='off';
    input.placeholder=kind==='photo'?'https://drive.google.com/file/d/...':'https://youtu.be/...';
    row.appendChild(input);
    if(index>1){const x=document.createElement('button');x.type='button';x.className='profile-link-remove';x.setAttribute('aria-label',`Remove ${kind} link`);x.textContent='×';x.onclick=()=>{row.remove();renumber(kind);};row.appendChild(x);}
    return row;
  }
  function renumber(kind){
    rows(kind).forEach((row,i)=>{const input=row.querySelector('input');if(input)input.name=`${kind}_link_${i+1}`;});update(kind);
  }
  function add(kind){const g=group(kind);if(!g)return;const n=rows(kind).length;if(n>=MAX)return;g.appendChild(makeRow(kind,n+1));update(kind);g.lastElementChild?.querySelector('input')?.focus();}
  function reset(){['photo','video'].forEach(kind=>{const g=group(kind);if(!g)return;g.innerHTML='';g.appendChild(makeRow(kind,1));update(kind);});}
  function validUrl(value){try{return new URL(value);}catch(_){return null;}}
  function validateForm(form){
    const photos=rows('photo').map(r=>r.querySelector('input')?.value.trim()).filter(Boolean);
    const videos=rows('video').map(r=>r.querySelector('input')?.value.trim()).filter(Boolean);
    for(const v of photos){const u=validUrl(v);if(!u||!/(^|\.)drive\.google\.com$/i.test(u.hostname)){alert('Photo links must be public Google Drive share links. Please upload the photo to Google Drive, choose “Anyone with the link”, and paste that link.');return false;}}
    for(const v of videos){const u=validUrl(v);if(!u||!/(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname)){alert('Video links must be YouTube links. Please upload the video to YouTube and paste the YouTube link.');return false;}}
    return true;
  }
  window.UCProfileMedia={add,reset,validateForm};
  document.addEventListener('DOMContentLoaded',()=>{['photo','video'].forEach(update);});
})();
