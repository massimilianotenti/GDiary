# Aggiornamento P29

Pubblicare insieme Code.gs, DriveDocs.gs e Index.html e creare una nuova versione del deployment. Conservare il proprio ROOT_FOLDER_ID: nel pacchetto locale è presente il segnaposto. Manifest e autorizzazioni invariati. Non ripetere setupDrive o la migrazione dell’intero archivio per installare P29.

TaskDocQueue viene creata automaticamente al primo task senza descrizione. Il task è già salvato su Sheets; il badge segnala il documento da preparare. Aprendo il dettaglio la sezione Docs viene preparata subito. Le note e i task con descrizione continuano a salvare il corpo direttamente nel documento. Nessun trigger è attivo per effetto del solo aggiornamento del codice.

## Worker facoltativo

Per preparare le sezioni anche senza aprire i task, nell’editor Apps Script aprire Trigger → Aggiungi trigger: funzione processTaskDocQueue, deployment Head, origine basato sul tempo, timer minuti, ogni 5 minuti. Usare l’account proprietario dell’archivio. Eseguire una prima prova manuale della funzione su dati di prova e controllare il risultato processed/pending/errors. Non installare trigger duplicati. In TaskDocQueue le righe error conservano il messaggio e saranno ritentate; se il lock è occupato il worker restituisce busy e rinvia al giro successivo. Il trigger è facoltativo, la preparazione all’apertura funziona comunque.

## Prova cloud

Confrontare più invii uguali alla P28: task senza descrizione, task con descrizione, 10 note nello stesso mese, modifica solo deadline, modifica testo formattato e stato. Registrare durata totale client e tempi server/lock: una singola prova non distingue avvio del runtime, rete e servizi Google. Verificare apertura di un task in coda, worker manuale/trigger, esportazione prima della preparazione, eliminazione task in coda, retry e salvare le pagine Giorno/Settimana. Verificare formattazione/conflitti Docs e layout su telefono. Cloud e mobile P29 pendenti.

Backup locale: BulletJournal-v3-P28-before-P29.zip. Report: ANALISI-PRESTAZIONI-P29.md. Nessun dato reale Drive/Sheets modificato durante lo sviluppo.
