/* Bounded multi-stage search. Runs only in a worker; current settings are never mutated. */
(function(root){
'use strict';
const copy=value=>JSON.parse(JSON.stringify(value));
function reference(gray,s){return Float32Array.from(gray,v=>(s.invert!==s.flipOutput)?255-v:v);}
// Clean outlines are judged against structural edges found on a coarse analysis grid
// (about 160 cells across). The reference is then the same at every render size, and
// texture or noise that only exists at full resolution does not count as structure.
const ANALYSIS_SIZE=160;
function analysisGrid(w,h){const c=Math.max(1,Math.max(w,h)/ANALYSIS_SIZE);return {c,aw:Math.max(1,Math.ceil(w/c)),ah:Math.max(1,Math.ceil(h/c))};}
function cellIndex(grid,w,h){const {c,aw,ah}=grid,cols=new Int32Array(w),index=new Int32Array(w*h);for(let x=0;x<w;x++)cols[x]=Math.min(aw-1,Math.floor(x/c));for(let y=0;y<h;y++){const row=Math.min(ah-1,Math.floor(y/c))*aw;for(let x=0;x<w;x++)index[y*w+x]=row+cols[x];}return index;}
function outlineTarget(gray,w,h){
 const E=root.BlackboardEngine,grid=analysisGrid(w,h),{aw,ah}=grid,cells=cellIndex(grid,w,h),sum=new Float64Array(aw*ah),count=new Float64Array(aw*ah);
 for(let i=0;i<w*h;i++){sum[cells[i]]+=gray[i];count[cells[i]]++;}
 const avg=Float64Array.from(sum,(v,i)=>v/count[i]),sorted=Float64Array.from(avg).sort();
 // Stretch contrast so fixed edge thresholds suit dim and bright images alike.
 const lo=sorted[Math.floor((sorted.length-1)*.02)],hi=sorted[Math.floor((sorted.length-1)*.98)],range=Math.max(1,hi-lo);
 const image=Uint8ClampedArray.from(avg,v=>(v-lo)/range*255);
 const edges=E.renderPreset(image,aw,ah,128,3,0,E.settings({preset:'canny',labVals:{canny:[30,80,15]}}));
 const near=new Uint8Array(aw*ah);
 for(let y=0;y<ah;y++)for(let x=0;x<aw;x++)if(edges[y*aw+x])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<aw&&ny>=0&&ny<ah)near[ny*aw+nx]=1;}
 return {...grid,w,h,cells,edges,near};
}
// Share of ink that belongs to strokes at least `minimum` pixels in size (8-connected).
function strokeShare(mask,w,h,minimum){
 const seen=new Uint8Array(w*h),stack=new Int32Array(w*h);let ink=0,kept=0;
 for(let start=0;start<w*h;start++){
  if(!mask[start]||seen[start])continue;
  let top=0,size=0;stack[top++]=start;seen[start]=1;
  while(top){const i=stack[--top],x=i%w;size++;
   for(let dy=-w;dy<=w;dy+=w)for(let dx=-1;dx<=1;dx++){const j=i+dy+dx;if((!dx&&!dy)||j<0||j>=w*h||(dx===-1&&x===0)||(dx===1&&x===w-1))continue;if(mask[j]&&!seen[j]){seen[j]=1;stack[top++]=j;}}}
  ink+=size;if(size>=minimum)kept+=size;
 }
 return ink?kept/ink:1;
}
function outlineScore(mask,target,w,h){
 if(target.w!==w||target.h!==h)throw Error('Outline reference does not match the image size.');
 const {c,aw,ah,cells,edges,near}=target,ink=new Float64Array(aw*ah);let total=0,edgeCount=0,found=0,onEdges=0,boundary=0;
 for(let i=0;i<w*h;i++)if(mask[i]){ink[cells[i]]++;total++;}
 for(let i=0;i<aw*ah;i++)if(near[i])onEdges+=ink[i];
 // An edge counts as drawn when its neighbourhood holds at least a line's worth of ink.
 for(let y=0;y<ah;y++)for(let x=0;x<aw;x++){if(!edges[y*aw+x])continue;edgeCount++;let local=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<aw&&ny>=0&&ny<ah)local+=ink[ny*aw+nx];}
  if(local>=c)found++;}
 if(!edgeCount)return total?0:1;
 if(!total)return 0;
 const precision=onEdges/total,recall=found/edgeCount,f1=precision+recall?2*precision*recall/(precision+recall):0;
 // Outlines are strokes, not filled areas. Mean stroke width is ink per half boundary pixel;
 // lines up to 0.8 analysis cells wide are fine, and hairlines under 0.4 cells read faintly.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(mask[i]&&(x===0||!mask[i-1]||x===w-1||!mask[i+1]||y===0||!mask[i-w]||y===h-1||!mask[i+w]))boundary++;}
 const width=total/Math.max(1,boundary/2),widthFit=Math.min(1,Math.max(3,.8*c)/width)*Math.sqrt(Math.min(1,width/Math.max(2,.4*c)));
 return f1*widthFit*strokeShare(mask,w,h,Math.max(4,Math.round(3*c)));
}
function effort(mask,w,h){
 let drawPixels=0,activeBoards=0;
 for(let by=0;by<h;by+=16)for(let bx=0;bx<w;bx+=16){let count=0;for(let y=by;y<Math.min(h,by+16);y++)for(let x=bx;x<Math.min(w,bx+16);x++)count+=mask[y*w+x];drawPixels+=count;if(count)activeBoards++;}
 return {drawPixels,activeBoards,boardCount:Math.ceil(w/16)*Math.ceil(h/16)};
}
function metric(mask,gray,w,h,goal='balanced',outline){
 if(goal==='outline')return outlineScore(mask,outline||outlineTarget(gray,w,h),w,h);

 let tone=0,edge=0,edges=0,isolated=0,filled=0;
 for(const block of [4,8]){
  const cols=Math.ceil(w/block),rows=Math.ceil(h/block),a=new Float32Array(cols*rows),b=new Float32Array(cols*rows);
  let error=0;
  for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
   let ink=0,dark=0,n=0;
   for(let y=cy*block;y<Math.min(h,(cy+1)*block);y++)for(let x=cx*block;x<Math.min(w,(cx+1)*block);x++){const i=y*w+x;ink+=mask[i];dark+=1-gray[i]/255;n++;}
   const i=cy*cols+cx;a[i]=ink/n;b[i]=dark/n;error+=Math.abs(a[i]-b[i]);
  }
  tone+=error/a.length/2;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;for(const j of [x+1<cols?i+1:-1,y+1<rows?i+cols:-1])if(j>=0){edge+=Math.abs((a[i]-a[j])-(b[i]-b[j]));edges++;}}
 }
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i]){filled++;if(!mask[i-1]&&!mask[i+1]&&!mask[i-w]&&!mask[i+w])isolated++;}}
 const noise=filled?isolated/filled:0,structure=edge/Math.max(1,edges);
 const weights=goal==='tone'?[.8,.18,.02]:goal==='clean'?[.35,.30,.35]:[.62,.33,.05];
 return Math.max(0,Math.min(1,1-tone*weights[0]-structure*weights[1]-noise*weights[2]));
}
function signature(s){return JSON.stringify([s.preset,s.labVals[s.preset],s.gamma,s.contrast,s.sharpness,s.denoise,s.localContrast,s.whiteProtect,s.threshold,s.extra,s.lineWeight,s.minComponent,s.gapRadius,s.holeFill,s.detailboost,s.mixOn,s.mixOn?[s.mixPreset,s.labVals[s.mixPreset],s.mixMethod,s.mixRatio,s.mixThresholdB,s.mixExtraB]:null]);}
function fingerprint(mask){let h=2166136261;for(let i=0;i<mask.length;i++)h=Math.imul(h^mask[i],16777619);return h>>>0;}
function search(data,emit){
 const E=root.BlackboardEngine,s=E.settings(data.settings),{gray,w,h}=data;
 const budget=[160,600,1200].includes(data.options?.budget)?data.options.budget:600;
 const goal=['balanced','tone','clean','outline'].includes(data.options?.goal)?data.options.goal:'balanced',currentStyle=data.options?.style==='current',mixes=data.options?.mixes!==false&&!currentStyle;
 const timeLimit=budget===160?30000:budget===600?75000:120000,start=performance.now(),target=reference(gray,s);
 const edgeReference=goal==='outline'?outlineTarget(target,w,h):null;
 const maxDrawPixels=Math.max(0,Math.floor(Number(data.options?.maxDrawPixels)||0)),nativePixels=s.boardsWide*s.boardsHigh*256;
 const rank=(entry)=>entry.score-(maxDrawPixels?Math.max(0,entry.drawFraction*nativePixels/maxDrawPixels-1)*.5:0);
 const seen=new Map(),top=[],byPreset=new Map(),prepared=new Map(),slidersTuned=new Set();let evaluated=0,seed=271828,stage='Scanning styles',limited=false,mixCount=0,preprocessRuns=0,cacheHits=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const choose=items=>items[Math.floor(random()*items.length)];
 const allowed=()=>{if(evaluated>=budget)return false;if(performance.now()-start>timeLimit){limited=true;return false;}return true;};
 function report(force=false){if(force||evaluated%8===0)emit({type:'searchProgress',stage,evaluated,budget,progress:evaluated/budget*.86,best:top[0]?.score??0,elapsed:performance.now()-start});}
 function evaluate(candidate){
  if(!allowed())return null;const cfg=E.settings(candidate),key=signature(cfg);if(seen.has(key))return seen.get(key);
  const prepKey=JSON.stringify([cfg.invert,cfg.gamma,cfg.contrast,cfg.denoise,cfg.localContrast,cfg.whiteProtect,cfg.sharpness,cfg.detailboost,cfg.detailboost?cfg.extra:0]);
  let input=prepared.get(prepKey);
  if(input){cacheHits++;prepared.delete(prepKey);}else{input=E.preprocess(gray,w,h,cfg);preprocessRuns++;}
  prepared.set(prepKey,input);if(prepared.size>8)prepared.delete(prepared.keys().next().value);
  const mask=E.processPrepared(input,w,h,cfg),score=metric(mask,target,w,h,goal,edgeReference),entry={settings:cfg,score,drawFraction:mask.reduce((sum,v)=>sum+v,0)/mask.length,fingerprint:fingerprint(mask)};evaluated++;seen.set(key,entry);if(cfg.mixOn)mixCount++;
  if(!top.some(item=>item.fingerprint===entry.fingerprint))top.push(entry);top.sort((a,b)=>rank(b)-rank(a));if(top.length>30)top.length=30;
  if(!cfg.mixOn&&(!byPreset.has(cfg.preset)||rank(entry)>rank(byPreset.get(cfg.preset))))byPreset.set(cfg.preset,entry);
  report();return entry;
 }
 evaluate(s);
 const neutral=E.settings({...s,gamma:100,contrast:0,sharpness:0,denoise:0,localContrast:0,whiteProtect:0,threshold:128,extra:3,lineWeight:0,minComponent:0,gapRadius:0,holeFill:0,detailboost:false,mixOn:false});
 const defaults=E.settings();
 const presets=currentStyle?[s.preset]:Object.keys(E.PRESETS);
 for(const preset of presets){
  evaluate({...neutral,preset,labVals:{...neutral.labVals,[preset]:defaults.labVals[preset]}});
  evaluate({...s,preset,mixOn:false});
 }
 stage='Refining style controls';report(true);
 const leaders=[...byPreset.values()].sort((a,b)=>rank(b)-rank(a)).slice(0,3);
 for(const entry of leaders){
  let best=entry;
  for(let axis=0;axis<3;axis++){
   const spec=E.PRESETS[best.settings.preset].lab[axis];if(spec.label==='Unused')continue;
   for(const f of (budget===160?[.25,.75]:[0,.25,.5,.75,1])){
    if(evaluated>=budget*.47||!allowed())break;
    const cfg=copy(best.settings);cfg.labVals[cfg.preset][axis]=Math.round(spec.min+(spec.max-spec.min)*f);
    const tried=evaluate(cfg);if(tried&&rank(tried)>rank(best))best=tried;
   }
  }
 }
 const knobs={gamma:[50,100,150,200],contrast:[0,25,50],sharpness:[0,3,6,10],denoise:[0,2,4],localContrast:[0,50,100],whiteProtect:[0,50,100],threshold:[0,128,255],extra:[1,5,10],lineWeight:[-3,0,3],minComponent:[0,16,32],gapRadius:[0,1,2],holeFill:[0,16,32],detailboost:[false,true]};
 function relevantKeys(cfg){return Object.keys(knobs).filter(key=>key!=='threshold'||['solid','hybrid'].includes(cfg.preset));}
 let winner=[...byPreset.values()].filter(e=>presets.includes(e.settings.preset)).sort((a,b)=>rank(b)-rank(a))[0];
 const tunedStyle=winner.settings.preset,knobKeys=relevantKeys(winner.settings),tuneLimit=Math.floor(budget*(mixes?.86:1));
 stage=`Fine-tuning ${E.PRESETS[tunedStyle].name}`;report(true);
 // Coordinate sweeps guarantee every relevant slider gets attention before random trials.
 for(const key of knobKeys){
  for(const value of knobs[key]){
   if(!allowed()||evaluated>=tuneLimit)break;
   const tried=evaluate({...winner.settings,[key]:value});
   if(tried){slidersTuned.add(key);if(rank(tried)>rank(winner))winner=tried;}
  }
 }
 for(let axis=0;axis<3;axis++){
  const spec=E.PRESETS[tunedStyle].lab[axis];if(spec.label==='Unused')continue;
  for(const f of [0,.5,1]){
   if(!allowed()||evaluated>=tuneLimit)break;
   const cfg=copy(winner.settings);cfg.labVals[tunedStyle][axis]=Math.round(spec.min+(spec.max-spec.min)*f);
   const tried=evaluate(cfg);if(tried&&rank(tried)>rank(winner))winner=tried;
  }
 }
 function mutate(base,local=false){
  const cfg=copy(base);
  for(let i=0,n=1+Math.floor(random()*3);i<n;i++){
   if(random()<.4){const axis=Math.floor(random()*3),spec=E.PRESETS[cfg.preset].lab[axis];if(spec.label!=='Unused'){const radius=Math.max(1,(spec.max-spec.min)*.12);cfg.labVals[cfg.preset][axis]=local?Math.max(spec.min,Math.min(spec.max,Math.round(cfg.labVals[cfg.preset][axis]+(random()*2-1)*radius))):Math.round(spec.min+random()*(spec.max-spec.min));}}
   else{const key=choose(relevantKeys(cfg)),values=knobs[key],min=values[0],max=values.at(-1);cfg[key]=local&&typeof min==='number'?Math.max(min,Math.min(max,Math.round(cfg[key]+(random()*2-1)*Math.max(1,(max-min)*.12)))):choose(values);}
  }
  return cfg;
 }
 stage=`Polishing ${E.PRESETS[tunedStyle].name}`;report(true);
 let attempts=0;
 while(allowed()&&evaluated<tuneLimit&&attempts++<budget*15){
  const tried=evaluate(mutate(winner.settings,random()<.8));if(tried&&rank(tried)>rank(winner))winner=tried;
 }
 if(mixes&&allowed()){
  stage='Combining styles';report(true);
  const pool=[...byPreset.values()].sort((a,b)=>rank(b)-rank(a)).slice(0,8);attempts=0;
  while(allowed()&&attempts++<budget*15){
   const a=choose(pool),b=choose(pool);if(a.settings.preset===b.settings.preset)continue;
   let cfg=copy(a.settings);cfg.mixOn=true;cfg.mixPreset=b.settings.preset;cfg.labVals[cfg.mixPreset]=[...b.settings.labVals[cfg.mixPreset]];cfg.mixMethod=choose(['spatial','add','intersect','edgefill']);cfg.mixRatio=cfg.mixMethod==='spatial'?choose([0,20,40,60,80,100]):50;cfg.mixThresholdB=choose([0,64,128,192,255]);cfg.mixExtraB=choose([1,b.settings.extra,10]);
   if(random()<.4){const axis=Math.floor(random()*3),spec=E.PRESETS[cfg.mixPreset].lab[axis];if(spec.label!=='Unused')cfg.labVals[cfg.mixPreset][axis]=Math.round(spec.min+random()*(spec.max-spec.min));}
   if(random()<.4)cfg=mutate(cfg);evaluate(cfg);
  }
 }
 // Always compare finalists and the baseline against the same higher-resolution source.
 stage='Rechecking the shortlist';report(true);
 const fine=data.fine||{gray,w,h},fineTarget=reference(fine.gray,s),fineOutline=goal==='outline'?outlineTarget(fineTarget,fine.w,fine.h):null,shortlist=[],sigs=new Set();
 const fullResolution=!!data.options?.fullResolution||maxDrawPixels>0,shortlistLimit=fullResolution?4:13;
 if(fullResolution&&(fine.w!==s.boardsWide*16||fine.h!==s.boardsHigh*16))throw Error('Full-size check requires the actual wall dimensions.');
 let ordered=top.filter(e=>!currentStyle||(e.settings.preset===s.preset&&!e.settings.mixOn));
 // Small renders favour different settings than the real wall does, so for outlines the
 // full-size check compares the best of several styles rather than variants of one.
 if(goal==='outline'){const styleKey=e=>e.settings.preset+(e.settings.mixOn?'+'+e.settings.mixPreset:''),firsts=[],seenStyles=new Set();for(const e of ordered)if(!seenStyles.has(styleKey(e))){seenStyles.add(styleKey(e));firsts.push(e);}ordered=[...firsts,...ordered.filter(e=>!firsts.includes(e))];}
 for(const entry of [ {settings:s}, ...ordered ]){const key=signature(entry.settings);if(sigs.has(key))continue;sigs.add(key);shortlist.push(entry);if(shortlist.length===shortlistLimit)break;}
 const finalists=[];let baseline;
 for(let index=0;index<shortlist.length;index++){
  const cfg=shortlist[index].settings,mask=E.process(fine.gray,fine.w,fine.h,cfg),score=metric(mask,fineTarget,fine.w,fine.h,goal,fineOutline);
  const entry={settings:cfg,score,mask,effort:effort(mask,fine.w,fine.h),fingerprint:fingerprint(mask)};
  if(index===0)baseline=entry;else finalists.push(entry);
  emit({type:'searchProgress',stage,evaluated,budget,progress:.86+.14*(index+1)/shortlist.length,best:score,elapsed:performance.now()-start});
 }
 finalists.sort((a,b)=>b.score-a.score);
 const leader=finalists.find(e=>!maxDrawPixels||e.effort.drawPixels<=maxDrawPixels);
 if(goal==='outline'&&leader){
  stage='Finishing at full size';emit({type:'searchProgress',stage,evaluated,budget,progress:.98,best:leader.score,elapsed:performance.now()-start});
  let best=leader;const tried=new Set(finalists.map(e=>signature(e.settings)));
  for(const [key,values] of [['lineWeight',[0,1,2]],['minComponent',[0,8,16,32]],['gapRadius',[0,1]]]){
   for(const value of values){
    const cfg=E.settings({...best.settings,[key]:value}),sig=signature(cfg);if(tried.has(sig))continue;tried.add(sig);
    const mask=E.process(fine.gray,fine.w,fine.h,cfg),entry={settings:cfg,score:metric(mask,fineTarget,fine.w,fine.h,goal,fineOutline),mask,effort:effort(mask,fine.w,fine.h),fingerprint:fingerprint(mask)};
    if(maxDrawPixels&&entry.effort.drawPixels>maxDrawPixels)continue;
    finalists.push(entry);if(entry.score>best.score)best=entry;
   }
  }
  finalists.sort((a,b)=>b.score-a.score);
 }
 const unique=[],hashes=new Set([baseline.fingerprint]);
 for(const entry of finalists){if(hashes.has(entry.fingerprint)||(maxDrawPixels&&entry.effort.drawPixels>maxDrawPixels))continue;hashes.add(entry.fingerprint);unique.push(entry);if(unique.length===8)break;}
 return {type:'searchComplete',baseline,candidates:unique,w:fine.w,h:fine.h,evaluated,mixCount,rechecked:shortlist.length,budget,limited,elapsed:performance.now()-start,goal,fullResolution,maxDrawPixels,stylesScanned:presets.length,tunedStyle,slidersTuned:[...slidersTuned],preprocessRuns,cacheHits};
}
root.BlackboardSearch={search,metric,reference,signature,effort,outlineTarget,outlineScore};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BlackboardSearch;
})(typeof globalThis!=='undefined'?globalThis:this);
