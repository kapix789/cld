const MIASTA=`Warszawa
Kraków
Wrocław
Łódź
Poznań
Gdańsk
Szczecin
Bydgoszcz
Lublin
Białystok
Katowice
Gdynia
Częstochowa
Radom
Rzeszów
Toruń
Sosnowiec
Kielce
Gliwice
Olsztyn
Zabrze
Bielsko-Biała
Bytom
Zielona Góra
Rybnik
Opole
Tychy
Gorzów Wielkopolski
Elbląg
Płock
Wałbrzych
Włocławek
Tarnów
Chorzów
Koszalin
Kalisz
Legnica
Grudziądz
Jaworzno
Słupsk
Jastrzębie-Zdrój
Nowy Sącz
Jelenia Góra
Siedlce
Konin
Piła
Piotrków Trybunalski
Inowrocław
Lubin
Ostrów Wielkopolski
Suwałki
Stargard
Gniezno
Głogów
Pabianice
Leszno
Żory
Zamość
Łomża
Ełk
Tomaszów Mazowiecki
Chełm
Mielec
Przemyśl
Stalowa Wola
Bełchatów
Świdnica
Racibórz
Ostrołęka
Starachowice
Skierniewice
Puławy
Krosno
Kołobrzeg
Zakopane
Sopot
Żyrardów
Świnoujście
Malbork
Sandomierz
Kutno
Gniew`.split('\n');

class ShErr extends Error{}
const permStr=p=>(p&4?'r':'-')+(p&2?'w':'-')+(p&1?'x':'-');
const clone=o=>JSON.parse(JSON.stringify(o));

function simNew(o={}){
  const S={me:'student',rootShell:false,cwd:'/home/student',users:{},groups:{},fs:{},ufw:{on:false,rules:[]},nextUid:1001,nextGid:1001,hints:[]};
  const g=(n,gid)=>{S.groups[n]={gid,members:[]}};
  g('root',0);g('sudo',27);g('users',100);g('student',1000);
  S.users.root={uid:0,group:'root',home:'/root',shell:'/bin/bash'};
  S.users.student={uid:1000,group:'student',home:'/home/student',shell:'/bin/bash'};
  S.groups.sudo.members.push('student');
  const d=(p,ow,gr,m)=>fsMake(S,p,'d',ow,gr,m);
  d('/','root','root',0o755);d('/etc','root','root',0o755);d('/home','root','root',0o755);d('/root','root','root',0o700);d('/tmp','root','root',0o777);
  d('/home/student','student','student',0o750);
  fsMake(S,'/home/student/miasta.txt','f','student','student',0o664,MIASTA.join('\n')+'\n');
  (o.groups||[]).forEach(n=>addGroup(S,n));
  (o.users||[]).forEach(u=>{const x=typeof u==='string'?{name:u}:u;addUser(S,x.name,{home:true});(x.groups||[]).forEach(gr=>{if(!S.groups[gr])addGroup(S,gr);S.groups[gr].members.push(x.name)})});
  (o.dirs||[]).forEach(x=>{const y=typeof x==='string'?{name:x}:x;fsMake(S,'/home/student/'+y.name,'d',y.owner||'student',y.group||'student',y.mode??0o775)});
  (o.files||[]).forEach(x=>{const y=typeof x==='string'?{name:x}:x;fsMake(S,'/home/student/'+y.name,'f',y.owner||'student',y.group||'student',y.mode??0o664,y.text||'')});
  return S;
}
function addGroup(S,n){const gid=S.nextGid;while(Object.values(S.groups).some(x=>x.gid===S.nextGid))S.nextGid++;S.groups[n]={gid:S.nextGid++,members:[]};return S.groups[n]}
function addUser(S,n,o={}){
  while(Object.values(S.users).some(x=>x.uid===S.nextUid))S.nextUid++;
  const uid=S.nextUid++;let group=o.group;
  if(!group){group=n;if(!S.groups[n]){S.groups[n]={gid:uid,members:[]};if(S.nextGid<=uid)S.nextGid=uid+1}}
  S.users[n]={uid,group,home:'/home/'+n,shell:o.shell||'/bin/sh'};
  if(o.home&&!S.fs['/home/'+n])fsMake(S,'/home/'+n,'d',n,group,0o750);
  return S.users[n];
}
const inGroup=(S,u,g)=>!!(S.users[u]&&(S.users[u].group===g||(S.groups[g]&&S.groups[g].members.includes(u))));
const groupsOf=(S,u)=>{const U=S.users[u];return [U.group,...Object.keys(S.groups).filter(g=>g!==U.group&&S.groups[g].members.includes(u)).sort((a,b)=>S.groups[a].gid-S.groups[b].gid)]};

function fsMake(S,path,type,owner,group,mode,text){
  const n={type,owner,group,acl:{uobj:mode>>6&7,gobj:mode>>3&7,o:mode&7,mask:null,u:{},g:{}},dacl:null};
  if(type==='f')n.text=text||'';
  const par=S.fs[pParent(path)];
  if(par&&par.dacl&&path!=='/'){
    const D=par.dacl,cm=type==='d'?0o777:0o666;
    n.acl={uobj:D.uobj&(cm>>6&7),gobj:D.gobj,o:D.o&(cm&7),mask:null,u:{...D.u},g:{...D.g}};
    if(D.mask!=null)n.acl.mask=D.mask&(cm>>3&7);else n.acl.gobj=D.gobj&(cm>>3&7);
    if(type==='d')n.dacl=clone(D);
  }
  S.fs[path]=n;return n;
}
const modeOf=n=>(n.acl.uobj<<6)|((n.acl.mask??n.acl.gobj)<<3)|n.acl.o;
function setMode(n,m){n.acl.uobj=m>>6&7;if(n.acl.mask!=null)n.acl.mask=m>>3&7;else n.acl.gobj=m>>3&7;n.acl.o=m&7}
const isExt=n=>n.acl.mask!=null||Object.keys(n.acl.u).length>0||Object.keys(n.acl.g).length>0||!!n.dacl;
const pParent=p=>p.replace(/\/[^/]+$/,'')||'/';
const pBase=p=>p==='/'?'/':p.split('/').pop();
function pAbs(S,p){
  const home=S.users[S.rootShell?'root':S.me].home;
  if(p==='~'||p.startsWith('~/'))p=home+p.slice(1);
  const st=[];for(const x of (p.startsWith('/')?p:S.cwd+'/'+p).split('/')){if(!x||x==='.')continue;if(x==='..')st.pop();else st.push(x)}
  return '/'+st.join('/');
}
function fileText(S,path){
  if(path==='/etc/passwd')return Object.entries(S.users).map(([n,u])=>`${n}:x:${u.uid}:${S.groups[u.group]?S.groups[u.group].gid:u.uid}::${u.home}:${u.shell}`).join('\n')+'\n';
  if(path==='/etc/group')return Object.entries(S.groups).map(([n,g])=>`${n}:x:${g.gid}:${g.members.join(',')}`).join('\n')+'\n';
  const n=S.fs[path];return n&&n.type==='f'?n.text:null;
}
const fileExists=(S,p)=>!!S.fs[p]||p==='/etc/passwd'||p==='/etc/group';
function access(S,u,n,bit){
  if(u==='root')return true;
  const A=n.acl,mk=p=>A.mask!=null?p&A.mask:p;
  if(n.owner===u)return !!(A.uobj&bit);
  if(A.u[u]!==undefined)return !!(mk(A.u[u])&bit);
  let grp=false,any=false;
  if(inGroup(S,u,n.group)){grp=true;if(mk(A.gobj)&bit)any=true}
  for(const [g,p] of Object.entries(A.g))if(inGroup(S,u,g)){grp=true;if(mk(p)&bit)any=true}
  if(grp)return any;
  return !!(A.o&bit);
}
function groupPerm(n,g){const A=n.acl,mk=p=>A.mask!=null?p&A.mask:p;if(A.g[g]!==undefined)return mk(A.g[g]);if(n.group===g)return mk(A.gobj);return null}
function userPerm(n,u){const A=n.acl;if(A.u[u]===undefined)return null;return A.mask!=null?A.u[u]&A.mask:A.u[u]}

function shLex(line){
  const toks=[];let cur=null,i=0;const s=line;
  const word=()=>cur||(cur={t:'w',v:'',q:false,tilde:false});
  const push=()=>{if(cur){toks.push(cur);cur=null}};
  while(i<s.length){
    const c=s[i];
    if(c==='\\'&&i+1<s.length){word().v+=s[i+1];cur.q=true;i+=2;continue}
    if(c==="'"){const j=s.indexOf("'",i+1);if(j<0)throw new ShErr("unexpected EOF while looking for matching `''");word().v+=s.slice(i+1,j);cur.q=true;i=j+1;continue}
    if(c==='"'){let j=i+1,v='';while(j<s.length&&s[j]!=='"'){if(s[j]==='\\'&&'"\\$`'.includes(s[j+1])){v+=s[j+1];j+=2}else v+=s[j++]}if(j>=s.length)throw new ShErr('unexpected EOF while looking for matching `"\'');word().v+=v;cur.q=true;i=j+1;continue}
    if(/\s/.test(c)){push();i++;continue}
    if(c==='#'&&!cur)break;
    if('|;&<>'.includes(c)){
      push();const two=s.slice(i,i+2);
      if(two==='&&'||two==='||'){toks.push({t:'op',v:two});i+=2;continue}
      if(c==='|'||c===';'){toks.push({t:'op',v:c});i++;continue}
      throw new ShErr(c==='&'?'BG':'REDIR');
    }
    if(c==='~'&&!cur){word().tilde=true}
    word().v+=c;i++;
  }
  push();return toks;
}
function simRun(S,line){
  const res=[];let toks;
  try{toks=shLex(line)}catch(e){
    if(e.message==='REDIR')return [{t:'err',s:$t('(przekierowania < i > nie są obsługiwane w symulatorze)','(redirections < and > are not supported by the simulator)')}];
    if(e.message==='BG')return [{t:'err',s:$t('(uruchamianie w tle przez & nie jest obsługiwane)','(running in the background with & is not supported)')}];
    return [{t:'err',s:'bash: '+e.message}];
  }
  if(!toks.length)return res;
  const seq=[];let pipe=[],argv=[];
  for(const tk of toks){
    if(tk.t==='w'){argv.push(tk);continue}
    if(!argv.length)return [{t:'err',s:`bash: syntax error near unexpected token \`${tk.v}'`}];
    pipe.push(argv);argv=[];
    if(tk.v!=='|'){seq.push({pipe,op:tk.v});pipe=[]}
  }
  if(argv.length){pipe.push(argv);seq.push({pipe,op:null})}else if(pipe.length)return [{t:'err',s:"bash: syntax error near unexpected token `newline'"}];
  let last=0;
  for(let k=0;k<seq.length;k++){
    const prev=k?seq[k-1].op:null;
    if(prev==='&&'&&last!==0)continue;
    if(prev==='||'&&last===0)continue;
    let input=null;
    for(const av of seq[k].pipe){const r=runOne(S,av,input);r.err.forEach(s=>res.push({t:'err',s}));input=r.out;last=r.code}
    (input||[]).forEach(s=>res.push({t:'out',s}));
  }
  return res;
}
function simScript(S,text){
  const tr=[];
  for(const raw of String(text).split('\n')){
    const line=raw.replace(/^\s*\$\s+/,'').trimEnd();if(!line.trim())continue;
    tr.push({t:'cmd',s:line,prompt:simPrompt(S)});
    const r=simRun(S,line);r.forEach(x=>tr.push(x));
    tr.push({t:'end',out:r.filter(x=>x.t==='out').map(x=>x.s)});
  }
  return tr;
}
function simPrompt(S){const u=S.rootShell?'root':S.me,h=S.users[u].home;const c=S.cwd===h?'~':S.cwd.startsWith(h+'/')?'~'+S.cwd.slice(h.length):S.cwd;return `${u}@ubuntu:${c}${u==='root'?'#':'$'}`}
function runOne(S,av,input){
  const r={out:[],err:[],code:0};
  let args=av.map(t=>t.tilde&&!t.q?pAbs(S,t.v):t.v),quoted=av.map(t=>t.q);
  let root=S.rootShell;
  if(args[0]==='sudo'){
    args.shift();quoted.shift();root=true;
    while(args[0]&&args[0].startsWith('-')&&!['-i','-s'].includes(args[0])){args.shift();quoted.shift()}
    if(args[0]==='-i'||args[0]==='-s'||(args[0]==='su'&&args.length<=2)){S.rootShell=true;S.cwd=args[0]==='-s'?S.cwd:'/root';return r}
    if(!args.length){r.err.push('usage: sudo command');r.code=1;return r}
  }
  const name=args[0],fn=SH[name];
  if(!fn){r.err.push(`${name}: command not found`);r.code=127;if(/^(nano|vim?|vi|gedit|mcedit)$/.test(name))r.err.push($t('(edytory nie działają w symulatorze; tu wpisuje się polecenia)','(editors do not work in the simulator; type commands here)'));return r}
  const c={S,name,args:args.slice(1),quoted:quoted.slice(1),input,root,user:root?'root':S.me,out:r.out,err:r.err,code:0,
    fail(msg,code=1){if(msg)r.err.push(msg);this.code=code;return this},
    hint(pl,en){S.hints.push({pl,en})}};
  try{fn(c)}catch(e){if(e instanceof ShErr){c.err.push(e.message);c.code=1}else throw e}
  r.code=c.code;return r;
}
function opts(c,withArg=''){
  const f={},rest=[];let stop=false;
  for(let i=0;i<c.args.length;i++){
    const x=c.args[i];
    if(!stop&&x==='--'){stop=true;continue}
    if(!stop&&x.startsWith('-')&&x.length>1&&!/^-\d+$/.test(x)){
      if(x.startsWith('--')){const [k,v]=x.slice(2).split('=');f[k]=v??true;continue}
      for(let j=1;j<x.length;j++){const ch=x[j];if(withArg.includes(ch)){f[ch]=x.slice(j+1)||c.args[++i];if(f[ch]===undefined)throw new ShErr(`${c.name}: option requires an argument -- '${ch}'`);break}f[ch]=true}
      continue;
    }
    rest.push(x);
  }
  return {f,rest};
}
const needRoot=(c,msg)=>{if(c.root)return false;c.fail(msg||`${c.name}: Permission denied.`);c.hint('Polecenia zmieniające użytkowników, grupy i ustawienia systemu wymagają uprawnień administratora: dopisz sudo na początku.','Commands that change users, groups and system settings need administrator rights: put sudo in front.');return true};
const exists=(c,p,cmd)=>{const a=pAbs(c.S,p);if(!c.S.fs[a]){c.fail(`${cmd||c.name}: cannot access '${p}': No such file or directory`);return null}return a};
const owns=(c,n)=>c.root||n.owner===c.user;

const POSIX_CL={alpha:'\\p{L}',upper:'\\p{Lu}',lower:'\\p{Ll}',digit:'0-9',alnum:'\\p{L}\\p{N}',space:'\\s',punct:'\\p{P}\\p{S}',blank:' \\t',xdigit:'0-9A-Fa-f'};
const W_CH='[\\p{L}\\p{N}_]';
function posixRe(pat,ere){
  let o='',i=0;const n=pat.length;
  while(i<n){
    const c=pat[i];
    if(c==='['){
      let j=i+1,cl='[';if(pat[j]==='^'){cl+='^';j++}
      if(pat[j]===']'){cl+='\\]';j++}
      while(j<n&&pat[j]!==']'){
        if(pat[j]==='['&&pat[j+1]===':'){const m=pat.slice(j).match(/^\[:([a-z]+):\]/);if(!m||!POSIX_CL[m[1]])throw new ShErr('grep: character class syntax is [[:space:]], not [:space:]');cl+=POSIX_CL[m[1]];j+=m[0].length;continue}
        const ch=pat[j];cl+=(ch==='\\'||ch==='['||ch==='/')?'\\'+ch:ch;j++;
      }
      if(j>=n)throw new ShErr('grep: Unmatched [, [^, [:, [., or [=');
      o+=cl+']';i=j+1;continue;
    }
    if(c==='\\'){
      const d=pat[i+1];if(d===undefined)throw new ShErr('grep: Trailing backslash');
      if(!ere&&'(){}|+?'.includes(d)){o+=d;i+=2;continue}
      if(d==='<'){o+=`(?<!${W_CH})(?=${W_CH})`;i+=2;continue}
      if(d==='>'){o+=`(?<=${W_CH})(?!${W_CH})`;i+=2;continue}
      if(d==='w'){o+=W_CH;i+=2;continue}
      if(d==='W'){o+='[^\\p{L}\\p{N}_]';i+=2;continue}
      if(d==='b'){o+=`(?:(?<=${W_CH})(?!${W_CH})|(?<!${W_CH})(?=${W_CH}))`;i+=2;continue}
      if(/[0-9]/.test(d)){o+='\\'+d;i+=2;continue}
      o+=/[\\^$.*+?()[\]{}|\/-]/.test(d)?'\\'+d:d;i+=2;continue;
    }
    if(!ere&&'(){}|+?'.includes(c)){o+='\\'+c;i++;continue}
    if(c==='*'&&(o===''||o.endsWith('^')||o.endsWith('(')||o.endsWith('|'))){o+='\\*';i++;continue}
    if(c==='/'||c==='-'){o+='\\'+c;i++;continue}
    if(c==='^'&&o!==''&&!o.endsWith('(')&&!o.endsWith('|')&&!ere){o+='\\^';i++;continue}
    o+=c;i++;
  }
  return o;
}
function grepRe(pats,o){
  const src=pats.map(p=>o.fixed?p.replace(/[.*+?^${}()|[\]\\\/-]/g,'\\$&'):posixRe(p,o.ere));
  let body=src.map(s=>`(?:${s})`).join('|');
  if(o.word)body=`(?<!${W_CH})(?:${body})(?!${W_CH})`;
  if(o.line)body=`^(?:${body})$`;
  try{return new RegExp(body,'u'+(o.ic?'i':''))}catch(e){
    if(/quantifier|Nothing to repeat/i.test(e.message))throw new ShErr('grep: Invalid preceding regular expression');
    if(/parenthes|group/i.test(e.message))throw new ShErr('grep: Unmatched ( or \\(');
    throw new ShErr('grep: Invalid regular expression');
  }
}
function inputLines(c,files,cmd){
  if(!files.length){
    if(c.input)return [{name:'',lines:c.input}];
    c.fail(`${cmd}: ${$t('(czeka na dane z klawiatury; podaj plik, np. miasta.txt)','(waiting for keyboard input; give a file, e.g. miasta.txt)')}`);return null;
  }
  const res=[];
  for(const f of files){
    const p=pAbs(c.S,f),t=fileText(c.S,p);
    if(t===null){c.fail(c.S.fs[p]?`${cmd}: ${f}: Is a directory`:`${cmd}: ${f}: No such file or directory`,2);continue}
    const n=c.S.fs[p];if(n&&!access(c.S,c.user,n,4)){c.fail(`${cmd}: ${f}: Permission denied`,2);continue}
    res.push({name:f,lines:t.replace(/\n$/,'').split('\n').filter((x,k,a)=>!(x===''&&k===a.length-1))});
  }
  return res;
}

function ufwRule(c,a){
  const act=a.shift(),R={act,dir:'in',port:null,proto:null,from:'any',to:'any'};
  if(a[0]==='in'||a[0]==='out')R.dir=a.shift();
  const svc={ssh:['22','tcp'],http:['80','tcp'],https:['443','tcp']};
  if(a.length===1&&!['from','to','proto'].includes(a[0])){
    const m=a[0].match(/^(\d+)(?:\/(tcp|udp))?$/);
    if(m){R.port=m[1];R.proto=m[2]||null;return R}
    const s=svc[a[0]]||svc[a[0].toLowerCase()];if(s){R.port=s[0];R.proto=s[1];R.app=a[0];return R}
    throw new ShErr(`ERROR: Could not find a profile matching '${a[0]}'`);
  }
  while(a.length){
    const k=a.shift(),v=a.shift();
    if(v===undefined)throw new ShErr('ERROR: Wrong number of arguments');
    if(k==='from')R.from=v;else if(k==='to')R.to=v;else if(k==='port')R.port=v;else if(k==='proto')R.proto=v;else if(k==='on'){}else throw new ShErr('ERROR: Invalid syntax');
  }
  return R;
}
const ufwShow=R=>{const p=R.port?R.port+(R.proto?'/'+R.proto:''):'Anywhere',to=R.to==='any'?p:R.to+(R.port?' '+p:'');return [R.dir==='out'?(R.to==='any'?p:to):to,(R.act.toUpperCase()+(R.dir==='out'?' OUT':'')).padEnd(11),R.from==='any'?'Anywhere':R.from]};

const SH={
  help(c){c.out.push($t('Obsługiwane polecenia:','Supported commands:'),Object.keys(SH).filter(k=>k!=='help').sort().join(' '),$t('Potoki (|), ; && ||, sudo, apostrofy i cudzysłowy działają jak w bash.','Pipes (|), ; && ||, sudo, single and double quotes work as in bash.'))},
  clear(c){c.out.push('\f')},
  whoami(c){c.out.push(c.user)},
  pwd(c){c.out.push(c.S.cwd)},
  echo(c){c.out.push(c.args.join(' '))},
  exit(c){if(c.S.rootShell){c.S.rootShell=false;c.S.cwd=c.S.users[c.S.me].home}else c.out.push('logout')},
  su(c){if(!c.root)return c.fail('Password: \nsu: Authentication failure');c.S.rootShell=true;c.S.cwd='/root'},
  cd(c){
    const t=c.args[0]||'~',p=pAbs(c.S,t),n=c.S.fs[p];
    if(!n)return c.fail(`bash: cd: ${t}: No such file or directory`);
    if(n.type!=='d')return c.fail(`bash: cd: ${t}: Not a directory`);
    if(!access(c.S,c.user,n,1))return c.fail(`bash: cd: ${t}: Permission denied`);
    c.S.cwd=p;
  },
  ls(c){
    const {f,rest}=opts(c),S=c.S,long=f.l,showDir=f.d,all=f.a||f.A;
    const line=(name,n)=>({perm:(n.type==='d'?'d':'-')+permStr(n.acl.uobj)+permStr(n.acl.mask??n.acl.gobj)+permStr(n.acl.o)+(isExt(n)?'+':''),links:n.type==='d'?2:1,owner:n.owner,group:n.group,size:n.type==='d'?4096:new TextEncoder().encode(n.text||'').length,name});
    const fmt=rows=>{const w=k=>Math.max(...rows.map(r=>String(r[k]).length));const wl=w('links'),wo=w('owner'),wg=w('group'),ws=w('size');
      return rows.map(r=>`${r.perm.padEnd(rows.some(x=>x.perm.length>10)?11:10)} ${String(r.links).padStart(wl)} ${r.owner.padEnd(wo)} ${r.group.padEnd(wg)} ${String(r.size).padStart(ws)} Nov 25 10:00 ${r.name}`)};
    const targets=rest.length?rest:['.'];let first=true;
    for(const t of targets){
      const p=pAbs(S,t),n=S.fs[p];
      if(!n){c.fail(`ls: cannot access '${t}': No such file or directory`,2);continue}
      if(n.type==='f'||showDir){const L=line(t,n);if(long)c.out.push(...fmt([L]));else c.out.push(t);continue}
      if(!access(S,c.user,n,4)){c.fail(`ls: cannot open directory '${t}': Permission denied`,2);continue}
      const kids=Object.keys(S.fs).filter(k=>k!==p&&pParent(k)===p).sort((a,b)=>pBase(a).localeCompare(pBase(b),'pl'));
      if(targets.length>1){if(!first)c.out.push('');c.out.push(t+':')}first=false;
      const rows=kids.filter(k=>all||!pBase(k).startsWith('.')).map(k=>line(pBase(k),S.fs[k]));
      if(long){c.out.push('total '+rows.length*4);c.out.push(...fmt(rows))}else if(rows.length)c.out.push(rows.map(r=>r.name).join('  '));
    }
  },
  mkdir(c){
    const {f,rest}=opts(c,'m');if(!rest.length)return c.fail('mkdir: missing operand');
    for(const t of rest){
      const p=pAbs(c.S,t);
      if(c.S.fs[p]){if(!f.p)c.fail(`mkdir: cannot create directory '${t}': File exists`);continue}
      const chain=[];let q=p;while(!c.S.fs[q]){chain.unshift(q);q=pParent(q)}
      if(chain.length>1&&!f.p){c.fail(`mkdir: cannot create directory '${t}': No such file or directory`);continue}
      for(const d of chain){
        const par=c.S.fs[pParent(d)];
        if(par.type!=='d'||!access(c.S,c.user,par,2)){c.fail(`mkdir: cannot create directory '${t}': Permission denied`);break}
        const U=c.S.users[c.user];fsMake(c.S,d,'d',c.user,U.group,c.user==='root'?0o755:0o775);
        if(f.m)chmodApply(c.S.fs[d],f.m);
      }
    }
  },
  touch(c){
    if(!c.args.length)return c.fail('touch: missing file operand');
    for(const t of c.args){const p=pAbs(c.S,t);if(c.S.fs[p])continue;const par=c.S.fs[pParent(p)];
      if(!par)c.fail(`touch: cannot touch '${t}': No such file or directory`);else if(!access(c.S,c.user,par,2))c.fail(`touch: cannot touch '${t}': Permission denied`);
      else{const U=c.S.users[c.user];fsMake(c.S,p,'f',c.user,U.group,c.user==='root'?0o644:0o664,'')}}
  },
  rm(c){
    const {f,rest}=opts(c);if(!rest.length)return c.fail('rm: missing operand');
    for(const t of rest){const p=pAbs(c.S,t),n=c.S.fs[p];
      if(!n){if(!f.f)c.fail(`rm: cannot remove '${t}': No such file or directory`);continue}
      if(n.type==='d'&&!(f.r||f.R)){c.fail(`rm: cannot remove '${t}': Is a directory`);continue}
      if(!access(c.S,c.user,c.S.fs[pParent(p)],2)){c.fail(`rm: cannot remove '${t}': Permission denied`);continue}
      Object.keys(c.S.fs).forEach(k=>{if(k===p||k.startsWith(p+'/'))delete c.S.fs[k]});}
  },
  rmdir(c){for(const t of c.args){const p=pAbs(c.S,t),n=c.S.fs[p];if(!n){c.fail(`rmdir: failed to remove '${t}': No such file or directory`);continue}if(Object.keys(c.S.fs).some(k=>pParent(k)===p&&k!==p)){c.fail(`rmdir: failed to remove '${t}': Directory not empty`);continue}delete c.S.fs[p]}},
  cat(c){const L=inputLines(c,c.args,'cat');if(L)L.forEach(x=>c.out.push(...x.lines))},
  chmod(c){
    const a=c.args.slice();let rec=false;if(a[0]==='-R'){rec=true;a.shift()}
    if(a.length<2)return c.fail(a.length?`chmod: missing operand after '${a[0]}'`:'chmod: missing operand');
    const spec=a.shift();
    for(const t of a){const p=exists(c,t);if(!p)continue;const n=c.S.fs[p];
      if(!owns(c,n)){c.fail(`chmod: changing permissions of '${t}': Operation not permitted`);continue}
      const tg=rec?Object.keys(c.S.fs).filter(k=>k===p||k.startsWith(p+'/')):[p];
      for(const k of tg)if(!chmodApply(c.S.fs[k],spec)){c.fail(`chmod: invalid mode: '${spec}'`);return}}
  },
  chown(c){
    const a=c.args.slice();let rec=false;if(a[0]==='-R'){rec=true;a.shift()}
    if(a.length<2)return c.fail('chown: missing operand');
    const spec=a.shift(),[u,g]=spec.split(/[:.]/);
    if(u&&!c.S.users[u])return c.fail(`chown: invalid user: '${spec}'`);
    if(g&&!c.S.groups[g])return c.fail(`chown: invalid group: '${spec}'`);
    for(const t of a){const p=exists(c,t);if(!p)continue;
      if(!c.root){c.fail(`chown: changing ownership of '${t}': Operation not permitted`);c.hint('Zmiana właściciela wymaga sudo.','Changing the owner needs sudo.');continue}
      for(const k of rec?Object.keys(c.S.fs).filter(k=>k===p||k.startsWith(p+'/')):[p]){if(u)c.S.fs[k].owner=u;if(g)c.S.fs[k].group=g;else if(spec.endsWith(':')&&u)c.S.fs[k].group=c.S.users[u].group}}
  },
  chgrp(c){
    const a=c.args.slice();let rec=false;if(a[0]==='-R'){rec=true;a.shift()}
    if(a.length<2)return c.fail('chgrp: missing operand');
    const g=a.shift();if(!c.S.groups[g])return c.fail(`chgrp: invalid group: '${g}'`);
    for(const t of a){const p=exists(c,t);if(!p)continue;const n=c.S.fs[p];
      if(!(c.root||(n.owner===c.user&&inGroup(c.S,c.user,g)))){c.fail(`chgrp: changing group of '${t}': Operation not permitted`);c.hint(`Zwykły użytkownik może zmienić grupę pliku tylko na taką, do której sam należy. Tu potrzebne jest sudo.`,`A regular user can only change a file’s group to one they belong to. Use sudo here.`);continue}
      for(const k of rec?Object.keys(c.S.fs).filter(k=>k===p||k.startsWith(p+'/')):[p])c.S.fs[k].group=g}
  },
  getfacl(c){
    const {rest}=opts(c);if(!rest.length)return c.fail('Usage: getfacl [-aceEsRLPtpndvh] file ...');
    let warned=false;
    for(const t of rest){const p=pAbs(c.S,t),n=c.S.fs[p];
      if(!n){c.fail(`getfacl: ${t}: No such file or directory`);continue}
      if(t.startsWith('/')&&!warned){c.err.push("getfacl: Removing leading '/' from absolute path names");warned=true}
      c.out.push(...aclLines(t.replace(/^\/+/,''),n))}
  },
  setfacl(c){
    let def=false,recalc=true,rec=false;const ops=[],files=[],a=c.args;
    for(let i=0;i<a.length;i++){
      const x=a[i];
      if(x.startsWith('--')){
        const [k,v]=x.split('=');
        if(k==='--modify')ops.push(['m',v??a[++i]]);else if(k==='--remove')ops.push(['x',v??a[++i]]);else if(k==='--set')ops.push(['set',v??a[++i]]);
        else if(k==='--remove-all')ops.push(['b']);else if(k==='--remove-default')ops.push(['k']);else if(k==='--default')def=true;else if(k==='--no-mask')recalc=false;else if(k==='--recursive')rec=true;
        else return c.fail(`setfacl: unrecognized option '${x}'`);
        continue;
      }
      if(x.startsWith('-')&&x.length>1){
        for(let j=1;j<x.length;j++){const ch=x[j];
          if(ch==='m'||ch==='x'){const v=x.slice(j+1)||a[++i];if(v===undefined)return c.fail(`setfacl: option requires an argument -- '${ch}'`);ops.push([ch,v]);break}
          if(ch==='d')def=true;else if(ch==='b')ops.push(['b']);else if(ch==='k')ops.push(['k']);else if(ch==='n')recalc=false;else if(ch==='R')rec=true;
          else return c.fail(`setfacl: invalid option -- '${ch}'`);
        }
        continue;
      }
      files.push(x);
    }
    if(!ops.length)return c.fail("setfacl: No operation specified\nTry `setfacl --help' for more information.");
    if(!files.length)return c.fail('setfacl: No filename found in the input file');
    const parsed=[];
    for(const [op,spec] of ops){
      if(op==='b'||op==='k'){parsed.push({op});continue}
      const r=parseAclSpec(c.S,spec,op==='x');
      if(r.err)return c.fail(`setfacl: Option -${op==='set'?'-set':op}: Invalid argument near character ${r.at}`),r.why&&c.hint(...r.why);
      parsed.push({op,ents:r.ents.map(e=>({...e,def:e.def||def}))});
    }
    for(const t of files){
      const p=pAbs(c.S,t),n0=c.S.fs[p];
      if(!n0){c.fail(`setfacl: ${t}: No such file or directory`);continue}
      if(!owns(c,n0)){c.fail(`setfacl: ${t}: Operation not permitted`);c.hint('ACL może zmieniać tylko właściciel pliku albo root (sudo).','Only the file owner or root (sudo) can change ACLs.');continue}
      for(const k of rec?Object.keys(c.S.fs).filter(k=>k===p||k.startsWith(p+'/')):[p]){
        const n=c.S.fs[k];
        for(const P of parsed){
          if(P.op==='b'){n.acl={uobj:n.acl.uobj,gobj:n.acl.gobj,o:n.acl.o,mask:null,u:{},g:{}};n.dacl=null;continue}
          if(P.op==='k'){n.dacl=null;continue}
          const acc=P.ents.filter(e=>!e.def),dfl=P.ents.filter(e=>e.def);
          if(dfl.length&&n.type!=='d'){if(k===p)c.fail(`setfacl: ${t}: Only directories can have default ACLs`);continue}
          if(P.op==='x'){aclRemove(n,'acl',acc,recalc);if(dfl.length&&n.dacl)aclRemove(n,'dacl',dfl,recalc);continue}
          if(P.op==='set'){n.acl={uobj:0,gobj:0,o:0,mask:null,u:{},g:{}}}
          if(acc.length)aclModify(n,'acl',acc,recalc);
          if(dfl.length)aclModify(n,'dacl',dfl,recalc);
        }
      }
    }
  },
  useradd(c){
    if(needRoot(c,'useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.'))return;
    const {f,rest}=opts(c,'gGsdcuk');const n=rest[0];
    if(!n)return c.fail('Usage: useradd [options] LOGIN');
    if(c.S.users[n])return c.fail(`useradd: user '${n}' already exists`);
    if(f.g&&!c.S.groups[f.g])return c.fail(`useradd: group '${f.g}' does not exist`);
    const sup=f.G&&f.G!==true?f.G.split(','):[];
    for(const g of sup)if(!c.S.groups[g])return c.fail(`useradd: group '${g}' does not exist`);
    if(!f.g&&c.S.groups[n])return c.fail(`useradd: group ${n} exists - if you want to add this user to that group, use -g.`);
    addUser(c.S,n,{group:f.g,home:!!(f.m||f['create-home']),shell:f.s});
    sup.forEach(g=>c.S.groups[g].members.push(n));
  },
  adduser(c){
    if(needRoot(c,'fatal: Only root may add a user or group to the system.'))return;
    const {f,rest}=opts(c,'');const [n,g]=rest;
    if(!n)return c.fail('fatal: Only one or two names allowed.');
    if(g){
      if(!c.S.users[n])return c.fail(`fatal: The user \`${n}' does not exist.`);
      if(!c.S.groups[g])return c.fail(`fatal: The group \`${g}' does not exist.`);
      if(inGroup(c.S,n,g))return c.out.push(`info: The user \`${n}' is already a member of \`${g}'.`);
      c.S.groups[g].members.push(n);c.out.push(`info: Adding user \`${n}' to group \`${g}' ...`);return;
    }
    if(f.group||f.system){if(c.S.groups[n])return c.fail(`fatal: The group \`${n}' already exists.`);const G=addGroup(c.S,n);c.out.push(`info: Adding group \`${n}' (GID ${G.gid}) ...`);return}
    if(c.S.users[n])return c.fail(`fatal: The user \`${n}' already exists.`);
    const U=addUser(c.S,n,{home:true,shell:'/bin/bash'});
    c.out.push(`info: Adding user \`${n}' ...`,`info: Adding new group \`${n}' (${c.S.groups[n].gid}) ...`,`info: Adding new user \`${n}' (${U.uid}) with group \`${n} (${c.S.groups[n].gid})' ...`,`info: Creating home directory \`/home/${n}' ...`,'New password: ','Retype new password: ','passwd: password updated successfully');
  },
  groupadd(c){
    if(needRoot(c,'groupadd: Permission denied.\ngroupadd: cannot lock /etc/group; try again later.'))return;
    const {rest}=opts(c,'g');const n=rest[0];if(!n)return c.fail('Usage: groupadd [options] GROUP');
    if(c.S.groups[n])return c.fail(`groupadd: group '${n}' already exists`);
    addGroup(c.S,n);
  },
  addgroup(c){
    if(needRoot(c,'fatal: Only root may add a user or group to the system.'))return;
    const n=opts(c).rest[0];if(!n)return c.fail('fatal: Only one or two names allowed.');
    if(c.S.groups[n])return c.fail(`fatal: The group \`${n}' already exists.`);
    const G=addGroup(c.S,n);c.out.push(`info: Adding group \`${n}' (GID ${G.gid}) ...`);
  },
  usermod(c){
    if(needRoot(c,'usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.'))return;
    const {f,rest}=opts(c,'gGlsd');const n=rest[0];
    if(!n)return c.fail('Usage: usermod [options] LOGIN');
    if(!c.S.users[n])return c.fail(`usermod: user '${n}' does not exist`);
    if(f.g){if(!c.S.groups[f.g])return c.fail(`usermod: group '${f.g}' does not exist`);c.S.users[n].group=f.g}
    if(f.G!==undefined){
      const gs=f.G===true?[]:f.G.split(',').filter(Boolean);
      for(const g of gs)if(!c.S.groups[g])return c.fail(`usermod: group '${g}' does not exist`);
      if(!f.a){Object.values(c.S.groups).forEach(G=>{G.members=G.members.filter(m=>m!==n)});c.S.hintG=n}
      gs.forEach(g=>{if(!c.S.groups[g].members.includes(n))c.S.groups[g].members.push(n)});
    }else if(f.a)return c.fail('usermod: -a flag is ONLY allowed with the -G flag');
    if(f.s)c.S.users[n].shell=f.s;
  },
  gpasswd(c){
    if(needRoot(c,'gpasswd: Permission denied.'))return;
    const {f,rest}=opts(c,'adM');const g=rest[0];
    if(!g)return c.fail('Usage: gpasswd [option] GROUP');
    if(!c.S.groups[g])return c.fail(`gpasswd: group '${g}' does not exist in /etc/group`);
    const G=c.S.groups[g];
    if(f.a){if(!c.S.users[f.a])return c.fail(`gpasswd: user '${f.a}' does not exist`);if(!G.members.includes(f.a))G.members.push(f.a);c.out.push(`Adding user ${f.a} to group ${g}`)}
    else if(f.d){if(!G.members.includes(f.d))return c.fail(`gpasswd: user '${f.d}' is not a member of '${g}'`);G.members=G.members.filter(m=>m!==f.d);c.out.push(`Removing user ${f.d} from group ${g}`)}
    else if(f.M!==undefined){const us=String(f.M).split(',').filter(Boolean);for(const u of us)if(!c.S.users[u])return c.fail(`gpasswd: user '${u}' does not exist`);G.members=us}
    else return c.fail('gpasswd: (symulator obsługuje -a, -d i -M)');
  },
  deluser(c){
    if(needRoot(c,'fatal: Only root may remove a user or group from the system.'))return;
    const {rest}=opts(c);const [n,g]=rest;
    if(!c.S.users[n])return c.fail(`fatal: The user \`${n}' does not exist.`);
    if(g){if(!c.S.groups[g]||!c.S.groups[g].members.includes(n))return c.fail(`fatal: The user \`${n}' is not a member of group \`${g}'.`);c.S.groups[g].members=c.S.groups[g].members.filter(m=>m!==n);c.out.push(`info: Removing user \`${n}' from group \`${g}' ...`);return}
    delete c.S.users[n];Object.values(c.S.groups).forEach(G=>{G.members=G.members.filter(m=>m!==n)});c.out.push(`info: Removing user \`${n}' ...`);
  },
  userdel(c){
    if(needRoot(c,'userdel: Permission denied.\nuserdel: cannot lock /etc/passwd; try again later.'))return;
    const {f,rest}=opts(c);const n=rest[0];if(!c.S.users[n])return c.fail(`userdel: user '${n}' does not exist`);
    const U=c.S.users[n];delete c.S.users[n];Object.values(c.S.groups).forEach(G=>{G.members=G.members.filter(m=>m!==n)});
    if(c.S.groups[n]&&!Object.values(c.S.users).some(x=>x.group===n))delete c.S.groups[n];
    if(f.r)Object.keys(c.S.fs).forEach(k=>{if(k===U.home||k.startsWith(U.home+'/'))delete c.S.fs[k]});
  },
  groupdel(c){
    if(needRoot(c,'groupdel: Permission denied.'))return;
    const n=c.args[0];if(!c.S.groups[n])return c.fail(`groupdel: group '${n}' does not exist`);
    const u=Object.entries(c.S.users).find(([,U])=>U.group===n);if(u)return c.fail(`groupdel: cannot remove the primary group of user '${u[0]}'`);
    delete c.S.groups[n];
  },
  passwd(c){
    const n=c.args.filter(x=>!x.startsWith('-'))[0]||c.user;
    if(n!==c.user&&!c.root)return c.fail(`passwd: You may not view or modify password information for ${n}.`);
    if(!c.S.users[n])return c.fail(`passwd: user '${n}' does not exist`);
    c.out.push('New password: ','Retype new password: ','passwd: password updated successfully');
  },
  id(c){
    const n=c.args.filter(x=>!x.startsWith('-'))[0]||c.user,U=c.S.users[n];
    if(!U)return c.fail(`id: '${n}': no such user`);
    const gs=groupsOf(c.S,n).map(g=>`${c.S.groups[g]?c.S.groups[g].gid:'?'}(${g})`);
    c.out.push(`uid=${U.uid}(${n}) gid=${gs[0]} groups=${gs.join(',')}`);
  },
  groups(c){
    if(!c.args.length)return void c.out.push(groupsOf(c.S,c.user).join(' '));
    for(const n of c.args){if(!c.S.users[n]){c.fail(`groups: '${n}': no such user`);continue}c.out.push(`${n} : ${groupsOf(c.S,n).join(' ')}`)}
  },
  getent(c){
    const [db,...keys]=c.args;if(db!=='group'&&db!=='passwd')return c.fail(`Unknown database: ${db||''}`,1);
    const lines=fileText(c.S,'/etc/'+db).trim().split('\n');
    const sel=keys.length?lines.filter(l=>keys.includes(l.split(':')[0])):lines;
    if(!sel.length)c.code=2;c.out.push(...sel);
  },
  grep(c){
    const S=c.S,o={ere:c.name==='egrep',fixed:c.name==='fgrep',ic:false,inv:false,cnt:false,num:false,line:false,word:false,only:false,list:false},pats=[],files=[];let gotPat=false,stop=false;
    const a=c.args;
    const longs={'extended-regexp':'E','fixed-strings':'F','basic-regexp':'G','ignore-case':'i','invert-match':'v','count':'c','line-number':'n','line-regexp':'x','word-regexp':'w','only-matching':'o','files-with-matches':'l','recursive':'r'};
    for(let i=0;i<a.length;i++){
      const x=a[i];
      if(!stop&&x==='--'){stop=true;continue}
      if(!stop&&x.startsWith('--')){const [k,v]=x.slice(2).split('=');if(k==='regexp'){pats.push(v??a[++i]);gotPat=true;continue}if(!longs[k])return c.fail(`grep: unrecognized option '${x}'\nUsage: grep [OPTION]... PATTERNS [FILE]...`,2);setF(longs[k]);continue}
      if(!stop&&x.startsWith('-')&&x.length>1){
        for(let j=1;j<x.length;j++){const ch=x[j];
          if(ch==='e'){pats.push(x.slice(j+1)||a[++i]);gotPat=true;break}
          if(!'EFGivcnxwolrP'.includes(ch))return c.fail(`grep: invalid option -- '${ch}'\nUsage: grep [OPTION]... PATTERNS [FILE]...`,2);
          setF(ch);
        }
        continue;
      }
      if(!gotPat){pats.push(x);gotPat=true}else files.push(x);
    }
    function setF(ch){({E:()=>{o.ere=true},P:()=>{o.ere=true},F:()=>{o.fixed=true},G:()=>{o.ere=false},i:()=>{o.ic=true},v:()=>{o.inv=true},c:()=>{o.cnt=true},n:()=>{o.num=true},x:()=>{o.line=true},w:()=>{o.word=true},o:()=>{o.only=true},l:()=>{o.list=true},r:()=>{}})[ch]()}
    if(!pats.length)return c.fail('Usage: grep [OPTION]... PATTERNS [FILE]...',2);
    c.args.forEach((x,k)=>{if(!c.quoted[k]&&pats.includes(x)&&/[*?[\]|$(){}<>\\ ]/.test(x))c.hint('Wzorzec ze znakami specjalnymi bez apostrofów: powłoka może go zmienić, zanim dostanie go grep. Bezpieczniej pisać np. grep \'^G\' miasta.txt.','A pattern with special characters is not quoted: the shell may change it before grep sees it. It is safer to write e.g. grep \'^G\' miasta.txt.')});
    if(!o.ere&&!o.fixed&&pats.some(p=>/\{\d+(,\d*)?\}|\|/.test(p)&&!/\\[{|]/.test(p)))c.hint('Bez opcji -E znaki { } i | są zwykłymi znakami. Do powtórzeń {6} i alternatywy | potrzebne jest grep -E (albo \\{6\\} i \\| bez -E).','Without -E the characters { } and | are literal. For repetition {6} and alternation | use grep -E (or \\{6\\} and \\| without -E).');
    const re=grepRe(pats,o),srcs=inputLines(c,files,'grep');if(!srcs)return;
    let any=false;
    for(const src of srcs){
      const pre=srcs.length>1?src.name+':':'';let n=0;
      src.lines.forEach((l,k)=>{const m=re.test(l);if(m!==o.inv){n++;any=true;if(!o.cnt&&!o.list){if(o.only&&!o.inv){const g=new RegExp(re.source,re.flags+'g');(l.match(g)||[]).forEach(x=>c.out.push(pre+(o.num?(k+1)+':':'')+x))}else c.out.push(pre+(o.num?(k+1)+':':'')+l)}}});
      if(o.cnt)c.out.push(pre+n);if(o.list&&n)c.out.push(src.name);
    }
    if(!any&&!o.cnt)c.code=1;
  },
  egrep(c){SH.grep(c)},
  fgrep(c){SH.grep(c)},
  wc(c){
    const {f,rest}=opts(c);const L=inputLines(c,rest,'wc');if(!L)return;
    for(const x of L){const ln=x.lines.length,w=x.lines.join(' ').split(/\s+/).filter(Boolean).length,b=new TextEncoder().encode(x.lines.join('\n')+'\n').length;
      const parts=f.l||f.w||f.c||f.m?[f.l&&ln,f.w&&w,(f.c||f.m)&&b].filter(v=>v!==false&&v!==undefined):[ln,w,b];
      c.out.push(parts.join(' ')+(x.name?' '+x.name:''))}
  },
  sort(c){const {f,rest}=opts(c);const L=inputLines(c,rest,'sort');if(!L)return;let ls=L.flatMap(x=>x.lines).sort((a,b)=>a.localeCompare(b,'pl'));if(f.r)ls.reverse();if(f.u)ls=ls.filter((x,k)=>!k||x!==ls[k-1]);c.out.push(...ls)},
  head(c){const {f,rest}=opts(c,'n');const n=+(f.n??(c.args.find(x=>/^-\d+$/.test(x))||'-10').slice(1));const L=inputLines(c,rest.filter(x=>!/^-\d+$/.test(x)),'head');if(L)c.out.push(...L.flatMap(x=>x.lines).slice(0,n))},
  tail(c){const {f,rest}=opts(c,'n');const n=+(f.n??(c.args.find(x=>/^-\d+$/.test(x))||'-10').slice(1));const L=inputLines(c,rest.filter(x=>!/^-\d+$/.test(x)),'tail');if(L)c.out.push(...L.flatMap(x=>x.lines).slice(-n))},
  awk(c){
    const prog=c.args[0];if(!prog)return c.fail("usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]");
    const L=inputLines(c,c.args.slice(1),'awk');if(!L)return;
    let m,test;
    const len=s=>[...s].length;
    if((m=prog.match(/^\s*(!?)\/(.*)\/\s*(\{\s*print(?:\s+\$0)?\s*;?\s*\})?\s*$/))){const re=grepRe([m[2]],{ere:true});test=l=>re.test(l)!==!!m[1]}
    else if((m=prog.match(/^\s*length(?:\(\s*\$0\s*\))?\s*(==|!=|>=|<=|>|<)\s*(\d+)\s*(\{\s*print(?:\s+\$0)?\s*;?\s*\})?\s*$/))){const n=+m[2],op=m[1];test=l=>({'==':len(l)===n,'!=':len(l)!==n,'>=':len(l)>=n,'<=':len(l)<=n,'>':len(l)>n,'<':len(l)<n})[op]}
    else return c.fail($t("awk: (symulator rozumie tylko proste programy: '/wzorzec/', '!/wzorzec/', 'length($0)==6')","awk: (the simulator only understands simple programs: '/pattern/', '!/pattern/', 'length($0)==6')"),2);
    L.forEach(x=>x.lines.forEach(l=>{if(test(l))c.out.push(l)}));
  },
  ufw(c){
    if(needRoot(c,'ERROR: You need to be root to run this script'))return;
    const a=c.args.slice(),U=c.S.ufw;let dry=false;if(a[0]==='--dry-run'){dry=true;a.shift()}
    const cmd=a[0];
    if(cmd==='enable'){U.on=true;return void c.out.push('Firewall is active and enabled on system startup')}
    if(cmd==='disable'){U.on=false;return void c.out.push('Firewall stopped and disabled on system startup')}
    if(cmd==='reset'){U.on=false;U.rules=[];return void c.out.push('Resetting all rules to installed defaults.')}
    if(cmd==='status'){
      if(!U.on)return void c.out.push('Status: inactive');
      c.out.push('Status: active');if(a[1]==='verbose')c.out.push('Logging: on (low)','Default: deny (incoming), allow (outgoing), disabled (routed)','New profiles: skip');
      if(U.rules.length){c.out.push('','To                         Action      From','--                         ------      ----');
        U.rules.forEach((R,k)=>{const [to,act,from]=ufwShow(R);c.out.push((a[1]==='numbered'?`[${String(k+1).padStart(2)}] `:'')+to.padEnd(27)+act+' '+from)});
        U.rules.forEach(R=>{if(R.from==='any'&&R.to==='any'){const [to,act]=ufwShow(R);c.out.push((to+' (v6)').padEnd(27)+act+' Anywhere (v6)')}})}
      return;
    }
    if(cmd==='default')return void c.out.push(`Default ${a[2]||'incoming'} policy changed to '${a[1]}'`,'(be sure to update your rules accordingly)');
    if(cmd==='delete'){
      if(/^\d+$/.test(a[1]||'')){const k=+a[1]-1;if(!U.rules[k])return c.fail('ERROR: Could not find rule \''+a[1]+'\'');U.rules.splice(k,1);return void c.out.push('Rule deleted')}
      const R=ufwRule(c,a.slice(1)),k=U.rules.findIndex(x=>JSON.stringify(x)===JSON.stringify(R));
      if(k<0)return void c.out.push('Could not delete non-existent rule');U.rules.splice(k,1);return void c.out.push('Rule deleted');
    }
    if(['allow','deny','reject','limit'].includes(cmd)){
      const R=ufwRule(c,a);if(dry)return;
      if(U.rules.some(x=>JSON.stringify(x)===JSON.stringify(R)))return void c.out.push('Skipping adding existing rule');
      U.rules.push(R);c.out.push('Rules updated');if(R.from==='any'&&R.to==='any')c.out.push('Rules updated (v6)');return;
    }
    c.fail(`ERROR: Invalid syntax\n\nUsage: ufw COMMAND`);
  },
};
function chmodApply(n,spec){
  if(/^[0-7]{1,4}$/.test(spec)){setMode(n,parseInt(spec,8)&0o777);return true}
  let m=modeOf(n);
  for(const clause of spec.split(',')){
    const mm=clause.match(/^([ugoa]*)((?:[-+=](?:[rwxXst]*|[ugo]))+)$/);if(!mm)return false;
    let who=mm[1]||'a';if(who.includes('a'))who='ugo';
    for(const [,op,perm] of mm[2].matchAll(/([-+=])([rwxXst]*|[ugo])/g)){
      let bits=0;
      if(/^[ugo]$/.test(perm))bits=(m>>{u:6,g:3,o:0}[perm])&7;
      else for(const ch of perm){if(ch==='r')bits|=4;else if(ch==='w')bits|=2;else if(ch==='x')bits|=1;else if(ch==='X'&&(n.type==='d'||(m&0o111)))bits|=1}
      for(const w of new Set(who)){const sh={u:6,g:3,o:0}[w];if(op==='+')m|=bits<<sh;else if(op==='-')m&=~(bits<<sh);else m=(m&~(7<<sh))|(bits<<sh)}
    }
  }
  setMode(n,m);return true;
}
function parsePerm(s){if(/^[0-7]$/.test(s))return +s;if(!/^[rwxX-]*$/.test(s))return null;let p=0;for(const ch of s){if(ch==='r')p|=4;if(ch==='w')p|=2;if(ch==='x'||ch==='X')p|=1}return p}
function parseAclSpec(S,spec,forRemove){
  const ents=[];let at=1;
  for(const e of String(spec).split(',')){
    if(!e){at+=1;continue}
    let p=e.split(':'),def=false;
    if(p[0]==='d'||p[0]==='default'){def=true;p=p.slice(1)}
    const T={u:'u',user:'u',g:'g',group:'g',m:'m',mask:'m',o:'o',other:'o'}[p[0]];
    if(!T)return {err:true,at};
    let name='',perm;
    if(T==='m'||T==='o'){
      if(p.length===3&&p[1]==='')perm=p[2];else if(p.length===2)perm=p[1];else if(p.length===1&&forRemove)perm=undefined;else return {err:true,at};
    }else{
      if(p.length>3)return {err:true,at};
      name=p[1]??'';perm=p[2];
      if(name&&T==='u'&&!S.users[name])return {err:true,at:at+e.indexOf(name),why:[`Użytkownik „${name}” nie istnieje. Najpierw trzeba go utworzyć.`,`The user “${name}” does not exist. Create it first.`]};
      if(name&&T==='g'&&!S.groups[name])return {err:true,at:at+e.indexOf(name),why:[`Grupa „${name}” nie istnieje. Najpierw trzeba ją utworzyć (groupadd).`,`The group “${name}” does not exist. Create it first (groupadd).`]};
    }
    if(!forRemove){if(perm===undefined)return {err:true,at:at+e.length};perm=parsePerm(perm);if(perm===null)return {err:true,at}}
    ents.push({def,type:T,name,perm});at+=e.length+1;
  }
  return {ents};
}
function aclModify(n,key,ents,recalc){
  if(key==='dacl'&&!n.dacl)n.dacl={uobj:n.acl.uobj,gobj:n.acl.gobj,o:n.acl.o,mask:null,u:{},g:{}};
  const A=n[key];let maskSet=false;
  for(const e of ents){
    if(e.type==='u'){if(e.name)A.u[e.name]=e.perm;else A.uobj=e.perm}
    else if(e.type==='g'){if(e.name)A.g[e.name]=e.perm;else A.gobj=e.perm}
    else if(e.type==='m'){A.mask=e.perm;maskSet=true}
    else A.o=e.perm;
  }
  const ext=Object.keys(A.u).length+Object.keys(A.g).length>0;
  if(!maskSet&&ext&&(recalc||A.mask==null))A.mask=[A.gobj,...Object.values(A.u),...Object.values(A.g)].reduce((x,y)=>x|y,0);
}
function aclRemove(n,key,ents,recalc){
  const A=n[key];
  for(const e of ents){if(e.type==='u'&&e.name)delete A.u[e.name];else if(e.type==='g'&&e.name)delete A.g[e.name];else if(e.type==='m'&&!Object.keys(A.u).length&&!Object.keys(A.g).length)A.mask=null}
  const ext=Object.keys(A.u).length+Object.keys(A.g).length>0;
  if(!ext){if(A.mask!=null){A.gobj=A.mask;A.mask=null}if(key==='dacl'&&!ext&&A.uobj===n.acl.uobj&&A.gobj===n.acl.gobj&&A.o===n.acl.o)n.dacl=null}
  else if(recalc)A.mask=[A.gobj,...Object.values(A.u),...Object.values(A.g)].reduce((x,y)=>x|y,0);
}
function aclLines(name,n){
  const L=[`# file: ${name}`,`# owner: ${n.owner}`,`# group: ${n.group}`];
  const part=(A,pre)=>{
    const eff=p=>A.mask!=null&&(p&A.mask)!==p?'\t\t\t#effective:'+permStr(p&A.mask):'';
    L.push(`${pre}user::${permStr(A.uobj)}`);
    for(const [u,p] of Object.entries(A.u))L.push(`${pre}user:${u}:${permStr(p)}${eff(p)}`);
    L.push(`${pre}group::${permStr(A.gobj)}${eff(A.gobj)}`);
    for(const [g,p] of Object.entries(A.g))L.push(`${pre}group:${g}:${permStr(p)}${eff(p)}`);
    if(A.mask!=null)L.push(`${pre}mask::${permStr(A.mask)}`);
    L.push(`${pre}other::${permStr(A.o)}`);
  };
  part(n.acl,'');if(n.dacl)part(n.dacl,'default:');
  L.push('');return L;
}
