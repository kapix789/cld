const E=require('./load')(['FZ_TOPICS','ansCheck','ansHtml','ansShow','LANG','OPT','parseNum','nf','SUBJECTS']);
let fails=0,checks=0;const ok=(c,m)=>{checks++;if(!c){fails++;if(fails<25)console.log('✗',m)}};
const plain=h=>String(h).replace(/<[^>]+>/g,'');
const typed=(v,sig,comma)=>{let s=String(+v.toPrecision(sig));if(/e/.test(s))s=v.toExponential(sig-1);return comma?s.replace('.',','):s};
for(const [s,v] of [['3,21',3.21],['3.21',3.21],['-2',-2],['−2,5',-2.5],['2,5e3',2500],['2.5·10^3',2500],['2,5*10^-3',.0025],['2,5×10⁻³',.0025],['1/4',.25],['1 200',1200],['.5',.5]])ok(Math.abs(E.parseNum(s)-v)<1e-12,'parseNum '+s);
for(const s of ['abc','1,2,3','2e','']) ok(E.parseNum(s)===null,'parseNum przyjął '+s);
for(const g of [9.81,10])for(const lang of ['pl','en']){
  E.OPT.g=g;E.LANG.cur=lang;
  for(const t of E.FZ_TOPICS){
    for(let i=0;i<25;i++){
      const T=t.gen(),tag=`${t.id} g=${g} ${lang}#${i}`,a=T.ans;
      ok(T.q&&T.sol&&a.kind==='qty'&&a.items.length,tag+': brak treści');
      ok(a.items.every(it=>isFinite(it.v)),tag+': wynik nie jest liczbą');
      const html=T.q+T.body+T.sol+E.ansHtml(a,'x')+E.ansShow(a)+(T.hint||'');
      ok(!/undefined|NaN|Infinity|\[object/.test(html),tag+': undefined/NaN w HTML');
      for(const sig of [3,4]){const r=E.ansCheck(a,a.items.map(it=>typed(it.v,sig,lang==='pl')));ok(r.score===1,`${tag}: wynik z ${sig} cyframi nie przechodzi (${r.msg}) ${a.items.map(it=>typed(it.v,sig)).join(' ')}`)}
      ok(E.ansCheck(a,a.items.map(()=>'')).empty,tag+': puste pola nie są puste');
      ok(E.ansCheck(a,a.items.map(it=>String(it.v*1.2+1))).score<1,tag+': zły wynik zaliczony');
      a.items.forEach(it=>ok(plain(T.sol).includes(plain(E.nf(it.v,it.sig||3))),`${tag}: rozwiązanie nie zawiera wyniku ${plain(E.nf(it.v))}`));
      if(i<3){const fr=T.fr();ok(fr.length>0&&fr.every(f=>f.t&&(f.C||[]).length===(f.U||[]).length),tag+': klatki');ok(!/undefined|NaN/.test(JSON.stringify(fr)),tag+': undefined w klatkach')}
      if(lang==='en'){const m=plain(html).match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);ok(!m,`${tag}: polski tekst w EN: ${m?plain(html).slice(Math.max(0,m.index-40),m.index+20):''}`)}
      if(g===10)ok(!plain(T.q+T.body+T.sol).includes('9,81')&&!plain(T.q+T.body+T.sol).includes('9.81'),tag+': przy g = 10 w treści jest 9,81');
    }
  }
}
E.OPT.g=9.81;E.LANG.cur='pl';
{const a={kind:'qty',items:[{lab:'v',unit:'m/s',v:12.5}]};ok(/10<sup>/.test(E.ansCheck(a,['125']).msg),'brak podpowiedzi o rzędzie wielkości');ok(/3,6/.test(E.ansCheck(a,['45']).msg),'brak podpowiedzi o 3,6')}
ok(E.SUBJECTS.some(s=>s.id==='fizyka'),'fizyka nie jest w rejestrze');
console.log(`${checks} sprawdzeń, błędów: ${fails}`);process.exit(fails?1:0);
