function readSheetValues_(range){return traceMeasure_('sheets',()=>{const values=range.getValues();if(values.some(row=>row.some(v=>v instanceof Date)))return range.getDisplayValues();return values.map(row=>row.map(v=>String(v??'')));});}
// Set this to the ID of a PRIVATE folder you created on My Drive, then run setupDrive.
const ROOT_FOLDER_ID = 'INCOLLA_ID_CARTELLA';

function findRows_(sheet,col,value,regex) {return traceMeasure_('sheets',()=>{
 if(IO_WIDTHS[sheet.getName()]){const values=ioRows_(sheet,Math.max(col,IO_WIDTHS[sheet.getName()]));const re=regex?new RegExp(value,'i'):null;return values.flatMap((r,i)=>(re?re.test(r[col-1]||''):String(r[col-1]||'')===String(value))?[i+2]:[]);}
 if(sheet.getLastRow()<2)return [];
 return sheet.getRange(2,col,sheet.getLastRow()-1,1).createTextFinder(value)
  .useRegularExpression(!!regex).matchEntireCell(!regex).findAll().map(r=>r.getRow());
});}

function objectAt_(sheet,row,headers) {
 const values=IO_WIDTHS[sheet.getName()]?ioRows_(sheet,headers.length)[row-2]:readSheetValues_(sheet.getRange(row,1,1,headers.length))[0].map(v => String(v??''));
 return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
}

function objectsSearch_(sheet,headers,col,pattern) {
 const size=sheet.getLastRow()-1;if(size<=0)return [];
 if(size<=500){
  const regex=new RegExp(pattern,'i');
  return readSheetValues_(sheet.getRange(2,1,size,headers.length)).map(r=>r.map(v=>String(v??''))).filter(v=>regex.test(v[col-1]||'')).map(v=>Object.fromEntries(headers.map((h,i)=>[h,v[i]])));
 }
 const found=findRows_(sheet,col,pattern,true).sort((a,b)=>a-b),groups=[],out=[];
 found.forEach(row=>{const last=groups[groups.length-1];if(last&&last[last.length-1]+1===row)last.push(row);else groups.push([row]);});
 groups.forEach(group=>readSheetValues_(sheet.getRange(group[0],1,group.length,headers.length)).map(r=>r.map(v=>String(v??''))).forEach(v=>out.push(Object.fromEntries(headers.map((h,i)=>[h,v[i]])))));
 return out;
}

function readEntry_(row){return readEntries_([row])[0];}

function readEntries_(rows){
 if(!rows.length)return [];const sheet=db_().getSheetByName('Entries');ensureEntryTagHeader_(sheet);const groups=[],out=new Map();
 [...new Set(rows)].sort((a,b)=>a-b).forEach(row=>{const last=groups[groups.length-1];if(last&&last.start+last.size===row)last.size++;else groups.push({start:row,size:1});});
 groups.forEach(g=>{
  const values=readSheetValues_(sheet.getRange(g.start,1,g.size,11)),tail=readSheetValues_(sheet.getRange(g.start,13,g.size,2));
  values.forEach((v,i)=>out.set(g.start+i,{...Object.fromEntries(ENTRY_HEADERS.slice(0,11).map((h,k)=>[h,String(v[k]??'')])),body:'',completedAt:String(tail[i][0]||''),tags:String(tail[i][1]||'')}));
 });return rows.map(row=>({...out.get(row)}));
}

function entrySearch_(field,pattern) {
 const sheet=db_().getSheetByName('Entries');ensureEntryTagHeader_(sheet);
 const size=sheet.getLastRow()-1;if(size<=0)return [];
 if(size<=500){
  if(!ENTRY_SMALL_CACHE){
   const values=readSheetValues_(sheet.getRange(2,1,size,11)),completed=readSheetValues_(sheet.getRange(2,13,size,2));
   ENTRY_SMALL_CACHE=values.map((v,i)=>({...Object.fromEntries(ENTRY_HEADERS.slice(0,11).map((h,k)=>[h,String(v[k]??'')])),body:'',completedAt:String(completed[i][0]||''),tags:String(completed[i][1]||'')}));
  }
  const regex=new RegExp(pattern,'i');return ENTRY_SMALL_CACHE.filter(e=>regex.test(e[field]||'')).map(e=>({...e}));
 }
 const found=findRows_(sheet,ENTRY_HEADERS.indexOf(field)+1,pattern,true).sort((a,b)=>a-b);
 const groups=[];found.forEach(row=>{const last=groups[groups.length-1];if(last&&last[last.length-1]+1===row)last.push(row);else groups.push([row]);});
 const out=[];groups.forEach(group=>{
  const values=readSheetValues_(sheet.getRange(group[0],1,group.length,11));
  const completed=readSheetValues_(sheet.getRange(group[0],13,group.length,2));
  values.forEach((v,i)=>out.push({...Object.fromEntries(ENTRY_HEADERS.slice(0,11).map((h,k)=>[h,String(v[k]??'')])),body:'',completedAt:String(completed[i][0]||''),tags:String(completed[i][1]||'')}));
 });return out;
}

function ref_(entryId) {
 const sheet=db_().getSheetByName('DocRefs'),row=ioIndex_(sheet,REF_HEADERS.length).get(entryId);return row?Object.fromEntries(REF_HEADERS.map((h,i)=>[h,row[i]])):null;
}
function managed_(key) {
 const sheet=db_().getSheetByName('Registry'),row=ioIndex_(sheet,REG_HEADERS.length).get(key);return row?Object.fromEntries(REG_HEADERS.map((h,i)=>[h,row[i]])):null;
}
function register_(key,kind,id,parent) {append_(db_().getSheetByName('Registry'),[[key,kind,id,parent]]);}
function root_() {return traceMeasure_('driveRoot',()=>{
 if(IO.root)return IO.root;
 const id=PropertiesService.getScriptProperties().getProperty('ROOT_ID');
 if(!id)throw new Error('Configura ROOT_FOLDER_ID ed esegui setupDrive dall’editor.');
 const root=DriveApp.getFolderById(id);if(traceMeasure_('driveTrash',()=>root.isTrashed()))throw new Error('Cartella principale nel cestino.');return IO.root=root;
});}
function inside_(item) {return traceMeasure_('driveInside',()=>{
 const itemId=item.getId();if(IO.inside.has(itemId)){traceCount_('driveInsideMemoHits');return;}
 const rootId=root_().getId(),queue=[{item,path:[]}],seen=new Set();
 while(queue.length){const current=queue.pop(),x=current.item,id=x.getId();
  if(id===rootId||IO.inside.has(id)){
   if(id!==rootId)traceCount_('driveInsideMemoHits');
   // Only the successful ancestry path is proven inside this archive.
   // Never cache unrelated branches, and never retain this proof across requests.
   current.path.forEach(parentId=>IO.inside.add(parentId));IO.inside.add(id);return;
  }
  if(seen.has(id))continue;seen.add(id);traceCount_('driveInsideNodes');
  const parents=traceMeasure_('driveParents',()=>{const iterator=x.getParents(),items=[];while(iterator.hasNext()){items.push(iterator.next());traceCount_('driveParentEdges');}return items;});
  const path=current.path.concat(id);parents.forEach(parent=>queue.push({item:parent,path}));
 }
 throw new Error('File o cartella spostato fuori dalla directory assegnata. Ripristina il percorso prima di proseguire.');
});}
function folder_(key,parent,name) {
 if(IO.folders.has(key))return IO.folders.get(key);const record=managed_(key);if(record){const f=DriveApp.getFolderById(record.id);if(f.isTrashed())throw new Error('Cartella nel cestino: '+name);inside_(f);IO.folders.set(key,f);return f;}
 inside_(parent);const found=parent.getFoldersByName(name);let f;
 if(found.hasNext()){f=found.next();if(found.hasNext())throw new Error('Più cartelle chiamate '+name+'. Risolvi l’ambiguità.');}else f=parent.createFolder(name);
 register_(key,'folder',f.getId(),parent.getId());IO.folders.set(key,f);IO.inside.add(f.getId());return f;
}
function doc_(key,parent,name) {
 const record=managed_(key);if(record){const f=traceMeasure_('drive',()=>DriveApp.getFileById(record.id));if(f.isTrashed())throw new Error('Documento nel cestino: '+name);inside_(f);return traceMeasure_('docsOpen',()=>DocumentApp.openById(record.id));}
 inside_(parent);const doc=DocumentApp.create(name);DriveApp.getFileById(doc.getId()).moveTo(parent);
 register_(key,'document',doc.getId(),parent.getId());doc.getBody().appendParagraph(name).setHeading(DocumentApp.ParagraphHeading.TITLE);return doc;
}
function projectFolder_(slug) {
 const parent=folder_('projects',root_(),'Progetti'),folder=folder_('project:'+slug,parent,slug);
 folder_('attachments:'+slug,folder,'Allegati');return folder;
}
function noteDoc_(e) {
 if(e.scope==='project'&&e.projects){const slug=e.projects.split(',')[0];return doc_('projectDoc:'+slug,projectFolder_(slug),slug+' — Note');}
 const diaries=folder_('diary',root_(),'Diario'),year=folder_('year:'+e.date.slice(0,4),diaries,e.date.slice(0,4));
 return doc_('month:'+e.date.slice(0,7),year,e.date.slice(0,7)+' — Diario');
}
function ensureSection_(e,initialText,rich){return ensureSections_([{e,text:initialText||'',rich}])[0];}
function ensureSections_(items){return traceMeasure_('docs',()=>{const groups=new Map(),result=[],refs=[],previews=[];let docs=[];try{
 items.forEach((item,index)=>{const e=item.e,r=ref_(e.id);if(r){result[index]=r;return;}const key=e.scope==='project'&&e.projects?'project:'+e.projects.split(',')[0]:'month:'+e.date.slice(0,7);let g=groups.get(key);if(!g){const doc=noteDoc_(e);g={doc,body:doc.getBody(),text:doc.getBody().getText()};groups.set(key,g);docs.push(doc);}const start='[BJ:'+e.id+']',end='[END:'+e.id+']';let title;const recovered=g.text.includes(start);if(!recovered){title=g.body.appendParagraph(e.date+' · '+e.text).setHeading(DocumentApp.ParagraphHeading.HEADING2);g.body.appendParagraph(start);if(item.rich)insertRich_(g.body,g.body.getNumChildren(),item.rich);else g.body.appendParagraph(item.text||'');g.body.appendParagraph(end);g.text+='\n'+start+'\n'+(item.text||'')+'\n'+end;}else{const match=g.body.findText('\\[BJ:'+e.id+'\\]');title=match.getElement().getParent();}const bookmark=g.doc.addBookmark(g.doc.newPosition(title.getChild(0),0)),record={entryId:e.id,docId:g.doc.getId(),bookmark:bookmark.getId(),docName:g.doc.getName(),updatedAt:new Date().toISOString()};result[index]=record;refs.push(REF_HEADERS.map(h=>record[h]));if(recovered){const text=sectionText_(record,{[record.docId]:g.text}),rich=sectionRich_(record,g.body).rich;previews.push(previewValues_(e.id,text,rich));}else previews.push(previewValues_(e.id,item.text||'',item.rich));});
 docs.forEach(doc=>traceMeasure_('docsWrite',()=>doc.saveAndClose()));docs=[];if(refs.length)append_(db_().getSheetByName('DocRefs'),refs);if(previews.length)upsertPreviews_(previews);return result;
 }finally{docs.forEach(doc=>{try{traceMeasure_('docsWrite',()=>doc.saveAndClose());}catch(ignore){}});}});}
function syncRequestDocs_(requestId) {
 root_();const sheet=db_().getSheetByName('Entries');
 ensureSections_(readEntries_(findRows_(sheet,10,requestId,false)).map(e=>({e,text:''})));
}
function setupDrive() {
 setup();return locked_(function(){
  if(!/^[a-zA-Z0-9_-]{10,}$/.test(ROOT_FOLDER_ID)||ROOT_FOLDER_ID==='INCOLLA_ID_CARTELLA')throw new Error('Inserisci l’ID cartella in DriveDocs.gs.');
  const props=PropertiesService.getScriptProperties(),previous=props.getProperty('ROOT_ID');
  if(previous&&previous!==ROOT_FOLDER_ID)throw new Error('Archivio già assegnato a una cartella diversa. Non cambiare ID senza migrazione.');
  const root=DriveApp.getFolderById(ROOT_FOLDER_ID);if(root.isTrashed())throw new Error('Cartella nel cestino.');
  // The assigned root and the associated Sheet are explicitly configured by the owner.
  props.setProperty('ROOT_ID',root.getId());
  DriveApp.getFileById(db_().getId()).moveTo(root);
  folder_('diary',root,'Diario');folder_('projects',root,'Progetti');folder_('exports',root,'Esportazioni NotebookLM');
  return 'Cartella configurata: '+root.getUrl()+'. Esegui migrateDocsBatch per le note precedenti.';
 });
}
function migrateDocsBatch(){return locked_(function(){root_();const sheet=db_().getSheetByName('Entries'),props=PropertiesService.getScriptProperties(),cursor=Number(props.getProperty('MIGRATION_ROW')||2),size=Math.min(15,Math.max(0,sheet.getLastRow()-cursor+1));if(!size)return {processed:0,remaining:0};ensureEntryTagHeader_(sheet);const values=sheet.getRange(cursor,1,size,14).getDisplayValues(),items=values.map(v=>({e:Object.fromEntries(ENTRY_HEADERS.map((h,i)=>[h,h==='body'?'':v[i]||''])),text:v[11]||''}));ensureSections_(items);props.setProperty('MIGRATION_ROW',String(cursor+size));return {processed:size,remaining:Math.max(0,sheet.getLastRow()-cursor-size+1)};});}
function sectionText_(r,docs) {return traceMeasure_('docs',()=>{
 const f=traceMeasure_('drive',()=>DriveApp.getFileById(r.docId));inside_(f);if(f.isTrashed())throw new Error('Documento nel cestino.');
 const text=docs&&docs[r.docId]!==undefined?docs[r.docId]:traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody().getText();if(docs)docs[r.docId]=text;
 const start='[BJ:'+r.entryId+']',end='[END:'+r.entryId+']',a=text.indexOf(start),b=text.indexOf(end,a+start.length);
 if(a<0||b<0)throw new Error('Marcatori della nota mancanti nel Doc. Ripristinali dalla cronologia del documento.');return text.slice(a+start.length,b).trim();
});}
function getEntryDetail(p) {
 return locked_(function(){const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Voce non trovata.');const e=readEntry_(found[0]);attachSchedules_([e]);const content=docContent_(e.id);if(content&&queuedTask_(e.id))return queuedDetail_(e,content);const r=prepareQueuedTask_(e);if(!r)throw new Error('Nota non ancora migrata. Esegui migrateDocsBatch.');attachSchedules_([e]);return {...e,docPending:false,...detailContent_(r),docName:r.docName,docUrl:'https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark};});
}
function getDriveInventory() {
 return locked_(function(){const root=root_();return {rootUrl:root.getUrl(),items:rows_(db_().getSheetByName('Registry'),REG_HEADERS).map(r=>({...r,url:r.kind==='folder'?'https://drive.google.com/drive/folders/'+r.id:'https://docs.google.com/document/d/'+r.id+'/edit'}))};});
}
function beginProjectExport(p) {
 return locked_(function(){const slug=slug_(p.project);if(entrySearch_('projects','(^|,)'+slug+'(,|$)').some(e=>queuedTask_(e.id)))throw Error('Attendi la sincronizzazione delle note prima di esportare il progetto.');const folder=folder_('exports',root_(),'Esportazioni NotebookLM'),doc=doc_('export:'+slug,folder,slug+' — Fonti NotebookLM');
 const jobs=db_().getSheetByName('ExportJobs');
 const running=findRows_(jobs,2,slug,false).map(row=>objectAt_(jobs,row,JOB_HEADERS)).find(j=>j.status==='running');
 if(running)return {id:running.id,status:'running',url:'https://docs.google.com/document/d/'+running.docId+'/edit'};
 const body=doc.getBody();body.clear();body.appendParagraph(slug+' — Fonti per NotebookLM').setHeading(DocumentApp.ParagraphHeading.TITLE);body.appendParagraph('ESPORTAZIONE IN CORSO — non usare finché non è completata.');traceMeasure_('docsWrite',()=>doc.saveAndClose());
 const id=Utilities.getUuid();append_(db_().getSheetByName('ExportJobs'),[[id,slug,doc.getId(),'0',new Date().toISOString(),'running']]);return {id,status:'running',url:'https://docs.google.com/document/d/'+doc.getId()+'/edit'};
 });
}
function continueProjectExport(p) {
 return locked_(function(){const sheet=db_().getSheetByName('ExportJobs'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Esportazione non trovata.');const job=objectAt_(sheet,found[0],JOB_HEADERS);
 if(job.status==='done')return {id:job.id,status:'done',url:'https://docs.google.com/document/d/'+job.docId+'/edit'};
 const file=traceMeasure_('drive',()=>DriveApp.getFileById(job.docId));inside_(file);const doc=traceMeasure_('docsOpen',()=>DocumentApp.openById(job.docId)),body=doc.getBody(),items=entrySearch_('projects','(^|,)'+job.project+'(,|$)').sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)),cursor=Number(job.cursor),batch=items.slice(cursor,cursor+10),docs={},exportFiles=rows_(db_().getSheetByName('Files'),FILE_HEADERS);const queued=batch.filter(e=>e.type==='task'&&queuedTask_(e.id)&&!ref_(e.id));if(queued.length)ensureSections_(queued.map(e=>({e,text:''})));
 batch.forEach(e=>{const marker='[EXPORT:'+job.id+':'+e.id+']';if(body.getText().includes(marker))return;const r=prepareQueuedTask_(e);if(!r)throw new Error('Nota '+e.text+' non migrata.');if(docContent_(e.id)&&queuedTask_(e.id))throw Error('Nota in attesa di sincronizzazione: riprova l’esportazione dopo il trigger.');const content=sectionText_(r,docs);body.appendParagraph(e.date+' · '+e.text).setHeading(DocumentApp.ParagraphHeading.HEADING2);body.appendParagraph(e.type==='task'?'Task: '+e.status+(e.due?' · Scadenza: '+e.due:''):'Nota');if(e.tags)body.appendParagraph('Tag: '+e.tags.split(',').map(t=>'#'+t).join(', '));body.appendParagraph(content||'(Nessun appunto aggiuntivo)');body.appendParagraph('Fonte: https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark);exportFiles.filter(f=>f.entryId===e.id).forEach(f=>{body.appendParagraph('Allegato: '+f.title+' — '+f.url);});body.appendParagraph(marker);});
 job.cursor=String(cursor+batch.length);job.status=Number(job.cursor)>=items.length?'done':'running';if(job.status==='done'){body.appendParagraph('Esportazione completata il '+new Date().toISOString()+'. I link agli allegati non ne importano il contenuto.');body.getChild(1).asParagraph().setText('Documento generato dall’app. Modifica le note originali, poi rigenera questa esportazione.');}traceMeasure_('docsWrite',()=>doc.saveAndClose());writeRow_(sheet,found[0],JOB_HEADERS.map(h=>job[h]));return {id:job.id,status:job.status,processed:Number(job.cursor),total:items.length,url:'https://docs.google.com/document/d/'+job.docId+'/edit'};
 });
}
function saveNoteText(p) {
 const started=Date.now(),phases={};let entered=0;ACTIVE_CONTEXT=p&&p.context||{};
 const result=locked_(function(){
 entered=Date.now();let phase=entered;
 const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Nota non trovata.');
 const e=readEntry_(found[0]);let r=ref_(e.id);
 const text=String(p.body||'').replace(/\r\n?/g,'\n');if(text.length>100000)throw new Error('Testo troppo lungo: massimo 100.000 caratteri in questo editor.');
 if(/\[(?:BJ|END):/.test(text))throw new Error('Il testo contiene un marcatore riservato.');
 if(e.updatedAt!==p.updatedAt)throw new Error('La nota è cambiata altrove. La bozza è conservata: riapri la nota e confronta i testi prima di salvare.');
 if(e.type==='task'&&p.due&&!validDate_(p.due))throw new Error('Scadenza non valida.');
 if(e.type==='task')ensurePlanHeaders_(db_().getSheetByName('TaskPlans'));
 const schedule=e.type==='task'&&Object.prototype.hasOwnProperty.call(p,'plannedDate')?taskSchedule_(p):null;
 const rich=validateRich_(p.rich||plainRich_(text),text);phases.sheetReadMs=Date.now()-phase;phase=Date.now();
 if(e.type==='task'&&text===p.originalBody&&p.originalRich&&richSignature_(rich)===richSignature_(p.originalRich)){
  e.due=p.due||'';e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();if(schedule)Object.assign(e,storeTaskSchedule_(e.id,schedule));else attachSchedules_([e]);ioInvalidate_(sheet);sheet.getRange(found[0],6,1,6).setNumberFormat('@').setValues([[e.due,e.status,e.createdAt,e.updatedAt,e.requestId,e.scope]]);phases.sheetWriteMs=Date.now()-phase;return {delta:true,metadataOnly:true,entries:[e],commonIncluded:false};
 }
 const previous=queuedTask_(e.id)?docContent_(e.id):null;
 if(previous&&(previous.body!==p.originalBody||p.originalRich&&richSignature_(writtenRich_(previous.rich))!==richSignature_(p.originalRich)))throw new Error('Il testo è cambiato nell’app. Riapri la nota: la bozza resta conservata.');
 e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1,previous?Date.parse(previous.version)+1:0)).toISOString();if(e.type==='task')e.due=p.due||'';
 const content={body:text,rich,version:e.updatedAt,baselineBody:previous?previous.baselineBody:String(p.originalBody||''),baselineRich:previous?previous.baselineRich:(p.originalRich||null),headerTitle:e.text,baselineTitle:previous?(previous.baselineTitle??e.text):e.text,baselineHeading:previous?.baselineHeading??null,editorAutoTitle:docContent_(e.id)?.editorAutoTitle===true};
 queueDocWrites_([{e,content}]);
 if(schedule)Object.assign(e,storeTaskSchedule_(e.id,schedule));else attachSchedules_([e]);
 writeRow_(sheet,found[0],ENTRY_HEADERS.map(h=>e[h]||''));phases.sheetWriteMs=Date.now()-phase;phase=Date.now();
 const detail=queuedDetail_(e,content);
 phases.responseMs=Date.now()-phase;return {delta:true,entries:[detail],commonIncluded:false};
 });
 const total=Date.now()-started;result.performance={kind:'noteSave',traceId:ACTIVE_CONTEXT.traceId||'',totalMs:total,lockWaitMs:entered-started,...phases,finaliseMs:Math.max(0,total-(entered-started)-Object.values(phases).reduce((a,b)=>a+b,0))};return result;
}

function planTask(p){
 ACTIVE_CONTEXT=p.context||{};return locked_(function(){if(!validDate_(p.date||''))throw new Error('Giorno programmato non valido.');const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Task non trovato.');const e=readEntry_(found[0]);if(e.type!=='task'||e.updatedAt!==p.updatedAt)throw new Error('Task cambiato: aggiorna prima di programmarlo.');const plans=db_().getSheetByName('TaskPlans');ensurePlanHeaders_(plans,true);const rows=findRows_(plans,1,p.id,false),values=[p.id,p.date,new Date().toISOString(),'','',taskImportance_(rows.length?rows_(plans,PLAN_HEADERS).find(v=>v.entryId===p.id).importance:'')];if(rows.length)writeRow_(plans,rows[0],PLAN_HEADERS.map((h,i)=>values[i]));else append_(plans,[values]);e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();ioInvalidate_(sheet);sheet.getRange(found[0],9).setValues([[e.updatedAt]]);attachSchedules_([e]);return {delta:true,metadataOnly:true,entries:[e],commonPatch:{taskPlans:rows_(plans,PLAN_HEADERS)},commonIncluded:false};});
}
function searchArchive(p){
 return locked_(function(){const q=String(p.query||'').trim().toLowerCase();if(q.length<2||q.length>200)throw new Error('Scrivi da 2 a 200 caratteri.');
 const refs=rows_(db_().getSheetByName('DocRefs'),REF_HEADERS),docIds=Array.from(new Set(refs.map(r=>r.docId))).sort(),cursor=Math.max(0,Number(p.cursor)||0),batch=docIds.slice(cursor,cursor+5),docs={},errors=[];
 batch.forEach(id=>{try{const file=traceMeasure_('drive',()=>DriveApp.getFileById(id));inside_(file);if(file.isTrashed())throw new Error('Documento nel cestino.');docs[id]=traceMeasure_('docsOpen',()=>DocumentApp.openById(id)).getBody().getText();}catch(e){errors.push({docId:id,message:e.message||String(e)});}});
 const all=entrySearch_('date','.'),files=rows_(db_().getSheetByName('Files'),FILE_HEADERS),results=[];
 all.forEach(e=>{const r=refs.find(r=>r.entryId===e.id),metadata=cursor===0&&[e.text,e.projects,e.tags||'',e.date,...files.filter(f=>f.entryId===e.id).map(f=>f.title)].join(' ').toLowerCase().includes(q);let body='',match=false;const pending=queuedTask_(e.id);if(pending&&cursor===0){try{const content=docContent_(e.id);body=content?content.body:'';match=body.toLowerCase().includes(q);}catch(err){errors.push({entryId:e.id,message:err.message});}}if(!pending&&r&&docs[r.docId]!==undefined){try{body=sectionText_(r,docs);match=body.toLowerCase().includes(q);}catch(err){errors.push({entryId:e.id,message:err.message});}}if(metadata||match){const pos=body.toLowerCase().indexOf(q);results.push({...e,excerpt:body.slice(Math.max(0,pos-60),Math.max(0,pos-60)+220),docName:r&&r.docName,docUrl:r?'https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark:''});}});
 return {entries:results,files:cursor===0?files:[],projects:cursor===0?rows_(db_().getSheetByName('Projects'),PROJECT_HEADERS).filter(x=>(x.name+' '+x.description).toLowerCase().includes(q)):[],nextCursor:cursor+batch.length,totalDocs:docIds.length,done:cursor+batch.length>=docIds.length,errors};
 });
}
function getJournalPreviews(p){return locked_(function(){const docs={},result=[],refs=rows_(db_().getSheetByName('DocRefs'),REF_HEADERS);(p.ids||[]).slice(0,12).forEach(id=>{try{const r=refs.find(r=>r.entryId===id);if(r)result.push({id,excerpt:sectionText_(r,docs).slice(0,220)});}catch(e){result.push({id,excerpt:''});}});return result;});}
function addCompleteNote(p){
 const started=Date.now();let entered=0,sheetsMs=0,sectionMs=0;ACTIVE_CONTEXT=p&&p.context||{};
 if(!p||!validDate_(p.date)||!/^[a-zA-Z0-9-]{10,80}$/.test(p.requestId||''))throw new Error('Data o richiesta non valida.');
 const title=String(p.title||'').trim(),body=String(p.body||'').replace(/\r\n?/g,'\n');
 if(!title||title.length>2000||/[\r\n]/.test(title))throw new Error('Inserisci un titolo su una riga, massimo 2.000 caratteri.');
 if(!body.trim()||body.length>100000)throw new Error('Inserisci il testo della nota, massimo 100.000 caratteri.');
 if(/\[(?:BJ|END):/.test(body))throw new Error('Il testo contiene marcatori riservati.');
 if(!['personal','project'].includes(p.scope))throw new Error('Ambito non valido.');
 const tags=normaliseTags_(p.tags||'');const projects=Array.from(new Set(String(p.projects||'').split(',').map(s=>s.trim()).filter(Boolean).map(slug_))).join(',');
 if(p.scope==='project'&&!projects)throw new Error('Indica almeno un progetto.');
 const rich=p.rich?validateRich_(p.rich,body):null;const result=locked_(function(){entered=Date.now();const sheetStarted=Date.now();const sheet=db_().getSheetByName('Entries'),existing=findRows_(sheet,10,p.requestId,false);let e;
 if(existing.length)e=readEntry_(existing[0]);else{const now=new Date().toISOString();e={id:Utilities.getUuid(),date:p.date,type:'note',text:title,projects,tags,due:'',status:'',createdAt:now,updatedAt:now,requestId:p.requestId,scope:projects?'project':p.scope,body:'',completedAt:''};append_(sheet,[ENTRY_HEADERS.map(h=>e[h]||'')]);}
 sheetsMs=Date.now()-sheetStarted;const sectionStarted=Date.now();let content=docContent_(e.id);if(!content&&!ref_(e.id)){content={body,rich:rich||plainRich_(body),version:e.updatedAt,baselineBody:null,baselineRich:null,headerTitle:e.text,baselineTitle:null};queueDocWrites_([{e,content}]);}if(content&&!ref_(e.id)&&!queuedTask_(e.id))queueDocWrites_([{e,content}]);sectionMs=Date.now()-sectionStarted;const r=ref_(e.id);return {delta:true,entries:[content?{...queuedDetail_(e,content),docPending:queuedTask_(e.id)}:{...e,excerpt:'',docPending:queuedTask_(e.id),docName:r?.docName||'',docUrl:r?'https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark:''}],commonIncluded:false};});result.performance={totalMs:Date.now()-started,lockWaitMs:entered-started,sheetsMs,sectionMs,finaliseMs:Math.max(0,Date.now()-entered-sheetsMs-sectionMs)};return result;
}
function previewSheet_(){if(IO.previewSheet)return IO.previewSheet;const db=db_();let sheet=db.getSheetByName('Previews');if(!sheet){sheet=db.insertSheet('Previews');sheet.getRange(1,1,1,3).setValues([['entryId','excerpt','updatedAt']]);sheet.setFrozenRows(1);}if(sheet.getRange(1,4).getDisplayValues()[0][0]!=='richExcerpt')sheet.getRange(1,4).setValues([['richExcerpt']]);return IO.previewSheet=sheet;}
function previewRuns_(blocks){const out=[];let remaining=220;for(const [i,b] of (blocks||[]).entries()){if(i&&remaining){out.push({text:'\n'});remaining--;}for(const r of b.runs||[]){if(!remaining)break;const text=String(r.text||'').slice(0,remaining);if(text)out.push({text,bold:!!r.bold,italic:!!r.italic});remaining-=text.length;}if(!remaining)break;}return out;}
function readPreviewRuns_(raw){try{const runs=JSON.parse(raw||'[]');return Array.isArray(runs)?runs:[];}catch(e){return [];}}
function previewValues_(id,text,rich){return [id,String(text||'').slice(0,220),new Date().toISOString(),JSON.stringify(previewRuns_(rich||plainRich_(text||'')))];}
function storePreview_(id,text,rich){upsertPreviews_([previewValues_(id,text,rich)]);}
function upsertPreviews_(records){if(!records.length)return;const sheet=previewSheet_(),data=ioRows_(sheet,4).map(r=>r.slice()),indices=new Map(data.map((r,i)=>[r[0],i]));const updates=new Map(),added=[];records.forEach(r=>{const index=indices.get(r[0]);if(index===undefined){const existing=added.findIndex(v=>v[0]===r[0]);if(existing<0)added.push(r);else added[existing]=r;}else if(JSON.stringify(data[index])!==JSON.stringify(r))updates.set(index+2,r);});const groups=[];[...updates.entries()].sort(([a],[b])=>a-b).forEach(([row,values])=>{const last=groups[groups.length-1];if(last&&last.start+last.values.length===row)last.values.push(values);else groups.push({start:row,values:[values]});});groups.forEach(g=>writeRows_(sheet,g.start,g.values));if(added.length)append_(sheet,added);}
function refreshNotePreviews(p){ACTIVE_CONTEXT=p.context||{};return locked_(function(){const errors=[],ids=Array.from(new Set(p.ids||[])).slice(0,12),sources=new Map(),texts={},previews=[],entries=entrySearch_('id','^('+ids.join('|')+')$'),map=new Map(entries.map(e=>[e.id,e])),updated=[];ids.forEach(id=>{try{const e=map.get(id);if(!e)return;const content=docContent_(id);if(content&&queuedTask_(id)){previews.push(previewValues_(id,content.body,content.rich));updated.push(queuedDetail_(e,content));return;}const r=prepareQueuedTask_(e);if(!r)return;let body=sources.get(r.docId);if(!body){body=traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody();sources.set(r.docId,body);texts[r.docId]=body.getText();}const text=sectionText_(r,texts),rich=sectionRich_(r,body).rich;previews.push(previewValues_(id,text,rich));updated.push({...e,excerpt:text.slice(0,220),previewRich:previewRuns_(rich),docPending:false});}catch(err){errors.push({id,message:err.message||String(err)});}});upsertPreviews_(previews);attachSchedules_(updated);return {delta:true,metadataOnly:true,entries:updated,commonIncluded:false,previewErrors:errors};});}
function deleteNote(p){
 ACTIVE_CONTEXT=p&&p.context||{};return locked_(function(){
 const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);
 if(!found.length)return state_();const e=readEntry_(found[0]);if(e.updatedAt!==p.updatedAt)throw new Error('La nota è cambiata. Aggiorna prima di eliminarla.');
 const r=ref_(e.id);if(r){const file=traceMeasure_('drive',()=>DriveApp.getFileById(r.docId));inside_(file);if(file.isTrashed())throw new Error('Documento nel cestino: ripristinalo prima di eliminare la voce.');const doc=traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)),body=doc.getBody(),starts=[],ends=[];
 for(let i=0;i<body.getNumChildren();i++){const c=body.getChild(i);if(c.getText){const text=c.getText();if(text==='[BJ:'+e.id+']')starts.push(i);if(text==='[END:'+e.id+']')ends.push(i);}}
 if(starts.length||ends.length){if(starts.length!==1||ends.length!==1||ends[0]<=starts[0])throw new Error('Marcatori parziali o duplicati: ripristina la sezione dalla cronologia Docs prima di eliminarla.');let a=starts[0],b=ends[0];for(let i=a+1;i<b;i++){const c=body.getChild(i);if(c.getText&&/\[(?:BJ|END):/.test(c.getText()))throw new Error('La sezione contiene marcatori di altre note: ripristina la struttura prima di eliminare.');}const savedContent=docContent_(e.id);if(a>0&&[e.text,savedContent?.baselineTitle,savedContent?.headerTitle].filter(t=>t!==undefined&&t!==null).some(t=>body.getChild(a-1).getText()===e.date+' · '+t))a--;if(b===body.getNumChildren()-1)body.appendParagraph('');for(let i=b;i>=a;i--)body.removeChild(body.getChild(i));traceMeasure_('docsWrite',()=>doc.saveAndClose());}
 }
 [['Files',2],['DocRefs',1],['TaskPlans',1],['Previews',1],['TaskDocQueue',1],['DocContent',2],['JournalLayout',1]].forEach(([name,col])=>{const s=db_().getSheetByName(name);if(s)findRows_(s,col,e.id,false).sort((a,b)=>b-a).forEach(row=>s.deleteRow(row));ioInvalidate_(s);});sheet.deleteRow(found[0]);ioInvalidate_(sheet);ENTRY_SMALL_CACHE=null;const result=state_();result.deletedNoteId=e.id;return result;
 });
}

// Rich text is persisted on Sheets while queued, then consolidated in Docs.
const RICH_KINDS_=['p','h1','h2','h3','quote','code','ul','ol','check'];
const RICH_FONTS_=['Arial','Georgia','Times New Roman','Courier New'];
function validateRich_(blocks,text){
 if(!Array.isArray(blocks)||blocks.length>3000)throw Error('Formato della nota non valido.');let count=0;
 const clean=blocks.map(b=>{if(!b||!RICH_KINDS_.includes(b.kind)||!Array.isArray(b.runs))throw Error('Paragrafo non valido.');const result={kind:b.kind,runs:b.runs.map(r=>{if(++count>20000||typeof r.text!=='string'||/[\r\n]/.test(r.text))throw Error('Testo formattato non valido.');const v={text:r.text};['bold','italic','underline','strike'].forEach(k=>{if(r[k])v[k]=true;});if(r.size!==undefined){if(![10,11,12,14,18,24,32].includes(Number(r.size)))throw Error('Dimensione non supportata.');v.size=Number(r.size);}if(r.font){if(!RICH_FONTS_.includes(r.font))throw Error('Font non supportato.');v.font=r.font;}for(const k of ['color','highlight'])if(r[k]){if(!/^#[0-9a-f]{6}$/i.test(r[k]))throw Error('Colore non valido.');v[k]=r[k].toLowerCase();}if(r.link){if(!/^https?:\/\//i.test(r.link)||r.link.length>2000)throw Error('Link non valido.');v.link=r.link;}return v;})};if(b.kind==='check'&&!/^[☐☑] /.test(result.runs.map(r=>r.text).join('')))throw Error('Checklist non valida.');return result;});
 if(clean.map(b=>b.runs.map(r=>r.text).join('')).join('\n')!==text)throw Error('Il testo e la formattazione non corrispondono.');return clean;
}
function insertRich_(body,index,blocks){return traceMeasure_('docs',()=>{blocks.forEach((b,i)=>{
 const list=['ul','ol'].includes(b.kind),text=b.runs.map(r=>r.text).join(''),p=list?body.insertListItem(index+i,text):body.insertParagraph(index+i,text);
 if(list){p.setGlyphType(b.kind==='ol'?DocumentApp.GlyphType.NUMBER:DocumentApp.GlyphType.BULLET);if(i>0&&blocks[i-1].kind===b.kind)p.setListId(body.getChild(index+i-1).asListItem());}
 else{p.setHeading(['h1','h2','h3'].includes(b.kind)?DocumentApp.ParagraphHeading['HEADING'+b.kind[1]]:DocumentApp.ParagraphHeading.NORMAL);p.setIndentStart(b.kind==='quote'?18:b.kind==='code'?12:0);}
 const t=p.editAsText();let at=0;b.runs.forEach(r=>{if(r.text.length){const end=at+r.text.length-1;t.setLinkUrl(at,end,r.link||null);const a={};a[DocumentApp.Attribute.BOLD]=!!r.bold||['h1','h2','h3'].includes(b.kind);a[DocumentApp.Attribute.ITALIC]=!!r.italic;a[DocumentApp.Attribute.UNDERLINE]=!!r.underline;a[DocumentApp.Attribute.STRIKETHROUGH]=!!r.strike;a[DocumentApp.Attribute.FONT_SIZE]=r.size||({h1:24,h2:18,h3:14}[b.kind]||12);a[DocumentApp.Attribute.FONT_FAMILY]=b.kind==='code'?'Courier New':r.font||'Arial';a[DocumentApp.Attribute.FOREGROUND_COLOR]=r.color||(r.link?'#1155cc':'#000000');a[DocumentApp.Attribute.BACKGROUND_COLOR]=r.highlight||'#ffffff';t.setAttributes(at,end,a);}at+=r.text.length;});
 });});}
function sectionRich_(r,sourceBody,sourceIndex){return traceMeasure_('docs',()=>{
 const body=sourceBody||traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody(),blocks=[],starts=[],ends=[];if(sourceIndex){starts.push(...(sourceIndex.get('[BJ:'+r.entryId+']')||[]));ends.push(...(sourceIndex.get('[END:'+r.entryId+']')||[]));}else{for(let i=0;i<body.getNumChildren();i++){const c=body.getChild(i),v=c.getText?c.getText():'';if(v==='[BJ:'+r.entryId+']')starts.push(i);if(v==='[END:'+r.entryId+']')ends.push(i);}}if(starts.length!==1||ends.length!==1||ends[0]<=starts[0])throw Error('Marcatori della nota mancanti o duplicati. Ripristina il documento dalla cronologia.');let unsupported=false;
 for(let i=starts[0]+1;i<ends[0];i++){const p=body.getChild(i),text=p.getText?p.getText():'';if(![DocumentApp.ElementType.PARAGRAPH,DocumentApp.ElementType.LIST_ITEM].includes(p.getType())){unsupported=true;continue;}for(let j=0;j<p.getNumChildren();j++)if(p.getChild(j).getType()!==DocumentApp.ElementType.TEXT)unsupported=true;
 const list=p.getType()===DocumentApp.ElementType.LIST_ITEM,heading=list?'':p.getHeading(),indent=list?0:p.getIndentStart()||0;
 let kind=list?([DocumentApp.GlyphType.BULLET,DocumentApp.GlyphType.HOLLOW_BULLET,DocumentApp.GlyphType.SQUARE_BULLET].includes(p.getGlyphType())?'ul':'ol'):[1,2,3].find(n=>heading===DocumentApp.ParagraphHeading['HEADING'+n])?'h'+[1,2,3].find(n=>heading===DocumentApp.ParagraphHeading['HEADING'+n]):'p';
 if(list&&(p.getNestingLevel()>0||![DocumentApp.GlyphType.BULLET,DocumentApp.GlyphType.HOLLOW_BULLET,DocumentApp.GlyphType.SQUARE_BULLET,DocumentApp.GlyphType.NUMBER].includes(p.getGlyphType())))unsupported=true;
 if(!list&&![DocumentApp.ParagraphHeading.NORMAL,...[1,2,3].map(n=>DocumentApp.ParagraphHeading['HEADING'+n])].includes(heading))unsupported=true;
 const t=p.editAsText(),indices=t.getTextAttributeIndices(),runs=[];
 if(kind==='p'){if(indent===18)kind='quote';else if(indent===12&&(!text||t.getFontFamily(0)==='Courier New'))kind='code';else if(indent!==0)unsupported=true;else if(/^[☐☑] /.test(text))kind='check';}
 indices.forEach((start,j)=>{const v={text:text.slice(start,j+1<indices.length?indices[j+1]:text.length)};if(t.isBold(start))v.bold=true;if(t.isItalic(start))v.italic=true;if(t.isUnderline(start))v.underline=true;if(t.isStrikethrough(start))v.strike=true;const size=t.getFontSize(start),font=t.getFontFamily(start),link=t.getLinkUrl(start),fg=t.getForegroundColor(start),bg=t.getBackgroundColor(start);if(size&&size!==12){if([10,11,14,18,24,32].includes(size))v.size=size;else unsupported=true;}if(font&&font!=='Arial'){if(RICH_FONTS_.includes(font))v.font=font;else unsupported=true;}if(link){if(/^https?:\/\//i.test(link))v.link=link;else unsupported=true;}if(fg&&!['#000000','#000000ff'].includes(fg.toLowerCase())&&!(link&&['#1155cc','#0000ff','#0563c1'].includes(fg.toLowerCase()))){if(/^#[0-9a-f]{6}$/i.test(fg))v.color=fg.toLowerCase();else unsupported=true;}if(bg&&!['#ffffff','#ffffffff'].includes(bg.toLowerCase())){if(/^#[0-9a-f]{6}$/i.test(bg))v.highlight=bg.toLowerCase();else unsupported=true;}runs.push(v);});blocks.push({kind,runs:runs.length?runs:[{text:''}]});
 }return {rich:blocks,richUnsupported:unsupported,sectionStart:starts[0],sectionEnd:ends[0]};
});}
function plainRich_(text){return text.split('\n').map(text=>({kind:'p',runs:[{text}]}));}
function normaliseRich_(blocks,writing){return blocks.map(b=>{const runs=[];b.runs.forEach(r=>{const v={text:r.text};if(r.bold||(writing&&r.text&&['h1','h2','h3'].includes(b.kind)))v.bold=true;for(const k of ['italic','underline','strike'])if(r[k])v[k]=true;const size=r.size||(writing&&r.text?({h1:24,h2:18,h3:14}[b.kind]||12):12);if(size!==12)v.size=size;const font=writing&&r.text&&b.kind==='code'?'Courier New':r.font;if(font&&font!=='Arial')v.font=font;for(const k of ['color','highlight'])if(r[k]&&r[k].toLowerCase()!==(k==='color'?'#000000':'#ffffff'))v[k]=r[k].toLowerCase();if(r.link){v.link=r.link;if(['#1155cc','#0000ff','#0563c1'].includes(v.color))delete v.color;}const previous=runs[runs.length-1],attrs=({text,...style})=>JSON.stringify(style);if(previous&&attrs(previous)===attrs(v))previous.text+=v.text;else runs.push(v);});return {kind:b.kind==='p'&&/^[☐☑] /.test(runs.map(r=>r.text).join(''))?'check':b.kind,runs:runs.length?runs:[{text:''}]};});}
function writtenRich_(blocks){return normaliseRich_(blocks,true);}
function richSignature_(value){return JSON.stringify(normaliseRich_(value,false));}

function detailContent_(r){return traceMeasure_('docs',()=>{const body=traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody();const docs={};docs[r.docId]=body.getText();return {body:sectionText_(r,docs),...sectionRich_(r,body)};});}

function weekEntries_(start,end){
 const sheet=db_().getSheetByName('Entries');
 if(sheet.getLastRow()-1<=500)return entrySearch_('id','.').filter(e=>(e.date>=start&&e.date<=end)||/^(open|doing)$/.test(e.status)||e.completedAt.startsWith(start.slice(0,7)+'-')||e.completedAt.startsWith(end.slice(0,7)+'-'));
 const entries=entrySearch_('date','^('+start.slice(0,7)+'|'+end.slice(0,7)+')-').filter(e=>e.date>=start&&e.date<=end),map=new Map(entries.map(e=>[e.id,e]));
 entrySearch_('status','^(open|doing)$').concat(entrySearch_('completedAt','^('+start.slice(0,7)+'|'+end.slice(0,7)+')-')).forEach(e=>map.set(e.id,e));return [...map.values()];
}

const IO_WIDTHS={Registry:4,DocRefs:5,Previews:4,TaskPlans:6,TaskDocQueue:4,JournalLayout:3};let IO={};
function ioReset_(){IO={tables:new Map(),folders:new Map(),inside:new Set(),root:null,previewSheet:null};}

function ioRows_(sheet,width){
 const key=sheet.getName(),cached=IO.tables.get(key);
 if(cached&&cached.width>=width)return cached.values.map(r=>r.slice(0,width));
 const size=sheet.getLastRow()-1;
 // Convertiamo tutto in stringhe garantendo compatibilità con gli indici attesi.
 const values=size>0?readSheetValues_(sheet.getRange(2,1,size,width)).map(row => row.map(v => String(v??''))) : [];
 IO.tables.set(key,{width,values});
 return values.map(r=>r.slice());
}

function ioInvalidate_(sheet){
  if(sheet&&IO.tables) IO.tables.delete(sheet.getName());
  if(sheet) {
    const name = sheet.getName();
    if (['Projects', 'Goals', 'Habits', 'TaskPlans'].includes(name)) {
      CacheService.getScriptCache().remove('DB_' + name);
    }
  }
}

function writeRows_(sheet,start,values){return traceMeasure_('sheets',()=>{if(!values.length)return;ioInvalidate_(sheet);sheet.getRange(start,1,values.length,values[0].length).setNumberFormat('@').setValues(values.map(r=>r.map(v=>/^[=+\-@']/.test(String(v))?"'"+v:String(v))));});}
const TASK_DOC_HEADERS=['entryId','status','updatedAt','error'];
function taskDocQueue_(create=false){let sheet=db_().getSheetByName('TaskDocQueue');if(!sheet&&create){sheet=db_().insertSheet('TaskDocQueue');sheet.getRange(1,1,1,4).setValues([TASK_DOC_HEADERS]);sheet.setFrozenRows(1);}if(sheet)verify_(sheet,TASK_DOC_HEADERS);return sheet;}
function queuedTask_(id){const sheet=taskDocQueue_();return sheet?ioRows_(sheet,4).some(r=>r[0]===id&&r[1]!=='done'):false;}
function deferTaskDocs_(entries){const sheet=taskDocQueue_(true),data=ioRows_(sheet,4),ids=new Set(data.map(r=>r[0])),newRows=[],result=entries.map(e=>{const existing=ref_(e.id);if(existing)return existing;if(!ids.has(e.id)){ids.add(e.id);newRows.push([e.id,'pending',new Date().toISOString(),'']);}return {entryId:e.id,pending:true};});if(newRows.length)append_(sheet,newRows);return result;}
function finishQueuedTask_(id){const sheet=taskDocQueue_();if(!sheet)return;const data=ioRows_(sheet,4),index=data.findIndex(r=>r[0]===id);if(index>=0)writeRow_(sheet,index+2,[id,'done',new Date().toISOString(),'']);}
function prepareQueuedTask_(e){let r=ref_(e.id);if(docContent_(e.id)&&queuedTask_(e.id))return r;if(e.type==='task'&&queuedTask_(e.id)){if(!r)r=ensureSection_(e,'');finishQueuedTask_(e.id);}return r;}

function ioIndex_(sheet,width){ioRows_(sheet,width);const snapshot=IO.tables.get(sheet.getName());if(!snapshot.index)snapshot.index=new Map(snapshot.values.map(r=>[r[0],r]));return snapshot.index;}
function attachPendingDocs_(entries){const sheet=taskDocQueue_();if(!sheet)return;const pending=new Map(ioRows_(sheet,4).filter(r=>r[1]!=='done').map(r=>[r[0],r]));entries.forEach(e=>{const job=pending.get(e.id);e.docPending=!!job;e.docQueueError=job?job[3]:'';});}
// Durable content is split below Sheets' 50,000-character cell limit.
const DOC_CONTENT_HEADERS=['key','entryId','part','payload'];
function docContentSheet_(create=false){let s=db_().getSheetByName('DocContent');if(!s&&create){s=db_().insertSheet('DocContent');s.getRange(1,1,1,4).setValues([DOC_CONTENT_HEADERS]);s.setFrozenRows(1);}if(s)verify_(s,DOC_CONTENT_HEADERS);return s;}
function docContent_(id){return traceMeasure_('docContent',()=>{
 if(!IO.docContents)IO.docContents=new Map();
 if(IO.docContents.has(id)){traceCount_('contentMemoryHits');return JSON.parse(JSON.stringify(IO.docContents.get(id)));}
 const s=docContentSheet_();if(!s)return null;
 const found=traceMeasure_('contentSearch',()=>findRows_(s,2,id,false)).sort((a,b)=>a-b),groups=[],heads=[];
 traceCount_('contentRowsFound',found.length);
 found.forEach(row=>{const last=groups[groups.length-1];if(last&&last.start+last.size===row)last.size++;else groups.push({start:row,size:1});});
 groups.forEach(g=>{const values=traceMeasure_('contentHeaders',()=>s.getRange(g.start,1,g.size,3).getDisplayValues());traceCount_('contentHeaderCells',g.size*3);values.forEach((v,i)=>heads.push({row:g.start+i,key:v[0],part:Number(v[2]),version:v[0].slice(id.length+1,v[0].lastIndexOf(':'))}));});
 if(!heads.length)return null;
 const chosen=traceMeasure_('contentVersion',()=>{const version=heads.map(h=>h.version).sort().pop();return heads.filter(h=>h.version===version).sort((a,b)=>a.part-b.part);}),ranges=[],data=new Map();
 if(ACTIVE_TRACE){traceDistribution_('contentVersions',new Set(heads.map(h=>h.version)).size);traceDistribution_('contentFragments',chosen.length);}
 chosen.forEach((h,i)=>{if(h.part!==i)throw Error('Contenuto persistente incompleto: '+id);const last=ranges[ranges.length-1];if(last&&last.start+last.size===h.row)last.size++;else ranges.push({start:h.row,size:1});});
 ranges.forEach(g=>{const values=traceMeasure_('contentPayload',()=>s.getRange(g.start,4,g.size,1).getDisplayValues());traceCount_('contentPayloadCells',g.size);values.forEach((v,i)=>{data.set(g.start+i,v[0]);if(ACTIVE_TRACE)traceCount_('contentPayloadBytes',traceBytes_(String(v[0]||'')));});});
 const content=traceMeasure_('contentAssemble',()=>JSON.parse(chosen.map(h=>data.get(h.row)).join('')));IO.docContents.set(id,content);return JSON.parse(JSON.stringify(content));
});}
function storeDocContents_(items){const s=docContentSheet_(true),added=[];items.forEach(({id,content})=>{const raw=JSON.stringify(content),previous=docContent_(id);if(previous&&previous.version===content.version){if(JSON.stringify(previous)!==raw)throw Error('Versione del contenuto già salvata: riapri il dettaglio.');return;}let part=0;for(let at=0;at<raw.length;){let end=Math.min(raw.length,at+30000);if(end<raw.length&&raw.charCodeAt(end-1)>=0xD800&&raw.charCodeAt(end-1)<=0xDBFF)end--;added.push([id+':'+content.version+':'+part,id,String(part++),raw.slice(at,end)]);at=end;}IO.docContents.set(id,JSON.parse(JSON.stringify(content)));});if(added.length)append_(s,added);}
function queueDocWrites_(items){return traceMeasure_('queue',()=>{items.forEach(x=>{if(x.content.body.length>100000||/\[(?:BJ|END):/.test(x.content.body))throw Error('Contenuto troppo lungo o marcatori riservati.');validateRich_(x.content.rich,x.content.body);});storeDocContents_(items.map(x=>({id:x.e.id,content:x.content})));const s=taskDocQueue_(true),data=ioRows_(s,4).map(r=>r.slice()),index=new Map(data.map((r,i)=>[r[0],i]));items.forEach(x=>{const row=[x.e.id,'pending',x.content.version,''];if(index.has(x.e.id))data[index.get(x.e.id)]=row;else{index.set(x.e.id,data.length);data.push(row);}});persistDocQueueRows_(data);upsertPreviews_(items.map(x=>previewValues_(x.e.id,x.content.body,x.content.rich)));return items.map(x=>({...ref_(x.e.id),entryId:x.e.id,pending:true}));});}
function queuedDetail_(e,content){const r=ref_(e.id);return {...e,body:content.body,rich:writtenRich_(content.rich),richUnsupported:false,excerpt:content.body.slice(0,220),previewRich:previewRuns_(content.rich),docPending:true,docQueueError:(taskDocQueue_()?ioRows_(taskDocQueue_(),4).find(q=>q[0]===e.id)?.[3]:'')||'',docName:r?r.docName:'Documento in attesa di sincronizzazione',docUrl:r?'https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark:''};}
function processTaskDocQueue(){return locked_(function(){const sheet=taskDocQueue_();if(!sheet)return {processed:0,pending:0,errors:[]};const data=ioRows_(sheet,4).map(r=>r.slice()),jobs=data.map((r,i)=>({r,i})).filter(j=>j.r[1]!=='done').sort((a,b)=>(a.r[1]==='pending'?0:1)-(b.r[1]==='pending'?0:1)||a.r[2].localeCompare(b.r[2])).slice(0,10),errors=[],success=new Set(),contents=new Map(),entries=new Map();let processed=0;
 jobs.forEach(j=>{try{const s=db_().getSheetByName('Entries'),rows=findRows_(s,1,j.r[0],false);if(!rows.length){success.add(j.r[0]);return;}const e=readEntry_(rows[0]);entries.set(e.id,e);const c=docContent_(e.id)||{body:'',rich:plainRich_(''),baselineBody:null,baselineRich:null,version:j.r[2]};validateRich_(c.rich,c.body);contents.set(e.id,c);}catch(err){errors.push({id:j.r[0],error:String(err.message||err)});}});
 // Create all missing sections grouped by destination document. Recovery is idempotent.
 let creationError='';const missing=[...entries.values()].filter(e=>contents.has(e.id)&&!ref_(e.id));if(missing.length){try{ensureSections_(missing.map(e=>({e,text:contents.get(e.id).body,rich:contents.get(e.id).rich})));}catch(err){creationError=String(err.message||err);}}
 const groups=new Map();entries.forEach(e=>{if(!contents.has(e.id))return;const r=ref_(e.id);if(!r){errors.push({id:e.id,error:creationError||'Documento non pronto: riproverò al prossimo passaggio.'});return;}if(!groups.has(r.docId))groups.set(r.docId,[]);groups.get(r.docId).push({e,r,c:contents.get(e.id)});});
 groups.forEach((items,docId)=>{let doc;const completed=[];try{const file=traceMeasure_('drive',()=>DriveApp.getFileById(docId));inside_(file);if(file.isTrashed())throw Error('Documento nel cestino.');doc=traceMeasure_('docsOpen',()=>DocumentApp.openById(docId));const body=doc.getBody();items.forEach(({e,r,c})=>{try{const current=sectionRich_(r,body);let heading=null;if(c.headerTitle!==undefined){heading=current.sectionStart>0?body.getChild(current.sectionStart-1):null;const wanted=e.date+' · '+c.headerTitle,base=c.baselineHeading??e.date+' · '+(c.baselineTitle??e.text);if(!heading||!heading.getText||![wanted,base].includes(heading.getText()))throw Error('Conflitto: il titolo è stato modificato direttamente in Docs.');}const text=sectionText_(r,{[docId]:body.getText()}),target=writtenRich_(c.rich),same=text===c.body.trim()&&richSignature_(current.rich)===richSignature_(target);if(!same){if(current.richUnsupported)throw Error('Formattazione avanzata in Docs: sincronizzazione fermata.');if(c.baselineBody===null){if(text!=='')throw Error('Conflitto con il contenuto già presente in Docs.');}else if(text!==c.baselineBody.trim()||(c.baselineRich&&richSignature_(current.rich)!==richSignature_(c.baselineRich)))throw Error('Conflitto: il documento è stato modificato direttamente. Il testo salvato nell’app resta conservato.');for(let i=current.sectionEnd-1;i>current.sectionStart;i--)body.removeChild(body.getChild(i));insertRich_(body,current.sectionStart+1,c.rich);}if(heading&&heading.getText()!==e.date+' · '+c.headerTitle)heading.asParagraph().setText(e.date+' · '+c.headerTitle);completed.push(e.id);}catch(err){errors.push({id:e.id,error:String(err.message||err)});}});traceMeasure_('docsWrite',()=>doc.saveAndClose());doc=null;completed.forEach(id=>success.add(id));}catch(err){items.forEach(({e})=>errors.push({id:e.id,error:String(err.message||err)}));}finally{if(doc)try{traceMeasure_('docsWrite',()=>doc.saveAndClose());}catch(ignore){}}});
 jobs.forEach(j=>{const id=j.r[0];if(success.has(id)){data[j.i]=[id,'done',new Date().toISOString(),''];processed++;}else data[j.i]=[id,'error',new Date().toISOString(),(errors.find(e=>e.id===id)?.error||'Sincronizzazione da riprovare').slice(0,1000)];});upsertPreviews_([...contents].map(([id,c])=>previewValues_(id,c.body,c.rich)));persistDocQueueRows_(data);return {processed,pending:data.filter(r=>r[1]!=='done').length,errors};},false,true);}

function rebaseDocQueue(p){if(!p||p.confirmed!==true)throw Error('Conferma esplicita richiesta.');return locked_(function(){const s=db_().getSheetByName('Entries'),found=findRows_(s,1,p.id,false);if(!found.length)throw Error('Voce non trovata.');const e=readEntry_(found[0]);if(e.updatedAt!==p.updatedAt)throw Error('Voce modificata: riapri il dettaglio.');const c=docContent_(e.id),r=ref_(e.id);if(!c||!r||!queuedTask_(e.id))throw Error('Nessuna sincronizzazione da sbloccare.');const actual=detailContent_(r);if(actual.richUnsupported)throw Error('Il documento contiene elementi avanzati: risolvi il conflitto in Google Docs.');const body=traceMeasure_('docsOpen',()=>DocumentApp.openById(r.docId)).getBody(),section=sectionRich_(r,body),heading=section.sectionStart>0?body.getChild(section.sectionStart-1).getText():'';c.conflictBackup={body:actual.body,rich:actual.rich,heading,at:new Date().toISOString()};c.baselineHeading=heading;c.baselineBody=actual.body;c.baselineRich=actual.rich;e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1,Date.parse(c.version)+1)).toISOString();c.version=e.updatedAt;queueDocWrites_([{e,content:c}]);writeRow_(s,found[0],ENTRY_HEADERS.map(h=>e[h]||''));attachSchedules_([e]);return {delta:true,entries:[queuedDetail_(e,c)],commonIncluded:false};});}

function persistDocQueueRows_(records){const s=taskDocQueue_(true),before=ioRows_(s,4),groups=[],added=[];records.forEach((row,i)=>{if(i>=before.length){added.push(row);return;}if(JSON.stringify(row)===JSON.stringify(before[i]))return;const n=i+2,last=groups[groups.length-1];if(last&&last.start+last.values.length===n)last.values.push(row);else groups.push({start:n,values:[row]});});groups.forEach(g=>writeRows_(s,g.start,g.values));if(added.length)append_(s,added);}
function getDocQueueState(){DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();const s=taskDocQueue_(),rows=s?ioRows_(s,4):[],active=rows.filter(r=>r[1]!=='done'),recent=rows.filter(r=>r[1]==='done').sort((a,b)=>b[2].localeCompare(a[2])).slice(0,20),selected=active.concat(recent),entries=new Map();if(selected.length){const es=db_().getSheetByName('Entries'),found=findRows_(es,1,'^('+selected.map(r=>r[0]).join('|')+')$',true);readEntries_(found).forEach(e=>entries.set(e.id,e));}return {pending:active.filter(r=>r[1]==='pending').length,errors:active.filter(r=>r[1]==='error').length,done:rows.filter(r=>r[1]==='done').length,items:selected.map(r=>{const e=entries.get(r[0]),ref=ref_(r[0]);return {id:r[0],status:r[1],updatedAt:r[2],error:r[3],title:e?e.text:'Voce non presente',tags:e?e.tags:'',type:e?e.type:'',operation:r[1]==='done'?'Scrittura sezione completata':ref?'Aggiornamento sezione':'Creazione sezione',docUrl:ref?'https://docs.google.com/document/d/'+ref.docId+'/edit#bookmark='+ref.bookmark:''};})};}
