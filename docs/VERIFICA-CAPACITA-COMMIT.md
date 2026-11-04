# Capacità e compattazione dei riferimenti del registro

## Intervallo di commit a limite fisso — 30 ottobre

`inspectRetainedRange` restituisce `upperSequence`: la prima pagina lo acquisisce dal massimo pubblicato e le successive possono ripassarlo per escludere commit aggiunti nel frattempo. `highWater` riporta invece il massimo al momento della singola pagina. Un limite futuro o un cursore oltre la fine sono rifiutati; il cursore immediatamente dopo la fine produce una pagina vuota. Test in memoria e con Sheets simulato verificano append concorrente, stato corrente aggiornato e assenza di scritture. Build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Il limite fissa solo l'insieme delle sequenze: stato corrente, ricevute e alias non sono una fotografia coerente fra pagine. Non è un checkpoint recuperabile e non autorizza eliminazioni.

## Validazione delle pagine dell'inventario — 30 ottobre

Il protocollo verifica che l'adattatore rispetti il limite superiore fissato, avanzi esattamente fino al limite della pagina e riporti conteggi interi non negativi compatibili con le righe esaminate; rifiuta anche ricevute incomplete. Test con adattatore difettoso coprono cursore fermo, salto, limite alterato, conteggi impossibili e ricevute mancanti, senza scritture. Build, test:commit-capacity, test:commits e test:commit-storage superati; test:release eseguito separatamente. Rimangono i limiti dell'inventario descritti sotto: non è un checkpoint coerente né autorizza retention o eliminazioni.

## Inventario paginato delle ricevute — 30 ottobre

`inventoryRetainedReceipts({afterRow,upperRow,limit})` è un metodo interno read-only: esamina fino a 25 righe fisiche per volta, con `afterRow:1` e `upperRow:null` per iniziare; il limite superiore acquisito va ripassato alle pagine successive. L'adattatore verifica pubblicazione, frammenti e digest, riconosce le ricevute e restituisce solo ID e stato del principal e archivio richiesti; il protocollo rilegge e verifica ogni ricevuta e rifiuta una transazione pending. Segnala separatamente righe non pubblicate, ritirate e non riconosciute. Test Sheets simulato copre ricevute committed/conflitto, isolamenti fra principal e archivi, paging, append dopo il limite fissato, pending e nessuna scrittura. Build, test:commits, test:commit-storage, test:commit-capacity e test:release superati.

La scansione può leggere payload di righe non pertinenti all'interno del server e costa proporzionalmente alla dimensione fisica dell'indice. Non è una fotografia transazionale fra pagine: righe aggiunte successivamente sono escluse, mutazioni esterne e righe non riconosciute impediscono di considerare il risultato completo. Non verifica da sola tutte le dipendenze o le baseline Docs, non autorizza eliminazioni e non è esposta come RPC o attivata su Google.

## Riferimenti delle ricevute di conflitto — 30 ottobre

Per operationId noti, l'ispezione read-only verifica ogni `actualVersion` non nulla delle ricevute di conflitto: il commit corrispondente deve contenere la stessa entità/versione e la revisione corrente non può precederla o divergere alla stessa sequenza. Il rapporto aggiunge il numero dei riferimenti verificati e quello ancora corrente; cache dei commit condivisi limitata alla singola ispezione. Un conflitto su entità assente non ha un commit da controllare: l'assenza storica non è dimostrata. Test in memoria coprono baseline corrente, superata, mancante e assenza, e l'adattatore Sheets simulato verifica assenza di scritture. Build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Non si enumerano tutte le ricevute, non si verificano baseline Docs e checkpoint, né si autorizzano eliminazioni o retention.

## Ricevuta con alias mancante — 30 ottobre

Quando una ricevuta committed identifica un commit valido ma il lookup per operationId non restituisce l'alias, l'ispezione riporta la sequenza effettivamente verificata tramite ricevuta e `aliasPresent:false`. Il test usa uno store simulato con lookup assente e controlla che nessun dato venga modificato. Build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Il rapporto non esegue riparazioni, non è un inventario completo e non autorizza eliminazioni.

Incremento locale del 28 ottobre 2026, successivo al commit **4a219f6**.
Solo mock e dati inventati; nessun accesso Google, compattazione reale,
provisioning o deployment. Pacchetto 8 ancora parziale.

## Controllo prima delle scritture

L'adattatore syncSheetsCommitStore_ espone `preflightWrites`, utilizzabile
soltanto sotto il proprio lock e con le consuete guardie di accesso. Accetta
descrittori interni kind/id/writes, raggruppa le richieste per chiave e conta
tutti i riferimenti corrispondenti, anche quelli non pubblicati. Il risultato
riporta limite 512, usati, richiesti, rimanenti e available, senza payload o
identità in chiaro. Non scrive né riserva spazio fisico su Google.

Il nucleo, quando l'adattatore offre il metodo, controlla prima del prepare
due riferimenti head, uno per ogni entità, uno commit, uno ricevuta e uno
alias dell'operazione. Un conflitto nuovo richiede soltanto spazio per la
ricevuta. Le risposte già registrate possono essere ritentate anche al limite:
non necessitano di un nuovo prepare o di nuovi riferimenti.

Il gateway Days verifica insieme la prenotazione e l'operazione successiva:
quattro riferimenti head e i rispettivi record/alias. Se il piano completo
non rientra, si ferma prima della prenotazione. Il budget è conservativo: un
conflitto effettivo potrebbe usare meno riferimenti di quelli preventivati.

Il metodo write ha inoltre una guardia indipendente: dopo gli eventuali ritorni
idempotenti, rifiuta una nuova revisione se esistono già 512 riferimenti per
la chiave, **prima di scrivere frammenti**. Non può quindi produrre il riferimento
513 che renderebbe il record illeggibile con il lettore attuale.

Il controllo non è una riserva contro guasti ripetuti: un errore può lasciare
un riferimento non pubblicato e consumare margine. Un recupero già pendente
può arrestarsi al limite senza pubblicare il checkpoint; la compattazione
dei riferimenti può liberare il margine necessario a riprenderlo.

## Compattazione recuperabile, senza rimozione dei payload

`compactReferences({kind,id,dryRun,limit})` opera soltanto su head ed entità
mutabili. limit è fra 1 e 128; dryRun richiede comunque accesso e lock ma
non effettua scritture. L'esecuzione richiede inoltre il consenso server
`services.maintenanceEnabled()===true`, assente per default e mai abilitato
dal client. Non esiste una nuova RPC o una manutenzione automatica.

Il metodo legge e verifica i riferimenti correnti e l'ultimo payload pubblicato.
La riga dell'ultima revisione viene conservata esattamente dov'è, insieme al
suo marcatore di pubblicazione. Le revisioni massime discordanti o l'ultimo
payload corrotto bloccano il metodo prima del ritiro dei riferimenti.

Per ogni riga superata selezionata, cambia soltanto la cella key da k:hash
a retired:hash, poi flush e verifica. Non modifica la riga conservata, gli
alias, i frammenti, le ricevute, i commit o il checkpoint. Un riferimento
ritirato conserva fisicamente i vecchi contenuti, ma non corrisponde più alla
ricerca esatta della chiave attiva. Le righe ritirate non sono riferimenti
pubblicati leggibili sotto il nuovo valore key: sono marcatori di manutenzione.

Un'interruzione lascia ogni cella originaria o sostituita/parzialmente sostituita.
In entrambi i casi l'ultima revisione verificata resta ricercabile: è sempre
esclusa dal piano di ritiro. La chiamata successiva ricalcola i riferimenti
ancora attivi e prosegue. Non serve pubblicare un nuovo checkpoint di dati
per ciascun lotto; nessun cursore o versione applicativa viene avanzato.
Il report dei conteggi descrive il singolo lotto, non è una ricevuta di
operazione stabile dopo una risposta persa.

Anche un head con pending può essere conservato: mantiene l'intero piano e
le preimmagini. La compattazione non risolve il pending né lo rende visibile;
il nucleo effettua il recupero normale prima di rispondere ai propri lettori.
Entità eliminate conservano la tombstone corrente; i commit storici mantengono
gli snapshot necessari al feed e le prove di idempotenza.

Questa è una **compattazione dei riferimenti attivi**, non una riduzione dello
spazio fisico. Non vengono eliminate righe o celle di payload, non viene
accorciata la retention e non vengono ripuliti i piani Days. Le chiavi immutable
commit/ricevuta/alias non sono compattabili con questo metodo.

## Verifiche eseguite

Nuovo `npm run test:commit-capacity`, incluso in npm test:

- Confini head a 510/511/512 riferimenti: commit possibile con due posti,
  rifiuto prima del prepare con uno, retry dell'ACK già confermato al limite
  e guardia che impedisce qualsiasi frammento/riferimento 513.
- Budget pieno delle entità, ricevute e alias; aggregazione del budget Days:
  tre posti head non pubblicano la prenotazione, quattro completano i due commit.
- Dry-run senza scritture e ritiro di 511 riferimenti in quattro lotti,
  conservando una sola revisione attiva e tutti i payload fisici.
- Recupero bloccato dal budget con head pendente: il ritiro preserva esattamente
  il prepare e consente poi la pubblicazione dello stesso commit/ricevuta.
- **182 interruzioni** sulle chiamate di ritiro di head ed entità: prima/dopo/
  parziali, più tutti i prefissi da 0 a 72 caratteri della prima sostituzione
  della chiave. Ogni prova riavvia V8 dai soli dati persistiti e completa la
  manutenzione, confrontando head, feed, ACK originari e frammenti fisici.
- Tombstone, alias e ricevute immutabili; consenso manutenzione assente,
  metodi fuori lock, schema errato, ultimo payload corrotto, revoca durante
  flush e secondo archivio nella stessa coppia di fogli.

Superati build, npm test (compreso test:commit-capacity), test:release e
test:tracing. Le suite precedenti del writer e del gateway Days restano positive,
comprese le 440 interruzioni del ponte. Demo e staging dei sei file rigenerati;
Index senza differenze frontend. Bootstrap UTF-8, ROOT_FOLDER_ID segnaposto,
manifest e interruttore DAY_COMMIT_GATEWAY=null preservati.

## Limiti e seguito

Le prove modellano chiamate sincrone interrotte e prefissi persistiti. Non
dimostrano le barriere del servizio Google, modifiche manuali delle tabelle
o RPC che arrivino dopo il rilascio del lock. La compattazione non ripara
record già oltre il limite, né corruzioni del registro. Restano validi i
limiti e le assunzioni dell'adattatore originale.

Il numero di ritiri è limitato per chiamata, ma la lettura dei riferimenti
può ancora richiedere molte RPC. TextFinder cerca nello storico fisico, che
continua a crescere: nessuna promessa di latenza costante o spazio illimitato.
Il preflight copre riferimenti logici, non quote Google o timeout. Soglie di
manutenzione, budget temporale e recupero dello spazio restano da progettare
prima dell'uso continuativo. Nessuna pulizia dei dati reali è autorizzata.

Prossimo incremento: controller persistente del routing Days, con binding
autorizzato e stato di attivazione/rollback; successivo collaudo browser del
percorso attivo. Provisioning e verifica Google restano distinti. Retention
e compattazione fisica saranno una manutenzione separata, preservando piani,
ricevute e baseline. Manifest e migrazione reale restano spenti; online v75.

Seguito implementato: [controller persistente Days e binding autorizzato](VERIFICA-CONTROLLER-ROUTING-GIORNI.md).
Modalità active/readOnly senza fallback alle preimmagini, con metadati
verificati dopo riavvio. Registrazione reale e collaudo browser attivo ancora
separati; nessuna policy automatica di manutenzione o recupero spazio.

## Ispezione delle ricevute, 30 ottobre

Il protocollo controlla in sola lettura fino a 25 operationId del principal corrente, verificando la coerenza fra ricevuta, commit e alias. Un prepare pending blocca la verifica senza recupero né scritture; una ricevuta mancante viene segnalata senza riparazione. Build, test:commits, test:commit-storage e test:commit-capacity superati con backend simulato. Non è un inventario completo del grafo, non indica quali record eliminare e non definisce una finestra di retention.

## Ispezione per intervallo, 30 ottobre

Il protocollo esamina in sola lettura fino a 25 commit consecutivi e conta le revisioni ancora correnti e le tombstone, verificando ricevuta e alias quando presenti. Fallisce su prepare pending, commit mancanti o entità incoerenti. I test simulati coprono paginazione, dati mancanti e assenza di scritture. Build, test:commits, test:commit-storage e test:commit-capacity superati. Il controllo non determina l’eliminabilità e non comprende le ricevute di conflitto prive di commit, le baseline Docs o un checkpoint recuperabile.
