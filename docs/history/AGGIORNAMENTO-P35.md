# Aggiornamento P35

Da P34 aggiornare Code.gs, Index.html e Changelog.html. DriveDocs.gs invariato. Conservare ROOT_FOLDER_ID e impostazioni personali; pubblicare una nuova versione. Il trigger processTaskDocQueue già configurato resta utilizzabile, nessun trigger aggiuntivo.

Creazione: aprire Aggiungi un’azione a un obiettivo, indicare il nome della pratica e le microazioni (una per riga). Lasciare vuoto per una singola abitudine. Nel giorno selezionato spuntare ogni microazione: solo l’ultima completa la pratica. Una registrazione al giorno; frequenza fissa o libera preservata.

Modifica: nella lista Le azioni che mi avvicinano aprire Modifica abitudine. Si possono cambiare nome, passi, data iniziale e giorni/frequenza. Obiettivo associato e ID restano gli stessi. Una registrazione già iniziata conserva lo snapshot dei passi di quel giorno; i cambiamenti valgono per le nuove registrazioni.

Elimina abitudine: conferma richiesta. Viene archiviata (sparisce dal tracker e dalle attività previste); le registrazioni restano in Sheets. Ripristino da interfaccia non implementato.

Schema automatico: Habits G steps (JSON), H archived; HabitLogs F checklist (JSON con steps e checked). Le colonne devono essere libere oppure avere queste intestazioni. Nessuna modifica manuale richiesta per lo schema precedente. Le registrazioni vecchie restano valide; per una nuova pratica composta occorre spuntare tutti i passaggi.

Verifiche locali: checklist parziale/totale, impedimento completamento senza passi, modifica ID stabile, snapshot storico, conflitti, archiviazione, sintassi e regressioni salvataggi P29. Nessun dato reale modificato. Verifiche cloud pendenti: creazione pratica da tre passi, completamento progressivo, deselezione di un passo, modifica e nuova data, eliminazione e conservazione log, frequenza libera, mobile.
