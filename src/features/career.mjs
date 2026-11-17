import {createRankWorkspace} from './rank.mjs';
import {createAdmissionsFeature} from './admissions.mjs';
import {createPsuWorkspace} from './psu.mjs';
import {careerNavigation} from './career-navigation.mjs';

// Route composition only. Numerical engines, API contracts and ownership stay separate.
export function createCareerFeature(bridge){
 const rank=createRankWorkspace(bridge),admissions=createAdmissionsFeature(bridge),psu=createPsuWorkspace(bridge);
 const modules=[rank,admissions,psu];
 const delegate=(method,event)=>{for(const module of modules){const handled=module[method]?.(event);if(handled)return handled;}return false;};
 const render=(route,body)=>'<div class="career-shell">'+careerNavigation(bridge,route)+(['admissions','institutes','psu'].includes(route)?'<div class="career-evidence-note"><span>These original reference tools remain available. The combined atlas adds nationwide records from both imported websites.</span><a class="text-link" href="#'+(route==='psu'?'psu-evidence':'opportunities')+'">Open the combined '+(route==='psu'?'PSU evidence':'programme atlas')+' ↗</a></div>':'')+body+'</div>';
 return {
  renderers:{rank:()=>render('rank',rank.render()),admissions:()=>render('admissions',admissions.renderers.admissions()),institutes:()=>render('institutes',admissions.renderers.institutes()),psu:()=>render('psu',psu.render())},
  names:{rank:'Rank Intelligence',admissions:'Admissions Explorer',institutes:'Institute Intelligence',psu:'PSU Intelligence'},
  descriptions:{rank:'Simulate marks, compare scenarios and inspect historical reference models.',admissions:'Compare historical programme evidence using clearly labeled GATE scores or AIR.',institutes:'Compare institutes, programmes and exact historical source records.',psu:'Research historical recruitment references with explicit units and source limitations.'},
  handleInput:event=>delegate('handleInput',event),handleChange:event=>delegate('handleChange',event),
  handleClick:event=>delegate('handleClick',event),handleSubmit:event=>delegate('handleSubmit',event),
  handleKeyDown:event=>delegate('handleKeyDown',event),
  afterRender(route){if(route==='rank')rank.afterRender?.(route);else if(route==='admissions'||route==='institutes')admissions.afterRender?.(route);},
  resetUser(){for(const module of modules)module.resetUser?.();}
 };
}
