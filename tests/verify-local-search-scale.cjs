const assert=require('assert');
(async()=>{
 const {createLocalSearchIndex}=await import('../frontend/local-search-index.mjs');
 if(typeof global.gc!=='function')throw Error('run this fixture with --expose-gc for repeatable heap measurements');
 const reports=[];
 for(const size of [10000,50000]){
  global.gc();const heapBefore=process.memoryUsage().heapUsed;
  const index=createLocalSearchIndex(),started=performance.now();
  for(let i=0;i<size;i++){
   const id='scale-'+i,needle=i===size-1?'uniquequartzmarker':'';
   const result=index.upsert({id,version:'commit-'+(i+1),entry:{id,text:`Voce sintetica ${i} ${needle}`,date:'2026-10-29',tags:'fixture',projects:''},content:{id,body:`corpo campione ${i}`},files:[],projectNames:[]});
   assert(result.ok,`index ${id}`);
  }
  const indexedMs=performance.now()-started,searchStarted=performance.now();
  const hits=index.search('uniquequartzmarker',{limit:10});
  const searchMs=performance.now()-searchStarted;
  assert(hits.ok);assert.deepEqual(hits.value.results.map(row=>row.id),[`scale-${size-1}`]);
  assert.equal(hits.value.indexedDocuments,size);assert.equal(index.status().complete,false);
  globalThis.__localSearchScaleKeepAlive=index;global.gc();const heapAfter=process.memoryUsage().heapUsed;globalThis.__localSearchScaleKeepAlive=null;global.gc();
  reports.push({records:size,indexedMs:Math.round(indexedMs),queryMs:Math.round(searchMs),heapDeltaMB:Math.round((heapAfter-heapBefore)/10485.76)/100});
 }
 console.log('Local search scale fixtures: '+JSON.stringify(reports)+'; post-GC Node heap delta is indicative, no threshold; exact unique-result and incomplete-coverage checks OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
