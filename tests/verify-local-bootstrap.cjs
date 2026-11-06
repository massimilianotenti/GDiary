const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-bootstrap-'));
const server=http.createServer((req,res)=>{
 if(req.url!=='/Demo.html'){res.writeHead(404).end();return;}
 const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('queueMicrotask(()=>{startApplication()', 'window.installBootstrapFixture?.();queueMicrotask(()=>{startApplication()');
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const url='http://127.0.0.1:'+server.address().port+'/Demo.html';
 const launch=()=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});
 context=await launch();let page=await context.newPage();await page.route('https://**/*',route=>route.abort());await page.goto(url);await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const scope={archiveId:'bootstrap-archive-001',principalId:'bootstrap-principal-001',epoch:'bootstrap-epoch-001',schemaVersion:1,protocolVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},date=captureToday();
  const cursor=sequence=>({format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence});
  const entries=['bootstrap-note','bootstrap-task','bootstrap-private','bootstrap-delete','bootstrap-empty'].map((id,index)=>({id,type:id==='bootstrap-task'?'task':'note',date,text:id,createdAt:date+'T08:00:00.000Z',updatedAt:'commit-1',contentVersion:id==='bootstrap-empty'?null:'page-content-'+('a'.repeat(64)),contentDigest:id==='bootstrap-empty'?null:'a'.repeat(64),tags:id==='bootstrap-private'?'segreto':'',projects:'',scope:'personal',status:id==='bootstrap-task'?'open':'',position:index+1}));
  entries.push({...entries[1],id:'bootstrap-task-other-month',date:shiftMonth(date.slice(0,7),-1)+'-15',plannedDate:date,workStart:'09:00',workEnd:'10:30',importance:'urgent'});
  const common={settings:[{id:'privacy',version:'privacy-v1',value:{privateTags:['segreto']}},{id:'reflection',version:'reflection-v1',value:{dailyReflectionMode:'essential'}}],goals:[{id:'bootstrap-goal',title:'Obiettivo dalla copia',target:'10',progress:'2',description:'Descrizione conservata',cycle:cycleFor(date),icon:'none',archived:false,updatedAt:'commit-1'}]};
  common.days=[{date,intention:'Intenzione dalla copia locale',intentionRich:[{kind:'p',runs:[{text:'Intenzione dalla copia locale',bold:true}]}],updatedAt:'commit-1'},{date:'2000-01-01',intention:'Storico fuori vista',updatedAt:'commit-1'}];
  common.habitLogs=[date,'2000-01-01'].map(day=>({key:'synthetic-habit|'+day,habitId:'synthetic-habit',date:day,status:'done',updatedAt:'commit-1'}));
  const changes=entries.map(entry=>({collection:'entries',id:entry.id,sequence:1,version:'commit-1',deleted:false,data:{format:'sync-entry/v1',record:entry}}));let pages=0;
  const call=async(method,payload)=>{
   if(method==='getSyncManifest')return {identityVerified:true,...scope,capabilities:{changes:true,localReadCache:true}};
   if(method==='getSyncCheckpoint')return {cursor:cursor(1),highWater:1};
   if(method==='getSnapshotPage'){
    const rows=(payload.collection==='entries'?entries:common[payload.collection]||[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))),after=payload.afterId===undefined?0:rows.findIndex(row=>row.id===payload.afterId)+1,records=rows.slice(after,after+2),hasMore=after+records.length<rows.length;
    if(++pages>20)throw Error('snapshot did not terminate');
    return {collection:payload.collection,checkpoint:payload.cursor,observedCursor:cursor(1),records,hasMore,nextAfter:hasMore?records.at(-1).id:null,coverage:{total:rows.length,canonical:rows.length,complete:true}};
   }
   if(method==='getChanges')return {cursor:cursor(1),highWater:1,commits:payload.cursor.sequence<1?[{sequence:1,changes}]:[],hasMore:false};
   if(method==='getContentsBatch')return {items:payload.items.map(item=>({...item,content:{version:item.version,body:'Corpo '+item.id,rich:[{kind:'p',runs:[{text:'Corpo '+item.id,bold:true}]}]}}))};
   throw Error('unexpected '+method);
  };
  const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-bootstrap-test'}),consumer=BulletJournalVue.createSyncConsumer({repository,identity,enabled:()=>true,call});
  const boot=await consumer.bootstrap();check(boot.ok&&boot.value.complete,'paginated complete bootstrap '+JSON.stringify(boot));check(pages===12,'three entry pages and nine other collections');
  const read=await repository.readBootstrapView({month:date.slice(0,7)});check(read.ok&&read.value?.entries.length===6,'finished snapshot is atomically readable');
  check(read.value.entries.find(row=>row.id==='bootstrap-empty').body==='','explicit null pointer is a complete empty body');
  const transaction=IDBDatabase.prototype.transaction,transactions=[];
  IDBDatabase.prototype.transaction=function(names,mode,...args){transactions.push({names:[...names].sort(),mode});return transaction.call(this,names,mode,...args);};
  try{check((await repository.readBootstrapView({month:date.slice(0,7)})).value?.entries.length===6,'atomic repeat read');}finally{IDBDatabase.prototype.transaction=transaction;}
  check(transactions.length===1&&transactions[0].mode==='readonly'&&transactions[0].names.join(',')==='archiveMeta,commonRecords,contents,drafts,entries,outbox','one transaction for the whole bootstrap view');

  const snapshot={...entries.find(entry=>entry.id==='bootstrap-delete'),deleted:true},operationId='bootstrap-local-delete';
  check((await repository.saveLocalOperation({operationId,kind:'note',id:snapshot.id,action:'delete',baseVersion:'commit-1',expectedRevision:0,payload:{id:snapshot.id,operationId,baseVersion:'commit-1'},snapshot,dependencies:[]})).ok,'pending deletion');
  check((await repository.readBootstrapView({month:date.slice(0,7)})).value?.operations.some(row=>row.operationId===operationId),'draft-only revision retains a finished read checkpoint');
  const restored={...continuousBlock({...entries[0],body:'Bozza persistente prima del riavvio',rich:[{kind:'p',runs:[{text:'Bozza persistente prima del riavvio'}]}]}),dirty:true};
  check((await repository.putDraft({kind:localDraftKind(),id:'continuous:'+date.slice(0,7),expectedRevision:0,baseVersion:'commit-1',snapshot:{blocks:[restored]}})).ok,'durable session draft seeded');
  await repository.setLocalConsent(true);localStorage.setItem(LOCAL_CACHE_OPT_IN_KEY,'enabled');repository.close();
 });
 await context.close();context=null;
 context=await launch();page=await context.newPage();await page.route('https://**/*',route=>route.abort());
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.addInitScript(()=>{
  window.installBootstrapFixture=()=>{
   const scope={archiveId:'bootstrap-archive-001',principalId:'bootstrap-principal-001',epoch:'bootstrap-epoch-001',schemaVersion:1,protocolVersion:1},manifest={identityVerified:true,...scope,protocolVersion:1,schemaVersion:1,minClientProtocol:1,capabilities:{changes:true,localReadCache:true,operations:false}};
   const real=BulletJournalVue,original=api;window.bootstrapRPC=[];window.bootstrapHead=1;window.bootstrapFailBodies=false;
   window.bootstrapCursor=sequence=>({format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence});
   window.BulletJournalVue={...real,createLocalRepository:options=>real.createLocalRepository({...options,databaseName:'gdiary-bootstrap-test'})};
   api=async(name,payload)=>{
    bootstrapRPC.push(name);
    if(name==='getSyncManifest')return new Promise(resolve=>window.releaseBootstrapIdentity=()=>resolve(manifest));
    if(name==='getSyncCheckpoint'){
     if(bootstrapHead===1)return new Promise((resolve,reject)=>window.rejectBootstrapBackground=reject);
     return {cursor:bootstrapCursor(bootstrapHead),highWater:bootstrapHead};
    }
    if(name==='getChanges')return {cursor:bootstrapCursor(2),highWater:2,hasMore:false,commits:payload.cursor.sequence<2?[{sequence:2,changes:[
     {collection:'entries',id:'bootstrap-task',sequence:2,version:'commit-2',deleted:true},
     {collection:'entries',id:'bootstrap-private',sequence:2,version:'commit-2',deleted:false,data:{format:'sync-entry/v1',record:{id:'bootstrap-private',type:'note',date:captureToday(),text:'bootstrap-private',updatedAt:'commit-2',contentVersion:'page-content-'+('b'.repeat(64)),contentDigest:'b'.repeat(64),tags:'segreto',projects:'',scope:'personal'}}}
    ]}]:[]};
    if(name==='getContentsBatch'){
     if(bootstrapFailBodies)throw Error('body transport unavailable');
     return {items:payload.items.map(item=>({...item,content:{version:item.version,body:'Corpo aggiornato dal feed',rich:[{kind:'p',runs:[{text:'Corpo aggiornato dal feed'}]}]}}))};
    }
    if(name==='getState'||name==='getJournalPage')throw Error('unexpected foreground diary RPC');
    return original(name,payload);
   };
  };
 });
 await page.goto(url);await page.waitForFunction(()=>typeof releaseBootstrapIdentity==='function');
 assert.equal(await page.locator('[data-client-id="bootstrap-note"]').count(),0,'identity must be verified before opening diary');
 await page.evaluate(()=>releaseBootstrapIdentity());
 await page.waitForFunction(()=>continuousSession?.localBootstrap&&continuousSession.loaded);
 assert.deepEqual(await page.evaluate(()=>({complete:continuousSession.complete,busy,privateVisible:!!document.querySelector('[data-client-id="bootstrap-private"]'),deleted:continuousSession.blocks.some(b=>b.id==='bootstrap-delete'),rpcs:bootstrapRPC.filter(name=>['getState','getJournalPage'].includes(name)),settings:state.settings.privateTags})),{complete:true,busy:false,privateVisible:false,deleted:false,rpcs:[],settings:['segreto']});
 assert.deepEqual(await page.evaluate(()=>state.taskPlans.find(plan=>plan.entryId==='bootstrap-task-other-month')),{entryId:'bootstrap-task-other-month',date:await page.evaluate(()=>captureToday()),workStart:'09:00',workEnd:'10:30',importance:'urgent',updatedAt:'commit-1'},'monthly bootstrap preserves planning for tasks recorded in another month');
 assert.equal(await page.evaluate(()=>commonScope.kind==='journal'&&state.commonScope.month===month&&commonScope.today===captureToday()&&state.days.length===1&&state.days[0].date===captureToday()&&state.days[0].intentionRich[0].runs[0].bold&&state.habitLogs.length===1&&state.habitLogs[0].date===captureToday()),true,'monthly shell applies bounded common data and explicit coverage');
 assert.equal(await page.getByText('Obiettivo dalla copia',{exact:true}).count(),1);
 await page.evaluate(async()=>{view='week';window.slowRemoteWeekOpened=await run('getState');view='journal';await run('getState');});
 assert.equal(await page.evaluate(()=>slowRemoteWeekOpened&&continuousSession.localBootstrap&&bootstrapRPC.includes('getSyncCheckpoint')&&!busy&&!bootstrapRPC.includes('getState')),true,'navigation works while background transport is held indefinitely');
 const editor=page.locator('[data-client-id="bootstrap-note"] .rich-area');assert.equal(await editor.textContent(),'Bozza persistente prima del riavvio','migrated session draft survives activation finalization');await editor.fill('Bozza dopo riavvio');await editor.focus();
 await page.evaluate(()=>{
  window.bootstrapEditor=document.activeElement;
  const text=document.createTreeWalker(bootstrapEditor,NodeFilter.SHOW_TEXT).nextNode(),range=document.createRange();range.setStart(text,6);range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);
  rejectBootstrapBackground(Error('offline'));
 });
 await page.evaluate(()=>localSyncTimer.idle());
 assert.equal(await page.evaluate(()=>localCacheEnabled&&document.activeElement===bootstrapEditor&&getSelection().anchorOffset===6&&bootstrapEditor.textContent==='Bozza dopo riavvio'),true);
 await page.evaluate(async()=>{localSyncTimer.stop();bootstrapHead=2;bootstrapFailBodies=true;window.failedBootstrapRefresh=await refreshLocalBootstrap();});
 assert.equal(await page.evaluate(()=>failedBootstrapRefresh),false);
 assert.equal(await page.evaluate(async()=>{const snapshot=await localRepository.readBootstrapView({month});return snapshot.ok&&snapshot.value===null;}),true,'interrupted hydration must not publish a usable checkpoint');
 assert.equal(await editor.textContent(),'Bozza dopo riavvio');
 await page.evaluate(async()=>{bootstrapFailBodies=false;window.finishedBootstrapRefresh=await refreshLocalBootstrap();});
 assert.equal(await page.evaluate(()=>finishedBootstrapRefresh&&continuousSession.localBootstrapVerified&&!continuousSession.blocks.some(b=>b.id==='bootstrap-task')),true);
 assert.equal(await page.evaluate(()=>document.activeElement===bootstrapEditor&&getSelection().anchorOffset===6&&bootstrapEditor.textContent==='Bozza dopo riavvio'&&continuousSession.blocks.find(b=>b.id==='bootstrap-note').updatedAt==='commit-1'),true,'hydration retry and tombstone keep the dirty editor and baseline');
 await page.evaluate(async()=>{archiveIdentityStatus.operationsReady=true;await saveContinuous();});
 assert.equal(await page.evaluate(async()=>{const row=(await localRepository.listActiveEntityOutbox({kind:'note',id:'bootstrap-note'})).value[0];return row?.baseVersion==='commit-1'&&row.payload.body==='Bozza dopo riavvio';}),true);
 await page.evaluate(async()=>{await $('refresh').onclick();});
 assert.equal(await page.evaluate(()=>continuousSession.localBootstrapVerified),true,'Aggiorna refreshes the consumer without discarding its session');
 await page.evaluate(async()=>{
  const original=localRepository;let first=true;
  localRepository={...original,readBootstrapView:async request=>{const result=await original.readBootstrapView(request);if(first){first=false;await new Promise(resolve=>window.releaseDelayedBootstrap=resolve);}return result;}};
  window.restoreBootstrapRepository=()=>{localRepository=original;};
  window.delayedBootstrapNavigation=run('getState');
 });
 await page.waitForFunction(()=>typeof releaseDelayedBootstrap==='function');
 await page.evaluate(()=>{month=shiftMonth(month,1);window.emptyBootstrapMonth=month;run('getState');});
 await page.waitForFunction(()=>continuousSession?.month===emptyBootstrapMonth&&continuousSession.localBootstrap);
 assert.equal(await page.evaluate(()=>continuousSession.complete&&continuousSession.blocks.length===0),true,'a cached empty month is complete');
 assert.equal(await page.evaluate(()=>state.taskPlans.some(plan=>plan.entryId==='bootstrap-task-other-month')&&!state.taskPlans.some(plan=>plan.entryId==='bootstrap-task')),true,'empty-month navigation preserves archive planning and removes feed tombstones');
 await page.evaluate(async()=>{releaseDelayedBootstrap();await delayedBootstrapNavigation;restoreBootstrapRepository();});
 assert.equal(await page.evaluate(()=>!bootstrapRPC.includes('getState')),true,'a cancelled local navigation must not start a stale foreground RPC');
 await page.evaluate(()=>go('tasks'));
 await page.waitForFunction(()=>taskDiary&&continuousSession?.key==='tasks:archive');
 assert.equal(await page.evaluate(()=>continuousSession.localBootstrap&&continuousSession.complete&&!bootstrapRPC.some(name=>['getState','getJournalPage'].includes(name))),true,'task navigation reuses the complete checkpoint');
 // Complete period views reuse the same checkpoint, never independent previews.
 await page.evaluate(async()=>{
  localSyncTimer.stop();await localSyncTimer.idle();dirtyMain=false;dirtyDetail=false;
  const meta=(await localRepository.getMeta()).value,date=captureToday(),start=monday(date);
  const written=await localRepository.applyRemoteBatch({expectedRevision:meta.revision,commonUpserts:{
   weeks:[{week:start,focus:'Focus locale completo',priorities:'',wins:'',obstacles:'',lessons:'',next:'',energy:'3',closed:'no',updatedAt:'commit-2'}],
   habits:[{id:'synthetic-habit',goalId:'bootstrap-goal',title:'Pratica locale',start:dateAdd(date,-30),days:'0,1,2,3,4,5,6',archived:'no',updatedAt:'commit-2'}]
  }});if(!written.ok)throw Error(written.error);await localRepository.markReadCheckpoint(written.value.revision);
  week=start;day=date;view='week';window.periodOpened=await openLocalPeriodBootstrap();
 });
 assert.equal(await page.evaluate(()=>periodOpened&&localPeriodBootstrap.view==='week'&&commonScope.kind==='week'&&state.weeks[0].focus==='Focus locale completo'),true);
 assert.equal(await page.evaluate(()=>state.settings.privateTags.join(',')==='segreto'&&!document.querySelector('.entry[data-id="bootstrap-private"]')),true,'weekly copy retains custom privacy and hides private notes');
 const weekFocus=page.locator('form[data-week] textarea').first();assert.equal(await weekFocus.inputValue(),'Focus locale completo');
 await weekFocus.fill('Bozza settimana conservata');
 await page.evaluate(()=>{window.periodEditor=document.activeElement;periodEditor.setSelectionRange(4,8);});
 await page.evaluate(async()=>{const meta=(await localRepository.getMeta()).value;const changed=await localRepository.applyRemoteBatch({expectedRevision:meta.revision,commonUpserts:{weeks:[{...state.weeks[0],focus:'Nuovo focus remoto',updatedAt:'commit-3'}]}});await localRepository.markReadCheckpoint(changed.value.revision);await openLocalPeriodBootstrap({verified:true});});
 assert.equal(await page.evaluate(()=>document.activeElement===periodEditor&&periodEditor.selectionStart===4&&periodEditor.value==='Bozza settimana conservata'&&periodEditor.closest('form').dataset.version==='commit-2'),true,'late delta preserves mounted weekly draft and original baseline');
 await page.evaluate(async()=>{const consumer=localSearchConsumer;localSearchConsumer={sync:async()=>({ok:false,error:'SyntheticNetworkError'})};window.periodRefreshFailed=await refreshLocalBootstrap();localSearchConsumer=consumer;});
 assert.equal(await page.evaluate(()=>!periodRefreshFailed&&document.activeElement===periodEditor&&periodEditor.value==='Bozza settimana conservata'),true,'period refresh error preserves editor and retry remains available');
 await page.evaluate(async()=>{const consumer=localSearchConsumer;localSearchConsumer={sync:async()=>({ok:true,value:{}})};window.periodRetry=await refreshLocalBootstrap();localSearchConsumer=consumer;});
 assert.equal(await page.evaluate(()=>periodRetry&&document.activeElement===periodEditor&&periodEditor.closest('form').dataset.version==='commit-2'),true,'successful retry preserves the modified period form');

 await page.evaluate(async()=>{dirtyMain=false;view='habits';window.habitsOpened=await openLocalPeriodBootstrap();});
 assert.equal(await page.evaluate(()=>habitsOpened&&commonScope.kind==='habits'&&commonScope.date===day&&state.habits[0].title==='Pratica locale'),true);
 await page.evaluate(async()=>{dirtyMain=false;window.changedLocalHabitPeriod=await changeHabitPeriod({date:dateAdd(day,14)});});
 assert.equal(await page.evaluate(()=>changedLocalHabitPeriod&&commonScope.date===day&&state.habitLogs.length===1),true,'habit day and selected tracker week have independent exact ranges');
 await page.evaluate(async()=>{dirtyMain=false;view='week';week=dateAdd(week,7);window.nextLocalWeek=await openLocalPeriodBootstrap();});
 assert.equal(await page.evaluate(()=>nextLocalWeek&&commonScope.week===week&&state.weeks.length===0),true,'an empty covered week is complete');
 await page.evaluate(async()=>{
  const repository=localRepository;let release;
  localRepository={...repository,readBootstrapView:async request=>{const read=await repository.readBootstrapView(request);await new Promise(resolve=>release=resolve);return read;}};
  window.periodRace=openLocalPeriodBootstrap();while(!release)await new Promise(resolve=>setTimeout(resolve,1));
  week=dateAdd(week,7);release();window.periodRaceResult=await periodRace;localRepository=repository;
 });
 assert.equal(await page.evaluate(()=>periodRaceResult),false,'late period read rejected after navigation');
 await page.evaluate(async()=>{
  const repository=localRepository;let release;
  localRepository={...repository,readBootstrapView:async request=>{const read=await repository.readBootstrapView(request);await new Promise(resolve=>release=resolve);return read;}};
  window.periodRace=openLocalPeriodBootstrap();while(!release)await new Promise(resolve=>setTimeout(resolve,1));localCacheEnabled=false;release();window.periodRevoked=await periodRace;localCacheEnabled=true;localRepository=repository;
 });
 assert.equal(await page.evaluate(()=>periodRevoked),false,'revoked consent prevents period application');
 await page.reload();await page.waitForFunction(()=>typeof releaseBootstrapIdentity==='function');await page.evaluate(()=>releaseBootstrapIdentity());await page.waitForFunction(()=>continuousSession?.localBootstrap&&continuousSession.loaded);
 await page.evaluate(async()=>{dirtyMain=false;view='week';week=monday(captureToday());window.weekAfterReload=await openLocalPeriodBootstrap();});
 assert.equal(await page.evaluate(()=>weekAfterReload&&state.weeks[0].updatedAt==='commit-3'&&document.querySelector('form[data-week] textarea').value==='Bozza settimana conservata'&&document.querySelector('form[data-week]').dataset.version==='commit-2'),true,'restart restores current canonical week and persisted draft with its original baseline');
 await page.evaluate(()=>{dirtyMain=false;});
 assert.equal(await page.evaluate(()=>!bootstrapRPC.some(name=>['getState','getJournalPage','getCommonState'].includes(name))),true,'complete periods do not require foreground RPC');
 await page.evaluate(async()=>{await localRepository.invalidateReadCheckpoint();window.incompletePeriod=await openLocalPeriodBootstrap();});
 assert.equal(await page.evaluate(()=>incompletePeriod),false,'incomplete checkpoint never becomes a complete period');
 await page.evaluate(async()=>{window.periodFallback=await run('getState');});
 assert.equal(await page.evaluate(()=>!periodFallback&&bootstrapRPC.includes('getState')),true,'incomplete period uses the ordinary remote fallback and reports its failure');

 await page.evaluate(async()=>{
  const meta=(await localRepository.getMeta()).value,entries=Array.from({length:125},(_,i)=>({id:'window-task-'+String(i).padStart(3,'0'),type:'task',text:'Task finestra '+i,date:captureToday(),status:'open',projects:'',tags:'',updatedAt:'commit-4',contentVersion:null}));
  const result=await localRepository.applyRemoteBatch({expectedRevision:meta.revision,entries});if(!result.ok)throw Error(result.error);await localRepository.markReadCheckpoint(result.value.revision);
  dirtyMain=false;dirtyDetail=false;view='journal';taskDiary=true;continuousSession=null;taskFilters={status:'open',period:'archive',project:'',tag:'',text:'',sort:'priority'};await openLocalBootstrap();
 });
 await page.waitForFunction(()=>document.querySelectorAll('.diary-task-results .continuous-block').length===50);
 assert.equal(await page.evaluate(()=>continuousSession.blocks.filter(row=>row.type==='task').length>=125),true,'all results remain in the session');
 await page.getByRole('button',{name:'Mostra altri task',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.diary-task-results .continuous-block').length===100);
 const windowTitle=page.locator('.diary-task-results .continuous-title').nth(90);await windowTitle.fill('Bozza task oltre la prima finestra');
 await page.evaluate(()=>{window.windowEditor=document.activeElement;windowEditor.setSelectionRange(3,7);changeTaskFilter('status','done');});
 assert.equal(await page.evaluate(()=>document.activeElement===windowEditor&&windowEditor.selectionStart===3&&windowEditor.value==='Bozza task oltre la prima finestra'&&continuousSession.blocks.find(row=>row.title==='Bozza task oltre la prima finestra').updatedAt==='commit-4'),true,'filter reset keeps an edited task outside the first window mounted');
 await page.evaluate(async()=>{archiveIdentityStatus.operationsReady=true;await saveContinuous();});
 assert.equal(await page.evaluate(async()=>{const block=continuousSession.blocks.find(row=>row.title==='Bozza task oltre la prima finestra'),outbox=await localRepository.listActiveEntityOutbox({kind:'task',id:block.id});return outbox.value.some(row=>row.baseVersion==='commit-4'&&row.payload.title===block.title);}),true,'save includes the edited task outside the initial window');
 await page.evaluate(async()=>{
  // Exercise the real API wrapper against Demo's simulated backend. Even an
  // uncertain/rejected mutation must prevent reopening the old ready marker.
  try{await api('savePrivacySettings',{privateTags:['segreto','nuovo-privato'],version:'deliberately-stale'});}catch{}
 });
 assert.equal(await page.evaluate(async()=>{const read=await localRepository.readBootstrapView({month});return read.ok&&read.value===null&&localBootstrapWrites===0;}),true,'a foreground write invalidates cached readiness');
 assert.deepEqual(pageErrors,[]);
 console.log('Complete local bootstrap and period views (restart/drafts/races/coverage) plus bounded Task editors (expand/filter/save): paginated snapshot terminates, browser restart, verified identity, complete common state, private tags, empty body, atomic outbox deletion, no foreground diary RPC, failed hydration checkpoint, feed tombstone, focus/selection/draft and original baseline OK.');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
