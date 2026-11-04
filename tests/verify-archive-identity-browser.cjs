const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.identityDBOpens=0;const original=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{identityDBOpens++;return original(...args);};});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},create=window.BulletJournalVue.createArchiveIdentityClient;
  const a={protocolVersion:1,minClientProtocol:1,schemaVersion:1,identityVerified:true,archiveId:'synthetic-archive-a',principalId:'synthetic-user-a',epoch:'synthetic-epoch-a',capabilities:{localReadCache:false}},b={...a,archiveId:'synthetic-archive-b'};
  let fetch=()=>Promise.resolve(a);const client=create(()=>fetch());
  check((await client.verify()).verified&&!client.status().cacheReady&&client.getScope().archiveId===a.archiveId,'verified scope never enables persistence');
  check(!JSON.stringify(client.status()).includes(a.archiveId),'public status excludes namespace IDs');
  const copy=client.getScope();copy.archiveId='client-forgery';check(client.getScope().archiveId===a.archiveId,'scope copies cannot mutate trusted state');
  let resolve;fetch=()=>new Promise(r=>{resolve=r;});const stale=client.verify();check(client.getScope()===null,'old scope cleared during verification');
  fetch=()=>Promise.resolve(b);await client.verify();resolve(a);check((await stale).reason==='superseded'&&client.getScope().archiveId===b.archiveId,'late response cannot switch archive back');
  fetch=()=>Promise.reject(Error('PRIVATE-RAW-ERROR'));const failed=await client.verify();check(!failed.verified&&client.getScope()===null&&!JSON.stringify(failed).includes('PRIVATE'),'failure revokes scope and sanitizes errors');
  for(const bad of [{...a,protocolVersion:2},{...a,schemaVersion:2},{...a,minClientProtocol:2},{...a,principalId:''},{...a,identityVerified:false,reason:'untrusted-raw-error'}]){fetch=()=>Promise.resolve(bad);check(!(await client.verify()).verified&&client.getScope()===null,'unsupported or blocked manifests fail closed');}
  fetch=()=>Promise.resolve({...a,capabilities:{localReadCache:true,changes:true,operations:true}});const enabled=await client.verify();check(enabled.cacheReady&&enabled.operationsReady,'read cache, feed and outbox capabilities remain separately verified');check(identityDBOpens===0,'capability verification alone never opens application storage');
  fetch=()=>Promise.resolve({...a,capabilities:{localReadCache:true,changes:false,operations:true}});check(!(await client.verify()).cacheReady,'read cache without feed is not ready');
  fetch=()=>new Promise(r=>{resolve=r;});const pending=client.verify();client.invalidate();resolve(a);check((await pending).reason==='superseded'&&client.getScope()===null,'invalidation cancels old verification');
  check(!Object.keys(mockProps).some(k=>k.startsWith('LOCAL_ARCHIVE_V1:')),'no manifest RPC at startup');
 });
 await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>view==='settings'&&!busy);
 await page.getByRole('button',{name:'Attiva tracing',exact:true}).click();const panel=page.locator('#archiveIdentityPanel');
 await panel.getByRole('button',{name:'Verifica identità archivio',exact:true}).click();await page.waitForFunction(()=>!archiveIdentityBusy&&archiveIdentityStatus?.verified);
 await page.evaluate(()=>{window.savedIdentityForTest=archiveIdentityClient;window.savedScopeForTest=activeCacheScope;activeCacheScope={archiveId:'synthetic-cache-archive',principalId:'synthetic-cache-user',epoch:'synthetic-cache-epoch',protocolVersion:1,schemaVersion:1};archiveIdentityClient={status:()=>({verified:true,cacheReady:true}),getScope:()=>({...activeCacheScope})};localCacheEnabled=true;localSearchConsumer={search:async query=>({ok:true,value:{query,results:[],complete:false,fresh:false,cursor:null,indexedDocuments:0}})};query='sintetico';$('search').value=query;render();});await page.getByRole('button',{name:'Cerca nei dati scaricati',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#content h1')?.textContent==='Ricerca nei dati scaricati');await page.evaluate(()=>{const text=document.querySelector('#content').textContent;if(!text.includes('potenzialmente superati')||!text.includes('Cerca online in tutto l’archivio'))throw Error('Incomplete local results did not expose coverage and remote fallback');localCacheEnabled=false;localSearchConsumer=null;archiveIdentityClient=window.savedIdentityForTest;activeCacheScope=window.savedScopeForTest;});
 await page.evaluate(async()=>{await activateLocalArchiveCache();if(localCacheEnabled||localRepository||identityDBOpens!==0||!localCacheStatus.includes('Nessun dato è stato scaricato'))throw Error('Unavailable capability attempted to open real cache');});
 await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>view==='settings'&&!busy);
 await page.evaluate(()=>{
  const scope=archiveIdentityClient.getScope(),report=JSON.stringify(performanceTraceReport()),text=document.querySelector('#archiveIdentityPanel').textContent;
  for(const value of [scope.archiveId,scope.principalId,scope.epoch,mockSession.active,mockProps.DB_ID,mockProps.ROOT_ID])if(report.includes(value)||text.includes(value))throw Error('Identity identifier exposed in diagnostics');
  if(identityDBOpens!==0||archiveIdentityStatus.cacheReady)throw Error('Identity verification opened application storage');
  if(!performanceTraceReport().events.some(e=>e.operation==='getSyncManifest'))throw Error('Manifest diagnostic operation absent');
  mockSession.active='';
 });
 await panel.getByRole('button',{name:'Verifica identità archivio',exact:true}).click();await page.waitForFunction(()=>!archiveIdentityBusy&&archiveIdentityStatus?.verified===false);
 await page.evaluate(()=>{if(archiveIdentityClient.getScope()!==null||identityDBOpens!==0)throw Error('Blocked identity retained a usable scope');});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Identity browser: in-memory scope, protocol validation, stale responses/revocation, explicit capability gating, manual-only RPC, sanitized UI/export and zero IndexedDB opens OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
