const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-repository-'));
const server=http.createServer((req,res)=>{const name=req.url==='/Demo.html'?'Demo.html':req.url==='/Changelog.html'?'Changelog.html':null;if(!name){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,name)));});
(async()=>{let context;const errors=[];try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
 const launch=async()=>{context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(origin+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);return page;};
 let page=await launch();
 const saved=await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},factory=window.BulletJournalVue.createLocalRepository;
  const A={archiveId:'synthetic-archive-main',principalId:'synthetic-principal-a',epoch:'synthetic-epoch-first',protocolVersion:1,schemaVersion:1},B={...A,principalId:'synthetic-principal-b'};let scope=A,allowed=true,ready=true;
  const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:ready})};
  const repo=factory({identity,enabled:()=>allowed,databaseName:'gdiary-repository-test-v1'});
  const v1='2026-10-01T00:00:00.000Z',v2='2026-10-02T00:00:00.000Z',v3='2026-10-03T00:00:00.000Z',entry=(id,updatedAt=v1)=>({id,updatedAt,text:'Metadati fittizi'}),rich=[{kind:'p',runs:[{text:'Caffè 🌱',bold:true,color:'#123456'}]}];
  const liveIdentity=window.BulletJournalVue.createArchiveIdentityClient(()=>api('getSyncManifest'));await liveIdentity.verify();
  const blocked=factory({identity:liveIdentity,enabled:()=>true});check((await blocked.getMeta()).error==='IdentityError','real identity client cannot open application repository');blocked.close();
  allowed=false;check((await repo.getMeta()).error==='NotEnabledError','opt-in required');allowed=true;ready=false;check((await repo.getMeta()).error==='IdentityError','storage validation gate required');ready=true;
  check((await repo.getMeta()).value.revision===0,'empty namespace');
  const first=await repo.applyRemoteBatch({expectedRevision:0,cursor:'synthetic-checkpoint-1',coverage:{journal:'partial'},entries:[entry('shared-id')],contents:[{id:'shared-id',version:v1,body:'Caffè 🌱',rich}],commonUpserts:{days:[{date:'2026-10-03',updatedAt:v1,intention:'Fittizia'}],projects:[{slug:'synthetic-project',updatedAt:v1,name:'Fittizio'}]}});
  check(first.ok&&first.value.revision===1,'metadata/content/checkpoint transaction');
  check((await repo.listCommon('days')).value.length===1&&(await repo.listCommon('unsupported')).error==='DataError','collection index and contract');
  check((await repo.getContent('shared-id')).value.rich[0].runs[0].bold&&(await repo.getMeta()).value.cursor==='synthetic-checkpoint-1','rich and cursor roundtrip');
  check((await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:0,baseVersion:v1,snapshot:{body:'Bozza fittizia',rich}})).value.localRevision===1,'draft durable revision');
  check((await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:1,baseVersion:v1,snapshot:{body:'Bozza successiva',rich}})).value.localRevision===2,'next draft revision');
  check((await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:1,baseVersion:v1,snapshot:{body:'Stale'}})).error==='ConflictError','draft CAS');
  const nativeMetaPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...rest){if(this.name==='archiveMeta')throw new DOMException('synthetic quota','QuotaExceededError');return nativeMetaPut.call(this,value,...rest);};let draftAbort;try{draftAbort=await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:2,baseVersion:v1,snapshot:{body:'Non confermare'}});}finally{IDBObjectStore.prototype.put=nativeMetaPut;}check(draftAbort.error==='QuotaExceededError'&&(await repo.getDraft('note','shared-id')).value.snapshot.body==='Bozza successiva'&&(await repo.getMeta()).value.revision===3,'draft and search invalidation roll back together');
  check((await repo.getMeta()).value.revision===3&&(await repo.getMeta()).value.coverage.localSearch.fresh===false,'note drafts atomically invalidate the search revision');
  check((await repo.applyRemoteBatch({expectedRevision:3,cursor:'synthetic-checkpoint-2',entries:[entry('shared-id',v2)],commonRemovals:{projects:['synthetic-project']}})).ok,'new remote version');
  check((await repo.getCommon('projects','synthetic-project')).value===null&&(await repo.getCommon('days','2026-10-03')).value,'common removal preserves other collections');
  check((await repo.getContent('shared-id')).value===null&&(await repo.getDraft('note','shared-id')).value.snapshot.body==='Bozza successiva','metadata invalidates old cached body but preserves draft');
  check((await repo.applyRemoteBatch({expectedRevision:1,entries:[entry('stale-response')]})).error==='ConflictError','late response cannot advance local checkpoint');
  check((await repo.applyRemoteBatch({expectedRevision:4,entries:[entry('shared-id',v1)]})).error==='StaleVersionError','older remote version rejected');
  check((await repo.applyRemoteBatch({expectedRevision:4,contents:[{id:'shared-id',version:v1,body:'Old',rich:[]}]})).error==='StaleVersionError','content/metadata version mismatch rejects complete batch');
  check((await repo.getMeta()).value.revision===4,'aborts never advance checkpoint');
  check((await repo.applyRemoteBatch({expectedRevision:4,contents:[{id:'shared-id',version:v2,body:'Nuovo corpo',rich}]})).ok,'current content accepted');
  scope=B;check((await repo.getMeta()).value.revision===0&&(await repo.getEntry('shared-id')).value===null,'principal isolation');
  await repo.applyRemoteBatch({expectedRevision:0,entries:[{...entry('shared-id'),text:'Utente B'}]});await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:0,baseVersion:v1,snapshot:{body:'Bozza B'}});
  scope={...A,archiveId:'synthetic-another-archive'};await repo.putDraft({kind:'note',id:'shared-id',expectedRevision:0,baseVersion:v1,snapshot:{body:'Altro archivio'}});
  scope={...A,epoch:'synthetic-epoch-second'};check((await repo.getMeta()).value.revision===0&&(await repo.listRecoveryDrafts()).value.length===1,'new epoch isolates remote data and can recover only same owner/archive draft');
  check((await repo.listRecoveryDrafts()).value[0].snapshot.body==='Bozza successiva','other principal excluded from recovery');
  scope=A;check((await repo.getMeta()).value.revision===5&&(await repo.getContent('shared-id')).value.body==='Nuovo corpo','original scope remains intact');
  check((await repo.clearRemote()).ok&&(await repo.getMeta()).value.revision===6&&(await repo.getEntry('shared-id')).value===null&&(await repo.getDraft('note','shared-id')).value.localRevision===2,'cache clear preserves unsynced draft');
  scope=B;check((await repo.getEntry('shared-id')).value.text==='Utente B','clear never crosses principal');scope=A;
  await repo.applyRemoteBatch({expectedRevision:6,entries:[entry('shared-id',v3)],contents:[{id:'shared-id',version:v3,body:'Cancellabile',rich}],commonUpserts:{files:[{id:'file-a',entryId:'shared-id',addedAt:v3}],taskPlans:[{entryId:'shared-id',updatedAt:v3,date:'2026-10-03'}]}});
  check((await repo.applyRemoteBatch({expectedRevision:7,deletedEntryIds:['shared-id']})).ok,'canonical deletion');
  check((await repo.getEntry('shared-id')).value===null&&(await repo.getContent('shared-id')).value===null&&(await repo.getCommon('files','file-a')).value===null&&(await repo.getDraft('note','shared-id')).value,'deletion prunes remote links but not drafts');
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...rest){const request=put.call(this,value,...rest);if(this.name==='entries'&&value.id==='abort-after-success')request.addEventListener('success',()=>this.transaction.abort());return request;};
  let aborted;try{aborted=await repo.applyRemoteBatch({expectedRevision:8,cursor:'must-not-commit',entries:[entry('abort-after-success')]});}finally{IDBObjectStore.prototype.put=put;}
  check(!aborted.ok&&(await repo.getMeta()).value.revision===8&&(await repo.getEntry('abort-after-success')).value===null,'request success is not transaction durability');
  IDBObjectStore.prototype.put=function(value,...rest){if(this.name==='entries'&&value.id==='quota')throw new DOMException('PRIVATE-TEXT','QuotaExceededError');return put.call(this,value,...rest);};
  let quota;try{quota=await repo.applyRemoteBatch({expectedRevision:8,cursor:'quota-must-not-commit',entries:[entry('quota')]});}finally{IDBObjectStore.prototype.put=put;}
  check(quota.error==='QuotaExceededError'&&!JSON.stringify(quota).includes('PRIVATE')&&(await repo.getMeta()).value.revision===8,'quota rollback and sanitized error');
  const second=factory({identity,enabled:()=>true,databaseName:'gdiary-repository-test-v1'});
  const races=await Promise.all([repo.applyRemoteBatch({expectedRevision:8,entries:[entry('race-a')]}),second.applyRemoteBatch({expectedRevision:8,entries:[entry('race-b')]})]);
  check(races.filter(r=>r.ok).length===1&&races.some(r=>r.error==='ConflictError'),'two clients serialize canonical CAS');
  const draftRaces=await Promise.all([repo.putDraft({kind:'note',id:'shared-id',expectedRevision:2,baseVersion:v1,snapshot:{body:'Bozza concorrente A'}}),second.putDraft({kind:'note',id:'shared-id',expectedRevision:2,baseVersion:v1,snapshot:{body:'Bozza concorrente B'}})]);
  check(draftRaces.filter(r=>r.ok).length===1,'two clients serialize draft CAS');second.close();


  const beforeInvalid=(await repo.getMeta()).value.revision;
  check((await repo.applyRemoteBatch({expectedRevision:beforeInvalid,unknownField:true})).error==='DataError','unknown batch operations never ignored silently');
  check((await repo.applyRemoteBatch({expectedRevision:beforeInvalid,entries:Array.from({length:501},(_,i)=>entry('overflow-'+i))})).error==='DataError','batch record budget enforced');
  await repo.putDraft({kind:'note',id:'temporary-draft',expectedRevision:0,baseVersion:v1,snapshot:{body:'Fittizia'}});
  const beforeDraftDelete=(await repo.getMeta()).value.revision;
  check((await repo.deleteDraft({kind:'note',id:'temporary-draft',expectedRevision:0})).error==='ConflictError','explicit draft deletion verifies local revision');
  check((await repo.deleteDraft({kind:'note',id:'temporary-draft',expectedRevision:1})).ok&&(await repo.getDraft('note','temporary-draft')).value===null,'explicit current draft deletion');
  check((await repo.getMeta()).value.revision===beforeDraftDelete+1&&(await repo.getMeta()).value.coverage.localSearch.fresh===false,'draft deletion invalidates search in same transaction');
  const metaBefore=(await repo.getMeta()).value.revision,get=IDBObjectStore.prototype.get;let change=true;
  IDBObjectStore.prototype.get=function(...args){const request=get.apply(this,args);if(change&&this.name==='archiveMeta'){change=false;request.addEventListener('success',()=>{scope=B;});}return request;};
  let revoked;try{revoked=await repo.applyRemoteBatch({expectedRevision:metaBefore,entries:[entry('must-not-cross-scope')]});}finally{IDBObjectStore.prototype.get=get;scope=A;}
  check(revoked.error==='ScopeChangedError'&&(await repo.getMeta()).value.revision===metaBefore,'scope switch aborts in-flight transaction');
  scope=B;check((await repo.getEntry('must-not-cross-scope')).value===null,'revoked write never reaches next principal');scope=A;
  // Reserved future operations are not writable through the repository API,
  // but cache cleanup must preserve them if present after a future migration.
  const reserve=await new Promise((resolve,reject)=>{const request=indexedDB.open('gdiary-repository-test-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
  await new Promise((resolve,reject)=>{const tx=reserve.transaction('outbox','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.objectStore('outbox').put({...A,operationId:'synthetic-reserved-operation',payload:'Only a fixture'});});
  check((await repo.clearRemote()).ok,'clear with reserved operation');
  const reserved=await new Promise((resolve,reject)=>{const tx=reserve.transaction('outbox','readonly'),r=tx.objectStore('outbox').get([...Object.values({archiveId:A.archiveId,principalId:A.principalId,epoch:A.epoch}),'synthetic-reserved-operation']);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});reserve.close();check(reserved&&reserved.payload==='Only a fixture','clear does not touch reserved outbox');
  const growth={...A,archiveId:'synthetic-growth-archive'};scope=growth;
  for(let page=0;page<20;page++){const records=Array.from({length:500},(_,i)=>entry('growth-'+(page*500+i)));const result=await repo.applyRemoteBatch({expectedRevision:page,entries:records});check(result.ok,'growth page '+page+' commits');}
  check((await repo.listEntries()).value.length===10000,'10k synthetic metadata entries remain scoped');
  check((await repo.applyRemoteBatch({expectedRevision:20,entries:[entry('growth-canonical','commit-10')]})).ok,'canonical feed version token accepted');
  check((await repo.applyRemoteBatch({expectedRevision:21,entries:[entry('growth-canonical','commit-9')]})).error==='StaleVersionError','older canonical commit rejected by numeric sequence');
  check((await repo.applyRemoteBatch({expectedRevision:21,entries:[entry('growth-canonical',v1)]})).error==='StaleVersionError','legacy timestamp cannot replace canonical snapshot');
  const token=n=>({format:'sync-cursor/v1',archiveId:growth.archiveId,principalId:growth.principalId,epoch:growth.epoch,sequence:n});
  check((await repo.applyRemoteBatch({expectedRevision:21,cursor:token(0),entries:[entry('snapshot-ahead','commit-2')]})).ok,'snapshot ahead of its starting checkpoint accepted');
  check((await repo.applyRemoteBatch({expectedRevision:22,cursor:token(1),entries:[entry('snapshot-ahead','commit-1')]})).ok&&(await repo.getEntry('snapshot-ahead')).value.updatedAt==='commit-2','older ordered feed change does not replace a newer snapshot row');
  check((await repo.applyRemoteBatch({expectedRevision:23,cursor:token(1),deletedEntryIds:['snapshot-ahead']})).ok&&(await repo.getEntry('snapshot-ahead')).value.updatedAt==='commit-2','older feed tombstone does not delete a newer snapshot row');scope=A;
  const revision=(await repo.getMeta()).value.revision,draftRevision=(await repo.getDraft('note','shared-id')).value.localRevision;repo.close();check((await repo.getMeta()).error==='ClosedError','closed repository stays closed');
  return {revision,draftRevision};
 });
 await context.close();context=null;page=await launch();
 await page.evaluate(async expected=>{
  const scope={archiveId:'synthetic-archive-main',principalId:'synthetic-principal-a',epoch:'synthetic-epoch-first',protocolVersion:1,schemaVersion:1};
  const repo=window.BulletJournalVue.createLocalRepository({identity:{getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},enabled:()=>true,databaseName:'gdiary-repository-test-v1'});
  const meta=await repo.getMeta(),draft=await repo.getDraft('note','shared-id');if(!meta.ok||meta.value.revision!==expected.revision||draft.value.localRevision!==expected.draftRevision)throw Error('Browser restart lost repository checkpoint/draft');repo.close();
 },saved);

 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},create=window.BulletJournalVue.createLocalRepository,scope={archiveId:'synthetic-archive-main',principalId:'synthetic-principal-a',epoch:'synthetic-epoch-first',protocolVersion:1,schemaVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
  let lateClosed=0;const blocked=create({identity,enabled:()=>true,environment:{indexedDB:{open(){const request={};queueMicrotask(()=>{request.onblocked();queueMicrotask(()=>{request.result={close(){lateClosed++;}};request.onsuccess();});});return request;}}}});
  check((await blocked.getMeta()).error==='BlockedError','blocked open returns controlled error');await new Promise(r=>setTimeout(r,0));check(lateClosed===1,'late connection is closed');blocked.close();
  const denied=create({identity,enabled:()=>true,environment:{get indexedDB(){throw new DOMException('PRIVATE-STORAGE','SecurityError');}}});const response=await denied.getMeta();check(response.error==='SecurityError'&&!JSON.stringify(response).includes('PRIVATE'),'storage denial sanitized');denied.close();
  const repo=create({identity,enabled:()=>true,databaseName:'gdiary-repository-version-test'});check((await repo.getMeta()).ok,'version fixture initialized');
  const upgraded=await new Promise((resolve,reject)=>{const request=indexedDB.open('gdiary-repository-version-test',11);request.onupgradeneeded=()=>request.result.createObjectStore('future-protected-data').put('kept','marker');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  check((await repo.getMeta()).error==='SchemaError','version change closes old connection without reset');repo.close();
  const older=create({identity,enabled:()=>true,databaseName:'gdiary-repository-version-test'});check((await older.getMeta()).error==='VersionError','older client refuses new database version');older.close();
  const value=await new Promise((resolve,reject)=>{const tx=upgraded.transaction('future-protected-data','readonly'),r=tx.objectStore('future-protected-data').get('marker');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});check(value==='kept','unsupported schema is never deleted');upgraded.close();
  if((await indexedDB.databases()).some(d=>d.name==='gdiary-local-v1'))throw Error('Real application database opened');
 });
 assert.deepEqual(errors,[]);console.log('Local repository: transactional snapshot/cursor, version rejection, draft isolation/CAS/recovery, owner/epoch isolation, cache clear/deletion, abort-after-request, quota, concurrent clients 10k growth, revocation, reserved outbox, schema changes, blocked/denied storage and browser restart OK');
}finally{await context?.close();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
