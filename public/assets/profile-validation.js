(function(){
  function digitsOnly(input,max=10){if(!input)return;input.addEventListener('input',()=>{input.value=String(input.value||'').replace(/\D/g,'').slice(0,max);});}
  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.querySelector('#submitProfileForm');if(!form)return;
    const phone=form.querySelector('input[name="phone"]'),cc=form.querySelector('select[name="country_code"]');digitsOnly(phone,15);
    const syncPhoneLength=()=>{if(!phone)return;const code=String(cc?.value||'91'),max=code==='91'?10:Math.max(6,15-code.length);phone.maxLength=max;phone.pattern=code==='91'?'[0-9]{10}':`[0-9]{6,${max}}`;};
    cc?.addEventListener('change',syncPhoneLength);syncPhoneLength();
    form.querySelector('input[name="instagram_id"]')?.addEventListener('blur',e=>{let v=String(e.target.value||'').trim();v=v.replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/[/?#].*$/,'');if(v&&!v.startsWith('@'))v='@'+v;e.target.value=v;});
  });
})();
