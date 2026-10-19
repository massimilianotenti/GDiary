# P59 — diario Vue e pubblicazione preparata

Il diario continuo ora usa Vue per composizione della pagina, gruppi giornalieri, componenti delle voci e gestione del loro ciclo di vita. La grafica presenta una colonna di lettura comune, sidebar neutra, intestazione compatta, ricerca apribile e un solo insieme di comandi di inserimento e salvataggio. La nota attiva ha un contorno ambra; task, date e descrizioni mantengono il comportamento precedente.

Il testo non viene ricostruito a ogni carattere. L'aggiunta di un'altra voce mantiene il DOM degli editor già aperti; il focus si sposta sulla nuova voce. L'editor di formattazione e la persistenza sono riutilizzati tramite un adattatore isolato. Le altre viste conservano le loro implementazioni e ricevono nuovamente ricerca e aggiornamento quando si lascia il diario.

## Installazione da P58

Sostituire **Index.html** e **Changelog.html** nel progetto Apps Script e aggiornare la versione del deployment esistente. Index.html contiene già la compilazione Vue: non occorre creare nel progetto Google i file dei componenti né caricare node_modules.

Il backend e il manifest sono identici a P58. Non occorrono cambiamenti ai fogli, setup o nuovi trigger. Da una versione precedente a P58, confrontare anche gli aggiornamenti backend delle release intermedie.

## Build e clasp

Per lo sviluppo usare `npm ci`, quindi `npm run build`. Sei file pronti per Apps Script vengono preparati in `.build/apps-script`.

Clasp è installato e il comando di release è preparato, ma manca la configurazione personale. Leggere DEPLOY-AUTOMATICO.md per Script ID, ID del deployment, login e conservazione dell'ID cartella. Dopo la configurazione: `npm run deploy:check` controlla localmente; `npm run deploy` pubblica e aggiorna la stessa web app.

## Verifiche

Test backend, contenuti su più righe, prevalidazione, salvataggi in coda e idempotenza superati. Prove browser desktop/mobile su note, task, date, formattazione, salvataggio, bozze, navigazione, ricerca e conservazione di DOM/focus superate. Build verificata senza import dinamici di Vue e con sei soli file nello staging. Flusso clasp verificato con CLI simulata, inclusi arresto su errori e mantenimento del deployment esistente.

Nessuna pubblicazione o modifica a dati Google reali è stata eseguita. La prova del deployment privato richiede autenticazione.
