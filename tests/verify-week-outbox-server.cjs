const assert=require('node:assert/strict'),{createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const copy=value=>JSON.parse(JSON.stringify(value)),week='2026-11-02',other='2026-11-09',context={incrementalCommon:true};
let server=createDayRoutingServer(null,{seedWeeks:[{week,focus:'Mattina',wins:'Sera',priorities:'Campo estraneo',obstacles:'',lessons:'',next:'',energy:'3',closed:'no'}]});
server.weekController.register({weeksSheetId:13,indexSheetId:11,blockSheetId:12});server.weekController.setMode({mode:'active',expectedRevision:1});
let gateway=server.weekController.resolve(),preview=gateway.preview(week);gateway.migrate({operationId:'synthetic-week-outbox-migration',week,expectedLegacy:preview.legacy});
const scope={...server.scope,protocolVersion:1,schemaVersion:1};
const frozen=copy(server.snapshot().rawSheets.Weeks),current=()=>gateway.readRows([{from:week,to:week}])[0],snapshot=()=>{const {updatedAt,...row}=copy(current());return row;};
const input={operationId:'synthetic-week-outbox-save-001',baseVersion:current().updatedAt,week:{...snapshot(),wins:'  Testo conservato 🌱  '}};
assert.throws(()=>server.ctx.saveWeekOperation({scope,operation:{...input,week:{...input.week,week:'2026-11-03'}}}),error=>error.name==='DataError');
assert.throws(()=>server.ctx.saveWeekOperation({scope,operation:{...input,week:{...input.week,energy:'6'}}}),error=>error.name==='DataError');
const beforeOperation=server.snapshot();
assert.throws(()=>server.ctx.saveWeekOperation({operation:input,scope:{...scope,epoch:'different-epoch'}}),error=>error.name==='ScopeChanged');
server.ledger.reset();
const response=copy(server.ctx.saveWeekOperation({operation:input,scope,context}));const operationEvents=server.ledger.metrics().events.length;assert.equal(response.week.wins,input.week.wins);assert.equal(response.week.priorities,'Campo estraneo');
assert.deepEqual(copy(server.ctx.saveWeekOperation({operation:input,scope})),response);
const receipt=()=>copy(server.ctx.getWeekOperationReceipt({request:input,scope}));assert.equal(receipt().status,'committed');assert.equal(receipt().version,response.week.updatedAt);
assert.throws(()=>server.ctx.getWeekOperationReceipt({request:{...input,week:{...input.week,wins:'Altro'}},scope}),e=>e.name==='OperationMismatch');
assert.throws(()=>server.ctx.getWeekOperationReceipt({request:input,scope:{...scope,principalId:'different-principal'}}),e=>e.name==='ScopeChanged');
const stale={...input,operationId:'synthetic-week-outbox-stale-001'};assert.throws(()=>server.ctx.saveWeekOperation({operation:stale,scope}),e=>e.name==='ConflictError');assert.equal(copy(server.ctx.getWeekOperationReceipt({request:stale,scope})).status,'conflict');
const unknown={...input,operationId:'synthetic-week-outbox-unknown-001'};assert.equal(copy(server.ctx.getWeekOperationReceipt({request:unknown,scope})).status,'unknown');
const fresh={operationId:'synthetic-week-outbox-create-001',baseVersion:null,week:{...snapshot(),week:other,wins:'Nuova settimana'}};
const beforeCreate=server.snapshot();server.ledger.reset();const created=copy(server.ctx.saveWeekOperation({operation:fresh,scope}));const createEvents=server.ledger.metrics().events.length;assert.equal(created.week.week,other);assert.equal(copy(server.ctx.getWeekOperationReceipt({request:fresh,scope})).version,created.week.updatedAt);
server=createDayRoutingServer(server.snapshot());gateway=server.weekController.resolve();assert.deepEqual(copy(server.ctx.saveWeekOperation({operation:input,scope})),response,'lost ACK replays original snapshot after restart and newer commits');assert.deepEqual(copy(server.ctx.saveWeekOperation({operation:fresh,scope})),created);
assert.deepEqual(copy(server.snapshot().rawSheets.Weeks),frozen,'no legacy writes');
assert.equal(copy(server.ctx.getWeekOperationState({week:other,scope})).weekRecord.wins,'Nuova settimana');assert.equal(copy(server.ctx.getWeekOperationState({week:'2026-11-16',scope})).missing,true);
server.weekController.setMode({mode:'readOnly',expectedRevision:server.weekController.status().revision});assert.throws(()=>server.ctx.saveWeekOperation({operation:{...input,operationId:'synthetic-week-outbox-readonly-001'},scope}),e=>e.name==='ProtocolUnavailable');assert.equal(copy(server.ctx.getWeekOperationReceipt({request:input,scope})).status,'committed');
let recoveries=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=operationEvents;at++){
 const trial=createDayRoutingServer(beforeOperation);trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.ctx.saveWeekOperation({operation:input,scope});}catch(error){assert(['StorageError','ProtocolUnavailable','CommitBlocked','ProtocolCorrupt'].includes(error.name),phase+' '+at+': '+error.name);}
 const reboot=createDayRoutingServer(trial.snapshot());assert.deepEqual(copy(reboot.ctx.saveWeekOperation({operation:input,scope})),response,phase+' '+at+': stable weekly-snapshot ACK after recovery');recoveries++;
}
let createRecoveries=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=createEvents;at++){
 const trial=createDayRoutingServer(beforeCreate);trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.ctx.saveWeekOperation({operation:fresh,scope});}catch(error){assert(['StorageError','ProtocolUnavailable','CommitBlocked','ProtocolCorrupt'].includes(error.name),phase+' create '+at+': '+error.name);}
 const reboot=createDayRoutingServer(trial.snapshot());assert.deepEqual(copy(reboot.ctx.saveWeekOperation({operation:fresh,scope})),created,phase+' create '+at+': week and route/directory recover with the original receipt');createRecoveries++;
}
console.log('Week outbox canonical create: '+createRecoveries+' Sheet/Range before/after/partial interruption recoveries OK');
console.log('Week outbox weekly-snapshot update: '+recoveries+' Sheet/Range before/after/partial interruption recoveries OK');
console.log('Week outbox server: full snapshots/whitespace/enums, untouched fields, canonical create, stable ACK after restart, payload/scope rejection, durable conflicts, unknown receipts and readOnly without legacy writes OK');
