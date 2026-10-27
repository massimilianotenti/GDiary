# Repository locale — fondamenta del pacchetto 7

Implementato localmente il 27 ottobre 2026. Nessun deploy o dato reale.

## Contratto implementato

`frontend/local-repository.js` espone un repository IndexedDB senza apertura
all'importazione. Richiede opt-in e identità verificata con cacheReady:true:
il client identità attuale restituisce sempre false, quindi la copia del diario
reale rimane disabilitata. Nessuna vista applicativa usa ancora il repository.

Schema 1: archiveMeta, entries, contents, commonRecords, drafts e outbox.
Le chiavi includono archivio, principale ed epoca; indici per scope e collezione.
Outbox è soltanto riservato, senza API di invio o scrittura delle operazioni.
Le bozze delle vecchie epoche sono recuperabili solo per lo stesso proprietario.

Un lotto remoto (massimo 500 record/rimozioni e 4 MiB) aggiorna in una sola
transazione metadati, corpi, record comuni, cursore e copertura. Revisione locale
CAS e versioni impediscono aggiornamenti obsoleti; la conferma arriva solo al
completamento della transazione. Il cursore è un checkpoint opaco, non un feed
server implementato. La revisione locale non sostituisce le versioni server.
Un nuovo metadato invalida il corpo con versione diversa; le cancellazioni
rimuovono anche allegati e piani locali collegati, preservando bozze e outbox.
Le bozze hanno revisione CAS indipendente. Svuotare la copia remota non elimina
lavoro locale o altri scope. Errori restituiti con codici fissi, senza contenuti.

Cambio identità durante una transazione causa abort; schemi incompatibili,
versionchange, blocchi, timeout, quota e indisponibilità non cancellano il DB.
Non sono ancora implementate migrazioni fra versioni dello schema.

## Prova diagnostica e verifiche

La diagnostica offre una prova manuale separata con marcatori inventati nel
solo DB gdiary-repository-probe-v1. Verifica atomicità, isolamento, conservazione
bozze e riapertura; la cancellazione riguarda soltanto quel DB sintetico.
Nessuna RPC Google o apertura IndexedDB automatica. Il rapporto contiene solo
esiti e tempi, senza identità o contenuti.

`npm run test:repository` usa Demo.html e Chromium: transazioni abortite dopo
successo di una richiesta, quota simulata, CAS concorrente, separazione di
archivi/utenti/epoche, corpi versionati, cancellazioni, conservazione outbox,
10.000 metadati sintetici, riavvio reale del browser e schema futuro preservato.
Comprende anche la prova dei pulsanti diagnostici e assenza di aperture iniziali.

Superati build, npm test, test:repository e test:release. Index/Demo rigenerati,
bootstrap UTF-8 e sei file di staging preservati. Nessun deploy.

## Limiti e seguito

Pacchetto 7 parziale: mancano adattatori delle risposte server, letture delle
viste dalla copia, stato di copertura e aggiornamento in background. Non è un
miglioramento di latenza già disponibile nell'applicazione reale.
La prova nel vero iframe Google e la matrice browser restano aperte (pacchetto 2).
Consenso/privacy, accesso e revoca della copia devono precedere l'abilitazione.
Completamento di una transazione non garantisce conservazione dopo espulsione
dello storage o guasti del dispositivo. Bozze locali non equivalgono a backup.
Feed, commit recuperabili, bootstrap coerente, ricerca locale e outbox restano
passaggi successivi; nessuna sincronizzazione automatica è stata introdotta.
