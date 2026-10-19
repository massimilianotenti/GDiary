const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);vm.runInContext(`{
const block={clientId:'archive-body-fixture',date:'2026-10-14',type:'note',title:'Titolo neutro',body:'Una parola SOLO_NEL_CORPO importante',rich:plainRich_('Una parola SOLO_NEL_CORPO importante'),projects:'',tags:'',originalBody:'',originalRich:[],updatedAt:'',position:1};
const saved=saveJournalPage({month:'2026-10',blocks:[block]}).entries[0];
if(!searchArchive({query:'solo_nel_corpo',cursor:0}).entries.some(e=>e.id===saved.id))throw Error('pending body missing');
processTaskDocQueue();if(!searchArchive({query:'solo_nel_corpo',cursor:0}).entries.some(e=>e.id===saved.id))throw Error('consolidated body missing');
const current=getJournalPage({month:'2026-10'}).entries.find(e=>e.id===saved.id);saveJournalPage({month:'2026-10',blocks:[{...current,clientId:current.id,title:current.text,body:'TESTO_NUOVO',rich:plainRich_('TESTO_NUOVO'),originalBody:current.body,originalRich:current.rich}]});
if(!searchArchive({query:'testo_nuovo',cursor:0}).entries.some(e=>e.id===saved.id))throw Error('pending edit missing');if(searchArchive({query:'solo_nel_corpo',cursor:0}).entries.some(e=>e.id===saved.id))throw Error('stale Doc matched');
}`,ctx);console.log('P72: body-only match before/after Docs consolidation, pending edit and stale Docs exclusion OK');
