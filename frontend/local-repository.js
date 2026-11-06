import {periodOperation} from './period-operation.mjs';
import {canonicalDayJSON,validDayDate} from './day-operation.mjs';
import {commonReadRanges} from './common-read-cache.js';
import {journalPageDescriptors} from './journal-page-index.js';
import {commonViewDescriptors} from './common-view-index.js';
// Repository foundation. No automatic opening or real-data initializer.
// Application callers must explicitly opt in and receive an advertised,
// verified identity before the real archive namespace can be opened.
const DB_NAME='gdiary-local-v1',VERSION=11,TIMEOUT=5000;
const STORES=['archiveMeta','entries','contents','commonRecords','drafts','outbox','searchDocuments'];
const REMOTE=['archiveMeta','entries','contents','commonRecords','searchDocuments'];
const KEYS={projects:'slug',days:'date',weeks:'week',goals:'id',habits:'id',habitLogs:'key',taskPlans:'entryId',files:'id',settings:'id',layouts:'entryId'};
const SAFE=new Set(['DataCloneError','NotEnabledError','IdentityError','ScopeChangedError','ClosedError','SchemaError','DataError','ConflictError','BusyError','StaleVersionError','QuotaExceededError','SecurityError','NotSupportedError','VersionError','AbortError','TimeoutError','BlockedError','InvalidStateError']);
const fail=name=>Object.assign(new Error(name),{name});
const safe=error=>SAFE.has(error?.name)?error.name:'StorageError';
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const syncDependenciesEqual=(left,right)=>left.length===right.length&&left.every((value,index)=>value===right[index]);
// Legacy rows carry ISO timestamps; canonical rows carry the feed's
// commit-N token. Tokens are compared only within a record identity: canonical
// commit order supersedes any legacy timestamp and commit numbers are numeric.
const version=value=>typeof value==='string'&&(
 /^commit-[1-9][0-9]{0,15}$/.test(value)||
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value
);
function compareVersion(a,b){
 const ac=/^commit-([1-9][0-9]{0,15})$/.exec(a),bc=/^commit-([1-9][0-9]{0,15})$/.exec(b);
 if(ac&&bc){const x=Number(ac[1]),y=Number(bc[1]);return x===y?0:x<y?-1:1;}
 if(ac)return 1;if(bc)return -1;
 const x=Date.parse(a),y=Date.parse(b);if(Number.isFinite(x)&&Number.isFinite(y))return x===y?0:x<y?-1:1;
 return 0;
}
const scopeKey=s=>[s.archiveId,s.principalId,s.epoch];
const sameScope=(a,b)=>JSON.stringify(scopeKey(a))===JSON.stringify(scopeKey(b));
function validateScope(s){return s&&s.protocolVersion===1&&s.schemaVersion===1&&scopeKey(s).every(v=>typeof v==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(v));}
function validateBatch(batch){
 if(!batch||!Number.isSafeInteger(batch.expectedRevision)||batch.expectedRevision<0)throw fail('DataError');
 const entries=batch.entries||[],contents=batch.contents||[],common=batch.commonUpserts||{},removals=batch.commonRemovals||{},deleted=batch.deletedEntryIds||[];
 if(Object.keys(batch).some(k=>!['expectedRevision','cursor','coverage','entries','contents','commonUpserts','commonRemovals','deletedEntryIds'].includes(k))||!removals||typeof removals!=='object'||Array.isArray(removals))throw fail('DataError');
 if(!Array.isArray(entries)||!Array.isArray(contents)||!Array.isArray(deleted)||typeof common!=='object'||!common||Array.isArray(common))throw fail('DataError');
 const checkRows=(rows,key,versionKey,opaque=false)=>{if(!Array.isArray(rows)||new Set(rows.map(r=>r?.[key])).size!==rows.length||rows.some(r=>!r||!id(r[key])||!(version(r[versionKey])||opaque&&id(r[versionKey]))))throw fail('DataError');};
 checkRows(entries,'id','updatedAt');checkRows(contents,'id','version',true);
 if(entries.some(e=>'body' in e||'rich' in e)||contents.some(c=>typeof c.body!=='string'||c.body.length>100000||!Array.isArray(c.rich)))throw fail('DataError');
 let count=entries.length+contents.length+deleted.length;
 for(const [collection,rows]of Object.entries(common)){if(!Object.hasOwn(KEYS,collection))throw fail('DataError');checkRows(rows,KEYS[collection],collection==='files'?(rows.some(r=>r?.updatedAt)?'updatedAt':'addedAt'):['settings','layouts'].includes(collection)?'version':'updatedAt',collection==='settings');if(['files','taskPlans'].includes(collection)&&rows.some(r=>!id(r.entryId)||deleted.includes(r.entryId)))throw fail('DataError');count+=rows.length;}
 for(const [collection,ids]of Object.entries(removals)){if(!Object.hasOwn(KEYS,collection)||!Array.isArray(ids)||ids.some(v=>!id(v))||new Set(ids).size!==ids.length||(common[collection]||[]).some(r=>ids.includes(r[KEYS[collection]])))throw fail('DataError');count+=ids.length;}
 if(deleted.some(v=>!id(v))||new Set(deleted).size!==deleted.length||entries.some(e=>deleted.includes(e.id))||contents.some(c=>deleted.includes(c.id))||count>500)throw fail('DataError');
 if(batch.cursor!==undefined&&batch.cursor!==null&&!(typeof batch.cursor==='string'&&batch.cursor.length<=1000)&&!(batch.cursor&&Object.prototype.toString.call(batch.cursor)==='[object Object]'&&Object.keys(batch.cursor).sort().join(',')==='archiveId,epoch,format,principalId,sequence'&&batch.cursor.format==='sync-cursor/v1'&&[batch.cursor.archiveId,batch.cursor.epoch,batch.cursor.principalId].every(v=>typeof v==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(v))&&Number.isSafeInteger(batch.cursor.sequence)&&batch.cursor.sequence>=0))throw fail('DataError');
 if(batch.coverage!==undefined&&(!batch.coverage||typeof batch.coverage!=='object'||Array.isArray(batch.coverage)))throw fail('DataError');
 if(new TextEncoder().encode(JSON.stringify(batch)).length>4194304)throw fail('DataError');
 return structuredClone({...batch,entries,contents,commonUpserts:common,commonRemovals:removals,deletedEntryIds:deleted});
}
export function createLocalRepository({identity,enabled=()=>false,environment=globalThis,databaseName=DB_NAME}={}){
 let connection=null,opening=null,closed=false,schemaChanged=false;
 function authorize(){
  if(closed)throw fail('ClosedError');if(schemaChanged)throw fail('SchemaError');
  if(enabled()!==true)throw fail('NotEnabledError');
  const status=identity?.status(),scope=identity?.getScope();
  if(status?.verified!==true||status.cacheReady!==true||!validateScope(scope))throw fail('IdentityError');
  return {...scope};
 }
 function guard(scope){if(!sameScope(authorize(),scope))throw fail('ScopeChangedError');}
 async function openingDatabase(){
  if(connection)return connection;if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   let finished=false,request,upgradeError;
   const finish=(error,db)=>{if(finished){db?.close();return;}finished=true;clearTimeout(timer);if(error)reject(error);else resolve(db);};
   const timer=setTimeout(()=>finish(fail('TimeoutError')),TIMEOUT);
   try{
    const factory=environment.indexedDB;if(!factory)throw fail('NotSupportedError');
    request=factory.open(databaseName,VERSION);
    request.onupgradeneeded=event=>{
     if(finished||closed){request.transaction.abort();return;}
     try{const db=request.result;if(event.oldVersion<4&&db.objectStoreNames.contains('searchPostings'))db.deleteObjectStore('searchPostings');
    for(const name of STORES){
      const tail=name==='archiveMeta'?[]:name==='commonRecords'?['collection','id']:name==='drafts'?['kind','id']:name==='outbox'?['operationId']:['id'];
      const store=db.objectStoreNames.contains(name)?request.transaction.objectStore(name):db.createObjectStore(name,{keyPath:['archiveId','principalId','epoch',...tail]});
      if(!store.indexNames.contains('byScope'))store.createIndex('byScope',['archiveId','principalId','epoch']);
      if(name==='entries'&&!store.indexNames.contains('byScopeDate'))store.createIndex('byScopeDate',['archiveId','principalId','epoch','data.date']);
      if(name==='entries'&&!store.indexNames.contains('byScopeType'))store.createIndex('byScopeType',['archiveId','principalId','epoch','data.type']);
      if(name==='drafts'&&!store.indexNames.contains('byOwner'))store.createIndex('byOwner',['archiveId','principalId']);
      if(name==='commonRecords'&&!store.indexNames.contains('byCollection'))store.createIndex('byCollection',['archiveId','principalId','epoch','collection']);
      if(name==='commonRecords'&&!store.indexNames.contains('byCollectionDate'))store.createIndex('byCollectionDate',['archiveId','principalId','epoch','collection','data.date']);
      if(name==='commonRecords'&&!store.indexNames.contains('byCollectionEntry'))store.createIndex('byCollectionEntry',['archiveId','principalId','epoch','collection','data.entryId']);
      if(name==='outbox'&&!store.indexNames.contains('byScopeStatus'))store.createIndex('byScopeStatus',['archiveId','principalId','epoch','status','createdAt','operationId']);
      if(name==='outbox'&&!store.indexNames.contains('byScopeEntity'))store.createIndex('byScopeEntity',['archiveId','principalId','epoch','kind','id']);
      if(name==='outbox'&&!store.indexNames.contains('byScopeEntityStatus'))store.createIndex('byScopeEntityStatus',['archiveId','principalId','epoch','kind','id','status','createdAt','operationId']);
     }}catch(error){upgradeError=error;try{request.transaction.abort();}catch{}}
    };
    request.onblocked=()=>finish(fail('BlockedError'));request.onerror=()=>finish(upgradeError||request.error||fail('InvalidStateError'));
    request.onsuccess=()=>{
     const db=request.result;if(finished||closed){db.close();if(!finished)finish(fail('ClosedError'));return;}
     try{
      if(!STORES.every(name=>db.objectStoreNames.contains(name)))throw fail('SchemaError');
      const check=db.transaction(STORES,'readonly');
      for(const name of STORES){const store=check.objectStore(name),tail=name==='archiveMeta'?[]:name==='commonRecords'?['collection','id']:name==='drafts'?['kind','id']:name==='outbox'?['operationId']:['id'];if(JSON.stringify(store.keyPath)!==JSON.stringify(['archiveId','principalId','epoch',...tail])||JSON.stringify(store.index('byScope').keyPath)!==JSON.stringify(['archiveId','principalId','epoch']))throw fail('SchemaError');if(name==='entries'&&(JSON.stringify(store.index('byScopeDate').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','data.date'])||JSON.stringify(store.index('byScopeType').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','data.type'])))throw fail('SchemaError');if(name==='drafts'&&JSON.stringify(store.index('byOwner').keyPath)!==JSON.stringify(['archiveId','principalId']))throw fail('SchemaError');if(name==='commonRecords'&&JSON.stringify(store.index('byCollectionDate').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','collection','data.date']))throw fail('SchemaError');if(name==='commonRecords'&&(JSON.stringify(store.index('byCollection').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','collection'])||JSON.stringify(store.index('byCollectionEntry').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','collection','data.entryId'])))throw fail('SchemaError');if(name==='outbox'&&(JSON.stringify(store.index('byScopeStatus').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','status','createdAt','operationId'])||JSON.stringify(store.index('byScopeEntity').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','kind','id'])||JSON.stringify(store.index('byScopeEntityStatus').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','kind','id','status','createdAt','operationId'])))throw fail('SchemaError');}
     }catch(ignore){db.close();finish(fail('SchemaError'));return;}
     db.onversionchange=()=>{schemaChanged=true;db.close();connection=null;};connection=db;finish(null,db);
    };
   }catch(error){finish(error);}
  });
  try{return await opening;}finally{opening=null;}
 }
 async function execute(mode,names,enqueue){
  const scope=authorize(),db=await openingDatabase();guard(scope);
  return new Promise((resolve,reject)=>{
   let tx,value,cause,finished=false;
   const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);if(error)reject(error);else{try{guard(scope);resolve(value);}catch(e){reject(e);}}};
   const abort=error=>{cause=error;try{tx.abort();}catch{};};
   const timer=setTimeout(()=>{abort(fail('TimeoutError'));finish(fail('TimeoutError'));},TIMEOUT);
   try{
    tx=db.transaction(names,mode);tx.oncomplete=()=>finish();tx.onabort=()=>finish(cause||tx.error||fail('AbortError'));tx.onerror=()=>{};
    const request=(req,success)=>{req.onsuccess=()=>{try{guard(scope);success?.(req.result);}catch(error){abort(error);}};return req;};
    enqueue({scope,tx,request,done:result=>{value=result;}});
   }catch(error){if(tx){abort(error);}else finish(error);}
  });
 }
 const result=async fn=>{try{const scope=authorize(),value=await fn();guard(scope);return {ok:true,value,scope:{...scope}};}catch(error){return {ok:false,error:safe(error)};}};
 const metaDefault=scope=>({...scope,revision:0,cursor:null,coverage:{}});
 const validMeta=(stored,scope)=>{const value=stored||metaDefault(scope);if(value.schemaVersion!==1||value.protocolVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER)throw fail('SchemaError');return value;};
 function invalidateDraftSearch(scope,tx,request,done,affectsSearch=true){const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),revision=current.revision+1,coverage={...current.coverage};for(const key of ['journalPage','commonJournal'])if(coverage[key]?.revision===current.revision)coverage[key]={...coverage[key],revision};if(coverage.journalPages)coverage.journalPages={...coverage.journalPages,pages:journalPageDescriptors(coverage).map(page=>page.revision===current.revision?{...page,revision}:page)};if(coverage.commonJournals)coverage.commonJournals={...coverage.commonJournals,views:commonViewDescriptors(coverage).map(view=>view.revision===current.revision?{...view,revision}:view)};if(coverage.readCheckpoint?.revision===current.revision)coverage.readCheckpoint={...coverage.readCheckpoint,revision};coverage.localSearch={...(coverage.localSearch||{complete:false,documents:0}),fresh:!affectsSearch&&coverage.localSearch?.fresh===true,revision,cursor:current.cursor};store.put({...current,revision,coverage});done();});}
 const row=(scope,record,v)=>({...scope,id:record.id,version:v,data:record});
 function readOne(store,key){return result(()=>execute('readonly',[store],({scope,tx,request,done})=>request(tx.objectStore(store).get([...scopeKey(scope),...key]),value=>done(value?.data??value??null))));}
 function list(store,index,key){return result(()=>execute('readonly',[store],({scope,tx,request,done})=>request(tx.objectStore(store).index(index).getAll(key?key(scope):scopeKey(scope)),rows=>done(rows))));}
 return Object.freeze({
  getMeta:()=>result(()=>execute('readonly',['archiveMeta'],({scope,tx,request,done})=>request(tx.objectStore('archiveMeta').get(scopeKey(scope)),value=>done(validMeta(value,scope))))),
  setLocalConsent:enabled=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{if(typeof enabled!=='boolean')throw fail('DataError');const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);store.put({...current,localCacheConsent:enabled});done({enabled});});})),
  getEntry:idValue=>readOne('entries',[idValue]),getContent:idValue=>readOne('contents',[idValue]),
  getCommon:(collection,idValue)=>readOne('commonRecords',[collection,idValue]),getDraft:(kind,idValue)=>readOne('drafts',[kind,idValue]),
  listEntries:()=>list('entries','byScope'),listContents:()=>list('contents','byScope'),
  listCommon:collection=>Object.hasOwn(KEYS,collection)?list('commonRecords','byCollection',scope=>[...scopeKey(scope),collection]):Promise.resolve({ok:false,error:'DataError'}),
  listEntryFiles:entryId=>id(entryId)?list('commonRecords','byCollectionEntry',scope=>[...scopeKey(scope),'files',entryId]):Promise.resolve({ok:false,error:'DataError'}),
  listDrafts:()=>list('drafts','byScope'),
  invalidateReadCheckpoint:({affectsSearch=true}={})=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{
   if(typeof affectsSearch!=='boolean')throw fail('DataError');const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),revision=current.revision+1,search=current.coverage.localSearch,localSearch=affectsSearch?{...search,fresh:false}:{...search,fresh:search?.fresh===true&&search.revision===current.revision,revision,cursor:current.cursor};store.put({...current,revision,coverage:{...current.coverage,readCheckpoint:null,localSearch}});done(true);});
  })),
  markReadCheckpoint:expectedRevision=>result(()=>execute('readwrite',['archiveMeta','commonRecords'],({scope,tx,request,done})=>{
   const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope);if(meta.revision!==expectedRevision||meta.requiresBootstrap||!meta.cursor)throw fail('ConflictError');
    const coverage=meta.coverage||{},now=Date.now(),readCheckpoint={format:'local-read-checkpoint/v1',revision:meta.revision,cursor:meta.cursor,savedAt:now};
    if(coverage.consumer?.complete!==true||coverage.consumer?.docsScanComplete!==true){store.put({...meta,coverage:{...coverage,habitCatalogProof:null,readCheckpoint}});done(true);return;}
    const common=tx.objectStore('commonRecords'),catalogs={goals:[],habits:[]};let remaining=2;
    const finish=()=>{if(--remaining)return;for(const rows of Object.values(catalogs))if(rows.some(row=>typeof row.id!=='string'||!row.id||typeof row.version!=='string'||!row.version||row.data?.id!==row.id||row.data?.updatedAt!==row.version))throw fail('SchemaError');const proof={format:'verified-habit-catalog/v1',cursor:meta.cursor,savedAt:now,goals:catalogs.goals.map(row=>[row.id,row.version]).sort((a,b)=>a[0].localeCompare(b[0])),habits:catalogs.habits.map(row=>[row.id,row.version]).sort((a,b)=>a[0].localeCompare(b[0]))};store.put({...meta,coverage:{...coverage,habitCatalogProof:proof,readCheckpoint}});done(true);};
    for(const collection of ['goals','habits'])request(common.index('byCollection').getAll([...scopeKey(scope),collection]),rows=>{catalogs[collection]=rows;finish();});
   });
  })),
  // App state, current-month bodies, privacy, drafts and pending deletions
  // must share a transaction. A cursor alone does not prove a finished read.
  readBootstrapView:({month,taskOnly=false,today=month+'-01',kind='journal',week,date}={})=>result(()=>execute('readonly',['archiveMeta','entries','contents','commonRecords','drafts','outbox'],({scope,tx,request,done})=>{
   if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||typeof taskOnly!=='boolean')throw fail('DataError');
   if(!['journal','week','habits'].includes(kind)||kind!=='journal'&&taskOnly)throw fail('DataError');
   const commonScope=kind==='journal'?{kind,month,today}:kind==='week'?{kind,week}:{kind,week,date},ranges=commonReadRanges(commonScope);
   const entryRange=kind==='journal'?{from:month+'-',to:month+'.'}:kind==='week'?{from:week,to:ranges.days.to}:null;
   const inView=row=>!!entryRange&&row.date>=entryRange.from&&row.date<=entryRange.to;
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope),checkpoint=meta.coverage?.readCheckpoint,cursor=meta.cursor;
    if(meta.requiresBootstrap||meta.coverage?.consumer?.complete!==true||meta.coverage.consumer.docsScanComplete!==true||checkpoint?.format!=='local-read-checkpoint/v1'||checkpoint.revision!==meta.revision||!Number.isSafeInteger(checkpoint.savedAt)||checkpoint.savedAt<0||!cursor||cursor.format!=='sync-cursor/v1'||!Number.isSafeInteger(cursor.sequence)||cursor.sequence<0||!['archiveId','principalId','epoch'].every(key=>cursor[key]===scope[key])||JSON.stringify(checkpoint.cursor)!==JSON.stringify(cursor)){done(null);return;}
    const value={meta,entries:[],common:[],drafts:[],operations:[],commonScope:taskOnly?{kind:'full'}:commonScope};let remaining=4;
    const compare=(a,b)=>a<b?-1:a>b?1:0;
    const finish=()=>{if(--remaining===0){value.common.sort((a,b)=>compare(a.collection,b.collection)||compare(a.id,b.id));done(value);}};
    request(tx.objectStore('drafts').index('byScope').getAll(scopeKey(scope)),rows=>{value.drafts=rows;finish();});
    // Terminal receipts remain stored for replay/recovery, but cannot affect
    // this view. Read each active status in the same snapshot transaction.
    const outbox=tx.objectStore('outbox').index('byScopeStatus');let statuses=4;
    for(const status of ['pending','sending','conflict','failed'])request(outbox.getAll(environment.IDBKeyRange.bound([...scopeKey(scope),status],[...scopeKey(scope),status+'\u0000'],false,true)),rows=>{
     for(const row of rows)value.operations.push(row);
     if(--statuses===0){value.operations.sort((a,b)=>compare(a.operationId,b.operationId));finish();}
    });
    const common=tx.objectStore('commonRecords');
    if(taskOnly)request(common.index('byScope').getAll(scopeKey(scope)),rows=>{for(const row of rows)value.common.push(row);finish();});
    else{
     const logRanges=ranges.habitLogs.ranges||[ranges.habitLogs];let lists=6+logRanges.length;const seen=new Set();const collect=rows=>{for(const row of rows){const key=JSON.stringify([row.collection,row.id]);if(!seen.has(key)){seen.add(key);value.common.push(row);}}if(--lists===0)finish();};
     for(const collection of ['settings','projects','goals','habits'])request(common.index('byCollection').getAll([...scopeKey(scope),collection]),collect);
     for(const collection of ['days','weeks'])request(common.getAll(environment.IDBKeyRange.bound([...scopeKey(scope),collection,ranges[collection].from],[...scopeKey(scope),collection,ranges[collection].to])),collect);
     for(const range of logRanges)request(common.index('byCollectionDate').getAll(environment.IDBKeyRange.bound([...scopeKey(scope),'habitLogs',range.from],[...scopeKey(scope),'habitLogs',range.to])),collect);
    }
    // Keep all task metadata for global planning, but do not enumerate notes
    // outside this month. Both index reads share the checkpoint transaction.
    const entryStore=tx.objectStore('entries'),rowsById=new Map();let lists=taskOnly||!entryRange?1:2;
    const collect=incoming=>{
     for(const row of incoming)rowsById.set(row.id,row);
     if(--lists)return;
     const rows=[...rowsById.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),selected=rows.filter(row=>taskOnly?row.data.type==='task':inView(row.data));
     value.entries=rows.map(row=>({...row.data,contentLoaded:false}));let pending=selected.length*(taskOnly?1:3);
     const entryDone=()=>{if(--pending===0)finish();};
     if(!pending){finish();return;}
     const byId=new Map(value.entries.map(row=>[row.id,row]));
     for(const row of selected){
      if(!taskOnly){
       request(common.index('byCollectionEntry').getAll([...scopeKey(scope),'files',row.id]),rows=>{for(const row of rows)value.common.push(row);entryDone();});
       request(common.get([...scopeKey(scope),'layouts',row.id]),layout=>{if(layout)value.common.push(layout);entryDone();});
      }
      request(tx.objectStore('contents').get([...scopeKey(scope),row.id]),body=>{
       if(row.data.contentVersion===null){Object.assign(byId.get(row.id),{body:'',rich:[],contentLoaded:true});entryDone();return;}
       if(!body||body.version!==(row.data.contentVersion||row.version)||body.data?.version!==body.version||body.data.id!==row.id)throw fail('StaleVersionError');
       const {id:bodyId,version:bodyVersion,...content}=body.data;Object.assign(byId.get(row.id),content,{contentLoaded:true});entryDone();
      });
     }
    };
    request(entryStore.index('byScopeType').getAll([...scopeKey(scope),'task']),collect);
    if(!taskOnly&&entryRange)request(entryStore.index('byScopeDate').getAll(environment.IDBKeyRange.bound([...scopeKey(scope),entryRange.from],[...scopeKey(scope),entryRange.to],false,kind==='journal')),collect);
   });
  })),
  // Page membership, metadata and matching bodies must come from one read
  // transaction. Separate getMeta/getEntry/getContent calls can mix revisions.
  readRemoteView:key=>result(()=>execute('readonly',['archiveMeta','entries','contents'],({scope,tx,request,done})=>{
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope),pages=journalPageDescriptors(meta.coverage),view=key===undefined?pages.at(-1):pages.find(page=>page.key===key);
    if(!view||view.format!=='journal-page/v1'||view.revision!==meta.revision){done(null);return;}
    if(typeof view.key!=='string'||!Array.isArray(view.items)||view.items.length>25||new Set(view.items.map(item=>item?.id)).size!==view.items.length||view.items.some(item=>!id(item?.id)||!version(item?.version)))throw fail('SchemaError');
    const entries=new Array(view.items.length);let remaining=view.items.length*2,missing=false;
    const finish=()=>{if(--remaining===0){if(entries.some(pair=>!pair.entry||!pair.content||pair.content.version!==(pair.entry.contentVersion||pair.entry.updatedAt)))missing=true;done(missing?null:{view,entries});}};
    if(!remaining){done({view,entries});return;}
    view.items.forEach((item,index)=>{
     const pair={};entries[index]=pair;
     request(tx.objectStore('entries').get([...scopeKey(scope),item.id]),row=>{if(!row||row.version!==item.version||row.data?.id!==item.id||row.data?.updatedAt!==item.version)missing=true;else pair.entry=row.data;finish();});
     request(tx.objectStore('contents').get([...scopeKey(scope),item.id]),row=>{if(!row||row.data?.id!==item.id||row.data?.version!==row.version)missing=true;else pair.content=row.data;finish();});
    });
   });
  })),
  readRemoteCommonView:key=>result(()=>execute('readonly',['archiveMeta','commonRecords'],({scope,tx,request,done})=>{
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope),views=commonViewDescriptors(meta.coverage),view=key===undefined?views.at(-1):views.find(view=>view.key===key);
    if(!view||!['common-journal/v1','common-period/v1'].includes(view.format)||view.revision!==meta.revision){done(null);return;}
    if(typeof view.key!=='string'||!Array.isArray(view.items)||view.items.length>500||new Set(view.items.map(item=>JSON.stringify([item?.collection,item?.id]))).size!==view.items.length||view.items.some(item=>!['projects','goals','habits','days','weeks','habitLogs'].includes(item?.collection)||!id(item.id)||!version(item.version)))throw fail('SchemaError');
    const records=new Array(view.items.length);let remaining=records.length,missing=false;
    if(!remaining){done({view,records});return;}
    view.items.forEach((item,index)=>request(tx.objectStore('commonRecords').get([...scopeKey(scope),item.collection,item.id]),row=>{
     if(!row||row.version!==item.version||row.data?.[KEYS[item.collection]]!==item.id||row.data?.updatedAt!==item.version)missing=true;
     else records[index]={collection:item.collection,data:row.data};
     if(--remaining===0)done(missing?null:{view,records});
    }));
   });
  })),
  listRecoveryDrafts:()=>result(async()=>{const scope=authorize(),response=await list('drafts','byOwner',scope=>[scope.archiveId,scope.principalId]);if(!response.ok)throw fail(response.error);guard(scope);return response.value.filter(r=>r.epoch!==scope.epoch);}),
  applyRemoteBatch:input=>result(async()=>{
   const batch=validateBatch(input);
   return execute('readwrite',REMOTE,({scope,tx,request,done})=>{
    const meta=tx.objectStore('archiveMeta'),entries=tx.objectStore('entries'),contents=tx.objectStore('contents'),common=tx.objectStore('commonRecords');
    request(meta.get(scopeKey(scope)),stored=>{
     const previous=validMeta(stored,scope);if(previous.revision!==batch.expectedRevision)throw fail('ConflictError');
     if(batch.cursor&&typeof batch.cursor==='object'&&(batch.cursor.archiveId!==scope.archiveId||batch.cursor.epoch!==scope.epoch||batch.cursor.principalId!==scope.principalId))throw fail('ScopeChangedError');
     if(batch.cursor&&typeof batch.cursor==='object'&&previous.cursor&&typeof previous.cursor==='object'){
      if(batch.cursor.sequence<previous.cursor.sequence||batch.cursor.sequence>previous.cursor.sequence+1)throw fail('StaleVersionError');
     }
     for(const entry of batch.entries)request(entries.get([...scopeKey(scope),entry.id]),old=>{
      if(old&&compareVersion(old.version,entry.updatedAt)>0){if(batch.cursor&&typeof batch.cursor==='object')return;throw fail('StaleVersionError');}
      const data={...entry};for(const key of ['contentVersion','contentDigest','position'])if(!Object.hasOwn(data,key)&&Object.hasOwn(old?.data||{},key))data[key]=old.data[key];
      entries.put(row(scope,data,entry.updatedAt));
      const bodyChanged=old&&(Object.hasOwn(old.data||{},'contentVersion')?old.data.contentVersion!==data.contentVersion:old.version!==entry.updatedAt);
      if(bodyChanged)contents.delete([...scopeKey(scope),entry.id]);
     });
     // Run content checks after all metadata reads have enqueued their writes.
     // A second read observes those writes within this same transaction.
     const writeContents=()=>{for(const content of batch.contents)request(entries.get([...scopeKey(scope),content.id]),entry=>{
      const expected=entry?.data?.contentVersion||entry?.version;if(!entry||expected!==content.version)throw fail('StaleVersionError');contents.put(row(scope,content,content.version));
     });};
     if(batch.entries.length){let remaining=batch.entries.length;for(const entry of batch.entries)request(entries.get([...scopeKey(scope),entry.id]),()=>{if(--remaining===0)writeContents();});}else writeContents();
     for(const [collection,records]of Object.entries(batch.commonUpserts))for(const record of records){const idValue=record[KEYS[collection]],v=collection==='files'?(record.updatedAt||record.addedAt):['settings','layouts'].includes(collection)?record.version:record.updatedAt;request(common.get([...scopeKey(scope),collection,idValue]),old=>{if(old&&compareVersion(old.version,v)>0){if(batch.cursor&&typeof batch.cursor==='object')return;throw fail('StaleVersionError');}common.put({...scope,collection,id:idValue,version:v,data:record});});}
     const feedVersion=batch.cursor&&typeof batch.cursor==='object'?'commit-'+batch.cursor.sequence:null;
     for(const [collection,ids]of Object.entries(batch.commonRemovals))for(const idValue of ids)request(common.get([...scopeKey(scope),collection,idValue]),old=>{if(old&&feedVersion&&compareVersion(old.version,feedVersion)>0)return;common.delete([...scopeKey(scope),collection,idValue]);});
     const deletedApplied=new Set();let pendingDeletes=batch.deletedEntryIds.length;
     const finishEntryDeletes=()=>{if(--pendingDeletes!==0)return;const deleted=deletedApplied;if(!deleted.size)return;request(common.index('byScope').openCursor(environment.IDBKeyRange.only(scopeKey(scope))),function walk(cursor){if(!cursor)return;if(['files','taskPlans'].includes(cursor.value.collection)&&deleted.has(cursor.value.data.entryId))cursor.delete();cursor.continue();});};
     for(const idValue of batch.deletedEntryIds)request(entries.get([...scopeKey(scope),idValue]),old=>{if(!(old&&feedVersion&&compareVersion(old.version,feedVersion)>0)){entries.delete([...scopeKey(scope),idValue]);contents.delete([...scopeKey(scope),idValue]);deletedApplied.add(idValue);}finishEntryDeletes();});
     const coverage={...previous.coverage,...(batch.coverage||{})};
     const catalogChanged=['goals','habits'].some(collection=>(batch.commonUpserts[collection]||[]).length||(batch.commonRemovals[collection]||[]).length);
     if(catalogChanged)coverage.habitCatalogProof=null;
     else if(batch.cursor&&typeof batch.cursor==='object'&&coverage.habitCatalogProof?.format==='verified-habit-catalog/v1')coverage.habitCatalogProof={...coverage.habitCatalogProof,cursor:batch.cursor};
     // An unrelated read must not evict another valid preview. Mutations of
     // its own stores still invalidate the entire descriptor conservatively.
     const entryChanges=batch.entries.length||batch.contents.length||batch.deletedEntryIds.length;
     const commonChanges=Object.values(batch.commonUpserts).some(rows=>rows.length)||Object.values(batch.commonRemovals).some(ids=>ids.length)||batch.deletedEntryIds.length;
     for(const [key,changed]of [['journalPage',entryChanges],['commonJournal',commonChanges]])if(!Object.hasOwn(batch.coverage||{},key)&&!changed&&coverage[key]?.revision===previous.revision)coverage[key]={...coverage[key],revision:previous.revision+1};
     if(!Object.hasOwn(batch.coverage||{},'journalPages')&&!entryChanges&&coverage.journalPages)coverage.journalPages={...coverage.journalPages,pages:journalPageDescriptors(coverage).map(page=>page.revision===previous.revision?{...page,revision:previous.revision+1}:page)};
     if(!Object.hasOwn(batch.coverage||{},'commonJournals')&&!commonChanges&&coverage.commonJournals)coverage.commonJournals={...coverage.commonJournals,views:commonViewDescriptors(coverage).map(view=>view.revision===previous.revision?{...view,revision:previous.revision+1}:view)};
     const nextRevision=previous.revision+1;
     coverage.localSearch={...(coverage.localSearch||{complete:false,documents:0}),fresh:false,revision:nextRevision,cursor:batch.cursor===undefined?previous.cursor:batch.cursor};
     const next={...previous,revision:nextRevision,cursor:batch.cursor===undefined?previous.cursor:batch.cursor,coverage};
     meta.put(next);done({revision:next.revision});
    });
   });
  }),
  putDraft:input=>result(()=>{input=structuredClone(input);return execute('readwrite',['drafts','archiveMeta'],({scope,tx,request,done})=>{
   if(!input||!id(input.id)||!id(input.kind)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.baseVersion!=='string'||input.snapshot===undefined)throw fail('DataError');
   if(input.baseVersion.length>200||new TextEncoder().encode(JSON.stringify(input.snapshot)).length>4194304)throw fail('DataError');
   const store=tx.objectStore('drafts'),key=[...scopeKey(scope),input.kind,input.id];
   request(store.get(key),old=>{if((old?.localRevision||0)!==input.expectedRevision)throw fail('ConflictError');const draft={...scope,kind:input.kind,id:input.id,baseVersion:input.baseVersion,localRevision:(old?.localRevision||0)+1,snapshot:structuredClone(input.snapshot)};store.put(draft);if(['note','task'].includes(input.kind))invalidateDraftSearch(scope,tx,request,()=>done({localRevision:draft.localRevision}));else done({localRevision:draft.localRevision});});
  });}),
  saveLocalOperation:input=>result(()=>{try{input=structuredClone(input);}catch{throw fail('DataError');}return execute('readwrite',input?.kind==='log'?['drafts','outbox','archiveMeta','commonRecords']:['drafts','outbox','archiveMeta'],({scope,tx,request,done})=>{
   const allowed=['operationId','kind','id','expectedRevision','baseVersion','action','payload','snapshot','dependencies'];
   if(!input||Object.keys(input).some(key=>!allowed.includes(key)&&key!=='habitCatalogGuard')||!id(input.operationId)||!['note','task','day','week','log'].includes(input.kind)||!id(input.id)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!(input.baseVersion===null||typeof input.baseVersion==='string'&&input.baseVersion.length<=200)||!['upsert','delete'].includes(input.action)||!input.payload||Object.prototype.toString.call(input.payload)!=='[object Object]'||(periodOperation(input.kind)?input.action!=='upsert'||!periodOperation(input.kind).validOperation(input.payload,input.id,input.baseVersion,input.operationId):input.payload.id!==input.id||input.payload.operationId!==input.operationId||input.payload.baseVersion!==input.baseVersion)||!Array.isArray(input.dependencies||[])||(input.dependencies||[]).length>50||(input.dependencies||[]).some(dep=>!id(dep)||dep===input.operationId)||new Set(input.dependencies||[]).size!==(input.dependencies||[]).length||input.kind==='log'&&(!input.habitCatalogGuard||!id(input.habitCatalogGuard.habitId)||!id(input.habitCatalogGuard.goalId)||!id(input.habitCatalogGuard.habitUpdatedAt)||!id(input.habitCatalogGuard.goalUpdatedAt)||!input.habitCatalogGuard.cursor||typeof input.habitCatalogGuard.cursor!=='object'))throw fail('DataError');
   if(periodOperation(input.kind)&&(!input.snapshot||input.snapshot.updatedAt!==(input.baseVersion||'')||Object.keys(input.snapshot).sort().join(',')!==[...Object.keys(input.payload[input.kind]),'updatedAt'].sort().join(',')||canonicalDayJSON(periodOperation(input.kind).snapshot(input.snapshot))!==canonicalDayJSON(input.payload[input.kind])))throw fail('DataError');
   const payloadBytes=new TextEncoder().encode(JSON.stringify(input.payload)).length,snapshotBytes=new TextEncoder().encode(JSON.stringify(input.snapshot)).length;if(payloadBytes>1048576||snapshotBytes>524288||!input.snapshot||Object.prototype.toString.call(input.snapshot)!=='[object Object]')throw fail('DataError');
   const drafts=tx.objectStore('drafts'),outbox=tx.objectStore('outbox'),draftKey=[...scopeKey(scope),input.kind,input.id],operationKey=[...scopeKey(scope),input.operationId];
   const persistDraft=old=>{
    request(outbox.get(operationKey),existing=>{
     if(existing)throw fail('ConflictError');
     const write=()=>request(outbox.index('byScopeEntityStatus').getAll(environment.IDBKeyRange.bound([...scopeKey(scope),input.kind,input.id,'pending',0,''],[...scopeKey(scope),input.kind,input.id,'pending',Number.MAX_SAFE_INTEGER,'\uffff'])),candidates=>{
      const compatible=candidates.filter(item=>item.status==='pending'&&item.attempts===0&&item.leaseToken===undefined&&item.baseVersion===input.baseVersion&&syncDependenciesEqual(item.dependencies||[],input.dependencies||[]));
      const coalesced=compatible.length===1?compatible[0]:null,localRevision=(old?.localRevision||0)+1,draft={...scope,kind:input.kind,id:input.id,baseVersion:input.baseVersion||'',localRevision,snapshot:structuredClone(input.snapshot)};
      const operation=coalesced?{...coalesced,action:input.action,payload:{...structuredClone(input.payload),operationId:coalesced.operationId},localRevision}:{...scope,operationId:input.operationId,kind:input.kind,id:input.id,action:input.action,baseVersion:input.baseVersion,payload:structuredClone(input.payload),localRevision,dependencies:[...(input.dependencies||[])],status:'pending',attempts:0,createdAt:Date.now(),nextAttemptAt:0,lastError:null};
      drafts.put(draft);outbox.put(operation);invalidateDraftSearch(scope,tx,request,()=>done({operationId:operation.operationId,localRevision,status:operation.status,coalesced:!!coalesced,baseVersion:operation.baseVersion}),!periodOperation(input.kind));
     });
     // An ACK can land between the UI pre-read and this transaction. Rebase
     // only on a proven same-kind period dependency, before this new ID is ever sent.
     if(periodOperation(input.kind)&&old&&old.baseVersion!==(input.baseVersion||'')){
      const dependencies=input.dependencies||[];if(!dependencies.length)throw fail('ConflictError');let remaining=dependencies.length,proven=false;
      for(const dependency of dependencies)request(outbox.get([...scopeKey(scope),dependency]),row=>{
       if(row?.kind===input.kind&&row.id===input.id&&row.status==='acked'&&row.serverVersion===old.baseVersion)proven=true;
       if(--remaining===0){if(!proven)throw fail('ConflictError');input.baseVersion=old.baseVersion||null;input.payload.baseVersion=input.baseVersion;input.snapshot.updatedAt=old.baseVersion;write();}
      });
     }else write();
    });
   };
   const continueSave=()=>request(drafts.get(draftKey),old=>{
    const revision=old?.localRevision||0;if(revision===input.expectedRevision){persistDraft(old);return;}
    const dependencies=input.dependencies||[];if(!periodOperation(input.kind)||revision!==input.expectedRevision+1||!dependencies.length)throw fail('ConflictError');let remaining=dependencies.length,proven=false;
    for(const dependency of dependencies)request(outbox.get([...scopeKey(scope),dependency]),item=>{if(item?.kind===input.kind&&item.id===input.id&&item.status==='acked'&&item.serverVersion===(old?.baseVersion||''))proven=true;if(--remaining===0){if(!proven)throw fail('ConflictError');input.expectedRevision=revision;input.baseVersion=old?.baseVersion||null;input.payload.baseVersion=input.baseVersion;if(input.snapshot?.updatedAt!==undefined)input.snapshot.updatedAt=input.baseVersion||'';persistDraft(old);}});
   });
   if(input.kind==='log'){
    const guard=input.habitCatalogGuard,meta=tx.objectStore('archiveMeta'),common=tx.objectStore('commonRecords');let remaining=3,storedMeta,habit,goal;
    const verify=()=>{if(--remaining)return;const proof=storedMeta?.coverage?.habitCatalogProof,cursor=storedMeta?.cursor;if(storedMeta?.requiresBootstrap||storedMeta?.coverage?.consumer?.complete!==true||storedMeta.coverage.consumer.docsScanComplete!==true||proof?.format!=='verified-habit-catalog/v1'||!Array.isArray(proof.goals)||!Array.isArray(proof.habits)||!cursor||JSON.stringify(cursor)!==JSON.stringify(proof.cursor)||JSON.stringify(cursor)!==JSON.stringify(guard.cursor)||!proof.habits.some(([catalogId,v])=>catalogId===guard.habitId&&v===guard.habitUpdatedAt)||!proof.goals.some(([catalogId,v])=>catalogId===guard.goalId&&v===guard.goalUpdatedAt)||habit?.data?.id!==guard.habitId||habit?.version!==guard.habitUpdatedAt||habit.data.updatedAt!==guard.habitUpdatedAt||goal?.data?.id!==guard.goalId||goal?.version!==guard.goalUpdatedAt||goal.data.updatedAt!==guard.goalUpdatedAt||habit.data.goalId!==guard.goalId)throw fail('StaleVersionError');continueSave();};
    request(meta.get(scopeKey(scope)),value=>{storedMeta=value;verify();});request(common.get([...scopeKey(scope),'habits',guard.habitId]),value=>{habit=value;verify();});request(common.get([...scopeKey(scope),'goals',guard.goalId]),value=>{goal=value;verify();});
   }else continueSave();
  });}),
  getOutbox:operationId=>readOne('outbox',[operationId]),
  retryFailedOutbox:operationId=>result(()=>execute('readwrite',['outbox','archiveMeta'],({scope,tx,request,done})=>{
   if(!id(operationId))throw fail('DataError');const store=tx.objectStore('outbox');request(store.get([...scopeKey(scope),operationId]),operation=>{if(!operation||operation.status!=='failed')throw fail('ConflictError');store.put({...operation,status:'pending',nextAttemptAt:0});invalidateDraftSearch(scope,tx,request,()=>done({operationId,status:'pending'}),!periodOperation(operation.kind));});
  })),
  confirmMissingDelete:input=>result(()=>execute('readwrite',['drafts','outbox','archiveMeta'],({scope,tx,request,done})=>{
   if(!input||!['note','task'].includes(input.kind)||!id(input.id)||!id(input.operationId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)throw fail('DataError');
   const drafts=tx.objectStore('drafts'),store=tx.objectStore('outbox'),key=[...scopeKey(scope),input.kind,input.id],meta=tx.objectStore('archiveMeta');
   request(drafts.get(key),draft=>{if(!draft||draft.localRevision!==input.expectedRevision||draft.snapshot?.deleted!==true)throw fail('ConflictError');request(store.get([...scopeKey(scope),input.operationId]),existing=>{if(existing)throw fail('ConflictError');request(store.index('byScope').getAll(scopeKey(scope)),all=>{const rows=all.filter(row=>row.kind===input.kind&&row.id===input.id&&['pending','sending','conflict','failed'].includes(row.status)),ids=new Set(rows.map(row=>row.operationId));if(!rows.some(row=>row.status==='conflict')||rows.some(row=>!['upsert','delete'].includes(row.action)||row.status!=='conflict'&&(row.status!=='pending'||row.attempts!==0))||all.some(row=>!ids.has(row.operationId)&&['pending','sending','conflict','failed'].includes(row.status)&&(row.dependencies||[]).some(dep=>ids.has(dep)))||rows.some(row=>(row.dependencies||[]).some(dep=>!ids.has(dep)&&all.find(other=>other.operationId===dep)?.status!=='acked')))throw fail('ConflictError');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),revision=current.revision+1,coverage={...current.coverage,localSearch:{...(current.coverage.localSearch||{complete:false,documents:0}),fresh:false,revision,cursor:current.cursor}};meta.put({...current,revision,coverage,requiresBootstrap:true});for(const row of rows)store.put({...row,status:'superseded',resolvedBy:input.operationId,...(row.status==='conflict'?{localSnapshot:draft.snapshot,remoteMissing:true}: {})});drafts.delete(key);done({confirmed:true});});});});});
  })),
  recreateMissingConflict:input=>result(()=>execute('readwrite',['drafts','outbox','entries','archiveMeta'],({scope,tx,request,done})=>{
   if(!input||!['note','task'].includes(input.kind)||!id(input.id)||!id(input.newId)||input.id===input.newId||!id(input.operationId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)throw fail('DataError');
   const drafts=tx.objectStore('drafts'),store=tx.objectStore('outbox'),oldKey=[...scopeKey(scope),input.kind,input.id],newKey=[...scopeKey(scope),input.kind,input.newId];
   request(drafts.get(oldKey),draft=>{if(!draft||draft.localRevision!==input.expectedRevision||draft.snapshot?.deleted)throw fail('ConflictError');request(drafts.get(newKey),newDraft=>{if(newDraft)throw fail('ConflictError');request(tx.objectStore('entries').get([...scopeKey(scope),input.newId]),entry=>{if(entry)throw fail('ConflictError');request(store.get([...scopeKey(scope),input.operationId]),existing=>{if(existing)throw fail('ConflictError');request(store.index('byScope').getAll(scopeKey(scope)),all=>{const rows=all.filter(row=>row.kind===input.kind&&row.id===input.id&&['pending','sending','conflict','failed'].includes(row.status)),ids=new Set(rows.map(row=>row.operationId));if(!rows.some(row=>row.status==='conflict')||rows.some(row=>row.action!=='upsert'||row.status!=='conflict'&&(row.status!=='pending'||row.attempts!==0))||all.some(row=>row.id===input.newId||!ids.has(row.operationId)&&['pending','sending','conflict','failed'].includes(row.status)&&(row.dependencies||[]).some(dep=>ids.has(dep)))||rows.some(row=>(row.dependencies||[]).some(dep=>!ids.has(dep)&&all.find(other=>other.operationId===dep)?.status!=='acked')))throw fail('ConflictError');const snapshot={...draft.snapshot,id:input.newId,clientId:input.newId,updatedAt:''},payload={...snapshot,operationId:input.operationId,baseVersion:null};for(const row of rows)store.put({...row,status:'superseded',resolvedBy:input.operationId,...(row.status==='conflict'?{localSnapshot:draft.snapshot,remoteMissing:true}: {})});drafts.delete(oldKey);drafts.put({...draft,id:input.newId,baseVersion:'',localRevision:1,snapshot});store.put({...scope,operationId:input.operationId,kind:input.kind,id:input.newId,action:'upsert',baseVersion:null,payload,localRevision:1,dependencies:[],status:'pending',attempts:0,createdAt:Date.now(),nextAttemptAt:0,lastError:null});invalidateDraftSearch(scope,tx,request,()=>done({id:input.newId,localRevision:1}));});});});});});
  })),
  resolveOutboxConflict:input=>result(()=>{input=structuredClone(input);return execute('readwrite',input?.kind==='log'&&input.choice!=='remote'?['drafts','outbox','archiveMeta','commonRecords']:['drafts','outbox','archiveMeta'],({scope,tx,request,done})=>{
   if(!input||input.habitUpdatedAt!==undefined&&(input.kind!=='log'||typeof input.habitUpdatedAt!=='string'||input.habitUpdatedAt.length>200)||!['local','remote'].includes(input.choice||'local')||!['note','task','day','week','log'].includes(input.kind)||!id(input.id)||!id(input.operationId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||(periodOperation(input.kind)&&input.remoteVersion===null?input.remote?.[periodOperation(input.kind).key]!==input.id||input.remote?.missing!==true:typeof input.remoteVersion!=='string'||!input.remoteVersion||input.remoteVersion.length>200||!input.remote||(periodOperation(input.kind)?input.remote[periodOperation(input.kind).key]:input.remote.id)!==input.id||input.remote.updatedAt!==input.remoteVersion)||input.kind==='log'&&input.choice!=='remote'&&(!input.habitCatalogGuard||!id(input.habitCatalogGuard.habitId)||!id(input.habitCatalogGuard.goalId)||!id(input.habitCatalogGuard.habitUpdatedAt)||!id(input.habitCatalogGuard.goalUpdatedAt)||!input.habitCatalogGuard.cursor||typeof input.habitCatalogGuard.cursor!=='object')||new TextEncoder().encode(JSON.stringify(input.remote)).length>1048576)throw fail('DataError');
   const drafts=tx.objectStore('drafts'),store=tx.objectStore('outbox'),key=[...scopeKey(scope),input.kind,input.id];
   const resolve=()=>request(drafts.get(key),draft=>{if(!draft||draft.localRevision!==input.expectedRevision)throw fail('ConflictError');request(store.get([...scopeKey(scope),input.operationId]),existing=>{if(existing)throw fail('ConflictError');request(store.index('byScope').getAll(scopeKey(scope)),all=>{const rows=all.filter(row=>row.kind===input.kind&&row.id===input.id&&['pending','sending','conflict','failed'].includes(row.status)),ids=new Set(rows.map(row=>row.operationId));if(!rows.some(row=>row.status==='conflict')||rows.some(row=>!['upsert','delete'].includes(row.action)||row.status!=='conflict'&&(row.status!=='pending'||row.attempts!==0))||all.some(row=>!ids.has(row.operationId)&&['pending','sending','conflict','failed'].includes(row.status)&&(row.dependencies||[]).some(dep=>ids.has(dep)))||rows.some(row=>(row.dependencies||[]).some(dep=>!ids.has(dep)&&all.find(other=>other.operationId===dep)?.status!=='acked')))throw fail('ConflictError');if(input.choice==='remote'){const meta=tx.objectStore('archiveMeta');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),revision=current.revision+1,coverage={...current.coverage,localSearch:{...(current.coverage.localSearch||{complete:false,documents:0}),fresh:false,revision,cursor:current.cursor}};meta.put({...current,revision,coverage,requiresBootstrap:true});for(const row of rows)store.put({...row,status:'superseded',resolvedBy:input.operationId,...(row.status==='conflict'?{remoteSnapshot:input.remote,localSnapshot:draft.snapshot}: {})});drafts.delete(key);done({choice:'remote',cacheRevision:revision});});return;}const revision=draft.localRevision+1,action=draft.snapshot.deleted===true?'delete':'upsert',payload=action==='delete'?{id:input.id,operationId:input.operationId,baseVersion:input.remoteVersion}:periodOperation(input.kind)?{[input.kind]:periodOperation(input.kind).snapshot(draft.snapshot),operationId:input.operationId,baseVersion:input.remoteVersion,...(input.kind==='log'?{habitUpdatedAt:input.habitUpdatedAt??rows.reduce((latest,row)=>row.localRevision>latest.localRevision?row:latest).payload.habitUpdatedAt}:{})}:{...draft.snapshot,id:input.id,operationId:input.operationId,baseVersion:input.remoteVersion};for(const row of rows)store.put({...row,status:'superseded',resolvedBy:input.operationId,...(row.status==='conflict'?{remoteSnapshot:input.remote}: {})});drafts.put({...draft,baseVersion:input.remoteVersion||'',localRevision:revision});store.put({...scope,operationId:input.operationId,kind:input.kind,id:input.id,action,baseVersion:input.remoteVersion,payload,localRevision:revision,dependencies:[],status:'pending',attempts:0,createdAt:Date.now(),nextAttemptAt:0,lastError:null});invalidateDraftSearch(scope,tx,request,()=>done({operationId:input.operationId,localRevision:revision}),!periodOperation(input.kind));});});});
   if(input.kind==='log'&&input.choice!=='remote'){
    const guard=input.habitCatalogGuard,meta=tx.objectStore('archiveMeta'),common=tx.objectStore('commonRecords');let remaining=3,storedMeta,habit,goal;
    const check=()=>{if(--remaining)return;const proof=storedMeta?.coverage?.habitCatalogProof,cursor=storedMeta?.cursor;if(storedMeta?.requiresBootstrap||storedMeta?.coverage?.consumer?.complete!==true||storedMeta.coverage.consumer.docsScanComplete!==true||proof?.format!=='verified-habit-catalog/v1'||!Array.isArray(proof.goals)||!Array.isArray(proof.habits)||!cursor||JSON.stringify(cursor)!==JSON.stringify(proof.cursor)||JSON.stringify(cursor)!==JSON.stringify(guard.cursor)||!proof.habits.some(([catalogId,v])=>catalogId===guard.habitId&&v===guard.habitUpdatedAt)||!proof.goals.some(([catalogId,v])=>catalogId===guard.goalId&&v===guard.goalUpdatedAt)||habit?.data?.id!==guard.habitId||habit?.version!==guard.habitUpdatedAt||habit.data.updatedAt!==guard.habitUpdatedAt||goal?.data?.id!==guard.goalId||goal?.version!==guard.goalUpdatedAt||goal.data.updatedAt!==guard.goalUpdatedAt||habit.data.goalId!==guard.goalId)throw fail('StaleVersionError');resolve();};
    request(meta.get(scopeKey(scope)),value=>{storedMeta=value;check();});request(common.get([...scopeKey(scope),'habits',guard.habitId]),value=>{habit=value;check();});request(common.get([...scopeKey(scope),'goals',guard.goalId]),value=>{goal=value;check();});
   }else resolve();
  });}),
  discardUnsentCreate:input=>result(()=>execute('readwrite',['drafts','outbox','archiveMeta'],({scope,tx,request,done})=>{
   if(!input||!['note','task'].includes(input.kind)||!id(input.id)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)throw fail('DataError');
   const drafts=tx.objectStore('drafts'),outbox=tx.objectStore('outbox'),key=[...scopeKey(scope),input.kind,input.id];
   request(drafts.get(key),draft=>{if(!draft||draft.localRevision!==input.expectedRevision||draft.baseVersion)throw fail('ConflictError');request(outbox.index('byScopeEntity').getAll(key),rows=>{const active=rows.filter(row=>row.status!=='acked');if(rows.some(row=>row.status==='acked')||active.length!==1||active[0].action!=='upsert'||active[0].baseVersion!==null||active[0].status!=='pending'||active[0].attempts!==0)throw fail('ConflictError');const operation=active[0];request(outbox.index('byScope').getAll(scopeKey(scope)),all=>{if(all.some(row=>row.operationId!==operation.operationId&&(row.dependencies||[]).includes(operation.operationId)))throw fail('ConflictError');drafts.delete(key);outbox.delete([...scopeKey(scope),operation.operationId]);invalidateDraftSearch(scope,tx,request,()=>done({discarded:true}));});});});
  })),
  listOutbox:()=>list('outbox','byScope'),
  readEntityDraftAndOutbox:input=>result(()=>execute('readonly',['drafts','outbox'],({scope,tx,request,done})=>{if(!input||!['note','task','day','week','log'].includes(input.kind)||!id(input.id))throw fail('DataError');const key=[...scopeKey(scope),input.kind,input.id],index=tx.objectStore('outbox').index('byScopeEntityStatus'),statuses=['pending','sending','conflict','failed'],rows=[];let draft=null,remaining=statuses.length+1;const finish=()=>{if(--remaining===0)done({draft,operations:rows.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId))});};request(tx.objectStore('drafts').get(key),value=>{draft=value||null;finish();});for(const status of statuses){const prefix=[...key,status],range=environment.IDBKeyRange.bound([...prefix,0,''],[...prefix,Number.MAX_SAFE_INTEGER,'\uffff']);request(index.getAll(range),items=>{rows.push(...items);finish();});}})),
  readLocalDayState:date=>result(()=>execute('readonly',['commonRecords','drafts','outbox'],({scope,tx,request,done})=>{
   if(!validDayDate(date))throw fail('DataError');const key=[...scopeKey(scope),'day',date],operations=[];let remaining=6,draft=null,record=null;
   const finish=()=>{if(--remaining===0)done({record,draft,operations:operations.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId))});};
   request(tx.objectStore('commonRecords').get([...scopeKey(scope),'days',date]),row=>{record=row?.data||null;finish();});request(tx.objectStore('drafts').get(key),row=>{draft=row||null;finish();});
   for(const status of ['pending','sending','conflict','failed'])request(tx.objectStore('outbox').index('byScopeEntityStatus').getAll(environment.IDBKeyRange.bound([...key,status,0,''],[...key,status,Number.MAX_SAFE_INTEGER,'\uffff'])),rows=>{operations.push(...rows);finish();});
  })),
  readLocalWeekState:date=>result(()=>execute('readonly',['commonRecords','drafts','outbox'],({scope,tx,request,done})=>{
   if(!periodOperation('week').validIdentity(date))throw fail('DataError');const key=[...scopeKey(scope),'week',date],operations=[];let remaining=6,draft=null,record=null;
   const finish=()=>{if(--remaining===0)done({record,draft,operations:operations.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId))});};
   request(tx.objectStore('commonRecords').get([...scopeKey(scope),'weeks',date]),row=>{record=row?.data||null;finish();});request(tx.objectStore('drafts').get(key),row=>{draft=row||null;finish();});
   for(const status of ['pending','sending','conflict','failed'])request(tx.objectStore('outbox').index('byScopeEntityStatus').getAll(environment.IDBKeyRange.bound([...key,status,0,''],[...key,status,Number.MAX_SAFE_INTEGER,'\uffff'])),rows=>{operations.push(...rows);finish();});
  })),
  readLocalLogState:date=>result(()=>execute('readonly',['commonRecords','drafts','outbox'],({scope,tx,request,done})=>{
   if(!periodOperation('log').validIdentity(date))throw fail('DataError');const key=[...scopeKey(scope),'log',date],operations=[];let remaining=6,draft=null,record=null;
   const finish=()=>{if(--remaining===0)done({record,draft,operations:operations.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId))});};
   request(tx.objectStore('commonRecords').get([...scopeKey(scope),'habitLogs',date]),row=>{record=row?.data||null;finish();});request(tx.objectStore('drafts').get(key),row=>{draft=row||null;finish();});
   for(const status of ['pending','sending','conflict','failed'])request(tx.objectStore('outbox').index('byScopeEntityStatus').getAll(environment.IDBKeyRange.bound([...key,status,0,''],[...key,status,Number.MAX_SAFE_INTEGER,'\uffff'])),rows=>{operations.push(...rows);finish();});
  })),
  readHabitLogCatalogBasis:input=>result(()=>execute('readonly',['archiveMeta','commonRecords'],({scope,tx,request,done})=>{
   if(!input||!id(input.habitId)||typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw fail('DataError');
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),meta=>{const proof=meta?.coverage?.habitCatalogProof,cursor=meta?.cursor,verified=meta?.requiresBootstrap!==true&&meta?.coverage?.consumer?.complete===true&&meta?.coverage?.consumer?.docsScanComplete===true&&proof?.format==='verified-habit-catalog/v1'&&Number.isSafeInteger(proof.savedAt)&&!!cursor&&JSON.stringify(proof.cursor)===JSON.stringify(cursor)&&cursor.archiveId===scope.archiveId&&cursor.principalId===scope.principalId&&cursor.epoch===scope.epoch&&Array.isArray(proof.goals)&&Array.isArray(proof.habits);if(!verified){done({verified:false});return;}const common=tx.objectStore('commonRecords');request(common.get([...scopeKey(scope),'habits',input.habitId]),habit=>{if(!habit||!proof.habits.some(([idValue,v])=>idValue===input.habitId&&v===habit.version)){done({verified:false});return;}request(common.get([...scopeKey(scope),'goals',habit.data?.goalId]),goal=>{request(common.get([...scopeKey(scope),'habitLogs',input.habitId+'|'+input.date]),log=>done({verified:!!goal&&proof.goals.some(([idValue,v])=>idValue===goal.id&&v===goal.version),cursor,habit:habit.data,habitVersion:habit.version,goal:goal?.data||null,goalVersion:goal?.version||null,log:log?.data||null,savedAt:proof.savedAt}));});});});
  })),
  listActiveEntityOutbox:input=>result(()=>execute('readonly',['outbox'],({scope,tx,request,done})=>{if(!input||!['note','task','day','week','log'].includes(input.kind)||!id(input.id))throw fail('DataError');const index=tx.objectStore('outbox').index('byScopeEntityStatus'),statuses=['pending','sending','conflict','failed'],rows=[];let remaining=statuses.length;for(const status of statuses){const prefix=[...scopeKey(scope),input.kind,input.id,status],range=environment.IDBKeyRange.bound([...prefix,0,''],[...prefix,Number.MAX_SAFE_INTEGER,'\uffff']);request(index.getAll(range),items=>{rows.push(...items);if(--remaining===0)done(rows.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId)));});}})),
  listActiveOutbox:()=>result(()=>execute('readonly',['outbox'],({scope,tx,request,done})=>{const index=tx.objectStore('outbox').index('byScopeStatus'),statuses=['pending','sending','conflict','failed'],rows=[];let remaining=statuses.length;for(const status of statuses){const range=environment.IDBKeyRange.bound([...scopeKey(scope),status],[...scopeKey(scope),status,Number.MAX_SAFE_INTEGER,'\uffff']);request(index.getAll(range),items=>{rows.push(...items);if(--remaining===0)done(rows.sort((a,b)=>a.createdAt-b.createdAt||a.operationId.localeCompare(b.operationId)));});}})),
  acquireOutboxLease:input=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','now','leaseMs'].includes(key))||!id(input.owner)||!id(input.token)||!Number.isSafeInteger(input.now)||input.now<0||!Number.isSafeInteger(input.leaseMs)||input.leaseMs<1000||input.leaseMs>120000||!Number.isSafeInteger(input.now+input.leaseMs))throw fail('DataError');
   const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),lease=current.outboxLease;if(lease&&lease.expiresAt>input.now&&(lease.owner!==input.owner||lease.token!==input.token))throw fail('BusyError');const outboxLease={owner:input.owner,token:input.token,expiresAt:input.now+input.leaseMs};store.put({...current,outboxLease});done(outboxLease);});
  })),
  renewOutboxLease:input=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','now','leaseMs'].includes(key))||!id(input.owner)||!id(input.token)||!Number.isSafeInteger(input.now)||input.now<0||!Number.isSafeInteger(input.leaseMs)||input.leaseMs<1000||input.leaseMs>120000||!Number.isSafeInteger(input.now+input.leaseMs))throw fail('DataError');
   const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),lease=current.outboxLease;if(!lease||lease.owner!==input.owner||lease.token!==input.token||lease.expiresAt<=input.now)throw fail('BusyError');const renewed={...lease,expiresAt:Math.max(lease.expiresAt,input.now+input.leaseMs)};store.put({...current,outboxLease:renewed});done(renewed);});
  })),
  claimOutboxBatch:input=>result(()=>execute('readwrite',['archiveMeta','outbox'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','now','limit'].includes(key))||!id(input.owner)||!id(input.token)||!Number.isSafeInteger(input.now)||input.now<0||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>25)throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('outbox');request(meta.get(scopeKey(scope)),stored=>{
    const current=validMeta(stored,scope),lease=current.outboxLease;if(!lease||lease.owner!==input.owner||lease.token!==input.token||lease.expiresAt<=input.now)throw fail('BusyError');
    const prefix=scopeKey(scope),index=store.index('byScopeStatus'),range=status=>environment.IDBKeyRange.bound([...prefix,status],[...prefix,status,Number.MAX_SAFE_INTEGER,'\uffff']),rows=[],dependencyCache=new Map();let remainingStreams=2;
    const remember=(key,status)=>{if(!dependencyCache.has(key)&&dependencyCache.size>=256)dependencyCache.delete(dependencyCache.keys().next().value);dependencyCache.set(key,status);};
    const finish=()=>{if(--remainingStreams)return;rows.sort((a,b)=>a.createdAt-b.createdAt||(a.operationId<b.operationId?-1:a.operationId>b.operationId?1:0));const claimed=[];for(const operation of rows.slice(0,input.limit)){const next={...operation,status:'sending',attempts:operation.attempts+1,leaseToken:input.token,leaseExpiresAt:lease.expiresAt};store.put(next);claimed.push(next);}done({leaseExpiresAt:lease.expiresAt,operations:claimed});};
    const scan=status=>{let collected=0,batch=[];const flush=(cursor)=>{const candidates=batch;batch=[];const states=new Map(),missing=new Set();for(const operation of candidates)for(const dependency of operation.dependencies||[]){if(dependencyCache.has(dependency))states.set(dependency,dependencyCache.get(dependency));else missing.add(dependency);}const proceed=()=>{for(const operation of candidates){if(collected>=input.limit)break;if((operation.dependencies||[]).every(dependency=>states.get(dependency)==='acked')){rows.push(operation);collected++;}}if(!cursor||collected>=input.limit)finish();else cursor.continue();};if(!missing.size){proceed();return;}let remaining=missing.size;for(const dependency of missing)request(store.get([...prefix,dependency]),item=>{const state=item?.status||null;states.set(dependency,state);remember(dependency,state);if(--remaining===0)proceed();});};request(index.openCursor(range(status)),cursor=>{if(!cursor){if(batch.length)flush(null);else finish();return;}const operation=cursor.value,ready=status==='pending'?operation.nextAttemptAt<=input.now:operation.leaseExpiresAt<=input.now;if(ready)batch.push(operation);if(batch.length>=32)flush(cursor);else cursor.continue();});};
    scan('pending');scan('sending');
   });
  })),
  settleOutboxOperation:input=>result(()=>execute('readwrite',['archiveMeta','outbox','drafts','commonRecords'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','operationId','outcome','now','nextAttemptAt','errorCode','serverVersion'].includes(key))||!id(input.owner)||!id(input.token)||!id(input.operationId)||!Number.isSafeInteger(input.now)||input.now<0||!['ack','retry','conflict','failed'].includes(input.outcome)||input.outcome==='retry'&&(!Number.isSafeInteger(input.nextAttemptAt)||input.nextAttemptAt<input.now)||input.errorCode!==undefined&&(typeof input.errorCode!=='string'||input.errorCode.length>100)||input.serverVersion!==undefined&&input.serverVersion!==null&&!(version(input.serverVersion)||typeof input.serverVersion==='string'&&input.serverVersion.length<=200))throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('outbox');request(meta.get(scopeKey(scope)),stored=>{const lease=validMeta(stored,scope).outboxLease;if(!lease||lease.owner!==input.owner||lease.token!==input.token||lease.expiresAt<=input.now)throw fail('BusyError');const key=[...scopeKey(scope),input.operationId];request(store.get(key),operation=>{if(!operation||operation.status!=='sending'||operation.leaseToken!==input.token)throw fail('ConflictError');if(input.outcome==='ack'&&operation.action==='upsert'&&(typeof input.serverVersion!=='string'||!input.serverVersion.trim()))throw fail('DataError');const next={...operation,status:input.outcome==='ack'?'acked':input.outcome==='retry'?'pending':input.outcome==='conflict'?'conflict':'failed',...(input.outcome==='retry'?{nextAttemptAt:input.nextAttemptAt}:{}),...(input.outcome==='ack'?{acknowledgedAt:input.now}:{}),...(input.serverVersion?{serverVersion:input.serverVersion}:{}),...(input.errorCode?{lastError:input.errorCode}:{} )};delete next.leaseToken;delete next.leaseExpiresAt;store.put(next);if(input.outcome!=='ack'||!input.serverVersion){if(['conflict','failed'].includes(input.outcome))invalidateDraftSearch(scope,tx,request,()=>done({operationId:next.operationId,status:next.status,attempts:next.attempts}),!periodOperation(operation.kind));else done({operationId:next.operationId,status:next.status,attempts:next.attempts});return;}if(periodOperation(operation.kind)){const common=tx.objectStore('commonRecords'),key=[...scopeKey(scope),periodOperation(operation.kind).collection,operation.id];request(common.get(key),old=>{if(!old||compareVersion(old.version,input.serverVersion)<=0)common.put({...scope,collection:periodOperation(operation.kind).collection,id:operation.id,version:input.serverVersion,data:{...operation.payload[operation.kind],updatedAt:input.serverVersion}});});}request(tx.objectStore('drafts').get([...scopeKey(scope),operation.kind,operation.id]),draft=>{if(draft)tx.objectStore('drafts').put({...draft,baseVersion:input.serverVersion});request(store.index('byScopeEntityStatus').openCursor(environment.IDBKeyRange.bound([...scopeKey(scope),operation.kind,operation.id,'pending',0,''],[...scopeKey(scope),operation.kind,operation.id,'pending',Number.MAX_SAFE_INTEGER,'\uffff'])),function advance(cursor){if(!cursor){if(draft)invalidateDraftSearch(scope,tx,request,()=>done({operationId:next.operationId,status:next.status,attempts:next.attempts}),!periodOperation(operation.kind));else done({operationId:next.operationId,status:next.status,attempts:next.attempts});return;}const dependent=cursor.value;if(dependent.status==='pending'&&dependent.attempts===0&&(dependent.dependencies||[]).includes(operation.operationId)){const updated={...dependent,baseVersion:input.serverVersion,payload:{...dependent.payload,baseVersion:input.serverVersion}};cursor.update(updated);}cursor.continue();});});});});
  })),
  retryOutboxFailure:input=>result(()=>execute('readwrite',['archiveMeta','outbox'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','operationId','now','errorCode'].includes(key))||!id(input.owner)||!id(input.token)||!id(input.operationId)||!Number.isSafeInteger(input.now)||input.now<0||typeof input.errorCode!=='string'||input.errorCode.length>100)throw fail('DataError');
   const transient=new Set(['BusyError','NetworkError','TimeoutError','RateLimit','ServiceUnavailable','StorageError','ProtocolUnavailable']);
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('outbox');request(meta.get(scopeKey(scope)),stored=>{const lease=validMeta(stored,scope).outboxLease;if(!lease||lease.owner!==input.owner||lease.token!==input.token||lease.expiresAt<=input.now)throw fail('BusyError');request(store.get([...scopeKey(scope),input.operationId]),operation=>{if(!operation||operation.status!=='sending'||operation.leaseToken!==input.token)throw fail('ConflictError');const outcome=input.errorCode==='ConflictError'?'conflict':transient.has(input.errorCode)?'retry':'failed',ceiling=Math.min(300000,1000*2**Math.min(19,Math.max(0,operation.attempts-1))),nextAttemptAt=outcome==='retry'?input.now+Math.floor(Math.random()*ceiling):null;if(nextAttemptAt!==null&&!Number.isSafeInteger(nextAttemptAt))throw fail('DataError');const next={...operation,status:outcome==='retry'?'pending':outcome,...(outcome==='retry'?{nextAttemptAt}:{}),lastError:input.errorCode};delete next.leaseToken;delete next.leaseExpiresAt;store.put(next);if(outcome!=='retry')invalidateDraftSearch(scope,tx,request,()=>done({operationId:next.operationId,status:next.status,attempts:next.attempts,nextAttemptAt}),!periodOperation(operation.kind));else done({operationId:next.operationId,status:next.status,attempts:next.attempts,nextAttemptAt});});});
  })),
  releaseOutboxLease:input=>result(()=>execute('readwrite',['archiveMeta','outbox'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['owner','token','now'].includes(key))||!id(input.owner)||!id(input.token)||!Number.isSafeInteger(input.now)||input.now<0)throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('outbox');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope),lease=current.outboxLease;if(!lease||lease.owner!==input.owner||lease.token!==input.token)throw fail('ConflictError');meta.put({...current,outboxLease:{...lease,expiresAt:input.now}});request(store.index('byScopeStatus').openCursor(environment.IDBKeyRange.bound([...scopeKey(scope),'sending',0,''],[...scopeKey(scope),'sending',Number.MAX_SAFE_INTEGER,'\uffff'])),function release(cursor){if(!cursor){done({released:true});return;}const operation=cursor.value;if(operation.status==='sending'&&operation.leaseToken===input.token){const pending={...operation,status:'pending'};delete pending.leaseToken;delete pending.leaseExpiresAt;cursor.update(pending);}cursor.continue();});});
  })),
  deleteDraft:input=>result(()=>{input=structuredClone(input);return execute('readwrite',['drafts','archiveMeta'],({scope,tx,request,done})=>{const store=tx.objectStore('drafts'),key=[...scopeKey(scope),input.kind,input.id];request(store.get(key),old=>{if(!old||old.localRevision!==input.expectedRevision)throw fail('ConflictError');store.delete(key);if(['note','task'].includes(input.kind))invalidateDraftSearch(scope,tx,request,()=>done(true));else done(true);});});}),
  clearRemote:(options={})=>result(()=>execute('readwrite',REMOTE,({scope,tx,request,done})=>{
   const meta=tx.objectStore('archiveMeta');request(meta.get(scopeKey(scope)),old=>{const previous=validMeta(old,scope),next={...metaDefault(scope),revision:previous.revision+1,...(options.bootstrap===true?{requiresBootstrap:true,localCacheConsent:previous.localCacheConsent===true}:{})};meta.put(next);done({revision:next.revision});});
   for(const name of ['entries','contents','commonRecords','searchDocuments'])request(tx.objectStore(name).index('byScope').openCursor(environment.IDBKeyRange.only(scopeKey(scope))),function walk(cursor){if(!cursor)return;cursor.delete();cursor.continue();});
  })),
  finishBootstrap:expectedRevision=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw fail('DataError');const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);if(current.revision!==expectedRevision||current.requiresBootstrap!==true)throw fail('ConflictError');const next={...current};delete next.requiresBootstrap;store.put(next);done(true);});})),
  listSearchDocuments:()=>list('searchDocuments','byScope'),
  findSearchCandidates:query=>result(()=>{if(typeof query!=='string'||query.length<3||query.length>250000)throw fail('DataError');const normalized=query.toLowerCase();return execute('readonly',['searchDocuments'],({scope,tx,request,done})=>{const matches=[],range=environment.IDBKeyRange.only(scopeKey(scope));request(tx.objectStore('searchDocuments').index('byScope').openCursor(range),function scan(cursor){if(!cursor){done(matches);return;}if(typeof cursor.value.text==='string'&&cursor.value.text.includes(normalized))matches.push(cursor.value.id);cursor.continue();});});}),
  beginSearchUpdate:input=>result(()=>execute('readwrite',['archiveMeta'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['expectedRevision','buildToken','replace'].includes(key))||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!id(input.buildToken)||typeof input.replace!=='boolean')throw fail('DataError');
   const store=tx.objectStore('archiveMeta');request(store.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);if(current.revision!==input.expectedRevision||!input.replace&&current.coverage.localSearch?.buildToken)throw fail('ConflictError');const prior=current.coverage.localSearch||{complete:false,documents:0};store.put({...current,coverage:{...current.coverage,localSearch:{...prior,fresh:false,revision:current.revision,buildToken:input.buildToken}}});done(true);});
  })),
  clearSearchIndex:input=>result(()=>execute('readwrite',['archiveMeta','searchDocuments'],({scope,tx,request,done})=>{
   if(!input||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('searchDocuments');request(meta.get(scopeKey(scope)),stored=>{const previous=validMeta(stored,scope);if(previous.revision!==input.expectedRevision||previous.coverage.localSearch?.buildToken!==input.buildToken)throw fail('ConflictError');request(store.index('byScope').openCursor(environment.IDBKeyRange.only(scopeKey(scope))),function walk(cursor){if(cursor){cursor.delete();cursor.continue();}});const coverage={...previous.coverage,localSearch:{complete:false,fresh:false,revision:previous.revision,cursor:previous.cursor,documents:0,...(input.buildToken?{buildToken:input.buildToken}:{})}};meta.put({...previous,coverage});done({revision:previous.revision});});
  })),
  putSearchDocuments:input=>result(()=>execute('readwrite',['archiveMeta','searchDocuments'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['expectedRevision','documents','buildToken'].includes(key))||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!Array.isArray(input.documents)||input.documents.length>100||new Set(input.documents.map(doc=>doc?.id)).size!==input.documents.length)throw fail('DataError');
   for(const doc of input.documents){
    if(!doc||!id(doc.id)||!version(doc.version)||!doc.entry||doc.entry.id!==doc.id||typeof doc.text!=='string'||doc.text.length>250000||!Array.isArray(doc.files)||!Array.isArray(doc.projectNames)||doc.files.some(file=>!file||typeof file.title!=='string')||doc.projectNames.some(name=>typeof name!=='string'))throw fail('DataError');
    if(doc.pendingDraft!==undefined){const draft=doc.pendingDraft,snapshot=draft?.snapshot;if(!draft||!['note','task'].includes(draft.kind)||!(draft.baseVersion===''||version(draft.baseVersion))||!Number.isSafeInteger(draft.localRevision)||draft.localRevision<1||!snapshot||Object.prototype.toString.call(snapshot)!=='[object Object]'||['title','text','body','tags','projects'].some(key=>snapshot[key]!==undefined&&(typeof snapshot[key]!=='string'||snapshot[key].length>250000))||new TextEncoder().encode(JSON.stringify(snapshot)).length>524288)throw fail('DataError');}
    const expected=[doc.entry.text||'',doc.content?.body||'',doc.entry.tags||'',doc.entry.projects||'',doc.entry.date||'',...doc.projectNames,...doc.files.map(file=>file.title),...(doc.pendingDraft?[doc.pendingDraft.snapshot.title||'',doc.pendingDraft.snapshot.text||'',doc.pendingDraft.snapshot.body||'',doc.pendingDraft.snapshot.tags||'',doc.pendingDraft.snapshot.projects||'']:[])].join(' ').toLowerCase();
    if(doc.text!==expected||new TextEncoder().encode(JSON.stringify(doc)).length>1048576)throw fail('DataError');
   }
   if(new TextEncoder().encode(JSON.stringify(input.documents)).length>4194304)throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('searchDocuments');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);if(current.revision!==input.expectedRevision||current.coverage.localSearch?.buildToken!==input.buildToken)throw fail('ConflictError');for(const doc of input.documents)store.put({...scope,...structuredClone(doc)});const prior=current.coverage.localSearch||{complete:false,documents:0};meta.put({...current,coverage:{...current.coverage,localSearch:{...prior,fresh:false,revision:current.revision}}});done({revision:current.revision,documents:input.documents.length});});
  })),
  deleteSearchDocuments:input=>result(()=>execute('readwrite',['archiveMeta','searchDocuments'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['expectedRevision','ids','buildToken'].includes(key))||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!Array.isArray(input.ids)||input.ids.length>100||input.ids.some(value=>!id(value))||new Set(input.ids).size!==input.ids.length)throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('searchDocuments');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);if(current.revision!==input.expectedRevision||current.coverage.localSearch?.buildToken!==input.buildToken)throw fail('ConflictError');for(const idValue of input.ids)store.delete([...scopeKey(scope),idValue]);const prior=current.coverage.localSearch||{complete:false,documents:0};meta.put({...current,coverage:{...current.coverage,localSearch:{...prior,fresh:false,revision:current.revision}}});done({revision:current.revision,removed:input.ids.length});});
  })),
  finishSearchIndex:input=>result(()=>execute('readwrite',['archiveMeta','searchDocuments'],({scope,tx,request,done})=>{
   if(!input||Object.keys(input).some(key=>!['expectedRevision','complete','cursor','documents','buildToken'].includes(key))||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.complete!=='boolean'||input.documents!==undefined&&(!Number.isSafeInteger(input.documents)||input.documents<0))throw fail('DataError');
   const meta=tx.objectStore('archiveMeta'),store=tx.objectStore('searchDocuments');request(meta.get(scopeKey(scope)),stored=>{const current=validMeta(stored,scope);if(current.revision!==input.expectedRevision||current.coverage.localSearch?.buildToken!==input.buildToken)throw fail('ConflictError');if(JSON.stringify(input.cursor)!==JSON.stringify(current.cursor))throw fail('StaleVersionError');request(store.index('byScope').count(environment.IDBKeyRange.only(scopeKey(scope))),count=>{if(input.documents!==undefined&&count!==input.documents)throw fail('StaleVersionError');const localSearch={complete:input.complete,fresh:true,revision:current.revision,cursor:current.cursor,documents:count,searchVersion:3};meta.put({...current,coverage:{...current.coverage,localSearch}});done(localSearch);});});
  })),
  readSearchIndex:()=>result(()=>execute('readonly',['archiveMeta','searchDocuments'],({scope,tx,request,done})=>{
   const metaStore=tx.objectStore('archiveMeta'),docs=tx.objectStore('searchDocuments');let current,records;
   const finish=()=>{if(!current||!records)return;const coverage=current.coverage.localSearch||{complete:false,fresh:false,revision:current.revision,cursor:current.cursor,documents:0};done({revision:current.revision,cursor:current.cursor,coverage,documents:records});};
   request(metaStore.get(scopeKey(scope)),stored=>{current=validMeta(stored,scope);finish();});request(docs.index('byScope').getAll(environment.IDBKeyRange.only(scopeKey(scope))),rows=>{records=rows.map(({archiveId,principalId,epoch,...document})=>document);finish();});
  })),
  close(){closed=true;connection?.close();connection=null;}
 });
}
