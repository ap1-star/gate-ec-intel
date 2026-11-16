/* Browser-local saved-view validation. No DOM, engine state, network or implicit storage access. */
window.TerminalPreferences=(()=>{
  const rootKeys=['route','scope','query','verdict','questionDisplay','questionContext','difficulty','research','issueFilter'];
  const scopeKeys=['from','to','subject','quality'];
  const forbidden=new Set(['__proto__','constructor','prototype']);
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const failure=(code,message,path)=>({ok:false,error:{code,message,...(path?{path}:{})}});
  const issue=(message,path)=>{throw {preferenceValidation:true,message,path};};
  function isRecord(value){
    if(value===null||typeof value!=='object'||Array.isArray(value))return false;
    const prototype=Object.getPrototypeOf(value);
    if(prototype===null)return true;
    const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor');
    return Object.getPrototypeOf(prototype)===null&&constructor&&'value'in constructor&&typeof constructor.value==='function'&&constructor.value.name==='Object';
  }
  function jsonValue(value,path='',seen=new Set(),depth=0){
    if(depth>64)issue('Saved view nesting is too deep.',path);
    if(value===null||typeof value==='string'||typeof value==='boolean')return;
    if(typeof value==='number'){if(!Number.isFinite(value))issue('Expected a finite number.',path);return;}
    if(typeof value!=='object')issue('Expected a JSON value.',path);
    if(seen.has(value))issue('Saved view contains a cycle.',path);
    if(!Array.isArray(value)&&!isRecord(value))issue('Expected a plain state record.',path);
    seen.add(value);
    for(const key of Reflect.ownKeys(value)){
      if(typeof key!=='string'||forbidden.has(key))issue('Unsupported state key.',path);
      if(Array.isArray(value)&&key==='length')continue;
      if(Array.isArray(value)&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length))issue('Unsupported array property.',path+'.'+key);
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||!('value'in descriptor))issue('State accessors are not supported.',path?path+'.'+key:key);
      jsonValue(descriptor.value,path?path+'.'+key:key,seen,depth+1);
    }
    if(Array.isArray(value))for(let i=0;i<value.length;i++)if(!own(value,String(i)))issue('Sparse state arrays are not supported.',path);
    seen.delete(value);
  }
  function match(value,template,path){
    if(template===null){if(value!==null&&typeof value!=='string')issue('Expected text or null.',path);return;}
    if(Array.isArray(template)){
      if(!Array.isArray(value))issue('Expected a state array.',path);
      if(!template.length){if(value.length)issue('Expected an empty state array.',path);return;}
      for(let i=0;i<value.length;i++)match(value[i],template[0],path+'.'+i);
      return;
    }
    if(isRecord(template)){
      if(!isRecord(value))issue('Expected a state record.',path);
      const expected=Object.keys(template),actual=Object.keys(value);
      for(const key of actual)if(!own(template,key))issue('Unknown state key.',path+'.'+key);
      for(const key of expected){if(!own(value,key))issue('Required state field is missing.',path+'.'+key);match(value[key],template[key],path+'.'+key);}
      return;
    }
    if(typeof value!==typeof template)issue('State value has the wrong primitive type.',path);
    if(typeof value==='number'&&!Number.isFinite(value))issue('Expected a finite number.',path);
  }
  function constraints(snapshot,templates){
    const difficulty=snapshot.difficulty,research=snapshot.research;
    if(own(difficulty,'easy')||own(difficulty,'tough')){
      if(typeof difficulty.easy!=='number'||typeof difficulty.tough!=='number'||difficulty.easy<0||difficulty.tough>100||difficulty.easy>=difficulty.tough)issue('Difficulty bounds must satisfy 0 ≤ easy < tough ≤ 100.','difficulty');
    }
    if(own(research,'seed')&&!Number.isInteger(research.seed))issue('The resampling seed must be an integer.','research.seed');
    if(own(research,'iterations')&&(!Number.isInteger(research.iterations)||research.iterations<200||research.iterations>10000))issue('Use 200–10,000 integer resamples.','research.iterations');
    if(own(research,'multipliers')){
      if(!Array.isArray(research.multipliers)||research.multipliers.length!==templates.research.multipliers.length||research.multipliers.some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0||value>5)||!research.multipliers.some(value=>value>0))issue('Multipliers must match the subject count, stay within 0–5, and include a positive value.','research.multipliers');
    }
  }
  /**
   * create({storage, allowedRoutes, scopeOptions:{from,to,subject,quality},
   *   templates:{questionContext,difficulty,research}, key?})
   * `storage` may be a Storage-like object or a function returning one; a function
   * lets a denied window.localStorage getter become a discriminated error.
   * Templates are copied once. A null template field represents nullable text;
   * nonempty arrays specify their item shape using the first template item.
   */
  function create(options={}){
    let configError=null,allowedRoutes,scopeOptions,templates,key;
    try{
      key=options.key===undefined?'gate-v5-saved-view':options.key;
      if(typeof key!=='string'||!key)issue('A storage key is required.','key');
      if(!Array.isArray(options.allowedRoutes)||!options.allowedRoutes.length||options.allowedRoutes.some(value=>typeof value!=='string'||!value))issue('Provide implemented route IDs.','allowedRoutes');
      allowedRoutes=new Set(options.allowedRoutes);
      if(!isRecord(options.scopeOptions))issue('Provide valid scope options.','scopeOptions');
      scopeOptions=scopeKeys.map(name=>{
        const values=options.scopeOptions[name];
        if(!Array.isArray(values)||!values.length||values.some(value=>!['string','number'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value)))issue('Provide valid options for '+name+'.','scopeOptions.'+name);
        if((name==='from'||name==='to')&&values.some(value=>!Number.isFinite(Number(value))))issue('Year scope options must be numeric.','scopeOptions.'+name);
        return new Set(values.map(String));
      });
      if(!isRecord(options.templates)||Object.keys(options.templates).some(name=>!['questionContext','difficulty','research'].includes(name)))issue('Provide the three state templates.','templates');
      for(const name of ['questionContext','difficulty','research'])if(!isRecord(options.templates[name]))issue('Provide a state record template.','templates.'+name);
      jsonValue(options.templates,'templates');
      templates=JSON.parse(JSON.stringify(options.templates));
    }catch(error){configError=failure('invalid-configuration',error?.preferenceValidation?error.message:'Saved-view validation is not configured.',error?.path);}
    function validate(snapshot){
      if(configError)return configError;
      try{
        jsonValue(snapshot);
        if(!isRecord(snapshot))issue('Expected a saved-view record.','view');
        for(const field of Object.keys(snapshot))if(!rootKeys.includes(field))issue('Unknown saved-view field.',field);
        for(const field of rootKeys)if(!own(snapshot,field))issue('Required saved-view field is missing.',field);
        for(const field of ['route','query','verdict','questionDisplay','issueFilter'])if(typeof snapshot[field]!=='string')issue('Expected a text value.',field);
        if(!allowedRoutes.has(snapshot.route))issue('This saved route is unavailable.','route');
        if(!Array.isArray(snapshot.scope)||snapshot.scope.length!==4)issue('Expected four scope values.','scope');
        for(let i=0;i<4;i++)if(typeof snapshot.scope[i]!=='string'||!scopeOptions[i].has(snapshot.scope[i]))issue('This scope option is unavailable.','scope.'+scopeKeys[i]);
        if(Number(snapshot.scope[0])>Number(snapshot.scope[1]))issue('The first year must not exceed the last year.','scope');
        for(const field of ['questionContext','difficulty','research'])match(snapshot[field],templates[field],field);
        constraints(snapshot,templates);
        return {ok:true,value:JSON.parse(JSON.stringify(snapshot))};
      }catch(error){return failure('invalid-view',error?.preferenceValidation?error.message:'The saved view could not be validated.',error?.path);}
    }
    function storage(){
      try{
        const value=typeof options.storage==='function'?options.storage():options.storage;
        if(!value||typeof value.getItem!=='function'||typeof value.setItem!=='function')return failure('unavailable','Local saved views are unavailable in this browser.');
        return {ok:true,value};
      }catch{return failure('unavailable','Browser storage access is blocked.');}
    }
    function save(snapshot){
      const valid=validate(snapshot);if(!valid.ok)return valid;
      const target=storage();if(!target.ok)return target;
      try{target.value.setItem(key,JSON.stringify(valid.value));return valid;}
      catch{return failure('write-failed','The view could not be saved. Browser storage may be blocked or full.');}
    }
    function load(){
      if(configError)return configError;
      const target=storage();if(!target.ok)return target;
      let saved;
      try{saved=target.value.getItem(key);}catch{return failure('read-failed','The saved view could not be read. Browser storage may be blocked.');}
      if(saved===null||saved===undefined)return failure('not-found','No saved view exists on this device.');
      if(typeof saved!=='string')return failure('read-failed','Browser storage returned an unsupported saved value.');
      let snapshot;
      try{snapshot=JSON.parse(saved);}catch{return failure('invalid-json','The saved view is damaged and could not be read.');}
      return validate(snapshot);
    }
    return Object.freeze({validate,save,load});
  }
  return Object.freeze({create});
})();
