// Bounded acquisition-order index. Reading a preview does not write storage.
export const JOURNAL_PAGE_LIMIT=16;
export const JOURNAL_INDEX_FORMAT='journal-pages/v1';
const invalid=()=>{throw Object.assign(new Error('SchemaError'),{name:'SchemaError'});};
export function journalPageDescriptors(coverage){
 let pages;
 if(Object.hasOwn(coverage||{},'journalPages')){
  const index=coverage.journalPages;if(index===null)return [];
  if(!index||index.format!==JOURNAL_INDEX_FORMAT||!Array.isArray(index.pages)||index.pages.length>JOURNAL_PAGE_LIMIT)invalid();
  pages=index.pages;
 }else pages=coverage?.journalPage?[coverage.journalPage]:[];
 if(new Set(pages.map(page=>page?.key)).size!==pages.length)invalid();
 for(const page of pages){
  if(!page||page.format!=='journal-page/v1'||typeof page.key!=='string'||page.key.length>4096||!Number.isSafeInteger(page.revision)||page.revision<0||!Number.isSafeInteger(page.savedAt)||page.savedAt<0||!Array.isArray(page.items)||page.items.length>25||new Set(page.items.map(item=>item?.id)).size!==page.items.length)invalid();
  let request;try{request=JSON.parse(page.key);}catch{invalid();}
  if(!request||Object.keys(request).join(',')!=='month,project,cursor'||typeof request.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(request.month)||typeof request.project!=='string'||request.project.length>200||typeof request.cursor!=='string'||request.cursor.length>200)invalid();
  for(const item of page.items)if(typeof item?.id!=='string'||!item.id||item.id.length>200||typeof item.version!=='string'||!(/^commit-[1-9][0-9]{0,15}$/.test(item.version)||Number.isFinite(Date.parse(item.version))&&new Date(item.version).toISOString()===item.version))invalid();
 }
 return pages;
}
