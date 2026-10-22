let DB_HANDLE=null,ENTRY_SMALL_CACHE=null,ENTRY_TAG_HEADER_CHECKED=false,ENTRY_TAG_HEADER_WRITTEN=false;
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
let ACTIVE_TRACE=null;
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
 const handlers={benchmarkJournalCache,getState,getCommonState,getJournalPage,getEntryDetail,saveJournalPage,saveDay,saveWeek,setHabitLog,saveNoteText,addJournal,saveGoal,saveHabit,saveProject,setTaskStatus,saveReflectionSettings,savePrivacySettings,searchArchive,processTaskDocQueue,getDocQueueState,addFileLink,deleteHabit,deleteNote,rebaseDocQueue,refreshNotePreviews,setEntryProjects,setEntryTags,beginProjectExport,continueProjectExport,getDriveInventory,previewProjectAsTag,convertProjectToTag,getAppChangelog};
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
  if(background){if(!traceMeasure_('lock',()=>lock.tryLock(0)))return {processed:0,busy:true,pending:null,errors:[]};}else traceMeasure_('lock',()=>lock.waitLock(30000));
  try { return fn(); } finally { try { if(!readOnly)traceMeasure_('flush',()=>SpreadsheetApp.flush()); } finally { lock.releaseLock(); } }
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
  groups.forEach(group=>{const range=sheet.getRange(group[0].row,5,group.length,10),values=range.getDisplayValues();group.forEach((item,i)=>{const e=item.entry;values[i][0]=e.projects;values[i][4]=new Date(Math.max(Date.now(),Date.parse(e.updatedAt)+1)).toISOString();values[i][6]=e.projects?'project':'personal';values[i][9]=e.tags;});range.setNumberFormat('@').setValues(values.map(r=>r.map(v=>/^[=+\-@']/.test(String(v))?"'"+v:String(v))));});
  if(plan.project){const projects=db.getSheetByName('Projects'),found=findRows_(projects,1,slug,false);found.sort((a,b)=>b-a).forEach(row=>projects.deleteRow(row));ioInvalidate_(projects);}
  ENTRY_SMALL_CACHE=null;const result=state_();result.convertedCount=changes.length;return result;
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
    const props=PropertiesService.getScriptProperties();props.setProperty('DAILY_REFLECTION_MODE',p.dailyReflectionMode);props.setProperty('REFLECTION_SETTINGS_VERSION',Utilities.getUuid());return state_();});
}
function rows_(sheet, headers) {
  if(sheet.getName()==='Days')ensureDayHeaders_(sheet);else verify_(sheet,headers);
  if (sheet.getLastRow()<2) return [];
  return ioRows_(sheet,headers.length)
    .map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
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
function getState(p) { ACTIVE_CONTEXT=p&&p.context||{}; return readState_(); }

function state_() {
 const started=Date.now(),db=db_(),today=Utilities.formatDate(new Date(),'Europe/Rome','yyyy-MM-dd');
 const context=ACTIVE_CONTEXT||{}, month=context.month||today.slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(month)||!validDate_(month+'-01'))throw new Error('Mese non valido.');
 let entries=[];if(!['habits','archive','projects','tasks','day','week','tags'].includes(context.view))entries=entrySearch_('date','^'+month+'-');
 if(context.view==='projects'&&context.project)entries=entrySearch_('projects','(^|,)'+slug_(context.project)+'(,|$)');
 if(context.view==='tasks')entries=entrySearch_('status','^(open|doing)$');
 if(context.view==='day'&&validDate_(context.date||''))entries=entrySearch_('date','^'+context.date+'$');
 if(context.view==='week'&&validDate_(context.week||'')) {
  const end=new Date(context.week+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const endDate=end.toISOString().slice(0,10);
  entries=weekEntries_(context.week,endDate);
 }
 const allTags=(context.view==='tags'||!(context.commonFresh||context.deferCommon))?tagCatalog_():undefined;
 if(context.view==='tags'&&context.tag){const tag=normaliseTags_(context.tag);if(tag.includes(','))throw new Error('Scegli un tag.');entries=entrySearch_('tags','(^|,)'+tag+'(,|$)');}
 if(!context.view||['journal','day'].includes(context.view)){entries=Array.from(new Map([...entries,...entrySearch_('type','^task$')].map(e=>[e.id,e])).values());}
 attachSchedules_(entries);attachPendingDocs_(entries);if(!context.view||context.view==='journal')entries=entries.filter(e=>e.date.startsWith(month+'-'));if(context.view==='day')entries=entries.filter(e=>taskOnDate_(e,context.date));
 const entriesMs=Date.now()-started,ids=new Set(entries.map(e=>e.id)),pattern=ids.size?'^('+Array.from(ids).join('|')+')$':'^$';
 const previewStarted=Date.now(),previewSheet=db.getSheetByName('Previews'),previews=ids.size&&previewSheet?objectsSearch_(previewSheet,['entryId','excerpt','updatedAt','richExcerpt'],1,pattern):[];const previewMap=new Map(previews.map(p=>[p.entryId,p]));entries.forEach(e=>{const p=previewMap.get(e.id);e.excerpt=p?p.excerpt:'';e.previewRich=p?readPreviewRuns_(p.richExcerpt):[];});
 const previewsMs=Date.now()-previewStarted,fileStarted=Date.now(),files=ids.size?objectsSearch_(db.getSheetByName('Files'),FILE_HEADERS,2,pattern):[],filesMs=Date.now()-fileStarted;
 const commonStarted=Date.now();
 const common=(context.commonFresh||context.deferCommon)?{}:{
    projects:cachedRows_(db.getSheetByName('Projects'),PROJECT_HEADERS),
    weeks:rows_(db.getSheetByName('Weeks'),WEEK_HEADERS),
    days:rows_(db.getSheetByName('Days'),DAY_HEADERS),
    goals:cachedRows_(db.getSheetByName('Goals'),GOAL_HEADERS),
    habits:cachedRows_(db.getSheetByName('Habits'),HABIT_HEADERS),
    taskPlans:cachedRows_(db.getSheetByName('TaskPlans'),PLAN_HEADERS),
    habitLogs:rows_(db.getSheetByName('HabitLogs'),LOG_HEADERS)
 };
 return {today,month,entries,files,...common,settings:reflectionSettings_(),...(allTags?{allTags}:{}),commonIncluded:!(context.commonFresh||context.deferCommon),driveConfigured:!!PropertiesService.getScriptProperties().getProperty('ROOT_ID'),performance:{traceId:context.traceId||'',entriesMs,previewsMs,filesMs,commonMs:Date.now()-commonStarted,totalMs:Date.now()-started}};
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
    const sheet=db.getSheetByName('Habits');ensureHabitHeaders_(sheet,true);const records=rows_(sheet,HABIT_HEADERS),index=records.findIndex(h=>h.id===p.id),old=index<0?null:records[index];if(p.id&&(!old||old.archived==='yes'||old.updatedAt!==p.updatedAt))throw new Error('Abitudine modificata altrove. Aggiorna e riprova.');const previous=old?habitSteps_(old.steps):[],titles=String(p.steps===undefined?previous.map(s=>s.title).join('\n'):p.steps).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(titles.length>30||titles.some(t=>t.length>500))throw new Error('Massimo 30 microazioni, ciascuna di 500 caratteri.');const used=new Set(),steps=titles.map((title,index)=>{const match=previous.find(s=>s.title===title&&!used.has(s.id))||previous[index];const id=match&&!used.has(match.id)?match.id:Utilities.getUuid();used.add(id);return {id,title};});const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0)).toISOString(),values=[old?old.id:Utilities.getUuid(),p.goalId,title,days.join(','),p.start,now,JSON.stringify(steps),'',p.icon===undefined?(old?old.icon||'':''):iconValue_(p.icon),p.description===undefined?(old?old.description||'':''):text_(p.description,6000)];if(old)writeRow_(sheet,index+2,values);else append_(sheet,[values]);return state_();
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
    ensureHabitHeaders_(sheet,true);if(p.habitUpdatedAt&&p.habitUpdatedAt!==habit.updatedAt)throw new Error('Abitudine modificata: aggiorna i passaggi.');const previous=i<0?null:habitChecklist_(records[i].checklist),steps=previous?previous.steps:habitSteps_(habit.steps),checked=Array.isArray(p.checked)?Array.from(new Set(p.checked)):previous?previous.checked:[];if(checked.some(id=>!steps.some(s=>s.id===id)))throw new Error('Microazione non valida.');if(steps.length&&p.status==='done'&&!steps.every(s=>checked.includes(s.id)))throw new Error('Completa tutte le microazioni prima di completare la pratica.');const status=steps.length&&p.status!=='skipped'?(steps.every(s=>checked.includes(s.id))?'done':'pending'):p.status;const values=[key,p.habitId,p.date,status,now,JSON.stringify({steps,checked})];if(i<0)append_(sheet,[values]);else writeRow_(sheet,i+2,values);return {delta:true,entries:[],commonIncluded:false,commonPatch:{habitLogs:rows_(sheet,LOG_HEADERS)}};
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
    const records=rows_(sheet,PROJECT_HEADERS),existing=records.find(p=>p.slug===slug);if(records.some(p=>p.slug!==slug&&p.name.toLowerCase()===name.toLowerCase()))throw new Error('Un altro progetto ha già questo nome.');if(existing){if(!payload.slug)throw new Error('Questo progetto esiste già.');if(existing.updatedAt!==payload.updatedAt)throw new Error('Progetto modificato altrove. Aggiorna e riprova.');writeRow_(sheet,records.indexOf(existing)+2,[slug,name,description,new Date(Math.max(Date.now(),Date.parse(existing.updatedAt)+1)).toISOString()]);}else append_(sheet,[[slug,name,description,new Date().toISOString()]]);
    return state_();
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
    writeRow_(sheet,index+2,ENTRY_HEADERS.map(h=>e[h]||''));return state_();
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
    if(!rows_(sheet,FILE_HEADERS).some(f=>f.entryId===payload.entryId&&f.fileId===match[1]))
      append_(sheet,[[Utilities.getUuid(),payload.entryId,match[1],title,url,new Date().toISOString()]]);
    return state_();
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
function saveDayImpl_(payload) {
  if (!payload || !validDate_(payload.date)) throw new Error('Data non valida.');
  const values={date:payload.date};
  ['intention','reflection',...DAY_EXTRA_HEADERS.filter(k=>!k.endsWith('Rich'))].forEach(k=>{if(Object.prototype.hasOwnProperty.call(payload,k))values[k]=text_(payload[k],6000);});
  for(const field of ['intention','reflection'])if(Object.prototype.hasOwnProperty.call(payload,field)){const key=field+'Rich';values[key]='';if(payload[key]!==undefined){const raw=String(payload[field]||'').replace(/\r\n?/g,'\n'),rich=validateRich_(payload[key],raw);const serial=JSON.stringify(rich);if(serial.length>45000)throw Error('Formattazione della riflessione troppo estesa.');values[key]=serial;}}
  return saveRecord_('Days',DAY_HEADERS,'date',values,payload.updatedAt);
}
function saveRecord_(name,headers,key,values,version) {
  return locked_(function(){
    const sheet=db_().getSheetByName(name), records=rows_(sheet,headers), index=records.findIndex(r=>r[key]===values[key]);
    const existing=index<0?null:records[index];
    if((existing?existing.updatedAt:'')!==(version||'')) throw new Error('Pagina modificata altrove. Conserva la bozza, aggiorna e riprova.');
    if(name==='Goals'){ensureGoalIconHeader_(sheet,true);values={...(existing||{}),...values};}
    if(name==='Days'){ensureDayHeaders_(sheet,true);values={...(existing||{}),...values};}
    values.updatedAt=new Date(Math.max(Date.now(),existing?Date.parse(existing.updatedAt)+1:0)).toISOString();
    if(index<0) append_(sheet,[headers.map(h=>values[h]||'')]);else writeRow_(sheet,index+2,headers.map(h=>values[h]||''));
    if(name==='Days'||name==='Weeks'){const data=records.map(r=>({...r}));const updated=Object.fromEntries(headers.map(h=>[h,values[h]||'']));if(index<0)data.push(updated);else data[index]=updated;const k=name==='Days'?'days':'weeks';return {delta:true,entries:[],[k]:data,commonPatch:{[k]:data},commonIncluded:false};}
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
function deleteHabit(p){ACTIVE_CONTEXT=p.context||{};return locked_(function(){const sheet=db_().getSheetByName('Habits'),records=rows_(sheet,HABIT_HEADERS),i=records.findIndex(h=>h.id===p.id);if(i<0||records[i].updatedAt!==p.updatedAt)throw new Error('Abitudine modificata altrove.');ensureHabitHeaders_(sheet,true);const h=records[i];h.archived='yes';h.updatedAt=new Date(Math.max(Date.now(),Date.parse(h.updatedAt)+1)).toISOString();writeRow_(sheet,i+2,HABIT_HEADERS.map(k=>h[k]||''));return state_();});}

const APP_ICONS=['🎯','🌱','❤️','🧠','💪','📚','💼','🧘','☀️','⭐','🏠','🤝','💰','🛡️','🔥'];
function iconValue_(value){if(value!==''&&value!=='none'&&!APP_ICONS.includes(value)&&!OUTLINE_ICON_IDS.includes(value))throw new Error('Icona non valida.');return value;}
function ensureGoalIconHeader_(sheet,write=false){const h=sheet.getRange(1,1,1,GOAL_HEADERS.length).getDisplayValues()[0];if(JSON.stringify(h.slice(0,7))!==JSON.stringify(GOAL_HEADERS.slice(0,7)))throw new Error('Intestazioni obiettivi non valide.');for(let k=7;k<GOAL_HEADERS.length;k++)if(h[k]&&h[k]!==GOAL_HEADERS[k])throw new Error('Colonne obiettivi occupate. Nessun dato modificato.');if(write&&h.slice(7).some(v=>!v))sheet.getRange(1,8,1,GOAL_HEADERS.length-7).setValues([GOAL_HEADERS.slice(7)]);}

const OUTLINE_ICON_IDS=["target", "plant", "heart", "brain", "strength", "book", "briefcase", "calm", "sun", "star", "home", "people", "wallet", "shield", "flame", "video", "check", "calendar", "clock", "flag", "compass", "mountain", "lightbulb", "pencil", "journal", "coffee", "moon", "music", "walk", "food", "water", "family", "message", "mail", "phone", "computer", "chart", "folder", "key", "sparkles"];

// Navigation is an eventually consistent read. It never prepares Docs or changes schema.
function readState_(){DB_HANDLE=null;ENTRY_SMALL_CACHE=null;ENTRY_TAG_HEADER_CHECKED=false;ENTRY_TAG_HEADER_WRITTEN=false;ioReset_();const result=state_();result.performance={...result.performance,lockWaitMs:0,readWithoutLock:true};return result;}
function tagCatalog_(){const sheet=db_().getSheetByName('Entries'),count=sheet.getLastRow()-1;if(count<=0)return [];return Array.from(new Set(sheet.getRange(2,ENTRY_HEADERS.indexOf('tags')+1,count,1).getDisplayValues().flatMap(row=>String(row[0]||'').split(',').filter(Boolean)))).sort();}
