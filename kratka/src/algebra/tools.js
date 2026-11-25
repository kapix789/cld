// =====================================================================
//  ALGEBRA: narzędzia (X na liczbach, X na literach, układy równań, znajdź błąd) i ściąga
// =====================================================================
const INP='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"';
const grid=(r,c)=>`<span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},(_,k)=>`<input ${INP} aria-label="${$t('wiersz','row')} ${Math.floor(k/c)+1}, ${$t('kolumna','column')} ${k%c+1}">`).join('')}</span>`;
function checkGrid(sel,ans){
  const ins=[...document.querySelectorAll(sel+' input')],exp=ans.flat();let good=0,empty=0;
  ins.forEach((el,k)=>{const v=parseFr(el.value);if(!el.value.trim())empty++;const ok=v&&v.eq(exp[k]);el.classList.toggle('ok',!!ok);el.classList.toggle('bad',!ok);if(ok)good++});
  return {good,empty,total:exp.length};
}
const segOn=(attr,val)=>$$(`[data-${attr}]`).forEach(b=>b.classList.toggle('on',b.dataset[attr]===String(val)));
const scoreT=sc=>sc.all?$t(`dobrze ${sc.ok} z ${sc.all}`,`${sc.ok} of ${sc.all} correct`):'';
const MN={get gauss(){return $t('metoda Gaussa','Gaussian elimination')},get mac(){return $t('metoda macierzowa','matrix method')},get cra(){return $t('wzory Cramera','Cramer’s rule')}};
// rozwiązanie pokazywane pod zadaniem: przycisk „Rozwiązanie” przełącza widoczność
function solToggle(btn,box){btn.onclick=()=>{const on=!box.classList.contains('on');box.classList.toggle('on',on);btn.setAttribute('aria-expanded',on)}}

// ---------- X na liczbach ----------
let nSize=2,nShape='sq',nTask=null,nScore={ok:0,all:0},nCounted=false;
const eqLabel=t=>{const a=parseEq(t.eq);return (rExpr(a.L)+' = '+rExpr(a.R)).replace(/<sup>T<\/sup>/g,'ᵀ').replace(/<sup>−1<\/sup>/g,'⁻¹').replace(/<[^>]+>/g,'')};
function buildNtSel(){
  const v=$('#ntSel').value;
  $('#ntSel').innerHTML=`<option value="-1">${$t('dowolne (losowy typ)','any (random type)')}</option><optgroup label="${$t('Wzorem: najpierw X na literach','By formula: X symbolically first')}">`+NT.map((t,k)=>t.lin?'':`<option value="${k}">${eqLabel(t)}</option>`).join('')+`</optgroup><optgroup label="${$t('Przez niewiadome: układ równań','Using unknowns: a system of equations')}">`+NT.map((t,k)=>t.lin?`<option value="${k}">${eqLabel(t)}  (${Object.entries(t.lin).map(([c,d])=>c+' '+d.join('×')).join(', ')})</option>`:'').join('')+'</optgroup>';
  if(v)$('#ntSel').value=v;
}
function newNum(){
  segOn('n',nSize);segOn('shape',nShape);
  const idx=+$('#ntSel').value,tpl=idx>=0?NT[idx]:null;
  if(tpl&&tpl.lin){
    nTask=genLin(tpl);
    $('#ntNote').innerHTML=$t(`Tego równania nie rozwiążemy wzorem (${tpl.note()}). Liczymy przez niewiadome: <i>X</i> = [<i>x y</i>; <i>z t</i>] daje układ równań. Rozmiar i kształt nie mają tu znaczenia.`,`This equation cannot be solved with a formula (${tpl.note()}). We use unknowns: <i>X</i> = [<i>x y</i>; <i>z t</i>] gives a system of equations. Size and shape do not matter here.`);
  }else{
    const T=genNum(nSize,idx,nShape==='rect');
    nTask={fr:()=>numFrames(T),orig:T.sol.orig,letters:[...T.sol.letters].sort(),env:T.env,X:T.X,get solHtml(){return numSolHtml(T)},
      hint:$t(`Najpierw na literach: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Potem odwrotność metodą Gaussa i mnożenie.`,`First symbolically: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Then the inverse by Gaussian elimination and the multiplication.`)};
    $('#ntNote').innerHTML=nShape==='rect'?$t('Prostokątna <i>X</i>: jej wymiar wynika z działań. Odwracamy tylko macierze kwadratowe, czyli te, które stoją przy <i>X</i>.','Rectangular <i>X</i>: its size follows from the operations. Only square matrices are inverted, namely the ones next to <i>X</i>.'):'';
  }
  $('#ntNote').hidden=!$('#ntNote').innerHTML;
  nCounted=false;nTask.tid=tpl&&tpl.lin?'xlin':nShape==='rect'?'xrect':'xnum'+nSize;
  $('#nEq').innerHTML=nTask.orig;
  $('#nGiven').innerHTML=nTask.letters.map(c=>`<span class="gv"><i>${c}</i> = ${M.html(nTask.env[c])}</span>`).join('');
  $('#nAns').innerHTML=`<span class="gv"><span><i>X</i> =</span> ${grid(nTask.X.length,nTask.X[0].length)}</span>`;
  $('#nMsg').className='msg';$('#nSolBox').className='sol';$('#nSolBox').innerHTML=nTask.solHtml;
}
$$('[data-n]').forEach(b=>b.onclick=()=>{nSize=+b.dataset.n;newNum()});
$$('[data-shape]').forEach(b=>b.onclick=()=>{nShape=b.dataset.shape;newNum()});
$('#ntSel').onchange=newNum;$('#nNew').onclick=newNum;
$('#nHint').onclick=()=>show($('#nMsg'),'info',`<b>${$t('Podpowiedź.','Hint.')}</b> ${nTask.hint}`);
solToggle($('#nSol'),$('#nSolBox'));
$('#nCheck').onclick=()=>{
  const r=checkGrid('#nAns',nTask.X);
  if(r.empty===r.total){show($('#nMsg'),'bad',$t('Najpierw wpisz odpowiedź.','Type an answer first.'));return}
  if(!nCounted&&!r.empty){nScore.all++;if(r.good===r.total)nScore.ok++;nCounted=true;rec(nTask.tid,r.good/r.total)}
  $('#nScore').textContent=scoreT(nScore);
  if(r.good===r.total)show($('#nMsg'),'ok',$t('<b>Dobrze.</b> To jest szukana macierz <i>X</i>.','<b>Correct.</b> This is the matrix <i>X</i>.'));
  else if(r.empty)show($('#nMsg'),'bad',$t(`Puste pola: ${r.empty}. Uzupełnij wszystkie.`,`Empty fields: ${r.empty}. Fill in all of them.`));
  else show($('#nMsg'),'bad',$t(`<b>Nie zgadza się.</b> Poprawnych pól: ${r.good} z ${r.total}. Warto sprawdzić wzór (podpowiedź) albo rachunki.`,`<b>Not quite.</b> Correct fields: ${r.good} of ${r.total}. Check the formula (hint) or the arithmetic.`));
};

// ---------- X na literach ----------
let sol=null,shown=0,lastInput=$('#eqIn'),symCounted=false;
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
    if(!e.lin){show(err,'bad',e.message);$('#eqWork').hidden=true;return}
    try{const a=parseEq(src);linCheck(a.L);linCheck(a.R)}catch(e2){show(err,'bad',e.message+' '+e2.message);$('#eqWork').hidden=true;return}
    linMsg=e.message;
  }
  curSrc=src;const ast=parseEq(src);
  $('#eqWork').hidden=false;
  $('#eqTry').hidden=$('#ansCard').hidden=$('#stepsCard').hidden=!sol;
  buildMx(lettersOf(ast.L,lettersOf(ast.R)));$('#numOut').innerHTML='';$('#numMsg').className='msg';
  if(!sol){
    $('#eqShow').innerHTML=rExpr(ast.L)+' = '+rExpr(ast.R);
    show(err,'info',$t(`${linMsg} Wzorem na literach się nie da. Takie równanie rozwiązuje się <b>na liczbach, przez niewiadome</b>: wpisz macierze w części „Na liczbach” niżej (na start są przykładowe).`,`${linMsg} A symbolic formula will not work. Such an equation is solved <b>with numbers, using unknowns</b>: type the matrices in the “With numbers” part below (example matrices are already there).`));
    computeNum();return;
  }
  $('#eqShow').innerHTML=sol.orig;
  $('#steps').innerHTML=sol.steps.map((s,k)=>`<div class="step${s.final?' final':''}"><div class="step-t"><span class="step-n">${s.final?$t('Wynik','Result'):k+1}</span>${s.title}</div>${s.why?`<div class="why">${s.why}</div>`:''}${s.lines.map(l=>`<div class="eq left">${l}</div>`).join('')}</div>`).join('');
  shown=0;symCounted=false;$('#nextStep').hidden=false;$('#allSteps').hidden=false;
  $('#ansIn').value='';$('#ansMsg').className='msg';
}
function reveal(all){
  const st=$$('#steps .step');
  shown=all?st.length:Math.min(shown+1,st.length);
  st.forEach((s,k)=>s.classList.toggle('on',k<shown));
  if(shown>=st.length){$('#nextStep').hidden=true;$('#allSteps').hidden=true}
}
$('#solveBtn').onclick=runSolve;
$('#eqIn').addEventListener('keydown',e=>{if(e.key==='Enter')runSolve()});
$$('[data-lvl]').forEach(b=>b.onclick=()=>{$('#eqIn').value=genEq(+b.dataset.lvl);runSolve()});
$('#nextStep').onclick=()=>reveal(false);
$('#allSteps').onclick=()=>reveal(true);
function checkAns(){
  const msg=$('#ansMsg');if(!sol)return;
  try{
    const ok=checkAnswer(sol,$('#ansIn').value);
    if(!symCounted){symCounted=true;rec('xsym',ok?1:0)}
    if(ok)show(msg,'ok',$t('<b>Dobrze.</b> Ten wzór daje to samo <i>X</i> co rozwiązanie.','<b>Correct.</b> This formula gives the same <i>X</i> as the solution.'));
    else show(msg,'bad',$t('<b>Nie zgadza się.</b> Warto sprawdzić, czy mnożenie jest z <b>właściwej strony</b>, czy w (<i>AB</i>)<sup>−1</sup> odwrócona jest <b>kolejność</b> i czy przy wyciąganiu <i>X</i> przed nawias pojawia się <i>I</i>. Można też odsłonić pierwszy krok.','<b>Not quite.</b> Check whether you multiply from the <b>correct side</b>, whether the <b>order</b> is reversed in (<i>AB</i>)<sup>−1</sup> and whether an <i>I</i> appears when <i>X</i> is factored out. You can also reveal the first step.'));
  }catch(e){show(msg,'bad',e.message)}
}
$('#ansBtn').onclick=checkAns;
$('#ansIn').addEventListener('keydown',e=>{if(e.key==='Enter')checkAns()});
$('#openEx').onclick=()=>{$('#eqIn').value='A^TB^-1XCA=(AD)^-1D';location.hash='#algebra-rownania';runSolve()};

// ---------- własne macierze (X na literach → liczby) ----------
const mxVals={};let curSrc='',curLetters=[],lastNum=null;
const mxStr=A=>A.map(r=>r.map(x=>x.str().replace('−','-')).join(' ')).join('\n');
function buildMx(set){
  curLetters=[...set].sort();
  curLetters.forEach(c=>{if(!(c in mxVals))mxVals[c]=mxStr(unimod2())});
  $('#mxIns').innerHTML=curLetters.length?curLetters.map(c=>`<label class="mx" for="mx-${c}"><span><i>${c}</i> =</span><textarea id="mx-${c}" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false">${mxVals[c]}</textarea></label>`).join(''):`<p class="note">${$t('W równaniu są tylko <i>X</i> i <i>I</i>, więc nie ma czego wpisywać.','The equation only contains <i>X</i> and <i>I</i>, so there is nothing to type in.')}</p>`;
  curLetters.forEach(c=>$('#mx-'+c).addEventListener('input',e=>{mxVals[c]=e.target.value}));
}
function parseMat(s,name){
  const rows=String(s).replace(/[−–]/g,'-').split(/\n|;/).map(r=>r.trim()).filter(Boolean).map(r=>r.split(/[\s,]+/).filter(Boolean));
  if(!rows.length)throw new Error($t(`Macierz ${name} jest pusta.`,`Matrix ${name} is empty.`));
  if(rows.some(r=>r.length!==rows[0].length))throw new Error($t(`Macierz ${name}: każdy wiersz musi mieć tyle samo liczb.`,`Matrix ${name}: every row must have the same number of entries.`));
  if(rows.length>4||rows[0].length>4)throw new Error($t(`Macierz ${name}: obsługiwane są macierze najwyżej 4×4.`,`Matrix ${name}: matrices up to 4×4 are supported.`));
  return rows.map(r=>r.map(t=>{const v=parseFr(t);if(!v)throw new Error($t(`Macierz ${name}: „${t}” to nie liczba. Liczby oddzielaj spacjami, ułamki pisz jako 1/2.`,`Matrix ${name}: “${t}” is not a number. Separate numbers with spaces and write fractions as 1/2.`));return v}));
}
function computeNum(){
  const msg=$('#numMsg');msg.className='msg';$('#numOut').innerHTML='';lastNum=null;
  try{const env={};for(const c of curLetters)env[c]=parseMat(mxVals[c],c);lastNum=numbersSolve(curSrc,env);$('#numOut').innerHTML=lastNum.html}
  catch(e){show(msg,'bad',e.message)}
}
$('#numBtn').onclick=computeNum;
$('#numRnd').onclick=()=>{const had=!sol||$('#numOut').innerHTML;curLetters.forEach(c=>{mxVals[c]=mxStr(unimod2())});buildMx(new Set(curLetters));if(had)computeNum()};
$('#openEx2').onclick=()=>{$('#eqIn').value='AX=XA';mxVals.A='1 1\n0 1';location.hash='#algebra-rownania';runSolve();setTimeout(()=>$('#numCard').scrollIntoView(),30)};

// ---------- układy równań ----------
let sSize=3,sMode='one',sMeth='gauss',sTask=null,sScore={ok:0,all:0},sCounted=false,sysShown=false;
const sysTid=()=>sMode==='exam'?'sysexam':sMode==='any'&&sSize!=='r'?'sysany':{2:'sys2',3:'sys3',4:'sys4',r:'sysrect'}[sSize];
function renderSysSol(){sTask.out=sysMethodHtml(sTask.Ab,sTask.names,sMeth);$('#sSolBox').innerHTML=sTask.out.html}
function newSys(){
  segOn('ss',sSize);segOn('sm',sMode);segOn('me',sMeth);
  $$('[data-ss]').forEach(b=>{b.disabled=sMode==='exam'});
  $('#sModeNote').innerHTML=sMode==='exam'?$t('Jak na kolokwium: układ 4×4, zwykle sprzeczny albo z nieskończenie wieloma rozwiązaniami. Rozmiar jest stały.','Exam style: a 4×4 system, usually inconsistent or with infinitely many solutions. The size is fixed.'):sMode==='any'?$t('Losowy: może wyjść jedno rozwiązanie, nieskończenie wiele albo żadne.','Random: there may be one solution, infinitely many or none.'):'';
  $('#sModeNote').hidden=!$('#sModeNote').innerHTML;
  sTask=sMode==='exam'?genExamSys():genSys(sSize,sMode);sCounted=false;
  sTask.ans=sysAns(sTask.Ab,sTask.names);
  $('#sQ').innerHTML=sMode==='exam'?$t('Jeśli to możliwe, rozwiąż układ równań','Solve the system of equations, if possible'):$t('Rozwiąż układ równań','Solve the system of equations');
  $('#sEq').innerHTML=sysHtml(abRows(sTask.Ab,sTask.names.length),sTask.names);
  $('#sAns').innerHTML=ansHtml(sTask.ans,'sa');
  $('#sMsg').className='msg';$('#sSolBox').className='sol';renderSysSol();
}
$$('[data-ss]').forEach(b=>b.onclick=()=>{sSize=b.dataset.ss==='r'?'r':+b.dataset.ss;newSys()});
$$('[data-sm]').forEach(b=>b.onclick=()=>{sMode=b.dataset.sm;newSys()});
$$('[data-me]').forEach(b=>b.onclick=()=>{sMeth=b.dataset.me;segOn('me',sMeth);renderSysSol();if(sysShown)runSys()});
$('#sNew').onclick=newSys;
solToggle($('#sSol'),$('#sSolBox'));
$('#sHint').onclick=()=>{
  const nv=sTask.names.length,A=sTask.Ab.map(r=>r.slice(0,nv)),bc=sTask.Ab.map(r=>[r[nv]]);
  show($('#sMsg'),'info',`<b>${$t('Podpowiedź.','Hint.')}</b> `+{
    gauss:$t(`Zapisz macierz rozszerzoną ${augHtml(A,bc)} i zeruj kolumna po kolumnie. Wiersz [0 … 0 | liczba ≠ 0] oznacza sprzeczność, a kolumna bez schodka parametr.`,`Write the augmented matrix ${augHtml(A,bc)} and make zeros column by column. A row [0 … 0 | number ≠ 0] means a contradiction, and a column without a pivot means a parameter.`),
    mac:$t(`Zapisz układ jako <span class="f"><i>AX</i> = <i>B</i></span>: ${matH(A)}·${colH(sTask.names)} = ${matH(bc)}. Jeśli <i>A</i> jest kwadratowa i odwracalna, to <span class="f"><i>X</i> = <i>A</i><sup>−1</sup><i>B</i></span>.`,`Write the system as <span class="f"><i>AX</i> = <i>B</i></span>: ${matH(A)}·${colH(sTask.names)} = ${matH(bc)}. If <i>A</i> is square and invertible, then <span class="f"><i>X</i> = <i>A</i><sup>−1</sup><i>B</i></span>.`),
    cra:$t(`Policz <span class="f"><i>W</i> = det <i>A</i></span>. Gdy <span class="f"><i>W</i> ≠ 0</span>, to <span class="f"><i>x</i> = <i>W<sub>x</sub></i> / <i>W</i></span>, gdzie w <i>W<sub>x</sub></i> kolumnę przy <i>x</i> zastępujemy kolumną wyrazów wolnych. Gdy <span class="f"><i>W</i> = 0</span>, rozstrzyga metoda Gaussa.`,`Compute <span class="f"><i>D</i> = det <i>A</i></span>. If <span class="f"><i>D</i> ≠ 0</span>, then <span class="f"><i>x</i> = <i>D<sub>x</sub></i> / <i>D</i></span>, where in <i>D<sub>x</sub></i> the column of <i>x</i> is replaced by the column of constants. If <span class="f"><i>D</i> = 0</span>, Gaussian elimination decides.`)
  }[sMeth]+(sMode==='exam'?$t(' Na kolokwium często któreś równanie jest kombinacją innych; wtedy porównaj prawe strony.',' In exams one equation is often a combination of others; then compare the right-hand sides.'):''));
};
$('#sCheck').onclick=()=>{
  const msg=$('#sMsg'),r=ansCheck(sTask.ans,ansRead('sa',sTask.ans));ansMark('sa',r);
  if(r.empty){show(msg,'bad',r.msg);return}
  const ok=r.score===1;
  if(ok)show(msg,'ok',`<b>${$t('Dobrze.','Correct.')}</b> `+{one:$t('Układ ma dokładnie jedno rozwiązanie i to jest ono.','The system has exactly one solution and this is it.'),inf:$t('Nieskończenie wiele rozwiązań, a rozwiązanie ogólne jest poprawne.','Infinitely many solutions, and the general solution is right.'),none:$t('Układ jest sprzeczny, nie ma rozwiązań.','The system is inconsistent, it has no solutions.')}[sTask.ans.type]);
  else show(msg,r.score>0?'part':'bad',`<b>${r.score>0?$t('Częściowo.','Partly right.'):$t('Nie zgadza się.','Not quite.')}</b> ${r.msg||''}`);
  if(!sCounted){sScore.all++;if(ok)sScore.ok++;sCounted=true;rec(sysTid(),r.score)}
  $('#sScore').textContent=scoreT(sScore);
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
// wybór liczby rozwiązań w odpowiedziach typu „układ” (Ćwiczenia, Sprawdzian, Układy)
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-gst]');if(!b)return;
  const box=b.closest('[data-gst-box]');box.querySelectorAll('[data-gst]').forEach(c=>c.classList.toggle('on',c===b));
  sysMode(box.dataset.gstBox,b.dataset.gst);
});

// ---------- odtwarzacz dla narzędzi ----------
$('#nPlay').onclick=()=>play(()=>nTask.fr(),$t('X na liczbach · ','X with numbers · ')+nTask.orig,$('#nMsg'),{noFrac:true});
$('#sPlay').onclick=()=>play(()=>sysFrames(sTask.Ab,sTask.names,sMeth),$t('Układ równań · ','System of equations · ')+MN[sMeth],$('#sMsg'),{noFrac:true});
$('#sysPlay').onclick=()=>{$('#sysErr').className='msg';play(()=>{const {Ab,names}=parseSystem($('#sysIn').value);return sysFrames(Ab,names,sMeth)},$t('Własny układ · ','Your system · ')+MN[sMeth],$('#sysErr'),{noFrac:true})};
$('#symPlay').onclick=()=>{if(sol)play(()=>symFrames(sol),$t('X na literach · ','X symbolically · ')+sol.orig)};
$('#numPlay').onclick=()=>{computeNum();if(lastNum)play(()=>lastNum.fr(),$t('Na liczbach','With numbers'),$('#numMsg'),{noFrac:true})};

// ---------- Znajdź błąd ----------
function fbRun(){const m=$('#fbMsg');m.className='msg';try{$('#fbOut').innerHTML=chainReport($('#fbIn').value)}catch(e){$('#fbOut').innerHTML='';show(m,'bad',e.message)}}
function fbMulRun(){const m=$('#fbMsg');m.className='msg';try{$('#fbOut').innerHTML=`<div class="card">${mulReport(parseMat($('#fbA').value,'A'),parseMat($('#fbB').value,'B'),parseMat($('#fbC').value,'AB'))}</div>`}catch(e){$('#fbOut').innerHTML='';show(m,'bad',e.message)}}
$('#fbBtn').onclick=fbRun;$('#fbMulBtn').onclick=fbMulRun;
$('#fbEx').onclick=()=>{$('#fbIn').value=EX_CHAIN;fbRun()};
$('#fbClr').onclick=()=>{$('#fbIn').value='';$('#fbOut').innerHTML='';$('#fbMsg').className='msg';$('#fbIn').focus()};
$('#fbMode').addEventListener('click',e=>{
  const b=e.target.closest('[data-fb]');if(!b)return;const g=b.dataset.fb==='gauss';
  $$('#fbMode button').forEach(c=>c.classList.toggle('on',c===b));
  $('#fbGauss').hidden=!g;$('#fbMul').hidden=g;g?fbRun():fbMulRun();
});

// ---------- podpięcie do szkieletu ----------
HOOKS.start.push(()=>{buildNtSel();newNum();runSolve();newSys();runSys();fillCheat();$('#fbIn').value=EX_CHAIN;fbRun()});
HOOKS.lang.push(()=>{
  $('#ansIn').placeholder=$t('np. A^-1(C-B)','e.g. A^-1(C-B)');
  buildNtSel();newNum();runSolve();newSys();if(sysShown)runSys();fillCheat();
  if($('#fbMul').hidden)fbRun();else fbMulRun();
  $('#nScore').textContent=scoreT(nScore);$('#sScore').textContent=scoreT(sScore);
});
HOOKS.noFrac.push(()=>{
  // te same zadania, przeliczone rozwiązania
  if(sTask)renderSysSol();if(sysShown)runSys();
  if(nTask)$('#nSolBox').innerHTML=nTask.solHtml;
  if(lastNum&&$('#numOut').innerHTML)computeNum();
});
