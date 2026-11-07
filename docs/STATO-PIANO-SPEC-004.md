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
| 11 | Outbox e conflitti | Fondazione atomica draft+outbox; IndexedDB v11 con indici per stato e per voce/stato; lease owner/token cross-tab, claim FIFO con dipendenze ACK e tentativi; full jitter 1–300 s e classificazione; coalescenza limitata a una mutazione compatibile non inviata con ID preservato; writer upsert/delete idempotenti per operationId; UI note/task salva prima in IndexedDB e Elimina accoda il delete dopo commit locale; dispatcher trasporta upsert/delete con gate `operations:true`; ACK aggiorna baseline draft e dipendenze nella stessa transazione; operazioni pending ripristinate alla riapertura; confronto e scelte di recupero per conflitti note/task, anche per voce assente e cancellazione; test controller, repository/outbox/UI, identity, Entries browser e release passati; Days/Weeks/HabitLogs con snapshot completi atomici, ricevute scoped, ACK/retry/conflitti, UI e checklist storiche/cataloghi verificati; [verifica generale](VERIFICA-OUTBOX-LOCALE.md), [Days](VERIFICA-OUTBOX-GIORNATE.md), [Weeks](VERIFICA-OUTBOX-SETTIMANE.md), [HabitLogs](VERIFICA-OUTBOX-REGISTRAZIONI.md) | Capability operations ancora falsa nel manifest; trasporto collaudato solo contro backend sintetico, nessun collaudo Google; directory HabitLogs v2 a 16 shard (massimo teorico 2.176, con bucket saturabili) e lettura compatibile v1; restano retention/compattazione: budget 512 riferimenti per chiave blocca la 129a nuova identità nello scenario senza compattazione; compatibilità client e snapshot/feed HTTP a 1.000 identità non ancora provati; gestione completa degli errori e delle dipendenze più complesse, copertura delle altre mutazioni e verifiche con server attivo |
| 12 | Retention, compattazione e stress | Preflight e ispezioni read-only; piani `sync-retention-plan/v1` e stato CAS `sync-retention-state/v1`, scoped, default-off e fail-closed. Controller Demo verifica il checkpoint pubblicato e il prefisso alias entro 25 commit. [Capacità](VERIFICA-CAPACITA-COMMIT.md), [pianificazione/verifiche retention](VERIFICA-RETENTION-FISICA.md) | Inventari completi di ricevute/alias, baseline Docs, lettori e legacy; audit alias paginato oltre 25; minimo cursore e ritiro fisico recuperabile. Nessuna retention fisica dimostrata |

Il pacchetto 4 ha completato la tranche locale del worker coordinato; resta
aperto per la convalida del fence contro Docs reale. I pacchetti 7, 8, 9, 10,
11 e 12 richiedono ancora sviluppo; i pacchetti 2 e 4 hanno anche verifiche
esterne pendenti. Ogni nuovo incremento deve superare build, test pertinenti e release
quando riguarda diario/task, prima di passare al successivo. Registrare gli
esiti nel rapporto specifico e in HANDOFF.

Il piano non autorizza deploy, setup o migrazioni sui dati reali. Le verifiche
Google richiedono un'azione pertinente autorizzata separatamente; non sono un
motivo per saltare lo sviluppo locale ancora disponibile.

## Aggiornamento routing HabitLogs v2 — 7 novembre 2026

Routing directory compatibile v1 con indice v2 a 16 shard; fixture sintetiche 127/128/129/256/1.000 e fault/recovery incluse in npm test. Chromium/IndexedDB reale verifica 1.000 record e riapertura. Il budget di 512 riferimenti resta il tetto operativo senza compattazione; snapshot HTTP/feed a 1.000 e race v2 fra client simultanei sono residui. [Rapporto routing/capacità](VERIFICA-CAPACITA-ROUTING-HABITLOGS.md). Il pacchetto 11 resta aperto.

## Aggiornamento evidenze cataloghi HabitLogs — 6 novembre 2026

Aggiornata dalla base beed3f9 la prova `verify-habit-catalog-sync-e2e-browser.cjs`:
upsert Goals e Habits canonici via feed,
retry incompleto/errore, tombstone attraverso commit store e feed sintetico,
sequenza conferma/invio HabitLogs/ACK trattenuto/delta/ACK, modifica successiva
preservata, intenzione bloccata non inviata e risposta tardiva dopo revoca.
La prova attraversa consumer, repository, handler UI e BroadcastChannel su due
pagine Chromium con IndexedDB condivisa; durante il feed mantiene un editor
rich text sporco con formato, testo, nodo, focus e selezione, più il tracker
nella scheda peer. Corretto lo stato UI da `ready` a `stale` quando il feed
fallisce. L'editor resta attivo anche durante l'ACK trattenuto, la modifica
successiva della stessa cella e il delta. L'upsert con `updatedAt` invariato
resta dimostrato solo da prova repository diretta. Il conteggio della
tabella sopra non cambia; pacchetto 11 e offline restano aperti. Limiti e
risultati: `VERIFICA-RIALLINEAMENTO-CATALOGHI-HABITLOGS-LOCALE.md`.

## Aggiornamento bootstrap — 6 novembre 2026

I seguiti del 5 novembre hanno introdotto checkpoint completo del diario,
indici per vista, dati comuni per periodo e outbox attiva. Il 6 novembre
aggiunti benchmark applicativo, limite iniziale agli editor Task e riapertura
completa Settimana/Abitudini. Le righe 7 e 9 sopra descrivono lo stato di base:
queste viste ora usano il checkpoint coerente; altre viste e collaudi reali
restano aperti. Nessuna chiusura aggiuntiva di pacchetti interi. Rapporti:
VERIFICA-BOOTSTRAP-APPLICATIVO.md e VERIFICA-BOOTSTRAP-VISTE-PERIODO.md.

## Aggiornamento pacchetto 11 — outbox Days, 6 novembre 2026

Implementati localmente salvataggio durevole Days, trasporto/ricevute scoped,
ACK/dipendenze e recupero conflitti nei punti UI del diario e Abitudini.
Nuovo test:day-outbox; rapporto VERIFICA-OUTBOX-GIORNATE.md. Non chiude il
pacchetto 11: altre mutazioni, provisioning e convalida Google restano aperti.

## Aggiornamento pacchetto 11 — outbox Weeks, 6 novembre 2026

Weeks collegato localmente al salvataggio durevole, trasporto/ricevute scoped,
ACK/dependenze e recupero dei conflitti del checkup, riutilizzando Days.
Rapporto VERIFICA-OUTBOX-SETTIMANE.md. Nessuna chiusura del pacchetto 11:
registrazioni abitudini, altre mutazioni e gate Google rimangono aperti.


### Tranche HabitLogs, dalla base ce92b50

Pacchetto 11 esteso localmente alle registrazioni HabitLogs, oltre a Days/Weeks:
commit atomico, checklist storica, dipendenze dei cataloghi, ricevute scoped,
ACK/retry e confronto locale/Google; tre ingressi UI e regressioni dedicate.
Goals/Habits restano fuori outbox. Nessuna attivazione reale; pacchetto 11
parziale. Directory limitata a 128 log, migrazioni, retention/compatibilità e
iframe Google restano gate separati.
[Rapporto corrente](VERIFICA-OUTBOX-REGISTRAZIONI.md).

### Seguito: coerenza locale cataloghi HabitLogs — parziale, 6 novembre

Introdotta la prova IndexedDB per inventario/versioni Goals/Habits e il guard
atomico sulla scrittura HabitLogs. Delta catalogo invalida la prova; l'intento
resta non confermato quando baseline/catalogo non sono dimostrabili. Le prove
browser/repository HabitLogs, `test:repository`, `test:release` e `npm test`
sono superate sul risultato integrato; il riallineamento catalogo in browser è
simulato tramite feed sintetico. Pacchetto 11 resta aperto per i limiti elencati
nel rapporto, non per completamento implicito dell'intero pacchetto.
[Rapporto e limiti](VERIFICA-CATALOGHI-HABITLOGS-LOCALE.md).

### Seguito: riallineamento esplicito cataloghi HabitLogs — parziale, 6 novembre

Sul commit 9d5a5b4 è stato collegato il sync/bootstrap esistente a un percorso
visibile di retry, revisione della copia locale e conferma esplicita. La
conferma durevole è scoped al fingerprint/cursore completo; feed identici la
mantengono e delta reali la invalidano finché non arriva conferma esplicita,
anche con versione `updatedAt` invariata. La scrittura HabitLogs controlla la
conferma nella stessa transazione IndexedDB. La tranche successiva ha aggiunto
le prove UI cross-tab e le interleaving documentate sotto; restano i limiti ivi
elencati e nessun collaudo Google. Pacchetto 11 aperto, offline completo non
disponibile.
[Rapporto e limiti](VERIFICA-RIALLINEAMENTO-CATALOGHI-HABITLOGS-LOCALE.md).


### Seguito: ordini concorrenti del riallineamento HabitLogs — parziale, 6 novembre

Sul commit f978f4a la prova browser estende la copertura degli ordini di ACK,
feed e conferma fra schede. La conferma UI viene verificata dopo il commit
IndexedDB: un delta che si inserisce prima del readback la lascia bloccata.
Prove Chromium a due pagine con archivio condiviso coprono ACK prima/durante/dopo
il delta, versione invariata e aggiornata, tombstone, ACK dipendente ancora in
coda, editor rich-text sporco con focus/selezione e tracker attivo nell'altra
scheda, cambio scope, revoca e retry dopo feed incompleto. Il repository mantiene
fresco l'indice Entries sui delta di catalogo non pertinenti. Restano non provati
tutti gli ordini arbitrari di tre o più feed/ACK, ogni tipo di editor e due form
testuali sporchi simultanei in viste diverse. Rapporto:
[ordini concorrenti del riallineamento](VERIFICA-RIALLINEAMENTO-CATALOGHI-HABITLOGS-LOCALE.md).
Il backend è sintetico; pacchetto 11 aperto, offline completo non disponibile.

## Seguito capacità continuativa — 7 novembre 2026

Policy server HabitLogs dietro consenso privato spento, con compattazione
recuperabile dei riferimenti attivi prima del budget aggregato e nelle
scritture/recupero: soglia 384, lotti 64, due lotti/128 ritiri per lock, budget
cooperativo 2 s. Il limite 512 non aumenta; nessuna eliminazione fisica o
retention. La riga 11 sopra descrive il profilo senza compattazione: il nuovo
profilo opt-in è documentato nel rapporto di [capacità continuativa HabitLogs](VERIFICA-CAPACITA-CONTINUATIVA-HABITLOGS.md).
I pacchetti 11/12 restano aperti e il conteggio 8/12 non cambia; non è una
certificazione Google né un'attivazione per client reali.

Esito del profilo opt-in locale: 1.000 creazioni effettive, 2.000 commit,
3.648 riferimenti ritirati, 1.401 fault/replay, contesa V8 sullo stesso shard,
snapshot HTTP e consumer Chromium con 1.012 log e replay di 2.002 commit
(inclusi due setting). Riapertura IndexedDB verificata. La snapshot rimane
costosa: 728.201 letture simulate del ledger per pagina HabitLogs; restano
ottimizzazione delle letture e collaudo quote/latenza Google. Non si dichiara
chiuso il pacchetto 12 né la compatibilità dei client distribuiti.

## Seguito snapshot HabitLogs mirate — 7 novembre 2026

Implementata selezione keyset prima dell'idratazione, stato minimo nei nuovi
riferimenti verificati e vista del head limitata al lock. Restano metadati
globali per coverage e lettura compatibile dei riferimenti precedenti senza
proiezione. Nessun cambio a retention fisica o capability reali. Prove,
misure e limiti: [snapshot HabitLogs mirate](VERIFICA-SNAPSHOT-HABITLOGS-MIRATE.md). Il conteggio 8/12 pacchetti aperti
rimane invariato; il seguito non chiude pacchetto 12 o offline completo.

Esito: matrice 127/128/129/256/1.000 con pagine 1/25/100, confronto di risposte
identiche sulla stessa fixture con a06f8ee, massimo letture ledger+legacy
728.203→3.156 (−99,57%), celle 32.129.427→267.886 su 11 pagine, batch massimo
invariato. Consumer HTTP/Chromium applica 2.002 commit, oppure 2.004 con
aggiornamento concorrente, e riapre IndexedDB. Tutte le suite richieste
superate. Restano metadati globali e costo di compatibilità dei riferimenti
precedenti senza state; nessuna sostenibilità Google dichiarata.
