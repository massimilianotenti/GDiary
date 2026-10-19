const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const chrome=process.env.CHROME_PATH||(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'');
(async()=>{const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve(__dirname,'..','Demo.html')).href);await page.waitForSelector('.vue-diary-page');
 assert.equal(await page.locator('.diary-save-state').innerText(),'Modifiche salvate');
 const editor=page.locator('.continuous-block[data-type="note"] .rich-area').first();await editor.evaluate(el=>window.p60OriginalEditor=el);await editor.fill('Un pensiero da conservare.\nLa seconda riga deve restare.');await page.waitForFunction(()=>document.querySelector('.diary-save-state').textContent==='Modifiche da salvare');assert(await editor.evaluate(el=>window.p60OriginalEditor===el));
 const before=await page.evaluate(()=>continuousSession.blocks.filter(b=>b.type==='task'&&b.status!=='done'&&b.status!=='cancelled').length);await page.locator('.continuous-check').first().check();await page.waitForFunction(expected=>document.querySelector('.diary-summary').textContent.includes(expected+' task aperti'),before-1);
 await page.getByRole('button',{name:'Salva pagina',exact:true}).click();await page.waitForFunction(()=>!busy&&!dirtyMain);assert.equal(await page.locator('.diary-save-state').innerText(),'Modifiche salvate');
 await page.keyboard.press('Control+k');await page.waitForFunction(()=>document.activeElement?.id==='search');assert(await page.locator('.diary-search').evaluate(el=>el.open));await page.keyboard.press('Escape');assert(!(await page.locator('.diary-search').evaluate(el=>el.open)));
 const add=page.locator('.diary-day-menu').first();await add.locator('summary').click();assert(await add.evaluate(el=>el.open));await page.locator('.diary-header h1').click();assert(!(await add.evaluate(el=>el.open)));
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'overflow at '+width);assert(await page.getByRole('button',{name:'Salva pagina',exact:true}).isVisible());assert(await page.locator('.diary-date-number').first().isVisible());}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.diary-actions>button.primary').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 assert.deepEqual(errors,[]);console.log('P60: live unsaved state/open-task count, editor stability, Ctrl+K/Escape/outside menus, 320–1440px and reduced motion OK');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
