const assert=require('assert'),path=require('path'),fs=require('fs'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 try{
  const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);
  await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
  assert.equal(await page.evaluate(()=>performanceTracingEnabled()),false);
  assert.equal(await page.evaluate(()=>timings.length),0);
  await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>view==='settings'&&!busy);
  await page.getByRole('button',{name:'Attiva tracing',exact:true}).click();
  assert.equal(await page.evaluate(()=>dirtyMain),false);
  await page.evaluate(async()=>{
   MockItem.prototype.getLastUpdated=function(){return new Date(1000);};
   await api('getJournalPage',{month:'2026-10'});
   try{await api('saveJournalPage',{month:'invalid',blocks:[],body:'SECRET-BODY',title:'SECRET-TITLE',tags:'SECRET-TAG',id:'SECRET-DRIVE'});}catch(e){}
   recordTiming('getState',performance.now(),{performance:{totalMs:1,title:'SECRET-TITLE',body:'SECRET-BODY',tags:'SECRET-TAG',evilMs:'SECRET-DRIVE',entriesMs:Infinity} },false,{traceId:newTraceId()});
  });
  const report=await page.evaluate(()=>performanceTraceReport());
  assert(report.events.some(e=>e.operation==='getJournalPage'&&e.totalMs>=0&&e.clientMs>=0&&e.responseBytes>0));
  assert(report.events.some(e=>e.operation==='saveJournalPage'&&e.outcome==='error'));
  assert(report.events.some(e=>e.operation==='render'));
  assert(!JSON.stringify(report).includes('SECRET'));
  assert.equal(report.measurementVersion,2);
  assert(report.events.some(e=>e.operation==='getJournalPage'&&e.cacheGetAllCalls===1&&e.unaccountedMs>=0));
  assert(report.events.some(e=>e.operation==='getJournalPage'&&e.driveInsideCalls>0&&e.driveParentsCalls>0&&e.driveTrashCalls>0&&e.driveInsideNodes>0));
  assert(report.events.some(e=>e.operation==='getJournalPage'&&e.docContentBatchCalls===1&&e.contentBatchEntries>0&&e.contentBatchSearchCalls===1));
  await page.evaluate(async()=>{rememberView();forceCommon=true;try{await run('getState');}finally{forceCommon=false;}});
  assert.equal(await page.evaluate(()=>timings.filter(e=>e.operation==='getState').length),2,'one synthetic privacy event plus one actual RPC');
  assert((await page.evaluate(()=>timings.filter(e=>e.operation==='getState'))).every(e=>!e.cache),'remote reread must not be marked as local cache');
  await page.getByRole('button',{name:'Confronta cache get/getAll',exact:true}).click();
  await page.waitForFunction(()=>timings.some(e=>e.operation==='benchmarkJournalCache'));
  assert(await page.evaluate(()=>timings.some(e=>e.operation==='benchmarkJournalCache'&&e.benchmarkRounds===5&&e.cacheBenchBulkCalls===5)));
  await page.evaluate(async()=>{try{await traceSaveAction_(async()=>{await api('saveDay',{date:'2026-09-01',updatedAt:'',intention:'Test diagnostico simulato'});await api('saveDay',{date:'invalid',updatedAt:'',intention:''});});}catch(e){}});
  const actionEvents=await page.evaluate(()=>performanceTraceReport().events);
  const action=actionEvents.find(e=>e.operation==='saveContinuous');assert(action&&action.batchesCount===2&&action.completedBatches===1&&action.failedBatches===1&&action.outcome==='partial');
  assert.equal(actionEvents.filter(e=>e.operation==='saveDay'&&e.actionId===action.traceId).length,2);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Esporta misure',exact:true}).click();
  const download=await downloadPromise,exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.format,'gdiary-performance-trace/v1');assert(exported.events.length>0);
  await page.evaluate(()=>go('tasks'));
  await page.waitForFunction(()=>taskDiary&&continuousSession?.loaded&&!continuousLoading&&!busy);
  const navigation=await page.evaluate(()=>timings.find(e=>e.operation==='journalNavigation'));
  assert(navigation&&navigation.outcome==='ok'&&navigation.pagesCount>=1);
  assert(await page.evaluate(id=>timings.some(e=>e.operation==='getJournalPage'&&e.actionId===id&&e.pageIndex===1),navigation.traceId));
  await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>view==='settings'&&!busy);
  await page.getByRole('button',{name:'Cancella misure',exact:true}).click();
  assert((await page.evaluate(()=>timings)).every(e=>e.operation==='render'));
  await page.evaluate(async()=>{const flight=api('getJournalPage',{month:'2026-10'});setPerformanceTracing(false);await flight;});
  assert.equal(await page.evaluate(()=>timings.length),0);
  await page.reload();await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
  assert.equal(await page.evaluate(()=>performanceTracingEnabled()),false);
  assert.equal(await page.evaluate(()=>timings.length),0);assert.deepEqual(errors,[]);
  console.log('Tracing browser: opt-in, rendering, RPC/errors, sanitized JSON download, clear/disable in flight and reload OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
