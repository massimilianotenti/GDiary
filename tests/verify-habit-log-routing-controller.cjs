const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs'),{seal}=require('./helpers/recoverable-commit-store.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const digest=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const scope={archiveId:'synthetic-log-controller-archive',principalId:'synthetic-log-controller-principal',epoch:'synthetic-log-controller-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const ids={habitLogsSheetId:10,indexSheetId:11,blockSheetId:12,habitsSheetId:13,goalsSheetId:14},key='synthetic-habit|2026-10-28';
const prefix='SYNC_HABIT_LOG_ROUTING_',keys={anchor:prefix+'ANCHOR_V1',a:prefix+'STATE_A_V1',am:prefix+'MARK_A_V1',b:prefix+'STATE_B_V1',bm:prefix+'MARK_B_V1'};
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
 const tables={10:table('HabitLogs',10),11:f.index,12:f.blocks,13:table('Habits',13),14:table('Goals',14)},flags={configure:true,migrate:true};
 const services={properties,digest,context:()=>copy(identity),sheet:id=>tables[id],allowConfigure:()=>flags.configure,allowMigration:()=>flags.migrate,debugRouting:true,withLock(fn){assert(!held);const lock=f.globals.LockService.getScriptLock();if(!lock.tryLock(0))throw Object.assign(Error('BusyError'),{name:'BusyError'});held=true;try{return fn();}finally{held=false;lock.releaseLock();}}};
 return {ctx,f,props,properties,identity,tables,flags,data,services,controller:ctx.syncHabitLogRoutingController_(services),log,habit,
  snapshot:()=>copy({props,data,identity,sheets:f.snapshot()}),writes:()=>copy(writes),fault(at,phase,prefix){fault={at,phase,prefix};},reset(){writes=[];fault=null;f.reset();},
  initialize(){const store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));this.reset();return this;}};
}
const base=fixture().initialize();assert.equal(base.controller.resolve(),null);assert.equal(base.controller.status().registered,false);assert.equal(base.writes().length,0);assert.equal(base.f.metrics().events.length,0);
const registered=copy(base.controller.register(ids));assert.equal(registered.mode,'readOnly');assert.equal(registered.revision,1);assert.equal(base.writes().length,4);const props=copy(base.props);assert.deepEqual(copy(base.controller.register(ids)),registered);assert.deepEqual(base.props,props);
assert.throws(()=>base.controller.resolve().saveLegacy({}),e=>e.name==='ProtocolUnavailable'&&e.reason==='readOnly'&&e.message.includes('sola lettura'));
base.controller.setMode({mode:'active',expectedRevision:1});const gateway=base.controller.resolve(),preview=gateway.preview(key);
gateway.migrate({key,expectedLegacy:preview.legacy,expectedCatalog:preview.catalog,record:preview.record,operationId:'synthetic-log-controller-migrate'});
const patch={habitId:base.log.habitId,date:base.log.date,status:'pending',checked:['step-a'],habitUpdatedAt:base.habit.updatedAt,updatedAt:base.log.updatedAt};
const ack=copy(gateway.saveLegacy(patch));assert.equal(ack.commonUpserts.habitLogs[0].status,'done');
const active=base.snapshot(),reboot=fixture(active);assert.equal(reboot.controller.status().mode,'active');assert.equal(reboot.controller.resolve().readRows()[0].status,'done');assert.equal(reboot.data.HabitLogs[1][3],'pending');
reboot.flags.configure=false;reboot.flags.migrate=false;assert.equal(reboot.controller.resolve().readRows()[0].status,'done');assert.throws(()=>reboot.controller.setMode({mode:'readOnly',expectedRevision:2}),e=>e.name==='ProtocolUnavailable');assert.throws(()=>reboot.controller.resolve().migrate({}),e=>e.name==='ProtocolUnavailable');
const paused=copy(base.controller.setMode({mode:'readOnly',expectedRevision:2})),writeCount=base.writes().length;assert.equal(paused.revision,3);assert.deepEqual(copy(base.controller.setMode({mode:'readOnly',expectedRevision:2})),paused);assert.equal(base.writes().length,writeCount);
assert.equal(base.controller.resolve().readRows()[0].status,'done');assert.throws(()=>gateway.saveLegacy(patch),e=>e.name==='ProtocolUnavailable');assert.equal(gateway.saveBatch,undefined);
assert.throws(()=>base.controller.setMode({mode:'active',expectedRevision:1}),e=>e.name==='ConflictError');assert.throws(()=>base.controller.setMode({mode:'disabled',expectedRevision:3}),e=>e.name==='DataError');
assert(!JSON.stringify(base.controller.status()).includes(scope.archiveId));assert(!JSON.stringify(base.controller.status()).includes(base.identity.dbId));
const empty=fixture().initialize().snapshot();let cases=0;
for(const kind of ['register','pause']){
 const seed=kind==='register'?empty:active,measured=fixture(seed),invoke=f=>kind==='register'?f.controller.register(ids):f.controller.setMode({mode:'readOnly',expectedRevision:2});invoke(measured);
 const writes=measured.writes(),variants=[];
 for(const phase of ['before','after','partial'])for(let at=1;at<=writes.length;at++)variants.push({at,phase});
 const publication=writes.findIndex(write=>write.value.startsWith('ok:'))+1;
 for(let prefix=0;prefix<=writes[publication-1].value.length;prefix++)variants.push({at:publication,phase:'partial',prefix});
 for(const fault of variants){
  const broken=fixture(seed);broken.fault(fault.at,fault.phase,fault.prefix);assert.throws(()=>invoke(broken));const boot=fixture(broken.snapshot());
  if(kind==='pause'){assert(['active','readOnly'].includes(boot.controller.status().mode));assert.equal(boot.controller.resolve().readRows()[0].status,'done');assert.equal(invoke(boot).mode,'readOnly');assert.equal(boot.controller.status().revision,3);}
  else{
   if(Object.keys(boot.props).length){let returned;try{returned=boot.controller.resolve();}catch(e){assert(['ProtocolUnavailable','ProtocolCorrupt'].includes(e.name));}assert.notStrictEqual(returned,null);}
   let valid=false;try{valid=!!JSON.parse(boot.props[keys.anchor]||'null')?.checksum;}catch{}
   if(!Object.keys(boot.props).length||valid)assert.equal(invoke(boot).mode,'readOnly');else assert.throws(()=>invoke(boot),e=>e.name==='ProtocolCorrupt');
  }cases++;
 }
}
for(const mutate of [f=>delete f.props[keys.anchor],f=>f.props[keys.b]=f.props[keys.b].replace('active','broken'),f=>{delete f.props[keys.a];delete f.props[keys.am];delete f.props[keys.b];delete f.props[keys.bm];}]){const broken=fixture(active);mutate(broken);assert.throws(()=>broken.controller.resolve(),e=>['ProtocolCorrupt','ProtocolUnavailable'].includes(e.name));}
for(const field of ['dbId','rootId','archiveId','epoch']){const wrong=fixture(active);wrong.identity[field]+='-other';assert.throws(()=>wrong.controller.resolve(),e=>e.name==='ScopeChanged');assert.equal(wrong.f.metrics().events.length,0);}
const revoked=fixture(active);revoked.identity.authorized=false;assert.throws(()=>revoked.controller.resolve(),e=>e.name==='ScopeChanged');
for(const id of [10,11,12,13,14]){
 const moved=fixture(active);moved.tables[id].getParent=()=>({getId:()=>'foreign-db'});assert.throws(()=>moved.controller.resolve(),e=>e.name==='ScopeChanged');
 const missing=fixture(active);delete missing.tables[id];assert.throws(()=>missing.controller.resolve(),e=>e.name==='ScopeChanged');
}
for(const id of [10,13,14]){const renamed=fixture(active);renamed.tables[id].getName=()=> 'Foreign';assert.throws(()=>renamed.controller.resolve(),e=>e.name==='ScopeChanged');}
const noHead=fixture();assert.throws(()=>noHead.controller.register(ids),e=>e.name==='ProtocolUnavailable');assert.equal(noHead.writes().length,0);
const denied=fixture().initialize();denied.flags.configure=false;assert.throws(()=>denied.controller.register(ids),e=>e.name==='ProtocolUnavailable');assert.equal(denied.writes().length,0);
const rebind=fixture(active);assert.throws(()=>rebind.controller.register({...ids,habitsSheetId:15}),e=>e.name==='ScopeChanged');assert.equal(rebind.writes().length,0);
for(const input of [{...ids,goalsSheetId:13},{habitLogsSheetId:10,indexSheetId:11,blockSheetId:12}])assert.throws(()=>fixture().initialize().controller.register(input),e=>e.name==='DataError');
const future=fixture().initialize();future.props.SYNC_HABIT_LOG_ROUTING_ANCHOR_V2='future';assert.throws(()=>future.controller.resolve(),e=>e.name==='ProtocolUnavailable');
const busy=fixture(active);busy.services.withLock=()=>{throw Object.assign(Error('BusyError'),{name:'BusyError'});};assert.throws(()=>busy.controller.resolve(),e=>e.name==='BusyError');
const permission=fixture(active),set=permission.properties.setProperty;permission.properties.setProperty=(k,v)=>{set(k,v);permission.flags.configure=false;};assert.throws(()=>permission.controller.setMode({mode:'readOnly',expectedRevision:2}),e=>e.name==='ProtocolUnavailable');assert.equal(permission.controller.status().mode,'active');
const during=fixture(active),getRange=during.tables[10].getRange;during.tables[10].getRange=(...args)=>{const range=getRange(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);during.identity.authorized=false;return result;};}return range;};assert.throws(()=>during.controller.resolve().readRows(),e=>e.name==='ScopeChanged');
console.log('Habit log controller: five-sheet binding, persistent modes/restarts, '+cases+' property crash/prefix cases, CAS, frozen historical rows, catalogue ID/parent/name barriers, operator/authorization guards and no fallback/provisioning OK.');
