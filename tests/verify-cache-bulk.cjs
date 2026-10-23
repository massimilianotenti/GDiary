const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 let revision=1000;MockItem.prototype.getLastUpdated=function(){return new Date(revision);};
 const provider=CacheService.getScriptCache;let gets=0,puts=0,rechecks=0;
 CacheService.getScriptCache=()=>({...provider(),get(){throw Error('individual read forbidden');},put(){throw Error('individual write forbidden');},getAll(keys){gets++;check(keys.length<=25&&new Set(keys).size===keys.length,'bounded unique keys');return provider().getAll(keys);},putAll(values,ttl){puts++;check(ttl===21600,'TTL');return provider().putAll(values,ttl);}});
 const read=()=>getJournalPage({month:'2026-10'}),signature=p=>JSON.stringify(p.entries.map(e=>[e.id,e.body,e.rich,e.richUnsupported,e.editorAutoTitle]));
 const cold=read(),expected=signature(cold);check(gets===1&&puts===1,'one cold getAll/putAll');
 gets=puts=0;const warm=read();check(signature(warm)===expected&&warm.performance.documentsOpened===0&&gets===1&&puts===0,'warm equivalence and counts');
 let index=0;for(const key of demoScriptCache.keys()){if(index++%2===0)demoScriptCache.delete(key);}
 gets=puts=0;check(signature(read())===expected&&gets===1&&puts===1,'interleaved misses preserve order and rich');
 const keys=[...demoScriptCache.keys()];demoScriptCache.set(keys[0],'{');demoScriptCache.set(keys[1],JSON.stringify({body:'bad',rich:[],richUnsupported:'wrong'}));
 check(signature(read())===expected,'malformed and wrong-shape fallback');
 const bulkProvider=CacheService.getScriptCache;
 CacheService.getScriptCache=()=>({...bulkProvider(),getAll(){throw Error('unavailable');},putAll(){throw Error('unavailable');}});
 check(signature(read())===expected,'service outage retains contents');CacheService.getScriptCache=bulkProvider;
 gets=puts=0;const bypass=getJournalPage({month:'2026-10',refreshDocs:true});check(signature(bypass)===expected&&gets===0&&puts===1,'explicit bypass skips getAll');
 demoScriptCache.clear();const open=DocumentApp.openById;DocumentApp.openById=function(id){revision++;return open(id);};puts=0;read();check(puts===0&&demoScriptCache.size===0,'revision races prevent writes');DocumentApp.openById=open;
 const revisionReads=new Map();MockItem.prototype.getLastUpdated=function(){const n=(revisionReads.get(this.getId())||0)+1;revisionReads.set(this.getId(),n);if(n>1)throw Error('final revision unavailable');return new Date(revision);};puts=0;read();check(puts===0,'failed final revision prevents writes');
 MockItem.prototype.getLastUpdated=function(){throw Error('no revision');};gets=puts=0;check(signature(read())===expected&&gets===0&&puts===0,'missing revisions skip cache');MockItem.prototype.getLastUpdated=function(){return new Date(revision);};
 // Oversize sections may be read but must not enter cache. Smaller valid writes survive.
 puts=0;journalCachePutAll_([{key:'too-large',value:{body:'x'.repeat(24001)}},{key:'small',value:{body:'ok',rich:[],richUnsupported:false}}]);check(puts===1&&!demoScriptCache.has('too-large')&&demoScriptCache.has('small'),'per-item size limit');
 // A response-budget stop must leave the excluded candidate available via the cursor.
 const serialize=JSON.stringify;JSON.stringify=function(value,...args){const raw=serialize(value,...args);return value&&value.id&&value.date?raw+' '.repeat(310000):raw;};
 const limited=read();JSON.stringify=serialize;check(limited.entries.length===1&&limited.nextCursor===limited.entries[0].id,'response budget cursor');
 const rest=getJournalPage({month:'2026-10',cursor:limited.nextCursor});check(rest.entries[0].id===cold.entries[1].id,'excluded candidate not skipped');
 const first=read().entries.find(e=>e.type==='note');saveJournalPage({month:'2026-10',blocks:[{...first,clientId:first.id,title:first.text,body:'pending bulk test',rich:plainRich_('pending bulk test'),originalBody:first.body,originalRich:first.rich}]});
 check(read().entries.find(e=>e.id===first.id).body==='pending bulk test','pending overrides old cache');
 const empty=getJournalPage({month:'2099-01'});gets=puts=0;getJournalPage({month:'2099-01'});check(empty.entries.length===0&&gets===0&&puts===0,'empty page no cache calls');
}`,ctx);
console.log('Bulk cache: bounded calls, order/rich equivalence, partial/invalid cache, outages, bypass, revision races/missing, size/budget/cursor, pending and empty page OK');
