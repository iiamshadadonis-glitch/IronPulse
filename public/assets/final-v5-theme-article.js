
/* Final V5 public theme application and article rendering. */
(function(){
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||'').trim());}
  function norm(v,f){v=String(v||'').trim();if(!v.startsWith('#'))v='#'+v;return validHex(v)?v.toUpperCase():f;}
  function rgb(hex){hex=norm(hex,'#000000').slice(1);return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];}
  function rgbHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function toHsl([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;let h=0,s=0;if(d){s=l>.5?d/(2-max-min):d/(max+min);if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return [h,s*100,l*100];}
  function fromHsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return rgbHex((r+m)*255,(g+m)*255,(b+m)*255);}
  function svgArrow(color){const c=encodeURIComponent(color);return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='11.5' fill='none' stroke='${c}' stroke-width='1.8'/%3E%3Cpath d='M9.5 11.5 14 16l4.5-4.5' fill='none' stroke='${c}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;}
  function applyTheme(settings){
    const ORIGINAL_PRIMARY='#4B55BE',ORIGINAL_ACCENT='#A469A8';
    const primary=norm(settings?.primaryColor,ORIGINAL_PRIMARY),accent=norm(settings?.accentColor,ORIGINAL_ACCENT);
    const original=primary===ORIGINAL_PRIMARY&&accent===ORIGINAL_ACCENT;
    const [h,s,l]=toHsl(rgb(primary));
    const dark=original?'#1A1A1A':fromHsl(h,Math.max(35,s),Math.max(10,Math.min(32,l*.42)));
    const mid=original?'#B11226':fromHsl(h,Math.max(38,Math.min(92,s)),Math.max(18,Math.min(48,l*1.38)));
    const highlight=original?'#A469A8':accent;
    const purple=original?'#5B21B6':primary;
    const soft=original?'#FFF4D1':fromHsl(h,Math.min(75,s),96);
    const root=document.documentElement.style;
    const setRgb=(name,hex)=>root.setProperty(name,rgb(hex).join(','));
    root.setProperty('--blue',primary);
    root.setProperty('--blue-dark',dark);
    root.setProperty('--blue-mid',mid);
    root.setProperty('--sky',accent);
    root.setProperty('--accent',highlight);
    root.setProperty('--purple',purple);
    root.setProperty('--spotlight',soft);
    setRgb('--blue-rgb',primary);
    setRgb('--blue-dark-rgb',dark);
    setRgb('--sky-rgb',accent);
    setRgb('--accent-rgb',highlight);
    root.setProperty('--uc-select-arrow',svgArrow(primary));
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=primary;
  }
  const oldApply=window.applySettings;
  if(typeof oldApply==='function')window.applySettings=function(settings){const r=oldApply(settings);applyTheme(settings||{});return r;};

  function parseAds(raw){try{const v=typeof raw==='string'?JSON.parse(raw):raw;return Array.isArray(v)?v:[]}catch(_){return [];}}
  function isImage(url){return /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(String(url||''));}
  function adBox(ad){
    const type=H(ad.type||'Advertisement'),place=H(ad.placement||'In article'),size=H(ad.size||'Auto responsive');
    const code=String(ad.code||ad.url||'').trim(),redirect=String(ad.redirect_url||'').trim(),custom=!!(ad.custom||ad.is_custom||/Custom Advertisement|Custom Ad/i.test(ad.type||''));
    if(!code)return '';
    if(custom){
      const image=`<img src="${H(code)}" alt="Sponsored advertisement" loading="lazy">`;
      const linked=redirect?`<a href="${H(redirect)}" target="_blank" rel="sponsored noopener">${image}</a>`:image;
      return `<aside class="ad-slot custom-sponsored-ad ad-${H((ad.placement||'in-article').replace(/\s+/g,'-').toLowerCase())}"><small>Advertisement • ${place} • ${size}</small>${linked}</aside>`;
    }
    const content=/<\w|<script|<ins|<iframe/i.test(code)?code:(isImage(code)?`<img src="${H(code)}" alt="${type}" loading="lazy">`:`<a href="${H(code)}" target="_blank" rel="sponsored noopener">${H(code)}</a>`);
    return `<aside class="ad-slot ad-${H((ad.placement||'in-article').replace(/\s+/g,'-').toLowerCase())}"><small>${type} • ${place} • ${size}</small>${content}</aside>`;
  }
  function injectAds(bodyHtml,ads){
    if(!ads.length)return bodyHtml;
    const top=ads.filter(a=>/top|header|before/i.test(a.placement||'')).map(adBox).join('');
    const first=ads.filter(a=>/after first/i.test(a.placement||'')).map(adBox).join('');
    const bottom=ads.filter(a=>/bottom|after update|footer/i.test(a.placement||'')).map(adBox).join('');
    const middle=ads.filter(a=>!/top|header|before|after first|bottom|after update|footer/i.test(a.placement||'')).map(adBox).join('');
    let body=String(bodyHtml||'');
    if(first){
      const m=body.match(/<\/p>/i);
      body=m?body.slice(0,m.index+m[0].length)+first+body.slice(m.index+m[0].length):first+body;
    }
    return `${top}${body}${middle}${bottom}`;
  }
  async function api(path){const r=await fetch(path,{credentials:'same-origin'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request failed');return data;}
  async function loadBlogPostV5(){
    const slug=new URLSearchParams(location.search).get('slug')||window.UC_BLOG_SLUG||location.pathname.split('/').filter(Boolean).pop();
    const [site,res]=await Promise.all([api('/api/public/site').catch(()=>({settings:{}})),api(`/api/public/blogs?slug=${encodeURIComponent(slug||'')}`)]);
    const p=res.post,box=document.querySelector('#blogPost');if(!box)return;
    if(!p){if(window.prepareCommon)window.prepareCommon(site.settings||{});box.innerHTML='<h1>Dance tip not found</h1>';return;}
    window.__ucArticleAutoAds=!!Number(p.auto_ads_enabled||0);
    if(window.prepareCommon)window.prepareCommon(site.settings||{});else if(window.loadCommon)await window.loadCommon();
    const ads=parseAds(p.ads_json);
    const cover=p.cover_image_url?`<img class="article-cover" src="${H(p.cover_image_url)}" alt="${H(p.title||'Dance tip')}" loading="eager" fetchpriority="high">`:'';
    box.innerHTML=`<h1>${H(p.title)}</h1>${cover}<p class="lead">${H(p.excerpt||'')}</p>${p.tags?.length?`<p>${p.tags.map(t=>`<span class="badge">${H(t)}</span>`).join(' ')}</p>`:''}${injectAds(p.body_html,ads)}`;
  }
  if(window.UC)window.UC.loadBlogPost=loadBlogPostV5;
})();
