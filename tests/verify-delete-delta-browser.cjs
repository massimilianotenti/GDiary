const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},original=api;
  const created=saveJournalPage({month,blocks:[{clientId:'delete-browser-target-01',date:'2026-10-03',type:'task',title:'Da eliminare',body:'Descrizione',rich:plainRich_('Descrizione'),status:'open',position:500},{clientId:'delete-browser-foreign-01',date:'2026-10-03',type:'note',title:'Da conservare',body:'Contenuto estraneo',rich:plainRich_('Contenuto estraneo'),position:600}]}).entries;
  const [target,foreign]=created,dirty=continuousBlock(foreign);dirty.body='Bozza estranea 🌱';dirty.rich=plainRich(dirty.body);dirty.dirty=true;
  const key=continuousSession.key;continuousSession={...continuousSession,blocks:[continuousBlock(target),dirty]};continuousDraft();
  const day=dailyBlock('2026-10-03','reflection');day.body='Riflessione da conservare';day.rich=plainRich(day.body);day.dirty=true;draftWrite('daily:'+day.date+':'+day.field,{...day,editor:undefined});
  state.entries=[target,foreign];state.files=[{id:'target-file',entryId:target.id},{id:'foreign-file',entryId:foreign.id}];state.taskPlans=[{entryId:target.id,date:target.date},{entryId:foreign.id,date:foreign.date}];
  archiveResults=[target,foreign];entryId=target.id;previewCache.set(target.id,{excerpt:'Rimossa'});previewCache.set(foreign.id,{excerpt:'Conservata'});viewCache.set('stale-view',{data:structuredClone(state),at:Date.now()});
  view='settings';const oldSession=continuousSession,calls=[];api=async(name,...args)=>{calls.push(name);return original(name,...args);};
  check(await run('deleteNote',{id:target.id,updatedAt:target.updatedAt}),'delete acknowledged');
  check(calls.join(',')==='deleteNote','one mutation RPC, no full-state reread in settings');
  check(!state.entries.some(e=>e.id===target.id)&&state.entries.some(e=>e.id===foreign.id),'canonical entry removed, foreign retained');
  check(state.files.length===1&&state.files[0].entryId===foreign.id&&state.taskPlans.length===1&&state.taskPlans[0].entryId===foreign.id,'local links and schedules pruned by owner');
  check(archiveResults.length===1&&archiveResults[0].id===foreign.id&&entryId==='','archive and selected detail pruned');
  check(![...viewCache.values()].some(v=>v.data.entries.some(e=>e.id===target.id))&&!previewCache.has(target.id),'cached deleted record removed');
  check(continuousSession!==oldSession&&continuousSession.blocks.includes(dirty)&&dirty.body==='Bozza estranea 🌱'&&dirty.dirty,'new session identity retains foreign draft objects');
  check(draftRead('continuous:'+key).blocks.some(b=>b.id===foreign.id&&b.body===dirty.body)&&dailyDrafts.get(day.date+':'+day.field)===day&&draftRead('daily:'+day.date+':'+day.field),'continuous and daily stored drafts preserved');
  calls.length=0;check(await run('deleteNote',{id:target.id,updatedAt:target.updatedAt})&&calls.join(',')==='deleteNote','already absent retry still removes canonically without reread');
  const before=JSON.stringify(state.entries);check(!(await run('deleteNote',{id:foreign.id,updatedAt:'stale'}))&&JSON.stringify(state.entries)===before&&dirty.body==='Bozza estranea 🌱','failed deletion leaves canonical data and drafts intact');
  const uncertain=saveJournalPage({month,blocks:[{clientId:'delete-browser-lost-001',date:'2026-10-03',type:'note',title:'Conferma persa',body:'Contenuto',rich:plainRich_('Contenuto'),position:900}]}).entries[0];state.entries.push(uncertain);
  api=async(name,...args)=>{const value=await original(name,...args);if(name==='deleteNote')throw Error('Risposta perduta dopo la cancellazione');return value;};
  check(!(await run('deleteNote',{id:uncertain.id,updatedAt:uncertain.updatedAt}))&&state.entries.some(e=>e.id===uncertain.id),'lost ACK does not remove local data prematurely');
  api=original;check(await run('deleteNote',{id:uncertain.id,updatedAt:uncertain.updatedAt}),'retry after lost delete ACK');
  check(!state.entries.some(e=>e.id===uncertain.id)&&continuousSession.blocks.includes(dirty),'already-absent ACK completes lost-response retry while preserving drafts');
 });
 // An in-flight page containing the soon-to-be-deleted record must not revive it.
 const second=await browser.newPage();await second.route('https://**/*',r=>r.abort());second.on('pageerror',e=>errors.push(e.message));await second.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await second.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await second.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},original=api,target=continuousSession.blocks.find(b=>b.id);
  let release,ready;const started=new Promise(resolve=>{ready=resolve;}),hold=new Promise(resolve=>{release=resolve;});
  api=async(name,...args)=>{const result=await original(name,...args);if(name==='getJournalPage'){ready();await hold;}return result;};
  const oldSession=continuousSession,pending=loadContinuous($('content'));await started;
  const result=await original('deleteNote',{id:target.id,updatedAt:target.updatedAt});applyCommonChanges(result);
  check(continuousSession!==oldSession,'old page session invalidated before reply');
  api=original;release();await pending;
  while(continuousLoading)await new Promise(resolve=>setTimeout(resolve,5));
  check(!continuousSession?.blocks.some(b=>b.id===target.id)&&!state.entries.some(e=>e.id===target.id),'late page cannot resurrect deletion');
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Delete delta browser: canonical entry/files/plans/archive/cache pruning, one RPC, already-absent retry, failures preserve drafts, foreign continuous/daily draft identity and late-page cancellation OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
