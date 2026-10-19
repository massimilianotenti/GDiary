# Verifica repository — 17 ottobre 2026

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
