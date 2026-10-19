# Percorso per il deploy automatico

P60: Vue viene compilato e incorporato in Index.html. `npm run build` prepara soltanto Code.gs, DriveDocs.gs, JournalEditor.gs, Index.html, Changelog.html e appsscript.json in `.build/apps-script`. Non autentica, non carica file e non pubblica. Demo, componenti sorgenti, dipendenze, guide, test e immagini restano fuori dallo staging. Clasp 3.4.1 è incluso nelle dipendenze; gli identificativi personali e il login non sono configurati.

## Prima configurazione

1. Installare le dipendenze con `npm ci`. Node 24 è compatibile con la build verificata. Un repository Git privato è consigliato per lavorare da più PC, ma non è necessario per pubblicare con clasp. Non inserire credenziali clasp o OAuth nel repository; il file .gitignore include queste esclusioni.
2. Recuperare lo **Script ID** dalle impostazioni del progetto Apps Script. L'URL /exec indica il deployment e non permette di ricavare lo Script ID. Non serve comunicare una password nella chat.
3. Abilitare Apps Script API e autenticarsi con `npx clasp login` sul proprio computer. Non serve un'installazione globale: il pacchetto fissa clasp 3.4.1. La login è un'operazione iniziale personale, non viene eseguita dallo script di release.
4. Fare un pull/backup separato del progetto remoto e confrontarlo con i file locali, conservando le modifiche eventualmente fatte dal browser e il ROOT_FOLDER_ID personale. Non fare push alla cieca.
5. Copiare `.clasp.example.json` in `.clasp.json` e impostare lo Script ID corretto, mantenendo rootDir `.build/apps-script`. Copiare `.deploy.example.json` in `.deploy.json` e impostare l'ID del deployment esistente: si trova tra `/s/` e `/exec` nell'URL della web app. Non creare un nuovo deployment per ogni release.
6. Conservare il ROOT_FOLDER_ID personale in DriveDocs.gs oppure passarlo come variabile d'ambiente. In PowerShell: `$env:ROOT_FOLDER_ID='ID_CARTELLA_PERSONALE'`. Il preparatore modifica soltanto lo staging. Il comando deploy rifiuta il segnaposto INCOLLA_ID_CARTELLA. Il manifest mantiene accesso MYSELF e identità USER_DEPLOYING.

## Comandi pronti

```text
npm run build
npm test
npm run test:e2e
npm run deploy:check
npm run deploy
```

Il primo comando compila senza pubblicare. `deploy:check` richiede i due file di configurazione, prepara la build e verifica il backend localmente; non legge credenziali e non contatta Google. `deploy` ripete build e test, incluse le prove browser, quindi esegue push, crea una versione immutabile e aggiorna il deployment configurato. Il suo flusso è stato verificato con una CLI simulata; non è stato eseguito un push reale.

Su Windows i test usano Chrome installato. Se non disponibile, installare il browser con `npx playwright install chromium`, oppure impostare CHROME_PATH. Le prove del comando deploy usano Demo.html e dati simulati.

Il push usa `--force` per caricare anche il manifest del pacchetto senza un secondo dialogo interattivo. Pubblica i sei file preparati: per questo il confronto/backup iniziale del progetto remoto e la conservazione dell'ID cartella sono parte della prima configurazione. Non esegue setupDrive, cambiamenti ai fogli o installazione di trigger. Un errore interrompe i passaggi successivi; se avviene dopo il push, Head può già essere stato aggiornato.

## Flusso da automatizzare

Commit → test backend → test browser locale → preparazione staging → push clasp → creazione versione → aggiornamento del deployment esistente → controllo del deployment autenticato.

Aggiornare lo stesso deployment conserva l'indirizzo della web app. La procedura non esegue setupDrive, migrazioni o installazione di trigger: rimangono operazioni distinte. Usare inizialmente un progetto Apps Script di test con un archivio di test, separato dal progetto quotidiano.

Nella CLI clasp 3.x documentata dal repository, i comandi di riferimento sono:

```text
clasp push
clasp create-version "P60"
clasp create-deployment --deploymentId ID_ESISTENTE --versionNumber NUMERO --description "P60"
```

Eseguire prima `clasp --help` e verificare la sintassi della versione installata. Questi comandi non sono stati eseguiti. Fonti: [guida Google](https://developers.google.com/apps-script/guides/clasp), [repository clasp](https://github.com/google/clasp).

## Pipeline Git

La pipeline dovrà usare una versione clasp fissata e credenziali nei secrets del servizio Git, mai nei file del repository. Gli identificativi di test e produzione devono essere distinti e il deploy va serializzato. L'avvio della release può essere un tag o un comando manuale: automatico significa evitare copia/incolla e passaggi ripetuti, non necessariamente pubblicare ogni commit incompleto.

Il worker attuale usa un trigger su Head. Un push modifica Head prima di aggiornare la versione della web app: questa differenza va considerata per future modifiche backend. Ripristinare una versione web non ripristina dati, coda o codice Head del trigger. Per questo servono backup, test di compatibilità e una procedura di ripristino che distingua questi livelli.

L'autenticazione della web app privata è distinta dalle credenziali di pubblicazione. Il browser di test isolato si è fermato alla pagina di accesso Google sull'URL fornito. Per test end-to-end reali occorre un browser autorizzato e una copia di test; non è stata effettuata alcuna modifica ai dati.
