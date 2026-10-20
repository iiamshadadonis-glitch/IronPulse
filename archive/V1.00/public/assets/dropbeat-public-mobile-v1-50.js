/* Mobile-only grouping of existing nodes. Desktop order and all original handlers are restored. */
(()=>{
  'use strict';
  const phone=matchMedia('(max-width:760px)'),states=new Map(),hosts=new Set();let queued=false;
  function intrinsic(node){
    if(!node)return 0;
    const rect=node.getBoundingClientRect(),children=[...node.children];
    if(children.length)return Math.ceil(Math.max(...children.map(child=>child.getBoundingClientRect().bottom))-rect.top);
    const range=document.createRange();range.selectNodeContents(node);return Math.ceil(range.getBoundingClientRect().height+10);
  }
  function equalize(host){
    const rows=new Map();
    [...host.querySelectorAll(':scope>.product-card')].forEach(card=>{const state=states.get(card);if(!state)return;const y=Math.round(card.getBoundingClientRect().top);if(!rows.has(y))rows.set(y,[]);rows.get(y).push(state);});
    rows.forEach(row=>{
      const price=Math.max(0,...row.map(s=>intrinsic(s.price))),availability=Math.max(24,...row.map(s=>intrinsic(s.availability)));
      row.forEach(s=>{for(const [key,value]of [['--db150-price-height',price+'px'],['--db150-availability-height',availability+'px']])if(s.footer.style.getPropertyValue(key)!==value)s.footer.style.setProperty(key,value);});
    });
  }
  function run(){
    queued=false;
    for(const [card,state]of states)if(!card.isConnected)states.delete(card);
    if(!phone.matches){
      for(const [card,state]of states){
        card.querySelectorAll(':scope>.db134-session-details,:scope>[data-db107-plan-facts],:scope>.db150-plan-footer>.db134-session-details,:scope>.db150-plan-footer>[data-db107-plan-facts]').forEach(facts=>state.positions[1].marker.before(facts));
        state.positions.forEach(({node,marker})=>{if(marker.isConnected)marker.replaceWith(node);});state.footer.remove();
      }
      states.clear();hosts.forEach(host=>host.classList.remove('db150-plan-grid'));return;
    }
    document.querySelectorAll('#featuredProducts,#offersGrid,#festivalGrid,#yearlyGrid').forEach(host=>{
      if(!hosts.has(host)){hosts.add(host);new MutationObserver(queue).observe(host,{childList:true,subtree:true});if(typeof ResizeObserver==='function')new ResizeObserver(queue).observe(host);}
      host.classList.add('db150-plan-grid');
      host.querySelectorAll(':scope>.product-card').forEach(card=>{
        let state=states.get(card);
        if(!state){
          const nodes=['.price','.uc-plan-availability','.product-actions'].map(selector=>card.querySelector(':scope>'+selector));if(nodes.some(node=>!node))return;
          const footer=document.createElement('div');footer.className='db150-plan-footer';
          const positions=nodes.map(node=>{const marker=document.createComment('V1.50 original mobile footer position');node.before(marker);footer.appendChild(node);return {node,marker};});
          card.appendChild(footer);state={footer,positions,price:nodes[0],availability:nodes[1]};states.set(card,state);
        }
        state.footer.querySelectorAll(':scope>.db134-session-details,:scope>[data-db107-plan-facts],:scope>.features').forEach(node=>state.footer.before(node));
      });equalize(host);
    });
  }
  function queue(){if(!queued){queued=true;requestAnimationFrame(run);}}
  document.addEventListener('uc-products-rendered',queue);phone.addEventListener('change',queue);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
