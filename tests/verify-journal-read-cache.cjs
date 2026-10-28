const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-journal-cache-'));
const server=http.createServer((req,res)=>{const file=req.url==='/Demo.html'?'Demo.html':req.url==='/Changelog.html'?'Changelog.html':null;if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));});
(async()=>{let context;const errors=[];try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
 async function launch(){context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);return page;}
 let page=await launch();
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);},api=window.BulletJournalVue;
  const A={archiveId:'synthetic-view-archive',principalId:'synthetic-view-principal-a',epoch:'synthetic-view-epoch',protocolVersion:1,schemaVersion:1},B={...A,principalId:'synthetic-view-principal-b'};
  let scope=A,allowed=true,ready=true;const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:ready})};
  const repository=api.createLocalRepository({identity,enabled:()=>allowed,databaseName:'gdiary-journal-cache-test-v1'}),cache=api.createJournalReadCache({repository,identity,enabled:()=>allowed,now:()=>1234});
  const request={month:'2026-10'},v1='2026-10-01T00:00:00.000Z',v2='2026-10-02T00:00:00.000Z';
  const rich=[{kind:'p',runs:[{text:'Caffè 🌱 <script>fittizio</script>',bold:true,color:'#123456'}]}];
  const response=(id='synthetic-note',version=v1)=>({month:'2026-10',total:1,nextCursor:'',nextEntry:null,contentsIncluded:true,performance:{traceId:'must-not-persist'},entries:[{id,type:'note',date:'2026-10-01',updatedAt:version,text:'Nota fittizia',projects:'',position:1,body:'Caffè 🌱 <script>fittizio</script>',rich,richUnsupported:false,editorAutoTitle:true}]});
  const save=async(value=response(),req=request)=>{const prepared=await cache.prepare(req);check(prepared.ok,'prepare');const result=await cache.save(prepared.ticket,value);check(result.ok,'save '+result.error);};
  check(!(await cache.read(request)).hit,'empty view miss');
  allowed=false;check((await cache.prepare(request)).error==='NotEnabledError','explicit opt-in');allowed=true;ready=false;check((await cache.prepare(request)).error==='IdentityError','identity gate');ready=true;
  for(const unsupported of [{month:'2026-13'},{month:'2026-10',taskOnly:true},{month:'2026-10',metadataOnly:true},{month:'2026-10',taskSnapshot:'ephemeral'},{month:'2026-10',context:{}}])check((await cache.prepare(unsupported)).error==='DataError','unsupported scope never shares page key');
  await save();let cached=await cache.read(request);check(cached.ok&&cached.hit&&cached.stale&&cached.savedAt===1234,'stale-labelled coherent page');
  check(cached.response.entries[0].rich[0].runs[0].bold&&cached.response.entries[0].editorAutoTitle&&!cached.response.performance,'rich flags roundtrip; no diagnostic metadata');
  check(!(await cache.read({month:'2026-11'})).hit&&!(await cache.read({month:'2026-10',project:'other'})).hit&&!(await cache.read({month:'2026-10',cursor:'other'})).hit,'exact month/project/cursor membership');
  const before=(await repository.getMeta()).value.revision;
  const stale=await cache.prepare(request);await repository.applyRemoteBatch({expectedRevision:before,entries:[{id:'synthetic-newer',updatedAt:v2,text:'Nuova modifica'}]});
  check((await cache.save(stale.ticket,response())).error==='ConflictError','late RPC cannot acquire new local checkpoint');
  check(!(await cache.read(request)).hit,'any remote mutation conservatively invalidates page coverage');
  check((await cache.save(stale.ticket,response())).error==='DataError','tickets single use');
  check((await cache.save({...stale.ticket},response())).error==='DataError','tickets cannot be forged');
  await save();
  const oldScope=await cache.prepare(request);scope=B;check(!(await cache.read(request)).hit,'principal isolation');check((await cache.save(oldScope.ticket,response())).error==='ScopeChangedError','principal switch before save');scope=A;
  await repository.putDraft({kind:'note',id:'synthetic-note',expectedRevision:0,baseVersion:v1,snapshot:{body:'Bozza non inviata'}});
  const malformed=[{...response(),contentsIncluded:false},{...response(),snapshotReset:'changed'},{...response(),month:'2026-11'},{...response(),nextCursor:'loop'}, {...response(),entries:[{...response().entries[0],editorError:'PRIVATE'}]}, {...response(),entries:[{...response().entries[0],updatedAt:'invalid'}]}, {...response(),entries:Array(26).fill(response().entries[0])}];
  for(const bad of malformed){const ticket=(await cache.prepare(request)).ticket;const result=await cache.save(ticket,bad);check(!result.ok&&!JSON.stringify(result).includes('PRIVATE'),'malformed/partial response fails closed');}
  check((await cache.read(request)).hit&&(await repository.getDraft('note','synthetic-note')).value.snapshot.body==='Bozza non inviata','failed cache writes preserve prior page and draft');
  // An abort after successful row put cannot publish page membership.
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){const req=put.call(this,value,...args);if(this.name==='entries'&&value.id==='abort-note')req.addEventListener('success',()=>this.transaction.abort());return req;};
  try{const ticket=(await cache.prepare(request)).ticket;check(!(await cache.save(ticket,response('abort-note'))).ok,'aborted view rejected');}finally{IDBObjectStore.prototype.put=put;}
  check((await cache.read(request)).response.entries[0].id==='synthetic-note','aborted replacement leaves complete previous page');
  // Render cached data before a deliberately suspended remote read. The cache
  // never has access to the dirty editor, and no remote ACK is emitted early.
  const events=[];let release;const remote=new Promise(resolve=>{release=resolve;});
  const loader=api.createJournalPageLoader({cache,fetchPage:()=>{events.push('fetch');return remote;}}),editor=document.createElement('textarea');editor.value='Bozza durante attesa';document.body.append(editor);editor.focus();editor.setSelectionRange(3,8);
  const loading=loader.load(request,{onCached:value=>{events.push('cached');check(value.stale,'preview stale');},onRemote:()=>events.push('remote')});
  while(!events.includes('cached'))await new Promise(resolve=>setTimeout(resolve,5));
  check(events.join(',')==='fetch,cached','cached preview precedes remote result while RPC already runs');editor.value='Bozza ancora più recente';editor.setSelectionRange(4,9);release(response('synthetic-note',v2));const loaded=await loading;check(loaded.outcome==='remote'&&(await loaded.persistence).ok,'remote delivered and background persistence commits');
  check(editor.value==='Bozza ancora più recente'&&editor.selectionStart===4&&document.activeElement===editor,'asynchronous cache does not touch editor/focus/selection');editor.remove();
  check((await repository.getDraft('note','synthetic-note')).value.snapshot.body==='Bozza non inviata','canonical cache update never alters draft baseline');
  let releaseCancelled;const pending=new Promise(resolve=>{releaseCancelled=resolve;});let delivered=0;const cancelled=api.createJournalPageLoader({cache,fetchPage:()=>pending});
  const cancelledRead=cancelled.load(request,{onRemote:()=>delivered++});await new Promise(resolve=>setTimeout(resolve,30));cancelled.cancel();releaseCancelled(response('must-not-persist'));check((await cancelledRead).outcome==='cancelled'&&delivered===0,'navigation cancellation ignores delayed response');
  let releaseRevoked,started;const begun=new Promise(resolve=>{started=resolve;});const revoked=api.createJournalPageLoader({cache,fetchPage:()=>{started();return new Promise(resolve=>{releaseRevoked=resolve;});}});
  const revokedRead=revoked.load(request,{onRemote:()=>delivered++});await begun;scope=B;releaseRevoked(response('must-not-cross'));check((await revokedRead).outcome==='cancelled'&&delivered===0,'identity revocation ignores delayed remote result');scope=A;
  const unavailable=api.createJournalPageLoader({cache:{prepare:async()=>({ok:false,error:'QuotaExceededError'})},fetchPage:async()=>response()});let fallback=false;check((await unavailable.load(request,{onRemote:()=>{fallback=true;}})).outcome==='remote'&&fallback,'cache failure falls back to normal RPC');
  const blockedPrepare=api.createJournalPageLoader({cache:{prepare:()=>new Promise(()=>{})},fetchPage:async()=>response()});
  const bounded=await Promise.race([blockedPrepare.load(request),new Promise(resolve=>setTimeout(()=>resolve({outcome:'test-timeout'}),1500))]);check(bounded.outcome==='remote','blocked checkpoint preparation has a short budget and falls back');
  const brokenStorage=api.createJournalPageLoader({cache:{prepare:request=>cache.prepare(request),read:()=>{throw Error('PRIVATE');},isCurrent:scope=>cache.isCurrent(scope),save:()=>{throw Error('PRIVATE');}},fetchPage:async()=>response('synthetic-note',v2)});
  const acknowledged=await brokenStorage.load(request);check(acknowledged.outcome==='remote'&&(await acknowledged.persistence).error==='StorageError','unexpected cache exceptions cannot annul a remote confirmation or leak text');
  let rejectOffline;const offline=api.createJournalPageLoader({cache,fetchPage:()=>new Promise((resolve,reject)=>{rejectOffline=reject;})});let preview=false,confirmed=false;
  const failed=offline.load(request,{onCached:()=>{preview=true;},onRemote:()=>{confirmed=true;}}).then(()=>null,error=>error);
  while(!preview)await new Promise(resolve=>setTimeout(resolve,5));rejectOffline(Error('Synthetic offline'));check((await failed).message==='Synthetic offline'&&preview&&!confirmed,'offline preview never becomes canonical confirmation');
  let releaseSlowCache;const slowRead=new Promise(resolve=>{releaseSlowCache=resolve;}),slow=api.createJournalPageLoader({cache:{prepare:request=>cache.prepare(request),read:()=>slowRead,isCurrent:scope=>cache.isCurrent(scope),save:(...args)=>cache.save(...args)},fetchPage:async()=>response('synthetic-note',v2)});let latePreview=0;
  const fastRemote=await slow.load(request,{onCached:()=>latePreview++});check(fastRemote.outcome==='remote','remote response never waits for slow IndexedDB read');await fastRemote.persistence;releaseSlowCache(await cache.read(request));await new Promise(resolve=>setTimeout(resolve,10));check(latePreview===0,'slow local preview cannot overwrite newer remote result');
  const overlays=api.createJournalPageLoader({cache,fetchPage:async()=>response('synthetic-note',v2)});
  const overlaid=await overlays.load(request,{onRemote:value=>{value.entries[0].body='Dirty editor overlay';value.entries[0].rich=[];}});await overlaid.persistence;
  check((await cache.read(request)).response.entries[0].body.startsWith('Caffè'),'UI overlays cannot contaminate the persisted canonical response');
  const empty={...response(),entries:[],total:0};await save(empty);check((await cache.read(request)).hit&&(await cache.read(request)).response.entries.length===0,'empty page explicitly covered');
  await save(response('synthetic-note',v2));repository.close();
 });
 await context.close();context=null;page=await launch();
 await page.evaluate(async()=>{
  const scope={archiveId:'synthetic-view-archive',principalId:'synthetic-view-principal-a',epoch:'synthetic-view-epoch',protocolVersion:1,schemaVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
  const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-journal-cache-test-v1'}),cache=BulletJournalVue.createJournalReadCache({repository,identity,enabled:()=>true});
  const cached=await cache.read({month:'2026-10'});if(!cached.ok||!cached.hit||cached.response.entries[0].updatedAt!=='2026-10-02T00:00:00.000Z'||cached.response.entries[0].rich[0].runs[0].color!=='#123456')throw Error('Persisted view not reconstructed after browser restart');
  const revision=(await repository.getMeta()).value.revision;await repository.applyRemoteBatch({expectedRevision:revision,deletedEntryIds:['synthetic-note']});if((await cache.read({month:'2026-10'})).hit||!(await repository.getDraft('note','synthetic-note')).value)throw Error('Deletion must invalidate page and preserve draft');repository.close();
  if((await indexedDB.databases()).some(db=>db.name==='gdiary-local-v1'))throw Error('Application database opened');
 });
 // Exercise the real shell bridge, while injecting only invented data into a
 // separate database. The production cache variable remains null by default.
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const scope={archiveId:'synthetic-shell-archive',principalId:'synthetic-shell-principal',epoch:'synthetic-shell-epoch',protocolVersion:1,schemaVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
  const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-journal-shell-test-v1'}),cache=BulletJournalVue.createJournalReadCache({repository,identity,enabled:()=>true});
  const version='2026-10-03T00:00:00.000Z',entry=(id,text,tags='')=>({id,date:'2026-10-01',type:'note',text,tags,projects:'',updatedAt:version,createdAt:version,position:1,body:text,rich:[{kind:'p',runs:[{text,bold:true}]}]}),request={month:'2026-10',project:'',cursor:'',taskOnly:false,taskArchive:false};
  const cachedPage={month:'2026-10',contentsIncluded:true,total:2,nextCursor:'',nextEntry:null,entries:[entry('synthetic-shell-note','Anteprima inventata <img src=x onerror=alert(1)>'),entry('synthetic-shell-private','Segreto fittizio da non mostrare','privato')]};
  const ticket=(await cache.prepare(request)).ticket;check((await cache.save(ticket,cachedPage)).ok,'shell fixture');
  const original=api;let release,started;const begin=new Promise(resolve=>{started=resolve;});
  api=(name,...args)=>name==='getJournalPage'?(started(),new Promise(resolve=>{release=resolve;})):original(name,...args);
  journalPageCache=cache;view='journal';taskDiary=false;continuousMode=true;continuousProject='';month='2026-10';continuousSession=null;dirtyMain=dirtyDetail=false;query='';state.settings.privateTags=['privato'];
  BulletJournalVue.unmount();const content=document.getElementById('content');content.replaceChildren();
  const loading=loadContinuous(content);await begin;while(!content.querySelector('.journal-local-preview'))await new Promise(resolve=>setTimeout(resolve,5));
  let preview=content.querySelector('.journal-local-preview');check(preview&&preview.textContent.includes('Anteprima inventata')&&!preview.textContent.includes('Segreto fittizio'),'shell preview with private entries excluded');
  check(!preview.querySelector('textarea,input,button,[contenteditable],img')&&!continuousSession.loaded&&continuousSession.blocks.length===0,'preview is inert text; never canonical editor state');
  const remote={...cachedPage,total:1,entries:[entry('synthetic-shell-note','Risposta Google simulata')]};release(remote);await loading;
  check(!content.querySelector('.journal-local-preview')&&continuousSession.loaded&&continuousSession.blocks[0].body==='Risposta Google simulata','remote result replaces preview with ordinary canonical session');
  const draft=continuousSession.blocks[0];draft.body='Bozza della scheda da conservare';draft.rich=[{kind:'p',runs:[{text:draft.body}]}];draft.dirty=true;continuousDraft();continuousSession=null;dirtyMain=dirtyDetail=false;
  // Allow the first canonical cache write to finish before beginning the next
  // read; the production UI intentionally does not wait for that write.
  await new Promise(resolve=>setTimeout(resolve,30));content.replaceChildren();
  api=(name,...args)=>name==='getJournalPage'?Promise.resolve({...remote,entries:[entry('synthetic-shell-note','Risposta successiva')] }):original(name,...args);
  await loadContinuous(content);
  check(continuousSession.blocks[0].body==='Bozza della scheda da conservare'&&continuousSession.blocks[0].dirty&&continuousSession.blocks[0].updatedAt===version,'session draft and original version survive the cache/remote path');
  draftRemove('continuous:'+continuousSession.key);
  api=original;journalPageCache=null;repository.close();
 });
 assert.deepEqual(errors,[]);console.log('Journal read cache: atomic page reconstruction, exact membership, CAS before RPC, malformed/aborted reads, scope isolation, stale preview, remote fallback/cancellation, draft preservation, browser restart and inert/privacy-safe shell preview OK');
}finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
