import {periodOperation} from './period-operation.mjs';
import {canonicalDayJSON} from './day-operation.mjs';
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value);
const errorName=error=>String(error?.name||'');
const transientCodes=new Set(['BusyError','NetworkError','TimeoutError','RateLimit','ServiceUnavailable','StorageError','ProtocolUnavailable']);

export function createOutboxDispatcher(options={}){
 const {repository,identity,enabled=()=>false,call}=options;
 if(!repository||!identity||typeof call!=='function')throw Object.assign(Error('DataError'),{name:'DataError'});
 const owner=options.owner||crypto.randomUUID(),tokenFactory=options.tokenFactory||(()=>crypto.randomUUID()),now=options.now||(()=>Date.now()),leaseMs=options.leaseMs||60000,limit=options.limit||5;
 let active=false,expectedScope=null;
 const requireScope=()=>{const current=identity.getScope?.();if(!enabled()||!expectedScope||!current||!['archiveId','principalId','epoch'].every(key=>validId(expectedScope[key]))||expectedScope.protocolVersion!==1||expectedScope.schemaVersion!==1||['archiveId','principalId','epoch','protocolVersion','schemaVersion'].some(key=>current[key]!==expectedScope[key]))throw Object.assign(Error('ScopeChangedError'),{name:'ScopeChangedError'});};
 const invoke=async(name,input)=>{requireScope();const result=await repository[name](input);requireScope();if(!result?.ok)throw Object.assign(Error(result?.error||'StorageError'),{name:result?.error||'StorageError'});return result.value;};
 function requestFor(operation){
  if(periodOperation(operation.kind)){if(operation.action!=='upsert'||!validId(operation.operationId)||!periodOperation(operation.kind).validOperation(operation.payload,operation.id,operation.baseVersion,operation.operationId))throw Object.assign(Error('DataError'),{name:'DataError'});return {method:periodOperation(operation.kind).saveMethod,payload:{operation:operation.payload,scope:{...expectedScope}},clientId:null};}
  if(operation.action==='delete'){
   if(!validId(operation.operationId)||!validId(operation.id)||typeof operation.baseVersion!=='string'||!operation.baseVersion||operation.payload?.id!==operation.id||operation.payload?.operationId!==operation.operationId||operation.payload?.baseVersion!==operation.baseVersion)throw Object.assign(Error('DataError'),{name:'DataError'});
   return {method:'deleteNote',payload:{id:operation.id,updatedAt:operation.baseVersion,operationId:operation.operationId},clientId:null};
  }
  const payload=pageFor(operation);return {method:'saveJournalPage',payload,clientId:payload.blocks[0].clientId};
 }
 function pageFor(operation){
  if(operation.action!=='upsert')throw Object.assign(Error('UnsupportedOperation'),{name:'UnsupportedOperation'});
  const payload=operation.payload||{},snapshot=payload;
  if(!validId(operation.operationId)||!validId(operation.id)||payload.id!==operation.id||payload.operationId!==operation.operationId||payload.baseVersion!==operation.baseVersion||!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date||'')||operation.kind==='task'&&snapshot.type!=='task'||operation.kind==='note'&&!['note','idea'].includes(snapshot.type)||typeof snapshot.body!=='string'||!Array.isArray(snapshot.rich))throw Object.assign(Error('DataError'),{name:'DataError'});
  const clientId=validId(snapshot.clientId)?snapshot.clientId:operation.id;
  const block={...snapshot,id:operation.id,clientId,updatedAt:operation.baseVersion||'',createdAt:snapshot.createdAt||'',contentLoaded:true};
  delete block.operationId;delete block.baseVersion;
  return {month:snapshot.date.slice(0,7),operationId:operation.operationId,blocks:[block]};
 }
 function classify(error){
  const name=errorName(error),message=String(error?.message||error).toLowerCase();
  if(['ConflictError','ScopeChanged','OperationMismatch'].includes(name)||/modificat[oaie]\s+altrove|conflitto|versione.*diversa|(?:nota|voce) .{0,12}cambiat|voce non trovata/.test(message))return 'conflict';
  if(transientCodes.has(name)||/timeout|temporane|riprova tra poco|network|offline|service unavailable/.test(message))return 'retry';
  return 'failed';
 }
 async function lookupReceipt(operation,request){
  requireScope();const proof=await call(periodOperation(operation.kind)?periodOperation(operation.kind).receiptMethod:operation.action==='delete'?'getJournalDeleteReceipt':'getJournalOperationReceipt',{scope:{...expectedScope},request:periodOperation(operation.kind)?request.payload.operation:request.payload});requireScope();
  if(!proof||!proof.scope||['archiveId','principalId','epoch','protocolVersion','schemaVersion'].some(key=>proof.scope[key]!==expectedScope[key])||proof.operationId!==operation.operationId||!['committed','conflict','unknown'].includes(proof.status))throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});
  if(proof.status==='committed'&&(proof.id!==operation.id||!/^commit-[1-9][0-9]{0,15}$/.test(proof.version||'')||!Number.isSafeInteger(Number(proof.version.slice(7)))))throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});
  return proof;
 }
 async function drain(){
  if(active)return {ok:false,error:'BusyError'};
  if(!enabled())return {ok:true,value:{disabled:true,processed:0}};
  active=true;const initialScope=identity.getScope?.();expectedScope=initialScope?{...initialScope}:null;const token=tokenFactory();let acquired=false,processed=0;
  try{
   if(!validId(owner)||!validId(token))throw Object.assign(Error('DataError'),{name:'DataError'});
   const verified=await identity.verify();if(!verified?.verified||!verified?.cacheReady)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});requireScope();
   let lease=await invoke('acquireOutboxLease',{owner,token,now:now(),leaseMs});acquired=true;
   const batch=await invoke('claimOutboxBatch',{owner,token,now:now(),limit});
   for(const operation of batch.operations){
    // Do not start another RPC after our ownership has expired or changed.
    // A previous RPC may have consumed most of the lease while it was in flight.
    lease=await invoke('renewOutboxLease',{owner,token,now:now(),leaseMs});
    let request=null,sent=false;
    try{
     request=requestFor(operation);
     if(operation.attempts>1){
      let proof;try{proof=await lookupReceipt(operation,request);}catch(error){if(['ScopeChanged','ScopeChangedError','OperationMismatch','ProtocolCorrupt'].includes(errorName(error)))throw error;throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});}
      if(proof.status==='committed'){await invoke('settleOutboxOperation',{owner,token,operationId:operation.operationId,outcome:'ack',now:now(),serverVersion:proof.version});processed++;try{if(operation.action==='delete')await options.onAck?.(operation,{id:operation.id,updatedAt:proof.version});else await options.onReconciled?.(operation,{id:operation.id,updatedAt:proof.version});}catch{}continue;}
      if(proof.status==='conflict'){await invoke('settleOutboxOperation',{owner,token,operationId:operation.operationId,outcome:'conflict',errorCode:'ConflictError',now:now()});try{await options.onFailure?.(operation,'conflict');}catch{}continue;}
      lease=await invoke('renewOutboxLease',{owner,token,now:now(),leaseMs});
     }
     sent=true;const response=await call(request.method,request.payload),matches=operation.action==='delete'?null:Array.isArray(response?.entries)?response.entries.filter(item=>item?.clientId===request.clientId):[],entry=periodOperation(operation.kind)?response?.[operation.kind]?{...response[operation.kind],id:response[operation.kind][periodOperation(operation.kind).key]}:null:operation.action==='delete'?response?.deletedNoteId===operation.id?{id:operation.id,updatedAt:response.updatedAt||''}:null:matches.length===1?matches[0]:null;
     requireScope();if(operation.action==='delete'&&response?.alreadyAbsent===true)throw Object.assign(Error('ConflictError'),{name:'ConflictError'});if(!entry||entry.id!==operation.id||typeof entry.updatedAt!=='string'||!entry.updatedAt.trim()||entry.updatedAt.length>200)throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});
     if(periodOperation(operation.kind)){
      const spec=periodOperation(operation.kind),{updatedAt,...snapshot}=response[operation.kind];
      if(!/^commit-[1-9][0-9]{0,15}$/.test(updatedAt)||!Number.isSafeInteger(Number(updatedAt.slice(7)))||!spec.validOperation({...operation.payload,[operation.kind]:snapshot},operation.id,operation.baseVersion,operation.operationId)||canonicalDayJSON(snapshot)!==canonicalDayJSON(operation.payload[operation.kind]))throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});
     }
     await invoke('settleOutboxOperation',{owner,token,operationId:operation.operationId,outcome:'ack',now:now(),...(entry.updatedAt?{serverVersion:entry.updatedAt}:{})});processed++;
     try{await options.onAck?.(operation,entry);}catch{}
    }catch(error){
     requireScope();if(['ScopeChanged','ScopeChangedError'].includes(errorName(error)))throw error;let outcome=classify(error);
     if(sent&&['upsert','delete'].includes(operation.action)){
      // Query the original request, without interpreting an absent receipt as
      // evidence that the server did not commit it.
      lease=await invoke('renewOutboxLease',{owner,token,now:now(),leaseMs});let proof=null;
      try{proof=await lookupReceipt(operation,request);}catch(lookupError){requireScope();if(['ScopeChanged','ScopeChangedError'].includes(errorName(lookupError)))throw lookupError;if(errorName(lookupError)==='ProtocolCorrupt')outcome='failed';else if(errorName(lookupError)==='OperationMismatch')outcome='conflict';}
      if(proof?.status==='committed'){await invoke('settleOutboxOperation',{owner,token,operationId:operation.operationId,outcome:'ack',now:now(),serverVersion:proof.version});processed++;try{if(operation.action==='delete')await options.onAck?.(operation,{id:operation.id,updatedAt:proof.version});else await options.onReconciled?.(operation,{id:operation.id,updatedAt:proof.version});}catch{}continue;}
      if(proof?.status==='conflict')outcome='conflict';
     }
     if(outcome==='retry')await invoke('retryOutboxFailure',{owner,token,operationId:operation.operationId,now:now(),errorCode:transientCodes.has(errorName(error))?errorName(error):'NetworkError'});
     else await invoke('settleOutboxOperation',{owner,token,operationId:operation.operationId,outcome,errorCode:errorName(error)||'ProtocolCorrupt',now:now()});
     if(outcome!=='retry')try{await options.onFailure?.(operation,outcome);}catch{}
    }
   }
   return {ok:true,value:{processed,claimed:batch.operations.length,leaseExpiresAt:lease.expiresAt}};
  }catch(error){return {ok:false,error:errorName(error)||'ProtocolCorrupt'};}
  finally{if(acquired)try{await invoke('releaseOutboxLease',{owner,token,now:now()});}catch(ignore){}expectedScope=null;active=false;}
 }
 return {drain};
}
