import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Bundled client execution with a minimal host, not a browser/layout test.
function client(fetch,{staticMode=false,baseURI='https://example.test/'}={}){
 let renders=0;const routes=[];
 const bridge={C:{escape:String},icon:()=>'',render:()=>{renders++},toast:()=>{},register:feature=>routes.push(...Object.keys(feature.renderers)),installQuestionFilter:()=>{},decorateInspector:()=>{},currentRoute:()=> 'monitor'};
 const window={TerminalResearchBridge:bridge,addEventListener:()=>{},TERMINAL_STATIC_HOST:staticMode};
 const document={baseURI,addEventListener:()=>{},getElementById:()=>null,querySelectorAll:()=>[]};
 const context=vm.createContext({window,document,location:{hash:'#monitor'},fetch,Response,AbortSignal,URLSearchParams,URL,Intl,setTimeout,clearTimeout});
 vm.runInContext(readFileSync(new URL('../dist/features.js',import.meta.url),'utf8'),context);
 return {window,routes,renders:()=>renders};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
const response=data=>Response.json({status:'ok',data});

test('bundled host retains a newer authenticated session when startup anonymous response arrives late',{timeout:3000},async()=>{
 const startup=deferred(),forced=deferred();let requests=0;
 const app=client(()=>++requests===1?startup.promise:forced.promise);
 const refresh=app.window.TerminalFeatures.refreshSession(true);
 forced.resolve(response({status:'authenticated',user:{id:'current-user',displayName:'Candidate',isOwner:true,development:true},csrfToken:'test-csrf',capabilities:{owner:true}}));
 await refresh;assert.equal(app.window.TerminalFeatureSession.user.id,'current-user');
 startup.resolve(response({status:'anonymous',user:null,csrfToken:null,capabilities:{}}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.window.TerminalFeatureSession.status,'authenticated');assert.equal(app.window.TerminalFeatureSession.user.id,'current-user');
 assert.ok(app.routes.includes('questions'));assert.ok(app.routes.includes('rank'));assert.ok(app.routes.includes('planner'));assert.ok(app.renders()>=2);
});

test('bundled host treats a static HTML API fallback as unavailable while keeping public modules registered',async()=>{
 const app=client(async()=>new Response('<html>Static deployment</html>',{headers:{'content-type':'text/html'}}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.window.TerminalFeatureSession.status,'unavailable');assert.equal(app.window.TerminalFeatureSession.user,null);
 assert.ok(app.routes.includes('admissions'));assert.ok(app.routes.includes('questions'));assert.ok(app.renders()>=2);
});

test('Drop bundle loads public snapshots relative to a GitHub Pages subdirectory without requesting an account backend',async()=>{
 const requested=[];
 const app=client(async url=>{requested.push(url);return response({status:'unavailable',user:null,csrfToken:null,capabilities:{database:false,credentialAuth:false}});},{staticMode:true,baseURI:'https://example.github.io/gate-terminal/'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(requested,['https://example.github.io/gate-terminal/_hosting/session.json']);
 assert.equal(app.window.TerminalFeatureSession.status,'unavailable');
 assert.equal(app.window.TerminalFeatureSession.user,null);
 assert.ok(app.routes.includes('admissions'));assert.ok(app.routes.includes('recruitment'));assert.ok(app.routes.includes('questions'));
});
