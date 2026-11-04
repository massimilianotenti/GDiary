const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs'),{createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-entry-archive',principalId:'synthetic-entry-principal',epoch:'synthetic-entry-epoch'},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
function open(f){const ctx=context();return {ctx,service:ctx.syncEntryWriter_(f.store,scope)};}
const value=result=>{assert(result.ok,JSON.stringify(result));return copy(result.value);};
const entry={id:'synthetic-entry-0001',date:'2026-10-29',type:'task',text:'Scrivere la bozza',projects:'progetto-caffe',due:'2026-10-31',status:'doing',createdAt:'2026-10-29T08:00:00.000Z',requestId:'synthetic-entry-request',scope:'project',completedAt:'',tags:'lavoro,idea'};
const create={operationId:'synthetic-entry-create',baseVersion:null,entry};
const fixture=createCommitStore(scope),service=open(fixture).service,ack=value(service.save(create));
assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.equal(ack.versions[0].version,'commit-1');
assert.deepEqual(value(service.read(entry.id)).entry,entry);assert.equal(value(service.read(entry.id)).version,'commit-1');
const writes=fixture.metrics().writes;assert.deepEqual(value(service.save(create)),ack);assert.equal(fixture.metrics().writes,writes,'stable replay performs no writes');
const update={operationId:'synthetic-entry-update',baseVersion:'commit-1',entry:{...entry,tags:'lavoro,personale'}};
assert.equal(value(service.save(update)).sequence,2);assert.equal(value(service.read(entry.id)).entry.tags,'lavoro,personale');
const stale={operationId:'synthetic-entry-stale',baseVersion:'commit-1',entry:{...entry,text:'Bozza obsoleta'}};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.deepEqual(value(service.save(stale)),conflict,'conflict receipt is stable');
assert.deepEqual(value(service.save(create)),ack,'old successful ACK remains stable after later updates');
const missing=value(service.read('synthetic-entry-missing'));assert.equal(missing.entry,null);assert.equal(missing.version,null);
const malformed=[
 {...create,entry:{...entry,body:'testo escluso'}},
 {...create,entry:{...entry,id:'non valido'}},
 {...create,entry:{...entry,date:'2026-02-30'}},
 {...create,entry:{...entry,type:'unknown'}},
 {...create,entry:{...entry,status:'waiting'}},
 {...create,entry:{...entry,projects:'Progetto non valido'}},
 {...create,entry:{...entry,tags:'non valido!'}},
 {...create,baseVersion:''},
 {...create,operationId:'short'}
];
for(const input of malformed){const before=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError');assert.equal(fixture.metrics().writes,before,'invalid Entry has no ledger writes');}
const body={...entry};delete body.body;assert.deepEqual(copy(context().syncEntrySnapshot_(body)),entry);
// Every durable unit can fail before or after its write and recover on a fresh V8 instance.
const measured=createCommitStore(scope),expected=value(open(measured).service.save(create)),units=measured.metrics().writes;let cases=0;
for(const phase of ['before','after'])for(let at=1;at<=units;at++){
 const fault=createCommitStore(scope);fault.fault(at,phase);assert(!open(fault).service.save(create).ok);
 const reboot=createCommitStore(scope,fault.snapshot()),restarted=open(reboot).service;
 assert.deepEqual(value(restarted.save(create)),expected);assert.equal(value(restarted.read(entry.id)).version,'commit-1');cases++;
}
// A tombstone is terminal even when the old create operation is replayed.
const deleted=createCommitStore(scope),deletedService=open(deleted).service;value(deletedService.save(create));
const protocol=context().syncCommitProtocol_(deleted.store,scope);value(protocol.execute({operationId:'synthetic-entry-delete',changes:[{collection:'entries',id:entry.id,baseVersion:'commit-1',action:'delete'}]}));
assert.equal(value(deletedService.read(entry.id)).deleted,true);assert.equal(value(deletedService.read(entry.id)).version,'commit-2');
assert.deepEqual(value(deletedService.save(create)),ack);assert.equal(deletedService.save({...update,baseVersion:'commit-2'}).error,'CommitBlocked');
const corrupt=createCommitStore(scope);value(open(corrupt).service.save(create));const broken=corrupt.snapshot();broken.entities[0][1].data.format='wrong';
assert.equal(open(createCommitStore(scope,broken)).service.read(entry.id).error,'ProtocolCorrupt');
// The Sheet/Range adapter exercises recovery after fragmented durable writes.
const archive={archiveId:scope.archiveId,epoch:scope.epoch};
function sheetOpen(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:ctx.syncEntryWriter_(store,scope)};}
const blank=createFaultSheets(),initialized=sheetOpen(blank);initialized.store.withLock(()=>initialized.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
const measuredSheets=createFaultSheets(blank.snapshot());value(sheetOpen(measuredSheets).service.save(create));const sheetWrites=measuredSheets.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=sheetWrites;at++){
 const fault=createFaultSheets(blank.snapshot());fault.fault(at,phase);assert(!sheetOpen(fault).service.save(create).ok);
 const restarted=sheetOpen(createFaultSheets(fault.snapshot()));assert.deepEqual(value(restarted.service.save(create)),ack);assert.equal(value(restarted.service.read(entry.id)).version,'commit-1');sheetCases++;
}
const disabled=createFaultSheets(blank.snapshot());disabled.setEnabled(false);assert.equal(sheetOpen(disabled).service.save(create).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
console.log(`Canonical Entry writer: metadata snapshot/body separation, ACK/retry/conflict, validation, tombstone, schema, ${cases} durable-unit and ${sheetCases} Sheet/Range fault recoveries OK.`);
