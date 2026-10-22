# Verifica repository — 17 ottobre 2026

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
