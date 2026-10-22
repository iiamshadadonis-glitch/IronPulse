/* Temporary SQLite-backed D1 adapter. Uses real migrations/import API, never a live account. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {sqlStatements} from './gym-contract-helpers.mjs';
import {ensureSchema} from '../functions/_lib/schema.js';
import {onRequestPost} from '../functions/api/admin/import-products.js';
export async function bulkFixture(){
 const sql=new DatabaseSync(':memory:');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())for(const statement of sqlStatements(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8')))try{sql.exec(statement+';');}catch(error){if(!/already exists|duplicate column/.test(error.message))throw error;}
 sql.exec('DELETE FROM product_images; DELETE FROM product_variants; DELETE FROM page_placements; DELETE FROM product_class_mappings; DELETE FROM products;');
 class Statement{
  constructor(text){this.text=text;this.args=[];}bind(...args){this.args=args;return this;}
  async first(column){const row=sql.prepare(this.text).get(...this.args)||null;return column&&row?row[column]:row;}
  async all(){return {results:sql.prepare(this.text).all(...this.args)};}
  async run(){const r=sql.prepare(this.text).run(...this.args);return {success:true,meta:{last_row_id:Number(r.lastInsertRowid),changes:Number(r.changes)}};}
 }
 const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:text=>new Statement(text),async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}}};
 await ensureSchema(env);sql.exec('DELETE FROM product_images; DELETE FROM product_variants; DELETE FROM page_placements; DELETE FROM product_class_mappings; DELETE FROM products;');
 return {sql,env,importPlans:request=>onRequestPost({request,env}),close:()=>sql.close()};
}
