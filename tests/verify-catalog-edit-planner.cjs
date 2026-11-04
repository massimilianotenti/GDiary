const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const ctx=vm.createContext({});vm.runInContext(source,ctx);const copy=value=>JSON.parse(JSON.stringify(value));
const headers=name=>copy(vm.runInContext(name,ctx)),row=(name,values)=>Object.assign(Object.fromEntries(headers(name).map(k=>[k,''])),values);
const goal=row('GOAL_HEADERS',{id:'synthetic-goal',cycle:'2026-Q4',title:'Obiettivo',target:'3',progress:'0',project:'casa',icon:'brain',description:'Descrizione precedente',updatedAt:'2026-10-27T10:00:00.000Z'});
const habit=row('HABIT_HEADERS',{id:'synthetic-habit',goalId:goal.id,title:'Pratica',days:'0,2,4',start:'2026-10-01',steps:JSON.stringify([{id:'step-a',title:'Prima'},{id:'step-b',title:'Seconda'}]),archived:'',icon:'plant',description:'Indicazioni precedenti',updatedAt:'2026-10-27T09:00:00.000Z'});
const gp={id:goal.id,cycle:goal.cycle,title:'  Titolo nuovo  ',target:'03.0',progress:false,updatedAt:goal.updatedAt},hp={id:habit.id,goalId:goal.id,title:'Pratica aggiornata',days:'4,0,2,2',start:habit.start,updatedAt:habit.updatedAt};
function prepare(kind,payload,previous,dependency=null,allocation={id:previous?.id||'synthetic-new-record',stepIds:[]}){return copy(ctx.syncPrepareCatalogEdit_(kind,payload,previous,dependency,allocation));}
const g=prepare('goal',gp,goal);assert.equal(g.record.title,'Titolo nuovo');assert.equal(g.record.target,'3');assert.equal(g.record.progress,'0');assert.equal(g.record.description,goal.description);assert.equal(g.record.icon,goal.icon);assert.equal(g.record.project,'','legacy goal API clears an omitted project');
const cleared=prepare('goal',{...gp,description:'',icon:'none'},goal);assert.equal(cleared.record.description,'');assert.equal(cleared.record.icon,'none');
const created=prepare('goal',{...gp,id:undefined,updatedAt:'',project:'Càsa mia'},null);assert.equal(created.record.id,'synthetic-new-record');assert.equal(created.record.project,'casa-mia');assert.equal(created.record.description,'');
const h=prepare('habit',hp,habit,goal);assert.equal(h.record.days,'0,2,4');assert.equal(h.record.description,habit.description);assert.equal(h.record.icon,habit.icon);assert.deepEqual(JSON.parse(h.record.steps),JSON.parse(habit.steps));assert.deepEqual(h.dependency,goal);assert.equal(h.input.steps,null);
const reorder=prepare('habit',{...hp,steps:' Seconda \n Prima\n'},habit,goal);assert.deepEqual(JSON.parse(reorder.record.steps),[{id:'step-b',title:'Seconda'},{id:'step-a',title:'Prima'}]);
const inserted=prepare('habit',{...hp,steps:'Nuova\nPrima\nSeconda'},habit,goal,{id:habit.id,stepIds:['step-new']});assert.deepEqual(JSON.parse(inserted.record.steps),[{id:'step-a',title:'Nuova'},{id:'step-b',title:'Prima'},{id:'step-new',title:'Seconda'}]);
const empty=prepare('habit',{...hp,steps:'',description:'',icon:''},habit,goal);assert.equal(empty.record.steps,'[]');assert.equal(empty.record.description,'');assert.equal(empty.record.icon,'');assert.deepEqual(empty.input.steps,[]);
const newborn=prepare('habit',{...hp,id:undefined,updatedAt:'',steps:'Una\nDue',days:'weekly:3'},null,goal,{id:'new-habit',stepIds:['new-a','new-b']});assert.equal(newborn.record.id,'new-habit');assert.equal(newborn.record.days,'weekly:3');assert.equal(newborn.record.archived,'');
// Allocation and graph context are copied, never generated, reread or mutated.
const mutableGoal=copy(goal),captured=prepare('habit',hp,habit,mutableGoal);mutableGoal.title='Alterato';assert.equal(captured.dependency.title,goal.title);captured.dependency.title='Altro';assert.equal(goal.title,'Obiettivo');
assert.deepEqual(prepare('habit',hp,habit,goal),h);assert.equal(prepare('goal',{...gp,updatedAt:'old-version'},goal).input.version,'old-version','CAS belongs to the durable gateway/kernel, not this pure helper');
const archived=prepare('archiveHabit',{id:habit.id,updatedAt:habit.updatedAt,ignored:'not a field edit'},habit);assert.equal(archived.record.archived,'yes');assert.equal(archived.record.description,habit.description);assert.equal(archived.record.steps,h.record.steps);assert.equal(archived.dependency,null);
const archivedRow={...habit,archived:'yes'};assert.equal(prepare('archiveHabit',{id:habit.id},archivedRow).record.archived,'yes');assert.throws(()=>prepare('habit',hp,archivedRow,goal),e=>e.name==='ConflictError');
for(const [kind,payload,previous,dependency,allocation]of [
 ['habit',{...hp,id:undefined,updatedAt:'old'},null,goal,{id:'new-habit',stepIds:[]}],
 ['habit',hp,null,goal,{id:habit.id,stepIds:[]}],['archiveHabit',{id:habit.id},null,null,{id:habit.id,stepIds:[]}]
])assert.throws(()=>prepare(kind,payload,previous,dependency,allocation),e=>e.name==='ConflictError');
for(const dependency of [null,{...goal,id:'other'},{...goal,cycle:'2027-Q1'}])assert.throws(()=>prepare('habit',hp,habit,dependency),e=>e.name==='CommitBlocked');
const leap={...goal,cycle:'2028-Q1'};assert.equal(prepare('habit',{...hp,start:'2028-02-29'},habit,leap).record.start,'2028-02-29');
for(const [kind,payload]of [['goal',{...gp,target:'bad'}],['goal',{...gp,description:null}],['goal',{...gp,requestId:'short'}],['goal',{...gp,updatedAt:1}],['habit',{...hp,days:'weekly:8'}],['habit',{...hp,start:'2026-02-30'}],['habit',{...hp,steps:'x'.repeat(501)}],['habit',{...hp,steps:Array.from({length:31},(_,i)=>'s'+i).join('\n')}]])assert.throws(()=>prepare(kind,payload,kind==='goal'?goal:habit,goal),e=>e.name==='DataError');
for(const allocation of [{id:habit.id,stepIds:[]},{id:habit.id,stepIds:['step-a']},{id:habit.id,stepIds:['new','extra']},{id:'wrong',stepIds:['new']}])assert.throws(()=>prepare('habit',{...hp,steps:'Nuova\nPrima\nSeconda'},habit,goal,allocation),e=>e.name==='DataError');
assert.throws(()=>prepare('goal',gp,goal,null,{id:goal.id,stepIds:['unused']}),e=>e.name==='DataError');
// Compare against actual legacy Demo mutations with explicitly assigned UUIDs.
// This is an independent oracle for fallback-by-position, duplicate titles,
// omitted fields, quarter moves and archive, not an expectation derived from
// the new ID planner itself.
const demo=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],demo);
vm.runInContext(`{
 const compare=(collection,saved,planned)=>{const headers=collection==='goals'?GOAL_HEADERS:HABIT_HEADERS,record=syncCatalogSnapshot_(collection,Object.fromEntries(headers.filter(k=>k!=='updatedAt').map(k=>[k,saved[k]])));if(syncCommitCanonical_(record)!==syncCommitCanonical_(planned.record))throw Error('Planner differs from real '+collection+' API');};
 const actualUuid=Utilities.getUuid;let assigned=[];Utilities.getUuid=()=>{if(!assigned.length)throw Error('Unplanned UUID allocation');return assigned.shift();};
 try{
  const payload={title:'  Obiettivo assegnato  ',cycle:'2026-Q4',target:'03.0',progress:'0',description:'Descrizione\\nSeconda riga',icon:'brain',project:'Càsa mia',context:{incrementalCommon:true}};
  const planned=syncPrepareCatalogEdit_('goal',payload,null,null,{id:'synthetic-assigned-goal',stepIds:[]});assigned=['synthetic-assigned-goal'];let goal=saveGoal(payload).commonUpserts.goals[0];compare('goals',goal,planned);if(assigned.length)throw Error('unused goal allocation');
  const hp={goalId:goal.id,title:'Pratica assegnata',days:'4,0,2,2',start:'2026-10-01',steps:'Prima\\nSeconda',description:'Indicazioni',icon:'plant',context:{incrementalCommon:true}};
  const prepared=syncPrepareCatalogEdit_('habit',hp,null,goal,{id:'synthetic-assigned-habit',stepIds:['assigned-a','assigned-b']});assigned=['assigned-a','assigned-b','synthetic-assigned-habit'];let habit=saveHabit(hp).commonUpserts.habits[0];compare('habits',habit,prepared);if(assigned.length)throw Error('unused habit allocation');
  for(const edit of [{steps:'Seconda\\nPrima',ids:[]},{steps:'Nuova\\nSeconda\\nPrima',ids:['assigned-c']},{steps:'Seconda\\nSeconda\\nPrima',ids:['assigned-d']},{ids:[]},{steps:'',description:'',icon:'none',ids:[]}]){
   const payload={id:habit.id,goalId:goal.id,title:'Pratica aggiornata',days:'weekly:3',start:habit.start,updatedAt:habit.updatedAt,context:{incrementalCommon:true},...edit};delete payload.ids;
   const planned=syncPrepareCatalogEdit_('habit',payload,habit,goal,{id:habit.id,stepIds:edit.ids});assigned=[...edit.ids];habit=saveHabit(payload).commonUpserts.habits[0];compare('habits',habit,planned);if(assigned.length)throw Error('unused step allocation');
  }
  const gp={id:goal.id,title:'Goal spostato',cycle:'2027-Q1',target:3,progress:1,updatedAt:goal.updatedAt,context:{incrementalCommon:true}},gplan=syncPrepareCatalogEdit_('goal',gp,goal,null,{id:goal.id,stepIds:[]});goal=saveGoal(gp).commonUpserts.goals[0];compare('goals',goal,gplan);
  const arch={id:habit.id,updatedAt:habit.updatedAt,context:{incrementalCommon:true}},aplan=syncPrepareCatalogEdit_('archiveHabit',arch,habit,null,{id:habit.id,stepIds:[]});habit=deleteHabit(arch).commonUpserts.habits[0];compare('habits',habit,aplan);
 }finally{Utilities.getUuid=actualUuid;}
}`,demo);
// Pure helpers remain usable with all service/lock/allocation entrypoints denied.
vm.runInContext("db_=()=>{throw Error('Unexpected I/O');};locked_=()=>{throw Error('Unexpected lock');};Utilities={getUuid(){throw Error('Unexpected UUID');}};",ctx);assert.deepEqual(prepare('habit',hp,habit,goal),h);
console.log('Catalog API planners: normalized optional/cleared fields, explicit IDs, exact legacy step reuse/reorder/insert/duplicate semantics, captured goal dependencies, quarter/leap/archive guards, independent copies and equivalence to real Demo APIs without hidden I/O/UUID generation OK.');
