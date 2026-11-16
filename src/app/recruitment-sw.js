// No caching, analytics or implicit permission request. Only explicitly subscribed career alerts.
self.addEventListener('push',event=>{
 let payload;try{payload=event.data?.json();}catch{return;}
 if(!payload||typeof payload.title!=='string')return;
 let target='/#recruitment-notifications';
 try{const url=new URL(payload.url,self.location.origin);if(url.origin===self.location.origin&&url.hash.startsWith('#recruitment'))target=url.href;}catch{}
 event.waitUntil(self.registration.showNotification(payload.title.slice(0,150),{body:String(payload.body||'').slice(0,600),tag:String(payload.tag||'recruitment').slice(0,180),data:{url:target}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 let url=new URL('/#recruitment-notifications',self.location.origin);
 try{const candidate=new URL(event.notification.data?.url,self.location.origin);if(candidate.origin===self.location.origin&&candidate.hash.startsWith('#recruitment'))url=candidate;}catch{}
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const client=clients.find(item=>new URL(item.url).origin===self.location.origin);
  if(client){await client.navigate(url.href);await client.focus();}else await self.clients.openWindow(url.href);
 }));
});
