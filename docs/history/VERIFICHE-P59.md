# Verifiche P59 — 14 ottobre 2026

## Esito locale

Build Vite completata. Runtime Vue 3.5.44 incorporato nell'HTML, senza import dinamici o dipendenza da un CDN per il framework. JavaScript di Index e Demo controllato sintatticamente; un solo backend simulato in Demo e sei soli file nello staging Apps Script. Clasp 3.4.1 e Playwright 1.64.0 fissati nel lockfile.

`npm test`: superati verify-p58-validation, verify-p55, verify-p55-edges, verify-p59-build e verify-p59-deploy. La prova deploy usa processi clasp simulati: nessuna chiamata Google. Verificati dry run locale, segnaposti rifiutati, arresto dopo errore di push/versione e aggiornamento dell'ID deployment configurato.

`npm run test:e2e`: superati verify-p59-browser e verify-p59-components con Chrome headless. Percorsi: creazione/modifica note e task, titolo/descrizione distinti, testo su più righe, stili, scadenza e pianificazione, status, progetti/tag, coda, idempotenza, bozze ripristinate, errori inline, compressione, salvataggio senza falso avviso di uscita, cancellazione e cache di ritorno.

Verificati inoltre montaggio Vue, conservazione del DOM dell'editor durante l'aggiunta di altre voci, focus, ritorno dei comandi nelle altre viste, ricerca globale e assenza di overflow orizzontale nel diario a 390 px. Screenshot desktop a 1600 px e mobile a 390 px prodotti dalle prove.

## Limiti della verifica

Le prove usano la Demo e il backend simulato locale. Non misurano tempi, autorizzazioni, lock o comportamento del servizio Google reale. Il precedente tentativo di accesso alla web app privata ha raggiunto la pagina di login; P59 non è stata pubblicata. Nessuna modifica all'archivio reale, ai trigger o alla condivisione.

Il contratto del backend e il manifest non cambiano da P58. I componenti Vue preservano l'editor rich text come adattatore DOM; non è una conversione di tutte le viste né un editor di task annidati nelle note.
