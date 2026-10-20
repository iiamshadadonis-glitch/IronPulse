import { getSiteSettings, safeJsonParse } from './utils.js';

const clampPct=(v,def=0)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):def;};
const paise=v=>{const n=Number(v||0);return Number.isFinite(n)?Math.max(0,Math.round(n)):0;};
const clean=(v,n=120)=>String(v??'').trim().slice(0,n);

export const DEFAULT_TAX_SETTINGS={
  enabled:false,
  gstEnabled:false,
  gstPercent:12,
  gstNumber:'',
  serviceChargeEnabled:false,
  serviceChargeFixedPaise:0,
  serviceChargePercent:0,
  otherTaxEnabled:false,
  otherTaxLabel:'Other Tax',
  otherTaxPercent:0
};

export function normalizeTaxSettings(input={}){
  const raw=input&&typeof input==='object'?input:{};
  return {
    enabled:raw.enabled===true||raw.enabled===1||String(raw.enabled).toLowerCase()==='true',
    gstEnabled:raw.gstEnabled===true||raw.gstEnabled===1||String(raw.gstEnabled).toLowerCase()==='true',
    gstPercent:clampPct(raw.gstPercent,12),
    gstNumber:clean(raw.gstNumber,80),
    serviceChargeEnabled:raw.serviceChargeEnabled===true||raw.serviceChargeEnabled===1||String(raw.serviceChargeEnabled).toLowerCase()==='true',
    serviceChargeFixedPaise:paise(raw.serviceChargeFixedPaise),
    serviceChargePercent:clampPct(raw.serviceChargePercent,0),
    otherTaxEnabled:raw.otherTaxEnabled===true||raw.otherTaxEnabled===1||String(raw.otherTaxEnabled).toLowerCase()==='true',
    otherTaxLabel:clean(raw.otherTaxLabel||'Other Tax',60)||'Other Tax',
    otherTaxPercent:clampPct(raw.otherTaxPercent,0)
  };
}

export function calculateTaxBreakdown(baseAmountPaise,settingsInput={}){
  const base=paise(baseAmountPaise),settings=normalizeTaxSettings(settingsInput);
  if(!settings.enabled||base<=0){return {enabled:false,basePaise:base,gstPaise:0,serviceChargePaise:0,otherTaxPaise:0,totalTaxPaise:0,totalPaise:base,gstPercent:settings.gstPercent,gstNumber:settings.gstNumber,serviceChargePercent:settings.serviceChargePercent,serviceChargeFixedPaise:settings.serviceChargeFixedPaise,serviceChargeBase:'none',otherTaxLabel:settings.otherTaxLabel,otherTaxPercent:settings.otherTaxPercent};}
  const gst=settings.gstEnabled?Math.round(base*settings.gstPercent/100):0;
  let service=0,serviceBase='none';
  if(settings.serviceChargeEnabled){
    if(settings.serviceChargeFixedPaise>0){service=settings.serviceChargeFixedPaise;serviceBase='fixed';}
    else if(settings.serviceChargePercent>0){const on=settings.gstEnabled&&gst>0?gst:base;service=Math.round(on*settings.serviceChargePercent/100);serviceBase=settings.gstEnabled&&gst>0?'gst':'base';}
  }
  const other=settings.otherTaxEnabled&&settings.otherTaxPercent>0?Math.round(base*settings.otherTaxPercent/100):0;
  const tax=gst+service+other;
  return {enabled:true,basePaise:base,gstPaise:gst,serviceChargePaise:service,otherTaxPaise:other,totalTaxPaise:tax,totalPaise:base+tax,gstPercent:settings.gstPercent,gstNumber:settings.gstNumber,serviceChargePercent:settings.serviceChargePercent,serviceChargeFixedPaise:settings.serviceChargeFixedPaise,serviceChargeBase:serviceBase,otherTaxLabel:settings.otherTaxLabel,otherTaxPercent:settings.otherTaxPercent};
}

export async function calculateTaxes(env,baseAmountPaise){const s=await getSiteSettings(env);return calculateTaxBreakdown(baseAmountPaise,s?.taxes||{});}
export function taxSnapshotJson(breakdown){return JSON.stringify(breakdown&&typeof breakdown==='object'?breakdown:{});}
export function parseTaxSnapshot(value){if(value&&typeof value==='object')return value;return safeJsonParse(String(value||'{}'),{});}
export function aggregateTaxBreakdowns(rows=[]){
  const valid=(rows||[]).filter(Boolean);const out={enabled:valid.some(x=>x.enabled),basePaise:0,gstPaise:0,serviceChargePaise:0,otherTaxPaise:0,totalTaxPaise:0,totalPaise:0,gstPercent:0,gstNumber:'',serviceChargePercent:0,serviceChargeFixedPaise:0,serviceChargeBase:'mixed',otherTaxLabel:'Other Tax',otherTaxPercent:0};
  for(const x of valid){for(const k of ['basePaise','gstPaise','serviceChargePaise','otherTaxPaise','totalTaxPaise','totalPaise'])out[k]+=paise(x[k]);if(!out.gstPercent&&Number(x.gstPercent))out.gstPercent=Number(x.gstPercent);if(!out.gstNumber&&x.gstNumber)out.gstNumber=clean(x.gstNumber,80);if(!out.serviceChargePercent&&Number(x.serviceChargePercent))out.serviceChargePercent=Number(x.serviceChargePercent);if(!out.serviceChargeFixedPaise&&Number(x.serviceChargeFixedPaise))out.serviceChargeFixedPaise=paise(x.serviceChargeFixedPaise);if(x.otherTaxLabel)out.otherTaxLabel=clean(x.otherTaxLabel,60);if(!out.otherTaxPercent&&Number(x.otherTaxPercent))out.otherTaxPercent=Number(x.otherTaxPercent);}
  return out;
}
