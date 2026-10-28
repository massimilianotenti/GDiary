# Primo writer di dominio: riflessioni giornaliere

Incremento locale del 28 ottobre 2026, pacchetto 8 ancora parziale. Implementato
in Code.gs e incorporato dalla build in Demo.html. Solo fixture sintetiche:
nessun accesso Google, provisioning, migrazione o deployment.

## Contratto implementato

`syncDayWriter_(store, trustedScope)` costruisce un servizio interno con
`save` e `read`, usando il nucleo `syncCommitProtocol_`. Lo store è iniettato
dal server e mantiene le proprie guardie di attivazione, autorizzazione e lock.
La costruzione non apre né inizializza tabelle. Tutti gli helper terminano
con underscore: non viene esposta una nuova RPC Apps Script.

Il planner puro `syncPlanDayOperation_` accetta esattamente operationId,
baseVersion e day. L'operazione scrive una sola entità `days`, identificata
dalla data, con dati `{format:'sync-day/v1', record:...}`. La base è null per
la creazione oppure una versione commit-N; un updatedAt legacy non è una base
valida del protocollo.

day è uno **snapshot completo**, con tutti i campi di DAY_HEADERS tranne
updatedAt. I campi rich restano stringhe JSON, come nelle righe Days, oppure
stringa vuota per testo senza formattazione. Campi omessi, sconosciuti o con
tipo errato sono rifiutati prima dell'accesso allo store. Un campo vuoto
esplicito consente la cancellazione del suo contenuto; non esiste un merge
implicito fra payload parziale e record letto durante il retry.

Questa scelta rende il piano indipendente dallo stato corrente: dopo una
risposta persa, lo stesso payload produce lo stesso fingerprint anche se un
altro dispositivo ha già scritto una versione successiva. Il futuro ponte
con saveDay dovrà preparare e conservare lo snapshot completo; non potrà
semplicemente inoltrare i payload parziali dell'API attuale.

## Testo, formattazione e versioni

Testo e spazi vengono conservati senza trim. Ogni campo semplice ha limite
6.000 unità UTF-16; ogni JSON rich 45.000, con un ulteriore limite del piano
complessivo di 32.768 unità, coerente col nucleo. Non viene troncato un record
per farlo rientrare nel budget. Sono limiti del prototipo, non quote Google.

I blocchi rich devono corrispondere esattamente al testo e ai formati supportati
dal validatore esistente. Attributi non supportati sono rifiutati anziché
rimossi. La serializzazione canonica dei blocchi rende irrilevante l'ordine
delle chiavi JSON per il retry. Il record non introduce timestamp server nel
piano; la sua versione canonica proviene dalla sequenza del commit.

save restituisce la ricevuta del nucleo, legata allo scope fidato. Un retry
riusa la stessa ricevuta; cambiare il payload di operationId dà OperationMismatch.
Il conflitto di base resta una ricevuta stabile e non sovrascrive il record.
read attraversa la barriera di recupero, valida formato, campi, testo/rich e
corrispondenza data/identità; restituisce giorno, versione e cursore coerenti.
Una variante persistita con schema errato produce ProtocolCorrupt. Assenza e
tombstone restano distinguibili attraverso version e deleted.

## Verifiche eseguite

`npm run test:canonical-days`, incluso anche in npm test, verifica:

- Creazione, lettura, aggiornamento, retry dopo modifiche successive e
  ricevuta stabile del conflitto; stessa formattazione con chiavi JSON riordinate.
- Testo Unicode, checklist, testo simile a formule, spazi, snapshot completo,
  input malformati, limiti e rifiuto degli attributi rich non supportati.
- Isolamento delle copie restituite: modificare un ACK o la lettura nel
  chiamante non cambia lo scope delle risposte successive o il dato persistito.
- **20 interruzioni** prima/dopo ogni unità del nucleo, in creazione e
  aggiornamento, eliminando il contesto V8 e ripartendo dai soli dati persistiti.
- **165 interruzioni** prima/dopo/parziali sulle chiamate Sheet/Range
  dell'aggiornamento: il lettore recupera il prepare, il retry converge alla
  stessa ricevuta e la versione finale corrisponde al testo inviato.
- Binding all'adattatore Sheets reale del progetto sui mock locali,
  disattivazione/revoca e presenza del writer nella Demo generata senza
  modificare la tabella Days del backend legacy simulato.

Superati build, npm test, test:release e test:tracing. Demo e staging dei sei
file rigenerati; Index senza differenze frontend. Bootstrap UTF-8, segnaposto
ROOT_FOLDER_ID e manifest preservati.

## Confine di questo incremento e seguito

Il writer è operativo attraverso lo store iniettato nei test, ma non è
collegato a saveDay/saveDays, ai lettori applicativi o al repository locale.
Non costituisce una migrazione delle riflessioni esistenti. Le capacità del
manifest restano false, e i salvataggi dell'app continuano a usare il modello
legacy. Non viene prodotta una seconda copia applicativa nei dati reali.

Prossimo incremento: ponte di migrazione controllato di Days, con confronto
della preimmagine legacy, conservazione dello snapshot inviato, passaggio
coerente dei lettori per periodo e blocco dei writer che aggirano il registro.
Provisioning e abilitazione richiedono ancora un contratto server completo.
Restano aperti il budget di 512 riferimenti per chiave, la compattazione e il
collaudo delle effettive barriere Google documentati nell'adattatore Sheets.
Il feed completo dell'archivio richiede la copertura dell'intera matrice delle
mutazioni. Online resta il deployment Apps Script 75.

Seguito implementato: [ponte di migrazione Days e routing dei lettori](VERIFICA-MIGRAZIONE-GIORNI.md),
con piani durevoli per le patch e date legacy congelate. L'iniezione resta
spenta nei sorgenti; il controller persistente di attivazione non è incluso.
