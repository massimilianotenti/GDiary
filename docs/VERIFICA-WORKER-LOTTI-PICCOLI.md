# Worker Docs a lotti piccoli — SPEC-004 fase 1B, tranche intermedia locale

Implementato il 27 ottobre 2026. Nessun deploy, setup o accesso ai dati reali;
ultimo online documentato Apps Script 75, app v2.0.4.

## Scelta e confine del lavoro

Implementata l'alternativa transitoria prevista dalla SPEC-004: piccoli lotti
con coordinamento globale conservato. La fase 1B completa, con scrittura fuori
dal lock e protezione dai writer tardivi, resta aperta. Non sono introdotte
lease o prenotazioni presentate come garanzia di esclusione dei writer.

Il writer attuale usa DocumentApp.saveAndClose(), documentato senza parametri
per una revisione richiesta. Il salvataggio applica gli aggiornamenti pendenti
e può essere invocato automaticamente alla fine dell'esecuzione. La Docs REST
API offre invece WriteControl.requiredRevisionId per rifiutare una scrittura
quando la revisione non è più quella attesa. Migrare rich text, marcatori e
ogni percorso di scrittura richiede un intervento distinto; questo step non
abilita nuovi servizi Google né modifica le autorizzazioni.
Fonti ufficiali: [Document.saveAndClose](https://developers.google.com/apps-script/reference/document/document#saveAndClose()),
[Docs API WriteControl](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate#writecontrol).

## Nuovo flusso

processTaskDocQueue coordina fino a 10 tentativi distinti per invocazione, con
budget morbido di 5.000 ms. Ogni processDocQueueItem_ acquisisce lo stesso lock
globale usato dagli altri writer tramite tryLock(0), rilegge la coda e lavora
su una sola voce. Finalizza stato e preview, effettua flush e rilascia il lock
prima di scegliere un'altra voce. Non riutilizza lo snapshot precedente dopo
il rilascio: indici fisici e contenuti possono essere cambiati da un altro
client, worker o cancellazione.

Un Set locale impedisce di ritentare la stessa identità nella stessa
invocazione. Una nuova versione della voce appena elaborata rimane pending
per il passaggio seguente; non viene marcata done con lo snapshot precedente.
La priorità preesistente di pending rispetto a error rimane. Un errore di una
voce non produce dieci tentativi immediati e non impedisce di trattare altre
voci indipendenti, salvo esito di scrittura incerto.

Il worker termina quando:

- done: non rimane lavoro nella fotografia finale;
- deferred: ciò che resta riguarda identità già tentate, errori o versioni
  nuove da riprendere in un'altra invocazione;
- budget: prima di una nuova voce sono già trascorsi almeno 5 secondi;
- limit: sono già state tentate 10 identità;
- busy: non può acquisire il lock senza attesa;
- uncertain: una creazione o chiusura Docs non è confermata, quindi non avvia
  un'altra voce nello stesso passaggio.

Le risposte mantengono processed/pending/errors/busy e aggiungono attempted,
chunks e stopReason. Se il lock è occupato dopo alcuni successi, processed
conserva il progresso confermato e pending è null, perché il conteggio attuale
non è stato acquisito. Un errore inatteso nella persistenza della coda o nel
flush interrompe la RPC; non vengono avviate altre voci dopo quell'esito incerto.

Stato durevole, baseline rich, marcatori, appartenenza Drive, cestino e
controlli di conflitto restano quelli precedenti. Lo schema della coda resta
quello a quattro colonne. La lettura/scrittura Docs avviene ancora sotto lock:
le nuove interruzioni sono fra voci, mai durante una scrittura in corso.

## Interfaccia e metriche

Il pannello spiega che l'aggiornamento procede a piccoli lotti e che il resto
rimane in coda. Sincronizza ora conserva e mostra anche un progresso parziale;
un archivio occupato lascia disponibile il tentativo successivo. Rimangono
il trigger già configurato e il comando manuale: nessun nuovo trigger creato.

Il tracing aggiunge workerUnit, workerChunks, workerAttempts,
workerBudgetStops, workerBusyStops e workerUncertainStops. locked_ espone
lockHeldMaxMs: massimo intervallo di occupazione di una singola acquisizione,
inclusi finalizzazione e rilascio del wrapper. lockHeldMs resta la somma delle
occupazioni. measurementVersion 4 e formato export invariati; gli ID tentati
interni al worker non entrano nei rapporti diagnostici.

Le revisioni Task e ricerca vengono invalidate prima delle mutazioni in ogni
unità IO sotto lock. Ora una singola RPC worker può quindi aggiornare quelle
proprietà più volte; il costo non è più quello di un solo lotto da dieci voci.

## Verifiche

Nuovo `npm run test:worker-chunks`, backend incluso in npm test.

Con sei voci già consolidate da aggiornare e 1.000 ms simulati per apertura
Docs, il worker completa cinque voci e lascia la sesta pending al budget:
cinque acquisizioni/rilasci, lockHeldMs totale 5.000 ms e lockHeldMaxMs 1.000 ms.
È una misura di struttura su clock simulato, non un benchmark Google o una
previsione del tempo della singola voce.

Coperti ripresa successiva, limite dieci tentativi, nuova versione accodata
fra due unità, secondo worker intercalato, cancellazione con spostamento delle
righe fisiche, lock occupato dopo progresso confermato e conflitto persistente
senza ripetizione immediata. Una scrittura Docs effettiva seguita da errore
nella conferma della coda resta pending e viene recuperata senza duplicare la
sezione. Una chiusura Docs dall'esito incerto ferma il passaggio e lascia le
voci successive non tentate. Il browser verifica pausa, ripresa, messaggi di
progresso, coda durevole e metriche aggregate prive di ID.

Superati build, npm test, test:worker-chunks, test:release, test:locks,
test:tracing, test:search-concurrency e P54. Index/Demo rigenerati, bootstrap
UTF-8, ROOT_FOLDER_ID segnaposto e sei file di staging preservati.

## Limiti e lavoro rimanente

Il budget è morbido: una chiamata Google già partita non può essere interrotta.
Una singola voce lenta può ancora occupare il lock per 15–20 secondi. I rilasci
intermedi offrono punti di accesso ai salvataggi, senza garantire la priorità
di un waiter rispetto alla successiva acquisizione del worker.

Rileggere lo stato e riaprire Docs per ogni voce può aumentare chiamate totali,
flush e scritture delle revisioni, soprattutto per molte sezioni dello stesso
Doc. Lo storico della coda viene ancora letto; non è introdotto un indice
persistente. La propagazione completa ai Docs può richiedere più passaggi e
non è garantito un miglioramento della durata totale del worker. Misurare
contesa, picco di occupazione, throughput e costo su Google prima del rilascio.

Restano da sviluppare e validare writer condizionale, coordinamento per Docs
comune a cancellazioni/export/percorsi legacy, prenotazioni e recupero dopo
scadenza. Anche gli autosalvataggi DocumentApp e le modifiche esterne richiedono
quel disegno: questa tranche non promette una transazione con gli editor Google.
Il pacchetto worker rimane quindi parziale; restano inoltre gli altri sette
pacchetti del piano (identità/storage, repository locale, feed/commit,
bootstrap/riconciliazione, ricerca locale, outbox, manutenzione storico).
