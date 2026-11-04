const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-catalog-archive',principalId:'synthetic-catalog-principal',epoch:'synthetic-catalog-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const copy=v=>JSON.parse(JSON.stringify(v));
function context(globals={}){const ctx=vm.createContext(globals);vm.runInContext(source,ctx);return ctx;}
const writer=f=>context().syncCatalogWriter_(f.store,scope),value=result=>{assert(result.ok,JSON.stringify(result));return copy(result.value);};
const goal={id:'synthetic-goal',cycle:'2026-Q4',title:'  Obiettivo 🌱  ',target:'3.5',progress:'0',project:'casa',icon:'target',description:'=Descrizione\nSeconda riga  '};
const steps=[{id:'synthetic-step-a',title:'  Primo passo 🌱  '},{id:'synthetic-step-b',title:'=Un secondo passo'}];
const habit={id:'synthetic-habit',goalId:goal.id,title:'Pratica sintetica',days:'0,2,4',start:'2026-10-01',steps:JSON.stringify(steps),archived:'',icon:'🌱',description:'  Istruzioni\nNon tagliare  '};
const change=(collection,record,baseVersion=null)=>({collection,id:record.id,baseVersion,record});
const request={operationId:'synthetic-catalog-create',changes:[change('goals',goal),change('habits',habit)]};
const fixture=createCommitStore(scope),service=writer(fixture),ack=value(service.save(request));assert.equal(ack.status,'committed');assert.equal(ack.sequence,1);assert.deepEqual(ack.scope,scope);assert.equal(ack.versions.length,2);
assert.equal(value(service.read('goals',goal.id)).record.description,goal.description);assert.equal(value(service.read('habits',habit.id)).record.description,habit.description);assert.deepEqual(JSON.parse(value(service.read('habits',habit.id)).record.steps),steps);
const writes=fixture.metrics().writes;assert.deepEqual(value(service.save(request)),ack);assert.equal(fixture.metrics().writes,writes);
const reordered=copy(request);reordered.changes[1].record.steps=JSON.stringify(steps.map(({id,title})=>({title,id})));assert.deepEqual(value(service.save(reordered)),ack);
const changed=copy(request);changed.changes[0].record.progress='1';assert.equal(service.save(changed).error,'OperationMismatch');
const isolated=service.save(request);isolated.value.scope.archiveId='altered';assert.deepEqual(value(service.save(request)).scope,scope);
const mutable=value(service.read('habits',habit.id));mutable.record.title='altered';assert.equal(value(service.read('habits',habit.id)).record.title,habit.title);
assert.equal(value(service.read('goals','missing')).record,null);
const update={operationId:'synthetic-catalog-update',changes:[change('habits',{...habit,description:'Nuova descrizione'},'commit-1')]};
const updated=value(service.save(update));assert.equal(updated.sequence,2);
const stale={operationId:'synthetic-catalog-stale',changes:[change('goals',{...goal,progress:'2'},'commit-1'),change('habits',{...habit,title:'Altra variante'},'commit-1')]};
const conflict=value(service.save(stale));assert.equal(conflict.status,'conflict');assert.equal(value(service.read('goals',goal.id)).version,'commit-1','partial batch is never published');assert.equal(value(service.read('habits',habit.id)).record.title,habit.title);
value(service.save({operationId:'synthetic-catalog-later',changes:[change('goals',{...goal,progress:'1'},'commit-1')]}));assert.deepEqual(value(service.save(stale)),conflict);assert.deepEqual(value(service.save(request)),ack);
// Dependencies are read from the store, not trusted from caller-supplied records.
const empty=createCommitStore(scope);assert.equal(writer(empty).save({operationId:'synthetic-orphan-habit',changes:[change('habits',habit)]}).error,'CommitBlocked');assert.equal(empty.metrics().writes,0);
const graph=createCommitStore(scope),graphService=writer(graph);value(graphService.save(request));
const outside={operationId:'synthetic-outside-quarter',changes:[change('habits',{...habit,start:'2027-01-01'},'commit-1')]};assert.equal(graphService.save(outside).error,'CommitBlocked');
const move={operationId:'synthetic-catalog-move',changes:[change('habits',{...habit,start:'2027-01-01'},'commit-1'),change('goals',{...goal,cycle:'2027-Q1'},'commit-1')]};
const moved=value(graphService.save(move));assert.equal(moved.sequence,2);assert.equal(value(graphService.read('habits',habit.id)).record.start,'2027-01-01');assert.equal(value(graphService.read('goals',goal.id)).record.cycle,'2027-Q1');
// Goal quarter changes do not silently rewrite existing habits, like the legacy
// API. Archival remains possible even when the goal is now in another quarter.
value(graphService.save({operationId:'synthetic-goal-quarter',changes:[change('goals',{...goal,cycle:'2028-Q2'},'commit-2')]}));
assert.equal(value(graphService.read('habits',habit.id)).record.start,'2027-01-01');
const archived={...habit,start:'2027-01-01',archived:'yes'},archiveRequest={operationId:'synthetic-habit-archive',changes:[change('habits',archived,'commit-2')]};
value(graphService.save(archiveRequest));assert.equal(value(graphService.read('habits',habit.id)).record.archived,'yes');
assert.equal(graphService.save({operationId:'synthetic-habit-unarchive',changes:[change('habits',{...archived,archived:''},'commit-4')]}).error,'CommitBlocked');
assert.equal(graphService.save({operationId:'synthetic-habit-rewrite',changes:[change('habits',{...archived,title:'Changed'},'commit-4')]}).error,'CommitBlocked');
assert.deepEqual(value(graphService.save(request)),ack,'retry survives later goal quarter and habit archive');
const newborn={...habit,id:'born-archived',archived:'yes'};assert.equal(graphService.save({operationId:'synthetic-born-archived',changes:[change('habits',newborn)]}).error,'CommitBlocked');
// Format/ID/limits/unknown attributes fail before storage access or writes.
const badRecord=(collection,record)=>({operationId:'synthetic-invalid-catalog',changes:[change(collection,record)]});
const partial=copy(goal);delete partial.icon;
const malformed=[badRecord('goals',partial),badRecord('goals',{...goal,extra:'x'}),badRecord('goals',{...goal,title:' '}),badRecord('goals',{...goal,description:'x'.repeat(6001)}),badRecord('goals',{...goal,target:'0'}),badRecord('goals',{...goal,target:'NaN'}),badRecord('goals',{...goal,target:'03'}),badRecord('goals',{...goal,progress:'-1'}),badRecord('goals',{...goal,progress:null}),badRecord('goals',{...goal,cycle:'2026-Q5'}),badRecord('goals',{...goal,project:'Not a slug'}),badRecord('goals',{...goal,icon:'unsupported'}),badRecord('habits',{...habit,id:'a|b'}),badRecord('habits',{...habit,days:'2,0'}),badRecord('habits',{...habit,days:'0,0'}),badRecord('habits',{...habit,days:'weekly:8'}),badRecord('habits',{...habit,start:'2026-02-30'}),badRecord('habits',{...habit,archived:'no'}),badRecord('habits',{...habit,steps:'bad JSON'}),badRecord('habits',{...habit,steps:JSON.stringify([steps[0],steps[0]])}),badRecord('habits',{...habit,steps:JSON.stringify([{...steps[0],color:'red'}])}),badRecord('habits',{...habit,steps:JSON.stringify([{id:'a',title:'x'.repeat(501)}])}),badRecord('habits',{...habit,steps:JSON.stringify(Array.from({length:31},(_,i)=>({id:'s'+i,title:'Step'})))}),{...request,context:{}},{...request,operationId:'short'},{...request,changes:[request.changes[0],request.changes[0]]},{...request,changes:[{...request.changes[0],id:'other'}]},{...request,changes:[{...request.changes[0],baseVersion:''}]}];
for(const input of malformed){const n=fixture.metrics().writes;assert.equal(service.save(input).error,'DataError',JSON.stringify(input));assert.equal(fixture.metrics().writes,n);}
assert.equal(service.read('entries',goal.id).error,'DataError');assert.equal(service.read('habits','h'.repeat(190)).error,'DataError');
// Simple/weekly habits, archived snapshots, leap quarter and canonical empty steps.
const variants=createCommitStore(scope),vs=writer(variants);value(vs.save({operationId:'synthetic-leap-pair',changes:[change('goals',{...goal,cycle:'2028-Q1'}),change('habits',{...habit,start:'2028-02-29',days:'weekly:7',steps:''})]}));assert.equal(value(vs.read('habits',habit.id)).record.steps,'[]');
const sameEmpty={operationId:'synthetic-leap-pair',changes:[change('goals',{...goal,cycle:'2028-Q1'}),change('habits',{...habit,start:'2028-02-29',days:'weekly:7',steps:'[]'})]};assert.deepEqual(value(vs.save(sameEmpty)).versions[1].version,'commit-1');
// Every durable unit of paired creation, single-habit update and paired move.
let cases=0;for(const phase of ['before','after'])for(const input of [request,update,move]){
 const initial=createCommitStore(scope);if(input!==request)value(writer(initial).save(request));const snapshot=initial.snapshot(),measured=createCommitStore(scope,snapshot),expected=value(writer(measured).save(input));
 for(let at=1;at<=measured.metrics().writes;at++){
  const f=createCommitStore(scope,snapshot);f.fault(at,phase);assert(!writer(f).save(input).ok);
  const restarted=createCommitStore(scope,f.snapshot()),service=writer(restarted);value(service.read('habits',habit.id));assert.deepEqual(value(service.save(input)),expected);assert.equal(restarted.snapshot().commits.length,expected.sequence);cases++;
 }
}
// Tombstones stay distinct; stale successful ACKs never resurrect deleted data.
const deleted=createCommitStore(scope),ds=writer(deleted);value(ds.save(request));const protocol=context().syncCommitProtocol_(deleted.store,scope);value(protocol.execute({operationId:'synthetic-delete-catalog-goal',changes:[{collection:'goals',id:goal.id,baseVersion:'commit-1',action:'delete'}]}));
assert.equal(value(ds.read('goals',goal.id)).deleted,true);assert.equal(value(ds.read('goals',goal.id)).version,'commit-2');assert.deepEqual(value(ds.save(request)),ack);
assert.equal(ds.save({operationId:'synthetic-resurrect-goal',changes:[change('goals',goal,'commit-2')]}).error,'CommitBlocked');
assert.equal(ds.save({operationId:'synthetic-dangling-habit',changes:[change('habits',{...habit,description:'x'},'commit-1')]}).error,'CommitBlocked');
// Corrupt schema/identity or stored microaction attributes are barriers.
for(const [collection,id,mutate]of [
 ['goals',goal.id,s=>s.entities[0][1].data.format='wrong'],
 ['goals',goal.id,s=>s.entities[0][1].data.record.id='other'],
 ['habits',habit.id,s=>s.entities[1][1].data.record.steps='bad JSON']
]){
 const broken=createCommitStore(scope);value(writer(broken).save(request));const state=broken.snapshot();mutate(state);
 assert.equal(writer(createCommitStore(scope,state)).read(collection,id).error,'ProtocolCorrupt');
}
// Repair a lost receipt from a retained commit after the live graph changed.
const missing=graph.snapshot();missing.receipts=missing.receipts.filter(([id])=>JSON.parse(id)[1]!==request.operationId);
const repaired=createCommitStore(scope,missing);assert.deepEqual(value(writer(repaired).save(request)),ack);assert.equal(repaired.snapshot().commits.length,graph.snapshot().commits.length);
// One outer lock protects both dependency reads and the kernel transaction.
const locking=createCommitStore(scope);let acquired=0;const lock=locking.store.withLock;locking.store.withLock=fn=>{acquired++;return lock(fn);};
value(writer(locking).save(request));assert.equal(acquired,1);
// Principal namespaces remain independent on a shared archive and sequence.
const otherScope={...scope,principalId:'synthetic-other-catalog-principal'},otherService=context().syncCatalogWriter_(fixture.store,otherScope);
const otherAck=value(otherService.save(request));assert.equal(otherAck.status,'conflict');assert.deepEqual(otherAck.scope,otherScope);assert.equal(value(service.save(request)).status,'committed');
// Actual fragmented adapter, fresh V8 after every Sheet/Range interruption.
function sheetsOpen(f){const c=context(f.globals),store=c.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return {store,service:c.syncCatalogWriter_(store,scope)};}
const sheets=createFaultSheets(),opened=sheetsOpen(sheets);opened.store.withLock(()=>opened.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));value(opened.service.save(request));const snapshot=sheets.snapshot();
const measured=createFaultSheets(snapshot);value(sheetsOpen(measured).service.save(move));const events=measured.metrics().events.length;let sheetCases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const f=createFaultSheets(snapshot);f.fault(at,phase);assert(!sheetsOpen(f).service.save(move).ok);
 const reboot=sheetsOpen(createFaultSheets(f.snapshot())).service;value(reboot.read('goals',goal.id));assert.deepEqual(value(reboot.save(move)),moved);assert.equal(value(reboot.read('habits',habit.id)).record.start,'2027-01-01');sheetCases++;
}
// Maximum individual microaction/description fields survive UTF-8 fragments;
// an oversized atomic pair is rejected rather than split or truncated.
const maximum={...habit,steps:JSON.stringify(Array.from({length:30},(_,i)=>({id:'s'+String(i).padStart(3,'0')+'x'.repeat(196),title:'🌱'.repeat(250)}))),description:'è'.repeat(6000)};
const large=createFaultSheets(),largeOpened=sheetsOpen(large);largeOpened.store.withLock(()=>largeOpened.store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));
value(largeOpened.service.save({operationId:'synthetic-large-goal',changes:[change('goals',goal)]}));
value(largeOpened.service.save({operationId:'synthetic-large-habit',changes:[change('habits',maximum)]}));
assert.deepEqual(value(sheetsOpen(createFaultSheets(large.snapshot())).service.read('habits',habit.id)).record.description,maximum.description);
assert.deepEqual(JSON.parse(value(sheetsOpen(createFaultSheets(large.snapshot())).service.read('habits',habit.id)).record.steps),JSON.parse(maximum.steps));
const tooLarge=createCommitStore(scope);assert.equal(writer(tooLarge).save({operationId:'synthetic-oversized-pair',changes:[change('goals',{...goal,description:'x'.repeat(6000)}),change('habits',maximum)]}).error,'DataError');assert.equal(tooLarge.metrics().writes,0);
const disabled=createFaultSheets(snapshot);disabled.setEnabled(false);assert.equal(sheetsOpen(disabled).service.save(move).error,'ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
const revoked=createFaultSheets(snapshot);revoked.setAuthorized(false);assert.equal(sheetsOpen(revoked).service.read('goals',goal.id).error,'ScopeChanged');assert.equal(revoked.metrics().reads.length,0);
const budget=createCommitStore(scope);budget.store.preflightWrites=()=>({available:false});assert.equal(writer(budget).save(request).error,'ProtocolUnavailable');assert.equal(budget.metrics().writes,0);
// Demo embeds the same internal writer and leaves every legacy table alone.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
const before=vm.runInContext('JSON.stringify([mockSheets.Goals.data,mockSheets.Habits.data,mockSheets.HabitLogs.data])',demo),demoStore=createCommitStore(scope);assert.deepEqual(value(demo.syncCatalogWriter_(demoStore.store,scope).save(request)),ack);assert.equal(vm.runInContext('JSON.stringify([mockSheets.Goals.data,mockSheets.Habits.data,mockSheets.HabitLogs.data])',demo),before);
console.log('Canonical Goals/Habits writer: exact snapshots/step IDs, atomic pairs, locked goal dependency, legacy quarter semantics/soft archive, stable scoped ACK/conflicts, '+cases+' durable unit and '+sheetCases+' Sheet restart faults, tombstone/schema/auth/capacity barriers and untouched legacy Demo OK.');
