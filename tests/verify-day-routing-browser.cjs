const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const root=path.resolve(__dirname,'..'),ids={daysSheetId:10,indexSheetId:11,blockSheetId:12};
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const dates=['2026-10-03','2026-10-04','2026-10-05'],[a,b,c]=dates;
const rich=[{kind:'check',runs:[{text:'☐ Passo sintetico 🌱',bold:true}]}];
let backend=createDayRoutingServer(null,{seedDays:dates.map(date=>({date,intention:'☐ Passo sintetico 🌱',intentionRich:rich,reflection:'Sera originaria '+date,gratitude:'Una pausa'}))});
backend.controller.register(ids);backend.controller.setMode({mode:'active',expectedRevision:1});
function migrate(date){const preview=backend.controller.resolve().preview(date);backend.controller.resolve().migrate({date,expectedLegacy:preview.legacy,operationId:'synthetic-browser-migrate-'+date});}
migrate(b);migrate(c);
const frozen=JSON.stringify(backend.snapshot().days),row=date=>backend.controller.resolve().readRows([{from:date,to:date}])[0];
let nextSave=null,held=null;const calls=[];
const bridge=`window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({},{get:(_,name)=>arg=>{fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arg})}).then(r=>r.json()).then(response=>{if(response.ok)success(response.value);else failure(Object.assign(new Error(response.error.message),{name:response.error.name}));}).catch(failure);}});}};}}}};`;
const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('</script>','</script><script>'+bridge+'</script>');
const allowed=new Set(['getState','getCommonState','getJournalPage','getJournalContents','getEntryDetail','getSyncManifest','saveDays','saveDay','traceApi']);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/Demo.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  if(req.url==='/Changelog.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Changelog.html')));return;}
  if(req.url!=='/rpc'||req.method!=='POST'){res.writeHead(404).end();return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Synthetic request too large');}
  const {name,arg}=JSON.parse(raw);if(!allowed.has(name))throw Error('Synthetic RPC not allowed');calls.push({name,arg});
  const fault=name==='saveDays'?nextSave:null;if(fault)nextSave=null;
  let response;try{response={ok:true,value:JSON.parse(JSON.stringify(await backend.ctx[name](arg)))};}catch(error){response={ok:false,error:{name:error.name,message:error.message}};}
  if(fault==='hold')await new Promise(resolve=>{held={release:resolve,response};});
  if(fault==='lost'&&response.ok)response={ok:false,error:{name:'Error',message:'Risposta persa simulata dopo commit'}};
  if(fault==='invalid'&&response.ok)response={ok:true,value:{results:[],commonUpserts:{days:[]}}};
  res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(response));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({ok:false,error:{name:'Error',message:error.message}}));}
});
async function until(predicate,message){const deadline=Date.now()+15000;while(!predicate()){if(Date.now()>deadline)throw Error(message);await new Promise(resolve=>setTimeout(resolve,20));}}
async function ready(page){await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);await page.locator('.vue-diary-page').waitFor();}
async function editor(page,date,field='reflection'){
 const section=page.locator('.diary-day[data-diary-date="'+date+'"] .daily-section[data-section="'+field+'"]');
 const label=field==='reflection'?'fine giornata':'inizio giornata',expand=section.getByRole('button',{name:'Espandi '+label,exact:true});
 if(await expand.isVisible())await expand.click();return section.getByRole('textbox',{name:'Testo '+label,exact:true});
}
async function save(page){await page.getByRole('button',{name:'Salva pagina',exact:true}).click();}
async function clean(page){await page.waitForFunction(()=>!busy&&!dirtyMain);}
async function notice(page,text){await page.waitForFunction(text=>document.querySelector('#message').textContent.includes(text),text);}
async function draft(page,date){return page.evaluate(date=>{const block=dailyDrafts.get(date+':reflection');return {body:block?.body,dirty:block?.dirty,version:block?.updatedAt,stored:draftRead('daily:'+date+':reflection')};},date);}
(async()=>{
 let browser;const errors=[];let origin;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  async function open(){const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await ready(page);return page;}
  const page=await open();let area=await editor(page,a);
  // A real draft is opened before migration; remote revalidation retains it.
  await area.fill('Bozza precedente alla migrazione 🌱');
  const legacyVersion=(await draft(page,a)).version;assert(!legacyVersion.startsWith('commit-'));migrate(a);
  await area.evaluate(element=>{element.focus();const node=document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode(),range=document.createRange();range.setStart(node,2);range.setEnd(node,7);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);window.syntheticFocusedArea=element;});
  await page.evaluate(async()=>{applyCommonChanges(await api('getCommonState'));renderContinuous($('content'));await window.BulletJournalVue.whenRendered();});
  assert(await page.evaluate(()=>syntheticFocusedArea.isConnected&&document.activeElement===syntheticFocusedArea&&getSelection().toString()==='zza p'));
  assert.equal((await draft(page,a)).version,legacyVersion);await save(page);await clean(page);
  assert.equal(row(a).reflection,'Bozza precedente alla migrazione 🌱');assert.equal(row(a).gratitude,'Una pausa');assert(JSON.parse(row(a).intentionRich)[0].runs[0].bold);
  // A late editor event during an ACK must remain dirty on the new baseline.
  area=await editor(page,a);await area.fill('Snapshot inviato 🌱');nextSave='hold';await save(page);await until(()=>held,'missing held ACK');
  const sentVersion=held.response.value.commonUpserts.days[0].updatedAt;
  await page.evaluate(date=>{const block=dailyDrafts.get(date+':reflection');block.editor.set(plainRich('Modifica successiva all’invio'));dailyDirty(block);},a);
  held.release();held=null;await page.waitForFunction(()=>!busy);
  const newer=await draft(page,a);assert(newer.dirty);assert.equal(newer.version,sentVersion);assert.equal(newer.body,'Modifica successiva all’invio');assert.equal(newer.stored.body,newer.body);assert.equal(row(a).reflection,'Snapshot inviato 🌱');
  await save(page);await clean(page);assert.equal(row(a).reflection,newer.body);
  // A lost ACK after commit preserves the draft; retry makes no new ledger data.
  area=await editor(page,a);await area.fill('Conferma perduta 🌱');nextSave='lost';await save(page);await notice(page,'Risposta persa simulata');await page.waitForFunction(()=>!busy);
  assert((await draft(page,a)).dirty);const durable=backend.ledger.snapshot();assert.equal(row(a).reflection,'Conferma perduta 🌱');
  await save(page);await clean(page);assert.deepEqual(backend.ledger.snapshot(),durable,'same partial payload reuses its ACK');
  // Persist an unsent rich draft in the tab, restart the server, then reload.
  area=await editor(page,a);await area.fill('Bozza da riaprire 🌱');await page.evaluate(date=>{const block=dailyDrafts.get(date+':reflection');block.editor.set([{kind:'p',runs:[{text:block.body,italic:true}]}]);dailyDirty(block);},a);
  const beforeReload=await draft(page,a);backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);
  const restored=await draft(page,a);assert(restored.dirty);assert.equal(restored.body,beforeReload.body);assert.equal(restored.version,beforeReload.version);assert(restored.stored.rich[0].runs[0].italic);
  await save(page);await clean(page);assert(JSON.parse(row(a).reflectionRich)[0].runs[0].italic);
  // Two browser clients edit the same version; an independent day still saves.
  const other=await open();area=await editor(page,a);await area.fill('Variante locale in conflitto');const localVersion=(await draft(page,a)).version;
  await (await editor(other,a)).fill('Variante confermata dall’altro browser');await save(other);await clean(other);await other.close();
  await (await editor(page,b)).fill('Giornata indipendente confermata');await save(page);await notice(page,'(conflitto)');await page.waitForFunction(()=>!busy);
  assert((await draft(page,a)).dirty);assert.equal((await draft(page,a)).version,localVersion);assert(!(await draft(page,b)).dirty);assert.equal(row(a).reflection,'Variante confermata dall’altro browser');assert.equal(row(b).reflection,'Giornata indipendente confermata');
  await page.screenshot({path:path.join(root,'artifacts/day-routing-conflict.png'),fullPage:true});
  // readOnly survives a server restart/reload without exposing frozen rows.
  const status=backend.controller.status();backend.controller.setMode({mode:'readOnly',expectedRevision:status.revision});const readonlyLedger=backend.ledger.snapshot();
  await save(page);await notice(page,'sola lettura');await page.waitForFunction(()=>!busy);assert((await draft(page,a)).dirty);assert.deepEqual(backend.ledger.snapshot(),readonlyLedger);
  await page.screenshot({path:path.join(root,'artifacts/day-routing-readonly.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.screenshot({path:path.join(root,'artifacts/day-routing-readonly-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1100});
  backend=createDayRoutingServer(backend.snapshot());await page.reload();await ready(page);assert.equal(backend.controller.status().mode,'readOnly');assert.equal((await draft(page,a)).body,'Variante locale in conflitto');assert.equal((await draft(page,a)).version,localVersion);
  assert.equal(await page.evaluate(date=>state.days.find(row=>row.date===date).reflection,a),row(a).reflection);assert.notEqual(row(a).updatedAt,localVersion);
  // Explicit test-side adoption of the remote base, without changing draft text.
  backend.controller.setMode({mode:'active',expectedRevision:backend.controller.status().revision});
  await page.evaluate(date=>{const block=dailyDrafts.get(date+':reflection');block.updatedAt=state.days.find(row=>row.date===date).updatedAt;draftWrite('daily:'+date+':reflection',{...block,editor:undefined});},a);
  await save(page);await clean(page);assert.equal(row(a).reflection,'Variante locale in conflitto');
  // A malformed ACK after commit cannot discard a rich draft either.
  await (await editor(page,c)).fill('Conferma malformata 🌱');nextSave='invalid';await save(page);await notice(page,'Risposta del lotto non valida');await page.waitForFunction(()=>!busy);assert((await draft(page,c)).dirty);
  const malformedLedger=backend.ledger.snapshot();await save(page);await clean(page);assert.deepEqual(backend.ledger.snapshot(),malformedLedger);
  const trace=await page.evaluate(async()=>{setPerformanceTracing(true);await api('getCommonState');const report=performanceTraceReport();setPerformanceTracing(false);return report;});
  assert(trace.events.some(event=>event.operation==='getCommonState'&&event.responseBytes>0));for(const text of [row(a).reflection,row(b).reflection,row(c).reflection,backend.scope.archiveId,backend.scope.principalId])assert(!JSON.stringify(trace).includes(text),'active-path tracing exports no diary text or identity');
  assert.equal(JSON.stringify(backend.snapshot().days),frozen,'all migrated legacy preimages remain frozen');assert(calls.filter(call=>call.name==='saveDays').some(call=>call.arg.days.length===2));
  for(const width of [390,320]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.screenshot({path:path.join(root,'artifacts/day-routing-mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>privacyShown),false);assert.deepEqual(errors,[]);
  console.log('Active Days browser: pre-migration rich drafts/focus, late edit during ACK, lost/malformed ACK retry, fresh server/tab reload, two-client conflict and partial success, persistent readOnly, frozen legacy rows and 320/390px layouts OK.');
 }finally{held?.release();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
