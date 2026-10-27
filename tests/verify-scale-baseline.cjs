const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const {createSyntheticArchive}=require('./helpers/synthetic-archive.cjs');
const backend=fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],results=[];
for(const entryCount of [499,500,501,1000,10000,50000]){
 const fixture=createSyntheticArchive({entryCount,longBodyLength:0});
 const ctx={window:{},document:{addEventListener(){}},setTimeout,console,fixture};vm.createContext(ctx);vm.runInContext(backend,ctx);
 const measurements=vm.runInContext(`(()=>{
  mockSheets.Entries.data=[ENTRY_HEADERS,...fixture.entries];mockSheets.TaskPlans.data=[PLAN_HEADERS,...fixture.plans];
  mockSheets.Days.data=[DAY_HEADERS,...fixture.days];mockSheets.Weeks.data=[WEEK_HEADERS,...fixture.weeks];mockSheets.HabitLogs.data=[LOG_HEADERS,...fixture.habitLogs];
  const layout=mockSheets.JournalLayout||(mockSheets.JournalLayout=new MockSheet('JournalLayout'));layout.data=[JOURNAL_LAYOUT_HEADERS,...fixture.layout];
  mockSheets.DocRefs.data=[REF_HEADERS];
  MockItem.prototype.getLastUpdated=function(){return new Date(1000);};
  const traceId='synthetic-scale-trace-0001';
  const first=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10',taskArchive:true,taskOnly:true}});
  if(!first.ok||first.value.total!==fixture.summary.taskCount)throw Error('Task baseline mismatch');
  const expected=fixture.entries.filter(e=>e[2]==='task').map(e=>e[0]).sort();
  if(first.value.entries.length!==Math.min(25,expected.length))throw Error('Page size mismatch');
  let second=null;if(first.value.nextCursor){second=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10',taskArchive:true,taskOnly:true,cursor:first.value.nextCursor}});if(!second.ok)throw Error('Second page failed');const ids=first.value.entries.concat(second.value.entries).map(e=>e.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate page IDs');}
  const state=traceApi({operation:'getState',traceId,arg:{context:{view:'tasks',month:'2026-10',commonFresh:true}}});
  if(!state.ok||state.value.entries.length!==fixture.summary.activeTaskCount)throw Error('Active task baseline mismatch');
  const common=traceApi({operation:'getCommonState',traceId,arg:{context:{view:'habits',month:'2026-10'}}});
  if(!common.ok||common.value.days.length!==fixture.days.length||common.value.weeks.length!==fixture.weeks.length||common.value.habitLogs.length!==fixture.habitLogs.length)throw Error('Common history mismatch');
  const metadata=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10',taskArchive:true,taskOnly:true,metadataOnly:true}});
  if(!metadata.ok||metadata.value.entries.length!==Math.min(200,fixture.summary.taskCount)||metadata.value.entries.some(e=>e.contentLoaded!==false||'body' in e||'rich' in e))throw Error('Metadata page mismatch');
  let indexed=null;if(metadata.value.nextCursor){if(!metadata.value.taskSnapshot)throw Error('Synthetic index should fit cache budget');indexed=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10',taskArchive:true,taskOnly:true,metadataOnly:true,cursor:metadata.value.nextCursor,taskSnapshot:metadata.value.taskSnapshot,snapshotOffset:metadata.value.snapshotOffset}});if(!indexed.ok||indexed.value.snapshotReset)throw Error('Index continuation mismatch');}
  return {entryCount:fixture.summary.entryCount,taskCount:fixture.summary.taskCount,first:first.diagnostics,second:second?.diagnostics||null,metadata:metadata.diagnostics,indexed:indexed?.diagnostics||null,metadataEntries:metadata.value.entries.length,active:state.diagnostics,common:common.diagnostics};
 })()`,ctx);
 assert(measurements.first.sheetReadRequests>0&&measurements.first.sheetReadCells>0);
 assert.equal(measurements.first.lockAttempts,undefined,'journal read remains unlocked');
 assert(!measurements.metadata.docsOpenCalls&&!measurements.metadata.driveCalls&&!measurements.metadata.docContentCalls&&!measurements.metadata.contentPayloadCells,'metadata has no body reads');
 if(measurements.indexed){assert.equal(measurements.indexed.taskIndexHits,1);assert(!measurements.indexed.sheetReadRequests&&!measurements.indexed.sheetReadCells,'indexed continuation reads no Sheets cells');}
 if(entryCount>500){
  const maxRequests=2*Math.ceil(entryCount/256)+5;
  for(const page of [measurements.first,measurements.second]){
   assert(page.sheetReadRequests<=maxRequests,'task metadata request budget');
   assert.equal(page.entryRequestedRows,fixture.summary.taskCount);
   assert(page.entryReadRows<=8*page.entryRequestedRows,'bounded additional metadata');
  }
 }
 results.push(JSON.parse(JSON.stringify(measurements)));
}
// Historical revisions and UTF-8 fragments: latest content must survive growth.
for(const revisionCount of [1,10,100]){
 const fixture=createSyntheticArchive({entryCount:30,revisionCount,revisedEntryCount:10,longBodyLength:35000});
 const ctx={window:{},document:{addEventListener(){}},setTimeout,console,fixture,contentRows:[...fixture.contentRows()]};vm.createContext(ctx);vm.runInContext(backend,ctx);
 const result=vm.runInContext(`(()=>{const s=docContentSheet_(true);s.data=[DOC_CONTENT_HEADERS,...contentRows];ioReset_();ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};const ids=fixture.entries.slice(0,10).map(e=>e[0]);docContentsForPage_(ids);ids.forEach((id,i)=>{const actual=docContent_(id),expected=fixture.content(i,fixture.summary.revisionCount-1);if(actual.body!==expected.body||JSON.stringify(actual.rich)!==JSON.stringify(expected.rich))throw Error('Revision content mismatch');});return {...ACTIVE_TRACE.metrics};})()`,ctx);
 assert(result.contentRowsFound>=10);results.push({revisionCount,metrics:JSON.parse(JSON.stringify(result))});
}
fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../artifacts/scale-baseline.json'),JSON.stringify({format:'gdiary-synthetic-baseline/v1',note:'Mock service counts and local durations; not Google latency',results},null,2));
console.log('Synthetic baseline: 499/500/501/1k/10k/50k entries, two task pages, active identities and 1/10/100 revisions OK; artifacts/scale-baseline.json');
