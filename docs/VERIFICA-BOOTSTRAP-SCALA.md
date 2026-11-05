# Scalabilità del bootstrap locale — 5 novembre 2026

## Incremento implementato

Aggiunto `npm run test:local-bootstrap-scale`: benchmark Chromium ripetibile
su Demo.html e repository reale IndexedDB, con profilo temporaneo e HTTPS
bloccato. Nessuna connessione a Google, capability reale o scrittura al diario.
La fixture viene preparata tramite batch pubblici di al massimo 400 record;
il report rimane in `artifacts/local-bootstrap-scale.json`, escluso da Git.

Due archivi sintetici da 10.000 e 50.000 voci, ciascuna con corpo Unicode e
rich bold versionati. I primi 24 elementi appartengono al mese richiesto;
i Task sono distribuiti fuori mese. Lo storico comune contiene rispettivamente
1.000 e 5.000 HabitLogs, più le due impostazioni privacy/riflessione.
I corpi sono conservati anche per le voci fuori vista.

Per ogni dimensione vengono misurati mese, mese vuoto e Task dell'archivio.
Ogni scenario esclude la prima lettura ed esegue altre 30 ripetizioni.
Il report conserva i campioni e usa nearest rank per p50/p95. L'apertura della
connessione con getMeta viene misurata separatamente prima delle letture.
Non sono prove di cache filesystem fredda o riavvii completi del browser.

## Risultati della prima esecuzione

Linux x64, Node 24.20.0, Chromium headless 156.0.8078.4, Intel Core i7-1370P,
20 CPU logiche riportate, circa 15,3 GiB RAM. Nessun isolamento del carico
hardware; la suite funzionale si è conclusa durante l'avvio del benchmark.
Tempi arrotondati al millisecondo, senza confronto A/B.

| Voci | Record comuni | Vista | p50 ms | p95 ms | Corpi letti per fotografia |
|---:|---:|---|---:|---:|---:|
| 10.000 | 1.002 | Mese | 202 | 227 | 24 |
| 10.000 | 1.002 | Mese vuoto | 164 | 187 | 0 |
| 10.000 | 1.002 | Task | 180 | 217 | 199 |
| 50.000 | 5.002 | Mese | 996 | 1.105 | 24 |
| 50.000 | 5.002 | Mese vuoto | 1.198 | 1.330 | 0 |
| 50.000 | 5.002 | Task | 1.238 | 1.313 | 999 |

Preparazione: circa 3,6 / 18,2 secondi; payload di seed serializzati circa
8,4 / 42,7 MB decimali. Questi byte non sono lo spazio fisico IndexedDB.
Heap renderer dopo GC prima/dopo le letture: circa 3,24/3,30 MB e 3,31/3,31 MB;
non misurano il picco durante getAll o la memoria totale del browser.

## Controlli di correttezza

Ogni lettura verificata contiene tutti i metadati e lo storico comune attesi,
e i soli corpi necessari, con Unicode e formattazione intatti. L'instrumentazione
verifica una sola transazione readonly sui sei store del bootstrap, quattro
enumerazioni scoped (metadati, dati comuni, bozze e outbox), nessuna enumerazione
dei corpi e il numero esatto di richieste puntuali ai corpi. Eventuali errori,
timeout, snapshot incompleti o corpi errati fanno fallire il comando.

Il flag p95 entro 500 ms è soltanto diagnostico: non fa fallire una prova
funzionalmente corretta per la variabilità dell'ambiente. A 50.000 voci
l'obiettivo è già superato nella sola lettura repository, anche senza corpi.
Il percorso continua a enumerare tutti i metadati e i record comuni per scope:
questo risultato motiva un successivo progetto di letture indicizzate/proiezioni
per vista, preservando fotografia atomica, checkpoint e pianificazione globale.
Non dimostra il costo esclusivo di una singola enumerazione.

## Verifiche e limiti

Superati build, npm test, test:local-bootstrap, test:release,
test:local-bootstrap-scale, controllo sintassi dello script e git diff --check.
Le suite funzionali riguardano la base applicativa invariata; questo incremento
aggiunge soltanto benchmark, comando npm e documentazione. Staging di sei file
e segnaposto ROOT_FOLDER_ID preservati.

Il cronometro include lettura IndexedDB e costruzione della fotografia nel
repository. Esclude identità, rete, consumer snapshot/feed, applicazione alla
shell, rendering DOM e paint. Non attesta quindi il p95 di apertura della vista
richiesto dalla SPEC-004, neppure a 10.000 voci. Non dimostra capacità di produzione,
quota disponibile o persistenza nell'iframe Apps Script. Non sono stati modificati
il modello dati, la versione IndexedDB o i percorsi applicativi; restano tutti
i gate sperimentali precedenti. Nessun deploy, setupDrive o accesso ai dati reali.
