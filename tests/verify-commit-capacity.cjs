const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs'),{seal}=require('./helpers/recoverable-commit-store.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const scope={archiveId:'synthetic-capacity-archive',principalId:'synthetic-capacity-principal',epoch:'synthetic-capacity-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const copy=value=>JSON.parse(JSON.stringify(value)),value=result=>{assert(result.ok,JSON.stringify(result));return copy(result.value);};
function open(f,flags={maintenance:true}){const ctx=vm.createContext({...f.globals});vm.runInContext(source,ctx);const store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,{...f.services,maintenanceEnabled:()=>flags.maintenance});return {ctx,store,protocol:ctx.syncCommitProtocol_(store,scope)};}
function initialized(){const f=createFaultSheets(),{store}=open(f);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));f.reset();return f;}
const request=(operationId='synthetic-capacity-create',baseVersion=null)=>({operationId,changes:[{collection:'entries',id:'invented-note',baseVersion,action:'upsert',data:{text:'Solo testo inventato 🌱 '+operationId}}]});
const headKey=f=>f.snapshot().index.data[1][0];
function padded(f,key,total){return f.mutate(state=>{let count=state.index.data.filter(row=>row[0]===key).length;while(count++<total)state.index.data.push([key,'','unpublished','']);state.index.capacity=state.index.data.length;});}
const descriptor={kind:'head',id:'head',writes:2},compact={kind:'head',id:'head',dryRun:false,limit:128};
// Head lookup remains readable at 512; a new operation is refused before prepare.
const initial=initialized(),key=headKey(initial),full=padded(initial,key,511),fullOpen=open(full);
const report=fullOpen.store.withLock(()=>fullOpen.store.preflightWrites([descriptor]));assert(!report.available);assert.equal(report.keys[0].used,511);assert.equal(report.keys[0].remaining,1);assert.equal(full.metrics().events.length,0);assert(!JSON.stringify(report).includes('invented-note'));
assert.equal(fullOpen.protocol.execute(request()).error,'ProtocolUnavailable');assert.equal(full.metrics().events.length,0);assert.equal(value(fullOpen.protocol.recover()).committedThrough,0);
const budget=open(initial).store;const freshBudget=budget.withLock(()=>budget.preflightWrites([{kind:'receipt',id:[scope.principalId,'synthetic-capacity-create'],writes:1},{kind:'operation',id:[scope.principalId,'synthetic-capacity-create'],writes:1}]));
const receiptFull=padded(initial,freshBudget.keys[0].key,512);assert.equal(open(receiptFull).protocol.execute(request()).error,'ProtocolUnavailable');assert.equal(receiptFull.metrics().events.length,0);
const aliasFull=initial.mutate(state=>{for(let i=0;i<512;i++)state.index.data.push(['unpublished-key-'+i,freshBudget.keys[1].key,'','']);state.index.capacity=state.index.data.length;});assert.equal(open(aliasFull).protocol.execute(request()).error,'ProtocolUnavailable');assert.equal(aliasFull.metrics().events.length,0);
const atBoundary=padded(initial,key,510),boundary=open(atBoundary),ack=value(boundary.protocol.execute(request()));assert.equal(ack.sequence,1);
assert.equal(boundary.store.withLock(()=>boundary.store.preflightWrites([descriptor])).keys[0].used,512);
const count=atBoundary.metrics().events.length;assert.deepEqual(value(boundary.protocol.execute(request())),ack);assert.equal(atBoundary.metrics().events.length,count,'ACK retry at capacity is read-only');
assert.equal(boundary.protocol.execute(request('synthetic-capacity-update','commit-1')).error,'ProtocolUnavailable');assert.equal(atBoundary.metrics().events.length,count);
const head=boundary.store.withLock(()=>boundary.store.readHead());assert.throws(()=>boundary.store.withLock(()=>boundary.store.writeHead(seal({format:'sync-head/v1',archive,pending:null,committedThrough:2}))),error=>error.name==='ProtocolUnavailable');assert.equal(atBoundary.metrics().events.length,count,'hard append guard precedes fragments and cannot create ref 513');
// Dry-run is read-only; bounded retirement preserves the latest row and payloads.
atBoundary.reset();const physicalBefore=atBoundary.snapshot();
const dry=boundary.store.withLock(()=>boundary.store.compactReferences({...compact,dryRun:true}));assert.equal(dry.eligible,511);assert.equal(dry.planned,128);assert.equal(atBoundary.metrics().events.length,0);
let batches=0,last;do{last=boundary.store.withLock(()=>boundary.store.compactReferences(compact));assert(last.retired<=128);batches++;}while(last.hasMore);
assert.equal(batches,4);assert.equal(last.remaining,1);assert.deepEqual(boundary.store.withLock(()=>boundary.store.readHead()),head);assert.deepEqual(atBoundary.snapshot().blocks,physicalBefore.blocks,'no payload reclamation');assert.equal(atBoundary.snapshot().index.data.length,physicalBefore.index.data.length,'no physical row deletion');
assert.equal(boundary.store.withLock(()=>boundary.store.preflightWrites([descriptor])).keys[0].used,1);
value(boundary.protocol.execute(request('synthetic-capacity-update','commit-1')));assert.equal(value(boundary.protocol.read('entries','invented-note')).entity.version,'commit-2');
// Mutable entity budget is also checked before preparing a new head.
const entityBase=initialized(),entityEngine=open(entityBase);value(entityEngine.protocol.execute(request()));
const entityKey=entityBase.snapshot().index.data.find(row=>row[0]!==headKey(entityBase)&&row[1]===''&&row[3]?.startsWith('ok:'))[0];
const entityFull=padded(entityBase,entityKey,512),entityOpen=open(entityFull);assert.equal(entityOpen.protocol.execute(request('synthetic-full-entity-edit','commit-1')).error,'ProtocolUnavailable');assert.equal(entityFull.metrics().events.length,0);
const entityCompact={kind:'entity',id:['entries','invented-note'],dryRun:false,limit:128};while(entityOpen.store.withLock(()=>entityOpen.store.compactReferences(entityCompact)).hasMore){}
value(entityOpen.protocol.execute(request('synthetic-full-entity-edit','commit-1')));
// Compaction preserves the prepared head even when recovery needs quota.
const pending=padded(initial,key,510),measured=padded(initial,key,510);value(open(measured).protocol.execute(request()));const publications=measured.metrics().events.map((event,index)=>event==='index:write:1x1'?index+1:0).filter(Boolean);
pending.fault(publications[0],'after');assert(!open(pending).protocol.execute(request()).ok);
const pendingFull=padded(createFaultSheets(pending.snapshot()),key,512),pendingOpen=open(pendingFull);assert.equal(pendingOpen.protocol.recover().error,'ProtocolUnavailable');
const prepared=pendingOpen.store.withLock(()=>pendingOpen.store.readHead());assert(prepared.pending);assert.equal(prepared.committedThrough,0);
pendingOpen.store.withLock(()=>pendingOpen.store.compactReferences(compact));assert.deepEqual(pendingOpen.store.withLock(()=>pendingOpen.store.readHead()),prepared);
assert.equal(value(pendingOpen.protocol.recover()).committedThrough,1);assert.deepEqual(value(pendingOpen.protocol.execute(request())),ack);
// The Days bridge reserves four head references before its two-commit operation.
const migrationDate='2026-10-28',migrationRequest={operationId:'synthetic-capacity-migration',date:migrationDate,expectedLegacy:null};
function gateway(f){const {ctx,store}=open(f);return ctx.syncDayMigrationGateway_(store,scope,{read:()=>[],readRows:()=>[],saveLegacy(){throw Error('unexpected');}});}
const insufficient=padded(initial,key,509);assert.throws(()=>gateway(insufficient).migrate(migrationRequest),error=>error.name==='ProtocolUnavailable');assert.equal(insufficient.metrics().events.length,0,'reserve is not published when the full operation has insufficient capacity');
const enough=padded(initial,key,508);assert.equal(gateway(enough).migrate(migrationRequest).sequence,2);assert.equal(gateway(enough).readRows()[0].date,migrationDate);
// Crash at every retirement RPC and every prefix of its first key replacement.
const history=initialized(),historyOpen=open(history);const creates=[];for(let i=0;i<3;i++)creates.push(value(historyOpen.protocol.execute(request('synthetic-history-edit-'+i,i?'commit-'+i:null))));
const historySnapshot=history.snapshot(),historyHead=historyOpen.store.withLock(()=>historyOpen.store.readHead());
const cursor={format:'sync-cursor/v1',...scope,sequence:0},feed=value(historyOpen.protocol.changes({cursor,limit:5}));
let cases=0;
for(const target of [{...compact,limit:2},{...entityCompact,limit:2}]){
 const measure=createFaultSheets(historySnapshot),engine=open(measure);engine.store.withLock(()=>engine.store.compactReferences(target));const labels=measure.metrics().events;
 const variants=[];for(const phase of ['before','after','partial'])for(let at=1;at<=labels.length;at++)variants.push({at,phase});
 const firstWrite=labels.indexOf('index:write:1x1')+1;for(let prefix=0;prefix<=72;prefix++)variants.push({at:firstWrite,phase:'partial',prefix});
 for(const fault of variants){
  const broken=createFaultSheets(historySnapshot);broken.fault(fault.at,fault.phase,fault.prefix);const crashed=open(broken);assert.throws(()=>crashed.store.withLock(()=>crashed.store.compactReferences(target)));
  const reboot=createFaultSheets(broken.snapshot()),resumed=open(reboot);assert.deepEqual(resumed.store.withLock(()=>resumed.store.readHead()),historyHead);
  assert.deepEqual(value(resumed.protocol.changes({cursor,limit:5})),feed);assert.deepEqual(value(resumed.protocol.execute(request('synthetic-history-edit-0'))),creates[0]);
  while(resumed.store.withLock(()=>resumed.store.compactReferences(target)).hasMore){}
  assert.deepEqual(value(resumed.protocol.changes({cursor,limit:5})),feed);assert.deepEqual(reboot.snapshot().blocks,historySnapshot.blocks);cases++;
 }
}
// Tombstones and all immutable feed/receipt records survive mutable retirement.
const deleted=createFaultSheets(historySnapshot),deletedOpen=open(deleted);value(deletedOpen.protocol.execute({operationId:'synthetic-capacity-delete',changes:[{collection:'entries',id:'invented-note',baseVersion:'commit-3',action:'delete'}]}));
deletedOpen.store.withLock(()=>deletedOpen.store.compactReferences(entityCompact));const tombstone=value(deletedOpen.protocol.read('entries','invented-note')).entity;assert(tombstone.deleted);assert.equal(tombstone.version,'commit-4');assert.deepEqual(value(deletedOpen.protocol.execute(request('synthetic-history-edit-0'))),creates[0]);
// Maintenance opt-in, access rechecks and schema barriers precede retirement.
const disabled=createFaultSheets(historySnapshot),flags={maintenance:false},disabledOpen=open(disabled,flags);disabledOpen.store.withLock(()=>disabledOpen.store.compactReferences({...compact,dryRun:true}));assert.throws(()=>disabledOpen.store.withLock(()=>disabledOpen.store.compactReferences(compact)),error=>error.name==='ProtocolUnavailable');assert.equal(disabled.metrics().events.length,0);
assert.throws(()=>disabledOpen.store.compactReferences(compact),error=>error.name==='ProtocolUnavailable');
for(const kind of ['receipt','commit','operation'])assert.throws(()=>disabledOpen.store.withLock(()=>disabledOpen.store.compactReferences({...compact,kind})),error=>error.name==='DataError');
const corrupt=history.mutate(state=>{const row=state.index.data.filter(row=>row[0]===headKey(history)&&/^ok:/.test(row[3]||'')).at(-1);const ref=JSON.parse(Buffer.from(row[2].slice(3),'base64').toString('utf8'));state.blocks.data[ref.start-1][2]='b1:AAAA';});const corrupted=open(corrupt);assert.throws(()=>corrupted.store.withLock(()=>corrupted.store.compactReferences(compact)),error=>error.name==='ProtocolCorrupt');assert.equal(corrupt.metrics().events.length,0);
const revoked=createFaultSheets(historySnapshot),originalFlush=revoked.globals.SpreadsheetApp.flush;revoked.globals.SpreadsheetApp.flush=()=>{originalFlush();revoked.setAuthorized(false);};const revoking=open(revoked);assert.throws(()=>revoking.store.withLock(()=>revoking.store.compactReferences(compact)),error=>error.name==='ScopeChanged');const authorizedAgain=open(createFaultSheets(revoked.snapshot()));assert.deepEqual(authorizedAgain.store.withLock(()=>authorizedAgain.store.readHead()),historyHead);
const shared=createFaultSheets(historySnapshot),sharedOpen=open(shared),foreignArchive={...archive,archiveId:'synthetic-capacity-foreign'},foreign=sharedOpen.ctx.syncSheetsCommitStore_(shared.index,shared.blocks,foreignArchive,{...shared.services,maintenanceEnabled:()=>true});
const foreignHead=seal({format:'sync-head/v1',archive:foreignArchive,committedThrough:0,pending:null});foreign.withLock(()=>foreign.writeHead(foreignHead));sharedOpen.store.withLock(()=>sharedOpen.store.compactReferences(compact));assert.deepEqual(foreign.withLock(()=>foreign.readHead()),foreignHead,'another archive is untouched');
console.log('Commit capacity: 510/511/512 boundaries, hard no-513 guard, aggregate Days budget, dry-run/bounded head+entity retirement, pending recovery, '+cases+' RPC/prefix restart faults, immutable feed/ACK/tombstone preservation and maintenance/auth guards OK; payloads retained.');
