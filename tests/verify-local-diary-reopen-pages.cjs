const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 try{
  for(const scenario of ['all','edit','gap','remote','revoke','cycle']){
   const page=await browser.newPage();
   await page.route('https://**/*',route=>route.abort());
   await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);
   await page.waitForFunction(()=>continuousSession?.loaded&&!busy);
   await page.evaluate(async scenario=>{
    const scope={archiveId:'reopen-archive',principalId:'reopen-principal',epoch:'reopen-epoch',schemaVersion:1,protocolVersion:1};
    const identity={getScope:()=>scope,status:()=>({verified:true,cacheReady:true})};
    localRepository=BulletJournalVue.createLocalRepository({identity,enabled:()=>true,databaseName:'reopen-pages-'+scenario});
    const cache=BulletJournalVue.createJournalReadCache({repository:localRepository,identity,enabled:()=>true,now:()=>1000});
    const entry=(id,tags='')=>({id,clientId:id,date:'2026-10-29',type:'note',text:id,body:'Corpo '+id,rich:[{kind:'p',runs:[{text:'Corpo '+id,bold:true}]}],projects:'',tags,updatedAt:'commit-1',position:1024});
    window.reopenResponses=[
     {month:'2026-10',contentsIncluded:true,total:4,entries:[entry('reopen-first')],nextCursor:'reopen-first',nextEntry:{date:'2026-10-29',position:2048}},
     {month:'2026-10',contentsIncluded:true,total:4,entries:[entry('reopen-private','privato'),entry('reopen-second')],nextCursor:'reopen-second',nextEntry:{date:'2026-10-29',position:3072}},
     {month:'2026-10',contentsIncluded:true,total:4,entries:[entry('reopen-third')],nextCursor:'',nextEntry:null}
    ];
    const cursors=['','reopen-first','reopen-second'];
    for(let i=0;i<3;i++){
     const request={month:'2026-10',project:'',cursor:cursors[i]},ticket=await cache.prepare(request);
     if(!(await cache.save(ticket.ticket,reopenResponses[i])).ok)throw Error('cache fixture');
    }
    window.reopenReads=[];
    journalPageCache={...cache,read:async request=>{
     reopenReads.push(request.cursor);
     if(request.cursor==='reopen-first'){
      if(scenario==='gap')return {ok:true,hit:false};
      if(scenario==='remote'||scenario==='revoke'||scenario==='edit')await new Promise(resolve=>window.resumeReopenRead=resolve);
     }
     const result=await cache.read(request);
     if(scenario==='cycle'&&request.cursor==='reopen-first')result.response.nextCursor='reopen-first';
     return result;
    }};
    activeCacheScope=scope;localCacheEnabled=true;archiveIdentityStatus={verified:true,cacheReady:true,operationsReady:true};
    state.settings.privateTags=['privato'];state.settings.privacyMode='hide';state.entries=[];
    view='journal';month='2026-10';continuousProject='';taskDiary=false;continuousMode=true;continuousSession=null;dirtyMain=dirtyDetail=false;
    window.reopenCalls=[];const originalApi=api;
    api=(name,...args)=>name==='getJournalPage'?(reopenCalls.push(args[0].cursor),new Promise((resolve,reject)=>{window.resolveReopenRemote=resolve;window.rejectReopenRemote=reject;})):originalApi(name,...args);
    window.reopenLoading=loadContinuous(document.getElementById('content'));
   },scenario);
   await page.waitForFunction(()=>continuousSession?.localRecovery);
   if(scenario==='all'){
    await page.waitForFunction(()=>continuousSession.blocks.some(block=>block.id==='reopen-third'));
    assert.deepEqual(await page.evaluate(()=>({calls:reopenCalls,pages:[...continuousSession.localUnverifiedPages],complete:continuousSession.complete,next:continuousSession.localNextCursor})),{calls:[''],pages:['','reopen-first','reopen-second'],complete:false,next:''});
    assert.equal(await page.locator('[data-client-id="reopen-private"] .rich-area').count(),0);
    const editor=page.locator('[data-client-id="reopen-third"] .rich-area');
    await editor.fill('Bozza nella terza pagina');await editor.focus();
    await page.evaluate(()=>{window.thirdEditor=document.activeElement;rejectReopenRemote(Error('offline'));});
    await page.waitForFunction(()=>!continuousSession.loading);
    assert.equal(await editor.textContent(),'Bozza nella terza pagina');
    for(let i=0;i<3;i++){
     await page.getByRole('button',{name:'Riprova caricamento',exact:true}).click();
     await page.waitForFunction(i=>continuousSession.loading&&reopenCalls.length===i+2,i);
     assert.equal(await page.evaluate(()=>reopenCalls.at(-1)),['','reopen-first','reopen-second'][i]);
     await page.evaluate(i=>resolveReopenRemote(reopenResponses[i]),i);
     await page.waitForFunction(()=>!continuousSession.loading);
    }
    assert.equal(await page.evaluate(()=>continuousSession.complete&&!continuousSession.localRecovery&&continuousSession.blocks.find(b=>b.id==='reopen-third').dirty&&document.querySelector('[data-client-id="reopen-third"] .rich-area')===thirdEditor),true);
    await page.getByRole('button',{name:'Salva pagina',exact:true}).click();
    await page.waitForFunction(()=>!busy);
    assert.equal(await page.evaluate(async()=>{const rows=await localRepository.listActiveEntityOutbox({kind:'note',id:'reopen-third'});return rows.value[0]?.baseVersion==='commit-1'&&rows.value[0].payload.body==='Bozza nella terza pagina';}),true);
   }else if(scenario==='edit'){
    await page.waitForFunction(()=>typeof resumeReopenRead==='function');
    const editor=page.locator('[data-client-id="reopen-first"] .rich-area');
    await editor.fill('Bozza durante riapertura');await editor.focus();
    await page.evaluate(()=>{
     window.firstReopenEditor=document.activeElement;
     const range=document.createRange();range.setStart(document.createTreeWalker(firstReopenEditor,NodeFilter.SHOW_TEXT).nextNode(),5);range.collapse(true);
     getSelection().removeAllRanges();getSelection().addRange(range);resumeReopenRead();
    });
    await page.waitForFunction(()=>continuousSession.blocks.some(b=>b.id==='reopen-third'));
    assert.equal(await page.evaluate(()=>document.activeElement===firstReopenEditor&&getSelection().anchorOffset===5&&firstReopenEditor.textContent==='Bozza durante riapertura'&&continuousSession.blocks.find(b=>b.id==='reopen-first').dirty),true);
   }else if(scenario==='remote'||scenario==='revoke'){
    await page.waitForFunction(()=>typeof resumeReopenRead==='function');
    if(scenario==='remote'){
     await page.evaluate(()=>resolveReopenRemote({...reopenResponses[0],total:1,nextCursor:'',nextEntry:null}));
     await page.waitForFunction(()=>!continuousSession.loading);
    }else await page.evaluate(()=>{localCacheEnabled=false;});
    await page.evaluate(()=>resumeReopenRead());
    // Wait for the suspended cache continuation and its UI callback to finish.
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,50)));
    assert.equal(await page.evaluate(()=>continuousSession.blocks.length),1);
    assert.deepEqual(await page.evaluate(()=>reopenReads),['','reopen-first']);
   }else{
    await page.waitForFunction(()=>reopenReads.includes('reopen-first'));
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,50)));
    assert.equal(await page.evaluate(()=>continuousSession.blocks.some(b=>b.id==='reopen-third')),false);
    assert.deepEqual(await page.evaluate(()=>reopenCalls),['']);
    assert.equal(await page.evaluate(()=>continuousSession.complete),false);
    assert.equal(await page.evaluate(()=>reopenReads.length),2);
   }
   await page.close();
  }
  console.log('Local diary reopening: cached chain, gaps/cycles, privacy, dirty third-page editor, ordered remote verification, outbox baseline and late-read cancellation OK.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
