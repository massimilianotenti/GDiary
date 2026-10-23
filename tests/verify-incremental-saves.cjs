const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
function check(v,m){if(!v)throw Error(m);}
const day=saveDay({date:'2026-10-14',intention:'Intento',updatedAt:''});
check(!day.days&&!day.commonPatch&&day.commonUpserts.days.length===1,'single explicit upsert');
const row=day.commonUpserts.days[0],size=JSON.stringify(day).length;
for(let i=0;i<200;i++)append_(db_().getSheetByName('Days'),[DAY_HEADERS.map(h=>h==='date'?'unrelated-'+i:h==='reflection'?'x'.repeat(100):'')]);
const next=saveDay({date:row.date,reflection:'Sera',updatedAt:row.updatedAt}).commonUpserts.days[0];
check(next.intention==='Intento'&&next.reflection==='Sera'&&next.updatedAt>row.updatedAt,'preservation and version');
check(JSON.stringify(saveDay({date:'2026-10-15',intention:'Intento',updatedAt:''})).length===size,'constant response size');
let failed=false;try{saveDay({date:row.date,intention:'stale',updatedAt:row.updatedAt});}catch(e){failed=true;}check(failed,'stale rejected');
const week=saveWeek({week:'2026-10-12',focus:'Focus',priorities:'',wins:'',obstacles:'',lessons:'',next:'',energy:'4',closed:'yes',updatedAt:''});
check(week.commonUpserts.weeks.length===1&&!week.weeks&&!week.commonPatch,'week single upsert');
for(let i=0;i<200;i++)append_(db_().getSheetByName('Weeks'),[WEEK_HEADERS.map(h=>h==='week'?'unrelated-'+i:'')]);
check(JSON.stringify(saveWeek({week:'2026-10-19',focus:'Focus',priorities:'',wins:'',obstacles:'',lessons:'',next:'',energy:'4',closed:'yes',updatedAt:''})).length===JSON.stringify(week).length,'bounded week response');
}`,ctx);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForFunction(()=>continuousSession?.loaded&&!busy&&commonReadAt>0);
await page.evaluate(async()=>{
 const check=(v,m)=>{if(!v)throw Error(m);};
 state.days=[{date:'2026-10-14',intention:'prima',reflection:'conservata'},{date:'2026-10-13',intention:'altra'}];
 applyCommonChanges({commonUpserts:{days:[{date:'2026-10-14',intention:'dopo',updatedAt:'v1'}]}});
 applyCommonChanges({commonUpserts:{days:[{date:'2026-10-14',intention:'dopo',updatedAt:'v1'}]}});
 check(state.days.length===2&&state.days[0].reflection==='conservata'&&state.days[1].intention==='altra','merge fields, idempotence and unrelated records');
 window.incrementalCalls=[];const original=api;api=async(name,arg,...rest)=>{incrementalCalls.push(name);return original(name,arg,...rest);};
 await run('saveDay',{date:'2026-09-29',reflection:'salvata',updatedAt:''});
 check(state.days.some(r=>r.date==='2026-09-29'&&r.reflection==='salvata'&&r.updatedAt),'run applies canonical day');
 const h=state.habits.find(h=>h.archived!=='yes'&&h.start<=state.today);
 if(!h)throw Error('habit fixture missing');
 const goal=state.goals.find(g=>g.id===h.goalId),[year,q]=goal.cycle.split('-Q');let date=year+'-'+String((Number(q)-1)*3+1).padStart(2,'0')+'-01';while(date<h.start||(!/^weekly:/.test(h.days)&&!h.days.split(',').includes(String((new Date(date+'T12:00:00Z').getUTCDay()+6)%7))))date=dateAdd(date,1);const old=habitLog(h,date),before=state.habitLogs.filter(l=>l.key!==h.id+'|'+date).map(l=>JSON.stringify(l));
 const result=await api('setHabitLog',{habitId:h.id,date,status:'skipped',habitUpdatedAt:h.updatedAt,updatedAt:old?.updatedAt||''});
 check(result.commonUpserts.habitLogs.length===1&&!result.commonPatch,'single habit upsert');applyCommonChanges(result);
 const logSheet=db_().getSheetByName('HabitLogs');for(let i=0;i<200;i++)append_(logSheet,[LOG_HEADERS.map(k=>k==='key'?'unrelated-'+i:'')]);
 const repeated=await api('setHabitLog',{habitId:h.id,date,status:'skipped',habitUpdatedAt:h.updatedAt,updatedAt:result.commonUpserts.habitLogs[0].updatedAt});
 check(JSON.stringify(repeated).length===JSON.stringify(result).length,'bounded habit response');applyCommonChanges(repeated);
 let conflict=false;try{await api('setHabitLog',{habitId:h.id,date,status:'pending',updatedAt:result.commonUpserts.habitLogs[0].updatedAt});}catch(e){conflict=true;}check(conflict&&habitLog(h,date).status==='skipped','habit conflict preserves confirmed state');
 check(habitLog(h,date).status==='skipped'&&before.every(s=>state.habitLogs.some(l=>JSON.stringify(l)===s)),'habit canonical status and unrelated logs');
 check(!incrementalCalls.some(n=>['getState','getCommonState'].includes(n)),'no compensating read');
});console.log('Incremental saves: bounded payload, versions/conflicts, canonical records, field preservation, idempotent client merge and no full reread OK');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
