import {readFileSync} from 'node:fs';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createLocalAuth} from '../server/local-auth.mjs';
import {createApi} from '../server/api.mjs';
import {predictRank,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../src/domains/pyq/catalogue.json',import.meta.url),'utf8'));
export async function backendFixture({filename=':memory:',now=Date.parse('2026-11-15T12:00:00Z'),schedulerActive=false,privacyThreshold=5}={}){
 const db=await openSqliteDatabase(filename),clock={now};
 const localAuth=createLocalAuth({db,secret:'integration-test-secret-only-not-a-production-secret-0123456789',ownerUsername:'owner'});
 const options={db,authMode:'development',localAuth,schedulerActive,privacyThreshold,questionIds:catalogue.questionIds,paperIds:catalogue.papers.map(p=>p.id),subjects:catalogue.subjects,topicsBySubject:catalogue.topicsBySubject,predictRank,careerDataVersion:CAREER_DATA_VERSION,now:()=>clock.now};
 const api=createApi(options);
 function client(){let cookie='',csrf='';return {
  get cookie(){return cookie},get csrf(){return csrf},
  async request(path,{method='GET',body,headers={},origin='http://127.0.0.1',csrfToken=csrf}={}){
   const inputHeaders={...(cookie?{cookie}:{}),...(['POST','PATCH','DELETE','PUT'].includes(method)?{'origin':origin,'content-type':'application/json','x-csrf-token':csrfToken}:{}),...headers};
   const response=await api(new Request('http://127.0.0.1'+path,{method,headers:inputHeaders,...(body!==undefined?{body:JSON.stringify(body)}:{})}));
   if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
   const json=await response.json();if(json.data?.csrfToken)csrf=json.data.csrfToken;
   return {status:response.status,json,data:json.data,response};
  },
  async register(username,displayName=username){const result=await this.request('/api/dev/register',{method:'POST',body:{username,password:'DisposableTestPassword123!',displayName}});if(result.status!==201)throw new Error(JSON.stringify(result.json));const session=await this.request('/api/session');return session.data;},
  async login(username){const result=await this.request('/api/dev/login',{method:'POST',body:{username,password:'DisposableTestPassword123!'}});if(result.status!==200)throw new Error(JSON.stringify(result.json));return (await this.request('/api/session')).data;}
 };}
 return {db,clock,api,client,options,catalogue,close:()=>db.close()};
}
