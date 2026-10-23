<script setup>
import {computed,ref,onMounted,onBeforeUnmount,nextTick,watch} from 'vue';
import EntryBlock from './EntryBlock.vue';
import ChromeSlot from './ChromeSlot.vue';
import DiaryIcon from './DiaryIcon.vue';
const props=defineProps({model:Object});
const page=ref(),searchPanel=ref();
const data=computed(()=>props.model.value);
const revision=ref(0),searchText=ref(data.value.taskFilters.text);let filterTimer;
function applySearch(){clearTimeout(filterTimer);filterTimer=undefined;data.value.filter('text',searchText.value);}
function filterText(event){searchText.value=event.target.value;clearTimeout(filterTimer);filterTimer=setTimeout(applySearch,800);}
watch(()=>data.value.taskFilters.text,value=>{if(!filterTimer)searchText.value=value;});
const unsaved=computed(()=>{revision.value;return data.value.hasUnsaved?.()||data.value.blocks.some(b=>b.dirty||!b.id);});
const totals=computed(()=>{revision.value;return {notes:data.value.blocks.filter(b=>b.type!=='task').length,tasks:data.value.blocks.filter(b=>b.type==='task'&&b.status!=='done'&&b.status!=='cancelled').length};});
const dayParts=date=>({number:date.slice(8,10),weekday:new Intl.DateTimeFormat('it-IT',{weekday:'long'}).format(new Date(date+'T12:00:00')),label:new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'))});
function keydown(event){if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(data.value.taskDiary){page.value?.querySelector('.task-filter-search input')?.focus();return;}searchPanel.value.open=true;nextTick(()=>searchPanel.value?.querySelector('input')?.focus());}else if(event.key==='Escape'){const opened=page.value?.querySelectorAll('.diary-search[open],.diary-day-menu[open],.continuous-commands[open]');if(opened?.length){opened.forEach(d=>d.open=false);event.preventDefault();}}}
function outside(event){page.value?.querySelectorAll('.diary-search[open],.diary-day-menu[open],.continuous-commands[open]').forEach(d=>{if(!d.contains(event.target))d.open=false;});}
onMounted(()=>{document.addEventListener('keydown',keydown);document.addEventListener('pointerdown',outside);});
onBeforeUnmount(()=>{clearTimeout(filterTimer);document.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside);});
const groups=computed(()=>{const map=new Map();[...data.value.blocks].sort((a,b)=>b.date.localeCompare(a.date)||a.position-b.position).forEach(b=>{if(!map.has(b.date))map.set(b.date,[]);map.get(b.date).push(b);});for(const date of data.value.reflectionDates?.()||[])if(!map.has(date))map.set(date,[]);if(!map.has(data.value.day)&&!data.value.project)map.set(data.value.day,[]);if(!map.size)map.set(data.value.day,[]);return [...map].sort(([a],[b])=>b.localeCompare(a));});
</script>
<template>
 <div ref="page" class="vue-diary-page">
  <header class="diary-header"><div class="diary-heading"><span class="diary-eyebrow">IL MIO DIARIO <span class="diary-eyebrow-line"></span></span><h1>{{data.title}}</h1><p class="diary-summary">{{totals.notes}} {{totals.notes===1?'nota':'note'}} <span>·</span> {{totals.tasks}} task aperti{{data.taskDiary&&!data.complete?' tra i risultati caricati':''}} <span class="diary-save-state" :class="{'is-unsaved':unsaved}">{{unsaved?'Modifiche da salvare':'Modifiche salvate'}}</span></p></div><div class="diary-actions"><details v-show="!data.taskDiary" ref="searchPanel" class="diary-search"><summary aria-label="Cerca nel diario" title="Cerca nel diario · Ctrl/Cmd+K"><DiaryIcon name="search"/></summary><ChromeSlot :bridge="data.bridge" kind="search"/></details><button class="diary-icon-button" aria-label="Aggiorna" title="Rileggi i dati" @click="data.refresh"><DiaryIcon name="refresh"/></button><button v-if="!data.taskDiary" aria-label="＋ Nota" @click="data.add('note',data.day)"><DiaryIcon name="note"/>Nota</button><button aria-label="☐ Task" @click="data.add('task',data.day)"><DiaryIcon name="task"/>Task</button><button class="primary" @click="data.save"><DiaryIcon name="save"/>Salva pagina</button></div></header>
  <div class="diary-navigation"><nav v-if="!data.taskDiary" class="diary-period" aria-label="Periodo del diario"><button aria-label="Mese precedente" @click="data.move(-1)"><DiaryIcon name="left"/></button><span><DiaryIcon name="calendar"/>{{data.monthLabel}}</span><button aria-label="Mese successivo" @click="data.move(1)"><DiaryIcon name="right"/></button><button class="diary-today-button" @click="data.today">Oggi</button><button v-if="data.project" @click="data.all">Tutto il diario</button></nav><button v-if="!data.taskDiary" @click="data.openTasks">Filtri task</button><span v-if="!data.taskDiary" class="diary-navigation-caption">La tua pagina, giorno dopo giorno</span></div>
  <section v-if="data.taskDiary" class="diary-task-filters" aria-label="Filtri del diario">
   <div class="task-filter-heading"><strong>Task nel diario</strong><button v-if="data.taskFilters.weekStart" @click="data.returnToWeek">Torna al checkup</button><button @click="data.all">Tutto il diario</button></div>
   <div class="task-filter-fields">
    <label>Stato<select :value="data.taskFilters.status" @change="data.filter('status',$event.target.value)"><option value="open">Aperti e in corso</option><option value="doing">In corso</option><option value="done">Completati</option><option value="cancelled">Annullati</option><option value="all">Tutti gli stati</option></select></label>
    <label>Periodo<select :value="data.taskFilters.period" @change="data.filter('period',$event.target.value)"><option value="archive">Tutto l’archivio</option><option value="month">{{data.monthLabel}}</option><option v-if="data.taskFilters.weekStart" value="week">Settimana {{data.taskWeekLabel}}</option></select></label>
    <label v-if="data.taskFilters.period==='week'">Task della settimana<select :value="data.taskFilters.review" @change="data.filter('review',$event.target.value)"><option v-for="[key,label] in data.weekTaskReviews" :key="key" :value="key">{{label}}</option></select></label>
    <label>Progetto<select :value="data.taskFilters.project" @change="data.filter('project',$event.target.value)"><option value="">Tutti i progetti</option><option v-for="p in data.taskProjects" :key="p.slug" :value="p.slug">{{p.name}}</option></select></label>
    <label>Tag<select :value="data.taskFilters.tag" @change="data.filter('tag',$event.target.value)"><option value="">Tutti i tag</option><option v-for="tag in data.taskTags" :key="tag" :value="tag">#{{tag}}</option></select></label>
    <label>Ordina<select :value="data.taskFilters.sort" @change="data.filter('sort',$event.target.value)"><option value="priority">Importanza e scadenza</option><option value="date">Data della voce</option></select></label>
    <label class="task-filter-search">Cerca nei task<input aria-label="Cerca nei task" :value="searchText" @input="filterText" @keydown.enter.prevent="applySearch" placeholder="Titolo, testo, tag o progetto" /></label>
   </div>
   <p class="hint">Tipo: Task · {{data.blocks.length}} risultati{{!data.complete?' tra le voci caricate · ricerca e ordinamento ancora parziali':''}}. Le modifiche da salvare restano visibili anche se non corrispondono ai filtri.</p>
   <div class="task-filter-chips"><button v-if="data.taskFilters.project" @click="data.filter('project','')">Progetto: {{data.taskProjects.find(p=>p.slug===data.taskFilters.project)?.name}} ×</button><button v-if="data.taskFilters.tag" @click="data.filter('tag','')">#{{data.taskFilters.tag}} ×</button><button v-if="data.taskFilters.text" @click="searchText='';applySearch()">{{data.taskFilters.text}} ×</button></div>
  </section>
  <div v-if="data.taskDiary" class="diary-load-state" role="status" aria-live="polite" :aria-busy="data.loading">
   <p v-if="data.loading">Caricamento dei task in corso · {{data.loaded}} voci caricate. Filtri, ricerca e conteggi si aggiornano all’arrivo delle altre pagine.</p>
   <p v-else-if="data.loadError">Caricamento interrotto · {{data.loaded}} voci caricate. I risultati sono parziali e le modifiche restano disponibili.</p>
   <p v-else-if="data.complete">Caricamento completato · {{data.loaded}} voci caricate.</p>
   <button v-if="data.loadError&&!data.loading" @click="data.retry">Riprova caricamento task</button>
  </div>
  <ChromeSlot :bridge="data.bridge" kind="status"/>
  <p v-if="data.recoveredDrafts&&unsaved" class="diary-recovered-draft" role="status">Ripristinate {{data.recoveredDrafts}} bozze da questa scheda: contengono differenze rispetto alle voci salvate. Puoi salvarle con Salva pagina.</p>
  <main class="diary-paper">
   <section v-if="data.taskDiary" class="diary-task-results"><EntryBlock v-for="block in data.blocks" :key="block.clientId+':'+(block.updatedAt||'draft')" :block="block" :bridge="data.bridge" @changed="revision++"/><p v-if="!data.blocks.length" class="diary-empty">{{data.complete?'Nessun task corrisponde ai filtri.':'Nessun task corrisponde ai filtri tra le voci caricate.'}}</p></section>
   <template v-if="!data.taskDiary"><section v-for="[date,blocks] in groups" :key="date" class="diary-day" :data-diary-date="date">
    <header class="diary-day-heading"><button :aria-label="data.dateLabel(date)" @click="data.openDay(date)" class="diary-date-button"><span class="diary-date-number">{{dayParts(date).number}}</span><span class="diary-date-copy"><strong>{{dayParts(date).weekday}}</strong><span>{{dayParts(date).label}}</span></span></button><span v-if="date===data.todayDate" class="diary-today">Oggi</span><details class="diary-day-menu"><summary aria-label="Aggiungi al giorno" title="Aggiungi una voce a questa giornata"><DiaryIcon name="plus"/></summary><div><button @click="data.add('note',date)"><DiaryIcon name="note"/>Nota</button><button @click="data.add('task',date)"><DiaryIcon name="task"/>Task</button><button @click="data.addDaily(date)">Inizio e fine giornata</button></div></details></header>
    <EntryBlock v-for="reflection in data.reflection(date)" :key="reflection.clientId" :block="reflection" :bridge="data.reflectionBridge" @changed="revision++"/>
    <EntryBlock v-if="!data.project" :block="data.habits(date)" :bridge="data.habitBridge" @changed="revision++"/>
    <EntryBlock v-for="block in blocks" :key="block.clientId+':'+(block.updatedAt||'draft')" :block="block" :bridge="data.bridge" @changed="revision++"/>
    <p v-if="!blocks.length" class="diary-empty">Una pagina aperta per la tua giornata. Aggiungi una nota o un task.</p>
   </section>
   </template>
   <button v-if="data.cursor&&!data.taskDiary" @click="data.more">{{data.taskDiary?'Carica altri task dell’archivio':'Carica altre voci del mese'}}</button>
  </main>
  <footer class="diary-footnote"><DiaryIcon name="note"/><span>Scrivi nel testo e salva quando vuoi.<br><kbd>Ctrl/Cmd</kbd> + <kbd>Invio</kbd> per una nuova nota.</span></footer>
 </div>
</template>
