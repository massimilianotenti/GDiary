// Durable-unit reference adapter for fault injection, never a Google adapter.
const crypto=require('crypto');
const copy=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>value===null?'null':Array.isArray(value)?'['+value.map(canonical).join(',')+']':typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
const digest=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex');
const seal=value=>({...value,checksum:digest(canonical(value))});
function createCommitStore(scope,snapshot){
 const archive={archiveId:scope.archiveId,epoch:scope.epoch};
 let head=snapshot?copy(snapshot.head):seal({format:'sync-head/v1',archive,committedThrough:0,pending:null});
 const entities=new Map(snapshot?.entities||[]),commits=new Map(snapshot?.commits||[]),receipts=new Map(snapshot?.receipts||[]);
 let locked=false,writes=0,fault=null;const labels=[];
 const assertLock=()=>{if(!locked)throw Error('Reference adapter accessed without lock');};
 const read=value=>{assertLock();return value===undefined?null:copy(value);};
 const write=(label,fn)=>{assertLock();writes++;labels.push(label);if(fault?.at===writes&&fault.phase==='before')throw Error('PRIVATE simulated uncertain RPC');fn();if(fault?.at===writes&&fault.phase==='after')throw Error('PRIVATE simulated lost ACK');};
 const entityKey=(collection,id)=>JSON.stringify([collection,id]),receiptKey=(principal,id)=>JSON.stringify([principal,id]);
 const store={
  digest,
  withLock(fn){if(locked)throw Object.assign(Error('BusyError'),{name:'BusyError'});locked=true;try{return fn();}finally{locked=false;}},
  readHead:()=>read(head),writeHead:value=>write(value.pending?'prepare':'publish',()=>{head=copy(value);}),
  readEntity:(collection,id)=>read(entities.get(entityKey(collection,id))),writeEntity:(collection,id,value)=>write('entity:'+collection+':'+id,()=>entities.set(entityKey(collection,id),copy(value))),
  readCommit:sequence=>read(commits.get(sequence)),writeCommit:(sequence,value)=>write('commit:'+sequence,()=>commits.set(sequence,copy(value))),
  findCommitByOperation(principal,id){assertLock();const matches=[...commits.values()].filter(commit=>commit.principalId===principal&&commit.operationId===id);if(matches.length>1)throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});return read(matches[0]);},
  readReceipt:(principal,id)=>read(receipts.get(receiptKey(principal,id))),writeReceipt:(principal,id,value)=>write('receipt:'+id,()=>receipts.set(receiptKey(principal,id),copy(value)))
 };
 return {
  store,seal,
  snapshot:()=>copy({head,entities:[...entities],commits:[...commits],receipts:[...receipts]}),
  fault(at,phase){fault={at,phase};},
  metrics:()=>({writes,labels:[...labels]}),
  mutate(fn){const state=this.snapshot();fn(state);return createCommitStore(scope,state);}
 };
}
module.exports={createCommitStore,seal,canonical};
