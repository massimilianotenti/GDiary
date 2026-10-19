const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const chrome=process.env.CHROME_PATH||(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'');
(async()=>{const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve(__dirname,'..','Demo.html')).href);await page.waitForSelector('.vue-diary-page');
 assert.equal(await page.locator('.diary-header').count(),1);assert(await page.locator('.vue-diary-page').evaluate(el=>el.closest('#content')!==null));
 await page.getByRole('button',{name:'＋ Nota',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.classList.contains('rich-area'));
 const noteId=await page.evaluate(()=>continuousSession.blocks.find(b=>!b.id&&b.type==='note').clientId),note=page.locator(`[data-client-id="${noteId}"] .rich-area`);
 await note.fill('Una riflessione che deve restare integra.\nUna seconda riga.');await note.press('End');await note.type(' Fine.');
 assert(await note.evaluate(el=>document.activeElement===el));await note.evaluate(el=>window.originalVueEditor=el);
 await page.getByRole('button',{name:'☐ Task',exact:true}).click();assert(await note.evaluate(el=>el===window.originalVueEditor),'Vue replaced an existing editor on insertion');
 await page.waitForFunction(()=>document.activeElement?.classList.contains('continuous-title'));
 await page.getByRole('textbox',{name:'Titolo del task',exact:true}).last().fill('Un task con identità propria');
 await page.getByRole('button',{name:'Salva pagina',exact:true}).click();await page.waitForFunction(()=>!busy&&!dirtyMain);
 const saved=await page.evaluate(id=>continuousSession.blocks.find(b=>b.clientId===id),noteId);assert(saved.id);assert(saved.body.includes('Una seconda riga. Fine.'));
 for(const title of ['Settimana e checkup','Obiettivi e abitudini','Task aperti','Progetti','Tag','File collegati','Sincronizzazione Docs','Impostazioni']){
  await page.getByRole('button',{name:title,exact:true}).click();await page.waitForFunction(()=>!busy);if(title==='Task aperti')await page.waitForSelector('.diary-task-filters');assert.equal(await page.locator('.vue-diary-page').count(),title==='Task aperti'?1:0,title);assert.equal(await page.locator('#search').count(),1);assert.equal(await page.locator('#refresh').count(),1);if(title==='Sincronizzazione Docs')await page.locator('#docQueueDialog').press('Escape');
 }
 await page.getByRole('button',{name:'Diario continuo',exact:true}).click();await page.waitForSelector('.vue-diary-page');
 await page.locator('.diary-search>summary').click();await page.getByRole('searchbox',{name:'Ricerca globale',exact:true}).fill('preventivo');await page.locator('#search').press('Enter');await page.waitForFunction(()=>query==='preventivo');await page.waitForSelector('#content h1');assert.equal(await page.locator('.vue-diary-page').count(),0);
 await page.getByRole('searchbox',{name:'Ricerca globale',exact:true}).fill('');await page.locator('#search').press('Enter');await page.waitForSelector('.vue-diary-page');assert.equal(await page.locator('#search').count(),1);
 await page.setViewportSize({width:390,height:1000});await page.locator('.diary-search>summary').click();assert(await page.locator('#search').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
 assert.deepEqual(errors,[]);console.log('P59 components: Vue mounted, editor DOM/focus preserved, complete multiline save, chrome restored in all views, search and mobile OK');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
