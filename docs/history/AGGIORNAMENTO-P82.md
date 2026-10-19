# Aggiornamento P82

Da P81 sostituire **JournalEditor.gs, Index.html e Changelog.html** e pubblicare una nuova versione del deployment esistente. Code.gs, DriveDocs.gs e appsscript.json sono invariati rispetto a P81. Conservare il proprio ROOT_FOLDER_ID in DriveDocs.gs. Non sono necessarie migrazioni dei fogli.

Task aperti è una scorciatoia ai filtri del diario continuo: tutti i task dell’archivio, aperti e in corso, ordinati per importanza e scadenza. Si usano gli stessi editor, proprietà, checkbox e salvataggi del diario. Inizio/fine giornata e abitudini restano nella vista completa.

Filtri per stato, mese/archivio, progetto, tag e testo (titolo e corpo inclusi); ordine per importanza/scadenza o data. La ricerca parte dopo 800 ms dall’ultimo carattere; Invio cerca subito. Le bozze modificate restano visibili anche se non corrispondono più ai filtri, fino al salvataggio.

Impostazioni → Navigazione permette di nascondere la voce Task aperti: la scelta vale per questo browser, non si sincronizza tra dispositivi. Il pulsante Filtri task nel diario rimane disponibile. Tutto il diario rimuove la vista filtrata.

La vista task carica automaticamente tutte le pagine, comprese quelle dei mesi precedenti e dei task completati, per consentire ricerca nel corpo e cambio stato senza risultati parziali. Su archivi grandi il primo caricamento può richiedere più tempo e più letture Docs: il messaggio indica il caricamento. Le prestazioni cloud reali restano da misurare.

I salvataggi di mesi diversi usano batch distinti: se un batch successivo fallisce, quelli già confermati restano salvati e le restanti bozze possono essere ritentate. La vista task conserva la bozza nella propria sessione, distinta dal diario mensile; salvare prima di cambiare vista quando richiesto.

Pacchetto verificato localmente con backend simulato e Chrome. Nessun deployment Google eseguito.
