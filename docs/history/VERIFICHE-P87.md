# Verifiche P87

Prove locali con backend Apps Script simulato e Chrome headless; richieste HTTPS bloccate. Nessun accesso ai dati dell’utente e nessun deployment Google.

- Riproduzione con la funzione originale saveJournalPage estratta dal pacchetto P86: nuovo collegamento a un progetto presente in Entries ma assente in Projects genera esattamente Scegli un progetto esistente. Identico payload accettato dalla P87.
- Progetti recuperati dall’archivio, spazi e duplicati, conservazione dei collegamenti sulla stessa voce, testo integro, nessuna creazione automatica di Projects e nessuna lettura Docs durante il salvataggio.
- Selezione mai registrata né presente nell’archivio: errore con identificativo del blocco e progetto mancante; tutto il batch validato prima di ogni scrittura.
- Browser: selezione del progetto storico e salvataggio; progetto rimosso mentre la scheda è aperta, apertura automatica delle proprietà della voce corretta, errore leggibile, testo e bozza conservati, focus ripristinato, rimozione del collegamento e retry riuscito.
- Errore su bozza privata nascosta: nessun titolo, corpo o nome progetto privato esposto; bozza mantenuta.
- Build e npm test superati; P82 archivio/filtri/salvataggi multi-mese/bozze e P70 privacy superati.
- Code.gs, DriveDocs.gs e appsscript.json invariati rispetto a P86. ZIP privo di credenziali/dipendenze e hash di tutti i file verificati.

La causa dei dati reali non è stata ispezionata direttamente. La correzione copre il difetto riprodotto e rende identificabile un eventuale diverso collegamento non valido, senza scartare le bozze. Tempi di caricamento/cache Docs non modificati.
