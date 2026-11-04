# Preparazione pura delle API Goals/Habits

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
Writer canonico verificato prima di iniziare questo incremento.

`syncCatalogEditInput_` normalizza richieste goal, habit e archiveHabit.
`syncPrepareCatalogEdit_` riceve richiesta, record precedente o null, obiettivo
corrente quando necessario e allocazione esplicita `{id, stepIds}` del server.
Non legge tabelle, non acquisisce lock e non genera UUID. Restituisce record
completo, input normalizzato e copia dell'obiettivo da cui dipende l'abitudine.
`syncHabitStepPlan_` individua gli ID riusabili e i posti che richiedono un nuovo
ID; il pool deve contenere esattamente gli ID necessari, senza collisioni.

## Compatibilità delle API

Goals mantiene la normalizzazione esistente di titolo, numeri e progetto.
Description/icon omessi conservano i valori precedenti; stringhe vuote esplicite
li cancellano. Project omesso torna vuoto, come nell'API attuale. Le creazioni
usano l'ID assegnato dal server, non un UUID creato durante il retry.

Habits conserva la programmazione ordinata/deduplicata, frequenza weekly:1–7,
data nel trimestre dell'obiettivo e comportamento dei campi omessi. Steps omesso
riusa le definizioni precedenti con la normalizzazione dell'API; steps vuoto
rimuove le microazioni della definizione corrente senza toccare checklist storiche.

La scelta degli ID replica esattamente il codice esistente: prima titolo uguale
non ancora usato, altrimenti posizione precedente, altrimenti nuovo ID esplicito.
Riordinare, inserire o ripetere titoli può quindi produrre risultati diversi da
un algoritmo basato solo sul titolo; il planner non sostituisce silenziosamente
questa regola con un'altra. Le checklist HabitLogs già registrate restano
fotografie autonome, indipendenti dalle nuove definizioni del catalogo.

ArchiveHabit conserva tutti i campi e cambia soltanto archived a yes, anche se
il goal ha cambiato trimestre o non è più disponibile. Non richiede nuovi ID.
Edit di abitudini archiviate e richieste di edit/archive su abitudini non
esistenti sono rifiutati. Le copie restituite non condividono riferimenti con
i dati forniti dal chiamante.

## Confine con il ponte durevole

Il planner non confronta una base esistente con la versione richiesta: questa
resta nell'input normalizzato per il futuro CAS/mapping delle bozze pre-migrazione.
Non fornisce una ricevuta, non scrive un piano e non rende idempotenti le API
legacy correnti. Identità e dipendenze devono provenire da lettori server coerenti.
L'allocazione deve essere conservata insieme al piano prima di applicarlo;
rigenerare gli UUID dopo una risposta persa creerebbe record diversi.

L'input ammette un requestId validato per il futuro contratto di creazione.
Non è ancora generato o inviato dai form. Le creazioni nuove richiedono una
chiave dell'intento distinta dal solo hash dei campi: due creazioni volontarie
con lo stesso titolo devono rimanere due identità. Il futuro browser deve
conservare intento/snapshot su errore, reload e ACK tardivo prima di attivare
il nuovo percorso; non basta deduplicare le descrizioni uguali.

Il ponte deve inoltre instradare i cataloghi letti da HabitLogs. Il controller
attuale dei log lega fisicamente Habits/Goals e legge il catalogo legacy:
congelare quei fogli senza cambiare questo lettore esporrebbe vecchie definizioni.
La composizione dei lock e il binding condiviso dei ruoli catalogo/log devono
essere verificati insieme; nessuna attivazione parziale reale è consentita.

## Verifiche

`test:catalog-planner`, incluso in npm test, copre campi omessi/vuoti, coercizioni
numeriche, schedule, trimestre/bisestile, record archiviati, allocazioni errate,
ID riusati e copie indipendenti. Confronta gli snapshot con le API reali della
Demo usando UUID assegnati esplicitamente: creazione goal/habit, riordino,
inserimento, titoli ripetuti, steps omesso/vuoto, spostamento del goal e archivio.
Il test fallisce se il backend richiede UUID non pianificati. Un'altra prova
nega db_, locked_ e Utilities.getUuid per escludere I/O/allocazioni nascosti.

Nessuna RPC nuova o instradamento applicativo; saveGoal/saveHabit/deleteHabit
restano legacy. Manifest false, nessun deploy/provisioning/dato reale; online
Apps Script 75. Prossimo incremento: ponte durevole e lettori coerenti dei cataloghi,
poi controller e browser attivo. Il pacchetto 8 resta aperto.

Superati build, npm test, test:catalog-planner, test:canonical-catalogs,
test:release, test:cycle, test:incremental, test:common-periods, test:tracing e
test:habit-log-browser prima di iniziare la composizione dei lock. Demo e
staging sei file rigenerati; nessuna nuova differenza frontend a Index.
Seguito: [composizione delle letture tra controller](VERIFICA-COMPOSIZIONE-LOCK-ROUTING.md).
