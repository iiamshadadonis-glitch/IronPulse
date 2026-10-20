import { json, requireAdmin } from '../../_lib/utils.js';

function validDate(value){
  const v=String(value||'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

async function scalarDate(env, modifier){
  const row=await env.DB.prepare(`SELECT date('now','+330 minutes',?) d`).bind(modifier).first();
  return row?.d || '';
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  try{
    const url=new URL(request.url);
    const preset=String(url.searchParams.get('preset')||'30d').toLowerCase();
    let from=validDate(url.searchParams.get('from'));
    let to=validDate(url.searchParams.get('to'));

    if(preset!=='custom'){
      const daysMap={
        '3d':3,
        '7d':7,
        '14d':14,
        '21d':21,
        '30d':30,
        '60d':60,
        '90d':90
      };
      const days=daysMap[preset]||30;
      to=await scalarDate(env,'+0 day');
      from=await scalarDate(env,`-${Math.max(0,days-1)} day`);
    }else{
      if(!from||!to)return json({error:'Select both From Date and To Date.'},400);
      if(from>to)return json({error:'From Date cannot be after To Date.'},400);
      const span=await env.DB.prepare('SELECT CAST(julianday(?) - julianday(?) AS INTEGER) days').bind(to,from).first();
      if(Number(span?.days||0)>92)return json({error:'For this traffic comparison, select a date range of up to 3 months.'},400);
    }

    const rows=(await env.DB.prepare(`
      WITH filtered AS (
        SELECT
          COALESCE(NULLIF(TRIM(source),''),'Direct / unknown') source,
          visitor_id
        FROM visitor_events
        WHERE date(created_at,'+330 minutes') BETWEEN ? AND ?
      ), per_visitor AS (
        SELECT source,visitor_id,COUNT(*) event_count
        FROM filtered
        GROUP BY source,visitor_id
      )
      SELECT
        source,
        SUM(event_count) visits,
        COUNT(*) unique_visitors,
        SUM(CASE WHEN event_count>1 THEN 1 ELSE 0 END) repeat_visitors
      FROM per_visitor
      GROUP BY source
      ORDER BY unique_visitors DESC, visits DESC, source ASC
    `).bind(from,to).all()).results||[];

    const totals=(await env.DB.prepare(`
      SELECT
        COUNT(*) visits,
        COUNT(DISTINCT visitor_id) unique_visitors
      FROM visitor_events
      WHERE date(created_at,'+330 minutes') BETWEEN ? AND ?
    `).bind(from,to).first())||{visits:0,unique_visitors:0};

    return json({
      preset,
      from,
      to,
      rows:rows.map((r,i)=>({
        rank:i+1,
        source:r.source||'Direct / unknown',
        visits:Number(r.visits||0),
        unique_visitors:Number(r.unique_visitors||0),
        repeat_visitors:Number(r.repeat_visitors||0)
      })),
      totals:{visits:Number(totals.visits||0),unique_visitors:Number(totals.unique_visitors||0)}
    });
  }catch(e){return json({error:e.message||'Could not load traffic sources.'},500)}
}
