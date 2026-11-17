/* Blackboard Studio — UI controller. No network requests, frameworks, or build dependencies. */
(()=>{
'use strict';
const E=BlackboardEngine, $=id=>document.getElementById(id), clone=o=>JSON.parse(JSON.stringify(o));
let s=E.settings(), source=null, sourceURL='', sourceName='', result=null, renderWorker=null, auxiliaryWorker=null, renderTimer=null, renderRevision=0, sourceRevision=0;
let view='result', grid=false, split=50, zoom='fit', boardIndex=0, history=[clone(s)], historyIndex=0, category='all', toastTimer, auxiliaryJob='';
const workerURL=URL.createObjectURL(new Blob([$ ('engine-source').textContent,'\n',$('search-source').textContent,'\n',$('worker-source').textContent],{type:'text/javascript'}));
const inkKeys=['panel','softink','animeink','manga','lineart','bold','solid','canny','xdog','sauvola','wolf','hybrid','darkart','bradley','adaptive','threshold'];
const ditherKeys=['floyd','atkinson','jjn','stucki','sierra','ordered','bayer8','ign','bluenoise'];
const sliderSpecs=[
 ['gamma','Gamma',50,200,100,'toneControls'],['threshold','Tone threshold',0,255,128,'toneControls'],['contrast','Contrast',0,50,0,'toneControls'],['sharpness','Sharpness',0,10,0,'toneControls'],['extra','Edge sensitivity',1,10,3,'toneControls'],['lineWeight','Line weight',-3,3,0,'toneControls'],
 ['denoise','Denoise radius',0,4,0,'cleanupControls'],['localContrast','Local contrast',0,100,0,'cleanupControls'],['whiteProtect','Bright protection',0,100,0,'cleanupControls'],['minComponent','Remove islands below',0,32,0,'cleanupControls'],['gapRadius','Bridge gaps',0,2,0,'cleanupControls'],['holeFill','Fill holes up to',0,32,0,'cleanupControls'],
 ['mixRatio','Blend toward B',0,100,50,'mixControls'],['mixThresholdB','B threshold',0,255,128,'mixControls'],['mixExtraB','B edge sensitivity',1,10,5,'mixControls']
];
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function status(message){$('status').textContent=message;}
function processingKey(cfg=s){const {renderMode,exportMode,planName,ratioLocked,quality,...rest}=cfg;return JSON.stringify(rest);}
function isCurrent(){return !!result&&result.key===processingKey()&&result.sourceRevision===sourceRevision&&!renderWorker&&!renderTimer;}
function updateActions(){const ready=isCurrent();for(const id of ['downloadPlan','downloadPNG','copyPlan'])$(id).disabled=!ready;for(const id of ['saveProject','autoFit','gallery','optimize','megaCompare'])$(id).disabled=!source;$('undo').disabled=historyIndex===0;$('redo').disabled=historyIndex>=history.length-1;}
function remember(){queueDraft();if(JSON.stringify(s)!==JSON.stringify(history[historyIndex])){history=history.slice(0,historyIndex+1);history.push(clone(s));if(history.length>80)history.shift();historyIndex=history.length-1;}updateActions();}
function historyMove(delta){const target=historyIndex+delta;if(target<0||target>=history.length)return;stopAuxiliary();s=clone(history[target]);historyIndex=target;sync();scheduleRender();}
function slider(id,label,min,max,value,parent){
 const wrap=document.createElement('div');wrap.className='slider-control';wrap.innerHTML=`<div class="slider-label"><label for="${id}"></label><output for="${id}" id="${id}Value"></output></div><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${value}"><div class="slider-extents"><span>${min}</span><span>${max}</span></div>`;
 wrap.querySelector('label').textContent=label;$(parent).appendChild(wrap);return $(id);
}
function displayValue(id,value){if(id==='gamma')return (value/100).toFixed(2);if(['contrast','localContrast','whiteProtect','mixRatio'].includes(id))return value+'%';if(['gapRadius','holeFill','minComponent','lineWeight','denoise'].includes(id))return value+' px';return String(value);}
for(const [id,label,min,max,value,parent] of sliderSpecs){
 const el=slider(id,label,min,max,value,parent);
 el.addEventListener('input',()=>{s[id]=+el.value;$(id+'Value').textContent=displayValue(id,s[id]);stopAuxiliary();scheduleRender();});
 el.addEventListener('change',remember);
}
for(let i=0;i<3;i++){
 const el=slider('lab'+i,'Style parameter',0,100,50,'labControls');
 el.addEventListener('input',()=>{s.labVals[s.preset][i]=+el.value;$('lab'+i+'Value').textContent=el.value;stopAuxiliary();scheduleRender();});el.addEventListener('change',remember);
}
for(const [key,p] of Object.entries(E.PRESETS)){
 const btn=document.createElement('button');btn.className='preset-button';btn.dataset.preset=key;btn.setAttribute('aria-pressed','false');
 const name=document.createElement('strong'),desc=document.createElement('small');name.textContent=p.name;desc.textContent=p.desc;btn.append(name,desc);btn.onclick=()=>choosePreset(key);$('presets').append(btn);
 const opt=document.createElement('option');opt.value=key;opt.textContent=p.name;$('mixPreset').append(opt);
}
function choosePreset(key){stopAuxiliary();s.preset=key;remember();sync();scheduleRender();}
function sync(){
 for(const [id] of sliderSpecs){$(id).value=s[id];$(id+'Value').textContent=displayValue(id,s[id]);}
 for(const id of ['boardsWide','boardsHigh','fitMode','quality','mixPreset','mixMethod','renderMode','exportMode','planName'])$(id).value=s[id];
 for(const id of ['invert','smoothing','detailboost','mixOn','flipOutput'])$(id).checked=s[id];
 $('ratioLocked').classList.toggle('active',s.ratioLocked);$('ratioLocked').setAttribute('aria-pressed',s.ratioLocked);
 const p=E.PRESETS[s.preset];$('activeName').textContent=p.name;$('activeDescription').textContent=p.desc;
 p.lab.forEach((cfg,i)=>{const el=$('lab'+i);el.min=cfg.min;el.max=cfg.max;el.step=cfg.step;el.value=s.labVals[s.preset][i];el.disabled=cfg.label==='Unused';el.closest('.slider-control').hidden=el.disabled;document.querySelector(`label[for="lab${i}"]`).textContent=cfg.label;$('lab'+i+'Value').textContent=el.value;const bounds=el.parentElement.querySelectorAll('.slider-extents span');bounds[0].textContent=cfg.min;bounds[1].textContent=cfg.max;});
 // Avoid presenting controls that have no effect for the active style.
 const toneRelevant=['solid','hybrid'].includes(s.preset);$('threshold').closest('.slider-control').hidden=!toneRelevant;
 const extraRelevant=['panel','softink','animeink','manga','lineart','xdog','darkart','woodcut'].includes(s.preset);$('extra').closest('.slider-control').hidden=!extraRelevant;
 $('mixRatio').disabled=!s.mixOn||s.mixMethod!=='spatial';$('mixThresholdB').disabled=!s.mixOn;$('mixExtraB').disabled=!s.mixOn;
 document.querySelectorAll('[data-preset]').forEach(el=>{el.classList.toggle('active',el.dataset.preset===s.preset);el.setAttribute('aria-pressed',el.dataset.preset===s.preset);});
 updateWall();updateActions();
}
function updateWall(){
 const w=s.boardsWide*16,h=s.boardsHigh*16,n=s.boardsWide*s.boardsHigh;
 $('wallPixels').textContent=`${w} × ${h} pixels`;$('wallBoards').textContent=`${n.toLocaleString()} boards`;
 $('metricSize').innerHTML=`${w} × ${h} <small>px</small>`;$('metricBoards').innerHTML=`${n.toLocaleString()} <small>boards</small>`;
 const large=Math.max(s.boardsWide,s.boardsHigh)>128;$('reach').classList.toggle('warning',large);$('reach').textContent=large?'Exceeds the original ±64-block span. Large walls may need repositioning.':'Within the original ±64-block span.';
 if(w*h>2000000)$('reach').textContent+=' Large renders can take longer; Cancel stays available.';
}
function filterPresets(){let count=0;const query=$('presetSearch').value.toLowerCase().trim();document.querySelectorAll('[data-preset]').forEach(el=>{const key=el.dataset.preset,group=inkKeys.includes(key)?'ink':ditherKeys.includes(key)?'dither':'texture';el.hidden=!(category==='all'||category===group)||!`${E.PRESETS[key].name} ${E.PRESETS[key].desc}`.toLowerCase().includes(query);if(!el.hidden)count++;});$('noStyles').hidden=count>0;}
$('presetSearch').oninput=filterPresets;
document.querySelectorAll('[data-category]').forEach(btn=>btn.onclick=()=>{category=btn.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',b===btn);});filterPresets();});
function setDimensions(key,value){
 const ratio=source?source.naturalWidth/source.naturalHeight:s.boardsWide/s.boardsHigh;
 s[key]=Math.max(1,Math.min(200,Math.round(Number(value)||1)));
 if(s.ratioLocked){const other=key==='boardsWide'?'boardsHigh':'boardsWide';s[other]=Math.max(1,Math.min(200,Math.round(key==='boardsWide'?s[key]/ratio:s[key]*ratio)));}
 stopAuxiliary();sync();remember();scheduleRender();
}
for(const key of ['boardsWide','boardsHigh'])$(key).onchange=e=>setDimensions(key,e.target.value);
$('ratioLocked').onclick=()=>{s.ratioLocked=!s.ratioLocked;remember();sync();};
$('autoFit').onclick=()=>{if(!source)return;const ratio=source.naturalWidth/source.naturalHeight;let w=s.quality*Math.sqrt(ratio),h=s.quality/Math.sqrt(ratio);const scale=Math.min(1,200/w,200/h);s.boardsWide=Math.max(1,Math.round(w*scale));s.boardsHigh=Math.max(1,Math.round(h*scale));stopAuxiliary();remember();sync();scheduleRender();toast(`Wall set to ${s.boardsWide} × ${s.boardsHigh} boards.`);};
for(const id of ['fitMode','mixPreset','mixMethod'])$(id).onchange=e=>{s[id]=e.target.value;stopAuxiliary();remember();sync();scheduleRender();};
$('quality').onchange=e=>{s.quality=+e.target.value;remember();};
for(const id of ['invert','smoothing','detailboost','mixOn','flipOutput'])$(id).onchange=e=>{s[id]=e.target.checked;stopAuxiliary();remember();sync();scheduleRender();};
$('renderMode').onchange=e=>{s.renderMode=e.target.value;remember();drawPreview();};
$('exportMode').onchange=e=>{s.exportMode=e.target.value;remember();};
$('planName').onchange=e=>{s.planName=e.target.value;remember();};
$('resetStyle').onclick=()=>{s.labVals[s.preset]=E.PRESETS[s.preset].lab.map(c=>c.def);stopAuxiliary();remember();sync();scheduleRender();};
$('resetAll').onclick=()=>{const keep={boardsWide:s.boardsWide,boardsHigh:s.boardsHigh,fitMode:s.fitMode,ratioLocked:s.ratioLocked,quality:s.quality,planName:s.planName};s=E.settings(keep);stopAuxiliary();remember();sync();scheduleRender();toast('Adjustments reset. Undo is available.');};
$('undo').onclick=()=>historyMove(-1);$('redo').onclick=()=>historyMove(1);
function openTab(name){const tuning=name==='tune';$('tunePanel').hidden=!tuning;$('exportPanel').hidden=tuning;for(const id of ['tune','export']){$(id+'Tab').classList.toggle('active',id===name);$(id+'Tab').setAttribute('aria-selected',id===name);$(id+'Tab').tabIndex=id===name?0:-1;}}
$('tuneTab').onclick=()=>openTab('tune');$('exportTab').onclick=()=>openTab('export');
for(const id of ['tuneTab','exportTab'])$(id).onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=id==='tuneTab'?'export':'tune';openTab(next);$(next+'Tab').focus();}};
function stopRender(){clearTimeout(renderTimer);renderTimer=null;if(renderWorker){renderWorker.terminate();renderWorker=null;}renderRevision++;updateActions();}
function stopAuxiliary(){
 const wasSearch=auxiliaryJob==='search';
 if(auxiliaryWorker){auxiliaryWorker.terminate();auxiliaryWorker=null;auxiliaryJob='';$('galleryProgress').hidden=true;}
 if(wasSearch){setSearchRunning(false);$('searchStatus').textContent='Search stopped. Your current settings are unchanged.';$('searchProgress').hidden=true;}
 setBusy();
}
function setBusy(message){const active=!!renderWorker||(!!auxiliaryWorker&&auxiliaryJob!=='search');$('busy').hidden=!active;if(message)$('busyText').textContent=message;}
function scheduleRender(){stopRender();if(!source)return;status('Changes pending…');renderTimer=setTimeout(()=>{renderTimer=null;startRender();},100);updateActions();}
function preparedSource(maxSide){
 let w=s.boardsWide*16,h=s.boardsHigh*16;if(maxSide){const ratio=Math.min(1,maxSide/Math.max(w,h));w=Math.max(1,Math.round(w*ratio));h=Math.max(1,Math.round(h*ratio));}
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=s.smoothing;ctx.imageSmoothingQuality='high';
 const iw=source.naturalWidth,ih=source.naturalHeight;
 if(s.fitMode==='stretch')ctx.drawImage(source,0,0,w,h);else{const scale=s.fitMode==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);const dw=iw*scale,dh=ih*scale;ctx.drawImage(source,(w-dw)/2,(h-dh)/2,dw,dh);}
 const pixels=ctx.getImageData(0,0,w,h),gray=new Uint8ClampedArray(w*h);for(let i=0;i<w*h;i++)gray[i]=Math.round(pixels.data[i*4]*.299+pixels.data[i*4+1]*.587+pixels.data[i*4+2]*.114);
 return {w,h,gray,pixels};
}
function startRender(){
 if(!source)return;const id=++renderRevision,key=processingKey();let input;
 try{input=preparedSource();renderWorker=new Worker(workerURL);}catch(err){toast('Unable to start rendering: '+err.message);status('Rendering unavailable.');renderWorker=null;setBusy();updateActions();return;}
 updateActions();setBusy('Rendering…');status('Rendering in the background…');
 const onError=message=>{if(id!==renderRevision)return;renderWorker?.terminate();renderWorker=null;setBusy();status('Render failed. Change a setting to retry.');toast(message);updateActions();};
 renderWorker.onerror=e=>onError(e.message||'The rendering worker failed.');
 renderWorker.onmessage=({data})=>{if(id!==renderRevision)return;if(data.type==='error'){onError(data.message);return;}if(data.type!=='render')return;
   result={...data,source:input.pixels,key,sourceRevision,settings:clone(s)};renderWorker.terminate();renderWorker=null;$('emptyState').hidden=true;$('canvasHolder').hidden=false;drawPreview();
   const drawPixels=data.mask.reduce((n,v)=>n+v,0),fill=drawPixels/data.mask.length*100;$('buildEffort').textContent=`${drawPixels.toLocaleString()} draw pixels · ${s.boardsWide*s.boardsHigh} boards · native ${data.w} × ${data.h}`;$('metricFill').innerHTML=`${fill.toFixed(1)} <small>%</small>`;$('metricTime').innerHTML=`${Math.round(data.elapsed).toLocaleString()} <small>ms</small>`;
   status(`${E.PRESETS[s.preset].name} · ${data.w} × ${data.h} · ready`);setBusy();updateActions();
 };
 renderWorker.postMessage({id,type:'render',gray:input.gray,w:input.w,h:input.h,settings:clone(s)},[input.gray.buffer]);
}
$('cancelRender').onclick=()=>{stopRender();stopAuxiliary();setBusy();if(result){s=clone(result.settings);remember();sync();drawPreview();status('Cancelled. Restored the last completed render.');}else{status('Cancelled. Adjust a control to render again.');}updateActions();toast('Processing cancelled.');};
function drawPreview(){
 if(!result)return;const {mask,w,h}=result,c=$('preview');c.width=w;c.height=h;const ctx=c.getContext('2d');
 if(view==='source')ctx.putImageData(result.source,0,0);else{
  ctx.putImageData(new ImageData(E.rgba(mask,w,h,s.renderMode),w,h),0,0);
  if(view==='compare'){const cut=Math.floor(w*split/100);if(cut)ctx.putImageData(result.source,0,0,0,0,cut,h);if(cut>0&&cut<w){ctx.fillStyle='#c1c9e8';ctx.fillRect(cut,0,1,h);}}
 }
 if(grid){ctx.strokeStyle=s.renderMode==='mask'?'rgba(59,110,68,.65)':'rgba(210,216,239,.5)';ctx.lineWidth=.5;ctx.beginPath();for(let x=16;x<w;x+=16){ctx.moveTo(x+.25,0);ctx.lineTo(x+.25,h);}for(let y=16;y<h;y+=16){ctx.moveTo(0,y+.25);ctx.lineTo(w,y+.25);}ctx.stroke();}
 applyZoom();
}
function applyZoom(){
 if(!result)return;
 const stage=$('stage'),padding=innerWidth<=700?32:48;
 const fit=BlackboardViewport.scale(result.w,result.h,stage.clientWidth-padding-1,stage.clientHeight-padding-1,zoom,window.devicePixelRatio||1);
 const canvas=$('preview');canvas.style.width=fit.width+'px';canvas.style.height=fit.height+'px';canvas.style.imageRendering=fit.pixelated?'pixelated':'auto';
 $('zoom').value=String(zoom);$('zoomReadout').textContent=(fit.scale*100).toFixed(fit.scale<1?1:0)+'%';
}
new ResizeObserver(()=>applyZoom()).observe($('stage'));
$('zoom').onchange=e=>{zoom=e.target.value;$('stage').scrollTop=0;$('stage').scrollLeft=0;applyZoom();};
function nudgeZoom(delta){const values=['fit','pixels','1','2','4','8'];zoom=values[Math.max(0,Math.min(values.length-1,values.indexOf(String(zoom))+delta))];applyZoom();}
$('zoomOut').onclick=()=>nudgeZoom(-1);$('zoomIn').onclick=()=>nudgeZoom(1);
function toggleGrid(){grid=!grid;$('grid').classList.toggle('active',grid);$('grid').setAttribute('aria-pressed',grid);drawPreview();}
$('grid').onclick=toggleGrid;
document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>{view=btn.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',btn===b);b.setAttribute('aria-pressed',btn===b);});$('compareBar').hidden=view!=='compare';drawPreview();});
$('compareSplit').oninput=e=>{split=+e.target.value;drawPreview();};
function pixelPosition(e){const rect=$('preview').getBoundingClientRect();return {x:Math.floor((e.clientX-rect.left)*result.w/rect.width),y:Math.floor((e.clientY-rect.top)*result.h/rect.height)};}
$('preview').onpointermove=e=>{if(!result)return;const {x,y}=pixelPosition(e);$('coordinates').textContent=`px ${x}, ${y} · board ${Math.floor(x/16)}, ${Math.floor(y/16)}`;};
$('preview').onpointerleave=()=>$('coordinates').textContent='Click any board to inspect';
function inspectBoard(){
 if(!result)return;const columns=result.w/16,total=columns*result.h/16;boardIndex=Math.max(0,Math.min(total-1,boardIndex));const bx=boardIndex%columns,by=Math.floor(boardIndex/columns),mask=new Uint8Array(256);let count=0;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=result.mask[(by*16+y)*result.w+bx*16+x];mask[y*16+x]=v;count+=v;}
 $('boardTitle').textContent=`Board ${bx}, ${by}`;$('boardCanvas').getContext('2d').putImageData(new ImageData(E.rgba(mask,16,16,s.renderMode),16,16),0,0);$('boardInfo').textContent=`${count} / 256 draw pixels · row ${by+1}, column ${bx+1}. Coordinates start at the top-left.`;$('prevBoard').disabled=boardIndex===0;$('nextBoard').disabled=boardIndex===total-1;if(!$('boardDialog').open)$('boardDialog').showModal();
}
$('preview').onclick=e=>{if(!result)return;const {x,y}=pixelPosition(e);boardIndex=Math.floor(y/16)*(result.w/16)+Math.floor(x/16);inspectBoard();};
$('preview').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();boardIndex=0;inspectBoard();}};
$('prevBoard').onclick=()=>{boardIndex--;inspectBoard();};$('nextBoard').onclick=()=>{boardIndex++;inspectBoard();};
function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read the file.'));reader.readAsDataURL(file);});}
function decode(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{if(img.naturalWidth*img.naturalHeight>32000000)reject(Error('Image is too large. Resize it below 32 megapixels.'));else resolve(img);};img.onerror=()=>reject(Error('This image could not be decoded. Try PNG, JPEG, or WebP.'));img.src=url;});}
let loadingToken=0;
async function installSource(url,name,projectSettings,token=++loadingToken){
 let image=await decode(url);if(token!==loadingToken)return false;
 if(url.startsWith('data:image/gif;')){
  const frozen=document.createElement('canvas');frozen.width=image.naturalWidth;frozen.height=image.naturalHeight;frozen.getContext('2d').drawImage(image,0,0);url=frozen.toDataURL('image/png');image=await decode(url);if(token!==loadingToken)return false;
 }
 stopRender();stopAuxiliary();source=image;sourceURL=url;sourceName=name.slice(0,150);sourceRevision++;result=null;
 if(projectSettings)s=E.settings(projectSettings);else{s=E.settings({...s,planName:name.replace(/\.[^.]+$/,'')||'blackboard-plan'});const ratio=image.naturalWidth/image.naturalHeight;let w=Math.sqrt(40*ratio),h=Math.sqrt(40/ratio),scale=Math.min(1,200/w,200/h);s.boardsWide=Math.max(1,Math.round(w*scale));s.boardsHigh=Math.max(1,Math.round(h*scale));}
 history=[clone(s)];historyIndex=0;$('sourceName').textContent=sourceName;$('sourceMeta').textContent=`${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} · change image`;$('sourceThumb').src=url;$('sourceThumb').hidden=false;
 $('canvasHolder').hidden=true;$('emptyState').hidden=true;$('metricFill').textContent='—';$('metricTime').textContent='—';zoom='fit';sync();scheduleRender();queueDraft();return true;
}
async function loadImage(file){if(!file)return;const token=++loadingToken;try{if(file.size>25000000)throw Error('Choose an image smaller than 25 MB.');if(!/^image\/(png|jpeg|webp|gif|bmp|avif)$/i.test(file.type))throw Error('Use a PNG, JPEG, WebP, GIF, BMP, or AVIF image.');const url=await readFile(file);if(token!==loadingToken)return;await installSource(url,file.name,undefined,token);if(file.type==='image/gif')toast('Loaded the first displayed frame of the GIF.');}catch(err){toast(err.message);}finally{$('fileInput').value='';}}
$('fileInput').onchange=e=>loadImage(e.target.files[0]);$('emptyBrowse').onclick=()=>$('fileInput').click();
for(const type of ['dragenter','dragover'])$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.add('dragover');});
$('dropZone').ondragleave=()=>$('dropZone').classList.remove('dragover');$('dropZone').ondrop=e=>{e.preventDefault();$('dropZone').classList.remove('dragover');loadImage(e.dataTransfer.files[0]);};
// Prevent an accidental drop elsewhere from navigating away from unsaved work.
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});document.addEventListener('drop',e=>{if(e.target.closest('#dropZone'))return;if(e.dataTransfer.files.length){e.preventDefault();loadImage(e.dataTransfer.files[0]);}});
document.addEventListener('paste',e=>{for(const item of e.clipboardData?.items||[]){if(item.type.startsWith('image/')){e.preventDefault();loadImage(item.getAsFile());break;}}});
function demo(){
 const c=document.createElement('canvas');c.width=1000;c.height=640;const ctx=c.getContext('2d');
 const sky=ctx.createLinearGradient(0,0,0,640);sky.addColorStop(0,'#ece4c9');sky.addColorStop(1,'#9da995');ctx.fillStyle=sky;ctx.fillRect(0,0,1000,640);
 ctx.fillStyle='#fff4d7';ctx.beginPath();ctx.arc(727,166,79,0,Math.PI*2);ctx.fill();
 function mountain(points,color){ctx.beginPath();ctx.moveTo(0,640);for(const [x,y] of points)ctx.lineTo(x,y);ctx.lineTo(1000,640);ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 mountain([[0,340],[144,217],[246,320],[414,125],[607,355],[759,261],[1000,387]],'#788b80');
 mountain([[0,455],[204,327],[290,396],[523,252],[712,443],[875,346],[1000,399]],'#425d54');
 ctx.fillStyle='#dfe0c6';ctx.beginPath();ctx.moveTo(329,228);ctx.lineTo(414,125);ctx.lineTo(490,216);ctx.lineTo(446,196);ctx.lineTo(427,217);ctx.lineTo(403,192);ctx.lineTo(377,232);ctx.lineTo(371,208);ctx.closePath();ctx.fill();
 mountain([[0,514],[200,486],[422,524],[683,465],[1000,521]],'#263e35');
 for(let i=0;i<24;i++){const x=i*47-24,y=470+Math.sin(i*1.8)*36,height=60+(i*31%94);ctx.fillStyle='#172d27';ctx.fillRect(x-2,y,4,height);for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(x,y-30+n*height*.22);ctx.lineTo(x-height*.23,y+height*.36+n*height*.22);ctx.lineTo(x+height*.23,y+height*.36+n*height*.22);ctx.closePath();ctx.fill();}}
 ctx.fillStyle='#f0e9ce';ctx.font='500 16px sans-serif';ctx.fillText('THE QUIET OUTSIDE',54,58);ctx.font='12px monospace';ctx.fillText('A BLACKBOARD STUDIO SAMPLE',54,82);
 installSource(c.toDataURL('image/png'),'quiet-outside.png').then(loaded=>{if(!loaded)return;s.preset='floyd';s.boardsWide=24;s.boardsHigh=15;history=[clone(s)];historyIndex=0;sync();scheduleRender();}).catch(e=>toast(e.message));
}
$('demo').onclick=demo;$('emptyDemo').onclick=demo;
function filename(suffix){const name=(s.planName||'blackboard-plan').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^\.+/,'').slice(0,90)||'blackboard-plan';return name+suffix;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadJSON(value,name){download(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),name);}
function plan(){if(!isCurrent()){toast('Wait for the current render before exporting.');return null;}return E.plan(result.mask,result.w,result.h,s);}
$('downloadPlan').onclick=()=>{const data=plan();if(data)downloadJSON(data,filename('.json'));};
async function copyJSON(data,message){
 const text=JSON.stringify(data,null,2);
 try{if(!navigator.clipboard)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast(message);}
 catch{const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(area);area.select();let copied=false;try{copied=document.execCommand('copy');}catch{}area.remove();toast(copied?message:'Clipboard access is unavailable. Download this JSON and copy the file contents instead.');}
}
$('copyPlan').onclick=()=>{const data=plan();if(data)copyJSON(data,'Drawing plan copied. For Building Gadgets, use Copy wall template.');};
$('downloadPNG').onclick=()=>{if(!isCurrent())return;const c=document.createElement('canvas');c.width=result.w;c.height=result.h;const mode=s.exportMode==='auto'?s.renderMode:s.exportMode;c.getContext('2d').putImageData(new ImageData(E.rgba(result.mask,c.width,c.height,mode),c.width,c.height),0,0);c.toBlob(blob=>{if(blob)download(blob,filename('.png'));else toast('PNG export failed.');},'image/png');};
$('downloadWall').onclick=()=>downloadJSON(E.wall(s),filename('-wall.json'));
$('copyWall').onclick=()=>copyJSON(E.wall(s),'Wall template copied. Paste it into the Building Gadgets Template Manager.');
function saveProject(){if(!source)return;remember();downloadJSON({...projectPayload(),createdAt:new Date().toISOString()},filename('.blackboard.json'));status('Project downloaded with source image and settings.');}
$('saveProject').onclick=saveProject;$('openProject').onclick=()=>$('projectInput').click();
$('projectInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;const token=++loadingToken;try{if(file.size>50000000)throw Error('Project exceeds the 50 MB limit.');const data=JSON.parse(await file.text());if(data.kind!=='blackboard-studio-project'||data.version!==1)throw Error('Choose a Blackboard Studio project file, not a build plan.');if(typeof data.source?.dataURL!=='string'||!/^data:image\/(png|jpeg|webp|gif|bmp|avif);base64,/i.test(data.source.dataURL))throw Error('Project has an invalid source image.');if(token!==loadingToken)return;await installSource(data.source.dataURL,String(data.source.name||'project-image'),data.settings,token);toast('Project restored.');}catch(err){toast(err instanceof SyntaxError?'This file is not valid JSON.':err.message);}finally{e.target.value='';}};
function startAuxiliary(type){
 if(!source)return;stopAuxiliary();const input=preparedSource(176),snapshot=clone(s),revision=sourceRevision,key=processingKey();auxiliaryJob=type;
 try{auxiliaryWorker=new Worker(workerURL);}catch(err){toast('Could not start style previews: '+err.message);auxiliaryJob='';return;}
 if(type==='gallery'){$('galleryGrid').replaceChildren();$('galleryProgress').hidden=false;$('galleryProgress').value=0;$('galleryDialog').showModal();}else{setBusy('Comparing styles…');status('Finding a tone-based suggestion…');}
 auxiliaryWorker.onerror=e=>{stopAuxiliary();toast(e.message||'Style comparison failed.');status('Style comparison stopped.');};
 auxiliaryWorker.onmessage=({data})=>{
  if(revision!==sourceRevision||key!==processingKey()){stopAuxiliary();return;}
  if(data.type==='error'){stopAuxiliary();toast(data.message);return;}
  if(data.type==='thumbnail'){
   if(type==='gallery'){
    const button=document.createElement('button');button.className='gallery-item';button.dataset.galleryPreset=data.preset;if(data.preset===s.preset)button.classList.add('active');
    const canvas=document.createElement('canvas');canvas.width=data.w;canvas.height=data.h;canvas.getContext('2d').putImageData(new ImageData(E.rgba(data.mask,data.w,data.h,s.renderMode),data.w,data.h),0,0);
    const name=document.createElement('strong');name.textContent=E.PRESETS[data.preset].name;const desc=document.createElement('span');desc.textContent=E.PRESETS[data.preset].desc;button.append(canvas,name,desc);button.onclick=()=>{$('galleryDialog').close();choosePreset(data.preset);};$('galleryGrid').append(button);$('galleryProgress').value=data.progress;
   }else setBusy(`Comparing styles · ${Math.round(data.progress*100)}%`);
  }
  if(data.type==='progress')setBusy(`${data.stage||'Refining suggestion'} · ${Math.round(data.progress*100)}%`);
  if(data.type==='complete'){stopAuxiliary();$('galleryProgress').hidden=true;}
  if(data.type==='optimized'){
   stopAuxiliary();s=E.settings({...data.best.settings,planName:s.planName,renderMode:s.renderMode,exportMode:s.exportMode,ratioLocked:s.ratioLocked,quality:s.quality});remember();sync();scheduleRender();toast(`Suggested ${E.PRESETS[s.preset].name}. Undo to compare with your previous settings.`);
  }
 };
 auxiliaryWorker.postMessage({id:Date.now(),type,gray:input.gray,w:input.w,h:input.h,settings:snapshot},[input.gray.buffer]);
}
// Mega comparison is opt-in and never applies a candidate automatically.
let searchResult=null,selectedCandidate=-1,searchContext=null,abCurrent=null,abCandidate=null,abCachedIndex=null,abCachedPalette=null;
function setSearchRunning(running){
 for(const id of ['searchDepth','searchGoal','searchStyle','searchMix','searchFullSize','searchPixelBudget','startSearch'])$(id).disabled=running;
 $('searchMix').disabled=running||$('searchStyle').value==='current';
 $('cancelSearch').hidden=!running;$('startSearch').textContent=running?'Searching…':'Start comparison ↗';
}
function paintSearch(canvas,entry){
 if(!entry||!searchResult)return;
 const temporary=document.createElement('canvas');temporary.width=searchResult.w;temporary.height=searchResult.h;
 temporary.getContext('2d').putImageData(new ImageData(E.rgba(entry.mask,temporary.width,temporary.height,s.renderMode),temporary.width,temporary.height),0,0);
 const scale=Math.min(1,320/Math.max(temporary.width,temporary.height));canvas.width=Math.max(1,Math.round(temporary.width*scale));canvas.height=Math.max(1,Math.round(temporary.height*scale));
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(temporary,0,0,canvas.width,canvas.height);
 temporary.width=temporary.height=1;
}
function drawAB(){
 if(!searchResult||!$('megaDialog').open)return;const entry=selectedCandidate<0?searchResult.baseline:searchResult.candidates[selectedCandidate];
 const {w,h}=searchResult,canvas=$('abCanvas');if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const ctx=canvas.getContext('2d');
 if(abCachedPalette!==s.renderMode||!abCurrent){abCurrent=document.createElement('canvas');abCurrent.width=w;abCurrent.height=h;abCurrent.getContext('2d').putImageData(new ImageData(E.rgba(searchResult.baseline.mask,w,h,s.renderMode),w,h),0,0);abCachedIndex=null;abCachedPalette=s.renderMode;}
 if(abCachedIndex!==selectedCandidate||!abCandidate){abCandidate=document.createElement('canvas');abCandidate.width=w;abCandidate.height=h;abCandidate.getContext('2d').putImageData(new ImageData(E.rgba(entry.mask,w,h,s.renderMode),w,h),0,0);abCachedIndex=selectedCandidate;}
 ctx.imageSmoothingEnabled=false;ctx.drawImage(abCandidate,0,0);
 const cut=Math.floor(w*Number($('abSplit').value)/100);
 if(cut)ctx.drawImage(abCurrent,0,0,cut,h,0,0,cut,h);
 if(cut>0&&cut<w){ctx.fillStyle='#b7c5ef';ctx.fillRect(cut,0,1,h);}
 const mode=$('abZoom').value,stage=$('abStage'),fit=BlackboardViewport.scale(w,h,Math.max(1,stage.clientWidth-32),Math.max(1,stage.clientHeight-32),mode);
 canvas.style.width=fit.width+'px';canvas.style.height=fit.height+'px';canvas.style.imageRendering=mode==='fit'?'auto':'pixelated';
 $('abLabel').textContent=`Current / ${selectedCandidate<0?'Current':candidateName(entry.settings)} · ${w} × ${h}`;
}
$('abSplit').oninput=()=>requestAnimationFrame(drawAB);$('abZoom').onchange=()=>{$('abStage').scrollTop=0;$('abStage').scrollLeft=0;drawAB();};
new ResizeObserver(()=>{if(searchResult&&!$('searchAB').hidden)drawAB();}).observe($('abStage'));
function candidateName(cfg){return E.PRESETS[cfg.preset].name+(cfg.mixOn?' + '+E.PRESETS[cfg.mixPreset].name:'');}
function candidateDescription(cfg){
 const parts=[`gamma ${(cfg.gamma/100).toFixed(2)}`,`contrast ${cfg.contrast}`,`sharpness ${cfg.sharpness}`];
 if(cfg.denoise)parts.push(`denoise ${cfg.denoise}`);if(cfg.minComponent)parts.push(`islands < ${cfg.minComponent}px`);if(cfg.gapRadius)parts.push(`gaps ${cfg.gapRadius}px`);
 if(cfg.mixOn)parts.push(cfg.mixMethod==='spatial'?`${cfg.mixRatio}% B`:cfg.mixMethod);
 return parts.join(' · ');
}
function selectCandidate(index){
 selectedCandidate=index;const entry=index<0?searchResult.baseline:searchResult.candidates[index];
 paintSearch($('searchBefore'),searchResult.baseline);paintSearch($('searchAfter'),entry);$('searchPreview').hidden=false;$('searchAB').hidden=false;drawAB();
 $('candidatePreviewLabel').textContent=index<0?'CURRENT SETTINGS':candidateName(entry.settings).toUpperCase();
 document.querySelectorAll('[data-candidate]').forEach(btn=>{const chosen=+btn.dataset.candidate===index;btn.classList.toggle('active',chosen);btn.setAttribute('aria-pressed',chosen);});
 $('applySearch').disabled=index<0;
}
function showSearchResults(){
 $('searchResults').replaceChildren();
 const entries=[searchResult.baseline,...searchResult.candidates];
 entries.forEach((entry,i)=>{
  const button=document.createElement('button');button.className='search-card';button.dataset.candidate=String(i-1);button.setAttribute('aria-pressed','false');
  const canvas=document.createElement('canvas');paintSearch(canvas,entry);
  const tag=document.createElement('span');tag.className='eyebrow';tag.textContent=i===0?'YOUR CURRENT VERSION':`CANDIDATE ${String(i).padStart(2,'0')}`;
  const name=document.createElement('strong');name.textContent=i===0?'Current settings':candidateName(entry.settings);
  const score=document.createElement('span');score.className='candidate-score';const delta=(entry.score-searchResult.baseline.score)*100;score.textContent=`${(entry.score*100).toFixed(1)} / 100`+(i?` · ${delta>=0?'+':''}${delta.toFixed(1)} vs current`:' · baseline');
  const desc=document.createElement('small');desc.textContent=candidateDescription(entry.settings)+` · ${entry.effort.drawPixels.toLocaleString()} draw pixels · ${entry.effort.activeBoards} boards with ink`;
  button.append(tag,canvas,name,score,desc);button.onclick=()=>selectCandidate(i-1);$('searchResults').append(button);
 });
 const better=searchResult.candidates.findIndex(c=>c.score>searchResult.baseline.score+0.00001);selectCandidate(better);
 const elapsed=(searchResult.elapsed/1000).toFixed(1);
 $('searchStatus').textContent=`${searchResult.evaluated.toLocaleString()} candidates · ${searchResult.mixCount} mixes · ${searchResult.rechecked} rechecked · tuned ${E.PRESETS[searchResult.tunedStyle].name} · ${elapsed}s`+(searchResult.limited?' · time limit reached':'');
 if(!searchResult.candidates.length)$('searchStatus').textContent+=' · no checked alternative meets the budget or differs from current';
 else if(better<0)$('searchStatus').textContent+=' · current settings scored highest';
 $('searchNote').textContent=`Ranked for ${searchResult.goal==='outline'?'clean outlines':searchResult.goal==='clean'?'less noise':searchResult.goal==='tone'?'tonal fidelity':'balance'} at ${searchResult.w} × ${searchResult.h}${searchResult.fullResolution?' (actual wall resolution)':' (preview resolution)'}. Scores are heuristic. ${searchResult.maxDrawPixels?'Draw-pixel budget: '+searchResult.maxDrawPixels.toLocaleString()+'. ':''}Use 100% zoom in A/B to inspect details before applying.`;
}
function openSearch(){
 if(!source)return;stopAuxiliary();abCurrent=abCandidate=null;abCachedIndex=abCachedPalette=null;$('searchFullSize').checked=s.boardsWide*s.boardsHigh*256<=1500000;searchResult=null;searchContext=null;selectedCandidate=-1;$('searchResults').replaceChildren();$('searchPreview').hidden=true;$('searchAB').hidden=true;$('applySearch').disabled=true;$('searchProgress').hidden=true;$('searchStatus').textContent='Ready to explore. Your current settings stay untouched.';setSearchRunning(false);$('megaDialog').showModal();
}
function startSearch(){
 if(!source)return;stopAuxiliary();abCurrent=abCandidate=null;abCachedIndex=abCachedPalette=null;searchResult=null;selectedCandidate=-1;$('applySearch').disabled=true;$('searchResults').replaceChildren();$('searchPreview').hidden=true;$('searchAB').hidden=true;
 const fullCheck=$('searchFullSize').checked||Number($('searchPixelBudget').value)>0;const input=preparedSource(160),fine=preparedSource(fullCheck?undefined:320),snapshot=clone(s),revision=sourceRevision,key=processingKey();searchContext={revision,key};
 try{auxiliaryWorker=new Worker(workerURL);}catch(err){toast('Could not start comparison: '+err.message);return;}
 const worker=auxiliaryWorker;auxiliaryJob='search';setSearchRunning(true);$('searchProgress').hidden=false;$('searchProgress').value=0;$('searchStatus').textContent='Ranking styles before fine-tuning…';setBusy();
 worker.onerror=e=>{if(auxiliaryWorker!==worker)return;stopAuxiliary();$('searchStatus').textContent='Comparison failed. Your settings are unchanged.';toast(e.message||'Search failed.');};
 worker.onmessage=({data})=>{
  if(auxiliaryWorker!==worker)return;
  if(revision!==sourceRevision||key!==processingKey()){stopAuxiliary();return;}
  if(data.type==='error'){stopAuxiliary();$('searchStatus').textContent='Comparison failed: '+data.message;return;}
  if(data.type==='searchProgress'){$('searchProgress').value=data.progress;$('searchStatus').textContent=`${data.stage} · ${data.evaluated} / ${data.budget} candidates · ${(data.elapsed/1000).toFixed(0)}s`;}
  if(data.type==='searchComplete'){
   worker.terminate();auxiliaryWorker=null;auxiliaryJob='';setSearchRunning(false);setBusy();searchResult=data;$('searchProgress').value=1;showSearchResults();
  }
 };
 worker.postMessage({id:Date.now(),type:'search',gray:input.gray,w:input.w,h:input.h,fine:{gray:fine.gray,w:fine.w,h:fine.h},settings:snapshot,options:{budget:+$('searchDepth').value,goal:$('searchGoal').value,style:$('searchStyle').value,mixes:$('searchMix').checked,fullResolution:fullCheck,maxDrawPixels:Number($('searchPixelBudget').value)||0}},[input.gray.buffer,fine.gray.buffer]);
}
$('megaCompare').onclick=openSearch;$('startSearch').onclick=startSearch;$('cancelSearch').onclick=stopAuxiliary;
$('megaDialog').addEventListener('close',()=>{if(auxiliaryJob==='search')stopAuxiliary();});
$('applySearch').onclick=()=>{
 if(!searchResult||selectedCandidate<0)return;
 if(searchContext.revision!==sourceRevision||searchContext.key!==processingKey()){toast('Your image or settings changed. Run a new comparison.');$('applySearch').disabled=true;return;}
 const cfg=searchResult.candidates[selectedCandidate].settings;
 // Preserve presentation-only choices made while the worker was running.
 s=E.settings({...cfg,planName:s.planName,renderMode:s.renderMode,exportMode:s.exportMode,ratioLocked:s.ratioLocked,quality:s.quality});
 remember();sync();$('megaDialog').close();scheduleRender();toast('Candidate applied at full resolution. Undo returns to your previous settings.');
};
$('searchStyle').onchange=()=>setSearchRunning(false);
$('gallery').onclick=()=>startAuxiliary('gallery');$('optimize').onclick=()=>startAuxiliary('optimize');
$('galleryDialog').addEventListener('close',()=>{if(auxiliaryJob==='gallery')stopAuxiliary();});
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{
 const editing=e.target.matches('input,textarea,select,[contenteditable]');const command=e.ctrlKey||e.metaKey;
 if(command&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();return;}
 if(editing||document.querySelector('dialog[open]'))return;
 if(command&&e.key.toLowerCase()==='z'){e.preventDefault();historyMove(e.shiftKey?1:-1);}else if(command&&e.key.toLowerCase()==='y'){e.preventDefault();historyMove(1);}else if(!command&&e.key.toLowerCase()==='g')toggleGrid();else if(!command&&e.key.toLowerCase()==='f'){zoom='fit';applyZoom();}else if(e.key==='?')$('helpDialog').showModal();
});
// Recovery is off until enabled; saved drafts are offered, never silently loaded.
const draftStore=new BlackboardDraftStore();let draftTimer=null,recoveryDraft=null,draftWrites=Promise.resolve();
function projectPayload(){return {kind:'blackboard-studio-project',version:1,settings:clone(s),source:{name:sourceName,dataURL:sourceURL}};}
function queueDraft(){
 if(!$('draftEnabled').checked||!source)return;
 clearTimeout(draftTimer);draftTimer=setTimeout(()=>{draftTimer=null;saveDraftNow();},600);
}
function saveDraftNow(){
 if(!$('draftEnabled').checked||!source)return draftWrites;
 const payload=projectPayload();
 draftWrites=draftWrites.catch(()=>{}).then(()=>draftStore.save(payload)).then(()=>{$('draftStatus').textContent='Recovery draft saved on this device.';recoveryDraft=payload;$('draftRecovery').hidden=false;}).catch(error=>{$('draftStatus').textContent=error.message;});
 return draftWrites;
}
$('draftEnabled').onchange=()=>{try{localStorage.setItem('blackboard-recovery-enabled',String($('draftEnabled').checked));}catch{}if($('draftEnabled').checked){$('draftStatus').textContent='Local recovery enabled.';queueDraft();}else{clearTimeout(draftTimer);draftTimer=null;$('draftStatus').textContent='Autosave paused. Existing draft is kept until deleted.';}};
$('restoreDraft').onclick=async()=>{if(!recoveryDraft)return;try{clearTimeout(draftTimer);await draftWrites;const project=await draftStore.read();if(!project)throw Error('No recovery draft is available.');await installSource(project.source.dataURL,project.source.name,project.settings);toast('Local recovery draft restored.');}catch(error){toast(error.message);}};
$('clearDraft').onclick=async()=>{clearTimeout(draftTimer);draftTimer=null;await draftWrites;try{await draftStore.clear();recoveryDraft=null;$('draftRecovery').hidden=true;$('draftStatus').textContent='Local draft deleted.';}catch(error){toast(error.message);}};
async function initializeDraft(){
 try{try{$('draftEnabled').checked=localStorage.getItem('blackboard-recovery-enabled')==='true';}catch{}
 recoveryDraft=await draftStore.read();if(recoveryDraft){$('draftRecovery').hidden=false;$('draftStatus').textContent='A saved draft is available. Restore it when you want.';}
 }catch(error){$('draftEnabled').checked=false;$('draftEnabled').disabled=true;$('draftStatus').textContent=error.message;}
}
initializeDraft();
window.addEventListener('pagehide',()=>{if(draftTimer){clearTimeout(draftTimer);draftTimer=null;saveDraftNow();}renderWorker?.terminate();auxiliaryWorker?.terminate();URL.revokeObjectURL(workerURL);});
sync();openTab('tune');
})();
