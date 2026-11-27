let TM=null,tmHist=[],tmPos=0;
function tmStart(){
  TM={S:soBase(),log:[]};
  TM.log.push({t:'note',s:$t('symulowane Ubuntu; wpisz help, żeby zobaczyć listę poleceń','a simulated Ubuntu; type help for the list of commands')});
  tmDraw();
}
function tmDraw(){
  $('#tmOut').innerHTML=termHtml(TM.log).replace(/^<pre class="term">|<\/pre>$/g,'');
  $('#tmPrompt').textContent=simPrompt(TM.S);
  const o=$('#tmOut');o.scrollTop=o.scrollHeight;
}
function tmRun(line){
  if(!TM)tmStart();
  TM.log.push({t:'cmd',s:line,prompt:simPrompt(TM.S)});
  TM.S.hints=[];
  const r=simRun(TM.S,line);
  if(r.some(x=>x.s==='\f'))TM.log=[];
  else TM.log.push(...r);
  TM.S.hints.forEach(h=>TM.log.push({t:'note',s:$t(h.pl,h.en)}));
  if(TM.log.length>400)TM.log=TM.log.slice(-400);
  if(line.trim()){tmHist.push(line);tmPos=tmHist.length}
  tmDraw();
}
$('#tmForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#tmIn').value;$('#tmIn').value='';tmRun(v)});
$('#tmIn').addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&tmPos>0){tmPos--;$('#tmIn').value=tmHist[tmPos];e.preventDefault()}
  else if(e.key==='ArrowDown'){tmPos=Math.min(tmHist.length,tmPos+1);$('#tmIn').value=tmHist[tmPos]||'';e.preventDefault()}
});
$('#tmReset').onclick=()=>{tmStart();$('#tmIn').focus()};
$('#tmEx').addEventListener('click',e=>{const b=e.target.closest('[data-cmd]');if(b){tmRun(b.dataset.cmd);$('#tmIn').focus()}});
HOOKS.start.push(tmStart);
HOOKS.lang.push(()=>{if(TM){TM.log=TM.log.filter(x=>x.t!=='note');tmDraw()}});
