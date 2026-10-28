const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-day-archive',principalId:'synthetic-day-principal',epoch:'synthetic-day-epoch'};
const archive={archiveId:scope.archiveId,epoch:scope.epoch},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
function writer(fixture){return context().syncDayWriter_(fixture.store,scope);}
function value(result){assert(result.ok,JSON.stringify(result));return copy(result.value);}
const day={date:'2026-10-28',intention:'☐ Caffè 🌱',reflection:'=Una riflessione\nSeconda riga',gratitude:'  Una pausa  ',lifeArea:'Benessere',smallStep:'Camminare',meaningfulMoment:'Un incontro',feelings:'Sereno',difficulties:'Tempo',learning:'Ascoltare',intentionRich:JSON.stringify([{kind:'check',runs:[{text:'☐ Caffè 🌱',bold:true}]}]),reflectionRich:''};
// Preserve text byte-for-byte, including formula-like text and whitespace.
const request={operationId:'synthetic-day-create',baseVersion:null,day};
const fixture=createCommitStore(scope),service=writer(fixture),ack=value(service.save(request));
assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.deepEqual(ack.scope,scope);
let read=value(service.read(day.date));assert.equal(read.version,'commit-1');assert.equal(read.day.gratitude,day.gratitude);assert.equal(read.day.reflection,day.reflection);assert.deepEqual(JSON.parse(read.day.intentionRich),JSON.parse(day.intentionRich));assert.equal(read.cursor.sequence,1);
assert.deepEqual(value(service.read('2026-10-29')).day,null);
const writes=fixture.metrics().writes;assert.deepEqual(value(service.save(request)),ack);assert.equal(fixture.metrics().writes,writes);
const reordered=copy(request);reordered.day.intentionRich=JSON.stringify([{runs:[{bold:true,text:day.intention}],kind:'check'}]);assert.deepEqual(value(service.save(reordered)),ack,'equivalent rich JSON key order has the same fingerprint');
// Caller mutation cannot alter later ACK scope or persisted records.
const mutable=service.save(request);mutable.value.scope.archiveId='tampered';assert.deepEqual(value(service.save(request)).scope,scope);read.day.intention='tampered';assert.equal(value(service.read(day.date)).day.intention,day.intention);
const changed={...request,day:{...day,reflection:'Nuova riflessione'}};assert.equal(service.save(changed).error,'OperationMismatch');
const update={operationId:'synthetic-day-update',baseVersion:'commit-1',day:{...day,reflection:'Riflessione aggiornata'}};
const updated=value(service.save(update));assert.equal(updated.sequence,2);assert.equal(value(service.read(day.date)).day.reflection,update.day.reflection);
const stale={...update,operationId:'synthetic-day-stale',day:{...day,reflection:'Da altro dispositivo'}};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.equal(conflict.conflicts[0].actualVersion,'commit-2');assert.equal(value(service.read(day.date)).version,'commit-2');
assert.deepEqual(value(service.save(request)),ack,'retry after later edits acknowledges original operation');
const latest={...update,operationId:'synthetic-day-later',baseVersion:'commit-2'};value(service.save(latest));assert.deepEqual(value(service.save(stale)),conflict,'conflict receipt remains stable');
// A complete snapshot is mandatory: omitted fields cannot silently erase data.
const partial=copy(request);delete partial.day.gratitude;
const unknown=copy(request);unknown.day.row=2;
const unknownEnvelope={...request,context:{archiveId:'untrusted'}};
const mismatch=copy(request);mismatch.day.intention='Testo diverso';
const unsupported=copy(request);unsupported.day.intentionRich=JSON.stringify([{kind:'check',runs:[{text:day.intention,unknownStyle:true}]}]);
const invalid=[partial,unknown,unknownEnvelope,mismatch,unsupported,{...request,baseVersion:''},{...request,day:{...day,date:'2026-02-30'}},{...request,day:{...day,feelings:null}},{...request,day:{...day,feelings:'x'.repeat(6001)}},{...request,day:{...day,intentionRich:'not JSON'}},{...request,operationId:'short'}];
for(const input of invalid){const before=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError');assert.equal(fixture.metrics().writes,before);}
const oversized=copy(request);for(const key of ['gratitude','lifeArea','smallStep','meaningfulMoment','feelings','difficulties'])oversized.day[key]='x'.repeat(6000);assert.equal(service.save(oversized).error,'DataError');
assert.equal(service.read('bad').error,'DataError');
// Restart the process after each durable unit, for both create and update.
let cases=0;
for(const phase of ['before','after'])for(const input of [request,update]){
 const base=createCommitStore(scope);if(input===update)value(writer(base).save(request));const snapshot=base.snapshot();
 const measured=createCommitStore(scope,snapshot);value(writer(measured).save(input));const units=measured.metrics().writes;
 for(let at=1;at<=units;at++){
  const crashed=createCommitStore(scope,snapshot);crashed.fault(at,phase);assert(!writer(crashed).save(input).ok);
  const reboot=createCommitStore(scope,crashed.snapshot()),reopened=writer(reboot);
  const preview=value(reopened.read(day.date));
  if(at!==1||phase!=='before')assert.equal(preview.day.reflection,input.day.reflection,'reader recovers prepared domain record');
  const expected=input===request?ack:updated;assert.deepEqual(value(reopened.save(input)),expected);
  assert.equal(value(reopened.read(day.date)).version,'commit-'+expected.sequence);assert.equal(reboot.snapshot().commits.length,expected.sequence);cases++;
 }
}
// Generic storage corruption must not be exposed as a valid daily record.
const corrupted=createCommitStore(scope,fixture.snapshot());const state=corrupted.snapshot();state.entities[0][1].data.record.date='2026-10-29';assert.equal(writer(createCommitStore(scope,state)).read(day.date).error,'ProtocolCorrupt');
const schema=createCommitStore(scope,fixture.snapshot()).snapshot();schema.entities[0][1].data.format='unexpected';assert.equal(writer(createCommitStore(scope,schema)).read(day.date).error,'ProtocolCorrupt');
// Bind the domain writer to the actual Sheet/Range adapter on local mocks.
function sheetsOpen(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:ctx.syncDayWriter_(store,scope)};}
const sheets=createFaultSheets(),opened=sheetsOpen(sheets);opened.store.withLock(()=>opened.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));sheets.reset();
assert.deepEqual(value(opened.service.save(request)),ack);assert.equal(value(sheetsOpen(createFaultSheets(sheets.snapshot())).service.read(day.date)).day.gratitude,day.gratitude);
const sheetBase=sheets.snapshot(),measuredSheets=createFaultSheets(sheetBase);value(sheetsOpen(measuredSheets).service.save(update));const events=measuredSheets.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const interrupted=createFaultSheets(sheetBase);interrupted.fault(at,phase);assert(!sheetsOpen(interrupted).service.save(update).ok);
 const reopened=sheetsOpen(createFaultSheets(interrupted.snapshot())).service;
 value(reopened.read(day.date));assert.deepEqual(value(reopened.save(update)),updated);assert.equal(value(reopened.read(day.date)).day.reflection,update.day.reflection);sheetCases++;
}
const disabled=createFaultSheets(sheets.snapshot());disabled.setEnabled(false);assert.equal(sheetsOpen(disabled).service.save(update).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
const revoked=createFaultSheets(sheets.snapshot());revoked.setAuthorized(false);assert.equal(sheetsOpen(revoked).service.read(day.date).error,'ScopeChanged');assert.equal(revoked.metrics().reads.length,0);
// The generated demo contains the same writer; it must leave legacy Days alone.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
const legacyBefore=vm.runInContext('JSON.stringify(mockSheets.Days.data)',demo),demoStore=createCommitStore(scope);
assert.deepEqual(value(demo.syncDayWriter_(demoStore.store,scope).save(request)),ack);
assert.equal(vm.runInContext('JSON.stringify(mockSheets.Days.data)',demo),legacyBefore,'new internal writer does not dual-write the live legacy model');
console.log('Canonical day writer: full snapshots, rich/whitespace preservation, stable scoped ACKs, conflicts, '+cases+' unit and '+sheetCases+' Sheet restart faults, read recovery, schema barriers and guarded Sheet adapter OK; legacy routing disabled.');
