import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{
 const release=JSON.parse(readFileSync(join(root,'public/release.json'),'utf8'));
 const manifest=JSON.parse(readFileSync(join(root,'verification','ironpulse-'+release.version.toLowerCase(),'v100-original-files.json'),'utf8'));
 if(manifest.fileCount!==1829||Object.keys(manifest.files).length!==1829||manifest.sourceZipSha256!=='51b840852d0d3c3e2b5fa30c719754c834b948f669ac7603635fe5e55a3b927d')throw Error('The original-source index does not match the supplied complete V1.00 project.');
 const archive=resolve(root,'archive/V1.00');
 for(const [name,expected]of Object.entries(manifest.files)){
  const path=resolve(archive,name);
  if(!path.startsWith(archive+sep)||!existsSync(path))throw Error('Missing preserved original file: '+name+'. Copy the complete V1.03 project, including archive/.');
  const actual=createHash('sha256').update(readFileSync(path)).digest('hex');
  if(actual!==expected)throw Error('Preserved original file was changed: '+name);
 }
 if(!Array.isArray(manifest.activeApplicationFiles)||manifest.activeApplicationFiles.length!==815)throw Error('The active application file inventory is incomplete.');
 for(const name of manifest.activeApplicationFiles){
  const path=resolve(root,name);
  if(!path.startsWith(resolve(root)+sep)||!existsSync(path))throw Error('Missing active application file: '+name+'. Copy every project folder.');
 }
 const count=dir=>readdirSync(dir,{withFileTypes:true}).reduce((n,item)=>n+(item.isDirectory()?count(join(dir,item.name)):item.isFile()?1:0),0);
 console.log('Original V1.00 archive: all 1829 files verified byte-for-byte.');
 console.log('Active application: '+count(join(root,'public'))+' frontend files, '+count(join(root,'functions'))+' backend files, '+count(join(root,'migrations'))+' migrations.');
 console.log('All '+manifest.activeApplicationFiles.length+' expected application files are present. The archived source is outside the live public/functions folders.');
}catch(error){console.error(error.message);process.exitCode=1;}
