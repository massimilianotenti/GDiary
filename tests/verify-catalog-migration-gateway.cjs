const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs'),{createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-catalog-gateway-archive',epoch:'synthetic-catalog-gateway-epoch',principalId:'synthetic-catalog-gateway-principal'},archive={archiveId:scope.archiveId,epoch:scope.epoch},copy=v=>JSON.parse(JSON.stringify(v));
function context(globals={}){const c=vm.createContext(globals);vm.runInContext(source,c);return c;}
const c=context(),row=(name,values)=>Object.assign(Object.fromEntries(vm.runInContext(name,c).map(key=>[key,''])),values);
const goal=row('GOAL_HEADERS',{id:'synthetic-goal',cycle:'2026-Q4',title:'Obiettivo',target:'3',progress:'0',description:'  Descrizione 🌱  ',icon:'brain',updatedAt:'2026-10-27T10:00:00.000Z'}),habit=row('HABIT_HEADERS',{id:'synthetic-habit',goalId:goal.id,title:'Pratica',days:'weekly:3',start:'2026-10-01',steps:JSON.stringify([{id:'step-a',title:'Prima'},{id:'step-b',title:'Seconda'}]),description:'Istruzioni',icon:'plant',updatedAt:'2026-10-27T09:00:00.000Z'});
function open(adapter,rows={goals:[copy(goal)],habits:[copy(habit)]}){
 let held=false,allocations=0;const store={...adapter.store,withLock(fn){return adapter.store.withLock(()=>{held=true;try{return fn();}finally{held=false;}});}};
 const raw={read(collection,id){assert(held);return copy(rows[collection].filter(row=>row.id===id));},readRows(collection){assert(held);return copy(rows[collection]);},allocate(kind,input,previous){assert(held);allocations++;const prior=previous?JSON.parse(previous.steps||'[]'):[],titles=input.steps===null?prior.map(s=>s.title):input.steps||[],missing=kind==='habit'?c.syncHabitStepPlan_(prior,titles).filter(s=>s.id===null).length:0;return {id:input.id||'synthetic-generated-'+allocations,stepIds:Array.from({length:missing},(_,i)=>'synthetic-step-'+allocations+'-'+i)};},saveLegacy(){throw Error('unexpected legacy write');}};
 return {gateway:context().syncCatalogMigrationGateway_(store,scope,raw),rows,raw,allocations:()=>allocations};
}
const gm={operationId:'synthetic-catalog-migrate-goal',collection:'goals',id:goal.id,expectedLegacy:goal},hm={operationId:'synthetic-catalog-migrate-habit',collection:'habits',id:habit.id,expectedLegacy:habit};
const base=createCommitStore(scope),first=open(base),before=copy(first.rows);assert.deepEqual(copy(first.gateway.preview('goals',goal.id)).legacy,goal);assert.equal(base.metrics().writes,0);
const migratedGoal=copy(first.gateway.migrate(gm)),migratedHabit=copy(first.gateway.migrate(hm));assert.equal(migratedGoal.sequence,2);assert.equal(migratedHabit.sequence,4);assert.deepEqual(first.rows,before);
assert.equal(first.gateway.mapVersion('habits',habit.id,habit.updatedAt),'commit-4');assert.equal(first.gateway.readOne('habits',habit.id).updatedAt,'commit-4');
const migrated=base.snapshot(),gp={...goal,title:'Nuovo titolo',progress:'1'},hp={...habit,steps:'Seconda\nPrima'};
const gack=copy(first.gateway.saveLegacy('goal',gp));assert.equal(gack.commonUpserts.goals[0].updatedAt,'commit-6');assert.equal(gack.commonUpserts.goals[0].description,goal.description.trim());
const hack=copy(first.gateway.saveLegacy('habit',hp));assert.deepEqual(JSON.parse(hack.commonUpserts.habits[0].steps).map(s=>s.id),['step-b','step-a']);assert.equal(first.gateway.mapVersion('habits',habit.id,habit.updatedAt),habit.updatedAt);
const writes=base.metrics().writes,allocations=first.allocations();assert.deepEqual(copy(first.gateway.saveLegacy('goal',gp)),gack);assert.deepEqual(copy(first.gateway.saveLegacy('habit',hp)),hack);assert.equal(first.allocations(),allocations);assert.equal(base.metrics().writes,writes);
assert.throws(()=>first.gateway.saveLegacy('goal',{...gp,title:'Stale'}),e=>e.name==='ConflictError');
const create={title:'Identico',cycle:'2026-Q4',target:3,progress:0,description:'Nuovo',requestId:'synthetic-create-intent-one'};
const created=copy(first.gateway.saveLegacy('goal',create)).commonUpserts.goals[0],again=copy(first.gateway.saveLegacy('goal',create)).commonUpserts.goals[0];assert.deepEqual(again,created);
const second=copy(first.gateway.saveLegacy('goal',{...create,requestId:'synthetic-create-intent-two'})).commonUpserts.goals[0];assert.notEqual(second.id,created.id,'intentional equal creations preserve distinct identities');
assert.throws(()=>first.gateway.saveLegacy('goal',{...create,title:'Edited under same intent'}),e=>e.name==='OperationMismatch');
const n=base.metrics().writes,a=first.allocations();assert.throws(()=>first.gateway.saveLegacy('goal',{...create,requestId:undefined}),e=>e.name==='ProtocolUnavailable');assert.equal(base.metrics().writes,n);assert.equal(first.allocations(),a);
const newHabit={title:'Pratica nuova',goalId:created.id,days:'weekly:2',start:'2026-10-01',steps:'Un gesto\nDue gesti',requestId:'synthetic-habit-create-intent'};
const born=copy(first.gateway.saveLegacy('habit',newHabit)).commonUpserts.habits[0];assert.equal(JSON.parse(born.steps).length,2);assert.deepEqual(copy(first.gateway.saveLegacy('habit',newHabit)).commonUpserts.habits[0],born);
assert.equal(first.gateway.readRows('goals').filter(r=>r.id===created.id).length,1);assert.equal(first.gateway.readRows('habits').filter(r=>r.id===born.id).length,1);
const archivePayload={id:habit.id,updatedAt:hack.commonUpserts.habits[0].updatedAt},archived=copy(first.gateway.saveLegacy('archiveHabit',archivePayload)).commonUpserts.habits[0];assert.equal(archived.archived,'yes');assert.deepEqual(JSON.parse(archived.steps),JSON.parse(hack.commonUpserts.habits[0].steps));assert.deepEqual(copy(first.gateway.saveLegacy('habit',hp)),hack);assert.deepEqual(copy(first.gateway.migrate(gm)),migratedGoal);assert.deepEqual(first.rows,before);
// Frozen source divergence, duplicate rows, missing rows, or hidden canonical
// entities cannot silently reopen the legacy representation.
for(const rows of [{goals:[{...goal,title:'External'}],habits:[habit]},{goals:[goal,goal],habits:[habit]},{goals:[],habits:[habit]}]){
 const blocked=open(createCommitStore(scope,migrated),rows);assert.throws(()=>blocked.gateway.readRows('goals'),e=>e.name==='CommitBlocked');assert.throws(()=>blocked.gateway.saveLegacy('goal',gp),e=>e.name==='CommitBlocked');
}
const orphan=createCommitStore(scope);c.syncCatalogWriter_(orphan.store,scope).save({operationId:'synthetic-orphan-goal',changes:[{collection:'goals',id:goal.id,baseVersion:null,record:copy(first.gateway.preview('goals',goal.id).record)}]});assert.throws(()=>open(orphan).gateway.readOne('goals',goal.id),e=>e.name==='CommitBlocked');
const full=createCommitStore(scope);full.store.preflightWrites=items=>{assert.equal(items.filter(i=>i.kind==='head').reduce((n,i)=>n+i.writes,0),4);return {available:false};};assert.throws(()=>open(full).gateway.migrate(gm),e=>e.name==='ProtocolUnavailable');assert.equal(full.metrics().writes,0);
// Reserved edits freeze the dependency; prepared/confirmed edits replay their
// exact old snapshots even after the goal quarter or habit definition changes.
const reserved=createCommitStore(scope,migrated);reserved.fault(5,'after');assert.throws(()=>open(reserved).gateway.saveLegacy('habit',hp));
const resumed=createCommitStore(scope,reserved.snapshot()),r=open(resumed);const changed=copy(r.gateway.saveLegacy('goal',{...goal,cycle:'2027-Q1'})).commonUpserts.goals[0];assert.equal(changed.cycle,'2027-Q1');assert.throws(()=>r.gateway.saveLegacy('habit',hp),e=>e.name==='CommitBlocked');
const accepted=createCommitStore(scope,migrated);accepted.fault(7,'after');assert.throws(()=>open(accepted).gateway.saveLegacy('habit',hp));const recovered=createCommitStore(scope,accepted.snapshot()),reopen=open(recovered);const original=copy(reopen.gateway.saveLegacy('habit',hp));reopen.gateway.saveLegacy('goal',{...goal,cycle:'2027-Q1'});assert.deepEqual(copy(reopen.gateway.saveLegacy('habit',hp)),original);
// Allocation after plan publication is forbidden: reboot retains identity.
const pending=createCommitStore(scope,migrated);pending.fault(5,'after');assert.throws(()=>open(pending).gateway.saveLegacy('goal',create));const restart=open(createCommitStore(scope,pending.snapshot()));restart.raw.allocate=()=>{throw Error('UUID must not regenerate');};const restored=restart.gateway.saveLegacy('goal',create).commonUpserts.goals[0];assert.equal(restored.id,'synthetic-generated-1');
let cases=0;
for(const phase of ['before','after'])for(const kind of ['migrate','edit','create','archive']){
 const initial=kind==='migrate'?createCommitStore(scope).snapshot():migrated,measure=createCommitStore(scope,initial),invoke=g=>kind==='migrate'?g.migrate(gm):kind==='edit'?g.saveLegacy('habit',hp):kind==='create'?g.saveLegacy('goal',create):g.saveLegacy('archiveHabit',{id:habit.id,updatedAt:habit.updatedAt}),expected=copy(invoke(open(measure).gateway));
 for(let at=1;at<=measure.metrics().writes;at++){
  const f=createCommitStore(scope,initial);f.fault(at,phase);assert.throws(()=>invoke(open(f).gateway));const boot=open(createCommitStore(scope,f.snapshot())).gateway;boot.readRows('goals');boot.readRows('habits');assert.deepEqual(copy(invoke(boot)),expected);cases++;
 }
}
// The actual fragment adapter is interrupted at every migration write RPC.
const sheets=createFaultSheets(),ctx=context(sheets.globals),store=ctx.syncSheetsCommitStore_(sheets.index,sheets.blocks,archive,sheets.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));const initial=sheets.snapshot();sheets.reset();
const raw={read:(col,id)=>copy(col==='goals'&&id===goal.id?[goal]:col==='habits'&&id===habit.id?[habit]:[]),readRows:col=>copy(col==='goals'?[goal]:[habit]),allocate(){throw Error('unexpected');},saveLegacy(){throw Error('unexpected');}};
const gateway=ctx.syncCatalogMigrationGateway_(store,scope,raw);assert.deepEqual(copy(gateway.migrate(gm)),migratedGoal);const events=sheets.metrics().events.length;let sheetCases=0;
const sheetOpen=f=>{const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return ctx.syncCatalogMigrationGateway_(store,scope,raw);};
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const f=createFaultSheets(initial);f.fault(at,phase);assert.throws(()=>sheetOpen(f).migrate(gm));const boot=sheetOpen(createFaultSheets(f.snapshot()));assert.deepEqual(copy(boot.migrate(gm)),migratedGoal);assert.equal(boot.readRows('goals')[0].updatedAt,'commit-2');sheetCases++;
}
sheets.setAuthorized(false);assert.throws(()=>gateway.readRows('goals'),e=>e.name==='ScopeChanged');
console.log('Catalog migration gateway: frozen rows, atomic routes, explicit create intents/UUID replay, stable ACK/conflicts/archive, legacy version mapping, reserved vs accepted dependency recovery, preflight, '+cases+' unit and '+sheetCases+' Sheet faults OK; no real activation.');
