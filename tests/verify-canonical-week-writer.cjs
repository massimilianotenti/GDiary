const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-week-archive',principalId:'synthetic-week-principal',epoch:'synthetic-week-epoch'};
const archive={archiveId:scope.archiveId,epoch:scope.epoch},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
function writer(fixture){return context().syncWeekWriter_(fixture.store,scope);}
function value(result){assert(result.ok,JSON.stringify(result));return copy(result.value);}
const week={week:'2026-10-26',focus:'☐ Caffè 🌱',priorities:'  Una pausa  ',wins:'=Una riflessione\nSeconda riga',obstacles:'Tempo',lessons:'Ascoltare',next:'Camminare',energy:'3',closed:'no'};
// Preserve text byte-for-byte, including formula-like text and whitespace.
const request={operationId:'synthetic-week-create',baseVersion:null,week};
const fixture=createCommitStore(scope),service=writer(fixture),ack=value(service.save(request));
assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.deepEqual(ack.scope,scope);
let read=value(service.read(week.week));assert.equal(read.version,'commit-1');assert.equal(read.week.priorities,week.priorities);assert.equal(read.week.wins,week.wins);assert.equal(read.cursor.sequence,1);
assert.deepEqual(value(service.read('2026-11-02')).week,null);
const writes=fixture.metrics().writes;assert.deepEqual(value(service.save(request)),ack);assert.equal(fixture.metrics().writes,writes);
// Caller mutation cannot alter later ACK scope or persisted records.
const mutable=service.save(request);mutable.value.scope.archiveId='tampered';assert.deepEqual(value(service.save(request)).scope,scope);read.week.focus='tampered';assert.equal(value(service.read(week.week)).week.focus,week.focus);
const changed={...request,week:{...week,wins:'Nuova riflessione'}};assert.equal(service.save(changed).error,'OperationMismatch');
const update={operationId:'synthetic-week-update',baseVersion:'commit-1',week:{...week,wins:'Riflessione aggiornata'}};
const updated=value(service.save(update));assert.equal(updated.sequence,2);assert.equal(value(service.read(week.week)).week.wins,update.week.wins);
const stale={...update,operationId:'synthetic-week-stale',week:{...week,wins:'Da altro dispositivo'}};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.equal(conflict.conflicts[0].actualVersion,'commit-2');assert.equal(value(service.read(week.week)).version,'commit-2');
assert.deepEqual(value(service.save(request)),ack,'retry after later edits acknowledges original operation');
const latest={...update,operationId:'synthetic-week-later',baseVersion:'commit-2'};value(service.save(latest));assert.deepEqual(value(service.save(stale)),conflict,'conflict receipt remains stable');
// A complete snapshot is mandatory: omitted fields cannot silently erase data.
const partial=copy(request);delete partial.week.priorities;
const unknown=copy(request);unknown.week.row=2;
const unknownEnvelope={...request,context:{archiveId:'untrusted'}};
const invalid=[partial,unknown,unknownEnvelope,{...request,baseVersion:''},{...request,week:{...week,week:'2026-10-27'}},{...request,week:{...week,energy:'6'}},{...request,week:{...week,closed:''}},{...request,week:{...week,lessons:null}},{...request,week:{...week,focus:'x'.repeat(6001)}},{...request,operationId:'short'}];
for(const input of invalid){const before=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError');assert.equal(fixture.metrics().writes,before);}
const oversized=copy(request);for(const key of ['focus','priorities','wins','obstacles','lessons','next'])oversized.week[key]='x'.repeat(6000);assert.equal(service.save(oversized).error,'DataError');
assert.equal(service.read('bad').error,'DataError');
// Same date key in another collection must remain independent; tombstones
// preserve their version and cannot look like a never-created week.
const shared=createCommitStore(scope),sharedContext=context(),protocol=sharedContext.syncCommitProtocol_(shared.store,scope);
value(writer(shared).save(request));
value(protocol.execute({operationId:'synthetic-other-collection',changes:[{collection:'days',id:week.week,baseVersion:null,action:'upsert',data:{marker:'independent'}}]}));
assert.equal(value(writer(shared).read(week.week)).version,'commit-1');
value(protocol.execute({operationId:'synthetic-week-delete',changes:[{collection:'weeks',id:week.week,baseVersion:'commit-1',action:'delete'}]}));
const deleted=value(writer(shared).read(week.week));assert.equal(deleted.week,null);assert.equal(deleted.deleted,true);assert.equal(deleted.version,'commit-3');
assert.deepEqual(value(writer(shared).save(request)),ack);
// Restart the process after each durable unit, for both create and update.
let cases=0;
for(const phase of ['before','after'])for(const input of [request,update]){
 const base=createCommitStore(scope);if(input===update)value(writer(base).save(request));const snapshot=base.snapshot();
 const measured=createCommitStore(scope,snapshot);value(writer(measured).save(input));const units=measured.metrics().writes;
 for(let at=1;at<=units;at++){
  const crashed=createCommitStore(scope,snapshot);crashed.fault(at,phase);assert(!writer(crashed).save(input).ok);
  const reboot=createCommitStore(scope,crashed.snapshot()),reopened=writer(reboot);
  const preview=value(reopened.read(week.week));
  if(at!==1||phase!=='before')assert.equal(preview.week.wins,input.week.wins,'reader recovers prepared domain record');
  const expected=input===request?ack:updated;assert.deepEqual(value(reopened.save(input)),expected);
  assert.equal(value(reopened.read(week.week)).version,'commit-'+expected.sequence);assert.equal(reboot.snapshot().commits.length,expected.sequence);cases++;
 }
}
// Generic storage corruption must not be exposed as a valid weekly record.
const corrupted=createCommitStore(scope,fixture.snapshot());const state=corrupted.snapshot();state.entities[0][1].data.record.week='2026-11-02';assert.equal(writer(createCommitStore(scope,state)).read(week.week).error,'ProtocolCorrupt');
const schema=createCommitStore(scope,fixture.snapshot()).snapshot();schema.entities[0][1].data.format='unexpected';assert.equal(writer(createCommitStore(scope,schema)).read(week.week).error,'ProtocolCorrupt');
// Bind the domain writer to the actual Sheet/Range adapter on local mocks.
function sheetsOpen(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:ctx.syncWeekWriter_(store,scope)};}
const sheets=createFaultSheets(),opened=sheetsOpen(sheets);opened.store.withLock(()=>opened.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));sheets.reset();
assert.deepEqual(value(opened.service.save(request)),ack);assert.equal(value(sheetsOpen(createFaultSheets(sheets.snapshot())).service.read(week.week)).week.priorities,week.priorities);
const sheetBase=sheets.snapshot(),measuredSheets=createFaultSheets(sheetBase);value(sheetsOpen(measuredSheets).service.save(update));const events=measuredSheets.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const interrupted=createFaultSheets(sheetBase);interrupted.fault(at,phase);assert(!sheetsOpen(interrupted).service.save(update).ok);
 const reopened=sheetsOpen(createFaultSheets(interrupted.snapshot())).service;
 value(reopened.read(week.week));assert.deepEqual(value(reopened.save(update)),updated);assert.equal(value(reopened.read(week.week)).week.wins,update.week.wins);sheetCases++;
}
const disabled=createFaultSheets(sheets.snapshot());disabled.setEnabled(false);assert.equal(sheetsOpen(disabled).service.save(update).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
const revoked=createFaultSheets(sheets.snapshot());revoked.setAuthorized(false);assert.equal(sheetsOpen(revoked).service.read(week.week).error,'ScopeChanged');assert.equal(revoked.metrics().reads.length,0);
// The generated demo contains the same writer; it must leave legacy Weeks alone.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
const legacyBefore=vm.runInContext('JSON.stringify(mockSheets.Weeks.data)',demo),demoStore=createCommitStore(scope);
assert.deepEqual(value(demo.syncWeekWriter_(demoStore.store,scope).save(request)),ack);
assert.equal(vm.runInContext('JSON.stringify(mockSheets.Weeks.data)',demo),legacyBefore,'new internal writer does not dual-write the live legacy model');
console.log('Canonical week writer: full snapshots, Unicode/whitespace preservation, stable scoped ACKs, conflicts, '+cases+' unit and '+sheetCases+' Sheet restart faults, read recovery, schema barriers and guarded Sheet adapter OK; legacy routing disabled.');
