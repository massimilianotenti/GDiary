const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createFaultSheets}=require('./helpers/fault-sheets.cjs'),{seal}=require('./helpers/recoverable-commit-store.cjs');
const source=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')).join('\n');
const digest=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const scope={archiveId:'synthetic-controller-archive',principalId:'synthetic-controller-principal',epoch:'synthetic-controller-epoch'},archive={archiveId:scope.archiveId,epoch:scope.epoch};
const ids={weeksSheetId:10,indexSheetId:11,blockSheetId:12};
const keys={anchor:'SYNC_WEEK_ROUTING_ANCHOR_V1',a:'SYNC_WEEK_ROUTING_STATE_A_V1',am:'SYNC_WEEK_ROUTING_MARK_A_V1',b:'SYNC_WEEK_ROUTING_STATE_B_V1',bm:'SYNC_WEEK_ROUTING_MARK_B_V1'};
function fixture(snapshot){
 const f=createFaultSheets(snapshot?.sheets),ctx=vm.createContext({...f.globals});vm.runInContext(source,ctx);
 const headers=copy(vm.runInContext('WEEK_HEADERS',ctx)),week='2026-10-26';
 const row=Object.fromEntries(headers.map(key=>[key,'']));Object.assign(row,{week,updatedAt:'2026-10-27T12:00:00.000Z',focus:'Intento sintetico 🌱',wins:'Riflessione originaria',energy:'3',closed:'no'});
 const data=copy(snapshot?.weeks||[headers,headers.map(key=>row[key])]),props=copy(snapshot?.props||{}),identity=copy(snapshot?.identity||{...scope,dbId:'synthetic-controller-db',rootId:'synthetic-controller-root',authorized:true});
 let writes=[],fault=null,held=false;
 const properties={getProperties:()=>copy(props),setProperty(key,value){const at=writes.push({key,value});if(fault?.at===at&&fault.phase==='before')throw Error('PRIVATE property write');if(fault?.at===at&&fault.phase==='partial'){props[key]=value.slice(0,fault.prefix??Math.floor(value.length/2));throw Error('PRIVATE torn property');}props[key]=value;if(fault?.at===at&&fault.phase==='after')throw Error('PRIVATE property ACK');}};
 const table={getName:()=>'Weeks',getSheetId:()=>10,getParent:()=>({getId:()=>identity.dbId}),getLastRow:()=>data.length,getRange(r,c,n=1,m=1){return {getRow:()=>r,getValues(){return this.getDisplayValues();},getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[r-1+i]?.[c-1+j]??'')),createTextFinder(text){let regex=false;return {useRegularExpression(flag){regex=flag;return this;},matchEntireCell(){return this;},findAll(){return data.slice(r-1,r-1+n).flatMap((line,i)=>(regex?new RegExp(text).test(line[c-1]||''):line[c-1]===text)?[{getRow:()=>r+i}]:[]);}};}};}};
 for(const [table,id]of [[f.index,11],[f.blocks,12]]){table.getSheetId=()=>id;table.getParent=()=>({getId:()=>identity.dbId});}
 const tables={10:table,11:f.index,12:f.blocks},flags={configure:true,migrate:true};
 const services={properties,digest,context:()=>copy(identity),sheet:id=>tables[id],allowConfigure:()=>flags.configure,allowMigration:()=>flags.migrate,withLock(fn){assert(!held);const lock=f.globals.LockService.getScriptLock();if(!lock.tryLock(0))throw Object.assign(Error('BusyError'),{name:'BusyError'});held=true;try{return fn();}finally{held=false;lock.releaseLock();}}};
 const controller=ctx.syncWeekRoutingController_(services);
 return {f,ctx,controller,props,properties,services,identity,table,data,tables,flags,week,row,
  fault(at,phase,prefix){fault={at,phase,prefix};},writes:()=>copy(writes),reset(){writes=[];fault=null;f.reset();},
  snapshot:()=>copy({props,sheets:f.snapshot(),identity,weeks:data}),
  initialize(){const store=ctx.syncSheetsCommitStore_(f.index,f.blocks,archive,f.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive,committedThrough:0,pending:null})));this.reset();return this;}
 };
}
const base=fixture().initialize();assert.equal(base.controller.resolve(),null);assert.equal(base.controller.status().registered,false);assert.equal(base.writes().length,0);assert.equal(base.f.metrics().events.length,0);
const registered=copy(base.controller.register(ids));assert.equal(registered.mode,'readOnly');assert.equal(registered.revision,1);assert.equal(base.writes().length,4);const props=copy(base.props);assert.deepEqual(copy(base.controller.register(ids)),registered);assert.deepEqual(base.props,props,'registration retry does not reset state');
assert.throws(()=>base.controller.resolve().saveLegacy({...base.row,week:base.week,updatedAt:base.row.updatedAt,wins:'Da bloccare'}),error=>error.name==='ProtocolUnavailable'&&error.reason==='readOnly'&&error.message.includes('sola lettura'));
base.controller.setMode({mode:'active',expectedRevision:1});const gateway=base.controller.resolve(),preview=gateway.preview(base.week);gateway.migrate({week:base.week,expectedLegacy:preview.legacy,operationId:'synthetic-controller-migrate'});
const ack=copy(gateway.saveLegacy({...base.row,week:base.week,updatedAt:base.row.updatedAt,wins:'Canonico dopo riavvio 🌱'}));assert.equal(ack.commonUpserts.weeks[0].wins,'Canonico dopo riavvio 🌱');
const active=base.snapshot(),restarted=fixture(active);assert.equal(restarted.controller.status().mode,'active');assert.equal(restarted.controller.resolve().readRows()[0].wins,'Canonico dopo riavvio 🌱');assert.equal(restarted.row.wins,'Riflessione originaria');
restarted.flags.configure=false;restarted.flags.migrate=false;assert.equal(restarted.controller.resolve().readRows()[0].wins,'Canonico dopo riavvio 🌱','disabling operator capabilities never removes routing');assert.throws(()=>restarted.controller.setMode({mode:'readOnly',expectedRevision:2}),error=>error.name==='ProtocolUnavailable');
const paused=copy(base.controller.setMode({mode:'readOnly',expectedRevision:2}));assert.equal(paused.revision,3);const writeCount=base.writes().length;assert.deepEqual(copy(base.controller.setMode({mode:'readOnly',expectedRevision:2})),paused);assert.equal(base.writes().length,writeCount,'lost mode ACK retry is idempotent');
assert.equal(base.controller.resolve().readRows()[0].wins,ack.commonUpserts.weeks[0].wins);assert.throws(()=>base.controller.resolve().saveLegacy({...base.row,week:base.week,updatedAt:ack.commonUpserts.weeks[0].updatedAt,wins:'Stop'}),error=>error.name==='ProtocolUnavailable');
assert.throws(()=>gateway.saveLegacy({...base.row,week:base.week,updatedAt:ack.commonUpserts.weeks[0].updatedAt,wins:'Facade precedente'}),error=>error.name==='ProtocolUnavailable','old facades recheck current mode');
assert.throws(()=>base.controller.setMode({mode:'active',expectedRevision:1}),error=>error.name==='ConflictError');assert.throws(()=>base.controller.setMode({mode:'disabled',expectedRevision:3}),error=>error.name==='DataError');
assert(!JSON.stringify(base.controller.status()).includes(base.identity.dbId));assert(!JSON.stringify(base.controller.status()).includes(scope.archiveId));
// Every interrupted property publication is reopened in a fresh V8 context.
const empty=fixture().initialize().snapshot();let cases=0;
for(const kind of ['register','pause']){
 const seed=kind==='register'?empty:active,measure=fixture(seed),invoke=f=>kind==='register'?f.controller.register(ids):f.controller.setMode({mode:'readOnly',expectedRevision:2});invoke(measure);
 const writes=measure.writes(),variants=[];
 for(const phase of ['before','after','partial'])for(let at=1;at<=writes.length;at++)variants.push({at,phase});
 const publication=writes.findIndex(write=>write.value.startsWith('ok:'))+1;
 for(let prefix=0;prefix<=writes[publication-1].value.length;prefix++)variants.push({at:publication,phase:'partial',prefix});
 for(const fault of variants){
  const crashed=fixture(seed);crashed.fault(fault.at,fault.phase,fault.prefix);assert.throws(()=>invoke(crashed));const boot=fixture(crashed.snapshot());
  if(kind==='pause'){
   assert(['active','readOnly'].includes(boot.controller.status().mode));assert.equal(boot.controller.resolve().readRows()[0].wins,ack.commonUpserts.weeks[0].wins);
   assert.equal(invoke(boot).mode,'readOnly');assert.equal(boot.controller.status().revision,3);
  }else{
   if(Object.keys(boot.props).length){let returned;try{returned=boot.controller.resolve();}catch(error){assert(['ProtocolUnavailable','ProtocolCorrupt'].includes(error.name));}assert.notStrictEqual(returned,null,'partial registration cannot enable legacy fallback');}
   let anchorValid=false;try{const parsed=JSON.parse(boot.props[keys.anchor]||'null');anchorValid=parsed&&parsed.checksum;}catch{}
   if(!Object.keys(boot.props).length||anchorValid)assert.equal(invoke(boot).mode,'readOnly');else assert.throws(()=>invoke(boot),error=>error.name==='ProtocolCorrupt');
  }
  cases++;
 }
}
// A corrupt complete publication is never downgraded to the other slot.
for(const mutate of [f=>delete f.props[keys.anchor],f=>f.props[keys.b]=f.props[keys.b].replace('active','broken'),f=>{delete f.props[keys.a];delete f.props[keys.am];delete f.props[keys.b];delete f.props[keys.bm];}]){
 const broken=fixture(active);mutate(broken);assert.throws(()=>broken.controller.resolve(),error=>['ProtocolCorrupt','ProtocolUnavailable'].includes(error.name));
}
for(const field of ['dbId','rootId','archiveId','epoch']){const wrong=fixture(active);wrong.identity[field]+='-other';assert.throws(()=>wrong.controller.resolve(),error=>error.name==='ScopeChanged');assert.equal(wrong.f.metrics().events.length,0);}
const revoked=fixture(active);revoked.identity.authorized=false;assert.throws(()=>revoked.controller.resolve(),error=>error.name==='ScopeChanged');
const moved=fixture(active);moved.tables[11].getParent=()=>({getId:()=>'foreign-db'});assert.throws(()=>moved.controller.resolve(),error=>error.name==='ScopeChanged');
const absent=fixture(active);delete absent.tables[12];assert.throws(()=>absent.controller.resolve(),error=>error.name==='ScopeChanged');
const missingHead=fixture();assert.throws(()=>missingHead.controller.register(ids),error=>error.name==='ProtocolUnavailable');assert.equal(missingHead.writes().length,0,'registration never initializes missing storage');
const denied=fixture().initialize();denied.flags.configure=false;assert.throws(()=>denied.controller.register(ids),error=>error.name==='ProtocolUnavailable');assert.equal(denied.writes().length,0);
const rebind=fixture(active);assert.throws(()=>rebind.controller.register({...ids,weeksSheetId:15}),error=>error.name==='ScopeChanged');assert.equal(rebind.writes().length,0);
const busy=fixture(active);busy.services.withLock=()=>{throw Object.assign(Error('BusyError'),{name:'BusyError'});};assert.throws(()=>busy.controller.resolve(),error=>error.name==='BusyError');
const zero=fixture().initialize();zero.tables[0]=zero.table;delete zero.tables[10];zero.table.getSheetId=()=>0;assert.equal(zero.controller.register({...ids,weeksSheetId:0}).mode,'readOnly');
const future=fixture().initialize();future.props.SYNC_WEEK_ROUTING_ANCHOR_V2='future-required-anchor';assert.throws(()=>future.controller.resolve(),error=>error.name==='ProtocolUnavailable');
const permission=fixture(active),set=permission.properties.setProperty;permission.properties.setProperty=(key,value)=>{set(key,value);permission.flags.configure=false;};assert.throws(()=>permission.controller.setMode({mode:'readOnly',expectedRevision:2}),error=>error.name==='ProtocolUnavailable');assert.equal(permission.writes().length,1);assert.equal(permission.controller.status().mode,'active');
const revokedDuringRead=fixture(active),getRange=revokedDuringRead.table.getRange;revokedDuringRead.table.getRange=(...args)=>{const range=getRange(...args);if(args[0]>1){const get=range.getValues;range.getValues=()=>{const result=get.call(range);revokedDuringRead.identity.authorized=false;return result;};}return range;};assert.throws(()=>revokedDuringRead.controller.resolve().readRows(),error=>error.name==='ScopeChanged');
console.log('Week routing controller: persistent bound routing/restarts, readOnly rollback, immutable anchor, two-slot state publication, '+cases+' property crash/prefix cases, CAS/idempotent modes, no downgrade on corruption/config/access changes and explicit operator guards OK.');
