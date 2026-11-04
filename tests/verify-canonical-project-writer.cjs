const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-project-archive',principalId:'synthetic-project-principal',epoch:'synthetic-project-epoch'},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
function open(f){const ctx=context();return {ctx,service:ctx.syncProjectWriter_(f.store,scope)};}
const value=result=>{assert(result.ok,JSON.stringify(result));return copy(result.value);};
const project={slug:'caffe-e-casa',name:'Caffè e casa',description:'Contesto\n🌱'};
const create={operationId:'synthetic-project-create',baseVersion:null,project};
const fixture=createCommitStore(scope),service=open(fixture).service,ack=value(service.save(create));
assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.equal(ack.versions[0].version,'commit-1');
assert.deepEqual(value(service.read(project.slug)).project,project);const writes=fixture.metrics().writes;
assert.deepEqual(value(service.save(create)),ack);assert.equal(fixture.metrics().writes,writes,'stable replay performs no writes');
const update={operationId:'synthetic-project-update',baseVersion:'commit-1',project:{...project,name:'Caffè e casa nuova',description:'Nuovo contesto'}};
const updated=value(service.save(update));assert.equal(updated.sequence,2);assert.equal(value(service.read(project.slug)).version,'commit-2');
const stale={operationId:'synthetic-project-stale',baseVersion:'commit-1',project:{...project,name:'Variante'}};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.deepEqual(value(service.save(stale)),conflict,'conflict receipt is stable');
assert.deepEqual(value(service.save(create)),ack,'old successful ACK remains stable after later updates');
assert.deepEqual(value(service.read('missing-project')), {cursor:{format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence:2},project:null,version:null,deleted:false});
const malformed=[
 {...create,project:{...project,extra:'x'}},
 {...create,project:{...project,slug:'Non valido'}},
 {...create,project:{...project,name:' '}},
 {...create,project:{...project,name:'x'.repeat(201)}},
 {...create,project:{...project,description:'x'.repeat(4001)}},
 {...create,baseVersion:''},
 {...create,operationId:'short'}
];
for(const input of malformed){const before=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError');assert.equal(fixture.metrics().writes,before,'invalid project has no ledger writes');}
// Every durable unit can fail before or after its write and is recovered by retry in a fresh V8.
const measured=createCommitStore(scope),measuredService=open(measured).service,expected=value(measuredService.save(create)),units=measured.metrics().writes;let cases=0;
for(const phase of ['before','after'])for(let at=1;at<=units;at++){
 const fault=createCommitStore(scope);fault.fault(at,phase);assert(!open(fault).service.save(create).ok);
 const restarted=createCommitStore(scope,fault.snapshot()),reboot=open(restarted).service;
 assert.deepEqual(value(reboot.save(create)),expected);assert.equal(value(reboot.read(project.slug)).version,'commit-1');cases++;
}
// Tombstones remain distinct and prevent accidental resurrection.
const deleted=createCommitStore(scope),deletedService=open(deleted).service;value(deletedService.save(create));
const protocol=context().syncCommitProtocol_(deleted.store,scope);value(protocol.execute({operationId:'synthetic-project-delete',changes:[{collection:'projects',id:project.slug,baseVersion:'commit-1',action:'delete'}]}));
assert.equal(value(deletedService.read(project.slug)).deleted,true);assert.equal(value(deletedService.read(project.slug)).version,'commit-2');
assert.deepEqual(value(deletedService.save(create)),ack);assert.equal(deletedService.save({...update,baseVersion:'commit-2'}).error,'CommitBlocked');
// A malformed envelope behind a valid kernel checksum is rejected by the domain reader.
const corrupt=createCommitStore(scope);value(open(corrupt).service.save(create));const broken=corrupt.snapshot();broken.entities[0][1].data.format='wrong';
assert.equal(open(createCommitStore(scope,broken)).service.read(project.slug).error,'ProtocolCorrupt');
// Exercise the same contract against the fragmented Sheets/Range adapter.
const archive={archiveId:scope.archiveId,epoch:scope.epoch};
function sheetOpen(f){const ctx=context(f.globals),store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:ctx.syncProjectWriter_(store,scope)};}
const blank=createFaultSheets(),initialized=sheetOpen(blank);initialized.store.withLock(()=>initialized.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
const measuredSheets=createFaultSheets(blank.snapshot()),measuredOpen=sheetOpen(measuredSheets);value(measuredOpen.service.save(create));const sheetWrites=measuredSheets.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=sheetWrites;at++){
 const fault=createFaultSheets(blank.snapshot());fault.fault(at,phase);assert(!sheetOpen(fault).service.save(create).ok);
 const reboot=sheetOpen(createFaultSheets(fault.snapshot()));assert.deepEqual(value(reboot.service.save(create)),ack);assert.equal(value(reboot.service.read(project.slug)).version,'commit-1');sheetCases++;
}
const disabled=createFaultSheets(blank.snapshot());disabled.setEnabled(false);assert.equal(sheetOpen(disabled).service.save(create).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
console.log(`Canonical project writer: ACK/retry/conflict, limits, tombstone, schema, ${cases} durable-unit and ${sheetCases} Sheet/Range fault recoveries OK.`);
