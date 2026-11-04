const assert=require('assert'),{createDayRoutingServer}=require('./helpers/day-routing-server.cjs');
const context={incrementalCommon:true};
function fixture(snapshot){
 const server=createDayRoutingServer(snapshot),{ctx,projectController,entryController}=server;
 if(!snapshot){
  const project=ctx.saveProject({name:'Conversione recuperabile',description:'Fixture sintetica',context}).commonUpserts.projects[0];
  const entry=ctx.addJournal({date:'2026-10-29',text:'Voce collegata recuperabile',projects:project.slug,scope:'project',requestId:'synthetic-tag-recovery-entry',context}).entries[0];
  projectController.register({projectsSheetId:17,indexSheetId:11,blockSheetId:12});projectController.setMode({mode:'active',expectedRevision:1});
  entryController.register({entriesSheetId:18,indexSheetId:11,blockSheetId:12});entryController.setMode({mode:'active',expectedRevision:1});
  return {server,project,entry};
 }
 return {server};
}
const base=fixture(),baseSnapshot=base.server.snapshot(),project=base.project,preview=base.server.ctx.previewProjectAsTag({slug:project.slug}),input={slug:project.slug,tag:'recupero',signature:preview.signature,context};
const measured=fixture(baseSnapshot);measured.server.ledger.reset();const expected=measured.server.ctx.convertProjectToTag(input),events=measured.server.ledger.metrics().events.length;
assert.equal(expected.convertedCount,1);assert.equal(measured.server.projectController.resolve().readRows().some(row=>row.slug===project.slug),false);assert.equal(measured.server.entryController.resolve().read(base.entry.id).tags,'recupero');
let cases=0;
for(const phase of ['before','after','partial'])for(let at=1;at<=events;at++){
 const attempt=fixture(baseSnapshot);attempt.server.ledger.reset();attempt.server.ledger.fault(at,phase);
 try{attempt.server.ctx.convertProjectToTag(input);}catch(error){assert(['StorageError','ProtocolCorrupt','ProtocolUnavailable','CommitBlocked'].includes(error.name),`${phase} ${at}: unexpected ${error.name}`);}
 const reboot=fixture(attempt.server.snapshot()),replayed=reboot.server.ctx.convertProjectToTag(input);
 assert.deepEqual(replayed,expected,`${phase} ${at}: conversion resumes with the stable receipt`);
 assert.equal(reboot.server.projectController.resolve().readRows().some(row=>row.slug===project.slug),false);
 assert.equal(reboot.server.entryController.resolve().read(base.entry.id).tags,'recupero');cases++;
}
console.log(`Project-to-tag conversion: atomic Entry updates/project tombstone, frozen source rows, durable preparation/replay and ${cases} Sheet/Range fault recoveries OK.`);
