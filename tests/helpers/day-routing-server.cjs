// Synthetic Apps Script server shared by V8 and browser tests. Never Google.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createFaultSheets}=require('./fault-sheets.cjs'),{seal}=require('./recoverable-commit-store.cjs');
const backend=fs.readFileSync(path.resolve(__dirname,'../../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],copy=value=>JSON.parse(JSON.stringify(value));
function createDayRoutingServer(snapshot,options={}){
 const ledger=options.ledger||createFaultSheets(snapshot?.ledger),ctx=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});vm.runInContext(backend,ctx);
 if(snapshot){
  ctx.restored=copy(snapshot);vm.runInContext('Object.assign(mockProps,restored.props);restored.users.forEach(([key,value])=>mockUserProperties.set(key,value));if(restored.rawSheets)Object.entries(restored.rawSheets).forEach(([name,data])=>{(mockSheets[name]||db.insertSheet(name)).data=data;});mockSheets.Days.data=restored.days;demoScriptCache.clear();ioReset_();',ctx);
 }else for(const seed of options.seedDays||[{date:'2026-10-28',reflection:'Riga originaria sintetica'}]){
  ctx.seed=seed;vm.runInContext('saveDay({...seed,updatedAt:rows_(mockSheets.Days,DAY_HEADERS).find(row=>row.date===seed.date)?.updatedAt||\'\'});',ctx);
 }
 for(const seed of snapshot?[]:options.seedWeeks||[]){ctx.seedWeek=seed;vm.runInContext('saveWeek({...seedWeek,updatedAt:rows_(mockSheets.Weeks,WEEK_HEADERS).find(row=>row.week===seedWeek.week)?.updatedAt||\'\'});',ctx);}
 const practices=copy(snapshot?.practices||[]);
 for(const seed of snapshot?[]:options.seedPractices||[]){ctx.seedPractice=seed;practices.push(copy(vm.runInContext(`(()=>{
  const seed=seedPractice,goal=saveGoal({title:'Obiettivo sintetico del controller',cycle:seed.cycle||'2026-Q4',target:'3',progress:'0',context:{incrementalCommon:true}}).commonUpserts.goals[0];
  const habit=saveHabit({goalId:goal.id,title:seed.title||'Pratica sintetica',days:seed.days||'weekly:3',start:seed.start||'2026-10-01',steps:seed.steps||'',context:{incrementalCommon:true}}).commonUpserts.habits[0];
  const steps=JSON.parse(habit.steps),checked=(seed.checkedIndices||[]).map(i=>steps[i].id);
  const log=setHabitLog({habitId:habit.id,date:seed.date||'2026-10-28',status:seed.status||'pending',checked,habitUpdatedAt:habit.updatedAt,updatedAt:''}).commonUpserts.habitLogs[0];
  return {goal,habit,log};
 })()`,ctx)));}
 const manifest=copy(ctx.getSyncManifest()),scope={archiveId:manifest.archiveId,epoch:manifest.epoch,principalId:manifest.principalId};assert(manifest.identityVerified);
 ctx.syntheticLedger=ledger;ctx.syntheticUtilities=ledger.globals.Utilities;
 if(options.sharedLock)vm.runInContext('LockService.getScriptLock=syntheticLedger.globals.LockService.getScriptLock;',ctx);
 vm.runInContext(`Object.assign(Utilities,syntheticUtilities);SpreadsheetApp.flush=syntheticLedger.globals.SpreadsheetApp.flush;
  mockSheets.HabitLogs.getSheetId=()=>14;mockSheets.HabitLogs.getParent=()=>db;
  mockSheets.Habits.getSheetId=()=>15;mockSheets.Habits.getParent=()=>db;
  mockSheets.Goals.getSheetId=()=>16;mockSheets.Goals.getParent=()=>db;
  mockSheets.Weeks.getSheetId=()=>13;mockSheets.Weeks.getParent=()=>db;
  mockSheets.Projects.getSheetId=()=>17;mockSheets.Projects.getParent=()=>db;
  mockSheets.Entries.getSheetId=()=>18;mockSheets.Entries.getParent=()=>db;
  mockSheets.Days.getSheetId=()=>10;mockSheets.Days.getParent=()=>db;
  syntheticLedger.index.getSheetId=()=>11;syntheticLedger.index.getParent=()=>db;
  syntheticLedger.blocks.getSheetId=()=>12;syntheticLedger.blocks.getParent=()=>db;
  db.getSheetById=id=>({10:mockSheets.Days,11:syntheticLedger.index,12:syntheticLedger.blocks,13:mockSheets.Weeks,14:mockSheets.HabitLogs,15:mockSheets.Habits,16:mockSheets.Goals,17:mockSheets.Projects,18:mockSheets.Entries})[id];`,ctx);
 if(!snapshot){const store=ctx.syncSheetsCommitStore_(ledger.index,ledger.blocks,{archiveId:scope.archiveId,epoch:scope.epoch},ledger.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive:{archiveId:scope.archiveId,epoch:scope.epoch},committedThrough:0,pending:null})));}
 return {ctx,ledger,scope,practices,projectController:ctx.syncProjectRoutingServer_({allowConfigure:true,allowMigration:true}),entryController:ctx.syncEntryRoutingServer_({allowConfigure:true,allowMigration:true,allowEntryActivation:true}),habitLogController:ctx.syncHabitLogRoutingServer_({allowConfigure:true,allowMigration:true}),controller:ctx.syncDayRoutingServer_({allowConfigure:true,allowMigration:true}),weekController:ctx.syncWeekRoutingServer_({allowConfigure:true,allowMigration:true}),
  snapshot(){return {practices:copy(practices),...copy(vm.runInContext('({props:mockProps,users:[...mockUserProperties],days:mockSheets.Days.data,rawSheets:Object.fromEntries(Object.entries(mockSheets).map(([name,sheet])=>[name,sheet.data]))})',ctx)),ledger:ledger.snapshot()};}};
}
module.exports={createDayRoutingServer};
