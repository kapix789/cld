const LANG={cur:'pl'};
const $t=(pl,en)=>LANG.cur==='en'?en:pl;
const OPT={noFrac:true,g:9.81};

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
const inpT=s=>String(s??'').trim()?escH(String(s).trim()):'…';
