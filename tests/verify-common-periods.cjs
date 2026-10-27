const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},equal=(a,b,m)=>check(JSON.stringify(a)===JSON.stringify(b),m);
 const add=(name,headers,record)=>mockSheets[name].data.push(headers.map(h=>record[h]||''));
 mockSheets.Entries.data=[ENTRY_HEADERS];mockSheets.Days.data=[DAY_HEADERS];mockSheets.Weeks.data=[WEEK_HEADERS];mockSheets.HabitLogs.data=[LOG_HEADERS];
 for(const date of ['2027-01-03','2026-12-27','2027-04-30','2027-01-04','2026-12-28','2027-05-01','2026-12-31','2028-02-29','2027-03-15']){
  add('Days',DAY_HEADERS,{date,reflection:'Riflessione '+date,reflectionRich:'rich 🌱',updatedAt:'v1'});
  for(let i=0;i<2;i++)add('HabitLogs',LOG_HEADERS,{key:'h'+i+'|'+date,habitId:'h'+i,date,status:'done',checklist:'micro 🌱',updatedAt:'v1'});
 }
 for(const week of ['2027-01-04','2026-12-28','2027-04-26'])add('Weeks',WEEK_HEADERS,{week,focus:'Focus '+week,updatedAt:'v1'});
 const read=(kind,week,date)=>traceApi({operation:'getCommonState',traceId:'common-periods-trace-00001',arg:{context:{commonWindow:kind,view:kind,month:'2027-01',week,date}}});
 const args=[['week','2026-12-28'],['habits','2026-12-28','2027-05-01'],['habits','2026-12-28','2026-12-31']];
 const small=args.map(a=>read(...a));check(small.every(r=>r.ok),'valid scopes');
 const week=small[0].value;
 check(week.commonScope.kind==='week'&&week.commonScope.week==='2026-12-28'&&!week.days,'week scope explicit');
 equal(week.commonSlices.days.rows.map(r=>r.date),['2027-01-03','2026-12-27','2026-12-28','2026-12-31'],'week plus previous day, unsorted/year boundary');
 check(week.commonSlices.weeks.rows.length===1&&week.commonSlices.weeks.rows[0].week==='2026-12-28','selected checkup only');
 check(week.commonSlices.habitLogs.rows.length===6,'logs only week, excluding prior carry day');
 const habits=small[1].value;
 equal(habits.commonScope,{kind:'habits',week:'2026-12-28',date:'2027-05-01'},'independent day/tracker scope');
 equal(habits.commonSlices.days.rows.map(r=>r.date),['2027-04-30','2027-05-01'],'only selected reflection and previous day');
 check(habits.commonSlices.habitLogs.ranges.length===2&&habits.commonSlices.habitLogs.rows.length===10,'two separate week ranges, no intermediate March log');
 check(habits.commonSlices.habitLogs.rows.every(r=>r.checklist==='micro 🌱'&&r.updatedAt==='v1'),'microactions/version preserved');
 const same=small[2].value.commonSlices.habitLogs;check(same.ranges.length===1&&same.rows.length===new Set(same.rows.map(r=>r.key)).size,'overlapping day/tracker week without duplicate records');
 const leap=read('habits','2028-02-28','2028-02-29');check(leap.ok&&leap.value.commonSlices.days.rows[0].date==='2028-02-29','leap day');
 const empty=read('habits','2029-01-01','2029-03-01');check(empty.ok&&Object.values(empty.value.commonSlices).every(s=>!s.rows.length),'empty periods authoritative');
 for(const bad of [['week','2026-12-29'],['week','bad'],['habits','2026-12-28','2027-02-30']])check(!read(...bad).ok,'invalid period rejected');
 for(let i=0;i<50000;i++){
  add('Days',DAY_HEADERS,{date:'2020-01-01',reflection:'Unrelated historical reflection '+i});
  add('Weeks',WEEK_HEADERS,{week:'2020-01-06',focus:'Unrelated old focus'});
  add('HabitLogs',LOG_HEADERS,{key:'old-'+i,date:'2020-01-01',checklist:'Unrelated history'});
 }
 const before=JSON.stringify(mockSheets.Days.data),large=args.map(a=>read(...a));
 large.forEach((r,i)=>{check(r.ok,'large scope succeeds');equal(r.value.commonSlices,small[i].value.commonSlices,'history independent slices');check(r.diagnostics.sheetReadCells===small[i].diagnostics.sheetReadCells&&r.diagnostics.sheetReadRequests===small[i].diagnostics.sheetReadRequests,'bounded payload reads with 50k historical rows per table');check(!r.diagnostics.docsOpenCalls&&!r.diagnostics.driveCalls&&!r.diagnostics.lockAttempts,'no Docs/Drive/write lock');});
 check(before===JSON.stringify(mockSheets.Days.data),'no writes');
 const full=traceApi({operation:'getCommonState',traceId:'common-periods-trace-00002',arg:{context:{view:'habits',month:'2027-01'}}}),legacy=full.value;check(legacy.days.length===50009&&legacy.commonScope.kind==='full','legacy complete protocol preserved');
 console.log('Common periods: independent/overlapping weeks, year/leap boundaries, empty/invalid scopes, rich/checklists, 50k history per table, legacy and read-only OK; cells week '+large[0].diagnostics.sheetReadCells+', habits '+large[1].diagnostics.sheetReadCells+', full '+full.diagnostics.sheetReadCells);
}`,ctx);
