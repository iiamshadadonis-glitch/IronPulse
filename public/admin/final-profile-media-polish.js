/* Profile photo/video thumbnails and in-admin media viewer.
   Independent add-on used only by the unified Client Details Profile tab. */
(function(){
  const state={photo:[],video:[],kind:'photo',index:0};
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function uniq(a){const seen=new Set(),out=[];for(const x of (Array.isArray(a)?a:[])){const v=String(x||'').trim();if(v&&!seen.has(v)){seen.add(v);out.push(v);}if(out.length>=5)break;}return out;}
  function driveId(v){try{const u=new URL(v),m=u.pathname.match(/\/file\/d\/([^/]+)/i);return (m?.[1]||u.searchParams.get('id')||'').trim();}catch(_){return'';}}
  function youtubeId(v){try{const u=new URL(v),host=u.hostname.toLowerCase().replace(/^www\./,'');if(host==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';if(host.endsWith('youtube.com')){const p=u.pathname.split('/').filter(Boolean);if(u.searchParams.get('v'))return u.searchParams.get('v')||'';if(['shorts','embed','live'].includes(p[0]))return p[1]||'';}return'';}catch(_){return'';}}
  function photoSrc(v,size='w1200'){const id=driveId(v);return id?`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=${size}`:v;}
  function videoThumb(v){const id=youtubeId(v);return id?`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`:'';}
  function ensureModal(){
    let m=document.getElementById('ucProfileMediaModal');if(m)return m;
    m=document.createElement('div');m.id='ucProfileMediaModal';m.className='modal uc-profile-media-modal';m.innerHTML=`<div class="modal-card uc-profile-media-viewer"><div class="uc-profile-media-viewer-head"><strong id="ucProfileMediaTitle">Profile Media</strong><button class="btn secondary compact" type="button" onclick="UCProfileMediaAdmin.close()">Back</button></div><div class="uc-profile-media-stage"><button class="uc-profile-media-nav prev" type="button" aria-label="Previous" onclick="UCProfileMediaAdmin.step(-1)">‹</button><div id="ucProfileMediaStageBody"></div><button class="uc-profile-media-nav next" type="button" aria-label="Next" onclick="UCProfileMediaAdmin.step(1)">›</button></div><div id="ucProfileMediaCounter" class="uc-profile-media-counter"></div></div>`;document.body.appendChild(m);return m;
  }
  function renderStage(){
    const arr=state[state.kind]||[],body=document.getElementById('ucProfileMediaStageBody'),title=document.getElementById('ucProfileMediaTitle'),counter=document.getElementById('ucProfileMediaCounter');if(!body)return;
    if(!arr.length){body.innerHTML='<div class="notice">No media available.</div>';return;}
    state.index=((state.index%arr.length)+arr.length)%arr.length;const v=arr[state.index];
    if(state.kind==='photo'){
      title.textContent='Profile Photos';
      body.innerHTML=`<img class="uc-profile-media-large-image" src="${H(photoSrc(v,'w2000'))}" alt="Submitted profile photo" referrerpolicy="no-referrer"><a class="btn secondary small uc-media-original" href="${H(v)}" target="_blank" rel="noopener">Open Original</a>`;
    }else{
      const id=youtubeId(v);title.textContent='Profile Videos / Work';
      body.innerHTML=id?`<iframe class="uc-profile-media-video" src="https://www.youtube-nocookie.com/embed/${H(id)}?autoplay=1&rel=0" title="Submitted profile video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><a class="btn secondary small uc-media-original" href="${H(v)}" target="_blank" rel="noopener">Open on YouTube</a>`:`<div class="error">This YouTube link could not be previewed.</div>`;
    }
    if(counter)counter.textContent=`${state.index+1} of ${arr.length}`;
  }
  function stripHtml(kind,links){
    const label=kind==='photo'?'Photos':'Videos / Work',empty=kind==='photo'?'No photo links were submitted.':'No video links were submitted.';
    return `<section class="uc-profile-media-section"><div class="uc-profile-media-section-head"><div><h3>${label}</h3><p class="muted">${kind==='photo'?'Google Drive photos submitted with this profile.':'YouTube dance clips or optional links submitted with this profile.'}</p></div></div>${links.length?`<div class="uc-profile-media-strip-shell"><button class="uc-profile-media-strip-arrow left" type="button" aria-label="Scroll ${label} left" onclick="UCProfileMediaAdmin.moveStrip('${kind}',-1)">‹</button><div class="uc-profile-media-strip" id="ucProfileMediaStrip_${kind}">${links.map((v,i)=>kind==='photo'?`<button class="uc-profile-media-thumb" type="button" onclick="UCProfileMediaAdmin.open('photo',${i})"><img src="${H(photoSrc(v))}" alt="Submitted profile photo ${i+1}" loading="lazy" referrerpolicy="no-referrer"><span>View Photo</span></button>`:`<button class="uc-profile-media-thumb video" type="button" onclick="UCProfileMediaAdmin.open('video',${i})"><img src="${H(videoThumb(v))}" alt="Submitted profile video ${i+1}" loading="lazy"><span class="uc-profile-video-play">▶</span><span>Play Video</span></button>`).join('')}</div><button class="uc-profile-media-strip-arrow right" type="button" aria-label="Scroll ${label} right" onclick="UCProfileMediaAdmin.moveStrip('${kind}',1)">›</button></div>`:`<div class="notice uc-profile-media-empty">${empty}</div>`}</section>`;
  }
  function renderProfileSections(photos,videos){state.photo=uniq(photos);state.video=uniq(videos);return stripHtml('photo',state.photo)+stripHtml('video',state.video);}
  function open(kind,index=0){state.kind=kind;state.index=Number(index)||0;const m=ensureModal();renderStage();m.classList.add('open');}
  function close(){const m=document.getElementById('ucProfileMediaModal');if(m){m.classList.remove('open');const body=document.getElementById('ucProfileMediaStageBody');if(body)body.innerHTML='';}}
  function step(delta){const arr=state[state.kind]||[];if(!arr.length)return;state.index=(state.index+Number(delta||0)+arr.length)%arr.length;renderStage();}
  function moveStrip(kind,delta){const el=document.getElementById(`ucProfileMediaStrip_${kind}`);if(!el)return;const max=Math.max(0,el.scrollWidth-el.clientWidth),jump=Math.max(260,Math.round(el.clientWidth*.72));if(delta>0){if(el.scrollLeft>=max-8)el.scrollTo({left:0,behavior:'smooth'});else el.scrollBy({left:jump,behavior:'smooth'});}else{if(el.scrollLeft<=8)el.scrollTo({left:max,behavior:'smooth'});else el.scrollBy({left:-jump,behavior:'smooth'});}}
  window.UCProfileMediaAdmin={renderProfileSections,open,close,step,moveStrip};
  document.addEventListener('click',e=>{const m=e.target?.closest?.('#ucProfileMediaModal');if(m&&e.target===m)close();});
  document.addEventListener('keydown',e=>{const m=document.getElementById('ucProfileMediaModal');if(!m?.classList.contains('open'))return;if(e.key==='ArrowRight'){e.preventDefault();step(1);}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}});
})();
