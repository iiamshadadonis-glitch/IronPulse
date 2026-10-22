import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import {digest} from '../tools/gym-contract-helpers.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),contracts=JSON.parse(read('verification/ironpulse-v1.08/v107-function-contracts.json')),input=JSON.parse(read('verification/ironpulse-v1.08/v107-input-files.json'));
let protectedFunctions=0;
for(const[path,old]of Object.entries(contracts.files)){
 assert.equal(old.sha256,input.files[path]);const source=read(path),tree=parse(source,{sourceType:'script'}),functions={};
 function walk(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration')functions[node.id.name]=digest(source.slice(node.start,node.end));for(const[key,value]of Object.entries(node)){if(['loc','extra','comments'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
 walk(tree);assert.deepEqual(Object.keys(functions),Object.keys(old.functions));for(const[name,expected]of Object.entries(old.functions))if(!contracts.allowedChanges[path].includes(name)){assert.equal(functions[name],expected,path+': '+name);protectedFunctions++;}
}
const source=read('public/admin/gym-admin-v1-13.js'),current=source.slice(source.indexOf('const SALES_PANELS='),source.indexOf('function ensureSalesPanel()'));
const owner=code=>new Function('window','$$',code+';return selectSalesPanel;');
const oldWindow={},oldSelect=owner(contracts.salesSource)(oldWindow,()=>[]);oldWindow.load_bulk=()=>oldSelect('bulk');assert.throws(()=>oldSelect('bulk'),/Maximum call stack/);
const window={},selected=owner(current)(window,()=>[]);let calls=0;window.load_bulk=()=>{calls++;selected('bulk');};selected('bulk');assert.equal(calls,1,'A Sales loader cannot synchronously re-enter the same pane');
window.load_bulk=()=>{calls++;throw Error('Synthetic loader failure');};assert.throws(()=>selected('bulk'),/Synthetic loader failure/);window.load_bulk=()=>calls++;selected('bulk');assert.equal(calls,3,'The re-entry guard releases after an error');
function ui(code){const context={window:{matchMedia:()=>({matches:false})},document:{readyState:'loading',addEventListener(){}},console};vm.runInNewContext(code,context);return context.window.DropBeatUI;}
function control(){const classes=new Set(['db-native-upload']),attributes={};const caption={textContent:'',setAttribute(){},removeAttribute(){}},title={textContent:''};const box={dataset:{},classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:(...names)=>names.forEach(n=>classes.delete(n)),toggle:(n,value)=>value?classes.add(n):classes.delete(n)},querySelector:s=>s===':scope>strong'?title:caption,addEventListener(){}};const input={name:'plans_csv',type:'file',accept:'.csv,text/csv',files:[],multiple:false,hidden:false,closest:()=>box,getAttribute:n=>attributes[n]||null,setAttribute:(n,v)=>attributes[n]=v,addEventListener(){},form:{addEventListener(){}}};return {input,box};}
const original=read('tests/fixtures/v107-ui-components.js');assert.equal(digest(original),input.files['public/assets/gym-ui-components-v1-49.js']);
const oldUi=ui(original),first=control(),oldOptions={get label(){oldUi.nativeUpload(first.input,oldOptions);return 'Upload CSV File';}};assert.throws(()=>oldUi.nativeUpload(first.input,oldOptions),/Maximum call stack/);
const next=ui(read('public/assets/gym-ui-components-v1-49.js')),second=control();let renders=0;const options={get label(){renders++;next.nativeUpload(second.input,options);return 'Upload CSV File';}};assert.equal(next.nativeUpload(second.input,options),second.box);assert.ok(renders<10);
assert.throws(()=>next.nativeUpload(second.input,{get label(){throw Error('Synthetic option failure');}}),/Synthetic option failure/);assert.equal(next.nativeUpload(second.input),second.box,'The render guard releases after a failure');
const circular={label:'Upload CSV File'};circular.self=circular;assert.equal(next.nativeUpload(second.input,circular),second.box,'Upload rendering never deep-clones metadata or File objects');
console.log('Bulk upload safeguards passed: supplied Sales/upload re-entry overflows reproduced, patched bounded callbacks and error recovery, circular metadata handled without recursion, and '+protectedFunctions+' unrelated frontend functions retained byte-for-byte.');
