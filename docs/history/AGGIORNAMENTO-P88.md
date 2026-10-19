# Aggiornamento P88

Da P87 aggiornare solo **Index.html e Changelog.html** e pubblicare una nuova versione del deployment esistente. Backend invariato e nessuna migrazione. Conservare il proprio ROOT_FOLDER_ID.

In Settimana e checkup i menu a tendina Energia percepita e Stato del checkup sono sostituiti da controlli visibili nello stile del diario:

- Energia: scala da 1 a 5, da Molto bassa a Molto buona, con descrizione del valore selezionato. Azzera torna a Non indicata senza forzare un valore.
- Stato: In corso e Completato, con simbolo e selezione evidenziata.

Tab entra nella scelta attuale; frecce e Home/End cambiano selezione. Le scelte segnalano modifiche da salvare e vengono registrate con Salva focus e checkup. Nessun salvataggio automatico aggiunto. I valori esistenti vengono mostrati senza conversioni, conservando tutte le riflessioni.

P87 include una correzione backend al salvataggio dei progetti storici: se non è ancora stata applicata, aggiornare anche JournalEditor.gs. Non sostituire il proprio ROOT_FOLDER_ID.

Prove locali con Chrome e backend simulato; nessun deployment Google eseguito.
