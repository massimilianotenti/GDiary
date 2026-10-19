import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:'.build/frontend',lib:{entry:'frontend/main.js',name:'BulletJournalVue',formats:['iife'],fileName:()=> 'diary.js'},cssCodeSplit:false}});
