const assert=require('assert'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!continuousLoading&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  window.indexSeed=[];
  for(let at=0;at<400;at+=25){const result=await api('saveJournalPage',{month:'2026-07',blocks:Array.from({length:25},(_,n)=>{const i=at+n;return {clientId:'index-browser-fixture-'+i,date:'2026-07-10',type:'task',title:'Task indice '+i,body:'Corpo indice '+i,rich:[{kind:'p',runs:[{text:'Corpo indice '+i,bold:true}]}],status:'open',importance:i===0?'emergency':'normal',projects:'',tags:'indice',position:i+1};})});indexSeed.push(...result.entries);}
  setPerformanceTracing(true);window.indexOriginal=api;window.indexGates=[];window.indexRequests=[];window.indexFlight=0;window.indexMax=0;
  api=async(name,arg,...rest)=>{if(name!=='getJournalPage'||!arg.metadataOnly||!arg.cursor)return indexOriginal(name,arg,...rest);indexRequests.push(arg);indexFlight++;indexMax=Math.max(indexMax,indexFlight);try{return await new Promise((resolve,reject)=>indexGates.push({arg,rest,resolve,reject}));}finally{indexFlight--;}};
 });
 const waitGate=()=>page.waitForFunction(()=>indexGates.length===1);
 const release=()=>page.evaluate(async()=>{const g=indexGates.shift();try{g.resolve(await indexOriginal('getJournalPage',g.arg,...g.rest));}catch(error){g.reject(error);}});
 const drain=async()=>{for(let i=0;i<6;i++){await page.waitForFunction(()=>indexGates.length||!continuousLoading);if(!await page.evaluate(()=>indexGates.length))return;await release();}throw Error('pagination did not finish');};
 const open=async()=>{await page.evaluate(()=>go('tasks'));await waitGate();await page.waitForFunction(()=>continuousSession?.loaded&&!busy);};
 await open();assert(await page.evaluate(()=>!!indexGates[0].arg.taskSnapshot&&indexGates[0].arg.snapshotOffset===200));
 const first=page.locator('.diary-task-results .continuous-title').first();await first.fill('Bozza durante perdita cache');await first.evaluate(el=>window.indexDraftNode=el);
 await page.evaluate(()=>demoScriptCache.delete(taskIndexKey_(indexGates[0].arg.taskSnapshot,'manifest')));await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession?.snapshotReset==='missing');
 assert.equal(await first.inputValue(),'Bozza durante perdita cache');assert.equal(await page.evaluate(()=>continuousSession.complete),false);assert(await page.getByRole('button',{name:'Aggiorna elenco Task',exact:true}).isVisible());
 await page.getByRole('button',{name:'Aggiorna elenco Task',exact:true}).click();await waitGate();assert(await page.evaluate(()=>indexGates[0].arg.snapshotDisabled===true&&!indexGates[0].arg.taskSnapshot));
 assert(await first.evaluate(el=>el===indexDraftNode));await drain();await page.waitForFunction(()=>continuousSession.complete&&!continuousLoading&&!taskContentsFlight);
 assert(await page.evaluate(()=>{const b=continuousSession.blocks.find(b=>b.title==='Bozza durante perdita cache');return b.dirty&&b.body==='Corpo indice 0'&&b.originalBody===b.body;}));
 assert.equal(await page.evaluate(()=>new Set(continuousSession.blocks.map(b=>b.id)).size),await page.evaluate(()=>continuousSession.blocks.length));
 await page.evaluate(()=>saveNotesContinuous());await page.waitForFunction(()=>!busy&&!dirtyMain);
 // A write from another client must invalidate the continuation and re-read
 // the changed record on a fresh snapshot, not mix old and new page orders.
 await open();const old=await page.evaluate(()=>indexGates[0].arg.taskSnapshot);
 await page.evaluate(()=>{const e=indexSeed[350];setEntryTags({id:e.id,updatedAt:e.updatedAt,tags:'indice-nuovo'});});await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession.snapshotReset==='changed');
 await page.getByRole('button',{name:'Aggiorna elenco Task',exact:true}).click();await waitGate();assert(await page.evaluate(token=>indexGates[0].arg.taskSnapshot&&indexGates[0].arg.taskSnapshot!==token,old));
 await drain();await page.waitForFunction(()=>continuousSession.complete&&!continuousLoading);
 assert(await page.evaluate(()=>continuousSession.blocks.find(b=>b.id===indexSeed[350].id).tags==='indice-nuovo'));
 assert(await page.evaluate(()=>timings.some(e=>e.operation==='getJournalPage'&&e.taskIndexHits===1&&!e.sheetReadRequests)));
 assert(await page.evaluate(()=>timings.some(e=>e.operation==='getJournalPage'&&e.outcome==='partial'&&e.taskIndexResets===1)));
 assert(!/mock-db|mock-root|Task indice|index-browser-fixture/.test(JSON.stringify(await page.evaluate(()=>performanceTraceReport()))));
 // Late cached responses are ignored after leaving the session.
 await open();await page.evaluate(()=>go('settings'));await page.waitForFunction(()=>view==='settings'&&!busy);await release();await page.waitForFunction(()=>!continuousLoading);
 assert.equal(await page.evaluate(()=>view),'settings');assert.equal(await page.locator('.diary-task-results').count(),0);assert.equal(await page.evaluate(()=>indexMax),1);assert.deepEqual(errors,[]);
 console.log('Task index browser: versioned continuation, cache-loss fallback, retained draft/node/body, cross-client invalidation, fresh restart, no duplicates, sanitized tracing and stale view responses OK');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
