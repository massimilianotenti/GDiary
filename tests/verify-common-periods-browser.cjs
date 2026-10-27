const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},wait=async()=>{while(busy)await new Promise(r=>setTimeout(r,5));};
  const original=api,calls=[];api=async(name,...args)=>{const result=await original(name,...args);if(['getState','getCommonState'].includes(name))calls.push({name,result});return result;};
  const saved=saveDay({date:'2027-05-01',reflection:'Riflessione lontana 🌱',reflectionRich:[{kind:'p',runs:[{text:'Riflessione lontana 🌱',bold:true}]}],updatedAt:''}).commonUpserts.days[0];
  saveWeek({week:'2026-12-28',focus:'Focus al cambio anno',priorities:'',wins:'',obstacles:'',lessons:'',next:'',energy:'3',closed:'no',updatedAt:''});
  await go('habits');await wait();
  check(commonScope.kind==='habits'&&commonCoversView(),'habits entry uses scoped coverage');
  state.habitLogs.push({key:'gap-record',habitId:'synthetic',date:'2027-03-15',status:'done'},{key:'externally-deleted-record',habitId:'synthetic',date:'2027-05-01',status:'done'});
  check(await changeHabitPeriod({date:'2027-05-01'}),'load remote selected day');
  check(state.habitLogs.some(l=>l.key==='gap-record')&&!state.habitLogs.some(l=>l.key==='externally-deleted-record'),'union merge preserves the gap and removes absent records inside ranges');
  const currentWeek=week;
  check(commonScope.date==='2027-05-01'&&commonScope.week===currentWeek,'selected day does not move tracker');
  const form=document.querySelector('.cycle-reflection');
  check(form.dataset.version===saved.updatedAt&&form.querySelector('textarea').value==='Riflessione lontana 🌱','loaded version and rich reflection, no empty placeholder');
  check(await changeHabitPeriod({week:'2026-12-28'}),'load tracker across year');
  check(day==='2027-05-01'&&commonScope.date===day&&commonScope.week==='2026-12-28','tracker does not move selected day');
  const response=calls[calls.length-1].result;
  check(response.commonSlices.habitLogs.ranges.length===2&&!response.days&&!response.habitLogs,'separate ranges, no full history');
  const count=calls.length;cycle='2027-Q1';render();cycle='2027-Q2';render();
  check(calls.length===count,'quarter selection reuses complete catalogs');
  check(await changeHabitPeriod({date:day})&&calls.length===count,'unchanged covered selection needs no request');
  // Slow read: old editor stays mounted, disabled and populated until success.
  let finish;const hold=new Promise(resolve=>{finish=resolve;});
  api=async(name,...args)=>{const result=await original(name,...args);if(name==='getCommonState')await hold;return result;};
  const oldEditor=document.querySelector('.cycle-reflection .rich-area'),pending=changeHabitPeriod({date:'2027-05-02'});
  check(busy&&oldEditor.isConnected&&oldEditor.contentEditable==='false'&&oldEditor.textContent.includes('Riflessione lontana'),'no editable empty form during pending read');
  check(document.querySelector('#content').getAttribute('aria-busy')==='true','loading announced');
  await go('week');check(view==='habits','navigation blocked while period read is pending');
  finish();check(await pending,'read completes');
  check(!busy&&day==='2027-05-02'&&commonCoversView()&&!document.querySelector('#content').hasAttribute('aria-busy'),'coverage only after completion');
  // Failed read after consent to leave changes restores original node, rich
  // draft and original version. Retry can then load the desired period.
  const input=document.querySelector('.cycle-reflection textarea'),editor=input.richEditor;
  editor.set([{kind:'p',runs:[{text:'Bozza da conservare',italic:true}]}]);input.dispatchEvent(new Event('input',{bubbles:true}));
  const draft=JSON.stringify([...habitFormDrafts]),node=editor.area,version=input.closest('form').dataset.version;
  check(dirtyMain&&habitFormDrafts.size,'draft fixture');
  const confirmOriginal=window.confirm;window.confirm=()=>false;
  check(!(await changeHabitPeriod({date:'2027-05-03'}))&&day==='2027-05-02'&&node.isConnected,'declining discard does not navigate');
  window.confirm=()=>true;api=async()=>{throw Error('Errore di rete simulato');};
  check(!(await changeHabitPeriod({date:'2027-05-03'})),'failed read reported');
  check(day==='2027-05-02'&&week==='2026-12-28'&&dirtyMain&&JSON.stringify([...habitFormDrafts])===draft,'period and drafts restored');
  check(node.isConnected&&node.textContent==='Bozza da conservare'&&input.closest('form').dataset.version===version&&node.contentEditable==='true','node, rich content and baseline retained after error');
  check(document.querySelector('#message').textContent.includes('Periodo non caricato'),'visible error');
  api=original;check(await changeHabitPeriod({date:'2027-05-03'}),'retry after failure');window.confirm=confirmOriginal;
  await go('week',{week:'2026-12-28'});await wait();
  check(commonScope.kind==='week'&&commonScope.week==='2026-12-28'&&commonCoversView(),'week entry is scoped');
  check(state.weeks.find(w=>w.week==='2026-12-28').focus==='Focus al cambio anno','canonical checkup loaded');
  await go('week',{week:'2027-01-04'});await wait();check(commonScope.week==='2027-01-04'&&commonCoversView(),'weekly navigation refreshes coverage');
  // A late view refresh from the old period must not repaint a newer selection.
  await go('habits');await wait();let release;
  api=(name,...args)=>name==='getState'?new Promise(resolve=>{release=resolve;}):original(name,...args);
  forceCommon=true;const stale=run('getState');forceCommon=false;check(typeof release==='function','refresh request fixture');check(!busy,'recent view refresh is in background');
  check(await changeHabitPeriod({date:'2027-05-04'}),'new period while old refresh pending');
  release({entries:[],files:[],today:state.today,month,commonIncluded:true,commonScope:{kind:'full'},days:[]});await stale;
  check(day==='2027-05-04'&&commonScope.kind==='habits'&&commonScope.date===day&&commonCoversView(),'stale background view read ignored');
  api=async(name,...args)=>{const result=await original(name,...args);if(name==='getCommonState')catalogReadAt=Date.now()-60001;return result;};
  check(await changeHabitPeriod({date:'2027-05-05'}),'catalog TTL expiry in flight does not reject a valid loaded period');
  check(commonScopeMatchesView()&&day==='2027-05-05','loaded period remains usable after catalog TTL expiry');
  api=original;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Common periods browser: independent tracker/day, scoped week/checkup, coverage, delayed/error/retry/discard, rich drafts/versions/nodes, stale view response and catalog reuse OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
