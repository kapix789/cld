// =====================================================================
//  „Rozpisz”: linia zeszytu krok po kroku, jako klatki odtwarzacza (play w app.js)
// =====================================================================
//  calcSteps(rekord z calcLines) → klatki [{sec, t, x, S, B, J, C, U}]
//  Liczby: kolejność działań (najpierw nawiasy, potęgi, mnożenie i dzielenie, na końcu dodawanie),
//  ułamki ze wspólnym mianownikiem i skracaniem, pierwiastki, funkcje, systemy liczbowe.
//  Macierze: gotowe klatki silnika algebry (detFrames, invFrames, mulFrames, transFrames,
//  scaleFrames, sumFrames, gaussFrames); wyznacznik 4×4 i większy rozwinięciem Laplace’a.
// =====================================================================
const stLit=(v,o={})=>({t:'lit',v,...o});
const stName=s=>{const m=s.match(/^(\D+?)_?(\d*)$/);return m?`<i>${escH(m[1])}</i>${m[2]?`<sub>${m[2]}</sub>`:''}`:`<i>${escH(s)}</i>`};
const stFrac=(p,q)=>q===1?cInt(p):`${p<0?'−':''}<span class="fr"><span>${Math.abs(p)}</span><span>${q}</span></span>`;
const stIsFrM=v=>isMat(v)&&v.mat.every(r=>r.every(isFr));
const stEq=v=>isMat(v)||isFr(v)||cNum(v).ex?'=':'≈';
function stNum(v,dec){
  if(isFr(v)){
    if(v.d===1)return cInt(v.n,false);
    if(dec){const t=cTerm(v);return t?cDec(t):cNum(v.n/v.d).s}
    return v.html();
  }
  return cNum(v).s;
}
const stMatH=(v,dec)=>`<span class="mat" style="grid-template-columns:repeat(${v.mat[0].length},auto)">${v.mat.flat().map(x=>`<span>${stNum(x,dec)}</span>`).join('')}</span>`;

// ---------- drzewo kroków: liczby, ułamki 1/2 i zmienne to od razu gotowe wartości (lit) ----------
function stFrom(n,X){
  switch(n.t){
    case 'num':{
      const v=calcEval(n,X.env,X.o);
      if(n.raw){X.bases.push({raw:n.raw,v});return stLit(v,{txt:n.raw})}
      return stLit(v,{txt:cDec(n.v.replace(/^\./,'0.'))});
    }
    case 'var':{
      if(X.env.has(n.n)){const v=X.env.get(n.n);if(isMat(v))return stLit(v,{lab:stName(n.n)});X.subs.set(n.n,v);return stLit(v,{name:n.n})}
      if(n.n==='pi'||n.n==='π')return stLit(Math.PI,{txt:'π',pi:true});
      if(n.n==='e')return stLit(Math.E,{txt:'e'});
      throw Object.assign(new CalcErr('var'),{name:n.n});
    }
    case 'bin':{
      const a=stFrom(n.a,X),b=stFrom(n.b,X);
      // 1/2 wpisane jako skrócony ułamek to liczba, a nie dzielenie do rozpisania
      if(n.o==='/'&&a.txt&&b.txt&&isFr(a.v)&&isFr(b.v)&&a.v.d===1&&b.v.d===1&&b.v.n>1&&gcd(a.v.n,b.v.n)===1&&!/[.,xbo]/i.test(a.txt+b.txt))return stLit(a.v.div(b.v),{frac:true});
      return {t:'bin',o:n.o,a,b};
    }
    case 'neg':{
      const a=stFrom(n.a,X);
      if(a.t==='lit'&&!isMat(a.v)&&(a.txt&&!a.pi||a.frac))return stLit(cNeg(a.v),a.txt?{txt:'−'+a.txt}:{frac:true});
      return {t:'neg',a};
    }
    case 'pow':return {t:'pow',a:stFrom(n.a,X),b:stFrom(n.b,X)};
    case 'post':return {t:'post',o:n.o,a:stFrom(n.a,X)};
    case 'call':return {t:'call',f:n.f,a:stFrom(n.a,X)};
    case 'mat':{
      const rows=n.rows.map(r=>r.map(c=>stFrom(c,X)));
      if(rows.every(r=>r.every(c=>c.t==='lit'&&!isMat(c.v))))return stLit({mat:rows.map(r=>r.map(c=>c.v))});
      return {t:'mat',rows};
    }
  }
  throw new CalcErr('?');
}
const stKids=n=>n.t==='bin'||n.t==='pow'?[n.a,n.b]:n.t==='mat'?n.rows.flat():n.t==='lit'?[]:[n.a];
const stNeg=n=>n.t==='neg'||n.t==='lit'&&!isMat(n.v)&&!n.name&&toNum(n.v)<0;
// pojedynczy „atom”: nie potrzebuje nawiasu jako podstawa potęgi albo argument funkcji
const stAtom=n=>n.t==='lit'&&(isMat(n.v)||n.lab||!stNeg(n)&&(!isFr(n.v)||n.v.d===1||n.txt))||n.t==='call';
const ST_FN={sqrt:'√',sin:'sin',cos:'cos',tg:'tg',tan:'tg',ctg:'ctg',cot:'ctg',arcsin:'arcsin',asin:'arcsin',arccos:'arccos',acos:'arccos',arctg:'arctg',arctan:'arctg',atan:'arctg',ln:'ln',log:'log',lg:'log',log2:'log<sub>2</sub>',exp:'exp',det:'det',rz:'rz',rank:'rz',tr:'tr',rref:'rref'};
function stH(n,mk,o){
  const prec=x=>x.t==='bin'?(x.o==='+'||x.o==='-'?1:2):stNeg(x)?3:x.t==='pow'?4:x.t==='post'?5:9;
  const sub=(c,need)=>{const h=stH(c,mk,o);return need?`(${h})`:h};
  let h;
  if(n.t==='lit'){
    if(n.lab)h=n.lab;
    else if(isMat(n.v))h=stMatH(n.v,o.dec);
    else if(o.names&&n.name)h=stName(n.name);
    else if(n.txt)h=escH(n.txt);
    else h=stNum(n.v,o.dec);
  }else if(n.t==='bin'){
    // kreska ułamkowa dla prostych liczb; gdy w liczniku albo mianowniku jest już ułamek, piszemy „:”
    const frq=x=>x.t==='lit'&&!isMat(x.v)&&isFr(x.v)&&x.v.d!==1&&!o.dec||x.t==='bin'&&x.o==='/'||x.t==='lit'&&isMat(x.v);
    if(n.o==='/'&&!frq(n.a)&&!frq(n.b))h=`<span class="fr"><span>${stH(n.a,mk,o)}</span><span>${stH(n.b,mk,o)}</span></span>`;
    else{
      const p=n.o==='+'||n.o==='-'?1:2;
      h=`${sub(n.a,prec(n.a)<p)} ${{'+':'+','-':'−','*':'·','/':':'}[n.o]} ${sub(n.b,prec(n.b)<p||prec(n.b)===p&&(n.o==='-'||n.o==='/')||stNeg(n.b))}`;
    }
  }else if(n.t==='neg')h='−'+sub(n.a,prec(n.a)<=3);
  else if(n.t==='pow')h=sub(n.a,!stAtom(n.a))+`<sup>${stH(n.b,mk,o)}</sup>`;
  else if(n.t==='post')h=sub(n.a,!stAtom(n.a))+{'!':'!','°':'°','%':'%',T:'<sup>T</sup>'}[n.o];
  else if(n.t==='call'){
    const a=stH(n.a,mk,o);
    if(n.f==='abs')h=`|${a}|`;
    else if(n.f==='inv')h=sub(n.a,!stAtom(n.a))+'<sup>−1</sup>';
    else if(n.f==='sqrt'||n.f==='√')h='√'+(stAtom(n.a)?a:`(${a})`);
    else if(['det','rz','rank','tr'].includes(n.f))h=`${ST_FN[n.f]} ${stAtom(n.a)?a:`(${a})`}`;
    else h=`${ST_FN[n.f]||n.f}(${a})`;
  }else if(n.t==='mat')h=`<span class="mat" style="grid-template-columns:repeat(${n.rows[0].length},auto)">${n.rows.flat().map(c=>`<span>${stH(c,mk,o)}</span>`).join('')}</span>`;
  const c=mk&&mk.get(n);
  return c?`<span class="${c}">${h}</span>`:h;
}
// węzły gotowe do policzenia: wszystkie ich dzieci to już wartości (od lewej do prawej)
function stReady(n,out=[]){if(n.t==='lit')return out;const k=stKids(n);if(k.every(c=>c.t==='lit'))out.push(n);else k.forEach(c=>stReady(c,out));return out}
function stSwap(n,map){
  if(map.has(n))return map.get(n);
  if(n.t==='lit')return n;
  if(n.t==='bin'||n.t==='pow')return {...n,a:stSwap(n.a,map),b:stSwap(n.b,map)};
  if(n.t==='mat')return {...n,rows:n.rows.map(r=>r.map(c=>stSwap(c,map)))};
  return {...n,a:stSwap(n.a,map)};
}
const stCount=n=>n.t==='lit'?0:1+stKids(n).reduce((s,c)=>s+stCount(c),0);
const stHasMat=n=>n.t==='lit'?isMat(n.v):stKids(n).some(stHasMat);
const stHasAdd=n=>n.t==='bin'&&(n.o==='+'||n.o==='-')||stKids(n).some(stHasAdd);

// ---------- jeden krok na liczbach: {cls, t, x, C} (C: linie rachunku), quiet: bez osobnej klatki ----------
const ST_TRIG={0:['0','1','0'],30:['1/2','√3/2','√3/3'],45:['√2/2','√2/2','1'],60:['√3/2','1/2','√3'],90:['1','0','—']};
function stOp(n,r,X){
  const dec=X.dec,N=v=>stNum(v,dec),a=n.a&&n.a.v,b=n.b&&n.b.v,P=v=>!isMat(v)&&toNum(v)<0?`(${N(v)})`:N(v);
  const fr=v=>isFr(v)&&!dec;
  if(n.t==='neg')return {cls:'neg',quiet:true};
  if(n.t==='bin'&&(n.o==='+'||n.o==='-')){
    const add=n.o==='+',sg=add?'+':'−';
    if(fr(a)&&fr(b)&&(a.d!==1||b.d!==1)){
      const L=lcmN(a.d,b.d),pa=a.n*(L/a.d),pb=b.n*(L/b.d),s=add?pa+pb:pa-pb,C=[];
      if(a.d!==L)C.push(`${N(a)} = ${stFrac(pa,L)}`);
      if(b.d!==L)C.push(`${N(b)} = ${stFrac(pb,L)}`);
      C.push(`${stFrac(pa,L)} ${sg} ${pb<0?`(${stFrac(pb,L)})`:stFrac(pb,L)} = ${stFrac(s,L)}`);
      const g=gcd(s,L);if(g>1&&s!==0)C.push(`${stFrac(s,L)} = ${N(r)}`+$t(` (skracamy przez ${g})`,` (cancel by ${g})`));
      return {cls:'add',frac:true,C,x:$t(`Ułamki ${add?'dodajemy':'odejmujemy'}, gdy mają ten sam mianownik. Najmniejszy wspólny mianownik ${a.d} i ${b.d} to ${L}: rozszerzamy ułamki${a.d===1||b.d===1?' (liczba całkowita to ułamek o mianowniku 1)':''}, a potem ${add?'dodajemy':'odejmujemy'} liczniki.`,`Fractions are ${add?'added':'subtracted'} once they have the same denominator. The lowest common denominator of ${a.d} and ${b.d} is ${L}: expand the fractions${a.d===1||b.d===1?' (a whole number is a fraction with denominator 1)':''}, then ${add?'add':'subtract'} the numerators.`)};
    }
    return {cls:'add',C:[`${N(a)} ${sg} ${P(b)} ${stEq(r)} ${N(r)}`]};
  }
  if(n.t==='bin'&&n.o==='*'){
    if(fr(a)&&fr(b)&&(a.d!==1||b.d!==1)){
      const p=a.n*b.n,q=a.d*b.d,C=[`${P(a)} · ${P(b)} = ${stFrac(p,q)}`];
      const g=gcd(p,q);if(g>1&&p!==0)C.push(`${stFrac(p,q)} = ${N(r)}`+$t(` (skracamy przez ${g})`,` (cancel by ${g})`));
      return {cls:'mul',frac:true,C,x:$t('Ułamki mnożymy tak: licznik razy licznik, mianownik razy mianownik. Na końcu skracamy.','To multiply fractions, multiply the numerators and multiply the denominators. Then cancel.')};
    }
    return {cls:'mul',C:[`${P(a)} · ${P(b)} ${stEq(r)} ${N(r)}`]};
  }
  if(n.t==='bin'&&n.o==='/'){
    if(fr(a)&&fr(b)){
      if(a.d===1&&b.d===1){
        if(r.d===1)return {cls:'mul',C:[`${P(a)} : ${P(b)} = ${N(r)}`]};
        const g=gcd(a.n,b.n);
        if(n.tight&&g>1)return {cls:'mul',frac:true,t:['Skracanie ułamka','Simplifying a fraction'],C:[`${stFrac(a.n,b.n)} = ${N(r)}`+$t(` (dzielimy licznik i mianownik przez ${g})`,` (divide the numerator and the denominator by ${g})`)]};
        return {cls:'mul',frac:true,C:[`${P(a)} : ${P(b)} = ${stFrac(a.n,b.n)}`+(g>1?` = ${N(r)}`+$t(` (skracamy przez ${g})`,` (cancel by ${g})`):'')],x:$t('Dzielenie, które nie wychodzi równo, zapisujemy jako ułamek.','A division that does not come out even is written as a fraction.')};
      }
      const ib=F(1).div(b),p=a.n*ib.n,q=a.d*ib.d,g=gcd(p,q);
      const C=[`${P(a)} : ${P(b)} = ${P(a)} · ${P(ib)}`,`${P(a)} · ${P(ib)} = ${stFrac(p,q)}`+(g>1?` = ${N(r)}`:'')];
      return {cls:'mul',frac:true,C,x:$t(`Dzielenie przez ułamek to mnożenie przez jego odwrotność: ${N(b)} odwracamy na ${N(ib)}.`,`Dividing by a fraction means multiplying by its reciprocal: ${N(b)} turns into ${N(ib)}.`)};
    }
    return {cls:'mul',C:[`${P(a)} : ${P(b)} ${stEq(r)} ${N(r)}`]};
  }
  if(n.t==='pow'){
    const t=$t('Potęga','Power');
    if(isFr(b)&&b.d===1&&isFr(r)){
      const k=b.n,base=P(a);
      if(k===0)return {cls:'pow',C:[`${base}<sup>0</sup> = 1`],x:$t('Każda liczba różna od zera do potęgi 0 daje 1.','Any nonzero number to the power 0 is 1.')};
      if(k<0)return {cls:'pow',C:[`${base}<sup>−${-k}</sup> = 1 : ${base}<sup>${-k}</sup> = ${N(r)}`],x:$t('Potęga o ujemnym wykładniku to odwrotność potęgi o dodatnim wykładniku.','A negative exponent means the reciprocal of the positive power.')};
      if(k>=2&&k<=6)return {cls:'pow',C:[`${base}<sup>${k}</sup> = ${Array(k).fill(base).join(' · ')} = ${N(r)}`],x:isFr(a)&&a.d!==1?$t('Ułamek podnosimy do potęgi, podnosząc licznik i mianownik.','A fraction is raised to a power by raising its numerator and denominator.'):''};
      return {cls:'pow',C:[`${base}<sup>${k}</sup> = ${N(r)}`],x:k>6?$t(`To iloczyn ${k} jednakowych czynników.`,`That is a product of ${k} equal factors.`):''};
    }
    return {cls:'pow',C:[`${P(a)}<sup>${N(b)}</sup> ≈ ${N(r)}`],x:$t('Wykładnik nie jest liczbą całkowitą, więc wynik jest przybliżony.','The exponent is not a whole number, so the result is approximate.')};
  }
  if(n.t==='post'){
    if(n.o==='T')return {cls:'post',quiet:true};
    if(n.o==='°')return X.o.deg?{cls:'post',quiet:true}:{cls:'post',C:[`${N(a)}° = ${N(a)} · π : 180 ≈ ${N(r)}`],x:$t('Kąt w stopniach zamieniamy na radiany: mnożymy przez π i dzielimy przez 180.','Degrees become radians: multiply by π and divide by 180.')};
    if(n.o==='%')return {cls:'post',C:[`${N(a)}% = ${N(a)} : 100 = ${N(r)}`],x:$t('Procent to setna część.','A percent is one hundredth.')};
    const k=toNum(a);
    return {cls:'post',C:[`${N(a)}! = ${k<2?'1':Array.from({length:k},(_,i)=>i+1).slice(0,10).join(' · ')+(k>10?' · …':'')} = ${N(r)}`],x:$t('Silnia to iloczyn kolejnych liczb od 1 do danej liczby.','A factorial is the product of the numbers from 1 up to the given number.')};
  }
  if(n.t==='call'){
    const f=n.f,A=N(a);
    if(f==='abs')return {cls:'call',C:[`|${A}| = ${N(r)}`],x:$t('Wartość bezwzględna to liczba bez znaku minus.','The absolute value is the number without its minus sign.')};
    if(f==='sqrt'||f==='√'){
      if(isFr(r))return {cls:'call',C:[`√${stAtom(n.a)?A:`(${A})`} = ${N(r)}`],x:$t(`Bo ${P(r)}<sup>2</sup> = ${A}.`,`Because ${P(r)}<sup>2</sup> = ${A}.`)};
      return {cls:'call',C:[`√${stAtom(n.a)?A:`(${A})`} ≈ ${N(r)}`],x:$t(`${A} nie jest kwadratem liczby wymiernej, więc pierwiastek podajemy w przybliżeniu.`,`${A} is not the square of a rational number, so the root is approximate.`)};
    }
    if(['sin','cos','tg','tan','ctg','cot'].includes(f)){
      const deg=X.o.deg&&!hasPi(n.a),ang=deg?toNum(a):toNum(a)/RAD,k=['sin','cos','tg','tan','ctg','cot'].indexOf(f),idx=k<2?k:2;
      const exact=Math.abs(ang-Math.round(ang))<1e-9&&ST_TRIG[Math.round(ang)]&&k<4?ST_TRIG[Math.round(ang)][idx]:null;
      const lab=`${ST_FN[f]}(${deg?A+'°':A})`;
      return {cls:'call',C:[exact&&exact!=='—'?`${lab} = ${exact}${/√/.test(exact)?` ≈ ${N(r)}`:''}`:`${lab} ${stEq(r)} ${N(r)}`],
        x:exact?$t(`${Math.round(ang)}° to kąt z tabeli wartości funkcji trygonometrycznych.`,`${Math.round(ang)}° is in the table of trigonometric values.`):deg?'':$t('Kąt jest w radianach.','The angle is in radians.')};
    }
    if(['arcsin','asin','arccos','acos','arctg','arctan','atan'].includes(f)){
      const g={arcsin:'sin',asin:'sin',arccos:'cos',acos:'cos'}[f]||'tg';
      return {cls:'call',C:[`${ST_FN[f]}(${A}) ${stEq(r)} ${N(r)}${X.o.deg?'°':''}`],x:$t(`Szukamy kąta, którego ${g} wynosi ${A}.`,`We look for the angle whose ${g==='tg'?'tan':g} is ${A}.`)};
    }
    if(['log','lg','log2','ln'].includes(f)){
      const B=f==='log2'?'2':f==='ln'?'e':'10';
      if(isFr(r))return {cls:'call',C:[`${ST_FN[f]}(${A}) = ${N(r)}`],x:$t(`Bo ${B}<sup>${N(r)}</sup> = ${A}.`,`Because ${B}<sup>${N(r)}</sup> = ${A}.`)};
      return {cls:'call',C:[`${ST_FN[f]}(${A}) ≈ ${N(r)}`],x:$t(`Szukamy wykładnika, do którego trzeba podnieść ${B}, żeby dostać ${A}.`,`We look for the exponent that turns ${B} into ${A}.`)};
    }
    if(f==='exp')return {cls:'call',C:[`e<sup>${A}</sup> ≈ ${N(r)}`]};
  }
  return {cls:'other',C:[`= ${isMat(r)?stMatH(r,dec):N(r)}`]};
}
const ST_TITLE={add:['Dodawanie i odejmowanie','Addition and subtraction'],mul:['Mnożenie i dzielenie','Multiplication and division'],pow:['Potęgi','Powers'],post:['Silnia, procent, stopnie','Factorial, percent, degrees'],call:['Funkcje','Functions'],other:['Rachunek','Working']};
const ST_TITLE_FR={add:['Dodawanie ułamków','Adding fractions'],mul:['Mnożenie i dzielenie ułamków','Multiplying and dividing fractions']};

// ---------- działania na macierzach: klatki silnika algebry ----------
function stDet(A,lab,sec,detailed=true){
  const n=A.length;
  if(n<=3)return detFrames(A,lab,sec,detailed&&n===3);
  // Laplace: rozwijamy względem wiersza albo kolumny z największą liczbą zer
  let best={z:-1};
  for(let i=0;i<n;i++){const z=A[i].filter(x=>x.z).length;if(z>best.z)best={z,row:true,k:i}}
  for(let j=0;j<n;j++){const z=A.filter(r=>r[j].z).length;if(z>best.z)best={z,row:false,k:j}}
  const k=best.k,el=i=>best.row?A[k][i]:A[i][k],minor=i=>{const r=best.row?k:i,c=best.row?i:k;return A.filter((_,a)=>a!==r).map(x=>x.filter((_,b)=>b!==c))};
  const terms=[],fr=[];let sum=F(0);
  for(let i=0;i<n;i++){
    if(el(i).z)continue;
    const r=best.row?k:i,c=best.row?i:k,sg=(r+c)%2?-1:1,ml=`<i>M</i><sub>${r+1}${c+1}</sub>`,d=detF(minor(i));
    terms.push({sg,a:el(i),ml,d,r,c});sum=sum.add(el(i).mul(d).mul(F(sg)));
  }
  const where=best.row?$t(`wiersza ${k+1}`,`row ${k+1}`):$t(`kolumny ${k+1}`,`column ${k+1}`);
  const hl=best.row?{rows:{[k]:'src'}}:{cols:{[k]:'src'}};
  fr.push({sec,t:$t(`${lab}: rozwinięcie Laplace’a względem ${where}`,`${lab}: Laplace expansion along ${where}`),
    x:$t(`Bierzemy ${where} z największą liczbą zer. Każdy jej element mnożymy przez (−1)<sup><i>i</i>+<i>j</i></sup> i wyznacznik macierzy bez jego wiersza i kolumny (minor <i>M</i><sub><i>ij</i></sub>). Zera pomijamy.`,`Take ${where}, which has the most zeros. Each of its entries is multiplied by (−1)<sup><i>i</i>+<i>j</i></sup> and by the determinant of the matrix without its row and column (the minor <i>M</i><sub><i>ij</i></sub>). Zeros are skipped.`),
    B:[bd(A,{det:true,lab,hl})],C:[{h:`${lab} = ${terms.map((t,q)=>`${q?(t.sg>0?' + ':' − '):(t.sg>0?'':'−')}${fmt(t.a)} · det ${t.ml}`).join('')}`,full:true}],U:[{t:.5,line:0}]});
  for(const t of terms)fr.push(...stDet(minor(best.row?t.c:t.r),`det ${t.ml}`,sec,false));
  fr.push({sec,t:`${lab} = ${sum.html()}`,x:$t('Wstawiamy policzone minory.','Put the computed minors in.'),B:[bd(A,{det:true,lab})],
    C:[{h:`${lab} = ${terms.map((t,q)=>`${q?(t.sg>0?' + ':' − '):(t.sg>0?'':'−')}${fmt(t.a)} · ${fmt(t.d)}`).join('')} = <b>${sum.html()}</b>`,full:true}],U:[{t:.5,line:0}]});
  return fr;
}
let stM=0;
const stMLab=()=>`<i>M</i><sub>${++stM}</sub>`;
const stPar=l=>/[ +−]/.test(l.replace(/<[^>]+>/g,''))?`(${l})`:l;
// → {frames, lab} albo null, gdy to nie działanie na macierzach
function stMatOp(n,r,X){
  const sec=$t('Macierze','Matrices'),A=n.a&&n.a.v,B=n.b&&n.b.v;
  const lbl=x=>x&&x.t==='lit'&&isMat(x.v)?(x.lab||stMatH(x.v,X.dec)):'',la=lbl(n.a),lb=lbl(n.b);
  const ok=[A,B,r].filter(isMat).every(stIsFrM)&&[A,B].every(v=>v===undefined||isMat(v)||isFr(v));
  const done=(frames,lab)=>({frames,lab});
  const fallback=lab=>done([{sec,t:lab,x:$t('Wynik działania na macierzach.','The result of the matrix operation.'),S:`<div class="eq">${lab} = ${stMatH(r,X.dec)}</div>`}],lab);
  if(n.t==='call'&&n.f==='det'){
    const lab=`det ${stPar(la)}`;
    return {frames:ok?stDet(A.mat,lab,sec):[{sec,t:lab,S:`<div class="eq">${lab} ${isFr(r)?'=':'≈'} ${stNum(r,X.dec)}</div>`}],scalar:true};
  }
  if(n.t==='call'&&n.f==='abs'&&isMat(A))return stMatOp({...n,f:'det'},r,X);
  if(n.t==='call'&&(n.f==='rz'||n.f==='rank')){
    const lab=`rz ${stPar(la)}`;
    if(!ok)return {frames:[{sec,t:`${lab} = ${stNum(r,X.dec)}`}],scalar:true};
    const g=gaussFrames(A.mat,A.mat[0].length,{mode:'rank',lab:la,sec});
    g.frames.push({sec,t:`${lab} = ${stNum(r,X.dec)}`,x:$t(`Rząd to liczba niezerowych wierszy w postaci schodkowej: ${stNum(r,X.dec)}.`,`The rank is the number of nonzero rows in row echelon form: ${stNum(r,X.dec)}.`),B:[bd(g.A,{lab:la})]});
    return {frames:g.frames,scalar:true};
  }
  if(n.t==='call'&&n.f==='tr'){
    const lab=`tr ${stPar(la)}`,d=A.mat.map((row,i)=>row[i]);
    return {frames:[{sec,t:`${lab} = ${stNum(r,X.dec)}`,x:$t('Ślad to suma liczb na przekątnej.','The trace is the sum of the diagonal.'),B:ok?[bd(A.mat,{lab:la,hl:{cells:Object.fromEntries(d.map((_,i)=>[i+','+i,'res']))}})]:undefined,
      C:[{h:`${lab} = ${d.map(x=>stNum(x,X.dec)).join(' + ')} = <b>${stNum(r,X.dec)}</b>`,full:true}],U:[{t:.5,line:0}]}],scalar:true};
  }
  if(!isMat(r))return null;
  if(!ok)return fallback(stMLab());
  if(n.t==='call'&&n.f==='inv'||n.t==='pow'&&isFr(B)&&B.n===-1&&B.d===1){const lab=`${stPar(la)}<sup>−1</sup>`;return done(invFrames(A.mat,la,lab,sec).frames,lab)}
  if(n.t==='post'&&n.o==='T'){const lab=`${stPar(la)}<sup>T</sup>`;return done(transFrames(A.mat,la,lab,sec),lab)}
  if(n.t==='pow'&&isFr(B)&&B.d===1&&B.n>=2&&B.n<=5){
    const fr=[];let P=A.mat,lp=la;
    for(let k=2;k<=B.n;k++){const lab=`${stPar(la)}<sup>${k}</sup>`,m=mulFrames(P,A.mat,{a:lp,b:la,c:lab},sec);fr.push(...m.frames);P=m.R;lp=lab}
    return done(fr,lp);
  }
  if(n.t==='bin'&&n.o==='*'){
    if(isMat(A)&&isMat(B)){const lab=n.a.lab&&n.b.lab?la+lb:stMLab();const m=mulFrames(A.mat,B.mat,{a:stPar(la),b:stPar(lb),c:lab},sec);return done(m.frames,lab)}
    const k=isMat(A)?B:A,M_=isMat(A)?A:B,lm=isMat(A)?la:lb,lab=`${stNum(k,false)}${stPar(lm)}`;
    return done(scaleFrames(k,M_.mat,lm,lab,sec),lab);
  }
  if(n.t==='bin'&&n.o==='/'&&isMat(A)&&isFr(B)){const k=F(1).div(B),lab=`${stPar(la)} : ${stNum(B,false)}`;return done(scaleFrames(k,A.mat,la,lab,sec),lab)}
  if(n.t==='bin'&&(n.o==='+'||n.o==='-')){const lab=`${la} ${n.o==='+'?'+':'−'} ${stPar(lb)}`;return done(sumFrames(A.mat,B.mat,n.o==='+'?1:-1,la,lb,lab),lab)}
  if(n.t==='neg'){const lab='−'+stPar(la);return done(scaleFrames(F(-1),A.mat,la,lab,sec),lab)}
  return fallback(stMLab());
}

// ---------- systemy liczbowe ----------
const stDigit=d=>d<10?String(d):String.fromCharCode(55+d);
function stBaseIn(raw,v){
  const base={b:2,x:16,o:8}[raw[1].toLowerCase()],[ip,fp='']=raw.slice(2).split(/[.,]/),ds=[...ip].map(c=>parseInt(c,16)),k=ds.length,fs=[...fp].map(c=>parseInt(c,16));
  const name={2:$t('dwójkowym','binary'),8:$t('ósemkowym','octal'),16:$t('szesnastkowym','hexadecimal')}[base];
  const dd=d=>base===16&&d>9?`${stDigit(d)}(${d})`:d;
  const terms=[...ds.map((d,i)=>`${dd(d)}·${base}<sup>${k-1-i}</sup>`),...fs.map((d,i)=>`${dd(d)}·${base}<sup>−${i+1}</sup>`)];
  const vals=[...ds.map((d,i)=>String(d*base**(k-1-i))),...fs.map((d,i)=>stFrac(d,base**(i+1)))];
  return {sec:$t('Systemy liczbowe','Number bases'),t:$t(`${escH(raw)} w systemie dziesiętnym`,`${escH(raw)} in decimal`),
    x:$t(`Zapis w systemie ${name}: każda cyfra mnoży kolejną potęgę ${base}, licząc od prawej od ${base}<sup>0</sup>.${fs.length?` Cyfry po przecinku mnożą ujemne potęgi: ${base}<sup>−1</sup>, ${base}<sup>−2</sup> i tak dalej.`:''}`,`In ${name} each digit multiplies the next power of ${base}, counting from the right from ${base}<sup>0</sup>.${fs.length?` Digits after the point multiply negative powers: ${base}<sup>−1</sup>, ${base}<sup>−2</sup> and so on.`:''}`),
    C:[{h:`${escH(raw)} = ${terms.join(' + ')}`,full:true},{h:`= ${vals.join(' + ')} = <b>${stNum(v,true)}</b>`,full:true}],U:[{t:.4,line:0},{t:1.4,line:1}]};
}
function stBaseOut(v,base){
  if(isFr(v)&&v.d!==1)return stBaseFrac(v,base);
  const n=toNum(v),name={2:$t('dwójkowy','binary'),8:$t('ósemkowy','octal'),16:$t('szesnastkowy','hexadecimal')}[base],C=[],U=[];let x=n;
  if(x===0)C.push('0');
  while(x>0&&C.length<40){const q=Math.floor(x/base),d=x%base;C.push(`${x} : ${base} = ${q}, ${$t('reszta','remainder')} ${d}${d>9?` (${stDigit(d)})`:''}`);x=q}
  C.forEach((_,k)=>U.push({t:.4+k*.5,line:k}));
  C.push({h:$t('reszty czytane od dołu: ','remainders read from the bottom: ')+`<b>${n.toString(base).toUpperCase()}<sub>${base}</sub></b>`,full:true});U.push({t:.4+C.length*.5,line:C.length-1});
  return {sec:$t('Systemy liczbowe','Number bases'),t:$t(`${n} na system ${name}`,`${n} to ${name}`),x:$t(`Dzielimy przez ${base}, dopóki nie zostanie 0, i zapisujemy reszty. Reszty czytane od ostatniej do pierwszej to cyfry wyniku.`,`Divide by ${base} until 0 is left, writing down the remainders. Read from the last to the first, they are the digits of the result.`),C,U};
}

// część ułamkowa: mnożymy przez podstawę i zapisujemy część całkowitą wyniku
function stBaseFrac(v,base){
  const name={2:$t('dwójkowy','binary'),8:$t('ósemkowy','octal'),16:$t('szesnastkowy','hexadecimal')}[base],x=cBaseDigits(v,base,12),C=[],U=[];
  const ip=x.ip;let f=F(v.n-ip*v.d,v.d);
  C.push($t(`część całkowita ${ip} = ${ip.toString(base).toUpperCase()}<sub>${base}</sub>`,`whole part ${ip} = ${ip.toString(base).toUpperCase()}<sub>${base}</sub>`));
  for(const d of x.ds){const p=f.mul(F(base));C.push(`${stNum(f,true)} · ${base} = ${stNum(p,true)} → ${stDigit(d)}`);f=p.sub(F(Math.floor(p.n/p.d)))}
  if(x.more)C.push($t('… i tak dalej: rozwinięcie się nie kończy','… and so on: the expansion never ends'));
  C.forEach((_,k)=>U.push({t:.4+k*.5,line:k}));
  C.push({h:$t('wynik: ','result: ')+`<b>${cBaseStr(v,base)}<sub>${base}</sub></b>`,full:true});U.push({t:.4+C.length*.5,line:C.length-1});
  return {sec:$t('Systemy liczbowe','Number bases'),t:$t(`${stNum(v,true)} na system ${name}`,`${stNum(v,true)} to ${name}`),
    x:$t(`Część całkowitą zamieniamy jak zwykle (dzielenie przez ${base}). Część ułamkową mnożymy przez ${base}: część całkowita iloczynu to kolejna cyfra po przecinku, a dalej mnożymy to, co zostało po przecinku.`,`The whole part is converted as usual (dividing by ${base}). The fractional part is multiplied by ${base}: the whole part of the product is the next digit after the point, and we keep multiplying what is left after the point.`),C,U};
}

// ---------- całe wyrażenie ----------
function stExpr(src,X,sec){
  const has=x=>X.env.has(x),ast=calcParse(calcTokens(cNorm(src),has),has);
  X.subs=new Map();X.bases=[];
  let tree=stFrom(ast,X);
  const fr=[],ops=stCount(tree);
  const intro=[];
  if(ops>1&&!stHasMat(tree))intro.push($t('Kolejność: najpierw nawiasy, potem potęgi i funkcje, potem mnożenie i dzielenie, na końcu dodawanie i odejmowanie. Działania tego samego rodzaju liczymy od lewej.','Order: brackets first, then powers and functions, then multiplication and division, and addition and subtraction last. Operations of the same kind go from left to right.'));
  if(X.subs.size)intro.push($t('Podstawiamy wartości zmiennych: ','We substitute the variables: ')+[...X.subs].map(([k,v])=>`${stName(k)} = ${stNum(v,X.dec)}`).join(', ')+'.');
  if(intro.length)fr.push({sec,t:X.subs.size?$t('Podstawiamy','Substituting'):$t('Zapisujemy działanie','Writing it down'),x:intro.join(' '),
    S:`<div class="eq">${stH(tree,null,{dec:X.dec,names:true})}</div>`+(X.subs.size?`<div class="eq" data-show="1">= ${stH(tree,null,{dec:X.dec})}</div>`:''),U:X.subs.size?[{t:1,show:1}]:undefined});
  X.bases.forEach(b=>fr.push(stBaseIn(b.raw,b.v)));
  for(let guard=0;tree.t!=='lit'&&guard<200;guard++){
    const ready=stReady(tree),first=ready[0];
    // działanie na macierzach: osobno, klatkami silnika
    const isM=x=>stKids(x).some(c=>isMat(c.v))||(x.t==='call'&&['det','rz','rank','tr','inv','rref'].includes(x.f));
    if(isM(first)){
      const r=calcEval(first,X.env,X.o),m=stMatOp(first,r,X);
      const lit=isMat(r)?stLit(r,{lab:m&&m.lab}):stLit(r);
      if(m)fr.push(...m.frames);
      tree=stSwap(tree,new Map([[first,lit]]));
      continue;
    }
    // liczby: wszystkie gotowe działania tego samego rodzaju naraz (np. oba iloczyny w 2·3 + 4·5)
    const info=new Map();
    const cls0=stOp(first,calcEval(first,X.env,X.o),X).cls;
    for(const n of ready){
      if(isM(n))continue;
      const r=calcEval(n,X.env,X.o),o=stOp(n,r,X);
      if(o.cls!==cls0)continue;
      info.set(n,{r,o,lit:stLit(r,{pi:hasPi(n)})});
    }
    const map=new Map([...info].map(([n,i])=>[n,i.lit])),next=stSwap(tree,map),items=[...info.values()];
    if(items.every(i=>i.o.quiet)){tree=next;continue}
    const before=new Map([...info.keys()].map(n=>[n,'st-a'])),after=new Map(items.map(i=>[i.lit,'st-b']));
    const C=items.flatMap(i=>i.o.C||[]),U=C.map((_,k)=>({t:.4+k*.8,line:k}));U.push({t:.5+C.length*.8,show:1});
    const fracT=items.every(i=>i.o.t)?items[0].o.t:items.some(i=>i.o.frac)&&ST_TITLE_FR[cls0];
    let x=items.map(i=>i.o.x).filter(Boolean).filter((v,k,a)=>a.indexOf(v)===k).join(' ');
    if(!x&&(cls0==='mul'||cls0==='pow'||cls0==='call')&&stHasAdd(tree))x=$t('To liczymy przed dodawaniem i odejmowaniem.','This comes before addition and subtraction.');
    fr.push({sec,t:$t(...(fracT||ST_TITLE[cls0])),x,
      S:`<div class="eq">${stH(tree,before,{dec:X.dec})}</div><div class="eq" data-show="1">= ${stH(next,after,{dec:X.dec})}</div>`,C,U});
    tree=next;
  }
  return {frames:fr,v:tree.v,lab:tree.lab};
}
// rekord linii z calcLines → klatki odtwarzacza; src: inne wyrażenie z tej linii (zaznaczony fragment)
function calcSteps(rec,src){
  stM=0;
  const X={env:rec.env||new Map(),o:{deg:rec.deg!==false},dec:!!rec.dec};
  const sec=$t('Rozpisanie','Working');
  const res=(v,dec)=>isMat(v)?stMatH(v,dec):`${isFr(v)?'':'≈ '}${stNum(v,dec)}`.replace(/^≈ /,'≈ ');
  const eqTxt=v=>isMat(v)?`= ${stMatH(v,X.dec)}`:(isFr(v)?'= ':'≈ ')+stNum(v,X.dec)+(isFr(v)&&v.d!==1&&!X.dec?` ≈ ${cNum(v.n/v.d).s}`:'');
  if(src!==undefined){
    const e=stExpr(src,X,sec);
    e.frames.push({sec,t:$t('Wynik','Result'),S:`<div class="eq">${stH(stFrom(calcParse(calcTokens(cNorm(src),x=>X.env.has(x)),x=>X.env.has(x)),{...X,subs:new Map(),bases:[]}),null,{dec:X.dec,names:true})} ${eqTxt(e.v)}</div>`});
    return e.frames;
  }
  if(rec.kind==='check'){
    const L=stExpr(rec.sides[0],X,$t('Lewa strona','Left side'));
    const rLit=C_LIT.test(rec.sides[1].trim()),R=rLit?{frames:[],v:rec.rv}:stExpr(rec.sides[1],X,$t('Prawa strona','Right side'));
    const fr=[...L.frames,...R.frames],lv=L.v,rv=R.v,ok=rec.ok;
    const x=ok?(rec.round?$t(`Lewa strona to ${stNum(lv,X.dec)}${isFr(lv)&&lv.d!==1?` ≈ ${cNum(toNum(lv)).s}`:''}; po zaokrągleniu do ${rec.round} ${pl(rec.round,'miejsca','miejsc','miejsc')} po przecinku wychodzi tyle, ile po prawej.`,`The left side is ${stNum(lv,X.dec)}${isFr(lv)&&lv.d!==1?` ≈ ${cNum(toNum(lv)).s}`:''}; rounded to ${rec.round} decimal ${rec.round===1?'place':'places'} it matches the right side.`)
      :$t('Obie strony dają tę samą liczbę.','Both sides give the same number.')):$t('Strony dają różne liczby, więc trzeba poprawić rachunek.','The sides give different numbers, so the working needs fixing.');
    fr.push({sec:$t('Sprawdzenie','Check'),t:ok?$t('Zgadza się','Correct'):$t('Nie zgadza się','Does not match'),x,
      S:`<div class="eq">${$t('lewa','left')}: ${res(lv,X.dec)} &nbsp; ${ok?(rec.round?'≈':'='):'≠'} &nbsp; ${$t('prawa','right')}: ${res(rv,X.dec)}</div>`});
    return fr;
  }
  const e=stExpr(rec.src,X,sec),fr=e.frames;
  if(rec.base)fr.push(stBaseOut(isFr(e.v)?e.v:F(Math.round(e.v*1e6),1e6),rec.base));
  const left=rec.name?stName(rec.name):stH(stFrom(calcParse(calcTokens(cNorm(rec.src),x=>X.env.has(x)),x=>X.env.has(x)),{...X,subs:new Map(),bases:[]}),null,{dec:X.dec,names:true});
  const tail=rec.base?`= ${cBaseStr(isFr(e.v)?e.v:F(Math.round(e.v*1e6),1e6),rec.base)}<sub>${rec.base}</sub>`:eqTxt(e.v)+(rec.unit?' '+escH(rec.unit):'');
  fr.push({sec,t:$t('Wynik','Result'),x:rec.name?$t(`Ta wartość trafia do zmiennej ${stName(rec.name)}; można jej używać w następnych liniach.`,`This value goes into the variable ${stName(rec.name)}; you can use it in the following lines.`):'',S:`<div class="eq">${left} ${tail}</div>`});
  return fr;
}
