const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},fails=(fn,m)=>{let failed=false;try{fn();}catch{failed=true;}check(failed,m);};
 const create=(id,title)=>saveJournalPage({month:'2026-10',blocks:[{clientId:id,date:'2026-10-03',type:'note',title,body:'Testo da eliminare 🌱',rich:plainRich_('Testo da eliminare 🌱'),projects:'',position:700}]}).entries[0];
 const entry=create('delete-delta-pending-001','Nota pending');
 addFileLink({entryId:entry.id,title:'Allegato originale',url:'https://drive.google.com/file/d/synthetic-original-0001/view'});
 const originalState=state_,originalRows=rows_;state_=()=>{throw Error('Unexpected full state rebuild');};
 rows_=(sheet,headers)=>{check(!['Days','Weeks','HabitLogs'].includes(sheet.getName()),'no unrelated temporal history');return originalRows(sheet,headers);};
 let result;
 try{
  const before=JSON.stringify(mockSheets.Entries.data);fails(()=>deleteNote({id:entry.id,updatedAt:'stale',context:{incrementalCommon:true}}),'stale deletion rejected');check(before===JSON.stringify(mockSheets.Entries.data),'stale no mutations');
  result=traceApi({operation:'deleteNote',traceId:'delete-delta-trace-00001',arg:{id:entry.id,updatedAt:entry.updatedAt,context:{incrementalCommon:true}}});
  check(result.ok&&result.value.delta&&result.value.commonIncluded===false&&result.value.entries.length===0&&result.value.deletedEntryIds[0]===entry.id&&!result.value.alreadyAbsent,'explicit canonical removal');
  check(!JSON.stringify(result.value).includes(entry.text),'no title/body in deletion response');
  for(const [name,col]of [['Entries',1],['Files',2],['DocRefs',1],['TaskPlans',1],['Previews',1],['TaskDocQueue',1],['DocContent',2],['JournalLayout',1]]){const sheet=db_().getSheetByName(name);if(sheet)check(!findRows_(sheet,col,entry.id,false).length,'removed references '+name);}
  const retried=deleteNote({id:entry.id,updatedAt:entry.updatedAt,context:{incrementalCommon:true}});check(retried.alreadyAbsent&&retried.deletedEntryIds[0]===entry.id,'already absent gives same removal identity');
  for(const p of [null,{}, {id:''},{id:42},{id:'x'.repeat(201)}])fails(()=>deleteNote(p),'invalid identity rejected');
 }finally{state_=originalState;rows_=originalRows;}
 // Consolidated content exercises the original live Drive/Docs protections.
 const protectedEntry=create('delete-delta-protected-01','Nota consolidata');processTaskDocQueue();
 const reference=ref_(protectedEntry.id);check(reference,'consolidated fixture');
 const file=DriveApp.getFileById(reference.docId),parent=file.parent,doc=DocumentApp.openById(reference.docId),body=doc.getBody();
 const args={id:protectedEntry.id,updatedAt:protectedEntry.updatedAt,context:{incrementalCommon:true}},before=JSON.stringify(mockSheets.Entries.data);
 file.parent=null;fails(()=>deleteNote(args),'outside archive rejected');file.parent=parent;check(before===JSON.stringify(mockSheets.Entries.data),'outside no metadata mutation');
 const trash=file.isTrashed;file.isTrashed=()=>true;fails(()=>deleteNote(args),'trashed document rejected');file.isTrashed=trash;
 const children=body.children.slice();body.appendParagraph('[BJ:'+protectedEntry.id+']');fails(()=>deleteNote(args),'duplicate start marker rejected');body.children=children.slice();
 const start=body.children.findIndex(c=>c.getText()==='[BJ:'+protectedEntry.id+']');body.insertParagraph(start+1,'[BJ:foreign-entry]');fails(()=>deleteNote(args),'nested foreign marker rejected');body.children=children.slice();
 const original=state_;state_=()=>{throw Error('No full read after Docs deletion');};let deleted;try{deleted=deleteNote(args);}finally{state_=original;}
 check(deleted.deletedNoteId===protectedEntry.id&&!body.getText().includes('[BJ:'+protectedEntry.id+']'),'valid section removed with canonical ACK');
 check(!file.isTrashed(),'original document not trashed');
 const legacy=create('delete-delta-legacy-001','Legacy');const old=deleteNote({id:legacy.id,updatedAt:legacy.updatedAt});check(old.deletedNoteId===legacy.id&&Array.isArray(old.days)&&!old.deletedEntryIds,'legacy complete contract');
 console.log('Delete delta: pending/consolidated, canonical and already-absent ACK, related-table cleanup, stale/invalid requests, live archive/trash/marker checks, original document retained and legacy fallback OK');
}`,ctx);
