// =====================================================================
//  REJESTR TEMATÓW — tu dopisujesz nowe typy zadań
// =====================================================================
//  Żeby dodać nowy temat, dopisz jeden obiekt do tablicy TOPICS (na dole pliku):
//
//    { id:'moj-temat', sec:'Dział', name:'Krótka nazwa', en:'Short name', gen: () => zadanie }
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
//  Teksty widoczne dla ucznia pisz w obu językach: $t('po polsku','in English').
//  `en` to angielska nazwa tematu; nowy dział dopisz też do SEC_EN.
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
  let h=$t(`<p>Rozwijam względem ${L.row?'wiersza':'kolumny'} ${L.k+1} — ma najwięcej zer (${L.z}), więc liczenia jest najmniej. Każdy niezerowy element mnożę przez znak (−1)<sup><i>i</i>+<i>j</i></sup> i wyznacznik minora — macierzy bez wiersza i kolumny tego elementu.</p>`,`<p>I expand along ${L.row?'row':'column'} ${L.k+1} — it has the most zeros (${L.z}), so there is the least computing. I multiply each nonzero entry by the sign (−1)<sup><i>i</i>+<i>j</i></sup> and the determinant of its minor — the matrix without that entry’s row and column.</p>`);
  t.forEach(o=>{
    h+=`<div class="line">(−1)<sup>${o.i+1}+${o.j+1}</sup> · ${fmt(o.a)} · ${matH(o.Mi,{det:true})}</div>`;
    h+=`<details><summary>Minor <i>M</i><sub>${o.i+1}${o.j+1}</sub> (Sarrus)</summary>${detLines(o.Mi)}</details>`;
    h+=`<div class="line">= ${lapTerm(o)} = <b>${o.v.html()}</b></div>`;
  });
  return h+`<div class="line res">${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = ${v.html()}</div>`;
}
function laplaceFrames(A,lab='det <i>A</i>',sec=$t("Rozwinięcie Laplace'a","Laplace expansion")){
  const {L,t}=laplaceTerms(A),v=detF(A),fr=[];
  fr.push({sec,t:$t(`Wybieram ${L.row?'wiersz':'kolumnę'} ${L.k+1}`,`Choosing ${L.row?'row':'column'} ${L.k+1}`),x:$t(`Rozwijam względem wiersza albo kolumny z największą liczbą zer — tu ${L.row?'wiersz':'kolumna'} ${L.k+1} ma ${L.z} ${pl(L.z,'zero','zera','zer')}. Składnik z zerem jest zerem, więc liczę tylko ${t.length} ${pl(t.length,'składnik','składniki','składników')}.`,`I expand along the row or column with the most zeros — here ${L.row?'row':'column'} ${L.k+1} has ${L.z} ${L.z===1?'zero':'zeros'}. A term with a zero entry is zero, so I only compute ${t.length} ${t.length===1?'term':'terms'}.`),
    B:[bd(A,{det:true,lab,hl:L.row?{rows:{[L.k]:'src'}}:{cols:{[L.k]:'src'}}})]});
  t.forEach((o,k)=>{
    const ml=`<i>M</i><sub>${o.i+1}${o.j+1}</sub>`;
    fr.push({sec,t:$t(`Składnik ${k+1}: element ${o.a.html()}`,`Term ${k+1}: the entry ${o.a.html()}`),x:$t(`Element stoi w wierszu ${o.i+1} i kolumnie ${o.j+1}. Skreślam ten wiersz i tę kolumnę — zostaje minor ${ml}. Znak: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`,`The entry is in row ${o.i+1} and column ${o.j+1}. I cross out this row and this column — the minor ${ml} remains. Sign: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`),
      B:[bd(A,{det:true,lab,hl:{rows:{[o.i]:'dim'},cols:{[o.j]:'dim'},cells:{[o.i+','+o.j]:'piv'}}}),bd(o.Mi,{det:true,lab:ml})],J:['→']});
    fr.push(...detFrames(o.Mi,'det '+ml,sec,false));
    fr.push({sec,t:$t(`Składnik ${k+1} = ${o.v.html()}`,`Term ${k+1} = ${o.v.html()}`),x:$t('Znak · element · wyznacznik minora:','Sign · entry · determinant of the minor:'),C:[{h:`${lapTerm(o)} = <b>${o.v.html()}</b>`,full:true}],U:[{t:.4,line:0}]});
  });
  fr.push({sec,t:`${lab} = ${v.html()}`,x:$t('Dodaję wszystkie składniki.','I add up all the terms.'),B:[bd(A,{det:true,lab})],C:[{h:`${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = <b>${v.html()}</b>`,full:true}],U:[{t:.5,line:0}]});
  return fr;
}
function genDetProp(){
  const n=pick([2,3]),a=F(pick([-3,-2,2,3,4,5])),b=F(pick([-2,2,3,4,-4])),k=pick([2,3,-2]),kS=F(k).str(),kn=F(k**n);
  const T=pick([
    ()=>({e:`det(${kS}<i>A</i>)`,v:kn.mul(a),w:[$t(`Liczba przed macierzą ${n}×${n} wychodzi w potędze ${n}: det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.html()}·${fmt(a)}`,`A number in front of a ${n}×${n} matrix comes out to the power ${n}: det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.html()}·${fmt(a)}`)]}),
    ()=>({e:'det(<i>AB</i>)',v:a.mul(b),w:['det(<i>AB</i>) = det <i>A</i> · det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>−1</sup>)',v:F(1).div(a),w:['det(<i>A</i><sup>−1</sup>) = 1 / det <i>A</i>']}),
    ()=>({e:'det(<i>A</i><sup>T</sup><i>B</i>)',v:a.mul(b),w:['det(<i>A</i><sup>T</sup>) = det <i>A</i>','det(<i>A</i><sup>T</sup><i>B</i>) = det <i>A</i> · det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>2</sup><i>B</i><sup>−1</sup>)',v:a.mul(a).div(b),w:['det(<i>A</i><sup>2</sup>) = (det <i>A</i>)<sup>2</sup>','det(<i>B</i><sup>−1</sup>) = 1 / det <i>B</i>']}),
    ()=>({e:`det(${kS}<i>A</i><sup>T</sup><i>B</i><sup>−1</sup>)`,v:kn.mul(a).div(b),w:[$t(`liczba ${kS} przed macierzą ${n}×${n} daje (${kS})<sup>${n}</sup> = ${kn.html()}`,`the number ${kS} in front of a ${n}×${n} matrix gives (${kS})<sup>${n}</sup> = ${kn.html()}`),'det(<i>A</i><sup>T</sup>) = det <i>A</i>','det(<i>B</i><sup>−1</sup>) = 1 / det <i>B</i>']}),
    ()=>({e:'det(<i>A</i><sup>−1</sup><i>B</i><sup>T</sup><i>A</i>)',v:b,w:[$t('det(<i>A</i><sup>−1</sup>) · det <i>A</i> = 1 — skracają się','det(<i>A</i><sup>−1</sup>) · det <i>A</i> = 1 — they cancel'),$t('zostaje det(<i>B</i><sup>T</sup>) = det <i>B</i>','what remains is det(<i>B</i><sup>T</sup>) = det <i>B</i>')]}),
    ()=>({e:`det((${kS}<i>A</i>)<sup>−1</sup>)`,v:F(1).div(kn.mul(a)),w:[`det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.mul(a).html()}`,'det(<i>M</i><sup>−1</sup>) = 1 / det <i>M</i>']}),
  ])();
  const data=$t(`<p class="f" style="font-size:18px"><i>A</i>, <i>B</i> — macierze ${n}×${n}, &nbsp;det <i>A</i> = ${a.html()}, &nbsp;det <i>B</i> = ${b.html()}.</p>`,`<p class="f" style="font-size:18px"><i>A</i>, <i>B</i> — ${n}×${n} matrices, &nbsp;det <i>A</i> = ${a.html()}, &nbsp;det <i>B</i> = ${b.html()}.</p>`);
  return {q:$t(`Oblicz ${T.e}`,`Compute ${T.e}`),body:data,ans:{kind:'num',v:T.v,lab:T.e},
    sol:$t(`<p>Korzystam z własności wyznacznika:</p><ul class="rules">${T.w.map(x=>`<li>${x}</li>`).join('')}</ul><div class="line res">${T.e} = ${T.v.html()}</div>`,`<p>I use the properties of the determinant:</p><ul class="rules">${T.w.map(x=>`<li>${x}</li>`).join('')}</ul><div class="line res">${T.e} = ${T.v.html()}</div>`),
    hint:$t('Własności: det(<i>AB</i>) = det <i>A</i>·det <i>B</i>, det(<i>A</i><sup>T</sup>) = det <i>A</i>, det(<i>A</i><sup>−1</sup>) = 1/det <i>A</i>, det(<i>kA</i>) = <i>k</i><sup><i>n</i></sup>·det <i>A</i>.','Properties: det(<i>AB</i>) = det <i>A</i>·det <i>B</i>, det(<i>A</i><sup>T</sup>) = det <i>A</i>, det(<i>A</i><sup>−1</sup>) = 1/det <i>A</i>, det(<i>kA</i>) = <i>k</i><sup><i>n</i></sup>·det <i>A</i>.'),
    fr:()=>[{sec:$t('Własności wyznacznika','Properties of the determinant'),t:$t(`Oblicz ${T.e}`,`Compute ${T.e}`),x:$t('Niczego nie wymnażam — wystarczą własności wyznacznika.','I don’t multiply anything out — the properties of the determinant are enough.'),S:data,C:[...T.w.map(h=>({h,full:true})),{h:`<b>${T.e} = ${T.v.html()}</b>`,full:true}],U:[...T.w.map((_,k)=>({t:.6+k*1.3,line:k})),{t:.6+T.w.length*1.3,line:T.w.length}]}]};
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
function rankFrames(A,sec=$t('Rząd macierzy','Rank of a matrix')){
  const n=A[0].length,g=gaussFrames(A,n,{mode:'rank',down:true,lab:'<i>A</i>',sec}),r=rankOf(A),hl={rows:{}};
  g.A.forEach((row,i)=>{hl.rows[i]=row.every(x=>x.z)?'dim':'res'});
  g.frames.push({sec,t:$t(`Rząd = ${r}`,`Rank = ${r}`),x:$t(`Postać schodkowa gotowa. Niezerowych wierszy (zielone) jest ${r}, więc rz <i>A</i> = ${r}.${r<A.length?' Wiersze zerowe (wyszarzone) się nie liczą.':''}`,`The echelon form is ready. There ${r===1?'is':'are'} ${r} nonzero ${r===1?'row':'rows'} (green), so rank <i>A</i> = ${r}.${r<A.length?' Zero rows (greyed out) do not count.':''}`),B:[bd(g.A,{bar:n,hl})]});
  return g.frames;
}
function rankHtml(A){
  const fr=rankFrames(A);
  return fr.filter(f=>f.U&&f.U.some(u=>u.v!==undefined)).map(f=>`<div class="ops">${f.t}</div><div class="line">${frameStatic(f)}</div>`).join('')+
    $t(`<div class="line res">rz <i>A</i> = ${rankOf(A)}</div><p class="mute">Rząd to liczba niezerowych wierszy w postaci schodkowej.</p>`,`<div class="line res">rank <i>A</i> = ${rankOf(A)}</div><p class="mute">The rank is the number of nonzero rows in row echelon form.</p>`);
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
const TYPE_PL={get one(){return $t('dokładnie jedno rozwiązanie','exactly one solution')},get inf(){return $t('nieskończenie wiele rozwiązań','infinitely many solutions')},get none(){return $t('brak rozwiązań (sprzeczny)','no solutions (inconsistent)')}};
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
  let h=$t(`<h3>1. Wyznacznik główny (liczę jak zwykle, <i>a</i> traktuję jak liczbę)</h3><div class="line"><i>W</i> = ${matH(E.map(r=>r.map(laHtml)),{det:true})}</div><div class="line">= ${detFormula(E)}</div><div class="line">= ${polyHtml(c)}${roots.length>1?' = '+factorHtml(c,roots):''}</div>`,`<h3>1. The main determinant (computed as usual, treating <i>a</i> as a number)</h3><div class="line"><i>D</i> = ${matH(E.map(r=>r.map(laHtml)),{det:true})}</div><div class="line">= ${detFormula(E)}</div><div class="line">= ${polyHtml(c)}${roots.length>1?' = '+factorHtml(c,roots):''}</div>`);
  h+=$t(`<h3>2. Kiedy <i>W</i> = 0?</h3><p><i>W</i> = 0 ⇔ ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}. Dla <i>a</i> ∉ {${rs}} jest <i>W</i> ≠ 0, więc układ ma <b>dokładnie jedno rozwiązanie</b> (układ Cramera).</p>`,`<h3>2. When is <i>D</i> = 0?</h3><p><i>D</i> = 0 ⇔ ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' or ')}. For <i>a</i> ∉ {${rs}} we have <i>D</i> ≠ 0, so the system has <b>exactly one solution</b> (a Cramer system).</p>`);
  roots.forEach((r,k)=>{const Ab=paramAt(P,r);h+=$t(`<h3>${3+k}. Podstawiam <i>a</i> = ${r.html()}</h3><div class="sysbox">${sysHtml(abRows(Ab,n),names)}</div>${gaussSys(Ab,names).html}`,`<h3>${3+k}. Substituting <i>a</i> = ${r.html()}</h3><div class="sysbox">${sysHtml(abRows(Ab,n),names)}</div>${gaussSys(Ab,names).html}`)});
  return h+$t(`<h3>Odpowiedź</h3><ul class="rules"><li>dla <i>a</i> ∉ {${rs}} — ${TYPE_PL.one}</li>${roots.map((r,k)=>`<li>dla <i>a</i> = ${r.html()} — ${TYPE_PL[types[k]]}</li>`).join('')}</ul>`,`<h3>Answer</h3><ul class="rules"><li>for <i>a</i> ∉ {${rs}} — ${TYPE_PL.one}</li>${roots.map((r,k)=>`<li>for <i>a</i> = ${r.html()} — ${TYPE_PL[types[k]]}</li>`).join('')}</ul>`);
}
function paramFrames(P){
  const {E,b,names,c,roots,types}=P,n=names.length,sec=$t('Układ z parametrem','System with a parameter'),rs=roots.map(r=>r.html()).join(', '),fr=[];
  fr.push({sec,t:$t('Dyskusja układu z parametrem <i>a</i>','Discussing a system with the parameter <i>a</i>'),x:$t('Plan: najpierw wyznacznik główny <i>W</i>. Tam, gdzie <i>W</i> ≠ 0, jest dokładnie jedno rozwiązanie. Wartości <i>a</i>, dla których <i>W</i> = 0, sprawdzam osobno — podstawiam i liczę Gaussem.','Plan: first the main determinant <i>D</i>. Wherever <i>D</i> ≠ 0 there is exactly one solution. The values of <i>a</i> with <i>D</i> = 0 I check separately — I substitute them and use Gaussian elimination.'),S:paramSysHtml(E,b,names)});
  fr.push({sec,t:$t('Wyznacznik główny <i>W</i>','The main determinant <i>D</i>'),x:$t(`Liczę ${n===2?'ze wzoru <i>ad</i> − <i>bc</i>':'metodą Sarrusa'}, traktując <i>a</i> jak zwykłą liczbę, i porządkuję wynik.`,`I compute ${n===2?'with the formula <i>ad</i> − <i>bc</i>':'with Sarrus’ rule'}, treating <i>a</i> as an ordinary number, and simplify.`),B:[bd(E.map(r=>r.map(laHtml)),{det:true,lab:$t('<i>W</i>','<i>D</i>')})],
    C:[{h:'= '+detFormula(E),full:true},{h:`= <b>${polyHtml(c)}</b>${roots.length>1?' = '+factorHtml(c,roots):''}`,full:true}],U:[{t:.5,line:0},{t:2,line:1}]});
  fr.push({sec,t:$t('Kiedy <i>W</i> = 0?','When is <i>D</i> = 0?'),x:$t(`Przyrównuję wyznacznik do zera. Dla każdego innego <i>a</i> jest <i>W</i> ≠ 0 — wtedy układ ma dokładnie jedno rozwiązanie (wzory Cramera).`,`I set the determinant equal to zero. For every other <i>a</i> we have <i>D</i> ≠ 0 — then the system has exactly one solution (Cramer’s rule).`),
    C:[{h:$t(`${polyHtml(c)} = 0 &nbsp;⇔&nbsp; ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}`,`${polyHtml(c)} = 0 &nbsp;⇔&nbsp; ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' or ')}`),full:true},{h:`<i>a</i> ∉ {${rs}} &nbsp;→&nbsp; ${TYPE_PL.one}`,full:true}],U:[{t:.5,line:0},{t:1.8,line:1}]});
  roots.forEach(r=>{
    const Ab=paramAt(P,r);
    fr.push({sec,t:$t(`Podstawiam <i>a</i> = ${r.html()}`,`Substituting <i>a</i> = ${r.html()}`),x:$t('Wstawiam tę wartość wszędzie, gdzie jest <i>a</i>. Wyznacznik jest teraz zerem, więc rozstrzygam metodą Gaussa.','I put this value wherever <i>a</i> appears. The determinant is now zero, so Gaussian elimination decides.'),S:sysHtml(abRows(Ab,n),names)});
    fr.push(...sysGaussFrames(Ab,names,`a = ${r.str()}`,true));
  });
  fr.push({sec,t:$t('Odpowiedź','Answer'),x:$t('Zbieram wszystkie przypadki:','Collecting all cases:'),C:[{h:`<i>a</i> ∉ {${rs}}: ${TYPE_PL.one}`,full:true},...roots.map((r,k)=>({h:`<i>a</i> = ${r.html()}: ${TYPE_PL[types[k]]}`,full:true}))],U:roots.map((_,k)=>({t:.6+k*.9,line:k+1}))});
  return fr;
}

// ---------- Znajdź mój błąd: kolejne macierze z eliminacji Gaussa ----------
const rrefKey=A=>JSON.stringify(rref(A.map(r=>[...r,F(0)]),A[0].length).A.map(r=>r.slice(0,A[0].length).map(x=>x.str())));
function opText(d){
  if(d.t==='copy')return $t(`przepisany ${rw(d.i)}`,`${rw(d.i)} copied`);
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
  if(blocks.length<2)throw new Error($t('Wpisz co najmniej dwie macierze (początkową i po pierwszym kroku), oddzielone pustą linią.','Type at least two matrices (the starting one and the one after the first step), separated by an empty line.'));
  let bar=-1;
  const mats=blocks.map((bl,k)=>{
    const rows=bl.split('\n').map(r=>r.trim()).filter(Boolean);
    if(k===0&&rows[0].includes('|'))bar=rows[0].split('|')[0].split(/[\s,;]+/).filter(Boolean).length;
    const M_=rows.map(r=>r.replace(/\|/g,' ').split(/[\s,;]+/).filter(Boolean).map(t=>{const v=parseFr(t);if(!v)throw new Error($t(`Macierz ${k+1}: „${t}” to nie liczba.`,`Matrix ${k+1}: “${t}” is not a number.`));return v}));
    if(M_.some(r=>r.length!==M_[0].length))throw new Error($t(`Macierz ${k+1}: każdy wiersz musi mieć tyle samo liczb.`,`Matrix ${k+1}: every row must have the same number of entries.`));
    if(M_.length>6||M_[0].length>10)throw new Error($t(`Macierz ${k+1} jest za duża (najwyżej 6 wierszy i 10 kolumn).`,`Matrix ${k+1} is too large (at most 6 rows and 10 columns).`));
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
  let h=$t(`<div class="card"><h2>Macierz początkowa</h2><div class="line">${matMark(mats[0],bar)}</div></div>`,`<div class="card"><h2>Starting matrix</h2><div class="line">${matMark(mats[0],bar)}</div></div>`),firstBad=-1;
  steps.forEach(s=>{
    const B=mats[s.k];let body='',marks={};
    if(s.dims)body=$t(`<div class="msg bad" style="display:block">Ta macierz ma inny wymiar niż poprzednia (${dimS(mats[s.k-1])} → ${dimS(B)}). Operacje na wierszach nie zmieniają wymiaru.</div>`,`<div class="msg bad" style="display:block">This matrix has a different size from the previous one (${dimS(mats[s.k-1])} → ${dimS(B)}). Row operations do not change the size.</div>`);
    else if(s.ok)body=$t(`<div class="msg ok" style="display:block">✓ Poprawnie — ta macierz powstaje z poprzedniej przez operacje na wierszach.</div>`,`<div class="msg ok" style="display:block">✓ Correct — this matrix follows from the previous one by row operations.</div>`);
    else if(s.lost)body=$t(`<div class="msg bad" style="display:block">✗ Każdy wiersz da się otrzymać z poprzednich, ale zgubiłeś informację — rząd spadł. Pewnie któryś wiersz zastąpiłeś kombinacją innych bez niego samego (np. pomnożyłeś przez 0 albo przepisałeś inny wiersz dwa razy).</div>`,`<div class="msg bad" style="display:block">✗ Every row can be obtained from the previous ones, but information was lost — the rank dropped. You probably replaced a row with a combination of the others that leaves the row itself out (e.g. multiplied it by 0 or copied another row twice).</div>`);
    else{
      const items=s.bad.map(o=>{
        if(!o.g)return $t(`<li>Wiersz ${o.i+1} nie wynika z poprzedniej macierzy — nie umiem odgadnąć, jaką operację chciałeś zrobić. Policz go jeszcze raz.</li>`,`<li>Row ${o.i+1} does not follow from the previous matrix — I can’t guess which operation you meant. Compute it again.</li>`);
        const wrong=o.g.ok.map((v,q)=>v?null:q).filter(q=>q!==null);
        wrong.forEach(q=>{marks[o.i+','+q]='bad'});
        return $t(`<li>Wiersz ${o.i+1}: wygląda na <b>${opText(o.g.d)}</b>. ${wrong.map(q=>`W kolumnie ${q+1} powinno być <b>${o.g.exp[q].html()}</b>, a jest ${B[o.i][q].html()}.`).join(' ')}</li>`,`<li>Row ${o.i+1}: looks like <b>${opText(o.g.d)}</b>. ${wrong.map(q=>`In column ${q+1} it should be <b>${o.g.exp[q].html()}</b>, but it is ${B[o.i][q].html()}.`).join(' ')}</li>`);
      });
      body=$t(`<div class="msg bad" style="display:block">✗ Tu jest błąd.<ul class="rules">${items.join('')}</ul></div>`,`<div class="msg bad" style="display:block">✗ There is a mistake here.<ul class="rules">${items.join('')}</ul></div>`);
      if(firstBad<0)firstBad=s.k;
    }
    h+=$t(`<div class="card"><h2>Krok ${s.k}</h2><div class="line">${matMark(B,bar,marks)}</div>${body}</div>`,`<div class="card"><h2>Step ${s.k}</h2><div class="line">${matMark(B,bar,marks)}</div>${body}</div>`);
  });
  const last=mats[mats.length-1],n=last.length,w=last[0].length,nv=bar>0?bar:w;
  const red=JSON.stringify(rref(last,nv).A.map(r=>r.map(x=>x.str())))===JSON.stringify(last.map(r=>r.map(x=>x.str())));
  let fin=red?$t('✓ Ostatnia macierz jest w postaci schodkowej zredukowanej — eliminacja zakończona.','✓ The last matrix is in reduced row echelon form — the elimination is finished.'):$t('Ostatnia macierz nie jest jeszcze w postaci schodkowej zredukowanej — możesz liczyć dalej.','The last matrix is not in reduced row echelon form yet — you can keep going.');
  const first=mats[0],isI=(X,off)=>X.every((r,i)=>r.slice(off,off+n).every((x,j)=>x.eq(F(i===j?1:0))));
  if(firstBad<0&&red&&w===2*n&&isI(first,n)&&isI(last,0)){const inv=M.inv(first.map(r=>r.slice(0,n))),R=last.map(r=>r.slice(n));fin+=inv&&M.eq(inv,R)?$t(' Za kreską masz poprawną odwrotność ✓.',' After the bar you have the correct inverse ✓.'):$t(' Za kreską powinna być odwrotność, ale coś się nie zgadza.',' The inverse should be after the bar, but something does not match.')}
  return $t(`<div class="msg ${firstBad<0?'ok':'bad'}" style="display:block">${firstBad<0?'✓ Wszystkie kroki są poprawne.':`Pierwszy błąd jest w kroku ${firstBad}. Kolejne kroki sprawdzam względem tego, co sam napisałeś.`} ${fin}</div>`,`<div class="msg ${firstBad<0?'ok':'bad'}" style="display:block">${firstBad<0?'✓ All steps are correct.':`The first mistake is in step ${firstBad}. I check the following steps against what you wrote yourself.`} ${fin}</div>`)+h;
}
// ---------- Znajdź mój błąd: iloczyn ----------
function mulReport(A,B,C){
  if(A[0].length!==B.length)throw new Error($t(`Nie da się pomnożyć ${dimS(A)} przez ${dimS(B)} — liczba kolumn A musi być równa liczbie wierszy B.`,`Cannot multiply ${dimS(A)} by ${dimS(B)} — the number of columns of A must equal the number of rows of B.`));
  const R=M.mul(A,B);
  if(C.length!==R.length||C[0].length!==R[0].length)return $t(`<div class="msg bad" style="display:block">Wynik powinien mieć wymiar ${dimS(R)}, a Twój ma ${dimS(C)}. Wymiar iloczynu: (m×n)·(n×p) = m×p.</div>`,`<div class="msg bad" style="display:block">The result should be ${dimS(R)}, but yours is ${dimS(C)}. Size of a product: (m×n)·(n×p) = m×p.</div>`);
  const marks={},lines=[];
  R.forEach((r,i)=>r.forEach((v,j)=>{if(!v.eq(C[i][j])){marks[i+','+j]='bad';lines.push($t(`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${v.html()}</b> &nbsp;<span class="mute">(u Ciebie ${C[i][j].html()})</span></div>`,`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${v.html()}</b> &nbsp;<span class="mute">(yours: ${C[i][j].html()})</span></div>`))}else marks[i+','+j]='ok'}));
  return (lines.length?$t(`<div class="msg bad" style="display:block">✗ Błędnych elementów: ${lines.length} z ${R.length*R[0].length} (zaznaczone na czerwono).</div>`,`<div class="msg bad" style="display:block">✗ Wrong entries: ${lines.length} of ${R.length*R[0].length} (marked in red).</div>`):$t(`<div class="msg ok" style="display:block">✓ Iloczyn jest policzony poprawnie.</div>`,`<div class="msg ok" style="display:block">✓ The product is computed correctly.</div>`))+
    $t(`<div class="line">Twój wynik: ${matMark(C,-1,marks)}</div>`,`<div class="line">Your result: ${matMark(C,-1,marks)}</div>`)+(lines.length?$t(`<h3>Jak powinno być</h3>${lines.join('')}`,`<h3>What it should be</h3>${lines.join('')}`):'');
}

// ---------- Odpowiedzi: pola, sprawdzanie, podgląd ----------
const INPA='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"';
function ansHtml(ans,id){
  if(ans.kind==='mat'){const r=ans.M.length,c=ans.M[0].length;return $t(`<span class="gv"><span>${ans.lab} =</span> <span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},(_,k)=>`<input id="${id}-${k}" ${INPA} aria-label="wiersz ${Math.floor(k/c)+1}, kolumna ${k%c+1}">`).join('')}</span></span>`,`<span class="gv"><span>${ans.lab} =</span> <span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},(_,k)=>`<input id="${id}-${k}" ${INPA} aria-label="row ${Math.floor(k/c)+1}, column ${k%c+1}">`).join('')}</span></span>`)}
  if(ans.kind==='num')return `<label class="ans-in" for="${id}-0"><span>${ans.lab} =</span><input id="${id}-0" ${INPA}></label>`;
  if(ans.kind==='formula')return `<div class="row" style="margin-top:0;flex-wrap:nowrap"><span class="m" style="font-size:20px"><i>X</i>&nbsp;=</span><input id="${id}-f" class="code" ${INPA} placeholder="${$t('np.','e.g.')} A^-1(C-B)"></div>`;
  if(ans.kind==='sys'){
    const last=ans.names[ans.names.length-1],ex=`1/2 - 3${last}`;
    return `<p class="mute" style="margin:0 0 6px">${$t('Ile rozwiązań ma ten układ?','How many solutions does this system have?')}</p><div class="chips" data-gst-box="${id}"><button class="chip on" data-gst="one">${$t('jedno','one')}</button><button class="chip" data-gst="inf">${$t('nieskończenie wiele','infinitely many')}</button><button class="chip" data-gst="none">${$t('brak — sprzeczny','none — inconsistent')}</button></div>`+
      `<p class="mute" id="${id}-genhint" hidden style="margin:10px 0 0">${$t(`Wpisz rozwiązanie ogólne: przy niewiadomych swobodnych (parametrach) zostaw puste pole albo wpisz samą nazwę, pozostałe wyraź przez nie, np. <code>${ex}</code>.`,`Type the general solution: for the free unknowns (parameters) leave the field empty or type just the name; express the others in terms of them, e.g. <code>${ex}</code>.`)}</p>`+
      `<div class="nums" id="${id}-vals" style="margin-top:10px">${ans.names.map((v,j)=>`<label class="ans-in" for="${id}-v${j}"><span>${nmHtml(v)} =</span><input id="${id}-v${j}" ${INPA}></label>`).join('')}</div>`;
  }
  if(ans.kind==='param')return $t(`<p class="mute" style="margin:0 0 6px">Dla jakich <i>a</i> układ <b>nie</b> ma dokładnie jednego rozwiązania? Wpisz te wartości i wybierz, co się wtedy dzieje (puste wiersze pomiń).</p>`,`<p class="mute" style="margin:0 0 6px">For which <i>a</i> does the system <b>not</b> have exactly one solution? Type these values and choose what happens then (leave unused rows empty).</p>`)+
    [0,1,2].map(k=>$t(`<div class="row" style="margin-top:6px"><label class="ans-in" for="${id}-a${k}"><span><i>a</i> =</span><input id="${id}-a${k}" ${INPA}></label><select id="${id}-t${k}" class="code" style="width:auto;padding:7px 10px"><option value="">— co wtedy? —</option><option value="none">układ sprzeczny</option><option value="inf">nieskończenie wiele rozwiązań</option></select></div>`,`<div class="row" style="margin-top:6px"><label class="ans-in" for="${id}-a${k}"><span><i>a</i> =</span><input id="${id}-a${k}" ${INPA}></label><select id="${id}-t${k}" class="code" style="width:auto;padding:7px 10px"><option value="">— what then? —</option><option value="none">inconsistent system</option><option value="inf">infinitely many solutions</option></select></div>`)).join('');
  return '';
}
// inp — odczytane pola (patrz ansRead w ui.js); zwraca {score 0..1, empty, marks:{sufiks id: true/false}, msg}
function ansCheck(ans,inp){
  if(ans.kind==='mat'){
    const exp=ans.M.flat(),marks={};let good=0,empty=0;
    inp.forEach((s,k)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(exp[k]));marks[k]=ok;if(ok)good++});
    return {score:good/exp.length,empty:empty===exp.length,partEmpty:empty,marks,msg:good===exp.length?'':$t(`Dobrze: ${good} z ${exp.length}.`,`Correct: ${good} of ${exp.length}.`)};
  }
  if(ans.kind==='num'){const s=String(inp).trim(),v=parseFr(s),ok=!!(v&&v.eq(ans.v));return {score:ok?1:0,empty:!s,marks:{0:ok},msg:s&&!v?$t('To nie jest liczba (ułamki pisz jako 1/2).','That is not a number (write fractions as 1/2).'):''}}
  if(ans.kind==='formula'){
    const s=String(inp).trim();if(!s)return {score:0,empty:true,marks:{f:false},msg:''};
    try{const ok=checkAnswer(ans.sol,s);return {score:ok?1:0,empty:false,marks:{f:ok},msg:ok?'':$t('Ten wzór daje inne X.','This formula gives a different X.')}}catch(e){return {score:0,empty:false,marks:{f:false},msg:e.message}}
  }
  if(ans.kind==='sys'){
    if(inp.type==='one'&&inp.vals.every(x=>!String(x).trim()))return {score:0,empty:true,marks:{},msg:''};
    if(inp.type!==ans.type)return {score:0,empty:false,marks:{},msg:$t('Zła liczba rozwiązań — porównaj rz <i>A</i> i rz [<i>A</i> | <i>B</i>] z liczbą niewiadomych.','Wrong number of solutions — compare rank <i>A</i> and rank [<i>A</i> | <i>B</i>] with the number of unknowns.')};
    if(ans.type==='none')return {score:1,empty:false,marks:{},msg:''};
    if(ans.type==='inf')return checkGeneral(ans,inp.vals);
    const marks={};let good=0,empty=0;
    inp.vals.forEach((s,j)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(ans.vals[j]));marks['v'+j]=ok;if(ok)good++});
    return {score:good/ans.vals.length,empty:empty===ans.vals.length,partEmpty:empty,marks,msg:good===ans.vals.length?'':$t(`Dobrze: ${good} z ${ans.vals.length}.`,`Correct: ${good} of ${ans.vals.length}.`)};
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
    return {score,empty:!filled,marks,msg:score===1?'':$t(`Wartości <i>a</i> z dobrym opisem: ${good} z ${ans.roots.length}${extra?`, zbędnych: ${extra}`:''}.`,`Values of <i>a</i> with the right description: ${good} of ${ans.roots.length}${extra?`, extra: ${extra}`:''}.`)};
  }
  return {score:0,empty:true,marks:{},msg:''};
}
// rozwiązanie ogólne ucznia: dowolny wybór zmiennych swobodnych; każde równanie musi być spełnione tożsamościowo
function checkGeneral(ans,vals){
  const nv=ans.names.length,idx=Object.fromEntries(ans.names.map((v,j)=>[v,j])),forms=[],marks={};
  if(vals.every(x=>!String(x).trim()))return {score:.5,empty:false,marks,msg:$t('Liczba rozwiązań się zgadza — dopisz jeszcze rozwiązanie ogólne.','The number of solutions is right — now also write the general solution.')};
  for(let j=0;j<nv;j++){
    const s=String(vals[j]).trim().replace(/[−–]/g,'-').replace(/(\d),(\d)/g,'$1.$2')||ans.names[j];
    let p;try{p=parseLinSide(s,j)}catch(e){marks['v'+j]=false;return {score:.5,empty:false,marks,msg:$t(`Nie rozumiem wyrażenia przy ${nmHtml(ans.names[j])}. Pisz np. 2 - 3${ans.names[nv-1]}.`,`I can’t read the expression for ${nmHtml(ans.names[j])}. Write e.g. 2 - 3${ans.names[nv-1]}.`)}}
    const c=ans.names.map(()=>F(0));
    for(const [k,v] of Object.entries(p.v)){if(!(k in idx)){marks['v'+j]=false;return {score:.5,empty:false,marks,msg:$t(`Przy ${nmHtml(ans.names[j])} jest nieznana zmienna „${k}”. Używaj tylko niewiadomych z układu.`,`The expression for ${nmHtml(ans.names[j])} uses an unknown variable “${k}”. Use only the unknowns of the system.`)}}c[idx[k]]=c[idx[k]].add(v)}
    forms.push({c,k:p.c});
  }
  const free=forms.map((f,j)=>f.k.z&&f.c.every((x,q)=>q===j?x.one:x.z)?j:-1).filter(j=>j>=0),need=nv-ans.rank;
  if(free.length!==need){free.forEach(j=>{marks['v'+j]=false});return {score:.5,empty:false,marks,msg:$t(`Parametrów (niewiadomych swobodnych) powinno być ${need}, a u Ciebie jest ${free.length}.`,`There should be ${need} ${need===1?'parameter':'parameters'} (free unknowns), but you have ${free.length}.`)}}
  for(let j=0;j<nv;j++)if(!free.includes(j)&&forms[j].c.some((x,q)=>!x.z&&!free.includes(q))){marks['v'+j]=false;return {score:.5,empty:false,marks,msg:$t(`Wyraź ${nmHtml(ans.names[j])} tylko przez niewiadome swobodne (${free.map(q=>nmHtml(ans.names[q])).join(', ')}).`,`Express ${nmHtml(ans.names[j])} only in terms of the free unknowns (${free.map(q=>nmHtml(ans.names[q])).join(', ')}).`)}}
  const bad=[];
  ans.Ab.forEach((row,i)=>{const cc=ans.names.map(()=>F(0));let k=F(0);row.slice(0,nv).forEach((a,j)=>{if(a.z)return;forms[j].c.forEach((x,q)=>{cc[q]=cc[q].add(a.mul(x))});k=k.add(a.mul(forms[j].k))});if(!k.eq(row[nv])||cc.some(x=>!x.z))bad.push(i+1)});
  ans.names.forEach((_,j)=>{marks['v'+j]=!bad.length});
  if(bad.length)return {score:.5,empty:false,marks,msg:$t(`Liczba rozwiązań się zgadza, ale Twoje rozwiązanie ogólne nie spełnia ${bad.length===1?'równania':'równań'} ${bad.join(', ')}.`,`The number of solutions is right, but your general solution does not satisfy equation${bad.length===1?'':'s'} ${bad.join(', ')}.`)};
  return {score:1,empty:false,marks,msg:''};
}
function ansShow(ans){
  if(ans.kind==='mat')return `${ans.lab} = ${M.html(ans.M)}`;
  if(ans.kind==='num')return `${ans.lab} = ${ans.v.html()}`;
  if(ans.kind==='formula')return `<i>X</i> = ${rP(ans.sol.P)}`;
  if(ans.kind==='sys')return ans.type==='one'?ans.names.map((v,j)=>`${nmHtml(v)} = ${ans.vals[j].html()}`).join(', '):ans.type==='inf'?`${TYPE_PL.inf}: ${ans.gen}`:TYPE_PL[ans.type];
  if(ans.kind==='param')return ans.roots.map(o=>`<i>a</i> = ${o.a.html()}: ${TYPE_PL[o.type]}`).join('; ')+$t('; dla pozostałych — jedno rozwiązanie','; for all other values — one solution');
  return '';
}
function inpShow(ans,inp){
  const e=s=>String(s).trim()?String(s).trim().replace(/</g,'&lt;'):'…';
  if(ans.kind==='mat'){const c=ans.M[0].length;return `<span class="mat" style="grid-template-columns:repeat(${c},auto)">${inp.map(s=>`<span>${e(s)}</span>`).join('')}</span>`}
  if(ans.kind==='num'||ans.kind==='formula')return e(inp);
  if(ans.kind==='sys')return inp.type==='one'?ans.names.map((v,j)=>`${nmHtml(v)} = ${e(inp.vals[j])}`).join(', '):inp.type==='inf'?`${TYPE_PL.inf}: `+ans.names.map((v,j)=>`${nmHtml(v)} = ${String(inp.vals[j]).trim()?e(inp.vals[j]):v}`).join(', '):TYPE_PL[inp.type];
  if(ans.kind==='param')return inp.filter(r=>String(r.a).trim()).map(r=>`<i>a</i> = ${e(r.a)}: ${r.type?TYPE_PL[r.type]:'…'}`).join('; ')||'…';
  return '';
}

// ---------- Opakowania istniejących generatorów w format zadania ----------
const opTopic=type=>()=>{const t=genTask(type);return {q:t.q,body:givenH(t.given),ans:{kind:'mat',M:t.ans,lab:t.lab},sol:t.sol,fr:t.fr}};
function xnumTopic(n,rect){return ()=>{
  const T=genNum(n,-1,rect);
  return {q:$t('Wyznacz macierz <i>X</i>','Find the matrix <i>X</i>'),body:eqH(T.sol.orig)+givenH([...T.sol.letters].sort().map(c=>[c,T.env[c]])),ans:{kind:'mat',M:T.X,lab:'<i>X</i>'},sol:numSolHtml(T),fr:()=>numFrames(T),
    hint:$t(`Najpierw na literach: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Potem odwrotność metodą Gaussa i mnożenie.`,`First symbolically: <span class="f"><i>X</i> = ${rP(T.sol.P)}</span>. Then the inverse by Gaussian elimination and multiplication.`)};
}}
function xlinTopic(){
  const t=genLin(pick(NT.filter(x=>x.lin)));
  return {q:$t('Wyznacz macierz <i>X</i>','Find the matrix <i>X</i>'),body:eqH(t.orig)+givenH(t.letters.map(c=>[c,t.env[c]])),ans:{kind:'mat',M:t.X,lab:'<i>X</i>'},sol:t.solHtml,fr:t.fr,hint:t.hint};
}
function xsymTopic(){
  for(;;){const q=genEq(rnd(1,3));let sol;try{sol=solve(q)}catch(e){continue}
    return {q:$t('Wyznacz <i>X</i> (na literach)','Find <i>X</i> (symbolically)'),body:eqH(sol.orig),ans:{kind:'formula',sol},
      sol:sol.steps.map(s=>`<div class="line"><span class="mute">${s.title}:</span><br>${s.lines[s.lines.length-1]}</div>`).join(''),fr:()=>symFrames(sol),
      hint:$t('Rozpisz nawiasy (kolejność się odwraca), przenieś wyrazy z <i>X</i> na lewo, potem mnóż przez odwrotności z właściwej strony.','Expand the brackets (the order reverses), move the <i>X</i> terms to the left, then multiply by inverses from the correct side.')}}
}
const METH_PL={gauss:'',get mac(){return $t(' metodą macierzową',' by the matrix method')},get cra(){return $t(' wzorami Cramera',' by Cramer’s rule')}};
// oczekiwana odpowiedź dla układu: liczba rozwiązań, wartości albo rozwiązanie ogólne
function sysAns(Ab,names){
  const nv=names.length,res=rref(Ab,nv),sol=sysSolution(res,nv);
  return {kind:'sys',type:res.type,names,Ab,rank:res.rank,vals:res.type==='one'?sol.forms.map(f=>f.k):null,gen:res.type==='inf'?genSolHtml(sol,names):''};
}
// układ 4×4 jak na kolokwium: 2–3 równania bazowe, reszta to ich kombinacje (większe liczby, znikające wyrazy),
// zwykle sprzeczny albo nieoznaczony — stąd „jeśli to możliwe”
function genExamSys(){
  const nv=4,m=4,names=['x1','x2','x3','x4'],want=pick(['none','none','none','inf','inf','inf','one']),r=want==='one'?4:pick([2,2,3]);
  let best=null,found=0;
  for(let at=0;at<900&&found<45;at++){
    const base=[];
    for(let t=0;t<40&&base.length<r;t++){const row=Array.from({length:nv},()=>F(rnd(1,8)*(Math.random()<.15?-1:1)));if(rankOf([...base,row])===base.length+1)base.push(row)}
    if(base.length<r)continue;
    const rows=base.map(x=>x.slice()),dep=[];let fail=false;
    while(rows.length<m){
      let row=null;
      for(let t=0;t<80&&!row;t++){
        const k=base.map(()=>pick([-4,-3,-2,-1,1,2,3,4,0,0]));if(k.filter(x=>x).length<Math.min(2,r))continue;
        const c=base[0].map((_,j)=>base.reduce((s,bb,i)=>s.add(bb[j].mul(F(k[i]))),F(0)));
        if(c.every(x=>Math.abs(x.n)<=20)&&c.filter(x=>!x.z).length>=2&&!rows.some(o=>o.every((x,j)=>x.eq(c[j]))))row=c;
      }
      if(!row){fail=true;break}
      dep.push(rows.length);rows.push(row);
    }
    if(fail)continue;
    const x0=Array.from({length:nv},()=>F(rnd(-2,3))),Ab=rows.map(row=>[...row,row.reduce((s,a,j)=>s.add(a.mul(x0[j])),F(0))]);
    if(want==='none'){const i=pick(dep);Ab[i][nv]=Ab[i][nv].add(F(pick([-3,-2,-1,1,2,3])))}
    if(Ab.some(row=>Math.abs(row[nv].n)>24))continue;
    const res=rref(Ab,nv);if(res.type!==want)continue;found++;
    const dr=dep.map(i=>Ab[i]),zeros=dr.reduce((s,row)=>s+row.slice(0,nv).filter(x=>x.z).length,0),big=Math.max(0,...dr.flatMap(row=>row.slice(0,nv).map(x=>Math.abs(x.n))));
    // ładny wynik: małe liczby i mało ułamków w końcowej postaci (jak w zadaniach z kolokwium)
    const fin=res.A.flat(),finMax=Math.max(...fin.map(x=>Math.max(Math.abs(x.n),x.d))),finFr=fin.filter(x=>x.d!==1).length;
    const sc=fracCount(res)*.3+finFr*1.5+Math.max(0,finMax-6)*1.5+(zeros>=1&&zeros<=2?-4:zeros>2?2:0)+(big>=8?-3:0)+Math.max(...Ab.map(row=>Math.abs(row[nv].n)))/6;
    if(!best||sc<best.sc)best={Ab,sc};
  }
  if(!best)return genExamSys();
  const Ab=best.Ab;
  if(Math.random()<.35)for(let i=Ab.length-1;i>0;i--){const j=rnd(0,i);[Ab[i],Ab[j]]=[Ab[j],Ab[i]]}
  return {Ab,names};
}
function examTopic(){
  const g=genExamSys(),out=sysMethodHtml(g.Ab,g.names,'gauss');
  return {q:$t('Jeśli to możliwe, rozwiąż układ równań','Solve the system of equations, if possible'),body:`<div class="sysbox">${sysHtml(abRows(g.Ab,4),g.names)}</div>`,
    ans:sysAns(g.Ab,g.names),sol:out.html,fr:()=>sysFrames(g.Ab,g.names,'gauss'),
    hint:$t('Macierz rozszerzona i Gauss. Sprawdź, czy któreś równanie nie jest kombinacją innych (np. w₃ = 4w₁ − 4w₂) — wtedy porównaj prawe strony: zgodne → parametry, niezgodne → sprzeczność.','Augmented matrix and Gauss. Check whether an equation is a combination of others (e.g. R₃ = 4R₁ − 4R₂) — then compare the right-hand sides: they match → parameters, they don’t → inconsistent.')};
}
function sysTopic(sz,mode,method){return ()=>{
  const g=genSys(sz,mode),out=sysMethodHtml(g.Ab,g.names,method);
  return {q:$t('Rozwiąż układ równań','Solve the system of equations')+METH_PL[method],body:`<div class="sysbox">${sysHtml(abRows(g.Ab,g.names.length),g.names)}</div>`,
    ans:sysAns(g.Ab,g.names),sol:out.html,fr:()=>sysFrames(g.Ab,g.names,method),
    hint:{gauss:$t('Macierz rozszerzona [<i>A</i> | <i>B</i>] i eliminacja kolumna po kolumnie.','Augmented matrix [<i>A</i> | <i>B</i>] and elimination column by column.'),mac:$t('<i>X</i> = <i>A</i><sup>−1</sup><i>B</i> — najpierw odwrotność, potem mnożenie.','<i>X</i> = <i>A</i><sup>−1</sup><i>B</i> — first the inverse, then the multiplication.'),cra:$t('<i>W</i> = det <i>A</i>, potem <i>x</i> = <i>W<sub>x</sub></i>/<i>W</i>.','<i>D</i> = det <i>A</i>, then <i>x</i> = <i>D<sub>x</sub></i>/<i>D</i>.')}[method]};
}}
function detTopic(n){return ()=>{
  const A=n===4?genDet4():genDet(n),v=detF(A);
  return {q:$t(`Oblicz wyznacznik macierzy ${n}×${n}`,`Compute the determinant of the ${n}×${n} matrix`),body:givenH([['A',A]]),ans:{kind:'num',v,lab:'det <i>A</i>'},
    sol:n===4?laplaceHtml(A):`<div class="line">det <i>A</i> = ${matH(A,{det:true})}</div>${detLines(A)}`,
    fr:()=>n===4?laplaceFrames(A):detFrames(A,'det <i>A</i>',$t('Wyznacznik','Determinant'),true),
    hint:n===2?'<i>ad</i> − <i>bc</i>.':n===3?$t('Sarrus: dopisz dwie pierwsze kolumny; trzy przekątne z plusem, trzy z minusem.','Sarrus: copy the first two columns; three diagonals with a plus, three with a minus.'):$t("Rozwinięcie Laplace'a względem wiersza lub kolumny z największą liczbą zer.","Laplace expansion along the row or column with the most zeros.")};
}}
function rankTopic(){
  const A=genRank(),r=rankOf(A);
  return {q:$t('Wyznacz rząd macierzy','Find the rank of the matrix'),body:givenH([['A',A]]),ans:{kind:'num',v:F(r),lab:$t('rz <i>A</i>','rank <i>A</i>')},sol:rankHtml(A),fr:()=>rankFrames(A),
    hint:$t('Sprowadź macierz do postaci schodkowej (zera pod elementami głównymi) i policz niezerowe wiersze.','Reduce the matrix to row echelon form (zeros below the pivots) and count the nonzero rows.')};
}
function paramTopic(){
  const P=genParam();
  return {q:$t('Zbadaj liczbę rozwiązań w zależności od parametru <i>a</i>','Determine the number of solutions depending on the parameter <i>a</i>'),body:`<div class="sysbox">${paramSysHtml(P.E,P.b,P.names)}</div>`,
    ans:{kind:'param',roots:P.roots.map((a,k)=>({a,type:P.types[k]}))},sol:paramHtml(P),fr:()=>paramFrames(P),
    hint:$t('Policz wyznacznik główny <i>W</i>(<i>a</i>). Gdzie <i>W</i> ≠ 0 — jedno rozwiązanie. Wartości z <i>W</i> = 0 podstaw i sprawdź Gaussem.','Compute the main determinant <i>D</i>(<i>a</i>). Where <i>D</i> ≠ 0 — one solution. Substitute the values with <i>D</i> = 0 and check them with Gaussian elimination.')};
}

// ---------- REJESTR ----------
const TOPICS=[
  {id:'mul',en:'Multiplication <i>A</i>·<i>B</i>',sec:'Działania',name:'Mnożenie <i>A</i>·<i>B</i>',gen:opTopic('mul')},
  {id:'add',en:'α<i>A</i> + β<i>B</i>',sec:'Działania',name:'α<i>A</i> + β<i>B</i>',gen:opTopic('add')},
  {id:'trans',en:'Transpose',sec:'Działania',name:'Transpozycja',gen:opTopic('trans')},
  {id:'expr',en:'Expressions',sec:'Działania',name:'Wyrażenia',gen:opTopic('expr')},
  {id:'inv2',en:'<i>A</i><sup>−1</sup> 2×2',sec:'Macierz odwrotna',name:'<i>A</i><sup>−1</sup> 2×2',gen:opTopic('inv2')},
  {id:'inv3',en:'<i>A</i><sup>−1</sup> 3×3',sec:'Macierz odwrotna',name:'<i>A</i><sup>−1</sup> 3×3',gen:opTopic('inv3')},
  {id:'xsym',en:'<i>X</i> symbolically',sec:'Równania macierzowe',name:'<i>X</i> na literach',gen:xsymTopic},
  {id:'xnum2',en:'<i>X</i> with numbers 2×2',sec:'Równania macierzowe',name:'<i>X</i> na liczbach 2×2',gen:xnumTopic(2,false)},
  {id:'xnum3',en:'<i>X</i> with numbers 3×3',sec:'Równania macierzowe',name:'<i>X</i> na liczbach 3×3',gen:xnumTopic(3,false)},
  {id:'xrect',en:'Rectangular <i>X</i>',sec:'Równania macierzowe',name:'<i>X</i> prostokątna',gen:xnumTopic(2,true)},
  {id:'xlin',en:'Using unknowns',sec:'Równania macierzowe',name:'Przez niewiadome',gen:xlinTopic},
  {id:'sys2',en:'Gauss 2×2',sec:'Układy równań',name:'Gauss 2×2',gen:sysTopic(2,'one','gauss')},
  {id:'sys3',en:'Gauss 3×3',sec:'Układy równań',name:'Gauss 3×3',gen:sysTopic(3,'one','gauss')},
  {id:'sys4',en:'Gauss 4×4',sec:'Układy równań',name:'Gauss 4×4',gen:sysTopic(4,'one','gauss')},
  {id:'sysany',en:'How many solutions?',sec:'Układy równań',name:'Ile rozwiązań?',gen:sysTopic(3,'any','gauss')},
  {id:'sysrect',en:'Non-square (m ≠ n)',sec:'Układy równań',name:'Nietypowe (m ≠ n)',gen:sysTopic('r','any','gauss')},
  {id:'sysmac',en:'Matrix method',sec:'Układy równań',name:'Metoda macierzowa',gen:sysTopic(3,'one','mac')},
  {id:'syscra',en:'Cramer’s rule',sec:'Układy równań',name:'Wzory Cramera',gen:sysTopic(3,'one','cra')},
  {id:'sysexam',en:'Exam style 4×4',sec:'Układy równań',name:'Jak na sprawdzianie 4×4',gen:examTopic},
  {id:'param',en:'With parameter <i>a</i>',sec:'Układy równań',name:'Z parametrem <i>a</i>',gen:paramTopic},
  {id:'det2',en:'det 2×2',sec:'Wyznaczniki',name:'det 2×2',gen:detTopic(2)},
  {id:'det3',en:'det 3×3 (Sarrus)',sec:'Wyznaczniki',name:'det 3×3 (Sarrus)',gen:detTopic(3)},
  {id:'det4',en:'det 4×4 (Laplace)',sec:'Wyznaczniki',name:"det 4×4 (Laplace)",gen:detTopic(4)},
  {id:'detprop',en:'Properties',sec:'Wyznaczniki',name:'Własności',gen:genDetProp},
  {id:'rank',en:'Rank of a matrix',sec:'Rząd macierzy',name:'Rząd macierzy',gen:rankTopic},
];
const SECTIONS=[...new Set(TOPICS.map(t=>t.sec))];
// nazwy działów po angielsku (klucz `sec` zostaje polski, bo pod nim zapisują się ustawienia)
const SEC_EN={'Działania':'Operations','Macierz odwrotna':'Inverse matrix','Równania macierzowe':'Matrix equations','Układy równań':'Systems of equations','Wyznaczniki':'Determinants','Rząd macierzy':'Rank'};
const secName=s=>$t(s,SEC_EN[s]||s);
const tName=t=>$t(t.name,t.en||t.name);
const topicById=id=>TOPICS.find(t=>t.id===id);
