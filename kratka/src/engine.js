const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a};
class Fr{
  constructor(n,d=1){if(d===0)throw new Error('div0');if(d<0){n=-n;d=-d}const g=gcd(n,d)||1;this.n=n/g;this.d=d/g}
  add(o){return new Fr(this.n*o.d+o.n*this.d,this.d*o.d)}
  sub(o){return new Fr(this.n*o.d-o.n*this.d,this.d*o.d)}
  mul(o){return new Fr(this.n*o.n,this.d*o.d)}
  div(o){return new Fr(this.n*o.d,this.d*o.n)}
  neg(){return new Fr(-this.n,this.d)}
  abs(){return new Fr(Math.abs(this.n),this.d)}
  eq(o){return this.n===o.n&&this.d===o.d}
  get z(){return this.n===0}
  get one(){return this.n===1&&this.d===1}
  str(){return (this.n<0?'−':'')+Math.abs(this.n)+(this.d===1?'':'/'+this.d)}
  html(){const s=this.n<0?'−':'',a=Math.abs(this.n);return this.d===1?s+a:`${s}<span class="fr"><span>${a}</span><span>${this.d}</span></span>`}
}
const F=(n,d=1)=>new Fr(n,d);
function parseFr(s){
  s=String(s).trim().replace(/\s+/g,'').replace(',','.').replace(/[−–]/g,'-');
  if(!s)return null;
  let m=s.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if(m){const d=+m[2];return d===0?null:F(+m[1],d)}
  m=s.match(/^([+-]?)(\d*)\.?(\d*)$/);
  if(m&&(m[2]||m[3])){const dec=m[3]||'';return F((m[1]==='-'?-1:1)*parseInt((m[2]||'0')+dec,10),10**dec.length)}
  return null;
}
const fmt=x=>(x.n<0||x.d!==1)?`(${x.str()})`:x.str();

class DimErr extends Error{}
const dimS=A=>`${A.length}×${A[0].length}`;
function sameDim(A,B,w){if(A.length!==B.length||A[0].length!==B[0].length)throw new DimErr($t(`Nie da się ${w} macierzy ${dimS(A)} i ${dimS(B)}: muszą mieć ten sam wymiar.`,`Cannot ${w} a ${dimS(A)} matrix and a ${dimS(B)} matrix: they must be the same size.`))}
const M={
  make:(r,c,f)=>Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>f(i,j))),
  ints:a=>a.map(r=>r.map(x=>F(x))),
  add:(A,B)=>{sameDim(A,B,$t('dodać','add'));return M.make(A.length,A[0].length,(i,j)=>A[i][j].add(B[i][j]))},
  sub:(A,B)=>{sameDim(A,B,$t('odjąć','subtract'));return M.make(A.length,A[0].length,(i,j)=>A[i][j].sub(B[i][j]))},
  scale:(k,A)=>A.map(r=>r.map(x=>x.mul(k))),
  mul:(A,B)=>{if(A[0].length!==B.length)throw new DimErr($t(`Nie da się pomnożyć macierzy ${dimS(A)} przez ${dimS(B)}: liczba kolumn pierwszej musi być równa liczbie wierszy drugiej.`,`Cannot multiply a ${dimS(A)} matrix by a ${dimS(B)} matrix: the number of columns of the first must equal the number of rows of the second.`));return M.make(A.length,B[0].length,(i,j)=>{let s=F(0);for(let k=0;k<B.length;k++)s=s.add(A[i][k].mul(B[k][j]));return s})},
  T:A=>M.make(A[0].length,A.length,(i,j)=>A[j][i]),
  I:n=>M.make(n,n,(i,j)=>F(i===j?1:0)),
  inv(A){if(A.length!==A[0].length)throw Object.assign(new DimErr($t(`Macierz ${dimS(A)} nie jest kwadratowa, więc nie ma odwrotnej.`,`The ${dimS(A)} matrix is not square, so it has no inverse.`)),{inv:true});const g=gaussInv(A);return g?g.inv:null},
  eq:(A,B)=>A.length===B.length&&A[0].length===B[0].length&&A.every((r,i)=>r.every((x,j)=>x.eq(B[i][j]))),
  html:A=>`<span class="mat" style="grid-template-columns:repeat(${A[0].length},auto)">${A.flat().map(x=>`<span>${x.html()}</span>`).join('')}</span>`
};
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
function rich(lo,hi,pz=.12){for(;;){const v=rnd(lo,hi);if(v!==0||Math.random()<pz)return v}}
const randR=(r,c,lo=-5,hi=7)=>M.make(r,c,()=>F(rich(lo,hi)));
const det2=A=>A[0][0].mul(A[1][1]).sub(A[0][1].mul(A[1][0]));
function unimod2(){for(;;){const a=rnd(-2,2),b=rnd(-2,2),c=rnd(-2,2),d=rnd(-2,2);if(Math.abs(a*d-b*c)===1&&(b||c)&&[a,b,c,d].filter(x=>!x).length<=1)return M.ints([[a,b],[c,d]])}}
// odwracalna, z całkowitą odwrotną
function richUni(n,dets=[1]){
  if(n===2){for(;;){const e=[rich(-6,7,0),rich(-6,7,0),rich(-6,7,0),rich(-6,7,0)];const d=Math.abs(e[0]*e[3]-e[1]*e[2]);
    if(!dets.includes(d))continue;if(e.filter(x=>Math.abs(x)<=1).length<=1&&Math.max(...e.map(Math.abs))>=3)return M.ints([[e[0],e[1]],[e[2],e[3]]])}}
  for(;;){
    const L=M.make(3,3,(i,j)=>F(i===j?1:i>j?rnd(-3,3):0)),U=M.make(3,3,(i,j)=>F(i===j?pick([1,-1]):i<j?rnd(-3,3):0));
    let A=M.mul(L,U);const p=pick([[0,1,2],[1,0,2],[2,0,1],[1,2,0],[0,2,1],[2,1,0]]);A=p.map(k=>A[k]);
    const v=A.flat().map(x=>Math.abs(x.n));
    if(Math.max(...v)<=8&&v.filter(x=>x===0).length<=1&&v.filter(x=>x<=1).length<=4&&Math.max(...v)>=3)return A;
  }
}

const W=i=>`${$t('w','R')}<sub>${i+1}</sub>`;
function gaussInv(A0){
  const n=A0.length;let L=A0.map(r=>r.slice()),R=M.I(n);const cp=X=>X.map(r=>r.slice());
  const steps=[{ops:[],L:cp(L),R:cp(R)}];
  const score=x=>x.z?1e9:(x.d===1&&Math.abs(x.n)===1)?0:Math.abs(x.n/x.d)+(x.d!==1?100:0);
  for(let j=0;j<n;j++){
    const ops=[];let best=-1;
    for(let i=j;i<n;i++)if(!L[i][j].z&&(best<0||score(L[i][j])<score(L[best][j])))best=i;
    if(best<0)return null;
    if(best!==j){[L[j],L[best]]=[L[best],L[j]];[R[j],R[best]]=[R[best],R[j]];ops.push(`${W(j)} ↔ ${W(best)}`)}
    const p=L[j][j];
    if(!p.one){const iv=F(1).div(p);L[j]=L[j].map(x=>x.mul(iv));R[j]=R[j].map(x=>x.mul(iv));ops.push(p.n===-1&&p.d===1?`${W(j)} · (−1)`:`${W(j)} : ${fmt(p)}`)}
    for(let i=0;i<n;i++){
      if(i===j||L[i][j].z)continue;const k=L[i][j],a=k.abs();
      L[i]=L[i].map((x,q)=>x.sub(k.mul(L[j][q])));R[i]=R[i].map((x,q)=>x.sub(k.mul(R[j][q])));
      ops.push(`${W(i)} ${k.n>0?'−':'+'} ${a.one?'':a.d===1?a.str():'('+a.str()+')'}${W(j)}`);
    }
    if(ops.length)steps.push({ops,L:cp(L),R:cp(R)});
  }
  return {inv:R,steps};
}
function augHtml(A,B){let c='';for(let i=0;i<A.length;i++)c+=A[i].map(x=>`<span>${x.html()}</span>`).join('')+B[i].map((x,j)=>`<span${j?'':' class="bl"'}>${x.html()}</span>`).join('');return `<span class="mat aug" style="grid-template-columns:repeat(${A[0].length+B[0].length},auto)">${c}</span>`}
// bez ułamków: ±1 z kombinacji wierszy, dzielenie dopiero na końcu
const lcmN=(a,b)=>a/gcd(a,b)*b;
function elimPlan(Ab0,nv,o={}){
  if(!OPT.noFrac)return elimPlanClassic(Ab0,nv,o);
  const m=Ab0.length,A=Ab0.map(r=>r.slice()),ev=[],cp=X=>X.map(r=>r.slice());
  const doit=(e,f)=>{e.B=cp(A);f();e.A=cp(A);ev.push(e)};
  const mark=e=>{e.B=cp(A);e.A=e.B;ev.push(e)};
  const scaleRow=(i,c,why,j)=>doit({k:'scale',i,c,why,j},()=>{A[i]=A[i].map(x=>x.mul(c))});
  for(let i=0;i<m;i++){
    const L=A[i].reduce((l,x)=>lcmN(l,x.d),1);if(L>1)scaleRow(i,F(L),'clear',-1);
    const g=A[i].reduce((g,x)=>gcd(g,x.n),0);if(g>1)scaleRow(i,F(1,g),'reduce',-1);
  }
  let row=0;const piv=[];
  for(let j=0;j<nv&&row<m;j++){
    const cand=[];for(let i=row;i<m;i++)if(!A[i][j].z)cand.push(i);
    if(!cand.length){mark({k:'none',j,row});if(o.stop)return {ev,A,piv,ok:false};continue}
    let best=cand.find(i=>A[i][j].abs().one),made=false;
    if(best===undefined){
      let opt=null;
      for(const i of cand)for(const k of cand){if(k===i)continue;for(const c of [1,-1,2,-2,3,-3]){
        if(!A[i][j].add(A[k][j].mul(F(c))).abs().one)continue;
        const sc=Math.max(...A[i].map((x,q)=>Math.abs(x.add(A[k][q].mul(F(c))).n)))+Math.abs(c);
        if(!opt||sc<opt.sc)opt={i,k,c,sc};
      }}
      if(opt&&opt.sc<=60){doit({k:'comb',j,i:opt.i,from:opt.k,c:F(opt.c)},()=>{A[opt.i]=A[opt.i].map((x,q)=>x.add(A[opt.k][q].mul(F(opt.c))))});best=opt.i;made=true}
      else best=cand.reduce((b,i)=>{const sc=t=>Math.abs(A[t][j].n)*10-(cand.every(q=>A[q][j].div(A[t][j]).d===1)?5:0);return b===undefined||sc(i)<sc(b)?i:b},undefined);
    }
    mark({k:'pivot',j,i:best,row,made});
    if(best!==row)doit({k:'swap',j,i:row,i2:best},()=>{[A[row],A[best]]=[A[best],A[row]]});
    let p=A[row][j];
    if(p.n===-1&&p.d===1)scaleRow(row,F(-1),'sign',j);
    else if(!p.one&&A[row].every(x=>x.div(p).d===1))scaleRow(row,F(1).div(p),'div',j);
    p=A[row][j];
    for(let i=o.down?row+1:0;i<m;i++){
      if(i===row||A[i][j].z)continue;
      const a=A[i][j],q=a.div(p);
      if(q.d===1)doit({k:'elim',j,i,r:row,a:F(1),b:q},()=>{A[i]=A[i].map((x,t)=>x.sub(q.mul(A[row][t])))});
      else{const g=gcd(p.n,a.n),ma=F(Math.abs(p.n)/g),mb=F(Math.sign(p.n)*a.n/g);doit({k:'elim',j,i,r:row,a:ma,b:mb},()=>{A[i]=A[i].map((x,t)=>x.mul(ma).sub(mb.mul(A[row][t])))})}
      const g=A[i].reduce((g,x)=>gcd(g,x.n),0);if(g>1)scaleRow(i,F(1,g),'reduce',j);
    }
    piv.push(j);row++;
  }
  const contra=o.sys&&A.some(r=>r.slice(0,nv).every(x=>x.z)&&!r[nv].z);
  if(o.norm!==false&&!contra)piv.forEach((j,i)=>{const p=A[i][j];if(!p.one)doit({k:'norm',j,i,c:F(1).div(p),p},()=>{A[i]=A[i].map(x=>x.div(p))})});
  return {ev,A,piv,ok:true,contra};
}
function elimPlanClassic(Ab0,nv,o={}){
  const m=Ab0.length,A=Ab0.map(r=>r.slice()),ev=[],cp=X=>X.map(r=>r.slice());
  const doit=(e,f)=>{e.B=cp(A);f();e.A=cp(A);ev.push(e)};
  const mark=e=>{e.B=cp(A);e.A=e.B;ev.push(e)};
  let row=0;const piv=[];
  for(let j=0;j<nv&&row<m;j++){
    let best=-1;for(let i=row;i<m;i++)if(!A[i][j].z&&(best<0||pivScore(A[i][j])<pivScore(A[best][j])))best=i;
    if(best<0){mark({k:'none',j,row});if(o.stop)return {ev,A,piv,ok:false};continue}
    mark({k:'pivot',j,i:best,row,made:false});
    if(best!==row)doit({k:'swap',j,i:row,i2:best},()=>{[A[row],A[best]]=[A[best],A[row]]});
    const p=A[row][j];
    if(!p.one)doit({k:'scale',j,i:row,c:F(1).div(p),why:p.n===-1&&p.d===1?'sign':'divf'},()=>{A[row]=A[row].map(x=>x.div(p))});
    for(let i=o.down?row+1:0;i<m;i++){
      if(i===row||A[i][j].z)continue;const q=A[i][j];
      doit({k:'elim',j,i,r:row,a:F(1),b:q},()=>{A[i]=A[i].map((x,t)=>x.sub(q.mul(A[row][t])))});
    }
    piv.push(j);row++;
  }
  return {ev,A,piv,ok:true,contra:!!o.sys&&A.some(r=>r.slice(0,nv).every(x=>x.z)&&!r[nv].z)};
}
function opLabel(e){
  const num=x=>x.d===1?x.str():'('+x.str()+')';
  if(e.k==='swap')return `${W(e.i)} ↔ ${W(e.i2)}`;
  if(e.k==='scale'||e.k==='norm')return e.c.d!==1?`${W(e.i)} : ${fmt(F(1).div(e.c))}`:`${W(e.i)} · ${fmt(e.c)}`;
  if(e.k==='comb'){const a=e.c.abs();return `${W(e.i)} ${e.c.n>0?'+':'−'} ${a.one?'':num(a)}${W(e.from)}`}
  if(e.k==='elim'){const b=e.b.abs();return `${e.a.one?'':num(e.a)}${W(e.i)} ${e.b.n>0?'−':'+'} ${b.one?'':num(b)}${W(e.r)}`}
  return '';
}
function planGroups(plan){
  const g=[];let cur=null;
  for(const e of plan.ev){if(e.k==='pivot'||e.k==='none')continue;const key=e.k==='norm'?'norm':e.j;if(!cur||cur.key!==key){cur={key,ops:[],A:null};g.push(cur)}cur.ops.push(opLabel(e));cur.A=e.A}
  return g;
}
const planVals=plan=>plan.ev.filter(e=>e.k!=='pivot'&&e.k!=='none').flatMap(e=>e.A.flat());
const planFrac=plan=>planVals(plan).filter(x=>x.d!==1).length;
const planMax=plan=>Math.max(0,...planVals(plan).map(x=>Math.abs(x.n)));
const normNote=()=>$t('Schodki są gotowe. Na koniec dzielimy wiersze przez elementy główne; dopiero tu mogą pojawić się ułamki.','The steps are ready. Finally we divide the rows by their pivots; only here can fractions appear.');
function gaussHtml(name,resName,A){
  const n=A.length,I=M.I(n),plan=elimPlan(A.map((r,i)=>[...r,...I[i]]),n,{stop:true}),sp=X=>[X.map(r=>r.slice(0,n)),X.map(r=>r.slice(n))];
  let s=$t(`<p class="mute">[${name} | <i>I</i>] → operacje na wierszach → [<i>I</i> | ${resName}]${OPT.noFrac?'. Bez ułamków, jeśli się da':''}.</p>`,`<p class="mute">[${name} | <i>I</i>] → row operations → [<i>I</i> | ${resName}]${OPT.noFrac?'. Fractions are avoided where possible':''}.</p>`);
  s+=`<div class="line">${augHtml(A,I)}</div>`;
  planGroups(plan).forEach(gr=>{if(gr.key==='norm')s+=`<p class="mute">${normNote()}</p>`;s+=`<div class="ops">${gr.ops.join(', &nbsp;')}</div><div class="line">${augHtml(...sp(gr.A))}</div>`});
  if(!plan.ok)return s+`<div class="warn">${$t('W którejś kolumnie zabrakło niezerowego elementu, więc macierz nie jest odwracalna.','Some column has no nonzero entry left, so the matrix is not invertible.')}</div>`;
  return s+`<div class="line">${resName} = ${M.html(sp(plan.A)[1])}</div>`;
}

function tokenize(s){
  s=s.replace(/ᵀ/g,'^T').replace(/⁻¹/g,'^-1').replace(/²/g,'^2').replace(/[−–]/g,'-').replace(/[\s*·]/g,'').toUpperCase();
  const t=[];let i=0;
  while(i<s.length){
    const c=s[i];
    if(/[A-Z]/.test(c)){t.push({k:'v',v:c});i++;continue}
    if(/\d/.test(c)){const m=s.slice(i).match(/^(\d+)(\/(\d+))?/);t.push({k:'n',v:F(+m[1],m[3]?+m[3]:1)});i+=m[0].length;continue}
    if('()=+-'.includes(c)){t.push({k:c});i++;continue}
    if(c==="'"){t.push({k:'T'});i++;continue}
    if(c==='^'){
      const r=s.slice(i+1);let m=r.match(/^(\{-1\}|\(-1\)|-1)/);
      if(m){t.push({k:'INV'});i+=1+m[0].length;continue}
      m=r.match(/^(\{T\}|\(T\)|T)/);
      if(m){t.push({k:'T'});i+=1+m[0].length;continue}
      m=r.match(/^\{?([2-9])\}?/);
      if(m){t.push({k:'POW',v:+m[1]});i+=1+m[0].length;continue}
      throw new Error($t('Po „^” wpisz T, -1 albo potęgę (2, 3…).','After “^” type T, -1 or a power (2, 3…).'));
    }
    throw new Error($t(`Nieznany znak: „${c}”.`,`Unknown character: “${c}”.`));
  }
  return t;
}
function parser(tokens){
  let p=0;const peek=()=>tokens[p],next=()=>tokens[p++];
  function expr(){
    const terms=[];let sign=1;
    if(peek()&&(peek().k==='+'||peek().k==='-'))sign=next().k==='-'?-1:1;
    terms.push({sign,...term()});
    while(peek()&&(peek().k==='+'||peek().k==='-')){const s=next().k==='-'?-1:1;terms.push({sign:s,...term()})}
    return {terms};
  }
  function term(){
    let c=F(1);if(peek()&&peek().k==='n')c=next().v;
    const a=[];while(peek()&&(peek().k==='v'||peek().k==='('))a.push(atom());
    if(!a.length)throw new Error($t('Brakuje macierzy (liczbę pisz razem z macierzą, np. 2X albo 3I).','A matrix is missing (write a number together with a matrix, e.g. 2X or 3I).'));
    return {c,atoms:a};
  }
  function atom(){
    const tk=next();let a;
    if(tk.k==='v')a={type:'var',n:tk.v,post:[]};
    else{const e=expr();if(!peek()||peek().k!==')')throw new Error($t('Brakuje nawiasu „)”.','Missing bracket “)”.'));next();a={type:'group',expr:e,post:[]}}
    while(peek()&&['T','INV','POW'].includes(peek().k))a.post.push(next());
    return a;
  }
  return {expr,peek,next,done:()=>p>=tokens.length};
}
function parseEq(src){
  const P=parser(tokenize(src));const L=P.expr();
  if(!P.peek()||P.peek().k!=='=')throw new Error($t('Brakuje znaku „=”.','Missing “=” sign.'));
  P.next();const R=P.expr();
  if(!P.done())throw new Error($t('Coś nie pasuje na końcu równania.','Something is wrong at the end of the equation.'));
  return {L,R};
}
function parseExpr(src){const P=parser(tokenize(src));const e=P.expr();if(!P.done())throw new Error($t('Coś nie pasuje w odpowiedzi (sprawdź nawiasy / znak „=”).','Something is wrong in the answer (check the brackets / the “=” sign).'));return e}

const ST='<sup>T</sup>',SI='<sup>−1</sup>';
const cH=c=>c.one?'':c.html();
function rAtom(a){let b=a.type==='var'?`<i>${a.n}</i>`:`(${rExpr(a.expr)})`,s=false;for(const op of a.post){if(s)b=`(${b})`;b+=op.k==='T'?ST:op.k==='INV'?SI:`<sup>${op.v}</sup>`;s=true}return b}
function rExpr(e){return e.terms.map((t,k)=>(k===0?(t.sign<0?'−':''):(t.sign<0?' − ':' + '))+cH(t.c)+t.atoms.map(rAtom).join('')).join('')}
function rFac(f){const b=f.html||`<i>${f.n}</i>`;if(f.t&&f.i)return `(${b}${ST})${SI}`;if(f.t)return b+ST;if(f.i)return b+SI;return b}
const rProd=fs=>fs.length?fs.map(rFac).join(''):'<i>I</i>';
const rTerms=ts=>ts.length?ts.map((t,k)=>{const ng=t.c.n<0;return (k===0?(ng?'−':''):(ng?' − ':' + '))+cH(t.c.abs())+rProd(t.fs)}).join(''):'0';
const rP=P=>rTerms([P]);
const cPre=c=>c.one?'':(c.n===-1&&c.d===1)?'−':c.html();
const invL=fs=>fs.slice().reverse().map(f=>({...f,i:!f.i}));
const trL=fs=>fs.slice().reverse().map(f=>({...f,t:!f.t}));
function cancel(fs){const st=[];for(const f of fs){const top=st[st.length-1];if(top&&top.n===f.n&&top.t===f.t&&top.i!==f.i&&f.n!=='X')st.pop();else st.push(f)}return st}
function hasX(e){return e.terms.some(t=>t.atoms.some(a=>a.type==='var'?a.n==='X':hasX(a.expr)))}
const linErr=m=>Object.assign(new Error(m),{lin:true});
const blockOf=sum=>{const h='('+rTerms(sum)+')';return {n:h,html:h,sum,t:false,i:false}};
function expandAtom(a){
  let c=F(1),fs;
  if(a.type==='var')fs=a.n==='I'?[]:[{n:a.n,t:false,i:false}];
  else{
    const e=a.expr;
    if(e.terms.length===1){const t=expandTerm(e.terms[0]);c=t.c;fs=t.fs}
    else{if(hasX(e))throw linErr($t('X stoi w nawiasie z sumą, np. (X + A)B; taki nawias trzeba najpierw wymnożyć.','X is inside a bracket with a sum, e.g. (X + A)B; such a bracket has to be multiplied out first.'));fs=[blockOf(e.terms.map(expandTerm))]}
  }
  for(const op of a.post){
    if(op.k==='T')fs=trL(fs);
    else if(op.k==='INV'){fs=invL(fs);c=F(1).div(c)}
    else{const k=op.v,b=fs,cb=c;fs=[];for(let q=0;q<k;q++)fs=fs.concat(b);for(let q=1;q<k;q++)c=c.mul(cb)}
  }
  return {c,fs};
}
function expandTerm(t){let c=F(t.sign).mul(t.c),fs=[];for(const a of t.atoms){const r=expandAtom(a);c=c.mul(r.c);fs=fs.concat(r.fs)}return {c,fs:cancel(fs)}}
function lettersOf(e,set=new Set()){for(const t of e.terms)for(const a of t.atoms){if(a.type==='var'){if(a.n!=='X'&&a.n!=='I')set.add(a.n)}else lettersOf(a.expr,set)}return set}

function solve(src){
  const ast=parseEq(src);
  const orig=rExpr(ast.L)+' = '+rExpr(ast.R);
  const ex=e=>e.terms.map(expandTerm).filter(t=>!t.c.z);
  let L=ex(ast.L),R=ex(ast.R);const L0=L,R0=R;
  const steps=[];const cur=()=>rTerms(L)+' = '+rTerms(R);
  if(cur()!==orig)steps.push({title:$t('Rozpisujemy nawiasy','Expanding the brackets'),why:$t('Transpozycja i odwrotność iloczynu <b>odwracają kolejność</b>: (<i>AB</i>)<sup>T</sup> = <i>B</i><sup>T</sup><i>A</i><sup>T</sup>, (<i>AB</i>)<sup>−1</sup> = <i>B</i><sup>−1</sup><i>A</i><sup>−1</sup>. Do tego (<i>A</i><sup>−1</sup>)<sup>T</sup> = (<i>A</i><sup>T</sup>)<sup>−1</sup> i <i>MM</i><sup>−1</sup> = <i>I</i>.','The transpose and the inverse of a product <b>reverse the order</b>: (<i>AB</i>)<sup>T</sup> = <i>B</i><sup>T</sup><i>A</i><sup>T</sup>, (<i>AB</i>)<sup>−1</sup> = <i>B</i><sup>−1</sup><i>A</i><sup>−1</sup>. Also (<i>A</i><sup>−1</sup>)<sup>T</sup> = (<i>A</i><sup>T</sup>)<sup>−1</sup> and <i>MM</i><sup>−1</sup> = <i>I</i>.'),lines:[cur()]});
  const nX=t=>t.fs.filter(f=>f.n==='X').length,hx=t=>nX(t)>0,all=[...L,...R];
  if(!all.some(hx))throw new Error($t('W równaniu nie ma niewiadomej X.','There is no unknown X in the equation.'));
  if(all.some(t=>nX(t)>1))throw new Error($t('X występuje dwa razy w jednym iloczynie (np. XAX albo X²); takiego równania nie da się rozwiązać tą metodą.','X appears twice in one product (e.g. XAX or X²); such an equation cannot be solved this way.'));
  if(!L.some(hx)){[L,R]=[R,L];steps.push({title:$t('Zamieniamy strony','Swapping the sides'),why:$t('Wygodniej, gdy <i>X</i> jest po lewej.','It is easier when <i>X</i> is on the left.'),lines:[cur()]})}
  const mL=L.filter(t=>!hx(t)),mR=R.filter(hx),neg=t=>({c:t.c.neg(),fs:t.fs});
  if(mL.length||mR.length){
    L=[...L.filter(hx),...mR.map(neg)];R=[...R.filter(t=>!hx(t)),...mL.map(neg)];
    steps.push({title:$t('Przenosimy wyrazy: z X na lewo, bez X na prawo','Moving terms: with X to the left, without X to the right'),why:$t('Przy przenoszeniu na drugą stronę zmienia się znak, jak w zwykłym równaniu.','Moving a term to the other side changes its sign, just like in an ordinary equation.'),lines:[cur()]});
  }
  if(!R.length)throw linErr($t('Po przeniesieniu wyrazów z X na lewo po prawej zostaje 0.','After moving the X terms to the left, only 0 is left on the right.'));
  if(L.length>1){
    const xs=L.map(t=>{const k=t.fs.findIndex(f=>f.n==='X');return {c:t.c,l:t.fs.slice(0,k),x:t.fs[k],r:t.fs.slice(k+1)}});
    if(xs.some(o=>o.x.t!==xs[0].x.t||o.x.i!==xs[0].x.i))throw linErr($t('X występuje w różnych postaciach (np. X i Xᵀ), więc nie da się go wyciągnąć przed nawias.','X appears in different forms (e.g. X and Xᵀ), so it cannot be factored out.'));
    const Xf=xs[0].x;
    if(xs.every(o=>!o.r.length)){
      L=[{c:F(1),fs:[blockOf(xs.map(o=>({c:o.c,fs:o.l}))),Xf]}];
      steps.push({title:$t('Wyciągamy X przed nawias (w prawo)','Factoring X out (to the right)'),why:$t('We wszystkich wyrazach <i>X</i> stoi <b>na końcu</b>, więc wyciągamy go w prawo. Samotne <i>X</i> to <i>IX</i>, dlatego w nawiasie jest <i>I</i>, a nie 1.','In every term <i>X</i> stands <b>at the end</b>, so we factor it out to the right. A lone <i>X</i> is <i>IX</i>, which is why the bracket contains <i>I</i>, not 1.'),lines:[cur()]});
    }else if(xs.every(o=>!o.l.length)){
      L=[{c:F(1),fs:[Xf,blockOf(xs.map(o=>({c:o.c,fs:o.r})))]}];
      steps.push({title:$t('Wyciągamy X przed nawias (w lewo)','Factoring X out (to the left)'),why:$t('We wszystkich wyrazach <i>X</i> stoi <b>na początku</b>, więc wyciągamy go w lewo. Samotne <i>X</i> to <i>XI</i>, dlatego w nawiasie jest <i>I</i>, a nie 1.','In every term <i>X</i> stands <b>at the start</b>, so we factor it out to the left. A lone <i>X</i> is <i>XI</i>, which is why the bracket contains <i>I</i>, not 1.'),lines:[cur()]});
    }else throw linErr($t('X stoi raz z lewej, raz z prawej strony innych macierzy (np. AX + XB); takiego X nie da się wyciągnąć przed nawias.','X stands once on the left and once on the right of other matrices (e.g. AX + XB); such an X cannot be factored out.'));
  }
  if(!L[0].c.one){
    const k=L[0].c,iv=F(1).div(k);L=[{c:F(1),fs:L[0].fs}];R=R.map(t=>({c:t.c.mul(iv),fs:t.fs}));
    steps.push({title:(k.n===-1&&k.d===1)?$t('Pomnóż obie strony przez −1','Multiply both sides by −1'):$t(`Podziel obie strony przez ${k.str()}`,`Divide both sides by ${k.str()}`),why:$t('Liczbę przy <i>X</i> usuwasz jak w zwykłym równaniu.','You remove the number in front of <i>X</i> just as in an ordinary equation.'),lines:[cur()]});
  }
  let P=R.length===1?{c:R[0].c,fs:R[0].fs}:{c:F(1),fs:[blockOf(R)]};
  const fs=L[0].fs,k=fs.findIndex(f=>f.n==='X'),Xf=fs[k];
  let left=fs.slice(0,k),right=fs.slice(k+1);
  const line=()=>rProd([...left,Xf,...right])+' = '+rP(P);
  const hl=fs=>`<span class="hl">${rProd(fs)}</span>`;
  if(left.length){
    const ol=left,iv=invL(ol);
    const lab=ol.length>1?`(${rProd(ol)})${SI} = ${rProd(iv)}`:rProd(iv);
    const l1=`${hl(iv)}${rProd(ol)}${rProd([Xf,...right])} = ${cPre(P.c)}${hl(iv)}${P.fs.length?rProd(P.fs):''}`;
    left=[];P={c:P.c,fs:cancel([...iv,...P.fs])};
    steps.push({title:$t('Mnożymy obie strony z lewej','Multiplying both sides on the left'),why:$t(`Przed <i>X</i> stoi ${rProd(ol)}. Mnożymy <b>obie strony z lewej</b> przez ${lab}${ol.length>1?' (kolejność odwrócona)':''}. Po lewej zostaje <i>I</i>.`,`${rProd(ol)} stands in front of <i>X</i>. We multiply <b>both sides on the left</b> by ${lab}${ol.length>1?' (order reversed)':''}. Only <i>I</i> remains on the left.`),lines:[l1,line()]});
  }
  if(right.length){
    const orr=right,iv=invL(orr);
    const lab=orr.length>1?`(${rProd(orr)})${SI} = ${rProd(iv)}`:rProd(iv);
    const l1=`${rProd([Xf,...orr])}${hl(iv)} = ${cPre(P.c)}${P.fs.length?rProd(P.fs):''}${hl(iv)}`;
    right=[];P={c:P.c,fs:cancel([...P.fs,...iv])};
    steps.push({title:$t('Mnożymy obie strony z prawej','Multiplying both sides on the right'),why:$t(`Za <i>X</i> stoi ${rProd(orr)}. Mnożymy <b>obie strony z prawej</b> przez ${lab}${orr.length>1?' (kolejność odwrócona)':''}.`,`${rProd(orr)} stands after <i>X</i>. We multiply <b>both sides on the right</b> by ${lab}${orr.length>1?' (order reversed)':''}.`),lines:[l1,line()]});
  }
  if(Xf.t||Xf.i){
    const before=rP(P);let why,op;
    if(Xf.t&&Xf.i){P={c:F(1).div(P.c),fs:cancel(trL(invL(P.fs)))};op=`((${before})${SI})${ST}`;why=$t('Mamy (<i>X</i><sup>T</sup>)<sup>−1</sup>: odwracamy obie strony, potem transponujemy. Kolejność czynników się odwraca.','We have (<i>X</i><sup>T</sup>)<sup>−1</sup>: we invert both sides, then transpose. The order of the factors reverses.')}
    else if(Xf.i){P={c:F(1).div(P.c),fs:cancel(invL(P.fs))};op=`(${before})${SI}`;why=$t('Odwracamy obie strony: (<i>X</i><sup>−1</sup>)<sup>−1</sup> = <i>X</i>. Kolejność czynników się odwraca.','We invert both sides: (<i>X</i><sup>−1</sup>)<sup>−1</sup> = <i>X</i>. The order of the factors reverses.')}
    else{P={c:P.c,fs:cancel(trL(P.fs))};op=`(${before})${ST}`;why=$t('Transponujemy obie strony: (<i>X</i><sup>T</sup>)<sup>T</sup> = <i>X</i>. Tu też kolejność się odwraca.','We transpose both sides: (<i>X</i><sup>T</sup>)<sup>T</sup> = <i>X</i>. The order reverses here too.')}
    steps.push({title:Xf.i?$t('Odwróć obie strony','Invert both sides'):$t('Transponuj obie strony','Transpose both sides'),why,lines:[`<i>X</i> = ${op}`,`<i>X</i> = ${rP(P)}`]});
  }
  steps.push({title:$t('Wynik','Result'),why:'',lines:['<i>X</i> = '+rP(P)],final:true});
  return {orig,steps,P,L0,R0,letters:lettersOf(ast.L,lettersOf(ast.R))};
}

const isS=v=>!Array.isArray(v);
const S=k=>({sc:k});
function sqI(A,k){if(A.length!==A[0].length)throw new DimErr($t(`Do macierzy ${dimS(A)} nie da się dodać wielokrotności I, bo nie jest kwadratowa.`,`A multiple of I cannot be added to the ${dimS(A)} matrix because it is not square.`));return M.scale(k,M.I(A.length))}
function vMul(a,b){if(isS(a)&&isS(b))return S(a.sc.mul(b.sc));if(isS(a))return M.scale(a.sc,b);if(isS(b))return M.scale(b.sc,a);return M.mul(a,b)}
function vAdd(a,b){if(isS(a)&&isS(b))return S(a.sc.add(b.sc));if(isS(a))return M.add(sqI(b,a.sc),b);if(isS(b))return M.add(a,sqI(a,b.sc));return M.add(a,b)}
const vScale=(k,a)=>isS(a)?S(a.sc.mul(k)):M.scale(k,a);
const vT=a=>isS(a)?a:M.T(a);
function vInv(a,what){
  let r=null;
  if(isS(a)){if(!a.sc.z)r=S(F(1).div(a.sc))}
  else{try{r=M.inv(a)}catch(e){if(e.inv&&what)e.message=$t(`${what} ma wymiar ${dimS(a)}: nie jest kwadratowa, więc nie ma odwrotnej.`,`${what} is ${dimS(a)}: not square, so it has no inverse.`);throw e}}
  if(!r)throw Object.assign(new Error('singular'),{what});
  return r;
}
const toMat=(v,n)=>isS(v)?M.scale(v.sc,M.I(n)):v;

function evalF(f,env){let V=f.sum?evalSum(f.sum,env):env[f.n];if(!V)throw new Error('brak '+f.n);if(f.t)V=vT(V);if(f.i)V=vInv(V,rFac({...f,i:false}));return V}
const evalProd=(fs,env)=>fs.length?fs.map(f=>evalF(f,env)).reduce(vMul):S(F(1));
const evalSum=(ts,env)=>ts.map(t=>vScale(t.c,evalProd(t.fs,env))).reduce(vAdd);
const evalP=(P,env)=>vScale(P.c,evalProd(P.fs,env));
function numeric(sol,extra=[]){
  for(let at=0;at<60;at++){
    const env={__n:2};for(const c of [...sol.letters,...extra])env[c]=unimod2();
    try{const X=toMat(evalP(sol.P,env),2);env.X=X;return {env,X,Lv:toMat(evalSum(sol.L0,env),2),Rv:toMat(evalSum(sol.R0,env),2)}}
    catch(e){if(e.message!=='singular')throw e}
  }
  return null;
}
function checkAnswer(sol,text){
  text=text.replace(/^\s*X\s*=\s*/i,'');
  if(!text.trim())throw new Error($t('Wpisz odpowiedź.','Type an answer.'));
  const e=parseExpr(text);
  if(hasX(e))throw new Error($t('Odpowiedź nie może zawierać X.','The answer cannot contain X.'));
  const ts=e.terms.map(expandTerm),extra=[...lettersOf(e)];let tested=0;
  for(let k=0;k<12&&tested<4;k++){
    const r=numeric(sol,extra);if(!r)continue;
    let U;try{U=toMat(evalSum(ts,r.env),2)}catch(err){if(err.message==='singular')continue;throw err}
    tested++;if(!M.eq(U,r.X))return false;
  }
  return tested>0;
}

function genEq(lvl){
  const Ls=['A','B','C','D'];
  const f=(pT=.25,pI=.35)=>{const r=Math.random();return pick(Ls)+(r<pT?'^T':r<pT+pI?'^-1':'')};
  const fs=k=>Array.from({length:k},()=>f()).join('');
  const grp=()=>{const a=pick(Ls),b=pick(Ls.filter(x=>x!==a));return `(${a}${Math.random()<.3?'^T':''}${b})${pick(['^-1','^-1','^T'])}`};
  if(lvl===1)return pick([`${fs(1)}X${Math.random()<.5?fs(1):''}=${fs(rnd(1,2))}`,`${f()}X+${f()}=${f()}`,`X${f()}-${f()}=${f()}`]);
  if(lvl===2)return pick([`${fs(rnd(1,2))}X${fs(rnd(1,2))}=${Math.random()<.5?grp()+f():f()+grp()}`,`${f(0,.3)}X=X+${f()}`,`X${f(0,.3)}-${rnd(2,3)}X=${f()}`]);
  const v=rnd(0,5),l=fs(rnd(1,2)),r=fs(1);
  if(v===0)return `${l}X${r}+${f()}${f()}=${grp()}`;
  if(v===1)return `${l}X${pick(['^-1','^T'])}${r}=${f()}${grp()}`;
  if(v===2)return `(${f(0,.4)}X)^T${r}=${grp()}`;
  if(v===3){const a=pick(Ls),b=pick(Ls.filter(x=>x!==a));return `(${a}+${b})X${r}=${f()}${f()}`}
  if(v===4)return `${f(0,.3)}X+${f()}=${rnd(2,3)}X-${f()}${f()}`;
  return `${f()}X-${f()}=${rnd(2,3)}X+${grp()}`;
}

const NT=[
  {eq:'AX=B',inv:{A:0},r:{B:'nm'}},
  {eq:'XA=B',inv:{A:0},r:{B:'mn'}},
  {eq:'AX+B=C',inv:{A:0},r:{B:'nm',C:'nm'}},
  {eq:'XA-2B=C',inv:{A:0},r:{B:'mn',C:'mn'}},
  {eq:'A^TX=B',inv:{A:0},r:{B:'nm'}},
  {eq:'(XA)^T=B',inv:{A:0},r:{B:'nm'}},
  {eq:'AXB=C',inv:{A:0,B:0},r:{B:'mm',C:'nm'}},
  {eq:'AX=X+B',inv:{A:1},r:{B:'nm'}},
  {eq:'XA=2X+B',inv:{A:2},r:{B:'mn'}},
  {eq:'AX-B=3X',inv:{A:3},r:{B:'nm'}},
  {eq:'2X+AX=B^T',inv:{A:-2},r:{B:'mn'}},
  {eq:'AX+B=2X-C',inv:{A:2},r:{B:'nm',C:'nm'}},
  {eq:'XA^T+B=X',inv:{A:1},r:{B:'mn'}},
  {eq:'AX+XB=C',lin:{A:[2,2],B:[2,2]},tg:'C',note:()=>$t('X stoi raz z lewej, raz z prawej','X stands once on the left and once on the right')},
  {eq:'AX+X^T=B',lin:{A:[2,2]},tg:'B',note:()=>$t('X występuje razem z Xᵀ','X appears together with Xᵀ')},
  {eq:'XA=B',lin:{A:[2,3]},tg:'B',note:()=>$t('A ma wymiar 2×3, więc nie ma A⁻¹','A is 2×3, so there is no A⁻¹')},
  {eq:'AX=B',lin:{A:[3,2]},tg:'B',note:()=>$t('A ma wymiar 3×2, więc nie ma A⁻¹','A is 3×2, so there is no A⁻¹')},
];
function genNum(n,idx,rect){
  const tpl=idx>=0?NT[idx]:pick(NT.filter(t=>!t.lin));const sol=solve(tpl.eq);let best=null;const m=n===2?3:2;
  const dim=c=>{const s=(rect&&tpl.r&&tpl.r[c])||'nn';return [s[0]==='n'?n:m,s[1]==='n'?n:m]};
  for(let at=0;at<400;at++){
    const env={__n:n};
    for(const c of sol.letters){const [r,k]=dim(c);env[c]=c in tpl.inv?M.add(richUni(r),M.scale(F(tpl.inv[c]),M.I(r))):randR(r,k,-4,6)}
    let X;try{X=toMat(evalP(sol.P,env),n)}catch(e){continue}
    if(X.flat().some(x=>x.d!==1))continue;
    const mx=Math.max(...X.flat().map(x=>Math.abs(x.n))),nz=X.flat().filter(x=>x.z).length;
    const sc=mx+(nz>1?40:0);
    if(!best||sc<best.sc)best={env,X,sc};
    if(mx<=(n===2?35:45)&&nz<=1)break;
  }
  const e=best.env;e.X=best.X;
  return {tpl,sol,env:e,X:best.X,n,Lv:toMat(evalSum(sol.L0,e),n),Rv:toMat(evalSum(sol.R0,e),n)};
}
function genLin(tpl){
  const ast=parseEq(tpl.eq);let best=null;
  for(let at=0;at<120;at++){
    const env={};
    for(const [c,[r,k]] of Object.entries(tpl.lin))env[c]=randR(r,k,-3,4);
    const X=randR(2,2,-3,5);
    let T;try{T=toMat(evalAst(ast.L,{...env,X}),2)}catch(e){continue}
    const big=Math.max(...T.flat().map(x=>Math.abs(x.n)));if(big>30)continue;
    env[tpl.tg]=T;
    let L;try{L=linSolve(tpl.eq,env)}catch(e){continue}
    if(L.type!=='one')continue;
    const sc=L.fr*2+big/10;
    if(!best||sc<best.sc)best={env,X,L,sc};
    if(L.fr===0&&at>6)break;
  }
  const {env,X,L}=best;env.X=X;
  return {fr:()=>linFrames(L),orig:L.orig,letters:Object.keys(env).filter(k=>k!=='X').sort(),env,X,solHtml:L.html,
    hint:$t(`Wzorem się nie da: ${tpl.note()}. Zapisz <span class="f"><i>X</i> = </span>${matH([['<i>x</i>','<i>y</i>'],['<i>z</i>','<i>t</i>']])}, wymnóż obie strony, porównaj elementy i rozwiąż układ równań.`,`A formula will not work here: ${tpl.note()}. Write <span class="f"><i>X</i> = </span>${matH([['<i>x</i>','<i>y</i>'],['<i>z</i>','<i>t</i>']])}, multiply out both sides, compare the entries and solve the system of equations.`)};
}
function numSolHtml(T){
  const {sol,env,X}=T;
  let h=$t('<h3>1. Wyznacz X na literach</h3>','<h3>1. Solve for X symbolically</h3>');
  h+=sol.steps.filter(s=>!s.final).map(s=>`<div class="line"><span class="mute">${s.title}:</span><br>${s.lines[s.lines.length-1]}</div>`).join('');
  h+=$t(`<div class="line"><b><i>X</i> = ${rP(sol.P)}</b></div><h3>2. Podstaw liczby</h3>`,`<div class="line"><b><i>X</i> = ${rP(sol.P)}</b></div><h3>2. Substitute the numbers</h3>`);
  const cache={},vals=[];
  for(const f of sol.P.fs){
    const key=rFac(f);if(cache[key]){vals.push(cache[key]);continue}
    const bname=rFac({...f,i:false});let base;
    if(f.sum){
      for(const t of f.sum)if(t.fs.length&&(!t.c.abs().one||t.fs.length>1||t.fs.some(q=>q.t||q.i)))h+=`<div class="line">${rTerms([{c:t.c.abs(),fs:t.fs}])} = ${M.html(toMat(evalP({c:t.c.abs(),fs:t.fs},env),env.__n))}</div>`;
      base=toMat(evalSum(f.sum,env),env.__n);h+=`<div class="line">${f.html} = ${M.html(base)}</div>`;
      if(f.t){base=M.T(base);h+=`<div class="line">${bname} = ${M.html(base)}</div>`}
    }else{base=env[f.n];if(f.t){base=M.T(base);h+=`<div class="line">${bname} = ${M.html(base)}</div>`}}
    let V=base;
    if(f.i){V=M.inv(base);h+=$t(`<details open><summary>${key} metodą Gaussa</summary>${gaussHtml(bname,key,base)}</details>`,`<details open><summary>Computing ${key} by Gaussian elimination</summary>${gaussHtml(bname,key,base)}</details>`)}
    cache[key]=V;vals.push(V);
  }
  if(vals.length>1){let run=vals[0];for(let k=1;k<vals.length;k++){run=M.mul(run,vals[k]);h+=`<div class="line">${rProd(sol.P.fs.slice(0,k+1))} = ${M.html(run)}</div>`}}
  if(!sol.P.c.one)h+=$t(`<div class="line">Mnożymy przez ${sol.P.c.str()}:</div>`,`<div class="line">Multiplying by ${sol.P.c.str()}:</div>`);
  h+=`<div class="line"><b><i>X</i> = ${M.html(X)}</b></div>`;
  h+=$t(`<h3>3. Sprawdzenie</h3><p class="mute">Podstawiamy <i>X</i> do równania ${sol.orig}:</p><div class="nums"><span class="gv">lewa = ${M.html(T.Lv)}</span><span class="gv">prawa = ${M.html(T.Rv)}</span></div><p class="mute">${M.eq(T.Lv,T.Rv)?'Obie strony są równe.':''}</p>`,`<h3>3. Check</h3><p class="mute">Substitute <i>X</i> into the equation ${sol.orig}:</p><div class="nums"><span class="gv">left = ${M.html(T.Lv)}</span><span class="gv">right = ${M.html(T.Rv)}</span></div><p class="mute">${M.eq(T.Lv,T.Rv)?'Both sides are equal.':''}</p>`);
  return h;
}

const eqL=(lab,A)=>`<div class="line">${lab} = ${M.html(A)}</div>`;
const coef=a=>a===1?'':a===-1?'−':String(a).replace('-','−');
const EXPR=[
  {lab:'<i>AB</i> − <i>BA</i>',m:'AB',f:(A,B)=>{const x=M.mul(A,B),y=M.mul(B,A);return [['<i>AB</i>',x],['<i>BA</i>',y],['<i>AB</i> − <i>BA</i>',M.sub(x,y)]]}},
  {lab:'2<i>A</i><sup>T</sup> − 3<i>B</i>',m:'AB',f:(A,B)=>{const x=M.scale(F(2),M.T(A)),y=M.scale(F(3),B);return [['<i>A</i><sup>T</sup>',M.T(A)],['2<i>A</i><sup>T</sup>',x],['3<i>B</i>',y],['2<i>A</i><sup>T</sup> − 3<i>B</i>',M.sub(x,y)]]}},
  {lab:'(<i>A</i> + <i>B</i>)<i>C</i>',m:'ABC',f:(A,B,C)=>{const s=M.add(A,B);return [['<i>A</i> + <i>B</i>',s],['(<i>A</i> + <i>B</i>)<i>C</i>',M.mul(s,C)]]}},
  {lab:'<i>A</i><sup>2</sup> − 2<i>B</i>',m:'AB',f:(A,B)=>{const x=M.mul(A,A),y=M.scale(F(2),B);return [['<i>A</i><sup>2</sup> = <i>A</i>·<i>A</i>',x],['2<i>B</i>',y],['<i>A</i><sup>2</sup> − 2<i>B</i>',M.sub(x,y)]]}},
  {lab:'<i>AB</i><sup>T</sup> + <i>C</i>',m:'ABC',f:(A,B,C)=>{const bt=M.T(B),x=M.mul(A,bt);return [['<i>B</i><sup>T</sup>',bt],['<i>AB</i><sup>T</sup>',x],['<i>AB</i><sup>T</sup> + <i>C</i>',M.add(x,C)]]}},
  {lab:'(<i>AB</i>)<sup>T</sup> − 2<i>C</i>',m:'ABC',f:(A,B,C)=>{const x=M.mul(A,B),y=M.scale(F(2),C);return [['<i>AB</i>',x],['(<i>AB</i>)<sup>T</sup>',M.T(x)],['2<i>C</i>',y],['(<i>AB</i>)<sup>T</sup> − 2<i>C</i>',M.sub(M.T(x),y)]]}},
  {lab:'<i>A</i><sup>T</sup><i>B</i> − <i>C</i><sup>T</sup>',m:'ABC',f:(A,B,C)=>{const x=M.mul(M.T(A),B);return [['<i>A</i><sup>T</sup>',M.T(A)],['<i>A</i><sup>T</sup><i>B</i>',x],['<i>C</i><sup>T</sup>',M.T(C)],['<i>A</i><sup>T</sup><i>B</i> − <i>C</i><sup>T</sup>',M.sub(x,M.T(C))]]}},
];
function genTask(type){
  if(type==='add'){
    const r=rnd(2,3),c=rnd(2,4),A=randR(r,c,-6,9),B=randR(r,c,-6,9),a=pick([2,3,-2,4,1]),b=pick([-1,2,-2,3,-3,-4]);
    const Aa=M.scale(F(a),A),Bb=M.scale(F(b),B),ans=M.add(Aa,Bb);
    const lab=`${coef(a)}<i>A</i> ${b<0?'−':'+'} ${coef(Math.abs(b))}<i>B</i>`;
    return {fr:()=>addFrames(A,B,a,b),q:$t(`Oblicz ${lab}`,`Compute ${lab}`),given:[['A',A],['B',B]],ans,lab,sol:$t(`<p>Każdy element mnożymy przez liczbę, potem dodajemy element po elemencie.</p>${eqL(coef(a)+'<i>A</i>',Aa)}${eqL(coef(b)+'<i>B</i>',Bb)}${eqL(lab,ans)}`,`<p>Multiply every entry by the number, then add entry by entry.</p>${eqL(coef(a)+'<i>A</i>',Aa)}${eqL(coef(b)+'<i>B</i>',Bb)}${eqL(lab,ans)}`)};
  }
  if(type==='mul'){
    const m=rnd(2,3),n=rnd(2,4),p=rnd(2,3),A=randR(m,n,-4,6),B=randR(n,p,-4,6),ans=M.mul(A,B);
    let s=$t(`<p>Wymiary: (${m}×${n})·(${n}×${p}) = ${m}×${p}. Wiersz razy kolumna:</p>`,`<p>Sizes: (${m}×${n})·(${n}×${p}) = ${m}×${p}. Row times column:</p>`);
    for(let i=0;i<m;i++)for(let j=0;j<p;j++)s+=`<div class="line"><i>c</i><sub>${i+1}${j+1}</sub> = ${A[i].map((x,k)=>`${fmt(x)}·${fmt(B[k][j])}`).join(' + ')} = <b>${ans[i][j].str()}</b></div>`;
    return {fr:()=>mulFrames(A,B,{a:'<i>A</i>',b:'<i>B</i>',c:'<i>AB</i>'}).frames,q:$t('Oblicz <i>A</i>·<i>B</i>','Compute <i>A</i>·<i>B</i>'),given:[['A',A],['B',B]],ans,lab:'<i>AB</i>',sol:s+eqL('<i>AB</i>',ans)};
  }
  if(type==='trans'){
    const r=rnd(2,3),c=r===2?pick([3,4]):pick([2,4]),A=randR(r,c,-9,12),ans=M.T(A);
    return {fr:()=>transFrames(A,'<i>A</i>','<i>A</i><sup>T</sup>'),q:$t('Oblicz <i>A</i><sup>T</sup>','Compute <i>A</i><sup>T</sup>'),given:[['A',A]],ans,lab:'<i>A</i><sup>T</sup>',sol:$t(`<p>Pierwszy wiersz staje się pierwszą kolumną, drugi drugą i tak dalej. Wymiar ${r}×${c} → ${c}×${r}.</p>${eqL('<i>A</i><sup>T</sup>',ans)}`,`<p>The first row becomes the first column, the second row the second column, and so on. Size ${r}×${c} → ${c}×${r}.</p>${eqL('<i>A</i><sup>T</sup>',ans)}`)};
  }
  if(type==='expr'){
    const E=pick(EXPR),n=Math.random()<.6?2:3,mats=[...E.m].map(()=>randR(n,n,-4,6)),parts=E.f(...mats);
    return {fr:()=>EXPR_FR[EXPR.indexOf(E)](...mats),q:$t('Oblicz ','Compute ')+E.lab,given:[...E.m].map((c,k)=>[c,mats[k]]),ans:parts[parts.length-1][1],lab:E.lab,sol:$t('<p>Liczymy po kolei:</p>','<p>Step by step:</p>')+parts.map(([l,A])=>eqL(l,A)).join('')};
  }
  const n=type==='inv2'?2:3,A=n===2?richUni(2,[1,1,2]):richUni(3),ans=M.inv(A);
  return {fr:()=>invFrames(A,'<i>A</i>','<i>A</i><sup>−1</sup>',$t('Macierz odwrotna','Inverse matrix')).frames,q:$t(`Oblicz <i>A</i><sup>−1</sup> (${n}×${n})`,`Compute <i>A</i><sup>−1</sup> (${n}×${n})`),given:[['A',A]],ans,lab:'<i>A</i><sup>−1</sup>',get sol(){return gaussHtml('<i>A</i>','<i>A</i><sup>−1</sup>',A)+$t(`<p class="mute">Kontrola: <i>A</i>·<i>A</i><sup>−1</sup> = <i>I</i>.</p>`,`<p class="mute">Check: <i>A</i>·<i>A</i><sup>−1</sup> = <i>I</i>.</p>`)}};
}
const ORD='xyztuvwabcdefghijklmnopqrs';
const nmHtml=s=>{const m=s.match(/^([a-z])(\d*)$/);return `<i>${m[1]}</i>${m[2]?`<sub>${m[2]}</sub>`:''}`};
const stdNames=n=>n<=4?['x','y','z','t'].slice(0,n):Array.from({length:n},(_,i)=>'x'+(i+1));
const matNames=(r,c)=>r*c<=4?['x','y','z','t'].slice(0,r*c):M.make(r,c,(i,j)=>'x'+(i+1)+(j+1)).flat();
const pl=(n,a,b,c)=>n===1?a:(n%10>=2&&n%10<=4&&(n%100<12||n%100>14))?b:c;
function matH(A,o={}){const c=A[0].length;return `<span class="mat${o.det?' det':''}" style="grid-template-columns:repeat(${c},auto)">${A.flat().map((x,k)=>`<span${o.hl===k%c?' class="hl"':''}>${typeof x==='string'?x:x.html()}</span>`).join('')}</span>`}
const colH=names=>matH(names.map(v=>[nmHtml(v)]));
function lfHtml(f,names,constFirst){
  const p=[];
  if(constFirst&&!f.k.z)p.push([f.k.n<0,f.k.abs().html()]);
  f.c.forEach((x,j)=>{if(!x.z)p.push([x.n<0,(x.abs().one?'':x.abs().html())+nmHtml(names[j])])});
  if(!constFirst&&!f.k.z)p.push([f.k.n<0,f.k.abs().html()]);
  return p.length?p.map(([ng,b],i)=>(i?(ng?' − ':' + '):(ng?'−':''))+b).join(''):'0';
}
function sysHtml(rows,names){
  const nv=names.length;let h='';
  for(const r of rows){
    const cells=[];let first=true;
    for(let j=0;j<nv;j++){
      const x=r.c[j];
      if(j)cells.push(`<span class="sg">${x.z||first?'':x.n<0?'−':'+'}</span>`);
      let t='';if(!x.z){const a=x.abs();t=(first&&x.n<0?'−':'')+(a.one?'':a.html())+nmHtml(names[j]);first=false}
      cells.push(`<span>${t}</span>`);
    }
    if(first)cells[cells.length-1]='<span>0</span>';
    h+=cells.join('')+`<span class="sg">=</span><span class="rh">${r.k.html()}</span>`;
  }
  return `<span class="sysw"><span class="sys" style="grid-template-columns:repeat(${2*nv+1},auto)">${h}</span></span>`;
}
const abRows=(Ab,nv)=>Ab.map(r=>({c:r.slice(0,nv),k:r[nv]}));

const pivScore=x=>x.z?1e9:(x.d===1&&Math.abs(x.n)===1)?0:Math.abs(x.n/x.d)+(x.d!==1?100:0);
function rref(Ab,nv){
  const m=Ab.length,A=Ab.map(r=>r.slice()),cp=X=>X.map(r=>r.slice()),steps=[{ops:[],A:cp(A)}],piv=[];let row=0;
  for(let j=0;j<nv&&row<m;j++){
    let best=-1;for(let i=row;i<m;i++)if(!A[i][j].z&&(best<0||pivScore(A[i][j])<pivScore(A[best][j])))best=i;
    if(best<0)continue;
    const ops=[];
    if(best!==row){[A[row],A[best]]=[A[best],A[row]];ops.push(`${W(row)} ↔ ${W(best)}`)}
    const p=A[row][j];
    if(!p.one){const iv=F(1).div(p);A[row]=A[row].map(x=>x.mul(iv));ops.push(p.n===-1&&p.d===1?`${W(row)} · (−1)`:`${W(row)} : ${fmt(p)}`)}
    for(let i=0;i<m;i++){
      if(i===row||A[i][j].z)continue;const k=A[i][j],a=k.abs();
      A[i]=A[i].map((x,q)=>x.sub(k.mul(A[row][q])));
      ops.push(`${W(i)} ${k.n>0?'−':'+'} ${a.one?'':a.d===1?a.str():'('+a.str()+')'}${W(row)}`);
    }
    piv.push(j);row++;
    if(ops.length)steps.push({ops,A:cp(A)});
  }
  const r=piv.length;let bad=-1;
  for(let i=r;i<m;i++)if(!A[i][nv].z){bad=i;break}
  return {A,steps,piv,rank:r,rankAb:r+(bad>=0?1:0),bad,type:bad>=0?'none':r===nv?'one':'inf'};
}
function sysSolution(res,nv){
  if(res.type==='none')return null;
  const free=[...Array(nv).keys()].filter(j=>!res.piv.includes(j)),forms=Array(nv);
  const zero=()=>({c:Array.from({length:nv},()=>F(0)),k:F(0)});
  free.forEach(j=>{const f=zero();f.c[j]=F(1);forms[j]=f});
  res.piv.forEach((j,i)=>{const f=zero();f.k=res.A[i][nv];free.forEach(q=>{f.c[q]=res.A[i][q].neg()});forms[j]=f});
  return {free,forms};
}
const fracCount=res=>res.steps.reduce((s,st)=>s+st.A.flat().filter(x=>x.d!==1).length,0);
function genSolHtml(sol,names){
  const pv=names.map((v,j)=>sol.free.includes(j)?null:`${nmHtml(v)} = ${lfHtml(sol.forms[j],names,true)}`).filter(Boolean);
  return pv.join(', &nbsp; ')+(pv.length?', &nbsp; ':'')+sol.free.map(j=>nmHtml(names[j])).join(', ')+' ∈ ℝ';
}
function gaussSys(Ab,names){
  const nv=names.length,res=rref(Ab,nv),plan=elimPlan(Ab,nv,{sys:true}),sp=X=>[X.map(r=>r.slice(0,nv)),X.map(r=>[r[nv]])];
  let h=$t(`<p class="mute">[<i>A</i> | <i>B</i>] → operacje na wierszach → schodki, zera nad nimi i pod nimi${OPT.noFrac?'. Bez ułamków, jeśli się da':''}.</p>`,`<p class="mute">[<i>A</i> | <i>B</i>] → row operations → steps with zeros above and below them${OPT.noFrac?'. Fractions are avoided where possible':''}.</p>`);
  h+=`<div class="line">${augHtml(...sp(Ab))}</div>`;
  planGroups(plan).forEach(gr=>{if(gr.key==='norm')h+=`<p class="mute">${normNote()}</p>`;h+=`<div class="ops">${gr.ops.join(', &nbsp;')}</div><div class="line">${augHtml(...sp(gr.A))}</div>`});
  const rows=abRows(plan.A,nv),isZero=r=>r.c.every(x=>x.z)&&r.k.z,zero=rows.filter(isZero).length,keep=rows.filter(r=>!isZero(r));
  h+=$t(`<h3>Odczytujemy wynik</h3>`,`<h3>Reading the result</h3>`);
  if(zero)h+=$t(`<p class="mute">${zero===1?'Wiersz zerowy (0 = 0) pomijamy, bo nic nie wnosi.':'Wiersze zerowe (0 = 0) pomijamy, bo nic nie wnoszą.'}</p>`,`<p class="mute">${zero===1?'The zero row (0 = 0) can be skipped: it adds nothing.':'The zero rows (0 = 0) can be skipped: they add nothing.'}</p>`);
  if(keep.length)h+=`<div class="line">${sysHtml(keep,names)}</div>`;
  h+=$t(`<p>rz <i>A</i> = ${res.rank}, &nbsp; rz [<i>A</i> | <i>B</i>] = ${res.rankAb}, &nbsp; niewiadomych <i>n</i> = ${nv}.</p>`,`<p>rank <i>A</i> = ${res.rank}, &nbsp; rank [<i>A</i> | <i>B</i>] = ${res.rankAb}, &nbsp; unknowns <i>n</i> = ${nv}.</p>`);
  const sol=sysSolution(res,nv);
  if(res.type==='none'){const k=plan.A.find(r=>r.slice(0,nv).every(x=>x.z)&&!r[nv].z)[nv].html();h+=$t(`<div class="warn">Wiersz [0 … 0 | ${k}] to równanie 0 = ${k}, czyli sprzeczność. rz <i>A</i> &lt; rz [<i>A</i> | <i>B</i>], więc układ jest <b>sprzeczny</b>: nie ma rozwiązań.</div>`,`<div class="warn">The row [0 … 0 | ${k}] is the equation 0 = ${k}, a contradiction. rank <i>A</i> &lt; rank [<i>A</i> | <i>B</i>], so the system is <b>inconsistent</b>: it has no solutions.</div>`)}
  else if(res.type==='one')h+=$t(`<p>rz <i>A</i> = rz [<i>A</i> | <i>B</i>] = <i>n</i>, więc jest <b>dokładnie jedno rozwiązanie</b>:</p><div class="line res">${names.map((v,j)=>`${nmHtml(v)} = ${sol.forms[j].k.html()}`).join(', &nbsp; ')}</div>`,`<p>rank <i>A</i> = rank [<i>A</i> | <i>B</i>] = <i>n</i>, so there is <b>exactly one solution</b>:</p><div class="line res">${names.map((v,j)=>`${nmHtml(v)} = ${sol.forms[j].k.html()}`).join(', &nbsp; ')}</div>`);
  else{const k=nv-res.rank;h+=$t(`<p>rz <i>A</i> = rz [<i>A</i> | <i>B</i>] = ${res.rank} &lt; <i>n</i> = ${nv}, więc rozwiązań jest <b>nieskończenie wiele</b>; zależą one od ${k} ${pl(k,'parametru','parametrów','parametrów')}. ${pl(sol.free.length,'Niewiadoma','Niewiadome','Niewiadome')} bez schodka (${sol.free.map(j=>nmHtml(names[j])).join(', ')}) ${sol.free.length===1?'jest dowolna':'są dowolne'}, resztę wyrażamy przez nie:</p><div class="line res">${genSolHtml(sol,names)}</div>`,`<p>rank <i>A</i> = rank [<i>A</i> | <i>B</i>] = ${res.rank} &lt; <i>n</i> = ${nv}, so there are <b>infinitely many solutions</b>, depending on ${k} ${k===1?'parameter':'parameters'}. The ${sol.free.length===1?'unknown':'unknowns'} without a pivot (${sol.free.map(j=>nmHtml(names[j])).join(', ')}) ${sol.free.length===1?'is free':'are free'}; the rest are expressed in terms of ${sol.free.length===1?'it':'them'}:</p><div class="line res">${genSolHtml(sol,names)}</div>`)}
  return {html:h,res,sol,plan};
}
function checkSysHtml(Ab,names,vals){
  const nv=names.length;
  return $t(`<h3>Sprawdzenie</h3><p class="mute">Podstawiamy do każdego równania:</p>`,`<h3>Check</h3><p class="mute">Substitute into every equation:</p>`)+Ab.map(r=>{let s=F(0);const p=[];r.slice(0,nv).forEach((a,j)=>{if(!a.z){p.push(`${fmt(a)}·${fmt(vals[j])}`);s=s.add(a.mul(vals[j]))}});return `<div class="line">${p.join(' + ')||'0'} = ${s.html()}${s.eq(r[nv])?'':' ≠ '+r[nv].html()}</div>`}).join('');
}

function detF(A){
  const n=A.length,B=A.map(r=>r.slice());let d=F(1);
  for(let j=0;j<n;j++){
    let p=-1;for(let i=j;i<n;i++)if(!B[i][j].z){p=i;break}
    if(p<0)return F(0);
    if(p!==j){[B[p],B[j]]=[B[j],B[p]];d=d.neg()}
    d=d.mul(B[j][j]);
    for(let i=j+1;i<n;i++){const k=B[i][j].div(B[j][j]);B[i]=B[i].map((x,q)=>x.sub(k.mul(B[j][q])))}
  }
  return d;
}
function detLines(A){
  const n=A.length,v=detF(A),e=(i,j)=>fmt(A[i][j]);
  if(n===1)return `<div class="line">= <b>${v.html()}</b></div>`;
  if(n===2){const p=A[0][0].mul(A[1][1]),q=A[0][1].mul(A[1][0]);return `<div class="line">= ${e(0,0)}·${e(1,1)} − ${e(0,1)}·${e(1,0)} = ${fmt(p)} − ${fmt(q)} = <b>${v.html()}</b></div>`}
  const P=[[[0,0],[1,1],[2,2]],[[0,1],[1,2],[2,0]],[[0,2],[1,0],[2,1]]],N=[[[0,2],[1,1],[2,0]],[[0,0],[1,2],[2,1]],[[0,1],[1,0],[2,2]]];
  const tx=t=>t.map(([i,j])=>e(i,j)).join('·'),tv=t=>t.reduce((s,[i,j])=>s.mul(A[i][j]),F(1));
  return `<div class="line">= ${P.map(tx).join(' + ')} − ${N.map(tx).join(' − ')}</div><div class="line">= ${P.map(t=>fmt(tv(t))).join(' + ')} − ${N.map(t=>fmt(tv(t))).join(' − ')} = <b>${v.html()}</b></div>`;
}

function sysMethodHtml(Ab,names,method){
  const nv=names.length,m=Ab.length,A=Ab.map(r=>r.slice(0,nv)),b=Ab.map(r=>r[nv]),bc=b.map(x=>[x]);
  const truth=rref(Ab,nv),tsol=sysSolution(truth,nv);
  const gaussPart=()=>$t(`<h3>Metoda Gaussa</h3>`,`<h3>Gaussian elimination</h3>`)+gaussSys(Ab,names).html;
  let h='';
  if(method==='mac'){
    h+=$t(`<h3>1. Zapis macierzowy <i>AX</i> = <i>B</i></h3><div class="line">${matH(A)} · ${colH(names)} = ${matH(bc)}</div>`,`<h3>1. Matrix form <i>AX</i> = <i>B</i></h3><div class="line">${matH(A)} · ${colH(names)} = ${matH(bc)}</div>`);
    if(m!==nv)h+=$t(`<div class="warn">Macierz <i>A</i> ma wymiar ${m}×${nv}: nie jest kwadratowa, więc nie ma <i>A</i><sup>−1</sup>. Metoda macierzowa tu nie działa.</div>`,`<div class="warn">The matrix <i>A</i> is ${m}×${nv}: not square, so there is no <i>A</i><sup>−1</sup>. The matrix method does not work here.</div>`)+gaussPart();
    else{
      const g=gaussInv(A);
      if(!g)h+=$t(`<div class="warn">Przy liczeniu <i>A</i><sup>−1</sup> w którejś kolumnie zabraknie niezerowego elementu, czyli <i>A</i> nie jest odwracalna (det <i>A</i> = 0). Metoda macierzowa nie działa: układ jest sprzeczny albo ma nieskończenie wiele rozwiązań.</div>`,`<div class="warn">While computing <i>A</i><sup>−1</sup>, some column runs out of nonzero entries, so <i>A</i> is not invertible (det <i>A</i> = 0). The matrix method does not work: the system is inconsistent or has infinitely many solutions.</div>`)+gaussPart();
      else{
        const X=M.mul(g.inv,bc);
        h+=$t(`<p>Mnożymy obie strony <b>z lewej</b> przez <i>A</i><sup>−1</sup>: &nbsp;<span class="f"><i>X</i> = <i>A</i><sup>−1</sup><i>B</i></span>.</p>`,`<p>Multiply both sides <b>on the left</b> by <i>A</i><sup>−1</sup>: &nbsp;<span class="f"><i>X</i> = <i>A</i><sup>−1</sup><i>B</i></span>.</p>`);
        h+=$t(`<h3>2. Macierz odwrotna</h3><details open><summary><i>A</i><sup>−1</sup> metodą Gaussa</summary>${gaussHtml('<i>A</i>','<i>A</i><sup>−1</sup>',A)}</details>`,`<h3>2. Inverse matrix</h3><details open><summary>Computing <i>A</i><sup>−1</sup> by Gaussian elimination</summary>${gaussHtml('<i>A</i>','<i>A</i><sup>−1</sup>',A)}</details>`);
        h+=$t(`<h3>3. Iloczyn <i>A</i><sup>−1</sup> · <i>B</i></h3><p class="mute">Każda niewiadoma to wiersz <i>A</i><sup>−1</sup> razy kolumna <i>B</i>:</p>`,`<h3>3. The product <i>A</i><sup>−1</sup> · <i>B</i></h3><p class="mute">Each unknown is a row of <i>A</i><sup>−1</sup> times the column <i>B</i>:</p>`);
        h+=names.map((v,i)=>`<div class="line">${nmHtml(v)} = ${g.inv[i].map((x,k)=>`${fmt(x)}·${fmt(b[k])}`).join(' + ')} = <b>${X[i][0].html()}</b></div>`).join('');
        h+=`<div class="line res"><i>X</i> = ${colH(names)} = ${matH(X)}</div>`;
      }
    }
  }else if(method==='cra'){
    if(m!==nv)h+=$t(`<div class="warn">Wzory Cramera działają tylko wtedy, gdy równań jest tyle, ile niewiadomych. Tu równań jest ${m}, a niewiadomych ${nv}.</div>`,`<div class="warn">Cramer’s rule only works when there are as many equations as unknowns. Here there are ${m} equations and ${nv} unknowns.</div>`)+gaussPart();
    else if(nv>3)h+=$t(`<div class="tip">Wzory Cramera dla układu ${nv}×${nv} wymagają wyznaczników ${nv}×${nv} (rozwinięcie Laplace’a), a to bardzo długie liczenie. Tu wygodniej metodą Gaussa.</div>`,`<div class="tip">Cramer’s rule for a ${nv}×${nv} system needs ${nv}×${nv} determinants (Laplace expansion), a very long computation. Gaussian elimination is easier here.</div>`)+gaussPart();
    else{
      const Wd=detF(A);
      const sar=nv===3&&OPT.det!=='laplace';
      h+=$t(`<h3>1. Wyznacznik główny</h3>${sar?'<p class="mute">Sarrus: trzy iloczyny po przekątnych „w prawo w dół” z plusem, trzy „w lewo w dół” z minusem.</p>':''}<div class="line"><i>W</i> = ${matH(A,{det:true})}</div>${detText(A,'<i>W</i>')}`,`<h3>1. The main determinant</h3>${sar?'<p class="mute">Sarrus: three diagonal products going “down to the right” with a plus, three going “down to the left” with a minus.</p>':''}<div class="line"><i>D</i> = ${matH(A,{det:true})}</div>${detText(A,'<i>D</i>')}`);
      if(Wd.z)h+=$t(`<div class="warn"><i>W</i> = 0, więc wzory Cramera nie działają. Układ jest sprzeczny albo ma nieskończenie wiele rozwiązań; rozstrzyga metoda Gaussa.</div>`,`<div class="warn"><i>D</i> = 0, so Cramer’s rule does not work. The system is inconsistent or has infinitely many solutions; Gaussian elimination decides.</div>`)+gaussPart();
      else{
        const sub=v=>`<i>${$t('W','D')}</i><sub>${nmHtml(v)}</sub>`;
        h+=$t(`<p><i>W</i> ≠ 0, więc układ ma dokładnie jedno rozwiązanie (układ Cramera).</p><h3>2. Wyznaczniki niewiadomych</h3><p class="mute">Kolumnę przy danej niewiadomej zastępujemy kolumną wyrazów wolnych.</p>`,`<p><i>D</i> ≠ 0, so the system has exactly one solution (a Cramer system).</p><h3>2. Determinants of the unknowns</h3><p class="mute">The column of the given unknown is replaced with the column of constants.</p>`);
        const Ws=names.map((v,j)=>{const Aj=A.map((r,i)=>r.map((x,q)=>q===j?b[i]:x));h+=`<div class="line">${sub(v)} = ${matH(Aj,{det:true,hl:j})}</div>${detText(Aj,sub(v))}`;return detF(Aj)});
        h+=$t(`<h3>3. Wzory Cramera</h3>`,`<h3>3. Cramer’s rule</h3>`)+names.map((v,j)=>$t(`<div class="line">${nmHtml(v)} = <span class="fr"><span>${sub(v)}</span><span><i>W</i></span></span> = <span class="fr"><span>${Ws[j].str()}</span><span>${Wd.str()}</span></span> = <b>${Ws[j].div(Wd).html()}</b></div>`,`<div class="line">${nmHtml(v)} = <span class="fr"><span>${sub(v)}</span><span><i>D</i></span></span> = <span class="fr"><span>${Ws[j].str()}</span><span>${Wd.str()}</span></span> = <b>${Ws[j].div(Wd).html()}</b></div>`)).join('');
      }
    }
  }else h+=gaussSys(Ab,names).html;
  const vals=truth.type==='one'?tsol.forms.map(f=>f.k):null;
  if(vals)h+=checkSysHtml(Ab,names,vals);
  return {html:h,type:truth.type,vals,res:truth};
}

const randRow=nv=>Array.from({length:nv},()=>F(rich(-4,5)));
function genSysOnce(m,nv,want){
  const r=want==='one'?nv:want==='inf'?Math.min(m,nv-1):Math.min(m-1,nv);
  if(r<1||r>m)return null;
  // L·U z ±1 na przekątnej, więc det = ±1
  if(want==='one'&&m===nv&&nv>=3&&Math.random()<.75){
    const n=nv,small=()=>Math.random()<.35?0:rnd(-2,2);
    const Lm=M.make(n,n,(i,j)=>F(i===j?1:i>j?small():0)),Um=M.make(n,n,(i,j)=>F(i===j?pick([1,1,-1]):i<j?small():0));
    const A=M.mul(Lm,Um);if(A.flat().some(x=>Math.abs(x.n)>8))return null;
    const x0=Array.from({length:n},()=>F(rich(-3,4))),Ab=A.map(row=>[...row,row.reduce((s,a,j)=>s.add(a.mul(x0[j])),F(0))]);
    if(Ab.some(row=>Math.abs(row[n].n)>30))return null;
    for(let i=Ab.length-1;i>0;i--){const j=rnd(0,i);[Ab[i],Ab[j]]=[Ab[j],Ab[i]]}
    return Ab;
  }
  let base=null;
  for(let t=0;t<50&&!base;t++){const B=Array.from({length:r},()=>randRow(nv));if(rref(B.map(x=>[...x,F(0)]),nv).rank===r)base=B}
  if(!base)return null;
  const rows=base.slice();
  while(rows.length<m){
    let row=null;
    for(let t=0;t<40&&!row;t++){
      const k=base.map(()=>rnd(-2,2));if(k.filter(x=>x).length<Math.min(2,r))continue;
      const cand=base[0].map((_,j)=>base.reduce((s,bb,i)=>s.add(bb[j].mul(F(k[i]))),F(0)));
      if(cand.every(x=>Math.abs(x.n)<=9)&&cand.some(x=>!x.z))row=cand;
    }
    if(!row)return null;rows.push(row);
  }
  const x0=Array.from({length:nv},()=>F(rich(-4,5)));
  const Ab=rows.map(row=>[...row,row.reduce((s,a,j)=>s.add(a.mul(x0[j])),F(0))]);
  if(want==='none')Ab[m-1][nv]=Ab[m-1][nv].add(F(pick([-3,-2,-1,1,2,3])));
  if(Ab.some(r=>Math.abs(r[nv].n)>40))return null;
  for(let i=Ab.length-1;i>0;i--){const j=rnd(0,i);[Ab[i],Ab[j]]=[Ab[j],Ab[i]]}
  return Ab;
}
function genSys(sz,mode){
  const [m,nv]=sz==='r'?pick(mode==='one'?[[3,2],[4,3],[4,2]]:[[2,3],[3,2],[3,4],[2,4],[4,3]]):[sz,sz];
  let want=mode==='one'?'one':pick(['one','one','inf','none']);
  if(m<nv&&want==='one')want='inf';
  let best=null,ok=0;
  for(let at=0;at<900&&ok<50;at++){
    const Ab=genSysOnce(m,nv,want);if(!Ab)continue;
    const res=rref(Ab,nv);if(res.type!==want)continue;ok++;
    const plan=elimPlan(Ab,nv,{sys:true}),ev=plan.ev.filter(e=>e.k!=='pivot'&&e.k!=='none'&&e.k!=='swap'&&!(e.k==='scale'&&e.why==='reduce'));
    const target={2:2,3:5,4:9}[nv]||5,zeros=Ab.flat().filter((x,q)=>q%(nv+1)<nv&&x.z).length,okZeros={2:0,3:1,4:3}[nv]||2;
    const sc=planFrac(plan)*3+Math.max(0,planMax(plan)-12)*1.5+ev.filter(e=>e.k==='elim'&&!e.a.one).length*3+Math.abs(ev.length-target)*1.2+Math.max(0,zeros-okZeros)*2;
    if(!best||sc<best.sc)best={Ab,sc};
  }
  return {Ab:best.Ab,names:stdNames(nv)};
}

function parseLinSide(s,k){
  s=s.replace(/[\s*·]/g,'').toLowerCase();
  if(!s)throw new Error($t(`Równanie ${k+1}: jedna strona „=” jest pusta.`,`Equation ${k+1}: one side of “=” is empty.`));
  const re=/([+-]?)(\d+(?:\.\d+)?(?:\/\d+)?)?([a-z]\d*)?/y,v={};let c=F(0),i=0;
  while(i<s.length){
    re.lastIndex=i;const m=re.exec(s);
    if(!m||(!m[2]&&!m[3])||(i>0&&!m[1]))throw new Error($t(`Równanie ${k+1}: nie da się odczytać fragmentu „${s.slice(i)}”. Przykład zapisu: 2x - 3y + z = 4.`,`Equation ${k+1}: “${s.slice(i)}” cannot be read. An example of the expected form: 2x - 3y + z = 4.`));
    const num=m[2]?parseFr(m[2]):F(1);if(!num)throw new Error($t(`Równanie ${k+1}: zła liczba „${m[2]}”.`,`Equation ${k+1}: invalid number “${m[2]}”.`));
    const val=m[1]==='-'?num.neg():num;
    if(m[3])v[m[3]]=(v[m[3]]||F(0)).add(val);else c=c.add(val);
    i=re.lastIndex;
  }
  return {v,c};
}
function parseSystem(text){
  text=text.replace(/[−–]/g,'-').replace(/[₀-₉]/g,ch=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(ch)).replace(/_/g,'').replace(/(\d),(\d)/g,'$1.$2');
  const lines=text.split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length)throw new Error($t('Wpisz co najmniej jedno równanie, np. 2x + y = 5.','Type at least one equation, e.g. 2x + y = 5.'));
  if(lines.length>6)throw new Error($t('Za dużo równań: obsługiwanych jest najwyżej 6.','Too many equations: at most 6 are supported.'));
  const eqs=lines.map((ln,k)=>{
    const sd=ln.split('=');
    if(sd.length!==2)throw new Error($t(`Równanie ${k+1}: potrzebny dokładnie jeden znak „=”.`,`Equation ${k+1}: exactly one “=” sign is needed.`));
    const L=parseLinSide(sd[0],k),R=parseLinSide(sd[1],k),v={...L.v};
    for(const [n,c] of Object.entries(R.v))v[n]=(v[n]||F(0)).sub(c);
    return {v,k:R.c.sub(L.c)};
  });
  const set=new Set();eqs.forEach(e=>Object.keys(e.v).forEach(n=>set.add(n)));
  if(!set.size)throw new Error($t('Brak niewiadomych (np. x, y, z).','No unknowns found (e.g. x, y, z).'));
  if(set.size>6)throw new Error($t('Za dużo niewiadomych: obsługiwanych jest najwyżej 6.','Too many unknowns: at most 6 are supported.'));
  const key=n=>{const m=n.match(/^([a-z])(\d*)$/);return [ORD.indexOf(m[1]),m[2]?+m[2]:-1]};
  const names=[...set].sort((a,b)=>{const p=key(a),q=key(b);return p[0]-q[0]||p[1]-q[1]});
  return {Ab:eqs.map(e=>[...names.map(n=>e.v[n]||F(0)),e.k]),names};
}

function evalAst(e,env){let acc=null;for(const t of e.terms){let v=S(F(t.sign).mul(t.c));for(const a of t.atoms)v=vMul(v,evalAtom(a,env));acc=acc?vAdd(acc,v):v}return acc}
function evalAtom(a,env){
  let v;
  if(a.type==='var'){v=a.n==='I'?S(F(1)):env[a.n];if(!v)throw new Error($t(`Brakuje macierzy ${a.n}.`,`Matrix ${a.n} is missing.`))}
  else v=evalAst(a.expr,env);
  for(const op of a.post){if(op.k==='T')v=vT(v);else if(op.k==='INV')v=vInv(v,rAtom({...a,post:[]}));else{let r=v;for(let q=1;q<op.v;q++)r=vMul(r,v);v=r}}
  return v;
}
const zeros=(r,c)=>M.make(r,c,()=>F(0));
const unitM=(r,c,k)=>M.make(r,c,(i,j)=>F(i*c+j===k?1:0));
function linCheck(e){let any=false;for(const t of e.terms){let k=0;for(const a of t.atoms)k+=atomX(a);if(k>1)throw new Error($t('X występuje dwa razy w jednym iloczynie. Równanie nie jest liniowe względem X, więc nie da się go rozwiązać układem równań liniowych.','X appears twice in one product. The equation is not linear in X, so it cannot be solved as a system of linear equations.'));if(k)any=true}return any}
function atomX(a){const h=a.type==='var'?(a.n==='X'?1:0):(linCheck(a.expr)?1:0);if(h&&a.post.some(o=>o.k!=='T'))throw new Error($t('X jest odwrócone albo w potędze. Równanie nie jest liniowe względem X, więc nie da się go rozwiązać układem równań liniowych.','X is inverted or raised to a power. The equation is not linear in X, so it cannot be solved as a system of linear equations.'));return h}
function xDims(ast,env){
  const out=[];
  for(let r=1;r<=4;r++)for(let c=1;c<=4;c++){
    const e={...env,X:zeros(r,c)};
    try{const d=vAdd(evalAst(ast.L,e),vScale(F(-1),evalAst(ast.R,e)));if(!isS(d))out.push([r,c])}
    catch(er){if(!(er instanceof DimErr))throw er}
  }
  return out;
}
function linSolve(src,env){
  const ast=parseEq(src),hl=linCheck(ast.L),hr=linCheck(ast.R);
  if(!hl&&!hr)throw new Error($t('W równaniu nie ma niewiadomej X.','There is no unknown X in the equation.'));
  let ds;
  try{ds=xDims(ast,env)}catch(e){if(e.message==='singular')throw new Error($t(`Macierz ${e.what} nie jest odwracalna, a równanie jej odwrotności wymaga.`,`The matrix ${e.what} is not invertible, but the equation needs its inverse.`));throw e}
  if(!ds.length)throw new Error($t('Wymiary macierzy nie pasują do siebie: nie ma takiego wymiaru X, przy którym wszystkie działania w równaniu mają sens.','The matrix sizes do not fit together: there is no size of X for which every operation in the equation makes sense.'));
  let [r,c]=ds[0];
  if(ds.length>1){const sq=Object.values(env).find(v=>Array.isArray(v)&&v.length===v[0].length),n=sq?sq.length:2,f=ds.find(d=>d[0]===n&&d[1]===n)||ds.find(d=>d[0]===d[1]);if(f)[r,c]=f}
  const nu=r*c;if(nu>9)throw new Error($t(`X miałaby wymiar ${r}×${c}, czyli ${nu} niewiadomych. To za dużo do liczenia ręcznego (obsługiwanych jest najwyżej 9).`,`X would be ${r}×${c}, i.e. ${nu} unknowns. That is too many to compute by hand (at most 9 are supported).`));
  const names=matNames(r,c),Z=zeros(r,c),raw=(e,X)=>evalAst(e,{...env,X});
  const l0=raw(ast.L,Z),ref=isS(l0)?raw(ast.R,Z):l0,p=ref.length,q=ref[0].length;
  const val=(e,X)=>{const v=raw(e,X);return isS(v)?M.scale(v.sc,M.I(p)):v};
  const lfm=e=>{const v0=val(e,Z),vs=names.map((_,k)=>val(e,unitM(r,c,k)));return M.make(p,q,(i,j)=>({c:vs.map(v=>v[i][j].sub(v0[i][j])),k:v0[i][j]}))};
  const lfmH=G=>matH(G.map(row=>row.map(f=>lfHtml(f,names,false))));
  const LF=lfm(ast.L),RF=lfm(ast.R),orig=rExpr(ast.L)+' = '+rExpr(ast.R);
  const d={names,r,c,orig,lL:rExpr(ast.L),lR:rExpr(ast.R),LH:LF.map(row=>row.map(f=>lfHtml(f,names,false))),RH:RF.map(row=>row.map(f=>lfHtml(f,names,false))),given:Object.keys(env).filter(k=>k!=='X'&&!k.startsWith('__')).sort().map(k=>[k,env[k]])};
  const rows=[];
  d.rows=rows;
  for(let i=0;i<p;i++)for(let j=0;j<q;j++){const a=LF[i][j],b=RF[i][j],row={c:a.c.map((x,k)=>x.sub(b.c[k])),k:b.k.sub(a.k)};if(row.c.some(x=>!x.z)||!row.k.z)rows.push(row)}
  let h=$t(`<h3>1. Niewiadoma macierz</h3><p>Do działań w równaniu pasuje tylko wymiar ${r}×${c}. Zapisujemy <i>X</i> przez ${nu} ${pl(nu,'niewiadomą','niewiadome','niewiadomych')}:</p><div class="line"><i>X</i> = ${matH(M.make(r,c,(i,j)=>nmHtml(names[i*c+j])))}</div>`,`<h3>1. The unknown matrix</h3><p>Only the size ${r}×${c} fits the operations in the equation. We write <i>X</i> with ${nu} ${nu===1?'unknown':'unknowns'}:</p><div class="line"><i>X</i> = ${matH(M.make(r,c,(i,j)=>nmHtml(names[i*c+j])))}</div>`);
  h+=$t(`<h3>2. Wymnażamy obie strony</h3>`,`<h3>2. Multiplying out both sides</h3>`);
  const trivial=t=>t.atoms.length===1&&t.atoms[0].type==='var'&&!t.atoms[0].post.length&&t.c.one;
  for(const [side,G] of [[ast.L,LF],[ast.R,RF]]){
    if(side.terms.length>1)for(const t of side.terms){if(trivial(t))continue;const tt={terms:[{...t,sign:1}]};h+=`<div class="line">${rExpr(tt)} = ${lfmH(lfm(tt))}</div>`}
    h+=`<div class="line">${rExpr(side)} = ${lfmH(G)}</div>`;
  }
  h+=$t(`<h3>3. Porównujemy elementy</h3>`,`<h3>3. Comparing entries</h3>`);
  if(!rows.length)return {html:h+$t(`<p>Po porównaniu zostaje samo 0 = 0, więc <b>każda</b> macierz ${r}×${c} spełnia to równanie.</p>`,`<p>After comparing, only 0 = 0 is left, so <b>every</b> ${r}×${c} matrix satisfies the equation.</p>`),type:'inf',X:null,fr:0,orig,d};
  h+=$t(`<p>Macierze są równe, gdy mają równe elementy na tych samych miejscach. Wychodzi układ ${rows.length} ${pl(rows.length,'równania','równań','równań')} z ${nu===1?'jedną niewiadomą':nu+' niewiadomymi'}:</p><div class="sysbox">${sysHtml(rows,names)}</div>`,`<p>Two matrices are equal when their entries in the same positions are equal. This gives a system of ${rows.length} ${rows.length===1?'equation':'equations'} in ${nu} ${nu===1?'unknown':'unknowns'}:</p><div class="sysbox">${sysHtml(rows,names)}</div>`);
  const Ab=rows.map(o=>[...o.c,o.k]),G=gaussSys(Ab,names);d.Ab=Ab;
  h+=$t(`<h3>4. Rozwiązujemy układ metodą Gaussa</h3>`,`<h3>4. Solving the system by Gaussian elimination</h3>`)+G.html+$t(`<h3>5. Wynik</h3>`,`<h3>5. Result</h3>`);
  let X=null;
  if(G.res.type==='none')h+=$t(`<div class="line res">Układ jest sprzeczny, więc nie istnieje macierz <i>X</i> spełniająca to równanie.</div>`,`<div class="line res">The system is inconsistent, so no matrix <i>X</i> satisfies the equation.</div>`);
  else if(G.res.type==='one'){
    X=M.make(r,c,(i,j)=>G.sol.forms[i*c+j].k);d.chk=[val(ast.L,X),val(ast.R,X)];
    h+=$t(`<div class="line res"><i>X</i> = ${M.html(X)}</div><h3>Sprawdzenie</h3><p class="mute">Podstawiamy <i>X</i> do równania ${orig}:</p><div class="nums"><span class="gv">lewa = ${M.html(val(ast.L,X))}</span><span class="gv">prawa = ${M.html(val(ast.R,X))}</span></div><p class="mute">Obie strony są równe.</p>`,`<div class="line res"><i>X</i> = ${M.html(X)}</div><h3>Check</h3><p class="mute">Substitute <i>X</i> into the equation ${orig}:</p><div class="nums"><span class="gv">left = ${M.html(val(ast.L,X))}</span><span class="gv">right = ${M.html(val(ast.R,X))}</span></div><p class="mute">Both sides are equal.</p>`);
  }else{d.gen=`<i>X</i> = ${matH(M.make(r,c,(i,j)=>lfHtml(G.sol.forms[i*c+j],names,true)))}, &nbsp; ${G.sol.free.map(j=>nmHtml(names[j])).join(', ')} ∈ ℝ`;h+=$t(`<div class="line res">${d.gen}</div><p class="mute">Nieskończenie wiele macierzy: każdy wybór ${G.sol.free.length===1?'liczby':'liczb'} ${G.sol.free.map(j=>nmHtml(names[j])).join(', ')} daje inne <i>X</i>.</p>`,`<div class="line res">${d.gen}</div><p class="mute">Infinitely many matrices: every choice of ${G.sol.free.map(j=>nmHtml(names[j])).join(', ')} gives a different <i>X</i>.</p>`);}
  return {html:h,type:G.res.type,X,fr:planFrac(G.plan),orig,d};
}
const PH='<span class="ph">?</span>';
const hM=X=>X.map(r=>r.map(x=>typeof x==='string'?x:x.html()));
const bd=(X,o={})=>({M:hM(X),bar:o.bar===undefined?-1:o.bar,lab:o.lab||'',hl:o.hl||{},det:!!o.det,dimCols:o.dimCols||[]});
const rw=i=>`${$t('w','R')}<sub>${i+1}</sub>`;
function gaussFrames(Ab0,nv,o){
  const inv=o.mode==='inv',rk=o.mode==='rank',sec=o.sec||$t('Metoda Gaussa','Gaussian elimination'),fr=[],w=Ab0[0].length,m=Ab0.length;
  const plan=elimPlan(Ab0,nv,{down:o.down,norm:!rk,stop:inv,sys:!inv&&!rk});
  const tip=$t(' Gdzie się da, liczymy bez ułamków: jedynkę robimy kombinacją wierszy, a dzielimy dopiero na końcu.',' Where possible we avoid fractions: a 1 is made by combining rows, and we divide only at the end.');
  fr.push({sec,t:rk?$t(`Sprowadzamy ${o.lab} do postaci schodkowej`,`Reducing ${o.lab} to row echelon form`):inv?$t(`Zapisujemy [${o.lab} | <i>I</i>]`,`Writing [${o.lab} | <i>I</i>]`):$t('Zapisujemy macierz rozszerzoną [<i>A</i> | <i>B</i>]','Writing the augmented matrix [<i>A</i> | <i>B</i>]'),
    x:(rk?$t(`Rząd to liczba niezerowych wierszy w postaci schodkowej. Stosujemy eliminację Gaussa: w każdej kolumnie element główny i zera <b>pod</b> nim. Operacje na wierszach nie zmieniają rzędu.`,`The rank is the number of nonzero rows in row echelon form. We use Gaussian elimination: in each column a pivot and zeros <b>below</b> it. Row operations do not change the rank.`):inv?$t(`Obok ${o.lab} dopisujemy macierz jednostkową <i>I</i>. Operacje wykonujemy na <b>całych wierszach</b>, po obu stronach kreski, aż po lewej powstanie <i>I</i>. Wtedy po prawej stoi odwrotność.`,`Next to ${o.lab} we write the identity matrix <i>I</i>. Operations act on <b>whole rows</b>, on both sides of the bar, until <i>I</i> appears on the left. Then the inverse stands on the right.`)
      :$t(`Każdy wiersz to jedno równanie: przed kreską współczynniki przy ${o.names.map(nmHtml).join(', ')}, za kreską wyraz wolny. Cel: przed kreską schodki, a nad nimi i pod nimi zera.`,`Each row is one equation: before the bar the coefficients of ${o.names.map(nmHtml).join(', ')}, after the bar the constant. Goal: steps before the bar, with zeros above and below them.`))+(rk||!OPT.noFrac?'':tip),
    B:[bd(Ab0,{bar:nv})]});
  const calc=(e,q)=>{const o_=e.B[e.i][q],n_=`<b>${e.A[e.i][q].html()}</b>`;
    if(e.k==='scale'||e.k==='norm')return e.c.d!==1?`${fmt(o_)} : ${fmt(F(1).div(e.c))} = ${n_}`:`${fmt(o_)} · ${fmt(e.c)} = ${n_}`;
    if(e.k==='comb'){const a=e.c.abs();return `${fmt(o_)} ${e.c.n>0?'+':'−'} ${a.one?'':fmt(a)+'·'}${fmt(e.B[e.from][q])} = ${n_}`}
    const b=e.b.abs();return `${e.a.one?'':fmt(e.a)+'·'}${fmt(o_)} ${e.b.n>0?'−':'+'} ${b.one?'':fmt(b)+'·'}${fmt(e.B[e.r][q])} = ${n_}`;
  };
  const rowOp=(e,t,x,hl)=>{const C=[],U=[];for(let q=0;q<w;q++){C.push(calc(e,q));U.push({t:.7+q*.6,b:0,i:e.i,j:q,v:e.A[e.i][q].html(),line:q})}fr.push({sec,t,x,B:[bd(e.B,{bar:nv,hl})],C,U})};
  let normed=false;
  for(const e of plan.ev){
    const op=opLabel(e),colHl={};if(e.j>=0)for(let i=(e.row??0);i<m;i++)colHl[i+','+e.j]='col';
    if(e.k==='none'){
      if(inv){fr.push({sec,t:$t(`Kolumna ${e.j+1}: same zera`,`Column ${e.j+1}: all zeros`),x:$t(`Od wiersza ${e.row+1} w dół w kolumnie ${e.j+1} są same zera, więc nie da się tu zrobić schodka. Macierz <b>nie jest odwracalna</b> (jej wyznacznik to 0).`,`From row ${e.row+1} down, column ${e.j+1} has only zeros, so no step can be made here. The matrix is <b>not invertible</b> (its determinant is 0).`),B:[bd(e.B,{bar:nv,hl:{cells:colHl}})]});return {frames:fr,ok:false,A:plan.A}}
      fr.push({sec,t:$t(`Kolumna ${e.j+1}: same zera`,`Column ${e.j+1}: all zeros`),x:$t(`Od wiersza ${e.row+1} w dół w kolumnie ${e.j+1} są same zera, więc tu nie będzie schodka.${rk?'':` Niewiadoma ${nmHtml(o.names[e.j])} zostanie <b>parametrem</b> (dowolną liczbą).`} Idę do następnej kolumny.`,`From row ${e.row+1} down, column ${e.j+1} has only zeros, so there will be no step here.${rk?'':` The unknown ${nmHtml(o.names[e.j])} becomes a <b>parameter</b> (any number).`} On to the next column.`),B:[bd(e.B,{bar:nv,hl:{cells:colHl}})]});
    }else if(e.k==='pivot'){
      const p=e.B[e.i][e.j];
      fr.push({sec,t:$t(`Kolumna ${e.j+1}: element główny`,`Column ${e.j+1}: the pivot`),
        x:p.abs().one?$t(`W kolumnie ${e.j+1}, od wiersza ${e.row+1} w dół, bierzemy <b>${p.html()}</b> z wiersza ${e.i+1}${e.made?' (tę jedynkę zrobiliśmy przed chwilą)':''}. Z jedynką zerowanie idzie bez ułamków.`,`In column ${e.j+1}, from row ${e.row+1} down, we take <b>${p.html()}</b> from row ${e.i+1}${e.made?' (the 1 we have just made)':''}. With a 1, making zeros needs no fractions.`)
          :!OPT.noFrac?$t(`W kolumnie ${e.j+1}, od wiersza ${e.row+1} w dół, szukamy liczby różnej od 0, najlepiej 1 albo −1, bo wtedy nie wyjdą ułamki. Bierzemy <b>${p.html()}</b> z wiersza ${e.i+1}.`,`In column ${e.j+1}, from row ${e.row+1} down, we look for a nonzero number, ideally 1 or −1, so that no fractions appear. We take <b>${p.html()}</b> from row ${e.i+1}.`)
          :$t(`W kolumnie ${e.j+1} nie ma 1 ani −1 i nie da się jej zrobić prostą kombinacją wierszy. Bierzemy <b>${p.html()}</b> z wiersza ${e.i+1}. Żeby nie dzielić, pozostałe wiersze najpierw mnożymy.`,`Column ${e.j+1} has no 1 or −1 and one cannot be made by a simple combination of rows. We take <b>${p.html()}</b> from row ${e.i+1}. To avoid dividing, the other rows are multiplied first.`),
        B:[bd(e.B,{bar:nv,hl:{cells:{...colHl,[e.i+','+e.j]:'piv'}}})]});
    }else if(e.k==='swap'){
      const U=[{t:.4,swap:[0,e.i,e.i2]}];
      for(let q=0;q<w;q++)U.push({t:1.8,b:0,i:e.i,j:q,v:e.A[e.i][q].html()},{t:1.8,b:0,i:e.i2,j:q,v:e.A[e.i2][q].html()});
      fr.push({sec,t:$t(`Zamiana wierszy ${op}`,`Swapping rows ${op}`),x:$t(`Element główny ma stać w wierszu ${e.i+1}, więc zamieniamy miejscami całe wiersze ${e.i+1} i ${e.i2+1}.${inv||rk?'':' To tylko zmiana kolejności równań, rozwiązania się nie zmieniają.'}`,`The pivot should be in row ${e.i+1}, so we swap the whole rows ${e.i+1} and ${e.i2+1}.${inv||rk?'':' This only changes the order of the equations; the solutions stay the same.'}`),B:[bd(e.B,{bar:nv,hl:{rows:{[e.i]:'dst',[e.i2]:'dst'}}})],U});
    }else if(e.k==='comb'){
      const c=e.c.abs(),v=e.A[e.i][e.j];
      rowOp(e,$t(`Kolumna ${e.j+1}: jedynka z kombinacji wierszy, ${op}`,`Column ${e.j+1}: a 1 from a combination of rows, ${op}`),
        $t(`W kolumnie ${e.j+1} nie ma 1 ani −1. Zamiast dzielić (wyszłyby ułamki), ${e.c.n>0?'do wiersza '+(e.i+1)+' dodajemy':'od wiersza '+(e.i+1)+' odejmujemy'} wiersz ${e.from+1}${c.one?'':` pomnożony przez ${c.html()}`}; w tym miejscu wyjdzie ${v.html()}:`,`Column ${e.j+1} has no 1 or −1. Instead of dividing (which would give fractions), we ${e.c.n>0?'add':'subtract'} row ${e.from+1}${c.one?'':` multiplied by ${c.html()}`} ${e.c.n>0?'to':'from'} row ${e.i+1}; this position becomes ${v.html()}:`),
        {rows:{[e.from]:'src',[e.i]:'dst'},cells:{[e.i+','+e.j]:'tgt'}});
    }else if(e.k==='scale'){
      const hl={rows:{[e.i]:'dst'}};
      if(e.why==='clear')rowOp(e,$t(`Usuwamy ułamki: ${op}`,`Clearing fractions: ${op}`),$t(`W wierszu ${e.i+1} są ułamki. Mnożymy cały wiersz przez ${e.c.html()}, żeby liczyć na liczbach całkowitych:`,`Row ${e.i+1} contains fractions. We multiply the whole row by ${e.c.html()} to work with whole numbers:`),hl);
      else if(e.why==='reduce'){const g=F(1).div(e.c).html();rowOp(e,$t(`Skracamy: ${op}`,`Simplifying: ${op}`),$t(`Wszystkie liczby w wierszu ${e.i+1} dzielą się przez ${g}, więc dzielimy cały wiersz, żeby liczby były mniejsze:`,`All numbers in row ${e.i+1} are divisible by ${g}, so we divide the whole row to keep the numbers small:`),hl)}
      else if(e.why==='sign')rowOp(e,$t(`Zmiana znaku: ${op}`,`Changing the sign: ${op}`),$t(`Element główny to −1. Mnożymy cały wiersz ${e.i+1} przez −1 i dostajemy 1:`,`The pivot is −1. We multiply the whole row ${e.i+1} by −1 to get 1:`),{rows:{[e.i]:'dst'},cells:{[e.i+','+e.j]:'piv'}});
      else if(e.why==='divf'){const p=F(1).div(e.c).html();rowOp(e,$t(`Dzielenie: ${op}`,`Dividing: ${op}`),$t(`Na miejscu elementu głównego potrzebna jest 1, więc <b>cały</b> wiersz ${e.i+1}, po obu stronach kreski, dzielimy przez ${p}:`,`The pivot position needs a 1, so we divide the <b>whole</b> row ${e.i+1}, on both sides of the bar, by ${p}:`),{rows:{[e.i]:'dst'},cells:{[e.i+','+e.j]:'piv'}})}
      else{const p=F(1).div(e.c).html();rowOp(e,$t(`Dzielenie: ${op}`,`Dividing: ${op}`),$t(`Cały wiersz ${e.i+1} dzieli się przez ${p} bez reszty, więc dzielimy: na elemencie głównym będzie 1, a ułamki nie wyjdą:`,`The whole row ${e.i+1} is divisible by ${p}, so we divide: the pivot becomes 1 and no fractions appear:`),{rows:{[e.i]:'dst'},cells:{[e.i+','+e.j]:'piv'}})}
    }else if(e.k==='elim'){
      const p=e.B[e.r][e.j],k=e.B[e.i][e.j],b=e.b.abs(),pos=e.i<e.r?$t('Nad','Above'):$t('Pod','Below'),pv=p.one?$t('jedynką','the 1'):$t(`elementem głównym ${p.html()}`,`the pivot ${p.html()}`);
      const x=e.a.one?$t(`${pos} ${pv}, w wierszu ${e.i+1}, stoi ${k.html()}. ${e.b.n>0?`Od wiersza ${e.i+1} odejmujemy wiersz ${e.r+1}${b.one?'':` pomnożony przez ${b.html()}`}`:`Do wiersza ${e.i+1} dodajemy wiersz ${e.r+1}${b.one?'':` pomnożony przez ${b.html()}`}`}; wtedy w tym miejscu wyjdzie 0. Liczymy element po elemencie:`,`${pos} ${pv}, in row ${e.i+1}, there is ${k.html()}. ${e.b.n>0?`We subtract row ${e.r+1}${b.one?'':` multiplied by ${b.html()}`} from row ${e.i+1}`:`We add row ${e.r+1}${b.one?'':` multiplied by ${b.html()}`} to row ${e.i+1}`}; then this position becomes 0. Entry by entry:`)
        :$t(`${pos} ${pv}, w wierszu ${e.i+1}, stoi ${k.html()}. Żeby nie dzielić, mnożymy wiersz ${e.i+1} przez ${e.a.html()} i ${e.b.n>0?'odejmujemy':'dodajemy'} wiersz ${e.r+1}${b.one?'':` pomnożony przez ${b.html()}`}: ${e.a.html()}·${fmt(k)} ${e.b.n>0?'−':'+'} ${b.one?'':b.html()+'·'}${fmt(p)} = 0. Liczymy element po elemencie:`,`${pos} ${pv}, in row ${e.i+1}, there is ${k.html()}. To avoid dividing, we multiply row ${e.i+1} by ${e.a.html()} and ${e.b.n>0?'subtract':'add'} row ${e.r+1}${b.one?'':` multiplied by ${b.html()}`}: ${e.a.html()}·${fmt(k)} ${e.b.n>0?'−':'+'} ${b.one?'':b.html()+'·'}${fmt(p)} = 0. Entry by entry:`);
      rowOp(e,$t(`Zerowanie: ${op}`,`Making a zero: ${op}`),x,{rows:{[e.r]:'src',[e.i]:'dst'},cells:{[e.i+','+e.j]:'tgt',[e.r+','+e.j]:'piv'}});
    }else if(e.k==='norm'){
      const p=e.B[e.i][e.j],frac=e.A[e.i].some(x=>x.d!==1);
      rowOp(e,$t(`Na koniec: ${op}`,`Finally: ${op}`),(normed?'':normNote()+' ')+$t(`Dzielimy wiersz ${e.i+1} przez ${p.html()}, żeby na schodku była 1.${frac?' Tu wychodzą ułamki, bo wynik jest ułamkowy.':''}`,`We divide row ${e.i+1} by ${p.html()} to get a 1 on the step.${frac?' Fractions appear here because the result is fractional.':''}`),{rows:{[e.i]:'dst'},cells:{[e.i+','+e.j]:'piv'}});
      normed=true;
    }
  }
  return {frames:fr,A:plan.A,ok:plan.ok};
}
function invFrames(A0,lab,resLab,sec){
  const n=A0.length,I=M.I(n),g=gaussFrames(A0.map((r,i)=>[...r,...I[i]]),n,{mode:'inv',lab,sec});
  if(!g.ok)return {frames:g.frames,inv:null};
  const R=g.A.map(r=>r.slice(n)),hl={};for(let i=0;i<n;i++)for(let j=n;j<2*n;j++)hl[i+','+j]='res';
  g.frames.push({sec,t:$t(`Po lewej jest <i>I</i>, po prawej ${resLab}`,`<i>I</i> on the left, ${resLab} on the right`),x:$t(`Przed kreską stoi macierz jednostkowa, więc za kreską jest szukana odwrotność. Kontrola: ${lab}·${resLab} musi dać <i>I</i>.`,`The identity matrix stands before the bar, so the inverse is after the bar. Check: ${lab}·${resLab} must give <i>I</i>.`),B:[bd(g.A,{bar:n,hl:{cells:hl}}),bd(R,{lab:resLab})],J:['→']});
  return {frames:g.frames,inv:R};
}
function mulFrames(A,Bm,lab,sec=$t('Mnożenie','Multiplication')){
  const m=A.length,n=Bm.length,p=Bm[0].length,R=M.mul(A,Bm),fr=[],Cs=M.make(m,p,()=>PH);
  const bds=(a,b,c)=>[bd(A,{lab:lab.a,hl:a}),bd(Bm,{lab:lab.b,hl:b}),bd(Cs,{lab:lab.c,hl:c})];
  fr.push({sec,t:$t(`Iloczyn ${lab.a} · ${lab.b}`,`Multiplying ${lab.a} · ${lab.b}`),x:$t(`Wymiary: (${m}×<b>${n}</b>)·(<b>${n}</b>×${p}). Środkowe liczby się zgadzają, więc wynik ma wymiar ${m}×${p}. Każdy element wyniku to <b>wiersz</b> pierwszej macierzy razy <b>kolumna</b> drugiej: mnożymy liczby parami i dodajemy.`,`Sizes: (${m}×<b>${n}</b>)·(<b>${n}</b>×${p}). The middle numbers match, so the result is ${m}×${p}. Each entry of the result is a <b>row</b> of the first matrix times a <b>column</b> of the second: multiply the numbers in pairs and add.`),B:bds(),J:['·','=']});
  for(let i=0;i<m;i++)for(let j=0;j<p;j++){
    const U=[],C=[];let sum=F(0);
    for(let k=0;k<n;k++){const pr=A[i][k].mul(Bm[k][j]),t=.5+k*.9;sum=sum.add(pr);C.push(`${fmt(A[i][k])} · ${fmt(Bm[k][j])} = ${pr.html()}`);U.push({t,b:0,i,j:k,add:'pair'},{t,b:1,i:k,j,add:'pair'},{t,line:k})}
    const tS=.5+n*.9;
    C.push({h:`${A[i].map((_,k)=>fmt(A[i][k].mul(Bm[k][j]))).join(' + ')} = <b>${sum.html()}</b>`,full:true});
    U.push({t:tS,line:n},{t:tS+.3,b:2,i,j,v:sum.html()});
    fr.push({sec,t:$t(`Element: wiersz ${i+1} · kolumna ${j+1}`,`Entry: row ${i+1} · column ${j+1}`),x:$t(`Bierzemy <b>wiersz ${i+1}</b> macierzy ${lab.a} i <b>kolumnę ${j+1}</b> macierzy ${lab.b}. Mnożymy pierwszą liczbę przez pierwszą, drugą przez drugą i tak dalej, a potem wszystko dodajemy.`,`Take <b>row ${i+1}</b> of ${lab.a} and <b>column ${j+1}</b> of ${lab.b}. Multiply the first number by the first, the second by the second and so on, then add everything up.`),B:bds({rows:{[i]:'src'}},{cols:{[j]:'src'}},{cells:{[i+','+j]:'tgt'}}),J:['·','='],C,U});
    Cs[i][j]=sum.html();
  }
  fr.push({sec,t:$t('Iloczyn gotowy','Product ready'),x:$t(`Wszystkie ${m*p} ${pl(m*p,'element','elementy','elementów')} policzone.`,`All ${m*p} ${m*p===1?'entry':'entries'} computed.`),B:bds(null,null,{cells:Object.fromEntries(R.flatMap((r,i)=>r.map((_,j)=>[i+','+j,'res'])))}),J:['·','=']});
  return {frames:fr,R};
}
function transFrames(A,la,lt,sec=$t('Transpozycja','Transpose')){
  const r=A.length,c=A[0].length,T=M.make(c,r,()=>PH),fr=[];
  fr.push({sec,t:$t(`Transpozycja ${la}`,`Transposing ${la}`),x:$t(`Wiersze stają się kolumnami: wymiar ${r}×${c} → ${c}×${r}. Pierwszy wiersz staje się pierwszą kolumną, drugi drugą i tak dalej.`,`Rows become columns: size ${r}×${c} → ${c}×${r}. The first row becomes the first column, the second row the second column, and so on.`),B:[bd(A,{lab:la}),bd(T,{lab:lt})],J:['→']});
  for(let i=0;i<r;i++){
    const U=[];A[i].forEach((x,j)=>{const t=.5+j*.55;U.push({t,b:0,i,j,add:'pair'},{t:t+.1,b:1,i:j,j:i,v:x.html()})});
    fr.push({sec,t:$t(`Wiersz ${i+1} → kolumna ${i+1}`,`Row ${i+1} → column ${i+1}`),x:$t(`Wiersz ${i+1} przepisujemy jako kolumnę ${i+1}: pierwsza liczba idzie na górę, kolejne pod nią.`,`Row ${i+1} is copied as column ${i+1}: the first number goes to the top, the rest below it.`),B:[bd(A,{lab:la,hl:{rows:{[i]:'src'}}}),bd(T,{lab:lt,hl:{cols:{[i]:'dst'}}})],J:['→'],U});
    A[i].forEach((x,j)=>{T[j][i]=x.html()});
  }
  return fr;
}
function scaleFrames(k,A,la,lr,sec=$t('Mnożenie przez liczbę','Multiplying by a number')){
  const R=M.scale(k,A),n=A.length*A[0].length,dt=n>9?.4:.55,U=[],C=[];let t=.5,q=0;
  A.forEach((r,i)=>r.forEach((x,j)=>{U.push({t,b:0,i,j,add:'pair'},{t,line:q},{t:t+.1,b:1,i,j,v:R[i][j].html()},{t:t+dt-.05,b:0,clear:true});C.push(`${fmt(k)}·${fmt(x)} = ${R[i][j].html()}`);t+=dt;q++}));
  return [{sec,t:$t(`${la} razy ${k.html()}`,`Multiplying ${la} by ${k.html()}`),x:$t(`Mnożenie macierzy przez liczbę: <b>każdy</b> element mnożymy przez ${k.html()}.`,`Multiplying a matrix by a number: <b>every</b> entry is multiplied by ${k.html()}.`),B:[bd(A,{lab:la}),bd(A.map(r=>r.map(()=>PH)),{lab:lr})],J:['→'],C,U}];
}
function sumFrames(A,Bm,sg,la,lb,lr){
  const R=sg>0?M.add(A,Bm):M.sub(A,Bm),o=sg>0?'+':'−',n=A.length*A[0].length,dt=n>9?.45:.6,U=[],C=[];let t=.5,q=0;
  A.forEach((r,i)=>r.forEach((x,j)=>{U.push({t,b:0,i,j,add:'pair'},{t,b:1,i,j,add:'pair'},{t,line:q},{t:t+.15,b:2,i,j,v:R[i][j].html()},{t:t+dt-.05,b:0,clear:true},{t:t+dt-.05,b:1,clear:true});C.push(`${fmt(x)} ${o} ${fmt(Bm[i][j])} = ${R[i][j].html()}`);t+=dt;q++}));
  return [{sec:sg>0?$t('Dodawanie','Addition'):$t('Odejmowanie','Subtraction'),t:lr,x:$t(`${sg>0?'Dodajemy':'Odejmujemy'} element po elemencie, zawsze liczby z <b>tych samych miejsc</b>. Dlatego obie macierze muszą mieć ten sam wymiar (${A.length}×${A[0].length}).`,`${sg>0?'Add':'Subtract'} entry by entry, always the numbers in <b>the same positions</b>. That is why both matrices must have the same size (${A.length}×${A[0].length}).`),B:[bd(A,{lab:la}),bd(Bm,{lab:lb}),bd(A.map(r=>r.map(()=>PH)),{lab:lr})],J:[o,'='],C,U}];
}
function addFrames(A,Bm,a,b){
  const ab=Math.abs(b),la=coef(a)+'<i>A</i>',lb=coef(ab)+'<i>B</i>',fr=[];
  if(a!==1)fr.push(...scaleFrames(F(a),A,'<i>A</i>',la));
  if(ab!==1)fr.push(...scaleFrames(F(ab),Bm,'<i>B</i>',lb));
  return fr.concat(sumFrames(M.scale(F(a),A),M.scale(F(ab),Bm),b<0?-1:1,la,lb,`${la} ${b<0?'−':'+'} ${lb}`));
}
const iA='<i>A</i>',iB='<i>B</i>',iC='<i>C</i>',sT='<sup>T</sup>',iAB='<i>AB</i>';
const EXPR_FR=[
  (A,B)=>{const x=M.mul(A,B),y=M.mul(B,A);return [...mulFrames(A,B,{a:iA,b:iB,c:iAB}).frames,...mulFrames(B,A,{a:iB,b:iA,c:'<i>BA</i>'}).frames,...sumFrames(x,y,-1,iAB,'<i>BA</i>','<i>AB</i> − <i>BA</i>')]},
  (A,B)=>{const t=M.T(A),x=M.scale(F(2),t),y=M.scale(F(3),B);return [...transFrames(A,iA,iA+sT),...scaleFrames(F(2),t,iA+sT,'2'+iA+sT),...scaleFrames(F(3),B,iB,'3'+iB),...sumFrames(x,y,-1,'2'+iA+sT,'3'+iB,'2'+iA+sT+' − 3'+iB)]},
  (A,B,C)=>{const s=M.add(A,B),l='('+iA+' + '+iB+')';return [...sumFrames(A,B,1,iA,iB,iA+' + '+iB),...mulFrames(s,C,{a:l,b:iC,c:l+iC}).frames]},
  (A,B)=>{const x=M.mul(A,A),y=M.scale(F(2),B),a2=iA+'<sup>2</sup>';return [...mulFrames(A,A,{a:iA,b:iA,c:a2}).frames,...scaleFrames(F(2),B,iB,'2'+iB),...sumFrames(x,y,-1,a2,'2'+iB,a2+' − 2'+iB)]},
  (A,B,C)=>{const bt=M.T(B),x=M.mul(A,bt);return [...transFrames(B,iB,iB+sT),...mulFrames(A,bt,{a:iA,b:iB+sT,c:iA+iB+sT}).frames,...sumFrames(x,C,1,iA+iB+sT,iC,iA+iB+sT+' + '+iC)]},
  (A,B,C)=>{const x=M.mul(A,B),t=M.T(x),y=M.scale(F(2),C),l='('+iAB+')'+sT;return [...mulFrames(A,B,{a:iA,b:iB,c:iAB}).frames,...transFrames(x,iAB,l),...scaleFrames(F(2),C,iC,'2'+iC),...sumFrames(t,y,-1,l,'2'+iC,l+' − 2'+iC)]},
  (A,B,C)=>{const at=M.T(A),x=M.mul(at,B),ct=M.T(C);return [...transFrames(A,iA,iA+sT),...mulFrames(at,B,{a:iA+sT,b:iB,c:iA+sT+iB}).frames,...transFrames(C,iC,iC+sT),...sumFrames(x,ct,-1,iA+sT+iB,iC+sT,iA+sT+iB+' − '+iC+sT)]},
];
const detText=(A,lab)=>A.length===3&&OPT.det==='laplace'?laplaceHtml(A,lab):detLines(A);
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
  let h=L.z?'':$t('<p>Nie ma zer, więc bierzemy dowolny wiersz, np. pierwszy.</p>','<p>There are no zeros, so any row will do, e.g. the first one.</p>');
  h+=L.z===0?'':$t(`<p>Rozwijamy względem ${L.row?'wiersza':'kolumny'} ${L.k+1}, bo ma najwięcej zer (${L.z}), więc liczenia jest najmniej. Każdy niezerowy element mnożymy przez znak (−1)<sup><i>i</i>+<i>j</i></sup> i wyznacznik minora, czyli macierzy bez wiersza i kolumny tego elementu.</p>`,`<p>We expand along ${L.row?'row':'column'} ${L.k+1} because it has the most zeros (${L.z}), so there is the least computing. Each nonzero entry is multiplied by the sign (−1)<sup><i>i</i>+<i>j</i></sup> and the determinant of its minor, the matrix without that entry’s row and column.</p>`);
  if(!L.z)h+=$t('<p class="mute">Każdy element mnożymy przez znak (−1)<sup><i>i</i>+<i>j</i></sup> i wyznacznik minora (macierz bez wiersza i kolumny tego elementu).</p>','<p class="mute">Each entry is multiplied by the sign (−1)<sup><i>i</i>+<i>j</i></sup> and the determinant of its minor (the matrix without that entry’s row and column).</p>');
  t.forEach(o=>{
    h+=`<div class="line">(−1)<sup>${o.i+1}+${o.j+1}</sup> · ${fmt(o.a)} · ${matH(o.Mi,{det:true})}</div>`;
    h+=`<details><summary>Minor <i>M</i><sub>${o.i+1}${o.j+1}</sub>${o.Mi.length===3&&OPT.det!=='laplace'?' (Sarrus)':''}</summary>${detText(o.Mi,`det <i>M</i><sub>${o.i+1}${o.j+1}</sub>`)}</details>`;
    h+=`<div class="line">= ${lapTerm(o)} = <b>${o.v.html()}</b></div>`;
  });
  return h+`<div class="line res">${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = ${v.html()}</div>`;
}
function laplaceFrames(A,lab='det <i>A</i>',sec=$t("Rozwinięcie Laplace'a","Laplace expansion")){
  const {L,t}=laplaceTerms(A),v=detF(A),fr=[];
  fr.push({sec,t:$t(`Wybór: ${L.row?'wiersz':'kolumna'} ${L.k+1}`,`Choosing ${L.row?'row':'column'} ${L.k+1}`),x:!L.z?$t('Rozwinięcie Laplace’a: nie ma zer, więc bierzemy dowolny wiersz, np. pierwszy. Każdy element mnożymy przez znak i wyznacznik minora, potem dodajemy.','Laplace expansion: there are no zeros, so any row will do, e.g. the first one. Each entry is multiplied by its sign and the determinant of its minor, then everything is added.'):$t(`Rozwijamy względem wiersza albo kolumny z największą liczbą zer; tu ${L.row?'wiersz':'kolumna'} ${L.k+1} ma ${L.z} ${pl(L.z,'zero','zera','zer')}. Składnik z zerem jest zerem, więc liczymy tylko ${t.length} ${pl(t.length,'składnik','składniki','składników')}.`,`We expand along the row or column with the most zeros; here ${L.row?'row':'column'} ${L.k+1} has ${L.z} ${L.z===1?'zero':'zeros'}. A term with a zero entry is zero, so we only compute ${t.length} ${t.length===1?'term':'terms'}.`),
    B:[bd(A,{det:true,lab,hl:L.row?{rows:{[L.k]:'src'}}:{cols:{[L.k]:'src'}}})]});
  t.forEach((o,k)=>{
    const ml=`<i>M</i><sub>${o.i+1}${o.j+1}</sub>`;
    fr.push({sec,t:$t(`Składnik ${k+1}: element ${o.a.html()}`,`Term ${k+1}: the entry ${o.a.html()}`),x:$t(`Element stoi w wierszu ${o.i+1} i kolumnie ${o.j+1}. Skreślamy ten wiersz i tę kolumnę; zostaje minor ${ml}. Znak: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`,`The entry is in row ${o.i+1} and column ${o.j+1}. Cross out this row and this column; the minor ${ml} remains. Sign: (−1)<sup>${o.i+1}+${o.j+1}</sup> = ${o.s>0?'+1':'−1'}.`),
      B:[bd(A,{det:true,lab,hl:{rows:{[o.i]:'dim'},cols:{[o.j]:'dim'},cells:{[o.i+','+o.j]:'piv'}}}),bd(o.Mi,{det:true,lab:ml})],J:['→']});
    if(o.Mi.length===2){
      const m=o.Mi,f=fr[fr.length-1];
      f.C=[{h:`det ${ml} = ${fmt(m[0][0])}·${fmt(m[1][1])} − ${fmt(m[0][1])}·${fmt(m[1][0])} = ${o.dm.html()}`,full:true},{h:`${lapTerm(o)} = <b>${o.v.html()}</b>`,full:true}];
      f.U=[{t:1,line:0},{t:2.2,line:1}];
      return;
    }
    fr.push(...detFrames(o.Mi,'det '+ml,sec,false));
    fr.push({sec,t:$t(`Składnik ${k+1} = ${o.v.html()}`,`Term ${k+1} = ${o.v.html()}`),x:$t('Znak · element · wyznacznik minora:','Sign · entry · determinant of the minor:'),C:[{h:`${lapTerm(o)} = <b>${o.v.html()}</b>`,full:true}],U:[{t:.4,line:0}]});
  });
  fr.push({sec,t:`${lab} = ${v.html()}`,x:$t('Dodajemy wszystkie składniki.','Add up all the terms.'),B:[bd(A,{det:true,lab})],C:[{h:`${lab} = ${t.map(o=>fmt(o.v)).join(' + ')||'0'} = <b>${v.html()}</b>`,full:true}],U:[{t:.5,line:0}]});
  return fr;
}
function detFrames(A,lab,sec,detailed){
  const n=A.length,v=detF(A);
  if(n===3&&OPT.det==='laplace')return laplaceFrames(A,lab,sec);
  if(n===1)return [{sec,t:`${lab} = ${v.html()}`,x:$t('Wyznacznik macierzy 1×1 to jej jedyny element.','The determinant of a 1×1 matrix is its only entry.'),B:[bd(A,{det:true,lab})]}];
  if(n===2){
    const p=A[0][0].mul(A[1][1]),q=A[0][1].mul(A[1][0]);
    return [{sec,t:$t(`Liczymy ${lab}`,`Computing ${lab}`),x:$t('Wyznacznik 2×2: iloczyn na przekątnej w prawo w dół (zielony) <b>minus</b> iloczyn na drugiej przekątnej (czerwony).','A 2×2 determinant: the product on the diagonal going down to the right (green) <b>minus</b> the product on the other diagonal (red).'),B:[bd(A,{det:true,lab})],
      C:[`${fmt(A[0][0])} · ${fmt(A[1][1])} = ${p.html()}`,`${fmt(A[0][1])} · ${fmt(A[1][0])} = ${q.html()}`,{h:`${lab} = ${fmt(p)} − ${fmt(q)} = <b>${v.html()}</b>`,full:true}],
      U:[{t:.4,b:0,i:0,j:0,add:'pos'},{t:.4,b:0,i:1,j:1,add:'pos'},{t:.6,line:0},{t:1.9,b:0,i:0,j:1,add:'neg'},{t:1.9,b:0,i:1,j:0,add:'neg'},{t:2.1,line:1},{t:3.2,line:2}]}];
  }
  const E=A.map(r=>[...r,r[0],r[1]]),P=[[[0,0],[1,1],[2,2]],[[0,1],[1,2],[2,3]],[[0,2],[1,3],[2,4]]],N=[[[0,2],[1,1],[2,0]],[[0,3],[1,2],[2,1]],[[0,4],[1,3],[2,2]]];
  const val=d=>d.reduce((s,[i,j])=>s.mul(E[i][j]),F(1)),txt=d=>d.map(([i,j])=>fmt(E[i][j])).join(' · ');
  const dg=[...P.map(d=>['pos',d]),...N.map(d=>['neg',d])],lines=dg.map(([c,d])=>`${c==='pos'?'+':'−'} ${txt(d)} = ${fmt(val(d))}`);
  const fin={h:`${lab} = ${P.map(d=>fmt(val(d))).join(' + ')} − ${N.map(d=>fmt(val(d))).join(' − ')} = <b>${v.html()}</b>`,full:true};
  const base=hl=>bd(E,{det:true,lab,dimCols:[3,4],hl});
  if(detailed){
    const fr=[{sec,t:$t(`${lab} metodą Sarrusa`,`Computing ${lab} by Sarrus’ rule`),x:$t('Obok dopisujemy dwie pierwsze kolumny (wyszarzone). Potem mnożymy trzy liczby na każdej przekątnej: trzy przekątne w prawo w dół bierzemy z plusem, trzy w lewo w dół z minusem.','Copy the first two columns next to the matrix (greyed out). Then multiply the three numbers on each diagonal: the three diagonals going down to the right get a plus, the three going down to the left a minus.'),B:[base()]}];
    dg.forEach(([c,d],k)=>fr.push({sec,t:$t(`${c==='pos'?'Przekątna z plusem':'Przekątna z minusem'} ${k%3+1} z 3`,`${c==='pos'?'Plus diagonal':'Minus diagonal'} ${k%3+1} of 3`),x:c==='pos'?$t('Mnożymy trzy liczby na przekątnej w prawo w dół; ten iloczyn <b>dodajemy</b>.','Multiply the three numbers on the diagonal going down to the right; this product is <b>added</b>.'):$t('Mnożymy trzy liczby na przekątnej w lewo w dół; ten iloczyn <b>odejmujemy</b>.','Multiply the three numbers on the diagonal going down to the left; this product is <b>subtracted</b>.'),
      B:[base({cells:Object.fromEntries(d.map(([i,j])=>[i+','+j,c]))})],C:lines.slice(0,k+1),U:[{t:.5,line:k}]}));
    fr.push({sec,t:`${lab} = ${v.html()}`,x:$t('Dodajemy iloczyny z plusem i odejmujemy iloczyny z minusem.','Add the plus products and subtract the minus products.'),B:[base()],C:[...lines,fin],U:[{t:.6,line:6}]});
    return fr;
  }
  const U=[];dg.forEach(([c,d],k)=>{const t=.4+k*1.1;d.forEach(([i,j])=>U.push({t,b:0,i,j,add:c}));U.push({t:t+.2,line:k},{t:t+1,b:0,clear:true})});U.push({t:.4+6*1.1,line:6});
  return [{sec,t:$t(`${lab} (Sarrus)`,`Computing ${lab} (Sarrus)`),x:$t('Tak samo jak wyznacznik główny: trzy przekątne z plusem, trzy z minusem.','Same as the main determinant: three diagonals with a plus, three with a minus.'),B:[base()],C:[...lines,fin],U}];
}
function sysCheckFrame(Ab,names,vals){
  const nv=names.length,C=[],U=[];
  Ab.forEach((r,i)=>{let s=F(0);const p=[];r.slice(0,nv).forEach((a,j)=>{if(!a.z){p.push(`${fmt(a)}·${fmt(vals[j])}`);s=s.add(a.mul(vals[j]))}});C.push({h:`${p.join(' + ')||'0'} = ${s.html()}${s.eq(r[nv])?'':' ≠ '+r[nv].html()}`,full:true});U.push({t:.6+i*.8,line:i})});
  return {sec:$t('Sprawdzenie','Check'),t:$t('Sprawdzenie w równaniach','Checking in the equations'),x:$t(`Wynik: ${names.map((v,j)=>`${nmHtml(v)} = ${vals[j].html()}`).join(', ')}. Wstawiamy go do każdego równania; lewa strona musi dać wyraz wolny.`,`Result: ${names.map((v,j)=>`${nmHtml(v)} = ${vals[j].html()}`).join(', ')}. Put it into every equation; the left side must give the constant.`),S:sysHtml(abRows(Ab,nv),names),C,U};
}
function sysGaussFrames(Ab,names,sec=$t('Metoda Gaussa','Gaussian elimination'),noCheck){
  const nv=names.length,g=gaussFrames(Ab,nv,{mode:'sys',names,sec}),res=rref(Ab,nv),sol=sysSolution(res,nv),fr=g.frames;
  const rows=abRows(g.A,nv),isZ=r=>r.c.every(x=>x.z)&&r.k.z,hl={rows:{}};
  rows.forEach((r,i)=>{if(isZ(r))hl.rows[i]='dim';else if(r.c.every(x=>x.z))hl.rows[i]='bad'});
  const keep=rows.filter(r=>!isZ(r)),nz=rows.length-keep.length;
  const kc=$t(`rz <i>A</i> = ${res.rank}, rz [<i>A</i> | <i>B</i>] = ${res.rankAb}, niewiadomych ${nv}.`,`rank <i>A</i> = ${res.rank}, rank [<i>A</i> | <i>B</i>] = ${res.rankAb}, unknowns: ${nv}.`);
  const zt=nz?(nz===1?$t('Wiersz zerowy (0 = 0) jest wyszarzony, bo nic nie wnosi. ','The zero row (0 = 0) is greyed out: it adds nothing. '):$t('Wiersze zerowe (0 = 0) są wyszarzone, bo nic nie wnoszą. ','The zero rows (0 = 0) are greyed out: they add nothing. ')):'';
  let t=$t('Odczytujemy wynik','Reading the result'),x,C=[],U;
  if(res.type==='none'){const k=g.A.find(r=>r.slice(0,nv).every(x=>x.z)&&!r[nv].z)[nv].html();t=$t('Sprzeczność','A contradiction');x=$t(`Czerwony wiersz to równanie 0 = ${k}, a to nieprawda. ${kc} Rząd <i>A</i> jest mniejszy niż rząd [<i>A</i> | <i>B</i>], więc układ jest <b>sprzeczny</b>: nie ma rozwiązań.`,`The red row is the equation 0 = ${k}, which is false. ${kc} The rank of <i>A</i> is smaller than the rank of [<i>A</i> | <i>B</i>], so the system is <b>inconsistent</b>: it has no solutions.`)}
  else if(res.type==='one'){x=$t(`${zt}Przed kreską jest macierz jednostkowa, więc każdy wiersz mówi wprost, ile wynosi jedna niewiadoma. ${kc} Rzędy są równe liczbie niewiadomych: <b>dokładnie jedno rozwiązanie</b>.`,`${zt}The identity matrix stands before the bar, so each row says directly what one unknown equals. ${kc} The ranks equal the number of unknowns: <b>exactly one solution</b>.`);C=[{h:sysHtml(keep,names),full:true}]}
  else{x=$t(`${zt}${kc} Rzędy są równe, ale mniejsze od liczby niewiadomych: <b>nieskończenie wiele rozwiązań</b>. Niewiadome bez schodka (${sol.free.map(j=>nmHtml(names[j])).join(', ')}) są dowolne; przenosimy je na prawą stronę.`,`${zt}${kc} The ranks are equal but smaller than the number of unknowns: <b>infinitely many solutions</b>. The unknowns without a pivot (${sol.free.map(j=>nmHtml(names[j])).join(', ')}) are free; we move them to the right side.`);C=[{h:sysHtml(keep,names),full:true},{h:genSolHtml(sol,names),full:true}];U=[{t:1.4,line:1}]}
  fr.push({sec,t,x,B:[bd(g.A,{bar:nv,hl})],C,U});
  if(res.type==='one'&&!noCheck)fr.push(sysCheckFrame(Ab,names,sol.forms.map(f=>f.k)));
  return fr;
}
function macFrames(Ab,names){
  const nv=names.length,m=Ab.length,A=Ab.map(r=>r.slice(0,nv)),bc=Ab.map(r=>[r[nv]]),sec=$t('Metoda macierzowa','Matrix method'),Xn=names.map(v=>[nmHtml(v)]),fr=[];
  fr.push({sec,t:$t('Układ jako <i>AX</i> = <i>B</i>','The system as <i>AX</i> = <i>B</i>'),x:$t('<i>A</i> to współczynniki przy niewiadomych, <i>X</i> kolumna niewiadomych, a <i>B</i> wyrazy wolne. Wiersz <i>A</i> pomnożony przez <i>X</i> daje lewą stronę jednego równania.','<i>A</i> holds the coefficients of the unknowns, <i>X</i> is the column of unknowns and <i>B</i> the constants. A row of <i>A</i> times <i>X</i> gives the left side of one equation.'),S:sysHtml(abRows(Ab,nv),names),B:[bd(A,{lab:'<i>A</i>'}),bd(Xn,{lab:'<i>X</i>'}),bd(bc,{lab:'<i>B</i>'})],J:['·','=']});
  if(m!==nv){fr.push({sec,t:$t('<i>A</i> nie jest kwadratowa','<i>A</i> is not square'),x:$t(`<i>A</i> ma wymiar ${m}×${nv}, więc nie ma odwrotnej i metoda macierzowa nie działa. Liczymy metodą Gaussa.`,`<i>A</i> is ${m}×${nv}, so it has no inverse and the matrix method does not work. We use Gaussian elimination.`)});return fr.concat(sysGaussFrames(Ab,names))}
  fr.push({sec,t:$t('Wzór: <i>X</i> = <i>A</i><sup>−1</sup><i>B</i>','Formula: <i>X</i> = <i>A</i><sup>−1</sup><i>B</i>'),x:$t('Mnożymy obie strony z <b>lewej</b> przez <i>A</i><sup>−1</sup>. Ponieważ <i>A</i><sup>−1</sup><i>A</i> = <i>I</i> i <i>IX</i> = <i>X</i>, zostaje <i>X</i> = <i>A</i><sup>−1</sup><i>B</i>. Najpierw liczymy <i>A</i><sup>−1</sup>, potem mnożymy.','Multiply both sides on the <b>left</b> by <i>A</i><sup>−1</sup>. Since <i>A</i><sup>−1</sup><i>A</i> = <i>I</i> and <i>IX</i> = <i>X</i>, what remains is <i>X</i> = <i>A</i><sup>−1</sup><i>B</i>. First compute <i>A</i><sup>−1</sup>, then multiply.'),S:'<div class="eq"><i>A</i><sup>−1</sup><i>AX</i> = <i>A</i><sup>−1</sup><i>B</i> &nbsp;⇒&nbsp; <i>X</i> = <i>A</i><sup>−1</sup><i>B</i></div>'});
  const iv=invFrames(A,'<i>A</i>','<i>A</i><sup>−1</sup>',$t('Macierz odwrotna','Inverse matrix'));fr.push(...iv.frames);
  if(!iv.inv){fr.push({sec,t:$t('Metoda macierzowa nie działa','The matrix method does not work'),x:$t('<i>A</i> nie jest odwracalna, więc układ jest sprzeczny albo ma nieskończenie wiele rozwiązań. Rozstrzyga metoda Gaussa.','<i>A</i> is not invertible, so the system is inconsistent or has infinitely many solutions. Gaussian elimination decides.')});return fr.concat(sysGaussFrames(Ab,names))}
  const mf=mulFrames(iv.inv,bc,{a:'<i>A</i><sup>−1</sup>',b:'<i>B</i>',c:'<i>X</i>'});fr.push(...mf.frames);
  fr.push({sec,t:$t('Wynik','Result'),x:$t('Każdy wiersz kolumny <i>X</i> to wartość jednej niewiadomej.','Each row of the column <i>X</i> is the value of one unknown.'),B:[bd(Xn,{lab:'<i>X</i>'}),bd(mf.R,{lab:''})],J:['='],C:[{h:names.map((v,j)=>`${nmHtml(v)} = ${mf.R[j][0].html()}`).join(', &nbsp; '),full:true}]});
  fr.push(sysCheckFrame(Ab,names,mf.R.map(r=>r[0])));
  return fr;
}
function cramerFrames(Ab,names,only){
  const nv=names.length,m=Ab.length,A=Ab.map(r=>r.slice(0,nv)),b=Ab.map(r=>r[nv]),bc=b.map(x=>[x]),sec=$t('Wzory Cramera','Cramer’s rule'),fr=[];
  if(m!==nv||nv>3){fr.push({sec,t:$t('Tu Cramer się nie przyda','Cramer’s rule won’t help here'),x:m!==nv?$t(`Wzory Cramera działają tylko, gdy równań jest tyle, ile niewiadomych. Tu równań jest ${m}, a niewiadomych ${nv}. Liczymy metodą Gaussa.`,`Cramer’s rule only works when there are as many equations as unknowns. Here there are ${m} equations and ${nv} unknowns. We use Gaussian elimination.`):$t(`Dla układu ${nv}×${nv} trzeba by liczyć wyznaczniki ${nv}×${nv} (rozwinięcie Laplace’a), a to bardzo długie liczenie. Wygodniej metodą Gaussa.`,`A ${nv}×${nv} system would need ${nv}×${nv} determinants (Laplace expansion), which takes very long. Gaussian elimination is easier.`),S:sysHtml(abRows(Ab,nv),names)});return fr.concat(sysGaussFrames(Ab,names))}
  fr.push({sec,t:$t('Macierz współczynników i wyrazy wolne','Coefficient matrix and constants'),x:$t('Z układu wypisujemy macierz współczynników <i>A</i> i kolumnę wyrazów wolnych <i>B</i>. Najpierw liczymy wyznacznik główny <i>W</i> = det <i>A</i>.','From the system we write the coefficient matrix <i>A</i> and the column of constants <i>B</i>. First we compute the main determinant <i>D</i> = det <i>A</i>.'),S:sysHtml(abRows(Ab,nv),names),B:[bd(A,{lab:'<i>A</i>'}),bd(bc,{lab:'<i>B</i>'})]});
  fr.push(...detFrames(A,$t('<i>W</i>','<i>D</i>'),sec,true));
  const W=detF(A);
  if(W.z){fr.push({sec,t:$t('<i>W</i> = 0, wzory Cramera nie rozstrzygają','<i>D</i> = 0: Cramer’s rule cannot decide'),x:$t('Wyznacznik główny jest zerem: układ jest sprzeczny albo ma nieskończenie wiele rozwiązań. Rozstrzyga metoda Gaussa.','The main determinant is zero: the system is inconsistent or has infinitely many solutions. Gaussian elimination decides.')});return fr.concat(sysGaussFrames(Ab,names))}
  const js=only===undefined?names.map((_,j)=>j):[only];
  const Ws=js.map(j=>{
    const v=names[j],lab=`<i>${$t('W','D')}</i><sub>${nmHtml(v)}</sub>`,Aj=A.map((r,i)=>r.map((x,q)=>q===j?b[i]:x)),U=[];
    for(let i=0;i<nv;i++)U.push({t:.8+i*.5,b:0,i,j,v:b[i].html()},{t:.8+i*.5,b:1,i,j:0,add:'pair'});
    fr.push({sec,t:$t(`${lab}: kolumna przy ${nmHtml(v)} zastąpiona wyrazami wolnymi`,`${lab}: replacing the column of ${nmHtml(v)} with the constants`),x:$t(`W macierzy <i>A</i> kolumnę ${j+1} (współczynniki przy ${nmHtml(v)}) zastępujemy kolumną <i>B</i>. Reszta zostaje bez zmian.`,`In <i>A</i>, column ${j+1} (the coefficients of ${nmHtml(v)}) is replaced with the column <i>B</i>. The rest stays the same.`),B:[bd(A,{det:true,lab,hl:{cols:{[j]:'dst'}}}),bd(bc,{lab:'<i>B</i>'})],J:['←'],U});
    fr.push(...detFrames(Aj,lab,sec,false));
    return detF(Aj);
  });
  const C=js.map((j,q)=>{const v=names[j];return {h:$t(`${nmHtml(v)} = <span class="fr"><span><i>W</i><sub>${nmHtml(v)}</sub></span><span><i>W</i></span></span> = <span class="fr"><span>${Ws[q].str()}</span><span>${W.str()}</span></span> = <b>${Ws[q].div(W).html()}</b>`,`${nmHtml(v)} = <span class="fr"><span><i>D</i><sub>${nmHtml(v)}</sub></span><span><i>D</i></span></span> = <span class="fr"><span>${Ws[q].str()}</span><span>${W.str()}</span></span> = <b>${Ws[q].div(W).html()}</b>`),full:true}});
  fr.push({sec,t:$t('Wzory Cramera','Cramer’s rule'),x:$t(`<i>W</i> = ${W.html()} ≠ 0, więc jest dokładnie jedno rozwiązanie. Każdą niewiadomą dostajemy, dzieląc jej wyznacznik przez wyznacznik główny.`,`<i>D</i> = ${W.html()} ≠ 0, so there is exactly one solution. Each unknown is its determinant divided by the main determinant.`),C,U:C.map((_,k)=>({t:.5+k*.9,line:k}))});
  if(only===undefined)fr.push(sysCheckFrame(Ab,names,Ws.map(x=>x.div(W))));
  return fr;
}
const sysFrames=(Ab,names,method)=>method==='mac'?macFrames(Ab,names):method==='cra'?cramerFrames(Ab,names):sysGaussFrames(Ab,names);
function symFrames(sol,inNum){
  const fr=[];
  if(!inNum)fr.push({sec:$t('Równanie','Equation'),t:$t('Wyznaczamy <i>X</i>','Finding <i>X</i>'),x:$t('Przekształcamy je jak zwykłe równanie, pilnując jednego: mnożąc przez macierz, mnożymy obie strony <b>z tej samej strony</b>.','We transform it like an ordinary equation, with one rule: when multiplying by a matrix, both sides are multiplied <b>from the same side</b>.'),C:[{h:sol.orig,full:true}],Cb:true});
  sol.steps.forEach(s=>fr.push({sec:$t('Na literach','Symbolically'),t:s.final?$t('Wzór na <i>X</i>','Formula for <i>X</i>'):s.title,x:s.final?(inNum?$t('Teraz podstawiamy liczby: liczymy potrzebne macierze i mnożymy po kolei od lewej.','Now substitute the numbers: compute the matrices needed and multiply from left to right.'):$t('To jest szukane <i>X</i>.','This is the <i>X</i> we were looking for.')):s.why,
    C:s.lines.map(l=>({h:l,full:true})),Cb:true,U:s.lines.slice(1).map((_,k)=>({t:1.3+k*1.4,line:k+1}))}));
  return fr;
}
function numFrames(T){
  const {sol,env,X}=T,fr=[],secN=$t('Podstawiamy liczby','Substituting numbers');
  fr.push({sec:$t('Zadanie','Task'),t:$t('Wyznaczamy <i>X</i>','Finding <i>X</i>'),x:$t('Najpierw przekształcamy równanie <b>na literach</b>, bo tak jest mniej liczenia. Liczby podstawiamy dopiero na końcu.','First we transform the equation <b>symbolically</b>, which means less computing. The numbers are substituted only at the end.'),S:`<div class="eq">${sol.orig}</div>`,B:[...sol.letters].sort().map(c=>bd(env[c],{lab:`<i>${c}</i>`}))});
  fr.push(...symFrames(sol,true));
  const vals=[],cache={};
  for(const f of sol.P.fs){
    const key=rFac(f);if(cache[key]){vals.push(cache[key]);continue}
    const bname=rFac({...f,i:false});let base;
    if(f.sum){base=toMat(evalSum(f.sum,env),env.__n);fr.push({sec:secN,t:$t(`Liczymy ${f.html}`,`Computing ${f.html}`),x:$t('Najpierw nawias. <i>I</i> to macierz jednostkowa, więc liczba przy <i>I</i> trafia tylko na przekątną.','First the bracket. <i>I</i> is the identity matrix, so a number next to <i>I</i> only goes onto the diagonal.'),B:[bd(base,{lab:f.html})]});
      if(f.t){fr.push(...transFrames(base,f.html,bname,secN));base=M.T(base)}}
    else{base=env[f.n];if(f.t){fr.push(...transFrames(base,`<i>${f.n}</i>`,bname,secN));base=M.T(base)}}
    let V=base;
    if(f.i){const iv=invFrames(base,bname,key,$t('Odwrotność ','Inverse ')+key);fr.push(...iv.frames);V=iv.inv}
    cache[key]=V;vals.push(V);
  }
  let run=vals[0];
  for(let k=1;k<vals.length;k++){const mf=mulFrames(run,vals[k],{a:rProd(sol.P.fs.slice(0,k)),b:rFac(sol.P.fs[k]),c:rProd(sol.P.fs.slice(0,k+1))});fr.push(...mf.frames);run=mf.R}
  if(run&&!sol.P.c.one)fr.push(...scaleFrames(sol.P.c,run,rProd(sol.P.fs),'<i>X</i>'));
  fr.push({sec:$t('Wynik','Result'),t:$t('Mamy <i>X</i>','We have <i>X</i>'),x:$t(`Wzór <i>X</i> = ${rP(sol.P)} po podstawieniu liczb daje:`,`The formula <i>X</i> = ${rP(sol.P)} with the numbers substituted gives:`),B:[bd(X,{lab:'<i>X</i>'})]});
  fr.push({sec:$t('Sprawdzenie','Check'),t:$t('Sprawdzenie w równaniu','Checking in the equation'),x:$t(`Podstawiamy <i>X</i> do ${sol.orig}. Obie strony muszą wyjść takie same.`,`Substitute <i>X</i> into ${sol.orig}. Both sides must come out the same.`),B:[bd(T.Lv,{lab:$t('lewa strona','left side')}),bd(T.Rv,{lab:$t('prawa strona','right side')})],J:[M.eq(T.Lv,T.Rv)?'=':'≠']});
  return fr;
}
function linFrames(L){
  const d=L.d,sec=$t('Przez niewiadome','Using unknowns'),fr=[],Xn=M.make(d.r,d.c,(i,j)=>nmHtml(d.names[i*d.c+j])),nn=d.names.map(nmHtml).join(', ');
  fr.push({sec,t:$t('Zapisujemy <i>X</i> przez niewiadome','Writing <i>X</i> with unknowns'),x:$t(`Do działań w równaniu pasuje tylko wymiar ${d.r}×${d.c}, więc <i>X</i> ma ${d.r*d.c} ${pl(d.r*d.c,'element','elementy','elementów')}; każdy to osobna niewiadoma: ${nn}.`,`Only the size ${d.r}×${d.c} fits the operations in the equation, so <i>X</i> has ${d.r*d.c} ${d.r*d.c===1?'entry':'entries'}; each one is a separate unknown: ${nn}.`),S:`<div class="eq">${d.orig}</div>`,B:[bd(Xn,{lab:'<i>X</i>'}),...d.given.map(([c,V])=>bd(V,{lab:`<i>${c}</i>`}))]});
  [[d.lL,d.LH,$t('lewą','left')],[d.lR,d.RH,$t('prawą','right')]].forEach(([lab,H,w])=>{
    const U=[];let t=.5;H.forEach((r,i)=>r.forEach((v,j)=>{U.push({t,b:0,i,j,v});t+=.6}));
    fr.push({sec,t:$t(`Wymnażamy ${w} stronę: ${lab}`,`Multiplying out the ${w} side: ${lab}`),x:$t(`Liczymy ${lab} zwykłymi działaniami na macierzach (wiersz razy kolumna), tylko zamiast liczb w <i>X</i> stoją niewiadome. Każdy element wyniku to wyrażenie z ${nn}.`,`We compute ${lab} with ordinary matrix operations (row times column); only <i>X</i> contains unknowns instead of numbers. Each entry of the result is an expression in ${nn}.`),B:[bd(H.map(r=>r.map(()=>PH)),{lab})],U});
  });
  const U=[],C=[];let t=.5,k=0;
  d.LH.forEach((r,i)=>r.forEach((v,j)=>{U.push({t,b:0,i,j,add:'pair'},{t,b:1,i,j,add:'pair'},{t,line:k},{t:t+.85,b:0,clear:true},{t:t+.85,b:1,clear:true});C.push({h:`${v} = ${d.RH[i][j]}`,full:true});t+=.9;k++}));
  fr.push({sec,t:$t('Porównujemy elementy','Comparing entries'),x:$t('Dwie macierze są równe, gdy mają równe elementy na tych samych miejscach. Każda para daje jedno równanie.','Two matrices are equal when their entries in the same positions are equal. Each pair gives one equation.'),B:[bd(d.LH,{lab:d.lL}),bd(d.RH,{lab:d.lR})],J:['='],C,U});
  if(!d.rows.length){fr.push({sec,t:$t('Same tożsamości 0 = 0','Only identities 0 = 0'),x:$t(`Każda macierz ${d.r}×${d.c} spełnia to równanie.`,`Every ${d.r}×${d.c} matrix satisfies this equation.`)});return fr}
  fr.push({sec,t:$t('Porządkujemy układ','Tidying up the system'),x:$t('Niewiadome przenosimy na lewo, liczby na prawo, a równania typu 0 = 0 pomijamy. Dostajemy zwykły układ równań:','Move the unknowns to the left and the numbers to the right, and skip equations of the form 0 = 0. This gives an ordinary system of equations:'),S:sysHtml(d.rows,d.names)});
  fr.push(...sysGaussFrames(d.Ab,d.names,$t('Rozwiązujemy układ','Solving the system'),true));
  if(L.type==='one')fr.push({sec:$t('Wynik','Result'),t:$t('Składamy macierz <i>X</i>','Assembling the matrix <i>X</i>'),x:$t('Wstawiamy znalezione liczby na miejsca niewiadomych.','Put the numbers found into the places of the unknowns.'),B:[bd(Xn,{lab:'<i>X</i>'}),bd(L.X,{lab:''})],J:['=']},
    {sec:$t('Sprawdzenie','Check'),t:$t('Sprawdzenie w równaniu','Checking in the equation'),x:$t(`Podstawiamy <i>X</i> do ${d.orig}. Obie strony muszą wyjść takie same.`,`Substitute <i>X</i> into ${d.orig}. Both sides must come out the same.`),B:[bd(d.chk[0],{lab:$t('lewa strona','left side')}),bd(d.chk[1],{lab:$t('prawa strona','right side')})],J:['=']});
  else if(L.type==='inf')fr.push({sec:$t('Wynik','Result'),t:$t('Nieskończenie wiele macierzy <i>X</i>','Infinitely many matrices <i>X</i>'),x:$t('Wstawiamy rozwiązanie ogólne na miejsca niewiadomych. Każdy wybór parametrów daje inną macierz spełniającą równanie.','Put the general solution into the places of the unknowns. Every choice of the parameters gives a different matrix satisfying the equation.'),S:`<div class="eq">${d.gen}</div>`});
  else fr.push({sec:$t('Wynik','Result'),t:$t('Brak rozwiązań','No solutions'),x:$t('Układ jest sprzeczny, więc żadna macierz <i>X</i> nie spełnia tego równania.','The system is inconsistent, so no matrix <i>X</i> satisfies this equation.')});
  return fr;
}
function numbersSolve(src,env){
  let sol=null,why='';
  try{sol=solve(src)}catch(e){if(!e.lin)throw e;why=e.message+$t(' Wzorem na literach się nie da.',' A symbolic formula will not work.')}
  if(sol){
    const sq=Object.values(env).find(v=>v.length===v[0].length);env.__n=sq?sq.length:2;
    try{
      const X=toMat(evalP(sol.P,env),env.__n);env.X=X;
      let Lv=evalSum(sol.L0,env),Rv=evalSum(sol.R0,env);
      if(isS(Lv))Lv=toMat(Lv,Rv.length);if(isS(Rv))Rv=toMat(Rv,Lv.length);
      sameDim(Lv,Rv,$t('porównać','compare'));
      const T={sol,env,X,Lv,Rv};return {html:numSolHtml(T),X,fr:()=>numFrames(T)};
    }catch(e){
      delete env.X;
      if(e.message==='singular')why=$t(`Macierz ${e.what} nie jest odwracalna (w eliminacji Gaussa zabraknie niezerowego elementu), więc wzór <span class="f"><i>X</i> = ${rP(sol.P)}</span> tu nie działa.`,`The matrix ${e.what} is not invertible (Gaussian elimination runs out of nonzero entries), so the formula <span class="f"><i>X</i> = ${rP(sol.P)}</span> does not work here.`);
      else if(e instanceof DimErr&&e.inv)why=$t(`${e.message} Wzór <span class="f"><i>X</i> = ${rP(sol.P)}</span> tu nie działa.`,`${e.message} The formula <span class="f"><i>X</i> = ${rP(sol.P)}</span> does not work here.`);
      else if(!(e instanceof DimErr))throw e;
    }
  }
  const L=linSolve(src,env);
  return {html:(why?$t(`<div class="tip">${why} Liczymy <b>przez niewiadome</b>; ta metoda działa zawsze.</div>`,`<div class="tip">${why} We compute <b>using unknowns</b>; this method always works.</div>`):'')+L.html,X:L.X,
    fr:()=>(why?[{sec:$t('Dlaczego nie wzorem?','Why not a formula?'),t:$t('Wzór tu nie zadziała','The formula will not work here'),x:why+$t(' Dlatego liczymy <b>przez niewiadome</b>; ta metoda działa zawsze.',' So we compute <b>using unknowns</b>; this method always works.')}]:[]).concat(linFrames(L))};
}
