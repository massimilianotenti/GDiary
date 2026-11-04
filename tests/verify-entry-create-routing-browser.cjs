const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs'),root=path.resolve(__dirname,'..'),context={incrementalCommon:true};
const backend=createDayRoutingServer(),seed=backend.ctx.addJournal({date:'2026-10-29',text:'Nota legacy iniziale',requestId:'synthetic-entry-create-browser-seed',scope:'personal',context}).entries[0];
backend.entryController.register({entriesSheetId:18,indexSheetId:11,blockSheetId:12});backend.entryController.setMode({mode:'active',expectedRevision:1});
const bridge=`window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({},{get:(_,name)=>arg=>{fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arg})}).then(r=>r.json()).then(response=>{if(response.ok)success(response.value);else failure(Object.assign(new Error(response.error.message),{name:response.error.name}));}).catch(failure);}});}};}}}};`;
const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('</script>','</script><script>'+bridge+'</script>'),allowed=new Set(['getState','getCommonState','getJournalPage','getJournalContents','getSyncManifest','getEntryDetail','addJournal','addCompleteNote','traceApi']);
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/Demo.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(req.url==='/Changelog.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Changelog.html')));return;}
 if(req.url!=='/rpc'||req.method!=='POST'){res.writeHead(404).end();return;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Synthetic request too large');}
 const {name,arg}=JSON.parse(raw);if(!allowed.has(name))throw Error('Synthetic RPC not allowed: '+name);
 let response;try{response={ok:true,value:JSON.parse(JSON.stringify(await backend.ctx[name](arg)))}}catch(error){response={ok:false,error:{name:error.name,message:error.message}};}
 res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(response));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}));}});
(async()=>{let browser;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');
 await page.waitForFunction(()=>commonReadAt>0&&!busy&&continuousSession?.loaded);
 await page.evaluate(()=>{month=state.today.slice(0,7);go('files');});await page.waitForFunction(()=>view==='files'&&!busy);
 const date=await page.evaluate(()=>state.today),panel=page.locator('#capturePanel'),captureToggle=page.locator('button[aria-controls="capturePanel"]');await captureToggle.click();
 await page.locator('#captureDate').fill(date);await page.locator('#captureTitle').fill('Nota completa canonica browser');await page.locator('#captureText-rich').fill('Corpo ricco salvato nel ledger.');
 await page.getByRole('button',{name:'Crea nota completa',exact:true}).click();
 await page.waitForFunction(()=>!busy);
 const complete=backend.entryController.resolve().readRows().find(entry=>entry.text==='Nota completa canonica browser');assert(complete&&backend.entryController.resolve().isRouted(complete.id));assert.equal(backend.entryController.resolve().readContent(complete.id).body.trim(),'Corpo ricco salvato nel ledger.');
 await captureToggle.click();await page.locator('#captureMode').selectOption('bullets');await page.locator('#captureText').fill('☐ Task rapido canonico\nNota rapida canonica');
 await page.getByRole('button',{name:'+ Scrivi nel diario',exact:true}).click();
 await page.waitForFunction(()=>!busy);
 for(const title of ['Task rapido canonico','Nota rapida canonica']){const entry=backend.entryController.resolve().readRows().find(value=>value.text===title);assert(entry&&backend.entryController.resolve().isRouted(entry.id));}
 assert(backend.entryController.resolve().readRows().some(entry=>entry.id===seed.id),'pre-existing legacy Entry remains available beside canonical captures');assert.deepEqual(errors,[]);await page.close();
 console.log('Entry create browser: complete note and multi-bullet capture use canonical routes, body is retained, existing legacy Entry remains available, no page errors OK.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
