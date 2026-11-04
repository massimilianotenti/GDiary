const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-log-archive',principalId:'synthetic-log-principal',epoch:'synthetic-log-epoch'};
const archive={archiveId:scope.archiveId,epoch:scope.epoch},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
function writer(fixture){return context().syncHabitLogWriter_(fixture.store,scope);}
function value(result){assert(result.ok,JSON.stringify(result));return copy(result.value);}
const steps=[{id:'synthetic-step-a',title:'  Caffè 🌱  '},{id:'synthetic-step-b',title:'=Una pratica\nSeconda riga'}];
const log={key:'synthetic-habit-a|2026-10-28',habitId:'synthetic-habit-a',date:'2026-10-28',status:'pending',checklist:JSON.stringify({steps,checked:['synthetic-step-a']})};
// Preserve text byte-for-byte, including formula-like text and whitespace.
const request={operationId:'synthetic-log-create',baseVersion:null,log};
const fixture=createCommitStore(scope),service=writer(fixture),ack=value(service.save(request));
assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.deepEqual(ack.scope,scope);
let read=value(service.read(log.key));assert.equal(read.version,'commit-1');assert.deepEqual(JSON.parse(read.log.checklist),JSON.parse(log.checklist));assert.equal(read.cursor.sequence,1);
assert.deepEqual(value(service.read('synthetic-habit-b|2026-10-28')).log,null);
const writes=fixture.metrics().writes;assert.deepEqual(value(service.save(request)),ack);assert.equal(fixture.metrics().writes,writes);
// Checklist object key order is canonical; array order and step identities persist.
const reordered={...request,log:{...log,checklist:JSON.stringify({checked:['synthetic-step-a'],steps:steps.map(({id,title})=>({title,id}))})}};
assert.deepEqual(value(service.save(reordered)),ack);
const mutable=service.save(request);mutable.value.scope.archiveId='tampered';assert.deepEqual(value(service.save(request)).scope,scope);
read.log.status='skipped';assert.equal(value(service.read(log.key)).log.status,'pending');
const changed={...request,log:{...log,status:'skipped'}};assert.equal(service.save(changed).error,'OperationMismatch');
const update={operationId:'synthetic-log-update',baseVersion:'commit-1',log:{...log,status:'done',checklist:JSON.stringify({steps,checked:steps.map(s=>s.id)})}};
const updated=value(service.save(update));assert.equal(updated.sequence,2);assert.equal(value(service.read(log.key)).log.status,'done');
const stale={...update,operationId:'synthetic-log-stale',log:{...log,status:'skipped'}};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.equal(conflict.conflicts[0].actualVersion,'commit-2');
assert.deepEqual(value(service.save(request)),ack,'original ACK survives later edit');
value(service.save({...update,operationId:'synthetic-log-later',baseVersion:'commit-2'}));assert.deepEqual(value(service.save(stale)),conflict);
const partial=copy(request);delete partial.log.checklist;
const unknown=copy(request);unknown.log.row=2;
const badChecklist=checklist=>({...request,log:{...log,checklist:JSON.stringify(checklist)}});
const invalid=[partial,unknown,{...request,context:{archiveId:'untrusted'}},{...request,baseVersion:''},{...request,operationId:'short'},
 {...request,log:{...log,date:'2026-02-30'}},{...request,log:{...log,habitId:'different'}},{...request,log:{...log,status:'done'}},
 {...request,log:{...log,status:'invalid'}},{...request,log:{...log,checklist:''}},{...request,log:{...log,checklist:null}},
 badChecklist({steps,checked:['unknown']}),badChecklist({steps,checked:['synthetic-step-a','synthetic-step-a']}),
 badChecklist({steps:[steps[0],steps[0]],checked:[]}),badChecklist({steps:[{...steps[0],color:'red'}],checked:[]}),
 badChecklist({steps:[{id:'',title:'Title'}],checked:[]}),badChecklist({steps:[{id:'id',title:' '}],checked:[]}),
 badChecklist({steps:[{id:'id',title:'x'.repeat(501)}],checked:[]}),badChecklist({steps:Array.from({length:31},(_,i)=>({id:'s'+i,title:'Title'})),checked:[]}),
 badChecklist({steps,checked:[1]}),badChecklist({steps,checked:[],extra:true}),badChecklist({steps:[],checked:['synthetic-step-a']})];
for(const input of invalid){const before=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError');assert.equal(fixture.metrics().writes,before);}
for(const key of ['bad','|2026-10-28','a|b|2026-10-28','h|2026-02-30','h'.repeat(190)+'|2026-10-28'])assert.equal(service.read(key).error,'DataError');
// Empty checklist supports simple habits; skipped preserves partial checks.
for(const status of ['pending','done','skipped']){
 const f=createCommitStore(scope);value(writer(f).save({...request,log:{...log,status,checklist:JSON.stringify({steps:[],checked:[]})}}));
 assert.equal(value(writer(f).read(log.key)).log.status,status);
}
const maximal=Array.from({length:30},(_,i)=>({id:'step-'+i,title:'🌱'.repeat(250)})),maxFixture=createCommitStore(scope);
value(writer(maxFixture).save({...request,log:{...log,checklist:JSON.stringify({steps:maximal,checked:[]})}}));
assert.deepEqual(JSON.parse(value(writer(maxFixture).read(log.key)).log.checklist).steps,maximal);
// Same date key in another collection must remain independent; tombstones
// preserve their version and cannot look like a never-created log.
const shared=createCommitStore(scope),sharedContext=context(),protocol=sharedContext.syncCommitProtocol_(shared.store,scope);
value(writer(shared).save(request));
value(protocol.execute({operationId:'synthetic-other-collection',changes:[{collection:'days',id:log.key,baseVersion:null,action:'upsert',data:{marker:'independent'}}]}));
assert.equal(value(writer(shared).read(log.key)).version,'commit-1');
value(protocol.execute({operationId:'synthetic-log-delete',changes:[{collection:'habitLogs',id:log.key,baseVersion:'commit-1',action:'delete'}]}));
const deleted=value(writer(shared).read(log.key));assert.equal(deleted.log,null);assert.equal(deleted.deleted,true);assert.equal(deleted.version,'commit-3');
assert.deepEqual(value(writer(shared).save(request)),ack);
// Restart the process after each durable unit, for both create and update.
let cases=0;
for(const phase of ['before','after'])for(const input of [request,update]){
 const base=createCommitStore(scope);if(input===update)value(writer(base).save(request));const snapshot=base.snapshot();
 const measured=createCommitStore(scope,snapshot);value(writer(measured).save(input));const units=measured.metrics().writes;
 for(let at=1;at<=units;at++){
  const crashed=createCommitStore(scope,snapshot);crashed.fault(at,phase);assert(!writer(crashed).save(input).ok);
  const reboot=createCommitStore(scope,crashed.snapshot()),reopened=writer(reboot);
  const preview=value(reopened.read(log.key));
  if(at!==1||phase!=='before')assert.equal(preview.log.status,input.log.status,'reader recovers prepared domain record');
  const expected=input===request?ack:updated;assert.deepEqual(value(reopened.save(input)),expected);
  assert.equal(value(reopened.read(log.key)).version,'commit-'+expected.sequence);assert.equal(reboot.snapshot().commits.length,expected.sequence);cases++;
 }
}
// Generic storage corruption must not be exposed as a valid habit log.
const corrupted=createCommitStore(scope,fixture.snapshot());const state=corrupted.snapshot();state.entities[0][1].data.record.key='synthetic-habit-b|2026-10-28';assert.equal(writer(createCommitStore(scope,state)).read(log.key).error,'ProtocolCorrupt');
const schema=createCommitStore(scope,fixture.snapshot()).snapshot();schema.entities[0][1].data.format='unexpected';assert.equal(writer(createCommitStore(scope,schema)).read(log.key).error,'ProtocolCorrupt');
// Bind the domain writer to the actual Sheet/Range adapter on local mocks.
function sheetsOpen(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:ctx.syncHabitLogWriter_(store,scope)};}
const sheets=createFaultSheets(),opened=sheetsOpen(sheets);opened.store.withLock(()=>opened.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));sheets.reset();
assert.deepEqual(value(opened.service.save(request)),ack);assert.equal(value(sheetsOpen(createFaultSheets(sheets.snapshot())).service.read(log.key)).log.checklist,value(opened.service.read(log.key)).log.checklist);
const largeSheets=createFaultSheets(),largeOpen=sheetsOpen(largeSheets);
largeOpen.store.withLock(()=>largeOpen.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
const maximum={...request,log:{...log,checklist:JSON.stringify({steps:maximal,checked:[]})}};
value(largeOpen.service.save(maximum));assert.deepEqual(JSON.parse(value(sheetsOpen(createFaultSheets(largeSheets.snapshot())).service.read(log.key)).log.checklist).steps,maximal);
// Two habits on one date remain separate entities.
const independent={...request,operationId:'synthetic-other-habit',log:{...log,key:'synthetic-habit-b|'+log.date,habitId:'synthetic-habit-b'}};
value(service.save(independent));assert.equal(value(service.read(log.key)).log.status,'done');assert.equal(value(service.read(independent.log.key)).log.status,'pending');
const sheetBase=sheets.snapshot(),measuredSheets=createFaultSheets(sheetBase);value(sheetsOpen(measuredSheets).service.save(update));const events=measuredSheets.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const interrupted=createFaultSheets(sheetBase);interrupted.fault(at,phase);assert(!sheetsOpen(interrupted).service.save(update).ok);
 const reopened=sheetsOpen(createFaultSheets(interrupted.snapshot())).service;
 value(reopened.read(log.key));assert.deepEqual(value(reopened.save(update)),updated);assert.equal(value(reopened.read(log.key)).log.status,update.log.status);sheetCases++;
}
const disabled=createFaultSheets(sheets.snapshot());disabled.setEnabled(false);assert.equal(sheetsOpen(disabled).service.save(update).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
const revoked=createFaultSheets(sheets.snapshot());revoked.setAuthorized(false);assert.equal(sheetsOpen(revoked).service.read(log.key).error,'ScopeChanged');assert.equal(revoked.metrics().reads.length,0);
// The generated demo contains the same writer; it must leave legacy HabitLogs alone.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
const legacyBefore=vm.runInContext('JSON.stringify(mockSheets.HabitLogs.data)',demo),demoStore=createCommitStore(scope);
assert.deepEqual(value(demo.syncHabitLogWriter_(demoStore.store,scope).save(request)),ack);
assert.equal(vm.runInContext('JSON.stringify(mockSheets.HabitLogs.data)',demo),legacyBefore,'new internal writer does not dual-write the live legacy model');
console.log('Canonical habit log writer: full snapshots, Unicode/whitespace preservation, stable scoped ACKs, conflicts, '+cases+' unit and '+sheetCases+' Sheet restart faults, read recovery, schema barriers and guarded Sheet adapter OK; legacy routing disabled.');
