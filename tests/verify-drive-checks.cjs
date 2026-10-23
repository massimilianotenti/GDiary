const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const originalRoot=root_;let reads=0;const counts=new Map();
 function item(id,parents=[]){return {id,parents,getId(){return this.id;},getParents(){reads++;counts.set(id,(counts.get(id)||0)+1);let i=0;return {hasNext:()=>i<this.parents.length,next:()=>this.parents[i++]};}};}
 const root=item('root'),year=item('year',[root]),folder=item('folder',[year]),a=item('a',[folder]),b=item('b',[folder]);
 root_=()=>root;ioReset_();inside_(a);check(reads===3,'first full path');inside_(b);check(reads===4,'shared ancestry traversed once');check(IO.inside.has('folder')&&IO.inside.has('year'),'successful ancestors cached');inside_(a);check(reads===4,'same item memoized');
 // New requests must observe moved folders; no persistent ancestry cache.
 folder.parents=[];ioReset_();let failed=false;try{inside_(a);}catch(e){failed=true;}check(failed,'moved folder rejected after reset');check(IO.inside.size===0,'failed path not cached');folder.parents=[year];
 // The failed side of a multi-parent graph must never be marked as trusted.
 const outside=item('outside'),branch=item('branch',[outside]),multi=item('multi',[folder,branch]);ioReset_();inside_(multi);check(!IO.inside.has('branch')&&!IO.inside.has('outside'),'unrelated branch not trusted');failed=false;try{inside_(branch);}catch(e){failed=true;}check(failed,'outside branch remains rejected');
 const c=item('cycle-c'),d=item('cycle-d',[c]);c.parents=[d];ioReset_();failed=false;const before=reads;try{inside_(c);}catch(e){failed=true;}check(failed&&reads-before===2,'cycles terminate');
 const shared=item('shared',[year]),diamond=item('diamond',[item('left',[shared]),item('right',[shared])]);ioReset_();inside_(diamond);check(IO.inside.has('shared'),'diamond reaches root');
 const inaccessible=item('inaccessible');inaccessible.getParents=()=>{throw Error('SECRET-PARENT');};ioReset_();failed=false;try{inside_(inaccessible);}catch(e){failed=true;}check(failed&&IO.inside.size===0,'parent service errors do not grant access');
 // Detailed tracing must be aggregate-only and record memoization.
 ioReset_();ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};inside_(a);inside_(b);const m=ACTIVE_TRACE.metrics;check(m.driveInsideCalls===2&&m.driveParentsCalls===4&&m.driveInsideNodes===4&&m.driveParentEdges===4&&m.driveInsideMemoHits===1,'aggregate traversal metrics');check(!JSON.stringify(m).includes('folder'),'no IDs in diagnostic metrics');ACTIVE_TRACE=null;
 root_=originalRoot;const getFolder=DriveApp.getFolderById;let rootReads=0,trash=false;DriveApp.getFolderById=()=>{rootReads++;return {getId:()=> 'root',isTrashed:()=>trash};};ioReset_();root_();root_();check(rootReads===1,'root acquired once per request');ioReset_();trash=true;failed=false;try{root_();}catch(e){failed=true;}check(failed&&!IO.root,'trashed root rejected');DriveApp.getFolderById=getFolder;

 // Existing section cache must not bypass live archive/trash checks.
 MockItem.prototype.getLastUpdated=function(){return new Date(1000);};
 const initial=getJournalPage({month:'2026-10'}),entry=initial.entries.find(e=>ref_(e.id)),reference=ref_(entry.id),file=DriveApp.getFileById(reference.docId),parent=file.parent;
 getJournalPage({month:'2026-10'});file.parent=null;
 const moved=getJournalPage({month:'2026-10'});check(moved.entries.find(e=>e.id===entry.id).editorError&&moved.entries.find(e=>e.id===entry.id).body==='','warm cache cannot expose moved document');
 file.parent=parent;file.trashed=true;const trashed=getJournalPage({month:'2026-10'});check(trashed.entries.find(e=>e.id===entry.id).editorError,'warm cache cannot expose trashed document');
 file.trashed=false;check(!getJournalPage({month:'2026-10'}).entries.find(e=>e.id===entry.id).editorError,'restored document readable');
}`,ctx);
console.log('Drive checks: shared ancestry, request reset/moves, outside branches, cycles, diamonds, errors, root/trash and private aggregate metrics OK');
