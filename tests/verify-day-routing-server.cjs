const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs'),{seal}=require('./helpers/recoverable-commit-store.cjs');
const backend=fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],copy=value=>JSON.parse(JSON.stringify(value));
const ids={daysSheetId:10,indexSheetId:11,blockSheetId:12},date='2026-10-28';
function open(snapshot){
 const ledger=createFaultSheets(snapshot?.ledger),ctx=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});vm.runInContext(backend,ctx);
 if(snapshot){ctx.restored=snapshot;vm.runInContext('Object.assign(mockProps,restored.props);restored.users.forEach(([key,value])=>mockUserProperties.set(key,value));mockSheets.Days.data=restored.days;',ctx);}
 else ctx.saveDay({date,updatedAt:'',reflection:'Riga originaria sintetica'});
 const manifest=copy(ctx.getSyncManifest()),scope={archiveId:manifest.archiveId,epoch:manifest.epoch,principalId:manifest.principalId};assert(manifest.identityVerified);
 ctx.syntheticLedger=ledger;ctx.syntheticUtilities=ledger.globals.Utilities;
 vm.runInContext(`Object.assign(Utilities,syntheticUtilities);SpreadsheetApp.flush=syntheticLedger.globals.SpreadsheetApp.flush;
  mockSheets.Days.getSheetId=()=>10;mockSheets.Days.getParent=()=>db;
  syntheticLedger.index.getSheetId=()=>11;syntheticLedger.index.getParent=()=>db;
  syntheticLedger.blocks.getSheetId=()=>12;syntheticLedger.blocks.getParent=()=>db;
  db.getSheetById=id=>({10:mockSheets.Days,11:syntheticLedger.index,12:syntheticLedger.blocks})[id];`,ctx);
 if(!snapshot){const store=ctx.syncSheetsCommitStore_(ledger.index,ledger.blocks,{archiveId:scope.archiveId,epoch:scope.epoch},ledger.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive:{archiveId:scope.archiveId,epoch:scope.epoch},committedThrough:0,pending:null})));}
 return {ctx,ledger,scope,controller:ctx.syncDayRoutingServer_({allowConfigure:true,allowMigration:true}),
  snapshot(){return {...copy(vm.runInContext('({props:mockProps,users:[...mockUserProperties],days:mockSheets.Days.data})',ctx)),ledger:ledger.snapshot()};}};
}
const first=open(),ctl=first.controller;assert.equal(ctl.status().registered,false);ctl.register(ids);
assert.throws(()=>first.ctx.saveDay({date,updatedAt:'',reflection:'Bloccata'}),error=>error.name==='ProtocolUnavailable');
ctl.setMode({mode:'active',expectedRevision:1});const preview=ctl.resolve().preview(date);ctl.resolve().migrate({date,expectedLegacy:preview.legacy,operationId:'synthetic-server-migration'});
const ack=copy(first.ctx.saveDay({date,updatedAt:preview.legacy.updatedAt,reflection:'Canonico tramite controller persistente 🌱'})).commonUpserts.days[0];
assert.equal(copy(first.ctx.getState({context:{view:'settings'}})).days.find(row=>row.date===date).updatedAt,ack.updatedAt);
const snapshot=first.snapshot(),reboot=open(snapshot);assert(vm.runInContext('DAY_COMMIT_GATEWAY===null&&DAY_ROUTING_CONTROLLER===null',reboot.ctx),'fresh server does not need in-memory injection');
const read=copy(reboot.ctx.getState({context:{view:'journal',commonWindow:'journal',month:'2026-10'}}));assert.equal(read.commonSlices.days.rows.find(row=>row.date===date).reflection,ack.reflection);
assert.equal(reboot.controller.status().mode,'active');const manifest=copy(reboot.ctx.getSyncManifest());assert(!manifest.capabilities.operations&&!manifest.capabilities.changes&&!manifest.capabilities.localReadCache);
reboot.controller.setMode({mode:'readOnly',expectedRevision:2});assert.equal(copy(reboot.ctx.getState({context:{view:'settings'}})).days.find(row=>row.date===date).reflection,ack.reflection);
assert.throws(()=>reboot.ctx.saveDays({days:[{date,updatedAt:ack.updatedAt,reflection:'Da bloccare'}]}),error=>error.name==='ProtocolUnavailable');
const paused=open(reboot.snapshot());assert.equal(paused.controller.status().mode,'readOnly');assert.equal(copy(paused.ctx.getState({context:{view:'settings'}})).days.find(row=>row.date===date).updatedAt,ack.updatedAt);
assert.throws(()=>paused.ctx.syncDayRoutingServer_().setMode({mode:'active',expectedRevision:3}),error=>error.name==='ProtocolUnavailable','default server has no operator permission');
const wrong=open(snapshot);vm.runInContext("mockProps.ROOT_ID='synthetic-other-root';",wrong.ctx);assert.throws(()=>wrong.ctx.saveDay({date,updatedAt:ack.updatedAt,reflection:'Da bloccare'}),error=>error.name==='ScopeChanged');
const denied=open(snapshot);vm.runInContext("mockSession.active='visitor@example.invalid';",denied.ctx);assert.throws(()=>denied.ctx.getState({context:{view:'settings'}}),error=>error.name==='ScopeChanged');
const missing=open(snapshot);vm.runInContext("delete mockProps.SYNC_DAY_ROUTING_ANCHOR_V1;",missing.ctx);assert.throws(()=>missing.ctx.getState({context:{view:'settings'}}),error=>error.name==='ProtocolCorrupt');
// Readers recheck routing after a raw legacy read when activation races them.
const reader=open(snapshot);vm.runInContext(`{
 const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_DAY_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
 const original=mockSheets.Days.getRange.bind(mockSheets.Days);let armed=true;
 mockSheets.Days.getRange=(...args)=>{const range=original(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);if(armed){armed=false;Object.assign(mockProps,saved);}return result;};}return range;};
}`,reader.ctx);
assert.equal(copy(reader.ctx.rows_(vm.runInContext('mockSheets.Days',reader.ctx),vm.runInContext('DAY_HEADERS',reader.ctx))).find(row=>row.date===date).reflection,ack.reflection);
// Writers check again under the shared application lock before touching Days.
for(const batch of [false,true]){
 const writer=open(snapshot),before=JSON.stringify(writer.snapshot().days);
 vm.runInContext(`{
  const saved=Object.fromEntries(Object.entries(mockProps).filter(([key])=>key.startsWith('SYNC_DAY_ROUTING_')));Object.keys(saved).forEach(key=>delete mockProps[key]);
  LockService.getScriptLock=()=>({waitLock(){Object.assign(mockProps,saved);},tryLock(){return true;},releaseLock(){}});
 }`,writer.ctx);
 const payload={date,updatedAt:preview.legacy.updatedAt,reflection:'Scrittura legacy da impedire'};
 assert.throws(()=>batch?writer.ctx.saveDays({days:[payload]}):writer.ctx.saveDay(payload),error=>error.name==='ScopeChanged');assert.equal(JSON.stringify(writer.snapshot().days),before);
}
console.log('Day routing server: real Demo entrypoints, fresh-server property reload, authorized sheet IDs/identity, persistent readOnly mode, no default operator permission, unchanged manifest, activation read/write races and no legacy fallback OK.');
