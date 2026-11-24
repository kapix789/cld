// ================= UI =================
const $=s=>document.querySelector(s);
const show=(el,cls,html)=>{el.className='msg '+cls;el.innerHTML=html};
const INP='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"';
const grid=(r,c)=>`<span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},()=>`<input ${INP}>`).join('')}</span>`;
function checkGrid(sel,ans){
  const ins=[...document.querySelectorAll(sel+' input')],exp=ans.flat();let good=0,empty=0;
  ins.forEach((el,k)=>{const v=parseFr(el.value);if(!el.value.trim())empty++;const ok=v&&v.eq(exp[k]);el.classList.toggle('ok',!!ok);el.classList.toggle('bad',!ok);if(ok)good++});
  return {good,empty,total:exp.length};
}

// zakładki
const TABS=['liczby','rownania','uklady','cwiczenia','sprawdzian','blad','postep','sciaga'];
function setTab(t){
  if(t==='dzialania')t='cwiczenia';
  if(!TABS.includes(t))t='liczby';
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===t));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);
  window.scrollTo(0,0);
}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.t)});
window.addEventListener('hashchange',()=>setTab(location.hash.slice(1)));

// ---- X na liczbach ----
let nSize=2,nShape='sq',nTask=null,nScore={ok:0,all:0},nCounted=false;
const eqLabel=t=>{const a=parseEq(t.eq);return (rExpr(a.L)+' = '+rExpr(a.R)).replace(/<sup>T<\/sup>/g,'ᵀ').replace(/<sup>−1<\/sup>/g,'⁻¹').replace(/<[^>]+>/g,'')};
$('#ntSel').innerHTML='<option value="-1">Losowy typ równania (wzorem)</option><optgroup label="Wzorem — X na literach, potem liczby">'+NT.map((t,k)=>t.lin?'':`<option value="${k}">${eqLabel(t)}</option>`).join('')+'</optgroup><optgroup label="Przez niewiadome — układ równań">'+NT.map((t,k)=>t.lin?`<option value="${k}">${eqLabel(t)}  (${Object.entries(t.lin).map(([c,d])=>c+' '+d.join('×')).join(', ')})</option>`:'').join('')+'</optgroup>';
function newNum(){
  document.querySelectorAll('[data-n]').forEach(b=>b.classList.toggle('on',+b.dataset.n===nSize));
  document.querySelectorAll('[data-shape]').forEach(b=>b.classList.toggle('on',b.dataset.shape===nShape));
  const idx=+$('#ntSel').value,tpl=idx>=0?NT[idx]:null;
  if(tpl&&tpl.lin){
    nTask=genLin(tpl);
    $('#ntNote').innerHTML=`Tego równania nie rozwiążesz wzorem (${tpl.note}). Liczysz przez niewiadome: <i>X</i> = [<i>x y</i>; <i>z t</i>] → układ równań. Rozmiar i kształt nie mają tu znaczenia.`;
  }else{
    const T=genNum(nSize,idx,nShape==='rect');
    nTask={fr:()=>numFrames(T),orig:T.sol.orig,letters:[...T.sol.letters].sort(),env:T.env,X:T.X,solHtml:numSolHtml(T),
      hint:`Najpierw na literach: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Potem policz odwrotność metodą Gaussa i wymnóż.`};
    $('#ntNote').innerHTML=nShape==='rect'?`Prostokątna <i>X</i>: wymiar wynika z działań. Odwracasz tylko macierze kwadratowe — te, które stoją przy <i>X</i>.`:'';
  }
  nCounted=false;nTask.tid=tpl&&tpl.lin?'xlin':nShape==='rect'?'xrect':'xnum'+nSize;
  $('#nEq').innerHTML=nTask.orig;
  $('#nGiven').innerHTML=nTask.letters.map(c=>`<span class="gv"><i>${c}</i> = ${M.html(nTask.env[c])}</span>`).join('');
  $('#nAns').innerHTML=`<span class="gv"><span><i>X</i> =</span> ${grid(nTask.X.length,nTask.X[0].length)}</span>`;
  $('#nMsg').className='msg';$('#nSolBox').className='sol';$('#nSolBox').innerHTML=nTask.solHtml;
}
document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{nSize=+b.dataset.n;newNum()});
document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{nShape=b.dataset.shape;newNum()});
$('#ntSel').onchange=newNum;$('#nNew').onclick=newNum;
$('#nHint').onclick=()=>show($('#nMsg'),'info',nTask.hint);
$('#nSol').onclick=()=>$('#nSolBox').classList.toggle('on');
$('#nCheck').onclick=()=>{
  const r=checkGrid('#nAns',nTask.X);
  if(!nCounted&&!r.empty){nScore.all++;if(r.good===r.total)nScore.ok++;nCounted=true;rec(nTask.tid,r.good/r.total)}
  $('#nScore').textContent=nScore.all?`wynik: ${nScore.ok}/${nScore.all}`:'';
  if(r.good===r.total)show($('#nMsg'),'ok','✓ Dobrze! To jest szukana macierz <i>X</i>.');
  else if(r.empty)show($('#nMsg'),'bad',`Uzupełnij wszystkie pola (${r.empty} pustych).`);
  else show($('#nMsg'),'bad',`✗ Dobrze: ${r.good} z ${r.total}. Sprawdź wzór (Podpowiedź) albo rachunki.`);
};

// ---- X na literach ----
let sol=null,shown=0,lastInput=$('#eqIn');
['#eqIn','#ansIn'].forEach(s=>$(s).addEventListener('focus',e=>lastInput=e.target));
$('#keys').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const el=lastInput,ins=b.dataset.i;
  if(ins==='CLR'){el.value='';return}
  let s=el.selectionStart??el.value.length,en=el.selectionEnd??s,v=el.value;
  if(ins==='⌫'){
    if(s!==en)v=v.slice(0,s)+v.slice(en);
    else{const before=v.slice(0,s);const m=before.match(/(\^-1|\^T|\^\d)$/);const k=m?m[0].length:1;v=before.slice(0,Math.max(0,s-k))+v.slice(s);s=Math.max(0,s-k)}
    el.value=v;el.setSelectionRange(s,s);return;
  }
  el.value=v.slice(0,s)+ins+v.slice(en);const p=s+ins.length;el.setSelectionRange(p,p);
});
function runSolve(){
  const err=$('#eqErr');err.className='msg';
  const src=$('#eqIn').value;let linMsg='';
  try{sol=solve(src)}catch(e){
    sol=null;
    if(!e.lin){show(err,'bad',e.message);$('#eqWork').style.display='none';return}
    try{const a=parseEq(src);linCheck(a.L);linCheck(a.R)}catch(e2){show(err,'bad',e.message+' '+e2.message);$('#eqWork').style.display='none';return}
    linMsg=e.message;
  }
  curSrc=src;const ast=parseEq(src);
  $('#eqWork').style.display='block';
  $('#eqTry').hidden=$('#ansCard').hidden=$('#stepsCard').hidden=!sol;
  buildMx(lettersOf(ast.L,lettersOf(ast.R)));$('#numOut').innerHTML='';$('#numMsg').className='msg';
  if(!sol){
    $('#eqShow').innerHTML=rExpr(ast.L)+' = '+rExpr(ast.R);
    show(err,'info',`${linMsg} Wzorem na literach się nie da. Takie równanie rozwiązuje się <b>na liczbach, przez niewiadome</b> — wpisz macierze w karcie „Policz na liczbach” niżej (na start są przykładowe).`);
    computeNum();return;
  }
  $('#eqShow').innerHTML=sol.orig;
  $('#steps').innerHTML=sol.steps.map((s,k)=>`<div class="step${s.final?' final':''}"><b class="t">${s.final?'✓ ':(k+1)+'. '}${s.title}</b>${s.why?`<div class="why">${s.why}</div>`:''}${s.lines.map(l=>`<div class="eq">${l}</div>`).join('')}</div>`).join('');
  shown=0;symCounted=false;$('#nextStep').style.display='';$('#allSteps').style.display='';
  $('#ansIn').value='';$('#ansMsg').className='msg';
}
function reveal(all){
  const st=[...document.querySelectorAll('#steps .step')];
  shown=all?st.length:Math.min(shown+1,st.length);
  st.forEach((s,k)=>s.classList.toggle('on',k<shown));
  if(shown>=st.length){$('#nextStep').style.display='none';$('#allSteps').style.display='none'}
}
$('#solveBtn').onclick=runSolve;
$('#eqIn').addEventListener('keydown',e=>{if(e.key==='Enter')runSolve()});
document.querySelectorAll('[data-lvl]').forEach(b=>b.onclick=()=>{$('#eqIn').value=genEq(+b.dataset.lvl);runSolve()});
$('#nextStep').onclick=()=>reveal(false);
$('#allSteps').onclick=()=>reveal(true);
let symCounted=false;
function checkAns(){
  const msg=$('#ansMsg');if(!sol)return;
  try{
    const ok=checkAnswer(sol,$('#ansIn').value);
    if(!symCounted){symCounted=true;rec('xsym',ok?1:0)}
    if(ok)show(msg,'ok','✓ Dobrze! Twój wzór daje to samo <i>X</i> co rozwiązanie.');
    else show(msg,'bad','✗ Niestety nie. Sprawdź: czy mnożysz z <b>właściwej strony</b>, czy w (<i>AB</i>)<sup>−1</sup> odwróciłeś <b>kolejność</b> i czy przy wyciąganiu <i>X</i> jest <i>I</i>? Możesz odsłonić pierwszy krok.');
  }catch(e){show(msg,'bad',e.message)}
}
$('#ansBtn').onclick=checkAns;
$('#ansIn').addEventListener('keydown',e=>{if(e.key==='Enter')checkAns()});
$('#openEx').onclick=()=>{$('#eqIn').value='A^TB^-1XCA=(AD)^-1D';setTab('rownania');runSolve()};

// ---- własne macierze (X na literach → liczby) ----
const mxVals={};let curSrc='',curLetters=[],lastNum=null;
const mxStr=A=>A.map(r=>r.map(x=>x.str().replace('−','-')).join(' ')).join('\n');
function buildMx(set){
  curLetters=[...set].sort();
  curLetters.forEach(c=>{if(!(c in mxVals))mxVals[c]=mxStr(unimod2())});
  $('#mxIns').innerHTML=curLetters.length?curLetters.map(c=>`<label class="mx" for="mx-${c}"><span><i>${c}</i> =</span><textarea id="mx-${c}" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false">${mxVals[c]}</textarea></label>`).join(''):'<p class="mute">W równaniu są tylko <i>X</i> i <i>I</i> — nie ma czego wpisywać.</p>';
  curLetters.forEach(c=>$('#mx-'+c).addEventListener('input',e=>{mxVals[c]=e.target.value}));
}
function parseMat(s,name){
  const rows=String(s).replace(/[−–]/g,'-').split(/\n|;/).map(r=>r.trim()).filter(Boolean).map(r=>r.split(/[\s,]+/).filter(Boolean));
  if(!rows.length)throw new Error(`Macierz ${name} jest pusta.`);
  if(rows.some(r=>r.length!==rows[0].length))throw new Error(`Macierz ${name}: każdy wiersz musi mieć tyle samo liczb.`);
  if(rows.length>4||rows[0].length>4)throw new Error(`Macierz ${name}: trener liczy macierze najwyżej 4×4.`);
  return rows.map(r=>r.map(t=>{const v=parseFr(t);if(!v)throw new Error(`Macierz ${name}: „${t}” to nie liczba. Liczby oddzielaj spacjami, ułamki pisz jako 1/2.`);return v}));
}
function computeNum(){
  const msg=$('#numMsg');msg.className='msg';$('#numOut').innerHTML='';lastNum=null;
  try{const env={};for(const c of curLetters)env[c]=parseMat(mxVals[c],c);lastNum=numbersSolve(curSrc,env);$('#numOut').innerHTML=lastNum.html}
  catch(e){show(msg,'bad',e.message)}
}
$('#numBtn').onclick=computeNum;
$('#numRnd').onclick=()=>{const had=!sol||$('#numOut').innerHTML;curLetters.forEach(c=>{mxVals[c]=mxStr(unimod2())});buildMx(new Set(curLetters));if(had)computeNum()};
$('#openEx2').onclick=()=>{$('#eqIn').value='AX=XA';mxVals.A='1 1\n0 1';setTab('rownania');runSolve();$('#numCard').scrollIntoView()};

// ---- układy równań ----
let sSize=3,sMode='one',sMeth='gauss',sTask=null,sPick='one',sScore={ok:0,all:0},sCounted=false,sysShown=false;
const chipsOn=(attr,val)=>document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.classList.toggle('on',b.dataset[attr]===String(val)));
function setPick(t){sPick=t;chipsOn('st',t);$('#sVals').hidden=t!=='one'}
function renderSysSol(){sTask.out=sysMethodHtml(sTask.Ab,sTask.names,sMeth);$('#sSolBox').innerHTML=sTask.out.html}
function newSys(){
  chipsOn('ss',sSize);chipsOn('sm',sMode);chipsOn('me',sMeth);
  sTask=genSys(sSize,sMode);sCounted=false;
  $('#sEq').innerHTML=sysHtml(abRows(sTask.Ab,sTask.names.length),sTask.names);
  $('#sVals').innerHTML=sTask.names.map((v,j)=>`<label class="ans-in" for="sv${j}"><span>${nmHtml(v)} =</span><input id="sv${j}" ${INP}></label>`).join('');
  setPick('one');$('#sMsg').className='msg';$('#sSolBox').className='sol';renderSysSol();
}
document.querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>{sSize=b.dataset.ss==='r'?'r':+b.dataset.ss;newSys()});
document.querySelectorAll('[data-sm]').forEach(b=>b.onclick=()=>{sMode=b.dataset.sm;newSys()});
document.querySelectorAll('[data-me]').forEach(b=>b.onclick=()=>{sMeth=b.dataset.me;chipsOn('me',sMeth);renderSysSol();if(sysShown)runSys()});
document.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>setPick(b.dataset.st));
$('#sNew').onclick=newSys;
$('#sSol').onclick=()=>$('#sSolBox').classList.toggle('on');
$('#sHint').onclick=()=>{
  const nv=sTask.names.length,A=sTask.Ab.map(r=>r.slice(0,nv)),bc=sTask.Ab.map(r=>[r[nv]]);
  show($('#sMsg'),'info',{
    gauss:`Zapisz macierz rozszerzoną ${augHtml(A,bc)} i zeruj kolumna po kolumnie. Wiersz [0 … 0 | liczba ≠ 0] oznacza sprzeczność, kolumna bez schodka — parametr.`,
    mac:`Zapisz układ jako <span class="f"><i>AX</i> = <i>B</i></span>: ${matH(A)}·${colH(sTask.names)} = ${matH(bc)}. Jeśli <i>A</i> jest kwadratowa i odwracalna, to <span class="f"><i>X</i> = <i>A</i><sup>−1</sup><i>B</i></span>.`,
    cra:`Policz <span class="f"><i>W</i> = det <i>A</i></span>. Gdy <span class="f"><i>W</i> ≠ 0</span>: <span class="f"><i>x</i> = <i>W<sub>x</sub></i> / <i>W</i></span>, gdzie w <i>W<sub>x</sub></i> kolumnę przy <i>x</i> zastępujesz kolumną wyrazów wolnych. Gdy <span class="f"><i>W</i> = 0</span>, rozstrzyga Gauss.`
  }[sMeth]);
};
$('#sCheck').onclick=()=>{
  const out=sTask.out,msg=$('#sMsg'),ins=[...document.querySelectorAll('#sVals input')];let ok=false,counted=true;
  ins.forEach(el=>el.classList.remove('ok','bad'));
  if(sPick!==out.type)show(msg,'bad',`✗ To nie ten przypadek. Porównaj rz <i>A</i> i rz [<i>A</i> | <i>B</i>] z liczbą niewiadomych (${sTask.names.length}) — pomoże Podpowiedź albo ściąga.`);
  else if(out.type==='one'){
    let good=0,empty=0;
    ins.forEach((el,k)=>{const v=parseFr(el.value);if(!el.value.trim())empty++;const g=v&&v.eq(out.vals[k]);el.classList.toggle('ok',!!g);el.classList.toggle('bad',!g);if(g)good++});
    if(empty){counted=false;show(msg,'bad',`Uzupełnij wszystkie niewiadome (${empty} pustych).`)}
    else if(good===ins.length){ok=true;show(msg,'ok','✓ Dobrze! Układ ma dokładnie jedno rozwiązanie i to jest ono.')}
    else show(msg,'bad',`✗ Dobrze: ${good} z ${ins.length}. Podstaw swoje liczby do równań i sprawdź, które się nie zgadza.`);
  }else{ok=true;show(msg,'ok',out.type==='inf'?'✓ Tak — nieskończenie wiele rozwiązań. W „Rozwiązaniu” zobaczysz, jak zapisać rozwiązanie ogólne z parametrem.':'✓ Tak — układ jest sprzeczny, nie ma rozwiązań.')}
  if(counted&&!sCounted){sScore.all++;if(ok)sScore.ok++;sCounted=true;rec(sMode==='any'&&sSize!=='r'?'sysany':{2:'sys2',3:'sys3',4:'sys4',r:'sysrect'}[sSize],ok?1:0)}
  $('#sScore').textContent=sScore.all?`wynik: ${sScore.ok}/${sScore.all}`:'';
};
function runSys(){
  const err=$('#sysErr');err.className='msg';$('#sysOut').innerHTML='';
  try{
    const {Ab,names}=parseSystem($('#sysIn').value),r=sysMethodHtml(Ab,names,sMeth);
    $('#sysOut').innerHTML=`<div class="sysbox">${sysHtml(abRows(Ab,names.length),names)}</div>`+r.html;sysShown=true;
  }catch(e){show(err,'bad',e.message)}
}
$('#sysBtn').onclick=runSys;
function fillCheat(){
  const {Ab,names}=parseSystem('2x + y - z = 3\nx - y + 2z = 5\n3x + 2y + z = 10'),nv=names.length;
  $('#chSys').innerHTML=`${sysHtml(abRows(Ab,nv),names)} &nbsp;⇔&nbsp; <span class="m">${matH(Ab.map(r=>r.slice(0,nv)))} · ${colH(names)} = ${matH(Ab.map(r=>[r[nv]]))}</span>`;
}

// ================= Odtwarzacz „krok po kroku” =================
const PL={fr:[],k:0,tm:[],play:false,busy:false,spd:1,opener:null};
try{const v=+localStorage.getItem('macierze-tempo');if(v>0)PL.spd=v}catch(e){}
document.querySelectorAll('#plSpd .chip').forEach(c=>c.classList.toggle('on',+c.dataset.spd===PL.spd));
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const plUnit=()=>520*PL.spd;
function plClearT(){PL.tm.forEach(clearTimeout);PL.tm=[]}
function plFinal(f){
  const V=(f.B||[]).map(b=>b.M.map(r=>r.slice())),D=(f.B||[]).map(b=>b.M.map(r=>r.map(()=>new Set())));
  [...(f.U||[])].sort((a,b)=>a.t-b.t).forEach(u=>{
    if(u.v!==undefined)V[u.b][u.i][u.j]=u.v;
    if(u.add)D[u.b][u.i][u.j].add(u.add);
    if(u.clear)D[u.b].forEach(r=>r.forEach(z=>z.clear()));
  });
  return {V,D};
}
function plBoard(b,bi,vals,dyn){
  const r=vals.length,c=vals[0].length,hl=b.hl||{},dim=new Set(b.dimCols);let h='';
  for(let i=0;i<r;i++)for(let j=0;j<c;j++){
    const cl=[];if(j===b.bar)cl.push('bl');if(dim.has(j))cl.push('dim');
    for(const x of [hl.rows&&hl.rows[i],hl.cols&&hl.cols[j],hl.cells&&hl.cells[i+','+j]])if(x)cl.push(x);
    const dy=dyn?[...dyn[i][j]]:[];
    h+=`<span class="${cl.concat(dy).join(' ')}" data-c="${bi}-${i}-${j}" data-r="${bi}-${i}"${dy.length?` data-dyn="${dy.join(' ')}"`:''}>${vals[i][j]}</span>`;
  }
  return `<div class="bd"><div class="bd-lab">${b.lab}</div><span class="mat pm${b.det?' det':''}" style="grid-template-columns:repeat(${c},auto)">${h}</span></div>`;
}
const plCell=(b,i,j)=>$('#plStage').querySelector(`[data-c="${b}-${i}-${j}"]`);
function plApply(x){
  if(x.line!==undefined){const el=$('#plCalc').querySelector(`[data-l="${x.line}"]`);if(el)el.classList.remove('hid')}
  if(x.swap&&!RM){
    const [b,i,j]=x.swap,a=plCell(b,i,0),c=plCell(b,j,0);
    if(a&&c){const dy=c.offsetTop-a.offsetTop,tr=`transform ${Math.round(1.1*plUnit())}ms cubic-bezier(.4,0,.2,1)`;
      $('#plStage').querySelectorAll(`[data-r="${b}-${i}"]`).forEach(e=>{e.style.transition=tr;e.style.transform=`translateY(${dy}px)`});
      $('#plStage').querySelectorAll(`[data-r="${b}-${j}"]`).forEach(e=>{e.style.transition=tr;e.style.transform=`translateY(${-dy}px)`})}
  }
  if(x.v!==undefined){const el=plCell(x.b,x.i,x.j);if(el){el.style.transition='none';el.style.transform='';void el.offsetWidth;el.style.transition='';el.innerHTML=x.v;el.classList.remove('chg');void el.offsetWidth;el.classList.add('chg')}}
  if(x.add){const el=plCell(x.b,x.i,x.j);if(el){el.classList.add(x.add);el.dataset.dyn=((el.dataset.dyn||'')+' '+x.add).trim()}}
  if(x.clear)$('#plStage').querySelectorAll(`[data-c^="${x.b}-"]`).forEach(el=>{(el.dataset.dyn||'').split(' ').filter(Boolean).forEach(c=>el.classList.remove(c));el.dataset.dyn=''});
}
function plRender(anim){
  plClearT();
  const f=PL.fr[PL.k],N=PL.fr.length,U=f.U||[],live=anim&&U.length>0,fin=plFinal(f);
  $('#plSec').innerHTML=f.sec||'';$('#plT').innerHTML=f.t||'';$('#plX').innerHTML=f.x||'';$('#plX').hidden=!f.x;
  $('#plCount').textContent=`Krok ${PL.k+1} z ${N}`;$('#plProg').style.width=(100*(PL.k+1)/N)+'%';
  let st=f.S?`<div class="pl-s">${f.S}</div>`:'';
  if(f.B&&f.B.length)st+='<div class="pl-boards">'+f.B.map((b,bi)=>(bi?`<span class="pl-j">${(f.J&&f.J[bi-1])||''}</span>`:'')+plBoard(b,bi,live?b.M:fin.V[bi],live?null:fin.D[bi])).join('')+'</div>';
  $('#plStage').innerHTML=st;
  const hid=new Set(live?U.filter(u=>u.line!==undefined).map(u=>u.line):[]),calc=$('#plCalc');
  calc.className='pl-calc'+(f.Cb?' big':'');
  calc.innerHTML=(f.C||[]).map((l,k)=>{const o=typeof l==='string'?{h:l}:l;return `<div class="${[o.full?'full':'',hid.has(k)?'hid':''].join(' ').trim()}" data-l="${k}">${o.h}</div>`}).join('');
  $('#plBody').scrollTop=0;
  $('#plPrev').disabled=PL.k===0;
  $('#plNext').textContent=PL.k===N-1?'Zakończ ✓':'Dalej ▶';
  if(live){
    const u=plUnit();let mx=0;PL.busy=true;
    for(const x of U){mx=Math.max(mx,x.t);PL.tm.push(setTimeout(()=>plApply(x),x.t*u))}
    PL.tm.push(setTimeout(()=>{PL.busy=false;plAfter()},mx*u+120));
  }else{PL.busy=false;plAfter()}
}
function plAfter(){
  if(!PL.play)return;
  if(PL.k>=PL.fr.length-1){plSetPlay(false);return}
  const f=PL.fr[PL.k],len=(f.x||'').replace(/<[^>]+>/g,'').length;
  PL.tm.push(setTimeout(()=>{PL.k++;plRender(true)},Math.max(1500,Math.min(5500,900+len*26))*PL.spd));
}
function plSetPlay(on){PL.play=on;$('#plPlay').textContent=on?'❚❚ Pauza':'▶ Odtwarzaj'}
function plNext(){if(PL.busy){plRender(false);return}if(PL.k<PL.fr.length-1){PL.k++;plRender(true)}else plClose()}
function plPrev(){plSetPlay(false);if(PL.k>0){PL.k--;plRender(false)}}
function plOpen(frames,name){
  PL.fr=frames;PL.k=0;PL.opener=document.activeElement;plSetPlay(false);
  $('#plName').innerHTML=name||'';$('#pl').hidden=false;document.body.style.overflow='hidden';
  plRender(true);$('#plNext').focus();
}
function plClose(){plClearT();plSetPlay(false);PL.busy=false;$('#pl').hidden=true;document.body.style.overflow='';if(PL.opener&&PL.opener.focus)PL.opener.focus()}
$('#plNext').onclick=plNext;$('#plPrev').onclick=plPrev;$('#plClose').onclick=plClose;
$('#plPlay').onclick=()=>{
  if(PL.play){plSetPlay(false);if(PL.busy)plRender(false);else plClearT();return}
  plSetPlay(true);
  if(PL.k>=PL.fr.length-1){PL.k=0;plRender(true)}else if(!PL.busy){PL.k++;plRender(true)}
};
$('#plSpd').addEventListener('click',e=>{const b=e.target.closest('[data-spd]');if(!b)return;PL.spd=+b.dataset.spd;document.querySelectorAll('#plSpd .chip').forEach(c=>c.classList.toggle('on',c===b));try{localStorage.setItem('macierze-tempo',String(PL.spd))}catch(er){}});
document.addEventListener('keydown',e=>{
  if($('#pl').hidden)return;
  if(e.key==='Escape'){plClose();e.preventDefault()}
  else if(e.key==='ArrowRight'){plNext();e.preventDefault()}
  else if(e.key==='ArrowLeft'){plPrev();e.preventDefault()}
  else if(e.key===' '&&!(e.target.closest&&e.target.closest('button'))){$('#plPlay').click();e.preventDefault()}
});
function play(make,name,msgEl){
  let fr;try{fr=make()}catch(e){if(msgEl)show(msgEl,'bad',e.message);return}
  if(fr&&fr.length)plOpen(fr,name);
}
const MN={gauss:'metoda Gaussa',mac:'metoda macierzowa',cra:'wzory Cramera'};
$('#nPlay').onclick=()=>play(()=>nTask.fr(),'X na liczbach · '+nTask.orig,$('#nMsg'));
$('#sPlay').onclick=()=>play(()=>sysFrames(sTask.Ab,sTask.names,sMeth),'Układ równań · '+MN[sMeth],$('#sMsg'));
$('#sysPlay').onclick=()=>{$('#sysErr').className='msg';play(()=>{const {Ab,names}=parseSystem($('#sysIn').value);return sysFrames(Ab,names,sMeth)},'Twój układ · '+MN[sMeth],$('#sysErr'))};
$('#symPlay').onclick=()=>{if(sol)play(()=>symFrames(sol),'X na literach · '+sol.orig)};
$('#numPlay').onclick=()=>{computeNum();if(lastNum)play(()=>lastNum.fr(),'Policz na liczbach',$('#numMsg'))};

// ================= Odpowiedzi w ogólnych zadaniach (format z topics.js) =================
function ansRead(id,ans){
  const v=s=>{const el=document.getElementById(id+'-'+s);return el?el.value:''};
  if(ans.kind==='mat')return ans.M.flat().map((_,k)=>v(k));
  if(ans.kind==='num')return v(0);
  if(ans.kind==='formula')return v('f');
  if(ans.kind==='sys'){const box=document.querySelector(`[data-gst-box="${id}"]`),on=box&&box.querySelector('.on');return {type:on?on.dataset.gst:'one',vals:ans.names.map((_,j)=>v('v'+j))}}
  if(ans.kind==='param')return [0,1,2].map(k=>({a:v('a'+k),type:v('t'+k)}));
  return null;
}
function ansFill(id,ans,inp){
  if(!inp)return;
  const set=(s,x)=>{const el=document.getElementById(id+'-'+s);if(el)el.value=x};
  if(ans.kind==='mat')inp.forEach((x,k)=>set(k,x));
  else if(ans.kind==='num')set(0,inp);
  else if(ans.kind==='formula')set('f',inp);
  else if(ans.kind==='sys'){const box=document.querySelector(`[data-gst-box="${id}"]`);if(box)box.querySelectorAll('[data-gst]').forEach(c=>c.classList.toggle('on',c.dataset.gst===inp.type));const vals=document.getElementById(id+'-vals');if(vals)vals.hidden=inp.type!=='one';inp.vals.forEach((x,j)=>set('v'+j,x))}
  else if(ans.kind==='param')inp.forEach((r,k)=>{set('a'+k,r.a);set('t'+k,r.type)});
}
function ansMark(id,res){for(const [k,ok] of Object.entries(res.marks)){const el=document.getElementById(id+'-'+k);if(el){el.classList.toggle('ok',!!ok);el.classList.toggle('bad',!ok)}}}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-gst]');if(!b)return;
  const box=b.closest('[data-gst-box]');box.querySelectorAll('[data-gst]').forEach(c=>c.classList.toggle('on',c===b));
  const vals=document.getElementById(box.dataset.gstBox+'-vals');if(vals)vals.hidden=b.dataset.gst!=='one';
});
const plain=h=>String(h).replace(/<[^>]+>/g,'');

// ================= Karta ćwiczenia (Ćwiczenia i Powtórka) =================
function makePractice(root,o){
  const id=o.id,$i=s=>document.getElementById(id+s),sc={ok:0,all:0};let topic=null,task=null,counted=false;
  root.innerHTML=`<div class="card"><div class="row" style="margin-top:0"><span class="q" id="${id}Q"></span><span class="score" id="${id}Score"></span></div><div class="mute" id="${id}Why"></div><div id="${id}Body"></div><div id="${id}Ans" style="margin-top:10px"></div>
<div class="row"><button class="btn" id="${id}Check">Sprawdź</button><button class="btn ghost" id="${id}Hint">Podpowiedź</button><button class="btn play" id="${id}Play">▶ Krok po kroku</button><button class="btn ghost" id="${id}Sol">Rozwiązanie</button><button class="btn ghost" id="${id}New">Nowe zadanie</button></div>
<p class="mute" style="margin-top:8px">Ułamki wpisuj jako <code>1/2</code> lub <code>-3/4</code>.</p><div class="msg" id="${id}Msg"></div><div class="sol" id="${id}SolBox"></div></div>`;
  function next(){
    topic=topicById(o.pick());task=topic.gen();counted=false;
    $i('Q').innerHTML=task.q;$i('Why').innerHTML=o.why?o.why(topic):'';$i('Why').hidden=!o.why;
    $i('Body').innerHTML=task.body;$i('Ans').innerHTML=ansHtml(task.ans,id+'a');
    $i('Msg').className='msg';$i('SolBox').className='sol';$i('SolBox').innerHTML=task.sol;
    $i('Hint').hidden=!task.hint;$i('Play').hidden=!task.fr;
  }
  $i('Check').onclick=()=>{
    const r=ansCheck(task.ans,ansRead(id+'a',task.ans));ansMark(id+'a',r);
    if(r.empty){show($i('Msg'),'bad','Najpierw wpisz odpowiedź.');return}
    if(!counted){counted=true;sc.all++;if(r.score===1)sc.ok++;rec(topic.id,r.score)}
    $i('Score').textContent=`wynik: ${sc.ok}/${sc.all}`;
    if(r.score===1)show($i('Msg'),'ok','✓ Dobrze!');
    else show($i('Msg'),'bad',`✗ ${r.msg||'Niestety nie.'} Możesz poprawić, wziąć podpowiedź albo obejrzeć rozwiązanie krok po kroku.`);
  };
  $i('Hint').onclick=()=>show($i('Msg'),'info',task.hint);
  $i('Play').onclick=()=>play(task.fr,plain(topic.name),$i('Msg'));
  $i('Sol').onclick=()=>$i('SolBox').classList.toggle('on');
  $i('New').onclick=()=>{next();if(o.onNew)o.onNew()};
  return {next};
}

// ================= Ćwiczenia =================
let cwSec=SECTIONS[0],cwTop=TOPICS[0].id;
function cwRender(){
  $('#cwSecs').innerHTML=SECTIONS.map(s=>`<button class="chip${s===cwSec?' on':''}" data-cws="${s}">${s}</button>`).join('');
  $('#cwTopics').innerHTML=TOPICS.filter(t=>t.sec===cwSec).map(t=>`<button class="chip${t.id===cwTop?' on':''}" data-cwt="${t.id}">${t.name}</button>`).join('');
}
const CW=makePractice($('#cwBox'),{id:'cw',pick:()=>cwTop});
$('#cwSecs').addEventListener('click',e=>{const b=e.target.closest('[data-cws]');if(!b)return;cwSec=b.dataset.cws;cwTop=TOPICS.find(t=>t.sec===cwSec).id;cwRender();CW.next()});
$('#cwTopics').addEventListener('click',e=>{const b=e.target.closest('[data-cwt]');if(!b)return;cwTop=b.dataset.cwt;cwRender();CW.next()});
function cwOpen(id){cwTop=id;cwSec=topicById(id).sec;cwRender();CW.next();setTab('cwiczenia')}

// ================= Postęp i powtórki =================
const PR_KEY='algebra-postep-v1';let PR={};
try{PR=JSON.parse(localStorage.getItem(PR_KEY)||'{}')||{}}catch(e){PR={}}
function prSave(){try{localStorage.setItem(PR_KEY,JSON.stringify(PR))}catch(e){}}
function rec(id,score){
  if(!topicById(id))return;
  const r=PR[id]||(PR[id]={n:0,h:[],t:0});r.n++;r.h.push(Math.round(score*100)/100);if(r.h.length>10)r.h.shift();r.t=Date.now();
  prSave();prRender();
}
const prAcc=id=>{const r=PR[id];return r&&r.h.length?r.h.reduce((a,b)=>a+b,0)/r.h.length:null};
function prStatus(id){const a=prAcc(id);return a===null?['new','nowy']:a<.5?['bad','słabo']:a<.8?['mid','średnio']:['good','dobrze']}
function prWeight(id){const a=prAcc(id);if(a===null)return 1.3;return .2+(1-a)*2.2+Math.min(.6,(Date.now()-PR[id].t)/864e6)}
let prQueue=[],prLast='';
function prPick(){
  if(prQueue.length){const id=prQueue.shift();prLast=id;return id}
  for(let tries=0;tries<3;tries++){
    const ws=TOPICS.map(t=>prWeight(t.id)),sum=ws.reduce((a,b)=>a+b,0);let x=Math.random()*sum,id=TOPICS[0].id;
    for(let k=0;k<TOPICS.length;k++){x-=ws[k];if(x<=0){id=TOPICS[k].id;break}}
    if(id!==prLast||tries===2){prLast=id;return id}
  }
}
function prWhy(t){
  const a=prAcc(t.id),[st]=prStatus(t.id),pct=a===null?0:Math.round(a*100);
  const w=st==='new'?'nowy temat — jeszcze go nie ćwiczyłeś':st==='bad'?`słabo idzie (${pct}% w ostatnich próbach)`:st==='mid'?`średnio (${pct}%) — warto utrwalić`:'utrwalenie tematu, który już umiesz';
  return `Powtórka · ${t.sec} · ${t.name} — ${w}.`;
}
function prRender(){
  const ids=TOPICS.map(t=>t.id),done=ids.filter(id=>prAcc(id)!==null),n=ids.reduce((s,id)=>s+(PR[id]?PR[id].n:0),0);
  const avg=done.length?Math.round(100*done.reduce((s,id)=>s+prAcc(id),0)/done.length):0;
  const cnt=k=>ids.filter(id=>prStatus(id)[0]===k).length;
  $('#prStats').innerHTML=[[n,'rozwiązanych zadań'],[done.length?avg+'%':'—','średni wynik'],[cnt('bad')+cnt('mid'),'tematów do powtórki'],[cnt('good')+' / '+ids.length,'tematów opanowanych']].map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
  $('#prList').innerHTML=SECTIONS.map(sec=>`<div class="pr-sec">${sec}</div>`+TOPICS.filter(t=>t.sec===sec).map(t=>{
    const a=prAcc(t.id),[cl,lab]=prStatus(t.id),pct=a===null?0:Math.round(a*100),col={bad:'var(--bad)',mid:'var(--amb)',good:'var(--ok)',new:'var(--line)'}[cl];
    return `<div class="pr-row"><button class="pr-name" data-prt="${t.id}" title="Ćwicz ten temat">${t.name}</button><div class="pr-bar"><span style="width:${pct}%;background:${col}"></span></div><span class="pr-pct">${a===null?'—':pct+'%'}</span><span class="pill ${cl}">${lab}</span></div>`;
  }).join('')).join('');
}
$('#prList').addEventListener('click',e=>{const b=e.target.closest('[data-prt]');if(b)cwOpen(b.dataset.prt)});
let PRP=null;
function prStart(queue){
  prQueue=queue||[];
  if(!PRP)PRP=makePractice($('#prBox'),{id:'pr',pick:prPick,why:prWhy});
  PRP.next();setTab('postep');$('#prBox').scrollIntoView({block:'start'});
}
$('#prGo').onclick=()=>prStart();
$('#prReset').onclick=()=>{
  const m=$('#prMsg');show(m,'bad','Na pewno usunąć cały zapisany postęp? Tego nie da się cofnąć. <div class="row"><button class="btn small" id="prYes">Tak, wyczyść</button><button class="btn ghost small" id="prNo">Anuluj</button></div>');
  $('#prYes').onclick=()=>{PR={};prSave();prRender();show(m,'ok','Postęp wyczyszczony.')};
  $('#prNo').onclick=()=>{m.className='msg'};
};

// ================= Sprawdzian =================
const exSel=new Set(SECTIONS);let exN=8,exT=0,EX=null,exTimer=null;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=ms=>{const s=Math.max(0,Math.round(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
const pln=x=>String(Math.round(x*10)/10).replace('.',',');
function exSetup(){$('#exSecs').innerHTML=SECTIONS.map(s=>`<button class="chip${exSel.has(s)?' on':''}" data-exs="${s}">${s}</button>`).join('')}
$('#exSecs').addEventListener('click',e=>{const b=e.target.closest('[data-exs]');if(!b)return;const s=b.dataset.exs;if(exSel.has(s)){if(exSel.size>1)exSel.delete(s)}else exSel.add(s);exSetup()});
$('#exN').addEventListener('click',e=>{const b=e.target.closest('[data-exn]');if(!b)return;exN=+b.dataset.exn;$('#exN').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b))});
$('#exT').addEventListener('click',e=>{const b=e.target.closest('[data-ext]');if(!b)return;exT=+b.dataset.ext;$('#exT').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b))});
function exStart(){
  const secs=shuffle(SECTIONS.filter(s=>exSel.has(s))),pools=secs.map(s=>shuffle(TOPICS.filter(t=>t.sec===s))),ids=[];
  for(let k=0;ids.length<exN;k++){const p=pools[k%pools.length];ids.push((p.length?p.shift():pick(TOPICS.filter(t=>t.sec===secs[k%secs.length]))).id)}
  EX={items:shuffle(ids).map(id=>{const tp=topicById(id);return {tp,task:tp.gen(),inp:null}}),k:0,t0:Date.now(),end:exT?Date.now()+exT*60000:0,done:false};
  $('#exAns').innerHTML='';$('#exSetup').hidden=true;$('#exRes').hidden=true;$('#exRun').hidden=false;$('#exConfirm').className='msg';
  exShow(0);clearInterval(exTimer);exTimer=setInterval(exTick,1000);exTick();
}
function exTick(){
  if(!EX||EX.done){clearInterval(exTimer);return}
  if(EX.end){const left=EX.end-Date.now();$('#exClock').textContent='zostało '+mmss(left);if(left<=0)exFinish()}
  else $('#exClock').textContent='czas '+mmss(Date.now()-EX.t0);
}
function exSave(){const it=EX.items[EX.k];it.inp=ansRead('exa',it.task.ans)}
const exAnswered=it=>it.inp&&!ansCheck(it.task.ans,it.inp).empty;
function exShow(k){
  if(EX.items[EX.k]&&$('#exAns').innerHTML)exSave();
  EX.k=k;const it=EX.items[k],N=EX.items.length;
  $('#exHead').textContent=`Zadanie ${k+1} z ${N}`;$('#exTopic').innerHTML=it.tp.sec+' · '+it.tp.name;
  $('#exQ').innerHTML=it.task.q;$('#exBody').innerHTML=it.task.body;$('#exAns').innerHTML=ansHtml(it.task.ans,'exa');ansFill('exa',it.task.ans,it.inp);
  $('#exDots').innerHTML=EX.items.map((x,i)=>`<button class="${i===k?'cur':exAnswered(x)?'done':''}" data-exk="${i}" aria-label="Zadanie ${i+1}">${i+1}</button>`).join('');
  $('#exPrev').disabled=k===0;$('#exNext').disabled=k===N-1;$('#exConfirm').className='msg';
}
$('#exDots').addEventListener('click',e=>{const b=e.target.closest('[data-exk]');if(b)exShow(+b.dataset.exk)});
$('#exPrev').onclick=()=>{if(EX.k>0)exShow(EX.k-1)};
$('#exNext').onclick=()=>{if(EX.k<EX.items.length-1)exShow(EX.k+1)};
$('#exStart').onclick=()=>{const m=$('#exMsg');show(m,'info','Losuję zadania…');setTimeout(()=>{try{exStart();m.className='msg'}catch(err){show(m,'bad','Nie udało się wylosować zestawu: '+err.message)}},20)};
$('#exEnd').onclick=()=>{
  exSave();const empty=EX.items.filter(it=>!exAnswered(it)).length,m=$('#exConfirm');
  if(!empty){exFinish();return}
  show(m,'bad',`Bez odpowiedzi: ${empty} ${pl(empty,'zadanie','zadania','zadań')}. Zakończyć mimo to? <div class="row"><button class="btn small" id="exYes">Tak, oceń</button><button class="btn ghost small" id="exNo">Wracam do zadań</button></div>`);
  $('#exYes').onclick=exFinish;$('#exNo').onclick=()=>{m.className='msg'};
};
const GRADES=[[90,'5,0'],[80,'4,5'],[70,'4,0'],[60,'3,5'],[50,'3,0'],[0,'2,0']];
function exFinish(){
  if(!EX||EX.done)return;
  if($('#exAns').innerHTML)exSave();
  EX.done=true;clearInterval(exTimer);
  const N=EX.items.length;let pts=0;
  EX.items.forEach(it=>{const inp=it.inp||ansRead('__brak__',it.task.ans);it.inp=inp;it.r=ansCheck(it.task.ans,inp);pts+=it.r.score;rec(it.tp.id,it.r.score)});
  const pct=Math.round(100*pts/N),grade=GRADES.find(g=>pct>=g[0])[1],weak=[...new Set(EX.items.filter(it=>it.r.score<1).map(it=>it.tp.id))];
  const comment=pct>=90?'Świetnie — materiał opanowany.':pct>=70?'Dobrze. Przejrzyj zadania z błędami poniżej.':pct>=50?'Zaliczone, ale warto powtórzyć tematy z błędami.':'Na razie za mało — obejrzyj rozwiązania krok po kroku i zrób powtórkę słabych tematów.';
  let h=`<div class="card"><h2>Wynik sprawdzianu</h2><div class="res-top"><div><div class="grade">${grade}</div><div class="mute">ocena</div></div><div><b style="font-size:22px">${pln(pts)} / ${N} pkt</b><div class="mute">${pct}% · czas ${mmss(Date.now()-EX.t0)}</div></div></div><p>${comment}</p>
<div class="row"><button class="btn" id="exAgain">Nowy sprawdzian</button>${weak.length?`<button class="btn ghost" id="exRedo">Ćwicz tematy z błędami (${weak.length})</button>`:''}</div></div><div class="card"><h2>Zadania</h2>`;
  EX.items.forEach((it,i)=>{
    const s=it.r.score,cl=s===1?'good':s>0?'mid':'bad';
    h+=`<div class="rev"><div class="rev-head"><b>Zadanie ${i+1}</b><span class="pill ${cl}">${pln(s)} / 1 pkt</span><span class="mute">${it.tp.sec} · ${it.tp.name}</span></div>
<div class="q" style="margin-top:6px">${it.task.q}</div>${it.task.body}
<div class="ansline"><span class="mute">Twoja odpowiedź:</span> ${it.r.empty?'<i class="mute">brak</i>':inpShow(it.task.ans,it.inp)}</div>
<div class="ansline"><span class="mute">Poprawna:</span> ${ansShow(it.task.ans)}</div>
<div class="row">${it.task.fr?`<button class="btn play small" data-exp="${i}">▶ Krok po kroku</button>`:''}<button class="btn ghost small" data-exs2="${i}">Rozwiązanie</button></div><div class="sol" id="exSol${i}">${it.task.sol}</div></div>`;
  });
  $('#exRes').innerHTML=h+'</div>';$('#exRun').hidden=true;$('#exRes').hidden=false;window.scrollTo(0,0);
  $('#exAgain').onclick=()=>{$('#exRes').hidden=true;$('#exSetup').hidden=false;EX=null};
  if(weak.length)$('#exRedo').onclick=()=>prStart(weak.slice());
}
$('#exRes').addEventListener('click',e=>{
  const p=e.target.closest('[data-exp]');if(p){const it=EX.items[+p.dataset.exp];play(it.task.fr,plain(it.tp.name));return}
  const s=e.target.closest('[data-exs2]');if(s)$('#exSol'+s.dataset.exs2).classList.toggle('on');
});

// ================= Znajdź mój błąd =================
function fbRun(){const m=$('#fbMsg');m.className='msg';try{$('#fbOut').innerHTML=chainReport($('#fbIn').value)}catch(e){$('#fbOut').innerHTML='';show(m,'bad',e.message)}}
function fbMulRun(){const m=$('#fbMsg');m.className='msg';try{$('#fbOut').innerHTML=`<div class="card">${mulReport(parseMat($('#fbA').value,'A'),parseMat($('#fbB').value,'B'),parseMat($('#fbC').value,'AB'))}</div>`}catch(e){$('#fbOut').innerHTML='';show(m,'bad',e.message)}}
$('#fbBtn').onclick=fbRun;$('#fbMulBtn').onclick=fbMulRun;
$('#fbEx').onclick=()=>{$('#fbIn').value=EX_CHAIN;fbRun()};
$('#fbClr').onclick=()=>{$('#fbIn').value='';$('#fbOut').innerHTML='';$('#fbMsg').className='msg';$('#fbIn').focus()};
$('#fbMode').addEventListener('click',e=>{
  const b=e.target.closest('[data-fb]');if(!b)return;const g=b.dataset.fb==='gauss';
  $('#fbMode').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));
  $('#fbGauss').hidden=!g;$('#fbMul').hidden=g;g?fbRun():fbMulRun();
});

// start
document.documentElement.lang='pl';
newNum();runSolve();newSys();runSys();fillCheat();
cwRender();CW.next();exSetup();prRender();$('#fbIn').value=EX_CHAIN;fbRun();
setTab(location.hash.slice(1));
