import {ORGANIZATIONS,RECRUITING_BODIES,RECRUITMENT_CYCLES,TECHNICAL_PATHWAYS,RECRUITMENT_NOTICES} from '../src/domains/recruitment/index.mjs';
const json=(data,status=200)=>Response.json({status:'ok',data},{status,headers:{'cache-control':'no-store'}});
const caps={database:false,platformAuth:false,credentialAuth:false,devAuth:false,scheduler:false};
const unavailable=()=>Response.json({status:'unavailable',code:'backend_not_configured',message:'Connect the persistent backend using BACKEND_ORIGIN to use private accounts and alerts.'},{status:503,headers:{'cache-control':'no-store'}});
export function publicHostingSnapshot(){
 return {organizations:ORGANIZATIONS,recruitingBodies:RECRUITING_BODIES,cycles:RECRUITMENT_CYCLES,examinations:TECHNICAL_PATHWAYS,pathways:TECHNICAL_PATHWAYS,notices:RECRUITMENT_NOTICES,discovery:{pendingReviewCount:0},sourceHealth:[],transport:'bundled_directory',capabilities:{database:false,authenticated:false,scheduler:{configured:false},channels:Object.fromEntries(['in_app','email','push','whatsapp','sms'].map(channel=>[channel,{configured:false,recipientVerified:false,consented:false,reason:'backend_not_configured'}]))}};
}
export function staticHostingResponse(request){
 const url=new URL(request.url),path=url.pathname;
 if(request.method!=='GET')return unavailable();
 if(path==='/api/recruitment/catalog')return json(publicHostingSnapshot());
 if(path==='/api/recruitment/notices')return json({items:RECRUITMENT_NOTICES,total:RECRUITMENT_NOTICES.length});
 if(path.startsWith('/api/recruitment/notices/')){const row=RECRUITMENT_NOTICES.find(n=>n.id===decodeURIComponent(path.split('/').at(-1)));return row?json(row):Response.json({status:'error',code:'not_found',message:'Notice not found.'},{status:404});}
 if(path==='/api/session')return json({status:'unavailable',user:null,csrfToken:null,authMode:'unavailable',capabilities:caps});
 if(path==='/api/capabilities')return json({...caps,authMode:'unavailable'});
 if(path==='/api/recruitment/push/config')return json({configured:false,publicKey:null});
 return unavailable();
}
const hopHeaders=['host','connection','content-length','content-encoding','transfer-encoding','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','upgrade'];
export async function proxyHostingRequest(request,env={},fetcher=globalThis.fetch){
 if(!env.BACKEND_ORIGIN)return staticHostingResponse(request);
 let backend;try{backend=new URL(env.BACKEND_ORIGIN);if(backend.protocol!=='https:'||backend.username||backend.password||backend.pathname!=='/'||backend.search||backend.hash)throw Error();}catch{return unavailable();}
 const input=new URL(request.url);if(!input.pathname.startsWith('/api/')&&!input.pathname.startsWith('/recruitment/'))return new Response('Not found',{status:404});
 const target=new URL(input.pathname+input.search,backend.origin),headers=new Headers(request.headers);
 for(const name of [...headers.keys()])if(hopHeaders.includes(name)||name.startsWith('oai-')||name.startsWith('x-forwarded-'))headers.delete(name);
 headers.delete('accept-encoding');
 let body;if(!['GET','HEAD'].includes(request.method)){if(Number(request.headers.get('content-length'))>100000)return new Response('Request too large',{status:413});body=await request.arrayBuffer();if(body.byteLength>100000)return new Response('Request too large',{status:413});}
 try{
  const response=await fetcher(target,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)}),output=new Headers(response.headers);
  for(const name of hopHeaders)output.delete(name);
  // fetch has already decoded a compressed upstream body. Do not mark the decoded stream as compressed again.
  output.set('cache-control','no-store');
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return unavailable();}
}
