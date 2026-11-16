/** One durable delivery tick; use a real external process scheduler to invoke this in development. */
import {resolve} from 'node:path';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {runDueReminders} from '../server/reminders.mjs';
const args=process.argv.slice(2),index=args.indexOf('--db');
if(index<0||!args[index+1])throw new Error('Pass --db with the explicit non-production SQLite path.');
const db=await openSqliteDatabase(resolve(args[index+1]));
try{console.log(JSON.stringify(await runDueReminders(db)))}finally{db.close()}
