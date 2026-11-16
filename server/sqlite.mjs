import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

/** Development-only D1-compatible adapter, backed by an actual SQLite file. */
export async function openSqliteDatabase(filename=':memory:',{migrationsDirectory=new URL('../migrations/',import.meta.url)}={}){
 if(filename!==':memory:')await mkdir(dirname(resolve(filename)),{recursive:true});
 const sqlite=new DatabaseSync(filename);
 sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
 const files=(await readdir(migrationsDirectory)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
 for(const file of files){
  if(sqlite.prepare('SELECT version FROM schema_migrations WHERE version=?').get(file))continue;
  const sql=await readFile(new URL(file,migrationsDirectory),'utf8');
  sqlite.exec('BEGIN IMMEDIATE');
  try{sqlite.exec(sql);sqlite.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(file,new Date().toISOString());sqlite.exec('COMMIT');}
  catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}
 }
 function prepared(sql,params=[]){
  return {sql,params,bind(...values){return prepared(sql,values)},async first(column){const row=sqlite.prepare(sql).get(...params);return row?(column?row[column]:{...row}):null},async all(){return {success:true,results:sqlite.prepare(sql).all(...params).map(row=>({...row}))}},async run(){const result=sqlite.prepare(sql).run(...params);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}}};
 }
 return {prepare:sql=>prepared(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements){const r=sqlite.prepare(statement.sql).run(...statement.params);results.push({success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}});}sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close(),filename};
}
