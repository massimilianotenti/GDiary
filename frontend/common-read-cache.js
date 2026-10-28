// Bounded common-state preview for a journal month. Only direct, complete
// catalog + temporal-slice responses are accepted; never infer completeness
// from the application's accumulated state. No real-data initializer exists.
const FORMAT='common-journal/v1',KEYS={projects:'slug',goals:'id',habits:'id',days:'date',weeks:'week',habitLogs:'key'};
const fail=name=>Object.assign(new Error(name),{name});
const clone=value=>structuredClone(value);
const sameScope=(a,b)=>!!a&&!!b&&['archiveId','principalId','epoch','schemaVersion','protocolVersion'].every(key=>a[key]===b[key]);
const safe=error=>['ConflictError','ScopeChangedError','IdentityError','NotEnabledError','DataError','SchemaError','StaleVersionError','QuotaExceededError','SecurityError','VersionError','AbortError','ClosedError','TimeoutError','BlockedError','NotSupportedError'].includes(error?.name)?error.name:'StorageError';
const checked=result=>{if(!result?.ok)throw fail(result?.error||'StorageError');return result;};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const shift=(date,days)=>{const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);};
const monday=date=>shift(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
function normalizeRequest(value){
 if(!value||Object.keys(value).some(key=>!['kind','month','today'].includes(key))||value.kind!=='journal'||typeof value.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month)||!validDate(value.month+'-01')||!validDate(value.today))throw fail('DataError');
 return {kind:'journal',month:value.month,today:value.today};
}
function expectedRanges(request){
 const first=request.month+'-01',date=new Date(first+'T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);const last=shift(date.toISOString().slice(0,10),-1),week=monday(request.today);
 return {days:{from:shift(first,-1),to:last},weeks:{from:week,to:week},habitLogs:{from:monday(first),to:shift(monday(last),6)}};
}
function normalizeResponse(request,response){
 const scope=response?.commonScope;
 if(response?.commonIncluded!==true||response.today!==request.today||response.month!==request.month||scope?.kind!=='journal'||scope.month!==request.month||scope.today!==request.today||!response.commonSlices||Object.keys(response.commonSlices).sort().join(',')!=='days,habitLogs,weeks')throw fail('DataError');
 const ranges=expectedRanges(request),commonUpserts={},items=[];
 for(const [collection,key]of Object.entries(KEYS)){
  let rows=response[collection];
  if(ranges[collection]){
   const slice=response.commonSlices[collection],range=ranges[collection];
   if(!slice||!Array.isArray(slice.rows))throw fail('DataError');
   if(slice.ranges!==undefined){if(slice.from!==undefined||slice.to!==undefined||!Array.isArray(slice.ranges)||slice.ranges.length!==1||slice.ranges[0]?.from!==range.from||slice.ranges[0]?.to!==range.to)throw fail('DataError');}
   else if(slice.from!==range.from||slice.to!==range.to)throw fail('DataError');
   rows=slice.rows;
   const dateKey=collection==='weeks'?'week':'date';
   if(rows.some(row=>!validDate(row?.[dateKey])||row[dateKey]<range.from||row[dateKey]>range.to||collection==='habitLogs'&&row.key!==row.habitId+'|'+row.date))throw fail('DataError');
  }
  if(!Array.isArray(rows)||rows.length>500)throw fail('DataError');
  commonUpserts[collection]=rows;
  for(const row of rows){if(!row||typeof row[key]!=='string'||!row[key]||row[key].length>200||typeof row.updatedAt!=='string')throw fail('DataError');items.push({collection,id:row[key],version:row.updatedAt});}
 }
 if(items.length>500)throw fail('DataError');
 const settings=response.settings;
 if(!settings||!['essential','detailed'].includes(settings.dailyReflectionMode)||typeof settings.version!=='string'||settings.version.length>200)throw fail('DataError');
 // Privacy preferences, allTags, taskPlans, entries, files and tracing are not
 // copied. This preview cannot change the active privacy configuration.
 const payload={today:request.today,month:request.month,commonIncluded:true,commonScope:{...request},settings:{dailyReflectionMode:settings.dailyReflectionMode,version:settings.version},ranges};
 return {commonUpserts,items,payload};
}
export function createCommonReadCache({repository,identity,enabled=()=>false,now=()=>Date.now()}={}){
 const tickets=new WeakSet();
 function authorize(){if(enabled()!==true)throw fail('NotEnabledError');if(identity?.status().verified!==true||identity.status().cacheReady!==true)throw fail('IdentityError');const scope=identity.getScope();if(!scope)throw fail('IdentityError');return clone(scope);}
 function guard(scope){if(!sameScope(authorize(),scope))throw fail('ScopeChangedError');}
 const result=async action=>{try{return await action();}catch(error){return {ok:false,error:safe(error)};}};
 return Object.freeze({
  prepare:request=>result(async()=>{
   const scope=authorize(),normalized=normalizeRequest(request),meta=checked(await repository.getMeta());guard(scope);if(!sameScope(scope,meta.scope))throw fail('ScopeChangedError');
   const ticket=Object.freeze({request:Object.freeze(normalized),scope:Object.freeze(scope),revision:meta.value.revision});tickets.add(ticket);return {ok:true,ticket};
  }),
  save:(ticket,response)=>result(async()=>{
   if(!ticket||!tickets.delete(ticket))throw fail('DataError');guard(ticket.scope);
   const value=normalizeResponse(ticket.request,clone(response)),savedAt=now();if(!Number.isSafeInteger(savedAt)||savedAt<0)throw fail('DataError');
   const saved=checked(await repository.applyRemoteBatch({expectedRevision:ticket.revision,commonUpserts:value.commonUpserts,coverage:{commonJournal:{format:FORMAT,key:JSON.stringify(ticket.request),revision:ticket.revision+1,savedAt,payload:value.payload,items:value.items}}}));
   guard(ticket.scope);if(!sameScope(ticket.scope,saved.scope))throw fail('ScopeChangedError');return {ok:true};
  }),
  read:request=>result(async()=>{
   const scope=authorize(),normalized=normalizeRequest(request),snapshot=checked(await repository.readRemoteCommonView());guard(scope);if(!sameScope(scope,snapshot.scope))throw fail('ScopeChangedError');
   if(!snapshot.value||snapshot.value.view.key!==JSON.stringify(normalized))return {ok:true,hit:false};
   const {view,records}=snapshot.value,payload=view.payload,response={today:payload?.today,month:payload?.month,commonIncluded:true,commonScope:payload?.commonScope,settings:payload?.settings,commonSlices:{},projects:[],goals:[],habits:[]};
   for(const collection of ['days','weeks','habitLogs'])response.commonSlices[collection]={...payload?.ranges?.[collection],rows:[]};
   for(const row of records){const target=response[row.collection]||response.commonSlices[row.collection]?.rows;if(!target)throw fail('SchemaError');target.push(row.data);}
   normalizeResponse(normalized,response);if(!Number.isSafeInteger(view.savedAt)||view.savedAt<0)throw fail('SchemaError');
   return {ok:true,hit:true,response,savedAt:view.savedAt,stale:true,scope};
  }),
  isCurrent(scope){try{guard(scope);return true;}catch{return false;}}
 });
}
