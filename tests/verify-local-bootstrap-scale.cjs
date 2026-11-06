const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),repetitions=30;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-bootstrap-scale-'));
const server=http.createServer((req,res)=>{
 if(req.url!=='/Demo.html'){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Demo.html')));
});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');
 await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
 const frontendStartup=await page.evaluate(()=>{const timing=performance.getEntriesByType('navigation')[0];return {htmlResponseEndMs:timing.responseEnd,domContentLoadedMs:timing.domContentLoadedEventEnd,applicationReadyObservedMs:performance.now(),identity:'Synthetic preverified scope; no Google identity RPC measured'};});
 const session=await context.newCDPSession(page),results=[];
 for(const size of [10000,50000]){
  const seeded=await page.evaluate(async size=>{
   const checked=result=>{if(!result.ok)throw Error(result.error);return result.value;};
   const scope={archiveId:'synthetic-bootstrap-scale',principalId:'synthetic-principal-scale',epoch:'synthetic-epoch-scale',schemaVersion:1,protocolVersion:1};
   const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},databaseName='gdiary-bootstrap-scale-'+size;
   const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName});
   const cursor={format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence:1};
   let revision=0,fixtureBytes=0;const started=performance.now();
   // Seed via the public repository in bounded batches. This measures storage
   // setup separately; it is not a simulated Google bootstrap or feed replay.
   for(let offset=0;offset<size;offset+=200){
    const entries=[],contents=[];
    for(let i=offset;i<Math.min(offset+200,size);i++){
     const id='synthetic-'+String(i).padStart(6,'0'),body=('Corpo sintetico caffè 🌱 '+i+' ').repeat(8);
     entries.push({id,type:i>=24&&i%50===0?'task':'note',date:i<24?'2026-11-05':'2025-01-15',text:'Voce sintetica '+i,tags:i%11===0?'privato':'fixture',projects:'',updatedAt:'commit-1',contentVersion:'commit-1',position:i});
     contents.push({id,version:'commit-1',body,rich:[{kind:'p',runs:[{text:body,bold:true}]}]});
    }
    const batch={expectedRevision:revision,cursor,entries,contents};fixtureBytes+=new TextEncoder().encode(JSON.stringify(batch)).length;
    revision=checked(await repository.applyRemoteBatch(batch)).revision;
   }
   const commonCount=size/10;
   for(let offset=0;offset<commonCount;offset+=200){
    const habitLogs=Array.from({length:Math.min(200,commonCount-offset)},(_,index)=>{const n=offset+index,habitId='synthetic-habit-'+n,date=n<10?'2026-11-05':'2025-01-15';return {key:habitId+'|'+date,habitId,date,updatedAt:'commit-1',status:'done'};});
    const batch={expectedRevision:revision,commonUpserts:{habitLogs}};fixtureBytes+=new TextEncoder().encode(JSON.stringify(batch)).length;
    revision=checked(await repository.applyRemoteBatch(batch)).revision;
   }
   revision=checked(await repository.applyRemoteBatch({expectedRevision:revision,cursor,commonUpserts:{settings:[{id:'privacy',version:'privacy-v1',value:{privateTags:['privato']}},{id:'reflection',version:'reflection-v1',value:{dailyReflectionMode:'essential'}}]},coverage:{consumer:{complete:true,docsScanComplete:true}}})).revision;
   checked(await repository.markReadCheckpoint(revision));
   // Terminal receipts are seeded natively: no dispatcher or remote writes.
   const outboxStarted=performance.now(),db=await new Promise((resolve,reject)=>{const r=indexedDB.open(databaseName);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   let outboxFixtureBytes=0;
   const operation=(operationId,status,createdAt)=>({...scope,operationId,kind:'note',id:'synthetic-000000',action:'upsert',baseVersion:'commit-1',localRevision:1,status,createdAt,attempts:1,nextAttemptAt:0,dependencies:[],payload:{operationId,type:'note',date:'2026-11-05',title:'Fixture outbox',body:'Contenuto sintetico conservato 🌱 '.repeat(12),rich:[]}});
   for(let offset=0;offset<size;offset+=500)await new Promise((resolve,reject)=>{
    const tx=db.transaction('outbox','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);const store=tx.objectStore('outbox');
    for(let i=offset;i<Math.min(offset+500,size);i++){const row={...operation('retained-'+String(i).padStart(6,'0'),i%2?'superseded':'acked',i),serverVersion:'commit-2',acknowledgedAt:i+1};outboxFixtureBytes+=new TextEncoder().encode(JSON.stringify(row)).length;store.put(row);}
   });
   await new Promise((resolve,reject)=>{const tx=db.transaction('outbox','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);for(const status of ['pending','sending','conflict','failed']){const row={...operation('active-'+status,status,size+1),...(status==='sending'?{leaseToken:'synthetic-active-lease',leaseExpiresAt:Number.MAX_SAFE_INTEGER}:{})};outboxFixtureBytes+=new TextEncoder().encode(JSON.stringify(row)).length;tx.objectStore('outbox').put(row);}});
   db.close();const outboxSeedMs=performance.now()-outboxStarted;repository.close();fixtureBytes+=outboxFixtureBytes;
   window.bootstrapScale={identity,databaseName,size,commonCount,revision};
   return {seedMs:performance.now()-started,fixtureBytes,outboxSeedMs,outboxFixtureBytes,retainedOutboxRecords:size,activeOutboxRecords:4,commonRecords:commonCount+2};
  },size);
  await session.send('HeapProfiler.collectGarbage');const heapBefore=await session.send('Runtime.getHeapUsage');
  const measured=await page.evaluate(async repetitions=>{
   const {identity,databaseName,size,commonCount}=bootstrapScale;
   const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName});
   const connectionStarted=performance.now(),opened=await repository.getMeta();if(!opened.ok)throw Error(opened.error);
   const connectionOpenMs=performance.now()-connectionStarted;
   const scenarios=[],percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
   const originalGet=IDBObjectStore.prototype.get,originalStoreAll=IDBObjectStore.prototype.getAll,originalAll=IDBIndex.prototype.getAll,originalTransaction=IDBDatabase.prototype.transaction;
   let counts;
   IDBObjectStore.prototype.get=function(...args){if(counts&&this.name==='contents')counts.bodyGets++;return originalGet.apply(this,args);};
   IDBObjectStore.prototype.getAll=function(...args){if(counts&&this.name==='commonRecords')counts.commonRanges.push(args[0]?.lower?.[3]);return originalStoreAll.apply(this,args);};
   IDBIndex.prototype.getAll=function(...args){const current=counts,name=this.objectStore.name;if(current)current.enumerations.push(name+':'+this.name);const result=originalAll.apply(this,args);if(current&&name==='outbox')result.addEventListener('success',()=>{current.outboxRows+=result.result.length;});return result;};
   IDBDatabase.prototype.transaction=function(names,mode,...args){if(counts)counts.transactions.push({names:[...names].sort(),mode});return originalTransaction.call(this,names,mode,...args);};
   try{
    for(const [name,request,expectedBodies,expectedMetadata,expectedCommon] of [['month',{month:'2026-11',today:'2026-11-05'},24,24+size/50-1,12],['empty-month',{month:'2027-02',today:'2026-11-05'},0,size/50-1,2],['tasks',{month:'2026-11',today:'2026-11-05',taskOnly:true},size/50-1,size/50-1,commonCount+2]]){
     const samples=[];let firstReadMs;
     for(let iteration=0;iteration<repetitions+1;iteration++){
      counts={bodyGets:0,outboxRows:0,enumerations:[],commonRanges:[],transactions:[]};const started=performance.now(),read=await repository.readBootstrapView(request),elapsed=performance.now()-started;
      if(!read.ok)throw Error(name+': '+read.error);
      const value=read.value;
      if(!value||value.entries.length!==expectedMetadata||value.common.length!==expectedCommon)throw Error('incomplete snapshot');
      const loaded=value.entries.filter(entry=>entry.contentLoaded);
      if(loaded.length!==expectedBodies||counts.bodyGets!==expectedBodies)throw Error('body selection is not limited to the requested view');
      if(loaded.some(entry=>!entry.body.startsWith('Corpo sintetico caffè 🌱')||entry.rich[0].runs[0].text!==entry.body||!entry.rich[0].runs[0].bold))throw Error('body/rich mismatch');
      if(counts.transactions.length!==1||counts.transactions[0].mode!=='readonly'||counts.transactions[0].names.join(',')!=='archiveMeta,commonRecords,contents,drafts,entries,outbox')throw Error('snapshot is not a single atomic read');
      const commonQueries=request.taskOnly?['commonRecords:byScope']:['entries:byScopeDate',...Array(4).fill('commonRecords:byCollection'),'commonRecords:byCollectionDate',...Array(expectedBodies).fill('commonRecords:byCollectionEntry')];
      if(counts.enumerations.sort().join(',')!==['drafts:byScope',...Array(4).fill('outbox:byScopeStatus'),'entries:byScopeType',...commonQueries].sort().join(','))throw Error('unexpected enumeration or whole body scan');
      if(counts.commonRanges.sort().join(',')!==(request.taskOnly?'':'days,weeks'))throw Error('temporal common reads must be bounded by collection');
      if(counts.outboxRows!==4||value.operations.length!==4||value.operations.map(row=>row.status).sort().join(',')!=='conflict,failed,pending,sending')throw Error('receipt history must not be transferred into the bootstrap view');
      if(value.commonScope.kind!==(request.taskOnly?'full':'journal'))throw Error('common coverage must describe the projection');
      if(iteration===0)firstReadMs=elapsed;else samples.push(elapsed);
     }
     scenarios.push({name,repetitions,samplesMs:samples,p50Ms:percentile(samples,.5),p95Ms:percentile(samples,.95),firstReadMs,metadataRows:expectedMetadata,commonRows:expectedCommon,activeOutboxRows:4,bodyGets:expectedBodies,transactions:1,repositoryP95Within500ms:percentile(samples,.95)<=500});
    }
    counts=null;const retained=await repository.getOutbox('retained-000000');if(!retained.ok||retained.value?.status!=='acked'||retained.value?.serverVersion!=='commit-2')throw Error('historical receipt was lost');
   }finally{counts=null;IDBObjectStore.prototype.get=originalGet;IDBObjectStore.prototype.getAll=originalStoreAll;IDBIndex.prototype.getAll=originalAll;IDBDatabase.prototype.transaction=originalTransaction;repository.close();}
   return {connectionOpenMs,scenarios};
  },repetitions);
  const application=await page.evaluate(async repetitions=>{
   const {identity,databaseName}=bootstrapScale,scope=identity.getScope();
   localSyncTimer?.stop();await localSyncTimer?.idle?.();
   localCacheEnabled=true;localRepository=BulletJournalVue.createLocalRepository({identity,enabled:()=>localCacheEnabled,databaseName});
   activeCacheScope=scope;archiveIdentityStatus={verified:true,cacheReady:true};journalPageCache={isCurrent:()=>localCacheEnabled};
   captureToday=()=> '2026-11-05';
   const repository=localRepository,read=repository.readBootstrapView;let repositoryMs=0;
   localRepository={...repository,readBootstrapView:async request=>{const start=performance.now(),value=await read(request);repositoryMs=performance.now()-start;return value;}};
   const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1],scenarios=[];
   for(const [name,requestedMonth,tasks] of [['month','2026-11',false],['empty-month','2027-02',false],['tasks','2026-11',true]]){
    const samples=[];
    for(let iteration=0;iteration<=repetitions;iteration++){
     view='journal';continuousMode=true;continuousSession=null;continuousProject='';taskDiary=tasks;month=requestedMonth;query='';dirtyMain=false;dirtyDetail=false;busy=false;
     taskFilters={status:'open',period:'archive',project:'',tag:'',text:'',sort:'priority'};
     const started=performance.now();if(!await openLocalBootstrap())throw Error('application bootstrap refused');
     const applied=performance.now();await frame();const finished=performance.now();
     if(!(repositoryMs>0))throw Error('repository timing wrapper was not exercised');
     if(tasks&&document.querySelectorAll('.diary-task-results .continuous-block').length>50)throw Error('initial task editors are not bounded');
     if(!continuousSession.complete||!continuousSession.localBootstrap||busy)throw Error('incomplete application bootstrap');
     if(document.querySelector('[data-client-id="synthetic-000011"]'))throw Error('private entry exposed');
     const sample={totalMs:finished-started,repositoryMs,applyMs:applied-started-repositoryMs,renderOpportunityMs:finished-applied};
     if(iteration)samples.push(sample);
    }
    scenarios.push({name,repetitions,samples,p50Ms:percentile(samples.map(s=>s.totalMs),.5),p95Ms:percentile(samples.map(s=>s.totalMs),.95),repositoryP95Ms:percentile(samples.map(s=>s.repositoryMs),.95),applyP95Ms:percentile(samples.map(s=>s.applyMs),.95),renderOpportunityP95Ms:percentile(samples.map(s=>s.renderOpportunityMs),.95)});
   }
   repository.close();localCacheEnabled=false;localRepository=null;journalPageCache=null;
   return {scenarios,scope:'Loaded Demo and verified synthetic identity; real shell bootstrap, merge, Vue DOM flush and two animation frames. Frames offer a rendering opportunity, not proof of screen paint. Each iteration clears the continuous session; excludes HTML, identity, network and consumer.'};
  },repetitions);
  console.log('Application bootstrap '+size+': '+application.scenarios.map(s=>s.name+' p50/p95 '+s.p50Ms.toFixed(1)+'/'+s.p95Ms.toFixed(1)+' ms').join('; '));
  await session.send('HeapProfiler.collectGarbage');const heapAfter=await session.send('Runtime.getHeapUsage');
  results.push({records:size,...seeded,application,postGcHeapBeforeBytes:heapBefore.usedSize,postGcHeapAfterBytes:heapAfter.usedSize,...measured});
  console.log('Local bootstrap scale: '+size+' records; '+measured.scenarios.map(row=>row.name+' p50/p95 '+row.p50Ms.toFixed(1)+'/'+row.p95Ms.toFixed(1)+' ms, '+row.bodyGets+' body reads').join('; '));
 }
 assert.deepEqual(errors,[]);
 const report={format:'gdiary-local-bootstrap-scale/v1',generatedAt:new Date().toISOString(),syntheticOnly:true,frontendStartup,environment:{node:process.version,platform:process.platform,architecture:process.arch,cpus:os.cpus().length,cpuModel:os.cpus()[0]?.model,totalMemoryBytes:os.totalmem(),browser:context.browser()?.version()||await page.evaluate(()=>navigator.userAgent),headless:true},scope:'Repository scenarios and separately application scenarios (see each application.scope). Repository read after loading Demo; excludes identity RPC, network, sync consumer, shell merge, DOM rendering and paint. First read per scenario is excluded from percentiles; connection opening plus initial getMeta is measured separately from reads. Post-GC heap is an indicative renderer reading, not peak memory or database size. Fixture bytes are serialized seed payload volume, not physical IndexedDB usage. The 500 ms flag is diagnostic, not a test failure or end-to-end acceptance.',results};
 fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/local-bootstrap-scale.json'),JSON.stringify(report,null,2)+'\n');
 console.log('30 measured reads per scenario; atomic snapshot, selected bodies and rich content OK. Report: artifacts/local-bootstrap-scale.json');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
