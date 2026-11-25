// =====================================================================
//  FIZYKA: zadania liczbowe (wynik sprawdzany z tolerancją), rozwiązania krok po kroku, rysunki
// =====================================================================
//  Zadanie fizyczne buduje funkcja fzTask({q, data, ask, steps, fig, hint}):
//    data   dane: [['<i>m</i>', 2, 'kg'], …]
//    ask    szukane: [{lab:'<i>v</i>', unit:'m/s', v: wartość, tol?: 0.015}]
//    steps  kroki: [{t:'tytuł', x:'wyjaśnienie', f:['wzór', …]}]
//    fig    rysunek SVG (opcjonalnie)
//  Przyspieszenie ziemskie: OPT.g (9,81 albo 10 m/s², przełącznik nad zadaniem).
// =====================================================================

// ---------- liczby ----------
const decS=s=>(LANG.cur==='en'?s:s.replace('.',',')).replace(/^-/,'−');
function nf(x,sig=3){
  if(!isFinite(x))return '?';if(Math.abs(x)<1e-12)return '0';
  const ax=Math.abs(x);
  if(ax>=1e5||ax<1e-3){let e=Math.floor(Math.log10(ax)),m=+(x/10**e).toPrecision(sig);if(Math.abs(m)>=10){m/=10;e++}return `${decS(String(m))}·10<sup>${e<0?'−'+(-e):e}</sup>`}
  return decS(String(+x.toPrecision(sig)));
}
const nfi=x=>decS(String(x));   // liczba z treści zadania (dokładna)
function parseNum(s){
  s=String(s??'').trim().replace(/\s+/g,'').replace(/[−–]/g,'-').replace(/,/g,'.');
  if(!s)return null;
  s=s.replace(/10([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,(m,e)=>'10^'+e.replace(/[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>'-+0123456789'['⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)]));
  let m=s.match(/^([-+]?\d+)\/(\d+)$/);if(m)return +m[2]?+m[1]/+m[2]:null;
  m=s.match(/^([-+]?(?:\d+\.?\d*|\.\d+))(?:[·*×x]10\^\(?([-+]?\d+)\)?|e([-+]?\d+))?$/i);
  if(!m)return null;
  return +m[1]*10**+(m[2]??m[3]??0);
}
const INPQ='autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="decimal"';
KINDS.qty={
  note:()=>$t('Liczby dziesiętne z przecinkiem albo kropką; wystarczą 3 cyfry znaczące. Duże liczby można pisać np. jako <code>2,5e8</code> albo <code>2,5·10^8</code>.','Decimal numbers with a comma or a dot; 3 significant figures are enough. Large numbers can be written e.g. as <code>2.5e8</code> or <code>2.5·10^8</code>.'),
  fields:a=>a.items.map((_,k)=>'q'+k),
  html:(a,id)=>`<div class="nums">${a.items.map((it,k)=>`<label class="ans-in" for="${id}-q${k}"><span>${it.lab} =</span><input id="${id}-q${k}" ${INPQ}><span class="unit">${it.unit||''}</span></label>`).join('')}</div>`,
  check(a,inp){
    const marks={},why=[];let good=0,empty=0;
    a.items.forEach((it,k)=>{
      const s=String(inp[k]??'').trim(),x=parseNum(s);if(!s){empty++;marks['q'+k]=false;return}
      if(x===null){marks['q'+k]=false;why.push($t(`„${escH(s)}” to nie liczba.`,`“${escH(s)}” is not a number.`));return}
      const tol=it.tol??.015,ok=Math.abs(x-it.v)<=Math.max(tol*Math.abs(it.v),it.abs??1e-9);marks['q'+k]=ok;if(ok){good++;return}
      const r=x/it.v,p=Math.round(Math.log10(Math.abs(r)));
      if(it.v&&p&&Math.abs(Math.abs(r)/10**p-1)<.02)why.push($t(`${it.lab}: wynik różni się o czynnik 10<sup>${p}</sup>, pewnie przy przeliczaniu jednostek.`,`${it.lab}: the result is off by a factor of 10<sup>${p}</sup>, probably in a unit conversion.`));
      else if(it.v&&Math.abs(r*3.6-1)<.02||Math.abs(r/3.6-1)<.02)why.push($t(`${it.lab}: wynik różni się o czynnik 3,6, czyli km/h i m/s się pomieszały.`,`${it.lab}: the result is off by a factor of 3.6, so km/h and m/s got mixed up.`));
      else if(it.v&&Math.abs(r+1)<.02)why.push($t(`${it.lab}: zły znak.`,`${it.lab}: wrong sign.`));
    });
    if(empty===a.items.length)return {score:0,empty:true,marks:{},msg:''};
    return {score:good/a.items.length,empty:false,marks,msg:(good<a.items.length?$t(`Poprawnych wyników: ${good} z ${a.items.length}.`,`Correct results: ${good} of ${a.items.length}.`)+' ':'')+why.join(' ')};
  },
  show:a=>a.items.map(it=>`${it.lab} ≈ ${nf(it.v,it.sig||3)} ${it.unit||''}`).join(', '),
  inp:(a,inp)=>a.items.map((it,k)=>`${it.lab} = ${inpT(inp[k])} ${it.unit||''}`).join(', ')
};

// ---------- zapis wzorów ----------
const V=(s,sub,sup)=>`${s.endsWith('⃗')?`<i class="vec">${s.slice(0,-1)}</i>`:`<i>${s}</i>`}${sub!==undefined&&sub!==''?`<sub>${sub}</sub>`:''}${sup?`<sup>${sup}</sup>`:''}`;
const FR=(a,b)=>`<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const SQ=x=>`√<span class="ov">${x}</span>`;
const DEG='°';
const rad=d=>d*Math.PI/180;
const gH=()=>nfi(OPT.g);
// zadanie fizyczne
function fzTask(o){
  const sec=o.sec||$t('Rozwiązanie','Solution');
  const data=`<ul class="data">${o.data.map(([s,v,u])=>`<li><span class="f">${s} = ${typeof v==='number'?nfi(v):v}</span> ${u||''}</li>`).join('')}</ul>`;
  const sol=`<ol class="steps">${o.steps.map(s=>`<li><b>${s.t}.</b> ${s.x||''}${(s.f||[]).map(l=>`<div class="line">${l}</div>`).join('')}</li>`).join('')}</ol><p class="ans-line">${$t('Odpowiedź','Answer')}: ${o.ask.map(it=>`<span class="f">${it.lab} ≈ ${nf(it.v,it.sig||3)}</span> ${it.unit||''}`).join(', ')}.</p>`;
  const fr=()=>o.steps.map((s,k)=>({sec,t:s.t,x:s.x,S:(o.fig?o.fig(k):'')||(k===0?data:''),C:(s.f||[]).map(h=>({h,full:true})),U:(s.f||[]).map((_,i)=>({t:.5+i*1.1,line:i}))}));
  return {q:o.q,body:(o.fig?`<div class="fig-wrap">${o.fig(-1)}</div>`:'')+data+(o.gNote?`<p class="note">${$t(`Przyjmij <i>g</i> = ${gH()} m/s².`,`Take <i>g</i> = ${gH()} m/s².`)}</p>`:''),ans:{kind:'qty',items:o.ask},sol,fr,hint:o.hint};
}

// ---------- rysunki ----------
function svgArrow(x1,y1,x2,y2,cls,w=2){
  const a=Math.atan2(y2-y1,x2-x1),h=9,s=4.5;
  return `<line x1="${x1}" y1="${y1}" x2="${x2-Math.cos(a)*h*.8}" y2="${y2-Math.sin(a)*h*.8}" class="${cls}" stroke-width="${w}"/><path d="M${x2},${y2} L${x2-Math.cos(a)*h+Math.sin(a)*s},${y2-Math.sin(a)*h-Math.cos(a)*s} L${x2-Math.cos(a)*h-Math.sin(a)*s},${y2-Math.sin(a)*h+Math.cos(a)*s}Z" class="${cls}" stroke="none"/>`;
}
const svg=(w,h,body,lab)=>`<svg class="fig" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${escH(lab||'')}">${body}</svg>`;
// tor rzutu ukośnego
function figRzut(al,step){
  const W=380,H=170,x0=30,y0=145,L=320,Hm=L/4*Math.tan(rad(al));
  const sc=Math.min(1,110/Hm),pts=[];for(let k=0;k<=40;k++){const u=k/40;pts.push(`${(x0+u*L).toFixed(1)},${(y0-4*Hm*sc*u*(1-u)).toFixed(1)}`)}
  let b=`<line x1="10" y1="${y0}" x2="${W-10}" y2="${y0}" class="ax"/><polyline points="${pts.join(' ')}" class="tr"/>`;
  b+=svgArrow(x0,y0,x0+60*Math.cos(rad(al)),y0-60*Math.sin(rad(al)),'v1')+`<text x="${x0+64*Math.cos(rad(al))+4}" y="${y0-64*Math.sin(rad(al))}" class="t1">${'v₀'}</text>`;
  b+=`<path d="M${x0+26},${y0} A26,26 0 0 0 ${x0+26*Math.cos(rad(al))},${y0-26*Math.sin(rad(al))}" class="ln" stroke-width="1"/><text x="${x0+31}" y="${y0-6}" class="small">α</text>`;
  if(step!==0){b+=`<line x1="${x0+L/2}" y1="${y0}" x2="${x0+L/2}" y2="${y0-Hm*sc}" class="dash"/><text x="${x0+L/2+6}" y="${y0-Hm*sc/2}" class="small">H</text>`;
    b+=`<text x="${x0+L/2-4}" y="${y0+18}" class="small">ℓ</text><line x1="${x0}" y1="${y0+6}" x2="${x0+L}" y2="${y0+6}" class="ax"/>`}
  return svg(W,H+12,b,$t('Tor rzutu ukośnego','Projectile path'));
}
// ruch po okręgu: promień, prędkość, przyspieszenie styczne i normalne
function figOkrag(step){
  const cx=120,cy=110,R=80,ph=rad(35),px=cx+R*Math.cos(ph),py=cy-R*Math.sin(ph);
  let b=`<circle cx="${cx}" cy="${cy}" r="${R}" class="ln" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="2.5" class="dot"/>`;
  b+=`<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" class="ax"/><text x="${(cx+px)/2-14}" y="${(cy+py)/2+2}" class="small">r</text>`;
  const tx=-Math.sin(ph),ty=-Math.cos(ph),all=step<0;
  if(all||step>=1)b+=svgArrow(px,py,px+tx*62,py+ty*62,'v1')+`<text x="${px+tx*66-6}" y="${py+ty*66-4}" class="t1">v</text>`;
  if(all||step>=2)b+=svgArrow(px,py,px+tx*36,py+ty*36,'v4',2.4)+`<text x="${px+tx*30+8}" y="${py+ty*30+14}" class="small">aₜ</text>`;
  if(all||step>=3)b+=svgArrow(px,py,px-Math.cos(ph)*48,py+Math.sin(ph)*48,'v2')+`<text x="${px-Math.cos(ph)*40-4}" y="${py+Math.sin(ph)*48+16}" class="t2">aₙ</text>`;
  b+=`<circle cx="${px}" cy="${py}" r="5" class="cm"/>`;
  return svg(250,210,b,$t('Punkt na okręgu','A point on a circle'));
}
// środek masy: masy w rogach prostokąta
function figCm(ms,a,b,cm,step){
  const W=300,H=230,ox=60,oy=190,s=Math.min(200/a,150/b),P=[[0,b],[a,b],[a,0],[0,0]];
  let g=`<rect x="${ox}" y="${oy-b*s}" width="${a*s}" height="${b*s}" class="soft"/><rect x="${ox}" y="${oy-b*s}" width="${a*s}" height="${b*s}" class="ln" stroke-width="1.2" fill="none"/>`;
  g+=svgArrow(ox-24,oy,ox+a*s+30,oy,'ax',1)+svgArrow(ox,oy+20,ox,oy-b*s-30,'ax',1)+`<text x="${ox+a*s+26}" y="${oy+16}" class="small">x</text><text x="${ox-16}" y="${oy-b*s-24}" class="small">y</text>`;
  P.forEach(([x,y],k)=>{const X=ox+x*s,Y=oy-y*s;g+=`<circle cx="${X}" cy="${Y}" r="7" class="mass"/><text x="${X+(x?10:-48)}" y="${Y+(y?-10:20)}" class="small">${nfi(ms[k])} kg</text>`});
  g+=`<text x="${ox+a*s/2-10}" y="${oy+34}" class="small">${nfi(a)} m</text><text x="${ox+a*s+12}" y="${oy-b*s/2}" class="small">${nfi(b)} m</text>`;
  if(step!==0&&cm)g+=`<circle cx="${ox+cm[0]*s}" cy="${oy-cm[1]*s}" r="5" class="cm"/><text x="${ox+cm[0]*s+8}" y="${oy-cm[1]*s-8}" class="t2">S</text>`;
  return svg(W,H+20,g,$t('Masy w rogach płyty','Masses at the corners of a plate'));
}

// ---------- 1. kinematyka ----------
function fzHam(){
  if(Math.random()<.5){
    const v1=pick([30,40,50,60]),v2=v1+pick([10,20,30]),v=Math.sqrt(v2*v2-v1*v1);
    return fzTask({
      q:$t(`Kierowca jedzie z prędkością ${v1} km/h, hamuje najmocniej, jak może, i zatrzymuje się tuż przed przeszkodą. Z jaką prędkością uderzyłby w przeszkodę, gdyby przy takim samym hamowaniu jechał ${v2} km/h? Opóźnienie jest stałe, czas reakcji pomijamy.`,`A driver going ${v1} km/h brakes as hard as possible and stops right in front of an obstacle. How fast would the car hit the obstacle if it braked the same way but was going ${v2} km/h? The deceleration is constant and the reaction time is neglected.`),
      data:[[V('v',1),v1,'km/h'],[V('v',2),v2,'km/h']],ask:[{lab:V('v'),unit:'km/h',v}],
      steps:[
        {t:$t('Wzór bez czasu','A formula without time'),x:$t('Czasu hamowania nie znamy, więc korzystamy ze wzoru łączącego prędkość końcową, początkową, przyspieszenie i drogę. Dla hamowania z opóźnieniem <i>a</i> na drodze <i>d</i>:','The braking time is unknown, so we use the formula linking the final and initial velocity, the acceleration and the distance. For braking with deceleration <i>a</i> over the distance <i>d</i>:'),f:[`${V('v','k',2)} = ${V('v','p',2)} − 2${V('a')}${V('d')}`]},
        {t:$t('Pierwsze hamowanie','The first braking'),x:$t('Samochód hamuje od <i>v</i><sub>1</sub> do zera dokładnie na drodze do przeszkody:','The car brakes from <i>v</i><sub>1</sub> to zero exactly over the distance to the obstacle:'),f:[`0 = ${V('v',1,2)} − 2${V('a')}${V('d')} &nbsp;⇒&nbsp; 2${V('a')}${V('d')} = ${V('v',1,2)}`]},
        {t:$t('Drugie hamowanie','The second braking'),x:$t('Ta sama droga i to samo opóźnienie, ale start z <i>v</i><sub>2</sub>. Podstawiamy 2<i>ad</i> z poprzedniego kroku:','The same distance and deceleration, but starting from <i>v</i><sub>2</sub>. Substitute 2<i>ad</i> from the previous step:'),f:[`${V('v','',2)} = ${V('v',2,2)} − 2${V('a')}${V('d')} = ${V('v',2,2)} − ${V('v',1,2)}`]},
        {t:$t('Liczymy','Computing'),x:$t('Obie prędkości są w km/h, więc wynik też wychodzi w km/h; przeliczanie nie jest potrzebne.','Both speeds are in km/h, so the result is in km/h as well; no conversion is needed.'),f:[`${V('v')} = ${SQ(`${v2}<sup>2</sup> − ${v1}<sup>2</sup>`)} = ${SQ(v2*v2-v1*v1)} ≈ <b>${nf(v)} km/h</b>`]},
      ],
      hint:$t('v² = v₀² − 2ad; z pierwszego hamowania 2ad = v₁².','v² = v₀² − 2ad; the first braking gives 2ad = v₁².')
    });
  }
  const vk=pick([36,54,72,90,108]),v0=vk/3.6,s=pick([20,25,30,40,50,60,80]),a=v0*v0/(2*s),t=v0/a;
  return fzTask({
    q:$t(`Samochód jadący z prędkością ${vk} km/h hamuje ze stałym opóźnieniem i zatrzymuje się po przejechaniu ${s} m. Oblicz wartość opóźnienia i czas hamowania.`,`A car going ${vk} km/h brakes with constant deceleration and stops after ${s} m. Find the deceleration and the braking time.`),
    data:[[V('v',0),vk,'km/h'],[V('s'),s,'m']],ask:[{lab:V('a'),unit:'m/s²',v:a},{lab:V('t'),unit:'s',v:t}],
    steps:[
      {t:$t('Jednostki','Units'),x:$t('Prędkość zamieniamy na m/s: dzielimy przez 3,6 (1 km/h = 1000 m / 3600 s).','Convert the speed to m/s: divide by 3.6 (1 km/h = 1000 m / 3600 s).'),f:[`${V('v',0)} = ${FR(vk,'3,6')} = ${nf(v0)} m/s`]},
      {t:$t('Opóźnienie','The deceleration'),x:$t('Prędkość końcowa to zero, a drogę znamy, więc wzór bez czasu daje <i>a</i>:','The final speed is zero and the distance is known, so the formula without time gives <i>a</i>:'),f:[`0 = ${V('v',0,2)} − 2${V('a')}${V('s')} &nbsp;⇒&nbsp; ${V('a')} = ${FR(V('v',0,2),'2'+V('s'))} = ${FR(nf(v0)+'<sup>2</sup>','2 · '+s)} ≈ <b>${nf(a)} m/s²</b>`]},
      {t:$t('Czas','The time'),x:$t('Prędkość maleje o <i>a</i> na każdą sekundę, więc do zera spada po czasie:','The speed drops by <i>a</i> every second, so it reaches zero after:'),f:[`${V('t')} = ${FR(V('v',0),V('a'))} = ${FR(nf(v0),nf(a))} ≈ <b>${nf(t)} s</b>`]},
    ],
    hint:$t('Najpierw km/h na m/s, potem v₀² = 2as i t = v₀ / a.','First km/h to m/s, then v₀² = 2as and t = v₀ / a.')
  });
}
// wielomian w t: c[k] przy t^k
function polyT(c,vr='t'){
  const p=[];for(let k=c.length-1;k>=0;k--){const x=c[k];if(!x)continue;const a=Math.abs(x),body=k===0?String(a):(a===1?'':a)+`<i>${vr}</i>`+(k>1?`<sup>${k}</sup>`:'');p.push([x<0,body])}
  return p.length?p.map(([n,b],i)=>(i?(n?' − ':' + '):(n?'−':''))+b).join(''):'0';
}
const dPoly=c=>c.slice(1).map((x,k)=>x*(k+1));
const evP=(c,t)=>c.reduce((s,x,k)=>s+x*t**k,0);
const subP=(c,t)=>{const p=[];for(let k=c.length-1;k>=0;k--){const x=c[k];if(!x)continue;const a=Math.abs(x),tt=t<0?`(${nfi(t)})`:nfi(t);p.push([x<0,k===0?String(a):(a===1?'':a+'·')+tt+(k>1?`<sup>${k}</sup>`:'')])}return p.length?p.map(([n,b],i)=>(i?(n?' − ':' + '):(n?'−':''))+b).join(''):'0'};
function fzWek(){
  const rp=()=>{const d=pick([2,3,3]);const c=[rnd(-3,4),rich(-4,5),0,0];c[d]=pick([1,2,-1,3]);if(d===3&&Math.random()<.5)c[2]=rich(-3,3);return c};
  const X=rp(),Y=rp(),t0=pick([1,2,3]),vx=dPoly(X),vy=dPoly(Y),ax=dPoly(vx),ay=dPoly(vy);
  const VX=evP(vx,t0),VY=evP(vy,t0),AX=evP(ax,t0),AY=evP(ay,t0),vl=Math.hypot(VX,VY);
  const vec=(a,b)=>`(${a},&nbsp; ${b})`;
  return fzTask({
    q:$t(`Punkt porusza się na płaszczyźnie zgodnie z równaniem <span class="f">${V('r⃗')}(${V('t')}) = ${vec(polyT(X),polyT(Y))}</span> (czas w sekundach, odległości w metrach). Wyznacz prędkość i przyspieszenie w chwili <span class="f">${V('t')} = ${t0}</span> s oraz wartość prędkości.`,`A point moves in the plane according to <span class="f">${V('r⃗')}(${V('t')}) = ${vec(polyT(X),polyT(Y))}</span> (time in seconds, distances in metres). Find the velocity and the acceleration at <span class="f">${V('t')} = ${t0}</span> s and the speed.`),
    data:[[V('t'),t0,'s']],
    ask:[{lab:V('v','x'),unit:'m/s',v:VX,abs:.01},{lab:V('v','y'),unit:'m/s',v:VY,abs:.01},{lab:V('a','x'),unit:'m/s²',v:AX,abs:.01},{lab:V('a','y'),unit:'m/s²',v:AY,abs:.01},{lab:'|'+V('v⃗')+'|',unit:'m/s',v:vl,abs:.01}],
    steps:[
      {t:$t('Prędkość to pochodna położenia','Velocity is the derivative of position'),x:$t('Różniczkujemy każdą współrzędną osobno, korzystając z (<i>t<sup>n</sup></i>)′ = <i>n</i>·<i>t</i><sup><i>n</i>−1</sup> i z tego, że pochodna stałej to 0:','Differentiate each coordinate separately, using (<i>t<sup>n</sup></i>)′ = <i>n</i>·<i>t</i><sup><i>n</i>−1</sup> and the fact that the derivative of a constant is 0:'),f:[`${V('v⃗')}(${V('t')}) = ${V('r⃗')}′(${V('t')}) = ${vec(polyT(vx),polyT(vy))}`]},
      {t:$t('Przyspieszenie to pochodna prędkości','Acceleration is the derivative of velocity'),x:$t('Różniczkujemy jeszcze raz:','Differentiate once more:'),f:[`${V('a⃗')}(${V('t')}) = ${V('v⃗')}′(${V('t')}) = ${vec(polyT(ax),polyT(ay))}`]},
      {t:$t(`Podstawiamy t = ${t0} s`,`Substituting t = ${t0} s`),x:'',f:[`${V('v⃗')}(${t0}) = ${vec(subP(vx,t0),subP(vy,t0))} = <b>${vec(nfi(VX),nfi(VY))}</b> m/s`,`${V('a⃗')}(${t0}) = ${vec(subP(ax,t0),subP(ay,t0))} = <b>${vec(nfi(AX),nfi(AY))}</b> m/s²`]},
      {t:$t('Wartość prędkości','The speed'),x:$t('Długość wektora liczymy z twierdzenia Pitagorasa:','The length of the vector comes from Pythagoras:'),f:[`|${V('v⃗')}| = ${SQ(`${V('v','x',2)} + ${V('v','y',2)}`)} = ${SQ(`${VX<0?`(${nfi(VX)})`:nfi(VX)}<sup>2</sup> + ${VY<0?`(${nfi(VY)})`:nfi(VY)}<sup>2</sup>`)} ≈ <b>${nf(vl)} m/s</b>`]},
    ],
    hint:$t('v⃗ = r⃗′, a⃗ = r⃗″; (tⁿ)′ = n·tⁿ⁻¹. Najpierw wzory, dopiero potem t.','v⃗ = r⃗′, a⃗ = r⃗″; (tⁿ)′ = n·tⁿ⁻¹. Formulas first, then substitute t.')
  });
}
function fzRzut(){
  const g=OPT.g,kmh=Math.random()<.5,v0n=kmh?pick([36,54,72,90]):pick([10,15,20,25,30]),v0=kmh?v0n/3.6:v0n,al=pick([30,45,60,15,75]);
  const T=2*v0*Math.sin(rad(al))/g,Lz=v0*v0*Math.sin(rad(2*al))/g,H=(v0*Math.sin(rad(al)))**2/(2*g);
  const conv=kmh?[{t:$t('Jednostki','Units'),x:$t('Prędkość w m/s: dzielimy przez 3,6.','Speed in m/s: divide by 3.6.'),f:[`${V('v',0)} = ${FR(v0n,'3,6')} = ${nf(v0)} m/s`]}]:[];
  return fzTask({
    q:$t(`Kamień rzucono z ziemi z prędkością ${v0n} ${kmh?'km/h':'m/s'} pod kątem ${al}° do poziomu. Oporu powietrza nie uwzględniamy. Oblicz czas lotu, zasięg i największą wysokość.`,`A stone is thrown from the ground at ${v0n} ${kmh?'km/h':'m/s'} at ${al}° to the horizontal. Air resistance is neglected. Find the time of flight, the range and the maximum height.`),
    data:[[V('v',0),v0n,kmh?'km/h':'m/s'],['α',al+DEG,'']],gNote:true,
    ask:[{lab:V('t','c'),unit:'s',v:T},{lab:'ℓ',unit:'m',v:Lz},{lab:V('H'),unit:'m',v:H}],
    fig:k=>figRzut(al,k-conv.length),
    steps:[...conv,
      {t:$t('Ruch w dwóch kierunkach','Motion in two directions'),x:$t('Poziomo nic nie działa, pionowo działa przyspieszenie <i>g</i> w dół:','Nothing acts horizontally; vertically the acceleration <i>g</i> points down:'),f:[`${V('x')}(${V('t')}) = ${V('v',0)} cos α · ${V('t')}`,`${V('y')}(${V('t')}) = ${V('v',0)} sin α · ${V('t')} − ${FR(V('g')+V('t','',2),2)}`]},
      {t:$t('Czas lotu','Time of flight'),x:$t('Kamień spada na ziemię, gdy <i>y</i> = 0 (drugi raz, pierwszy jest dla <i>t</i> = 0):','The stone lands when <i>y</i> = 0 (the second time; the first is <i>t</i> = 0):'),f:[`${V('t','c')} = ${FR('2'+V('v',0)+' sin α',V('g'))} = ${FR(`2 · ${nf(v0)} · sin ${al}°`,gH())} ≈ <b>${nf(T)} s</b>`]},
      {t:$t('Zasięg','Range'),x:$t('Przez czas lotu kamień leci poziomo ze stałą prędkością <i>v</i><sub>0</sub> cos α. Ze wzoru 2 sin α cos α = sin 2α:','During the flight the stone moves horizontally at the constant speed <i>v</i><sub>0</sub> cos α. Using 2 sin α cos α = sin 2α:'),f:[`ℓ = ${V('v',0)} cos α · ${V('t','c')} = ${FR(V('v','0',2)+' sin 2α',V('g'))} = ${FR(`${nf(v0)}<sup>2</sup> · sin ${2*al}°`,gH())} ≈ <b>${nf(Lz)} m</b>`]},
      {t:$t('Największa wysokość','Maximum height'),x:$t('Na szczycie prędkość pionowa jest zerem, czyli w połowie czasu lotu:','At the top the vertical velocity is zero, which happens at half the flight time:'),f:[`${V('H')} = ${FR(`(${V('v',0)} sin α)<sup>2</sup>`,'2'+V('g'))} = ${FR(`(${nf(v0)} · sin ${al}°)<sup>2</sup>`,'2 · '+gH())} ≈ <b>${nf(H)} m</b>`]},
    ],
    hint:$t('t = 2v₀ sin α / g, ℓ = v₀² sin 2α / g, H = (v₀ sin α)² / (2g).','t = 2v₀ sin α / g, ℓ = v₀² sin 2α / g, H = (v₀ sin α)² / (2g).')
  });
}

// ---------- 2. ruch po okręgu ----------
function fzOkr(){
  const cube=Math.random()<.35,half=!cube&&Math.random()<.3,b=half?.5:pick([1,2,3]),c=rnd(0,3),P=cube?[0,c,0,b]:[0,c,b],r=pick([0.5,0.8,1,1.5,2]),t0=pick([1,2]);
  const W=dPoly(P),E=dPoly(W),w=evP(W,t0),e=evP(E,t0),v=r*w,at=r*e,an=w*w*r,a=Math.hypot(at,an);
  const phiH=(half?`${FR(1,2)}<i>t</i><sup>2</sup>`:polyT(cube?[0,0,0,b]:[0,0,b]))+(c?' + '+polyT([0,c]):'');
  return fzTask({
    q:$t(`Punkt porusza się po okręgu o promieniu ${nfi(r)} m, a jego droga kątowa to <span class="f">φ(${V('t')}) = ${phiH}</span> rad (czas w sekundach). Oblicz w chwili <span class="f">${V('t')} = ${t0}</span> s prędkość kątową, prędkość liniową oraz przyspieszenie styczne i normalne.`,`A point moves on a circle of radius ${nfi(r)} m with the angular position <span class="f">φ(${V('t')}) = ${phiH}</span> rad (time in seconds). At <span class="f">${V('t')} = ${t0}</span> s find the angular velocity, the linear speed and the tangential and normal accelerations.`),
    data:[[V('r'),r,'m'],[V('t'),t0,'s']],fig:k=>figOkrag(k),
    ask:[{lab:'ω',unit:'rad/s',v:w},{lab:V('v'),unit:'m/s',v},{lab:V('a','t'),unit:'m/s²',v:at},{lab:V('a','n'),unit:'m/s²',v:an}],
    steps:[
      {t:$t('Prędkość kątowa','Angular velocity'),x:$t('To pochodna drogi kątowej po czasie:','It is the derivative of the angular position with respect to time:'),f:[`ω(${V('t')}) = φ′(${V('t')}) = ${polyT(W)}`,`ω(${t0}) = <b>${nf(w)} rad/s</b>`]},
      {t:$t('Prędkość liniowa','Linear speed'),x:$t('Punkt na okręgu o promieniu <i>r</i> ma prędkość styczną do okręgu o wartości:','A point on a circle of radius <i>r</i> moves tangentially with speed:'),f:[`${V('v')} = ${V('r')}ω = ${nfi(r)} · ${nf(w)} = <b>${nf(v)} m/s</b>`]},
      {t:$t('Przyspieszenie styczne','Tangential acceleration'),x:$t('Przyspieszenie kątowe α to pochodna prędkości kątowej; styczne zmienia wartość prędkości:','The angular acceleration α is the derivative of the angular velocity; the tangential acceleration changes the speed:'),f:[`α(${V('t')}) = ω′(${V('t')}) = ${polyT(E)}, &nbsp; α(${t0}) = ${nf(e)} rad/s²`,`${V('a','t')} = ${V('r')}α = ${nfi(r)} · ${nf(e)} = <b>${nf(at)} m/s²</b>`]},
      {t:$t('Przyspieszenie normalne','Normal acceleration'),x:$t('Jest skierowane do środka okręgu i zmienia kierunek prędkości. Całkowite przyspieszenie to suma wektorowa obu składowych:','It points to the centre of the circle and changes the direction of the velocity. The total acceleration is the vector sum of both components:'),f:[`${V('a','n')} = ω<sup>2</sup>${V('r')} = ${nf(w)}<sup>2</sup> · ${nfi(r)} = <b>${nf(an)} m/s²</b>`,`${V('a')} = ${SQ(`${V('a','t',2)} + ${V('a','n',2)}`)} ≈ ${nf(a)} m/s²`]},
    ],
    hint:$t('ω = φ′, α = ω′, v = rω, aₜ = rα, aₙ = ω²r.','ω = φ′, α = ω′, v = rω, aₜ = rα, aₙ = ω²r.')
  });
}
function fzDos(){
  const g=OPT.g,v=rnd(0,3);
  if(v===0){
    const L=pick([0.5,0.8,1,1.2]),m=pick([0.5,1,2]),F=pick([20,30,40,50,60]),w=Math.sqrt(F/(m*L)),n=w*60/(2*Math.PI);
    return fzTask({
      q:$t(`Odważnik o masie ${nfi(m)} kg krąży poziomo na lince o długości ${nfi(L)} m. Linka wytrzymuje siłę ${F} N, przy większej się zrywa. Przy jakiej prędkości kątowej linka się zerwie? Ciężar odważnika pomijamy.`,`A ${nfi(m)} kg weight whirls horizontally on a ${nfi(L)} m string. The string withstands ${F} N and breaks at a larger force. At what angular velocity does it break? The weight’s gravity is neglected.`),
      data:[[V('m'),m,'kg'],[V('r'),L,'m'],[V('F','max'),F,'N']],
      ask:[{lab:'ω',unit:'rad/s',v:w},{lab:V('n'),unit:$t('obr/min','rpm'),v:n}],
      steps:[
        {t:$t('Siła dośrodkowa','Centripetal force'),x:$t('Linka dostarcza siły dośrodkowej, która utrzymuje odważnik na okręgu:','The string provides the centripetal force that keeps the weight on the circle:'),f:[`${V('F')} = ${V('m')}ω<sup>2</sup>${V('r')}`]},
        {t:$t('Graniczna prędkość kątowa','The limiting angular velocity'),x:$t('Linka zrywa się, gdy potrzebna siła przekroczy wytrzymałość:','The string breaks when the required force exceeds its strength:'),f:[`ω = ${SQ(FR(V('F','max'),V('m')+V('r')))} = ${SQ(FR(F,`${nfi(m)} · ${nfi(L)}`))} ≈ <b>${nf(w)} rad/s</b>`]},
        {t:$t('Obroty na minutę','Revolutions per minute'),x:$t('Jeden obrót to 2π rad, a minuta ma 60 s:','One revolution is 2π rad and a minute has 60 s:'),f:[`${V('n')} = ${FR('60 · ω','2π')} ≈ <b>${nf(n)} ${$t('obr/min','rpm')}</b>`]},
      ],
      hint:$t('F = mω²r, stąd ω = √(F / (mr)).','F = mω²r, so ω = √(F / (mr)).')
    });
  }
  if(v===1){
    const R=pick([100,200,300,500]),vk=pick([54,72,90,108]),vs=vk/3.6,th=Math.atan(g*R/(vs*vs))*180/Math.PI;
    return fzTask({
      q:$t(`Motocyklista jedzie z prędkością ${vk} km/h po zakręcie o promieniu ${R} m. Pod jakim kątem do poziomu musi się pochylić?`,`A motorcyclist rides at ${vk} km/h around a curve of radius ${R} m. At what angle to the horizontal must they lean?`),
      data:[[V('v'),vk,'km/h'],[V('R'),R,'m']],gNote:true,ask:[{lab:'θ',unit:'°',v:th,tol:.01}],
      steps:[
        {t:$t('Jednostki','Units'),x:'',f:[`${V('v')} = ${FR(vk,'3,6')} = ${nf(vs)} m/s`]},
        {t:$t('Siły w układzie motocyklisty','Forces in the rider’s frame'),x:$t('Na motocyklistę działa ciężar <i>mg</i> w dół i (pozorna) siła odśrodkowa <i>mv</i><sup>2</sup>/<i>R</i> na zewnątrz. Pochyla się tak, żeby wypadkowa tych sił szła wzdłuż jego osi, przez punkt styku z jezdnią.','The rider feels the weight <i>mg</i> downwards and the (fictitious) centrifugal force <i>mv</i><sup>2</sup>/<i>R</i> outwards. They lean so that the resultant of these forces runs along their axis, through the contact point with the road.')},
        {t:$t('Kąt','The angle'),x:$t('Kąt θ między osią motocyklisty a poziomem spełnia:','The angle θ between the rider’s axis and the horizontal satisfies:'),f:[`tg θ = ${FR(V('m')+V('g'),FR(V('m')+V('v','',2),V('R')))} = ${FR(V('g')+V('R'),V('v','',2))} = ${FR(`${gH()} · ${R}`,`${nf(vs)}<sup>2</sup>`)} ≈ ${nf(g*R/(vs*vs))}`,`θ = arctg ${nf(g*R/(vs*vs))} ≈ <b>${nf(th)}°</b>`]},
      ],
      hint:$t('tg θ = g R / v² (kąt do poziomu); masa się skraca.','tan θ = g R / v² (angle to the horizontal); the mass cancels.')
    });
  }
  if(v===2){
    const L=pick([1,1.2,1.5,2]),th=pick([20,30,40]),m=pick([4,5,6,7]),w=Math.sqrt(g/(L*Math.sin(rad(th)))),T=m*g/Math.sin(rad(th));
    return fzTask({
      q:$t(`Młociarz kręci kulą o masie ${m} kg. Odległość środka kuli od osi obrotu mierzona wzdłuż linki to ${nfi(L)} m, a napięta linka tworzy z poziomem kąt ${th}° (kula jest niżej niż ręce). Jaka jest prędkość kątowa kuli i z jaką siłą zawodnik ciągnie linkę?`,`A hammer thrower whirls a ${m} kg ball. The distance from the axis to the ball’s centre measured along the line is ${nfi(L)} m, and the taut line makes ${th}° with the horizontal (the ball is lower than the hands). Find the ball’s angular velocity and the force with which the athlete pulls the line.`),
      data:[[V('m'),m,'kg'],[V('L'),L,'m'],['θ',th+DEG,'']],gNote:true,
      ask:[{lab:'ω',unit:'rad/s',v:w},{lab:V('N'),unit:'N',v:T}],
      steps:[
        {t:$t('Rozkład siły w lince','Splitting the line force'),x:$t('Siła napięcia <i>N</i> ma składową pionową, która równoważy ciężar, i poziomą, która jest siłą dośrodkową. Kula krąży po okręgu o promieniu <i>L</i> cos θ:','The tension <i>N</i> has a vertical component balancing the weight and a horizontal one that is the centripetal force. The ball circles with radius <i>L</i> cos θ:'),f:[`${V('N')} sin θ = ${V('m')}${V('g')}`,`${V('N')} cos θ = ${V('m')}ω<sup>2</sup>${V('L')} cos θ &nbsp;⇒&nbsp; ${V('N')} = ${V('m')}ω<sup>2</sup>${V('L')}`]},
        {t:$t('Prędkość kątowa','Angular velocity'),x:$t('Wstawiamy <i>N</i> = <i>m</i>ω²<i>L</i> do pierwszego równania; masa się skraca:','Insert <i>N</i> = <i>m</i>ω²<i>L</i> into the first equation; the mass cancels:'),f:[`ω = ${SQ(FR(V('g'),V('L')+' sin θ'))} = ${SQ(FR(gH(),`${nfi(L)} · sin ${th}°`))} ≈ <b>${nf(w)} rad/s</b>`]},
        {t:$t('Siła w lince','The force in the line'),x:'',f:[`${V('N')} = ${FR(V('m')+V('g'),'sin θ')} = ${FR(`${m} · ${gH()}`,`sin ${th}°`)} ≈ <b>${nf(T)} N</b>`]},
      ],
      hint:$t('N sin θ = mg (pion), N cos θ = mω²·L cos θ (poziom).','N sin θ = mg (vertical), N cos θ = mω²·L cos θ (horizontal).')
    });
  }
  const mu=pick([0.3,0.4,0.5,0.6,0.7]),R=pick([30,50,80,100,150]),vm=Math.sqrt(mu*g*R);
  return fzTask({
    q:$t(`Samochód wjeżdża w płaski zakręt o promieniu ${R} m. Współczynnik tarcia opon o jezdnię wynosi ${nfi(mu)}. Z jaką największą prędkością może jechać, żeby nie wypaść z zakrętu?`,`A car takes a flat curve of radius ${R} m. The coefficient of friction between the tyres and the road is ${nfi(mu)}. What is the highest speed at which it does not skid off?`),
    data:[[V('R'),R,'m'],['μ',mu,'']],gNote:true,ask:[{lab:V('v','max'),unit:'m/s',v:vm},{lab:V('v','max'),unit:'km/h',v:vm*3.6}],
    steps:[
      {t:$t('Tarcie jako siła dośrodkowa','Friction as the centripetal force'),x:$t('Na płaskim zakręcie do środka ciągnie tylko tarcie, a największe możliwe tarcie to μ<i>mg</i>:','On a flat curve only friction pulls towards the centre, and the largest possible friction is μ<i>mg</i>:'),f:[`${FR(V('m')+V('v','',2),V('R'))} ≤ μ${V('m')}${V('g')}`]},
      {t:$t('Największa prędkość','The highest speed'),x:$t('Masa się skraca:','The mass cancels:'),f:[`${V('v','max')} = ${SQ('μ'+V('g')+V('R'))} = ${SQ(`${nfi(mu)} · ${gH()} · ${R}`)} ≈ <b>${nf(vm)} m/s</b> ≈ <b>${nf(vm*3.6)} km/h</b>`]},
    ],
    hint:$t('mv²/R = μmg.','mv²/R = μmg.')
  });
}

// ---------- 3. siły, jednostki ----------
function fzPas(){
  const m=pick([1200,2500,3800,5000,8000]),F=pick([4000,6000,9810,12000,20000]),vk=pick([120,140,160,180,200]),v=vk/3.6,a=F/m,s=v*v/(2*a),t=v/a;
  return fzTask({
    q:$t(`Samolot o masie ${m} kg rozpędza się na pasie startowym siłą ciągu ${F} N. Do startu potrzebuje prędkości ${vk} km/h. Jak długi musi być pas i ile trwa rozbieg? Opory ruchu pomijamy.`,`A ${m} kg plane accelerates on the runway with a thrust of ${F} N. It needs ${vk} km/h to take off. How long must the runway be and how long does the run take? Resistance is neglected.`),
    data:[[V('m'),m,'kg'],[V('F'),F,'N'],[V('v'),vk,'km/h']],ask:[{lab:V('s'),unit:'m',v:s},{lab:V('t'),unit:'s',v:t}],
    steps:[
      {t:$t('Przyspieszenie','Acceleration'),x:$t('Druga zasada dynamiki:','Newton’s second law:'),f:[`${V('a')} = ${FR(V('F'),V('m'))} = ${FR(F,m)} ≈ ${nf(a)} m/s²`]},
      {t:$t('Jednostki','Units'),x:'',f:[`${V('v')} = ${FR(vk,'3,6')} ≈ ${nf(v)} m/s`]},
      {t:$t('Długość pasa','Runway length'),x:$t('Ruch jednostajnie przyspieszony od zera:','Uniformly accelerated motion from rest:'),f:[`${V('s')} = ${FR(V('v','',2),'2'+V('a'))} = ${FR(nf(v)+'<sup>2</sup>','2 · '+nf(a))} ≈ <b>${nf(s)} m</b>`]},
      {t:$t('Czas rozbiegu','Run time'),x:'',f:[`${V('t')} = ${FR(V('v'),V('a'))} ≈ <b>${nf(t)} s</b>`]},
    ],
    hint:$t('a = F/m, s = v²/(2a), t = v/a; prędkość w m/s.','a = F/m, s = v²/(2a), t = v/a; speed in m/s.')
  });
}
const UNIT_Q=[
  ()=>{const x=pick([36,54,72,90,100,120,140]);return {q:[`Zamień ${x} km/h na m/s.`,`Convert ${x} km/h to m/s.`],lab:V('v'),unit:'m/s',v:x/3.6,f:`${x} km/h = ${FR(`${x} · 1000 m`,'3600 s')} = ${FR(x,'3,6')} m/s`}},
  ()=>{const x=pick([5,10,12,15,20,25,30]);return {q:[`Zamień ${x} m/s na km/h.`,`Convert ${x} m/s to km/h.`],lab:V('v'),unit:'km/h',v:x*3.6,f:`${x} m/s = ${x} · 3,6 km/h`}},
  ()=>{const x=pick([75,100,150,200,300]);return {q:[`Silnik ma moc ${x} KM. Ile to kilowatów? (1 KM ≈ 735,5 W)`,`An engine has ${x} hp (metric). How many kilowatts is that? (1 KM ≈ 735.5 W)`],lab:V('P'),unit:'kW',v:x*.7355,f:`${x} · 735,5 W = ${nf(x*735.5,4)} W`}},
  ()=>{const x=pick([1,2,5,10,25]);return {q:[`Ile dżuli to ${x} kWh?`,`How many joules is ${x} kWh?`],lab:V('E'),unit:'J',v:x*3.6e6,f:`1 kWh = 1000 W · 3600 s = 3,6·10<sup>6</sup> J`}},
  ()=>{const x=pick([30,60,90,120,300,600,1500]);return {q:[`Koło obraca się z prędkością ${x} obr/min. Ile to rad/s?`,`A wheel turns at ${x} rpm. How many rad/s is that?`],lab:'ω',unit:'rad/s',v:x*2*Math.PI/60,f:`ω = ${FR(`${x} · 2π`,'60 s')}`}},
  ()=>{const t=pick([1.28,2.5,8.3,500,12.66*60]),d=3e8*t;return {q:[`Sygnał radiowy (prędkość światła, 3,00·10⁸ m/s) potrzebuje ${nf(t)} s, żeby dotrzeć z Ziemi do sondy. Jak daleko jest sonda?`,`A radio signal (speed of light, 3.00·10⁸ m/s) needs ${nf(t)} s to reach a probe from Earth. How far away is the probe?`],lab:V('d'),unit:'m',v:d,f:`${V('d')} = ${V('c')}${V('t')} = 3,00·10<sup>8</sup> · ${nf(t)}`}},
  ()=>{const x=pick([5,20,50,250,1500]);return {q:[`Ile to metrów sześciennych: ${x} litrów?`,`How many cubic metres is ${x} litres?`],lab:V('V'),unit:'m³',v:x/1000,f:'1 l = 1 dm³ = 10<sup>−3</sup> m³'}},
];
function fzJedn(){
  const u=pick(UNIT_Q)();
  return fzTask({q:T2(u.q),data:[],ask:[{lab:u.lab,unit:u.unit,v:u.v}],steps:[{t:$t('Przeliczenie','Conversion'),x:'',f:[`${u.f} ≈ <b>${nf(u.v)} ${u.unit}</b>`]}],hint:$t('km/h : 3,6 = m/s; 1 KM ≈ 735,5 W; 1 kWh = 3,6·10⁶ J; 1 obr = 2π rad.','km/h ÷ 3.6 = m/s; 1 hp ≈ 735.5 W; 1 kWh = 3.6·10⁶ J; 1 rev = 2π rad.')});
}

// ---------- 4. środek masy ----------
function fzCm(){
  if(Math.random()<.7){
    const a=pick([1,2,3]),b=pick([1,2]),ms=[rnd(1,5),rnd(1,5),rnd(1,5),rnd(1,5)],M=ms.reduce((x,y)=>x+y,0);
    const P=[[0,b],[a,b],[a,0],[0,0]],xc=ms.reduce((s,m,k)=>s+m*P[k][0],0)/M,yc=ms.reduce((s,m,k)=>s+m*P[k][1],0)/M;
    const sumX=ms.map((m,k)=>`${m} · ${P[k][0]}`).join(' + '),sumY=ms.map((m,k)=>`${m} · ${P[k][1]}`).join(' + ');
    return fzTask({
      q:$t(`W rogach prostokątnej płyty ${a} m × ${b} m leżą odważniki jak na rysunku (masę płyty pomijamy). W którym punkcie trzeba podeprzeć płytę, żeby była w równowadze? Podaj współrzędne w układzie z początkiem w lewym dolnym rogu.`,`Weights lie at the corners of a ${a} m × ${b} m plate as in the figure (the plate’s mass is neglected). At which point must the plate be supported to stay balanced? Give the coordinates with the origin at the bottom left corner.`),
      data:[],fig:k=>figCm(ms,a,b,[xc,yc],k<0?0:k),
      ask:[{lab:V('x','S'),unit:'m',v:xc,abs:.005},{lab:V('y','S'),unit:'m',v:yc,abs:.005}],
      steps:[
        {t:$t('Środek masy','Centre of mass'),x:$t('Płytę podpieramy w środku masy: to średnia położeń ważona masami.','The plate is supported at the centre of mass: the average of the positions weighted by the masses.'),f:[`${V('x','S')} = ${FR('Σ '+V('m','i')+V('x','i'),'Σ '+V('m','i'))}, &nbsp; ${V('y','S')} = ${FR('Σ '+V('m','i')+V('y','i'),'Σ '+V('m','i'))}`]},
        {t:$t('Współrzędna x','The x coordinate'),x:$t(`Masa całkowita to ${M} kg.`,`The total mass is ${M} kg.`),f:[`${V('x','S')} = ${FR(sumX,M)} ≈ <b>${nf(xc)} m</b>`]},
        {t:$t('Współrzędna y','The y coordinate'),x:'',f:[`${V('y','S')} = ${FR(sumY,M)} ≈ <b>${nf(yc)} m</b>`]},
      ],
      hint:$t('xₛ = Σmᵢxᵢ / Σmᵢ, tak samo dla y.','xₛ = Σmᵢxᵢ / Σmᵢ, and the same for y.')
    });
  }
  const m1=pick([5.97,6.4,4.9]),m2=pick([0.0735,0.074,0.065]),d=pick([3.84,3.8,4.0]),x=d*1e8*m2/(m1+m2);
  return fzTask({
    q:$t(`Planeta ma masę ${nf(m1)}·10²⁴ kg, a jej księżyc ${nf(m2*100)}·10²² kg. Odległość między ich środkami wynosi ${nf(d)}·10⁸ m. Jak daleko od środka planety leży środek masy układu?`,`A planet has a mass of ${nf(m1)}·10²⁴ kg and its moon ${nf(m2*100)}·10²² kg. Their centres are ${nf(d)}·10⁸ m apart. How far from the planet’s centre is the centre of mass of the system?`),
    data:[[V('m',1),nf(m1)+'·10<sup>24</sup>','kg'],[V('m',2),nf(m2*100)+'·10<sup>22</sup>','kg'],[V('d'),nf(d)+'·10<sup>8</sup>','m']],
    ask:[{lab:V('x','S'),unit:'m',v:x}],
    steps:[
      {t:$t('Oś przez oba środki','An axis through both centres'),x:$t('Planeta w <i>x</i> = 0, księżyc w <i>x</i> = <i>d</i>:','The planet at <i>x</i> = 0, the moon at <i>x</i> = <i>d</i>:'),f:[`${V('x','S')} = ${FR(V('m',1)+' · 0 + '+V('m',2)+V('d'),V('m',1)+' + '+V('m',2))} = ${FR(V('m',2)+V('d'),V('m',1)+' + '+V('m',2))}`]},
      {t:$t('Liczymy','Computing'),x:$t('Obie masy zapisujemy w tej samej potędze dziesięciu.','Write both masses with the same power of ten.'),f:[`${V('x','S')} = ${FR(`${nf(m2,3)}·10<sup>24</sup> · ${nf(d)}·10<sup>8</sup>`,`${nf(m1+m2,4)}·10<sup>24</sup>`)} ≈ <b>${nf(x)} m</b>`]},
    ],
    hint:$t('xₛ = m₂d / (m₁ + m₂).','xₛ = m₂d / (m₁ + m₂).')
  });
}

// ---------- 5. praca, energia, obrót ----------
function fzEner(){
  const g=OPT.g;
  if(Math.random()<.5){
    const h=pick([5,10,15,20,45,80]),v=Math.sqrt(2*g*h);
    return fzTask({
      q:$t(`Z wysokości ${h} m upuszczono kulkę. Z jaką prędkością uderzy w ziemię? Oporu powietrza nie uwzględniamy.`,`A ball is dropped from a height of ${h} m. How fast does it hit the ground? Air resistance is neglected.`),
      data:[[V('h'),h,'m']],gNote:true,ask:[{lab:V('v'),unit:'m/s',v},{lab:V('v'),unit:'km/h',v:v*3.6}],
      steps:[
        {t:$t('Zasada zachowania energii','Conservation of energy'),x:$t('Na górze kulka ma tylko energię potencjalną, na dole tylko kinetyczną. Energia całkowita się nie zmienia, więc czasu lotu nie trzeba liczyć:','At the top the ball has only potential energy, at the bottom only kinetic energy. The total energy does not change, so the flight time is not needed:'),f:[`${V('m')}${V('g')}${V('h')} = ${FR(V('m')+V('v','',2),2)}`]},
        {t:$t('Prędkość','The speed'),x:$t('Masa się skraca:','The mass cancels:'),f:[`${V('v')} = ${SQ('2'+V('g')+V('h'))} = ${SQ(`2 · ${gH()} · ${h}`)} ≈ <b>${nf(v)} m/s</b> ≈ <b>${nf(v*3.6)} km/h</b>`]},
      ],
      hint:$t('mgh = mv²/2.','mgh = mv²/2.')
    });
  }
  const vk=pick([36,54,72,90]),v=vk/3.6,h=v*v/(2*g);
  return fzTask({
    q:$t(`Piłkę wyrzucono pionowo w górę z prędkością ${vk} km/h. Na jaką wysokość się wzniesie? Oporu powietrza nie uwzględniamy.`,`A ball is thrown straight up at ${vk} km/h. How high does it rise? Air resistance is neglected.`),
    data:[[V('v',0),vk,'km/h']],gNote:true,ask:[{lab:V('h'),unit:'m',v:h}],
    steps:[
      {t:$t('Jednostki','Units'),x:'',f:[`${V('v',0)} = ${FR(vk,'3,6')} = ${nf(v)} m/s`]},
      {t:$t('Zasada zachowania energii','Conservation of energy'),x:$t('W najwyższym punkcie prędkość jest zerem, więc cała energia kinetyczna zamienia się w potencjalną:','At the highest point the speed is zero, so all the kinetic energy turns into potential energy:'),f:[`${FR(V('m')+V('v','0',2),2)} = ${V('m')}${V('g')}${V('h')} &nbsp;⇒&nbsp; ${V('h')} = ${FR(V('v','0',2),'2'+V('g'))} = ${FR(nf(v)+'<sup>2</sup>','2 · '+gH())} ≈ <b>${nf(h)} m</b>`]},
    ],
    hint:$t('mv₀²/2 = mgh.','mv₀²/2 = mgh.')
  });
}
function fzMoc(){
  const m=pick([800,1000,1200,1500]),km=pick([100,150,200,300]),P=km*735.5,vk=100,v=vk/3.6,t=m*v*v/(2*P),s=2/3*v*t;
  return fzTask({
    q:$t(`Samochód o masie ${m} kg ma silnik o mocy ${km} KM, który od razu pracuje z pełną mocą. Ile czasu zajmie mu rozpędzenie się od zera do ${vk} km/h i jaką drogę przy tym przejedzie? Oporów ruchu nie ma; 1 KM ≈ 735,5 W.`,`A car of mass ${m} kg has a ${km} hp engine that works at full power from the start. How long does it take to go from zero to ${vk} km/h, and how far does it travel meanwhile? There is no resistance; 1 hp ≈ 735.5 W.`),
    data:[[V('m'),m,'kg'],[V('P'),km,'KM'],[V('v'),vk,'km/h']],ask:[{lab:V('t'),unit:'s',v:t},{lab:V('s'),unit:'m',v:s,tol:.02}],
    steps:[
      {t:$t('Jednostki','Units'),x:'',f:[`${V('P')} = ${km} · 735,5 W = ${nf(P,4)} W`,`${V('v')} = ${FR(vk,'3,6')} ≈ ${nf(v)} m/s`]},
      {t:$t('Praca silnika to energia kinetyczna','The engine’s work is the kinetic energy'),x:$t('Przy stałej mocy praca to moc razy czas:','At constant power the work is power times time:'),f:[`${V('P')}${V('t')} = ${FR(V('m')+V('v','',2),2)} &nbsp;⇒&nbsp; ${V('t')} = ${FR(V('m')+V('v','',2),'2'+V('P'))} = ${FR(`${m} · ${nf(v)}<sup>2</sup>`,`2 · ${nf(P,4)}`)} ≈ <b>${nf(t)} s</b>`]},
      {t:$t('Droga','The distance'),x:$t('Przyspieszenie nie jest stałe: z <i>Pt</i> = <i>mv</i>²/2 wynika <i>v</i>(<i>t</i>) = √(2<i>Pt</i>/<i>m</i>). Całkując, dostajemy:','The acceleration is not constant: <i>Pt</i> = <i>mv</i>²/2 gives <i>v</i>(<i>t</i>) = √(2<i>Pt</i>/<i>m</i>). Integrating gives:'),f:[`${V('s')} = ∫<sub>0</sub><sup>${V('t')}</sup> ${SQ(FR('2'+V('P')+'τ',V('m')))} dτ = ${FR(2,3)}${V('v')}${V('t')} ≈ <b>${nf(s)} m</b>`]},
    ],
    hint:$t('Pt = mv²/2; przy stałej mocy s = (2/3)·v·t.','Pt = mv²/2; at constant power s = (2/3)·v·t.')
  });
}
function fzObr(){
  if(Math.random()<.5){
    const m=pick([200,500,1000,1500]),r=pick([0.5,0.8,1,1.2]),n=pick([30,60,120,300]),w=2*Math.PI*n/60,I=m*r*r/2,E=I*w*w/2;
    return fzTask({
      q:$t(`Koło zamachowe ma kształt walca o masie ${m} kg i promieniu ${nfi(r)} m. Ile pracy trzeba wykonać, żeby rozkręcić je od zera do ${n} obr/min?`,`A flywheel is a cylinder of mass ${m} kg and radius ${nfi(r)} m. How much work is needed to spin it up from rest to ${n} rpm?`),
      data:[[V('m'),m,'kg'],[V('r'),r,'m'],[V('n'),n,$t('obr/min','rpm')]],ask:[{lab:V('W'),unit:'J',v:E}],
      steps:[
        {t:$t('Moment bezwładności walca','Moment of inertia of a cylinder'),x:$t('Względem osi walca:','About the cylinder’s axis:'),f:[`${V('I')} = ${FR(V('m')+V('r','',2),2)} = ${FR(`${m} · ${nfi(r)}<sup>2</sup>`,2)} = ${nf(I)} kg·m²`]},
        {t:$t('Prędkość kątowa','Angular velocity'),x:$t('Obroty na minutę zamieniamy na radiany na sekundę:','Convert revolutions per minute to radians per second:'),f:[`ω = ${FR(`${n} · 2π`,'60 s')} ≈ ${nf(w)} rad/s`]},
        {t:$t('Praca to energia kinetyczna obrotu','The work is the rotational kinetic energy'),x:'',f:[`${V('W')} = ${FR(V('I')+'ω<sup>2</sup>',2)} = ${FR(`${nf(I)} · ${nf(w)}<sup>2</sup>`,2)} ≈ <b>${nf(E)} J</b>`]},
      ],
      hint:$t('I = mr²/2, ω = 2πn/60, W = Iω²/2.','I = mr²/2, ω = 2πn/60, W = Iω²/2.')
    });
  }
  const m=pick([2000,4000,6000,7850]),vk=pick([5,10,15]),v=vk/3.6,Pk=pick([50,100,250,500]),E=.75*m*v*v,t=E/(Pk*1000);
  return fzTask({
    q:$t(`Walec o masie ${m} kg zaczyna toczyć się bez poślizgu po poziomej powierzchni, ciągnięty z mocą ${Pk} kW. Ile czasu zajmie rozpędzenie go do ${vk} km/h? Oporów nie ma.`,`A cylinder of mass ${m} kg starts rolling without slipping on a level surface, pulled with a power of ${Pk} kW. How long does it take to reach ${vk} km/h? There is no resistance.`),
    data:[[V('m'),m,'kg'],[V('P'),Pk,'kW'],[V('v'),vk,'km/h']],ask:[{lab:V('E','k'),unit:'J',v:E},{lab:V('t'),unit:'s',v:t}],
    steps:[
      {t:$t('Energia toczącego się walca','The energy of a rolling cylinder'),x:$t('To suma energii ruchu postępowego i obrotowego. Przy toczeniu bez poślizgu ω = <i>v</i>/<i>r</i>, a dla walca <i>I</i> = <i>mr</i>²/2, więc promień się skraca:','It is the sum of the translational and rotational energy. Rolling without slipping means ω = <i>v</i>/<i>r</i>, and for a cylinder <i>I</i> = <i>mr</i>²/2, so the radius cancels:'),f:[`${V('E','k')} = ${FR(V('m')+V('v','',2),2)} + ${FR(V('I')+'ω<sup>2</sup>',2)} = ${FR(V('m')+V('v','',2),2)} + ${FR(V('m')+V('v','',2),4)} = ${FR(3,4)}${V('m')}${V('v','',2)}`]},
      {t:$t('Liczymy energię','Computing the energy'),x:'',f:[`${V('v')} = ${FR(vk,'3,6')} ≈ ${nf(v)} m/s`,`${V('E','k')} = ${FR(3,4)} · ${m} · ${nf(v)}<sup>2</sup> ≈ <b>${nf(E)} J</b>`]},
      {t:$t('Czas','The time'),x:$t('Przy stałej mocy praca to <i>Pt</i>:','At constant power the work is <i>Pt</i>:'),f:[`${V('t')} = ${FR(V('E','k'),V('P'))} = ${FR(nf(E),`${Pk} · 10<sup>3</sup>`)} ≈ <b>${nf(t)} s</b>`]},
    ],
    hint:$t('E = mv²/2 + Iω²/2 = (3/4)mv² dla walca; t = E/P.','E = mv²/2 + Iω²/2 = (3/4)mv² for a cylinder; t = E/P.')
  });
}

// ---------- 6. grawitacja ----------
function fzOrb(){
  const G=6.67e-11;
  if(Math.random()<.5){
    const M=pick([1.99,1.5,2.5,3.0]),r=pick([1.5,1.08,2.28,0.58]),T=2*Math.PI*Math.sqrt((r*1e11)**3/(G*M*1e30)),d=T/86400;
    return fzTask({
      q:$t(`Planeta krąży po okręgu o promieniu ${nf(r)}·10¹¹ m wokół gwiazdy o masie ${nf(M)}·10³⁰ kg. Ile dni trwa jej rok? G = 6,67·10⁻¹¹ m³/(kg·s²).`,`A planet orbits a star of mass ${nf(M)}·10³⁰ kg on a circle of radius ${nf(r)}·10¹¹ m. How many days does its year last? G = 6.67·10⁻¹¹ m³/(kg·s²).`),
      data:[[V('M'),nf(M)+'·10<sup>30</sup>','kg'],[V('r'),nf(r)+'·10<sup>11</sup>','m']],ask:[{lab:V('T'),unit:$t('dni','days'),v:d}],
      steps:[
        {t:$t('Grawitacja jako siła dośrodkowa','Gravity as the centripetal force'),x:$t('Masa planety się skraca:','The planet’s mass cancels:'),f:[`${FR(V('G')+V('M')+V('m'),V('r','',2))} = ${V('m')}ω<sup>2</sup>${V('r')}, &nbsp; ω = ${FR('2π',V('T'))}`]},
        {t:$t('Okres','The period'),x:'',f:[`${V('T')} = 2π${SQ(FR(V('r','',3),V('G')+V('M')))} ≈ ${nf(T)} s`]},
        {t:$t('Na dni','In days'),x:$t('Doba ma 86 400 s:','A day has 86,400 s:'),f:[`${V('T')} ≈ ${FR(nf(T),'86 400')} ≈ <b>${nf(d)} ${$t('dni','days')}</b>`]},
      ],
      hint:$t('GMm/r² = mω²r, T = 2π√(r³/(GM)).','GMm/r² = mω²r, T = 2π√(r³/(GM)).')
    });
  }
  const M=pick([5.97,6.4,4.87]),r=pick([3.84,4.2,3.5]),T=2*Math.PI*Math.sqrt((r*1e8)**3/(G*M*1e24)),d=T/86400;
  return fzTask({
    q:$t(`Księżyc krąży po okręgu o promieniu ${nf(r)}·10⁸ m wokół planety o masie ${nf(M)}·10²⁴ kg. Ile dni trwa jeden obieg? G = 6,67·10⁻¹¹ m³/(kg·s²).`,`A moon orbits a planet of mass ${nf(M)}·10²⁴ kg on a circle of radius ${nf(r)}·10⁸ m. How many days does one orbit take? G = 6.67·10⁻¹¹ m³/(kg·s²).`),
    data:[[V('M'),nf(M)+'·10<sup>24</sup>','kg'],[V('r'),nf(r)+'·10<sup>8</sup>','m']],ask:[{lab:V('T'),unit:$t('dni','days'),v:d}],
    steps:[
      {t:$t('Grawitacja jako siła dośrodkowa','Gravity as the centripetal force'),x:'',f:[`${FR(V('G')+V('M')+V('m'),V('r','',2))} = ${V('m')}${FR('4π<sup>2</sup>',V('T','',2))}${V('r')} &nbsp;⇒&nbsp; ${V('T')} = 2π${SQ(FR(V('r','',3),V('G')+V('M')))}`]},
      {t:$t('Liczymy','Computing'),x:'',f:[`${V('T')} ≈ ${nf(T)} s ≈ <b>${nf(d)} ${$t('dni','days')}</b>`]},
    ],
    hint:$t('T = 2π√(r³/(GM)); doba to 86 400 s.','T = 2π√(r³/(GM)); a day is 86,400 s.')
  });
}

// ---------- rejestr ----------
const FZ_TOPICS=[
  {id:'fz-ham',sec:'Kinematyka',name:'Hamowanie',en:'Braking',gen:fzHam},
  {id:'fz-wek',sec:'Kinematyka',name:'Prędkość z wektora położenia',en:'Velocity from the position vector',gen:fzWek},
  {id:'fz-rzut',sec:'Kinematyka',name:'Rzut ukośny',en:'Projectile motion',gen:fzRzut},
  {id:'fz-okr',sec:'Ruch po okręgu',name:'Niejednostajny ruch po okręgu',en:'Non-uniform circular motion',gen:fzOkr},
  {id:'fz-dos',sec:'Ruch po okręgu',name:'Siła dośrodkowa',en:'Centripetal force',gen:fzDos},
  {id:'fz-pas',sec:'Dynamika i jednostki',name:'Siła i rozbieg',en:'Force and take-off run',gen:fzPas},
  {id:'fz-jedn',sec:'Dynamika i jednostki',name:'Przeliczanie jednostek',en:'Unit conversion',gen:fzJedn},
  {id:'fz-cm',sec:'Środek masy',name:'Środek masy',en:'Centre of mass',gen:fzCm},
  {id:'fz-ener',sec:'Praca i energia',name:'Zasada zachowania energii',en:'Conservation of energy',gen:fzEner},
  {id:'fz-moc',sec:'Praca i energia',name:'Moc i rozpędzanie',en:'Power and acceleration',gen:fzMoc},
  {id:'fz-obr',sec:'Praca i energia',name:'Energia ruchu obrotowego',en:'Rotational energy',gen:fzObr},
  {id:'fz-orb',sec:'Grawitacja',name:'Okres obiegu',en:'Orbital period',gen:fzOrb},
];
addSubject({
  id:'fizyka',name:'Fizyka',en:'Physics',topics:FZ_TOPICS,start:'fz-wek',prKey:'kratka-fizyka-postep-v1',
  secEn:{'Kinematyka':'Kinematics','Ruch po okręgu':'Circular motion','Dynamika i jednostki':'Dynamics and units','Środek masy':'Centre of mass','Praca i energia':'Work and energy','Grawitacja':'Gravitation'},
  sheet:{name:'Wzory',en:'Formulas'},
  opts:()=>`<span class="lbl" id="gL">${$t('Przyspieszenie ziemskie','Gravity')}</span><div class="seg small" role="group" aria-labelledby="gL"><button type="button" data-g="9.81"${OPT.g!==10?' class="on"':''}><i>g</i> = ${nfi(9.81)} m/s²</button><button type="button" data-g="10"${OPT.g===10?' class="on"':''}><i>g</i> = 10 m/s²</button></div>`
});
