import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const audit=JSON.parse(read('verification/ironpulse-v1.05/public-fitness-tips-fixes.json'));
const source=read(audit.renderer.path);assert.equal(hash(source),audit.renderer.afterSha256);
const found={};
function visit(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&audit.protectedFunctions[node.id.name])found[node.id.name]=hash(source.slice(node.start,node.end));for(const[key,value]of Object.entries(node)){if(['loc','extra','comments'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}
visit(parse(source,{sourceType:'script'}));assert.deepEqual(found,audit.protectedFunctions,'Existing data fetching, sanitization, ads, comments, sharing, pagination and sidebar functions must remain byte-identical');
const css=read(audit.stylesheet.path);assert.equal(hash(css),audit.stylesheet.sha256);assert.doesNotMatch(css,/:root|--[a-z][\w-]*\s*:/i,'The additive stylesheet cannot redefine theme tokens');
for(const name of ['public/blog.html','public/blog-post.html']){const html=read(name);assert.match(html,/final-v15-4-seo-comments-blog\.js\?gym=1\.05/);assert.match(html,/gym-fitness-tips-v1-05\.css\?v=1\.05/);}
console.log('Public Fitness Tips source audit: one renderer fix, one scoped stylesheet, preserved action functions, unchanged theme tokens and fresh page asset URLs.');
