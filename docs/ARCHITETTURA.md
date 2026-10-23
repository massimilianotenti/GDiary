# Architettura corrente

## Componenti

Interfaccia HTML/Vue → google.script.run → Apps Script → Sheets e Docs nell'archivio Drive personale. Oggi non è una PWA e non dispone di database IndexedDB né sincronizzazione offline completa.

`frontend/shell.html` contiene anche la logica legacy: navigazione, richieste, stato, editor e funzioni di rendering. `frontend/main.js` monta Vue sul diario continuo; i componenti riusano il ponte e i nodi dell'editor esistente. Le altre viste conservano il rendering DOM. Non presumere che tutto il progetto sia già un'app Vue separata.

## Build

Vite compila il frontend. assemble-frontend.cjs incorpora CSS e bundle JavaScript UTF-8 codificato base64 in Index.html, eseguito con un normale elemento script, senza eval. Conservare questa pipeline: evita alterazioni del bundle da parte del servizio HTML Apps Script.

Demo.html conserva un backend Google simulato nel primo script; il generatore lo aggiorna con Code.gs, DriveDocs.gs e JournalEditor.gs. È quindi un file necessario al processo, non un semplice output eliminabile prima della build.

prepare-apps-script.cjs crea uno staging con esattamente sei file; non autentica e non pubblica. SharedStyles.css e StitchStyles.css sono mantenuti come risorse sorgenti/legacy, non aggiunti allo staging.

## Lettura e salvataggio

Sheets mantiene metadati, pianificazione, riflessioni, registrazioni e indice dell'archivio. Il corpo formattato viene conservato durevolmente anche in DocContent, in parti, prima della sincronizzazione; TaskDocQueue traccia pending/error e Docs raccoglie i testi in sezioni marcate e riferite da DocRefs. Non descrivere Sheets come un archivio dei soli titoli: contiene anche il materiale necessario a non perdere scritture in attesa.

Dalla versione Apps Script 67: loadContinuous applica le pagine task progressivamente, con una sola richiesta di pagina in volo. Ogni risposta aggiorna la stessa sessione e gli stessi oggetti voce, senza sostituire editor/bozze esistenti. Cursore e stato completo/parziale/errore appartengono alla sessione; risposte tardive di una sessione o periodo non corrente vengono ignorate. I filtri locali si applicano ai dati disponibili, dichiarati parziali fino al termine.

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
