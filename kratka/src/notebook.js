// =====================================================================
//  Zeszyt: kartka w kratkę do pisania palcem (rysikiem, myszą) albo z klawiatury
// =====================================================================
//  Każdy przedmiot ma własny zeszyt: strony z tekstem i kreskami, zapisane w przeglądarce
//  (localStorage, klucz kratka-zeszyt-<przedmiot>).
//  Klawiatura: <textarea> z przezroczystymi literami leży nad <pre>, który pokazuje ten sam tekst
//  i wynik każdej linii (calcText z calc.js). Oba mają tę samą czcionkę i wysokość linii (24 px = kratka).
//  Pióro: kreski na <canvas> nad tekstem. Jeden palec pisze, dwa przewijają; gdy w grze jest rysik,
//  palec tylko przewija, żeby dłoń oparta o ekran nie pisała.
//  Ten sam zeszyt otwiera się jako Brudnopis obok zadania (Ćwiczenia, Powtórka, Sprawdzian).
// =====================================================================
const NB_CELL=24,NB_PAD=58,NB_MAX_H=12000;   // NB_PAD: lewy odstęp tekstu (padding-left .nb-text w style.css)
const NB={subj:null,d:null,res:[],mode:'type',tool:'pen',undo:[],redo:[],txt:null,saveT:0,liveT:0,draw:null,erase:null,
  touches:new Map(),pan:false,sawPen:false,dpr:1,W:0,H:0,where:'home',at:null,opener:null};
const NB_TOOLS={pen:{c:'--pen',w:2.2},ink:{c:'--ink',w:2.2},red:{c:'--red',w:2.2},hl:{c:'--nb-hl',w:16}};
const nbKey=id=>'kratka-zeszyt-'+id;
const nbPage=()=>NB.d.pages[NB.d.page];
const nbTa=$('#nbText'),nbCv=$('#nbInk'),nbSc=$('#nbScroll');
const nbNarrow=()=>window.matchMedia('(max-width:979px)').matches;

// ---------- zapis w przeglądarce ----------
function nbLoad(S){
  let d=null;try{d=JSON.parse(store.get(nbKey(S.id),'null'))}catch(e){d=null}
  if(!d||!Array.isArray(d.pages))d={pages:[{text:calcExample(S.id),strokes:[]}],page:0,deg:true};
  d.pages=d.pages.filter(p=>p&&typeof p==='object').map(p=>({text:String(p.text||''),
    strokes:(Array.isArray(p.strokes)?p.strokes:[]).filter(s=>s&&NB_TOOLS[s.c]&&Array.isArray(s.p)&&s.p.length>=2&&s.p.every(Number.isFinite))}));
  if(!d.pages.length)d.pages=[{text:'',strokes:[]}];
  d.page=Math.min(Math.max(0,d.page|0),d.pages.length-1);d.deg=d.deg!==false;
  return d;
}
function nbSave(){
  clearTimeout(NB.saveT);NB.saveT=0;if(!NB.subj||!NB.d)return;
  let ok=true;try{localStorage.setItem(nbKey(NB.subj),JSON.stringify(NB.d))}catch(e){ok=false}
  $('#nbWarn').hidden=ok;
}
const nbSaveSoon=()=>{clearTimeout(NB.saveT);NB.saveT=setTimeout(nbSave,500)};
window.addEventListener('pagehide',()=>{nbTxtCommit();nbSave()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')nbSave()});

// ---------- otwieranie, strony, nagłówek ----------
function nbOpen(S){
  if(NB.subj===S.id){nbLayout();return}
  nbTxtCommit();if(NB.subj)nbSave();
  NB.subj=S.id;NB.d=nbLoad(S);NB.undo=[];NB.redo=[];
  nbShowPage(true);
}
function nbShowPage(top){
  nbTa.value=nbPage().text;
  nbHead();nbCalc();NB.H=0;nbLayout();nbDraw();
  if(top){nbSc.scrollTop=0;nbSc.scrollLeft=0}
}
function nbHead(){
  const k=NB.d.page,n=NB.d.pages.length;
  $('#nbPageN').innerHTML=$t(`strona <b>${k+1}</b> z ${n}`,`page <b>${k+1}</b> of ${n}`);
  $('#nbPrev').disabled=k===0;$('#nbNext').disabled=k===n-1;$('#nbDel').hidden=n===1;
  $$('#nbDeg [data-deg]').forEach(b=>{const on=(b.dataset.deg==='1')===NB.d.deg;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  nbBtns();
}
function nbBtns(){
  const pg=NB.d.page;
  $('#nbUndo').disabled=!(NB.txt&&NB.txt.page===pg)&&!NB.undo.some(x=>x.page===pg);
  $('#nbRedo').disabled=!NB.redo.some(x=>x.page===pg);
}
function nbGo(k){nbTxtCommit();NB.d.page=k;nbShowPage(true);nbSaveSoon()}
$('#nbPrev').onclick=()=>{if(NB.d.page>0)nbGo(NB.d.page-1)};
$('#nbNext').onclick=()=>{if(NB.d.page<NB.d.pages.length-1)nbGo(NB.d.page+1)};
$('#nbAdd').onclick=()=>{
  nbTxtCommit();const k=NB.d.page;
  NB.d.pages.splice(k+1,0,{text:'',strokes:[]});
  [...NB.undo,...NB.redo].forEach(x=>{if(x.page>k)x.page++});
  nbGo(k+1);nbSave();
  if(NB.mode==='type')nbTa.focus({preventScroll:true});
};
function nbAsk(msg,yes,fn){
  const m=$('#nbMsg');
  show(m,'bad',`${msg}<div class="actions"><button type="button" class="btn small danger" data-ask="1">${yes}</button><button type="button" class="btn ghost small" data-ask="0">${$t('Anuluj','Cancel')}</button></div>`);
  m.onclick=e=>{const b=e.target.closest('[data-ask]');if(!b)return;m.className='msg';m.onclick=null;if(b.dataset.ask==='1')fn()};
  m.querySelector('[data-ask="0"]').focus({preventScroll:true});
}
$('#nbClear').onclick=()=>{
  const P=nbPage();if(!P.text&&!P.strokes.length)return;
  nbAsk($t('Wyczyścić tę stronę? Tekst i rysunki znikną, ale przycisk Cofnij je przywróci.','Clear this page? The text and the drawings go away, but Undo brings them back.'),$t('Wyczyść','Clear'),()=>{
    nbTxtCommit();const P=nbPage();nbHist({page:NB.d.page,op:'clear',strokes:P.strokes.slice(),text:P.text});
    P.strokes=[];P.text='';nbShowPage(false);nbSave();
  });
};
$('#nbDel').onclick=()=>nbAsk($t('Usunąć tę stronę razem z rysunkami? Tego nie da się cofnąć.','Delete this page with its drawings? This cannot be undone.'),$t('Usuń stronę','Delete the page'),()=>{
  nbTxtCommit();const k=NB.d.page;NB.d.pages.splice(k,1);
  const fix=a=>a.filter(x=>x.page!==k).map(x=>{if(x.page>k)x.page--;return x});
  NB.undo=fix(NB.undo);NB.redo=fix(NB.redo);
  NB.d.page=Math.min(k,NB.d.pages.length-1);nbShowPage(true);nbSave();
});

// ---------- tekst i wyniki ----------
function nbCalc(){
  const t=nbPage().text,res=calcText(t,{deg:NB.d.deg});NB.res=res;
  $('#nbMirror').innerHTML=t.split('\n').map((l,i)=>{
    const c=l.search(/(^|\s)(#|\/\/)/),r=res[i];
    const txt=c<0?escH(l):escH(l.slice(0,c))+`<span class="nb-c">${escH(l.slice(c))}</span>`;
    return txt+(r?`<span class="nb-r${r.cls?' '+r.cls:''}">${r.html}</span>`:'');
  }).join('\n')+'\n';
}
// zmiany tekstu trafiają do historii paczkami: to, co wpisane bez dłuższej przerwy, cofa się naraz
function nbTxtCommit(){
  const T=NB.txt;if(!T)return;clearTimeout(T.t);NB.txt=null;
  const P=NB.d&&NB.d.pages[T.page];if(P&&P.text!==T.a)nbHist({page:T.page,op:'text',a:T.a,b:P.text});
  if(NB.d)nbBtns();
}
nbTa.addEventListener('input',()=>{
  const P=nbPage(),pg=NB.d.page;
  if(!NB.txt){NB.txt={page:pg,a:P.text,t:0};NB.redo=NB.redo.filter(x=>x.page!==pg)}
  P.text=nbTa.value;clearTimeout(NB.txt.t);NB.txt.t=setTimeout(nbTxtCommit,1000);
  nbCalc();nbLayout();nbBtns();nbSaveSoon();
  // przeglądarka sama przewija kartkę za kursorem; po powrocie do krótkiej linii wracamy do marginesu
  const v=nbTa.value.slice(0,nbTa.selectionEnd),col=v.length-v.lastIndexOf('\n')-1;
  if(nbSc.scrollLeft&&NB_PAD+col*nbCw()+NB_CELL<nbSc.clientWidth)nbSc.scrollLeft=0;
  clearTimeout(NB.liveT);NB.liveT=setTimeout(nbAnnounce,700);
});
// szerokość znaku czcionki kartki (stała, bo czcionka jest o stałej szerokości)
function nbCw(){
  if(!NB.cw){const m=document.createElement('span');m.textContent='0'.repeat(20);$('#nbMirror').appendChild(m);NB.cw=m.getBoundingClientRect().width/20||9.6;m.remove()}
  return NB.cw;
}
// czytnik ekranu: wynik linii, w której stoi kursor
function nbAnnounce(){
  if(document.activeElement!==nbTa)return;
  const r=NB.res[nbTa.value.slice(0,nbTa.selectionStart).split('\n').length-1];
  $('#nbLive').textContent=r?plain(r.html):'';
}
// pole tekstowe jest tak duże jak kartka, więc samo nie przewija; przewija się kartka
nbTa.addEventListener('scroll',()=>{if(nbTa.scrollTop||nbTa.scrollLeft){nbTa.scrollTop=0;nbTa.scrollLeft=0}});
nbTa.addEventListener('beforeinput',e=>{if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();nbUndo(e.inputType==='historyRedo')}});
// rząd klawiszy z symbolami, których nie ma na klawiaturze telefonu; nie zabiera kursora z kartki
['pointerdown','mousedown'].forEach(ev=>$('#nbKeys').addEventListener(ev,e=>{if(e.target.closest('[data-k]'))e.preventDefault()}));
$('#nbKeys').addEventListener('click',e=>{
  const b=e.target.closest('[data-k]');if(!b)return;
  const k=b.dataset.k;
  if(document.activeElement!==nbTa)nbTa.focus({preventScroll:true});
  let done=false;try{done=document.execCommand('insertText',false,k)}catch(_){done=false}
  if(!done){nbTa.setRangeText(k,nbTa.selectionStart,nbTa.selectionEnd,'end');nbTa.dispatchEvent(new Event('input'))}
  if(/\(\)$|\[\]$/.test(k)){const p=nbTa.selectionEnd-1;nbTa.setSelectionRange(p,p)}
});

// ---------- wymiary kartki ----------
function nbBox(s){
  if(!s.bb){let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;for(let i=0;i<s.p.length;i+=2){x1=Math.min(x1,s.p[i]);x2=Math.max(x2,s.p[i]);y1=Math.min(y1,s.p[i+1]);y2=Math.max(y2,s.p[i+1])}
    Object.defineProperty(s,'bb',{value:[x1,y1,x2,y2],enumerable:false,writable:true,configurable:true})}
  return s.bb;
}
function nbLayout(){
  if(!NB.d||!nbSc.clientWidth)return;
  const P=nbPage(),lines=P.text.split('\n').length;
  let mx=0,my=0;for(const s of P.strokes){const b=nbBox(s);if(b[2]>mx)mx=b[2];if(b[3]>my)my=b[3]}
  const up=v=>Math.ceil(v/NB_CELL)*NB_CELL;
  const W=up(Math.max(nbSc.clientWidth,$('#nbMirror').offsetWidth+NB_CELL*6,mx+NB_CELL*2));
  // piórem trzeba mieć dokąd przewinąć, więc kartka jest trochę wyższa niż okno
  const H=Math.min(NB_MAX_H,up(Math.max(nbSc.clientHeight+(NB.mode==='pen'?NB_CELL*6:0),(lines+7)*NB_CELL,my+NB_CELL*8,NB.H||0)));
  if(W!==NB.W||H!==NB.H){
    NB.W=W;NB.H=H;
    $('#nbPage').style.width=W+'px';$('#nbPage').style.height=H+'px';nbTa.style.width=W+'px';nbTa.style.height=H+'px';
    let dpr=Math.min(2,window.devicePixelRatio||1);if(W*H*dpr*dpr>16e6)dpr=Math.max(1,Math.sqrt(16e6/(W*H)));NB.dpr=dpr;
    nbCv.width=Math.round(W*dpr);nbCv.height=Math.round(H*dpr);nbCv.style.width=W+'px';nbCv.style.height=H+'px';
    nbDraw();
  }
  if(nbTa.scrollTop||nbTa.scrollLeft){nbTa.scrollTop=0;nbTa.scrollLeft=0}
}
let nbRT=0;
window.addEventListener('resize',()=>{clearTimeout(nbRT);nbRT=setTimeout(()=>{if(NB.d&&$('#nb').offsetParent){NB.H=0;nbLayout()}nbVV()},120)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{NB.cw=0;if(NB.d)nbLayout()});
// w trybie pióra kartka rośnie, gdy przewijasz do jej końca
nbSc.addEventListener('scroll',()=>{
  if(NB.mode==='pen'&&NB.d&&NB.H<NB_MAX_H&&nbSc.scrollTop+nbSc.clientHeight>NB.H-NB_CELL*3){NB.H+=NB_CELL*12;nbLayout()}
},{passive:true});

// ---------- rysowanie ----------
const nbCss=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim()||'#2343b5';
function nbStroke(ctx,s,col){
  const p=s.p,w=s.w||NB_TOOLS[s.c].w;
  ctx.strokeStyle=ctx.fillStyle=col[s.c];ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';
  if(p.length<=2){ctx.beginPath();ctx.arc(p[0],p[1],w/2,0,7);ctx.fill();return}
  ctx.beginPath();ctx.moveTo(p[0],p[1]);
  // gładka linia: łuki przez środki kolejnych odcinków
  for(let i=2;i<p.length-2;i+=2)ctx.quadraticCurveTo(p[i],p[i+1],(p[i]+p[i+2])/2,(p[i+1]+p[i+3])/2);
  ctx.lineTo(p[p.length-2],p[p.length-1]);ctx.stroke();
}
function nbDraw(){
  const ctx=nbCv.getContext('2d');if(!ctx||!NB.d)return;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,nbCv.width,nbCv.height);ctx.setTransform(NB.dpr,0,0,NB.dpr,0,0);
  const col={};for(const k in NB_TOOLS)col[k]=nbCss(NB_TOOLS[k].c);
  const st=nbPage().strokes;
  // zakreślacz pod tuszem
  for(const s of st)if(s.c==='hl')nbStroke(ctx,s,col);
  if(NB.draw&&NB.draw.s.c==='hl')nbStroke(ctx,NB.draw.s,col);
  for(const s of st)if(s.c!=='hl')nbStroke(ctx,s,col);
  if(NB.draw&&NB.draw.s.c!=='hl')nbStroke(ctx,NB.draw.s,col);
}
if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(NB.d)nbDraw()});
function nbPt(e){const r=nbCv.getBoundingClientRect();return [Math.round((e.clientX-r.left)*10)/10,Math.round((e.clientY-r.top)*10)/10]}
// mniej punktów w zapisie (Ramer–Douglas–Peucker), kształt zostaje
function nbSimplify(p,eps){
  const n=p.length/2;if(n<3)return p;
  const keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const st=[[0,n-1]];
  while(st.length){
    const [a,b]=st.pop(),ax=p[2*a],ay=p[2*a+1],dx=p[2*b]-ax,dy=p[2*b+1]-ay,L=Math.hypot(dx,dy);let md=0,mi=-1;
    for(let i=a+1;i<b;i++){const x=p[2*i]-ax,y=p[2*i+1]-ay,d=L<1e-6?Math.hypot(x,y):Math.abs(dx*y-dy*x)/L;if(d>md){md=d;mi=i}}
    if(md>eps){keep[mi]=1;st.push([a,mi],[mi,b])}
  }
  const out=[];for(let i=0;i<n;i++)if(keep[i])out.push(p[2*i],p[2*i+1]);return out;
}
function nbHist(op){NB.undo.push(op);if(NB.undo.length>400)NB.undo.shift();NB.redo=NB.redo.filter(x=>x.page!==op.page);nbBtns()}
function nbEraseAt(x,y){
  const st=nbPage().strokes,R=10;let hit=false;
  for(let i=st.length-1;i>=0;i--){
    const s=st[i],b=nbBox(s),w=(s.w||NB_TOOLS[s.c].w)/2+R;
    if(x<b[0]-w||x>b[2]+w||y<b[1]-w||y>b[3]+w)continue;
    for(let k=0;k<s.p.length;k+=2)if(Math.hypot(s.p[k]-x,s.p[k+1]-y)<=w){NB.erase.del.push({i,s});st.splice(i,1);hit=true;break}
  }
  if(hit)nbDraw();
}
function nbEraseEnd(){
  const E=NB.erase;NB.erase=null;if(!E||!E.del.length)return;
  nbHist({page:NB.d.page,op:'del',items:E.del});nbSaveSoon();
}
nbCv.addEventListener('pointerdown',e=>{
  if(NB.mode!=='pen'||!NB.d)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.pointerType==='pen')NB.sawPen=true;
  if(e.pointerType==='touch'){
    NB.touches.set(e.pointerId,[e.clientX,e.clientY]);
    // dwa palce przewijają; przy rysiku palec zawsze tylko przewija
    if(NB.sawPen||NB.touches.size>=2){
      if(NB.draw&&NB.draw.touch){NB.draw=null;nbDraw()}
      if(NB.erase&&NB.erase.touch)nbEraseEnd();
      NB.pan=true;e.preventDefault();return;
    }
  }
  e.preventDefault();
  try{nbCv.setPointerCapture(e.pointerId)}catch(_){}
  const [x,y]=nbPt(e);
  if(NB.tool==='erase'||e.pointerType==='pen'&&(e.button===5||(e.buttons&32))){NB.erase={id:e.pointerId,touch:e.pointerType==='touch',del:[]};nbEraseAt(x,y);return}
  NB.draw={id:e.pointerId,touch:e.pointerType==='touch',s:{c:NB.tool,p:[x,y]}};
  nbDraw();
});
nbCv.addEventListener('pointermove',e=>{
  if(NB.mode!=='pen'||!NB.d)return;
  if(e.pointerType==='touch'){
    const q=NB.touches.get(e.pointerId);
    if(q&&NB.pan){const n=NB.touches.size;nbSc.scrollLeft-=(e.clientX-q[0])/n;nbSc.scrollTop-=(e.clientY-q[1])/n;NB.touches.set(e.pointerId,[e.clientX,e.clientY]);e.preventDefault();return}
    if(q)NB.touches.set(e.pointerId,[e.clientX,e.clientY]);
  }
  let evs=e.getCoalescedEvents?e.getCoalescedEvents():[];if(!evs.length)evs=[e];
  if(NB.erase&&NB.erase.id===e.pointerId){for(const ev of evs){const [x,y]=nbPt(ev);nbEraseAt(x,y)}return}
  const D=NB.draw;if(!D||D.id!==e.pointerId)return;
  const p=D.s.p,ctx=nbCv.getContext('2d'),t=NB_TOOLS[D.s.c];let moved=false;
  ctx.setTransform(NB.dpr,0,0,NB.dpr,0,0);ctx.strokeStyle=nbCss(t.c);ctx.lineWidth=t.w;ctx.lineCap='round';ctx.lineJoin='round';
  for(const ev of evs){
    const [x,y]=nbPt(ev),lx=p[p.length-2],ly=p[p.length-1];if(Math.hypot(x-lx,y-ly)<0.8)continue;
    p.push(x,y);moved=true;
    // tusz rysujemy od razu kawałkami; półprzezroczysty zakreślacz trzeba rysować w całości
    if(D.s.c!=='hl'){ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);ctx.stroke()}
  }
  if(moved&&D.s.c==='hl'&&!D.raf)D.raf=requestAnimationFrame(()=>{D.raf=0;if(NB.draw===D)nbDraw()});
});
function nbUp(e){
  if(e.pointerType==='touch'){NB.touches.delete(e.pointerId);if(!NB.touches.size)NB.pan=false}
  if(NB.erase&&NB.erase.id===e.pointerId){nbEraseEnd();return}
  const D=NB.draw;if(!D||D.id!==e.pointerId)return;
  NB.draw=null;const s=D.s;
  if(e.type==='pointercancel'&&s.p.length<8){nbDraw();return}
  s.p=nbSimplify(s.p,0.35);
  nbPage().strokes.push(s);nbHist({page:NB.d.page,op:'add',s});
  if(nbBox(s)[3]>NB.H-NB_CELL*6)NB.H+=NB_CELL*12;
  nbLayout();nbDraw();nbSaveSoon();
}
nbCv.addEventListener('pointerup',nbUp);nbCv.addEventListener('pointercancel',nbUp);
nbCv.addEventListener('lostpointercapture',e=>{if(NB.draw&&NB.draw.id===e.pointerId)nbUp(e)});

// ---------- cofnij i ponów (osobno dla każdej strony) ----------
function nbApply(op,back){
  const P=NB.d.pages[op.page];if(!P)return;const st=P.strokes;
  if(op.op==='add'){if(back){const k=st.lastIndexOf(op.s);if(k>=0)st.splice(k,1)}else st.push(op.s)}
  else if(op.op==='del'){if(back)op.items.slice().reverse().forEach(x=>st.splice(Math.min(x.i,st.length),0,x.s));else op.items.forEach(x=>{const k=st.indexOf(x.s);if(k>=0)st.splice(k,1)})}
  else if(op.op==='text')P.text=back?op.a:op.b;
  else if(op.op==='clear'){if(back){P.strokes=op.strokes.slice();P.text=op.text}else{P.strokes=[];P.text=''}}
}
// miejsce kursora po cofnięciu: koniec zmienionego fragmentu
const nbChangeEnd=(a,b)=>{let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;let j=0;while(j<a.length-i&&j<b.length-i&&a[a.length-1-j]===b[b.length-1-j])j++;return b.length-j};
function nbUndo(redo){
  if(!NB.d)return;nbTxtCommit();
  const pg=NB.d.page,from=redo?NB.redo:NB.undo,to=redo?NB.undo:NB.redo;
  let k=from.length-1;while(k>=0&&from[k].page!==pg)k--;
  if(k<0)return;
  const op=from.splice(k,1)[0];nbApply(op,!redo);to.push(op);
  const P=nbPage();
  if(nbTa.value!==P.text){const c=nbChangeEnd(nbTa.value,P.text);nbTa.value=P.text;if(document.activeElement===nbTa)nbTa.setSelectionRange(c,c)}
  NB.H=0;nbCalc();nbLayout();nbDraw();nbBtns();nbSaveSoon();
}
$('#nbUndo').onclick=()=>nbUndo(false);$('#nbRedo').onclick=()=>nbUndo(true);
document.addEventListener('keydown',e=>{
  if(!NB.d||!(e.ctrlKey||e.metaKey)||e.altKey||e.defaultPrevented)return;
  const k=(e.key||'').toLowerCase();if(k!=='z'&&k!=='y')return;
  const t=e.target;
  if(t!==nbTa&&t.closest&&t.closest('input,textarea,select,[contenteditable]'))return;   // inne pola cofają po swojemu
  if(!$('#nb').offsetParent)return;
  e.preventDefault();nbUndo(k==='y'||e.shiftKey);
});

// ---------- tryb, przybory, kąty ----------
function nbMode(m,user){
  m=m==='pen'?'pen':'type';NB.mode=m;
  $('#nb').classList.toggle('nb-pen',m==='pen');
  $$('#nbMode [data-nbm]').forEach(b=>{const on=b.dataset.nbm===m;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  nbTa.tabIndex=m==='pen'?-1:0;
  if(m==='pen'){nbTxtCommit();if(document.activeElement===nbTa)nbTa.blur()}
  if(NB.d)nbLayout();
  if(user){store.set('kratka-zeszyt-tryb',m);if(m==='type')nbTa.focus({preventScroll:true})}
}
$('#nbMode').addEventListener('click',e=>{const b=e.target.closest('[data-nbm]');if(b)nbMode(b.dataset.nbm,true)});
$('#nbTools').addEventListener('click',e=>{
  const b=e.target.closest('[data-tool]');if(!b)return;
  NB.tool=b.dataset.tool;$('#nb').dataset.tool=NB.tool;
  $$('#nbTools [data-tool]').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
});
$('#nbDeg').addEventListener('click',e=>{const b=e.target.closest('[data-deg]');if(!b||!NB.d)return;NB.d.deg=b.dataset.deg==='1';nbHead();nbCalc();nbLayout();nbSaveSoon()});

// ---------- Brudnopis: ten sam zeszyt obok zadania ----------
function nbDrawerOpen(task,opener){
  const S=subjById(R.subj);nbOpen(S);
  NB.opener=opener||null;
  $('#nbdTask').hidden=!task;
  if(task){$('#nbdTaskBody').innerHTML=`<div class="task-q">${task.q}</div>${task.body||''}`;$('#nbdTask').open=true}
  $('#nbdHost').appendChild($('#nb'));NB.where='drawer';
  $('#nbd').hidden=false;document.documentElement.classList.add('nbd-open');
  $$('[data-pad]').forEach(b=>{b.classList.add('on');b.setAttribute('aria-pressed','true')});
  if(nbNarrow())document.body.style.overflow='hidden';
  // pisze się od nowej linii pod tym, co już jest na stronie
  const P=nbPage();if(P.text&&!P.text.endsWith('\n')){P.text+='\n';nbTa.value=P.text;nbCalc();nbSaveSoon()}
  nbVV();NB.H=0;nbLayout();
  const end=nbTa.value.length;nbTa.setSelectionRange(end,end);
  nbSc.scrollTop=Math.max(0,(nbTa.value.split('\n').length+3)*NB_CELL-nbSc.clientHeight);
  if(!nbNarrow()&&NB.mode==='type')nbTa.focus({preventScroll:true});else $('#nbdClose').focus({preventScroll:true});
}
function nbDrawerClose(){
  if($('#nbd').hidden)return;
  nbTxtCommit();nbSave();
  $('#nbd').hidden=true;document.documentElement.classList.remove('nbd-open');document.body.style.overflow='';
  $('#nbHome').appendChild($('#nb'));NB.where='home';nbVV();
  $$('[data-pad]').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false')});
  if(NB.opener&&document.contains(NB.opener)&&NB.opener.offsetParent)NB.opener.focus({preventScroll:true});
  NB.opener=null;
}
$('#nbdClose').onclick=nbDrawerClose;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!$('#nbd').hidden&&$('#pl').hidden&&$('#bs').hidden){nbDrawerClose();e.preventDefault()}});
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-pad]');if(!b)return;
  if(!$('#nbd').hidden){nbDrawerClose();return}
  const id=b.dataset.pad,q=document.getElementById(id+'Q'),body=document.getElementById(id+'Body');
  nbDrawerOpen(q?{q:q.innerHTML,body:body?body.innerHTML:''}:null,b);
});
// telefon z otwartą klawiaturą: panel ma wysokość widocznej części ekranu
function nbVV(){
  const d=$('#nbd'),v=window.visualViewport;
  if(d.hidden||!v||!nbNarrow()){d.style.top=d.style.height=d.style.bottom='';d.classList.remove('nbd-kb');return}
  d.style.top=v.offsetTop+'px';d.style.height=v.height+'px';d.style.bottom='auto';
  d.classList.toggle('nbd-kb',v.height<window.innerHeight*0.75);
}
if(window.visualViewport){visualViewport.addEventListener('resize',nbVV);visualViewport.addEventListener('scroll',nbVV)}

// ---------- podpięcie do szkieletu ----------
HOOKS.start.push(()=>nbMode(store.get('kratka-zeszyt-tryb')==='pen'?'pen':'type',false));
HOOKS.view.push((S,view)=>{
  const at=S.id+'-'+view;
  if(NB.at&&NB.at!==at)nbDrawerClose();
  NB.at=at;
  $('#nbEyebrow').innerHTML=sName(S);
  $$('#nb [aria-label]').forEach(b=>{b.title=b.getAttribute('aria-label')});
  if(view==='zeszyt'){nbOpen(S);requestAnimationFrame(()=>{NB.H=0;nbLayout()})}
});
HOOKS.lang.push(()=>{if(NB.d){nbHead();nbCalc();nbLayout()}});
