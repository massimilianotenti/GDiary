// P55: continuous journal editing. Metadata and bodies remain separate from Docs.
const JOURNAL_LAYOUT_HEADERS=['entryId','position','updatedAt'];
function journalProjectList_(value){return Array.from(new Set(String(value||'').split(',').map(x=>x.trim()).filter(Boolean)));}
function journalLayout_(create=false){let s=db_().getSheetByName('JournalLayout');if(!s&&create){s=db_().insertSheet('JournalLayout');s.getRange(1,1,1,3).setValues([JOURNAL_LAYOUT_HEADERS]);s.setFrozenRows(1);}if(s)verify_(s,JOURNAL_LAYOUT_HEADERS);return s;}
function editorRows_(month,taskArchive=false){const gateway=entryCommitGateway_(),entries=(gateway?gateway.readRows().filter(e=>taskArchive?e.type==='task':e.date.startsWith(month+'-')):(taskArchive?entrySearch_('type','^task$'):entrySearch_('date','^'+month+'-'))).sort((a,b)=>b.date.localeCompare(a.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)),s=journalLayout_(),layout=new Map(s?rows_(s,JOURNAL_LAYOUT_HEADERS).map(r=>[r.entryId,Number(r.position)]):[]),epoch=Date.parse('2020-01-01T00:00:00Z');entries.forEach(e=>{const time=Date.parse(e.createdAt),suffix=parseInt(e.id.replace(/[^a-f0-9]/gi,'').slice(0,5)||'0',16)/1048576;e.position=Number.isFinite(e.position)?e.position:(layout.has(e.id)?layout.get(e.id):(Number.isFinite(time)?time-epoch:0)+suffix);});return entries.sort((a,b)=>b.date.localeCompare(a.date)||a.position-b.position||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));}
// Read-only cache: every document revision is checked in Drive on each request.
function journalSectionIndex_(body){return traceMeasure_('docsIndex',()=>{const index=new Map(),count=body.getNumChildren();traceCount_('docsBodyChildren',count);for(let i=0;i<count;i++){const child=body.getChild(i),text=child.getText?child.getText():'';if(/^\[(?:BJ|END):/.test(text)){if(!index.has(text))index.set(text,[]);index.get(text).push(i);}}return index;});}
function journalCacheGetAll_(keys){
 const unique=[...new Set(keys.filter(Boolean))];if(!unique.length)return {};
 try{return traceMeasure_('cacheGetAll',()=>CacheService.getScriptCache().getAll(unique))||{};}
 catch(ignore){traceCount_('cacheReadErrors');return {};}
}
function journalCacheParse_(key,values){
 if(!key){traceCount_('cacheNoRevision');return null;}
 const raw=Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;
 if(!raw){traceCount_('cacheAbsentUnknown');return null;}
 try{const value=traceMeasure_('cacheParse',()=>JSON.parse(raw));if(!value||typeof value.body!=='string'||!Array.isArray(value.rich)||typeof value.richUnsupported!=='boolean'){traceCount_('cacheInvalid');return null;}return value;}
 catch(ignore){traceCount_('cacheInvalid');return null;}
}
function journalCachePutAll_(writes){
 const values={};for(const {key,value} of writes){if(!key)continue;try{const raw=traceMeasure_('cacheSerialize',()=>JSON.stringify(value));if(raw.length>24000){traceCount_('cacheOversize');continue;}values[key]=raw;}catch(ignore){traceCount_('cachePutErrors');}}
 const count=Object.keys(values).length;if(!count)return;
 try{traceMeasure_('cachePutAll',()=>CacheService.getScriptCache().putAll(values,21600));traceCount_('cacheWrites',count);}catch(ignore){traceCount_('cachePutErrors');}
}
// Explicit diagnostic experiment: reads existing cache keys, never populates it.
function benchmarkJournalCache(p){
 if(!ACTIVE_TRACE)throw Error('Attiva la diagnostica prima del confronto.');
 if(!p||!/^\d{4}-\d{2}$/.test(p.month||'')||!validDate_(p.month+'-01'))throw Error('Mese non valido.');
 DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ioReset_();
 const entries=editorRows_(p.month).slice(0,25),sources=new Map(),keys=[];attachPendingDocs_(entries);
 entries.forEach(e=>{if(e.docPending)return;const r=ref_(e.id);if(!r)return;if(!sources.has(r.docId)){let stamp='';try{const f=DriveApp.getFileById(r.docId);inside_(f);if(!f.isTrashed())stamp=String(f.getLastUpdated().getTime());if(!/^\d+$/.test(stamp))stamp='';}catch(ignore){}sources.set(r.docId,stamp);}const stamp=sources.get(r.docId);if(stamp)keys.push('JP3:'+r.docId+':'+stamp+':'+e.id+':'+e.updatedAt);});
 const unique=[...new Set(keys)],cache=CacheService.getScriptCache(),absent=['JP3:benchmark-missing:'+p.context.traceId];
 traceCount_('benchmarkKeys',unique.length);
 function compare(list,singlePhase,bulkPhase,reverse){let singles,bulk;const readSingle=()=>{singles=traceMeasure_(singlePhase,()=>{const found={};list.forEach(k=>{const value=cache.get(k);if(value!==null&&value!==undefined)found[k]=value;});return found;});},readBulk=()=>{bulk=traceMeasure_(bulkPhase,()=>cache.getAll(list));};try{if(reverse){readBulk();readSingle();}else{readSingle();readBulk();}list.forEach(k=>{if((singles[k]??null)!==(bulk?.[k]??null))traceCount_('benchmarkMismatches');});}catch(ignore){traceCount_('benchmarkErrors');}}
 for(let round=0;round<5;round++){if(unique.length)compare(unique,'cacheBenchSingle','cacheBenchBulk',round%2===1);compare(absent,'cacheBenchAbsentSingle','cacheBenchAbsentBulk',round%2===1);traceCount_('benchmarkRounds');}
 return {keysCount:unique.length,rounds:5};
}
const TASK_INDEX_TTL=600,TASK_INDEX_PART_BYTES=80000,TASK_INDEX_MAX_PARTS=100,TASK_INDEX_MAX_BYTES=8000000;
const TASK_INDEX_FIELDS=ENTRY_HEADERS.filter(key=>key!=='body').concat(['position','plannedDate','workStart','workEnd','importance','docPending','docQueueError']);
function taskIndexStamp_(){return traceMeasure_('taskIndexCheck',()=>{
 if(APP_LOCK_DEPTH)return null;let lock,held=false,stamp=null;
 try{lock=LockService.getScriptLock();held=lock.tryLock(0);if(!held){traceCount_('taskIndexBusy');return null;}
  const props=PropertiesService.getScriptProperties(),values=props.getProperties();
  stamp=values.DB_ID?JSON.stringify([values.DB_ID,values.ROOT_ID||'',values.TASK_INDEX_REVISION||'0']):null;
 }catch(ignore){traceCount_('taskIndexCheckErrors');}finally{if(held)try{lock.releaseLock();}catch(ignore){stamp=null;traceCount_('taskIndexCheckErrors');}}
 return stamp;
});}
function taskIndexParams_(p){return JSON.stringify([p.month,p.taskArchive===true,p.project||'']);}
function taskIndexHash_(value){let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
function taskIndexKey_(token,part){return 'TI1:'+token+':'+part;}
function taskIndexStore_(p,all,stamp){
 if(!stamp||!all.length)return null;
 try{return traceMeasure_('taskIndexBuild',()=>{
  if(taskIndexStamp_()!==stamp){traceCount_('taskIndexBuildChanged');return null;}
  attachSchedules_(all);attachPendingDocs_(all);
  // Check again after reading the auxiliary tables as well as Entries/layout.
  if(taskIndexStamp_()!==stamp){traceCount_('taskIndexBuildChanged');return null;}
  const token=Utilities.getUuid(),values={},parts=[];let rows=[],bytes=2,totalBytes=0,start=0;
  const finish=()=>{if(!rows.length)return;const raw='['+rows.join(',')+']';values[taskIndexKey_(token,parts.length)]=raw;parts.push({start,count:rows.length,hash:taskIndexHash_(raw)});start+=rows.length;totalBytes+=bytes;rows=[];bytes=2;};
  for(const e of all){const metadata={};for(const key of TASK_INDEX_FIELDS)if(e[key]!==undefined)metadata[key]=e[key];metadata.contentLoaded=false;const raw=JSON.stringify(metadata),size=traceBytes_(raw);
   if(size+2>TASK_INDEX_PART_BYTES){traceCount_('taskIndexOversize');return null;}
   if(bytes+size+(rows.length?1:0)>TASK_INDEX_PART_BYTES)finish();
   rows.push(raw);bytes+=size+(rows.length>1?1:0);
   if(parts.length>=TASK_INDEX_MAX_PARTS||totalBytes+bytes>TASK_INDEX_MAX_BYTES){traceCount_('taskIndexOversize');return null;}
  }finish();
  const createdAt=Date.now(),manifest={version:1,token,stamp,params:taskIndexParams_(p),createdAt,expiresAt:createdAt+TASK_INDEX_TTL*1000,total:all.length,parts};
  values[taskIndexKey_(token,'manifest')]=JSON.stringify(manifest);
  traceMeasure_('taskIndexPut',()=>CacheService.getScriptCache().putAll(values,TASK_INDEX_TTL));traceCount_('taskIndexStoredBytes',totalBytes);traceCount_('taskIndexStoredParts',parts.length);
  return token;
 });}catch(ignore){traceCount_('taskIndexWriteErrors');return null;}
}
function taskIndexReset_(reason,started){traceCount_('taskIndexResets');return {entries:[],contentsIncluded:false,snapshotReset:reason,performance:{totalMs:Date.now()-started,metadataOnly:1,entriesCount:0}};}
function taskIndexRead_(p,started){
 if(!/^[-a-zA-Z0-9]{10,80}$/.test(p.taskSnapshot||'')||!Number.isInteger(p.snapshotOffset)||p.snapshotOffset<1||!p.cursor)throw Error('Continuazione dell’elenco Task non valida.');
 try{return traceMeasure_('taskIndexRead',()=>{
  const stamp=taskIndexStamp_();if(!stamp)return taskIndexReset_('busy',started);
  const cache=CacheService.getScriptCache(),raw=traceMeasure_('taskIndexGet',()=>cache.get(taskIndexKey_(p.taskSnapshot,'manifest')));if(!raw)return taskIndexReset_('missing',started);
  let manifest;try{manifest=JSON.parse(raw);}catch(ignore){return taskIndexReset_('corrupt',started);}
  if(manifest.version!==1||manifest.token!==p.taskSnapshot||!Number.isInteger(manifest.total)||manifest.total<1||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>TASK_INDEX_MAX_PARTS||!Number.isFinite(manifest.createdAt)||!Number.isFinite(manifest.expiresAt)||manifest.expiresAt-manifest.createdAt!==TASK_INDEX_TTL*1000)return taskIndexReset_('corrupt',started);
  if(manifest.params!==taskIndexParams_(p)||manifest.stamp!==stamp)return taskIndexReset_('changed',started);
  if(Date.now()>=manifest.expiresAt)return taskIndexReset_('expired',started);
  let count=0;for(const part of manifest.parts){if(part.start!==count||!Number.isInteger(part.count)||part.count<1||typeof part.hash!=='string')return taskIndexReset_('corrupt',started);count+=part.count;}if(count!==manifest.total||p.snapshotOffset>=count)return taskIndexReset_('corrupt',started);
  const limit=Math.min(count,p.snapshotOffset+201),wanted=manifest.parts.map((part,i)=>({...part,key:taskIndexKey_(p.taskSnapshot,i)})).filter(part=>part.start<limit&&part.start+part.count>p.snapshotOffset-1),payload=traceMeasure_('taskIndexGet',()=>cache.getAll(wanted.map(part=>part.key))),records=new Map();
  for(const part of wanted){const text=payload?.[part.key];if(typeof text!=='string')return taskIndexReset_('missing',started);if(traceBytes_(text)>TASK_INDEX_PART_BYTES||taskIndexHash_(text)!==part.hash)return taskIndexReset_('corrupt',started);let rows;try{rows=JSON.parse(text);}catch(ignore){return taskIndexReset_('corrupt',started);}if(!Array.isArray(rows)||rows.length!==part.count)return taskIndexReset_('corrupt',started);
   for(let i=0;i<rows.length;i++){const e=rows[i];if(!e||e.type!=='task'||e.contentLoaded!==false||!Number.isFinite(e.position)||ENTRY_HEADERS.filter(key=>key!=='body').some(key=>typeof e[key]!=='string')||Object.keys(e).some(key=>key!=='contentLoaded'&&!TASK_INDEX_FIELDS.includes(key)))return taskIndexReset_('corrupt',started);records.set(part.start+i,e);}
  }
  if(records.get(p.snapshotOffset-1)?.id!==p.cursor)return taskIndexReset_('changed',started);
  const entries=[];let size=0;for(let i=p.snapshotOffset;i<Math.min(count,p.snapshotOffset+200);i++){const e=records.get(i);if(!e)return taskIndexReset_('corrupt',started);const bytes=JSON.stringify(e).length;if(entries.length&&size+bytes>600000)break;entries.push(e);size+=bytes;}
  if(taskIndexStamp_()!==stamp)return taskIndexReset_('changed',started);
  const next=p.snapshotOffset+entries.length,following=next<count?records.get(next):null;if(next<count&&!following)return taskIndexReset_('corrupt',started);traceCount_('taskIndexHits');
  return {entries,total:count,nextCursor:next<count?entries[entries.length-1].id:'',nextEntry:following?{date:following.date,position:following.position}:null,month:p.month,contentsIncluded:false,taskSnapshot:p.taskSnapshot,snapshotOffset:next,performance:{kind:'journalMetadataRead',traceId:ACTIVE_CONTEXT.traceId||'',totalMs:Date.now()-started,metadataOnly:1,entriesCount:entries.length,contentMs:0,documentsOpened:0,documentsChecked:0,cacheHits:0,cacheMisses:0,queuedContents:0}};
 });}catch(ignore){traceCount_('taskIndexReadErrors');return taskIndexReset_('unavailable',started);}
}
function getJournalPage(p){
 const started=Date.now();ACTIVE_CONTEXT=p&&p.context||{};DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();
 if(!p||!/^\d{4}-\d{2}$/.test(p.month)||!validDate_(p.month+'-01'))throw Error('Mese non valido.');
 if(p.metadataOnly===true&&p.taskOnly!==true)throw Error('La lettura dei soli metadati richiede la vista Task.');
 if(p.taskSnapshot){if(p.metadataOnly!==true)throw Error('La fotografia richiede la lettura dei metadati Task.');return taskIndexRead_(p,started);}
 const snapshotStamp=p.metadataOnly===true&&!p.cursor&&!p.snapshotDisabled?taskIndexStamp_():null;
 const all=editorRows_(p.month,p.taskArchive===true).filter(e=>(!p.taskOnly||e.type==='task')&&(!p.project||e.projects.split(',').includes(p.project)));if(p.taskArchive===true){attachSchedules_(all);all.sort((a,b)=>({emergency:2,urgent:1,normal:0}[b.importance]||0)-({emergency:2,urgent:1,normal:0}[a.importance]||0)||(a.due||'9999').localeCompare(b.due||'9999')||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));}const start=p.cursor?all.findIndex(e=>e.id===p.cursor)+1:0;
 if(p.cursor&&!start)throw Error('La pagina è cambiata: ricarica il diario.');
 const candidates=all.slice(start,start+(p.metadataOnly===true?200:25));attachSchedules_(candidates);attachPendingDocs_(candidates);
 const metadataMs=Date.now()-started;
 let content;
 if(p.metadataOnly===true){const entries=[];let size=0;for(const e of candidates){const {body,...metadata}=e,value={...metadata,contentLoaded:false};const bytes=JSON.stringify(value).length;if(entries.length&&size+bytes>600000)break;size+=bytes;entries.push(value);}content={entries,performance:{contentMs:0,documentsOpened:0,documentsChecked:0,cacheHits:0,cacheMisses:0,queuedContents:0}};}
 else content=journalReadContents_(candidates,p);
 const result=content.entries;
 const taskSnapshot=snapshotStamp&&start+result.length<all.length?taskIndexStore_(p,all,snapshotStamp):null;
 return {entries:result,total:all.length,nextCursor:start+result.length<all.length?result[result.length-1]?.id||'':'',nextEntry:start+result.length<all.length?{date:all[start+result.length].date,position:all[start+result.length].position}:null,month:p.month,contentsIncluded:p.metadataOnly!==true,...(taskSnapshot?{taskSnapshot,snapshotOffset:start+result.length}:{}),performance:{kind:p.metadataOnly===true?'journalMetadataRead':'journalPageRead',traceId:ACTIVE_CONTEXT.traceId||'',totalMs:Date.now()-started,metadataMs,metadataOnly:p.metadataOnly===true?1:0,...content.performance,entriesCount:result.length}};
}
// Shared content reader: the normal diary and deferred Task bodies keep the
// same live Drive checks, revision cache, rich parsing and pending precedence.
function journalReadContents_(candidates,p){
 const result=[],sources=new Map(),contentStart=Date.now();let size=0,documentsOpened=0,cacheHits=0,cacheMisses=0,queuedContents=0;
 // Prepare at most 25 keys; failures remain local to their entry.
 const prepared=new Map();
 for(const e of candidates){if(e.docPending)continue;try{const r=ref_(e.id);if(!r){prepared.set(e,{r:null});continue;}
   let source=sources.get(r.docId);if(!source){traceMeasure_('driveCheck',()=>{const file=traceMeasure_('drive',()=>DriveApp.getFileById(r.docId));inside_(file);if(traceMeasure_('driveTrash',()=>file.isTrashed()))throw Error('Documento nel cestino.');let stamp='';try{stamp=traceMeasure_('driveRevision',()=>String(file.getLastUpdated().getTime()));if(!/^\d+$/.test(stamp))stamp='';}catch(ignore){}source={file,stamp,body:null,index:null,writes:[]};sources.set(r.docId,source);});}
   const key=source.stamp?'JP3:'+r.docId+':'+source.stamp+':'+e.id+':'+e.updatedAt:'';prepared.set(e,{r,source,key});
 }catch(error){prepared.set(e,{error});}}
 const cacheValues=p.refreshDocs===true?{}:journalCacheGetAll_([...prepared.values()].map(x=>x.key));
 const contentIds=[];
 for(const e of candidates){const item=prepared.get(e);if(e.docPending){contentIds.push(e.id);continue;}if(!item?.r||item.error)continue;item.cached=p.refreshDocs===true?(traceCount_('cacheExplicitBypass'),null):journalCacheParse_(item.key,cacheValues);if(!item.cached)contentIds.push(e.id);}
 docContentsForPage_(contentIds);
 for(const e of candidates){try{
  if(e.docPending){traceCount_('cachePendingBypass');const c=traceMeasure_('pendingContent',()=>docContent_(e.id));e.editorAutoTitle=c?.editorAutoTitle===true;Object.assign(e,{body:c?c.body:'',rich:c?writtenRich_(c.rich):writtenRich_(plainRich_('')),richUnsupported:false});queuedContents++;}
  else{const {r,source,key,error}=prepared.get(e);if(error)throw error;if(r){
   const cached=prepared.get(e).cached;
   if(cached){Object.assign(e,cached);cacheHits++;}
   else{cacheMisses++;const c=traceMeasure_('syncedContent',()=>docContent_(e.id));if(!source.body){source.body=traceMeasure_('docsBody',()=>traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody());source.index=journalSectionIndex_(source.body);documentsOpened++;}
    const content=sectionRich_(r,source.body,source.index),value={body:content.rich.map(b=>b.runs.map(r=>r.text).join('')).join('\n').trim(),rich:content.rich,richUnsupported:content.richUnsupported,editorAutoTitle:c?.editorAutoTitle===true};Object.assign(e,value);
    // Don't cache a document that changed while this request was reading it.
    if(key)source.writes.push({key,value});
   }
   e.docUrl='https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark;
  }else{e.body='';e.rich=writtenRich_(plainRich_(''));e.editorError='Nota non migrata: usa il dettaglio o migrateDocsBatch.';}}
 }catch(err){e.body='';e.rich=[];e.editorError=String(err.message||err);}
 const bytes=traceMeasure_('responseSerialize',()=>JSON.stringify(e)).length;if(result.length&&size+bytes>600000)break;size+=bytes;result.push(e);}
 const cacheWrites=[];sources.forEach((source,id)=>{if(!source.writes.length)return;let after='';try{after=traceMeasure_('driveRevision',()=>String(traceMeasure_('drive',()=>DriveApp.getFileById(id)).getLastUpdated().getTime()));}catch(ignore){}if(/^\d+$/.test(after)&&source.stamp&&after===source.stamp)cacheWrites.push(...source.writes);else traceCount_(after?'cacheWriteRevisionChanged':'cacheWriteRevisionUnavailable',source.writes.length);});
 journalCachePutAll_(cacheWrites);
 return {entries:result,performance:{contentMs:Date.now()-contentStart,documentsOpened,documentsChecked:sources.size,cacheHits,cacheMisses,queuedContents}};
}
function getJournalContents(p){
 const started=Date.now();ACTIVE_CONTEXT=p&&p.context||{};DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();
 if(!p||!Array.isArray(p.items)||!p.items.length||p.items.length>25)throw Error('Richiedi da 1 a 25 descrizioni.');
 const ids=new Set();for(const item of p.items){if(!item||typeof item.id!=='string'||!item.id||item.id.length>200||ids.has(item.id)||typeof item.updatedAt!=='string'||!item.updatedAt||item.updatedAt.length>80)throw Error('Identità o versione della descrizione non valida.');ids.add(item.id);}
 const escape=id=>Array.from(id).map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join(''),pattern='^('+[...ids].map(escape).join('|')+')$',sheet=db_().getSheetByName('Entries');
 const gateway=entryCommitGateway_(),read=()=>{if(gateway){const values=[...ids].map(id=>gateway.read(id)).filter(Boolean);return new Map(values.map(e=>[e.id,e]));}return new Map(readEntries_(findRows_(sheet,1,pattern,true)).map(e=>[e.id,e]));};
 const before=read(),errors=[],candidates=[];
 for(const item of p.items){const e=before.get(item.id);if(!e||e.type!=='task')errors.push({id:item.id,message:'Task non disponibile. Aggiorna l’elenco conservando la bozza.'});else if(e.updatedAt!==item.updatedAt)errors.push({id:item.id,message:'Voce modificata altrove. Aggiorna l’elenco conservando la bozza.'});else candidates.push(e);}
 attachSchedules_(candidates);attachPendingDocs_(candidates);
 const metadataMs=Date.now()-started,content=journalReadContents_(candidates,p),after=content.entries.length?read():new Map(),entries=[];
 for(const e of content.entries){const current=after.get(e.id);if(!current||current.type!=='task'||current.updatedAt!==e.updatedAt)errors.push({id:e.id,message:'Voce modificata durante la lettura. Aggiorna l’elenco conservando la bozza.'});else if(e.editorError)errors.push({id:e.id,message:e.editorError});else entries.push({...e,contentLoaded:true});}
 return {entries,errors,remainingIds:candidates.slice(content.entries.length).map(e=>e.id),performance:{kind:'journalContentsRead',traceId:ACTIVE_CONTEXT.traceId||'',totalMs:Date.now()-started,metadataMs,...content.performance,entriesCount:entries.length}};
}
function persistEditorRecords_(s,headers,records){if(!records.length)return;const before=rows_(s,headers),indices=new Map(before.map((r,i)=>[r[headers[0]],i+2])),groups=[],added=[];const updates=[];records.forEach(r=>{const values=headers.map(h=>String(r[h]??'')),row=indices.get(r[headers[0]]);if(row){if(JSON.stringify(headers.map(h=>String(before[row-2][h]??'')))!==JSON.stringify(values))updates.push({row,values});}else added.push(values);});updates.sort((a,b)=>a.row-b.row).forEach(x=>{const last=groups[groups.length-1];if(last&&last.start+last.values.length===x.row)last.values.push(x.values);else groups.push({start:x.row,values:[x.values]});});groups.forEach(g=>writeRows_(s,g.start,g.values));if(added.length)append_(s,added);}
function saveRoutedJournalPage_(gateway,p,prepared){const blocks=[],contents=[],duplicates=new Set();for(const item of prepared){const {b,old,body,rich,title,autoTitle,projects,tags,due,schedule,status,stored,previous}=item,clientId=b.clientId,baseVersion=(b.id?b.updatedAt:old?.updatedAt)||'',id=old?.id||b.id||'',version='page-content-'+syncContentDigest_({clientId,baseVersion,body,rich,title,autoTitle,projects,tags,due,status,schedule:schedule||null}),content={body,rich,version,baselineBody:previous?previous.baselineBody:old?String(b.originalBody||''):null,baselineRich:previous?previous.baselineRich:old?b.originalRich||null:null,headerTitle:title,baselineTitle:previous?(previous.baselineTitle===undefined?old.text:previous.baselineTitle):old?old.text:null,baselineHeading:previous?.baselineHeading??null,editorAutoTitle:autoTitle},entry={id,date:b.date,type:b.type,text:title,projects,tags,due,status,createdAt:old?.createdAt||b.createdAt||'',requestId:old?.requestId||'page-'+clientId,scope:old?.scope||(projects?'project':'personal'),completedAt:''};if(old&&!b.id)duplicates.add(clientId);const taskSchedule=schedule||{date:'',workStart:'',workEnd:'',importance:'normal'};blocks.push({clientId,id,updatedAt:baseVersion,entry,schedule:taskSchedule,contentVersion:version,contentDigest:syncContentDigest_(content),position:Number(b.position)});contents.push({clientId,content});}
 const result=gateway.savePage({month:p.month,blocks,...(p.operationId?{operationId:p.operationId}:{})},contents,p.operationId?p.clientRequest:undefined);result.entries=result.entries.map(entry=>({...entry,...(duplicates.has(entry.clientId)?{duplicate:true}:{})}));return result;}
function saveJournalPage(p){if(!p||!Array.isArray(p.blocks)||!p.blocks.length||p.blocks.length>25)throw Error('Salva da 1 a 25 blocchi per richiesta.');if(p.operationId!==undefined&&!/^[a-zA-Z0-9-]{10,80}$/.test(p.operationId))throw Object.assign(Error('OperationId non valido.'),{name:'DataError'});if(!/^\d{4}-\d{2}$/.test(p.month||'')||!validDate_(p.month+'-01'))throw Error('Mese non valido.');ACTIVE_CONTEXT=p.context||{};return locked_(function(){const gateway=entryCommitGateway_(),db=db_(),s=db.getSheetByName('Entries'),known=new Set(rows_(db.getSheetByName('Projects'),PROJECT_HEADERS).map(r=>String(r.slug||'').trim())),ids=new Set(),clients=new Set(),plans=[],contents=[],changed=[],duplicates=[],layouts=[];
 // The UI also offers project links recovered from legacy entries. Read just that column,
 // lazily, when a selection is absent from the registered project catalog.
 let archiveProjects=null;const existingProject=slug=>{if(known.has(slug))return true;if(archiveProjects===null){const count=s.getLastRow()-1;archiveProjects=new Set(count>0?s.getRange(2,ENTRY_HEADERS.indexOf('projects')+1,count,1).getDisplayValues().flatMap(row=>journalProjectList_(row[0])):[]);}return archiveProjects.has(slug);};
 // Validate the entire batch before any mutation.
 const prepared=p.blocks.map(b=>{if(!b||!/^[a-zA-Z0-9-]{10,80}$/.test(b.clientId||'')||clients.has(b.clientId))throw Error('Identificativo blocco duplicato o non valido.');if(b.contentLoaded===false)throw Error('Carica la descrizione prima di salvare il task. La bozza resta conservata.');clients.add(b.clientId);if(b.id&&ids.has(b.id))throw Error('Voce duplicata.');if(b.id)ids.add(b.id);if(!validDate_(b.date)||!b.date.startsWith(p.month+'-')||!['note','task','idea'].includes(b.type))throw Error('Data o tipo blocco non valido.');const localCreate=!!gateway&&!!p.operationId&&!!b.id&&b.updatedAt==='';const found=localCreate?[]:b.id?findRows_(s,1,b.id,false):findRows_(s,10,'page-'+b.clientId,false);
 const oldRow=found.length?readEntry_(found[0]):null,old=oldRow?(gateway?gateway.read(oldRow.id):oldRow):null;if(old&&!gateway)assertEntryLegacyWriteAllowed_(old.id);if(b.id&&(!old&&!localCreate||old&&!gateway&&old.updatedAt!==b.updatedAt))throw Error('Voce modificata altrove: '+String(b.title||'').slice(0,80)+'. La bozza resta conservata.');if(old&&b.id&&(old.date!==b.date||old.type!==b.type))throw Error('Data e tipo delle voci salvate restano invariati.');
 const body=String(b.body||'').replace(/\r\n?/g,'\n'),rich=validateRich_(b.rich||plainRich_(body),body),autoTitle=b.type!=='task'&&(b.autoTitle===true||!String(b.title||'').trim()),title=b.type==='task'?String(b.title||'').trim():(autoTitle?'':String(b.title||'').trim())||body.split('\n').find(t=>t.trim())?.trim().slice(0,120)||'';const label=(b.type==='task'?'Task':'Nota')+' «'+(title||'senza titolo').slice(0,70)+'»';if(!title)throw Error(label+': '+(b.type==='task'?'compila il titolo del task.':'scrivi il testo oppure un titolo.'));if(title.length>2000)throw Error(label+': titolo troppo lungo (massimo 2000 caratteri).');if(body.length>100000)throw Error(label+': testo troppo lungo (massimo 100000 caratteri).');if(/\[(?:BJ|END):/.test(title+'\n'+body))throw Error(label+': il testo contiene marcatori riservati [BJ: o [END:.');if(b.type==='task'&&/[\r\n]/.test(title))throw Error(label+': il titolo del task contiene un a capo; usa una sola riga e sposta il resto nella descrizione.');const projects=journalProjectList_(b.projects),previousProjects=journalProjectList_(old?.projects),missing=projects.filter(x=>!previousProjects.includes(x)&&!existingProject(x));if(missing.length)throw Error('[PROJECT:'+b.clientId+'] Progetto non disponibile: '+missing.join(', ')+'. Apri Progetti e tag e scegli un progetto presente oppure rimuovi il collegamento. Il testo resta nella bozza.');const tags=normaliseTags_(b.tags||''),due=b.type==='task'?String(b.due||''):'';if(due&&!validDate_(due))throw Error('Deadline non valida.');const schedule=b.type==='task'?taskSchedule_(b):null,status=b.type==='task'?String(b.status||'open'):'';if(b.type==='task'&&!['open','doing','done','cancelled'].includes(status))throw Error('Stato task non valido.');if(!Number.isFinite(Number(b.position))||Math.abs(Number(b.position))>1e12)throw Error('Posizione del blocco non valida.');const stored=old?docContent_(old.id):null,previous=old&&queuedTask_(old.id)?stored:null;if(old&&b.id&&previous&&(previous.body!==String(b.originalBody||'')||b.originalRich&&richSignature_(writtenRich_(previous.rich))!==richSignature_(b.originalRich)))throw Error('Il contenuto è cambiato: riapri la pagina conservando la bozza.');return {b,old,row:found[0]||0,body,rich,title,autoTitle,stored,projects:projects.join(','),tags,due,schedule,status,previous};});
 if(gateway)return saveRoutedJournalPage_(gateway,{month:p.month,operationId:p.operationId,clientRequest:p.operationId?JSON.parse(JSON.stringify({month:p.month,operationId:p.operationId,blocks:p.blocks})):undefined},prepared);
 prepared.forEach(x=>{const {b,old,body,rich,title,autoTitle,stored,projects,tags,due,schedule,status,previous}=x;if(old&&!b.id){const c=docContent_(old.id);duplicates.push({clientId:b.clientId,...old,editorAutoTitle:c?.editorAutoTitle===true,body:c?c.body:'',rich:c?writtenRich_(c.rich):writtenRich_(plainRich_('')),duplicate:true});if(!ref_(old.id)&&!queuedTask_(old.id))contents.push({e:old,content:c||{body,rich,version:old.updatedAt,baselineBody:null,baselineRich:null,headerTitle:old.text,baselineTitle:null,editorAutoTitle:autoTitle}});return;}const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0,previous?Date.parse(previous.version)+1:0)).toISOString(),e={...(old||{}),id:old?old.id:Utilities.getUuid(),date:b.date,type:b.type,text:title,projects,tags,due,status,createdAt:old?old.createdAt:now,updatedAt:now,requestId:old?old.requestId:'page-'+b.clientId,scope:old?old.scope:(projects?'project':'personal'),body:'',completedAt:status==='done'?(old?.completedAt||now):''};changed.push({e,b,body,rich,autoTitle,row:x.row});layouts.push({entryId:e.id,position:String(b.position),updatedAt:now});if(schedule)plans.push({entryId:e.id,date:schedule.date,updatedAt:now,workStart:schedule.workStart,workEnd:schedule.workEnd,importance:schedule.importance});const contentChanged=!old||autoTitle!==(stored?.editorAutoTitle===true)||title!==old.text||body!==String(b.originalBody||'')||!b.originalRich||richSignature_(rich)!==richSignature_(b.originalRich);if(contentChanged)contents.push({e,content:{body,rich,version:now,baselineBody:previous?previous.baselineBody:old?String(b.originalBody||''):null,baselineRich:previous?previous.baselineRich:old?b.originalRich||null:null,headerTitle:title,editorAutoTitle:autoTitle,baselineHeading:previous?.baselineHeading??null,baselineTitle:previous?(previous.baselineTitle===undefined?old.text:previous.baselineTitle):old?old.text:null}});});
 const entryGroups=[],newEntries=[];changed.filter(x=>x.row).sort((a,b)=>a.row-b.row).forEach(x=>{const values=ENTRY_HEADERS.map(h=>String(x.e[h]??'')),last=entryGroups[entryGroups.length-1];if(last&&last.start+last.values.length===x.row)last.values.push(values);else entryGroups.push({start:x.row,values:[values]});});entryGroups.forEach(g=>writeRows_(s,g.start,g.values));changed.filter(x=>!x.row).forEach(x=>newEntries.push(ENTRY_HEADERS.map(h=>String(x.e[h]??''))));if(newEntries.length)append_(s,newEntries);ENTRY_SMALL_CACHE=null;if(plans.length){const ps=db.getSheetByName('TaskPlans');ensurePlanHeaders_(ps,true);persistEditorRecords_(ps,PLAN_HEADERS,plans);}if(layouts.length)persistEditorRecords_(journalLayout_(true),JOURNAL_LAYOUT_HEADERS,layouts);if(contents.length)queueDocWrites_(contents);const result=changed.map(({e,b,body,rich,autoTitle})=>({clientId:b.clientId,...e,editorAutoTitle:autoTitle,body,rich:writtenRich_(rich),excerpt:body.slice(0,220),previewRich:previewRuns_(rich),position:Number(b.position)})).concat(duplicates);attachSchedules_(result);attachPendingDocs_(result);return {delta:true,entries:result,commonIncluded:false};});}
