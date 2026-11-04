const assert=require('assert');
(async()=>{
 const {createLocalSearchIndex}=await import('../frontend/local-search-index.mjs'),index=createLocalSearchIndex();
 const record=(id,text,version='2026-10-01T00:00:00.000Z',body='')=>({id,version,entry:{id,text,date:'2026-10-29',tags:'famiglia, lavoro',projects:'scrittura'},content:{id,body},files:[{title:'Documento allegato'}],projectNames:['Progetto Casa']});
 assert(index.upsert(record('entry-caffe','Caffè mattutino',undefined,'Appunti: perché, però!')).ok);
 assert(index.upsert(record('entry-other','Pianificazione',undefined,'Appunti di lavoro')).ok);
 assert.deepEqual(index.projectIds('scrittura'),['entry-caffe','entry-other']);const moved=record('entry-other','Pianificazione');moved.entry.projects='casa, scrittura';assert(index.upsert(moved).ok);assert.deepEqual(index.projectIds('casa'),['entry-other']);assert.deepEqual(index.projectIds('scrittura').sort(),['entry-caffe','entry-other']);
 assert.deepEqual(index.search('ffè').value.results.map(item=>item.id),['entry-caffe'],'substring crossing a word interior is retained');
 assert.deepEqual(index.search('perché,').value.results.map(item=>item.id),['entry-caffe'],'punctuation and accents retain includes semantics');
 assert.deepEqual(index.search('progetto casa').value.results.map(item=>item.id),['entry-caffe','entry-other'],'project display names are indexed');
 assert.deepEqual(index.search('documento allegato').value.results.map(item=>item.id),['entry-caffe','entry-other'],'attachment titles are indexed');
 assert.deepEqual(index.search('zzzz').value.results,[],'n-gram candidates receive exact substring verification');
 assert.deepEqual(index.search('a').value.results.map(item=>item.id),['entry-caffe','entry-other'],'short queries scan candidates without false negatives');
 const stale=index.upsert(record('entry-caffe','Vecchia risposta','2026-09-30T00:00:00.000Z','Non aggiornare'));assert(stale.ok&&stale.value.stale);assert.equal(index.search('caffè').value.results.length,1);assert.equal(index.search('non aggiornare').value.results.length,0);
 const newer=index.upsert(record('entry-caffe','Titolo aggiornato','commit-4','Body Docs importato'));assert(newer.ok&&!newer.value.stale);assert.equal(index.search('caffè').value.results.length,0);assert.equal(index.search('body docs').value.results.length,1);
 assert.equal(index.search('body docs',{visible:entry=>entry.id!=='entry-caffe'}).value.results.length,0,'privacy filter is applied before publishing results');assert.equal(index.search('body docs',{candidateIds:['entry-other']}).value.results.length,0,'persisted posting candidates still receive exact text verification');assert.equal(index.search('body docs',{candidateIds:['entry-caffe']}).value.results[0].id,'entry-caffe','persisted candidates select matching documents');
 const pendingDraft={kind:'note',baseVersion:'commit-4',localRevision:3,snapshot:{body:'Testo pending non ancora salvato',tags:'personale',projects:'progetto-locale'}};assert(index.upsert({...record('entry-draft','Titolo remoto','commit-4','Corpo remoto'),pendingDraft}).ok);const pendingResult=index.search('pending non ancora').value.results[0];assert.equal(pendingResult.entry.text,'Titolo remoto','pending search never replaces remote metadata');assert.equal(pendingResult.pendingDraft.localRevision,3);assert.equal(index.search('progetto-locale').value.results[0].id,'entry-draft','pending project slug is searchable');assert.deepEqual(index.projectIds('progetto-locale'),['entry-draft']);assert.equal(index.search('pending',{visible:entry=>!entry.pendingDraft.snapshot.tags.includes('personale')}).value.results.length,0,'visibility filters can consider pending metadata');assert(index.upsert(record('entry-draft','Titolo remoto','commit-4','Corpo remoto')).ok);assert.equal(index.search('pending non ancora').value.results.length,0,'removing a pending draft removes its search terms');assert.deepEqual(index.projectIds('progetto-locale'),[]);index.remove('entry-draft');
 assert(index.setCoverage({complete:false,cursor:'commit-4'}).ok);const partial=index.search('body docs').value;assert.equal(partial.complete,false);assert.equal(partial.cursor,'commit-4');
 assert.equal(index.remove('entry-caffe').value,true);assert.equal(index.search('body docs').value.results.length,0);assert.equal(index.status().documents,1);
 assert.deepEqual(index.projectIds('scrittura'),['entry-other']);const restored=createLocalSearchIndex();assert(restored.restore({documents:index.exportDocuments(),coverage:index.status()}).ok);assert.deepEqual(restored.projectIds('casa'),['entry-other']);
 assert(index.setCoverage({complete:true,cursor:'commit-5'}).ok);assert.equal(index.search('zz').value.complete,true);
 assert.equal(index.upsert({...record('x','x'),id:'',entry:{id:''}}).error,'DataError');assert.equal(index.search('x',{limit:0}).error,'DataError');
 const fixtures=Array.from({length:2500},(_,i)=>record('fixture-'+i,'Nota '+i+' con parola rara '+(i%17===0?'zuccheriera':''),'commit-'+(i+1),'corpo '+i));
 for(const item of fixtures)assert(index.upsert(item).ok);
 for(const query of ['zuccheriera','nota 18','rara 42','fixture','corpo 2']){
  const expected=fixtures.filter(item=>[item.entry.text,item.content.body,item.entry.tags,item.entry.projects,item.entry.date,...item.projectNames,...item.files.map(file=>file.title)].join(' ').toLowerCase().includes(query)).map(item=>item.id);
  const actual=index.search(query,{limit:1000}).value.results.map(item=>item.id);assert.deepEqual(actual,expected,`ngram search matches full scan for ${query}`);
 }
 console.log('Local search index: substring semantics, accents/punctuation, body/metadata/files/projects, exact verification, privacy filter, versioned refresh, stale response, tombstone removal, explicit coverage and 2,500-record scan equivalence OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
