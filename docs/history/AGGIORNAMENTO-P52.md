# P52 — Diario senza task ripetuti

Il diario continuo mostra una sola occorrenza per ogni task, nella data scelta al momento dell’inserimento (campo date). Il periodo di lavorazione, la scadenza e il giorno pianificato rimangono nelle label. La data di creazione tecnica createdAt non sostituisce la data del diario scelta dall’utente.

Le viste giorno, settimana/checkup e task aperti conservano il comportamento precedente. Non è aggiunto un riepilogo dei task in lavorazione.

Sostituire Code.gs, Index.html e Changelog.html e aggiornare il deployment esistente a una nuova versione. DriveDocs.gs è invariato.

Questo pacchetto include P51: se si arriva direttamente da P50 eseguire anche setup per aggiungere le colonne description di Goals e Habits (vedere AGGIORNAMENTO-P51.md). Da P51 non è necessario eseguire setup per questa correzione.

Verifica locale: node work/test-p52.cjs — task con periodo, periodo senza fine, completati, pianificazione/scadenza in altro mese, filtro mensile del backend, regola giornaliera invariata e sintassi. Regressione P51 passata. Verifica cloud pendente.

Dopo il deploy: il task 12–31 ottobre deve apparire solo il 12 ottobre nel diario; nella vista del giorno deve rimanere disponibile nei giorni del periodo. La lavorazione in un altro mese non sposta la nota dal mese di inserimento.

Base di questa postazione P50 + P51. Integrare eventuali sviluppi più recenti dell’altro PC prima di sostituire i file.
