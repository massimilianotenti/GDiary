let DB_HANDLE=null,ENTRY_SMALL_CACHE=null,ENTRY_TAG_HEADER_CHECKED=false,ENTRY_TAG_HEADER_WRITTEN=false;
// Test/server injection only. Persisted routing is also resolved on each call.
let SYNC_ROUTING_SERVER_LOCK_DEPTH=0;
let DAY_COMMIT_GATEWAY=null;
let DAY_ROUTING_CONTROLLER=null;
function dayCommitGateway_(){
 try{if(DAY_ROUTING_CONTROLLER)return DAY_ROUTING_CONTROLLER.resolve();if(DAY_COMMIT_GATEWAY)return DAY_COMMIT_GATEWAY;return syncDayRoutingServer_().resolve();}
 catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
}
let WEEK_COMMIT_GATEWAY=null;
let WEEK_ROUTING_CONTROLLER=null;
function weekCommitGateway_(){
 try{if(WEEK_ROUTING_CONTROLLER)return WEEK_ROUTING_CONTROLLER.resolve();if(WEEK_COMMIT_GATEWAY)return WEEK_COMMIT_GATEWAY;return syncWeekRoutingServer_().resolve();}
 catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
}
let HABIT_LOG_COMMIT_GATEWAY=null;
let HABIT_LOG_ROUTING_CONTROLLER=null;
function habitLogCommitGateway_(){
 try{if(HABIT_LOG_ROUTING_CONTROLLER)return HABIT_LOG_ROUTING_CONTROLLER.resolve();if(HABIT_LOG_COMMIT_GATEWAY)return HABIT_LOG_COMMIT_GATEWAY;return syncHabitLogRoutingServer_().resolve();}
 catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
}
let CATALOG_COMMIT_GATEWAY=null;
let CATALOG_ROUTING_CONTROLLER=null;
function catalogCommitGateway_(){
 if(CATALOG_ROUTING_CONTROLLER)return CATALOG_ROUTING_CONTROLLER.resolve();
 if(CATALOG_COMMIT_GATEWAY)return CATALOG_COMMIT_GATEWAY;
 try{if(PropertiesService.getScriptProperties().getProperty('SYNC_CATALOG_ROUTING_ANCHOR_V1'))return syncCatalogRoutingServer_().resolve();}catch(error){if(error?.name==='ScopeChanged'||error?.name==='ProtocolCorrupt')throw error;}
 return null;
}
let PROJECT_COMMIT_GATEWAY=null;
let PROJECT_ROUTING_CONTROLLER=null;
function projectCommitGateway_(){
 if(PROJECT_ROUTING_CONTROLLER)return PROJECT_ROUTING_CONTROLLER.resolve();
 if(PROJECT_COMMIT_GATEWAY)return PROJECT_COMMIT_GATEWAY;
 if(typeof PropertiesService==='undefined')return null;
 try{if(PropertiesService.getScriptProperties().getProperty('SYNC_PROJECT_ROUTING_ANCHOR_V1'))return syncProjectRoutingServer_().resolve();}catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
 return null;
}
let ENTRY_MIGRATION_GATEWAY=null,ENTRY_ROUTING_CONTROLLER=null;
function entryCommitGateway_(){
 if(ENTRY_ROUTING_CONTROLLER)return ENTRY_ROUTING_CONTROLLER.resolve();
 if(ENTRY_MIGRATION_GATEWAY)return ENTRY_MIGRATION_GATEWAY;
 if(typeof PropertiesService==='undefined')return null;
 try{if(PropertiesService.getScriptProperties().getProperty('SYNC_ENTRY_ROUTING_ANCHOR_V1'))return syncEntryRoutingServer_().resolve();}catch(error){if(['ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','StorageError'].includes(error?.name))throw error;throw Object.assign(Error('StorageError'),{name:'StorageError'});}
 return null;
}
function assertEntryLegacyWriteAllowed_(id){const gateway=entryCommitGateway_();if(gateway&&gateway.isRouted(id))throw Object.assign(Error('Voce instradata: completa prima il routing canonico della mutazione.'),{name:'ProtocolUnavailable'});}
function assertTaskPlanLegacyWriteAllowed_(id){assertEntryLegacyWriteAllowed_(id);}
function syncContentDigest_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,syncCommitCanonical_(value),Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');}
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
 const handlers={saveHabitLogOperation,getHabitLogOperationReceipt,getHabitLogOperationState,saveWeekOperation,getWeekOperationReceipt,getWeekOperationState,saveDayOperation,getDayOperationReceipt,getDayOperationState,getSyncManifest,getChanges,getBootstrapCheckpoint,getBootstrapCheckpointPage,getSnapshotPage,getJournalOperationReceipt,getJournalDeleteReceipt,getContentsBatch,benchmarkJournalCache,getState,getCommonState,getJournalPage,getJournalContents,getEntryDetail,saveJournalPage,saveDay,saveDays,saveWeek,setHabitLog,saveNoteText,addJournal,saveGoal,saveHabit,saveProject,setTaskStatus,saveReflectionSettings,savePrivacySettings,searchArchive,processTaskDocQueue,getDocQueueState,addFileLink,deleteHabit,deleteNote,rebaseDocQueue,refreshNotePreviews,setEntryProjects,setEntryTags,beginProjectExport,continueProjectExport,getDriveInventory,previewProjectAsTag,convertProjectToTag,getAppChangelog};
 if(!p||!Object.prototype.hasOwnProperty.call(handlers,p.operation)||!/^[-a-zA-Z0-9]{10,80}$/.test(p.traceId||''))throw Error('Richiesta diagnostica non valida.');
 const previous=ACTIVE_TRACE,start=Date.now(),trace={metrics:{},depth:{},stack:[],accounted:0};
 const diagnostics=()=>{const totalMs=Date.now()-start;return {traceId:p.traceId,totalMs,unaccountedMs:Math.max(0,totalMs-trace.accounted),...trace.metrics};};
 const arg={...(p.arg||{}),context:{...(p.arg&&p.arg.context||{}),traceId:p.traceId}};
 ACTIVE_TRACE=trace;ACTIVE_CONTEXT=arg.context;
 try{const value=handlers[p.operation](arg);return {ok:true,value,diagnostics:diagnostics()};}
 catch(error){return {ok:false,error:String(error.message||error),diagnostics:diagnostics()};}
 finally{ACTIVE_TRACE=previous;}
}
function locked_(fn,readOnly=false,background=false,docWorkerToken=null,allowExpiredDocReservation=false) {
  DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();
  const lock = LockService.getScriptLock();
  traceCount_('lockAttempts');traceCount_(background?'lockBackgroundAttempts':'lockForegroundAttempts');
  let acquired=false;
  try{acquired=traceMeasure_('lock',()=>traceMeasure_('lockWait',()=>{if(background)return lock.tryLock(0);lock.waitLock(30000);return true;}));}
  catch(error){traceCount_('lockAcquireErrors');throw error;}
  if(!acquired){traceCount_('lockBusy');return {processed:0,busy:true,pending:null,errors:[]};}
  if(!readOnly&&typeof readDocWorkerReservation_==='function'){
    let reservation;try{reservation=readDocWorkerReservation_();}catch(error){lock.releaseLock();throw error;}
    if(reservation&&reservation.token!==docWorkerToken&&!(allowExpiredDocReservation&&reservation.expiresAt<=Date.now())){
      traceCount_('docReservationBusy');lock.releaseLock();
      if(background)return {processed:0,busy:true,pending:null,errors:[],reservation:true};
      throw Object.assign(Error('Sincronizzazione Docs in corso. Riprova tra poco.'),{name:'BusyError'});
    }
  }
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
function setEntryTags(p){ACTIVE_CONTEXT=p.context||{};const tags=normaliseTags_(p.tags||''),gateway=entryCommitGateway_();if(gateway)return entryMetadataResponse_(gateway.setTags({id:p.id,updatedAt:p.updatedAt,tags}));return locked_(function(){const sheet=db_().getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Voce non trovata.');const e=readEntry_(found[0]);assertEntryLegacyWriteAllowed_(e.id);if(e.updatedAt!==p.updatedAt)throw new Error('Voce modificata altrove. Aggiorna e riprova.');e.tags=tags;e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();ensureEntryTagHeader_(sheet,true);ioInvalidate_(sheet);sheet.getRange(found[0],14).setNumberFormat('@').setValues([[/^[=+\-@']/.test(tags)?"'"+tags:tags]]);sheet.getRange(found[0],9).setValues([[e.updatedAt]]);ENTRY_SMALL_CACHE=null;attachSchedules_([e]);return {delta:true,metadataOnly:true,preserveDetailId:e.id,entries:[e],commonIncluded:false};});}
function projectTagPlan_(slug){
 const db=db_(),projectGateway=projectCommitGateway_(),entryGateway=entryCommitGateway_(),catalogGateway=catalogCommitGateway_();
 const projectRows=projectGateway?projectGateway.readRows():rows_(db.getSheetByName('Projects'),PROJECT_HEADERS);
 const entryRows=entryGateway?entryGateway.readRows():entrySearch_('id','.+');
 const goalRows=catalogGateway?catalogGateway.readRows('goals'):rows_(db.getSheetByName('Goals'),GOAL_HEADERS);
 const project=projectRows.find(p=>p.slug===slug)||null;
 const entries=entryRows.filter(e=>String(e.projects||'').split(',').includes(slug)).sort((a,b)=>a.id.localeCompare(b.id));
 const goals=goalRows.filter(g=>g.project===slug).sort((a,b)=>a.id.localeCompare(b.id));
 return {project,entries,goals,signature:projectTagSignature_(project,entries,goals)};
}
function projectTagSignature_(project,entries,goals){return JSON.stringify({project:project?{slug:project.slug,name:project.name,description:project.description,updatedAt:project.updatedAt||''}:null,entries:entries.map(e=>[e.id,e.updatedAt,e.projects,e.tags||'']),goals:goals.map(g=>[g.id,g.updatedAt||''])});}
function previewProjectAsTag(p){return locked_(function(){const slug=slug_(p.slug),plan=projectTagPlan_(slug);return {slug,name:plan.project?plan.project.name:slug,count:plan.entries.length,blockedGoals:plan.goals.map(g=>g.title),signature:plan.signature};},true);}
function convertProjectToTag(p){
 ACTIVE_CONTEXT=p.context||{};const projectGateway=projectCommitGateway_(),entryGateway=entryCommitGateway_();if(projectGateway||entryGateway){if(!projectGateway||!entryGateway)throw Object.assign(Error('Conversione progetto-tag richiede routing canonico attivo per Projects ed Entries.'),{name:'ProtocolUnavailable'});const slug=slug_(p.slug),tag=normaliseTags_(p.tag||slug);if(!tag||tag.includes(','))throw new Error('Scegli un solo tag di destinazione.');return projectGateway.convertProjectToTag({slug,tag,signature:String(p.signature||'')});}const slug=slug_(p.slug),tag=normaliseTags_(p.tag||slug);if(!tag||tag.includes(','))throw new Error('Scegli un solo tag di destinazione.');
 return locked_(function(){if(entryCommitGateway_())throw Object.assign(Error('Conversione progetto-tag non instradata atomicamente nei registri canonici.'),{name:'ProtocolUnavailable'});const plan=projectTagPlan_(slug);if(plan.goals.length)throw new Error('Questo progetto è collegato a obiettivi: correggi prima quei collegamenti.');if(p.signature!==plan.signature)throw new Error('Le voci sono cambiate. Riapri l’anteprima prima di convertire.');
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
function reflectionSettings_(){const gateway=catalogCommitGateway_();if(gateway)return {...gateway.readSetting('reflection'),...gateway.readSetting('privacy')};return reflectionSettingsProperties_();}
function reflectionSettingsProperties_(){const p=PropertiesService.getScriptProperties();return {dailyReflectionMode:p.getProperty('DAILY_REFLECTION_MODE')||'essential',version:p.getProperty('REFLECTION_SETTINGS_VERSION')||'',...privacySettingsProperties_()};}
function privacySettings_(){const gateway=catalogCommitGateway_();return gateway?gateway.readSetting('privacy'):privacySettingsProperties_();}
function privacySettingsProperties_(){const p=PropertiesService.getScriptProperties();return {privateTags:JSON.parse(p.getProperty('PRIVATE_NOTE_TAGS')||'["privato"]'),privacyVersion:p.getProperty('PRIVATE_NOTE_TAGS_VERSION')||''};}
function savePrivacySettings(p){if(!p||!Array.isArray(p.privateTags)||p.privateTags.length>30)throw Error('Scegli al massimo 30 tag privati.');const tags=normaliseTags_(p.privateTags.join(',')).split(',').filter(Boolean);ACTIVE_CONTEXT=p.context||{};const gateway=catalogCommitGateway_();if(gateway)return gateway.saveSetting('privacy',{privateTags:tags,version:p.version||''});return locked_(function(){const current=privacySettingsProperties_();if((p.version||'')!==current.privacyVersion)throw Error('Tag privati modificati altrove. Aggiorna e riprova.');const props=PropertiesService.getScriptProperties();props.setProperty('PRIVATE_NOTE_TAGS',JSON.stringify(tags));props.setProperty('PRIVATE_NOTE_TAGS_VERSION',Utilities.getUuid());return privacySettingsProperties_();});}
function saveReflectionSettings(p){
  if(!p||!['essential','detailed'].includes(p.dailyReflectionMode))throw new Error('Modalità di riflessione non valida.');
  ACTIVE_CONTEXT=p.context||{};
  const gateway=catalogCommitGateway_();if(gateway){gateway.saveSetting('reflection',{dailyReflectionMode:p.dailyReflectionMode,version:p.version||''});return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,settingsPatch:reflectionSettings_()}:state_();}
  return locked_(function(){const current=reflectionSettings_();if((p.version||'')!==current.version)throw new Error('Impostazioni modificate altrove. Aggiorna e riprova.');
    const props=PropertiesService.getScriptProperties();props.setProperty('DAILY_REFLECTION_MODE',p.dailyReflectionMode);props.setProperty('REFLECTION_SETTINGS_VERSION',Utilities.getUuid());return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,settingsPatch:reflectionSettings_()}:state_();});
}
function rows_(sheet, headers) {
  if(sheet.getName()==='Projects'){const gateway=projectCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='Weeks'){const gateway=weekCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='HabitLogs'){const gateway=habitLogCommitGateway_();if(gateway)return gateway.readRows();}
  if(['Goals','Habits'].includes(sheet.getName())){const gateway=catalogCommitGateway_();if(gateway)return gateway.readRows(sheet.getName()==='Goals'?'goals':'habits');}
  if(sheet.getName()==='Days')ensureDayHeaders_(sheet);else verify_(sheet,headers);
  const records=sheet.getLastRow()<2?[]:ioRows_(sheet,headers.length)
    .map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='Weeks'){const gateway=weekCommitGateway_();if(gateway)return gateway.readRows();}
  if(sheet.getName()==='HabitLogs'){const gateway=habitLogCommitGateway_();if(gateway)return gateway.readRows();}
  if(['Goals','Habits'].includes(sheet.getName())){const gateway=catalogCommitGateway_();if(gateway)return gateway.readRows(sheet.getName()==='Goals'?'goals':'habits');}
  return records;
}

function cachedRows_(sheet, headers) {
  const sheetName = sheet.getName();
  if(sheetName==='Projects'){const gateway=projectCommitGateway_();if(gateway)return gateway.readRows();}
  if(['Goals','Habits'].includes(sheetName)){const gateway=catalogCommitGateway_();if(gateway)return gateway.readRows(sheetName==='Goals'?'goals':'habits');}
  const cache = CacheService.getScriptCache();
  const cacheKey = 'DB_' + sheetName;
  
  // Limite 100KB CacheService: lo usiamo solo per tabelle compatte
  const isCacheable = ['Projects', 'Goals', 'Habits', 'TaskPlans'].includes(sheetName);
  
  if (isCacheable) {
    const cached = cache.get(cacheKey);
    if (cached) {
      let data;try{data=JSON.parse(cached);}catch(ignore){}
      if(Array.isArray(data)&&data.every(row=>headers.every(h=>Object.prototype.hasOwnProperty.call(row,h)))){if(['Goals','Habits'].includes(sheetName)){const gateway=catalogCommitGateway_();if(gateway)return gateway.readRows(sheetName==='Goals'?'goals':'habits');}return data;}
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
  if(sheet.getName()==='TaskPlans')rows.forEach(row=>assertTaskPlanLegacyWriteAllowed_(String(row[0]||'')));
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
function getChanges(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 if(!p||!p.cursor||!Number.isSafeInteger(p.limit))throw Object.assign(Error('DataError'),{name:'DataError'});
 const servers=[syncDayRoutingServer_,syncWeekRoutingServer_,syncHabitLogRoutingServer_,syncCatalogRoutingServer_,syncProjectRoutingServer_,syncEntryRoutingServer_];
 for(const create of servers){const facade=create().resolve();if(facade)return facade.changes({cursor:p.cursor,limit:p.limit});}
 throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
}
function getSyncCheckpoint(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 const servers=[syncDayRoutingServer_,syncWeekRoutingServer_,syncHabitLogRoutingServer_,syncCatalogRoutingServer_,syncProjectRoutingServer_,syncEntryRoutingServer_];
 for(const create of servers){const facade=create().resolve();if(facade)return facade.checkpoint();}
 throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
}
// Full Days snapshots: explicit transport for the local outbox only.
function dayOperationInput_(input){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!input||Object.keys(input).sort().join(',')!=='baseVersion,day,operationId'||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)||Number.isFinite(Date.parse(input.baseVersion))&&new Date(input.baseVersion).toISOString()===input.baseVersion)))fail();
 const result={operationId:input.operationId,baseVersion:input.baseVersion,day:syncDaySnapshot_(input.day)};if(syncCommitCanonical_(result).length>30000)fail();return result;
}
function saveDayOperation(p){
 ACTIVE_CONTEXT=p?.context||{};const input=dayOperationInput_(p?.operation),gateway=dayCommitGateway_();
 if(!gateway?.saveOperation)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return {day:gateway.saveOperation(input,p.scope)};
}
function getDayOperationReceipt(p){
 ACTIVE_CONTEXT=p?.context||{};const input=dayOperationInput_(p?.request),gateway=dayCommitGateway_();
 if(!gateway?.lookupDayReceipt)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.lookupDayReceipt({request:input,expectedScope:p.scope});
}
function getDayOperationState(p){
 ACTIVE_CONTEXT=p?.context||{};if(!validDate_(p?.date))throw Object.assign(Error('DataError'),{name:'DataError'});
 const gateway=dayCommitGateway_();if(!gateway?.readOperationState)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.readOperationState({date:p.date,expectedScope:p.scope});
}
function weekOperationInput_(input){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!input||Object.keys(input).sort().join(',')!=='baseVersion,operationId,week'||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)||Number.isFinite(Date.parse(input.baseVersion))&&new Date(input.baseVersion).toISOString()===input.baseVersion)))fail();
 const result={operationId:input.operationId,baseVersion:input.baseVersion,week:syncWeekSnapshot_(input.week)};if(syncCommitCanonical_(result).length>30000)fail();return result;
}
function saveWeekOperation(p){
 ACTIVE_CONTEXT=p?.context||{};const input=weekOperationInput_(p?.operation),gateway=weekCommitGateway_();
 if(!gateway?.saveOperation)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return {week:gateway.saveOperation(input,p.scope)};
}
function getWeekOperationReceipt(p){
 ACTIVE_CONTEXT=p?.context||{};const input=weekOperationInput_(p?.request),gateway=weekCommitGateway_();
 if(!gateway?.lookupWeekReceipt)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.lookupWeekReceipt({request:input,expectedScope:p.scope});
}
function getWeekOperationState(p){
 ACTIVE_CONTEXT=p?.context||{};if(!syncValidWeek_(p?.week))throw Object.assign(Error('DataError'),{name:'DataError'});
 const gateway=weekCommitGateway_();if(!gateway?.readOperationState)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.readOperationState({week:p.week,expectedScope:p.scope});
}
function habitLogOperationInput_(input){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!input||Object.keys(input).sort().join(',')!=='baseVersion,habitUpdatedAt,log,operationId'||typeof input.operationId!=='string'||(!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||input.operationId.startsWith('hl-reserve-'))||!(input.baseVersion===null||typeof input.baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)||Number.isFinite(Date.parse(input.baseVersion))&&new Date(input.baseVersion).toISOString()===input.baseVersion)))fail();
 if(typeof input.habitUpdatedAt!=='string'||input.habitUpdatedAt.length>200)fail();
 const result={operationId:input.operationId,baseVersion:input.baseVersion,habitUpdatedAt:input.habitUpdatedAt,log:syncHabitLogSnapshot_(input.log)};if(syncCommitCanonical_(result).length>30000)fail();return result;
}
function saveHabitLogOperation(p){
 ACTIVE_CONTEXT=p?.context||{};const input=habitLogOperationInput_(p?.operation),gateway=habitLogCommitGateway_();
 if(!gateway?.saveOperation)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return {log:gateway.saveOperation(input,p.scope)};
}
function getHabitLogOperationReceipt(p){
 ACTIVE_CONTEXT=p?.context||{};const input=habitLogOperationInput_(p?.request),gateway=habitLogCommitGateway_();
 if(!gateway?.lookupHabitLogReceipt)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.lookupHabitLogReceipt({request:input,expectedScope:p.scope});
}
function getHabitLogOperationState(p){
 ACTIVE_CONTEXT=p?.context||{};if(!syncHabitLogIdentity_(p?.key))throw Object.assign(Error('DataError'),{name:'DataError'});
 const gateway=habitLogCommitGateway_();if(!gateway?.readOperationState)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
 return gateway.readOperationState({key:p.key,expectedScope:p.scope});
}
function getJournalOperationReceipt(p){
 const fail=name=>{throw Object.assign(Error(name),{name});},validId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value);
 if(!p||!p.scope||!p.request||!validId(p.request.operationId)||!/^[0-9]{4}-[0-9]{2}$/.test(p.request.month||'')||!Array.isArray(p.request.blocks)||p.request.blocks.length!==1||!validId(p.request.blocks[0]?.id)||!validId(p.request.blocks[0]?.clientId)||Object.keys(p.request).sort().join(',')!=='blocks,month,operationId'||syncCommitCanonical_(p.request).length>262144)fail('DataError');
 ACTIVE_CONTEXT=p.context||{};const gateway=entryCommitGateway_();if(!gateway||typeof gateway.lookupPageReceipt!=='function')fail('ProtocolUnavailable');
 const receipt=gateway.lookupPageReceipt({operationId:p.request.operationId,clientRequest:p.request,expectedScope:p.scope}),id=p.request.blocks[0].id;
 if(receipt.status==='unknown'||receipt.status==='conflict')return {status:receipt.status,operationId:p.request.operationId,scope:p.scope};
 const matches=receipt.versions?.filter(item=>item.collection==='entries'&&item.id===id&&!item.deleted)||[];if(receipt.status!=='committed'||receipt.operationId!==p.request.operationId||matches.length!==1||matches[0].version!=='commit-'+receipt.sequence)fail('ProtocolCorrupt');
 return {status:'committed',operationId:p.request.operationId,id,version:matches[0].version,scope:p.scope};
}
function getJournalDeleteReceipt(p){
 const fail=name=>{throw Object.assign(Error(name),{name});},validId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value),request=p?.request;
 if(!p?.scope||!request||Object.keys(request).sort().join(',')!=='id,operationId,updatedAt'||!validId(request.id)||!validId(request.operationId)||typeof request.updatedAt!=='string'||!request.updatedAt||request.updatedAt.length>200)fail('DataError');
 ACTIVE_CONTEXT=p.context||{};const gateway=entryCommitGateway_();if(!gateway||typeof gateway.lookupDeleteReceipt!=='function')fail('ProtocolUnavailable');
 const receipt=gateway.lookupDeleteReceipt({request,expectedScope:p.scope});if(receipt.status==='unknown'||receipt.status==='conflict')return {status:receipt.status,operationId:request.operationId,scope:p.scope};
 const matches=receipt.versions?.filter(item=>item.collection==='entries'&&item.id===request.id&&item.deleted)||[];if(receipt.status!=='committed'||receipt.operationId!==request.operationId||matches.length!==1||matches[0].version!=='commit-'+receipt.sequence)fail('ProtocolCorrupt');
 return {status:'committed',operationId:request.operationId,id:request.id,version:matches[0].version,scope:p.scope};
}
function getSnapshotPage(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 const fail=name=>{throw Object.assign(Error(name),{name});},spec={entries:{create:syncEntryRoutingServer_,key:'id'},projects:{create:syncProjectRoutingServer_,key:'slug'},days:{create:syncDayRoutingServer_,key:'date'},weeks:{create:syncWeekRoutingServer_,key:'week'},habitLogs:{create:syncHabitLogRoutingServer_,key:'key'},goals:{create:syncCatalogRoutingServer_,key:'id'},habits:{create:syncCatalogRoutingServer_,key:'id'},files:{create:syncEntryRoutingServer_,key:'id'},settings:{create:syncCatalogRoutingServer_,key:'id'},layouts:{create:syncEntryRoutingServer_,key:'entryId'}};
 if(!p||Object.prototype.toString.call(p)!=='[object Object]'||Object.keys(p).some(key=>!['collection','cursor','afterId','limit','maxBytes','context'].includes(key))||!spec[p.collection]||p.afterId!==undefined&&(typeof p.afterId!=='string'||p.afterId.length>200)||p.limit!==undefined&&(!Number.isSafeInteger(p.limit)||p.limit<1||p.limit>100)||p.maxBytes!==undefined&&(!Number.isSafeInteger(p.maxBytes)||p.maxBytes<4096||p.maxBytes>65536))fail('DataError');
 const limit=p.limit??50,maxBytes=p.maxBytes??65536;
 return locked_(function(){const facade=spec[p.collection].create().resolve();if(!facade)fail('ProtocolUnavailable');
  if(p.collection==='habitLogs'){
   const page=facade.readSnapshotPage({limit,...(p.afterId===undefined?{}:{afterId:p.afterId}),...(p.cursor===undefined?{}:{cursor:p.cursor})}),response={collection:p.collection,...page};
   let previous;do{previous=response.bytes;response.bytes=traceBytes_(syncCommitCanonical_(response));}while(response.bytes!==previous);if(response.bytes>maxBytes)fail('DataError');return response;
  }
  const current=facade.checkpoint(),cursor=p.cursor??current.cursor;
  if(!cursor||Object.prototype.toString.call(cursor)!=='[object Object]'||Object.keys(cursor).sort().join(',')!=='archiveId,epoch,format,principalId,sequence'||cursor.format!=='sync-cursor/v1'||cursor.archiveId!==current.cursor.archiveId||cursor.epoch!==current.cursor.epoch||cursor.principalId!==current.cursor.principalId||!Number.isSafeInteger(cursor.sequence)||cursor.sequence<0||cursor.sequence>current.highWater)fail('ScopeChanged');
  let rows;if(p.collection==='goals'||p.collection==='habits')rows=facade.readRows(p.collection);else if(p.collection==='files'){
   // The immutable commit feed is replayed from sequence zero during bootstrap
   // and supplies canonical file entities. Snapshot only live legacy links here,
   // avoiding readRows() over every Entry on each Files page.
   const owners=new Map(),source=rows_(db_().getSheetByName('Files'),FILE_HEADERS);rows=[];
   for(const file of source){let entry=owners.get(file.entryId);if(entry===undefined){entry=facade.read(file.entryId)||null;owners.set(file.entryId,entry);}if(entry)rows.push(file);}
  }else if(p.collection==='settings')rows=['privacy','reflection'].map(kind=>{const value=facade.readSetting(kind),version=kind==='privacy'?value.privacyVersion:value.version;return {id:kind,value:kind==='privacy'?{privateTags:value.privateTags}:{dailyReflectionMode:value.dailyReflectionMode},version:version||''};});else if(p.collection==='layouts'){
   // Canonical layout values are represented by Entry route changes in the
   // immutable feed. Read only the legacy layout sheet for this snapshot page.
   const sheet=journalLayout_(),source=sheet?rows_(sheet,JOURNAL_LAYOUT_HEADERS):[],owners=new Map();rows=[];
   for(const row of source){let entry=owners.get(row.entryId);if(entry===undefined){entry=facade.read(row.entryId)||null;owners.set(row.entryId,entry);}if(!entry)continue;const position=Number(row.position);if(!Number.isFinite(position))fail('ProtocolCorrupt');if(typeof row.updatedAt!=='string'||!row.updatedAt)fail('ProtocolCorrupt');rows.push({entryId:row.entryId,position,version:row.updatedAt});}
  }else rows=facade.readRows();
  if(p.collection==='entries')rows=rows.map(({body,rich,...metadata})=>metadata);
  const key=spec[p.collection].key;if(!Array.isArray(rows))fail('ProtocolCorrupt');const ids=new Set();for(const row of rows)if(!row||typeof row[key]!=='string'||!row[key]||row[key].length>200||ids.has(row[key]))fail('ProtocolCorrupt');else ids.add(row[key]);
  const versionOf=row=>p.collection==='settings'||p.collection==='layouts'?row.version:row.updatedAt,sorted=rows.slice().sort((a,b)=>a[key].localeCompare(b[key])),eligible=sorted.filter(row=>p.afterId===undefined||row[key]>p.afterId),records=eligible.slice(0,limit),hasMore=eligible.length>records.length,total=rows.length,canonical=rows.reduce((n,row)=>n+(typeof versionOf(row)==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(versionOf(row))?1:0),0),response={collection:p.collection,records,checkpoint:cursor,observedCursor:current.cursor,hasMore,nextAfter:hasMore?records[records.length-1][key]:null,coverage:{total,canonical,complete:canonical===total}};
  response.bytes=traceBytes_(syncCommitCanonical_(response));response.bytes=traceBytes_(syncCommitCanonical_(response));if(response.bytes>maxBytes)fail('DataError');return response;
 });
}
function getContentsBatch(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 const fail=name=>{throw Object.assign(Error(name),{name});},items=p&&p.items;
 if(!Array.isArray(items)||items.length>12)fail('DataError');
 const seen=new Set();for(const item of items){if(!item||Object.prototype.toString.call(item)!=='[object Object]'||Object.keys(item).length!==3||Object.keys(item).some(key=>!['id','version','digest'].includes(key))||typeof item.id!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(item.id)||typeof item.version!=='string'||!item.version||item.version.length>128||typeof item.digest!=='string'||!/^[a-f0-9]{64}$/.test(item.digest)||seen.has(item.id))fail('DataError');seen.add(item.id);}
 return locked_(function(){const gateway=entryCommitGateway_();if(!gateway)fail('ProtocolUnavailable');const result=[];for(const item of items){const entry=gateway.read(item.id);if(!entry||entry.contentVersion!==item.version||entry.contentDigest!==item.digest)fail('ConflictError');const content=gateway.readContent(item.id);if(!content||content.version!==item.version||syncContentDigest_(content)!==item.digest)fail('ProtocolCorrupt');result.push({id:item.id,version:item.version,digest:item.digest,content});}const response={items:result};let bytes=traceBytes_(syncCommitCanonical_(response));response.bytes=bytes;bytes=traceBytes_(syncCommitCanonical_(response));if(bytes>2097152)fail('DataError');response.bytes=bytes;return response;});
}
function getSyncManifest(p){
 ACTIVE_CONTEXT=p&&p.context||{};
 const base={protocolVersion:1,minClientProtocol:1,schemaVersion:1,cursor:null,highWater:null,capabilities:{localReadCache:false,changes:false,operations:false,bootstrapCheckpoint:syncBootstrapCheckpointEnabled_()===true}};
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
  let checkpoint=null;try{checkpoint=getSyncCheckpoint(p);}catch(ignore){}
  if(checkpoint&&(checkpoint.cursor.archiveId!==record.archiveId||checkpoint.cursor.epoch!==record.epoch||checkpoint.cursor.principalId!==principalId))return blocked('configurationChanged');
  return {...base,identityVerified:true,archiveId:record.archiveId,principalId,epoch:record.epoch,cursor:checkpoint?.cursor||null,highWater:checkpoint?.highWater??null};
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
 if(sheet.getName()==='Weeks'){const gateway=weekCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 if(sheet.getName()==='HabitLogs'){const gateway=habitLogCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 const result=commonDateRangesRaw_(sheet,headers,dateKey,ranges);
 if(sheet.getName()==='Days'){const gateway=dayCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 if(sheet.getName()==='Weeks'){const gateway=weekCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
 if(sheet.getName()==='HabitLogs'){const gateway=habitLogCommitGateway_();if(gateway)return {ranges,rows:gateway.readRows(ranges)};}
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
 if(context.view==='files'){const gateway=entryCommitGateway_();entries=gateway?gateway.readRows():entrySearch_('id','.+');}
 if(context.view==='projects'&&context.project)entries=entrySearch_('projects','(^|,)'+slug_(context.project)+'(,|$)');
 if(context.view==='tasks')entries=entrySearch_('status','^(open|doing)$');
 if(context.view==='day'&&validDate_(context.date||''))entries=entrySearch_('date','^'+context.date+'$');
 if(context.view==='week'&&validDate_(context.week||'')) {
  const end=new Date(context.week+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const endDate=end.toISOString().slice(0,10);
  entries=weekEntries_(context.week,endDate);
 }
 const allTags=(context.view==='tags'||context.view!=='files'&&!(context.commonFresh||context.deferCommon||context.catalogFresh))?tagCatalog_():undefined;
 if(context.view==='tags'&&context.tag){const tag=normaliseTags_(context.tag);if(tag.includes(','))throw new Error('Scegli un tag.');entries=entrySearch_('tags','(^|,)'+tag+'(,|$)');}
 if(!context.view||['journal','day'].includes(context.view)){entries=Array.from(new Map([...entries,...entrySearch_('type','^task$')].map(e=>[e.id,e])).values());}
 if(context.view!=='files'){attachSchedules_(entries);attachPendingDocs_(entries);}if(!context.view||context.view==='journal')entries=entries.filter(e=>e.date.startsWith(month+'-'));if(context.view==='day')entries=entries.filter(e=>taskOnDate_(e,context.date));
 const entriesMs=Date.now()-started,ids=new Set(entries.map(e=>e.id)),pattern=context.view==='files'?'^$':ids.size?'^('+Array.from(ids).join('|')+')$':'^$';
 const previewStarted=Date.now(),previewSheet=db.getSheetByName('Previews'),previews=context.view!=='files'&&ids.size&&previewSheet?objectsSearch_(previewSheet,['entryId','excerpt','updatedAt','richExcerpt'],1,pattern):[];const previewMap=new Map(previews.map(p=>[p.entryId,p]));entries.forEach(e=>{const p=previewMap.get(e.id);e.excerpt=p?p.excerpt:'';e.previewRich=p?readPreviewRuns_(p.richExcerpt):[];});
 const previewsMs=Date.now()-previewStarted,fileStarted=Date.now();let files=[];
 if(context.view==='files'){
  const gateway=entryCommitGateway_(),entryIds=[...ids];
  files=gateway?gateway.readFilesBatch(entryIds):rows_(db.getSheetByName('Files'),FILE_HEADERS).filter(file=>ids.has(file.entryId));
 }else if(ids.size)files=objectsSearch_(db.getSheetByName('Files'),FILE_HEADERS,2,pattern);
 const filesMs=Date.now()-fileStarted;
 const commonStarted=Date.now();
 const common=(context.commonFresh||context.deferCommon)?{}:{
    ...(context.commonWindow==='catalogs'?{commonScope:{kind:'catalogs'}}:context.commonWindow==='journal'?{commonScope:{kind:'journal',month,today},commonSlices:commonJournalSlices_(db,month,today)}:['week','habits'].includes(context.commonWindow)?commonPeriodState_(db,context,today):{commonScope:{kind:'full'},weeks:rows_(db.getSheetByName('Weeks'),WEEK_HEADERS),days:rows_(db.getSheetByName('Days'),DAY_HEADERS),habitLogs:rows_(db.getSheetByName('HabitLogs'),LOG_HEADERS)}),
    ...(context.catalogFresh?{}:{
    projects:cachedRows_(db.getSheetByName('Projects'),PROJECT_HEADERS),
    goals:cachedRows_(db.getSheetByName('Goals'),GOAL_HEADERS),
    habits:cachedRows_(db.getSheetByName('Habits'),HABIT_HEADERS),
    taskPlans:taskPlanRows_(db)})
 };
 return {today,month,entries,files,...common,settings:reflectionSettings_(),...(allTags?{allTags}:{}),commonIncluded:!(context.commonFresh||context.deferCommon),driveConfigured:!!PropertiesService.getScriptProperties().getProperty('ROOT_ID'),performance:{traceId:context.traceId||'',entriesMs,previewsMs,filesMs,commonMs:Date.now()-commonStarted,totalMs:Date.now()-started}};
}

function commonRecordResponse_(collection,record){
 return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,commonUpserts:{[collection]:[record]}}:state_();
}
function saveGoalImpl_(p) {
  const gateway=catalogCommitGateway_();if(gateway){const result=gateway.saveLegacy('goal',p);return ACTIVE_CONTEXT.incrementalCommon===true?result:state_();}
  const title=text_(p.title,200), target=Number(p.target), progress=Number(p.progress);
  if(!title || !/^\d{4}-Q[1-4]$/.test(p.cycle) || !Number.isFinite(target)||target<=0||!Number.isFinite(progress)||progress<0) throw new Error('Obiettivo: titolo, trimestre e valori numerici validi richiesti.');
  return saveRecord_('Goals',GOAL_HEADERS,'id',{id:p.id||Utilities.getUuid(),cycle:p.cycle,title,...(p.description===undefined?{}:{description:text_(p.description,6000)}),target:String(target),progress:String(progress),project:p.project?slug_(p.project):'',...(p.icon===undefined?{}:{icon:iconValue_(p.icon)})},p.updatedAt);
}
function saveHabitImpl_(p) {
  const gateway=catalogCommitGateway_();if(gateway){const result=gateway.saveLegacy('habit',p);return ACTIVE_CONTEXT.incrementalCommon===true?result:state_();}
  const title=text_(p.title,200), flexible=/^weekly:[1-7]$/.test(String(p.days)), days=Array.from(new Set(String(p.days).split(','))).sort();
  if(!title||!days.length||(!flexible&&days.some(d=>! /^[0-6]$/.test(d)))||!validDate_(p.start)) throw new Error('Azione: titolo, data iniziale e almeno un giorno richiesti.');
  return locked_(function(){
    if(catalogCommitGateway_())throw Object.assign(Error('Routing cataloghi cambiato.'),{name:'ScopeChanged'});
    const db=db_(), goal=rows_(db.getSheetByName('Goals'),GOAL_HEADERS).find(g=>g.id===p.goalId);
    if(!goal)throw new Error('Obiettivo non trovato.');
    const q=Number(goal.cycle.slice(-1)),year=goal.cycle.slice(0,4),start=year+'-'+String((q-1)*3+1).padStart(2,'0')+'-01';
    const end=new Date(Date.UTC(Number(year),q*3,0,12)).toISOString().slice(0,10);
    if(p.start<start||p.start>end)throw new Error('Inizio azione fuori dal ciclo.');
    const sheet=db.getSheetByName('Habits');ensureHabitHeaders_(sheet,true);const records=rows_(sheet,HABIT_HEADERS),index=records.findIndex(h=>h.id===p.id),old=index<0?null:records[index];if(p.id&&(!old||old.archived==='yes'||old.updatedAt!==p.updatedAt))throw new Error('Abitudine modificata altrove. Aggiorna e riprova.');const previous=old?habitSteps_(old.steps):[],titles=String(p.steps===undefined?previous.map(s=>s.title).join('\n'):p.steps).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(titles.length>30||titles.some(t=>t.length>500))throw new Error('Massimo 30 microazioni, ciascuna di 500 caratteri.');const used=new Set(),steps=titles.map((title,index)=>{const match=previous.find(s=>s.title===title&&!used.has(s.id))||previous[index];const id=match&&!used.has(match.id)?match.id:Utilities.getUuid();used.add(id);return {id,title};});const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0)).toISOString(),values=[old?old.id:Utilities.getUuid(),p.goalId,title,days.join(','),p.start,now,JSON.stringify(steps),'',p.icon===undefined?(old?old.icon||'':''):iconValue_(p.icon),p.description===undefined?(old?old.description||'':''):text_(p.description,6000)];if(old)writeRow_(sheet,index+2,values);else append_(sheet,[values]);return commonRecordResponse_('habits',Object.fromEntries(HABIT_HEADERS.map((h,i)=>[h,values[i]])));
  });
}
function setHabitLogImpl_(p) {
  const gateway=habitLogCommitGateway_();if(gateway)return gateway.saveLegacy(p);
  if(!validDate_(p.date)||!['done','skipped','pending'].includes(p.status))throw new Error('Data o stato azione non valido.');
  return locked_(function(){
    if(habitLogCommitGateway_())throw Object.assign(Error('Routing registrazioni cambiato. Riprova.'),{name:'ScopeChanged'});
    const db=db_(),habit=rows_(db.getSheetByName('Habits'),HABIT_HEADERS).find(h=>h.id===p.habitId);
    if(!habit||habit.archived==='yes')throw new Error('Azione non trovata.');
    const goal=rows_(db.getSheetByName('Goals'),GOAL_HEADERS).find(g=>g.id===habit.goalId);
    const d=new Date(p.date+'T12:00:00Z'),cycle=d.getUTCFullYear()+'-Q'+(Math.floor(d.getUTCMonth()/3)+1);
    if(!goal||goal.cycle!==cycle||p.date<habit.start||(!/^weekly:[1-7]$/.test(habit.days)&&!habit.days.split(',').includes(String((d.getUTCDay()+6)%7))))throw new Error('Azione non prevista per questa data.');
    const sheet=db.getSheetByName('HabitLogs'),key=p.habitId+'|'+p.date,records=rows_(sheet,LOG_HEADERS),i=records.findIndex(r=>r.key===key);
    if((i<0?'':records[i].updatedAt)!==(p.updatedAt||''))throw new Error('Azione modificata altrove. Aggiorna e riprova.');
    const now=new Date(Math.max(Date.now(),i<0?0:Date.parse(records[i].updatedAt)+1)).toISOString();
    ensureHabitHeaders_(sheet,true);const catalogGateway=catalogCommitGateway_(),habitVersion=catalogGateway?catalogGateway.mapVersion('habits',p.habitId,p.habitUpdatedAt):p.habitUpdatedAt;if(habitVersion&&habitVersion!==habit.updatedAt)throw new Error('Abitudine modificata: aggiorna i passaggi.');const previous=i<0?null:habitChecklist_(records[i].checklist),steps=previous?previous.steps:habitSteps_(habit.steps),checked=Array.isArray(p.checked)?Array.from(new Set(p.checked)):previous?previous.checked:[];if(checked.some(id=>!steps.some(s=>s.id===id)))throw new Error('Microazione non valida.');if(steps.length&&p.status==='done'&&!steps.every(s=>checked.includes(s.id)))throw new Error('Completa tutte le microazioni prima di completare la pratica.');const status=steps.length&&p.status!=='skipped'?(steps.every(s=>checked.includes(s.id))?'done':'pending'):p.status;const values=[key,p.habitId,p.date,status,now,JSON.stringify({steps,checked})];if(i<0)append_(sheet,[values]);else writeRow_(sheet,i+2,values);return {delta:true,entries:[],commonIncluded:false,commonUpserts:{habitLogs:[Object.fromEntries(LOG_HEADERS.map((h,i)=>[h,values[i]]))]}};
  });
}
function saveRoutedEntryCapture_(requestId,date,items,context){
 const saved=[],basePosition=Date.parse(date+'T00:00:00Z')-Date.parse('2020-01-01T00:00:00Z')+86399000;
 for(let offset=0;offset<items.length;offset+=12){
  const blocks=items.slice(offset,offset+12).map((item,index)=>({clientId:'capture-'+syncContentDigest_({requestId,index:offset+index}).slice(0,48),date,type:item.type,title:item.title||item.text,body:String(item.body||''),rich:item.rich||plainRich_(String(item.body||'')),contentLoaded:true,autoTitle:false,projects:item.projects||'',tags:item.tags||'',due:item.due||'',status:item.status||'',plannedDate:item.schedule?.date||'',workStart:item.schedule?.workStart||'',workEnd:item.schedule?.workEnd||'',importance:item.schedule?.importance||'normal',position:basePosition+offset+index,originalBody:'',originalRich:[]}));
  const result=saveJournalPage({month:date.slice(0,7),blocks,context});saved.push(...result.entries);
 }
 return {delta:true,entries:saved,commonIncluded:false};
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
  if(entryCommitGateway_())return saveRoutedEntryCapture_(payload.requestId,payload.date,entries.map((entry,index)=>({...entry,text:entry.text,body:entries.length===1?description:'',rich:plainRich_(entries.length===1?description:''),schedule:entries.length===1&&entry.type==='task'?schedule:null})),payload.context);
  const result=locked_(function() {
    entered=Date.now();const phase=Date.now();if(entryCommitGateway_())throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});const db=db_(),sheet=db.getSheetByName('Entries');ensurePlanHeaders_(db.getSheetByName('TaskPlans'));
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
    assertEntryLegacyWriteAllowed_(entry.id);
    if (entry.updatedAt!==payload.updatedAt) throw new Error('Task modificato da un altro dispositivo. Aggiorna e riprova.');
    const nextTime = Math.max(Date.now(), Date.parse(entry.updatedAt)+1);
    const now=new Date(nextTime).toISOString();entry.status=payload.status;entry.updatedAt=now;entry.completedAt=payload.status==='done'?(entry.completedAt||now):'';
    ioInvalidate_(sheet);sheet.getRange(index+2,7,1,3).setValues([[entry.status,entry.createdAt,now]]);
    sheet.getRange(index+2,13,1,1).setValues([[entry.completedAt]]);attachSchedules_([entry]);
    return {delta:true,metadataOnly:true,entries:[entry],commonIncluded:false};
  });
}

function writeRow_(sheet,row,values) {return traceMeasure_('sheets',()=>{
  if(sheet.getName()==='Entries')assertEntryLegacyWriteAllowed_(String(values[0]||''));
  if(sheet.getName()==='TaskPlans')assertTaskPlanLegacyWriteAllowed_(String(values[0]||''));
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
    assertEntryLegacyWriteAllowed_(e.id);
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
  const gateway=entryCommitGateway_();if(gateway&&gateway.isRouted(payload.entryId)){const file=gateway.addFile({entryId:payload.entryId,fileId:match[1],title,url});return {delta:true,entries:[],commonIncluded:false,fileUpserts:[file]};}
  return locked_(function(){
  const db=db_();
    const entryRows=findRows_(db.getSheetByName('Entries'),1,payload.entryId,false);if(!entryRows.length)throw new Error('Voce non trovata.');assertEntryLegacyWriteAllowed_(payload.entryId);
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
function weekValues_(payload) {
  if (!payload || monday_(payload.week)!==payload.week) throw new Error('La settimana deve iniziare di lunedì.');
  const values={week:payload.week};
  ['focus','priorities','wins','obstacles','lessons','next'].forEach(k=>values[k]=text_(payload[k],6000));
  if (!['','1','2','3','4','5'].includes(payload.energy)) throw new Error('Energia da 1 a 5.');
  if (!['yes','no'].includes(payload.closed)) throw new Error('Stato checkup non valido.');
  Object.assign(values,{energy:payload.energy,closed:payload.closed});
  return values;
}
function saveWeekImpl_(payload){const gateway=weekCommitGateway_();if(gateway)return gateway.saveLegacy(payload);return saveRecord_('Weeks',WEEK_HEADERS,'week',weekValues_(payload),payload.updatedAt);}
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
  if(['Goals','Habits'].includes(name)&&catalogCommitGateway_())throw Object.assign(Error('Writer cataloghi non instradato.'),{name:'ProtocolUnavailable'});
  if(name==='HabitLogs'&&habitLogCommitGateway_())throw Object.assign(Error('Writer registrazioni non instradato.'),{name:'ProtocolUnavailable'});
  if(name==='Weeks'&&weekCommitGateway_())throw Object.assign(Error('Writer settimanale non instradato.'),{name:'ProtocolUnavailable'});
  if(name==='Days'&&dayCommitGateway_())throw Object.assign(Error('Writer giornaliero non instradato.'),{name:'ProtocolUnavailable'});
  return locked_(function(){
    if(['Goals','Habits'].includes(name)&&catalogCommitGateway_())throw Object.assign(Error('Routing cataloghi cambiato.'),{name:'ScopeChanged'});
    if(name==='HabitLogs'&&habitLogCommitGateway_())throw Object.assign(Error('Routing registrazioni cambiato.'),{name:'ScopeChanged'});
    if(name==='Weeks'&&weekCommitGateway_())throw Object.assign(Error('Routing settimanale cambiato. Riprova conservando la bozza.'),{name:'ScopeChanged'});
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
function saveProject(p){ACTIVE_CONTEXT=p&&p.context||{};root_();const gateway=projectCommitGateway_(),result=gateway?gateway.saveProject(p):saveProjectImpl_(p);locked_(function(){projectFolder_(p.slug?slug_(p.slug):slug_(p.name));});return result;}
function entryMetadataResponse_(entry){return {delta:true,metadataOnly:true,preserveDetailId:entry.id,entries:[entry],commonIncluded:false};}
function setTaskStatus(p){ACTIVE_CONTEXT=p&&p.context||{};const gateway=entryCommitGateway_();if(gateway)return entryMetadataResponse_(gateway.setStatus({id:p.id,updatedAt:p.updatedAt,status:p.status}));return setTaskStatusImpl_(p);}
function updateEntry(p){ACTIVE_CONTEXT=p&&p.context||{};const gateway=entryCommitGateway_();if(gateway){if(!p)throw new Error('Voce mancante.');const text=text_(p.text,2000),body=text_(p.body,20000);if(!text||!validDate_(p.date)||(p.due&&!validDate_(p.due)))throw new Error('Testo o data non validi.');const projects=Array.from(new Set(String(p.projects||'').split(',').map(s=>s.trim()).filter(Boolean).map(slug_))).join(','),current=gateway.read(p.id);if(!current)throw new Error('Voce non trovata.');if(current.updatedAt!==p.updatedAt)throw new Error('Voce modificata altrove. Aggiorna e riprova.');if(!['personal','project'].includes(p.scope)||(p.scope==='project'&&!projects))throw new Error('Seleziona un ambito e un progetto per le note di progetto.');if(current.type!=='task'&&p.due)throw new Error('Le scadenze sono disponibili per i task.');if(text!==current.text||projects!==current.projects||p.date!==current.date||p.scope!==current.scope)throw new Error('In questa versione data, titolo e collocazione della sezione sono fissi. Crea una nuova voce per cambiare.');if(body)throw new Error('Scrivi gli appunti nel Google Doc originale.');return entryMetadataResponse_(gateway.setDue({id:p.id,updatedAt:p.updatedAt,due:p.due||''}));}return updateEntryImpl_(p);}
function addFileLink(p){ACTIVE_CONTEXT=p&&p.context||{};return addFileLinkImpl_(p);}
function saveWeek(p){ACTIVE_CONTEXT=p&&p.context||{};return saveWeekImpl_(p);}
function saveDay(p){ACTIVE_CONTEXT=p&&p.context||{};return saveDayImpl_(p);}

function getCommonState(p){ACTIVE_CONTEXT={...((p&&p.context)||{}),view:'habits'};return readState_();}


function setEntryProjects(p){ACTIVE_CONTEXT=p.context||{};const entryGateway=entryCommitGateway_();if(entryGateway){const saved=entryGateway.setProjects({id:p.id,updatedAt:p.updatedAt,projects:String(p.projects||"")});return {delta:true,metadataOnly:true,preserveDetailId:saved.id,entries:[saved],commonIncluded:false};}if(projectCommitGateway_())throw Object.assign(Error('Collegamenti ai progetti non instradati nel registro canonico.'),{name:'ProtocolUnavailable'});return locked_(function(){const db=db_(),sheet=db.getSheetByName('Entries'),found=findRows_(sheet,1,p.id,false);if(!found.length)throw new Error('Voce non trovata.');const e=readEntry_(found[0]);assertEntryLegacyWriteAllowed_(e.id);if(e.updatedAt!==p.updatedAt)throw new Error('Voce modificata altrove. Aggiorna e riprova.');const selected=Array.from(new Set(String(p.projects||'').split(',').filter(Boolean)));const known=rows_(db.getSheetByName('Projects'),PROJECT_HEADERS).map(p=>p.slug);if(selected.some(s=>!known.includes(s)&&!e.projects.split(',').includes(s)))throw new Error('Seleziona un progetto esistente.');e.projects=selected.join(',');e.scope=selected.length?'project':'personal';e.updatedAt=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();ioInvalidate_(sheet);sheet.getRange(found[0],5).setNumberFormat('@').setValues([[/^[=+\-@']/.test(e.projects)?"'"+e.projects:e.projects]]);sheet.getRange(found[0],9,1,3).setValues([[e.updatedAt,e.requestId,e.scope]]);ENTRY_SMALL_CACHE=null;attachSchedules_([e]);return {delta:true,metadataOnly:true,preserveDetailId:e.id,entries:[e],commonIncluded:false};});}

function ensurePlanHeaders_(s,write=false){const h=s.getRange(1,1,1,6).getDisplayValues()[0];if(JSON.stringify(h.slice(0,3))!==JSON.stringify(PLAN_HEADERS.slice(0,3)))throw new Error('Intestazioni TaskPlans non valide.');for(let col=3;col<6;col++)if(h[col]&&h[col]!==PLAN_HEADERS[col])throw new Error('Colonne TaskPlans occupate: nessun dato modificato.');if(write&&h.slice(3).some(v=>!v))s.getRange(1,4,1,3).setValues([PLAN_HEADERS.slice(3)]);}
function taskImportance_(value){const importance=value||'normal';if(!['normal','urgent','emergency'].includes(importance))throw new Error('Importanza non valida.');return importance;}
function taskSchedule_(p){const s={date:String(p.plannedDate||''),workStart:String(p.workStart||''),workEnd:String(p.workEnd||''),importance:taskImportance_(p.importance)};for(const v of [s.date,s.workStart,s.workEnd])if(v&&!validDate_(v))throw new Error('Data di pianificazione non valida.');if(s.workEnd&&!s.workStart)throw new Error('Indica anche l’inizio lavorazione.');if(s.workStart&&s.workEnd&&s.workEnd<s.workStart)throw new Error('La fine lavorazione precede l’inizio.');if(s.date&&s.workStart)throw new Error('Scegli un giorno pianificato oppure un periodo di lavorazione.');return s;}
function storeTaskSchedule_(id,s){const sheet=db_().getSheetByName('TaskPlans');ensurePlanHeaders_(sheet,true);const found=findRows_(sheet,1,id,false),values=[id,s.date,new Date().toISOString(),s.workStart,s.workEnd,s.importance];if(found.length)writeRow_(sheet,found[0],values);else if(s.date||s.workStart||s.importance!=='normal')append_(sheet,[values]);return {plannedDate:s.date,workStart:s.workStart,workEnd:s.workEnd,importance:s.importance};}
function taskPlanRows_(db=db_()){
 const legacy=cachedRows_(db.getSheetByName('TaskPlans'),PLAN_HEADERS),gateway=entryCommitGateway_();if(!gateway)return legacy;
 const rows=gateway.readRows(),routed=new Map(rows.filter(e=>Object.prototype.hasOwnProperty.call(e,'plannedDate')).map(e=>[e.id,{entryId:e.id,date:e.plannedDate||'',updatedAt:e.updatedAt,workStart:e.workStart||'',workEnd:e.workEnd||'',importance:taskImportance_(e.importance)}])),out=[];
 legacy.forEach(plan=>{if(!routed.has(plan.entryId))out.push(plan);else{const canonical=routed.get(plan.entryId);routed.delete(plan.entryId);if(canonical.date||canonical.workStart||canonical.importance!=='normal')out.push(canonical);}});
 for(const plan of routed.values())if(plan.date||plan.workStart||plan.importance!=='normal')out.push(plan);return out;
}
function attachSchedules_(entries){const plans=rows_(db_().getSheetByName('TaskPlans'),PLAN_HEADERS),map=new Map(plans.map(p=>[p.entryId,p]));entries.forEach(e=>{if(e.type!=='task')return;if(Object.prototype.hasOwnProperty.call(e,'plannedDate')){e.importance=taskImportance_(e.importance);return;}const p=map.get(e.id);Object.assign(e,{plannedDate:p?p.date:'',workStart:p?p.workStart:'',workEnd:p?p.workEnd:'',importance:taskImportance_(p&&p.importance)});});return entries;}
function taskOnDate_(e,date){if(e.type!=='task')return e.date===date;if(e.workStart){const end=e.workEnd||date;if(date<e.workStart||date>end)return false;if(e.status==='done'&&e.completedAt&&date>e.completedAt.slice(0,10))return false;return true;}return (e.plannedDate||e.due||e.date)===date;}

// Project resource only: no Sheets, Docs, Drive or lock required.
function getAppChangelog(){return {text:HtmlService.createHtmlOutputFromFile('Changelog').getContent()};}

function ensureHabitHeaders_(sheet,write=false){const headers=sheet.getName()==='Habits'?HABIT_HEADERS:LOG_HEADERS,base=sheet.getName()==='Habits'?6:5,h=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];if(JSON.stringify(h.slice(0,base))!==JSON.stringify(headers.slice(0,base)))throw new Error('Intestazioni abitudini non valide.');for(let k=base;k<headers.length;k++)if(h[k]&&h[k]!==headers[k])throw new Error('Colonne abitudini occupate. Nessun dato modificato.');if(write&&h.slice(base).some(v=>!v))sheet.getRange(1,base+1,1,headers.length-base).setValues([headers.slice(base)]);}
function habitSteps_(value){if(!value)return [];const steps=JSON.parse(value);if(!Array.isArray(steps))throw new Error('Microazioni non valide.');return steps;}
function habitChecklist_(value){return value?JSON.parse(value):null;}
function deleteHabit(p){ACTIVE_CONTEXT=p.context||{};const gateway=catalogCommitGateway_();if(gateway){const result=gateway.saveLegacy('archiveHabit',p);return ACTIVE_CONTEXT.incrementalCommon===true?result:state_();}return locked_(function(){if(catalogCommitGateway_())throw Object.assign(Error('Routing cataloghi cambiato.'),{name:'ScopeChanged'});const sheet=db_().getSheetByName('Habits'),records=rows_(sheet,HABIT_HEADERS),i=records.findIndex(h=>h.id===p.id);if(i<0||records[i].updatedAt!==p.updatedAt)throw new Error('Abitudine modificata altrove.');ensureHabitHeaders_(sheet,true);const h=records[i];h.archived='yes';h.updatedAt=new Date(Math.max(Date.now(),Date.parse(h.updatedAt)+1)).toISOString();writeRow_(sheet,i+2,HABIT_HEADERS.map(k=>h[k]||''));return commonRecordResponse_('habits',h);});}

const APP_ICONS=['🎯','🌱','❤️','🧠','💪','📚','💼','🧘','☀️','⭐','🏠','🤝','💰','🛡️','🔥'];
function iconValue_(value){if(value!==''&&value!=='none'&&!APP_ICONS.includes(value)&&!OUTLINE_ICON_IDS.includes(value))throw new Error('Icona non valida.');return value;}
function ensureGoalIconHeader_(sheet,write=false){const h=sheet.getRange(1,1,1,GOAL_HEADERS.length).getDisplayValues()[0];if(JSON.stringify(h.slice(0,7))!==JSON.stringify(GOAL_HEADERS.slice(0,7)))throw new Error('Intestazioni obiettivi non valide.');for(let k=7;k<GOAL_HEADERS.length;k++)if(h[k]&&h[k]!==GOAL_HEADERS[k])throw new Error('Colonne obiettivi occupate. Nessun dato modificato.');if(write&&h.slice(7).some(v=>!v))sheet.getRange(1,8,1,GOAL_HEADERS.length-7).setValues([GOAL_HEADERS.slice(7)]);}

const OUTLINE_ICON_IDS=["target", "plant", "heart", "brain", "strength", "book", "briefcase", "calm", "sun", "star", "home", "people", "wallet", "shield", "flame", "video", "check", "calendar", "clock", "flag", "compass", "mountain", "lightbulb", "pencil", "journal", "coffee", "moon", "music", "walk", "food", "water", "family", "message", "mail", "phone", "computer", "chart", "folder", "key", "sparkles"];

// Navigation is an eventually consistent read. It never prepares Docs or changes schema.
function readState_(){DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();const result=state_();result.performance={...result.performance,lockWaitMs:0,readWithoutLock:true};return result;}
function tagCatalog_(){const gateway=entryCommitGateway_(),entries=gateway?gateway.readRows():rows_(db_().getSheetByName('Entries'),ENTRY_HEADERS);return Array.from(new Set(entries.flatMap(entry=>String(entry.tags||'').split(',').filter(Boolean)))).sort();}

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
// SPEC-004 canonical Days writer, internal behind the scoped routing gateway.
// The outbox transport does not provision or activate the controller.
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
// Internal weekly snapshots use the same recoverable protocol as Days.
// No legacy routing or automatic provisioning is enabled here.
function syncWeekSnapshot_(week){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 const keys=WEEK_HEADERS.filter(key=>key!=='updatedAt');
 if(!week||Object.prototype.toString.call(week)!=='[object Object]'||Object.keys(week).length!==keys.length||Object.keys(week).some(key=>!keys.includes(key)))fail();
 for(const key of keys)if(typeof week[key]!=='string')fail();
 try{if(monday_(week.week)!==week.week)fail();}catch(ignore){fail();}
 for(const key of ['focus','priorities','wins','obstacles','lessons','next'])if(week[key].length>6000)fail();
 if(!['','1','2','3','4','5'].includes(week.energy)||!['yes','no'].includes(week.closed))fail();
 return Object.fromEntries(keys.map(key=>[key,week[key]]));
}
function syncPlanWeekOperation_(input){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==3||Object.keys(input).some(key=>!['operationId','baseVersion','week'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)))fail();
 const record=syncWeekSnapshot_(input.week);
 const request={operationId:input.operationId,changes:[{collection:'weeks',id:record.week,baseVersion:input.baseVersion,action:'upsert',data:{format:'sync-week/v1',record}}]};
 if(syncCommitCanonical_(request).length>32768)fail();return request;
}
function syncWeekWriter_(store,trustedScope){
 const protocol=syncCommitProtocol_(store,trustedScope),scope=JSON.parse(syncCommitCanonical_(trustedScope));
 const error=name=>({ok:false,error:name});
 return Object.freeze({
  save(input){
   let request;try{request=syncPlanWeekOperation_(input);}catch(ignore){return error('DataError');}
   const result=protocol.execute(request);return result.ok?{ok:true,value:{...result.value,scope:JSON.parse(syncCommitCanonical_(scope))}}:result;
  },
  read(week){
   try{if(typeof week!=='string'||monday_(week)!==week)return error('DataError');}catch(ignore){return error('DataError');}
   const result=protocol.read('weeks',week);if(!result.ok)return result;
   const {cursor,entity}=result.value;
   if(entity===null||entity.deleted)return {ok:true,value:{cursor,week:null,version:entity?.version??null,deleted:entity?.deleted??false}};
   try{
    const data=entity.data;if(!data||Object.keys(data).length!==2||data.format!=='sync-week/v1')return error('ProtocolCorrupt');
    const record=syncWeekSnapshot_(data.record);if(record.week!==week||syncCommitCanonical_(record)!==syncCommitCanonical_(data.record))return error('ProtocolCorrupt');
    return {ok:true,value:{cursor,week:record,version:entity.version,deleted:false}};
   }catch(ignore){return error('ProtocolCorrupt');}
  }
 });
}
// Shared immutable microaction definition, used by catalogues and log history.
function syncHabitStepsSnapshot_(steps){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!Array.isArray(steps)||steps.length>30)fail();const ids=new Set();
 return steps.map(step=>{
  if(!step||Object.prototype.toString.call(step)!=='[object Object]'||Object.keys(step).length!==2||Object.keys(step).some(key=>!['id','title'].includes(key))||typeof step.id!=='string'||!step.id.trim()||step.id.length>200||/[\u0000-\u001f\u007f]/.test(step.id)||ids.has(step.id)||typeof step.title!=='string'||!step.title.trim()||step.title.length>500)fail();
  ids.add(step.id);return {id:step.id,title:step.title};
 });
}
function syncCatalogId_(id,collection){return typeof id==='string'&&id.trim()!==''&&id.length<=(collection==='habits'?189:200)&&!/[\u0000-\u001f\u007f]/.test(id)&&(collection!=='habits'||!id.includes('|'));}
function syncCatalogSnapshot_(collection,record){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!['goals','habits'].includes(collection))fail();
 const keys=(collection==='goals'?GOAL_HEADERS:HABIT_HEADERS).filter(key=>key!=='updatedAt');
 if(!record||Object.prototype.toString.call(record)!=='[object Object]'||Object.keys(record).length!==keys.length||Object.keys(record).some(key=>!keys.includes(key))||keys.some(key=>typeof record[key]!=='string')||!syncCatalogId_(record.id,collection)||!record.title.trim()||record.title.length>200||record.description.length>6000)fail();
 try{iconValue_(record.icon);}catch(ignore){fail();}
 const out=Object.fromEntries(keys.map(key=>[key,record[key]]));
 if(collection==='goals'){
  if(!/^[0-9]{4}-Q[1-4]$/.test(record.cycle)||!Number.isFinite(Number(record.target))||Number(record.target)<=0||String(Number(record.target))!==record.target||!Number.isFinite(Number(record.progress))||Number(record.progress)<0||String(Number(record.progress))!==record.progress)fail();
  try{if(record.project&&slug_(record.project)!==record.project)fail();}catch(ignore){fail();}
 }else{
  if(!syncCatalogId_(record.goalId,'goals')||!validDate_(record.start)||!['','yes'].includes(record.archived))fail();
  if(!/^weekly:[1-7]$/.test(record.days)){
   const days=record.days.split(',');if(days.some(day=>! /^[0-6]$/.test(day))||[...new Set(days)].sort().join(',')!==record.days)fail();
  }
  try{out.steps=syncCommitCanonical_(syncHabitStepsSnapshot_(JSON.parse(record.steps||'[]')));}catch(ignore){fail();}
 }
 return out;
}
function syncPlanCatalogOperation_(input){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==2||Object.keys(input).some(key=>!['operationId','changes'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!Array.isArray(input.changes)||!input.changes.length||input.changes.length>25)fail();
 const seen=new Set(),changes=input.changes.map(change=>{
  if(!change||Object.prototype.toString.call(change)!=='[object Object]'||Object.keys(change).length!==4||Object.keys(change).some(key=>!['collection','id','baseVersion','record'].includes(key))||!(change.baseVersion===null||typeof change.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(change.baseVersion)))fail();
  const record=syncCatalogSnapshot_(change.collection,change.record),key=JSON.stringify([change.collection,change.id]);
  if(change.id!==record.id||seen.has(key))fail();seen.add(key);
  return {collection:change.collection,id:record.id,baseVersion:change.baseVersion,action:'upsert',data:{format:change.collection==='goals'?'sync-goal/v1':'sync-habit/v1',record}};
 });
 const request={operationId:input.operationId,changes};if(syncCommitCanonical_(request).length>32768)fail();return request;
}
// Project metadata uses the shared recoverable commit kernel. Folder creation
// and entry associations remain separate application mutations until their
// own plans can include every affected record atomically.
function syncProjectSnapshot_(project){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 const keys=PROJECT_HEADERS.filter(key=>key!=='updatedAt');
 if(!project||Object.prototype.toString.call(project)!=='[object Object]'||Object.keys(project).length!==keys.length||Object.keys(project).some(key=>!keys.includes(key))||keys.some(key=>typeof project[key]!=='string'))fail();
 try{if(slug_(project.slug)!==project.slug)fail();}catch(ignore){fail();}
 if(!project.name.trim()||project.name.length>200||text_(project.name,200)!==project.name||project.description.length>4000||project.description!==project.description.trim())fail();
 return Object.fromEntries(keys.map(key=>[key,project[key]]));
}
function syncPlanProjectOperation_(input){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==3||Object.keys(input).some(key=>!['operationId','baseVersion','project'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)))fail();
 const record=syncProjectSnapshot_(input.project),request={operationId:input.operationId,changes:[{collection:'projects',id:record.slug,baseVersion:input.baseVersion,action:'upsert',data:{format:'sync-project/v1',record}}]};
 if(syncCommitCanonical_(request).length>32768)fail();return request;
}
// Entry metadata is committed separately from note bodies, which live in
// DocContent/Google Docs. Keep every indexed field in the canonical snapshot.
const ENTRY_METADATA_HEADERS=ENTRY_HEADERS.filter(key=>key!=='body'&&key!=='updatedAt');
function syncEntrySnapshot_(entry){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!entry||Object.prototype.toString.call(entry)!=='[object Object]'||Object.keys(entry).length!==ENTRY_METADATA_HEADERS.length||Object.keys(entry).some(key=>!ENTRY_METADATA_HEADERS.includes(key))||ENTRY_METADATA_HEADERS.some(key=>typeof entry[key]!=='string'))fail();
 if(!/^[a-zA-Z0-9-]{10,80}$/.test(entry.id)||!validDate_(entry.date)||!['note','idea','task'].includes(entry.type)||!entry.text||entry.text.length>2000||entry.text!==entry.text.trim())fail();
 if(entry.due&&!validDate_(entry.due)||!['','open','doing','done','cancelled'].includes(entry.status)||entry.type==='task'&&!entry.status||entry.type!=='task'&&(entry.status||entry.due||entry.completedAt))fail();
 if(!entry.createdAt||!Number.isFinite(Date.parse(entry.createdAt))||!['personal','project'].includes(entry.scope)||entry.requestId&&!/^[a-zA-Z0-9-]{10,80}$/.test(entry.requestId))fail();
 const projects=entry.projects?entry.projects.split(','):[];try{if(projects.some(slug=>slug_(slug)!==slug)||new Set(projects).size!==projects.length)fail();}catch(ignore){fail();}
 try{if(normaliseTags_(entry.tags)!==entry.tags)fail();}catch(ignore){fail();}
 if(entry.completedAt&&(!Number.isFinite(Date.parse(entry.completedAt))||entry.status!=='done'))fail();
 return Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,entry[key]]));
}
function syncPlanEntryOperation_(input){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==3||Object.keys(input).some(key=>!['operationId','baseVersion','entry'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)))fail();
 const record=syncEntrySnapshot_(input.entry),request={operationId:input.operationId,changes:[{collection:'entries',id:record.id,baseVersion:input.baseVersion,action:'upsert',data:{format:'sync-entry/v1',record}}]};
 if(syncCommitCanonical_(request).length>32768)fail();return request;
}
function syncEntryWriter_(store,trustedScope){
 const fail=name=>{throw Object.assign(Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),error=name=>({ok:false,error:name});let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,trustedScope);
 const run=fn=>{try{return {ok:true,value:copy(store.withLock(()=>{if(owned)fail('BusyError');owned=true;try{return fn();}finally{owned=false;}}))};}catch(error){return {ok:false,error:['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','BusyError'].includes(error?.name)?error.name:'StorageError'};}};
 return Object.freeze({
  save(input){let request;try{request=syncPlanEntryOperation_(input);}catch(ignore){return error('DataError');}return run(()=>{const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};unwrap(protocol.recover());if(store.readReceipt(trustedScope.principalId,request.operationId)!==null||store.findCommitByOperation(trustedScope.principalId,request.operationId)!==null)return unwrap(protocol.execute(request));const prior=unwrap(protocol.read('entries',request.changes[0].id)).entity;if(prior?.deleted)fail('CommitBlocked');return unwrap(protocol.execute(request));});},
  read(id){if(typeof id!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(id))return error('DataError');return run(()=>{const result=protocol.read('entries',id);if(!result.ok)fail(result.error);const {cursor,entity}=result.value;if(entity===null||entity.deleted)return {cursor,entry:null,version:entity?.version??null,deleted:entity?.deleted??false};try{const data=entity.data;if(!data||Object.keys(data).length!==2||data.format!=='sync-entry/v1')fail('ProtocolCorrupt');const entry=syncEntrySnapshot_(data.record);if(entry.id!==id||syncCommitCanonical_(entry)!==syncCommitCanonical_(data.record))fail('ProtocolCorrupt');return {cursor,entry,version:entity.version,deleted:false};}catch(ignore){fail('ProtocolCorrupt');}});}
 });
}
function syncProjectWriter_(store,trustedScope){
 const fail=name=>{throw Object.assign(new Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),error=name=>({ok:false,error:name});let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,trustedScope);
 const run=fn=>{try{return {ok:true,value:copy(store.withLock(()=>{if(owned)fail('BusyError');owned=true;try{return fn();}finally{owned=false;}}))};}catch(error){return {ok:false,error:['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','BusyError'].includes(error?.name)?error.name:'StorageError'};}};
 return Object.freeze({
  save(input){let request;try{request=syncPlanProjectOperation_(input);}catch(ignore){return error('DataError');}return run(()=>{const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};unwrap(protocol.recover());if(store.readReceipt(trustedScope.principalId,request.operationId)!==null||store.findCommitByOperation(trustedScope.principalId,request.operationId)!==null)return unwrap(protocol.execute(request));const prior=unwrap(protocol.read('projects',request.changes[0].id)).entity;if(prior?.deleted)fail('CommitBlocked');return unwrap(protocol.execute(request));});},
  read(slug){if(typeof slug!=='string')return error('DataError');try{if(slug_(slug)!==slug)return error('DataError');}catch(ignore){return error('DataError');}return run(()=>{const result=protocol.read('projects',slug);if(!result.ok)fail(result.error);const {cursor,entity}=result.value;if(entity===null||entity.deleted)return {cursor,project:null,version:entity?.version??null,deleted:entity?.deleted??false};try{const data=entity.data;if(!data||Object.keys(data).length!==2||data.format!=='sync-project/v1')fail('ProtocolCorrupt');const project=syncProjectSnapshot_(data.record);if(project.slug!==slug||syncCommitCanonical_(project)!==syncCommitCanonical_(data.record))fail('ProtocolCorrupt');return {cursor,project,version:entity.version,deleted:false};}catch(ignore){fail('ProtocolCorrupt');}});}
 });
}
// Pure API adapters. Allocation is supplied by the server and must be stored
// with the eventual durable plan; UUIDs are never generated during replay.
function syncCatalogEditInput_(kind,payload){
 const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
 if(!['goal','habit','archiveHabit'].includes(kind)||!payload||Object.prototype.toString.call(payload)!=='[object Object]')fail();
 const collection=kind==='goal'?'goals':'habits';
 const id=payload.id===undefined?'':payload.id,version=payload.updatedAt===undefined?'':payload.updatedAt,requestId=payload.requestId===undefined?'':payload.requestId;
 if(typeof id!=='string'||id&&!syncCatalogId_(id,collection)||typeof version!=='string'||version.length>200||typeof requestId!=='string'||requestId&&!/^[a-zA-Z0-9-]{10,80}$/.test(requestId))fail();
 if(kind==='archiveHabit'){if(!id)fail();return {id,version,requestId};}
 let title,description,icon;try{title=text_(payload.title,200);description=payload.description===undefined?null:text_(payload.description,6000);icon=payload.icon===undefined?null:iconValue_(payload.icon);}catch(ignore){fail();}
 if(!title)fail();
 if(kind==='goal'){
  const target=Number(payload.target),progress=Number(payload.progress);let project;
  if(typeof payload.cycle!=='string'||!/^\d{4}-Q[1-4]$/.test(payload.cycle)||!Number.isFinite(target)||target<=0||!Number.isFinite(progress)||progress<0)fail();
  try{project=payload.project?slug_(payload.project):'';}catch(ignore){fail();}
  return {id,version,requestId,title,description,icon,cycle:payload.cycle,target:String(target),progress:String(progress),project};
 }
 const rawDays=String(payload.days),flexible=/^weekly:[1-7]$/.test(rawDays),days=[...new Set(rawDays.split(','))].sort();
 if(!syncCatalogId_(payload.goalId,'goals')||!validDate_(payload.start)||!flexible&&days.some(day=>! /^[0-6]$/.test(day)))fail();
 const steps=payload.steps===undefined?null:String(payload.steps).split(/\r?\n/).map(title=>title.trim()).filter(Boolean);
 if(steps&&(steps.length>30||steps.some(title=>title.length>500)))fail();
 return {id,version,requestId,title,description,icon,goalId:payload.goalId,days:days.join(','),start:payload.start,steps};
}
function syncHabitStepPlan_(previous,titles){
 const used=new Set();return titles.map((title,index)=>{
  const match=previous.find(step=>step.title===title&&!used.has(step.id))||previous[index],id=match&&!used.has(match.id)?match.id:null;
  if(id!==null)used.add(id);return {id,title};
 });
}
function syncPrepareCatalogEdit_(kind,payload,previous,goal,allocation){
 const fail=name=>{throw Object.assign(Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const input=syncCatalogEditInput_(kind,payload),collection=kind==='goal'?'goals':'habits',headers=collection==='goals'?GOAL_HEADERS:HABIT_HEADERS;
 const full=(record,keys)=>record&&Object.prototype.toString.call(record)==='[object Object]'&&Object.keys(record).length===keys.length&&Object.keys(record).every(key=>keys.includes(key)&&typeof record[key]==='string');
 if(!allocation||Object.keys(allocation).length!==2||!syncCatalogId_(allocation.id,collection)||!Array.isArray(allocation.stepIds)||allocation.stepIds.length>30||allocation.stepIds.some(id=>typeof id!=='string'||!id.trim()||id.length>200||/[\u0000-\u001f\u007f]/.test(id))||new Set(allocation.stepIds).size!==allocation.stepIds.length)fail('DataError');
 let old=null;
 if(previous!==null){
  if(!full(previous,headers)||previous.id!==allocation.id||input.id!==previous.id)fail('DataError');
  old=syncCatalogSnapshot_(collection,Object.fromEntries(headers.filter(key=>key!=='updatedAt').map(key=>[key,previous[key]])));
 }else if(input.version||kind==='archiveHabit'||kind==='habit'&&input.id)fail('ConflictError');
 if(input.id&&input.id!==allocation.id)fail('DataError');
 if(kind==='archiveHabit'){
  if(allocation.stepIds.length)fail('DataError');return copy({collection,record:syncCatalogSnapshot_(collection,{...old,archived:'yes'}),input,dependency:null});
 }
 const common={id:allocation.id,title:input.title,description:input.description===null?(old?.description||''):input.description,icon:input.icon===null?(old?.icon||''):input.icon};
 if(kind==='goal'){
  if(allocation.stepIds.length)fail('DataError');return copy({collection,record:syncCatalogSnapshot_(collection,{...common,cycle:input.cycle,target:input.target,progress:input.progress,project:input.project}),input,dependency:null});
 }
 if(old?.archived==='yes')fail('ConflictError');
 if(!full(goal,GOAL_HEADERS))fail('CommitBlocked');
 const goalSnapshot=syncCatalogSnapshot_('goals',Object.fromEntries(GOAL_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,goal[key]])));
 if(goalSnapshot.id!==input.goalId||goalSnapshot.cycle!==input.start.slice(0,4)+'-Q'+Math.ceil(Number(input.start.slice(5,7))/3))fail('CommitBlocked');
 const prior=old?JSON.parse(old.steps):[],titles=input.steps===null?prior.map(step=>step.title).join('\n').split(/\r?\n/).map(title=>title.trim()).filter(Boolean):input.steps;
 if(titles.length>30||titles.some(title=>title.length>500))fail('DataError');
 let at=0;const steps=syncHabitStepPlan_(prior,titles).map(step=>{
  if(step.id!==null)return step;const id=allocation.stepIds[at++];
  if(id===undefined||prior.some(old=>old.id===id))fail('DataError');return {id,title:step.title};
 });
 if(at!==allocation.stepIds.length)fail('DataError');
 return copy({collection,record:syncCatalogSnapshot_(collection,{...common,goalId:input.goalId,days:input.days,start:input.start,steps:JSON.stringify(steps),archived:''}),input,dependency:goal});
}
function syncCatalogWriter_(store,trustedScope){
 const fail=name=>{throw Object.assign(Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),scope=copy(trustedScope);
 let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,scope);
 const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=fn=>{try{return {ok:true,value:copy(store.withLock(()=>{if(owned)fail('BusyError');owned=true;try{return fn();}finally{owned=false;}}))};}catch(error){return {ok:false,error:['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','StorageError'].includes(error?.name)?error.name:'StorageError'};}};
 function readEntity(collection,id){
  const value=unwrap(protocol.read(collection,id)),entity=value.entity;
  if(entity&&!entity.deleted){
   try{const format=collection==='goals'?'sync-goal/v1':'sync-habit/v1';if(!entity.data||Object.keys(entity.data).length!==2||entity.data.format!==format||entity.data.record.id!==id||syncCommitCanonical_(syncCatalogSnapshot_(collection,entity.data.record))!==syncCommitCanonical_(entity.data.record))fail('ProtocolCorrupt');}
   catch(ignore){fail('ProtocolCorrupt');}
  }
  return value;
 }
 return Object.freeze({
  save(input){
   let request;try{request=syncPlanCatalogOperation_(input);}catch(ignore){return {ok:false,error:'DataError'};}
   return run(()=>{
    unwrap(protocol.recover());
    const execute=()=>({...unwrap(protocol.execute(request)),scope:copy(scope)});
    // Old receipts and retained commits are checked by the kernel before any
    // live business dependency. A later catalogue edit cannot alter an ACK.
    if(store.readReceipt(scope.principalId,request.operationId)!==null||store.findCommitByOperation(scope.principalId,request.operationId)!==null)return execute();
    const before=request.changes.map(change=>readEntity(change.collection,change.id).entity);
    if(request.changes.some((change,i)=>(before[i]?.version??null)!==change.baseVersion))return execute();
    for(const [index,change]of request.changes.entries()){
     if(before[index]?.deleted)fail('CommitBlocked');
     if(change.collection!=='habits')continue;
     const record=change.data.record,old=before[index]?.data.record;
     if(record.archived==='yes'){
      // Archive preserves the entire historical definition, without requiring
      // a still-current goal/quarter. This matches deleteHabit's soft archive.
      if(!old||syncCommitCanonical_({...old,archived:'yes'})!==syncCommitCanonical_(record))fail('CommitBlocked');
      continue;
     }
     if(old?.archived==='yes')fail('CommitBlocked');
     const planned=request.changes.find(item=>item.collection==='goals'&&item.id===record.goalId);
     const goal=planned?planned.data.record:readEntity('goals',record.goalId).entity;
     const goalRecord=planned?goal:goal&&!goal.deleted?goal.data.record:null;
     if(!goalRecord||goalRecord.cycle!==record.start.slice(0,4)+'-Q'+Math.ceil(Number(record.start.slice(5,7))/3))fail('CommitBlocked');
    }
    return execute();
   });
  },
  read(collection,id){
   if(!['goals','habits'].includes(collection)||!syncCatalogId_(id,collection))return {ok:false,error:'DataError'};
   return run(()=>{const {cursor,entity}=readEntity(collection,id);return {cursor,record:entity&&!entity.deleted?entity.data.record:null,version:entity?.version??null,deleted:entity?.deleted??false};});
  }
 });
}
// Canonical logs contain the historical checklist, never a live catalogue view.
function syncHabitLogIdentity_(key){
 if(typeof key!=='string'||key.length>200)return false;
 const split=key.lastIndexOf('|');if(split<1)return false;
 const habitId=key.slice(0,split),date=key.slice(split+1);
 return !/[|\u0000-\u001f\u007f]/.test(habitId)&&habitId.trim()!==''&&validDate_(date);
}
function syncHabitLogSnapshot_(log){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 const keys=LOG_HEADERS.filter(key=>key!=='updatedAt');
 const fields=(value,list)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===list.length&&Object.keys(value).every(key=>list.includes(key));
 if(!fields(log,keys)||keys.some(key=>typeof log[key]!=='string')||!syncHabitLogIdentity_(log.key)||log.key!==log.habitId+'|'+log.date||!['done','skipped','pending'].includes(log.status)||log.checklist.length>32768)fail();
 let checklist;try{checklist=JSON.parse(log.checklist);}catch(ignore){fail();}
 if(!fields(checklist,['steps','checked'])||!Array.isArray(checklist.steps)||checklist.steps.length>30||!Array.isArray(checklist.checked)||checklist.checked.length>30)fail();
 const steps=syncHabitStepsSnapshot_(checklist.steps),ids=new Set(steps.map(step=>step.id));
 if(checklist.checked.some(id=>typeof id!=='string'||!ids.has(id))||new Set(checklist.checked).size!==checklist.checked.length)fail();
 if(checklist.steps.length&&log.status!=='skipped'&&log.status!==(checklist.checked.length===checklist.steps.length?'done':'pending'))fail();
 return {...Object.fromEntries(keys.map(key=>[key,log[key]])),checklist:syncCommitCanonical_(checklist)};
}
function syncHabitLogEditInput_(payload){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 if(!payload||typeof payload.habitId!=='string'||typeof payload.date!=='string'||!syncHabitLogIdentity_(payload.habitId+'|'+payload.date)||!['done','skipped','pending'].includes(payload.status)||payload.checked!==undefined&&(!Array.isArray(payload.checked)||payload.checked.some(id=>typeof id!=='string'))||payload.updatedAt!==undefined&&(typeof payload.updatedAt!=='string'||payload.updatedAt.length>200)||payload.habitUpdatedAt!==undefined&&(typeof payload.habitUpdatedAt!=='string'||payload.habitUpdatedAt.length>200))fail();
 return {habitId:payload.habitId,date:payload.date,status:payload.status,checked:payload.checked===undefined?null:Array.from(new Set(payload.checked)),habitUpdatedAt:payload.habitUpdatedAt||'',version:payload.updatedAt||''};
}
// Pure bridge planner: server-supplied catalogue snapshots are never reread
// while replaying the eventual durable plan. This function performs no I/O.
function syncPrepareHabitLogEdit_(payload,previous,catalog){
 const fail=name=>{throw Object.assign(new Error(name),{name});};
 const copy=value=>JSON.parse(syncCommitCanonical_(value));
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&keys.every(key=>typeof value[key]==='string');
 const input=syncHabitLogEditInput_(payload);
 if(!catalog||Object.keys(catalog).length!==2||!fields(catalog.habit,HABIT_HEADERS)||!fields(catalog.goal,GOAL_HEADERS))fail('DataError');
 const {habit,goal}=catalog,date=payload.date,key=payload.habitId+'|'+date;
 if(habit.id!==payload.habitId||habit.goalId!==goal.id||habit.archived==='yes')fail('CommitBlocked');
 if(payload.habitUpdatedAt&&payload.habitUpdatedAt!==habit.updatedAt)fail('ConflictError');
 const d=new Date(date+'T12:00:00Z'),cycle=d.getUTCFullYear()+'-Q'+(Math.floor(d.getUTCMonth()/3)+1);
 if(goal.cycle!==cycle||!validDate_(habit.start)||date<habit.start||!/^weekly:[1-7]$/.test(habit.days)&&!habit.days.split(',').includes(String((d.getUTCDay()+6)%7)))fail('CommitBlocked');
 if(previous!==null&&(!fields(previous,LOG_HEADERS)||previous.key!==key||previous.habitId!==habit.id||previous.date!==date))fail('DataError');
 let session,steps,checked;
 try{
  session=previous&&previous.checklist?JSON.parse(previous.checklist):null;
  if(session){
   // Validate the historical definition before using even a partial edit.
   const original=syncHabitLogSnapshot_(Object.fromEntries(LOG_HEADERS.filter(k=>k!=='updatedAt').map(k=>[k,previous[k]])));
   session=JSON.parse(original.checklist);
  }
  steps=session?session.steps:habitSteps_(habit.steps);
  checked=payload.checked===undefined?(session?session.checked:[]):Array.from(new Set(payload.checked));
  if(!Array.isArray(steps)||!Array.isArray(checked)||checked.some(id=>!steps.some(step=>step.id===id)))fail('DataError');
  if(steps.length&&payload.status==='done'&&!steps.every(step=>checked.includes(step.id)))fail('DataError');
 }catch(error){fail(error?.name==='DataError'?'DataError':'ProtocolCorrupt');}
 const status=steps.length&&payload.status!=='skipped'?(steps.every(step=>checked.includes(step.id))?'done':'pending'):payload.status;
 const record=syncHabitLogSnapshot_({key,habitId:habit.id,date,status,checklist:JSON.stringify({steps,checked})});
 // The normalized request preserves omitted checked as null: omission means
 // "keep historical checks", rather than an explicit request to clear them.
 return copy({record,catalog,input});
}
function syncPlanHabitLogOperation_(input){
 const fail=()=>{throw Object.assign(new Error('DataError'),{name:'DataError'});};
 if(!input||Object.prototype.toString.call(input)!=='[object Object]'||Object.keys(input).length!==3||Object.keys(input).some(key=>!['operationId','baseVersion','log'].includes(key))||typeof input.operationId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.operationId)||!(input.baseVersion===null||typeof input.baseVersion==='string'&&/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion)))fail();
 const record=syncHabitLogSnapshot_(input.log),request={operationId:input.operationId,changes:[{collection:'habitLogs',id:record.key,baseVersion:input.baseVersion,action:'upsert',data:{format:'sync-habit-log/v1',record}}]};
 if(syncCommitCanonical_(request).length>32768)fail();return request;
}
function syncHabitLogWriter_(store,trustedScope){
 const protocol=syncCommitProtocol_(store,trustedScope),scope=JSON.parse(syncCommitCanonical_(trustedScope));
 const error=name=>({ok:false,error:name});
 return Object.freeze({
  save(input){
   let request;try{request=syncPlanHabitLogOperation_(input);}catch(ignore){return error('DataError');}
   const result=protocol.execute(request);return result.ok?{ok:true,value:{...result.value,scope:JSON.parse(syncCommitCanonical_(scope))}}:result;
  },
  read(key){
   if(!syncHabitLogIdentity_(key))return error('DataError');
   const result=protocol.read('habitLogs',key);if(!result.ok)return result;
   const {cursor,entity}=result.value;
   if(entity===null||entity.deleted)return {ok:true,value:{cursor,log:null,version:entity?.version??null,deleted:entity?.deleted??false}};
   try{
    const data=entity.data;if(!data||Object.keys(data).length!==2||data.format!=='sync-habit-log/v1')return error('ProtocolCorrupt');
    const log=syncHabitLogSnapshot_(data.record);if(log.key!==key||syncCommitCanonical_(log)!==syncCommitCanonical_(data.record))return error('ProtocolCorrupt');
    return {ok:true,value:{cursor,log,version:entity.version,deleted:false}};
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
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||!(kind==='operation'?[1,3].includes(request.changes.length):request.changes.length===(kind==='migrate'?3:1)))fail('ProtocolCorrupt');
  const change=request.changes[0];if(!fields(change,['collection','id','baseVersion','action','data'])||change.collection!=='days'||change.id!==date||change.action!=='upsert'||!fields(change.data,['format','record'])||change.data.format!=='sync-day/v1'||syncCommitCanonical_(syncDaySnapshot_(change.data.record))!==syncCommitCanonical_(change.data.record)||change.data.record.date!==date)fail('ProtocolCorrupt');
  if(kind==='migrate'||kind==='operation'&&request.changes.length===3){
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
 function checkExpectedScope(expected){if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');}
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
  saveOperation(input,expectedScope){return run(()=>{
   checkExpectedScope(expectedScope);input=dayOperationInput_(input);const date=input.day.date;
   const request=savedPlan('operation',input,input.operationId,date,()=>{
    const index=directory();
    if(index.dates.includes(date)){
     const descriptor=route(date);checkSource(date,descriptor);const current=unwrap(writer.read(date));
     const base=input.baseVersion===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion||'')?input.baseVersion:null;
     return syncPlanDayOperation_({...input,baseVersion:base});
    }
    // New days may be created canonically. Existing legacy days require the
    // separately authorized migration; this endpoint never migrates old data.
    if(rawOne(date)!==null||unwrap(writer.read(date)).version!==null)fail('ProtocolUnavailable');
    if(input.baseVersion!==null)fail('ConflictError');if(index.dates.length>=128)fail('ProtocolUnavailable');
    return {operationId:input.operationId,changes:[syncPlanDayOperation_(input).changes[0],upsert('settings',routeId(date),null,{format:'sync-day-route/v1',date,sourceDigest:hash(null),legacyVersion:''}),upsert('settings',directoryId,index.version,{format:'sync-day-routing/v1',dates:[...index.dates,date].sort()})]};
   });
   const descriptor=request.changes.length===3?request.changes[1].data:route(date);checkSource(date,descriptor);
   const ack=commit(request);checkSource(date,descriptor);return {...request.changes[0].data.record,updatedAt:ack.versions[0].version};
  });},
  readOperationState(input){return run(()=>{
   checkExpectedScope(input?.expectedScope);const date=input.date;if(!validDate_(date))fail('DataError');
   let day;if(directory().dates.includes(date)){const descriptor=route(date);checkSource(date,descriptor);const current=unwrap(writer.read(date));day=current.day?{...current.day,updatedAt:current.version}:null;}
   else{if(unwrap(writer.read(date)).version!==null)fail('CommitBlocked');day=rawOne(date);}
   return {date,missing:day===null,day,scope:copy(input.expectedScope)};
  });},
  lookupDayReceipt(input){
   const request=dayOperationInput_(input?.request),expected=input?.expectedScope;
   if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');
   // lookupOperationReceipt is a read-only barrier and refuses pending work.
   return run(()=>{
    const initial=unwrap(protocol.lookupOperationReceipt({operationId:request.operationId})),entity=unwrap(protocol.read('settings','day-plan:'+hash([scope.principalId,request.operationId]))).entity;
    if(!entity)return {status:'unknown',operationId:request.operationId,scope:copy(expected)};
    const plan=planValue(entity.data,'operation',hash({kind:'operation',input:request}),request.operationId,request.day.date);
    const receipt=initial.status==='unknown'?initial:unwrap(protocol.lookupOperationReceipt({operationId:request.operationId,request:plan}));
    if(receipt.status!=='committed')return {status:receipt.status,operationId:request.operationId,scope:copy(expected)};
    const versions=receipt.versions.filter(item=>item.collection==='days'&&item.id===request.day.date&&!item.deleted);
    if(versions.length!==1||versions[0].version!=='commit-'+receipt.sequence)fail('ProtocolCorrupt');
    return {status:'committed',operationId:request.operationId,id:request.day.date,version:versions[0].version,scope:copy(expected)};
   });
  },
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
function syncValidWeek_(week){try{return typeof week==='string'&&monday_(week)===week;}catch(ignore){return false;}}
function syncWeekSheetSource_(sheet){
 const read=week=>commonDateRangesRaw_(sheet,WEEK_HEADERS,'week',[{from:week,to:week}]).rows;
 return Object.freeze({
  read,
  readRows(ranges){
   if(ranges)return commonDateRangesRaw_(sheet,WEEK_HEADERS,'week',ranges).rows;
   verify_(sheet,WEEK_HEADERS);const count=sheet.getLastRow()-1;
   return count>0?readSheetValues_(sheet.getRange(2,1,count,WEEK_HEADERS.length)).map(row=>Object.fromEntries(WEEK_HEADERS.map((key,i)=>[key,row[i]]))):[];
  },
  saveLegacy(payload){
   const values=weekValues_(payload),found=read(payload.week);
   if(found.length>1||(found[0]?.updatedAt||'')!==(payload.updatedAt||''))throw Object.assign(Error('Settimana modificata altrove. Conserva la bozza e aggiorna.'),{name:'ConflictError'});
   const record={...Object.fromEntries(WEEK_HEADERS.map(key=>[key,''])),...found[0],...values};
   record.updatedAt=new Date(Math.max(Date.now(),found[0]?Date.parse(found[0].updatedAt)+1:0)).toISOString();
   verify_(sheet,WEEK_HEADERS);const rows=findRows_(sheet,1,payload.week,false);
   if(rows.length)writeRow_(sheet,rows[0],WEEK_HEADERS.map(key=>record[key]));else append_(sheet,[WEEK_HEADERS.map(key=>record[key])]);
   // The commit store's lock is read-only for legacy mutations, so these writes
   // need their own flush before the shared lock is released.
   traceMeasure_('flush',()=>SpreadsheetApp.flush());return record;
  }
 });
}
function syncWeekMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Settimana modificata altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const scope=copy(trustedScope),directoryId='week-routing-v1',routeId=week=>'week-route:'+week;
 let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}};
 const protocol=syncCommitProtocol_(nested,scope),writer=syncWeekWriter_(nested,scope);
 for(const method of ['read','readRows','saveLegacy'])if(typeof source?.[method]!=='function')fail('DataError');
 const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=fn=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id)&&!id.startsWith('week-reserve-');
 function rawRecord(row,week){
  if(row===null)return null;
  if(!row||typeof row!=='object'||Object.keys(row).some(key=>!WEEK_HEADERS.includes(key))||row.week!==week)fail('DataError');
  const record={};for(const key of WEEK_HEADERS){const value=row[key];if(typeof value!=='string')fail('DataError');record[key]=value;}return record;
 }
 function rawOne(week,rows=source.read(week)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?rawRecord(rows[0],week):null;}
 const snapshot=row=>syncWeekSnapshot_(Object.fromEntries(WEEK_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,row?.[key]??''])));
 function directoryData(data){
  if(!fields(data,['format','weeks'])||data.format!=='sync-week-routing/v1'||!Array.isArray(data.weeks)||data.weeks.length>128||data.weeks.some(week=>typeof week!=='string'||!syncValidWeek_(week))||new Set(data.weeks).size!==data.weeks.length||syncCommitCanonical_([...data.weeks].sort())!==syncCommitCanonical_(data.weeks))fail('ProtocolCorrupt');return data;
 }
 function directory(){const entity=unwrap(protocol.read('settings',directoryId)).entity;if(!entity)return {weeks:[],version:null};if(entity.deleted)fail('ProtocolCorrupt');return {...directoryData(entity.data),version:entity.version};}
 function routeData(data,week){if(!fields(data,['format','week','sourceDigest','legacyVersion'])||data.format!=='sync-week-route/v1'||data.week!==week||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||typeof data.legacyVersion!=='string')fail('ProtocolCorrupt');return data;}
 function route(week){const entity=unwrap(protocol.read('settings',routeId(week))).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,week),version:entity.version};}
 function checkSource(week,descriptor,rows){if(hash(rawOne(week,rows))!==descriptor.sourceDigest)fail('CommitBlocked');}
 function planValue(data,kind,fingerprint,operationId,week){
   if(!fields(data,['format','kind','fingerprint','request'])||data.format!=='sync-week-plan/v1')fail('ProtocolCorrupt');
   if(data.kind!==kind||data.fingerprint!==fingerprint)fail('OperationMismatch');
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||!(kind==='operation'?[1,3].includes(request.changes.length):request.changes.length===(kind==='migrate'?3:1)))fail('ProtocolCorrupt');
  const change=request.changes[0];if(!fields(change,['collection','id','baseVersion','action','data'])||change.collection!=='weeks'||change.id!==week||change.action!=='upsert'||!fields(change.data,['format','record'])||change.data.format!=='sync-week/v1'||syncCommitCanonical_(syncWeekSnapshot_(change.data.record))!==syncCommitCanonical_(change.data.record)||change.data.record.week!==week)fail('ProtocolCorrupt');
  if(kind==='migrate'||kind==='operation'&&request.changes.length===3){
   const r=request.changes[1],d=request.changes[2];
   if(change.baseVersion!==null||!fields(r,['collection','id','baseVersion','action','data'])||r.collection!=='settings'||r.id!==routeId(week)||r.action!=='upsert'||r.baseVersion!==null||!fields(d,['collection','id','baseVersion','action','data'])||d.collection!=='settings'||d.id!==directoryId||d.action!=='upsert')fail('ProtocolCorrupt');
   routeData(r.data,week);if(!directoryData(d.data).weeks.includes(week))fail('ProtocolCorrupt');
  }
  return request;
 }
 function savedPlan(kind,input,operationId,week,prepare){
  const fingerprint=hash({kind,input}),key=hash([scope.principalId,operationId]),id='week-plan:'+key;
  let entity=unwrap(protocol.read('settings',id)).entity;
  if(!entity){
   const data={format:'sync-week-plan/v1',kind,fingerprint,request:prepare()};planValue(data,kind,fingerprint,operationId,week);
   const reservation={operationId:'week-reserve-'+key,changes:[{collection:'settings',id,baseVersion:null,action:'upsert',data}]};
   if(typeof store.preflightWrites==='function'){
    const sequence=unwrap(protocol.recover()).committedThrough;
    if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(data.request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');
   }
   const reserved=unwrap(protocol.execute(reservation));
   if(reserved.status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',id)).entity;
  }
  if(!entity||entity.deleted)fail('ProtocolCorrupt');return planValue(entity.data,kind,fingerprint,operationId,week);
 }
 function checkExpectedScope(expected){if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');}
 const upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 function commit(request){const result=unwrap(protocol.execute(request));if(result.status==='conflict')fail('ConflictError');return {...result,scope:copy(scope)};}
 const delta=record=>({delta:true,entries:[],commonIncluded:false,commonUpserts:{weeks:[record]}});
 function save(payload){
  const values=weekValues_(payload),version=payload.updatedAt||'';if(typeof version!=='string')fail('DataError');
  const input={values,version},operationId=payload.operationId===undefined?'week-edit-'+hash(input):payload.operationId;
  if(!validId(operationId))fail('DataError');const index=directory();
  if(!index.weeks.includes(values.week)){
   if(unwrap(protocol.read('settings',routeId(values.week))).entity!==null||unwrap(writer.read(values.week)).version!==null)fail('CommitBlocked');
   return source.saveLegacy(payload);
  }
  const descriptor=route(values.week);checkSource(values.week,descriptor);
  const request=savedPlan('edit',input,operationId,values.week,()=>{
   const current=unwrap(writer.read(values.week));if(!current.week||current.deleted)fail('CommitBlocked');
   const week=syncWeekSnapshot_({...current.week,...values});
   const baseVersion=version===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(version)?version:null;
   return syncPlanWeekOperation_({operationId,baseVersion,week});
  });
  checkSource(values.week,descriptor);const ack=commit(request);checkSource(values.week,descriptor);
  return {...request.changes[0].data.record,updatedAt:ack.versions[0].version};
 }
 return Object.freeze({
  saveOperation(input,expectedScope){return run(()=>{
   checkExpectedScope(expectedScope);input=weekOperationInput_(input);const date=input.week.week;
   const request=savedPlan('operation',input,input.operationId,date,()=>{
    const index=directory();
    if(index.weeks.includes(date)){
     const descriptor=route(date);checkSource(date,descriptor);const current=unwrap(writer.read(date));
     const base=input.baseVersion===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion||'')?input.baseVersion:null;
     return syncPlanWeekOperation_({...input,baseVersion:base});
    }
    // New weeks may be created canonically. Existing legacy weeks require the
    // separately authorized migration; this endpoint never migrates old data.
    if(rawOne(date)!==null||unwrap(writer.read(date)).version!==null)fail('ProtocolUnavailable');
    if(input.baseVersion!==null)fail('ConflictError');if(index.weeks.length>=128)fail('ProtocolUnavailable');
    return {operationId:input.operationId,changes:[syncPlanWeekOperation_(input).changes[0],upsert('settings',routeId(date),null,{format:'sync-week-route/v1',week:date,sourceDigest:hash(null),legacyVersion:''}),upsert('settings',directoryId,index.version,{format:'sync-week-routing/v1',weeks:[...index.weeks,date].sort()})]};
   });
   const descriptor=request.changes.length===3?request.changes[1].data:route(date);checkSource(date,descriptor);
   const ack=commit(request);checkSource(date,descriptor);return {...request.changes[0].data.record,updatedAt:ack.versions[0].version};
  });},
  readOperationState(input){return run(()=>{
   checkExpectedScope(input?.expectedScope);const date=input.week;if(!syncValidWeek_(date))fail('DataError');
   let record;if(directory().weeks.includes(date)){const descriptor=route(date);checkSource(date,descriptor);const current=unwrap(writer.read(date));record=current.week?{...current.week,updatedAt:current.version}:null;}
   else{if(unwrap(writer.read(date)).version!==null)fail('CommitBlocked');record=rawOne(date);}
   return {week:date,missing:record===null,weekRecord:record,scope:copy(input.expectedScope)};
  });},
  lookupWeekReceipt(input){
   const request=weekOperationInput_(input?.request),expected=input?.expectedScope;
   if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');
   // lookupOperationReceipt is a read-only barrier and refuses pending work.
   return run(()=>{
    const initial=unwrap(protocol.lookupOperationReceipt({operationId:request.operationId})),entity=unwrap(protocol.read('settings','week-plan:'+hash([scope.principalId,request.operationId]))).entity;
    if(!entity)return {status:'unknown',operationId:request.operationId,scope:copy(expected)};
    const plan=planValue(entity.data,'operation',hash({kind:'operation',input:request}),request.operationId,request.week.week);
    const receipt=initial.status==='unknown'?initial:unwrap(protocol.lookupOperationReceipt({operationId:request.operationId,request:plan}));
    if(receipt.status!=='committed')return {status:receipt.status,operationId:request.operationId,scope:copy(expected)};
    const versions=receipt.versions.filter(item=>item.collection==='weeks'&&item.id===request.week.week&&!item.deleted);
    if(versions.length!==1||versions[0].version!=='commit-'+receipt.sequence)fail('ProtocolCorrupt');
    return {status:'committed',operationId:request.operationId,id:request.week.week,version:versions[0].version,scope:copy(expected)};
   });
  },
  preview(week){return run(()=>{if(typeof week!=='string'||!syncValidWeek_(week))fail('DataError');const row=rawOne(week);const record=row?snapshot(row):syncWeekSnapshot_({...Object.fromEntries(WEEK_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,key==='closed'?'no':''])),week});return {week,legacy:row,sourceDigest:hash(row),record,migrated:directory().weeks.includes(week)};});},
  migrate(input){return run(()=>{
   if(!fields(input,['operationId','week','expectedLegacy'])||!validId(input.operationId)||typeof input.week!=='string'||!syncValidWeek_(input.week))fail('DataError');
   const expected=rawRecord(input.expectedLegacy,input.week),sourceDigest=hash(expected);
   const request=savedPlan('migrate',{week:input.week,expected},input.operationId,input.week,()=>{
    if(hash(rawOne(input.week))!==sourceDigest)fail('CommitBlocked');const index=directory();
    if(index.weeks.includes(input.week)||index.weeks.length>=128||unwrap(writer.read(input.week)).version!==null)fail('CommitBlocked');
    const week=expected?snapshot(expected):syncWeekSnapshot_({...Object.fromEntries(WEEK_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,key==='closed'?'no':''])),week:input.week});
    return {operationId:input.operationId,changes:[syncPlanWeekOperation_({operationId:input.operationId,baseVersion:null,week}).changes[0],upsert('settings',routeId(input.week),null,{format:'sync-week-route/v1',week:input.week,sourceDigest,legacyVersion:expected?.updatedAt||''}),upsert('settings',directoryId,index.version,{format:'sync-week-routing/v1',weeks:[...index.weeks,input.week].sort()})]};
   });
   if(hash(rawOne(input.week))!==sourceDigest)fail('CommitBlocked');const ack=commit(request);if(hash(rawOne(input.week))!==sourceDigest)fail('CommitBlocked');return ack;
  });},
  saveLegacy(payload){return run(()=>delta(save(payload)));},
  readRows(ranges=null){return run(()=>{
   if(ranges!==null&&(!Array.isArray(ranges)||!ranges.length||ranges.length>10||ranges.some(range=>!range||typeof range.from!=='string'||typeof range.to!=='string'||!validDate_(range.from)||!validDate_(range.to)||range.from>range.to||(Date.parse(range.to)-Date.parse(range.from))/86400000>400)))fail('DataError');
   const index=directory(),rows=source.readRows(ranges);if(!Array.isArray(rows))fail('ProtocolCorrupt');
   const selected=index.weeks.filter(week=>ranges===null||ranges.some(range=>week>=range.from&&week<=range.to)),replacements=new Map();
   for(const week of selected){const descriptor=route(week);checkSource(week,descriptor,rows.filter(row=>row.week===week));const current=unwrap(writer.read(week));if(current.version===null)fail('ProtocolCorrupt');replacements.set(week,current.week?{...current.week,updatedAt:current.version}:null);}
   const out=[];for(const row of rows){if(replacements.has(row.week)){const replacement=replacements.get(row.week);if(replacement)out.push(replacement);replacements.delete(row.week);}else out.push(row);}
   for(const row of replacements.values())if(row)out.push(row);return out;
  });}
 });
}
// Raw catalogue adapter. All dependencies are supplied explicitly by the server.
function syncCatalogSheetSource_(goals,habits,uuid=()=>Utilities.getUuid()){
 const headers=collection=>collection==='goals'?GOAL_HEADERS:HABIT_HEADERS,sheet=collection=>collection==='goals'?goals:habits;
 const read=(collection,id)=>{
  const table=sheet(collection),keys=headers(collection);verify_(table,keys);const found=findRows_(table,1,id,false);
  if(found.length>1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});
  if(!found.length)return [];const values=readSheetValues_(table.getRange(found[0],1,1,keys.length))[0];return [Object.fromEntries(keys.map((key,i)=>[key,values[i]]))];
 };
 const allocate=(kind,input,previous)=>{
  const stepIds=[];
  if(kind==='habit'){
   const prior=previous?syncHabitStepsSnapshot_(JSON.parse(previous.steps||'[]')):[],titles=input.steps===null?prior.map(step=>step.title).join('\n').split(/\r?\n/).map(s=>s.trim()).filter(Boolean):input.steps;
   syncHabitStepPlan_(prior,titles).forEach(step=>{if(step.id===null)stepIds.push(uuid());});
  }
  return {id:input.id||uuid(),stepIds};
 };
 const settingSource=syncSettingsPropertiesSource_();
 return Object.freeze({read,allocate,readSetting:kind=>settingSource.read(kind),
  readRows(collection){const table=sheet(collection),keys=headers(collection);verify_(table,keys);const count=table.getLastRow()-1;return count>0?readSheetValues_(table.getRange(2,1,count,keys.length)).map(values=>Object.fromEntries(keys.map((key,i)=>[key,values[i]]))):[];},
  saveLegacy(kind,payload,previous,goal){
   if(!previous||(previous.updatedAt||'')!==(payload.updatedAt||''))throw Object.assign(Error('Catalogo modificato altrove.'),{name:'ConflictError'});
   const input=syncCatalogEditInput_(kind,payload),prepared=syncPrepareCatalogEdit_(kind,payload,previous,goal,allocate(kind,input,previous)),record={...prepared.record,updatedAt:new Date(Math.max(Date.now(),Date.parse(previous.updatedAt)+1)).toISOString()},table=sheet(prepared.collection),keys=headers(prepared.collection);
   const found=findRows_(table,1,previous.id,false);if(found.length!==1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});
   if(prepared.collection==='goals')ensureGoalIconHeader_(table,true);else ensureHabitHeaders_(table,true);
   writeRow_(table,found[0],keys.map(key=>record[key]));traceMeasure_('flush',()=>SpreadsheetApp.flush());return record;
  }
 });
}
function syncProjectSheetSource_(projects){
 function read(slug){verify_(projects,PROJECT_HEADERS);const found=findRows_(projects,1,slug,false);if(found.length>1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});if(!found.length)return [];const values=readSheetValues_(projects.getRange(found[0],1,1,PROJECT_HEADERS.length))[0];return [Object.fromEntries(PROJECT_HEADERS.map((key,i)=>[key,values[i]]))];}
 return Object.freeze({read,readRows(){verify_(projects,PROJECT_HEADERS);const count=projects.getLastRow()-1;return count>0?readSheetValues_(projects.getRange(2,1,count,PROJECT_HEADERS.length)).map(values=>Object.fromEntries(PROJECT_HEADERS.map((key,i)=>[key,values[i]]))):[];},saveLegacy(payload,previous){
  if(!previous||(previous.updatedAt||'')!==(payload.updatedAt||''))throw Object.assign(Error('ConflictError'),{name:'ConflictError'});
  const slug=slug_(payload.slug||payload.name),name=text_(payload.name,200),description=String(payload.description||'').trim();if(!name||description.length>4000)throw Object.assign(Error('DataError'),{name:'DataError'});
  if(this.readRows().some(row=>row.slug!==slug&&row.name.toLowerCase()===name.toLowerCase()))throw Object.assign(Error('DataError'),{name:'DataError'});
  const updatedAt=new Date(Math.max(Date.now(),Date.parse(previous.updatedAt)+1)).toISOString(),record={slug,name,description,updatedAt},found=findRows_(projects,1,slug,false);if(found.length!==1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});writeRow_(projects,found[0],PROJECT_HEADERS.map(key=>record[key]));traceMeasure_('flush',()=>SpreadsheetApp.flush());return record;
 }});
}
function syncProjectMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Progetto modificato altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),scope=copy(trustedScope);let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,scope),writer=syncProjectWriter_(nested,scope),unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const entrySource=syncEntrySheetSource_(),entryGateway=syncEntryMigrationGateway_(nested,scope,entrySource);
 const run=fn=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const opValid=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id),directoryId='project-routing-v1',routeId=slug=>'project-route:'+hash(slug),upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 for(const method of ['read','readRows','saveLegacy'])if(typeof source?.[method]!=='function')fail('DataError');
 function raw(row,slug){if(row===null)return null;if(!fields(row,PROJECT_HEADERS)||PROJECT_HEADERS.some(key=>typeof row[key]!=='string')||row.slug!==slug)fail('DataError');try{if(slug_(row.slug)!==row.slug)fail('DataError');}catch(ignore){fail('DataError');}return row;}
 function rawOne(slug,rows=source.read(slug)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?raw(rows[0],slug):null;}
 const snapshot=row=>syncProjectSnapshot_(Object.fromEntries(PROJECT_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,row[key]])));
 function directoryData(data){if(!fields(data,['format','slugs'])||data.format!=='sync-project-routing/v1'||!Array.isArray(data.slugs)||data.slugs.length>128||data.slugs.some(slug=>{try{return slug_(slug)!==slug;}catch(ignore){return true;}})||new Set(data.slugs).size!==data.slugs.length||syncCommitCanonical_([...data.slugs].sort())!==syncCommitCanonical_(data.slugs))fail('ProtocolCorrupt');return data;}
 function directory(){const entity=unwrap(protocol.read('settings',directoryId)).entity;if(!entity)return {slugs:[],version:null};if(entity.deleted)fail('ProtocolCorrupt');return {...directoryData(entity.data),version:entity.version};}
 const contains=(index,slug)=>index.slugs.includes(slug);
 function routeData(data,slug){if(!fields(data,['format','slug','sourceDigest','legacyVersion'])||data.format!=='sync-project-route/v1'||data.slug!==slug||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||typeof data.legacyVersion!=='string')fail('ProtocolCorrupt');return data;}
 function route(slug){const entity=unwrap(protocol.read('settings',routeId(slug))).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,slug),version:entity.version};}
 function checkSource(slug,descriptor,rows){if(hash(rawOne(slug,rows))!==descriptor.sourceDigest)fail('CommitBlocked');}
 function current(slug,index=directory()){
  if(!contains(index,slug)){if(unwrap(protocol.read('settings',routeId(slug))).entity||unwrap(writer.read(slug)).version!==null)fail('CommitBlocked');return rawOne(slug);}
  const descriptor=route(slug),rows=source.read(slug);checkSource(slug,descriptor,rows);const value=unwrap(writer.read(slug));if(value.version===null)fail('ProtocolCorrupt');return value.project?{...value.project,updatedAt:value.version}:null;
 }
 function planData(data,fingerprint,operationId){if(!fields(data,['format','fingerprint','slug','legacy','request','publishesRoute'])||data.format!=='sync-project-plan/v1'||data.fingerprint!==fingerprint||typeof data.publishesRoute!=='boolean')fail('OperationMismatch');const slug=data.slug;try{if(slug_(slug)!==slug)fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}raw(data.legacy,slug);if(!fields(data.request,['operationId','changes'])||data.request.operationId!==operationId||!Array.isArray(data.request.changes)||data.request.changes.length!==(data.publishesRoute?3:1))fail('ProtocolCorrupt');const first=data.request.changes[0];if(!fields(first,['collection','id','baseVersion','action','data'])||first.collection!=='projects'||first.id!==slug||first.action!=='upsert'||!first.data||first.data.format!=='sync-project/v1')fail('ProtocolCorrupt');try{const checked=syncPlanProjectOperation_({operationId,baseVersion:first.baseVersion,project:first.data.record});if(syncCommitCanonical_(checked.changes[0])!==syncCommitCanonical_(first))fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}if(data.publishesRoute){const r=data.request.changes[1],d=data.request.changes[2];if(first.baseVersion!==null||!fields(r,['collection','id','baseVersion','action','data'])||r.collection!=='settings'||r.id!==routeId(slug)||r.baseVersion!==null||r.action!=='upsert'||!fields(d,['collection','id','baseVersion','action','data'])||d.collection!=='settings'||d.id!==directoryId||d.action!=='upsert'||!contains(directoryData(d.data),slug))fail('ProtocolCorrupt');routeData(r.data,slug);}return data;}
 function savedPlan(input,operationId,prepare){const fingerprint=hash(input),key=hash([scope.principalId,operationId]),id='project-plan:'+key;let entity=unwrap(protocol.read('settings',id)).entity;if(!entity){const data={format:'sync-project-plan/v1',fingerprint,...prepare()};planData(data,fingerprint,operationId);const reservation={operationId:'project-reserve-'+key,changes:[upsert('settings',id,null,data)]};if(typeof store.preflightWrites==='function'){const seq=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,seq+1),...syncCommitWriteBudget_(data.request,scope.principalId,seq+2)]).available)fail('ProtocolUnavailable');}if(unwrap(protocol.execute(reservation)).status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',id)).entity;}if(!entity||entity.deleted)fail('ProtocolCorrupt');return planData(entity.data,fingerprint,operationId);}
 function execute(plan){const slug=plan.slug,descriptor=contains(directory(),slug)?route(slug):plan.publishesRoute?plan.request.changes[1].data:null;if(!descriptor)fail('ProtocolCorrupt');checkSource(slug,descriptor,source.read(slug));unwrap(protocol.recover());const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');if(!contains(directory(),slug))fail('ProtocolCorrupt');const published=route(slug);if(published.sourceDigest!==descriptor.sourceDigest||published.legacyVersion!==descriptor.legacyVersion)fail('ProtocolCorrupt');checkSource(slug,published,source.read(slug));const value=unwrap(writer.read(slug));return {...value.project,updatedAt:value.version};}
 function readAll(){const index=directory(),rows=source.readRows();if(!Array.isArray(rows))fail('ProtocolCorrupt');const replacements=new Map();for(const slug of index.slugs){const descriptor=route(slug);checkSource(slug,descriptor,rows.filter(row=>row.slug===slug));const value=unwrap(writer.read(slug));if(value.version===null)fail('ProtocolCorrupt');replacements.set(slug,value.project?{...value.project,updatedAt:value.version}:null);}const out=[];for(const row of rows){if(replacements.has(row.slug)){const replacement=replacements.get(row.slug);if(replacement)out.push(replacement);replacements.delete(row.slug);}else out.push(row);}for(const row of replacements.values())if(row)out.push(row);return out;}
 function convertProjectToTag(input){
  if(!fields(input,['slug','tag','signature'])||typeof input.signature!=='string'||input.signature.length>200000)fail('DataError');
  let slug,tag;try{slug=slug_(input.slug);tag=normaliseTags_(input.tag||input.slug);}catch(ignore){fail('DataError');}if(!tag||tag.includes(','))fail('DataError');
  const entryStatus=(ENTRY_ROUTING_CONTROLLER?ENTRY_ROUTING_CONTROLLER.status():syncEntryRoutingServer_().status());if(!entryStatus.registered||entryStatus.mode!=='active')fail('ProtocolUnavailable');
  const normalized={slug,tag,signature:input.signature},operationId='project-tag-'+hash([scope.principalId,normalized]),fingerprint=hash(normalized),planId='project-tag-plan:'+hash([scope.principalId,operationId]);
  let entity=unwrap(protocol.read('settings',planId)).entity,plan;
  const validPlan=data=>{
   if(!fields(data,['format','fingerprint','operationId','slug','tag','projectDigest','entryDigests','goalsDigest','request','patches','count'])||data.format!=='sync-project-tag-plan/v1'||data.fingerprint!==fingerprint||data.operationId!==operationId||data.slug!==slug||data.tag!==tag||!Array.isArray(data.entryDigests)||data.entryDigests.length>22||!Array.isArray(data.patches)||data.patches.length!==data.entryDigests.length||!Number.isSafeInteger(data.count)||data.count!==data.entryDigests.length||!fields(data.request,['operationId','changes'])||data.request.operationId!==operationId||!Array.isArray(data.request.changes)||data.request.changes.length<1||data.request.changes.length>25||!Array.isArray(data.goalsDigest))fail('ProtocolCorrupt');
   if(data.entryDigests.some(item=>!fields(item,['id','digest'])||!/^[a-zA-Z0-9-]{10,80}$/.test(item.id)||!/^[a-f0-9]{64}$/.test(item.digest))||data.patches.some(item=>!fields(item,['id','projects','tags','scope'])||typeof item.id!=='string'||typeof item.projects!=='string'||typeof item.tags!=='string'||!['personal','project'].includes(item.scope)))fail('ProtocolCorrupt');
   if(!/^[a-f0-9]{64}$/.test(data.projectDigest)||data.goalsDigest.some(item=>!fields(item,['id','updatedAt'])||typeof item.id!=='string'||typeof item.updatedAt!=='string'))fail('ProtocolCorrupt');
   return data;
  };
  if(entity){if(entity.deleted)fail('ProtocolCorrupt');plan=validPlan(entity.data);}
  else{
   let index=directory(),project=current(slug,index);if(!project)fail('DataError');const projectLegacy=rawOne(slug),projectRoute=contains(index,slug)?route(slug):null;
   const allEntries=entryGateway.readRows();if(!Array.isArray(allEntries))fail('ProtocolCorrupt');
   const hidden=entrySource.readRows().filter(entry=>String(entry.requestId||'').startsWith('page-pending-')&&String(entry.projects||'').split(',').includes(slug));if(hidden.length)fail('CommitBlocked');
   const entries=allEntries.filter(entry=>String(entry.projects||'').split(',').includes(slug)).sort((a,b)=>a.id.localeCompare(b.id));
   const catalog=catalogCommitGateway_(),goals=(catalog?catalog.readRows('goals'):rows_(db_().getSheetByName('Goals'),GOAL_HEADERS)).filter(goal=>goal.project===slug).sort((a,b)=>a.id.localeCompare(b.id));if(goals.length)fail('ProtocolUnavailable');
   const prepareOperation='ptag-mig-'+hash([scope.principalId,slug,hash(projectLegacy)]),preparedBefore=store.readReceipt(scope.principalId,prepareOperation)!==null||store.findCommitByOperation(scope.principalId,prepareOperation)!==null,signatureProject=preparedBefore&&projectLegacy?{...project,updatedAt:projectLegacy.updatedAt||''}:project;
   const signature=projectTagSignature_(signatureProject,entries,goals);if(signature!==input.signature)fail('ConflictError');
   if(!projectRoute){
    if(!projectLegacy||index.slugs.length>=128)fail('ProtocolUnavailable');
    const migration=savedPlan({slug,expected:projectLegacy},prepareOperation,()=>{const currentIndex=directory();if(hash(rawOne(slug))!==hash(projectLegacy)||contains(currentIndex,slug)||unwrap(writer.read(slug)).version!==null||unwrap(protocol.read('settings',routeId(slug))).entity)fail('CommitBlocked');const slugs=[...currentIndex.slugs,slug].sort(),operation=syncPlanProjectOperation_({operationId:prepareOperation,baseVersion:null,project:snapshot(projectLegacy)}).changes[0],request={operationId:prepareOperation,changes:[operation,upsert('settings',routeId(slug),null,{format:'sync-project-route/v1',slug,sourceDigest:hash(projectLegacy),legacyVersion:projectLegacy.updatedAt||''}),upsert('settings',directoryId,currentIndex.version,{format:'sync-project-routing/v1',slugs})]};return {slug,legacy:projectLegacy,publishesRoute:true,request};});execute(migration);index=directory();project=current(slug,index);
   }
   const changes=[],patches=[],entryDigests=[];
   for(const entry of entries){
    const preview=entryGateway.preview(entry.id);if(!preview.entry||preview.entry.updatedAt!==entry.updatedAt)fail('ConflictError');
    const projects=entry.projects.split(',').filter(value=>value!==slug).join(','),tags=normaliseTags_([entry.tags,tag].filter(Boolean).join(',')),next=Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,entry[key]||'']));next.projects=projects;next.tags=tags;next.scope=projects?'project':'personal';
    const baseVersion=preview.migrated?entry.updatedAt:null;changes.push(...syncPlanEntryOperation_({operationId,baseVersion,entry:next}).changes);patches.push({id:entry.id,projects,tags,scope:next.scope});
    const legacy=preview.legacy;if(!legacy)fail('CommitBlocked');entryDigests.push({id:entry.id,digest:hash(legacy)});
    if(!preview.migrated){
     const schedules=entrySource.readSchedule(entry.id);if(!Array.isArray(schedules)||schedules.length>1)fail('CommitBlocked');const prior=schedules[0]||null,schedule={date:prior?.date||'',workStart:prior?.workStart||'',workEnd:prior?.workEnd||'',importance:prior?.importance||'normal'};try{taskSchedule_({plannedDate:schedule.date,workStart:schedule.workStart,workEnd:schedule.workEnd,importance:schedule.importance});}catch(ignore){fail('CommitBlocked');}
     const content=entrySource.latestContent(entry.id),layout=entrySource.latestLayout(entry.id);const descriptor={format:'sync-entry-route/v1',id:entry.id,sourceDigest:hash(legacy),legacyVersion:legacy.updatedAt,scheduleDigest:hash(prior),schedule,content:content?{version:content.version,digest:hash(content)}:null,layout:layout?.position??null};changes.push(upsert('settings','entry-route:'+hash(entry.id),null,descriptor));
    }
   }
   changes.push({collection:'projects',id:slug,baseVersion:project.updatedAt,action:'delete'});
   if(changes.length>25)fail('ProtocolUnavailable');const request={operationId,changes};if(syncCommitCanonical_(request).length>32768)fail('ProtocolUnavailable');
   plan={format:'sync-project-tag-plan/v1',fingerprint,operationId,slug,tag,projectDigest:hash(projectLegacy),entryDigests,goalsDigest:goals.map(goal=>({id:goal.id,updatedAt:goal.updatedAt||''})),request,patches,count:entries.length};validPlan(plan);
   const reservation={operationId:'ptag-res-'+hash([scope.principalId,operationId]),changes:[upsert('settings',planId,null,plan)]};if(typeof store.preflightWrites==='function'){const sequence=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');}
   if(unwrap(protocol.execute(reservation)).status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',planId)).entity;plan=validPlan(entity.data);
  }
  const committed=store.readReceipt(scope.principalId,operationId)!==null||store.findCommitByOperation(scope.principalId,operationId)!==null;
  if(!committed){
   if(hash(rawOne(slug))!==plan.projectDigest)fail('CommitBlocked');
   const currentGoals=(catalogCommitGateway_()?catalogCommitGateway_().readRows('goals'):rows_(db_().getSheetByName('Goals'),GOAL_HEADERS)).filter(goal=>goal.project===slug).sort((a,b)=>a.id.localeCompare(b.id));if(syncCommitCanonical_(currentGoals.map(goal=>({id:goal.id,updatedAt:goal.updatedAt||''})))!==syncCommitCanonical_(plan.goalsDigest))fail('ConflictError');
   for(const item of plan.entryDigests)if(hash(entryGateway.preview(item.id).legacy)!==item.digest)fail('CommitBlocked');
  }
  const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');const versions=new Map(ack.versions.filter(item=>item.collection==='entries').map(item=>[item.id,item.version]));
  const entryPatches=plan.patches.map(item=>({...item,updatedAt:versions.get(item.id)}));return {delta:true,entries:[],commonIncluded:false,entryPatches,commonRemovals:{projects:[slug]},addedTags:entryPatches.length?[tag]:[],convertedCount:plan.count,operationId};
 }
 return Object.freeze({readRows(){return run(()=>readAll());},
  preview(slug){return run(()=>{slug=slug_(slug);const legacy=rawOne(slug),index=directory();return {slug,legacy,record:legacy?snapshot(legacy):null,migrated:contains(index,slug)};});},
  migrate(input){return run(()=>{
   if(!fields(input,['operationId','slug','expectedLegacy'])||!opValid(input.operationId))fail('DataError');
   let slug;try{slug=slug_(input.slug);}catch(ignore){fail('DataError');}
   const expected=raw(input.expectedLegacy,slug);if(!expected)fail('DataError');
   const plan=savedPlan({slug,expected},input.operationId,()=>{
    const index=directory();if(hash(rawOne(slug))!==hash(expected)||contains(index,slug)||index.slugs.length>=128||unwrap(writer.read(slug)).version!==null||unwrap(protocol.read('settings',routeId(slug))).entity)fail('CommitBlocked');
    const slugs=[...index.slugs,slug].sort(),operation=syncPlanProjectOperation_({operationId:input.operationId,baseVersion:null,project:snapshot(expected)}).changes[0];
    const request={operationId:input.operationId,changes:[operation,upsert('settings',routeId(slug),null,{format:'sync-project-route/v1',slug,sourceDigest:hash(expected),legacyVersion:expected.updatedAt||''}),upsert('settings',directoryId,index.version,{format:'sync-project-routing/v1',slugs})]};
    return {slug,legacy:expected,publishesRoute:true,request};
   });
   execute(plan);return {status:'committed',slug};
  });},
  saveProject(payload){return run(()=>{if(!payload||Object.prototype.toString.call(payload)!=='[object Object]')fail('DataError');let slug,name,description;try{slug=slug_(payload.slug||payload.name);name=text_(payload.name,200);description=String(payload.description||'').trim();}catch(ignore){fail('DataError');}if(!name||description.length>4000||typeof payload.updatedAt!=='undefined'&&typeof payload.updatedAt!=='string')fail('DataError');const record={slug,name,description},version=payload.updatedAt||'',input={slug,name,description,version},operationId='project-edit-'+hash([scope.principalId,input]);if(!opValid(operationId))fail('DataError');const plan=savedPlan(input,operationId,()=>{const index=directory();if(readAll().some(row=>row.slug!==slug&&row.name.toLowerCase()===name.toLowerCase()))fail('DataError');const previous=current(slug,index),legacy=contains(index,slug)?rawOne(slug):previous;if(previous&&!payload.slug)fail('DataError');if(previous&&version!==(previous.updatedAt||''))fail('ConflictError');if(!previous&&version)fail('ConflictError');const publishesRoute=!contains(index,slug);let request;if(publishesRoute){if(index.slugs.length>=128||unwrap(writer.read(slug)).version!==null||unwrap(protocol.read('settings',routeId(slug))).entity)fail('CommitBlocked');const slugs=[...index.slugs,slug].sort(),base=syncPlanProjectOperation_({operationId,baseVersion:null,project:record}).changes[0];request={operationId,changes:[base,upsert('settings',routeId(slug),null,{format:'sync-project-route/v1',slug,sourceDigest:hash(legacy),legacyVersion:legacy?.updatedAt||''}),upsert('settings',directoryId,index.version,{format:'sync-project-routing/v1',slugs})]};}else{const descriptor=route(slug),baseVersion=version===descriptor.legacyVersion&&previous?.updatedAt===descriptor.version?descriptor.version:version;request=syncPlanProjectOperation_({operationId,baseVersion,project:record});}return {slug,legacy,request,publishesRoute};});const saved=execute(plan);return ACTIVE_CONTEXT.incrementalCommon===true?{delta:true,entries:[],commonIncluded:false,commonUpserts:{projects:[saved]}}:state_();});},
  convertProjectToTag(input){return run(()=>convertProjectToTag(input));}
 });
}
// Entry routes are keyed by stable ID rather than a bounded global directory:
// an archive can contain far more than 128 notes. Migration and association
// publish together; the legacy row remains a frozen, verifiable preimage.
function syncEntrySheetSource_(){
 return Object.freeze({
  read(id){if(typeof id!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(id))throw Object.assign(Error('DataError'),{name:'DataError'});const sheet=db_().getSheetByName('Entries');return readEntries_(findRows_(sheet,1,'^'+id+'$',true));},
  readRows(){const sheet=db_().getSheetByName('Entries'),count=sheet.getLastRow()-1;return count>0?readEntries_(Array.from({length:count},(_,i)=>i+2)):[];},
  readByRequestId(requestId){const sheet=db_().getSheetByName('Entries');return readEntries_(findRows_(sheet,10,'^'+requestId+'$',true));},
  readFiles(entryId){const sheet=db_().getSheetByName('Files');return findRows_(sheet,2,'^'+entryId+'$',true).map(row=>objectAt_(sheet,row,FILE_HEADERS));},
  readFilesBatch(entryIds){const wanted=new Set(entryIds);return rows_(db_().getSheetByName('Files'),FILE_HEADERS).filter(file=>wanted.has(file.entryId));},
  readSchedule(id){const sheet=db_().getSheetByName('TaskPlans'),found=findRows_(sheet,1,id,false);return found.length?rows_(sheet,PLAN_HEADERS).filter(plan=>plan.entryId===id):[];},
  scheduleRows(){return rows_(db_().getSheetByName('TaskPlans'),PLAN_HEADERS);},
  latestContent(id){return docContentVersion_(id);},
  readContent(id,version){return docContentVersion_(id,version);},
  stageContent(id,content,entry){queueDocWrites_([{e:entry,content}]);},
  stageImportedContent(id,content){storeDocContents_([{id,content}]);},
  latestLayout(id){const sheet=db_().getSheetByName('JournalLayout');if(!sheet)return null;const found=findRows_(sheet,1,id,false);if(found.length>1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});if(!found.length)return null;const row=rows_(sheet,JOURNAL_LAYOUT_HEADERS).find(value=>value.entryId===id);return row?{entryId:row.entryId,position:Number(row.position),updatedAt:row.updatedAt}:null;},
  allocateId(){return Utilities.getUuid();},
  stagePageEntries(entries){const sheet=db_().getSheetByName('Entries'),added=[];for(const entry of entries){const found=findRows_(sheet,10,'^'+entry.requestId+'$',true);if(found.length>1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});if(found.length)continue;added.push(ENTRY_HEADERS.map(key=>String(entry[key]??'')));}if(added.length){append_(sheet,added);ENTRY_SMALL_CACHE=null;}},
  stagePageContents(items){items.forEach(({content})=>{if(content.body.length>100000||/\[(?:BJ|END):/.test(content.body))throw Object.assign(Error('DataError'),{name:'DataError'});validateRich_(content.rich,content.body);});storeDocContents_(items);},
  publishPageContents(items){if(items.length)queueDocWrites_(items.map(({id,content})=>({e:{id},content})));},
  projectSlugs(){const gateway=projectCommitGateway_();return (gateway?gateway.readRows():rows_(db_().getSheetByName('Projects'),PROJECT_HEADERS)).map(project=>project.slug);}
 });
}
function syncEntryMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Voce modificata altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),scope=copy(trustedScope);let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,scope),writer=syncEntryWriter_(nested,scope),unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 for(const method of ['read','readRows','readByRequestId','readFiles','readSchedule','scheduleRows','latestContent','readContent','stageContent','latestLayout','allocateId','stagePageEntries','stagePageContents','publishPageContents','projectSlugs'])if(typeof source?.[method]!=='function')fail('DataError');
 const run=fn=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id),routeId=id=>'entry-route:'+hash(id),upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 function raw(row,id){if(row===null)return null;if(!row||Object.keys(row).some(key=>!ENTRY_HEADERS.includes(key))||row.id!==id)fail('DataError');const value={};for(const key of ENTRY_HEADERS){if(key==='body')continue;const v=row[key]??'';if(typeof v!=='string')fail('DataError');value[key]=v;}try{syncEntrySnapshot_(Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,value[key]])));}catch(ignore){fail('DataError');}if(!value.updatedAt||!Number.isFinite(Date.parse(value.updatedAt)))fail('DataError');return value;}
 function rawOne(id,rows=source.read(id)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?raw(rows[0],id):null;}
 const scheduleHeaders=['date','workStart','workEnd','importance'];
 function scheduleRaw(id,rows=source.readSchedule(id)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');if(!rows.length)return {legacy:null,schedule:{date:'',workStart:'',workEnd:'',importance:'normal'}};const row=rows[0];if(!fields(row,PLAN_HEADERS)||row.entryId!==id||PLAN_HEADERS.some(key=>typeof row[key]!=='string'))fail('DataError');let schedule={date:row.date,workStart:row.workStart,workEnd:row.workEnd,importance:row.importance||'normal'};try{schedule.importance=taskImportance_(schedule.importance);}catch(ignore){fail('DataError');}if(schedule.date&&!validDate_(schedule.date)||schedule.workStart&&!validDate_(schedule.workStart)||schedule.workEnd&&!validDate_(schedule.workEnd)||schedule.workEnd&&!schedule.workStart||schedule.date&&schedule.workStart||schedule.workStart&&schedule.workEnd&&schedule.workEnd<schedule.workStart)fail('DataError');return {legacy:row,schedule};}
 function contentData(content){if(content===null)return null;if(!fields(content,['version','digest'])||typeof content.version!=='string'||!content.version||content.version.length>200||!/^[a-f0-9]{64}$/.test(content.digest))fail('ProtocolCorrupt');return content;}
 function latestContent(id){const content=source.latestContent(id);if(content===null)return null;if(!content||typeof content.version!=='string'||!content.version)fail('DataError');return {version:content.version,digest:hash(content)};}
 function routeData(data,id){const required=['format','id','sourceDigest','legacyVersion','scheduleDigest','schedule','content'],allowed=required.concat('layout','docSync');if(!data||Object.prototype.toString.call(data)!=='[object Object]'||Object.keys(data).some(key=>!allowed.includes(key))||required.some(key=>!Object.prototype.hasOwnProperty.call(data,key))||data.format!=='sync-entry-route/v1'||data.id!==id||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||!/^[a-f0-9]{64}$/.test(data.scheduleDigest)||typeof data.legacyVersion!=='string'||!fields(data.schedule,scheduleHeaders)||scheduleHeaders.some(key=>typeof data.schedule[key]!=='string')||Object.prototype.hasOwnProperty.call(data,'layout')&&data.layout!==null&&(!Number.isFinite(data.layout)||Math.abs(data.layout)>1e12))fail('ProtocolCorrupt');const schedule={...data.schedule};try{schedule.importance=taskImportance_(schedule.importance);}catch(ignore){fail('ProtocolCorrupt');}if(schedule.date&&!validDate_(schedule.date)||schedule.workStart&&!validDate_(schedule.workStart)||schedule.workEnd&&!validDate_(schedule.workEnd)||schedule.workEnd&&!schedule.workStart||schedule.date&&schedule.workStart||schedule.workStart&&schedule.workEnd&&schedule.workEnd<schedule.workStart)fail('ProtocolCorrupt');const content=contentData(data.content),docSync=data.docSync;if(docSync!==undefined&&(!fields(docSync,['version','digest','state'])||Object.keys(docSync).length!==3||typeof docSync.version!=='string'||!/^[a-f0-9]{64}$/.test(docSync.digest)||!['pending','done'].includes(docSync.state)||!content||docSync.version!==content.version||docSync.digest!==content.digest))fail('ProtocolCorrupt');return {...data,schedule,content,layout:data.layout??null};}
 function route(id){const entity=unwrap(protocol.read('settings',routeId(id))).entity;if(!entity)return null;if(entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,id),version:entity.version};}
 function checkSource(id,descriptor,row=rawOne(id)){if(hash(row)!==descriptor.sourceDigest||hash(scheduleRaw(id).legacy)!==descriptor.scheduleDigest)fail('CommitBlocked');const content=contentData(descriptor.content);if(content&&hash(source.readContent(id,content.version))!==content.digest)fail('CommitBlocked');}
 function current(id,row=rawOne(id)){
  const descriptor=route(id),stored=unwrap(writer.read(id));if(!descriptor){if(stored.version!==null)fail('CommitBlocked');if(!row||row.requestId.startsWith('page-pending-'))return null;const schedule=scheduleRaw(id).schedule,layout=source.latestLayout(id)?.position;return {...row,plannedDate:schedule.date,workStart:schedule.workStart,workEnd:schedule.workEnd,importance:schedule.importance,...(Number.isFinite(layout)?{position:layout}:{})};}
  checkSource(id,descriptor,row);if(stored.version===null)fail('ProtocolCorrupt');return stored.entry?{...stored.entry,updatedAt:stored.version,body:'',plannedDate:descriptor.schedule.date,workStart:descriptor.schedule.workStart,workEnd:descriptor.schedule.workEnd,importance:descriptor.schedule.importance,contentVersion:descriptor.content?.version||'',contentDigest:descriptor.content?.digest||'',...(descriptor.layout===null?{}:{position:descriptor.layout})}:null;
 }
 function planData(data,fingerprint,operationId,id){
  if(!fields(data,['format','fingerprint','id','legacy','request'])||data.format!=='sync-entry-plan/v1'||data.fingerprint!==fingerprint||data.id!==id)fail('OperationMismatch');raw(data.legacy,id);
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||request.changes.length!==2)fail('ProtocolCorrupt');
  const [entryChange,routeChange]=request.changes;if(!fields(entryChange,['collection','id','baseVersion','action','data'])||entryChange.collection!=='entries'||entryChange.id!==id||entryChange.action!=='upsert'||!entryChange.data||entryChange.data.format!=='sync-entry/v1'||!fields(routeChange,['collection','id','baseVersion','action','data'])||routeChange.collection!=='settings'||routeChange.id!==routeId(id)||routeChange.action!=='upsert')fail('ProtocolCorrupt');
  try{const normalized=syncPlanEntryOperation_({operationId,baseVersion:entryChange.baseVersion,entry:entryChange.data.record});if(syncCommitCanonical_(normalized.changes[0])!==syncCommitCanonical_(entryChange))fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}
  routeData(routeChange.data,id);return data;
 }
 function savedPlan(input,operationId,id,prepare){const fingerprint=hash(input),key=hash([scope.principalId,operationId]),planId='entry-plan:'+key;let entity=unwrap(protocol.read('settings',planId)).entity;if(!entity){const prepared=prepare(),data={format:'sync-entry-plan/v1',fingerprint,id,...prepared};planData(data,fingerprint,operationId,id);const reservation={operationId:'entry-reserve-'+key,changes:[upsert('settings',planId,null,data)]};if(typeof store.preflightWrites==='function'){const sequence=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(data.request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');}const ack=unwrap(protocol.execute(reservation));if(ack.status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',planId)).entity;}if(!entity||entity.deleted)fail('ProtocolCorrupt');return planData(entity.data,fingerprint,operationId,id);}
 const filesDirectoryId=id=>'entry-files:'+hash(id),fileRecordId=(entryId,fileId)=>'entry-file-'+hash([entryId,fileId]);
 function canonicalFiles(entryId){const directory=unwrap(protocol.read('settings',filesDirectoryId(entryId))).entity;if(!directory)return [];if(directory.deleted)fail('ProtocolCorrupt');const data=directory.data;if(!fields(data,['format','entryId','ids'])||data.format!=='sync-entry-files/v1'||data.entryId!==entryId||!Array.isArray(data.ids)||data.ids.length>128||new Set(data.ids).size!==data.ids.length||syncCommitCanonical_([...data.ids].sort())!==syncCommitCanonical_(data.ids))fail('ProtocolCorrupt');return data.ids.map(id=>{const entity=unwrap(protocol.read('files',id)).entity;if(!entity||entity.deleted||!fields(entity.data,['format','record'])||entity.data.format!=='sync-entry-file/v1')fail('ProtocolCorrupt');const record=entity.data.record;if(!fields(record,FILE_HEADERS)||FILE_HEADERS.some(key=>typeof record[key]!=='string')||record.id!==id||record.entryId!==entryId||!record.fileId||!record.title||!record.url)fail('ProtocolCorrupt');return {...record,updatedAt:entity.version};});}
 function mergeFiles(entryId,legacy,canonical){if(!Array.isArray(legacy)||legacy.length>1000)fail('CommitBlocked');const merged=new Map();for(const file of legacy){if(!fields(file,FILE_HEADERS)||FILE_HEADERS.some(key=>typeof file[key]!=='string')||file.entryId!==entryId||!file.id||!file.fileId)fail('DataError');merged.set(file.fileId,file);}for(const file of canonical)merged.set(file.fileId,file);return [...merged.values()];}
 function readFiles(entryId){if(!validId(entryId)||!current(entryId))fail('DataError');return mergeFiles(entryId,source.readFiles(entryId),canonicalFiles(entryId));}
 function readFilesBatch(entryIds){if(!Array.isArray(entryIds)||new Set(entryIds).size!==entryIds.length||entryIds.some(id=>!validId(id)))fail('DataError');const currentEntries=new Map();for(const id of entryIds){const entry=current(id);if(entry)currentEntries.set(id,entry);}const legacy=typeof source.readFilesBatch==='function'?source.readFilesBatch(entryIds):entryIds.flatMap(id=>source.readFiles(id));if(!Array.isArray(legacy))fail('ProtocolCorrupt');const grouped=new Map(entryIds.map(id=>[id,[]]));for(const file of legacy){if(!file||!grouped.has(file.entryId))fail('DataError');grouped.get(file.entryId).push(file);}const out=[];for(const id of entryIds){if(!currentEntries.has(id))continue;out.push(...mergeFiles(id,grouped.get(id),route(id)?canonicalFiles(id):[]));}return out;}
 function addFile(input){if(!fields(input,['entryId','fileId','title','url'])||!validId(input.entryId)||typeof input.fileId!=='string'||!/^[a-zA-Z0-9_-]{10,200}$/.test(input.fileId)||typeof input.title!=='string'||!input.title.trim()||input.title.length>200||typeof input.url!=='string'||input.url.length>2000||/\s/.test(input.url)||!/^https:\/\/(?:drive\.google\.com|docs\.google\.com)\/(?:file\/d\/|document\/d\/|spreadsheets\/d\/|presentation\/d\/|drawings\/d\/)[a-zA-Z0-9_-]{10,}(?:[/?#].*)?$/.test(input.url)&&!/^https:\/\/drive\.google\.com\/(?:open|uc)\?id=[a-zA-Z0-9_-]{10,}(?:&[^\s]*)?$/.test(input.url))fail('DataError');
  const entry=current(input.entryId);if(!entry||!route(input.entryId))fail('ProtocolUnavailable');const all=readFiles(input.entryId),existing=all.find(file=>file.fileId===input.fileId);if(existing)return existing;
  const id=fileRecordId(input.entryId,input.fileId),operationId='entry-file-op-'+hash([scope.principalId,input.entryId,input.fileId]),directoryKey=filesDirectoryId(input.entryId),planId='entry-file-plan:'+hash([scope.principalId,operationId]),normalized={entryId:input.entryId,fileId:input.fileId,title:input.title.trim(),url:input.url};const fingerprint=hash(normalized);let planEntity=unwrap(protocol.read('settings',planId)).entity,plan;
  if(planEntity){if(planEntity.deleted||!fields(planEntity.data,['format','fingerprint','request','recordId'])||planEntity.data.format!=='sync-entry-file-plan/v1'||planEntity.data.fingerprint!==fingerprint||planEntity.data.recordId!==id)fail('OperationMismatch');plan=planEntity.data;}
  else{const directoryEntity=unwrap(protocol.read('settings',directoryKey)).entity,directory=directoryEntity?directoryEntity.data:{format:'sync-entry-files/v1',entryId:input.entryId,ids:[]};if(directoryEntity?.deleted||!fields(directory,['format','entryId','ids'])||directory.format!=='sync-entry-files/v1'||directory.entryId!==input.entryId||!Array.isArray(directory.ids)||directory.ids.length>=128||directory.ids.includes(id))fail('ProtocolCorrupt');const record={id,entryId:input.entryId,fileId:input.fileId,title:normalized.title,url:normalized.url,addedAt:new Date().toISOString()};const request={operationId,changes:[upsert('files',id,null,{format:'sync-entry-file/v1',record}),upsert('settings',directoryKey,directoryEntity?.version||null,{format:'sync-entry-files/v1',entryId:input.entryId,ids:[...directory.ids,id].sort()})]};if(syncCommitCanonical_(request).length>32768)fail('DataError');plan={format:'sync-entry-file-plan/v1',fingerprint,request,recordId:id};const reservation={operationId:'entry-file-rsv-'+hash([scope.principalId,operationId]),changes:[upsert('settings',planId,null,plan)]};if(typeof store.preflightWrites==='function'){const sequence=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');}const reserved=unwrap(protocol.execute(reservation));if(reserved.status!=='committed')fail('CommitBlocked');plan=unwrap(protocol.read('settings',planId)).entity.data;}
  unwrap(protocol.recover());const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');const saved=canonicalFiles(input.entryId).find(file=>file.id===id);if(!saved)fail('ProtocolCorrupt');return saved;
 }
 function deletePlan(input){if(!(fields(input,['id','updatedAt'])||fields(input,['id','updatedAt','operationId']))||!validId(input.id)||typeof input.updatedAt!=='string'||!input.updatedAt||input.operationId!==undefined&&!validId(input.operationId))fail('DataError');const id=input.id,operationId=input.operationId||'entry-delete-op-'+hash([scope.principalId,id,input.updatedAt]),planId='entry-delete-plan:'+hash([scope.principalId,operationId]),legacyOperationId='entry-delete-op-'+hash([scope.principalId,id,input.updatedAt]),fingerprint=operationId===legacyOperationId?hash({id,updatedAt:input.updatedAt}):hash({id,updatedAt:input.updatedAt,operationId});let entity=unwrap(protocol.read('settings',planId)).entity;if(entity){if(entity.deleted||!fields(entity.data,['format','fingerprint','operationId','id','updatedAt','request'])||entity.data.format!=='sync-entry-delete-plan/v1'||entity.data.fingerprint!==fingerprint||entity.data.operationId!==operationId||entity.data.id!==id||entity.data.updatedAt!==input.updatedAt)fail('OperationMismatch');return {alreadyAbsent:false,id,operationId};}const entry=current(id);if(!entry)return {alreadyAbsent:true,id,operationId};if(entry.updatedAt!==input.updatedAt)fail('ConflictError');if(!route(id))fail('ProtocolUnavailable');const changes=[{collection:'entries',id,baseVersion:entry.updatedAt,action:'delete'}],directoryId=filesDirectoryId(id),directory=unwrap(protocol.read('settings',directoryId)).entity;if(directory&&!directory.deleted)changes.push({collection:'settings',id:directoryId,baseVersion:directory.version,action:'delete'});const request={operationId,changes},plan={format:'sync-entry-delete-plan/v1',fingerprint,operationId,id,updatedAt:input.updatedAt,request},reservation={operationId:'ent-del-rsv-'+hash([scope.principalId,operationId]),changes:[upsert('settings',planId,null,plan)]};if(typeof store.preflightWrites==='function'){const sequence=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');}const ack=unwrap(protocol.execute(reservation));if(ack.status!=='committed')fail('CommitBlocked');return {alreadyAbsent:false,id,operationId};}
 function commitDelete(input){const prepared=deletePlan(input);if(prepared.alreadyAbsent)return {...prepared,deleted:false};const entity=unwrap(protocol.read('settings','entry-delete-plan:'+hash([scope.principalId,prepared.operationId]))).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');const plan=entity.data,changes=plan?.request?.changes,entryChange=Array.isArray(changes)?changes[0]:null;if(!fields(plan,['format','fingerprint','operationId','id','updatedAt','request'])||plan.format!=='sync-entry-delete-plan/v1'||plan.id!==input.id||plan.updatedAt!==input.updatedAt||plan.operationId!==prepared.operationId||plan.fingerprint!==(plan.operationId==='entry-delete-op-'+hash([scope.principalId,plan.id,plan.updatedAt])?hash({id:plan.id,updatedAt:plan.updatedAt}):hash({id:plan.id,updatedAt:plan.updatedAt,operationId:plan.operationId}))||!fields(plan.request,['operationId','changes'])||plan.request.operationId!==plan.operationId||!Array.isArray(changes)||changes.length<1||changes.length>2||!fields(entryChange,['collection','id','baseVersion','action'])||entryChange.collection!=='entries'||entryChange.id!==plan.id||entryChange.baseVersion!==plan.updatedAt||entryChange.action!=='delete')fail('ProtocolCorrupt');if(changes.length===2){const directoryChange=changes[1];if(!fields(directoryChange,['collection','id','baseVersion','action'])||directoryChange.collection!=='settings'||directoryChange.id!==filesDirectoryId(plan.id)||typeof directoryChange.baseVersion!=='string'||directoryChange.action!=='delete')fail('ProtocolCorrupt');}unwrap(protocol.recover());const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');const version=ack.versions.find(item=>item.collection==='entries'&&item.id===plan.id);if(!version?.deleted)fail('ProtocolCorrupt');return {alreadyAbsent:false,id:plan.id,operationId:plan.operationId,deleted:true,updatedAt:version.version,sequence:ack.sequence};}
 function execute(plan){const id=plan.id,descriptor=plan.request.changes[1].data;checkSource(id,descriptor,rawOne(id,source.read(id)));unwrap(protocol.recover());const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');const published=route(id);if(published.sourceDigest!==descriptor.sourceDigest||published.legacyVersion!==descriptor.legacyVersion)fail('ProtocolCorrupt');checkSource(id,published);const stored=unwrap(writer.read(id));return {...stored.entry,updatedAt:stored.version,body:'',plannedDate:published.schedule.date,workStart:published.schedule.workStart,workEnd:published.schedule.workEnd,importance:published.schedule.importance,contentVersion:published.content?.version||'',contentDigest:published.content?.digest||'',...(published.layout===null?{}:{position:published.layout})};}
 function changeMetadata(kind,input){
  const fieldsByKind={projects:['id','updatedAt','projects'],status:['id','updatedAt','status'],tags:['id','updatedAt','tags'],due:['id','updatedAt','due'],schedule:['id','updatedAt','plannedDate','workStart','workEnd','importance'],content:['id','updatedAt','contentVersion','contentDigest','due','plannedDate','workStart','workEnd','importance'],contentTitle:['id','updatedAt','contentVersion','contentDigest','title','due','plannedDate','workStart','workEnd','importance']},keys=fieldsByKind[kind];if(!keys||!fields(input,keys)||!validId(input.id)||typeof input.updatedAt!=='string')fail('DataError');
  let value;if(kind==='schedule'){try{value=taskSchedule_(input);}catch(ignore){fail('DataError');}}else if(kind==='content'||kind==='contentTitle'){try{const content=source.readContent(input.id,input.contentVersion);if(!content||content.version!==input.contentVersion||hash(content)!==input.contentDigest)fail('CommitBlocked');if(kind==='contentTitle'&&(typeof input.title!=='string'||input.title.length>200||!input.title.trim()||content.headerTitle!==input.title))fail('DataError');value={content:{version:input.contentVersion,digest:input.contentDigest},due:String(input.due),schedule:taskSchedule_(input),...(kind==='contentTitle'?{title:input.title}:{})};}catch(error){fail(['CommitBlocked','DataError'].includes(error?.name)?error.name:'DataError');}}else{value=input[keys[2]];if(typeof value!=='string')fail('DataError');}
  if(kind==='projects')value=Array.from(new Set(value.split(',').map(item=>item.trim()).filter(Boolean).map(item=>{try{return slug_(item);}catch(ignore){fail('DataError');}})));
  else if(kind==='tags'){try{value=normaliseTags_(value);}catch(ignore){fail('DataError');}}
  else if(kind==='status'&&!['open','doing','done','cancelled'].includes(value)||kind==='due'&&value&&!validDate_(value))fail('DataError');
  const id=input.id,version=input.updatedAt,inputValue={kind,id,version,value},operationId=(kind==='contentTitle'?'entry-title-':'entry-'+kind+'-')+hash([scope.principalId,inputValue]);
  const plan=savedPlan(inputValue,operationId,id,()=>{const legacy=rawOne(id);if(!legacy)fail('CommitBlocked');const existing=route(id),prior=current(id,legacy);if(!prior)fail('CommitBlocked');if(prior.updatedAt!==version)fail('ConflictError');
   const entry=Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,prior[key]||'']));
   if(kind==='projects'){const known=new Set(source.projectSlugs());if(value.some(slug=>!known.has(slug)&&!prior.projects.split(',').includes(slug)))fail('DataError');entry.projects=value.join(',');entry.scope=value.length?'project':'personal';}
   else if(kind==='tags')entry.tags=value;
   else if(kind==='due'){if(prior.type!=='task')fail('DataError');entry.due=value;}
   else if(kind==='schedule'){if(prior.type!=='task')fail('DataError');}
   else if(kind==='content'||kind==='contentTitle'){if(prior.type==='task'){if(value.due&&!validDate_(value.due))fail('DataError');entry.due=value.due;}else if(value.due)fail('DataError');if(kind==='contentTitle')entry.text=value.title;}
   else {if(prior.type!=='task')fail('DataError');entry.status=value;entry.completedAt=value==='done'?(entry.completedAt||new Date().toISOString()):'';}
   const contentMutation=kind==='content'||kind==='contentTitle',baseVersion=existing?prior.updatedAt:null,change=syncPlanEntryOperation_({operationId,baseVersion,entry}).changes[0],oldSchedule=existing?existing.schedule:scheduleRaw(id).schedule,scheduleDigest=existing?existing.scheduleDigest:hash(scheduleRaw(id).legacy),oldContent=existing?existing.content:latestContent(id),layout=existing?existing.layout:source.latestLayout(id)?.position??null,descriptor={format:'sync-entry-route/v1',id,sourceDigest:hash(legacy),legacyVersion:legacy.updatedAt,scheduleDigest,schedule:kind==='schedule'?value:contentMutation?value.schedule:oldSchedule,content:contentMutation?value.content:oldContent,layout};if(!contentMutation&&existing?.docSync&&descriptor.content?.version===existing.docSync.version&&descriptor.content?.digest===existing.docSync.digest)descriptor.docSync=existing.docSync;
   return {legacy,request:{operationId,changes:[change,upsert('settings',routeId(id),existing?.version||null,descriptor)]}};
  });return execute(plan);
 }
 function setDocSyncState(input){if(!fields(input,['id','contentVersion','contentDigest','state'])||!validId(input.id)||typeof input.contentVersion!=='string'||!input.contentVersion||!/^[a-f0-9]{64}$/.test(input.contentDigest)||!['pending','done'].includes(input.state))fail('DataError');const entity=unwrap(protocol.read('settings',routeId(input.id))).entity;if(!entity||entity.deleted)fail('ProtocolUnavailable');const descriptor=routeData(entity.data,input.id);if(!descriptor.content||descriptor.content.version!==input.contentVersion||descriptor.content.digest!==input.contentDigest)fail('ConflictError');if(descriptor.docSync?.version===input.contentVersion&&descriptor.docSync.digest===input.contentDigest&&(descriptor.docSync.state===input.state||descriptor.docSync.state==='done'&&input.state==='pending'))return descriptor.docSync;const docSync={version:input.contentVersion,digest:input.contentDigest,state:input.state},operationId='entry-docsync-'+hash([scope.principalId,input.id,input.contentVersion,input.contentDigest,input.state]),request={operationId,changes:[upsert('settings',routeId(input.id),entity.version,{...entity.data,docSync})]};unwrap(protocol.recover());const ack=unwrap(protocol.execute(request));if(ack.status==='conflict')fail('ConflictError');const saved=route(input.id);if(saved.docSync?.version!==docSync.version||saved.docSync.digest!==docSync.digest||saved.docSync.state!==(descriptor.docSync?.state==='done'?'done':input.state))fail('ProtocolCorrupt');return saved.docSync;}
 function savePage(input,contentItems,clientRequest){
  if(!fields(input,input.operationId===undefined?['month','blocks']:['month','blocks','operationId'])||input.operationId!==undefined&&!validId(input.operationId)||!/^[0-9]{4}-\d{2}$/.test(input.month)||!validDate_(input.month+'-01')||!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>12||!Array.isArray(contentItems))fail('DataError');
  const clients=new Set(),ids=new Set(),contents=new Map();
  for(const item of contentItems){if(!fields(item,['clientId','content'])||typeof item.clientId!=='string'||contents.has(item.clientId)||!item.content||typeof item.content.body!=='string'||!Array.isArray(item.content.rich))fail('DataError');contents.set(item.clientId,item.content);}
  const normalized=input.blocks.map(block=>{
   const keys=['clientId','id','updatedAt','entry','schedule','contentVersion','contentDigest','position'];if(!fields(block,keys)||!validId(block.clientId)||clients.has(block.clientId)||!(block.id===''||validId(block.id))||typeof block.updatedAt!=='string'||!fields(block.entry,ENTRY_METADATA_HEADERS)||ENTRY_METADATA_HEADERS.some(key=>typeof block.entry[key]!=='string')||!fields(block.schedule,scheduleHeaders)||scheduleHeaders.some(key=>typeof block.schedule[key]!=='string')||typeof block.contentVersion!=='string'||!block.contentVersion||!/^[a-f0-9]{64}$/.test(block.contentDigest)||!Number.isFinite(block.position)||Math.abs(block.position)>1e12)fail('DataError');
   clients.add(block.clientId);if(block.id){if(ids.has(block.id)||block.entry.id!==block.id)fail('DataError');ids.add(block.id);}else if(block.entry.id)fail('DataError');
   const content=contents.get(block.clientId);if(!content||content.version!==block.contentVersion||hash(content)!==block.contentDigest)fail('DataError');
   try{taskSchedule_(block.schedule);syncEntrySnapshot_(Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,key==='id'?(block.id||'pending'):block.entry[key]])));}catch(ignore){if(block.id)fail('DataError');}
   return block;
  });
  if(contents.size!==normalized.length)fail('DataError');
  if(clientRequest!==undefined&&(!input.operationId||!fields(clientRequest,['month','operationId','blocks'])||clientRequest.month!==input.month||clientRequest.operationId!==input.operationId||!Array.isArray(clientRequest.blocks)))fail('DataError');
  const operationId=input.operationId||'entry-page-'+hash(input),key=hash([scope.principalId,operationId]),planId='entry-page-plan:'+key,fingerprint=hash(input),clientFingerprint=clientRequest===undefined?null:hash(clientRequest);let entity=unwrap(protocol.read('settings',planId)).entity,plan;
  if(entity){const keys=['format','fingerprint','operationId','request','items','staged'];if(Object.prototype.hasOwnProperty.call(entity.data||{},'clientFingerprint'))keys.push('clientFingerprint');if(entity.deleted||!fields(entity.data,keys)||entity.data.format!=='sync-entry-page-plan/v1'||entity.data.fingerprint!==fingerprint||entity.data.operationId!==operationId||entity.data.clientFingerprint!==undefined&&entity.data.clientFingerprint!==clientFingerprint)fail('OperationMismatch');plan=entity.data;}
  else{
   const prepared=[],changes=[],staged=[];
   for(const block of normalized){
    let id=block.id||'',legacy=null,existing=null,prior=null,entry;
    if(block.id&&block.updatedAt!==''){id=block.id;legacy=rawOne(id);existing=route(id);prior=current(id,legacy);if(!prior||prior.updatedAt!==block.updatedAt)fail('ConflictError');if(prior.date!==block.entry.date||prior.type!==block.entry.type)fail('DataError');entry={...block.entry,id,createdAt:prior.createdAt,requestId:prior.requestId,completedAt:block.entry.status==='done'?(prior.completedAt||new Date().toISOString()):''};}
    else{
     if(block.entry.requestId!=='page-'+block.clientId)fail('DataError');const pendingRequest='page-pending-'+block.clientId,pending=source.readByRequestId(pendingRequest);if(!Array.isArray(pending)||pending.length>1)fail('CommitBlocked');
     if(pending.length){id=pending[0].id;if(block.id&&block.id!==id)fail('OperationMismatch');legacy=raw(pending[0],id);}else{id=block.id||source.allocateId();if(!validId(id))fail('DataError');if(rawOne(id)||route(id)||unwrap(writer.read(id)).version!==null)fail('ConflictError');const createdAt=new Date().toISOString(),stagedEntry={...block.entry,id,createdAt,updatedAt:createdAt,requestId:pendingRequest,completedAt:block.entry.status==='done'?createdAt:'',body:''};syncEntrySnapshot_(Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,stagedEntry[key]])));source.stagePageEntries([stagedEntry]);legacy=rawOne(id);}
     if(!legacy||legacy.requestId!==pendingRequest)fail('CommitBlocked');ids.add(id);existing=route(id);if(existing||unwrap(writer.read(id)).version!==null)fail('CommitBlocked');entry={...block.entry,id,createdAt:legacy.createdAt,requestId:'page-'+block.clientId,completedAt:block.entry.status==='done'?(legacy.completedAt||new Date().toISOString()):''};prior=null;
    }
    if(entry.projects){const selected=entry.projects.split(',');if(selected.some(slug=>!source.projectSlugs().includes(slug)&&!(prior?.projects||'').split(',').includes(slug)))fail('DataError');}
    syncEntrySnapshot_(entry);
    const schedule=entry.type==='task'?taskSchedule_(block.schedule):{date:'',workStart:'',workEnd:'',importance:'normal'};
    if(entry.type!=='task'&&(schedule.date||schedule.workStart||schedule.workEnd||schedule.importance!=='normal'))fail('DataError');
    const content=contents.get(block.clientId);source.stagePageContents([{id,content}]);staged.push({id,version:content.version,digest:block.contentDigest});
    const scheduleSource=existing?{legacy:null,schedule:existing.schedule}:scheduleRaw(id),sourceDigest=hash(legacy),scheduleDigest=existing?existing.scheduleDigest:hash(scheduleSource.legacy),descriptor={format:'sync-entry-route/v1',id,sourceDigest,legacyVersion:legacy?.updatedAt||'',scheduleDigest,schedule,content:{version:content.version,digest:block.contentDigest},layout:block.position},operation=syncPlanEntryOperation_({operationId,baseVersion:existing?prior.updatedAt:null,entry}).changes[0];
    changes.push(operation,upsert('settings',routeId(id),existing?.version||null,descriptor));prepared.push({clientId:block.clientId,id,contentVersion:content.version,contentDigest:block.contentDigest,position:block.position,legacy,descriptor});
   }
   const request={operationId,changes};if(changes.length>25||syncCommitCanonical_(request).length>32768)fail('DataError');
   plan={format:'sync-entry-page-plan/v1',fingerprint,operationId,request,items:prepared,staged,...(clientFingerprint===null?{}:{clientFingerprint})};
   const reservation={operationId:'entry-page-rsv-'+key,changes:[upsert('settings',planId,null,plan)]};if(typeof store.preflightWrites==='function'){const sequence=unwrap(protocol.recover()).committedThrough;if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');}
   if(unwrap(protocol.execute(reservation)).status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',planId)).entity;plan=entity.data;
  }
  unwrap(protocol.recover());for(const item of plan.items)checkSource(item.id,item.descriptor,rawOne(item.id));const ack=unwrap(protocol.execute(plan.request));if(ack.status==='conflict')fail('ConflictError');
  const out=[];for(const item of plan.items){const entry=current(item.id);if(!entry||entry.contentVersion!==item.contentVersion||entry.contentDigest!==item.contentDigest)fail('ProtocolCorrupt');const content=source.readContent(item.id,item.contentVersion);if(!content||hash(content)!==item.contentDigest)fail('CommitBlocked');out.push({...entry,clientId:item.clientId,position:item.position,body:content.body,rich:writtenRich_(content.rich),excerpt:content.body.slice(0,220),previewRich:previewRuns_(content.rich),editorAutoTitle:content.editorAutoTitle===true,contentLoaded:true});}
  source.publishPageContents(plan.staged.map(item=>({id:item.id,content:source.readContent(item.id,item.version)})));return {delta:true,entries:out,commonIncluded:false};
 }
 return Object.freeze({
  lookupDeleteReceipt(input){
   const request=input?.request,expected=input?.expectedScope;if(!fields(input,['request','expectedScope'])||!fields(request,['id','updatedAt','operationId'])||!validId(request.id)||!validId(request.operationId)||typeof request.updatedAt!=='string'||!request.updatedAt||request.updatedAt.length>200)fail('DataError');
   if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');
   if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{
    const initial=unwrap(protocol.lookupOperationReceipt({operationId:request.operationId})),planId='entry-delete-plan:'+hash([scope.principalId,request.operationId]),entity=unwrap(protocol.read('settings',planId)).entity;if(!entity)return {status:'unknown',operationId:request.operationId};
    const plan=entity.data,legacy='entry-delete-op-'+hash([scope.principalId,request.id,request.updatedAt]),fingerprint=request.operationId===legacy?hash({id:request.id,updatedAt:request.updatedAt}):hash(request);if(entity.deleted||!fields(plan,['format','fingerprint','operationId','id','updatedAt','request'])||plan.format!=='sync-entry-delete-plan/v1')fail('ProtocolCorrupt');if(plan.operationId!==request.operationId||plan.id!==request.id||plan.updatedAt!==request.updatedAt||plan.fingerprint!==fingerprint)fail('OperationMismatch');
    const changes=plan.request?.changes,entry=Array.isArray(changes)?changes[0]:null;if(!fields(plan.request,['operationId','changes'])||plan.request.operationId!==request.operationId||!Array.isArray(changes)||changes.length<1||changes.length>2||!fields(entry,['collection','id','baseVersion','action'])||entry.collection!=='entries'||entry.id!==request.id||entry.baseVersion!==request.updatedAt||entry.action!=='delete')fail('ProtocolCorrupt');
    if(changes.length===2){const directory=changes[1];if(!fields(directory,['collection','id','baseVersion','action'])||directory.collection!=='settings'||directory.id!==filesDirectoryId(request.id)||typeof directory.baseVersion!=='string'||directory.action!=='delete')fail('ProtocolCorrupt');}
    return initial.status==='unknown'?initial:unwrap(protocol.lookupOperationReceipt({operationId:request.operationId,request:plan.request}));
   }finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}
  },
  lookupPageReceipt(input){
   const clientRequest=input?.clientRequest,normalized=input?.page,expectedScope=input?.expectedScope,keys=expectedScope===undefined?['operationId',normalized?'page':'clientRequest']:['operationId','clientRequest','expectedScope'];if(!validId(input?.operationId)||!fields(input,keys)||!(normalized?.operationId===input.operationId||fields(clientRequest,['month','operationId','blocks'])&&clientRequest.operationId===input.operationId&&Array.isArray(clientRequest.blocks)))fail('DataError');
   if(expectedScope!==undefined&&(!fields(expectedScope,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expectedScope.archiveId!==scope.archiveId||expectedScope.principalId!==scope.principalId||expectedScope.epoch!==scope.epoch||expectedScope.protocolVersion!==1||expectedScope.schemaVersion!==1))fail('ScopeChanged');
   if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{
    const initial=unwrap(protocol.lookupOperationReceipt({operationId:input.operationId}));
    const key=hash([scope.principalId,input.operationId]),entity=unwrap(protocol.read('settings','entry-page-plan:'+key)).entity;
    if(!entity)return {status:'unknown',operationId:input.operationId};
    const plan=entity.data,keys=['format','fingerprint','operationId','request','items','staged'];if(Object.prototype.hasOwnProperty.call(plan||{},'clientFingerprint'))keys.push('clientFingerprint');if(entity.deleted||!fields(plan,keys)||plan.format!=='sync-entry-page-plan/v1'||plan.operationId!==input.operationId||!Array.isArray(plan.items)||!Array.isArray(plan.staged)||plan.clientFingerprint!==undefined&&!/^[a-f0-9]{64}$/.test(plan.clientFingerprint))fail('ProtocolCorrupt');
    if(normalized&&plan.fingerprint!==hash(normalized))fail('OperationMismatch');if(clientRequest){if(plan.clientFingerprint===undefined)return {status:'unknown',operationId:input.operationId};if(plan.clientFingerprint!==hash(clientRequest))fail('OperationMismatch');}
    if(initial.status==='unknown')return initial;
    return unwrap(protocol.lookupOperationReceipt({operationId:input.operationId,request:plan.request}));
   }finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}
  },
  preview(id){return run(()=>{if(!validId(id))fail('DataError');const legacy=rawOne(id),entry=current(id,legacy);return {id,legacy,entry,migrated:!!route(id)};});},
  migrate(input){return run(()=>{if(!fields(input,['operationId','id','expectedLegacy'])||!validId(input.operationId)||!validId(input.id))fail('DataError');const id=input.id,expected=raw(input.expectedLegacy,id);if(!expected)fail('DataError');const plan=savedPlan({id,expected},input.operationId,id,()=>{if(hash(rawOne(id))!==hash(expected)||route(id)||unwrap(writer.read(id)).version!==null)fail('CommitBlocked');const taskPlan=scheduleRaw(id),descriptor={format:'sync-entry-route/v1',id,sourceDigest:hash(expected),legacyVersion:expected.updatedAt,scheduleDigest:hash(taskPlan.legacy),schedule:taskPlan.schedule,content:latestContent(id),layout:source.latestLayout(id)?.position??null},entry=Object.fromEntries(ENTRY_METADATA_HEADERS.map(key=>[key,expected[key]])),change=syncPlanEntryOperation_({operationId:input.operationId,baseVersion:null,entry}).changes[0];return {legacy:expected,request:{operationId:input.operationId,changes:[change,upsert('settings',routeId(id),null,descriptor)]}};});if(hash(rawOne(id))!==hash(expected))fail('CommitBlocked');const saved=execute(plan);return {status:'committed',operationId:input.operationId,sequence:Number(saved.updatedAt.slice(7)),versions:[{collection:'entries',id,version:saved.updatedAt,deleted:false}]};});},
  setProjects(input){return run(()=>changeMetadata('projects',input));},
  setStatus(input){return run(()=>changeMetadata('status',input));},
  setTags(input){return run(()=>changeMetadata('tags',input));},
  setDue(input){return run(()=>changeMetadata('due',input));},
  setSchedule(input){return run(()=>changeMetadata('schedule',input));},
  savePage(input,contents,clientRequest){return run(()=>savePage(input,contents,clientRequest));},
  setContent(input,content){return run(()=>{if(!fields(input,['id','updatedAt','contentVersion','contentDigest','due','plannedDate','workStart','workEnd','importance'])||!content||content.version!==input.contentVersion||hash(content)!==input.contentDigest)fail('DataError');const staged=source.readContent(input.id,input.contentVersion);if(staged){if(hash(staged)!==input.contentDigest)fail('CommitBlocked');return changeMetadata('content',input);}const legacy=rawOne(input.id),entry=current(input.id,legacy);if(!entry||entry.updatedAt!==input.updatedAt)fail('ConflictError');source.stageContent(input.id,content,entry);return changeMetadata('content',input);});},
  importContent(input,content){return run(()=>{if(!fields(input,['id','updatedAt','contentVersion','contentDigest','due','plannedDate','workStart','workEnd','importance'])||!content||content.version!==input.contentVersion||hash(content)!==input.contentDigest)fail('DataError');const staged=source.readContent(input.id,input.contentVersion);if(staged){if(hash(staged)!==input.contentDigest)fail('CommitBlocked');return changeMetadata('content',input);}const legacy=rawOne(input.id),entry=current(input.id,legacy);if(!entry||entry.updatedAt!==input.updatedAt)fail('ConflictError');source.stageImportedContent(input.id,content);return changeMetadata('content',input);});},
  importContentAndTitle(input,content){return run(()=>{if(!fields(input,['id','updatedAt','contentVersion','contentDigest','title','due','plannedDate','workStart','workEnd','importance'])||typeof input.title!=='string'||!content||content.headerTitle!==input.title||content.version!==input.contentVersion||hash(content)!==input.contentDigest)fail('DataError');const staged=source.readContent(input.id,input.contentVersion);if(staged){if(hash(staged)!==input.contentDigest)fail('CommitBlocked');return changeMetadata('contentTitle',input);}const legacy=rawOne(input.id),entry=current(input.id,legacy);if(!entry||entry.updatedAt!==input.updatedAt)fail('ConflictError');source.stageImportedContent(input.id,content);return changeMetadata('contentTitle',input);});},
  setDocSyncState(input){return run(()=>setDocSyncState(input));},
  addFile(input){return run(()=>addFile(input));},
  readFiles(id){return run(()=>readFiles(id));},
  readFilesBatch(ids){return run(()=>readFilesBatch(ids));},
  prepareDelete(input){return run(()=>deletePlan(input));},
  commitDelete(input){return run(()=>commitDelete(input));},
  readContent(id){return run(()=>{if(!validId(id))fail('DataError');const entry=current(id);if(!entry?.contentVersion)return null;const value=source.readContent(id,entry.contentVersion);if(!value||hash(value)!==entry.contentDigest)fail('CommitBlocked');return value;});},
  isRouted(id){return run(()=>{if(!validId(id))fail('DataError');current(id);return !!route(id);});},
  read(id){return run(()=>{if(!validId(id))fail('DataError');return current(id);});},
  readRows(){return run(()=>{const rows=source.readRows();if(!Array.isArray(rows))fail('ProtocolCorrupt');const out=[],ids=new Set();for(const row of rows){if(ids.has(row?.id))fail('CommitBlocked');ids.add(row?.id);const legacy=raw(row,row.id),value=current(row.id,legacy);if(value)out.push(value);}return out;})}
 });
}
function syncSettingsPropertiesSource_(){
 return Object.freeze({read(kind){
  const properties=PropertiesService.getScriptProperties();
  if(kind==='reflection')return {dailyReflectionMode:properties.getProperty('DAILY_REFLECTION_MODE')||'essential',version:properties.getProperty('REFLECTION_SETTINGS_VERSION')||''};
  if(kind==='privacy'){let privateTags;try{privateTags=JSON.parse(properties.getProperty('PRIVATE_NOTE_TAGS')||'["privato"]');}catch(ignore){throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});}if(!Array.isArray(privateTags)||privateTags.length>30||privateTags.some(tag=>typeof tag!=='string'))throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});return {privateTags,privacyVersion:properties.getProperty('PRIVATE_NOTE_TAGS_VERSION')||''};}
  throw Object.assign(Error('DataError'),{name:'DataError'});
 }});
}
function syncCatalogMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Catalogo modificato altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),scope=copy(trustedScope);
 let owned=false;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,scope),writer=syncCatalogWriter_(nested,scope);
 const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=fn=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const validOperation=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id)&&!id.startsWith('cat-reserve-');
 const valid=(collection,id)=>['goals','habits'].includes(collection)&&syncCatalogId_(id,collection),token=(collection,id)=>JSON.stringify([collection,id]);
 const directoryId='catalog-routing-v1',routeId=(collection,id)=>'catalog-route:'+hash([collection,id]),upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 for(const method of ['read','readRows','allocate','saveLegacy'])if(typeof source?.[method]!=='function')fail('DataError');
 function raw(row,collection,id){
  if(row===null)return null;const keys=collection==='goals'?GOAL_HEADERS:HABIT_HEADERS;
  if(!fields(row,keys)||keys.some(key=>typeof row[key]!=='string')||row.id!==id)fail('DataError');return row;
 }
 function rawOne(collection,id,rows=source.read(collection,id)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?raw(rows[0],collection,id):null;}
 function snapshot(collection,row){return syncCatalogSnapshot_(collection,Object.fromEntries((collection==='goals'?GOAL_HEADERS:HABIT_HEADERS).filter(key=>key!=='updatedAt').map(key=>[key,row[key]])));}
 function directoryData(data){
  if(!fields(data,['format','entries'])||data.format!=='sync-catalog-routing/v1'||!Array.isArray(data.entries)||data.entries.length>128||data.entries.some(entry=>!fields(entry,['collection','id'])||!valid(entry.collection,entry.id)))fail('ProtocolCorrupt');
  const keys=data.entries.map(entry=>token(entry.collection,entry.id));if(new Set(keys).size!==keys.length||syncCommitCanonical_([...keys].sort())!==syncCommitCanonical_(keys))fail('ProtocolCorrupt');return data;
 }
 function directory(){const entity=unwrap(protocol.read('settings',directoryId)).entity;if(!entity)return {entries:[],version:null};if(entity.deleted)fail('ProtocolCorrupt');return {...directoryData(entity.data),version:entity.version};}
 const contains=(index,collection,id)=>index.entries.some(entry=>entry.collection===collection&&entry.id===id);
 function routeData(data,collection,id){if(!fields(data,['format','collection','id','sourceDigest','legacyVersion'])||data.format!=='sync-catalog-route/v1'||data.collection!==collection||data.id!==id||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||typeof data.legacyVersion!=='string')fail('ProtocolCorrupt');return data;}
 function route(collection,id){const entity=unwrap(protocol.read('settings',routeId(collection,id))).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,collection,id),version:entity.version};}
 const checkSource=(collection,id,descriptor,rows)=>{if(hash(rawOne(collection,id,rows))!==descriptor.sourceDigest)fail('CommitBlocked');};
 function current(collection,id,index=directory()){
  if(!contains(index,collection,id)){
   if(unwrap(protocol.read('settings',routeId(collection,id))).entity||unwrap(writer.read(collection,id)).version!==null)fail('CommitBlocked');
   return rawOne(collection,id);
  }
  const descriptor=route(collection,id);checkSource(collection,id,descriptor);const value=unwrap(writer.read(collection,id));if(value.version===null)fail('ProtocolCorrupt');return value.record?{...value.record,updatedAt:value.version}:null;
 }
 function readPlan(data,kind,fingerprint,operationId){
  if(!fields(data,['format','kind','fingerprint','request','dependency','publishesRoute'])||data.format!=='sync-catalog-plan/v1'||typeof data.publishesRoute!=='boolean')fail('ProtocolCorrupt');
  if(data.kind!==kind||data.fingerprint!==fingerprint)fail('OperationMismatch');
  if(data.dependency!==null&&(!fields(data.dependency,['id','digest'])||!syncCatalogId_(data.dependency.id,'goals')||!/^[a-f0-9]{64}$/.test(data.dependency.digest)))fail('ProtocolCorrupt');
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||request.changes.length!==(data.publishesRoute?3:1)||kind==='migrate'&&!data.publishesRoute)fail('ProtocolCorrupt');
  const first=request.changes[0];if(!fields(first,['collection','id','baseVersion','action','data'])||!valid(first.collection,first.id)||first.action!=='upsert'||!fields(first.data,['format','record'])||first.data.format!==(first.collection==='goals'?'sync-goal/v1':'sync-habit/v1'))fail('ProtocolCorrupt');
  try{const planned=syncPlanCatalogOperation_({operationId,changes:[{collection:first.collection,id:first.id,baseVersion:first.baseVersion,record:first.data.record}]});if(syncCommitCanonical_(planned.changes[0])!==syncCommitCanonical_(first))fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}
  if(kind!=='migrate'&&first.collection!==(kind==='goal'?'goals':'habits')||kind==='habit'&&data.dependency?.id!==first.data.record.goalId||kind!=='habit'&&data.dependency!==null)fail('ProtocolCorrupt');
  if(data.publishesRoute){
   const r=request.changes[1],d=request.changes[2];
   if(first.baseVersion!==null||!fields(r,['collection','id','baseVersion','action','data'])||r.collection!=='settings'||r.id!==routeId(first.collection,first.id)||r.action!=='upsert'||r.baseVersion!==null||!fields(d,['collection','id','baseVersion','action','data'])||d.collection!=='settings'||d.id!==directoryId||d.action!=='upsert')fail('ProtocolCorrupt');
   routeData(r.data,first.collection,first.id);if(!contains(directoryData(d.data),first.collection,first.id))fail('ProtocolCorrupt');
  }
  return data;
 }
 function savedPlan(kind,input,operationId,prepare){
  const fingerprint=hash({kind,input}),key=hash([scope.principalId,operationId]),id='catalog-plan:'+key;let entity=unwrap(protocol.read('settings',id)).entity;
  if(!entity){
   const data={format:'sync-catalog-plan/v1',kind,fingerprint,...prepare()};readPlan(data,kind,fingerprint,operationId);
   const reservation={operationId:'cat-reserve-'+key,changes:[upsert('settings',id,null,data)]};
   if(typeof store.preflightWrites==='function'){
    const sequence=unwrap(protocol.recover()).committedThrough;
    if(!store.preflightWrites([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(data.request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');
   }
   if(unwrap(protocol.execute(reservation)).status!=='committed')fail('CommitBlocked');entity=unwrap(protocol.read('settings',id)).entity;
  }
  if(!entity||entity.deleted)fail('ProtocolCorrupt');return readPlan(entity.data,kind,fingerprint,operationId);
 }
 function routedRequest(operationId,collection,id,record,index,legacy){
  if(index.entries.length>=128||contains(index,collection,id)||unwrap(protocol.read('settings',routeId(collection,id))).entity||unwrap(writer.read(collection,id)).version!==null)fail('CommitBlocked');
  const entries=[...index.entries,{collection,id}].sort((a,b)=>token(a.collection,a.id)<token(b.collection,b.id)?-1:1);
  return {operationId,changes:[syncPlanCatalogOperation_({operationId,changes:[{collection,id,baseVersion:null,record}]}).changes[0],upsert('settings',routeId(collection,id),null,{format:'sync-catalog-route/v1',collection,id,sourceDigest:hash(legacy),legacyVersion:legacy?.updatedAt||''}),upsert('settings',directoryId,index.version,{format:'sync-catalog-routing/v1',entries})]};
 }
 function execute(plan){
  const first=plan.request.changes[0],{collection,id}=first,index=directory(),descriptor=contains(index,collection,id)?route(collection,id):plan.publishesRoute?plan.request.changes[1].data:null;
  if(!descriptor)fail('ProtocolCorrupt');checkSource(collection,id,descriptor);
  unwrap(protocol.recover());const done=store.readReceipt(scope.principalId,plan.request.operationId)!==null||store.findCommitByOperation(scope.principalId,plan.request.operationId)!==null;
  if(!done&&plan.dependency&&hash(current('goals',plan.dependency.id))!==plan.dependency.digest)fail('CommitBlocked');
  const result=unwrap(protocol.execute(plan.request));if(result.status==='conflict')fail('ConflictError');
  if(!contains(directory(),collection,id))fail('ProtocolCorrupt');const published=route(collection,id);if(published.sourceDigest!==descriptor.sourceDigest||published.legacyVersion!==descriptor.legacyVersion)fail('ProtocolCorrupt');checkSource(collection,id,published);
  return {...result,scope:copy(scope)};
 }
 const settingId=kind=>'app-setting-v1:'+kind;
 function settingRecord(kind,record,errorName='ProtocolCorrupt'){
  if(kind==='reflection'&&fields(record,['dailyReflectionMode'])&&['essential','detailed'].includes(record.dailyReflectionMode))return {dailyReflectionMode:record.dailyReflectionMode};
  if(kind==='privacy'&&fields(record,['privateTags'])&&Array.isArray(record.privateTags)&&record.privateTags.length<=30&&record.privateTags.every(tag=>typeof tag==='string'&&tag.length<=100)&&new Set(record.privateTags).size===record.privateTags.length)return {privateTags:record.privateTags};
  fail(errorName);
 }
 function settingCurrent(kind){
  if(!['reflection','privacy'].includes(kind))fail('DataError');if(typeof source.readSetting!=='function')fail('ProtocolUnavailable');const entity=unwrap(protocol.read('settings',settingId(kind))).entity;
  if(!entity){const legacy=source.readSetting(kind),record=kind==='reflection'?{dailyReflectionMode:legacy.dailyReflectionMode}:{privateTags:legacy.privateTags};return {record:settingRecord(kind,record),version:kind==='reflection'?legacy.version:legacy.privacyVersion,legacy:true};}
  if(entity.deleted||!fields(entity.data,['format','kind','record'])||entity.data.format!=='sync-app-setting/v1'||entity.data.kind!==kind)fail('ProtocolCorrupt');
  return {record:settingRecord(kind,entity.data.record),version:entity.version,legacy:false};
 }
 function settingResult(kind,record,version){return kind==='reflection'?{...record,version}:{...record,privacyVersion:version};}
 return Object.freeze({
  preview(collection,id){return run(()=>{if(!valid(collection,id))fail('DataError');const legacy=rawOne(collection,id);return {collection,id,legacy,record:legacy?snapshot(collection,legacy):null,migrated:contains(directory(),collection,id)};});},
  migrate(input){return run(()=>{
   if(!fields(input,['operationId','collection','id','expectedLegacy'])||!validOperation(input.operationId)||!valid(input.collection,input.id))fail('DataError');
   const expected=raw(input.expectedLegacy,input.collection,input.id);if(!expected)fail('DataError');
   const plan=savedPlan('migrate',{collection:input.collection,id:input.id,expected},input.operationId,()=>{
    if(hash(rawOne(input.collection,input.id))!==hash(expected))fail('CommitBlocked');return {publishesRoute:true,dependency:null,request:routedRequest(input.operationId,input.collection,input.id,snapshot(input.collection,expected),directory(),expected)};
   });return execute(plan);
  });},
  saveLegacy(kind,payload){return run(()=>{
   const input=syncCatalogEditInput_(kind,payload),collection=kind==='goal'?'goals':'habits';
   if(!input.id&&!input.requestId)fail('ProtocolUnavailable');
   const operationId=payload.operationId===undefined?(input.id?'cat-edit-'+hash([kind,input]):'cat-create-'+hash([kind,input.requestId])):payload.operationId;if(!validOperation(operationId))fail('DataError');
   const index=directory();
   if(input.id&&!contains(index,collection,input.id)){
    const previous=current(collection,input.id,index);
    if(previous){const goal=kind==='habit'?current('goals',input.goalId):null;const record=source.saveLegacy(kind,payload,previous,goal);return {delta:true,entries:[],commonIncluded:false,commonUpserts:{[collection]:[record]}};}
   }
   const plan=savedPlan(kind,input,operationId,()=>{
    const index=directory(),previous=input.id?current(collection,input.id,index):null,goal=kind==='habit'?current('goals',input.goalId,index):null;
    const allocation=source.allocate(kind,input,previous),prepared=syncPrepareCatalogEdit_(kind,payload,previous,goal,allocation),id=prepared.record.id;
    const publishesRoute=!contains(index,collection,id);let request;
    if(publishesRoute){if(rawOne(collection,id)!==null)fail('CommitBlocked');request=routedRequest(operationId,collection,id,prepared.record,index,null);}
    else{
     const descriptor=route(collection,id),baseVersion=input.version===descriptor.legacyVersion&&previous?.updatedAt===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(input.version)?input.version:null;
     request=syncPlanCatalogOperation_({operationId,changes:[{collection,id,baseVersion,record:prepared.record}]});
    }
    return {publishesRoute,dependency:prepared.dependency?{id:prepared.dependency.id,digest:hash(prepared.dependency)}:null,request};
   });
   const ack=execute(plan),first=plan.request.changes[0],record={...first.data.record,updatedAt:ack.versions.find(version=>version.collection===collection&&version.id===first.id).version};
   return {delta:true,entries:[],commonIncluded:false,commonUpserts:{[collection]:[record]}};
  });},
  readOne(collection,id){return run(()=>{if(!valid(collection,id))fail('DataError');return current(collection,id);});},
  readSetting(kind){return run(()=>{const value=settingCurrent(kind);return settingResult(kind,value.record,value.version);});},
  saveSetting(kind,input){return run(()=>{
   const keys=kind==='reflection'?['dailyReflectionMode','version']:kind==='privacy'?['privateTags','version']:null;if(!keys||!fields(input,keys)||typeof input.version!=='string'||input.version.length>200)fail('DataError');
   const record=settingRecord(kind,kind==='reflection'?{dailyReflectionMode:input.dailyReflectionMode}:{privateTags:input.privateTags},'DataError'),current=settingCurrent(kind);
   if(current.legacy&&input.version!==current.version)fail('ConflictError');
   const baseVersion=current.legacy?null:/^commit-[1-9][0-9]{0,15}$/.test(input.version)?input.version:null;
   const operationId='setting-'+hash([scope.principalId,kind,input.version,record]);if(!validOperation(operationId))fail('DataError');
   const request={operationId,changes:[upsert('settings',settingId(kind),baseVersion,{format:'sync-app-setting/v1',kind,record})]},ack=unwrap(protocol.execute(request));
   if(ack.status==='conflict')fail('ConflictError');const committed=ack.versions.find(item=>item.collection==='settings'&&item.id===settingId(kind));if(!committed||committed.deleted)fail('ProtocolCorrupt');return settingResult(kind,record,committed.version);
  });},
  mapVersion(collection,id,version){return run(()=>{if(!valid(collection,id))fail('DataError');if(typeof version!=='string'||!version)return version??'';const index=directory();if(!contains(index,collection,id))return version;const descriptor=route(collection,id);checkSource(collection,id,descriptor);const current=unwrap(writer.read(collection,id));return current.record&&current.version===descriptor.version&&version===descriptor.legacyVersion?descriptor.version:version;});},
  readRows(collection){return run(()=>{
   if(!['goals','habits'].includes(collection))fail('DataError');const index=directory(),rows=source.readRows(collection);if(!Array.isArray(rows))fail('ProtocolCorrupt');const replacements=new Map();
   for(const entry of index.entries.filter(entry=>entry.collection===collection)){const descriptor=route(collection,entry.id);checkSource(collection,entry.id,descriptor,rows.filter(row=>row.id===entry.id));const value=unwrap(writer.read(collection,entry.id));if(value.version===null)fail('ProtocolCorrupt');replacements.set(entry.id,value.record?{...value.record,updatedAt:value.version}:null);}
   const out=[];for(const row of rows){if(replacements.has(row.id)){const replacement=replacements.get(row.id);if(replacement)out.push(replacement);replacements.delete(row.id);}else out.push(row);}for(const row of replacements.values())if(row)out.push(row);return out;
  });}
 });
}
function syncHabitLogSheetSource_(logs,habits,goals){
 const one=(sheet,headers,id)=>{
  verify_(sheet,headers);const found=findRows_(sheet,1,id,false);
  if(found.length>1)throw Object.assign(Error('CommitBlocked'),{name:'CommitBlocked'});
  if(!found.length)return null;const values=readSheetValues_(sheet.getRange(found[0],1,1,headers.length))[0];return Object.fromEntries(headers.map((key,i)=>[key,values[i]]));
 };
 const read=key=>{const row=one(logs,LOG_HEADERS,key);return row?[row]:[];};
 const readCatalog=key=>{
  const id=key.slice(0,key.lastIndexOf('|')),canonical=gateway=>{const habit=gateway.readOne('habits',id);return {habit,goal:habit?gateway.readOne('goals',habit.goalId):null};};
  let gateway=catalogCommitGateway_();if(gateway)return canonical(gateway);
  const habit=one(habits,HABIT_HEADERS,id),result={habit,goal:habit?one(goals,GOAL_HEADERS,habit.goalId):null};gateway=catalogCommitGateway_();return gateway?canonical(gateway):result;
 };
 return Object.freeze({
  listIdentities(){
   verify_(logs,LOG_HEADERS);const count=logs.getLastRow()-1,items=[];
   for(let offset=0;offset<count;offset+=256){const size=Math.min(256,count-offset),ids=readSheetValues_(logs.getRange(offset+2,1,size,3)),versions=readSheetValues_(logs.getRange(offset+2,5,size,1));
    for(let n=0;n<size;n++){const [key,habitId,date]=ids[n];if(key!==habitId+'|'+date||!syncHabitLogIdentity_(key)||typeof versions[n][0]!=='string')throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});items.push({key,updatedAt:versions[n][0],sourceRow:offset+2+n});}
   }return items;
  },
  readKeys(keys,identities){
   verify_(logs,LOG_HEADERS);if(!Array.isArray(keys)||keys.length>100||new Set(keys).size!==keys.length||!Array.isArray(identities))throw Object.assign(Error('DataError'),{name:'DataError'});
   const last=logs.getLastRow(),positions=new Map();for(const item of identities){if(!item||typeof item.key!=='string'||positions.has(item.key)||!Number.isSafeInteger(item.sourceRow)||item.sourceRow<2||item.sourceRow>last)throw Object.assign(Error('ProtocolCorrupt'),{name:'ProtocolCorrupt'});positions.set(item.key,item.sourceRow);}
   const rows=keys.filter(key=>positions.has(key)).map(key=>({key,row:positions.get(key)})).sort((a,b)=>a.row-b.row),groups=[];
   for(const item of rows){const group=groups[groups.length-1];if(group&&group.length<100&&item.row===group[group.length-1].row+1)group.push(item);else groups.push([item]);}
   const records=[];for(const group of groups){const values=readSheetValues_(logs.getRange(group[0].row,1,group.length,LOG_HEADERS.length));for(let n=0;n<group.length;n++){if(values[n][0]!==group[n].key)throw Object.assign(Error('ScopeChanged'),{name:'ScopeChanged'});records.push(Object.fromEntries(LOG_HEADERS.map((key,j)=>[key,values[n][j]])));}}return records;
  },
  read,readCatalog,
  mapHabitVersion(id,version){const gateway=catalogCommitGateway_();return gateway?gateway.mapVersion('habits',id,version):version;},
  readRows(ranges){
   if(ranges)return commonDateRangesRaw_(logs,LOG_HEADERS,'date',ranges).rows;
   verify_(logs,LOG_HEADERS);const count=logs.getLastRow()-1;
   return count>0?readSheetValues_(logs.getRange(2,1,count,LOG_HEADERS.length)).map(row=>Object.fromEntries(LOG_HEADERS.map((key,i)=>[key,row[i]]))):[];
  },
  saveLegacy(payload){
   const input=syncHabitLogEditInput_(payload),key=input.habitId+'|'+input.date,found=read(key),previous=found[0]||null;
   if((previous?.updatedAt||'')!==input.version)throw Object.assign(Error('Registrazione modificata altrove.'),{name:'ConflictError'});
   const gateway=catalogCommitGateway_(),effective=gateway?{...payload,habitUpdatedAt:gateway.mapVersion('habits',payload.habitId,payload.habitUpdatedAt)}:payload,record=syncPrepareHabitLogEdit_(effective,previous,readCatalog(key)).record;
   record.updatedAt=new Date(Math.max(Date.now(),previous?Date.parse(previous.updatedAt)+1:0)).toISOString();
   ensureHabitHeaders_(logs,true);const rows=findRows_(logs,1,key,false);
   if(rows.length)writeRow_(logs,rows[0],LOG_HEADERS.map(key=>record[key]));else append_(logs,[LOG_HEADERS.map(key=>record[key])]);
   traceMeasure_('flush',()=>SpreadsheetApp.flush());return record;
  }
 });
}
function syncHabitLogMigrationGateway_(store,trustedScope,source){
 const fail=name=>{throw Object.assign(Error(name==='ConflictError'?'Registrazione modificata altrove. Conserva la bozza e aggiorna.':name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const scope=copy(trustedScope),directoryId='habit-log-routing-v1',routingV2Id='habit-log-routing-v2',shardCount=16,shardLimit=128,routeId=key=>'habit-log-route:'+hash(key),shardId=n=>'habit-log-routing-v2-shard:'+n;
 let owned=false,readView=null;
 const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}};
 const protocol=syncCommitProtocol_(nested,scope),writer=syncHabitLogWriter_(nested,scope);
 for(const method of ['read','readRows','saveLegacy','readCatalog'])if(typeof source?.[method]!=='function')fail('DataError');
 const unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=(fn,recoverAfter=true)=>{if(owned)fail('BusyError');try{return copy(store.withLock(()=>{owned=true;try{const value=fn();if(recoverAfter)unwrap(protocol.recover());return value;}finally{owned=false;}}));}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','OperationMismatch','CommitBlocked','ScopeChanged','BusyError','ConflictError','StorageError'].includes(error?.name)?error.name:'StorageError');}};
 const readEntity=(collection,id)=>readView?readView.read(collection,id):unwrap(protocol.read(collection,id));
 const hash=value=>{const digest=store.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const fields=(value,keys)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
 const checkExpectedScope=expected=>{if(!fields(expected,['archiveId','principalId','epoch','protocolVersion','schemaVersion'])||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||expected.protocolVersion!==1||expected.schemaVersion!==1)fail('ScopeChanged');};
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id)&&!id.startsWith('hl-reserve-');
 function rawRecord(row,key){
  if(row===null)return null;
  if(!row||typeof row!=='object'||Object.keys(row).some(key=>!LOG_HEADERS.includes(key))||row.key!==key||row.habitId+'|'+row.date!==key)fail('DataError');
  const record={};for(const key of LOG_HEADERS){const value=row[key];if(typeof value!=='string')fail('DataError');record[key]=value;}return record;
 }
 function rawOne(key,rows=source.read(key)){if(!Array.isArray(rows)||rows.length>1)fail('CommitBlocked');return rows.length?rawRecord(rows[0],key):null;}
 const snapshot=row=>syncHabitLogSnapshot_(Object.fromEntries(LOG_HEADERS.filter(key=>key!=='updatedAt').map(key=>[key,row?.[key]??''])));
 function directoryData(data){
  if(!fields(data,['format','keys'])||data.format!=='sync-habit-log-routing/v1'||!Array.isArray(data.keys)||data.keys.length>128||data.keys.some(key=>typeof key!=='string'||!syncHabitLogIdentity_(key))||new Set(data.keys).size!==data.keys.length||syncCommitCanonical_([...data.keys].sort())!==syncCommitCanonical_(data.keys))fail('ProtocolCorrupt');return data;
 }
 function directory(){const entity=readEntity('settings',directoryId).entity;if(!entity)return {keys:[],version:null,digest:hash(null)};if(entity.deleted)fail('ProtocolCorrupt');directoryData(entity.data);return {...entity.data,version:entity.version,digest:hash(entity.data)};}
 function shardFor(key){return parseInt(hash(key).slice(0,2),16)%shardCount;}
 function rootData(data){if(!fields(data,['format','legacyVersion','legacyDigest','legacyCount','shardMask'])||data.format!=='sync-habit-log-routing/v2'||!(data.legacyVersion===null||typeof data.legacyVersion==='string')||!/^[a-f0-9]{64}$/.test(data.legacyDigest)||!Number.isInteger(data.legacyCount)||data.legacyCount!==128||typeof data.shardMask!=='string'||!new RegExp('^[01]{'+shardCount+'}$').test(data.shardMask)||!data.shardMask.includes('1'))fail('ProtocolCorrupt');return data;}
 function shardData(data,n){if(!fields(data,['format','shard','keys'])||data.format!=='sync-habit-log-shard/v1'||data.shard!==n||!Array.isArray(data.keys)||data.keys.length>shardLimit||data.keys.some(key=>typeof key!=='string'||!syncHabitLogIdentity_(key)||shardFor(key)!==n)||new Set(data.keys).size!==data.keys.length||syncCommitCanonical_([...data.keys].sort())!==syncCommitCanonical_(data.keys))fail('ProtocolCorrupt');return data;}
 function routing(){const legacy=directory(),entity=readEntity('settings',routingV2Id).entity;if(!entity){for(let n=0;n<shardCount;n++)if(readEntity('settings',shardId(n)).entity)fail('ProtocolCorrupt');return {...legacy,root:null,shards:new Map(),legacy};}if(entity.deleted)fail('ProtocolCorrupt');const root=rootData(entity.data);if(root.legacyVersion!==legacy.version||root.legacyDigest!==legacy.digest||root.legacyCount!==legacy.keys.length)fail('ProtocolCorrupt');const shards=new Map(),keys=[...legacy.keys];for(let n=0;n<shardCount;n++){const stored=readEntity('settings',shardId(n)).entity;if(root.shardMask[n]==='1'){if(!stored||stored.deleted)fail('ProtocolCorrupt');const data=shardData(stored.data,n);shards.set(n,{...data,version:stored.version});keys.push(...data.keys);}else if(stored)fail('ProtocolCorrupt');}if(new Set(keys).size!==keys.length)fail('ProtocolCorrupt');return {keys,version:legacy.version,digest:legacy.digest,root:{...root,version:entity.version},shards,legacy};}
 function routeChanges(key,index){const descriptor={format:'sync-habit-log-route/v1',key,sourceDigest:hash(null),legacyVersion:''},changes=[upsert('settings',routeId(key),null,descriptor)];if(!index.root){if(index.keys.length<128){changes.push(upsert('settings',directoryId,index.version,{format:'sync-habit-log-routing/v1',keys:[...index.keys,key].sort()}));return changes;}const n=shardFor(key),data={format:'sync-habit-log-shard/v1',shard:n,keys:[key]},root={format:'sync-habit-log-routing/v2',legacyVersion:index.legacy.version,legacyDigest:index.legacy.digest,legacyCount:index.legacy.keys.length,shardMask:Array.from({length:shardCount},(_,i)=>i===n?'1':'0').join('')};changes.push(upsert('settings',shardId(n),null,data),upsert('settings',routingV2Id,null,root));return changes;}const n=shardFor(key),existing=index.shards.get(n);if(existing&&existing.keys.length>=shardLimit)fail('ProtocolUnavailable');changes.push(upsert('settings',shardId(n),existing?.version||null,{format:'sync-habit-log-shard/v1',shard:n,keys:[...(existing?.keys||[]),key].sort()}));if(!existing){const mask=index.root.shardMask.split('');mask[n]='1';const {version,...rootDataValue}=index.root;changes.push(upsert('settings',routingV2Id,index.root.version,{...rootDataValue,shardMask:mask.join('')}));}return changes;}
 function routeData(data,key){if(!fields(data,['format','key','sourceDigest','legacyVersion'])||data.format!=='sync-habit-log-route/v1'||data.key!==key||!/^[a-f0-9]{64}$/.test(data.sourceDigest)||typeof data.legacyVersion!=='string')fail('ProtocolCorrupt');return data;}
 function route(key){const entity=readEntity('settings',routeId(key)).entity;if(!entity||entity.deleted)fail('ProtocolCorrupt');return {...routeData(entity.data,key),version:entity.version};}
 function checkSource(key,descriptor,rows){if(hash(rawOne(key,rows))!==descriptor.sourceDigest)fail('CommitBlocked');}
 const canonicalRecord=record=>{try{return syncCommitCanonical_(syncHabitLogSnapshot_(record));}catch(ignore){fail('ProtocolCorrupt');}};
 function planValue(data,kind,fingerprint,operationId,key){
   if(!fields(data,['format','kind','fingerprint','catalogDigest','request'])||data.format!=='sync-habit-log-plan/v1')fail('ProtocolCorrupt');
   if(!/^[a-f0-9]{64}$/.test(data.catalogDigest))fail('ProtocolCorrupt');
   if(data.kind!==kind||data.fingerprint!==fingerprint)fail('OperationMismatch');
  const request=data.request;if(!fields(request,['operationId','changes'])||request.operationId!==operationId||!Array.isArray(request.changes)||!((kind==='migrate'||kind==='operation')&&[3,4].includes(request.changes.length)||kind!=='migrate'&&request.changes.length===1))fail('ProtocolCorrupt');
  const change=request.changes[0];if(!fields(change,['collection','id','baseVersion','action','data'])||change.collection!=='habitLogs'||change.id!==key||change.action!=='upsert'||!fields(change.data,['format','record'])||change.data.format!=='sync-habit-log/v1'||canonicalRecord(change.data.record)!==syncCommitCanonical_(change.data.record)||change.data.record.key!==key)fail('ProtocolCorrupt');
  if(request.changes.length===3||request.changes.length===4){
   const r=request.changes[1];if(change.baseVersion!==null||!fields(r,['collection','id','baseVersion','action','data'])||r.collection!=='settings'||r.id!==routeId(key)||r.action!=='upsert'||r.baseVersion!==null)fail('ProtocolCorrupt');routeData(r.data,key);
   if(request.changes.length===3){const d=request.changes[2];if(!fields(d,['collection','id','baseVersion','action','data'])||d.collection!=='settings'||d.action!=='upsert')fail('ProtocolCorrupt');if(d.id===directoryId){if(!directoryData(d.data).keys.includes(key))fail('ProtocolCorrupt');}else if(d.id===shardId(d.data?.shard)){shardData(d.data,d.data.shard);if(!d.data.keys.includes(key))fail('ProtocolCorrupt');}else fail('ProtocolCorrupt');}
   else{const s=request.changes[2],root=request.changes[3];if(!fields(s,['collection','id','baseVersion','action','data'])||s.collection!=='settings'||s.id!==shardId(s.data?.shard)||s.action!=='upsert'||!Number.isInteger(s.data?.shard)||!shardData(s.data,s.data.shard).keys.includes(key)||!fields(root,['collection','id','baseVersion','action','data'])||root.collection!=='settings'||root.id!==routingV2Id||root.action!=='upsert')fail('ProtocolCorrupt');rootData(root.data);if(root.data.shardMask[s.data.shard]!=='1')fail('ProtocolCorrupt');}
  }
  return request;
 }
 function savedPlan(kind,input,operationId,key,prepare){
  const fingerprint=hash({kind,input}),planKey=hash([scope.principalId,operationId]),id='habit-log-plan:'+planKey;
  let entity=readEntity('settings',id).entity;
  if(!entity){
   const prepared=prepare(),data={format:'sync-habit-log-plan/v1',kind,fingerprint,...prepared};planValue(data,kind,fingerprint,operationId,key);if(syncCommitCanonical_(data.request).length>32768)fail('ProtocolUnavailable');
   const reservation={operationId:'hl-reserve-'+planKey,changes:[{collection:'settings',id,baseVersion:null,action:'upsert',data}]};
   if(typeof store.preflightWrites==='function'){
    const sequence=unwrap(protocol.recover()).committedThrough;
    if(!(store.ensureWriteCapacity||store.preflightWrites)([...syncCommitWriteBudget_(reservation,scope.principalId,sequence+1),...syncCommitWriteBudget_(data.request,scope.principalId,sequence+2)]).available)fail('ProtocolUnavailable');
   }
   const reserved=unwrap(protocol.execute(reservation));
   if(reserved.status!=='committed')fail('CommitBlocked');entity=readEntity('settings',id).entity;
  }
  if(!entity||entity.deleted)fail('ProtocolCorrupt');planValue(entity.data,kind,fingerprint,operationId,key);return entity.data;
 }
 const upsert=(collection,id,baseVersion,data)=>({collection,id,baseVersion,action:'upsert',data});
 function commit(request){const result=unwrap(protocol.execute(request));if(result.status==='conflict')fail('ConflictError');return {...result,scope:copy(scope)};}
 const delta=record=>({delta:true,entries:[],commonIncluded:false,commonUpserts:{habitLogs:[record]}});
 function alreadyApplied(request){
  unwrap(protocol.recover());
  return store.readReceipt(scope.principalId,request.operationId)!==null||store.findCommitByOperation(scope.principalId,request.operationId)!==null;
 }
 function executePlan(plan,key){
  if(!alreadyApplied(plan.request)&&hash(source.readCatalog(key))!==plan.catalogDigest)fail('CommitBlocked');
  return commit(plan.request);
 }
 function save(payload){
  const input=syncHabitLogEditInput_(payload),key=input.habitId+'|'+input.date,version=input.version;
  const operationId=payload.operationId===undefined?'habit-log-edit-'+hash(input):payload.operationId;
  if(!validId(operationId))fail('DataError');const index=routing();
  if(!index.keys.includes(key)){
   if(readEntity('settings',routeId(key)).entity!==null||unwrap(writer.read(key)).version!==null)fail('CommitBlocked');
   return source.saveLegacy(payload);
  }
  const descriptor=route(key);checkSource(key,descriptor);
  const plan=savedPlan('edit',input,operationId,key,()=>{
   const current=unwrap(writer.read(key));if(!current.log||current.deleted)fail('CommitBlocked');
   const catalog=source.readCatalog(key),effective=typeof source.mapHabitVersion==='function'?{...payload,habitUpdatedAt:source.mapHabitVersion(input.habitId,payload.habitUpdatedAt)}:payload,prepared=syncPrepareHabitLogEdit_(effective,{...current.log,updatedAt:current.version},catalog);
   const baseVersion=version===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(version)?version:null;
   return {catalogDigest:hash(catalog),request:syncPlanHabitLogOperation_({operationId,baseVersion,log:prepared.record})};
  });
  checkSource(key,descriptor);const ack=executePlan(plan,key);checkSource(key,descriptor);
  return {...plan.request.changes[0].data.record,updatedAt:ack.versions[0].version};
 }
 return Object.freeze({
  saveOperation(input,expectedScope){return run(()=>{
   checkExpectedScope(expectedScope);input=habitLogOperationInput_(input);const key=input.log.key;
   const plan=savedPlan('operation',input,input.operationId,key,()=>{
    const index=routing(),routed=index.keys.includes(key);let current,base;
    if(routed){const descriptor=route(key);checkSource(key,descriptor);current=unwrap(writer.read(key));base=input.baseVersion===descriptor.legacyVersion&&current.version===descriptor.version?descriptor.version:/^commit-[1-9][0-9]{0,15}$/.test(input.baseVersion||'')?input.baseVersion:null;}
    else{if(rawOne(key)!==null||unwrap(writer.read(key)).version!==null)fail('ProtocolUnavailable');if(input.baseVersion!==null)fail('ConflictError');base=null;}
    const catalog=source.readCatalog(key),effective=typeof source.mapHabitVersion==='function'?source.mapHabitVersion(input.log.habitId,input.habitUpdatedAt):input.habitUpdatedAt;
    if(!catalog?.habit||!catalog?.goal||catalog.habit.archived==='yes')fail('ConflictError');let prepared;try{prepared=syncPrepareHabitLogEdit_({habitId:input.log.habitId,date:input.log.date,status:input.log.status,checked:JSON.parse(input.log.checklist).checked,habitUpdatedAt:effective},current?.log?{...current.log,updatedAt:current.version}:null,catalog);}catch(error){if(error?.name==='CommitBlocked')fail('ConflictError');throw error;}
    if(syncCommitCanonical_(prepared.record)!==syncCommitCanonical_(input.log))fail('ConflictError');
    const changes=syncPlanHabitLogOperation_({operationId:input.operationId,baseVersion:base,log:prepared.record}).changes;
    if(!routed)changes.push(...routeChanges(key,index));
    return {catalogDigest:hash(catalog),request:{operationId:input.operationId,changes}};
   });
   const descriptor=plan.request.changes.length>=3?plan.request.changes[1].data:route(key);checkSource(key,descriptor);if(!alreadyApplied(plan.request)&&hash(source.readCatalog(key))!==plan.catalogDigest)fail('ConflictError');const ack=executePlan(plan,key);checkSource(key,descriptor);return {...plan.request.changes[0].data.record,updatedAt:ack.versions[0].version};
  });},
  readOperationState(input){return run(()=>{
   checkExpectedScope(input?.expectedScope);const key=input.key;if(!syncHabitLogIdentity_(key))fail('DataError');let record;
   if(routing().keys.includes(key)){const descriptor=route(key);checkSource(key,descriptor);const current=unwrap(writer.read(key));record=current.log?{...current.log,updatedAt:current.version}:null;}
   else{if(unwrap(writer.read(key)).version!==null)fail('CommitBlocked');record=rawOne(key);}
   return {key,missing:record===null,log:record,catalog:source.readCatalog(key),scope:copy(input.expectedScope)};
  });},
  lookupHabitLogReceipt(input){const request=habitLogOperationInput_(input?.request),expected=input?.expectedScope;checkExpectedScope(expected);return run(()=>{
   const initial=unwrap(protocol.lookupOperationReceipt({operationId:request.operationId})),entity=readEntity('settings','habit-log-plan:'+hash([scope.principalId,request.operationId])).entity;
   if(!entity)return {status:'unknown',operationId:request.operationId,scope:copy(expected)};
   const plan=planValue(entity.data,'operation',hash({kind:'operation',input:request}),request.operationId,request.log.key),receipt=initial.status==='unknown'?initial:unwrap(protocol.lookupOperationReceipt({operationId:request.operationId,request:plan}));
   if(receipt.status!=='committed')return {status:receipt.status,operationId:request.operationId,scope:copy(expected)};
   const versions=receipt.versions.filter(item=>item.collection==='habitLogs'&&item.id===request.log.key&&!item.deleted);if(versions.length!==1||versions[0].version!=='commit-'+receipt.sequence)fail('ProtocolCorrupt');
   return {status:'committed',operationId:request.operationId,id:request.log.key,version:versions[0].version,scope:copy(expected)};
  });},
  preview(key){return run(()=>{
   if(!syncHabitLogIdentity_(key))fail('DataError');const legacy=rawOne(key),catalog=source.readCatalog(key);
   const record=legacy&&legacy.checklist?snapshot(legacy):null;
   return {key,legacy,catalog,record,sourceDigest:hash(legacy),migrated:routing().keys.includes(key)};
  });},
  migrate(input){return run(()=>{
   if(!fields(input,['operationId','key','expectedLegacy','expectedCatalog','record'])||!validId(input.operationId)||!syncHabitLogIdentity_(input.key))fail('DataError');
   const key=input.key,expected=rawRecord(input.expectedLegacy,key),sourceDigest=hash(expected),record=syncHabitLogSnapshot_(input.record);
   if(record.key!==key)fail('DataError');
   if(!expected){
    const empty=syncPrepareHabitLogEdit_({habitId:record.habitId,date:record.date,status:'pending',checked:[]},null,input.expectedCatalog).record;
    if(syncCommitCanonical_(empty)!==syncCommitCanonical_(record))fail('CommitBlocked');
   }else if(!expected.checklist){
    const chosen=JSON.parse(record.checklist),currentSteps=input.expectedCatalog?.habit?habitSteps_(input.expectedCatalog.habit.steps):null;
    if(chosen.checked.length||chosen.steps.length&&syncCommitCanonical_(chosen.steps)!==syncCommitCanonical_(currentSteps))fail('CommitBlocked');
   }
   // An existing historical checklist cannot be rewritten by migration. For a
   // missing legacy checklist, an explicit reviewed snapshot is mandatory.
   if(expected&&(record.status!==expected.status||expected.checklist&&syncCommitCanonical_(record)!==syncCommitCanonical_(snapshot(expected))))fail('CommitBlocked');
   const plan=savedPlan('migrate',{key,expected,catalog:input.expectedCatalog,record},input.operationId,key,()=>{
    if(hash(rawOne(key))!==sourceDigest||hash(source.readCatalog(key))!==hash(input.expectedCatalog))fail('CommitBlocked');
    const index=routing();if(index.keys.includes(key)||unwrap(writer.read(key)).version!==null)fail('CommitBlocked');
    const routeOps=routeChanges(key,index);routeOps[0].data.sourceDigest=sourceDigest;routeOps[0].data.legacyVersion=expected?.updatedAt||'';
    return {catalogDigest:hash(input.expectedCatalog),request:{operationId:input.operationId,changes:[syncPlanHabitLogOperation_({operationId:input.operationId,baseVersion:null,log:record}).changes[0],...routeOps]}};
   });
   if(hash(rawOne(key))!==sourceDigest)fail('CommitBlocked');const ack=executePlan(plan,key);if(hash(rawOne(key))!==sourceDigest)fail('CommitBlocked');return ack;
  });},
  saveLegacy(payload){return run(()=>delta(save(payload)));},
  readSnapshotPage(input){return run(()=>unwrap(protocol.withReadView(view=>{
   if(!input||Object.keys(input).some(key=>!['afterId','limit','cursor'].includes(key))||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>100||input.afterId!==undefined&&(typeof input.afterId!=='string'||input.afterId.length>200))fail('DataError');
   const expected=input.cursor??null;if(expected!==null&&(!fields(expected,['format','archiveId','principalId','epoch','sequence'])||expected.format!=='sync-cursor/v1'||expected.archiveId!==scope.archiveId||expected.principalId!==scope.principalId||expected.epoch!==scope.epoch||!Number.isSafeInteger(expected.sequence)||expected.sequence<0||expected.sequence>view.cursor.sequence))fail('ScopeChanged');
   readView=view;try{
    const index=routing(),legacy=typeof source.listIdentities==='function'?source.listIdentities():source.readRows().map(row=>({key:row.key,updatedAt:row.updatedAt})),identities=new Map(),legacyKeys=new Set();
    if(!Array.isArray(legacy))fail('ProtocolCorrupt');for(const row of legacy){if(!row||!syncHabitLogIdentity_(row.key)||typeof row.updatedAt!=='string'||legacyKeys.has(row.key))fail('ProtocolCorrupt');legacyKeys.add(row.key);identities.set(row.key,{canonical:/^commit-[1-9][0-9]{0,15}$/.test(row.updatedAt),routed:false});}
    for(const key of index.keys){const state=view.metadata('habitLogs',key);if(!state)fail('ProtocolCorrupt');if(state.deleted)identities.delete(key);else identities.set(key,{canonical:true,routed:true});}
    const keys=[...identities.keys()].sort(),eligible=keys.filter(key=>input.afterId===undefined||key>input.afterId),selected=eligible.slice(0,input.limit),rows=typeof source.readKeys==='function'?source.readKeys(selected,legacy):source.readRows().filter(row=>selected.includes(row.key));
    if(!Array.isArray(rows))fail('ProtocolCorrupt');const records=[];
    for(const key of selected){const meta=identities.get(key);if(!meta.routed){const row=rawOne(key,rows.filter(row=>row.key===key));if(!row)fail('ProtocolCorrupt');records.push(row);continue;}
     const descriptor=route(key);checkSource(key,descriptor,rows.filter(row=>row.key===key));const entity=readEntity('habitLogs',key).entity;
     if(!entity||entity.deleted||!fields(entity.data,['format','record'])||entity.data.format!=='sync-habit-log/v1'||canonicalRecord(entity.data.record)!==syncCommitCanonical_(entity.data.record)||entity.data.record.key!==key)fail('ProtocolCorrupt');records.push({...entity.data.record,updatedAt:entity.version});
    }
    const canonical=[...identities.values()].filter(value=>value.canonical).length,hasMore=eligible.length>selected.length;
    return {records,checkpoint:expected??view.cursor,observedCursor:view.cursor,hasMore,nextAfter:hasMore?selected[selected.length-1]:null,coverage:{total:keys.length,canonical,complete:canonical===keys.length}};
   }finally{readView=null;}
  })),false);},
  readRows(ranges=null){return run(()=>{
   if(ranges!==null&&(!Array.isArray(ranges)||!ranges.length||ranges.length>10||ranges.some(range=>!range||typeof range.from!=='string'||typeof range.to!=='string'||!validDate_(range.from)||!validDate_(range.to)||range.from>range.to||(Date.parse(range.to)-Date.parse(range.from))/86400000>400)))fail('DataError');
   const index=routing(),rows=source.readRows(ranges);if(!Array.isArray(rows))fail('ProtocolCorrupt');
   const selected=index.keys.filter(key=>ranges===null||ranges.some(range=>key.slice(-10)>=range.from&&key.slice(-10)<=range.to)),replacements=new Map();
   for(const key of selected){const descriptor=route(key);checkSource(key,descriptor,rows.filter(row=>row.key===key));const current=unwrap(writer.read(key));if(current.version===null)fail('ProtocolCorrupt');replacements.set(key,current.log?{...current.log,updatedAt:current.version}:null);}
   const out=[];for(const row of rows){if(replacements.has(row.key)){const replacement=replacements.get(row.key);if(replacement)out.push(replacement);replacements.delete(row.key);}else out.push(row);}
   for(const row of replacements.values())if(row)out.push(row);return out;
  });}
 });
}
// Persistent, single-archive routing controller. Registration is explicit and
// never provisions tables or identities. The immutable anchor prevents a
// missing/disabled state from silently exposing frozen legacy preimages.
function syncDayRoutingController_(services){return syncRecordRoutingController_(services,'day');}
function syncWeekRoutingController_(services){return syncRecordRoutingController_(services,'week');}
function syncHabitLogRoutingController_(services){return syncRecordRoutingController_(services,'habit-log');}
function syncCatalogRoutingController_(services){return syncRecordRoutingController_(services,'catalog');}
function syncProjectRoutingController_(services){return syncRecordRoutingController_(services,'project');}
function syncEntryRoutingController_(services){return syncRecordRoutingController_(services,'entry');}
function syncRecordRoutingController_(services,domain){
 if(!['day','week','habit-log','catalog','project','entry'].includes(domain))throw Object.assign(Error('DataError'),{name:'DataError'});
 const weekly=domain==='week',logs=domain==='habit-log',catalog=domain==='catalog',projects=domain==='project',entries=domain==='entry',tableName=logs?'HabitLogs':weekly?'Weeks':catalog?'Goals':projects?'Projects':entries?'Entries':'Days',tableId=logs?'habitLogsSheetId':weekly?'weeksSheetId':catalog?'goalsSheetId':projects?'projectsSheetId':entries?'entriesSheetId':'daysSheetId',prefix='SYNC_'+domain.replace(/-/g,'_').toUpperCase()+'_ROUTING_';
 const sheetKeys=logs?[tableId,'indexSheetId','blockSheetId','habitsSheetId','goalsSheetId']:catalog?['goalsSheetId','habitsSheetId','indexSheetId','blockSheetId']:[tableId,'indexSheetId','blockSheetId'];
 const gatewayFactory=logs?syncHabitLogMigrationGateway_:weekly?syncWeekMigrationGateway_:catalog?syncCatalogMigrationGateway_:projects?syncProjectMigrationGateway_:entries?syncEntryMigrationGateway_:syncDayMigrationGateway_,sourceFactory=logs?syncHabitLogSheetSource_:weekly?syncWeekSheetSource_:catalog?syncCatalogSheetSource_:projects?syncProjectSheetSource_:entries?syncEntrySheetSource_:syncDaySheetSource_;
 const fail=(name,reason='')=>{const message=reason==='readOnly'?'Il diario è in sola lettura. Riprova quando le scritture saranno abilitate.':name==='ConflictError'?(logs?'Registrazione':weekly?'Settimana':catalog?'Catalogo':projects?'Progetto':entries?'Voce':'Giornata')+' o configurazione modificata altrove. Conserva la bozza e aggiorna.':name;throw Object.assign(Error(message),{name,...(reason==='readOnly'?{reason}:{})});},copy=value=>JSON.parse(syncCommitCanonical_(value));
 const keys={anchor:prefix+'ANCHOR_V1',a:prefix+'STATE_A_V1',b:prefix+'STATE_B_V1',am:prefix+'MARK_A_V1',bm:prefix+'MARK_B_V1'};
 let owned=false;
 const protect=fn=>{try{return fn();}catch(error){fail(['DataError','ProtocolUnavailable','ProtocolCorrupt','ScopeChanged','BusyError','ConflictError','OperationMismatch','CommitBlocked','StorageError'].includes(error?.name)?error.name:'StorageError',error?.name==='ProtocolUnavailable'&&error.reason==='readOnly'?'readOnly':'');}};
 const locked=fn=>{if(owned)fail('BusyError');return services.withLock(()=>{owned=true;try{return fn();}finally{owned=false;}});};
 const mutation=fn=>{if(services.inRoutingTransaction?.()===true)fail('ProtocolUnavailable');return locked(fn);};
 const hash=value=>{const digest=services.digest(syncCommitCanonical_(value));if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('ProtocolCorrupt');return digest;};
 const seal=value=>({...value,checksum:hash(value)});
 const fields=(value,list)=>value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).length===list.length&&Object.keys(value).every(key=>list.includes(key));
 const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(value);
 const nonempty=value=>typeof value==='string'&&value.length>0&&value.length<=200;
 function parse(raw){try{if(typeof raw!=='string'||raw.length>4096)fail('ProtocolCorrupt');const value=JSON.parse(raw),{checksum,...body}=value;if(hash(body)!==checksum||syncCommitCanonical_(value)!==raw)fail('ProtocolCorrupt');return body;}catch(ignore){fail('ProtocolCorrupt');}}
 const snapshot=()=>{const properties=services.properties.getProperties();if(!properties||Object.prototype.toString.call(properties)!=='[object Object]')fail('StorageError');return properties;};
 const absent=p=>{if(Object.keys(p).some(key=>key.startsWith(prefix)&&!Object.values(keys).includes(key)))fail('ProtocolUnavailable');return Object.values(keys).every(key=>!Object.prototype.hasOwnProperty.call(p,key));};
 function anchorValue(raw,kind=domain){
  const value=parse(raw),primary=kind==='habit-log'?'habitLogsSheetId':kind==='week'?'weeksSheetId':kind==='catalog'?'goalsSheetId':kind==='project'?'projectsSheetId':kind==='entry'?'entriesSheetId':'daysSheetId';
  const required=kind==='habit-log'?[primary,'indexSheetId','blockSheetId','habitsSheetId','goalsSheetId']:kind==='catalog'?['goalsSheetId','habitsSheetId','indexSheetId','blockSheetId']:[primary,'indexSheetId','blockSheetId'];
  if(!fields(value,['format','archive','binding'])||value.format!=='sync-'+kind+'-routing-anchor/v1'||!fields(value.archive,['archiveId','epoch'])||![value.archive.archiveId,value.archive.epoch].every(identifier)||!fields(value.binding,['dbId','rootId',...required])||![value.binding.dbId,value.binding.rootId].every(nonempty))fail('ProtocolCorrupt');
  const ids=required.map(key=>value.binding[key]);if(ids.some(id=>!Number.isSafeInteger(id)||id<0)||new Set(ids).size!==required.length)fail('ProtocolCorrupt');return value;
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
   if(!fields(state,['format','anchorDigest','revision','mode'])||state.format!=='sync-'+domain+'-routing-state/v1'||state.anchorDigest!==hash(anchor)||!Number.isSafeInteger(state.revision)||state.revision<1||state.revision>=Number.MAX_SAFE_INTEGER||String(state.revision)!==parts[1]||hash(state)!==parts[2]||!['active','readOnly'].includes(state.mode))fail('ProtocolCorrupt');
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
  const ids=sheetKeys.map(key=>anchor.binding[key]),tables=ids.map(id=>services.sheet(id,ctx));
  if(tables.some((sheet,i)=>!sheet||sheet.getSheetId()!==ids[i]||sheet.getParent().getId()!==ctx.dbId)||tables[0].getName()!==tableName||logs&&(tables[3].getName()!=='Habits'||tables[4].getName()!=='Goals')||catalog&&(tables[0].getName()!=='Goals'||tables[1].getName()!=='Habits'))fail('ScopeChanged');return tables;
 }
 function peerBinding(anchor,p){
  for(const other of ['day','week','habit-log','catalog','project','entry'].filter(kind=>kind!==domain)){
   const otherPrefix='SYNC_'+other.replace(/-/g,'_').toUpperCase()+'_ROUTING_',raw=p[otherPrefix+'ANCHOR_V1'];
   const allowed=['ANCHOR_V1','STATE_A_V1','STATE_B_V1','MARK_A_V1','MARK_B_V1'].map(key=>otherPrefix+key);
   if(Object.keys(p).some(key=>key.startsWith(otherPrefix)&&!allowed.includes(key)))fail('ProtocolUnavailable');
   if(raw===undefined){if(allowed.some(key=>Object.prototype.hasOwnProperty.call(p,key)))fail('ProtocolUnavailable');continue;}
   const peer=anchorValue(raw,other),shared=['dbId','rootId','indexSheetId','blockSheetId'];
   const own=Object.entries(anchor.binding).filter(([key])=>key.endsWith('SheetId')&&!['indexSheetId','blockSheetId'].includes(key)),peers=Object.entries(peer.binding).filter(([key])=>key.endsWith('SheetId')&&!['indexSheetId','blockSheetId'].includes(key));
   const overlap=own.some(([a,id])=>peers.some(([b,otherId])=>id===otherId&&!(domain==='catalog'&&other==='habit-log'&&a===b&&['goalsSheetId','habitsSheetId'].includes(a))&&!(domain==='habit-log'&&other==='catalog'&&a===b&&['goalsSheetId','habitsSheetId'].includes(a))));
   if(hash(peer.archive)!==hash(anchor.archive)||shared.some(key=>peer.binding[key]!==anchor.binding[key])||overlap)fail('ScopeChanged');
  }
 }
 function load(){
  const p=snapshot();if(absent(p))return null;if(!p[keys.anchor])fail('ProtocolCorrupt');
  const anchor=anchorValue(p[keys.anchor]);peerBinding(anchor,p);const state=current(p,anchor),ctx=context(anchor),tables=sheets(anchor,ctx);return {anchor,state,ctx,tables};
 }
 function check(loaded){
  const fresh=load();if(!fresh||hash(fresh.anchor)!==hash(loaded.anchor)||fresh.state.revision!==loaded.state.revision||fresh.ctx.principalId!==loaded.ctx.principalId)fail('ScopeChanged');return true;
 }
 function binding(loaded){
  const [day,index,blocks,habits,goals]=logs?loaded.tables:catalog?[loaded.tables[0],loaded.tables[2],loaded.tables[3],loaded.tables[1],loaded.tables[0]]:[loaded.tables[0],loaded.tables[1],loaded.tables[2],null,null],scope={archiveId:loaded.ctx.archiveId,epoch:loaded.ctx.epoch,principalId:loaded.ctx.principalId};
  const store=syncSheetsCommitStore_(index,blocks,loaded.anchor.archive,{digest:services.digest,enabled:()=>owned,authorize:()=>check(loaded),maintenanceEnabled:()=>logs&&services.maintenanceEnabled?.()===true,continuousMaintenanceEnabled:()=>logs&&services.maintenanceEnabled?.()===true,checkpointMaintenanceEnabled:()=>services.bootstrapBuildEnabled?.()===true,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}});
  const protocol=syncCommitProtocol_(store,scope);return {store,scope,bootstrap:syncBootstrapCheckpoint_(store,scope,{buildEnabled:()=>services.bootstrapBuildEnabled?.()===true,readEnabled:()=>services.bootstrapReadEnabled?.()===true}),gateway:gatewayFactory(store,scope,logs?sourceFactory(day,habits,goals):catalog?sourceFactory(goals,habits):sourceFactory(day)),checkpoint:()=>{const result=protocol.checkpoint();if(!result.ok)fail(result.error);return result.value;},changes:input=>{const result=protocol.changes(input);if(!result.ok)fail(result.error);return result.value;}};
 }
 function publish(anchor,mode,revision,slot,principalId){
  const state={format:'sync-'+domain+'-routing-state/v1',anchorDigest:hash(anchor),mode,revision},dataKey=keys[slot],markKey=keys[slot+'m'];
  const raw=syncCommitCanonical_(seal(state)),marker='ok:'+revision+':'+hash(state);
  // Only the inactive slot is touched. A crash always retains the latest
  // published slot, or leaves a required anchor with no usable state yet.
  for(const [key,value]of [[markKey,'prepare:'+revision],[dataKey,raw],[markKey,marker]]){
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   services.properties.setProperty(key,value);if(snapshot()[key]!==value)fail('StorageError');if(context(anchor).principalId!==principalId)fail('ScopeChanged');
  }
 }
 const statusOf=loaded=>loaded?{registered:true,protocolVersion:1,mode:loaded.state.mode,revision:loaded.state.revision}:{registered:false,protocolVersion:1};
 const act=(method,args,write=false,migrate=false)=>protect(()=>(write?mutation:locked)(()=>{
  const loaded=load();if(!loaded)fail('ProtocolUnavailable');
  if(write&&loaded.state.mode!=='active')fail('ProtocolUnavailable','readOnly');
  if(migrate&&services.allowMigration?.()!==true)fail('ProtocolUnavailable');
  const bound=binding(loaded),result=method==='changes'?bound.changes(...args):method==='checkpoint'?bound.checkpoint(...args):method.startsWith('bootstrap')?bound.bootstrap[method](...args):bound.gateway[method](...args);check(loaded);return result;
 }));
 const facade=Object.freeze({bootstrapBegin:(...args)=>act('bootstrapBegin',args,true),bootstrapStep:(...args)=>act('bootstrapStep',args,true),bootstrapDiscover:(...args)=>act('bootstrapDiscover',args),bootstrapPage:(...args)=>act('bootstrapPage',args),checkpoint:(...args)=>act('checkpoint',args),changes:(...args)=>act('changes',args),readRows:(...args)=>act('readRows',args),preview:(...args)=>act('preview',args),...(entries?{lookupDeleteReceipt:(...args)=>act('lookupDeleteReceipt',args),lookupPageReceipt:(...args)=>act('lookupPageReceipt',args),read:(...args)=>act('read',args),readContent:(...args)=>act('readContent',args),isRouted:(...args)=>act('isRouted',args),readFiles:(...args)=>act('readFiles',args),readFilesBatch:(...args)=>act('readFilesBatch',args),addFile:(...args)=>act('addFile',args,true),prepareDelete:(...args)=>act('prepareDelete',args,true),commitDelete:(...args)=>act('commitDelete',args,true),setProjects:(...args)=>act('setProjects',args,true),setStatus:(...args)=>act('setStatus',args,true),setTags:(...args)=>act('setTags',args,true),setDue:(...args)=>act('setDue',args,true),setSchedule:(...args)=>act('setSchedule',args,true),setContent:(...args)=>act('setContent',args,true),importContent:(...args)=>act('importContent',args,true),importContentAndTitle:(...args)=>act('importContentAndTitle',args,true),setDocSyncState:(...args)=>act('setDocSyncState',args,true),savePage:(...args)=>act('savePage',args,true)}:{saveLegacy:(...args)=>act('saveLegacy',args,true)}),...(projects?{saveProject:(...args)=>act('saveProject',args,true),convertProjectToTag:(...args)=>act('convertProjectToTag',args,true)}:{}),...(catalog?{readOne:(...args)=>act('readOne',args),mapVersion:(...args)=>act('mapVersion',args),readSetting:(...args)=>act('readSetting',args),saveSetting:(...args)=>act('saveSetting',args,true)}:{}),...(logs?{readSnapshotPage:(...args)=>act('readSnapshotPage',args),saveOperation:(...args)=>act('saveOperation',args,true),lookupHabitLogReceipt:(...args)=>act('lookupHabitLogReceipt',args),readOperationState:(...args)=>act('readOperationState',args)}:{}),...(weekly?{saveOperation:(...args)=>act('saveOperation',args,true),lookupWeekReceipt:(...args)=>act('lookupWeekReceipt',args),readOperationState:(...args)=>act('readOperationState',args)}:{}),...(domain==='day'?{saveOperation:(...args)=>act('saveOperation',args,true),lookupDayReceipt:(...args)=>act('lookupDayReceipt',args),readOperationState:(...args)=>act('readOperationState',args),saveBatch:(...args)=>act('saveBatch',args,true)}:{}),migrate:(...args)=>act('migrate',args,true,true)});
 return Object.freeze({
  resolve:()=>protect(()=>{if(absent(snapshot()))return null;return locked(()=>{load();return facade;});}),
  status:()=>protect(()=>{if(absent(snapshot()))return statusOf(null);return locked(()=>statusOf(load()));}),
  register:input=>protect(()=>mutation(()=>{
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   if(!fields(input,sheetKeys)||Object.values(input).some(id=>!Number.isSafeInteger(id)||id<0)||new Set(Object.values(input)).size!==sheetKeys.length)fail('DataError');
   const ctx=services.context();if(!ctx||ctx.authorized!==true||![ctx.archiveId,ctx.epoch,ctx.principalId].every(identifier)||![ctx.dbId,ctx.rootId].every(nonempty))fail('ScopeChanged');
   const anchor={format:'sync-'+domain+'-routing-anchor/v1',archive:{archiveId:ctx.archiveId,epoch:ctx.epoch},binding:{dbId:ctx.dbId,rootId:ctx.rootId,...copy(input)}};
   const p=snapshot();peerBinding(anchor,p);if(!absent(p)&&!p[keys.anchor])fail('ProtocolCorrupt');
   if(p[keys.anchor]&&hash(anchorValue(p[keys.anchor]))!==hash(anchor))fail('ScopeChanged');
   const tables=sheets(anchor,ctx);if(logs){verify_(tables[0],LOG_HEADERS);verify_(tables[3],HABIT_HEADERS);verify_(tables[4],GOAL_HEADERS);}else if(catalog){verify_(tables[0],GOAL_HEADERS);verify_(tables[1],HABIT_HEADERS);}else if(projects)verify_(tables[0],PROJECT_HEADERS);else if(entries)verify_(tables[0],ENTRY_HEADERS);else if(weekly)verify_(tables[0],WEEK_HEADERS);else ensureDayHeaders_(tables[0]);
   // Check existing provisioned storage before making the anchor required.
   const indexSheet=catalog?tables[2]:tables[1],blockSheet=catalog?tables[3]:tables[2];
   const store=syncSheetsCommitStore_(indexSheet,blockSheet,anchor.archive,{digest:services.digest,enabled:()=>owned,authorize:()=>{if(context(anchor).principalId!==ctx.principalId)fail('ScopeChanged');sheets(anchor,ctx);return true;},withLock:fn=>fn()});
   const recovered=syncCommitProtocol_(store,{archiveId:ctx.archiveId,epoch:ctx.epoch,principalId:ctx.principalId}).recover();if(!recovered.ok)fail(recovered.error);
   if(!p[keys.anchor]){if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');const raw=syncCommitCanonical_(seal(anchor));services.properties.setProperty(keys.anchor,raw);if(snapshot()[keys.anchor]!==raw)fail('StorageError');if(context(anchor).principalId!==ctx.principalId)fail('ScopeChanged');}
   let established=false;try{current(snapshot(),anchor);established=true;}catch(error){if(error.name!=='ProtocolUnavailable')throw error;}
   if(!established)publish(anchor,'readOnly',1,'a',ctx.principalId);return statusOf(load());
  })),
  setMode:input=>protect(()=>mutation(()=>{
   if(services.allowConfigure?.()!==true)fail('ProtocolUnavailable');
   if(!fields(input,['mode','expectedRevision'])||!['active','readOnly'].includes(input.mode)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)fail('DataError');
   if(entries&&input.mode==='active'&&services.allowEntryActivation?.()!==true)fail('ProtocolUnavailable');
   const loaded=load();if(!loaded)fail('ProtocolUnavailable');const state=loaded.state;
   if(state.mode===input.mode&&(state.revision===input.expectedRevision||state.revision===input.expectedRevision+1))return statusOf(loaded);
   if(state.revision!==input.expectedRevision)fail('ConflictError');if(state.revision>=Number.MAX_SAFE_INTEGER-1)fail('ProtocolUnavailable');
   publish(loaded.anchor,input.mode,state.revision+1,state.slot==='a'?'b':'a',loaded.ctx.principalId);return statusOf(load());
  }))
 });
}
function syncDayRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'day');}
function syncWeekRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'week');}
// Server-only opt-in. Never derived from RPC payloads or client capabilities.
function syncHabitLogMaintenanceEnabled_(){return false;}
function syncHabitLogRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'habit-log');}
function syncCatalogRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'catalog');}
function syncProjectRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'project');}
function syncEntryRoutingServer_(permissions={}){return syncRecordRoutingServer_(permissions,'entry');}
function syncRecordRoutingServer_(permissions,domain){
 const properties=PropertiesService.getScriptProperties();
 return syncRecordRoutingController_({properties,digest:text=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join(''),
  allowConfigure:()=>permissions.allowConfigure===true,allowMigration:()=>permissions.allowMigration===true,allowEntryActivation:()=>domain==='entry'&&permissions.allowEntryActivation===true,
  bootstrapBuildEnabled:()=>syncBootstrapCheckpointBuildEnabled_()===true,bootstrapReadEnabled:()=>syncBootstrapCheckpointEnabled_()===true,
  maintenanceEnabled:()=>domain==='habit-log'&&syncHabitLogMaintenanceEnabled_()===true,
  inRoutingTransaction:()=>SYNC_ROUTING_SERVER_LOCK_DEPTH>0,
  withLock(fn){
   if(SYNC_ROUTING_SERVER_LOCK_DEPTH>0)return fn();
   const run=()=>{SYNC_ROUTING_SERVER_LOCK_DEPTH++;try{return fn();}finally{SYNC_ROUTING_SERVER_LOCK_DEPTH--;}};
   if(APP_LOCK_DEPTH>0)return run();
   const lock=LockService.getScriptLock();if(!lock.tryLock(0))throw Object.assign(Error('BusyError'),{name:'BusyError'});
   try{return run();}finally{lock.releaseLock();}
  },
  context(){
   const p=properties.getProperties(),dbId=p.DB_ID,rootId=p.ROOT_ID;
   if(!manifestPrincipal_()||!dbId||!rootId)return {authorized:false};
   const identity=JSON.parse(p['LOCAL_ARCHIVE_V1:'+JSON.stringify([dbId,rootId])]||'null'),principalId=PropertiesService.getUserProperties().getProperty('LOCAL_PRINCIPAL_V1');
   if(!identity||identity.schemaVersion!==1)return {authorized:false};
   const authorized=!DriveApp.getFileById(dbId).isTrashed()&&!DriveApp.getFolderById(rootId).isTrashed();
   return {authorized,dbId,rootId,archiveId:identity.archiveId,epoch:identity.epoch,principalId};
  },
  sheet(id,ctx){const db=SpreadsheetApp.openById(ctx.dbId);if(db.getId()!==ctx.dbId)throw Object.assign(Error('ScopeChanged'),{name:'ScopeChanged'});return db.getSheetById(id);}
 },domain);
}
// Separate, explicit server operation. No bootstrap request invokes the builder.
function syncBootstrapCheckpointEnabled_(){return false;}
function syncBootstrapCheckpointBuildEnabled_(){return false;}
// Physical retention is deliberately a separate server policy. It remains
// unavailable until every dependency class has an audited verifier.
function syncPhysicalRetentionEnabled_(){return false;}
function syncPhysicalRetentionPolicy_(input,services={}){
 const fail=name=>{throw Object.assign(Error(name),{name});},keys=['archiveId','epoch','principalId'];
 if(!input||Object.keys(input).sort().join(',')!=='checkpointDigest,checkpointGeneration,checkpointSequence,scope'||!input.scope||Object.keys(input.scope).sort().join(',')!==keys.slice().sort().join(',')||keys.some(key=>typeof input.scope[key]!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.scope[key]))||typeof input.checkpointGeneration!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.checkpointGeneration)||!Number.isSafeInteger(input.checkpointSequence)||input.checkpointSequence<0||typeof input.checkpointDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.checkpointDigest))fail('DataError');
 const scope={archiveId:input.scope.archiveId,epoch:input.scope.epoch,principalId:input.scope.principalId},enabled=()=>services.enabled?.()===true;
 const blockers=[];
 if(services.scope&&['archiveId','epoch','principalId'].some(key=>services.scope[key]!==scope[key]))fail('ScopeChanged');
 if(!enabled())blockers.push('serverPolicyDisabled');
 // These are independent proofs, not client supplied booleans. Until the
 // ledger has a verifiable inventory for each, the floor must remain zero.
 for(const [key,verify] of [['checkpoint',services.verifyCheckpoint],['receiptWindow',services.verifyReceiptWindow],['operationAliases',services.verifyOperationAliases],['docsBaselines',services.verifyDocsBaselines],['tombstonesAndRoutes',services.verifyTombstonesAndRoutes],['readerLeases',services.verifyReaderLeases],['legacyCoverage',services.verifyLegacyCoverage]])if(typeof verify!=='function'||verify(scope,input)!==true)blockers.push(key+'Unverified');
 const proven=blockers.length===0;
 const core={format:'sync-retention-plan/v1',scope,checkpoint:{generation:input.checkpointGeneration,sequence:input.checkpointSequence,digest:input.checkpointDigest},requestedFloor:input.checkpointSequence,minimumAvailable:proven?input.checkpointSequence:0,eligibleCommits:proven?input.checkpointSequence:0,eligiblePayloads:0,retired:0,blockers};
 return {...core,digest:services.digest?.(syncCommitCanonical_(core))||syncCommitCanonical_(core)};
}
// Durable plan state is separate from the application feed. Approval and the
// retirement/publish adapters are server-owned callbacks; no RPC argument can
// install or enable them. Missing adapters fail closed.
function syncPhysicalRetentionProtocol_(store,trustedScope,services={}){
 const fail=name=>{throw Object.assign(Error(name),{name});},scope={archiveId:trustedScope.archiveId,epoch:trustedScope.epoch,principalId:trustedScope.principalId},id=[scope.principalId,'retention:state'];
 const same=(a,b)=>syncCommitCanonical_(a)===syncCommitCanonical_(b),enabled=()=>services.enabled?.()===true;
 function run(write,fn){if(!enabled())fail('ProtocolUnavailable');return store.withLock(()=>{const get=()=>store.readCheckpoint(id);let state=get();const result=fn(state);if(write){if(!same(get(),state))fail('ConflictError');store.writeCheckpoint(id,result.state);if(!same(get(),result.state))fail('ProtocolCorrupt');}return result.value;});}
 const validPlan=plan=>{if(plan?.format!=='sync-retention-plan/v1'||!same(plan.scope,scope))return false;const {digest,...core}=plan;return digest===store.digest(syncCommitCanonical_(core));};
 return Object.freeze({
  begin(input){return run(true,prior=>{if(!input||Object.keys(input).sort().join(',')!=='checkpointDigest,checkpointGeneration,checkpointSequence')fail('DataError');const plan=syncPhysicalRetentionPolicy_({...input,scope},{...services,scope,digest:store.digest});if(prior){if(prior.format==='sync-retention-state/v1'&&prior.plan?.digest===plan.digest)return {state:prior,value:prior};fail('ConflictError');}const state={format:'sync-retention-state/v1',archive:{archiveId:scope.archiveId,epoch:scope.epoch},scope,revision:0,phase:'planned',plan,completed:0,lastRequest:'begin:'+plan.digest};return {state,value:state};});},
  approve(input){return run(true,state=>{if(!state||state.format!=='sync-retention-state/v1'||!input||Object.keys(input).sort().join(',')!=='expectedRevision'||!Number.isSafeInteger(input.expectedRevision))fail('ConflictError');if(state.phase==='approved'&&input.expectedRevision===state.revision-1)return {state,value:state};if(input.expectedRevision!==state.revision)fail('ConflictError');if(state.phase!=='planned'||!validPlan(state.plan)||state.plan.blockers.length||services.approve?.(state.plan,scope)!==true)fail('ProtocolUnavailable');const next={...state,revision:state.revision+1,phase:'approved',lastRequest:'approve:'+state.revision};return {state:next,value:next};});},
  step(input){return run(true,state=>{if(!state||state.format!=='sync-retention-state/v1'||!input||Object.keys(input).sort().join(',')!=='expectedRevision,limit'||!Number.isSafeInteger(input.expectedRevision)||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>25)fail('ConflictError');if(input.expectedRevision===state.revision-1&&state.lastRequest==='step:'+input.expectedRevision+':'+input.limit)return {state,value:state};if(input.expectedRevision!==state.revision)fail('ConflictError');if(state.phase!=='approved'&&state.phase!=='retiring')fail('ProtocolUnavailable');if(typeof services.retireBatch!=='function'||typeof services.verifyRemainder!=='function'||typeof services.publishMinimum!=='function')fail('ProtocolUnavailable');const result=services.retireBatch({scope,plan:state.plan,after:state.completed,limit:input.limit,idempotencyKey:state.plan.digest+':'+state.completed});if(!result||!Number.isSafeInteger(result.retired)||result.retired<0||result.retired>input.limit||typeof result.done!=='boolean')fail('ProtocolCorrupt');const completed=state.completed+result.retired;if(result.done){if(services.verifyRemainder({scope,plan:state.plan,completed})!==true)fail('ProtocolCorrupt');services.publishMinimum({scope,plan:state.plan,sequence:state.plan.minimumAvailable,idempotencyKey:state.plan.digest+':minimum'});}const next={...state,revision:state.revision+1,phase:result.done?'complete':'retiring',completed,lastRequest:'step:'+input.expectedRevision+':'+input.limit};return {state:next,value:next};});},
  status(){return run(false,state=>({state,value:state||{format:'sync-retention-state/v1',scope,phase:'absent'}}));}
 });
}
function syncBootstrapCheckpointFacade_(){
 for(const create of [syncHabitLogRoutingServer_,syncEntryRoutingServer_,syncDayRoutingServer_,syncWeekRoutingServer_,syncCatalogRoutingServer_,syncProjectRoutingServer_]){const facade=create().resolve();if(facade)return facade;}
 throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});
}
function beginBootstrapCheckpoint_(input){if(!syncBootstrapCheckpointBuildEnabled_())throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});return syncBootstrapCheckpointFacade_().bootstrapBegin(input);}
function stepBootstrapCheckpoint_(input){if(!syncBootstrapCheckpointBuildEnabled_())throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});return syncBootstrapCheckpointFacade_().bootstrapStep(input);}
function getBootstrapCheckpoint(input){if(!syncBootstrapCheckpointEnabled_())throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});return syncBootstrapCheckpointFacade_().bootstrapDiscover(input||{});}
function getBootstrapCheckpointPage(input){if(!syncBootstrapCheckpointEnabled_())throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});return syncBootstrapCheckpointFacade_().bootstrapPage(input);}
function syncBootstrapCheckpoint_(store,trustedScope,services={}){
 const fail=name=>{throw Object.assign(Error(name),{name});},copy=value=>JSON.parse(syncCommitCanonical_(value)),scope=copy(trustedScope),archive={archiveId:scope.archiveId,epoch:scope.epoch};
 const collections=['entries','projects','days','weeks','habitLogs','goals','habits','files','settings','layouts'],formats={entries:'sync-entry/v1',projects:'sync-project/v1',days:'sync-day/v1',weeks:'sync-week/v1',habitLogs:'sync-habit-log/v1',goals:'sync-goal/v1',habits:'sync-habit/v1',files:'sync-entry-file/v1'};
 const same=(a,b)=>syncCommitCanonical_(a)===syncCommitCanonical_(b),hash=value=>store.digest(syncCommitCanonical_(value)),valid=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(id),key=(collection,id)=>JSON.stringify([collection,id]);
 let owned=false,writing=false;const permission=()=>{if((writing?services.buildEnabled?.():services.readEnabled?.())!==true)fail('ProtocolUnavailable');};const nested={...store,withLock(fn){if(!owned)fail('ProtocolUnavailable');return fn();}},protocol=syncCommitProtocol_(nested,scope),unwrap=result=>{if(!result.ok)fail(result.error);return result.value;};
 const run=(write,fn)=>{if((write?services.buildEnabled?.():services.readEnabled?.())!==true)fail('ProtocolUnavailable');if(owned)fail('BusyError');return store.withLock(()=>{owned=true;writing=write;try{const value=fn();permission();return copy(value);}finally{owned=false;writing=false;}});};
 const location=path=>[scope.principalId,'bootstrap:'+path],counts=()=>Object.fromEntries(collections.map(c=>[c,{records:0,live:0,tombstones:0}]));
 function get(path,immutable=false){permission();const raw=store.readCheckpoint(location(path),immutable);if(raw===null)return null;if(raw.format!=='sync-bootstrap-storage/v1'||!same(raw.archive,archive)||!same(raw.scope,scope)||!valid(raw.generation)||(!raw.value||typeof raw.value!=='object'||Array.isArray(raw.value)))fail('ProtocolCorrupt');return raw;}
 function put(path,generation,value,immutable=false){
  if(!writing)fail('ProtocolUnavailable');permission();const raw={format:'sync-bootstrap-storage/v1',archive,scope,generation,value};if(traceBytes_(syncCommitCanonical_(raw))>131072)fail('ProtocolUnavailable');const prior=get(path,immutable);if(prior&&same(prior,raw))return;if(prior&&immutable)fail('ProtocolCorrupt');
  store.writeCheckpoint(location(path),raw,immutable);if(!same(get(path,immutable),raw))fail('ProtocolCorrupt');
 }
 const stateOf=id=>{const raw=get(id+':state');if(!raw||raw.generation!==id)fail('ProtocolCorrupt');const s=raw.value;if(s.format!=='sync-bootstrap-build/v1'||s.generation!==id||!Number.isSafeInteger(s.sequence)||s.sequence<0||!Number.isSafeInteger(s.revision)||s.revision<0||!['replay','emit','verify','done'].includes(s.phase)||!Number.isSafeInteger(s.through)||s.through<0||s.through>s.sequence||!Number.isSafeInteger(s.bucket)||s.bucket<0||s.bucket>64||!Number.isSafeInteger(s.offset)||s.offset<0||s.offset>128||!Number.isSafeInteger(s.pages)||s.pages<0||s.pages>8192||!Number.isSafeInteger(s.records)||s.records<0||s.records>8192)fail('ProtocolCorrupt');return s;};
 const status=s=>({generation:s.generation,sequence:s.sequence,revision:s.revision,phase:s.phase,through:s.through,pages:s.pages,records:s.records,complete:s.phase==='done'});
 const seed=(generation,sequence)=>hash({format:'sync-bootstrap-chain/v1',scope,generation,sequence});
 const rowPath=(g,c,id)=>g+':row:'+hash([c,id]),bucketFor=token=>parseInt(hash(token).slice(0,2),16)%64;
 function working(g,c,id){const raw=get(rowPath(g,c,id));if(!raw)return null;if(raw.generation!==g||raw.value.collection!==c||raw.value.id!==id)fail('ProtocolCorrupt');return raw.value;}
 function classify(change){
  if(Object.hasOwn(formats,change.collection)){
   if(!change.deleted){if(change.data?.format!==formats[change.collection]||!change.data.record||typeof change.data.record!=='object')fail('ProtocolCorrupt');const record=change.data.record,validators={entries:syncEntrySnapshot_,days:syncDaySnapshot_,weeks:syncWeekSnapshot_,habitLogs:syncHabitLogSnapshot_,projects:syncProjectSnapshot_};try{if(validators[change.collection]&&!same(validators[change.collection](record),record)||['goals','habits'].includes(change.collection)&&!same(syncCatalogSnapshot_(change.collection,record),record))fail('ProtocolCorrupt');if(change.collection==='files'&&(Object.keys(record).sort().join(',')!==FILE_HEADERS.slice().sort().join(',')||FILE_HEADERS.some(k=>typeof record[k]!=='string')||!record.entryId))fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}}
   return {collection:change.collection,id:change.id,change};
  }
  if(change.collection!=='settings')return null;
  if(!change.deleted&&change.data?.format==='sync-entry-route/v1'){if(typeof change.data.id!=='string'||!change.data.id||change.data.id.length>200)fail('ProtocolCorrupt');return {collection:'routes',id:change.data.id,change};}
  if(!change.deleted&&change.data?.format==='sync-app-setting/v1'&&['privacy','reflection'].includes(change.data.kind)){const r=change.data.record;if(!r||typeof r!=='object'||(change.data.kind==='reflection'?Object.keys(r).join(',')!=='dailyReflectionMode'||!['essential','detailed'].includes(r.dailyReflectionMode):Object.keys(r).join(',')!=='privateTags'||!Array.isArray(r.privateTags)||r.privateTags.length>30||r.privateTags.some(tag=>typeof tag!=='string'||tag.length>100)||new Set(r.privateTags).size!==r.privateTags.length))fail('ProtocolCorrupt');return {collection:'settings',id:change.data.kind,change};}
  if(change.deleted&&['app-setting-v1:privacy','app-setting-v1:reflection'].includes(change.id))return {collection:'settings',id:change.id.slice('app-setting-v1:'.length),change};
  return null;
 }
 function remember(g,value){
  const token=key(value.collection,value.id),n=bucketFor(token),path=g+':bucket:'+n,raw=get(path),directory=raw?.value||{format:'sync-bootstrap-bucket/v1',keys:[]};
  if(raw&&raw.generation!==g||directory.format!=='sync-bootstrap-bucket/v1'||!Array.isArray(directory.keys)||directory.keys.length>128||new Set(directory.keys).size!==directory.keys.length)fail('ProtocolCorrupt');
  if(!directory.keys.includes(token)){if(directory.keys.length>=128)fail('ProtocolUnavailable');put(path,g,{...directory,keys:[...directory.keys,token].sort()});}
  const prior=working(g,value.collection,value.id);if(prior&&prior.change.sequence>value.change.sequence)return;if(prior&&prior.change.sequence===value.change.sequence){if(!same(prior,value))fail('ProtocolCorrupt');return;}put(rowPath(g,value.collection,value.id),g,value);
 }
 function normalized(g,value){
  const {collection,id,change}=value;let sequence=change.sequence,deleted=change.deleted,data=null,content;
  if(collection==='routes'){
   const owner=working(g,'entries',id),route=change.data;if(owner?.change.deleted){sequence=Math.max(sequence,owner.change.sequence);deleted=true;}
   else{if(route.content!==null&&route.content!==undefined&&(!route.content||typeof route.content.version!=='string'||!/^[a-f0-9]{64}$/.test(route.content.digest)))fail('ProtocolCorrupt');content=route.content||null;deleted=route.layout===null||route.layout===undefined;if(!deleted&&!Number.isFinite(route.layout))fail('ProtocolCorrupt');data=deleted?null:{entryId:id,position:route.layout,version:change.version};}
   return {collection:'layouts',id,sequence,version:'commit-'+sequence,deleted,data,...(content===undefined?{}:{content})};
  }
  if(!deleted){
   if(collection==='settings'){data={id,value:copy(change.data.record),version:change.version};}
   else{data={...copy(change.data.record),updatedAt:change.version};const idKey=collection==='projects'?'slug':collection==='days'?'date':collection==='weeks'?'week':collection==='habitLogs'?'key':'id';if(data[idKey]!==id)fail('ProtocolCorrupt');}
   if(collection==='entries'){
    const routeChange=working(g,'routes',id)?.change,route=routeChange?.data;if(route){const empty=routeChange.sequence<change.sequence?'':null;data.contentVersion=route.content?.version||empty;data.contentDigest=route.content?.digest||empty;if(route.layout!==null&&route.layout!==undefined)data.position=route.layout;else if(routeChange.sequence>=change.sequence)data.position=null;}
   }
   if(collection==='files'){const owner=working(g,'entries',data.entryId);if(owner?.change.deleted){if(owner.change.sequence<sequence)fail('ProtocolCorrupt');sequence=owner.change.sequence;deleted=true;data=null;}}
  }
  return {collection,id,sequence,version:'commit-'+sequence,deleted,data};
 }
 function readManifest(g,digest){const raw=get(g+':manifest',true);if(!raw||raw.generation!==g)fail('ProtocolCorrupt');const m=raw.value,{digest:stored,...core}=m;if(Object.keys(m).sort().join(',')!==['format','scope','generation','sequence','cursor','pages','records','counts','seed','root','digest'].sort().join(',')||!m.counts||typeof m.counts!=='object'||Array.isArray(m.counts)||! /^[a-f0-9]{64}$/.test(m.seed)||! /^[a-f0-9]{64}$/.test(m.root)||m.format!=='sync-bootstrap-manifest/v1'||m.generation!==g||!same(m.scope,scope)||stored!==hash(core)||digest!==undefined&&digest!==stored||m.cursor?.sequence!==m.sequence||m.cursor?.archiveId!==scope.archiveId||m.cursor?.epoch!==scope.epoch||m.cursor?.principalId!==scope.principalId||m.cursor?.format!=='sync-cursor/v1'||!Number.isSafeInteger(m.sequence)||m.sequence<0||!Number.isSafeInteger(m.pages)||m.pages<0||m.pages>8192||!Number.isSafeInteger(m.records)||m.records<0||m.records>8192||!same(Object.keys(m.counts).sort(),collections.slice().sort())||collections.some(c=>{const n=m.counts[c];return !n||Object.keys(n).sort().join(',')!=='live,records,tombstones'||['records','live','tombstones'].some(k=>!Number.isSafeInteger(n[k])||n[k]<0||n[k]>8192)||n.live+n.tombstones!==n.records;})||collections.reduce((n,c)=>n+m.counts[c].records,0)!==m.records||m.pages>m.records||m.pages===0&&(m.records!==0||m.seed!==m.root))fail('ProtocolCorrupt');return m;}
 function page(g,index,expectedPrevious){const raw=get(g+':page:'+index,true);if(!raw||raw.generation!==g)fail('ProtocolCorrupt');const p=raw.value,{digest,...core}=p;if(Object.keys(p).sort().join(',')!==['format','scope','generation','sequence','index','previousDigest','items','digest'].sort().join(',')||! /^[a-f0-9]{64}$/.test(p.previousDigest)||p.format!=='sync-bootstrap-page/v1'||p.generation!==g||!same(p.scope,scope)||p.index!==index||!Array.isArray(p.items)||!p.items.length||p.items.length>25||digest!==hash(core)||expectedPrevious!==undefined&&p.previousDigest!==expectedPrevious)fail('ProtocolCorrupt');return p;}
 return Object.freeze({
  bootstrapBegin(input){return run(true,()=>{if(!input||Object.keys(input).join(',')!=='generation'||!valid(input.generation))fail('DataError');const g=input.generation;if(get(g+':state'))return status(stateOf(g));const sequence=unwrap(protocol.checkpoint()).highWater,s={format:'sync-bootstrap-build/v1',generation:g,sequence,revision:0,phase:'replay',through:0,bucket:0,offset:0,pages:0,records:0,chain:seed(g,sequence),counts:counts(),verified:0,verifiedRecords:0,verifiedChain:seed(g,sequence),verifiedCounts:counts()};put(g+':state',g,s);return status(s);});},
  bootstrapStep(input){return run(true,()=>{
   if(!input||Object.keys(input).sort().join(',')!=='generation,revision'||!valid(input.generation)||!Number.isSafeInteger(input.revision)||input.revision<0)fail('DataError');const g=input.generation,s=stateOf(g);if(input.revision>s.revision)fail('ConflictError');if(input.revision<s.revision||s.phase==='done')return status(s);const next=copy(s);
   if(s.phase==='replay'){
    if(s.through<s.sequence){const cursor={format:'sync-cursor/v1',...scope,sequence:s.through},feed=unwrap(protocol.changes({cursor,limit:5}));let processed=0;for(const commit of feed.commits){if(commit.sequence>s.sequence)break;if(commit.sequence!==next.through+1)fail('ProtocolCorrupt');for(const change of commit.changes){const value=classify(change);if(value)remember(g,value);}next.through=commit.sequence;processed++;}if(!processed)fail('ProtocolCorrupt');}
    if(next.through===s.sequence)next.phase='emit';
   }else if(s.phase==='emit'){
    if(s.bucket>=64)next.phase='verify';else{
     const raw=get(g+':bucket:'+s.bucket),keys=raw?.value?.keys||[];if(!Array.isArray(keys)||keys.length>128||new Set(keys).size!==keys.length||!same(keys,keys.slice().sort())||raw&&(raw.generation!==g||raw.value.format!=='sync-bootstrap-bucket/v1'))fail('ProtocolCorrupt');const items=[];let offset=s.offset;
     while(offset<keys.length&&items.length<25){const token=keys[offset];if(bucketFor(token)!==s.bucket)fail('ProtocolCorrupt');let pair;try{pair=JSON.parse(token);if(!Array.isArray(pair)||pair.length!==2||![...collections.filter(c=>c!=='layouts'),'routes'].includes(pair[0])||typeof pair[1]!=='string'||!pair[1]||pair[1].length>200||key(...pair)!==token)fail('ProtocolCorrupt');}catch(ignore){fail('ProtocolCorrupt');}const value=working(g,...pair);if(!value||value.change.sequence>s.sequence)fail('ProtocolCorrupt');const row=normalized(g,value);if(traceBytes_(syncCommitCanonical_(items.concat([row])))>120000){if(!items.length)fail('ProtocolUnavailable');break;}items.push(row);offset++;}
     if(items.length){const core={format:'sync-bootstrap-page/v1',scope,generation:g,sequence:s.sequence,index:s.pages,previousDigest:s.chain,items},value={...core,digest:hash(core)};put(g+':page:'+s.pages,g,value,true);next.chain=value.digest;next.pages++;for(const row of items){next.records++;const c=next.counts[row.collection];c.records++;c[row.deleted?'tombstones':'live']++;}}
     next.offset=offset;if(offset===keys.length){next.bucket++;next.offset=0;}if(next.bucket===64)next.phase='verify';
    }
   }else if(s.phase==='verify'){
    if(s.verified<s.pages){const p=page(g,s.verified,s.verifiedChain);if(p.sequence!==s.sequence)fail('ProtocolCorrupt');next.verified++;next.verifiedChain=p.digest;for(const row of p.items){if(!collections.includes(row.collection)||row.sequence>s.sequence||row.version!=='commit-'+row.sequence||typeof row.deleted!=='boolean')fail('ProtocolCorrupt');next.verifiedRecords++;const c=next.verifiedCounts[row.collection];c.records++;c[row.deleted?'tombstones':'live']++;}}
    if(next.verified===s.pages){if(next.verifiedChain!==s.chain||next.verifiedRecords!==s.records||!same(next.verifiedCounts,s.counts))fail('ProtocolCorrupt');const core={format:'sync-bootstrap-manifest/v1',scope,generation:g,sequence:s.sequence,cursor:{format:'sync-cursor/v1',...scope,sequence:s.sequence},pages:s.pages,records:s.records,counts:s.counts,seed:seed(g,s.sequence),root:s.chain},m={...core,digest:hash(core)};put(g+':manifest',g,m,true);readManifest(g,m.digest);const prior=get('published');if(prior&&prior.value.sequence>s.sequence)fail('CommitBlocked');put('published',g,{generation:g,sequence:s.sequence,digest:m.digest});next.phase='done';}
   }
   next.revision++;put(g+':state',g,next);return status(next);
  });},
  bootstrapDiscover(input){return run(false,()=>{if(!input||Object.keys(input).length)fail('DataError');const ptr=get('published');if(!ptr)return {available:false};const m=readManifest(ptr.value.generation,ptr.value.digest);if(ptr.generation!==ptr.value.generation||m.sequence!==ptr.value.sequence||m.sequence>unwrap(protocol.checkpoint()).highWater)fail('ProtocolCorrupt');return {available:true,manifest:m};});},
  bootstrapPage(input){return run(false,()=>{if(!input||Object.keys(input).sort().join(',')!=='digest,generation,index'||!valid(input.generation)||typeof input.digest!=='string'||!/^[a-f0-9]{64}$/.test(input.digest)||!Number.isSafeInteger(input.index)||input.index<0)fail('DataError');const m=readManifest(input.generation,input.digest);if(input.index>=m.pages)fail('DataError');const p=page(input.generation,input.index);if(p.sequence!==m.sequence)fail('ProtocolCorrupt');const response={...p,manifestDigest:m.digest,hasMore:p.index+1<m.pages,nextIndex:p.index+1<m.pages?p.index+1:null};let prior;do{prior=response.bytes;response.bytes=traceBytes_(syncCommitCanonical_(response));}while(prior!==response.bytes);if(response.bytes>131072)fail('ProtocolUnavailable');return response;});}
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
 function inspectOperationLocked(head,operationId,baselineCommits,expectedRaw){
  const raw=store.readReceipt(scope.principalId,operationId),receipt=receiptValue(raw,scope.principalId,operationId),alias=store.findCommitByOperation(scope.principalId,operationId);let commit=null;
  if(expectedRaw!==undefined&&(!receipt||!same(expectedRaw,raw)))fail('ProtocolCorrupt');
  if(alias!==null){commit=commitValue(alias,alias.sequence);if(commit.sequence>head.committedThrough||commit.principalId!==scope.principalId||commit.operationId!==operationId)fail('ProtocolCorrupt');}
  if(receipt?.response.status==='committed'){const sequence=receipt.response.sequence;if(sequence>head.committedThrough)fail('ProtocolCorrupt');const direct=commitValue(store.readCommit(sequence),sequence);if(direct.principalId!==scope.principalId||direct.operationId!==operationId||direct.fingerprint!==receipt.fingerprint||!same(receipt.response.versions,direct.changes.map(entity=>({collection:entity.collection,id:entity.id,version:entity.version,deleted:entity.deleted})))||commit&&!same(commit,direct))fail('ProtocolCorrupt');if(!commit)commit=direct;}
  if(receipt?.response.status==='conflict'&&commit)fail('ProtocolCorrupt');
  let conflictReferences=0,conflictCurrent=0;
  if(receipt?.response.status==='conflict')for(const conflict of receipt.response.conflicts){
   if(conflict.actualVersion===null)continue;const match=/^commit-([1-9][0-9]*)$/.exec(conflict.actualVersion),sequence=match?Number(match[1]):0;if(!Number.isSafeInteger(sequence)||sequence<1||sequence>head.committedThrough)fail('ProtocolCorrupt');
   let baseline=baselineCommits.get(sequence);if(!baseline){baseline=commitValue(store.readCommit(sequence),sequence);baselineCommits.set(sequence,baseline);}const observed=baseline.changes.find(entity=>entity.collection===conflict.collection&&entity.id===conflict.id);if(!observed||observed.version!==conflict.actualVersion)fail('ProtocolCorrupt');
   const latest=entityValue(store.readEntity(conflict.collection,conflict.id),conflict.collection,conflict.id,head.committedThrough);if(!latest||latest.sequence<sequence||latest.sequence===sequence&&!same(latest,observed))fail('ProtocolCorrupt');conflictReferences++;if(latest.sequence===sequence)conflictCurrent++;
  }
  return {operationId,receipt:receipt?.response.status||null,commitSequence:commit?.sequence??null,aliasPresent:alias!==null,conflictReferences,conflictCurrent};
 }
 const cursor=sequence=>({format:'sync-cursor/v1',...scope,sequence});
 return Object.freeze({
  inventoryRetainedReceipts:input=>guarded(()=>{
   if(!input||Object.keys(input).sort().join(',')!=='afterRow,limit,upperRow'||!Number.isSafeInteger(input.afterRow)||input.afterRow<1||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>25||!(input.upperRow===null||Number.isSafeInteger(input.upperRow)&&input.upperRow>=input.afterRow))fail('DataError');
   if(typeof store.scanReceiptReferences!=='function')fail('ProtocolUnavailable');const head=headValue();if(head.pending!==null)fail('ProtocolUnavailable');
   const page=store.scanReceiptReferences({principalId:scope.principalId,afterRow:input.afterRow,limit:input.limit,upperRow:input.upperRow});
   if(!page||!Number.isSafeInteger(page.upperRow)||page.upperRow<input.afterRow||(input.upperRow!==null&&page.upperRow!==input.upperRow)||!Number.isSafeInteger(page.throughRow)||page.throughRow!==Math.min(page.upperRow,input.afterRow+input.limit)||!Array.isArray(page.receipts)||['unpublished','retired','unrecognized'].some(key=>!Number.isSafeInteger(page[key])||page[key]<0)||page.receipts.length+page.unpublished+page.retired+page.unrecognized>page.throughRow-input.afterRow)fail('ProtocolCorrupt');
   const baselines=new Map(),receipts=page.receipts.map(item=>{if(!item||!identifier(item.operationId)||!item.receipt)fail('ProtocolCorrupt');const inspected=inspectOperationLocked(head,item.operationId,baselines,item.receipt),{receipt,...details}=inspected;return {...details,status:receipt};});
   return {highWater:head.committedThrough,upperRow:page.upperRow,throughRow:page.throughRow,nextAfter:page.throughRow<page.upperRow?page.throughRow:null,unpublished:page.unpublished,retired:page.retired,unrecognized:page.unrecognized,receipts};
  }),
  inspectRetainedRange:input=>guarded(()=>{
   if(!input||!['from,limit','from,limit,upperSequence'].includes(Object.keys(input).sort().join(','))||!Number.isSafeInteger(input.from)||input.from<1||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>25||!(input.upperSequence===undefined||Number.isSafeInteger(input.upperSequence)&&input.upperSequence>=0))fail('DataError');
   const head=headValue();if(head.pending!==null)fail('ProtocolUnavailable');if(input.from>head.committedThrough+1)fail('DataError');
   const upperSequence=input.upperSequence===undefined?head.committedThrough:input.upperSequence;if(upperSequence>head.committedThrough||input.from>upperSequence+1)fail('DataError');
   const end=Math.min(upperSequence,input.from+input.limit-1),commits=[];
   for(let sequence=input.from;sequence<=end;sequence++){
    const raw=store.readCommit(sequence);if(raw===null)fail('ProtocolCorrupt');const commit=commitValue(raw,sequence),receipt=receiptValue(store.readReceipt(commit.principalId,commit.operationId),commit.principalId,commit.operationId),alias=store.findCommitByOperation(commit.principalId,commit.operationId);
    if(receipt&&(receipt.response.status!=='committed'||receipt.response.sequence!==sequence||receipt.fingerprint!==commit.fingerprint||!same(receipt.response.versions,commit.changes.map(entity=>({collection:entity.collection,id:entity.id,version:entity.version,deleted:entity.deleted})))))fail('ProtocolCorrupt');
    if(alias!==null&&!same(commitValue(alias,sequence),commit))fail('ProtocolCorrupt');
    let current=0,tombstones=0;for(const entity of commit.changes){const latest=entityValue(store.readEntity(entity.collection,entity.id),entity.collection,entity.id,head.committedThrough);if(!latest||latest.sequence<sequence)fail('ProtocolCorrupt');if(latest.sequence===sequence){if(!same(latest,entity))fail('ProtocolCorrupt');current++;if(latest.deleted)tombstones++;}}
    commits.push({sequence,changes:commit.changes.length,current,tombstones,receiptPresent:!!receipt,aliasPresent:alias!==null});
   }
   return {highWater:head.committedThrough,upperSequence,commits,nextFrom:end<upperSequence?end+1:null};
  }),
  inspectRetainedOperations:input=>guarded(()=>{
   if(!input||Object.keys(input).join(',')!=='operationIds'||!Array.isArray(input.operationIds)||!input.operationIds.length||input.operationIds.length>25||input.operationIds.some(id=>!identifier(id))||new Set(input.operationIds).size!==input.operationIds.length)fail('DataError');
   const head=headValue();if(head.pending!==null)fail('ProtocolUnavailable');const baselineCommits=new Map();
   const operations=input.operationIds.map(operationId=>inspectOperationLocked(head,operationId,baselineCommits));return {highWater:head.committedThrough,operations};
  }),
  lookupOperationReceipt:input=>guarded(()=>{
   if(!input||!['operationId','operationId,request'].includes(Object.keys(input).sort().join(','))||!identifier(input.operationId))fail('DataError');
   const expected=input.request===undefined?null:requestValue(input.request);if(expected&&expected.operationId!==input.operationId)fail('DataError');
   const head=headValue();if(head.pending!==null)fail('ProtocolUnavailable');
   const inspected=inspectOperationLocked(head,input.operationId,new Map()),raw=store.readReceipt(scope.principalId,input.operationId),receipt=receiptValue(raw,scope.principalId,input.operationId);
   if(!receipt)return {status:'unknown',operationId:input.operationId};
   if(inspected.receipt!==receipt.response.status)fail('ProtocolCorrupt');if(expected&&receipt.fingerprint!==hash(expected))fail('OperationMismatch');return receipt.response;
  }),
  checkpoint:()=>guarded(()=>{const head=recoverLocked(headValue());return {cursor:cursor(head.committedThrough),highWater:head.committedThrough};}),
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
  withReadView:fn=>guarded(()=>{
   if(typeof fn!=='function')fail('DataError');const head=recoverLocked(headValue()),generation=typeof store.readGeneration==='function'?store.readGeneration():null;
   let open=true;
   const check=()=>{if(!open)fail('ProtocolUnavailable');if(generation!==null&&store.readGeneration()!==generation)fail('ScopeChanged');};
   const valid=(collection,id)=>{check();if(!collections.includes(collection)||typeof id!=='string'||!id||id.length>200)fail('DataError');};
   const view=Object.freeze({cursor:cursor(head.committedThrough),read(collection,id){valid(collection,id);return {cursor:cursor(head.committedThrough),entity:entityValue(store.readEntity(collection,id),collection,id,head.committedThrough)};},metadata(collection,id){valid(collection,id);if(typeof store.readEntityMetadata!=='function'){const entity=entityValue(store.readEntity(collection,id),collection,id,head.committedThrough);return entity?{collection,id,sequence:entity.sequence,deleted:entity.deleted}:null;}const state=store.readEntityMetadata(collection,id);if(state!==null&&(!state||state.collection!==collection||state.id!==id||!Number.isSafeInteger(state.sequence)||state.sequence<1||state.sequence>head.committedThrough||typeof state.deleted!=='boolean'))fail('ProtocolCorrupt');return state;}});
   try{const value=fn(view);if(value&&typeof value.then==='function')fail('DataError');check();if(!same(headValue(),head))fail('ScopeChanged');return value;}finally{open=false;}
  }),
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
 const lock=services.withLock||function(fn){if(APP_LOCK_DEPTH>0)return fn();const handle=LockService.getScriptLock();if(!handle.tryLock(0))fail('BusyError');try{if(typeof PropertiesService!=='undefined'&&typeof readDocWorkerReservation_==='function'&&readDocWorkerReservation_())fail('BusyError');return fn();}finally{handle.releaseLock();}};
 let active=false,lookupCache=null,lookupProbes=null,maintenanceBudget=null,readGeneration=0;
 const guard=()=>{if(!active||services.enabled?.()!==true)fail('ProtocolUnavailable');if(services.authorize?.(copy(archive))!==true)fail('ScopeChanged');};
 const hash=text=>{const result=digest(text);if(typeof result!=='string'||!/^[a-f0-9]{64}$/.test(result))fail('ProtocolCorrupt');return result;};
 const key=(kind,id)=>'k:'+hash(syncCommitCanonical_([archive,kind,id]));
 function headers(sheet,expected){if(sheet.getLastColumn()!==expected.length||!same(sheet.getRange(1,1,1,expected.length).getDisplayValues()[0],expected))fail('ProtocolCorrupt');}
 function capacity(sheet,end){const max=sheet.getMaxRows();if(end>max)sheet.insertRowsAfter(max,end-max);}
 function indexRows(column){
  let index=lookupCache?.get(column);if(index)return index;index=new Map();const count=indexSheet.getLastRow()-1;
  for(let offset=0;offset<count;offset+=4096)indexSheet.getRange(offset+2,column,Math.min(4096,count-offset),1).getDisplayValues().forEach((cells,indexOffset)=>{const value=String(cells[0]??'');if(!value)return;const rows=index.get(value)||[];rows.push(offset+indexOffset+2);index.set(value,rows);});
  if(lookupCache)lookupCache.set(column,index);return index;
 }
 function find(column,value){
  guard();value=String(value);const index=lookupCache?.get(column);let rows;
  if(index)rows=index.get(value)||[];
  else{let probes=lookupProbes?.get(column);if(!probes){probes=new Map();lookupProbes?.set(column,probes);}if(probes.has(value))rows=probes.get(value);else if(probes.size<8){const count=indexSheet.getLastRow()-1;rows=count>0?indexSheet.getRange(2,column,count,1).createTextFinder(value).useRegularExpression(false).matchEntireCell(true).findAll().map(range=>range.getRow()):[];probes.set(value,rows);}else rows=indexRows(column).get(value)||[];}
  if(rows.length>512)fail('ProtocolUnavailable');return rows.slice();
 }
 function cacheIndexRows(start,values){for(const column of [1,2]){const index=lookupCache?.get(column),probes=lookupProbes?.get(column);values.forEach((row,offset)=>{const value=String(row[column-1]??'');if(!value)return;if(index){const found=index.get(value)||[];found.push(start+offset);index.set(value,found);}if(probes?.has(value))probes.get(value).push(start+offset);});}}
 function append(sheet,rows){guard();const start=sheet.getLastRow()+1;capacity(sheet,start+rows.length-1);sheet.getRange(start,1,rows.length,rows[0].length).setNumberFormat('@').setValues(rows);flush();guard();if(!same(sheet.getRange(start,1,rows.length,rows[0].length).getDisplayValues(),rows))fail('ProtocolCorrupt');if(sheet===indexSheet)cacheIndexRows(start,rows);return start;}
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
   if(Object.prototype.hasOwnProperty.call(ref,'state')){
    const state=ref.state;if(!state||Object.keys(state).sort().join(',')!=='collection,deleted,id,sequence'||state.collection!=='habitLogs'||typeof state.id!=='string'||!state.id||state.id.length>200||!Number.isSafeInteger(state.sequence)||state.sequence<1||typeof state.deleted!=='boolean'||ref.key!==key('entity',[state.collection,state.id]))fail('ProtocolCorrupt');
   }
   refs.push({row,operation:cells[1],...ref});
  }
  return refs;
 }
 function latest(refs){
  if(!refs.length)return null;const revision=Math.max(...refs.map(ref=>ref.revision)),candidates=refs.filter(ref=>ref.revision===revision),first=candidates[0];
  if(candidates.some(ref=>ref.key!==first.key||ref.operation!==first.operation||ref.digest!==first.digest||!same(ref.state??null,first.state??null)))fail('ProtocolCorrupt');return first;
 }
 function load(ref,acceptForeign=false){
  if(ref===null)return null;guard();
  if(ref.start+ref.count-1>blockSheet.getLastRow())fail('ProtocolCorrupt');
  const rows=blockSheet.getRange(ref.start,1,ref.count,3).getDisplayValues();
  if(rows.some((row,i)=>row[0]!==ref.generation||row[1]!=='n:'+i||typeof row[2]!=='string'||!row[2].startsWith('b1:')||row[2].length>8195))fail('ProtocolCorrupt');
  const encoded=rows.map(row=>row[2].slice(3)).join(''),raw=unpack(encoded);if(raw.length>262144||hash(raw)!==ref.digest)fail('ProtocolCorrupt');
  let value;try{value=JSON.parse(raw);}catch(error){fail('ProtocolCorrupt');}
  if(!value||!acceptForeign&&!same(value.archive,archive)||syncCommitCanonical_(value)!==raw)fail('ProtocolCorrupt');if(ref.state&&(value.collection!==ref.state.collection||value.id!==ref.state.id||value.sequence!==ref.state.sequence||value.deleted!==ref.state.deleted||value.version!=='commit-'+ref.state.sequence))fail('ProtocolCorrupt');return value;
 }
 function read(kind,id,operation){guard();return load(latest(references(find(1,key(kind,id)),key(kind,id),operation)));}
 function write(kind,id,value,operation='',immutable=false){
  guard();readGeneration++;if(!same(value.archive,archive))fail('ScopeChanged');const lookup=key(kind,id);let matched=find(1,lookup);if(['head','entity'].includes(kind)&&matched.length>=384&&services.continuousMaintenanceEnabled?.()===true){ensureWriteCapacity([{kind,id,writes:1}]);matched=find(1,lookup);}const refs=references(matched,lookup,operation),prior=latest(refs),raw=syncCommitCanonical_(value);
  if(raw.length>262144)fail('DataError');
  if(prior){const previous=load(prior);if(same(previous,value))return;if(immutable)fail('OperationMismatch');if(prior.revision>=Number.MAX_SAFE_INTEGER-1)fail('ProtocolUnavailable');}
  if(matched.length>=512)fail('ProtocolUnavailable');
  const generation='g:'+uuid();if(!/^g:[a-zA-Z0-9-]{10,80}$/.test(generation))fail('ProtocolCorrupt');
  const encoded=encode(raw);if(unpack(encoded)!==raw)fail('ProtocolCorrupt');
  const parts=[];for(let offset=0;offset<encoded.length;offset+=8192)parts.push([generation,'n:'+parts.length,'b1:'+encoded.slice(offset,offset+8192)]);
  if(!parts.length||parts.length>256)fail('DataError');
  const start=append(blockSheet,parts),ref={format:'sync-sheet-ref/v1',key:lookup,revision:(prior?.revision||0)+1,generation,start,count:parts.length,digest:hash(raw)};
  if(kind==='entity'&&id[0]==='habitLogs')ref.state={collection:id[0],id:id[1],sequence:value.sequence,deleted:value.deleted};
  const cells=[lookup,operation,'r1:'+encode(syncCommitCanonical_(ref)),''],row=append(indexSheet,[cells]);
  const marker='ok:'+hash(syncCommitCanonical_(cells.slice(0,3)));
  guard();indexSheet.getRange(row,4).setNumberFormat('@').setValue(marker);flush();guard();
  if(indexSheet.getRange(row,4).getDisplayValues()[0][0]!==marker)fail('ProtocolCorrupt');
  const published=latest(references(find(1,lookup),lookup,operation));if(!published||published.revision!==ref.revision||published.digest!==ref.digest||!same(load(published),value))fail('ProtocolCorrupt');
 }
 function budgetKey(item){
  if(!item||Object.keys(item).sort().join(',')!=='id,kind,writes'||!Number.isSafeInteger(item.writes)||item.writes<1||item.writes>512)fail('DataError');
  const id=item.id,pair=Array.isArray(id)&&id.length===2&&id.every(value=>typeof value==='string'&&value.length>0&&value.length<=200);
  if(!(item.kind==='head'&&id==='head'||item.kind==='entity'&&pair||item.kind==='commit'&&Number.isSafeInteger(id)&&id>0||['receipt','operation','checkpoint','checkpoint-record'].includes(item.kind)&&pair))fail('DataError');
  return {lookup:key(item.kind,id),column:item.kind==='operation'?2:1};
 }
 function preflightWrites(items){
  guard();if(!Array.isArray(items)||!items.length||items.length>100)fail('DataError');const grouped=new Map();
  for(const item of items){const {lookup,column}=budgetKey(item),prior=grouped.get(lookup);grouped.set(lookup,{kind:item.kind,key:lookup,column,required:(prior?.required||0)+item.writes});}
  const keys=[...grouped.values()].map(({column,...item})=>{const used=find(column,item.key).length;return {...item,used,remaining:512-used,available:used+item.required<=512};});
  return {limit:512,available:keys.every(item=>item.available),keys};
 }
 // One lock owns at most two batches / 128 retirements. The elapsed-time
 // budget is cooperative: a single Sheets RPC cannot be interrupted.
 function ensureWriteCapacity(items){
  const before=preflightWrites(items);
  if(services.continuousMaintenanceEnabled?.()!==true||services.maintenanceEnabled?.()!==true)return before;
  const started=Date.now();maintenanceBudget??={remaining:128,batches:2,deadline:started+2000};
  const seen=new Set();
  for(const item of items){
   const {lookup}=budgetKey(item);if(seen.has(lookup))continue;seen.add(lookup);
   if(!['head','entity'].includes(item.kind))continue;
   const used=find(1,lookup).length;
   if(used<384||maintenanceBudget.remaining<=0||maintenanceBudget.batches<=0||Date.now()>=maintenanceBudget.deadline)continue;
   maintenanceBudget.batches--;
   compactReferences({kind:item.kind,id:item.id,dryRun:false,limit:Math.min(64,maintenanceBudget.remaining)});
  }
  return preflightWrites(items);
 }
 function compactReferences(input){
  guard();if(!input||Object.keys(input).sort().join(',')!=='dryRun,id,kind,limit'||!['head','entity','checkpoint'].includes(input.kind)||typeof input.dryRun!=='boolean'||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>128)fail('DataError');
  const {lookup}=budgetKey({kind:input.kind,id:input.id,writes:1}),matched=find(1,lookup),refs=references(matched,lookup,''),keep=latest(refs);
  if(!keep)fail('ProtocolUnavailable');const preserved=load(keep);
  // Only mutable head/entity keys have no operation alias. Retain the exact
  // latest published row, including a pending recovery head, without moving it.
  for(const row of matched)if(indexSheet.getRange(row,2).getDisplayValues()[0][0]!=='')fail('ProtocolCorrupt');
  const obsolete=matched.filter(row=>row!==keep.row),planned=obsolete.slice(0,input.limit);
  const report={kind:input.kind,matched:matched.length,eligible:obsolete.length,planned:planned.length,retired:0,remaining:matched.length,hasMore:obsolete.length>0};
  if(input.dryRun)return report;
  const maintenanceGuard=()=>{guard();if((input.kind==='checkpoint'?services.checkpointMaintenanceEnabled?.():services.maintenanceEnabled?.())!==true)fail('ProtocolUnavailable');};
  maintenanceGuard();if(planned.length)readGeneration++;
  for(const row of planned){
   if(maintenanceBudget&&(maintenanceBudget.remaining<=0||Date.now()>=maintenanceBudget.deadline))break;
   maintenanceGuard();
   const marker='retired:'+hash(syncCommitCanonical_([lookup,row,keep.digest]));
   indexSheet.getRange(row,1).setNumberFormat('@').setValue(marker);flush();maintenanceGuard();
   if(indexSheet.getRange(row,1).getDisplayValues()[0][0]!==marker)fail('ProtocolCorrupt');lookupCache?.delete(1);lookupProbes?.delete(1);report.retired++;if(maintenanceBudget)maintenanceBudget.remaining--;
  }
  if(!same(read(input.kind,input.id,''),preserved))fail('ProtocolCorrupt');
  report.remaining=find(1,lookup).length;report.hasMore=report.remaining>1;return report;
 }
 return Object.freeze({
  digest:hash,
  preflightWrites,ensureWriteCapacity,compactReferences,
  readGeneration(){guard();return readGeneration;},
  readCheckpoint:(id,immutable=false)=>read(immutable?'checkpoint-record':'checkpoint',id,''),
  writeCheckpoint(id,value,immutable=false){
   guard();const kind=immutable?'checkpoint-record':'checkpoint',matched=find(1,key(kind,id));
   if(!immutable&&matched.length>=384&&services.checkpointMaintenanceEnabled?.()===true){maintenanceBudget??={remaining:128,batches:2,deadline:Date.now()+2000};if(maintenanceBudget.batches>0&&maintenanceBudget.remaining>0&&Date.now()<maintenanceBudget.deadline){maintenanceBudget.batches--;compactReferences({kind,id,dryRun:false,limit:Math.min(64,maintenanceBudget.remaining)});}}
   return write(kind,id,value,'',immutable);
  },
  readEntityMetadata(collection,id){
   guard();const lookup=key('entity',[collection,id]),ref=latest(references(find(1,lookup),lookup,''));if(!ref)return null;
   if(ref.state)return copy(ref.state);
   // Pre-projection references remain readable; their metadata is checked from
   // the original payload. No implicit backfill or persistent cache is written.
   const value=load(ref);return {collection:value.collection,id:value.id,sequence:value.sequence,deleted:value.deleted};
  },
  scanReceiptReferences(input){
   guard();if(!input||Object.keys(input).sort().join(',')!=='afterRow,limit,principalId,upperRow'||typeof input.principalId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.principalId)||!Number.isSafeInteger(input.afterRow)||input.afterRow<1||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>25||!(input.upperRow===null||Number.isSafeInteger(input.upperRow)&&input.upperRow>=input.afterRow))fail('DataError');
   const last=indexSheet.getLastRow(),upperRow=input.upperRow===null?last:input.upperRow;if(upperRow>last||input.afterRow>upperRow)fail('DataError');const throughRow=Math.min(upperRow,input.afterRow+input.limit),receipts=[];let unpublished=0,retired=0,unrecognized=0;
   for(let row=input.afterRow+1;row<=throughRow;row++){const cells=indexSheet.getRange(row,1,1,4).getDisplayValues()[0];if(/^retired:[a-f0-9]{64}$/.test(cells[0])){retired++;continue;}if(!/^k:[a-f0-9]{64}$/.test(cells[0])){unrecognized++;continue;}const refs=references([row],undefined,undefined);if(!refs.length){unpublished++;continue;}const ref=refs[0],record=load(ref,true);if(record.format!=='sync-receipt/v1'||!same(record.archive,archive)||record.principalId!==input.principalId)continue;if(typeof record.operationId!=='string'||ref.key!==key('receipt',[input.principalId,record.operationId])||ref.operation!=='')fail('ProtocolCorrupt');receipts.push({operationId:record.operationId,receipt:record});}
   return {upperRow,throughRow,unpublished,retired,unrecognized,receipts};
  },
  withLock(fn){if(active)fail('BusyError');if(services.enabled?.()!==true)fail('ProtocolUnavailable');return lock(()=>{active=true;maintenanceBudget=null;lookupCache=new Map();lookupProbes=new Map();try{guard();headers(indexSheet,SYNC_SHEET_INDEX_HEADERS);headers(blockSheet,SYNC_SHEET_BLOCK_HEADERS);return fn();}finally{maintenanceBudget=null;lookupProbes=null;lookupCache=null;active=false;}});},
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
