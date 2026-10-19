const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
function check(v,m){if(!v)throw Error(m);}function failure(payload,pattern){try{saveJournalPage(payload);}catch(e){check(pattern.test(e.message),'unexpected validation: '+e.message);return;}throw Error('expected rejection');}
const note={clientId:'validation-note-00001',date:'2026-10-14',type:'note',title:'',body:'Una nota senza titolo\\nUn secondo paragrafo',projects:'',tags:'',position:1024};note.rich=plainRich_(note.body);
let result=saveJournalPage({month:'2026-10',blocks:[note]});check(result.entries[0].text==='Una nota senza titolo','note title optional');
const task={...note,clientId:'validation-task-00001',type:'task',title:'Task da correggere\\nSeconda riga',body:'Descrizione',rich:plainRich_('Descrizione'),status:'open',importance:'normal'};
failure({month:'2026-10',blocks:[task]},/Task.*Task da correggere.*a capo/s);
failure({month:'2026-10',blocks:[{...task,title:''}]},/compila il titolo del task/);
failure({month:'2026-10',blocks:[{...note,clientId:'validation-empty-0001',body:'',rich:plainRich_('')}]},/scrivi il testo oppure un titolo/);
const before=editorRows_('2026-10').length;
failure({month:'2026-10',blocks:[{...note,clientId:'validation-batch-0001'},task]},/a capo/);check(editorRows_('2026-10').length===before,'invalid batch has no writes');
result=saveJournalPage({month:'2026-10',blocks:[{...task,title:'Task corretto'}]});check(result.entries[0].text==='Task corretto','corrected task saves');
}`,ctx);
console.log('P58 validation: optional note title, identified task newline, required task title, empty note and prevalidation without writes OK');
