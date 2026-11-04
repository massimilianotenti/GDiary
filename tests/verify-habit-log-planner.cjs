const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const copy=value=>JSON.parse(JSON.stringify(value)),headers=name=>copy(vm.runInContext(name,ctx));
const row=(name,values)=>Object.assign(Object.fromEntries(headers(name).map(key=>[key,''])),values);
const catalog={habit:row('HABIT_HEADERS',{id:'synthetic-habit',goalId:'synthetic-goal',title:'Pratica 🌱',days:'weekly:3',start:'2026-10-01',updatedAt:'2026-10-27T10:00:00.000Z',steps:JSON.stringify([{id:'step-a',title:'Prima microazione'},{id:'step-b',title:'  Seconda microazione 🌱  '}])}),goal:row('GOAL_HEADERS',{id:'synthetic-goal',cycle:'2026-Q4',title:'Obiettivo',target:'3',progress:'0',updatedAt:'2026-10-27T09:00:00.000Z'})};
const payload={habitId:catalog.habit.id,date:'2026-10-28',status:'pending',checked:['step-a'],habitUpdatedAt:catalog.habit.updatedAt,updatedAt:''};
const prepare=(p=payload,previous=null,cat=catalog)=>copy(ctx.syncPrepareHabitLogEdit_(p,previous,cat));
const planned=prepare();assert.equal(planned.record.key,'synthetic-habit|2026-10-28');assert.equal(planned.record.status,'pending');assert.deepEqual(JSON.parse(planned.record.checklist),{steps:JSON.parse(catalog.habit.steps),checked:['step-a']});assert.deepEqual(planned.catalog,catalog);
const previous={...planned.record,updatedAt:'commit-7'};
assert.equal(prepare({...payload,checked:['step-a','step-b','step-b'],updatedAt:previous.updatedAt},previous).record.status,'done');
assert.equal(prepare({...payload,status:'skipped'},previous).record.status,'skipped');
assert.throws(()=>prepare({...payload,status:'done'}),error=>error.name==='DataError');
const omitted={...payload};delete omitted.checked;
assert.deepEqual(JSON.parse(prepare(omitted,previous).record.checklist).checked,['step-a']);assert.equal(prepare(omitted,previous).input.checked,null);
assert.deepEqual(JSON.parse(prepare({...payload,checked:[]},previous).record.checklist).checked,[]);
// Historical steps keep their IDs, titles and order after the catalogue evolves.
const evolved=copy(catalog);evolved.habit.steps=JSON.stringify([{id:'new-step',title:'Nuova definizione'}]);evolved.habit.updatedAt='2026-10-28T10:00:00.000Z';
const historical=prepare({...omitted,habitUpdatedAt:evolved.habit.updatedAt},previous,evolved);assert.equal(historical.record.checklist,planned.record.checklist);assert.deepEqual(historical.catalog,evolved);
assert.throws(()=>prepare(payload,previous,evolved),error=>error.name==='ConflictError');
// Deep copies isolate mutable callers from the captured plan and vice versa.
const isolated=prepare(),catalogBefore=copy(catalog);isolated.catalog.habit.title='Alterato';isolated.record.status='skipped';assert.deepEqual(catalog,catalogBefore);assert.deepEqual(prepare(),planned);
const mutable=copy(catalog),captured=prepare(payload,null,mutable);mutable.habit.steps='[]';assert.equal(captured.catalog.habit.steps,catalog.habit.steps);
// Empty legacy checklist is resolved explicitly using the current catalogue,
// matching the current edit API. It never fabricates historical checkmarks.
const legacy={...previous,checklist:'',status:'done'};
assert.throws(()=>prepare({...omitted,status:'done'},legacy),error=>error.name==='DataError');
assert.equal(prepare({...omitted,status:'pending'},legacy).record.status,'pending');
const simple=copy(catalog);simple.habit.steps='';assert.equal(prepare({...omitted,status:'done'},null,simple).record.status,'done');
// Fixed schedules, start dates, quarter/year/leap boundaries and dependencies.
const fixed=copy(catalog);fixed.habit.days='0,2';prepare(payload,null,fixed);
for(const [p,cat]of [
 [{...payload,date:'2026-10-29'},fixed],[{...payload,date:'2026-09-30'},catalog],
 [payload,{...catalog,habit:{...catalog.habit,start:'2026-10-29'}}],
 [payload,{...catalog,habit:{...catalog.habit,archived:'yes'}}],
 [payload,{...catalog,habit:{...catalog.habit,goalId:'other'}}],
 [payload,{...catalog,goal:{...catalog.goal,cycle:'2027-Q1'}}]
])assert.throws(()=>prepare(p,null,cat),error=>error.name==='CommitBlocked');
const leap=copy(catalog);leap.habit.start='2028-01-01';leap.goal.cycle='2028-Q1';prepare({...payload,date:'2028-02-29'},null,leap);
for(const p of [{...payload,date:'2026-02-30'},{...payload,habitId:'bad|id'},{...payload,status:'other'},{...payload,checked:'step-a'},{...payload,checked:['missing']},{...payload,habitUpdatedAt:3},{...payload,updatedAt:3}])assert.throws(()=>prepare(p),error=>error.name==='DataError');
for(const cat of [{habit:catalog.habit},{habit:catalog.habit,goal:null},{...catalog,unexpected:true}])assert.throws(()=>prepare(payload,null,cat),error=>error.name==='DataError');
assert.throws(()=>prepare(payload,{...previous,key:'wrong'}),error=>error.name==='DataError');
assert.throws(()=>prepare(payload,{...previous,checklist:'bad JSON'}),error=>['DataError','ProtocolCorrupt'].includes(error.name));
// Compare pure snapshots to the actual existing Demo mutation over a sequence
// of edits, including omitted checked, duplicate IDs, skipped and cleared checks.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
vm.runInContext(`{
 const goal=saveGoal({title:'Obiettivo planner',cycle:'2026-Q4',target:'3',progress:'0',context:{incrementalCommon:true}}).commonUpserts.goals[0];
 const habit=saveHabit({goalId:goal.id,title:'Pratica planner',days:'weekly:3',start:'2026-10-01',steps:'Prima\\nSeconda',context:{incrementalCommon:true}}).commonUpserts.habits[0];
 const ids=JSON.parse(habit.steps).map(step=>step.id);let previous=null;
 for(const edit of [{status:'pending',checked:[ids[0],ids[0]]},{status:'pending'},{status:'skipped'},{status:'pending',checked:ids},{status:'pending',checked:[]}]){
  const payload={habitId:habit.id,date:'2026-10-28',habitUpdatedAt:habit.updatedAt,updatedAt:previous?.updatedAt||'',...edit};
  const expected=syncPrepareHabitLogEdit_(payload,previous,{habit,goal}).record;
  const saved=setHabitLog(payload).commonUpserts.habitLogs[0];
  if(syncCommitCanonical_(syncHabitLogSnapshot_(Object.fromEntries(LOG_HEADERS.filter(k=>k!=='updatedAt').map(k=>[k,saved[k]]))))!==syncCommitCanonical_(expected))throw Error('planner differs from legacy API');previous=saved;
 }
}`,demo);
// No service/lock/catalogue access is hidden in the pure planner.
vm.runInContext("db_=()=>{throw Error('Unexpected I/O');};locked_=()=>{throw Error('Unexpected lock');};",ctx);assert.deepEqual(prepare(),planned);
console.log('Habit log planner: complete captured catalogues, historical step IDs/titles, derived status, omitted/explicit checked, dependency conflicts/schedules/quarter/leap bounds, deep copies, no I/O and equivalence to real Demo mutations OK; no application routing.');
