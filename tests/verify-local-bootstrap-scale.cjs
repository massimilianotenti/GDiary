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
    const habitLogs=Array.from({length:Math.min(200,commonCount-offset)},(_,index)=>({key:'synthetic-log-'+(offset+index),habitId:'synthetic-habit',date:'2025-01-15',updatedAt:'commit-1',status:'done'}));
    const batch={expectedRevision:revision,commonUpserts:{habitLogs}};fixtureBytes+=new TextEncoder().encode(JSON.stringify(batch)).length;
    revision=checked(await repository.applyRemoteBatch(batch)).revision;
   }
   revision=checked(await repository.applyRemoteBatch({expectedRevision:revision,cursor,commonUpserts:{settings:[{id:'privacy',version:'privacy-v1',value:{privateTags:['privato']}},{id:'reflection',version:'reflection-v1',value:{dailyReflectionMode:'essential'}}]},coverage:{consumer:{complete:true,docsScanComplete:true}}})).revision;
   checked(await repository.markReadCheckpoint(revision));repository.close();
   window.bootstrapScale={identity,databaseName,size,commonCount,revision};
   return {seedMs:performance.now()-started,fixtureBytes,commonRecords:commonCount+2};
  },size);
  await session.send('HeapProfiler.collectGarbage');const heapBefore=await session.send('Runtime.getHeapUsage');
  const measured=await page.evaluate(async repetitions=>{
   const {identity,databaseName,size,commonCount}=bootstrapScale;
   const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName});
   const connectionStarted=performance.now(),opened=await repository.getMeta();if(!opened.ok)throw Error(opened.error);
   const connectionOpenMs=performance.now()-connectionStarted;
   const scenarios=[],percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
   const originalGet=IDBObjectStore.prototype.get,originalAll=IDBIndex.prototype.getAll,originalTransaction=IDBDatabase.prototype.transaction;
   let counts;
   IDBObjectStore.prototype.get=function(...args){if(counts&&this.name==='contents')counts.bodyGets++;return originalGet.apply(this,args);};
   IDBIndex.prototype.getAll=function(...args){if(counts){const name=this.objectStore.name;counts.enumerations.push(name);}return originalAll.apply(this,args);};
   IDBDatabase.prototype.transaction=function(names,mode,...args){if(counts)counts.transactions.push({names:[...names].sort(),mode});return originalTransaction.call(this,names,mode,...args);};
   try{
    for(const [name,request,expectedBodies] of [['month',{month:'2026-11'},24],['empty-month',{month:'2027-02'},0],['tasks',{month:'2026-11',taskOnly:true},size/50-1]]){
     const samples=[];let firstReadMs;
     for(let iteration=0;iteration<repetitions+1;iteration++){
      counts={bodyGets:0,enumerations:[],transactions:[]};const started=performance.now(),read=await repository.readBootstrapView(request),elapsed=performance.now()-started;
      if(!read.ok)throw Error(name+': '+read.error);
      const value=read.value;
      if(!value||value.entries.length!==size||value.common.length!==commonCount+2)throw Error('incomplete snapshot');
      const loaded=value.entries.filter(entry=>entry.contentLoaded);
      if(loaded.length!==expectedBodies||counts.bodyGets!==expectedBodies)throw Error('body selection is not limited to the requested view');
      if(loaded.some(entry=>!entry.body.startsWith('Corpo sintetico caffè 🌱')||entry.rich[0].runs[0].text!==entry.body||!entry.rich[0].runs[0].bold))throw Error('body/rich mismatch');
      if(counts.transactions.length!==1||counts.transactions[0].mode!=='readonly'||counts.transactions[0].names.join(',')!=='archiveMeta,commonRecords,contents,drafts,entries,outbox')throw Error('snapshot is not a single atomic read');
      if(counts.enumerations.sort().join(',')!=='commonRecords,drafts,entries,outbox')throw Error('unexpected enumeration or whole body scan');
      if(iteration===0)firstReadMs=elapsed;else samples.push(elapsed);
     }
     scenarios.push({name,repetitions,samplesMs:samples,p50Ms:percentile(samples,.5),p95Ms:percentile(samples,.95),firstReadMs,metadataRows:size,commonRows:commonCount+2,bodyGets:expectedBodies,transactions:1,repositoryP95Within500ms:percentile(samples,.95)<=500});
    }
   }finally{counts=null;IDBObjectStore.prototype.get=originalGet;IDBIndex.prototype.getAll=originalAll;IDBDatabase.prototype.transaction=originalTransaction;repository.close();}
   return {connectionOpenMs,scenarios};
  },repetitions);
  await session.send('HeapProfiler.collectGarbage');const heapAfter=await session.send('Runtime.getHeapUsage');
  results.push({records:size,...seeded,postGcHeapBeforeBytes:heapBefore.usedSize,postGcHeapAfterBytes:heapAfter.usedSize,...measured});
  console.log('Local bootstrap scale: '+size+' records; '+measured.scenarios.map(row=>row.name+' p50/p95 '+row.p50Ms.toFixed(1)+'/'+row.p95Ms.toFixed(1)+' ms, '+row.bodyGets+' body reads').join('; '));
 }
 assert.deepEqual(errors,[]);
 const report={format:'gdiary-local-bootstrap-scale/v1',generatedAt:new Date().toISOString(),syntheticOnly:true,environment:{node:process.version,platform:process.platform,architecture:process.arch,cpus:os.cpus().length,cpuModel:os.cpus()[0]?.model,totalMemoryBytes:os.totalmem(),browser:context.browser()?.version()||await page.evaluate(()=>navigator.userAgent),headless:true},scope:'Repository read after loading Demo; excludes identity RPC, network, sync consumer, shell merge, DOM rendering and paint. First read per scenario is excluded from percentiles; connection opening plus initial getMeta is measured separately from reads. Post-GC heap is an indicative renderer reading, not peak memory or database size. Fixture bytes are serialized seed payload volume, not physical IndexedDB usage. The 500 ms flag is diagnostic, not a test failure or end-to-end acceptance.',results};
 fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/local-bootstrap-scale.json'),JSON.stringify(report,null,2)+'\n');
 console.log('30 measured reads per scenario; atomic snapshot, selected bodies and rich content OK. Report: artifacts/local-bootstrap-scale.json');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
