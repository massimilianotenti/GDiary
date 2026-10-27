const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const create=(i)=>saveJournalPage({month:'2026-10',blocks:[{clientId:'worker-chunk-note-'+i+'-0001',date:'2026-10-15',type:'note',title:'Voce '+i,body:'Corpo '+i,rich:plainRich_('Corpo '+i),projects:'',position:1000+i}]}).entries[0];
 const entries=Array.from({length:6},(_,i)=>create(i));processTaskDocQueue();
 const edit=(id,text)=>{const current=getEntryDetail({id});return saveNoteText({id,updatedAt:current.updatedAt,body:text,rich:plainRich_(text),originalBody:current.body,originalRich:current.rich}).entries[0];};
 entries.forEach((e,i)=>edit(e.id,'Versione nuova '+i));
 const lockProvider=LockService.getScriptLock,open=DocumentApp.openById,now=Date.now;let held=false,acquisitions=0,releases=0,time=0;
 LockService.getScriptLock=()=>({tryLock(){check(!held,'worker never nests a write lock');held=true;acquisitions++;return true;},waitLock(){check(!held,'foreground not concurrent with Docs write');held=true;acquisitions++;},releaseLock(){check(held,'release owned lock');held=false;releases++;}});
 Date.now=()=>time;DocumentApp.openById=id=>{check(held,'Docs writer keeps global coordination');time+=1000;return open(id);};
 let result;
 try{result=traceApi({operation:'processTaskDocQueue',traceId:'worker-chunk-trace-00001',arg:{}});}finally{Date.now=now;DocumentApp.openById=open;LockService.getScriptLock=lockProvider;}
 check(result.ok&&result.value.processed===5&&result.value.attempted===5&&result.value.pending===1&&result.value.stopReason==='budget','soft budget stops before sixth item');
 check(acquisitions===5&&releases===5&&!held,'one acquisition/release per item');
 check(result.diagnostics.lockHeldMaxMs===1000&&result.diagnostics.lockHeldMs===5000&&result.diagnostics.workerBudgetStops===1,'peak held time differs from total worker occupancy');
 check(processTaskDocQueue().processed===1,'remaining item resumes next pass');
 // A new version queued after ACK of the old one must not be marked done by
 // a later chunk using an old queue snapshot or reattempted in the same pass.
 edit(entries[0].id,'Prima versione');edit(entries[1].id,'Seconda voce');
 const unit=processDocQueueItem_;let between=true,changedId;
 processDocQueueItem_=visited=>{const chunk=unit(visited);if(between&&chunk.processed){between=false;check(!APP_LOCK_DEPTH,'between chunks has no lock');changedId=chunk.attemptedIds[0];edit(changedId,'Modifica tra due voci');}return chunk;};
 let interleaved;try{interleaved=processTaskDocQueue();}finally{processDocQueueItem_=unit;}
 check(interleaved.processed===2&&interleaved.pending===1&&interleaved.stopReason==='deferred','later version stays pending until next invocation');
 check(queuedTask_(changedId)&&docContent_(changedId).body==='Modifica tra due voci','new durable content and queue preserved');
 processTaskDocQueue();check(!queuedTask_(changedId)&&getEntryDetail({id:changedId}).body==='Modifica tra due voci','new version exported on next pass');
 // Another worker can complete remaining work while the first is between locks.
 edit(entries[2].id,'Worker A');edit(entries[3].id,'Worker B');between=true;let other;
 const wrapped=visited=>{const chunk=unit(visited);if(between&&chunk.processed){between=false;processDocQueueItem_=unit;other=processTaskDocQueue();processDocQueueItem_=wrapped;}return chunk;};processDocQueueItem_=wrapped;
 let first;try{first=processTaskDocQueue();}finally{processDocQueueItem_=unit;}
 check(first.processed===1&&other.processed===1&&!queuedTask_(entries[2].id)&&!queuedTask_(entries[3].id),'interleaved workers do not export or acknowledge twice');
 // Busy between chunks stops, retaining already completed progress.
 edit(entries[4].id,'Prima busy');edit(entries[5].id,'Seconda busy');between=true;
 const unavailable=()=>({tryLock:()=>false,waitLock(){throw Error('Unexpected foreground');},releaseLock(){throw Error('Must not release unowned lock');}});
 processDocQueueItem_=visited=>{const chunk=unit(visited);if(between&&chunk.processed){between=false;LockService.getScriptLock=unavailable;}return chunk;};
 let busy;try{busy=processTaskDocQueue();}finally{processDocQueueItem_=unit;LockService.getScriptLock=lockProvider;}
 check(busy.processed===1&&busy.busy&&busy.pending===null&&busy.stopReason==='busy','busy stop preserves prior progress without false pending count');processTaskDocQueue();

 // Deleting a different queued entry between units shifts physical rows; the
 // next unit must use fresh data rather than resurrecting the removed row.
 edit(entries[2].id,'Prima delete');edit(entries[3].id,'Seconda delete');between=true;let deletedId;
 processDocQueueItem_=visited=>{const chunk=unit(visited);if(between&&chunk.processed){between=false;deletedId=[entries[2].id,entries[3].id].find(id=>id!==chunk.attemptedIds[0]);const current=readEntry_(findRows_(mockSheets.Entries,1,deletedId,false)[0]);deleteNote({id:deletedId,updatedAt:current.updatedAt});}return chunk;};
 try{processTaskDocQueue();}finally{processDocQueueItem_=unit;}
 check(!findRows_(mockSheets.Entries,1,deletedId,false).length&&!queuedTask_(deletedId),'interleaved deletion never resurrects queue/entry');
 // A persistent conflict is attempted once, without starving another pending job.
 const conflict=edit(entries[0].id,'Versione app');const reference=ref_(conflict.id),doc=open(reference.docId),section=sectionRich_(reference,doc.getBody());doc.getBody().getChild(section.sectionStart+1).setText('Modifica esterna da conservare');
 edit(entries[1].id,'Altro lavoro');const conflicted=processTaskDocQueue();
 check(conflicted.processed===1&&conflicted.attempted===2&&conflicted.errors.filter(e=>e.id===conflict.id).length===1&&queuedTask_(conflict.id),'conflict attempted only once and other work progresses');
 check(sectionText_(reference).includes('Modifica esterna'),'external content not overwritten');
 // Explicitly retain failed work across unknown queue persistence outcomes.
 const uncertain=create(40),persist=persistDocQueueRows_;persistDocQueueRows_=()=>{throw Error('Queue commit unavailable');};let failed=false;try{processTaskDocQueue();}catch{failed=true;}finally{persistDocQueueRows_=persist;}
 check(failed&&queuedTask_(uncertain.id)&&ref_(uncertain.id)&&sectionText_(ref_(uncertain.id))==='Corpo 40','actual Docs commit without queue ACK remains pending');
 processTaskDocQueue();const recovered=ref_(uncertain.id),text=open(recovered.docId).getBody().getText();check(!queuedTask_(uncertain.id)&&text.split('[BJ:'+uncertain.id+']').length-1===1,'unknown Docs commit recovery does not duplicate its section');

 for(let i=20;i<31;i++)create(i);
 const limited=processTaskDocQueue();check(limited.processed===10&&limited.attempted===10&&limited.stopReason==='limit'&&limited.pending===2,'ten attempts maximum across distinct chunks');

 processTaskDocQueue();edit(entries[1].id,'Scrittura incerta');const waiting=create(50),close=MockDoc.prototype.saveAndClose;let documentOpens=0;
 DocumentApp.openById=id=>{documentOpens++;return open(id);};MockDoc.prototype.saveAndClose=function(){close.call(this);throw Error('Close acknowledgement lost');};
 let uncertainClose;try{uncertainClose=processTaskDocQueue();}finally{MockDoc.prototype.saveAndClose=close;DocumentApp.openById=open;}
 check(uncertainClose.stopReason==='uncertain'&&uncertainClose.processed===0&&uncertainClose.attempted===1&&documentOpens===1,'uncertain Docs close prevents starting the next item');
 check(queuedTask_(entries[1].id)&&queuedTask_(waiting.id),'uncertain and unattempted versions remain durable');
 processTaskDocQueue();check(!queuedTask_(entries[1].id)&&!queuedTask_(waiting.id),'explicit next pass recovers uncertain export');
 console.log('Worker chunks: one item per lock, 5s soft budget, 1s peak vs 5s total simulated hold, resume, newer version between chunks, two workers, busy partial progress, conflicts and uncertain persistence OK');
}`,ctx);
