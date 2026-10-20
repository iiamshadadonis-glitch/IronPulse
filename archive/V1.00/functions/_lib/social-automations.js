import { generateAiText } from './ai-integrations.js';
import { resolveLiveOffer, offerMessage } from './live-offers.js';

const clean=(v,n=6000)=>String(v??'').trim().slice(0,n);
const jsonObj=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v||''):(v??f);}catch{return f;}};
const normalize=v=>clean(v,2000).toLowerCase().replace(/\s+/g,' ').trim();
const SUPPORTED_DM=new Set(['facebook','instagram','whatsapp','x']);
const SUPPORTED_COMMENTS=new Set(['facebook','instagram','threads','youtube','x','linkedin','google_maps']);
const SUPPORTED_COMMENT_DM=new Set(['facebook','instagram']);
const MESSAGE_TYPES=new Set(['text','image','document','buttons','interactive_buttons','image_buttons','list','whatsapp_template','payment','private_dm','comment_reply','offer']);
const AUTO_TYPES=new Set(['question','condition','set_attribute','api_request','ai_reply','handoff','delay','end']);
const COMMENT_DM_PRIVATE_TYPES=new Set(['text','image','document','buttons','interactive_buttons','image_buttons','private_dm','offer']);
let schemaReady=false;

export async function ensureSocialAutomationSchema(env){
  if(schemaReady||!env?.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL DEFAULT 'dm',
    platform TEXT NOT NULL DEFAULT 'instagram',
    enabled INTEGER NOT NULL DEFAULT 0,
    trigger_mode TEXT NOT NULL DEFAULT 'keyword',
    trigger_value TEXT NOT NULL DEFAULT '',
    definition_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_sessions (
    platform TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    flow_id INTEGER NOT NULL,
    node_id TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(platform,participant_id)
  )`).run();
  await env.DB.prepare("ALTER TABLE social_automation_sessions ADD COLUMN state_json TEXT NOT NULL DEFAULT '{}'").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_attributes (
    platform TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    attribute_name TEXT NOT NULL,
    attribute_value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(platform,participant_id,attribute_name)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_controls (
    platform TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'automation',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(platform,participant_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    participant_id TEXT NOT NULL DEFAULT '',
    external_event_id TEXT NOT NULL DEFAULT '',
    matched_text TEXT NOT NULL DEFAULT '',
    step_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'processed',
    error_message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_events (
    channel TEXT NOT NULL,
    platform TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    participant_id TEXT NOT NULL DEFAULT '',
    event_text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'claimed',
    flow_id INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(channel,platform,external_event_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_automation_round_robin (
    flow_id INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    cursor INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(flow_id,node_id)
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_automation_flows_channel ON social_automation_flows(channel,platform,enabled,id)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_automation_runs_created ON social_automation_runs(created_at DESC,id DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_automation_events_updated ON social_automation_events(updated_at DESC,platform,channel)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_automation_attributes_participant ON social_automation_attributes(platform,participant_id,attribute_name)').run().catch(()=>{});
  schemaReady=true;
}

function sanitizeUi(v={}){const x=Number(v?.x),y=Number(v?.y);return {x:Number.isFinite(x)?Math.max(20,Math.min(6000,x)):240,y:Number.isFinite(y)?Math.max(20,Math.min(6000,y)):120};}
function sanitizeButton(b={},i=0){const action=['reply','url','phone'].includes(clean(b.action,20).toLowerCase())?clean(b.action,20).toLowerCase():'reply';return {id:clean(b.id||`button_${i+1}`,80),label:clean(b.label||b.title||'',80),value:clean(b.value||b.payload||b.label||'',160),action,url:clean(b.url||b.link,3000),next:clean(b.next||b.nextNodeId||'',80)};}
function sanitizeStatusBranch(b={},i=0){return {id:clean(b.id||`status_${i+1}`,80),status:clean(b.status||b.code||'',20).replace(/[^0-9xX]/g,''),next:clean(b.next||b.nextNodeId||'',80)};}
function sanitizeNode(n={},i=0){
  let type=clean(n.type||'text',40).toLowerCase();if(!MESSAGE_TYPES.has(type)&&!AUTO_TYPES.has(type))type='text';
  const out={
    id:clean(n.id||`step_${i+1}`,80),name:clean(n.name||`Step ${i+1}`,100),type,
    text:clean(n.text,5000),mediaUrl:clean(n.mediaUrl||n.media_url,3000),mediaName:clean(n.mediaName||n.media_name,260),mediaViewUrl:clean(n.mediaViewUrl||n.media_view_url,3000),mediaMimeType:clean(n.mediaMimeType||n.media_mime_type,160),mediaSize:Math.max(0,Number(n.mediaSize||n.media_size||0)||0),documentUrl:clean(n.documentUrl||n.document_url,3000),documentName:clean(n.documentName||n.document_name,260),documentViewUrl:clean(n.documentViewUrl||n.document_view_url,3000),documentMimeType:clean(n.documentMimeType||n.document_mime_type,160),documentSize:Math.max(0,Number(n.documentSize||n.document_size||0)||0),linkUrl:clean(n.linkUrl||n.link_url,3000),next:clean(n.next||n.nextNodeId||'',80),
    variations:(Array.isArray(n.variations)?n.variations:[]).slice(0,10).map(x=>clean(x,1200)).filter(Boolean),delaySeconds:[5,10,15,20,25,30].includes(Number(n.delaySeconds||n.delay_seconds))?Number(n.delaySeconds||n.delay_seconds):5,productId:Math.max(0,Number(n.productId||n.product_id||0)||0),
    buttons:(Array.isArray(n.buttons)?n.buttons:[]).slice(0,20).map(sanitizeButton).filter(x=>x.label),listTitle:clean(n.listTitle||n.list_title||'Choose an option',120),
    templateName:clean(n.templateName||n.template_name,240),templateLanguage:clean(n.templateLanguage||n.template_language||'en',40),
    questionAttribute:clean(n.questionAttribute||n.question_attribute||'answer',80),questionFormat:clean(n.questionFormat||n.question_format||'text',40).toLowerCase(),questionPattern:clean(n.questionPattern||n.question_pattern,400),questionAttempts:Math.max(1,Math.min(5,Number(n.questionAttempts||n.question_attempts||2)||2)),validationMessage:clean(n.validationMessage||n.validation_message||'That does not look valid. Please try again.',1000),invalidNext:clean(n.invalidNext||n.invalid_next||'',80),
    conditionType:clean(n.conditionType||n.condition_type||'attribute',40).toLowerCase(),conditionAttribute:clean(n.conditionAttribute||n.condition_attribute||'LastMessage',80),conditionOperator:clean(n.conditionOperator||n.condition_operator||'equals',50).toLowerCase(),conditionValue:clean(n.conditionValue??n.condition_value,1000),conditionValue2:clean(n.conditionValue2??n.condition_value_2,1000),conditionTimezone:clean(n.conditionTimezone||n.condition_timezone||'Asia/Kolkata',80),trueNext:clean(n.trueNext||n.true_next||'',80),falseNext:clean(n.falseNext||n.false_next||'',80),
    setAttribute:clean(n.setAttribute||n.set_attribute||'attribute',80),setValue:clean(n.setValue??n.set_value,3000),
    apiMethod:['GET','POST','PUT','PATCH','DELETE'].includes(String(n.apiMethod||n.api_method||'GET').toUpperCase())?String(n.apiMethod||n.api_method||'GET').toUpperCase():'GET',apiUrl:clean(n.apiUrl||n.api_url,3000),apiHeaders:clean(n.apiHeaders||n.api_headers||'{}',5000),apiBody:clean(n.apiBody||n.api_body,12000),captureAttribute:clean(n.captureAttribute||n.capture_attribute||'Data',80),responsePath:clean(n.responsePath||n.response_path,300),statusBranches:(Array.isArray(n.statusBranches)?n.statusBranches:[]).slice(0,8).map(sanitizeStatusBranch).filter(x=>x.status),fallbackNext:clean(n.fallbackNext||n.fallback_next||'',80),
    aiIntegrationId:Number(n.aiIntegrationId||n.ai_integration_id||0)||0,aiModel:clean(n.aiModel||n.ai_model,240),aiInstructions:clean(n.aiInstructions||n.ai_instructions,6000),aiFallbackMessage:clean(n.aiFallbackMessage||n.ai_fallback_message||'A team member will help you shortly.',1200),
    handoffMessage:clean(n.handoffMessage||n.handoff_message,3000),
    paymentTitle:clean(n.paymentTitle||n.payment_title||'Complete your payment',120),paymentDescription:clean(n.paymentDescription||n.payment_description||'Please review the amount and complete the payment securely.',1024),paymentItemName:clean(n.paymentItemName||n.payment_item_name||'Payment',120),paymentRetailerId:clean(n.paymentRetailerId||n.payment_retailer_id||'urgent_casting_payment',120),paymentAmount:Math.max(1,Number(n.paymentAmount||n.payment_amount||199)||199),paymentTaxPercent:Math.max(0,Math.min(100,Number(n.paymentTaxPercent||n.payment_tax_percent||0)||0)),paymentImageUrl:clean(n.paymentImageUrl||n.payment_image_url,3000),paymentFooter:clean(n.paymentFooter||n.payment_footer||'IronPulse Gym',60),paymentCurrency:clean(n.paymentCurrency||n.payment_currency||'INR',8).toUpperCase(),paymentGateway:clean(n.paymentGateway||n.payment_gateway||'razorpay',40).toLowerCase(),paymentConfigurationName:clean(n.paymentConfigurationName||n.payment_configuration_name||'WhatsappPay',120),paymentNext:clean(n.paymentNext||n.payment_next||'',80),ui:sanitizeUi(n.ui||{})
  };
  if(type==='list')out.buttons=out.buttons.slice(0,10);if(type==='interactive_buttons'||type==='image_buttons')out.buttons=out.buttons.slice(0,3);if(type==='whatsapp_template')out.buttons=[];
  return out;
}
function sanitizeDefinition(d={}){const raw=jsonObj(d,{}),nodes=(Array.isArray(raw.nodes)?raw.nodes:[]).slice(0,80).map(sanitizeNode),ids=new Set(nodes.map(x=>x.id));const fix=id=>ids.has(id)?id:'';for(const n of nodes){n.next=fix(n.next);n.invalidNext=fix(n.invalidNext);n.trueNext=fix(n.trueNext);n.falseNext=fix(n.falseNext);n.fallbackNext=fix(n.fallbackNext);n.paymentNext=fix(n.paymentNext);n.buttons=n.buttons.map(b=>({...b,next:fix(b.next)}));n.statusBranches=n.statusBranches.map(b=>({...b,next:fix(b.next)}));}return {version:2,startNodeId:fix(clean(raw.startNodeId||raw.start_node_id||'',80)),nodes,viewport:{x:Number(raw?.viewport?.x)||0,y:Number(raw?.viewport?.y)||0,zoom:Math.max(.45,Math.min(1.8,Number(raw?.viewport?.zoom)||1))}};}
function validChannel(v){v=clean(v,30).toLowerCase();return ['dm','comment','comment_dm'].includes(v)?v:'dm';}
function allowedPlatform(channel,p){p=clean(p,40).toLowerCase();if(p==='all')return true;if(channel==='comment')return SUPPORTED_COMMENTS.has(p);if(channel==='comment_dm')return SUPPORTED_COMMENT_DM.has(p);return SUPPORTED_DM.has(p);}
function validateChoiceLimits(definition,platform,channel){
  if(channel!=='dm'&&channel!=='comment_dm')return;
  for(const n of definition.nodes||[]){
    if(!['buttons','interactive_buttons','image_buttons','list'].includes(n.type))continue;
    const isList=n.type==='list',interactive=['interactive_buttons','image_buttons'].includes(n.type),max=isList?10:(interactive?3:(platform==='whatsapp'?3:(platform==='facebook'||platform==='instagram'?13:10))),labelMax=isList?24:(platform==='whatsapp'||platform==='facebook'||platform==='instagram'?20:24);
    if((n.buttons||[]).length>max)throw new Error(`${platform==='whatsapp'?'WhatsApp':platform==='instagram'?'Instagram':platform==='facebook'?'Facebook':'This platform'} ${isList?'lists':'buttons'} support up to ${max} options in this flow.`);
    for(const b of n.buttons||[])if(String(b.label||'').length>labelMax)throw new Error(`${platform==='whatsapp'?'WhatsApp':platform==='instagram'?'Instagram':platform==='facebook'?'Facebook':'This platform'} option labels can be up to ${labelMax} characters. Shorten “${clean(b.label,45)}”.`);
  }
}
function activationErrors(flow={}){
  const errors=[],definition=flow.definition||{},nodes=definition.nodes||[],channel=flow.channel,platform=flow.platform;
  if(!clean(flow.name,160))errors.push({field:'name',message:'Enter the flow name.'});
  if(flow.triggerMode!=='any'&&!clean(flow.triggerValue,1200))errors.push({field:'triggerValue',message:'Enter at least one trigger word or phrase.'});
  if(flow.triggerMode==='regex'&&flow.triggerValue){try{new RegExp(flow.triggerValue,'i');}catch{errors.push({field:'triggerValue',message:'Enter a valid trigger regular expression.'});}}
  if(!nodes.length)errors.push({field:'nodes',message:'Add at least one content block.'});
  if(nodes.length&&!definition.startNodeId)errors.push({field:'startNodeId',message:'Connect Flow Start to the first block.'});
  if(channel==='comment_dm'){
    const privateNodes=nodes.filter(n=>COMMENT_DM_PRIVATE_TYPES.has(n.type));
    if(!privateNodes.length)errors.push({field:'nodes',message:'Add one Private DM, rich message, document or Plan / Offer block.'});
    privateNodes.slice(1).forEach(n=>errors.push({nodeId:n.id,field:'type',message:`${n.name||'Extra private reply'}: remove this block. Facebook and Instagram permit one initial private reply to a comment; continue only after the recipient responds.`}));
  }
  nodes.forEach((n,i)=>{
    const label=n.name||`Block ${i+1}`,push=(field,message)=>errors.push({nodeId:n.id,field,message:`${label}: ${message}`});
    if(['text','image','document','buttons','interactive_buttons','image_buttons','private_dm','question','offer'].includes(n.type)&&!clean(n.text,5000))push('text','write the message.');
    if(['image','image_buttons'].includes(n.type)&&!clean(n.mediaUrl,3000))push('mediaUrl','add an image.');
    if(n.type==='document'&&!clean(n.documentUrl,3000))push('documentUrl','add the PDF or document link.');
    if(n.type==='comment_reply'&&!(n.variations||[]).some(x=>clean(x,1200)))push('variations','add at least one public comment reply variation.');
    if(n.type==='offer'&&!Number(n.productId||0))push('productId','choose a plan or offer.');
    if(['buttons','interactive_buttons','image_buttons','list'].includes(n.type)){
      if(!(n.buttons||[]).length)push('buttons','add at least one option.');
      (n.buttons||[]).forEach((b,j)=>{if(!clean(b.label,80))push('buttons',`enter option ${j+1} label.`);if(['url','phone'].includes(b.action)&&!clean(b.url,3000))push('buttons',`enter option ${j+1} destination.`);});
    }
    if(n.type==='question'&&!clean(n.questionAttribute,80))push('questionAttribute','choose where to save the answer.');
    if(n.type==='condition'&&!clean(n.conditionAttribute,80))push('conditionAttribute','choose the value to evaluate.');
    if(n.type==='set_attribute'&&!clean(n.setAttribute,80))push('setAttribute','enter the attribute name.');
    if(n.type==='api_request'&&!/^https:\/\//i.test(clean(n.apiUrl,3000)))push('apiUrl','enter a valid HTTPS API URL.');
    if(n.type==='ai_reply'&&!Number(n.aiIntegrationId||0))push('aiIntegrationId','choose an enabled AI integration.');
    if(n.type==='ai_reply'&&!clean(n.aiModel,240))push('aiModel','choose an AI model.');
    if(n.type==='whatsapp_template'&&!clean(n.templateName,240))push('templateName','enter the approved WhatsApp template name.');
  });
  if(channel==='dm'&&nodes.some(n=>n.type==='payment')&&platform!=='whatsapp')errors.push({field:'nodes',message:'Native WhatsApp Pay blocks can only be activated in a WhatsApp DM flow.'});
  if(channel==='dm'&&nodes.some(n=>n.type==='whatsapp_template')&&platform!=='whatsapp')errors.push({field:'nodes',message:'WhatsApp Template blocks can only be activated in a WhatsApp flow.'});
  if(channel!=='dm'&&nodes.some(n=>n.type==='ai_reply'))errors.push({field:'nodes',message:'AI Response blocks can only be activated in DM automations.'});
  return errors;
}
function assertActivatable(flow){const validationErrors=activationErrors(flow);if(!validationErrors.length){validateChoiceLimits(flow.definition,flow.platform,flow.channel);return;}const e=new Error(`Complete the required information before activating this flow: ${validationErrors.map(x=>x.message).join(' ')}`);e.validationErrors=validationErrors;throw e;}
function sanitizeFlow(input={}){
  const channel=validChannel(input.channel),platform=clean(input.platform||'instagram',40).toLowerCase(),mode=['keyword','contains','starts_with','regex','any'].includes(String(input.triggerMode||input.trigger_mode||''))?String(input.triggerMode||input.trigger_mode):'keyword';
  if(!allowedPlatform(channel,platform))throw new Error('Choose a supported platform for this automation.');
  const definition=sanitizeDefinition(input.definition||input.definition_json||{});
  if(channel==='comment')for(const n of definition.nodes){if(['image','document','buttons','interactive_buttons','image_buttons','list','whatsapp_template','payment','question','private_dm','comment_reply','offer'].includes(n.type))n.type='text';}
  if(channel==='comment_dm'){
    const allowed=new Set(['text','image','document','buttons','interactive_buttons','image_buttons','private_dm','comment_reply','offer','delay','condition','set_attribute','api_request','end']);
    for(const n of definition.nodes)if(!allowed.has(n.type))n.type='text';
    for(const n of definition.nodes.filter(n=>n.type==='comment_reply'))if(!(n.variations||[]).length&&n.text)n.variations=[n.text];
  }
  const trigger=clean(input.triggerValue??input.trigger_value,1200),flow={name:clean(input.name,160),channel,platform,enabled:input.enabled===true||input.enabled===1||String(input.enabled).toLowerCase()==='true'?1:0,triggerMode:mode,triggerValue:trigger,definition};
  if(flow.enabled)assertActivatable(flow);return flow;
}
function serializeRow(r){return {...r,enabled:!!Number(r.enabled||0),triggerMode:r.trigger_mode,triggerValue:r.trigger_value,definition:sanitizeDefinition(r.definition_json)};}

export async function hasEnabledDmAutomation(env,platform=''){await ensureSocialAutomationSchema(env);platform=clean(platform,40).toLowerCase();if(!platform)return false;const row=await env.DB.prepare(`SELECT id FROM social_automation_flows WHERE enabled=1 AND channel='dm' AND (platform=? OR platform='all') LIMIT 1`).bind(platform).first().catch(()=>null);return !!row?.id;}

export async function listAutomationFlows(env,{channel='',platform=''}={}){await ensureSocialAutomationSchema(env);const where=[],bind=[];if(channel){where.push('channel=?');bind.push(clean(channel,20));}if(platform){where.push('platform=?');bind.push(clean(platform,40));}const q=`SELECT * FROM social_automation_flows ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY enabled DESC,updated_at DESC,id DESC`;const r=await env.DB.prepare(q).bind(...bind).all();return (r.results||[]).map(serializeRow);}
export async function saveAutomationFlow(env,input={}){await ensureSocialAutomationSchema(env);const f=sanitizeFlow(input),id=Number(input.id||0),def=JSON.stringify(f.definition);if(id>0)await env.DB.prepare(`UPDATE social_automation_flows SET name=?,channel=?,platform=?,enabled=?,trigger_mode=?,trigger_value=?,definition_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(f.name,f.channel,f.platform,f.enabled,f.triggerMode,f.triggerValue,def,id).run();else await env.DB.prepare(`INSERT INTO social_automation_flows(name,channel,platform,enabled,trigger_mode,trigger_value,definition_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(f.name,f.channel,f.platform,f.enabled,f.triggerMode,f.triggerValue,def).run();const row=id>0?await env.DB.prepare('SELECT * FROM social_automation_flows WHERE id=?').bind(id).first():await env.DB.prepare('SELECT * FROM social_automation_flows ORDER BY id DESC LIMIT 1').first();return row?serializeRow(row):null;}
export async function deleteAutomationFlow(env,id){await ensureSocialAutomationSchema(env);id=Number(id||0);if(!id)return false;await env.DB.prepare('DELETE FROM social_automation_sessions WHERE flow_id=?').bind(id).run().catch(()=>{});await env.DB.prepare('DELETE FROM social_automation_round_robin WHERE flow_id=?').bind(id).run().catch(()=>{});const r=await env.DB.prepare('DELETE FROM social_automation_flows WHERE id=?').bind(id).run();return Number(r?.meta?.changes||0)>0;}
export async function setAutomationEnabled(env,id,enabled){await ensureSocialAutomationSchema(env);id=Number(id||0);if(enabled){const row=await env.DB.prepare('SELECT * FROM social_automation_flows WHERE id=?').bind(id).first();if(!row)throw new Error('Automation flow was not found.');const f={...serializeRow(row),channel:row.channel,platform:row.platform,name:row.name};assertActivatable(f);}await env.DB.prepare('UPDATE social_automation_flows SET enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(enabled?1:0,id).run();}

function triggerMatches(flow,text){if(flow.trigger_mode==='any')return true;const msg=normalize(text),raw=clean(flow.trigger_value,1200);if(flow.trigger_mode==='regex'){try{return new RegExp(raw,'i').test(String(text||''));}catch{return false;}}const triggers=raw.split(/[\n,]+/).map(normalize).filter(Boolean);if(!triggers.length)return false;if(flow.trigger_mode==='contains')return triggers.some(x=>msg.includes(x));if(flow.trigger_mode==='starts_with')return triggers.some(x=>msg.startsWith(x));return triggers.some(x=>msg===x);}
function definitionOf(flow){return sanitizeDefinition(flow.definition_json||flow.definition||{});}function nodeById(flow,id){return definitionOf(flow).nodes.find(n=>n.id===id)||null;}function startNode(flow){const d=definitionOf(flow);return d.nodes.find(n=>n.id===d.startNodeId)||d.nodes[0]||null;}
function buttonNext(node,text,payload){const p=normalize(payload),t=normalize(text);return (node?.buttons||[]).find((b,i)=>{const v=normalize(b.value),l=normalize(b.label),next=normalize(b.next),id=normalize(b.id),number=String(i+1),nextPayload=normalize(`ucflow:${b.next||''}`);return !!((p&&(p===v||p===number||p===nextPayload||(next&&p.endsWith(`:${next}`))||(!next&&id&&p.endsWith(`:end:${id}`))))||(t&&(t===l||t===v||t===number)));})||null;}
async function clearExpiredSession(env,platform,participantId){const s=await env.DB.prepare('SELECT * FROM social_automation_sessions WHERE platform=? AND participant_id=?').bind(platform,participantId).first();if(!s)return null;if(s.expires_at&&new Date(s.expires_at).getTime()<Date.now()){await env.DB.prepare('DELETE FROM social_automation_sessions WHERE platform=? AND participant_id=?').bind(platform,participantId).run();return null;}return {...s,state:jsonObj(s.state_json,{})};}
async function attributesFor(env,platform,participantId,ctx={}){const out={LastMessage:clean(ctx.text,5000),Platform:platform,Name:clean(ctx.participantName,240),FirstName:clean(ctx.participantName,240).split(/\s+/)[0]||'',Username:clean(ctx.participantUsername,200)};if(!participantId)return out;const r=await env.DB.prepare('SELECT attribute_name,attribute_value FROM social_automation_attributes WHERE platform=? AND participant_id=?').bind(platform,participantId).all().catch(()=>({results:[]}));for(const x of r.results||[])out[x.attribute_name]=x.attribute_value;
  const lead=await env.DB.prepare(`SELECT l.* FROM lead_identity_links i JOIN contact_leads l ON l.id=i.lead_id WHERE lower(i.platform)=lower(?) AND i.external_id=? ORDER BY i.updated_at DESC,i.rowid DESC LIMIT 1`).bind(platform,participantId).first().catch(()=>null);
  if(lead){const candidates=(await env.DB.prepare("SELECT field_name,value,is_primary,last_seen_at FROM lead_field_candidates WHERE lead_id=? AND field_name IN ('facebook_id','instagram_id','threads_id','snapchat_id','linkedin_id','twitter_id','pinterest_id','youtube_id','tiktok_id','telegram_id') ORDER BY is_primary DESC,last_seen_at DESC,id DESC").bind(lead.id).all().catch(()=>({results:[]}))).results||[],social={};for(const item of candidates)if(!social[item.field_name])social[item.field_name]=clean(item.value,500);const name=clean(lead.name,240),dob=clean(lead.date_of_birth,40),age=clean(lead.age,20)||(dob?String(Math.max(0,new Date().getUTCFullYear()-new Date(dob).getUTCFullYear())):'');Object.assign(out,{Name:name||out.Name,FirstName:(name||out.Name).split(/\s+/)[0]||'',ClientName:name,ClientPhone:clean(lead.phone,80),ClientEmail:clean(lead.email,320),ClientDOB:dob,ClientAge:age,ClientGender:clean(lead.gender,80),ClientLocation:clean(lead.location,300),ClientInterests:clean(lead.interests,500),FacebookID:social.facebook_id||'',InstagramID:clean(lead.instagram_id,500)||social.instagram_id||'',ThreadsID:social.threads_id||'',SnapchatID:social.snapchat_id||'',LinkedInID:social.linkedin_id||'',XID:social.twitter_id||'',PinterestID:social.pinterest_id||'',YouTubeID:social.youtube_id||'',TikTokID:social.tiktok_id||'',TelegramID:social.telegram_id||''});}
  return out;}
async function setAttribute(env,platform,participantId,name,value){name=clean(name,80);if(!participantId||!name)return;await env.DB.prepare(`INSERT INTO social_automation_attributes(platform,participant_id,attribute_name,attribute_value,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform,participant_id,attribute_name) DO UPDATE SET attribute_value=excluded.attribute_value,updated_at=CURRENT_TIMESTAMP`).bind(platform,participantId,name,clean(value,12000)).run();try{const m=await import('./lead-nurturing.js');await m.applyCapturedLeadAttribute(env,platform,participantId,name,value);}catch{}}
const AT_TOKENS=['ClientName','ClientPhone','ClientEmail','ClientDOB','ClientAge','ClientGender','ClientLocation','ClientInterests','FacebookID','InstagramID','ThreadsID','SnapchatID','LinkedInID','XID','PinterestID','YouTubeID','TikTokID','TelegramID'];
function renderVars(v,attrs={}){let s=String(v??'');for(const key of AT_TOKENS){const token=`@${key}`,value=clean(attrs[key],1000);if(!s.toLowerCase().includes(token.toLowerCase()))continue;if(!value&&key!=='ClientName'){const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');s=s.replace(new RegExp(`[^.!?\\n]*${escaped}[^.!?\\n]*(?:[.!?]|$)`,'gi'),'');}else{s=s.replace(new RegExp(token,'gi'),value||(key==='ClientName'?'there':''));}}s=s.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,(_,k)=>String(attrs[k]??''));s=s.replace(/\$([A-Za-z][A-Za-z0-9_.-]*)/g,(_,k)=>String(attrs[k]??''));return s.replace(/[ \t]+([,.;!?])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function valueAt(obj,path=''){if(!path)return obj;let cur=obj;for(const p of String(path).replace(/^\$\.?/,'').split('.').filter(Boolean)){if(cur==null)return'';cur=cur[p];}return cur;}
function zonedParts(timeZone='Asia/Kolkata'){try{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),m={};for(const p of parts)if(p.type!=='literal')m[p.type]=p.value;return {date:`${m.year}-${m.month}-${m.day}`,time:`${m.hour}:${m.minute}`};}catch{return {date:new Date().toISOString().slice(0,10),time:new Date().toISOString().slice(11,16)};}}
function conditionPasses(node,attrs={}){const type=node.conditionType||'attribute';if(type==='time_in'){const hm=zonedParts(node.conditionTimezone).time,a=String(node.conditionValue||'00:00'),b=String(node.conditionValue2||'23:59');return a<=b?(hm>=a&&hm<=b):(hm>=a||hm<=b);}if(type==='date_in'){const d=zonedParts(node.conditionTimezone).date,a=String(node.conditionValue||'0000-01-01'),b=String(node.conditionValue2||'9999-12-31');return d>=a&&d<=b;}const actual=String(attrs[node.conditionAttribute]??''),expected=renderVars(node.conditionValue,attrs),op=node.conditionOperator||'equals',a=normalize(actual),e=normalize(expected);if(op==='exists')return !!a;if(op==='not_exists')return !a;if(op==='equals')return a===e;if(op==='not_equals')return a!==e;if(op==='contains')return a.includes(e);if(op==='not_contains')return !a.includes(e);if(op==='starts_with')return a.startsWith(e);if(op==='not_starts_with')return !a.startsWith(e);if(op==='greater_than')return Number(actual)>Number(expected);if(op==='less_than')return Number(actual)<Number(expected);if(op==='regex'){try{return new RegExp(expected,'i').test(actual);}catch{return false;}}return false;}
function validateAnswer(node,text){const v=clean(text,5000),fmt=node.questionFormat||'text';if(!v)return false;if(fmt==='text')return true;if(fmt==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);if(fmt==='phone')return /^\+?[0-9][0-9\s()-]{6,18}$/.test(v);if(fmt==='number')return Number.isFinite(Number(v));if(fmt==='date')return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));if(fmt==='time')return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);if(fmt==='regex'){try{return new RegExp(node.questionPattern||'.+').test(v);}catch{return false;}}return true;}
function safeApiUrl(raw){const u=new URL(raw);if(!['https:'].includes(u.protocol))throw new Error('Automation API Request URLs must use HTTPS.');const h=u.hostname.toLowerCase();if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local')||h.endsWith('.internal')||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))throw new Error('Private/local network addresses are not allowed in Automation API Requests.');return u.toString();}
async function apiRequest(node,attrs={}){const url=safeApiUrl(renderVars(node.apiUrl,attrs));let headers=jsonObj(renderVars(node.apiHeaders||'{}',attrs),{});if(!headers||Array.isArray(headers)||typeof headers!=='object')headers={};const method=node.apiMethod||'GET',bodyText=renderVars(node.apiBody||'',attrs),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);let res;try{res=await fetch(url,{method,headers,...(!['GET','DELETE'].includes(method)&&bodyText?{body:bodyText}:{}),signal:ctrl.signal,redirect:'manual'});}finally{clearTimeout(timer);}const txt=await res.text().catch(()=>''),data=(()=>{try{return txt?JSON.parse(txt):{};}catch{return txt;}})(),captured=valueAt(data,node.responsePath);return {status:res.status,ok:res.ok,data,text:txt,captured:typeof captured==='string'?captured:JSON.stringify(captured??'')};}
function renderedStep(node,attrs){return {...node,text:clean(renderVars(node.text,attrs),5000),mediaUrl:clean(renderVars(node.mediaUrl,attrs),3000),documentUrl:clean(renderVars(node.documentUrl,attrs),3000),linkUrl:clean(renderVars(node.linkUrl,attrs),3000),paymentTitle:clean(renderVars(node.paymentTitle,attrs),120),paymentDescription:clean(renderVars(node.paymentDescription,attrs),1024),paymentItemName:clean(renderVars(node.paymentItemName,attrs),120),paymentRetailerId:clean(renderVars(node.paymentRetailerId,attrs),120),paymentImageUrl:clean(renderVars(node.paymentImageUrl,attrs),3000),paymentFooter:clean(renderVars(node.paymentFooter,attrs),60),buttons:(node.buttons||[]).map(b=>({...b,label:clean(renderVars(b.label,attrs),80),value:clean(renderVars(b.value,attrs),160),url:clean(renderVars(b.url,attrs),3000)})),templateName:clean(renderVars(node.templateName,attrs),240)};}
async function nextReplyVariation(env,flowId,node,attrs){
  const choices=(node.variations||[]).map(x=>clean(renderVars(x,attrs),1200)).filter(Boolean);if(!choices.length)return clean(renderVars(node.text,attrs),1200);
  const row=await env.DB.prepare(`INSERT INTO social_automation_round_robin(flow_id,node_id,cursor,updated_at) VALUES(?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(flow_id,node_id) DO UPDATE SET cursor=social_automation_round_robin.cursor+1,updated_at=CURRENT_TIMESTAMP RETURNING cursor`).bind(Number(flowId||0),clean(node.id,80)).first().catch(()=>null);
  const cursor=Math.max(1,Number(row?.cursor||1));return choices[(cursor-1)%choices.length];
}
async function hydrateOffer(env,step,attrs){
  if(!Number(step.productId||0))return step;const offer=await resolveLiveOffer(env,step.productId);if(!offer)return {...step,text:clean(renderVars(step.text,attrs),5000),offer:null};
  const out={...step,offer,linkUrl:offer.url,text:offerMessage(offer,clean(renderVars(step.text,attrs),3500))};
  if(step.type==='offer'){out.type='interactive_buttons';out.buttons=[{id:`offer_${offer.id}`,label:offer.full?'View details':'View offer',value:`offer:${offer.id}`,action:'url',url:offer.url,next:''}];}
  return out;
}
async function executeFrom(env,row,startId,ctx,attrs){
  const flow=serializeRow(row),def=flow.definition,by=new Map(def.nodes.map(n=>[n.id,n])),steps=[];let id=startId||def.startNodeId,ended=false,handoff=false,lastNodeId='',guard=0,session=null;
  while(id&&guard++<40){
    const n=by.get(id);if(!n)break;lastNodeId=n.id;
    if(n.type==='delay'){steps.push({...n,type:'delay',delaySeconds:n.delaySeconds});id=n.next;if(!id)ended=true;continue;}
    if(n.type==='comment_reply'){steps.push({...renderedStep(n,attrs),type:'comment_reply',text:await nextReplyVariation(env,flow.id,n,attrs)});id=n.next;if(!id)ended=true;continue;}
    if(MESSAGE_TYPES.has(n.type)){if(flow.channel==='comment_dm'&&steps.some(s=>COMMENT_DM_PRIVATE_TYPES.has(s.type))){ended=true;break;}let out=renderedStep(n,attrs);out=await hydrateOffer(env,out,attrs);steps.push(out);if(flow.channel==='dm'&&(n.buttons||[]).some(b=>(b.action||'reply')==='reply')){session={nodeId:n.id,state:{waitingType:'choice',attempts:0}};break;}const sequentialNext=n.type==='payment'?n.paymentNext:n.next;if(sequentialNext){id=sequentialNext;continue;}ended=true;break;}
    if(n.type==='question'){steps.push({...renderedStep(n,attrs),type:'text'});session={nodeId:n.id,state:{waitingType:'question',attempts:0}};break;}
    if(n.type==='condition'){id=conditionPasses(n,attrs)?n.trueNext:n.falseNext;if(!id)ended=true;continue;}
    if(n.type==='set_attribute'){const name=n.setAttribute||'attribute',value=renderVars(n.setValue,attrs);await setAttribute(env,ctx.platform,ctx.participantId,name,value);attrs[name]=value;id=n.next;if(!id)ended=true;continue;}
    if(n.type==='api_request'){if(!n.apiUrl){id=n.fallbackNext;if(!id)ended=true;continue;}try{const r=await apiRequest(n,attrs);if(n.captureAttribute){await setAttribute(env,ctx.platform,ctx.participantId,n.captureAttribute,r.captured);attrs[n.captureAttribute]=r.captured;}attrs.ApiStatus=String(r.status);const branch=(n.statusBranches||[]).find(b=>String(b.status)===String(r.status)||(/^\dxx$/i.test(b.status)&&String(r.status)[0]===String(b.status)[0]));id=branch?.next||n.fallbackNext;if(!id)ended=true;}catch(e){attrs.ApiError=clean(e.message,1000);id=n.fallbackNext;if(!id)ended=true;}continue;}
    if(n.type==='ai_reply'){
      try{const reply=await generateAiText(env,{integrationId:n.aiIntegrationId,model:n.aiModel,text:ctx.text,history:ctx.history||[],attributes:attrs,nodeInstructions:n.aiInstructions});if(reply)steps.push({...n,type:'text',text:clean(reply,5000),aiGenerated:true});}
      catch(e){attrs.AiError=clean(e.message,1200);const fallback=renderVars(n.aiFallbackMessage,attrs);if(fallback)steps.push({...n,type:'text',text:clean(fallback,5000),aiGenerated:false,aiError:attrs.AiError});}
      session={nodeId:n.id,state:{waitingType:'ai',attempts:0}};break;
    }
    if(n.type==='handoff'){const t=renderVars(n.handoffMessage||n.text,attrs);if(t)steps.push({...n,type:'text',text:t});handoff=true;ended=true;break;}
    if(n.type==='end'){const t=renderVars(n.text,attrs);if(t)steps.push({...n,type:'text',text:t});ended=true;break;}
    ended=true;break;
  }
  if(guard>=40)ended=true;return {flow,steps,step:steps[steps.length-1]||nodeById(row,lastNodeId),lastNodeId,ended,handoff,session,attributes:attrs};
}

export async function matchAutomation(env,{channel='dm',platform='',participantId='',participantName='',participantUsername='',text='',payload='',history=[]}={}){
  await ensureSocialAutomationSchema(env);channel=validChannel(channel);platform=clean(platform,40).toLowerCase();participantId=clean(participantId,300);const ctx={channel,platform,participantId,participantName,participantUsername,text,payload,history:Array.isArray(history)?history:[]},attrs=await attributesFor(env,platform,participantId,ctx);
  if(channel==='dm'&&participantId){const s=await clearExpiredSession(env,platform,participantId);if(s){const row=await env.DB.prepare('SELECT * FROM social_automation_flows WHERE id=? AND enabled=1').bind(Number(s.flow_id)).first();if(row){const current=nodeById(row,s.node_id);if(current&&s.state?.waitingType==='question'){if(!validateAnswer(current,text)){const attempts=Number(s.state?.attempts||0)+1;if(attempts<Number(current.questionAttempts||2)){return {flow:serializeRow(row),steps:[{id:`${current.id}_validation`,type:'text',text:renderVars(current.validationMessage,attrs)}],step:current,lastNodeId:current.id,ended:false,session:{nodeId:current.id,state:{waitingType:'question',attempts}}};}if(current.invalidNext)return executeFrom(env,row,current.invalidNext,ctx,attrs);return {flow:serializeRow(row),steps:[{id:`${current.id}_validation`,type:'text',text:renderVars(current.validationMessage,attrs)}],step:current,lastNodeId:current.id,ended:true,session:null};}await setAttribute(env,platform,participantId,current.questionAttribute||'answer',text);attrs[current.questionAttribute||'answer']=text;return executeFrom(env,row,current.next,ctx,attrs);}if(current&&s.state?.waitingType==='ai'&&current.type==='ai_reply')return executeFrom(env,row,current.id,ctx,attrs);if(current){const btn=buttonNext(current,text,payload);if(btn){if(btn.next)return executeFrom(env,row,btn.next,ctx,attrs);return {flow:serializeRow(row),steps:[],step:current,lastNodeId:current.id,ended:true,session:null};}}}}}
  const r=await env.DB.prepare(`SELECT * FROM social_automation_flows WHERE enabled=1 AND channel=? AND (platform=? OR platform='all') ORDER BY CASE WHEN platform=? THEN 0 ELSE 1 END,id ASC`).bind(channel,platform,platform).all();for(const row of r.results||[])if(triggerMatches(row,text)){const start=startNode(row);if(start)return executeFrom(env,row,start.id,ctx,attrs);}return null;
}

export async function advanceAutomationSession(env,{platform='',participantId='',flow=null,step=null,session=undefined,ended=false}={}){await ensureSocialAutomationSchema(env);platform=clean(platform,40).toLowerCase();participantId=clean(participantId,300);if(!platform||!participantId)return;if(session===undefined&&flow&&step){const waiting=MESSAGE_TYPES.has(step.type)&&(step.buttons||[]).some(b=>b.label&&(b.action||'reply')==='reply')?'choice':step.type==='question'?'question':'';session=waiting?{nodeId:step.id,state:{waitingType:waiting,attempts:0}}:null;}if(ended||!flow||!session?.nodeId){await env.DB.prepare('DELETE FROM social_automation_sessions WHERE platform=? AND participant_id=?').bind(platform,participantId).run().catch(()=>{});return;}const expires=new Date(Date.now()+24*60*60*1000).toISOString();await env.DB.prepare(`INSERT INTO social_automation_sessions(platform,participant_id,flow_id,node_id,expires_at,state_json,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform,participant_id) DO UPDATE SET flow_id=excluded.flow_id,node_id=excluded.node_id,expires_at=excluded.expires_at,state_json=excluded.state_json,updated_at=CURRENT_TIMESTAMP`).bind(platform,participantId,Number(flow.id||0),clean(session.nodeId,80),expires,JSON.stringify(session.state||{})).run();}
export async function getAutomationSessionState(env,platform='',participantId=''){await ensureSocialAutomationSchema(env);platform=clean(platform,40).toLowerCase();participantId=clean(participantId,300);if(!platform||!participantId)return {active:false};const s=await clearExpiredSession(env,platform,participantId);return s?{active:true,flowId:Number(s.flow_id||0),nodeId:clean(s.node_id,80),waitingType:clean(s.state?.waitingType,40)}:{active:false};}
export async function getAutomationControl(env,platform='',participantId=''){await ensureSocialAutomationSchema(env);platform=clean(platform,40).toLowerCase();participantId=clean(participantId,300);if(!platform||!participantId)return {mode:'automation'};const row=await env.DB.prepare('SELECT mode,updated_at FROM social_automation_controls WHERE platform=? AND participant_id=?').bind(platform,participantId).first().catch(()=>null);return {mode:row?.mode==='human'?'human':'automation',updatedAt:row?.updated_at||''};}
export async function setAutomationControl(env,platform='',participantId='',mode='automation'){await ensureSocialAutomationSchema(env);platform=clean(platform,40).toLowerCase();participantId=clean(participantId,300);mode=mode==='human'?'human':'automation';if(!platform||!participantId)throw new Error('Conversation identity is incomplete.');await env.DB.prepare(`INSERT INTO social_automation_controls(platform,participant_id,mode,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform,participant_id) DO UPDATE SET mode=excluded.mode,updated_at=CURRENT_TIMESTAMP`).bind(platform,participantId,mode).run();return getAutomationControl(env,platform,participantId);}
export async function isHumanTakeover(env,platform='',participantId=''){return (await getAutomationControl(env,platform,participantId)).mode==='human';}

export async function claimAutomationEvent(env,{channel='dm',platform='',externalEventId='',participantId='',text=''}={}){
  await ensureSocialAutomationSchema(env);
  channel=validChannel(channel);platform=clean(platform,40).toLowerCase();externalEventId=clean(externalEventId,700);
  if(!platform||!externalEventId)return true;
  const row=await env.DB.prepare(`INSERT INTO social_automation_events(channel,platform,external_event_id,participant_id,event_text,status,flow_id,error_message,created_at,updated_at) VALUES(?,?,?,?,?,'claimed',0,'',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(channel,platform,external_event_id) DO NOTHING RETURNING external_event_id`).bind(channel,platform,externalEventId,clean(participantId,300),clean(text,1000)).first().catch(()=>null);
  return !!row?.external_event_id;
}
export async function finishAutomationEvent(env,{channel='dm',platform='',externalEventId='',status='processed',flowId=0,errorMessage=''}={}){
  await ensureSocialAutomationSchema(env);
  channel=validChannel(channel);platform=clean(platform,40).toLowerCase();externalEventId=clean(externalEventId,700);
  if(!platform||!externalEventId)return;
  await env.DB.prepare(`UPDATE social_automation_events SET status=?,flow_id=?,error_message=?,updated_at=CURRENT_TIMESTAMP WHERE channel=? AND platform=? AND external_event_id=?`).bind(clean(status,40),Number(flowId||0),clean(errorMessage,1200),channel,platform,externalEventId).run().catch(()=>{});
}
export async function recordAutomationRun(env,{flowId=0,channel='',platform='',participantId='',externalEventId='',matchedText='',stepId='',status='processed',errorMessage=''}={}){await ensureSocialAutomationSchema(env);await env.DB.prepare(`INSERT INTO social_automation_runs(flow_id,channel,platform,participant_id,external_event_id,matched_text,step_id,status,error_message,created_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(Number(flowId||0),clean(channel,20),clean(platform,40),clean(participantId,300),clean(externalEventId,700),clean(matchedText,1000),clean(stepId,80),clean(status,40),clean(errorMessage,1200)).run().catch(()=>{});}
export async function automationStats(env){await ensureSocialAutomationSchema(env);const a=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN enabled=1 THEN 1 ELSE 0 END) enabled FROM social_automation_flows`).first().catch(()=>({})),b=await env.DB.prepare(`SELECT COUNT(*) runs24h FROM social_automation_runs WHERE created_at>=datetime('now','-1 day')`).first().catch(()=>({}));return {total:Number(a?.total||0),enabled:Number(a?.enabled||0),runs24h:Number(b?.runs24h||0)};}
export async function testAutomationApiRequest(node={},attributes={}){const n=sanitizeNode({...node,type:'api_request'}),attrs={...attributes};if(!n.apiUrl)throw new Error('Enter an HTTPS API Request URL first.');const r=await apiRequest(n,attrs);return {ok:r.ok,status:r.status,preview:clean(typeof r.data==='string'?r.data:JSON.stringify(r.data),1800),captured:clean(r.captured,1800)};}
export { activationErrors as validateSocialAutomationActivation };
