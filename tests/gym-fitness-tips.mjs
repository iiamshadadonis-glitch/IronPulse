import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
import {structure} from '../tools/gym-contract-helpers.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const digest=value=>createHash('sha256').update(value).digest('hex');
const audit=JSON.parse(read('verification/ironpulse-v1.04/frontend-fixes.json'));
for(const file of audit.files){
 const source=read(file.path);assert.equal(digest(source),file.afterSha256,file.path+': only reviewed UI changes are allowed');
 if(file.copyOnly)assert.equal(structure(source),file.beforeStructure,file.path+': helper/placeholder updates must not change control flow, selectors or protocol keys');
}
for(const [path,expected]of Object.entries(audit.preservedFunctions)){
 const source=read(path),found={};
 function visit(node){if(!node||typeof node!=='object')return;
  if(node.type==='FunctionDeclaration'&&expected[node.id.name])found[node.id.name]=digest(source.slice(node.start,node.end));
  if(node.type==='AssignmentExpression'&&['FunctionExpression','ArrowFunctionExpression'].includes(node.right.type)){const name=source.slice(node.left.start,node.left.end);if(expected[name])found[name]=digest(source.slice(node.right.start,node.right.end));}
  for(const [key,value]of Object.entries(node)){if(['loc','extra','comments'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
 }visit(parse(source,{sourceType:'script'}));
 assert.deepEqual(found,expected,path+': existing upload, save/edit/reset wrappers, router and Posts selection functions stay byte-identical');
}
const html=read('public/admin/index.html');
for(const file of audit.files){const name=file.path.replace(/^public/,'');const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.match(html,new RegExp(escaped+'\\?[^"\\s]*gym=1\\.04'),'Updated Admin scripts must bypass the previous browser cache: '+name);}
console.log('Audited '+audit.files.length+' frontend scripts: three presentation fixes, copy-only source examples, unchanged protected action functions and fresh Admin script URLs.');
