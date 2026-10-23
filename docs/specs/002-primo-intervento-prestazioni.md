# SPEC-002 — Primo intervento sulle prestazioni

**Stato:** Fase 0 pubblicata nella versione Apps Script 64; baseline raccolta; esperimento E pubblicato nella versione Apps Script 65

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

Autorizzazione iniziale della fase 0: estendere soltanto il tracing, mantenendo
percorsi di lettura/salvataggio, limiti e cache. Dopo la nuova baseline è stato
autorizzato l’esperimento E locale (vedi aggiornamento sotto); A–D restano
proposte per le parti applicative non ancora implementate.

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

## Baseline fase 0 — 22–23 ottobre 2026

Misure condivise dall'utente, measurementVersion 2. Solo aggregati: nessun
JSON originale, contenuto o identificativo dell'archivio conservato.

- Cinque RPC comparabili della pagina da 25 voci, tutte hit: client
  5,494 / 8,693 / 11,541 / 7,878 / 5,171 s; backend
  4,144 / 6,885 / 10,463 / 6,468 / 3,788 s. Una RPC è riuscita ma la
  navigazione associata è annullata: valida per il costo backend, esclusa
  dalle navigazioni completate. Quattro navigazioni complete, non cinque.
- Su questi campioni driveCheck inclusivo varia da 1,949 a 8,732 s;
  cacheGet da 0,702 a 1,054 s. Nel campione più lento il costo è nel
  controllo Drive, non nell'apertura Docs (zero aperture).
- Due benchmark da 25 chiavi, cinque round ciascuno: media per round
  individuale 835 / 1272 ms; bulk 52 / 48 ms. Rapporto circa 16–27 volte
  sul solo segmento cache; non una previsione del miglioramento pagina.
- Tre navigazioni task complete da 60 voci (25+25+10): prima mista
  12 hit / 48 miss, 45,996 s client e 41,479 s backend aggregato;
  successive tutte hit 15,928 / 21,319 s client, 12,106 / 17,317 s backend.
  Ricerca DocContent nella mista: 18,517 s complessivi. Controlli Drive
  inclusivi nelle due warm: 6,349 / 8,877 s; cacheGet 1,767 / 2,464 s.
- Salvataggio normale di una voce: azione 7,466 s, RPC 7,401 s,
  backend 5,497 s, queue inclusivo 2,522 s, Sheets 1,512 s.
  Sincronizzazione completata e modifica visibile confermate dall'utente.
  Prima rilettura 9,215 s client / 7,350 s backend, 16 hit / 9 miss,
  un Docs aperto; seconda 4,528 / 3,463 s, 25 hit, zero Docs aperti.
  I nove miss sono compatibili con la revisione documentale cambiata;
  cacheAbsentUnknown non certifica la causa.

Non sommare tempi inclusivi. Le ripetizioni sono una baseline diagnostica,
non una distribuzione statistica o un confronto causale fra implementazioni.
Non confrontare la giornata successiva come se lo stato iniziale fosse identico.
Restano da completare cinque navigazioni task confrontabili per il confronto
formale prima/dopo; nessuna stima su Days/HabitLogs dai campioni disponibili.

### Esperimento E locale — 23 ottobre 2026

Autorizzato dall'utente dopo la raccolta. getJournalPage prepara al massimo
25 candidati, controlla i documenti e raccoglie chiavi uniche. Esegue al massimo
un getAll e un putAll, ciascuno soltanto quando necessario. Parsing e fallback
restano per voce; pending prevale, bypass evita getAll, TTL sei ore e limite
24000 unità di stringa restano invariati. Ricontrollo revisione per documento
prima delle scritture, entrambe le revisioni richieste valide e uguali.
La preparazione può verificare documenti di candidati poi esclusi dal budget;
il cursore usa solo i risultati effettivamente restituiti e non salta voci.

Tracing: aggiunte fasi cacheGetAll/cachePutAll (Ms, Calls, SelfMs) alla
allowlist; formato e measurementVersion invariati, metriche additive.
Demo supporta putAll. Il benchmark diagnostico individuale/bulk resta distinto.
Test dedicato tests/verify-cache-bulk.cjs incluso in npm test.

Analisi controlli Drive: driveCheck comprende getFileById, inside_ (visita
getParents fino alla radice, con memoizzazione dell'appartenenza nella
richiesta), isTrashed e lettura revisione. driveCheckSelfMs non è il solo
costo della revisione né prova del costo preciso di getParents. Nessuna
protezione rimossa e nessuna ottimizzazione di inside_ in questo esperimento.
Un successivo dettaglio diagnostico può distinguere appartenenza/cestino.

Pubblicazione autorizzata il 23 ottobre 2026 nella versione Apps Script 65,
stesso deployment e URL; beneficio reale ancora da verificare separatamente. Il
recupero raggruppato DocContent e la visualizzazione progressiva restano proposte.

## Controlli Drive — versione 66, 23 ottobre 2026

Dopo il collaudo reale della versione 65 l'utente ha autorizzato il lavoro
sui controlli Drive. Pubblicazione successivamente richiesta ed eseguita:
versione Apps Script 66 sul deployment esistente, URL e accesso privato invariati.

inside_ memorizzava solo il file iniziale, non le cartelle del percorso che
aveva effettivamente raggiunto la radice. Documenti diversi con genitori
comuni ripercorrevano quindi la stessa catena nella stessa richiesta.
Ora viene memorizzato soltanto il percorso riuscito, inclusi gli antenati;
rami alternativi non dimostrati non vengono marcati. La prova è volatile,
contenuta in IO.inside e cancellata da ioReset_ a ogni richiesta. Nessun
riuso tra RPC, nessuna fiducia negli ID del Registry al posto del controllo.

Tracing additivo: driveInside (intero controllo), driveRoot (risoluzione e
verifica radice), driveParents (getParents e consumo completo dell'iteratore),
driveTrash (radice e documenti nel percorso pagina). Aggiunti conteggi
aggregati driveInsideNodes, driveParentEdges, driveInsideMemoHits, senza ID.
I Calls dei segmenti descrivono helper, non RPC fisiche Google. driveRoot
include anche invocazioni con radice già presente in IO; un memo hit può
riguardare il file o un antenato. driveParentsMs non comprende ogni getId.
La strumentazione non amplia l'export a contenuti o messaggi originali.

Nella fixture con due documenti sotto cartella e anno comuni, getParents
passa strutturalmente da sei visite a quattro; nessuna previsione temporale
per l'archivio reale. Riutilizzo circoscritto al singolo percorso riuscito:
se un ramo attraversato non appartiene all'archivio resta non attendibile.
Restano invariati controlli cestino, revisione iniziale/finale e conflitti.

Verifiche in docs/VERIFICA-CONTROLLI-DRIVE.md. Prossimo confronto reale dopo la pubblicazione della versione 66: cinque letture e cinque navigazioni
con stessa metodologia della versione 65; separare numero di nodi/archi,
getParents, driveInside e totale. Verificare il risparmio reale prima di
considerare ulteriori cambi di API o cache tra richieste.

Collaudo reale v66 successivo: cinque letture e cinque navigazioni tutte
riuscite, coda zero pending/errori. Pagina mediana 5,629 s contro 4,499 s
v65; Task 14,462 s contro 16,680 s v65. Risultato misto, nessuna causalità
dimostrata dal confronto sequenziale. driveParents mediana pagina 1,785 s,
contro 6 ms del cestino; riuso antenati attivo. Non attribuire il costo al
cestino e non ampliare l'ottimizzazione senza confronto concreto. Risultati
e limiti completi in docs/VERIFICA-CONTROLLI-DRIVE.md.

## E. Cache raggruppata — pubblicata nella versione 65

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

## C. Task visibili durante la paginazione — pubblicato nella versione 67

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

### Implementazione C — 23 ottobre 2026

Autorizzata dall'utente come prossima azione dopo il commit c1e2e72.
loadContinuous applica ogni risposta prima di richiedere la pagina successiva.
loaded significa che una pagina è disponibile; complete indica assenza di
cursore. loading/loadError e cursor appartengono alla sessione. I risultati
parziali sono espliciti anche nella ricerca senza corrispondenze e nel riepilogo.
Non viene mostrato il totale backend (può includere voci private); il conteggio
nell'interfaccia include solo le voci visibili secondo le regole privacy.

Retry dalla pagina fallita senza cancellare blocchi già ricevuti. Blocchi con
identità esistente non sono sostituiti all'arrivo di altre pagine. Le bozze
recuperate di record in pagine successive restano visibili e vengono riconciliate
senza duplicare l'identità. Cursor loop protetto, risposte obsolete ignorate,
una sola richiesta pagina in volo; dopo un cambio periodo si attende la vecchia
RPC prima di avviare il nuovo caricamento. Il testo ricerca in attesa del debounce
non viene resettato da un aggiornamento pagina. Focus/selezione e DOM editor
preservati; ancoraggio viewport al blocco attivo quando possibile.

Tracing additivo firstResultMs nella navigazione: tempo alla prima risposta
applicata e patch DOM Vue completata (nextTick), non misura del paint. clientMs
resta la durata della navigazione; esito partial per errore dopo pagine ricevute,
error se non è disponibile alcuna pagina, cancelled per sessione abbandonata.
In un retry firstResultMs si riferisce alla prima pagina ricevuta di quel retry.
Nessun contenuto/identificativo persistente aggiunto all'export.

Verifiche locali in docs/VERIFICA-TASK-PROGRESSIVI.md. Pubblicazione
esplicitamente richiesta ed eseguita nella versione Apps Script 67, stesso
deployment e URL. Collaudo reale completato: cinque navigazioni task riuscite, primo risultato
DOM mediana 5,067 s e completamento 16,058 s, con 61 voci su tre pagine.
Stato parziale e nodo editor/focus/selezione preservati. Coda zero pending/errori.
Nessuna riduzione del tempo totale dimostrata; dettagli del confronto e limiti
in docs/VERIFICA-TASK-PROGRESSIVI.md.

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

Fase 0 e raccolta iniziale completate. E pubblicato nella versione 65; il confronto
reale prima/dopo precede l’estensione ad A. Misurare C separatamente dal recupero dei contenuti: il caricamento
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
