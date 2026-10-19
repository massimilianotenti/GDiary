# Viste ricavate dai dati già disponibili — P4

Aggiornamento sull'app già pubblicata: sostituire SOLO Index.html, salvare e pubblicare una nuova versione del deployment esistente. Nessun setup, nessuna modifica ai dati o all'ID cartella. Sotto l'intestazione compare Tempi di caricamento · versione P4.

Quando il mese del diario è già caricato ed è recente (60 secondi), le giornate di quel mese si ricavano dall'insieme completo delle voci mensili, con i rispettivi link ai file. Anche Obiettivi e abitudini usa direttamente i dati comuni recenti senza una richiesta iniziale dedicata. Le misure indicano Vista dai dati disponibili. Non viene fatta una scansione preventiva dei documenti e non vengono aggiunte richieste di precaricamento.

Task aperti, settimana e progetti non vengono ricavati dal solo mese: potrebbero contenere note o task fuori periodo. Mantengono la prima richiesta al server e la cache successiva. Dopo un minuto o con Aggiorna, il server viene riletto. Dopo salvataggi vengono invalidate le viste, conservando i dati comuni appena restituiti quando completi.

Test locali: giorno dal mese e obiettivi senza richieste, task e giorni esterni con server; ricerca, checkup, scrittura e bozze confermati. Sul cloud provare Diario > Giorno > Obiettivi entro un minuto dalla prima apertura e leggere le nuove righe della diagnostica.
