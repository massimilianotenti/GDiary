const vm=require("vm"),assert=require("assert");
const {createDayRoutingServer:open}=require("./helpers/day-routing-server.cjs");
const copy=value=>JSON.parse(JSON.stringify(value));
const ids={weeksSheetId:13,indexSheetId:11,blockSheetId:12},week="2026-09-28";
const seed={week,focus:'Focus sintetico',priorities:'Tre priorità',wins:'Origine',obstacles:'Tempo',lessons:'Ascolto',next:'Avanti',energy:'3',closed:'no'};
const first=open(undefined,{seedWeeks:[seed]}),ctl=first.weekController;assert.equal(ctl.status().registered,false);ctl.register(ids);
assert.throws(()=>first.ctx.saveWeek({...seed,week,updatedAt:'',wins:'Bloccata'}),error=>error.name==='ProtocolUnavailable');
ctl.setMode({mode:'active',expectedRevision:1});const preview=ctl.resolve().preview(week);ctl.resolve().migrate({week,expectedLegacy:preview.legacy,operationId:'synthetic-server-migration'});
const ack=copy(first.ctx.saveWeek({...seed,week,updatedAt:preview.legacy.updatedAt,wins:'Canonico tramite controller persistente 🌱'})).commonUpserts.weeks[0];
assert.equal(copy(first.ctx.getState({context:{view:'settings'}})).weeks.find(row=>row.week===week).updatedAt,ack.updatedAt);
const snapshot=first.snapshot(),reboot=open(snapshot);assert(vm.runInContext('WEEK_COMMIT_GATEWAY===null&&WEEK_ROUTING_CONTROLLER===null',reboot.ctx),'fresh server does not need in-memory injection');
const read=copy(reboot.ctx.getState({context:{view:'journal',commonWindow:'journal',month:'2026-10'}}));assert.equal(read.commonSlices.weeks.rows.find(row=>row.week===week).wins,ack.wins);
assert.equal(reboot.weekController.status().mode,'active');const manifest=copy(reboot.ctx.getSyncManifest());assert(!manifest.capabilities.operations&&!manifest.capabilities.changes&&!manifest.capabilities.localReadCache);
reboot.weekController.setMode({mode:'readOnly',expectedRevision:2});assert.equal(copy(reboot.ctx.getState({context:{view:'settings'}})).weeks.find(row=>row.week===week).wins,ack.wins);
assert.throws(()=>reboot.ctx.saveWeek({...seed,week,updatedAt:ack.updatedAt,wins:'Da bloccare'}),error=>error.name==='ProtocolUnavailable');
const paused=open(reboot.snapshot());assert.equal(paused.weekController.status().mode,'readOnly');assert.equal(copy(paused.ctx.getState({context:{view:'settings'}})).weeks.find(row=>row.week===week).updatedAt,ack.updatedAt);
assert.throws(()=>paused.ctx.syncWeekRoutingServer_().setMode({mode:'active',expectedRevision:3}),error=>error.name==='ProtocolUnavailable','default server has no operator permission');
const wrong=open(snapshot);vm.runInContext("mockProps.ROOT_ID='synthetic-other-root';",wrong.ctx);assert.throws(()=>wrong.ctx.saveWeek({...seed,week,updatedAt:ack.updatedAt,wins:'Da bloccare'}),error=>error.name==='ScopeChanged');
const denied=open(snapshot);vm.runInContext("mockSession.active='visitor@example.invalid';",denied.ctx);assert.throws(()=>denied.ctx.getState({context:{view:'settings'}}),error=>error.name==='ScopeChanged');
const missing=open(snapshot);vm.runInContext("delete mockProps.SYNC_WEEK_ROUTING_ANCHOR_V1;",missing.ctx);assert.throws(()=>missing.ctx.getState({context:{view:'settings'}}),error=>error.name==='ProtocolCorrupt');
// Readers recheck routing after a raw legacy read when activation races them.
const reader=open(snapshot);vm.runInContext(`{
 const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_WEEK_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
 const original=mockSheets.Weeks.getRange.bind(mockSheets.Weeks);let armed=true;
 mockSheets.Weeks.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);if(armed){armed=false;Object.assign(mockProps,saved);}return result;};}return range;};
}`,reader.ctx);
assert.equal(copy(reader.ctx.rows_(vm.runInContext('mockSheets.Weeks',reader.ctx),vm.runInContext('WEEK_HEADERS',reader.ctx))).find(row=>row.week===week).wins,ack.wins);
// Writers check again under the shared application lock before touching Weeks.
for(const batch of [false]){
 const writer=open(snapshot),before=JSON.stringify(writer.snapshot().rawSheets.Weeks);
 vm.runInContext(`{
  const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_WEEK_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
  LockService.getScriptLock=()=>({waitLock(){Object.assign(mockProps,saved);},tryLock(){return true;},releaseLock(){}});
 }`,writer.ctx);
 const payload={...seed,week,updatedAt:preview.legacy.updatedAt,wins:'Scrittura legacy da impedire'};
 assert.throws(()=>writer.ctx.saveWeek(payload),error=>error.name==='ScopeChanged');assert.equal(JSON.stringify(writer.snapshot().rawSheets.Weeks),before);
}
// Both registration orders require exactly one shared ledger and preserve
// independent domain modes after restarting without memory injection.
for(const order of ['day-first','week-first']){
 const both=open(undefined,{seedWeeks:[seed]}),d=both.controller,w=both.weekController;
 const dayIds={daysSheetId:10,indexSheetId:11,blockSheetId:12};
 if(order==='day-first'){
  d.register(dayIds);const before=both.snapshot();
  assert.throws(()=>w.register({...ids,indexSheetId:21}),error=>error.name==='ScopeChanged');
  assert.deepEqual(both.snapshot(),before,'split ledger registration changes nothing');w.register(ids);
 }else{
  w.register(ids);const before=both.snapshot();
  assert.throws(()=>d.register({...dayIds,blockSheetId:22}),error=>error.name==='ScopeChanged');
  assert.deepEqual(both.snapshot(),before);d.register(dayIds);
 }
 d.setMode({mode:'active',expectedRevision:1});w.setMode({mode:'active',expectedRevision:1});
 const dp=d.resolve().preview('2026-10-28'),wp=w.resolve().preview(week);
 d.resolve().migrate({date:dp.date,expectedLegacy:dp.legacy,operationId:'synthetic-both-day-migrate'});
 w.resolve().migrate({week,expectedLegacy:wp.legacy,operationId:'synthetic-both-week-migrate'});
 const dayAck=both.ctx.saveDay({date:dp.date,updatedAt:dp.legacy.updatedAt,reflection:'Giorno condiviso'}).commonUpserts.days[0];
 const weekAck=both.ctx.saveWeek({...wp.legacy,wins:'Settimana condivisa'}).commonUpserts.weeks[0];
 assert.equal(Number(weekAck.updatedAt.slice(7)),Number(dayAck.updatedAt.slice(7))+2);
 w.setMode({mode:'readOnly',expectedRevision:2});const restart=open(both.snapshot());
 assert.equal(restart.weekController.status().mode,'readOnly');assert.equal(restart.controller.status().mode,'active');
 const state=restart.ctx.getState({context:{view:'settings'}});
 assert.equal(state.weeks.find(row=>row.week===week).wins,'Settimana condivisa');assert.equal(state.days.find(row=>row.date===dp.date).reflection,'Giorno condiviso');
 assert.throws(()=>restart.ctx.saveWeek({...weekAck,wins:'Bloccato'}),error=>error.name==='ProtocolUnavailable');
 const live=restart.ctx.saveDay({date:dp.date,updatedAt:dayAck.updatedAt,reflection:'Giorno ancora attivo'}).commonUpserts.days[0];
 assert(live.updatedAt.startsWith('commit-'));assert.equal(restart.weekController.resolve().readRows().find(row=>row.week===week).updatedAt,weekAck.updatedAt);
 // A damaged or disappeared peer anchor is fail-closed in either direction.
 const missingPeer=open(both.snapshot());vm.runInContext('delete mockProps.SYNC_DAY_ROUTING_ANCHOR_V1;',missingPeer.ctx);
 assert.throws(()=>missingPeer.weekController.resolve(),error=>error.name==='ProtocolUnavailable');
 const corruptPeer=open(both.snapshot());vm.runInContext("mockProps.SYNC_WEEK_ROUTING_ANCHOR_V1='broken';",corruptPeer.ctx);
 assert.throws(()=>corruptPeer.controller.resolve(),error=>error.name==='ProtocolCorrupt');
}
console.log('Week routing server: real Demo entrypoints, fresh-server property reload, authorized sheet IDs/identity, persistent readOnly mode, no default operator permission, unchanged manifest, activation read/write races and no legacy fallback OK.');
