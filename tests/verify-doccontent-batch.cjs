const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},startTrace=()=>{ioReset_();ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};};
 const sheet=docContentSheet_(true),savedData=sheet.data.map(r=>r.slice()),getRange=sheet.getRange;
 let searches=0,headerReads=[],payloadReads=[];
 sheet.getRange=function(row,col,n=1,m=1){const range=getRange.call(this,row,col,n,m),finder=range.createTextFinder,read=range.getDisplayValues;
  range.createTextFinder=function(...args){searches++;return finder.apply(this,args);};
  range.getDisplayValues=function(){if(row>1&&col===1&&m===3)headerReads.push([row,n]);if(col===4)payloadReads.push([row,n]);return read.call(this);};return range;};
 const rawContent=(body,version)=>({body,rich:[{kind:'p',runs:[{text:body,bold:true,color:'#123456'}]}],version,editorAutoTitle:true});
 const rows=(id,content,chunk=30000)=>{const raw=JSON.stringify(content),out=[];for(let at=0,part=0;at<raw.length;at+=chunk,part++)out.push([id+':'+content.version+':'+part,id,String(part),raw.slice(at,at+chunk)]);return out;};
 const setRows=data=>{sheet.data=[DOC_CONTENT_HEADERS.slice(),...data];sheet.reads=[];searches=0;headerReads=[];payloadReads=[];};
 const batch=ids=>{docContentsForPage_(ids);return ids.map(id=>docContent_(id));};
 const ids=Array.from({length:25},(_,i)=>'content-batch-'+i),contents=ids.map((id,i)=>rawContent('È😀字 '+i,'2026-10-23T10:00:00.000Z'));
 setRows(ids.flatMap((id,i)=>rows(id,contents[i])));const old=[];for(const id of ids){ioReset_();old.push(docContent_(id));}check(searches===25,'baseline individual searches');
 startTrace();searches=0;const values=batch(ids);check(JSON.stringify(values)===JSON.stringify(old),'25-entry contents/rich/version equivalent');check(searches===1&&ACTIVE_TRACE.metrics.contentBatchSearchCalls===1,'one grouped search');check(payloadReads.every(([,n])=>n<=DOC_CONTENT_BATCH_PAYLOAD_ROWS)&&headerReads.every(([,n])=>n<=DOC_CONTENT_BATCH_HEADER_ROWS),'range row limits');
 const initialSearches=searches;batch(ids);check(searches===initialSearches,'request-local reuse');values[0].rich[0].runs[0].text='changed';check(docContent_(ids[0]).body===contents[0].body,'independent cloned result');
 // Empty/duplicate inputs and the page bound must not expand the prefetch.
 startTrace();searches=0;docContentsForPage_([]);check(searches===0,'empty prefetch performs no search');
 batch([ids[0],ids[0]]);check(ACTIVE_TRACE.metrics.contentBatchEntries===1&&searches===1,'duplicate IDs read once');
 let tooMany=false;try{docContentsForPage_([...ids,'extra']);}catch(e){tooMany=true;}check(tooMany&&searches===1,'page bound rejected before IO');
 // A later request must observe new content and forget cached absences/errors.
 setRows(rows('later',rawContent('first','2026')));startTrace();check(batch(['later','absent'])[0].body==='first','initial snapshot');
 setRows([...rows('later',rawContent('second','2027')),...rows('absent',rawContent('newly present','2027'))]);
 check(docContent_('later').body==='first'&&docContent_('absent')===null,'snapshot stays within current request');
 startTrace();check(batch(['later','absent'])[0].body==='second'&&docContent_('absent').body==='newly present','next request refreshes snapshot and absence');
 // Sparse history over multiple search windows; only latest payloads are selected.
 const special='literal.[x]+(id)',target=rawContent('Unicode 😀 e accenti è','2026-10-23T11:00:00.000Z');
 const fixture=[];for(let i=0;i<1100;i++)fixture.push(...rows('unrelated-'+i,rawContent('NEVER READ','2020')));
 const oldRows=rows(special,rawContent('historical','2021'));fixture.splice(20,0,...oldRows);const latest=rows(special,target,17);latest.reverse();latest.forEach((r,i)=>fixture.splice(100+i*11,0,r));setRows(fixture);
 startTrace();const sparse=batch([special,'missing']);check(JSON.stringify(sparse[0])===JSON.stringify(target)&&sparse[1]===null,'literal IDs, scattered out-of-order fragments and absent record');check(searches===Math.ceil((sheet.data.length-1)/DOC_CONTENT_BATCH_SEARCH_ROWS),'search depends on bounded windows');
 for(const [at,n] of payloadReads)for(let i=at;i<at+n;i++)check(sheet.data[i-1][1]===special&&sheet.data[i-1][0].includes(target.version),'no unrelated/historical payload');
 // Invalid fragments and invalid JSON affect only their own entries.
 const good=rawContent('good','2026'),badRows=rows('bad-parts',rawContent('bad','2026'),15);badRows[1][2]='9';setRows([...rows('good',good),...badRows,['bad-json:2026:0','bad-json','0','{']]);
 startTrace();docContentsForPage_(['good','bad-parts','bad-json']);check(docContent_('good').body==='good','valid neighbor survives');for(const id of ['bad-parts','bad-json']){let failed=false;try{docContent_(id);}catch(e){failed=true;}check(failed,'broken content is recoverable error');}
 // An IO failure in a payload range preserves other entries in other ranges.
 setRows([...rows('good',good),...Array.from({length:6},(_,i)=>['x:'+i,'x','0','{}']),...rows('bad-io',rawContent('bad','2026'))]);
 const normalGet=sheet.getRange;sheet.getRange=function(row,col,n,m){const r=normalGet.call(this,row,col,n,m);if(col===4&&row>5)r.getDisplayValues=()=>{throw Error('SECRET-SHEETS');};return r;};
 startTrace();docContentsForPage_(['good','bad-io']);check(docContent_('good').body==='good','other ranges survive IO failure');let failed=false;try{docContent_('bad-io');}catch(e){failed=true;}check(failed&&!JSON.stringify(ACTIVE_TRACE.metrics).includes('SECRET'),'IO errors are local and not diagnostic text');sheet.getRange=normalGet;
 // Search/header failures remain recoverable entry errors, never empty content.
 for(const stage of ['search','headers']){
  setRows(rows('good',good));sheet.getRange=function(row,col,n,m){const r=normalGet.call(this,row,col,n,m);if(row>1&&stage==='search'&&col===2)r.createTextFinder=()=>{throw Error('PRIVATE-SEARCH');};if(row>1&&stage==='headers'&&col===1&&m===3)r.getDisplayValues=()=>{throw Error('PRIVATE-HEADERS');};return r;};
  startTrace();docContentsForPage_(['good']);let failed=false;try{docContent_('good');}catch(e){failed=true;}check(failed&&!IO.docContents.has('good'),'failed '+stage+' never becomes empty content');
  check(!JSON.stringify(ACTIVE_TRACE.metrics).includes('PRIVATE'),'failed '+stage+' diagnostic privacy');sheet.getRange=normalGet;
  startTrace();check(batch(['good'])[0].body==='good','next request recovers after '+stage+' failure');
 }
 // Bulk buffering limits defer large data to the existing individual reader.
 const huge=rawContent('😀'.repeat(600000),'2026');setRows([...rows('huge',huge),...rows('good',good)]);startTrace();docContentsForPage_(['huge','good']);check(ACTIVE_TRACE.metrics.contentBatchFallbacks===1,'large entry deferred');check(!IO.docContents.has('huge'),'large content not retained by prefetch');check(docContent_('huge').body===huge.body&&docContent_('good').body==='good','fallback preserves large existing content');
 // Header budget also falls back rather than truncating supported history/fragments.
 const many=rows('many-headers',rawContent('x'.repeat(14000),'2026'),1);setRows([...many,...rows('good',good)]);startTrace();docContentsForPage_(['many-headers','good']);check(ACTIVE_TRACE.metrics.contentBatchFallbacks>0,'header limit deferred');check(docContent_('many-headers').body==='x'.repeat(14000)&&docContent_('good').body==='good','header fallback equivalence');
 ACTIVE_TRACE=null;sheet.getRange=getRange;sheet.data=savedData;ioReset_();
 // Page integration: hit entries need no persistent-content work; cold is batched.
 MockItem.prototype.getLastUpdated=function(){return new Date(1000);};demoScriptCache.clear();startTrace();const cold=getJournalPage({month:'2026-10'});check(ACTIVE_TRACE.metrics.contentBatchEntries>0&&ACTIVE_TRACE.metrics.contentBatchSearchCalls===1,'cold page grouped');const expected=JSON.stringify(cold.entries.map(e=>[e.id,e.body,e.rich,e.editorAutoTitle]));
 startTrace();const warm=getJournalPage({month:'2026-10'});check(!ACTIVE_TRACE.metrics.contentBatchSearchCalls&&!ACTIVE_TRACE.metrics.contentPayloadCells,'warm reads no DocContent payload');check(JSON.stringify(warm.entries.map(e=>[e.id,e.body,e.rich,e.editorAutoTitle]))===expected,'warm/cold equivalent');
 startTrace();const bypass=getJournalPage({month:'2026-10',refreshDocs:true});check(ACTIVE_TRACE.metrics.contentBatchEntries===bypass.entries.length&&!ACTIVE_TRACE.metrics.cacheGetAllCalls,'explicit bypass groups all required content');check(JSON.stringify(bypass.entries.map(e=>[e.id,e.body,e.rich,e.editorAutoTitle]))===expected,'bypass content equivalence');
 const cacheKey=[...demoScriptCache.keys()][0];demoScriptCache.delete(cacheKey);startTrace();const mixed=getJournalPage({month:'2026-10'});check(ACTIVE_TRACE.metrics.contentBatchEntries===1&&mixed.performance.cacheMisses===1,'mixed page fetches only its missing entry');
 const first=warm.entries.find(e=>e.type==='note');saveJournalPage({month:'2026-10',blocks:[{...first,clientId:first.id,title:first.text,body:'pending grouped',rich:plainRich_('pending grouped'),originalBody:first.body,originalRich:first.rich}]});
 startTrace();const pending=getJournalPage({month:'2026-10'});check(pending.entries.find(e=>e.id===first.id).body==='pending grouped'&&ACTIVE_TRACE.metrics.contentBatchEntries===1,'pending only fetches its own persistent content');
 ACTIVE_TRACE=null;
}`,ctx);
console.log('DocContent batch: 25-entry equivalence, bounded grouped/sparse reads, Unicode/history, corruption/search/header/payload errors, request isolation/recovery, empty/duplicate/oversize inputs, size/header fallbacks, cold/warm/bypass/pending page integration OK');
