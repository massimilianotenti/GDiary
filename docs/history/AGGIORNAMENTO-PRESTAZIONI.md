# Aggiornamento delle prestazioni

Sostituire nell'editor Apps Script Code.gs, DriveDocs.gs e Index.html con quelli del pacchetto aggiornato. Conservare il proprio ROOT_FOLDER_ID in DriveDocs.gs. Salvare e pubblicare una nuova versione del deployment esistente; riaprire lo stesso /exec. Non serve setup e nessun dato viene migrato.

Modifiche:
- Cache in memoria delle ultime 16 viste, valida finché la pagina rimane aperta. Il ritorno a una vista già visitata mostra subito i dati e avvia un aggiornamento in background.
- Risposte di una navigazione precedente scartate. Aggiornamento rinviato se si sta modificando una nota o una riflessione.
- I dati comuni vengono riutilizzati per 60 secondi, senza rileggere tutte le tabelle a ogni cambio vista. Aggiorna forza la rilettura completa. Dopo un salvataggio la cache delle viste viene invalidata.
- Il diario appare prima delle anteprime: la lettura dei primi 12 testi viene avviata separatamente dopo 800 ms. L'apertura di una nota legge sempre il documento originale.
- La navigazione non recupera più i riferimenti dei Docs per ogni voce. Riferimenti e link vengono recuperati quando servono nel dettaglio.
- Letture delle righe contigue raggruppate per file/riferimenti; evitata la prima lettura mensile inutile prima delle viste mirate.

Misurazioni:
Espandere Tempi di caricamento sotto l'intestazione. Sono disponibili gli ultimi 20 tempi di chiamata, l'indicazione di vista visualizzata da cache e, per il caricamento dei dati, i tempi backend di voci/file/dati comuni. Il tempo client comprende anche attesa e comunicazione; il tempo server è misurato dentro state_, quindi non comprende l'avvio dell'esecuzione né l'attesa del lock. Le misure non contengono il testo delle note.

Prova sul cloud:
1. Aprire il /exec e osservare getState iniziale.
2. Aprire Task aperti, Settimana, Obiettivi e Diario.
3. Tornare a due viste già aperte: il contenuto deve apparire subito con aggiornamento in background.
4. Creare una nota di prova e riaprirla; verificare che la cache non mostri il dato precedente dopo il salvataggio.
5. Confrontare getState client/server e Anteprime Docs. Condividere questi tempi per individuare il costo residuo.

Limiti: la prima apertura e una vista non visitata richiedono ancora il server. Il contenuto da cache può essere momentaneamente precedente a modifiche fatte su altri dispositivi. Le tabelle accessorie restano interamente caricate quando aggiornate. I salvataggi restituiscono ancora la vista corrente anziché un delta: questo passaggio richiede un aggiornamento separato. Nessun tempo cloud viene garantito dai test locali.

Secondo intervento: le viste caricate da meno di 60 secondi si riaprono senza chiamate getState. Le anteprime vengono riusate per 60 secondi, purché updatedAt corrisponda; Aggiorna forza entrambe le letture. Il database viene aperto una sola volta per operazione. Fino a 500 voci, le colonne dei metadati vengono lette in due blocchi e riutilizzate nell'esecuzione, escludendo la colonna body; oltre questa soglia si usa TextFinder. getState non esegue più flush di Sheets. Pubblicazione: sostituire nuovamente Code.gs, DriveDocs.gs e Index.html mantenendo ROOT_FOLDER_ID e creare una nuova versione del deployment. Nessun setup necessario.
