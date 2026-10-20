/* V1.40 Bulk Plan Upload. CSV parsing preserves empty cells, quoted commas,
   escaped quotes, UTF-8 BOM and multi-line descriptions. */
(()=>{
  'use strict';
  function parseCSV(value){
    const text=String(value||'').replace(/^\uFEFF/,''),records=[];let row=[],cell='',quoted=false;
    for(let index=0;index<text.length;index++){
      const char=text[index];
      if(char==='"'){
        if(quoted&&text[index+1]==='"'){cell+='"';index++;}
        else if(quoted)quoted=false;
        else if(!cell.trim())quoted=true;
        else throw new Error('Unexpected quote near CSV record '+(records.length+1)+'.');
      }else if(char===','&&!quoted){row.push(cell);cell='';}
      else if((char==='\n'||char==='\r')&&!quoted){
        if(char==='\r'&&text[index+1]==='\n')index++;
        row.push(cell);if(row.some(value=>value.trim()))records.push(row);row=[];cell='';
      }else cell+=char;
    }
    if(quoted)throw new Error('The CSV has an unclosed quoted value.');
    row.push(cell);if(row.some(value=>value.trim()))records.push(row);
    const headers=(records.shift()||[]).map(value=>value.trim());
    if(!headers.length)throw new Error('The CSV is empty.');
    if(headers.some(value=>!value)||new Set(headers.map(value=>value.toLowerCase())).size!==headers.length)throw new Error('CSV column names must be non-empty and unique.');
    return records.map((values,index)=>{
      if(values.length!==headers.length)throw new Error('CSV record '+(index+2)+' has '+values.length+' values; expected '+headers.length+'. Keep all empty columns and quote descriptions that contain commas.');
      return Object.fromEntries(headers.map((header,column)=>[header,values[column].trim()]));
    });
  }
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let importInFlight=false;
  async function bulkImport(){
    const file=document.querySelector('#bulkFile')?.files?.[0],result=document.querySelector('#bulkResult');
    const show=html=>{
      if(result)result.innerHTML=html;
      const form=document.querySelector('#db140BulkPlanForm.db138-inline-form-open');
      if(form){let feedback=form.querySelector('.db140-import-feedback');if(!feedback){feedback=document.createElement('div');feedback.className='db140-import-feedback';feedback.setAttribute('aria-live','polite');(form.querySelector('.db138-form-content')||form).appendChild(feedback);}feedback.innerHTML=html;}
    };
    if(!file){show('<div class="error">Choose a CSV file first.</div>');return;}
    const button=document.querySelector('#db140BulkPlanForm button[type="submit"]');
    // The global pending-button adapter may disable the submitter before this
    // handler runs. Only an actual import request owns the duplicate guard.
    if(importInFlight)return;importInFlight=true;
    try{
      const rows=parseCSV(await file.text());if(!rows.length)throw new Error('The CSV contains no plan rows.');
      if(rows.length>50)throw new Error('Import up to 50 plans per file.');
      if(button)button.disabled=true;
      show('<div class="notice" role="status">Importing plans…</div>');
      const data=await window.api('/api/admin/import-products',{method:'POST',body:JSON.stringify({rows})});
      show('<div class="notice" role="status">Created: '+Number(data.created||0)+' · Updated: '+Number(data.updated||0)+' · Errors: '+(data.errors||[]).length+'</div>'+
        ((data.errors||[]).length?'<ul class="db140-import-errors">'+data.errors.map(error=>'<li><strong>Row '+Number(error.row)+': '+escape(error.sku||'Plan')+'</strong> — '+escape(error.error)+(error.plan_saved?' (Plan saved; correct its image/display settings.)':'')+'</li>').join('')+'</ul>':''));
      window.ucAdminInvalidateApiCache?.();await window.load_products?.();return data;
    }catch(error){show('<div class="error" role="alert">'+escape(error.message||'Import failed.')+'</div>');}
    finally{importInFlight=false;if(button)button.disabled=false;}
  }
  window.DropBeatPlanCSV={parseCSV};
  window.bulkImport=bulkImport;
})();
