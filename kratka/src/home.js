// =====================================================================
//  Strona startowa (#start, logo Kratka): notatnik z wyszukiwarką stron zeszytu i własnymi PDF-ami
// =====================================================================
//  Strony zeszytu czytamy z tego samego zapisu co notebook.js (kratka-zeszyt w localStorage).
//  PDF-y trzymamy w przeglądarce w IndexedDB (baza kratka-pdf), bo localStorage jest na nie za mały.
// =====================================================================
const PDFDB={p:null};
function pdfDb(){
  return PDFDB.p||(PDFDB.p=new Promise((ok,no)=>{
    if(!window.indexedDB)return no(new Error('idb'));
    const r=indexedDB.open('kratka-pdf',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('f',{keyPath:'id'});
    r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
  }));
}
const pdfReq=(mode,f)=>pdfDb().then(db=>new Promise((ok,no)=>{const q=f(db.transaction('f',mode).objectStore('f'));q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}));
const pdfAll=()=>pdfReq('readonly',s=>s.getAll());
const pdfPut=rec=>pdfReq('readwrite',s=>s.put(rec));
const pdfDel=id=>pdfReq('readwrite',s=>s.delete(id));
const HOME={pdfs:[]};
const homeSize=b=>b>1048576?(b/1048576).toFixed(1).replace('.',LANG.cur==='en'?'.':',')+' MB':Math.max(1,Math.round(b/1024))+' KB';
const homeMark=(s,q)=>{const h=escH(s);if(!q)return h;const i=s.toLowerCase().indexOf(q);return i<0?h:escH(s.slice(0,i))+'<mark>'+escH(s.slice(i,i+q.length))+'</mark>'+escH(s.slice(i+q.length))};
function homeRender(){
  $('#homeQ').placeholder=$t('Szukaj w zeszycie i PDF-ach…','Search the notebook and PDFs…');
  const q=$('#homeQ').value.trim().toLowerCase(),d=NB.d||nbLoad();
  const pages=d.pages.map((p,k)=>{
    const name=p.name||$t(`Strona ${k+1}`,`Page ${k+1}`),lines=p.text.split('\n').map(l=>l.trim()).filter(Boolean);
    const hitLine=q?lines.find(l=>l.toLowerCase().includes(q)):lines.find(l=>!/^(#|\/\/)/.test(l))||lines[0];
    return {k,name,line:hitLine||'',strokes:p.strokes.length,hit:!q||name.toLowerCase().includes(q)||!!(q&&hitLine)};
  }).filter(p=>p.hit);
  $('#homePages').innerHTML=pages.length?pages.map(p=>`<a href="#zeszyt" class="home-pg" data-page="${p.k}"><span class="home-pn">${p.k+1}</span><span class="home-pt"><b>${homeMark(p.name,q)}</b><small>${homeMark(p.line,q)||$t('pusta strona','empty page')}${p.strokes?' · '+$t('pismo','handwriting'):''}</small></span></a>`).join('')
    :`<p class="note">${q?$t('Nic nie znaleziono w zeszycie.','Nothing found in the notebook.'):$t('Zeszyt jest jeszcze pusty.','The notebook is still empty.')}</p>`;
  const f=HOME.pdfs.filter(x=>!q||x.name.toLowerCase().includes(q));
  $('#homePdfs').innerHTML=f.length?f.map(x=>`<div class="home-pdf"><button type="button" class="home-po" data-open="${x.id}"><b>${homeMark(x.name,q)}</b><small>${homeSize(x.size)} · ${new Date(x.t).toLocaleDateString(LANG.cur==='en'?'en-GB':'pl-PL')}</small></button><button type="button" class="btn link small" data-del="${x.id}">${$t('Usuń','Delete')}</button></div>`).join('')
    :`<p class="note">${q&&HOME.pdfs.length?$t('Żaden PDF nie pasuje.','No PDF matches.'):$t('Nie ma jeszcze żadnych PDF-ów. Dodane pliki zostają w tej przeglądarce.','No PDFs yet. Added files stay in this browser.')}</p>`;
}
function homeLoad(){pdfAll().then(a=>{HOME.pdfs=a.map(x=>({id:x.id,name:x.name,size:x.size,t:x.t})).sort((a,b)=>b.t-a.t);homeRender()}).catch(()=>{HOME.pdfs=[];homeRender();$('#homeAdd').disabled=true})}
$('#homeQ').addEventListener('input',homeRender);
$('#homePages').addEventListener('click',e=>{const a=e.target.closest('[data-page]');if(a)NB.goto=+a.dataset.page});
$('#homeFile').addEventListener('change',async e=>{
  const files=[...e.target.files].filter(f=>/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name));e.target.value='';
  try{for(const f of files)await pdfPut({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:f.name,size:f.size,t:Date.now(),blob:f})}
  catch(err){show($('#homeMsg'),'bad',$t('Nie udało się zapisać pliku w przeglądarce (za mało miejsca albo okno prywatne).','The file could not be saved in this browser (no space or a private window).'))}
  homeLoad();
});
$('#homeAdd').onclick=()=>$('#homeFile').click();
$('#homePdfs').addEventListener('click',async e=>{
  const o=e.target.closest('[data-open]'),d=e.target.closest('[data-del]');
  if(o){const r=await pdfReq('readonly',s=>s.get(o.dataset.open));if(!r)return;const u=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
  if(d){const x=HOME.pdfs.find(p=>p.id===d.dataset.del);if(x&&confirm($t(`Usunąć „${x.name}”?`,`Delete “${x.name}”?`))){await pdfDel(x.id);homeLoad()}}
});
HOOKS.view.push((S,view)=>{
  if(view==='start')homeLoad();
  if(view==='zeszyt'&&NB.goto!=null&&NB.d){const k=NB.goto;NB.goto=null;if(k<NB.d.pages.length)nbGo(k)}
});
HOOKS.lang.push(()=>{if(R.view==='start')homeRender()});
