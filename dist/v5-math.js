/* Pure numerical routines. Annual observations are supplied explicitly by callers. */
window.V5Math = (() => {
  const total = values => values.reduce((a,b) => a+b,0);
  const average = values => values.length ? total(values)/values.length : null;
  function percentile(values,p) {
    if(!values.length)return null;
    const sorted=[...values].sort((a,b)=>a-b), position=(sorted.length-1)*p;
    const lower=Math.floor(position), upper=Math.ceil(position);
    return sorted[lower]+(sorted[upper]-sorted[lower])*(position-lower);
  }
  function describe(values) {
    const x=values.filter(Number.isFinite), n=x.length, m=average(x);
    const variance=n>1?total(x.map(v=>(v-m)**2))/(n-1):null;
    const m2=n?total(x.map(v=>(v-m)**2))/n:null;
    return {n,mean:m,median:percentile(x,.5),variance,sd:variance===null?null:Math.sqrt(variance),
      q1:percentile(x,.25),q3:percentile(x,.75),iqr:n?percentile(x,.75)-percentile(x,.25):null,
      min:n?Math.min(...x):null,max:n?Math.max(...x):null,cv:n>1&&m!==0?Math.sqrt(variance)/Math.abs(m):null,
      skewness:n>=3&&m2>0?total(x.map(v=>(v-m)**3))/n/m2**1.5:null,
      excessKurtosis:n>=4&&m2>0?total(x.map(v=>(v-m)**4))/n/m2**2-3:null};
  }
  function pearson(a,b) {
    if(a.length!==b.length||a.length<2)return null;
    const ma=average(a),mb=average(b),da=total(a.map(v=>(v-ma)**2)),db=total(b.map(v=>(v-mb)**2));
    return da&&db?total(a.map((v,i)=>(v-ma)*(b[i]-mb)))/Math.sqrt(da*db):null;
  }
  function ranks(x) {
    const sorted=x.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v),result=Array(x.length);
    for(let i=0;i<sorted.length;){let j=i+1;while(j<sorted.length&&sorted[j].v===sorted[i].v)j++;
      for(let k=i;k<j;k++)result[sorted[k].i]=(i+j-1)/2+1;i=j;}
    return result;
  }
  const spearman=(a,b)=>pearson(ranks(a),ranks(b));
  function slope(years,x) {
    if(years.length<2)return null;
    const pairs=[];
    for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++)pairs.push((x[j]-x[i])/(years[j]-years[i]));
    return percentile(pairs,.5);
  }
  function rolling(values,windowSize) {
    return values.map((_,i)=>i+1<windowSize?null:average(values.slice(i-windowSize+1,i+1)));
  }
  function bootstrap(values,iterations,seed) {
    if(values.length<2)return {samples:[],interval:null};
    let state=seed>>>0;
    const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296};
    const samples=Array.from({length:iterations},()=>average(values.map(()=>values[Math.floor(random()*values.length)])));
    return {samples,interval:[percentile(samples,.025),percentile(samples,.975)]};
  }
  function allocation(vectors,weights,multipliers) {
    if(!vectors.length)return [];
    const denominator=total(weights);
    const baseline=vectors[0].map((_,j)=>total(vectors.map((v,i)=>v[j]*weights[i]))/denominator);
    const adjusted=baseline.map((v,i)=>v*multipliers[i]),scale=total(adjusted);
    return scale?adjusted.map(v=>v/scale*100):adjusted.map(()=>0);
  }
  function backtest(vectors,method) {
    return vectors.slice(2).map((observed,index)=>{
      const train=vectors.slice(0,index+2),weights=train.map((_,i)=>method==='recent'?i+1:1);
      const estimate=allocation(train,weights,train[0].map(()=>1));
      return {index:index+2,mae:average(observed.map((v,j)=>Math.abs(v-estimate[j]))),estimate,observed};
    });
  }
  // Retrospective leave-one-year-out validation. Never train on the held-out paper.
  // Full-period means are returned only as a labelled, leaky reference.
  function leaveOneYearOut(vectors,years,method='recent') {
    if(!Array.isArray(vectors)||!Array.isArray(years)||vectors.length!==years.length)throw new TypeError('Years must match annual vectors.');
    const dimensions=vectors[0]?.length||0;
    if(!dimensions||vectors.some(v=>!Array.isArray(v)||v.length!==dimensions||v.some(x=>!Number.isFinite(x)||x<0))||
       years.some(y=>!Number.isFinite(y))||new Set(years).size!==years.length)throw new TypeError('Use consistent finite annual allocations and unique years.');
    if(!['recent','equal'].includes(method))throw new TypeError('Unsupported historical allocation model.');
    if(vectors.length<3)return {rows:[],fullMean:[],summary:null};
    const fullMean=vectors[0].map((_,j)=>average(vectors.map(v=>v[j])));
    const rows=vectors.map((observed,holdout)=>{
      const train=vectors.filter((_,i)=>i!==holdout);
      const trainYears=years.filter((_,i)=>i!==holdout);
      const baseline=train[0].map((_,j)=>average(train.map(v=>v[j])));
      const weights=train.map((_,i)=>method==='recent'?i+1:1);
      const estimate=allocation(train,weights,train[0].map(()=>1));
      const error=estimate.map((v,j)=>Math.abs(v-observed[j]));
      const baselineError=baseline.map((v,j)=>Math.abs(v-observed[j]));
      return {year:years[holdout],trainYears,observed:[...observed],estimate,baseline,
        modelMae:average(error),baselineMae:average(baselineError),
        fullMeanReferenceMae:average(observed.map((v,j)=>Math.abs(v-fullMean[j])))};
    });
    const modelMae=average(rows.map(row=>row.modelMae));
    const baselineMae=average(rows.map(row=>row.baselineMae));
    const fullMeanReferenceMae=average(rows.map(row=>row.fullMeanReferenceMae));
    const yearWins=rows.filter(row=>row.modelMae<row.baselineMae-1e-9).length;
    return {rows,fullMean,summary:{modelMae,baselineMae,fullMeanReferenceMae,
      relativeImprovement:baselineMae>0?1-modelMae/baselineMae:null,
      beatsBaseline:baselineMae>0&&modelMae<baselineMae-1e-9,
      yearWins,yearCount:rows.length,subjects:dimensions}};
  }
  // Planning projection; hard syllabus-pattern constraints are not learned from the corpus.
  function ec2027MeanForecast(vectors,subjects) {
    if(!Array.isArray(subjects)||!Array.isArray(vectors)||vectors.length<2||
       vectors.some(v=>!Array.isArray(v)||v.length!==subjects.length||
         v.some(x=>!Number.isFinite(x)||x<0)))throw new TypeError('Expected complete annual subject vectors.');
    const ga=subjects.indexOf('General Aptitude'),math=subjects.indexOf('Engineering Mathematics');
    if(ga<0||math<0||ga===math||new Set(subjects).size!==subjects.length)throw new TypeError('Subject taxonomy must include unique Mathematics and General Aptitude.');
    const base=allocation(vectors,vectors.map(()=>1),subjects.map(()=>1));
    const technical=subjects.map((_,i)=>i).filter(i=>i!==ga&&i!==math);
    const denominator=total(technical.map(i=>base[i]));
    if(denominator<=0)throw new TypeError('No technical marks to allocate.');
    const raw=technical.map(i=>base[i]*72/denominator);
    const rounded=raw.map(Math.floor);
    const remainder=72-total(rounded);
    const indices=technical.map((_,i)=>i).sort((a,b)=>(raw[b]-rounded[b])-(raw[a]-rounded[a])||a-b);
    for(let i=0;i<remainder;i++)rounded[indices[i]]++;
    const forecast=subjects.map((_,i)=>i===ga?15:i===math?13:rounded[technical.indexOf(i)]);
    return {subjects:[...subjects],historicalMean:base,forecast,technicalUnrounded:raw,yearsTrained:vectors.length,
      method:'equal historical mean, technical normalization to 72, largest-remainder rounding; official GA=15, Mathematics=13'};
  }
  return {total,average,percentile,describe,pearson,spearman,slope,rolling,bootstrap,allocation,backtest,leaveOneYearOut,ec2027MeanForecast};
})();
