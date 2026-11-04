const assert=require('assert');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs');

const server=createDayRoutingServer(),{ctx,projectController,entryController}=server,context={incrementalCommon:true};
projectController.register({projectsSheetId:17,indexSheetId:11,blockSheetId:12});
projectController.setMode({mode:'active',expectedRevision:1});
ctx.saveProject({name:'Progetto Docs sintetico',description:'',context});
const entry=ctx.addJournal({date:'2026-10-29',text:'☐ Verifica Docs',requestId:'synthetic-doc-reconcile-01',scope:'personal',context}).entries[0];
entryController.register({entriesSheetId:18,indexSheetId:11,blockSheetId:12});
entryController.setMode({mode:'active',expectedRevision:1});
const gateway=entryController.resolve(),current=gateway.read(entry.id),emptyRich=ctx.plainRich_(''),initial={body:'Testo precedente',rich:ctx.plainRich_('Testo precedente'),version:'content-seed-01',baselineBody:'',baselineRich:emptyRich,headerTitle:entry.text,baselineTitle:entry.text,baselineHeading:entry.date+' · '+entry.text,editorAutoTitle:false};
const digest=value=>ctx.syncContentDigest_(value);
gateway.setContent({id:entry.id,updatedAt:current.updatedAt,contentVersion:initial.version,contentDigest:digest(initial),due:'',plannedDate:'',workStart:'',workEnd:'',importance:'normal'},initial);

const canonical=gateway.readContent(entry.id),routed=gateway.read(entry.id),actual={body:'Testo aggiornato direttamente in Docs',rich:ctx.plainRich_('Testo aggiornato direttamente in Docs'),heading:entry.date+' · '+entry.text,richUnsupported:false};
const plan=ctx.planRoutedDocReconciliation_(routed,canonical,actual,false);
assert.equal(plan.action,'import','explicit Docs refresh plans a canonical import');
assert.equal(plan.content.baselineBody,actual.body,'the imported Docs version becomes the conflict baseline');
const imported=gateway.setContent({id:entry.id,updatedAt:routed.updatedAt,contentVersion:plan.content.version,contentDigest:digest(plan.content),due:'',plannedDate:'',workStart:'',workEnd:'',importance:'normal'},plan.content);
assert.notEqual(imported.updatedAt,routed.updatedAt,'import advances the canonical Entry version');
assert.equal(gateway.readContent(entry.id).body,actual.body,'the imported body is stored behind the canonical content pointer');
assert.equal(ctx.planRoutedDocReconciliation_(gateway.read(entry.id),gateway.readContent(entry.id),actual,false).action,'unchanged','refresh is idempotent after import');
const renamed={...actual,heading:entry.date+' · Titolo Docs aggiornato'},titlePlan=ctx.planRoutedDocReconciliation_(gateway.read(entry.id),gateway.readContent(entry.id),renamed,false);
assert.equal(titlePlan.action,'import','an explicit Docs refresh imports a valid section title change');
assert.equal(titlePlan.content.headerTitle,'Titolo Docs aggiornato');

const pendingBaseline={...initial,baselineBody:'',baselineRich:emptyRich};
assert.equal(ctx.planRoutedDocReconciliation_(routed,pendingBaseline,{...actual,body:'',rich:emptyRich},true).action,'pending','an app write remains pending while Docs still matches its baseline');
assert.equal(ctx.planRoutedDocReconciliation_(routed,pendingBaseline,actual,true).action,'conflict','external Docs edits are surfaced while an app write is pending');
assert.equal(ctx.planRoutedDocReconciliation_(routed,canonical,{...actual,heading:'Titolo alterato'},false).action,'conflict','a direct heading edit is never imported as body content');
assert.equal(ctx.planRoutedDocReconciliation_(routed,canonical,{...actual,richUnsupported:true},false).action,'conflict','unsupported rich Docs content is never silently flattened');
console.log('Docs Entry reconciliation: explicit import advances the canonical content pointer, establishes a baseline, is idempotent, and preserves app/Docs conflicts and unsupported formatting.');
