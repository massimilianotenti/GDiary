const vm=require('vm'),assert=require('assert');
const {createDayRoutingServer:open}=require('./helpers/day-routing-server.cjs');
const ids={day:{daysSheetId:10,indexSheetId:11,blockSheetId:12},week:{weeksSheetId:13,indexSheetId:11,blockSheetId:12},log:{habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16}};
const f=open(undefined,{seedWeeks:[{week:'2026-10-26',focus:'Focus condiviso',priorities:'Priorità',wins:'Bene',obstacles:'Tempo',lessons:'Ascolto',next:'Avanti',energy:'3',closed:'no'}],seedPractices:[{steps:'Passo storico'}]});
const controllers={day:f.controller,week:f.weekController,log:f.habitLogController};for(const kind of ['day','week','log']){controllers[kind].register(ids[kind]);controllers[kind].setMode({mode:'active',expectedRevision:1});}
const day=controllers.day.resolve().preview('2026-10-28');controllers.day.resolve().migrate({date:day.date,expectedLegacy:day.legacy,operationId:'synthetic-composed-day'});
const week=controllers.week.resolve().preview('2026-10-26');controllers.week.resolve().migrate({week:week.week,expectedLegacy:week.legacy,operationId:'synthetic-composed-week'});
const log=controllers.log.resolve().preview(f.practices[0].log.key);controllers.log.resolve().migrate({key:log.key,expectedLegacy:log.legacy,expectedCatalog:log.catalog,record:log.record,operationId:'synthetic-composed-log'});
const facade=controllers.day.resolve(),before=f.snapshot();f.ctx.reader=facade;
vm.runInContext(`{
 globalThis.composition={locks:0,releases:0,nested:[],denied:[]};
 const actualLock=LockService.getScriptLock;globalThis.restoreCompositionLock=()=>LockService.getScriptLock=actualLock;
 LockService.getScriptLock=()=>{const lock=actualLock();return {tryLock(timeout){composition.locks++;return lock.tryLock(timeout);},waitLock(timeout){composition.locks++;return lock.waitLock(timeout);},releaseLock(){composition.releases++;lock.releaseLock();}};};
 const original=mockSheets.Days.getRange.bind(mockSheets.Days);globalThis.restoreCompositionRange=()=>mockSheets.Days.getRange=original;let armed=true;
 mockSheets.Days.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{
  const result=get.call(range);if(armed){armed=false;
   const weekly=syncWeekRoutingServer_().resolve().readRows(),logs=syncHabitLogRoutingServer_().resolve().readRows();
   composition.nested=[weekly.find(row=>row.week==='2026-10-26').updatedAt,logs.find(row=>row.habitId==='${f.practices[0].habit.id}').updatedAt];
   const mutations=[()=>syncWeekRoutingServer_().resolve().saveLegacy({}),()=>syncHabitLogRoutingServer_({allowMigration:true}).resolve().migrate({}),()=>syncDayRoutingServer_({allowConfigure:true}).setMode({mode:'readOnly',expectedRevision:2}),()=>syncWeekRoutingServer_({allowConfigure:true}).register({weeksSheetId:13,indexSheetId:11,blockSheetId:12})];
   mutations.forEach(fn=>{try{fn();throw Error('Nested write was accepted');}catch(error){if(error.name!=='ProtocolUnavailable')throw error;composition.denied.push(error.name);}});
  }return result;
 };}return range;};
}`,f.ctx);
assert(facade.readRows().find(row=>row.date===day.date).updatedAt.startsWith('commit-'));
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(composition)',f.ctx)),{locks:1,releases:1,nested:['commit-4','commit-6'],denied:Array(4).fill('ProtocolUnavailable')});
assert.equal(vm.runInContext('SYNC_ROUTING_SERVER_LOCK_DEPTH',f.ctx),0);assert.deepEqual(f.snapshot(),before,'nested reads and denied writes do not alter any row/property/commit');
// The same rules hold when an existing legacy application lock owns the root.
vm.runInContext('restoreCompositionRange();restoreCompositionLock();',f.ctx);
f.ctx.logKey=log.key;vm.runInContext(`{
 const original=mockSheets.Days.getRange.bind(mockSheets.Days);let armed=true;globalThis.appNestedReads=0;globalThis.appDenied=0;
 mockSheets.Days.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);if(armed){armed=false;syncHabitLogRoutingServer_().resolve().readRows();appNestedReads++;try{syncWeekRoutingServer_().resolve().saveLegacy({});throw Error('write accepted');}catch(error){if(error.name!=='ProtocolUnavailable')throw error;appDenied++;}}return result;};}return range;};
 locked_(()=>reader.readRows(),true,true);mockSheets.Days.getRange=original;
}`,f.ctx);
assert.equal(vm.runInContext('appNestedReads',f.ctx),1);assert.equal(vm.runInContext('appDenied',f.ctx),1);assert.equal(vm.runInContext('SYNC_ROUTING_SERVER_LOCK_DEPTH',f.ctx),0);assert.deepEqual(f.snapshot(),before);
// Inheriting a lock never substitutes for each reader's live authorization.
vm.runInContext(`{
 const original=mockSheets.Days.getRange.bind(mockSheets.Days);let armed=true;globalThis.nestedScopeDenied=0;
 mockSheets.Days.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);if(armed){armed=false;const root=mockProps.ROOT_ID;mockProps.ROOT_ID='synthetic-foreign-root';try{syncHabitLogRoutingServer_().resolve().readRows();throw Error('scope accepted');}catch(error){if(error.name!=='ScopeChanged')throw error;nestedScopeDenied++;}finally{mockProps.ROOT_ID=root;}}return result;};}return range;};
 reader.readRows();mockSheets.Days.getRange=original;
}`,f.ctx);
assert.equal(vm.runInContext('nestedScopeDenied',f.ctx),1);assert.equal(vm.runInContext('SYNC_ROUTING_SERVER_LOCK_DEPTH',f.ctx),0);assert.deepEqual(f.snapshot(),before);
// Failed source reads release ownership; the next root request works normally.
vm.runInContext(`{
 const original=mockSheets.Days.getRange.bind(mockSheets.Days);let armed=true;
 mockSheets.Days.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{if(armed){armed=false;throw Error('Synthetic read failure');}return get.call(range);};}return range;};
}`,f.ctx);
assert.throws(()=>facade.readRows(),error=>error.name==='StorageError');assert.equal(vm.runInContext('SYNC_ROUTING_SERVER_LOCK_DEPTH',f.ctx),0);assert(facade.readRows().length>0);assert.deepEqual(f.snapshot(),before);
// A busy root lock does not establish an inherited transaction token.
vm.runInContext(`globalThis.beforeBusyLock=LockService.getScriptLock;LockService.getScriptLock=()=>({tryLock(){return false;},releaseLock(){throw Error('unowned release');}});`,f.ctx);
assert.throws(()=>facade.readRows(),error=>error.name==='BusyError');assert.equal(vm.runInContext('SYNC_ROUTING_SERVER_LOCK_DEPTH',f.ctx),0);vm.runInContext('LockService.getScriptLock=beforeBusyLock;',f.ctx);
assert(facade.readRows().length>0);
console.log('Routing lock composition: cross-domain canonical reads use one inherited server or legacy lock, nested saves/migrations/registration/mode changes denied without writes, scope checks retained, busy/failure ownership cleanup and later root recovery OK.');
