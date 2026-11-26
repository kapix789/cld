// =====================================================================
//  SYSTEMY OPERACYJNE: rodzaje odpowiedzi, zadania i wpis do rejestru przedmiotów
// =====================================================================
//  Zadania z poleceniami (kind:'cmd') sprawdza symulator z linux.js: polecenia ucznia
//  wykonują się na świeżym systemie, a potem sprawdzany jest stan (użytkownicy, grupy,
//  prawa, ACL, zapora) albo wynik ostatniego polecenia (grep). Przechodzi każde
//  poprawne rozwiązanie, nie tylko wzorcowe.
//  Pytania testowe: kind:'choice' (jedna albo kilka odpowiedzi), uzupełnianie: kind:'fill'.
// =====================================================================

const mix=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const pickN=(a,n)=>mix(a.slice()).slice(0,n);
const C=s=>`<code>${escH(s)}</code>`;
const T2=x=>Array.isArray(x)?$t(x[0],x[1]):x;
const chk=(ok,pl,en)=>({ok:!!ok,pl,en});
const SO_U=['anna','bartek','ewa','tomek','ola','marek','zofia','kuba','egzamin','kolos'];
const SO_G=['studenci','projekt','dev','admini','zespol','grupa1','kolo'];
const SO_D=['zaliczam','raporty','dane','projekty_shared','wspolny','archiwum','config','public','dokumenty'];
const SO_F=['serwer.cfg','notatki.txt','raport.txt','plan.txt','baza.db','klucz.txt'];

// ---------- terminal jako HTML ----------
function termHtml(tr,max=0){
  const L=[];
  for(const x of tr){
    if(x.t==='cmd')L.push(`<span class="p">${escH(x.prompt)}</span> ${escH(x.s)}`);
    else if(x.t==='out'){if(x.s!=='\f')L.push(escH(x.s))}
    else if(x.t==='err')L.push(`<span class="err">${escH(x.s)}</span>`);
    else if(x.t==='note')L.push(`<span class="dim"># ${escH(x.s)}</span>`);
  }
  if(max&&L.length>max){const n=L.length-max;L.splice(max,n,`<span class="dim">… (${$t(`jeszcze ${n} ${pl(n,'linia','linie','linii')}`,`${n} more ${n===1?'line':'lines'}`)})</span>`)}
  return `<pre class="term">${L.join('\n')||'<span class="dim">…</span>'}</pre>`;
}
const runView=(S,cmds,max)=>termHtml(simScript(S,cmds.join('\n')),max);

// ---------- rodzaje odpowiedzi ----------
KINDS.cmd={
  note:()=>$t('Każde polecenie w osobnej linii. Polecenia wykonują się na symulowanym Ubuntu jako użytkownik <code>student</code>, który może używać <code>sudo</code>.','One command per line. The commands run on a simulated Ubuntu as the user <code>student</code>, who may use <code>sudo</code>.'),
  fields:()=>['c'],
  html:(a,id)=>`<label class="lbl-top" for="${id}-c">${$t('Polecenia','Commands')}</label><textarea id="${id}-c" class="code cmd-in" rows="${a.rows||3}" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="${escH(a.ph||'')}"></textarea>`,
  check(a,inp){
    const text=String(inp[0]??'');
    if(!text.trim())return {score:0,empty:true,marks:{c:false},msg:$t('Najpierw wpisz polecenia.','Type the commands first.')};
    const S=a.setup(),tr=simScript(S,text),res=a.verify(S,tr),ok=res.filter(x=>x.ok).length,score=ok/res.length;
    S.rootShell=false;S.cwd='/home/student';
    const insp=a.inspect&&a.inspect.length?[{t:'note',s:$t('sprawdzenie','check')},...simScript(S,a.inspect.join('\n'))]:[];
    const hints=[...new Map(S.hints.map(h=>[h.pl,h])).values()].map(h=>$t(h.pl,h.en));
    const bad=res.filter(x=>!x.ok).map(x=>$t(x.pl,x.en));
    return {score,empty:false,marks:{c:score===1},msg:[...bad,...hints].join(' '),html:termHtml(tr.concat(insp),60)};
  },
  show:a=>termHtml(a.model.map(s=>({t:'cmd',s,prompt:'$'}))),
  inp:(a,inp)=>`<pre class="term">${escH(String(inp[0]||'').trim())||'…'}</pre>`
};
KINDS.choice={
  html(a,id){const t=a.multi?'checkbox':'radio';return (a.multi?`<p class="ans-lead">${$t('Zaznacz wszystkie poprawne odpowiedzi.','Select all correct answers.')}</p>`:'')+`<div class="choices" role="${a.multi?'group':'radiogroup'}">`+a.opts.map((o,k)=>`<label class="choice" id="${id}-o${k}" for="${id}-i${k}"><input type="${t}" id="${id}-i${k}" name="${id}-ch"> <span>${o}</span></label>`).join('')+'</div>'},
  read:(id,a)=>a.opts.map((_,k)=>{const el=document.getElementById(id+'-i'+k);return !!(el&&el.checked)}),
  fill(id,a,inp){inp.forEach((v,k)=>{const el=document.getElementById(id+'-i'+k);if(el)el.checked=!!v})},
  check(a,inp){
    const sel=inp.map((v,k)=>v?k:-1).filter(k=>k>=0);
    if(!sel.length)return {score:0,empty:true,marks:{},msg:$t('Najpierw wybierz odpowiedź.','Choose an answer first.')};
    const ok=new Set(a.ok),marks={};sel.forEach(k=>{marks['o'+k]=ok.has(k)});
    const good=sel.filter(k=>ok.has(k)).length,bad=sel.length-good;
    const score=a.multi?Math.max(0,(good-bad)/ok.size):(bad?0:1);
    let msg='';
    if(score===1)msg=a.expl||'';
    else if(a.multi&&!bad)msg=$t(`Zaznaczone są dobre, ale nie wszystkie (brakuje ${ok.size-good}).`,`The selected ones are right, but some are missing (${ok.size-good}).`);
    else if(a.multi)msg=$t(`Błędnie zaznaczone: ${bad}.`,`Wrongly selected: ${bad}.`);
    return {score,empty:false,marks,msg};
  },
  show:a=>a.ok.map(k=>a.opts[k]).join('<br>'),
  inp:(a,inp)=>inp.map((v,k)=>v?a.opts[k]:null).filter(Boolean).join('<br>')||'…'
};
const normFill=(s,b)=>{let v=String(s??'').trim().replace(/\s+/g,' ').replace(/^(['"])(.*)\1$/,'$2');return b.ci?v.toLowerCase():v};
KINDS.fill={
  note:()=>$t('Uzupełnij puste pola. Wielkość liter ma znaczenie, jak w terminalu.','Fill in the blanks. Letter case matters, as in the terminal.'),
  fields:a=>a.tpl.filter(x=>typeof x!=='string').map((_,k)=>'b'+k),
  html(a,id){let k=0;return `<div class="fill">${a.tpl.map(x=>typeof x==='string'?escH(x):`<input id="${id}-b${k}" autocomplete="off" autocapitalize="off" spellcheck="false" size="${x.w||8}" aria-label="${$t('luka','blank')} ${++k}">`).join('')}</div>`},
  check(a,inp){
    const bl=a.tpl.filter(x=>typeof x!=='string'),marks={};let good=0,empty=0;
    bl.forEach((b,k)=>{const v=normFill(inp[k],b);if(!v)empty++;const ok=!!v&&b.acc.some(x=>normFill(x,b)===v);marks['b'+k]=ok;if(ok)good++});
    if(empty===bl.length)return {score:0,empty:true,marks:{},msg:''};
    return {score:good/bl.length,empty:false,marks,msg:good===bl.length?(a.expl||''):$t(`Poprawnie uzupełnione: ${good} z ${bl.length}.`,`Correctly filled: ${good} of ${bl.length}.`)};
  },
  show:a=>`<div class="fill">${a.tpl.map(x=>typeof x==='string'?escH(x):`<b>${escH(x.acc[0])}</b>`).join('')}</div>`,
  inp:(a,inp)=>{let k=0;return `<div class="fill">${a.tpl.map(x=>typeof x==='string'?escH(x):`<u>${inpT(inp[k++])}</u>`).join('')}</div>`}
};

// ---------- budowanie zadań ----------
// zadanie z poleceniami: model (wzorcowe polecenia), why (wyjaśnienie każdego), inspect (jak sprawdzić), look (na co patrzeć)
function cmdTask(o){
  const sec=$t('Rozwiązanie w terminalu','Solution in the terminal');
  const ans={kind:'cmd',setup:o.setup,verify:o.verify,model:o.model,inspect:o.inspect,ph:o.ph||o.model[0].replace(/ .*/,' …'),rows:Math.max(3,o.model.length+1)};
  const start=o.start?`<p class="note">${$t('Stan początkowy:','Starting state:')}</p>`+runView(o.setup(),o.start,14):'';
  const sol=()=>{
    const S=o.setup();let h='<ol>';
    o.model.forEach((m,k)=>{const tr=simScript(S,m);h+=`<li>${o.why[k]}${termHtml(tr,14)}</li>`});
    h+='</ol>';
    if(o.inspect){S.rootShell=false;S.cwd='/home/student';h+=`<p><b>${$t('Jak sprawdzić.','How to check.')}</b> ${o.look||''}</p>`+termHtml(simScript(S,o.inspect.join('\n')),24)}
    return h;
  };
  const fr=()=>{
    const S=o.setup(),acc=[],F=[];
    o.model.forEach((m,k)=>{
      const tr=simScript(S,m);acc.push(...tr);
      F.push({sec,t:`${$t('Krok','Step')} ${k+1}: <code>${escH(m)}</code>`,x:o.why[k],S:termHtml(acc,22)});
    });
    if(o.inspect){S.rootShell=false;S.cwd='/home/student';const tr=simScript(S,o.inspect.join('\n'));F.push({sec,t:$t('Sprawdzenie','Checking'),x:o.look||'',S:termHtml(tr,22)})}
    return F;
  };
  return {q:o.q,body:(o.body||'')+start,ans,get sol(){return sol()},fr,hint:o.hint};
}
// pytanie testowe: q, body, opts [[pl,en] albo HTML], ok (indeksy poprawnych), expl
function quizTask(o){
  const idx=mix(o.opts.map((_,k)=>k)),opts=idx.map(k=>T2(o.opts[k])),ok=idx.map((k,i)=>o.ok.includes(k)?i:-1).filter(i=>i>=0);
  const expl=o.expl?T2(o.expl):'';
  return {q:T2(o.q),body:o.body?T2(o.body):'',ans:{kind:'choice',opts,ok,multi:o.ok.length>1||!!o.multi,expl},
    sol:`<p>${ok.length>1?$t('Poprawne odpowiedzi:','Correct answers:'):$t('Poprawna odpowiedź:','Correct answer:')}</p><ul class="rules">${ok.map(k=>`<li>${opts[k]}</li>`).join('')}</ul>${expl?`<p>${expl}</p>`:''}`,
    hint:o.hint?T2(o.hint):''};
}
// uzupełnianie: tpl ['tekst', {acc:['odp',…], w}, 'tekst', …]
function fillTask(o){
  const expl=o.expl?T2(o.expl):'',ans={kind:'fill',tpl:o.tpl,expl};
  return {q:T2(o.q),body:o.body?T2(o.body):'',ans,sol:KINDS.fill.show(ans)+(expl?`<p>${expl}</p>`:''),hint:o.hint?T2(o.hint):''};
}

// ---------- system startowy ----------
// katalog domowy studenta: miasta.txt, config/, public/, projekty_shared/, serwer.cfg; użytkownik adam
function soBase(o={}){
  return simNew({users:['adam',...(o.users||[])],groups:o.groups||[],dirs:[{name:'config',mode:0o755},{name:'public',mode:0o755},{name:'projekty_shared',mode:0o775},...(o.dirs||[])],files:[{name:'serwer.cfg',mode:0o644,text:'port=8080\n'},...(o.files||[])]});
}

// ---------- 1. użytkownicy i grupy ----------
function soUsers(){
  const v=rnd(0,2);
  if(v===0){
    const U=pick(SO_U),G=pick(SO_G);
    return cmdTask({
      q:$t(`Utwórz użytkownika ${C(U)} i grupę ${C(G)}, a następnie dodaj użytkownika ${C(U)} do tej grupy.`,`Create the user ${C(U)} and the group ${C(G)}, then add ${C(U)} to that group.`),
      setup:()=>soBase(),ph:'sudo useradd …',
      model:[`sudo useradd -m ${U}`,`sudo groupadd ${G}`,`sudo usermod -aG ${G} ${U}`],
      why:[$t(`Tworzymy użytkownika; <code>-m</code> zakłada też katalog domowy <code>/home/${U}</code>. Bez <code>sudo</code> polecenie się nie powiedzie.`,`Create the user; <code>-m</code> also creates the home directory <code>/home/${U}</code>. Without <code>sudo</code> the command fails.`),
        $t('Tworzymy grupę.','Create the group.'),
        $t(`Dopisujemy użytkownika do grupy dodatkowej. <code>-a</code> (append) sprawia, że dotychczasowe grupy zostają.`,`Add the user to a supplementary group. <code>-a</code> (append) keeps the groups the user already had.`)],
      inspect:[`id ${U}`,`getent group ${G}`],
      look:$t(`W wyniku <code>id</code> grupa <code>${G}</code> powinna być na liście <code>groups=</code>, a w <code>getent group</code> po ostatnim dwukropku powinno stać <code>${U}</code>.`,`In the <code>id</code> output, <code>${G}</code> should be in the <code>groups=</code> list, and in <code>getent group</code> the last field should contain <code>${U}</code>.`),
      verify:S=>[chk(S.users[U],`Nie ma użytkownika ${U}.`,`There is no user ${U}.`),chk(S.groups[G],`Nie ma grupy ${G}.`,`There is no group ${G}.`),chk(S.users[U]&&S.groups[G]&&inGroup(S,U,G),`Użytkownik ${U} nie należy do grupy ${G}.`,`The user ${U} is not in the group ${G}.`)],
      hint:$t('Kolejno: useradd, groupadd, usermod -aG grupa użytkownik (wszystko z sudo).','In order: useradd, groupadd, usermod -aG group user (all with sudo).')
    });
  }
  if(v===1){
    const U=pick(SO_U),[P,G1,G2]=pickN(SO_G,3);
    return cmdTask({
      q:$t(`Użytkownik ${C(U)} należy już do grupy ${C(P)}. Dodaj go także do grup ${C(G1)} i ${C(G2)} (obie istnieją) tak, żeby nie wypadł z grupy ${C(P)}.`,`The user ${C(U)} is already in the group ${C(P)}. Also add them to the groups ${C(G1)} and ${C(G2)} (both exist) so that they stay in ${C(P)}.`),
      setup:()=>soBase({users:[{name:U,groups:[P]}],groups:[G1,G2]}),start:[`id ${U}`],ph:'sudo usermod …',
      model:[`sudo usermod -aG ${G1},${G2} ${U}`],
      why:[$t(`Jedno polecenie wystarczy: grupy podajemy po przecinku, bez spacji. Bez <code>-a</code> opcja <code>-G</code> <b>zastąpiłaby</b> listę grup i ${U} wypadłby z grupy ${P}.`,`One command is enough: groups are separated by commas without spaces. Without <code>-a</code>, <code>-G</code> would <b>replace</b> the group list and ${U} would leave ${P}.`)],
      inspect:[`id ${U}`],
      look:$t(`Na liście <code>groups=</code> muszą być wszystkie trzy grupy: ${P}, ${G1} i ${G2}.`,`The <code>groups=</code> list must contain all three groups: ${P}, ${G1} and ${G2}.`),
      verify:S=>[chk(inGroup(S,U,G1),`${U} nie należy do grupy ${G1}.`,`${U} is not in ${G1}.`),chk(inGroup(S,U,G2),`${U} nie należy do grupy ${G2}.`,`${U} is not in ${G2}.`),chk(inGroup(S,U,P),`${U} wypadł z grupy ${P}. Samo -G zastępuje listę grup; potrzebne jest -aG.`,`${U} has left ${P}. On its own -G replaces the group list; use -aG.`)],
      hint:$t('usermod -aG grupa1,grupa2 użytkownik','usermod -aG group1,group2 user')
    });
  }
  const [U1,U2]=pickN(SO_U,2),G=pick(SO_G);
  return cmdTask({
    q:$t(`Utwórz grupę ${C(G)} i dodaj do niej istniejących użytkowników ${C(U1)} oraz ${C(U2)}.`,`Create the group ${C(G)} and add the existing users ${C(U1)} and ${C(U2)} to it.`),
    setup:()=>soBase({users:[U1,U2]}),ph:'sudo groupadd …',
    model:[`sudo groupadd ${G}`,`sudo usermod -aG ${G} ${U1}`,`sudo gpasswd -a ${U2} ${G}`],
    why:[$t('Tworzymy grupę.','Create the group.'),$t(`Dodajemy pierwszego użytkownika przez <code>usermod -aG</code>.`,`Add the first user with <code>usermod -aG</code>.`),$t(`Drugiego dla odmiany przez <code>gpasswd -a</code>; działa tak samo (równie dobre jest <code>adduser ${U2} ${G}</code>).`,`Add the second one with <code>gpasswd -a</code> for a change; it works the same (<code>adduser ${U2} ${G}</code> is also fine).`)],
    inspect:[`getent group ${G}`],
    look:$t(`Po ostatnim dwukropku powinni być obaj użytkownicy, oddzieleni przecinkiem.`,`The last field should list both users separated by a comma.`),
    verify:S=>[chk(S.groups[G],`Nie ma grupy ${G}.`,`There is no group ${G}.`),chk(S.groups[G]&&inGroup(S,U1,G),`${U1} nie należy do grupy ${G}.`,`${U1} is not in ${G}.`),chk(S.groups[G]&&inGroup(S,U2,G),`${U2} nie należy do grupy ${G}.`,`${U2} is not in ${G}.`)],
    hint:$t('groupadd, potem dla każdego użytkownika usermod -aG (albo gpasswd -a).','groupadd, then usermod -aG (or gpasswd -a) for each user.')
  });
}
const SO_USERS_Q=[
  ()=>quizTask({q:['Którymi poleceniami dodasz istniejącego użytkownika <code>anna</code> do grupy <code>studenci</code>, nie usuwając jej z innych grup?','Which commands add the existing user <code>anna</code> to the group <code>studenci</code> without removing her from other groups?'],
    opts:[C('sudo usermod -aG studenci anna'),C('sudo gpasswd -a anna studenci'),C('sudo adduser anna studenci'),C('sudo usermod -G studenci anna'),C('sudo groupadd studenci anna')],ok:[0,1,2],
    expl:['<code>usermod -G</code> bez <code>-a</code> zastępuje całą listę grup dodatkowych, a <code>groupadd</code> tworzy grupę.','<code>usermod -G</code> without <code>-a</code> replaces the whole list of supplementary groups, and <code>groupadd</code> creates a group.']}),
  ()=>quizTask({q:['Jak sprawdzić, do jakich grup należy użytkownik <code>anna</code>?','How do you check which groups the user <code>anna</code> belongs to?'],opts:[C('id anna'),C('groups anna'),C('whoami anna'),C('ls -l anna')],ok:[0,1],expl:['<code>id</code> pokazuje też numery (uid, gid), <code>groups</code> same nazwy.','<code>id</code> also shows the numbers (uid, gid), <code>groups</code> only the names.']}),
  ()=>quizTask({q:['W którym pliku zapisane są grupy i ich członkowie?','Which file stores the groups and their members?'],opts:[C('/etc/group'),C('/etc/passwd'),C('/etc/shadow'),C('/etc/groups.conf')],ok:[0],expl:['Każda linia to <code>nazwa:x:GID:członek1,członek2</code>. W <code>/etc/passwd</code> są konta, a w <code>/etc/shadow</code> skróty haseł.','Each line is <code>name:x:GID:member1,member2</code>. <code>/etc/passwd</code> holds the accounts and <code>/etc/shadow</code> the password hashes.']}),
  ()=>quizTask({q:['Co robi <code>sudo useradd -m ola</code>?','What does <code>sudo useradd -m ola</code> do?'],opts:[['Tworzy użytkownika ola razem z katalogiem domowym /home/ola','Creates the user ola together with the home directory /home/ola'],['Tworzy tylko katalog /home/ola','Creates only the directory /home/ola'],['Dodaje użytkownika ola do grupy m','Adds the user ola to the group m'],['Zmienia hasło użytkownika ola','Changes the password of the user ola']],ok:[0],expl:['Bez <code>-m</code> konto powstaje bez katalogu domowego. Hasło ustawia się osobno: <code>sudo passwd ola</code>.','Without <code>-m</code> the account is created without a home directory. The password is set separately: <code>sudo passwd ola</code>.']}),
  ()=>quizTask({q:['Użytkownik należał do grup <code>dev</code> i <code>projekt</code>. Po <code>sudo usermod -G studenci anna</code> należy do:','The user was in the groups <code>dev</code> and <code>projekt</code>. After <code>sudo usermod -G studenci anna</code> they belong to:'],opts:[['tylko studenci (oraz swojej grupy głównej)','only studenci (and their primary group)'],['dev, projekt i studenci','dev, projekt and studenci'],['dev i projekt','dev and projekt'],['żadnej grupy','no group']],ok:[0],expl:['<code>-G</code> ustawia listę grup dodatkowych od nowa. Żeby dopisać grupę, potrzebne jest <code>-aG</code>.','<code>-G</code> sets the supplementary group list from scratch. To add a group, use <code>-aG</code>.']}),
  ()=>{const U=pick(SO_U),G=pick(SO_G);return fillTask({q:['Dokończ polecenia: utwórz grupę, dodaj do niej użytkownika i sprawdź wynik.','Complete the commands: create a group, add a user to it and check the result.'],
    tpl:['sudo ',{acc:['groupadd','addgroup'],w:9},` ${G}\nsudo usermod `,{acc:['-aG','-a -G','-Ga'],w:5},` ${G} ${U}\n`,{acc:['id','groups'],w:6},` ${U}`],
    expl:['Zamiast <code>usermod -aG</code> można też użyć <code>gpasswd -a</code> albo <code>adduser użytkownik grupa</code>.','Instead of <code>usermod -aG</code> you can also use <code>gpasswd -a</code> or <code>adduser user group</code>.']})},
];

// ---------- 2. prawa dostępu ----------
const OCT=m=>m.toString(8).padStart(3,'0');
const SYMB=m=>permStr(m>>6&7)+permStr(m>>3&7)+permStr(m&7);
function soChmod(){
  const v=rnd(0,2);
  if(v===0){
    const D=pick(SO_D.filter(d=>!['config','public','projekty_shared'].includes(d)));
    return cmdTask({
      q:$t(`Utwórz w katalogu domowym katalog ${C(D)} i nadaj grupie <b>tylko i wyłącznie</b> prawo odczytu. Praw właściciela nie zmieniaj.`,`Create the directory ${C(D)} in the home directory and give the group <b>only</b> the read permission. Do not change the owner’s permissions.`),
      setup:()=>soBase(),ph:'mkdir …',
      model:[`mkdir ${D}`,`chmod g=r ${D}`],
      why:[$t('Tworzymy katalog. Nowy katalog zwykłego użytkownika ma w Ubuntu prawa <code>rwxrwxr-x</code> (umask 002).','Create the directory. In Ubuntu a regular user’s new directory gets <code>rwxrwxr-x</code> (umask 002).'),
        $t('<code>g=r</code> <b>ustawia</b> prawa grupy na samo <code>r</code>, czyli zabiera <code>w</code> i <code>x</code>. Zapis <code>g+r</code> tylko by dodał odczyt i zostawił resztę.','<code>g=r</code> <b>sets</b> the group permissions to just <code>r</code>, removing <code>w</code> and <code>x</code>. <code>g+r</code> would only add read and keep the rest.')],
      inspect:[`ls -ld ${D}`],
      look:$t('Środkowa trójka znaków (grupa) powinna wyglądać tak: <code>r--</code>.','The middle triple (group) should read <code>r--</code>.'),
      verify:S=>{const n=S.fs['/home/student/'+D];return [chk(n&&n.type==='d',`Nie ma katalogu ${D} w /home/student.`,`There is no directory ${D} in /home/student.`),chk(n&&(n.acl.mask??n.acl.gobj)===4&&n.acl.gobj===4,`Grupa nie ma dokładnie r-- (jest ${n?permStr(n.acl.mask??n.acl.gobj):'…'}).`,`The group does not have exactly r-- (it has ${n?permStr(n.acl.mask??n.acl.gobj):'…'}).`),chk(n&&n.acl.uobj===7,'Zmieniły się prawa właściciela.','The owner’s permissions changed.')]},
      hint:$t('chmod g=r katalog (znak = ustawia prawa od nowa).','chmod g=r directory (= sets the permissions from scratch).')
    });
  }
  if(v===1){
    const F=pick(SO_F.filter(f=>f!=='serwer.cfg')),m0=pick([0o664,0o644,0o666]),m=pick([0o640,0o600,0o644,0o664,0o604,0o660,0o400,0o444].filter(x=>x!==m0));
    return cmdTask({
      q:$t(`Ustaw na pliku ${C(F)} prawa <code>${SYMB(m)}</code>.`,`Set the permissions of the file ${C(F)} to <code>${SYMB(m)}</code>.`),
      setup:()=>soBase({files:[{name:F,mode:m0}]}),start:[`ls -l ${F}`],ph:'chmod …',
      model:[`chmod ${OCT(m)} ${F}`],
      why:[$t(`Każda trójka to jedna cyfra: r = 4, w = 2, x = 1. ${SYMB(m).match(/.../g).map(t=>`<code>${t}</code> = ${parseInt(t.replace(/r/,'4').replace(/w/,'2').replace(/x/,'1').replace(/-/g,'0').split('').reduce((s,d)=>s+ +d,0))}`).join(', ')}, razem <code>${OCT(m)}</code>. Zapis symboliczny też działa: <code>chmod u=${permStr(m>>6&7).replace(/-/g,'')},g=${permStr(m>>3&7).replace(/-/g,'')},o=${permStr(m&7).replace(/-/g,'')} ${F}</code>.`,`Each triple is one digit: r = 4, w = 2, x = 1. ${SYMB(m).match(/.../g).map(t=>`<code>${t}</code> = ${parseInt(t.replace(/r/,'4').replace(/w/,'2').replace(/x/,'1').replace(/-/g,'0').split('').reduce((s,d)=>s+ +d,0))}`).join(', ')}, together <code>${OCT(m)}</code>. The symbolic form works too: <code>chmod u=${permStr(m>>6&7).replace(/-/g,'')},g=${permStr(m>>3&7).replace(/-/g,'')},o=${permStr(m&7).replace(/-/g,'')} ${F}</code>.`)],
      inspect:[`ls -l ${F}`],
      look:$t(`Po literze typu (<code>-</code> dla pliku) powinno stać <code>${SYMB(m)}</code>.`,`After the type letter (<code>-</code> for a file) it should read <code>${SYMB(m)}</code>.`),
      verify:S=>{const n=S.fs['/home/student/'+F];return [chk(n&&modeOf(n)===m,`Prawa pliku to ${n?SYMB(modeOf(n)):'…'}, a powinny być ${SYMB(m)}.`,`The file has ${n?SYMB(modeOf(n)):'…'}, but it should have ${SYMB(m)}.`)]},
      hint:$t('Zamień każdą trójkę na cyfrę: r = 4, w = 2, x = 1.','Turn each triple into a digit: r = 4, w = 2, x = 1.')
    });
  }
  const D=pick(['config','public']),G=pick(SO_G);
  return cmdTask({
    q:$t(`Zmień grupę katalogu ${C(D)} na ${C(G)} (grupa istnieje) i nadaj tej grupie prawa <code>rwx</code>.`,`Change the group of the directory ${C(D)} to ${C(G)} (the group exists) and give that group <code>rwx</code>.`),
    setup:()=>soBase({groups:[G]}),start:[`ls -ld ${D}`],ph:'sudo chgrp …',
    model:[`sudo chgrp ${G} ${D}`,`chmod g=rwx ${D}`],
    why:[$t(`Zmieniamy grupę właścicielską. Potrzebne jest <code>sudo</code>, bo student nie należy do grupy ${G}. To samo robi <code>sudo chown :${G} ${D}</code>.`,`Change the owning group. <code>sudo</code> is needed because student is not in ${G}. <code>sudo chown :${G} ${D}</code> does the same.`),$t('Ustawiamy prawa grupy. Właścicielem dalej jest student, więc chmod działa bez sudo.','Set the group permissions. student is still the owner, so chmod works without sudo.')],
    inspect:[`ls -ld ${D}`],
    look:$t(`W czwartej kolumnie powinna być grupa ${G}, a w środkowej trójce <code>rwx</code>.`,`The fourth column should show the group ${G} and the middle triple <code>rwx</code>.`),
    verify:S=>{const n=S.fs['/home/student/'+D];return [chk(n&&n.group===G,`Grupą katalogu jest ${n?n.group:'…'}, a nie ${G}.`,`The directory’s group is ${n?n.group:'…'}, not ${G}.`),chk(n&&(n.acl.mask??n.acl.gobj)===7&&n.acl.gobj===7,'Grupa nie ma rwx.','The group does not have rwx.')]},
    hint:$t('sudo chgrp grupa katalog, potem chmod g=rwx katalog.','sudo chgrp group directory, then chmod g=rwx directory.')
  });
}
function soPermQ(){
  const v=rnd(0,4);
  if(v<=1){
    const m=pick([0o750,0o640,0o755,0o700,0o644,0o711,0o604,0o751,0o660,0o754]),toOct=v===0;
    return fillTask(toOct?{q:[`Zapisz ósemkowo prawa <code>${SYMB(m)}</code>.`,`Write the permissions <code>${SYMB(m)}</code> in octal.`],tpl:['chmod ',{acc:[OCT(m),'0'+OCT(m)],w:5},' plik'],expl:['r = 4, w = 2, x = 1; każda trójka to suma.','r = 4, w = 2, x = 1; each triple is a sum.'],hint:['Każda trójka osobno: rwx = 7, r-x = 5, r-- = 4.','Each triple separately: rwx = 7, r-x = 5, r-- = 4.']}
      :{q:[`Jakie prawa nada <code>chmod ${OCT(m)} plik</code>? Wpisz je jak w <code>ls -l</code> (9 znaków).`,`Which permissions does <code>chmod ${OCT(m)} file</code> give? Write them as in <code>ls -l</code> (9 characters).`],tpl:['-',{acc:[SYMB(m)],w:10},' 1 student student 0 Nov 25 10:00 plik'],expl:['Cyfry rozbijamy na sumy 4 + 2 + 1.','Split each digit into 4 + 2 + 1.'],hint:['7 = rwx, 6 = rw-, 5 = r-x, 4 = r--, 0 = ---.','7 = rwx, 6 = rw-, 5 = r-x, 4 = r--, 0 = ---.']});
  }
  return pick([
    ()=>quizTask({q:['Które polecenie nada grupie <b>tylko</b> odczyt, nie zmieniając praw właściciela i innych?','Which command gives the group <b>only</b> read access without changing the owner’s and others’ permissions?'],opts:[C('chmod g=r plik'),C('chmod g+r plik'),C('chmod 040 plik'),C('chmod 444 plik')],ok:[0],expl:['<code>g+r</code> zostawia <code>w</code> i <code>x</code>, jeśli były, a liczby ustawiają prawa wszystkim naraz.','<code>g+r</code> keeps <code>w</code> and <code>x</code> if they were there, and numbers set everyone’s permissions at once.']}),
    ()=>quizTask({q:['Katalog ma prawa <code>drwxr--r--</code>. Czy członek grupy może do niego wejść (<code>cd</code>)?','A directory has <code>drwxr--r--</code>. Can a group member enter it (<code>cd</code>)?'],opts:[['Nie, do wejścia potrzebne jest prawo x','No, entering needs the x permission'],['Tak, wystarczy r','Yes, r is enough'],['Tak, bo jest w grupie','Yes, because they are in the group'],['Tylko z sudo','Only with sudo']],ok:[0],expl:['Dla katalogu <code>r</code> pozwala wypisać nazwy plików, <code>w</code> tworzyć i usuwać pliki, a <code>x</code> wejść do środka.','For a directory, <code>r</code> lists the file names, <code>w</code> creates and deletes files, and <code>x</code> lets you enter.']}),
    ()=>quizTask({q:['Co oznacza znak <code>+</code> na końcu praw, np. <code>drwxrwxr-x+</code>?','What does the <code>+</code> at the end of the permissions mean, e.g. <code>drwxrwxr-x+</code>?'],opts:[['Plik ma dodatkowe wpisy ACL','The file has extra ACL entries'],['Plik jest ukryty','The file is hidden'],['Plik jest wykonywalny','The file is executable'],['Katalog jest pusty','The directory is empty']],ok:[0],expl:['Szczegóły pokazuje <code>getfacl</code>. Przy ACL środkowa trójka w <code>ls -l</code> to maska, a nie prawa grupy.','<code>getfacl</code> shows the details. With an ACL the middle triple in <code>ls -l</code> is the mask, not the group’s permissions.']}),
  ])();
}

// ---------- 3. ACL ----------
function soAcl(){
  const v=rnd(0,4);
  const show=n=>[`getfacl ${n}`];
  if(v===0){
    const U=pick(SO_U),D='projekty_shared';
    return cmdTask({
      q:$t(`Ustaw <b>domyślne</b> ACL tak, aby użytkownik ${C(U)} miał prawa <code>rwx</code> w katalogu ${C(D)}.`,`Set a <b>default</b> ACL so that the user ${C(U)} has <code>rwx</code> in the directory ${C(D)}.`),
      setup:()=>soBase({users:[U]}),ph:'setfacl …',
      model:[`setfacl -d -m u:${U}:rwx ${D}`],
      why:[$t(`<code>-d</code> zmienia ACL domyślne, które dziedziczą nowe pliki i katalogi tworzone w ${D}; <code>-m</code> dopisuje wpis <code>u:${U}:rwx</code>. Właścicielem katalogu jest student, więc sudo nie jest potrzebne. To samo: <code>setfacl -m d:u:${U}:rwx ${D}</code>.`,`<code>-d</code> changes the default ACL inherited by new files and directories created in ${D}; <code>-m</code> adds the entry <code>u:${U}:rwx</code>. student owns the directory, so sudo is not needed. Equivalent: <code>setfacl -m d:u:${U}:rwx ${D}</code>.`)],
      inspect:[...show(D),`mkdir ${D}/test`,`getfacl ${D}/test`],
      look:$t(`W <code>getfacl</code> pojawia się linia <code>default:user:${U}:rwx</code>. Nowy katalog test dziedziczy ten wpis jako zwykły <code>user:${U}:rwx</code>.`,`<code>getfacl</code> shows <code>default:user:${U}:rwx</code>. The new directory test inherits it as a plain <code>user:${U}:rwx</code>.`),
      verify:S=>{const n=S.fs['/home/student/'+D];return [chk(n&&n.dacl&&n.dacl.u[U]===7,`W domyślnym ACL katalogu ${D} brakuje wpisu user:${U}:rwx.`,`The default ACL of ${D} lacks the entry user:${U}:rwx.`)]},
      hint:$t('setfacl -d -m u:użytkownik:rwx katalog','setfacl -d -m u:user:rwx directory')
    });
  }
  if(v===1){
    const D='public';
    return cmdTask({
      q:$t(`Ustaw <b>domyślne</b> ACL tak, aby wszyscy inni (others) mieli w katalogu ${C(D)} tylko prawo odczytu.`,`Set a <b>default</b> ACL so that everyone else (others) has only read access in the directory ${C(D)}.`),
      setup:()=>soBase(),ph:'setfacl …',
      model:[`setfacl -d -m o::r ${D}`],
      why:[$t('Wpis dla innych ma pustą nazwę: <code>o::r</code> (albo <code>o::r--</code>, <code>other::r</code>). Bez <code>-d</code> zmieniłyby się bieżące prawa katalogu, a nie te dziedziczone.','The entry for others has an empty name: <code>o::r</code> (or <code>o::r--</code>, <code>other::r</code>). Without <code>-d</code> the current permissions of the directory would change instead of the inherited ones.')],
      inspect:show(D),
      look:$t('Szukamy linii <code>default:other::r--</code>.','Look for the line <code>default:other::r--</code>.'),
      verify:S=>{const n=S.fs['/home/student/'+D];return [chk(n&&n.dacl&&n.dacl.o===4,'W domyślnym ACL brakuje default:other::r--.','The default ACL lacks default:other::r--.')]},
      hint:$t('setfacl -d -m o::r katalog','setfacl -d -m o::r directory')
    });
  }
  if(v===2){
    const F='serwer.cfg',U='adam';
    return cmdTask({
      q:$t(`Nadaj użytkownikowi ${C(U)} prawa <code>rwx</code> do pliku ${C(F)} (przez ACL), a następnie ustaw maskę na <code>r-x</code>.`,`Give the user ${C(U)} <code>rwx</code> on the file ${C(F)} (with an ACL), then set the mask to <code>r-x</code>.`),
      setup:()=>soBase(),ph:'setfacl -m …',
      model:[`setfacl -m u:${U}:rwx ${F}`,`setfacl -m m::r-x ${F}`],
      why:[$t('Dopisujemy wpis dla użytkownika. setfacl sam przelicza maskę na sumę praw grupowych, więc maska zrobi się <code>rwx</code>.','Add the user entry. setfacl recalculates the mask as the union of the group-class permissions, so the mask becomes <code>rwx</code>.'),
        $t('Teraz ustawiamy maskę. Kolejność jest ważna: gdyby maskę ustawić najpierw, kolejne <code>-m</code> przeliczyłoby ją z powrotem na <code>rwx</code> (chyba że z opcją <code>-n</code>).','Now set the mask. The order matters: if the mask were set first, the next <code>-m</code> would recalculate it back to <code>rwx</code> (unless <code>-n</code> is used).')],
      inspect:show(F),
      look:$t(`Przy <code>user:${U}:rwx</code> pojawia się komentarz <code>#effective:r-x</code>: maska ogranicza prawa adama do odczytu i wykonywania.`,`Next to <code>user:${U}:rwx</code> there is the comment <code>#effective:r-x</code>: the mask limits adam to read and execute.`),
      verify:S=>{const n=S.fs['/home/student/'+F];return [chk(n&&n.acl.u[U]===7,`Brakuje wpisu user:${U}:rwx.`,`The entry user:${U}:rwx is missing.`),chk(n&&n.acl.mask===5,`Maska to ${n&&n.acl.mask!=null?permStr(n.acl.mask):'brak'}, a powinna być r-x. Jeśli maska wyszła rwx, ustaw ją na końcu.`,`The mask is ${n&&n.acl.mask!=null?permStr(n.acl.mask):'missing'}, but it should be r-x. If it came out rwx, set it last.`)]},
      hint:$t('Najpierw setfacl -m u:adam:rwx plik, potem setfacl -m m::r-x plik.','First setfacl -m u:adam:rwx file, then setfacl -m m::r-x file.')
    });
  }
  if(v===3){
    const G=pick(SO_G),D='config';
    return cmdTask({
      q:$t(`Grupa ${C(G)} istnieje. Nadaj jej prawa <code>rw-</code> do katalogu ${C(D)}.`,`The group ${C(G)} exists. Give it <code>rw-</code> on the directory ${C(D)}.`),
      setup:()=>soBase({groups:[G]}),ph:'setfacl -m …',
      model:[`setfacl -m g:${G}:rw- ${D}`],
      why:[$t(`Najprościej przez ACL: wpis <code>g:${G}:rw-</code> dla grupy nazwanej. Właściciel i grupa katalogu się nie zmieniają. Inny sposób: <code>sudo chgrp ${G} ${D}</code> i <code>chmod g=rw ${D}</code>.`,`The simplest way is an ACL: the entry <code>g:${G}:rw-</code> for a named group. The owner and group of the directory stay the same. Another way: <code>sudo chgrp ${G} ${D}</code> and <code>chmod g=rw ${D}</code>.`)],
      inspect:show(D),
      look:$t(`Jest linia <code>group:${G}:rw-</code>, a maska nie ogranicza tych praw.`,`There is a line <code>group:${G}:rw-</code> and the mask does not restrict it.`),
      verify:S=>{const n=S.fs['/home/student/'+D],p=n?groupPerm(n,G):null;return [chk(p===6,`Grupa ${G} ma ${p==null?'brak praw':permStr(p)} zamiast rw-.`,`The group ${G} has ${p==null?'no permissions':permStr(p)} instead of rw-.`)]},
      hint:$t('setfacl -m g:grupa:rw- katalog','setfacl -m g:group:rw- directory')
    });
  }
  const U=pick(SO_U),D='projekty_shared';
  return cmdTask({
    q:$t(`Katalog ${C(D)} ma wpis ACL dla użytkownika ${C(U)}. Usuń ten wpis (ACL dla adama ma zostać).`,`The directory ${C(D)} has an ACL entry for the user ${C(U)}. Remove that entry (the ACL for adam must stay).`),
    setup:()=>{const S=soBase({users:[U]});simRun(S,`setfacl -m u:${U}:rwx,u:adam:r-x ${D}`);S.hints=[];return S},start:show(D),ph:'setfacl -x …',
    model:[`setfacl -x u:${U} ${D}`],
    why:[$t('<code>-x</code> usuwa wpis; podaje się go bez praw. <code>setfacl -b</code> skasowałoby całe ACL, także wpis adama.','<code>-x</code> removes an entry, written without permissions. <code>setfacl -b</code> would delete the whole ACL, including adam’s entry.')],
    inspect:show(D),
    look:$t(`Linia <code>user:${U}:rwx</code> zniknęła, <code>user:adam:r-x</code> została.`,`The line <code>user:${U}:rwx</code> is gone, <code>user:adam:r-x</code> is still there.`),
    verify:S=>{const n=S.fs['/home/student/'+D];return [chk(n&&n.acl.u[U]===undefined,`Wpis dla ${U} nadal jest.`,`The entry for ${U} is still there.`),chk(n&&n.acl.u.adam===5,'Wpis dla adama zniknął albo się zmienił.','The entry for adam is gone or changed.')]},
    hint:$t('setfacl -x u:użytkownik katalog','setfacl -x u:user directory')
  });
}
function soAclQ(){
  const v=rnd(0,2);
  if(v===0){
    const U=pick(SO_U),p=pick([7,6,7,5]),m=pick([5,4,6,1].filter(x=>(x&p)!==p)),e=p&m;
    const S=soBase({users:[U]});simRun(S,`setfacl -m u:${U}:${permStr(p)} serwer.cfg`);simRun(S,`setfacl -n -m m::${permStr(m)} serwer.cfg`);
    return fillTask({q:[`Jakie <b>efektywne</b> prawa ma użytkownik ${C(U)} do pliku?`,`What are the <b>effective</b> permissions of the user ${C(U)} on the file?`],body:termHtml(simScript(S,'getfacl serwer.cfg').filter(x=>x.t!=='note').map(x=>x.t==='out'&&/#effective/.test(x.s)?{...x,s:x.s.replace(/\t+#effective:.*/,'')}:x)),
      tpl:[`${U}: `,{acc:[permStr(e)],w:5}],expl:[`Efektywne prawa to część wspólna wpisu i maski: ${permStr(p)} ∩ ${permStr(m)} = ${permStr(e)}.`,`The effective permissions are the intersection of the entry and the mask: ${permStr(p)} ∩ ${permStr(m)} = ${permStr(e)}.`],hint:['Porównaj wpis użytkownika z linią mask::. Zostaje to, co jest w obu.','Compare the user entry with the mask:: line. What is in both remains.']});
  }
  return pick([
    ()=>quizTask({q:['Co robi <code>setfacl -d -m u:anna:rwx katalog</code>?','What does <code>setfacl -d -m u:anna:rwx dir</code> do?'],opts:[['Ustawia ACL domyślne: nowe pliki i katalogi tworzone w środku dostaną wpis dla anny','Sets the default ACL: new files and directories created inside get an entry for anna'],['Zmienia tylko bieżące prawa katalogu dla anny','Changes only the current permissions of the directory for anna'],['Usuwa wpis anny','Removes anna’s entry'],['Ustawia annę właścicielką katalogu','Makes anna the owner of the directory']],ok:[0],expl:['Domyślne ACL widać w getfacl jako linie zaczynające się od <code>default:</code>. Same prawa do katalogu daje <code>setfacl -m</code> bez <code>-d</code>.','The default ACL shows up in getfacl as lines starting with <code>default:</code>. Access to the directory itself comes from <code>setfacl -m</code> without <code>-d</code>.']}),
    ()=>quizTask({q:['Do czego służy maska (<code>mask::</code>) w ACL?','What is the mask (<code>mask::</code>) for in an ACL?'],opts:[['Ogranicza prawa nazwanych użytkowników, nazwanych grup i grupy właścicielskiej','It limits the permissions of named users, named groups and the owning group'],['Ogranicza prawa właściciela pliku','It limits the file owner’s permissions'],['Ukrywa plik przed innymi','It hides the file from others'],['Ustawia prawa dla others','It sets the permissions for others']],ok:[0],expl:['Właściciela (<code>user::</code>) i innych (<code>other::</code>) maska nie dotyczy.','The mask does not apply to the owner (<code>user::</code>) or to others (<code>other::</code>).']}),
    ()=>quizTask({q:['Jak usunąć z pliku <b>wszystkie</b> wpisy ACL?','How do you remove <b>all</b> ACL entries from a file?'],opts:[C('setfacl -b plik'),C('setfacl -k plik'),C('setfacl -x plik'),C('chmod 000 plik')],ok:[0],expl:['<code>-k</code> usuwa tylko ACL domyślne, a <code>-x</code> pojedynczy wpis.','<code>-k</code> removes only the default ACL, and <code>-x</code> a single entry.']}),
    ()=>quizTask({q:['Najpierw <code>setfacl -m m::r-x f</code>, potem <code>setfacl -m u:adam:rwx f</code>. Jaka jest maska?','First <code>setfacl -m m::r-x f</code>, then <code>setfacl -m u:adam:rwx f</code>. What is the mask?'],opts:[C('rwx'),C('r-x'),C('r--'),['nie ma maski','there is no mask']],ok:[0],expl:['Każde <code>setfacl -m</code> bez <code>-n</code> przelicza maskę na sumę praw wpisów grupowych. Maskę ustawia się więc na końcu.','Every <code>setfacl -m</code> without <code>-n</code> recalculates the mask as the union of the group-class entries. So the mask is set last.']}),
  ])();
}

// ---------- 4. grep ----------
const LET=(()=>{const c={};MIASTA.forEach(m=>{c[m[0]]=(c[m[0]]||0)+1});return c})();
function grepOut(cmd){return simScript(simNew(),cmd).filter(x=>x.t==='out').map(x=>x.s)}
function soGrep(){
  const letters=Object.keys(LET).filter(l=>LET[l]>=3&&/[A-Z]/.test(l));
  const V=[
    ()=>{const L=pick(letters);return {q:[`zaczynające się na literę <b>${L}</b>`,`starting with the letter <b>${L}</b>`],m:`grep '^${L}' miasta.txt`,w:[`<code>^</code> oznacza początek linii, więc <code>^${L}</code> pasuje tylko do linii zaczynających się od ${L}. Bez <code>^</code> grep znalazłby ${L} w dowolnym miejscu.`,`<code>^</code> marks the start of a line, so <code>^${L}</code> matches only lines beginning with ${L}. Without <code>^</code> grep would find ${L} anywhere.`]}},
    ()=>{const n=pick([4,5,6,7]);return {q:[`które mają dokładnie <b>${n} liter</b>`,`that have exactly <b>${n} letters</b>`],m:`grep -E '^.{${n}}$' miasta.txt`,w:[`<code>.</code> to dowolny znak, <code>{${n}}</code> to dokładnie ${n} powtórzeń, a <code>^</code> i <code>$</code> przyklejają wzorzec do początku i końca linii. <code>-E</code> włącza rozszerzone wyrażenia (bez niego trzeba pisać <code>\\{${n}\\}</code>). Działa też <code>grep '^${'.'.repeat(n)}$' miasta.txt</code>.`,`<code>.</code> is any character, <code>{${n}}</code> means exactly ${n} repetitions, and <code>^</code> and <code>$</code> pin the pattern to the start and end of the line. <code>-E</code> enables extended expressions (without it write <code>\\{${n}\\}</code>). <code>grep '^${'.'.repeat(n)}$' miasta.txt</code> also works.`]}},
    ()=>{const [a,b]=pickN(letters,2).sort();return {q:[`zaczynające się na <b>${a}</b> lub <b>${b}</b>`,`starting with <b>${a}</b> or <b>${b}</b>`],m:`grep '^[${a}${b}]' miasta.txt`,w:[`<code>[${a}${b}]</code> to jeden znak z listy. Równoważnie: <code>grep -E '^(${a}|${b})' miasta.txt</code>.`,`<code>[${a}${b}]</code> is one character from the list. Equivalent: <code>grep -E '^(${a}|${b})' miasta.txt</code>.`]}},
    ()=>{const s=pick(['ów','ice','sk','no','in','ec','ia','ska']);return {q:[`kończące się na <code>${s}</code>`,`ending in <code>${s}</code>`],m:`grep '${s}$' miasta.txt`,w:[`<code>$</code> oznacza koniec linii, więc pasują tylko nazwy, które kończą się na <code>${s}</code>.`,`<code>$</code> marks the end of a line, so only names ending in <code>${s}</code> match.`]}},
    ()=>{const L=pick(['S','K','P','W','G','B']);return {q:[`<b>nie</b> zaczynające się na <b>${L}</b>`,`<b>not</b> starting with <b>${L}</b>`],m:`grep -v '^${L}' miasta.txt`,w:[`<code>-v</code> odwraca wynik: wypisuje linie, które <b>nie</b> pasują. Działa też <code>grep '^[^${L}]' miasta.txt</code>.${L==='S'?' Świnoujście zostaje, bo Ś to inna litera niż S.':L==='Z'?' Żory zostają, bo Ż to inna litera niż Z.':''}`,`<code>-v</code> inverts the result: it prints the lines that do <b>not</b> match. <code>grep '^[^${L}]' miasta.txt</code> also works.${L==='S'?' Świnoujście stays, because Ś is a different letter from S.':''}`]}},
    ()=>{const L=pick(letters);return {q:[`zaczynające się na <b>${L}</b>; wypisz <b>samą liczbę</b> takich miast`,`starting with <b>${L}</b>; print <b>only the number</b> of such cities`],m:`grep -c '^${L}' miasta.txt`,w:[`<code>-c</code> liczy pasujące linie zamiast je wypisywać. To samo daje <code>grep '^${L}' miasta.txt | wc -l</code>.`,`<code>-c</code> counts the matching lines instead of printing them. <code>grep '^${L}' miasta.txt | wc -l</code> gives the same.`]}},
    ()=>{const s=pick(['góra','nowy','biał','ów']);return {q:[`zawierające <code>${s}</code> bez względu na wielkość liter`,`containing <code>${s}</code> regardless of letter case`],m:`grep -i '${s}' miasta.txt`,w:[`<code>-i</code> ignoruje wielkość liter, więc pasuje też np. <code>${s[0].toUpperCase()+s.slice(1)}</code>.`,`<code>-i</code> ignores case, so e.g. <code>${s[0].toUpperCase()+s.slice(1)}</code> matches too.`]}},
    ()=>({q:['których nazwa składa się z <b>dwóch wyrazów</b>','whose name consists of <b>two words</b>'],m:`grep ' ' miasta.txt`,w:['Dwa wyrazy oddziela spacja, więc wystarczy szukać spacji. Apostrofy są konieczne, bo inaczej powłoka zgubi spację.','Two words are separated by a space, so it is enough to look for a space. The quotes are needed, otherwise the shell drops the space.']}),
    ()=>{const L=pick(['K','S','G','P']),e=pick(['n','a','e','o']);return {q:[`zaczynające się na <b>${L}</b> i kończące na <b>${e}</b>`,`starting with <b>${L}</b> and ending in <b>${e}</b>`],m:`grep '^${L}.*${e}$' miasta.txt`,w:[`<code>.*</code> to dowolny ciąg znaków (także pusty) między pierwszą a ostatnią literą.`,`<code>.*</code> is any sequence of characters (possibly empty) between the first and the last letter.`]}},
  ];
  let g;for(let t=0;t<20;t++){g=pick(V)();const out=grepOut(g.m);if(out.length>=2&&!(out.length===1&&out[0]==='0'))break}
  const exp=grepOut(g.m);
  return cmdTask({
    q:$t(`Wyświetl z pliku ${C('miasta.txt')} wszystkie miasta ${g.q[0]}.`,`From the file ${C('miasta.txt')}, print all the cities ${g.q[1]}.`),
    body:`<p class="note">${$t(`Plik ma ${MIASTA.length} linii, w każdej jedno miasto. Wynik sprawdzany jest po ostatnim poleceniu.`,`The file has ${MIASTA.length} lines, one city per line. The output of the last command is checked.`)}</p>`,
    setup:()=>simNew(),ph:"grep '…' miasta.txt",rows:2,
    model:[g.m],why:[$t(g.w[0],g.w[1])],
    look:$t('Wynik powinien być taki jak wyżej.','The output should be the same as above.'),
    verify:(S,tr)=>{
      const ends=tr.filter(x=>x.t==='end'),last=ends.length?ends[ends.length-1].out:[];
      const miss=exp.filter(x=>!last.includes(x)),extra=last.filter(x=>!exp.includes(x)),same=miss.length===0&&extra.length===0&&last.length===exp.length;
      const L=a=>a.slice(0,5).join(', ')+(a.length>5?'…':'');
      return [chk(same,`Wynik różni się od oczekiwanego.${miss.length?` Brakuje: ${L(miss)}.`:''}${extra.length?` Zbędne: ${L(extra)}.`:''}`,`The output differs from the expected one.${miss.length?` Missing: ${L(miss)}.`:''}${extra.length?` Extra: ${L(extra)}.`:''}`)];
    },
    hint:$t('Kotwice: ^ to początek linii, $ to koniec. -v odwraca, -c liczy, -i ignoruje wielkość liter, -E włącza {n} i |.','Anchors: ^ is the start of a line, $ the end. -v inverts, -c counts, -i ignores case, -E enables {n} and |.')
  });
}
function soGrepQ(){
  return pick([
    ()=>quizTask({q:['Który wzorzec znajdzie miasta <b>zaczynające się</b> na G?','Which pattern finds the cities <b>starting</b> with G?'],opts:[C("grep '^G' miasta.txt"),C("grep 'G$' miasta.txt"),C("grep 'G' miasta.txt"),C("grep '[^G]' miasta.txt")],ok:[0],expl:['<code>G$</code> to G na końcu, samo <code>G</code> to G gdziekolwiek, a <code>[^G]</code> to dowolny znak inny niż G.','<code>G$</code> is G at the end, plain <code>G</code> is G anywhere, and <code>[^G]</code> is any character other than G.']}),
    ()=>quizTask({q:['Które polecenia wypiszą miasta mające <b>dokładnie 6</b> znaków?','Which commands print the cities with <b>exactly 6</b> characters?'],opts:[C("grep -E '^.{6}$' miasta.txt"),C("grep '^......$' miasta.txt"),C("grep '^.\\{6\\}$' miasta.txt"),C("grep -E '.{6}' miasta.txt"),C("grep '^.{6}$' miasta.txt")],ok:[0,1,2],expl:['Bez <code>^</code> i <code>$</code> pasuje każda nazwa mająca co najmniej 6 znaków. Bez <code>-E</code> nawiasy <code>{}</code> są zwykłymi znakami (chyba że z ukośnikami).','Without <code>^</code> and <code>$</code> any name with at least 6 characters matches. Without <code>-E</code> the braces <code>{}</code> are literal characters (unless escaped).']}),
    ()=>quizTask({q:['Czy <code>grep \'^S\' miasta.txt</code> wypisze Świnoujście?','Does <code>grep \'^S\' miasta.txt</code> print Świnoujście?'],opts:[['Nie, Ś to inna litera niż S','No, Ś is a different letter from S'],['Tak, grep nie rozróżnia polskich znaków','Yes, grep does not distinguish Polish letters'],['Tak, ale tylko z -i','Yes, but only with -i'],['Nie, bo nazwa jest za długa','No, because the name is too long']],ok:[0],expl:['Dlatego <code>grep -v \'^S\'</code> zostawia Świnoujście na liście.','That is why <code>grep -v \'^S\'</code> keeps Świnoujście in the list.']}),
    ()=>quizTask({q:['Co robi opcja <code>-v</code> w grep?','What does the <code>-v</code> option of grep do?'],opts:[['Wypisuje linie, które NIE pasują do wzorca','Prints the lines that do NOT match the pattern'],['Pokazuje wersję programu','Shows the program version'],['Wypisuje więcej szczegółów','Prints more details'],['Liczy pasujące linie','Counts the matching lines']],ok:[0],expl:['Liczy <code>-c</code>, numery linii daje <code>-n</code>, wielkość liter ignoruje <code>-i</code>.','<code>-c</code> counts, <code>-n</code> adds line numbers, <code>-i</code> ignores case.']}),
    ()=>quizTask({q:['Które zapisy znajdą miasta zaczynające się na K <b>lub</b> L?','Which commands find the cities starting with K <b>or</b> L?'],opts:[C("grep '^[KL]' miasta.txt"),C("grep -E '^(K|L)' miasta.txt"),C("grep '^K|L' miasta.txt"),C("grep '^[K-L]$' miasta.txt")],ok:[0,1],expl:['Bez <code>-E</code> znak <code>|</code> jest zwykłym znakiem, a <code>^[K-L]$</code> pasuje tylko do linii z jedną literą.','Without <code>-E</code> the <code>|</code> is an ordinary character, and <code>^[K-L]$</code> only matches lines with a single letter.']}),
    ()=>quizTask({q:['Dlaczego wzorzec warto ująć w apostrofy, np. <code>grep \'ów$\' miasta.txt</code>?','Why is it worth putting the pattern in single quotes, e.g. <code>grep \'ów$\' miasta.txt</code>?'],opts:[['Żeby powłoka nie zinterpretowała znaków specjalnych (*, $, spacje) przed grep','So that the shell does not interpret special characters (*, $, spaces) before grep'],['Bo grep wymaga apostrofów','Because grep requires quotes'],['Żeby grep ignorował wielkość liter','So that grep ignores case'],['Apostrofy nic nie zmieniają','Quotes change nothing']],ok:[0],expl:['W apostrofach powłoka przekazuje tekst dosłownie.','Inside single quotes the shell passes the text literally.']}),
  ])();
}

// ---------- 5. sieć i SSH ----------
function soIp(){const a=pick([193,192,10,172]),b=a===192?168:rnd(0,250),c=rnd(0,250);return {net:`${a}.${b}.${c}`,ws:rnd(10,99),srv:1,pre:24}}
function soNetplan(){
  const I=soIp(),ip=`${I.net}.${I.ws}`,gw=`${I.net}.${I.srv}`,ifc=pick(['enp0s3','ens33','eth0']);
  return fillTask({q:[`Uzupełnij plik <code>/etc/netplan/01-netcfg.yaml</code> tak, aby karta <code>${ifc}</code> miała statyczny adres <b>${ip}/${I.pre}</b> i bramę <b>${gw}</b>. Potem zastosuj ustawienia.`,`Complete <code>/etc/netplan/01-netcfg.yaml</code> so that the interface <code>${ifc}</code> gets the static address <b>${ip}/${I.pre}</b> and the gateway <b>${gw}</b>. Then apply the settings.`],
    tpl:[`network:\n  version: 2\n  ethernets:\n    ${ifc}:\n      dhcp4: `,{acc:['false','no'],w:6},`\n      addresses:\n        - `,{acc:[`${ip}/${I.pre}`],w:18},`\n      routes:\n        - to: `,{acc:['default','0.0.0.0/0'],w:9},`\n          via: `,{acc:[gw],w:15},`\n      nameservers:\n        addresses: [8.8.8.8]\n\n$ sudo netplan `,{acc:['apply','try'],w:6}],
    expl:['Adres podaje się z długością prefiksu (/24 to maska 255.255.255.0). Wcięcia w YAML muszą być spacjami. Na Ubuntu Desktop to samo można ustawić przez NetworkManager: <code>nmcli</code> albo w ustawieniach sieci. Sprawdzenie: <code>ip a</code> i <code>ip route</code>.','The address is given with the prefix length (/24 is the mask 255.255.255.0). YAML indentation must use spaces. On Ubuntu Desktop the same can be set with NetworkManager: <code>nmcli</code> or the network settings. Check with <code>ip a</code> and <code>ip route</code>.'],
    hint:['dhcp4 wyłączamy, adres z /24, trasa domyślna przez bramę.','Turn dhcp4 off, the address with /24, the default route via the gateway.']});
}
function soSsh(){
  const P=pick([997,2222,2200,8022]),I=soIp(),srv=`${I.net}.${I.srv}`,U=pick(SO_U);
  return pick([
    ()=>fillTask({q:[`Zmień port serwera SSH z 22 na ${P}. Uzupełnij plik i polecenia.`,`Change the SSH server port from 22 to ${P}. Complete the file and the commands.`],
      tpl:['# plik /etc/ssh/',{acc:['sshd_config'],w:12},`\n`,{acc:['Port'],w:5},` ${P}\n\n$ sudo systemctl `,{acc:['daemon-reload'],w:13},`\n$ sudo systemctl restart ssh.`,{acc:['socket'],w:7},`\n$ sudo systemctl restart ssh\n$ sudo ss -tlnp | grep `,{acc:[String(P)],w:5}],
      expl:['W nowszym Ubuntu SSH startuje przez gniazdo systemd (<code>ssh.socket</code>), dlatego po zmianie <code>sshd_config</code> trzeba przeładować systemd i zrestartować gniazdo. Klient może mieć port zapisany w <code>/etc/ssh/ssh_config</code> albo podany przez <code>ssh -p</code>.','In newer Ubuntu SSH starts through a systemd socket (<code>ssh.socket</code>), so after editing <code>sshd_config</code> systemd must be reloaded and the socket restarted. The client can have the port in <code>/etc/ssh/ssh_config</code> or pass it with <code>ssh -p</code>.'],
      hint:['Plik serwera to sshd_config (z literą d). Na końcu ss pokazuje porty, na których coś nasłuchuje.','The server file is sshd_config (with the letter d). At the end ss shows the listening ports.']}),
    ()=>fillTask({q:[`Skonfiguruj logowanie kluczem ze stacji roboczej na serwer ${srv} (port ${P}) i wyłącz logowanie hasłem.`,`Set up key login from the workstation to the server ${srv} (port ${P}) and disable password login.`],
      tpl:['# na stacji roboczej\n$ ',{acc:['ssh-keygen'],w:10},' -t ed25519\n$ ',{acc:['ssh-copy-id'],w:11},` -p ${P} ${U}@${srv}\n\n# na serwerze, w /etc/ssh/sshd_config\n`,{acc:['PasswordAuthentication'],w:22},' ',{acc:['no'],w:4},`\n$ sudo systemctl restart ssh\n\n# test ze stacji roboczej\n$ ssh `,{acc:['-p'],w:3},` ${P} ${U}@${srv}`],
      expl:['Kolejność ma znaczenie: najpierw klucz kopiujemy na serwer, dopiero potem wyłączamy hasła. Inaczej nie da się już zalogować. Klucz trafia do <code>~/.ssh/authorized_keys</code> na serwerze.','The order matters: first copy the key to the server, only then disable passwords. Otherwise you can no longer log in. The key ends up in <code>~/.ssh/authorized_keys</code> on the server.'],
      hint:['ssh-keygen tworzy parę kluczy, ssh-copy-id kopiuje klucz publiczny.','ssh-keygen creates the key pair, ssh-copy-id copies the public key.']}),
    ()=>quizTask({q:['W którym pliku <b>serwera</b> ustawia się port SSH?','In which <b>server</b> file is the SSH port set?'],opts:[C('/etc/ssh/sshd_config'),C('/etc/ssh/ssh_config'),C('/etc/hosts'),C('/etc/netplan/01-netcfg.yaml')],ok:[0],expl:['<code>sshd_config</code> (z d jak daemon) to serwer, <code>ssh_config</code> to klient.','<code>sshd_config</code> (d as in daemon) is the server, <code>ssh_config</code> the client.']}),
    ()=>quizTask({q:['Który pakiet trzeba zainstalować, żeby komputer był serwerem SSH?','Which package makes the computer an SSH server?'],opts:[C('openssh-server'),C('openssh-client'),C('ssh-server'),C('sshd')],ok:[0],expl:['Instalacja: <code>sudo apt update</code>, potem <code>sudo apt install openssh-server</code>. Stan usługi: <code>systemctl status ssh</code>.','Install with <code>sudo apt update</code>, then <code>sudo apt install openssh-server</code>. Service status: <code>systemctl status ssh</code>.']}),
    ()=>quizTask({q:[`Jak sprawdzić, czy serwer nasłuchuje na porcie ${P}?`,`How do you check whether the server listens on port ${P}?`],opts:[C(`sudo ss -tlnp | grep ${P}`),C(`ping ${P}`),C(`sudo ufw allow ${P}`),C('ip a')],ok:[0],expl:['<code>ss -tlnp</code>: t = TCP, l = nasłuchujące, n = numery zamiast nazw, p = proces.','<code>ss -tlnp</code>: t = TCP, l = listening, n = numbers instead of names, p = process.']}),
    ()=>quizTask({q:['Która kolejność jest poprawna przy przejściu na logowanie kluczem?','Which order is correct when switching to key login?'],opts:[['ssh-keygen, ssh-copy-id, PasswordAuthentication no, restart ssh','ssh-keygen, ssh-copy-id, PasswordAuthentication no, restart ssh'],['PasswordAuthentication no, restart ssh, ssh-keygen, ssh-copy-id','PasswordAuthentication no, restart ssh, ssh-keygen, ssh-copy-id'],['ssh-copy-id, ssh-keygen, restart ssh','ssh-copy-id, ssh-keygen, restart ssh'],['ssh-keygen na serwerze, potem restart','ssh-keygen on the server, then a restart']],ok:[0],expl:['Po wyłączeniu haseł <code>ssh-copy-id</code> już się nie zaloguje, więc klucz musi być na serwerze wcześniej.','After passwords are disabled, <code>ssh-copy-id</code> can no longer log in, so the key must be on the server first.']}),
    ()=>quizTask({q:['Co oznacza <code>/24</code> w adresie <code>193.107.32.22/24</code>?','What does <code>/24</code> mean in <code>193.107.32.22/24</code>?'],opts:[['Maskę 255.255.255.0 (24 bity sieci)','The mask 255.255.255.0 (24 network bits)'],['Numer portu','A port number'],['Bramę 193.107.32.24','The gateway 193.107.32.24'],['24 komputery w sieci','24 computers in the network']],ok:[0],expl:['Pierwsze 24 bity to adres sieci (193.107.32), ostatnie 8 bitów to numer komputera.','The first 24 bits are the network (193.107.32), the last 8 bits the host number.']}),
  ])();
}
function soUfw(){
  const P=pick([997,2222,22,8022]),I=soIp(),ws=`${I.net}.${I.ws}`,srv=`${I.net}.${I.srv}`,v=rnd(0,2);
  const hasIn=(S,from)=>S.ufw.rules.some(R=>R.act==='allow'&&R.dir==='in'&&R.port===String(P)&&R.proto!=='udp'&&(from?R.from===from:true)&&(R.to==='any'||R.to===srv));
  if(v===0)return cmdTask({
    q:$t(`Na serwerze zezwól na połączenia przychodzące na port ${C(P+'/tcp')} i włącz zaporę UFW.`,`On the server, allow incoming connections on port ${C(P+'/tcp')} and enable the UFW firewall.`),
    setup:()=>simNew(),ph:'sudo ufw …',
    model:[`sudo ufw allow ${P}/tcp`,'sudo ufw enable'],
    why:[$t('Dodajemy regułę dla ruchu przychodzącego (to jest domyślny kierunek). Zapisy <code>allow in '+P+'/tcp</code> i <code>allow '+P+'</code> też działają.','Add a rule for incoming traffic (the default direction). <code>allow in '+P+'/tcp</code> and <code>allow '+P+'</code> also work.'),$t('Włączamy zaporę. Najpierw reguła, potem włączenie, inaczej przez SSH można odciąć sobie dostęp.','Enable the firewall. Rule first, then enable, otherwise you can cut off your own SSH access.')],
    inspect:['sudo ufw status'],look:$t(`Status: active i reguła ${P}/tcp ALLOW.`,`Status: active and the rule ${P}/tcp ALLOW.`),
    verify:S=>[chk(hasIn(S),`Brakuje reguły allow ${P}/tcp dla ruchu przychodzącego.`,`The allow rule for incoming ${P}/tcp is missing.`),chk(S.ufw.on,'Zapora nie jest włączona (sudo ufw enable).','The firewall is not enabled (sudo ufw enable).')],
    hint:$t(`sudo ufw allow ${P}/tcp, potem sudo ufw enable`,`sudo ufw allow ${P}/tcp, then sudo ufw enable`)
  });
  if(v===1)return cmdTask({
    q:$t(`Na serwerze zezwól na SSH (port ${C(P+'/tcp')}) <b>tylko ze stacji roboczej</b> ${C(ws)} i włącz zaporę.`,`On the server, allow SSH (port ${C(P+'/tcp')}) <b>only from the workstation</b> ${C(ws)} and enable the firewall.`),
    setup:()=>simNew(),ph:'sudo ufw allow from …',
    model:[`sudo ufw allow from ${ws} to any port ${P} proto tcp`,'sudo ufw enable'],
    why:[$t('Pełna składnia reguły: skąd (<code>from</code>), dokąd (<code>to any</code>, czyli ten serwer), port i protokół.','The full rule syntax: from where (<code>from</code>), to where (<code>to any</code>, meaning this server), port and protocol.'),$t('Włączamy zaporę.','Enable the firewall.')],
    inspect:['sudo ufw status'],look:$t(`W kolumnie From jest ${ws}.`,`The From column shows ${ws}.`),
    verify:S=>[chk(hasIn(S,ws),`Brakuje reguły allow from ${ws} na port ${P}.`,`The rule allowing ${ws} on port ${P} is missing.`),chk(S.ufw.on,'Zapora nie jest włączona.','The firewall is not enabled.')],
    hint:$t('sudo ufw allow from ADRES to any port PORT proto tcp','sudo ufw allow from ADDRESS to any port PORT proto tcp')
  });
  return cmdTask({
    q:$t(`Na stacji roboczej zezwól na ruch <b>wychodzący</b> do serwera ${C(srv)} na port ${C(P+'/tcp')} i włącz zaporę.`,`On the workstation, allow <b>outgoing</b> traffic to the server ${C(srv)} on port ${C(P+'/tcp')} and enable the firewall.`),
    setup:()=>simNew(),ph:'sudo ufw allow out …',
    model:[`sudo ufw allow out to ${srv} port ${P} proto tcp`,'sudo ufw enable'],
    why:[$t('<code>out</code> to reguła dla ruchu wychodzącego. Domyślnie UFW i tak przepuszcza ruch wychodzący, ale przy polityce „deny outgoing” ta reguła jest potrzebna. Krócej: <code>sudo ufw allow out '+P+'/tcp</code>.','<code>out</code> is a rule for outgoing traffic. By default UFW allows outgoing traffic anyway, but with a “deny outgoing” policy this rule is needed. Shorter: <code>sudo ufw allow out '+P+'/tcp</code>.'),$t('Włączamy zaporę.','Enable the firewall.')],
    inspect:['sudo ufw status'],look:$t('Reguła z akcją ALLOW OUT.','A rule with the action ALLOW OUT.'),
    verify:S=>[chk(S.ufw.rules.some(R=>R.act==='allow'&&R.dir==='out'&&R.port===String(P)&&R.proto!=='udp'&&(R.to==='any'||R.to===srv)),`Brakuje reguły allow out na port ${P}.`,`The allow out rule for port ${P} is missing.`),chk(S.ufw.on,'Zapora nie jest włączona.','The firewall is not enabled.')],
    hint:$t('sudo ufw allow out to ADRES port PORT proto tcp','sudo ufw allow out to ADDRESS port PORT proto tcp')
  });
}

// ---------- rejestr ----------
const SO_TOPICS=[
  {id:'so-users',sec:'Użytkownicy i grupy',name:'Tworzenie i grupy',en:'Creating users and groups',gen:soUsers},
  {id:'so-users-q',sec:'Użytkownicy i grupy',name:'Pytania',en:'Questions',gen:()=>pick(SO_USERS_Q)()},
  {id:'so-chmod',sec:'Prawa dostępu',name:'chmod i chgrp',en:'chmod and chgrp',gen:soChmod},
  {id:'so-perm-q',sec:'Prawa dostępu',name:'Zapis rwx i ósemkowy',en:'rwx and octal notation',gen:soPermQ},
  {id:'so-acl',sec:'ACL',name:'setfacl',en:'setfacl',gen:soAcl},
  {id:'so-acl-q',sec:'ACL',name:'Maska i getfacl',en:'Mask and getfacl',gen:soAclQ},
  {id:'so-grep',sec:'grep',name:'Filtrowanie miasta.txt',en:'Filtering miasta.txt',gen:soGrep},
  {id:'so-grep-q',sec:'grep',name:'Wyrażenia regularne',en:'Regular expressions',gen:soGrepQ},
  {id:'so-net',sec:'Sieć i SSH',name:'Statyczny adres (netplan)',en:'Static address (netplan)',gen:soNetplan},
  {id:'so-ssh',sec:'Sieć i SSH',name:'SSH: port i klucze',en:'SSH: port and keys',gen:soSsh},
  {id:'so-ufw',sec:'Sieć i SSH',name:'Zapora UFW',en:'UFW firewall',gen:soUfw},
];
addSubject({
  id:'so',name:'Systemy operacyjne',en:'Operating systems',topics:SO_TOPICS,start:'so-acl',prKey:'kratka-so-postep-v1',
  secEn:{'Użytkownicy i grupy':'Users and groups','Prawa dostępu':'Permissions','ACL':'ACL','grep':'grep','Sieć i SSH':'Network and SSH'},
  sheet:{name:'Ściąga',en:'Cheat sheet'},
  tools:[{id:'terminal',name:'Terminal',en:'Terminal'}]
});
