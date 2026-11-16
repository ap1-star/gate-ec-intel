import test from 'node:test';
import assert from 'node:assert/strict';
import {base64url,decode64,derivePushKeys,encryptPush,pushEndpointAllowed,validatePushSubscription,vapidAuthorization} from '../server/recruitment-push.mjs';

test('Web Push key derivation matches the published RFC 8291 Appendix A vector',async()=>{
 const ua=decode64('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'),server=decode64('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
 const material=await derivePushKeys(decode64('kyrL1jIIOHEzg3sM2ZWRHDRB62YACZhhSlknJ672kSs'),decode64('BTBZMqHH6r4Tts7J_aSIgg'),ua,server,decode64('DGv6ra1nlYgDCS1FRnbzlw'));
 assert.equal(base64url(material.ikm),'S4lYMb_L0FxCeq0WhDx813KgSYqU26kOyzWUdsXYyrg');assert.equal(base64url(material.key),'oIhVW04MRdy2XN9CiKLxTg');assert.equal(base64url(material.nonce),'4h_95klXJ5E_qnoN');
});

test('an encrypted one-record notification is decryptable by the intended browser key only',async()=>{
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']),ua=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),auth=crypto.getRandomValues(new Uint8Array(16));
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test-only',keys:{p256dh:base64url(ua),auth:base64url(auth)}},payload={title:'Verified notice',url:'https://example.gov.in/notice'};
 const body=await encryptPush(subscription,payload),salt=body.slice(0,16),server=body.slice(21,86);assert.equal(body[20],65);assert.equal(new DataView(body.buffer).getUint32(16,false),4096);
 const peer=await crypto.subtle.importKey('raw',server,{name:'ECDH',namedCurve:'P-256'},false,[]),shared=await crypto.subtle.deriveBits({name:'ECDH',public:peer},pair.privateKey,256),material=await derivePushKeys(shared,auth,ua,server,salt),key=await crypto.subtle.importKey('raw',material.key,'AES-GCM',false,['decrypt']);
 const decrypted=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:material.nonce},key,body.slice(86)));assert.equal(decrypted.at(-1),2);assert.deepEqual(JSON.parse(new TextDecoder().decode(decrypted.slice(0,-1))),payload);
 const tampered=body.slice(86);tampered[0]^=1;await assert.rejects(()=>crypto.subtle.decrypt({name:'AES-GCM',iv:material.nonce},key,tampered));
});

test('VAPID signatures use ES256, the exact push origin and a bounded expiry',async()=>{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',pair.privateKey),raw=await crypto.subtle.exportKey('raw',pair.publicKey),now=Date.parse('2026-11-15T12:00:00Z');
 const auth=await vapidAuthorization('https://fcm.googleapis.com/fcm/send/test',{publicKey:base64url(raw),privateKey:jwk.d,subject:'https://example.com',now}),jwt=auth.match(/^vapid t=([^,]+), k=/)[1],parts=jwt.split('.'),claims=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
 assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.exp,Math.floor(now/1000)+43200);assert(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pair.publicKey,decode64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])));
});

test('push subscriptions reject arbitrary/private destinations and malformed curve keys',async()=>{
 for(const url of ['http://fcm.googleapis.com/send','https://127.0.0.1/send','https://fcm.googleapis.com.attacker.invalid/send','https://user@fcm.googleapis.com/send','https://fcm.googleapis.com:8443/send'])assert.equal(pushEndpointAllowed(url),false);
 assert(pushEndpointAllowed('https://updates.push.services.mozilla.com/wpush/v2/test'));
 await assert.rejects(()=>validatePushSubscription({endpoint:'https://fcm.googleapis.com/send',keys:{p256dh:base64url(new Uint8Array(65)),auth:base64url(new Uint8Array(16))}}));
});
