const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-bootstrap-outbox-'));
const server=http.createServer((req,res)=>{if(req.url!=='/Demo.html'){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Demo.html')));});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},checked=r=>{check(r.ok,r.error);return r.value;};
  const scope={archiveId:'synthetic-active-archive',principalId:'synthetic-active-principal',epoch:'synthetic-active-epoch',schemaVersion:1,protocolVersion:1},databaseName='gdiary-bootstrap-active-outbox';let enabled=true;
  const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},repo=BulletJournalVue.createLocalRepository({identity,enabled:()=>enabled,databaseName});
  const cursor={format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence:1};
  const meta=checked(await repo.applyRemoteBatch({expectedRevision:0,cursor,coverage:{consumer:{complete:true,docsScanComplete:true}},commonUpserts:{settings:[{id:'privacy',version:'privacy-v1',value:{privateTags:['segreto']}},{id:'reflection',version:'reflection-v1',value:{dailyReflectionMode:'essential'}}]}}));checked(await repo.markReadCheckpoint(meta.revision));
  const operation=(operationId,status,createdAt)=>({...scope,operationId,kind:'note',id:operationId,action:'upsert',baseVersion:'commit-1',localRevision:1,status,createdAt,attempts:status==='pending'?0:1,nextAttemptAt:0,dependencies:[],payload:{id:operationId,clientId:operationId,operationId,type:'note',date:'2026-11-05',title:'Titolo '+operationId,body:'Bozza sintetica 🌱 '+operationId,rich:[{kind:'p',runs:[{text:'Testo conservato',bold:true}]}]}});
  const active=[operation('a-pending','pending',0),{...operation('\uffff-sending','sending',Number.MAX_SAFE_INTEGER),leaseToken:'existing-sending-token',leaseExpiresAt:Number.MAX_SAFE_INTEGER},operation('z-conflict','conflict',1),operation('m-failed','failed',2)];active[0].dependencies=['history-0000'];
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(databaseName);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise((resolve,reject)=>{const tx=db.transaction(['outbox','drafts'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
   const store=tx.objectStore('outbox');for(let i=0;i<1000;i++)store.put({...operation('history-'+String(i).padStart(4,'0'),i%2?'superseded':'acked',i),serverVersion:'commit-2',acknowledgedAt:i+1});
   for(const row of active)store.put(row);
   for(const [key,value]of [['archiveId','synthetic-other-archive'],['principalId','synthetic-other-principal'],['epoch','synthetic-other-epoch']])store.put({...active[0],[key]:value});
   store.put(operation('nearby-status','pending-extra',1));
   tx.objectStore('drafts').put({...scope,kind:'note',id:'a-pending',localRevision:1,baseVersion:'commit-1',snapshot:{body:'Bozza durevole'}});
  });
  const request={month:'2026-11',today:'2026-11-05'},indexGetAll=IDBIndex.prototype.getAll,transaction=IDBDatabase.prototype.transaction;
  let queries=[],transactions=[];
  IDBIndex.prototype.getAll=function(...args){if(this.objectStore.name==='outbox'){queries.push({index:this.name,status:args[0]?.lower?.[3]});check(this.name==='byScopeStatus','bootstrap must not enumerate receipt history');}return indexGetAll.apply(this,args);};
  IDBDatabase.prototype.transaction=function(names,mode,...args){transactions.push({names:[...names].sort(),mode});return transaction.call(this,names,mode,...args);};
  let read;try{read=checked(await repo.readBootstrapView(request));}finally{IDBIndex.prototype.getAll=indexGetAll;IDBDatabase.prototype.transaction=transaction;}
  check(queries.length===4&&queries.map(row=>row.status).sort().join(',')==='conflict,failed,pending,sending','one indexed read for every active state');
  check(transactions.length===1&&transactions[0].mode==='readonly'&&transactions[0].names.join(',')==='archiveMeta,commonRecords,contents,drafts,entries,outbox','active rows remain inside one atomic bootstrap transaction');
  check(JSON.stringify(read.operations)===JSON.stringify([...active].sort((a,b)=>a.operationId<b.operationId?-1:1)),'only active rows, exact payloads/leases/dependencies, zero/max timestamps and Unicode IDs');
  check(read.drafts[0].snapshot.body==='Bozza durevole'&&read.meta.revision===meta.revision,'read does not rewrite drafts or checkpoint');
  check(checked(await repo.getOutbox('history-0000')).serverVersion==='commit-2'&&checked(await repo.getOutbox('history-0001')).status==='superseded','historical ACK and superseded receipt remain readable');
  const owner='bootstrap-outbox-owner',token='bootstrap-outbox-token';checked(await repo.acquireOutboxLease({owner,token,now:100,leaseMs:10000}));
  const claim=checked(await repo.claimOutboxBatch({owner,token,now:101,limit:1}));check(claim.operations[0]?.operationId==='a-pending','retained historical ACK still resolves pending dependency');
  check(checked(await repo.readBootstrapView(request)).operations.filter(row=>row.status==='sending').length===2,'claim moves indexed pending operation to sending exactly once');
  checked(await repo.settleOutboxOperation({owner,token,operationId:'a-pending',outcome:'ack',serverVersion:'commit-2',now:102}));
  check(checked(await repo.readBootstrapView(request)).operations.length===3&&checked(await repo.getOutbox('a-pending')).status==='acked','ACK disappears only from active projection');
  check(checked(await repo.getDraft('note','a-pending')).baseVersion==='commit-2','ACK updates baseline without deleting the draft');
  checked(await repo.retryFailedOutbox('m-failed'));checked(await repo.releaseOutboxLease({owner,token,now:103}));
  const before=checked(await repo.readBootstrapView(request));check(before.operations.find(row=>row.operationId==='m-failed').status==='pending','failed retry appears under new indexed state');
  let writer;
  IDBIndex.prototype.getAll=function(...args){if(this.objectStore.name==='outbox'&&!writer){writer=new Promise((resolve,reject)=>{const tx=db.transaction('outbox','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.objectStore('outbox').put({...active[3],status:'acked',serverVersion:'commit-3'});tx.objectStore('outbox').put({...active[2],status:'pending'});});}return indexGetAll.apply(this,args);};
  let concurrent;try{concurrent=checked(await repo.readBootstrapView(request));}finally{IDBIndex.prototype.getAll=indexGetAll;}await writer;
  check(JSON.stringify(concurrent.operations)===JSON.stringify(before.operations),'concurrent ACK/retry cannot mix the four status reads');
  const after=checked(await repo.readBootstrapView(request));check(after.operations.length===2&&after.operations.find(row=>row.operationId==='z-conflict').status==='pending','next snapshot observes status changes without duplicates');
  IDBIndex.prototype.getAll=function(...args){const result=indexGetAll.apply(this,args);if(this.objectStore.name==='outbox')enabled=false;return result;};
  try{check((await repo.readBootstrapView(request)).error==='NotEnabledError','consent revocation rejects whole snapshot');}finally{IDBIndex.prototype.getAll=indexGetAll;enabled=true;}
  check(checked(await repo.getOutbox('history-0999')).status==='superseded','revocation does not purge historical receipts');db.close();repo.close();
 });
 assert.deepEqual(errors,[]);console.log('Active bootstrap outbox: indexed states, retained receipt history/dependencies, exact payloads and leases, timestamp/Unicode boundaries, scope isolation, atomic concurrent ACK/retry, durable draft baseline and revocation OK.');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
