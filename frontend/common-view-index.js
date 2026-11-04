// Bounded acquisition-order index for independently stale common previews.
export const COMMON_VIEW_LIMIT=8;
export const COMMON_INDEX_FORMAT='common-journals/v1';
const invalid=()=>{throw Object.assign(new Error('SchemaError'),{name:'SchemaError'});};
export function commonViewDescriptors(coverage){
 let views;
 if(Object.hasOwn(coverage||{},'commonJournals')){
  const index=coverage.commonJournals;if(index===null)return [];
  if(!index||index.format!==COMMON_INDEX_FORMAT||!Array.isArray(index.views)||index.views.length>COMMON_VIEW_LIMIT)invalid();
  views=index.views;
 }else views=coverage?.commonJournal?[coverage.commonJournal]:[];
 if(new Set(views.map(view=>view?.key)).size!==views.length)invalid();
 for(const view of views){
  if(!view||!['common-journal/v1','common-period/v1'].includes(view.format)||typeof view.key!=='string'||view.key.length>4096||!Number.isSafeInteger(view.revision)||view.revision<0||!Number.isSafeInteger(view.savedAt)||view.savedAt<0||!Array.isArray(view.items)||view.items.length>500)invalid();
  let request;try{request=JSON.parse(view.key);}catch{invalid();}
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);if(!request||!(view.format==='common-journal/v1'&&Object.keys(request).join(',')==='kind,month,today'&&request.kind==='journal'&&typeof request.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(request.month)&&date(request.today)||view.format==='common-period/v1'&&((Object.keys(request).join(',')==='kind,week'&&request.kind==='week')||(Object.keys(request).join(',')==='kind,week,date'&&request.kind==='habits'&&date(request.date)))&&date(request.week)))invalid();
 }
 return views;
}
