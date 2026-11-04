const assert=require('assert');
const {createDayRoutingServer}=require('./helpers/day-routing-server.cjs');

const server=createDayRoutingServer(),{ctx,entryController}=server,context={incrementalCommon:true};
const entries=[
 ctx.addJournal({date:'2026-10-27',text:'Prima snapshot',requestId:'synthetic-snapshot-01',scope:'personal',context}).entries[0],
 ctx.addJournal({date:'2026-10-28',text:'Seconda snapshot',requestId:'synthetic-snapshot-02',scope:'personal',context}).entries[0],
 ctx.addJournal({date:'2026-10-29',text:'Terza snapshot',requestId:'synthetic-snapshot-03',scope:'personal',context}).entries[0]
];
entryController.register({entriesSheetId:18,indexSheetId:11,blockSheetId:12});
entryController.setMode({mode:'active',expectedRevision:1});
const catalogController=ctx.syncCatalogRoutingServer_({allowConfigure:true,allowMigration:true});catalogController.register({goalsSheetId:16,habitsSheetId:15,indexSheetId:11,blockSheetId:12});catalogController.setMode({mode:'active',expectedRevision:1});
const legacy=ctx.readEntry_(ctx.findRows_(ctx.db_().getSheetByName('Entries'),1,entries[0].id,false)[0]);
const layouts=ctx.journalLayout_(true);ctx.append_(layouts,[[entries[0].id,'10','2026-10-27T10:00:00.000Z'],[entries[1].id,'20','2026-10-28T10:00:00.000Z']]);
const legacyFile=ctx.addFileLink({entryId:entries[1].id,title:'Allegato legacy',url:'https://drive.google.com/file/d/legacy-file-id123',context}).fileUpserts[0];
entryController.resolve().migrate({operationId:'synthetic-snapshot-migrate-01',id:legacy.id,expectedLegacy:legacy});
const canonicalFile=ctx.addFileLink({entryId:entries[0].id,title:'Allegato canonico',url:'https://drive.google.com/file/d/canonical-file-id123',context}).fileUpserts[0];
const initialSettings=catalogController.resolve().readSetting('reflection'),initialPrivacy=catalogController.resolve().readSetting('privacy');ctx.saveReflectionSettings({dailyReflectionMode:'detailed',version:initialSettings.version,context});ctx.savePrivacySettings({privateTags:['famiglia','lavoro'],version:initialPrivacy.privacyVersion,context});
const expectedIds=entryController.resolve().readRows().map(row=>row.id).sort(),start=ctx.getSyncCheckpoint(),page1=ctx.getSnapshotPage({collection:'entries',cursor:start.cursor,limit:1,context});
assert.equal(page1.records.length,1);assert(page1.hasMore);assert.equal(page1.checkpoint.sequence,start.highWater);
assert.equal(page1.coverage.total,expectedIds.length);assert.equal(page1.coverage.canonical,1);assert.equal(page1.coverage.complete,false,'mixed legacy/canonical rows are explicitly incomplete');
assert.equal(page1.bytes,ctx.traceBytes_(ctx.syncCommitCanonical_(page1)),'response reports serialized UTF-8 size including its byte field');
const added=ctx.addJournal({date:'2026-10-30',text:'Modifica durante snapshot',requestId:'synthetic-snapshot-04',scope:'personal',context}).entries[0];
const collected=page1.records.map(row=>row.id);let afterId=page1.nextAfter,page=page1;
while(page.hasMore){page=ctx.getSnapshotPage({collection:'entries',cursor:start.cursor,afterId,limit:1,context});assert.equal(page.checkpoint.sequence,start.highWater,'continuation pins the original checkpoint');collected.push(...page.records.map(row=>row.id));afterId=page.nextAfter;}
assert.equal(new Set(collected).size,collected.length,'keyset pages do not duplicate IDs');
assert(expectedIds.every(id=>collected.includes(id)),'all records present at the first page are paged exactly once');
assert(collected.every(id=>expectedIds.includes(id)||id===added.id),'pagination contains no unknown source identity');
const end=ctx.getSyncCheckpoint();let feedCursor=start.cursor,commits=[];do{const feed=ctx.getChanges({cursor:feedCursor,limit:5});commits.push(...feed.commits);feedCursor=feed.cursor;}while(feedCursor.sequence<end.highWater);
assert(commits.some(commit=>commit.changes.some(change=>change.collection==='entries'&&change.id===added.id)),'writes during the snapshot are recoverable from the pinned feed checkpoint');
assert.equal(page.observedCursor.sequence,end.highWater,'each page reports its own coherent read checkpoint');
let entryReadRowsCalls=0,entryPointReads=0;const makeEntryServer=ctx.syncEntryRoutingServer_;ctx.syncEntryRoutingServer_=()=>{const server=makeEntryServer();return {...server,resolve(){const facade=server.resolve();if(!facade)return null;return Object.fromEntries(Object.keys(facade).map(key=>[key,key==='readRows'?(...args)=>{entryReadRowsCalls++;return facade.readRows(...args);}:key==='read'?(...args)=>{entryPointReads++;return facade.read(...args);}:facade[key]]));}};};
const filePage=ctx.getSnapshotPage({collection:'files',cursor:{...start.cursor,sequence:0},limit:1,context}),fileIds=filePage.records.map(file=>file.id);assert.equal(filePage.coverage.total,1);assert.equal(filePage.coverage.canonical,0);assert.equal(filePage.coverage.complete,false,'legacy attachment requires feed replay to establish full Files coverage');assert.deepEqual(fileIds,[legacyFile.id],'legacy Files page contains only its source row; canonical rows come from the retained feed');assert.equal(filePage.hasMore,false);assert.equal(entryReadRowsCalls,0,'Files pages do not enumerate the entire Entries collection');assert(entryPointReads>0,'Files pages validate only the attachment owners they encounter');
const settings=ctx.getSnapshotPage({collection:'settings',cursor:start.cursor,limit:10,context});assert.deepEqual(settings.records.map(row=>row.id).sort(),['privacy','reflection']);assert(settings.coverage.complete&&settings.coverage.canonical===2,'only the two validated app settings are exposed, with canonical versions');assert.deepEqual(settings.records.find(row=>row.id==='privacy').value.privateTags,['famiglia','lavoro']);assert.equal(settings.records.find(row=>row.id==='reflection').value.dailyReflectionMode,'detailed');
const layoutPage=ctx.getSnapshotPage({collection:'layouts',cursor:{...start.cursor,sequence:0},limit:1,context}),layoutRecords=layoutPage.records.slice();assert.equal(layoutPage.coverage.total,2);assert.equal(layoutPage.coverage.canonical,0);assert.equal(layoutPage.coverage.complete,false,'canonical layout changes require feed replay');let layoutAfter=layoutPage.nextAfter,layoutNext=layoutPage;while(layoutNext.hasMore){layoutNext=ctx.getSnapshotPage({collection:'layouts',cursor:{...start.cursor,sequence:0},afterId:layoutAfter,limit:1,context});layoutRecords.push(...layoutNext.records);layoutAfter=layoutNext.nextAfter;}assert.deepEqual(layoutRecords.map(row=>row.entryId).sort(),[entries[0].id,entries[1].id].sort());assert(layoutRecords.some(row=>row.entryId===entries[0].id&&row.version==='2026-10-27T10:00:00.000Z'&&row.position===10));assert(layoutRecords.some(row=>row.entryId===entries[1].id&&row.version==='2026-10-28T10:00:00.000Z'&&row.position===20));assert.equal(entryReadRowsCalls,0,'Layouts pages do not enumerate the entire Entries collection');
assert.throws(()=>ctx.getSnapshotPage({collection:'unknown',context}),error=>error.name==='DataError');
assert.throws(()=>ctx.getSnapshotPage({collection:'entries',cursor:{...start.cursor,principalId:'synthetic-other-user'},context}),error=>error.name==='ScopeChanged');
assert.throws(()=>ctx.getSnapshotPage({collection:'entries',cursor:{...start.cursor,sequence:end.highWater+1},context}),error=>error.name==='ScopeChanged');
assert.throws(()=>ctx.getSnapshotPage({collection:'entries',limit:101,context}),error=>error.name==='DataError');
assert.throws(()=>ctx.getSnapshotPage({collection:'entries',maxBytes:65537,context}),error=>error.name==='DataError');
console.log('Snapshot pages: stable keyset, scoped pinned checkpoint, per-page observed checkpoint, explicit legacy coverage, byte accounting and concurrent-write feed catch-up OK.');
