const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-common-cache-'));
const server=http.createServer((req,res)=>{const file=req.url==='/Demo.html'?'Demo.html':req.url==='/Changelog.html'?'Changelog.html':null;if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));});
(async()=>{let context;const errors=[];try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
 async function launch(){context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);return page;}
 let page=await launch();
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);},api=BulletJournalVue;
  const A={archiveId:'synthetic-common-archive',principalId:'synthetic-common-principal-a',epoch:'synthetic-common-epoch',schemaVersion:1,protocolVersion:1},B={...A,principalId:'synthetic-common-principal-b'};let scope=A,enabled=true,ready=true;
  const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:ready})},repository=api.createLocalRepository({identity,enabled:()=>enabled,databaseName:'gdiary-common-cache-test-v1'}),cache=api.createCommonReadCache({repository,identity,enabled:()=>enabled,now:()=>1234});
  const request={kind:'journal',month:'2026-10',today:'2026-10-28'},v1='2026-10-01T00:00:00.000Z',v2='2026-10-02T00:00:00.000Z';
  const rich=JSON.stringify([{kind:'p',runs:[{text:'Riflessione 🌱',bold:true}]}]);
  const fixture=()=>({month:request.month,today:request.today,commonIncluded:true,commonScope:{...request},commonSlices:{days:{from:'2026-09-30',to:'2026-10-31',rows:[{date:'2026-10-01',intention:'Riflessione 🌱',intentionRich:rich,reflection:'Sera inventata',updatedAt:v1}]},weeks:{from:'2026-10-26',to:'2026-10-26',rows:[{week:'2026-10-26',focus:'Focus inventato',updatedAt:v1}]},habitLogs:{ranges:[{from:'2026-09-28',to:'2026-11-01'}],rows:[{key:'habit-a|2026-10-01',habitId:'habit-a',date:'2026-10-01',status:'done',updatedAt:v1}]}},projects:[{slug:'progetto-fittizio',name:'Progetto fittizio',updatedAt:v1}],goals:[{id:'goal-a',cycle:'2026-Q4',title:'Obiettivo inventato',updatedAt:v1}],habits:[{id:'habit-a',goalId:'goal-a',title:'Pratica inventata',updatedAt:v1}],settings:{dailyReflectionMode:'detailed',version:'synthetic-settings-version',privateTags:['DO-NOT-COPY-PRIVACY'],privacyVersion:'DO-NOT-COPY'},entries:[{id:'DO-NOT-COPY-ENTRY'}],taskPlans:[{entryId:'DO-NOT-COPY-PLAN'}],allTags:['DO-NOT-COPY-TAGS'],performance:{traceId:'DO-NOT-COPY-TRACE'}});
  const save=async(value=fixture())=>{const prepared=await cache.prepare(request);check(prepared.ok,'prepare');const result=await cache.save(prepared.ticket,value);check(result.ok,'save '+result.error);};
  enabled=false;check((await cache.prepare(request)).error==='NotEnabledError','opt-in');enabled=true;ready=false;check((await cache.prepare(request)).error==='IdentityError','identity gate');ready=true;
  for(const bad of [{...request,kind:'week'},{...request,today:'2026-02-30'},{...request,month:'2026-13'},{...request,project:'unexpected'}])check((await cache.prepare(bad)).error==='DataError','unsupported request');
  check(!(await cache.read(request)).hit,'empty cache');await save();
  let cached=await cache.read(request);check(cached.ok&&cached.hit&&cached.stale&&cached.savedAt===1234,'covered common preview');check(cached.response.commonSlices.days.rows[0].intentionRich===rich&&cached.response.commonSlices.habitLogs.rows[0].status==='done','rich reflections and logs roundtrip');check(!JSON.stringify(cached).includes('DO-NOT-COPY'),'privacy, entries, plans, tags and tracing excluded');
  check(!(await cache.read({...request,month:'2026-11'})).hit&&!(await cache.read({...request,today:'2026-10-29'})).hit,'month/today bound key');
  for(const calendar of [
   {request:{kind:'journal',month:'2028-02',today:'2028-02-29'},days:['2028-01-31','2028-02-29'],weeks:['2028-02-28','2028-02-28'],habitLogs:['2028-01-31','2028-03-05']},
   {request:{kind:'journal',month:'2027-01',today:'2026-12-31'},days:['2026-12-31','2027-01-31'],weeks:['2026-12-28','2026-12-28'],habitLogs:['2026-12-28','2027-01-31']}
  ]){
   const value={...calendar.request,commonIncluded:true,commonScope:calendar.request,projects:[],goals:[],habits:[],settings:{dailyReflectionMode:'essential',version:''},commonSlices:{}};
   for(const collection of ['days','weeks','habitLogs'])value.commonSlices[collection]={from:calendar[collection][0],to:calendar[collection][1],rows:[]};
   const prepared=await cache.prepare(calendar.request);check((await cache.save(prepared.ticket,value)).ok&&(await cache.read(calendar.request)).hit,'leap month/year boundary coverage');
  }
  await save();
  const before=(await repository.getMeta()).value.revision;
  const malformed=[];let value=fixture();delete value.goals;malformed.push(value);value=fixture();value.commonIncluded=false;malformed.push(value);value=fixture();value.commonScope.kind='full';malformed.push(value);value=fixture();value.commonSlices.days.from='2026-10-01';malformed.push(value);value=fixture();value.commonSlices.days.rows[0].date='2026-09-29';malformed.push(value);value=fixture();value.commonSlices.days.rows[0].date='2026-02-30';malformed.push(value);value=fixture();value.commonSlices.habitLogs.rows[0].key='wrong';malformed.push(value);value=fixture();value.commonSlices.weeks.rows[0].week='2026-10-27';malformed.push(value);value=fixture();value.commonSlices.days.ranges=[{from:'2026-09-30',to:'2026-10-31'}];malformed.push(value);value=fixture();value.habits[0].updatedAt='';malformed.push(value);value=fixture();value.projects.push(value.projects[0]);malformed.push(value);value=fixture();value.settings.dailyReflectionMode='unsupported';malformed.push(value);value=fixture();value.goals=Array.from({length:501},(_,i)=>({id:'goal-'+i,updatedAt:v1}));malformed.push(value);
  for(const bad of malformed){const ticket=(await cache.prepare(request)).ticket;check(!(await cache.save(ticket,bad)).ok,'malformed or incomplete response rejected');}
  check((await repository.getMeta()).value.revision===before&&(await cache.read(request)).hit,'invalid response leaves old complete preview/checkpoint');
  await repository.putDraft({kind:'daily',id:'2026-10-01',expectedRevision:0,baseVersion:v1,snapshot:{intention:'Bozza protetta'}});
  const stale=await cache.prepare(request);await repository.applyRemoteBatch({expectedRevision:before,commonUpserts:{days:[{date:'2026-10-01',intention:'Nuovo salvataggio',updatedAt:v2}]}});
  check((await cache.save(stale.ticket,fixture())).error==='ConflictError'&&!(await cache.read(request)).hit,'late common RPC cannot overwrite acknowledged local mutation');
  check((await cache.save(stale.ticket,fixture())).error==='DataError'&&(await cache.save({...stale.ticket},fixture())).error==='DataError','tickets single use and unforgeable');
  const newer=fixture();newer.commonSlices.days.rows[0].updatedAt=v2;await save(newer);
  scope=B;check(!(await cache.read(request)).hit,'principal separation');scope={...A,epoch:'synthetic-next-epoch'};check(!(await cache.read(request)).hit,'epoch separation');scope=A;
  const revoked=await cache.prepare(request);scope=B;check((await cache.save(revoked.ticket,newer)).error==='ScopeChangedError','scope switch before response');scope=A;
  // Page and common previews survive unrelated reads but retain separate
  // membership proofs. Their RPC tickets still share the canonical CAS.
  const journal=api.createJournalReadCache({repository,identity,enabled:()=>enabled});
  const pageRequest={month:'2026-10'},pageResponse={month:'2026-10',contentsIncluded:true,total:1,nextCursor:'',nextEntry:null,entries:[{id:'note-a',date:'2026-10-01',updatedAt:v1,text:'Nota inventata',body:'Corpo inventato',rich:[]}]};
  let ticket=(await journal.prepare(pageRequest)).ticket;check((await journal.save(ticket,pageResponse)).ok&&(await cache.read(request)).hit,'page acquisition preserves valid common descriptor');
  await save(newer);check((await journal.read(pageRequest)).hit,'common acquisition preserves valid page descriptor');
  const commonTicket=(await cache.prepare(request)).ticket,pageTicket=(await journal.prepare(pageRequest)).ticket;
  const races=await Promise.all([cache.save(commonTicket,newer),journal.save(pageTicket,pageResponse)]);check(races.filter(result=>result.ok).length===1&&races.some(result=>result.error==='ConflictError'),'concurrent responses cannot both acquire same checkpoint');
  await save(newer);ticket=(await journal.prepare(pageRequest)).ticket;await journal.save(ticket,pageResponse);
  const revision=(await repository.getMeta()).value.revision;await repository.applyRemoteBatch({expectedRevision:revision,commonUpserts:{days:[{...newer.commonSlices.days.rows[0],updatedAt:'2026-10-03T00:00:00.000Z'}]}});
  check(!(await cache.read(request)).hit&&(await journal.read(pageRequest)).hit,'common mutation invalidates common preview while preserving note page');
  newer.commonSlices.days.rows[0].updatedAt='2026-10-03T00:00:00.000Z';await save(newer);
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(row,...args){if(this.name==='commonRecords'&&row.collection==='goals')throw new DOMException('PRIVATE','QuotaExceededError');return put.call(this,row,...args);};
  try{ticket=(await cache.prepare(request)).ticket;const failed=await cache.save(ticket,newer);check(failed.error==='QuotaExceededError'&&!JSON.stringify(failed).includes('PRIVATE'),'quota abort sanitized');}finally{IDBObjectStore.prototype.put=put;}
  check((await cache.read(request)).hit&&(await repository.getDraft('daily','2026-10-01')).value.snapshot.intention==='Bozza protetta','failed common batch preserves prior preview and draft');
  const empty=fixture();for(const collection of ['projects','goals','habits'])empty[collection]=[];for(const slice of Object.values(empty.commonSlices))slice.rows=[];await save(empty);cached=await cache.read(request);check(cached.hit&&cached.response.goals.length===0&&cached.response.commonSlices.days.rows.length===0,'authoritative empty collections are covered, not a miss');
  check((await repository.getCommon('days','2026-10-01')).value,'old unreferenced rows retained without leaking into current membership');await save(newer);
  // A damaged referenced row cannot become an empty but "complete" day.
  const raw=await new Promise((resolve,reject)=>{const r=indexedDB.open('gdiary-common-cache-test-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise((resolve,reject)=>{const tx=raw.transaction('commonRecords','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.objectStore('commonRecords').delete([A.archiveId,A.principalId,A.epoch,'days','2026-10-01']);});raw.close();check(!(await cache.read(request)).hit,'missing referenced row causes miss');await save(newer);
  // Actual ensureCommon bridge: the preview must not enter state or overwrite
  // daily drafts while a deliberately delayed Google response is pending.
  const previousApi=globalThis.api;let release;
  commonViewCache=cache;view='journal';taskDiary=false;month=request.month;state.today=request.today;commonReadAt=0;catalogReadAt=0;commonScope=null;dirtyMain=dirtyDetail=false;query='';
  const beforeState=JSON.stringify(state.days),content=document.getElementById('content');
  globalThis.api=(name,...args)=>name==='getCommonState'?new Promise(resolve=>{release=resolve;}):previousApi(name,...args);
  const loading=ensureCommon();while(!content.querySelector('.common-local-preview'))await new Promise(resolve=>setTimeout(resolve,5));
  const preview=content.querySelector('.common-local-preview');check(preview.textContent.includes('Riflessione 🌱')&&preview.textContent.includes('Obiettivo inventato')&&preview.textContent.includes('Pratica inventata'),'shell renders invented common preview');
  check(!preview.querySelector('button,input,textarea,[contenteditable]')&&JSON.stringify(state.days)===beforeState,'common preview has no editor/actions or canonical merge');
  const draft=dailyBlock('2026-10-01','intention');Object.assign(draft,{dirty:true,body:'Bozza in attesa',updatedAt:'original-draft-version',rich:[{kind:'p',runs:[{text:'Bozza in attesa'}]}]});dirtyMain=true;
  release(newer);await loading;check(!content.querySelector('.common-local-preview')&&dailyDrafts.get('2026-10-01:intention')===draft&&draft.body==='Bozza in attesa'&&draft.updatedAt==='original-draft-version','remote common response removes preview and preserves original dirty draft');
  // An acknowledged mutation while the next RPC is pending cancels delivery
  // and cache publication, even though the local DB itself was not changed.
  dirtyMain=false;commonReadAt=0;catalogReadAt=0;const localRevision=(await repository.getMeta()).value.revision;
  const staleRead=ensureCommon();while(!content.querySelector('.common-local-preview'))await new Promise(resolve=>setTimeout(resolve,5));
  applyCommonChanges({commonUpserts:{days:[{date:'2026-10-01',intention:'Salvataggio confermato più recente',updatedAt:'2026-10-04T00:00:00.000Z'}]}});release(newer);await staleRead;
  check(state.days.find(row=>row.date==='2026-10-01').intention==='Salvataggio confermato più recente'&&(await repository.getMeta()).value.revision===localRevision,'obsolete RPC cannot overwrite save or publish cache');
  commonReadAt=0;catalogReadAt=0;let rejectRemote;
  globalThis.api=(name,...args)=>name==='getCommonState'?new Promise((resolve,reject)=>{rejectRemote=reject;}):previousApi(name,...args);
  const failed=ensureCommon().catch(error=>error);while(!content.querySelector('.common-local-preview'))await new Promise(resolve=>setTimeout(resolve,5));rejectRemote(Error('Synthetic offline'));check((await failed).message==='Synthetic offline'&&content.querySelector('.common-local-preview').textContent.includes('non riuscita'),'failed RPC leaves an explicitly unverified preview');
  globalThis.api=(name,...args)=>name==='getCommonState'?new Promise(resolve=>{release=resolve;}):previousApi(name,...args);
  const retried=ensureCommon();check(!content.querySelector('.common-local-preview'),'retry removes previous failed preview');while(!content.querySelector('.common-local-preview'))await new Promise(resolve=>setTimeout(resolve,5));check(content.querySelectorAll('.common-local-preview').length===1,'retry shows exactly one preview');release(newer);await retried;check(!content.querySelector('.common-local-preview'),'successful retry clears preview');
  globalThis.api=previousApi;commonViewCache=null;dailyDrafts.delete('2026-10-01:intention');repository.close();
 });
 await context.close();context=null;page=await launch();
 await page.evaluate(async()=>{
  const scope={archiveId:'synthetic-common-archive',principalId:'synthetic-common-principal-a',epoch:'synthetic-common-epoch',schemaVersion:1,protocolVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
  const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-common-cache-test-v1'}),cache=BulletJournalVue.createCommonReadCache({repository,identity,enabled:()=>true});
  const result=await cache.read({kind:'journal',month:'2026-10',today:'2026-10-28'});if(!result.ok||!result.hit||result.response.commonSlices.days.rows[0].intention!=='Riflessione 🌱'||!JSON.parse(result.response.commonSlices.days.rows[0].intentionRich)[0].runs[0].bold)throw Error('Common preview lost after browser restart');
  await repository.clearRemote();if((await cache.read({kind:'journal',month:'2026-10',today:'2026-10-28'})).hit||!(await repository.getDraft('daily','2026-10-01')).value)throw Error('Clear must remove preview but preserve draft');repository.close();
  if((await indexedDB.databases()).some(db=>db.name==='gdiary-local-v1'))throw Error('Real diary database opened');
 });
 assert.deepEqual(errors,[]);console.log('Common read cache: exact journal coverage/catalogs, atomic membership, rich/version roundtrip, privacy exclusion, CAS, quota rollback, independent page/common invalidation, missing/empty rows, draft preservation and browser restart OK');
}finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
