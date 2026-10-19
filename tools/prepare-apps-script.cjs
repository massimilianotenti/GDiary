// Prepare a deployable allowlist. This script never connects to Google or deploys.
const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'..');
const out=path.join(base,'.build','apps-script');
const names=['Code.gs','DriveDocs.gs','JournalEditor.gs','Index.html','Changelog.html','appsscript.json'];
const rootId=process.env.ROOT_FOLDER_ID;
if(rootId&&!/^[a-zA-Z0-9_-]{10,200}$/.test(rootId))throw Error('ROOT_FOLDER_ID non valido.');
fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(out)){if(!names.includes(name))throw Error('File inatteso nello staging: '+name+'. Non sarà pubblicato automaticamente.');}
for(const name of names){let text=fs.readFileSync(path.join(base,name),'utf8');if(name==='DriveDocs.gs'&&rootId)text=text.replace(/const ROOT_FOLDER_ID = '[^']*';/,"const ROOT_FOLDER_ID = '"+rootId+"';");fs.writeFileSync(path.join(out,name),text);}
JSON.parse(fs.readFileSync(path.join(out,'appsscript.json'),'utf8'));
console.log('Preparati '+names.length+' file in .build/apps-script. Nessun upload o deployment eseguito.');
