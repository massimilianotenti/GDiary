const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},fails=(fn,m)=>{let failed=false;try{fn();}catch{failed=true;}check(failed,m);};
 saveProject({name:'delta-source',description:''});saveProject({name:'delta-other',description:''});
 const created=saveJournalPage({month:'2026-10',blocks:[{clientId:'legacy-delta-note-0001',date:'2026-10-03',type:'note',title:'Titolo riservato',body:'Corpo riservato 🌱',rich:plainRich_('Corpo riservato 🌱'),projects:'delta-source,delta-other',tags:'iniziale',position:100},{clientId:'legacy-delta-note-0002',date:'2026-10-04',type:'task',title:'Task riservato',body:'Corpo task',rich:plainRich_('Corpo task'),projects:'delta-source',tags:'',status:'open',position:200}]}).entries;
 const context={incrementalCommon:true,view:'projects',month:'2026-10',project:'delta-source',commonWindow:'catalogs'},fileUrl='https://drive.google.com/file/d/synthetic-file-000001/view';
 const originalState=state_,originalOpen=DocumentApp.openById,originalRows=rows_;
 state_=()=>{throw Error('Unexpected full state rebuild');};DocumentApp.openById=()=>{throw Error('Unexpected Docs read');};
 rows_=(sheet,headers)=>{check(!['Days','Weeks','HabitLogs'].includes(sheet.getName()),'unrelated history not read');return originalRows(sheet,headers);};
 let file,updated,converted;
 try{
  const linked=addFileLink({entryId:created[0].id,title:'Allegato canonico',url:fileUrl,context});file=linked.fileUpserts[0];
  check(linked.delta&&linked.commonIncluded===false&&linked.entries.length===0&&linked.fileUpserts.length===1&&!linked.files,'file-only canonical delta');
  const duplicate=addFileLink({entryId:created[0].id,title:'Titolo ignorato duplicato',url:fileUrl,context});check(JSON.stringify(duplicate.fileUpserts[0])===JSON.stringify(file),'duplicate returns original persisted title/id/url');
  const fileBefore=JSON.stringify(mockSheets.Files.data);fails(()=>addFileLink({entryId:'missing',title:'No',url:fileUrl,context}),'missing owner rejected');fails(()=>addFileLink({entryId:created[0].id,title:'No',url:'https://example.com/not-google',context}),'invalid URL rejected');check(fileBefore===JSON.stringify(mockSheets.Files.data),'rejected links do not mutate');
  const entry=created[1];updated=updateEntry({...entry,text:entry.text,body:'',due:'2026-10-20',context});
  check(updated.delta&&updated.metadataOnly&&updated.entries[0].updatedAt>entry.updatedAt&&updated.entries[0].due==='2026-10-20'&&updated.preserveDetailId===entry.id,'legacy metadata-only delta/version');
  fails(()=>updateEntry({...entry,text:entry.text,body:'',due:'2026-10-21',context}),'stale entry rejected');
  const preview=previewProjectAsTag({slug:'delta-source'});
  fails(()=>convertProjectToTag({slug:'delta-source',tag:'convertito',signature:'stale',context}),'conversion signature verified');
  converted=convertProjectToTag({slug:'delta-source',tag:'convertito',signature:preview.signature,context});
  check(converted.delta&&converted.metadataOnly===undefined&&converted.convertedCount===2&&converted.entryPatches.length===2&&!converted.projects&&!converted.allTags,'conversion returns only patches/removal');
  check(converted.commonRemovals.projects[0]==='delta-source'&&converted.addedTags[0]==='convertito','canonical project removal and tag addition');
  for(const patch of converted.entryPatches){const canonical=readEntry_(findRows_(mockSheets.Entries,1,patch.id,false)[0]);check(Object.keys(patch).sort().join(',')==='id,projects,scope,tags,updatedAt','metadata whitelist');for(const key of Object.keys(patch))check(patch[key]===canonical[key],'patch equals persisted '+key);check(!canonical.projects.includes('delta-source')&&canonical.tags.includes('convertito'),'conversion applied');}
  check(converted.entryPatches.find(p=>p.id===created[0].id).projects==='delta-other','other project preserved');
  check(!JSON.stringify(converted).includes('riservato'),'no titles/body in conversion response');
  const empty=previewProjectAsTag({slug:'delta-source'}),again=convertProjectToTag({slug:'delta-source',tag:'convertito',signature:empty.signature,context});check(again.convertedCount===0&&!again.entryPatches.length&&!again.addedTags.length,'empty conversion does not invent data');
 }finally{state_=originalState;DocumentApp.openById=originalOpen;rows_=originalRows;}
 const legacy=addFileLink({entryId:created[0].id,title:'Duplicato',url:fileUrl});check(legacy.files.some(f=>f.id===file.id)&&!legacy.fileUpserts,'legacy full contract retained');
 saveProject({name:'delta-blocked',description:''});saveGoal({title:'Vincolo',cycle:'2026-Q4',target:1,progress:0,project:'delta-blocked'});
 const blocked=previewProjectAsTag({slug:'delta-blocked'}),before=JSON.stringify(mockSheets.Projects.data);fails(()=>convertProjectToTag({slug:'delta-blocked',signature:blocked.signature,context}),'goal association blocks conversion');check(before===JSON.stringify(mockSheets.Projects.data),'blocked conversion no mutation');
 console.log('Legacy deltas: canonical/duplicate attachment, owner/URL validation, metadata version/conflict, conversion signature/goal protection, exact whitelist/version patches, retained links, no state rebuild/history/Docs and legacy fallback OK');
}`,ctx);
