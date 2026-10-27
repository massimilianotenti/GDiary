const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const created=saveJournalPage({month:'2026-10',blocks:[{clientId:'search-concurrent-001',date:'2026-10-15',type:'note',title:'Titolo neutro ricerca',body:'needle_old',rich:plainRich_('needle_old'),projects:'',position:500}]}).entries[0];processTaskDocQueue();
 const reference=ref_(created.id);check(reference,'consolidated fixture');
 const originalLock=LockService.getScriptLock,open=DocumentApp.openById,read=readSheetValues_;let held=false,opens=0,hook=null;
 LockService.getScriptLock=()=>({waitLock(){check(!held,'writer can acquire while search reads Docs');held=true;},tryLock(){if(held)return false;held=true;return true;},releaseLock(){check(held,'owned release');held=false;}});
 readSheetValues_=range=>{check(!held||APP_LOCK_DEPTH>0,'search Sheets payload read outside probe lock');return read(range);};
 DocumentApp.openById=id=>{check(!held,'no lock during Docs open');opens++;if(hook){const fn=hook;hook=null;fn(id);}return open(id);};
 const query=(q='needle_old',extra={})=>searchArchive({query:q,cursor:0,...extra});
 try{
  const traced=traceApi({operation:'searchArchive',traceId:'search-concurrency-00001',arg:{query:'needle_old',cursor:0}});
  check(traced.ok&&traced.value.entries.some(e=>e.id===created.id)&&opens>0,'ordinary body search');
  check(!traced.diagnostics.lockAttempts&&!traced.diagnostics.flushCalls&&traced.diagnostics.searchLockAttempts===3,'only three nonblocking short probes, no flush');
  const stamp=traced.value.searchVersion;
  // Another writer commits during Docs open; the complete batch is discarded.
  hook=()=>setEntryTags({id:created.id,updatedAt:readEntry_(findRows_(mockSheets.Entries,1,created.id,false)[0]).updatedAt,tags:'privato'});
  const changed=query();check(changed.searchReset==='changed'&&!changed.entries.length&&changed.done,'concurrent metadata commit never returns mixed results');
  check(query('needle_old',{cursor:0,searchVersion:stamp}).searchReset==='changed','old continuation/version rejected');
  const current=getJournalPage({month:'2026-10'}).entries.find(e=>e.id===created.id);
  saveJournalPage({month:'2026-10',blocks:[{...current,clientId:current.id,title:current.text,body:'needle_new',rich:plainRich_('needle_new'),originalBody:current.body,originalRich:current.rich}]});
  check(query('needle_new').entries.some(e=>e.id===created.id)&&!query('needle_old').entries.some(e=>e.id===created.id),'pending dominates old Docs');
  hook=()=>{const wrapped=DocumentApp.openById;DocumentApp.openById=open;try{processTaskDocQueue();}finally{DocumentApp.openById=wrapped;}};check(query('needle_new').searchReset==='changed','worker commit during search resets batch');
  check(!queuedTask_(created.id)&&query('needle_new').entries.some(e=>e.id===created.id),'fresh retry sees consolidated body');
  const file=DriveApp.getFileById(reference.docId),parent=file.parent;
  // External Docs modification/move during body read is a per-document partial
  // failure, never a body hit from the unverified source.
  DocumentApp.openById=id=>{check(!held,'no lock during direct Docs revision race');const doc=open(id);return id===reference.docId?{getBody:()=>({getText:()=>{const text=doc.getBody().getText();file.modifiedAt=(file.modifiedAt||0)+1;return text;}})}:doc;};
  const revised=query('needle_new');check(revised.partial&&!revised.entries.some(e=>e.id===created.id),'changed revision omitted and partial');
  DocumentApp.openById=id=>{const doc=open(id);return id===reference.docId?{getBody:()=>({getText:()=>{const text=doc.getBody().getText();file.parent=null;return text;}})}:doc;};
  const moved=query('needle_new');file.parent=parent;check(moved.partial&&!moved.entries.some(e=>e.id===created.id),'post-read archive membership rechecked');
  DocumentApp.openById=id=>{check(!held,'remote call unlocked');if(hook){const fn=hook;hook=null;fn();}return open(id);};
  // Deletion legitimately opens Docs under its own lock; use original opener
  // only for that writer, then restore the search assertion.
  hook=()=>{const wrapped=DocumentApp.openById;DocumentApp.openById=open;try{deleteNote({id:created.id,updatedAt:readEntry_(findRows_(mockSheets.Entries,1,created.id,false)[0]).updatedAt});}finally{DocumentApp.openById=wrapped;}};
  check(query('needle_new').searchReset==='changed','concurrent deletion cannot return deleted entry');
  held=true;const busy=query();check(busy.searchReset==='busy'&&!busy.entries.length&&held,'busy writer is not waited on or released');held=false;
  APP_LOCK_DEPTH=1;check(query().searchReset==='busy','nested lock is never released by probe');APP_LOCK_DEPTH=0;
 }finally{DocumentApp.openById=open;readSheetValues_=read;LockService.getScriptLock=originalLock;APP_LOCK_DEPTH=0;}
 // Every relevant table invalidates before its first mutation, once per request.
 const tables=[['Entries',ENTRY_HEADERS],['DocRefs',REF_HEADERS],['Files',FILE_HEADERS],['Projects',PROJECT_HEADERS],['TaskDocQueue',TASK_DOC_HEADERS],['DocContent',DOC_CONTENT_HEADERS]];
 for(const [name,headers]of tables){const sheet=db_().getSheetByName(name),before=sheet.data.map(r=>r.slice()),revision=mockProps.SEARCH_REVISION;try{locked_(()=>append_(sheet,[headers.map(()=> '')]));check(mockProps.SEARCH_REVISION!==revision,'revision invalidates '+name);}finally{sheet.data=before;}}
 const properties=PropertiesService.getScriptProperties;let writes=0;
 PropertiesService.getScriptProperties=()=>({...properties(),setProperty(k,v){if(k==='SEARCH_REVISION')writes++;return properties().setProperty(k,v);}});
 try{locked_(()=>{searchTouch_(mockSheets.Entries);searchTouch_(mockSheets.Files);searchTouch_(mockSheets.DocRefs);});}finally{PropertiesService.getScriptProperties=properties;}
 check(writes===1,'one search revision write per request');
 const before=JSON.stringify(mockSheets.Files.data);PropertiesService.getScriptProperties=()=>({...properties(),setProperty(k,v){if(k==='SEARCH_REVISION')throw Error('PRIVATE-PROPERTY');return properties().setProperty(k,v);}});
 let failed=false;try{locked_(()=>append_(mockSheets.Files,[FILE_HEADERS.map(()=> '')]));}catch{failed=true;}finally{PropertiesService.getScriptProperties=properties;}
 check(failed&&before===JSON.stringify(mockSheets.Files.data),'revision failure stops before append');

 const multi=[];for(let i=1;i<=7;i++)multi.push(saveJournalPage({month:'2026-'+String(i).padStart(2,'0'),blocks:[{clientId:'search-multipage-'+i+'-0001',date:'2026-'+String(i).padStart(2,'0')+'-15',type:'note',title:'Titolo neutro '+i,body:'multi_needle',rich:plainRich_('multi_needle'),projects:'',position:900+i}]}).entries[0]);
 processTaskDocQueue();let cursor=0,version='',ids=new Set(),pages=0;
 do{const page=traceApi({operation:'searchArchive',traceId:'search-multipage-trace-001',arg:{query:'multi_needle',cursor,searchVersion:version||undefined}});check(page.ok&&!page.value.searchReset,'stable continuation');check((page.diagnostics.docsOpenCalls||0)<=5,'maximum five Docs per batch');page.value.entries.forEach(e=>ids.add(e.id));cursor=page.value.nextCursor;version=page.value.searchVersion;pages++;if(page.value.done)break;check(pages<20,'pagination progresses');}while(true);
 check(pages>1&&multi.every(e=>ids.has(e.id)),'complete stable multi-page body search');
 const first=searchArchive({query:'multi_needle',cursor:0});check(searchArchive({query:'different-query',cursor:first.nextCursor,searchVersion:first.searchVersion}).searchReset==='changed','query scope bound to version');
 check(searchArchive({query:'multi_needle',cursor:first.nextCursor}).searchReset==='changed','unversioned continuation requests explicit restart');
 console.log('Search concurrency: unlocked Docs/Sheets, short busy/nested probes/no flush, concurrent edit/delete/worker, pending precedence, Docs revision/move, relevant mutation matrix, one revision write and property failure before mutation OK');
}`,ctx);
