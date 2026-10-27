const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(value,message)=>{if(!value)throw Error(message);},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
 const rejects=(fn,message)=>{let failed=false;try{fn();}catch{failed=true;}check(failed,message);};
 MockItem.prototype.getLastUpdated=function(){return new Date(1000);};
 const saved=[];
 for(let at=0;at<205;at+=25){const blocks=Array.from({length:Math.min(25,205-at)},(_,n)=>{const i=at+n,body=i<4?'x'.repeat(100000):'Descrizione sintetica '+i+' caffè 🌱';return {clientId:'deferred-task-fixture-'+i,date:'2026-07-10',type:'task',title:'Task differito '+i,body,rich:plainRich_(body).map(b=>({...b,runs:b.runs.map(r=>({...r,bold:true}))})),status:i%4?'open':'done',importance:i<4?'emergency':'normal',projects:i%2?'miniconf':'',tags:i%7?'prova':'privato',position:i+1};});saved.push(...saveJournalPage({month:'2026-07',blocks}).entries);}
 const traceId='deferred-task-trace-0001',args={month:'2026-10',taskOnly:true,taskArchive:true,metadataOnly:true};
 const file=DriveApp.getFileById,open=DocumentApp.openById,reader=docContent_,prefetch=docContentsForPage_;
 let meta;
 try{
  DriveApp.getFileById=()=>{throw Error('Metadata must not read Drive');};DocumentApp.openById=()=>{throw Error('Metadata must not open Docs');};docContent_=()=>{throw Error('Metadata must not read contents');};docContentsForPage_=()=>{throw Error('Metadata must not prefetch contents');};
  meta=traceApi({operation:'getJournalPage',traceId,arg:args});
 }finally{DriveApp.getFileById=file;DocumentApp.openById=open;docContent_=reader;docContentsForPage_=prefetch;}
 check(meta.ok&&meta.value.entries.length===200&&meta.value.nextCursor&&meta.value.contentsIncluded===false,'bounded metadata page');
 check(!meta.diagnostics.docsOpenCalls&&!meta.diagnostics.driveCalls&&!meta.diagnostics.docContentCalls&&!meta.diagnostics.contentPayloadCells,'zero body service phases');
 check(meta.value.entries.every(e=>e.contentLoaded===false&&!('body' in e)&&!('rich' in e)&&!('originalBody' in e)),'absence is not an empty canonical body');
 const rest=getJournalPage({...args,cursor:meta.value.nextCursor});check(rest.total===meta.value.total&&!rest.nextCursor,'metadata continuation');
 const all=meta.value.entries.concat(rest.entries);check(new Set(all.map(e=>e.id)).size===all.length,'metadata identities');
 const reference=editorRows_('2026-10',true);attachSchedules_(reference);reference.sort((a,b)=>({emergency:2,urgent:1,normal:0}[b.importance]||0)-({emergency:2,urgent:1,normal:0}[a.importance]||0)||(a.due||'9999').localeCompare(b.due||'9999')||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));equal(all.map(e=>e.id),reference.map(e=>e.id),'metadata order');
 check(getJournalPage({...args,taskArchive:false}).entries.every(e=>e.date.startsWith('2026-10')),'month task scope');
 const scoped=getJournalPage({...args,project:'miniconf'});check(scoped.entries.every(e=>e.projects.split(',').includes('miniconf')),'project scope');
 rejects(()=>getJournalPage({month:'2026-10',metadataOnly:true}),'notes cannot use metadata Task route');
 // Loading a bounded selection preserves durable pending bodies and formatting.
 const small=saved.slice(20,25),items=small.map(e=>({id:e.id,updatedAt:e.updatedAt}));
 const before=JSON.stringify(Object.fromEntries(Object.entries(mockSheets).map(([name,s])=>[name,s.data])));
 const content=traceApi({operation:'getJournalContents',traceId,arg:{items}});check(content.ok&&!content.value.errors.length&&content.value.entries.length===5,'content RPC');
 content.value.entries.forEach((e,i)=>{check(e.body===small[i].body&&e.contentLoaded&&e.docPending,'pending content canonical');equal(e.rich,small[i].rich,'pending formatting');});
 check(!content.diagnostics.docsOpenCalls&&!content.diagnostics.driveCalls,'pending bypasses Docs');
 check(before===JSON.stringify(Object.fromEntries(Object.entries(mockSheets).map(([name,s])=>[name,s.data]))),'read APIs never mutate sheets');
 const large=getJournalContents({items:saved.slice(0,4).map(e=>({id:e.id,updatedAt:e.updatedAt}))});check(large.entries.length>0&&large.entries.length<4&&large.remainingIds.length===4-large.entries.length,'content budget reports remaining identities');
 const remainder=getJournalContents({items:large.remainingIds.map(id=>({id,updatedAt:saved.find(e=>e.id===id).updatedAt}))});check(large.entries.length+remainder.entries.length===4,'budget continuation loses no body');
 const mixed=getJournalContents({items:[items[0],{...items[1],updatedAt:'obsolete'},{id:'missing-task-identity',updatedAt:'obsolete'}]});check(mixed.entries.length===1&&mixed.errors.length===2&&mixed.remainingIds.length===0,'stale/missing errors localized');
 rejects(()=>getJournalContents({items:[]}), 'empty batch rejected');rejects(()=>getJournalContents({items:Array(26).fill(items[0])}),'oversize batch rejected');rejects(()=>getJournalContents({items:[items[0],items[0]]}),'duplicates rejected');rejects(()=>getJournalContents({items:[{id:items[0].id}]}),'unversioned read rejected');
 // A concurrent write after the body was read cannot be merged into an older baseline.
 const shared=journalReadContents_;journalReadContents_=function(candidates,p){const value=shared(candidates,p);const row=findRows_(mockSheets.Entries,1,items[0].id,false)[0];mockSheets.Entries.data[row-1][8]='2026-10-27T12:00:00.000Z';return value;};
 const race=getJournalContents({items:[items[0]]});journalReadContents_=shared;check(race.entries.length===0&&race.errors.length===1,'final version check catches concurrent commit');
 const metadata=all.find(e=>e.id===items[2].id);rejects(()=>saveJournalPage({month:metadata.date.slice(0,7),blocks:[{...metadata,clientId:metadata.id,title:metadata.text,body:'',rich:plainRich_('') }]}),'unloaded metadata cannot overwrite body');
 // The shared reader retains revision checks, external Docs edits and archive boundaries.
 const existing=getJournalPage({month:'2026-10'}).entries.find(e=>!e.editorError&&ref_(e.id)&&e.type==='task');
 check(existing,'synchronized task fixture is present');
 if(existing){const item={id:existing.id,updatedAt:existing.updatedAt},reference=ref_(existing.id),docFile=DriveApp.getFileById(reference.docId),parent=docFile.parent;
  const cold=getJournalContents({items:[item]}),warm=getJournalContents({items:[item]});equal(cold.entries.map(e=>[e.body,e.rich]),warm.entries.map(e=>[e.body,e.rich]),'cold/warm body equivalence');
  docFile.parent=null;const moved=getJournalContents({items:[item]});check(!moved.entries.length&&moved.errors.length===1,'warm cache cannot bypass archive membership');docFile.parent=parent;
 }
}`,ctx);
console.log('Task metadata: 200-row body-free pages, scopes/order, bounded versioned hydration, pending/rich preservation, response budget, errors/races, unsafe save guard and live Drive checks OK');
