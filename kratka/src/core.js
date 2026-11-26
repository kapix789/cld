// =====================================================================
//  Kratka: rdzeń wspólny dla wszystkich przedmiotów
// =====================================================================
//  Kolejność plików (build.py): core.js → engine.js → <przedmiot>/topics.js … → app.js → <przedmiot>/tools.js
//
//  Przedmiot dopisuje się do SUBJECTS funkcją addSubject (patrz algebra/topics.js i fizyka/topics.js).
//  Rodzaj odpowiedzi (siatka na macierz, liczba z jednostką, wybór typu układu…) dopisuje się do KINDS.
// =====================================================================

// ---------- Język ----------
// $t('tekst po polsku','English text') zwraca tekst w bieżącym języku (LANG.cur: 'pl' albo 'en').
const LANG={cur:'pl'};
const $t=(pl,en)=>LANG.cur==='en'?en:pl;
// OPT.noFrac: kroki eliminacji liczone bez ułamków (jak na kartce); false = klasycznie, z dzieleniem przez element główny.
// OPT.g: przyspieszenie ziemskie w zadaniach z fizyki (9.81 albo 10).
const OPT={noFrac:true,g:9.81};

// ---------- Przedmioty ----------
//  addSubject({
//    id:'fizyka',                       krótki identyfikator, stały (adres strony: #fizyka-cwiczenia)
//    name:'Fizyka', en:'Physics',       nazwa w obu językach
//    topics:[{id,sec,name,en,gen}],     tematy (opis pól w algebra/topics.js)
//    secEn:{'Kinematyka':'Kinematics'}, angielskie nazwy działów (klucz to polska nazwa)
//    tools:[{id,name,en}],              dodatkowe widoki przedmiotu, np. kalkulatory (opcjonalnie)
//    sheet:{name:'Wzory',en:'Formulas'},nazwa ściągi; jej treść to <section data-view="sciaga" data-subj="…">
//    prKey:'kratka-fizyka-postep-v1',   klucz zapisu postępu w przeglądarce
//    start:'kin-rzutpoz',               temat otwierany na start (opcjonalnie)
//    opts:()=>'<html>',                 ustawienia nad zadaniem w Ćwiczeniach (opcjonalnie)
//  })
const SUBJECTS=[];
const SEC_EN={};
function addSubject(s){
  if(SUBJECTS.some(x=>x.id===s.id))throw new Error('Przedmiot '+s.id+' jest już dopisany');
  s.tools=s.tools||[];
  s.sections=[...new Set(s.topics.map(t=>t.sec))];
  s.topics.forEach(t=>{t.subj=s.id});
  Object.assign(SEC_EN,s.secEn||{});
  SUBJECTS.push(s);
  return s;
}
const subjById=id=>SUBJECTS.find(s=>s.id===id);
const topicById=id=>{for(const s of SUBJECTS){const t=s.topics.find(x=>x.id===id);if(t)return t}return null};
const secName=s=>$t(s,SEC_EN[s]||s);
const tName=t=>$t(t.name,t.en||t.name);
const sName=s=>$t(s.name,s.en||s.name);

// ---------- Rodzaje odpowiedzi ----------
//  KINDS.nazwa = {
//    html(ans,id)      pola do wpisania odpowiedzi; każde pole ma id = `${id}-${sufiks}`
//    check(ans,inp)    → {score: 0…1, empty, marks:{sufiks: true/false}, msg}
//    show(ans)         poprawna odpowiedź (HTML)
//    inp(ans,inp)      odpowiedź ucznia (HTML), do przeglądu po sprawdzianie
//    fields(ans)       sufiksy pól (wystarczy, gdy odpowiedź to zwykłe pola tekstowe)
//    read(id,ans), fill(id,ans,inp)   tylko gdy pola nie są zwykłymi polami tekstowymi
//  }
const KINDS={};
const kindOf=a=>{const k=KINDS[a.kind];if(!k)throw new Error('Nieznany rodzaj odpowiedzi: '+a.kind);return k};
const ansHtml=(a,id)=>kindOf(a).html(a,id);
const ansCheck=(a,inp)=>kindOf(a).check(a,inp);
const ansShow=a=>kindOf(a).show(a);
const inpShow=(a,inp)=>kindOf(a).inp(a,inp);
const fieldVal=(id,s)=>{const el=typeof document!=='undefined'&&document.getElementById(id+'-'+s);return el?el.value:''};
function ansRead(id,a){const k=kindOf(a);return k.read?k.read(id,a):k.fields(a).map(s=>fieldVal(id,s))}
function ansFill(id,a,inp){
  if(!inp)return;const k=kindOf(a);
  if(k.fill)return k.fill(id,a,inp);
  k.fields(a).forEach((s,q)=>{const el=document.getElementById(id+'-'+s);if(el)el.value=inp[q]??''});
}
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// odpowiedź ucznia do wyświetlenia (pusta → wielokropek)
const inpT=s=>String(s??'').trim()?escH(String(s).trim()):'…';
