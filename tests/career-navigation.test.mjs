import test from 'node:test';
import assert from 'node:assert/strict';
import {careerNavigation} from '../src/features/career-navigation.mjs';
test('career task navigation carries labeled score context without sharing private or unrelated parameters',()=>{
 const params=new URLSearchParams({metric:'gate_score',score:'750',scoreBasis:'model_approximation',category:'OBC_NCL',year:'2026',token:'private',record:'local-selection'});
 const html=careerNavigation({C:{escape:value=>String(value).replaceAll('&','&amp;')},params:()=>params},'admissions');
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
 assert.equal(links.length,4);
 for(const link of links){const context=new URLSearchParams(link.split('?')[1]);assert.equal(context.get('score'),'750');assert.equal(context.get('scoreBasis'),'model_approximation');assert.equal(context.get('category'),'OBC_NCL');assert.equal(context.has('token'),false);assert.equal(context.has('record'),false);}
 assert.match(html,/aria-current="page"/);
});
