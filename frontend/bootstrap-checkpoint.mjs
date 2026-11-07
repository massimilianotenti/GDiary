// Versioned, optional canonical baseline. It never builds a server checkpoint.
const COLLECTIONS=['entries','projects','days','weeks','habitLogs','goals','habits','files','settings','layouts'];
const fail=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
const canonical=value=>value===null?'null':Array.isArray(value)?'['+value.map(canonical).join(',')+']':typeof value==='object'&&value?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)?JSON.stringify(value):fail();
const hash=async value=>{if(!globalThis.crypto?.subtle)throw Object.assign(Error('ProtocolUnavailable'),{name:'ProtocolUnavailable'});return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))].map(byte=>byte.toString(16).padStart(2,'0')).join('');};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const sameScope=(a,b)=>!!a&&Object.keys(a).sort().join(',')==='archiveId,epoch,principalId'&&['archiveId','epoch','principalId'].every(k=>a[k]===b[k]);
const validCounts=counts=>counts&&Object.keys(counts).sort().join(',')===COLLECTIONS.slice().sort().join(',')&&COLLECTIONS.every(c=>{const x=counts[c];return x&&Object.keys(x).sort().join(',')==='live,records,tombstones'&&['live','records','tombstones'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=8192)&&x.live+x.tombstones===x.records;});
export async function discoverBootstrapCheckpoint({manifest,scope,call,check}){
 if(manifest.capabilities?.bootstrapCheckpoint!==true)return null;
 const response=await call('getBootstrapCheckpoint',{});check();if(response?.available===false&&Object.keys(response).join(',')==='available')return null;if(response?.available!==true||!response.manifest)fail();
 const m=response.manifest,{digest:sum,...core}=m;
 if(Object.keys(m).sort().join(',')!==['format','scope','generation','sequence','cursor','pages','records','counts','seed','root','digest'].sort().join(',')||m.format!=='sync-bootstrap-manifest/v1'||!sameScope(m.scope,scope)||typeof m.generation!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(m.generation)||!Number.isSafeInteger(m.sequence)||m.sequence<0||!Number.isSafeInteger(m.pages)||m.pages<0||m.pages>8192||!Number.isSafeInteger(m.records)||m.records<0||m.records>8192||m.pages>m.records||!validCounts(m.counts)||Object.values(m.counts).reduce((n,c)=>n+c.records,0)!==m.records||!digest(m.seed)||!digest(m.root)||!digest(sum)||m.cursor?.format!=='sync-cursor/v1'||Object.keys(m.cursor).sort().join(',')!=='archiveId,epoch,format,principalId,sequence'||!['archiveId','epoch','principalId'].every(k=>m.cursor[k]===scope[k])||m.cursor.sequence!==m.sequence||await hash(core)!==sum)fail();
 const expectedSeed=await hash({format:'sync-bootstrap-chain/v1',scope:{archiveId:scope.archiveId,epoch:scope.epoch,principalId:scope.principalId},generation:m.generation,sequence:m.sequence});check();if(m.seed!==expectedSeed||m.pages===0&&(m.records!==0||m.root!==m.seed))fail();return structuredClone(m);
}
export async function applyBootstrapCheckpoint({manifest:m,scope,call,check,repository,revision,normalize}){
 let chain=m.seed,total=0;const seen=new Set(),contentIds=new Set(),counts=Object.fromEntries(COLLECTIONS.map(c=>[c,{records:0,live:0,tombstones:0}]));
 for(let index=0;index<m.pages;index++){
  check();const p=await call('getBootstrapCheckpointPage',{generation:m.generation,digest:m.digest,index});check();
  if(!p||Object.keys(p).sort().join(',')!==['format','scope','generation','sequence','index','previousDigest','items','digest','manifestDigest','hasMore','nextIndex','bytes'].sort().join(',')||p.format!=='sync-bootstrap-page/v1'||!sameScope(p.scope,scope)||p.generation!==m.generation||p.sequence!==m.sequence||p.index!==index||p.manifestDigest!==m.digest||p.previousDigest!==chain||!Array.isArray(p.items)||!p.items.length||p.items.length>25||p.hasMore!==(index+1<m.pages)||p.nextIndex!==(index+1<m.pages?index+1:null)||!Number.isSafeInteger(p.bytes)||p.bytes>131072||new TextEncoder().encode(canonical(p)).length!==p.bytes)fail();
  const {digest:sum,manifestDigest,hasMore,nextIndex,bytes,...core}=p;if(!digest(sum)||await hash(core)!==sum)fail();check();
  const entries=[],commonUpserts={},commonRemovals={},deletedEntryIds=[];
  for(const item of p.items){
   if(!item||Object.keys(item).some(k=>!['collection','id','sequence','version','deleted','data','content'].includes(k))||!COLLECTIONS.includes(item.collection)||!id(item.id)||!Number.isSafeInteger(item.sequence)||item.sequence<1||item.sequence>m.sequence||item.version!=='commit-'+item.sequence||typeof item.deleted!=='boolean'||(item.deleted?item.data!==null:!item.data||typeof item.data!=='object'||Array.isArray(item.data)))fail();
   const token=JSON.stringify([item.collection,item.id]);if(seen.has(token))fail();seen.add(token);total++;const c=counts[item.collection];c.records++;c[item.deleted?'tombstones':'live']++;
   if(item.collection==='entries'){
    if(item.deleted)deletedEntryIds.push(item.id);else{const row=normalize('entries',item.data);if(row.id!==item.id||row.updatedAt!==item.version)fail();entries.push(row);if(row.contentVersion)contentIds.add(row.id);}continue;
   }
   if(item.deleted)(commonRemovals[item.collection]||(commonRemovals[item.collection]=[])).push(item.id);
   else{const row=normalize(item.collection,item.data),key=item.collection==='projects'?'slug':item.collection==='days'?'date':item.collection==='weeks'?'week':item.collection==='habitLogs'?'key':item.collection==='layouts'?'entryId':'id',version=['layouts','settings'].includes(item.collection)?row.version:row.updatedAt;if(row[key]!==item.id||version!==item.version)fail();(commonUpserts[item.collection]||(commonUpserts[item.collection]=[])).push(row);}
   if(Object.hasOwn(item,'content')){
    if(item.collection!=='layouts'||item.content!==null&&(!item.content||typeof item.content.version!=='string'||!item.content.version||!digest(item.content.digest)))fail();
    let entry=entries.find(row=>row.id===item.id);if(!entry){const found=await repository.getEntry(item.id);check();if(!found.ok)throw Object.assign(Error(found.error),{name:found.error});entry=found.value&&structuredClone(found.value);}
    const metadataSequence=Number(/^commit-([1-9][0-9]{0,15})$/.exec(entry?.updatedAt)?.[1]||0);
    if(entry&&!deletedEntryIds.includes(item.id)&&metadataSequence<=item.sequence){entry.contentVersion=item.content?.version||null;entry.contentDigest=item.content?.digest||null;entry.position=item.deleted?null:item.data.position;if(!entries.includes(entry))entries.push(entry);if(entry.contentVersion)contentIds.add(entry.id);}
   }
  }
  check();const saved=await repository.applyRemoteBatch({expectedRevision:revision,cursor:m.cursor,entries,commonUpserts,commonRemovals,deletedEntryIds,coverage:{consumer:{format:'sync-consumer/v1',checkpoint:{generation:m.generation,sequence:m.sequence,digest:m.digest,verifiedPages:index+1},complete:false}}});check();if(!saved.ok)throw Object.assign(Error(saved.error),{name:saved.error});revision=saved.value.revision;chain=sum;
 }
 if(chain!==m.root||total!==m.records||canonical(counts)!==canonical(m.counts))fail();return {revision,contentIds:[...contentIds],pages:m.pages,records:total};
}
