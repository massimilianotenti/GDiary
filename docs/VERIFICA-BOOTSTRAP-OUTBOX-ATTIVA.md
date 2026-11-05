# Bootstrap con la sola outbox attiva — 5 novembre 2026

## Incremento implementato

`readBootstrapView` ora legge soltanto operazioni pending, sending, conflict
e failed, usando quattro intervalli sull'indice esistente byScopeStatus.
Non enumera lo storico acked/superseded per poi filtrarlo nella shell.
La proprietà operations della fotografia contiene quindi la sola coda attiva.
Si conserva l'ordine per operationId della precedente lettura per scope;
la shell mantiene il proprio ordinamento cronologico prima dell'applicazione.

Gli intervalli includono tutte le chiavi del singolo stato, senza introdurre
un limite di lotto, una scadenza, un filtro su nextAttemptAt o un limite
sull'identità dell'operazione. Comprendono quindi invii in corso, tentativi
rinviati, conflitti ed errori che devono restare visibili e recuperabili.

Le quattro query rimangono nella stessa transazione readonly di checkpoint,
metadati, corpi, record comuni e bozze. Non possono osservare versioni diverse
della coda tra uno stato e l'altro. Il consenso e lo scope vengono verificati
anche nei callback delle richieste, come per le altre letture del repository.

Non cambia IndexedDB v11, né il formato di store, operazioni o checkpoint.
Non vengono modificati dispatcher, lease, baseline o gestione degli ACK.
Le ricevute storiche restano memorizzate e accessibili per operationId per
replay, riconciliazione e dipendenze. Non è una cancellazione dello storico
né una politica di retention. Non richiede nuove capability o migrazioni.

## Verifica funzionale

`verify-local-bootstrap-outbox.cjs` è incluso in test:local-bootstrap e
in test:repository. Usa Chromium/IndexedDB e dati inventati su Demo.html:

- 1.000 operazioni storiche acked/superseded e quattro attive, con verifica
  delle quattro letture indicizzate nella singola transazione readonly.
- Payload rich, dipendenze e lease identici; timestamp zero e massimo safe,
  ID Unicode, stato dal nome simile e isolamento per archivio/principale/epoca.
- Una dipendenza su un ACK storico continua a permettere il claim del pending.
- Passaggio pending→sending→acked, baseline della bozza aggiornata senza perdita
  di testo e retry failed→pending visibile una sola volta nel nuovo stato.
- ACK/retry concorrenti durante le query: la fotografia in corso conserva tutti
  gli stati precedenti, quella successiva applica le nuove versioni senza duplicati.
- Revoca del consenso annulla l'intera lettura; le ricevute restano disponibili.

Le altre prove bootstrap/repository continuano a coprire riavvio, privacy,
bozze, selezione/focus, baseline originale, tombstone e risposte tardive.

## Benchmark con storico delle ricevute

Esteso test:local-bootstrap-scale: oltre alle 10.000/50.000 voci e ai
1.000/5.000 HabitLogs, ogni database conserva 10.000/50.000 ricevute terminali
con payload sintetico e quattro operazioni attive. Le ricevute vengono
preparate tramite IndexedDB nativo, senza eseguire dispatcher, RPC o commit
remoti. Questa parte della fixture verifica letture e volume, non il protocollo
completo di produzione delle ricevute, coperto dalle suite funzionali.

Ogni scenario esclude la prima lettura e misura altre 30 ripetizioni.
Linux x64, Node 24.20.0, Chromium headless 156.0.8078.4, Core i7-1370P,
20 CPU logiche, circa 15,3 GiB RAM. Carico hardware non isolato: altre suite
sono state eseguite in parallelo. Nessun confronto A/B alternato.

| Voci | Ricevute storiche | Vista | Operazioni trasferite | p50 ms | p95 ms |
|---:|---:|---|---:|---:|---:|
| 10.000 | 10.000 | Mese | 4 | 13 | 20 |
| 10.000 | 10.000 | Mese vuoto | 4 | 6 | 8 |
| 10.000 | 10.000 | Task | 4 | 35 | 41 |
| 50.000 | 50.000 | Mese | 4 | 44 | 65 |
| 50.000 | 50.000 | Mese vuoto | 4 | 28 | 37 |
| 50.000 | 50.000 | Task | 4 | 161 | 226 |

Il test conta anche le righe restituite dalle richieste IndexedDB all'outbox:
sono quattro, non soltanto quattro elementi dopo un filtro JavaScript di
50.004 righe. Verifica stati, numero delle query, transazione, corpi e copertura
comune, quindi una regressione all'enumerazione dello storico fa fallire il test.
Alla fine verifica che una ricevuta storica sia ancora leggibile con la sua
versione; la prova funzionale verifica anche le dipendenze vere del dispatcher.

Preparazione totale circa 8,2/48,6 secondi, dei quali 2,6/16,4 per l'outbox.
Volume serializzato del seed circa 18,1/91,5 MB, di cui 9,7/48,8 MB di outbox:
non è lo spazio fisico del database. Il report JSON in artifacts conserva
campioni, ambiente e conteggi, è escluso da Git e non contiene dati reali.
La [baseline precedente](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md) non includeva
questo storico: non si deduce dai tempi una percentuale causale di miglioramento.
La riduzione da tutto lo storico alla coda attiva è invece verificata dai conteggi.

## Verifiche e limiti

Superati build, test:repository, test:release, test:local-bootstrap (le prove
incluse nel repository), test:local-bootstrap-scale, P59 build, P60.1 UTF-8
e P70 privacy. Sintassi e git diff --check verificati.
Anche la suite npm test generale è conclusa senza errori.

L'ottimizzazione riguarda la lettura della fotografia, non tutte le operazioni
sullo storico dell'outbox. Il costo resta proporzionale al lavoro attivo, alle
bozze e agli altri dati richiesti: non pone un tetto o elimina elementi per
rientrare in un budget. Le bozze sono ancora lette per scope e la vista Task
conserva i dati comuni completi. Le misure escludono identità, consumer, rete,
merge shell, DOM e paint, quindi non chiudono il criterio end-to-end SPEC-004.

Index e Demo rigenerati, bootstrap UTF-8, segnaposto ROOT_FOLDER_ID e staging
di sei file conservati. Capability reali disattivate. Nessun deploy,
setupDrive, accesso ai dati reali o pulizia delle ricevute esistenti.
