const workspaceLabels = {
 difficulty:'Paper difficulty',monitor:'Exam overview',subjects:'Subjects & topics',
 distributions:'Score distributions',inference:'Historical trends',questions:'Question library',
 audit:'Data quality',responses:'My response data',evidence:'How it works'
};
for(const module of modules) module[2]=workspaceLabels[module[0]];
$('#nav').innerHTML=modules.map(([id])=>'<a href="#'+id+'" data-nav="'+id+'">'+workspaceLabels[id]+'</a>').join('');
document.querySelector('.wordmark').innerHTML='<span class="brandmark">g.</span><div>GATE<span class="wordmark-sub">EXAM INTELLIGENCE</span></div>';
document.querySelector('.nav-caption').textContent='YOUR WORKSPACE';
const redesignRender=render;
render=function(){redesignRender(); if(view==='difficulty'){$('#title').textContent='Understand the paper.';$('#subtitle').textContent='See what was asked, how demanding it was, and which topics deserve a closer look.'}};
render();
