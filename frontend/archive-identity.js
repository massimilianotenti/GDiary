// No storage or browser globals: verification establishes an in-memory scope,
// never permission to read/write a local diary by itself.
const ID=/^[a-zA-Z0-9-]{10,80}$/;
const REASONS=new Set(['principalUnavailable','notConfigured','archiveUnavailable','configurationChanged','identityUnavailable','archiveBusy']);
export function validateArchiveManifest(value){
 if(!value||value.protocolVersion!==1||value.schemaVersion!==1||value.minClientProtocol!==1)return {verified:false,cacheReady:false,reason:'unsupportedProtocol'};
 if(value.identityVerified!==true)return {verified:false,cacheReady:false,reason:REASONS.has(value.reason)?value.reason:'identityUnavailable'};
 if(![value.archiveId,value.principalId,value.epoch].every(id=>typeof id==='string'&&ID.test(id)))return {verified:false,cacheReady:false,reason:'invalidIdentity'};
 // Current implementation cannot enable application storage, even if a server
 // mistakenly advertises it before the matching client repository is present.
 return {verified:true,cacheReady:false,scope:{archiveId:value.archiveId,principalId:value.principalId,epoch:value.epoch,protocolVersion:1,schemaVersion:1},reason:'storageUnverified'};
}
export function createArchiveIdentityClient(fetchManifest){
 let generation=0,scope=null,status={verified:false,cacheReady:false,reason:'notChecked'};
 return {
  async verify(){
   const current=++generation;scope=null;status={verified:false,cacheReady:false,reason:'checking'};
   try{
    const result=validateArchiveManifest(await fetchManifest());
    if(current!==generation)return {verified:false,cacheReady:false,reason:'superseded'};
    scope=result.scope||null;const {scope:ignored,...safe}=result;status=safe;return {...status};
   }catch(ignore){if(current!==generation)return {verified:false,cacheReady:false,reason:'superseded'};scope=null;status={verified:false,cacheReady:false,reason:'unavailable'};return {...status};}
  },
  invalidate(){generation++;scope=null;status={verified:false,cacheReady:false,reason:'notChecked'};},
  getScope(){return scope?{...scope}:null;},
  status(){return {...status};}
 };
}
