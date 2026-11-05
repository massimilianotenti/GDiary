// Read-only remote snapshot/feed consumer. It is inert until the caller opts
// in and the verified identity plus both server capabilities are ready.
import {createLocalSearchIndex} from './local-search-index.mjs';
import localSearchModuleSource from './local-search-index.mjs?raw';
const COLLECTIONS=['entries','projects','days','weeks','habitLogs','goals','habits','files','settings','layouts'];
const fail=error=>Object.assign(new Error(error),{name:error});
const clone=value=>structuredClone(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const searchProjectSlugs=(entry,draft)=>[...new Set([entry?.projects,draft?.snapshot?.projects].flatMap(value=>String(value||'').split(',').map(item=>item.trim()).filter(Boolean)))];
const normalizePrivateTag=value=>String(value||'').trim().replace(/^#/,'').toLowerCase().normalize('NFC').replace(/\s+/g,'-');
function createSearchEngine(timers){
 const local=createLocalSearchIndex();let worker=null,active=false,workerFailed=false,serial=0;const pending=new Map();
 const source=localSearchModuleSource+`\nlet workerIndex;const workerNormalize=value=>String(value||'').trim().replace(/^#/,'').toLowerCase().normalize('NFC').replace(/\\s+/g,'-');self.onmessage=event=>{const {id,method,args=[]}=event.data||{};try{let value;if(method==='init'){workerIndex=createLocalSearchIndex();value=true;}else if(method==='upsertMany'){const documents=[];for(const item of args[0]){const result=workerIndex.upsert(item);if(!result.ok)throw Object.assign(new Error(result.error),{name:result.error});if(!result.value.stale)documents.push(workerIndex.getDocument(item.id));}value={ok:true,value:{documents}};}else if(method==='searchWithPrivacy'){const [query,options,privateTags]=args,normalize=workerNormalize,tags=privateTags.map(normalize);value=workerIndex.search(query,{...options,visible:entry=>!(String(entry?.tags||'')+','+String(entry?.pendingDraft?.snapshot?.tags||'')).split(',').map(normalize).some(tag=>tag&&tags.includes(tag))});}else value=workerIndex[method](...args);self.postMessage({id,value});}catch(error){self.postMessage({id,error:error.name||'SyncError'});}};`;
 function stop(){if(active)workerFailed=true;if(worker){worker.terminate();worker=null;}for(const item of pending.values())item.reject(fail('WorkerUnavailable'));pending.clear();active=false;}
 function request(method,args=[]){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});try{worker.postMessage({id,method,args});}catch(error){pending.delete(id);reject(error);}});}
 try{if(typeof Worker==='function'&&typeof Blob==='function'&&typeof URL?.createObjectURL==='function'){const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url,{type:'module'});URL.revokeObjectURL(url);worker.onmessage=event=>{const item=pending.get(event.data?.id);if(!item)return;pending.delete(event.data.id);if(event.data.error)item.reject(fail(event.data.error));else item.resolve(event.data.value);};worker.onerror=()=>stop();}}
 catch{stop();}
 const ready=worker?request('init').then(()=>{active=true;},()=>stop()):Promise.resolve();
 const run=async(method,args,localCall)=>{await ready;if(workerFailed)throw fail('WorkerUnavailable');if(!active)return localCall();return request(method,args);};
 const api={
  restore:snapshot=>run('restore',[snapshot],()=>local.restore(snapshot)),
  upsert:document=>run('upsert',[document],()=>local.upsert(document)),
  upsertMany:documents=>run('upsertMany',[documents],()=>{const indexed=[];for(const item of documents){const result=local.upsert(item);if(!result.ok)return result;if(!result.value.stale)indexed.push(local.getDocument(item.id));}return {ok:true,value:{documents:indexed}};}),
  remove:id=>run('remove',[id],()=>local.remove(id)),
  getDocument:id=>run('getDocument',[id],()=>local.getDocument(id)),
  exportDocuments:()=>run('exportDocuments',[],()=>local.exportDocuments()),
  projectIds:slug=>run('projectIds',[slug],()=>local.projectIds(slug)),
  setCoverage:value=>run('setCoverage',[value],()=>local.setCoverage(value)),
  status:()=>run('status',[],()=>local.status()),
  search:(query,options,privateTags)=>{
   if(typeof options?.visible==='function')return Promise.resolve().then(async()=>{await ready;if(workerFailed)throw fail('WorkerUnavailable');const docs=active?await request('exportDocuments'):local.exportDocuments(),status=active?await request('status'):local.status(),copy=createLocalSearchIndex();copy.restore({documents:docs,coverage:status});return copy.search(query,{...options,visible:entry=>{const tags=privateTags.map(normalizePrivateTag);return !(String(entry?.tags||'')+','+String(entry?.pendingDraft?.snapshot?.tags||'')).split(',').map(normalizePrivateTag).some(tag=>tag&&tags.includes(tag))&&options.visible(entry);}});});
   return run('searchWithPrivacy',[query,options,privateTags],()=>local.search(query,{...options,visible:entry=>{const tags=privateTags.map(normalizePrivateTag);return !(String(entry?.tags||'')+','+String(entry?.pendingDraft?.snapshot?.tags||'')).split(',').map(normalizePrivateTag).some(tag=>tag&&tags.includes(tag));}}));
  },
  usesWorker:()=>active
 };
 return Object.freeze(api);
}
function validSetting(kind,value){
 if(!value||Object.prototype.toString.call(value)!=='[object Object]')return false;
 if(kind==='reflection')return Object.keys(value).length===1&&Object.hasOwn(value,'dailyReflectionMode')&&['essential','detailed'].includes(value.dailyReflectionMode);
 return kind==='privacy'&&Object.keys(value).length===1&&Object.hasOwn(value,'privateTags')&&Array.isArray(value.privateTags)&&value.privateTags.length<=30&&value.privateTags.every(tag=>typeof tag==='string'&&tag.length<=100)&&new Set(value.privateTags).size===value.privateTags.length;
}
function cursor(value,scope){return !!value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).sort().join(',')==='archiveId,epoch,format,principalId,sequence'&&value.format==='sync-cursor/v1'&&value.archiveId===scope.archiveId&&value.principalId===scope.principalId&&value.epoch===scope.epoch&&Number.isSafeInteger(value.sequence)&&value.sequence>=0;}
function snapshotRecord(collection,row){
 if(collection==='settings'){
  if(!['privacy','reflection'].includes(row?.id)||typeof row.version!=='string'||row.version.length>200||!validSetting(row.id,row.value))throw fail('DataError');
  return {id:row.id,value:clone(row.value),version:row.version};
 }
 if(collection==='layouts'){
  if(!validId(row?.entryId)||!Number.isFinite(row.position)||typeof row.version!=='string'||!row.version)throw fail('DataError');
  return clone(row);
 }
 const key=collection==='projects'?'slug':collection==='days'?'date':collection==='weeks'?'week':collection==='habitLogs'?'key':'id';
 if(!validId(row?.[key]))throw fail('DataError');
 if(collection==='entries')return {...clone(row),updatedAt:row.updatedAt};
 return clone(row);
}
function unwrapChange(change){
 const expected={entries:'sync-entry/v1',projects:'sync-project/v1',days:'sync-day/v1',weeks:'sync-week/v1',goals:'sync-goal/v1',habits:'sync-habit/v1',habitLogs:'sync-habit-log/v1',files:'sync-entry-file/v1'}[change.collection];
 if(!expected)return null;
 if(!change.data||change.data.format!==expected||!change.data.record||Object.prototype.toString.call(change.data.record)!=='[object Object]')throw fail('DataError');
 return clone(change.data.record);
}
function settingChange(change){
 const data=change.data;
 if(data?.format==='sync-app-setting/v1'&&['privacy','reflection'].includes(data.kind)){if(!validSetting(data.kind,data.record))throw fail('DataError');return {id:data.kind,value:clone(data.record),version:change.version};}
 return null;
}

export function createSyncConsumer({repository,identity,call,enabled=()=>false}={}){
 const timers=globalThis,searchIndex=createSearchEngine(timers);let consumer,searchIndexLoaded=false,hydrationCheckedRevision=null;
 const invoke=async(method,payload)=>{const value=await call(method,clone(payload));if(value?.ok===false)throw fail(value.error||'ProtocolUnavailable');return value?.ok===true&&Object.hasOwn(value,'value')?value.value:value;};
 const authorize=()=>{
  if(enabled()!==true)throw fail('NotEnabledError');
  if(identity?.status().verified!==true||identity.status().cacheReady!==true)throw fail('IdentityError');
  const scope=identity.getScope();if(!scope)throw fail('IdentityError');return clone(scope);
 };
 const result=async action=>{try{return {ok:true,value:await action()};}catch(error){return {ok:false,error:['NotEnabledError','IdentityError','ScopeChangedError','DataError','ProtocolUnavailable','StaleVersionError','ConflictError','QuotaExceededError'].includes(error?.name)?error.name:'SyncError'};}};
 const checked=async promise=>{const response=await promise;if(!response?.ok)throw fail(response?.error||'StorageError');return response.value;};
 const ensureScope=(scope)=>{const active=authorize();if(['archiveId','principalId','epoch','schemaVersion','protocolVersion'].some(k=>active[k]!==scope[k]))throw fail('ScopeChangedError');};
 function searchDocumentBatches(documents){const batches=[];let batch=[],bytes=2;for(const document of documents){const size=new TextEncoder().encode(JSON.stringify(document)).length+1;if(size>3145728)throw fail('DataError');if(batch.length>=20||bytes+size>3145728){batches.push(batch);batch=[];bytes=2;}batch.push(document);bytes+=size;}if(batch.length)batches.push(batch);return batches;}
 function localDraftEntries(rows,entries,blocked=new Set()){for(const row of rows){const snapshot=row?.snapshot;if(!entrySafe(row,snapshot,blocked)||entries.has(row.id))continue;entries.set(row.id,{id:row.id,type:snapshot.type,date:snapshot.date,text:snapshot.title||snapshot.text||'',projects:snapshot.projects||'',tags:snapshot.tags||'',scope:snapshot.projects?'project':'personal',updatedAt:row.baseVersion||'1970-01-01T00:00:00.000Z',localOnly:true});}return entries;}
 function entrySafe(row,snapshot,blocked){return !!row&&['note','task'].includes(row.kind)&&typeof row.baseVersion==='string'&&!!snapshot&&(!snapshot.deleted||blocked.has(row.id))&&['note','task','idea'].includes(snapshot.type)&&typeof snapshot.date==='string';}
 function pendingDraftMap(rows,entries,blocked=new Set()){const byId=new Map();for(const row of rows){if(!row||!['note','task'].includes(row.kind)||!validId(row.id)||typeof row.baseVersion!=='string'||!Number.isSafeInteger(row.localRevision)||row.localRevision<1||!row.snapshot||Object.prototype.toString.call(row.snapshot)!=='[object Object]')continue;const entry=entries.get(row.id);if(!entry||row.kind==='task'&&entry.type!=='task')continue;const previous=byId.get(row.id);if(!previous||row.localRevision>previous.localRevision)byId.set(row.id,{kind:row.kind,baseVersion:row.baseVersion,localRevision:row.localRevision,conflicted:blocked.has(row.id)||(entry.localOnly?!!row.baseVersion:row.baseVersion!==entry.updatedAt),snapshot:clone(row.snapshot)});}return byId;}
 function deletionVisibility(operations,drafts){const blocked=new Set(operations.filter(row=>['conflict','failed'].includes(row.status)).map(row=>row.id)),hidden=new Set([...operations.filter(row=>row.action==='delete'&&['pending','sending'].includes(row.status)).map(row=>row.id),...drafts.filter(row=>row.snapshot?.deleted===true).map(row=>row.id)].filter(id=>!blocked.has(id)));return {blocked,hidden};}
 async function searchSources(scope){
  ensureScope(scope);const [entryRows,contentRows,fileRows,projectRows,draftRows,operations]=await Promise.all([repository.listEntries(),repository.listContents(),repository.listCommon('files'),repository.listCommon('projects'),repository.listDrafts(),repository.listActiveOutbox()].map(checked));
  const contents=new Map(contentRows.map(row=>[row.id,row.data])),filesByEntry=new Map(),projectNames=new Map();
  const visibility=deletionVisibility(operations,draftRows),entries=localDraftEntries(draftRows,new Map(entryRows.map(row=>[row.id,row.data])),visibility.blocked);for(const id of visibility.hidden)entries.delete(id);const drafts=pendingDraftMap(draftRows,entries,visibility.blocked);
  for(const row of fileRows){const file=row.data,items=filesByEntry.get(file.entryId)||[];items.push(file);filesByEntry.set(file.entryId,items);}
  for(const row of projectRows){const project=row.data;if(project?.slug&&project?.name)projectNames.set(project.slug,project.name);}
  return [...entries.values()].map(entry=>{const row={id:entry.id,version:entry.updatedAt},draft=drafts.get(row.id),slugs=searchProjectSlugs(entry,draft);return {id:row.id,version:row.version,entry,content:contents.get(row.id)||null,files:filesByEntry.get(row.id)||[],projectNames:slugs.map(slug=>projectNames.get(slug)||slug),...(draft?{pendingDraft:draft}:{})};});
 }
 async function persistSearchSnapshot(scope,complete){
  ensureScope(scope);const meta=await checked(repository.getMeta()),docs=await searchSources(scope),buildToken=crypto.randomUUID();searchIndexLoaded=false;
  await checked(repository.beginSearchUpdate({expectedRevision:meta.revision,buildToken,replace:true}));await searchIndex.restore({documents:[],coverage:{complete:false,fresh:false,cursor:meta.cursor}});await checked(repository.clearSearchIndex({expectedRevision:meta.revision,buildToken}));
  // Index each bounded group in the worker where available. Awaiting the
  // response lets the UI paint and keeps Apps Script CSP fallback responsive.
  for(let i=0;i<docs.length;i+=100){ensureScope(scope);const result=await searchIndex.upsertMany(docs.slice(i,i+100));if(!result.ok)throw fail(result.error);for(const batch of searchDocumentBatches(result.value.documents)){ensureScope(scope);await checked(repository.putSearchDocuments({expectedRevision:meta.revision,buildToken,documents:batch}));}if(i+100<docs.length)await new Promise(resolve=>timers.setTimeout(resolve,0));}
  const coverage=await checked(repository.finishSearchIndex({expectedRevision:meta.revision,buildToken,complete,cursor:meta.cursor,documents:docs.length}));await searchIndex.setCoverage(coverage);searchIndexLoaded=true;return coverage;
 }
 async function ensureSearchIndex(scope){
  const indexStatus=await searchIndex.status(),meta=await checked(repository.getMeta());if(meta.requiresBootstrap)throw fail('ProtocolUnavailable');if(searchIndexLoaded&&indexStatus.fresh&&meta.coverage?.localSearch?.fresh===true&&meta.coverage.localSearch.searchVersion===3&&meta.coverage.localSearch.revision===meta.revision)return indexStatus;
  const snapshot=await checked(repository.readSearchIndex());
  if(snapshot.coverage.fresh===true&&snapshot.coverage.searchVersion===3&&snapshot.coverage.revision===meta.revision&&JSON.stringify(snapshot.cursor)===JSON.stringify(meta.cursor)){
   const restored=await searchIndex.restore({documents:snapshot.documents,coverage:snapshot.coverage});if(!restored.ok)throw fail(restored.error);searchIndexLoaded=true;return searchIndex.status();
  }
  return persistSearchSnapshot(scope,snapshot.coverage.complete===true);
 }
 async function persistSearchDelta(scope,{upserts=[],removals=[],complete=false,expectedRevision}={}){
  ensureScope(scope);const meta=await checked(repository.getMeta());if(meta.revision!==expectedRevision)throw fail('ConflictError');const buildToken=crypto.randomUUID();await checked(repository.beginSearchUpdate({expectedRevision:meta.revision,buildToken,replace:false}));
  for(const batch of searchDocumentBatches(upserts)){ensureScope(scope);await checked(repository.putSearchDocuments({expectedRevision:meta.revision,buildToken,documents:batch}));}
  for(let i=0;i<removals.length;i+=100){ensureScope(scope);await checked(repository.deleteSearchDocuments({expectedRevision:meta.revision,buildToken,ids:removals.slice(i,i+100)}));}
  const coverage=await checked(repository.finishSearchIndex({expectedRevision:meta.revision,buildToken,complete,cursor:meta.cursor}));await searchIndex.setCoverage(coverage);searchIndexLoaded=true;return coverage;
 }
 async function refreshSearchEntries(scope,ids){
  ensureScope(scope);const unique=[...new Set(ids)];if(!unique.length)return {upserts:[],removals:[]};searchIndexLoaded=false;const projectNames=new Map(),upserts=[],removals=[];
  for(let offset=0;offset<unique.length;offset+=25){ensureScope(scope);const group=unique.slice(offset,offset+25),sources=await Promise.all(group.map(async id=>{const [entry,content,files,note,task,noteOps,taskOps]=await Promise.all([repository.getEntry(id),repository.getContent(id),repository.listEntryFiles(id),repository.getDraft('note',id),repository.getDraft('task',id),repository.listActiveEntityOutbox({kind:'note',id}),repository.listActiveEntityOutbox({kind:'task',id})].map(checked));return {id,entry,content,files,draftRows:[note,task].filter(Boolean),operations:[...noteOps,...taskOps]};}));
   for(const source of sources){ensureScope(scope);const {id,content,files,draftRows,operations}=source,entryMap=new Map(source.entry?[[id,source.entry]]:[]),visibility=deletionVisibility(operations,draftRows);localDraftEntries(draftRows,entryMap,visibility.blocked);if(visibility.hidden.has(id))entryMap.delete(id);const entry=entryMap.get(id);if(!entry){await searchIndex.remove(id);removals.push(id);continue;}const drafts=pendingDraftMap(draftRows,entryMap,visibility.blocked),draft=drafts.get(id),slugs=searchProjectSlugs(entry,draft);for(const slug of slugs)if(!projectNames.has(slug)){const project=await checked(repository.getCommon('projects',slug));projectNames.set(slug,project?.name||slug);}const doc={id,version:entry.updatedAt,entry,content,files:files.map(row=>row.data),projectNames:slugs.map(slug=>projectNames.get(slug)),...(draft?{pendingDraft:draft}:{})},result=await searchIndex.upsert(doc);if(!result.ok)throw fail(result.error);if(!result.value.stale)upserts.push(await searchIndex.getDocument(id));}
  }
  return {upserts:upserts.filter(Boolean),removals};
 }
 async function contentsFor(entries){
  const wanted=entries.filter(entry=>entry.contentVersion&&entry.contentDigest).map(entry=>({id:entry.id,version:entry.contentVersion,digest:entry.contentDigest}));
  const output=[];
  for(let i=0;i<wanted.length;i+=12){const request=wanted.slice(i,i+12),response=await invoke('getContentsBatch',{items:request});if(!response||!Array.isArray(response.items)||response.items.length!==request.length)throw fail('DataError');
   for(let j=0;j<request.length;j++){const expected=request[j],item=response.items[j];if(item?.id!==expected.id||item.version!==expected.version||item.digest!==expected.digest||item.content?.version!==expected.version||typeof item.content.body!=='string'||!Array.isArray(item.content.rich))throw fail('DataError');output.push({id:item.id,version:item.version,...clone(item.content)});}
  }
  return output;
 }
 async function hydrate(ids,current,scope,tracking){
  const unique=[...new Set(ids)],hydrated=[];for(let i=0;i<unique.length;i+=12){ensureScope(scope);const entries=[];
   for(const id of unique.slice(i,i+12)){const entry=await checked(repository.getEntry(id));if(!entry?.contentVersion||!entry?.contentDigest)continue;const content=await checked(repository.getContent(id));if(content?.version!==entry.contentVersion)entries.push(entry);}
   const contents=await contentsFor(entries);if(contents.length){const meta=await checked(repository.getMeta());await checked(repository.applyRemoteBatch({expectedRevision:meta.revision,cursor:current,contents}));if(tracking)tracking.writes++;hydrated.push(...contents.map(content=>content.id));}
  }return hydrated;
 }
 async function scanLegacyBodies(scope){
  ensureScope(scope);const stored=await checked(repository.listEntries()),legacy=stored.filter(row=>row.data&&/^\d{4}-\d{2}-\d{2}$/.test(row.data.date)&&!/^commit-[1-9][0-9]{0,15}$/.test(row.data.updatedAt));
  const byId=new Map(legacy.map(row=>[row.id,row.data])),months=[...new Set(legacy.map(row=>row.data.date.slice(0,7)))].sort();let scanned=0,pages=0;
  for(const month of months){let pageCursor='';const seen=new Set();
   do{ensureScope(scope);const response=await invoke('getJournalPage',{month,cursor:pageCursor});if(response?.month!==month||!Array.isArray(response.entries)||response.entries.length>25||!Number.isSafeInteger(response.total)||typeof response.nextCursor!=='string'||response.contentsIncluded!==true)throw fail('DataError');
    const entries=[],contents=[];
    for(const row of response.entries){if(!byId.has(row?.id))continue;if(seen.has(row.id))throw fail('DataError');seen.add(row.id);if(row.editorError||row.contentLoaded===false||row.richUnsupported||typeof row.body!=='string'||!Array.isArray(row.rich)||!/^\d{4}-\d{2}-\d{2}T/.test(row.updatedAt))throw fail('ProtocolUnavailable');
     const {body,rich,editorAutoTitle,docPending,docQueueError,docName,docUrl,excerpt,previewRich,richUnsupported,editorError,contentLoaded,contentLoadError,contentLoading,...metadata}=row;
     entries.push(metadata);contents.push({id:row.id,version:row.updatedAt,body,rich,...(editorAutoTitle===undefined?{}:{editorAutoTitle})});scanned++;
    }
    const meta=await checked(repository.getMeta());if(entries.length)await checked(repository.applyRemoteBatch({expectedRevision:meta.revision,entries,contents,coverage:{consumer:{format:'sync-consumer/v1',docsScan:{month,pages:pages+1,scanned}}}}));
    pages++;if(response.nextCursor){if(!response.entries.length||response.nextCursor!==response.entries.at(-1).id||response.nextCursor===pageCursor)throw fail('DataError');pageCursor=response.nextCursor;}else pageCursor='';
   }while(pageCursor);
  }
  const complete=scanned===legacy.length,meta=await checked(repository.getMeta()),previous=meta.coverage?.consumer||{};
  await checked(repository.applyRemoteBatch({expectedRevision:meta.revision,coverage:{consumer:{...previous,format:'sync-consumer/v1',docsScanComplete:complete,docsScan:{legacyEntries:legacy.length,scanned,pages,months:months.length}}}}));
  await persistSearchSnapshot(scope,complete);
  return {complete,legacyEntries:legacy.length,scanned,pages,months:months.length};
 }
 async function readChanges(scope,starting,target){
  let current=clone(starting),applied=0;const changedContent=new Set(),searchTouched=new Set(),searchRemoved=new Set(),projectChanges=new Set();
  while(current.sequence<target.sequence){
   ensureScope(scope);const response=await invoke('getChanges',{cursor:current,limit:5});
   if(!response||!Array.isArray(response.commits)||!cursor(response.cursor,scope)||response.highWater<target.sequence||!Number.isSafeInteger(response.highWater)||response.cursor.sequence!==(response.commits.at(-1)?.sequence??current.sequence))throw fail('DataError');
   if(!response.commits.length)throw fail('ProtocolUnavailable');
    for(const commit of response.commits){if(commit.sequence!==current.sequence+1||!Array.isArray(commit.changes)||!commit.changes.length||commit.changes.length>25)throw fail('DataError');if(commit.sequence>target.sequence)break;
    const entries=[],commonUpserts={},commonRemovals={},deletedEntryIds=[],routes=[];
    for(const change of commit.changes){if(change.sequence!==commit.sequence||change.version!=='commit-'+commit.sequence||typeof change.collection!=='string'||!validId(change.id)||typeof change.deleted!=='boolean')throw fail('DataError');
     if(change.collection==='settings'&&!change.deleted&&change.data?.format==='sync-entry-route/v1'){routes.push({data:change.data,version:change.version});continue;}
     if(change.collection==='settings'&&change.deleted){if(change.id==='app-setting-v1:privacy'||change.id==='app-setting-v1:reflection')(commonRemovals.settings||(commonRemovals.settings=[])).push(change.id.slice('app-setting-v1:'.length));continue;}
     if(change.collection==='settings'&&!change.deleted){const setting=settingChange(change);if(setting){(commonUpserts.settings||(commonUpserts.settings=[])).push(setting);}continue;}
     const collectionMap={projects:'projects',days:'days',weeks:'weeks',goals:'goals',habits:'habits',habitLogs:'habitLogs',files:'files'};
     if(change.collection==='entries'){
      if(change.deleted){deletedEntryIds.push(change.id);searchRemoved.add(change.id);searchTouched.delete(change.id);(commonRemovals.layouts||(commonRemovals.layouts=[])).push(change.id);continue;}
      const record=unwrapChange(change);if(record.id!==change.id)throw fail('DataError');record.updatedAt=change.version;entries.push(record);searchTouched.add(record.id);searchRemoved.delete(record.id);if(record.contentVersion)changedContent.add(record.id);continue;
     }
     const targetCollection=collectionMap[change.collection];if(!targetCollection)continue;
     const key=targetCollection==='projects'?'slug':targetCollection==='days'?'date':targetCollection==='weeks'?'week':targetCollection==='habitLogs'?'key':targetCollection==='files'?'id':'id';
     if(change.deleted){if(targetCollection==='files'){const old=await checked(repository.getCommon('files',change.id));if(old?.entryId)searchTouched.add(old.entryId);}if(targetCollection==='projects')projectChanges.add(change.id);(commonRemovals[targetCollection]||(commonRemovals[targetCollection]=[])).push(change.id);continue;}
     const record=unwrapChange(change);if(record[key]!==change.id)throw fail('DataError');
     record.updatedAt=change.version;
     (commonUpserts[targetCollection]||(commonUpserts[targetCollection]=[])).push(record);
     if(targetCollection==='files'){const old=await checked(repository.getCommon('files',change.id));if(old?.entryId)searchTouched.add(old.entryId);if(record.entryId)searchTouched.add(record.entryId);}if(targetCollection==='projects')projectChanges.add(record.slug);
    }
    for(const route of routes){const data=route.data,entryId=data.id;if(!validId(entryId)||data.content!==null&&typeof data.content!=='undefined'&&(!data.content||typeof data.content.version!=='string'||!data.content.version||! /^[a-f0-9]{64}$/.test(data.content.digest))||data.layout!==null&&typeof data.layout!=='undefined'&&!Number.isFinite(data.layout))throw fail('DataError');let entry=entries.find(item=>item.id===entryId);if(!entry){const stored=await checked(repository.getEntry(entryId));if(!stored)continue;entry=clone(stored);}
     const rowSequence=/^commit-([1-9][0-9]{0,15})$/.exec(entry.updatedAt),routeSequence=Number(/^commit-([1-9][0-9]{0,15})$/.exec(route.version)?.[1]||0),entryIsNewer=!!rowSequence&&Number(rowSequence[1])>routeSequence;
     // The Entry snapshot may be newer than its route descriptor while the
     // independent layout value is still valid. Do not regress Entry metadata,
     // but always replay the route's layout into its own collection.
     if(!entryIsNewer){if(data.content){entry.contentVersion=data.content.version;entry.contentDigest=data.content.digest;changedContent.add(entryId);}else{entry.contentVersion=null;entry.contentDigest=null;}searchTouched.add(entryId);searchRemoved.delete(entryId);}
     if(data.layout===null||typeof data.layout==='undefined'){commonRemovals.layouts=[...(commonRemovals.layouts||[]),entryId];if(!entryIsNewer)entry.position=null;}
     else{if(!entryIsNewer)entry.position=data.layout;(commonUpserts.layouts||(commonUpserts.layouts=[])).push({entryId,position:data.layout,version:route.version});}
     if(!entries.includes(entry))entries.push(entry);
    }
    const next={...current,sequence:commit.sequence},meta=await checked(repository.getMeta());
    await checked(repository.applyRemoteBatch({expectedRevision:meta.revision,cursor:next,entries,commonUpserts,commonRemovals,deletedEntryIds,coverage:{consumer:{...meta.coverage?.consumer,format:'sync-consumer/v1',appliedThrough:commit.sequence}}}));
    current=next;applied++;
   }
   if(response.cursor.sequence<current.sequence)throw fail('DataError');
  }
  for(const slug of projectChanges)for(const id of await searchIndex.projectIds(slug))searchTouched.add(id);
  return {cursor:current,applied,changedContent:[...changedContent],searchTouched:[...searchTouched],searchRemoved:[...searchRemoved]};
 }
 function startAutoSync({intervalMs=30000,onResult=()=>{}}={}){
  if(!Number.isSafeInteger(intervalMs)||intervalMs<1000||intervalMs>3600000||typeof onResult!=='function')return {ok:false,error:'DataError'};
  try{authorize();}catch(error){return {ok:false,error:error.name||'SyncError'};}
  let stopped=false,running=false,idleWaiters=[];
  const tick=async()=>{
   if(stopped||running||enabled()!==true)return;
   running=true;
   try{
    let response;
    const meta=await checked(repository.getMeta());
    response=cursor(meta.cursor,authorize())?await consumer.sync():await consumer.bootstrap();
    try{onResult(response);}catch(ignore){}
   }catch(error){try{onResult({ok:false,error:['NotEnabledError','IdentityError','ScopeChangedError','ProtocolUnavailable'].includes(error?.name)?error.name:'SyncError'});}catch(ignore){}}
   finally{running=false;for(const resolve of idleWaiters.splice(0))resolve();}
  };
  const handle=timers.setInterval(tick,intervalMs);tick();
  return {ok:true,stop(){if(stopped)return;stopped=true;timers.clearInterval(handle);},idle(){return running?new Promise(resolve=>idleWaiters.push(resolve)):Promise.resolve();}};
 }
 consumer=Object.freeze({
  bootstrap:()=>result(async()=>{
   const scope=authorize(),manifest=await invoke('getSyncManifest',{});ensureScope(scope);
   if(manifest?.identityVerified!==true||manifest.archiveId!==scope.archiveId||manifest.principalId!==scope.principalId||manifest.epoch!==scope.epoch||manifest.capabilities?.changes!==true||manifest.capabilities?.localReadCache!==true)throw fail('ProtocolUnavailable');
   const start=await invoke('getSyncCheckpoint',{});if(!cursor(start?.cursor,scope)||start.highWater!==start.cursor.sequence)throw fail('DataError');
   // Replay the retained immutable feed from its origin after the legacy
   // snapshot. This supplies canonical Files/Layouts without enumerating all
   // Entries on each page; newer snapshot rows remain protected by repository
   // version checks. If history is ever compacted, bootstrap must receive an
   // explicit retained checkpoint before the server enables this capability.
   const pinned={...start.cursor,sequence:0};
   const cleared=await checked(repository.clearRemote({bootstrap:true}));let revision=cleared.revision;const totals={};
   for(const collection of COLLECTIONS){let afterId,seen=new Set(),count=0,coverage=null;
    do{ensureScope(scope);const page=await invoke('getSnapshotPage',{collection,cursor:pinned,...(afterId===undefined?{}:{afterId}),limit:100,maxBytes:65536});
     if(page?.collection!==collection||!cursor(page.checkpoint,scope)||page.checkpoint.sequence!==pinned.sequence||!cursor(page.observedCursor,scope)||page.observedCursor.sequence<pinned.sequence||!Array.isArray(page.records)||typeof page.hasMore!=='boolean'||!page.coverage||!Number.isSafeInteger(page.coverage.total)||!Number.isSafeInteger(page.coverage.canonical))throw fail('DataError');
     if(coverage&&(coverage.total!==page.coverage.total||coverage.canonical!==page.coverage.canonical))throw fail('DataError');coverage=page.coverage;
     const records=page.records.map(row=>snapshotRecord(collection,row));for(const row of records){const key=collection==='projects'?'slug':collection==='days'?'date':collection==='weeks'?'week':collection==='habitLogs'?'key':collection==='layouts'?'entryId':collection==='settings'?'id':'id';if(seen.has(row[key]))throw fail('DataError');seen.add(row[key]);}
     const batch={expectedRevision:revision,cursor:pinned,coverage:{consumer:{format:'sync-consumer/v1',snapshot:{collection,complete:false}}}};
     if(collection==='entries'){batch.entries=records;batch.contents=await contentsFor(records);}
     else if(records.length)batch.commonUpserts={[collection]:records};
     const saved=await checked(repository.applyRemoteBatch(batch));revision=saved.revision;count+=records.length;
     if(page.hasMore){if(!records.length||typeof page.nextAfter!=='string'||page.nextAfter!==records.at(-1)[collection==='projects'?'slug':collection==='days'?'date':collection==='weeks'?'week':collection==='habitLogs'?'key':collection==='layouts'?'entryId':'id']||page.nextAfter===afterId)throw fail('DataError');afterId=page.nextAfter;}else{if(page.nextAfter!==null)throw fail('DataError');afterId=undefined;}
    }while(afterId!==undefined);
    if(!coverage||count!==coverage.total)throw fail('DataError');totals[collection]={total:count,canonical:coverage.canonical,complete:coverage.complete===true};
   }
   const head=await invoke('getSyncCheckpoint',{});if(!cursor(head?.cursor,scope)||head.highWater!==head.cursor.sequence||head.highWater<start.highWater)throw fail('DataError');
   const caught=await readChanges(scope,pinned,head.cursor);await hydrate(caught.changedContent,caught.cursor,scope);revision=(await checked(repository.getMeta())).revision;
   const complete=Object.values(totals).every(item=>item.complete)&&totals.entries.canonical===totals.entries.total;
   const saved=await checked(repository.applyRemoteBatch({expectedRevision:revision,cursor:caught.cursor,coverage:{consumer:{format:'sync-consumer/v1',complete,docsScanComplete:complete,collections:totals,appliedThrough:caught.cursor.sequence}}}));ensureScope(scope);
   await checked(repository.finishBootstrap(saved.revision));const search=await persistSearchSnapshot(scope,complete);await checked(repository.markReadCheckpoint(saved.revision));return {cursor:caught.cursor,appliedCommits:caught.applied,collections:totals,complete,revision:saved.revision,search};
  }),
  sync:()=>result(async()=>{
   const scope=authorize(),initial=await checked(repository.getMeta());if(initial.requiresBootstrap)return checked(consumer.bootstrap());await ensureSearchIndex(scope);const meta=await checked(repository.getMeta());if(!cursor(meta.cursor,scope))throw fail('ProtocolUnavailable');if(meta.coverage?.localSearch?.fresh!==true||meta.coverage.localSearch.revision!==meta.revision)throw fail('ConflictError');const searchComplete=(await searchIndex.status()).complete;
   const head=await invoke('getSyncCheckpoint',{});if(!cursor(head?.cursor,scope)||head.highWater!==head.cursor.sequence||head.highWater<meta.cursor.sequence)throw fail('DataError');
   // An interrupted feed/hydration or any intervening writer may leave an
   // incomplete body. Recover once on reopen or revision change, then avoid
   // rescanning the whole archive on every unchanged scheduler tick.
   const recover=hydrationCheckedRevision!==meta.revision;hydrationCheckedRevision=null;
   const caught=await readChanges(scope,meta.cursor,head.cursor),afterFeed=await checked(repository.getMeta());if(afterFeed.revision!==meta.revision+caught.applied)throw fail('ConflictError');const tracking={writes:0},hydrated=[...await hydrate(caught.changedContent,caught.cursor,scope,tracking)];
   if(recover){const cached=await checked(repository.listEntries());hydrated.push(...await hydrate(cached.filter(row=>row.data?.contentVersion).map(row=>row.id),caught.cursor,scope,tracking));}ensureScope(scope);
   const hydratedRevision=(await checked(repository.getMeta())).revision;if(hydratedRevision!==afterFeed.revision+tracking.writes)throw fail('ConflictError');
   const touched=new Set([...caught.searchTouched,...hydrated]),removed=new Set(caught.searchRemoved);for(const id of removed)touched.delete(id);
   const changed=await refreshSearchEntries(scope,touched),coverage=await persistSearchDelta(scope,{upserts:changed.upserts,removals:[...new Set([...removed,...changed.removals])],complete:searchComplete,expectedRevision:hydratedRevision}),updated=await checked(repository.getMeta());if(updated.revision!==hydratedRevision)throw fail('ConflictError');
   await checked(repository.markReadCheckpoint(hydratedRevision));
   hydrationCheckedRevision=hydratedRevision===afterFeed.revision+tracking.writes&&updated.revision===hydratedRevision?updated.revision:null;return {cursor:caught.cursor,appliedCommits:caught.applied,complete:updated.coverage?.consumer?.complete===true,search:coverage};
  }),
  refreshDraft:id=>result(async()=>{const scope=authorize();if(!validId(id))throw fail('DataError');await ensureSearchIndex(scope);ensureScope(scope);const meta=await checked(repository.getMeta());if(meta.coverage?.localSearch?.fresh!==true||meta.coverage.localSearch.revision!==meta.revision)throw fail('ConflictError');const changed=await refreshSearchEntries(scope,[id]),coverage=await persistSearchDelta(scope,{upserts:changed.upserts,removals:changed.removals,complete:(await searchIndex.status()).complete,expectedRevision:meta.revision});return coverage;}),
  startAutoSync,
  scanLegacyBodies:()=>result(async()=>scanLegacyBodies(authorize())),
  search:(query,options)=>result(async()=>{const scope=authorize();await ensureSearchIndex(scope);ensureScope(scope);const before=await checked(repository.getMeta());if(before.coverage?.localSearch?.fresh!==true||before.coverage.localSearch.revision!==before.revision)throw fail('ConflictError');const saved=await checked(repository.getCommon('settings','privacy')),privateTags=Array.isArray(saved?.value?.privateTags)?saved.value.privateTags:['privato'],response=await searchIndex.search(query,options,privateTags);if(!response.ok)throw fail(response.error);ensureScope(scope);const after=await checked(repository.getMeta());if(after.revision!==before.revision||after.coverage?.localSearch?.fresh!==true||after.coverage.localSearch.revision!==after.revision)throw fail('ConflictError');return response.value;}),
  searchStatus:()=>result(async()=>{const scope=authorize();await ensureSearchIndex(scope);ensureScope(scope);return {...await searchIndex.status(),worker:searchIndex.usesWorker()};})
 });return consumer;
}
