import {parse} from '@babel/parser';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);
const enumValues=new Set(['student','coach','admin','online_class','offline_class','demo','webinar','trial','active','pending','paid','failed','cancelled','refunded','subscription','one_time','razorpay','stripe','phonepe','email','whatsapp','sms']);
export function structure(source){
 const ast=parse(source,{sourceType:'unambiguous'});
 function clean(node,parent,key){
  if(Array.isArray(node))return node.map(value=>clean(value,parent,key));
  if(!node||typeof node!=='object')return node;
  if(node.type==='StringLiteral'){
   const propertyKey=parent?.type==='ObjectProperty'&&key==='key';
   const semanticValue=parent?.type==='ObjectProperty'&&key==='value'&&['@type','role','eventType','event_type','class_type','status','payment_status','payment_type','gateway','channel','method','type'].includes(parent.key?.name||parent.key?.value);
   return {type:node.type,...(propertyKey||semanticValue||enumValues.has(node.value)?{value:node.value==='DanceSchool'?'ExerciseGym':node.value}:{})};
  }
  if(node.type==='TemplateElement')return {type:node.type,tail:node.tail};
  if(node.type==='RegExpLiteral')return {type:node.type,flags:node.flags};
  const out={};for(const name of Object.keys(node).sort())if(!['loc','start','end','extra','comments','leadingComments','trailingComments','innerComments'].includes(name))out[name]=clean(node[name],node,name);
  return out;
 }
 return digest(JSON.stringify(clean(ast)));
}
export function javascriptDDL(source){
 const out=[],ast=parse(source,{sourceType:'unambiguous'});
 function walk(node){if(!node||typeof node!=='object')return;const text=node.type==='StringLiteral'?node.value:node.type==='TemplateElement'?node.value.raw:'';
  if(/^\s*(?:CREATE\s+(?:TABLE|INDEX|UNIQUE|TRIGGER)|ALTER\s+TABLE|PRAGMA\s+foreign_keys)\b/i.test(text))out.push(text);
  for(const[name,value]of Object.entries(node)){if(['loc','extra','comments','leadingComments','trailingComments','innerComments'].includes(name))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
 }walk(ast);return digest(JSON.stringify(out));
}
export function sqlStatements(source){
 source=source.replace(/^\s*--.*$/gm,'');const out=[];let start=0,quote='';
 for(let i=0;i<source.length;i++){const c=source[i];if(quote){if(c===quote){if(source[i+1]===quote)i++;else quote='';}}else if(c==='\''||c==='"')quote=c;else if(c===';'){out.push(source.slice(start,i).trim());start=i+1;}}
 out.push(source.slice(start).trim());return out.filter(Boolean);
}
export function collect(root){
 const css={},functionShapes={},functionDDL={},migrationDDL={},backendSource={},frontendSource={};
 for(const file of files(join(root,'public')).filter(x=>x.endsWith('.css')))css[relative(root,file)]=digest(readFileSync(file));
 for(const file of files(join(root,'functions')).filter(x=>x.endsWith('.js'))){const source=readFileSync(file,'utf8'),name=relative(root,file);functionShapes[name]=structure(source);functionDDL[name]=javascriptDDL(source);backendSource[name]=digest(source.replace(/\r\n/g,'\n'));}
 for(const file of files(join(root,'migrations')).filter(x=>x.endsWith('.sql'))){const ddl=sqlStatements(readFileSync(file,'utf8')).filter(text=>/^(?:CREATE|ALTER|PRAGMA|DROP)\b/i.test(text));migrationDDL[relative(root,file)]=digest(JSON.stringify(ddl));}
 for(const file of files(join(root,'public')).filter(x=>x.endsWith('.js')))frontendSource[relative(root,file)]=digest(readFileSync(file,'utf8').replace(/\r\n/g,'\n'));
 return {css,functionShapes,functionDDL,migrationDDL,backendSource,frontendSource,apiPaths:files(join(root,'functions/api')).map(file=>relative(root,file)).sort()};
}
