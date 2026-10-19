const fs=require('fs'),vm=require('vm');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
function check(v,m){if(!v)throw Error(m);}function rejects(fn){try{fn();}catch(e){return;}throw Error('expected rejection');}
const base={date:'2026-10-14',type:'note',title:'',body:'Titolo automatico\\nSeconda riga',projects:'',tags:'',position:1024,originalBody:'',originalRich:[]};base.rich=plainRich_(base.body);
const payload={...base,clientId:'editor-edge-autotitle-001'};
let e=saveJournalPage({month:'2026-10',blocks:[payload]}).entries[0];check(e.editorAutoTitle&&e.text==='Titolo automatico','auto title');
// A failure after content persistence but before queue creation is repairable by retrying the same creation.
let q=taskDocQueue_(),rows=ioRows_(q,4),i=rows.findIndex(r=>r[0]===e.id);q.deleteRow(i+2);ioInvalidate_(q);
check(!queuedTask_(e.id),'missing queue simulated');saveJournalPage({month:'2026-10',blocks:[payload]});check(queuedTask_(e.id),'missing queue repaired');
processTaskDocQueue();const ref=ref_(e.id);e=getJournalPage({month:'2026-10'}).entries.find(x=>x.id===e.id);
let opens=0;const open=DocumentApp.openById;DocumentApp.openById=id=>{opens++;return open(id);};
let task={...base,clientId:'editor-edge-task-0001',type:'task',title:'Task metadati',body:'Descrizione',rich:plainRich_('Descrizione'),status:'open',importance:'normal',position:2048};
let t=saveJournalPage({month:'2026-10',blocks:[task]}).entries[0];check(opens===0,'task create no Docs');processTaskDocQueue();t=getJournalPage({month:'2026-10'}).entries.find(x=>x.id===t.id);
opens=0;let edit={...t,clientId:t.id,title:t.text,originalBody:t.body,originalRich:t.rich,status:'done',importance:'emergency',plannedDate:'2026-10-16'};
t=saveJournalPage({month:'2026-10',blocks:[edit]}).entries[0];check(opens===0&&!queuedTask_(t.id),'metadata-only no Docs queue');check(t.status==='done'&&t.completedAt&&t.importance==='emergency'&&t.plannedDate==='2026-10-16','metadata persisted');
// External heading modifications are detected rather than overwritten.
e=getJournalPage({month:'2026-10'}).entries.find(x=>x.id===e.id);const body=open(ref.docId).getBody(),section=sectionRich_(ref,body);body.getChild(section.sectionStart-1).setText('Titolo esterno');
saveJournalPage({month:'2026-10',blocks:[{...e,clientId:e.id,title:'Titolo app',autoTitle:false,originalBody:e.body,originalRich:e.rich}]});
processTaskDocQueue();check(getDocQueueState().items.some(x=>x.id===e.id&&x.status==='error'&&/titolo/.test(x.error)),'external heading conflict');check(body.getChild(section.sectionStart-1).getText()==='Titolo esterno','external heading preserved');
// Pagination and scoped reads retain stable identities and do not change data.
for(let batch=0;batch<2;batch++)saveJournalPage({month:'2026-10',blocks:Array.from({length:20},(_,i)=>({...base,clientId:'editor-page-'+batch+'-'+String(i).padStart(4,'0'),title:'Pagina '+batch+' '+i,projects:i%2?'miniconf':'',position:10000+batch*20000+i*1024}))});
let page=getJournalPage({month:'2026-10'}),ids=page.entries.map(x=>x.id);check(ids.length===25&&page.nextCursor&&page.nextEntry,'first page capped');
while(page.nextCursor){page=getJournalPage({month:'2026-10',cursor:page.nextCursor});ids.push(...page.entries.map(x=>x.id));}check(new Set(ids).size===ids.length,'pagination no duplicates');check(ids.length===editorRows_('2026-10').length,'pagination complete');
let scoped=getJournalPage({month:'2026-10',project:'miniconf'});check(scoped.total===20&&scoped.entries.every(x=>x.projects.split(',').includes('miniconf')),'project scope');
rejects(()=>getJournalPage({month:'2026-10',cursor:'missing-id'}));
}`,ctx);
console.log('P55 edges: auto title, missing queue recovery, metadata-only save, heading conflict, pagination/project scope OK');
