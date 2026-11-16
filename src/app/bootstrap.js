/* Public bootstrap has no backend configuration or secrets. */
window.TerminalBoot={ready:false};
(()=>{
 const showError=()=>{
  if(window.TerminalBoot.ready)return;
  document.body.className='ui-ready startup-failed';
  const root=document.getElementById('startupState');
  if(root)root.innerHTML=window.TerminalComponents.ErrorState({title:'Research workspace could not start',description:'A required application asset did not load. Reload the page to try again.',actionHtml:'<a class="button" href="./">Reload workspace</a>'});
 };
 window.addEventListener('error',event=>{if(!window.TerminalBoot.ready){window.TerminalBoot.failed=true;showError();}},true);
 document.addEventListener('DOMContentLoaded',()=>{if(!window.TerminalBoot.ready)showError();});
 const startup=document.getElementById('startupState');
 if(startup)startup.innerHTML=window.TerminalComponents.LoadingSkeleton({label:'Loading research workspace'});
})();
