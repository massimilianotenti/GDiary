const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-day-migration-archive',principalId:'synthetic-day-migration-principal',epoch:'synthetic-day-migration-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
const ctx=context(),headers=vm.runInContext('DAY_HEADERS',ctx);
const date='2026-10-28',legacy=Object.fromEntries(headers.map(key=>[key,'']));
Object.assign(legacy,{date,updatedAt:'2026-10-27T10:00:00.000Z',intention:'☐ Caffè 🌱',reflection:'Una riflessione',gratitude:'  Una pausa  ',intentionRich:JSON.stringify([{kind:'check',runs:[{text:'☐ Caffè 🌱',bold:true}]}])});
function open(adapter,rows=[legacy]){
 let held=false,reads=[];const store={...adapter.store,withLock(fn){return adapter.store.withLock(()=>{held=true;try{return fn();}finally{held=false;}});}};
 const raw={read(day){assert(held,'source preimage must share the commit lock');reads.push(day);return copy(rows.filter(row=>row.date===day));},readRows(ranges){assert(held);reads.push(ranges);return copy(rows.filter(row=>!ranges||ranges.some(range=>row.date>=range.from&&row.date<=range.to)));},saveLegacy(){assert(held);throw Error('unexpected legacy write');}};
 return {gateway:context().syncDayMigrationGateway_(store,scope,raw),rows,reads};
}
const request={operationId:'synthetic-day-migration-first',date,expectedLegacy:legacy};
const baseline=createCommitStore(scope),first=open(baseline),before=copy(first.rows);
assert.deepEqual(copy(first.gateway.preview(date)).legacy,legacy);assert.equal(baseline.metrics().writes,0,'preview does not reserve or migrate');
const migration=copy(first.gateway.migrate(request));assert.equal(migration.status,'committed');assert.equal(migration.sequence,2,'plan reservation then atomic migration');
assert.deepEqual(first.rows,before,'legacy preimage remains frozen');
let read=copy(first.gateway.readRows());assert.equal(read[0].updatedAt,'commit-2');assert.equal(read[0].intention,legacy.intention);assert.equal(read[0].gratitude,legacy.gratitude);
const migrationSnapshot=baseline.snapshot();
const patch={date,updatedAt:legacy.updatedAt,reflection:'Riflessione aggiornata'};
const ack=copy(first.gateway.saveLegacy(patch)),saved=ack.commonUpserts.days[0];assert.equal(saved.updatedAt,'commit-4');assert.equal(saved.intention,legacy.intention);assert.equal(saved.gratitude,legacy.gratitude);assert.deepEqual(JSON.parse(saved.intentionRich),JSON.parse(legacy.intentionRich));
const units=baseline.metrics().writes;assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack);assert.equal(baseline.metrics().writes,units,'retry does not rebuild from current record');
const conflict={...patch,reflection:'Bozza obsoleta'};assert.throws(()=>first.gateway.saveLegacy(conflict),error=>error.name==='ConflictError');
const later=copy(first.gateway.saveLegacy({date,updatedAt:saved.updatedAt,intention:'Testo senza formattazione'}));assert.equal(later.commonUpserts.days[0].intentionRich,'','plain edit clears only corresponding rich');
assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack,'ACK snapshot stays at the original operation after later edits');
const afterConflict=baseline.metrics().writes;assert.throws(()=>first.gateway.saveLegacy(conflict),error=>error.name==='ConflictError');assert.equal(baseline.metrics().writes,afterConflict,'stable conflict plan/receipt');
const explicit={date,updatedAt:later.commonUpserts.days[0].updatedAt,reflection:'Esplicita',operationId:'synthetic-day-explicit'};first.gateway.saveLegacy(explicit);assert.throws(()=>first.gateway.saveLegacy({...explicit,reflection:'Modificata'}),error=>error.name==='OperationMismatch');
assert.deepEqual(copy(first.gateway.migrate(request)),migration,'migration retry survives directory and day updates');
assert.deepEqual(first.rows,before);
// A newly migrated absent date is discoverable even without a legacy row.
const emptyDate='2026-11-01',emptyRequest={date:emptyDate,expectedLegacy:null,operationId:'synthetic-day-empty-migration'};first.gateway.migrate(emptyRequest);
const emptyRead=copy(first.gateway.readRows([{from:emptyDate,to:emptyDate}]));assert.equal(emptyRead.length,1);assert.equal(emptyRead[0].date,emptyDate);
assert.deepEqual(copy(first.gateway.migrate(request)),migration,'old migration retry never overwrites newer routing index');
// Changed/duplicate legacy sources stop migration and all subsequent routed IO.
const changedRows=[{...legacy,reflection:'Variante esterna'}],wrong=createCommitStore(scope);assert.throws(()=>open(wrong,changedRows).gateway.migrate(request),error=>error.name==='CommitBlocked');assert.equal(wrong.metrics().writes,0);
for(const rows of [changedRows,[legacy,legacy],[]]){
 const blocked=open(createCommitStore(scope,migrationSnapshot),rows);
 assert.throws(()=>blocked.gateway.readRows(),error=>error.name==='CommitBlocked');assert.throws(()=>blocked.gateway.saveLegacy(patch),error=>error.name==='CommitBlocked');
}
const duplicate=createCommitStore(scope);assert.throws(()=>open(duplicate,[legacy,legacy]).gateway.preview(date),error=>error.name==='CommitBlocked');assert.equal(duplicate.metrics().writes,0);
const badIndex=createCommitStore(scope,migrationSnapshot).snapshot();badIndex.entities.find(([key])=>key===JSON.stringify(['settings','day-routing-v1']))[1].data.dates.push(date);
assert.throws(()=>open(createCommitStore(scope,badIndex)).gateway.readRows(),error=>error.name==='ProtocolCorrupt');
assert.throws(()=>first.gateway.readRows([{from:'2026-02-30',to:date}]),error=>error.name==='DataError');
// An unrouted canonical entity cannot silently fall back to a legacy write.
const orphan=createCommitStore(scope),orphanCtx=context();orphanCtx.syncDayWriter_(orphan.store,scope).save({operationId:'synthetic-day-orphan-create',baseVersion:null,day:first.gateway.preview(date).day});
assert.throws(()=>open(orphan).gateway.saveLegacy(patch),error=>error.name==='CommitBlocked');
// Restart at every durable unit of reservation and migration/edit commits.
let cases=0;
for(const phase of ['before','after'])for(const kind of ['migration','edit']){
 const initial=kind==='migration'?createCommitStore(scope).snapshot():migrationSnapshot;
 const measure=createCommitStore(scope,initial),invoke=g=>kind==='migration'?g.migrate(request):g.saveLegacy(patch);const expected=copy(invoke(open(measure).gateway)),writes=measure.metrics().writes;
 for(let at=1;at<=writes;at++){
  const interrupted=createCommitStore(scope,initial);interrupted.fault(at,phase);assert.throws(()=>invoke(open(interrupted).gateway));
  const reboot=createCommitStore(scope,interrupted.snapshot()),gateway=open(reboot).gateway;
  gateway.readRows();assert.deepEqual(copy(invoke(gateway)),expected);assert.equal(copy(gateway.readRows())[0].reflection,kind==='migration'?legacy.reflection:patch.reflection);cases++;
 }
}
// A reserved plan whose edit has not started cannot overwrite a later edit.
const reserved=createCommitStore(scope,migrationSnapshot);reserved.fault(5,'after');assert.throws(()=>open(reserved).gateway.saveLegacy(patch));
const resumed=createCommitStore(scope,reserved.snapshot()),resume=open(resumed).gateway;
resume.saveLegacy({...patch,reflection:'Altro dispositivo'});assert.throws(()=>resume.saveLegacy(patch),error=>error.name==='ConflictError');assert.equal(resume.readRows()[0].reflection,'Altro dispositivo');
// Pending migration plus external legacy mutation never produces an ACK.
const pending=createCommitStore(scope);pending.fault(7,'after');assert.throws(()=>open(pending).gateway.migrate(request));
const divergent=open(createCommitStore(scope,pending.snapshot()),changedRows);assert.throws(()=>divergent.gateway.migrate(request),error=>error.name==='CommitBlocked');assert.throws(()=>divergent.gateway.readRows(),error=>error.name==='CommitBlocked');
// Binding to the fragmented Sheet adapter, including already-held app lock.
const sheets=createFaultSheets(),sheetCtx=context(sheets.globals),store=sheetCtx.syncSheetsCommitStore_(sheets.index,sheets.blocks,archive,sheets.services);
store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
const sheetInitial=sheets.snapshot();sheets.reset();
const sheetSource={read:day=>copy(day===date?[legacy]:[]),readRows:()=>copy([legacy]),saveLegacy(){throw Error('unexpected');}};
const gateway=sheetCtx.syncDayMigrationGateway_(store,scope,sheetSource);gateway.migrate(request);
const events=sheets.metrics().events.length;let sheetCases=0;
function sheetGateway(fixture){const c=context(fixture.globals),s=c.syncSheetsCommitStore_(fixture.index,fixture.blocks,archive,fixture.services);return c.syncDayMigrationGateway_(s,scope,sheetSource);}
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const broken=createFaultSheets(sheetInitial);broken.fault(at,phase);assert.throws(()=>sheetGateway(broken).migrate(request));
 const restarted=sheetGateway(createFaultSheets(broken.snapshot()));
 const visible=copy(restarted.readRows())[0];assert([legacy.updatedAt,'commit-2'].includes(visible.updatedAt));assert.equal(visible.reflection,legacy.reflection);
 assert.deepEqual(copy(restarted.migrate(request)),migration);sheetCases++;
}
sheetCtx.gateway=gateway;assert.equal(copy(vm.runInContext('locked_(()=>gateway.readRows(),true,true)',sheetCtx))[0].updatedAt,'commit-2');
sheets.setAuthorized(false);assert.throws(()=>gateway.readRows(),error=>error.name==='ScopeChanged');
const revokedOnSource=createFaultSheets(sheets.snapshot()),revokedCtx=context(revokedOnSource.globals),revokedStore=revokedCtx.syncSheetsCommitStore_(revokedOnSource.index,revokedOnSource.blocks,archive,revokedOnSource.services);
const revokedGateway=revokedCtx.syncDayMigrationGateway_(revokedStore,scope,{...sheetSource,readRows(){revokedOnSource.setAuthorized(false);return [legacy];}});assert.throws(()=>revokedGateway.readRows(),error=>error.name==='ScopeChanged','access rechecked after source read');
console.log('Day migration gateway: frozen preimages, atomic routes/day, durable partial-save plans, old drafts, stable ACK/conflicts, '+cases+' unit and '+sheetCases+' Sheet restart faults, divergence barriers and shared-lock binding OK.');
