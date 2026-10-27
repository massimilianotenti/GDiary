const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},wait=async()=>{while(busy)await new Promise(r=>setTimeout(r,5));};
  const original=api,calls=[];api=async(name,...args)=>{const value=await original(name,...args);calls.push({name,value});return value;};
  const dayRows=JSON.stringify(state.days),logRows=JSON.stringify(state.habitLogs);
  await go('settings');await wait();check(commonScope.kind==='catalogs'&&commonCoversView(),'settings scope uses catalogs only');
  check(JSON.stringify(state.days)===dayRows&&JSON.stringify(state.habitLogs)===logRows,'catalog response preserves previously loaded periods');
  const count=calls.length,oldPrivacy=JSON.stringify(state.settings.privateTags),oldEntries=JSON.stringify(state.entries);
  check(await run('saveReflectionSettings',{dailyReflectionMode:'detailed',version:state.settings.version},()=>dirtyMain=false),'save settings succeeds');
  check(calls.length===count+1&&calls.at(-1).value.settingsPatch&&state.settings.dailyReflectionMode==='detailed','one settings RPC applies canonical patch');
  check(JSON.stringify(state.settings.privateTags)===oldPrivacy&&JSON.stringify(state.entries)===oldEntries,'privacy/entries untouched by settings patch');
  await go('projects');await wait();
  const projectCount=state.projects.length,projectCalls=calls.length;
  check(await run('saveProject',{name:'Progetto delta browser',description:'Contesto'},()=>dirtyMain=false),'create project');
  check(state.projects.length===projectCount+1&&calls.length===projectCalls+1&&calls.at(-1).value.commonUpserts.projects.length===1,'project creation merges one record without reread');
  const project=state.projects.find(p=>p.name==='Progetto delta browser'),otherProjects=state.projects.filter(p=>p.slug!==project.slug).map(p=>JSON.stringify(p));
  check(await run('saveProject',{...project,name:'Progetto aggiornato browser'},()=>dirtyMain=false),'edit project');
  check(state.projects.length===projectCount+1&&otherProjects.every(row=>state.projects.some(p=>JSON.stringify(p)===row)),'project update preserves foreign records');
  await go('habits');await wait();
  const goals=state.goals.length,goalCalls=calls.length;
  check(await run('saveGoal',{title:'Obiettivo delta browser',cycle:'2026-Q4',target:10,progress:0,description:'Descrizione',icon:'book'},()=>dirtyMain=false),'create goal');
  const goal=state.goals.find(g=>g.title==='Obiettivo delta browser');
  check(goal&&state.goals.length===goals+1&&calls.length===goalCalls+1&&calls.at(-1).value.commonUpserts.goals[0].id===goal.id,'canonical goal without reread');
  check(await run('saveHabit',{goalId:goal.id,title:'Abitudine delta browser',days:'0,1,2,3,4,5,6',start:'2026-10-01',steps:'Passo uno\nPasso due'},()=>dirtyMain=false),'create habit');
  const habit=state.habits.find(h=>h.title==='Abitudine delta browser'),archiveCalls=calls.length;
  check(await run('deleteHabit',{id:habit.id,updatedAt:habit.updatedAt}),'archive habit');
  check(state.habits.find(h=>h.id===habit.id).archived==='yes'&&calls.length===archiveCalls+1,'archive is canonical upsert without follow-up read');
  const before=JSON.stringify(state.goals);applyCommonChanges({commonUpserts:{goals:[goal]}});applyCommonChanges({commonUpserts:{goals:[goal]}});
  check(state.goals.length===goals+1&&JSON.stringify(state.goals)===before,'upsert replay is idempotent');
  // A fresh catalog-only scope cannot masquerade as a loaded journal period.
  await go('settings');await wait();check(commonScope.kind==='catalogs','catalog scope restored');
  await go('journal');await wait();check(commonScope.kind==='journal'&&commonCoversView(),'journal requests temporal coverage after catalog-only view');
  // A slow catalog read cannot roll back an acknowledged catalog/settings save.
  commonReadAt=0;let finish;api=()=>new Promise(resolve=>{finish=resolve;});const pending=ensureCommon();
  applyCommonChanges({commonUpserts:{goals:[{...goal,title:'Newer canonical goal'}]},settingsPatch:{dailyReflectionMode:'essential',version:'newer'}});
  finish({commonIncluded:true,commonScope:{kind:'catalogs'},projects:[],goals:[],habits:[],settings:{dailyReflectionMode:'detailed',version:'older'}});await pending;
  check(state.goals.find(g=>g.id===goal.id).title==='Newer canonical goal'&&state.settings.version==='newer','late common read cannot replace canonical catalog/settings state');
  api=original;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Catalog deltas browser: catalog-only views, single RPC canonical saves, foreign records/entries/privacy, idempotence, period coverage and delayed-read protection OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
