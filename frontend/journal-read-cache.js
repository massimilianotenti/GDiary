import {journalPageDescriptors,JOURNAL_PAGE_LIMIT,JOURNAL_INDEX_FORMAT} from './journal-page-index.js';
// Bounded, explicitly stale journal pages. No automatic opening, RPC,
// global storage, common-state copy or permission to enable real diary storage.
const FORMAT='journal-page/v1';
const PREPARE_BUDGET_MS=250;
const fail=name=>Object.assign(new Error(name),{name});
const sameScope=(a,b)=>!!a&&!!b&&['archiveId','principalId','epoch','schemaVersion','protocolVersion'].every(key=>a[key]===b[key]);
const safe=error=>['ConflictError','ScopeChangedError','IdentityError','NotEnabledError','DataError','SchemaError','StaleVersionError','QuotaExceededError','SecurityError','VersionError','AbortError','ClosedError','TimeoutError','BlockedError','NotSupportedError'].includes(error?.name)?error.name:'StorageError';
const checked=result=>{if(!result?.ok)throw fail(result?.error||'StorageError');return result;};
const clone=value=>structuredClone(value);

function normalizeRequest(value){
 if(!value||Object.keys(value).some(key=>!['month','project','cursor','taskOnly','taskArchive','metadataOnly'].includes(key)))throw fail('DataError');
 const {month,project='',cursor=''}=value;
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||typeof project!=='string'||project.length>200||typeof cursor!=='string'||cursor.length>200||value.taskOnly||value.taskArchive||value.metadataOnly)throw fail('DataError');
 return {month,project,cursor};
}
const keyOf=request=>JSON.stringify(normalizeRequest(request));

function normalizeResponse(request,response){
 if(!response||response.month!==request.month||response.contentsIncluded!==true||response.snapshotReset||!Array.isArray(response.entries)||response.entries.length>25||!Number.isSafeInteger(response.total)||response.total<response.entries.length||typeof response.nextCursor!=='string'||response.nextCursor.length>200)throw fail('DataError');
 if(response.nextCursor&&(!response.entries.length||response.nextCursor!==response.entries.at(-1).id||response.nextCursor===request.cursor))throw fail('DataError');
 const nextEntry=response.nextEntry??null;
 if(nextEntry!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(nextEntry.date)||!Number.isFinite(nextEntry.position)))throw fail('DataError');
 if(!!response.nextCursor!==!!nextEntry)throw fail('DataError');
 const entries=[],contents=[];
 for(const row of response.entries){
  if(!row||row.editorError||row.contentLoaded===false||typeof row.body!=='string'||!Array.isArray(row.rich)||!row.date?.startsWith(request.month+'-')||request.project&&!String(row.projects||'').split(',').map(v=>v.trim()).includes(request.project))throw fail('DataError');
  const {body,rich,richUnsupported,editorAutoTitle,contentLoaded,editorError,...metadata}=row;
  entries.push(metadata);
  contents.push({id:row.id,version:row.contentVersion||row.updatedAt,body,rich,...(richUnsupported===undefined?{}:{richUnsupported}),...(editorAutoTitle===undefined?{}:{editorAutoTitle}),...(contentLoaded===undefined?{}:{contentLoaded})});
 }
 return {entries,contents,payload:{month:request.month,total:response.total,nextCursor:response.nextCursor,nextEntry:clone(nextEntry),contentsIncluded:true}};
}

export function createJournalReadCache({repository,identity,enabled=()=>false,now=()=>Date.now()}={}){
 const tickets=new WeakMap();
 function authorize(){if(enabled()!==true)throw fail('NotEnabledError');if(identity?.status().verified!==true||identity.status().cacheReady!==true)throw fail('IdentityError');const scope=identity.getScope();if(!scope)throw fail('IdentityError');return clone(scope);}
 function guard(scope){if(!sameScope(authorize(),scope))throw fail('ScopeChangedError');}
 const result=async action=>{try{return await action();}catch(error){return {ok:false,error:safe(error)};}};
 return Object.freeze({
  // Capture the local revision BEFORE starting a remote read. A response from
  // before a confirmed local change must never receive a fresh revision later.
  prepare:request=>result(async()=>{
   const scope=authorize(),normalized=normalizeRequest(request),meta=checked(await repository.getMeta());guard(scope);
   if(!sameScope(scope,meta.scope))throw fail('ScopeChangedError');
   const pages=clone(journalPageDescriptors(meta.value.coverage));
   const ticket=Object.freeze({request:Object.freeze(normalized),scope:Object.freeze(scope),revision:meta.value.revision});tickets.set(ticket,pages);
   return {ok:true,ticket};
  }),
  save:(ticket,response)=>result(async()=>{
   if(!ticket||!tickets.has(ticket))throw fail('DataError');const previous=tickets.get(ticket);tickets.delete(ticket);guard(ticket.scope);
   const page=normalizeResponse(ticket.request,clone(response)),savedAt=now();
   if(!Number.isSafeInteger(savedAt)||savedAt<0)throw fail('DataError');
   const key=keyOf(ticket.request),incoming=new Set(page.entries.map(entry=>entry.id));
   const items=page.entries.map(entry=>({id:entry.id,version:entry.updatedAt}));
   const oldFirst=previous.find(view=>view.key===key&&view.revision===ticket.revision);
   const sameFirst=oldFirst&&JSON.stringify(oldFirst.items)===JSON.stringify(items)&&oldFirst.payload?.total===page.payload.total&&oldFirst.payload?.nextCursor===page.payload.nextCursor&&JSON.stringify(oldFirst.payload?.nextEntry)===JSON.stringify(page.payload.nextEntry);
   const retained=previous.filter(view=>{
    if(view.revision!==ticket.revision||view.key===key||view.items.some(item=>incoming.has(item.id)))return false;
    const request=JSON.parse(view.key),samePeriod=request.month===ticket.request.month&&request.project===ticket.request.project;
    // A changed first-page boundary begins a new acquisition of this period.
    // Identical membership/versions preserve stale continuation previews.
    // A changed total invalidates them too. Never infer a
    // coherent whole-month snapshot from independent legacy RPCs.
    return !samePeriod||(ticket.request.cursor!==''||sameFirst)&&view.payload?.total===page.payload.total;
   }).map(view=>({...view,revision:ticket.revision+1}));
   const descriptor={format:FORMAT,key,revision:ticket.revision+1,savedAt,payload:page.payload,items};
   const saved=checked(await repository.applyRemoteBatch({expectedRevision:ticket.revision,entries:page.entries,contents:page.contents,coverage:{journalPage:null,journalPages:{format:JOURNAL_INDEX_FORMAT,pages:[...retained,descriptor].slice(-JOURNAL_PAGE_LIMIT)}}}));
   guard(ticket.scope);if(!sameScope(ticket.scope,saved.scope))throw fail('ScopeChangedError');
   return {ok:true};
  }),
  read:request=>result(async()=>{
   const scope=authorize(),key=keyOf(request),snapshot=checked(await repository.readRemoteView(key));guard(scope);
   if(!sameScope(scope,snapshot.scope))throw fail('ScopeChangedError');
   if(!snapshot.value||snapshot.value.view.key!==key)return {ok:true,hit:false};
   const {view,entries}=snapshot.value;
   const response={...view.payload,entries:entries.map(({entry,content})=>{const {id,version,...body}=content;return {...entry,...body};})};
   // Treat a malformed persisted descriptor as a miss/fallback, never as a
   // valid editable response. This also checks page membership and cursor.
   normalizeResponse(normalizeRequest(request),response);
   if(!Number.isSafeInteger(view.savedAt)||view.savedAt<0)throw fail('SchemaError');
   return {ok:true,hit:true,response,savedAt:view.savedAt,stale:true,scope};
  }),
  isCurrent(scope){try{guard(scope);return true;}catch{return false;}}
 });
}

// Cached data is a preview; onRemote is the only callback for canonical data.
// UI consumers preserve their dirty editor in onRemote and label onCached as
// stale. Storage failures always leave the ordinary remote read available.
export function createJournalPageLoader({cache,fetchPage}={}){
 let generation=0;
 return Object.freeze({
  cancel(){generation++;},
  async load(request,{onCached=()=>{},onRemote=()=>{},isCurrent=()=>true}={}){
   const current=++generation,normalized=clone(request),active=()=>current===generation&&isCurrent();
   let ready=null;
   if(cache){
    let timer;
    try{ready=await Promise.race([
     Promise.resolve().then(()=>cache.prepare(normalized)).catch(()=>({ok:false,error:'StorageError'})),
     new Promise(resolve=>{timer=setTimeout(()=>resolve({ok:false,error:'TimeoutError'}),PREPARE_BUDGET_MS);})
    ]);}finally{clearTimeout(timer);}
   }
   if(!active())return {outcome:'cancelled'};
   // Revalidate concurrently with the local page read. A blocked cache read
   // must never delay an available Google response or render after it.
   let remoteSettled=false;
   const remote=Promise.resolve().then(()=>fetchPage(clone(normalized))).then(response=>{remoteSettled=true;return response;},error=>{remoteSettled=true;throw error;});
   if(ready?.ok)Promise.resolve().then(()=>cache.read(normalized)).then(cached=>{
    if(active()&&!remoteSettled&&cached.ok&&cached.hit&&cache.isCurrent(cached.scope))onCached(cached);
   }).catch(()=>{});
   const response=await remote;
   if(!active())return {outcome:'cancelled'};
   // Identity revocation cancels delivery, even if the Google RPC succeeded.
   if(ready?.ok&&!cache.isCurrent(ready.ticket.scope))return {outcome:'cancelled'};
   const canonical=ready?.ok?clone(response):null;
   onRemote(response);
   // Rendering/confirmation does not wait for IndexedDB. The caller may await
   // persistence explicitly in tests, but it is never a remote save ACK.
   const persistence=ready?.ok?Promise.resolve().then(()=>cache.save(ready.ticket,canonical)).catch(()=>({ok:false,error:'StorageError'})):Promise.resolve({ok:false,error:'NotEnabledError'});
   return {outcome:'remote',persistence};
  }
 });
}
