// Testy systemów operacyjnych (symulator i zadania):  node tests/so.test.js
const E=require('./load')(['SO_TOPICS','ansCheck','ansHtml','ansShow','inpShow','LANG','simNew','simRun','simScript','soBase','KINDS','SUBJECTS','MIASTA']);
let fails=0,checks=0;const ok=(c,m)=>{checks++;if(!c){fails++;if(fails<30)console.log('✗',m)}};
const run=(S,l)=>E.simRun(S,l);
const out=(S,l)=>run(S,l).filter(x=>x.t==='out').map(x=>x.s);
const err=(S,l)=>run(S,l).filter(x=>x.t==='err').map(x=>x.s).join('\n');
// --- symulator: zadania z kolokwium ---
{const S=E.soBase();
  ok(/Permission denied/.test(err(S,'useradd kolokwium')),'useradd bez sudo nie zgłasza błędu');
  ok(!err(S,'sudo useradd -m kolokwium')&&S.users.kolokwium&&S.fs['/home/kolokwium'],'useradd -m');
  run(S,'sudo groupadd students');run(S,'sudo usermod -aG students kolokwium');
  ok(out(S,'id kolokwium')[0]==='uid=1002(kolokwium) gid=1002(kolokwium) groups=1002(kolokwium),1003(students)','id: '+out(S,'id kolokwium')[0]);
  ok(out(S,'getent group students')[0]==='students:x:1003:kolokwium','getent group');
  run(S,'mkdir zaliczamkolo');run(S,'chmod g=r zaliczamkolo');ok(out(S,'ls -ld zaliczamkolo')[0].startsWith('drwxr--r-x 2 student student'),'chmod g=r: '+out(S,'ls -ld zaliczamkolo')[0]);
  run(S,'setfacl -d -m u:kolokwium:rwx projekty_shared');const fa=out(S,'getfacl projekty_shared').join('\n');
  ok(fa.includes('default:user:kolokwium:rwx')&&fa.includes('default:mask::rwx')&&fa.includes('default:other::r-x'),'domyślne ACL:\n'+fa);
  run(S,'mkdir projekty_shared/nowy');ok(out(S,'getfacl projekty_shared/nowy').includes('user:kolokwium:rwx'),'dziedziczenie domyślnego ACL');
  run(S,'touch projekty_shared/plik');const pf=out(S,'getfacl projekty_shared/plik').join('\n');ok(pf.includes('user:kolokwium:rwx\t\t\t#effective:rw-')&&pf.includes('mask::rw-'),'plik dziedziczy ACL z maską rw-:\n'+pf);
  run(S,'setfacl -m g:students:rw- config');ok(out(S,'getfacl config').includes('group:students:rw-'),'ACL dla grupy');
  run(S,'setfacl -d -m o::r public');ok(out(S,'getfacl public').includes('default:other::r--'),'domyślne other');
  run(S,'setfacl -m u:adam:rwx serwer.cfg');run(S,'setfacl -m m::r-x serwer.cfg');
  ok(out(S,'getfacl serwer.cfg').includes('user:adam:rwx\t\t\t#effective:r-x'),'maska i #effective');
  ok(out(S,'ls -l serwer.cfg')[0].startsWith('-rw-r-xr--+'),'ls -l pokazuje maskę i +: '+out(S,'ls -l serwer.cfg')[0]);
  run(S,'setfacl -m u:kolokwium:r serwer.cfg');ok(S.fs['/home/student/serwer.cfg'].acl.mask===7,'maska nie została przeliczona po -m');
  run(S,'setfacl -n -m m::r serwer.cfg');run(S,'setfacl -n -m u:kolokwium:rw serwer.cfg');ok(S.fs['/home/student/serwer.cfg'].acl.mask===4,'-n przeliczyło maskę');
  ok(/Invalid argument/.test(err(S,'setfacl -m u:nikt:rwx config')),'nieistniejący użytkownik w ACL');
  ok(/Operation not permitted/.test(err(S,'sudo touch /tmp/x; setfacl -m u:adam:r /tmp/x')),'setfacl na cudzym pliku');
  run(S,'setfacl -b config');ok(!S.fs['/home/student/config'].acl.mask&&!Object.keys(S.fs['/home/student/config'].acl.g).length,'setfacl -b');
}
{const S=E.soBase({users:[{name:'anna',groups:['dev']}],groups:['web']});run(S,'sudo usermod -G web anna');ok(!out(S,'groups anna')[0].includes('dev'),'usermod -G bez -a zostawił starą grupę');}
// --- grep ---
{const S=E.simNew(),M=E.MIASTA;
  const eq=(cmd,exp)=>{const o=out(S,cmd);ok(JSON.stringify(o)===JSON.stringify(exp),cmd+' → '+o.slice(0,6).join(', '))};
  eq("grep '^G' miasta.txt",M.filter(m=>m.startsWith('G')));
  eq("grep -E '^.{6}$' miasta.txt",M.filter(m=>[...m].length===6));
  eq("grep '^......$' miasta.txt",M.filter(m=>[...m].length===6));
  eq("grep '^.\\{6\\}$' miasta.txt",M.filter(m=>[...m].length===6));
  eq("grep '^[KL]' miasta.txt",M.filter(m=>/^[KL]/.test(m)));
  eq("grep -E '^(K|L)' miasta.txt",M.filter(m=>/^[KL]/.test(m)));
  eq("grep 'ów$' miasta.txt",M.filter(m=>m.endsWith('ów')));
  eq("grep -v '^S' miasta.txt",M.filter(m=>!m.startsWith('S')));
  eq("grep '^[^S]' miasta.txt",M.filter(m=>!m.startsWith('S')));
  eq("grep -c '^S' miasta.txt",[String(M.filter(m=>m.startsWith('S')).length)]);
  eq("grep '^S' miasta.txt | wc -l",[String(M.filter(m=>m.startsWith('S')).length)]);
  eq("cat miasta.txt | grep -i 'GÓRA'",M.filter(m=>/góra/i.test(m)));
  eq("grep -w 'Góra' miasta.txt",M.filter(m=>/Góra/.test(m)));
  eq("grep -x 'Łódź' miasta.txt",['Łódź']);
  eq("awk 'length($0)==6' miasta.txt",M.filter(m=>[...m].length===6));
  eq("grep \"ów$\" miasta.txt",M.filter(m=>m.endsWith('ów')));
  ok(out(S,"grep '^.{6}$' miasta.txt").length===0,'BRE {6} bez -E nie powinno nic znaleźć');
  ok(/Unmatched/.test(err(S,"grep '[abc' miasta.txt")),'błąd niedomkniętego nawiasu');
  ok(/syntax error/.test(err(S,'grep | ')),'błąd składni potoku');
  ok(/command not found/.test(err(S,'grap x')),'nieznane polecenie');
}
// --- ufw ---
{const S=E.simNew();ok(/root/.test(err(S,'ufw enable')),'ufw bez sudo');run(S,'sudo ufw allow 997/tcp');run(S,'sudo ufw allow out 997/tcp');run(S,'sudo ufw enable');const st=out(S,'sudo ufw status').join('\n');ok(/Status: active/.test(st)&&/997\/tcp\s+ALLOW OUT/.test(st)&&/997\/tcp\s+ALLOW\s+Anywhere/.test(st),'ufw status:\n'+st)}
// --- tematy: wzorcowe odpowiedzi przechodzą, puste i złe nie ---
function good(a){
  if(a.kind==='cmd')return [a.model.join('\n')];
  if(a.kind==='choice')return a.opts.map((_,k)=>a.ok.includes(k));
  if(a.kind==='fill')return a.tpl.filter(x=>typeof x!=='string').map(b=>b.acc[0]);
}
function bad(a){
  if(a.kind==='cmd')return ['ls'];
  if(a.kind==='choice')return a.opts.map((_,k)=>!a.ok.includes(k));
  if(a.kind==='fill')return a.tpl.filter(x=>typeof x!=='string').map(()=>'xyz');
}
const plain=h=>String(h).replace(new RegExp(E.MIASTA.join('|'),'g'),'').replace(/(^|[\s(])[ŚŁŻ](?=[\s,.)]|$)/g,'$1').replace(/<pre[\s\S]*?<\/pre>/g,'').replace(/<code>[\s\S]*?<\/code>/g,'').replace(/<[^>]+>/g,'');
const kinds={};
for(const lang of ['pl','en']){E.LANG.cur=lang;
  for(const t of E.SO_TOPICS){
    for(let i=0;i<30;i++){
      const T=t.gen(),a=T.ans,tag=`${t.id} ${lang}#${i}`;kinds[a.kind]=(kinds[a.kind]||0)+1;
      ok(T.q&&T.sol,tag+': brak treści');
      const html=T.q+T.body+T.sol+E.ansHtml(a,'x')+E.ansShow(a)+(T.hint||'');
      ok(!/undefined|NaN|\[object/.test(html),tag+': undefined w HTML');
      const r=E.ansCheck(a,good(a));ok(r.score===1,`${tag}: wzorcowa odpowiedź ma ${r.score} (${r.msg})`);
      ok(E.ansCheck(a,bad(a)).score<1,tag+': zła odpowiedź zaliczona');
      const em=a.kind==='choice'?a.opts.map(()=>false):a.kind==='fill'?a.tpl.filter(x=>typeof x!=='string').map(()=>''):[''];
      ok(E.ansCheck(a,em).empty,tag+': pusta odpowiedź nie jest pusta');
      ok(E.inpShow(a,good(a)).length>0,tag+': brak podglądu odpowiedzi');
      if(T.fr&&i<4){const fr=T.fr();ok(fr.length>0&&fr.every(f=>f.t&&f.S),tag+': klatki');}
      if(lang==='en'){const p=plain(html),m=p.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);ok(!m,`${tag}: polski tekst w EN: …${m?p.slice(Math.max(0,m.index-40),m.index+20):''}…`)}
    }
  }
}
ok(kinds.cmd>50&&kinds.choice>20&&kinds.fill>20,'za mało zadań któregoś rodzaju '+JSON.stringify(kinds));
// alternatywne poprawne rozwiązania też przechodzą
E.LANG.cur='pl';
{const T=E.SO_TOPICS.find(t=>t.id==='so-grep');let n=0;for(let i=0;i<60&&n<15;i++){const x=T.gen();const m=x.ans.model[0];let alt=null;
  if(/^grep '\^\[(\w)(\w)\]'/.test(m)){const q=m.match(/^grep '\^\[(\w)(\w)\]'/);alt=`grep -E '^(${q[1]}|${q[2]})' miasta.txt`}
  else if(/^grep -c/.test(m))alt=m.replace('grep -c','grep')+' | wc -l';
  else if(/^grep -v '\^(\w)'/.test(m))alt=m.replace(/^grep -v '\^(\w)'/,"grep '^[^$1]'");
  else if(/^grep -E '\^\.\{(\d)\}\$'/.test(m))alt=`grep '^${'.'.repeat(+m.match(/\{(\d)\}/)[1])}$' miasta.txt`;
  if(alt){n++;ok(E.ansCheck(x.ans,[alt]).score===1,'alternatywa nie przechodzi: '+alt)}}}
{const T=E.SO_TOPICS.find(t=>t.id==='so-acl');for(let i=0;i<40;i++){const x=T.gen(),m=x.ans.model;if(m.length===1&&/^setfacl -d -m u:/.test(m[0])){ok(E.ansCheck(x.ans,[m[0].replace('-d -m u:','-m d:u:')]).score===1,'setfacl -m d:u: nie przechodzi');ok(E.ansCheck(x.ans,['sudo '+m[0].replace('-d -m','-dm')]).score===1,'sudo setfacl -dm nie przechodzi');ok(E.ansCheck(x.ans,[m[0].replace('-d ','')]).score<1,'ACL bez -d zaliczone')}
  if(m.length===2&&/m::r-x/.test(m[1]))ok(E.ansCheck(x.ans,[m[1]+'\n'+m[0]]).score<1,'odwrotna kolejność z maską zaliczona');}}
ok(E.SUBJECTS.some(s=>s.id==='so'),'SO nie ma w rejestrze');
console.log(`${checks} sprawdzeń, błędów: ${fails}`);process.exit(fails?1:0);
