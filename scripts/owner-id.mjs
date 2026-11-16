import {openSqliteDatabase} from '../server/sqlite.mjs';
const username=String(process.argv[2]||'').toLowerCase();if(!/^[a-z0-9][a-z0-9._@-]{2,63}$/.test(username))throw Error('Run npm run owner:lookup -- yourusername after creating your own account.');
const db=await openSqliteDatabase(process.env.SQLITE_PATH||'.data/workspace.sqlite');
try{const row=await db.prepare('SELECT user_id FROM dev_credentials WHERE username=?').bind(username).first();if(!row)throw Error('That account does not exist in this deployment.');console.log(row.user_id);}finally{db.close();}
