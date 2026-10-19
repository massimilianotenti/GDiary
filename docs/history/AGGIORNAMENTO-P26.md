# Aggiornamento P26 — Tag e progetti separati

## Pubblicazione
Aggiornare insieme Code.gs, DriveDocs.gs e Index.html, poi pubblicare una nuova versione del deployment esistente.
Conservare il proprio ROOT_FOLDER_ID in DriveDocs.gs: nel pacchetto rimane il segnaposto della copia locale. Non modificare DB_ID, ROOT_ID o le impostazioni di riflessione.
Manifest e permessi invariati. Non occorre eseguire setupDrive. La colonna Entries.tags (14) viene aggiunta al primo salvataggio che la usa; setup può aggiungerla, ma non è richiesto. Una colonna 14 occupata da un'intestazione diversa viene rifiutata.
Non usare il vecchio frontend dopo l'aggiornamento: ricaricare le schede browser per usare tutti i file P26.

## Nuove voci
Progetti: scegliere gli elementi nel selettore. Tag: scrivere etichette nel campo dedicato, separate da virgola; nei bullet è supportato anche #nome.
Esempio: progetto Miniconf e tag lavoro, contabilità sono informazioni diverse. Una nota può avere più progetti e più tag, o soltanto tag e ambito personale.
I tag vengono normalizzati in minuscolo; gli spazi diventano trattini. Nel dettaglio, Modifica tag e Modifica progetti collegati salvano classificazioni distinte.
Pagina Tag e badge #tag recuperano le voci di tutto l'archivio. I nomi progetti mantengono lo slug stabile. @progetto non è implementato.

## Collegamenti precedenti
L'aggiornamento non decide quali nomi erano tag e quali veri progetti. Fino alla conversione, lavoro o finanza già salvati come progetti continueranno ad apparire fra i progetti.
Per riclassificare: aprire Progetti, scegliere il nome, premere Converti questo collegamento in tag… e leggere l'anteprima prima di confermare.
La conversione coinvolge tutte le voci associate in tutto l'archivio. Sostituisce quel collegamento con un tag, conserva altri progetti/tag e rimuove la scheda dalla tabella Projects. Non elimina né sposta cartelle, documenti, bookmark o allegati; conservati anche i testi legacy nello Sheet.
Gli obiettivi collegati bloccano la conversione: modificarne esplicitamente il progetto prima di riclassificare. Se altri dispositivi modificano le voci dopo l'anteprima, occorre generare una nuova anteprima.
La scheda progetto rimossa non dispone di un cestino: prima di una riclassificazione ampia conservare una copia del Google Sheet per recuperare le associazioni precedenti.
L'operazione Sheets non è una transazione atomica: in caso di errore dopo una scrittura parziale, riaprire l'anteprima delle associazioni rimaste. Tag duplicati vengono evitati; i Docs non vengono toccati. Per archivi molto grandi restano da verificare i limiti di esecuzione Apps Script.

## Verifica cloud
1. Creare un task con progetto Miniconf e tag lavoro, finanza: i tag non devono comparire nel menu Progetti.
2. Creare una nota completa, riaprire e controllare testo, progetti e tag distinti. Modificare i tag e verificare che corpo/stili/link restino disponibili.
3. Cliccare #lavoro o aprire Tag e scegliere lavoro: devono apparire le voci associate anche in altri mesi.
4. Provare un bullet #lavoro: deve creare un tag. Una bozza recuperata da P25 mantiene i vecchi hashtag come progetti, con avviso.
5. Convertire esplicitamente una categoria precedente: confrontare il numero di voci, altri collegamenti e documento originale prima/dopo. Verificare il blocco per obiettivi collegati.
6. Confermare riflessione dettagliata P23, funzionalità progetti P24 e nuovi tempi di creazione P25; verificare il layout mobile.

Nessun dato reale Drive/Sheets è stato letto o modificato durante lo sviluppo. Test cloud ancora pendenti.
