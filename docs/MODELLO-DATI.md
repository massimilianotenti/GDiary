# Modello dati

Schemi estratti dai sorgenti v2.0.3. Le costanti nel codice restano la definizione operativa; verificare le funzioni di estensione prima di modificare fogli esistenti.

## PLAN_HEADERS — Code.gs

```js
['entryId','date','updatedAt','workStart','workEnd','importance']
```

## ENTRY_HEADERS — Code.gs

```js
['id','date','type','text','projects','due','status','createdAt','updatedAt','requestId','scope','body','completedAt','tags']
```

## PROJECT_HEADERS — Code.gs

```js
['slug','name','description','updatedAt']
```

## FILE_HEADERS — Code.gs

```js
['id','entryId','fileId','title','url','addedAt']
```

## WEEK_HEADERS — Code.gs

```js
['week','focus','priorities','wins','obstacles','lessons','next','energy','closed','updatedAt']
```

## DAY_EXTRA_HEADERS — Code.gs

```js
["gratitude", "lifeArea", "smallStep", "meaningfulMoment", "feelings", "difficulties", "learning", "intentionRich", "reflectionRich"]
```

## DAY_HEADERS — Code.gs

```js
['date','intention','reflection','updatedAt',...DAY_EXTRA_HEADERS]
```

## GOAL_HEADERS — Code.gs

```js
['id','cycle','title','target','progress','project','updatedAt','icon','description']
```

## HABIT_HEADERS — Code.gs

```js
['id','goalId','title','days','start','updatedAt','steps','archived','icon','description']
```

## REF_HEADERS — Code.gs

```js
['entryId','docId','bookmark','docName','updatedAt']
```

## REG_HEADERS — Code.gs

```js
['key','kind','id','parent']
```

## JOB_HEADERS — Code.gs

```js
['id','project','docId','cursor','revision','status']
```

## LOG_HEADERS — Code.gs

```js
['key','habitId','date','status','updatedAt','checklist']
```

## TASK_DOC_HEADERS — DriveDocs.gs

```js
['entryId','status','updatedAt','error']
```

## DOC_CONTENT_HEADERS — DriveDocs.gs

```js
['key','entryId','part','payload']
```

## JOURNAL_LAYOUT_HEADERS — JournalEditor.gs

```js
['entryId','position','updatedAt']
```

## Identità e contenuti

Entries.id identifica la voce condivisa tra tutte le viste. Entries.text è il titolo; non usare la colonna body storica per dedurre da sola dove si trova il testo corrente. DocContent memorizza JSON suddiviso in parti, TaskDocQueue lo stato della sincronizzazione, DocRefs il collegamento alle sezioni Docs, JournalLayout la posizione nel diario. updatedAt viene usato per controllare modifiche concorrenti; requestId/clientId aiutano a evitare duplicazioni.

TaskPlans.date è la pianificazione giornaliera; workStart/workEnd il periodo di lavorazione; Entries.due la deadline e Entries.date la data di annotazione. completedAt è l'istante di completamento, convertito in Europe/Rome per i riepiloghi. Non confondere questi campi durante filtri o migrazioni.
