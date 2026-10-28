const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCommitStore}=require('./helpers/recoverable-commit-store.cjs');
const scope={archiveId:'synthetic-day-app-archive',principalId:'synthetic-day-app-principal',epoch:'synthetic-day-app-epoch'};
const adapter=createCommitStore(scope),ctx=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console,syntheticStore:adapter.store,syntheticScope:scope,syntheticAdapter:adapter});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(condition,message)=>{if(!condition)throw Error(message);},copy=value=>JSON.parse(JSON.stringify(value));
 const fails=(fn,name)=>{let thrown;try{fn();}catch(error){thrown=error;}check(thrown&&thrown.name===name,'expected '+name+', got '+thrown?.name);};
 const a='2026-10-28',b='2026-10-29',c='2026-10-30',d='2026-10-31';
 const rich=[{kind:'check',runs:[{text:'☐ Passo sintetico 🌱',bold:true}]}];
 const one=saveDay({date:a,intention:'☐ Passo sintetico 🌱',intentionRich:rich,gratitude:'Una pausa',updatedAt:''}).commonUpserts.days[0];
 const two=saveDay({date:b,intention:'Seconda giornata',updatedAt:''}).commonUpserts.days[0];
 DAY_COMMIT_GATEWAY=syncDayMigrationGateway_(syntheticStore,syntheticScope,syncDaySheetSource_(mockSheets.Days));
 const unmigrated=saveDay({date:c,reflection:'Legacy sintetico',updatedAt:''}).commonUpserts.days[0];
 check(syntheticAdapter.snapshot().head.committedThrough===0,'unmigrated dates keep legacy writer, no silent import');
 const previews=[a,b].map(date=>DAY_COMMIT_GATEWAY.preview(date));
 previews.forEach((preview,i)=>DAY_COMMIT_GATEWAY.migrate({date:preview.date,expectedLegacy:preview.legacy,operationId:'synthetic-app-migration-'+i}));
 const frozen=copy(mockSheets.Days.data),version=date=>rows_(mockSheets.Days,DAY_HEADERS).find(row=>row.date===date).updatedAt;
 const initialA=version(a),initialB=version(b);check(initialA.startsWith('commit-')&&initialB.startsWith('commit-'),'full reader routes migrated days');
 const first=saveDay({date:a,updatedAt:one.updatedAt,reflection:'Bozza aperta prima della migrazione'}).commonUpserts.days[0];
 check(first.intention===one.intention&&JSON.parse(first.intentionRich)[0].runs[0].bold&&first.gratitude===one.gratitude,'partial legacy input preserves full rich snapshot');
 check(JSON.stringify(mockSheets.Days.data)===JSON.stringify(frozen),'canonical save leaves legacy preimage frozen');
 const full=getState({context:{view:'settings'}});check(full.days.find(row=>row.date===a).reflection===first.reflection,'getState full data routes to canonical record');
 for(const context of [{view:'journal',commonWindow:'journal',month:'2026-10'},{view:'week',commonWindow:'week',week:'2026-10-26'},{view:'habits',commonWindow:'habits',week:'2026-10-26',date:a}]){
  const response=getState({context});check(response.commonSlices.days.rows.find(row=>row.date===a)?.updatedAt===first.updatedAt,'period reader uses same canonical version: '+context.view);
 }
 const mixed=saveDays({days:[{date:a,updatedAt:one.updatedAt,reflection:'Stale'},{date:b,updatedAt:two.updatedAt,reflection:'Seconda bozza'},{date:d,updatedAt:'',reflection:'x'.repeat(6001)},{date:c,updatedAt:unmigrated.updatedAt,reflection:'Legacy aggiornato'}]});
 check(mixed.results.map(result=>result.status).join(',')==='conflict,saved,invalid,saved','mixed migrated/legacy batch outcomes');
 check(mixed.commonUpserts.days.length===2,'only confirmed batch days are returned');
 check(JSON.stringify(mockSheets.Days.data.find(row=>row[0]===a))===JSON.stringify(frozen.find(row=>row[0]===a)),'no bypass write on migrated date');
 fails(()=>saveRecord_('Days',DAY_HEADERS,'date',{date:a,reflection:'Bypass'},first.updatedAt),'ProtocolUnavailable');
 // Interrupt the final publish of an edit after its durable plan was reserved.
 const pending={date:a,updatedAt:first.updatedAt,reflection:'Risposta persa 🌱'},currentC=mixed.commonUpserts.days.find(row=>row.date===c);
 syntheticAdapter.fault(syntheticAdapter.metrics().writes+10,'after');
 const interrupted=saveDays({days:[pending,{date:c,updatedAt:currentC.updatedAt,reflection:'Da non tentare'}]});
 check(interrupted.results.map(result=>result.status).join(',')==='error,notAttempted'&&interrupted.commonUpserts.days.length===0,'unknown commit stops batch without false confirmation');
 const retry=saveDays({days:[pending]});check(retry.results[0].status==='saved'&&retry.commonUpserts.days[0].reflection===pending.reflection,'same partial payload recovers exact original snapshot');
 const absent='2026-11-01';DAY_COMMIT_GATEWAY.migrate({date:absent,expectedLegacy:null,operationId:'synthetic-app-migrate-empty'});
 check(commonDateSlice_(mockSheets.Days,DAY_HEADERS,'date',absent,absent).rows.length===1,'canonical-only date discovered by period reader');
 const counts=rows_(mockSheets.Days,DAY_HEADERS).filter(row=>row.date===absent);check(counts.length===1,'full read discovers canonical-only date exactly once');
 // 50,000 unrelated rows stay outside a windowed source read.
 const slice=()=>traceApi({operation:'getState',traceId:'synthetic-day-window-trace',arg:{context:{view:'journal',commonWindow:'journal',month:'2026-10',deferEntries:true}}});
 const small=slice();for(let i=0;i<50000;i++)mockSheets.Days.data.push(DAY_HEADERS.map(key=>key==='date'?'2000-01-01':key==='reflection'?'Unrelated invented reflection':''));
 const large=slice();check(small.ok&&large.ok&&small.diagnostics.sheetReadCells===large.diagnostics.sheetReadCells,'period payload reads independent of 50k unrelated legacy days');
 // Fresh preimage verification detects a write even after request-local caches.
 const row=mockSheets.Days.data.find(row=>row[0]===a);row[DAY_HEADERS.indexOf('reflection')]='Variante esterna';
 fails(()=>saveDay({date:a,updatedAt:retry.commonUpserts.days[0].updatedAt,reflection:'Da bloccare'}),'CommitBlocked');
 fails(()=>commonDateSlice_(mockSheets.Days,DAY_HEADERS,'date',a,a),'CommitBlocked');
 fails(()=>rows_(mockSheets.Days,DAY_HEADERS),'CommitBlocked');
 console.log('Day migration app: Demo saveDay/saveDays, full/journal/week/habit readers, old drafts, mixed batches, lost ACK, canonical-only dates, bypass/divergence barriers and 50k bounded period reads OK.');
}`,ctx);
