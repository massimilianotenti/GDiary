// Isolated feasibility probe. Only synthetic markers enter this database.
// Do not reuse its name/schema for application data or treat success as a
// guarantee against browser eviction, origin changes or loss of power.
const DB_NAME='gdiary-storage-probe-v1',STORE='markers',TIMEOUT_MS=5000;
const KEY_A=['synthetic-archive-a','sample'],KEY_B=['synthetic-archive-b','sample'];
const SAMPLE_A='Prova sintetica: caffè, attività e 🌱',SAMPLE_B='Altro archivio sintetico';
const SAFE_ERRORS=new Set(['SecurityError','QuotaExceededError','InvalidStateError','VersionError','AbortError','NotSupportedError','TimeoutError','BlockedError','VerificationError']);
function failure(name){const error=new Error(name);error.name=name;return error;}
function safeError(error){return SAFE_ERRORS.has(error?.name)?error.name:'StorageError';}
function withTimeout(promise){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(failure('TimeoutError')),TIMEOUT_MS);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
function openDatabase(factory){return new Promise((resolve,reject)=>{
 let request,finished=false;
 const finish=(error,db)=>{if(finished){db?.close();return;}finished=true;clearTimeout(timer);if(error)reject(error);else resolve(db);};
 const timer=setTimeout(()=>finish(failure('TimeoutError')),TIMEOUT_MS);
 try{
  request=factory.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(finished){request.transaction.abort();return;}request.result.createObjectStore(STORE,{keyPath:['archive','key']});};
  request.onblocked=()=>finish(failure('BlockedError'));
  request.onerror=()=>finish(request.error);
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();finish(null,db);};
 }catch(error){finish(error);}
});}
// A successful request is not a committed transaction. Resolve only on complete.
function transact(db,mode,enqueue){return new Promise((resolve,reject)=>{
 let tx,result,finished=false;
 const finish=(error)=>{if(finished)return;finished=true;clearTimeout(timer);if(error)reject(error);else resolve(result);};
 const timer=setTimeout(()=>{try{tx?.abort();}catch{}finish(failure('TimeoutError'));},TIMEOUT_MS);
 try{
  tx=db.transaction(STORE,mode);
  tx.oncomplete=()=>finish();tx.onabort=()=>finish(tx.error||failure('AbortError'));
  // Request errors bubble and abort the transaction; report the abort, not text.
  tx.onerror=()=>{};
  enqueue(tx.objectStore(STORE),value=>{result=value;},tx);
 }catch(error){try{tx?.abort();}catch{}finish(error);}
});}
const read=(db,key)=>transact(db,'readonly',(store,done)=>{store.get(key).onsuccess=event=>done(event.target.result);});
const marker=(key,text)=>({archive:key[0],key:key[1],text});

export function createStorageProbe(environment=globalThis){
 let inFlight=null;
 const exclusive=fn=>{if(inFlight)return Promise.resolve({ok:false,error:'BusyError'});const flight=fn();inFlight=flight;return flight.finally(()=>{if(inFlight===flight)inFlight=null;});};
 const storage=()=>environment.navigator?.storage;
 async function persistence(){try{return typeof storage()?.persisted==='function'?await withTimeout(storage().persisted()):null;}catch{return null;}}
 async function run(){return exclusive(async()=>{
  const report={format:'gdiary-storage-probe/v1',ok:false,framed:environment.self!==environment.top,secureContext:environment.isSecureContext===true,available:false,previousMarker:false,roundTrip:false,rollback:false,isolated:false,reopened:false,persisted:null};
  let db;const start=environment.performance?.now?.()??Date.now();
  try{
   const factory=environment.indexedDB;if(!factory)throw failure('NotSupportedError');report.available=true;
   db=await openDatabase(factory);
   report.previousMarker=(await read(db,KEY_A))?.text===SAMPLE_A;
   await transact(db,'readwrite',store=>{store.put(marker(KEY_A,SAMPLE_A));store.put(marker(KEY_B,SAMPLE_B));});
   report.roundTrip=(await read(db,KEY_A))?.text===SAMPLE_A;
   report.isolated=(await read(db,KEY_B))?.text===SAMPLE_B;
   // Abort after a put succeeds to prove that request success isn't durability.
   let aborted=false;
   try{await transact(db,'readwrite',(store,done,tx)=>{store.put(marker(KEY_A,'modifica da annullare')).onsuccess=()=>tx.abort();});}
   catch(error){if(error.name!=='AbortError')throw error;aborted=true;}
   report.rollback=aborted&&(await read(db,KEY_A))?.text===SAMPLE_A;
   db.close();db=null;db=await openDatabase(factory);
   report.reopened=(await read(db,KEY_A))?.text===SAMPLE_A&&(await read(db,KEY_B))?.text===SAMPLE_B;
   report.persisted=await persistence();
   report.ok=report.roundTrip&&report.isolated&&report.rollback&&report.reopened;
   if(!report.ok)report.error='VerificationError';
  }catch(error){report.error=safeError(error);}
  finally{db?.close();report.durationMs=Math.max(0,Math.round((environment.performance?.now?.()??Date.now())-start));}
  return report;
 });}
 async function clear(){return exclusive(async()=>{
  try{
   const factory=environment.indexedDB;if(!factory)throw failure('NotSupportedError');
   await new Promise((resolve,reject)=>{
    let request;const timer=setTimeout(()=>reject(failure('TimeoutError')),TIMEOUT_MS);
    const finish=error=>{clearTimeout(timer);if(error)reject(error);else resolve();};
    try{request=factory.deleteDatabase(DB_NAME);request.onsuccess=()=>finish();request.onerror=()=>finish(request.error);request.onblocked=()=>finish(failure('BlockedError'));}catch(error){finish(error);}
   });
   return {ok:true};
  }catch(error){return {ok:false,error:safeError(error)};}
 });}
 async function requestPersistence(){return exclusive(async()=>{
  try{if(typeof storage()?.persist!=='function')throw failure('NotSupportedError');return {ok:true,persisted:await withTimeout(storage().persist())};}
  catch(error){return {ok:false,error:safeError(error)};}
 });}
 return Object.freeze({run,clear,requestPersistence});
}

export const storageProbe=createStorageProbe();
