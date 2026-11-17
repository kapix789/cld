/* Engine is prepended by build.py. Each job runs in an isolated, cancellable worker. */
self.onmessage=({data})=>{
    const {id,type,gray,w,h,settings:s}=data,E=self.BlackboardEngine;
    try {
        if(type==='search'){const result=self.BlackboardSearch.search(data,message=>self.postMessage({id,...message}));self.postMessage({id,...result},[result.baseline.mask.buffer,...result.candidates.map(c=>c.mask.buffer)]);return;}
        if(type==='render'){
            const start=performance.now(),mask=E.process(gray,w,h,s);
            self.postMessage({id,type,mask,w,h,elapsed:performance.now()-start},[mask.buffer]);return;
        }
        if(type==='optimize'){
            const result=self.BlackboardSearch.search({...data,options:{budget:160,mixes:false}},message=>self.postMessage({id,type:'progress',progress:message.progress,stage:message.stage}));
            const best=[result.baseline,...result.candidates].sort((a,b)=>b.score-a.score)[0];
            self.postMessage({id,type:'optimized',best:{settings:best.settings,preset:best.settings.preset,lab:best.settings.labVals[best.settings.preset],score:best.score}});return;
        }
        const keys=Object.keys(E.PRESETS),results=[],base=E.settings({...s,mixOn:false}),target=self.BlackboardSearch.reference(gray,base);
        for(let index=0;index<keys.length;index++){
            const preset=keys[index],cfg={...base,preset},mask=E.process(gray,w,h,cfg);
            results.push({preset,score:self.BlackboardSearch.metric(mask,target,w,h),lab:[...cfg.labVals[preset]]});
            self.postMessage({id,type:'thumbnail',preset,mask,w,h,progress:(index+1)/keys.length},[mask.buffer]);
        }
        results.sort((a,b)=>b.score-a.score);
        self.postMessage({id,type:'complete',results});
    } catch(error){self.postMessage({id,type:'error',message:error.message||'Processing failed.'});}
};
