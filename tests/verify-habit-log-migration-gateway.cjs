const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-log-migration-archive',principalId:'synthetic-log-migration-principal',epoch:'synthetic-log-migration-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
const ctx=context(),row=(name,values)=>Object.assign(Object.fromEntries(vm.runInContext(name,ctx).map(key=>[key,''])),values);
const steps=[{id:'step-a',title:'  Passo 🌱  '},{id:'step-b',title:'=Passo\nSeconda riga'}],date='2026-10-28',key='synthetic-habit|'+date;
const catalog={habit:row('HABIT_HEADERS',{id:'synthetic-habit',goalId:'synthetic-goal',title:'Pratica',days:'weekly:3',start:'2026-10-01',updatedAt:'2026-10-25T10:00:00.000Z',steps:JSON.stringify(steps)}),goal:row('GOAL_HEADERS',{id:'synthetic-goal',title:'Obiettivo',cycle:'2026-Q4',target:'3',progress:'0',updatedAt:'2026-10-25T09:00:00.000Z'})};
const legacy={key,habitId:catalog.habit.id,date,status:'pending',checklist:JSON.stringify({steps,checked:['step-a']}),updatedAt:'2026-10-27T10:00:00.000Z'};
const record=copy(ctx.syncHabitLogSnapshot_(Object.fromEntries(Object.entries(legacy).filter(([k])=>k!=='updatedAt'))));
function open(adapter,rows=[legacy],cat=copy(catalog)){
 let held=false,catalogReads=0;const store={...adapter.store,withLock(fn){return adapter.store.withLock(()=>{held=true;try{return fn();}finally{held=false;}});}};
 const raw={read(k){assert(held);return copy(rows.filter(row=>row.key===k));},readRows(ranges){assert(held);return copy(rows.filter(row=>!ranges||ranges.some(range=>row.date>=range.from&&row.date<=range.to)));},readCatalog(){assert(held);catalogReads++;return copy(cat);},saveLegacy(){throw Error('unexpected legacy write');}};
 return {gateway:context().syncHabitLogMigrationGateway_(store,scope,raw),rows,catalog:cat,catalogReads:()=>catalogReads};
}
const request={operationId:'synthetic-log-migrate-first',key,expectedLegacy:legacy,expectedCatalog:catalog,record};
const baseline=createCommitStore(scope),first=open(baseline),before=copy(first.rows);
assert.deepEqual(copy(first.gateway.preview(key)).record,record);assert.equal(baseline.metrics().writes,0);
const migration=copy(first.gateway.migrate(request));assert.equal(migration.sequence,2);assert.equal(migration.status,'committed');assert.deepEqual(first.rows,before);
const migrationSnapshot=baseline.snapshot();assert.equal(first.gateway.readRows()[0].updatedAt,'commit-2');
const patch={habitId:legacy.habitId,date,status:'pending',checked:['step-a','step-b'],habitUpdatedAt:catalog.habit.updatedAt,updatedAt:legacy.updatedAt};
const ack=copy(first.gateway.saveLegacy(patch)),saved=ack.commonUpserts.habitLogs[0];assert.equal(saved.updatedAt,'commit-4');assert.equal(saved.status,'done');assert.deepEqual(JSON.parse(saved.checklist).steps,steps);
const writes=baseline.metrics().writes;assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack);assert.equal(baseline.metrics().writes,writes);
const conflict={...patch,status:'skipped'};assert.throws(()=>first.gateway.saveLegacy(conflict),e=>e.name==='ConflictError');
const later=copy(first.gateway.saveLegacy({...patch,updatedAt:saved.updatedAt,checked:[]}));assert.equal(later.commonUpserts.habitLogs[0].status,'pending');
assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack);
const afterConflict=baseline.metrics().writes;assert.throws(()=>first.gateway.saveLegacy(conflict),e=>e.name==='ConflictError');assert.equal(baseline.metrics().writes,afterConflict);
const explicit={...patch,updatedAt:later.commonUpserts.habitLogs[0].updatedAt,operationId:'synthetic-log-explicit'};first.gateway.saveLegacy(explicit);assert.throws(()=>first.gateway.saveLegacy({...explicit,status:'skipped'}),e=>e.name==='OperationMismatch');
// ACKs and historical reads do not depend on live catalogues after commit.
const reads=first.catalogReads();first.catalog.habit.archived='yes';first.catalog.habit.steps='[]';first.catalog.habit.updatedAt='2026-10-29T10:00:00.000Z';
assert.deepEqual(copy(first.gateway.saveLegacy(patch)),ack);assert.deepEqual(copy(first.gateway.migrate(request)),migration);assert.equal(first.catalogReads(),reads);
assert.deepEqual(JSON.parse(first.gateway.readRows()[0].checklist).steps,steps);assert.deepEqual(first.rows,before);
// Missing receipt is repaired from the retained commit, not replayed on a
// now-archived habit. There is still only one target commit.
const missing=baseline.snapshot();
const actualId=missing.commits.find(([,commit])=>commit.sequence===4)[1].operationId;
missing.receipts=missing.receipts.filter(([id])=>JSON.parse(id)[1]!==actualId);
const repaired=createCommitStore(scope,missing),repairedGateway=open(repaired,[legacy],first.catalog).gateway;
assert.deepEqual(copy(repairedGateway.saveLegacy(patch)),ack);assert.equal(repaired.snapshot().commits.length,baseline.snapshot().commits.length);
// Changed, duplicated or deleted frozen legacy rows block routed IO.
for(const rows of [[{...legacy,status:'skipped'}],[legacy,legacy],[]]){
 const blocked=open(createCommitStore(scope,migrationSnapshot),rows);
 assert.throws(()=>blocked.gateway.readRows(),e=>e.name==='CommitBlocked');assert.throws(()=>blocked.gateway.saveLegacy(patch),e=>e.name==='CommitBlocked');
}
const changed=createCommitStore(scope);assert.throws(()=>open(changed,[{...legacy,status:'skipped'}]).gateway.migrate(request),e=>e.name==='CommitBlocked');assert.equal(changed.metrics().writes,0);
const full=createCommitStore(scope);full.store.preflightWrites=items=>{assert.equal(items.filter(i=>i.kind==='head').reduce((n,i)=>n+i.writes,0),4);return {available:false};};
assert.throws(()=>open(full).gateway.migrate(request),e=>e.name==='ProtocolUnavailable');assert.equal(full.metrics().writes,0);
// A plan reserved before a crash cannot ignore subsequently changed catalogue
// definitions. A prepare already accepted before a crash recovers its old ACK.
const reserved=createCommitStore(scope,migrationSnapshot);reserved.fault(5,'after');assert.throws(()=>open(reserved).gateway.saveLegacy(patch));
const evolved=copy(catalog);evolved.habit.updatedAt='2026-10-29T10:00:00.000Z';evolved.habit.steps='[]';
const resume=createCommitStore(scope,reserved.snapshot()),waiting=open(resume,[legacy],evolved);
assert.throws(()=>waiting.gateway.saveLegacy(patch),e=>e.name==='CommitBlocked');assert.equal(waiting.gateway.readRows()[0].updatedAt,'commit-2');
const accepted=createCommitStore(scope,migrationSnapshot);accepted.fault(7,'after');assert.throws(()=>open(accepted).gateway.saveLegacy(patch));
const archived=copy(evolved);archived.habit.archived='yes';assert.deepEqual(copy(open(createCommitStore(scope,accepted.snapshot()),[legacy],archived).gateway.saveLegacy(patch)),ack);
// Explicit migration snapshots handle absent rows and missing old checklists
// without fabricating ticks or rewriting a recorded checklist.
const emptyKey=legacy.habitId+'|2026-10-29',emptyRecord=copy(ctx.syncPrepareHabitLogEdit_({habitId:legacy.habitId,date:'2026-10-29',status:'pending',checked:[]},null,catalog).record);
const emptyStore=createCommitStore(scope),empty=open(emptyStore,[]);empty.gateway.migrate({...request,key:emptyKey,operationId:'synthetic-log-empty',expectedLegacy:null,record:emptyRecord});
assert.equal(empty.gateway.readRows([{from:'2026-10-29',to:'2026-10-29'}]).length,1);assert.equal(empty.gateway.readRows([{from:date,to:date}]).length,0);
const old={...legacy,status:'done',checklist:''},oldStore=createCommitStore(scope),oldGateway=open(oldStore,[old]).gateway;assert.equal(oldGateway.preview(key).record,null);
const reviewed={...record,status:'done',checklist:JSON.stringify({steps:[],checked:[]})};
oldGateway.migrate({...request,operationId:'synthetic-old-log',expectedLegacy:old,record:reviewed});assert.equal(oldGateway.readRows()[0].status,'done');assert.deepEqual(JSON.parse(oldGateway.readRows()[0].checklist),{steps:[],checked:[]});
const refused=createCommitStore(scope);assert.throws(()=>open(refused).gateway.migrate({...request,record:{...record,checklist:JSON.stringify({steps:[],checked:[]})}}),e=>e.name==='CommitBlocked');assert.equal(refused.metrics().writes,0);
// Long composite keys use hashed route IDs, remaining inside protocol limits.
const longCatalog=copy(catalog);longCatalog.habit.id='h'.repeat(189);const longRecord={...record,key:longCatalog.habit.id+'|'+date,habitId:longCatalog.habit.id};
const longLegacy={...longRecord,updatedAt:legacy.updatedAt},long=open(createCommitStore(scope),[longLegacy],longCatalog);
long.gateway.migrate({...request,key:longRecord.key,expectedLegacy:longLegacy,expectedCatalog:longCatalog,record:longRecord});assert.equal(long.gateway.readRows()[0].key.length,200);
// Malformed directory/plans and orphan entities cannot open a legacy fallback.
const badIndex=copy(migrationSnapshot);badIndex.entities.find(([k])=>k===JSON.stringify(['settings','habit-log-routing-v1']))[1].data.keys.push(key);
assert.throws(()=>open(createCommitStore(scope,badIndex)).gateway.readRows(),e=>e.name==='ProtocolCorrupt');
const badPlan=copy(reserved.snapshot());badPlan.entities.find(([,value])=>value.data?.kind==='edit')[1].data.request.changes[0].data.record.status='wrong';
assert.throws(()=>open(createCommitStore(scope,badPlan)).gateway.saveLegacy(patch),e=>e.name==='ProtocolCorrupt');
const orphan=createCommitStore(scope);ctx.syncHabitLogWriter_(orphan.store,scope).save({operationId:'synthetic-log-orphan',baseVersion:null,log:record});
assert.throws(()=>open(orphan).gateway.saveLegacy(patch),e=>e.name==='CommitBlocked');
assert.throws(()=>first.gateway.readRows([{from:'2026-02-30',to:date}]),e=>e.name==='DataError');
// Another habit on the same date must keep an independent route and snapshot.
const alternate=copy(catalog);alternate.habit.id='synthetic-habit-two';
const alternateRecord={...record,key:alternate.habit.id+'|'+date,habitId:alternate.habit.id},alternateLegacy={...alternateRecord,updatedAt:legacy.updatedAt};
const sameDateStore=createCommitStore(scope),sameDateRows=[legacy,alternateLegacy];
open(sameDateStore,sameDateRows).gateway.migrate(request);
open(sameDateStore,sameDateRows,alternate).gateway.migrate({...request,operationId:'synthetic-log-same-date',key:alternateRecord.key,expectedLegacy:alternateLegacy,expectedCatalog:alternate,record:alternateRecord});
assert.equal(open(sameDateStore,sameDateRows).gateway.readRows([{from:date,to:date}]).length,2);
// Fresh V8 process after every unit of reservation and migration/edit commits.
let cases=0;
for(const phase of ['before','after'])for(const kind of ['migration','edit']){
 const initial=kind==='migration'?createCommitStore(scope).snapshot():migrationSnapshot;
 const measure=createCommitStore(scope,initial),invoke=g=>kind==='migration'?g.migrate(request):g.saveLegacy(patch),expected=copy(invoke(open(measure).gateway)),count=measure.metrics().writes;
 for(let at=1;at<=count;at++){
  const crashed=createCommitStore(scope,initial);crashed.fault(at,phase);assert.throws(()=>invoke(open(crashed).gateway));
  const reboot=open(createCommitStore(scope,crashed.snapshot())).gateway;reboot.readRows();assert.deepEqual(copy(invoke(reboot)),expected);assert.deepEqual(JSON.parse(reboot.readRows()[0].checklist).steps,steps);cases++;
 }
}
// Real fragmented Sheet adapter with all before/after/partial RPC failures.
const sheets=createFaultSheets(),c=context(sheets.globals),store=c.syncSheetsCommitStore_(sheets.index,sheets.blocks,archive,sheets.services);
store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));const sheetInitial=sheets.snapshot();sheets.reset();
const sheetSource={read:k=>copy(k===key?[legacy]:[]),readRows:()=>copy([legacy]),readCatalog:()=>copy(catalog),saveLegacy(){throw Error('unexpected');}};
const gateway=c.syncHabitLogMigrationGateway_(store,scope,sheetSource);assert.deepEqual(copy(gateway.migrate(request)),migration);
const events=sheets.metrics().events.length;let sheetCases=0;
function sheetGateway(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return ctx.syncHabitLogMigrationGateway_(store,scope,sheetSource);}
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const f=createFaultSheets(sheetInitial);f.fault(at,phase);assert.throws(()=>sheetGateway(f).migrate(request));
 const boot=sheetGateway(createFaultSheets(f.snapshot()));const visible=boot.readRows()[0];assert([legacy.updatedAt,'commit-2'].includes(visible.updatedAt));assert.deepEqual(copy(boot.migrate(request)),migration);sheetCases++;
}
const revoke=createFaultSheets(sheets.snapshot()),revokeCtx=context(revoke.globals),revokeStore=revokeCtx.syncSheetsCommitStore_(revoke.index,revoke.blocks,archive,revoke.services);
const revokedGateway=revokeCtx.syncHabitLogMigrationGateway_(revokeStore,scope,{...sheetSource,readRows(){revoke.setAuthorized(false);return [legacy];}});
assert.throws(()=>revokedGateway.readRows(),e=>e.name==='ScopeChanged');
sheets.setAuthorized(false);assert.throws(()=>gateway.readRows(),e=>e.name==='ScopeChanged');
console.log('Habit log migration gateway: frozen rows/checklists, reviewed missing history, durable catalogue digest plans, stable ACKs/conflicts across catalogue edits/archive, reserved vs prepared recovery, long keys, bounded preflight, '+cases+' unit and '+sheetCases+' Sheet restart faults OK.');
