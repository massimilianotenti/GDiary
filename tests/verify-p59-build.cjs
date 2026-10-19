const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const index=read('Index.html'),demo=read('Demo.html');
assert.equal((index.match(/<script>/g)||[]).length,2);assert.equal((demo.match(/<script>/g)||[]).length,3);
for(const file of ['Index.html','Demo.html'])for(const m of read(file).matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
assert(index.includes('TextDecoder'));assert(index.includes('script.dataset.bulletJournalVue'));assert(!index.includes('process.env.NODE_ENV'));assert(!/\bimport\s*\(/.test(read('.build/frontend/diary.js')));
const names=['Code.gs','DriveDocs.gs','JournalEditor.gs','Index.html','Changelog.html','appsscript.json'];assert.deepEqual(fs.readdirSync(path.join(root,'.build/apps-script')).sort(),names.sort());
for(const name of names){let expected=read(name);if(name==='DriveDocs.gs'&&process.env.ROOT_FOLDER_ID)expected=expected.replace(/const ROOT_FOLDER_ID = '[^']*';/,"const ROOT_FOLDER_ID = '"+process.env.ROOT_FOLDER_ID+"';");assert.equal(read('.build/apps-script/'+name),expected);}
assert.equal((demo.match(/let DB_HANDLE=/g)||[]).length,1);assert(demo.indexOf('let DB_HANDLE=')<demo.indexOf('script.dataset.bulletJournalVue'));
console.log('P59 build: self-contained Vue, script syntax, single mock backend and exactly six deploy files OK');
