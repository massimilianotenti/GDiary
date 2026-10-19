const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'Index.html'),'utf8');
const source=html.match(/var source=\[([\s\S]*?)\]\.join\(''\)/);assert(source);
const bytes=Buffer.from(JSON.parse('['+source[1]+']').join(''),'base64'),expected=Buffer.from('/*\n'+fs.readFileSync(path.join(root,'THIRD-PARTY-NOTICES.md'),'utf8')+'\n*/\n'+fs.readFileSync(path.join(root,'.build/frontend/diary.js'),'utf8'));
assert(bytes.equals(expected));assert(!html.includes('var BulletJournalVue='));assert(html.indexOf('<body')>=0&&html.indexOf('<body')<html.indexOf('var source='));
const demo=fs.readFileSync(path.join(root,'Demo.html'),'utf8'),broken=demo.replace(/var source=\[[\s\S]*?\]\.join\(''\)/,"var source='"+Buffer.from('window.BulletJournalVue=undefined;').toString('base64')+"'");
const probe=path.join(root,'.build/boot-fallback.html');fs.writeFileSync(probe,broken);
const chrome=process.env.CHROME_PATH||(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'');
(async()=>{const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});try{
const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(probe).href);await page.waitForFunction(()=>continuousSession?.loaded);assert(await page.locator('[role=alert]').getByText('Avvio interfaccia non completato:',{exact:false}).isVisible());assert(await page.getByRole('button',{name:'Salva pagina',exact:true}).isVisible());assert(await page.locator('.continuous-block').count()>0);
console.log('P60.1: exact UTF-8 payload, Vue starts after static HTML, visible boot error and legacy fallback verified locally');
}finally{await browser.close();fs.unlinkSync(probe);}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
