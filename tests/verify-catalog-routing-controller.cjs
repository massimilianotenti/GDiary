const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs'),{seal}=require('./helpers/recoverable-commit-store.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const digest=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const scope={archiveId:'synthetic-log-controller-archive',principalId:'synthetic-log-controller-principal',epoch:'synthetic-log-controller-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const ids={goalsSheetId:14,habitsSheetId:13,indexSheetId:11,blockSheetId:12},key='synthetic-habit|2026-10-28';
const prefix='SYNC_CATALOG_ROUTING_',keys={anchor:prefix+'ANCHOR_V1',a:prefix+'STATE_A_V1',am:prefix+'MARK_A_V1',b:prefix+'STATE_B_V1',bm:prefix+'MARK_B_V1'};
function fixture(snapshot){
 const f=createFaultSheets(snapshot?.sheets),ctx=vm.createContext({...f.globals});vm.runInContext(source,ctx);
 const headers=name=>copy(vm.runInContext(name,ctx)),row=(name,values)=>Object.assign(Object.fromEntries(headers(name).map(key=>[key,''])),values);
 const steps=[{id:'step-a',title:'  Passo storico 🌱  '}];
 const log=row('LOG_HEADERS',{key,habitId:'synthetic-habit',date:'2026-10-28',status:'pending',updatedAt:'2026-10-27T10:00:00.000Z',checklist:JSON.stringify({steps,checked:[]})});
 const habit=row('HABIT_HEADERS',{id:log.habitId,goalId:'synthetic-goal',title:'Pratica',days:'weekly:3',start:'2026-10-01',updatedAt:'2026-10-27T09:00:00.000Z',steps:JSON.stringify(steps)}),goal=row('GOAL_HEADERS',{id:habit.goalId,title:'Obiettivo',cycle:'2026-Q4',target:'3',progress:'0',updatedAt:'2026-10-27T08:00:00.000Z'});
 const data=copy(snapshot?.data||{HabitLogs:[headers('LOG_HEADERS'),headers('LOG_HEADERS').map(k=>log[k])],Habits:[headers('HABIT_HEADERS'),headers('HABIT_HEADERS').map(k=>habit[k])],Goals:[headers('GOAL_HEADERS'),headers('GOAL_HEADERS').map(k=>goal[k])]});
 const props=copy(snapshot?.props||{}),identity=copy(snapshot?.identity||{...scope,dbId:'synthetic-log-db',rootId:'synthetic-log-root',authorized:true});
 let writes=[],fault=null,held=false;
 const properties={getProperties:()=>copy(props),setProperty(key,value){const at=writes.push({key,value});if(fault?.at===at&&fault.phase==='before')throw Error('property failure');if(fault?.at===at&&fault.phase==='partial'){props[key]=value.slice(0,fault.prefix??Math.floor(value.length/2));throw Error('property prefix');}props[key]=value;if(fault?.at===at&&fault.phase==='after')throw Error('property ACK');}};
 function table(name,id){return {getName:()=>name,getSheetId:()=>id,getParent:()=>({getId:()=>identity.dbId}),getLastRow:()=>data[name].length,getRange(r,c,n=1,m=1){return {getRow:()=>r,getValues(){return this.getDisplayValues();},getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[name][r-1+i]?.[c-1+j]??'')),createTextFinder(text){let regex=false;return {useRegularExpression(value){regex=value;return this;},matchEntireCell(){return this;},findAll(){return data[name].slice(r-1,r-1+n).flatMap((line,i)=>(regex?new RegExp(text).test(line[c-1]||''):line[c-1]===text)?[{getRow:()=>r+i}]:[]);}};}};}};}
 for(const [table,id]of [[f.index,11],[f.blocks,12]]){table.getSheetId=()=>id;table.getParent=()=>({getId:()=>identity.dbId});}
 const tables={13:table('Habits',13),14:table('Goals',14),11:f.index,12:f.blocks},flags={configure:true,migrate:true};
 const services={properties,digest,context:()=>copy(identity),sheet:id=>tables[id],allowConfigure:()=>flags.configure,allowMigration:()=>flags.migrate,debugRouting:true,withLock(fn){assert(!held);const lock=f.globals.LockService.getScriptLock();if(!lock.tryLock(0))throw Object.assign(Error('BusyError'),{name:'BusyError'});held=true;try{return fn();}finally{held=false;lock.releaseLock();}}};
 return {ctx,f,props,properties,identity,tables,flags,data,services,controller:ctx.syncCatalogRoutingController_(services),log,habit,
  snapshot:()=>copy({props,data,identity,sheets:f.snapshot()}),writes:()=>copy(writes),fault(at,phase,prefix){fault={at,phase,prefix};},reset(){writes=[];fault=null;f.reset();},
  initialize(){const store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));this.reset();return this;}};
}
const base=fixture().initialize();assert.equal(base.controller.resolve(),null);assert.equal(base.controller.status().registered,false);
const registered=copy(base.controller.register(ids));assert.equal(registered.mode,'readOnly');assert.equal(registered.revision,1);
assert.throws(()=>base.controller.resolve().saveLegacy({}),e=>e.name==='ProtocolUnavailable'&&e.reason==='readOnly');
base.controller.setMode({mode:'active',expectedRevision:1});const gateway=base.controller.resolve(),preview=gateway.preview('goals',base.habit.goalId);
const migration={operationId:'synthetic-catalog-controller-migrate',collection:'goals',id:base.habit.goalId,expectedLegacy:preview.legacy};gateway.migrate(migration);
const changed=copy(gateway.saveLegacy('goal',{id:base.habit.goalId,cycle:'2026-Q4',title:'Goal aggiornato',target:'3',progress:'1',updatedAt:preview.legacy.updatedAt}));
assert.equal(changed.commonUpserts.goals[0].updatedAt,'commit-4');assert.equal(gateway.readRows('goals')[0].title,'Goal aggiornato');
const snapshot=base.snapshot(),reboot=fixture(snapshot);assert.equal(reboot.controller.status().mode,'active');assert.equal(reboot.controller.resolve().readRows('goals')[0].title,'Goal aggiornato');
assert.equal(reboot.controller.setMode({mode:'readOnly',expectedRevision:2}).revision,3);
console.log('Catalog controller: explicit Goals/Habits sheet binding, readOnly-first registration, active migration/edit/read, persistent reboot and mode CAS OK.');
