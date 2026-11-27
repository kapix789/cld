const givenH=g=>`<div class="given">${g.map(([n,A])=>`<span class="gv"><i>${n}</i> = ${M.html(A)}</span>`).join('')}</div>`;
const eqH=s=>`<div class="eq">${s}</div>`;

function frameStatic(f){
  const V=(f.B||[]).map(b=>b.M.map(r=>r.slice()));
  (f.U||[]).forEach(u=>{if(u.v!==undefined)V[u.b][u.i][u.j]=u.v});
  return (f.B||[]).map((b,bi)=>(bi?` ${(f.J&&f.J[bi-1])||''} `:'')+`<span class="mat${b.det?' det':''}" style="grid-template-columns:repeat(${V[bi][0].length},auto)">${V[bi].flat().map((x,k)=>`<span${k%V[bi][0].length===b.bar?' class="bl"':''}>${x}</span>`).join('')}</span>`).join('');
}

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
    for(let e=Math.random()<.8?2:1;e>0;e--){const i=rnd(0,3),j=rnd(0,3);if((row?i:j)!==k)A[i][j]=F(0)}
    if(Math.abs(detF(A).n)<=150)return A;
  }
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
    ()=>({e:'det(<i>A</i><sup>−1</sup><i>B</i><sup>T</sup><i>A</i>)',v:b,w:[$t('det(<i>A</i><sup>−1</sup>) · det <i>A</i> = 1, więc się skracają','det(<i>A</i><sup>−1</sup>) · det <i>A</i> = 1, so they cancel'),$t('zostaje det(<i>B</i><sup>T</sup>) = det <i>B</i>','what remains is det(<i>B</i><sup>T</sup>) = det <i>B</i>')]}),
    ()=>({e:`det((${kS}<i>A</i>)<sup>−1</sup>)`,v:F(1).div(kn.mul(a)),w:[`det(${kS}<i>A</i>) = (${kS})<sup>${n}</sup>·det <i>A</i> = ${kn.mul(a).html()}`,'det(<i>M</i><sup>−1</sup>) = 1 / det <i>M</i>']}),
  ])();
  const data=$t(`<p class="f" style="font-size:18px"><i>A</i>, <i>B</i>: macierze ${n}×${n}, &nbsp;det <i>A</i> = ${a.html()}, &nbsp;det <i>B</i> = ${b.html()}.</p>`,`<p class="f" style="font-size:18px"><i>A</i>, <i>B</i>: ${n}×${n} matrices, &nbsp;det <i>A</i> = ${a.html()}, &nbsp;det <i>B</i> = ${b.html()}.</p>`);
  return {q:$t(`Oblicz ${T.e}`,`Compute ${T.e}`),body:data,ans:{kind:'num',v:T.v,lab:T.e},
    sol:$t(`<p>Korzystamy z własności wyznacznika:</p><ul class="rules">${T.w.map(x=>`<li>${x}</li>`).join('')}</ul><div class="line res">${T.e} = ${T.v.html()}</div>`,`<p>We use the properties of the determinant:</p><ul class="rules">${T.w.map(x=>`<li>${x}</li>`).join('')}</ul><div class="line res">${T.e} = ${T.v.html()}</div>`),
    hint:$t('Własności: det(<i>AB</i>) = det <i>A</i>·det <i>B</i>, det(<i>A</i><sup>T</sup>) = det <i>A</i>, det(<i>A</i><sup>−1</sup>) = 1/det <i>A</i>, det(<i>kA</i>) = <i>k</i><sup><i>n</i></sup>·det <i>A</i>.','Properties: det(<i>AB</i>) = det <i>A</i>·det <i>B</i>, det(<i>A</i><sup>T</sup>) = det <i>A</i>, det(<i>A</i><sup>−1</sup>) = 1/det <i>A</i>, det(<i>kA</i>) = <i>k</i><sup><i>n</i></sup>·det <i>A</i>.'),
    fr:()=>[{sec:$t('Własności wyznacznika','Properties of the determinant'),t:$t(`Oblicz ${T.e}`,`Compute ${T.e}`),x:$t('Niczego nie trzeba wymnażać, wystarczą własności wyznacznika.','Nothing needs multiplying out; the properties of the determinant are enough.'),S:data,C:[...T.w.map(h=>({h,full:true})),{h:`<b>${T.e} = ${T.v.html()}</b>`,full:true}],U:[...T.w.map((_,k)=>({t:.6+k*1.3,line:k})),{t:.6+T.w.length*1.3,line:T.w.length}]}]};
}

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
    const sc=planMax(elimPlan(rows,n,{down:true,norm:false}));
    if(!best||sc<best.sc)best={A:rows,sc};
    if(sc<=12)break;
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
  let h=$t(`<h3>1. Wyznacznik główny (liczymy jak zwykle, <i>a</i> traktujemy jak liczbę)</h3><div class="line"><i>W</i> = ${matH(E.map(r=>r.map(laHtml)),{det:true})}</div><div class="line">= ${detFormula(E)}</div><div class="line">= ${polyHtml(c)}${roots.length>1?' = '+factorHtml(c,roots):''}</div>`,`<h3>1. The main determinant (computed as usual, treating <i>a</i> as a number)</h3><div class="line"><i>D</i> = ${matH(E.map(r=>r.map(laHtml)),{det:true})}</div><div class="line">= ${detFormula(E)}</div><div class="line">= ${polyHtml(c)}${roots.length>1?' = '+factorHtml(c,roots):''}</div>`);
  h+=$t(`<h3>2. Kiedy <i>W</i> = 0?</h3><p><i>W</i> = 0 ⇔ ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}. Dla <i>a</i> ∉ {${rs}} jest <i>W</i> ≠ 0, więc układ ma <b>dokładnie jedno rozwiązanie</b> (układ Cramera).</p>`,`<h3>2. When is <i>D</i> = 0?</h3><p><i>D</i> = 0 ⇔ ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' or ')}. For <i>a</i> ∉ {${rs}} we have <i>D</i> ≠ 0, so the system has <b>exactly one solution</b> (a Cramer system).</p>`);
  roots.forEach((r,k)=>{const Ab=paramAt(P,r);h+=$t(`<h3>${3+k}. Podstawiamy <i>a</i> = ${r.html()}</h3><div class="sysbox">${sysHtml(abRows(Ab,n),names)}</div>${gaussSys(Ab,names).html}`,`<h3>${3+k}. Substituting <i>a</i> = ${r.html()}</h3><div class="sysbox">${sysHtml(abRows(Ab,n),names)}</div>${gaussSys(Ab,names).html}`)});
  return h+$t(`<h3>Odpowiedź</h3><ul class="rules"><li>dla <i>a</i> ∉ {${rs}}: ${TYPE_PL.one}</li>${roots.map((r,k)=>`<li>dla <i>a</i> = ${r.html()}: ${TYPE_PL[types[k]]}</li>`).join('')}</ul>`,`<h3>Answer</h3><ul class="rules"><li>for <i>a</i> ∉ {${rs}}: ${TYPE_PL.one}</li>${roots.map((r,k)=>`<li>for <i>a</i> = ${r.html()}: ${TYPE_PL[types[k]]}</li>`).join('')}</ul>`);
}
function paramFrames(P){
  const {E,b,names,c,roots,types}=P,n=names.length,sec=$t('Układ z parametrem','System with a parameter'),rs=roots.map(r=>r.html()).join(', '),fr=[];
  fr.push({sec,t:$t('Dyskusja układu z parametrem <i>a</i>','Discussing a system with the parameter <i>a</i>'),x:$t('Plan: najpierw wyznacznik główny <i>W</i>. Tam, gdzie <i>W</i> ≠ 0, jest dokładnie jedno rozwiązanie. Wartości <i>a</i>, dla których <i>W</i> = 0, sprawdzamy osobno: podstawiamy je i liczymy metodą Gaussa.','Plan: first the main determinant <i>D</i>. Wherever <i>D</i> ≠ 0 there is exactly one solution. The values of <i>a</i> with <i>D</i> = 0 are checked separately: substitute them and use Gaussian elimination.'),S:paramSysHtml(E,b,names)});
  fr.push({sec,t:$t('Wyznacznik główny <i>W</i>','The main determinant <i>D</i>'),x:$t(`Liczymy ${n===2?'ze wzoru <i>ad</i> − <i>bc</i>':'metodą Sarrusa'}, traktując <i>a</i> jak zwykłą liczbę, i porządkujemy wynik.`,`We compute ${n===2?'with the formula <i>ad</i> − <i>bc</i>':'with Sarrus’ rule'}, treating <i>a</i> as an ordinary number, and simplify.`),B:[bd(E.map(r=>r.map(laHtml)),{det:true,lab:$t('<i>W</i>','<i>D</i>')})],
    C:[{h:'= '+detFormula(E),full:true},{h:`= <b>${polyHtml(c)}</b>${roots.length>1?' = '+factorHtml(c,roots):''}`,full:true}],U:[{t:.5,line:0},{t:2,line:1}]});
  fr.push({sec,t:$t('Kiedy <i>W</i> = 0?','When is <i>D</i> = 0?'),x:$t(`Przyrównujemy wyznacznik do zera. Dla każdego innego <i>a</i> jest <i>W</i> ≠ 0 i wtedy układ ma dokładnie jedno rozwiązanie (wzory Cramera).`,`Set the determinant equal to zero. For every other <i>a</i> we have <i>D</i> ≠ 0, and then the system has exactly one solution (Cramer’s rule).`),
    C:[{h:$t(`${polyHtml(c)} = 0 &nbsp;⇔&nbsp; ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' lub ')}`,`${polyHtml(c)} = 0 &nbsp;⇔&nbsp; ${roots.map(r=>`<i>a</i> = ${r.html()}`).join(' or ')}`),full:true},{h:`<i>a</i> ∉ {${rs}} &nbsp;→&nbsp; ${TYPE_PL.one}`,full:true}],U:[{t:.5,line:0},{t:1.8,line:1}]});
  roots.forEach(r=>{
    const Ab=paramAt(P,r);
    fr.push({sec,t:$t(`Podstawiamy <i>a</i> = ${r.html()}`,`Substituting <i>a</i> = ${r.html()}`),x:$t('Wstawiamy tę wartość wszędzie, gdzie jest <i>a</i>. Wyznacznik jest teraz zerem, więc rozstrzyga metoda Gaussa.','Put this value wherever <i>a</i> appears. The determinant is now zero, so Gaussian elimination decides.'),S:sysHtml(abRows(Ab,n),names)});
    fr.push(...sysGaussFrames(Ab,names,`a = ${r.str()}`,true));
  });
  fr.push({sec,t:$t('Odpowiedź','Answer'),x:$t('Zbieramy wszystkie przypadki:','Collecting all cases:'),C:[{h:`<i>a</i> ∉ {${rs}}: ${TYPE_PL.one}`,full:true},...roots.map((r,k)=>({h:`<i>a</i> = ${r.html()}: ${TYPE_PL[types[k]]}`,full:true}))],U:roots.map((_,k)=>({t:.6+k*.9,line:k+1}))});
  return fr;
}

const rrefKey=A=>JSON.stringify(rref(A.map(r=>[...r,F(0)]),A[0].length).A.map(r=>r.slice(0,A[0].length).map(x=>x.str())));
function opText(d){
  if(d.t==='copy')return $t(`przepisany ${rw(d.i)}`,`${rw(d.i)} copied`);
  if(d.t==='scale'){const c=d.c;return c.n===1&&c.d!==1?`${rw(d.i)} : ${c.d}`:c.n===-1&&c.d!==1?`${rw(d.i)} : (−${c.d})`:`${rw(d.i)} · ${fmt(c)}`}
  const a=d.c.abs();return `${rw(d.i)} ${d.c.n<0?'−':'+'} ${a.one?'':a.d===1?a.str():'('+a.str()+')'}${rw(d.j)}`;
}
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
function matMark(A,bar,marks){
  const c=A[0].length;
  return `<span class="mat" style="grid-template-columns:repeat(${c},auto)">${A.flat().map((x,k)=>{const i=Math.floor(k/c),j=k%c,cl=[j===bar&&j>0?'bl':'',marks&&marks[i+','+j]?'mk-'+marks[i+','+j]:''].filter(Boolean).join(' ');return `<span${cl?` class="${cl}"`:''}>${x.html()}</span>`}).join('')}</span>`;
}
function chainReport(text){
  const {mats,bar}=parseChain(text),steps=checkChain(mats);
  let h=$t(`<div class="card"><h2>Macierz początkowa</h2><div class="line">${matMark(mats[0],bar)}</div></div>`,`<div class="card"><h2>Starting matrix</h2><div class="line">${matMark(mats[0],bar)}</div></div>`),firstBad=-1;
  steps.forEach(s=>{
    const B=mats[s.k];let body='',marks={};
    if(s.dims)body=$t(`<div class="msg bad" style="display:block">Ta macierz ma inny wymiar niż poprzednia (${dimS(mats[s.k-1])} → ${dimS(B)}). Operacje na wierszach nie zmieniają wymiaru.</div>`,`<div class="msg bad" style="display:block">This matrix has a different size from the previous one (${dimS(mats[s.k-1])} → ${dimS(B)}). Row operations do not change the size.</div>`);
    else if(s.ok)body=$t(`<div class="msg ok" style="display:block"><b>Poprawnie.</b> Ta macierz powstaje z poprzedniej przez operacje na wierszach.</div>`,`<div class="msg ok" style="display:block"><b>Correct.</b> This matrix follows from the previous one by row operations.</div>`);
    else if(s.lost)body=$t(`<div class="msg bad" style="display:block"><b>Błąd.</b> Każdy wiersz da się otrzymać z poprzednich, ale rząd spadł, więc zgubiła się informacja. Najpewniej któryś wiersz został zastąpiony kombinacją innych bez niego samego (np. pomnożony przez 0 albo zastąpiony kopią innego wiersza).</div>`,`<div class="msg bad" style="display:block"><b>Mistake.</b> Every row can be obtained from the previous ones, but the rank dropped, so information was lost. Most likely a row was replaced by a combination of the others that leaves the row itself out (e.g. multiplied by 0 or replaced by a copy of another row).</div>`);
    else{
      const items=s.bad.map(o=>{
        if(!o.g)return $t(`<li>Wiersz ${o.i+1} nie wynika z poprzedniej macierzy i nie da się odgadnąć, jaka operacja była zamierzona. Trzeba go policzyć jeszcze raz.</li>`,`<li>Row ${o.i+1} does not follow from the previous matrix, and the intended operation cannot be guessed. Compute it again.</li>`);
        const wrong=o.g.ok.map((v,q)=>v?null:q).filter(q=>q!==null);
        wrong.forEach(q=>{marks[o.i+','+q]='bad'});
        return $t(`<li>Wiersz ${o.i+1}: wygląda na <b>${opText(o.g.d)}</b>. ${wrong.map(q=>`W kolumnie ${q+1} powinno być <b>${o.g.exp[q].html()}</b>, a jest ${B[o.i][q].html()}.`).join(' ')}</li>`,`<li>Row ${o.i+1}: looks like <b>${opText(o.g.d)}</b>. ${wrong.map(q=>`In column ${q+1} it should be <b>${o.g.exp[q].html()}</b>, but it is ${B[o.i][q].html()}.`).join(' ')}</li>`);
      });
      body=$t(`<div class="msg bad" style="display:block"><b>Tu jest błąd.</b><ul class="rules">${items.join('')}</ul></div>`,`<div class="msg bad" style="display:block"><b>There is a mistake here.</b><ul class="rules">${items.join('')}</ul></div>`);
      if(firstBad<0)firstBad=s.k;
    }
    h+=$t(`<div class="card"><h2>Krok ${s.k}</h2><div class="line">${matMark(B,bar,marks)}</div>${body}</div>`,`<div class="card"><h2>Step ${s.k}</h2><div class="line">${matMark(B,bar,marks)}</div>${body}</div>`);
  });
  const last=mats[mats.length-1],n=last.length,w=last[0].length,nv=bar>0?bar:w;
  const red=JSON.stringify(rref(last,nv).A.map(r=>r.map(x=>x.str())))===JSON.stringify(last.map(r=>r.map(x=>x.str())));
  let fin=red?$t('Ostatnia macierz jest w postaci schodkowej zredukowanej, więc eliminacja jest zakończona.','The last matrix is in reduced row echelon form, so the elimination is finished.'):$t('Ostatnia macierz nie jest jeszcze w postaci schodkowej zredukowanej; można liczyć dalej.','The last matrix is not in reduced row echelon form yet; you can keep going.');
  const first=mats[0],isI=(X,off)=>X.every((r,i)=>r.slice(off,off+n).every((x,j)=>x.eq(F(i===j?1:0))));
  if(firstBad<0&&red&&w===2*n&&isI(first,n)&&isI(last,0)){const inv=M.inv(first.map(r=>r.slice(0,n))),R=last.map(r=>r.slice(n));fin+=inv&&M.eq(inv,R)?$t(' Za kreską jest poprawna odwrotność.',' After the bar there is the correct inverse.'):$t(' Za kreską powinna być odwrotność, ale coś się nie zgadza.',' The inverse should be after the bar, but something does not match.')}
  return $t(`<div class="msg ${firstBad<0?'ok':'bad'}" style="display:block">${firstBad<0?'<b>Wszystkie kroki są poprawne.</b>':`<b>Pierwszy błąd jest w kroku ${firstBad}.</b> Kolejne kroki są sprawdzane względem tego, co zostało napisane.`} ${fin}</div>`,`<div class="msg ${firstBad<0?'ok':'bad'}" style="display:block">${firstBad<0?'<b>All steps are correct.</b>':`<b>The first mistake is in step ${firstBad}.</b> The following steps are checked against what you wrote.`} ${fin}</div>`)+h;
}
function mulReport(A,B,C){
  if(A[0].length!==B.length)throw new Error($t(`Nie da się pomnożyć ${dimS(A)} przez ${dimS(B)} : liczba kolumn A musi być równa liczbie wierszy B.`,`Cannot multiply ${dimS(A)} by ${dimS(B)} : the number of columns of A must equal the number of rows of B.`));
  const R=M.mul(A,B);
  if(C.length!==R.length||C[0].length!==R[0].length)return $t(`<div class="msg bad" style="display:block">Wynik powinien mieć wymiar ${dimS(R)}, a Twój ma ${dimS(C)}. Wymiar iloczynu: (m×n)·(n×p) = m×p.</div>`,`<div class="msg bad" style="display:block">The result should be ${dimS(R)}, but yours is ${dimS(C)}. Size of a product: (m×n)·(n×p) = m×p.</div>`);
  const marks={},lines=[];
  R.forEach((r,i)=>r.forEach((v,j)=>{if(!v.eq(C[i][j])){marks[i+','+j]='bad';lines.push($t(`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${v.html()}</b> &nbsp;<span class="mute">(u Ciebie ${C[i][j].html()})</span></div>`,`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${v.html()}</b> &nbsp;<span class="mute">(yours: ${C[i][j].html()})</span></div>`))}else marks[i+','+j]='ok'}));
  return (lines.length?$t(`<div class="msg bad" style="display:block"><b>Błędnych elementów: ${lines.length} z ${R.length*R[0].length}</b> (zaznaczone na czerwono).</div>`,`<div class="msg bad" style="display:block"><b>Wrong entries: ${lines.length} of ${R.length*R[0].length}</b> (marked in red).</div>`):$t(`<div class="msg ok" style="display:block"><b>Iloczyn jest policzony poprawnie.</b></div>`,`<div class="msg ok" style="display:block"><b>The product is computed correctly.</b></div>`))+
    $t(`<div class="line">Twój wynik: ${matMark(C,-1,marks)}</div>`,`<div class="line">Your result: ${matMark(C,-1,marks)}</div>`)+(lines.length?$t(`<h3>Jak powinno być</h3>${lines.join('')}`,`<h3>What it should be</h3>${lines.join('')}`):'');
}

const INPA='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"';
const FRAC_NOTE=()=>$t('Ułamki wpisuj jako <code>1/2</code> albo <code>-3/4</code>.','Type fractions as <code>1/2</code> or <code>-3/4</code>.');
KINDS.mat={
  note:FRAC_NOTE,
  fields:a=>a.M.flat().map((_,k)=>k),
  html(a,id){const r=a.M.length,c=a.M[0].length;return `<span class="gv"><span>${a.lab} =</span> <span class="mat gin" style="grid-template-columns:repeat(${c},auto)">${Array.from({length:r*c},(_,k)=>`<input id="${id}-${k}" ${INPA} aria-label="${$t('wiersz','row')} ${Math.floor(k/c)+1}, ${$t('kolumna','column')} ${k%c+1}">`).join('')}</span></span>`},
  check(a,inp){
    const exp=a.M.flat(),marks={};let good=0,empty=0;
    inp.forEach((s,k)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(exp[k]));marks[k]=ok;if(ok)good++});
    return {score:good/exp.length,empty:empty===exp.length,partEmpty:empty,marks,msg:good===exp.length?'':$t(`Poprawnych pól: ${good} z ${exp.length}.`,`Correct fields: ${good} of ${exp.length}.`)};
  },
  show:a=>`${a.lab} = ${M.html(a.M)}`,
  inp(a,inp){const c=a.M[0].length;return `<span class="mat" style="grid-template-columns:repeat(${c},auto)">${inp.map(s=>`<span>${inpT(s)}</span>`).join('')}</span>`}
};
KINDS.num={
  note:FRAC_NOTE,
  fields:()=>[0],
  html:(a,id)=>`<label class="ans-in" for="${id}-0"><span>${a.lab} =</span><input id="${id}-0" ${INPA}></label>`,
  check(a,inp){const s=String(inp[0]??'').trim(),v=parseFr(s),ok=!!(v&&v.eq(a.v));return {score:ok?1:0,empty:!s,marks:{0:ok},msg:s&&!v?$t('To nie jest liczba (ułamki pisz jako 1/2).','That is not a number (write fractions as 1/2).'):''}},
  show:a=>`${a.lab} = ${a.v.html()}`,
  inp:(a,inp)=>inpT(inp[0])
};
KINDS.formula={
  fields:()=>['f'],
  html:(a,id)=>`<label class="ans-in wide" for="${id}-f"><span><i>X</i> =</span><input id="${id}-f" class="code" ${INPA} placeholder="${$t('np.','e.g.')} A^-1(C-B)"></label>`,
  check(a,inp){
    const s=String(inp[0]??'').trim();if(!s)return {score:0,empty:true,marks:{f:false},msg:''};
    try{const ok=checkAnswer(a.sol,s);return {score:ok?1:0,empty:false,marks:{f:ok},msg:ok?'':$t('Ten wzór daje inne <i>X</i>.','This formula gives a different <i>X</i>.')}}catch(e){return {score:0,empty:false,marks:{f:false},msg:e.message}}
  },
  show:a=>`<i>X</i> = ${rP(a.sol.P)}`,
  inp:(a,inp)=>inpT(inp[0]),
  note:()=>$t('Zapis: <code>A^T</code>, <code>B^-1</code>, <code>(AD)^-1</code>, <code>2X</code>, <code>I</code>.','Notation: <code>A^T</code>, <code>B^-1</code>, <code>(AD)^-1</code>, <code>2X</code>, <code>I</code>.')
};
KINDS.sys={
  note:FRAC_NOTE,
  html(a,id){
    const last=a.names[a.names.length-1],ex=`1/2 - 3${last}`;
    return `<p class="ans-lead">${$t('Ile rozwiązań ma ten układ?','How many solutions does this system have?')}</p><div class="seg" data-gst-box="${id}" role="group"><button type="button" class="on" data-gst="one">${$t('jedno','one')}</button><button type="button" data-gst="inf">${$t('nieskończenie wiele','infinitely many')}</button><button type="button" data-gst="none">${$t('żadnego (sprzeczny)','none (inconsistent)')}</button></div>`+
      `<p class="note" id="${id}-genhint" hidden>${$t(`Rozwiązanie ogólne: przy niewiadomych swobodnych (parametrach) zostaw puste pole albo wpisz samą nazwę, pozostałe wyraź przez nie, np. <code>${ex}</code>.`,`General solution: leave the free unknowns (parameters) empty or type just their name, and express the others in terms of them, e.g. <code>${ex}</code>.`)}</p>`+
      `<div class="nums" id="${id}-vals">${a.names.map((v,j)=>`<label class="ans-in" for="${id}-v${j}"><span>${nmHtml(v)} =</span><input id="${id}-v${j}" ${INPA}></label>`).join('')}</div>`;
  },
  read(id,a){const box=document.querySelector(`[data-gst-box="${id}"]`),on=box&&box.querySelector('.on');return {type:on?on.dataset.gst:'one',vals:a.names.map((_,j)=>fieldVal(id,'v'+j))}},
  fill(id,a,inp){
    const box=document.querySelector(`[data-gst-box="${id}"]`);if(box)box.querySelectorAll('[data-gst]').forEach(c=>c.classList.toggle('on',c.dataset.gst===inp.type));
    sysMode(id,inp.type);inp.vals.forEach((x,j)=>{const el=document.getElementById(id+'-v'+j);if(el)el.value=x});
  },
  check(a,inp){
    if(inp.type==='one'&&inp.vals.every(x=>!String(x).trim()))return {score:0,empty:true,marks:{},msg:$t('Najpierw wybierz liczbę rozwiązań i wpisz wartości niewiadomych.','First choose the number of solutions and type the values of the unknowns.')};
    if(inp.type!==a.type)return {score:0,empty:false,marks:{},msg:$t('Liczba rozwiązań się nie zgadza. Porównaj rz <i>A</i> i rz [<i>A</i> | <i>B</i>] z liczbą niewiadomych.','The number of solutions is wrong. Compare rank <i>A</i> and rank [<i>A</i> | <i>B</i>] with the number of unknowns.')};
    if(a.type==='none')return {score:1,empty:false,marks:{},msg:$t('Układ jest sprzeczny.','The system is inconsistent.')};
    if(a.type==='inf')return checkGeneral(a,inp.vals);
    const marks={};let good=0,empty=0;
    inp.vals.forEach((s,j)=>{if(!String(s).trim())empty++;const v=parseFr(s),ok=!!(v&&v.eq(a.vals[j]));marks['v'+j]=ok;if(ok)good++});
    return {score:good/a.vals.length,empty:empty===a.vals.length,partEmpty:empty,marks,msg:good===a.vals.length?'':$t(`Poprawnych wartości: ${good} z ${a.vals.length}.`,`Correct values: ${good} of ${a.vals.length}.`)};
  },
  show:a=>a.type==='one'?a.names.map((v,j)=>`${nmHtml(v)} = ${a.vals[j].html()}`).join(', '):a.type==='inf'?`${TYPE_PL.inf}: ${a.gen}`:TYPE_PL[a.type],
  inp:(a,inp)=>inp.type==='one'?a.names.map((v,j)=>`${nmHtml(v)} = ${inpT(inp.vals[j])}`).join(', '):inp.type==='inf'?`${TYPE_PL.inf}: `+a.names.map((v,j)=>`${nmHtml(v)} = ${String(inp.vals[j]).trim()?inpT(inp.vals[j]):v}`).join(', '):TYPE_PL[inp.type]
};
function sysMode(id,type){
  const vals=document.getElementById(id+'-vals'),hint=document.getElementById(id+'-genhint');
  if(vals){vals.hidden=type==='none';vals.classList.toggle('gen',type==='inf')}
  if(hint)hint.hidden=type!=='inf';
}
KINDS.param={
  note:FRAC_NOTE,
  html:(a,id)=>`<p class="ans-lead">${$t('Dla jakich <i>a</i> układ <b>nie</b> ma dokładnie jednego rozwiązania? Wpisz te wartości i wybierz, co się wtedy dzieje (zbędne wiersze zostaw puste).','For which <i>a</i> does the system <b>not</b> have exactly one solution? Type these values and choose what happens then (leave unused rows empty).')}</p>`+
    [0,1,2].map(k=>`<div class="param-row"><label class="ans-in" for="${id}-a${k}"><span><i>a</i> =</span><input id="${id}-a${k}" ${INPA}></label><select id="${id}-t${k}" class="code" aria-label="${$t('co wtedy','what then')}"><option value="">${$t('co wtedy?','what then?')}</option><option value="none">${$t('układ sprzeczny','inconsistent system')}</option><option value="inf">${$t('nieskończenie wiele rozwiązań','infinitely many solutions')}</option></select></div>`).join(''),
  read:id=>[0,1,2].map(k=>({a:fieldVal(id,'a'+k),type:fieldVal(id,'t'+k)})),
  fill(id,a,inp){inp.forEach((r,k)=>{const x=document.getElementById(id+'-a'+k),t=document.getElementById(id+'-t'+k);if(x)x.value=r.a;if(t)t.value=r.type})},
  check(a,inp){
    const marks={};let good=0,extra=0,filled=0;
    inp.forEach((r,k)=>{
      if(!String(r.a).trim())return;filled++;
      const v=parseFr(r.a),hit=v?a.roots.find(o=>o.a.eq(v)):null;
      marks['a'+k]=!!hit;marks['t'+k]=!!(hit&&hit.type===r.type);
      if(!hit)extra++;else if(hit.type===r.type)good++;
    });
    const score=Math.max(0,(good-extra)/a.roots.length);
    return {score,empty:!filled,marks,msg:score===1?'':$t(`Wartości <i>a</i> z dobrym opisem: ${good} z ${a.roots.length}${extra?`, zbędnych: ${extra}`:''}.`,`Values of <i>a</i> with the right description: ${good} of ${a.roots.length}${extra?`, extra: ${extra}`:''}.`)};
  },
  show:a=>a.roots.map(o=>`<i>a</i> = ${o.a.html()}: ${TYPE_PL[o.type]}`).join('; ')+$t('; dla pozostałych jedno rozwiązanie','; for all other values one solution'),
  inp:(a,inp)=>inp.filter(r=>String(r.a).trim()).map(r=>`<i>a</i> = ${inpT(r.a)}: ${r.type?TYPE_PL[r.type]:'…'}`).join('; ')||'…'
};
function checkGeneral(ans,vals){
  const nv=ans.names.length,idx=Object.fromEntries(ans.names.map((v,j)=>[v,j])),forms=[],marks={};
  if(vals.every(x=>!String(x).trim()))return {score:.5,empty:false,marks,msg:$t('Liczba rozwiązań się zgadza; brakuje jeszcze rozwiązania ogólnego.','The number of solutions is right; the general solution is still missing.')};
  for(let j=0;j<nv;j++){
    const s=String(vals[j]).trim().replace(/[−–]/g,'-').replace(/(\d),(\d)/g,'$1.$2')||ans.names[j];
    let p;try{p=parseLinSide(s,j)}catch(e){marks['v'+j]=false;return {score:.5,empty:false,marks,msg:$t(`Nie da się odczytać wyrażenia przy ${nmHtml(ans.names[j])}. Przykład zapisu: 2 - 3${ans.names[nv-1]}.`,`The expression for ${nmHtml(ans.names[j])} cannot be read. Example: 2 - 3${ans.names[nv-1]}.`)}}
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
const opTopic=type=>()=>{const t=genTask(type);return {q:t.q,body:givenH(t.given),ans:{kind:'mat',M:t.ans,lab:t.lab},get sol(){return t.sol},fr:t.fr}};
function xnumTopic(n,rect){return ()=>{
  const T=genNum(n,-1,rect);
  return {q:$t('Wyznacz macierz <i>X</i>','Find the matrix <i>X</i>'),body:eqH(T.sol.orig)+givenH([...T.sol.letters].sort().map(c=>[c,T.env[c]])),ans:{kind:'mat',M:T.X,lab:'<i>X</i>'},get sol(){return numSolHtml(T)},fr:()=>numFrames(T),
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
function sysAns(Ab,names){
  const nv=names.length,res=rref(Ab,nv),sol=sysSolution(res,nv);
  return {kind:'sys',type:res.type,names,Ab,rank:res.rank,vals:res.type==='one'?sol.forms.map(f=>f.k):null,gen:res.type==='inf'?genSolHtml(sol,names):''};
}
function handCost(Ab,nv){
  const pl=elimPlan(Ab,nv,{sys:true}),ev=pl.ev.filter(e=>e.k!=='pivot'&&e.k!=='none');
  const vals=[...Ab.flat(),...ev.flatMap(e=>e.A.flat())];
  return {ops:ev.filter(e=>!(e.k==='scale'&&e.why==='reduce')&&e.k!=='swap').length,
    max:Math.max(0,...vals.map(x=>Math.abs(x.n))),mult:ev.filter(e=>e.k==='elim'&&!e.a.one).length,fr:vals.filter(x=>x.d!==1).length};
}
function genExamSys(){
  const nv=4,m=4,names=['x1','x2','x3','x4'],want=pick(['none','none','none','inf','inf']),r=pick([2,2,2,3]);
  const row=()=>Array.from({length:nv},()=>F(rnd(1,5)*(Math.random()<.2?-1:1)));
  const kpick=()=>Math.random()<.8?pick([1,-1,2,-2]):pick([3,-3,4,-4]);
  for(const lim of [{ops:r===2?6:8,max:16,mult:1},{ops:r===2?7:9,max:18,mult:1},{ops:10,max:24,mult:2}]){
    let best=null,found=0;
    for(let at=0;at<1200&&found<30;at++){
      const base=[[F(1),...Array.from({length:nv-1},()=>F(rich(-3,4)))]];
      for(let t=0;t<30&&base.length<r;t++){const x=row();if(rankOf([...base,x])===base.length+1)base.push(x)}
      if(base.length<r)continue;
      const rows=base.map(x=>x.slice()),dep=[];let fail=false;
      while(rows.length<m){
        let c=null;
        for(let t=0;t<60&&!c;t++){
          const k=base.map(()=>kpick());if(r===3&&Math.random()<.5)k[rnd(0,2)]=0;
          const v=base[0].map((_,q)=>base.reduce((s,bb,i)=>s.add(bb[q].mul(F(k[i]))),F(0)));
          if(v.every(x=>Math.abs(x.n)<=16)&&v.filter(x=>!x.z).length>=2&&!rows.some(o=>o.every((x,q)=>x.eq(v[q])||x.eq(v[q].neg()))))c=v;
        }
        if(!c){fail=true;break}
        dep.push(rows.length);rows.push(c);
      }
      if(fail)continue;
      const x0=Array.from({length:nv},()=>F(rnd(-2,2))),Ab=rows.map(x=>[...x,x.reduce((s,a,q)=>s.add(a.mul(x0[q])),F(0))]);
      if(want==='none'){const i=pick(dep);Ab[i][nv]=Ab[i][nv].add(F(pick([-2,-1,1,2])))}
      let hid=false;
      if(Math.random()<.5){const g=pick([2,3,4]);if(Ab[0].every(x=>Math.abs(x.n*g)<=16)){Ab[0]=Ab[0].map(x=>x.mul(F(g)));hid=true}}
      if(Ab.some(x=>Math.abs(x[nv].n)>16))continue;
      const res=rref(Ab,nv);if(res.type!==want)continue;
      if(want==='inf'&&res.A.flat().some(x=>x.d!==1))continue;
      const hc=handCost(Ab,nv);
      if(hc.fr||hc.ops>lim.ops||hc.max>lim.max||hc.mult>lim.mult)continue;
      found++;
      const zeros=dep.reduce((s,i)=>s+Ab[i].slice(0,nv).filter(x=>x.z).length,0);
      const sc=hc.ops*2+hc.max/4+hc.mult*3-(hid?2:0)-(zeros>=1&&zeros<=2?1.5:0);
      if(!best||sc<best.sc)best={Ab,sc};
    }
    if(best){
      const Ab=best.Ab;
      if(Math.random()<.6){const t=Ab.shift();Ab.splice(rnd(1,3),0,t)}
      return {Ab,names};
    }
  }
  return genExamSys();
}
function examTopic(){
  const g=genExamSys(),out=sysMethodHtml(g.Ab,g.names,'gauss');
  return {q:$t('Jeśli to możliwe, rozwiąż układ równań','Solve the system of equations, if possible'),body:`<div class="sysbox">${sysHtml(abRows(g.Ab,4),g.names)}</div>`,
    ans:sysAns(g.Ab,g.names),get sol(){return sysMethodHtml(g.Ab,g.names,'gauss').html},fr:()=>sysFrames(g.Ab,g.names,'gauss'),
    hint:$t('Macierz rozszerzona i Gauss. Sprawdź, czy któreś równanie nie jest kombinacją innych (np. w₃ = 4w₁ − 4w₂); wtedy porównaj prawe strony: zgodne → parametry, niezgodne → sprzeczność.','Augmented matrix and Gauss. Check whether an equation is a combination of others (e.g. R₃ = 4R₁ − 4R₂); then compare the right-hand sides: they match → parameters, they don’t → inconsistent.')};
}
function sysTopic(sz,mode,method){return ()=>{
  const g=genSys(sz,mode),out=sysMethodHtml(g.Ab,g.names,method);
  return {q:$t('Rozwiąż układ równań','Solve the system of equations')+METH_PL[method],body:`<div class="sysbox">${sysHtml(abRows(g.Ab,g.names.length),g.names)}</div>`,
    ans:sysAns(g.Ab,g.names),get sol(){return sysMethodHtml(g.Ab,g.names,method).html},fr:()=>sysFrames(g.Ab,g.names,method),
    hint:{gauss:$t('Macierz rozszerzona [<i>A</i> | <i>B</i>] i eliminacja kolumna po kolumnie.','Augmented matrix [<i>A</i> | <i>B</i>] and elimination column by column.'),mac:$t('<i>X</i> = <i>A</i><sup>−1</sup><i>B</i>: najpierw odwrotność, potem mnożenie.','<i>X</i> = <i>A</i><sup>−1</sup><i>B</i>: first the inverse, then the multiplication.'),cra:$t('<i>W</i> = det <i>A</i>, potem <i>x</i> = <i>W<sub>x</sub></i>/<i>W</i>.','<i>D</i> = det <i>A</i>, then <i>x</i> = <i>D<sub>x</sub></i>/<i>D</i>.')}[method]};
}}
function detTopic(n){return ()=>{
  const A=n===4?genDet4():genDet(n),v=detF(A);
  return {q:$t(`Oblicz wyznacznik macierzy ${n}×${n}`,`Compute the determinant of the ${n}×${n} matrix`),body:givenH([['A',A]]),ans:{kind:'num',v,lab:'det <i>A</i>'},
    get sol(){return n===4?laplaceHtml(A):`<div class="line">det <i>A</i> = ${matH(A,{det:true})}</div>${detText(A,'det <i>A</i>')}`},
    fr:()=>n===4?laplaceFrames(A):detFrames(A,'det <i>A</i>',$t('Wyznacznik','Determinant'),true),
    get hint(){return n===2?'<i>ad</i> − <i>bc</i>.':n===3&&OPT.det!=='laplace'?$t('Sarrus: dopisz dwie pierwsze kolumny; trzy przekątne z plusem, trzy z minusem.','Sarrus: copy the first two columns; three diagonals with a plus, three with a minus.'):$t("Rozwinięcie Laplace'a względem wiersza lub kolumny z największą liczbą zer.","Laplace expansion along the row or column with the most zeros.")}};
}}
function craOneHtml(Ab,names,j){
  const nv=names.length,A=Ab.map(r=>r.slice(0,nv)),b=Ab.map(r=>r[nv]),Aj=A.map((r,i)=>r.map((x,q)=>q===j?b[i]:x));
  const W=detF(A),Wj=detF(Aj),v=nmHtml(names[j]),w=$t('W','D'),sub=`<i>${w}</i><sub>${v}</sub>`;
  return $t(`<p>Potrzebne jest tylko ${v}, więc liczymy dwa wyznaczniki: główny <i>W</i> i ${sub}. Pozostałych nie trzeba.</p><h3>1. Wyznacznik główny</h3>`,`<p>Only ${v} is needed, so we compute two determinants: the main one <i>D</i> and ${sub}. The others are not needed.</p><h3>1. The main determinant</h3>`)
    +`<div class="line"><i>${w}</i> = ${matH(A,{det:true})}</div>${detText(A,`<i>${w}</i>`)}`
    +$t(`<h3>2. Wyznacznik ${sub}</h3><p class="mute">Kolumnę przy ${v} zastępujemy kolumną wyrazów wolnych.</p>`,`<h3>2. The determinant ${sub}</h3><p class="mute">The column of ${v} is replaced with the column of constants.</p>`)
    +`<div class="line">${sub} = ${matH(Aj,{det:true,hl:j})}</div>${detText(Aj,sub)}`
    +$t('<h3>3. Wzór Cramera</h3>','<h3>3. Cramer’s rule</h3>')
    +`<div class="line res">${v} = <span class="fr"><span>${sub}</span><span><i>${w}</i></span></span> = <span class="fr"><span>${Wj.str()}</span><span>${W.str()}</span></span> = <b>${Wj.div(W).html()}</b></div>`;
}
function craOneTopic(){
  const g=genSys(3,'one'),j=rnd(0,g.names.length-1),nv=g.names.length,A=g.Ab.map(r=>r.slice(0,nv));
  const Aj=A.map((r,i)=>r.map((x,q)=>q===j?g.Ab[i][nv]:x)),v=nmHtml(g.names[j]);
  return {q:$t(`Korzystając ze wzorów Cramera, wyznacz tylko ${v}`,`Using Cramer’s rule, find only ${v}`),body:`<div class="sysbox">${sysHtml(abRows(g.Ab,nv),g.names)}</div>`,
    ans:{kind:'num',v:detF(Aj).div(detF(A)),lab:v},get sol(){return craOneHtml(g.Ab,g.names,j)},fr:()=>cramerFrames(g.Ab,g.names,j),
    hint:$t(`Policz <i>W</i> i tylko <i>W</i><sub>${v}</sub>. Wtedy ${v} = <i>W</i><sub>${v}</sub> / <i>W</i>.`,`Compute <i>D</i> and only <i>D</i><sub>${v}</sub>. Then ${v} = <i>D</i><sub>${v}</sub> / <i>D</i>.`)};
}

const linH=(a,b)=>lfHtml({c:[a],k:b},['x']);
function genDetEq(){
  const zero=Math.random()<.45;
  for(let t=0;;t++){
    const row=Math.random()<.6,k=rnd(0,2),on=(i,j)=>(row?i:j)===k;
    const B=M.make(3,3,()=>F(rnd(-3,4))),a=[0,1,2].map(()=>F(pick([0,1,1,1,-1,2])));
    if(a.every(x=>x.z)||a.filter(x=>!x.z).length>2)continue;
    const Ba=B.map((r,i)=>r.map((x,j)=>on(i,j)?a[row?j:i]:x)),al=detF(Ba),be=detF(B);
    if(al.z)continue;
    const x0=rnd(-4,4),c=al.mul(F(x0)).add(be);
    if(Math.abs(c.n)>24||(zero&&!c.z&&t<4000))continue;
    const S=B.map((r,i)=>r.map((x,j)=>on(i,j)?linH(a[row?j:i],x):x.html()));
    return {B,a,row,k,S,al,be,c,x0:F(x0)};
  }
}
// minory bez x, więc wynik liniowy
function detEqTerms(P){
  const out=[];
  for(let q=0;q<3;q++){
    const i=P.row?P.k:q,j=P.row?q:P.k,a=P.a[q],b=P.B[i][j];
    if(a.z&&b.z)continue;
    const s=(i+j)%2?-1:1,Mi=minorOf(P.B,i,j),m=detF(Mi),f=F(s).mul(m);
    out.push({i,j,s,Mi,m,e:linH(a,b),ta:a.mul(f),tb:b.mul(f)});
  }
  return out;
}
function detEqSolve(P){
  const r=P.c.sub(P.be);
  return [`${linH(P.al,P.be)} = ${P.c.html()}`,`${P.al.one?'':P.al.eq(F(-1))?'−':P.al.html()}<i>x</i> = ${r.html()}`,`<i>x</i> = <b>${P.x0.html()}</b>`];
}
function detEqHtml(P){
  const T=detEqTerms(P),line=P.row?$t('wierszu','row'):$t('kolumnie','column'),k=P.k+1;
  let h=$t(`<p><i>x</i> jest tylko w ${line} ${k}, więc rozwijamy wyznacznik względem ${P.row?'tego wiersza':'tej kolumny'}. Minory nie mają <i>x</i>, więc wyjdzie wyrażenie liniowe.</p>`,`<p><i>x</i> appears only in ${line} ${k}, so we expand the determinant along it. The minors contain no <i>x</i>, so the result is linear.</p>`);
  T.forEach(o=>{
    h+=`<div class="line">(−1)<sup>${o.i+1}+${o.j+1}</sup> · (${o.e}) · ${matH(o.Mi,{det:true})}</div>`;
    h+=`<details><summary>Minor <i>M</i><sub>${o.i+1}${o.j+1}</sub></summary>${detLines(o.Mi)}</details>`;
    h+=`<div class="line">= ${fmt(F(o.s).mul(o.m))} · (${o.e}) = ${linH(o.ta,o.tb)}</div>`;
  });
  h+=`<div class="line">det = ${T.map(o=>`(${linH(o.ta,o.tb)})`).join(' + ')} = ${linH(P.al,P.be)}</div>`;
  h+=$t('<h3>Równanie</h3>','<h3>The equation</h3>')+detEqSolve(P).map((l,q)=>`<div class="line${q===2?' res':''}">${l}</div>`).join('');
  return h+$t('<p class="mute">Można też liczyć Sarrusem, wynik jest ten sam.</p>','<p class="mute">Sarrus’ rule works too and gives the same result.</p>');
}
function detEqFrames(P){
  const T=detEqTerms(P),sec=$t('Równanie z wyznacznikiem','Determinant equation'),fr=[],lab='det';
  const hl=P.row?{rows:{[P.k]:'src'}}:{cols:{[P.k]:'src'}};
  fr.push({sec,t:$t(`Rozwijamy względem ${P.row?'wiersza':'kolumny'} ${P.k+1}`,`Expanding along ${P.row?'row':'column'} ${P.k+1}`),x:$t(`Tylko ${P.row?'ten wiersz':'ta kolumna'} ma <i>x</i>. Po skreśleniu jej zostają same liczby, więc każdy minor jest liczbą i wyznacznik wyjdzie liniowy: <i>ax</i> + <i>b</i>.`,`Only this ${P.row?'row':'column'} contains <i>x</i>. Crossing it out leaves plain numbers, so every minor is a number and the determinant comes out linear: <i>ax</i> + <i>b</i>.`),
    S:`<div class="eq">${matH(P.S,{det:true})} = ${P.c.html()}</div>`,B:[bd(P.S,{det:true,lab,hl})]});
  T.forEach((o,q)=>{
    const ml=`<i>M</i><sub>${o.i+1}${o.j+1}</sub>`;
    fr.push({sec,t:$t(`Składnik ${q+1}: ${o.e}`,`Term ${q+1}: ${o.e}`),x:$t(`Skreślamy wiersz ${o.i+1} i kolumnę ${o.j+1}; zostaje minor ${ml}. Znak: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`,`Cross out row ${o.i+1} and column ${o.j+1}; the minor ${ml} remains. Sign: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`),
      B:[bd(P.S,{det:true,lab,hl:{rows:{[o.i]:'dim'},cols:{[o.j]:'dim'},cells:{[o.i+','+o.j]:'piv'}}}),bd(o.Mi,{det:true,lab:ml})],J:['→']});
    fr.push(...detFrames(o.Mi,'det '+ml,sec,false));
  });
  const C=T.map(o=>({h:`(−1)<sup>${o.i+1}+${o.j+1}</sup> · ${fmt(o.m)} · (${o.e}) = ${linH(o.ta,o.tb)}`,full:true}));
  C.push({h:`det = ${linH(P.al,P.be)}`,full:true});
  fr.push({sec,t:$t('Składamy wyznacznik','Putting the determinant together'),x:$t('Każdy element mnożymy przez znak i swój minor, potem wszystko dodajemy.','Each entry is multiplied by its sign and its minor, then everything is added.'),C,U:C.map((_,q)=>({t:.5+q*.8,line:q}))});
  const E=detEqSolve(P).map(h=>({h,full:true}));
  fr.push({sec,t:$t('Rozwiązujemy równanie','Solving the equation'),x:$t('Zwykłe równanie liniowe: przenosimy liczbę na prawo i dzielimy przez współczynnik przy <i>x</i>.','An ordinary linear equation: move the number to the right and divide by the coefficient of <i>x</i>.'),C:E,U:E.map((_,q)=>({t:.5+q*.9,line:q}))});
  return fr;
}
function detEqTopic(){
  const P=genDetEq();
  return {q:$t('Rozwiąż równanie','Solve the equation'),body:`<div class="eq">${matH(P.S,{det:true})} = ${P.c.html()}</div>`,
    ans:{kind:'num',v:P.x0,lab:'<i>x</i>'},get sol(){return detEqHtml(P)},fr:()=>detEqFrames(P),
    hint:$t('Rozwiń wyznacznik względem wiersza albo kolumny z <i>x</i> (albo policz Sarrusem). Wyjdzie równanie liniowe.','Expand the determinant along the row or column with <i>x</i> (or use Sarrus’ rule). You get a linear equation.')};
}
function rankTopic(){
  const A=genRank(),r=rankOf(A);
  return {q:$t('Wyznacz rząd macierzy','Find the rank of the matrix'),body:givenH([['A',A]]),ans:{kind:'num',v:F(r),lab:$t('rz <i>A</i>','rank <i>A</i>')},get sol(){return rankHtml(A)},fr:()=>rankFrames(A),
    hint:$t('Sprowadź macierz do postaci schodkowej (zera pod elementami głównymi) i policz niezerowe wiersze.','Reduce the matrix to row echelon form (zeros below the pivots) and count the nonzero rows.')};
}
function paramTopic(){
  const P=genParam();
  return {q:$t('Zbadaj liczbę rozwiązań w zależności od parametru <i>a</i>','Determine the number of solutions depending on the parameter <i>a</i>'),body:`<div class="sysbox">${paramSysHtml(P.E,P.b,P.names)}</div>`,
    ans:{kind:'param',roots:P.roots.map((a,k)=>({a,type:P.types[k]}))},get sol(){return paramHtml(P)},fr:()=>paramFrames(P),
    hint:$t('Policz wyznacznik główny <i>W</i>(<i>a</i>). Gdzie <i>W</i> ≠ 0, jest jedno rozwiązanie. Wartości z <i>W</i> = 0 podstaw i sprawdź Gaussem.','Compute the main determinant <i>D</i>(<i>a</i>). Where <i>D</i> ≠ 0, there is one solution. Substitute the values with <i>D</i> = 0 and check them with Gaussian elimination.')};
}

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
  {id:'sysexam',en:'Exam style 4×4',sec:'Układy równań',name:'Jak na sprawdzianie 4×4',gen:examTopic},
  {id:'param',en:'With parameter <i>a</i>',sec:'Układy równań',name:'Z parametrem <i>a</i>',gen:paramTopic},
  {id:'det2',en:'det 2×2',sec:'Wyznaczniki',name:'det 2×2',gen:detTopic(2)},
  {id:'det3',en:'det 3×3',sec:'Wyznaczniki',name:'det 3×3',gen:detTopic(3),det:true},
  {id:'det4',en:'det 4×4 (Laplace)',sec:'Wyznaczniki',name:"det 4×4 (Laplace)",gen:detTopic(4),det:true},
  {id:'detprop',en:'Properties',sec:'Wyznaczniki',name:'Własności',gen:genDetProp},
  {id:'deteq',en:'Equation with a determinant',sec:'Wyznaczniki',name:'Równanie z wyznacznikiem',gen:detEqTopic},
  {id:'cra2',en:'Cramer’s rule 2×2',sec:'Wyznaczniki',name:'Wzory Cramera 2×2',gen:sysTopic(2,'one','cra')},
  {id:'syscra',en:'Cramer’s rule 3×3',sec:'Wyznaczniki',name:'Wzory Cramera 3×3',gen:sysTopic(3,'one','cra'),det:true},
  {id:'cra1',en:'Cramer: one unknown',sec:'Wyznaczniki',name:'Cramer: jedna niewiadoma',gen:craOneTopic,det:true},
  {id:'rank',en:'Rank of a matrix',sec:'Rząd macierzy',name:'Rząd macierzy',gen:rankTopic},
];
TOPICS.forEach(t=>{if(['Macierz odwrotna','Równania macierzowe','Układy równań','Rząd macierzy'].includes(t.sec))t.noFrac=true});
const SECTIONS=[...new Set(TOPICS.map(t=>t.sec))];
addSubject({
  id:'algebra',name:'Algebra liniowa',en:'Linear algebra',topics:TOPICS,start:'sys3',prKey:'algebra-postep-v1',
  secEn:{'Działania':'Operations','Macierz odwrotna':'Inverse matrix','Równania macierzowe':'Matrix equations','Układy równań':'Systems of equations','Wyznaczniki':'Determinants','Rząd macierzy':'Rank'},
  sheet:{name:'Ściąga',en:'Cheat sheet'},
  tools:[{id:'liczby',name:'<i>X</i> na liczbach',en:'<i>X</i> with numbers'},{id:'rownania',name:'<i>X</i> na literach',en:'<i>X</i> symbolically'},{id:'uklady',name:'Układy równań',en:'Systems of equations'},{id:'blad',name:'Znajdź błąd',en:'Find my mistake'}],
  opts:t=>(t&&t.sec==='Wyznaczniki'?'':`<label class="chk" for="nfCw"><input type="checkbox" id="nfCw" data-nofrac${OPT.noFrac?' checked':''}> <span>${$t('Rozwiązania bez ułamków, jeśli się da','Solutions without fractions where possible')}</span></label>`)+(t&&t.det?`<span class="lbl" id="detL">${$t('Wyznacznik 3×3','3×3 determinant')}</span><div class="seg small" role="group" aria-labelledby="detL">${[['sarrus','Sarrus'],['laplace','Laplace']].map(([k,n])=>`<button type="button" data-det="${k}"${OPT.det===k?' class="on" aria-pressed="true"':' aria-pressed="false"'}>${n}</button>`).join('')}</div>`:'')
});
