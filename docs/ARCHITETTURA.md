# Architettura corrente

Il bootstrap legge la sola outbox attiva tramite quattro intervalli sullo
stato, nella stessa fotografia atomica. Le ricevute storiche restano nel
repository per dipendenze e recupero, senza essere caricate nella vista.
Nessuna modifica di schema o retention. [Verifica](VERIFICA-BOOTSTRAP-OUTBOX-ATTIVA.md).

Il bootstrap locale usa gli indici per data e tipo delle Entries e, da
IndexedDB v11, una proiezione dei record comuni del diario. Restano globali
metadati Task, cataloghi e privacy; riflessioni e abitudini seguono gli
intervalli del mese, allegati e posizioni seguono le voci visibili. La stessa
transazione verifica checkpoint, corpi, bozze e outbox. La migrazione è
additiva. La vista Task conserva i dati comuni completi.
[Contratto e misure](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md).

Il percorso sperimentale apre ora il diario dalla copia completa del consumer
snapshot/feed dopo la verifica identità, senza attendere le RPC di vista.
Checkpoint concluso, privacy, bozze e outbox vengono verificati nella lettura
atomica; aggiornamenti e retry conservano le bozze. Le copie parziali restano
sul precedente fallback. [Contratto e limiti](VERIFICA-BOOTSTRAP-LOCALE.md).

Nel percorso locale sperimentale, l'apertura della prima pagina recupera anche
le continuazioni disponibili (massimo 16 pagine), senza RPC aggiuntive.
La copia resta datata e incompleta fino alla verifica remota di ogni pagina;
bozze e versioni originali restano protette. Non è un bootstrap offline né
una fotografia coerente del mese. [Verifica e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).

Nel percorso sperimentale con copia e outbox abilitate, la prima pagina del diario già verificata può essere modificata localmente mentre si attende il remoto; viene marcata come datata e incompleta. [Verifica e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).

Nel percorso locale sperimentale, le anteprime read-only dei dati comuni coprono diario, settimana e abitudini tramite descrittori scoped; IndexedDB v9 separa i nuovi descrittori dai client precedenti. [Verifica e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).

## Componenti

Interfaccia HTML/Vue → google.script.run → Apps Script → Sheets e Docs nell'archivio Drive personale. Oggi non è una PWA e non dispone di database applicativo IndexedDB né sincronizzazione offline completa.

Sviluppo locale del 27 ottobre: `frontend/storage-probe.js` aggiunge soltanto
una prova IndexedDB manuale e separata, con marcatori sintetici; non è un
database applicativo. Il bundle la espone tramite `BulletJournalVue.storageProbe`.
Il tracing measurementVersion 4 distingue acquisizione e occupazione del lock
e conta richieste/righe/celle del lettore Sheets strumentato. Il comportamento
dei lock e dei salvataggi è conservato. Dettagli e limiti nella
[verifica SPEC-004](VERIFICA-AVVIO-SPEC-004.md).

Seguito locale SPEC-004: `entrySearch_` oltre 500 voci riusa `readEntries_` con
intervalli di metadati limitati (256 righe, amplificazione massima otto),
restituendo soltanto le righe richieste. Colonna storica del corpo esclusa;
nessuna cache fra richieste. Riduce la frammentazione delle letture, mentre
selezione/ordinamento dell'intero archivio candidato restano invariati.
Risultati e compromesso chiamate/volume nella
[verifica Entries batch](VERIFICA-LETTURE-ENTRIES-BATCH.md).

`frontend/shell.html` contiene anche la logica legacy: navigazione, richieste, stato, editor e funzioni di rendering. `frontend/main.js` monta Vue sul diario continuo; i componenti riusano il ponte e i nodi dell'editor esistente. Le altre viste conservano il rendering DOM. Non presumere che tutto il progetto sia già un'app Vue separata.

## Build

Vite compila il frontend. assemble-frontend.cjs incorpora CSS e bundle JavaScript UTF-8 codificato base64 in Index.html, eseguito con un normale elemento script, senza eval. Conservare questa pipeline: evita alterazioni del bundle da parte del servizio HTML Apps Script.

Demo.html conserva un backend Google simulato nel primo script; il generatore lo aggiorna con Code.gs, DriveDocs.gs e JournalEditor.gs. È quindi un file necessario al processo, non un semplice output eliminabile prima della build.

prepare-apps-script.cjs crea uno staging con esattamente sei file; non autentica e non pubblica. SharedStyles.css e StitchStyles.css sono mantenuti come risorse sorgenti/legacy, non aggiunti allo staging.

## Lettura e salvataggio

Sheets mantiene metadati, pianificazione, riflessioni, registrazioni e indice dell'archivio. Il corpo formattato viene conservato durevolmente anche in DocContent, in parti, prima della sincronizzazione; TaskDocQueue traccia pending/error e Docs raccoglie i testi in sezioni marcate e riferite da DocRefs. Non descrivere Sheets come un archivio dei soli titoli: contiene anche il materiale necessario a non perdere scritture in attesa.

Dalla versione Apps Script 67: loadContinuous applica le pagine task progressivamente, con una sola richiesta di pagina in volo. Ogni risposta aggiorna la stessa sessione e gli stessi oggetti voce, senza sostituire editor/bozze esistenti. Cursore e stato completo/parziale/errore appartengono alla sessione; risposte tardive di una sessione o periodo non corrente vengono ignorate. I filtri locali si applicano ai dati disponibili, dichiarati parziali fino al termine.

Seguito locale SPEC-004: nella vista Task le pagine iniziali contengono solo
metadati (massimo 200). `getJournalContents` legge fino a 25 descrizioni
versionate usando `journalReadContents_`, condiviso con il diario normale,
e ricontrolla i metadati dopo la lettura. Un lotto di corpi e una pagina di
elenco possono essere in volo insieme. Descrizioni caricate all'apertura,
per ricerca nei testi o prima del salvataggio di task incompleti. Il corpo
assente è distinto dal corpo vuoto; il backend rifiuta placeholder dichiarati.
Elenco completo e ricerca completa hanno stati separati. Dettagli nella
[verifica dei contenuti differiti](VERIFICA-TASK-CONTENUTI-DIFFERITI.md).

Seguito locale: le continuazioni dei metadati Task usano una fotografia
temporanea ordinata (`TI1`, TTL 600 s, frammenti UTF-8 limitati). La prima
pagina rilegge Sheets; `TASK_INDEX_REVISION` viene cambiata prima della prima
scrittura pertinente nella richiesta e controllata durante pubblicazione e
lettura della fotografia. Nessuna attesa lock aggiunta alle letture; cache
incompleta/scaduta o revisione cambiata richiedono riavvio con bozze conservate.
I problemi cache portano al percorso non indicizzato per la sessione. Non è
un indice persistente né un protocollo di sincronizzazione. Dettagli nella
[verifica indice Task](VERIFICA-INDICE-TASK.md).

Lettura diario a pagine con cache dei contenuti verificata tramite revisione Drive; i contenuti pending prevalgono sul Docs non aggiornato. Ricerca deve trovare anche testo non ancora sincronizzato. Il salvataggio del diario valida prima delle scritture, controlla versioni e blocchi, conserva ID e posizione. I salvataggi su mesi diversi sono raggruppati e i fallimenti parziali restano recuperabili.

Esistono cache/bozze locali e preferenze browser, ma non costituiscono un protocollo offline bidirezionale. Controllare le funzioni di draft e privacy prima di modificarne chiavi o durata.

## Punti di manutenzione

La diagnostica facoltativa usa `traceApi` in Code.gs come dispatcher limitato
alle API applicative. La risposta contiene il risultato normale e misure
richiesta-locali; `traceMeasure_` raccoglie durate inclusive degli helper.
Il frontend ammette nell'export solo metriche note. Con tracing spento usa
direttamente le API esistenti. Non sono scritti log diagnostici su Google.
Il caricamento del changelog mantiene il proprio percorso diretto.

- Filtri task: taskFilters, continuousKey, taskDiaryBlocks e loadContinuous.
- Settimana: renderWeek, polishWeek, weekTaskMatches e renderWeekTaskReview.
- Sezioni giornaliere/abitudini: dailySectionNode, diaryHabitNode e relative mappe di apertura.
- Salvataggio diario backend: saveJournalPage in JournalEditor.gs.
- Coda persistente: queueDocWrites_, docContent_ e sincronizzazione in DriveDocs.gs.
- CSS importato: diary → pleasant → app-theme → palettes → week. Controllare anche le regole successive quando un override non agisce.


Dalla versione Apps Script 68, getJournalPage prelegge DocContent soltanto
per pending e miss: ricerca raggruppata a finestre, intestazioni correnti e
payload contigui limitati. Lo snapshot vive nella richiesta; voci oltre budget
bulk passano al lettore individuale preesistente. Nessun payload storico o di
voci estranee preletto. Dettagli e caso peggiore in SPEC-002 e
VERIFICA-DOCCONTENT-BATCH.md. Scritture e sincronizzazione restano invariate.

## Risposte incrementali di salvataggio (Apps Script 70)

`saveDay`, `saveWeek` e `setHabitLog` restituiscono `commonUpserts`, con
una sola collezione e il solo record scritto, canonico e con `updatedAt`.
Le chiavi sono rispettivamente `date`, `week` e `key`. `applyCommonChanges`
effettua un upsert conservando gli altri record e i campi assenti.
`commonPatch` mantiene invece il significato di sostituzione della collezione.
Il diario continuo e le viste giorno, settimana e abitudini usano lo stesso
merge, senza rilettura completa dopo il salvataggio. Conflitti e durabilità
restano invariati; nessuna nuova API di scrittura multipla.

## Pagina del ciclo — SPEC-003, Apps Script 71

`renderHabits` costruisce esplicitamente obiettivi, azioni, tracker e giornata
nel contenuto principale; rimossi `polishHabits` e gli adattamenti della vista
in `decorateView`. `frontend/habits.css` riusa i token del diario. Tracker e
registrazione usano ancora `habitTable`, `dailyHabits` e i record condivisi.
`renderCycleDay` riusa l'editor rich e invia solo riflessione, rich e versione
a saveDay. `habitFormDrafts` mantiene in memoria della scheda i singoli form
e la versione iniziale, ripristinandoli dopo il salvataggio di un altro form;
non aggiunge persistenza locale né cache dell'archivio. Lo scarto confermato
cancella le bozze del ciclo. Nessuna modifica a backend o protocollo RPC.

## Promemoria trimestrale nel diario — Apps Script 72, icone nella 73

`diaryCycleMemory` ricava trimestre e anno da `month` e seleziona da
`state.goals` titoli e descrizioni. Il modello di DiaryPage lo espone come
`cycleMemory`; Vue usa interpolazione testuale, descrizioni multilinea e
chiavi stabili per obiettivo. Il fallback senza Vue usa lo stesso selettore.
I dati comuni arrivano con il flusso già esistente, senza nuove RPC; un
aggiornamento del promemoria non ricrea i nodi degli editor del diario.
Il seguito con icone riusa `OUTLINE_ICONS` e la conversione `LEGACY_ICONS`:
il modello espone solo il path SVG del catalogo, senza HTML arbitrario.
Icone decorative accanto al titolo, omesse se assenti o impostate a `none`.
Il seguito visivo della versione 75 definisce token `--memory-*` sul solo riquadro:
sfondo, testo, testo secondario, icone e bordi cambiano insieme per ciascuna
palette. Gli altri componenti mantengono i token e gli stili precedenti.

## Palette Prugna — Apps Script 74

`PALETTES` include `plum` / Prugna. `frontend/palettes.css` definisce tutti
i token paint anche per questa palette e i token semantici `--diary-*`, con
override dei pulsanti primari coerenti con il campione nelle Impostazioni.
La griglia di scelta si adatta al quinto tema e mantiene due colonne mobile.
Selezione, persistenza e fallback restano in `applyPalette` e nel gestore
locale già esistente. Nessuna modifica alle API o ai colori formattati nel
contenuto del diario.

## Letture comuni del diario per periodo — sviluppo locale

Il client richiede finestre temporali esplicite e conserva i dati fuori intervallo. Cataloghi e copertura hanno freschezza distinta. Il seguito estende gli scope a Settimana e Abitudini: tracker e giornata hanno copertura indipendente. Il vecchio modulo resta montato e disabilitato fino al completamento della lettura; le risposte precedenti vengono invalidate. Le altre viste conservano il contratto completo. [Verifica del seguito](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md). Dettagli e limiti nella [verifica dedicata](VERIFICA-DATI-COMUNI-PERIODO.md).

## Cataloghi e delta delle mutazioni comuni — sviluppo locale

Il client usa commonWindow:catalogs nelle viste senza periodo e incrementalCommon:true per ricevere record canonici da saveGoal/saveHabit/deleteHabit/saveProject e settingsPatch da saveReflectionSettings. I delta non rendono fresco un intero catalogo. I client senza opt-in mantengono la risposta completa. [Contratti, verifiche e limiti](VERIFICA-CATALOGHI-DELTA.md).

## Lotto delle riflessioni — sviluppo locale

saveDays condivide dayValues_ con saveDay, legge solo le date richieste e distingue gli esiti per record sotto un solo lock. Il frontend conferma snapshot e conserva le bozze non confermate o successive. [Contratti, verifiche e limiti](VERIFICA-RIFLESSIONI-LOTTO.md).

## Delta di allegati e percorsi legacy — sviluppo locale

addFileLink espone fileUpserts canonici; updateEntry metadataOnly; convertProjectToTag patch dei metadati, rimozione progetto e aggiunta tag. Il client aggiorna solo le voci note, preserva contenuti e bozze e invalida le cache. Opt-in incrementalCommon, fallback completo per chiamanti legacy. [Verifica e limiti](VERIFICA-DELTA-LEGACY.md).

## Allegati delle Entries canoniche — sviluppo locale SPEC-004

Per un Entry instradato `addFileLink` committa la nuova entità files insieme
all'indice `entry-files:<hash>`; il retry usa identità deterministiche. La
risposta incrementale aggiorna la sessione e il dettaglio rilegge l'overlay
legacy/canonico. Nessuna riga Files legacy viene riscritta e il file Drive non
viene copiato né spostato. Il feed globale resta da completare.
[Verifica e limiti](VERIFICA-ALLEGATI-ENTRIES.md).

## Cancellazione delle Entries canoniche — sviluppo locale SPEC-004

Per Entry instradati `deleteNote` verifica la versione, prepara un piano
durabile e committa il tombstone insieme all'eventuale ritiro dell'indice
allegati. Una sezione Docs consolidata viene rimossa solo dopo aver verificato
i suoi marcatori; il file originale resta. ACK e retry sono stabili e la UI
nasconde la voce anche dopo reload. La pulizia delle righe operative avviene
dopo il commit; payload e feed immutabili sono conservati.
[Verifica e limiti](VERIFICA-CANCELLAZIONE-ENTRIES-CANONICA.md).

## Conversione progetto→tag — sviluppo locale SPEC-004

Quando Projects ed Entries sono instradati e attivi, l'anteprima firma il
progetto, le voci collegate e le dipendenze Goals. Una richiesta aggiorna gli
snapshot Entry, i route marker necessari e il tombstone Project in un commit
comune, con ACK ripetibile. Un Project legacy può ricevere prima una route
semantica neutra; le Entry legacy entrano nel commit di conversione. La
richiesta resta entro 25 cambi e 32 KiB; non è paginata.
[Verifica e limiti](VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md).

## Cancellazione con delta — sviluppo locale

deleteNote espone deletedEntryIds e alreadyAbsent con incrementalCommon; il client rimuove riferimenti in memoria e invalida sessioni/cursori, preservando gli oggetti bozza. Controlli e lock Docs restano invariati. [Verifica e limiti](VERIFICA-CANCELLAZIONE-DELTA.md).

## Ricerca con revisione applicativa — sviluppo locale

searchArchive legge metadati e Docs fuori dal lock, verificando SEARCH_REVISION con sonde brevi tryLock(0). I writer pertinenti avanzano la revisione prima delle mutazioni. searchVersion lega le continuazioni a archivio/query/revisione; reset e fonti Docs non verificate non sono ricerche complete. [Contratti e limiti](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).

## Worker a unità singole — sviluppo locale intermedio

processTaskDocQueue orchestra fino a 10 identità, processDocQueueItem_ rilegge e finalizza una voce per acquisizione globale; budget morbido 5 secondi e stop su busy/esito incerto. Nessuna lease, nuovo schema o scrittura Docs fuori lock. Picco lock strumentato con lockHeldMaxMs. [Verifica e limiti](VERIFICA-WORKER-LOTTI-PICCOLI.md).

## Contratto identità della copia locale — sviluppo locale

getSyncManifest verifica utente attivo/effettivo, accesso e configurazione; inizializza archiveId/epoch in ScriptProperties e principalId in UserProperties sotto lock breve. Il modulo archive-identity conserva solo scope in memoria e revoca risposte obsolete. Capacità applicative false; verifica manuale, nessuna RPC all’avvio. [Contratto e limiti](VERIFICA-IDENTITA-ARCHIVIO.md).


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

Seguito del pacchetto 8: [writer e lettore interni delle riflessioni giornaliere](VERIFICA-WRITER-GIORNALIERO-CANONICO.md).
syncDayWriter_ applica snapshot completi tramite il nucleo, con ACK legato
allo scope e lettore che recupera i prepare e valida lo schema di dominio.
Nessuna RPC o instradamento di saveDay/saveDays: la migrazione dei writer e
dei lettori per periodo resta aperta.

Seguito implementato: [ponte di migrazione Days e routing dei lettori](VERIFICA-MIGRAZIONE-GIORNI.md).
Il gateway prepara piani durevoli delle patch, pubblica insieme giorno/route/
indice e verifica la preimmagine legacy congelata. saveDay/saveDays e letture
complete/per periodo hanno un punto di iniezione server, ancora null; nessuna
migrazione reale o attivazione automatica. Controller persistente e rollback
coerente restano aperti, insieme a capacità/compattazione del registro.

Seguito: [preflight e compattazione recuperabile dei riferimenti](VERIFICA-CAPACITA-COMMIT.md).
Budget delle scritture prima del prepare e aggregato per il ponte Days;
ritiro esplicito e limitato delle chiavi head/entità superate, mantenendo
l'ultima riga pubblicata. Payload e record immutabili conservati, nessuna
retention o attivazione automatica; controller del routing ancora futuro.

Seguito: [controller persistente Days e binding Apps Script](VERIFICA-CONTROLLER-ROUTING-GIORNI.md).
Ancora richiesta e stato a due slot nelle proprietà; risoluzione per ogni
accesso e ricontrollo delle corse di attivazione. readOnly conserva il gateway
canonico. Registrazione esplicita su fogli/identità già provisionati; permessi
operatore false per default e nessuna nuova RPC o registrazione reale.

Seguito: [collaudo browser del percorso Days attivo](VERIFICA-BROWSER-ROUTING-GIORNI.md)
superato con UI reale e server V8 locale. Nessun nuovo trasporto nell'app:
il ponte HTTP e le registrazioni sono esclusivamente fixture. readOnly conserva
il nome d'errore del protocollo ma fornisce un messaggio comprensibile alla UI.


Seguito del pacchetto 8: [writer canonico interno Weeks](VERIFICA-WRITER-SETTIMANALE-CANONICO.md)
con snapshot completi e recupero verificato sulle fixture. SaveWeek e letture
applicative restano legacy; ponte, controller e collaudo browser ancora aperti.


Seguito Weeks: [ponte e lettori coerenti](VERIFICA-MIGRAZIONE-SETTIMANE.md) e
[controller persistente](VERIFICA-CONTROLLER-ROUTING-SETTIMANE.md) verificati
sulle fixture. Days e Weeks condividono il registro con binding verificato;
modalità readOnly per dominio e nessuna registrazione reale. Collaudo browser
Weeks e restante matrice delle mutazioni ancora aperti.


Seguito: [collaudo browser Weeks attivo](VERIFICA-BROWSER-ROUTING-SETTIMANE.md)
verificato con UI reale su server sintetico. Bozze per settimana nella scheda,
versione iniziale conservata, ACK validato prima del merge ed eventi tardivi
conservati; nessuna attivazione Google o capacità manifest.


Seguito HabitLogs: [writer canonico](VERIFICA-WRITER-REGISTRAZIONI-CANONICO.md),
[planner puro](VERIFICA-PLANNER-REGISTRAZIONI.md) e
[ponte con lettori coerenti](VERIFICA-MIGRAZIONE-REGISTRAZIONI.md) implementati
sulle fixture. Checklist storica e dipendenze dei cataloghi catturate nei piani;
setHabitLog instradato solo con iniezione sintetica, controller persistente
e browser attivo ancora successivi. Nessuna attivazione reale o nuova RPC.


Seguito HabitLogs: [controller persistente](VERIFICA-CONTROLLER-REGISTRAZIONI.md)
e [browser attivo locale](VERIFICA-BROWSER-REGISTRAZIONI.md) verificati. Binding
esplicito dei tre fogli applicativi allo stesso registro Days/Weeks, modalità
persistenti per dominio, ACK confrontato con identità/checklist richieste prima
del merge. Focus e bozze del diario conservati. Nessuna nuova RPC o outbox,
registrazione reale ancora assente; feed completo e altre mutazioni aperti.


Seguito Goals/Habits: [writer canonico](VERIFICA-WRITER-CATALOGHI-CANONICO.md) e
[planner delle API](VERIFICA-PLANNER-CATALOGHI.md) verificati solo sulle fixture,
con lotti atomici, dipendenze del goal e identità delle microazioni conservate.
[Composizione delle letture tra controller](VERIFICA-COMPOSIZIONE-LOCK-ROUTING.md)
supportata senza consentire mutazioni annidate. API/cataloghi applicativi ancora
legacy: ponte, lettori coerenti, controller e browser restano da completare.
Nessuna nuova RPC o attivazione reale.

## Bootstrap per periodo e montaggio Task — 6 novembre 2026

La fotografia completa di readBootstrapView copre anche week/habits con
intervalli temporali espliciti e la stessa transazione/checkpoint del diario.
La shell apre le viste prima delle RPC di stato e rinvia l'applicazione dei
delta quando un form è modificato. DiaryPage monta inizialmente 50 risultati
Task, espandibili di 50, mantenendo tutte le voci nel modello e bozze/pending
sempre montati. Vedere VERIFICA-BOOTSTRAP-VISTE-PERIODO.md e
VERIFICA-BOOTSTRAP-APPLICATIVO.md per contratti, prove e limiti.

## Outbox Days — 6 novembre 2026

Kind day usa data come identità e snapshot completo, separato da Entries.
Il dispatcher riutilizza lease/claim e trasporta saveDayOperation con scope
atteso; ricevute verificate sul piano originale riconciliano gli esiti incerti.
Il gateway resta subordinato al controller Days, senza attivazione implicita.
ACK aggiorna atomicamente record canonico, baseline e dipendenze non inviate;
la UI mantiene editor e bozze successive. Contratti/gate e prove in
VERIFICA-OUTBOX-GIORNATE.md. Le altre entità non acquisiscono l'outbox.

## Outbox Weeks e periodi condivisi — 6 novembre 2026

`period-operation.mjs` registra esclusivamente Days/Weeks. Il repository
riutilizza transazioni, CAS, dipendenze e settlement con il record comune
della famiglia corretta; il dispatcher seleziona trasporto e ricevuta in base
al contratto. La shell condivide accodamento/overlay/confronto; il form Weeks
aggiorna la baseline sul nodo montato e conserva le revisioni effettivamente
editate dalla scheda. Commit locali e ACK invalidano le letture UI tardive,
conservando un indice Entries invariato. Contratti/gate e prove in
VERIFICA-OUTBOX-SETTIMANE.md. Nessuna estensione a registrazioni/cataloghi.


## Seguito locale HabitLogs — 6 novembre 2026

Outbox estesa alle registrazioni, oltre a Days/Weeks: snapshot completo con
identità habitId|data, checklist storica, habitUpdatedAt originario, commit
IndexedDB atomico e writer con dipendenze dei cataloghi verificate sotto lock.
UI Abitudini/giorno/diario continuo, ACK senza rimontaggio e conflitti con
catalogo confrontato. Nessuna scrittura locale dei cataloghi Goals/Habits.
IndexedDB v11 invariato; indice Entries preservato sui salvataggi/ACK.
Nuovo test:habit-log-outbox; repository/browser anche in test:repository.
Directory HabitLogs compatibile v1 e routing v2 a 16 shard (massimo teorico 2.176, con bucket saturabili); retention/compattazione del budget da 512 riferimenti per chiave resta gate esplicito;
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
