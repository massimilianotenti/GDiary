const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForSelector('.vue-diary-page');
for(const palette of ['warm','sage','slate','dark'])for(const width of [1440,390,320]){
 await page.setViewportSize({width,height:1000});await page.evaluate(id=>{applyPalette(id);continuousFitTitles();},palette);
 for(const type of ['note','task']){
  const title=page.locator('.continuous-block[data-type='+type+'] .continuous-title').first();await title.fill(type==='note'?'Analisi sviluppo bullet journal':'Analizzare NotePlan e Agenda');await title.blur();
  const before=await title.boundingBox();await title.focus();const after=await title.boundingBox();assert(Math.abs(before.y-after.y)<1&&Math.abs(before.height-after.height)<1,'focus moved title');
  const size=await title.evaluate(el=>{const c=getComputedStyle(el);return{height:el.getBoundingClientRect().height,line:parseFloat(c.lineHeight),top:parseFloat(c.paddingTop),bottom:parseFloat(c.paddingBottom),border:parseFloat(c.borderTopWidth)+parseFloat(c.borderBottomWidth),background:c.backgroundColor,left:parseFloat(c.paddingLeft),client:el.clientHeight,scroll:el.scrollHeight};});
  assert.equal(size.top,3);assert.equal(size.bottom,7);assert.equal(size.border,2);assert.equal(size.left,8);assert.equal(size.background,'rgba(0, 0, 0, 0)');assert(size.client>=size.scroll-1,'title clipped');const lines=Math.round((size.height-size.top-size.bottom-size.border)/size.line);assert(Math.abs(size.height-(lines*size.line+size.top+size.bottom+size.border))<2,'line box not centered');
  if(width===1440&&(palette==='warm'||palette==='slate')&&type==='note'){fs.mkdirSync(path.resolve(__dirname,'screenshots'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'screenshots/P67-title-'+palette+'-desktop.png')});}
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
assert.deepEqual(errors,[]);console.log('P67: optical title inset and palette-safe transparent background, border-aware height, no focus movement/clipping, notes/tasks and four palettes at 320/390/1440px OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
