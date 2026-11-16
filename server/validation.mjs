export class ApiError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export const fail=(status,code,message)=>{throw new ApiError(status,code,message)};
export const record=value=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>['__proto__','constructor','prototype'].includes(k)))fail(400,'invalid_input','Expected a JSON object.');return value};
export const text=(value,label,{min=1,max=200,optional=false}={})=>{if(optional&&(value===undefined||value===null))return '';if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,'invalid_input',label+' is invalid.');return value.trim();};
export const number=(value,label,{min=0,max=1e9,integer=false}={})=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(400,'invalid_input',label+' is invalid.');return value;};
export const boolean=(value,label)=>{if(typeof value!=='boolean')fail(400,'invalid_input',label+' must be true or false.');return value;};
export const choice=(value,choices,label)=>{if(!choices.includes(value))fail(400,'invalid_input',label+' is unavailable.');return value;};
export function calendarDate(value,label='Date'){
 const date=text(value,label,{max:10});const parsed=Date.parse(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==date)fail(400,'invalid_input',label+' must be a valid calendar date.');return date;
}
export function instant(value,label='Date/time'){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))fail(400,'invalid_input',label+' must include a timezone offset.');
 calendarDate(value.slice(0,10),label);const time=Date.parse(value);if(!Number.isFinite(time)||time<Date.UTC(2000,0,1)||time>Date.UTC(2200,0,1))fail(400,'invalid_input',label+' is invalid.');return new Date(time).toISOString();
}
export function timezone(value){const zone=text(value,'Timezone',{max:80});try{new Intl.DateTimeFormat('en',{timeZone:zone}).format(0);}catch{fail(400,'invalid_input','Timezone is unavailable.');}return zone;}
export const parseJson=(value,fallback=null)=>{try{return JSON.parse(value)}catch{return fallback}};
export const id=()=>crypto.randomUUID();
export const first=(db,sql,...params)=>db.prepare(sql).bind(...params).first();
export const all=async(db,sql,...params)=>(await db.prepare(sql).bind(...params).all()).results;
export const run=(db,sql,...params)=>db.prepare(sql).bind(...params).run();
export function page(url,{defaultLimit=50,maxLimit=100}={}){const parse=(raw,fallback)=>raw===null?fallback:/^\d+$/.test(raw)?Number(raw):NaN;return {limit:number(parse(url.searchParams.get('limit'),defaultLimit),'Page size',{min:1,max:maxLimit,integer:true}),offset:number(parse(url.searchParams.get('offset'),0),'Page offset',{min:0,max:100000,integer:true})};}
export function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(item=>item.trim().split(/=(.*)/s)).filter(pair=>pair.length>=2));}
export function sameOrigin(request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin||['cross-site'].includes(request.headers.get('sec-fetch-site')))fail(403,'csrf_failed','This action requires a same-origin request.');}
export async function bodyJson(request,maxBytes=65536){if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail(415,'invalid_content_type','Send application/json.');const length=Number(request.headers.get('content-length'));if(length>maxBytes)fail(413,'too_large','Request is too large.');const value=await request.text();if(new TextEncoder().encode(value).byteLength>maxBytes)fail(413,'too_large','Request is too large.');try{return record(JSON.parse(value))}catch(error){if(error instanceof ApiError)throw error;fail(400,'invalid_json','The request is not valid JSON.');}}
