# P64 — righe uniformi e bozze riconoscibili

Note con titolo e senza titolo ora hanno la stessa intestazione: titolo facoltativo a sinistra, data e ora a destra. La data non si sposta quando si cambia il titolo. L'ora è visibile in entrambe, se disponibile. Nei task la scadenza mantiene il proprio campo separato dall'ora di annotazione.

La seconda riga ha colonne fisse per formattazione, Progetti e tag, compressione/descrizione e menu. Progetti e tag è allineato tra note e task, anche se i nomi dei comandi cambiano. Su mobile i collegamenti restano allineati e le etichette dei progetti possono andare a capo.

## Avviso di modifiche alla sola apertura

La P63 poteva ripristinare nella scheda una bozza già uguale ai valori salvati, mantenendo il flag dirty. P64 confronta i contenuti e i campi effettivi: bozze identiche ignorate, modifiche annullate riportate a stato pulito, bozze realmente diverse conservate e annunciate con un messaggio dedicato. Questo non dimostra che ogni segnalazione precedente fosse falsa: lo screenshot poteva anche contenere una bozza reale di una visita precedente.

I controlli di versione server e di conflitto restano attivi. Una bozza con modifiche reali non viene cancellata automaticamente. Il solo caricamento o la selezione della voce non dovrebbe impedire la navigazione.

## Installazione da P63

Sostituire **Index.html** e **Changelog.html**, salvare e aggiornare il deployment esistente con Nuova versione. Backend, fogli e trigger restano identici a P62/P63. Se si parte da P61 occorre applicare anche il backend P62, conservando ROOT_FOLDER_ID.

## Verifiche e palette

Test locali su allineamento note/task e geometria 320–1440 px, data/ora, bozze equivalenti, modifica annullata, bozza realmente diversa preservata/segnalata e salvataggi. Le prove precedenti di diario, cache e altre viste sono conservate. Nessun deployment reale effettuato dall'agente.

Le palette selezionabili in Impostazioni **non sono ancora implementate**. Rimangono il prossimo sviluppo concordato: Carta calda, Salvia, Blu ardesia e Scuro, con icone e stati di contrasto adeguato.
