# Ipotesi future — non implementate

## Primo intervento sulle prestazioni

La [SPEC-002](specs/002-primo-intervento-prestazioni.md) propone interventi
circoscritti sull'architettura attuale a partire dal primo tracing reale:
fase 0 di tracing dettagliato per decidere tra bulk cache e letture DocContent raggruppate; task
visibili durante la paginazione e correzione dei conteggi diagnostici.
Include un confronto esplorativo degli snapshot documento/mese e mantiene
le risposte di salvataggio incrementali come intervento secondario.
È una proposta da verificare prima dell'evoluzione verso storage locale.

## Dati locali e sincronizzazione

Discussa una futura architettura con IndexedDB: apertura immediata da dati locali, lettura remota in background e, in una seconda fase, scrittura locale con coda di sincronizzazione. L'utente ha chiarito che SQLite non è un requisito: IndexedDB va bene.

Primo eventuale passo: cache locale persistente e aggiornamento in background, mantenendo il salvataggio Google attuale. Secondo passo separato: offline completo e sincronizzazione bidirezionale.

Prima di implementare definire identità utente/archivio, versioni e cursori di modifica, eliminazioni, idempotenza, gestione conflitti tra dispositivi, migrazioni del DB locale, privacy, schema della coda e recupero errori. I dati mai inviati a Google devono essere distinguibili dalle copie sincronizzate. Verificare IndexedDB e richiesta di persistenza nel vero iframe Apps Script, comprese le politiche dei browser.

## PWA o app desktop

Una PWA autonoma richiede hosting e caricamento offline dell'interfaccia; resta soggetta al sistema di storage del browser. Electron con database su file consentirebbe maggiore controllo sulla persistenza desktop. Nessuna delle due rende automaticamente più veloce Sheets o risolve i conflitti.

Sia PWA sia Electron potrebbero mantenere Apps Script come intermediario oppure usare le API Google direttamente. google.script.run appartiene alle pagine HTML Service: per un'interfaccia autonoma occorre riprogettare comunicazione e autenticazione, non soltanto cambiare URL. Gestire anche restrizioni cross-origin e accesso autorizzato.

Nessuna scelta definitiva su hosting, PWA, Electron, nuove API o cambio di backend è stata autorizzata come implementazione.
