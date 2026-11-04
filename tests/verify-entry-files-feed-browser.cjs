const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),vm=require('vm'),{chromium}=require('playwright');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs'),root=path.resolve(__dirname,'..');
const backend=createDayRoutingServer(),context={incrementalCommon:true};
const entry=backend.ctx.addJournal({date:'2026-10-20',text:'Voce canonica fuori dal mese corrente',requestId:'synthetic-entry-files-feed',scope:'personal',context}).entries[0];
backend.ctx.fileEntryId=entry.id;vm.runInContext("mockSheets.Files.data.push(['synthetic-file-legacy1',fileEntryId,'legacyfileid1','Allegato legacy globale','https://drive.google.com/file/d/legacyfileid1/view','2026-10-20T09:00:00.000Z'])",backend.ctx);
backend.entryController.register({entriesSheetId:18,indexSheetId:11,blockSheetId:12});
backend.entryController.setMode({mode:'active',expectedRevision:1});
backend.ctx.addFileLinkImpl_({entryId:entry.id,title:'Allegato canonico globale',url:'https://drive.google.com/file/d/abcdefghij/view'});
const bridge=`window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({},{get:(_,name)=>arg=>{fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arg})}).then(r=>r.json()).then(response=>{if(response.ok)success(response.value);else failure(Object.assign(new Error(response.error.message),{name:response.error.name}));}).catch(failure);}});}};}}}};`;
const html=fs.readFileSync(path.join(root,'Demo.html'),'utf8').replace('</script>','</script><script>'+bridge+'</script>');
const allowed=new Set(['getState','getCommonState','getJournalPage','getJournalContents','getSyncManifest','traceApi']);
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/Demo.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(req.url==='/Changelog.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'Changelog.html')));return;}
 if(req.url!=='/rpc'||req.method!=='POST'){res.writeHead(404).end();return;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Synthetic request too large');}
 const {name,arg}=JSON.parse(raw);if(!allowed.has(name))throw Error('Synthetic RPC not allowed: '+name);
 let response;try{response={ok:true,value:JSON.parse(JSON.stringify(await backend.ctx[name](arg)))}}catch(error){response={ok:false,error:{name:error.name,message:error.message}};}
 res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(response));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}));}});
(async()=>{let browser;try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',route=>route.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/Demo.html');
 await page.waitForFunction(()=>commonReadAt>0&&!busy&&continuousSession?.loaded);
 await page.getByRole('button',{name:'File collegati',exact:true}).click();
 await page.waitForFunction(id=>!busy&&state.files.some(file=>file.entryId===id),entry.id);
 assert(await page.getByRole('link',{name:'Allegato canonico globale'}).count());
 assert(await page.getByRole('link',{name:'Allegato legacy globale'}).count());
 assert(await page.getByRole('button',{name:/Voce canonica fuori dal mese corrente/}).count());
 assert.deepEqual(errors,[]);await page.close();
 console.log('Entry Files feed browser: canonical attachment and owning Entry from outside the current month appear in the global Files view after a fresh session; no page errors OK.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
