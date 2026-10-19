# Aggiornamento GDiary v2.0.1

Da v2 aggiornare solo **Index.html e Changelog.html** e pubblicare una nuova versione del deployment esistente. Backend e dati invariati; conservare il proprio ROOT_FOLDER_ID. Il badge, il pannello delle funzionalità e i tempi di caricamento riportano v2.0.1; il package usa 2.0.1. Il raggruppamento del changelog non elimina la numerazione delle release.

Impostazioni → Diario continuo contiene due preferenze indipendenti:

- Apertura iniziale di inizio e fine giornata: Automatico (comportamento precedente, apre le sezioni con testo nell’intenzione/riflessione), Compressi oppure Estesi.
- Apertura iniziale di abitudini e pratiche: Compresse oppure Estese. Il valore predefinito resta Compresse.

Le preferenze si salvano subito nel browser e non richiedono Salva impostazioni. Non sono sincronizzate tra dispositivi. Si applicano a tutte le giornate quando vengono aperte; le scelte manuali Espandi/Comprimi prevalgono per la pagina corrente, fino al ricaricamento o a un cambio della preferenza.

Abitudini e pratiche mostra Espandi/Comprimi al posto della freccia. Da compressa mantiene il conteggio e il riepilogo delle pratiche completate. Intestazione accessibile da tastiera e disposizione adattiva su mobile.

Aprire o comprimere non modifica contenuti, checkbox o stato delle pratiche. I testi continuano a essere salvati con Salva pagina; le registrazioni delle abitudini mantengono il loro salvataggio attuale. Changelog consolidato ancora a 32 funzionalità.

Se non è stata applicata P87, includere anche JournalEditor.gs per la correzione dei progetti storici. Il progetto sorgente conserva il nome della cartella locale per compatibilità. Nessun deployment Google eseguito.
