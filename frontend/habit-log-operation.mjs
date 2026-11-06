import {validDayDate,canonicalDayJSON} from './day-operation.mjs';
export const LOG_FIELDS=['habitId','date','status','checklist'];
const bad=()=>{throw Object.assign(Error('DataError'),{name:'DataError'});};
export const validLogKey=key=>typeof key==='string'&&key.length<=200&&key.lastIndexOf('|')>0&&!/[|\u0000-\u001f\u007f]/.test(key.slice(0,key.lastIndexOf('|')))&&key.slice(0,key.lastIndexOf('|')).trim()!==''&&validDayDate(key.slice(key.lastIndexOf('|')+1));
export function logSnapshot(row){
 if(!row||['key',...LOG_FIELDS].some(key=>typeof row[key]!=='string')||!validLogKey(row?.key)||row.key!==row.habitId+'|'+row.date||!['done','pending','skipped'].includes(row.status)||typeof row.checklist!=='string'||row.checklist.length>32768)bad();
 let list;try{list=JSON.parse(row.checklist);}catch{bad();}
 if(!list||Object.keys(list).sort().join(',')!=='checked,steps'||!Array.isArray(list.steps)||list.steps.length>30||!Array.isArray(list.checked)||list.checked.length>30)bad();
 const ids=new Set();for(const step of list.steps){if(!step||Object.keys(step).sort().join(',')!=='id,title'||typeof step.id!=='string'||!step.id.trim()||/[\u0000-\u001f\u007f]/.test(step.id)||step.id.length>200||typeof step.title!=='string'||!step.title.trim()||step.title.length>500||ids.has(step.id))bad();ids.add(step.id);}
 if(list.checked.some(id=>typeof id!=='string'||!ids.has(id))||new Set(list.checked).size!==list.checked.length||list.steps.length&&row.status!=='skipped'&&row.status!==(list.steps.length===list.checked.length?'done':'pending'))bad();
 const result={key:row.key,habitId:row.habitId,date:row.date,status:row.status,checklist:canonicalDayJSON(list)};if(canonicalDayJSON(result).length>27000)bad();return result;
}
export function validLogOperation(payload,key,baseVersion,operationId){
 try{return (baseVersion===null||typeof baseVersion==='string'&&(/^commit-[1-9][0-9]{0,15}$/.test(baseVersion)||Number.isFinite(Date.parse(baseVersion))&&new Date(baseVersion).toISOString()===baseVersion))&&/^[a-zA-Z0-9-]{10,80}$/.test(operationId)&&!operationId.startsWith('hl-reserve-')&&Object.keys(payload).sort().join(',')==='baseVersion,habitUpdatedAt,log,operationId'&&typeof payload.habitUpdatedAt==='string'&&payload.habitUpdatedAt.length<=200&&payload.operationId===operationId&&payload.baseVersion===baseVersion&&payload.log.key===key&&Object.keys(payload.log).sort().join(',')===['key',...LOG_FIELDS].sort().join(',')&&canonicalDayJSON(logSnapshot(payload.log))===canonicalDayJSON(payload.log);}catch{return false;}
}
