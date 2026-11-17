import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createAtlasLoader} from '../src/domains/atlas/index.mjs';
import {atlasEligibility,atlasScoreComparison} from '../src/features/atlas.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../dist/'+file,import.meta.url),'utf8'));
const base=await read('career-atlas.json');
const opportunities=(await Promise.all(base.assets.opportunities.map(read))).flatMap(chunk=>chunk.opportunities);
const hydrate=row=>row.eligibilityRef?{...row,eligibility:base.eligibilityRules[row.eligibilityRef]}:row;

test('both imported collections retain typed observations, provenance and bounded public files',async()=>{
 assert.equal(base.counts.rawCcmtObservations,56065);assert.equal(base.counts.rawCoapObservations,30616);
 assert.equal(base.counts.seatMapRoundObservations,34433);assert.equal(base.counts.sameSourceDuplicateRounds,891);
 assert.equal(base.counts.companyNames,4536);assert.equal(base.degrees.length,530);assert.equal(base.paperOptions.length,30);
 assert.equal(opportunities.length,base.counts.opportunities);assert.equal(new Set(opportunities.map(row=>row.id)).size,opportunities.length);
 assert.ok(opportunities.some(row=>row.sourceDataset==='combined'));assert.ok(opportunities.some(row=>row.sourceDataset==='scoreline'));assert.ok(opportunities.some(row=>row.sourceDataset==='original-terminal'));
 const sources=new Set(base.sources.map(source=>source.id));for(const row of opportunities)assert(sources.has(row.sourceId),row.id);
 for(const file of ['career-atlas.json',...Object.values(base.assets).flat()])assert((await stat(new URL('../dist/'+file,import.meta.url))).size<24*1024*1024,file);
 assert.equal(base.manifest.excluded.viewerComments,136);
});

test('Seat Map exact EC degree rules and 2026 seats survive merging without the Total Seats aggregate',()=>{
 const current=opportunities.filter(row=>row.id.startsWith('seatmap:ccmt:')&&row.year===2026&&row.category==='GEN').map(hydrate);
 assert.equal(current.length,842);assert(!current.some(row=>/total seats/i.test(row.programme)));
 const matched=current.filter(row=>atlasEligibility(row,{degree:'178',paper:'EC'}).state==='exact');assert.equal(matched.length,273);
 assert.equal(matched.reduce((sum,row)=>sum+(row.seats||0),0),1743);
 const numeric=matched.filter(row=>Number.isFinite(row.closingScore));assert.equal(numeric.length,267);assert.equal(numeric.reduce((sum,row)=>sum+(row.seats||0),0),1705);
 assert.equal(opportunities.filter(row=>row.id.startsWith('seatmap:ccmt:')&&row.year===2026).reduce((sum,row)=>sum+(row.seats||0),0),13759);
});

test('2026 rules cannot establish 2025 eligibility and conflicting source observations remain distinct',()=>{
 const historic=opportunities.find(row=>row.id.startsWith('seatmap:ccmt:')&&row.year===2025&&row.category==='GEN');
 assert.equal(atlasEligibility(hydrate(historic),{degree:'178',paper:'EC'}).state,'unknown');
 assert.ok(base.counts.conflictingGroups>0);assert.ok(opportunities.filter(row=>row.conflict).length>=base.counts.conflictingGroups*2);
 const nonScore=opportunities.find(row=>row.metric==='rank');assert(nonScore);assert.equal(atlasScoreComparison(nonScore,{score:'750',category:nonScore.category,paper:'all'}).gap,null);
});

test('placements, company lines, GATE reports and reported BITS ranges remain separate source types',async()=>{
 const placements=(await read(base.assets.placements)).placements,companies=(await read(base.assets.companies)).companies,reports=(await read(base.assets.gateReports)).gateReports,bits=(await read(base.assets.bitsOffers)).bitsOffers;
 assert.equal(placements.length,11391);assert.equal(companies.length,19516);assert.equal(reports.length,178);assert.equal(bits.length,213);
 assert(placements.some(row=>row.level==='UG4'));assert(placements.some(row=>row.level==='PG2'));assert(companies.every(row=>row.documentId));
 const ec=reports.find(row=>row.paper==='EC'&&row.year===2026);assert(ec);assert(ec.appeared>0);assert.equal(typeof ec.qualifyingMarks,'object');assert(ec.distributions.length>0);assert(ec.rankBands.length>0);
 assert.equal(bits.filter(row=>row.isOverlappingAggregate===true).length,77);
});

test('lazy atlas loading preserves GitHub Pages paths, caches files and hydrates shared rule objects',async()=>{
 const requested=[],fixture={version:'v',sources:[],eligibilityRules:{p:{ruleYear:2026}},assets:{opportunities:['career-atlas-opportunities-0.json','career-atlas-opportunities-1.json'],placements:'career-atlas-placements.json'}};
 const load=createAtlasLoader({baseUrl:()=> 'https://example.github.io/gate/',fetch:async url=>{requested.push(url);const name=url.split('/').at(-1);return Response.json(name==='career-atlas.json'?fixture:name==='career-atlas-placements.json'?{version:'v',placements:[]}:{version:'v',opportunities:[{id:name,eligibilityRef:'p'}]});}});
 const result=await load('opportunities');assert.equal(result.opportunities.length,2);assert.equal(result.opportunities[0].eligibility,result.opportunities[1].eligibility);
 await load('opportunities');assert.equal(requested.length,3);assert(requested.every(url=>url.startsWith('https://example.github.io/gate/')));
 await load('placements');assert.equal(requested.length,4);
 const bad=createAtlasLoader({baseUrl:()=> 'https://example.test/',fetch:async url=>Response.json(url.endsWith('career-atlas.json')?fixture:{version:'old',opportunities:[]})});await assert.rejects(()=>bad('opportunities'),/different releases/);
});
