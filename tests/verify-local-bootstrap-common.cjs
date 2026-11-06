const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-bootstrap-common-'));
const server=http.createServer((req,res)=>{if(req.url!=='/Demo.html'){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Demo.html')));});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},checked=r=>{check(r.ok,r.error);return r.value;};
  const scope={archiveId:'synthetic-common-bootstrap',principalId:'synthetic-common-principal',epoch:'synthetic-common-epoch',schemaVersion:1,protocolVersion:1},other={...scope,principalId:'synthetic-other-principal'},databaseName='gdiary-common-bootstrap-v10';
  const keyPath=['archiveId','principalId','epoch'],tails={archiveMeta:[],entries:['id'],contents:['id'],commonRecords:['collection','id'],drafts:['kind','id'],outbox:['operationId'],searchDocuments:['id']};
  const old=await new Promise((resolve,reject)=>{const r=indexedDB.open(databaseName,10);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);r.onupgradeneeded=()=>{for(const [name,tail]of Object.entries(tails)){
   const store=r.result.createObjectStore(name,{keyPath:[...keyPath,...tail]});store.createIndex('byScope',keyPath);
   if(name==='entries'){store.createIndex('byScopeDate',[...keyPath,'data.date']);store.createIndex('byScopeType',[...keyPath,'data.type']);}
   if(name==='commonRecords'){store.createIndex('byCollection',[...keyPath,'collection']);store.createIndex('byCollectionEntry',[...keyPath,'collection','data.entryId']);}
   if(name==='drafts')store.createIndex('byOwner',['archiveId','principalId']);
   if(name==='outbox'){store.createIndex('byScopeStatus',[...keyPath,'status','createdAt','operationId']);store.createIndex('byScopeEntity',[...keyPath,'kind','id']);store.createIndex('byScopeEntityStatus',[...keyPath,'kind','id','status','createdAt','operationId']);}
  }};});
  const today=captureToday(),currentWeek=monday(today),cursor={format:'sync-cursor/v1',archiveId:scope.archiveId,principalId:scope.principalId,epoch:scope.epoch,sequence:1};
  const records={
   settings:[{id:'privacy',version:'privacy-v1',value:{privateTags:['segreto']}},{id:'reflection',version:'reflection-v1',value:{dailyReflectionMode:'essential'}}],
   days:['2024-01-30','2024-01-31','2024-02-01','2024-02-29','2024-03-01'].map(date=>({date,intention:'Intenzione '+date,intentionRich:[{kind:'p',runs:[{text:'Intenzione '+date,bold:true}]}],updatedAt:'commit-1'})),
   weeks:[currentWeek,'2024-01-29'].map(week=>({week,focus:'Focus '+week,updatedAt:'commit-1'})),
   habitLogs:['2024-01-28','2024-01-29','2024-03-03','2024-03-04','2024-12-30','2025-01-05','2025-01-06'].map(date=>({key:'habit|'+date,habitId:'habit',date,status:'done',updatedAt:'commit-1'})),
   projects:[{slug:'project',name:'Progetto sintetico',updatedAt:'commit-1'}],goals:[{id:'goal',title:'Obiettivo sintetico',updatedAt:'commit-1'}],habits:[{id:'habit',title:'Abitudine sintetica',updatedAt:'commit-1'}],
   files:[{id:'file-inside',entryId:'note-inside',title:'Allegato visibile',addedAt:'commit-1'},{id:'file-outside',entryId:'task-outside',title:'Allegato altro mese',addedAt:'commit-1'}],
   layouts:[{entryId:'note-inside',position:7,version:'commit-1'},{entryId:'task-outside',position:9,version:'commit-1'}],taskPlans:[{entryId:'task-outside',date:'2024-02-15',updatedAt:'commit-1'}]
  };
  const entries=[{id:'note-inside',type:'note',date:'2024-02-10',text:'Nota sintetica',updatedAt:'commit-1',contentVersion:null},{id:'task-outside',type:'task',date:'2020-01-01',text:'Task esterno',plannedDate:'2024-02-15',updatedAt:'commit-1',contentVersion:null}];
  const draft={...scope,kind:'note',id:'note-inside',localRevision:1,baseVersion:'commit-1',snapshot:{body:'Bozza conservata'}},operation={...scope,operationId:'pending-common-test',kind:'note',id:'note-inside',status:'pending',createdAt:1,payload:{body:'In attesa'}};
  await new Promise((resolve,reject)=>{const tx=old.transaction(Object.keys(tails),'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
   tx.objectStore('archiveMeta').put({...scope,revision:1,cursor,coverage:{consumer:{complete:true,docsScanComplete:true},readCheckpoint:{format:'local-read-checkpoint/v1',revision:1,cursor,savedAt:123}}});
   for(const entry of entries)tx.objectStore('entries').put({...scope,id:entry.id,version:'commit-1',data:entry});
   for(const [collection,rows]of Object.entries(records))for(const data of rows){const id=collection==='days'?data.date:collection==='weeks'?data.week:collection==='habitLogs'?data.key:collection==='projects'?data.slug:['layouts','taskPlans'].includes(collection)?data.entryId:data.id;tx.objectStore('commonRecords').put({...scope,collection,id,version:data.version||data.updatedAt||data.addedAt,data});}
   tx.objectStore('commonRecords').put({...other,collection:'habitLogs',id:'foreign-log',version:'commit-1',data:{key:'foreign-log',date:'2024-02-10'}});
   tx.objectStore('drafts').put(draft);tx.objectStore('outbox').put(operation);
  });old.close();
  const repo=BulletJournalVue.createLocalRepository({identity:{getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},enabled:()=>true,databaseName});
  const read=checked(await repo.readBootstrapView({month:'2024-02',today})),rows=collection=>read.common.filter(row=>row.collection===collection).map(row=>row.data);
  check(JSON.stringify(read.commonScope)===JSON.stringify({kind:'journal',month:'2024-02',today}),'explicit monthly common coverage');
  check(rows('days').map(row=>row.date).join(',')==='2024-01-31,2024-02-01,2024-02-29','leap month plus carry day only');
  check(rows('weeks').length===1&&rows('weeks')[0].week===currentWeek,'current week is independent of requested month');
  check(rows('habitLogs').map(row=>row.date).join(',')==='2024-01-29,2024-03-03','whole overlapping weeks, inclusive boundaries and principal isolation');
  check(rows('files').map(row=>row.id).join(',')==='file-inside'&&rows('layouts').map(row=>row.entryId).join(',')==='note-inside','attachments/layouts only for visible entries');
  check(rows('projects').length===1&&rows('goals').length===1&&rows('habits').length===1&&rows('settings').length===2,'full catalogues and custom privacy retained');
  check(rows('days')[1].intentionRich[0].runs[0].bold&&read.meta.coverage.readCheckpoint.savedAt===123,'rich and checkpoint unchanged by v10 upgrade');
  check(JSON.stringify(read.drafts[0])===JSON.stringify(draft)&&JSON.stringify(read.operations[0])===JSON.stringify(operation),'migration preserves drafts and outbox');
  check(read.entries.some(row=>row.id==='task-outside'&&row.plannedDate==='2024-02-15'),'global task planning remains present');
  const full=checked(await repo.readBootstrapView({month:'2024-02',today,taskOnly:true}));check(full.commonScope.kind==='full'&&full.common.length===Object.values(records).reduce((n,rows)=>n+rows.length,0),'Task contract retains full common state');
  const december=checked(await repo.readBootstrapView({month:'2024-12',today}));check(december.common.filter(row=>row.collection==='habitLogs').map(row=>row.data.date).join(',')==='2024-12-30,2025-01-05','week interval crosses year boundary');
  check((await repo.readBootstrapView({month:'2024-02',today:'2024-02-30'})).error==='DataError','invalid date is rejected');
  const period=checked(await repo.readBootstrapView({kind:'week',month:'2024-02',today,week:'2024-01-29'}));
  check(period.commonScope.kind==='week'&&period.commonScope.week==='2024-01-29','explicit weekly coverage');
  check(period.common.filter(row=>row.collection==='days').map(row=>row.data.date).join(',')==='2024-01-30,2024-01-31,2024-02-01','weekly day range crosses month boundary');
  check(period.entries.length===1&&period.entries[0].id==='task-outside'&&!period.entries[0].contentLoaded,'all task metadata retained without unrelated note bodies');
  check(period.common.filter(row=>row.collection==='habitLogs').map(row=>row.data.date).join(',')==='2024-01-29','weekly logs use only the selected week');
  const practices=checked(await repo.readBootstrapView({kind:'habits',month:'2024-02',today,week:'2024-01-29',date:'2024-03-03'}));
  check(practices.common.filter(row=>row.collection==='habitLogs').map(row=>row.data.date).join(',')==='2024-01-29,2024-03-03','habit day and tracker week are independently covered');
  check(practices.common.filter(row=>row.collection==='days').map(row=>row.data.date).join(',')==='','habit day slice excludes unrelated historical days');
  const overlap=checked(await repo.readBootstrapView({kind:'habits',month:'2024-02',today,week:'2024-01-29',date:'2024-02-01'}));
  check(overlap.common.filter(row=>row.collection==='habitLogs').length===1,'overlapping habit periods do not duplicate logs');
  check(overlap.common.filter(row=>row.collection==='days').map(row=>row.data.date).join(',')==='2024-01-31,2024-02-01','habit carry day retained');
  const weeklyNote=checked(await repo.readBootstrapView({kind:'week',month:'2024-02',today,week:'2024-02-05'}));
  check(weeklyNote.entries.some(row=>row.id==='note-inside'&&row.contentLoaded&&row.body==='')&&weeklyNote.common.some(row=>row.collection==='files'&&row.id==='file-inside'),'weekly notes and their attachments are loaded');
  check((await repo.readBootstrapView({kind:'week',month:'2024-02',today,week:'2024-02-06'})).error==='DataError','non-Monday period refused');
  check((await repo.readBootstrapView({kind:'habits',month:'2024-02',today,week:'2024-01-29',date:'2024-02-30'})).error==='DataError','invalid habit date refused');
  const update=checked(await repo.applyRemoteBatch({expectedRevision:1,commonUpserts:{habitLogs:[{key:'habit|2024-02-15',habitId:'habit',date:'2024-02-15',status:'done',updatedAt:'commit-2'}]},commonRemovals:{habitLogs:['habit|2024-01-29']}}));checked(await repo.markReadCheckpoint(update.revision));
  const updated=checked(await repo.readBootstrapView({month:'2024-02',today}));check(updated.common.filter(row=>row.collection==='habitLogs').map(row=>row.data.date).join(',')==='2024-02-15,2024-03-03','date index follows upserts and tombstones');
  const oldView=view,oldScope=commonScope,oldMonth=month,oldToday=state.today;
  try{commonScope=read.commonScope;month='2024-02';state.today=today;view='journal';check(commonScopeMatchesView(),'month coverage accepted');view='week';check(!commonScopeMatchesView(),'month cannot claim week coverage');view='habits';check(!commonScopeMatchesView(),'month cannot claim habit-period coverage');}finally{view=oldView;commonScope=oldScope;month=oldMonth;state.today=oldToday;}
  repo.close();
 });
 assert.deepEqual(errors,[]);console.log('Bootstrap common projection: populated v10 to v11 migration, leap/carry/month/year boundaries, independent current week, custom privacy/catalogues, visible files/layouts, full Task contract, draft/outbox/checkpoint preservation, date-index deltas and view coverage guards OK.');
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
