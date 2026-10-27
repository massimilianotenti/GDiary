# Ricerca senza lock lungo — SPEC-004 fase 1A, solo locale

Implementato il 27 ottobre 2026. Nessun deploy, setup o accesso all'archivio
reale; ultimo online documentato Apps Script 75, app v2.0.4.

## Protocollo di lettura

searchArchive non esegue più il lavoro dentro locked_ e non effettua flush.
La ricerca rimane paginata a massimo cinque documenti per RPC. Usa tre
controlli brevi con tryLock(0): prima della lettura, dopo lo snapshot Sheets
e dopo la costruzione dei risultati. Durante questi controlli legge soltanto
la configurazione e la revisione da ScriptProperties; rilascia il lock prima
di qualsiasi scansione Sheets o chiamata Drive/Docs. Non attende un writer
occupato e non tenta di rilasciare un lock già detenuto dal chiamante.

Nuova proprietà runtime SEARCH_REVISION, cambiata prima delle mutazioni
pertinenti e al massimo una volta per unità IO sotto lock. Il successivo worker a piccoli
lotti può aprire più unità nella stessa RPC.
Tabelle coperte: Entries, DocRefs, Files, Projects, TaskDocQueue e DocContent.
Append, writeRow/writeRows, conversione progetto e cancellazione hanno hook
prima delle modifiche osservabili. Per deleteNote la revisione viene anticipata
prima del lavoro distruttivo sul Doc. Un errore della proprietà non permette
di proseguire con la nuova mutazione; un errore successivo può invalidare
conservativamente una ricerca anche senza cambiamenti effettivi.

Lo snapshot legge metadati, riferimenti, allegati, coda pending e catalogo
progetti pertinente. Mappe per entryId sostituiscono i precedenti find/filter
ripetuti per ogni voce. Lo stato pending è fissato una volta per lotto.
Il contenuto durevole pending prevale sempre sul Doc, anche quando questo
conserva ancora il testo precedente; un pending non leggibile non ricade sul
vecchio Doc. I documenti della pagina senza voci non-pending non vengono aperti.

La revisione applicativa deve coincidere a tutti i controlli: se un writer
interviene, l'intero lotto viene scartato. Non si restituiscono hit costruiti
mescolando metadati precedenti e contenuti successivi.

## Docs e continuazioni

Per ciascun Doc letto, la ricerca verifica appartenenza all'archivio, cestino
e getLastUpdated prima dell'apertura; dopo la lettura acquisisce un nuovo
File e ripete appartenenza (senza memo precedente), cestino e revisione.
Una fonte cambiata/non verificabile viene omessa dai match nel corpo e indicata
come errore parziale. Restano possibili hit nei metadati applicativi. Le
sezioni sono estratte dal testo già acquisito, senza ripetere l'accesso Drive
per ogni voce. La semantica di sottostringa, titoli, tag, date e titoli allegati
resta quella precedente.

Ogni risposta valida contiene searchVersion, stringa di scope applicativo
con configurazione archivio, revisione e query normalizzata. Il client la
ritrasmette sulle continuazioni. È un controllo di coerenza interno dell'API,
non un token di autorizzazione o l'identità stabile richiesta da IndexedDB.
Non viene esportata nella diagnostica. Un cambio archivio/query/revisione o
una continuazione senza versione richiede ripartenza.

Il reset ha entries/files/projects vuoti, searchReset, partial:true e done:true:
termina anche un vecchio loop anziché lasciarlo ripetere indefinitamente.
Il frontend aggiornato scarta tutti i risultati precedenti, azzera cursore e
versione e offre «Riprova ricerca». Non interpreta il reset come zero risultati
nell'archivio. Non riparte automaticamente, per evitare cicli con writer attivi.

Le pagine vengono accumulate nei risultati della ricerca, ma entries/files
canonici sono aggiornati solo quando il ciclo termina senza reset. Se il lotto
successivo è incoerente, le pagine precedenti non inquinano lo stato canonico.
I risultati con errori Docs sono indicati come ricerca parziale, non completata.
Bozze, privacy e conferme di scarto preesistenti restano attive.

## Tracing e mock

measurementVersion 4 conserva le metriche precedenti e aggiunge le fasi
searchCheck, searchStampLock e searchRevision, più conteggi searchLockAttempts,
searchLockBusy, searchCheckErrors, searchResets e searchInvalidations. Le nuove
fasi distinguono il brevissimo controllo dalla vecchia sezione critica lunga.
Le letture normali della ricerca non hanno lockAttempts/lockHeld o flushCalls
del wrapper locked_. Nessuna query, versione di ricerca o ID viene aggiunto
agli export. La versione richiesta continua a incidere soltanto sui byte RPC.

Il mock Demo ora espone getLastUpdated e avanza la revisione a saveAndClose,
anche per più salvataggi nello stesso millisecondo. Non è una misura o una
simulazione delle latenze Google.

## Verifiche

Nuovo `npm run test:search-concurrency`, backend incluso in npm test.

- Un lock simulato verifica che Docs e payload Sheets siano letti senza lock,
  con tre sole sonde non bloccanti e nessun flush nel caso ordinario.
- Mutazioni durante l'apertura Docs: salvataggio metadati, cancellazione e worker
  completato producono reset, senza hit misti o di voci eliminate.
- Pending prima/dopo sincronizzazione, revisione esterna e spostamento del Doc
  durante lettura: precedenza rispettata, fonte non verificata esclusa.
- Writer occupato, lock annidato, matrice delle sei tabelle, singolo avanzamento
  revisione per richiesta e errore Properties prima dell'append.
- Più pagine reali della fixture, fino a cinque Docs per lotto, scope query e
  rifiuto della continuazione senza versione.
- Browser: versione ritrasmessa, reset dopo una prima pagina valida, nessuna
  pubblicazione anticipata nello stato canonico, retry esplicito, etichetta
  parziale e tracing privo di token/query/ID.

Superati build, npm test, test:search-concurrency, test:release, test:tracing,
test:delete-delta, test:progressive, test:task-index, test:locks e test:scale. Index e Demo
rigenerati, bootstrap UTF-8, segnaposto ROOT_FOLDER_ID e sei file di staging
preservati. Non sono stati misurati secondi risparmiati su Google.

## Limiti e seguito

La revisione copre i writer di questa implementazione. Modifiche manuali ai
fogli o scritture di versioni server precedenti che non la aggiornano non
costituiscono un feed osservabile e non hanno la stessa garanzia di coerenza.
Le modifiche dirette nei Docs hanno il controllo live descritto sopra, ma non
esiste una transazione atomica su documenti distinti; una fonte può cambiare
dopo il suo controllo finale. I risultati riflettono le revisioni verificate
nei rispettivi lotti, non una fotografia globale dei Docs allo stesso istante.

Resta la scansione dei metadati per ogni pagina e dei contenuti pending nella
prima. Documenti grandi e storico DocContent possono ancora richiedere tempo.
La nuova proprietà comporta una scrittura aggiuntiva nei writer pertinenti:
misurare costo e beneficio sul contenitore Google prima di dichiarare latenza.

Il browser continua a disabilitare i controlli durante il ciclo della ricerca;
questo step elimina la contesa remota lunga con altri writer, non introduce
ricerca locale o UI utilizzabile durante tutte le RPC. Il successivo [worker a piccoli lotti](VERIFICA-WORKER-LOTTI-PICCOLI.md)
rilascia ora il lock fra voci; la singola scrittura lo mantiene: il suo coordinamento è il prossimo intervento
separato della fase 1B, prima di copia locale, feed e outbox.
