/* V7 temporary theme preview. Preview is browser-local and expires automatically. */
(function(){
  'use strict';
  const KEY='uc_theme_preview_v7';
  const ORIGINAL_PRIMARY='#4B55BE',ORIGINAL_ACCENT='#A469A8';
  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||'').trim());}
  function norm(v,f){v=String(v||'').trim();if(!v.startsWith('#'))v='#'+v;return validHex(v)?v.toUpperCase():f;}
  function rgb(hex){hex=norm(hex,'#000000').slice(1);return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];}
  function rgbHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function toHsl([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;let h=0,s=0;if(d){s=l>.5?d/(2-max-min):d/(max+min);if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return [h,s*100,l*100];}
  function fromHsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return rgbHex((r+m)*255,(g+m)*255,(b+m)*255);}
  function svgArrow(color){const c=encodeURIComponent(color);return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='11.5' fill='none' stroke='${c}' stroke-width='1.8'/%3E%3Cpath d='M9.5 11.5 14 16l4.5-4.5' fill='none' stroke='${c}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;}
  function apply(primary,accent){
    primary=norm(primary,ORIGINAL_PRIMARY);accent=norm(accent,ORIGINAL_ACCENT);
    const original=primary===ORIGINAL_PRIMARY&&accent===ORIGINAL_ACCENT,[h,s,l]=toHsl(rgb(primary));
    const dark=original?'#1A1A1A':fromHsl(h,Math.max(35,s),Math.max(10,Math.min(32,l*.42)));
    const mid=original?'#B11226':fromHsl(h,Math.max(38,Math.min(92,s)),Math.max(18,Math.min(48,l*1.38)));
    const highlight=original?'#A469A8':accent,purple=original?'#5B21B6':primary,soft=original?'#FFF4D1':fromHsl(h,Math.min(75,s),96);
    const root=document.documentElement.style,setRgb=(name,hex)=>root.setProperty(name,rgb(hex).join(','));
    root.setProperty('--blue',primary);root.setProperty('--blue-dark',dark);root.setProperty('--blue-mid',mid);root.setProperty('--sky',accent);root.setProperty('--accent',highlight);root.setProperty('--purple',purple);root.setProperty('--spotlight',soft);
    setRgb('--blue-rgb',primary);setRgb('--blue-dark-rgb',dark);setRgb('--sky-rgb',accent);setRgb('--accent-rgb',highlight);root.setProperty('--uc-select-arrow',svgArrow(primary));
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=primary;
  }
  function read(){try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(!p||!p.expiresAt||Date.now()>=Number(p.expiresAt)){localStorage.removeItem(KEY);return null;}return p;}catch(_){return null;}}
  function applyPreview(){const p=read();if(p){apply(p.primary,p.accent);return true;}return false;}
  async function restoreSaved(){
    try{const r=await fetch('/api/public/site',{credentials:'same-origin'}),d=await r.json();if(r.ok)apply(d?.settings?.primaryColor,d?.settings?.accentColor);}catch(_){apply(ORIGINAL_PRIMARY,ORIGINAL_ACCENT);}
  }
  const oldApply=window.applySettings;
  if(typeof oldApply==='function')window.applySettings=function(settings){const out=oldApply(settings);const p=read();if(p)apply(p.primary,p.accent);return out;};
  applyPreview();
  window.addEventListener('storage',e=>{if(e.key!==KEY)return;if(!applyPreview())restoreSaved();});
  const p=read();if(p)setTimeout(()=>{try{localStorage.removeItem(KEY);}catch(_){}restoreSaved();},Math.max(50,Number(p.expiresAt)-Date.now()));
})();
