# Istruzioni di progetto

Leggere README.md e docs/HANDOFF.md prima di lavorare. La documentazione attuale in docs prevale sullo storico docs/history per descrivere lo stato implementato.

Usare Demo.html e test locali per le verifiche. Build e test non richiedono Google. Non eseguire deploy, setupDrive o modifiche ai dati reali salvo esplicita richiesta pertinente dell'utente.

Modificare i sorgenti frontend, quindi rigenerare Index.html; preservare il bootstrap UTF-8 e la lista dei sei file Apps Script. Non eliminare Demo.html prima della build. Conservare identità delle voci, bozze, privacy, formattazione e protezione dai conflitti.

Niente credenziali o dati del diario nel repository. ROOT_FOLDER_ID resta un segnaposto nei sorgenti; usare una variabile d'ambiente per lo staging. Non aggiungere licenze o pubblicare un repository remoto di propria iniziativa.

Eseguire build e test pertinenti. Per modifiche al diario/task usare anche test:release; documentare risultati e limiti. I numeri Pxx dei test sono storici, non la versione corrente.
