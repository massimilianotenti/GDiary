# Capacità e compattazione dei riferimenti del registro

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
