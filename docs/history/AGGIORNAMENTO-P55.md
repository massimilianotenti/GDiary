# Aggiornamento P55 — scrittura nella pagina

Da P54 aggiungere un nuovo file script **JournalEditor** in Apps Script e incollare JournalEditor.gs. Sostituire **DriveDocs.gs**, **Index.html** e **Changelog.html**. Code.gs e appsscript.json sono inclusi nel pacchetto completo ma non cambiano rispetto alla P54.

Conservare il proprio ROOT_FOLDER_ID in DriveDocs.gs e le proprietà dell'archivio. Pubblicare una nuova versione della web app e ricaricare l'indirizzo /exec: deve comparire P55. Demo.html e i file tests sono solo strumenti locali e non vanno pubblicati in Apps Script.

Il trigger **processTaskDocQueue** già installato resta valido. Non occorre un secondo trigger. JournalLayout viene creato al primo salvataggio dell'editor; DocContent e TaskDocQueue mantengono il loro ruolo. Non occorre rieseguire setupDrive per aggiornare da P54. Da versioni precedenti seguire prima AGGIORNAMENTO-P53.md e AGGIORNAMENTO-P54.md, incluse le eventuali migrazioni.

## Come si usa

- Diario continuo apre la pagina modificabile del mese. **+ Nota** aggiunge un blocco di testo; **Task** un'attività con titolo, descrizione, check e calendario scadenza.
- Invio continua la stessa nota. Un testo incollato su più righe rimane un solo blocco. Ctrl/Cmd+Invio aggiunge una nota dopo quella corrente; con Shift aggiunge un task.
- Per le note il titolo è facoltativo e, se vuoto, si ricava dalla prima riga per le altre viste. Il diario evita di ripetere quella riga come intestazione. Un titolo esplicito può essere impostato in Progetti e tag.
- Progetti e tag si impostano sul blocco. Nei task **Altre proprietà** contiene importanza, giorno pianificato, inizio/fine lavorazione e stato. La deadline resta indipendente; giorno pianificato e periodo di lavoro sono alternativi.
- **Salva pagina** registra solo i blocchi nuovi o modificati, in richieste fino a 25 blocchi. Il check nell'editor è una modifica della pagina: viene persistito premendo Salva pagina. Le altre viste mantengono il comportamento precedente dei check.
- **Comprimi/Espandi** riduce una nota senza modificare il contenuto. La barra di formattazione compare quando si entra nel testo e resta stabile durante i clic sui comandi.
- In Progetti, **Scrivi nella pagina del progetto** apre le stesse voci, filtrate per progetto e mese. I nuovi blocchi ereditano quel progetto; **Tutto il diario** torna alla cronologia completa.
- **Vista elenco** riporta alla visualizzazione precedente, da cui aprire il dettaglio e Google Docs. Contenuti avanzati non supportati o note non migrate non sono editabili nella pagina continua.

I blocchi già salvati conservano identificativo, data di annotazione e tipo. È possibile modificarne il titolo nell'editor continuo. Non è implementata la conversione di una nota esistente in task, né il trascinamento dei blocchi o una checklist di task dentro una nota.

## Salvataggio e prestazioni

Il salvataggio dell'editor non apre né crea Docs. Raggruppa le righe Entries adiacenti modificate e appende insieme quelle nuove; aggiorna solo i record necessari in TaskPlans e JournalLayout. Conserva testo e stili in DocContent e accoda la replica nei Docs. Il worker raggruppa i contenuti per documento e aggiorna anche il titolo della sezione, verificando eventuali modifiche esterne.

Una modifica ai soli metadati non aggiunge un lavoro Docs. L'inserimento dal precedente modulo **Nota completa** passa ora dalla stessa coda: era rimasto un percorso sincrono nella P54.

L'apertura dell'editor carica fino a 25 voci per richiesta, con un limite aggiuntivo alla dimensione della risposta e il comando Carica altre voci del mese. I Docs già pronti vengono letti una volta per documento nel gruppo caricato; le voci pendenti si leggono da Sheets. L'apertura può quindi richiedere chiamate Docs, anche se il salvataggio non le richiede. I tempi reali non sono ancora misurati nell'account.

I nuovi blocchi hanno un identificativo di richiesta stabile: una ripetizione dopo una risposta persa non crea duplicati. Se il contenuto locale è cambiato nel frattempo, resta una bozza da salvare. La validazione del gruppo precede le scritture; un conflitto di versione viene segnalato. Le operazioni tra più fogli non sono una transazione atomica.

## Bozze e compatibilità

Una bozza viene conservata in sessionStorage della stessa scheda, separata per mese e progetto. Dopo una ricarica riaprire il mese/progetto per recuperarla. Chiudere la scheda o cambiare dispositivo non equivale a salvare: sessionStorage non è un archivio cloud o una modalità offline completa. Abbandonare esplicitamente le modifiche elimina la relativa bozza. In caso di conflitto il testo rimane nella pagina e nella bozza disponibile.

Docs viene aggiornato dopo il worker. Il pannello **Sincronizzazione Docs** mostra attese ed errori. Le protezioni per modifiche dirette in Docs restano attive; il lock Apps Script non blocca le modifiche esterne in Google Docs.

## Prova sul deployment

1. Creare una nota multilinea, aggiungere grassetto, poi un task con descrizione e deadline. Salvare e riaprire: nessun duplicato e proprietà conservate.
2. Modificare il titolo di una voce esistente. Dopo il trigger verificare titolo e contenuto nel Doc.
3. Provare Comprimi/Espandi, Vista elenco e la pagina di un progetto.
4. Preparare una bozza, ricaricare la stessa scheda e riaprire il progetto: testo recuperato.
5. Impostare contemporaneamente giorno pianificato e inizio lavorazione: le proprietà si aprono con l'errore vicino ai campi.
6. Controllare Sincronizzazione Docs e misurare il tempo di Salva pagina con 1 e più blocchi.

Verifiche locali e limiti sono descritti in VERIFICHE-P55.md. La direzione successiva è in DIREZIONE-PRODOTTO.md. Nessun dato reale Drive/Sheets modificato e nessun deployment eseguito durante lo sviluppo.
