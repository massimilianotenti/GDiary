const fs=require('fs'),vm=require('vm'),path=require('path');
const {createSyntheticArchive}=require('./helpers/synthetic-archive.cjs');
const fixture=createSyntheticArchive({entryCount:2000,longBodyLength:35000});
const ctx={window:{},document:{addEventListener(){}},setTimeout,console,fixture};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(value,message)=>{if(!value)throw Error(message);};
 const equal=(actual,expected,message)=>check(JSON.stringify(actual)===JSON.stringify(expected),message);
 const sheet=mockSheets.Entries;
 sheet.data=[ENTRY_HEADERS,...fixture.entries.map(row=>row.slice())];
 sheet.data.slice(1).forEach((row,i)=>{row[11]='PRIVATE-HISTORICAL-BODY-'+i;});
 const rawRange=sheet.getRange;
 sheet.getRange=function(row,col,n=1,m=1){if(row>1&&col<=12&&col+m>12)throw Error('Historical body must not be read');return rawRange.call(this,row,col,n,m);};
 const start=()=>{DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();sheet.reads=[];ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};};
 const stop=()=>{ACTIVE_TRACE=null;};
 const expected=rows=>rows.map(index=>Object.fromEntries(ENTRY_HEADERS.map((key,i)=>[key,key==='body'?'':String(sheet.data[index-1][i]??'')])));
 const dataReads=()=>sheet.reads.filter(([row])=>row>1);
 const budget=(uniqueCount)=>{
  const reads=dataReads(),m=ACTIVE_TRACE.metrics;
  check(reads.every(([,col,n,width])=>n<=256&&(col===1&&width===11||col===13&&width===2)),'bounded metadata ranges only');
  check((m.entryReadRows||0)<=8*uniqueCount,'amplification budget');
  check((m.entryRequestedRows||0)===uniqueCount,'unique requested rows counted');
  check((m.entryReadRows||0)===(m.entryRequestedRows||0)+(m.entryOverreadRows||0),'overread accounted');
 };
 // Unsorted inputs and duplicates must retain order, fields and independent objects.
 start();const requested=[77,2,7,77,12,257,258,511,512],records=readEntries_(requested);
 equal(records,expected(requested),'row identity/order/fields');budget(new Set(requested).size);
 records[0].text='changed copy';check(records[3].text!=='changed copy','duplicates are independent');
 check(records.every(e=>e.body===''&&!JSON.stringify(e).includes('PRIVATE-HISTORICAL')),'no legacy body exposed');stop();
 // Dense, interleaved, clustered and genuinely sparse layouts.
 for(const rows of [Array.from({length:2000},(_,i)=>i+2),Array.from({length:400},(_,i)=>i*5+2),[2,3,4,66,67,68,255,256,257,1000,1001,1002],[2,700,1400,2001]]){
  start();equal(readEntries_(rows),expected(rows),'layout equivalence');budget(rows.length);
  if(rows.length===400)check(dataReads().length<40,'interleaved reads no longer one pair per entry');
  if(rows.length===4)check(ACTIVE_TRACE.metrics.entryOverreadRows===0,'sparse reads do not fetch distant gaps');
  stop();
 }
 start();equal(readEntries_([]),[],'empty selection');check(dataReads().length===0&&!ACTIVE_TRACE.metrics.entryReadRanges,'empty selection does not read');stop();
 for(const [rows,ranges] of [[[2,17],1],[[2,18],2],[Array.from({length:257},(_,i)=>i+2),2]]){start();equal(readEntries_(rows),expected(rows),'range boundary equivalence');budget(rows.length);check(ACTIVE_TRACE.metrics.entryReadRanges===ranges,'range boundary split');stop();}
 // Missing tags in the legacy schema stay empty, never become undefined.
 const header=sheet.data[0][13],tag=sheet.data[1][13];sheet.data[0][13]='';sheet.data[1].length=13;
 start();check(readEntries_([2])[0].tags==='','legacy empty tags');stop();sheet.data[0][13]=header;sheet.data[1][13]=tag;
 // The optimized search is equivalent to an independent in-memory selection.
 const queries=[['type','^task$'],['status','^(open|doing)$'],['date','^2020-0'],['id','synthetic-entry-00000[015]$'],['projects','(^|,)progetto-sintetico(,|$)'],['tags','(^|,)privato(,|$)'],['text','never-matches']];
 for(const size of [499,500,501,2000]){
  const full=sheet.data;sheet.data=full.slice(0,size+1);
  for(const [field,pattern] of queries){start();const re=new RegExp(pattern,'i'),rows=Array.from({length:size},(_,i)=>i+2).filter(row=>re.test(sheet.data[row-1][ENTRY_HEADERS.indexOf(field)]||''));equal(entrySearch_(field,pattern),expected(rows),'search '+size+' '+field);if(size>500)budget(rows.length);stop();}
  sheet.data=full;
 }
 // New requests see edits, deletions and inserted rows; no cross-request row cache.
 start();const first=entrySearch_('type','^task$')[0];stop();
 const title=sheet.data[1][3];sheet.data[1][3]='Updated metadata';start();check(readEntry_(2).text==='Updated metadata','new read sees edit');stop();sheet.data[1][3]=title;
 const removed=sheet.data.splice(1,1)[0];start();check(!entrySearch_('type','^task$').some(e=>e.id===first.id),'new search sees deletion');stop();sheet.data.splice(1,0,removed);
 // Errors must propagate, with no partial success or cached empty records.
 sheet.getRange=function(row,col,n=1,m=1){const range=rawRange.call(this,row,col,n,m);if(row>1&&col===13)range.getValues=()=>{throw Error('PRIVATE-READ-FAILURE');};return range;};
 start();let failed=false;try{readEntries_([2,7,12]);}catch(error){failed=error.message==='PRIVATE-READ-FAILURE';}check(failed&&!JSON.stringify(ACTIVE_TRACE.metrics).includes('PRIVATE'),'read failure propagates with metric privacy');stop();sheet.getRange=rawRange;
 start();equal(readEntries_([2,7,12]),expected([2,7,12]),'retry after service failure');stop();
 // Complete journal pages with pending rich bodies and mixed schedule/priority.
 sheet.data=[ENTRY_HEADERS,...fixture.entries.slice(0,1000).map(row=>row.slice())];
 mockSheets.TaskPlans.data=[PLAN_HEADERS,...fixture.plans.filter(p=>Number(p[0].slice(-6))<1000).map((p,i)=>[...p.slice(0,5),i%7===0?'emergency':i%3===0?'urgent':'normal'])];
 const layout=mockSheets.JournalLayout||(mockSheets.JournalLayout=new MockSheet('JournalLayout'));layout.data=[JOURNAL_LAYOUT_HEADERS,...fixture.layout.slice(0,1000)];
 mockSheets.DocRefs.data=[REF_HEADERS];
 const contents=docContentSheet_(true),queue=taskDocQueue_(true);contents.data=[DOC_CONTENT_HEADERS];queue.data=[TASK_DOC_HEADERS];
 const contentMap=new Map();
 sheet.data.slice(1).filter(row=>row[2]==='task').forEach(row=>{
  const index=Number(row[0].slice(-6)),value=fixture.content(index,0);value.rich=plainRich_(value.body);value.rich[0].runs[0].bold=true;value.version=row[8];contentMap.set(row[0],value);
  const raw=JSON.stringify(value);let part=0;for(let at=0;at<raw.length;at+=30000)contents.data.push([row[0]+':'+value.version+':'+part,row[0],String(part++),raw.slice(at,at+30000)]);
  queue.data.push([row[0],'pending',row[8],'']);
 });
 const schedules=new Map(mockSheets.TaskPlans.data.slice(1).map(p=>[p[0],p]));
 const taskOrder=(a,b)=>({emergency:2,urgent:1,normal:0}[schedules.get(b[0])[5]]||0)-({emergency:2,urgent:1,normal:0}[schedules.get(a[0])[5]]||0)||(a[5]||'9999').localeCompare(b[5]||'9999')||a[1].localeCompare(b[1])||a[0].localeCompare(b[0]);
 const snapshot=JSON.stringify([sheet.data,mockSheets.TaskPlans.data,contents.data,queue.data,layout.data]);
 let page=getJournalPage({month:'2026-10',taskArchive:true,taskOnly:true}),all=page.entries.slice();
 while(page.nextCursor){page=getJournalPage({month:'2026-10',taskArchive:true,taskOnly:true,cursor:page.nextCursor});all.push(...page.entries);}
 const sorted=sheet.data.slice(1).filter(row=>row[2]==='task').sort(taskOrder);
 equal(all.map(e=>e.id),sorted.map(row=>row[0]),'complete task order and pagination');
 all.forEach(entry=>{const value=contentMap.get(entry.id);check(entry.body===value.body&&!entry.editorError,'pending body preserved');equal(entry.rich,writtenRich_(value.rich),'rich formatting');check(entry.tags===sheet.data.find(row=>row[0]===entry.id)[13],'private tags preserved');});
 const scoped=getJournalPage({month:'2026-10',taskArchive:true,taskOnly:true,project:'progetto-sintetico'});
 check(scoped.total===sorted.filter(row=>row[4].split(',').includes('progetto-sintetico')).length&&scoped.entries.every(e=>e.projects.split(',').includes('progetto-sintetico')),'project scope unchanged');
 check(JSON.stringify([sheet.data,mockSheets.TaskPlans.data,contents.data,queue.data,layout.data])===snapshot,'reads never mutate records');
 check(new Set(all.map(e=>e.id)).size===all.length,'no duplicates');
}`,ctx);
console.log('Entry batch: sparse/dense/interleaved/clustered bounds, caller order/duplicates, empty/legacy data, 499/500/501 threshold, selectors, fresh reads/failures and full task pagination/rich/privacy/project equivalence OK');
