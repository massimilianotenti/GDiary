# SPEC-004 — Avvio dello sviluppo: tracing e prova IndexedDB

Seguito locale: il [raggruppamento delle letture Entries](VERIFICA-LETTURE-ENTRIES-BATCH.md)
riduce le chiamate del percorso frammentato osservato qui. I valori riportati
in questa prima verifica restano la baseline precedente alla modifica.

Data: 27 ottobre 2026. Stato: implementazione locale della prima tranche;
nessun deployment, accesso all'archivio reale o modifica ai salvataggi.

## Modifiche realizzate

`locked_` conserva acquisizione, timeout, blocco globale e ordinamento
flush/rilascio. Il tracing aggiunge:

- `lockWaitMs/Calls/SelfMs`: durata dell'acquisizione, anche quando fallisce;
- `lockHeldMs/Calls/SelfMs`: durata dopo acquisizione, fino al rilascio incluso;
- tentativi foreground/background, acquisizioni, busy ed errori di acquisizione;
- `sheetReadMs/Calls/SelfMs` e conteggi delle richieste, righe e celle restituite
  da `readSheetValues_`, incluso il secondo accesso necessario per valori Date.

Il formato export resta `gdiary-performance-trace/v1`, measurementVersion 3.
`lockMs` conserva il significato precedente di acquisizione. I `lockWaitMs`
negli eventi RPC tracciati ora provengono dal wrapper diagnostico: possono
differire dai vecchi tempi applicativi calcolati prima dell'ingresso nel lock.
`lockAcquireErrors` conta eccezioni di acquisizione, non solo timeout accertati.
I contatori Sheets coprono il lettore strumentato, non tutti gli accessi diretti,
TextFinder o il numero di round trip effettivi dopo le cache della piattaforma.
Le durate sono inclusive; sommare solo SelfMs distinti e unaccountedMs.

Il nuovo modulo `frontend/storage-probe.js`, compilato nel bundle esistente,
espone una prova manuale in Impostazioni → Diagnostica prestazioni, dopo
l'attivazione del tracing. Non apre il DB automaticamente, non invoca API
Google e conserva soltanto marcatori costanti inventati nel DB separato
`gdiary-storage-probe-v1`.

La prova verifica testo UTF-8, due namespace sintetici, rollback dopo il successo
di una singola richiesta e successiva riapertura del DB. Conferma le transazioni
su `complete`, non sul successo del `put`. Un marcatore resta per la verifica
dopo riavvio browser; «Cancella dati di prova» elimina solo questo database.
`previousMarker` indica se ritrova una prova precedente nella stessa origine.
I risultati restano in memoria e sono esportabili: soltanto flag, durata ed
errori da elenco fisso, senza origine, URL, ID, marcatori o messaggi grezzi.

La richiesta di conservazione è un comando separato e riguarda l'origine;
non viene eseguita con la prova. Mancanza/rifiuto del supporto non compromette
il normale diario. Sono previsti timeout, chiusura delle connessioni arrivate
in ritardo e rifiuto di prove sovrapposte nella stessa istanza.

## Baseline sintetica

`tests/helpers/synthetic-archive.cjs` genera metadati deterministici, TaskPlans,
layout, anni di Days/Weeks/HabitLogs e frammenti DocContent con rich text,
Unicode, testi lunghi e versioni. Nessuna importazione di dati personali.

`npm run test:scale` verifica 499/500/501/1.000/10.000/50.000 voci, due pagine
Task, identità dei task attivi, collezioni comuni e 1/10/100 versioni per dieci
voci. Produce `artifacts/scale-baseline.json`, escluso da Git. È un benchmark
del backend simulato: i tempi non sono previsioni della latenza Google.

Prime misure, prima di ottimizzazioni della lettura:

| Voci | Task totali | Richieste del lettore per pagina Task | Celle del lettore per pagina Task |
|---:|---:|---:|---:|
| 499 | 100 | 5 | 8.612 |
| 500 | 100 | 5 | 8.628 |
| 501 | 101 | 205 | 3.450 |
| 1.000 | 200 | 403 | 6.828 |
| 10.000 | 2.000 | 4.003 | 68.028 |
| 50.000 | 10.000 | 20.003 | 340.028 |

I valori sono uguali per la prima e la seconda pagina: paginare 25 risultati
non evita di ricostruire tutti i candidati. I task sono distribuiti ogni cinque
righe e soltanto uno ogni cinquanta record è attivo. Sopra 500 voci,
`entrySearch_` legge separatamente i gruppi dei risultati trovati da TextFinder:
in questo caso ogni task genera due letture. Non sono 20.003 RPC browser;
sono invocazioni del lettore all'interno di una RPC, che Google può in parte
servire tramite proprie cache. Il salto è un rischio strutturale verificato,
non una misura di 20.003 round trip di rete.

Per dieci contenuti richiesti con 1/10/100 revisioni, la ricerca DocContent
scansiona 32/140/1.220 righe e legge 36/360/3.600 celle di intestazione;
le celle payload rimangono 12 grazie alla selezione della versione corrente.
Confermata equivalenza di corpi e rich text. Un indice corrente può ridurre
la crescita dei costi di ricerca/intestazioni senza eliminare lo storico.

## Verifiche e limiti

Test dedicati:

- `test:locks`: clock controllato, attesa 120 ms, durata occupazione 50 ms,
  flush incluso; successo/errori corpo e flush, timeout acquisizione,
  read-only, busy background, rilascio e partizione esclusiva dei tempi.
- `test:storage`: Chromium con profilo temporaneo su origine HTTP locale,
  DB assente fino al comando, isolamento/rollback, riavvio del browser,
  iframe locale, export, pulizia e assenza di RPC/mutazioni del diario.
  Simulati accesso negato, quota, apertura bloccata con connessione tardiva,
  prova concorrente e richiesta persistenza rifiutata.
- `test:scale`: scenari sopra descritti, senza Google.

Superati build, npm test, test:locks, test:storage, test:scale, test:tracing,
test:release, test:progressive e test:incremental. Nessuna dipendenza aggiunta.
Il test iframe locale non dimostra il comportamento del dominio Google,
del partizionamento cross-site, degli aggiornamenti deployment o di Safari e
Firefox. Non è dimostrata persistenza applicativa né protezione da eviction,
cancellazione manuale o crash del sistema operativo.

## Identità dell'archivio: contratto prima della cache applicativa

Il prototipo usa due namespace inventati, non ricava un'identità da path o
da dati reali. Prima della fase 3, il server dovrà restituire un manifest con
`archiveId`, ambito del principale autorizzato, epoca e versione protocollo.
Il client può aprire la copia applicativa solo dopo aver verificato l'ambito.

L'identità deve restare stabile cambiando versione/URL del deployment e cambiare
quando si seleziona un archivio diverso. Separare archivio e principale:
il solo utente effettivo di esecuzione non identifica necessariamente chi
visita una web app. Non usare email o ID Drive negli export né creare un
namespace comune se l'identità autenticata non è disponibile.

Il seguito [identità archivio](VERIFICA-IDENTITA-ARCHIVIO.md) implementa ora
il contratto e i test locali separati. Il comportamento nel deployment Google
supportato rimane da verificare; nessun dato applicativo è conservato nel browser.

## Prossime attività

1. Collaudo della prova su vero iframe con dati fittizi, dopo una pubblicazione
   esplicitamente richiesta; riavvio browser, update deployment, desktop/mobile.
2. Letture Task con costo limitato e separazione metadati/corpi, usando la nuova
   baseline per verificare l'eliminazione delle letture frammentate.
3. Disegno e test del worker Docs prima di modificare i lock; mantenere controlli
   di appartenenza e conflitto.
4. Manifest dell'identità e repository applicativo solo dopo la validazione
   della persistenza; nessuna outbox o modalità offline attivata in questa tranche.

Riferimenti tecnici: [Lock Apps Script](https://developers.google.com/apps-script/reference/lock/lock),
[transazioni IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).
