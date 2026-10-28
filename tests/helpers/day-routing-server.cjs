// Synthetic Apps Script server shared by V8 and browser tests. Never Google.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createFaultSheets}=require('./fault-sheets.cjs'),{seal}=require('./recoverable-commit-store.cjs');
const backend=fs.readFileSync(path.resolve(__dirname,'../../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],copy=value=>JSON.parse(JSON.stringify(value));
function createDayRoutingServer(snapshot,options={}){
 const ledger=createFaultSheets(snapshot?.ledger),ctx=vm.createContext({window:{},document:{addEventListener(){}},setTimeout,console});vm.runInContext(backend,ctx);
 if(snapshot){
  ctx.restored=copy(snapshot);vm.runInContext('Object.assign(mockProps,restored.props);restored.users.forEach(([key,value])=>mockUserProperties.set(key,value));if(restored.rawSheets)Object.entries(restored.rawSheets).forEach(([name,data])=>{(mockSheets[name]||db.insertSheet(name)).data=data;});mockSheets.Days.data=restored.days;',ctx);
 }else for(const seed of options.seedDays||[{date:'2026-10-28',reflection:'Riga originaria sintetica'}]){
  ctx.seed=seed;vm.runInContext('saveDay({...seed,updatedAt:rows_(mockSheets.Days,DAY_HEADERS).find(row=>row.date===seed.date)?.updatedAt||\'\'});',ctx);
 }
 const manifest=copy(ctx.getSyncManifest()),scope={archiveId:manifest.archiveId,epoch:manifest.epoch,principalId:manifest.principalId};assert(manifest.identityVerified);
 ctx.syntheticLedger=ledger;ctx.syntheticUtilities=ledger.globals.Utilities;
 vm.runInContext(`Object.assign(Utilities,syntheticUtilities);SpreadsheetApp.flush=syntheticLedger.globals.SpreadsheetApp.flush;
  mockSheets.Days.getSheetId=()=>10;mockSheets.Days.getParent=()=>db;
  syntheticLedger.index.getSheetId=()=>11;syntheticLedger.index.getParent=()=>db;
  syntheticLedger.blocks.getSheetId=()=>12;syntheticLedger.blocks.getParent=()=>db;
  db.getSheetById=id=>({10:mockSheets.Days,11:syntheticLedger.index,12:syntheticLedger.blocks})[id];`,ctx);
 if(!snapshot){const store=ctx.syncSheetsCommitStore_(ledger.index,ledger.blocks,{archiveId:scope.archiveId,epoch:scope.epoch},ledger.services);store.withLock(()=>store.writeHead(seal({format:'sync-head/v1',archive:{archiveId:scope.archiveId,epoch:scope.epoch},committedThrough:0,pending:null})));}
 return {ctx,ledger,scope,controller:ctx.syncDayRoutingServer_({allowConfigure:true,allowMigration:true}),
  snapshot(){return {...copy(vm.runInContext('({props:mockProps,users:[...mockUserProperties],days:mockSheets.Days.data,rawSheets:Object.fromEntries(Object.entries(mockSheets).map(([name,sheet])=>[name,sheet.data]))})',ctx)),ledger:ledger.snapshot()};}};
}
module.exports={createDayRoutingServer};
