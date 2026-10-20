/* V16.37 — public custom-page loader + saved dynamic navigation order + custom-page SEO metadata. */
(function(){'use strict';
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let navPromise=null,lastPage=null;
  const readPublic=path=>typeof window.api==='function'?window.api(path):fetch(path,{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Page lookup failed');return data;});
  async function site(){return readPublic('/api/public/site').catch(()=>({settings:{},navigation:[],navigationOrder:[]}));}
  function pathFor(n){return `/page/${encodeURIComponent(String(n.slug||'').trim())}`;}
  function localNav(rows=[],order=[]){
    if(typeof window.UCApplyDynamicCustomNavigation==='function'){window.UCApplyDynamicCustomNavigation(rows,order);return;}
    document.querySelectorAll('[data-uc-custom-nav="1"]').forEach(x=>x.remove());const nav=document.querySelector('.navlinks');if(!nav)return;const offers=nav.querySelector('.nav-dropdown .nav-dropdown-menu');const admin=nav.querySelector('.admin-login-link');
    for(const n of rows){if(!n?.slug)continue;const a=document.createElement('a');a.href=pathFor(n);a.textContent=n.page_name||n.title||n.slug||'Page';a.dataset.ucCustomNav='1';a.dataset.ucCustomPageKey=String(n.page_key||`custom:${n.slug}`);if(String(n.nav_parent||'')==='offers'&&offers){offers.appendChild(a);continue;}if(!String(n.nav_parent||'')&&admin)nav.insertBefore(a,admin);else if(!String(n.nav_parent||''))nav.appendChild(a);}
    window.UCApplyPublicNavigationOrder?.(order);
  }
  async function ensureNav(){if(!navPromise)navPromise=site();const d=await navPromise,rows=d.navigation||[],order=d.navigationOrder||[],apply=()=>{if(typeof window.UCApplyV1637Navigation==='function'&&Array.isArray(d.navigationModel))window.UCApplyV1637Navigation(d);else localNav(rows,order);};apply();return d;}
  function applyPageSeo(page,settings){const brand=settings?.siteName||'DropBeat Dance Studio',url=location.href.split('#')[0],description=String(page.short_description||page.body_text||'').replace(/\s+/g,' ').trim().slice(0,180)||`${page.title} | ${brand}`;let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=url;let md=document.querySelector('meta[name="description"]');if(!md){md=document.createElement('meta');md.name='description';document.head.appendChild(md);}md.content=description;let og=document.querySelector('meta[property="og:url"]');if(!og){og=document.createElement('meta');og.setAttribute('property','og:url');document.head.appendChild(og);}og.content=url;document.querySelector('#uc-custom-page-jsonld')?.remove();const script=document.createElement('script');script.id='uc-custom-page-jsonld';script.type='application/ld+json';script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:page.title,description,url,isPartOf:{'@type':'WebSite',name:brand,url:location.origin+'/'}});document.head.appendChild(script);}
  async function loadCustom(){
    const box=document.querySelector('#ucCustomPage');if(!box)return;
    const q=new URLSearchParams(location.search),slug=String(window.UC_CUSTOM_PAGE_SLUG||q.get('slug')||location.pathname.split('/').filter(Boolean).pop()||'').trim();
    if(!slug||slug==='custom-page'){box.innerHTML='<div class="notice">This custom page link is incomplete. Please return to the Home page and open the page from the website menu again.</div>';return;}
    try{
      const [d,p]=await Promise.all([ensureNav(),readPublic(`/api/public/pages?slug=${encodeURIComponent(slug)}`)]);
      window.prepareCommon?.(d.settings||{});
      if(!p.page){box.innerHTML='<div class="notice">This page is not available. <a href="/">Return to Home</a>.</div>';return;}
      lastPage={slug,page:p.page,site:d};await paintCustom(p.page,d);
    }catch(e){box.innerHTML=`<div class="notice error">${H(e.message||'This page could not be loaded.')}</div>`;}
  }
  async function paintCustom(page,d){const box=document.querySelector('#ucCustomPage');if(!box)return;if(!page){box.innerHTML='<div class="notice">This page is no longer available. <a href="/">Return to Home</a>.</div>';return;}
      document.title=`${page.title} | ${d.settings?.siteName||'DropBeat Dance Studio'}`;applyPageSeo(page,d.settings||{});
      const cover=Number(page.image_enabled||0)===1&&page.cover_image_url?`<figure class="uc-custom-cover"><img src="${H(page.cover_image_url)}" alt="${H(page.cover_image_alt||page.title)}"></figure>`:'';
      const body=String(page.body_html||'');
      box.innerHTML=`<div class="uc-custom-page-head">${page.page_badge?`<span class="eyebrow">${H(page.page_badge)}</span>`:''}<h1>${H(page.title)}</h1>${page.short_description?`<p class="lead">${H(page.short_description)}</p>`:''}</div>${cover}<div class="uc-custom-copy">${body}</div>${Number(page.product_display_enabled||0)===1?`<section class="uc-custom-products"><div class="uc-custom-product-head"><h2>${H(page.section_title||page.title)}</h2></div><div id="ucCustomProducts" class="product-grid"></div></section>`:''}`;
      if(Number(page.product_display_enabled||0)===1){
        const pd=await readPublic(`/api/public/products?page=${encodeURIComponent(page.page_key)}`).catch(()=>({products:[]})),products=pd.products||[],grid=document.querySelector('#ucCustomProducts');
        if(products.length){window.renderProducts?.(products,'#ucCustomProducts');}
        else if(grid){const brand=d.settings?.siteName||'DropBeat Dance Studio',title=page.empty_title||`No ${String(page.title||'offers').toLowerCase()} are running right now.`,text=page.empty_text||`We apologize, currently we do not have any ${String(page.title||'offers').toLowerCase()} running. To get a membership or customized offer, please fill in the Contact Us form; a team member from ${brand} will contact you.`;grid.classList.add('festival-grid-empty');grid.innerHTML=`<div class="notice festival-empty"><strong>${H(title)}</strong><br>${H(text).replace(/Contact Us form/g,'<a href="/contact"><strong>Contact Us form</strong></a>')}</div>`;}
      }
  }
  document.addEventListener('dropbeat:public-data-updated',event=>{
    const {path,data}=event.detail||{};if(!path||!data)return;const url=new URL(path,location.origin);
    if(url.pathname==='/api/public/site'){navPromise=Promise.resolve(data);if(lastPage)lastPage.site=data;}
    if(lastPage&&url.pathname==='/api/public/pages'&&url.searchParams.get('slug')===lastPage.slug){lastPage.page=data.page;paintCustom(data.page,lastPage.site).catch(console.warn);}
    if(lastPage&&url.pathname==='/api/public/products'&&url.searchParams.get('page')===lastPage.page?.page_key)window.renderProducts?.(data.products||[],'#ucCustomProducts');
  });
  window.UCV1634CustomPages={ensureNav,loadCustom};
  const run=()=>{ensureNav();if(document.querySelector('#ucCustomPage'))loadCustom();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
