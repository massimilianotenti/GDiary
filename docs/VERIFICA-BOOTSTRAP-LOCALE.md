# Bootstrap del diario dalla copia completa — 5 novembre 2026

## Comportamento implementato

Nel percorso sperimentale SPEC-004, un browser che ha già acconsentito alla
copia locale verifica prima l'identità con `getSyncManifest`. Una copia
completa con checkpoint di lettura concluso apre poi il diario e i dati
comuni senza attendere `getState`, `getJournalPage` o la sincronizzazione.
Il mese viene scelto usando la data corrente in Europe/Rome. Le navigazioni
fra mesi, progetti del diario e Task possono riutilizzare la stessa copia;
la vista Task legge i corpi dei task dell'archivio, la vista mensile quelli
del mese selezionato. Un mese vuoto è un risultato completo valido.

Si ripristinano impostazioni di privacy e riflessione, cataloghi, obiettivi,
giornate, settimane, abitudini, registrazioni, allegati e pianificazione.
Le preferenze di visibilità temporanea delle note private restano locali alla
scheda. Il messaggio distingue la copia datata dagli aggiornamenti verificati;
non si attribuisce una nuova data alla copia semplicemente aprendola.

La sincronizzazione in background e Aggiorna usano il consumer snapshot/feed.
I tombstone rimuovono i blocchi puliti; le bozze e i blocchi con operazioni
locali conservano oggetto editor, identità e versione originaria. Le versioni
pulite cambiate vengono sostituite con una revisione di rendering, evitando
che lo smontaggio dell'editor precedente riscriva il vecchio corpo. Le copie
pulite invariate conservano il nodo esistente. Le cancellazioni pending sono
applicate prima del primo rendering. Le bozze della scheda continuano a
usare il ripristino e la migrazione esistenti, senza cancellare bozze/outbox.
Le bozze della sessione già confermate nel repository restano accessibili
in memoria dopo la rimozione della copia sessionStorage: il nuovo avvio non
le perde prima del rendering e usa la chiave del mese corrente.

Le pagine datate parziali del percorso precedente non diventano complete:
se non esiste una copia completa utilizzabile resta il fallback ordinario.
Il seguito del 6 novembre estende il bootstrap completo a Settimana e Abitudini;
vedere VERIFICA-BOOTSTRAP-VISTE-PERIODO.md. Le altre viste restano sui percorsi precedenti.

## Checkpoint e transazioni

`archiveMeta.coverage.readCheckpoint` contiene formato
`local-read-checkpoint/v1`, revisione locale, cursore scoped e data.
Il consumer lo pubblica soltanto dopo snapshot, replay ordinato del feed,
recupero dei corpi e aggiornamento dell'indice di ricerca riusciti. Non è
un checkpoint server da usare per compattazione o retention.

`readBootstrapView` richiede anche `consumer.complete`, `docsScanComplete`,
assenza di `requiresBootstrap`, identità e protocollo validi e concordanza
fra revisione/cursore correnti e checkpoint. Metadati, corpi necessari,
record comuni, bozze e outbox provengono da una sola transazione readonly.
Si richiedono entrambe le impostazioni applicative prima di applicare la
vista, evitando un ripristino con privacy di default al posto di quella
conservata. Un corpo mancante o con versione diversa è un errore; soltanto
un puntatore canonico esplicitamente null rappresenta un corpo vuoto.

Le revisioni delle sole bozze possono avanzare il checkpoint senza cambiare
la fotografia remota. Le scritture remote invalidano invece il checkpoint
prima della RPC e al termine, anche dopo errori o risposte incerte. Aumentano
la revisione, così una sincronizzazione concorrente non può ripubblicare
silenziosamente una lettura precedente alla scrittura. Nessuna applicazione
della copia avviene mentre tali RPC sono in corso. Una nuova sincronizzazione
riuscita può pubblicare il checkpoint successivo.

Gli aggiornamenti del feed conservano la copertura acquisita dalla snapshot.
Se il recupero di un corpo fallisce dopo l'avanzamento del cursore, la nuova
revisione non coincide col vecchio checkpoint: il bootstrap della vista viene
rifiutato fino al recupero. La vista già aperta e le sue bozze restano disponibili.

Il primo incremento manteneva IndexedDB v9. Il seguito aggiunge gli
indici v10/v11 senza cancellare lo storage per migrare e non si trasformano i vecchi descrittori di pagina in prove complete.
Letture tardive vengono scartate dopo cambio di vista, periodo, sessione,
repository, scope o consenso.

## Correzione del paging snapshot

La fine di una raccolta su più pagine non azzerava `afterId`. Il consumer
richiedeva nuovamente l'ultima pagina e falliva sul duplicato invece di
terminare. Ora azzera il cursore locale solo dopo una pagina finale con
`nextAfter: null`; i controlli su duplicati, conteggi e avanzamento restano.

## Verifica locale

`npm run test:local-bootstrap`, incluso anche in `test:repository`, usa
Chromium con profilo persistente e un database dedicato con dati inventati.
Crea la copia tramite il consumer reale, con tre pagine Entries e tutte le
raccolte, chiude il browser e lo riapre. Verifica:

- Nessuna voce visibile prima della conferma dell'identità.
- Nessuna RPC getState/getJournalPage per aprire la copia completa.
- Obiettivi e impostazioni ripristinati, tag privati personalizzati nascosti,
  corpo vuoto esplicito e cancellazione pending non resuscitata.
- Una sola transazione readonly su sei store per la fotografia della vista.
- Errore remoto dopo l'apertura senza perdere testo, focus o selezione.
- Delta con tombstone e recupero corpi interrotto: nessun checkpoint leggibile
  fino al retry riuscito, mantenendo editor e versione originale della bozza.
- Bozza della sessione salvata prima della chiusura, ripristinata dopo la
  migrazione; salvataggio nella coda locale con la versione originaria.
- Aggiorna attraverso il consumer, navigazione a un mese vuoto e Task locali;
  una lettura locale sospesa dopo cambio mese non avvia una RPC obsoleta.
- Invalidazione del checkpoint durante una mutazione via il vero wrapper API,
  anche se il backend Demo rifiuta una versione obsoleta.

Verifiche superate il 5 novembre: build, npm test, test:local-bootstrap,
test:repository, test:sync-consumer, test:release, test:local-pages,
test:local-common, test:progressive, test:diary-goals, test:tracing,
verify-session-draft-migration, P70 privacy, P64 bozze/layout, P60.1 bootstrap
UTF-8, P59 build e `git diff --check`. Index e Demo rigenerati; preservati
il segnaposto ROOT_FOLDER_ID e lo staging di esattamente sei file.

## Confini

È il bootstrap dei dati del diario nell'interfaccia già caricata. Non aggiunge
una PWA, un service worker o un'applicazione HTML caricabile senza Google;
l'identità deve ancora essere verificata a ogni avvio. Le altre mutazioni
applicative conservano i rispettivi contratti: non si estende l'outbox a
riflessioni, cataloghi o impostazioni. Il seguito [con indici per vista](VERIFICA-BOOTSTRAP-INDICI.md) limita
i metadati letti al mese e ai Task globali. Il seguito
[dei record comuni per periodo](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md) limita
anche lo storico mensile e dichiara la copertura. La vista Task mantiene
i dati comuni completi. Le bozze restano enumerate per scope; il seguito
[outbox attiva](VERIFICA-BOOTSTRAP-OUTBOX-ATTIVA.md) evita di caricare
lo storico delle operazioni confermate o superate.
Non è dimostrata la scalabilità per qualunque distribuzione dei Task.

Le capability reali rimangono disattivate. Matrice completa delle mutazioni,
provisioning, iframe Google, retention e collaudo autenticato restano gate
separati. Nessun deploy, setupDrive o accesso ai dati reali.

## Pianificazione dei task fuori mese — 5 novembre 2026

La ricostruzione di `taskPlans` usa ora tutti i metadati task della fotografia
atomica, anziché le sole voci selezionate per il mese visualizzato. Prima,
aprire il diario mensile eliminava dalla vista comune le pianificazioni dei
task annotati negli altri mesi, pur dichiarando copertura completa. Non
servono corpi aggiuntivi né nuove RPC.

Il test Chromium riproduceva il difetto prima della correzione. Ora verifica
dopo il riavvio un task annotato nel mese precedente ma pianificato oggi,
con orario e importanza conservati; passando a un mese vuoto, la pianificazione
resta disponibile e il task eliminato dal feed resta assente.

Build, test:local-bootstrap e test:release superati. Nessun deploy o accesso
ai dati reali; restano i confini sperimentali descritti sopra.

La scalabilità della lettura atomica è ora misurata separatamente: vedere
[benchmark 10.000/50.000 voci](VERIFICA-BOOTSTRAP-SCALA.md). La baseline precedente agli indici non
chiude il criterio di apertura end-to-end; a 50.000 voci il repository da
solo superava il budget di 500 ms. Le misure del seguito sono nella
[verifica degli indici](VERIFICA-BOOTSTRAP-INDICI.md).
