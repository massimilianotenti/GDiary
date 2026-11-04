const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore,seal}=require('./helpers/recoverable-commit-store.cjs'),{createFaultSheets}=require('./helpers/fault-sheets.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-project-migration-archive',epoch:'synthetic-project-migration-epoch',principalId:'synthetic-project-migration-principal'},archive={archiveId:scope.archiveId,epoch:scope.epoch},copy=value=>JSON.parse(JSON.stringify(value));
function context(globals={}){const c=vm.createContext(globals);vm.runInContext(source,c);vm.runInContext('ACTIVE_CONTEXT={incrementalCommon:true}',c);return c;}
const c=context(),headers=copy(vm.runInContext('PROJECT_HEADERS',c)),row=values=>Object.assign(Object.fromEntries(headers.map(key=>[key,''])),values),legacy=row({slug:'caffe',name:'Caffè',description:'Descrizione legacy',updatedAt:'2026-10-01T10:00:00.000Z'}),other=row({slug:'lettura',name:'Lettura',description:'Appunti',updatedAt:'2026-10-02T10:00:00.000Z'});
function open(adapter,rows=[copy(legacy),copy(other)]){let held=false;const store={...adapter.store,withLock(fn){return adapter.store.withLock(()=>{held=true;try{return fn();}finally{held=false;}});}},raw={read(slug){assert(held);return copy(rows.filter(project=>project.slug===slug));},readRows(){assert(held);return copy(rows);},saveLegacy(){throw Error('unexpected legacy write');}};return {gateway:context().syncProjectMigrationGateway_(store,scope,raw),rows,raw};}
const projectInput={operationId:'synthetic-project-migrate-caffe',slug:legacy.slug,expectedLegacy:legacy};
const store=createCommitStore(scope),f=open(store),preview=copy(f.gateway.preview(legacy.slug));assert.deepEqual(preview.legacy,legacy);assert.equal(store.metrics().writes,0);
const migrated=copy(f.gateway.migrate(projectInput));assert.equal(migrated.status,'committed');assert.equal(store.snapshot().head.committedThrough,2,'plan reservation and migration are committed');
assert.deepEqual(f.rows,[legacy,other],'source Projects rows remain frozen');assert.equal(f.gateway.readRows()[0].updatedAt,'commit-2');
const edit={slug:legacy.slug,name:'Caffè rinominato',description:'Nuovo testo',updatedAt:'commit-2'};
const ack=copy(f.gateway.saveProject(edit));assert.equal(ack.commonUpserts.projects[0].updatedAt,'commit-4');assert.equal(f.gateway.readRows()[0].name,edit.name);
const writes=store.metrics().writes;assert.deepEqual(copy(f.gateway.saveProject(edit)),ack);assert.equal(store.metrics().writes,writes,'replay returns the original ACK without writes');
assert.throws(()=>f.gateway.saveProject({...edit,name:'Versione obsoleta',updatedAt:'commit-2'}),e=>e.name==='OperationMismatch'||e.name==='ConflictError');
assert.throws(()=>f.gateway.saveProject({name:'Lettura',description:'Duplicato'}),e=>e.name==='DataError');
const created=copy(f.gateway.saveProject({name:'Nuovo progetto',description:'Creato',updatedAt:''})).commonUpserts.projects[0];assert.equal(created.slug,'nuovo-progetto');assert.equal(created.updatedAt,'commit-6');
assert.deepEqual(copy(f.gateway.saveProject({name:'Nuovo progetto',description:'Creato',updatedAt:''})).commonUpserts.projects[0],created);
assert.equal(f.gateway.readRows().length,3);assert.equal(f.gateway.readRows().find(p=>p.slug===legacy.slug).description,edit.description);
for(const rows of [[legacy,legacy,other],[{...legacy,name:'Modifica esterna'},other], [other]]){
 const blocked=open(createCommitStore(scope,store.snapshot()),rows);assert.throws(()=>blocked.gateway.readRows(),e=>e.name==='CommitBlocked');
}
// A reservation and every prepare/apply/commit write survive lost Sheet/Range replies.
const sheets=createFaultSheets(),sheetCtx=context(sheets.globals),sheetStore=sheetCtx.syncSheetsCommitStore_(sheets.index,sheets.blocks,archive,sheets.services);sheetStore.withLock(()=>sheetStore.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));const initial=sheets.snapshot(),measure=createFaultSheets(initial),measureCtx=context(measure.globals),measureStore=measureCtx.syncSheetsCommitStore_(measure.index,measure.blocks,archive,measure.services),measureGateway=measureCtx.syncProjectMigrationGateway_(measureStore,scope,{read:slug=>slug===legacy.slug?[legacy]:[],readRows:()=>[legacy],saveLegacy(){throw Error('unexpected');}});copy(measureGateway.migrate(projectInput));const events=measure.metrics().events.length;let cases=0;
function sheetGateway(f){const ctx=context(f.globals),commitStore=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);return ctx.syncProjectMigrationGateway_(commitStore,scope,{read:slug=>slug===legacy.slug?[legacy]:[],readRows:()=>[legacy],saveLegacy(){throw Error('unexpected');}});}
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const fault=createFaultSheets(initial);fault.fault(at,phase);assert.throws(()=>sheetGateway(fault).migrate(projectInput));const reboot=sheetGateway(createFaultSheets(fault.snapshot()));assert.deepEqual(copy(reboot.migrate(projectInput)),migrated);assert.equal(reboot.readRows()[0].updatedAt,'commit-2');cases++;
}
const disabled=createFaultSheets(initial);disabled.setEnabled(false);assert.throws(()=>sheetGateway(disabled).migrate(projectInput),e=>e.name==='ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
console.log(`Project migration gateway: frozen rows/overlay, name uniqueness, stable ACK and ${cases} Sheet/Range fault recoveries OK.`);
