const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  for(let i=0;i<5&&getDocQueueState().pending;i++)processTaskDocQueue();
  saveJournalPage({month,blocks:[1,2].map(i=>({clientId:'worker-ui-note-'+i+'-0001',date:'2026-10-15',type:'note',title:'Sincronizzazione '+i,body:'Contenuto '+i,rich:plainRich_('Contenuto '+i),projects:'',position:1000+i}))});
  window.workerOriginalApi=api;api=async(name,...args)=>{if(name==='processTaskDocQueue'){const result=processDocQueueItem_(new Set());return {...result,stopReason:'budget',attempted:1,chunks:1,busy:false};}return workerOriginalApi(name,...args);};
  await showDocQueue();
 });
 const dialog=page.locator('#docQueueDialog');await dialog.getByRole('button',{name:'Sincronizza ora',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('altre operazioni restano in coda'));
 if(!(await page.locator('#message').innerText()).includes('1 operazioni completate'))throw Error('Completed progress missing');
 await page.evaluate(()=>{if(getDocQueueState().pending!==1)throw Error('Remaining queue lost');api=async(name,...args)=>name==='processTaskDocQueue'?{processed:0,pending:null,errors:[],busy:true,stopReason:'busy',attempted:0,chunks:0}:workerOriginalApi(name,...args);});
 await dialog.getByRole('button',{name:'Sincronizza ora',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Archivio occupato'));
 await page.evaluate(()=>{if(getDocQueueState().pending!==1)throw Error('Busy response changed durable queue');api=workerOriginalApi;});
 await dialog.getByRole('button',{name:'Sincronizza ora',exact:true}).click();await page.waitForFunction(()=>getDocQueueState().pending===0&&!document.querySelector('#docQueueDialog button:nth-child(2)')?.disabled);
 await page.evaluate(async()=>{
  if(!docQueueResultMessage({busy:true,processed:2,stopReason:'busy',errors:[]}).includes('2 operazioni completate'))throw Error('Partial busy progress hidden');
  setPerformanceTracing(true);await api('processTaskDocQueue');
  const report=performanceTraceReport(),event=report.events.findLast(e=>e.operation==='processTaskDocQueue');
  if(!event||event.workerChunks!==1||typeof event.lockHeldMaxMs!=='number')throw Error('Worker chunk diagnostics missing');
  if('attemptedIds' in event)throw Error('Internal IDs exported');
  setPerformanceTracing(false);
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Worker browser: budget/partial progress, durable remaining queue, busy retry and eventual completion, aggregate chunk/peak-lock tracing OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
