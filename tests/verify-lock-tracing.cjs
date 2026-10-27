const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx={window:{},document:{addEventListener(){}},setTimeout,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../Demo.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext(`{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const now=Date.now,provider=LockService.getScriptLock,flush=SpreadsheetApp.flush;
 let clock=0,events=[],releaseCount=0,failAcquire=false,backgroundBusy=false,failFlush=false;
 Date.now=()=>clock;
 LockService.getScriptLock=()=>({waitLock(timeout){check(timeout===30000,'foreground timeout preserved');clock+=120;if(failAcquire)throw Error('PRIVATE-LOCK');events.push('acquire');},tryLock(timeout){check(timeout===0,'background nonblocking');clock+=3;return !backgroundBusy;},releaseLock(){releaseCount++;clock+=2;events.push('release');}});
 SpreadsheetApp.flush=()=>{events.push('flush');clock+=7;if(failFlush)throw Error('PRIVATE-FLUSH');};
 const start=()=>{ACTIVE_TRACE={metrics:{},depth:{},stack:[],accounted:0};events=[];releaseCount=0;clock=0;};
 try{
  start();const result=locked_(()=>{events.push('body');clock+=41;return 'ok';});const m=ACTIVE_TRACE.metrics;
  check(result==='ok'&&m.lockWaitMs===120&&m.lockMs===120,'wait timing');
  check(m.lockHeldMs===50&&m.flushMs===7,'held includes body, flush and release');
  check(m.lockAttempts===1&&m.lockForegroundAttempts===1&&m.lockAcquired===1&&!m.lockBusy,'acquisition counters');
  check(events.join(',')==='acquire,body,flush,release','ordering preserved');
  check(ACTIVE_TRACE.accounted===170&&ACTIVE_TRACE.stack.length===0,'exclusive partition');
  start();try{locked_(()=>{clock+=11;throw Error('PRIVATE-BODY');});}catch(e){check(e.message==='PRIVATE-BODY','original error');}
  check(releaseCount===1&&ACTIVE_TRACE.metrics.lockHeldMs===20&&events.includes('flush'),'body error releases and measures');
  start();failFlush=true;try{locked_(()=>{clock+=4;});}catch(e){check(e.message==='PRIVATE-FLUSH','flush error preserved');}failFlush=false;
  check(releaseCount===1&&ACTIVE_TRACE.metrics.lockHeldMs===13,'flush error releases and measures');
  start();locked_(()=>{clock+=5;},true);check(!events.includes('flush')&&ACTIVE_TRACE.metrics.lockHeldMs===7,'read-only skips flush');
  start();backgroundBusy=true;let called=false;const busy=locked_(()=>{called=true;},false,true);backgroundBusy=false;
  check(busy.busy&&!called&&releaseCount===0&&ACTIVE_TRACE.metrics.lockBusy===1&&!ACTIVE_TRACE.metrics.lockHeldCalls,'busy never enters or releases');
  start();locked_(()=>{clock+=6;},false,true);check(ACTIVE_TRACE.metrics.lockBackgroundAttempts===1&&ACTIVE_TRACE.metrics.lockWaitMs===3&&ACTIVE_TRACE.metrics.lockHeldMs===15,'background successful timing');
  start();failAcquire=true;try{locked_(()=>{throw Error('must not execute');});}catch(e){check(e.message==='PRIVATE-LOCK','acquisition error preserved');}failAcquire=false;
  check(ACTIVE_TRACE.metrics.lockAcquireErrors===1&&ACTIVE_TRACE.metrics.lockWaitMs===120&&releaseCount===0&&!ACTIVE_TRACE.metrics.lockHeldCalls,'timeout measured without fake hold');
  check(!JSON.stringify(ACTIVE_TRACE.metrics).includes('PRIVATE'),'metric privacy');
  start();readSheetValues_({getValues:()=>[['a','b'],['c','d']]});
  check(ACTIVE_TRACE.metrics.sheetReadRequests===1&&ACTIVE_TRACE.metrics.sheetReadRows===2&&ACTIVE_TRACE.metrics.sheetReadCells===4,'read volume');
  start();readSheetValues_({getValues:()=>[[new Date(0)]],getDisplayValues:()=>[['1970-01-01']]});
  check(ACTIVE_TRACE.metrics.sheetReadRequests===2&&ACTIVE_TRACE.metrics.sheetReadCells===2,'Date fallback counts actual reads');
  ACTIVE_TRACE=null;check(locked_(()=>123)===123,'disabled tracing preserves execution');
 }finally{ACTIVE_TRACE=null;Date.now=now;LockService.getScriptLock=provider;SpreadsheetApp.flush=flush;}
}`,ctx);
console.log('Lock tracing: wait/held, foreground/background, timeout, body/flush errors, release ordering, exclusive partition and read counts OK');
