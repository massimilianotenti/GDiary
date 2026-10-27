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

## Contratto Task differiti — sviluppo locale SPEC-004

`getJournalPage` con `taskOnly: true, metadataOnly: true` restituisce fino a
200 metadati, senza body/rich, con `contentLoaded: false`; la risposta dichiara
`contentsIncluded: false`. L'assenza del corpo non rappresenta una stringa vuota
canonica. `getJournalContents` accetta al massimo 25 coppie `{id, updatedAt}`
e restituisce contenuti verificati, errori per voce e identità rimaste per budget.

`contentLoaded` è un flag del trasporto e delle bozze client, non una colonna
Sheets. I blocchi dichiarati incompleti vengono rifiutati dal salvataggio prima
delle scritture. Nessuna migrazione del formato persistente o nuova identità.

Le continuazioni possono usare `taskSnapshot` (token casuale) e `snapshotOffset`,
insieme al cursore della voce precedente. `snapshotReset` segnala una fotografia
non più riusabile senza sostituirla silenziosamente. Sono campi di trasporto,
non colonne o bozze persistenti. La sola nuova proprietà applicativa
`TASK_INDEX_REVISION` contiene una revisione casuale per invalidare gli indici
prima delle mutazioni di Entries/TaskPlans/JournalLayout/TaskDocQueue.

## Contratto commonSlices — sviluppo locale

Nessuna modifica ai fogli. commonSlices espone days/weeks/habitLogs come {from,to,rows}; intervalli inclusivi autorevoli, identità date/week/key. commonScope distingue journal (month,today) da full; commonIncluded:false omette le collezioni. Non interpretare una slice come una collezione completa. Dettagli e limiti nella [verifica dedicata](VERIFICA-DATI-COMUNI-PERIODO.md).

Nel seguito Settimana/Abitudini, le slice accettano `ranges:[{from,to},...]` per unioni di periodi; il merge è autorevole solo nell’unione. Scope aggiunti `{kind:"week",week}` e `{kind:"habits",week,date}`. Nessuno schema nuovo. [Verifica](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).

## Delta cataloghi — sviluppo locale

commonUpserts supporta anche goals:id, habits:id e projects:slug. deleteHabit restituisce il record con archived:yes; nessun tombstone o nuovo schema. settingsPatch aggiorna le impostazioni versionate. commonScope:{kind:"catalogs"} non dichiara copertura temporale. [Verifica](VERIFICA-CATALOGHI-DELTA.md).

## saveDays — sviluppo locale

Nessuno schema nuovo. Array days fino a 10 date/500.000 byte; results per data con stati saved/conflict/invalid/error/notAttempted e commonUpserts.days per le sole conferme. Non è un commit atomico né un protocollo operationId. [Verifica](VERIFICA-RIFLESSIONI-LOTTO.md).

## Delta legacy — sviluppo locale

fileUpserts contiene record FILE_HEADERS canonici per ID. entryPatches contiene id/projects/tags/scope/updatedAt delle voci convertite; commonRemovals.projects rimuove slug e addedTags aggiorna il catalogo. Nessuna modifica agli schemi persistiti. [Verifica](VERIFICA-DELTA-LEGACY.md).

## Delta di cancellazione — sviluppo locale

deletedEntryIds indica le identità assenti dopo deleteNote; alreadyAbsent distingue il ramo già assente. Nessuna tabella tombstone o ricevuta operationId aggiunta. Contratto completo legacy preservato. [Verifica](VERIFICA-CANCELLAZIONE-DELTA.md).

## Revisione della ricerca — sviluppo locale

Nuova ScriptProperty runtime SEARCH_REVISION, avanzata una volta per richiesta per Entries/DocRefs/Files/Projects/TaskDocQueue/DocContent. Nessun foglio nuovo. searchVersion è uno scope interno con query/revisione/configurazione; searchReset richiede ripartenza e partial indica fonti non verificate. Non è un feed né un namespace IndexedDB. [Verifica](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).

## Risultato worker a piccoli lotti — sviluppo locale

Schema TaskDocQueue invariato. La risposta aggiunge attempted/chunks/stopReason; pending è null su lock occupato, processed conserva i successi precedenti. Nuove versioni di ID già tentati restano per un passaggio successivo. Invalidazioni Task/ricerca una per unità IO, anche più volte nella stessa RPC worker. [Verifica](VERIFICA-WORKER-LOTTI-PICCOLI.md).

## Identità locale futura — sviluppo locale

ScriptProperties: LOCAL_ARCHIVE_V1 seguito dalla coppia JSON DB_ID/ROOT_ID contiene schemaVersion, archiveId ed epoch. UserProperties: LOCAL_PRINCIPAL_V1 contiene un UUID del principale. Nessuna email persistita né foglio nuovo. getSyncManifest protocollo/schema 1, capacità cache/feed/operazioni false. Non è un token di autorizzazione. [Verifica](VERIFICA-IDENTITA-ARCHIVIO.md).


## Fondamenta repository locale (disabilitate sui dati reali)

Schema, transazioni e prova sintetica sono implementati; nessuna vista usa
ancora la copia locale. Contratto e limiti in
[VERIFICA-REPOSITORY-LOCALE](VERIFICA-REPOSITORY-LOCALE.md).
