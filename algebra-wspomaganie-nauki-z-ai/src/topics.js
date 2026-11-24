// =====================================================================
//  REJESTR TEMATÓW — tu dopisujesz nowe typy zadań
// =====================================================================
//  Żeby dodać nowy temat, dopisz jeden obiekt do tablicy TOPICS (na dole pliku):
//
//    { id:'moj-temat', sec:'Dział', name:'Krótka nazwa', gen: () => zadanie }
//
//  `id` musi być unikalne i stałe (pod nim zapisuje się postęp ucznia).
//  `gen()` losuje nowe zadanie i zwraca obiekt:
//
//    q     polecenie (HTML), np. 'Oblicz det <i>A</i>'
//    body  treść zadania: macierze, równanie, układ (HTML)
//    ans   oczekiwana odpowiedź — jedna z postaci:
//            {kind:'mat', M:[[Fr]], lab:'<i>X</i>'}                 siatka pól na macierz
//            {kind:'num', v:Fr, lab:'det <i>A</i>'}                 jedna liczba
//            {kind:'formula', sol}                                  wzór na X (wynik solve())
//            {kind:'sys', type:'one'|'inf'|'none', names, vals}     układ równań
//            {kind:'param', roots:[{a:Fr, type:'inf'|'none'}]}     dyskusja układu z parametrem
//    sol   pełne rozwiązanie (HTML)
//    fr    () => klatki animacji „krok po kroku” (opcjonalnie; format opisany w engine.js)
//    hint  podpowiedź (HTML, opcjonalnie)
//
//  Ćwiczenia, Sprawdzian, Postęp i Powtórki biorą tematy stąd automatycznie —
//  w interfejsie niczego więcej nie trzeba zmieniać.
//  Liczby to ułamki Fr: F(3), F(-1,2). Macierze: M.ints([[1,2],[3,4]]).
// =====================================================================

const givenH=g=>`<div class="given">${g.map(([n,A])=>`<span class="gv"><i>${n}</i> = ${M.html(A)}</span>`).join('')}</div>`;
const eqH=s=>`<div class="eq">${s}</div>`;

// statyczny podgląd klatki (stan końcowy jej plansz) — przydaje się do rozwiązań tekstowych
function frameStatic(f){
  const V=(f.B||[]).map(b=>b.M.map(r=>r.slice()));
  (f.U||[]).forEach(u=>{if(u.v!==undefined)V[u.b][u.i][u.j]=u.v});
  return (f.B||[]).map((b,bi)=>(bi?` ${(f.J&&f.J[bi-1])||''} `:'')+`<span class="mat${b.det?' det':''}" style="grid-template-columns:repeat(${V[bi][0].length},auto)">${V[bi].flat().map((x,k)=>`<span${k%V[bi][0].length===b.bar?' class="bl"':''}>${x}</span>`).join('')}</span>`).join('');
}

// ---------- Wyznaczniki ----------
function genDet(n){
  for(;;){
    const A=M.make(n,n,()=>F(rich(n===2?-6:-4,n===2?7:5)));const d=detF(A);
    if(Math.abs(d.n)<=(n===2?60:90)&&(!d.z||Math.random()<.12))return A;
  }
}
function genDet4(){
  for(;;){
    const A=M.make(4,4,()=>F(rich(-3,4,.15))),k=rnd(0,3),row=Math.random()<.6;
    [0,1,2,3].sort(()=>Math.random()-.5).slice(0,2).forEach(q=>{if(row)A[k][q]=F(0);else A[q][k]=F(0)});
    if(Math.abs(detF(A).n)<=150)return A;
  }
}
function laplaceLine(A){
  const n=A.length;let best=null;
  for(let i=0;i<n;i++){const z=A[i].filter(x=>x.z).length;if(!best||z>best.z)best={row:true,k:i,z}}
  for(let j=0;j<n;j++){const z=A.filter(r=>r[j].z).length;if(z>best.z)best={row:false,k:j,z}}
  return best;
}
const minorOf=(A,i,j)=>A.filter((_,r)=>r!==i).map(r=>r.filter((_,c)=>c!==j));
function laplaceTerms(A){
  const L=laplaceLine(A),n=A.length,t=[];
  for(let q=0;q<n;q++){
    const i=L.row?L.k:q,j=L.row?q:L.k,a=A[i][j];if(a.z)continue;
    const s=(i+j)%2?-1:1,Mi=minorOf(A,i,j),dm=detF(Mi);
    t.push({i,j,a,s,Mi,dm,v:F(s).mul(a).mul(dm)});
  }
  return {L,t};
}
const lapTerm=o=>`(−1)<sup>${o.i+1}+${o.j+1}</sup> · ${fmt(o.a)} · ${fmt(o.dm)}`;
function laplaceHtml(A,lab='det <i>A</i>'){
  const {L,t}=laplaceTerms(A),v=detF(A);
  let h=`<p>Rozwijam względem ${L.row?'wiersza':'kolumny'} ${L.k+1} — ma najwięcej zer (${L.z}), więc liczenia jest najmniej. Każdy niezerowy element mnożę przez znak (−1)<sup><i>i</i>+<i>j</i></sup> i wyznacznik minora — macierzy bez wiersza i kolumny tego elementu.</p>`;
  t.forEach(o=>{
    h+=`<div class="line">(−1)<sup>${o.i+1}+${o.j+1}</sup> · ${fmt(o.a)} · ${matH(o.Mi,{det:true})}</div>`;
    h+=`<details><summary>Minor <i>M</i><sub>${o.i+1}${o.j+1}</sub> (Sarrus)</summary>${detLines(o.Mi)}</details>`;
    h+=`<div class="line">= ${lapTerm(o)} = <b>${o.v.html()}</b></div>`;
  });
  return h+`<div class="line res">${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = ${v.html()}</div>`;
}
function laplaceFrames(A,lab='det <i>A</i>',sec="Rozwinięcie Laplace'a"){
  const {L,t}=laplaceTerms(A),v=detF(A),fr=[];
  fr.push({sec,t:`Wybieram ${L.row?'wiersz':'kolumnę'} ${L.k+1}`,x:`Rozwijam względem wiersza albo kolumny z największą liczbą zer — tu ${L.row?'wiersz':'kolumna'} ${L.k+1} ma ${L.z} ${pl(L.z,'zero','zera','zer')}. Składnik z zerem jest zerem, więc liczę tylko ${t.length} ${pl(t.length,'składnik','składniki','składników')}.`,
    B:[bd(A,{det:true,lab,hl:L.row?{rows:{[L.k]:'src'}}:{cols:{[L.k]:'src'}}})]});
  t.forEach((o,k)=>{
    const ml=`<i>M</i><sub>${o.i+1}${o.j+1}</sub>`;
    fr.push({sec,t:`Składnik ${k+1}: element ${o.a.html()}`,x:`Element stoi w wierszu ${o.i+1} i kolumnie ${o.j+1}. Skreślam ten wiersz i tę kolumnę — zostaje minor ${ml}. Znak: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`,
      B:[bd(A,{det:true,lab,hl:{rows:{[o.i]:'dim'},cols:{[o.j]:'dim'},cells:{[o.i+','+o.j]:'piv'}}}),bd(o.Mi,{det:true,lab:ml})],J:['→']});
    fr.push(...detFrames(o.Mi,'det '+ml,sec,false));
    fr.push({sec,t:`Składnik ${k+1} = ${o.v.html()}`,x:'Znak · element · wyznacznik minora:',C:[{h:`${lapTerm(o)} = <b>${o.v.html()}</b>`,full:true}],U:[{t:.4,line:0}]});
  });
  fr.push({sec,t:`${lab} = ${v.html()}`,x:'Dodaję wszystkie składniki.',B:[bd(A,{det:true,lab})],C:[{h:`${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = <b>${v.html()}</b>`,full:true}],U:[{t:.5,line:0}]});
  return fr;
}
function genDetProp(){
  const n=pick([2,3]),a=F(pick([-3,-2,2,3,4,5])),b=F(pick([-2,2,3,4,-4])),k=pick([2,3,-2]),kS=F(k).str(),kn=F(k**n);
  const T=pick([
    ()=>({e:`det(${kS}<i>A</i>)`,v:kn.mul(a),w:[`Liczba przed macierzą ${n}×${n} wychodzi w potędze ${n}: det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.html()}·${fmt(a)}`]}),
    ()=>({e:'det(<i>AB</i>)',v:a.mul(b),w:['det(<i>AB</i>) = det <i>A</i> · det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>−1</sup>)',v:F(1).div(a),w:['det(<i>A</i><sup>−1</sup>) = 1 / det <i>A</i>']}),
    ()=>({e:'det(<i>A</i><sup>T</sup><i>B</i>)',v:a.mul(b),w:['det(<i>A</i><sup>T</sup>) = det <i>A</i>','det(<i>A</i><sup>T</sup><i>B</i>) = det <i>A</i> · det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>2</sup><i>B</i><sup>−1</sup>)',v:a.mul(a).div(b),w:['det(<i>A</i><sup>2</sup>) = (det <i>A</i>)<sup>2</sup>','det(<i>B</i><sup>−1</sup>) = 1 / det <i>B</i>']}),
    ()=>({e:`det(${kS}<i>A</i><sup>T</sup><i>B</i><sup>−1</sup>)`,v:kn.mul(a).div(b),w:[`liczba ${kS} przed macierzą ${n}×${n} daje (${kS})<sup>${n}</sup> = ${kn.html()}`,'det(<i>A</i><sup>T</sup>) = det <i>A</i>','det(<i>B</i><sup>−1</sup>) = 1 / det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>−1</sup><i>B</i><sup>T</sup><i>A</i>)',v:b,w:['det(<i>A</i><sup>−1</sup>) · det <i>A</i> = 1 — skracają się','zostaje det(<i>B</i><sup>T</sup>) = det <i>B</i>']}),
    ()=>({e:`det((${kS}<i>A</i>)<sup>−1</sup>)`,v:F(1).div(kn.mul(a)),w:[`det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.mul(a).html()}`,'det(<i>M</i><sup>−1</sup>) = 1 / det <i>M</i>']}),
  ])();
  const data=`<p class="f" style="font-size:18px"><i>A</i>, <i>B</i> — macierze ${n}×${n}, &nbsp;det <i>A</i> = ${a.html()}, &nbsp;det <i>B</i> = ${b.html()}.</p>`;
  return {q:`Oblicz ${T.e}`,body:data,ans:{kind:'num',v:T.v,lab:T.e},
    sol:`<p>Korzystam z własności wyznacznika:</p><ul class="rules">${T.w.map(x=>`<li>${x}</li>`).join('')}</ul><div class="line res">${T.e} = ${T.v.html()}</div>`,
    hint:'Własności: det(<i>AB</i>) = det <i>A</i>·det <i>B</i>, det(<i>A</i><sup>T</sup>) = det <i>A</i>, det(<i>A</i><sup>−1</sup>) = 1/det <i>A</i>, det(<i>kA</i>) = <i>k</i><sup><i>n</i></sup>·det <i>A</i>.',
    fr:()=>[{sec:'Własności wyznacznika',t:`Oblicz ${T.e}`,x:'Niczego nie wymnażam — wystarczą własności wyznacznika.',S:data,C:[...T.w.map(h=>({h,full:true})),{h:`<b>${T.e} = ${T.v.html()}</b>`,full:true}],U:[...T.w.map((_,k)=>({t:.6+k*1.3,line:k})),{t:.6+T.w.length*1.3,line:T.w.length}]}]};
}

// ---------- Rząd macierzy ----------
const rankOf=A=>rref(A.map(r=>[...r,F(0)]),A[0].length).rank;
function genRank(){
  let best=null;
  for(let at=0;at<60;at++){
    const [m,n]=pick([[3,3],[3,4],[4,3],[4,4],[3,5]]),r=rnd(1,Math.min(m,n))===1&&Math.random()<.6?2:rnd(2,Math.min(m,n));
    const base=Array.from({length:r},()=>Array.from({length:n},()=>F(rich(-3,4))));if(rankOf(base)<r)continue;
    const rows=base.slice();let fail=false;
    while(rows.length<m){
      let row=null;
      for(let t=0;t<40&&!row;t++){const k=base.map(()=>rnd(-2,2));if(k.filter(x=>x).length<Math.min(2,r))continue;const c=base[0].map((_,j)=>base.reduce((s,bb,i)=>s.add(bb[j].mul(F(k[i]))),F(0)));if(c.every(x=>Math.abs(x.n)<=9)&&c.some(x=>!x.z))row=c}
      if(!row){fail=true;break}rows.push(row);
    }
    if(fail)continue;
    for(let i=rows.length-1;i>0;i--){const j=rnd(0,i);[rows[i],rows[j]]=[rows[j],rows[i]]}
    const sc=fracCount(rref(rows.map(x=>[...x,F(0)]),n));
    if(!best||sc<best.sc)best={A:rows,sc};
    if(sc<=2)break;
  }
  return best.A;
}
function rankFrames(A,sec='Rząd macierzy'){
  const n=A[0].length,g=gaussFrames(A,n,{mode:'rank',down:true,lab:'<i>A</i>',sec}),r=rankOf(A),hl={rows:{}};
  g.A.forEach((row,i)=>{hl.rows[i]=row.every(x=>x.z)?'dim':'res'});
  g.frames.push({sec,t:`Rząd = ${r}`,x:`Postać schodkowa gotowa. Niezerowych wierszy (zielone) jest ${r}, więc rz <i>A</i> = ${r}.${r<A.length?' Wiersze zerowe (wyszarzone) się nie liczą.':''}`,B:[bd(g.A,{bar:n,hl})]});
  return g.frames;
}
function rankHtml(A){
  const fr=rankFrames(A);
  return fr.filter(f=>f.U&&f.U.some(u=>u.v!==undefined)).map(f=>`<div class="ops">${f.t}</div><div class="line">${frameStatic(f)}</div>`).join('')+
    `<div class="line res">rz <i>A</i> = ${rankOf(A)}</div><p class="mute">Rząd to liczba niezerowych wierszy w postaci schodkowej.</p>`;
}

// ---------- Układy z parametrem a ----------
const LA=(p,q=0)=>({p:F(p),q:F(q)});
const laAt=(e,t)=>e.p.add(e.q.mul(t));
const laHtml=e=>e.q.z?e.p.html():lfHtml({c:[e.q],k:e.p},['a'],false);
const laComp=e=>!e.q.z&&!e.p.z;
const laFac=e=>{const neg=e.q.z?(e.p.n<0||e.p.d!==1):e.q.n<0;return laComp(e)||neg?`(${laHtml(e)})`:laHtml(e)};
const polyAt=(c,t)=>c.reduceRight((s,x)=>s.mul(t).add(x),F(0));
function polyFromDet(E){
  const n=E.length,pts=[...Array(n+1).keys()];
  const Ab=pts.map(t=>[...pts.map(k=>F(t**k)),detF(E.map(r=>r.map(e=>laAt(e,F(t)))))]);
  return rref(Ab,n+1).A.map(r=>r[n+1]);
}
function polyHtml(c){
  const p=[];
  for(let k=c.length-1;k>=0;k--){const x=c[k];if(x.z)continue;const a=x.abs();p.push([x.n<0,k===0?a.html():(a.one?'':a.html())+'<i>a</i>'+(k>1?`<sup>${k}</sup>`:'')])}
  return p.length?p.map(([ng,b],i)=>(i?(ng?' − ':' + '):(ng?'−':''))+b).join(''):'0';
}
function factorHtml(c,roots){
  let d=c.length-1;while(c[d].z)d--;const lc=c[d];
  return (lc.one?'':lc.eq(F(-1))?'−':lc.html())+roots.map(r=>r.z?'<i>a</i>':`(<i>a</i> ${r.n>0?'−':'+'} ${r.abs().html()})`).join('');
}
function detFormula(E){
  const f=(i,j)=>laFac(E[i][j]);
  if(E.length===2)return `${f(0,0)}·${f(1,1)} − ${f(0,1)}·${f(1,0)}`;
  const P=[[[0,0],[1,1],[2,2]],[[0,1],[1,2],[2,0]],[[0,2],[1,0],[2,1]]],N=[[[0,2],[1,1],[2,0]],[[0,0],[1,2],[2,1]],[[0,1],[1,0],[2,2]]];
  const t=d=>d.map(([i,j])=>f(i,j)).join('·');
  return P.map(t).join(' + ')+' − '+N.map(t).join(' − ');
}
function paramSysHtml(E,b,names){
  const n=names.length;let h='';
  E.forEach((row,i)=>{
    let first=true;const cells=[];
    row.forEach((e,j)=>{
      let sg='',t='';
      if(!(e.p.z&&e.q.z)){
        const comp=laComp(e),neg=!comp&&(e.q.z?e.p.n<0:e.q.n<0);
        const coef=comp?`(${laHtml(e)})`:e.q.z?(e.p.abs().one?'':e.p.abs().html()):(e.q.abs().one?'':e.q.abs().html())+'<i>a</i>';
        t=(first&&neg?'−':'')+coef+nmHtml(names[j]);sg=first?'':neg?'−':'+';first=false;
      }
      if(j)cells.push(`<span class="sg">${sg}</span>`);
      cells.push(`<span>${t}</span>`);
    });
    if(first)cells[cells.length-1]='<span>0</span>';
    h+=cells.join('')+`<span class="sg">=</span><span class="rh">${laHtml(b[i])}</span>`;
  });
  return `<span class="sysw"><span class="sys" style="grid-template-columns:repeat(${2*n+1},auto)">${h}</span></span>`;
}
const paramAt=(P,r)=>P.E.map((row,i)=>[...row.map(e=>laAt(e,r)),laAt(P.b[i],r)]);
const TYPE_PL={one:'dokładnie jedno rozwiązanie',inf:'nieskończenie wiele rozwiązań',none:'brak rozwiązań (sprzeczny)'};
function genParam(){
  let best=null;
  for(let at=0;at<600&&!(best&&best.sc===0&&at>30);at++){
    const n=Math.random()<.3?2:3,names=stdNames(n),E=M.make(n,n,()=>LA(rich(-3,4))),pos=[],k=n===2?pick([1,2]):pick([1,2,2]);
    while(pos.length<k){const q=[rnd(0,n-1),rnd(0,n-1)];if(!pos.some(z=>z[0]===q[0]&&z[1]===q[1]))pos.push(q)}
    pos.forEach(([i,j])=>{E[i][j]=LA(rnd(-2,2),pick([1,1,1,-1,2]))});
    const b=Array.from({length:n},()=>LA(rich(-3,5)));if(Math.random()<.35)b[rnd(0,n-1)]=LA(rnd(-1,2),1);
    const c=polyFromDet(E);let deg=c.length-1;while(deg>=0&&c[deg].z)deg--;
    if(deg<1||deg>2||c[deg].d!==1||Math.abs(c[deg].n)>4)continue;
    const roots=[];for(let t=-6;t<=6;t++)if(polyAt(c,F(t)).z)roots.push(F(t));
    if(roots.length!==deg)continue;
    const P={E,b,names,c,roots};
    const types=roots.map(r=>rref(paramAt(P,r),n).type);
    if(types.includes('one'))continue;
    P.types=types;P.sc=(deg===2&&types[0]===types[1]?2:0)+(types.every(t=>t==='inf')?1:0)+(deg===1?1:0);
    if(!best||P.sc<best.sc)best=P;
  }
  return best;
}
function paramHtml(P){
  const {E,names,c,roots,types}=P,n=names.length,rs=roots.map(r=>r.html()).join(', ');
  let h=`<h3>1. Wyznacznik główny (liczę jak zwykle, <i>a</i> traktuję jak liczbę)</h3><div class="line"><i>W</i> = ${matH(E.map(r=>r.map(laHtml)),{det:true})}</div><div class="line">= ${detFormula(E)}</div><div class="line">= ${polyHtml(c)}${roots.length>1?' = '+factorHtml(c,roots):''}</div>`;
  h+=`<h3>2. Kiedy <i>W</i> = 0?</h3><p><i>W</i> = 0 ⇔ ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}. Dla <i>a</i> ∉ {${rs}} jest <i>W</i> ≠ 0, więc układ ma <b>dokładnie jedno rozwiązanie</b> (układ Cramera).</p>`;
  roots.forEach((r,k)=>{const Ab=paramAt(P,r);h+=`<h3>${3+k}. Podstawiam <i>a</i> = ${r.html()}</h3><div class="sysbox">${sysHtml(abRows(Ab,n),names)}</div>${gaussSys(Ab,names).html}`});
  return h+`<h3>Odpowiedź</h3><ul class="rules"><li>dla <i>a</i> ∉ {${rs}} — ${TYPE_PL.one}</li>${roots.map((r,k)=>`<li>dla <i>a</i> = ${r.html()} — ${TYPE_PL[types[k]]}</li>`).join('')}</ul>`;
}
function paramFrames(P){
  const {E,b,names,c,roots,types}=P,n=names.length,sec='Układ z parametrem',rs=roots.map(r=>r.html()).join(', '),fr=[];
  fr.push({sec,t:'Dyskusja układu z parametrem <i>a</i>',x:'Plan: najpierw wyznacznik główny <i>W</i>. Tam, gdzie <i>W</i> ≠ 0, jest dokładnie jedno rozwiązanie. Wartości <i>a</i>, dla których <i>W</i> = 0, sprawdzam osobno — podstawiam i liczę Gaussem.',S:paramSysHtml(E,b,names)});
  fr.push({sec,t:'Wyznacznik główny <i>W</i>',x:`Liczę ${n===2?'ze wzoru <i>ad</i> − <i>bc</i>':'metodą Sarrusa'}, traktując <i>a</i> jak zwykłą liczbę, i porządkuję wynik.`,B:[bd(E.map(r=>r.map(laHtml)),{det:true,lab:'<i>W</i>'})],
    C:[{h:'= '+detFormula(E),full:true},{h:`= <b>${polyHtml(c)}</b>${roots.length>1?' = '+factorHtml(c,roots):''}`,full:true}],U:[{t:.5,line:0},{t:2,line:1}]});
  fr.push({sec,t:'Kiedy <i>W</i> = 0?',x:`Przyrównuję wyznacznik do zera. Dla każdego innego <i>a</i> jest <i>W</i> ≠ 0 — wtedy układ ma dokładnie jedno rozwiązanie (wzory Cramera).`,
    C:[{h:`${polyHtml(c)} = 0 &nbsp;⇔&nbsp; ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}`,full:true},{h:`<i>a</i> ∉ {${rs}} &nbsp;→&nbsp; ${TYPE_PL.one}`,full:true}],U:[{t:.5,line:0},{t:1.8,line:1}]});
  roots.forEach(r=>{
    const Ab=paramAt(P,r);
    fr.push({sec,t:`Podstawiam <i>a</i> = ${r.html()}`,x:'Wstawiam tę wartość wszędzie, gdzie jest <i>a</i>. Wyznacznik jest teraz zerem, więc rozstrzygam metodą Gaussa.',S:sysHtml(abRows(Ab,n),names)});
    fr.push(...sysGaussFrames(Ab,names,`a = ${r.str()}`,true));
  });
  fr.push({sec,t:'Odpowiedź',x:'Zbieram wszystkie przypadki:',C:[{h:`<i>a</i> ∉ {${rs}}: ${TYPE_PL.one}`,full:true},...roots.map((r,k)=>({h:`<i>a</i> = ${r.html()}: ${TYPE_PL[types[k]]}`,full:true}))],U:roots.map((_,k)=>({t:.6+k*.9,line:k+1}))});
  return fr;
}

// ---------- Znajdź mój błąd: kolejne macierze z eliminacji Gaussa ----------
const rrefKey=A=>JSON.stringify(rref(A.map(r=>[...r,F(0)]),A[0].length).A.map(r=>r.slice(0,A[0].length).map(x=>x.str())));
function opText(d){
  if(d.t==='copy')return `przepisany ${rw(d.i)}`;
  if(d.t==='scale'){const c=d.c;return c.n===1&&c.d!==1?`${rw(d.i)} : ${c.d}`:c.n===-1&&c.d!==1?`${rw(d.i)} : (−${c.d})`:`${rw(d.i)} · ${fmt(c)}`}
  const a=d.c.abs();return `${rw(d.i)} ${d.c.n<0?'−':'+'} ${a.one?'':a.d===1?a.str():'('+a.str()+')'}${rw(d.j)}`;
}
// zgaduje, jaką operację uczeń chciał zrobić, żeby dostać wiersz R z macierzy old
function guessRow(old,R){
  const m=old.length,w=R.length;let best=null;
  const consider=(exp,d,cost)=>{const ok=exp.map((x,q)=>x.eq(R[q])),n=ok.filter(Boolean).length;if(!best||n>best.n||(n===best.n&&cost<best.cost))best={n,exp,ok,d,cost}};
  for(let i=0;i<m;i++){
    consider(old[i],{t:'copy',i},0);
    for(let j=0;j<m;j++){
      if(j===i)continue;const cs=new Map();
      for(let q=0;q<w;q++)if(!old[j][q].z){const c=R[q].sub(old[i][q]).div(old[j][q]);if(!c.z)cs.set(c.str(),c)}
      for(const c of cs.values())consider(old[i].map((x,q)=>x.add(c.mul(old[j][q]))),{t:'comb',i,j,c},1+Math.abs(c.n)/10+(c.d!==1?.5:0));
    }
    const ss=new Map();for(let q=0;q<w;q++)if(!old[i][q].z){const c=R[q].div(old[i][q]);if(!c.z&&!c.one)ss.set(c.str(),c)}
    for(const c of ss.values())consider(old[i].map(x=>x.mul(c)),{t:'scale',i,c},1.2);
  }
  return best&&best.n>=Math.ceil(w/2)&&best.n<w?best:null;
}
function checkChain(mats){
  const steps=[];
  for(let k=1;k<mats.length;k++){
    const A=mats[k-1],B=mats[k];
    if(A.length!==B.length||A[0].length!==B[0].length){steps.push({k,ok:false,dims:true});continue}
    if(rrefKey(A)===rrefKey(B)){steps.push({k,ok:true});continue}
    const rA=rankOf(A),bad=[];
    B.forEach((R,i)=>{if(rankOf([...A,R])>rA)bad.push({i,g:guessRow(A,R)})});
    steps.push({k,ok:false,bad,lost:!bad.length});
  }
  return steps;
}
function parseChain(text){
  const blocks=text.replace(/[−–]/g,'-').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  if(blocks.length<2)throw new Error('Wpisz co najmniej dwie macierze (początkową i po pierwszym kroku), oddzielone pustą linią.');
  let bar=-1;
  const mats=blocks.map((bl,k)=>{
    const rows=bl.split('\n').map(r=>r.trim()).filter(Boolean);
    if(k===0&&rows[0].includes('|'))bar=rows[0].split('|')[0].split(/[\s,;]+/).filter(Boolean).length;
    const M_=rows.map(r=>r.replace(/\|/g,' ').split(/[\s,;]+/).filter(Boolean).map(t=>{const v=parseFr(t);if(!v)throw new Error(`Macierz ${k+1}: „${t}” to nie liczba.`);return v}));
    if(M_.some(r=>r.length!==M_[0].length))throw new Error(`Macierz ${k+1}: każdy wiersz musi mieć tyle samo liczb.`);
    if(M_.length>6||M_[0].length>10)throw new Error(`Macierz ${k+1} jest za duża (najwyżej 6 wierszy i 10 kolumn).`);
    return M_;
  });
  return {mats,bar};
}
const EX_CHAIN=`2 1 -1 | 3
1 -1 2 | 5
3 2 1 | 10

1 -1 2 | 5
2 1 -1 | 3
3 2 1 | 10

1 -1 2 | 5
0 3 -5 | -7
0 5 -7 | -5`;
function matMark(A,bar,marks){ // marks: {'i,j':'bad'|'ok'}
  const c=A[0].length;
  return `<span class="mat" style="grid-template-columns:repeat(${c},auto)">${A.flat().map((x,k)=>{const i=Math.floor(k/c),j=k%c,cl=[j===bar&&j>0?'bl':'',marks&&marks[i+','+j]?'mk-'+marks[i+','+j]:''].filter(Boolean).join(' ');return `<span${cl?` class="${cl}"`:''}>${x.html()}</span>`}).join('')}</span>`;
}
function chainReport(text){
  const {mats,bar}=parseChain(text),steps=checkChain(mats);
  let h=`<div class="card"><h2>Macierz początkowa</h2><div class="line">${matMark(mats[0],bar)}</div></div>`,firstBad=-1;
  steps.forEach(s=>{
    const B=mats[s.k];let body='',marks={};
    if(s.dims)body=`<div class="msg bad" style="display:block">Ta macierz ma inny wymiar niż poprzednia (${dimS(mats[s.k-1])} → ${dimS(B)}). Operacje na wierszach nie zmieniają wymiaru.</div>`;
    else if(s.ok)body=`<div class="msg ok" style="display:block">✓ Poprawnie — ta macierz powstaje z poprzedniej przez operacje na wierszach.</div>`;
    else if(s.lost)body=`<div class="msg bad" style="display:block">✗ Każdy wiersz da się otrzymać z poprzednich, ale zgubiłeś informację — rząd spadł. Pewnie któryś wiersz zastąpiłeś kombinacją innych bez niego samego (np. pomnożyłeś przez 0 albo przepisałeś inny wiersz dwa razy).</div>`;
    else{
      const items=s.bad.map(o=>{
        if(!o.g)return `<li>Wiersz ${o.i+1} nie wynika z poprzedniej macierzy — nie umiem odgadnąć, jaką operację chciałeś zrobić. Policz go jeszcze raz.</li>`;
        const wrong=o.g.ok.map((v,q)=>v?null:q).filter(q=>q!==null);
        wrong.forEach(q=>{marks[o.i+','+q]='bad'});
        return `<li>Wiersz ${o.i+1}: wygląda na <b>${opText(o.g.d)}</b>. ${wrong.map(q=>`W kolumnie ${q+1} powinno być <b>${o.g.exp[q].html()}</b>, a jest ${B[o.i][q].html()}.`).join(' ')}</li>`;
      });
      body=`<div class="msg bad" style="display:block">✗ Tu jest błąd.<ul class="rules">${items.join('')}</ul></div>`;
      if(firstBad<0)firstBad=s.k;
    }
    h+=`<div class="card"><h2>Krok ${s.k}</h2><div class="line">${matMark(B,bar,marks)}</div>${body}</div>`;
  });
  const last=mats[mats.length-1],n=last.length,w=last[0].length,nv=bar>0?bar:w;
  const red=JSON.stringify(rref(last,nv).A.map(r=>r.map(x=>x.str())))===JSON.stringify(last.map(r=>r.map(x=>x.str())));
  let fin=red?'✓ Ostatnia macierz jest w postaci schodkowej zredukowanej — eliminacja zakończona.':'Ostatnia macierz nie jest jeszcze w postaci schodkowej zredukowanej — możesz liczyć dalej.';
  const first=mats[0],isI=(X,off)=>X.every((r,i)=>r.slice(off,off+n).every((x,j)=>x.eq(F(i===j?1:0))));
  if(firstBad<0&&red&&w===2*n&&isI(first,n)&&isI(last,0)){const inv=M.inv(first.map(r=>r.slice(0,n))),R=last.map(r=>r.slice(n));fin+=inv&&M.eq(inv,R)?' Za kreską masz poprawną odwrotność ✓.':' Za kreską powinna być odwrotność, ale coś się nie zgadza.'}
  return `<div class="msg ${firstBad<0?'ok':'bad'}" style="display:block">${firstBad<0?'✓ Wszystkie kroki są poprawne.':`Pierwszy błąd jest w kroku ${firstBad}. Kolejne kroki sprawdzam względem tego, co sam napisałeś.`} ${fin}</div>`+h;
}
// ---------- Znajdź mój błąd: iloczyn ----------
function mulReport(A,B,C){
  if(A[0].length!==B.length)throw new Error(`Nie da się pomnożyć ${dimS(A)} przez ${dimS(B)} — liczba kolumn A musi być równa liczbie wierszy B.`);
  const R=M.mul(A,B);
  if(C.length!==R.length||C[0].length!==R[0].length)return `<div class="msg bad" style="display:block">Wynik powinien mieć wymiar ${dimS(R)}, a Twój ma ${dimS(C)}. Wymiar iloczynu: (m×n)·(n×p) = m×p.</div>`;
  const marks={},lines=[];
  R.forEach((r,i)=>r.forEach((v,j)=>{if(!v.eq(C[i][j])){marks[i+','+j]='bad';lines.push(`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${v.html()}</b> &nbsp;<span class="mute">(u Ciebie ${C[i][j].html()})</span></div>`)}else marks[i+','+j]='ok'}));
  return (lines.length?`<div class="msg bad" style="display:block">✗ Błędnych elementów: ${lines.length} z ${R.length*R[0].length} (zaznaczone na czerwono).</div>`:`<div class="msg ok" style="display:block">✓ Iloczyn jest policzony poprawnie.</div>`)+
    `<div class="line">Twój wynik: ${matMark(C,-1,marks)}</div>`+(lines.length?`<h3>Jak powinno być</h3>${lines.join('')}`:'');
}

// ---------- Odpowiedzi: pola, sprawdzanie, podgląd ----------
const INPA='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"';
function ansHtml(ans,id){
  if(ans.kind==='mat'){const r=ans.M.length,c=ans.M[0].length;return `<span class="gv"><span>${ans.lab} =</span> <span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},(_,k)=>`<input id="${id}-${k}" ${INPA} aria-label="wiersz ${Math.floor(k/c)+1}, kolumna ${k%c+1}">`).join('')}</span></span>`}
  if(ans.kind==='num')return `<label class="ans-in" for="${id}-0"><span>${ans.lab} =</span><input id="${id}-0" ${INPA}></label>`;
  if(ans.kind==='formula')return `<div class="row" style="margin-top:0;flex-wrap:nowrap"><span class="m" style="font-size:20px"><i>X</i>&nbsp;=</span><input id="${id}-f" class="code" ${INPA} placeholder="np. A^-1(C-B)"></div>`;
  if(ans.kind==='sys')return `<p class="mute" style="margin:0 0 6px">Ile rozwiązań ma ten układ?</p><div class="chips" data-gst-box="${id}"><button class="chip on" data-gst="one">jedno</button><button class="chip" data-gst="inf">nieskończenie wiele</button><button class="chip" data-gst="none">brak — sprzeczny</button></div><div class="nums" id="${id}-vals" style="margin-top:10px">${ans.names.map((v,j)=>`<label class="ans-in" for="${id}-v${j}"><span>${nmHtml(v)} =</span><input id="${id}-v${j}" ${INPA}></label>`).join('')}</div>`;
  if(ans.kind==='param')return `<p class="mute" style="margin:0 0 6px">Dla jakich <i>a</i> układ <b>nie</b> ma dokładnie jednego rozwiązania? Wpisz te wartości i wybierz, co się wtedy dzieje (puste wiersze pomiń).</p>`+
    [0,1,2].map(k=>`<div class="row" style="margin-top:6px"><label class="ans-in" for="${id}-a${k}"><span><i>a</i> =</span><input id="${id}-a${k}" ${INPA}></label><select id="${id}-t${k}" class="code" style="width:auto;padding:7px 10px"><option value="">— co wtedy? —</option><option value="none">układ sprzeczny</option><option value="inf">nieskończenie wiele rozwiązań</option></select></div>`).join('');
  return '';
}
// inp — odczytane pola (patrz ansRead w ui.js); zwraca {score 0..1, empty, marks:{sufiks id: true/false}, msg}
function ansCheck(ans,inp){
  if(ans.kind==='mat'){
    const exp=ans.M.flat(),marks={};let good=0,empty=0;
    inp.forEach((s,k)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(exp[k]));marks[k]=ok;if(ok)good++});
    return {score:good/exp.length,empty:empty===exp.length,partEmpty:empty,marks,msg:good===exp.length?'':`Dobrze: ${good} z ${exp.length}.`};
  }
  if(ans.kind==='num'){const s=String(inp).trim(),v=parseFr(s),ok=!!(v&&v.eq(ans.v));return {score:ok?1:0,empty:!s,marks:{0:ok},msg:s&&!v?'To nie jest liczba (ułamki pisz jako 1/2).':''}}
  if(ans.kind==='formula'){
    const s=String(inp).trim();if(!s)return {score:0,empty:true,marks:{f:false},msg:''};
    try{const ok=checkAnswer(ans.sol,s);return {score:ok?1:0,empty:false,marks:{f:ok},msg:ok?'':'Ten wzór daje inne X.'}}catch(e){return {score:0,empty:false,marks:{f:false},msg:e.message}}
  }
  if(ans.kind==='sys'){
    if(inp.type==='one'&&inp.vals.every(x=>!String(x).trim()))return {score:0,empty:true,marks:{},msg:''};
    if(inp.type!==ans.type)return {score:0,empty:false,marks:{},msg:'Zła liczba rozwiązań — porównaj rz <i>A</i> i rz [<i>A</i> | <i>B</i>] z liczbą niewiadomych.'};
    if(ans.type!=='one')return {score:1,empty:false,marks:{},msg:''};
    const marks={};let good=0,empty=0;
    inp.vals.forEach((s,j)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(ans.vals[j]));marks['v'+j]=ok;if(ok)good++});
    return {score:good/ans.vals.length,empty:empty===ans.vals.length,partEmpty:empty,marks,msg:good===ans.vals.length?'':`Dobrze: ${good} z ${ans.vals.length}.`};
  }
  if(ans.kind==='param'){
    const marks={};let good=0,extra=0,filled=0;
    inp.forEach((r,k)=>{
      if(!String(r.a).trim())return;filled++;
      const v=parseFr(r.a),hit=v?ans.roots.find(o=>o.a.eq(v)):null;
      marks['a'+k]=!!hit;marks['t'+k]=!!(hit&&hit.type===r.type);
      if(!hit)extra++;else if(hit.type===r.type)good++;
    });
    const score=Math.max(0,(good-extra)/ans.roots.length);
    return {score,empty:!filled,marks,msg:score===1?'':`Wartości <i>a</i> z dobrym opisem: ${good} z ${ans.roots.length}${extra?`, zbędnych: ${extra}`:''}.`};
  }
  return {score:0,empty:true,marks:{},msg:''};
}
function ansShow(ans){
  if(ans.kind==='mat')return `${ans.lab} = ${M.html(ans.M)}`;
  if(ans.kind==='num')return `${ans.lab} = ${ans.v.html()}`;
  if(ans.kind==='formula')return `<i>X</i> = ${rP(ans.sol.P)}`;
  if(ans.kind==='sys')return ans.type==='one'?ans.names.map((v,j)=>`${nmHtml(v)} = ${ans.vals[j].html()}`).join(', '):TYPE_PL[ans.type];
  if(ans.kind==='param')return ans.roots.map(o=>`<i>a</i> = ${o.a.html()}: ${TYPE_PL[o.type]}`).join('; ')+'; dla pozostałych — jedno rozwiązanie';
  return '';
}
function inpShow(ans,inp){
  const e=s=>String(s).trim()?String(s).trim().replace(/</g,'&lt;'):'…';
  if(ans.kind==='mat'){const c=ans.M[0].length;return `<span class="mat" style="grid-template-columns:repeat(${c},auto)">${inp.map(s=>`<span>${e(s)}</span>`).join('')}</span>`}
  if(ans.kind==='num'||ans.kind==='formula')return e(inp);
  if(ans.kind==='sys')return inp.type==='one'?ans.names.map((v,j)=>`${nmHtml(v)} = ${e(inp.vals[j])}`).join(', '):TYPE_PL[inp.type];
  if(ans.kind==='param')return inp.filter(r=>String(r.a).trim()).map(r=>`<i>a</i> = ${e(r.a)}: ${r.type?TYPE_PL[r.type]:'…'}`).join('; ')||'…';
  return '';
}

// ---------- Opakowania istniejących generatorów w format zadania ----------
const opTopic=type=>()=>{const t=genTask(type);return {q:t.q,body:givenH(t.given),ans:{kind:'mat',M:t.ans,lab:t.lab},sol:t.sol,fr:t.fr}};
function xnumTopic(n,rect){return ()=>{
  const T=genNum(n,-1,rect);
  return {q:'Wyznacz macierz <i>X</i>',body:eqH(T.sol.orig)+givenH([...T.sol.letters].sort().map(c=>[c,T.env[c]])),ans:{kind:'mat',M:T.X,lab:'<i>X</i>'},sol:numSolHtml(T),fr:()=>numFrames(T),
    hint:`Najpierw na literach: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Potem odwrotność metodą Gaussa i mnożenie.`};
}}
function xlinTopic(){
  const t=genLin(pick(NT.filter(x=>x.lin)));
  return {q:'Wyznacz macierz <i>X</i>',body:eqH(t.orig)+givenH(t.letters.map(c=>[c,t.env[c]])),ans:{kind:'mat',M:t.X,lab:'<i>X</i>'},sol:t.solHtml,fr:t.fr,hint:t.hint};
}
function xsymTopic(){
  for(;;){const q=genEq(rnd(1,3));let sol;try{sol=solve(q)}catch(e){continue}
    return {q:'Wyznacz <i>X</i> (na literach)',body:eqH(sol.orig),ans:{kind:'formula',sol},
      sol:sol.steps.map(s=>`<div class="line"><span class="mute">${s.title}:</span><br>${s.lines[s.lines.length-1]}</div>`).join(''),fr:()=>symFrames(sol),
      hint:'Rozpisz nawiasy (kolejność się odwraca), przenieś wyrazy z <i>X</i> na lewo, potem mnóż przez odwrotności z właściwej strony.'}}
}
const METH_PL={gauss:'',mac:' metodą macierzową',cra:' wzorami Cramera'};
function sysTopic(sz,mode,method){return ()=>{
  const g=genSys(sz,mode),out=sysMethodHtml(g.Ab,g.names,method);
  return {q:'Rozwiąż układ równań'+METH_PL[method],body:`<div class="sysbox">${sysHtml(abRows(g.Ab,g.names.length),g.names)}</div>`,
    ans:{kind:'sys',type:out.type,names:g.names,vals:out.vals},sol:out.html,fr:()=>sysFrames(g.Ab,g.names,method),
    hint:{gauss:'Macierz rozszerzona [<i>A</i> | <i>B</i>] i eliminacja kolumna po kolumnie.',mac:'<i>X</i> = <i>A</i><sup>−1</sup><i>B</i> — najpierw odwrotność, potem mnożenie.',cra:'<i>W</i> = det <i>A</i>, potem <i>x</i> = <i>W<sub>x</sub></i>/<i>W</i>.'}[method]};
}}
function detTopic(n){return ()=>{
  const A=n===4?genDet4():genDet(n),v=detF(A);
  return {q:`Oblicz wyznacznik macierzy ${n}×${n}`,body:givenH([['A',A]]),ans:{kind:'num',v,lab:'det <i>A</i>'},
    sol:n===4?laplaceHtml(A):`<div class="line">det <i>A</i> = ${matH(A,{det:true})}</div>${detLines(A)}`,
    fr:()=>n===4?laplaceFrames(A):detFrames(A,'det <i>A</i>','Wyznacznik',true),
    hint:n===2?'<i>ad</i> − <i>bc</i>.':n===3?'Sarrus: dopisz dwie pierwsze kolumny; trzy przekątne z plusem, trzy z minusem.':"Rozwinięcie Laplace'a względem wiersza lub kolumny z największą liczbą zer."};
}}
function rankTopic(){
  const A=genRank(),r=rankOf(A);
  return {q:'Wyznacz rząd macierzy',body:givenH([['A',A]]),ans:{kind:'num',v:F(r),lab:'rz <i>A</i>'},sol:rankHtml(A),fr:()=>rankFrames(A),
    hint:'Sprowadź macierz do postaci schodkowej (zera pod elementami głównymi) i policz niezerowe wiersze.'};
}
function paramTopic(){
  const P=genParam();
  return {q:'Zbadaj liczbę rozwiązań w zależności od parametru <i>a</i>',body:`<div class="sysbox">${paramSysHtml(P.E,P.b,P.names)}</div>`,
    ans:{kind:'param',roots:P.roots.map((a,k)=>({a,type:P.types[k]}))},sol:paramHtml(P),fr:()=>paramFrames(P),
    hint:'Policz wyznacznik główny <i>W</i>(<i>a</i>). Gdzie <i>W</i> ≠ 0 — jedno rozwiązanie. Wartości z <i>W</i> = 0 podstaw i sprawdź Gaussem.'};
}

// ---------- REJESTR ----------
const TOPICS=[
  {id:'mul',sec:'Działania',name:'Mnożenie <i>A</i>·<i>B</i>',gen:opTopic('mul')},
  {id:'add',sec:'Działania',name:'α<i>A</i> + β<i>B</i>',gen:opTopic('add')},
  {id:'trans',sec:'Działania',name:'Transpozycja',gen:opTopic('trans')},
  {id:'expr',sec:'Działania',name:'Wyrażenia',gen:opTopic('expr')},
  {id:'inv2',sec:'Macierz odwrotna',name:'<i>A</i><sup>−1</sup> 2×2',gen:opTopic('inv2')},
  {id:'inv3',sec:'Macierz odwrotna',name:'<i>A</i><sup>−1</sup> 3×3',gen:opTopic('inv3')},
  {id:'xsym',sec:'Równania macierzowe',name:'<i>X</i> na literach',gen:xsymTopic},
  {id:'xnum2',sec:'Równania macierzowe',name:'<i>X</i> na liczbach 2×2',gen:xnumTopic(2,false)},
  {id:'xnum3',sec:'Równania macierzowe',name:'<i>X</i> na liczbach 3×3',gen:xnumTopic(3,false)},
  {id:'xrect',sec:'Równania macierzowe',name:'<i>X</i> prostokątna',gen:xnumTopic(2,true)},
  {id:'xlin',sec:'Równania macierzowe',name:'Przez niewiadome',gen:xlinTopic},
  {id:'sys2',sec:'Układy równań',name:'Gauss 2×2',gen:sysTopic(2,'one','gauss')},
  {id:'sys3',sec:'Układy równań',name:'Gauss 3×3',gen:sysTopic(3,'one','gauss')},
  {id:'sys4',sec:'Układy równań',name:'Gauss 4×4',gen:sysTopic(4,'one','gauss')},
  {id:'sysany',sec:'Układy równań',name:'Ile rozwiązań?',gen:sysTopic(3,'any','gauss')},
  {id:'sysrect',sec:'Układy równań',name:'Nietypowe (m ≠ n)',gen:sysTopic('r','any','gauss')},
  {id:'sysmac',sec:'Układy równań',name:'Metoda macierzowa',gen:sysTopic(3,'one','mac')},
  {id:'syscra',sec:'Układy równań',name:'Wzory Cramera',gen:sysTopic(3,'one','cra')},
  {id:'param',sec:'Układy równań',name:'Z parametrem <i>a</i>',gen:paramTopic},
  {id:'det2',sec:'Wyznaczniki',name:'det 2×2',gen:detTopic(2)},
  {id:'det3',sec:'Wyznaczniki',name:'det 3×3 (Sarrus)',gen:detTopic(3)},
  {id:'det4',sec:'Wyznaczniki',name:"det 4×4 (Laplace)",gen:detTopic(4)},
  {id:'detprop',sec:'Wyznaczniki',name:'Własności',gen:genDetProp},
  {id:'rank',sec:'Rząd macierzy',name:'Rząd macierzy',gen:rankTopic},
];
const SECTIONS=[...new Set(TOPICS.map(t=>t.sec))];
const topicById=id=>TOPICS.find(t=>t.id===id);
