// RFC 8291 aes128gcm and RFC 8292 VAPID, using Web Crypto in Node and Workers.
const utf8=new TextEncoder();
export function base64url(bytes){let value='';for(const byte of new Uint8Array(bytes))value+=String.fromCharCode(byte);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decode64(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+={0,2}$/.test(value))throw Error('Invalid base64url key.');const clean=value.replace(/=+$/,''),raw=atob(clean.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-clean.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function joinBytes(...arrays){const result=new Uint8Array(arrays.reduce((sum,a)=>sum+a.byteLength,0));let offset=0;for(const array of arrays){result.set(new Uint8Array(array),offset);offset+=array.byteLength;}return result;}
export function pushEndpointAllowed(value){
 try{const url=new URL(value),host=url.hostname;return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&!url.hash&&url.href.length<=2048&&(host==='fcm.googleapis.com'||['push.services.mozilla.com','web.push.apple.com','notify.windows.com'].some(domain=>host===domain||host.endsWith('.'+domain)));}catch{return false;}
}
export async function validatePushSubscription(value){
 if(!value||typeof value!=='object'||!pushEndpointAllowed(value.endpoint))throw Error('Choose a supported secure browser push endpoint.');
 const publicKey=decode64(value.keys?.p256dh),auth=decode64(value.keys?.auth);
 if(publicKey.length!==65||publicKey[0]!==4||auth.length!==16)throw Error('Invalid browser push subscription keys.');
 await crypto.subtle.importKey('raw',publicKey,{name:'ECDH',namedCurve:'P-256'},false,[]);
 return {endpoint:new URL(value.endpoint).href,keys:{p256dh:base64url(publicKey),auth:base64url(auth)}};
}
async function hkdf(secret,salt,info,length){const key=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));}
export async function derivePushKeys(shared,auth,uaPublic,serverPublic,salt){
 const ikm=await hkdf(shared,auth,joinBytes(utf8.encode('WebPush: info\0'),uaPublic,serverPublic),32);
 return {ikm,key:await hkdf(ikm,salt,utf8.encode('Content-Encoding: aes128gcm\0'),16),nonce:await hkdf(ikm,salt,utf8.encode('Content-Encoding: nonce\0'),12)};
}
export async function encryptPush(subscription,payload){
 const valid=await validatePushSubscription(subscription),bytes=utf8.encode(typeof payload==='string'?payload:JSON.stringify(payload));
 if(bytes.length>3000)throw Error('Push payload is too large.');
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']),serverPublic=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),uaPublic=decode64(valid.keys.p256dh);
 const receiver=await crypto.subtle.importKey('raw',uaPublic,{name:'ECDH',namedCurve:'P-256'},false,[]),shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiver},pair.privateKey,256)),salt=crypto.getRandomValues(new Uint8Array(16));
 const material=await derivePushKeys(shared,decode64(valid.keys.auth),uaPublic,serverPublic,salt),key=await crypto.subtle.importKey('raw',material.key,'AES-GCM',false,['encrypt']);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:material.nonce,tagLength:128},key,joinBytes(bytes,new Uint8Array([2]))));
 const recordSize=new Uint8Array(4);new DataView(recordSize.buffer).setUint32(0,4096,false);
 return joinBytes(salt,recordSize,new Uint8Array([65]),serverPublic,ciphertext);
}
export async function vapidAuthorization(endpoint,{publicKey,privateKey,subject,now=Date.now()}){
 if(!pushEndpointAllowed(endpoint))throw Error('Unsupported push endpoint.');
 const raw=decode64(publicKey);if(raw.length!==65||raw[0]!==4||decode64(privateKey).length!==32)throw Error('VAPID keys are not configured correctly.');
 const uri=new URL(subject);if(!['mailto:','https:'].includes(uri.protocol))throw Error('VAPID contact must be an HTTPS or mailto URI.');
 const header=base64url(utf8.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=base64url(utf8.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(now/1000)+12*3600,sub:subject}))),input=header+'.'+claims;
 const key=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:base64url(raw.slice(1,33)),y:base64url(raw.slice(33,65)),d:privateKey,ext:true},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,utf8.encode(input));return 'vapid t='+input+'.'+base64url(signature)+', k='+publicKey;
}
