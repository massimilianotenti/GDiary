const assert=require('node:assert/strict'),vm=require('node:vm'),{createDayRoutingServer:open}=require('./helpers/day-routing-server.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),bindings={habitLogsSheetId:14,indexSheetId:11,blockSheetId:12,habitsSheetId:15,goalsSheetId:16};
let server=open(null,{seedPractices:[{steps:'Prima 🌱\nSeconda',checkedIndices:[0]}]});
server.habitLogController.register(bindings);server.habitLogController.setMode({mode:'active',expectedRevision:1});let gateway=server.habitLogController.resolve();
const {habit,log}=server.practices[0],preview=gateway.preview(log.key);gateway.migrate({operationId:'synthetic-log-outbox-migration',key:log.key,expectedLegacy:preview.legacy,expectedCatalog:preview.catalog,record:preview.record});
const scope={...server.scope,protocolVersion:1,schemaVersion:1},frozen=copy(server.snapshot().rawSheets.HabitLogs),current=()=>copy(gateway.readRows().find(l=>l.key===log.key)),snapshot=()=>{const {updatedAt,...row}=current();return row;};
const input={operationId:'synthetic-log-outbox-update-001',baseVersion:current().updatedAt,habitUpdatedAt:habit.updatedAt,log:{...snapshot(),status:'skipped'}};
assert.throws(()=>server.ctx.saveHabitLogOperation({scope:{...scope,epoch:'foreign-epoch'},operation:input}),e=>e.name==='ScopeChanged');
const before=server.snapshot();server.ledger.reset();const ack=copy(server.ctx.saveHabitLogOperation({scope,operation:input})),events=server.ledger.metrics().events.length;
assert.equal(ack.log.status,'skipped');assert.equal(ack.log.checklist,input.log.checklist);assert.deepEqual(copy(server.ctx.saveHabitLogOperation({scope,operation:input})),ack);
assert.equal(copy(server.ctx.getHabitLogOperationReceipt({scope,request:input})).version,ack.log.updatedAt);
assert.throws(()=>server.ctx.getHabitLogOperationReceipt({scope,request:{...input,log:{...input.log,status:'pending'}}}),e=>e.name==='OperationMismatch');
const stale={...input,operationId:'synthetic-log-outbox-stale-001'};assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:stale}),e=>e.name==='ConflictError');assert.equal(copy(server.ctx.getHabitLogOperationReceipt({scope,request:stale})).status,'conflict');
const fresh={...input,operationId:'synthetic-log-outbox-create-001',baseVersion:null,log:{...input.log,key:habit.id+'|2026-10-29',date:'2026-10-29',status:'pending',checklist:JSON.stringify({checked:[],steps:JSON.parse(habit.steps)})}};
const beforeCreate=server.snapshot();server.ledger.reset();const created=copy(server.ctx.saveHabitLogOperation({scope,operation:fresh})),createEvents=server.ledger.metrics().events.length;
assert.equal(created.log.key,fresh.log.key);assert.equal(copy(server.ctx.getHabitLogOperationState({scope,key:fresh.log.key})).log.updatedAt,created.log.updatedAt);
// Acknowledged plans replay their historical snapshot after a catalogue change.
server.ctx.logHabitId=habit.id;vm.runInContext("{const h=rows_(mockSheets.Habits,HABIT_HEADERS).find(h=>h.id===logHabitId);saveHabit({...h,steps:'Seconda\\nPrima 🌱',context:{incrementalCommon:true}});}",server.ctx);
server=open(server.snapshot());gateway=server.habitLogController.resolve();assert.deepEqual(copy(server.ctx.saveHabitLogOperation({scope,operation:input})),ack);assert.deepEqual(copy(server.ctx.saveHabitLogOperation({scope,operation:fresh})),created);
const oldCatalog={...fresh,operationId:'synthetic-log-old-catalog-001',log:{...fresh.log,key:habit.id+'|2026-10-30',date:'2026-10-30'}};assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:oldCatalog}),e=>e.name==='ConflictError');
const catalogNow=gateway.preview(log.key).catalog;
const historical={...input,operationId:'synthetic-log-after-reorder-001',baseVersion:current().updatedAt,habitUpdatedAt:catalogNow.habit.updatedAt,log:{...input.log,status:'pending'}};const historicalAck=copy(server.ctx.saveHabitLogOperation({scope,operation:historical}));assert.equal(historicalAck.log.checklist,input.log.checklist,'reorder in catalogue preserves original step IDs/titles/order');
const unknown={...historical,operationId:'synthetic-log-receipt-unknown'};assert.equal(copy(server.ctx.getHabitLogOperationReceipt({scope,request:unknown})).status,'unknown');assert.equal(copy(server.ctx.getHabitLogOperationState({scope,key:habit.id+'|2026-11-01'})).missing,true);
assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:{...unknown,log:{...unknown.log,status:false}}}),e=>e.name==='DataError');assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:{...unknown,log:{...unknown.log,status:0}}}),e=>e.name==='DataError');
assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:{...unknown,operationId:'hl-reserve-forbidden-001'}}),e=>e.name==='DataError');
server.ctx.logHabitVersion=catalogNow.habit.updatedAt;server.ctx.logHabitId=habit.id;vm.runInContext('deleteHabit({id:logHabitId,updatedAt:logHabitVersion,context:{incrementalCommon:true}});',server.ctx);assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:{...historical,operationId:'synthetic-log-archived-001',baseVersion:historicalAck.log.updatedAt}}),e=>['CommitBlocked','ConflictError'].includes(e.name));assert.deepEqual(copy(server.ctx.saveHabitLogOperation({scope,operation:historical})),historicalAck,'ACK replay remains valid after archive');
assert.deepEqual(copy(server.snapshot().rawSheets.HabitLogs),frozen);
server.habitLogController.setMode({mode:'readOnly',expectedRevision:server.habitLogController.status().revision});assert.throws(()=>server.ctx.saveHabitLogOperation({scope,operation:oldCatalog}),e=>e.name==='ProtocolUnavailable');assert.equal(copy(server.ctx.getHabitLogOperationReceipt({scope,request:input})).status,'committed');
// Verify the new endpoint against routed canonical catalogues on the shared ledger.
function checkCanonicalCatalogs(){
 const f=open(null,{seedPractices:[{steps:'Storica A\nStorica B'}]}),catalog=f.ctx.syncCatalogRoutingServer_({allowConfigure:true,allowMigration:true}),practice=f.practices[0];
 const frozen=copy(f.snapshot().rawSheets);catalog.register({goalsSheetId:16,habitsSheetId:15,indexSheetId:11,blockSheetId:12});f.habitLogController.register(bindings);catalog.setMode({mode:'active',expectedRevision:1});f.habitLogController.setMode({mode:'active',expectedRevision:1});
 const gateway=f.habitLogController.resolve(),preview=gateway.preview(practice.log.key);gateway.migrate({operationId:'synthetic-outbox-catalog-log-migrate',key:practice.log.key,expectedLegacy:preview.legacy,expectedCatalog:preview.catalog,record:preview.record});
 for(const [collection,id]of [['goals',practice.goal.id],['habits',practice.habit.id]]){const p=catalog.resolve().preview(collection,id);catalog.resolve().migrate({operationId:'synthetic-outbox-catalog-migrate-'+collection,collection,id,expectedLegacy:p.legacy});}
 const {updatedAt,...log}=copy(gateway.readRows().find(l=>l.key===practice.log.key)),scope={...f.scope,protocolVersion:1,schemaVersion:1},input={operationId:'synthetic-outbox-catalog-old-version',baseVersion:updatedAt,habitUpdatedAt:practice.habit.updatedAt,log:{...log,status:'skipped'}},ack=copy(f.ctx.saveHabitLogOperation({scope,operation:input}));
 assert.equal(ack.log.status,'skipped','original ISO catalogue baseline maps only to its initial canonical version');
 const h=copy(catalog.resolve().readRows('habits').find(h=>h.id===practice.habit.id)),changed=copy(f.ctx.saveHabit({...h,steps:'Storica B\nStorica A',context:{incrementalCommon:true}})).commonUpserts.habits[0];
 assert.deepEqual(copy(f.ctx.saveHabitLogOperation({scope,operation:input})),ack);assert.equal(copy(f.ctx.getHabitLogOperationReceipt({scope,request:input})).version,ack.log.updatedAt);
 assert.throws(()=>f.ctx.saveHabitLogOperation({scope,operation:{...input,operationId:'synthetic-outbox-catalog-stale-version',baseVersion:ack.log.updatedAt}}),e=>e.name==='ConflictError');
 const fresh={...input,operationId:'synthetic-outbox-catalog-current-version',baseVersion:ack.log.updatedAt,habitUpdatedAt:changed.updatedAt,log:{...log,status:'pending'}};assert.equal(copy(f.ctx.saveHabitLogOperation({scope,operation:fresh})).log.checklist,log.checklist);
 for(const name of ['HabitLogs','Habits','Goals'])assert.deepEqual(copy(f.snapshot().rawSheets[name]),frozen[name]);
 console.log('HabitLogs outbox shared canonical catalogues: original ISO mapping, stale-version rejection, reviewed version, historical steps and stable receipts without legacy writes OK');
}
checkCanonicalCatalogs();
let count=0;for(const [state,operation,response,n] of [[before,input,ack,events],[beforeCreate,fresh,created,createEvents]])for(const phase of ['before','after','partial'])for(let at=1;at<=n;at++){
 const trial=open(state);trial.ledger.reset();trial.ledger.fault(at,phase);try{trial.ctx.saveHabitLogOperation({scope,operation});}catch(e){assert(['StorageError','ProtocolUnavailable','CommitBlocked','ProtocolCorrupt'].includes(e.name),phase+' '+at+': '+e.name);}
 const reboot=open(trial.snapshot());assert.deepEqual(copy(reboot.ctx.saveHabitLogOperation({scope,operation})),response,phase+' '+at);count++;
}
console.log('HabitLogs outbox server: '+count+' interruption recoveries, update/create, historical checklist/catalogue gates, scoped idempotent receipts, conflicts/readOnly, no legacy writes OK');
