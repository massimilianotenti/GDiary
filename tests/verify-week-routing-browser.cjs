const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const root=path.resolve(__dirname,'..'),ids={daysSheetId:10,indexSheetId:11,blockSheetId:12};
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const week='2026-09-28',seed={week,focus:'Focus sintetico 🌱',priorities:'Tre priorità',wins:'Vittoria originaria',obstacles:'Tempo',lessons:'Ascolto',next:'Avanti',energy:'3',closed:'no'};
let backend=createDayRoutingServer(null,{seedWeeks:[seed]});
const weekIds={weeksSheetId:13,indexSheetId:11,blockSheetId:12};
backend.controller.register(ids);backend.controller.setMode({mode:'active',expectedRevision:1});
backend.weekController.register(weekIds);backend.weekController.setMode({mode:'active',expectedRevision:1});
function migrate(){const preview=backend.weekController.resolve().preview(week);backend.weekController.resolve().migrate({week,expectedLegacy:preview.legacy,operationId:'synthetic-browser-week-migrate'});}
const frozen=JSON.stringify(backend.snapshot().rawSheets.Weeks),row=()=>backend.weekController.resolve().readRows([{from:week,to:week}])[0];
let nextSave=null,held=null;const calls=[];
const bridge=`window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({},{get:(_,name)=>arg=>{fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arg})}).then(r=>r.json()).then(response=>{if(response.ok)success(response.value);else failure(Object.assign(new Error(response.error.message),{name:response.error.name}));}).catch(failure);}});}};}}}};`;
const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('</script>','</script><script>'+bridge+'</script>');
const allowed=new Set(['getState','getCommonState','getJournalPage','getJournalContents','getEntryDetail','getSyncManifest','saveDays','saveDay','saveWeek','traceApi']);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/Demo.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  if(req.url==='/Changelog.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Changelog.html')));return;}
  if(req.url!=='/rpc'||req.method!=='POST'){res.writeHead(404).end();return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Synthetic request too large');}
  const {name,arg}=JSON.parse(raw);if(!allowed.has(name))throw Error('Synthetic RPC not allowed');calls.push({name,arg});
  const fault=name==='saveWeek'?nextSave:null;if(fault)nextSave=null;
  let response;try{response={ok:true,value:JSON.parse(JSON.stringify(await backend.ctx[name](arg)))};}catch(error){response={ok:false,error:{name:error.name,message:error.message}};}
  if(fault==='hold')await new Promise(resolve=>{held={release:resolve,response};});
  if(fault==='lost'&&response.ok)response={ok:false,error:{name:'Error',message:'Risposta persa simulata dopo commit'}};
  if(fault==='invalid'&&response.ok)response={ok:true,value:{delta:true,entries:[],commonIncluded:false,commonUpserts:{weeks:[]}}};
  if(fault==='wrongWeek'&&response.ok)response.value.commonUpserts.weeks[0].week='2026-10-05';
  if(fault==='wrongText'&&response.ok)response.value.commonUpserts.weeks[0].wins='Snapshot differente';
  if(fault==='extraPatch'&&response.ok)response.value.commonPatch={weeks:[]};
  res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(response));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({ok:false,error:{name:'Error',message:error.message}}));}
});
async function until(predicate,message){const deadline=Date.now()+15000;while(!predicate()){if(Date.now()>deadline)throw Error(message);await new Promise(resolve=>setTimeout(resolve,20));}}
async function ready(page){await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);await page.locator('.vue-diary-page').waitFor();}
async function editor(page){return page.getByRole('textbox',{name:'Cosa ha funzionato?',exact:true});}
async function save(page){await page.getByRole('button',{name:'Salva focus e checkup',exact:true}).click();}
async function clean(page){await page.waitForFunction(()=>!busy&&!dirtyMain);}
async function notice(page,text){await page.waitForFunction(text=>document.querySelector('#message').textContent.includes(text),text);}
async function draft(page){return page.evaluate(()=>({stored:draftRead('week:'+week),version:document.querySelector('.week-writing').dataset.version,dirty:dirtyMain,body:[...document.querySelectorAll('.week-writing textarea')][2].value}));}
(async()=>{
 let browser;const errors=[];let origin;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  async function open(){const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await ready(page);await page.getByRole('button',{name:'Settimana e checkup',exact:true}).click();await page.waitForFunction(()=>view==='week'&&!busy);return page;}
  const page=await open();let area=await editor(page);
  await area.fill('Bozza precedente alla migrazione 🌱');
  const legacyVersion=(await draft(page)).version;assert(!legacyVersion.startsWith('commit-'));migrate();
  await area.evaluate(element=>{element.focus();element.setSelectionRange(2,7);window.syntheticFocusedArea=element;});
  await page.evaluate(async()=>{applyCommonChanges(await api('getCommonState'));render();});
  assert(await page.evaluate(()=>syntheticFocusedArea.isConnected&&document.activeElement===syntheticFocusedArea&&syntheticFocusedArea.selectionStart===2&&syntheticFocusedArea.selectionEnd===7));
  assert.equal((await draft(page)).version,legacyVersion);await save(page);await clean(page);
  assert.equal(row().wins,'Bozza precedente alla migrazione 🌱');assert.equal(row().priorities,seed.priorities);
  await page.getByRole('radiogroup',{name:'Energia percepita',exact:true}).getByRole('radio',{name:'4 · Buona',exact:true}).click();
  await page.getByRole('radiogroup',{name:'Stato del checkup',exact:true}).getByRole('radio',{name:'Completato',exact:true}).click();
  area=await editor(page);await area.fill('Snapshot inviato 🌱');nextSave='hold';await save(page);await until(()=>held,'missing held weekly ACK');
  const sentVersion=held.response.value.commonUpserts.weeks[0].updatedAt;
  await area.evaluate(element=>{window.syntheticLateArea=element;element.value='Modifica successiva all’invio';element.dispatchEvent(new Event('input',{bubbles:true}));});
  held.release();held=null;await page.waitForFunction(()=>!busy);
  const newer=await draft(page);assert(newer.dirty);assert.equal(newer.version,sentVersion);assert.equal(newer.body,'Modifica successiva all’invio');assert.equal(newer.stored.values.wins,newer.body);assert.equal(row().wins,'Snapshot inviato 🌱');
  assert(await page.evaluate(()=>syntheticLateArea.isConnected));await save(page);await clean(page);assert.equal(row().wins,newer.body);assert.equal(row().energy,'4');assert.equal(row().closed,'yes');
  area=await editor(page);await area.fill('Conferma perduta 🌱');nextSave='lost';await save(page);await notice(page,'Risposta persa simulata');await page.waitForFunction(()=>!busy);
  assert((await draft(page)).dirty);const durable=backend.ledger.snapshot();assert.equal(row().wins,'Conferma perduta 🌱');
  await save(page);await clean(page);assert.deepEqual(backend.ledger.snapshot(),durable,'weekly retry reuses ACK');
  area=await editor(page);await area.fill('Bozza da riaprire 🌱');const beforeReload=await draft(page);
  backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);await page.evaluate(()=>go('week'));await page.waitForFunction(()=>view==='week'&&!busy);
  const restored=await draft(page);assert(restored.dirty);assert.equal(restored.body,beforeReload.body);assert.equal(restored.version,beforeReload.version);assert.equal(restored.stored.values.energy,'4');assert.equal(restored.stored.values.closed,'yes');
  await save(page);await clean(page);assert.equal(row().wins,beforeReload.body);
  const other=await open();await (await editor(page)).fill('Variante locale in conflitto');const localVersion=(await draft(page)).version;
  await (await editor(other)).fill('Variante confermata dall’altro browser');await save(other);await clean(other);await other.close();
  await save(page);await notice(page,'modificata altrove');await page.waitForFunction(()=>!busy);
  assert((await draft(page)).dirty);assert.equal((await draft(page)).version,localVersion);assert.equal(row().wins,'Variante confermata dall’altro browser');
  await page.screenshot({path:path.join(root,'artifacts/week-routing-conflict.png'),fullPage:true});
  backend.weekController.setMode({mode:'readOnly',expectedRevision:backend.weekController.status().revision});const readonlyLedger=backend.ledger.snapshot();
  await save(page);await notice(page,'sola lettura');await page.waitForFunction(()=>!busy);assert((await draft(page)).dirty);assert.deepEqual(backend.ledger.snapshot(),readonlyLedger);
  await page.screenshot({path:path.join(root,'artifacts/week-routing-readonly.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.screenshot({path:path.join(root,'artifacts/week-routing-readonly-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1100});
  backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);await page.evaluate(()=>go('week'));await page.waitForFunction(()=>view==='week'&&!busy);
  assert.equal(backend.weekController.status().mode,'readOnly');assert.equal((await draft(page)).body,'Variante locale in conflitto');assert.equal((await draft(page)).version,localVersion);
  assert.equal(await page.evaluate(()=>state.weeks.find(row=>row.week===week).wins),row().wins);assert.notEqual(row().updatedAt,localVersion);
  backend.weekController.setMode({mode:'active',expectedRevision:backend.weekController.status().revision});
  // Explicit test-side conflict resolution changes only the adopted baseline.
  await page.evaluate(()=>{document.querySelector('.week-writing').dataset.version=state.weeks.find(row=>row.week===week).updatedAt;});
  await save(page);await clean(page);assert.equal(row().wins,'Variante locale in conflitto');
  for(const kind of ['invalid','wrongWeek','wrongText','extraPatch']){
   await (await editor(page)).fill('Conferma malformata '+kind+' 🌱');const previous=await page.evaluate(()=>JSON.stringify(state.weeks));
   nextSave=kind;await save(page);await notice(page,'Risposta del checkup non valida');await page.waitForFunction(()=>!busy);assert((await draft(page)).dirty);
   assert.equal(await page.evaluate(()=>JSON.stringify(state.weeks)),previous,'malformed ACK cannot change common state');
   const malformedLedger=backend.ledger.snapshot();await save(page);await clean(page);assert.deepEqual(backend.ledger.snapshot(),malformedLedger);
  }
  const trace=await page.evaluate(async()=>{setPerformanceTracing(true);await api('getCommonState');const report=performanceTraceReport();setPerformanceTracing(false);return report;});
  assert(trace.events.some(event=>event.operation==='getCommonState'&&event.responseBytes>0));for(const text of [row().wins,seed.focus,backend.scope.archiveId,backend.scope.principalId])assert(!JSON.stringify(trace).includes(text),'weekly tracing exports no diary text or identity');
  await (await editor(page)).fill('Bozza da conservare se annullo');
  page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Successiva →',exact:true}).click();
  assert.equal((await draft(page)).body,'Bozza da conservare se annullo');assert((await draft(page)).stored);
  page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Successiva →',exact:true}).click();await page.waitForFunction(()=>!busy&&week==='2026-10-05');
  assert.equal(await page.evaluate(()=>draftRead('week:2026-09-28')),null,'explicit discard removes only this weekly draft');
  await page.getByRole('button',{name:'← Precedente',exact:true}).click();await page.waitForFunction(()=>!busy&&week==='2026-09-28');
  assert.equal((await draft(page)).body,row().wins);assert.equal((await draft(page)).dirty,false);
  assert.equal(JSON.stringify(backend.snapshot().rawSheets.Weeks),frozen,'all weekly legacy preimages frozen');assert(calls.some(call=>call.name==='saveWeek'));
  assert.equal(await page.evaluate(()=>privacyShown),false);assert.deepEqual(errors,[]);
  console.log('Active Weeks browser: old drafts/focus, late ACK edit, lost/malformed ACK retry, tab/server reload, two-client conflicts, persistent readOnly, energy/status, frozen legacy rows and 320/390px layouts OK.');
 }finally{held?.release();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
