const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{Worker}=require('node:worker_threads'),E=require('../src/engine.js'),S=require('../src/search.js');
// Same assembly order as the app's worker Blob: engine, search, worker.
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const code=`const {parentPort}=require('node:worker_threads'); global.self=global;self.postMessage=(m,t)=>parentPort.postMessage(m,t);${read('engine.js')}\n${read('search.js')}\n${read('worker.js')}\nparentPort.on('message',data=>self.onmessage({data}));`;
const gray=Uint8ClampedArray.from({length:64*48},(_,i)=>Math.round(255*(i%64)/63));
const presetCount=Object.keys(E.PRESETS).length;
function job(type,s=E.settings(),extra={}) {return new Promise((resolve,reject)=>{const worker=new Worker(code,{eval:true}),messages=[];const timer=setTimeout(()=>{worker.terminate();reject(Error('Worker timed out'));},60000);worker.on('error',reject);worker.on('message',m=>{messages.push(m);if(m.type==='error'){clearTimeout(timer);worker.terminate();reject(Error(m.message));}if(['render','complete','optimized','searchComplete'].includes(m.type)){clearTimeout(timer);worker.terminate();resolve(messages);}});worker.postMessage({id:42,type,w:64,h:48,gray:gray.slice(),settings:s,...extra});});}
test('worker transfers exact render output and job identity',async()=>{const s=E.settings({preset:'floyd'}),[message]=await job('render',s);assert.equal(message.id,42);assert.equal(message.type,'render');assert.deepEqual(message.mask,E.process(gray,64,48,s));assert.ok(message.elapsed>=0);});
test('gallery renders every style as a whole-image preview without changing settings',async()=>{const s=E.settings(),original=structuredClone(s),messages=await job('gallery',s),thumbs=messages.filter(m=>m.type==='thumbnail');assert.equal(thumbs.length,presetCount);assert.equal(new Set(thumbs.map(m=>m.preset)).size,presetCount);for(const t of thumbs){assert.equal(t.w,64);assert.equal(t.h,48);assert.equal(t.mask.length,64*48);}assert.equal(messages.at(-1).type,'complete');assert.deepEqual(s,original);});
test('optimizer reports bounded parameters and a reproducible score',async()=>{const base=E.settings(),messages=await job('optimize',base),best=messages.at(-1).best;assert.ok(Object.hasOwn(E.PRESETS,best.preset));best.lab.forEach((v,i)=>{const cfg=E.PRESETS[best.preset].lab[i];assert.ok(v>=cfg.min&&v<=cfg.max);});const mask=E.process(gray,64,48,best.settings);assert.equal(best.score,S.metric(mask,S.reference(gray,base),64,48,'balanced'));assert.ok(messages.some(m=>m.type==='progress'));});
test('style search returns a baseline and distinct, valid candidates',async()=>{const messages=await job('search',E.settings(),{options:{budget:160}}),done=messages.at(-1);assert.equal(done.type,'searchComplete');assert.equal(done.baseline.mask.length,64*48);assert.ok(done.candidates.length>0);const prints=new Set([done.baseline.fingerprint]);for(const c of done.candidates){assert.equal(c.mask.length,64*48);assert.ok(c.score>=0&&c.score<=1);assert.deepEqual(c.mask,E.process(gray,64,48,c.settings));assert.ok(!prints.has(c.fingerprint));prints.add(c.fingerprint);}});
test('malformed render reports an error instead of silently succeeding',async()=>{const worker=new Worker(code,{eval:true});try{const message=await new Promise((resolve,reject)=>{worker.on('message',resolve);worker.on('error',reject);worker.postMessage({id:7,type:'render',w:0,h:4,gray:new Uint8Array(),settings:E.settings()});});assert.equal(message.type,'error');assert.equal(message.id,7);}finally{await worker.terminate();}});
// Clean outlines scoring: judged against structure, not against any one style's output.
test('outline score prefers a clean contour over fills, specks and blank',()=>{
 const n=160,g=new Uint8ClampedArray(n*n).fill(225);for(let y=0;y<n;y++)for(let x=0;x<n;x++)if((x-80)**2+(y-80)**2<50**2)g[y*n+x]=35;
 const target=S.outlineTarget(g,n,n),score=m=>S.outlineScore(m,target,n,n);
 const ring=Uint8Array.from({length:n*n},(_,i)=>{const d=Math.hypot(i%n-80,Math.floor(i/n)-80);return Math.abs(d-50)<1.5?1:0;});
 const disc=Uint8Array.from(g,v=>v<128?1:0);
 let seed=3;const specks=Uint8Array.from({length:n*n},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296<.06?1:0;});
 const blank=new Uint8Array(n*n);
 const results={ring:score(ring),disc:score(disc),specks:score(specks),blank:score(blank)};
 assert.ok(results.ring>.6,JSON.stringify(results));
 for(const k of ['disc','specks','blank'])assert.ok(results.ring>results[k]*2,JSON.stringify(results));
});
test('outline reference is the same structure at preview and full size',()=>{
 const make=n=>{const g=new Uint8ClampedArray(n*n).fill(220);for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(Math.abs(x-n/2)<n/4&&Math.abs(y-n/2)<n/5)g[y*n+x]=40;return g;};
 const small=S.outlineTarget(make(160),160,160),large=S.outlineTarget(make(1200),1200,1200);
 assert.equal(small.aw,large.aw);assert.equal(small.ah,large.ah);
 let same=0,total=0;for(let i=0;i<small.edges.length;i++)if(small.edges[i]||large.edges[i]){total++;if(small.edges[i]&&large.edges[i])same++;}
 assert.ok(same/total>.8,`only ${same}/${total} reference cells agree`);
});
