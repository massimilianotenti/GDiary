const assert=require('assert'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!continuousLoading&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  window.lazySeed=[];
  for(let at=0;at<60;at+=25){const result=await api('saveJournalPage',{month:'2026-07',blocks:Array.from({length:Math.min(25,60-at)},(_,n)=>{const i=at+n,body=i===58?'needle-lazy-final':'Corpo differito '+i;return {clientId:'lazy-task-browser-'+i,date:'2026-07-10',type:'task',title:'Task lazy '+i,body,rich:[{kind:'p',runs:[{text:body,bold:true}]}],status:'open',importance:i===0?'emergency':'normal',projects:'',tags:i===57?'privato,lazy-private':'lazy',position:i+1};})});lazySeed.push(...result.entries);}
  window.lazyOriginal=api;window.lazyGates=[];window.lazyRequests=[];window.lazySaves=0;window.lazyInFlight=0;window.lazyMax=0;
  api=async(name,arg,...rest)=>{if(name==='saveJournalPage')lazySaves++;if(name!=='getJournalContents')return lazyOriginal(name,arg,...rest);lazyRequests.push(arg);lazyInFlight++;lazyMax=Math.max(lazyMax,lazyInFlight);try{return await new Promise((resolve,reject)=>lazyGates.push({resolve,reject,arg,rest}));}finally{lazyInFlight--;}};
 });
 const waitGate=()=>page.waitForFunction(()=>lazyGates.length===1);
 const release=()=>page.evaluate(async()=>{const g=lazyGates.shift();try{g.resolve(await lazyOriginal('getJournalContents',g.arg,...g.rest));}catch(error){g.reject(error);}});
 const drain=async()=>{for(let i=0;i<15;i++){await page.waitForFunction(()=>lazyGates.length>0||!taskContentsFlight);if(!await page.evaluate(()=>lazyGates.length))return;await release();}throw Error('body queue did not stop');};
 const open=async()=>{await page.evaluate(()=>go('tasks'));await page.waitForFunction(()=>taskDiary&&continuousSession?.complete&&!continuousLoading&&!busy);};
 await open();assert.equal(await page.evaluate(()=>lazyRequests.length),0,'initial list makes no body requests');
 assert.equal(await page.locator('.diary-task-results .rich-toolbar').count(),0,'unloaded metadata rows do not build rich toolbars');
 assert(await page.evaluate(()=>continuousSession.blocks.filter(b=>lazySeed.some(e=>e.id===b.id)).every(b=>b.contentLoaded===false)));
 const first=page.locator('.diary-task-results .continuous-block').first(),title=first.locator('.continuous-title');
 await first.locator('.continuous-collapse').click();await waitGate();assert.equal(await page.evaluate(()=>lazyGates[0].arg.items.length),1);
 await title.fill('Titolo modificato durante lettura');await title.evaluate(el=>{el.focus();el.setSelectionRange(2,9);window.lazyTitle=el;window.lazyNode=el.closest('.continuous-block');});
 await release();await page.waitForFunction(()=>continuousSession.blocks.find(b=>b.title==='Titolo modificato durante lettura')?.contentLoaded===true&&!taskContentsFlight);
 assert(await title.evaluate(el=>el===lazyTitle&&el===document.activeElement&&el.selectionStart===2&&el.selectionEnd===9));assert(await first.evaluate(el=>el===lazyNode));
 assert.equal(await first.locator('.rich-area').innerText(),'Corpo differito 0');assert.equal(await page.evaluate(()=>continuousSession.blocks.find(b=>b.title==='Titolo modificato durante lettura').dirty),true);
 for(const palette of ['warm','sage','slate','dark','plum'])for(const width of [320,390]){await page.setViewportSize({width,height:1000});await page.evaluate(value=>applyPalette(value),palette);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'deferred body mobile overflow');}await page.setViewportSize({width:1440,height:1000});
 await first.locator('.rich-area').fill('Corpo modificato dopo caricamento');await page.evaluate(()=>saveNotesContinuous());await page.waitForFunction(()=>!busy&&!dirtyMain);
 assert(await page.evaluate(()=>docContent_(continuousSession.blocks.find(b=>b.title==='Titolo modificato durante lettura').id).body==='Corpo modificato dopo caricamento'),'promoted rich editor saves edits');
 // Saving an unloaded metadata draft must hydrate first and preserve all body text.
 await page.evaluate(()=>{const b=continuousSession.blocks.find(b=>b.contentLoaded===false&&lazySeed.some(e=>e.id===b.id)&&!privateEntry(b));window.lazyEditId=b.id;b.title='Modifica prima di caricare il corpo';b.dirty=true;dirtyMain=true;window.lazySaveBefore=lazySaves;window.lazySavePromise=saveNotesContinuous();});
 await waitGate();assert.equal(await page.evaluate(()=>lazySaves),await page.evaluate(()=>lazySaveBefore));
 await page.evaluate(()=>{continuousSession.blocks.find(b=>b.id===lazyEditId).title='Modifica più recente durante lettura';});await release();await page.evaluate(()=>lazySavePromise);await page.waitForFunction(()=>!busy&&!dirtyMain);
 assert(await page.evaluate(()=>{const b=continuousSession.blocks.find(b=>b.id===lazyEditId),original=lazySeed.find(e=>e.id===b.id),c=docContent_(b.id);return b.title==='Modifica più recente durante lettura'&&c.body===original.body&&c.rich[0].runs[0].bold===true;}));
 // Searching only in a body is partial until all relevant descriptions are read.
 const search=page.getByRole('textbox',{name:'Cerca nei task',exact:true});await search.fill('needle-lazy-final');await search.press('Enter');await waitGate();
 assert((await page.locator('.diary-load-state').innerText()).includes('parziali'));assert((await page.locator('.diary-empty').innerText()).includes('tra le voci caricate'));
 await page.evaluate(()=>lazyGates.shift().reject(Error('Errore descrizioni simulato')));await drain();
 await page.waitForFunction(()=>!taskContentsFlight&&taskTextSearchPartial(continuousSession));assert(await page.getByRole('button',{name:'Riprova ricerca nei testi',exact:true}).isVisible());
 await page.getByRole('button',{name:'Riprova ricerca nei testi',exact:true}).click();await waitGate();await drain();await page.waitForFunction(()=>!taskContentsFlight&&!taskTextSearchPartial(continuousSession));
 assert.equal(await page.locator('.diary-task-results .continuous-title').inputValue(),'Task lazy 58');assert(!(await page.locator('body').innerText()).includes('lazy-private'));
 assert(await page.evaluate(()=>lazyRequests.every(r=>r.items.length<=25&&!r.items.some(item=>lazySeed.find(e=>e.id===item.id)?.tags.includes('privato')))),'hidden private bodies are not searched');
 // Cancelling a search stops subsequent batches; the current reply remains harmless.
 await open();const beforeCancel=await page.evaluate(()=>lazyRequests.length);await search.fill('cancel-search');await search.press('Enter');await waitGate();await search.fill('');await search.press('Enter');await release();await page.waitForFunction(()=>!taskContentsFlight);assert.equal(await page.evaluate(()=>lazyRequests.length),beforeCancel+1);
 // Leaving during a body request must not patch the next view.
 const unloadedId=await page.evaluate(()=>continuousSession.blocks.find(b=>b.contentLoaded===false&&!privateEntry(b)).clientId);
 await page.locator('[data-client-id="'+unloadedId+'"] .continuous-collapse').click();await waitGate();await page.evaluate(()=>go('settings'));await page.waitForFunction(()=>view==='settings'&&!busy);await release();await page.waitForFunction(()=>!taskContentsFlight);assert.equal(await page.evaluate(()=>view),'settings');
 // An incomplete restored draft is reconciled without replacing its newer title.
 await page.evaluate(()=>{const e=lazySeed[10],b=continuousBlock({...e,body:undefined,rich:undefined,contentLoaded:false});b.title='Bozza metadata ripristinata';b.dirty=true;draftWrite('continuous:tasks:archive',{blocks:[b]});});
 await open();await waitGate();await release();await page.waitForFunction(()=>!taskContentsFlight&&continuousSession.blocks.find(b=>b.title==='Bozza metadata ripristinata')?.contentLoaded===true);
 assert(await page.evaluate(()=>{const b=continuousSession.blocks.find(b=>b.title==='Bozza metadata ripristinata');return b.dirty&&b.body===lazySeed[10].body&&b.originalBody===lazySeed[10].body;}));
 await page.evaluate(()=>saveNotesContinuous());await page.waitForFunction(()=>!busy&&!dirtyMain);
 // Version conflicts retain a metadata draft and never send a blank-body save.
 await open();await page.evaluate(()=>{const b=continuousSession.blocks.find(b=>b.contentLoaded===false&&!privateEntry(b));window.lazyConflictId=b.id;b.title='Bozza da conservare dopo conflitto';b.dirty=true;dirtyMain=true;const row=findRows_(mockSheets.Entries,1,b.id,false)[0];mockSheets.Entries.data[row-1][8]='2030-01-01T00:00:00.000Z';window.lazyConflictSaves=lazySaves;window.lazyConflictPromise=saveNotesContinuous();});
 await waitGate();await release();await page.evaluate(()=>lazyConflictPromise);assert.equal(await page.evaluate(()=>lazySaves),await page.evaluate(()=>lazyConflictSaves));assert(await page.evaluate(()=>dirtyMain&&continuousSession.blocks.find(b=>b.id===lazyConflictId).title==='Bozza da conservare dopo conflitto'));
 assert.equal(await page.evaluate(()=>lazyMax),1);assert.deepEqual(errors,[]);
 console.log('Deferred tasks browser: body-free list, lazy opening, stable focus/selection, pre-save hydration, newer edits, partial body search/retry/privacy, cancellation, stale views, draft restore and conflict safety OK');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
