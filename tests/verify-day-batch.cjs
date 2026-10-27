const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},fails=(fn,m)=>{let failed=false;try{fn();}catch{failed=true;}check(failed,m);};
 const day=(date,extra={})=>({date,updatedAt:'',intention:'Intento '+date,...extra});
 const trace=days=>traceApi({operation:'saveDays',traceId:'day-batch-trace-0000001',arg:{days}});
 const first=trace([day('2026-10-11'),day('2026-10-13'),day('2026-10-12')]);
 check(first.ok&&first.value.results.every(r=>r.status==='saved')&&first.value.commonUpserts.days.length===3,'unsorted batch inserts');
 check(first.diagnostics.lockAcquired===1&&first.diagnostics.flushCalls===1&&!first.diagnostics.docsOpenCalls&&!first.diagnostics.driveCalls,'one lock/flush, no Docs/Drive');
 const canonical=first.value.commonUpserts.days,at=date=>canonical.find(r=>r.date===date);
 const rich=[{kind:'check',runs:[{text:'☐ Checklist 🌱',bold:true}]}];
 const mixed=saveDays({days:[day('2026-10-11',{updatedAt:at('2026-10-11').updatedAt,reflection:'☐ Checklist 🌱',reflectionRich:rich}),day('2026-10-13'),day('2026-10-12',{updatedAt:at('2026-10-12').updatedAt,intention:'x'.repeat(6001)}),day('2026-10-14')]});
 check(mixed.results.map(r=>r.status).join(',')==='saved,conflict,invalid,saved'&&mixed.commonUpserts.days.length===2&&mixed.errors.length===2,'per-record conflict/validation do not block independent days');
 const row=mixed.commonUpserts.days[0];check(row.intention===at(row.date).intention&&row.reflection==='☐ Checklist 🌱'&&JSON.parse(row.reflectionRich)[0].runs[0].bold&&row.updatedAt>at(row.date).updatedAt,'field/rich/version preservation');
 for(const days of [[],Array.from({length:11},(_,i)=>day('2026-10-'+String(i+1).padStart(2,'0'))),[day('bad')],[day('2026-10-20'),day('2026-10-20')],[day('2026-10-21',{ignored:'x'.repeat(500001)})]]){const before=JSON.stringify(mockSheets.Days.data);fails(()=>saveDays({days}),'invalid envelope rejected');check(before===JSON.stringify(mockSheets.Days.data),'envelope rejection before mutation');}
 // A large unrelated archive must not add reflection payload reads.
 const measure=()=>{const current=objectAt_(mockSheets.Days,findRows_(mockSheets.Days,1,row.date,false)[0],DAY_HEADERS);return trace([day(row.date,{updatedAt:current.updatedAt,reflection:'Aggiornata'})]);};
 let small=measure();for(let i=0;i<50000;i++)mockSheets.Days.data.push(DAY_HEADERS.map(h=>h==='date'?'2020-01-01':h==='reflection'?'Unrelated old reflection':''));
 let large=measure();check(large.ok&&large.diagnostics.sheetReadCells===small.diagnostics.sheetReadCells&&large.diagnostics.sheetReadRequests===small.diagnostics.sheetReadRequests,'selected reads unchanged at 50k unrelated days');
 // Inject a failure after an actual write: that day is deliberately not ACKed,
 // remaining records are not attempted, previous successes remain canonical.
 const original=writeRow_;let writes=0;
 writeRow_=(sheet,index,values)=>{writes++;original(sheet,index,values);if(writes===2)throw Error('PRIVATE-UNKNOWN-COMMIT');};
 const versions=large.value.commonUpserts.days.concat(canonical).reduce((map,r)=>(map[r.date]=r,map),{});
 const current=date=>objectAt_(mockSheets.Days,findRows_(mockSheets.Days,1,date,false)[0],DAY_HEADERS);
 let interrupted;try{interrupted=saveDays({days:['2026-10-11','2026-10-12','2026-10-13'].map(date=>day(date,{updatedAt:current(date).updatedAt,intention:'Nuova versione'}))});}finally{writeRow_=original;}
 check(interrupted.results.map(r=>r.status).join(',')==='saved,error,notAttempted'&&interrupted.commonUpserts.days.length===1,'unknown commit stops later writes and only confirms known success');
 check(!JSON.stringify(interrupted).includes('PRIVATE'),'unexpected errors sanitized');
 const duplicate=current('2026-10-13');mockSheets.Days.data.push(DAY_HEADERS.map(h=>duplicate[h]||''));
 check(saveDays({days:[day(duplicate.date,{updatedAt:duplicate.updatedAt})]}).results[0].status==='conflict','duplicate canonical identity rejected');
 console.log('Day batch: one lock/flush, exact partial outcomes, version/rich preservation, envelope limits, 50k history, unknown commit stop/no false ACK and duplicate identity OK; selected cells '+large.diagnostics.sheetReadCells);
}`,ctx);
