const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore}=require('./helpers/recoverable-commit-store.cjs');
const scope={archiveId:'synthetic-log-app-archive',principalId:'synthetic-log-app-principal',epoch:'synthetic-log-app-epoch'},adapter=createCommitStore(scope);
const ctx=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console,syntheticStore:adapter.store,syntheticScope:scope,syntheticAdapter:adapter});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(condition,message)=>{if(!condition)throw Error(message);},copy=value=>JSON.parse(JSON.stringify(value));
 const fails=(fn,name)=>{let thrown;try{fn();}catch(e){thrown=e;}check(thrown?.name===name,'expected '+name+', got '+thrown?.name);};
 const goal=saveGoal({title:'Obiettivo sintetico',cycle:'2026-Q4',target:'3',progress:'0',context:{incrementalCommon:true}}).commonUpserts.goals[0];
 let habit=saveHabit({goalId:goal.id,title:'Pratica sintetica',days:'weekly:3',start:'2026-10-01',steps:'Prima 🌱\\nSeconda',context:{incrementalCommon:true}}).commonUpserts.habits[0];
 const other=saveHabit({goalId:goal.id,title:'Pratica indipendente',days:'weekly:3',start:'2026-10-01',steps:'',context:{incrementalCommon:true}}).commonUpserts.habits[0];
 const date='2026-10-28',key=habit.id+'|'+date,steps=JSON.parse(habit.steps),payload={habitId:habit.id,date,status:'pending',checked:[steps[0].id],habitUpdatedAt:habit.updatedAt,updatedAt:''};
 const first=setHabitLog(payload).commonUpserts.habitLogs[0];
 HABIT_LOG_COMMIT_GATEWAY=syncHabitLogMigrationGateway_(syntheticStore,syntheticScope,syncHabitLogSheetSource_(mockSheets.HabitLogs,mockSheets.Habits,mockSheets.Goals));
 const legacyOther=setHabitLog({habitId:other.id,date,status:'done',updatedAt:''}).commonUpserts.habitLogs[0];
 check(syntheticAdapter.snapshot().head.committedThrough===0,'unmigrated logs remain legacy without import');
 const preview=HABIT_LOG_COMMIT_GATEWAY.preview(key);
 HABIT_LOG_COMMIT_GATEWAY.migrate({operationId:'synthetic-log-app-migrate',key,expectedLegacy:preview.legacy,expectedCatalog:preview.catalog,record:preview.record});
 const frozen=copy(mockSheets.HabitLogs.data.find(row=>row[0]===key));
 const completed=setHabitLog({...payload,updatedAt:first.updatedAt,checked:steps.map(s=>s.id)}).commonUpserts.habitLogs[0];
 check(completed.status==='done'&&completed.updatedAt==='commit-4','pre-migration version accepted and status derived');
 check(JSON.stringify(mockSheets.HabitLogs.data.find(row=>row[0]===key))===JSON.stringify(frozen),'legacy preimage frozen');
 const full=getState({context:{view:'settings'}});check(full.habitLogs.find(row=>row.key===key).updatedAt===completed.updatedAt,'full reader canonical');
 for(const context of [{view:'journal',commonWindow:'journal',month:'2026-10'},{view:'week',commonWindow:'week',week:'2026-10-26'},{view:'habits',commonWindow:'habits',week:'2026-10-26',date}]){
  const response=getState({context});check(response.commonSlices.habitLogs.rows.find(row=>row.key===key)?.updatedAt===completed.updatedAt,'period reader '+context.view);
 }
 fails(()=>setHabitLog({...payload,updatedAt:first.updatedAt,status:'skipped'}),'ConflictError');
 fails(()=>saveRecord_('HabitLogs',LOG_HEADERS,'key',{key,status:'skipped'},completed.updatedAt),'ProtocolUnavailable');
 habit=saveHabit({...habit,steps:'Nuova definizione',context:{incrementalCommon:true}}).commonUpserts.habits[0];
 const edited=setHabitLog({...payload,habitUpdatedAt:habit.updatedAt,updatedAt:completed.updatedAt,checked:[]}).commonUpserts.habitLogs[0];
 check(JSON.stringify(JSON.parse(edited.checklist).steps)===JSON.stringify(steps),'historical steps survive catalogue edit');
 const pending={...payload,habitUpdatedAt:habit.updatedAt,updatedAt:edited.updatedAt,checked:steps.map(s=>s.id)};
 syntheticAdapter.fault(syntheticAdapter.metrics().writes+10,'after');fails(()=>setHabitLog(pending),'StorageError');
 const retry=setHabitLog(pending),writes=syntheticAdapter.metrics().writes;check(retry.commonUpserts.habitLogs[0].status==='done','uncertain ACK recovered');
 check(JSON.stringify(setHabitLog(pending))===JSON.stringify(retry)&&syntheticAdapter.metrics().writes===writes,'retry no new writes');
 // Same-date identities remain separate and canonical-only logs are found once.
 const absent=habit.id+'|2026-10-29',catalog=HABIT_LOG_COMMIT_GATEWAY.preview(absent).catalog;
 const empty=syncPrepareHabitLogEdit_({habitId:habit.id,date:'2026-10-29',status:'pending',checked:[]},null,catalog).record;
 HABIT_LOG_COMMIT_GATEWAY.migrate({operationId:'synthetic-log-app-empty',key:absent,expectedLegacy:null,expectedCatalog:catalog,record:empty});
 check(commonDateSlice_(mockSheets.HabitLogs,LOG_HEADERS,'date','2026-10-29','2026-10-29').rows.filter(row=>row.key===absent).length===1,'canonical-only log discovered');
 check(rows_(mockSheets.HabitLogs,LOG_HEADERS).find(row=>row.key===legacyOther.key).status==='done','other habit on same date preserved');
 // One archive head shared by Days, Weeks and HabitLogs, with disjoint routing.
 const day=saveDay({date,intention:'Giorno condiviso',updatedAt:''}).commonUpserts.days[0];
 DAY_COMMIT_GATEWAY=syncDayMigrationGateway_(syntheticStore,syntheticScope,syncDaySheetSource_(mockSheets.Days));
 DAY_COMMIT_GATEWAY.migrate({date,expectedLegacy:day,operationId:'synthetic-log-shared-day'});
 const week='2026-10-26',weekly=saveWeek({week,focus:'Focus',priorities:'Tre priorità',wins:'Vittoria',obstacles:'Tempo',lessons:'Ascolto',next:'Avanti',energy:'3',closed:'no',updatedAt:''}).commonUpserts.weeks[0];
 WEEK_COMMIT_GATEWAY=syncWeekMigrationGateway_(syntheticStore,syntheticScope,syncWeekSheetSource_(mockSheets.Weeks));
 WEEK_COMMIT_GATEWAY.migrate({week,expectedLegacy:weekly,operationId:'synthetic-log-shared-week'});
 const weekEdit=saveWeek({...weekly,wins:'Settimana condivisa'}).commonUpserts.weeks[0];
 const logEdit=setHabitLog({...pending,updatedAt:retry.commonUpserts.habitLogs[0].updatedAt,status:'skipped'}).commonUpserts.habitLogs[0];
 check(Number(logEdit.updatedAt.slice(7))===Number(weekEdit.updatedAt.slice(7))+2,'three domains share monotonic head');
 check(rows_(mockSheets.Days,DAY_HEADERS).find(row=>row.date===date).intention===day.intention,'day preserved');
 // Bounded lookups for raw logs AND catalogue preimages, with 50k unrelated
 // rows per table. No request-wide cached catalogue can hide later changes.
 const rawSource=syncHabitLogSheetSource_(mockSheets.HabitLogs,mockSheets.Habits,mockSheets.Goals);
 const probe=()=>{ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};try{rawSource.readCatalog(key);rawSource.read(key);return {...ACTIVE_TRACE.metrics};}finally{ACTIVE_TRACE=null;}};
 const periodProbe=()=>traceApi({operation:'getState',traceId:'synthetic-habit-log-window',arg:{context:{view:'week',commonWindow:'week',week:'2026-10-26',catalogFresh:true}}});
 const small=probe(),smallPeriod=periodProbe();check(Number.isFinite(small.sheetReadCells)&&small.sheetReadCells>0&&smallPeriod.ok,'nonempty metrics from actual reads');for(let i=0;i<50000;i++){
  mockSheets.HabitLogs.data.push(LOG_HEADERS.map(k=>k==='key'?'unrelated-log-'+i:k==='date'?'2000-01-01':''));
  mockSheets.Habits.data.push(HABIT_HEADERS.map(k=>k==='id'?'unrelated-habit-'+i:''));
  mockSheets.Goals.data.push(GOAL_HEADERS.map(k=>k==='id'?'unrelated-goal-'+i:''));
 }
 const large=probe(),largePeriod=periodProbe();check(small.sheetReadCells===large.sheetReadCells,'targeted dependency and log cells independent of 50k rows');check(largePeriod.ok&&largePeriod.diagnostics.sheetReadCells===smallPeriod.diagnostics.sheetReadCells,'canonical period cells independent of 50k rows');
 deleteHabit({id:habit.id,updatedAt:habit.updatedAt,context:{incrementalCommon:true}});
 check(JSON.stringify(setHabitLog(pending))===JSON.stringify(retry),'committed retry survives habit archival');
 fails(()=>setHabitLog({...pending,updatedAt:logEdit.updatedAt,status:'pending',checked:[]}),'CommitBlocked');
 check(commonDateSlice_(mockSheets.HabitLogs,LOG_HEADERS,'date',date,date).rows.find(row=>row.key===key).status==='skipped','archival keeps historical reads');
 const raw=mockSheets.HabitLogs.data.find(row=>row[0]===key);raw[LOG_HEADERS.indexOf('status')]='skipped';
 fails(()=>setHabitLog(pending),'CommitBlocked');fails(()=>rows_(mockSheets.HabitLogs,LOG_HEADERS),'CommitBlocked');
 console.log('Habit log migration app: real Demo setHabitLog/full/period readers, old versions, historical steps after catalogue edits/archive, lost ACK, disjoint same-date identities, canonical-only logs, shared Days/Weeks head, bypass/divergence barriers and 50k per-table targeted reads OK.');
}`,ctx);
