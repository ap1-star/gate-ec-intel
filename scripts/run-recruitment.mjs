// Browser-independent runner for an explicitly configured Node/SQLite deployment.
// Production Sites uses the authenticated MCP writer or the Worker's scheduled handler.
import {resolve} from 'node:path';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createHostedWorker} from '../server/hosted-worker.mjs';
import {ORGANIZATIONS,TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_NOTICES,evaluateTechnicalEligibility} from '../src/domains/recruitment/index.mjs';
const args=process.argv.slice(2),index=args.indexOf('--db');
if(index<0||!args[index+1])throw Error('Supply --db with the explicit persistent SQLite deployment path.');
const db=await openSqliteDatabase(resolve(args[index+1]));
const worker=createHostedWorker({catalogue:{organizations:ORGANIZATIONS,examinations:TECHNICAL_PATHWAYS,sources:RECRUITMENT_SOURCES,notices:RECRUITMENT_NOTICES},evaluateTechnicalEligibility});
try{for(let phase=0;phase<4;phase++)console.log(JSON.stringify(await worker.tick({...process.env,DB:db})));}finally{db.close();}
