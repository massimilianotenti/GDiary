# Configurazione e pubblicazione

Lo sviluppo e la demo non richiedono accesso a Google. Il manifest attuale usa MYSELF e USER_DEPLOYING: archivio personale, non prodotto multiutente pubblico già pronto.

## Pubblicazione manuale

1. Accedere al progetto Apps Script esistente e conservarne una copia prima di sostituire file.
2. Identificare la cartella privata Drive corretta. Passare ROOT_FOLDER_ID alla build: in PowerShell `$env:ROOT_FOLDER_ID='ID_CARTELLA_PERSONALE'`. Questa variabile modifica solo lo staging, non il sorgente condiviso.
3. Eseguire `npm run build` e i controlli pertinenti.
4. Copiare i file da `.build/apps-script`: Code.gs, DriveDocs.gs, JournalEditor.gs, Index.html, Changelog.html, appsscript.json. La lista è completa; per aggiornamenti solo frontend possono bastare Index e Changelog.
5. Aggiornare la versione del deployment esistente, conservandone l'URL. Verificare poi la web app con il proprio account.

Non eseguire setupDrive per un normale aggiornamento di un archivio già configurato. Per una nuova installazione, leggere prima il codice di setupDrive e la configurazione storica in history/README-ARCHIVIO-v3.md: crea risorse e non è un comando di compilazione.

## Clasp facoltativo

Copiare .clasp.example.json in .clasp.json e .deploy.example.json in .deploy.json. Impostare Script ID e deployment ID reali; mantenere rootDir `.build/apps-script`. Autenticarsi personalmente tramite `npx clasp login` e verificare l'abilitazione dell'Apps Script API. Nessun token o file di login va nel repository.

`npm run deploy:check` valida configurazione, build e controlli locali senza pubblicare. Richiede comunque i due file configurati e ROOT_FOLDER_ID valido.

`npm run deploy` ESEGUE il push, crea una versione e aggiorna il deployment configurato. Il push usa --force; fare prima backup/confronto delle modifiche remote. I controlli del deploy non sostituiscono tutte le suite recenti: eseguire separatamente test:release. Non è stato eseguito un deploy reale per preparare questa cartella.
