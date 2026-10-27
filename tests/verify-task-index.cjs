const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createSyntheticArchive}=require('./helpers/synthetic-archive.cjs');
const fixture=createSyntheticArchive({entryCount:3000,longBodyLength:0});
const ctx={window:{},document:{addEventListener(){}},setTimeout,console,fixture};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},equal=(a,b,m)=>check(JSON.stringify(a)===JSON.stringify(b),m);
 mockSheets.Entries.data=[ENTRY_HEADERS,...fixture.entries.map(e=>e.slice())];mockSheets.TaskPlans.data=[PLAN_HEADERS,...fixture.plans];
 const layout=mockSheets.JournalLayout||(mockSheets.JournalLayout=new MockSheet('JournalLayout'));layout.data=[JOURNAL_LAYOUT_HEADERS,...fixture.layout];
 mockSheets.DocRefs.data=[REF_HEADERS];
 const args={month:'2026-10',taskOnly:true,taskArchive:true,metadataOnly:true},traceId='task-index-trace-000001';
 const fresh=extra=>getJournalPage({...args,...extra});
 const next=(page,extra={})=>({...args,cursor:page.nextCursor,taskSnapshot:page.taskSnapshot,snapshotOffset:page.snapshotOffset,...extra});
 const revision=()=>mockProps.TASK_INDEX_REVISION;
 let first=fresh();check(first.taskSnapshot&&first.entries.length===200,'first page publishes snapshot');
 const stable=JSON.stringify(mockSheets.Entries.data),props=JSON.stringify(mockProps);
 const second=traceApi({operation:'getJournalPage',traceId,arg:next(first)});check(second.ok&&!second.value.snapshotReset&&second.value.entries.length===200,'cached continuation');
 check(second.diagnostics.taskIndexHits===1&&!second.diagnostics.sheetReadRequests&&!second.diagnostics.driveCalls&&!second.diagnostics.docsOpenCalls,'continuation has no Sheets/Drive/Docs reads');
 const reference=fresh({snapshotDisabled:true,cursor:first.nextCursor});equal(second.value.entries,reference.entries,'cached page matches canonical metadata');
 const third=getJournalPage(next(second.value));check(!third.nextCursor&&new Set(first.entries.concat(second.value.entries,third.entries).map(e=>e.id)).size===600,'all pages complete without duplicates');
 check(stable===JSON.stringify(mockSheets.Entries.data)&&props===JSON.stringify(mockProps),'index reads do not mutate data or Properties');
 check(getJournalPage(next(first,{month:'2026-09'})).snapshotReset==='changed','period scope cannot mix');
 check(getJournalPage(next(first,{project:'miniconf'})).snapshotReset==='changed','project scope cannot mix');
 check(getJournalPage(next(first,{cursor:'wrong-id'})).snapshotReset==='changed','cursor/offset mismatch rejected');
 for(const key of ['DB_ID','ROOT_ID']){const value=mockProps[key];mockProps[key]='another-synthetic-archive';check(getJournalPage(next(first)).snapshotReset==='changed','archive configuration isolated');mockProps[key]=value;}
 for(const offset of [0,-1,1.5,NaN]){let failed=false;try{getJournalPage(next(first,{snapshotOffset:offset}));}catch{failed=true;}check(failed,'invalid offset');}
 // Relevant mutations invalidate before writing; unrelated reflections do not.
 const invalidated=fn=>{const page=fresh(),before=revision();fn();check(revision()!==before,'relevant mutation advances revision');check(getJournalPage(next(page)).snapshotReset==='changed','old snapshot rejected after mutation');};
 const current=id=>readEntries_(findRows_(mockSheets.Entries,1,id,false))[0];
 const id=fixture.entries[0][0];
 invalidated(()=>setTaskStatus({id,updatedAt:current(id).updatedAt,status:'doing'}));
 invalidated(()=>setEntryTags({id,updatedAt:current(id).updatedAt,tags:'indice,privato'}));
 invalidated(()=>setEntryProjects({id,updatedAt:current(id).updatedAt,projects:'miniconf'}));
 invalidated(()=>locked_(()=>storeTaskSchedule_(id,{date:'2026-10-27',workStart:'',workEnd:'',importance:'urgent'})));
 invalidated(()=>locked_(()=>writeRows_(layout,2,[[id,'700','2026-10-27T12:00:00Z']])));
 invalidated(()=>locked_(()=>append_(taskDocQueue_(true),[[id,'pending','2026-10-27T12:00:00Z','']])));
 let created;
 invalidated(()=>{created=saveJournalPage({month:'2026-10',blocks:[{clientId:'index-new-task-creation',date:'2026-10-27',type:'task',title:'Task nuovo',body:'Corpo nuovo',rich:plainRich_('Corpo nuovo'),status:'open',importance:'normal',position:100}]}).entries[0];});
 invalidated(()=>deleteNote({id:created.id,updatedAt:created.updatedAt}));
 first=fresh();const beforeDay=revision();saveDay({date:'2026-10-27',updatedAt:'',intention:'Riflessione sintetica'});check(revision()===beforeDay&&!getJournalPage(next(first)).snapshotReset,'unrelated Day save does not invalidate');
 const countingProps=PropertiesService.getScriptProperties;let revisionWrites=0;
 PropertiesService.getScriptProperties=()=>({...countingProps(),setProperty(k,v){if(k==='TASK_INDEX_REVISION')revisionWrites++;return countingProps().setProperty(k,v);}});
 try{saveJournalPage({month:'2026-10',blocks:[0,1].map(i=>({clientId:'index-counted-task-'+i,date:'2026-10-28',type:'task',title:'Task contato '+i,body:'corpo',rich:plainRich_('corpo'),position:800+i}))});}finally{PropertiesService.getScriptProperties=countingProps;}
 check(revisionWrites===1,'one revision write per batch, not per row or table');
 // Eviction, altered payloads, malformed manifests and expiry never rebuild a
 // different ordered list behind an old cursor.
 for(const mode of ['manifest','part','payload','manifest-shape','expired']){
  const page=fresh(),key=taskIndexKey_(page.taskSnapshot,'manifest'),manifest=JSON.parse(demoScriptCache.get(key)),part=taskIndexKey_(page.taskSnapshot,0);const savedManifest=demoScriptCache.get(key),savedPart=demoScriptCache.get(part),now=Date.now;
  try{
   if(mode==='manifest')demoScriptCache.delete(key);
   if(mode==='part')for(let i=0;i<manifest.parts.length;i++)demoScriptCache.delete(taskIndexKey_(page.taskSnapshot,i));
   if(mode==='payload')for(let i=0;i<manifest.parts.length;i++){const k=taskIndexKey_(page.taskSnapshot,i);demoScriptCache.set(k,demoScriptCache.get(k).replace('Voce sintetica','Titolo alterato'));}
   if(mode==='manifest-shape'){manifest.parts[0].count++;demoScriptCache.set(key,JSON.stringify(manifest));}
   if(mode==='expired')Date.now=()=>manifest.expiresAt;
   const result=getJournalPage(next(page));check(result.snapshotReset&&result.entries.length===0,'explicit reset for '+mode);
  }finally{Date.now=now;demoScriptCache.set(key,savedManifest);if(savedPart)demoScriptCache.set(part,savedPart);}
 }
 const provider=CacheService.getScriptCache;
 first=fresh();CacheService.getScriptCache=()=>({...provider(),getAll(){throw Error('PRIVATE-CACHE');}});const outage=traceApi({operation:'getJournalPage',traceId,arg:next(first)});check(outage.ok&&outage.value.snapshotReset==='unavailable'&&!JSON.stringify(outage.diagnostics).includes('PRIVATE'),'cache errors sanitized');CacheService.getScriptCache=provider;
 CacheService.getScriptCache=()=>({...provider(),putAll(){throw Error('PRIVATE-WRITE');}});const noCache=fresh();check(!noCache.taskSnapshot&&fresh({cursor:noCache.nextCursor}).entries.length===200,'store failure keeps legacy continuation available');CacheService.getScriptCache=provider;
 // If revision persistence fails, no relevant write is allowed to occur.
 const properties=PropertiesService.getScriptProperties;first=fresh();const beforeFailure=JSON.stringify(mockSheets.Entries.data),beforeRevision=revision();
 PropertiesService.getScriptProperties=()=>({...properties(),setProperty(k,v){if(k==='TASK_INDEX_REVISION')throw Error('PRIVATE-PROPERTIES');return properties().setProperty(k,v);}});
 let failed=false;try{setEntryTags({id,updatedAt:current(id).updatedAt,tags:'non-scritto'});}catch{failed=true;}PropertiesService.getScriptProperties=properties;
 check(failed&&JSON.stringify(mockSheets.Entries.data)===beforeFailure&&revision()===beforeRevision,'failed invalidation stops before mutation');check(!getJournalPage(next(first)).snapshotReset,'unchanged snapshot remains valid');
 // A partial append still invalidates the old snapshot, even when setValues
 // throws after its side effect and append_ never reaches ioInvalidate_.
 first=fresh();const sheet=mockSheets.Entries,range=sheet.getRange,last=sheet.getLastRow(),row=fixture.entries[0].slice();row[0]='partial-index-task-identity';
 sheet.getRange=function(r,c,n=1,m=1){const value=range.call(this,r,c,n,m);if(r===last+1&&c===1){const set=value.setValues;value.setValues=function(rows){set.call(this,rows);throw Error('SIMULATED-PARTIAL');};}return value;};
 try{locked_(()=>append_(sheet,[row]));}catch{}finally{sheet.getRange=range;}
 check(getJournalPage(next(first)).snapshotReset==='changed','partial write invalidates');
 // A writer overlapping the initial scan prevents publication of a snapshot.
 const editor=editorRows_;editorRows_=function(...args){const result=editor(...args);setEntryTags({id,updatedAt:current(id).updatedAt,tags:'cambiato-durante-lettura'});return result;};
 const raced=traceApi({operation:'getJournalPage',traceId,arg:args});editorRows_=editor;check(raced.ok&&!raced.value.taskSnapshot&&raced.diagnostics.taskIndexBuildChanged===1,'race does not publish stale index');
 const lockProvider=LockService.getScriptLock;
 first=fresh();LockService.getScriptLock=()=>({tryLock:()=>false,releaseLock(){throw Error('must not release');}});check(getJournalPage(next(first)).snapshotReset==='busy','busy writer prevents cache read');check(!fresh().taskSnapshot,'busy first request falls back to fresh uncached read');LockService.getScriptLock=lockProvider;
 check(locked_(()=>taskIndexStamp_())===null,'snapshot checks do not release a surrounding application lock');
 // Too much metadata falls back without breaking the original cursor contract.
 const text=sheet.data[1][3];sheet.data[1][3]='🌱'.repeat(50000);const oversized=traceApi({operation:'getJournalPage',traceId,arg:args});sheet.data[1][3]=text;
 check(oversized.ok&&!oversized.value.taskSnapshot&&oversized.diagnostics.taskIndexOversize===1,'oversize snapshot is optional');
}`,ctx);
const parts=vm.runInContext(`[...demoScriptCache].filter(([key])=>key.startsWith('TI1:')&&!key.endsWith(':manifest')).map(([,value])=>value)`,ctx);
assert(parts.length);assert(parts.every(raw=>Buffer.byteLength(raw,'utf8')<=80000));
console.log('Task index: zero-Sheets continuation, exact order/scopes, mutation matrix, unrelated saves, eviction/corruption/expiry, cache/Properties outages, partial writes, races, busy/nested locks and UTF-8 bounds OK');
