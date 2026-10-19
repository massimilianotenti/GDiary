# Aggiornamento a GDiary v2

Da P88 aggiornare solo **Index.html e Changelog.html**, poi pubblicare una nuova versione del deployment esistente. Inclusi il riquadro del campo attivo di inizio/fine giornata e il changelog consolidato.

La versione mostrata nella sidebar, nel pannello Novità e versioni e nei tempi di caricamento è v2. La versione del pacchetto sorgente è 2.0.0. Il pannello presenta 32 funzionalità disponibili in sei aree, senza ripetere le correzioni delle singole P. Lo storico precedente è in CHANGELOG-ARCHIVIO-P17-P89.md, solo nei sorgenti.

Code.gs, DriveDocs.gs, JournalEditor.gs e appsscript.json sono identici a P88. Nessun cambiamento ai dati, agli identificativi di note/task, alle bozze, alle preferenze o alle cartelle Drive. Conservare il proprio ROOT_FOLDER_ID e le configurazioni di deployment locali.

Se non è ancora stata applicata P87, aggiornare anche JournalEditor.gs per la correzione dei progetti storici. Conservare una copia dei testi non salvati prima di ricaricare la scheda.

Il riquadro giornaliero compare soltanto sul campo attivo, per testo formattato, campi semplici e dettagli personali. Non sposta il testo né modifica la formattazione o i salvataggi.

Pacchetto e demo verificati localmente; nessun deployment Google eseguito.
