# Aggiornamento P30

Da P29 pubblicare Code.gs e Index.html e creare un file HTML chiamato Changelog nell’editor Apps Script, copiando il contenuto di Changelog.html. Pubblicare una nuova versione del deployment.

DriveDocs.gs è invariato rispetto a P29. Da versioni precedenti aggiornare anche DriveDocs.gs per includere le ottimizzazioni P29. Conservare il ROOT_FOLDER_ID e le impostazioni personali del progetto attivo.

Le note di rilascio vengono richieste con getAppChangelog soltanto alla prima apertura, poi restano nella memoria della pagina. Richieste contemporanee condividono la stessa chiamata; un errore permette di riprovare. Nessuna lettura Sheets, Docs o Drive e nessun lock per questo endpoint. Nessun trigger o nuova autorizzazione richiesti da P30. Il worker facoltativo P29 resta indipendente.

Verifiche locali: sintassi frontend e demo, richiesta condivisa, cache, recupero dopo errore, endpoint isolato dai servizi dati; regressioni P27 e P29 superate. Index ridotto da 160094 a 138033 byte UTF-8 (circa 14%); non è una misura del tempo di caricamento sul cloud.

Verifiche cloud pendenti: apertura Novità e versioni, contenuto e riapertura; caricamento iniziale e salvataggi P29 da misurare sul deployment. Il cambiamento non risolve da solo la latenza dei salvataggi. Nessun dato reale modificato durante lo sviluppo.

Per aggiornare le note di rilascio future mantenere coerenti CHANGELOG.md e Changelog.html. Per la demo locale servire la cartella via HTTP, perché la risorsa viene caricata con fetch.
