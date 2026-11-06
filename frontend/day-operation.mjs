// Days wire snapshots match DAY_HEADERS except updatedAt. No browser globals.
export const DAY_FIELDS=['intention','reflection','gratitude','lifeArea','smallStep','meaningfulMoment','feelings','difficulties','learning','intentionRich','reflectionRich'];
const bad=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
export const validDayDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export const canonicalDayJSON=value=>JSON.stringify(value,(_,v)=>v&&Object.getPrototypeOf(v)===Object.prototype?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function daySnapshot(row){
 if(!validDayDate(row?.date))bad();const snapshot={date:row.date};
 for(const key of DAY_FIELDS){let value=row[key]??'';if(typeof value!=='string'||value.length>(key.endsWith('Rich')?45000:6000))bad();
  if(key.endsWith('Rich')&&value){let rich;try{rich=JSON.parse(value);}catch{bad();}if(!Array.isArray(rich)||rich.some(block=>!block||!Array.isArray(block.runs)||block.runs.some(run=>typeof run?.text!=='string'))||rich.map(block=>block.runs.map(run=>run.text).join('')).join('\n')!==(row[key.slice(0,-4)]||''))bad();value=canonicalDayJSON(rich);}
  snapshot[key]=value;
 }if(canonicalDayJSON(snapshot).length>29000)bad();return snapshot;
}
export function validDayOperation(payload,date,baseVersion,operationId){
 try{return (baseVersion===null||typeof baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(baseVersion)||Number.isFinite(Date.parse(baseVersion))&&new Date(baseVersion).toISOString()===baseVersion))&&/^[a-zA-Z0-9-]{10,80}$/.test(operationId)&&Object.keys(payload).sort().join(',')==='baseVersion,day,operationId'&&payload.operationId===operationId&&payload.baseVersion===baseVersion&&payload.day.date===date&&Object.keys(payload.day).sort().join(',')===['date',...DAY_FIELDS].sort().join(',')&&canonicalDayJSON(daySnapshot(payload.day))===canonicalDayJSON(payload.day);}catch{return false;}
}
