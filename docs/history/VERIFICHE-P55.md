# Verifiche P55

Eseguite localmente il 14 ottobre 2026, con servizi Sheets/Drive/Docs simulati e Chrome reale senza connessione ai servizi Google. Non è una verifica del deployment o delle prestazioni di rete.

## Backend

- Creazione di nota multilinea e task in un gruppo; stili, deadline, importanza e giorno pianificato conservati.
- Zero aperture/creazioni Docs durante il salvataggio, sia per voci nuove sia per modifiche esistenti e per il precedente modulo Nota completa.
- Ripetizione della richiesta di creazione senza duplicati; riparazione di una coda mancante dopo persistenza del contenuto.
- Riapertura di contenuti pendenti da Sheets; riapertura sincronizzata e modifica del titolo con stesso ID e aggiornamento dell'intestazione Docs.
- Posizione dei blocchi conservata; titolo automatico ricavato dalla prima riga.
- Rifiuto di versioni obsolete, progetti inesistenti e combinazioni di pianificazione non valide; nessuna scrittura per un gruppo che non supera la validazione iniziale.
- Modifiche ai soli metadati: nessun nuovo lavoro Docs, stato/completamento/importanza/pianificazione corretti.
- Modifica esterna del titolo Docs: errore di conflitto, titolo esterno preservato.
- Caricamento oltre 25 voci, cursore, assenza di duplicati e completezza; filtro di progetto.

Script: tests/verify-p55.cjs e tests/verify-p55-edges.cjs. Eseguire con Node.js dalla directory del pacchetto o indicando il percorso dello script; la Demo è risolta relativamente allo script.

## Browser

- Creazione di task con descrizione, calendario, progetto, tag e importanza; nota multilinea con grassetto.
- Salvataggio e passaggio Vista elenco → Scrivi nella pagina con identità delle voci conservate.
- Comprimi/Espandi verificati tramite visibilità effettiva del testo.
- Desktop 1600 × 1100 e mobile 390 × 844: nessuna eccezione JavaScript e nessuna eccedenza orizzontale della pagina. Anteprime nel pacchetto: P55-editor-desktop.png e P55-editor-mobile.png.
- Pagina di progetto e progetto ereditato; recupero della bozza nella stessa scheda dopo reload.
- Validazione di giorno pianificato e periodo contemporanei: proprietà aperte, errore visibile e blocco non salvato; correzione e salvataggio successivo.
- Risposta di salvataggio persa simulata: il ritentativo non duplica il task e conserva una successiva variazione locale di importanza, che viene poi salvata.
- Ctrl+Invio crea una nota distinta, senza spezzare i normali paragrafi.

Script: tests/verify-p55-browser.cjs. Richiede Playwright e Chromium installato. Se si usa Chrome locale impostare CHROME_PATH; se il modulo Playwright non è nel normale percorso Node, impostare PLAYWRIGHT_MODULE. Le immagini del test vengono salvate in tests/screenshots.

## Regressioni

Superati i controlli P54 di persistenza, segmentazione di contenuti lunghi, raggruppamento Docs, errori/ritentativi, conflitti, cancellazione e identificativi di richiesta; P53 descrizioni e dati legacy; P35 abitudini composte e storico; P39 letture senza lock/scritture; P48 riepiloghi scaduti e sintassi frontend.

Code.gs e appsscript.json verificati identici al backup precedente P54. ROOT_FOLDER_ID conserva il segnaposto del pacchetto: l'ID personale va mantenuto durante l'installazione. Nessun nuovo trigger o autorizzazione aggiunto. Il manifesto SHA-256 accompagna i sorgenti distribuiti.

## Restano da verificare sul cloud

Installazione del nuovo file JournalEditor, salvataggi su Sheets reali, replica e titoli in Docs, tempi con più blocchi, concorrenza fra browser e trigger, archivi grandi. I test simulati non dimostrano una riduzione in secondi né transazioni atomiche fra fogli e documenti.
