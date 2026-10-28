const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const source=fs.readFileSync(path.resolve(__dirname,'../Code.gs'),'utf8');
const scope={archiveId:'synthetic-commit-archive',principalId:'synthetic-commit-principal-a',epoch:'synthetic-commit-epoch'};
const other={...scope,principalId:'synthetic-commit-principal-b'};
const clone=value=>JSON.parse(JSON.stringify(value));
function engine(adapter,owner=scope){const context=vm.createContext({});vm.runInContext(source,context);return context.syncCommitProtocol_(adapter.store,owner);}
const cursor=(sequence=0,owner=scope)=>({format:'sync-cursor/v1',...owner,sequence});
const change=(collection,id,data,baseVersion=null)=>({collection,id,baseVersion,action:'upsert',data});
const operation=(operationId='synthetic-operation-create')=>({operationId,changes:[change('entries','note-a',{text:'Nota inventata 🌱',date:'2026-10-28'}),change('contents','note-a',{body:'Caffè e Unicode 🌱',rich:[{kind:'p',runs:[{text:'Caffè e Unicode 🌱',bold:true}]}]}),change('taskPlans','note-a',{date:'2026-10-28',importance:'urgent'})]});
const value=result=>{assert(result.ok,JSON.stringify(result));return clone(result.value);};
let testedFaults=0;
// Crash before AND after every durable unit, then discard the entire process.
const baseline=createCommitStore(scope),first=engine(baseline),request=operation();
const expected=value(first.execute(request));assert.equal(expected.status,'committed');assert.equal(expected.sequence,1);
const units=baseline.metrics().writes;assert.equal(units,7);assert.deepEqual(baseline.metrics().labels,['prepare','entity:entries:note-a','entity:contents:note-a','entity:taskPlans:note-a','commit:1','receipt:synthetic-operation-create','publish']);
for(const phase of ['before','after'])for(let at=1;at<=units;at++){
 const adapter=createCommitStore(scope);adapter.fault(at,phase);const crashed=engine(adapter).execute(request);assert(!crashed.ok);assert(!JSON.stringify(crashed).includes('PRIVATE'));
 const durable=adapter.snapshot();assert(durable.head.committedThrough===0||at===units&&phase==='after');
 const restarted=createCommitStore(scope,durable),recovered=engine(restarted);
 const feed=value(recovered.changes({cursor:cursor(),limit:5}));
 assert.equal(feed.commits.length,at===1&&phase==='before'?0:1,'read-side recovery publishes no partial commit or gap');
 assert.deepEqual(value(recovered.execute(request)),expected,'retry returns identical receipt after crash');
 const complete=value(recovered.changes({cursor:cursor(),limit:5}));assert.equal(complete.commits.length,1);assert.equal(complete.commits[0].changes.length,3);assert.equal(complete.cursor.sequence,1);assert(!complete.hasMore);
 assert.equal(value(recovered.read('contents','note-a')).entity.data.rich[0].runs[0].bold,true);
 const writes=restarted.metrics().writes;assert.deepEqual(value(engine(restarted).execute(request)),expected);assert.equal(restarted.metrics().writes,writes,'dedup retry makes no durable writes');
 assert.equal(restarted.snapshot().commits.length,1);testedFaults++;
}
// Stable request fingerprint across JSON key order, but not across edits to an
// already-sent operation. An operation ID never becomes a mutable draft ID.
const adapter=createCommitStore(scope),protocol=engine(adapter);value(protocol.execute(request));const writes=adapter.metrics().writes;
const reordered={changes:request.changes.map(item=>({data:item.data,action:item.action,baseVersion:item.baseVersion,id:item.id,collection:item.collection})),operationId:request.operationId};assert.deepEqual(value(protocol.execute(reordered)),expected);assert.equal(adapter.metrics().writes,writes);
const changed=clone(request);changed.changes[0].data.text='Payload cambiato';assert.equal(protocol.execute(changed).error,'OperationMismatch');assert.equal(adapter.metrics().writes,writes);
const lostReceipt=baseline.mutate(state=>{state.receipts=[];});assert.deepEqual(value(engine(lostReceipt).execute(request)),expected);assert.deepEqual(lostReceipt.metrics().labels,['receipt:synthetic-operation-create'],'missing receipt repaired from retained commit without replay');
const lostReceiptMismatch=baseline.mutate(state=>{state.receipts=[];});assert.equal(engine(lostReceiptMismatch).execute(changed).error,'OperationMismatch');assert.equal(lostReceiptMismatch.metrics().writes,0);
// Whole-operation conflict; stable conflict receipt even after later changes.
const conflict={operationId:'synthetic-operation-conflict',changes:[change('entries','note-a',{text:'Obsoleto'},null),change('goals','new-goal',{title:'Non deve essere scritto'},null)]};
const conflictReply=value(protocol.execute(conflict));assert.equal(conflictReply.status,'conflict');assert.equal(conflictReply.conflicts[0].actualVersion,'commit-1');assert.equal(value(protocol.read('goals','new-goal')).entity,null);assert.equal(value(protocol.changes({cursor:cursor(),limit:5})).highWater,1);
value(protocol.execute({operationId:'synthetic-operation-update',changes:[change('entries','note-a',{text:'Aggiornata'},'commit-1')]}));assert.deepEqual(value(protocol.execute(conflict)),conflictReply);
for(const phase of ['before','after']){
 const fixture=createCommitStore(scope,baseline.snapshot());fixture.fault(1,phase);assert(!engine(fixture).execute(conflict).ok);const reboot=createCommitStore(scope,fixture.snapshot());assert.equal(value(engine(reboot).execute(conflict)).status,'conflict');assert.equal(reboot.snapshot().commits.length,1);testedFaults++;
}
// Recovery of an older owner's plan must keep its receipt separate. The same
// operation ID used by another authorized principal does not read that receipt.
const ownerFixture=createCommitStore(scope);ownerFixture.fault(3,'after');assert(!engine(ownerFixture).execute(request).ok);
const shared=createCommitStore(scope,ownerFixture.snapshot());value(engine(shared,other).recover());assert.deepEqual(value(engine(shared).execute(request)),expected);
const otherReply=value(engine(shared,other).execute(request));assert.equal(otherReply.status,'conflict');assert.equal(shared.snapshot().receipts.length,2);
assert.equal(engine(shared,other).changes({cursor:cursor(),limit:1}).error,'ScopeChanged');
assert.equal(engine(shared,{...scope,archiveId:'synthetic-wrong-archive'}).recover().error,'ProtocolCorrupt');
assert.equal(engine(shared,{...scope,epoch:'synthetic-wrong-epoch'}).recover().error,'ProtocolCorrupt');
// Feed snapshots are immutable after-images, not references to today's rows.
const feedStore=createCommitStore(scope),feedProtocol=engine(feedStore);let version=null;
for(let i=1;i<=7;i++){const response=value(feedProtocol.execute({operationId:'synthetic-feed-operation-'+i,changes:[change('entries','shared-note',{text:'Versione '+i},version)]}));version=response.versions[0].version;}
let feed=value(feedProtocol.changes({cursor:cursor(),limit:2}));assert.equal(feed.commits.length,2);assert.equal(feed.commits[0].changes[0].data.text,'Versione 1');assert.equal(feed.cursor.sequence,2);assert(feed.hasMore);assert.equal(feed.highWater,7);assert(!JSON.stringify(feed.commits).includes('principalId'));
feed=value(feedProtocol.changes({cursor:feed.cursor,limit:5}));assert.equal(feed.commits.length,5);assert.equal(feed.cursor.sequence,7);assert(!feed.hasMore);
const deletion={operationId:'synthetic-delete-operation',changes:[{collection:'entries',id:'shared-note',action:'delete',baseVersion:version}]};const deleted=value(feedProtocol.execute(deletion));assert.equal(deleted.versions[0].deleted,true);assert.equal(value(feedProtocol.read('entries','shared-note')).entity.data,null);
const tombstones=value(feedProtocol.changes({cursor:cursor(7),limit:1}));assert(tombstones.commits[0].changes[0].deleted);assert.equal(tombstones.cursor.sequence,8);
assert.equal(value(feedProtocol.execute({operationId:'synthetic-resurrection-denied',changes:[change('entries','shared-note',{text:'Non creare senza baseline'},null)]})).status,'conflict');assert.deepEqual(value(feedProtocol.execute(deletion)),deleted);
assert.equal(value(feedProtocol.execute({operationId:'synthetic-explicit-recreation',changes:[change('entries','shared-note',{text:'Ricreazione esplicita'},'commit-8')]})).status,'committed');
// Whole-commit pagination respects a response budget as well as commit count.
const large=createCommitStore(scope),largeProtocol=engine(large);
for(let i=0;i<5;i++)value(largeProtocol.execute({operationId:'synthetic-large-operation-'+i,changes:[change('contents','large-'+i,{body:'x'.repeat(30000)},null)]}));
const limited=value(largeProtocol.changes({cursor:cursor(),limit:5}));assert.equal(limited.commits.length,4);assert.equal(limited.cursor.sequence,4);assert(limited.hasMore);assert(JSON.stringify(limited).length<=131072);assert.equal(value(largeProtocol.changes({cursor:limited.cursor,limit:5})).commits.length,1);
// All arguments are validated before preparing any new mutation.
for(const invalid of [null,{operationId:'short',changes:[]},{...request,unknown:true},{...request,changes:[...request.changes,request.changes[0]]},{...request,changes:Array(26).fill(request.changes[0])},{operationId:'synthetic-invalid-collection',changes:[change('Registry','arbitrary',{x:1})]},{operationId:'synthetic-invalid-payload',changes:[change('entries','bad',{x:undefined})]},{operationId:'synthetic-too-large-payload',changes:[change('entries','bad',{body:'x'.repeat(33000)})]}]){const isolated=createCommitStore(scope);assert(!engine(isolated).execute(invalid).ok);assert.equal(isolated.metrics().writes,0);}
for(const input of [{cursor:cursor(),limit:0},{cursor:cursor(),limit:6},{cursor:cursor(999),limit:1},{cursor:{...cursor(),epoch:'synthetic-another-epoch'},limit:1}])assert(!protocol.changes(input).ok);
// Corrupt or externally modified state blocks publication instead of choosing
// a winner by timestamp or overwriting a variant.
const interrupted=createCommitStore(scope);interrupted.fault(3,'before');assert(!engine(interrupted).execute(request).ok);
const beforeCorrupt=interrupted.snapshot();const tampered=createCommitStore(scope,clone(beforeCorrupt));const modified=tampered.mutate(state=>{state.head.pending.request.changes[0].data.text='Manomesso';});assert.equal(engine(modified).recover().error,'ProtocolCorrupt');assert.equal(modified.metrics().writes,0);
const originalPending=createCommitStore(scope,beforeCorrupt);assert.equal(engine(originalPending).execute(changed).error,'OperationMismatch');assert.equal(originalPending.snapshot().head.committedThrough,1);assert.equal(value(engine(originalPending).read('entries','note-a')).entity.data.text,request.changes[0].data.text,'ID misuse cannot mutate or cancel a previously prepared operation');
const divergent=interrupted.mutate(state=>{const key=JSON.stringify(['contents','note-a']);state.entities.push([key,{archive:{archiveId:scope.archiveId,epoch:scope.epoch},collection:'contents',id:'note-a',sequence:1,version:'commit-1',deleted:false,data:{body:'Variante esterna'}}]);});assert.equal(engine(divergent).recover().error,'CommitBlocked');assert.equal(divergent.metrics().writes,0);assert.equal(divergent.snapshot().head.committedThrough,0);assert(!engine(divergent).changes({cursor:cursor(),limit:5}).ok);
const brokenHead=baseline.mutate(state=>{state.head.committedThrough=2;});assert.equal(engine(brokenHead).recover().error,'ProtocolCorrupt');
const brokenCommit=baseline.mutate(state=>{state.commits[0][1].changes[0].data.text='Alterata';});assert.equal(engine(brokenCommit).changes({cursor:cursor(),limit:5}).error,'ProtocolCorrupt');assert.equal(engine(brokenCommit).execute(request).error,'ProtocolCorrupt');
const missing=createCommitStore(scope,{head:null,entities:[],commits:[],receipts:[]});assert.equal(engine(missing).execute(request).error,'ProtocolUnavailable');assert.equal(missing.metrics().writes,0);
const exhausted=createCommitStore(scope);const full=exhausted.mutate(state=>{state.head=seal({format:'sync-head/v1',archive:{archiveId:scope.archiveId,epoch:scope.epoch},committedThrough:Number.MAX_SAFE_INTEGER-1,pending:null});});assert.equal(engine(full).execute(request).error,'ProtocolUnavailable');assert.equal(full.metrics().writes,0);
// Store adapter supplies the shared lock; a competing caller cannot enter.
const busy=createCommitStore(scope),busyEngine=engine(busy);const blocked=busy.store.withLock(()=>busyEngine.execute(request));assert.equal(blocked.error,'BusyError');assert.equal(busy.metrics().writes,0);
const concurrent=createCommitStore(scope),clientA=engine(concurrent),clientB=engine(concurrent);value(clientA.execute(request));assert.equal(value(clientA.execute({operationId:'synthetic-concurrent-a',changes:[change('entries','note-a',{text:'Client A'},'commit-1')]})).status,'committed');assert.equal(value(clientB.execute({operationId:'synthetic-concurrent-b',changes:[change('entries','note-a',{text:'Client B'},'commit-1')]})).status,'conflict');assert.equal(value(clientB.read('entries','note-a')).entity.data.text,'Client A');
// Detect a torn unit or stale read-back as an error rather than an ACK. A torn
// prepared head requires adapter repair; the kernel never erases it itself.
const torn=createCommitStore(scope),writeHead=torn.store.writeHead;torn.store.writeHead=record=>writeHead({...record,checksum:'0'.repeat(64)});assert.equal(engine(torn).execute(request).error,'ProtocolCorrupt');assert.equal(torn.snapshot().entities.length,0);assert.equal(engine(createCommitStore(scope,torn.snapshot())).recover().error,'ProtocolCorrupt');
const unavailableReadback=createCommitStore(scope),readHead=unavailableReadback.store.readHead;let reads=0;unavailableReadback.store.readHead=()=>{if(++reads===2)throw Error('PRIVATE read-after-write unavailable');return readHead();};assert.equal(engine(unavailableReadback).execute(request).error,'StorageError');const readbackRetry=createCommitStore(scope,unavailableReadback.snapshot());assert.deepEqual(value(engine(readbackRetry).execute(request)),expected);
console.log('Recoverable commit kernel: '+testedFaults+' before/after crash cases with fresh process, stable receipts/conflicts, shared sequence/principal isolation, immutable whole-commit feed/tombstones, size limits, corruption/divergence barriers and no Google adapter or production writes OK');
