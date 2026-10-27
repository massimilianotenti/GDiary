const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-storage-probe-'));
const files={'/Demo.html':'Demo.html','/Changelog.html':'Changelog.html','/storage-probe.js':'frontend/storage-probe.js'};
const server=http.createServer((req,res)=>{const file=files[req.url];if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));});
(async()=>{
 let context;const errors=[];
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;
  async function open(){
   context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined,viewport:{width:390,height:1000}});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
   await page.goto(origin+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
   return page;
  }
  async function settings(page){await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>view==='settings'&&!busy);if(!await page.evaluate(()=>performanceTracingEnabled()))await page.getByRole('button',{name:'Attiva tracing',exact:true}).click();}
  async function run(page){await page.getByRole('button',{name:'Verifica memoria locale',exact:true}).click();await page.waitForFunction(()=>!storageProbeBusy&&storageProbeReport!==null);return page.evaluate(()=>storageProbeReport);}
  let page=await open();
  assert.equal(await page.evaluate(async()=>(await indexedDB.databases()).some(db=>db.name==='gdiary-storage-probe-v1')),false,'no storage opened on startup');
  await settings(page);
  assert.equal(await page.evaluate(async()=>(await indexedDB.databases()).some(db=>db.name==='gdiary-storage-probe-v1')),false,'opening diagnostics is passive');
  await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('gdiary-unrelated-test',1);request.onupgradeneeded=()=>request.result.createObjectStore('sentinel');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put('unrelated synthetic marker','keep');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
  const before=await page.evaluate(()=>{window.probeRpcCount=0;const original=api;api=(...args)=>{probeRpcCount++;return original(...args);};return JSON.stringify({sheets:Object.fromEntries(Object.entries(mockSheets).map(([k,s])=>[k,s.data])),props:mockProps});});
  const first=await run(page);
  assert(first.ok&&first.roundTrip&&first.rollback&&first.isolated&&first.reopened);assert.equal(first.previousMarker,false);assert.equal(first.framed,false);assert(first.durationMs>=0);
  assert.equal((await run(page)).previousMarker,true);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Esporta verifica locale',exact:true}).click();
  const download=await downloadPromise,report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(report.format,'gdiary-storage-probe/v1');assert(!/synthetic-archive|mock-root|mock-db|caffè|body|origin|pathname|SECRET/.test(JSON.stringify(report)));
  assert.equal(await page.evaluate(()=>dirtyMain),false);assert.equal(await page.evaluate(()=>probeRpcCount),0,'probe makes no Google RPC');
  assert.equal(await page.evaluate(()=>JSON.stringify({sheets:Object.fromEntries(Object.entries(mockSheets).map(([k,s])=>[k,s.data])),props:mockProps})),before,'no diary mutation');
  await context.close();context=null;page=await open();await settings(page);
  assert.equal(await page.evaluate(()=>storageProbeReport),null,'report stays in memory only');
  assert.equal((await run(page)).previousMarker,true,'synthetic marker survives browser restart');
  // Exercise failures against the real module with controlled browser services.
  const failures=await page.evaluate(async()=>{
   const {createStorageProbe}=await import('/storage-probe.js');
   const env=overrides=>({indexedDB,navigator:{storage:{}},performance,self:window,top:window,isSecureContext:true,...overrides});
   const unavailable=await createStorageProbe(env({indexedDB:null})).run();
   const restricted=env();Object.defineProperty(restricted,'indexedDB',{get(){throw new DOMException('SECRET-ACCOUNT','SecurityError');}});
   const denied=await createStorageProbe(restricted).run();
   let persistenceRequests=0;const probe=createStorageProbe(env({navigator:{storage:{persisted:async()=>false,persist:async()=>{persistenceRequests++;return false;}}}}));
   const normal=await probe.run(),beforeRequest=persistenceRequests,persistence=await probe.requestPersistence();
   const overlap=await Promise.all([probe.run(),probe.clear()]);
   const put=IDBObjectStore.prototype.put;
   let quota;
   try{IDBObjectStore.prototype.put=function(){throw new DOMException('SECRET-QUOTA','QuotaExceededError');};quota=await probe.run();}
   finally{IDBObjectStore.prototype.put=put;}
   let closed=0;
   const blockedFactory={open(){const request={result:{close(){closed++;}}};setTimeout(()=>{request.onblocked();setTimeout(()=>request.onsuccess(),0);},0);return request;}};
   const blocked=await createStorageProbe(env({indexedDB:blockedFactory})).run();await new Promise(resolve=>setTimeout(resolve,20));
   return {unavailable,denied,normal,beforeRequest,persistence,persistenceRequests,overlap,quota,blocked,closed};
  });
  assert.equal(failures.unavailable.error,'NotSupportedError');assert.equal(failures.denied.error,'SecurityError');
  assert(failures.normal.ok);assert.equal(failures.beforeRequest,0);assert.equal(failures.persistenceRequests,1);assert.equal(failures.persistence.persisted,false);
  assert(failures.overlap[0].ok);assert.equal(failures.overlap[1].error,'BusyError');
  assert.equal(failures.quota.error,'QuotaExceededError');assert.equal(failures.quota.ok,false);
  assert.equal(failures.blocked.error,'BlockedError');assert.equal(failures.closed,1,'late open connection closes');assert(!JSON.stringify(failures).includes('SECRET'));
  // Synthetic-only probe also works in an iframe on the local origin.
  const frame=await page.evaluateHandle(()=>{const el=document.createElement('iframe');el.src='/Demo.html';document.body.append(el);return el;});
  const child=await frame.asElement().contentFrame();await child.waitForFunction(()=>window.BulletJournalVue?.storageProbe);
  const framed=await child.evaluate(()=>window.BulletJournalVue.storageProbe.run());assert(framed.ok&&framed.framed);
  await frame.evaluate(el=>el.remove());
  await page.getByRole('button',{name:'Cancella dati di prova',exact:true}).click();await page.waitForFunction(()=>!storageProbeBusy&&storageProbeStatus==='Dati di prova cancellati.');
  assert.equal(await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('gdiary-unrelated-test',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('sentinel','readonly'),read=tx.objectStore('sentinel').get('keep');let value;read.onsuccess=()=>value=read.result;tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=()=>{db.close();reject(tx.error);};};})),'unrelated synthetic marker','clear leaves other databases intact');
  assert.equal((await run(page)).previousMarker,false);
  await page.getByRole('button',{name:'Cancella dati di prova',exact:true}).click();await page.waitForFunction(()=>!storageProbeBusy&&storageProbeStatus==='Dati di prova cancellati.');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile diagnostic layout');
  assert.deepEqual(errors,[]);
  console.log('Storage probe: opt-in, synthetic-only, UTF-8, rollback, isolation, reopen/browser restart, iframe, sanitized export, denied/quota/blocked/busy failures and cleanup OK');
 }finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
