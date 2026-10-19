# P10 — Changelog nell’app

Se hai già installato P9, aggiorna soltanto Index.html e pubblica una Nuova versione dal deployment esistente. Non servono setup, permessi o migrazioni.

Se non hai ancora installato P9, aggiorna anche DriveDocs.gs preservando ROOT_FOLDER_ID: così pubblichi editor formattato e changelog insieme. Code.gs resta invariato.

Nell’app clicca Novità e versioni nel menu oppure il badge v3 · P10. Le versioni precedenti sono espandibili. Chiudi oppure premi Escape per tornare alla nota: il contenuto e la bozza restano intatti. L’apertura non legge Drive o Sheets.

Il changelog è incorporato nell’interfaccia al momento del rilascio: non si aggiorna da solo quando si modifica CHANGELOG.md. Per i futuri sviluppi aggiornare CHANGELOG.md, eseguire node work/sync-changelog.cjs e rigenerare Demo.html, prima di creare lo ZIP e pubblicare. Il badge identifica il frontend; non controlla il backend installato.

P11 semplifica l’intestazione su richiesta: pubblicare Index.html aggiornato con badge P11.
