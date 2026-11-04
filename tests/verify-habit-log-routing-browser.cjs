const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const root=path.resolve(__dirname,'..'),ids={daysSheetId:10,indexSheetId:11,blockSheetId:12};
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const date='2026-10-03';
let backend=createDayRoutingServer(null,{seedDays:[{date,reflection:'Riflessione originaria sintetica'}],seedPractices:[{date,title:'Pratica microazioni sintetica',steps:'Primo gesto sintetico\nSecondo gesto sintetico',checkedIndices:[0]},{date,title:'Pratica semplice sintetica'}]});
const practice=backend.practices[0],simple=backend.practices[1],key=practice.log.key;
const logIds={habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16};
backend.controller.register(ids);backend.controller.setMode({mode:'active',expectedRevision:1});
backend.weekController.register({weeksSheetId:13,indexSheetId:11,blockSheetId:12});backend.weekController.setMode({mode:'active',expectedRevision:1});
backend.habitLogController.register(logIds);backend.habitLogController.setMode({mode:'active',expectedRevision:1});
function migrate(k){const p=backend.habitLogController.resolve().preview(k);backend.habitLogController.resolve().migrate({key:k,expectedLegacy:p.legacy,expectedCatalog:p.catalog,record:p.record,operationId:'synthetic-browser-log-'+k.split('|')[0]});}
migrate(simple.log.key);
const frozen=JSON.stringify(backend.snapshot().rawSheets.HabitLogs),row=(k=key)=>backend.habitLogController.resolve().readRows([{from:date,to:date}]).find(row=>row.key===k);
let nextSave=null,held=null;const calls=[];
const bridge=`window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({},{get:(_,name)=>arg=>{fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arg})}).then(r=>r.json()).then(response=>{if(response.ok)success(response.value);else failure(Object.assign(new Error(response.error.message),{name:response.error.name}));}).catch(failure);}});}};}}}};`;
const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('</script>','</script><script>'+bridge+'</script>');
const allowed=new Set(['getState','getCommonState','getJournalPage','getJournalContents','getEntryDetail','getSyncManifest','saveDays','saveDay','saveWeek','setHabitLog','traceApi']);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/Demo.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  if(req.url==='/Changelog.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Changelog.html')));return;}
  if(req.url!=='/rpc'||req.method!=='POST'){res.writeHead(404).end();return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Synthetic request too large');}
  const {name,arg}=JSON.parse(raw);if(!allowed.has(name))throw Error('Synthetic RPC not allowed');calls.push({name,arg});
  const fault=name==='setHabitLog'?nextSave:null;if(fault)nextSave=null;
  let response;try{response={ok:true,value:JSON.parse(JSON.stringify(await backend.ctx[name](arg)))};}catch(error){response={ok:false,error:{name:error.name,message:error.message}};}
  if(fault==='hold')await new Promise(resolve=>{held={release:resolve,response};});
  if(fault==='lost'&&response.ok)response={ok:false,error:{name:'Error',message:'Risposta persa simulata dopo commit'}};
  if(fault==='invalid'&&response.ok)response={ok:true,value:{delta:true,entries:[],commonIncluded:false,commonUpserts:{habitLogs:[]}}};
  if(fault==='wrongIdentity'&&response.ok){const record=response.value.commonUpserts.habitLogs[0];record.habitId='other';record.key='other|'+date;}
  if(fault==='wrongChecks'&&response.ok){const record=response.value.commonUpserts.habitLogs[0],list=JSON.parse(record.checklist);list.checked=[];record.checklist=JSON.stringify(list);}
  if(fault==='wrongSteps'&&response.ok){const record=response.value.commonUpserts.habitLogs[0],list=JSON.parse(record.checklist);list.steps[0].title='Alterato';record.checklist=JSON.stringify(list);}
  if(fault==='wrongStatus'&&response.ok)response.value.commonUpserts.habitLogs[0].status='skipped';
  if(fault==='extraPatch'&&response.ok)response.value.commonPatch={habitLogs:[]};
  // Let native checkbox click dispatch finish before replacing its DOM node.
  if(name==='setHabitLog')await new Promise(resolve=>setTimeout(resolve,40));
  res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(response));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({ok:false,error:{name:'Error',message:error.message}}));}
});
async function until(predicate,message){const deadline=Date.now()+15000;while(!predicate()){if(Date.now()>deadline)throw Error(message);await new Promise(resolve=>setTimeout(resolve,20));}}
async function ready(page){await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);await page.locator('.vue-diary-page').waitFor();}
function practiceRow(page,id=practice.habit.id){return page.locator('[data-habit-log-id="'+id+'"][data-habit-log-date="'+date+'"]');}
function check(page,label='Secondo gesto sintetico'){return practiceRow(page).getByRole('checkbox',{name:label,exact:true});}
async function idle(page){await page.waitForFunction(()=>!busy);await page.evaluate(async()=>{if(view==='journal')await window.BulletJournalVue.whenRendered();});}
async function notice(page,text){try{await page.waitForFunction(text=>document.querySelector('#message').textContent.includes(text),text);}catch(error){throw Error('Expected '+text+'; observed '+await page.locator('#message').textContent());}}
async function openHabits(page){const details=page.locator('[data-habit-date="'+date+'"].diary-habits');if(!await details.evaluate(n=>n.open))await details.locator(':scope > summary').click();await practiceRow(page).waitFor();}
async function editor(page){const section=page.locator('.diary-day[data-diary-date="'+date+'"] .daily-section[data-section="reflection"]');const expand=section.getByRole('button',{name:'Espandi fine giornata',exact:true});if(await expand.isVisible())await expand.click();return section.getByRole('textbox',{name:'Testo fine giornata',exact:true});}
(async()=>{
 let browser;const errors=[];let origin;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  async function open(){const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await ready(page);await openHabits(page);return page;}
  const page=await open();const beforeVersion=await page.evaluate(key=>state.habitLogs.find(row=>row.key===key).updatedAt,key);assert(!beforeVersion.startsWith('commit-'));
  const area=await editor(page);await area.fill('Bozza del diario da preservare 🌱');
  await area.evaluate(element=>{window.syntheticDiaryArea=element;});migrate(key);
  // The old client base is mapped exactly once after migration. An unrelated
  // diary draft survives the immediate checklist mutation and rerender.
  await check(page).check();await idle(page);assert.equal(row().status,'done');assert(await check(page).isChecked());assert(await check(page).evaluate(n=>document.activeElement===n));
  assert(await page.evaluate(()=>syntheticDiaryArea.isConnected&&dailyDrafts.get('2026-10-03:reflection').body==='Bozza del diario da preservare 🌱'&&dailyDrafts.get('2026-10-03:reflection').dirty));
  await check(page).uncheck();await idle(page);assert.equal(row().status,'pending');
  nextSave='lost';await check(page).check();await notice(page,'Risposta persa simulata');await idle(page);assert(!(await check(page).isChecked()));assert.equal(row().status,'done');
  const lostLedger=backend.ledger.snapshot();await check(page).check();await idle(page);assert(await check(page).isChecked());assert.deepEqual(backend.ledger.snapshot(),lostLedger,'lost ACK retry publishes no new commit');
  for(const fault of ['invalid','wrongIdentity','wrongChecks','wrongSteps','wrongStatus','extraPatch']){
   if(await check(page).isChecked()){await check(page).uncheck();await idle(page);}
   const previous=await page.evaluate(()=>JSON.stringify(state.habitLogs));nextSave=fault;
   await check(page).check();await notice(page,'Risposta della pratica non valida').catch(e=>{throw Error(fault+': '+e.message);});await idle(page);assert(!(await check(page).isChecked()));assert.equal(await page.evaluate(()=>JSON.stringify(state.habitLogs)),previous,'malformed ACK never changes common state');
   const ledger=backend.ledger.snapshot();await check(page).check();await idle(page);assert(await check(page).isChecked());assert.deepEqual(backend.ledger.snapshot(),ledger);
  }
  // Reopen a fresh server/tab with canonical checklist and unrelated draft.
  backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);await openHabits(page);
  assert(await check(page).isChecked());assert.equal(await page.evaluate(()=>dailyDrafts.get('2026-10-03:reflection').body),'Bozza del diario da preservare 🌱');
  // Historical steps remain intact when the live habit definition changes.
  backend.ctx.saveHabit({...practice.habit,steps:'Definizione nuova',context:{incrementalCommon:true}});
  await page.evaluate(async()=>{catalogReadAt=0;commonReadAt=0;await ensureCommon();renderContinuous($('content'));await window.BulletJournalVue.whenRendered();});
  await openHabits(page);assert.equal(await practiceRow(page).getByRole('checkbox',{name:'Definizione nuova',exact:true}).count(),0);
  await check(page).uncheck();await idle(page);assert.equal(row().status,'pending');assert.equal(JSON.parse(row().checklist).steps[1].title,'Secondo gesto sintetico');
  // Two clients race the same log version; the rejected client never displays
  // its unconfirmed checkbox as a successful mutation.
  const twin=await open();await check(twin).check();await idle(twin);const twinLedger=backend.ledger.snapshot();await check(page).check();await idle(page);assert.deepEqual(backend.ledger.snapshot(),twinLedger,'identical concurrent intents converge to one operation');await twin.close();await check(page).uncheck();await idle(page);
  const other=await open();await check(other).check();await idle(other);assert.equal(row().status,'done');await other.close();
  await check(page,'Primo gesto sintetico').uncheck();await notice(page,'modificata altrove');await idle(page);assert(await check(page,'Primo gesto sintetico').isChecked());assert(!(await check(page).isChecked()));assert.equal(row().status,'done');
  await page.screenshot({path:path.join(root,'artifacts/habit-log-routing-conflict.png'),fullPage:true});
  await page.evaluate(async()=>{applyCommonChanges(await api('getCommonState'));renderContinuous($('content'));await window.BulletJournalVue.whenRendered();});await openHabits(page);assert(await check(page).isChecked());
  backend.habitLogController.setMode({mode:'readOnly',expectedRevision:backend.habitLogController.status().revision});const readonly=backend.ledger.snapshot();
  await check(page).uncheck();await notice(page,'sola lettura');await idle(page);assert(await check(page).isChecked());assert.deepEqual(backend.ledger.snapshot(),readonly);
  backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);await openHabits(page);assert.equal(backend.habitLogController.status().mode,'readOnly');assert(await check(page).isChecked());
  await page.screenshot({path:path.join(root,'artifacts/habit-log-routing-readonly.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.screenshot({path:path.join(root,'artifacts/habit-log-routing-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1100});
  backend.habitLogController.setMode({mode:'active',expectedRevision:backend.habitLogController.status().revision});
  // Test the same ACK validation through the cycle's generic run() path.
  await page.evaluate(()=>{dirtyMain=false;go('habits');});await page.waitForFunction(()=>view==='habits'&&!busy);await practiceRow(page).waitFor();
  const previous=await page.evaluate(()=>JSON.stringify(state.habitLogs));nextSave='wrongIdentity';await check(page).uncheck();await notice(page,'Risposta della pratica non valida');await idle(page);assert(await check(page).isChecked());assert.equal(await page.evaluate(()=>JSON.stringify(state.habitLogs)),previous);
  const malformed=backend.ledger.snapshot();await check(page).uncheck();await idle(page);assert(!(await check(page).isChecked()));assert(await check(page).evaluate(n=>document.activeElement===n));assert.deepEqual(backend.ledger.snapshot(),malformed);
  const simpleBox=practiceRow(page,simple.habit.id).getByRole('checkbox',{name:'Abitudine '+simple.habit.title,exact:true});await simpleBox.check();await idle(page);assert.equal(row(simple.log.key).status,'done');
  await page.evaluate(()=>setPerformanceTracing(true));await simpleBox.uncheck();await idle(page);assert.equal(row(simple.log.key).status,'pending');
  const trace=await page.evaluate(async()=>{await api('getCommonState');const report=performanceTraceReport();setPerformanceTracing(false);return report;});
  assert(trace.events.some(event=>event.operation==='getCommonState'&&event.responseBytes>0));assert(trace.events.some(event=>event.operation==='setHabitLog'&&event.responseBytes>0));for(const text of [practice.habit.title,practice.habit.id,key,practice.goal.title,backend.scope.archiveId,backend.scope.principalId,'Secondo gesto sintetico'])assert(!JSON.stringify(trace).includes(text));
  assert.equal(JSON.stringify(backend.snapshot().rawSheets.HabitLogs),frozen);assert(calls.some(call=>call.name==='setHabitLog'));assert.equal(await page.evaluate(()=>privacyShown),false);assert.deepEqual(errors,[]);
  console.log('Active HabitLogs browser: pre-migration bases, historical steps, diary drafts, checkbox focus, lost/six malformed ACKs with immutable retries, server/tab reload, two-client conflict, persistent readOnly, journal/cycle/simple habit paths, tracing privacy and 320/390px OK.');
 }finally{held?.release();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
