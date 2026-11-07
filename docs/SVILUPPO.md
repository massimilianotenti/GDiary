# Sviluppo e verifiche

`npm run test:local-bootstrap` verifica il bootstrap con consumer reale,
snapshot su più pagine, riavvio Chromium, identità, privacy, checkpoint atomico,
errore di recupero corpi, tombstone e bozze. Incluso in test:repository.
[Dettagli](VERIFICA-BOOTSTRAP-LOCALE.md).

`npm run test:repository` include la prima pagina locale modificabile, la versione di base, i blocchi di bypass e la conservazione dell'editor dopo risposte tardive.

`npm run test:local-common` verifica anche anteprime di settimana e abitudini, intervalli disgiunti e migrazione IndexedDB v8→v9 con bozze e outbox conservate.

Modificare frontend/shell.html, frontend/components e CSS; poi `npm run build`. Non usare Index.html come sorgente principale di modifiche dell'interfaccia. Modificare i .gs direttamente per il backend.

La demo usa servizi Google simulati: tutti i test locali devono restare indipendenti dall'archivio reale. Gli accessi HTTPS sono bloccati in molte prove browser. Le suite locali non dimostrano il funzionamento del deployment autenticato.

Comandi:

- `npm ci`: ricrea node_modules dal lockfile.
- `npm run build`: crea Index.html, aggiorna Demo.html e prepara .build/apps-script.
- `npm test`: backend simulato, validazioni, conflitti, cache, ricerca e pipeline.
- `npx playwright install chromium`: installa il browser locale per i test.
- `npm run test:release`: regressioni recenti delle release precedenti alla 2.0.4.
- `npm run test:incremental`: risposte di salvataggio limitate e merge browser senza riletture complete.
- `npm run test:cycle`: design del ciclo, form, bozze/conflitti, riflessione rich, tracker e geometrie nelle quattro palette.
- `npm run test:diary-goals`: promemoria degli obiettivi, trimestre/anno visualizzato, arrivo dei dati con bozze aperte, fallback e geometrie.
- `npm run test:tracing`: diagnostica backend simulata e privacy/export browser.
- `npm run test:locks`: durata attesa/occupazione lock, errori e rilascio con clock controllato.
- `npm run test:storage`: prova IndexedDB con soli dati fittizi, riavvio Chromium, guasti e privacy; usa un server HTTP locale temporaneo.
- `npm run test:scale`: fixture sintetiche fino a 50.000 voci, storico revisioni e baseline del lettore in artifacts/scale-baseline.json; non misura la latenza Google.
- `npm run test:entry-batch`: equivalenza e limiti delle letture Entries, soglia 500/501 e paginazione Task con corpi pending; incluso anche in npm test.
- `npm run test:task-deferred`: API metadati/contenuti e browser con letture sospese, ricerca parziale, bozze/conflitti, focus e privacy; il backend è incluso anche in npm test.
- `npm run test:task-index`: fotografia ordinata, versioni/invalidazioni, guasti e recupero browser; backend incluso in npm test, continuazioni misurate anche da test:scale.
- `npm run test:e2e`: suite browser storica completa. Non ogni script di tests è incluso in questo comando.
- `node tests/verify-p85-week.cjs`: checkup, salvataggio/riprova, tracker e layout.
- `node tests/verify-p82-tasks.cjs`: task in archivio, privacy e salvataggi parziali.

I test storici mantengono prefissi Pxx anche se la release corrente è 2.0.4. Alcuni producono PNG nella radice o in artifacts; questi output sono esclusi da Git. Non cancellare test perché il numero di fase è precedente alla release attuale.

Per le verifiche visuali controllare warm/sage/slate/dark, desktop e 320/390 px, testi lunghi, focus e allineamento. Scegliere test pertinenti al cambiamento, senza introdurre modifiche ai dati reali.

Il file VERIFICA-REPOSITORY.md registra le verifiche effettivamente eseguite su questa copia. La documentazione in history descrive controlli precedenti, non risultati appena ottenuti.

## Raccogliere una baseline delle prestazioni

In Impostazioni attivare Diagnostica prestazioni, poi ricaricare per misurare
anche l'avvio. Eseguire le operazioni che risultano lente: cambio mese,
ricerca, apertura nota, salvataggio pagina, settimana e abitudini. Tornare in
Impostazioni ed esportare le misure prima di chiudere o ricaricare la scheda.
L'export JSON non contiene contenuti del diario; confrontare una lettura a
freddo con una ripetuta e includere eventuali errori o salvataggi parziali.
Disattivare il tracing al termine. Limiti e significato delle metriche sono
descritti nella [SPEC-001](specs/001-tracing-prestazioni.md).

Con measurementVersion 2 raccogliere R1 e poi R2 subito dopo sulla stessa
pagina; R3 dopo una normale modifica e sincronizzazione scelta dall'utente.
Esportare prima di ricaricare, annotando separatamente quali operazioni sono
state eseguite. Ripetere in sessioni comparabili. I miss ripetuti non provano
da soli una scadenza: il TTL configurato è già sei ore e gli elementi possono
essere invalidati o non essere stati memorizzati.

Facoltativamente eseguire una volta «Confronta cache get/getAll» dalle
impostazioni, al termine delle normali letture. L'esperimento usa al massimo
25 chiavi sincronizzate del mese corrente e non popola la cache. Inviare il
nuovo export per l'analisi; mantenere distinte le metriche del benchmark dai
tempi delle normali operazioni. L'export conserva solo le ultime 200 misure.

## Verifica delle letture comuni per periodo

Eseguire npm run test:common-window e test:release. Il primo confronta payload con 50.000 record fuori periodo e controlla copertura, fallback e risposte obsolete nel browser. Dettagli e limiti nella [verifica dedicata](VERIFICA-DATI-COMUNI-PERIODO.md).

Per le finestre di Settimana e Abitudini eseguire anche `npm run test:common-periods`, `test:cycle`, P85 e P88: attese, errori, bozze e versioni sono descritti nella [verifica del seguito](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).

Per cataloghi e salvataggi incrementali eseguire `npm run test:catalog-deltas`, `test:cycle`, `test:release` e P87 browser. [Rapporto e contratti](VERIFICA-CATALOGHI-DELTA.md).

Per i lotti delle riflessioni eseguire `npm run test:day-batch`, `test:release` e P75. [Contratto, fault injection e limiti](VERIFICA-RIFLESSIONI-LOTTO.md).

Per allegati, conversione e aggiornamento legacy: `npm run test:legacy-deltas`, `test:release`, `test:tracing` e `test:incremental`. [Rapporto](VERIFICA-DELTA-LEGACY.md).

Per la cancellazione incrementale: `npm run test:delete-delta`, `test:release` e `test:progressive`; copre anche la risposta persa dopo eliminazione e la pagina precedente in volo. [Rapporto](VERIFICA-CANCELLAZIONE-DELTA.md).

Ricerca e contesa: `npm run test:search-concurrency`, `test:locks`, `test:tracing` e `test:release`. Il mock ora simula revisioni Drive a ogni saveAndClose. [Verifica, protocollo e limiti](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).

Worker: `npm run test:worker-chunks`, `test:locks`, `test:release` e P54. Il clock simulato distingue occupazione massima e totale; non misura Google. [Rapporto e limiti](VERIFICA-WORKER-LOTTI-PICCOLI.md).

Identità: `npm run test:identity`, `test:storage`, `test:release` e `test:tracing`. Il nuovo scope userinfo.email richiederà verifica dell’autorizzazione al futuro deploy; nessun deploy è stato eseguito. [Rapporto](VERIFICA-IDENTITA-ARCHIVIO.md).


`npm run test:repository` verifica repository IndexedDB e diagnostica sintetica
su Demo.html, compreso riavvio Chromium e 10.000 metadati inventati.
Vedere [contratto e limiti](VERIFICA-REPOSITORY-LOCALE.md).


`npm run test:local-views` verifica adattatore pagine, loader e collegamento
alla shell con dati inventati, inclusi riavvio Chromium, CAS, risposte tardive,
privacy e bozze. [Contratto e limiti](VERIFICA-ANTEPRIMA-LOCALE-DIARIO.md).


`npm run test:local-common` verifica adattatore dei dati comuni e ponte
ensureCommon, con cataloghi/slice inventati, CAS, quota, calendario, bozze,
invalidazione indipendente delle anteprime e riavvio Chromium.
[Contratto e limiti](VERIFICA-DATI-COMUNI-LOCALI.md).


`npm run test:local-pages` verifica più pagine del diario, indice limitato,
invalidazioni/CAS, compatibilità del descrittore singolo, riavvio e anteprima
delle continuazioni nella shell senza perdere editor, privacy, bozze e selezione.
[Contratto e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).


`npm run test:commits` verifica il nucleo dei commit con adapter sintetico e
riavvio V8 dopo interruzioni prima/dopo ogni unità persistente; incluso in npm test.
Non richiede Google e non simula transazioni ACID Sheets/Docs.
[Contratto e matrice](VERIFICA-NUCLEO-COMMIT-RECUPERABILI.md).


`npm run test:commit-storage` (anche in npm test) verifica il binding Sheet/Range
su mock con 332 interruzioni, prefissi di pubblicazione, riavvio V8 e 50.000
righe estranee. Non accede a Google né crea fogli reali.
[Contratto, fonti e limiti](VERIFICA-PERSISTENZA-COMMIT-SHEETS.md).

`npm run test:canonical-days` (anche in npm test) verifica il primo writer
interno delle riflessioni e il relativo lettore: snapshot completo, rich,
retry/conflitti, 20 interruzioni del nucleo e 165 delle chiamate Sheets simulate,
riavvio V8 e copia generata in Demo.html. Non migra o abilita saveDay/saveDays.
[Contratto e limiti](VERIFICA-WRITER-GIORNALIERO-CANONICO.md).

`npm run test:day-migration` (anche in npm test) verifica il ponte Days,
44 interruzioni delle unità, 396 delle chiamate Sheets simulate e gli ingressi
effettivi saveDay/saveDays e letture complete/per periodo sulla Demo in V8.
L'iniezione server resta null nei sorgenti: migrazione attiva soltanto nelle
fixture. [Contratto, capacità e seguito](VERIFICA-MIGRAZIONE-GIORNI.md).

`npm run test:commit-capacity` (anche in npm test) verifica preflight dei
riferimenti, confini 510/511/512, budget completo del ponte Days, dry-run e
compattazione recuperabile di head/entità con 182 interruzioni RPC/prefisso.
Non riduce lo spazio dei payload e non esegue manutenzione reale.
[Contratto, limiti e seguito](VERIFICA-CAPACITA-COMMIT.md).

`npm run test:day-controller` (anche in npm test) verifica ancora persistente,
stato a due slot, CAS active/readOnly e binding autorizzato. Include 161
interruzioni/prefissi delle proprietà e riavvii del backend Demo con provider
Apps Script e API effettive, senza iniezione globale. Nessuna registrazione
reale. [Contratto e limiti](VERIFICA-CONTROLLER-ROUTING-GIORNI.md).

`npm run test:day-browser` esegue il collaudo Chromium del percorso Days attivo
con server HTTP/V8 temporaneo e dati sintetici. Include bozze/rich/focus,
retry dopo ACK perso/malformato, reload, due client in conflitto, readOnly,
tracing e layout 320/390 px. È incluso in test:e2e, non nella suite backend
npm test. [Scenari, correzione e limiti](VERIFICA-BROWSER-ROUTING-GIORNI.md).

Per il registro Weeks: `test:canonical-weeks`, `test:week-migration` e
`test:week-controller` sono inclusi anche in npm test. Rieseguire release,
tracing e `test:day-controller`/`test:day-browser` sul controller condiviso.

`test:week-browser` esegue il percorso Weeks attivo con server locale sintetico
e UI reale; incluso in test:e2e. Per i form eseguire anche P85/P88,
`test:incremental`, `test:common-periods`, release e tracing.

Per il prototipo HabitLogs: `test:canonical-habit-logs`,
`test:habit-log-planner` e `test:habit-log-migration` sono inclusi in npm test.
Per le regressioni eseguire release, ciclo, incremental, common-periods,
tracing e browser Days/Weeks. Controller/browser HabitLogs ancora successivi.

`test:habit-log-controller` è incluso in npm test; `test:habit-log-browser`
in test:e2e. Il secondo usa server sintetico e UI reale, con cataloghi, retry,
conflitti, readOnly e ACK malformati. Per modifiche ai controlli eseguire anche
ciclo, P80, release, incremental, common-periods e tracing. Il test P59 build
verifica sintassi frontend, backend unico e staging di esattamente sei file.

Per il prototipo cataloghi: `test:canonical-catalogs`, `test:catalog-planner`
e `test:routing-locks` sono inclusi in npm test. Rieseguire anche controller
Days/Weeks/HabitLogs e relativi browser quando si modifica la composizione
dei lock; per compatibilità applicativa usare release, ciclo, incremental,
common-periods e tracing. Nessun Google richiesto.

## Benchmark del bootstrap locale

`npm run test:local-bootstrap-scale` misura `readBootstrapView` su Chromium
con 10.000 e 50.000 voci e storico comune sintetico. Esegue 30 letture
misurate per scenario (mese, mese vuoto e Task), dopo una prima lettura
esclusa dai percentili. Usa un profilo temporaneo, blocca HTTPS e rimuove
il profilo a fine prova. Il report `artifacts/local-bootstrap-scale.json`
è escluso da Git e contiene campioni, p50/p95, ambiente, volume serializzato
della fixture e heap renderer dopo GC.

Il comando verifica una sola transazione readonly, gli indici per vista,
il numero di metadati restituiti e il numero esatto di letture dei corpi; non misura il consumer, la rete, il merge della shell,
il DOM o il paint. Il flag p95 entro 500 ms è diagnostico, non attesta il
criterio end-to-end della SPEC-004. È un benchmark esplicito, separato dalle
suite funzionali per evitare di aggiungere stress test a ogni verifica.

`test:local-bootstrap` e `test:repository` includono anche
`verify-local-bootstrap-indexes.cjs`: migrazione di un database v9 popolato
alla versione corrente v11 con preservazione di checkpoint, impostazioni, bozze e outbox, confini
del mese, Task esterni, cambi di data/tipo e tombstone. Il test del downgrade
usa una versione futura 12 per verificare il rifiuto senza perdita di dati.

Le stesse suite includono `verify-local-bootstrap-common.cjs`: migrazione
v10→v11, mese bisestile e giorno precedente, settimana corrente indipendente,
settimane sovrapposte/anno, cataloghi e privacy completi, allegati/posizioni
visibili, contratto Task completo e rifiuto di riusare la copertura mensile
per Settimana e Abitudini. Per i limiti temporali eseguire anche
`test:common-window` e `test:common-periods`. Il benchmark controlla i record
comuni restituiti e gli indici/intervalli impiegati, oltre a corpi e transazioni.

`verify-local-bootstrap-outbox.cjs`, incluso in test:local-bootstrap e
test:repository, copre snapshot dei quattro stati attivi, ACK/retry
concorrenti, ricevute storiche per le dipendenze, revoca e baseline della bozza.
Il benchmark bootstrap ora include anche 10.000/50.000 ricevute terminali
oltre a quattro operazioni attive, e verifica il numero di righe effettivamente
trasferite dai quattro intervalli dell'indice outbox.

## Benchmark applicativo e periodi — 6 novembre 2026

`npm run test:local-bootstrap-scale` include 30 aperture applicative misurate
per scenario su 10k/50k, oltre alle letture repository. Usa Chromium/IndexedDB
reali, shell e Vue di Demo; dati inventati. JSON in artifacts escluso da Git,
con campioni, ambiente e tempi iniziali HTML separati. Identità pre-verificata
sintetica, nessuna RPC Google; due frame non certificano paint.
`test:local-bootstrap`/`test:repository` coprono ora periodi week/habits,
riavvio, bozze/versioni, revoca, letture tardive e finestra editor Task.
Vedere VERIFICA-BOOTSTRAP-APPLICATIVO.md e VERIFICA-BOOTSTRAP-VISTE-PERIODO.md.

## Verifiche outbox Days — 6 novembre 2026

`npm run test:day-outbox` esegue server Demo/V8, repository Chromium/IndexedDB
e integrazione UI HTTP con backend inventato. Incluso in npm test; prove
repository/UI anche in test:repository. Copre 726 interruzioni Sheets simulate (330 update, 396 create),
riavvio browser, due schede, batch parziale, quota/timeout, rich, ACK e
conflitti/scelte/retry. Nessun Google. Contratti e gate in
VERIFICA-OUTBOX-GIORNATE.md.

## Verifiche outbox Weeks — 6 novembre 2026

`npm run test:week-outbox` copre server V8/Sheets sintetico (726 interruzioni
update/create), repository Chromium/IndexedDB e integrazione UI con backend
HTTP locale. Incluso in npm test; repository/UI anche in test:repository.
Copre riavvio browser, due schede, ACK lenti/persi, risposte comuni tardive,
quota/timeout, conflitti/scelte/retry, readOnly e confini mese/anno. Eseguire
anche le regressioni Days sulla base condivisa. Rapporto e gate:
VERIFICA-OUTBOX-SETTIMANE.md. Nessun Google necessario.


## Seguito locale HabitLogs — 6 novembre 2026

Outbox estesa alle registrazioni, oltre a Days/Weeks: snapshot completo con
identità habitId|data, checklist storica, habitUpdatedAt originario, commit
IndexedDB atomico e writer con dipendenze dei cataloghi verificate sotto lock.
UI Abitudini/giorno/diario continuo, ACK senza rimontaggio e conflitti con
catalogo confrontato. Nessuna scrittura locale dei cataloghi Goals/Habits.
IndexedDB v11 invariato; indice Entries preservato sui salvataggi/ACK.
Nuovo test:habit-log-outbox; repository/browser anche in test:repository.
Capacità directory 128 identità e migrazioni legacy restano gate espliciti;
nessuna capability reale o offline completo, pacchetto 11 ancora parziale.
[Contratto, verifiche e attività residue](VERIFICA-OUTBOX-REGISTRAZIONI.md).

## Capacità continuativa locale HabitLogs — 7 novembre

Policy server privata e spenta per default: preflight resta read-only;
`ensureWriteCapacity` e la guardia di scrittura riusano `compactReferences`
per head/entità a 384 riferimenti. Lotti da 64, due lotti/128 ritiri per lock
dello store, deadline cooperativa 2 s; limite 512 invariato. Nessuna modifica
a schema IndexedDB, formato dei record o retention fisica. Il solo consenso
alla manutenzione manuale non avvia la policy; nessun payload client la abilita.
Prove dedicate: `npm run test:habit-log-continuous`, oltre a
`node tests/verify-continuous-maintenance-policy.cjs` (in `npm test`).
Contratto e limiti: [capacità continuativa HabitLogs](VERIFICA-CAPACITA-CONTINUATIVA-HABITLOGS.md). Nessuna capability reale abilitata.
