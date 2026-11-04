const MAX_TEXT=250000;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const validVersion=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const clone=value=>structuredClone(value);
const compareVersion=(a,b)=>{const ac=/^commit-([1-9][0-9]{0,15})$/.exec(a),bc=/^commit-([1-9][0-9]{0,15})$/.exec(b);if(ac&&bc){const x=Number(ac[1]),y=Number(bc[1]);return x===y?0:x<y?-1:1;}if(ac)return 1;if(bc)return -1;const x=Date.parse(a),y=Date.parse(b);return Number.isFinite(x)&&Number.isFinite(y)?x===y?0:x<y?-1:1:0;};
const grams=text=>{const values=new Set();for(let i=0;i<=text.length-3;i++)values.add(text.slice(i,i+3));return values;};
const projectsOf=(entry,draft)=>[...new Set([entry?.projects,draft?.snapshot?.projects].flatMap(value=>String(value||'').split(',').map(item=>item.trim()).filter(Boolean)))];
const draftSearchValues=draft=>draft?[draft.snapshot?.title||'',draft.snapshot?.text||'',draft.snapshot?.body||'',draft.snapshot?.tags||'',draft.snapshot?.projects||'']:[];
const validDraft=draft=>draft===undefined||!!draft&&['note','task'].includes(draft.kind)&&(draft.baseVersion===''||validVersion(draft.baseVersion))&&Number.isSafeInteger(draft.localRevision)&&draft.localRevision>0&&draft.snapshot&&Object.prototype.toString.call(draft.snapshot)==='[object Object]'&&['title','text','body','tags','projects'].every(key=>draft.snapshot[key]===undefined||typeof draft.snapshot[key]==='string'&&draft.snapshot[key].length<=MAX_TEXT)&&JSON.stringify(draft.snapshot).length<=524288;
const searchText=({entry,content,files,projectNames,pendingDraft})=>[
 entry.text||'',content?.body||'',entry.tags||'',entry.projects||'',entry.date||'',
 ...(Array.isArray(projectNames)?projectNames:[]),
 ...(Array.isArray(files)?files.map(file=>file?.title||''):[]),
 ...draftSearchValues(pendingDraft)
].join(' ').toLowerCase();

// In-memory n-gram candidate index. The original joined text is always checked
// after candidate selection, preserving the UI's substring-search semantics.
export function createLocalSearchIndex(){
 const documents=new Map(),postings=new Map(),projects=new Map();let coverage={complete:false,fresh:false,cursor:null};
 function remove(id){const prior=documents.get(id);if(!prior)return false;for(const gram of prior.grams){const ids=postings.get(gram);ids?.delete(id);if(!ids?.size)postings.delete(gram);}for(const slug of projectsOf(prior.entry,prior.pendingDraft)){const ids=projects.get(slug);ids?.delete(id);if(!ids?.size)projects.delete(slug);}documents.delete(id);return true;}
 function upsert(input){
  if(!input||!validId(input.id)||!validVersion(input.version)||!input.entry||input.entry.id!==input.id||!Array.isArray(input.files||[])||!(input.projectNames===undefined||Array.isArray(input.projectNames))||!validDraft(input.pendingDraft))return {ok:false,error:'DataError'};
  if(input.content&&input.content.id!==undefined&&input.content.id!==input.id)return {ok:false,error:'DataError'};
  const text=searchText({...input,files:input.files||[]});if(text.length>MAX_TEXT)return {ok:false,error:'DataError'};
  const prior=documents.get(input.id);if(prior&&compareVersion(input.version,prior.version)<0)return {ok:true,value:{id:input.id,version:prior.version,stale:true}};
  remove(input.id);const item={id:input.id,version:input.version,entry:clone(input.entry),content:input.content?clone(input.content):null,files:clone(input.files||[]),projectNames:clone(input.projectNames||[]),...(input.pendingDraft?{pendingDraft:clone(input.pendingDraft)}:{}),text},indexed=grams(text);
  documents.set(item.id,{...item,grams:indexed});for(const gram of indexed){let ids=postings.get(gram);if(!ids)postings.set(gram,ids=new Set());ids.add(item.id);}for(const slug of projectsOf(item.entry,item.pendingDraft)){let ids=projects.get(slug);if(!ids)projects.set(slug,ids=new Set());ids.add(item.id);}return {ok:true,value:{id:item.id,version:item.version,indexedGrams:indexed.size}};
 }
 return Object.freeze({
  upsert,
  remove:id=>validId(id)?{ok:true,value:remove(id)}:{ok:false,error:'DataError'},
  getDocument:id=>{const document=documents.get(id);if(!document)return null;const {grams:ignored,...copy}=document;return clone(copy);},
  exportDocuments:()=>[...documents.values()].map(({grams:ignored,...document})=>clone(document)),
  projectIds:slug=>typeof slug==='string'&&slug.length<=200?[...(projects.get(slug)||[])]:[],
  restore(snapshot){if(!snapshot||!Array.isArray(snapshot.documents)||!snapshot.coverage)return {ok:false,error:'DataError'};documents.clear();postings.clear();projects.clear();for(const document of snapshot.documents){const result=upsert(document);if(!result.ok)return result;}return this.setCoverage(snapshot.coverage);},
  setCoverage(value){if(!value||typeof value.complete!=='boolean'||value.fresh!==undefined&&typeof value.fresh!=='boolean'||!(value.cursor===null||typeof value.cursor==='string'||value.cursor&&Object.getPrototypeOf(value.cursor)===Object.prototype))return {ok:false,error:'DataError'};coverage={fresh:false,...clone(value)};return {ok:true,value:clone(coverage)};},
  status:()=>({documents:documents.size,...clone(coverage)}),
  search(query,{limit=100,visible=()=>true,candidateIds}={}){
   if(typeof query!=='string'||!Number.isSafeInteger(limit)||limit<1||limit>1000||typeof visible!=='function'||candidateIds!==undefined&&(!Array.isArray(candidateIds)||candidateIds.length>100000||candidateIds.some(id=>!validId(id))))return {ok:false,error:'DataError'};
   const needle=query.toLowerCase(),candidates=candidateIds!==undefined?candidateIds:needle.length<3?documents.keys():[...grams(needle)].reduce((smallest,gram)=>{const ids=postings.get(gram);if(!ids)return [];return !smallest||ids.size<smallest.size?ids:smallest;},null)||[];
   const result=[];for(const id of candidates){const document=documents.get(id);if(document?.text.includes(needle)&&visible(clone(document.pendingDraft?{...document.entry,pendingDraft:document.pendingDraft}:document.entry))){const {grams:ignored,...copy}=document;result.push(clone(copy));if(result.length===limit)break;}}
   return {ok:true,value:{query,results:result,complete:coverage.complete,fresh:coverage.fresh===true,cursor:clone(coverage.cursor),indexedDocuments:documents.size}};
  }
 });
}
