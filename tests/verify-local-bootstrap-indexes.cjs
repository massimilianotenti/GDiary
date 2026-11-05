const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-bootstrap-indexes-'));
const server=http.createServer((req,res)=>{if(req.url!=='/Demo.html'){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Demo.html')));});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);},checked=result=>{check(result.ok,result.error);return result.value;};
  const scope={archiveId:'synthetic-bootstrap-index',principalId:'synthetic-principal-index',epoch:'synthetic-epoch-index',schemaVersion:1,protocolVersion:1},other={...scope,principalId:'synthetic-principal-other'},databaseName='gdiary-bootstrap-index-migration';
  const stores={archiveMeta:[],entries:['id'],contents:['id'],commonRecords:['collection','id'],drafts:['kind','id'],outbox:['operationId'],searchDocuments:['id']};
  const legacy=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(databaseName,9);request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
   request.onupgradeneeded=()=>{for(const [name,tail]of Object.entries(stores)){
    const store=request.result.createObjectStore(name,{keyPath:['archiveId','principalId','epoch',...tail]});store.createIndex('byScope',['archiveId','principalId','epoch']);
    if(name==='drafts')store.createIndex('byOwner',['archiveId','principalId']);
    if(name==='commonRecords'){store.createIndex('byCollection',['archiveId','principalId','epoch','collection']);store.createIndex('byCollectionEntry',['archiveId','principalId','epoch','collection','data.entryId']);}
    if(name==='outbox'){store.createIndex('byScopeStatus',['archiveId','principalId','epoch','status','createdAt','operationId']);store.createIndex('byScopeEntity',['archiveId','principalId','epoch','kind','id']);store.createIndex('byScopeEntityStatus',['archiveId','principalId','epoch','kind','id','status','createdAt','operationId']);}
   }};
  });
  const cursor={format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence:1};
  const entries=[['note-before','2026-10-31','note'],['note-first','2026-11-01','note'],['note-last','2026-11-30','note'],['note-after','2026-12-01','note'],['task-inside','2026-11-15','task'],['task-outside','2026-10-31','task']].map(([id,date,type])=>({id,date,type,text:id,updatedAt:'commit-1',contentVersion:'commit-1',plannedDate:'2026-11-20',projects:'',tags:''}));
  const draft={...scope,kind:'note',id:'note-first',baseVersion:'commit-1',localRevision:1,snapshot:{body:'Bozza preservata 🌱'}},operation={...scope,operationId:'synthetic-operation',kind:'note',id:'note-first',action:'upsert',status:'pending',createdAt:1,localRevision:1,baseVersion:'commit-1',payload:{body:'Invio preservato'}};
  await new Promise((resolve,reject)=>{
   const tx=legacy.transaction(Object.keys(stores),'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
   tx.objectStore('archiveMeta').put({...scope,revision:1,cursor,coverage:{consumer:{complete:true,docsScanComplete:true},readCheckpoint:{format:'local-read-checkpoint/v1',revision:1,cursor,savedAt:123}}});
   for(const entry of entries){tx.objectStore('entries').put({...scope,id:entry.id,version:'commit-1',data:entry});tx.objectStore('contents').put({...scope,id:entry.id,version:'commit-1',data:{id:entry.id,version:'commit-1',body:'Corpo '+entry.id,rich:[]}});}
   tx.objectStore('entries').put({...other,id:'foreign-task',version:'commit-1',data:{...entries[4],id:'foreign-task'}});
   for(const id of ['privacy','reflection'])tx.objectStore('commonRecords').put({...scope,collection:'settings',id,version:'settings-v1',data:{id,version:'settings-v1',value:id==='privacy'?{privateTags:['segreto']}:{dailyReflectionMode:'essential'}}});
   tx.objectStore('drafts').put(draft);tx.objectStore('outbox').put(operation);
  });legacy.close();
  let active=scope;const identity={getScope:()=>active,status:()=>({verified:true,cacheReady:true})},repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName});
  const view=checked(await repository.readBootstrapView({month:'2026-11'}));
  check(view.entries.map(row=>row.id).sort().join(',')==='note-first,note-last,task-inside,task-outside','migration backfills both indexes and deduplicates month task');
  check(view.entries.filter(row=>row.contentLoaded).length===3&&!view.entries.find(row=>row.id==='task-outside').contentLoaded,'only requested month bodies');
  check(view.meta.coverage.readCheckpoint.savedAt===123&&view.common.length===2,'migration keeps checkpoint and privacy');
  check(JSON.stringify(view.drafts[0])===JSON.stringify(draft)&&JSON.stringify(view.operations[0])===JSON.stringify(operation),'v9 migration preserves unsent work exactly');
  const tasks=checked(await repository.readBootstrapView({month:'2026-11',taskOnly:true}));check(tasks.entries.length===2&&tasks.entries.every(row=>row.type==='task'&&row.contentLoaded),'task-only reads exclude notes and load archive task bodies');
  const empty=checked(await repository.readBootstrapView({month:'2027-01'}));check(empty.entries.length===2&&empty.entries.every(row=>!row.contentLoaded),'empty month retains global planning metadata without bodies');
  active=other;check(checked(await repository.readBootstrapView({month:'2026-11'}))===null,'other principal cannot use this checkpoint');active=scope;
  const saved=checked(await repository.applyRemoteBatch({expectedRevision:1,entries:[{...entries[1],date:'2026-12-01',updatedAt:'commit-2'},{...entries[5],type:'note',updatedAt:'commit-2'},{...entries[4],id:'task-new',date:'2027-01-01',updatedAt:'commit-2',contentVersion:null}],deletedEntryIds:['task-inside']}));checked(await repository.markReadCheckpoint(saved.revision));
  const changed=checked(await repository.readBootstrapView({month:'2026-11'}));check(changed.entries.map(row=>row.id).sort().join(',')==='note-last,task-new','date/type changes and tombstone update indexes atomically');
  const changedTasks=checked(await repository.readBootstrapView({month:'2026-11',taskOnly:true}));check(changedTasks.entries.length===1&&changedTasks.entries[0].id==='task-new'&&changedTasks.entries[0].body==='','null content pointer still means complete empty body');
  const broken=checked(await repository.applyRemoteBatch({expectedRevision:saved.revision,entries:[{...entries[2],updatedAt:'commit-3',contentVersion:'commit-3'}]}));checked(await repository.markReadCheckpoint(broken.revision));
  check((await repository.readBootstrapView({month:'2026-11'})).error==='StaleVersionError','missing selected body rejects entire snapshot');
  check(checked(await repository.getDraft('note','note-first')).snapshot.body==='Bozza preservata 🌱','index writes and failed read preserve draft');
  repository.close();
 });
 assert.deepEqual(errors,[]);console.log('Indexed bootstrap: v9 to v10 backfill, atomic checkpoint/privacy/draft/outbox preservation, month boundaries, deduplication, task-only bodies, planning outside month, principal isolation, date/type updates, tombstones and missing-body rejection OK.');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
