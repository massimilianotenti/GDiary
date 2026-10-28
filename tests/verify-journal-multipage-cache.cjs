const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-multipage-'));
const server=http.createServer((req,res)=>{const file=req.url==='/Demo.html'?'Demo.html':req.url==='/Changelog.html'?'Changelog.html':null;if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));});
(async()=>{let context;const errors=[];try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
 async function launch(){context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());await page.goto(origin+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);return page;}
 let page=await launch();
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);},modules=BulletJournalVue;
  const A={archiveId:'synthetic-multipage-archive',principalId:'synthetic-multipage-principal',epoch:'synthetic-multipage-epoch',schemaVersion:1,protocolVersion:1};let scope=A,timestamp=1000;
  const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},repository=modules.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-multipage-test-v1'}),cache=modules.createJournalReadCache({repository,identity,enabled:()=>true,now:()=>++timestamp});
  const v='2026-10-01T00:00:00.000Z',request=(cursor='',month='2026-10',project='')=>({month,project,cursor});
  const row=(i,month='2026-10',project='')=>({id:'synthetic-'+month+'-'+project+'-'+i,type:'note',date:month+'-01',createdAt:v,updatedAt:v,position:i,text:'Nota inventata '+i,projects:project,body:'Corpo inventato '+i,rich:[{kind:'p',runs:[{text:'Corpo inventato '+i,bold:true}]}],tags:i===25?'privato':''});
  const pageOf=(start,count,total=60,month='2026-10',project='')=>({month,total,contentsIncluded:true,nextCursor:start+count<total?row(start+count-1,month,project).id:'',nextEntry:start+count<total?{date:month+'-01',position:start+count}:null,entries:Array.from({length:count},(_,i)=>row(start+i,month,project))});
  const save=async(req,response)=>{const prepared=await cache.prepare(req);check(prepared.ok,'prepare '+prepared.error);const saved=await cache.save(prepared.ticket,response);check(saved.ok,'save '+saved.error);};
  const first=pageOf(0,25),second=pageOf(25,25),third=pageOf(50,10),next=request(first.nextCursor),last=request(second.nextCursor);
  await save(request(),first);await save(next,second);await save(last,third);
  for(const [req,count]of [[request(),25],[next,25],[last,10]]){const read=await cache.read(req);check(read.ok&&read.hit&&read.response.entries.length===count,'all acquired pages remain available');}
  check(!(await cache.read(request('unfetched-cursor'))).hit,'unfetched page is a miss, never a complete empty page');
  check((await cache.read(request())).response.total===60&&(await cache.read(request())).response.nextCursor===first.nextCursor,'first page remains partial after later pages');
  let reads=0;const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(...args){if(['entries','contents'].includes(this.name))reads++;return get.apply(this,args);};
  try{check((await cache.read(request())).hit&&reads===50,'only 25 metadata/body pairs read, not entire cached archive');}finally{IDBObjectStore.prototype.get=get;}
  scope={...A,principalId:'synthetic-multipage-other-principal'};check(!(await cache.read(request())).hit,'multi-page principal isolation');scope=A;
  await save(request('', '2026-11'),pageOf(0,1,1,'2026-11'));check((await cache.read(request())).hit,'different month acquisition preserves first page');
  await save(request('', '2026-10','progetto'),pageOf(0,1,1,'2026-10','progetto'));check((await cache.read(next)).hit&&!(await cache.read(request(first.nextCursor,'2026-10','progetto'))).hit,'project and cursor cannot share a page');
  // Common-only writes forward each currently valid page descriptor.
  let revision=(await repository.getMeta()).value.revision;await repository.applyRemoteBatch({expectedRevision:revision,commonUpserts:{days:[{date:'2026-10-01',updatedAt:v,intention:'Intenzione inventata'}]}});
  check((await cache.read(request())).hit&&(await cache.read(next)).hit&&(await cache.read(last)).hit,'common writes preserve all valid note pages');
  const stale=await cache.prepare(next),{body:ignoredBody,rich:ignoredRich,...changedMetadata}=row(0);revision=(await repository.getMeta()).value.revision;check((await repository.applyRemoteBatch({expectedRevision:revision,entries:[{...changedMetadata,updatedAt:'2026-10-02T00:00:00.000Z'}]})).ok,'synthetic metadata mutation');
  check((await cache.save(stale.ticket,second)).error==='ConflictError'&&!(await cache.read(next)).hit,'mutation invalidates all page proofs and stale ticket cannot revive them');
  // Restore new acquisition; no downgrade of the known newer first record.
  first.entries[0].updatedAt='2026-10-02T00:00:00.000Z';await save(request(),first);await save(next,second);await save(last,third);
  await save(request(),first);check((await cache.read(next)).hit&&(await cache.read(last)).hit,'unchanged first page preserves continuation previews');
  first.entries[0].updatedAt='2026-10-03T00:00:00.000Z';await save(request(),first);check((await cache.read(request())).hit&&!(await cache.read(next)).hit&&!(await cache.read(last)).hit,'changed first page invalidates same-period continuations');
  await save(next,{...second,total:61});check(!(await cache.read(request())).hit&&(await cache.read(next)).hit,'changed total discards older same-period pages');
  await save(request(),first);
  const overlapping={...second,entries:[first.entries[0],...second.entries.slice(1)]};await save(next,overlapping);check(!(await cache.read(request())).hit,'overlapping identities invalidate older pages even at same content version');
  // Eviction is bounded by acquisitions, not reads; never delete a draft or
  // canonical content just to remove its page descriptor.
  await repository.putDraft({kind:'note',id:'retained-draft',expectedRevision:0,baseVersion:v,snapshot:{body:'Bozza fuori indice'}});
  await repository.clearRemote();
  for(let i=0;i<18;i++)await save(request('', '2026-10','project-'+i),pageOf(0,1,1,'2026-10','project-'+i));
  const index=(await repository.getMeta()).value.coverage.journalPages;
  check(index.pages.length===16&&!(await cache.read(request('', '2026-10','project-0'))).hit&&!(await cache.read(request('', '2026-10','project-1'))).hit,'descriptor cap 16 evicts oldest acquisitions');
  check((await repository.getEntry(row(0,'2026-10','project-0').id)).value&&(await repository.getDraft('note','retained-draft')).value,'eviction preserves data and drafts');
  await cache.read(request('', '2026-10','project-2'));await save(request('', '2026-10','project-18'),pageOf(0,1,1,'2026-10','project-18'));
  check(!(await cache.read(request('', '2026-10','project-2'))).hit,'reading a descriptor does not write an access-time transaction');
  await save(request('', '2026-10','project-3'),pageOf(0,1,1,'2026-10','project-3'));await save(request('', '2026-10','project-19'),pageOf(0,1,1,'2026-10','project-19'));
  check((await cache.read(request('', '2026-10','project-3'))).hit&&!(await cache.read(request('', '2026-10','project-4'))).hit,'refreshed acquisition moves to newest slot');
  // Rollback must retain the complete index as well as all old members.
  const before=JSON.stringify((await repository.getMeta()).value.coverage),put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){const req=put.call(this,value,...args);if(this.name==='entries'&&value.id.includes('aborted-project'))req.addEventListener('success',()=>this.transaction.abort());return req;};
  try{const prepared=await cache.prepare(request('', '2026-10','aborted-project'));check(!(await cache.save(prepared.ticket,pageOf(0,1,1,'2026-10','aborted-project'))).ok,'aborted acquisition rejected');}finally{IDBObjectStore.prototype.put=put;}
  check(JSON.stringify((await repository.getMeta()).value.coverage)===before,'failed acquisition cannot evict a descriptor');
  await repository.clearRemote();await save(request(),first);await save(next,second);await save(last,third);repository.close();
  // Upgrade only cache descriptors from the preceding source release, without
  // altering schema, user drafts or source metadata.
  const legacy=modules.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-multipage-legacy-v1'}),old=modules.createJournalReadCache({repository:legacy,identity,enabled:()=>true});
  const legacyFirst=pageOf(0,1,2),{body,rich,...entry}=legacyFirst.entries[0];
  await legacy.applyRemoteBatch({expectedRevision:0,entries:[entry],contents:[{id:entry.id,version:entry.updatedAt,body,rich}],coverage:{journalPage:{format:'journal-page/v1',key:JSON.stringify(request()),revision:1,savedAt:10,payload:{...legacyFirst,entries:undefined},items:[{id:entry.id,version:entry.updatedAt}]}}});
  check((await old.read(request())).hit,'legacy single-page descriptor still readable');
  const legacyNext=request(legacyFirst.nextCursor),prepared=await old.prepare(legacyNext);check((await old.save(prepared.ticket,pageOf(1,1,2))).ok&&(await old.read(request())).hit&&(await old.read(legacyNext)).hit,'legacy descriptor carried into bounded page index atomically');
  const metadata=(await legacy.getMeta()).value;check(metadata.schemaVersion===1&&metadata.coverage.journalPage===null&&metadata.coverage.journalPages.pages.length===2,'no database schema reset for migration');
  await legacy.applyRemoteBatch({expectedRevision:metadata.revision,coverage:{journalPages:{format:'unsupported-future',pages:[]}}});check((await old.read(request())).error==='SchemaError'&&(await old.prepare(request())).error==='SchemaError','future index fails closed without deletion');legacy.close();
 });
 await context.close();context=null;page=await launch();
 await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);},wait=async predicate=>{const deadline=Date.now()+3000;while(!predicate()){if(Date.now()>deadline)throw Error('Synthetic UI wait expired');await new Promise(resolve=>setTimeout(resolve,5));}};
  const scope={archiveId:'synthetic-multipage-archive',principalId:'synthetic-multipage-principal',epoch:'synthetic-multipage-epoch',schemaVersion:1,protocolVersion:1},identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
  const repository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'gdiary-multipage-test-v1'}),cache=BulletJournalVue.createJournalReadCache({repository,identity,enabled:()=>true}),request={month:'2026-10',project:'',cursor:''};
  const first=await cache.read(request),second=await cache.read({...request,cursor:first.response.nextCursor}),third=await cache.read({...request,cursor:second.response.nextCursor});
  check(first.hit&&second.hit&&third.hit&&third.response.entries.length===10,'all three pages survive actual browser restart');
  const original=api;let release,calls=0;
  api=(name,...args)=>name==='getJournalPage'?(calls++,new Promise(resolve=>{release=resolve;})):original(name,...args);
  journalPageCache=cache;view='journal';taskDiary=false;continuousMode=true;continuousProject='';month='2026-10';continuousSession=null;dirtyMain=dirtyDetail=false;query='';state.settings.privateTags=['privato'];state.entries=[];
  BulletJournalVue.unmount();const content=document.getElementById('content');content.replaceChildren();const loading=loadContinuous(content);await wait(()=>content.querySelector('.journal-local-preview'));
  check(content.querySelectorAll('.journal-local-preview article').length===25&&!continuousSession.loaded,'first page preview before remote response');release(first.response);await loading;
  // An unchanged first page keeps the old continuation available as a stale
  // preview, without treating multiple independent RPCs as one snapshot.
  await new Promise(resolve=>setTimeout(resolve,30));const next={...request,cursor:first.response.nextCursor};check((await cache.read(next)).hit,'unchanged first response keeps persisted continuation');
  const selector='.continuous-block[data-client-id="'+first.response.entries[0].id+'"] .rich-area',editor=content.querySelector(selector);check(editor,'first editor mounted');editor.focus();
  const more=loadContinuous(content,true);await wait(()=>content.querySelector('.journal-local-preview'));
  check(content.querySelector(selector)===editor&&continuousSession.blocks.filter(block=>block.id).length===25,'continuation preview does not replace existing editors or canonical membership');
  check(content.querySelectorAll('.journal-local-preview article').length===24&&!content.querySelector('.journal-local-preview').textContent.includes('Nota inventata 25'),'private continuation entry excluded');
  editor.textContent='Bozza durante seconda pagina';editor.dispatchEvent(new Event('input',{bubbles:true}));const selection=getSelection(),range=document.createRange();range.setStart(editor.firstChild,6);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
  release(second.response);await more;
  check(content.querySelector(selector)===editor&&editor.textContent==='Bozza durante seconda pagina'&&document.activeElement===editor&&getSelection().anchorOffset===6,'remote continuation preserves dirty editor, focus and selection');
  check(continuousSession.blocks.filter(block=>block.id).length===50&&continuousSession.complete===false&&continuousSession.cursor===second.response.nextCursor&&calls===2,'partial session not falsely complete or automatically expanded from cache');
  draftRemove('continuous:'+continuousSession.key);api=original;journalPageCache=null;repository.close();
  if((await indexedDB.databases()).some(db=>db.name==='gdiary-local-v1'))throw Error('Real diary database opened');
 });
 assert.deepEqual(errors,[]);console.log('Multi-page journal cache: 16 bounded descriptors, targeted atomic reads, first/continuation retention, scope isolation, CAS/invalidation, total/overlap changes, eviction rollback, legacy upgrade, browser restart and privacy/draft/focus-safe load-more preview OK');
}finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
