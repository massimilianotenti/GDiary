# Verifiche v2.0.3

Eseguite localmente su Demo.html con backend simulato. Nessun accesso ai dati Google o deployment eseguito.

- Build di produzione completata; preparati i sei file Apps Script.
- npm test: validazioni, salvataggi, conflitti, cache, ricerca, tag, progetti e assemblaggio superati.
- verify-v203-week-tasks.cjs: cinque gruppi e conteggi corrispondenti ai risultati del diario, anteprime limitate a cinque titoli, nessun controllo di modifica nel riepilogo; navigazione verso tutti i filtri e ritorno alla settimana; cambi di categoria/stato/periodo; casi limite su deadline, annotazione, completamento in Europe/Rome e sovrapposizione dei periodi di lavorazione; quattro palette a 320/390/768/1440 px senza overflow.
- verify-p85-week.cjs: campi del checkup, errore di salvataggio e retry, persistenza, allineamento, tracker e navigazione al giorno confermati. Il selettore del gruppo completati è stato aggiornato alla nuova etichetta.
- verify-p82-tasks.cjs: vista unica, archivio oltre 25 task e mesi precedenti, ricerca, privacy, salvataggio su più mesi con errore parziale e retry, stati e scorciatoia facoltativa confermati.
- Screenshot V203-task-settimana.png ispezionato.
- Confezionamento: backend confrontato byte per byte con v2.0.2; integrità ZIP e hash dei file verificati dal programma di packaging.

I limiti sulla lunghezza dei testi non cambiano. Nessuna migrazione dati.
