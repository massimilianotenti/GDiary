const fs=require('fs'),vm=require('vm'),path=require('path');
const backend=fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);vm.runInContext(backend,ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const first=getSyncManifest();check(first.identityVerified&&!first.capabilities.localReadCache&&!first.capabilities.operations,'identity verified without storage permission');check(first.cursor===null&&first.highWater===null,'no feed checkpoint is claimed before a persistent routing ledger is registered');
 check(!same(first.archiveId,first.principalId)&&first.epoch,'separate archive/principal/epoch');
 const propsBefore=JSON.stringify(mockProps),usersBefore=JSON.stringify([...mockUserProperties]);
 check(same(first,getSyncManifest({archiveId:'client-forged-id',principalId:'client-forged-user',deploymentUrl:'another-url'})),'client hints/URL do not select identity');
 check(propsBefore===JSON.stringify(mockProps)&&usersBefore===JSON.stringify([...mockUserProperties]),'repeat verification makes no new writes');
 const serial=JSON.stringify(first);check(!serial.includes(mockSession.active)&&!serial.includes(mockProps.DB_ID)&&!serial.includes(mockProps.ROOT_ID),'manifest exposes no email or Drive configuration');
 const root=mockProps.ROOT_ID,alternate=new MockItem('Altro archivio',true,null);mockProps.ROOT_ID=alternate.id;
 const otherRoot=getSyncManifest();check(otherRoot.identityVerified&&otherRoot.archiveId!==first.archiveId&&otherRoot.principalId===first.principalId,'root switch isolates archive with stable user');
 mockProps.ROOT_ID=root;check(same(first,getSyncManifest()),'returning to archive recovers its original identity/epoch');
 const dbId=mockProps.DB_ID,open=SpreadsheetApp.openById,alternateDb=new MockItem('Altro database',false,null);mockProps.DB_ID=alternateDb.id;SpreadsheetApp.openById=id=>({...db,getId:()=>id});
 check(getSyncManifest().archiveId!==first.archiveId,'database switch isolates archive');mockProps.DB_ID=dbId;SpreadsheetApp.openById=open;
 mockSession.active=mockSession.effective='other-user@example.invalid';const otherUser=getSyncManifest();check(otherUser.identityVerified&&otherUser.archiveId===first.archiveId&&otherUser.principalId!==first.principalId,'authorized execution principal has its own opaque identity');
 mockSession.active='demo-owner@example.invalid';mockSession.effective='demo-owner@example.invalid';check(same(first,getSyncManifest()),'original principal recovers identity');
 for(const [active,effective]of [['',mockSession.effective],['visitor@example.invalid',mockSession.effective],[mockSession.active,'']]){
  const old=[mockSession.active,mockSession.effective];mockSession.active=active;mockSession.effective=effective;const blocked=getSyncManifest();check(!blocked.identityVerified&&!blocked.archiveId&&!blocked.principalId&&blocked.reason==='principalUnavailable','unavailable/mismatched active user has no shared namespace');[mockSession.active,mockSession.effective]=old;
 }
 const file=DriveApp.getFileById(dbId),isTrashed=file.isTrashed;file.isTrashed=()=>true;check(getSyncManifest().reason==='archiveUnavailable','trashed database blocked');file.isTrashed=isTrashed;
 const folder=DriveApp.getFolderById(root),trash=folder.isTrashed;folder.isTrashed=()=>true;check(getSyncManifest().reason==='archiveUnavailable','trashed root blocked');folder.isTrashed=trash;
 const provider=PropertiesService.getScriptProperties;PropertiesService.getScriptProperties=()=>{throw Error('PRIVATE-SERVICE');};const unavailable=getSyncManifest();PropertiesService.getScriptProperties=provider;check(unavailable.reason==='identityUnavailable'&&!JSON.stringify(unavailable).includes('PRIVATE'),'property outage sanitized');
 const key='LOCAL_ARCHIVE_V1:'+JSON.stringify([dbId,root]),raw=mockProps[key];mockProps[key]='corrupted';check(getSyncManifest().reason==='identityUnavailable'&&mockProps[key]==='corrupted','corrupt identity never silently replaced');mockProps[key]=raw;
 const lock=LockService.getScriptLock;LockService.getScriptLock=()=>({tryLock:()=>false,releaseLock(){throw Error('Unowned release');}});check(getSyncManifest().reason==='archiveBusy','busy identity initialization is nonblocking');LockService.getScriptLock=lock;

 const nextRoot=new MockItem('Archivio inizializzazione interrotta',true,null);mockProps.ROOT_ID=nextRoot.id;
 const propsProvider=PropertiesService.getScriptProperties;
 PropertiesService.getScriptProperties=()=>({...propsProvider(),setProperty(k,v){propsProvider().setProperty(k,v);if(k.startsWith('LOCAL_ARCHIVE_V1:'))throw Error('Lost identity acknowledgement');}});
 check(!getSyncManifest().identityVerified,'uncertain identity write not exposed');PropertiesService.getScriptProperties=propsProvider;
 const stored=JSON.parse(mockProps['LOCAL_ARCHIVE_V1:'+JSON.stringify([dbId,nextRoot.id])]);check(getSyncManifest().archiveId===stored.archiveId,'retry recovers persisted archive identity');mockProps.ROOT_ID=root;
 const userProvider=PropertiesService.getUserProperties;mockSession.active=mockSession.effective='third-user@example.invalid';
 PropertiesService.getUserProperties=()=>({...userProvider(),setProperty(k,v){userProvider().setProperty(k,v);throw Error('Lost principal acknowledgement');}});
 check(!getSyncManifest().identityVerified,'uncertain principal write not exposed');PropertiesService.getUserProperties=userProvider;
 check(getSyncManifest().principalId===userProvider().getProperty('LOCAL_PRINCIPAL_V1'),'retry recovers persisted principal identity');
 mockSession.active=mockSession.effective='demo-owner@example.invalid';
 const getFile=DriveApp.getFileById;DriveApp.getFileById=id=>{const result=getFile(id);mockProps.ROOT_ID=nextRoot.id;return result;};
 check(getSyncManifest().reason==='configurationChanged','config race after access check cannot publish old identity');DriveApp.getFileById=getFile;mockProps.ROOT_ID=root;
 const traced=traceApi({operation:'getSyncManifest',traceId:'manifest-trace-000000001',arg:{}});check(traced.ok&&traced.value.identityVerified&&!traced.diagnostics.flushCalls&&!traced.diagnostics.sheetReadRequests&&!traced.diagnostics.docsOpenCalls,'manifest reads no diary cells/Docs or flush');
 // Copy only synthetic server metadata to a fresh simulated deployment.
 globalThis.identityRestart={props:JSON.parse(JSON.stringify(mockProps)),users:JSON.parse(JSON.stringify([...mockUserProperties])),uuid:mockUuid,expected:first};
 console.log('Archive identity: separate archive/principal/epoch, config switch/back, principal isolation, no client-selected scope, no raw identifiers, fail-closed auth/access/corruption/outage/busy and metadata-only verification OK');
}`,ctx);
const restart=JSON.parse(JSON.stringify(ctx.identityRestart));const next={window:{},document:{addEventListener(){}},setTimeout,console,restart};vm.createContext(next);vm.runInContext(backend,next);vm.runInContext(`Object.assign(mockProps,restart.props);restart.users.forEach(([key,value])=>mockUserProperties.set(key,value));mockUuid=restart.uuid;if(JSON.stringify(getSyncManifest())!==JSON.stringify(restart.expected))throw Error('Identity changed after simulated deployment restart');`,next);
