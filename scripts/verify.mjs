import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
const checks=[['scripts/build-frontend.mjs'],['node_modules/typescript/bin/tsc','--noEmit'],['--test',...readdirSync('tests').filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/'+name)],['tests/research-regression.cjs'],['tests/research-ui-regression.cjs']];
for(const args of checks){const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0){process.exit(result.status||1);}}
console.log('All build, contract, service, domain, and retained research checks completed successfully.');
