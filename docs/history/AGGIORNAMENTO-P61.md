# P61 — stile comune per tutte le viste

Il tema del diario P60.1 viene esteso a Giorno, Settimana e checkup, Obiettivi e abitudini, Task aperti, Progetti, Tag, File collegati, Archivio Drive e Impostazioni. Sidebar, sfondo caldo, superficie chiara, titoli tipografici, colori e pulsanti mantengono lo stesso aspetto quando si cambia pagina.

Barra di ricerca e contenuto condividono una larghezza massima di 900 px. I campi hanno un contorno riconoscibile e focus visibile; i riepiloghi numerici sono compatti e coordinati. Gli scaduti conservano un colore distinto. La settimana e il pannello delle abitudini mantengono le proprie colonne e si adattano agli schermi stretti.

Anche dettaglio task/note, pannello Sincronizzazione Docs, finestre delle novità e cattura rapida ricevono il tema comune. La migrazione è visiva: funzioni, struttura delle viste e salvataggi rimangono quelli esistenti; non è una riscrittura di tutte le pagine in Vue.

## Installazione da P60.1

Sostituire interamente **Index.html** e **Changelog.html** nel progetto Apps Script. Salvare, aggiornare il deployment esistente con **Nuova versione** e ricaricare la web app. Il badge indica **P61**.

Non modificare Code.gs, DriveDocs.gs, JournalEditor.gs, fogli o trigger. Il bootstrap Vue della P60.1 rimane attivo. Non occorre installare clasp per l'aggiornamento manuale.

## Sorgenti e verifiche

Il tema comune è in frontend/app-theme.css; il tema base coordinato è in frontend/pleasant.css. Index e Demo sono compilati con npm run build. Test locali su tutte le viste a desktop, 390 e 320 px, salvataggi giorno/settimana, dettaglio task, finestre di sincronizzazione/novità e percorsi del diario completati. Nessun deployment o dato Google reale è stato modificato dall'agente.
