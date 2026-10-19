# Aggiornamento P87

Da P86 aggiornare **JournalEditor.gs, Index.html e Changelog.html** e pubblicare una nuova versione del deployment esistente. Code.gs, DriveDocs.gs e appsscript.json invariati. Conservare il proprio ROOT_FOLDER_ID. Nessuna migrazione o nuovo permesso Google.

Corretto un difetto riprodotto localmente che genera Scegli un progetto esistente: il selettore propone anche progetti recuperati dai collegamenti delle vecchie voci, ma saveJournalPage accettava nuovi collegamenti solo se presenti nel foglio Projects. Ora accetta progetti registrati oppure già collegati a voci dell’archivio. Non crea progetti automaticamente e continua a rifiutare valori mai registrati né presenti nelle voci.

Il catalogo delle voci si legge soltanto se necessario, dalla sola colonna projects, una volta per richiesta; il controllo non apre Google Docs. I collegamenti vengono ripuliti dagli spazi e deduplicati. La validazione dell’intero batch continua a precedere ogni scrittura.

Se un progetto sparisce anche dall’archivio mentre una scheda è aperta, l’errore indica il collegamento non disponibile e apre le proprietà della voce da correggere. Rimuovere il collegamento o scegliere un progetto disponibile, poi Salva pagina. Il testo e le altre bozze rimangono conservati. Un errore relativo a una bozza privata nascosta non mostra il titolo.

Prima di ricaricare una scheda contenente testo ancora non salvato, conservarne una copia. Le bozze locali usano il meccanismo di ripristino già esistente; dopo l’aggiornamento riaprire la stessa pagina e ritentare il salvataggio.

La correzione riguarda il salvataggio del diario continuo e delle sue viste filtrate. Non modifica i tempi o la cache di lettura dei documenti. Verifiche locali con backend simulato e Chrome; nessun accesso ai dati dell’utente o deployment Google eseguito.
