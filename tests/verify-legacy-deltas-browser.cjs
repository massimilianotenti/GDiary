const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},wait=async()=>{while(busy)await new Promise(r=>setTimeout(r,5));},original=api;
  applyCommonChanges(await api('saveProject',{name:'browser-source',description:''}));
  const created=saveJournalPage({month,blocks:[{clientId:'legacy-browser-note-001',date:'2026-10-03',type:'note',title:'Nota di verifica',body:'Corpo formattato',rich:[{kind:'p',runs:[{text:'Corpo formattato',bold:true}]}],projects:'browser-source',tags:'iniziale',position:500},{clientId:'legacy-browser-task-001',date:'2026-10-03',type:'task',title:'Task di verifica',body:'Descrizione task',rich:plainRich_('Descrizione task'),projects:'browser-source',tags:'',status:'open',position:600}]}).entries;
  await go('projects',{project:'browser-source'});await wait();
  state.entries=state.entries.map(e=>created.find(c=>c.id===e.id)||e);
  const before=JSON.stringify(state.entries),foreign={id:'foreign-file',entryId:'foreign-entry',title:'Estraneo'};state.files.push(foreign);
  const calls=[];api=async(name,...args)=>{calls.push(name);return original(name,...args);};
  const link={entryId:created[0].id,title:'Allegato browser',url:'https://drive.google.com/file/d/synthetic-file-000001/view'};
  check(await run('addFileLink',link),'add attachment succeeds');
  const canonical=state.files.find(f=>f.entryId===created[0].id);
  check(calls.join(',')==='addFileLink'&&canonical&&state.files.includes(foreign)&&JSON.stringify(state.entries)===before,'one RPC file merge preserves other files and loaded bodies');
  check(await run('addFileLink',{...link,title:'Duplicato diverso'}),'duplicate attachment');check(state.files.filter(f=>f.entryId===created[0].id).length===1&&state.files.find(f=>f.id===canonical.id).title==='Allegato browser','duplicate is canonical and idempotent');
  const task=state.entries.find(e=>e.id===created[1].id),taskBody=task.body,taskRich=JSON.stringify(task.rich),entryIds=state.entries.map(e=>e.id);
  check(await run('updateEntry',{...task,text:task.text,body:'',due:'2026-10-25'}),'legacy metadata update');
  const updated=state.entries.find(e=>e.id===task.id);check(updated.body===taskBody&&JSON.stringify(updated.rich)===taskRich&&updated.due==='2026-10-25'&&updated.updatedAt!==task.updatedAt,'metadata response preserves detail body/rich');
  const preview=await api('previewProjectAsTag',{slug:'browser-source'});calls.length=0;
  check(await run('convertProjectToTag',{slug:'browser-source',tag:'privato',signature:preview.signature},()=>{project='';entryId='';}),'convert project');
  check(calls.join(',')==='convertProjectToTag','conversion needs no compensating read');
  check(!state.projects.some(p=>p.slug==='browser-source')&&!projects().some(p=>p.slug==='browser-source'),'removed project is not re-created from stale entry metadata');
  check(entryIds.every(id=>state.entries.some(e=>e.id===id&&entryTags(e).includes('privato')&&!entryProjects(e).includes('browser-source'))),'loaded entries get canonical conversion patches');
  check(state.entries.find(e=>e.id===created[0].id).rich[0].runs[0].bold&&state.entries.find(e=>e.id===task.id).body===taskBody,'conversion preserves loaded content');
  check(state.allTags.includes('privato')&&privacyEntries().every(e=>!entryIds.includes(e.id)),'tag catalog and privacy update together');
  check(!continuousSession,'clean previous journal session invalidated');
  // Patches do not invent incomplete entries for unloaded records. Dirty local
  // sessions retain their original version; clean blocks can accept metadata.
  const dirty=continuousBlock({...created[0],clientId:created[0].id}),clean=continuousBlock({...created[1],clientId:created[1].id});dirty.dirty=true;dirty.body='Bozza da conservare';
  continuousSession={blocks:[dirty,clean]};const oldVersion=dirty.updatedAt;
  applyCommonChanges({entryPatches:[{id:dirty.id,projects:'',tags:'nuovo',updatedAt:'new-dirty-version',scope:'personal'},{id:clean.id,projects:'',tags:'nuovo',updatedAt:'new-clean-version',scope:'personal'},{id:'unloaded-record',projects:'',tags:'nuovo',updatedAt:'new',scope:'personal'}]});
  check(dirty.body==='Bozza da conservare'&&dirty.updatedAt===oldVersion&&dirty.dirty,'dirty session keeps body and conflict baseline');
  check(clean.updatedAt==='new-clean-version'&&clean.savedSnapshot===continuousComparable(clean),'clean block baseline refreshed in a mixed session');
  check(!state.entries.some(e=>e.id==='unloaded-record'),'unloaded metadata patches do not create incomplete records');
  continuousSession=null;api=original;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Legacy delta browser: attachment/duplicate canonical merge, single RPC, retained files/bodies/rich, conversion removal/version/privacy, clean cache invalidation and dirty baselines OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
