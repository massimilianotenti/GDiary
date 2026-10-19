const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const{chromium}=require('playwright');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
async function checkDarkText(page){const results=await page.evaluate(()=>{
 function lum(rgb){return rgb.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
 const selectors=['.sidebar button','#content>h1','#content .hint','#content label','.palette-option','#refresh','.diary-header h1','.continuous-metadata','.continuous-collapse','.continuous-note-date','.continuous-note-clock','.continuous-title','.rich-area','.diary-summary','#content .primary','.topbar>.primary','.diary-actions .primary'];
 return selectors.flatMap(s=>[...document.querySelectorAll(s)].filter(el=>el.getClientRects().length&&getComputedStyle(el).opacity!=='0'&&!el.disabled).slice(0,4).map(el=>{let parent=el,bg;while(parent){bg=getComputedStyle(parent).backgroundColor;if(!bg.includes('rgba')||!bg.endsWith(', 0)'))break;parent=parent.parentElement;}const a=lum(getComputedStyle(el).color),b=lum(bg);return[s+el.outerHTML.slice(0,220)+getComputedStyle(el).color+bg,(Math.max(a,b)+.05)/(Math.min(a,b)+.05)];}));
});for(const[s,ratio]of results)assert(ratio>=4.5,'dark text contrast '+s+' '+ratio);}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:chrome});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.resolve(__dirname,'../Demo.html')).href);await page.waitForSelector('.vue-diary-page');
const shots=path.join(__dirname,'screenshots');fs.mkdirSync(shots,{recursive:true});
for(const[id,name]of [['warm','Carta calda'],['sage','Salvia'],['slate','Blu ardesia'],['dark','Scuro']]){
 await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>!busy);
 await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>dirtyMain),false);assert.equal(await page.evaluate(()=>localStorage.getItem(PALETTE_KEY)),id);
 if(id==='dark')await checkDarkText(page);
 await page.screenshot({path:path.join(shots,'P65-'+id+'-settings.png')});
 for(const view of ['Settimana e checkup','Obiettivi e abitudini','Task aperti','Progetti','Tag','File collegati','Archivio Drive','Diario continuo']){
  await page.getByRole('button',{name:view,exact:true}).click();await page.waitForFunction(()=>!busy);if(view==='Diario continuo')await page.waitForSelector('.vue-diary-page');
  await page.waitForTimeout(200);assert.equal(await page.locator('body').getAttribute('data-palette'),id);
  const contrast=await page.locator('.sidebar .nav-icon').first().evaluate(el=>{
   function lum(rgb){return rgb.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
   const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(el.closest('.sidebar')).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });assert(contrast>=3,'icon contrast '+id+' '+contrast);
  if(id==='dark')await checkDarkText(page);
 }
 await page.screenshot({path:path.join(shots,'P65-'+id+'-diary.png')});
 if(id==='dark'){
  for(const[name,selector]of [['Sincronizzazione Docs','#docQueueDialog'],['Novità e versioni','#changelogDialog']]){
   await (name==='Novità e versioni'?page.locator('.app-version'):page.getByRole('button',{name,exact:true})).click();await page.waitForSelector(selector+'[open]');await page.waitForTimeout(250);
   assert(await page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor.match(/\d+/g).slice(0,3).every(v=>Number(v)<80)));
   await checkDarkText(page);
   await page.locator(selector).press('Escape');
  }
 }
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>!busy);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await page.screenshot({path:path.join(shots,'P65-'+id+'-mobile.png')});}
 await page.setViewportSize({width:1440,height:1000});
}
await page.reload();await page.waitForSelector('.vue-diary-page');assert.equal(await page.locator('body').getAttribute('data-palette'),'dark');
await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>!busy);await page.getByRole('button',{name:'Carta calda',exact:true}).click();
await page.evaluate(()=>localStorage.setItem(PALETTE_KEY,'unknown'));await page.reload();await page.waitForSelector('.vue-diary-page');assert.equal(await page.locator('body').getAttribute('data-palette'),'warm');
await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Storage disabled for test');};});await page.getByRole('button',{name:'Impostazioni',exact:true}).click();await page.waitForFunction(()=>!busy);await page.getByRole('button',{name:'Scuro',exact:true}).click();await page.getByRole('status').filter({hasText:'non consente di conservare'}).waitFor();assert.equal(await page.locator('body').getAttribute('data-palette'),'dark');assert.equal(await page.evaluate(()=>dirtyMain),false);
assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);console.log('P65: four palettes, all primary views, icon contrast, persistence, clean navigation and 320/390px settings OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

