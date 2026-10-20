/* Final V6 public Maps + Google Reviews. Adds sections only when admin enabled/configured them. */
(function(){
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function data(){try{const r=await fetch('/api/public/maps-reviews',{headers:{accept:'application/json'}});return r.ok?await r.json():null;}catch(_){return null;}}
  function safeUrl(v){try{const u=new URL(String(v||''),location.origin);return /^https:$/.test(u.protocol)?u.href:'';}catch(_){return '';}}
  function renderReviews(r){
    const anchor=document.querySelector('#successStoriesGrid')?.closest('section');
    if(!anchor||!r?.enabled||!Array.isArray(r.reviews)||!r.reviews.length||document.querySelector('#ucGoogleReviewsSection'))return;
    const all=safeUrl(r.mapsUrl),section=document.createElement('section');section.id='ucGoogleReviewsSection';section.className='section uc-google-reviews-section';
    section.innerHTML=`<div class="container"><div class="section-head"><div><span class="eyebrow">Google Reviews</span><h2>What our customers say</h2><p class="lead">Recent high-rating reviews from our connected Google business profile.</p></div>${all?`<a class="btn secondary" href="${H(all)}" target="_blank" rel="noopener noreferrer">View All Reviews</a>`:''}</div><div class="uc-google-review-grid">${r.reviews.slice(0,4).map(x=>{
      const rating=Math.max(1,Math.min(5,Math.round(Number(x.rating||0)))),author=H(x.author||'Google reviewer'),text=H(x.text||'Rating shared on Google.'),date=x.publishTime?new Date(x.publishTime):null,dateText=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):H(x.relativeTime||'');
      return `<article class="card uc-google-review-card"><div class="uc-google-review-top"><span class="uc-google-source">Google Review</span><span class="uc-google-stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span></div><p class="uc-google-review-text">${text}</p><div class="uc-google-review-person"><strong>${author}</strong>${dateText?`<small>${H(dateText)}</small>`:''}</div></article>`;
    }).join('')}</div>${all?`<div class="uc-google-review-mobile-link"><a class="btn secondary" href="${H(all)}" target="_blank" rel="noopener noreferrer">View All Reviews</a></div>`:''}</div>`;
    anchor.insertAdjacentElement('afterend',section);
  }
  function renderMaps(c){
    const form=document.querySelector('#contactForm');if(!form||!c?.enabled||!Array.isArray(c.locations)||!c.locations.length||document.querySelector('#ucContactMapSection'))return;
    const section=document.createElement('section');section.id='ucContactMapSection';section.className='uc-contact-map-section';
    const locs=c.locations.filter(x=>x&&(x.embedSrc||x.directionsUrl));if(!locs.length)return;
    section.innerHTML=`<div class="uc-map-section-head"><div><span class="eyebrow">Our Location${locs.length>1?'s':''}</span><h2>${locs.length>1?'Find our offices':'Find the office'}</h2><p>Use the interactive map or Get Directions to reach the selected location.</p></div></div><div class="uc-public-map-grid ${locs.length===1?'single':''}">${locs.map(x=>{
      const embed=safeUrl(x.embedSrc),directions=safeUrl(x.directionsUrl);return `<article class="uc-public-map-card"><div class="uc-public-map-copy"><div><h3>${H(x.label||'Location')}</h3>${x.address?`<p>${H(x.address)}</p>`:''}</div>${directions?`<a class="btn secondary" href="${H(directions)}" target="_blank" rel="noopener noreferrer">Get Directions</a>`:''}</div>${embed?`<div class="uc-map-frame"><iframe src="${H(embed)}" title="Google Map — ${H(x.label||'location')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`:''}</article>`;
    }).join('')}</div>`;
    const parent=form.parentElement||form;parent.insertBefore(section,form.nextSibling);
  }
  async function init(){const d=await data();if(!d)return;renderReviews(d.reviews);renderMaps(d.contactMap);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
