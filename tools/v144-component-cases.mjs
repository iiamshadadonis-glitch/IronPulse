/* Real DOM interactions against the original application with synthetic APIs. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function runComponents({page,output,clients,savedImages,writes,errors}){
  const settle=async()=>{await page.waitForTimeout(180);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const phase=text=>console.log('V1.44 browser: '+text);
  const viewport=async(width,height=844)=>{await page.setViewportSize({width,height});await settle();};
  const closeList=()=>page.evaluate(()=>document.querySelector('#listModal').classList.remove('open'));
  const noOverflow=async(selector)=>{
    const results=await page.locator(selector).evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({name:node.className,width:node.clientWidth,scroll:node.scrollWidth,x:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right})));
    assert.ok(results.length,selector+' rendered');
    for(const result of results){assert.ok(result.scroll<=result.width+1,selector+' has no internal horizontal overflow: '+JSON.stringify(result));assert.ok(result.x>=-1&&result.right<=await page.evaluate(()=>innerWidth)+1,selector+' fits the viewport');}
  };
  const cardLayout=async(selector)=>page.locator(selector).first().evaluate(card=>{
    const title=card.querySelector('.uc-card-title'),name=title.querySelector('h3').getBoundingClientRect(),date=title.querySelector('.uc-time-pill').getBoundingClientRect(),cells=[...card.querySelectorAll('.uc-card-info-grid>div')].map(node=>{const rect=node.getBoundingClientRect();return {x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width)};});
    return {nameY:name.y,dateY:date.y,cells,height:card.getBoundingClientRect().height};
  });
  phase('global client summary component');
  await page.goto(page.url().replace(/\/admin\/.*$/,'/admin/'),{waitUntil:'load'});await settle();
  // Exercise real dashboard DOM replacement, including unchanged page counts
  // when switching between one and two rows and recreating a removed pager.
  await page.evaluate(()=>{const block=document.createElement('section');block.className='dashboard-block';block.innerHTML='<div id="db141MetricFixture" class="dashboard-cards"></div>';document.querySelector('#dashboard').appendChild(block);});
  for(const count of [4,8,6,12,20,1,6,0]){
    await page.evaluate(count=>{document.querySelector('#db141MetricFixture').innerHTML=Array.from({length:count},(_,index)=>'<div class="card"><span>Metric '+(index+1)+'</span><strong class="stat">'+index+'</strong></div>').join('');window.DropBeatMobileUI.refresh();},count);await settle();
    const state=await page.locator('#db141MetricFixture').evaluate(node=>{const rect=node.getBoundingClientRect(),dots=node.nextElementSibling;return {rows:node.dataset.db137Rows,width:rect.width,cards:[...node.children].map(card=>({width:card.getBoundingClientRect().width,y:Math.round(card.getBoundingClientRect().y)})),dots:dots?.matches('.db137-carousel-dots')?dots.querySelectorAll('button').length:0};});
    if(count>=2){assert.equal(state.rows,count>5?'2':'1');assert.ok(state.cards.every(card=>Math.abs(card.width-(state.width-10)/2)<2));assert.equal(state.dots,Math.ceil(count/(count>5?4:2)));const rows=new Map();state.cards.forEach(card=>rows.set(card.y,(rows.get(card.y)||0)+1));assert.ok(Math.max(...rows.values())-Math.min(...rows.values())<=1,'metric rows remain balanced');await page.locator('#db141MetricFixture+.db137-carousel-dots>button').last().click();await page.waitForFunction(()=>{const dots=document.querySelector('#db141MetricFixture').nextElementSibling;return dots.lastElementChild.classList.contains('active');});}
    else assert.equal(state.dots,0,'zero/one metric removes the old pager');
  }
  await page.evaluate(()=>document.querySelector('#db141MetricFixture').parentElement.remove());
  for(const width of [320,390,430]){
    await viewport(width);
    await page.evaluate(()=>window.tab('search'));await settle();await page.evaluate(()=>window.performUCSearch());await settle();
    const search=await cardLayout('#ucSearchResults .uc-dashboard-client-card');
    assert.ok(Math.abs(search.nameY-search.dateY)<9);assert.equal(search.cells[0].y,search.cells[1].y);assert.equal(search.cells[2].y,search.cells[3].y);assert.ok(search.height<300);
    for(const type of ['totalLeads','activeSubscriptions','hotLeads','recentLeads']){
      await page.evaluate(type=>window.openDashboardList(type),type);await settle();
      const detail=await cardLayout('#dashboardListBox .uc-dashboard-client-card');
      assert.ok(Math.abs(detail.nameY-detail.dateY)<9,type+' name/date share one row at '+width);assert.equal(detail.cells[0].y,detail.cells[1].y);assert.equal(detail.cells[2].y,detail.cells[3].y);assert.equal(detail.cells[0].x,detail.cells[2].x);assert.equal(detail.cells[1].x,detail.cells[3].x);assert.ok(detail.height<300,type+' uses the compact shared layout');await noOverflow('#dashboardListBox .uc-dashboard-client-card');await closeList();
    }
  }
  phase('visitor, traffic-source and all subscription overview cards');
  await viewport(390);await page.evaluate(()=>window.tab('dashboard'));await settle();
  for(const kind of ['all','repeat']){
    await page.evaluate(kind=>window.openUCVisitorModal(kind),kind);await settle();
    assert.equal(await page.locator('.uc98-visitor-head:visible').count(),0);assert.equal(await page.locator('.db141-visitor-card').count(),3);
    await noOverflow('.uc98-visitor-grid,.db141-visitor-card');
    const visitor=await page.locator('.db141-visitor-card').first().evaluate(card=>{
      const first=card.children[0].getBoundingClientRect(),time=card.children[1].getBoundingClientRect();return {first:first.y,time:time.y,left:first.x,right:time.x};
    });assert.ok(Math.abs(visitor.first-visitor.time)<2);assert.ok(visitor.right>visitor.left);await closeList();
  }
  await page.evaluate(()=>window.openUCTrafficSources());await settle();
  assert.equal(await page.locator('.uc-source-grid-head:visible').count(),0);await noOverflow('.uc-source-grid-wrap,.db141-traffic-source-card');
  const trafficCells=await page.locator('.db141-traffic-source-card').first().locator(':scope>.db136-stacked-cell').evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y})));assert.equal(trafficCells[2].y,trafficCells[3].y);assert.ok(trafficCells[1].y<trafficCells[2].y);
  await page.screenshot({path:join(output,'traffic-source-cards.png')});await page.evaluate(()=>window.closeUCTrafficSources());
  for(const type of ['total','active','successful','new','renewed','upcoming','failed','cancelled']){
    await page.evaluate(type=>window.openUCSubscriptionList(type),type);await settle();await page.waitForFunction(()=>[...document.querySelectorAll('#ucMultiSubscriptionModal .uc-multi-sub-row')].length===2&&[...document.querySelectorAll('#ucMultiSubscriptionModal .uc-multi-sub-row')].every(row=>row.classList.contains('db141-record')));
    assert.equal(await page.locator('#ucMultiSubscriptionModal .uc-multi-sub-head:visible').count(),0);assert.equal(await page.locator('.uc-multi-sub-row.db141-record').count(),2);await noOverflow('.uc-multi-sub-grid-wrap,.uc-multi-sub-row.db141-record');
    await page.evaluate(()=>document.querySelector('#ucMultiSubscriptionModal').classList.remove('open'));
  }
  phase('Most Visited, statement sheet layering and nested filters');
  await page.evaluate(()=>window.openClientDetails('lead:1'));await settle();
  assert.equal(await page.locator('#ucClientModal .uc-v1634-page-history').count(),0);
  await page.locator('.db140-meta-pill').filter({hasText:'Most Visited'}).click();
  assert.equal(await page.locator('.db141-visited-pages .uc-page-chip:visible').count(),5);
  assert.equal(await page.locator('.db141-visited-pages .uc-page-chips').evaluate(node=>getComputedStyle(node).flexWrap),'nowrap');
  assert.equal(await page.locator('.db141-visited-pages').evaluate(node=>node.textContent.includes('No saved information')),false);
  await page.evaluate(()=>window.openUCStatement());await settle();
  const clientZ=await page.locator('#ucClientModal').evaluate(node=>+getComputedStyle(node).zIndex),docZ=await page.locator('#ucV9DocumentModal').evaluate(node=>+getComputedStyle(node).zIndex);assert.ok(docZ>clientZ);
  assert.equal(await page.locator('#ucV9DocumentModal').getAttribute('class').then(value=>value.includes('db141-statement-sheet')),true);
  const statementRect=await page.locator('#ucV9DocumentModal>.modal-card').boundingBox();assert.equal(Math.round(statementRect.x),0);assert.ok(Math.abs(statementRect.y+statementRect.height-844)<2);
  assert.equal(await page.locator('#ucV10StatementPeriod').isVisible(),false);await page.locator('.db141-statement-filter').click();
  assert.equal(await page.locator('#ucV9DocumentModal .db140-filter-controls').getAttribute('data-db140-field-count'),'3');
  const fields=await page.locator('#ucV9DocumentModal .db140-filter-controls>.field').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width};}));assert.ok(fields[0].width>fields[1].width*1.9);assert.equal(fields[1].y,fields[2].y);
  await page.locator('#ucV9DocumentModal [data-db140-apply]').click();await settle();
  const actionRows=await page.locator('#ucV9DocumentModal .uc-v9-doc-actions>button').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().top)));assert.ok(Math.max(...actionRows)-Math.min(...actionRows)<3,'statement actions share one row: '+actionRows);assert.equal(await page.locator('#ucV9StatementDownload').textContent(),'Statement');
  const statementDownload=page.waitForEvent('download');await page.locator('#ucV9StatementDownload').click();const statement=await statementDownload;await statement.saveAs(join(output,'synthetic-statement.pdf'));assert.equal((await readFile(join(output,'synthetic-statement.pdf'))).subarray(0,5).toString(),'%PDF-');
  await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await settle();await page.screenshot({path:join(output,'client-statement-dark.png')});assert.equal(await page.locator('#ucV9DocumentModal .uc-v9-doc-card').evaluate(node=>getComputedStyle(node).backgroundColor==='rgb(255, 255, 255)'),false);await page.evaluate(()=>document.documentElement.dataset.colorMode='light');
  await page.screenshot({path:join(output,'client-statement-sheet.png')});await page.evaluate(()=>window.closeUCV9DocumentModal());
  phase('invoice semantic steps, Review-only actions and original PDF handler');
  await page.evaluate(()=>window.openUCRefundInvoice());await settle();
  const refundInvoice=page.locator('#ucV14RefundInvoiceForm');await refundInvoice.locator('.db137-wizard-step').first().waitFor();assert.equal(await refundInvoice.locator('.db137-wizard-step').count(),4);assert.equal(await page.locator('#ucV9DocumentModal.db141-invoice-sheet').count(),1);
  for(let step=0;step<3;step++)await refundInvoice.locator('[data-db137-next]').click();assert.equal(await refundInvoice.locator('[data-db137-finish]:visible').count(),3);await page.evaluate(()=>window.closeUCV9DocumentModal());
  await page.evaluate(()=>window.openUCInvoice());await settle();
  const invoice=page.locator('#ucV10InvoiceForm');await invoice.locator('.db137-wizard-step').first().waitFor();
  assert.equal(await invoice.locator('.db137-wizard-step').count(),4);assert.equal(await invoice.locator('[name="billTo"]').isVisible(),true);assert.equal(await invoice.locator('[name="received"]').isVisible(),false);assert.equal(await invoice.locator('[data-db137-finish]:visible').count(),0);
  await invoice.locator('[data-db137-next]').click();assert.equal(await invoice.locator('[name="received"]').isVisible(),true);assert.equal(await invoice.locator('[name="billTo"]').isVisible(),false);
  await invoice.locator('[data-db137-next]').click();await invoice.locator('[name="notes"]').fill('V1.44 review test');assert.equal(await invoice.locator('[name="terms"]').isVisible(),true);
  await invoice.locator('[data-db137-next]').click();assert.ok((await invoice.locator('.db138-review').textContent()).includes('V1.44 review test'));assert.equal(await invoice.locator('[data-db137-finish]:visible').count(),3);
  await page.locator('#ucV9DocumentModal .uc-v11-doc-help-btn').click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),false);assert.equal(await page.locator('#ucV9DocumentModal').isVisible(),true,'Escape closes help without closing the invoice');
  await invoice.locator('[data-db137-back]').click();assert.equal(await invoice.locator('[name="notes"]').inputValue(),'V1.44 review test');await invoice.locator('[data-db137-next]').click();
  for(const width of [320,390]){await viewport(width);const rect=await page.locator('#ucV9DocumentModal>.modal-card').boundingBox();assert.equal(Math.round(rect.width),width);assert.equal(Math.round(rect.height),844);await noOverflow('#ucV10InvoiceForm .db137-wizard-nav');}
  const invoiceDownload=page.waitForEvent('download');await invoice.locator('[data-db137-finish]').first().click();const pdf=await invoiceDownload;await pdf.saveAs(join(output,'synthetic-invoice.pdf'));assert.equal((await readFile(join(output,'synthetic-invoice.pdf'))).subarray(0,5).toString(),'%PDF-');
  await page.evaluate(()=>document.documentElement.dataset.colorMode='dark');await settle();await page.screenshot({path:join(output,'client-invoice-dark.png')});assert.equal(await page.locator('#ucV9DocumentModal .uc-v9-doc-card').evaluate(node=>getComputedStyle(node).backgroundColor==='rgb(255, 255, 255)'),false);await page.evaluate(()=>document.documentElement.dataset.colorMode='light');
  await page.screenshot({path:join(output,'client-invoice-review.png')});await page.evaluate(()=>window.closeUCV9DocumentModal());await viewport(390);
  phase('refund payment cards prefill one full-screen review wizard');
  await page.evaluate(()=>window.ucV14OpenRefunds(document.querySelector('[data-uc-refunds-tab]')));await settle();
  assert.equal(await page.locator('#ucTabRefunds .db141-refund-launch').isVisible(),true);assert.equal(await page.locator('#ucTabRefunds .uc-v14-refund-editor').count(),0);assert.equal(await page.locator('#ucTabRefunds .uc-v14-grid-head:visible').count(),0);
  assert.equal(await page.locator('#ucTabRefunds .db141-refundable-record').count(),2);await noOverflow('#ucTabRefunds .db141-record');
  await page.locator('#ucTabRefunds .db141-refundable-record').nth(1).click();await settle();
  const refund=page.locator('#db141ClientRefundForm');assert.equal(await page.locator('#db141ClientRefundModal').isVisible(),true);assert.equal(await refund.locator('.db137-wizard-step').count(),4);
  assert.equal(await refund.locator('#ucV14RefundPaymentId').inputValue(),'pi_fixture_two');
  assert.equal(await refund.locator('#ucV14RefundAmount').isVisible(),false);await refund.locator('[data-db137-next]').click();assert.equal(await refund.locator('#ucV14RefundPaymentId').isVisible(),true);await refund.locator('[data-db137-next]').click();
  await refund.locator('#ucV14RefundAmount').fill('0');await refund.locator('[data-db137-next]').click();assert.equal(await refund.getAttribute('data-db137-current'),'2','invalid zero cannot pass Continue');
  await refund.locator('#ucV14RefundAmount').fill('0.50');await refund.locator('#ucV14RefundReason').fill('Synthetic refund review');await refund.locator('[data-db137-next]').click();assert.ok((await refund.locator('.db138-review').textContent()).includes('Synthetic refund review'));assert.equal(await refund.locator('[data-db137-finish]:visible').count(),1);
  await refund.locator('[data-db137-finish]').click();await settle();assert.equal(await page.locator('#ucV14RefundConfirm').isVisible(),true);
  const refundZ=await page.locator('#db141ClientRefundModal').evaluate(node=>+getComputedStyle(node).zIndex),approvalZ=await page.locator('#ucV14RefundConfirm').evaluate(node=>+getComputedStyle(node).zIndex);assert.ok(approvalZ>refundZ&&refundZ>clientZ);
  assert.equal(writes.filter(write=>write.path==='/api/admin/refunds').length,0,'review/approval navigation never sends a refund');await page.keyboard.press('Escape');assert.equal(await page.locator('#ucV14RefundConfirm').isVisible(),false);assert.equal(await page.locator('#db141ClientRefundModal').isVisible(),true);await page.waitForTimeout(1800);await page.screenshot({path:join(output,'client-refund-review.png')});await page.locator('#db141ClientRefundModal header button:visible').click();assert.equal(await page.locator('#ucClientModal').isVisible(),true);await page.evaluate(()=>window.closeUCClientModal());
  phase('compact saved-image sorting on a short phone');
  savedImages.push({id:23,product_id:1,public_url:'/assets/product-generic.svg',source_url:'/assets/product-generic.svg',alt_text:'Second saved image',is_cover:0,sort_order:2});
  await viewport(320,568);await page.evaluate(()=>window.tab('products'));await settle();await page.evaluate(()=>window.openMedia(1));await settle();
  const media=page.locator('#ucV1624MediaForm');await media.locator('[name="image_url"]').fill('https://example.test/new-image.png');await media.locator('[name="alt_text"]').fill('New image');await media.locator('[data-db137-next]').click();await media.locator('[data-db137-next]').click();await settle();
  assert.equal(await page.locator('.db141-image-card').count(),2);assert.equal(await page.locator('.db141-image-card [data-db141-move="up"]').count(),2);assert.equal(await page.locator('.db141-image-card [data-db141-move="down"]').count(),2);
  const images=await media.locator('.db138-form-content').evaluate(body=>{
    body.scrollTop=0;const bounds=body.getBoundingClientRect(),cards=[...body.querySelectorAll('.db141-image-card')];return {bottom:bounds.bottom,cards:cards.map(card=>{const rect=card.getBoundingClientRect(),img=card.querySelector('img').getBoundingClientRect();return {bottom:rect.bottom,imageHeight:img.height,visibleImage:Math.max(0,Math.min(bounds.bottom,img.bottom)-Math.max(bounds.top,img.top))};})};
  });assert.ok(images.cards[0].bottom<=images.bottom,'first saved image and all actions fit');assert.ok(images.cards[1].visibleImage>=images.cards[1].imageHeight/2,'half of the second image fits on a 568px phone');
  await page.locator('.db141-image-card [data-db141-move="down"]').first().click();await settle();assert.ok(writes.some(write=>write.path==='/api/admin/media'&&JSON.parse(write.body||'{}').action==='move'&&JSON.parse(write.body).dir===1),'mobile down uses original reorder API');
  await page.screenshot({path:join(output,'product-images-small-phone.png')});await page.evaluate(()=>document.querySelector('#mediaModal').classList.remove('open'));
  phase('tabs, compact chart segments, persistent Filter FAB and all help sheets');
  await viewport(390);await page.evaluate(()=>window.tab('growthAnalytics'));await settle();
  assert.equal(await page.locator('#growthAnalytics>.top .db140-filter-trigger').count(),0);assert.equal(await page.locator('#growthAnalytics>.db141-filter-fab').textContent(),'Filter');
  for(const mode of ['business','visitors','leads','coaches']){
    await page.locator('[data-uc88-mode="'+mode+'"]').click();await settle();
    const metricCount=await page.locator('[data-uc88-growth-summary]>.uc88-metric').count();if(metricCount===1)assert.equal(await page.locator('[data-uc88-growth-summary]+.db137-carousel-dots').count(),0,'one metric clears stale pagination');
    assert.equal(await page.locator('.uc89-mode-tabs').evaluate(node=>getComputedStyle(node).display),'flex');
    await page.locator('.db141-filter-fab').click();assert.equal(await page.locator('#growthAnalytics .db140-filter-sheet').isVisible(),true);await page.locator('#growthAnalytics .db140-filter-sheet header button').click();
  }
  await page.locator('[data-db141-period="weekly"]').click();await settle();assert.equal(await page.locator('[data-uc88-period]').inputValue(),'weekly');assert.equal(await page.locator('[data-db141-period="weekly"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.uc88-chart-types .db141-desktop-label:visible').count(),0);assert.equal(await page.locator('.uc88-chart-types>button>svg:visible').count(),4);
  await page.screenshot({path:join(output,'growth-tabs-segments-fab.png')});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await settle();const fab=await page.locator('.db141-filter-fab').boundingBox();assert.ok(fab.y>700&&fab.y+fab.height<=844,'Filter stays fixed to viewport after scrolling');
  await page.locator('#growthAnalytics [data-db139-source*="uc88-help-toggle"]').click();await settle();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.equal(await page.locator('#db137ChoiceSheet .db137-sheet-done').isVisible(),true);assert.equal(await page.locator('#growthAnalytics [data-uc88-front]').isVisible(),true);await page.locator('[data-db137-sheet-done]').click();
  await page.evaluate(()=>window.tab('heatMaps'));await settle();await page.locator('#heatMaps [data-db139-action="info"]:visible').click();await settle();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.ok((await page.locator('.db138-help-copy').textContent()).includes('Attention Map'));assert.equal(await page.locator('#heatMaps [data-uc92-front]').isVisible(),true);await page.screenshot({path:join(output,'global-help-sheet.png')});await page.locator('[data-db137-sheet-done]').click();
  await page.evaluate(()=>window.tab('businessCalendar'));await settle();await page.locator('[data-uc88-view="list"]').click();await settle();const date=page.locator('.uc88-list-row').first();assert.ok((await date.boundingBox()).height>=48);assert.equal(await date.locator('.db140-date-chevron svg').evaluate(node=>getComputedStyle(node).strokeWidth),'1.8px');await date.click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);await page.locator('[data-db137-sheet-done]').click();
  await page.evaluate(()=>window.tab('socialPosts'));await settle();await page.evaluate(()=>window.load_socialPosts());await settle();await page.locator('#socialPosts [data-db142-post="text"]').first().click();await page.locator('#socialPosts .db142-social-help:visible').first().click();assert.equal(await page.locator('#db137ChoiceSheet').isVisible(),true);assert.ok((await page.locator('.db138-help-copy').textContent()).includes('How this behaves'));await page.locator('[data-db137-sheet-done]').click();assert.equal(await page.locator('#socialPosts .uc48-info-card.is-flipped').count(),0,'capability helpers never flip on mobile');
  await page.locator('#socialPosts .db138-inline-form-open .db141-header-close').click();
  await page.evaluate(()=>window.tab('marketingAnalytics'));await settle();assert.equal(await page.locator('#marketingAnalytics [data-uc92-chart]>svg:visible').count(),4,'Marketing Analytics reuses the global chart icon segments');await page.locator('#marketingAnalytics [data-uc92-chart="bar"]').click();await settle();assert.equal(await page.locator('#marketingAnalytics [data-uc92-chart="bar"]').getAttribute('aria-pressed'),'true');
  await writeFile(join(output,'component-browser-errors.json'),JSON.stringify(errors,null,2));assert.equal(errors.length,0,'component workflows have no browser exceptions');
  phase('all shared component checks passed');
}
