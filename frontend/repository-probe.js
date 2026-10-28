import {createLocalRepository} from './local-repository.js';
import {createJournalReadCache} from './journal-read-cache.js';
import {createCommonReadCache} from './common-read-cache.js';
// Explicit synthetic-only harness. It never consumes state, manifest, diary
// drafts, current user IDs or the application database name.
const DB='gdiary-repository-probe-v1',VERSION='2026-10-01T00:00:00.000Z';
const A={archiveId:'synthetic-repository-a',principalId:'synthetic-principal-a',epoch:'synthetic-epoch-first',protocolVersion:1,schemaVersion:1};
const B={...A,archiveId:'synthetic-repository-b'};
const ENTRY='synthetic-entry',TEXT='Prova repository: caffè 🌱',DRAFT='Bozza soltanto fittizia';
export function createRepositoryProbe(environment=globalThis){
 let flight=null;
 const exclusive=fn=>{if(flight)return Promise.resolve({ok:false,error:'BusyError'});flight=fn();return flight.finally(()=>{flight=null;});};
 const check=result=>{if(!result.ok)throw Object.assign(new Error(result.error),{name:result.error});return result.value;};
 const safe=error=>['QuotaExceededError','SecurityError','NotSupportedError','VersionError','AbortError','TimeoutError','BlockedError','ConflictError','SchemaError'].includes(error?.name)?error.name:'StorageError';
 async function run(){return exclusive(async()=>{
  const report={format:'gdiary-repository-probe/v1',ok:false,previousState:false,atomic:false,isolated:false,draftPreserved:false,reopened:false,viewReopened:false,commonReopened:false};let repo,scope=A;
  const started=environment.performance?.now?.()??Date.now();
  const open=()=>createLocalRepository({identity:{getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},enabled:()=>true,environment,databaseName:DB});
  const sample=(revision,text=TEXT)=>({expectedRevision:revision,cursor:'synthetic-checkpoint',entries:[{id:ENTRY,updatedAt:VERSION,text}],contents:[{id:ENTRY,version:VERSION,body:text,rich:[{kind:'p',runs:[{text,bold:true}]}]}]});
  try{
   repo=open();const previous=check(await repo.getDraft('note',ENTRY));report.previousState=previous?.snapshot.body===DRAFT;
   let revision=check(await repo.clearRemote()).revision;check(await repo.applyRemoteBatch(sample(revision)));
   check(await repo.putDraft({kind:'note',id:ENTRY,expectedRevision:previous?.localRevision||0,baseVersion:VERSION,snapshot:{body:DRAFT}}));
   report.atomic=check(await repo.getMeta()).cursor==='synthetic-checkpoint'&&check(await repo.getContent(ENTRY)).rich[0].runs[0].bold===true;
   scope=B;const otherRevision=check(await repo.clearRemote()).revision;report.isolated=check(await repo.getEntry(ENTRY))===null;check(await repo.applyRemoteBatch(sample(otherRevision,'Altro repository fittizio')));scope=A;report.isolated=report.isolated&&check(await repo.getContent(ENTRY)).body===TEXT;
   revision=check(await repo.clearRemote()).revision;
   report.draftPreserved=check(await repo.getEntry(ENTRY))===null&&check(await repo.getDraft('note',ENTRY)).snapshot.body===DRAFT;
   check(await repo.applyRemoteBatch(sample(revision)));
   const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},request={month:'2026-10',project:'',cursor:''};
   let cache=createJournalReadCache({repository:repo,identity,enabled:()=>true});
   const prepared=await cache.prepare(request);if(!prepared.ok)throw Object.assign(new Error(prepared.error),{name:prepared.error});
   const saved=await cache.save(prepared.ticket,{month:'2026-10',entries:[{id:ENTRY,date:'2026-10-01',updatedAt:VERSION,text:'Pagina fittizia',body:TEXT,rich:[{kind:'p',runs:[{text:TEXT,bold:true}]}]}],total:1,nextCursor:'',nextEntry:null,contentsIncluded:true});if(!saved.ok)throw Object.assign(new Error(saved.error),{name:saved.error});
   const commonRequest={kind:'journal',month:'2026-10',today:'2026-10-01'};
   let commonCache=createCommonReadCache({repository:repo,identity,enabled:()=>true});
   const commonTicket=await commonCache.prepare(commonRequest);if(!commonTicket.ok)throw Object.assign(new Error(commonTicket.error),{name:commonTicket.error});
   const commonSaved=await commonCache.save(commonTicket.ticket,{...commonRequest,commonIncluded:true,commonScope:commonRequest,settings:{dailyReflectionMode:'essential',version:''},projects:[],goals:[],habits:[],commonSlices:{days:{from:'2026-09-30',to:'2026-10-31',rows:[{date:'2026-10-01',intention:TEXT,updatedAt:VERSION}]},weeks:{from:'2026-09-28',to:'2026-09-28',rows:[]},habitLogs:{from:'2026-09-28',to:'2026-11-01',rows:[]}}});if(!commonSaved.ok)throw Object.assign(new Error(commonSaved.error),{name:commonSaved.error});
   repo.close();repo=open();report.reopened=check(await repo.getContent(ENTRY)).body===TEXT;
   cache=createJournalReadCache({repository:repo,identity,enabled:()=>true});
   const page=await cache.read(request);report.viewReopened=page.ok&&page.hit&&page.stale&&page.response.entries[0].rich[0].runs[0].bold===true;
   commonCache=createCommonReadCache({repository:repo,identity,enabled:()=>true});const common=await commonCache.read(commonRequest);report.commonReopened=common.ok&&common.hit&&common.stale&&common.response.commonSlices.days.rows[0].intention===TEXT;
   report.ok=report.atomic&&report.isolated&&report.draftPreserved&&report.reopened&&report.viewReopened&&report.commonReopened;
  }catch(error){report.error=safe(error);}finally{repo?.close();report.durationMs=Math.max(0,Math.round((environment.performance?.now?.()??Date.now())-started));}
  return report;
 });}
 async function clear(){return exclusive(async()=>{
  try{await new Promise((resolve,reject)=>{let request,finished=false;const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve();};const timer=setTimeout(()=>finish(Object.assign(new Error('TimeoutError'),{name:'TimeoutError'})),5000);try{const factory=environment.indexedDB;if(!factory)throw Object.assign(new Error('NotSupportedError'),{name:'NotSupportedError'});request=factory.deleteDatabase(DB);request.onsuccess=()=>finish();request.onerror=()=>finish(request.error);request.onblocked=()=>finish(Object.assign(new Error('BlockedError'),{name:'BlockedError'}));}catch(error){finish(error);}});return {ok:true};}catch(error){return {ok:false,error:safe(error)};}
 });}
 return Object.freeze({run,clear});
}
export const repositoryProbe=createRepositoryProbe();
