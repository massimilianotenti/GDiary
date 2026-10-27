const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},original=api;
  const entry={id:'search-mock-result',date:'2026-10-03',type:'note',text:'Risultato verificato',projects:'',tags:'',updatedAt:'v1',excerpt:'needle'};
  $('search').value='needle';let calls=0;
  const before=JSON.stringify(state.entries),filesBefore=JSON.stringify(state.files);
  api=async(name,arg)=>{check(name==='searchArchive','search transport only');calls++;if(calls===1){check(arg.cursor===0&&!arg.searchVersion,'fresh query');return {entries:[entry],files:[{id:'uncommitted-file',entryId:entry.id}],projects:[],nextCursor:5,totalDocs:6,done:false,errors:[],searchVersion:'opaque-version'};}check(arg.cursor===5&&arg.searchVersion==='opaque-version','continuation echoes opaque version');return {entries:[],files:[],projects:[],nextCursor:5,totalDocs:0,done:true,searchReset:'changed',partial:true,errors:[{code:'changed',message:'Archivio cambiato.'}]};};
  await archiveSearch(true);
  check(calls===2&&!archiveResults.length&&archiveCursor===0&&archiveVersion==='','reset stops loop and discards all earlier pages');
  check(JSON.stringify(state.entries)===before&&JSON.stringify(state.files)===filesBefore,'early results never published into canonical state after reset');
  check(document.querySelector('#message').textContent.includes('risultati scartati')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Riprova ricerca'),'restart UI with no false completion');
  api=async()=>({entries:[entry],files:[],projects:[],nextCursor:1,totalDocs:1,done:true,errors:[],searchVersion:'new-version'});
  await archiveSearch(true);check(archiveResults.length===1&&state.entries.some(e=>e.id===entry.id)&&document.querySelector('#message').textContent.includes('Ricerca completata'),'fresh retry publishes verified results');
  api=async()=>({entries:[],files:[],projects:[],nextCursor:1,totalDocs:1,done:true,errors:[{message:'Documento cambiato'}],partial:true,searchVersion:'partial-version'});
  await archiveSearch(true);check(document.querySelector('#message').textContent.startsWith('Ricerca parziale'),'unverified Docs are visibly incomplete');
  // Real API uses only aggregate diagnostics; its version/scope token is never
  // copied into exported trace events.
  api=original;setPerformanceTracing(true);$('search').value='video';await archiveSearch(true);
  const report=performanceTraceReport();check(report.events.some(e=>e.operation==='searchArchive'),'search trace emitted');
  check(!JSON.stringify(report).includes('SEARCH_REVISION')&&!report.events.some(e=>'searchVersion' in e||'query' in e||'docId' in e),'trace omits tokens, query and file IDs');
  setPerformanceTracing(false);
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Search browser: versioned continuation, reset discards early results/state, explicit retry, partial Docs label and aggregate-only tracing OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
