const vm=require('vm'),assert=require('assert');
const {createDayRoutingServer:open}=require('./helpers/day-routing-server.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
const ids={habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16};
const first=open(undefined,{seedPractices:[{steps:'Prima 🌱\nSeconda',checkedIndices:[0]}]}),ctl=first.habitLogController,{habit,log}=first.practices[0],key=log.key,date=log.date;
const payload={habitId:habit.id,date,status:'pending',checked:JSON.parse(habit.steps).map(s=>s.id),habitUpdatedAt:habit.updatedAt,updatedAt:log.updatedAt};
assert.equal(ctl.status().registered,false);ctl.register(ids);assert.throws(()=>first.ctx.setHabitLog(payload),e=>e.name==='ProtocolUnavailable');
ctl.setMode({mode:'active',expectedRevision:1});const preview=ctl.resolve().preview(key);ctl.resolve().migrate({key,expectedLegacy:preview.legacy,expectedCatalog:preview.catalog,record:preview.record,operationId:'synthetic-log-server-migrate'});
const ack=copy(first.ctx.setHabitLog(payload)).commonUpserts.habitLogs[0];assert.equal(ack.status,'done');
const snapshot=first.snapshot(),boot=open(snapshot);assert(vm.runInContext('HABIT_LOG_COMMIT_GATEWAY===null&&HABIT_LOG_ROUTING_CONTROLLER===null',boot.ctx));
for(const context of [{view:'settings'},{view:'journal',commonWindow:'journal',month:'2026-10'},{view:'week',commonWindow:'week',week:'2026-10-26'},{view:'habits',commonWindow:'habits',week:'2026-10-26',date}]){
 const state=copy(boot.ctx.getState({context})),rows=state.habitLogs||state.commonSlices.habitLogs.rows;assert.equal(rows.find(row=>row.key===key).updatedAt,ack.updatedAt);
}
const manifest=copy(boot.ctx.getSyncManifest());assert(!manifest.capabilities.operations&&!manifest.capabilities.changes&&!manifest.capabilities.localReadCache);
boot.habitLogController.setMode({mode:'readOnly',expectedRevision:2});assert.throws(()=>boot.ctx.setHabitLog({...payload,updatedAt:ack.updatedAt,status:'skipped'}),e=>e.name==='ProtocolUnavailable');
const paused=open(boot.snapshot());assert.equal(paused.habitLogController.status().mode,'readOnly');assert.equal(paused.habitLogController.resolve().readRows().find(row=>row.key===key).status,'done');
assert.throws(()=>paused.ctx.syncHabitLogRoutingServer_().setMode({mode:'active',expectedRevision:3}),e=>e.name==='ProtocolUnavailable');
const wrong=open(snapshot);vm.runInContext("mockProps.ROOT_ID='foreign-root';",wrong.ctx);assert.throws(()=>wrong.ctx.setHabitLog(payload),e=>e.name==='ScopeChanged');
const denied=open(snapshot);vm.runInContext("mockSession.active='visitor@example.invalid';",denied.ctx);assert.throws(()=>denied.ctx.getState({context:{view:'settings'}}),e=>e.name==='ScopeChanged');
const missing=open(snapshot);vm.runInContext('delete mockProps.SYNC_HABIT_LOG_ROUTING_ANCHOR_V1;',missing.ctx);assert.throws(()=>missing.ctx.getState({context:{view:'settings'}}),e=>e.name==='ProtocolCorrupt');
// An activation race cannot expose an old preimage or bypass the commit writer.
const reader=open(snapshot);vm.runInContext(`{
 const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_HABIT_LOG_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
 const original=mockSheets.HabitLogs.getRange.bind(mockSheets.HabitLogs);let armed=true;
 mockSheets.HabitLogs.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);if(armed){armed=false;Object.assign(mockProps,saved);}return result;};}return range;};
}`,reader.ctx);
assert.equal(reader.ctx.rows_(vm.runInContext('mockSheets.HabitLogs',reader.ctx),vm.runInContext('LOG_HEADERS',reader.ctx)).find(row=>row.key===key).status,'done');
const writer=open(snapshot),before=JSON.stringify(writer.snapshot().rawSheets.HabitLogs);vm.runInContext(`{
 const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_HABIT_LOG_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
 LockService.getScriptLock=()=>({waitLock(){Object.assign(mockProps,saved);},tryLock(){return true;},releaseLock(){}});
}`,writer.ctx);
assert.throws(()=>writer.ctx.setHabitLog(payload),e=>e.name==='ScopeChanged');assert.equal(JSON.stringify(writer.snapshot().rawSheets.HabitLogs),before);
// All six registration orders enforce a shared ledger and stable role bindings.
const orders=[['day','week','log'],['day','log','week'],['week','day','log'],['week','log','day'],['log','day','week'],['log','week','day']];
for(const order of orders){
 const f=open(undefined,{seedPractices:[{steps:'Passo'}]}),controllers={day:f.controller,week:f.weekController,log:f.habitLogController},bindings={day:{daysSheetId:10,indexSheetId:11,blockSheetId:12},week:{weeksSheetId:13,indexSheetId:11,blockSheetId:12},log:ids};
 for(const [i,name]of order.entries()){
  if(i){const before=f.snapshot();assert.throws(()=>controllers[name].register({...bindings[name],indexSheetId:21}),e=>e.name==='ScopeChanged');assert.deepEqual(f.snapshot(),before);}
  controllers[name].register(bindings[name]);controllers[name].setMode({mode:'active',expectedRevision:1});
 }
 const {habit:h,log:l}=f.practices[0],p=controllers.log.resolve().preview(l.key);
 controllers.log.resolve().migrate({key:l.key,expectedLegacy:p.legacy,expectedCatalog:p.catalog,record:p.record,operationId:'synthetic-three-log-migrate'});
 const dp=controllers.day.resolve().preview('2026-10-28');controllers.day.resolve().migrate({date:dp.date,expectedLegacy:dp.legacy,operationId:'synthetic-three-day-migrate'});
 const dayAck=f.ctx.saveDay({date:dp.date,updatedAt:dp.legacy.updatedAt,reflection:'Giorno condiviso'}).commonUpserts.days[0];
 const logAck=f.ctx.setHabitLog({habitId:h.id,date:l.date,status:'pending',checked:JSON.parse(h.steps).map(s=>s.id),habitUpdatedAt:h.updatedAt,updatedAt:l.updatedAt}).commonUpserts.habitLogs[0];
 assert.equal(Number(logAck.updatedAt.slice(7)),Number(dayAck.updatedAt.slice(7))+2);
 controllers.log.setMode({mode:'readOnly',expectedRevision:2});const reboot=open(f.snapshot());assert.equal(reboot.habitLogController.status().mode,'readOnly');assert.equal(reboot.controller.status().mode,'active');assert.equal(reboot.weekController.status().mode,'active');
 assert.equal(reboot.habitLogController.resolve().readRows().find(row=>row.key===l.key).updatedAt,logAck.updatedAt);
 assert(reboot.ctx.saveDay({date:dp.date,updatedAt:dayAck.updatedAt,reflection:'Giorno ancora attivo'}).commonUpserts.days[0].updatedAt.startsWith('commit-'));
 const bad=open(f.snapshot());vm.runInContext("mockProps.SYNC_HABIT_LOG_ROUTING_ANCHOR_V1='corrupt';",bad.ctx);assert.throws(()=>bad.controller.resolve(),e=>e.name==='ProtocolCorrupt');assert.throws(()=>bad.weekController.resolve(),e=>e.name==='ProtocolCorrupt');
}
// Dependency sheets cannot silently move, be renamed or be substituted.
for(const name of ['Habits','Goals']){
 const moved=open(snapshot);vm.runInContext(`mockSheets.${name}.getParent=()=>({getId:()=>'foreign-db'});`,moved.ctx);assert.throws(()=>moved.habitLogController.resolve(),e=>e.name==='ScopeChanged');
 const renamed=open(snapshot);vm.runInContext(`mockSheets.${name}.getName=()=>'Foreign';`,renamed.ctx);assert.throws(()=>renamed.habitLogController.resolve(),e=>e.name==='ScopeChanged');
}
const shared=open(undefined,{seedPractices:[{steps:'Passo storico'}]}),catalog=shared.ctx.syncCatalogRoutingServer_({allowConfigure:true,allowMigration:true}),catalogIds={goalsSheetId:16,habitsSheetId:15,indexSheetId:11,blockSheetId:12};
assert.equal(catalog.status().registered,false);assert.equal(catalog.register(catalogIds).mode,'readOnly');
const logIds={habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16};assert.equal(shared.habitLogController.register(logIds).mode,'readOnly');
catalog.setMode({mode:'active',expectedRevision:1});shared.habitLogController.setMode({mode:'active',expectedRevision:1});
const goal=shared.practices[0].goal,facade=catalog.resolve(),gp=facade.preview('goals',goal.id);
facade.migrate({operationId:'synthetic-catalog-log-shared-migration',collection:'goals',id:goal.id,expectedLegacy:gp.legacy});
assert(facade.readRows('goals').some(row=>row.id===goal.id));assert(facade.saveLegacy('goal',{...goal,title:'Goal condiviso',context:{incrementalCommon:true}}).commonUpserts.goals[0].title==='Goal condiviso');
const reboot=open(shared.snapshot());assert.equal(reboot.ctx.catalogCommitGateway_().readRows('goals').find(row=>row.id===goal.id).title,'Goal condiviso');
function permutations(values){if(values.length<2)return [values];return values.flatMap((value,index)=>permutations(values.filter((_,i)=>i!==index)).map(rest=>[value,...rest]));}
for(const order of permutations(['day','week','log','catalog'])){
 const f=open(),controllers={day:f.controller,week:f.weekController,log:f.habitLogController,catalog:f.ctx.syncCatalogRoutingServer_({allowConfigure:true,allowMigration:true})},bindings={day:{daysSheetId:10,indexSheetId:11,blockSheetId:12},week:{weeksSheetId:13,indexSheetId:11,blockSheetId:12},log:logIds,catalog:catalogIds},registered=new Set();
 for(const [index,name]of order.entries()){
  if((name==='log'&&registered.has('catalog'))||(name==='catalog'&&registered.has('log'))){
   const before=f.snapshot(),wrong={...bindings[name],goalsSheetId:bindings[name].habitsSheetId,habitsSheetId:bindings[name].goalsSheetId};
   assert.throws(()=>controllers[name].register(wrong),error=>error.name==='ScopeChanged');assert.deepEqual(f.snapshot(),before,'a role-swapped catalog binding must be rejected without writes');
  }
  controllers[name].register(bindings[name]);controllers[name].setMode({mode:'active',expectedRevision:1});registered.add(name);
 }
 assert(controllers.day.status().mode==='active'&&controllers.week.status().mode==='active'&&controllers.log.status().mode==='active'&&controllers.catalog.status().mode==='active');
}
console.log('Catalog server: anchor-gated resolution, explicit readOnly registration, shared Goals/Habits role binding with HabitLogs, migration/edit and persistent reboot OK.');
console.log('Habit log server: real Demo entrypoints/restarts, five bound sheets, full/period canonical reads, persistent readOnly, activation races, all six Days/Weeks/Logs orders and all 24 Days/Weeks/HabitLogs/Catalog orders, shared head, independent modes, role-swap barriers and no default operator/manifest enablement OK.');
