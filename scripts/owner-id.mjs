import {openSqliteDatabase} from '../server/sqlite.mjs';
const username=String(process.argv[2]||'').trim().toLowerCase();if(username.length<3||username.length>254||/[\s\u0000-\u001f]/.test(username))throw Error('Run npm run owner:lookup -- your-email@example.com after creating your own account.');
const db=await openSqliteDatabase(process.env.SQLITE_PATH||'.data/workspace.sqlite');
try{const row=await db.prepare('SELECT user_id FROM dev_credentials WHERE username=?').bind(username).first();if(!row)throw Error('That account does not exist in this deployment.');console.log(row.user_id);}finally{db.close();}
