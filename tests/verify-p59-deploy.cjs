const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.resolve(__dirname,'../tools/deploy.cjs'),'utf8');
function simulate(options={}){
 const calls=[],logs=[],root=path.resolve(__dirname,'..'),process={argv:['node','deploy.cjs',...(options.check?['--check']:[])],execPath:'node'};
 const files={'.clasp.json':JSON.stringify({scriptId:options.invalidId?'INSERISCI_LO_SCRIPT_ID':'a'.repeat(40),rootDir:'.build/apps-script'}),'.deploy.json':JSON.stringify({deploymentId:'b'.repeat(45),description:'P59'}),'DriveDocs.gs':options.placeholder?"const ROOT_FOLDER_ID = 'INCOLLA_ID_CARTELLA';":"const ROOT_FOLDER_ID = 'personal-root-id';",'appsscript.json':JSON.stringify({webapp:{access:'MYSELF',executeAs:'USER_DEPLOYING'}})};
 vm.runInNewContext(source,{__dirname:path.join(root,'tools'),process,console:{log:s=>logs.push(s),error:s=>logs.push(s)},require:name=>{
  if(name==='path')return path;
  if(name==='fs')return {readFileSync:file=>files[path.basename(file)]};
  if(name==='child_process')return {spawnSync:(exe,args)=>{calls.push(args);return {status:options.pushFails&&args[1]==='push'?1:0,stdout:JSON.stringify({versionNumber:options.badVersion?'invalid':17})};}};
  throw Error('Unexpected module '+name);
 }});
 return{calls,logs,exitCode:process.exitCode||0};
}
let r=simulate({check:true});assert.equal(r.exitCode,0);assert(r.calls.every(c=>!c[0].includes('@google/clasp')));assert(r.logs.some(s=>s.includes('Nessuna connessione Google')));
for(const options of [{invalidId:true},{placeholder:true},{pushFails:true},{badVersion:true}]){r=simulate(options);assert.equal(r.exitCode,1);assert(!r.calls.some(c=>c[1]==='create-deployment'));}
r=simulate();assert.equal(r.exitCode,0);let command=r.calls.find(c=>c[1]==='create-deployment');assert(command);assert.equal(command[command.indexOf('--deploymentId')+1],'b'.repeat(45));assert.equal(command[command.indexOf('--versionNumber')+1],'17');assert(r.calls.findIndex(c=>c.includes('push'))<r.calls.findIndex(c=>c.includes('create-version')));assert(r.calls.some(c=>c[0].endsWith('verify-p59-components.cjs')));
console.log('P59 deploy: dry run without Google, placeholders rejected, upload/version failures stop release, existing deployment retained (simulated CLI)');
