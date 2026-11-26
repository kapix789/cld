// =====================================================================
//  Kalkulator zeszytu (bez DOM): każda linia tekstu → wynik
// =====================================================================
//  calcText(tekst, {deg}) → dla każdej linii null (tekst albo nic nowego) lub {html, cls}
//    cls: '' wynik, 'err' błąd w rachunku, 'ok' / 'bad' sprawdzona równość
//  Liczby:    2,5  1/3  2·10^3  0b1011  0x1f  0o755   (ułamki zostają dokładne)
//  Działania: + − * · × / : ^ ! %  nawiasy, potęgi ² ³ ⁻¹, mnożenie bez znaku (2x, 2(3+4), 2πr)
//  Funkcje:   sqrt √ sin cos tg ctg arcsin arccos arctg ln log lg log2 exp abs; bin() hex() oct() zmieniają zapis
//  Macierze:  A = [1 2; 3 4]  det(A) |A|  A^-1  inv(A)  A^T  A'  rz(A)  tr(A)  rref(A)  A*B  2A
//  Zmienne:   v0 = 20 m/s; jednostka na końcu linii nie wchodzi do rachunku, tylko wraca w wyniku
//  Linie:     „2+2=” liczy lewą stronę, „1/2 + 1/3 = 5/6” sprawdza równość, # zaczyna komentarz,
//             linia ze zwykłym tekstem zostaje tekstem
//  Kąty:      w stopniach (deg: true) albo w radianach; 30° działa w obu trybach
// =====================================================================
class CalcErr extends Error{}
const C_FUN=new Set(['sqrt','√','sin','cos','tg','tan','ctg','cot','arcsin','asin','arccos','acos','arctg','arctan','atan','ln','log','lg','log2','exp','abs','det','inv','rank','rz','tr','rref']);
const C_L='A-Za-zÀ-ÖØ-öø-ÿĀ-žΑ-Ωα-ω_';
const C_NUM=/^((?:\d+(?:[.,]\d+)?|\.\d+)(?:[eE][-+]?\d+)?)/;
const C_ID=new RegExp(`^[${C_L}][${C_L}0-9]*`);
const C_IDS=new RegExp(`[${C_L}][${C_L}0-9]*`,'g');
const C_ASG=new RegExp(`^([${C_L}][${C_L}0-9]*)\\s*=\\s*([^=]+)$`);
const C_LIT=/^[-−]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;
const C_SUP={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
// x² → x^2, A⁻¹ → A^(-1), Aᵀ → A^T
const cNorm=s=>s.replace(/ᵀ/g,'^T').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g,m=>m.length>1?'^('+[...m].map(c=>C_SUP[c]).join('')+')':'^'+C_SUP[m]);
// has(nazwa): czy zmienna już jest; wtedy krótka nieznana nazwa z liter („ac”, „πr”) rozpada się na iloczyn liter
function calcTokens(s,has){
  const t=[];let i=0;
  while(i<s.length){
    const c=s[i],r=s.slice(i);
    if(/\s/.test(c)){i++;continue}
    if(c==='['){const j=s.indexOf(']',i);if(j<0)throw new CalcErr('[');t.push({k:'mat',v:s.slice(i+1,j)});i=j+1;continue}
    // 0b1011, 0x1F, 0o755, także z częścią ułamkową: 0b0.101 = 0,625
    let m=r.match(/^0([bxo])([0-9a-f]+)(?:[.,]([0-9a-f]+))?/i);
    if(m){
      const base={b:2,x:16,o:8}[m[1].toLowerCase()],fr=m[3]||'';
      if(![...m[2]+fr].every(d=>parseInt(d,16)<base))throw new CalcErr('base');
      const v=fr?cBaseDec(m[2],fr,base):String(parseInt(m[2],base));
      t.push({k:'num',v,raw:m[0]});i+=m[0].length;continue;
    }
    // „2/3” zapisane ciasno to jeden ułamek: 2/3 : 4/5 = (2/3) : (4/5)
    m=r.match(/^(\d+)\/(\d+)(?![\d.,eE])/);
    if(m&&!(t.length&&t[t.length-1].k==='op'&&t[t.length-1].v==='^')){t.push({k:'frac',a:m[1],b:m[2]});i+=m[0].length;continue}
    m=r.match(C_NUM);
    if(m){t.push({k:'num',v:m[1].replace(',','.')});i+=m[1].length;continue}
    m=r.match(C_ID);
    if(m){
      const v=m[0],ch=[...v],one=c=>has(c)||c==='π'||c==='e';
      // „4ac” = 4·a·c, „πr^2” = π·r², ale dłuższa nieznana nazwa to raczej słowo
      if(has&&!has(v)&&!C_FUN.has(v)&&v!=='pi'&&ch.length>1&&ch.length<=3&&ch.every(c=>/\p{L}/u.test(c))&&ch.some(one))ch.forEach(c=>t.push({k:'id',v:c}));
      else t.push({k:'id',v});
      i+=v.length;continue;
    }
    if('+-−–*·×÷/:^()!°%\'√|'.includes(c)){t.push({k:'op',v:c==='−'||c==='–'?'-':c==='·'||c==='×'?'*':c===':'||c==='÷'?'/':c});i++;continue}
    throw new CalcErr(c);
  }
  return t;
}
// drzewo wyrażenia: {t:'num',v} {t:'var',n} {t:'bin',o,a,b} {t:'neg',a} {t:'call',f,a} {t:'mat',rows} {t:'post',o,a} {t:'pow',a,b}
function calcParse(tokens,has){
  let p=0;const peek=()=>tokens[p],is=v=>peek()&&peek().k==='op'&&peek().v===v;
  const expr=()=>{let a=term();while(is('+')||is('-')){const o=tokens[p++].v;a={t:'bin',o,a,b:term()}}return a};
  const startsFactor=()=>{const x=peek();return x&&(x.k==='num'||x.k==='frac'||x.k==='id'||x.k==='mat'||(x.k==='op'&&(x.v==='('||x.v==='√')))};
  const term=()=>{
    let a=unary();
    for(;;){
      if(is('*')||is('/')){const o=tokens[p++].v;a={t:'bin',o,a,b:unary()};continue}
      // mnożenie bez znaku: 2x, 2(3), (1+2)(3), xy; ale nie „x 2” ani „5 2” (to raczej tekst)
      const prev=tokens[p-1],x=peek();
      if(prev&&startsFactor()&&!((x.k==='num'||x.k==='frac')&&(prev.k==='id'||prev.k==='num'||prev.k==='frac'))&&!(prev.k==='id'&&C_FUN.has(prev.v))){a={t:'bin',o:'*',a,b:unary()};continue}
      return a;
    }
  };
  const unary=()=>{if(is('-')){p++;return {t:'neg',a:unary()}}if(is('+')){p++;return unary()}return power()};
  const power=()=>{
    const a=post();
    if(is('^')){p++;
      if(peek()&&peek().k==='id'&&peek().v==='T'){p++;return postLoop({t:'post',o:'T',a})}
      return {t:'pow',a,b:unary()};
    }
    return a;
  };
  const postLoop=a=>{for(;;){if(is('!')||is('°')||is('%')){a={t:'post',o:tokens[p++].v,a}}else if(is("'")){p++;a={t:'post',o:'T',a}}else return a}};
  const post=()=>postLoop(primary());
  // wiersz macierzy: przecinek dzieli elementy, gdy stoi przed spacją albo w wierszu nie ma spacji; „1,5 2,5” to dwie liczby dziesiętne
  const cells=r=>(/,\s/.test(r)||!/\s/.test(r)?r.split(','):r.split(/\s+/)).map(e=>e.trim()).filter(Boolean).map(e=>calcParse(calcTokens(e,has),has));
  const primary=()=>{
    const x=tokens[p++];if(!x)throw new CalcErr('end');
    if(x.k==='num')return x.raw?{t:'num',v:x.v,raw:x.raw}:{t:'num',v:x.v};
    if(x.k==='frac')return {t:'bin',o:'/',a:{t:'num',v:x.a},b:{t:'num',v:x.b},tight:true};
    if(x.k==='mat')return {t:'mat',rows:x.v.split(';').map(r=>r.trim()).filter(Boolean).map(cells)};
    if(x.k==='op'&&x.v==='('){const a=expr();if(!is(')'))throw new CalcErr(')');p++;return a}
    if(x.k==='op'&&x.v==='|'){const a=expr();if(!is('|'))throw new CalcErr('|');p++;return {t:'call',f:'abs',a}}
    if(x.k==='op'&&x.v==='√')return {t:'call',f:'sqrt',a:post()};
    if(x.k==='id'){
      if(C_FUN.has(x.v)){
        if(is('(')){p++;const a=expr();if(!is(')'))throw new CalcErr(')');p++;return {t:'call',f:x.v,a}}
        return {t:'call',f:x.v,a:post()};
      }
      return {t:'var',n:x.v};
    }
    throw new CalcErr(x.v);
  };
  const a=expr();
  if(p<tokens.length)throw new CalcErr('rest');
  return a;
}

// ---------- wartości: ułamek Fr, liczba zmiennoprzecinkowa albo macierz {mat} ----------
const isMat=v=>!!(v&&v.mat);
const isFr=v=>v instanceof Fr;
const toNum=v=>isFr(v)?v.n/v.d:v;
const SAFE=9e15;
const frOk=(n,d)=>Math.abs(n)<SAFE&&Math.abs(d)<SAFE;
function cAdd(a,b,s=1){
  if(isFr(a)&&isFr(b)&&frOk(a.n*b.d,b.n*a.d)&&frOk(a.d*b.d,1))return s>0?a.add(b):a.sub(b);
  return toNum(a)+s*toNum(b);
}
function cMul(a,b){if(isFr(a)&&isFr(b)&&frOk(a.n*b.n,a.d*b.d))return a.mul(b);return toNum(a)*toNum(b)}
function cDiv(a,b){
  if(isFr(b)?b.z:b===0)throw new CalcErr('div0');
  if(isFr(a)&&isFr(b)&&frOk(a.n*b.d,a.d*b.n))return a.div(b);
  return toNum(a)/toNum(b);
}
const cNeg=a=>isFr(a)?a.neg():-a;
const cZero=a=>isFr(a)?a.z:Math.abs(a)<1e-12;
function cPowS(a,b){
  if(isFr(b)&&b.d===1&&Math.abs(b.n)<=200&&isFr(a)){
    let r=F(1);const n=Math.abs(b.n);
    for(let k=0;k<n;k++){const q=cMul(r,a);if(!isFr(q))return Math.pow(toNum(a),toNum(b));r=q}
    return b.n<0?cDiv(F(1),r):r;
  }
  const r=Math.pow(toNum(a),toNum(b));
  if(Number.isNaN(r))throw new CalcErr('nan');
  return r;
}
function mDims(A,B,what){if(A.length!==B.length||A[0].length!==B[0].length)throw new CalcErr('dims:'+what)}
function cMatMul(A,B){
  if(A[0].length!==B.length)throw new CalcErr('dims:mul');
  return A.map((r,i)=>B[0].map((_,j)=>r.reduce((s,x,k)=>cAdd(s,cMul(x,B[k][j])),F(0))));
}
const cT=A=>A[0].map((_,j)=>A.map(r=>r[j]));
// eliminacja: na ułamkach dokładnie, na liczbach dziesiętnych z wyborem największego elementu
function cElim(A0,full){
  const A=A0.map(r=>r.slice()),m=A.length,n=A[0].length;let row=0,sign=1;const piv=[];
  for(let j=0;j<n&&row<m;j++){
    let best=-1;
    for(let i=row;i<m;i++)if(!cZero(A[i][j])&&(best<0||Math.abs(toNum(A[i][j]))>Math.abs(toNum(A[best][j]))))best=i;
    if(best<0)continue;
    if(best!==row){[A[row],A[best]]=[A[best],A[row]];sign=-sign}
    const pv=A[row][j];
    if(full){A[row]=A[row].map(x=>cDiv(x,pv))}
    for(let i=full?0:row+1;i<m;i++){if(i===row||cZero(A[i][j]))continue;const f=cDiv(A[i][j],A[row][j]);A[i]=A[i].map((x,k)=>cAdd(x,cMul(f,A[row][k]),-1))}
    piv.push(j);row++;
  }
  return {A,rank:row,sign,piv};
}
function cDet(A){
  if(A.length!==A[0].length)throw new CalcErr('square');
  const e=cElim(A,false);if(e.rank<A.length)return F(0);
  let d=e.sign>0?F(1):F(-1);for(let i=0;i<A.length;i++)d=cMul(d,e.A[i][i]);return d;
}
function cInv(A){
  if(A.length!==A[0].length)throw new CalcErr('square');
  const n=A.length,e=cElim(A.map((r,i)=>[...r,...r.map((_,j)=>F(i===j?1:0))]),true);
  if(e.piv.length<n||e.piv[n-1]!==n-1)throw new CalcErr('singular');
  return e.A.map(r=>r.slice(n));
}
const unit=a=>a.map((r,i)=>r.map((_,j)=>F(i===j?1:0)));
function cMatPow(A,b){
  if(!isFr(b)||b.d!==1)throw new CalcErr('matpow');
  if(A.length!==A[0].length)throw new CalcErr('square');
  let R=unit(A),B=b.n<0?cInv(A):A;
  for(let k=0;k<Math.abs(b.n);k++)R=cMatMul(R,B);
  return R;
}
const RAD=Math.PI/180;
function cTrig(f,x,deg){
  const v=toNum(x),a=deg?v*RAD:v;
  const r={sin:Math.sin,cos:Math.cos,tg:Math.tan,tan:Math.tan,ctg:t=>1/Math.tan(t),cot:t=>1/Math.tan(t)}[f](a);
  // wartości z tabeli (0, ±1/2, ±1) dokładnie, bez śmieci po przecinku
  const h=Math.round(r*2);if(Math.abs(r*2-h)<1e-12)return F(h,2);
  if(!Number.isFinite(r)||Math.abs(r)>1e15)throw new CalcErr('nan');
  return r;
}
function cArc(f,x,deg){
  const v=toNum(x),r={arcsin:Math.asin,asin:Math.asin,arccos:Math.acos,acos:Math.acos,arctg:Math.atan,arctan:Math.atan,atan:Math.atan}[f](v);
  if(Number.isNaN(r))throw new CalcErr('nan');
  return deg?r/RAD:r;
}
function calcEval(n,env,o){
  const ev=x=>calcEval(x,env,o);
  switch(n.t){
    case 'lit':return n.v;   // wartość już policzona (drzewo kroków w steps.js)
    case 'num':{
      if(/e/i.test(n.v)){const x=+n.v;return Number.isInteger(x)&&Math.abs(x)<SAFE?F(x):x}
      const [a,b='']=n.v.split('.'),s=a+b;return frOk(+s,10**b.length)?F(parseInt(s,10),10**b.length):+n.v;
    }
    case 'var':{
      if(env.has(n.n))return env.get(n.n);
      if(n.n==='pi'||n.n==='π')return Math.PI;
      if(n.n==='e')return Math.E;
      throw Object.assign(new CalcErr('var'),{name:n.n});
    }
    case 'neg':{const a=ev(n.a);return isMat(a)?{mat:a.mat.map(r=>r.map(cNeg))}:cNeg(a)}
    case 'bin':return calcBin(n.o,ev(n.a),ev(n.b));
    case 'pow':{const a=ev(n.a),b=ev(n.b);if(isMat(b))throw new CalcErr('matexp');return isMat(a)?{mat:cMatPow(a.mat,b)}:cPowS(a,b)}
    case 'post':{
      const a=ev(n.a);
      if(n.o==='T'){if(!isMat(a))return a;return {mat:cT(a.mat)}}
      if(isMat(a))throw new CalcErr('scalar');
      if(n.o==='°')return o.deg?a:cMul(a,Math.PI/180);
      if(n.o==='%')return cDiv(a,F(100));
      const v=toNum(a);if(v<0||v>170||Math.round(v)!==v)throw new CalcErr('fact');
      let r=F(1);for(let k=2;k<=v;k++)r=cMul(r,F(k));return r;
    }
    case 'mat':{
      const rows=n.rows.map(r=>r.map(x=>{const v=ev(x);if(isMat(v))throw new CalcErr('nested');return v}));
      if(!rows.length||rows.some(r=>r.length!==rows[0].length))throw new CalcErr('ragged');
      return {mat:rows};
    }
    case 'call':{
      const a=ev(n.a),f=n.f;
      if(f==='abs'&&isMat(a))return cDet(a.mat);   // |A| to wyznacznik
      if(['det','inv','rank','rz','tr','rref'].includes(f)){
        if(!isMat(a))throw new CalcErr('needmat');
        if(f==='det')return cDet(a.mat);
        if(f==='inv')return {mat:cInv(a.mat)};
        if(f==='rank'||f==='rz')return F(cElim(a.mat,false).rank);
        if(f==='tr'){if(a.mat.length!==a.mat[0].length)throw new CalcErr('square');return a.mat.reduce((s,r,i)=>cAdd(s,r[i]),F(0))}
        return {mat:cElim(a.mat,true).A};
      }
      if(isMat(a))throw new CalcErr('scalar');
      if(f==='abs')return isFr(a)?a.abs():Math.abs(a);
      if(f==='sqrt'||f==='√'){
        const v=toNum(a);if(v<0)throw new CalcErr('nan');
        if(isFr(a)){const rn=Math.round(Math.sqrt(a.n)),rd=Math.round(Math.sqrt(a.d));if(rn*rn===a.n&&rd*rd===a.d)return F(rn,rd)}
        return Math.sqrt(v);
      }
      if(['sin','cos','tg','tan','ctg','cot'].includes(f))return cTrig(f,a,o.deg&&!hasPi(n.a));
      if(['arcsin','asin','arccos','acos','arctg','arctan','atan'].includes(f))return cArc(f,a,o.deg);
      const v=toNum(a);
      if(f==='exp')return Math.exp(v);
      if(v<=0)throw new CalcErr('log');
      if(f==='log2'){const r=Math.log2(v);return Math.abs(r-Math.round(r))<1e-12?F(Math.round(r)):r}
      if(f==='log'||f==='lg'){const r=Math.log10(v);return Math.abs(r-Math.round(r))<1e-12?F(Math.round(r)):r}
      return Math.log(v);
    }
  }
  throw new CalcErr('?');
}
const hasPi=n=>!!n&&(n.t==='var'&&/π|^pi$/.test(n.n)||n.t==='lit'&&!!n.pi||['a','b'].some(k=>n[k]&&typeof n[k]==='object'&&hasPi(n[k])));
function calcBin(op,a,b){
  const A=isMat(a),B=isMat(b);
  if(op==='+'||op==='-'){
    const s=op==='+'?1:-1;
    if(A&&B){mDims(a.mat,b.mat,'add');return {mat:a.mat.map((r,i)=>r.map((x,j)=>cAdd(x,b.mat[i][j],s)))}}
    if(A||B)throw new CalcErr('matnum');
    return cAdd(a,b,s);
  }
  if(op==='*'){
    if(A&&B)return {mat:cMatMul(a.mat,b.mat)};
    if(A)return {mat:a.mat.map(r=>r.map(x=>cMul(x,b)))};
    if(B)return {mat:b.mat.map(r=>r.map(x=>cMul(a,x)))};
    return cMul(a,b);
  }
  if(B)throw new CalcErr('matdiv');
  if(A)return {mat:a.mat.map(r=>r.map(x=>cDiv(x,b)))};
  return cDiv(a,b);
}
// równość z dokładnością tol (np. 0,005, gdy ktoś zaokrąglił do dwóch miejsc)
function cSame(a,b,tol=0){
  if(isMat(a)||isMat(b))return isMat(a)&&isMat(b)&&a.mat.length===b.mat.length&&a.mat[0].length===b.mat[0].length&&a.mat.every((r,i)=>r.every((x,j)=>cSame(x,b.mat[i][j],tol)));
  if(isFr(a)&&isFr(b)&&a.n===b.n&&a.d===b.d)return true;
  const x=toNum(a),y=toNum(b);
  return Math.abs(x-y)<=tol+1e-9*Math.max(1,Math.abs(x),Math.abs(y));
}

// ---------- systemy liczbowe z częścią ułamkową ----------
// „101” i „101” przy podstawie 2 → dokładny zapis dziesiętny „5.625” (mianownik to potęga 2, więc zawsze się kończy)
function cBaseDec(ip,fp,base){
  let n=BigInt(parseInt(ip,base)),d=1n;const B=BigInt(base);
  for(const c of fp){n=n*B+BigInt(parseInt(c,16));d*=B}
  let k=0,dd=d;while(dd>1n){dd/=2n;k++}                       // d = 2^k (dla 8 i 16 też)
  const m=n*5n**BigInt(k),s=m.toString().padStart(k+1,'0');
  return k?s.slice(0,s.length-k)+'.'+s.slice(s.length-k):s;
}
// ułamek zwykły w innym systemie: część całkowita + cyfry po przecinku (mnożenie przez podstawę); bez końca → „…”
function cBaseDigits(v,base,max=24){
  const ip=Math.floor(v.n/v.d),out=[];let n=v.n-ip*v.d;
  while(n&&out.length<max){n*=base;out.push(Math.floor(n/v.d));n%=v.d}
  return {ip,ds:out,more:n!==0};
}
function cBaseStr(v,base){
  const x=cBaseDigits(v,base),dg=d=>d.toString(base).toUpperCase();
  return dg(x.ip)+(x.ds.length?','.replace(',',LANG.cur==='en'?'.':',')+x.ds.map(dg).join('')+(x.more?'…':''):'');
}

// ---------- zapis wyniku ----------
const cDec=s=>(LANG.cur==='en'?s:s.replace('.',',')).replace(/^-/,'−');
// liczba całkowita, od 10 000 z odstępami między tysiącami (po angielsku przecinki)
function cInt(n,grp){
  const s=String(Math.abs(n)),g=grp&&s.length>4&&/^\d+$/.test(s)?s.replace(/\B(?=(\d{3})+$)/g,LANG.cur==='en'?',':' '):s;
  return (n<0?'−':'')+g;
}
// liczba dziesiętna do 6 cyfr znaczących (bardzo duże i małe jako m·10^k); ex: zapis jest dokładny, więc „=”, a nie „≈”
function cNum(x){
  if(x===0||Object.is(x,-0))return {s:'0',ex:true};
  const ax=Math.abs(x),close=y=>Math.abs(y-x)<=1e-12*ax;
  if(ax>=1e9||ax<1e-4){const e=Math.floor(Math.log10(ax)),m=+(x/10**e).toPrecision(5);return {s:`${cDec(String(m))}·10<sup>${e<0?'−'+(-e):e}</sup>`,ex:close(m*10**e)}}
  const y=+x.toPrecision(6);return {s:cDec(String(y)),ex:close(y)};
}
const cNumF=x=>{const q=cNum(x);return q.ex?{eq:q.s}:{ap:q.s}};
// ułamek o skończonym rozwinięciu (mianownik 2^a·5^b), najwyżej 8 cyfr po przecinku: 981/200 → "4.905"
function cTerm(v){
  let d=v.d,a=0,b=0;while(d%2===0){d/=2;a++}while(d%5===0){d/=5;b++}
  const k=Math.max(a,b);if(d!==1||k>8)return null;
  let m=BigInt(v.n)*(10n**BigInt(k)/BigInt(v.d));const neg=m<0n;if(neg)m=-m;
  const s=m.toString().padStart(k+1,'0');
  return (neg?'-':'')+s.slice(0,s.length-k)+'.'+s.slice(s.length-k);
}
// dec: w linii są liczby dziesiętne, więc wynik też dziesiętny (bez 981/200)
function cFmt(v,dec,grp){
  if(isFr(v)){
    if(v.d===1)return {eq:cInt(v.n,grp)};
    const t=cTerm(v),fr=`${v.n<0?'−':''}${Math.abs(v.n)}/${v.d}`;
    if(dec)return t?{eq:cDec(t)}:cNumF(v.n/v.d);
    return t?{eq:fr,eq2:cDec(t)}:{eq:fr,ap:cDec(String(+(v.n/v.d).toPrecision(4)))};
  }
  if(!Number.isFinite(v))throw new CalcErr('nan');
  const r=Math.round(v);
  if(r!==0&&Math.abs(v-r)<1e-10*Math.abs(v)&&Math.abs(v)<1e15)return {eq:cInt(r,grp)};
  return cNumF(v);
}
// short: bez dopisków (≈ 0,8333 albo = 0,25 po ułamku), do krótkich komunikatów
function calcShow(v,dec,short){
  if(isMat(v)){
    let ap=false;
    const cell=x=>{const f=cFmt(x,dec,false);if(f.eq)return f.eq;ap=true;return f.ap};
    const body=v.mat.map(r=>r.map(cell).join(' ')).join('; ');
    return (ap?'≈ [':'= [')+body+']';
  }
  const f=cFmt(v,dec,true);
  if(!f.eq)return '≈ '+f.ap;
  return '= '+f.eq+(short?'':(f.eq2?' = '+f.eq2:'')+(f.ap?' ≈ '+f.ap:''));
}
function calcErrText(e){
  const m=e.message,k=m.split(':')[0];
  if(k==='var')return $t(`nieznana zmienna ${e.name}`,`unknown variable ${e.name}`);
  return {div0:$t('dzielenie przez 0','division by 0'),nan:$t('poza dziedziną','outside the domain'),log:$t('logarytm z liczby ≤ 0','logarithm of a number ≤ 0'),
    dims:$t('wymiary macierzy nie pasują','the matrix sizes do not match'),square:$t('macierz nie jest kwadratowa','the matrix is not square'),
    singular:$t('macierz nieodwracalna (det = 0)','the matrix is not invertible (det = 0)'),matpow:$t('potęga macierzy musi być całkowita','a matrix power must be an integer'),
    needmat:$t('tu potrzebna jest macierz','a matrix is needed here'),scalar:$t('tu potrzebna jest liczba','a number is needed here'),
    matnum:$t('nie dodaje się liczby do macierzy','a number cannot be added to a matrix'),matdiv:$t('nie dzieli się przez macierz','you cannot divide by a matrix'),
    ragged:$t('wiersze macierzy mają różne długości','the matrix rows have different lengths'),fact:$t('silnia tylko z liczb 0–170','factorial only of 0–170'),
    matexp:$t('wykładnik nie może być macierzą','the exponent cannot be a matrix'),nested:$t('element macierzy nie może być macierzą','a matrix entry cannot be a matrix'),
    base:$t('ta cyfra nie pasuje do systemu liczby','a digit does not fit the number base'),int:$t('tu potrzebna jest liczba ≥ 0','a number ≥ 0 is needed here')}[k]||$t('błąd','error');
}
// jednostki, które mogą stać na końcu linii: 20 m/s, 72 km/h, 9,81 m/s², 4 GB
const C_UNITS=new Set('m s g kg dag mg t km cm mm dm µm μm nm h min ms µs μs ns N kN mN J kJ MJ eV W kW MW Pa kPa hPa MPa bar Hz kHz MHz GHz V mV kV A mA Ω kΩ K mol l L ml C rad B kB KB MB GB TB KiB MiB GiB b kb Mb Gb bit bps'.split(' '));
const cUnit=u=>u==='°C'||u.length<=14&&u.split(/[/·*]/).every(p=>C_UNITS.has(p.replace(/(\^[-−]?\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/,'')));
const C_UNIT_RE=/^(.*?[\d)\]°!%])\s*([^\s\d()[\]+\-−*·×÷/:^|'=.,]\S*)$/;
// linie kartki; macierz pisana w kilku liniach („A = [1 2 3”, „4 5 6”, „7 8 9]”) łączy się w jedną,
// a jej wynik stoi przy ostatniej linii. → [{src, cont}] (cont: środek macierzy, bez wyniku)
function calcJoin(text){
  const raw=String(text).split('\n'),clean=s=>s.replace(/(^|\s)(#|\/\/).*$/,'').trim();
  const bal=s=>(s.match(/\[/g)||[]).length-(s.match(/\]/g)||[]).length,out=[];
  for(let i=0;i<raw.length;i++){
    const s=clean(raw[i]);
    if(bal(s)>0){
      let j=i,acc=s;
      // kolejne wiersze to same liczby i działania; linia z „=” albo nowym „[” kończy próbę
      while(bal(acc)>0&&j+1<raw.length&&j-i<30){const n=clean(raw[j+1]);if(/[=[]/.test(n))break;j++;if(!n)continue;acc+=(/[;[]$/.test(acc)||/^[;\]]/.test(n)?' ':'; ')+n}
      if(bal(acc)===0&&j>i){for(let k=i;k<j;k++)out.push({src:'',cont:true});out.push({src:acc});i=j;continue}
    }
    out.push({src:s});
  }
  return out;
}
// cała kartka: zmienne przechodzą z linii do linii.
// Każda linia → null albo {kind, html, cls, verdict} oraz dane do rozpisania (src, name, sides, env, dec):
//   kind 'val' wynik, 'check' sprawdzona równość (verdict: krótko, bez wyniku), 'err' błąd, 'note' uwaga (np. wymiar macierzy)
function calcLines(text,o={deg:true}){
  const env=new Map(),decV=new Set();
  const known=x=>env.has(x)||C_FUN.has(x)||x==='pi'||x==='π';
  const isDec=s=>/\d[.,]\d/.test(s)||(s.match(C_IDS)||[]).some(x=>decV.has(x));
  const has=x=>env.has(x);
  const parse=s=>{try{return calcParse(calcTokens(cNorm(s),has),has)}catch(e){if(e.message==='base')throw e;return null}};
  // wartość wyrażenia {v, unit, lit, litMat, base} albo null, gdy to raczej zwykły tekst; błąd w rachunku → wyjątek
  const value=src=>{
    src=src.trim();
    const bm=src.match(/^(bin|hex|oct)(?:\s*\((.+)\)|\s+(.+))$/i);
    if(bm){
      const r=value(bm[2]||bm[3]);if(!r)return null;
      if(!isFr(r.v)&&typeof r.v!=='number'||isMat(r.v)||toNum(r.v)<0)throw new CalcErr('int');
      if(!isFr(r.v))r.v=F(Math.round(r.v*1e6),1e6);
      return {...r,base:{bin:2,hex:16,oct:8}[bm[1].toLowerCase()],lit:false,litMat:false};
    }
    // linia bez cyfr i działań to tekst, chyba że składa się ze znanych nazw (np. „det B”)
    if(!/[\d+\-−*/·×÷:^()[\]√!°%|'⁰¹²³⁴⁵⁶⁷⁸⁹⁻ᵀ]/.test(src)&&!(src.match(C_IDS)||[]).every(known))return null;
    const ast=parse(src);let err=null;
    // sama liczba albo macierz z samych liczb: wynik powtórzyłby to, co wpisane
    const litMat=!!ast&&ast.t==='mat'&&ast.rows.every(r=>r.every(c=>c.t==='num'||c.t==='neg'&&c.a.t==='num'));
    if(ast){try{return {v:calcEval(ast,env,o),unit:'',lit:C_LIT.test(src),litMat,src}}catch(e){err=e}}
    if(!ast||err.message==='var'){
      const um=src.match(C_UNIT_RE),a2=um&&cUnit(um[2])?parse(um[1]):null;
      if(a2)return {v:calcEval(a2,env,o),unit:um[2],lit:C_LIT.test(um[1].trim()),litMat:false,src:um[1].trim()};
    }
    if(!ast)return null;
    if(err.message==='var'&&err.name&&err.name.length>=3&&!/\d/.test(err.name))return null;   // zwykłe słowo w notatce
    throw err;
  };
  const show=(r,dec,short)=>{
    if(r.base)return `= ${cBaseStr(r.v,r.base)}<sub>${r.base}</sub>`;
    return calcShow(r.v,dec,short)+(r.unit&&!isMat(r.v)?' '+escH(r.unit):'');
  };
  const dims=v=>$t(`macierz ${v.mat.length}×${v.mat[0].length}`,`${v.mat.length}×${v.mat[0].length} matrix`);
  const fail=e=>({kind:'err',cls:'err',html:e instanceof CalcErr?calcErrText(e):$t('błąd','error')});
  return calcJoin(text).map(L=>{
    if(L.cont||!L.src)return null;
    // bez numeracji „a)”, „2.”; „Pole: 3·4” liczy to, co po dwukropku
    let line=L.src.replace(/^(?:[a-zA-Z]|\d{1,2})[).]\s+/,'');
    const lab=line.match(/^([^:\d=()[\]]+):\s*(.+)$/);
    if(lab&&/\p{L}{2,}/u.test(lab[1])&&!(lab[1].match(C_IDS)||[]).every(known))line=lab[2];
    // „A[1 2; 3 4]” to też przypisanie macierzy
    const sm=line.match(new RegExp(`^([${C_L}][${C_L}0-9]*)\\s*(\\[[^\\[\\]]*\\])$`));
    if(sm&&!C_FUN.has(sm[1])&&!env.has(sm[1]))line=`${sm[1]} = ${sm[2]}`;
    if(!line)return null;
    const ctx={env:new Map(env),deg:!!o.deg};   // zmienne sprzed tej linii, do rozpisania
    try{
      // przypisanie: v0 = 72/3,6
      const m=line.match(C_ASG);
      if(m&&!C_FUN.has(m[1])){
        let r;
        try{r=value(m[2])}catch(e){env.delete(m[1]);throw e}
        if(!r)return null;
        const dec=isDec(m[2]);
        env.set(m[1],r.v);if(dec)decV.add(m[1]);else decV.delete(m[1]);
        if(r.litMat)return {kind:'note',cls:'note',html:dims(r.v),name:m[1],src:r.src,dec,...ctx};
        if(r.lit)return null;   // „a = 4”: nic nowego do pokazania
        return {kind:'val',cls:'',html:show(r,dec),name:m[1],src:r.src,unit:r.unit,base:r.base,dec,...ctx};
      }
      const sides=line.replace(/≈/g,'=').split('=');
      // „2 + 2 =” liczy lewą stronę
      if(sides.length===2&&!sides[1].trim()){
        const r=value(sides[0]);const dec=isDec(sides[0]);
        return r?{kind:'val',cls:'',html:show(r,dec),src:r.src,unit:r.unit,base:r.base,dec,...ctx}:null;
      }
      // „1/2 + 1/3 = 5/6” sprawdza równość; „10/3 = 3,33” przechodzi po zaokrągleniu
      if(sides.length===2&&sides[0].trim()){
        let L,Rv;
        try{L=value(sides[0]);Rv=value(sides[1])}catch(e){if(e.message==='var')return null;throw e}   // „2x = 10”: równanie do rozwiązania, nie rachunek
        if(!L||!Rv)return null;
        const dec=isDec(line),lit=s=>C_LIT.test(s.trim()),kd=s=>{const q=s.trim().match(/[.,](\d+)$/);return lit(s)&&q?q[1].length:0};
        const base={kind:'check',sides:[L.src,Rv.src],lv:L.v,rv:Rv.v,dec,...ctx};
        if(cSame(L.v,Rv.v))return {...base,cls:'ok',ok:true,html:$t('zgadza się','correct'),verdict:$t('zgadza się','correct')};
        const k=Math.max(kd(sides[0]),kd(sides[1]));
        if(k&&cSame(L.v,Rv.v,0.5*10**-k))return {...base,cls:'ok',ok:true,round:k,html:$t('zgadza się po zaokrągleniu','correct after rounding'),verdict:$t('zgadza się po zaokrągleniu','correct after rounding')};
        const tell=$t('lewa strona ','the left side ')+show(L,dec,true)+(lit(sides[1])?'':$t(', prawa ',', the right side ')+show(Rv,dec,true));
        return {...base,cls:'bad',ok:false,html:$t('nie zgadza się: ','does not match: ')+tell,verdict:$t('nie zgadza się','does not match')};
      }
      if(sides.length>1)return null;
      const r=value(line);if(!r)return null;
      if(r.litMat)return {kind:'note',cls:'note',html:dims(r.v),src:r.src,dec:isDec(line),...ctx};
      return r.lit?null:{kind:'val',cls:'',html:show(r,isDec(line)),src:r.src,unit:r.unit,base:r.base,dec:isDec(line),...ctx};
    }catch(e){return fail(e)}
  });
}
// do pokazania w zeszycie: {html, cls, kind, verdict} dla każdej linii
const calcText=(text,o)=>calcLines(text,o).map(r=>r&&{html:r.html,cls:r.cls,kind:r.kind,verdict:r.verdict});
// pierwsza strona zeszytu: krótki przykład tego, co umie kalkulator
function calcExample(){
  return $t('# Wynik pojawia się obok.\n1/2 + 1/3\nv0 = 72/3,6\ns = v0^2/(2·4)\nA = [2 1\n5 3]\ndet(A)\nA^-1\n2/3 + 1/4 = 11/12\n',
    '# Results show at line ends\n1/2 + 1/3\nv0 = 72/3.6\ns = v0^2/(2·4)\nA = [2 1\n5 3]\ndet(A)\nA^-1\n2/3 + 1/4 = 11/12\n');
}
// przykłady z pierwszej wersji zeszytu (każdy przedmiot miał swój): takich stron nie przenosimy do wspólnego zeszytu
const CALC_OLD_EXAMPLES=[
  '# Wynik pojawia się obok.\n1/2 + 1/3\nA = [2 1; 5 3]\ndet(A)\nA^-1\nA*A^-1\n2/3 + 1/4 = 11/12\n',
  '# Results show at line ends\n1/2 + 1/3\nA = [2 1; 5 3]\ndet(A)\nA^-1\nA*A^-1\n2/3 + 1/4 = 11/12\n',
  '# Wynik pojawia się obok.\n# 72 km/h na m/s:\nv0 = 72/3,6\na = 4 m/s²\ns = v0^2/(2a)\ng = 9,81\nt = 2v0·sin(30°)/g\n',
  '# Results show at line ends\n# 72 km/h in m/s:\nv0 = 72/3.6\na = 4 m/s²\ns = v0^2/(2a)\ng = 9.81\nt = 2v0·sin(30°)/g\n',
  '# Prawa: r = 4, w = 2, x = 1\nr = 4\nw = 2\nx = 1\nr+w+x\nr+x\n# rwxr-xr-x jako bity:\noct(0b111101101)\n# Hosty w sieci /24:\n2^8 - 2\n',
  '# Permissions: r=4, w=2, x=1\nr = 4\nw = 2\nx = 1\nr+w+x\nr+x\n# rwxr-xr-x as bits:\noct(0b111101101)\n# Hosts in a /24 network:\n2^8 - 2\n'];
