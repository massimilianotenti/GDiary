const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 mockSheets.Entries.data=[ENTRY_HEADERS];mockSheets.TaskPlans.data=[PLAN_HEADERS];
 mockSheets.Days.data=[DAY_HEADERS];mockSheets.Weeks.data=[WEEK_HEADERS];mockSheets.HabitLogs.data=[LOG_HEADERS];
 // Interleaved and deliberately unsorted: no ordering assumption or small-sheet
 // fallback may read an unrelated reflection/checklist payload.
 const add=(name,headers,data)=>mockSheets[name].data.push(headers.map(h=>data[h]||''));
 for(const date of ['2027-01-15','2026-12-31','2027-02-01','2027-01-01']){
  add('Days',DAY_HEADERS,{date,intention:'Privato '+date,intentionRich:'formattazione',updatedAt:'v1'});
  add('HabitLogs',LOG_HEADERS,{key:'h|'+date,habitId:'h',date,status:'done',checklist:'["micro"]'});
 }
 add('Weeks',WEEK_HEADERS,{week:'2027-01-04',focus:'focus'});
 add('Weeks',WEEK_HEADERS,{week:'2026-12-28',focus:'fuori'});
 ioReset_();let slices=commonJournalSlices_(db_(),'2027-01','2027-01-06');
 check(slices.days.from==='2026-12-31'&&slices.days.to==='2027-01-31','month and carry across year');
 check(slices.days.rows.length===3&&slices.days.rows.every(d=>d.intentionRich==='formattazione'),'exact complete records');
 check(slices.habitLogs.from==='2026-12-28'&&slices.habitLogs.to==='2027-01-31'&&slices.habitLogs.rows.length===3,'whole calendar weeks');
 check(slices.weeks.rows.length===1&&slices.weeks.rows[0].focus==='focus','current week focus');
 ioReset_();check(commonJournalSlices_(db_(),'2028-02','2027-01-06').days.to==='2028-02-29','leap year');
 const args={context:{view:'journal',month:'2027-01',commonWindow:'journal'}};
 const read=()=>traceApi({operation:'getCommonState',traceId:'common-window-trace-00001',arg:args});
 const small=read();check(small.ok&&small.value.entries.length===0&&!small.value.days&&!small.value.habitLogs&&small.value.commonScope.month==='2027-01','explicit slices without ambiguous complete arrays');
 for(let i=0;i<50000;i++){
  add('Days',DAY_HEADERS,{date:'2020-01-01',reflection:'Unrelated private reflection '+i});
  add('HabitLogs',LOG_HEADERS,{key:'old-'+i,date:'2020-01-01',checklist:'Unrelated microactions'});
 }
 const before=JSON.stringify(mockSheets.Days.data),large=read();
 check(large.ok&&JSON.stringify(large.value.commonSlices)===JSON.stringify(small.value.commonSlices),'result independent of history');
 check(large.diagnostics.sheetReadCells===small.diagnostics.sheetReadCells&&large.diagnostics.sheetReadRequests===small.diagnostics.sheetReadRequests,'constant payload reads at 50k unrelated records');
 check(!large.diagnostics.driveCalls&&!large.diagnostics.docsOpenCalls&&!large.diagnostics.lockAttempts,'read-only, no Drive/Docs/lock');
 check(before===JSON.stringify(mockSheets.Days.data),'no writes');
 const full=traceApi({operation:'getCommonState',traceId:'common-window-trace-00002',arg:{context:{view:'habits',month:'2027-01'}}}),legacy=full.value;check(legacy.days.length===50004&&!legacy.commonSlices&&legacy.commonScope.kind==='full','legacy/full views remain complete');
 const skip=getState({context:{view:'habits',month:'2027-01',commonWindow:'journal',commonFresh:true}});check(skip.commonIncluded===false&&!skip.commonSlices&&!skip.days,'fresh skip contract');
 let failed=false;try{getCommonState({context:{month:'2027-13',commonWindow:'journal'}});}catch{failed=true;}check(failed,'invalid month rejected before date expansion');
 check(full.diagnostics.sheetReadCells>1000*large.diagnostics.sheetReadCells,'full history comparison');
 for(let i=0;i<1000;i++)add('HabitLogs',LOG_HEADERS,{key:'dense-'+i,date:'2027-01-10',status:'done'});
 const dense=read();check(dense.ok&&dense.value.commonSlices.habitLogs.rows.length===1003,'all in-period habit records included');
 check(dense.diagnostics.sheetReadRequests-large.diagnostics.sheetReadRequests===4,'dense selected rows split into batches of at most 256');
 console.log('Common window: unsorted small/50k history, bounded payload reads, carry/year/leap boundaries, richness, no writes and full fallback OK; selected read cells '+large.diagnostics.sheetReadCells+' vs full '+full.diagnostics.sheetReadCells);
}`,ctx);
