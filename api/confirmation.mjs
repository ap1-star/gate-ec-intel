import {proxyHostingRequest} from '../server/hosting-proxy.mjs';
export default {fetch(request){
 const url=new URL(request.url),kind=url.searchParams.get('kind');
 if(!['verify-email','unsubscribe'].includes(kind))return new Response('Not found',{status:404});
 url.pathname='/recruitment/'+kind;url.searchParams.delete('kind');
 return proxyHostingRequest(new Request(url,request),process.env);
}};
