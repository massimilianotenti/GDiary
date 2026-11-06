const assert=require('node:assert/strict'),{createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const copy=value=>JSON.parse(JSON.stringify(value)),date='2026-11-06',other='2026-11-07',context={incrementalCommon:true};
let server=createDayRoutingServer(null,{seedDays:[{date,intention:'Mattina',reflection:'Sera',gratitude:'Campo estraneo'}]});
server.controller.register({daysSheetId:10,indexSheetId:11,blockSheetId:12});server.controller.setMode({mode:'active',expectedRevision:1});
let gateway=server.controller.resolve(),preview=gateway.preview(date);gateway.migrate({operationId:'synthetic-day-outbox-migration',date,expectedLegacy:preview.legacy});
const scope={...server.scope,protocolVersion:1,schemaVersion:1};
const frozen=copy(server.snapshot().days),current=()=>gateway.readRows([{from:date,to:date}])[0],snapshot=()=>{const {updatedAt,...row}=copy(current());return row;};
const input={operationId:'synthetic-day-outbox-save-001',baseVersion:current().updatedAt,day:{...snapshot(),reflection:'  Testo conservato 🌱  ',reflectionRich:JSON.stringify([{kind:'p',runs:[{text:'  Testo conservato 🌱  ',italic:true}]}])}};
const beforeOperation=server.snapshot();
assert.throws(()=>server.ctx.saveDayOperation({operation:input,scope:{...scope,epoch:'different-epoch'}}),error=>error.name==='ScopeChanged');
server.ledger.reset();
const response=copy(server.ctx.saveDayOperation({operation:input,scope,context}));const operationEvents=server.ledger.metrics().events.length;assert.equal(response.day.reflection,input.day.reflection);assert.equal(response.day.gratitude,'Campo estraneo');
assert.deepEqual(copy(server.ctx.saveDayOperation({operation:input,scope})),response);
const receipt=()=>copy(server.ctx.getDayOperationReceipt({request:input,scope}));assert.equal(receipt().status,'committed');assert.equal(receipt().version,response.day.updatedAt);
assert.throws(()=>server.ctx.getDayOperationReceipt({request:{...input,day:{...input.day,reflection:'Altro',reflectionRich:''}},scope}),e=>e.name==='OperationMismatch');
assert.throws(()=>server.ctx.getDayOperationReceipt({request:input,scope:{...scope,principalId:'different-principal'}}),e=>e.name==='ScopeChanged');
const stale={...input,operationId:'synthetic-day-outbox-stale-001'};assert.throws(()=>server.ctx.saveDayOperation({operation:stale,scope}),e=>e.name==='ConflictError');assert.equal(copy(server.ctx.getDayOperationReceipt({request:stale,scope})).status,'conflict');
const unknown={...input,operationId:'synthetic-day-outbox-unknown-001'};assert.equal(copy(server.ctx.getDayOperationReceipt({request:unknown,scope})).status,'unknown');
const fresh={operationId:'synthetic-day-outbox-create-001',baseVersion:null,day:{...snapshot(),date:other,reflection:'Nuova giornata',reflectionRich:''}};
const beforeCreate=server.snapshot();server.ledger.reset();const created=copy(server.ctx.saveDayOperation({operation:fresh,scope}));const createEvents=server.ledger.metrics().events.length;assert.equal(created.day.date,other);assert.equal(copy(server.ctx.getDayOperationReceipt({request:fresh,scope})).version,created.day.updatedAt);
server=createDayRoutingServer(server.snapshot());gateway=server.controller.resolve();assert.deepEqual(copy(server.ctx.saveDayOperation({operation:input,scope})),response,'lost ACK replays original snapshot after restart and newer commits');assert.deepEqual(copy(server.ctx.saveDayOperation({operation:fresh,scope})),created);
assert.deepEqual(copy(server.snapshot().days),frozen,'no legacy writes');
assert.equal(copy(server.ctx.getDayOperationState({date:other,scope})).day.reflection,'Nuova giornata');assert.equal(copy(server.ctx.getDayOperationState({date:'2026-11-08',scope})).missing,true);
server.controller.setMode({mode:'readOnly',expectedRevision:server.controller.status().revision});assert.throws(()=>server.ctx.saveDayOperation({operation:{...input,operationId:'synthetic-day-outbox-readonly-001'},scope}),e=>e.name==='ProtocolUnavailable');assert.equal(copy(server.ctx.getDayOperationReceipt({request:input,scope})).status,'committed');
let recoveries=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=operationEvents;at++){
 const trial=createDayRoutingServer(beforeOperation);trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.ctx.saveDayOperation({operation:input,scope});}catch(error){assert(['StorageError','ProtocolUnavailable','CommitBlocked','ProtocolCorrupt'].includes(error.name),phase+' '+at+': '+error.name);}
 const reboot=createDayRoutingServer(trial.snapshot());assert.deepEqual(copy(reboot.ctx.saveDayOperation({operation:input,scope})),response,phase+' '+at+': stable full-snapshot ACK after recovery');recoveries++;
}
let createRecoveries=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=createEvents;at++){
 const trial=createDayRoutingServer(beforeCreate);trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.ctx.saveDayOperation({operation:fresh,scope});}catch(error){assert(['StorageError','ProtocolUnavailable','CommitBlocked','ProtocolCorrupt'].includes(error.name),phase+' create '+at+': '+error.name);}
 const reboot=createDayRoutingServer(trial.snapshot());assert.deepEqual(copy(reboot.ctx.saveDayOperation({operation:fresh,scope})),created,phase+' create '+at+': day and route/directory recover with the original receipt');createRecoveries++;
}
console.log('Day outbox canonical create: '+createRecoveries+' Sheet/Range before/after/partial interruption recoveries OK');
console.log('Day outbox full-snapshot update: '+recoveries+' Sheet/Range before/after/partial interruption recoveries OK');
console.log('Day outbox server: full snapshots/rich/whitespace, untouched fields, canonical create, stable ACK after restart, payload/scope rejection, durable conflicts, unknown receipts and readOnly without legacy writes OK');
