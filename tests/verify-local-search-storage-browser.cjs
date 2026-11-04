const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gdiary-search-storage-'));
const server=http.createServer((req,res)=>{const name=req.url==='/Demo.html'?'Demo.html':req.url==='/Changelog.html'?'Changelog.html':null;if(!name){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,name)));});
(async()=>{let context;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await context.newPage();page.on('console',message=>{if(message.type()==='log')process.stdout.write(message.text()+'\n');});await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');
 const report=await page.evaluate(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const scope={archiveId:'synthetic-search-storage-archive',principalId:'synthetic-search-storage-principal',epoch:'synthetic-search-storage-epoch',protocolVersion:1,schemaVersion:1};
  const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})},databaseName='gdiary-search-storage-measure-v1';
  const repo=window.BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName});
  check(typeof navigator.storage?.estimate==='function','Chromium StorageManager.estimate is required for this measurement');
  const meta=(await repo.getMeta()).value;check(meta.revision===0,'measurement starts with an empty scoped database');
  check((await repo.clearSearchIndex({expectedRevision:0})).ok,'clear search stores before measuring');
  const base=(await navigator.storage.estimate()).usage||0,reports=[],batchSize=500;
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName);request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
  async function fill(from,to){
   const started=performance.now();
   for(let start=from;start<to;start+=batchSize){
    const end=Math.min(start+batchSize,to),tx=db.transaction(['searchDocuments'],'readwrite');
    const documents=tx.objectStore('searchDocuments');
    const completed=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});
    for(let i=start;i<end;i++){
     const id='storage-'+i,entry={id,text:'Synthetic browser search footprint sample',date:'2026-10-29',tags:'alpha beta',projects:''};
     const content={id,version:'commit-'+(i+1),body:'A representative body with recurring words and punctuation, kept identical across fixtures.'};
     const text=[entry.text,content.body,entry.tags,entry.projects,entry.date].join(' ').toLowerCase();
     documents.put({...scope,id,version:content.version,entry,content,files:[],projectNames:[],text});
    }
    await completed;if(end%2000===0||end===to)console.log('IndexedDB fixture rows: '+end);
   }
   return performance.now()-started;
  }
  async function counts(){
   return new Promise((resolve,reject)=>{const tx=db.transaction(['searchDocuments'],'readonly'),documents=tx.objectStore('searchDocuments').count();tx.oncomplete=()=>resolve({documents:documents.result});tx.onerror=()=>reject(tx.error);});
  }
  const indexed10kMs=await fill(0,10000),estimate10k=await navigator.storage.estimate(),rows10k=await counts();
  check(rows10k.documents===10000,'10k checkpoint contains persisted search documents');
  check((await repo.finishSearchIndex({expectedRevision:0,complete:false,cursor:null,documents:10000})).ok,'generated IndexedDB image satisfies repository coverage accounting');
  const query10kStarted=performance.now(),candidates10k=await repo.findSearchCandidates('representative body'),query10kMs=performance.now()-query10kStarted;check(candidates10k.ok&&candidates10k.value.length===10000,'scoped document scan returns all exact matches at 10k');
  reports.push({records:10000,indexedMs:Math.round(indexed10kMs),scanMs:Math.round(query10kMs*100)/100,indexedDbEstimateMB:Math.round((((estimate10k.usage||0)-base)/1048576)*100)/100,documentRows:rows10k.documents,postingRows:0});
  const indexed40kMs=await fill(10000,50000),estimate50k=await navigator.storage.estimate(),rows50k=await counts();
  check(rows50k.documents===50000,'50k checkpoint contains persisted search documents');
  const query50kStarted=performance.now(),candidates50k=await repo.findSearchCandidates('representative body'),query50kMs=performance.now()-query50kStarted;check(candidates50k.ok&&candidates50k.value.length===50000,'scoped document scan returns all exact matches at 50k');
  reports.push({records:50000,indexedMs:Math.round((indexed10kMs+indexed40kMs)),scanMs:Math.round(query50kMs*100)/100,indexedDbEstimateMB:Math.round((((estimate50k.usage||0)-base)/1048576)*100)/100,documentRows:rows50k.documents,postingRows:0,added40kMs:Math.round(indexed40kMs)});
  db.close();repo.close();return reports;
 });
 console.log('Local search IndexedDB browser footprint and scan (Chromium estimate, synthetic repeated-text rows): '+JSON.stringify(report)+'; only the production searchDocuments store is populated. Both 10k and 50k are direct measurements; estimates are environment-specific with no size threshold.');
}finally{await context?.close();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
