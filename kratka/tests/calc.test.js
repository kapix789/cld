const K=require('./load')(['calcText','calcLines','calcSteps','calcExample','LANG','SUBJECTS','F','M','detF','rnd']);
let fails=0,checks=0;const ok=(c,m)=>{checks++;if(!c){fails++;if(fails<30)console.log('✗',m)}};
const plain=h=>String(h).replace(/<sup>(.*?)<\/sup>/g,'^$1').replace(/<sub>(.*?)<\/sub>/g,'_$1').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&amp;/g,'&').replace(/ /g,' ');
const out=r=>r===null?null:(r.cls?r.cls+': ':'')+plain(r.html);
const run=(text,o={deg:true})=>K.calcText(text,o).map(out);
const eq=(text,want,o)=>{const got=run(text,o);ok(JSON.stringify(got)===JSON.stringify(want),`${JSON.stringify(text)}\n   jest:     ${JSON.stringify(got)}\n   powinno:  ${JSON.stringify(want)}`)};

K.LANG.cur='pl';
for(const [line,want] of [
  ['2+2','= 4'],['2 + 2 =','= 4'],['1/2 + 1/3','= 5/6 ≈ 0,8333'],['1/4+1/4','= 1/2 = 0,5'],['0.1+0.2','= 0,3'],['9,81*0,5','= 4,905'],
  ['72/3,6','= 20'],['10/3,6','≈ 2,77778'],['2·3','= 6'],['2×3','= 6'],['2 − 5','= −3'],['6:3','= 2'],['6÷3','= 2'],['2^10','= 1024'],['2^32','= 4 294 967 296'],
  ['2^-2','= 1/4 = 0,25'],['2^100','≈ 1,2677·10^30'],['5!','= 120'],['20% * 50','= 10'],['√16','= 4'],['sqrt(2)','≈ 1,41421'],['√(9/4)','= 3/2 = 1,5'],
  ['sin(30)','= 1/2 = 0,5'],['sin 30','= 1/2 = 0,5'],['cos(60°)','= 1/2 = 0,5'],['tg(45)','= 1'],['sin(pi/6)','= 1/2 = 0,5'],['arcsin(0,5)','= 30'],['2sin(30)cos(60)','= 1/2 = 0,5'],
  ['ln(e)','= 1'],['log 1000','= 3'],['lg(0,01)','= −2'],['log2(1024)','= 10'],['exp(0)','= 1'],['|−3|','= 3'],['abs(-2,5)','= 2,5'],
  ['2(3+4)','= 14'],['(1+2)(3+4)','= 21'],['2π','≈ 6,28319'],['6,67e-11','= 6,67·10^−11'],['2,5e3','= 2500'],['1,6·10^-19','= 1,6·10^−19'],
  ['0b1101','= 13'],['0x1f','= 31'],['0o755','= 493'],['hex(255)','= FF_16'],['bin 13','= 1101_2'],['oct(0b111101101)','= 755_8'],
  ['[1 2; 3 4]','note: macierz 2×2'],['[1 2; 3 4]^T','= [1 3; 2 4]'],['det [1 2; 3 4]','= −2'],['|[1 2; 3 4]|','= −2'],['[1, 2, 3]','note: macierz 1×3'],['[1,5 2,5]','note: macierz 1×2'],['[1, 2, 3]*2','= [2 4 6]'],['[1,5 2,5]*2','= [3 5]'],['[1/2 1]','= [1/2 1]'],['[1/2 1; 0 2]^-1','= [2 −1; 0 1/2]'],
  ['x²','err: nieznana zmienna x'],['1/0','err: dzielenie przez 0'],['ln(0)','err: logarytm z liczby ≤ 0'],['√(-4)','err: poza dziedziną'],
  ['2,5!','err: silnia tylko z liczb 0–170'],['0b102','err: ta cyfra nie pasuje do systemu liczby'],['hex(2,5)','= 2,8_16'],['0b0.101','= 0,625'],['0b101.11 + 1','= 6,75'],['bin(0,625)','= 0,101_2'],['bin(5,75)','= 101,11_2'],['bin(1/3)','= 0,010101010101010101010101…_2'],['0x0.8','= 0,5'],['bin(-1)','err: tu potrzebna jest liczba ≥ 0'],
  ['det 5','err: tu potrzebna jest macierz'],['[1 2; 3]','err: wiersze macierzy mają różne długości'],['[1 2]+1','err: nie dodaje się liczby do macierzy'],
  ['2/3 + 1/4 = 11/12','ok: zgadza się'],['10/3 = 3,33','ok: zgadza się po zaokrągleniu'],['10/3 ≈ 3,33','ok: zgadza się po zaokrągleniu'],['sin(30) = 1/2','ok: zgadza się'],
  ['10/3 = 3,34','bad: nie zgadza się: lewa strona ≈ 3,33333'],['2/3 + 1/4 = 10/12','bad: nie zgadza się: lewa strona = 11/12, prawa = 5/6'],['7/2 = 3','bad: nie zgadza się: lewa strona = 7/2'],
  ['2/3 : 4/5','= 5/6 ≈ 0,8333'],['6/2/3','= 1'],['2^1/2','= 1'],['1/2^2','= 1/4 = 0,25'],['2 / 3','= 2/3 ≈ 0,6667'],['3·1/2','= 3/2 = 1,5'],['tg(45)·2/3','= 2/3 ≈ 0,6667'],
  ['a) 3·4','= 12'],['Pole: 3*4','= 12'],['2.  7*6','= 42'],
  ['Zadanie 2',null],['1. Oblicz pole',null],['do domu',null],['Wynik: dobry',null],['5 2',null],['2 jabłka',null],['2x = 10',null],['f(x) = 2x + 1',null],
  ['Odp. 12 m',null],['e',null],['# 2+2',null],['',null],['   ',null],['x == 2',null],['=',null],
  ['5',null],['2,5',null],['−3',null],['5 kg',null],['a = 4',null],['g = 9,81 m/s²',null],
  ['2·10^3 kg','= 2000 kg'],['72 km/h / 3,6','err: nieznana zmienna km'],
])eq(line,[want]);

for(const [text,want] of [
  ['v0 = 72/3,6\na = 4 m/s²\ns = v0^2/(2a)\nt = 2v0·sin(30°)/9,81',['= 20',null,'= 50','≈ 2,03874']],
  ["A = [2 1; 5 3]\ndet(A)\n|A|\nA^-1\nA⁻¹\ninv(A)\nAᵀ\nA'\nA^T\nA*A^-1\n2A\nA+A\nA^2\nrz(A)\ntr(A)\nrref(A)",
   ['note: macierz 2×2','= 1','= 1','= [3 −1; −5 2]','= [3 −1; −5 2]','= [3 −1; −5 2]','= [2 5; 1 3]','= [2 5; 1 3]','= [2 5; 1 3]','= [1 0; 0 1]','= [4 2; 10 6]','= [4 2; 10 6]','= [9 5; 25 14]','= 2','= 5','= [1 0; 0 1]']],
  ['B = [1 2 3; 4 5 6]\ndet B\nB*B\nB*B^T\nrz(B)\nB^-1\nB+1',['note: macierz 2×3','err: macierz nie jest kwadratowa','err: wymiary macierzy nie pasują','= [14 32; 32 77]','= 2','err: macierz nie jest kwadratowa','err: nie dodaje się liczby do macierzy']],
  ['C = [1 2; 2 4]\ndet(C)\nC^-1\nrz C',['note: macierz 2×2','= 0','err: macierz nieodwracalna (det = 0)','= 1']],
  ['x = 3\n2x + 1\nx^2\nx²\n(x+1)(x-1)',[null,'= 7','= 9','= 9','= 8']],
  ['a = 1\n4ac',[null,'err: nieznana zmienna c']],
  ['r = 2\n2πr\nπr^2\nπr²\n(πr)^2',[null,'≈ 12,5664','≈ 12,5664','≈ 12,5664','≈ 39,4784']],
  ['x = 1/0\nx + 1',['err: dzielenie przez 0','err: nieznana zmienna x']],
  ['x = 5\nx = abc\nx',[null,null,'= 5']],
  ['g = 9,81\nh = 2g\nh/2 = g',[null,'= 19,62','ok: zgadza się']],
  ['v = 72 km/h\nv/3,6',[null,'= 20']],
  ['r = 4\nw = 2\nx = 1\nr+w+x\nr+x',[null,null,null,'= 7','= 5']],
  ['jabłka = 3\n2 jabłka',[null,'= 6']],
  ['A = [1 2 3\n4 5 6\n7 8 10]\ndet(A)',[null,null,'note: macierz 3×3','= −3']],
  ['A = [\n1 0\n0 1\n]\nA*2',[null,null,null,'note: macierz 2×2','= [2 0; 0 2]']],
  ['B[1 2; 3 4]\nB^-1',['note: macierz 2×2','= [−2 1; 3/2 −1/2]']],
  ['B[1 2\n3 4]\ndet B',[null,'note: macierz 2×2','= −2']],
  ['A = [1 2;\n3 4]\nA^T',[null,'note: macierz 2×2','= [1 3; 2 4]']],
  ['A = [1 2\n# komentarz w środku\n3 4]\ndet A',[null,null,'note: macierz 2×2','= −2']],
  ['[1 2\nx = 3\n2x',[null,null,'= 6']],
  ['det[1 2; 3 4]',['= −2']],
  ['A =\n[4 2 1\n4 3 2\n1 4 5\n]\ndet(A)',[null,null,null,null,'note: macierz 3×3','= 5']],
  ['B =\n[1 2; 3 4]\nB^T',[null,'note: macierz 2×2','= [1 3; 2 4]']],
  ['C =\n\n[1 0\n0 1]\ndet C',[null,null,null,'note: macierz 2×2','= 1']],
  ['x =\n5',[null,null]],
])eq(text,want);

for(const [line,want] of [['sin(30)','≈ −0,988032'],['sin(30°)','= 1/2 = 0,5'],['sin(pi/6)','= 1/2 = 0,5'],['arctg(1)','≈ 0,785398'],['cos(π)','= −1']])eq(line,[want],{deg:false});

K.LANG.cur='en';
for(const [line,want] of [['1/2 + 1/3','= 5/6 ≈ 0.8333'],['2^32','= 4,294,967,296'],['9.81*0.5','= 4.905'],['9,81*0,5','= 4.905'],['1/0','err: division by 0'],
  ['2/3 + 1/4 = 11/12','ok: correct'],['10/3 = 3.33','ok: correct after rounding'],['7/2 = 3','bad: does not match: the left side = 7/2'],['x+1','err: unknown variable x']])eq(line,[want]);
K.LANG.cur='pl';

for(const lang of ['pl','en'])for(const S of K.SUBJECTS){
  K.LANG.cur=lang;const ex=K.calcExample(S.id),res=run(ex);
  ok(ex.length>20,`${S.id} ${lang}: brak przykładu`);
  ok(res.filter(Boolean).length>=3,`${S.id} ${lang}: za mało wyników w przykładzie: ${JSON.stringify(res)}`);
  ok(res.every(r=>r===null||!/^(err|bad)/.test(r)),`${S.id} ${lang}: błąd w przykładzie: ${JSON.stringify(res)}`);
}
K.LANG.cur='pl';

const ms=A=>'['+A.map(r=>r.map(x=>x.str()).join(' ')).join('; ')+']';
for(let t=0;t<400;t++){
  const n=K.rnd(2,4),rank=t%4===0?n-1:n,A=K.M.make(n,n,()=>K.F(K.rnd(-6,6)));
  if(rank<n){const k=K.rnd(0,n-1),f=K.rnd(-2,2);A[k]=A[(k+1)%n].map(x=>x.mul(K.F(f)))}
  const d=K.detF(A),txt=`A = ${ms(A)}\ndet(A) = ${d.str()}\ndet(Aᵀ) = det(A)\n|A| = det A`;
  eq(txt,[run(`A = ${ms(A)}`)[0],'ok: zgadza się','ok: zgadza się','ok: zgadza się']);
  if(!d.z){
    const inv=K.M.inv(A);
    eq(`A = ${ms(A)}\nA^-1 = ${ms(inv)}\nA*A^-1 = A^-1*A\ndet(A^-1)*det(A) = 1\n(A^T)^-1 = (A^-1)^T\nrz(A) = ${n}`,[run(`A = ${ms(A)}`)[0],'ok: zgadza się','ok: zgadza się','ok: zgadza się','ok: zgadza się','ok: zgadza się']);
  }else{
    const r=run(`A = ${ms(A)}\nA^-1\nrz(A) < ${n}`);
    ok(r[1]==='err: macierz nieodwracalna (det = 0)',`odwrotna macierzy osobliwej: ${r[1]} ${ms(A)}`);
  }
}
for(let t=0;t<500;t++){
  const a=K.F(K.rnd(-30,30),K.rnd(1,20)),b=K.F(K.rnd(-30,30),K.rnd(1,20)),s=a.add(b),p=a.mul(b);
  const A=`(${a.str()})`,B=`(${b.str()})`;
  eq(`${A} + ${B} = ${s.str()}\n${A}·${B} = ${p.str()}\n${A} - ${B} = ${a.sub(b).str()}\n${A} + ${B} = ${s.add(K.F(1,7)).str()}`,['ok: zgadza się','ok: zgadza się','ok: zgadza się',run(`${A} + ${B} = ${s.add(K.F(1,7)).str()}`)[0]]);
  ok(/^bad: /.test(run(`${A} + ${B} = ${s.add(K.F(1,7)).str()}`)[0]),'zły wynik uznany: '+`${A} + ${B} = ${s.add(K.F(1,7)).str()}`);
}
{
  const squash=s=>s.replace(/[\s\[\];]/g,'');
  const plainH=h=>String(h||'').replace(/<span class="fr"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g,'$1/$2').replace(/<sup>(.*?)<\/sup>/g,'^$1').replace(/<sub>(.*?)<\/sub>/g,'_$1').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\u202f/g,' ');
  const page=['1/2 + 1/3','2 + 3·4','(1+2)·(3+4) - 2^3','2/3 : 4/5','v0 = 72/3,6','s = v0^2/(2·4)','sin(30) + √16','10/3 = 3,33','2/3 + 1/4 = 10/12','hex(255)','0b1101 + 1','bin(5,75)','0b0.101 + 1',
    'A = [2 1','5 3]','det(A)','A^-1','B = [1 2; 3 4]','A*B + 2B','A^T','A^3','rz(A)','tr(A)','C = [1 0 2 0; 3 1 0 1; 0 2 1 0; 1 0 0 3]','det(C)','5!','20%·50','log2(1024)','ln(e)','arcsin(1/2)','2^0,5','x = -3','x^2 - 2x','|x|','B/2','-A','√2·√2'].join('\n');
  for(const lang of ['pl','en']){
    K.LANG.cur=lang;
    const recs=K.calcLines(page);
    recs.forEach((r,i)=>{
      if(!r||r.kind!=='val'&&r.kind!=='check')return;
      const tag=`rozpisz ${lang} „${page.split('\n')[i]}”`;
      let fr;try{fr=K.calcSteps(r)}catch(e){ok(false,tag+': wyjątek '+e.message);return}
      ok(fr.length>=1,tag+': brak klatek');
      ok(!/undefined|NaN|\[object|Infinity/.test(JSON.stringify(fr)),tag+': undefined/NaN w klatkach');
      ok(fr.every(f=>f.t),tag+': klatka bez tytułu');
      ok(fr.every(f=>!f.U||!f.C||f.U.filter(u=>u.line!==undefined).every(u=>u.line<f.C.length)),tag+': odsłonięcie linii, której nie ma');
      if(r.kind==='val'&&!r.base){const last=plainH(fr[fr.length-1].S),want=plainH(r.html).replace(/^= /,'').split(' ≈ ')[0].split(' = ')[0];ok(squash(last).includes(squash(want)),`${tag}: wynik ${want} nie trafił do ostatniej klatki: ${last}`)}
    });
  }
  K.LANG.cur='pl';
  const ops=['+','-','·',':'];
  for(let t=0;t<300;t++){
    let e=String(K.rnd(1,9));for(let k=0;k<K.rnd(1,4);k++){const v=K.rnd(0,3)===0?`${K.rnd(1,9)}/${K.rnd(2,9)}`:String(K.rnd(1,12));e+=` ${ops[K.rnd(0,3)]} ${K.rnd(0,4)===0?'('+v+' + '+K.rnd(1,5)+')':v}`}
    if(K.rnd(0,3)===0)e=`(${e})^2`;
    const r=K.calcLines(e)[0];if(!r||r.kind!=='val')continue;
    let fr;try{fr=K.calcSteps(r)}catch(err){ok(false,'rozpisz '+e+': '+err.message);continue}
    const last=plainH(fr[fr.length-1].S),want=plainH(r.html).replace(/^= /,'').split(' ≈ ')[0].split(' = ')[0];
    ok(squash(last).includes(squash(want)),`rozpisz ${e}: ${want} nie ma w ostatniej klatce: ${last}`);
    ok(!/undefined|NaN/.test(JSON.stringify(fr)),'rozpisz '+e+': undefined/NaN');
  }
}
const CH='0123456789+-*/^()[]; ,.=!%|°√πxyzAB abc sin det e # :²⁻¹ᵀ\'';
for(let t=0;t<3000;t++){
  let s='';const L=K.rnd(1,18);for(let k=0;k<L;k++)s+=CH[K.rnd(0,CH.length-1)];
  let r;try{r=K.calcText(s+'\n'+s+'\nx = '+s+'\nx',{deg:t%2===0})}catch(e){ok(false,'wyjątek dla '+JSON.stringify(s)+': '+e.message);continue}
  ok(r.every(x=>x===null||typeof x.html==='string'&&!/undefined|NaN|Infinity|\[object/.test(x.html)),'dziwny wynik dla '+JSON.stringify(s)+': '+JSON.stringify(r));
}
console.log(fails?`BŁĘDY: ${fails} z ${checks}`:`kalkulator: wszystko w porządku (${checks} sprawdzeń)`);
process.exit(fails?1:0);
