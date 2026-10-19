const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read('frontend/shell.html');
const js='/*\n'+read('THIRD-PARTY-NOTICES.md')+'\n*/\n'+read('.build/frontend/diary.js');
// Keep the compiled library opaque to HTML Service's HTML processing.
// Decode UTF-8 in the browser and execute a normal script, without eval.
const encoded=Buffer.from(js,'utf8').toString('base64').match(/.{1,1000}/g);
const bootstrap=`(function(){
function report(error){console.error('Avvio Vue:',error);window.bulletJournalBootError=String(error.message||error);function show(){var box=document.createElement('div');box.setAttribute('role','alert');box.style.cssText='padding:16px;margin:16px;border:1px solid #d89b8e;background:#fff3ef;color:#8d3227;font:14px system-ui';box.textContent='Avvio interfaccia non completato: '+window.bulletJournalBootError;document.body.prepend(box);}if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});}
try{var source=[\n${encoded.map(s=>JSON.stringify(s)).join(',\n')}\n].join('');var bytes=Uint8Array.from(atob(source),function(c){return c.charCodeAt(0);});var script=document.createElement('script');script.dataset.bulletJournalVue='true';script.textContent=new TextDecoder('utf-8',{fatal:true}).decode(bytes);document.head.appendChild(script);if(!window.BulletJournalVue)throw new Error('Il modulo Vue non è stato inizializzato.');}catch(error){report(error);}
})();`;
const css=fs.readdirSync(path.join(root,'.build/frontend')).filter(n=>n.endsWith('.css')).map(n=>read('.build/frontend/'+n)).join('\n');
html=html.replace('</head>',()=>'<style>'+css+'</style>\n</head>');
// Run after the static interface exists, before the application starts.
html=html.replace('<script>',()=>'<script>'+bootstrap+'</script>\n<script>');
fs.writeFileSync(path.join(root,'Index.html'),html);
// Keep the mock backend as the first script, so backend tests remain independent.
const demo=read('Demo.html'),mock=demo.match(/<script>([\s\S]*?)<\/script>/)[1];
const start=mock.indexOf('let DB_HANDLE='),end=mock.indexOf('function getAppChangelog(){return fetch(');
if(start<0||end<0)throw Error('Demo backend boundary not found');
const backend=['Code.gs','DriveDocs.gs','JournalEditor.gs'].map(n=>read(n).replace("const ROOT_FOLDER_ID = 'INCOLLA_ID_CARTELLA';","const ROOT_FOLDER_ID = 'mock-root-123456';")).join('\n');
const fullMock=mock.slice(0,start)+backend+'\n'+mock.slice(end);
html=html.replace('<script>',()=>'<script>'+fullMock+'</script>\n<script>');
fs.writeFileSync(path.join(root,'Demo.html'),html);
console.log('Vue e stili incorporati in Index.html; Demo.html aggiornata.');
