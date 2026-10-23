const assert=require('assert'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!continuousLoading&&!busy&&commonReadAt>0);
 await page.evaluate(()=>{
  setPerformanceTracing(true);window.progressOriginal=api;window.progressGates=[];window.progressInFlight=0;window.progressMax=0;window.progressRequests=[];
  window.progressRows=Array.from({length:59},(_,i)=>({id:'progress-entry-'+i,clientId:'progress-entry-'+i,date:'2026-07-'+String(1+i%28).padStart(2,'0'),createdAt:'2026-07-01T12:00:00Z',updatedAt:'2026-07-01T12:00:00Z',type:'task',text:'Task progressivo '+i,body:i===58?'parola-finale':'Corpo '+i,rich:[{kind:'p',runs:[{text:i===58?'parola-finale':'Corpo '+i}]}],richUnsupported:false,status:'open',importance:'normal',due:'',projects:'',tags:i===57?'privato,segreto-progressivo':'test',position:i}));
  api=async(name,arg,...rest)=>{if(name!=='getJournalPage'||!arg.taskOnly)return progressOriginal(name,arg,...rest);progressRequests.push({...arg});progressInFlight++;progressMax=Math.max(progressMax,progressInFlight);try{return await new Promise((resolve,reject)=>progressGates.push({resolve,reject,arg}));}finally{progressInFlight--;}};
 });
 const waitGate=()=>page.waitForFunction(()=>progressGates.length===1);
 const release=()=>page.evaluate(()=>{const g=progressGates.shift(),start=g.arg.cursor?Number(g.arg.cursor.slice(9)):0,end=Math.min(59,start+25);g.resolve({entries:progressRows.slice(start,end).map(e=>({...e})),total:59,nextCursor:end<59?'progress-'+end:'',nextEntry:null});});
 const open=async()=>{await page.evaluate(()=>go('tasks'));await waitGate();};
 await open();await release();await waitGate();await page.waitForSelector('.diary-load-state[aria-busy=true]');
 await page.waitForFunction(()=>document.querySelectorAll('.diary-task-results .continuous-block').length===25);assert.equal(await page.locator('.diary-task-results .continuous-block').count(),25);assert((await page.locator('.diary-task-filters').innerText()).includes('parziali'));
 for(const palette of ['warm','sage','slate','dark'])for(const width of [320,390]){await page.evaluate(p=>applyPalette(p),palette);await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'partial layout '+palette+' '+width);}await page.setViewportSize({width:1440,height:1000});
 const first=page.locator('.diary-task-results .continuous-block').first(),title=first.locator('.continuous-title');
 await title.fill('Bozza durante caricamento');await title.evaluate(el=>{el.focus();el.setSelectionRange(3,8);window.progressTitle=el;window.progressBlock=el.closest('.continuous-block');});
 await release();await waitGate();assert.equal(await title.inputValue(),'Bozza durante caricamento');
 assert(await title.evaluate(el=>el===window.progressTitle&&el===document.activeElement&&el.selectionStart===3&&el.selectionEnd===8));
 assert(await first.evaluate(el=>el===window.progressBlock));assert(await page.evaluate(()=>dirtyMain));
 // Body search on a not-yet-loaded final page must remain explicitly partial.
 await page.getByRole('textbox',{name:'Cerca nei task',exact:true}).fill('parola-finale');await page.getByRole('textbox',{name:'Cerca nei task',exact:true}).press('Enter');await page.waitForFunction(()=>taskFilters.text==='parola-finale');
 assert((await page.locator('.diary-load-state').innerText()).includes('in corso'));await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession.complete);
 assert.equal(await page.evaluate(()=>continuousSession.blocks.length),59);assert.equal(await page.evaluate(()=>new Set(continuousSession.blocks.map(b=>b.id)).size),59);
 await page.waitForFunction(()=>document.querySelectorAll('.diary-task-results .continuous-block').length===2);assert.equal(await page.locator('.diary-task-results .continuous-block').count(),2,'dirty draft plus final matching task');
 assert(!(await page.locator('.diary-task-filters').innerText()).includes('segreto-progressivo'));
 assert((await page.locator('.diary-load-state').innerText()).includes('completato'));
 const nav=await page.evaluate(()=>performanceTraceReport().events.filter(e=>e.operation==='journalNavigation').at(-1));assert.equal(nav.outcome,'ok');assert.equal(nav.pagesCount,3);assert(nav.firstResultMs<nav.clientMs);
 // Retry after page two failure must retain visible results and edits.
 await open();await release();await waitGate();const retryTitle=page.locator('.diary-task-results .continuous-title').first();await retryTitle.fill('Bozza conservata dopo errore');
 await page.evaluate(()=>progressGates.shift().reject(Error('Errore pagina simulato')));await page.waitForFunction(()=>!continuousLoading&&continuousSession.loadError);
 await page.waitForFunction(()=>document.querySelectorAll('.diary-task-results .continuous-block').length===25);assert.equal(await page.locator('.diary-task-results .continuous-block').count(),25);assert.equal(await retryTitle.inputValue(),'Bozza conservata dopo errore');
 await page.getByRole('button',{name:'Riprova caricamento task',exact:true}).click();await waitGate();assert.equal(await page.evaluate(()=>progressGates[0].arg.cursor),'progress-25');
 await release();await waitGate();await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession.complete);
 assert.equal(await page.evaluate(()=>continuousSession.blocks.length),59);assert.equal(await retryTitle.inputValue(),'Bozza conservata dopo errore');
 // Change period during an in-flight page; its result must not enter the new session.
 await open();await release();await waitGate();await page.locator('.diary-task-filters select').nth(1).selectOption('month');
 await release();await waitGate();assert.equal(await page.evaluate(()=>progressGates[0].arg.taskArchive),false);assert.equal(await page.evaluate(()=>continuousSession.blocks.length),0);
 await release();await waitGate();await release();await waitGate();await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession.complete);
 // Leave during loading: late responses must not replace the new view.
 await open();await release();await waitGate();await page.evaluate(()=>go('settings'));await page.waitForFunction(()=>view==='settings'&&!busy);await release();await page.waitForFunction(()=>!continuousLoading);
 assert.equal(await page.evaluate(()=>view),'settings');assert.equal(await page.locator('.diary-task-results').count(),0);assert.equal(await page.evaluate(()=>progressMax),1);
 assert(await page.evaluate(()=>performanceTraceReport().events.some(e=>e.operation==='journalNavigation'&&e.outcome==='partial')));
 assert(await page.evaluate(()=>performanceTraceReport().events.some(e=>e.operation==='journalNavigation'&&e.outcome==='cancelled')));
 // Repeated server cursor stops the loop while retaining already loaded rows.
 await open();await release();await waitGate();await page.evaluate(()=>{const g=progressGates.shift();g.resolve({entries:progressRows.slice(25,50).map(e=>({...e})),total:59,nextCursor:'progress-25'});});
 await page.waitForFunction(()=>!continuousLoading&&continuousSession.loadError);assert.equal(await page.evaluate(()=>progressGates.length),0);assert.equal(await page.evaluate(()=>new Set(continuousSession.blocks.map(b=>b.id)).size),50);
 await page.evaluate(()=>go('settings'));await page.waitForFunction(()=>view==='settings'&&!busy);
 // A recovered draft whose server record arrives on page three keeps one identity.
 await page.evaluate(()=>{const b=continuousBlock(progressRows[58]);b.title='Bozza ripristinata pagina tre';b.dirty=true;draftWrite('continuous:tasks:archive',{blocks:[b]});});
 await open();await release();await waitGate();assert.equal(await page.locator('[data-client-id="progress-entry-58"] .continuous-title').inputValue(),'Bozza ripristinata pagina tre');
 await release();await waitGate();await release();await page.waitForFunction(()=>!continuousLoading&&continuousSession.complete);
 assert(await page.evaluate(()=>continuousSession.blocks.filter(b=>b.id==='progress-entry-58').length===1&&continuousSession.blocks.find(b=>b.id==='progress-entry-58').dirty&&dirtyMain));
 assert.deepEqual(errors,[]);
 console.log('Progressive tasks: first page before completion, stable editor/focus/selection/draft, partial search/privacy, retry/cursor/dedup, stale period/view and one request in flight OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
