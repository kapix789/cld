// Testy algebry (silnik i rejestr tematów), bez przeglądarki:  node tests/algebra.test.js
const E=require('./load')(['handCost','OPT','elimPlan','planFrac','planGroups','richUni','rnd','gaussFrames','LANG','F','M','rref','sysSolution','genExamSys','sysAns','checkGeneral','genSys','sysFrames','sysMethodHtml','parseSystem','linSolve','numbersSolve','solve','genNum','genLin','NT','numFrames','genTask','genEq','symFrames',
  'TOPICS','SECTIONS','SUBJECTS','ansCheck','ansHtml','ansShow','inpShow','checkChain','chainReport','parseChain','mulReport','EX_CHAIN','detF','laplaceTerms','genParam','polyFromDet','polyAt','paramAt','rankOf','genRank','checkAnswer','rP','unimod2']);
const {F,M}=E;let fails=0,checks=0;
const ok=(c,m)=>{checks++;if(!c){fails++;if(fails<25)console.log('✗',m)}};
const mat=a=>M.ints(a);
const s=x=>x.str().replace('−','-');

// klatki animacji: struktura i zakresy
function frames(fr,tag){
  ok(Array.isArray(fr)&&fr.length>0,tag+': brak klatek');
  (fr||[]).forEach((f,k)=>{
    const bad=m=>ok(false,`${tag} klatka ${k}: ${m}`);
    if(!f.t)bad('bez tytułu');
    (f.B||[]).forEach(b=>{if(!b.M.length||b.M.some(r=>r.length!==b.M[0].length))bad('nierówna macierz');if(b.M.flat().some(x=>typeof x!=='string'))bad('komórka nie jest tekstem')});
    const nl=(f.C||[]).length;
    (f.U||[]).forEach(u=>{
      if(u.line!==undefined&&(u.line<0||u.line>=nl))bad('linia poza zakresem');
      if(u.v!==undefined||u.add){const b=f.B&&f.B[u.b];if(!b||!b.M[u.i]||b.M[u.i][u.j]===undefined)bad('komórka poza zakresem')}
    });
    if(/undefined|NaN|\[object/.test(JSON.stringify(f)))bad('undefined/NaN');
  });
}
// poprawna odpowiedź w formacie pól
function goodInput(ans){
  if(ans.kind==='mat')return ans.M.flat().map(s);
  if(ans.kind==='num')return [s(ans.v)];
  if(ans.kind==='formula')return [E.rP(ans.sol.P).replace(/<sup>T<\/sup>/g,'^T').replace(/<sup>−1<\/sup>/g,'^-1').replace(/<sup>(\d)<\/sup>/g,'^$1').replace(/<span class="fr"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g,'$1/$2').replace(/<[^>]+>/g,'').replace(/−/g,'-').replace(/\s/g,'')];
  if(ans.kind==='sys')return {type:ans.type,vals:ans.type==='one'?ans.vals.map(s):ans.type==='inf'?genText(ans):ans.names.map(()=> '')};
  if(ans.kind==='param')return [0,1,2].map(k=>ans.roots[k]?{a:s(ans.roots[k].a),type:ans.roots[k].type}:{a:'',type:''});
}

// rozwiązanie ogólne jako tekst wpisany przez ucznia (zmienne swobodne zostają puste)
function genText(ans,keepFree){
  const nv=ans.names.length,sol=E.sysSolution(E.rref(ans.Ab,nv),nv);
  return ans.names.map((v,j)=>{
    if(sol.free.includes(j))return keepFree?v:'';
    const f=sol.forms[j];let t=f.k.z?'':s(f.k);
    sol.free.forEach(q=>{const c=f.c[q];if(c.z)return;const a=c.abs();t+=(c.n<0?'-':(t?'+':''))+(a.one?'':a.str())+ans.names[q]});
    return t||'0';
  });
}
// 1. każdy temat z rejestru: generuje, sprawdza poprawną odpowiedź na 100%, ma rozwiązanie i klatki
const ids=new Set();
for(const t of E.TOPICS){
  ok(!ids.has(t.id),'powtórzone id '+t.id);ids.add(t.id);
  for(let i=0;i<8;i++){
    const task=t.gen(),tag=`${t.id}#${i}`;
    ok(task.q&&task.body&&task.sol,tag+': brak q/body/sol');
    ok(!/undefined|NaN/.test(task.q+task.body+task.sol+E.ansHtml(task.ans,'x')+E.ansShow(task.ans)),tag+': undefined w HTML');
    const r=E.ansCheck(task.ans,goodInput(task.ans));
    ok(r.score===1&&!r.empty,`${tag}: poprawna odpowiedź oceniona na ${r.score} ${r.msg||''}`);
    if(task.fr&&i<3)frames(task.fr(),tag);
  }
}
// 2. puste odpowiedzi są puste, a złe dostają < 1
for(const t of E.TOPICS){const task=t.gen(),a=task.ans;
  const empty=a.kind==='mat'?a.M.flat().map(()=> ''):a.kind==='sys'?{type:'one',vals:a.names.map(()=> '')}:a.kind==='param'?[0,1,2].map(()=>({a:'',type:''})):[''];
  ok(E.ansCheck(a,empty).empty,t.id+': pusta odpowiedź nie jest pusta');
  if(a.kind==='mat'){const g=goodInput(a);g[0]=g[0]==='999'?'998':'999';ok(E.ansCheck(a,g).score<1,t.id+': zła macierz zaliczona')}
  if(a.kind==='num')ok(E.ansCheck(a,['12345']).score===0,t.id+': zła liczba zaliczona');
}
// 3. wyznaczniki: Laplace = eliminacja
for(let i=0;i<40;i++){const A=M.make(4,4,()=>F(Math.floor(Math.random()*9)-4));const {t}=E.laplaceTerms(A);ok(t.reduce((x,o)=>x.add(o.v),F(0)).eq(E.detF(A)),'Laplace ≠ det')}
// 4. układy z parametrem: pierwiastki zerują wyznacznik, typy z Gaussa
for(let i=0;i<20;i++){const P=E.genParam();ok(P&&P.roots.length>=1,'genParam pusty');P.roots.forEach((r,k)=>{ok(E.polyAt(P.c,r).z,'pierwiastek nie zeruje W');ok(E.rref(E.paramAt(P,r),P.names.length).type===P.types[k],'zły typ')});
  const t2=F(7);ok(E.rref(E.paramAt(P,t2),P.names.length).type==='one'||P.roots.some(r=>r.eq(t2)),'poza pierwiastkami nie jedno rozwiązanie')}
// 5. Znajdź mój błąd
const steps=E.checkChain(E.parseChain(E.EX_CHAIN).mats);
ok(steps[0].ok&&!steps[1].ok,'przykład: zły wynik sprawdzania kroków');
const g=steps[1].bad[0];ok(g&&g.i===2&&g.g&&g.g.ok.filter(x=>!x).length===1&&s(g.g.exp[2])==='-5','przykład: nie wskazano kolumny 3 / wartości −5');
ok(/Pierwszy błąd jest w kroku 2/.test(E.chainReport(E.EX_CHAIN)),'raport: brak informacji o kroku 2');
const good=`1 2 | 5\n3 4 | 6\n\n1 2 | 5\n0 -2 | -9\n\n1 0 | -4\n0 1 | 9/2`;ok(/Wszystkie kroki są poprawne/.test(E.chainReport(good)),'poprawny łańcuch oznaczony jako błędny');
ok(/postaci schodkowej zredukowanej/.test(E.chainReport(good)),'brak informacji o postaci zredukowanej');
const inv=`2 1 | 1 0\n1 1 | 0 1\n\n1 1 | 0 1\n2 1 | 1 0\n\n1 1 | 0 1\n0 -1 | 1 -2\n\n1 0 | 1 -1\n0 -1 | 1 -2\n\n1 0 | 1 -1\n0 1 | -1 2`;
ok(/poprawna odwrotność/.test(E.chainReport(inv)),'odwrotność nierozpoznana');
ok(/Błędnych elementów: 1/.test(E.mulReport(mat([[2,1],[-1,3]]),mat([[1,4],[2,-2]]),mat([[4,6],[5,-2]]))),'mnożenie: zły raport');
// 6. stare funkcje nadal działają
for(let k=0;k<E.NT.length;k++){const t=E.NT[k];if(t.lin){frames(E.genLin(t).fr(),'lin '+t.eq);continue}for(const n of [2,3])for(const rect of [false,true]){const T=E.genNum(n,k,rect);ok(M.eq(T.Lv,T.Rv),`X nie spełnia ${t.eq}`)}}
for(const sz of [2,3,4,'r'])for(const mode of ['one','any']){const G=E.genSys(sz,mode);for(const me of ['gauss','mac','cra'])frames(E.sysFrames(G.Ab,G.names,me),`układ ${sz} ${mode} ${me}`)}
for(let i=0;i<20;i++){const q=E.genEq(1+i%3);try{const so=E.solve(q);ok(E.checkAnswer(so,goodInput({kind:'formula',sol:so})[0]),'wzór z rozwiązania nie przechodzi: '+q)}catch(e){if(!e.lin)ok(false,q+' '+e.message)}}
// 6b. układy jak na sprawdzianie i rozwiązanie ogólne
const types={};
for(let i=0;i<40;i++){
  const g=E.genExamSys(),a=E.sysAns(g.Ab,g.names);types[a.type]=(types[a.type]||0)+1;
  ok(g.names.join()==='x1,x2,x3,x4'&&g.Ab.length===4,'egzamin: zły kształt układu');
  ok(g.Ab.flat().every(x=>Math.abs(x.n)<=24&&x.d===1),'egzamin: zbyt duże albo ułamkowe liczby');
  if(a.type==='inf'){
    ok(E.checkGeneral(a,genText(a)).score===1,'egzamin: poprawne rozwiązanie ogólne odrzucone');
    ok(E.checkGeneral(a,genText(a,true)).score===1,'egzamin: rozwiązanie z wpisanymi parametrami odrzucone');
    const bad=genText(a);const j=bad.findIndex(x=>x);bad[j]=bad[j]+'+1';ok(E.checkGeneral(a,bad).score<1,'egzamin: błędne rozwiązanie ogólne zaliczone');
    ok(E.checkGeneral(a,a.names.map(()=> '')).score===.5,'egzamin: puste rozwiązanie ogólne nie daje połowy punktu');
  }
}
ok(types.none>3&&types.inf>3,'egzamin: za mało układów sprzecznych/nieoznaczonych '+JSON.stringify(types));
{ // ten sam zbiór rozwiązań przy innym wyborze parametrów: x+y+z=1, x-y=0 → z swobodne albo x swobodne
  const sy=E.parseSystem('x + y + z = 1\nx - y = 0'),a=E.sysAns(sy.Ab,sy.names);
  ok(E.checkGeneral(a,['','x','1-2x']).score===1,'rozwiązanie ogólne z x jako parametrem odrzucone');
  ok(E.checkGeneral(a,['1/2-1/2z','1/2-1/2z','']).score===1,'rozwiązanie ogólne z z jako parametrem odrzucone');
  ok(E.checkGeneral(a,['','','']).score===.5,'puste pola: zła punktacja');
  ok(E.checkGeneral(a,['1/2-1/2z','','']).score<1,'dwa parametry zamiast jednego zaliczone');
  ok(/nieznana zmienna/.test(E.checkGeneral(a,['1-2w','x','']).msg),'nieznana zmienna nie wykryta');
}
{ // układ z kartki (Spr. nr 6) — sprzeczny
  const sy=E.parseSystem('3x1 + 2x2 + 5x3 + 4x4 = 3\n2x1 + 3x2 + 6x3 + 8x4 = 5\n4x1 - 4x2 - 4x3 - 16x4 = -8\n4x1 + x2 + 4x3 = 2'),a=E.sysAns(sy.Ab,sy.names);
  ok(a.type==='none'&&a.rank===2,'układ ze sprawdzianu: oczekiwano sprzecznego, rz A = 2');
  const sy2=E.parseSystem('3x1 + 2x2 + 5x3 + 4x4 = 3\n2x1 + 3x2 + 6x3 + 8x4 = 5\n4x1 - 4x2 - 4x3 - 16x4 = -8\n4x1 + x2 + 4x3 = 1'),a2=E.sysAns(sy2.Ab,sy2.names);
  ok(a2.type==='inf'&&E.checkGeneral(a2,genText(a2)).score===1,'wersja nieoznaczona układu ze sprawdzianu');
}
// 6b2. poziom trudności zadań „jak na sprawdzianie” (wzór: kartka ucznia — 6 operacji, liczby do 16, ok. 10 minut)
{
  const H=[];for(let i=0;i<40;i++){const g=E.genExamSys();H.push(E.handCost(g.Ab,4))}
  const q90=k=>H.map(h=>h[k]).sort((a,b)=>a-b)[Math.floor(.9*(H.length-1))];
  ok(q90('ops')<=8,'za dużo operacji w zadaniach jak na sprawdzianie: '+q90('ops'));
  ok(q90('max')<=16,'za duże liczby w zadaniach jak na sprawdzianie: '+q90('max'));
  ok(H.every(h=>h.fr===0),'ułamki w zadaniach jak na sprawdzianie');
  ok(H.filter(h=>h.mult>1).length<=2,'za dużo mnożenia całych wierszy');
  const G=[];for(let i=0;i<20;i++){const g=E.genSys(4,'one');G.push(E.handCost(g.Ab,4))}
  ok(G.map(h=>h.max).sort((a,b)=>a-b)[17]<=16,'Gauss 4×4: za duże liczby');
}
// 6c. eliminacja bez ułamków: ten sam wynik co RREF, ułamki tylko gdy wynik jest ułamkowy (i dopiero na końcu)
{
  const key=(A,n)=>JSON.stringify(A.map(r=>r.slice(0,n).map(x=>x.str())));
  for(let i=0;i<150;i++){
    const n=E.rnd(2,4),m=n+E.rnd(-1,1),A=M.make(m,n+1,()=>F(E.rnd(-6,8))),res=E.rref(A,n),pl=E.elimPlan(A,n);
    ok(key(res.A,n)===key(pl.A,n),'plan bez ułamków: inny wynik niż RREF');
    const fin=pl.A.flat().some(x=>x.d!==1),mid=pl.ev.some(e=>e.k!=='norm'&&e.A&&e.A.flat().some(x=>x.d!==1));
    ok(!mid,'ułamek przed końcowym dzieleniem');
    if(!fin)ok(E.planFrac(pl)===0,'całkowity wynik, a w krokach są ułamki');
    // animacja: każda klatka zaczyna się tam, gdzie skończyła poprzednia
    if(i<30){const fr=E.gaussFrames(A,n,{mode:'sys',names:['x','y','z','t'].slice(0,n)}).frames;let prev=null;
      for(const f of fr){if(!f.B||f.B.length!==1)continue;const st=f.B[0].M.map(r=>r.slice());if(prev)ok(JSON.stringify(prev)===JSON.stringify(st),'animacja: klatka nie zaczyna się od stanu poprzedniej');(f.U||[]).filter(u=>u.v!==undefined).sort((a,b)=>a.t-b.t).forEach(u=>{st[u.i][u.j]=u.v});prev=st}}
  }
  for(let i=0;i<40;i++){const A=E.richUni(3),I=M.I(3),pl=E.elimPlan(A.map((r,k)=>[...r,...I[k]]),3,{stop:true});ok(E.planFrac(pl)===0&&M.eq(M.mul(A,pl.A.map(r=>r.slice(3))),I),'odwrotna z det ±1: ułamki albo zły wynik')}
  const sy=E.parseSystem('3x1 + 2x2 + 5x3 + 4x4 = 3\n2x1 + 3x2 + 6x3 + 8x4 = 5\n4x1 - 4x2 - 4x3 - 16x4 = -8\n4x1 + x2 + 4x3 = 2'),pl=E.elimPlan(sy.Ab,4,{sys:true});
  ok(E.planFrac(pl)===0&&pl.contra,'układ z kartki: ułamki w krokach albo brak sprzeczności');
}
// 6d. tryb klasyczny (pole „Licz bez ułamków” odznaczone): ten sam wynik, animacja spójna
E.OPT.noFrac=false;
for(let i=0;i<60;i++){
  const n=E.rnd(2,4),m=n+E.rnd(-1,1),A=M.make(m,n+1,()=>F(E.rnd(-6,8))),res=E.rref(A,n),pl=E.elimPlan(A,n);
  ok(JSON.stringify(res.A.map(r=>r.slice(0,n).map(x=>x.str())))===JSON.stringify(pl.A.map(r=>r.slice(0,n).map(x=>x.str()))),'klasycznie: inny wynik niż RREF');
  if(i<15){const fr=E.gaussFrames(A,n,{mode:'sys',names:['x','y','z','t'].slice(0,n)}).frames;frames(fr,'klasycznie');let prev=null;
    for(const f of fr){if(!f.B||f.B.length!==1)continue;const st=f.B[0].M.map(r=>r.slice());if(prev)ok(JSON.stringify(prev)===JSON.stringify(st),'klasycznie: animacja niespójna');(f.U||[]).filter(u=>u.v!==undefined).sort((a,b)=>a.t-b.t).forEach(u=>{st[u.i][u.j]=u.v});prev=st}}
}
for(const t of E.TOPICS){const x=t.gen();ok(typeof x.sol==='string'&&x.sol.length>0,'klasycznie: brak rozwiązania '+t.id);if(x.fr)frames(x.fr(),'klasycznie '+t.id)}
E.OPT.noFrac=true;
// 7. tryb angielski: każdy temat działa i nie zostaje w nim polski tekst
E.LANG.cur='en';
const PLC=/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ„]/;
for(const t of E.TOPICS){
  ok(t.en,`${t.id}: brak angielskiej nazwy (pole en)`);
  for(let i=0;i<3;i++){
    const task=t.gen(),tag=`EN ${t.id}#${i}`;
    const html=task.q+task.body+task.sol+(task.hint||'')+E.ansHtml(task.ans,'x')+E.ansShow(task.ans)+(task.fr&&i===0?JSON.stringify(task.fr()):'');
    const m=html.match(PLC);ok(!m,`${tag}: polski tekst w trybie EN: …${m?html.slice(Math.max(0,m.index-40),m.index+30):''}…`);
    ok(E.ansCheck(task.ans,goodInput(task.ans)).score===1,`${tag}: poprawna odpowiedź nie zaliczona`);
  }
}
ok(!PLC.test(E.chainReport(E.EX_CHAIN)),'EN: polski tekst w „Znajdź błąd”');
E.LANG.cur='pl';
console.log(`${checks} sprawdzeń, błędów: ${fails}`);process.exit(fails?1:0);
