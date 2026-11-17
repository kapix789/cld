const test=require('node:test'),assert=require('node:assert/strict'),E=require('../src/engine.js');
const w=64,h=48,gray=Uint8ClampedArray.from({length:w*h},(_,i)=>Math.round((i%w)/63*255));
for(let y=10;y<25;y++)for(let x=20;x<35;x++)gray[y*w+x]=20;
for(const preset of Object.keys(E.PRESETS))test(`${preset}: binary, deterministic, non-mutating`,()=>{
 const before=gray.slice(),s=E.settings({preset}),first=E.process(gray,w,h,s),second=E.process(gray,w,h,s);
 assert.equal(first.length,w*h);assert.ok(first.every(v=>v===0||v===1));assert.deepEqual(first,second);assert.deepEqual(gray,before);
});
test('black mask semantics agree across pixels and exported rows',()=>{
 const s=E.settings({preset:'threshold',boardsWide:2,boardsHigh:1}),input=Uint8ClampedArray.from({length:512},(_,i)=>i%32<16?0:255),mask=E.process(input,32,16,s),plan=E.plan(mask,32,16,s),rgba=E.rgba(mask,32,16);
 assert.equal(plan.boards[0].drawPixelCount,256);assert.equal(plan.boards[1].drawPixelCount,0);assert.equal(plan.boards[0].rows[0],'1'.repeat(16));assert.equal(rgba[0],0);assert.equal(rgba[16*4],255);assert.equal(plan.output.invert,false);
});
test('source inversion is baked into the plan once',()=>{const s=E.settings({preset:'threshold',invert:true,boardsWide:1,boardsHigh:1}),mask=E.process(new Uint8Array(256),16,16,s);assert.ok(mask.every(v=>v===0));const p=E.plan(mask,16,16,s);assert.equal(p.output.invert,false);assert.equal(p.output.sourceInverted,true);assert.equal(p.boards[0].drawPixelCount,0);});
test('flip output is exactly the complementary mask',()=>{const s=E.settings({preset:'threshold'}),a=E.process(gray,w,h,s),b=E.process(gray,w,h,{...s,flipOutput:true});for(let i=0;i<a.length;i++)assert.equal(a[i]+b[i],1);});
test('Sauvola statistics retain squared values above 255',()=>{const v=Uint8Array.from([0,255,0,255]);const {mean,std}=E.localStats(v,2,2,1);assert.equal(mean[0],127.5);assert.equal(std[0],127.5);});
test('Bayer 8 has all 64 unique ranks',()=>assert.deepEqual([...E.BAYER8].sort((a,b)=>a-b),Array.from({length:64},(_,i)=>i)));
test('gap repair actually bridges a one-pixel break',()=>{const mask=new Uint8Array(9*5);for(let x=1;x<8;x++)if(x!==4)mask[2*9+x]=1;const fixed=E.repairGaps(mask,9,5,1);assert.equal(fixed[2*9+4],1);assert.equal(fixed[0],0);});
test('mix spatial endpoints are exactly A and B',()=>{const s=E.settings({preset:'manga',mixPreset:'threshold',mixOn:true,mixRatio:0}),a=E.process(gray,w,h,{...s,mixOn:false}),b=E.process(gray,w,h,{...s,preset:'threshold',mixOn:false});assert.deepEqual(E.process(gray,w,h,s),a);assert.deepEqual(E.process(gray,w,h,{...s,mixRatio:100}),b);});
test('union and intersection obey binary set semantics',()=>{const s=E.settings({preset:'manga',mixPreset:'threshold',mixOn:true}),a=E.process(gray,w,h,{...s,mixOn:false}),b=E.process(gray,w,h,{...s,preset:'threshold',mixOn:false}),union=E.process(gray,w,h,{...s,mixMethod:'add'}),intersection=E.process(gray,w,h,{...s,mixMethod:'intersect'});for(let i=0;i<a.length;i++){assert.equal(union[i],a[i]|b[i]);assert.equal(intersection[i],a[i]&b[i]);}});
test('dimensions clamp on both axes and imported settings are allowlisted',()=>{const s=E.settings({boardsWide:500,boardsHigh:-7,preset:'__proto__',fitMode:'bad',gamma:'no',labVals:{threshold:[900,-1,0]},unknown:'discard'});assert.equal(s.boardsWide,200);assert.equal(s.boardsHigh,1);assert.equal(s.preset,'manga');assert.equal(s.fitMode,'contain');assert.equal(s.gamma,100);assert.equal(s.labVals.threshold[0],255);assert.ok(!('unknown' in s));});
test('plan rejects mismatched dimensions and preserves every pixel',()=>{const s=E.settings({boardsWide:4,boardsHigh:3,preset:'floyd'}),mask=E.process(gray,w,h,s),p=E.plan(mask,w,h,s);assert.equal(p.boardCount,12);for(const board of p.boards)for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(+board.rows[y][x],mask[(board.y*16+y)*w+board.x*16+x]);assert.throws(()=>E.plan(mask,w,h,{...s,boardsWide:5}));});
test('background and ink palettes are opaque and opposite',()=>{assert.deepEqual([...E.rgba(Uint8Array.from([0,1]),2,1)],[255,255,255,255,0,0,0,255]);const chalk=E.rgba(Uint8Array.from([0,1]),2,1,'chalk');assert.ok(chalk[0]<chalk[4]);assert.equal(chalk[3],255);});
test('detail boost, denoise, cleanup and mixing can run together',()=>{const s=E.settings({detailboost:true,denoise:1,localContrast:20,whiteProtect:30,contrast:25,sharpness:2,gapRadius:1,holeFill:4,minComponent:3,mixOn:true});assert.equal(E.process(gray,w,h,s).length,w*h);});
// Format locks: an in-game mod and Building Gadgets read these exports, so any change here must be deliberate.
test('Building Gadgets wall JSON is unchanged from 9.3.2',()=>{assert.equal(JSON.stringify(E.wall(E.settings({boardsWide:2,boardsHigh:3}))),'{"name":"blackboard-wall-2x3","statePosArrayList":"{blockstatemap:[{Name:\\"supplementaries:blackboard\\",Properties:{facing:\\"north\\",waterlogged:\\"false\\"}}],endpos:{X:1,Y:2,Z:0},startpos:{X:0,Y:0,Z:0},statelist:[I;0,0,0,0,0,0]}","requiredItems":{"supplementaries:Reference{ResourceKey[minecraft:item / supplementaries:blackboard]=supplementaries:blackboard}":6}}');});
test('plan JSON keeps the 9.3.2 field layout read by the mod',()=>{const s=E.settings({boardsWide:2,boardsHigh:1,preset:'threshold'}),p=E.plan(E.process(gray.slice(0,32*16),32,16,s),32,16,s);
 assert.equal(p.kind,'supplementaries-blackboard-plan');assert.equal(p.version,2);
 assert.deepEqual(Object.keys(p),['kind','version','generator','createdAt','legend','output','boardCount','boards']);
 assert.deepEqual(Object.keys(p.output),['boardsWide','boardsHigh','tileSize','preset','threshold','contrast','sharpness','extra','fitMode','invert','renderMode','exportMode','drawColor','backgroundColor','drawMeaning','maskPolarity','sourceInversionIsIndependent','previewMatched','sourceInverted','exportFlipped','totalWidth','totalHeight']);
 assert.deepEqual(p.legend,{'0':'Leave this pixel white.','1':'Draw this pixel as black in Minecraft.'});
 for(const b of p.boards){assert.deepEqual(Object.keys(b),['x','y','blackPixelCount','drawPixelCount','rows']);assert.equal(b.rows.length,16);for(const row of b.rows)assert.match(row,/^[01]{16}$/);}});
// Dither tone fidelity: on a flat grey, ink coverage should match darkness at default settings.
const inkPercent=(preset,level,lab)=>{const n=128,flat=new Uint8ClampedArray(n*n).fill(level),s=E.settings({preset,...(lab?{labVals:{[preset]:lab}}:{})}),m=E.process(flat,n,n,s);return m.reduce((a,b)=>a+b,0)/m.length*100;};
for(const preset of ['floyd','jjn','stucki','sierra','ordered','bayer8','ign','bluenoise'])test(`${preset}: default settings preserve tone on flat greys`,()=>{
 for(const level of [32,64,128,192,224]){const ideal=(1-level/255)*100,actual=inkPercent(preset,level);assert.ok(Math.abs(actual-ideal)<=3,`grey ${level}: ${actual.toFixed(1)}% ink, expected ≈${ideal.toFixed(1)}%`);}
});
test('Grain and IGN strength changes texture, not overall brightness',()=>{
 for(const [preset,strengthAxis] of [['bluenoise',2],['ign',2]])for(const strength of [10,40,70,100]){const lab=E.PRESETS[preset].lab.map(c=>c.def);lab[strengthAxis]=strength;const actual=inkPercent(preset,128,lab);assert.ok(Math.abs(actual-50)<=3,`${preset} strength ${strength}: ${actual.toFixed(1)}% ink on mid grey`);}
});
test('IGN produces a fine interleaved pattern rather than long streaks',()=>{
 const n=128,m=E.process(new Uint8ClampedArray(n*n).fill(128),n,n,E.settings({preset:'ign'}));let longest=0;
 for(let y=0;y<n;y++){let run=1;for(let x=1;x<n;x++){run=m[y*n+x]===m[y*n+x-1]?run+1:1;longest=Math.max(longest,run);}}
 assert.ok(longest<=3,`longest horizontal run ${longest}`);
});
// Denoise: the histogram median must equal sorting every clamp-to-edge window (the 9.3.2 method).
test('histogram median matches a sorted-window median exactly',()=>{
 const sortedMedian=(g,w,h,r)=>{const out=new Float32Array(w*h),size=(2*r+1)**2,buf=new Uint8ClampedArray(size);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)buf[k++]=g[Math.min(h-1,Math.max(0,y+dy))*w+Math.min(w-1,Math.max(0,x+dx))];buf.sort();out[y*w+x]=buf[size>>1];}return out;};
 let seed=7;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const [w,h] of [[1,1],[1,9],[9,1],[3,2],[17,13],[40,31]])for(let r=0;r<=4;r++){
  // Fractional values, including exact .5 ties, exercise the same 0-255 rounding.
  const g=Float32Array.from({length:w*h},()=>rnd()<.2?Math.floor(rnd()*255)+.5:rnd()*260-2);
  assert.deepEqual(E.medianFilter(g,w,h,r),sortedMedian(g,w,h,r),`${w}x${h} radius ${r}`);
 }
});
// Canny: edges must stay continuous in every direction, and linking must stay linear-time.
const cannyStress=(w,h)=>{const g=new Uint8ClampedArray(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=128+100*Math.sin(x/w*7)*Math.cos(y/h*5);if(((x-w/2)**2+(y-h/2)**2)<(w/4)**2)v=40;g[y*w+x]=v+((x*7919+y*104729)%37)-18;}return g;};
test('Canny traces a closed outline around a circle, diagonals included',()=>{
 const n=96,g=new Uint8ClampedArray(n*n).fill(230);for(let y=0;y<n;y++)for(let x=0;x<n;x++)if((x-48)**2+(y-48)**2<30**2)g[y*n+x]=40;
 const m=E.process(g,n,n,E.settings({preset:'canny'})),missed=[];
 for(let k=0;k<72;k++){const a=k*Math.PI/36;let found=false;for(let r=27;r<=33;r++)if(m[Math.round(48+r*Math.sin(a))*n+Math.round(48+r*Math.cos(a))])found=true;if(!found)missed.push(k*5);}
 assert.deepEqual(missed,[],`no edge at ${missed.join(', ')} degrees`);
});
test('Canny keeps 45° and 135° edges unbroken',()=>{
 const n=64;
 for(const slope of [1,-1]){const g=new Uint8ClampedArray(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)g[y*n+x]=(slope>0?x-y:x+y-n)>0?220:30;
  const m=E.process(g,n,n,E.settings({preset:'canny'}));let gaps=0;
  for(let y=8;y<n-8;y++){let row=0;for(let x=0;x<n;x++)row+=m[y*n+x];if(!row)gaps++;}
  assert.equal(gaps,0,`${slope>0?45:135}° edge has ${gaps} empty rows`);}
});
test('Canny edge linking stays fast on long weak-edge chains',()=>{
 const g=cannyStress(1200,1200),start=performance.now();E.process(g,1200,1200,E.settings({preset:'canny'}));const ms=performance.now()-start;
 assert.ok(ms<3000,`took ${Math.round(ms)} ms (9.3.2 took about 7 s here)`);
});
