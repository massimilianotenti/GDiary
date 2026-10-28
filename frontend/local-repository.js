// Repository foundation. No automatic opening and no application caller yet.
// The current identity client reports cacheReady:false, so real diary storage
// remains closed. Synthetic probes use their own database and invented scope.
const DB_NAME='gdiary-local-v1',VERSION=1,TIMEOUT=5000;
const STORES=['archiveMeta','entries','contents','commonRecords','drafts','outbox'];
const REMOTE=['archiveMeta','entries','contents','commonRecords'];
const KEYS={projects:'slug',days:'date',weeks:'week',goals:'id',habits:'id',habitLogs:'key',taskPlans:'entryId',files:'id'};
const SAFE=new Set(['DataCloneError','NotEnabledError','IdentityError','ScopeChangedError','ClosedError','SchemaError','DataError','ConflictError','StaleVersionError','QuotaExceededError','SecurityError','NotSupportedError','VersionError','AbortError','TimeoutError','BlockedError','InvalidStateError']);
const fail=name=>Object.assign(new Error(name),{name});
const safe=error=>SAFE.has(error?.name)?error.name:'StorageError';
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const version=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const scopeKey=s=>[s.archiveId,s.principalId,s.epoch];
const sameScope=(a,b)=>JSON.stringify(scopeKey(a))===JSON.stringify(scopeKey(b));
function validateScope(s){return s&&s.protocolVersion===1&&s.schemaVersion===1&&scopeKey(s).every(v=>typeof v==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(v));}
function validateBatch(batch){
 if(!batch||!Number.isSafeInteger(batch.expectedRevision)||batch.expectedRevision<0)throw fail('DataError');
 const entries=batch.entries||[],contents=batch.contents||[],common=batch.commonUpserts||{},removals=batch.commonRemovals||{},deleted=batch.deletedEntryIds||[];
 if(Object.keys(batch).some(k=>!['expectedRevision','cursor','coverage','entries','contents','commonUpserts','commonRemovals','deletedEntryIds'].includes(k))||!removals||typeof removals!=='object'||Array.isArray(removals))throw fail('DataError');
 if(!Array.isArray(entries)||!Array.isArray(contents)||!Array.isArray(deleted)||typeof common!=='object'||!common||Array.isArray(common))throw fail('DataError');
 const checkRows=(rows,key,versionKey)=>{if(!Array.isArray(rows)||new Set(rows.map(r=>r?.[key])).size!==rows.length||rows.some(r=>!r||!id(r[key])||!version(r[versionKey])))throw fail('DataError');};
 checkRows(entries,'id','updatedAt');checkRows(contents,'id','version');
 if(entries.some(e=>'body' in e||'rich' in e)||contents.some(c=>typeof c.body!=='string'||c.body.length>100000||!Array.isArray(c.rich)))throw fail('DataError');
 let count=entries.length+contents.length+deleted.length;
 for(const [collection,rows]of Object.entries(common)){if(!Object.hasOwn(KEYS,collection))throw fail('DataError');checkRows(rows,KEYS[collection],collection==='files'?'addedAt':'updatedAt');if(['files','taskPlans'].includes(collection)&&rows.some(r=>!id(r.entryId)||deleted.includes(r.entryId)))throw fail('DataError');count+=rows.length;}
 for(const [collection,ids]of Object.entries(removals)){if(!Object.hasOwn(KEYS,collection)||!Array.isArray(ids)||ids.some(v=>!id(v))||new Set(ids).size!==ids.length||(common[collection]||[]).some(r=>ids.includes(r[KEYS[collection]])))throw fail('DataError');count+=ids.length;}
 if(deleted.some(v=>!id(v))||new Set(deleted).size!==deleted.length||entries.some(e=>deleted.includes(e.id))||contents.some(c=>deleted.includes(c.id))||count>500)throw fail('DataError');
 if(batch.cursor!==undefined&&batch.cursor!==null&&(typeof batch.cursor!=='string'||batch.cursor.length>1000))throw fail('DataError');
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
    request.onupgradeneeded=()=>{
     if(finished||closed){request.transaction.abort();return;}
     try{const db=request.result;
     for(const name of STORES){
      const tail=name==='archiveMeta'?[]:name==='commonRecords'?['collection','id']:name==='drafts'?['kind','id']:name==='outbox'?['operationId']:['id'];
      const store=db.createObjectStore(name,{keyPath:['archiveId','principalId','epoch',...tail]});
      store.createIndex('byScope',['archiveId','principalId','epoch']);
      if(name==='drafts')store.createIndex('byOwner',['archiveId','principalId']);
      if(name==='commonRecords')store.createIndex('byCollection',['archiveId','principalId','epoch','collection']);
     }}catch(error){upgradeError=error;try{request.transaction.abort();}catch{}}
    };
    request.onblocked=()=>finish(fail('BlockedError'));request.onerror=()=>finish(upgradeError||request.error||fail('InvalidStateError'));
    request.onsuccess=()=>{
     const db=request.result;if(finished||closed){db.close();if(!finished)finish(fail('ClosedError'));return;}
     try{
      if(!STORES.every(name=>db.objectStoreNames.contains(name)))throw fail('SchemaError');
      const check=db.transaction(STORES,'readonly');
      for(const name of STORES){const store=check.objectStore(name),tail=name==='archiveMeta'?[]:name==='commonRecords'?['collection','id']:name==='drafts'?['kind','id']:name==='outbox'?['operationId']:['id'];if(JSON.stringify(store.keyPath)!==JSON.stringify(['archiveId','principalId','epoch',...tail])||JSON.stringify(store.index('byScope').keyPath)!==JSON.stringify(['archiveId','principalId','epoch']))throw fail('SchemaError');if(name==='drafts'&&JSON.stringify(store.index('byOwner').keyPath)!==JSON.stringify(['archiveId','principalId']))throw fail('SchemaError');if(name==='commonRecords'&&JSON.stringify(store.index('byCollection').keyPath)!==JSON.stringify(['archiveId','principalId','epoch','collection']))throw fail('SchemaError');}
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
 const row=(scope,record,v)=>({...scope,id:record.id,version:v,data:record});
 function readOne(store,key){return result(()=>execute('readonly',[store],({scope,tx,request,done})=>request(tx.objectStore(store).get([...scopeKey(scope),...key]),value=>done(value?.data??value??null))));}
 function list(store,index,key){return result(()=>execute('readonly',[store],({scope,tx,request,done})=>request(tx.objectStore(store).index(index).getAll(key?key(scope):scopeKey(scope)),rows=>done(rows))));}
 return Object.freeze({
  getMeta:()=>result(()=>execute('readonly',['archiveMeta'],({scope,tx,request,done})=>request(tx.objectStore('archiveMeta').get(scopeKey(scope)),value=>done(validMeta(value,scope))))),
  getEntry:idValue=>readOne('entries',[idValue]),getContent:idValue=>readOne('contents',[idValue]),
  getCommon:(collection,idValue)=>readOne('commonRecords',[collection,idValue]),getDraft:(kind,idValue)=>readOne('drafts',[kind,idValue]),
  listEntries:()=>list('entries','byScope'),
  listCommon:collection=>Object.hasOwn(KEYS,collection)?list('commonRecords','byCollection',scope=>[...scopeKey(scope),collection]):Promise.resolve({ok:false,error:'DataError'}),
  listDrafts:()=>list('drafts','byScope'),
  // Page membership, metadata and matching bodies must come from one read
  // transaction. Separate getMeta/getEntry/getContent calls can mix revisions.
  readRemoteView:()=>result(()=>execute('readonly',['archiveMeta','entries','contents'],({scope,tx,request,done})=>{
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope),view=meta.coverage?.journalPage;
    if(!view||view.format!=='journal-page/v1'||view.revision!==meta.revision){done(null);return;}
    if(typeof view.key!=='string'||!Array.isArray(view.items)||view.items.length>25||new Set(view.items.map(item=>item?.id)).size!==view.items.length||view.items.some(item=>!id(item?.id)||!version(item?.version)))throw fail('SchemaError');
    const entries=new Array(view.items.length);let remaining=view.items.length*2,missing=false;
    const finish=()=>{if(--remaining===0)done(missing?null:{view,entries});};
    if(!remaining){done({view,entries});return;}
    view.items.forEach((item,index)=>{
     const pair={};entries[index]=pair;
     request(tx.objectStore('entries').get([...scopeKey(scope),item.id]),row=>{if(!row||row.version!==item.version||row.data?.id!==item.id||row.data?.updatedAt!==item.version)missing=true;else pair.entry=row.data;finish();});
     request(tx.objectStore('contents').get([...scopeKey(scope),item.id]),row=>{if(!row||row.version!==item.version||row.data?.id!==item.id||row.data?.version!==item.version)missing=true;else pair.content=row.data;finish();});
    });
   });
  })),
  readRemoteCommonView:()=>result(()=>execute('readonly',['archiveMeta','commonRecords'],({scope,tx,request,done})=>{
   request(tx.objectStore('archiveMeta').get(scopeKey(scope)),stored=>{
    const meta=validMeta(stored,scope),view=meta.coverage?.commonJournal;
    if(!view||view.format!=='common-journal/v1'||view.revision!==meta.revision){done(null);return;}
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
     for(const entry of batch.entries)request(entries.get([...scopeKey(scope),entry.id]),old=>{
      if(old&&Date.parse(old.version)>Date.parse(entry.updatedAt))throw fail('StaleVersionError');
      entries.put(row(scope,entry,entry.updatedAt));
      if(old?.version!==entry.updatedAt)contents.delete([...scopeKey(scope),entry.id]);
     });
     // Run content checks after all metadata reads have enqueued their writes.
     // A second read observes those writes within this same transaction.
     const writeContents=()=>{for(const content of batch.contents)request(entries.get([...scopeKey(scope),content.id]),entry=>{
      if(!entry||entry.version!==content.version)throw fail('StaleVersionError');contents.put(row(scope,content,content.version));
     });};
     if(batch.entries.length){let remaining=batch.entries.length;for(const entry of batch.entries)request(entries.get([...scopeKey(scope),entry.id]),()=>{if(--remaining===0)writeContents();});}else writeContents();
     for(const [collection,records]of Object.entries(batch.commonUpserts))for(const record of records){const idValue=record[KEYS[collection]],v=record[collection==='files'?'addedAt':'updatedAt'];request(common.get([...scopeKey(scope),collection,idValue]),old=>{if(old&&Date.parse(old.version)>Date.parse(v))throw fail('StaleVersionError');common.put({...scope,collection,id:idValue,version:v,data:record});});}
     for(const [collection,ids]of Object.entries(batch.commonRemovals))for(const idValue of ids)common.delete([...scopeKey(scope),collection,idValue]);
     for(const idValue of batch.deletedEntryIds){entries.delete([...scopeKey(scope),idValue]);contents.delete([...scopeKey(scope),idValue]);}
     if(batch.deletedEntryIds.length){const deleted=new Set(batch.deletedEntryIds);request(common.index('byScope').openCursor(environment.IDBKeyRange.only(scopeKey(scope))),function walk(cursor){if(!cursor)return;if(['files','taskPlans'].includes(cursor.value.collection)&&deleted.has(cursor.value.data.entryId))cursor.delete();cursor.continue();});}
     const coverage={...previous.coverage,...(batch.coverage||{})};
     // An unrelated read must not evict another valid preview. Mutations of
     // its own stores still invalidate the entire descriptor conservatively.
     const entryChanges=batch.entries.length||batch.contents.length||batch.deletedEntryIds.length;
     const commonChanges=Object.values(batch.commonUpserts).some(rows=>rows.length)||Object.values(batch.commonRemovals).some(ids=>ids.length)||batch.deletedEntryIds.length;
     for(const [key,changed]of [['journalPage',entryChanges],['commonJournal',commonChanges]])if(!Object.hasOwn(batch.coverage||{},key)&&!changed&&coverage[key]?.revision===previous.revision)coverage[key]={...coverage[key],revision:previous.revision+1};
     const next={...previous,revision:previous.revision+1,cursor:batch.cursor===undefined?previous.cursor:batch.cursor,coverage};
     meta.put(next);done({revision:next.revision});
    });
   });
  }),
  putDraft:input=>result(()=>{input=structuredClone(input);return execute('readwrite',['drafts'],({scope,tx,request,done})=>{
   if(!input||!id(input.id)||!id(input.kind)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.baseVersion!=='string'||input.snapshot===undefined)throw fail('DataError');
   if(input.baseVersion.length>200||new TextEncoder().encode(JSON.stringify(input.snapshot)).length>4194304)throw fail('DataError');
   const store=tx.objectStore('drafts'),key=[...scopeKey(scope),input.kind,input.id];
   request(store.get(key),old=>{if((old?.localRevision||0)!==input.expectedRevision)throw fail('ConflictError');const draft={...scope,kind:input.kind,id:input.id,baseVersion:input.baseVersion,localRevision:(old?.localRevision||0)+1,snapshot:structuredClone(input.snapshot)};store.put(draft);done({localRevision:draft.localRevision});});
  });}),
  deleteDraft:input=>result(()=>{input=structuredClone(input);return execute('readwrite',['drafts'],({scope,tx,request,done})=>{const store=tx.objectStore('drafts'),key=[...scopeKey(scope),input.kind,input.id];request(store.get(key),old=>{if(!old||old.localRevision!==input.expectedRevision)throw fail('ConflictError');store.delete(key);done(true);});});}),
  clearRemote:()=>result(()=>execute('readwrite',REMOTE,({scope,tx,request,done})=>{
   const meta=tx.objectStore('archiveMeta');request(meta.get(scopeKey(scope)),old=>{const previous=validMeta(old,scope),next={...metaDefault(scope),revision:previous.revision+1};meta.put(next);done({revision:next.revision});});
   for(const name of ['entries','contents','commonRecords'])request(tx.objectStore(name).index('byScope').openCursor(environment.IDBKeyRange.only(scopeKey(scope))),function walk(cursor){if(!cursor)return;cursor.delete();cursor.continue();});
  })),
  close(){closed=true;connection?.close();connection=null;}
 });
}
