/* DropBeat Dance Studio final source analytics + modal UX polish.
   Additive only: existing admin data flows remain unchanged. */
(function(){
  const $=s=>document.querySelector(s);
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureTrafficModal(){
    let modal=$('#ucTrafficSourceModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='ucTrafficSourceModal';
    modal.className='modal uc-traffic-source-modal';
    modal.innerHTML=`
      <div class="modal-card wide uc-traffic-source-card">
        <div class="top uc-traffic-source-head">
          <div><h2>Traffic Sources</h2><p class="muted">Compare where website visitors are coming from during a selected period.</p></div>
          <button class="btn secondary compact" type="button" onclick="closeUCTrafficSources()">Close</button>
        </div>
        <div class="uc-source-filter-card">
          <div class="field"><label>Period</label><select id="ucTrafficPreset" onchange="ucTrafficPresetChanged()">
            <option value="3d">Last 3 Days</option>
            <option value="7d">Last 1 Week</option>
            <option value="14d">Last 2 Weeks</option>
            <option value="21d">Last 3 Weeks</option>
            <option value="30d" selected>Last 1 Month</option>
            <option value="60d">Last 2 Months</option>
            <option value="90d">Last 3 Months</option>
            <option value="custom">Custom Date Range</option>
          </select></div>
          <div class="field"><label>From Date</label><input id="ucTrafficFrom" type="date"></div>
          <div class="field"><label>To Date</label><input id="ucTrafficTo" type="date"></div>
          <button class="btn compact" type="button" onclick="loadUCTrafficSources()">Apply</button>
        </div>
        <div id="ucTrafficSourceBody"><div class="notice">Loading traffic sources…</div></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function localISO(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function setPresetDates(value){
    if(value==='custom')return;
    const days={ '3d':3,'7d':7,'14d':14,'21d':21,'30d':30,'60d':60,'90d':90 }[value]||30;
    const to=new Date(),from=new Date();from.setDate(from.getDate()-(days-1));
    const f=$('#ucTrafficFrom'),t=$('#ucTrafficTo');if(f)f.value=localISO(from);if(t)t.value=localISO(to);
  }
  function displayDate(v){
    if(!v)return'-';const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
  }

  window.closeUCTrafficSources=()=>$('#ucTrafficSourceModal')?.classList.remove('open');
  window.ucTrafficPresetChanged=function(){
    const preset=$('#ucTrafficPreset')?.value||'30d';
    setPresetDates(preset);
    if(preset!=='custom')loadUCTrafficSources();
  };
  window.openUCTrafficSources=function(){
    const modal=ensureTrafficModal();
    modal.classList.add('open');
    setPresetDates($('#ucTrafficPreset')?.value||'30d');
    loadUCTrafficSources();
  };
  window.loadUCTrafficSources=async function(){
    const body=$('#ucTrafficSourceBody');if(!body)return;
    const preset=$('#ucTrafficPreset')?.value||'30d',from=$('#ucTrafficFrom')?.value||'',to=$('#ucTrafficTo')?.value||'';
    if(preset==='custom'&&(!from||!to)){body.innerHTML='<div class="notice">Select both From Date and To Date, then click Apply.</div>';return;}
    body.innerHTML='<div class="notice">Loading traffic-source performance…</div>';
    try{
      const r=await api(`/api/admin/traffic-sources?preset=${encodeURIComponent(preset)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const rows=r.rows||[],period=`${displayDate(r.from)} – ${displayDate(r.to)}`;
      const top5=rows.slice(0,5);
      body.innerHTML=`
        <div class="uc-source-summary">
          <span><strong>${H(period)}</strong><small>Selected period</small></span>
          <span><strong>${Number(r.totals?.unique_visitors||0)}</strong><small>Unique visitors</small></span>
          <span><strong>${Number(r.totals?.visits||0)}</strong><small>Total tracked visits</small></span>
          <span><strong>${H(top5.map(x=>x.source).join(', ')||'No source data')}</strong><small>Top 5 sources</small></span>
        </div>
        <div class="uc-source-grid-wrap">
          <div class="uc-source-grid uc-source-grid-head">
            <div>#</div><div>Source</div><div>Total Visits</div><div>Unique Visitors</div><div>Repeat Visitors</div><div>Period</div>
          </div>
          ${rows.length?rows.map(x=>`<div class="uc-source-grid uc-source-grid-row ${x.rank<=5?'top-five':''}"><div><span class="uc-source-rank">${x.rank}</span></div><div><strong>${H(x.source)}</strong>${x.rank<=5?'<small>Top 5 source</small>':''}</div><div>${x.visits}</div><div>${x.unique_visitors}</div><div>${x.repeat_visitors}</div><div>${H(period)}</div></div>`).join(''):'<div class="notice uc-source-empty">No traffic-source records were found for this period.</div>'}
        </div>`;
    }catch(e){body.innerHTML=`<div class="error">${H(e.message||'Could not load traffic sources.')}</div>`;}
  };

  function patchTopSourceCard(){
    const metric=$('#statTopSource'),card=metric?.closest('.card');if(!card)return;
    card.classList.add('clickable','uc-top-source-card');card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('title','View all traffic sources');
    card.onclick=()=>openUCTrafficSources();
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openUCTrafficSources();}};
  }

  /* Clicking the shaded backdrop closes any admin modal while preserving every Close button. */
  document.addEventListener('click',function(e){
    const modal=e.target?.closest?.('.modal');
    if(modal&&e.target===modal&&modal.classList.contains('open'))modal.classList.remove('open');
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    const open=[...document.querySelectorAll('.modal.open')];
    if(open.length)open[open.length-1].classList.remove('open');
  });

  function init(){ensureTrafficModal();patchTopSourceCard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,120));else setTimeout(init,120);
})();
