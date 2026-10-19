# Salvataggio nota completa — P6

Aggiornare DriveDocs.gs e Index.html, conservare ROOT_FOLDER_ID e pubblicare una nuova versione del deployment esistente. Nessun setup necessario. I due file devono essere aggiornati insieme: il frontend gestisce la nuova risposta parziale.

addCompleteNote restituisce solo la voce creata, il suo estratto e il riferimento Doc; non rilegge più la vista e le tabelle comuni dopo il salvataggio. Il frontend inserisce la voce solo se pertinente alla vista aperta, mantiene le voci esistenti e invalida le altre cache. Le date diverse dal periodo corrente restano salvate e si trovano navigando al mese/giorno appropriato.

Conferma solo dopo scrittura e flush. Diagnostica P6: backend totale include attesa lock e finalizzazione; Sheets misura la ricerca/creazione della voce; sezione Docs e riferimenti include le operazioni di gestione documento, scrittura, bookmark e indici/estratti. Non è un tempo puro della sola API Docs. Finalizzazione include anche operazioni residue/retry. Il tempo client comprende inoltre la comunicazione con Apps Script.

Questa ottimizzazione riguarda la creazione Nota completa. Il salvataggio del dettaglio e gli altri comandi non sono ancora convertiti alle risposte parziali. Test: creazione senza chiamare state_, retry senza duplicati, persistenza testo, inserimento UI e bozze, estratti ed eliminazione.
