# Consumer locale di snapshot e feed — 29 ottobre 2026

## Cambio associazione di un allegato — 30 ottobre

Un upsert `files` rilegge l'associazione memorizzata e aggiorna l'indice di ricerca per entrambe le voci interessate. Il test usa IndexedDB e un feed sintetico che riassocia un ID allegato: il titolo scompare dalla prima voce ed è ricercabile sulla seconda. Build, test:sync-consumer, test:repository e test:release superati. È un comportamento difensivo del consumer, non una nuova API di spostamento né un collaudo Google.

## API generiche delle bozze — 30 ottobre

`putDraft` e `deleteDraft` invalidano nella stessa transazione la revisione della ricerca per bozze `note` e `task`. Gli altri tipi non entrano nell'indice e non provocano questa invalidazione. Una prova Chromium con IndexedDB fa intervenire sia una scrittura sia una cancellazione durante il checkpoint: il sync rifiuta la revisione concorrente e al tentativo successivo la ricerca riflette la bozza aggiunta o rimossa. Una prova di quota verifica il rollback congiunto di bozza e metadati. Build, test:sync-consumer, test:repository, test:local-common, test di migrazione bozze e test:release superati; nessun collaudo Google.

## Scritture concorrenti durante il delta — 30 ottobre

L'indice fresco iniziale, il feed applicato, i lotti di idratazione e la pubblicazione del delta condividono una sequenza verificata di revisioni. Una revisione inattesa interrompe il sync con `ConflictError`; i metodi di persistenza usano la revisione acquisita prima di raccogliere il delta invece di adottarne una nuova dopo la raccolta. Anche `refreshDraft` vincola il proprio delta alla revisione iniziale. Il test Chromium/IndexedDB accoda una bozza durante la lettura del checkpoint e verifica che la revisione non venga dichiarata indicizzata e che il sync successivo ricostruisca l'indice includendo la bozza. Build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. Il caso verificato usa `saveLocalOperation`, che invalida la revisione; le API generiche `putDraft`/`deleteDraft` non hanno lo stesso contratto e richiedono valutazione separata. Nessun collaudo Google.

## Recupero corpi e revisioni locali — 30 ottobre

Il primo sync dell'istanza controlla ancora i corpi canonici mancanti nell'intero archivio, per recuperare interruzioni precedenti. I successivi sync con revisione locale invariata controllano solo le voci toccate dal feed; una diversa revisione, un errore durante feed/idratazione o una scrittura concorrente riattivano il controllo completo. La revisione verificata vive solo in memoria e non certifica la persistenza dopo una riapertura. Se non ci sono voci toccate si evitano anche le letture di cataloghi, bozze e coda normalmente usate per il delta dell'indice. Chromium con IndexedDB verifica un tick invariato senza scansione, modifica esterna e ripresa dopo errore durante `getContentsBatch`. Build, test:sync-consumer, test:repository e test:release superati. La scansione iniziale e quelle dopo modifiche esterne rimangono proporzionali all'archivio; nessuna misura cloud.

## Implementazione locale

`createSyncConsumer` acquisisce il checkpoint iniziale, percorre per keyset le
10 raccolte esposte da `getSnapshotPage`, recupera i corpi canonici con
`getContentsBatch` e rigioca i commit consecutivi di `getChanges` fino a un
checkpoint finale. Ogni commit avanza il cursore nello stesso batch
transazionale dei record applicabili. Le versioni `commit-N` sono confrontate
numericamente; righe e cancellazioni del feed più vecchie dei record già letti
nella snapshot non li sovrascrivono. Le impostazioni sono limitate a privacy e
riflessione; le impostazioni di routing vengono usate solo per sovrapporre
puntatori contenuto e layout. Il consumer rifiuta scope incoerenti, pagine
malformate, buchi di sequenza e corpi con digest/versione non corrispondenti.
`scanLegacyBodies()` scorre i mesi con `getJournalPage` e applica in batch i
metadati e i corpi delle Entries legacy con versione associata. Ritorna copertura
esplicita; non promuove una raccolta legacy a sincronizzata dal feed.

Il repository locale conserva i checkpoint scoped e le raccolte Settings e
Layouts. Test browser sintetici coprono pagine, Files, impostazioni, layout,
idratazione Docs canonica, replay ordinato, snapshot più recente del checkpoint
iniziale, buco nel feed senza avanzamento cursore e opt-in. La capability resta
spenta: l'API reale `getSyncManifest` non pubblica ancora `localReadCache` né
`changes`, e l'identità corrente mantiene `cacheReady:false`.
Gate superati: `npm run build`, `npm run test:sync-consumer`, `npm run
test:repository`, `npm test`, `npm run test:release`, `npm run test:e2e` e
`git diff --check`.

## Lavoro ancora necessario

- Gli Entry legacy non hanno un puntatore `DocContent`: la scansione è
  invocabile esplicitamente, ma non è ancora pianificata dal client. Una
  raccolta mista legacy/canonica resta incompleta per il feed anche dopo
  averne letti i corpi.
- Il consumer dispone ora di uno scheduler per bootstrap/sync incrementale,
  ma la UI non lo avvia ancora. Vedi [verifica scheduler](VERIFICA-SCHEDULER-SYNC.md).
- Le viste applicative non leggono ancora dal consumer/repository e non vengono
  riaperte dal checkpoint locale.
- Files e Layouts ricostruiscono la raccolta leggendo tutte le Entries; manca
  una lettura scalabile dedicata.
- Restano il collaudo dell'iframe Apps Script e la matrice reale di persistenza
  IndexedDB prima di considerare l'attivazione.

Il test usa esclusivamente archivio, identità e dati sintetici nel browser
locale. Nessuna RPC Google, attivazione, migrazione reale o deploy.
