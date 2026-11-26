// =====================================================================
//  Czytanie pisma w zeszycie: kreski pióra → tekst działania
// =====================================================================
//  hwRead(kreski) → [{text, box, ids, syms, conf}]: jedno działanie na pozycję (linia pisma albo jej część)
//  1. linie: kreski rozdzielone wyraźną przerwą w pionie,
//  2. ułamki piętrowe: pozioma kreska z czymś nad nią i pod nią,
//  3. znaki: kreski zachodzące na siebie w poziomie (+, =, 4 i × to kilka kresek),
//  4. kropki: przecinek dziesiętny, mnożenie „·”, dzielenie „:”; potęgi: mały znak wyżej,
//  5. każdy znak czyta mała sieć splotowa (HW_MODEL z hw-model.js, tools/hw_train.py).
//  Obraz znaku (hwRaster) musi powstawać dokładnie tak jak raster() w tools/hw_train.py.
//  Poprawki użytkownika (hwLearn) zapisują jego wersję znaku; podobny znak czyta się potem tak samo.
// =====================================================================
let HW_NET=null,HW_CACHE=null,HW_DEF=null;   // HW_DEF: litery, które są zmiennymi (null: wszystkie)   // HW_CACHE: odczytane znaki według identyfikatorów kresek (kreska się nie zmienia)
function hwNet(){
  if(HW_NET)return HW_NET;
  const dq=L=>{const s=atob(L.q),w=new Float32Array(s.length);for(let i=0;i<s.length;i++)w[i]=(s.charCodeAt(i)<<24>>24)*L.s;return {w,b:Float32Array.from(L.b)}};
  HW_NET={c1:dq(HW_MODEL.c1),c2:dq(HW_MODEL.c2),d1:dq(HW_MODEL.d1),d2:dq(HW_MODEL.d2),cls:HW_MODEL.classes};
  return HW_NET;
}
// obraz 28×28 jak w MNIST: znak w ramce 20×20 z zachowaniem proporcji, środek ciężkości w środku
function hwRaster(strokes,r=HW_MODEL.r){
  let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
  for(const p of strokes)for(let i=0;i<p.length;i+=2){x1=Math.min(x1,p[i]);x2=Math.max(x2,p[i]);y1=Math.min(y1,p[i+1]);y2=Math.max(y2,p[i+1])}
  const w=x2-x1,h=y2-y1,s=(20-2*r)/Math.max(w,h,1e-6),ox=(28-w*s)/2,oy=(28-h*s)/2,seg=[];
  for(const p of strokes){
    const q=[];for(let i=0;i<p.length;i+=2)q.push([(p[i]-x1)*s+ox,(p[i+1]-y1)*s+oy]);
    if(q.length===1)q.push(q[0]);
    for(let i=0;i+1<q.length;i++)seg.push([q[i][0],q[i][1],q[i+1][0],q[i+1][1]]);
  }
  const draw=(dx,dy)=>{
    const img=new Float32Array(784);
    for(let py=0;py<28;py++)for(let px=0;px<28;px++){
      const gx=px+.5,gy=py+.5;let d=1e9;
      for(const [ax0,ay0,bx0,by0] of seg){
        const ax=ax0+dx,ay=ay0+dy,ex=bx0-ax0,ey=by0-ay0,L=ex*ex+ey*ey;
        let t=L>0?((gx-ax)*ex+(gy-ay)*ey)/L:0;t=t<0?0:t>1?1:t;
        const qx=gx-(ax+t*ex),qy=gy-(ay+t*ey),dd=qx*qx+qy*qy;if(dd<d)d=dd;
      }
      const v=r+.5-Math.sqrt(d);img[py*28+px]=v<0?0:v>1?1:v;
    }
    return img;
  };
  let img=draw(0,0),m=0,cx=0,cy=0;
  for(let i=0;i<784;i++){m+=img[i];cx+=img[i]*(i%28+.5);cy+=img[i]*((i/28|0)+.5)}
  if(m>0)img=draw(14-cx/m,14-cy/m);
  return img;
}
// sieć: conv 5×5 (12) → pool → conv 5×5 (24) → pool → 64 → klasy; zwraca prawdopodobieństwa i warstwę ukrytą
function hwForward(img){
  const N=hwNet(),a1=new Float32Array(12*144),a2=new Float32Array(24*16),h=new Float32Array(64),o=new Float32Array(N.cls.length);
  const c1=new Float32Array(576);
  for(let f=0;f<12;f++){
    const w=N.c1.w,b=N.c1.b[f];
    for(let y=0;y<24;y++)for(let x=0;x<24;x++){let s=b;for(let ky=0;ky<5;ky++)for(let kx=0;kx<5;kx++)s+=w[f*25+ky*5+kx]*img[(y+ky)*28+x+kx];c1[y*24+x]=s>0?s:0}
    for(let y=0;y<12;y++)for(let x=0;x<12;x++){const i=2*y*24+2*x;a1[f*144+y*12+x]=Math.max(c1[i],c1[i+1],c1[i+24],c1[i+25])}
  }
  const c2=new Float32Array(64);
  for(let f=0;f<24;f++){
    const w=N.c2.w,b=N.c2.b[f];
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){let s=b;for(let c=0;c<12;c++)for(let ky=0;ky<5;ky++){const wo=f*300+c*25+ky*5,io=c*144+(y+ky)*12+x;for(let kx=0;kx<5;kx++)s+=w[wo+kx]*a1[io+kx]}c2[y*8+x]=s>0?s:0}
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const i=2*y*8+2*x;a2[f*16+y*4+x]=Math.max(c2[i],c2[i+1],c2[i+8],c2[i+9])}
  }
  for(let j=0;j<64;j++){let s=N.d1.b[j];for(let i=0;i<384;i++)s+=a2[i]*N.d1.w[i*64+j];h[j]=s>0?s:0}
  const nc=o.length;let mx=-1e9;
  for(let k=0;k<nc;k++){let s=N.d2.b[k];for(let j=0;j<64;j++)s+=h[j]*N.d2.w[j*nc+k];o[k]=s;if(s>mx)mx=s}
  let z=0;for(let k=0;k<nc;k++){o[k]=Math.exp(o[k]-mx);z+=o[k]}for(let k=0;k<nc;k++)o[k]/=z;
  return {p:o,h};
}
// ---------- własne wersje znaków (z poprawek): najbliższy sąsiad w warstwie ukrytej sieci ----------
const HW_ME={list:null,key:'kratka-pismo-v1'};
function hwMine(){
  if(HW_ME.list)return HW_ME.list;
  let d=null;try{d=JSON.parse(localStorage.getItem(HW_ME.key)||'null')}catch(e){d=null}
  HW_ME.list=d&&d.m===HW_MODEL.c1.q.slice(0,24)&&Array.isArray(d.s)?d.s:[];
  return HW_ME.list;
}
function hwLearn(h,ch){
  const L=hwMine(),v=Array.from(h,x=>Math.round(x*100)/100);
  L.push({c:ch,h:v});if(L.length>300)L.splice(0,L.length-300);
  try{localStorage.setItem(HW_ME.key,JSON.stringify({m:HW_MODEL.c1.q.slice(0,24),s:L}))}catch(e){}
}
const hwCos=(a,b)=>{let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}return s/Math.sqrt(na*nb+1e-9)};
function hwClassify(strokes){
  const img=hwRaster(strokes),f=hwForward(img),N=hwNet(),p=Array.from(f.p);
  for(const s of hwMine()){const sim=hwCos(f.h,s.h);if(sim>.9){const k=N.cls.indexOf(s.c);if(k>=0)p[k]+=(sim-.9)*8}}
  const ord=p.map((v,k)=>[v,k]).sort((a,b)=>b[0]-a[0]),z=p.reduce((s,v)=>s+v,0);
  return {ch:N.cls[ord[0][1]],p:ord[0][0]/z,alt:N.cls[ord[1][1]],pAlt:ord[1][0]/z,h:f.h};
}

// ---------- układ kresek: linie, ułamki, znaki, kropki, potęgi ----------
const hwBox=ps=>{let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;for(const p of ps)for(let i=0;i<p.length;i+=2){x1=Math.min(x1,p[i]);x2=Math.max(x2,p[i]);y1=Math.min(y1,p[i+1]);y2=Math.max(y2,p[i+1])}return {x1,y1,x2,y2,w:x2-x1,h:y2-y1,cx:(x1+x2)/2,cy:(y1+y2)/2}};
const hwMed=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1]};
// it: {k (indeks kreski), p (punkty), b (ramka)}
function hwLines(items,gf=.6){
  // wielkość pisma: wysokość kresek, a dla płaskich (−, =) ich szerokość
  const med=Math.max(12,hwMed(items.map(t=>Math.max(t.b.h,t.b.w)))),gap=Math.max(gf<.3?3:8,med*gf);
  const ord=items.slice().sort((a,b)=>a.b.y1-b.b.y1),lines=[];
  for(const t of ord){const L=lines[lines.length-1];if(L&&t.b.y1<=L.y2+gap){L.items.push(t);L.y2=Math.max(L.y2,t.b.y2)}else lines.push({items:[t],y2:t.b.y2})}
  return lines.map(L=>L.items);
}
// tekst jednej linii (albo licznika, mianownika): → {text, syms, conf} | null
// macierz: para wysokich nawiasów ([ ] albo ( )), między nimi wiersze liczb → „[1 2; 3 4]”
function hwMatrices(items,depth){
  // typowa wysokość znaku: kreski, które nie są płaskie (bez −, = i kropek)
  const hs=items.filter(t=>t.b.h>=t.b.w*.5&&t.b.h>4).map(t=>t.b.h),base=hwMed(hs);
  const tall=items.filter(t=>t.b.h>Math.max(base*1.6,24)&&t.b.w<t.b.h*.55).sort((a,b)=>a.b.x1-b.b.x1);
  const used=new Set(),tokens=[];
  for(let i=0;i+1<tall.length;i++){
    const L=tall[i],R=tall[i+1];if(used.has(L)||used.has(R))continue;
    const y1=Math.min(L.b.y1,R.b.y1),y2=Math.max(L.b.y2,R.b.y2);
    // haczyki nawiasów rysowane osobno: krótkie kreski przy końcach pionowej kreski
    const hook=(B,t)=>t!==B&&t.b.h<B.b.h*.3&&(Math.abs(t.b.cy-B.b.y1)<B.b.h*.15||Math.abs(t.b.cy-B.b.y2)<B.b.h*.15)&&t.b.x1<B.b.x2+B.b.h*.35&&t.b.x2>B.b.x1-B.b.h*.35;
    const hooks=items.filter(t=>!used.has(t)&&(hook(L,t)||hook(R,t)));
    const inside=items.filter(t=>t!==L&&t!==R&&!hooks.includes(t)&&!used.has(t)&&t.b.cx>L.b.x2&&t.b.cx<R.b.x1&&t.b.cy>y1&&t.b.cy<y2);
    if(!inside.length)continue;
    const rows=[];
    for(const row of hwLines(inside,.18)){
      const h=Math.max(8,hwMed(row.map(t=>Math.max(t.b.h,t.b.w*.6)))),ord=row.slice().sort((a,b)=>a.b.x1-b.b.x1),cells=[];let cur=[],right=-1e9;
      for(const t of ord){if(cur.length&&t.b.x1-right>h*.55){cells.push(cur);cur=[]}cur.push(t);right=Math.max(right,t.b.x2)}
      if(cur.length)cells.push(cur);
      const txt=cells.map(c=>hwParse(c,depth+1)).filter(Boolean);
      if(txt.length)rows.push(txt);
    }
    if(!rows.length)continue;
    [L,R,...hooks,...inside].forEach(t=>used.add(t));
    const text='['+rows.map(r=>r.map(c=>c.text).join(' ')).join('; ')+']';
    tokens.push({x:L.b.x1,x2:R.b.x2,text,show:text,syms:rows.flat().flatMap(c=>c.syms),items:[L,R,...hooks,...inside],conf:Math.min(...rows.flat().map(c=>c.conf))});
  }
  return {tokens,used};
}
function hwParse(items,depth=0){
  if(!items.length)return null;
  const MX=depth<2?hwMatrices(items,depth):{tokens:[],used:new Set()};
  if(MX.tokens.length)items=items.filter(t=>!MX.used.has(t));
  if(!items.length&&MX.tokens.length===1)return {text:MX.tokens[0].text,show:MX.tokens[0].show,syms:MX.tokens[0].syms,conf:MX.tokens[0].conf,tokens:MX.tokens};
  // wielkość pisma do wykrywania kropek i kresek ułamkowych (płaskie kreski liczą się szerokością)
  const medH=Math.max(10,hwMed(items.map(t=>Math.max(t.b.h,t.b.w))));
  const isDot=t=>Math.max(t.b.w,t.b.h)<Math.max(medH*.2,4);
  const isBar=t=>t.b.w>=medH*.55&&t.b.h<=Math.max(t.b.w*.3,3)&&t.b.h<=medH*.35;
  const used=new Set(),tokens=[...MX.tokens];
  // ułamki piętrowe (najszersza kreska pierwsza)
  for(const bar of items.filter(isBar).sort((a,b)=>b.b.w-a.b.w)){
    if(used.has(bar)||depth>2)continue;
    const inX=t=>t.b.cx>=bar.b.x1-bar.b.w*.15&&t.b.cx<=bar.b.x2+bar.b.w*.15;
    const up=items.filter(t=>t!==bar&&!used.has(t)&&inX(t)&&t.b.y2<=bar.b.cy+medH*.15&&t.b.cy<bar.b.cy-medH*.1);
    const dn=items.filter(t=>t!==bar&&!used.has(t)&&inX(t)&&t.b.y1>=bar.b.cy-medH*.15&&t.b.cy>bar.b.cy+medH*.1);
    const real=a=>a.filter(t=>!isDot(t)&&!(isBar(t)&&Math.abs(t.b.w-bar.b.w)<bar.b.w*.35));
    if(!real(up).length||!real(dn).length){
      // ÷: kropka nad kreską i pod nią
      if(up.length&&dn.length&&up.every(isDot)&&dn.every(isDot)){[bar,...up,...dn].forEach(t=>used.add(t));tokens.push({x:bar.b.x1,x2:bar.b.x2,text:':',show:':',items:[bar,...up,...dn],conf:1})}
      continue;
    }
    const N=hwParse(up,depth+1),D=hwParse(dn,depth+1);if(!N||!D)continue;
    [bar,...up,...dn].forEach(t=>used.add(t));
    const wrap=s=>/^[−-]?[\d.,]+$/.test(s)?s:`(${s})`;
    tokens.push({x:bar.b.x1,x2:bar.b.x2,text:`${wrap(N.text)}/${wrap(D.text)}`,show:`${wrap(N.show)}/${wrap(D.show)}`,syms:[...N.syms,...D.syms],items:[bar,...up,...dn],conf:Math.min(N.conf,D.conf)});
  }
  // znaki: kreski zachodzące na siebie w poziomie
  const rest=items.filter(t=>!used.has(t)),dots=rest.filter(isDot),strokes=rest.filter(t=>!isDot(t)).sort((a,b)=>a.b.x1-b.b.x1),groups=[];
  for(const t of strokes){
    const g=groups[groups.length-1];
    if(g){const ov=Math.min(g.x2,t.b.x2)-Math.max(g.x1,t.b.x1),mw=Math.min(g.x2-g.x1,t.b.w);
      if(ov>Math.max(mw*.35,1)||t.b.cx>=g.x1&&t.b.cx<=g.x2||(g.x1+g.x2)/2>=t.b.x1&&(g.x1+g.x2)/2<=t.b.x2){g.items.push(t);g.x1=Math.min(g.x1,t.b.x1);g.x2=Math.max(g.x2,t.b.x2);continue}}
    groups.push({items:[t],x1:t.b.x1,x2:t.b.x2});
  }
  const lineTop=Math.min(...items.map(t=>t.b.y1)),lineBot=Math.max(...items.map(t=>t.b.y2));
  // wysokość znaku z gotowych znaków (bez płaskich −, =): do potęg i podstawy linii
  const gh=groups.map(g=>hwBox(g.items.map(t=>t.p))).filter(b=>b.h>b.w*.45).map(b=>b.h);
  const symH=Math.max(10,gh.length?Math.max(...gh)*.5+hwMed(gh)*.5:medH);
  for(const g of groups){
    const key=HW_CACHE&&g.items.every(t=>t.id)?g.items.map(t=>t.id).sort().join(','):null;
    let c=key&&HW_CACHE.get(key);if(!c){c=hwClassify(g.items.map(t=>t.p));if(key)HW_CACHE.set(key,c)}
    const b=hwBox(g.items.map(t=>t.p));
    tokens.push({x:g.x1,x2:g.x2,ch:c.ch,cls:c,b,items:g.items,conf:c.p});
  }
  // kropki: dwie jedna nad drugą to „:”, przy dole linii przecinek, w środku mnożenie
  const dsort=dots.slice().sort((a,b)=>a.b.cx-b.b.cx);
  for(let i=0;i<dsort.length;i++){
    const d=dsort[i],e=dsort[i+1];
    if(e&&Math.abs(e.b.cx-d.b.cx)<medH*.35&&Math.abs(e.b.cy-d.b.cy)>medH*.25){tokens.push({x:Math.min(d.b.x1,e.b.x1),x2:Math.max(d.b.x2,e.b.x2),ch:':',items:[d,e],conf:1,dot:true});i++;continue}
    tokens.push({x:d.b.x1,x2:d.b.x2,ch:'dot',b:d.b,items:[d],conf:1,dot:true});
  }
  tokens.sort((a,b)=>a.x-b.x);
  // podstawa linii: dolna krawędź zwykłych cyfr
  const digs=tokens.filter(t=>t.ch&&/\d/.test(t.ch)&&t.b&&t.b.h>symH*.7),base=digs.length?hwMed(digs.map(t=>t.b.y2)):lineBot,mid=digs.length?hwMed(digs.map(t=>t.b.cy)):(lineTop+lineBot)/2;
  const out=[];let conf=1;const syms=[];
  for(let i=0;i<tokens.length;i++){
    const t=tokens[i],prev=out[out.length-1],next=tokens[i+1];
    if(t.text!==undefined){out.push({text:t.text,show:t.show,num:true});conf=Math.min(conf,t.conf);syms.push(...(t.syms||[]));continue}
    let ch=t.ch;
    // litera A, B, C zostaje literą tylko jako zmienna przypisana na tej stronie (B = ...); inaczej to cyfra (8, 4, 0)
    if(/[ABC]/.test(ch)&&HW_DEF&&!HW_DEF.has(ch))ch=t.cls&&/\d/.test(t.cls.alt)?t.cls.alt:{A:'4',B:'8',C:'0'}[ch];
    if(ch==='dot'){
      const between=prev&&prev.num&&next&&next.ch&&/\d/.test(next.ch);
      ch=between&&t.b.cy>mid+symH*.25?'.':'·';
      if(!prev)continue;
    }
    // „/” i „1” wyglądają podobnie: dzielenie musi stać między liczbami
    if(t.cls&&(ch==='/'||ch==='1')&&t.cls.alt===(ch==='/'?'1':'/')&&t.cls.pAlt>.05){
      const canDiv=prev&&(prev.num||prev.text===')')&&next&&(next.text!==undefined||next.ch&&/[\d(]/.test(next.ch));
      if(ch==='/'&&!canDiv)ch='1';
    }
    // potęga: wyraźnie mniejszy znak, podniesiony nad podstawę
    const sup=t.b&&prev&&(prev.num||prev.text===')'||prev.sup)&&t.b.h<symH*.72&&t.b.cy<mid-symH*.3&&t.b.y2<base-symH*.3&&/[\d(−-]/.test(ch);
    const show=ch==='*'?'·':ch==='-'?'−':ch;
    const text=ch==='*'?'·':ch==='-'?'−':ch;
    if(sup){const last=out[out.length-1];if(last&&last.sup)last.supText+=text;else out.push({sup:true,supText:text})}
    else out.push({text,show,num:/[\d.A-C]/.test(ch)});
    conf=Math.min(conf,t.conf);
    if(t.cls)syms.push({ch,h:t.cls.h,items:t.items});
  }
  // potęgi w tekście: 2^3, 10^(−3)
  const parts=out.map(o=>o.sup?(o.supText.length>1?`^(${o.supText})`:`^${o.supText}`):o.text);
  const shows=out.map(o=>o.sup?`^${o.supText}`:o.show);
  const text=parts.join('');
  return text?{text,show:shows.join(''),syms,conf,tokens}:null;
}
// cała strona: linie pisma, a w linii osobne działania, gdy dzieli je duża przerwa
// defined: litery przypisane poza pismem (np. w tekście z klawiatury)
function hwRead(strokes,cache,defined){
  HW_CACHE=cache||new Map();
  // pierwsze czytanie znajduje przypisania „A = …”, drugie czyta resztę liter jako cyfry
  HW_DEF=null;
  const first=hwRead1(strokes),def=new Set(defined||[]);
  first.forEach(r=>{const m=r.text.match(/^([ABC])=/);if(m)def.add(m[1])});
  HW_DEF=def;
  const res=hwRead1(strokes);HW_DEF=null;return res;
}
function hwRead1(strokes){
  const items=strokes.map((s,k)=>({k,id:s.id,p:s.p,b:hwBox([s.p])})).filter(t=>t.p.length>=2);
  if(!items.length)return [];
  const res=[];
  for(const line of hwLines(items)){
    const medH=Math.max(12,hwMed(line.map(t=>t.b.h)));
    const ord=line.slice().sort((a,b)=>a.b.x1-b.b.x1),chunks=[];let cur=[],right=-1e9;
    for(const t of ord){if(cur.length&&t.b.x1-right>medH*2.6){chunks.push(cur);cur=[]}cur.push(t);right=Math.max(right,t.b.x2)}
    if(cur.length)chunks.push(cur);
    for(const ch of chunks){
      // bardzo duże kreski (rysunki, obwódki) nie są pismem
      if(ch.length===1&&ch[0].b.h>medH*3)continue;
      const r=hwParse(ch);if(!r)continue;
      const b=hwBox(ch.map(t=>t.p));
      res.push({...r,box:[b.x1,b.y1,b.x2,b.y2],ks:ch.map(t=>t.k)});
    }
  }
  return res;
}
