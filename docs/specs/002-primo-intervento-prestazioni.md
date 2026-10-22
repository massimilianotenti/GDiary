# SPEC-002 — Primo intervento sulle prestazioni

**Stato:** Fase 0 pubblicata nella versione Apps Script 64; nuova baseline da raccogliere; ottimizzazioni in proposta

**Data:** 22 ottobre 2026

**Prerequisito:** [SPEC-001 — Tracing delle prestazioni](001-tracing-prestazioni.md)

**Revisione esterna:** [Prompt per Gemini](002-review-gemini.md), comprensivo
della variante snapshot documento/mese con paginazione locale, ancora da
confrontare con il recupero per pagina proposto qui.

**Aggiornamento del confronto:** fase 0 diagnostica prima di scegliere
l'ottimizzazione. Bulk cache, DocContent e visualizzazione progressiva restano
esperimenti candidati; snapshot documentale mantenuto come confronto esplorativo.

## Obiettivo e ambito

Ridurre attese e lavoro remoto ridondante nell'architettura attuale, usando
la prima baseline reale per scegliere interventi circoscritti e verificarne
l'effetto. Rendere utilizzabili i primi risultati senza aspettare tutto
l'archivio task, mantenendo chiarezza sulla completezza dei dati.

L'intervento riguarda lettura delle pagine, risposte dei salvataggi,
caricamento progressivo dei task e affidabilità del tracing. IndexedDB,
scritture offline, sincronizzazione bidirezionale, PWA e cambio di backend
restano oggetto di specifiche successive. La proposta non autorizza deploy
né modifiche ai dati reali.

## Evidenze iniziali

Fonte: export `gdiary-performance-trace/v1` condiviso dall'utente, esportato
il 22 ottobre 2026 alle 04:52:17 UTC dal deployment Apps Script 63.
Si conservano qui soltanto misure aggregate, senza contenuti o identificativi
dell'archivio e senza archiviare il JSON originale nel repository.

| Caso osservato | Tempo client | Tempo backend | Evidenza |
|---|---|---|---|
| Pagina da 25 voci interamente in cache | 5,06–6,45 s | 3,87–4,75 s | 25 hit, nessun Docs aperto |
| Pagina da 25 voci con 19 miss | 22,11–23,81 s | 21,25–22,47 s | helper Sheets: 9,03–10,01 s |
| Ultima pagina da 9 voci | 9,16 s | 7,79 s | 9 miss, 3 Docs aperti |
| Due salvataggi di giornata | 4,89 s per l'azione complessiva | 0,79 e 1,00 s | risposte da 87.060 e 90.000 byte |
| Salvataggio di una voce | 5,05 s | 3,71 s | coda: 1,51 s; helper Sheets: 1,42 s |
| Registrazione abitudine | 3,44 s | 2,00 s | risposta da 24.444 byte |

Le tre letture da 25, 25 e 9 voci sommano 55,08 s. Il codice carica le pagine
task in sequenza prima di mostrarle; il tracciato non dispone di un actionId
di navigazione, quindi l'attribuzione delle tre richieste a un'unica azione
resta un'ipotesi da confermare. La parte esterna al backend misurato varia
circa fra 0,86 e 1,81 s per richiesta e non rappresenta la sola rete.

I tempi degli helper sono inclusivi e coprono solo alcuni accessi ai servizi.
Una singola sessione non dimostra distribuzioni, causalità o miglioramenti
futuri. Il rendering misurato è generalmente molto più breve delle richieste,
ma non include il paint finale del browser.

## Fase 0 — Diagnostica di dettaglio e nuova baseline

Implementazione autorizzata: estendere soltanto il tracing, mantenendo percorsi
di lettura/salvataggio, limiti e cache attuali. I passi A–E non sono ancora
autorizzati come modifiche applicative né scelti in ordine definitivo.

- Conservare i tempi inclusivi e aggiungere tempi esclusivi `*SelfMs`, che
  sottraggono i segmenti figli strumentati. `unaccountedMs` rappresenta la parte
  del totale backend fuori dagli helper misurati, non automaticamente la rete.
- Separare cache get/parse/serialize/put, verifica Drive, apertura/corpo Docs,
  indice dei marcatori ed estrazione delle sezioni.
- Per DocContent misurare ricerca, intestazioni, selezione versione, payload e
  ricostruzione. Separare il tempo del percorso sincronizzato, che recupera
  il corpo per il solo flag editorAutoTitle, da quello pending. Aggiungere
  conteggi di righe trovate, celle/byte payload e istogrammi per fasce di
  frammenti/versioni, senza identificare voci o documenti.
- Contare cause osservabili: bypass pending/esplicito, revisione mancante,
  cache malformata, eccezioni read/put, dimensione oltre 24.000 unità di stringa,
  revisione cambiata/non verificabile prima del put. Un get senza valore resta
  «assenza di causa non determinabile»: non distinguere artificialmente TTL,
  espulsione, chiave nuova o aggiornamento della revisione.
- Correggere l'evento RPC duplicato e correlare le pagine di una navigazione
  mediante actionId casuale, indice e conteggio pagine. Nessun hash stabile o
  identificativo dell'archivio e nessun contatore persistente su Google.
- Offrire un benchmark esplicito da Impostazioni, mai automatico: massimo 25
  chiavi delle sezioni sincronizzate del mese, cinque confronti get/getAll a
  ordine alternato nella stessa RPC e confronto aggiuntivo su chiave assente.
  Non popolare la cache né leggere i corpi Docs per preparare il benchmark.
  Segnalare differenze e errori con soli conteggi; il servizio cache può cambiare
  fra le letture e la loro uguaglianza non è garantita dal benchmark.

Il confronto diagnostico non sostituisce ancora il percorso individuale
dell'app con getAll/putAll. Export v1 con `measurementVersion: 2` per distinguere
le nuove misure dalla baseline iniziale.

Protocollo successivo a un rilascio autorizzato: R1 sullo stato iniziale, R2
subito dopo sulla stessa pagina, R3 dopo una normale modifica scelta dall'utente
e la relativa sincronizzazione. Una lettura successiva nella giornata può
completare il campione. Nessuna modifica reale viene creata automaticamente
per il test; la cache ha già TTL esplicito di sei ore. Miss persistenti in R2
sono indizi da correlare ai contatori, non prove di una specifica causa.

Usare i nuovi risultati per scegliere tra bulk cache, raggruppamento DocContent
e possibile proiezione versionata di editorAutoTitle. Quest'ultima richiederebbe
analisi di schema/scrittori e fallback ai dati durevoli e non è inclusa nella
fase 0. L'uso prevalentemente hit o miss deve essere misurato, non dedotto dal TTL.

## E. Esperimento candidato: cache raggruppata

Nel percorso di lettura delle pagine, sostituire gli accessi individuali alle
sezioni in cache con `getAll` e `putAll`. Conservare massimo 25 candidati per
pagina, budget di risposta, scadenza e limite prudenziale attuale: il JSON
serializzato viene escluso dalla cache se supera 24.000 unità di lunghezza
della stringa JavaScript. Non aumentare questo limite al massimo teorico del
servizio e non introdurre soglie aggregate arbitrarie come «1 MB».

Flusso di riferimento:

1. Mantenere ordine e posizione dei candidati. Separare i pending, che devono
   usare DocContent indipendentemente da eventuali vecchie sezioni in cache.
2. Per le voci sincronizzate, risolvere i riferimenti e preparare una mappa
   dei documenti con revisione iniziale verificata. Conservare i controlli di
   appartenenza all'archivio e cestino. Il codice già riusa queste informazioni
   per documento nella stessa richiesta: non reintrodurre controlli per voce.
3. Costruire le chiavi con documento, revisione verificata, entryId e updatedAt,
   conservando la compatibilità attuale. Deduplicare le chiavi valide; nessuna
   chiamata `getAll` se non ce ne sono o se è richiesto bypass esplicito.
4. Eseguire al massimo un `getAll` per pagina. Un errore del servizio o una
   risposta mancante rende le chiavi miss, senza impedire la lettura normale.
5. Fare parsing e validazione di ogni elemento indipendentemente: JSON valido
   non basta. Richiedere almeno le proprietà e i tipi controllati oggi
   (`body`, `rich`, `richUnsupported`). Un elemento invalido diventa un miss.
6. Risolvere i miss usando l'attuale percorso DocContent/Docs; aprire e
   indicizzare ciascun Docs una volta nella richiesta. Associare ogni esito
   al proprio candidato, senza presumere che il risolutore restituisca tutti
   i risultati nello stesso ordine. Preservare gli errori per singola voce.
7. Per i soli documenti con contenuti candidati alla cache, verificare di nuovo
   la revisione una volta per documento. Memorizzare soltanto con revisione
   iniziale e finale entrambe valide, non vuote e uguali. Due valori mancanti
   (`undefined === undefined`) non costituiscono una verifica riuscita.
8. Accumulare soltanto sezioni Docs valide entro il limite attuale, escludendo
   pending, errori e documenti cambiati/non verificabili. Eseguire al massimo
   un `putAll` per pagina e soltanto se ci sono elementi da scrivere. Il suo
   fallimento non deve cambiare dati o esito della lettura già riuscita.
9. Applicare il budget della risposta mantenendo ordine e cursore corretto:
   prelettura o risoluzione anticipata non devono saltare candidati esclusi
   dalla pagina per dimensione. Il bulk non amplia il massimo delle 25 voci.

Non registrare nei warning chiavi della cache, docId, entryId, contenuti o
errori originali del servizio. Per la diagnostica usare soltanto categorie,
tempi e conteggi ammessi. I test simulati devono offrire anche getAll/putAll
e verificarne gli errori, senza richiedere Google.

Il criterio strutturale è passare da accessi cache per voce ad al massimo
una lettura e una scrittura bulk per pagina, con output equivalente. Il
beneficio temporale resta da misurare; «ottimale» o «sotto un secondo» non
sono risultati già acquisiti.

## A. Secondo esperimento: lettura raggruppata di DocContent

Nel percorso di `getJournalPage`, ogni cache miss recupera anche DocContent
per la voce. `docContent_` può eseguire ricerca, lettura delle intestazioni
dei frammenti e lettura dei payload per ciascun identificativo.

Introdurre un recupero multiplo limitato alle voci necessarie alla pagina:

- Verificare prima cache e stato pending; acquisire i contenuti persistenti
  soltanto per le voci che ne hanno bisogno.
- Raggruppare ricerca e lettura dei frammenti, riutilizzando lo snapshot
  nella richiesta. Raggruppare gli intervalli contigui e imporre limiti
  espliciti a righe/byte per lettura e memoria temporanea.
- Non caricare indiscriminatamente tutti i payload e tutte le versioni
  storiche di DocContent per leggere una pagina di massimo 25 voci.
- Selezionare la versione corrente con le stesse regole attuali; preservare
  ordine, Unicode e struttura rich-text dei frammenti. Contenuti incompleti
  devono produrre un errore recuperabile, senza sostituzione silenziosa.
- Conservare la prevalenza dei contenuti pending e i controlli di revisione
  Drive della cache. Non estendere la validità della cache per ottenere tempi
  migliori a discapito della visibilità delle modifiche fatte in Docs.

La strategia precisa di raggruppamento sarà scelta con fixture contenenti
voci sparse, molte versioni e corpi lunghi. Misurare separatamente ricerca,
lettura dei frammenti e ricostruzione: i 9–10 s osservati sono un indizio,
non un'attribuzione già dimostrata interamente a DocContent.

## B. Risposte di salvataggio incrementali — intervento secondario

Per Days e Weeks, `saveRecord_` restituisce oggi l'intera tabella sia nel
campo `days`/`weeks` sia in `commonPatch`. Per le abitudini, `setHabitLog`
restituisce tutti i log nella patch.

Definire una risposta incrementale esplicita per i record effettivamente
scritti, contenente chiave stabile, valori canonici e nuova versione.
Il frontend deve effettuare un upsert per chiave, conservando gli altri record
e i campi non modificati, senza interpretare la patch come tabella completa.
Eliminare la duplicazione della stessa collezione nella risposta.

Il protocollo va aggiornato insieme ai consumatori delle viste giornaliere,
settimanali, diario e tracker. Restano invariati controllo della versione,
conferma del salvataggio remoto e recupero delle bozze dopo errore. La risposta
deve includere gli eventuali valori derivati necessari all'interfaccia.

Un salvataggio non deve essere seguito da una rilettura completa automatica
per compensare una patch insufficiente. Raggruppare più giornate in una nuova
API di scrittura non rientra in questa prima iterazione.

Questo intervento resta nella proposta, ma segue gli esperimenti sulle
letture: ridurre dati duplicati è utile alla crescita dell'archivio, senza
presumere che risolva l'attesa delle letture da 20 secondi. È distinto da una
migrazione delle API di scrittura Docs o dalla progettazione di una nuova coda.

## C. Task visibili durante la paginazione

Aggiornare `loadContinuous` per mostrare i risultati di ogni pagina ricevuta,
continuando il caricamento delle successive in background, con al massimo
una richiesta di pagina in volo per quella navigazione.

- Mostrare uno stato esplicito di caricamento e un conteggio delle voci
  caricate; non presentare risultati parziali come archivio completo.
- Filtri, ricerca nel corpo, ordinamento e riepiloghi devono distinguere
  dati parziali e completi. L'ordinamento può assestarsi all'arrivo delle
  pagine, preservando focus, selezione e posizione quando possibile.
- Consentire navigazione verso altre viste durante il caricamento; ignorare
  le risposte tardive di sessioni, filtri o settimane non più correnti.
- Preservare il blocco di modifica attivo, identità, stato di apertura e bozze
  quando arriva una nuova pagina. In caso di errore conservare i risultati
  già visibili e offrire retry senza duplicazioni o ciclo infinito sul cursore.
- Le azioni che richiedono l'insieme completo devono attendere la fine del
  caricamento o dichiarare chiaramente il proprio ambito parziale. I gruppi
  settimanali e «Torna al checkup» mantengono settimana e filtri corretti.

Questa modifica anticipa la prima visualizzazione; non promette di ridurre
il tempo necessario a leggere l'intero archivio e non rinuncia al recupero
completo necessario ai filtri attuali.

## D. Correzione e completamento del tracing

- Una chiamata remota genera un solo evento RPC. Rimuovere il secondo evento
  generato dal percorso `run` quando è presente una vista riutilizzata.
- `cache: true` identifica un riuso locale senza RPC; una rilettura remota
  dopo una vista in cache resta distinta e non eredita quel significato.
- Correlare le pagine della stessa navigazione con un actionId casuale;
  misurare tempo al primo risultato visibile, tempo al completamento, numero
  di pagine e stato completo/parziale/annullato/errore.
- Aggiungere conteggi tecnici di righe/frammenti/byte letti e segmenti relativi
  al recupero multiplo. Distinguere helper invocati e reali letture raggruppate;
  non presentare `sheetsCalls` come totale esatto delle chiamate Google.
- Misurare separatamente getAll/putAll, parsing/validazione e controlli delle
  revisioni. Distinguere contatori dei servizi cache da hit/miss per voce e
  da errori/bypass: gli helper temporali generici non bastano ad attribuire
  tutta la lentezza warm alla cache.
- Mantenere l'allowlist dell'export e l'assenza di testi, date del diario,
  chiavi dei record, identificativi Drive o messaggi d'errore originali.

## Criteri di accettazione

Per il primo esperimento E verificare prima di passare agli altri:

- massimo un getAll e un putAll per pagina eleggibile, zero quando inutili;
- ordine invariato con hit/miss intercalati e nessuna duplicazione;
- pending prevalente anche con vecchio elemento cache presente;
- JSON corrotto o valido ma di struttura errata, espulsione parziale ed errori
  getAll/putAll gestiti senza perdita dei dati leggibili;
- revisioni cambiate, iniziali/finali mancanti o controllo fallito impediscono
  l'inserimento in cache, con al massimo un ricontrollo per documento coinvolto;
- rispetto di bypass, limite per elemento, budget risposta e cursore successivo;
- formattazione, idempotenza e conflitti equivalenti al percorso precedente;
- nuove misure prive di contenuti o identificativi personali.

Per i passi successivi restano i seguenti criteri:

1. Su fixture con 25 miss, il recupero multiplo elimina la sequenza di
   ricerche e letture individuali nel percorso pagina; le letture dipendono
   dagli intervalli raggruppati e dai limiti dichiarati. Testare anche la
   distribuzione sparsa, documentando il caso peggiore.
2. A parità di dati, pagine cold/warm/pending restituiscono contenuti, versioni,
   formattazione e ordine equivalenti al comportamento precedente. Una pagina
   tutta in cache senza pending non legge payload DocContent inutilmente.
3. La risposta a una modifica Days/Weeks/HabitLogs contiene soltanto i record
   interessati e non cresce al crescere del numero di record estranei. Non
   duplica la collezione e non causa una rilettura completa successiva.
4. Con una fixture di 59 task e risposte ritardate, la prima pagina è visibile
   prima della conclusione delle altre due; a completamento filtri e risultati
   coincidono con l'archivio completo precedente.
5. Cambio vista/filtro durante il caricamento, errore alla seconda pagina e
   retry non perdono bozze, non duplicano voci e non applicano risposte obsolete.
6. Una RPC produce un evento esportato, con navigazioni aggregate distinguibili
   dalle singole pagine. L'export resta privo di dati personali.
7. Restano superati i test di conflitti, idempotenza, salvataggi multi-mese
   parziali, privacy e modifiche Docs esterne. Il salvataggio resta durevole
   in Sheets prima della sincronizzazione Docs.

## Verifica delle prestazioni

Prima e dopo l'intervento raccogliere almeno cinque esecuzioni confrontabili
per lettura cold, warm, navigazione task e salvataggi Days/HabitLogs, usando
lo stesso archivio e browser e documentando come si ottiene lo stato cache.
Confrontare mediana e intervallo osservato, byte delle risposte, letture
raggruppate, tempo al primo risultato e tempo totale. Non includere gli eventi
RPC duplicati della baseline e non sommare segmenti inclusivi.

Per E confrontare percorso individuale e bulk a parità di dati e stato cache,
separatamente per warm, cold, mista e servizio non disponibile. Misurare tempo
cache e totale backend/client: ridurre la differenza fra cold e warm non è
un obiettivo valido, perché potrebbe significare aver rallentato il warm.

I criteri strutturali sopra sono obbligatori; il miglioramento temporale è
da misurare sul deployment reale. Non fissare percentuali o tempi garantiti
sulla base del singolo export. Se i tempi non migliorano, documentare il
risultato e approfondire i segmenti residui prima di ampliare l'intervento.

Usare Demo e servizi simulati per correttezza e conteggi delle operazioni,
includendo errori e archivi voluminosi. Eseguire build, `npm test`,
`test:tracing`, `test:release` e test task/settimana pertinenti; verificare
le quattro palette e le larghezze 320/390 px. Aggiornare specifiche correnti,
handoff e risultati dopo l'implementazione. La pubblicazione richiede una
richiesta esplicita separata.

## Ordine proposto

Completare la fase 0 e raccogliere la nuova baseline prima di fissare la
priorità tra E e A. Misurare C separatamente dal recupero dei contenuti: il caricamento
progressivo non garantisce una prima pagina veloce: evita l'attesa delle
successive e deve distinguere i risultati incompleti. Valutare B dopo i
risultati degli interventi sulle letture.

## Esperimento esplorativo: snapshot documento/mese

Confrontare su documenti piccoli/recenti la materializzazione di tutte le
sezioni con la lettura per pagina. L'apertura del corpo e l'indice dei marcatori
sono già riutilizzati nella stessa richiesta: il confronto deve misurare il
costo aggiuntivo di estrarre e serializzare tutte le sezioni rich-text e il
vantaggio del riuso fra pagine, sul client o in una cache server recuperabile.

Misurare byte, numero di sezioni/elementi, memoria quando osservabile, tempo
al primo risultato e alle pagine successive. Confrontare snapshot completo,
prefetch e blocchi limitati prima di stabilire soglie adattive. L'idratazione
in memoria del browser non equivale ancora a IndexedDB o persistenza offline.
Non scartare lo snapshot in base al solo numero di file e non adottarlo senza
misurare i corpi e la crescita delle versioni storiche.

## Scritture Docs rinviate

Conservare la coda persistente attuale. Una migrazione DocumentApp → Docs API
Advanced richiede analisi separata di conversione rich-text, permessi,
concorrenza e fallimenti parziali tra servizi. La decisione sarà motivata da
misure specifiche e costo/beneficio, senza richiedere necessariamente un timeout
né dedurla dal solo tempo aggregato queueMs. Nessun fire-and-forget con sole
mutazioni in memoria e nessuna nuova coda client previsti da questa spec.
