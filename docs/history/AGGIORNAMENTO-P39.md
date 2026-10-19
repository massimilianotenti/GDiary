# Aggiornamento P39

Da P38 aggiornare Code.gs, Index.html e Changelog.html e pubblicare una nuova versione. DriveDocs.gs invariato. Conservare ROOT_FOLDER_ID e impostazioni personali. Nessuna modifica manuale a Sheets. Il trigger processTaskDocQueue resta configurato come prima.

L’errore cloud getState -> locked_ è causato dall’attesa del blocco di scrittura. Non è stato identificato il titolare preciso dell’esecuzione cloud. La correzione rimuove il lock dalle sole letture getState/getCommonState, che non modificano dati né schema e non preparano Docs. Cache reinizializzata per ogni richiesta; performance.readWithoutLock=true e lockWaitMs=0 indicano il nuovo percorso.

Salvataggi, lettura dettaglio che può preparare Docs e worker restano protetti; possono ancora attendere un’altra scrittura lunga. P39 risolve l’attesa del lock sulle viste, non ogni possibile timeout di altri servizi o operazioni. Nessun timeout aumentato.

Consistenza eventuale: una lettura concorrente a una scrittura può vedere metadati e tabelle accessorie in momenti diversi. Aggiornare dopo il completamento rilegge lo stato. Nessuno snapshot atomico tra fogli; controlli versione delle scritture conservati.

Test locali: sette viste e getCommonState con acquisizione lock e scritture vietate; salvataggi ancora tentano il lock; regressioni P29/P35/P36 e sintassi superate. Verificare sul cloud aprendo e aggiornando viste durante il trigger. Esecuzioni getState devono terminare senza timeout da locked_. Per eventuali errori di altre funzioni raccogliere nome, orario e durata. Nessun dato reale modificato durante lo sviluppo.
