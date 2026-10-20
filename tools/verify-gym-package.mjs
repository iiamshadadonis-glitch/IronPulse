import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{
 const lines=readFileSync(join(root,'FILES.sha256'),'utf8').trim().split('\n');
 for(const line of lines){
  const match=line.match(/^([0-9a-f]{64})  (.+)$/);if(!match)throw Error('Invalid package checksum record.');
  const target=resolve(root,match[2]);if(!target.startsWith(resolve(root)+sep))throw Error('Invalid package file path.');
  if(!existsSync(target))throw Error('Missing package file: '+match[2]);
  const actual=createHash('sha256').update(readFileSync(target)).digest('hex');
  if(actual!==match[1])throw Error('File was changed: '+match[2]);
 }
 console.log('Verified '+lines.length+' original package files. Local configuration edits will intentionally change their checksums.');
}catch(error){console.error(error.message);process.exitCode=1;}
