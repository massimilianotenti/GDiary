const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
 await page.evaluate(async()=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  check(commonScope.kind==='journal'&&commonCoversView(),'opening uses journal window');
  check(!state.days.some(d=>d.date<'2026-09-30'||d.date>'2026-10-31'),'opening excludes historical day payload');
  const original=api,calls=[];api=async(name,arg,...rest)=>{calls.push(name);return original(name,arg,...rest);};
  applyCommonChanges({commonUpserts:{days:[{date:month+'-15',intention:'Retained loaded month',updatedAt:'v1'}]}});
  const oldMonth=month;month='2026-09';check(!commonCoversView(),'recent common timestamp does not cover another month');
  await run('getState');check(commonScope.month===month&&commonCoversView(),'month navigation loads matching slice');
  check(state.days.some(d=>d.date.startsWith(oldMonth+'-')),'other loaded months survive partial read');
  month=oldMonth;await run('getState');check(commonScope.month===oldMonth,'cached navigation cannot suppress missing coverage');
  await go('habits');while(busy)await new Promise(r=>setTimeout(r,5));
  check(view==='habits'&&commonScope.kind==='habits'&&commonCoversView(),'habit view obtains matching periods before rendering');
  check(calls.includes('getState'),'coverage fallback makes a real request');
  const foreign={date:'2025-01-01',intention:'outside',updatedAt:'v1'};
  state.days=[foreign,{date:'2026-10-01',intention:'deleted'},{date:'2026-10-02',intention:'old'}];
  applyCommonChanges({commonSlices:{days:{from:'2026-10-01',to:'2026-10-31',rows:[{date:'2026-10-02',intention:'new',intentionRich:'rich',updatedAt:'v2'}]}}});
  check(state.days.length===2&&state.days.includes(foreign)&&!state.days.some(d=>d.date==='2026-10-01')&&state.days.find(d=>d.date==='2026-10-02').intentionRich==='rich','authoritative range replaces only its own dates, including deletions');
  // Slow initial common request must not replace an acknowledged canonical save.
  commonReadAt=0;commonScope=null;let finish;
  api=()=>new Promise(resolve=>{finish=resolve;});const pending=ensureCommon();
  applyCommonChanges({commonUpserts:{days:[{date:'2026-10-02',intention:'saved while loading',updatedAt:'v3'}]}});
  finish({commonIncluded:true,commonScope:{kind:'full'},days:[{date:'2026-10-02',intention:'stale',updatedAt:'v2'}]});await pending;
  check(state.days.find(d=>d.date==='2026-10-02').intention==='saved while loading'&&commonReadAt===0,'late response cannot overwrite save or claim coverage');
  api=original;
  // The same race is possible during a view refresh, whose response also
  // carries entries. Keep entries usable without applying obsolete common data.
  let finishRead;api=(name,...args)=>name==='getState'?new Promise(resolve=>{finishRead=resolve;}):original(name,...args);
  const refresh=run('getState');
  applyCommonChanges({commonUpserts:{days:[{date:'2026-10-02',intention:'newer acknowledged save',updatedAt:'v4'}]}});
  finishRead({entries:state.entries,files:state.files,today:state.today,month,commonIncluded:true,commonScope:{kind:'full'},days:[{date:'2026-10-02',intention:'stale refresh',updatedAt:'v2'}]});await refresh;
  check(state.days.find(d=>d.date==='2026-10-02').intention==='newer acknowledged save','view refresh cannot overwrite acknowledged save');
  api=original;
 });
 console.log('Common window browser: opening/month coverage, habit period navigation, range replacement and delayed read/save race OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
