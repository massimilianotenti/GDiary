const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);},original=api;
  const make=(date,text)=>{const b=dailyBlock(date,'reflection');b.body=text;b.rich=plainRich(text);if(b.editor)b.editor.set(b.rich);b.dirty=true;draftWrite('daily:'+date+':reflection',{...b,editor:undefined});return b;};
  const dates=['2026-10-10','2026-10-11','2026-10-12'];dates.forEach((d,i)=>make(d,'Riflessione '+i));
  saveDay({date:dates[1],reflection:'Modifica da altro client',updatedAt:''});
  renderContinuous($('content'));await window.BulletJournalVue.whenRendered();
  const calls=[];api=async(name,arg,...rest)=>{calls.push({name,arg});return original(name,arg,...rest);};
  await saveDailyReflections();
  check(calls.length===1&&calls[0].name==='saveDays'&&calls[0].arg.days.length===3,'three days in one RPC');
  check(!dailyDrafts.get(dates[0]+':reflection').dirty&&dailyDrafts.get(dates[1]+':reflection').dirty&&!dailyDrafts.get(dates[2]+':reflection').dirty,'only confirmed days become clean');
  check(!draftRead('daily:'+dates[0]+':reflection')&&draftRead('daily:'+dates[1]+':reflection')&&dirtyMain,'only failed draft persists');
  check(document.querySelector('#message').textContent.includes('2 giornate salvate')&&document.querySelector('#message').className==='error','partial result visible');
  // Reconcile the conflicted day explicitly, then retry only its draft.
  const conflict=dailyDrafts.get(dates[1]+':reflection'),canonical=objectAt_(mockSheets.Days,findRows_(mockSheets.Days,1,dates[1],false)[0],DAY_HEADERS);
  conflict.updatedAt=canonical.updatedAt;calls.length=0;await saveDailyReflections();
  check(calls.length===1&&calls[0].arg.days.length===1&&!conflict.dirty&&!dirtyMain,'retry excludes previous confirmed days');
  // Preserve an edit made while the response for an older snapshot is pending.
  const date='2026-10-15',b=make(date,'Versione inviata');renderContinuous($('content'));await window.BulletJournalVue.whenRendered();
  let release;const hold=new Promise(resolve=>{release=resolve;});
  api=async(name,arg,...rest)=>{const response=await original(name,arg,...rest);if(name==='saveDays')await hold;return response;};
  const pending=saveDailyReflections();b.editor.set(plainRich('Modifica successiva'));dailyDirty(b);release();await pending;
  check(b.dirty&&b.body==='Modifica successiva'&&draftRead('daily:'+date+':reflection').body==='Modifica successiva'&&b.updatedAt===state.days.find(d=>d.date===date).updatedAt,'newer edit remains dirty with acknowledged baseline');
  api=original;await saveDailyReflections();check(!b.dirty&&!dirtyMain,'newer edit can be saved on next attempt');
  // An unavailable response (including a timeout after a real commit) cannot
  // acknowledge or discard text. A blind retry reports a conflict safely.
  const lost=make('2026-10-16','Conferma perduta');
  api=async(name,arg,...rest)=>{await original(name,arg,...rest);if(name==='saveDays')throw Error('Risposta persa');};
  let failed=false;try{await saveDailyReflections();}catch{failed=true;}
  check(failed&&lost.dirty&&draftRead('daily:2026-10-16:reflection'),'lost ACK preserves draft');
  api=original;await saveDailyReflections();check(lost.dirty,'uncertain-commit retry does not overwrite newer canonical data');
  // Invalid ACK must keep all local drafts intact.
  api=async()=>({results:[],commonUpserts:{days:[]}});failed=false;try{await saveDailyReflections();}catch{failed=true;}
  check(failed&&lost.dirty,'invalid acknowledgement retains draft');
  // Chunk by number: twenty-one days require three calls, never twenty-one.
  dailyDrafts.clear();for(let i=1;i<=21;i++){const d='2026-10-'+String(i).padStart(2,'0'),row=state.days.find(r=>r.date===d);if(!row)state.days.push({date:d,updatedAt:''});const record=objectAt_(mockSheets.Days,findRows_(mockSheets.Days,1,d,false)[0]||2,DAY_HEADERS);const block=make(d,'Lotto '+i);if(record.date===d)block.updatedAt=record.updatedAt;}
  const batches=[];api=async(name,arg,...rest)=>{if(name==='saveDays')batches.push(arg.days.length);return original(name,arg,...rest);};
  await saveDailyReflections();check(batches.join(',')==='10,10,1'&&!dirtyMain,'bounded multi-batch completion');
  api=original;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Day batch browser: one RPC/multiple dates, partial ACK/retry, retained rich drafts, edit during ACK, timeout after commit, invalid response and 10/10/1 batching OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
