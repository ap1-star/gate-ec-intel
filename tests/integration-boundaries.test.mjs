import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAccess, decideOwnedAccess, authenticateAndAuthorize } from '../src/integration/access.mjs';
import { findClientSecretVariables, validateIntegrationEnvironment } from '../src/integration/environment.mjs';

const now=Date.parse('2030-01-01T00:00:00Z');
const policy={issuer:'https://identity.example.invalid',audience:'gate-terminal',ownerSubject:'owner-subject'};
const member=()=>({status:'authenticated',principal:{userId:'candidate-a',providerSubject:'member-subject',issuer:policy.issuer,audience:policy.audience,roles:['member'],expiresAt:'2030-01-01T01:00:00Z'}});
const owner=()=>({status:'authenticated',principal:{...member().principal,providerSubject:'owner-subject',roles:['owner']}});
const servicesEnvironment=()=>({GATE_INTEGRATION_MODE:'services',GATE_PUBLIC_ORIGIN:'https://research.example.invalid',GATE_API_ORIGIN:'https://api.example.invalid',AUTH_ISSUER_URL:policy.issuer,AUTH_AUDIENCE:policy.audience,AUTH_SESSION_STRATEGY:'provider',AUTH_OWNER_SUBJECT:policy.ownerSubject,DATABASE_URL:'mysql://test-user:test-password@database.example.invalid/test_database',SCHEDULER_SIGNING_SECRET:'x'.repeat(32)});

test('public research remains usable without any identity configuration',()=>{
 assert.deepEqual(decideAccess('public',null),{allowed:true});
 assert.deepEqual(validateIntegrationEnvironment({}),{valid:true,mode:'static',capabilities:{identity:false,database:false,scheduler:false,ownerMetrics:false},issues:[]});
});
test('private access fails closed for absent/unavailable/anonymous identity',()=>{
 assert.equal(decideAccess('authenticated',null,policy,now).allowed,false);
 assert.equal(decideAccess('authenticated',{status:'unavailable',reason:'not configured'},policy,now).allowed,false);
 assert.equal(decideAccess('authenticated',{status:'anonymous'},policy,now).allowed,false);
});
test('authenticated access rejects missing policy and malformed principal',()=>{
 assert.equal(decideAccess('authenticated',member(),{},now).reason,'invalid_policy');
 assert.equal(decideAccess('authenticated',{status:'authenticated'},policy,now).reason,'session_untrusted');
 assert.equal(decideAccess('unexpected',member(),policy,now).reason,'invalid_requirement');
});
test('expiry and issuer/audience boundaries are checked',()=>{
 for(const edit of [{issuer:'https://other.example.invalid'},{audience:'another-app'},{expiresAt:'2029-12-31T23:59:59Z'},{expiresAt:'not-a-date'}]){
  const session=member();Object.assign(session.principal,edit);assert.equal(decideAccess('authenticated',session,policy,now).allowed,false);
 }
 assert.equal(decideAccess('authenticated',member(),policy,now).allowed,true);
});
test('owner access needs both exact configured subject and owner role',()=>{
 assert.equal(decideAccess('owner',member(),policy,now).allowed,false);
 const wrong=owner();wrong.principal.providerSubject='another-owner';assert.equal(decideAccess('owner',wrong,policy,now).allowed,false);
 const roleMissing=owner();roleMissing.principal.roles=['member'];assert.equal(decideAccess('owner',roleMissing,policy,now).allowed,false);
 assert.equal(decideAccess('owner',owner(),{...policy,ownerSubject:''},now).allowed,false);
 assert.equal(decideAccess('owner',owner(),policy,now).allowed,true);
});
test('user A cannot read user B records, including through owner role',()=>{
 assert.equal(decideOwnedAccess('candidate-a',member(),policy,now).allowed,true);
 assert.equal(decideOwnedAccess('candidate-b',member(),policy,now).reason,'ownership_mismatch');
 assert.equal(decideOwnedAccess('candidate-b',owner(),policy,now).reason,'ownership_mismatch');
});
test('missing or failing verifier cannot authorize protected endpoints',async()=>{
 assert.equal((await authenticateAndAuthorize('owner',null,policy,now)).allowed,false);
 assert.equal((await authenticateAndAuthorize('owner',async()=>{throw new Error('offline')},policy,now)).allowed,false);
 assert.equal((await authenticateAndAuthorize('authenticated',async()=>member(),policy,now)).allowed,true);
 let called=false;assert.equal((await authenticateAndAuthorize('public',async()=>{called=true;return member()},policy,now)).allowed,true);assert.equal(called,false);
});
test('private capabilities cannot be requested by a static deployment',()=>{
 const result=validateIntegrationEnvironment({}, {identity:true,database:true});
 assert.equal(result.valid,false);assert(result.issues.some(x=>x.code==='services_disabled'));
});
test('server settings reject client-prefixed secret exposure without echoing values',()=>{
 const input={VITE_DATABASE_URL:'do-not-print-me',NEXT_PUBLIC_JWT_SECRET:'also-do-not-print',PUBLIC_API_KEY:'private-key'};
 assert.equal(findClientSecretVariables(input).length,3);
 const result=validateIntegrationEnvironment(input);assert.equal(result.valid,false);
 assert(!JSON.stringify(result).includes('do-not-print'));assert(!JSON.stringify(result).includes('private-key'));
});
test('future service configuration validates only with explicit fields/capabilities',()=>{
 const result=validateIntegrationEnvironment(servicesEnvironment(),{identity:true,database:true,scheduler:true,ownerMetrics:true});
 assert.equal(result.valid,true);assert.equal('data' in result,false);assert.equal('connection' in result,false);
 const serialized=JSON.stringify(result);assert(!serialized.includes('test-password'));assert(!serialized.includes('x'.repeat(32)));
});
test('insecure, credential-bearing or path-bearing origins are rejected',()=>{
 for(const value of ['http://research.example.invalid','https://name:password@research.example.invalid','https://research.example.invalid/path','https://research.example.invalid/?query=1','javascript:alert(1)']){
  const input=servicesEnvironment();input.GATE_PUBLIC_ORIGIN=value;
  assert.equal(validateIntegrationEnvironment(input,{identity:true}).valid,false);
 }
});
test('localhost HTTP exception is explicit and disabled in production',()=>{
 const input=servicesEnvironment();input.GATE_PUBLIC_ORIGIN='http://localhost:3000';
 assert.equal(validateIntegrationEnvironment(input,{identity:true}).valid,false);
 assert.equal(validateIntegrationEnvironment(input,{identity:true,allowLocalhost:true}).valid,true);
 input.NODE_ENV='production';assert.equal(validateIntegrationEnvironment(input,{identity:true,allowLocalhost:true}).valid,false);
});
test('owner/scheduler capabilities need identity and database, and required secrets',()=>{
 assert.equal(validateIntegrationEnvironment(servicesEnvironment(),{ownerMetrics:true}).valid,false);
 assert.equal(validateIntegrationEnvironment(servicesEnvironment(),{scheduler:true}).valid,false);
 const input=servicesEnvironment();input.SCHEDULER_SIGNING_SECRET='short';
 assert.equal(validateIntegrationEnvironment(input,{identity:true,database:true,scheduler:true}).valid,false);
});
test('optional HMAC mode refuses empty/short destination session secret',()=>{
 const input=servicesEnvironment();input.AUTH_SESSION_STRATEGY='hmac';
 assert.equal(validateIntegrationEnvironment(input,{identity:true}).valid,false);
 input.SESSION_SECRET='short';assert.equal(validateIntegrationEnvironment(input,{identity:true}).valid,false);
 input.SESSION_SECRET='y'.repeat(32);assert.equal(validateIntegrationEnvironment(input,{identity:true}).valid,true);
});
test('unsupported database protocols and unknown integration modes fail validation',()=>{
 const input=servicesEnvironment();input.DATABASE_URL='file:///private/database';
 assert.equal(validateIntegrationEnvironment(input,{database:true}).valid,false);
 assert.equal(validateIntegrationEnvironment({GATE_INTEGRATION_MODE:'automatic'}).valid,false);
});
