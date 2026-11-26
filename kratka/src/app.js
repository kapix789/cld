// =====================================================================
//  Kratka: interfejs wspólny dla przedmiotów
// =====================================================================
//  Nawigacja (przedmiot → widok → temat), Ćwiczenia, Sprawdzian, Postęp z powtórką
//  i odtwarzacz „krok po kroku”. Widoki jednego przedmiotu (np. kalkulatory algebry)
//  są w <przedmiot>/tools.js i podpinają się przez HOOKS.
// =====================================================================
const $=s=>document.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={
  get(k,d=null){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
};
// język i ustawienia zapamiętane w przeglądarce (klucze z czasów, gdy Kratka była trenerem algebry, też działają)
{const v=store.get('kratka-lang',store.get('algebra-lang'));if(v==='pl'||v==='en')LANG.cur=v}
if(store.get('kratka-bez-ulamkow',store.get('algebra-bez-ulamkow'))==='0')OPT.noFrac=false;
if(store.get('kratka-g')==='10')OPT.g=10;
document.documentElement.dataset.lang=LANG.cur;document.documentElement.lang=LANG.cur;

// start: uruchomienie narzędzi przedmiotów; lang/noFrac/g: odświeżenie treści po zmianie ustawienia
const HOOKS={start:[],lang:[],noFrac:[],g:[],view:[]};
const show=(el,cls,html)=>{if(!el)return;el.className='msg '+cls;el.innerHTML=html};
const bi=(pl,en)=>`<span data-ln="pl">${pl}</span><span data-ln="en">${en}</span>`;
const plain=h=>String(h).replace(/<[^>]+>/g,'');
// nazwa tematu bez znaczników (do <option>): wykładniki jako znaki Unicode
const txt=h=>plain(String(h).replace(/<sup>−1<\/sup>/g,'⁻¹').replace(/<sup>T<\/sup>/g,'ᵀ').replace(/<sup>2<\/sup>/g,'²').replace(/<sub>(\d)<\/sub>/g,(m,d)=>'₀₁₂₃₄₅₆₇₈₉'[d])).replace(/&nbsp;/g,' ');
const pctS=x=>Math.round(x*100)+'%';
const ICON_PEN='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 16.5l.9-3.6 9.4-9.4a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1l-9.4 9.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.3 5l2.7 2.7" stroke="currentColor" stroke-width="1.5"/></svg>';
function ansMark(id,res){for(const [k,ok] of Object.entries(res.marks||{})){const el=document.getElementById(id+'-'+k);if(el){el.classList.toggle('ok',!!ok);el.classList.toggle('bad',!ok)}}}

// ================= Nawigacja =================
const R={subj:null,view:null};
const BASE_VIEWS=[{id:'cwiczenia',name:'Ćwiczenia',en:'Practice'},{id:'sprawdzian',name:'Sprawdzian',en:'Test'},{id:'postep',name:'Postęp',en:'Progress'}];
function viewsOf(S){
  const v=S.topics.length?BASE_VIEWS.slice():[];
  if(S.sheet)v.push({id:'sciaga',name:S.sheet.name,en:S.sheet.en});
  return v.concat(S.tools.map(t=>({...t,tool:true})));
}
// stare adresy z czasów trenera algebry (#uklady, #sprawdzian…) otwierają te same widoki
const OLD_HASH={liczby:'liczby',rownania:'rownania',uklady:'uklady',cwiczenia:'cwiczenia',dzialania:'cwiczenia',sprawdzian:'sprawdzian',blad:'blad',postep:'postep',sciaga:'sciaga'};
function route(){
  const h=location.hash.slice(1);
  // zeszyt to osobna część, wspólna dla przedmiotów (dawniej #algebra-zeszyt itd.)
  if(h==='zeszyt'||/^[a-z]+-zeszyt$/.test(h))return goNotebook();
  if(OLD_HASH[h])return go('algebra',OLD_HASH[h]);
  const [s,v,...rest]=h.split('-');
  if(subjById(s))return go(s,v,rest.join('-')||null);
  const last=store.get('kratka-przedmiot');
  go(subjById(last)?last:SUBJECTS[0].id,null);
}
function go(subj,view,topic){
  const S=subjById(subj)||SUBJECTS[0],vs=viewsOf(S);
  if(!vs.some(v=>v.id===view))view=vs[0].id;
  const moved=R.subj!==S.id||R.view!==view,subjChanged=R.subj&&R.subj!==S.id;
  R.subj=S.id;R.view=view;store.set('kratka-przedmiot',S.id);
  document.documentElement.dataset.subj=S.id;
  $$('#main>section').forEach(sec=>{sec.hidden=!(sec.dataset.view===view&&(!sec.dataset.subj||sec.dataset.subj===S.id))});
  if(subjChanged)prReviewClose();
  if(view==='cwiczenia')practiceShow(S,topic);
  else if(view==='sprawdzian')examShow(S);
  else if(view==='postep')prRender();
  navRender();
  HOOKS.view.forEach(f=>f(S,view));
  const h='#'+S.id+'-'+view+(view==='cwiczenia'?'-'+PRACT[S.id].topic:'');
  if(location.hash!==h)history.replaceState(null,'',h);
  if(moved)window.scrollTo(0,0);
}
function goNotebook(){
  const moved=R.view!=='zeszyt',S=subjById(R.subj)||subjById(store.get('kratka-przedmiot'))||SUBJECTS[0];
  R.subj=S.id;R.view='zeszyt';
  document.documentElement.dataset.subj='zeszyt';
  $$('#main>section').forEach(sec=>{sec.hidden=sec.dataset.view!=='zeszyt'});
  navRender();
  HOOKS.view.forEach(f=>f(S,'zeszyt'));
  if(location.hash!=='#zeszyt')history.replaceState(null,'','#zeszyt');
  if(moved)window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
const viewHref=(S,id)=>'#'+S.id+'-'+id;
// przy zmianie przedmiotu zostajemy w tym samym widoku (np. Sprawdzian), jeśli nowy przedmiot go ma
const keepView=s=>viewsOf(s).some(v=>v.id===R.view&&!v.tool)?R.view:viewsOf(s)[0].id;
const inNotebook=()=>R.view==='zeszyt';
function navRender(){
  const S=subjById(R.subj),vs=viewsOf(S),nb=inNotebook();
  $('#subjTabs').innerHTML=`<a href="#zeszyt" class="nb-tab${nb?' on':''}"${nb?' aria-current="page"':''}>${ICON_PEN}<span>${$t('Zeszyt','Notebook')}</span></a><span class="subj-sep" aria-hidden="true"></span>`+
    SUBJECTS.map(s=>`<a href="${viewHref(s,keepView(s))}"${s===S&&!nb?' class="on" aria-current="page"':''}>${sName(s)}</a>`).join('');
  $('#subjBtnName').innerHTML=nb?$t('Zeszyt','Notebook'):sName(S);
  const link=v=>`<a href="${viewHref(S,v.id)}"${v.id===R.view?' class="on" aria-current="page"':''}>${tName(v)}</a>`;
  $('#viewTabs').innerHTML=vs.map(link).join('');
  const main=vs.filter(v=>!v.tool),tools=vs.filter(v=>v.tool);
  $('#side').innerHTML=`<nav class="side-nav">${main.map(link).join('')}</nav>`+
    (tools.length?`<div class="side-h">${$t('Narzędzia','Tools')}</div><nav class="side-nav">${tools.map(link).join('')}</nav>`:'')+
    (S.topics.length?`<div class="side-h">${$t('Tematy','Topics')}</div>${tocHtml(S)}`:'');
}
function tocHtml(S){
  const cur=R.view==='cwiczenia'&&PRACT[S.id]?PRACT[S.id].topic:null;
  return '<div class="toc">'+S.sections.map(sec=>`<div class="toc-sec">${secName(sec)}</div>`+S.topics.filter(t=>t.sec===sec).map(t=>
    `<a href="#${S.id}-cwiczenia-${t.id}" class="toc-t${t.id===cur?' on':''}"${t.id===cur?' aria-current="true"':''}><span class="toc-n">${tName(t)}</span>${sqHtml(t.id,5,true)}</a>`).join('')).join('')+'</div>';
}
// ---- panel od dołu (telefon): lista tematów i przedmiotów zamiast systemowej listy <select> ----
const BS={opener:null};
function bsOpen(title,html,opener){
  BS.opener=opener||null;
  $('#bsT').innerHTML=title;$('#bsBody').innerHTML=html;
  $('#bs').hidden=false;document.body.style.overflow='hidden';
  if(opener)opener.setAttribute('aria-expanded','true');
  const cur=$('#bsBody .on')||$('#bsBody a');
  if(cur){cur.scrollIntoView({block:'center'});cur.focus({preventScroll:true})}
}
function bsClose(){
  if($('#bs').hidden)return;
  $('#bs').hidden=true;document.body.style.overflow='';
  if(BS.opener){BS.opener.setAttribute('aria-expanded','false');BS.opener.focus({preventScroll:true})}
}
$('#bs').addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.closest('#bsBody a'))bsClose()});
document.addEventListener('keydown',e=>{
  if($('#bs').hidden)return;
  if(e.key==='Escape'){bsClose();e.preventDefault();return}
  if(e.key==='Tab'){const f=$$('#bs a,#bs button'),k=f.indexOf(document.activeElement);
    if(e.shiftKey&&k<=0){f[f.length-1].focus();e.preventDefault()}else if(!e.shiftKey&&k===f.length-1){f[0].focus();e.preventDefault()}}
});
function topicSheet(S){
  const cur=PRACT[S.id]?PRACT[S.id].topic:null;
  return S.sections.map(sec=>`<div class="bs-sec">${secName(sec)}</div>`+S.topics.filter(t=>t.sec===sec).map(t=>
    `<a href="#${S.id}-cwiczenia-${t.id}" class="bs-t${t.id===cur?' on':''}"${t.id===cur?' aria-current="true"':''}><span class="toc-n">${tName(t)}</span>${sqHtml(t.id,5,true)}</a>`).join('')).join('');
}
function subjSheet(){
  const nb=inNotebook();
  return `<a href="#zeszyt" class="bs-t bs-s bs-nb${nb?' on':''}"${nb?' aria-current="true"':''}>${ICON_PEN}<span class="toc-n"><b>${$t('Zeszyt','Notebook')}</b><small>${$t('kartka na rachunki i notatki, piórem albo z klawiatury','paper for working and notes, with a pen or the keyboard')}</small></span></a>`+
    SUBJECTS.map(s=>{const n=s.topics.length,on=s.id===R.subj&&!nb;
    return `<a href="${viewHref(s,keepView(s))}" class="bs-t bs-s${on?' on':''}"${on?' aria-current="true"':''}><span class="toc-n"><b>${sName(s)}</b><small>${n} ${$t(pl(n,'temat','tematy','tematów'),n===1?'topic':'topics')}${s.tools.length?' · '+s.tools.map(tName).join(', '):''}</small></span></a>`}).join('');
}
$('#subjBtn').addEventListener('click',e=>bsOpen($t('Przedmiot','Subject'),subjSheet(),e.currentTarget));
$('#topicBtn').addEventListener('click',e=>{const S=subjById(R.subj);bsOpen(`${$t('Tematy','Topics')} · ${sName(S)}`,topicSheet(S),e.currentTarget)});
function topicStep(d){const S=subjById(R.subj),ids=S.topics.map(t=>t.id),k=ids.indexOf(PRACT[S.id].topic)+d;if(k>=0&&k<ids.length)location.hash='#'+S.id+'-cwiczenia-'+ids[k]}
$('#topicPrev').addEventListener('click',()=>topicStep(-1));
$('#topicNext').addEventListener('click',()=>topicStep(1));
$('#brand').addEventListener('click',e=>{e.preventDefault();location.hash=viewHref(subjById(R.subj),'cwiczenia')});

// ================= Odtwarzacz „krok po kroku” =================
// Klatka: {sec, t (tytuł), x (wyjaśnienie), S (dowolny HTML), B (plansze z macierzami), J (znaki między planszami),
//          C (linie rachunków), Cb (większe rachunki), U (zmiany w czasie: {t, b,i,j, v|add|clear|swap|line})}
const PL={fr:[],k:0,tm:[],play:false,busy:false,spd:1,opener:null,make:null};
{const v=+store.get('kratka-tempo',store.get('macierze-tempo'));if(v>0)PL.spd=v}
$$('#plSpd button').forEach(c=>c.classList.toggle('on',+c.dataset.spd===PL.spd));
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
  if(x.show!==undefined)$('#plStage').querySelectorAll(`[data-show="${x.show}"]`).forEach(el=>el.classList.add('vis'));
}
function plRender(anim){
  plClearT();
  const f=PL.fr[PL.k],N=PL.fr.length,U=f.U||[],live=anim&&U.length>0,fin=plFinal(f);
  $('#plSec').innerHTML=f.sec||'';$('#plT').innerHTML=f.t||'';$('#plX').innerHTML=f.x||'';$('#plX').hidden=!f.x;
  $('#plCount').textContent=$t(`Krok ${PL.k+1} z ${N}`,`Step ${PL.k+1} of ${N}`);
  $$('#plSteps button').forEach((b,k)=>{b.classList.toggle('done',k<PL.k);b.classList.toggle('cur',k===PL.k)});
  let st=f.S?`<div class="pl-s">${f.S}</div>`:'';
  if(f.B&&f.B.length)st+='<div class="pl-boards">'+f.B.map((b,bi)=>(bi?`<span class="pl-j">${(f.J&&f.J[bi-1])||''}</span>`:'')+plBoard(b,bi,live?b.M:fin.V[bi],live?null:fin.D[bi])).join('')+'</div>';
  $('#plStage').innerHTML=st;
  if(!live)$('#plStage').querySelectorAll('[data-show]').forEach(el=>el.classList.add('vis'));
  const hid=new Set(live?U.filter(u=>u.line!==undefined).map(u=>u.line):[]),calc=$('#plCalc');
  calc.className='pl-calc'+(f.Cb?' big':'');
  calc.innerHTML=(f.C||[]).map((l,k)=>{const o=typeof l==='string'?{h:l}:l;return `<div class="${[o.full?'full':'',hid.has(k)?'hid':''].join(' ').trim()}" data-l="${k}">${o.h}</div>`}).join('');
  $('#plBody').scrollTop=0;
  $('#plPrev').disabled=PL.k===0;
  $('#plNext').textContent=PL.k===N-1?$t('Zakończ','Finish'):$t('Dalej','Next');
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
function plSetPlay(on){PL.play=on;const b=$('#plPlay');b.textContent=on?$t('Pauza','Pause'):$t('Odtwarzaj','Play');b.classList.toggle('on',on)}
function plNext(){if(PL.busy){plRender(false);return}if(PL.k<PL.fr.length-1){PL.k++;plRender(true)}else plClose()}
function plPrev(){plSetPlay(false);if(PL.k>0){PL.k--;plRender(false)}}
function plSteps(){$('#plSteps').innerHTML=PL.fr.map((f,k)=>`<button type="button" data-k="${k}" aria-label="${$t('Krok','Step')} ${k+1}" title="${escH(plain(f.t||''))}"></button>`).join('')}
function plOpen(frames,name,o={}){
  PL.fr=frames;PL.k=0;PL.opener=document.activeElement;plSetPlay(false);
  $('#plName').innerHTML=name||'';$('#nfPlWrap').hidden=!o.noFrac;plSteps();
  $('#pl').hidden=false;document.body.style.overflow='hidden';
  plRender(true);$('#plNext').focus();
}
function plClose(){plClearT();plSetPlay(false);PL.busy=false;$('#pl').hidden=true;document.body.style.overflow='';if(PL.opener&&PL.opener.focus)PL.opener.focus()}
$('#plNext').onclick=plNext;$('#plPrev').onclick=plPrev;$('#plClose').onclick=plClose;
$('#plSteps').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;plSetPlay(false);PL.k=+b.dataset.k;plRender(true)});
$('#plPlay').onclick=()=>{
  if(PL.play){plSetPlay(false);if(PL.busy)plRender(false);else plClearT();return}
  plSetPlay(true);
  if(PL.k>=PL.fr.length-1){PL.k=0;plRender(true)}else if(!PL.busy){PL.k++;plRender(true)}
};
$('#plSpd').addEventListener('click',e=>{const b=e.target.closest('[data-spd]');if(!b)return;PL.spd=+b.dataset.spd;$$('#plSpd button').forEach(c=>c.classList.toggle('on',c===b));store.set('kratka-tempo',PL.spd)});
document.addEventListener('keydown',e=>{
  if($('#pl').hidden)return;
  if(e.key==='Escape'){plClose();e.preventDefault()}
  else if(e.key==='ArrowRight'){plNext();e.preventDefault()}
  else if(e.key==='ArrowLeft'){plPrev();e.preventDefault()}
  else if(e.key===' '&&!(e.target.closest&&e.target.closest('button'))){$('#plPlay').click();e.preventDefault()}
});
// make: () => klatki (liczone od nowa, gdy zmieni się ustawienie „bez ułamków”)
function play(make,name,msgEl,o={}){
  PL.make=make;
  let fr;try{fr=make()}catch(e){if(msgEl)show(msgEl,'bad',e.message);return}
  if(fr&&fr.length)plOpen(fr,name,o);
}

// ================= Karta zadania (Ćwiczenia i Powtórka) =================
function makePractice(root,o){
  const id=o.id,$i=s=>document.getElementById(id+s),sc={ok:0,all:0};let topic=null,task=null,counted=false;
  root.innerHTML=`<div class="task">
<div class="task-top"><div class="task-q" id="${id}Q"></div><span class="score" id="${id}Score"></span></div>
<p class="why" id="${id}Why" hidden></p>
<div class="sheet"><div id="${id}Body"></div><div class="task-ans" id="${id}Ans"></div></div>
<p class="note" id="${id}Note"></p>
<div class="actions">
<button type="button" class="btn" id="${id}Check">${bi('Sprawdź','Check')}</button>
<button type="button" class="btn ghost" id="${id}Hint">${bi('Podpowiedź','Hint')}</button>
<button type="button" class="btn ghost play" id="${id}Play">${bi('Krok po kroku','Step by step')}</button>
<button type="button" class="btn ghost" id="${id}Sol" aria-expanded="false">${bi('Rozwiązanie','Solution')}</button>
<button type="button" class="btn ghost pad" data-pad="${id}" aria-pressed="false">${ICON_PEN}${bi('Brudnopis','Scratch pad')}</button>
<button type="button" class="btn link" id="${id}New">${bi('Następne zadanie','Next task')}</button>
</div>
<div class="msg" id="${id}Msg" role="status"></div>
<div class="sol" id="${id}SolBox"></div>
</div>`;
  const solToggle=on=>{$i('SolBox').classList.toggle('on',on);$i('Sol').setAttribute('aria-expanded',on)};
  function next(){
    topic=topicById(o.pick());task=topic.gen();counted=false;
    $i('Q').innerHTML=task.q;
    $i('Why').innerHTML=o.why?o.why(topic):'';$i('Why').hidden=!o.why;
    $i('Body').innerHTML=task.body;$i('Ans').innerHTML=ansHtml(task.ans,id+'a');
    const k=kindOf(task.ans),note=task.note||(k.note?k.note(task.ans):'');$i('Note').innerHTML=note;$i('Note').hidden=!note;
    $i('Msg').className='msg';solToggle(false);$i('SolBox').innerHTML=task.sol;
    $i('Hint').hidden=!task.hint;$i('Play').hidden=!task.fr;
    if(o.onNext)o.onNext(topic);
  }
  function scoreText(){$i('Score').textContent=sc.all?$t(`dobrze ${sc.ok} z ${sc.all}`,`${sc.ok} of ${sc.all} correct`):''}
  $i('Check').onclick=()=>{
    const r=ansCheck(task.ans,ansRead(id+'a',task.ans));ansMark(id+'a',r);
    if(r.empty){show($i('Msg'),'bad',r.msg||$t('Najpierw wpisz odpowiedź.','Type an answer first.'));return}
    if(!counted){counted=true;sc.all++;if(r.score===1)sc.ok++;rec(topic.id,r.score)}
    scoreText();
    const extra=r.html||'';
    if(r.score===1)show($i('Msg'),'ok',`<b>${$t('Dobrze.','Correct.')}</b> ${r.msg||''}${extra}`);
    else show($i('Msg'),r.score>0?'part':'bad',`<b>${r.score>0?$t('Częściowo.','Partly right.'):$t('Nie zgadza się.','Not quite.')}</b> ${r.msg||''} ${$t('Można poprawić odpowiedź, zajrzeć do podpowiedzi albo obejrzeć rozwiązanie krok po kroku.','You can correct the answer, look at the hint or watch the step-by-step solution.')}${extra}`);
  };
  $i('Hint').onclick=()=>show($i('Msg'),'info',`<b>${$t('Podpowiedź.','Hint.')}</b> ${task.hint}`);
  $i('Play').onclick=()=>play(task.fr,txt(tName(topic)),$i('Msg'),{noFrac:!!topic.noFrac});
  $i('Sol').onclick=()=>solToggle(!$i('SolBox').classList.contains('on'));
  $i('New').onclick=()=>{next();if(o.onNew)o.onNew()};
  return {next,refresh(){if(task)$i('SolBox').innerHTML=task.sol;scoreText()},get topic(){return topic}};
}

// ================= Ćwiczenia =================
const PRACT={};
function practiceShow(S,topic){
  let P=PRACT[S.id];
  if(!P){
    const root=document.createElement('div');root.dataset.prSubj=S.id;$('#cwBox').appendChild(root);
    P=PRACT[S.id]={root,topic:null};
    P.inst=makePractice(root,{id:'cw'+S.id,pick:()=>P.topic});
  }
  $$('#cwBox>[data-pr-subj]').forEach(el=>{el.hidden=el.dataset.prSubj!==S.id});
  const has=id=>id&&S.topics.some(t=>t.id===id),saved=store.get('kratka-temat-'+S.id);
  const want=has(topic)?topic:P.topic||(has(saved)?saved:has(S.start)?S.start:S.topics[0].id);
  if(want!==P.topic){P.topic=want;store.set('kratka-temat-'+S.id,want);P.inst.next()}
  practiceHead(S);
}
function practiceHead(S){
  const t=topicById(PRACT[S.id].topic);
  $('#cwSec').innerHTML=sName(S)+' · '+secName(t.sec);$('#cwTitle').innerHTML=tName(t);
  const k=S.topics.indexOf(t),n=S.topics.length;
  $('#topicCount').textContent=`${k+1} / ${n}`;
  $('#topicPrev').disabled=k===0;$('#topicNext').disabled=k===n-1;
  $('#cwOpts').innerHTML=S.opts?S.opts():'';$('#cwOpts').hidden=!S.opts;
  syncNoFrac();
}
function tocRefresh(){if(R.subj)navRender()}

// ================= Postęp i powtórki =================
const PRS={};
function prData(S){
  if(!PRS[S.id]){let d={};try{d=JSON.parse(store.get(S.prKey,'{}'))||{}}catch(e){d={}}PRS[S.id]=d}
  return PRS[S.id];
}
const prGet=id=>{const t=topicById(id);return t?prData(subjById(t.subj))[id]:null};
function rec(id,score){
  const t=topicById(id);if(!t)return;
  const S=subjById(t.subj),P=prData(S),r=P[id]||(P[id]={n:0,h:[],t:0});
  r.n++;r.h.push(Math.round(score*100)/100);if(r.h.length>10)r.h.shift();r.t=Date.now();
  store.set(S.prKey,JSON.stringify(P));
  if(R.view==='postep'&&R.subj===S.id)prRender();
  tocRefresh();
}
const prAcc=id=>{const r=prGet(id);return r&&r.h.length?r.h.reduce((a,b)=>a+b,0)/r.h.length:null};
function prStatus(id){const a=prAcc(id);return a===null?['new',$t('nowy','new')]:a<.5?['bad',$t('słabo','weak')]:a<.8?['mid',$t('średnio','fair')]:['good',$t('dobrze','good')]}
function prWeight(id){const a=prAcc(id);if(a===null)return 1.3;return .2+(1-a)*2.2+Math.min(.6,(Date.now()-prGet(id).t)/864e6)}
// kwadraciki z wynikami ostatnich prób: pełny = dobrze, połowa = częściowo, czerwony = źle
function sqHtml(id,n=10,compact){
  const r=prGet(id),h=r?r.h.slice(-n):[];
  if(compact&&!h.length)return '';
  const cells=compact?h:[...Array(n-h.length).fill(null),...h];
  return `<span class="sq" aria-hidden="true">${cells.map(v=>v===null?'<i></i>':`<i class="${v>=1?'g':v>0?'m':'b'}"></i>`).join('')}</span>`;
}
let prQueue=[],prLast='';
function prPick(){
  const S=subjById(R.subj);
  if(prQueue.length){const id=prQueue.shift();prLast=id;return id}
  for(let tries=0;tries<3;tries++){
    const ws=S.topics.map(t=>prWeight(t.id)),sum=ws.reduce((a,b)=>a+b,0);let x=Math.random()*sum,id=S.topics[0].id;
    for(let k=0;k<S.topics.length;k++){x-=ws[k];if(x<=0){id=S.topics[k].id;break}}
    if(id!==prLast||tries===2){prLast=id;return id}
  }
}
function prWhy(t){
  const a=prAcc(t.id),[st]=prStatus(t.id),pct=a===null?0:Math.round(a*100);
  const w=st==='new'?$t('nowy temat, jeszcze nie ćwiczony','a new topic, not practised yet'):st==='bad'?$t(`słabo: ${pct}% w ostatnich próbach`,`weak: ${pct}% in recent attempts`):st==='mid'?$t(`średnio: ${pct}%, warto utrwalić`,`fair: ${pct}%, worth reinforcing`):$t('utrwalenie tematu, który już idzie dobrze','reinforcing a topic that already goes well');
  return `${$t('Powtórka','Review')} · ${secName(t.sec)} · ${tName(t)}. ${w[0].toUpperCase()+w.slice(1)}.`;
}
function prRender(){
  const S=subjById(R.subj);if(!S||!S.topics.length)return;
  $('#prEyebrow').innerHTML=sName(S);
  const ids=S.topics.map(t=>t.id),P=prData(S),done=ids.filter(id=>prAcc(id)!==null),n=ids.reduce((s,id)=>s+(P[id]?P[id].n:0),0);
  const avg=done.length?Math.round(100*done.reduce((s,id)=>s+prAcc(id),0)/done.length):0,cnt=k=>ids.filter(id=>prStatus(id)[0]===k).length;
  $('#prStats').innerHTML=[[n,$t('rozwiązanych zadań','tasks solved')],[done.length?avg+'%':'–',$t('średni wynik','average score')],[cnt('bad')+cnt('mid'),$t('tematów do powtórki','topics to review')],[`${cnt('good')}<small> / ${ids.length}</small>`,$t('tematów opanowanych','topics mastered')]].map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
  $('#prList').innerHTML=S.sections.map(sec=>`<div class="pr-sec">${secName(sec)}</div>`+S.topics.filter(t=>t.sec===sec).map(t=>{
    const a=prAcc(t.id),[cl,lab]=prStatus(t.id);
    return `<div class="pr-row"><a class="pr-name" href="#${S.id}-cwiczenia-${t.id}" title="${$t('Ćwicz ten temat','Practise this topic')}">${tName(t)}</a>${sqHtml(t.id,10)}<span class="pr-pct">${a===null?'–':pctS(a)}</span><span class="st ${cl}">${lab}</span></div>`;
  }).join('')).join('');
}
let PRP=null,PRP_S=null;
function prReviewClose(){PRP=null;PRP_S=null;$('#prBox').innerHTML=''}
function prStart(queue){
  prQueue=queue||[];
  if(!PRP||PRP_S!==R.subj){PRP=makePractice($('#prBox'),{id:'pr',pick:prPick,why:prWhy});PRP_S=R.subj}
  PRP.next();
  if(R.view!=='postep')location.hash=viewHref(subjById(R.subj),'postep');
  setTimeout(()=>$('#prBox').scrollIntoView({block:'start'}),30);
}
$('#prGo').onclick=()=>prStart();
$('#prReset').onclick=()=>{
  const m=$('#prMsg'),S=subjById(R.subj);
  show(m,'bad',$t(`Usunąć cały zapisany postęp z przedmiotu ${txt(sName(S))}? Tego nie da się cofnąć.`,`Delete all saved progress in ${txt(sName(S))}? This cannot be undone.`)+`<div class="actions"><button type="button" class="btn small danger" id="prYes">${$t('Tak, wyczyść','Yes, clear it')}</button><button type="button" class="btn ghost small" id="prNo">${$t('Anuluj','Cancel')}</button></div>`);
  $('#prYes').onclick=()=>{PRS[S.id]={};store.set(S.prKey,'{}');prRender();tocRefresh();show(m,'ok',$t('Postęp wyczyszczony.','Progress cleared.'))};
  $('#prNo').onclick=()=>{m.className='msg'};
};

// ================= Sprawdzian =================
const EXSEL={};let exN=8,exT=0,EX=null,exTimer=null;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=ms=>{const s=Math.max(0,Math.round(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
const pln=x=>{const s=String(Math.round(x*10)/10);return $t(s.replace('.',','),s)};
const exSel=S=>EXSEL[S.id]||(EXSEL[S.id]=new Set(S.sections));
function examShow(S){
  $('#exEyebrow').innerHTML=sName(S);
  const mine=EX&&EX.subj===S.id;
  $('#exSetup').hidden=mine;$('#exRun').hidden=!(mine&&!EX.done);$('#exRes').hidden=!(mine&&EX.done);
  if(!mine)exSetup(S);
}
function exSetup(S){
  const sel=exSel(S);
  $('#exSecs').innerHTML=S.sections.map((s,k)=>`<label class="chk" for="exs${k}"><input type="checkbox" id="exs${k}" data-exs="${escH(s)}"${sel.has(s)?' checked':''}> <span>${secName(s)}</span></label>`).join('');
  if(EX&&!EX.done&&EX.subj!==S.id)show($('#exMsg'),'info',$t(`Trwa sprawdzian z przedmiotu ${txt(sName(subjById(EX.subj)))}. <a href="${viewHref(subjById(EX.subj),'sprawdzian')}">Wróć do niego</a>.`,`A ${txt(sName(subjById(EX.subj)))} test is in progress. <a href="${viewHref(subjById(EX.subj),'sprawdzian')}">Go back to it</a>.`));
  else $('#exMsg').className='msg';
}
$('#exSecs').addEventListener('change',e=>{
  const c=e.target.closest('[data-exs]');if(!c)return;const sel=exSel(subjById(R.subj));
  if(c.checked)sel.add(c.dataset.exs);else if(sel.size>1)sel.delete(c.dataset.exs);else c.checked=true;
});
$('#exN').addEventListener('click',e=>{const b=e.target.closest('[data-exn]');if(!b)return;exN=+b.dataset.exn;$$('#exN button').forEach(c=>c.classList.toggle('on',c===b))});
$('#exT').addEventListener('click',e=>{const b=e.target.closest('[data-ext]');if(!b)return;exT=+b.dataset.ext;$$('#exT button').forEach(c=>c.classList.toggle('on',c===b))});
function exStart(){
  const S=subjById(R.subj),sel=exSel(S),secs=shuffle(S.sections.filter(s=>sel.has(s))),pools=secs.map(s=>shuffle(S.topics.filter(t=>t.sec===s))),ids=[];
  for(let k=0;ids.length<exN;k++){const p=pools[k%pools.length];ids.push((p.length?p.shift():pick(S.topics.filter(t=>t.sec===secs[k%secs.length]))).id)}
  EX={subj:S.id,items:shuffle(ids).map(id=>{const tp=topicById(id);return {tp,task:tp.gen(),inp:null}}),k:0,t0:Date.now(),end:exT?Date.now()+exT*60000:0,done:false};
  $('#exAns').innerHTML='';$('#exSetup').hidden=true;$('#exRes').hidden=true;$('#exRun').hidden=false;$('#exConfirm').className='msg';
  exShow(0);clearInterval(exTimer);exTimer=setInterval(exTick,1000);exTick();
}
function exTick(){
  if(!EX||EX.done){clearInterval(exTimer);return}
  if(EX.end){const left=EX.end-Date.now();$('#exClock').textContent=$t('zostało ','left ')+mmss(left);$('#exClock').classList.toggle('low',left<120000);if(left<=0)exFinish()}
  else $('#exClock').textContent=$t('czas ','time ')+mmss(Date.now()-EX.t0);
}
function exSave(){const it=EX.items[EX.k];it.inp=ansRead('exa',it.task.ans)}
const exAnswered=it=>it.inp&&!ansCheck(it.task.ans,it.inp).empty;
function exShow(k){
  if(EX.items[EX.k]&&$('#exAns').innerHTML)exSave();
  EX.k=k;const it=EX.items[k],N=EX.items.length;
  $('#exHead').textContent=$t(`Zadanie ${k+1} z ${N}`,`Task ${k+1} of ${N}`);$('#exTopic').innerHTML=secName(it.tp.sec)+' · '+tName(it.tp);
  $('#exQ').innerHTML=it.task.q;$('#exBody').innerHTML=it.task.body;$('#exAns').innerHTML=ansHtml(it.task.ans,'exa');ansFill('exa',it.task.ans,it.inp);
  const kd=kindOf(it.task.ans),note=it.task.note||(kd.note?kd.note(it.task.ans):'');$('#exNote').innerHTML=note+(note?' ':'')+$t('Odpowiedzi zapisują się same, do zadań można wracać.','Answers are kept automatically; you can go back to any task.');
  $('#exDots').innerHTML=EX.items.map((x,i)=>`<button type="button" class="${i===k?'cur':exAnswered(x)?'done':''}" data-exk="${i}" aria-label="${$t('Zadanie','Task')} ${i+1}">${i+1}</button>`).join('');
  $('#exPrev').disabled=k===0;$('#exNext').disabled=k===N-1;$('#exConfirm').className='msg';
}
$('#exDots').addEventListener('click',e=>{const b=e.target.closest('[data-exk]');if(b)exShow(+b.dataset.exk)});
$('#exPrev').onclick=()=>{if(EX.k>0)exShow(EX.k-1)};
$('#exNext').onclick=()=>{if(EX.k<EX.items.length-1)exShow(EX.k+1)};
$('#exStart').onclick=()=>{const m=$('#exMsg');show(m,'info',$t('Losowanie zadań…','Drawing tasks…'));setTimeout(()=>{try{exStart();m.className='msg'}catch(err){show(m,'bad',$t('Nie udało się wylosować zestawu: ','Could not draw a set of tasks: ')+err.message)}},20)};
$('#exEnd').onclick=()=>{
  exSave();const empty=EX.items.filter(it=>!exAnswered(it)).length,m=$('#exConfirm');
  if(!empty){exFinish();return}
  show(m,'bad',$t(`Bez odpowiedzi: ${empty} ${pl(empty,'zadanie','zadania','zadań')}. Oddać mimo to?`,`Unanswered: ${empty} ${empty===1?'task':'tasks'}. Hand in anyway?`)+`<div class="actions"><button type="button" class="btn small" id="exYes">${$t('Tak, oceń','Yes, grade it')}</button><button type="button" class="btn ghost small" id="exNo">${$t('Wracam do zadań','Back to the tasks')}</button></div>`);
  $('#exYes').onclick=exFinish;$('#exNo').onclick=()=>{m.className='msg'};
};
// skala ocen: polska (2,0–5,0) albo angielska (A–F)
const GRADES=()=>$t([[90,'5,0'],[80,'4,5'],[70,'4,0'],[60,'3,5'],[50,'3,0'],[0,'2,0']],[[90,'A'],[80,'B'],[70,'C'],[60,'D'],[0,'F']]);
function exFinish(){
  if(!EX||EX.done)return;
  if($('#exAns').innerHTML)exSave();
  EX.done=true;clearInterval(exTimer);EX.time=Date.now()-EX.t0;
  EX.items.forEach(it=>{const inp=it.inp||ansRead('__brak__',it.task.ans);it.inp=inp;it.r=ansCheck(it.task.ans,inp);rec(it.tp.id,it.r.score)});
  exResults();$('#exRun').hidden=true;$('#exRes').hidden=false;window.scrollTo(0,0);
}
function exResults(){
  const N=EX.items.length,pts=EX.items.reduce((s,it)=>s+it.r.score,0),pct=Math.round(100*pts/N),grade=GRADES().find(g=>pct>=g[0])[1],weak=[...new Set(EX.items.filter(it=>it.r.score<1).map(it=>it.tp.id))];
  const comment=pct>=90?$t('Materiał opanowany.','You have mastered the material.'):pct>=70?$t('Dobrze. Poniżej są zadania z błędami.','Good. The tasks with mistakes are listed below.'):pct>=50?$t('Zaliczone, ale tematy z błędami warto powtórzyć.','Passed, but the topics with mistakes are worth reviewing.'):$t('Na razie za mało. Najlepiej obejrzeć rozwiązania krok po kroku i zrobić powtórkę słabych tematów.','Not enough yet. Watch the step-by-step solutions and review your weak topics.');
  let h=`<div class="res-top"><div class="grade-box"><div class="grade">${grade}</div><div class="note">${$t('ocena','grade')}</div></div><div class="res-sum"><div class="res-pts">${pln(pts)} / ${N} ${$t('pkt','pts')}</div><div class="note">${pct}% · ${$t('czas','time')} ${mmss(EX.time)}</div><p>${comment}</p></div></div>
<div class="actions"><button type="button" class="btn" id="exAgain">${$t('Nowy sprawdzian','New test')}</button>${weak.length?`<button type="button" class="btn ghost" id="exRedo">${$t('Ćwicz tematy z błędami','Practise the topics with mistakes')} (${weak.length})</button>`:''}</div>
<h2 class="rule-h">${$t('Zadania','Tasks')}</h2>`;
  EX.items.forEach((it,i)=>{
    const s=it.r.score,cl=s===1?'good':s>0?'mid':'bad';
    h+=`<div class="rev"><div class="rev-head"><b>${$t('Zadanie','Task')} ${i+1}</b><span class="st ${cl}">${pln(s)} / 1 ${$t('pkt','pt')}</span><span class="note">${secName(it.tp.sec)} · ${tName(it.tp)}</span></div>
<div class="task-q">${it.task.q}</div>${it.task.body}
<div class="ansline"><span class="note">${$t('Twoja odpowiedź:','Your answer:')}</span> ${it.r.empty?`<i class="note">${$t('brak','none')}</i>`:inpShow(it.task.ans,it.inp)}</div>
<div class="ansline"><span class="note">${$t('Poprawna:','Correct:')}</span> ${ansShow(it.task.ans)}</div>
<div class="actions">${it.task.fr?`<button type="button" class="btn ghost small play" data-exp="${i}">${$t('Krok po kroku','Step by step')}</button>`:''}<button type="button" class="btn ghost small" data-exs2="${i}">${$t('Rozwiązanie','Solution')}</button></div><div class="sol" id="exSol${i}">${it.task.sol}</div></div>`;
  });
  $('#exRes').innerHTML=h;
  $('#exAgain').onclick=()=>{EX=null;examShow(subjById(R.subj))};
  if(weak.length)$('#exRedo').onclick=()=>prStart(weak.slice());
}
$('#exRes').addEventListener('click',e=>{
  const p=e.target.closest('[data-exp]');if(p){const it=EX.items[+p.dataset.exp];play(it.task.fr,txt(tName(it.tp)),null,{noFrac:!!it.tp.noFrac});return}
  const s=e.target.closest('[data-exs2]');if(s)$('#exSol'+s.dataset.exs2).classList.toggle('on');
});

// ================= Język =================
function setLang(l,rerender){
  LANG.cur=l==='en'?'en':'pl';
  const h=document.documentElement;h.dataset.lang=LANG.cur;h.lang=LANG.cur;store.set('kratka-lang',LANG.cur);
  $$('.lang [data-lang]').forEach(b=>{b.classList.toggle('on',b.dataset.lang===LANG.cur);b.setAttribute('aria-pressed',b.dataset.lang===LANG.cur)});
  $('#plClose').setAttribute('aria-label',$t('Zamknij','Close'));
  $$('[data-al-en]').forEach(el=>el.setAttribute('aria-label',LANG.cur==='en'?el.dataset.alEn:el.dataset.alPl));
  plSetPlay(false);
  if(!rerender)return;
  // treści z JS powstają od nowa w nowym języku (postęp i ustawienia zostają)
  if(!$('#pl').hidden)plClose();
  bsClose();
  Object.values(PRACT).forEach(P=>P.inst.next());
  if(PRP)PRP.next();
  if(EX&&!EX.done&&R.view==='sprawdzian')exShow(EX.k);
  if(EX&&EX.done)exResults();
  HOOKS.lang.forEach(f=>f());
  if(inNotebook())goNotebook();else go(R.subj,R.view);
}
document.querySelector('.lang').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b&&b.dataset.lang!==LANG.cur)setLang(b.dataset.lang,true)});

// ================= Ustawienia przedmiotów: „bez ułamków” (algebra) i g (fizyka) =================
function syncNoFrac(){$$('[data-nofrac]').forEach(c=>{c.checked=OPT.noFrac})}
function setNoFrac(v){
  OPT.noFrac=!!v;store.set('kratka-bez-ulamkow',OPT.noFrac?'1':'0');syncNoFrac();
  // te same zadania, tylko rozwiązania liczone od nowa
  Object.values(PRACT).forEach(P=>P.inst.refresh());if(PRP)PRP.refresh();
  HOOKS.noFrac.forEach(f=>f());
  if(!$('#pl').hidden&&PL.make){try{PL.fr=PL.make();PL.k=0;plSetPlay(false);plSteps();plRender(true)}catch(e){}}
}
document.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('[data-nofrac]'))setNoFrac(e.target.checked)});
function setG(v){
  OPT.g=v===10?10:9.81;store.set('kratka-g',OPT.g===10?'10':'9.81');
  $$('[data-g]').forEach(b=>b.classList.toggle('on',+b.dataset.g===OPT.g));
  HOOKS.g.forEach(f=>f());
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-g]');if(b)setG(+b.dataset.g)});

// ================= Start =================
function kratkaStart(){
  HOOKS.start.forEach(f=>f());
  setLang(LANG.cur,false);syncNoFrac();
  route();
}
