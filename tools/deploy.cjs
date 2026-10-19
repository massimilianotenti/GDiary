// Explicit release command. --check performs local checks only; never uploads.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
function read(name){try{return JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));}catch(error){if(error.code==='ENOENT'&&['.clasp.json','.deploy.json'].includes(name))throw Error(name+' mancante: copiare il file .example corrispondente e impostare gli identificativi personali.');throw error;}}
function run(script,args=[],json=false){
 const result=spawnSync(process.execPath,[path.join(root,script),...args],{cwd:root,encoding:'utf8',stdio:json?['ignore','pipe','inherit']:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)throw Error('Comando interrotto: '+script);
 if(json){try{return JSON.parse(result.stdout);}catch{throw Error('Risposta JSON clasp non valida; deployment non aggiornato.');}}
}
function main(){try{
 const clasp=read('.clasp.json'),deployment=read('.deploy.json');
 if(!/^[\w-]{20,200}$/.test(clasp.scriptId||'')||clasp.scriptId.includes('INSERISCI'))throw Error('Impostare lo Script ID in .clasp.json.');
 if(path.resolve(root,clasp.rootDir||'')!==path.join(root,'.build','apps-script'))throw Error('rootDir deve essere .build/apps-script.');
 if(!/^[\w-]{20,250}$/.test(deployment.deploymentId||'')||deployment.deploymentId.includes('INSERISCI'))throw Error('Impostare il deployment esistente in .deploy.json.');
 const description=String(deployment.description||'Bullet Journal P61');
 run('node_modules/vite/bin/vite.js',['build']);run('tools/assemble-frontend.cjs');run('tools/prepare-apps-script.cjs');
 const drive=fs.readFileSync(path.join(root,'.build/apps-script/DriveDocs.gs'),'utf8');
 if(drive.includes("const ROOT_FOLDER_ID = 'INCOLLA_ID_CARTELLA';"))throw Error('Conservare il ROOT_FOLDER_ID personale oppure passarlo come variabile di ambiente prima del deploy.');
 const manifest=read('.build/apps-script/appsscript.json');
 if(manifest.webapp?.access!=='MYSELF'||manifest.webapp?.executeAs!=='USER_DEPLOYING')throw Error('Il manifest deve mantenere il deployment personale privato.');
 for(const test of ['verify-p58-validation.cjs','verify-p55.cjs','verify-p55-edges.cjs','verify-p59-build.cjs','verify-p59-deploy.cjs'])run('tests/'+test);
 if(check){console.log('Controlli locali completati. Nessuna connessione Google, autenticazione o pubblicazione.');return;}
 run('tests/verify-p60-browser.cjs');
 run('tests/verify-p59-components.cjs');
 run('tests/verify-p60-interface.cjs');
 run('tests/verify-p601-boot.cjs');
 run('tests/verify-p61-theme.cjs');
 run('tests/verify-p62-cache.cjs');
 run('tests/verify-p62-notes.cjs');
 run('tests/verify-p63-metadata.cjs');
 run('tests/verify-p64-layout-drafts.cjs');
 run('tests/verify-p65-palettes.cjs');
 run('tests/verify-p66-title.cjs');
 run('tests/verify-p66-properties.cjs');
 run('tests/verify-p68-rich.cjs');
 run('tests/verify-p68-editor.cjs');
 run('tests/verify-p68-format-controls.cjs');
 run('tests/verify-p69-caret.cjs');
 run('tests/verify-p71-backend.cjs');
 run('tests/verify-p70-privacy.cjs');
 run('tests/verify-p71-daily.cjs');
 const cli='node_modules/@google/clasp/build/src/index.js';
 console.log('Pubblicazione dei sei file preparati nel progetto configurato.');
 run(cli,['push','--force']);
 const version=run(cli,['--json','create-version',description],true);
 if(!Number.isInteger(version.versionNumber)||version.versionNumber<1)throw Error('Numero di versione non valido: deployment non aggiornato.');
 run(cli,['create-deployment','--deploymentId',deployment.deploymentId,'--versionNumber',String(version.versionNumber),'--description',description]);
 console.log('Deployment esistente aggiornato alla versione '+version.versionNumber+'. Verificare la web app autenticata.');
}catch(error){console.error('Deploy non completato: '+error.message);process.exitCode=1;}}
main();
