# Ipotesi future — non implementate

## Piano dettagliato di evoluzione

La [SPEC-004](specs/004-usabilita-locale-e-sincronizzazione.md), proposta il
27 ottobre 2026, organizza le modifiche in tre traguardi: letture rapide,
ricerca e aggiornamenti incrementali, poi salvataggi locali durevoli.
Include dipendenze, contratti API, gestione dei conflitti, test di crescita
e rollback. L'avvio sviluppo è stato successivamente autorizzato: tracing
lock, fixture di crescita e prova IndexedDB sintetica sono implementati
localmente. Segue il raggruppamento limitato delle letture Entries, con
[verifica dedicata](VERIFICA-LETTURE-ENTRIES-BATCH.md).
Il seguito separa anche elenco Task e descrizioni, caricate all'apertura,
per ricerca o prima del salvataggio; [verifica](VERIFICA-TASK-CONTENUTI-DIFFERITI.md).
Le continuazioni riusano ora una fotografia temporanea ordinata con revisione
e fallback; [verifica indice Task](VERIFICA-INDICE-TASK.md).
Il diario limita ora anche i dati comuni al periodo; [verifica](VERIFICA-DATI-COMUNI-PERIODO.md). Finestre estese anche a Settimana e Abitudini, con [verifica del seguito](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).
Seguito: [cataloghi senza storico e delta delle mutazioni comuni](VERIFICA-CATALOGHI-DELTA.md), implementati localmente. Seguito implementato: [lotto multigiornata delle riflessioni](VERIFICA-RIFLESSIONI-LOTTO.md), con esiti per record e bozze conservate.
Implementati anche [delta per allegati, aggiornamento legacy e conversione progetto/tag](VERIFICA-DELTA-LEGACY.md); seguito con [cancellazione incrementale](VERIFICA-CANCELLAZIONE-DELTA.md) implementato, contesa Docs ancora da trattare.
La cache applicativa, il feed e l'outbox restano futuri. Dettagli
in [VERIFICA-AVVIO-SPEC-004](VERIFICA-AVVIO-SPEC-004.md). Nessun deployment
o migrazione dei dati reali autorizzati da questo piano.

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
