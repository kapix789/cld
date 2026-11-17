/* Preview-only scale calculations; never change the exported bitmap. */
(function(root){
'use strict';
function scale(w,h,availableW,availableH,mode='fit',dpr=1){
 const fit=Math.max(0.001,Math.min(Math.max(1,availableW)/w,Math.max(1,availableH)/h));
 dpr=Number.isFinite(dpr)&&dpr>0?dpr:1;
 let z=fit;
 if(mode==='pixels'){
  // Whole device pixels when enlarged; reciprocal steps when reduced.
  const physical=fit*dpr;
  z=(physical>=1?Math.floor(physical):1/Math.ceil(1/physical))/dpr;
 }else if(mode!=='fit')z=Math.max(.01,Number(mode)||1);
 return {scale:z,width:w*z,height:h*z,pixelated:mode!=='fit'};
}
root.BlackboardViewport={scale};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BlackboardViewport;
})(typeof globalThis!=='undefined'?globalThis:this);
