const assert=require('assert');
const {createDayRoutingServer:open}=require('./helpers/day-routing-server.cjs');
const backend=open(undefined,{seedPractices:[{steps:'Prima microazione\nSeconda microazione',checkedIndices:[0]}]}),
 controller=backend.ctx.syncCatalogRoutingServer_({allowConfigure:true,allowMigration:true}),
 ids={goalsSheetId:16,habitsSheetId:15,indexSheetId:11,blockSheetId:12};
assert.equal(controller.register(ids).mode,'readOnly');controller.setMode({mode:'active',expectedRevision:1});
const practice=backend.practices[0],gateway=controller.resolve();
for(const [collection,id]of [['goals',practice.goal.id],['habits',practice.habit.id]]){
 const preview=gateway.preview(collection,id);gateway.migrate({operationId:'synthetic-catalog-matrix-'+collection,collection,id,expectedLegacy:preview.legacy});
}
const originalLog=JSON.stringify(backend.snapshot().rawSheets.HabitLogs);
const goalEdit={...practice.goal,progress:'1',context:{incrementalCommon:true}},goalAck=backend.ctx.saveGoal(goalEdit).commonUpserts.goals[0];
assert.equal(goalAck.progress,'1');assert(goalAck.updatedAt.startsWith('commit-'));
assert.deepEqual(backend.ctx.saveGoal(goalEdit).commonUpserts.goals[0],goalAck,'same goal intent must return its original ACK');
assert.throws(()=>backend.ctx.saveGoal({...goalEdit,title:'Collisione',context:{incrementalCommon:true}}),e=>e.name==='ConflictError'&&e.message.startsWith('Catalogo'),'reusing one edit base with a different payload must conflict with a catalog message');
const steps=JSON.parse(practice.habit.steps),habitEdit={...practice.habit,title:'Pratica canonica aggiornata',steps:'Seconda microazione\nPrima microazione\nTerza microazione',context:{incrementalCommon:true}};
const habitAck=backend.ctx.saveHabit(habitEdit).commonUpserts.habits[0],savedSteps=JSON.parse(habitAck.steps);
assert.equal(savedSteps.find(step=>step.title==='Prima microazione').id,steps[0].id,'first step identity follows its title when reordered');
assert.equal(savedSteps.find(step=>step.title==='Seconda microazione').id,steps[1].id,'second step identity follows its title when reordered');
assert(savedSteps[2].id&&!steps.some(step=>step.id===savedSteps[2].id),'inserted step receives a distinct identity');
assert.equal(habitAck.title,'Pratica canonica aggiornata');assert(habitAck.updatedAt.startsWith('commit-'));
assert.deepEqual(backend.ctx.saveHabit(habitEdit).commonUpserts.habits[0],habitAck,'same habit intent must return its original ACK');
assert.throws(()=>backend.ctx.saveHabit({...habitEdit,title:'Edit obsoleto',updatedAt:practice.habit.updatedAt,context:{incrementalCommon:true}}),e=>e.name==='ConflictError'&&e.message.startsWith('Catalogo'));
const createdGoalInput={title:'Nuovo obiettivo intenzionale',cycle:'2026-Q4',target:'2',progress:'0',requestId:'synthetic-goal-create-replay',context:{incrementalCommon:true}},createdGoal=backend.ctx.saveGoal(createdGoalInput).commonUpserts.goals[0];
assert.deepEqual(backend.ctx.saveGoal(createdGoalInput).commonUpserts.goals[0],createdGoal,'same goal creation intent returns same identity and ACK');
assert.throws(()=>backend.ctx.saveGoal({...createdGoalInput,title:'Payload diverso'}),e=>e.name==='OperationMismatch');
const createHabitInput={goalId:createdGoal.id,title:'Azione con dipendenza canonica',days:'weekly:2',start:'2026-10-01',steps:'Primo\nSecondo',requestId:'synthetic-habit-create-replay',context:{incrementalCommon:true}},createdHabit=backend.ctx.saveHabit(createHabitInput).commonUpserts.habits[0];
assert.deepEqual(backend.ctx.saveHabit(createHabitInput).commonUpserts.habits[0],createdHabit,'same habit creation intent returns original allocated IDs');
assert.equal(JSON.parse(createdHabit.steps).length,2);assert(createdHabit.updatedAt.startsWith('commit-'));
const distinctHabit=backend.ctx.saveHabit({...createHabitInput,requestId:'synthetic-habit-create-distinct'}).commonUpserts.habits[0];assert.notEqual(distinctHabit.id,createdHabit.id,'distinct intent must create a distinct entry');
const initialSettings=backend.ctx.reflectionSettings_(),rawSettings=JSON.stringify(backend.snapshot().props);
const reflectionInput={dailyReflectionMode:'detailed',version:initialSettings.version,context:{incrementalCommon:true}},reflectionAck=backend.ctx.saveReflectionSettings(reflectionInput).settingsPatch;
assert.equal(reflectionAck.dailyReflectionMode,'detailed');assert(reflectionAck.version.startsWith('commit-'));assert.deepEqual(backend.ctx.saveReflectionSettings(reflectionInput).settingsPatch,reflectionAck,'reflection-setting replay returns stable canonical version');
assert.throws(()=>backend.ctx.saveReflectionSettings({...reflectionInput,dailyReflectionMode:'essential'}),error=>error.name==='ConflictError'&&error.message.startsWith('Catalogo'));
const beforeInvalidSetting=backend.ledger.snapshot();assert.throws(()=>backend.ctx.catalogCommitGateway_().saveSetting('reflection',{dailyReflectionMode:'invalid',version:reflectionAck.version}),error=>error.name==='DataError');assert.deepEqual(backend.ledger.snapshot(),beforeInvalidSetting,'invalid setting is rejected before commit writes');
const privacyInput={privateTags:['famiglia','lavoro'],version:initialSettings.privacyVersion,context:{incrementalCommon:true}},privacyAck=backend.ctx.savePrivacySettings(privacyInput);
assert.deepEqual(privacyAck.privateTags,['famiglia','lavoro']);assert(privacyAck.privacyVersion.startsWith('commit-'));assert.deepEqual(backend.ctx.savePrivacySettings(privacyInput),privacyAck,'privacy-setting replay returns stable canonical version');
assert.throws(()=>backend.ctx.savePrivacySettings({...privacyInput,privateTags:['altro']}),error=>error.name==='ConflictError'&&error.message.startsWith('Catalogo'));
const fullSettings=backend.ctx.getState({context:{view:'settings'}}).settings;assert.equal(fullSettings.dailyReflectionMode,'detailed');assert.deepEqual(fullSettings.privateTags,['famiglia','lavoro']);assert.equal(JSON.stringify(backend.snapshot().props),rawSettings,'routed settings no longer mutate legacy properties');
const archived=backend.ctx.deleteHabit({id:habitAck.id,updatedAt:habitAck.updatedAt,context:{incrementalCommon:true}}).commonUpserts.habits[0];
assert.equal(archived.archived,'yes');assert.equal(archived.title,habitAck.title);assert.deepEqual(JSON.parse(archived.steps),savedSteps);
assert.throws(()=>backend.ctx.saveHabit({...habitEdit,updatedAt:archived.updatedAt,context:{incrementalCommon:true}}),e=>e.name==='ConflictError','archived habits cannot be reopened through ordinary edit');
const canonical=backend.ctx.catalogCommitGateway_(),goals=canonical.readRows('goals'),habits=canonical.readRows('habits');assert(goals.some(row=>row.id===goalAck.id&&row.progress==='1'));assert(habits.some(row=>row.id===archived.id&&row.archived==='yes'));assert(habits.some(row=>row.id===createdHabit.id));
assert.equal(JSON.stringify(backend.snapshot().rawSheets.HabitLogs),originalLog,'catalog edits/archive never rewrite historical HabitLogs');
const reboot=open(backend.snapshot()),afterReboot=reboot.ctx.catalogCommitGateway_();assert(afterReboot.readRows('habits').some(row=>row.id===archived.id&&row.archived==='yes'));assert(afterReboot.readRows('habits').some(row=>row.id===createdHabit.id));
console.log('Catalog mutation matrix: Goal/Habit/Settings edits and ACK replay, stale/conflicting payloads, explicit create intent/identity replay, dependency-bound habit creation, step identity reorder/insert, setting property overlay, soft archive, historical log preservation and reboot OK.');
