# P63 — titolo diretto e progetti selezionabili

Il titolo della nota è sempre modificabile nella testata, senza aprire Proprietà. Se vuoto, resta facoltativo: l'ora dà un riferimento alla nota e il titolo per le liste continua a derivare dal testo. Un solo campo del titolo e un solo simbolo, anche dopo aggiunta/rimozione e salvataggio.

Il comando **Progetti e tag** vicino alla testata apre il pannello compatto. Ogni progetto si seleziona con un pulsante; il segno di spunta e lo stato attivo indicano la scelta. Si possono selezionare più progetti senza Ctrl, mantenendo il campo tag separato. Pianificazione e stato dei task restano nelle proprietà del task.

## Aggiornamento da P62

Sostituire **Index.html** e **Changelog.html**, salvare e aggiornare il deployment esistente con Nuova versione. Backend, manifest, fogli e trigger sono identici a P62. Se si parte da P61, applicare anche DriveDocs.gs e JournalEditor.gs della P62, conservando ROOT_FOLDER_ID.

## Verifiche

Test locali del diario e altre viste, testo, date, stili, bozze e cache completati. Nuova prova: titolo senza aprire proprietà, scelta di più progetti, tag, salvataggio/rilettura, rimozione di un progetto e stato delle modifiche. Geometria verificata su mobile. Nessuna modifica a dati Google reali o deployment effettuata dall'agente.

## Prossimo sviluppo già concordato: palette in Impostazioni

La scelta dei temi **Carta calda, Salvia, Blu ardesia e Scuro** resta da implementare ed è il prossimo passaggio. Si dovranno centralizzare ruoli di colore per sfondo, testo, bordi, selezione e stati; le icone seguiranno varianti di contrasto adatte al tema. La preferenza dovrà essere persistente, preservando il layout e senza usare il solo colore per indicare stati. P63 non include ancora questa funzione.
