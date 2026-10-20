import assert from 'node:assert/strict';

await import('../public/admin/final-v16-89-analytics-core.js');
const Core=globalThis.UCV1689AnalyticsCore;
assert.ok(Core,'analytics core should register');

const daily=Core.buildBuckets('2026-08-18','2026-08-21','daily');
assert.deepEqual(daily.map(x=>x.key),['2026-08-18','2026-08-19','2026-08-20','2026-08-21']);

const weekly=Core.buildBuckets('2026-08-23','2026-09-05','weekly');
assert.equal(weekly.length,2);
assert.equal(weekly[0].start,'2026-08-23');
assert.equal(weekly[0].end,'2026-08-29');
assert.equal(weekly[1].start,'2026-08-30');
assert.equal(weekly[1].end,'2026-09-05');

const monthly=Core.buildBuckets('2026-01-01','2026-09-06','monthly');
assert.equal(monthly.length,9);
assert.equal(monthly[0].key,'2026-01');
assert.equal(monthly.at(-1).key,'2026-09');

const yearly=Core.buildBuckets('2019-01-01','2026-09-06','yearly');
assert.deepEqual(yearly.map(x=>x.key),['2019','2020','2021','2022','2023','2024','2025','2026']);

const rows=[
  {day:'2026-08-19',key:'cancelled',label:'Cancelled',count:12,amount:480000},
  {day:'2026-09-05',key:'cancelled',label:'Cancelled',count:2,amount:90000},
  {day:'2026-09-05',key:'failed',label:'Failed',count:3,amount:150000}
];
const byDay=Core.aggregate(rows,{start:'2026-08-18',end:'2026-09-05',period:'daily',mode:'business'});
const cancelled=byDay.series.find(x=>x.key==='cancelled');
assert.equal(byDay.buckets.length,19);
assert.equal(cancelled.values[0],0,'the first missing day must be an explicit zero');
assert.equal(cancelled.values[1],12);
assert.equal(cancelled.values.at(-1),2);
assert.equal(cancelled.amounts.at(-1),90000);

const byMonth=Core.aggregate(rows,{start:'2026-01-01',end:'2026-09-06',period:'monthly',mode:'business'});
const monthlyCancelled=byMonth.series.find(x=>x.key==='cancelled');
assert.deepEqual(monthlyCancelled.values.slice(0,7),[0,0,0,0,0,0,0]);
assert.equal(monthlyCancelled.values[7],12);
assert.equal(monthlyCancelled.values[8],2);

const byYear=Core.aggregate(rows,{start:'2019-01-01',end:'2026-09-06',period:'yearly',mode:'business'});
assert.deepEqual(byYear.series.find(x=>x.key==='cancelled').values,[0,0,0,0,0,0,0,14]);

console.log('V16.89 period aggregation checks passed.');
