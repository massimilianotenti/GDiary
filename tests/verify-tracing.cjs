const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 MockItem.prototype.getLastUpdated=function(){return new Date(1000);};
 const traceId='00000000-0000-4000-8000-000000000001';
 function check(v,m){if(!v)throw Error(m);}
 const read=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10'}});
 check(read.ok&&read.value.entries.length,'journal read');
 check(read.diagnostics.traceId===traceId&&read.diagnostics.totalMs>=0,'correlation');
 check(read.value.performance.traceId===traceId,'page response correlation');
 const common=traceApi({operation:'getCommonState',traceId,arg:{context:{view:'journal',month:'2026-10'}}});
 check(common.ok&&common.value.entries.length===0&&common.value.performance.traceId===traceId,'common data preserves view semantics and correlation');
 check(read.diagnostics.docsOpenCalls>0&&read.diagnostics.sheetsCalls>0,'service measurements');
 const warm=traceApi({operation:'getJournalPage',traceId,arg:{month:'2026-10'}});
 check(warm.ok&&warm.value.performance.cacheHits>0,'warm cache');
 const entry=warm.value.entries.find(e=>e.type==='note');
 const save=traceApi({operation:'saveJournalPage',traceId,arg:{month:'2026-10',blocks:[{...entry,clientId:entry.id,title:entry.text,body:'SECRET-TRACE-TEST',rich:plainRich_('SECRET-TRACE-TEST'),originalBody:entry.body,originalRich:entry.rich}]}});
 check(save.ok&&save.value.entries.length===1,'save preserved');
 check(save.diagnostics.queueCalls>0&&save.diagnostics.lockCalls>0,'queue and lock measured');
 const sync=traceApi({operation:'processTaskDocQueue',traceId,arg:{}});
 check(sync.ok&&sync.value.processed>0,'queue synchronization');
 const failure=traceApi({operation:'saveJournalPage',traceId,arg:{month:'invalid',blocks:[]}});
 check(!failure.ok&&failure.diagnostics.traceId===traceId&&ACTIVE_TRACE===null,'failure and cleanup');
 check(!JSON.stringify(save.diagnostics).includes('SECRET'),'diagnostic metadata only');
 let refused=false;try{traceApi({operation:'setupDrive',traceId,arg:{}});}catch(e){refused=true;}
 check(refused,'diagnostics cannot invoke setup');
 const normal=getJournalPage({month:'2026-10'});check(normal.entries.length&&ACTIVE_TRACE===null,'normal API still works');
}`,ctx);
console.log('Tracing backend: correlated cold/warm reads, batch save, queue, errors, cleanup and dispatch allowlist OK');
