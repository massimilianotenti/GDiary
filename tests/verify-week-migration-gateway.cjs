const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-week-migration-archive',principalId:'synthetic-week-migration-principal',epoch:'synthetic-week-migration-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
const ctx=context(),headers=vm.runInContext('WEEK_HEADERS',ctx);
const week='2026-10-26',legacy=Object.fromEntries(headers.map(key=>[key,'']));
Object.assign(legacy,{week,updatedAt:'2026-10-25T10:00:00.000Z',focus:'☐ Caffè 🌱',wins:'Una riflessione',priorities:'  Una pausa  ',energy:'3',closed:'no'});
function open(adapter,rows=[legacy]){
 let held=false,reads=[];const store={...adapter.store,withLock(fn){return adapter.store.withLock(()=>{held=true;try{return fn();}finally{held=false;}});}};
 const raw={read(week){assert(held,'source preimage must share the commit lock');reads.push(week);return copy(rows.filter(row=>row.week===week));},readRows(ranges){assert(held);reads.push(ranges);return copy(rows.filter(row=>!ranges||ranges.some(range=>row.week>=range.from&&row.week<=range.to)));},saveLegacy(){assert(held);throw Error('unexpected legacy write');}};
 return {gateway:context().syncWeekMigrationGateway_(store,scope,raw),rows,reads};
}
const request={operationId:'synthetic-week-migration-first',week,expectedLegacy:legacy};
const baseline=createCommitStore(scope),first=open(baseline),before=copy(first.rows);
assert.deepEqual(copy(first.gateway.preview(week)).legacy,legacy);assert.equal(baseline.metrics().writes,0,'preview does not reserve or migrate');
const migration=copy(first.gateway.migrate(request));assert.equal(migration.status,'committed');assert.equal(migration.sequence,2,'plan reservation then atomic migration');
assert.deepEqual(first.rows,before,'legacy preimage remains frozen');
let read=copy(first.gateway.readRows());assert.equal(read[0].updatedAt,'commit-2');assert.equal(read[0].focus,legacy.focus);assert.equal(read[0].priorities,legacy.priorities);
const migrationSnapshot=baseline.snapshot();
const patch={...legacy,updatedAt:legacy.updatedAt,wins:'Riflessione aggiornata'};
const ack=copy(first.gateway.saveLegacy(patch)),saved=ack.commonUpserts.weeks[0];assert.equal(saved.updatedAt,'commit-4');assert.equal(saved.focus,legacy.focus);assert.equal(saved.priorities,legacy.priorities.trim());
const units=baseline.metrics().writes;assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack);assert.equal(baseline.metrics().writes,units,'retry does not rebuild from current record');
const conflict={...patch,wins:'Bozza obsoleta'};assert.throws(()=>first.gateway.saveLegacy(conflict),error=>error.name==='ConflictError');
const later=copy(first.gateway.saveLegacy({...legacy,updatedAt:saved.updatedAt,focus:'Testo aggiornato'}));assert.equal(later.commonUpserts.weeks[0].focus,'Testo aggiornato');
assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack,'ACK snapshot stays at the original operation after later edits');
const afterConflict=baseline.metrics().writes;assert.throws(()=>first.gateway.saveLegacy(conflict),error=>error.name==='ConflictError');assert.equal(baseline.metrics().writes,afterConflict,'stable conflict plan/receipt');
const explicit={...legacy,updatedAt:later.commonUpserts.weeks[0].updatedAt,wins:'Esplicita',operationId:'synthetic-week-explicit'};first.gateway.saveLegacy(explicit);assert.throws(()=>first.gateway.saveLegacy({...explicit,wins:'Modificata'}),error=>error.name==='OperationMismatch');
assert.deepEqual(copy(first.gateway.migrate(request)),migration,'migration retry survives directory and week updates');
assert.deepEqual(first.rows,before);
// A newly migrated absent week is discoverable even without a legacy row.
const emptyDate='2026-11-02',emptyRequest={week:emptyDate,expectedLegacy:null,operationId:'synthetic-week-empty-migration'};first.gateway.migrate(emptyRequest);
const emptyRead=copy(first.gateway.readRows([{from:emptyDate,to:emptyDate}]));assert.equal(emptyRead.length,1);assert.equal(emptyRead[0].week,emptyDate);
assert.deepEqual(copy(first.gateway.migrate(request)),migration,'old migration retry never overwrites newer routing index');
// Changed/duplicate legacy sources stop migration and all subsequent routed IO.
const changedRows=[{...legacy,wins:'Variante esterna'}],wrong=createCommitStore(scope);assert.throws(()=>open(wrong,changedRows).gateway.migrate(request),error=>error.name==='CommitBlocked');assert.equal(wrong.metrics().writes,0);
for(const rows of [changedRows,[legacy,legacy],[]]){
 const blocked=open(createCommitStore(scope,migrationSnapshot),rows);
 assert.throws(()=>blocked.gateway.readRows(),error=>error.name==='CommitBlocked');assert.throws(()=>blocked.gateway.saveLegacy(patch),error=>error.name==='CommitBlocked');
}
const duplicate=createCommitStore(scope);assert.throws(()=>open(duplicate,[legacy,legacy]).gateway.preview(week),error=>error.name==='CommitBlocked');assert.equal(duplicate.metrics().writes,0);
const badIndex=createCommitStore(scope,migrationSnapshot).snapshot();badIndex.entities.find(([key])=>key===JSON.stringify(['settings','week-routing-v1']))[1].data.weeks.push(week);
assert.throws(()=>open(createCommitStore(scope,badIndex)).gateway.readRows(),error=>error.name==='ProtocolCorrupt');
assert.throws(()=>first.gateway.readRows([{from:'2026-02-30',to:week}]),error=>error.name==='DataError');
// An unrouted canonical entity cannot silently fall back to a legacy write.
const orphan=createCommitStore(scope),orphanCtx=context();orphanCtx.syncWeekWriter_(orphan.store,scope).save({operationId:'synthetic-week-orphan-create',baseVersion:null,week:first.gateway.preview(week).record});
assert.throws(()=>open(orphan).gateway.saveLegacy(patch),error=>error.name==='CommitBlocked');
// Capacity is checked for reservation plus migration before any prepare.
const full=createCommitStore(scope);let budgets=[];
full.store.preflightWrites=items=>{budgets.push(copy(items));return {available:false};};
assert.throws(()=>open(full).gateway.migrate(request),error=>error.name==='ProtocolUnavailable');
assert.equal(full.metrics().writes,0);assert.equal(budgets.length,1);
assert.equal(budgets[0].filter(item=>item.kind==='head').reduce((n,item)=>n+item.writes,0),4);
assert(budgets[0].some(item=>item.kind==='entity'&&item.id[0]==='weeks'));
assert.throws(()=>first.gateway.preview('2026-10-27'),error=>error.name==='DataError');
assert.throws(()=>first.gateway.migrate({...request,week:'2026-10-27'}),error=>error.name==='DataError');
// Restart at every durable unit of reservation and migration/edit commits.
let cases=0;
for(const phase of ['before','after'])for(const kind of ['migration','edit']){
 const initial=kind==='migration'?createCommitStore(scope).snapshot():migrationSnapshot;
 const measure=createCommitStore(scope,initial),invoke=g=>kind==='migration'?g.migrate(request):g.saveLegacy(patch);const expected=copy(invoke(open(measure).gateway)),writes=measure.metrics().writes;
 for(let at=1;at<=writes;at++){
  const interrupted=createCommitStore(scope,initial);interrupted.fault(at,phase);assert.throws(()=>invoke(open(interrupted).gateway));
  const reboot=createCommitStore(scope,interrupted.snapshot()),gateway=open(reboot).gateway;
  gateway.readRows();assert.deepEqual(copy(invoke(gateway)),expected);assert.equal(copy(gateway.readRows())[0].wins,kind==='migration'?legacy.wins:patch.wins);cases++;
 }
}
// A reserved plan whose edit has not started cannot overwrite a later edit.
const reserved=createCommitStore(scope,migrationSnapshot);reserved.fault(5,'after');assert.throws(()=>open(reserved).gateway.saveLegacy(patch));
const resumed=createCommitStore(scope,reserved.snapshot()),resume=open(resumed).gateway;
resume.saveLegacy({...patch,wins:'Altro dispositivo'});assert.throws(()=>resume.saveLegacy(patch),error=>error.name==='ConflictError');assert.equal(resume.readRows()[0].wins,'Altro dispositivo');
// Pending migration plus external legacy mutation never produces an ACK.
const pending=createCommitStore(scope);pending.fault(7,'after');assert.throws(()=>open(pending).gateway.migrate(request));
const divergent=open(createCommitStore(scope,pending.snapshot()),changedRows);assert.throws(()=>divergent.gateway.migrate(request),error=>error.name==='CommitBlocked');assert.throws(()=>divergent.gateway.readRows(),error=>error.name==='CommitBlocked');
// Binding to the fragmented Sheet adapter, including already-held app lock.
const sheets=createFaultSheets(),sheetCtx=context(sheets.globals),store=sheetCtx.syncSheetsCommitStore_(sheets.index,sheets.blocks,archive,sheets.services);
store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
const sheetInitial=sheets.snapshot();sheets.reset();
const sheetSource={read:week=>copy(week===week?[legacy]:[]),readRows:()=>copy([legacy]),saveLegacy(){throw Error('unexpected');}};
const gateway=sheetCtx.syncWeekMigrationGateway_(store,scope,sheetSource);gateway.migrate(request);
const events=sheets.metrics().events.length;let sheetCases=0;
function sheetGateway(fixture){const c=context(fixture.globals),s=c.syncSheetsCommitStore_(fixture.index,fixture.blocks,archive,fixture.services);return c.syncWeekMigrationGateway_(s,scope,sheetSource);}
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const broken=createFaultSheets(sheetInitial);broken.fault(at,phase);assert.throws(()=>sheetGateway(broken).migrate(request));
 const restarted=sheetGateway(createFaultSheets(broken.snapshot()));
 const visible=copy(restarted.readRows())[0];assert([legacy.updatedAt,'commit-2'].includes(visible.updatedAt));assert.equal(visible.wins,legacy.wins);
 assert.deepEqual(copy(restarted.migrate(request)),migration);sheetCases++;
}
sheetCtx.gateway=gateway;assert.equal(copy(vm.runInContext('locked_(()=>gateway.readRows(),true,true)',sheetCtx))[0].updatedAt,'commit-2');
sheets.setAuthorized(false);assert.throws(()=>gateway.readRows(),error=>error.name==='ScopeChanged');
const revokedOnSource=createFaultSheets(sheets.snapshot()),revokedCtx=context(revokedOnSource.globals),revokedStore=revokedCtx.syncSheetsCommitStore_(revokedOnSource.index,revokedOnSource.blocks,archive,revokedOnSource.services);
const revokedGateway=revokedCtx.syncWeekMigrationGateway_(revokedStore,scope,{...sheetSource,readRows(){revokedOnSource.setAuthorized(false);return [legacy];}});assert.throws(()=>revokedGateway.readRows(),error=>error.name==='ScopeChanged','access rechecked after source read');
console.log('Week migration gateway: frozen preimages, atomic routes/week, durable save plans, old drafts, stable ACK/conflicts, '+cases+' unit and '+sheetCases+' Sheet restart faults, divergence barriers and shared-lock binding OK.');
