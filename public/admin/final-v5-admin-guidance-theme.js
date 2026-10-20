
/* Final V5 additive admin guidance + theme controls. Existing business logic is preserved. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const INR=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const ORIGINAL={primary:'#4B55BE',accent:'#A469A8',palette:'custom'};

  function toast(text,type='success'){
    if(window.ucAdminToast)return window.ucAdminToast(text,type);
    const box=document.createElement('div');box.className=type==='error'?'error':'success';box.textContent=text;
    document.body.appendChild(box);setTimeout(()=>box.remove(),3200);
  }
  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||'').trim());}
  function normHex(v,fallback){v=String(v||'').trim();if(!v.startsWith('#'))v='#'+v;return validHex(v)?v.toUpperCase():fallback;}
  function selectArrowSvg(color){const c=encodeURIComponent(normHex(color,ORIGINAL.primary));return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='11.5' fill='none' stroke='${c}' stroke-width='1.8'/%3E%3Cpath d='M9.5 11.5 14 16l4.5-4.5' fill='none' stroke='${c}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`; }
  function hexToRgb(hex){hex=normHex(hex,'#000000').slice(1);return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];}
  function rgbToHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0,l=(max+min)/2,d=max-min;if(d){s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0));break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h*=60;}return [Math.round(h),Math.round(s*100),Math.round(l*100)];}
  function hslToHex(h,s,l){h=((Number(h)%360)+360)%360;s=Math.max(0,Math.min(100,Number(s)))/100;l=Math.max(0,Math.min(100,Number(l)))/100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);}
  function paletteAccent(primary,type){
    const [h,s,l]=rgbToHsl(...hexToRgb(primary));
    if(type==='monochromatic')return hslToHex(h,Math.max(35,s),l>55?Math.max(22,l-30):Math.min(82,l+32));
    if(type==='analogous')return hslToHex(h+30,s,l);
    if(type==='triadic')return hslToHex(h+120,s,l);
    if(type==='tetradic')return hslToHex(h+90,s,l);
    if(type==='complementary')return hslToHex(h+180,s,l);
    return null;
  }
  function themePresetColors(primary,accent){
    const [h,s,l]=rgbToHsl(...hexToRgb(primary));
    return [primary,hslToHex(h,Math.max(20,s-18),Math.min(94,l+34)),accent,hslToHex(h,Math.min(100,s+8),Math.max(12,l-24))];
  }

  function colorEditor(field,input,key){
    if(!field||field.dataset.ucColorEnhanced)return;
    field.dataset.ucColorEnhanced='1';
    const label=field.querySelector('label'); if(label) label.textContent=key==='primary'?'Primary Color':'Accent Color';
    const initial=normHex(input.value,key==='primary'?ORIGINAL.primary:ORIGINAL.accent);
    let lastValid=initial;
    input.value=initial;
    const oldHint=field.querySelector('.hint');if(oldHint)oldHint.remove();
    const children=[...field.childNodes].filter(n=>n!==label&&n!==input);children.forEach(n=>n.remove());
    const wrap=document.createElement('div');wrap.className='uc-color-code-row';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const pick=document.createElement('button');pick.type='button';pick.className='uc-eyedropper';pick.title='Pick a color from the screen';pick.setAttribute('aria-label','Pick color');
    pick.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.7 5.3 18.7 9.3M13.4 6.6l4 4M4 20l4.4-1.1L18.9 8.4a2.1 2.1 0 0 0 0-3l-.3-.3a2.1 2.1 0 0 0-3 0L5.1 15.6 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.appendChild(pick);
    const native=document.createElement('input');native.type='color';native.className='uc-hidden-color';native.value=initial;wrap.appendChild(native);
    const title=document.createElement('div');title.className='uc-color-editor-title';
    const sw=document.createElement('span');sw.className='uc-color-swatch';sw.style.background=initial;
    const strong=document.createElement('strong');strong.textContent=key==='primary'?'Primary':'Accent';
    title.append(sw,strong);field.insertBefore(title,wrap);
    const grid=document.createElement('div');grid.className='uc-hsl-grid';
    const labels=[['Hue',0,360],['Saturation',0,100],['Luminance',0,100]];
    labels.forEach(([name,min,max],idx)=>{
      const row=document.createElement('label');row.className='uc-range-row';
      row.innerHTML=`<span>${name}</span><input type="range" min="${min}" max="${max}" step="1" data-hsl-index="${idx}"><output></output>`;
      grid.appendChild(row);
    });
    field.appendChild(grid);
    field.classList.add('uc-color-editor');
    field.dataset.colorKey=key;

    function syncSliders(){
      const hsl=rgbToHsl(...hexToRgb(input.value));
      grid.querySelectorAll('input[type=range]').forEach((r,i)=>{r.value=hsl[i];r.nextElementSibling.textContent=(i===0?hsl[i]+'°':hsl[i]+'%');});
      const ranges=[...grid.querySelectorAll('input[type=range]')];
      if(ranges[0])ranges[0].style.background='linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
      if(ranges[1])ranges[1].style.background=`linear-gradient(90deg,${hslToHex(hsl[0],0,hsl[2])},${hslToHex(hsl[0],100,hsl[2])})`;
      if(ranges[2])ranges[2].style.background=`linear-gradient(90deg,#000000,${hslToHex(hsl[0],hsl[1],50)},#FFFFFF)`;
      if(validHex(input.value))lastValid=input.value.toUpperCase();
      sw.style.background=input.value;native.value=input.value;updateThemePreview();
    }
    function fromSliders(){
      const vals=[...grid.querySelectorAll('input[type=range]')].map(r=>Number(r.value));
      input.value=hslToHex(...vals);syncSliders();
    }
    input.addEventListener('input',()=>{const v=normHex(input.value,'');if(v){input.value=v;syncSliders();}});
    input.addEventListener('blur',()=>{input.value=normHex(input.value,lastValid);syncSliders();});
    grid.querySelectorAll('input[type=range]').forEach(r=>r.addEventListener('input',fromSliders));
    native.addEventListener('input',()=>{input.value=native.value.toUpperCase();syncSliders();});
    pick.addEventListener('click',async()=>{
      try{
        if(window.EyeDropper){const result=await new EyeDropper().open();if(result?.sRGBHex){input.value=result.sRGBHex.toUpperCase();syncSliders();return;}}
      }catch(_){return;}
      native.click();
    });
    field.ucSyncColor=syncSliders;syncSliders();
  }

  const PRESETS=[
    ['Original','#4B55BE','#A469A8'],['Cinema','#3B1D4A','#F28A3E'],['Ocean','#006D77','#83C5BE'],
    ['Royal','#4C1D95','#F59E0B'],['Forest','#14532D','#D4A72C'],['Slate','#334155','#38BDF8'],
    ['Rose','#9F1239','#FBBF24'],['Teal','#115E59','#FB7185']
  ];
  function updateThemePreview(){
    const form=$('#settings form');if(!form)return;
    const p=normHex(form.elements.primaryColor?.value,ORIGINAL.primary),a=normHex(form.elements.accentColor?.value,ORIGINAL.accent);
    document.documentElement.style.setProperty('--uc-v5-brand',p);
    document.documentElement.style.setProperty('--uc-admin-select-arrow',selectArrowSvg(p));
    const preview=form.querySelector('.uc-theme-preview');if(preview){preview.children[0].style.background=p;preview.children[1].style.background=a;}
    form.querySelectorAll('.uc-color-editor').forEach(f=>{const inp=f.querySelector('input[name]');if(inp&&f.querySelector('.uc-color-swatch'))f.querySelector('.uc-color-swatch').style.background=inp.value;});
  }
  function setThemeColors(primary,accent,palette){
    const form=$('#settings form');if(!form)return;
    form.elements.primaryColor.value=normHex(primary,ORIGINAL.primary);
    form.elements.accentColor.value=normHex(accent,ORIGINAL.accent);
    if(form.elements.colorPaletteType)form.elements.colorPaletteType.value=palette||'custom';
    form.querySelectorAll('.uc-color-editor').forEach(f=>f.ucSyncColor?.());
    updateThemePreview();
  }
  function enhanceSiteSettings(){
    const form=$('#settings form');if(!form||form.dataset.ucThemeBuilder)return;
    form.dataset.ucThemeBuilder='1';
    const primary=form.elements.primaryColor,accent=form.elements.accentColor;
    if(!primary||!accent)return;
    const pField=primary.closest('.field'),aField=accent.closest('.field'),originalRow=pField?.closest('.row');
    if(!pField||!aField||!originalRow)return;
    const builder=document.createElement('section');builder.className='uc-theme-builder';
    builder.innerHTML=`<div class="uc-theme-builder-head"><div><h3>Website Colors</h3><p class="muted">Pick colors visually, adjust HSL, choose a palette, or restore the original designer theme.</p></div><button type="button" class="btn secondary compact uc-theme-reset">Reset Colors</button></div><div class="uc-palette-select-row"><div class="field"><label>Palette Type</label><select name="colorPaletteType"><option value="complementary">Complementary</option><option value="monochromatic">Monochromatic</option><option value="analogous">Analogous</option><option value="triadic">Triadic</option><option value="tetradic">Tetradic</option><option value="custom">Custom</option></select></div><div class="uc-palette-note">Changing the palette type suggests an accent color. You can still fine-tune both colors afterward.</div></div><div class="uc-color-editors"></div><div class="uc-theme-preview-wrap"><strong>Current Preview</strong><div class="uc-theme-preview"><span></span><span></span></div></div><div class="uc-theme-presets-title"><strong>Pre-built Themes</strong><small class="muted">Click any theme to preview it.</small></div><div class="uc-theme-presets"></div>`;
    originalRow.parentNode.insertBefore(builder,originalRow);originalRow.remove();
    const editorBox=builder.querySelector('.uc-color-editors');editorBox.append(pField,aField);
    colorEditor(pField,primary,'primary');colorEditor(aField,accent,'accent');
    const select=builder.querySelector('[name=colorPaletteType]');
    select.value=(typeof A!=='undefined'&&A.settings?.colorPaletteType)||'custom';
    select.addEventListener('change',()=>{
      const type=select.value;if(type!=='custom'){const next=paletteAccent(primary.value,type);if(next){accent.value=next;aField.ucSyncColor?.();}}
      updateThemePreview();
    });
    builder.querySelector('.uc-theme-reset').addEventListener('click',async()=>{
      setThemeColors(ORIGINAL.primary,ORIGINAL.accent,ORIGINAL.palette);
      try{
        let current=(typeof A!=='undefined'&&A.settings)?A.settings:null;
        if(!current){const r=await api('/api/admin/settings');current=r.settings||{};}
        const next={...(current||{}),primaryColor:ORIGINAL.primary,accentColor:ORIGINAL.accent,colorPaletteType:ORIGINAL.palette};
        await api('/api/admin/settings',{method:'POST',body:JSON.stringify(next)});
        if(typeof A!=='undefined')A.settings=next;
        toast('Original website colors restored.','success');
      }catch(err){toast(err.message||'Could not reset the website colors.','error');}
    });
    const presets=builder.querySelector('.uc-theme-presets');
    PRESETS.forEach(([name,p,a])=>{
      const b=document.createElement('button');b.type='button';b.className='uc-theme-preset';
      b.innerHTML=`<span class="uc-theme-preset-swatches">${themePresetColors(p,a).map(c=>`<span style="background:${c}"></span>`).join('')}</span><small>${H(name)}</small>`;
      b.onclick=()=>setThemeColors(p,a,'custom');presets.appendChild(b);
    });
    updateThemePreview();
  }

  const oldLoadSettings=window.load_settings;
  if(typeof oldLoadSettings==='function')window.load_settings=async function(){
    const r=await oldLoadSettings.apply(this,arguments);setTimeout(()=>{enhanceSiteSettings();const f=$('#settings form');if(f?.elements.colorPaletteType)f.elements.colorPaletteType.value=(typeof A!=='undefined'&&A.settings?.colorPaletteType)||'custom';f?.querySelectorAll('.uc-color-editor').forEach(x=>x.ucSyncColor?.());updateThemePreview();},20);return r;
  };
  const oldSaveSettings=window.saveSettings;
  if(typeof oldSaveSettings==='function')window.saveSettings=async function(e){
    const form=e?.currentTarget||$('#settings form');
    if(form){
      const p=normHex(form.elements.primaryColor?.value,''),a=normHex(form.elements.accentColor?.value,'');
      if(!p||!a){e?.preventDefault?.();toast('Choose valid colors with the picker or use a 6-digit HEX code such as #4B55BE.','error');return;}
      form.elements.primaryColor.value=p;form.elements.accentColor.value=a;
      if(form.elements.colorPaletteType&&typeof A!=='undefined')A.settings={...(A.settings||{}),colorPaletteType:form.elements.colorPaletteType.value||'custom'};
    }
    return oldSaveSettings.apply(this,arguments);
  };

  function infoIconSvg(){return `<svg class="uc-info-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="10.4" r="1.55" fill="currentColor"/><path d="M14.6 14.4h1.7v7.1c0 1 .45 1.5 1.45 1.5h.55" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
  function backIconSvg(){return `<svg class="uc-back-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.3 10.8 9.6 15.5l4.7 4.7M10.3 15.5h7.1c3.3 0 5.1 1.7 5.1 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
  function infoButton(label='Open help and instructions'){
    const b=document.createElement('button');b.type='button';b.className='uc-info-btn';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=infoIconSvg();return b;
  }
  function backButton(host,label='Back to form'){
    const b=document.createElement('button');b.type='button';b.className='uc-info-back-btn';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=backIconSvg();
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();host.classList.remove('uc-info-open');host.classList.remove('uc-detail-info-open');const sc=host.querySelector('.uc-info-back-panel');if(sc)sc.scrollTop=0;});return b;
  }
  function buildBackPanel(host,helpHtml){
    const back=document.createElement('div');back.className='uc-info-back-panel';
    const head=document.createElement('div');head.className='uc-info-back-head';head.appendChild(backButton(host));
    const body=document.createElement('div');body.className='uc-info-back-body';body.innerHTML=helpHtml;
    back.append(head,body);return back;
  }
  function makeCardFlippable(host,helpHtml){
    if(!host||host.dataset.ucInfoFlip)return;host.dataset.ucInfoFlip='1';host.classList.add('uc-info-host');
    const toolbar=document.createElement('div');toolbar.className='uc-info-toolbar';const btn=infoButton();toolbar.appendChild(btn);
    host.prepend(toolbar);const back=buildBackPanel(host,helpHtml);host.appendChild(back);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();host.classList.add('uc-info-open');back.scrollTop=0;});
  }
  function makeDetailsFlippable(details,helpHtml){
    if(!details||details.dataset.ucInfoFlip)return;details.dataset.ucInfoFlip='1';details.classList.add('uc-info-detail');
    const summary=details.querySelector(':scope>summary');if(!summary)return;
    const toolbar=document.createElement('div');toolbar.className='uc-info-toolbar uc-detail-info-toolbar';const btn=infoButton();toolbar.appendChild(btn);
    summary.insertAdjacentElement('afterend',toolbar);const back=buildBackPanel(details,helpHtml);details.appendChild(back);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();details.open=true;details.classList.add('uc-detail-info-open');back.scrollTop=0;});
    details.addEventListener('toggle',()=>{if(!details.open){details.classList.remove('uc-detail-info-open');back.scrollTop=0;}});
  }

  window.ucMakeInfoCard=makeCardFlippable;
  window.ucMakeInfoDetails=makeDetailsFlippable;

  const HELP={
    subscription:`<h3>Create a Subscription Link</h3><p class="uc-help-lead">Use this when the customer should be charged automatically at a repeating interval. Fill the fields in order, check the duration shown below Total Billing Cycles, then generate the link.</p>
      <h4>1. Customer</h4><ul><li><strong>Customer Name:</strong> who the link is for. Example: <em>Arjun Rao</em>.</li><li><strong>Contact Phone:</strong> the customer's WhatsApp/mobile number used with the payment record.</li><li><strong>Customer Email:</strong> optional but useful for receipts and future search.</li></ul>
      <h4>2. Plan</h4><ul><li><strong>Plan Name:</strong> clear customer-facing label, such as <em>Member Access – Monthly</em>.</li><li><strong>Subscription Type:</strong> Monthly or Yearly is the broad plan type.</li><li><strong>Billing Frequency:</strong> exactly how often the recurring amount is due. <em>Every 1 Month</em> means one charge every month; <em>Every 3 Months</em> means one charge every three months.</li><li><strong>Subscription Amount:</strong> recurring amount charged from the selected Subscription Start Date and on each later billing date.</li><li><strong>Subscription Start Date:</strong> the date on which the recurring Subscription Amount should begin.</li><li><strong>Advance / Setup / Trial Amount Charged Today:</strong> the amount collected immediately when this payment link is used. Use it for an advance, setup charge, or a small trial charge. Enter 0 when nothing should be collected today.</li><li><strong>Total Billing Cycles:</strong> number of recurring charges. Read the live duration helper before generating. Example: every 3 months × 5 cycles = 1 year 3 months.</li></ul>
      <h4>3. References</h4><ul><li><strong>Plan ID Optional:</strong> use only when you already have a matching plan reference in the connected PG. Otherwise leave it blank and let the website create the required request.</li><li><strong>Service Summary:</strong> short description of what the customer receives; keep this meaningful because it helps identify the payment later.</li><li><strong>Notes:</strong> internal reminder for the admin; it is not a replacement for the customer-facing plan name.</li></ul>
      <div class="uc-example"><strong>Example:</strong> Raju's Subscription Amount is ₹500 and the Subscription Start Date is 5 days from today. If Advance / Setup / Trial Amount Charged Today is ₹1, only ₹1 is collected today; ₹500 begins on the selected start date and then follows the chosen billing frequency. If the amount charged today is ₹0, nothing extra is collected today.</div>
      <div class="uc-warning"><strong>If the link does not generate:</strong> first check that a PG is enabled, the amount is above zero, the phone is valid, and the chosen billing frequency/cycles are supported. Do not change the customer's agreed duration silently.</div>`,
    oneTime:`<h3>Create a One-Time Payment Link</h3><p class="uc-help-lead">Use this when the customer pays once and there must be no automatic renewal.</p>
      <ol><li>Enter the customer's name and WhatsApp number so the payment can be found later.</li><li>Add email when available.</li><li>Enter the <strong>Payment Amount</strong> that should be collected exactly once.</li><li>Use <strong>Payment Purpose</strong> to explain what this payment is for, such as <em>Lifetime Campaign Offer</em> or <em>Special Access</em>.</li><li>Add an internal note only if the admin needs extra context.</li><li>Generate the link, open it once for verification, then share it with the customer.</li></ol>
      <div class="uc-example"><strong>Example:</strong> A ₹10,000 forever-access campaign should be a one-time payment, not a recurring subscription.</div>
      <div class="uc-warning"><strong>If the link fails:</strong> check the amount, customer number and enabled PG. A one-time link never creates future automatic charges.</div>`,
    placement:`<h3>Product Display — Exact Workflow</h3><p class="uc-help-lead">This page does not create plans. It decides <strong>where an existing plan or offer is shown</strong>.</p>
      <ol><li>Go to <strong>Sales → Plans & Offers</strong> and create/save the plan first.</li><li>Return to <strong>Sales → Product Display</strong>.</li><li>Under <strong>Select Plans / Offers</strong>, tick every plan you want to place.</li><li>Under <strong>Select Pages</strong>, tick the pages where those plans should appear.</li><li>Choose the correct <strong>Section Key</strong>. Use <strong>featured</strong> for the Home Page featured area, <strong>memberships</strong> for the Membership Page list, and <strong>festival</strong> for Festival Offers.</li><li>Click <strong>Add Selected Products to Pages</strong>.</li><li>Confirm the new rows under <strong>Current Product Display</strong>. Click a page name to preview the public page.</li></ol>
      <div class="uc-example"><strong>Example:</strong> To show “Starter Access” on Home and Membership pages: select Starter Access → select both pages → use the relevant section key → Add Selected Products to Pages.</div>
      <div class="uc-warning"><strong>If a plan does not appear:</strong> confirm the plan itself is Active, the page placement is Active, the correct section key is used, and then refresh the public page. Removing a placement removes only that display position; it does not delete the plan.</div>`,
    audition:`<h3>Post New Fitness Tip Update — Field Guide</h3><ul><li><strong>Fitness Tip Title:</strong> main fitness tip heading. Write the casting opportunity clearly.</li><li><strong>Link Extension:</strong> readable URL ending after <strong>/blog/</strong>. Use lowercase words separated by hyphens. Example: <strong>/blog/audition-updates-whatsapp-group</strong>.</li><li><strong>Tags:</strong> comma-separated keywords used to organize/filter the fitness tip.</li><li><strong>Short Summary:</strong> short preview shown in fitness tip listings and used as fallback search/share description when a separate description is unavailable. Write one useful sentence rather than repeating the title.</li><li><strong>Fitness Tip Details:</strong> complete fitness tip text: role, age range, city, requirements, dates, contact instructions and any safety note.</li><li><strong>Cover Image URL:</strong> large main fitness tip image shown directly below the title and above the fitness tip content. Use a public direct image/CDN URL that opens without login.</li><li><strong>Status:</strong> Draft keeps the fitness tip unpublished; Published makes it available according to the current publishing rules.</li><li><strong>Automatic Ads:</strong> allows enabled website ad integrations to place ads automatically on this fitness tip. Turn it off when you want no automatic ads or when you will place a controlled custom/manual ad.</li></ul>
      <div class="uc-example"><strong>Good link example:</strong> title “Hyderabad Web Series Casting” → link extension <strong>hyderabad-web-series-casting</strong>.</div>
      <div class="uc-warning"><strong>Before publishing:</strong> preview the title, link, cover image and fitness tip details. If the cover image is blank on the fitness tip, verify that its URL is a direct public image URL rather than a private share page.</div>`,
    ads:`<h3>Advertisements for This Fitness Tip Fitness Tips</h3><h4>Choose one approach</h4><ul><li><strong>Automatic Ads ON:</strong> enabled website ad integrations may place ads automatically.</li><li><strong>Automatic Ads OFF + no manual rows:</strong> publish the fitness tip without ads.</li><li><strong>Manual network ad:</strong> add a row, choose placement/size and paste the ad code or link supplied by the ad network.</li><li><strong>Custom Advertisement:</strong> use this for a direct brand collaboration. Add the public ad image URL plus the brand website redirect URL.</li></ul>
      <h4>Manual/custom steps</h4><ol><li>Click <strong>Add More Advertisement</strong> for network code, or <strong>Add Custom Advertisement</strong> for a sponsored brand image.</li><li>Select the placement carefully so the ad does not interrupt important audition instructions.</li><li>Select the size/responsive option.</li><li>For a custom ad, confirm both the image URL and redirect website open correctly.</li><li>Post with advertisements and then preview the fitness tip.</li></ol>
      <div class="uc-warning"><strong>If an ad is missing:</strong> first confirm the fitness tip is Published, the chosen ad integration is enabled, and the pasted code/image URL is valid. For a custom ad, a redirect URL changes where the visitor goes; it does not change the ad image itself.</div>`,
    subscribers:`<h3>Add / Import Subscribers</h3><h4>Add one subscriber manually</h4><ol><li>Open the manual form.</li><li>Enter the customer's confirmed name, WhatsApp number and email where available.</li><li>Select/enter the plan and current subscription status.</li><li>Save, then search the Subscribers list to verify the record.</li></ol><h4>Import many subscribers</h4><ol><li>Download the provided sample CSV/template.</li><li>Keep the column headers unchanged.</li><li>Put one subscriber on each row. Avoid adding the same phone number twice.</li><li>Upload the completed file and review the result message.</li><li>Refresh and spot-check a few imported subscribers.</li></ol><div class="uc-warning"><strong>If a row is rejected:</strong> check required phone/plan fields and the template headers. Importing records adds them to this admin list; it does not automatically charge the customer.</div>`,
    inactive:`<h3>Add Manual Inactive User</h3><p>Use this to record a customer who cancelled, expired, unsubscribed, or must no longer be treated as active.</p><ol><li>Search first to make sure an inactive record does not already exist.</li><li>Enter the customer's confirmed identity details.</li><li>Add the plan/subscription reference when known.</li><li>Write the reason and any future follow-up note.</li><li>Save and confirm the person appears under Inactive Users.</li></ol><div class="uc-warning">Adding an inactive record is an admin record. If a recurring subscription is still active with the PG, cancel/pause it through the appropriate subscription control as well.</div>`,
    oneTimeManual:`<h3>Add Manual One-Time User</h3><p>Use this only for an older/offline one-time payment that did not arrive through the normal website checkout.</p><ol><li>Enter name and confirmed phone number.</li><li>Add email if available.</li><li>Enter the exact amount received and a clear payment purpose.</li><li>Record the PG/payment mode and transaction reference when available.</li><li>Use the actual payment date and add a short note if anything needs explanation.</li><li>Save and verify the customer appears in One-Time Users.</li></ol><p>Successful one-time website checkout customers are added to this list automatically; do not duplicate them manually.</p>`,
    checkout:`<h3>Checkout Behaviour — What Each Setting Changes</h3><ul><li><strong>Payment Type:</strong> controls whether the public checkout creates recurring subscriptions or one-time payments.</li><li><strong>Subscription Duration in Years:</strong> default recurring horizon used only when Subscription is selected; it should disappear for One-Time Payment.</li><li><strong>Allow Yearly Plan:</strong> lets customers choose a yearly billing option when enabled.</li><li><strong>Product-wise Coupon:</strong> permits a coupon against an individual selected plan.</li><li><strong>Overall Discount Coupon:</strong> permits a coupon against the full order total.</li><li><strong>Yearly Offer Months:</strong> number of paid months used to calculate the yearly offer. Example: 10 means charge 10 months for a 12-month access period if that is your configured offer.</li></ul><ol><li>Choose the payment model.</li><li>Enable only the customer choices you actually want to offer.</li><li>Review the yearly/coupon values.</li><li>Click <strong>Save Checkout Settings</strong>.</li><li>Open the public checkout once and confirm the options match your intention.</li></ol><div class="uc-warning">Changing Checkout Behaviour affects new checkout activity. Existing customer payment records are not rewritten.</div>`,
    coupon:`<h3>Coupon Codes — Safe Setup</h3><ol><li>Create a short, unique code customers can type correctly, such as <strong>LAUNCH199</strong>.</li><li>Add a description so the admin remembers the campaign.</li><li>Select the discount type: fixed amount, percentage, or the supported member benefit.</li><li>Choose whether it applies to the whole bill or a specific plan.</li><li>Set optional controls only when needed: minimum bill, member limit, maximum uses, start date and expiry date.</li><li>Select Monthly/Yearly scope and whether the benefit applies only to the first payment or to recurring payments.</li><li>Save and confirm the coupon is Active before sharing it.</li></ol><div class="uc-example"><strong>Example:</strong> “FIRST-TIME” + ₹100 off + usage limit 50 + first payment only creates a controlled launch offer without affecting later renewals.</div><div class="uc-warning"><strong>If a coupon is rejected:</strong> check status, date range, usage limit, plan restriction, billing scope and minimum bill. Leave an optional restriction blank/zero when you do not need it.</div>`,
    refundRazorpay:`<h3>Refund through Razorpay</h3><ol><li>Search by order ID, customer name, phone number or payment ID.</li><li>Select the matching payment and compare customer name/amount before proceeding.</li><li>Enter the exact refund amount. Use a partial amount only when you intentionally want a partial refund.</li><li>Add a clear reason for the refund record.</li><li>Initiate the refund and keep the returned reference/status for follow-up.</li></ol><div class="uc-warning"><strong>No result?</strong> Refresh, verify the original order/payment ID in Client Details → Payments, and make sure this payment was actually collected through Razorpay. Use Manual Refund Record only when money was returned outside the connected PG.</div>`,
    refundPhonepe:`<h3>Refund through PhonePe</h3><ol><li>Search by order/customer/payment reference.</li><li>Confirm the transaction belongs to the correct client and compare the paid amount.</li><li>Enter the intended full or partial refund amount and reason.</li><li>Initiate the refund and record the returned status/reference.</li><li>Refresh the refund/payment record later if the provider processes it asynchronously.</li></ol><div class="uc-warning"><strong>No result?</strong> Check the client's original payment record and confirm PhonePe was the collecting PG. Do not create a manual record unless the refund was actually completed outside the PG.</div>`,
    refundStripe:`<h3>Refund through Stripe</h3><ol><li>Search by order, phone, Payment Intent or Charge reference.</li><li>Match the customer and original amount.</li><li>Enter the full or partial amount to refund and the reason.</li><li>Initiate the refund, then keep the returned reference/status.</li></ol><div class="uc-warning"><strong>No result?</strong> Open Client Details → Payments and verify the Stripe reference first. A Manual Refund Record records an external refund; it does not send money.</div>`,
    refundManual:`<h3>Manual Refund Record</h3><p>Use this only after money has already been returned outside the connected PG, for example by bank transfer or cash.</p><ol><li>Identify the customer/order.</li><li>Enter the exact amount that was actually returned.</li><li>Choose/write the refund method.</li><li>Add transaction/reference details where available.</li><li>Write the reason and save the record.</li></ol><div class="uc-warning"><strong>Important:</strong> Saving this form does not transfer money. Complete the refund first, then use this form to keep the admin history accurate.</div>`
  };

  function enhanceCustomSubscription(){
    makeCardFlippable($('#subscriptionBox'),HELP.subscription);
    makeCardFlippable($('#oneTimeBox'),HELP.oneTime);
    const plan=$('#subscriptionBox [name=plan_id]');if(plan&&/Razorpay/i.test(plan.placeholder||''))plan.placeholder='Existing PG Plan ID, if already created';
  }
  function enhancePlacements(){const card=$('#placements .placement-section-card')||$('#placements .card');makeCardFlippable(card,HELP.placement);}
  function ensureAutoAds(){
    const form=$('#blogForm');if(!form||form.querySelector('[name=auto_ads_enabled]'))return;
    const buttons=form.querySelector('.blog-buttons')||form.querySelector('.form-actions');
    const row=document.createElement('label');row.className='uc-auto-ad-row';
    row.innerHTML='<span><strong>Automatic Ads</strong><small>Allow enabled website ad integrations to place ads automatically on this fitness tip.</small></span><span class="switch"><input type="checkbox" name="auto_ads_enabled" value="1"><span class="slider"></span></span>';
    buttons?.parentNode.insertBefore(row,buttons);
    const cover=form.elements.cover_image_url;if(cover){const h=cover.closest('.field')?.querySelector('.blog-limit-hint,.hint');if(h)h.textContent='Main fitness tip image: shown directly below the fitness tip title. Paste a public direct image URL, CDN URL or website media URL.';}
  }
  function ensureCustomAdButton(){
    const adsDetails=$('#blogs details.admin-collapsed-card:nth-of-type(2)')||[...$$('#blogs details.admin-collapsed-card')].find(d=>/Advertisements/i.test(d.querySelector('summary')?.textContent||''));
    const actions=adsDetails?.querySelector('.form-actions');if(!actions||actions.querySelector('[data-custom-ad-button]'))return;
    const b=document.createElement('button');b.type='button';b.className='btn secondary compact';b.dataset.customAdButton='1';b.textContent='+ Add Custom Advertisement';
    b.onclick=()=>window.addAuditionAdRow?.({custom:true,type:'Custom Advertisement',placement:'In fitness tip',size:'Auto responsive'});
    const post=[...actions.querySelectorAll('button')].find(x=>/Post With/i.test(x.textContent||''));actions.insertBefore(b,post||null);
  }
  function enhanceAuditions(){
    ensureAutoAds();ensureCustomAdButton();
    const details=$$('#blogs details.admin-collapsed-card');
    const post=details.find(d=>/Post New Fitness Tip/i.test(d.querySelector('summary')?.textContent||''))||details[0];
    const ads=details.find(d=>/Advertisements/i.test(d.querySelector('summary')?.textContent||''))||details[1];
    makeDetailsFlippable(post,HELP.audition);makeDetailsFlippable(ads,HELP.ads);
  }

  const previousEditBlog=window.editBlog;
  if(typeof previousEditBlog==='function')window.editBlog=async function(id){
    const r=await previousEditBlog.apply(this,arguments);setTimeout(()=>{const p=((typeof A!=='undefined'&&A.blogs)||[]).find(x=>Number(x.id)===Number(id));const cb=$('#blogForm [name=auto_ads_enabled]');if(cb&&p)cb.checked=!!Number(p.auto_ads_enabled||0);enhanceAuditions();},40);return r;
  };
  const previousResetBlog=window.resetBlogForm;
  if(typeof previousResetBlog==='function')window.resetBlogForm=function(){
    const r=previousResetBlog.apply(this,arguments);const cb=$('#blogForm [name=auto_ads_enabled]');if(cb)cb.checked=false;return r;
  };

  function enhanceRefunds(){
    $$('#refunds details').forEach(d=>{
      const t=d.querySelector('summary')?.textContent||'';
      if(/Razorpay/i.test(t))makeDetailsFlippable(d,HELP.refundRazorpay);
      else if(/PhonePe/i.test(t))makeDetailsFlippable(d,HELP.refundPhonepe);
      else if(/Stripe/i.test(t))makeDetailsFlippable(d,HELP.refundStripe);
      else if(/Manual/i.test(t))makeDetailsFlippable(d,HELP.refundManual);
    });
  }
  function enhanceCustomers(){
    const sub=[...$$('#subscribers details')].find(d=>/Add\s*\/\s*Import Subscribers/i.test(d.querySelector('summary')?.textContent||''));makeDetailsFlippable(sub,HELP.subscribers);
    const inactive=[...$$('#unsubscribed details')].find(d=>/Manual Unsubscribe|Inactive/i.test(d.querySelector('summary')?.textContent||''));makeDetailsFlippable(inactive,HELP.inactive);
  }
  function enhanceCheckout(){
    const behavior=$('#checkoutSettings .final-checkout-behaviour')||[...$$('#checkoutSettings details')].find(d=>/Checkout Behaviour/i.test(d.querySelector('summary')?.textContent||''));makeDetailsFlippable(behavior,HELP.checkout);
    const coupon=$('#checkoutSettings .final-coupon-detail')||[...$$('#checkoutSettings details')].find(d=>/Coupon Codes/i.test(d.querySelector('summary')?.textContent||''));makeDetailsFlippable(coupon,HELP.coupon);
  }

  function ensureOneTimePanel(){
    if($('#oneTimeUsers'))return;
    const main=$('main.main');if(!main)return;
    const section=document.createElement('section');section.id='oneTimeUsers';section.className='panel';
    section.innerHTML=`<div class="top"><h1>One-Time Users</h1><div class="top-actions"><input id="oneTimeSearch" class="search-input" placeholder="Search name, phone, email, order or reference"><button class="btn secondary compact" type="button" onclick="load_oneTimeUsers()">Search / Refresh</button></div></div>
      <details class="card admin-collapsed-card"><summary>Add Manual One-Time Record</summary><div class="collapsed-body"><form id="oneTimeUserForm" class="form" onsubmit="saveOneTimeUser(event)"><div class="row"><div class="field"><label>Name</label><input name="name"></div><div class="field"><label>Phone</label><input name="phone" required></div><div class="field"><label>Email Optional</label><input name="email" type="email"></div></div><div class="row"><div class="field"><label>Amount</label><input name="amount_rupees" type="number" min="0" step="1"></div><div class="field"><label>Payment Purpose</label><input name="purpose" placeholder="One-Time Payment"></div><div class="field"><label>PG / Payment Mode</label><input name="gateway" placeholder="Manual / Bank / PG name"></div></div><div class="row"><div class="field"><label>Transaction Reference Optional</label><input name="transaction_reference"></div><div class="field"><label>Payment Date</label><input name="payment_date" type="date"></div></div><div class="field"><label>Notes</label><textarea name="notes" rows="3"></textarea></div><div class="form-actions"><button class="btn compact">Save One-Time User</button></div><div id="oneTimeUserMsg"></div></form></div></details>
      <div class="card below"><div class="block-head"><div><h2>One-Time User List</h2><p class="muted">Paid one-time checkout users appear automatically. Manual records appear here as well.</p></div></div><div id="oneTimeUsersTable" class="table-wrap"></div></div>`;
    main.appendChild(section);
  }
  function ensureOneTimeNav(){
    ensureOneTimePanel();
    if($('.side .nav [data-tab=oneTimeUsers]'))return;
    const group=$('.nav-group[data-group-title="Customers"] .nav-group-items');
    if(!group)return;
    const b=document.createElement('button');b.dataset.tab='oneTimeUsers';b.className='nav-subitem';b.textContent='One-Time Users';b.onclick=()=>window.tab('oneTimeUsers');group.appendChild(b);
  }
  window.load_oneTimeUsers=async function(){
    ensureOneTimePanel();const qv=$('#oneTimeSearch')?.value||'';const box=$('#oneTimeUsersTable');if(!box)return;
    try{
      const r=await api('/api/admin/one-time-users'+(qv?`?q=${encodeURIComponent(qv)}`:''));
      const rows=r.users||[];
      box.innerHTML=rows.length?`<table class="table fixed-table uc-one-time-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Purpose / Order</th><th>Amount</th><th>PG</th><th>Date</th><th>Source</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.order_id?`<button class="link-button" type="button" onclick="openClientDetails('order:${H(x.order_id)}')">${H(x.name||'-')}</button>`:H(x.name||'-')}</td><td>${H(x.phone||'-')}</td><td>${H(x.email||'-')}</td><td class="text-cell"><strong>${H(x.purpose||'One-Time Payment')}</strong>${x.order_id?`<br><small>${H(x.order_id)}</small>`:''}${x.transaction_reference?`<br><small>${H(x.transaction_reference)}</small>`:''}</td><td>${INR.format(Number(x.amount_paise||0)/100)}</td><td>${H(x.gateway||'-')}</td><td>${H(String(x.payment_date||'').slice(0,10)||'-')}</td><td class="uc-one-time-source">${H(x.source||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="notice">No one-time users found yet.</div>';
      const d=$('#oneTimeUsers details');makeDetailsFlippable(d,HELP.oneTimeManual);
    }catch(e){box.innerHTML=`<div class="error">${H(e.message||'Could not load one-time users.')}</div>`;}
  };
  window.saveOneTimeUser=async function(e){
    e.preventDefault();const f=e.currentTarget,p=Object.fromEntries(new FormData(f).entries());
    try{await api('/api/admin/one-time-users',{method:'POST',body:JSON.stringify(p)});f.reset();toast('One-time user saved.');await load_oneTimeUsers();}
    catch(err){const m=$('#oneTimeUserMsg');if(m)m.innerHTML=`<div class="error">${H(err.message||'Could not save record.')}</div>`;}
  };

  function enhanceCurrentPanel(id){
    if(id==='settings')setTimeout(()=>{enhanceSiteSettings();updateThemePreview();},30);
    if(id==='customSubscription')setTimeout(enhanceCustomSubscription,30);
    if(id==='placements')setTimeout(enhancePlacements,80);
    if(id==='blogs')setTimeout(enhanceAuditions,100);
    if(id==='refunds')setTimeout(enhanceRefunds,120);
    if(id==='subscribers'||id==='unsubscribed')setTimeout(enhanceCustomers,80);
    if(id==='checkoutSettings')setTimeout(enhanceCheckout,120);
    if(id==='oneTimeUsers')setTimeout(()=>{load_oneTimeUsers();},20);
  }
  const previousTab=window.tab;
  window.tab=function(id){const r=previousTab.apply(this,arguments);ensureOneTimeNav();enhanceCurrentPanel(id);return r;};

  ensureOneTimePanel();
  function init(){
    ensureOneTimePanel();setTimeout(ensureOneTimeNav,300);setTimeout(ensureOneTimeNav,1200);setTimeout(ensureOneTimeNav,2200);
    enhanceSiteSettings();enhanceCustomSubscription();enhancePlacements();enhanceAuditions();enhanceCustomers();enhanceCheckout();enhanceRefunds();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));else setTimeout(init,900);
  setTimeout(init,2600);setTimeout(init,6200);
})();
