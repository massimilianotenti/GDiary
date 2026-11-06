import {validDayDate,canonicalDayJSON} from './day-operation.mjs';
export const WEEK_TEXT_FIELDS=['focus','priorities','wins','obstacles','lessons','next'];
export const WEEK_FIELDS=[...WEEK_TEXT_FIELDS,'energy','closed'];
const bad=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
export const validWeek=value=>validDayDate(value)&&new Date(value+'T12:00:00Z').getUTCDay()===1;
export function weekSnapshot(row){
 if(!validWeek(row?.week))bad();const snapshot={week:row.week};
 for(const key of WEEK_FIELDS){const value=row[key]??(key==='closed'?'no':'');if(typeof value!=='string'||value.length>6000||key==='energy'&&!['','1','2','3','4','5'].includes(value)||key==='closed'&&!['yes','no'].includes(value))bad();snapshot[key]=value;}
 if(canonicalDayJSON(snapshot).length>29000)bad();return snapshot;
}
export function validWeekOperation(payload,week,baseVersion,operationId){
 try{return (baseVersion===null||typeof baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(baseVersion)||Number.isFinite(Date.parse(baseVersion))&&new Date(baseVersion).toISOString()===baseVersion))&&/^[a-zA-Z0-9-]{10,80}$/.test(operationId)&&Object.keys(payload).sort().join(',')==='baseVersion,operationId,week'&&payload.operationId===operationId&&payload.baseVersion===baseVersion&&payload.week.week===week&&Object.keys(payload.week).sort().join(',')===['week',...WEEK_FIELDS].sort().join(',')&&canonicalDayJSON(weekSnapshot(payload.week))===canonicalDayJSON(payload.week);}catch{return false;}
}
