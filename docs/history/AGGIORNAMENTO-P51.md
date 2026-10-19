# P51 — Titoli e descrizioni di obiettivi e azioni

Base: pacchetto P50 importato in questa postazione. La copia P50 originale è conservata.

## Installazione

1. Nel progetto Apps Script sostituire Code.gs, Index.html e Changelog.html con quelli di questo pacchetto. DriveDocs.gs è invariato: non è necessario sostituirlo.
2. Eseguire setup dall’editor, sullo stesso foglio già configurato. Non cancellare o ricreare il foglio: setup aggiunge solo le intestazioni mancanti. La colonna I di Goals e la colonna J di Habits devono essere libere o già chiamarsi description; se sono occupate da altre intestazioni, la migrazione si ferma senza sovrascriverle.
3. Aggiornare il deployment esistente selezionando una nuova versione, quindi ricaricare /exec.
4. Aprire Modifica obiettivo: mettere il nome breve nel titolo e trasferire la spiegazione nella descrizione. I vecchi titoli non vengono tagliati né divisi automaticamente.
5. Aprire Modifica abitudine per aggiungere titolo e descrizione propri a ogni azione.

La descrizione dell’obiettivo è apribile nella sua scheda; nelle azioni rimane solo il titolo dell’obiettivo collegato. Le descrizioni delle azioni sono visibili nell’elenco e nel pannello giornaliero. Campi descrizione facoltativi, massimo 6000 caratteri, testo semplice con a capo.

## Compatibilità e verifiche

Gli ID, gli obiettivi collegati, le registrazioni e le microazioni restano conservati. Aggiornare il solo risultato non cancella la descrizione. Le vecchie cache senza i nuovi campi vengono rilette. Nessun nuovo permesso richiesto.

Eseguito `node work/test-p51.cjs`: controlli sintattici e regressione P50, migrazioni additive/idempotenti, rifiuto delle colonne occupate, creazione/modifica/svuotamento descrizioni, conservazione descrizione aggiornando il risultato, conservazione ID microazioni e rifiuto di scritture obsolete, resa delle schede giornaliere con la sola descrizione dell’azione.

Non verificato sul deployment reale. Dopo il deploy provare un obiettivo con descrizione e una sua azione con descrizione diversa; verificare persistenza dopo Aggiorna e assenza della descrizione dell’obiettivo nelle azioni.

Se il progetto sull’altro PC è avanzato oltre P50, integrare questi cambiamenti prima di sostituire i file, per preservare gli sviluppi successivi.
