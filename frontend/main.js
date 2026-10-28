import {createApp,shallowRef,nextTick} from 'vue';
import DiaryPage from './components/DiaryPage.vue';
export {storageProbe} from './storage-probe.js';
export {createArchiveIdentityClient} from './archive-identity.js';
export {createLocalRepository} from './local-repository.js';
export {createJournalReadCache,createJournalPageLoader} from './journal-read-cache.js';
export {createCommonReadCache} from './common-read-cache.js';
export {repositoryProbe,createRepositoryProbe} from './repository-probe.js';
import './diary.css';
import './pleasant.css';
import './app-theme.css';
import './palettes.css';
import './week.css';
import './habits.css';
document.body.classList.add('bullet-theme');
let app, host, model;
export function unmount(){if(app)app.unmount();app=null;host=null;document.body.classList.remove('vue-diary');}
export function mount(target,data){
  const finishTrace=window.beginDiaryRenderTrace?.();
  if(host!==target||!app||!target.querySelector('.vue-diary-page')){unmount();target.replaceChildren();model=shallowRef(data);app=createApp(DiaryPage,{model});app.mount(target);host=target;}else model.value=data;
  document.body.classList.add('vue-diary');
  nextTick(()=>{try{data.fit();}finally{finishTrace?.();}});
}

// Resolve after Vue has patched the page; this does not measure browser paint.
export function whenRendered(){return nextTick();}
