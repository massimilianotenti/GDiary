# Indice locale di ricerca — incremento parziale SPEC-004, pacchetto 10

## Visualizzazione delle bozze nei risultati — 30 ottobre

La UI usa tag, progetti, stato, date operative e rich text della bozza quando sono presenti, lasciando separato l'oggetto remoto nell'indice. Per task con bozza o operazione locale, la checkbox non invia `setTaskStatus`: è disabilitata e indica di aprire il diario. Il test Chromium verifica metadati della bozza, checkbox e assenza di RPC anche con un evento sintetico. Build, test:repository, test:sync-consumer e test:release superati; nessun collaudo Google.

## Progetti scelti nelle bozze — 30 ottobre

I documenti includono gli slug dei progetti della bozza e i nomi risolti sia per la copia remota sia per la bozza, senza sostituire la metadata remota. Anche la mappa progetto→voci considera entrambe le versioni, così il cambio del nome aggiorna una voce che collega quel progetto soltanto localmente. Il formato persistito `searchVersion: 3` forza la ricostruzione dei precedenti documenti v2; non cambia la versione IndexedDB né elimina bozze o outbox. Test unitari e Chromium/IndexedDB verificano slug, nome, rinomina via feed, rimozione e migrazione del marker v2; build, test:local-search, test:local-search-persistence, test:sync-consumer, test:repository e test:release superati. Il server Google non è collaudato.

## Delta dei nomi progetto — 30 ottobre

L'indice n-gramma mantiene in memoria anche la mappa dai singoli slug agli ID delle voci indicizzate. Upsert, rimozione e restore la aggiornano insieme ai documenti, senza nuovi dati persistiti o versione IndexedDB. Il consumer chiede al worker gli ID coinvolti dai progetti cambiati e li unisce alle voci già toccate dal feed; l'idratazione iniziale e il rebuild continuano a leggere l'archivio. Un test Chromium con feed simulato verifica che la rinomina aggiorni i risultati senza `listEntries`; i test unitari coprono modifica/rimozione/ripristino dei collegamenti. Build, test:local-search, test:sync-consumer, test:repository, test:local-search-scale e test:release superati. Su fixture sintetiche Node locali: 10.000 documenti 233 ms e 48,68 MB; 50.000 1.378 ms e 181 MB dopo GC, senza soglia né misura Google.

## Delta per voce e indice allegati — 30 ottobre

IndexedDB v8 aggiunge `byCollectionEntry` su archivio/principal/epoca/collezione/`data.entryId`; l'upgrade indicizza anche i file esistenti senza riscriverli. Il refresh di ciascuna voce consulta direttamente contenuto, allegati, bozze note/task, sole operazioni attive della voce e progetti citati. Le richieste sono raggruppate al massimo 25 voci, con cache temporanea dei nomi progetto. La scansione completa rimane per rebuild e per individuare le voci collegate a un progetto cambiato. Test Chromium verifica allegati cercabili, assenza delle letture globali durante `refreshDraft`, upgrade da v2 e v6, scope e conservazione dati; build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. Non è un benchmark Google; un client precedente rifiuta la versione superiore del database senza cancellarla.

## Risultati tardivi nella UI — 30 ottobre

La UI associa la ricerca al consumer, alla navigazione, al consenso e allo scope verificato iniziali; anche il cambio della visibilità privacy invalida la richiesta pendente. Una risposta o un errore superati non ridisegnano la schermata; i controlli vengono riabilitati. `tests/verify-local-search-ui-races.cjs`, incluso in `test:repository`, sospende il consumer simulato e verifica chiusura privacy, revoca e cambio principal, più il caso valido. Build, test:repository, test:sync-consumer e test:release superati; l'iframe Google non è collaudato.

## Normalizzazione tag privati — 30 ottobre

Il filtro nel fallback senza worker e nel percorso con callback di visibilità sostituisce correttamente gli spazi nei tag con trattini, in accordo con il worker. Chromium con IndexedDB verifica che una bozza con tag `tag privato` sia esclusa quando `tag-privato` è privato, per worker, callback e fallback. Build, test:sync-consumer, test:identity, test:local-search e test:release superati. Nessun collaudo dell'iframe Google.

## Privacy e ricerca concorrente — 30 ottobre

Il consumer verifica la revisione e il marker `fresh` prima e dopo il filtro privacy e ricontrolla anche versioni di schema e protocollo dello scope. Se l'indice viene invalidato mentre la query è in corso, restituisce `ConflictError` invece dei risultati precedenti; la richiesta successiva ripristina o ricostruisce l'indice. Il test Chromium modifica i tag di una bozza in privata durante la lettura delle impostazioni, verifica il rifiuto della prima query e l'esclusione alla successiva. Build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. Il caso è locale e non convalida l'iframe Google.

## Scrittori concorrenti — 30 ottobre

Le transazioni di ricostruzione e delta portano un token scoped nell'indice: un nuovo delta non può subentrare a un lavoro incompleto, mentre una ricostruzione completa può sostituirlo e ripartire dai dati sorgente. Le scritture e la pubblicazione controllano token e revisione; un consumer superato scarta il proprio indice in memoria e può ripristinare quello pubblicato. Un'interruzione lascia il marker non fresco e la successiva ricostruzione completa può riprendere. Test Chromium con IndexedDB verifica takeover, fencing anche dopo pubblicazione e due consumer sovrapposti. Build, test:sync-consumer, test:local-search-persistence, test:repository e test:release superati. Client di versioni precedenti che non applicano il token non sono coordinati da questa modifica; serve un contratto di compatibilità prima di abilitare la capability in produzione.

`createLocalSearchIndex` mantiene una mappa n-gramma in memoria per testo
concatenato di titolo, corpo, tag, progetti, date e titoli degli allegati.
L'indice produce candidati; ogni risultato è poi verificato con `includes`,
così accenti, punteggiatura e sottostringhe parziali mantengono la semantica
della ricerca esistente. Query di uno o due caratteri usano una scansione
completa per non perdere corrispondenze.

L'API aggiorna o rimuove record per ID, rifiuta versioni più vecchie rispetto
al record indicizzato, applica un filtro di visibilità prima di esporre i
risultati e riporta copertura e freschezza separatamente dai risultati. Un
indice incompleto non dichiara che un risultato vuoto valga per tutto
l'archivio.

Il repository IndexedDB v5 conserva i documenti di ricerca e il marker
`complete/fresh/revision/cursor/searchVersion`. La ricerca persistita scansiona
solo i documenti dello scope verificato e confronta il testo esatto. L'indice
n-gramma del worker continua a servire le query UI in memoria. L'upgrade v1/v2/v3/v4
conserva i record; elimina lo store v3 `searchPostings` e marker privi di
`searchVersion: 2` provocano un rebuild prima della ricerca locale. Il consumer
genera documenti durante il bootstrap e aggiorna per ID le voci, gli allegati e
i progetti interessati dal feed. Le
bozze locali note/task vengono sovrapposte ai soli campi di ricerca, mantenendo
inalterata la copia remota; `baseVersion` diversa dalla versione Entry corrente
marca la bozza come in conflitto. La ricerca applica anche i tag privati sia
della copia remota sia della bozza.

La UI espone l'attivazione esplicita della copia browser solo dopo verifica
dell'identità e dopo che il manifest dichiara sia lettura locale sia feed. La
copia non è cifrata dall'app; la disattivazione ferma il sync e cancella la
cache remota senza eliminare bozze locali. La ricerca nei dati scaricati mostra
copertura/freschezza e mantiene un'azione separata per la ricerca online. Con il
manifest Demo corrente le capability sono disattivate: il test browser verifica
che la UI non apra IndexedDB né scarichi dati. Il flusso attivo con capability
abilitate resta da convalidare contro un server staging autorizzato.
L'importo dei corpi Docs legacy ricostruisce l'indice dopo la scansione.
Ogni batch remoto invalida `fresh` nella stessa transazione che avanza la
revisione locale; il consumer lo ripristina solo dopo aver applicato tutti gli
aggiornamenti e verificato revisione, cursore e conteggio.

`tests/verify-local-search-index.cjs` confronta il risultato n-gramma con la
scansione esatta su 2.500 record e verifica corpo, metadati, allegati, progetti,
accenti, punteggiatura, query brevi, stale update, aggiornamenti Docs simulati,
tombstone, filtro visibilità e copertura parziale.
`tests/verify-local-search-persistence.cjs` verifica upgrade IndexedDB v1/v2→v4,
riapertura, lookup per scope, inserimento/sostituzione/rimozione documenti,
marker, CAS, invalidazione feed e reset.
`tests/verify-sync-consumer.cjs` verifica bootstrap,
aggiornamento incrementale, scansione legacy e ricerca risultante.
`tests/verify-session-draft-migration.cjs` verifica la migrazione dalla chiave
`bullet-v3` di sessionStorage a IndexedDB al consenso, il ripristino alla
riattivazione, la rimozione della copia di sessione solo dopo bootstrap,
aggiornamenti CAS, conflitto tra schede senza perdita/sovrascrittura e
conservazione dopo la pulizia della sola cache remota.
Il consumer incorpora il sorgente del modulo indice in un Web Worker module
creato da Blob, senza asset esterni. Il worker esegue restore, update, lookup e
ricerca; il rebuild invia gruppi da 100 documenti, persiste i risultati di ogni
gruppo e cede il thread UI tra i gruppi, ricontrollando identità e capability.
Se il browser non espone Worker/Blob o la costruzione fallisce, usa l'indice
locale in main thread. Se il worker cade dopo essere diventato attivo, la
richiesta fallisce in modo esplicito invece di consultare una copia in memoria
obsoleta. Il test browser del consumer verifica Worker attivo su 201 Entries,
yield tra i batch, query/privacy e fallback con Worker assente.
`tests/verify-local-search-scale.cjs` crea fixture sintetiche da 10.000 e
50.000 voci, controlla il risultato esatto di una query selettiva e misura il
tempo di costruzione/query e heap Node dopo GC esplicita, mantenendo vivo l'indice.
Nell'esecuzione completa del 29 ottobre 2026: 10.000 voci in 219 ms e 48,67 MB;
50.000 in 1.180 ms e 180,99 MB; la query selettiva è risultata inferiore alla
risoluzione di 1 ms del timer. Sono misure indicative di questa macchina: non
includono IndexedDB, serializzazione o il costo dell'iframe e non costituiscono
soglie di prestazione.

## Limiti

- La ricerca persistita di verifica fa una scansione lineare dei documenti
  nello scope. La UI non invoca questa scansione: dopo bootstrap/sync consulta
  l'indice n-gramma in memoria nel worker; il test consumer intercetta l'API e
  verifica zero scansioni IndexedDB per query interattiva.
- Il benchmark `test:local-search-storage` popola 10.000 documenti sintetici
  ripetuti nello store di produzione e usa `navigator.storage.estimate()`:
  schema v3 con posting: 345,33 MB e 1.044.534 ms. Schema v4: a 10.000,
  4,73 MB e 740–745 ms; a 50.000, 16,84–17,63 MB stimati e 3.801–3.870 ms
  totali. La scansione IndexedDB ha richiesto 216–219 ms su 10k e circa
  1.046 ms su 50k. Stime specifiche di Chromium/macchina, non soglie; testi
  sintetici ripetuti, non dati reali né quota effettiva del deployment.
- Il flusso UI è opt-in e capability-gated; non è abilitato nel manifest
  corrente, e non è ancora stato convalidato contro staging.
- Le bozze UI si copiano nel repository scoped soltanto quando l'utente attiva
  la copia locale, dato che prima non esiste un'identità archivio verificata.
  Se bootstrap/scrittura falliscono la copia sessione resta disponibile. La
  capability reale è ancora spenta; non esiste invio outbox.
- Il worker Blob module è stato provato in Chromium e nel bundle incorporato,
  ma la CSP dell'iframe Apps Script va ancora verificata nello staging reale;
  in caso di blocco iniziale è previsto il fallback sincrono. Un batch da 100
  resta il limite del lavoro continuo nel worker. La misura heap Node è solo
  indicativa e non misura il footprint browser/IndexedDB.

Verifiche: `npm run build`, benchmark browser, test mirati di indice,
persistenza e consumer, `npm run test:release`, `npm run test:e2e` e
`git diff --check` passati; `test:e2e` include anche la migrazione bozze.
Tutti i componenti della suite `npm test` sono stati
eseguiti con esito positivo; il comando aggregato non ha restituito un codice
finale in questa sessione. Il test lungo Project→tag (792 recuperi da fault) è
stato completato separatamente con esito positivo.

Le bozze note/task senza voce remota entrano nell’indice e sono ricostruite dopo la riapertura; le transazioni outbox invalidano l’indice con revisione atomica. Test Chromium, build, test:sync-consumer, test:repository, test:local-search, test:local-search-persistence e test:release superati. La rappresentazione delle cancellazioni locali e il collaudo Google restano da verificare.

Una cancellazione locale in attesa è esclusa dalla ricerca; in caso di conflitto o errore la voce rimane disponibile per il recupero. Test Chromium con IndexedDB e server simulato, build, test:sync-consumer, test:repository, test:local-search, test:local-search-persistence e test:release superati. Collaudo Google ancora aperto.

Una cancellazione confermata resta esclusa dalla ricerca prima dell’arrivo del feed remoto, mentre un conflitto resta visibile. Test Chromium con IndexedDB, build, test:sync-consumer, test:repository, test:local-search e test:release superati.

Le voci presenti solo nel dispositivo si aprono dai risultati leggendo IndexedDB e senza RPC Google; il dettaglio rimanda al diario. Build, test:repository, test:sync-consumer e test:release superati con prova browser.

I pulsanti della ricerca aprono la bozza locale anche per voci remote e anche se il risultato non è nello stato della vista. Test browser sui pulsanti, build, test:repository, test:sync-consumer e test:release superati.
