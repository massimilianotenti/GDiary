# Aggiornamento P86

Da P85 aggiornare solo **Index.html e Changelog.html** e pubblicare una nuova versione del deployment esistente. Code.gs, DriveDocs.gs, JournalEditor.gs e appsscript.json invariati; nessuna migrazione o nuovo permesso. Conservare il proprio ROOT_FOLDER_ID.

Nei task del diario continuo e della vista filtrata Task aperti:

- Scadenza è il campo a destra, con etichetta sempre visibile. Continua a essere modificabile direttamente.
- Pianificato mostra il giorno scelto per lavorarci.
- Lavorazione mostra inizio e fine del periodo; senza fine mostra fino al completamento, coerentemente con la pianificazione esistente.

Pianificazione e scadenza sono indipendenti e possono essere entrambe presenti. La prima resta modificabile da Proprietà → Quando lavorarci; il riepilogo sotto i tag si aggiorna subito senza ricreare l’editor o spostare il cursore. Rimuovere le date nasconde il riepilogo vuoto. Intervalli tra anni diversi indicano entrambi gli anni.

Dati, validazione e salvataggi rimangono quelli esistenti. La modifica rende visibili le informazioni già conservate; non modifica le regole che determinano in quale giornata compare il task. Prove e screenshot locali con dati dimostrativi; nessun deployment Google eseguito.
