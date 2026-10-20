/* Public SEO/security/UX helpers. Business logic remains in app.js/app-extra.js. */
(function(){
  const BASE=String(location.origin||'https://dance-class-at2.pages.dev').replace(/\/$/,'');
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function addSslBadge(){
    const policies=[...document.querySelectorAll('.footer-grid h3')].find(x=>/Policies/i.test(x.textContent||''));
    const holder=policies?.parentElement;
    if(holder&&!holder.querySelector('.ssl-badge')){
      const badge=document.createElement('div');badge.className='ssl-badge';badge.innerHTML='<span aria-hidden="true">🔒</span><strong>SSL Certified</strong><small>Secure HTTPS website</small>';holder.appendChild(badge);
    }
  }

  function addDropbeatHomeSections(){
    if(document.body?.dataset?.ucLoad!=='home'||document.querySelector('.dropbeat-quick-strip'))return;
    const hero=document.querySelector('.hero-shell');if(!hero)return;
    hero.insertAdjacentHTML('afterend',`<section class="dropbeat-quick-strip" aria-label="Dance class highlights"><div class="container dropbeat-quick-strip-inner"><div><span>Dance Classes</span><strong>Studio &amp; Online</strong></div><div><span>All Levels</span><strong>Learn at Your Pace</strong></div><div><span>Flexible Access</span><strong>Plans That Fit</strong></div><a class="dropbeat-strip-action" href="/submit-profile">Book the Class <span aria-hidden="true">→</span></a></div></section><section class="dropbeat-welcome section"><div class="container dropbeat-welcome-grid"><div id="dropbeatStudioVisual" class="dropbeat-welcome-visual" role="region" aria-roledescription="carousel" aria-label="DropBeat Studio images"></div><div class="dropbeat-welcome-copy"><span class="eyebrow">Welcome to</span><h2>DropBeat Studio</h2><p class="lead">Move with confidence in dance classes designed for beginners, enthusiasts and experienced dancers—online or in the studio.</p><div class="dropbeat-feature-list"><div><span>01</span><strong>Multiple dance styles</strong><small>Explore classes and workshops that match your interests.</small></div><div><span>02</span><strong>Friendly instruction</strong><small>Build technique, rhythm and confidence step by step.</small></div><div><span>03</span><strong>Flexible ways to learn</strong><small>Choose studio, online or hybrid membership options.</small></div></div><a class="btn" href="/about">Discover DropBeat</a></div></div></section>`);
    loadDropbeatStudioGallery();
  }

  async function loadDropbeatStudioGallery(){
    const host=document.querySelector('#dropbeatStudioVisual');if(!host)return;
    try{
      const data=typeof window.api==='function'?await window.api('/api/public/studio-gallery'):await (await fetch('/api/public/studio-gallery',{headers:{Accept:'application/json'}})).json();
      const images=Array.isArray(data.images)?data.images.filter(item=>item&&item.image_url):[];
      if(!images.length){host.dataset.galleryState='fallback';return;}
      const fragment=document.createDocumentFragment(),slides=document.createElement('div'),dots=document.createElement('div');
      slides.className='dropbeat-studio-slides';dots.className='dropbeat-studio-dots';dots.setAttribute('aria-label','Choose a DropBeat Studio image');
      images.forEach((item,index)=>{
        const img=document.createElement('img');img.className='dropbeat-studio-slide';img.src=String(item.image_url);img.alt=String(item.alt_text||'DropBeat Studio dance class');img.loading=index===0?'eager':'lazy';img.decoding='async';img.dataset.studioSlide=String(index);slides.appendChild(img);
        if(images.length>1){const dot=document.createElement('button');dot.type='button';dot.className='dropbeat-studio-dot';dot.dataset.studioDot=String(index);dot.setAttribute('aria-label',`Show studio image ${index+1} of ${images.length}`);dots.appendChild(dot);}
      });
      const tint=document.createElement('span');tint.className='dropbeat-studio-tint';tint.setAttribute('aria-hidden','true');
      fragment.append(slides,tint);if(images.length>1)fragment.append(dots);host.replaceChildren(fragment);host.dataset.galleryState='ready';
      const slideNodes=[...host.querySelectorAll('[data-studio-slide]')],dotNodes=[...host.querySelectorAll('[data-studio-dot]')];let current=0,timer=0;
      const show=index=>{current=(Number(index)+slideNodes.length)%slideNodes.length;slideNodes.forEach((slide,i)=>{const active=i===current;slide.classList.toggle('active',active);slide.setAttribute('aria-hidden',String(!active));});dotNodes.forEach((dot,i)=>{const active=i===current;dot.classList.toggle('active',active);dot.setAttribute('aria-current',active?'true':'false');});};
      const stop=()=>{clearInterval(timer);timer=0;};
      const start=()=>{stop();if(slideNodes.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(current+1),5200);};
      dotNodes.forEach(dot=>dot.addEventListener('click',()=>{show(dot.dataset.studioDot);start();}));
      host.addEventListener('mouseenter',stop);host.addEventListener('mouseleave',start);host.addEventListener('focusin',stop);host.addEventListener('focusout',start);
      document.addEventListener('visibilitychange',()=>document.hidden?stop():start());show(0);start();
    }catch(_){host.dataset.galleryState='fallback';}
  }

  function setupOffersDropdown(){
    const nav=document.querySelector('.navlinks');if(!nav||nav.dataset.ucV1637==='1')return;
    let wrap=nav.querySelector('.nav-dropdown');
    if(!wrap){
      const offer=[...nav.querySelectorAll(':scope > a')].find(a=>/^Offers$/i.test((a.textContent||'').trim()));
      if(!offer)return;
      wrap=document.createElement('span');wrap.className='nav-dropdown';offer.parentNode.insertBefore(wrap,offer);wrap.appendChild(offer);
      const menu=document.createElement('span');menu.className='nav-dropdown-menu';wrap.appendChild(menu);
    }
    const top=wrap.querySelector(':scope > a');if(top){top.href='/offers';top.textContent='Offers';top.classList.add('nav-top-link');}
    const menu=wrap.querySelector('.nav-dropdown-menu');if(menu)menu.innerHTML='<a href="/offers">Memberships</a><a href="/festival-offers">Festival Offers</a><a href="/yearly-plans">Yearly Plans</a>';
    nav.querySelectorAll(':scope > a,.nav-dropdown > a').forEach(a=>a.classList.add('nav-top-link'));
  }

  function injectCodeOnce(code,key,target){
    code=String(code||'').trim();if(!code)return;
    const baseId='uc-ad-'+key+'-'+target;if(document.querySelector(`[data-uc-ad="${baseId}"]`))return;
    const template=document.createElement('template');template.innerHTML=code;
    const nodes=Array.from(template.content.childNodes).filter(n=>n.nodeType===1);
    if(nodes.length){
      nodes.forEach((node,i)=>{
        let out=node.cloneNode(true);
        if(node.tagName==='SCRIPT'){
          out=document.createElement('script');Array.from(node.attributes).forEach(a=>out.setAttribute(a.name,a.value));out.textContent=node.textContent||'';
        }
        out.dataset.ucAd=baseId;out.dataset.ucAdIndex=String(i);(target==='head'?document.head:document.body).appendChild(out);
      });
    }else{
      const out=target==='head'?document.createElement('script'):document.createElement('div');out.dataset.ucAd=baseId;if(target==='head')out.textContent=code;else{out.className='ad-network-body-code';out.innerHTML=code;}(target==='head'?document.head:document.body).appendChild(out);
    }
  }
  function applyAdIntegrations(settings){
    if(document.body?.dataset?.ucLoad==='blog-post' && window.__ucArticleAutoAds!==true)return;
    if(!window.UCConsent?.allows?.('ads'))return;
    const ai=settings?.adIntegrations||{};
    const built=[['adsense',ai.googleAdsense],['adsterra',ai.adsterra],['medianet',ai.mediaNet]];
    const custom=Array.isArray(ai.customNetworks)?ai.customNetworks:[];
    [...built,...custom.map((n,i)=>['custom-'+i,n])].forEach(([key,n])=>{if(!n?.enabled)return;injectCodeOnce(n.headCode,key,'head');injectCodeOnce(n.bodyCode,key,'body');});
  }

  function addBaseSchema(settings=window.__ucLatestSettings||{}){
    const brand=String(settings.siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio',logo=new URL(settings.logoUrl||'/assets/dropbeat-logo.svg',location.origin).href;
    const data={
      '@context':'https://schema.org','@graph':[
        {'@type':'Organization','@id':BASE+'/#organization','name':brand,'url':BASE+'/','logo':{'@type':'ImageObject','url':logo}},
        {'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':brand,'publisher':{'@id':BASE+'/#organization'},'inLanguage':'en-IN'}
      ]
    };
    let s=document.getElementById('uc-base-jsonld');if(!s){s=document.createElement('script');s.id='uc-base-jsonld';s.type='application/ld+json';document.head.appendChild(s);}s.textContent=JSON.stringify(data);
  }

  window.ucUpdateProductSchema=function(products,selector){
    const old=document.getElementById('uc-products-jsonld');if(old)old.remove();
    if(!products?.length)return;
    const items=products.map((p,i)=>({
      '@type':'Product','position':i+1,'name':String(p.name||''),'description':String(p.short_description||''),
      'url':BASE+'/offers#'+encodeURIComponent(p.slug||''),
      ...(p.images?.[0]?.public_url?{'image':new URL(p.images[0].public_url,BASE).href}:{}),
      'offers':{'@type':'Offer','priceCurrency':'INR','price':String(Number(p.offer_price_paise||0)/100),'availability':'https://schema.org/InStock','url':BASE+'/offers#'+encodeURIComponent(p.slug||'')}
    }));
    const brand=String(window.__ucLatestSettings?.siteName||'DropBeat Dance Studio').trim()||'DropBeat Dance Studio',s=document.createElement('script');s.id='uc-products-jsonld';s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList','name':selector==='#festivalGrid'?'Festival Offers':`${brand} Memberships`,'itemListElement':items});document.head.appendChild(s);
  };

  const oldApply=window.applySettings;
  window.applySettings=function(settings){if(typeof oldApply==='function')oldApply(settings);applyAdIntegrations(settings);addSslBadge();setupOffersDropdown();addBaseSchema(settings);};
  window.addEventListener('uc-consent-change',()=>{if(window.__ucLatestSettings)applyAdIntegrations(window.__ucLatestSettings);});

  ready(()=>{document.documentElement.classList.add('uc-clean-hero');addSslBadge();setupOffersDropdown();addBaseSchema();addDropbeatHomeSections();});
})();
