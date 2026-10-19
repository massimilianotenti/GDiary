# P62 — letture diario e note senza titolo

I log reali indicavano 15–23 secondi nel server per i contenuti di 25 voci, con quattro Docs aperti. Il rendering locale impiegava pochi millisecondi. P62 interviene sulla lettura backend: i marcatori vengono indicizzati una sola volta per documento, invece di riscorrere tutti i paragrafi per ogni nota.

Le sezioni piccole vengono conservate in una cache temporanea, verificata contro data di modifica del file Drive e versione della voce. Se il documento cambia, la chiave cambia e si rilegge Docs; il testo ancora in coda proviene sempre da DocContent. Non si introduce una nuova fonte autorevole dei dati né si scrive durante la lettura. Cache assente, troppo grande o non disponibile: lettura normale. La prima apertura senza cache può ancora richiedere tempo; la velocità effettiva su Google va misurata dopo il deployment. Il log aggiunge `cache X/Y` accanto ai Docs aperti.

Corretto il doppio pallino passando da nota senza titolo a titolo esplicito nelle Proprietà. Il bordo inferiore della nota selezionata viene chiuso correttamente. Per le note senza titolo è mostrata l'ora di inserimento come riferimento visivo; non sostituisce il testo con un titolo obbligatorio. Non viene inventata un'ora per voci storiche prive di createdAt.

## Installazione da P61

Aggiornare **DriveDocs.gs, JournalEditor.gs, Index.html e Changelog.html**. Questa release include modifiche backend: i soli due file HTML non bastano. In DriveDocs.gs conservare il proprio ROOT_FOLDER_ID. Salvare e aggiornare il deployment esistente con Nuova versione. Non modificare fogli, Code.gs, manifest o trigger e non eseguire setupDrive.

## Verifiche

Test locali: a cache valida zero aperture Docs; modifica diretta invalidata dalla revisione Drive, priorità della coda, bypass esplicito, fallback per guasto cache e marcatori duplicati. Lettura rich text indicizzata identica alla precedente. Test browser su titolo aggiunto/rimosso, ora, singolo simbolo, data visibile, bordo e compressione; regressioni del diario e altre viste completate. Nessun dato reale o deployment Google modificato dall'agente.

## Temi futuri

Discusse palette selezionabili in Impostazioni (Carta calda, Salvia, Blu ardesia, Scuro). Non implementate in P62: dovranno usare ruoli di colore e varianti icone con contrasto adeguato, mantenendo etichette e simboli degli stati.
