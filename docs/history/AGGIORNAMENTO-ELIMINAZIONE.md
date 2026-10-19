# Eliminazione delle note

Aggiornare Index.html e DriveDocs.gs, conservando il proprio ROOT_FOLDER_ID, salvare e pubblicare una nuova versione del deployment esistente. Nessun setup necessario.

Ogni voce nelle liste del diario, giorno, progetto e settimana presenta Elimina. La conferma indica cosa viene rimosso. Il comando è accessibile anche se il dettaglio non si apre perché il corpo è stato cancellato in Docs.

Vengono eliminati la voce Entries, l'estratto Previews, la programmazione TaskPlans, i link Files e il riferimento DocRefs. La sezione del documento, inclusi i marcatori e il titolo se corrisponde ancora all'originale, viene rimossa; le altre sezioni restano. Documenti, cartelle e file allegati originali non vengono cancellati. Le esportazioni NotebookLM già create vanno rigenerate per escludere la nota eliminata.

Se entrambi i marcatori sono già assenti, il comando rimuove i riferimenti senza toccare il contenuto residuo del documento. Marcatori parziali, duplicati o sezioni sovrapposte causano un errore: occorre ripristinare la struttura dalla cronologia. Documenti fuori dalla cartella assegnata o nel cestino non vengono modificati. Eliminazione definitiva dall'indice; non è implementato un cestino delle note.

Per le quattro voci della nota di apertura cancellate manualmente dal Doc: premere Elimina su ciascuna voce nella vista diario e confermare. Non è necessario aprire il dettaglio o ripristinare il testo se entrambi i marcatori sono assenti.

Test: eliminazione preservando un'altra nota nello stesso Doc; documento svuotato; versione obsoleta; retry idempotente; eliminazione UI e assenza nella vista giorno.
