# Stato dei pacchetti SPEC-004

Rilevazione di base del 29 ottobre 2026; aggiornamento bootstrap del 6 novembre sotto.
Il riferimento di ambito resta la [SPEC-004, sezione 15](specs/004-usabilita-locale-e-sincronizzazione.md#15-pacchetti-di-implementazione).
Questa tabella non riduce il piano ai soli incrementi già implementati e non
certifica il deployment Google: online resta Apps Script 75.

**Conteggio:** 4 pacchetti completati localmente, 6 con sviluppo locale ancora
necessario (7–12) e 2 in attesa di verifica esterna (2 e 4). Quindi 8
pacchetti aperti su 12, ma solo 6 richiedono ancora sviluppo locale secondo
questa tabella. Non è una stima percentuale del lavoro: ogni pacchetto comprende
più sottoattività, con dimensioni molto diverse.

| N. | Pacchetto | Stato locale ed evidenza | Cosa resta |
|---|---|---|---|
| 1 | Tracing lock e fixture crescita | Implementato; [verifica iniziale](VERIFICA-AVVIO-SPEC-004.md), test lock/scale | Nessuno sviluppo locale identificato per questo pacchetto; i mock non certificano latenza Google |
| 2 | Prototipo IndexedDB e identità archivio | Codice locale implementato; [identità](VERIFICA-IDENTITA-ARCHIVIO.md) e prova sintetica storage | Collaudo nel vero iframe Google e verifica delle assunzioni di identità/persistenza; eventuali correzioni dipendono dall'esito |
| 3 | Ricerca coerente senza lock lungo | Implementato; [verifica ricerca](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md), test:search-concurrency | Nessuno sviluppo locale identificato per questo pacchetto |
| 4 | Worker coordinato | Lotti piccoli; writer Docs API condizionale; prenotazione con token/versione e lease di 60s; lavoro di scrittura fuori lock; takeover fenced; recupero ACK perso senza duplicati; test simulati della contesa con cancellazione/rebase/export/worker legacy. Gate completo superato; [lotti](VERIFICA-WORKER-LOTTI-PICCOLI.md), [writer/limiti](VERIFICA-WRITER-DOCS-CONDIZIONALE.md) | Convalida del fence contro Docs reale. Creazione iniziale delle sezioni ancora sotto lock |
| 5 | Task metadati/corpi separati | Implementato con fotografia delle continuazioni; [verifica](VERIFICA-TASK-CONTENUTI-DIFFERITI.md), test:task-deferred/test:task-index | Nessuno sviluppo locale identificato per questo pacchetto |
| 6 | Dati comuni per intervallo e delta | Implementato; [periodi](VERIFICA-DATI-COMUNI-PERIODO.md), test common-periods/catalog-deltas/day-batch/incremental/legacy-deltas/delete-delta | Nessuno sviluppo locale identificato per questo pacchetto |
| 7 | Repository locale e riapertura viste | Repository, anteprime, riapertura modificabile della prima pagina locale e delle voci in outbox durante o dopo la lettura remota, più pagine e fino a otto periodi di dati comuni per diario, settimana e abitudini dietro interruttori spenti; riattivazione della copia valida dopo consenso scoped e nuova verifica identità, con cache collegate alla UI prima della sincronizzazione in background; [verifica pagine](VERIFICA-PAGINE-LOCALI-DIARIO.md) | Riapertura applicativa completa, integrazione coerente, copertura delle altre viste, riapertura senza RPC bloccante e collaudo reale; dipendenze dal bootstrap |
| 8 | Commit recuperabili, ricevute e feed completo | Nucleo/store/capacità, Days/Weeks/HabitLogs, routing Goals/Habits/impostazioni e Projects con controller/browser; writer/gateway/controller Entries, mutazioni metadata e creazioni rapide/nota completa, pianificazione `TaskPlans`, corpo Docs con puntatore `DocContent`, diario continuo multi-blocco, allegati canonici, cancellazione, conversione progetto→tag atomica, vista globale File collegati, lookup batch volatile e endpoint read-only `getChanges`; [lookup Entries](VERIFICA-LOOKUP-ENTRIES-BATCH.md), [creazioni Entries](VERIFICA-CREAZIONE-ENTRIES-CANONICA.md), [routing Catalog](VERIFICA-CONTROLLER-CATALOGHI.md), [routing Projects](VERIFICA-CONTROLLER-PROGETTI.md), [API commit feed](VERIFICA-FEED-COMMIT-API.md), [vista globale Files](VERIFICA-FEED-GLOBALE-FILES-ENTRIES.md), [conversione progetto→tag](VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md), [mutazioni metadata](VERIFICA-MUTAZIONI-ENTRIES.md), [pianificazione](VERIFICA-PIANIFICAZIONE-ENTRIES.md), [contenuti](VERIFICA-CONTENUTI-ENTRIES.md), [diario continuo](VERIFICA-DIARIO-CONTINUO-ENTRIES.md), [allegati](VERIFICA-ALLEGATI-ENTRIES.md), [cancellazione](VERIFICA-CANCELLAZIONE-ENTRIES-CANONICA.md) | Bootstrap coerente e feed incrementale completo prima di pubblicarlo ai client; contratto di provisioning/abilitazione e restanti verifiche di scala |
| 9 | Bootstrap coerente e riconciliazione Docs | Pagine keyset con checkpoint/feed per Entries, Projects, Days, Weeks, HabitLogs, Goals, Habits, Files, settings (privacy/reflection) e layouts; consumer client per snapshot/feed, idratazione contenuti canonici, scansione Docs legacy a richiesta e checkpoint scoped dietro capability spente; replay del feed dall'origine ricostruisce Files/Layout canonici senza enumerare tutte le Entries per pagina; scheduler avviato su opt-in UI dopo bootstrap; import corpo/titolo, rebase e `getContentsBatch`; [consumer](VERIFICA-CONSUMER-SNAPSHOT-FEED.md), [scheduler](VERIFICA-SCHEDULER-SYNC.md), [pagine snapshot](VERIFICA-PAGINE-SNAPSHOT.md), [import](VERIFICA-RICONCILIAZIONE-DOCS-ENTRIES.md), [rebase](VERIFICA-REBASE-DOCS-ENTRIES.md), [contenuti](VERIFICA-CONTENUTI-BATCH-ENTRIES.md), [checkpoint/feed](VERIFICA-FEED-COMMIT-API.md) | Capability Demo spenta: avvio sync UI non ancora esercitato contro staging; riapertura viste integrate nella UI; Files/Layouts rileggono ancora le rispettive tabelle legacy e il bootstrap riproduce l'intero feed retained; checkpoint per futura retention e collaudo iframe |
| 10 | Indice e ricerca locale | IndexedDB v9 senza posting duplicati, con indice allegati per voce e refresh mirato; UI usa n-gramma worker senza scansione persistita per query; bozze migrate dopo conferma, CAS e conflitti tra schede protetti; test equivalenza 2.500, worker/fallback 201; heap Node 48,67 MB/10k e 180,99 MB/50k; Chromium 10k 4,73 MB/740–745 ms e 50k 16,84–17,63 MB/3,80–3,87 s, scan ~1,05 s; [verifica](VERIFICA-INDICE-RICERCA-LOCALE.md) | Capability server spenta e CSP staging non collaudata; stress su testi/bozze rappresentativi e archivio completo |
| 11 | Outbox e conflitti | Fondazione atomica draft+outbox; IndexedDB v7 con indici per stato e per voce/stato; lease owner/token cross-tab, claim FIFO con dipendenze ACK e tentativi; full jitter 1–300 s e classificazione; coalescenza limitata a una mutazione compatibile non inviata con ID preservato; writer upsert/delete idempotenti per operationId; UI note/task salva prima in IndexedDB e Elimina accoda il delete dopo commit locale; dispatcher trasporta upsert/delete con gate `operations:true`; ACK aggiorna baseline draft e dipendenze nella stessa transazione; operazioni pending ripristinate alla riapertura; confronto e scelte di recupero per conflitti note/task, anche per voce assente e cancellazione; test controller, repository/outbox/UI, identity, Entries browser e release passati; [verifica](VERIFICA-OUTBOX-LOCALE.md) | Capability operations ancora falsa nel manifest; percorso trasporto non collaudato contro server attivo; gestione completa degli errori e delle dipendenze più complesse, copertura delle altre mutazioni e verifiche con server attivo |
| 12 | Retention, compattazione e stress | Preflight, ritiro dei soli riferimenti attivi, ispezione senza scritture di ricevute e intervalli di commit e inventario fisico paginato delle ricevute per principal; [limiti](VERIFICA-CAPACITA-COMMIT.md) | Inventario coerente dell'intero grafo, retention, payload/storico fisico, checkpoint recuperabili, stress e capacità dichiarata del sistema completo |

Il pacchetto 4 ha completato la tranche locale del worker coordinato; resta
aperto per la convalida del fence contro Docs reale. I pacchetti 7, 8, 9, 10,
11 e 12 richiedono ancora sviluppo; i pacchetti 2 e 4 hanno anche verifiche
esterne pendenti. Ogni nuovo incremento deve superare build, test pertinenti e release
quando riguarda diario/task, prima di passare al successivo. Registrare gli
esiti nel rapporto specifico e in HANDOFF.

Il piano non autorizza deploy, setup o migrazioni sui dati reali. Le verifiche
Google richiedono un'azione pertinente autorizzata separatamente; non sono un
motivo per saltare lo sviluppo locale ancora disponibile.

## Aggiornamento bootstrap — 6 novembre 2026

I seguiti del 5 novembre hanno introdotto checkpoint completo del diario,
indici per vista, dati comuni per periodo e outbox attiva. Il 6 novembre
aggiunti benchmark applicativo, limite iniziale agli editor Task e riapertura
completa Settimana/Abitudini. Le righe 7 e 9 sopra descrivono lo stato di base:
queste viste ora usano il checkpoint coerente; altre viste e collaudi reali
restano aperti. Nessuna chiusura aggiuntiva di pacchetti interi. Rapporti:
VERIFICA-BOOTSTRAP-APPLICATIVO.md e VERIFICA-BOOTSTRAP-VISTE-PERIODO.md.
