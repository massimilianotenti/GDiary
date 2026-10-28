let DB_HANDLE=null,ENTRY_SMALL_CACHE=null,ENTRY_TAG_HEADER_CHECKED=false,ENTRY_TAG_HEADER_WRITTEN=false;
// Test/server injection only. Persisted routing is also resolved on each call.
let DAY_COMMIT_GATEWAY=null;
let DAY_ROUTING_CONTROLLER=null;
function dayCommitGateway_(){
 try{if(DAY_ROUTING_CONTROLLER)return DAY_ROUTING_CONTROLLER.resolve();if(DAY_COMMIT_GATEWAY)return DAY_COMMIT_GATEWAY;return syncDayRoutingServer_().resolve();}
 catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
}
const PLAN_HEADERS=['entryId','date','updatedAt','workStart','workEnd','importance'];
const ENTRY_HEADERS = ['id','date','type','text','projects','due','status','createdAt','updatedAt','requestId','scope','body','completedAt','tags'];
const PROJECT_HEADERS = ['slug','name','description','updatedAt'];
const FILE_HEADERS = ['id','entryId','fileId','title','url','addedAt'];
const WEEK_HEADERS = ['week','focus','priorities','wins','obstacles','lessons','next','energy','closed','updatedAt'];
const DAY_EXTRA_HEADERS=["gratitude", "lifeArea", "smallStep", "meaningfulMoment", "feelings", "difficulties", "learning", "intentionRich", "reflectionRich"];
const DAY_HEADERS = ['date','intention','reflection','updatedAt',...DAY_EXTRA_HEADERS];
const GOAL_HEADERS = ['id','cycle','title','target','progress','project','updatedAt','icon','description'];
const HABIT_HEADERS = ['id','goalId','title','days','start','updatedAt','steps','archived','icon','description'];
const REF_HEADERS=['entryId','docId','bookmark','docName','updatedAt'];
const REG_HEADERS=['key','kind','id','parent'];
const JOB_HEADERS=['id','project','docId','cursor','revision','status'];
let ACTIVE_CONTEXT={};
const LOG_HEADERS = ['key','habitId','date','status','updatedAt','checklist'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('GDiary')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Run once from the editor of the script bound to your spreadsheet.
function setup() {
  return locked_(function() {
    const db = SpreadsheetApp.getActiveSpreadsheet();
    if (!db) throw new Error('Apri lo script da Estensioni > Apps Script nel tuo Sheet.');
    taskIndexTouch_({getName:()=> 'Entries'});
    PropertiesService.getScriptProperties().setProperty('DB_ID', db.getId());
    [['Entries',ENTRY_HEADERS],['Projects',PROJECT_HEADERS],['Files',FILE_HEADERS],['Weeks',WEEK_HEADERS],['Days',DAY_HEADERS],['Goals',GOAL_HEADERS],['Habits',HABIT_HEADERS],['HabitLogs',LOG_HEADERS],['DocRefs',REF_HEADERS],['Registry',REG_HEADERS],['ExportJobs',JOB_HEADERS],['TaskPlans',PLAN_HEADERS]].forEach(function(pair) {
      let sheet = db.getSheetByName(pair[0]);
      if (!sheet) sheet = db.insertSheet(pair[0]);
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1,1,1,pair[1].length).setValues([pair[1]]);
        sheet.setFrozenRows(1);
      }
      // Safe additive migration from the original ten-column MVP.
      if (pair[0] === 'Entries' && sheet.getRange(1,11).getDisplayValues()[0][0] === '') {
        verify_(sheet, ENTRY_HEADERS.slice(0,10));
        sheet.getRange(1,11,1,3).setValues([ENTRY_HEADERS.slice(10,13)]);
        if (sheet.getLastRow()>1) {
          const old=sheet.getRange(2,1,sheet.getLastRow()-1,10).getDisplayValues();
          sheet.getRange(2,11,old.length,3).setNumberFormat('@').setValues(old.map(r=>[r[4]?'project':'personal','','']));
        }
      }
      if(pair[0]==='Entries')ensureEntryTagHeader_(sheet,true);
      if(pair[0]==='Days')ensureDayHeaders_(sheet,true);
      if(pair[0]==='Goals')ensureGoalIconHeader_(sheet,true);
      if(pair[0]==='Habits')ensureHabitHeaders_(sheet,true);
      verify_(sheet,pair[1]);
    });
    return 'Pronto: ' + db.getUrl();
  });
}

// Request-local diagnostics. No content or trace is persisted on Google.
let ACTIVE_TRACE=null,APP_LOCK_DEPTH=0;
function traceMeasure_(category,fn){
 if(!ACTIVE_TRACE)return fn();
 const trace=ACTIVE_TRACE,outer=!trace.depth[category],start=Date.now(),frame={children:0};
 trace.stack.push(frame);
 trace.depth[category]=(trace.depth[category]||0)+1;
 try{return fn();}finally{const elapsed=Date.now()-start,self=Math.max(0,elapsed-frame.children);trace.stack.pop();if(trace.stack.length)trace.stack[trace.stack.length-1].children+=elapsed;trace.accounted+=self;trace.metrics[category+'SelfMs']=(trace.metrics[category+'SelfMs']||0)+self;trace.depth[category]--;if(outer){trace.metrics[category+'Ms']=(trace.metrics[category+'Ms']||0)+elapsed;trace.metrics[category+'Calls']=(trace.metrics[category+'Calls']||0)+1;}}
}
function traceCount_(key,value=1){if(ACTIVE_TRACE)ACTIVE_TRACE.metrics[key]=(ACTIVE_TRACE.metrics[key]||0)+value;}
function traceBytes_(value){let bytes=0;for(let i=0;i<value.length;i++){const c=value.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xD800&&c<=0xDBFF&&i+1<value.length&&value.charCodeAt(i+1)>=0xDC00&&value.charCodeAt(i+1)<=0xDFFF){bytes+=4;i++;}else bytes+=3;}return bytes;}
function traceDistribution_(prefix,count){traceCount_(prefix+(count===1?'1':count<=3?'2to3':count<=9?'4to9':'10plus'));}
function traceApi(p){
 const handlers={getSyncManifest,benchmarkJournalCache,getState,getCommonState,getJournalPage,getJournalContents,getEntryDetail,saveJournalPage,saveDay,saveDays,saveWeek,setHabitLog,saveNoteText,addJournal,saveGoal,saveHabit,saveProject,setTaskStatus,saveReflectionSettings,savePrivacySettings,searchArchive,processTaskDocQueue,getDocQueueState,addFileLink,deleteHabit,deleteNote,rebaseDocQueue,refreshNotePreviews,setEntryProjects,setEntryTags,beginProjectExport,continueProjectExport,getDriveInventory,previewProjectAsTag,convertProjectToTag,getAppChangelog};
 if(!p||!Object.prototype.hasOwnProperty.call(handlers,p.operation)||!/^[-a-zA-Z0-9]{10,80}$/.test(p.traceId||''))throw Error('Richiesta diagnostica non valida.');
 const previous=ACTIVE_TRACE,start=Date.now(),trace={metrics:{},depth:{},stack:[],accounted:0};
 const diagnostics=()=>{const totalMs=Date.now()-start;return {traceId:p.traceId,totalMs,unaccountedMs:Math.max(0,totalMs-trace.accounted),...trace.metrics};};
 const arg={...(p.arg||{}),context:{...(p.arg&&p.arg.context||{}),traceId:p.traceId}};
 ACTIVE_TRACE=trace;ACTIVE_CONTEXT=arg.context;
 try{const value=handlers[p.operation](arg);return {ok:true,value,diagnostics:diagnostics()};}
 catch(error){return {ok:false,error:String(error.message||error),diagnostics:diagnostics()};}
 finally{ACTIVE_TRACE=previous;}
}
function locked_(fn,readOnly=false,background=false) {
  DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();
  const lock = LockService.getScriptLock();
  traceCount_('lockAttempts');traceCount_(background?'lockBackgroundAttempts':'lockForegroundAttempts');
  let acquired=false;
  try{acquired=traceMeasure_('lock',()=>traceMeasure_('lockWait',()=>{if(background)return lock.tryLock(0);lock.waitLock(30000);return true;}));}
  catch(error){traceCount_('lockAcquireErrors');throw error;}
  if(!acquired){traceCount_('lockBusy');return {processed:0,busy:true,pending:null,errors:[]};}
  traceCount_('lockAcquired');
  APP_LOCK_DEPTH++;const heldStarted=Date.now(),heldTrace=ACTIVE_TRACE;
  try{return traceMeasure_('lockHeld',()=>{try { return fn(); } finally { try { if(!readOnly)traceMeasure_('flush',()=>SpreadsheetApp.flush()); } finally { lock.releaseLock(); } }});}finally{if(heldTrace)heldTrace.metrics.lockHeldMaxMs=Math.max(heldTrace.metrics.lockHeldMaxMs||0,Date.now()-heldStarted);APP_LOCK_DEPTH--;}
}
function db_() {return traceMeasure_('sheets',()=>{
  if(DB_HANDLE)return DB_HANDLE;
  const id = PropertiesService.getScriptProperties().getProperty('DB_ID');
  if (!id) throw new Error('Esegui setup prima di usare la web app.');
  return DB_HANDLE=SpreadsheetApp.openById(id);
});}
function verify_(sheet,headers) {
  if(sheet.getName()==='Goals'){ensureGoalIconHeader_(sheet);return;}
  if(sheet.getName()==='Habits'||sheet.getName()==='HabitLogs'){ensureHabitHeaders_(sheet);return;}
  if(sheet.getName()==='TaskPlans'){ensurePlanHeaders_(sheet);return;}
  if(sheet.getName()==='Entries'&&headers.length===ENTRY_HEADERS.length){ensureEntryTagHeader_(sheet);return;}
  if (JSON.stringify(sheet.getRange(1,1,1,headers.length).getDisplayValues()[0]) !== JSON.stringify(headers))
    throw new Error('Intestazioni non valide in ' + sheet.getName());
}
function ensureEntryTagHeader_(sheet,write=false){
 if(ENTRY_TAG_HEADER_WRITTEN||ENTRY_TAG_HEADER_CHECKED&&!write)return;
 verify_(sheet,ENTRY_HEADERS.slice(0,13));const header=sheet.getRange(1,14).getDisplayValues()[0][0];
 if(header==='tags'){ENTRY_TAG_HEADER_CHECKED=true;ENTRY_TAG_HEADER_WRITTEN=true;return;}if(header!=='')throw new Error('La colonna 14 di Entries è già occupata. Nessun dato modificato.');
 ENTRY_TAG_HEADER_CHECKED=true;if(write){sheet.getRange(1,14).setValues([['tags']]);ENTRY_TAG_HEADER_WRITTEN=true;}
}
function normaliseTags_(value){
 if(typeof value!=='string'||value.length>2000)throw new Error('Tag: massimo 2000 caratteri.');
 const tags=Array.from(new Set(value.split(',').map(v=>v.trim().replace(/^#/,'').toLowerCase().normalize('NFC').replace(/\s+/g,'-')).filter(Boolean)));
 if(tags.length>30||tags.some(v=>!/^([\p{L}\p{N}_-]){1,60}$/u.test(v)))throw new Error('Tag: massimo 30 etichette di 60 caratteri, con lettere, numeri, trattini o underscore.');return tags.join(',');
}
function setEntryTags(p){ACTIVE_CONTEXT=p.context||{};const tags=normaliseTags_(p.tags||'');return locked_(function(){const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Voce non trovata.');const e=readEntry_(found[0]);if(e.updatedAt!==p.updatedAt)throw new Error('Voce modificata altrove. Aggiorna e riprova.');e.tags=tags;e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();ensureEntryTagHeader_(sheet,true);ioInvalidate_(sheet);sheet.getRange(found[0],14).setNumberFormat('@').setValues([[/^[=+\-@']/.test(tags)?"'"+tags:tags]]);sheet.getRange(found[0],9).setValues([[e.updatedAt]]);ENTRY_SMALL_CACHE=null;attachSchedules_([e]);return {delta:true,metadataOnly:true,preserveDetailId:e.id,entries:[e],commonIncluded:false};});}
function projectTagPlan_(slug){
 const db=db_(),project=rows_(db.getSheetByName('Projects'),PROJECT_HEADERS).find(p=>p.slug===slug)||null;
 const entries=entrySearch_('projects','(^|,)'+slug+'(,|$)');
 const goals=rows_(db.getSheetByName('Goals'),GOAL_HEADERS).filter(g=>g.project===slug);
 return {project,entries,goals,signature:JSON.stringify({project,entries:entries.map(e=>[e.id,e.updatedAt,e.projects,e.tags||'']),goals:goals.map(g=>[g.id,g.updatedAt])})};
}
function previewProjectAsTag(p){return locked_(function(){const slug=slug_(p.slug),plan=projectTagPlan_(slug);return {slug,name:plan.project?plan.project.name:slug,count:plan.entries.length,blockedGoals:plan.goals.map(g=>g.title),signature:plan.signature};},true);}
function convertProjectToTag(p){
 ACTIVE_CONTEXT=p.context||{};const slug=slug_(p.slug),tag=normaliseTags_(p.tag||slug);if(!tag||tag.includes(','))throw new Error('Scegli un solo tag di destinazione.');
 return locked_(function(){const plan=projectTagPlan_(slug);if(plan.goals.length)throw new Error('Questo progetto è collegato a obiettivi: correggi prima quei collegamenti.');if(p.signature!==plan.signature)throw new Error('Le voci sono cambiate. Riapri l’anteprima prima di convertire.');
  const db=db_(),sheet=db.getSheetByName('Entries'),changes=plan.entries.map(e=>({...e,projects:e.projects.split(',').filter(s=>s!==slug).join(','),tags:normaliseTags_((e.tags?e.tags+',':'')+tag)}));
  ensureEntryTagHeader_(sheet,true);const rows=changes.map(e=>{const found=findRows_(sheet,1,e.id,false);if(found.length!==1)throw new Error('Indice voce non valido.');return {row:found[0],entry:e};}).sort((a,b)=>a.row-b.row),groups=[];
  rows.forEach(item=>{const last=groups[groups.length-1];if(last&&last[last.length-1].row+1===item.row)last.push(item);else groups.push([item]);});
  if(changes.length){searchTouch_(sheet);taskIndexTouch_(sheet);}
  groups.forEach(group=>{const range=sheet.getRange(group[0].row,5,group.length,10),values=range.getDisplayValues();group.forEach((item,i)=>{const e=item.entry;values[i][0]=e.projects;e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();e.scope=e.projects?'project':'personal';values[i][4]=e.updatedAt;values[i][6]=e.scope;values[i][9]=e.tags;});range.setNumberFormat('@').setValues(values.map(r=>r.map(v=>/^[=+\-@']/.test(String(v))?"'"+v:String(v))));});
  if(plan.project){const projects=db.getSheetByName('Projects');searchTouch_(projects);const found=findRows_(projects,1,slug,false);found.sort((a,b)=>b-a).forEach(row=>projects.deleteRow(row));ioInvalidate_(projects);}
  ENTRY_SMALL_CACHE=null;if(ACTIVE_CONTEXT.incrementalCommon===true)return {delta:true,entries:[],commonIncluded:false,entryPatches:changes.map(e=>({id:e.id,projects:e.projects,tags:e.tags,updatedAt:e.updatedAt,scope:e.scope})),commonRemovals:{projects:[slug]},addedTags:changes.length?[tag]:[],convertedCount:changes.length};const result=state_();result.convertedCount=changes.length;return result;
 });
}
function ensureDayHeaders_(sheet,write=false){verify_(sheet,DAY_HEADERS.slice(0,4));const extra=sheet.getRange(1,5,1,DAY_EXTRA_HEADERS.length).getDisplayValues()[0];for(let i=0;i<extra.length;i++)if(extra[i]!==''&&extra[i]!==DAY_EXTRA_HEADERS[i])throw Error('Colonne di riflessione non valide in Days. Nessun dato modificato.');const present=extra.filter(Boolean).length;if(present!==0&&!(extra.slice(0,7).every((v,i)=>v===DAY_EXTRA_HEADERS[i])&&extra.slice(7).every(v=>v===''))&&!(extra.every((v,i)=>v===DAY_EXTRA_HEADERS[i])))throw Error('Colonne di riflessione parziali in Days. Nessun dato modificato.');if(write&&present!==9)sheet.getRange(1,5,1,DAY_EXTRA_HEADERS.length).setValues([DAY_EXTRA_HEADERS]);}
function reflectionSettings_(){const p=PropertiesService.getScriptProperties();return {dailyReflectionMode:p.getProperty('DAILY_REFLECTION_MODE')||'essential',version:p.getProperty('REFLECTION_SETTINGS_VERSION')||'',...privacySettings_()};}
function privacySettings_(){const p=PropertiesService.getScriptProperties();return {privateTags:JSON.parse(p.getProperty('PRIVATE_NOTE_TAGS')||'["privato"]'),privacyVersion:p.getProperty('PRIVATE_NOTE_TAGS_VERSION')||''};}
function savePrivacySettings(p){if(!p||!Array.isArray(p.privateTags)||p.privateTags.length>30)throw Error('Scegli al massimo 30 tag privati.');const tags=normaliseTags_(p.privateTags.join(',')).split(',').filter(Boolean);return locked_(function(){const current=privacySettings_();if((p.version||'')!==current.privacyVersion)throw Error('Tag privati modificati altrove. Aggiorna e riprova.');const props=PropertiesService.getScriptProperties();props.setProperty('PRIVATE_NOTE_TAGS',JSON.stringify(tags));props.setProperty('PRIVATE_NOTE_TAGS_VERSION',Utilities.getUuid());return privacySettings_();});}
function saveReflectionSettings(p){
  if(!p||!['essential','detailed'].includes(p.dailyReflectionMode))throw new Error('Modalità di riflessione non valida.');
  ACTIVE_CONTEXT=p.context||{};
  return locked_(function(){const current=reflectionSettings_();if((p.version||'')!==current.version)throw new Error('Impostazioni modificate altrove. Aggiorna e riprova.');
    const props=PropertiesService.getScriptProperties();props.setProperty('DAILY_REFLECTION_MODE',p.dailyReflectionMode);props.setProperty('REFLECTION_SETTINGS_VERSION',Utilities.getUuid());return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,settingsPatch:reflectionSettings_()}:state_();});
}
function rows_(sheet, headers) {
  if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='Days')ensureDayHeaders_(sheet);else verify_(sheet,headers);
  const records=sheet.getLastRow()<2?[]:ioRows_(sheet,headers.length)
    .map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return gateway.readRows();}
  return records;
}

function cachedRows_(sheet, headers) {
  const sheetName = sheet.getName();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'DB_' + sheetName;
  
  // Limite 100KB CacheService: lo usiamo solo per tabelle compatte
  const isCacheable = ['Projects', 'Goals', 'Habits', 'TaskPlans'].includes(sheetName);
  
  if (isCacheable) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try { const data=JSON.parse(cached); if(Array.isArray(data)&&data.every(row=>headers.every(h=>Object.prototype.hasOwnProperty.call(row,h))))return data; } catch (e) {}
    }
  }
  
  const data = rows_(sheet, headers);
  
  if (isCacheable) {
    try { cache.put(cacheKey, JSON.stringify(data), 21600); } catch(e) {} // Cache fino a 6 ore
  }
  return data;
}

function append_(sheet, rows) {return traceMeasure_('sheets',()=>{
  const cached=IO.tables&&IO.tables.get(sheet.getName());
  if (!rows.length) return;
  searchTouch_(sheet);taskIndexTouch_(sheet);
  if(sheet.getName()==='Entries')ensureEntryTagHeader_(sheet,true);
  const range = sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length);
  range.setNumberFormat('@');
  range.setValues(rows.map(r=>r.map(v=>/^[=+\-@']/.test(String(v)) ? "'"+v : String(v))));
  ioInvalidate_(sheet);
  if(cached)IO.tables.set(sheet.getName(),{width:cached.width,values:cached.values.concat(rows.map(r=>r.map(v=>String(v)).slice(0,cached.width)))});else ioInvalidate_(sheet);
});}
function validDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value+'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
function slug_(value) {
  const slug = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-');
  if (!/^[a-z0-9_-]{1,60}$/.test(slug)) throw new Error('Progetto: usa lettere, numeri, trattini o underscore (max 60).');
  return slug;
}
function parseJournal_(date, raw,legacyHashProjects=false) {
  if (!validDate_(date)) throw new Error('Data del diario non valida.');
  if (typeof raw !== 'string' || raw.length > 20000) throw new Error('Massimo 20.000 caratteri per invio.');
  const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!lines.length || lines.length>100) throw new Error('Inserisci da 1 a 100 righe.');
  return lines.filter(line=>line!==date).map(function(line) {
    let type = 'note', status = '', due = '';
    if (/^(☐|□|\[ \])\s*/.test(line)) { type='task'; status='open'; line=line.replace(/^(☐|□|\[ \])\s*/,''); }
    else if (/^(☑|\[x\])\s*/i.test(line)) { type='task'; status='done'; line=line.replace(/^(☑|\[x\])\s*/i,''); }
    else if (/^[–-]\s*/.test(line)) { type='idea'; line=line.replace(/^[–-]\s*/,''); }
    else line=line.replace(/^•\s*/,'');
    line=line.replace(/scadenza:\s*(\S+)/gi,function(_,value) {
      const italian=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);if(italian)value=italian[3]+'-'+italian[2]+'-'+italian[1];
      if (type!=='task' || !validDate_(value)) throw new Error('Scadenza non valida: usa un task e una data reale come 11/10/2026 oppure 2026-10-11.');
      due=value; return '';
    });
    const projects=[],tags=[];
    line=line.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu,function(_,prefix,tag) { if(legacyHashProjects){const slug=slug_(tag);if(!projects.includes(slug))projects.push(slug);}else tags.push(tag);return prefix; });
    const text=line.trim();
    if (!text) throw new Error('Ogni riga deve contenere un testo.');
    return {date,type,text,projects:projects.join(','),tags:normaliseTags_(tags.join(',')),due,status};
  });
}
// Stable identity contract only. Application persistence remains disabled until
// the real iframe/storage matrix and the repository protocol are validated.
function manifestPrincipal_(){
 try{const active=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase(),effective=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();return active&&effective&&active===effective?true:false;}catch(ignore){return false;}
}
function getSyncManifest(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 const base={protocolVersion:1,minClientProtocol:1,schemaVersion:1,capabilities:{localReadCache:false,changes:false,operations:false}};
 const blocked=reason=>({...base,identityVerified:false,reason});
 if(!manifestPrincipal_())return blocked('principalUnavailable');
 let props,dbId,rootId;try{props=PropertiesService.getScriptProperties();dbId=props.getProperty('DB_ID');rootId=props.getProperty('ROOT_ID');}catch(ignore){return blocked('identityUnavailable');}
 if(!dbId||!rootId)return blocked('notConfigured');
 DB_HANDLE=null;ioReset_();
 try{root_();const file=traceMeasure_('drive',()=>DriveApp.getFileById(dbId));if(file.isTrashed()||db_().getId()!==dbId)return blocked('archiveUnavailable');}catch(ignore){return blocked('archiveUnavailable');}
 try{const result=locked_(function(){
  if(!manifestPrincipal_())return blocked('principalUnavailable');
  if(props.getProperty('DB_ID')!==dbId||props.getProperty('ROOT_ID')!==rootId)return blocked('configurationChanged');
  const key='LOCAL_ARCHIVE_V1:'+JSON.stringify([dbId,rootId]);let raw=props.getProperty(key),record;
  if(raw){try{record=JSON.parse(raw);}catch(ignore){return blocked('identityUnavailable');}}
  else{record={schemaVersion:1,archiveId:Utilities.getUuid(),epoch:Utilities.getUuid()};raw=JSON.stringify(record);props.setProperty(key,raw);if(props.getProperty(key)!==raw)return blocked('identityUnavailable');}
  const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id);
  if(record.schemaVersion!==1||!valid(record.archiveId)||!valid(record.epoch))return blocked('identityUnavailable');
  const user=PropertiesService.getUserProperties(),principalKey='LOCAL_PRINCIPAL_V1';let principalId=user.getProperty(principalKey);
  if(!principalId){principalId=Utilities.getUuid();user.setProperty(principalKey,principalId);if(user.getProperty(principalKey)!==principalId)return blocked('identityUnavailable');}
  if(!valid(principalId))return blocked('identityUnavailable');
  return {...base,identityVerified:true,archiveId:record.archiveId,principalId,epoch:record.epoch};
 },true,true);return result.busy?blocked('archiveBusy'):result;}catch(ignore){return blocked('identityUnavailable');}
}
function getState(p) { ACTIVE_CONTEXT=p&&p.context||{}; return readState_(); }

// Opt-in protocol: legacy callers still receive complete collections. A slice
// is authoritative only inside its explicit inclusive date range.
function commonJournalSlices_(db,month,today){
 const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const monday=date=>shift(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
 const first=month+'-01',next=new Date(first+'T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
 const last=shift(next.toISOString().slice(0,10),-1),currentWeek=monday(today);
 return {
  days:commonDateSlice_(db.getSheetByName('Days'),DAY_HEADERS,'date',shift(first,-1),last),
  weeks:commonDateSlice_(db.getSheetByName('Weeks'),WEEK_HEADERS,'week',currentWeek,currentWeek),
  habitLogs:commonDateSlice_(db.getSheetByName('HabitLogs'),LOG_HEADERS,'date',monday(first),shift(monday(last),6))
 };
}
function commonDateSlice_(sheet,headers,dateKey,from,to){
 const slice=commonDateRanges_(sheet,headers,dateKey,[{from,to}]);
 return {from,to,rows:slice.rows};
}
function commonDateRanges_(sheet,headers,dateKey,ranges){
 if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 const result=commonDateRangesRaw_(sheet,headers,dateKey,ranges);
 if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 return result;
}
function commonDateRangesRaw_(sheet,headers,dateKey,ranges){
 if(sheet.getName()==='Days')ensureDayHeaders_(sheet);else verify_(sheet,headers);
 // Search the date column on the service. Never materialise unrelated payloads,
 // including on small sheets or when records are unsorted/interleaved.
 const dates=new Set();ranges.forEach(({from,to})=>{for(let date=from;date<=to;){dates.add(date);const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);date=d.toISOString().slice(0,10);}});
 const found=findRows_(sheet,headers.indexOf(dateKey)+1,'^('+[...dates].join('|')+')$',true).sort((a,b)=>a-b),groups=[],rows=[];
 found.forEach(row=>{const group=groups[groups.length-1];if(group&&row===group.end+1&&group.end-group.start<255)group.end=row;else groups.push({start:row,end:row});});
 groups.forEach(group=>readSheetValues_(sheet.getRange(group.start,1,group.end-group.start+1,headers.length)).forEach(values=>rows.push(Object.fromEntries(headers.map((h,i)=>[h,values[i]])))));
 return {ranges,rows};
}
function commonPeriodState_(db,context,today){
 const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const monday=date=>shift(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
 const week=context.week||monday(today),date=context.date||today,kind=context.commonWindow;
 if(!validDate_(week)||monday(week)!==week)throw Error('Settimana non valida.');
 if(kind==='habits'&&!validDate_(date))throw Error('Giornata non valida.');
 const weekRange={from:week,to:shift(week,6)},dayWeek=kind==='habits'?monday(date):week;
 return {commonScope:{kind,week,...(kind==='habits'?{date}:{})},commonSlices:{
  days:kind==='habits'?commonDateSlice_(db.getSheetByName('Days'),DAY_HEADERS,'date',shift(date,-1),date):commonDateSlice_(db.getSheetByName('Days'),DAY_HEADERS,'date',shift(week,-1),weekRange.to),
  weeks:commonDateSlice_(db.getSheetByName('Weeks'),WEEK_HEADERS,'week',week,week),
  habitLogs:commonDateRanges_(db.getSheetByName('HabitLogs'),LOG_HEADERS,'date',kind==='habits'&&dayWeek!==week?[weekRange,{from:dayWeek,to:shift(dayWeek,6)}]:[weekRange])
 }};
}

function state_() {
 const started=Date.now(),db=db_(),today=Utilities.formatDate(new Date(),'Europe/Rome','yyyy-MM-dd');
 const context=ACTIVE_CONTEXT||{}, month=context.month||today.slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(month)||!validDate_(month+'-01'))throw new Error('Mese non valido.');
 let entries=[];if(!['habits','archive','projects','tasks','day','week','tags','settings','sync'].includes(context.view))entries=entrySearch_('date','^'+month+'-');
 if(context.view==='projects'&&context.project)entries=entrySearch_('projects','(^|,)'+slug_(context.project)+'(,|$)');
 if(context.view==='tasks')entries=entrySearch_('status','^(open|doing)$');
 if(context.view==='day'&&validDate_(context.date||''))entries=entrySearch_('date','^'+context.date+'$');
 if(context.view==='week'&&validDate_(context.week||'')) {
  const end=new Date(context.week+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const endDate=end.toISOString().slice(0,10);
  entries=weekEntries_(context.week,endDate);
 }
 const allTags=(context.view==='tags'||!(context.commonFresh||context.deferCommon||context.catalogFresh))?tagCatalog_():undefined;
 if(context.view==='tags'&&context.tag){const tag=normaliseTags_(context.tag);if(tag.includes(','))throw new Error('Scegli un tag.');entries=entrySearch_('tags','(^|,)'+tag+'(,|$)');}
 if(!context.view||['journal','day'].includes(context.view)){entries=Array.from(new Map([...entries,...entrySearch_('type','^task$')].map(e=>[e.id,e])).values());}
 attachSchedules_(entries);attachPendingDocs_(entries);if(!context.view||context.view==='journal')entries=entries.filter(e=>e.date.startsWith(month+'-'));if(context.view==='day')entries=entries.filter(e=>taskOnDate_(e,context.date));
 const entriesMs=Date.now()-started,ids=new Set(entries.map(e=>e.id)),pattern=ids.size?'^('+Array.from(ids).join('|')+')$':'^$';
 const previewStarted=Date.now(),previewSheet=db.getSheetByName('Previews'),previews=ids.size&&previewSheet?objectsSearch_(previewSheet,['entryId','excerpt','updatedAt','richExcerpt'],1,pattern):[];const previewMap=new Map(previews.map(p=>[p.entryId,p]));entries.forEach(e=>{const p=previewMap.get(e.id);e.excerpt=p?p.excerpt:'';e.previewRich=p?readPreviewRuns_(p.richExcerpt):[];});
 const previewsMs=Date.now()-previewStarted,fileStarted=Date.now(),files=ids.size?objectsSearch_(db.getSheetByName('Files'),FILE_HEADERS,2,pattern):[],filesMs=Date.now()-fileStarted;
 const commonStarted=Date.now();
 const common=(context.commonFresh||context.deferCommon)?{}:{
    ...(context.commonWindow==='catalogs'?{commonScope:{kind:'catalogs'}}:context.commonWindow==='journal'?{commonScope:{kind:'journal',month,today},commonSlices:commonJournalSlices_(db,month,today)}:['week','habits'].includes(context.commonWindow)?commonPeriodState_(db,context,today):{commonScope:{kind:'full'},weeks:rows_(db.getSheetByName('Weeks'),WEEK_HEADERS),days:rows_(db.getSheetByName('Days'),DAY_HEADERS),habitLogs:rows_(db.getSheetByName('HabitLogs'),LOG_HEADERS)}),
    ...(context.catalogFresh?{}:{
    projects:cachedRows_(db.getSheetByName('Projects'),PROJECT_HEADERS),
    goals:cachedRows_(db.getSheetByName('Goals'),GOAL_HEADERS),
    habits:cachedRows_(db.getSheetByName('Habits'),HABIT_HEADERS),
    taskPlans:cachedRows_(db.getSheetByName('TaskPlans'),PLAN_HEADERS)})
 };
 return {today,month,entries,files,...common,settings:reflectionSettings_(),...(allTags?{allTags}:{}),commonIncluded:!(context.commonFresh||context.deferCommon),driveConfigured:!!PropertiesService.getScriptProperties().getProperty('ROOT_ID'),performance:{traceId:context.traceId||'',entriesMs,previewsMs,filesMs,commonMs:Date.now()-commonStarted,totalMs:Date.now()-started}};
}

function commonRecordResponse_(collection,record){
 return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,commonUpserts:{[collection]:[record]}}:state_();
}
function saveGoalImpl_(p) {
  const title=text_(p.title,200), target=Number(p.target), progress=Number(p.progress);
  if(!title || !/^\d{4}-Q[1-4]$/.test(p.cycle) || !Number.isFinite(target)||target<=0||!Number.isFinite(progress)||progress<0) throw new Error('Obiettivo: titolo, trimestre e valori numerici validi richiesti.');
  return saveRecord_('Goals',GOAL_HEADERS,'id',{id:p.id||Utilities.getUuid(),cycle:p.cycle,title,...(p.description===undefined?{}:{description:text_(p.description,6000)}),target:String(target),progress:String(progress),project:p.project?slug_(p.project):'',...(p.icon===undefined?{}:{icon:iconValue_(p.icon)})},p.updatedAt);
}
function saveHabitImpl_(p) {
  const title=text_(p.title,200), flexible=/^weekly:[1-7]$/.test(String(p.days)), days=Array.from(new Set(String(p.days).split(','))).sort();
  if(!title||!days.length||(!flexible&&days.some(d=>! /^[0-6]$/.test(d)))||!validDate_(p.start)) throw new Error('Azione: titolo, data iniziale e almeno un giorno richiesti.');
  return locked_(function(){
    const db=db_(), goal=rows_(db.getSheetByName('Goals'),GOAL_HEADERS).find(g=>g.id===p.goalId);
    if(!goal)throw new Error('Obiettivo non trovato.');
    const q=Number(goal.cycle.slice(-1)),year=goal.cycle.slice(0,4),start=year+'-'+String((q-1)*3+1).padStart(2,'0')+'-01';
    const end=new Date(Date.UTC(Number(year),q*3,0,12)).toISOString().slice(0,10);
    if(p.start<start||p.start>end)throw new Error('Inizio azione fuori dal ciclo.');
    const sheet=db.getSheetByName('Habits');ensureHabitHeaders_(sheet,true);const records=rows_(sheet,HABIT_HEADERS),index=records.findIndex(h=>h.id===p.id),old=index<0?null:records[index];if(p.id&&(!old||old.archived==='yes'||old.updatedAt!==p.updatedAt))throw new Error('Abitudine modificata altrove. Aggiorna e riprova.');const previous=old?habitSteps_(old.steps):[],titles=String(p.steps===undefined?previous.map(s=>s.title).join('\n'):p.steps).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(titles.length>30||titles.some(t=>t.length>500))throw new Error('Massimo 30 microazioni, ciascuna di 500 caratteri.');const used=new Set(),steps=titles.map((title,index)=>{const match=previous.find(s=>s.title===title&&!used.has(s.id))||previous[index];const id=match&&!used.has(match.id)?match.id:Utilities.getUuid();used.add(id);return {id,title};});const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0)).toISOString(),values=[old?old.id:Utilities.getUuid(),p.goalId,title,days.join(','),p.start,now,JSON.stringify(steps),'',p.icon===undefined?(old?old.icon||'':''):iconValue_(p.icon),p.description===undefined?(old?old.description||'':''):text_(p.description,6000)];if(old)writeRow_(sheet,index+2,values);else append_(sheet,[values]);return commonRecordResponse_('habits',Object.fromEntries(HABIT_HEADERS.map((h,i)=>[h,values[i]])));
  });
}
function setHabitLogImpl_(p) {
  if(!validDate_(p.date)||!['done','skipped','pending'].includes(p.status))throw new Error('Data o stato azione non valido.');
  return locked_(function(){
    const db=db_(),habit=rows_(db.getSheetByName('Habits'),HABIT_HEADERS).find(h=>h.id===p.habitId);
    if(!habit||habit.archived==='yes')throw new Error('Azione non trovata.');
    const goal=rows_(db.getSheetByName('Goals'),GOAL_HEADERS).find(g=>g.id===habit.goalId);
    const d=new Date(p.date+'T12:00:00Z'),cycle=d.getUTCFullYear()+'-Q'+(Math.floor(d.getUTCMonth()/3)+1);
    if(!goal||goal.cycle!==cycle||p.date<habit.start||(!/^weekly:[1-7]$/.test(habit.days)&&!habit.days.split(',').includes(String((d.getUTCDay()+6)%7))))throw new Error('Azione non prevista per questa data.');
    const sheet=db.getSheetByName('HabitLogs'),key=p.habitId+'|'+p.date,records=rows_(sheet,LOG_HEADERS),i=records.findIndex(r=>r.key===key);
    if((i<0?'':records[i].updatedAt)!==(p.updatedAt||''))throw new Error('Azione modificata altrove. Aggiorna e riprova.');
    const now=new Date(Math.max(Date.now(),i<0?0:Date.parse(records[i].updatedAt)+1)).toISOString();
    ensureHabitHeaders_(sheet,true);if(p.habitUpdatedAt&&p.habitUpdatedAt!==habit.updatedAt)throw new Error('Abitudine modificata: aggiorna i passaggi.');const previous=i<0?null:habitChecklist_(records[i].checklist),steps=previous?previous.steps:habitSteps_(habit.steps),checked=Array.isArray(p.checked)?Array.from(new Set(p.checked)):previous?previous.checked:[];if(checked.some(id=>!steps.some(s=>s.id===id)))throw new Error('Microazione non valida.');if(steps.length&&p.status==='done'&&!steps.every(s=>checked.includes(s.id)))throw new Error('Completa tutte le microazioni prima di completare la pratica.');const status=steps.length&&p.status!=='skipped'?(steps.every(s=>checked.includes(s.id))?'done':'pending'):p.status;const values=[key,p.habitId,p.date,status,now,JSON.stringify({steps,checked})];if(i<0)append_(sheet,[values]);else writeRow_(sheet,i+2,values);return {delta:true,entries:[],commonIncluded:false,commonUpserts:{habitLogs:[Object.fromEntries(LOG_HEADERS.map((h,i)=>[h,values[i]]))]}};
  });
}
function addJournalImpl_(payload) {
  const started=Date.now();let entered=started,sheetsMs=0,sectionMs=0,responseMs=0;
  if (!payload || !/^[a-zA-Z0-9-]{10,80}$/.test(payload.requestId || '')) throw new Error('ID richiesta non valido.');
  const entries=parseJournal_(payload.date,payload.text,payload.legacyHashProjects===true),defaultTags=normaliseTags_(payload.tags||'');
  if (!['personal','project'].includes(payload.scope || 'personal')) throw new Error('Ambito non valido.');
  const defaults=String(payload.projects || '').split(',').map(s=>s.trim()).filter(Boolean).map(slug_);
  entries.forEach(e=>{e.tags=normaliseTags_([e.tags,defaultTags].filter(Boolean).join(','));e.projects=Array.from(new Set(e.projects.split(',').filter(Boolean).concat(defaults))).join(',');});
  if (payload.scope==='project' && entries.some(e=>!e.projects)) throw new Error('Una nota di progetto deve avere almeno un progetto.');
  if (!entries.length) throw new Error('Inserisci almeno una voce oltre alla data.');
  const description=text_(payload.description||'',20000);
  if(description&&(entries.length!==1||entries[0].type!=='task'))throw new Error('La descrizione è disponibile per un solo task per invio.');
  const schedule=taskSchedule_(payload);if((schedule.date||schedule.workStart)&&(entries.length!==1||entries[0].type!=='task'))throw new Error('Pianificazione disponibile per un singolo task.');
  const validationMs=Date.now()-started;
  const result=locked_(function() {
    entered=Date.now();const phase=Date.now(),db=db_(),sheet=db.getSheetByName('Entries');ensurePlanHeaders_(db.getSheetByName('TaskPlans'));
    const existing=findRows_(sheet,10,payload.requestId,false);let saved;
    if(existing.length)saved=readEntries_(existing);
    else {const now=new Date().toISOString();saved=entries.map(e=>({...e,id:Utilities.getUuid(),createdAt:now,updatedAt:now,requestId:payload.requestId,scope:e.projects?'project':(payload.scope||'personal'),body:'',completedAt:e.status==='done'?now:''}));append_(sheet,saved.map(e=>ENTRY_HEADERS.map(h=>e[h]||'')));}
    if(!existing.length&&saved[0].type==='task')Object.assign(saved[0],storeTaskSchedule_(saved[0].id,schedule));else attachSchedules_(saved);
    ENTRY_SMALL_CACHE=null;sheetsMs=Date.now()-phase;const sectionStarted=Date.now();
    const items=saved.filter(e=>!ref_(e.id)&&(!docContent_(e.id)||!queuedTask_(e.id))).map(e=>({e,content:docContent_(e.id)||{body:description,rich:plainRich_(description),baselineBody:null,baselineRich:null,version:e.updatedAt}}));
    const queued=items.length?queueDocWrites_(items):[];const refs=saved.map(e=>queued.find(r=>r.entryId===e.id)||{...ref_(e.id),entryId:e.id,pending:queuedTask_(e.id)});sectionMs=Date.now()-sectionStarted;
    const responseStarted=Date.now(),previewSheet=db.getSheetByName('Previews');
    const previews=existing.length&&previewSheet?objectsSearch_(previewSheet,['entryId','excerpt','updatedAt','richExcerpt'],1,'^('+saved.map(e=>e.id).join('|')+')$'):[];
    const previewMap=new Map(previews.map(p=>[p.entryId,p]));
    const response={delta:true,commonIncluded:false,entries:saved.map((e,i)=>{const r=refs[i],p=previewMap.get(e.id);return {...e,excerpt:p?p.excerpt:existing.length?'':description.slice(0,220),previewRich:p?readPreviewRuns_(p.richExcerpt):existing.length?[]:previewRuns_(plainRich_(description)),docPending:!!r.pending,docName:r.docName||'',docUrl:r.docId?'https://docs.google.com/document/d/'+r.docId+'/edit#bookmark='+r.bookmark:''};})};
    responseMs=Date.now()-responseStarted;return response;
  });
  const totalMs=Date.now()-started;result.performance={kind:'journalCreate',traceId:ACTIVE_CONTEXT.traceId||'',totalMs,validationMs,lockWaitMs:entered-started-validationMs,sheetsMs,sectionMs,responseMs,finaliseMs:Math.max(0,totalMs-(entered-started)-sheetsMs-sectionMs-responseMs)};return result;
}
function saveProjectImpl_(payload) {
  const slug=payload.slug?slug_(payload.slug):slug_(payload && payload.name);const name=text_(payload.name,200);if(!name)throw new Error('Nome progetto richiesto.');
  const description=String(payload.description || '').trim();
  if (description.length>4000) throw new Error('Descrizione troppo lunga.');
  return locked_(function() {
    const sheet=db_().getSheetByName('Projects');
    const records=rows_(sheet,PROJECT_HEADERS),existing=records.find(p=>p.slug===slug);
    if(records.some(p=>p.slug!==slug&&p.name.toLowerCase()===name.toLowerCase()))throw new Error('Un altro progetto ha già questo nome.');
    if(existing){if(!payload.slug)throw new Error('Questo progetto esiste già.');if(existing.updatedAt!==payload.updatedAt)throw new Error('Progetto modificato altrove. Aggiorna e riprova.');}
    const updatedAt=new Date(Math.max(Date.now(),existing?Date.parse(existing.updatedAt)+1:0)).toISOString(),values=[slug,name,description,updatedAt];
    if(existing)writeRow_(sheet,records.indexOf(existing)+2,values);else append_(sheet,[values]);
    return commonRecordResponse_('projects',{slug,name,description,updatedAt});
  });
}
function setTaskStatusImpl_(payload) {
  if (!payload || !['open','doing','done','cancelled'].includes(payload.status)) throw new Error('Stato non valido.');
  return locked_(function() {
    const sheet=db_().getSheetByName('Entries'), found=findRows_(sheet,1,payload.id,false);
    const index=found.length?found[0]-2:-1; const entries={}; if(index>=0)entries[index]=readEntry_(index+2);
    if (index<0 || entries[index].type!=='task') throw new Error('Task non trovato.');
    const entry=entries[index];
    if (entry.updatedAt!==payload.updatedAt) throw new Error('Task modificato da un altro dispositivo. Aggiorna e riprova.');
    const nextTime = Math.max(Date.now(), Date.parse(entry.updatedAt)+1);
    const now=new Date(nextTime).toISOString();entry.status=payload.status;entry.updatedAt=now;entry.completedAt=payload.status==='done'?(entry.completedAt||now):'';
    ioInvalidate_(sheet);sheet.getRange(index+2,7,1,3).setValues([[entry.status,entry.createdAt,now]]);
    sheet.getRange(index+2,13,1,1).setValues([[entry.completedAt]]);attachSchedules_([entry]);
    return {delta:true,metadataOnly:true,entries:[entry],commonIncluded:false};
  });
}

function writeRow_(sheet,row,values) {return traceMeasure_('sheets',()=>{
  ioInvalidate_(sheet);
  if(sheet.getName()==='Entries')ensureEntryTagHeader_(sheet,true);
  sheet.getRange(row,1,1,values.length).setNumberFormat('@').setValues([values.map(v=>/^[=+\-@']/.test(String(v))?"'"+v:String(v))]);
});}
function text_(value,max) {
  if (typeof value!=='string' || value.length>max) throw new Error('Testo mancante o troppo lungo.');
  return value.trim();
}
function updateEntryImpl_(payload) {
  if (!payload) throw new Error('Voce mancante.');
  const text=text_(payload.text,2000), body=text_(payload.body,20000);
  if (!text || !validDate_(payload.date) || (payload.due && !validDate_(payload.due))) throw new Error('Testo o data non validi.');
  const projects=Array.from(new Set(String(payload.projects||'').split(',').map(s=>s.trim()).filter(Boolean).map(slug_))).join(',');
  if (!['personal','project'].includes(payload.scope) || (payload.scope==='project'&&!projects)) throw new Error('Seleziona un ambito e un progetto per le note di progetto.');
  return locked_(function(){
    const sheet=db_().getSheetByName('Entries'), found=findRows_(sheet,1,payload.id,false),index=found.length?found[0]-2:-1;const entries={};if(index>=0)entries[index]=readEntry_(index+2);
    if(index<0) throw new Error('Voce non trovata.');
    const e=entries[index];
    if(e.updatedAt!==payload.updatedAt) throw new Error('Voce modificata altrove. Aggiorna e riprova; conserva la tua bozza prima di aggiornare.');
    if(e.type!=='task'&&payload.due) throw new Error('Le scadenze sono disponibili per i task.');
    if(text!==e.text||projects!==e.projects||payload.date!==e.date||payload.scope!==e.scope)throw new Error('In questa versione data, titolo e collocazione della sezione sono fissi. Crea una nuova voce per cambiare.');
    if(body)throw new Error('Scrivi gli appunti nel Google Doc originale.');
    Object.assign(e,{text,body:'',projects,date:payload.date,due:payload.due||'',scope:payload.scope,updatedAt:new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString()});
    writeRow_(sheet,index+2,ENTRY_HEADERS.map(h=>e[h]||''));if(ACTIVE_CONTEXT.incrementalCommon===true){attachSchedules_([e]);return {delta:true,metadataOnly:true,preserveDetailId:e.id,entries:[e],commonIncluded:false};}return state_();
  });
}
function addFileLinkImpl_(payload) {
  const title=text_(payload && payload.title,200);
  const url=String(payload.url||'').trim();
  const match=url.match(/^https:\/\/(?:drive\.google\.com|docs\.google\.com)\/(?:file\/d\/|document\/d\/|spreadsheets\/d\/|presentation\/d\/|drawings\/d\/)([a-zA-Z0-9_-]{10,})(?:[/?#].*)?$/)
    || url.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_-]{10,})(?:&[^\s]*)?$/);
  if (!title || !match || /\s/.test(url) || url.length>2000) throw new Error('Inserisci un titolo e un link HTTPS a un file Google Drive/Docs.');
  return locked_(function(){
    const db=db_();
    if(!findRows_(db.getSheetByName('Entries'),1,payload.entryId,false).length) throw new Error('Voce non trovata.');
    const sheet=db.getSheetByName('Files');
    const existing=rows_(sheet,FILE_HEADERS).find(f=>f.entryId===payload.entryId&&f.fileId===match[1]);
    const file=existing||{id:Utilities.getUuid(),entryId:payload.entryId,fileId:match[1],title,url,addedAt:new Date().toISOString()};
    if(!existing)append_(sheet,[FILE_HEADERS.map(h=>file[h])]);
    return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,fileUpserts:[file]}:state_();
  });
}
function monday_(date) {
  if (!validDate_(date)) throw new Error('Data non valida.');
  const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);
}
function saveWeekImpl_(payload) {
  if (!payload || monday_(payload.week)!==payload.week) throw new Error('La settimana deve iniziare di lunedì.');
  const values={week:payload.week};
  ['focus','priorities','wins','obstacles','lessons','next'].forEach(k=>values[k]=text_(payload[k],6000));
  if (!['','1','2','3','4','5'].includes(payload.energy)) throw new Error('Energia da 1 a 5.');
  if (!['yes','no'].includes(payload.closed)) throw new Error('Stato checkup non valido.');
  Object.assign(values,{energy:payload.energy,closed:payload.closed});
  return saveRecord_('Weeks',WEEK_HEADERS,'week',values,payload.updatedAt);
}
function dayValues_(payload) {
  if (!payload || !validDate_(payload.date)) throw new Error('Data non valida.');
  const values={date:payload.date};
  ['intention','reflection',...DAY_EXTRA_HEADERS.filter(k=>!k.endsWith('Rich'))].forEach(k=>{if(Object.prototype.hasOwnProperty.call(payload,k))values[k]=text_(payload[k],6000);});
  for(const field of ['intention','reflection'])if(Object.prototype.hasOwnProperty.call(payload,field)){const key=field+'Rich';values[key]='';if(payload[key]!==undefined){const raw=String(payload[field]||'').replace(/\r\n?/g,'\n'),rich=validateRich_(payload[key],raw);const serial=JSON.stringify(rich);if(serial.length>45000)throw Error('Formattazione della riflessione troppo estesa.');values[key]=serial;}}
  return values;
}
function saveDayImpl_(payload){const gateway=dayCommitGateway_();if(gateway)return gateway.saveLegacy(payload);return saveRecord_('Days',DAY_HEADERS,'date',dayValues_(payload),payload.updatedAt);}
// Bounded, best-effort batch. Only an explicit saved result acknowledges a day.
function saveDays(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 if(!p||!Array.isArray(p.days)||!p.days.length||p.days.length>10||traceBytes_(JSON.stringify(p.days))>500000)throw Error('Lotto giornate non valido o troppo grande.');
 const dates=p.days.map(item=>item&&item.date);
 if(dates.some(date=>!validDate_(date))||new Set(dates).size!==dates.length)throw Error('Date delle giornate non valide o duplicate.');
 const gateway=dayCommitGateway_();if(gateway)return gateway.saveBatch(p.days);
 const prepared=p.days.map(item=>{try{return {date:item.date,version:item.updatedAt||'',values:dayValues_(item)};}catch(error){return {date:item.date,status:'invalid',error:'Campi della giornata non validi.'};}});
 return locked_(function(){
  if(dayCommitGateway_())throw Object.assign(Error('Routing giornaliero cambiato. Riprova conservando la bozza.'),{name:'ScopeChanged'});
  const sheet=db_().getSheetByName('Days');ensureDayHeaders_(sheet);
  const found=findRows_(sheet,1,'^('+dates.join('|')+')$',true).sort((a,b)=>a-b),groups=[],records=new Map();
  found.forEach(row=>{const last=groups[groups.length-1];if(last&&row===last.end+1&&last.end-last.start<255)last.end=row;else groups.push({start:row,end:row});});
  groups.forEach(group=>readSheetValues_(sheet.getRange(group.start,1,group.end-group.start+1,DAY_HEADERS.length)).forEach((values,i)=>{const record=Object.fromEntries(DAY_HEADERS.map((h,j)=>[h,values[j]])),old=records.get(record.date);records.set(record.date,old?{duplicate:true}:{row:group.start+i,record});}));
  const results=[],saved=[];let stopped=false,headersReady=false;
  prepared.forEach(item=>{
   if(item.status){results.push({date:item.date,status:item.status,error:item.error});return;}
   if(stopped){results.push({date:item.date,status:'notAttempted',error:'Invio interrotto. Riprova.'});return;}
   const existing=records.get(item.date);
   if(existing?.duplicate||(existing?.record.updatedAt||'')!==item.version){results.push({date:item.date,status:'conflict',error:'Giornata modificata altrove. Conserva la bozza e aggiorna.'});return;}
   try{
    const record={...(existing?.record||Object.fromEntries(DAY_HEADERS.map(h=>[h,'']))),...item.values};
    record.updatedAt=new Date(Math.max(Date.now(),existing?Date.parse(existing.record.updatedAt)+1:0)).toISOString();
    if(!headersReady){ensureDayHeaders_(sheet,true);headersReady=true;}
    const values=DAY_HEADERS.map(h=>record[h]||'');
    if(existing)writeRow_(sheet,existing.row,values);else append_(sheet,[values]);
    saved.push(record);results.push({date:item.date,status:'saved'});
   }catch(error){stopped=true;results.push({date:item.date,status:'error',error:'Salvataggio non confermato. La bozza deve essere conservata.'});}
  });
  return {delta:true,entries:[],commonIncluded:false,commonUpserts:{days:saved},results,errors:results.filter(r=>r.status!=='saved').map(r=>({date:r.date,status:r.status,error:r.error}))};
 });
}
function saveRecord_(name,headers,key,values,version) {
  if(name==='Days'&&dayCommitGateway_())throw Object.assign(Error('Writer giornaliero non instradato.'),{name:'ProtocolUnavailable'});
  return locked_(function(){
    if(name==='Days'&&dayCommitGateway_())throw Object.assign(Error('Routing giornaliero cambiato. Riprova conservando la bozza.'),{name:'ScopeChanged'});
    const sheet=db_().getSheetByName(name), records=rows_(sheet,headers), index=records.findIndex(r=>r[key]===values[key]);
    const existing=index<0?null:records[index];
    if((existing?existing.updatedAt:'')!==(version||'')) throw new Error('Pagina modificata altrove. Conserva la bozza, aggiorna e riprova.');
    if(name==='Goals'){ensureGoalIconHeader_(sheet,true);values={...(existing||{}),...values};}
    if(name==='Days'){ensureDayHeaders_(sheet,true);values={...(existing||{}),...values};}
    values.updatedAt=new Date(Math.max(Date.now(),existing?Date.parse(existing.updatedAt)+1:0)).toISOString();
    if(index<0) append_(sheet,[headers.map(h=>values[h]||'')]);else writeRow_(sheet,index+2,headers.map(h=>values[h]||''));
    if(name==='Goals')return commonRecordResponse_('goals',Object.fromEntries(headers.map(h=>[h,values[h]||''])));
    if(name==='Days'||name==='Weeks'){const updated=Object.fromEntries(headers.map(h=>[h,values[h]||''])),k=name==='Days'?'days':'weeks';return {delta:true,entries:[],commonUpserts:{[k]:[updated]},commonIncluded:false};}
    return state_();
  });
}

function saveGoal(p){ACTIVE_CONTEXT=p&&p.context||{};return saveGoalImpl_(p);}
function saveHabit(p){ACTIVE_CONTEXT=p&&p.context||{};return saveHabitImpl_(p);}
function setHabitLog(p){ACTIVE_CONTEXT=p&&p.context||{};return setHabitLogImpl_(p);}
function addJournal(p){ACTIVE_CONTEXT=p&&p.context||{};return addJournalImpl_(p);}
function saveProject(p){ACTIVE_CONTEXT=p&&p.context||{};root_();const result=saveProjectImpl_(p);locked_(function(){projectFolder_(p.slug?slug_(p.slug):slug_(p.name));});return result;}
function setTaskStatus(p){ACTIVE_CONTEXT=p&&p.context||{};return setTaskStatusImpl_(p);}
function updateEntry(p){ACTIVE_CONTEXT=p&&p.context||{};return updateEntryImpl_(p);}
function addFileLink(p){ACTIVE_CONTEXT=p&&p.context||{};return addFileLinkImpl_(p);}
function saveWeek(p){ACTIVE_CONTEXT=p&&p.context||{};return saveWeekImpl_(p);}
function saveDay(p){ACTIVE_CONTEXT=p&&p.context||{};return saveDayImpl_(p);}

function getCommonState(p){ACTIVE_CONTEXT={...((p&&p.context)||{}),view:'habits'};return readState_();}


function setEntryProjects(p){ACTIVE_CONTEXT=p.context||{};return locked_(function(){const db=db_(),sheet=db.getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Voce non trovata.');const e=readEntry_(found[0]);if(e.updatedAt!==p.updatedAt)throw new Error('Voce modificata altrove. Aggiorna e riprova.');const selected=Array.from(new Set(String(p.projects||'').split(',').filter(Boolean)));const known=rows_(db.getSheetByName('Projects'),PROJECT_HEADERS).map(p=>p.slug);if(selected.some(s=>!known.includes(s)&&!e.projects.split(',').includes(s)))throw new Error('Seleziona un progetto esistente.');e.projects=selected.join(',');e.scope=selected.length?'project':'personal';e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();ioInvalidate_(sheet);sheet.getRange(found[0],5).setNumberFormat('@').setValues([[/^[=+\-@']/.test(e.projects)?"'"+e.projects:e.projects]]);sheet.getRange(found[0],9,1,3).setValues([[e.updatedAt,e.requestId,e.scope]]);ENTRY_SMALL_CACHE=null;attachSchedules_([e]);return {delta:true,metadataOnly:true,preserveDetailId:e.id,entries:[e],commonIncluded:false};});}

function ensurePlanHeaders_(s,write=false){const h=s.getRange(1,1,1,6).getDisplayValues()[0];if(JSON.stringify(h.slice(0,3))!==JSON.stringify(PLAN_HEADERS.slice(0,3)))throw new Error('Intestazioni TaskPlans non valide.');for(let col=3;col<6;col++)if(h[col]&&h[col]!==PLAN_HEADERS[col])throw new Error('Colonne TaskPlans occupate: nessun dato modificato.');if(write&&h.slice(3).some(v=>!v))s.getRange(1,4,1,3).setValues([PLAN_HEADERS.slice(3)]);}
function taskImportance_(value){const importance=value||'normal';if(!['normal','urgent','emergency'].includes(importance))throw new Error('Importanza non valida.');return importance;}
function taskSchedule_(p){const s={date:String(p.plannedDate||''),workStart:String(p.workStart||''),workEnd:String(p.workEnd||''),importance:taskImportance_(p.importance)};for(const v of [s.date,s.workStart,s.workEnd])if(v&&!validDate_(v))throw new Error('Data di pianificazione non valida.');if(s.workEnd&&!s.workStart)throw new Error('Indica anche l’inizio lavorazione.');if(s.workStart&&s.workEnd&&s.workEnd<s.workStart)throw new Error('La fine lavorazione precede l’inizio.');if(s.date&&s.workStart)throw new Error('Scegli un giorno pianificato oppure un periodo di lavorazione.');return s;}
function storeTaskSchedule_(id,s){const sheet=db_().getSheetByName('TaskPlans');ensurePlanHeaders_(sheet,true);const found=findRows_(sheet,1,id,false),values=[id,s.date,new Date().toISOString(),s.workStart,s.workEnd,s.importance];if(found.length)writeRow_(sheet,found[0],values);else if(s.date||s.workStart||s.importance!=='normal')append_(sheet,[values]);return {plannedDate:s.date,workStart:s.workStart,workEnd:s.workEnd,importance:s.importance};}
function attachSchedules_(entries){const plans=rows_(db_().getSheetByName('TaskPlans'),PLAN_HEADERS),map=new Map(plans.map(p=>[p.entryId,p]));entries.forEach(e=>{const p=map.get(e.id);if(e.type==='task')Object.assign(e,{plannedDate:p?p.date:'',workStart:p?p.workStart:'',workEnd:p?p.workEnd:'',importance:taskImportance_(p&&p.importance)});});return entries;}
function taskOnDate_(e,date){if(e.type!=='task')return e.date===date;if(e.workStart){const end=e.workEnd||date;if(date<e.workStart||date>end)return false;if(e.status==='done'&&e.completedAt&&date>e.completedAt.slice(0,10))return false;return true;}return (e.plannedDate||e.due||e.date)===date;}

// Project resource only: no Sheets, Docs, Drive or lock required.
function getAppChangelog(){return {text:HtmlService.createHtmlOutputFromFile('Changelog').getContent()};}

function ensureHabitHeaders_(sheet,write=false){const headers=sheet.getName()==='Habits'?HABIT_HEADERS:LOG_HEADERS,base=sheet.getName()==='Habits'?6:5,h=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];if(JSON.stringify(h.slice(0,base))!==JSON.stringify(headers.slice(0,base)))throw new Error('Intestazioni abitudini non valide.');for(let k=base;k<headers.length;k++)if(h[k]&&h[k]!==headers[k])throw new Error('Colonne abitudini occupate. Nessun dato modificato.');if(write&&h.slice(base).some(v=>!v))sheet.getRange(1,base+1,1,headers.length-base).setValues([headers.slice(base)]);}
function habitSteps_(value){if(!value)return [];const steps=JSON.parse(value);if(!Array.isArray(steps))throw new Error('Microazioni non valide.');return steps;}
function habitChecklist_(value){return value?JSON.parse(value):null;}
function deleteHabit(p){ACTIVE_CONTEXT=p.context||{};return locked_(function(){const sheet=db_().getSheetByName('Habits'),records=rows_(sheet,HABIT_HEADERS),i=records.findIndex(h=>h.id===p.id);if(i<0||records[i].updatedAt!==p.updatedAt)throw new Error('Abitudine modificata altrove.');ensureHabitHeaders_(sheet,true);const h=records[i];h.archived='yes';h.updatedAt=new Date(Math.max(Date.now(),Date.parse(h.updatedAt)+1)).toISOString();writeRow_(sheet,i+2,HABIT_HEADERS.map(k=>h[k]||''));return commonRecordResponse_('habits',h);});}

const APP_ICONS=['🎯','🌱','❤️','🧠','💪','📚','💼','🧘','☀️','⭐','🏠','🤝','💰','🛡️','🔥'];
function iconValue_(value){if(value!==''&&value!=='none'&&!APP_ICONS.includes(value)&&!OUTLINE_ICON_IDS.includes(value))throw new Error('Icona non valida.');return value;}
function ensureGoalIconHeader_(sheet,write=false){const h=sheet.getRange(1,1,1,GOAL_HEADERS.length).getDisplayValues()[0];if(JSON.stringify(h.slice(0,7))!==JSON.stringify(GOAL_HEADERS.slice(0,7)))throw new Error('Intestazioni obiettivi non valide.');for(let k=7;k<GOAL_HEADERS.length;k++)if(h[k]&&h[k]!==GOAL_HEADERS[k])throw new Error('Colonne obiettivi occupate. Nessun dato modificato.');if(write&&h.slice(7).some(v=>!v))sheet.getRange(1,8,1,GOAL_HEADERS.length-7).setValues([GOAL_HEADERS.slice(7)]);}

const OUTLINE_ICON_IDS=["target", "plant", "heart", "brain", "strength", "book", "briefcase", "calm", "sun", "star", "home", "people", "wallet", "shield", "flame", "video", "check", "calendar", "clock", "flag", "compass", "mountain", "lightbulb", "pencil", "journal", "coffee", "moon", "music", "walk", "food", "water", "family", "message", "mail", "phone", "computer", "chart", "folder", "key", "sparkles"];

// Navigation is an eventually consistent read. It never prepares Docs or changes schema.
function readState_(){DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();const result=state_();result.performance={...result.performance,lockWaitMs:0,readWithoutLock:true};return result;}
function tagCatalog_(){const sheet=db_().getSheetByName('Entries'),count=sheet.getLastRow()-1;if(count<=0)return [];return Array.from(new Set(sheet.getRange(2,ENTRY_HEADERS.indexOf('tags')+1,count,1).getDisplayValues().flatMap(row=>String(row[0]||'').split(',').filter(Boolean)))).sort();}

// SPEC-004 package 8: recovery kernel and internal domain writer. Application
// RPCs remain legacy. An injected store supplies one shared lock, durable
// read-after-write units, archive/epoch isolation and deterministic SHA-256.
// Defining or constructing these factories creates no table/setup/RPC.
function syncCommitCanonical_(value,depth=0){
 if(depth>40)throw Object.assign(new Error('DataError'),{name:'DataError'});
 if(value===null)return 'null';
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value)){const parts=[];for(let i=0;i<value.length;i++)parts.push(syncCommitCanonical_(value[i],depth+1));return '['+parts.join(',')+']';}
 if(value&&Object.prototype.toString.call(value)==='[object Object]')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+syncCommitCanonical_(value[key],depth+1)).join(',')+'}';
 throw Object.assign(new Error('DataError'),{name:'DataError'});
}
// SPEC-004 package 8: first domain writer, internal and opt-in through the
// injected store only. No RPC, provisioning or legacy saveDay routing.
// A complete snapshot is required: planning must not depend on a later read
// or retry could change the fingerprint after an uncertain commit.
function syncDaySnapshot_(day){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 const keys=DAY_HEADERS.filter(key=>key!=='updatedAt');
 if(!day||Object.prototype.toString.call(day)!=='[object Object]'||Object.keys(day).length!==keys.length||Object.keys(day).some(key=>!keys.includes(key))||typeof day.date!=='string'||!validDate_(day.date))fail();
 const record={date:day.date};
 for(const key of keys)if(key!=='date'){
  const value=day[key];if(typeof value!=='string')fail();
  if(!key.endsWith('Rich')){if(value.length>6000)fail();record[key]=value;continue;}
  if(value===''){record[key]='';continue;}
  if(value.length>45000)fail();
  try{
   const rich=JSON.parse(value),clean=validateRich_(rich,day[key.slice(0,-4)]);
   // Reject unsupported attributes instead of silently discarding formatting.
   if(syncCommitCanonical_(rich)!==syncCommitCanonical_(clean))fail();
   record[key]=syncCommitCanonical_(clean);
  }catch(error){fail();}
 }
 return record;
}
function syncPlanDayOperation_(input){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==3||Object.keys(input).some(key=>!['operationId','baseVersion','day'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)))fail();
 const record=syncDaySnapshot_(input.day);
 const request={operationId:input.operationId,changes:[{collection:'days',id:record.date,baseVersion:input.baseVersion,action:'upsert',data:{format:'sync-day/v1',record}}]};
 if(syncCommitCanonical_(request).length>32768)fail();return request;
}
function syncDayWriter_(store,trustedScope){
 const protocol=syncCommitProtocol_(store,trustedScope),scope=JSON.parse(syncCommitCanonical_(trustedScope));
 const error=name=>({ok:false,error:name});
 return Object.freeze({
  save(input){
   let request;try{request=syncPlanDayOperation_(input);}catch(ignore){return error('DataError');}
   const result=protocol.execute(request);return result.ok?{ok:true,value:{...result.value,scope:JSON.parse(syncCommitCanonical_(scope))}}:result;
  },
  read(date){
   if(typeof date!=='string'||!validDate_(date))return error('DataError');
   const result=protocol.read('days',date);if(!result.ok)return result;
   const {cursor,entity}=result.value;
   if(entity===null||entity.deleted)return {ok:true,value:{cursor,day:null,version:entity?.version??null,deleted:entity?.deleted??false}};
   try{
    const data=entity.data;if(!data||Object.keys(data).length!==2||data.format!=='sync-day/v1')return error('ProtocolCorrupt');
    const day=syncDaySnapshot_(data.record);if(day.date!==date||syncCommitCanonical_(day)!==syncCommitCanonical_(data.record))return error('ProtocolCorrupt');
    return {ok:true,value:{cursor,day,version:entity.version,deleted:false}};
   }catch(ignore){return error('ProtocolCorrupt');}
  }
 });
}
// Conservative logical-write budget; retries and conflict receipts may need
// fewer references, but must never need more for a newly prepared commit.
function syncCommitWriteBudget_(request,principalId,sequence){
 return [{kind:'head',id:'head',writes:2},...request.changes.map(change=>({kind:'entity',id:[change.collection,change.id],writes:1})),{kind:'commit',id:sequence,writes:1},{kind:'receipt',id:[principalId,request.operationId],writes:1},{kind:'operation',id:[principalId,request.operationId],writes:1}];
}
// Raw Days access for the server-owned migration gateway. No table creation,
// no routing recursion, and no request-wide cached preimages.
function syncDaySheetSource_(sheet){
 const read=date=>commonDateRangesRaw_(sheet,DAY_HEADERS,'date',[{from:date,to:date}]).rows;
 return Object.freeze({
  read,
  readRows(ranges){
   if(ranges)return commonDateRangesRaw_(sheet,DAY_HEADERS,'date',ranges).rows;
   ensureDayHeaders_(sheet);const count=sheet.getLastRow()-1;
   return count>0?readSheetValues_(sheet.getRange(2,1,count,DAY_HEADERS.length)).map(row=>Object.fromEntries(DAY_HEADERS.map((key,i)=>[key,row[i]]))):[];
  },
  saveLegacy(payload){
   const values=dayValues_(payload),found=read(payload.date);
   if(found.length>1||(found[0]?.updatedAt||'')!==(payload.updatedAt||''))throw Object.assign(Error('Giornata modificata altrove. Conserva la bozza e aggiorna.'),{name:'ConflictError'});
   const record={...Object.fromEntries(DAY_HEADERS.map(key=>[key,''])),...found[0],...values};
   record.updatedAt=new Date(Math.max(Date.now(),found[0]?Date.parse(found[0].updatedAt)+1:0)).toISOString();
   ensureDayHeaders_(sheet,true);const rows=findRows_(sheet,1,payload.date,false);
   if(rows.length)writeRow_(sheet,rows[0],DAY_HEADERS.map(key=>record[key]));else append_(sheet,[DAY_HEADERS.map(key=>record[key])]);
   // The commit store's lock is read-only for legacy mutations, so these writes
   // need their own flush before the shared lock is released.
   traceMeasure_('flush',()=>SpreadsheetApp.flush());return record;
  }
 });
}
function syncDayMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Giornata modificata altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const scope=copy(trustedScope),directoryId='day-routing-v1',routeId=date=>'day-route:'+date;
 let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}};
 const protocol=syncCommitProtocol_(nested,scope),writer=syncDayWriter_(nested,scope);
 for(const method of ['read','readRows','saveLegacy'])if(typeof source?.[method]!=='function')fail('DataError');
 const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=fn=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id)&&!id.startsWith('day-reserve-');
 function rawRecord(row,date){
  if(row===null)return null;
  if(!row||typeof row!=='object'||Object.keys(row).some(key=>!DAY_HEADERS.includes(key))||row.date!==date)fail('DataError');
  const record={};for(const key of DAY_HEADERS){const value=row[key]===undefined&&DAY_EXTRA_HEADERS.includes(key)?'':row[key];if(typeof value!=='string')fail('DataError');record[key]=value;}return record;
 }
 function rawOne(date,rows=source.read(date)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?rawRecord(rows[0],date):null;}
 const snapshot=row=>syncDaySnapshot_(Object.fromEntries(DAY_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,row?.[key]??''])));
 function directoryData(data){
  if(!fields(data,['format','dates'])||data.format!=='sync-day-routing/v1'||!Array.isArray(data.dates)||data.dates.length>128||data.dates.some(date=>typeof date!=='string'||!validDate_(date))||new Set(data.dates).size!==data.dates.length||syncCommitCanonical_([...data.dates].sort())!==syncCommitCanonical_(data.dates))fail('ProtocolCorrupt');return data;
 }
 function directory(){const entity=unwrap(protocol.read('settings',directoryId)).entity;if(!entity)return {dates:[],version:null};if(entity.deleted)fail('ProtocolCorrupt');return {...directoryData(entity.data),version:entity.version};}
 function routeData(data,date){if(!fields(data,['format','date','sourceDigest','legacyVersion'])||data.format!=='sync-day-route/v1'||data.date!==date||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||typeof data.legacyVersion!=='string')fail('ProtocolCorrupt');return data;}
 function route(date){const entity=unwrap(protocol.read('settings',routeId(date))).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,date),version:entity.version};}
 function checkSource(date,descriptor,rows){if(hash(rawOne(date,rows))!==descriptor.sourceDigest)fail('CommitBlocked');}
 function planValue(data,kind,fingerprint,operationId,date){
   if(!fields(data,['format','kind','fingerprint','request'])||data.format!=='sync-day-plan/v1')fail('ProtocolCorrupt');
   if(data.kind!==kind||data.fingerprint!==fingerprint)fail('OperationMismatch');
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||request.changes.length!==(kind==='migrate'?3:1))fail('ProtocolCorrupt');
  const change=request.changes[0];if(!fields(change,['collection','id','baseVersion','action','data'])||change.collection!=='days'||change.id!==date||change.action!=='upsert'||!fields(change.data,['format','record'])||change.data.format!=='sync-day/v1'||syncCommitCanonical_(syncDaySnapshot_(change.data.record))!==syncCommitCanonical_(change.data.record)||change.data.record.date!==date)fail('ProtocolCorrupt');
  if(kind==='migrate'){
   const r=request.changes[1],d=request.changes[2];
   if(change.baseVersion!==null||!fields(r,['collection','id','baseVersion','action','data'])||r.collection!=='settings'||r.id!==routeId(date)||r.action!=='upsert'||r.baseVersion!==null||!fields(d,['collection','id','baseVersion','action','data'])||d.collection!=='settings'||d.id!==directoryId||d.action!=='upsert')fail('ProtocolCorrupt');
   routeData(r.data,date);if(!directoryData(d.data).dates.includes(date))fail('ProtocolCorrupt');
  }
  return request;
 }
 function savedPlan(kind,input,operationId,date,prepare){
  const fingerprint=hash({kind,input}),key=hash([scope.principalId,operationId]),id='day-plan:'+key;
  let entity=unwrap(protocol.read('settings',id)).entity;
  if(!entity){
   const data={format:'sync-day-plan/v1',kind,fingerprint,request:prepare()};planValue(data,kind,fingerprint,operationId,date);
   const reservation={operationId:'day-reserve-'+key,changes:[{collection:'settings',id,baseVersion:null,action:'upsert',data}]};
   if(typeof store.preflightWrites==='function'){
    const sequence=unwrap(protocol.recover()).committedThrough;
    if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(data.request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');
   }
   const reserved=unwrap(protocol.execute(reservation));
   if(reserved.status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',id)).entity;
  }
  if(!entity||entity.deleted)fail('ProtocolCorrupt');return planValue(entity.data,kind,fingerprint,operationId,date);
 }
 const upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 function commit(request){const result=unwrap(protocol.execute(request));if(result.status==='conflict')fail('ConflictError');return {...result,scope:copy(scope)};}
 const delta=record=>({delta:true,entries:[],commonIncluded:false,commonUpserts:{days:[record]}});
 function save(payload){
  const values=dayValues_(payload),version=payload.updatedAt||'';if(typeof version!=='string')fail('DataError');
  const input={values,version},operationId=payload.operationId===undefined?'day-edit-'+hash(input):payload.operationId;
  if(!validId(operationId))fail('DataError');const index=directory();
  if(!index.dates.includes(values.date)){
   if(unwrap(protocol.read('settings',routeId(values.date))).entity!==null||unwrap(writer.read(values.date)).version!==null)fail('CommitBlocked');
   return source.saveLegacy(payload);
  }
  const descriptor=route(values.date);checkSource(values.date,descriptor);
  const request=savedPlan('edit',input,operationId,values.date,()=>{
   const current=unwrap(writer.read(values.date));if(!current.day||current.deleted)fail('CommitBlocked');
   const day=syncDaySnapshot_({...current.day,...values});
   const baseVersion=version===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(version)?version:null;
   return syncPlanDayOperation_({operationId,baseVersion,day});
  });
  checkSource(values.date,descriptor);const ack=commit(request);checkSource(values.date,descriptor);
  return {...request.changes[0].data.record,updatedAt:ack.versions[0].version};
 }
 return Object.freeze({
  preview(date){return run(()=>{if(typeof date!=='string'||!validDate_(date))fail('DataError');const row=rawOne(date);const day=row?snapshot(row):syncDaySnapshot_({...Object.fromEntries(DAY_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,''])),date});return {date,legacy:row,sourceDigest:hash(row),day,migrated:directory().dates.includes(date)};});},
  migrate(input){return run(()=>{
   if(!fields(input,['operationId','date','expectedLegacy'])||!validId(input.operationId)||typeof input.date!=='string'||!validDate_(input.date))fail('DataError');
   const expected=rawRecord(input.expectedLegacy,input.date),sourceDigest=hash(expected);
   const request=savedPlan('migrate',{date:input.date,expected},input.operationId,input.date,()=>{
    if(hash(rawOne(input.date))!==sourceDigest)fail('CommitBlocked');const index=directory();
    if(index.dates.includes(input.date)||index.dates.length>=128||unwrap(writer.read(input.date)).version!==null)fail('CommitBlocked');
    const day=expected?snapshot(expected):syncDaySnapshot_({...Object.fromEntries(DAY_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,''])),date:input.date});
    return {operationId:input.operationId,changes:[syncPlanDayOperation_({operationId:input.operationId,baseVersion:null,day}).changes[0],upsert('settings',routeId(input.date),null,{format:'sync-day-route/v1',date:input.date,sourceDigest,legacyVersion:expected?.updatedAt||''}),upsert('settings',directoryId,index.version,{format:'sync-day-routing/v1',dates:[...index.dates,input.date].sort()})]};
   });
   if(hash(rawOne(input.date))!==sourceDigest)fail('CommitBlocked');const ack=commit(request);if(hash(rawOne(input.date))!==sourceDigest)fail('CommitBlocked');return ack;
  });},
  saveLegacy(payload){return run(()=>delta(save(payload)));},
  saveBatch(days){return run(()=>{
   if(!Array.isArray(days)||!days.length||days.length>10||traceBytes_(JSON.stringify(days))>500000||days.some(day=>!day||!validDate_(day.date))||new Set(days.map(day=>day.date)).size!==days.length)fail('DataError');
   const records=[],results=[];let stopped=false;
   for(const payload of days){
    try{dayValues_(payload);}catch(ignore){results.push({date:payload.date,status:'invalid',error:'Campi della giornata non validi.'});continue;}
    if(stopped){results.push({date:payload.date,status:'notAttempted',error:'Invio interrotto. Riprova.'});continue;}
    try{records.push(save(payload));results.push({date:payload.date,status:'saved'});}catch(error){const conflict=error.name==='ConflictError';if(!conflict)stopped=true;results.push({date:payload.date,status:conflict?'conflict':'error',error:conflict?'Giornata modificata altrove. Conserva la bozza e aggiorna.':'Salvataggio non confermato. La bozza deve essere conservata.'});}
   }
   return {delta:true,entries:[],commonIncluded:false,commonUpserts:{days:records},results,errors:results.filter(result=>result.status!=='saved')};
  });},
  readRows(ranges=null){return run(()=>{
   if(ranges!==null&&(!Array.isArray(ranges)||!ranges.length||ranges.length>10||ranges.some(range=>!range||typeof range.from!=='string'||typeof range.to!=='string'||!validDate_(range.from)||!validDate_(range.to)||range.from>range.to||(Date.parse(range.to)-Date.parse(range.from))/86400000>400)))fail('DataError');
   const index=directory(),rows=source.readRows(ranges);if(!Array.isArray(rows))fail('ProtocolCorrupt');
   const selected=index.dates.filter(date=>ranges===null||ranges.some(range=>date>=range.from&&date<=range.to)),replacements=new Map();
   for(const date of selected){const descriptor=route(date);checkSource(date,descriptor,rows.filter(row=>row.date===date));const current=unwrap(writer.read(date));if(current.version===null)fail('ProtocolCorrupt');replacements.set(date,current.day?{...current.day,updatedAt:current.version}:null);}
   const out=[];for(const row of rows){if(replacements.has(row.date)){const replacement=replacements.get(row.date);if(replacement)out.push(replacement);replacements.delete(row.date);}else out.push(row);}
   for(const row of replacements.values())if(row)out.push(row);return out;
  });}
 });
}
// Persistent, single-archive routing controller. Registration is explicit and
// never provisions tables or identities. The immutable anchor prevents a
// missing/disabled state from silently exposing frozen legacy preimages.
function syncDayRoutingController_(services){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Giornata o configurazione modificata altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const keys={anchor:'SYNC_DAY_ROUTING_ANCHOR_V1',a:'SYNC_DAY_ROUTING_STATE_A_V1',b:'SYNC_DAY_ROUTING_STATE_B_V1',am:'SYNC_DAY_ROUTING_MARK_A_V1',bm:'SYNC_DAY_ROUTING_MARK_B_V1'};
 let owned=false;
 const protect=fn=>{try{return fn();}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','ConflictError','OperationMismatch','CommitBlocked','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const locked=fn=>{if(owned)fail('BusyError');return services.withLock(()=>{owned=true;try{return fn();}finally{owned=false;}});};
 const hash=value=>{const digest=services.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const seal=value=>({...value,checksum:hash(value)});
 const fields=(value,list)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===list.length&&Object.keys(value).every(key=>list.includes(key));
 const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value);
 const nonempty=value=>typeof value==='string'&&value.length>0&&value.length<=200;
 function parse(raw){try{if(typeof raw!=='string'||raw.length>4096)fail('ProtocolCorrupt');const value=JSON.parse(raw),{checksum,...body}=value;if(hash(body)!==checksum||syncCommitCanonical_(value)!==raw)fail('ProtocolCorrupt');return body;}catch(ignore){fail('ProtocolCorrupt');}}
 const snapshot=()=>{const properties=services.properties.getProperties();if(!properties||Object.prototype.toString.call(properties)!=='[object Object]')fail('StorageError');return properties;};
 const absent=p=>{if(Object.keys(p).some(key=>key.startsWith('SYNC_DAY_ROUTING_')&&!Object.values(keys).includes(key)))fail('ProtocolUnavailable');return Object.values(keys).every(key=>!Object.prototype.hasOwnProperty.call(p,key));};
 function anchorValue(raw){
  const value=parse(raw);
  if(!fields(value,['format','archive','binding'])||value.format!=='sync-day-routing-anchor/v1'||!fields(value.archive,['archiveId','epoch'])||![value.archive.archiveId,value.archive.epoch].every(identifier)||!fields(value.binding,['dbId','rootId','daysSheetId','indexSheetId','blockSheetId'])||![value.binding.dbId,value.binding.rootId].every(nonempty))fail('ProtocolCorrupt');
  const ids=[value.binding.daysSheetId,value.binding.indexSheetId,value.binding.blockSheetId];if(ids.some(id=>!Number.isSafeInteger(id)||id<0)||new Set(ids).size!==3)fail('ProtocolCorrupt');return value;
 }
 function current(p,anchor){
  const states=[];
  for(const [slot,dataKey,markKey]of [['a',keys.a,keys.am],['b',keys.b,keys.bm]]){
   const marker=p[markKey]??'';
   if(typeof marker!=='string')fail('ProtocolCorrupt');
   if(!/^ok:[1-9][0-9]{0,15}:[a-f0-9]{64}$/.test(marker)){
    // Preparation/prefix markers are unpublished. A complete bad publication
    // is corruption, and must never select an older mode instead.
    if(marker!==''&&!/^(?:p(?:r(?:e(?:p(?:a(?:r(?:e(?::.*)?)?)?)?)?)?)?|o(?:k(?::(?:[1-9][0-9]{0,15}(?::[a-f0-9]{0,63})?)?)?)?)$/.test(marker))fail('ProtocolCorrupt');
    continue;
   }
   const state=parse(p[dataKey]),parts=marker.split(':');
   if(!fields(state,['format','anchorDigest','revision','mode'])||state.format!=='sync-day-routing-state/v1'||state.anchorDigest!==hash(anchor)||!Number.isSafeInteger(state.revision)||state.revision<1||state.revision>=Number.MAX_SAFE_INTEGER||String(state.revision)!==parts[1]||hash(state)!==parts[2]||!['active','readOnly'].includes(state.mode))fail('ProtocolCorrupt');
   states.push({...state,slot});
  }
  if(!states.length)fail('ProtocolUnavailable');const revision=Math.max(...states.map(state=>state.revision)),latest=states.filter(state=>state.revision===revision);
  if(latest.some(state=>state.mode!==latest[0].mode))fail('ProtocolCorrupt');return latest[0];
 }
 function context(anchor){
  const ctx=services.context();
  if(!ctx||ctx.authorized!==true||![ctx.archiveId,ctx.epoch,ctx.principalId].every(identifier)||ctx.archiveId!==anchor.archive.archiveId||ctx.epoch!==anchor.archive.epoch||ctx.dbId!==anchor.binding.dbId||ctx.rootId!==anchor.binding.rootId)fail('ScopeChanged');return ctx;
 }
 function sheets(anchor,ctx){
  const ids=[anchor.binding.daysSheetId,anchor.binding.indexSheetId,anchor.binding.blockSheetId];
  const tables=ids.map(id=>services.sheet(id,ctx));
  if(tables.some((sheet,i)=>!sheet||sheet.getSheetId()!==ids[i]||sheet.getParent().getId()!==ctx.dbId)||tables[0].getName()!=='Days')fail('ScopeChanged');return tables;
 }
 function load(){
  const p=snapshot();if(absent(p))return null;if(!p[keys.anchor])fail('ProtocolCorrupt');
  const anchor=anchorValue(p[keys.anchor]),state=current(p,anchor),ctx=context(anchor),tables=sheets(anchor,ctx);return {anchor,state,ctx,tables};
 }
 function check(loaded){
  const fresh=load();if(!fresh||hash(fresh.anchor)!==hash(loaded.anchor)||fresh.state.revision!==loaded.state.revision||fresh.ctx.principalId!==loaded.ctx.principalId)fail('ScopeChanged');return true;
 }
 function binding(loaded){
  const [day,index,blocks]=loaded.tables,scope={archiveId:loaded.ctx.archiveId,epoch:loaded.ctx.epoch,principalId:loaded.ctx.principalId};
  const store=syncSheetsCommitStore_(index,blocks,loaded.anchor.archive,{digest:services.digest,enabled:()=>owned,authorize:()=>check(loaded),withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}});
  return {store,scope,gateway:syncDayMigrationGateway_(store,scope,syncDaySheetSource_(day))};
 }
 function publish(anchor,mode,revision,slot,principalId){
  const state={format:'sync-day-routing-state/v1',anchorDigest:hash(anchor),mode,revision},dataKey=keys[slot],markKey=keys[slot+'m'];
  const raw=syncCommitCanonical_(seal(state)),marker='ok:'+revision+':'+hash(state);
  // Only the inactive slot is touched. A crash always retains the latest
  // published slot, or leaves a required anchor with no usable state yet.
  for(const [key,value]of [[markKey,'prepare:'+revision],[dataKey,raw],[markKey,marker]]){
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   services.properties.setProperty(key,value);if(snapshot()[key]!==value)fail('StorageError');if(context(anchor).principalId!==principalId)fail('ScopeChanged');
  }
 }
 const statusOf=loaded=>loaded?{registered:true,protocolVersion:1,mode:loaded.state.mode,revision:loaded.state.revision}:{registered:false,protocolVersion:1};
 const act=(method,args,write=false,migrate=false)=>protect(()=>locked(()=>{
  const loaded=load();if(!loaded)fail('ProtocolUnavailable');
  if(write&&loaded.state.mode!=='active'||migrate&&services.allowMigration?.()!==true)fail('ProtocolUnavailable');
  const result=binding(loaded).gateway[method](...args);check(loaded);return result;
 }));
 const facade=Object.freeze({readRows:(...args)=>act('readRows',args),preview:(...args)=>act('preview',args),saveLegacy:(...args)=>act('saveLegacy',args,true),saveBatch:(...args)=>act('saveBatch',args,true),migrate:(...args)=>act('migrate',args,true,true)});
 return Object.freeze({
  resolve:()=>protect(()=>{if(absent(snapshot()))return null;return locked(()=>{load();return facade;});}),
  status:()=>protect(()=>{if(absent(snapshot()))return statusOf(null);return locked(()=>statusOf(load()));}),
  register:input=>protect(()=>locked(()=>{
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   if(!fields(input,['daysSheetId','indexSheetId','blockSheetId'])||Object.values(input).some(id=>!Number.isSafeInteger(id)||id<0)||new Set(Object.values(input)).size!==3)fail('DataError');
   const ctx=services.context();if(!ctx||ctx.authorized!==true||![ctx.archiveId,ctx.epoch,ctx.principalId].every(identifier)||![ctx.dbId,ctx.rootId].every(nonempty))fail('ScopeChanged');
   const anchor={format:'sync-day-routing-anchor/v1',archive:{archiveId:ctx.archiveId,epoch:ctx.epoch},binding:{dbId:ctx.dbId,rootId:ctx.rootId,...copy(input)}};
   const p=snapshot();if(!absent(p)&&!p[keys.anchor])fail('ProtocolCorrupt');
   if(p[keys.anchor]&&hash(anchorValue(p[keys.anchor]))!==hash(anchor))fail('ScopeChanged');
   const tables=sheets(anchor,ctx);ensureDayHeaders_(tables[0]);
   // Check existing provisioned storage before making the anchor required.
   const store=syncSheetsCommitStore_(tables[1],tables[2],anchor.archive,{digest:services.digest,enabled:()=>owned,authorize:()=>{if(context(anchor).principalId!==ctx.principalId)fail('ScopeChanged');sheets(anchor,ctx);return true;},withLock:fn=>fn()});
   const recovered=syncCommitProtocol_(store,{archiveId:ctx.archiveId,epoch:ctx.epoch,principalId:ctx.principalId}).recover();if(!recovered.ok)fail(recovered.error);
   if(!p[keys.anchor]){if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');const raw=syncCommitCanonical_(seal(anchor));services.properties.setProperty(keys.anchor,raw);if(snapshot()[keys.anchor]!==raw)fail('StorageError');if(context(anchor).principalId!==ctx.principalId)fail('ScopeChanged');}
   let established=false;try{current(snapshot(),anchor);established=true;}catch(error){if(error.name!=='ProtocolUnavailable')throw error;}
   if(!established)publish(anchor,'readOnly',1,'a',ctx.principalId);return statusOf(load());
  })),
  setMode:input=>protect(()=>locked(()=>{
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   if(!fields(input,['mode','expectedRevision'])||!['active','readOnly'].includes(input.mode)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)fail('DataError');
   const loaded=load();if(!loaded)fail('ProtocolUnavailable');const state=loaded.state;
   if(state.mode===input.mode&&(state.revision===input.expectedRevision||state.revision===input.expectedRevision+1))return statusOf(loaded);
   if(state.revision!==input.expectedRevision)fail('ConflictError');if(state.revision>=Number.MAX_SAFE_INTEGER-1)fail('ProtocolUnavailable');
   publish(loaded.anchor,input.mode,state.revision+1,state.slot==='a'?'b':'a',loaded.ctx.principalId);return statusOf(load());
  }))
 });
}
function syncDayRoutingServer_(permissions={}){
 const properties=PropertiesService.getScriptProperties();
 return syncDayRoutingController_({properties,digest:text=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join(''),
  allowConfigure:()=>permissions.allowConfigure===true,allowMigration:()=>permissions.allowMigration===true,
  withLock(fn){if(APP_LOCK_DEPTH>0)return fn();const lock=LockService.getScriptLock();if(!lock.tryLock(0))throw Object.assign(Error('BusyError'),{name:'BusyError'});try{return fn();}finally{lock.releaseLock();}},
  context(){
   const p=properties.getProperties(),dbId=p.DB_ID,rootId=p.ROOT_ID;
   if(!manifestPrincipal_()||!dbId||!rootId)return {authorized:false};
   const identity=JSON.parse(p['LOCAL_ARCHIVE_V1:'+JSON.stringify([dbId,rootId])]||'null'),principalId=PropertiesService.getUserProperties().getProperty('LOCAL_PRINCIPAL_V1');
   if(!identity||identity.schemaVersion!==1)return {authorized:false};
   const authorized=!DriveApp.getFileById(dbId).isTrashed()&&!DriveApp.getFolderById(rootId).isTrashed();
   return {authorized,dbId,rootId,archiveId:identity.archiveId,epoch:identity.epoch,principalId};
  },
  sheet(id,ctx){const db=SpreadsheetApp.openById(ctx.dbId);if(db.getId()!==ctx.dbId)throw Object.assign(Error('ScopeChanged'),{name:'ScopeChanged'});return db.getSheetById(id);}
 });
}
function syncCommitProtocol_(store,trustedScope){
 const fail=name=>{throw Object.assign(new Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const same=(a,b)=>syncCommitCanonical_(a)===syncCommitCanonical_(b);
 const hasKey=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).every(key=>keys.includes(key));
 const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value);
 const collections=['entries','contents','days','weeks','goals','habits','habitLogs','projects','taskPlans','files','settings','layouts','docRefs','docQueue','previews'];
 const scope=copy(trustedScope),archive={archiveId:scope.archiveId,epoch:scope.epoch};
 if(!fields(scope,['archiveId','principalId','epoch'])||![scope.archiveId,scope.principalId,scope.epoch].every(identifier))fail('DataError');
 for(const method of ['withLock','digest','readHead','writeHead','readEntity','writeEntity','readCommit','writeCommit','findCommitByOperation','readReceipt','writeReceipt'])if(typeof store?.[method]!=='function')fail('DataError');
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const seal=value=>({...value,checksum:hash(value)});
 function unseal(value){if(!value||typeof value.checksum!=='string')fail('ProtocolCorrupt');const {checksum,...body}=value;if(hash(body)!==checksum)fail('ProtocolCorrupt');return body;}
 const checkedWrite=(write,read,value)=>{write(copy(value));if(!same(read(),value))fail('ProtocolCorrupt');};
 const saveHead=value=>checkedWrite(record=>store.writeHead(record),()=>store.readHead(),seal(value));
 const guarded=fn=>{try{const value=store.withLock(fn);if(value&&typeof value.then==='function')fail('ProtocolCorrupt');return {ok:true,value:copy(value)};}catch(error){return {ok:false,error:['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError'].includes(error?.name)?error.name:'StorageError'};}};
 function requestValue(input){
  if(!fields(input,['operationId','changes'])||!identifier(input.operationId)||!Array.isArray(input.changes)||!input.changes.length||input.changes.length>25)fail('DataError');
  const value=copy(input),ids=new Set();
  for(const change of value.changes){
   if(!fields(change,['collection','id','baseVersion','action','data'])||!collections.includes(change.collection)||typeof change.id!=='string'||!change.id||change.id.length>200||!(change.baseVersion===null||typeof change.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(change.baseVersion))||!['upsert','delete'].includes(change.action))fail('DataError');
   const key=JSON.stringify([change.collection,change.id]);if(ids.has(key))fail('DataError');ids.add(key);
   if(change.action==='delete'){if(hasKey(change,'data'))fail('DataError');}
   else if(!change.data||Object.prototype.toString.call(change.data)!=='[object Object]')fail('DataError');
  }
  if(syncCommitCanonical_(value).length>32768)fail('DataError');return value;
 }
 function headValue(){
  const raw=store.readHead();if(raw===null)fail('ProtocolUnavailable');const value=unseal(raw);
  if(!value||value.format!=='sync-head/v1'||!same(value.archive,archive)||!Number.isSafeInteger(value.committedThrough)||value.committedThrough<0||value.committedThrough>=Number.MAX_SAFE_INTEGER||!hasKey(value,'pending'))fail('ProtocolCorrupt');
  return copy(value);
 }
 function entityValue(value,collection,id,maxSequence){
  if(value===null)return null;
  if(!value||!same(value.archive,archive)||value.collection!==collection||value.id!==id||!Number.isSafeInteger(value.sequence)||value.sequence<1||value.sequence>maxSequence||value.version!=='commit-'+value.sequence||typeof value.deleted!=='boolean'||(value.deleted?value.data!==null:!value.data||Object.prototype.toString.call(value.data)!=='[object Object]'))fail('ProtocolCorrupt');
  return value;
 }
 function afterImages(pending){return pending.request.changes.map(change=>({archive,collection:change.collection,id:change.id,sequence:pending.sequence,version:'commit-'+pending.sequence,deleted:change.action==='delete',data:change.action==='delete'?null:change.data}));}
 function receiptValue(value,principalId,operationId){
  if(value===null)return null;const body=unseal(value);
  if(body.format!=='sync-receipt/v1'||!same(body.archive,archive)||body.principalId!==principalId||body.operationId!==operationId||!/^[a-f0-9]{64}$/.test(body.fingerprint||'')||body.response?.operationId!==operationId||!['committed','conflict'].includes(body.response?.status))fail('ProtocolCorrupt');
  const response=body.response,validKey=item=>collections.includes(item?.collection)&&typeof item.id==='string'&&item.id.length>0&&item.id.length<=200;
  if(response.status==='committed'){
   if(!Number.isSafeInteger(response.sequence)||response.sequence<1||!Array.isArray(response.versions)||!response.versions.length||response.versions.length>25||response.versions.some(item=>!validKey(item)||item.version!=='commit-'+response.sequence||typeof item.deleted!=='boolean'))fail('ProtocolCorrupt');
  }else if(response.sequence!==null||!Array.isArray(response.conflicts)||!response.conflicts.length||response.conflicts.length>25||response.conflicts.some(item=>!validKey(item)||!(item.expectedVersion===null||typeof item.expectedVersion==='string')||!(item.actualVersion===null||typeof item.actualVersion==='string')))fail('ProtocolCorrupt');
  return body;
 }
 function recoverLocked(head){
  if(head.pending===null)return head;
  const pending=unseal(head.pending);
  if(pending.sequence!==head.committedThrough+1||!identifier(pending.principalId)||!Array.isArray(pending.before))fail('ProtocolCorrupt');
  const request=requestValue(pending.request);if(hash(request)!==pending.fingerprint||pending.before.length!==request.changes.length)fail('ProtocolCorrupt');
  const after=afterImages(pending);
  // Check every member before resuming: a legacy/external mutation must block
  // recovery before it overwrites any further entity in the prepared plan.
  const actual=request.changes.map((change,index)=>{
   const before=entityValue(pending.before[index],change.collection,change.id,head.committedThrough);
   if((before?.version??null)!==change.baseVersion)fail('ProtocolCorrupt');
   const value=entityValue(store.readEntity(change.collection,change.id),change.collection,change.id,pending.sequence);
   if(!same(value,before)&&!same(value,after[index]))fail('CommitBlocked');return value;
  });
  after.forEach((entity,index)=>{if(!same(actual[index],entity))checkedWrite(value=>store.writeEntity(entity.collection,entity.id,value),()=>store.readEntity(entity.collection,entity.id),entity);});
  const commit=seal({format:'sync-commit/v1',archive,principalId:pending.principalId,operationId:request.operationId,fingerprint:pending.fingerprint,sequence:pending.sequence,changes:after});
  const existingCommit=store.readCommit(pending.sequence);if(existingCommit!==null&&!same(existingCommit,commit))fail('ProtocolCorrupt');
  if(existingCommit===null)checkedWrite(value=>store.writeCommit(pending.sequence,value),()=>store.readCommit(pending.sequence),commit);
  const response={status:'committed',operationId:request.operationId,sequence:pending.sequence,versions:after.map(entity=>({collection:entity.collection,id:entity.id,version:entity.version,deleted:entity.deleted}))};
  const receipt=seal({format:'sync-receipt/v1',archive,principalId:pending.principalId,operationId:request.operationId,fingerprint:pending.fingerprint,response});
  const existingReceipt=store.readReceipt(pending.principalId,request.operationId);if(existingReceipt!==null&&!same(existingReceipt,receipt))fail('ProtocolCorrupt');
  if(existingReceipt===null)checkedWrite(value=>store.writeReceipt(pending.principalId,request.operationId,value),()=>store.readReceipt(pending.principalId,request.operationId),receipt);
  // Publication is last. A lost ACK at any preceding write leaves the entire
  // recovery plan intact; neither readers nor the feed may skip that hole.
  const next={...head,committedThrough:pending.sequence,pending:null};saveHead(next);return next;
 }
 function commitValue(value,sequence){
  const commit=unseal(value);
  if(commit.format!=='sync-commit/v1'||!same(commit.archive,archive)||commit.sequence!==sequence||!identifier(commit.operationId)||!identifier(commit.principalId)||!/^[a-f0-9]{64}$/.test(commit.fingerprint||'')||!Array.isArray(commit.changes)||!commit.changes.length||commit.changes.length>25)fail('ProtocolCorrupt');
  const keys=new Set();for(const entity of commit.changes){if(!collections.includes(entity.collection)||typeof entity.id!=='string'||!entity.id||entity.id.length>200||entity.sequence!==sequence)fail('ProtocolCorrupt');entityValue(entity,entity.collection,entity.id,sequence);const key=JSON.stringify([entity.collection,entity.id]);if(keys.has(key))fail('ProtocolCorrupt');keys.add(key);}return commit;
 }
 const cursor=sequence=>({format:'sync-cursor/v1',...scope,sequence});
 return Object.freeze({
  execute:input=>guarded(()=>{
   const request=requestValue(input),fingerprint=hash(request),head=recoverLocked(headValue());
   const stored=receiptValue(store.readReceipt(scope.principalId,request.operationId),scope.principalId,request.operationId);
   if(stored){if(stored.fingerprint!==fingerprint)fail('OperationMismatch');if(stored.response.status==='committed'){
    if(stored.response.sequence>head.committedThrough)fail('ProtocolCorrupt');const commit=commitValue(store.readCommit(stored.response.sequence),stored.response.sequence);
    if(commit.principalId!==scope.principalId||commit.operationId!==request.operationId||commit.fingerprint!==fingerprint||!same(stored.response.versions,commit.changes.map(entity=>({collection:entity.collection,id:entity.id,version:entity.version,deleted:entity.deleted}))))fail('ProtocolCorrupt');
   }return stored.response;}
   // A retained commit is an independent proof of an already-applied ID. A
   // missing receipt must not turn an old edit/delete into a fresh operation.
   const previous=store.findCommitByOperation(scope.principalId,request.operationId);
   if(previous!==null){
    const commit=commitValue(previous,previous.sequence);if(commit.sequence>head.committedThrough||commit.principalId!==scope.principalId||commit.operationId!==request.operationId)fail('ProtocolCorrupt');if(commit.fingerprint!==fingerprint)fail('OperationMismatch');
    const response={status:'committed',operationId:request.operationId,sequence:commit.sequence,versions:commit.changes.map(entity=>({collection:entity.collection,id:entity.id,version:entity.version,deleted:entity.deleted}))};
    const receipt=seal({format:'sync-receipt/v1',archive,principalId:scope.principalId,operationId:request.operationId,fingerprint,response});checkedWrite(value=>store.writeReceipt(scope.principalId,request.operationId,value),()=>store.readReceipt(scope.principalId,request.operationId),receipt);return response;
   }
   const before=request.changes.map(change=>entityValue(store.readEntity(change.collection,change.id),change.collection,change.id,head.committedThrough));
   const conflicts=request.changes.flatMap((change,index)=>{const actual=before[index]?.version??null;return actual!==change.baseVersion||change.action==='delete'&&(!before[index]||before[index].deleted)?[{collection:change.collection,id:change.id,expectedVersion:change.baseVersion,actualVersion:actual}]:[];});
   if(conflicts.length){
    if(typeof store.preflightWrites==='function'&&!store.preflightWrites([{kind:'receipt',id:[scope.principalId,request.operationId],writes:1}]).available)fail('ProtocolUnavailable');
    const response={status:'conflict',operationId:request.operationId,sequence:null,conflicts},receipt=seal({format:'sync-receipt/v1',archive,principalId:scope.principalId,operationId:request.operationId,fingerprint,response});
    checkedWrite(value=>store.writeReceipt(scope.principalId,request.operationId,value),()=>store.readReceipt(scope.principalId,request.operationId),receipt);return response;
   }
   if(head.committedThrough>=Number.MAX_SAFE_INTEGER-1)fail('ProtocolUnavailable');
   if(typeof store.preflightWrites==='function'&&!store.preflightWrites(syncCommitWriteBudget_(request,scope.principalId,head.committedThrough+1)).available)fail('ProtocolUnavailable');
   const pending=seal({sequence:head.committedThrough+1,principalId:scope.principalId,request,fingerprint,before});if(syncCommitCanonical_(pending).length>131072)fail('DataError');
   const prepared={...head,pending};saveHead(prepared);recoverLocked(prepared);
   return receiptValue(store.readReceipt(scope.principalId,request.operationId),scope.principalId,request.operationId).response;
  }),
  recover:()=>guarded(()=>{const head=recoverLocked(headValue());return {committedThrough:head.committedThrough};}),
  read:(collection,id)=>guarded(()=>{if(!collections.includes(collection)||typeof id!=='string'||!id||id.length>200)fail('DataError');const head=recoverLocked(headValue());return {cursor:cursor(head.committedThrough),entity:entityValue(store.readEntity(collection,id),collection,id,head.committedThrough)};}),
  changes:input=>guarded(()=>{
   if(!fields(input,['cursor','limit'])||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>5)fail('DataError');
   const token=input.cursor;if(!fields(token,['format','archiveId','principalId','epoch','sequence'])||token.format!=='sync-cursor/v1'||!Number.isSafeInteger(token.sequence)||token.sequence<0)fail('DataError');
   if(token.archiveId!==scope.archiveId||token.epoch!==scope.epoch||token.principalId!==scope.principalId)fail('ScopeChanged');
   const head=recoverLocked(headValue());if(token.sequence>head.committedThrough)fail('DataError');
   const commits=[];let through=token.sequence;
   for(let sequence=through+1;sequence<=head.committedThrough&&commits.length<input.limit;sequence++){
    const value=commitValue(store.readCommit(sequence),sequence),commit={sequence:value.sequence,operationId:value.operationId,changes:value.changes};
    const candidate={commits:commits.concat([commit]),cursor:cursor(sequence),hasMore:sequence<head.committedThrough,highWater:head.committedThrough};
    if(syncCommitCanonical_(candidate).length>131072){if(!commits.length)fail('ProtocolCorrupt');break;}commits.push(commit);through=sequence;
   }
   return {commits,cursor:cursor(through),hasMore:through<head.committedThrough,highWater:head.committedThrough};
  })
 });
}

const SYNC_SHEET_INDEX_HEADERS=['key','operation','reference','publication'];
const SYNC_SHEET_BLOCK_HEADERS=['generation','part','payload'];
// Explicitly supplied dedicated sheets only: no db_(), creation, setup or caller
// in production. Payloads and reference publications are append-only.
function syncSheetsCommitStore_(indexSheet,blockSheet,trustedArchive,services={}){
 const fail=name=>{throw Object.assign(new Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const same=(a,b)=>syncCommitCanonical_(a)===syncCommitCanonical_(b),archive=copy(trustedArchive);
 if(!archive||Object.keys(archive).sort().join(',')!=='archiveId,epoch'||![archive.archiveId,archive.epoch].every(value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value))||indexSheet===blockSheet)fail('DataError');
 const digest=services.digest||function(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');};
 const encode=services.encode||function(text){return Utilities.base64Encode(text,Utilities.Charset.UTF_8);};
 const decode=services.decode||function(text){return Utilities.newBlob(Utilities.base64Decode(text)).getDataAsString('UTF-8');};
 const flush=services.flush||function(){SpreadsheetApp.flush();},uuid=services.uuid||function(){return Utilities.getUuid();};
 const lock=services.withLock||function(fn){if(APP_LOCK_DEPTH>0)return fn();const handle=LockService.getScriptLock();if(!handle.tryLock(0))fail('BusyError');try{return fn();}finally{handle.releaseLock();}};
 let active=false;
 const guard=()=>{if(!active||services.enabled?.()!==true)fail('ProtocolUnavailable');if(services.authorize?.(copy(archive))!==true)fail('ScopeChanged');};
 const hash=text=>{const result=digest(text);if(typeof result!=='string'||!/^[a-f0-9]{64}$/.test(result))fail('ProtocolCorrupt');return result;};
 const key=(kind,id)=>'k:'+hash(syncCommitCanonical_([archive,kind,id]));
 function headers(sheet,expected){if(sheet.getLastColumn()!==expected.length||!same(sheet.getRange(1,1,1,expected.length).getDisplayValues()[0],expected))fail('ProtocolCorrupt');}
 function capacity(sheet,end){const max=sheet.getMaxRows();if(end>max)sheet.insertRowsAfter(max,end-max);}
 function append(sheet,rows){guard();const start=sheet.getLastRow()+1;capacity(sheet,start+rows.length-1);sheet.getRange(start,1,rows.length,rows[0].length).setNumberFormat('@').setValues(rows);flush();guard();if(!same(sheet.getRange(start,1,rows.length,rows[0].length).getDisplayValues(),rows))fail('ProtocolCorrupt');return start;}
 function find(column,value){
  guard();const count=indexSheet.getLastRow()-1;if(count<=0)return [];
  const rows=indexSheet.getRange(2,column,count,1).createTextFinder(value).useRegularExpression(false).matchEntireCell(true).findAll().map(range=>range.getRow());
  if(rows.length>512)fail('ProtocolUnavailable');return rows;
 }
 function unpack(text){
  try{if(typeof text!=='string'||!text||text.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))fail('ProtocolCorrupt');const raw=decode(text);if(encode(raw)!==text)fail('ProtocolCorrupt');return raw;}catch(error){fail('ProtocolCorrupt');}
 }
 function references(rows,expectedKey,operation){
  const refs=[];
  for(const row of rows){
   const cells=indexSheet.getRange(row,1,1,4).getDisplayValues()[0],marker=cells[3];
   if(!/^ok:[a-f0-9]{64}$/.test(marker)){
    // A publication cell starts empty and is never overwritten. A prefix is
    // an unacknowledged attempt, not a reason to discard the last good value.
    if(marker!==''&&!/^o(k(:[a-f0-9]{0,63})?)?$/.test(marker))fail('ProtocolCorrupt');continue;
   }
   if(marker!=='ok:'+hash(syncCommitCanonical_(cells.slice(0,3)))||typeof cells[2]!=='string'||cells[2].length>2048||!cells[2].startsWith('r1:'))fail('ProtocolCorrupt');
   let ref;try{ref=JSON.parse(unpack(cells[2].slice(3)));}catch(error){fail('ProtocolCorrupt');}
   if(!ref||ref.format!=='sync-sheet-ref/v1'||ref.key!==cells[0]||expectedKey&&ref.key!==expectedKey||operation!==undefined&&cells[1]!==operation||!Number.isSafeInteger(ref.revision)||ref.revision<1||ref.revision>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(ref.start)||ref.start<2||!Number.isSafeInteger(ref.count)||ref.count<1||ref.count>256||typeof ref.generation!=='string'||!/^g:[a-zA-Z0-9-]{10,80}$/.test(ref.generation)||!/^[a-f0-9]{64}$/.test(ref.digest||''))fail('ProtocolCorrupt');
   refs.push({row,operation:cells[1],...ref});
  }
  return refs;
 }
 function latest(refs){
  if(!refs.length)return null;const revision=Math.max(...refs.map(ref=>ref.revision)),candidates=refs.filter(ref=>ref.revision===revision),first=candidates[0];
  if(candidates.some(ref=>ref.key!==first.key||ref.operation!==first.operation||ref.digest!==first.digest))fail('ProtocolCorrupt');return first;
 }
 function load(ref){
  if(ref===null)return null;guard();
  if(ref.start+ref.count-1>blockSheet.getLastRow())fail('ProtocolCorrupt');
  const rows=blockSheet.getRange(ref.start,1,ref.count,3).getDisplayValues();
  if(rows.some((row,i)=>row[0]!==ref.generation||row[1]!=='n:'+i||typeof row[2]!=='string'||!row[2].startsWith('b1:')||row[2].length>8195))fail('ProtocolCorrupt');
  const encoded=rows.map(row=>row[2].slice(3)).join(''),raw=unpack(encoded);if(raw.length>262144||hash(raw)!==ref.digest)fail('ProtocolCorrupt');
  let value;try{value=JSON.parse(raw);}catch(error){fail('ProtocolCorrupt');}
  if(!value||!same(value.archive,archive)||syncCommitCanonical_(value)!==raw)fail('ProtocolCorrupt');return value;
 }
 function read(kind,id,operation){guard();return load(latest(references(find(1,key(kind,id)),key(kind,id),operation)));}
 function write(kind,id,value,operation='',immutable=false){
  guard();if(!same(value.archive,archive))fail('ScopeChanged');const lookup=key(kind,id),matched=find(1,lookup),refs=references(matched,lookup,operation),prior=latest(refs),raw=syncCommitCanonical_(value);
  if(raw.length>262144)fail('DataError');
  if(prior){const previous=load(prior);if(same(previous,value))return;if(immutable)fail('OperationMismatch');if(prior.revision>=Number.MAX_SAFE_INTEGER-1)fail('ProtocolUnavailable');}
  if(matched.length>=512)fail('ProtocolUnavailable');
  const generation='g:'+uuid();if(!/^g:[a-zA-Z0-9-]{10,80}$/.test(generation))fail('ProtocolCorrupt');
  const encoded=encode(raw);if(unpack(encoded)!==raw)fail('ProtocolCorrupt');
  const parts=[];for(let offset=0;offset<encoded.length;offset+=8192)parts.push([generation,'n:'+parts.length,'b1:'+encoded.slice(offset,offset+8192)]);
  if(!parts.length||parts.length>256)fail('DataError');
  const start=append(blockSheet,parts),ref={format:'sync-sheet-ref/v1',key:lookup,revision:(prior?.revision||0)+1,generation,start,count:parts.length,digest:hash(raw)};
  const cells=[lookup,operation,'r1:'+encode(syncCommitCanonical_(ref)),''],row=append(indexSheet,[cells]);
  const marker='ok:'+hash(syncCommitCanonical_(cells.slice(0,3)));
  guard();indexSheet.getRange(row,4).setNumberFormat('@').setValue(marker);flush();guard();
  if(indexSheet.getRange(row,4).getDisplayValues()[0][0]!==marker)fail('ProtocolCorrupt');
  const published=latest(references(find(1,lookup),lookup,operation));if(!published||published.revision!==ref.revision||published.digest!==ref.digest||!same(load(published),value))fail('ProtocolCorrupt');
 }
 function budgetKey(item){
  if(!item||Object.keys(item).sort().join(',')!=='id,kind,writes'||!Number.isSafeInteger(item.writes)||item.writes<1||item.writes>512)fail('DataError');
  const id=item.id,pair=Array.isArray(id)&&id.length===2&&id.every(value=>typeof value==='string'&&value.length>0&&value.length<=200);
  if(!(item.kind==='head'&&id==='head'||item.kind==='entity'&&pair||item.kind==='commit'&&Number.isSafeInteger(id)&&id>0||['receipt','operation'].includes(item.kind)&&pair))fail('DataError');
  return {lookup:key(item.kind,id),column:item.kind==='operation'?2:1};
 }
 function preflightWrites(items){
  guard();if(!Array.isArray(items)||!items.length||items.length>100)fail('DataError');const grouped=new Map();
  for(const item of items){const {lookup,column}=budgetKey(item),prior=grouped.get(lookup);grouped.set(lookup,{kind:item.kind,key:lookup,column,required:(prior?.required||0)+item.writes});}
  const keys=[...grouped.values()].map(({column,...item})=>{const used=find(column,item.key).length;return {...item,used,remaining:512-used,available:used+item.required<=512};});
  return {limit:512,available:keys.every(item=>item.available),keys};
 }
 function compactReferences(input){
  guard();if(!input||Object.keys(input).sort().join(',')!=='dryRun,id,kind,limit'||!['head','entity'].includes(input.kind)||typeof input.dryRun!=='boolean'||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>128)fail('DataError');
  const {lookup}=budgetKey({kind:input.kind,id:input.id,writes:1}),matched=find(1,lookup),refs=references(matched,lookup,''),keep=latest(refs);
  if(!keep)fail('ProtocolUnavailable');const preserved=load(keep);
  // Only mutable head/entity keys have no operation alias. Retain the exact
  // latest published row, including a pending recovery head, without moving it.
  for(const row of matched)if(indexSheet.getRange(row,2).getDisplayValues()[0][0]!=='')fail('ProtocolCorrupt');
  const obsolete=matched.filter(row=>row!==keep.row),planned=obsolete.slice(0,input.limit);
  const report={kind:input.kind,matched:matched.length,eligible:obsolete.length,planned:planned.length,retired:0,remaining:matched.length,hasMore:obsolete.length>0};
  if(input.dryRun)return report;
  const maintenanceGuard=()=>{guard();if(services.maintenanceEnabled?.()!==true)fail('ProtocolUnavailable');};
  maintenanceGuard();
  for(const row of planned){
   maintenanceGuard();
   const marker='retired:'+hash(syncCommitCanonical_([lookup,row,keep.digest]));
   indexSheet.getRange(row,1).setNumberFormat('@').setValue(marker);flush();maintenanceGuard();
   if(indexSheet.getRange(row,1).getDisplayValues()[0][0]!==marker)fail('ProtocolCorrupt');report.retired++;
  }
  if(!same(read(input.kind,input.id,''),preserved))fail('ProtocolCorrupt');
  report.remaining=find(1,lookup).length;report.hasMore=report.remaining>1;return report;
 }
 return Object.freeze({
  digest:hash,
  preflightWrites,compactReferences,
  withLock(fn){if(active)fail('BusyError');if(services.enabled?.()!==true)fail('ProtocolUnavailable');return lock(()=>{active=true;try{guard();headers(indexSheet,SYNC_SHEET_INDEX_HEADERS);headers(blockSheet,SYNC_SHEET_BLOCK_HEADERS);return fn();}finally{active=false;}});},
  readHead:()=>read('head','head',''),writeHead:value=>write('head','head',value),
  readEntity:(collection,id)=>read('entity',[collection,id],''),writeEntity:(collection,id,value)=>write('entity',[collection,id],value),
  readCommit:sequence=>{
   const value=read('commit',sequence);if(value===null)return null;
   const expected=key('operation',[value.principalId,value.operationId]),ref=latest(references(find(1,key('commit',sequence)),key('commit',sequence),expected));if(!ref)fail('ProtocolCorrupt');return value;
  },
  writeCommit:(sequence,value)=>write('commit',sequence,value,key('operation',[value.principalId,value.operationId]),true),
  findCommitByOperation(principalId,operationId){
   guard();
   const operation=key('operation',[principalId,operationId]),refs=references(find(2,operation),undefined,operation);
   if(new Set(refs.map(ref=>ref.key)).size>1)fail('ProtocolCorrupt');const ref=latest(refs),value=load(ref);
   if(value&&(ref.key!==key('commit',value.sequence)||value.principalId!==principalId||value.operationId!==operationId))fail('ProtocolCorrupt');return value;
  },
  readReceipt:(principalId,operationId)=>read('receipt',[principalId,operationId],''),writeReceipt:(principalId,operationId,value)=>write('receipt',[principalId,operationId],value,'',true)
 });
}
