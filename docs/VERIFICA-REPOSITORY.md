# Verifica repository — 17 ottobre 2026

## Pubblicazione fase 0 SPEC-002 — 22 ottobre 2026

Su richiesta dell'utente eseguito `npm run deploy`: build e tutti i controlli
preliminari superati, sei file caricati e deployment esistente aggiornato dalla
versione Apps Script 63 alla 64 con lo stesso URL. Nessun setup o benchmark
sui dati reali eseguito. Il nuovo export con measurementVersion 2 è pronto
per la raccolta della baseline da parte dell'utente.

## Tracing di dettaglio SPEC-002, fase 0 — 22 ottobre 2026

Build, `npm test`, `npm run test:tracing`, `npm run test:release` e
`node tests/verify-p82-tasks.cjs` superati localmente. Test browser eseguiti
fuori dalla sandbox che ne impedisce l'avvio, con dati simulati e richieste
HTTPS della pagina bloccate. Demo/Index rigenerati; sei file nello staging.

Verificati tempi esclusivi con orologio deterministico, conteggio UTF-8,
cache cold/warm/pending, dettagli DocContent, servizio cache non disponibile,
valori malformati, oltre-soglia e revisioni cambiate/mancanti. Benchmark
get/getAll con cinque ripetizioni e nessuna scrittura in cache. Test browser
verifica nuove metriche filtrate, unico evento RPC dopo vista in cache,
correlazione navigazione/pagine, export e cancellazione/disattivazione.
Restano superati task, privacy, bozze e salvataggi multi-mese con retry.

Nessun deploy né benchmark su Google eseguito per questa estensione. La fase 0
resta da pubblicare su richiesta e da usare per una nuova baseline reale;
nessuna ottimizzazione dei percorsi di lettura/scrittura è stata introdotta.

## Pubblicazione autorizzata — 22 ottobre 2026

Dopo l'abilitazione dell'Apps Script API da parte dell'utente, `npm run deploy`
ha superato tutti i controlli, caricato i sei file e aggiornato il deployment
esistente dalla versione Apps Script 62 alla 63, mantenendo lo stesso URL.
La versione applicativa resta v2.0.3, con diagnostica SPEC-001 e correzione
dell'allineamento dei comandi. Nessun setup o migrazione dei dati eseguiti.
Resta da verificare la web app autenticata e raccogliere la baseline reale.

## Correzioni dei controlli di deploy — 22 ottobre 2026

Il disallineamento P64 era riproducibile su Chrome e Chromium anche nella
base precedente al tracing. La colonna del comando Espandi/Comprimi e
Mostra/Nascondi aveva larghezza `max-content`: le etichette diverse spostavano
Progetti e tag di circa 4,5 px. Fissata la colonna a 76 px su desktop e mobile,
senza cambiare la soglia del test. P64, P77, P65, `npm test` e `test:release`
superati; Demo.html e Index.html rigenerati. P65 ora usa CHROME_PATH, se
presente, oppure Chromium Playwright anziché un percorso Windows fisso.

Superata anche l'intera sequenza di controlli prevista da `npm run deploy`.
Il successivo `clasp push --force` è stato rifiutato da Google perché l'Apps
Script API non è abilitata nelle impostazioni dell'account. Nessun caricamento
riuscito, versione o aggiornamento del deployment eseguito in questo tentativo.

## SPEC-001 — 22 ottobre 2026

Build e `npm test` superati con la diagnostica completata localmente.
`npm run test:tracing` verifica letture cold/warm, correlazione, batch e coda,
errori e ripristino del contesto, elenco delle API ammesse, attivazione locale,
rendering, export JSON filtrato e cancellazione/disattivazione durante richieste
in volo. Verificato anche un gruppo di batch con successo e fallimento.
`npm run test:release` superato con Chromium Playwright; `verify-p82-tasks.cjs`
superato per task, privacy, ricerca e salvataggi multi-mese parziali con retry.
I test browser sono eseguiti fuori dalla sandbox che ne impedisce l'avvio.
Index.html e Demo.html rigenerati, bootstrap UTF-8 e staging di sei file
verificati dalla suite. Nessun deploy o accesso ai dati reali. Il tracing dei
tempi reali Apps Script resta da collaudare dopo un aggiornamento autorizzato.

## Aggiornamento dipendenze — 22 ottobre 2026

Rigenerato package-lock.json dal registro npm mantenendo le cinque versioni
dirette dichiarate in package.json. Il vecchio albero transitivo richiedeva
content-disposition@2.0.2, non disponibile sul registro; il nuovo risolve 2.0.1
secondo i vincoli pubblicati delle dipendenze. `npm ci --no-audit --no-fund`
completato (329 pacchetti), build e `npm test` superati. Index.html e Demo.html
rigenerati. `CHROME_PATH=/usr/bin/google-chrome npm run test:release` superato
fuori dalla sandbox, che impedisce l'avvio del browser. Confermati
esattamente sei file nello staging. Questi controlli includono
le modifiche al tracing in lavorazione, senza attestare il completamento della
SPEC-001. Nessun accesso a Google o deploy.

## Verifiche della consegna iniziale

- Build completata nella nuova cartella, con sei file di staging.
- npm test superato: backend simulato, conflitti, cache, ricerca, tag, progetti e pipeline.
- npm run test:release superato: preferenze, frecce e filtri task settimanali.
- verify-p85-week.cjs superato: checkup, salvataggio/riprova, tracker, layout e navigazione.
- Test browser con Chrome locale tramite CHROME_PATH. Eliminato il percorso fisso dagli script che lo imponevano; senza variabile usano Chromium Playwright.
- Backend .gs e manifest identici alla base v2.0.3. Nessuna modifica a dati o deployment Google.
- Collegamenti della documentazione corrente, corrispondenza engines/lockfile e segnaposto ROOT_FOLDER_ID verificati.
- Scansione: nessuna chiave privata, chiave API Google, token GitHub/Google o URL di documenti/deployment Google personali individuati. Restano segnaposto e dati simulati.
- Nessuna cartella .git, configurazione personale clasp/deploy o credenziale inclusa.

npm ci --offline non è stato completato perché mancavano pacchetti nella cache. Build e test sono stati eseguiti usando una copia temporanea delle dipendenze già installate del progetto originale, rimossa prima della consegna. Su un nuovo PC usare npm ci con accesso al registro npm e installare Chromium come da README.

La suite e2e storica completa non è stata rieseguita integralmente. Le verifiche locali non equivalgono a un collaudo autenticato su Google.
