# Modello dati

La fotografia `readBootstrapView.operations` contiene soltanto pending,
sending, conflict e failed tramite l'indice byScopeStatus. Acked e superseded
restano nello store originale e leggibili per operationId. Schema IndexedDB
v11 e checkpoint invariati. [Contratto e prove](VERIFICA-BOOTSTRAP-OUTBOX-ATTIVA.md).

IndexedDB v11 aggiunge `commonRecords.byCollectionDate` con chiave
`[archiveId, principalId, epoch, collection, data.date]` per le registrazioni
delle abitudini. Giorni e settimane usano intervalli sulla chiave primaria
della rispettiva raccolta. Il bootstrap restituisce `commonScope` esplicito:
`{kind:'journal', month, today}` per il mese, `{kind:'full'}` per i Task.
Le anteprime indipendenti conservano i loro descrittori; il nuovo bootstrap
si basa sempre sul checkpoint completo del consumer.
[Contratto, campi globali e migrazione](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md).

Dalla versione v10, `entries` dispone degli indici composti `byScopeDate`
(`[archiveId, principalId, epoch, data.date]`) e `byScopeType`
(`[archiveId, principalId, epoch, data.type]`). Gli indici sono popolati
automaticamente anche per i record esistenti. La proiezione di bootstrap
restituisce metadati del mese e Task globali, deduplicati per ID, oppure
solo Task. Da v11 i record comuni del mese sono una proiezione per periodo. Nessuna modifica al modello
Google, al protocollo di sync o al formato del checkpoint.
[Verifica della migrazione e dei filtri](VERIFICA-BOOTSTRAP-INDICI.md).

Sviluppo locale: `archiveMeta.coverage.readCheckpoint` registra formato
`local-read-checkpoint/v1`, revisione, cursore scoped e data della lettura
completata dal consumer. Il bootstrap della vista verifica questi dati insieme
alla copertura completa, nella transazione con Entries, corpi, dati comuni,
bozze e outbox. IndexedDB è ora v11, con migrazione additiva degli indici
descritta sotto e senza cancellazione dei record.
[Contratto e invalidazione](VERIFICA-BOOTSTRAP-LOCALE.md).

Dalla versione IndexedDB v9 la copia sperimentale conserva fino a otto descrittori di dati comuni per diario, settimana e abitudini, con appartenenza e versioni verificate; non modifica il modello Google. [Verifica](VERIFICA-PAGINE-LOCALI-DIARIO.md).

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

Per Entries canoniche, i nuovi allegati sono entità `files` nel commit ledger,
con indice per Entry in `settings`; le righe preesistenti del foglio Files
restano la preimmagine legacy. Il dettaglio sovrappone i due insiemi per
`fileId`. L'indice canonico ammette fino a 128 allegati per Entry. La lettura
globale Files non è ancora completa per la sessione successiva al reload.
[Verifica](VERIFICA-ALLEGATI-ENTRIES.md).

La cancellazione di una Entry canonica pubblica un tombstone `entries` e, se
presente, dell'indice allegati `settings` nello stesso commit recuperabile. Il
piano in `settings` conserva operation ID e richiesta per il retry. L'indice
non espone più i riferimenti canonici; il feed immutabile e i payload storici
non vengono eliminati. [Verifica](VERIFICA-CANCELLAZIONE-ENTRIES-CANONICA.md).

La conversione progetto→tag aggiorna le Entries canoniche e tombstona
`projects` in un unico commit. Le route Entries già esistenti restano valide;
quelle delle Entries legacy sono create nello stesso commit. La route Project
si conserva come overlay tombstonato per non far riapparire la preimmagine
legacy. [Verifica](VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md).

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


Seguito del pacchetto 7: [adattatore e anteprima locale del diario](VERIFICA-ANTEPRIMA-LOCALE-DIARIO.md)
implementati dietro interruttore spento. Ultima pagina ordinaria, lettura atomica,
preview distinta dalla risposta canonica; copia reale e riapertura completa
ancora disabilitate.


Seguito del pacchetto 7: [dati comuni nella copia locale](VERIFICA-DATI-COMUNI-LOCALI.md)
implementati dietro interruttore spento. Cataloghi e slice del diario con
copertura esatta e lettura atomica per ID; anteprime pagina/periodo indipendenti.
Riapertura completa, bootstrap coerente e copia reale restano futuri.


Seguito del pacchetto 7: [indice limitato a 16 pagine del diario](VERIFICA-PAGINE-LOCALI-DIARIO.md)
implementato dietro interruttore spento, con lettura atomica mirata e anteprima
anche delle continuazioni. Sostituisce il solo descrittore dell'ultima pagina;
non costituisce una fotografia remota completa o un editor offline.


Pacchetto 8 avviato: [nucleo dei commit recuperabili](VERIFICA-NUCLEO-COMMIT-RECUPERABILI.md)
implementato e verificato con adapter sintetico e fault injection. Non è ancora
collegato a Sheets, API legacy o repository; feed/operazioni reali disabilitati.
Versioni commit-N interne al prototipo, nessuna modifica agli updatedAt esistenti.


Seguito del pacchetto 8: [persistenza a frammenti su due fogli dedicati](VERIFICA-PERSISTENZA-COMMIT-SHEETS.md)
implementata e verificata sui mock, con pubblicazione separata e lookup per chiave.
Nessuna attivazione o provisioning reale; writer/lettori legacy ancora scollegati.
Il budget di storico richiede compattazione prima di un uso continuativo.

Seguito del pacchetto 8: [schema interno sync-day/v1](VERIFICA-WRITER-GIORNALIERO-CANONICO.md).
Entità days identificata dalla data, data:{format:'sync-day/v1',record:{...}};
record contiene tutti i campi DAY_HEADERS escluso updatedAt. Testi e JSON
rich sono stringhe; versione commit-N e cursore appartengono all'envelope
del protocollo. Non migra o modifica lo schema della tabella Days esistente.

Seguito del pacchetto 8: [metadati interni di migrazione Days](VERIFICA-MIGRAZIONE-GIORNI.md).
Nella collezione logica settings: day-routing-v1 elenca fino a 128 date;
day-route:date conserva sourceDigest/legacyVersion; day-plan:hash conserva
input fingerprint e request completa immutabile. Sono dati infrastrutturali,
non preferenze. Per date instradate, updatedAt delle risposte legacy contiene
la versione opaca commit-N. Schema fisico Days invariato; riga originaria
congelata. Applicazione reale ancora disabilitata.

Seguito: [capacità e ritiro dei riferimenti](VERIFICA-CAPACITA-COMMIT.md).
Schema dei due fogli invariato. Le sole vecchie chiavi head/entità selezionate
dalla manutenzione diventano retired:hash; la riga della revisione corrente
e tutti i payload restano invariati. Le righe ritirate escono dai lookup
delle chiavi k:hash, senza eliminazione fisica o reset delle versioni.

Seguito: [metadati persistenti del controller Days](VERIFICA-CONTROLLER-ROUTING-GIORNI.md).
Namespace riservato SYNC_DAY_ROUTING_: ANCHOR_V1 immutabile con archivio/epoca
e binding DB/cartella/fogli; STATE_A_V1/STATE_B_V1 con anchorDigest, revisione
e modalità; MARK_A_V1/MARK_B_V1 per preparazione/pubblicazione. Checksum SHA-256,
nessuna identità utente in chiaro o contenuto del diario. Nessuna proprietà
viene creata dall'avvio ordinario: registrazione server esplicita e disabilitata
per default; nessuna tabella o modifica degli schemi del diario.


## Snapshot canonici HabitLogs — prototipo locale SPEC-004

Collezione habitLogs, chiave habitId|data, formato sync-habit-log/v1: snapshot
di LOG_HEADERS salvo updatedAt; versione commit-N dal nucleo. Checklist JSON
completa con steps/checked, ID univoci e titoli storici, stato coerente. Nessuna
nuova colonna legacy. Piani e routing in settings del registro, con digest
della preimmagine e dei cataloghi; [contratto e limiti](VERIFICA-MIGRAZIONE-REGISTRAZIONI.md).
Iniezione spenta, nessuna migrazione reale o provisioning automatico.


Il controller HabitLogs aggiunge un'ancora interna con cinque ID distinti:
habitLogsSheetId, indexSheetId, blockSheetId, habitsSheetId, goalsSheetId.
Stato active/readOnly a due slot in ScriptProperties e chiavi
SYNC_HABIT_LOG_ROUTING_*; [contratto](VERIFICA-CONTROLLER-REGISTRAZIONI.md).
Nessuna nuova colonna nei fogli legacy o attivazione reale.


## Snapshot canonici Goals/Habits — prototipo locale SPEC-004

Formati sync-goal/v1 e sync-habit/v1 nelle collezioni goals/habits: record
completi dei rispettivi HEADERS salvo updatedAt; versioni commit-N. Steps è
JSON canonico con ID/titoli della definizione corrente; le checklist dei log
restano fotografie indipendenti. L'archivio è un upsert archived:yes, senza
cancellare o riscrivere la definizione precedente. Lotti fino a 25 record e
32.768 unità complessive, senza divisione automatica. [Contratto e limiti](VERIFICA-WRITER-CATALOGHI-CANONICO.md).
Nessun writer o lettore applicativo migrato, nessuna nuova colonna legacy.

## Proiezioni bootstrap week/habits — 6 novembre 2026

Nessuna migrazione: IndexedDB resta v11. readBootstrapView aggiunge kind, week
e date alle richieste; commonScope distingue journal/week/habits (full nella
vista Task). Gli intervalli condividono commonReadRanges con le anteprime,
ma richiedono il checkpoint completo per attestare la copertura. La settimana
include metadati Task globali e corpi delle sole voci nei sette giorni;
Abitudini non idrata corpi. Dettagli in VERIFICA-BOOTSTRAP-VISTE-PERIODO.md.

## Kind day nell'outbox — 6 novembre 2026

IndexedDB resta v11: store/indici esistenti supportano kind day, id=data,
action upsert. Payload {operationId,baseVersion,day}, dove day contiene tutti
i campi DAY_HEADERS escluso updatedAt. La bozza contiene lo stesso snapshot
e updatedAt della baseline. Revisione CAS distinta dalla versione canonica.
Le scelte di conflitto conservano snapshot locali/remoti sulle operazioni
superate. ACK aggiorna anche commonRecords/days nella transazione di settlement,
proteggendo versioni feed più recenti. Vedere VERIFICA-OUTBOX-GIORNATE.md.

## Kind week — 6 novembre 2026

IndexedDB resta v11. kind week, id=lunedì ISO, action upsert; payload
{operationId,baseVersion,week}, dove week contiene tutti i WEEK_HEADERS
escluso updatedAt. La bozza conserva lo stesso snapshot e la baseline.
Metadati della bozza/CAS distinti dalla versione canonica; Days e Weeks sullo
stesso lunedì usano namespace e record comuni distinti. ACK aggiorna solo
commonRecords/weeks e le dipendenze compatibili mai inviate. Vedere
VERIFICA-OUTBOX-SETTIMANE.md per limiti, versioni e riconciliazione.
